-- Exemplo de Materiais e Diário de Obra. Só roda numa base vazia dessas tabelas (guarda no começo).
do $seed$ begin
if exists (select 1 from public.materiais_catalogo) then return; end if;

insert into public.materiais_catalogo (nome, unidade, categoria) values
('Cimento CP-II (saco 50 kg)', 'sacos', 'grosso'),
('Areia média', 'm³', 'grosso'),
('Tijolo cerâmico 8 furos', 'milheiros', 'grosso'),
('Vergalhão CA-50 10 mm', 'barras', 'grosso'),
('Argamassa AC-III (saco 20 kg)', 'sacos', 'acabamento'),
('Porcelanato 60x60', 'm²', 'acabamento'),
('Tinta acrílica fosca 18 L', 'latas', 'acabamento'),
('Rejunte flexível', 'kg', 'acabamento'),
('Tubo PVC esgoto 100 mm (6 m)', 'barras', 'instalacoes'),
('Fio flexível 2,5 mm² (rolo 100 m)', 'rolos', 'instalacoes'),
('Registro de gaveta 3/4"', 'un', 'instalacoes'),
('Disjuntor monopolar 20 A', 'un', 'instalacoes');

insert into public.pedidos_material (obra_id, material_id, quantidade, frente, prioridade, status, fornecedor, previsao_entrega, historico, recebimento) values
((select id from public.obras where codigo = 'U12'), (select id from public.materiais_catalogo where nome = 'Cimento CP-II (saco 50 kg)'), 50, 'Banheiro suíte', 'normal', 'solicitar', '', null, '[{"status":"solicitar","data":"2026-10-03"}]'::jsonb, '{"qtdBateNF":null,"estadoOk":null,"avarias":"","fotoNF":""}'::jsonb),
((select id from public.obras where codigo = 'U12'), (select id from public.materiais_catalogo where nome = 'Tubo PVC esgoto 100 mm (6 m)'), 12, 'Banheiro suíte', 'critico', 'solicitar', '', null, '[{"status":"solicitar","data":"2026-10-04"}]'::jsonb, '{"qtdBateNF":null,"estadoOk":null,"avarias":"","fotoNF":""}'::jsonb),
((select id from public.obras where codigo = 'U12'), (select id from public.materiais_catalogo where nome = 'Porcelanato 60x60'), 45, 'Sala e cozinha', 'normal', 'cotacao', '', null, '[{"status":"solicitar","data":"2026-09-26"},{"status":"cotacao","data":"2026-09-29"}]'::jsonb, '{"qtdBateNF":null,"estadoOk":null,"avarias":"","fotoNF":""}'::jsonb),
((select id from public.obras where codigo = 'U12'), (select id from public.materiais_catalogo where nome = 'Tinta acrílica fosca 18 L'), 8, 'Fachada', 'normal', 'cotacao', '', null, '[{"status":"solicitar","data":"2026-09-30"},{"status":"cotacao","data":"2026-10-01"}]'::jsonb, '{"qtdBateNF":null,"estadoOk":null,"avarias":"","fotoNF":""}'::jsonb),
((select id from public.obras where codigo = 'U12'), (select id from public.materiais_catalogo where nome = 'Disjuntor monopolar 20 A'), 20, 'Quadro elétrico', 'critico', 'comprado', 'Eletro Sul', '2026-10-07', '[{"status":"solicitar","data":"2026-09-28"},{"status":"cotacao","data":"2026-09-29"},{"status":"comprado","data":"2026-10-01"}]'::jsonb, '{"qtdBateNF":null,"estadoOk":null,"avarias":"","fotoNF":""}'::jsonb),
((select id from public.obras where codigo = 'U12'), (select id from public.materiais_catalogo where nome = 'Vergalhão CA-50 10 mm'), 30, 'Laje do mezanino', 'normal', 'comprado', 'Aço Brasil', '2026-10-01', '[{"status":"solicitar","data":"2026-09-22"},{"status":"cotacao","data":"2026-09-24"},{"status":"comprado","data":"2026-09-26"}]'::jsonb, '{"qtdBateNF":null,"estadoOk":null,"avarias":"","fotoNF":""}'::jsonb),
((select id from public.obras where codigo = 'U12'), (select id from public.materiais_catalogo where nome = 'Areia média'), 6, 'Contrapiso', 'normal', 'almoxarifado', 'Areial Central', '2026-09-30', '[{"status":"solicitar","data":"2026-09-20"},{"status":"cotacao","data":"2026-09-22"},{"status":"comprado","data":"2026-09-24"},{"status":"almoxarifado","data":"2026-10-01"}]'::jsonb, '{"qtdBateNF":true,"estadoOk":true,"avarias":"","fotoNF":""}'::jsonb),
((select id from public.obras where codigo = 'U12'), (select id from public.materiais_catalogo where nome = 'Argamassa AC-III (saco 20 kg)'), 40, 'Banheiro suíte', 'normal', 'almoxarifado', 'Casa do Construtor', '2026-10-02', '[{"status":"solicitar","data":"2026-09-25"},{"status":"cotacao","data":"2026-09-26"},{"status":"comprado","data":"2026-09-29"},{"status":"almoxarifado","data":"2026-10-02"}]'::jsonb, '{"qtdBateNF":false,"estadoOk":true,"avarias":"Vieram 36 sacos; 4 sacos faltaram na entrega.","fotoNF":""}'::jsonb),
((select id from public.obras where codigo = 'U12'), (select id from public.materiais_catalogo where nome = 'Tijolo cerâmico 8 furos'), 3, 'Alvenaria do térreo', 'normal', 'entregue', 'Cerâmica Vale', '2026-09-18', '[{"status":"solicitar","data":"2026-09-10"},{"status":"cotacao","data":"2026-09-11"},{"status":"comprado","data":"2026-09-13"},{"status":"almoxarifado","data":"2026-09-17"},{"status":"entregue","data":"2026-09-19"}]'::jsonb, '{"qtdBateNF":true,"estadoOk":true,"avarias":"","fotoNF":""}'::jsonb),
((select id from public.obras where codigo = 'U12'), (select id from public.materiais_catalogo where nome = 'Rejunte flexível'), 25, 'Sala e cozinha', 'normal', 'entregue', 'Casa do Construtor', '2026-09-22', '[{"status":"solicitar","data":"2026-09-12"},{"status":"cotacao","data":"2026-09-14"},{"status":"comprado","data":"2026-09-16"},{"status":"almoxarifado","data":"2026-09-22"},{"status":"entregue","data":"2026-09-24"}]'::jsonb, '{"qtdBateNF":true,"estadoOk":true,"avarias":"","fotoNF":""}'::jsonb),
((select id from public.obras where codigo = 'T405'), (select id from public.materiais_catalogo where nome = 'Cimento CP-II (saco 50 kg)'), 100, 'Base do tanque', 'normal', 'solicitar', '', null, '[{"status":"solicitar","data":"2026-10-02"}]'::jsonb, '{"qtdBateNF":null,"estadoOk":null,"avarias":"","fotoNF":""}'::jsonb),
((select id from public.obras where codigo = 'T405'), (select id from public.materiais_catalogo where nome = 'Vergalhão CA-50 10 mm'), 24, 'Anel de fundação', 'critico', 'cotacao', '', null, '[{"status":"solicitar","data":"2026-09-30"},{"status":"cotacao","data":"2026-10-02"}]'::jsonb, '{"qtdBateNF":null,"estadoOk":null,"avarias":"","fotoNF":""}'::jsonb);

