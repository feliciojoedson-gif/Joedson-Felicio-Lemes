-- Teste de RLS de Materiais e Diário de Obra. Termina em erro de propósito (RELATORIO): nada fica gravado.
do $t$
declare r text := ''; n int; v_o1 bigint; v_o2 bigint; v_m bigint; v_p bigint;
  up uuid := gen_random_uuid(); uc uuid := gen_random_uuid(); upl uuid := gen_random_uuid(); uco uuid := gen_random_uuid();
begin
  insert into auth.users (id,email) values (up,'p@t.local'),(uc,'c@t.local'),(upl,'pl@t.local'),(uco,'co@t.local');
  update public.profiles set role='Produção' where auth_uid=up;
  update public.profiles set role='Cliente' where auth_uid=uc;
  update public.profiles set role='Planejamento' where auth_uid=upl;
  update public.profiles set role='Coordenador' where auth_uid=uco;
  insert into public.obras (codigo,nome,cliente,data_inicio,data_fim_contratual,status) values ('M1','a','c','2026-01-01','2026-12-31','Ativa') returning id into v_o1;
  insert into public.obras (codigo,nome,cliente,data_inicio,data_fim_contratual,status) values ('M2','b','c','2026-01-01','2026-12-31','Ativa') returning id into v_o2;
  insert into public.obra_membros (obra_id, profile_id) select v_o1, id from public.profiles where auth_uid in (up,uc,upl);
  select id into v_m from public.materiais_catalogo limit 1;
  insert into public.pedidos_material (obra_id, material_id, quantidade, frente) values (v_o2, v_m, 1, 'outra obra');

  perform set_config('request.jwt.claims', json_build_object('sub', up, 'role','authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.materiais_catalogo;
  r := r || case when n > 0 then E'Produção lê o catálogo (ok)\n' else E'FALHA: catálogo vazio\n' end;
  begin insert into public.materiais_catalogo (nome, unidade, categoria) values ('x','un','grosso'); r := r || E'FALHA: Produção criou item de catálogo\n';
  exception when others then r := r || E'Produção criar item de catálogo: recusado (ok)\n'; end;
  insert into public.pedidos_material (obra_id, material_id, quantidade, frente) values (v_o1, v_m, 5, 'minha frente') returning id into v_p;
  update public.pedidos_material set status = 'cotacao' where id = v_p;
  select count(*) into n from public.pedidos_material where id = v_p and status = 'cotacao';
  r := r || case when n = 1 then E'Produção criou e moveu pedido na própria obra (ok)\n' else E'FALHA: não moveu\n' end;
  select count(*) into n from public.pedidos_material where obra_id = v_o2;
  r := r || case when n = 0 then E'Produção não vê pedidos da outra obra (ok)\n' else E'FALHA: viu outra obra\n' end;
  begin insert into public.pedidos_material (obra_id, material_id, quantidade, frente) values (v_o2, v_m, 1, 'x'); r := r || E'FALHA: pediu na outra obra\n';
  exception when others then r := r || E'Pedir em outra obra: recusado (ok)\n'; end;
  begin insert into public.pedidos_material (obra_id, material_id, quantidade, frente, status) values (v_o1, v_m, 1, 'x', 'entregue'); r := r || E'FALHA: criou já entregue\n';
  exception when others then r := r || E'Criar pedido já entregue: recusado (ok)\n'; end;
  delete from public.pedidos_material where id = v_p;
  select count(*) into n from public.pedidos_material where id = v_p;
  r := r || case when n = 1 then E'Produção apagar pedido: nada apagado (ok)\n' else E'FALHA: Produção apagou pedido\n' end;
  insert into public.rdo_registros (obra_id, data, clima, efetivo, atividades) values (v_o1, '2026-10-05', 'sol', 3, 'teste');
  r := r || E'Produção criou RDO (ok)\n';
  begin insert into public.rdo_registros (obra_id, data, clima, efetivo, atividades) values (v_o2, '2026-10-05', 'sol', 3, 'x'); r := r || E'FALHA: RDO em outra obra\n';
  exception when others then r := r || E'RDO em outra obra: recusado (ok)\n'; end;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', upl, 'role','authenticated')::text, true);
  set local role authenticated;
  insert into public.pedidos_material (obra_id, material_id, quantidade, frente) values (v_o1, v_m, 2, 'planej');
  r := r || E'Planejamento criou pedido (ok)\n';
  begin insert into public.rdo_registros (obra_id, data, clima, efetivo, atividades) values (v_o1, '2026-10-05', 'sol', 3, 'x'); r := r || E'FALHA: Planejamento criou RDO\n';
  exception when others then r := r || E'Planejamento criar RDO: recusado (ok)\n'; end;
  select count(*) into n from public.rdo_registros where obra_id = v_o1;
  r := r || case when n = 1 then E'Planejamento lê o RDO (ok)\n' else E'FALHA: Planejamento não leu RDO\n' end;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', uc, 'role','authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.pedidos_material;
  r := r || case when n = 0 then E'Cliente não vê pedidos (ok)\n' else E'FALHA: Cliente viu pedidos\n' end;
  select count(*) into n from public.rdo_registros;
  r := r || case when n = 0 then E'Cliente não vê RDO (ok)\n' else E'FALHA: Cliente viu RDO\n' end;
  select count(*) into n from public.materiais_catalogo;
  r := r || case when n = 0 then E'Cliente não vê catálogo (ok)\n' else E'FALHA: Cliente viu catálogo\n' end;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', uco, 'role','authenticated')::text, true);
  set local role authenticated;
  delete from public.pedidos_material where obra_id = v_o1 and frente = 'planej';
  select count(*) into n from public.pedidos_material where obra_id = v_o1 and frente = 'planej';
  r := r || case when n = 0 then E'Coordenador apagou pedido (ok)\n' else E'FALHA: Coordenador não apagou\n' end;
  reset role;

  raise exception 'RELATORIO: %', r;
end $t$;
