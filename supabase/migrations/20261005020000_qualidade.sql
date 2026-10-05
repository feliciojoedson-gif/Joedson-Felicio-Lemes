-- Módulo Qualidade: pendências, FVS (modelos, vistorias, não conformidades) e Gemba Walk.
-- Tudo com obra_id e RLS por obra (private.veo_obra), exceto os modelos de FVS, que valem para a empresa toda.
-- Ler: quem usa Qualidade ou os Relatórios. Criar/editar: Coordenador, Planejamento, Engenharia e Produção (gerirQualidade).
-- Apagar: pendência só o Coordenador; modelo e observação de Gemba também Planejamento e Engenharia; vistoria e NC não se apagam.
-- Fotos: bucket privado `fotos`, em <obra_id>/qualidade/. As tabelas guardam o CAMINHO do arquivo.

create table public.qualidade_pendencias (
  id bigint generated always as identity primary key,
  obra_id bigint not null references public.obras (id),
  numero_registro int not null,
  descricao text not null check (length(trim(descricao)) > 0),
  local text not null default '',
  pavimento text not null default '',
  empresa text not null default '',
  prazo date,
  responsavel text not null default '',
  data_vistoria date,
  vistoriado_por text not null default '',
  status text not null default 'pendente' check (status in ('pendente', 'em_andamento', 'resolvido')),
  foto text not null default '',
  foto_evidencia text not null default '',
  data_resolucao date,
  observacoes text not null default '',
  created_by uuid default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (obra_id, numero_registro)
);

