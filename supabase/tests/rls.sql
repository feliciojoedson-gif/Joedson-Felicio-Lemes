-- Teste da RLS: cria usuários de mentira, finge ser cada um e confere o que pode e o que não pode.
-- Tudo roda numa transação que termina em erro de propósito: nada fica gravado no banco.
-- Rodar: colar no SQL do Supabase (ou execute_sql). O resultado vem na mensagem "RELATORIO".
do $teste$
declare
  r text := '';
  n int;
  u record;
  v_obra1 bigint; v_obra2 bigint; v_fA bigint; v_fB bigint;
  v_coord bigint; v_prod bigint; v_cli bigint; v_plan bigint; v_med bigint; v_ges bigint; v_eng bigint; v_adm bigint; v_dir bigint;
  uid_ uuid;
  perfis text[] := array['coord','prod','cli','plan','med','ges','eng','adm','dir','novo'];
  papeis text[] := array['Coordenador','Produção','Cliente','Planejamento','Medição','Gestão Contratual','Engenharia','Administrador','Diretoria','Pendente'];
  i int;
  uids uuid[] := '{}';

begin
  -- usuários e perfis
  for i in 1..array_length(perfis, 1) loop
    uid_ := gen_random_uuid();
    uids := uids || uid_;
    insert into auth.users (id, email) values (uid_, perfis[i] || '@teste.local');
    update public.profiles set role = papeis[i] where auth_uid = uid_;
  end loop;
  select id into v_coord from public.profiles where email = 'coord@teste.local';
  select id into v_prod  from public.profiles where email = 'prod@teste.local';
  select id into v_cli   from public.profiles where email = 'cli@teste.local';
  select id into v_plan  from public.profiles where email = 'plan@teste.local';
  select id into v_med   from public.profiles where email = 'med@teste.local';
  select id into v_ges   from public.profiles where email = 'ges@teste.local';
  select id into v_eng   from public.profiles where email = 'eng@teste.local';
  select id into v_adm   from public.profiles where email = 'adm@teste.local';
  select id into v_dir   from public.profiles where email = 'dir@teste.local';

  -- dados (como dono do banco)
  insert into public.obras (codigo, nome, cliente, data_inicio, data_fim_contratual, status)
    values ('T1', 'Obra 1', 'C', '2026-01-01', '2026-12-31', 'Ativa') returning id into v_obra1;
  insert into public.obras (codigo, nome, cliente, data_inicio, data_fim_contratual, status)
    values ('T2', 'Obra 2', 'C', '2026-01-01', '2026-12-31', 'Ativa') returning id into v_obra2;
  insert into public.obra_membros (obra_id, profile_id)
    select v_obra1, id from public.profiles where email in ('prod@teste.local','cli@teste.local','plan@teste.local','med@teste.local','ges@teste.local','eng@teste.local');
  insert into public.frentes (obra_id, nome, disciplina, inicio_planejado, fim_planejado)
    values (v_obra1, 'A', 'Civil', '2026-09-01', '2026-10-30') returning id into v_fA;
  insert into public.frentes (obra_id, nome, disciplina, inicio_planejado, fim_planejado)
    values (v_obra2, 'B', 'Civil', '2026-09-01', '2026-10-30') returning id into v_fB;
  insert into public.medicoes (obra_id, frente_id, mes_referencia, quantidade, unidade, percentual_medido, valor_medido, status)
    values (v_obra1, v_fA, '2026-08-01', 1, 'm', 10, 1000, 'Enviada'),
           (v_obra1, v_fA, '2026-09-01', 1, 'm', 10, 2000, 'Aprovada');
  insert into public.fotos (obra_id, frente_id, url, visivel_cliente, autor_id, tirada_em)
    values (v_obra1, v_fA, 'a', true, v_prod, now()), (v_obra1, v_fA, 'b', false, v_prod, now());
  insert into public.restricoes (obra_id, frente_id, tipo, titulo, criticidade, autor_id)
    values (v_obra1, v_fA, 'Restrição', 'r', 'Alta', v_coord), (v_obra1, v_fA, 'Risco', 'k', 'Alta', v_coord);

  -- 1. Pendente não vê nada
  perform set_config('request.jwt.claims', json_build_object('sub', uids[10], 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.frentes; r := r || format(E'Pendente vê %s frentes (esperado 0)\n', n);
  select count(*) into n from public.obras;   r := r || format(E'Pendente vê %s obras (esperado 0)\n', n);
  begin update public.profiles set role = 'Coordenador' where email = 'novo@teste.local'; r := r || E'Pendente promoveu a si mesmo? (esperado 0 linhas)\n'; get diagnostics n = row_count; r := r || format('   linhas: %s\n', n);
  exception when others then r := r || format(E'Pendente tentou virar Coordenador: bloqueado (%s)\n', sqlerrm); end;
  reset role;

  -- 2. Produção: só a obra dele, diário, sem medição, sem apagar
  perform set_config('request.jwt.claims', json_build_object('sub', uids[2], 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.frentes; r := r || format(E'Produção vê %s frentes (esperado 1: só a obra 1)\n', n);
  select count(*) into n from public.frentes where obra_id = v_obra2; r := r || format(E'Produção vê %s frentes da obra 2 (esperado 0)\n', n);
  select count(*) into n from public.medicoes; r := r || format(E'Produção vê %s medições (esperado 0)\n', n);
  select count(*) into n from public.restricoes; r := r || format(E'Produção vê %s restrições (esperado 1: o Risco fica escondido)\n', n);
  insert into public.apontamentos (obra_id, frente_id, data, autor_id, percentual_acumulado, efetivo_qtd)
    values (v_obra1, v_fA, current_date, v_prod, 40, 5);
  select count(*) into n from public.apontamentos; r := r || format(E'Produção lançou diário e vê %s lançamento (esperado 1)\n', n);
  begin insert into public.apontamentos (obra_id, frente_id, data, autor_id, percentual_acumulado, efetivo_qtd)
    values (v_obra1, v_fA, current_date - 1, v_prod, 40, 5); r := r || E'FALHA: lançamento sem avanço e sem motivo foi aceito\n';
  exception when others then r := r || E'Lançamento sem avanço e sem motivo: recusado (ok)\n'; end;
  begin insert into public.apontamentos (obra_id, frente_id, data, autor_id, percentual_acumulado, efetivo_qtd)
    values (v_obra2, v_fB, current_date, v_prod, 10, 5); r := r || E'FALHA: Produção lançou em obra que não é dela\n';
  exception when others then r := r || E'Produção lançar em outra obra: recusado (ok)\n'; end;
  delete from public.apontamentos; get diagnostics n = row_count; r := r || format(E'Produção apagou %s lançamentos (esperado 0)\n', n);
  begin update public.frentes set percentual_realizado = 99 where id = v_fA; get diagnostics n = row_count; r := r || format(E'Produção editou frente: %s linhas (esperado 0)\n', n);
  exception when others then r := r || E'Produção editar frente: bloqueado (ok)\n'; end;
  reset role;
  select percentual_realizado, status into u from public.frentes where id = v_fA;
  r := r || format(E'Frente A depois do diário: %s%%, %s (esperado 40, Em andamento)\n', u.percentual_realizado, u.status);

  -- 3. Cliente
  perform set_config('request.jwt.claims', json_build_object('sub', uids[3], 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.frentes; r := r || format(E'Cliente lê %s frentes direto (esperado 0)\n', n);
  select count(*) into n from public.frentes_cliente; r := r || format(E'Cliente lê %s frentes pela view (esperado 1)\n', n);
  select count(*) into n from public.medicoes; r := r || format(E'Cliente lê %s medições direto (esperado 0)\n', n);
  select count(*) into n from public.medicoes_cliente; r := r || format(E'Cliente lê %s medições pela view (esperado 1: só a aprovada)\n', n);
  select count(*) into n from public.fotos; r := r || format(E'Cliente vê %s fotos (esperado 1: só a liberada)\n', n);
  select count(*) into n from public.restricoes; r := r || format(E'Cliente vê %s restrições (esperado 0)\n', n);
  select count(*) into n from public.apontamentos; r := r || format(E'Cliente vê %s lançamentos (esperado 0)\n', n);
  reset role;

  -- 4. Planejamento: vê valor de medição, não cria; edita frente
  perform set_config('request.jwt.claims', json_build_object('sub', uids[4], 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.medicoes; r := r || format(E'Planejamento vê %s medições (esperado 2)\n', n);
  begin insert into public.medicoes (obra_id, frente_id, mes_referencia, quantidade, unidade, percentual_medido, valor_medido)
    values (v_obra1, v_fA, '2026-10-01', 1, 'm', 1, 1); r := r || E'FALHA: Planejamento criou medição\n';
  exception when others then r := r || E'Planejamento criar medição: recusado (ok)\n'; end;
  update public.frentes set peso = 2 where id = v_fA; get diagnostics n = row_count; r := r || format(E'Planejamento editou peso da frente: %s linha (esperado 1)\n', n);
  begin update public.frentes set status = 'Parada' where id = v_fA; r := r || E'FALHA: Planejamento mudou o status à mão\n';
  exception when others then r := r || E'Planejamento mudar status à mão: bloqueado (ok)\n'; end;
  reset role;

  -- 5. Medição: cria e envia, não aprova
  perform set_config('request.jwt.claims', json_build_object('sub', uids[5], 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.medicoes (obra_id, frente_id, mes_referencia, quantidade, unidade, percentual_medido, valor_medido, status)
    values (v_obra1, v_fA, '2026-10-01', 1, 'm', 1, 1, 'Enviada');
  r := r || E'Medição criou e enviou uma medição (ok)\n';
  begin insert into public.medicoes (obra_id, frente_id, mes_referencia, quantidade, unidade, percentual_medido, valor_medido, status)
    values (v_obra1, v_fA, '2026-11-01', 1, 'm', 1, 1, 'Aprovada'); r := r || E'FALHA: Medição criou já aprovada\n';
  exception when others then r := r || E'Medição criar já aprovada: recusado (ok)\n'; end;
  begin update public.medicoes set status = 'Aprovada' where mes_referencia = '2026-10-01'; get diagnostics n = row_count;
    r := r || format(E'Medição aprovou a própria: %s linhas (esperado erro ou 0)\n', n);
  exception when others then r := r || E'Medição aprovar a própria: bloqueado (ok)\n'; end;
  reset role;

  -- 6. Gestão Contratual: aprova; não mexe em valor; vê Risco
  perform set_config('request.jwt.claims', json_build_object('sub', uids[6], 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin update public.medicoes set valor_medido = 1 where mes_referencia = '2026-10-01'; r := r || E'FALHA: Gestão alterou valor\n';
  exception when others then r := r || E'Gestão alterar valor da medição: bloqueado (ok)\n'; end;
  begin update public.medicoes set status = 'Aprovada' where mes_referencia = '2026-10-01'; r := r || E'FALHA: Gestão deu a aprovação final\n';
  exception when others then r := r || E'Gestão dar a aprovação final: recusado (ok)\n'; end;
  update public.medicoes set status = 'Aprovada pela Gestão' where mes_referencia = '2026-10-01'; get diagnostics n = row_count;
  r := r || format(E'1ª aprovação (Gestão): %s medição (esperado 1)\n', n);
  select count(*) into n from public.restricoes; r := r || format(E'Gestão vê %s restrições (esperado 2)\n', n);
  reset role;

  -- 7. Engenharia: sem efetivo, sem Risco, sem medição
  perform set_config('request.jwt.claims', json_build_object('sub', uids[7], 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.apontamentos; r := r || format(E'Engenharia lê %s lançamentos direto (esperado 0)\n', n);
  select count(*) into n from public.apontamentos_sem_efetivo; r := r || format(E'Engenharia lê %s lançamentos pela view (esperado 1)\n', n);
  select count(*) into n from public.restricoes; r := r || format(E'Engenharia vê %s restrições (esperado 1: sem Risco)\n', n);
  select count(*) into n from public.medicoes; r := r || format(E'Engenharia vê %s medições (esperado 0)\n', n);
  reset role;

  -- 8. Administrador: lê tudo, não grava
  perform set_config('request.jwt.claims', json_build_object('sub', uids[8], 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.obras; r := r || format(E'Administrador vê %s obras (esperado 2)\n', n);
  begin insert into public.frentes (obra_id, nome, disciplina, inicio_planejado, fim_planejado)
    values (v_obra1, 'X', 'Civil', '2026-09-01', '2026-10-30'); r := r || E'FALHA: Administrador criou frente\n';
  exception when others then r := r || E'Administrador criar frente: recusado (ok)\n'; end;
  begin insert into public.obras (codigo, nome, cliente, data_inicio, data_fim_contratual) values ('T3','x','c','2026-01-01','2026-02-01');
    r := r || E'FALHA: Administrador criou obra\n';
  exception when others then r := r || E'Administrador criar obra: recusado (ok)\n'; end;
  reset role;

  -- 9. Coordenador: tudo, apaga, audita; campo automático bloqueado; auditoria imutável
  perform set_config('request.jwt.claims', json_build_object('sub', uids[1], 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.obras; r := r || format(E'Coordenador vê %s obras (esperado 2)\n', n);
  insert into public.obras (codigo, nome, cliente, data_inicio, data_fim_contratual) values ('T9','nova','c','2026-01-01','2026-02-01');
  r := r || E'Coordenador criou obra (ok)\n';
  begin update public.frentes set dias_sem_avanco = 9 where id = v_fA; r := r || E'FALHA: Coordenador editou dias_sem_avanco à mão\n';
  exception when others then r := r || E'Coordenador editar dias_sem_avanco à mão: bloqueado (ok)\n'; end;
  select count(*) into n from public.auditoria; r := r || format(E'Coordenador lê %s linhas de auditoria (esperado > 0)\n', n);
  begin insert into public.auditoria (tabela, registro_id, acao) values ('x', 1, 'Criou'); r := r || E'FALHA: inseriu auditoria à mão\n';
  exception when others then r := r || E'Inserir auditoria à mão: recusado (ok)\n'; end;
  begin delete from public.auditoria; r := r || E'FALHA: apagou auditoria\n';
  exception when others then r := r || E'Apagar auditoria: recusado (ok)\n'; end;
  begin update public.medicoes set status = 'Aprovada' where mes_referencia = '2026-08-01'; r := r || E'FALHA: Coordenador aprovou sem a Gestão\n';
  exception when others then r := r || E'Coordenador aprovar sem a Gestão: recusado (ok)\n'; end;
  update public.medicoes set status = 'Aprovada' where mes_referencia = '2026-10-01'; get diagnostics n = row_count;
  r := r || format(E'2ª aprovação (Coordenador): %s medição (esperado 1)\n', n);
  select count(*) into n from public.auditoria where tabela = 'apontamentos'; r := r || format(E'diário na auditoria: %s linhas (esperado > 0)\n', n);
  delete from public.restricoes where tipo = 'Risco'; get diagnostics n = row_count; r := r || format(E'Coordenador apagou %s restrição (esperado 1)\n', n);
  reset role;

  -- 10. Diretoria: lê tudo, não grava
  perform set_config('request.jwt.claims', json_build_object('sub', uids[9], 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.medicoes; r := r || format(E'Diretoria vê %s medições (esperado 3)\n', n);
  begin insert into public.restricoes (obra_id, tipo, titulo, criticidade, autor_id) values (v_obra1, 'Restrição', 't', 'Alta', v_dir);
    r := r || E'FALHA: Diretoria criou restrição\n';
  exception when others then r := r || E'Diretoria criar restrição: recusado (ok)\n'; end;
  reset role;

  raise exception E'RELATORIO\n%', r;
end
$teste$;
