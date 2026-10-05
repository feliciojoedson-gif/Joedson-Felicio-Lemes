-- Dados de exemplo (PRD-FRONTEND, "Dados de exemplo"): 2 obras e 10 frentes.
-- Não cria pessoas (profiles dependem de login real), então "responsável" fica vazio.
-- Pode rodar de novo sem duplicar. Para tirar os exemplos: delete das frentes e obras de código U12 e T405.
-- Roda como dono do banco (sem login), por isso o gatilho frentes_protege deixa gravar status e avanço.

insert into public.obras (codigo, nome, endereco, cliente, numero_contrato, data_inicio, data_fim_contratual, status) values
  ('U12', 'Parada Geral Unidade 12', 'Rodovia BR-101, km 12 — Zona Industrial (exemplo)', 'Petroquímica Exemplo', 'PE-0412', '2026-09-01', '2026-10-30', 'Ativa'),
  ('T405', 'Montagem Tanque T-405', 'Av. do Aço, 800 — Distrito Siderúrgico (exemplo)', 'Siderúrgica Exemplo', 'SE-0877', '2026-08-01', '2026-11-30', 'Ativa')
on conflict (codigo) do nothing;

insert into public.frentes
  (obra_id, nome, disciplina, local, inicio_planejado, fim_planejado, fim_planejado_original, eh_marco,
   percentual_realizado, ultimo_avanco_em, dias_sem_avanco, status, saude, impacto_prazo_dias, data_limite_decisao)
select o.id, v.nome, v.disciplina, v.local, v.ini::date, v.fim::date, v.fim::date, v.marco,
       v.real, v.ult::date, v.dias, v.status, v.saude, v.impacto, v.decisao::date
from (values
  ('U12',  'Andaimes forno F-101',                 'Andaimes',       'Forno F-101',       '2026-09-01', '2026-09-25', false, 90,  '2026-09-29', 5, 'Parada',       'Vermelho', 4,    '2026-10-06'),
  ('U12',  'Troca do trocador E-210',              'Mecânica',       'Casa de bombas',    '2026-09-08', '2026-10-10', false, 60,  '2026-10-01', 3, 'Parada',       'Vermelho', 7,    '2026-10-07'),
  ('U12',  'Tubulação linha L-340',                'Tubulação',      'Rack 3',            '2026-09-15', '2026-10-15', false, 58,  '2026-10-03', 1, 'Em andamento', 'Amarelo',  null, null),
  ('U12',  'Pintura estrutura metálica',           'Pintura',        'Estrutura E-1',     '2026-09-22', '2026-10-20', false, 45,  '2026-10-03', 1, 'Em andamento', 'Verde',    null, null),
  ('U12',  'Instrumentação painel PC-12',          'Instrumentação', 'Sala elétrica',     '2026-09-29', '2026-10-25', false, 20,  '2026-10-03', 1, 'Em andamento', 'Verde',    null, null),
  ('T405', 'Fundação e base',                      'Civil',          'Base do tanque',    '2026-08-01', '2026-09-15', false, 100, '2026-09-14', 0, 'Concluída',    'Verde',    null, null),
  ('T405', 'Montagem do fundo',                    'Mecânica',       'Tanque T-405',      '2026-09-16', '2026-10-20', false, 40,  '2026-09-30', 4, 'Parada',       'Vermelho', 3,    null),
  ('T405', 'Andaimes do casco',                    'Andaimes',       'Casco',             '2026-10-01', '2026-10-30', false, 0,   null,         0, 'Não iniciada', 'Amarelo',  null, null),
  ('T405', 'Marco: liberação do fundo para teste', 'Mecânica',       'Tanque T-405',      '2026-10-18', '2026-10-18', true,  0,   null,         0, 'Não iniciada', 'Verde',    null, null),
  ('T405', 'Iluminação do tanque',                 'Elétrica',       'Entorno do tanque', '2026-09-20', '2026-10-10', false, 70,  '2026-10-03', 1, 'Em andamento', 'Verde',    null, null)
) as v(obra, nome, disciplina, local, ini, fim, marco, real, ult, dias, status, saude, impacto, decisao)
join public.obras o on o.codigo = v.obra
where not exists (select 1 from public.frentes f where f.obra_id = o.id);

-- Empreiteiros (exemplo): os mesmos contratos de src/lib/mockData.js. Só entra se a obra ainda não tem contrato.
-- Roda como dono do banco; os boletins passam pelos gatilhos (numeração, 100%, valor por acumulado).
do $s$
declare
  v_u bigint; v_t bigint; c bigint; i1 bigint; i2 bigint; i3 bigint;
