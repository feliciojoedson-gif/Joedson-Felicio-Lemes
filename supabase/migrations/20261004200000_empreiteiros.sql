-- Módulo Empreiteiros: contratos (Kanban), itens do escopo e boletins de medição.
-- Todas as tabelas têm obra_id e RLS por obra (private.veo_obra). Quem só consulta lê; quem cria/move/mede
-- (Coordenador, Planejamento, Medição) escreve. As regras de dinheiro valem NO BANCO também (gatilhos),
-- não só na tela: concluir só com 100% medido, nenhum item passa de 100%, boletim numerado pelo banco.
-- Boletim é imutável: sem UPDATE nem DELETE (correção de boletim fica para uma decisão futura).

create table public.contratos_empreiteiro (
  id bigint generated always as identity primary key,
  obra_id bigint not null references public.obras (id),
  empreiteiro text not null check (length(trim(empreiteiro)) > 0),
  descricao text not null check (length(trim(descricao)) > 0),
  status text not null default 'elaboracao' check (status in ('elaboracao', 'enviado', 'ativo', 'concluido')),
  modo text check (modo in ('global', 'escopo')),
  valor_total numeric(14, 2) check (valor_total > 0),
  criado_em date not null default current_date,
  created_at timestamptz not null default now(),
  -- contrato ativo ou concluído sempre tem o valor cadastrado
  constraint contrato_ativo_tem_valor check (status not in ('ativo', 'concluido') or (modo is not null and valor_total is not null))
);
create index on public.contratos_empreiteiro (obra_id, status);

create table public.itens_contrato (
  id bigint generated always as identity primary key,
  obra_id bigint not null references public.obras (id),
  contrato_id bigint not null references public.contratos_empreiteiro (id),
  descricao text not null check (length(trim(descricao)) > 0),
  unidade text not null check (unidade in ('m2', 'm', 'un', 'vb')),
  quantidade numeric(14, 6) not null check (quantidade > 0),
  preco_unitario numeric(14, 2) not null check (preco_unitario > 0),
  created_at timestamptz not null default now()
);
create index on public.itens_contrato (contrato_id);

-- `linhas` (só no escopo): [{ "itemId": 1, "quantidade": 60 }]. A quantidade é a fonte da verdade; `valor` deriva dela.
create table public.boletins_empreiteiro (
  id bigint generated always as identity primary key,
  obra_id bigint not null references public.obras (id),
  contrato_id bigint not null references public.contratos_empreiteiro (id),
  numero int not null check (numero > 0),
  data date not null,
  valor numeric(14, 2) not null check (valor > 0),
  linhas jsonb not null default '[]' check (jsonb_typeof(linhas) = 'array'),
  created_at timestamptz not null default now(),
  unique (contrato_id, numero)
);
create index on public.boletins_empreiteiro (obra_id);

-- ---------------------------------------------------------------------
-- GATILHOS DE REGRA
-- ---------------------------------------------------------------------

create function private.contrato_empreiteiro_protege() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  ordem text[] := array['elaboracao', 'enviado', 'ativo', 'concluido'];
  v_medido numeric;
  v_tem boolean;
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
  return new;
end $$;

create trigger contrato_empreiteiro_protege before update on public.contratos_empreiteiro
  for each row execute function private.contrato_empreiteiro_protege();

create function private.item_contrato_protege() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_contrato bigint := coalesce(new.contrato_id, old.contrato_id);
  v_obra bigint;
begin
  select obra_id into v_obra from public.contratos_empreiteiro where id = v_contrato;
  if tg_op <> 'DELETE' and (v_obra is null or new.obra_id <> v_obra) then
    raise exception 'O item não pertence à obra do contrato.';
  end if;
  if exists (select 1 from public.boletins_empreiteiro where contrato_id = v_contrato) then
    raise exception 'O escopo não muda depois da primeira medição.';
  end if;
  return coalesce(new, old);
end $$;

create trigger item_contrato_protege before insert or update or delete on public.itens_contrato
  for each row execute function private.item_contrato_protege();

