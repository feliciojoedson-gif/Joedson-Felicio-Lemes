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