begin
  select id into v_u from public.obras where codigo = 'U12';
  select id into v_t from public.obras where codigo = 'T405';

  if v_u is not null and not exists (select 1 from public.contratos_empreiteiro where obra_id = v_u) then
    insert into public.contratos_empreiteiro (obra_id, empreiteiro, descricao, status, criado_em) values
      (v_u, 'Tinturas & Cores Ltda', 'Pintura interna de todos os ambientes', 'elaboracao', '2026-10-02'),
      (v_u, 'Volt Instalações Elétricas', 'Infraestrutura e quadros elétricos', 'enviado', '2026-09-25');

    insert into public.contratos_empreiteiro (obra_id, empreiteiro, descricao, status, modo, valor_total, criado_em)
      values (v_u, 'Gesso Forte Acabamentos', 'Forro e sancas de gesso', 'ativo', 'global', 30000, '2026-09-05') returning id into c;
    insert into public.boletins_empreiteiro (obra_id, contrato_id, numero, data, valor) values
      (v_u, c, 1, '2026-09-20', 9000), (v_u, c, 2, '2026-10-02', 3000);

    -- escopo: os itens entram com o contrato em Enviado; só então ele é ativado (o gatilho confere a soma)
    insert into public.contratos_empreiteiro (obra_id, empreiteiro, descricao, status, criado_em)
      values (v_u, 'Drywall Sul Divisórias', 'Paredes e forros em drywall', 'enviado', '2026-09-01') returning id into c;
    insert into public.itens_contrato (obra_id, contrato_id, descricao, unidade, quantidade, preco_unitario)
      values (v_u, c, 'Placas de drywall', 'm2', 200, 80) returning id into i1;
    insert into public.itens_contrato (obra_id, contrato_id, descricao, unidade, quantidade, preco_unitario)
      values (v_u, c, 'Tratamento de juntas', 'm2', 200, 40) returning id into i2;
    insert into public.itens_contrato (obra_id, contrato_id, descricao, unidade, quantidade, preco_unitario)
      values (v_u, c, 'Tabica de fixação', 'm', 50, 120) returning id into i3;
    update public.contratos_empreiteiro set status = 'ativo', modo = 'escopo', valor_total = 30000 where id = c;
    insert into public.boletins_empreiteiro (obra_id, contrato_id, numero, data, valor, linhas) values
      (v_u, c, 1, '2026-09-15', 8000, jsonb_build_array(jsonb_build_object('itemId', i1, 'quantidade', 80), jsonb_build_object('itemId', i2, 'quantidade', 40))),
      (v_u, c, 2, '2026-09-29', 9600, jsonb_build_array(jsonb_build_object('itemId', i1, 'quantidade', 60), jsonb_build_object('itemId', i2, 'quantidade', 60), jsonb_build_object('itemId', i3, 'quantidade', 20)));

    insert into public.contratos_empreiteiro (obra_id, empreiteiro, descricao, status, modo, valor_total, criado_em)
      values (v_u, 'Demol Rápido Serviços', 'Demolição de alvenaria e retirada de entulho', 'ativo', 'global', 12000, '2026-08-20') returning id into c;
    insert into public.boletins_empreiteiro (obra_id, contrato_id, numero, data, valor) values
      (v_u, c, 1, '2026-09-02', 8000), (v_u, c, 2, '2026-09-18', 4000);
    update public.contratos_empreiteiro set status = 'concluido' where id = c;
  end if;

  if v_t is not null and not exists (select 1 from public.contratos_empreiteiro where obra_id = v_t) then
    insert into public.contratos_empreiteiro (obra_id, empreiteiro, descricao, status, modo, valor_total, criado_em)
      values (v_t, 'Concreto Norte Fundações', 'Fundação do tanque T405', 'ativo', 'global', 50000, '2026-09-10') returning id into c;
    insert into public.boletins_empreiteiro (obra_id, contrato_id, numero, data, valor) values (v_t, c, 1, '2026-09-30', 10000);
    insert into public.contratos_empreiteiro (obra_id, empreiteiro, descricao, status, criado_em)
      values (v_t, 'Pintura Industrial Aço Vivo', 'Pintura anticorrosiva da estrutura', 'elaboracao', '2026-10-01');
  end if;
end $s$;
