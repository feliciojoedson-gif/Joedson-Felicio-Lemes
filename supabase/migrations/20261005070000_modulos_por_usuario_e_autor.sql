-- 1) Módulos desligados por pessoa: o administrador (Coordenador) desliga módulos individualmente; o menu da pessoa só mostra os que sobram.
--    A coluna guarda os módulos DESLIGADOS (vazia = tudo que o perfil já permite). Só os módulos de menu valem ('perfil' nunca desliga).
--    Pelo navegador só o próprio nome muda em profiles (grant por coluna): a pessoa não religa um módulo sozinha.
alter table public.profiles
  add column modulos_desligados text[] not null default '{}'
  constraint profiles_modulos_validos check (
    modulos_desligados <@ array['painel', 'frentes', 'diario', 'medicoes', 'restricoes', 'materiais', 'planejamento', 'qualidade', 'relatorios', 'rdo', 'fotos']::text[]);

-- 2) Quem criou: created_by nas tabelas de lançamento que ainda não tinham (o banco carimba o usuário logado; não vem do navegador).
alter table public.frentes add column created_by uuid default auth.uid() references auth.users (id);
alter table public.medicoes add column created_by uuid default auth.uid() references auth.users (id);
alter table public.contratos_empreiteiro add column created_by uuid default auth.uid() references auth.users (id);
alter table public.itens_contrato add column created_by uuid default auth.uid() references auth.users (id);
alter table public.boletins_empreiteiro add column created_by uuid default auth.uid() references auth.users (id);
create index on public.frentes (created_by);
create index on public.medicoes (created_by);
create index on public.contratos_empreiteiro (created_by);
create index on public.itens_contrato (created_by);
create index on public.boletins_empreiteiro (created_by);
create trigger carimba_autor before insert on public.frentes for each row execute function private.carimba_autor();
create trigger carimba_autor before insert on public.medicoes for each row execute function private.carimba_autor();
create trigger carimba_autor before insert on public.contratos_empreiteiro for each row execute function private.carimba_autor();
create trigger carimba_autor before insert on public.itens_contrato for each row execute function private.carimba_autor();
create trigger carimba_autor before insert on public.boletins_empreiteiro for each row execute function private.carimba_autor();
