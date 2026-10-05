-- Materiais (catálogo global + pedidos por obra, Kanban) e Diário de Obra (RDO).
-- Pedidos e RDO têm obra_id e RLS por obra (private.veo_obra). O catálogo é da empresa toda (sem obra_id): todo mundo
-- que usa Materiais lê, só o Coordenador altera. Fotos (RDO e nota fiscal do recebimento) ficam no bucket privado
-- `fotos`, em <obra_id>/rdo/ e <obra_id>/materiais/; as tabelas guardam só o CAMINHO do arquivo.

create table public.materiais_catalogo (
  id bigint generated always as identity primary key,
  nome text not null check (length(trim(nome)) > 0),
  unidade text not null check (length(trim(unidade)) > 0),
  categoria text not null check (categoria in ('grosso', 'acabamento', 'instalacoes')),
  created_by uuid default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pedidos_material (
  id bigint generated always as identity primary key,
  obra_id bigint not null references public.obras (id),
  material_id bigint not null references public.materiais_catalogo (id),
  quantidade numeric(14, 3) not null check (quantidade > 0),
  frente text not null check (length(trim(frente)) > 0),
  prioridade text not null default 'normal' check (prioridade in ('normal', 'critico')),
  status text not null default 'solicitar' check (status in ('solicitar', 'cotacao', 'comprado', 'almoxarifado', 'entregue')),
  fornecedor text not null default '',
  previsao_entrega date,
  historico jsonb not null default '[]' check (jsonb_typeof(historico) = 'array'),
  recebimento jsonb not null default '{"qtdBateNF": null, "estadoOk": null, "avarias": "", "fotoNF": ""}' check (jsonb_typeof(recebimento) = 'object'),
  created_by uuid default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.pedidos_material (obra_id, status);

create table public.rdo_registros (
  id bigint generated always as identity primary key,
  obra_id bigint not null references public.obras (id),
  data date not null,
  clima text not null check (clima in ('sol', 'nublado', 'chuva')),
  efetivo int not null check (efetivo >= 0),
  atividades text not null check (length(trim(atividades)) > 0),
  ocorrencias text not null default '',
  fotos text[] not null default '{}',
  created_by uuid default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.rdo_registros (obra_id, data desc);

create trigger carimbar before update on public.materiais_catalogo for each row execute function private.carimbar_atualizacao();
create trigger carimbar before update on public.pedidos_material for each row execute function private.carimbar_atualizacao();
create trigger carimbar before update on public.rdo_registros for each row execute function private.carimbar_atualizacao();
create trigger imutaveis before update on public.pedidos_material for each row execute function private.planejamento_imutaveis();
create trigger imutaveis before update on public.rdo_registros for each row execute function private.planejamento_imutaveis();
create trigger auditar after insert or update or delete on public.pedidos_material for each row execute function private.auditar();
create trigger auditar after insert or update or delete on public.rdo_registros for each row execute function private.auditar();

alter table public.materiais_catalogo enable row level security;
alter table public.pedidos_material enable row level security;
alter table public.rdo_registros enable row level security;

create policy materiais_catalogo_ver on public.materiais_catalogo for select to authenticated
  using (private.meu_role() in ('Coordenador', 'Planejamento', 'Produção', 'Diretoria', 'Custos e Controle', 'Administrador'));
create policy materiais_catalogo_criar on public.materiais_catalogo for insert to authenticated
  with check (private.meu_role() = 'Coordenador');
create policy materiais_catalogo_editar on public.materiais_catalogo for update to authenticated
  using (private.meu_role() = 'Coordenador') with check (private.meu_role() = 'Coordenador');

create policy pedidos_material_ver on public.pedidos_material for select to authenticated
  using (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Planejamento', 'Produção', 'Diretoria', 'Custos e Controle', 'Administrador'));
create policy pedidos_material_criar on public.pedidos_material for insert to authenticated
  with check (private.veo_obra(obra_id) and status = 'solicitar' and private.meu_role() in ('Coordenador', 'Planejamento', 'Produção'));
create policy pedidos_material_editar on public.pedidos_material for update to authenticated
  using (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Planejamento', 'Produção'))
  with check (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Planejamento', 'Produção'));
create policy pedidos_material_apagar on public.pedidos_material for delete to authenticated
  using (private.veo_obra(obra_id) and private.meu_role() = 'Coordenador');

create policy rdo_registros_ver on public.rdo_registros for select to authenticated
  using (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Planejamento', 'Produção', 'Diretoria', 'Custos e Controle', 'Administrador'));
create policy rdo_registros_criar on public.rdo_registros for insert to authenticated
  with check (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Produção'));
create policy rdo_registros_editar on public.rdo_registros for update to authenticated
  using (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Produção'))
  with check (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Produção'));
create policy rdo_registros_apagar on public.rdo_registros for delete to authenticated
  using (private.veo_obra(obra_id) and private.meu_role() = 'Coordenador');

revoke all on public.materiais_catalogo, public.pedidos_material, public.rdo_registros from anon;
revoke truncate on public.materiais_catalogo, public.pedidos_material, public.rdo_registros from authenticated;
revoke delete on public.materiais_catalogo from authenticated;

-- Storage: quem lê a linha lê o arquivo. A nota fiscal também pode ser enviada pelo Planejamento (gerencia Materiais).
create policy fotos_rdo_ler on storage.objects for select to authenticated
  using (bucket_id = 'fotos' and exists (select 1 from public.rdo_registros r where storage.objects.name = any (r.fotos)));
create policy fotos_nf_ler on storage.objects for select to authenticated
  using (bucket_id = 'fotos' and exists (select 1 from public.pedidos_material p where p.recebimento ->> 'fotoNF' = storage.objects.name));
create policy fotos_nf_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[2] = 'materiais'
    and private.meu_role() in ('Coordenador', 'Planejamento', 'Produção')
    and private.veo_obra(((storage.foldername(name))[1])::bigint));
