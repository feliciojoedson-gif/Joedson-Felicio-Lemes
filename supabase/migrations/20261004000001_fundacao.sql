-- Kaefer Rip: fundação do banco (9 tabelas, RLS por obra, auditoria e o processo "Diário que fecha a frente").
-- Fonte: PRD-BACKEND.md. O vocabulário dos CHECKs é idêntico ao de src/lib/regras.js (com acento).
-- Fora desta migration (próximas): virada diária (06h), Storage, dados de exemplo.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- =====================================================================
-- TABELAS
-- =====================================================================

create table public.profiles (
  id bigint generated always as identity primary key,
  auth_uid uuid not null unique references auth.users (id),
  nome text not null,
  email text not null unique,
  role text not null default 'Pendente' check (role in (
    'Coordenador', 'Planejamento', 'Engenharia', 'Produção', 'Medição', 'Custos e Controle',
    'Gestão Contratual', 'Cliente', 'Diretoria', 'Administrador', 'Pendente')),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.obras (
  id bigint generated always as identity primary key,
  codigo text not null unique,
  nome text not null,
  endereco text,
  cliente text not null,
  numero_contrato text,
  data_inicio date not null,
  data_fim_contratual date not null,
  status text not null default 'Planejamento'
    check (status in ('Planejamento', 'Ativa', 'Suspensa', 'Encerrada', 'Arquivada')),
  responsavel_id bigint references public.profiles (id),
  created_at timestamptz not null default now(),
  check (data_fim_contratual >= data_inicio)
);
create index on public.obras (status);
create index on public.obras (cliente);

create table public.obra_membros (
  id bigint generated always as identity primary key,
  obra_id bigint not null references public.obras (id),
  profile_id bigint not null references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (obra_id, profile_id)
);
create index on public.obra_membros (profile_id);

create table public.frentes (
  id bigint generated always as identity primary key,
  obra_id bigint not null references public.obras (id),
  nome text not null,
  disciplina text not null check (disciplina in (
    'Civil', 'Mecânica', 'Tubulação', 'Elétrica', 'Instrumentação', 'Andaimes', 'Pintura', 'Outra')),
  local text,
  responsavel_id bigint references public.profiles (id),
  inicio_planejado date not null,
  fim_planejado date not null,
  fim_planejado_original date not null,
  peso numeric(8, 2) not null default 1 check (peso > 0),
  eh_marco boolean not null default false,
  percentual_realizado numeric(5, 2) not null default 0 check (percentual_realizado between 0 and 100),
  ultimo_avanco_em date,
  dias_sem_avanco int not null default 0 check (dias_sem_avanco >= 0),
  status text not null default 'Não iniciada'
    check (status in ('Não iniciada', 'Em andamento', 'Parada', 'Concluída')),
  saude text not null default 'Verde' check (saude in ('Verde', 'Amarelo', 'Vermelho')),
  impacto_prazo_dias int,
  data_limite_decisao date,
  created_at timestamptz not null default now(),
  check (fim_planejado >= inicio_planejado),
  check (not eh_marco or inicio_planejado = fim_planejado)
);
create index on public.frentes (obra_id);
create index on public.frentes (status);
create index on public.frentes (dias_sem_avanco);
create index on public.frentes (disciplina);
create index on public.frentes (responsavel_id);

create table public.apontamentos (
  id bigint generated always as identity primary key,
  obra_id bigint not null references public.obras (id),
  frente_id bigint not null references public.frentes (id),
  data date not null,
  autor_id bigint not null references public.profiles (id),
  percentual_acumulado numeric(5, 2) not null check (percentual_acumulado between 0 and 100),
  houve_avanco boolean not null default false,
  motivo_sem_avanco text check (motivo_sem_avanco in (
    'Chuva', 'Falta de material', 'Falta de liberação', 'Falta de efetivo', 'Interferência', 'Retrabalho', 'Outro')),
  efetivo_qtd int not null check (efetivo_qtd >= 0),
  equipamentos text,
  observacao text,
  created_at timestamptz not null default now(),
  unique (frente_id, data),
  check (houve_avanco or motivo_sem_avanco is not null)
);
create index on public.apontamentos (obra_id, data);

create table public.fotos (
  id bigint generated always as identity primary key,
  obra_id bigint not null references public.obras (id),
  frente_id bigint not null references public.frentes (id),
  apontamento_id bigint references public.apontamentos (id),
  url text not null,
  legenda text,
  visivel_cliente boolean not null default false,
  autor_id bigint not null references public.profiles (id),
  tirada_em timestamptz not null,
  created_at timestamptz not null default now()
);
create index on public.fotos (frente_id);
create index on public.fotos (obra_id, tirada_em);
create index on public.fotos (visivel_cliente);

create table public.medicoes (
  id bigint generated always as identity primary key,
  obra_id bigint not null references public.obras (id),
  frente_id bigint not null references public.frentes (id),
  mes_referencia date not null check (extract(day from mes_referencia) = 1),
  quantidade numeric(14, 2) not null,
  unidade text not null,
  percentual_medido numeric(5, 2) not null check (percentual_medido between 0 and 100),
  valor_medido numeric(14, 2) not null check (valor_medido >= 0),
  status text not null default 'Rascunho' check (status in ('Rascunho', 'Enviada', 'Aprovada')),
  evidencia_url text,
  observacao text,
  created_at timestamptz not null default now(),
  unique (frente_id, mes_referencia)
);
create index on public.medicoes (obra_id, mes_referencia);

create table public.restricoes (
  id bigint generated always as identity primary key,
  obra_id bigint not null references public.obras (id),
  frente_id bigint references public.frentes (id),
  tipo text not null check (tipo in ('Restrição', 'RFI', 'Risco', 'Pleito potencial')),
  titulo text not null,
  descricao text,
  criticidade text not null check (criticidade in ('Alta', 'Média', 'Baixa')),
  status text not null default 'Aberta' check (status in ('Aberta', 'Em tratamento', 'Resolvida')),
  responsavel_id bigint references public.profiles (id),
  autor_id bigint not null references public.profiles (id),
  data_limite date,
  impacto_prazo_dias int,
  resolvida_em date,
  created_at timestamptz not null default now()
);
create index on public.restricoes (obra_id);
create index on public.restricoes (status);
create index on public.restricoes (criticidade);
create index on public.restricoes (tipo);

create table public.auditoria (
  id bigint generated always as identity primary key,
  obra_id bigint references public.obras (id),
  tabela text not null,
  registro_id bigint not null,
  acao text not null check (acao in ('Criou', 'Alterou', 'Apagou')),
  usuario_id bigint references public.profiles (id) on delete set null,
  perfil text,
  campo text,
  valor_anterior text,
  valor_novo text,
  justificativa text,
  created_at timestamptz not null default now()
);
create index on public.auditoria (obra_id, created_at);
create index on public.auditoria (tabela, registro_id);

-- =====================================================================
-- FUNÇÕES DE APOIO (schema private: não aparecem na API)
-- =====================================================================

-- Perfil de quem está logado. Conta inativa ou inexistente devolve null (não vê nada).
create function private.meu_perfil_id() returns bigint
language sql stable security definer set search_path = public as $$
  select id from public.profiles where auth_uid = auth.uid() and ativo
$$;

create function private.meu_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where auth_uid = auth.uid() and ativo
$$;

-- Enxerga a obra? Coordenador, Diretoria e Administrador veem todas; os demais só as suas (obra_membros).
create function private.veo_obra(p_obra bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when private.meu_role() is null or private.meu_role() = 'Pendente' then false
    when private.meu_role() in ('Coordenador', 'Diretoria', 'Administrador') then true
    else exists (
      select 1 from public.obra_membros m
      where m.obra_id = p_obra and m.profile_id = private.meu_perfil_id())
  end
$$;

grant execute on all functions in schema private to authenticated;

-- =====================================================================
-- GATILHOS DE REGRA
-- =====================================================================

-- Cadastro: toda conta nova nasce Pendente.
create function private.novo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (auth_uid, nome, email, role)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'nome', ''), split_part(new.email, '@', 1)), new.email, 'Pendente');
  return new;
