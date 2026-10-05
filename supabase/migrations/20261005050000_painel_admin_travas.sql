-- Travas do painel de admin, no BANCO (a Edge Function conta antes, mas só o banco fecha a corrida entre dois pedidos ao mesmo tempo).

-- 1) O app nunca fica sem Coordenador ativo: nenhuma mudança (bloquear, rebaixar, excluir) deixa zero. Um lock serializa os pedidos:
--    o segundo espera o primeiro terminar e então conta de novo.
create function private.ultimo_coordenador() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_sai boolean;
begin
  v_sai := old.role = 'Coordenador' and old.ativo
           and (tg_op = 'DELETE' or new.role is distinct from 'Coordenador' or not new.ativo);
  if v_sai then
    perform pg_advisory_xact_lock(hashtext('ultimo_coordenador'));
    if not exists (select 1 from public.profiles where role = 'Coordenador' and ativo and id <> old.id) then
      raise exception 'Este é o último administrador ativo. Cadastre outro antes de mudar, bloquear ou excluir esta conta.';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
create trigger ultimo_coordenador before update or delete on public.profiles
  for each row execute function private.ultimo_coordenador();

-- 2) Pelo navegador (API com a sessão da pessoa) só o próprio NOME muda no perfil, e ninguém mexe direto em obra_membros:
--    papel, situação e obras liberadas só mudam pela função admin-usuarios, que também confere o ban no Auth e o último admin.
revoke update on public.profiles from authenticated;
grant update (nome) on public.profiles to authenticated;
revoke insert, update, delete on public.obra_membros from authenticated;
