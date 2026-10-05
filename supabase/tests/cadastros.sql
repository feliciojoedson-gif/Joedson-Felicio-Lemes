-- Teste dos cadastros pela sessão de cada perfil: frentes, restrições, medições (fluxo de aprovação), obras e acesso de pessoas.
-- Inclui o teste que importa: um PENDENTE tentando se aprovar sozinho. Termina em erro de propósito (RELATORIO).
do $t$
declare r text := ''; n int; v_o1 bigint; v_f bigint; v_m bigint; v_pend bigint; v_prod bigint;
  uco uuid := gen_random_uuid(); upl uuid := gen_random_uuid(); upd uuid := gen_random_uuid(); ume uuid := gen_random_uuid(); ug uuid := gen_random_uuid(); upr uuid := gen_random_uuid();
begin
  insert into auth.users (id,email) values (uco,'co@t.local'),(upl,'pl@t.local'),(upd,'pd@t.local'),(ume,'me@t.local'),(ug,'g@t.local'),(upr,'pr@t.local');
  update public.profiles set role='Coordenador' where auth_uid=uco;
  update public.profiles set role='Planejamento' where auth_uid=upl;
  update public.profiles set role='Medição' where auth_uid=ume;
  update public.profiles set role='Gestão Contratual' where auth_uid=ug;
  update public.profiles set role='Produção' where auth_uid=upr;
  select id into v_pend from public.profiles where auth_uid=upd;
  select id into v_prod from public.profiles where auth_uid=upr;
  insert into public.obras (codigo,nome,cliente,data_inicio,data_fim_contratual,status) values ('C1','a','c','2026-01-01','2026-12-31','Ativa') returning id into v_o1;
  insert into public.obra_membros (obra_id, profile_id) select v_o1, id from public.profiles where auth_uid in (upl,ume,ug,upr,upd);

  -- PENDENTE: não vira ninguém sozinho
  perform set_config('request.jwt.claims', json_build_object('sub', upd, 'role','authenticated')::text, true);
  set local role authenticated;
  begin update public.profiles set role = 'Coordenador' where id = v_pend; r := r || E'FALHA: Pendente virou Coordenador\n';
  exception when others then r := r || E'Pendente tentando virar Coordenador: recusado pelo banco (ok)\n'; end;
  begin update public.profiles set ativo = true, role = 'Produção' where id = v_pend; r := r || E'FALHA: Pendente se aprovou\n';
  exception when others then r := r || E'Pendente tentando se aprovar como Produção: recusado pelo banco (ok)\n'; end;
  update public.profiles set nome = 'Novo nome' where id = v_pend;
  select count(*) into n from public.profiles where id = v_pend and nome = 'Novo nome';
  r := r || case when n = 1 then E'Pendente muda só o próprio nome (ok)\n' else E'FALHA: não mudou o nome\n' end;
  select count(*) into n from public.frentes;
  r := r || case when n = 0 then E'Pendente não lê frentes (ok)\n' else E'FALHA: Pendente leu frentes\n' end;
  reset role;

  -- PRODUÇÃO: também não muda o próprio perfil
  perform set_config('request.jwt.claims', json_build_object('sub', upr, 'role','authenticated')::text, true);
  set local role authenticated;
  begin update public.profiles set role = 'Coordenador' where id = v_prod; r := r || E'FALHA: Produção virou Coordenador\n';
  exception when others then r := r || E'Produção tentando virar Coordenador: recusado (ok)\n'; end;
  begin insert into public.obra_membros (obra_id, profile_id) values (v_o1, v_prod); r := r || E'FALHA: Produção se ligou a obra\n';
  exception when others then r := r || E'Produção se ligando a uma obra sozinha: recusado (ok)\n'; end;
  begin insert into public.obras (codigo,nome,cliente,data_inicio,data_fim_contratual) values ('X9','x','c','2026-01-01','2026-02-01'); r := r || E'FALHA: Produção criou obra\n';
  exception when others then r := r || E'Produção criar obra: recusado (ok)\n'; end;
  reset role;

  -- COORDENADOR libera a conta e cria obra
  perform set_config('request.jwt.claims', json_build_object('sub', uco, 'role','authenticated')::text, true);
  set local role authenticated;
  update public.profiles set role = 'Engenharia' where id = v_pend;
  select count(*) into n from public.profiles where id = v_pend and role = 'Engenharia';
  r := r || case when n = 1 then E'Coordenador liberou a conta como Engenharia (ok)\n' else E'FALHA: Coordenador não liberou\n' end;
  insert into public.obras (codigo,nome,cliente,data_inicio,data_fim_contratual,status) values ('C2','b','c','2026-01-01','2026-12-31','Planejamento');
  r := r || E'Coordenador criou obra (ok)\n';
  reset role;

  -- PLANEJAMENTO cria frente (o banco zera os campos calculados) e não apaga
  perform set_config('request.jwt.claims', json_build_object('sub', upl, 'role','authenticated')::text, true);
  set local role authenticated;
  insert into public.frentes (obra_id, nome, disciplina, inicio_planejado, fim_planejado, fim_planejado_original, percentual_realizado, status, saude)
    values (v_o1, 'F1', 'Civil', '2026-10-01', '2026-10-10', '2026-10-10', 90, 'Concluída', 'Vermelho') returning id into v_f;
  select count(*) into n from public.frentes where id = v_f and percentual_realizado = 0 and status = 'Não iniciada' and saude = 'Verde';
  r := r || case when n = 1 then E'Planejamento criou frente e o banco zerou avanço/status/saúde (ok)\n' else E'FALHA: frente nasceu com avanço inventado\n' end;
  begin update public.frentes set percentual_realizado = 50 where id = v_f; r := r || E'FALHA: mudou avanço pela tela\n';
  exception when others then r := r || E'Mudar avanço direto na frente: recusado (ok)\n'; end;
  delete from public.frentes where id = v_f;
  select count(*) into n from public.frentes where id = v_f;
  r := r || case when n = 1 then E'Planejamento apagar frente: nada apagado (ok)\n' else E'FALHA: Planejamento apagou frente\n' end;
  insert into public.restricoes (obra_id, frente_id, tipo, titulo, criticidade, autor_id) values (v_o1, v_f, 'RFI', 'dúvida', 'Alta', (select id from public.profiles where auth_uid = upl));
  r := r || E'Planejamento criou RFI (ok)\n';
  begin insert into public.restricoes (obra_id, tipo, titulo, criticidade, autor_id) values (v_o1, 'Risco', 'risco', 'Alta', (select id from public.profiles where auth_uid = upl)); r := r || E'FALHA: Planejamento criou Risco\n';
  exception when others then r := r || E'Planejamento criar Risco: recusado (ok)\n'; end;
  reset role;

  -- MEDIÇÃO: Medição envia, Gestão aprova, Coordenador finaliza; ninguém pula etapa
  perform set_config('request.jwt.claims', json_build_object('sub', ume, 'role','authenticated')::text, true);
  set local role authenticated;
  insert into public.medicoes (obra_id, frente_id, mes_referencia, quantidade, unidade, percentual_medido, valor_medido, status)
    values (v_o1, v_f, '2026-10-01', 10, 'm2', 50, 1000, 'Rascunho') returning id into v_m;
  begin insert into public.medicoes (obra_id, frente_id, mes_referencia, quantidade, unidade, percentual_medido, valor_medido, status) values (v_o1, v_f, '2026-11-01', 1, 'm2', 1, 1, 'Aprovada'); r := r || E'FALHA: nasceu aprovada\n';
  exception when others then r := r || E'Medição já nascer Aprovada: recusado (ok)\n'; end;
  begin insert into public.medicoes (obra_id, frente_id, mes_referencia, quantidade, unidade, percentual_medido, valor_medido) values (v_o1, v_f, '2026-10-01', 1, 'm2', 1, 1); r := r || E'FALHA: duas medições no mesmo mês\n';
  exception when others then r := r || E'Duas medições da frente no mesmo mês: recusado (ok)\n'; end;
  update public.medicoes set status = 'Enviada' where id = v_m;
  r := r || E'Medição enviou o rascunho (ok)\n';
  begin update public.medicoes set status = 'Aprovada pela Gestão' where id = v_m; r := r || E'FALHA: Medição aprovou sozinha\n';
  exception when others then r := r || E'Medição aprovar a própria medição: recusado (ok)\n'; end;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', uco, 'role','authenticated')::text, true);
  set local role authenticated;
  begin update public.medicoes set status = 'Aprovada' where id = v_m; r := r || E'FALHA: Coordenador pulou a Gestão\n';
  exception when others then r := r || E'Coordenador aprovar antes da Gestão: recusado (ok)\n'; end;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', ug, 'role','authenticated')::text, true);
  set local role authenticated;
  update public.medicoes set status = 'Aprovada pela Gestão' where id = v_m;
  r := r || E'Gestão Contratual aprovou (1ª etapa) (ok)\n';
  begin update public.medicoes set valor_medido = 999999 where id = v_m; exception when others then null; end;
  select count(*) into n from public.medicoes where id = v_m and valor_medido = 1000;
  r := r || case when n = 1 then E'Gestão mexer no valor: valor continua o mesmo (ok)\n' else E'FALHA: Gestão mudou valor\n' end;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', uco, 'role','authenticated')::text, true);
  set local role authenticated;
  update public.medicoes set status = 'Aprovada' where id = v_m;
  select count(*) into n from public.medicoes where id = v_m and status = 'Aprovada';
  r := r || case when n = 1 then E'Coordenador deu a aprovação final (ok)\n' else E'FALHA: aprovação final\n' end;
  reset role;

  raise exception 'RELATORIO: %', r;
end $t$;