end $$;

create trigger ao_criar_usuario after insert on auth.users
  for each row execute function private.novo_usuario();

-- Só o Coordenador troca perfil e ativo; a pessoa edita só o próprio nome.
-- auth.uid() nulo = manutenção direta no banco (promover o primeiro Coordenador).
create function private.profiles_protege() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and private.meu_role() is distinct from 'Coordenador' then
    if new.role is distinct from old.role or new.ativo is distinct from old.ativo
       or new.email is distinct from old.email or new.auth_uid is distinct from old.auth_uid then
      raise exception 'Só o Coordenador altera perfil e situação da conta.';
    end if;
  end if;
  return new;
end $$;

create trigger profiles_protege before update on public.profiles
  for each row execute function private.profiles_protege();

-- Campos calculados da frente só mudam pelos processos (gatilho do diário, virada diária).
create function private.frentes_protege() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.fim_planejado_original := new.fim_planejado;
    if auth.uid() is not null then
      new.percentual_realizado := 0; new.ultimo_avanco_em := null; new.dias_sem_avanco := 0;
      new.status := 'Não iniciada'; new.saude := 'Verde';
    end if;
  else
    if new.fim_planejado_original is distinct from old.fim_planejado_original then
      raise exception 'O fim planejado original não muda.';
    end if;
    if auth.uid() is not null and pg_trigger_depth() < 2 and (
      new.percentual_realizado, new.ultimo_avanco_em, new.dias_sem_avanco, new.status, new.saude
    ) is distinct from (
      old.percentual_realizado, old.ultimo_avanco_em, old.dias_sem_avanco, old.status, old.saude
    ) then
      raise exception 'Avanço, dias sem avanço, status e saúde são calculados pelo sistema.';
    end if;
  end if;
  return new;
