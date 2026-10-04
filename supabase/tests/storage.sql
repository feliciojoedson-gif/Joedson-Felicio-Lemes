-- Teste do Storage. Termina em erro de propósito (RELATORIO): nada fica gravado.
-- Apagar arquivo não dá para testar por SQL (o Storage só deixa apagar pela API); a policy arquivos_apagar vale só para o Coordenador.
do $t$
declare r text := ''; n int; v_o1 bigint; v_o2 bigint; v_f bigint; v_prod bigint;
  up uuid := gen_random_uuid(); uc uuid := gen_random_uuid(); um uuid := gen_random_uuid();
begin
  insert into auth.users (id,email) values (up,'p@t.local'),(uc,'c@t.local'),(um,'m@t.local');
  update public.profiles set role='Produção' where auth_uid=up;
  update public.profiles set role='Cliente' where auth_uid=uc;
  update public.profiles set role='Medição' where auth_uid=um;
  select id into v_prod from public.profiles where auth_uid=up;
  insert into public.obras (codigo,nome,cliente,data_inicio,data_fim_contratual,status) values ('S1','a','c','2026-01-01','2026-12-31','Execução') returning id into v_o1;
  insert into public.obras (codigo,nome,cliente,data_inicio,data_fim_contratual,status) values ('S2','b','c','2026-01-01','2026-12-31','Execução') returning id into v_o2;
  insert into public.obra_membros (obra_id, profile_id) select v_o1, id from public.profiles where auth_uid in (up,uc,um);
  insert into public.frentes (obra_id,nome,disciplina,inicio_planejado,fim_planejado) values (v_o1,'f','Civil','2026-09-01','2026-10-30') returning id into v_f;

  perform set_config('request.jwt.claims', json_build_object('sub', up, 'role','authenticated')::text, true);
  set local role authenticated;
  insert into storage.objects (bucket_id, name, owner_id) values ('fotos', v_o1||'/'||v_f||'/a.jpg', up::text);
  r := r || E'Produção enviou foto para a obra dela (ok)\n';
  begin insert into storage.objects (bucket_id, name, owner_id) values ('fotos', v_o2||'/1/a.jpg', up::text); r := r || E'FALHA: enviou para outra obra\n';
  exception when others then r := r || E'Produção enviar para outra obra: recusado (ok)\n'; end;
  begin insert into storage.objects (bucket_id, name, owner_id) values ('evidencias', v_o1||'/'||v_f||'/e.pdf', up::text); r := r || E'FALHA: Produção enviou evidência\n';
  exception when others then r := r || E'Produção enviar evidência: recusado (ok)\n'; end;
  reset role;

  insert into public.fotos (obra_id, frente_id, url, visivel_cliente, autor_id, tirada_em) values (v_o1, v_f, v_o1||'/'||v_f||'/a.jpg', false, v_prod, now());

  perform set_config('request.jwt.claims', json_build_object('sub', uc, 'role','authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from storage.objects where bucket_id='fotos'; r := r || format(E'Cliente abre %s arquivo com a foto não liberada (esperado 0)\n', n);
  reset role;
  update public.fotos set visivel_cliente = true;
  perform set_config('request.jwt.claims', json_build_object('sub', uc, 'role','authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from storage.objects where bucket_id='fotos'; r := r || format(E'Cliente abre %s arquivo com a foto liberada (esperado 1)\n', n);
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', um, 'role','authenticated')::text, true);
  set local role authenticated;
  insert into storage.objects (bucket_id, name, owner_id) values ('evidencias', v_o1||'/'||v_f||'/e.pdf', um::text);
  r := r || E'Medição enviou evidência (ok)\n';
  begin insert into storage.objects (bucket_id, name, owner_id) values ('fotos', v_o1||'/'||v_f||'/m.jpg', um::text); r := r || E'FALHA: Medição enviou foto\n';
  exception when others then r := r || E'Medição enviar foto: recusado (ok)\n'; end;
  reset role;
  raise exception E'RELATORIO\n%', r;
end $t$;
