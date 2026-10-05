-- Módulo Planejamento (Last Planner): atividades (EAP), restrições do lookahead e a configuração por obra
-- (calendário + linha de base). Todas com obra_id e RLS por obra (private.veo_obra).
-- O id da atividade/restrição é numerado POR OBRA (como a tela já faz): a chave é (obra_id, id), e a linha de base
-- e as restrições apontam para esses ids. Quem lê/grava: Coordenador, Planejamento e Produção (que marca subtarefas);
-- apagar (importar planilha em modo "substituir") só Coordenador e Planejamento.

create table public.atividades_planejamento (
  obra_id bigint not null references public.obras (id),
  id int not null check (id > 0),
  titulo text not null check (length(trim(titulo)) > 0),
  parent_id int,
  ordem int not null default 0,
  inicio date not null,
  fim date not null,
  progresso numeric(5, 2) not null default 0 check (progresso >= 0 and progresso <= 100),
  status text not null default 'a_fazer' check (status in ('a_fazer', 'andamento', 'concluida', 'nao_realizado')),
  causa text not null default '',
  causa_detalhe text not null default '',
  concluida_em date,
  inicio_real date,
  fim_real date,
  arquivada boolean not null default false,
  empresa text not null default '',
  subtarefas jsonb not null default '[]' check (jsonb_typeof(subtarefas) = 'array'),
  created_by uuid default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (obra_id, id),
  foreign key (obra_id, parent_id) references public.atividades_planejamento (obra_id, id),
  check (fim >= inicio)
);
create index on public.atividades_planejamento (obra_id, parent_id);

create table public.restricoes_planejamento (
  obra_id bigint not null references public.obras (id),
  id int not null check (id > 0),
  atividade_id int not null,
  descricao text not null check (length(trim(descricao)) > 0),
  tipo text not null check (tipo in ('Material', 'Mão de Obra', 'Método', 'Equipamento', 'Projeto', 'Segurança', 'Logística')),
  prazo date not null,
  responsavel text not null check (length(trim(responsavel)) > 0),
  resolvida boolean not null default false,
  created_by uuid default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (obra_id, id),
  foreign key (obra_id, atividade_id) references public.atividades_planejamento (obra_id, id)
);

-- Uma linha por obra: dias de trabalho + feriados e a linha de base (datas originais congeladas).
create table public.planejamento_config (
  obra_id bigint primary key references public.obras (id),
  calendario jsonb not null check (jsonb_typeof(calendario) = 'object'),
  baseline jsonb check (baseline is null or jsonb_typeof(baseline) = 'object'),
  created_by uuid default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function private.carimbar_atualizacao() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger carimbar before update on public.atividades_planejamento
  for each row execute function private.carimbar_atualizacao();
create trigger carimbar before update on public.restricoes_planejamento
  for each row execute function private.carimbar_atualizacao();
create trigger carimbar before update on public.planejamento_config
  for each row execute function private.carimbar_atualizacao();

-- obra e autor não mudam depois de criados
create function private.planejamento_imutaveis() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.obra_id <> old.obra_id then
    raise exception 'O registro não pode mudar de obra.';
  end if;
  return new;
end $$;
create trigger imutaveis before update on public.atividades_planejamento
  for each row execute function private.planejamento_imutaveis();
create trigger imutaveis before update on public.restricoes_planejamento
  for each row execute function private.planejamento_imutaveis();
create trigger imutaveis before update on public.planejamento_config
  for each row execute function private.planejamento_imutaveis();

alter table public.atividades_planejamento enable row level security;
alter table public.restricoes_planejamento enable row level security;
alter table public.planejamento_config enable row level security;

create policy atividades_planejamento_ver on public.atividades_planejamento for select to authenticated
  using (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Planejamento', 'Produção'));
create policy atividades_planejamento_criar on public.atividades_planejamento for insert to authenticated
  with check (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Planejamento', 'Produção'));
create policy atividades_planejamento_editar on public.atividades_planejamento for update to authenticated
  using (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Planejamento', 'Produção'))
  with check (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Planejamento', 'Produção'));
create policy atividades_planejamento_apagar on public.atividades_planejamento for delete to authenticated
  using (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Planejamento'));

create policy restricoes_planejamento_ver on public.restricoes_planejamento for select to authenticated
  using (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Planejamento', 'Produção'));
create policy restricoes_planejamento_criar on public.restricoes_planejamento for insert to authenticated
  with check (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Planejamento', 'Produção'));
create policy restricoes_planejamento_editar on public.restricoes_planejamento for update to authenticated
  using (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Planejamento', 'Produção'))
  with check (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Planejamento', 'Produção'));
create policy restricoes_planejamento_apagar on public.restricoes_planejamento for delete to authenticated
  using (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Planejamento'));

create policy planejamento_config_ver on public.planejamento_config for select to authenticated
  using (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Planejamento', 'Produção'));
create policy planejamento_config_criar on public.planejamento_config for insert to authenticated
  with check (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Planejamento', 'Produção'));
create policy planejamento_config_editar on public.planejamento_config for update to authenticated
  using (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Planejamento', 'Produção'))
  with check (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Planejamento', 'Produção'));

revoke all on public.atividades_planejamento, public.restricoes_planejamento, public.planejamento_config from anon;
revoke truncate on public.atividades_planejamento, public.restricoes_planejamento, public.planejamento_config from authenticated;
revoke delete on public.planejamento_config from authenticated;