end $$;

create trigger frentes_protege before insert or update on public.frentes
  for each row execute function private.frentes_protege();

-- Diário: valida, calcula "houve avanço" e mantém a obra da frente.
create function private.apontamento_antes() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_obra bigint;
  v_anterior numeric;
begin
  select obra_id into v_obra from public.frentes where id = new.frente_id;
  if v_obra is null then raise exception 'Frente não encontrada.'; end if;
  if new.obra_id <> v_obra then raise exception 'A obra do lançamento tem que ser a mesma da frente.'; end if;

  select a.percentual_acumulado into v_anterior from public.apontamentos a
   where a.frente_id = new.frente_id and a.data < new.data and a.id is distinct from new.id
   order by a.data desc limit 1;
  v_anterior := coalesce(v_anterior, 0);
  if new.percentual_acumulado < v_anterior then
    raise exception 'O acumulado não pode ser menor que o último lançamento (%).', v_anterior;
  end if;
  new.houve_avanco := new.percentual_acumulado > v_anterior;
  if new.houve_avanco then new.motivo_sem_avanco := null; end if;
  return new;
end $$;

create trigger apontamento_antes before insert or update on public.apontamentos
  for each row execute function private.apontamento_antes();

-- Processo "Diário que fecha a frente": roda na mesma transação do lançamento (falhou, nada fica pela metade).
create function private.apontamento_depois() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.data >= coalesce((select max(a.data) from public.apontamentos a
                            where a.frente_id = new.frente_id and a.id <> new.id), new.data) then
    update public.frentes f set
      percentual_realizado = new.percentual_acumulado,
      ultimo_avanco_em = case when new.houve_avanco then greatest(coalesce(f.ultimo_avanco_em, new.data), new.data)
                              else f.ultimo_avanco_em end,
      dias_sem_avanco = case when new.houve_avanco then 0 else f.dias_sem_avanco end,
      status = case
        when new.percentual_acumulado >= 100 then 'Concluída'
        when new.houve_avanco and f.status in ('Parada', 'Não iniciada') then 'Em andamento'
        else f.status end
    where f.id = new.frente_id;
  end if;
  return null;
end $$;

create trigger apontamento_depois after insert or update on public.apontamentos
  for each row execute function private.apontamento_depois();

-- Foto, medição e restrição: a obra do registro tem que ser a da frente.
create function private.mesma_obra_da_frente() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_obra bigint;
begin
  if new.frente_id is not null then
    select obra_id into v_obra from public.frentes where id = new.frente_id;
    if v_obra is null or v_obra <> new.obra_id then
      raise exception 'A frente não pertence à obra do registro.';
    end if;
  end if;
  return new;
end $$;

create trigger mesma_obra before insert or update on public.fotos
  for each row execute function private.mesma_obra_da_frente();
create trigger mesma_obra before insert or update on public.medicoes
  for each row execute function private.mesma_obra_da_frente();
create trigger mesma_obra before insert or update on public.restricoes
  for each row execute function private.mesma_obra_da_frente();

-- Gestão Contratual aprova: muda o status, nada mais.
create function private.medicoes_protege() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and auth.uid() is not null and private.meu_role() = 'Gestão Contratual'
     and (to_jsonb(new) - 'status' - 'observacao') is distinct from (to_jsonb(old) - 'status' - 'observacao') then
    raise exception 'A Gestão Contratual só altera o status e a observação da medição.';
  end if;
  return new;
