-- Testes dos ajustes da revisão de código. Termina em erro de propósito (RELATORIO): nada fica gravado.
do $t$
declare r text := ''; n int; v_o1 bigint; v_o2 bigint; v_co bigint; v_g uuid := gen_random_uuid(); v_u uuid := gen_random_uuid();
  uco uuid := gen_random_uuid(); udi uuid := gen_random_uuid(); upr uuid := gen_random_uuid(); upl uuid := gen_random_uuid();
begin
  insert into auth.users (id,email) values (uco,'co@t.local'),(udi,'di@t.local'),(upr,'pr@t.local'),(upl,'pl@t.local');
  update public.profiles set role='Coordenador' where auth_uid=uco;
  update public.profiles set role='Diretoria' where auth_uid=udi;
  update public.profiles set role='Produção' where auth_uid=upr;
  update public.profiles set role='Planejamento' where auth_uid=upl;
  select id into v_co from public.profiles where auth_uid=uco;
  insert into public.obras (codigo,nome,cliente,data_inicio,data_fim_contratual,status) values ('R1','a','c','2026-01-01','2026-12-31','Ativa') returning id into v_o1;
  insert into public.obras (codigo,nome,cliente,data_inicio,data_fim_contratual,status) values ('R2','b','c','2026-01-01','2026-12-31','Ativa') returning id into v_o2;
  insert into public.obra_membros (obra_id, profile_id) select v_o1, id from public.profiles where auth_uid in (upr,upl);
  insert into public.atividades_planejamento (obra_id,id,titulo,inicio,fim) values (v_o1,1,'a','2026-10-01','2026-10-02');
  insert into storage.objects (bucket_id, name, owner_id) values ('fotos', v_o2 || '/qualidade/' || v_u || '.jpg', uco::text);

  -- Coordenador não muda o próprio perfil nem se bloqueia
  perform set_config('request.jwt.claims', json_build_object('sub', uco, 'role','authenticated')::text, true);
  set local role authenticated;
  begin update public.profiles set ativo = false where id = v_co; r := r || E'FALHA: Coordenador se bloqueou\n';
  exception when others then r := r || E'Coordenador bloquear a própria conta: recusado (ok)\n'; end;
  begin update public.profiles set role = 'Diretoria' where id = v_co; r := r || E'FALHA: Coordenador rebaixou a si mesmo\n';
  exception when others then r := r || E'Coordenador mudar o próprio perfil: recusado (ok)\n'; end;
  update public.profiles set role = 'Planejamento' where auth_uid = upr;
  r := r || E'Coordenador muda o perfil de OUTRA pessoa (ok)\n';
  update public.profiles set role = 'Produção' where auth_uid = upr;
  reset role;

  -- Diretoria lê o Planejamento mas não grava
  perform set_config('request.jwt.claims', json_build_object('sub', udi, 'role','authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.atividades_planejamento where obra_id = v_o1;
  r := r || case when n = 1 then E'Diretoria lê o Planejamento (ok)\n' else E'FALHA: Diretoria não lê\n' end;
  begin insert into public.atividades_planejamento (obra_id,id,titulo,inicio,fim) values (v_o1,2,'x','2026-10-01','2026-10-02'); r := r || E'FALHA: Diretoria gravou\n';
  exception when others then r := r || E'Diretoria gravar Planejamento: recusado (ok)\n'; end;
  reset role;

  -- Produção: não reescreve a linha de base; created_by não se falsifica
  perform set_config('request.jwt.claims', json_build_object('sub', upr, 'role','authenticated')::text, true);
  set local role authenticated;
  begin insert into public.planejamento_config (obra_id, calendario) values (v_o1, '{}'::jsonb); r := r || E'FALHA: Produção gravou config\n';
  exception when others then r := r || E'Produção reescrever linha de base/calendário: recusado (ok)\n'; end;
  insert into public.rdo_registros (obra_id, data, clima, efetivo, atividades, created_by) values (v_o1, '2026-10-05', 'sol', 1, 'x', uco);
  select count(*) into n from public.rdo_registros where obra_id = v_o1 and created_by = upr;
  r := r || case when n = 1 then E'created_by enviado como outra pessoa foi trocado pelo usuário logado (ok)\n' else E'FALHA: autor falsificado\n' end;
  -- foto de OUTRA obra apontada por uma linha da própria obra: o arquivo não abre
  insert into public.gemba_observacoes (obra_id, local, descricao, foto) values (v_o1, 'l', 'd', v_o2 || '/qualidade/' || v_u || '.jpg');
  select count(*) into n from storage.objects where bucket_id = 'fotos' and name = v_o2 || '/qualidade/' || v_u || '.jpg';
  r := r || case when n = 0 then E'Foto de outra obra apontada por linha da minha obra: não abre (ok)\n' else E'FALHA: leu arquivo de outra obra\n' end;
  reset role;

  raise exception 'RELATORIO: %', r;
end $t$;
