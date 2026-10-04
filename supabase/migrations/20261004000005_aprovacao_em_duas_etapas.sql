-- Medição: Medição cria e envia -> Gestão Contratual aprova -> Coordenador aprova (final). Nenhum passo é pulado.
-- Auditoria passa a cobrir o diário. Status de obra: lista de 04/10/2026 (última versão do dono).

alter table public.obras drop constraint obras_status_check;
alter table public.obras add constraint obras_status_check
  check (status in ('Planejamento', 'Ativa', 'Suspensa', 'Encerrada', 'Arquivada'));

alter table public.medicoes drop constraint medicoes_status_check;
alter table public.medicoes add constraint medicoes_status_check
  check (status in ('Rascunho', 'Enviada', 'Aprovada pela Gestão', 'Aprovada'));

drop policy medicoes_criar on public.medicoes;
drop policy medicoes_editar on public.medicoes;
drop policy medicoes_aprovar on public.medicoes;

-- Uma medição nasce Rascunho ou Enviada, nunca já aprovada.
create policy medicoes_criar on public.medicoes for insert to authenticated
  with check (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Medição')
              and status in ('Rascunho', 'Enviada'));
-- Coordenador e Medição preparam e enviam enquanto ela não foi aprovada por ninguém.
create policy medicoes_editar on public.medicoes for update to authenticated
  using (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Medição')
         and status in ('Rascunho', 'Enviada'))
  with check (private.veo_obra(obra_id) and private.meu_role() in ('Coordenador', 'Medição')
              and status in ('Rascunho', 'Enviada'));
-- 1ª aprovação: Gestão Contratual, de Enviada para Aprovada pela Gestão.
create policy medicoes_aprovar_gestao on public.medicoes for update to authenticated
  using (private.veo_obra(obra_id) and private.meu_role() = 'Gestão Contratual' and status = 'Enviada')
  with check (private.veo_obra(obra_id) and private.meu_role() = 'Gestão Contratual' and status = 'Aprovada pela Gestão');
-- 2ª aprovação (final): Coordenador, só depois da Gestão.
create policy medicoes_aprovar_coordenador on public.medicoes for update to authenticated
  using (private.veo_obra(obra_id) and private.meu_role() = 'Coordenador' and status = 'Aprovada pela Gestão')
  with check (private.veo_obra(obra_id) and private.meu_role() = 'Coordenador' and status = 'Aprovada');

-- Quem aprova só muda o status (e a observação): não mexe em valor, quantidade nem evidência.
create or replace function private.medicoes_protege() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and auth.uid() is not null and new.status is distinct from old.status
     and old.status in ('Enviada', 'Aprovada pela Gestão')
     and (to_jsonb(new) - 'status' - 'observacao') is distinct from (to_jsonb(old) - 'status' - 'observacao') then
    raise exception 'Quem aprova a medição altera só o status e a observação.';
  end if;
  return new;
end $$;

-- O diário também entra na auditoria.
create trigger auditar after insert or update or delete on public.apontamentos
  for each row execute function private.auditar();