end $$;

create trigger medicoes_protege before update on public.medicoes
  for each row execute function private.medicoes_protege();

create function private.restricao_resolvida() returns trigger
language plpgsql as $$
begin
  new.resolvida_em := case when new.status = 'Resolvida' then coalesce(new.resolvida_em, current_date) else null end;
  return new;
end $$;

create trigger restricao_resolvida before insert or update on public.restricoes
  for each row execute function private.restricao_resolvida();

-- =====================================================================
-- AUDITORIA (só por gatilho; ninguém grava, edita nem apaga)
-- =====================================================================

create function private.auditar() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_ant jsonb := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  v_nov jsonb := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  v_base jsonb := coalesce(v_nov, v_ant);
  v_obra bigint;
  v_reg bigint := (v_base ->> 'id')::bigint;
  v_user bigint := private.meu_perfil_id();
  v_perfil text := private.meu_role();
  k text;
begin
  v_obra := case tg_table_name when 'obras' then v_reg when 'profiles' then null
                 else (v_base ->> 'obra_id')::bigint end;
  if tg_op = 'INSERT' then
    insert into public.auditoria (obra_id, tabela, registro_id, acao, usuario_id, perfil)
    values (v_obra, tg_table_name, v_reg, 'Criou', v_user, v_perfil);
  elsif tg_op = 'DELETE' then
    insert into public.auditoria (obra_id, tabela, registro_id, acao, usuario_id, perfil)
    values (v_obra, tg_table_name, v_reg, 'Apagou', v_user, v_perfil);
  else
    for k in select jsonb_object_keys(v_nov) loop
      if k <> 'created_at' and (v_nov -> k) is distinct from (v_ant -> k) then
        insert into public.auditoria (obra_id, tabela, registro_id, acao, usuario_id, perfil, campo, valor_anterior, valor_novo)
        values (v_obra, tg_table_name, v_reg, 'Alterou', v_user, v_perfil, k, v_ant ->> k, v_nov ->> k);
      end if;
    end loop;
  end if;
  return null;
end $$;

create trigger auditar after insert or update or delete on public.obras
  for each row execute function private.auditar();
create trigger auditar after insert or update or delete on public.obra_membros
  for each row execute function private.auditar();
create trigger auditar after insert or update or delete on public.frentes
  for each row execute function private.auditar();
create trigger auditar after insert or update or delete on public.medicoes
  for each row execute function private.auditar();
create trigger auditar after insert or update or delete on public.restricoes
  for each row execute function private.auditar();
create trigger auditar after insert or update or delete on public.profiles
  for each row execute function private.auditar();

-- =====================================================================
-- VIEWS: recortes de campo que a RLS (que é por linha) não faz
-- Rodam com o dono da view (contornam a RLS) e filtram por perfil e obra por conta própria.
-- =====================================================================

create view public.frentes_cliente with (security_barrier = true) as
  select f.id, f.obra_id, f.nome, f.local, f.disciplina, f.inicio_planejado, f.fim_planejado,
         f.percentual_realizado, f.eh_marco, f.peso
  from public.frentes f
  where private.meu_role() = 'Cliente' and private.veo_obra(f.obra_id);

create view public.medicoes_cliente with (security_barrier = true) as
  select m.id, m.obra_id, m.frente_id, m.mes_referencia, m.quantidade, m.unidade, m.percentual_medido, m.status
  from public.medicoes m
  where private.meu_role() = 'Cliente' and private.veo_obra(m.obra_id) and m.status = 'Aprovada';

create view public.apontamentos_sem_efetivo with (security_barrier = true) as
  select a.id, a.obra_id, a.frente_id, a.data, a.autor_id, a.percentual_acumulado, a.houve_avanco,
         a.motivo_sem_avanco, a.equipamentos, a.observacao, a.created_at
  from public.apontamentos a
  where private.meu_role() = 'Engenharia' and private.veo_obra(a.obra_id);

create view public.perfis_colegas with (security_barrier = true) as
  select p.id, p.nome, p.role
  from public.profiles p
  where p.ativo and private.meu_role() not in ('Cliente', 'Pendente') and (
    private.meu_role() in ('Coordenador', 'Diretoria', 'Administrador')
    or p.id = private.meu_perfil_id()
    or p.role = 'Coordenador'
    or exists (
      select 1 from public.obra_membros a join public.obra_membros b on a.obra_id = b.obra_id
      where a.profile_id = private.meu_perfil_id() and b.profile_id = p.id));