insert into public.rdo_registros (obra_id, data, clima, efetivo, atividades, ocorrencias) values
((select id from public.obras where codigo = 'U12'), '2026-10-03', 'sol', 9, 'Soldas do spool 14 da linha L-340 concluídas e líquido penetrante aprovado. Pintura da segunda demão no pórtico P-3.', ''),
((select id from public.obras where codigo = 'U12'), '2026-10-02', 'chuva', 4, 'Içamento do feixe do trocador E-210 suspenso. Equipe só preparou o feixe tubular e organizou o canteiro.', 'Chuva forte pela manhã: içamento cancelado por segurança.'),
((select id from public.obras where codigo = 'U12'), '2026-10-01', 'nublado', 7, 'Lançamento de cabos até o painel PC-12 e calibração dos transmissores de pressão.', ''),
((select id from public.obras where codigo = 'U12'), '2026-09-30', 'sol', 8, 'Desmontagem de andaimes do forno F-101 até a cota 12 m. Revisão dos suportes do rack 3.', 'Permissão de trabalho do forno F-101 não liberada pela operação: equipe parada das 8h às 11h.'),
((select id from public.obras where codigo = 'T405'), '2026-10-03', 'nublado', 6, 'Preparação das chapas do fundo do tanque T-405 e conferência do alinhamento da base.', ''),
((select id from public.obras where codigo = 'U12'), '2026-09-29', 'nublado', 7, 'Instalação das prumadas do banheiro e conferência do traçado das tubulações.', ''),
((select id from public.obras where codigo = 'U12'), '2026-09-28', 'chuva', 3, 'Serviços externos suspensos; equipe organizou o canteiro e separou materiais.', 'Chuva o dia todo: frentes externas paradas.'),
((select id from public.obras where codigo = 'U12'), '2026-09-25', 'sol', 10, 'Retirada de revestimentos concluída e início da remoção de louças.', ''),
((select id from public.obras where codigo = 'U12'), '2026-09-24', 'sol', 9, 'Quebra de revestimento da cozinha e retirada de entulho em caçambas.', ''),
((select id from public.obras where codigo = 'U12'), '2026-09-23', 'chuva', 4, 'Apenas serviços internos de pequeno porte; entulho represado no pátio.', 'Chuva forte à tarde: caçamba não pôde sair.'),
((select id from public.obras where codigo = 'U12'), '2026-09-22', 'nublado', 8, 'Remoção de esquadrias de alumínio e proteção dos pisos já executados.', ''),
((select id from public.obras where codigo = 'U12'), '2026-09-21', 'sol', 9, 'Início da remoção de louças e acessórios dos banheiros.', ''),
((select id from public.obras where codigo = 'U12'), '2026-09-18', 'nublado', 8, 'Instalação de caixas de passagem e conferência dos pontos elétricos.', ''),
((select id from public.obras where codigo = 'U12'), '2026-09-17', 'chuva', 5, 'Frente interna mantida com equipe reduzida; frente externa parada.', 'Chuva intermitente: terraço sem condições de trabalho.'),
((select id from public.obras where codigo = 'U12'), '2026-09-16', 'sol', 10, 'Demolição de paredes internas concluída e limpeza geral das áreas.', ''),
((select id from public.obras where codigo = 'T405'), '2026-10-02', 'chuva', 2, 'Trabalho no tanque suspenso; apenas vigilância e conferência de materiais.', 'Chuva: trabalho a quente proibido.'),
((select id from public.obras where codigo = 'T405'), '2026-10-01', 'sol', 6, 'Isolamento e sinalização da área do tanque T-405.', '');
end $seed$;
