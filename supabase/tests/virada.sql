-- Teste da virada diária. Termina em erro de propósito (RELATORIO): nada fica gravado.
do $t$
declare r text := ''; n int; u record; v_o bigint; v_f1 bigint; v_f2 bigint; v_f3 bigint;
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  insert into public.obras (codigo,nome,cliente,data_inicio,data_fim_contratual,status) values ('V1','v','c',hoje-30,hoje+30,'Execução') returning id into v_o;
  insert into public.frentes (obra_id,nome,disciplina,inicio_planejado,fim_planejado) values (v_o,'f1','Civil',hoje-30,hoje+30) returning id into v_f1;
  update public.frentes set status='Em andamento', percentual_realizado=20, ultimo_avanco_em=hoje-5 where id=v_f1;
  insert into public.frentes (obra_id,nome,disciplina,inicio_planejado,fim_planejado) values (v_o,'f2','Civil',hoje-30,hoje+30) returning id into v_f2;
  update public.frentes set status='Em andamento', percentual_realizado=50, ultimo_avanco_em=hoje where id=v_f2;
  insert into public.frentes (obra_id,nome,disciplina,inicio_planejado,fim_planejado) values (v_o,'f3','Civil',hoje-10,hoje+30) returning id into v_f3;
  perform private.virada_diaria();
  select status, dias_sem_avanco, saude into u from public.frentes where id=v_f1; r := r || format(E'f1: %s, %s, %s (esperado Parada, 5, Vermelho)\n', u.status,u.dias_sem_avanco,u.saude);
  select status, dias_sem_avanco, saude into u from public.frentes where id=v_f2; r := r || format(E'f2: %s, %s, %s (esperado Em andamento, 0, Verde)\n', u.status,u.dias_sem_avanco,u.saude);
  select status, dias_sem_avanco, saude into u from public.frentes where id=v_f3; r := r || format(E'f3: %s, %s, %s (esperado Não iniciada, 0, Amarelo)\n', u.status,u.dias_sem_avanco,u.saude);
  raise exception E'RELATORIO\n%', r;
end $t$;