-- =====================================================================
-- RLS
-- =====================================================================

alter table public.profiles enable row level security;
alter table public.obras enable row level security;
alter table public.obra_membros enable row level security;
alter table public.frentes enable row level security;
alter table public.apontamentos enable row level security;
alter table public.fotos enable row level security;
alter table public.medicoes enable row level security;
alter table public.restricoes enable row level security;
alter table public.auditoria enable row level security;

-- profiles
create policy profiles_ver on public.profiles for select to authenticated
  using (id = private.meu_perfil_id() or private.meu_role() in ('Coordenador', 'Administrador'));
create policy profiles_editar on public.profiles for update to authenticated
  using (id = private.meu_perfil_id() or private.meu_role() = 'Coordenador')
  with check (id = private.meu_perfil_id() or private.meu_role() = 'Coordenador');

-- obras
create policy obras_ver on public.obras for select to authenticated using (private.veo_obra(id));
create policy obras_criar on public.obras for insert to authenticated
  with check (private.meu_role() = 'Coordenador');
create policy obras_editar on public.obras for update to authenticated
  using (private.meu_role() = 'Coordenador') with check (private.meu_role() = 'Coordenador');

-- obra_membros
create policy membros_ver on public.obra_membros for select to authenticated
  using (private.meu_role() in ('Coordenador', 'Diretoria', 'Administrador') or profile_id = private.meu_perfil_id());
create policy membros_criar on public.obra_membros for insert to authenticated
  with check (private.meu_role() = 'Coordenador');
create policy membros_editar on public.obra_membros for update to authenticated
  using (private.meu_role() = 'Coordenador') with check (private.meu_role() = 'Coordenador');
create policy membros_apagar on public.obra_membros for delete to authenticated
  using (private.meu_role() = 'Coordenador');

-- frentes (Cliente lê pela view frentes_cliente)
create policy frentes_ver on public.frentes for select to authenticated
  using (private.veo_obra(obra_id) and private.meu_role() in (
    'Coordenador', 'Diretoria', 'Administrador', 'Planejamento', 'Engenharia', 'Produção',
    'Medição', 'Custos e Controle', 'Gestão Contratual'));
