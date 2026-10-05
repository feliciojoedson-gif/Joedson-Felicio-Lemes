-- Teste dos módulos por pessoa e do autor (created_by) nas tabelas de lançamento. Termina em erro de propósito (RELATORIO).
do $t$
declare r text := ''; n int; v_o bigint; v_f bigint; up uuid := gen_random_uuid(); upl uuid := gen_random_uuid(); pp bigint;
begin
  insert into auth.users (id,email) values (up,'p@t.local'),(upl,'pl@t.local');
  update public.profiles set role='Produção', modulos_desligados = array['materiais'] where auth_uid=up;
  update public.profiles set role='Planejamento' where auth_uid=upl;
  select id into pp from public.profiles where auth_uid=up;
  insert into public.obras (codigo,nome,cliente,data_inicio,data_fim_contratual,status) values ('MZ','a','c','2026-01-01','2026-12-31','Ativa') returning id into v_o;
  insert into public.obra_membros (obra_id, profile_id) select v_o, id from public.profiles where auth_uid in (up, upl);

  begin update public.profiles set modulos_desligados = '{inventado}' where auth_uid = up; r := r || E'FALHA: aceitou módulo inventado\n';
  exception when others then r := r || E'Módulo com nome inventado: recusado pelo banco (ok)\n'; end;

  perform set_config('request.jwt.claims', json_build_object('sub', up, 'role','authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.profiles where id = pp and modulos_desligados = array['materiais'];
  r := r || case when n = 1 then E'A pessoa lê quais módulos estão desligados para ela (ok)\n' else E'FALHA: não leu\n' end;
  begin update public.profiles set modulos_desligados = '{}' where id = pp; r := r || E'FALHA: a pessoa religou o módulo sozinha\n';
  exception when others then r := r || E'A pessoa religar o módulo sozinha: recusado (ok)\n'; end;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', upl, 'role','authenticated')::text, true);
  set local role authenticated;
  insert into public.frentes (obra_id, nome, disciplina, inicio_planejado, fim_planejado, fim_planejado_original, created_by)
    values (v_o, 'F', 'Civil', '2026-10-01', '2026-10-02', '2026-10-02', up) returning id into v_f;
  select count(*) into n from public.frentes where id = v_f and created_by = upl;
  r := r || case when n = 1 then E'Frente criada: o banco carimbou o usuário logado (mesmo com autor falso enviado) (ok)\n' else E'FALHA: autor da frente\n' end;
  reset role;
  raise exception 'RELATORIO: %', r;
end $t$;