-- Numera o boletim e reconfere TUDO que a tela já conferiu. O contrato fica travado (for update) até o fim
-- da gravação, então dois boletins ao mesmo tempo não furam o limite de 100% nem repetem o número.
create function private.boletim_empreiteiro_antes() returns trigger
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
    raise exception 'Passa de 100%%: o saldo a medir do contrato é R$ %.', to_char(c.valor_total - v_medido, 'FM999G999G990D00');
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
      raise exception 'Passa de 100%%: o saldo do item "%" é % %.', v_item.descricao, v_item.quantidade - v_acum, v_item.unidade;
    end if;
    -- valor do acumulado novo menos o do anterior, cada um arredondado uma vez (igual ao app)
    v_esperado := v_esperado + round((v_acum + v_q) * v_item.preco_unitario, 2) - round(v_acum * v_item.preco_unitario, 2);
  end loop;
  if abs(v_esperado - new.valor) > 0.015 then
    raise exception 'O valor do boletim não bate com as quantidades.';
  end if;
  return new;
end $$;

create trigger boletim_empreiteiro_antes before insert on public.boletins_empreiteiro
  for each row execute function private.boletim_empreiteiro_antes();

create trigger auditar after insert or update or delete on public.contratos_empreiteiro
  for each row execute function private.auditar();
create trigger auditar after insert or update or delete on public.itens_contrato
  for each row execute function private.auditar();
create trigger auditar after insert or update or delete on public.boletins_empreiteiro
  for each row execute function private.auditar();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

alter table public.contratos_empreiteiro enable row level security;
alter table public.itens_contrato enable row level security;
alter table public.boletins_empreiteiro enable row level security;

create policy contratos_empreiteiro_ver on public.contratos_empreiteiro for select to authenticated
  using (private.veo_obra(obra_id) and private.meu_role() in (
    'Coordenador', 'Diretoria', 'Administrador', 'Planejamento', 'Medição', 'Custos e Controle', 'Gestão Contratual'));
create policy contratos_empreiteiro_criar on public.contratos_empreiteiro for insert to authenticated
  with check (private.veo_obra(obra_id) and status = 'elaboracao'
    and private.meu_role() in ('Coordenador', 'Planejamento', 'Medição'));
create policy contratos_empreiteiro_editar on public.contratos_empreiteiro for update to authenticated
  using (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Planejamento', 'Medição'))
  with check (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Planejamento', 'Medição'));

create policy itens_contrato_ver on public.itens_contrato for select to authenticated
  using (private.veo_obra(obra_id) and private.meu_role() in (
    'Coordenador', 'Diretoria', 'Administrador', 'Planejamento', 'Medição', 'Custos e Controle', 'Gestão Contratual'));
create policy itens_contrato_criar on public.itens_contrato for insert to authenticated
  with check (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Planejamento', 'Medição'));
create policy itens_contrato_editar on public.itens_contrato for update to authenticated
  using (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Planejamento', 'Medição'))
  with check (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Planejamento', 'Medição'));
-- apagar item só existe para trocar o escopo ao reativar o contrato (o gatilho barra depois da 1a medição)
create policy itens_contrato_apagar on public.itens_contrato for delete to authenticated
  using (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Planejamento', 'Medição'));

create policy boletins_empreiteiro_ver on public.boletins_empreiteiro for select to authenticated
  using (private.veo_obra(obra_id) and private.meu_role() in (
    'Coordenador', 'Diretoria', 'Administrador', 'Planejamento', 'Medição', 'Custos e Controle', 'Gestão Contratual'));
create policy boletins_empreiteiro_criar on public.boletins_empreiteiro for insert to authenticated
  with check (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Planejamento', 'Medição'));

-- Permissões de tabela: nada para anon; contrato não se apaga; boletim não se altera nem se apaga.
revoke all on public.contratos_empreiteiro, public.itens_contrato, public.boletins_empreiteiro from anon;
revoke truncate on public.contratos_empreiteiro, public.itens_contrato, public.boletins_empreiteiro from authenticated;
revoke delete on public.contratos_empreiteiro from authenticated;
revoke update, delete on public.boletins_empreiteiro from authenticated;