create policy frentes_criar on public.frentes for insert to authenticated
  with check (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Planejamento'));
create policy frentes_editar on public.frentes for update to authenticated
  using (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Planejamento'))
  with check (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Planejamento'));
create policy frentes_apagar on public.frentes for delete to authenticated
  using (private.meu_role() = 'Coordenador');

-- apontamentos (Engenharia lê pela view apontamentos_sem_efetivo)
create policy apontamentos_ver on public.apontamentos for select to authenticated
  using (private.veo_obra(obra_id) and (
    private.meu_role() in ('Coordenador', 'Diretoria', 'Administrador', 'Planejamento', 'Medição', 'Custos e Controle')
    or (private.meu_role() = 'Produção' and autor_id = private.meu_perfil_id())));
create policy apontamentos_criar on public.apontamentos for insert to authenticated
  with check (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Produção')
              and autor_id = private.meu_perfil_id());
create policy apontamentos_editar on public.apontamentos for update to authenticated
  using (private.veo_obra(obra_id) and (
    private.meu_role() = 'Coordenador'
    or (private.meu_role() = 'Produção' and autor_id = private.meu_perfil_id() and data = current_date)))
  with check (private.veo_obra(obra_id) and (
    private.meu_role() = 'Coordenador' or autor_id = private.meu_perfil_id()));
create policy apontamentos_apagar on public.apontamentos for delete to authenticated
  using (private.meu_role() = 'Coordenador');

-- fotos
create policy fotos_ver on public.fotos for select to authenticated
  using (private.veo_obra(obra_id) and (
    private.meu_role() in ('Coordenador', 'Diretoria', 'Administrador', 'Planejamento', 'Engenharia', 'Produção', 'Medição', 'Gestão Contratual')
    or (private.meu_role() = 'Cliente' and visivel_cliente)));
create policy fotos_criar on public.fotos for insert to authenticated
  with check (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Produção')
              and autor_id = private.meu_perfil_id());
create policy fotos_editar on public.fotos for update to authenticated
  using (private.meu_role() = 'Coordenador' and private.veo_obra(obra_id))
  with check (private.meu_role() = 'Coordenador' and private.veo_obra(obra_id));
create policy fotos_apagar on public.fotos for delete to authenticated
  using (private.meu_role() = 'Coordenador');

-- medicoes (Cliente lê pela view medicoes_cliente; Engenharia e Produção não leem)
create policy medicoes_ver on public.medicoes for select to authenticated
  using (private.veo_obra(obra_id) and private.meu_role() in (
    'Coordenador', 'Diretoria', 'Administrador', 'Planejamento', 'Medição', 'Custos e Controle', 'Gestão Contratual'));
create policy medicoes_criar on public.medicoes for insert to authenticated
  with check (private.veo_obra(obra_id) and (
    private.meu_role() = 'Coordenador'
    or (private.meu_role() = 'Medição' and status in ('Rascunho', 'Enviada'))));
-- Coordenador e Medição preparam e enviam; só o Coordenador mexe numa medição já aprovada.
create policy medicoes_editar on public.medicoes for update to authenticated
  using (private.veo_obra(obra_id) and (
    private.meu_role() = 'Coordenador'
    or (private.meu_role() = 'Medição' and status <> 'Aprovada')))
  with check (private.veo_obra(obra_id) and (
    private.meu_role() = 'Coordenador'
    or (private.meu_role() = 'Medição' and status in ('Rascunho', 'Enviada'))));
-- Gestão Contratual aprova: de Enviada para Aprovada (o gatilho limita a mudança ao status).
create policy medicoes_aprovar on public.medicoes for update to authenticated
  using (private.veo_obra(obra_id) and private.meu_role() = 'Gestão Contratual' and status = 'Enviada')
  with check (private.veo_obra(obra_id) and private.meu_role() = 'Gestão Contratual' and status = 'Aprovada');
create policy medicoes_apagar on public.medicoes for delete to authenticated
  using (private.meu_role() = 'Coordenador');

-- restricoes
create policy restricoes_ver on public.restricoes for select to authenticated
  using (private.veo_obra(obra_id) and (
    private.meu_role() in ('Coordenador', 'Diretoria', 'Administrador', 'Gestão Contratual')
    or (private.meu_role() in ('Planejamento', 'Engenharia', 'Produção') and tipo in ('Restrição', 'RFI'))));
create policy restricoes_criar on public.restricoes for insert to authenticated
  with check (private.veo_obra(obra_id) and autor_id = private.meu_perfil_id() and (
    private.meu_role() = 'Coordenador'
    or (private.meu_role() = 'Gestão Contratual' and tipo in ('Risco', 'Pleito potencial'))
    or (private.meu_role() in ('Planejamento', 'Engenharia', 'Produção') and tipo in ('Restrição', 'RFI'))));
create policy restricoes_editar on public.restricoes for update to authenticated
  using (private.veo_obra(obra_id) and (
    private.meu_role() = 'Coordenador'
    or (private.meu_role() = 'Gestão Contratual' and tipo in ('Risco', 'Pleito potencial'))
    or (private.meu_role() = 'Engenharia' and tipo in ('Restrição', 'RFI'))
    or (private.meu_role() in ('Planejamento', 'Produção') and tipo in ('Restrição', 'RFI') and autor_id = private.meu_perfil_id())))
  with check (private.veo_obra(obra_id) and (
    private.meu_role() = 'Coordenador'
    or (private.meu_role() = 'Gestão Contratual' and tipo in ('Risco', 'Pleito potencial'))
    or (private.meu_role() in ('Planejamento', 'Engenharia', 'Produção') and tipo in ('Restrição', 'RFI'))));
create policy restricoes_apagar on public.restricoes for delete to authenticated
  using (private.meu_role() = 'Coordenador');

-- auditoria: só leitura
create policy auditoria_ver on public.auditoria for select to authenticated
  using (private.meu_role() in ('Coordenador', 'Diretoria', 'Administrador')
         or (private.meu_role() = 'Gestão Contratual' and private.veo_obra(obra_id)));

-- =====================================================================
-- PERMISSÕES DE TABELA
-- =====================================================================

revoke all on all tables in schema public from anon;
revoke insert, update, delete, truncate on public.auditoria from authenticated;
revoke insert, delete, truncate on public.profiles from authenticated;
revoke delete, truncate on public.obras from authenticated;
revoke truncate on all tables in schema public from authenticated;
-- views: só leitura
revoke insert, update, delete, truncate on
  public.frentes_cliente, public.medicoes_cliente, public.apontamentos_sem_efetivo, public.perfis_colegas
  from authenticated;
