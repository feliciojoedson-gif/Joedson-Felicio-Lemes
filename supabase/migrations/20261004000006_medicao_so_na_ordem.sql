-- Corrige: as policies de UPDATE se somam (OR), então o Coordenador conseguia ir de Enviada direto para Aprovada.
-- O gatilho passa a ser a regra de verdade: o status só anda na ordem
-- Rascunho -> Enviada (Medição ou Coordenador) -> Aprovada pela Gestão (Gestão Contratual) -> Aprovada (Coordenador).
create or replace function private.medicoes_protege() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_role text := private.meu_role();
begin
  if tg_op = 'UPDATE' and auth.uid() is not null and new.status is distinct from old.status then
    if not (
         (old.status = 'Rascunho' and new.status = 'Enviada' and v_role in ('Coordenador', 'Medição'))
      or (old.status = 'Enviada' and new.status = 'Aprovada pela Gestão' and v_role = 'Gestão Contratual')
      or (old.status = 'Aprovada pela Gestão' and new.status = 'Aprovada' and v_role = 'Coordenador')
    ) then
      raise exception 'A medição não pode ir de % para % por este perfil.', old.status, new.status;
    end if;
    -- Quem aprova só muda o status e a observação.
    if old.status in ('Enviada', 'Aprovada pela Gestão')
       and (to_jsonb(new) - 'status' - 'observacao') is distinct from (to_jsonb(old) - 'status' - 'observacao') then
      raise exception 'Quem aprova a medição altera só o status e a observação.';
    end if;
  end if;
  return new;
end $$;
