-- Ativar o contrato é "tudo ou nada": trocar os itens do escopo, gravar modo e valor e mudar o status
-- na MESMA transação. Feito pelo app em três chamadas, uma falha no meio deixaria o contrato Ativo sem itens.
-- SECURITY INVOKER: roda com a permissão de quem chamou, então a RLS e os gatilhos de contratos/itens valem.
create function public.ativar_contrato_empreiteiro(p_contrato bigint, p_modo text, p_valor numeric, p_itens jsonb)
returns void
language plpgsql security invoker set search_path = public as $$
declare
  v_obra bigint;
  v_soma numeric;
begin
  select obra_id into v_obra from public.contratos_empreiteiro where id = p_contrato;
  if v_obra is null then
    raise exception 'Contrato não encontrado.';
  end if;
  if p_modo not in ('global', 'escopo') or p_valor is null or p_valor <= 0 then
    raise exception 'Informe o modo e o valor total do contrato.';
  end if;

  delete from public.itens_contrato where contrato_id = p_contrato;
  if p_modo = 'escopo' then
    if p_itens is null or jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
      raise exception 'Adicione ao menos um item ao escopo.';
    end if;
    insert into public.itens_contrato (obra_id, contrato_id, descricao, unidade, quantidade, preco_unitario)
      select v_obra, p_contrato, x ->> 'descricao', x ->> 'unidade', (x ->> 'quantidade')::numeric, (x ->> 'precoUnitario')::numeric
      from jsonb_array_elements(p_itens) x;
    select coalesce(sum(round(quantidade * preco_unitario, 2)), 0) into v_soma
      from public.itens_contrato where contrato_id = p_contrato;
    if v_soma <> p_valor then
      raise exception 'O valor total não bate com a soma dos itens.';
    end if;
  elsif p_itens is not null and jsonb_typeof(p_itens) = 'array' and jsonb_array_length(p_itens) > 0 then
    raise exception 'Contrato global não tem itens.';
  end if;

  update public.contratos_empreiteiro set status = 'ativo', modo = p_modo, valor_total = p_valor where id = p_contrato;
  if not found then
    raise exception 'Sem permissão para ativar este contrato.';
  end if;
end $$;

revoke execute on function public.ativar_contrato_empreiteiro(bigint, text, numeric, jsonb) from public, anon;
grant execute on function public.ativar_contrato_empreiteiro(bigint, text, numeric, jsonb) to authenticated;

-- Mensagem do saldo com formato brasileiro (o to_char com G usa o locale do servidor, que é inglês).
create or replace function private.boletim_empreiteiro_antes() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  c public.contratos_empreiteiro%rowtype;
  v_medido numeric;
  v_linha jsonb;
  v_item public.itens_contrato%rowtype;
  v_q numeric;
  v_acum numeric;
  v_esperado numeric := 0;
begin
  select * into c from public.contratos_empreiteiro where id = new.contrato_id for update;
  if not found or c.obra_id <> new.obra_id then
    raise exception 'O contrato não pertence à obra do boletim.';
  end if;
  if c.status <> 'ativo' then
    raise exception 'Só contrato Aprovado / Ativo recebe medição.';
  end if;
  if new.data > (now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'A data da medição não pode ser futura.';
  end if;
  select coalesce(max(numero), 0) + 1 into new.numero from public.boletins_empreiteiro where contrato_id = c.id;
  select coalesce(sum(valor), 0) into v_medido from public.boletins_empreiteiro where contrato_id = c.id;
  if v_medido + new.valor > c.valor_total then
    raise exception 'Passa de 100%%: o saldo a medir do contrato é R$ %.',
      translate(to_char(c.valor_total - v_medido, 'FM999,999,999,990.00'), ',.', '.,');
  end if;

  if c.modo = 'global' then
    if jsonb_array_length(new.linhas) <> 0 then
      raise exception 'Contrato global não tem linhas por item.';
    end if;
    return new;
  end if;

  if jsonb_array_length(new.linhas) = 0 then
    raise exception 'O boletim do escopo precisa de ao menos um item.';
  end if;
  if (select count(distinct x ->> 'itemId') from jsonb_array_elements(new.linhas) x) <> jsonb_array_length(new.linhas) then
    raise exception 'Cada item aparece uma vez por boletim.';
  end if;
  for v_linha in select * from jsonb_array_elements(new.linhas) loop
    v_q := (v_linha ->> 'quantidade')::numeric;
    select * into v_item from public.itens_contrato where id = (v_linha ->> 'itemId')::bigint and contrato_id = c.id;
    if not found then
      raise exception 'Item que não é deste contrato.';
    end if;
    if v_q is null or v_q <= 0 then
      raise exception 'Quantidade inválida no item "%".', v_item.descricao;
    end if;
    select coalesce(sum((x ->> 'quantidade')::numeric), 0) into v_acum
      from public.boletins_empreiteiro b, jsonb_array_elements(b.linhas) x
      where b.contrato_id = c.id and (x ->> 'itemId')::bigint = v_item.id;
    if v_acum + v_q > v_item.quantidade then
      raise exception 'Passa de 100%%: o saldo do item "%" é % %.', v_item.descricao,
        translate(((v_item.quantidade - v_acum)::float8)::text, '.', ','), v_item.unidade;
    end if;
    v_esperado := v_esperado + round((v_acum + v_q) * v_item.preco_unitario, 2) - round(v_acum * v_item.preco_unitario, 2);
  end loop;
  if abs(v_esperado - new.valor) > 0.015 then
    raise exception 'O valor do boletim não bate com as quantidades.';
  end if;
  return new;
end $$;