-- O banco numera a pendência por obra (#1, #2...): duas pessoas criando juntas não repetem número.
create function private.pendencia_numera() returns trigger
language plpgsql set search_path = public as $$
begin
  perform pg_advisory_xact_lock(new.obra_id);
  select coalesce(max(numero_registro), 0) + 1 into new.numero_registro from public.qualidade_pendencias where obra_id = new.obra_id;
  return new;
end $$;
create trigger numera before insert on public.qualidade_pendencias for each row execute function private.pendencia_numera();

create table public.fvs_modelos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique check (length(trim(codigo)) > 0),
  nome text not null check (length(trim(nome)) > 0),
  categoria text not null check (categoria in ('Impermeabilização', 'Estrutura', 'Instalações', 'Acabamento')),
  versao int not null default 1 check (versao > 0),
  grupos jsonb not null default '[]' check (jsonb_typeof(grupos) = 'array'),
  created_by uuid default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A vistoria guarda uma CÓPIA dos grupos do modelo (editar o modelo não mexe em vistoria feita); por isso modelo_id não é chave estrangeira.
create table public.fvs_vistorias (
  id uuid primary key default gen_random_uuid(),
  obra_id bigint not null references public.obras (id),
  modelo_id uuid,
  modelo_codigo text not null,
  modelo_nome text not null,
  versao int not null,
  ambiente text not null check (length(trim(ambiente)) > 0),
  grupos jsonb not null check (jsonb_typeof(grupos) = 'array'),
  respostas jsonb not null default '{}' check (jsonb_typeof(respostas) = 'object'),
  status text not null default 'em_andamento' check (status in ('em_andamento', 'concluida')),
  criada_em date not null,
  criada_por text not null default '',
  concluida_em date,
  empresa text not null default '',
  created_by uuid default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.fvs_vistorias (obra_id);

create table public.fvs_ncs (
  id uuid primary key default gen_random_uuid(),
  obra_id bigint not null references public.obras (id),
  codigo text not null,
  vistoria_id uuid not null references public.fvs_vistorias (id),
  item_id int not null,
  item_numero text not null,
  titulo text not null,
  servico text not null,
  ambiente text not null,
  severidade text not null check (severidade in ('Baixa', 'Média', 'Alta')),
  responsavel text not null default '',
  empresa text not null default '',
  descricao text not null default '',
  solucao text not null default '',
  status text not null default 'aberta' check (status in ('aberta', 'encaminhada', 'corrigida', 'fechada')),
  aberta_em date not null,
  fechada_em date,
  fotos jsonb not null default '[]' check (jsonb_typeof(fotos) = 'array'),
  timeline jsonb not null default '[]' check (jsonb_typeof(timeline) = 'array'),
  created_by uuid default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (obra_id, codigo)
);
create index on public.fvs_ncs (obra_id, status);

create table public.gemba_observacoes (
  id uuid primary key default gen_random_uuid(),
  obra_id bigint not null references public.obras (id),
  local text not null check (length(trim(local)) > 0),
  descricao text not null check (length(trim(descricao)) > 0),
  causa_raiz text not null default '',
  acao text not null default '',
  desperdicios jsonb not null default '[]' check (
    jsonb_typeof(desperdicios) = 'array'
    and desperdicios <@ '["Retrabalho","Espera","Transporte","Movimentação","Estoque","Superprodução","Processo desnecessário"]'::jsonb),
  prazo date,
  responsavel text not null default '',
  empresa text not null default '',
  status text not null default 'pendente' check (status in ('pendente', 'em_andamento', 'resolvido')),
  foto text not null default '',
  created_by uuid default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.gemba_observacoes (obra_id, status);

create trigger carimbar before update on public.qualidade_pendencias for each row execute function private.carimbar_atualizacao();
create trigger carimbar before update on public.fvs_modelos for each row execute function private.carimbar_atualizacao();
create trigger carimbar before update on public.fvs_vistorias for each row execute function private.carimbar_atualizacao();
create trigger carimbar before update on public.fvs_ncs for each row execute function private.carimbar_atualizacao();
create trigger carimbar before update on public.gemba_observacoes for each row execute function private.carimbar_atualizacao();
create trigger imutaveis before update on public.qualidade_pendencias for each row execute function private.planejamento_imutaveis();
create trigger imutaveis before update on public.fvs_vistorias for each row execute function private.planejamento_imutaveis();
create trigger imutaveis before update on public.fvs_ncs for each row execute function private.planejamento_imutaveis();
create trigger imutaveis before update on public.gemba_observacoes for each row execute function private.planejamento_imutaveis();
create trigger auditar after insert or update or delete on public.qualidade_pendencias for each row execute function private.auditar();
-- (private.auditar() converte o id para bigint; as tabelas com id uuid ficam fora da auditoria.)

-- Marcar NC no item grava a NC e a resposta da vistoria juntas (ou nenhuma). SECURITY INVOKER: a RLS vale como se fossem dois comandos da pessoa.
create function public.fvs_registrar_nc(p_nc jsonb, p_vistoria uuid, p_respostas jsonb) returns void
language plpgsql security invoker set search_path = public as $$
declare v_obra bigint := (p_nc ->> 'obra_id')::bigint;
begin
  insert into public.fvs_ncs (id, obra_id, codigo, vistoria_id, item_id, item_numero, titulo, servico, ambiente, severidade,
      responsavel, empresa, descricao, solucao, status, aberta_em, fechada_em, fotos, timeline)
  values (
    coalesce((p_nc ->> 'id')::uuid, gen_random_uuid()), v_obra, p_nc ->> 'codigo', p_vistoria, (p_nc ->> 'item_id')::int, p_nc ->> 'item_numero',
    p_nc ->> 'titulo', p_nc ->> 'servico', p_nc ->> 'ambiente', p_nc ->> 'severidade',
    coalesce(p_nc ->> 'responsavel', ''), coalesce(p_nc ->> 'empresa', ''), coalesce(p_nc ->> 'descricao', ''), coalesce(p_nc ->> 'solucao', ''),
    coalesce(p_nc ->> 'status', 'aberta'), (p_nc ->> 'aberta_em')::date, (p_nc ->> 'fechada_em')::date,
    coalesce(p_nc -> 'fotos', '[]'::jsonb), coalesce(p_nc -> 'timeline', '[]'::jsonb));
  update public.fvs_vistorias set respostas = p_respostas where id = p_vistoria and obra_id = v_obra;
  if not found then
    raise exception 'Vistoria não encontrada nesta obra.';
  end if;
end $$;
revoke execute on function public.fvs_registrar_nc(jsonb, uuid, jsonb) from public, anon;
grant execute on function public.fvs_registrar_nc(jsonb, uuid, jsonb) to authenticated;

alter table public.qualidade_pendencias enable row level security;
alter table public.fvs_modelos enable row level security;
alter table public.fvs_vistorias enable row level security;
alter table public.fvs_ncs enable row level security;
alter table public.gemba_observacoes enable row level security;

-- Leitura (por obra): quem usa Qualidade e os Relatórios.
create policy qualidade_pendencias_ver on public.qualidade_pendencias for select to authenticated
  using (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Planejamento', 'Engenharia', 'Produção', 'Diretoria', 'Custos e Controle', 'Administrador'));
create policy fvs_vistorias_ver on public.fvs_vistorias for select to authenticated
  using (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Planejamento', 'Engenharia', 'Produção', 'Diretoria', 'Custos e Controle', 'Administrador'));
create policy fvs_ncs_ver on public.fvs_ncs for select to authenticated
  using (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Planejamento', 'Engenharia', 'Produção', 'Diretoria', 'Custos e Controle', 'Administrador'));
create policy gemba_observacoes_ver on public.gemba_observacoes for select to authenticated
  using (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Planejamento', 'Engenharia', 'Produção', 'Diretoria', 'Custos e Controle', 'Administrador'));
create policy fvs_modelos_ver on public.fvs_modelos for select to authenticated
  using (private.meu_role() in ('Coordenador', 'Planejamento', 'Engenharia', 'Produção', 'Diretoria', 'Custos e Controle', 'Administrador'));

-- Criar e editar (por obra): Coordenador, Planejamento, Engenharia, Produção.
create policy qualidade_pendencias_criar on public.qualidade_pendencias for insert to authenticated
  with check (private.veo_obra(obra_id) and status = 'pendente' and private.meu_role() in ('Coordenador', 'Planejamento', 'Engenharia', 'Produção'));
create policy qualidade_pendencias_editar on public.qualidade_pendencias for update to authenticated
  using (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Planejamento', 'Engenharia', 'Produção'))
  with check (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Planejamento', 'Engenharia', 'Produção'));
create policy fvs_vistorias_criar on public.fvs_vistorias for insert to authenticated
  with check (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Planejamento', 'Engenharia', 'Produção'));
create policy fvs_vistorias_editar on public.fvs_vistorias for update to authenticated
  using (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Planejamento', 'Engenharia', 'Produção'))
  with check (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Planejamento', 'Engenharia', 'Produção'));
create policy fvs_ncs_criar on public.fvs_ncs for insert to authenticated
  with check (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Planejamento', 'Engenharia', 'Produção'));
create policy fvs_ncs_editar on public.fvs_ncs for update to authenticated
  using (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Planejamento', 'Engenharia', 'Produção'))
  with check (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Planejamento', 'Engenharia', 'Produção'));
create policy gemba_observacoes_criar on public.gemba_observacoes for insert to authenticated
  with check (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Planejamento', 'Engenharia', 'Produção'));
create policy gemba_observacoes_editar on public.gemba_observacoes for update to authenticated
  using (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Planejamento', 'Engenharia', 'Produção'))
  with check (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Planejamento', 'Engenharia', 'Produção'));
create policy fvs_modelos_criar on public.fvs_modelos for insert to authenticated
  with check (private.meu_role() in ('Coordenador', 'Planejamento', 'Engenharia', 'Produção'));
create policy fvs_modelos_editar on public.fvs_modelos for update to authenticated
  using (private.meu_role() in ('Coordenador', 'Planejamento', 'Engenharia', 'Produção'))
  with check (private.meu_role() in ('Coordenador', 'Planejamento', 'Engenharia', 'Produção'));

-- Apagar.
create policy qualidade_pendencias_apagar on public.qualidade_pendencias for delete to authenticated
  using (private.veo_obra(obra_id) and private.meu_role() = 'Coordenador');
create policy gemba_observacoes_apagar on public.gemba_observacoes for delete to authenticated
  using (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Planejamento', 'Engenharia'));
create policy fvs_modelos_apagar on public.fvs_modelos for delete to authenticated
  using (private.meu_role() in ('Coordenador', 'Planejamento', 'Engenharia'));

revoke all on public.qualidade_pendencias, public.fvs_modelos, public.fvs_vistorias, public.fvs_ncs, public.gemba_observacoes from anon;
revoke truncate on public.qualidade_pendencias, public.fvs_modelos, public.fvs_vistorias, public.fvs_ncs, public.gemba_observacoes from authenticated;
revoke delete on public.fvs_vistorias, public.fvs_ncs from authenticated;

-- Storage: quem lê a linha lê o arquivo; quem grava Qualidade sobe para <obra_id>/qualidade/.
create policy fotos_qualidade_ler on storage.objects for select to authenticated
  using (bucket_id = 'fotos' and (
    exists (select 1 from public.qualidade_pendencias p where storage.objects.name in (p.foto, p.foto_evidencia))
    or exists (select 1 from public.fvs_ncs n where n.fotos ? storage.objects.name)
    or exists (select 1 from public.gemba_observacoes g where g.foto = storage.objects.name)));
create policy fotos_qualidade_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[2] = 'qualidade'
    and private.meu_role() in ('Coordenador', 'Planejamento', 'Engenharia', 'Produção')
    and private.veo_obra(((storage.foldername(name))[1])::bigint));
