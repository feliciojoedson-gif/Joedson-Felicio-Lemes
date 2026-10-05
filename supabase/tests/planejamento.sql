-- Teste de RLS do Planejamento. Termina em erro de propósito (RELATORIO): nada fica gravado.
do $t$
declare r text := ''; n int; v_o1 bigint; v_o2 bigint;
  up uuid := gen_random_uuid(); uc uuid := gen_random_uuid(); ue uuid := gen_random_uuid(); upl uuid := gen_random_uuid();
begin
  insert into auth.users (id,email) values (up,'p@t.local'),(uc,'c@t.local'),(ue,'e@t.local'),(upl,'pl@t.local');
  update public.profiles set role='Produção' where auth_uid=up;
  update public.profiles set role='Cliente' where auth_uid=uc;
  update public.profiles set role='Pendente' where auth_uid=ue;
  update public.profiles set role='Planejamento' where auth_uid=upl;
  insert into public.obras (codigo,nome,cliente,data_inicio,data_fim_contratual,status) values ('P1','a','c','2026-01-01','2026-12-31','Ativa') returning id into v_o1;
  insert into public.obras (codigo,nome,cliente,data_inicio,data_fim_contratual,status) values ('P2','b','c','2026-01-01','2026-12-31','Ativa') returning id into v_o2;
  insert into public.obra_membros (obra_id, profile_id) select v_o1, id from public.profiles where auth_uid in (up,uc,upl);
  insert into public.atividades_planejamento (obra_id,id,titulo,inicio,fim) values (v_o2,1,'da outra obra','2026-10-01','2026-10-02');

  -- Produção da obra 1: lê, cria e edita na própria obra; não vê a outra; não apaga
  perform set_config('request.jwt.claims', json_build_object('sub', up, 'role','authenticated')::text, true);
  set local role authenticated;
  insert into public.atividades_planejamento (obra_id,id,titulo,inicio,fim) values (v_o1,1,'minha','2026-10-01','2026-10-02');
  r := r || E'Produção criou atividade na própria obra (ok)\n';
  update public.atividades_planejamento set progresso = 50 where obra_id = v_o1 and id = 1;
  select count(*) into n from public.atividades_planejamento where progresso = 50 and obra_id = v_o1;
  r := r || case when n = 1 then E'Produção editou (ok)\n' else E'FALHA: não editou\n' end;
  select count(*) into n from public.atividades_planejamento where obra_id = v_o2;
  r := r || case when n = 0 then E'Produção não vê a outra obra (ok)\n' else E'FALHA: viu outra obra\n' end;
  begin insert into public.atividades_planejamento (obra_id,id,titulo,inicio,fim) values (v_o2,2,'x','2026-10-01','2026-10-02'); r := r || E'FALHA: gravou em outra obra\n';
  exception when others then r := r || E'Produção gravar em outra obra: recusado (ok)\n'; end;
  delete from public.atividades_planejamento where obra_id = v_o1 and id = 1;
  select count(*) into n from public.atividades_planejamento where obra_id = v_o1;
  r := r || case when n = 1 then E'Produção apagar: nada apagado (ok)\n' else E'FALHA: Produção apagou\n' end;
  begin update public.atividades_planejamento set obra_id = v_o2 where obra_id = v_o1 and id = 1; r := r || E'FALHA: mudou de obra\n';
  exception when others then r := r || E'Mudar de obra: recusado (ok)\n'; end;
  reset role;

  -- Cliente e Pendente: não leem nem gravam
  perform set_config('request.jwt.claims', json_build_object('sub', uc, 'role','authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.atividades_planejamento;
  r := r || case when n = 0 then E'Cliente não vê nada (ok)\n' else E'FALHA: Cliente viu\n' end;
  begin insert into public.atividades_planejamento (obra_id,id,titulo,inicio,fim) values (v_o1,9,'x','2026-10-01','2026-10-02'); r := r || E'FALHA: Cliente gravou\n';
  exception when others then r := r || E'Cliente gravar: recusado (ok)\n'; end;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', ue, 'role','authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.atividades_planejamento;
  r := r || case when n = 0 then E'Pendente não vê nada (ok)\n' else E'FALHA: Pendente viu\n' end;
  reset role;

  -- Planejamento da obra 1 apaga
  perform set_config('request.jwt.claims', json_build_object('sub', upl, 'role','authenticated')::text, true);
  set local role authenticated;
  delete from public.atividades_planejamento where obra_id = v_o1 and id = 1;
  select count(*) into n from public.atividades_planejamento where obra_id = v_o1;
  r := r || case when n = 0 then E'Planejamento apagou (ok)\n' else E'FALHA: Planejamento não apagou\n' end;
  reset role;

  raise exception 'RELATORIO: %', r;
end $t$;
