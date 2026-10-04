-- Fluxo de aprovação da medição: Medição cria/envia -> Gestão Contratual aprova -> Coordenador aprova.
-- Cada linha de `casos` é: perfil, status de partida, status de destino, deve passar?
-- Termina em erro de propósito (RELATORIO): nada fica gravado.
do $t$
declare
  r text := ''; v_o bigint; v_f bigint; i int := 0; c record; atual text; passou boolean; ok boolean;
  mes date; falhas int := 0;
  uid_ uuid; uids jsonb := '{}';
  papeis text[] := array['Coordenador','Medição','Gestão Contratual','Produção','Planejamento','Diretoria','Administrador'];
  p text;
begin
  foreach p in array papeis loop
    uid_ := gen_random_uuid();
    insert into auth.users (id, email) values (uid_, replace(p, ' ', '_') || '@t.local');
    update public.profiles set role = p where auth_uid = uid_;
    uids := uids || jsonb_build_object(p, uid_);
  end loop;
  insert into public.obras (codigo,nome,cliente,data_inicio,data_fim_contratual,status) values ('M1','m','c','2026-01-01','2026-12-31','Ativa') returning id into v_o;
  insert into public.obra_membros (obra_id, profile_id) select v_o, id from public.profiles where role in ('Medição','Gestão Contratual','Produção','Planejamento');
  insert into public.frentes (obra_id,nome,disciplina,inicio_planejado,fim_planejado) values (v_o,'f','Civil','2026-09-01','2026-10-30') returning id into v_f;

  for c in select * from (values
    ('Coordenador','Rascunho','Enviada',true),
    ('Coordenador','Rascunho','Aprovada',false),
    ('Coordenador','Enviada','Aprovada pela Gestão',false),
    ('Coordenador','Enviada','Aprovada',false),
    ('Coordenador','Aprovada pela Gestão','Aprovada',true),
    ('Coordenador','Aprovada','Rascunho',false),
    ('Medição','Rascunho','Enviada',true),
    ('Medição','Rascunho','Aprovada',false),
    ('Medição','Enviada','Aprovada pela Gestão',false),
    ('Medição','Enviada','Aprovada',false),
    ('Medição','Aprovada pela Gestão','Aprovada',false),
    ('Gestão Contratual','Rascunho','Enviada',false),
    ('Gestão Contratual','Enviada','Aprovada pela Gestão',true),
    ('Gestão Contratual','Enviada','Aprovada',false),
    ('Gestão Contratual','Aprovada pela Gestão','Aprovada',false),
    ('Produção','Enviada','Aprovada pela Gestão',false),
    ('Planejamento','Enviada','Aprovada pela Gestão',false),
    ('Diretoria','Enviada','Aprovada pela Gestão',false),
    ('Administrador','Enviada','Aprovada pela Gestão',false)
  ) as x(perfil, de, para, deve) loop
    i := i + 1;
    mes := (date '2020-01-01' + (i * 31)); mes := date_trunc('month', mes)::date;
    insert into public.medicoes (obra_id, frente_id, mes_referencia, quantidade, unidade, percentual_medido, valor_medido, status)
      values (v_o, v_f, mes, 1, 'm', 1, 100, c.de);
    perform set_config('request.jwt.claims', json_build_object('sub', uids ->> c.perfil, 'role','authenticated')::text, true);
    set local role authenticated;
    begin
      update public.medicoes set status = c.para where mes_referencia = mes;
    exception when others then null; end;
    reset role;
    select status into atual from public.medicoes where mes_referencia = mes;
    passou := atual = c.para;
    ok := passou = c.deve;
    if not ok then falhas := falhas + 1; end if;
    r := r || format(E'%s %s: %s -> %s %s\n', case when ok then 'ok   ' else 'FALHA' end, c.perfil, c.de, c.para, case when passou then '(passou)' else '(barrado)' end);
  end loop;

  -- Quem aprova não mexe em valor junto com o status
  insert into public.medicoes (obra_id, frente_id, mes_referencia, quantidade, unidade, percentual_medido, valor_medido, status)
    values (v_o, v_f, '2031-01-01', 1, 'm', 1, 100, 'Enviada');
  perform set_config('request.jwt.claims', json_build_object('sub', uids ->> 'Gestão Contratual', 'role','authenticated')::text, true);
  set local role authenticated;
  begin update public.medicoes set status = 'Aprovada pela Gestão', valor_medido = 1 where mes_referencia = '2031-01-01'; exception when others then null; end;
  reset role;
  select status into atual from public.medicoes where mes_referencia = '2031-01-01';
  r := r || format(E'%s Gestão aprovando e mudando o valor ao mesmo tempo: %s\n', case when atual = 'Enviada' then 'ok   ' else 'FALHA' end, case when atual = 'Enviada' then 'barrado' else 'passou' end);
  if atual <> 'Enviada' then falhas := falhas + 1; end if;

  raise exception E'RELATORIO (% falhas)\n%', falhas, r;
end $t$;
