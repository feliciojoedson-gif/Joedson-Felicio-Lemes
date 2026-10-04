import { calendarioPadrao } from './planejamento.js'

// Dados de exemplo do Diário de Obra (RDO), dos Materiais e do Planejamento. Só `lib/dados.js` importa este arquivo.
// `obraCodigo` é o código da obra (U12, T405): os ids do banco real não são os do mock.

// Foto de exemplo: um quadro colorido, para a miniatura aparecer sem arquivo de verdade.
const foto = (cor, rotulo) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120"><rect width="160" height="120" fill="${cor}"/><text x="80" y="66" font-family="Arial" font-size="15" font-weight="700" fill="#fff" text-anchor="middle">${rotulo}</text></svg>`,
  )}`

export const diarios = [
  { id: 1, obraCodigo: 'U12', data: '2026-10-03', clima: 'sol', efetivo: 9,
    atividades: 'Soldas do spool 14 da linha L-340 concluídas e líquido penetrante aprovado. Pintura da segunda demão no pórtico P-3.',
    ocorrencias: '', fotos: [foto('#5B5754', 'Spool 14'), foto('#C92D16', 'Pórtico P-3')] },
  { id: 2, obraCodigo: 'U12', data: '2026-10-02', clima: 'chuva', efetivo: 4,
    atividades: 'Içamento do feixe do trocador E-210 suspenso. Equipe só preparou o feixe tubular e organizou o canteiro.',
    ocorrencias: 'Chuva forte pela manhã: içamento cancelado por segurança.', fotos: [foto('#3A3735', 'Canteiro')] },
  { id: 3, obraCodigo: 'U12', data: '2026-10-01', clima: 'nublado', efetivo: 7,
    atividades: 'Lançamento de cabos até o painel PC-12 e calibração dos transmissores de pressão.',
    ocorrencias: '', fotos: [] },
  { id: 4, obraCodigo: 'U12', data: '2026-09-30', clima: 'sol', efetivo: 8,
    atividades: 'Desmontagem de andaimes do forno F-101 até a cota 12 m. Revisão dos suportes do rack 3.',
    ocorrencias: 'Permissão de trabalho do forno F-101 não liberada pela operação: equipe parada das 8h às 11h.',
    fotos: [foto('#E1371E', 'Forno F-101'), foto('#5E5A57', 'Rack 3'), foto('#2B2928', 'Andaimes')] },
  { id: 5, obraCodigo: 'T405', data: '2026-10-03', clima: 'nublado', efetivo: 6,
    atividades: 'Preparação das chapas do fundo do tanque T-405 e conferência do alinhamento da base.',
    ocorrencias: '', fotos: [foto('#5B5754', 'Chapas do fundo')] },
]

// Materiais (Kanban de pedidos). `obraCodigo` é o código da obra (U12, T405): os ids do banco real não são os do mock. "Hoje" no exemplo = 2026-10-04.
export const materiaisCatalogo = [
  { id: 1, nome: 'Cimento CP-II (saco 50 kg)', unidade: 'sacos', categoria: 'grosso' },
  { id: 2, nome: 'Areia média', unidade: 'm³', categoria: 'grosso' },
  { id: 3, nome: 'Tijolo cerâmico 8 furos', unidade: 'milheiros', categoria: 'grosso' },
  { id: 4, nome: 'Vergalhão CA-50 10 mm', unidade: 'barras', categoria: 'grosso' },
  { id: 5, nome: 'Argamassa AC-III (saco 20 kg)', unidade: 'sacos', categoria: 'acabamento' },
  { id: 6, nome: 'Porcelanato 60x60', unidade: 'm²', categoria: 'acabamento' },
  { id: 7, nome: 'Tinta acrílica fosca 18 L', unidade: 'latas', categoria: 'acabamento' },
  { id: 8, nome: 'Rejunte flexível', unidade: 'kg', categoria: 'acabamento' },
  { id: 9, nome: 'Tubo PVC esgoto 100 mm (6 m)', unidade: 'barras', categoria: 'instalacoes' },
  { id: 10, nome: 'Fio flexível 2,5 mm² (rolo 100 m)', unidade: 'rolos', categoria: 'instalacoes' },
  { id: 11, nome: 'Registro de gaveta 3/4"', unidade: 'un', categoria: 'instalacoes' },
  { id: 12, nome: 'Disjuntor monopolar 20 A', unidade: 'un', categoria: 'instalacoes' },
]

const semRecebimento = { qtdBateNF: null, estadoOk: null, avarias: '', fotoNF: '' }
const recebidoOk = { qtdBateNF: true, estadoOk: true, avarias: '', fotoNF: '' }
export const pedidos = [
  { id: 1, obraCodigo: 'U12', materialId: 1, quantidade: 50, frente: 'Banheiro suíte', prioridade: 'normal', status: 'solicitar',
    fornecedor: '', previsaoEntrega: '', historico: [{ status: 'solicitar', data: '2026-10-03' }], recebimento: semRecebimento },
  { id: 2, obraCodigo: 'U12', materialId: 9, quantidade: 12, frente: 'Banheiro suíte', prioridade: 'critico', status: 'solicitar',
    fornecedor: '', previsaoEntrega: '', historico: [{ status: 'solicitar', data: '2026-10-04' }], recebimento: semRecebimento },
  { id: 3, obraCodigo: 'U12', materialId: 6, quantidade: 45, frente: 'Sala e cozinha', prioridade: 'normal', status: 'cotacao',
    fornecedor: '', previsaoEntrega: '',
    historico: [{ status: 'solicitar', data: '2026-09-26' }, { status: 'cotacao', data: '2026-09-29' }], recebimento: semRecebimento },
  { id: 4, obraCodigo: 'U12', materialId: 7, quantidade: 8, frente: 'Fachada', prioridade: 'normal', status: 'cotacao',
    fornecedor: '', previsaoEntrega: '',
    historico: [{ status: 'solicitar', data: '2026-09-30' }, { status: 'cotacao', data: '2026-10-01' }], recebimento: semRecebimento },
  { id: 5, obraCodigo: 'U12', materialId: 12, quantidade: 20, frente: 'Quadro elétrico', prioridade: 'critico', status: 'comprado',
    fornecedor: 'Eletro Sul', previsaoEntrega: '2026-10-07',
    historico: [{ status: 'solicitar', data: '2026-09-28' }, { status: 'cotacao', data: '2026-09-29' }, { status: 'comprado', data: '2026-10-01' }],
    recebimento: semRecebimento },
  { id: 6, obraCodigo: 'U12', materialId: 4, quantidade: 30, frente: 'Laje do mezanino', prioridade: 'normal', status: 'comprado',
    fornecedor: 'Aço Brasil', previsaoEntrega: '2026-10-01',
    historico: [{ status: 'solicitar', data: '2026-09-22' }, { status: 'cotacao', data: '2026-09-24' }, { status: 'comprado', data: '2026-09-26' }],
    recebimento: semRecebimento },
  { id: 7, obraCodigo: 'U12', materialId: 2, quantidade: 6, frente: 'Contrapiso', prioridade: 'normal', status: 'almoxarifado',
    fornecedor: 'Areial Central', previsaoEntrega: '2026-09-30',
    historico: [{ status: 'solicitar', data: '2026-09-20' }, { status: 'cotacao', data: '2026-09-22' }, { status: 'comprado', data: '2026-09-24' }, { status: 'almoxarifado', data: '2026-10-01' }],
    recebimento: recebidoOk },
  { id: 8, obraCodigo: 'U12', materialId: 5, quantidade: 40, frente: 'Banheiro suíte', prioridade: 'normal', status: 'almoxarifado',
    fornecedor: 'Casa do Construtor', previsaoEntrega: '2026-10-02',
    historico: [{ status: 'solicitar', data: '2026-09-25' }, { status: 'cotacao', data: '2026-09-26' }, { status: 'comprado', data: '2026-09-29' }, { status: 'almoxarifado', data: '2026-10-02' }],
    recebimento: { qtdBateNF: false, estadoOk: true, avarias: 'Vieram 36 sacos; 4 sacos faltaram na entrega.', fotoNF: '' } },
  { id: 9, obraCodigo: 'U12', materialId: 3, quantidade: 3, frente: 'Alvenaria do térreo', prioridade: 'normal', status: 'entregue',
    fornecedor: 'Cerâmica Vale', previsaoEntrega: '2026-09-18',
    historico: [{ status: 'solicitar', data: '2026-09-10' }, { status: 'cotacao', data: '2026-09-11' }, { status: 'comprado', data: '2026-09-13' }, { status: 'almoxarifado', data: '2026-09-17' }, { status: 'entregue', data: '2026-09-19' }],
    recebimento: recebidoOk },
  { id: 10, obraCodigo: 'U12', materialId: 8, quantidade: 25, frente: 'Sala e cozinha', prioridade: 'normal', status: 'entregue',
    fornecedor: 'Casa do Construtor', previsaoEntrega: '2026-09-22',
    historico: [{ status: 'solicitar', data: '2026-09-12' }, { status: 'cotacao', data: '2026-09-14' }, { status: 'comprado', data: '2026-09-16' }, { status: 'almoxarifado', data: '2026-09-22' }, { status: 'entregue', data: '2026-09-24' }],
    recebimento: recebidoOk },
  { id: 11, obraCodigo: 'T405', materialId: 1, quantidade: 100, frente: 'Base do tanque', prioridade: 'normal', status: 'solicitar',
    fornecedor: '', previsaoEntrega: '', historico: [{ status: 'solicitar', data: '2026-10-02' }], recebimento: semRecebimento },
  { id: 12, obraCodigo: 'T405', materialId: 4, quantidade: 24, frente: 'Anel de fundação', prioridade: 'critico', status: 'cotacao',
    fornecedor: '', previsaoEntrega: '',
    historico: [{ status: 'solicitar', data: '2026-09-30' }, { status: 'cotacao', data: '2026-10-02' }], recebimento: semRecebimento },
]

// ---------- Planejamento (Last Planner) ----------
// Uma entrada por obra (código da obra). "Hoje" no exemplo = 2026-10-04 (domingo); a semana atual é 05 a 09/10.
// Atividades: UMA lista que as 4 abas compartilham. status: a_fazer | andamento | concluida | nao_realizado.
// Restrições (aba Médio prazo): `atividadeId` aponta para a atividade que elas impedem.
// U12 é a reforma completa; T405 tem poucos registros de propósito, para provar que trocar de obra troca tudo.
// `concluidaEm`: dia em que foi concluída (o PPC da semana conta por ele). `causa`: causa raiz quando não realizada.
// `inicioReal` e `fimReal`: quando a atividade realmente começou e terminou (o planejado fica em inicio e fim).
const atv = (id, titulo, parentId, ordem, inicio, fim, progresso, status, subtarefas = [], concluidaEm = null, inicioReal = null, fimReal = null) => ({
  id, titulo, parentId, ordem, inicio, fim, progresso, status, causa: '', causaDetalhe: '', concluidaEm, inicioReal, fimReal, arquivada: false, subtarefas,
})
const sub = (id, titulo, feita = false) => ({ id, titulo, feita, naoRealizado: false, causa: '', causaDetalhe: '' })
const subNao = (id, titulo, causa, causaDetalhe) => ({ id, titulo, feita: false, naoRealizado: true, causa, causaDetalhe })
const rest = (id, atividadeId, descricao, tipo, prazo, responsavel, resolvida = false) => ({
  id, atividadeId, descricao, tipo, prazo, responsavel, resolvida,
})

export const planejamentoDeExemplo = {
  U12: {
    atividades: [
      atv(1, 'Demolição', null, 0, '2026-09-14', '2026-10-06', 0, 'a_fazer'),
      atv(2, 'Retirada de revestimentos', 1, 0, '2026-09-14', '2026-09-25', 100, 'concluida', [], '2026-09-25', '2026-09-14', '2026-09-25'),
      // Deveria ter terminado na sexta (02/10) e ainda está em 80%: entra na semana como atividade acumulada.
      atv(3, 'Remoção de louças e esquadrias', 1, 1, '2026-09-21', '2026-10-02', 80, 'andamento', [
        sub(1, 'Retirar louças dos banheiros', true), sub(2, 'Remover esquadrias de alumínio', true), sub(3, 'Remover pia e bancada da cozinha', true),
        sub(4, 'Retirar box e acessórios', true), subNao(5, 'Remover porta da cozinha', 'Segurança', 'Aguardando a permissão de trabalho'),
      ], null, '2026-09-22'),
      atv(4, 'Remoção de entulho', 1, 2, '2026-10-05', '2026-10-06', 100, 'concluida', [], '2026-10-06', '2026-10-05', '2026-10-06'),
      atv(5, 'Hidráulica', null, 1, '2026-09-28', '2026-10-23', 0, 'a_fazer'),
      atv(6, 'Tubulação de água fria', 5, 0, '2026-09-28', '2026-10-09', 60, 'andamento', [
        sub(1, 'Prumadas do banheiro', true), sub(2, 'Prumadas da lavanderia', true), sub(3, 'Ramais da cozinha', true),
        sub(4, 'Ramais da área de serviço'), sub(5, 'Teste de pressão'),
      ], null, '2026-09-29'),
      atv(7, 'Instalação de ralos', 5, 1, '2026-10-05', '2026-10-07', 100, 'concluida', [], '2026-10-07', '2026-10-05', '2026-10-07'),
      atv(8, 'Elétrica', null, 2, '2026-10-05', '2026-10-16', 0, 'a_fazer'),
      atv(9, 'Reboco', null, 3, '2026-10-19', '2026-11-06', 0, 'a_fazer'),
      atv(10, 'Acabamento', null, 4, '2026-11-09', '2026-12-11', 0, 'a_fazer'),
      atv(11, 'Assentamento de pisos', 10, 0, '2026-11-09', '2026-11-27', 0, 'a_fazer'),
      atv(12, 'Pintura geral', 10, 1, '2026-11-23', '2026-12-11', 0, 'a_fazer'),
    ],
    restricoes: [
      rest(1, 8, 'Eletrodutos e caixas ainda não chegaram na obra', 'Material', '2026-10-08', 'Carlos (Suprimentos)'),
      rest(2, 6, 'Bomba de teste de pressão emprestada de outra obra', 'Equipamento', '2026-10-09', 'Marcos (Produção)'),
      rest(3, 9, 'Falta contratar dois pedreiros para o reboco', 'Mão de Obra', '2026-10-16', 'Ana (Planejamento)'),
      rest(4, 8, 'Compatibilização do projeto elétrico com o forro', 'Projeto', '2026-10-02', 'Paula (Engenharia)', true),
      rest(5, 9, 'Definir traço e espessura do reboco com a fiscalização', 'Método', '2026-10-23', 'Paula (Engenharia)'),
      rest(6, 11, 'Agendar o elevador de carga para subir o porcelanato', 'Logística', '2026-11-04', 'Carlos (Suprimentos)'),
      // Prazo de uma semana que já passou e ainda aberta: cai na coluna "Atrasadas".
      rest(7, 3, 'Liberação da permissão de trabalho para remover esquadrias altas', 'Segurança', '2026-10-02', 'Rafael (Segurança)'),
    ],
    // Linha de base salva em 10/09: as datas originais. Louças, tubulação, elétrica, reboco e acabamento escorregaram 2 dias úteis.
    baseline: {
      salvaEm: '2026-09-10',
      itens: [
        { id: 1, inicio: '2026-09-14', fim: '2026-10-06' }, { id: 2, inicio: '2026-09-14', fim: '2026-09-25' },
        { id: 3, inicio: '2026-09-21', fim: '2026-09-30' }, { id: 4, inicio: '2026-10-05', fim: '2026-10-06' },
        { id: 5, inicio: '2026-09-28', fim: '2026-10-21' }, { id: 6, inicio: '2026-09-28', fim: '2026-10-07' },
        { id: 7, inicio: '2026-10-05', fim: '2026-10-07' }, { id: 8, inicio: '2026-10-05', fim: '2026-10-14' },
        { id: 9, inicio: '2026-10-19', fim: '2026-11-04' }, { id: 10, inicio: '2026-11-09', fim: '2026-12-09' },
        { id: 11, inicio: '2026-11-09', fim: '2026-11-25' }, { id: 12, inicio: '2026-11-23', fim: '2026-12-09' },
      ],
    },
    calendario: calendarioPadrao(),
  },
  T405: {
    atividades: [
      atv(1, 'Preparação da área', null, 0, '2026-10-01', '2026-10-06', 0, 'a_fazer'),
      atv(2, 'Isolamento e sinalização', 1, 0, '2026-10-01', '2026-10-06', 100, 'concluida', [], '2026-10-02', '2026-10-01', '2026-10-02'),
      atv(3, 'Remoção de revestimento', null, 1, '2026-10-05', '2026-10-16', 0, 'a_fazer'),
    ],
    restricoes: [
      rest(1, 3, 'Liberação de trabalho a quente pela área operacional', 'Segurança', '2026-10-07', 'Rafael (Segurança)'),
    ],
    calendario: calendarioPadrao(),
  },
}

// Medições de empreiteiros. `obraCodigo` como nos demais (U12 é a obra 1, T405 a 2). "Hoje" no exemplo = 2026-10-04.
// Contrato GLOBAL: só `valorTotal`. Contrato POR ESCOPO: `valorTotal` = soma de `itensContrato`.
// Cada boletim guarda `valor`; no escopo, `linhas` traz a quantidade executada por item (a fonte da verdade).
export const contratos = [
  { id: 1, obraCodigo: 'U12', empreiteiro: 'Tinturas & Cores Ltda', descricao: 'Pintura interna de todos os ambientes', status: 'elaboracao', modo: null, valorTotal: null, criadoEm: '2026-10-02' },
  { id: 2, obraCodigo: 'U12', empreiteiro: 'Volt Instalações Elétricas', descricao: 'Infraestrutura e quadros elétricos', status: 'enviado', modo: null, valorTotal: null, criadoEm: '2026-09-25' },
  { id: 3, obraCodigo: 'U12', empreiteiro: 'Gesso Forte Acabamentos', descricao: 'Forro e sancas de gesso', status: 'ativo', modo: 'global', valorTotal: 30000, criadoEm: '2026-09-05' },
  { id: 4, obraCodigo: 'U12', empreiteiro: 'Drywall Sul Divisórias', descricao: 'Paredes e forros em drywall', status: 'ativo', modo: 'escopo', valorTotal: 30000, criadoEm: '2026-09-01' },
  { id: 5, obraCodigo: 'U12', empreiteiro: 'Demol Rápido Serviços', descricao: 'Demolição de alvenaria e retirada de entulho', status: 'concluido', modo: 'global', valorTotal: 12000, criadoEm: '2026-08-20' },
  { id: 6, obraCodigo: 'T405', empreiteiro: 'Concreto Norte Fundações', descricao: 'Fundação do tanque T405', status: 'ativo', modo: 'global', valorTotal: 50000, criadoEm: '2026-09-10' },
  { id: 7, obraCodigo: 'T405', empreiteiro: 'Pintura Industrial Aço Vivo', descricao: 'Pintura anticorrosiva da estrutura', status: 'elaboracao', modo: null, valorTotal: null, criadoEm: '2026-10-01' },
]

export const itensContrato = [
  { id: 1, contratoId: 4, descricao: 'Placas de drywall', unidade: 'm2', quantidade: 200, precoUnitario: 80 },
  { id: 2, contratoId: 4, descricao: 'Tratamento de juntas', unidade: 'm2', quantidade: 200, precoUnitario: 40 },
  { id: 3, contratoId: 4, descricao: 'Tabica de fixação', unidade: 'm', quantidade: 50, precoUnitario: 120 },
]

export const medicoes = [
  { id: 1, contratoId: 3, numero: 1, data: '2026-09-20', valor: 9000, linhas: [] },
  { id: 2, contratoId: 3, numero: 2, data: '2026-10-02', valor: 3000, linhas: [] },
  { id: 3, contratoId: 4, numero: 1, data: '2026-09-15', valor: 8000, linhas: [{ itemId: 1, quantidade: 80 }, { itemId: 2, quantidade: 40 }] },
  { id: 4, contratoId: 4, numero: 2, data: '2026-09-29', valor: 9600, linhas: [{ itemId: 1, quantidade: 60 }, { itemId: 2, quantidade: 60 }, { itemId: 3, quantidade: 20 }] },
  { id: 5, contratoId: 5, numero: 1, data: '2026-09-02', valor: 8000, linhas: [] },
  { id: 6, contratoId: 5, numero: 2, data: '2026-09-18', valor: 4000, linhas: [] },
  { id: 7, contratoId: 6, numero: 1, data: '2026-09-30', valor: 10000, linhas: [] },
]
