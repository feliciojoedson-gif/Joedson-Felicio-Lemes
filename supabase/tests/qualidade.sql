-- Teste de RLS da Qualidade (pendências, FVS, Gemba). Termina em erro de propósito (RELATORIO): nada fica gravado.
do $t$
declare r text := ''; n int; v_o1 bigint; v_o2 bigint; v_p bigint; v_v uuid := gen_random_uuid(); v_v2 uuid := gen_random_uuid(); v_nc uuid := gen_random_uuid();
  ue uuid := gen_random_uuid(); up uuid := gen_random_uuid(); uc uuid := gen_random_uuid(); uco uuid := gen_random_uuid();
begin
  insert into auth.users (id,email) values (ue,'e@t.local'),(up,'p@t.local'),(uc,'c@t.local'),(uco,'co@t.local');
  update public.profiles set role='Engenharia' where auth_uid=ue;
  update public.profiles set role='Produção' where auth_uid=up;
  update public.profiles set role='Cliente' where auth_uid=uc;
  update public.profiles set role='Coordenador' where auth_uid=uco;
  insert into public.obras (codigo,nome,cliente,data_inicio,data_fim_contratual,status) values ('Q1','a','c','2026-01-01','2026-12-31','Ativa') returning id into v_o1;
  insert into public.obras (codigo,nome,cliente,data_inicio,data_fim_contratual,status) values ('Q2','b','c','2026-01-01','2026-12-31','Ativa') returning id into v_o2;
  insert into public.obra_membros (obra_id, profile_id) select v_o1, id from public.profiles where auth_uid in (ue,up,uc);
  insert into public.fvs_vistorias (id,obra_id,modelo_codigo,modelo_nome,versao,ambiente,grupos,criada_em) values (v_v2,v_o2,'X','x',1,'amb','[]','2026-10-05');

  perform set_config('request.jwt.claims', json_build_object('sub', ue, 'role','authenticated')::text, true);
  set local role authenticated;
  insert into public.qualidade_pendencias (obra_id, descricao) values (v_o1, 'a'), (v_o1, 'b');
  select count(*) into n from public.qualidade_pendencias where obra_id = v_o1 and numero_registro in (1,2);
  r := r || case when n = 2 then E'Engenharia criou 2 pendências e o banco numerou 1 e 2 (ok)\n' else E'FALHA: numeração\n' end;
  select id into v_p from public.qualidade_pendencias where obra_id = v_o1 limit 1;
  update public.qualidade_pendencias set status = 'em_andamento' where id = v_p;
  select count(*) into n from public.qualidade_pendencias where id = v_p and status = 'em_andamento';
  r := r || case when n = 1 then E'Engenharia editou pendência (ok)\n' else E'FALHA: não editou\n' end;
  begin insert into public.qualidade_pendencias (obra_id, descricao) values (v_o2, 'x'); r := r || E'FALHA: pendência em outra obra\n';
  exception when others then r := r || E'Pendência em outra obra: recusado (ok)\n'; end;
  delete from public.qualidade_pendencias where id = v_p;
  select count(*) into n from public.qualidade_pendencias where id = v_p;
  r := r || case when n = 1 then E'Engenharia apagar pendência: nada apagado (ok)\n' else E'FALHA: Engenharia apagou pendência\n' end;
  begin insert into public.gemba_observacoes (obra_id, local, descricao, desperdicios) values (v_o1, 'l', 'd', '["Inventado"]'); r := r || E'FALHA: desperdício inventado\n';
  exception when others then r := r || E'Desperdício fora dos 7 nomes: recusado (ok)\n'; end;
  insert into public.gemba_observacoes (obra_id, local, descricao, desperdicios) values (v_o1, 'l', 'd', '["Espera"]');
  r := r || E'Engenharia criou Gemba (ok)\n';
  insert into public.fvs_modelos (codigo, nome, categoria) values ('QX-1', 'm', 'Acabamento');
  r := r || E'Engenharia criou modelo de FVS (ok)\n';
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', up, 'role','authenticated')::text, true);
  set local role authenticated;
  insert into public.fvs_vistorias (id,obra_id,modelo_codigo,modelo_nome,versao,ambiente,grupos,criada_em) values (v_v,v_o1,'X','x',1,'amb','[]','2026-10-05');
  perform public.fvs_registrar_nc(json_build_object('id', v_nc, 'obra_id', v_o1, 'codigo', 'NC-001', 'vistoria_id', v_v, 'item_id', 1, 'item_numero', '1.1', 'titulo', 't', 'servico', 's', 'ambiente', 'a', 'severidade', 'Alta', 'status', 'aberta', 'aberta_em', '2026-10-05')::jsonb, v_v, '{"1":"nc"}'::jsonb);
  select count(*) into n from public.fvs_ncs where id = v_nc;
  r := r || case when n = 1 then E'Produção registrou NC pela função (ok)\n' else E'FALHA: NC não gravada\n' end;
  select count(*) into n from public.fvs_vistorias where id = v_v and respostas = '{"1":"nc"}'::jsonb;
  r := r || case when n = 1 then E'...e a resposta da vistoria foi junto (ok)\n' else E'FALHA: resposta não gravada\n' end;
  begin perform public.fvs_registrar_nc(json_build_object('id', gen_random_uuid(), 'obra_id', v_o2, 'codigo', 'NC-009', 'vistoria_id', v_v2, 'item_id', 1, 'item_numero', '1.1', 'titulo', 't', 'servico', 's', 'ambiente', 'a', 'severidade', 'Alta', 'status', 'aberta', 'aberta_em', '2026-10-05')::jsonb, v_v2, '{}'::jsonb);
    r := r || E'FALHA: NC em outra obra\n';
  exception when others then r := r || E'NC pela função em outra obra: recusado (ok)\n'; end;
  begin delete from public.fvs_ncs where id = v_nc; r := r || E'FALHA: apagou NC\n';
  exception when insufficient_privilege then r := r || E'Apagar NC: recusado pelo banco (ok)\n'; end;
  delete from public.fvs_modelos where codigo = 'QX-1';
  select count(*) into n from public.fvs_modelos where codigo = 'QX-1';
  r := r || case when n = 1 then E'Produção apagar modelo: nada apagado (ok)\n' else E'FALHA: Produção apagou modelo\n' end;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', uc, 'role','authenticated')::text, true);
  set local role authenticated;
  select (select count(*) from public.qualidade_pendencias) + (select count(*) from public.fvs_ncs) + (select count(*) from public.gemba_observacoes) + (select count(*) from public.fvs_modelos) into n;
  r := r || case when n = 0 then E'Cliente não vê nada de Qualidade (ok)\n' else E'FALHA: Cliente viu Qualidade\n' end;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', uco, 'role','authenticated')::text, true);
  set local role authenticated;
  delete from public.qualidade_pendencias where obra_id = v_o1;
  select count(*) into n from public.qualidade_pendencias where obra_id = v_o1;
  r := r || case when n = 0 then E'Coordenador apagou pendências (ok)\n' else E'FALHA: Coordenador não apagou\n' end;
  reset role;

  raise exception 'RELATORIO: %', r;
end $t$;
