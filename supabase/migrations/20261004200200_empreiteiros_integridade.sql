-- Fecha furos de integridade achados na revisão:
--  1) o escopo (itens) só muda com o contrato em Elaboração/Enviado, e o contrato fica travado enquanto o item muda;
--  2) contrato Ativo/Concluído por escopo sempre tem itens que somam o valor total (global não tem itens), mesmo por escrita direta na API;
--  3) linhas do boletim malformadas viram recusa em português, e o mesmo item não passa duas vezes no mesmo boletim.

create or replace function private.item_contrato_protege() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_id bigint;
  v_obra bigint;
  v_status text;
begin
  -- um UPDATE pode mover o item de contrato: os dois lados precisam estar abertos
  foreach v_id in array (case tg_op
      when 'INSERT' then array[new.contrato_id]
      when 'DELETE' then array[old.contrato_id]
      else array[old.contrato_id, new.contrato_id] end) loop
    select obra_id, status into v_obra, v_status from public.contratos_empreiteiro where id = v_id for update;
    if v_obra is null then
      raise exception 'Contrato não encontrado.';
    end if;
    if tg_op <> 'DELETE' and new.obra_id <> v_obra then
      raise exception 'O item não pertence à obra do contrato.';
    end if;
    if v_status in ('ativo', 'concluido') then
      raise exception 'O escopo só muda enquanto o contrato está em Elaboração ou Enviado.';
    end if;
    if exists (select 1 from public.boletins_empreiteiro where contrato_id = v_id) then
      raise exception 'O escopo não muda depois da primeira medição.';
    end if;
  end loop;
  return coalesce(new, old);
end $$;

create or replace function private.contrato_empreiteiro_protege() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  ordem text[] := array['elaboracao', 'enviado', 'ativo', 'concluido'];
  v_medido numeric;
  v_tem boolean;
  v_n int;
  v_soma numeric;
begin
  if new.obra_id <> old.obra_id then
    raise exception 'O contrato não pode mudar de obra.';
  end if;
  select coalesce(sum(valor), 0), count(*) > 0 into v_medido, v_tem
    from public.boletins_empreiteiro where contrato_id = old.id;
  if new.status is distinct from old.status then
    if abs(array_position(ordem, new.status) - array_position(ordem, old.status)) <> 1 then
      raise exception 'O contrato anda uma coluna por vez.';
    end if;
    if new.status = 'concluido' and v_medido < new.valor_total then
      raise exception 'Só dá para concluir com 100%% medido.';
    end if;
    if old.status = 'ativo' and new.status = 'enviado' and v_tem then
      raise exception 'Este contrato já tem medição lançada e não pode voltar para aprovação.';
    end if;
  end if;
  if v_tem and (new.modo is distinct from old.modo or new.valor_total is distinct from old.valor_total) then
    raise exception 'O valor do contrato não muda depois da primeira medição.';
  end if;
  if new.status in ('ativo', 'concluido') then
    select count(*), coalesce(sum(round(quantidade * preco_unitario, 2)), 0) into v_n, v_soma
      from public.itens_contrato where contrato_id = new.id;
    if new.modo = 'escopo' and (v_n = 0 or v_soma <> new.valor_total) then
      raise exception 'O valor total do contrato por escopo precisa bater com a soma dos itens.';
    elsif new.modo = 'global' and v_n > 0 then
      raise exception 'Contrato global não tem itens.';
    end if;
  end if;
  return new;
end $$;

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
  -- formato: cada linha é { "itemId": inteiro, "quantidade": número }
  for v_linha in select * from jsonb_array_elements(new.linhas) loop
    if jsonb_typeof(v_linha) <> 'object'
       or coalesce(jsonb_typeof(v_linha -> 'itemId'), '') <> 'number'
       or coalesce(jsonb_typeof(v_linha -> 'quantidade'), '') <> 'number'
       or (v_linha ->> 'itemId') !~ '^[0-9]+$' then
      raise exception 'Linha de boletim inválida: use o item e a quantidade.';
    end if;
  end loop;
  if (select count(distinct (x ->> 'itemId')::bigint) from jsonb_array_elements(new.linhas) x) <> jsonb_array_length(new.linhas) then
    raise exception 'Cada item aparece uma vez por boletim.';
  end if;
  for v_linha in select * from jsonb_array_elements(new.linhas) loop
    v_q := (v_linha ->> 'quantidade')::numeric;
    select * into v_item from public.itens_contrato where id = (v_linha ->> 'itemId')::bigint and contrato_id = c.id;
    if not found then
      raise exception 'Item que não é deste contrato.';
    end if;
    if v_q <= 0 then
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
