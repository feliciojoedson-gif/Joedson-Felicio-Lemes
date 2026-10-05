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

// Histórico do Diário de Obra (setembro): clima variado e dias de chuva com pouca gente, para o BI de Relatórios nascer com história.
const rdo = (id, obraCodigo, data, clima, efetivo, atividades, ocorrencias = '') => ({ id, obraCodigo, data, clima, efetivo, atividades, ocorrencias, fotos: [] })
diarios.push(
  rdo(6, 'U12', '2026-09-29', 'nublado', 7, 'Instalação das prumadas do banheiro e conferência do traçado das tubulações.'),
  rdo(7, 'U12', '2026-09-28', 'chuva', 3, 'Serviços externos suspensos; equipe organizou o canteiro e separou materiais.', 'Chuva o dia todo: frentes externas paradas.'),
  rdo(8, 'U12', '2026-09-25', 'sol', 10, 'Retirada de revestimentos concluída e início da remoção de louças.'),
  rdo(9, 'U12', '2026-09-24', 'sol', 9, 'Quebra de revestimento da cozinha e retirada de entulho em caçambas.'),
  rdo(10, 'U12', '2026-09-23', 'chuva', 4, 'Apenas serviços internos de pequeno porte; entulho represado no pátio.', 'Chuva forte à tarde: caçamba não pôde sair.'),
  rdo(11, 'U12', '2026-09-22', 'nublado', 8, 'Remoção de esquadrias de alumínio e proteção dos pisos já executados.'),
  rdo(12, 'U12', '2026-09-21', 'sol', 9, 'Início da remoção de louças e acessórios dos banheiros.'),
  rdo(13, 'U12', '2026-09-18', 'nublado', 8, 'Instalação de caixas de passagem e conferência dos pontos elétricos.'),
  rdo(14, 'U12', '2026-09-17', 'chuva', 5, 'Frente interna mantida com equipe reduzida; frente externa parada.', 'Chuva intermitente: terraço sem condições de trabalho.'),
  rdo(15, 'U12', '2026-09-16', 'sol', 10, 'Demolição de paredes internas concluída e limpeza geral das áreas.'),
  rdo(16, 'T405', '2026-10-02', 'chuva', 2, 'Trabalho no tanque suspenso; apenas vigilância e conferência de materiais.', 'Chuva: trabalho a quente proibido.'),
  rdo(17, 'T405', '2026-10-01', 'sol', 6, 'Isolamento e sinalização da área do tanque T-405.'),
)

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

// QUALIDADE — Pendências (vistoria rápida). Fotos de exemplo em quadro colorido, como no RDO. "Hoje" no exemplo = 2026-10-04.
const fotoQ = (cor, rotulo) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect width="640" height="480" fill="${cor}"/><text x="320" y="250" font-family="Arial" font-size="38" font-weight="700" fill="#fff" text-anchor="middle">${rotulo}</text></svg>`,
  )}`

const pend = (o) => ({ pavimento: '', foto: '', fotoEvidencia: '', dataResolucao: '', observacoes: '', ...o })
export const pendenciasDeExemplo = [
  pend({ id: 1, obraCodigo: 'U12', numeroRegistro: 1, descricao: 'Solda do spool 14 com respingos e sem acabamento na linha L-340.', local: 'Linha L-340', pavimento: 'Rack 3',
    empresa: 'Metalúrgica Alfa', prazo: '2026-10-02', responsavel: 'Carlos Menezes', dataVistoria: '2026-09-28', vistoriadoPor: 'Ana Souza',
    status: 'pendente', foto: fotoQ('#5B5754', 'Solda do spool 14'),
    observacoes: '[30/09/2026 09:12] Empresa pediu mais 2 dias por falta de esmerilhadeira.\n[28/09/2026 15:40] Registrado na vistoria de rotina.' }),
  pend({ id: 2, obraCodigo: 'U12', numeroRegistro: 2, descricao: 'Escorrimento de tinta na segunda demão do pórtico P-3.', local: 'Pórtico P-3', pavimento: 'Cota 8 m',
    empresa: 'Pinturas Beta', prazo: '2026-10-04', responsavel: 'Juliana Prado', dataVistoria: '2026-09-29', vistoriadoPor: 'Ana Souza',
    status: 'em_andamento', foto: fotoQ('#C92D16', 'Pórtico P-3'),
    observacoes: '[03/10/2026 16:05] Lixamento feito, falta a nova demão.' }),
  pend({ id: 3, obraCodigo: 'U12', numeroRegistro: 3, descricao: 'Guarda-corpo da plataforma do forno F-101 sem rodapé.', local: 'Forno F-101', pavimento: 'Plataforma norte',
    empresa: 'Metalúrgica Alfa', prazo: '2026-10-07', responsavel: 'Carlos Menezes', dataVistoria: '2026-10-02', vistoriadoPor: 'Ricardo Lopes',
    status: 'pendente', foto: fotoQ('#E1371E', 'Guarda-corpo F-101') }),
  pend({ id: 4, obraCodigo: 'U12', numeroRegistro: 4, descricao: 'Eletroduto sem fixação no trecho que chega ao painel PC-12.', local: 'Painel PC-12',
    empresa: 'Elétrica Gama', prazo: '2026-10-09', responsavel: 'Juliana Prado', dataVistoria: '2026-10-01', vistoriadoPor: 'Ana Souza',
    status: 'em_andamento', foto: fotoQ('#3A3735', 'Eletroduto PC-12'), observacoes: '[03/10/2026 08:30] Braçadeiras compradas, instalação amanhã.' }),
  pend({ id: 5, obraCodigo: 'U12', numeroRegistro: 5, descricao: 'Isolamento térmico danificado em trecho da linha L-212.', local: 'Linha L-212', pavimento: 'Rack 1',
    empresa: 'Pinturas Beta', prazo: '2026-09-30', responsavel: 'Juliana Prado', dataVistoria: '2026-09-25', vistoriadoPor: 'Ricardo Lopes',
    status: 'resolvido', foto: fotoQ('#5E5A57', 'Isolamento L-212'), fotoEvidencia: fotoQ('#2E8B57', 'Corrigido L-212'), dataResolucao: '2026-10-01',
    observacoes: '[01/10/2026 11:20] Trecho refeito e conferido com a fiscalização.\n[25/09/2026 14:10] Vistoria: manta rasgada por passagem de andaime.' }),
  pend({ id: 6, obraCodigo: 'U12', numeroRegistro: 6, descricao: 'Tubulação de água de resfriamento sem sinalização de fluxo.', local: 'Casa de bombas',
    empresa: 'Pinturas Beta', prazo: '2026-10-12', responsavel: 'Juliana Prado', dataVistoria: '2026-10-03', vistoriadoPor: 'Ana Souza',
    status: 'pendente', foto: fotoQ('#2B2928', 'Sem sinalização') }),
  pend({ id: 7, obraCodigo: 'T405', numeroRegistro: 1, descricao: 'Chapa do fundo do tanque com empeno acima do tolerado.', local: 'Fundo do tanque T-405', pavimento: 'Anel 1',
    empresa: 'Metalúrgica Alfa', prazo: '2026-10-10', responsavel: 'Rafael Lima', dataVistoria: '2026-10-03', vistoriadoPor: 'Rafael Lima',
    status: 'pendente', foto: fotoQ('#5B5754', 'Empeno chapa T-405') }),
  pend({ id: 8, obraCodigo: 'T405', numeroRegistro: 2, descricao: 'Cordão de solda com porosidade visível na junta 7.', local: 'Costado T-405', pavimento: 'Junta 7',
    empresa: 'Metalúrgica Alfa', prazo: '2026-10-06', responsavel: 'Rafael Lima', dataVistoria: '2026-10-01', vistoriadoPor: 'Rafael Lima',
    status: 'em_andamento', foto: fotoQ('#C92D16', 'Porosidade junta 7'), observacoes: '[03/10/2026 13:45] Esmerilhado, aguardando reparo e novo ensaio.' }),
]

// QUALIDADE — FVS. Modelos valem para a empresa toda; vistorias e NCs são de uma obra (`obraCodigo`).
export const modelosFvs = [
  { id: 1, codigo: 'FVS-01', nome: 'Impermeabilização — Áreas Molhadas', categoria: 'Impermeabilização', versao: 2, grupos: [
    { nome: 'Pré-execução', itens: [
      { id: 101, titulo: 'Substrato limpo, seco e sem falhas' },
      { id: 102, titulo: 'Caimento do contrapiso em direção ao ralo conferido' },
      { id: 103, titulo: 'Cantos e arestas arredondados (meia-cana executada)' },
    ] },
    { nome: 'Execução', itens: [
      { id: 104, titulo: 'Primer aplicado em toda a área' },
      { id: 105, titulo: 'Número de demãos conforme o projeto' },
      { id: 106, titulo: 'Reforço com tela nos ralos e rodapés' },
      { id: 107, titulo: 'Subida da impermeabilização no rodapé com no mínimo 30 cm' },
    ] },
    { nome: 'Proteção e acabamento', itens: [
      { id: 108, titulo: 'Teste de estanqueidade por 72 h sem vazamento' },
      { id: 109, titulo: 'Proteção mecânica executada sobre a manta' },
    ] },
  ] },
  { id: 2, codigo: 'FVS-02', nome: 'Revestimento Cerâmico', categoria: 'Acabamento', versao: 1, grupos: [
    { nome: 'Preparo da base', itens: [
      { id: 201, titulo: 'Base nivelada, limpa e curada' },
      { id: 202, titulo: 'Argamassa colante adequada ao formato da peça' },
      { id: 203, titulo: 'Paginação conferida com o projeto' },
    ] },
    { nome: 'Aplicação e acabamento', itens: [
      { id: 204, titulo: 'Colagem dupla em peças grandes' },
      { id: 205, titulo: 'Juntas uniformes e alinhadas' },
      { id: 206, titulo: 'Ausência de peças ocas (teste de percussão)' },
      { id: 207, titulo: 'Rejunte aplicado e superfície limpa' },
    ] },
  ] },
]

// Empresa de cada pessoa que aparece nas vistorias, NCs e observações do Gemba (o filtro por empresa dos Relatórios lê `empresa`).
const EMPRESA_DE = {
  'Carlos Menezes': 'Metalúrgica Alfa', 'Rafael Lima': 'Metalúrgica Alfa', 'Juliana Prado': 'Pinturas Beta',
  'Ricardo Lopes': 'Elétrica Gama', 'Ana Souza': 'Elétrica Gama',
}

const vistoriaMock = (id, obraCodigo, modeloId, ambiente, status, respostas, extra) => {
  const m = modelosFvs.find((x) => x.id === modeloId)
  return { id, obraCodigo, modeloId, modeloCodigo: m.codigo, modeloNome: m.nome, versao: m.versao, ambiente, grupos: structuredClone(m.grupos),
    respostas, status, concluidaEm: '', empresa: EMPRESA_DE[extra.criadaPor], ...extra }
}

export const vistoriasDeExemplo = [
  vistoriaMock(1, 'U12', 2, 'Cozinha · Térreo', 'concluida',
    { 201: 'ok', 202: 'ok', 203: 'ok', 204: 'ok', 205: 'nc', 206: 'nc', 207: 'na' },
    { criadaEm: '2026-09-28', criadaPor: 'Ana Souza', concluidaEm: '2026-09-29' }),
  vistoriaMock(2, 'U12', 1, 'Banheiro Social · Térreo', 'em_andamento',
    { 101: 'ok', 102: 'ok', 103: 'nc', 104: 'ok', 105: 'nc' },
    { criadaEm: '2026-10-02', criadaPor: 'Ricardo Lopes' }),
  vistoriaMock(3, 'T405', 1, 'Piso do tanque · Anel 1', 'em_andamento',
    { 101: 'ok', 102: 'nc' },
    { criadaEm: '2026-10-03', criadaPor: 'Rafael Lima' }),
]

const ncMock = (o) => ({ fotos: [], fechadaEm: '', ...o })
export const ncsDeExemplo = [
  ncMock({ id: 1, obraCodigo: 'U12', codigo: 'NC-001', vistoriaId: 1, itemId: 205, itemNumero: '2.2', titulo: 'Juntas uniformes e alinhadas',
    servico: 'Revestimento Cerâmico', ambiente: 'Cozinha · Térreo', severidade: 'Baixa', responsavel: 'Carlos Menezes', empresa: EMPRESA_DE['Carlos Menezes'],
    descricao: 'Juntas com largura irregular na parede da pia.', solucao: 'Refazer o alinhamento das 6 peças e rejuntar.',
    status: 'fechada', abertaEm: '2026-09-29', fechadaEm: '2026-10-01', fotos: [fotoQ('#E1371E', 'Junta irregular')],
    timeline: [
      { em: '29/09/2026 14:18', texto: 'Aberta por Ana Souza' },
      { em: '29/09/2026 16:02', texto: 'Encaminhada para Carlos Menezes por Ana Souza' },
      { em: '30/09/2026 17:40', texto: 'Marcada como corrigida por Carlos Menezes' },
      { em: '01/10/2026 09:15', texto: 'Aprovada e fechada por Ana Souza' },
    ] }),
  ncMock({ id: 2, obraCodigo: 'U12', codigo: 'NC-002', vistoriaId: 1, itemId: 206, itemNumero: '2.3', titulo: 'Ausência de peças ocas (teste de percussão)',
    servico: 'Revestimento Cerâmico', ambiente: 'Cozinha · Térreo', severidade: 'Alta', responsavel: 'Carlos Menezes', empresa: EMPRESA_DE['Carlos Menezes'],
    descricao: 'Som oco em 4 peças do piso, perto da porta.', solucao: 'Remover as peças, recolar com colagem dupla e repetir o teste.',
    status: 'corrigida', abertaEm: '2026-09-29', fotos: [fotoQ('#C92D16', 'Peças ocas')],
    timeline: [
      { em: '29/09/2026 14:20', texto: 'Aberta por Ana Souza' },
      { em: '29/09/2026 16:05', texto: 'Encaminhada para Carlos Menezes por Ana Souza' },
      { em: '03/10/2026 11:30', texto: 'Marcada como corrigida por Carlos Menezes' },
    ] }),
  ncMock({ id: 3, obraCodigo: 'U12', codigo: 'NC-003', vistoriaId: 2, itemId: 103, itemNumero: '1.3', titulo: 'Cantos e arestas arredondados (meia-cana executada)',
    servico: 'Impermeabilização — Áreas Molhadas', ambiente: 'Banheiro Social · Térreo', severidade: 'Média', responsavel: 'Juliana Prado', empresa: EMPRESA_DE['Juliana Prado'],
    descricao: 'Meia-cana não executada no encontro da parede com o box.', solucao: 'Executar a meia-cana com argamassa polimérica antes da manta.',
    status: 'aberta', abertaEm: '2026-10-02', fotos: [fotoQ('#5B5754', 'Sem meia-cana')],
    timeline: [{ em: '02/10/2026 10:45', texto: 'Aberta por Ricardo Lopes' }] }),
  ncMock({ id: 4, obraCodigo: 'U12', codigo: 'NC-004', vistoriaId: 2, itemId: 105, itemNumero: '2.2', titulo: 'Número de demãos conforme o projeto',
    servico: 'Impermeabilização — Áreas Molhadas', ambiente: 'Banheiro Social · Térreo', severidade: 'Alta', responsavel: 'Juliana Prado', empresa: EMPRESA_DE['Juliana Prado'],
    descricao: 'Só 2 demãos aplicadas; o projeto pede 3.', solucao: 'Aplicar a terceira demão cruzada e aguardar a cura.',
    status: 'encaminhada', abertaEm: '2026-10-02', fotos: [],
    timeline: [
      { em: '02/10/2026 10:50', texto: 'Aberta por Ricardo Lopes' },
      { em: '02/10/2026 11:10', texto: 'Encaminhada para Juliana Prado por Ricardo Lopes' },
    ] }),
  ncMock({ id: 5, obraCodigo: 'T405', codigo: 'NC-001', vistoriaId: 3, itemId: 102, itemNumero: '1.2', titulo: 'Caimento do contrapiso em direção ao ralo conferido',
    servico: 'Impermeabilização — Áreas Molhadas', ambiente: 'Piso do tanque · Anel 1', severidade: 'Média', responsavel: 'Rafael Lima', empresa: EMPRESA_DE['Rafael Lima'],
    descricao: 'Caimento invertido em um trecho de 2 m.', solucao: 'Regularizar o trecho com argamassa de nivelamento.',
    status: 'aberta', abertaEm: '2026-10-03', fotos: [],
    timeline: [{ em: '03/10/2026 15:20', texto: 'Aberta por Rafael Lima' }] }),
]

// QUALIDADE — Gemba Walk (caça aos desperdícios). "Hoje" no exemplo = 2026-10-04.
const gb = (o) => ({ foto: '', prazo: '', ...o })
export const gembaDeExemplo = [
  gb({ id: 1, obraCodigo: 'U12', local: 'Rack 3 · Linha L-340', descricao: 'Spool 14 soldado fora da tolerância e cortado de novo duas vezes.',
    causaRaiz: 'Desenho de fabricação desatualizado na bancada.', acao: 'Conferir a revisão do desenho antes de cada corte e fixar a lista de revisões na bancada.',
    desperdicios: ['Retrabalho'], prazo: '2026-10-02', responsavel: 'Carlos Menezes', empresa: EMPRESA_DE['Carlos Menezes'], status: 'pendente', foto: fotoQ('#C92D16', 'Spool 14 refeito') }),
  gb({ id: 2, obraCodigo: 'U12', local: 'Forno F-101', descricao: 'Equipe parada esperando a permissão de trabalho da operação.',
    causaRaiz: 'Permissão só é emitida às 11h, sem pedido antecipado.', acao: 'Pedir a permissão na véspera, no fim do turno.',
    desperdicios: ['Espera'], prazo: '2026-10-06', responsavel: 'Juliana Prado', empresa: EMPRESA_DE['Juliana Prado'], status: 'em_andamento', foto: fotoQ('#E1371E', 'Espera F-101') }),
  gb({ id: 3, obraCodigo: 'U12', local: 'Canteiro · almoxarifado', descricao: 'Tubos levados três vezes entre o almoxarifado e a área de pré-montagem.',
    causaRaiz: 'Área de pré-montagem longe do estoque.', acao: 'Mover a bancada de pré-montagem para perto do almoxarifado.',
    desperdicios: ['Transporte', 'Movimentação'], prazo: '2026-10-09', responsavel: 'Ricardo Lopes', empresa: EMPRESA_DE['Ricardo Lopes'], status: 'pendente', foto: fotoQ('#3A3735', 'Tubos em trânsito') }),
  gb({ id: 4, obraCodigo: 'U12', local: 'Pátio de pintura', descricao: 'Latas de tinta acumuladas além do consumo de duas semanas.',
    causaRaiz: 'Compra em lote grande para ganhar desconto.', acao: 'Ajustar o pedido ao consumo semanal.',
    desperdicios: ['Estoque', 'Superprodução'], prazo: '', responsavel: 'Juliana Prado', empresa: EMPRESA_DE['Juliana Prado'], status: 'pendente' }),
  gb({ id: 5, obraCodigo: 'U12', local: 'Painel PC-12', descricao: 'Mesma folha de inspeção preenchida à mão e depois digitada de novo.',
    causaRaiz: 'Não existe formulário digital no celular.', acao: 'Usar o checklist do app direto no campo.',
    desperdicios: ['Processo desnecessário', 'Retrabalho'], prazo: '2026-10-08', responsavel: 'Ana Souza', empresa: EMPRESA_DE['Ana Souza'], status: 'em_andamento' }),
  gb({ id: 6, obraCodigo: 'U12', local: 'Rack 1', descricao: 'Isolamento refeito por falta de proteção contra chuva no trecho.',
    causaRaiz: 'Lona de proteção não foi pedida na programação semanal.', acao: 'Incluir proteção contra chuva na programação de curto prazo.',
    desperdicios: ['Retrabalho'], prazo: '2026-10-01', responsavel: 'Ricardo Lopes', empresa: EMPRESA_DE['Ricardo Lopes'], status: 'resolvido', foto: fotoQ('#2E8B57', 'Lona instalada') }),
  gb({ id: 7, obraCodigo: 'U12', local: 'Casa de bombas', descricao: 'Soldador volta ao contêiner três vezes por turno buscar ferramenta.',
    causaRaiz: 'Kit de ferramentas incompleto na frente.', acao: 'Montar um kit padrão por frente de solda.',
    desperdicios: ['Movimentação', 'Espera'], prazo: '2026-10-04', responsavel: 'Carlos Menezes', empresa: EMPRESA_DE['Carlos Menezes'], status: 'pendente' }),
  gb({ id: 8, obraCodigo: 'T405', local: 'Costado T-405', descricao: 'Chapas empilhadas esperando o guindaste, que atende outra frente.',
    causaRaiz: 'Um único guindaste para duas frentes.', acao: 'Escalonar o uso do guindaste por horário.',
    desperdicios: ['Espera'], prazo: '2026-10-07', responsavel: 'Rafael Lima', empresa: EMPRESA_DE['Rafael Lima'], status: 'pendente', foto: fotoQ('#5B5754', 'Chapas paradas') }),
  gb({ id: 9, obraCodigo: 'T405', local: 'Fundo do tanque', descricao: 'Solda de junta repetida por ensaio reprovado.',
    causaRaiz: 'Soldador sem requalificação para a posição.', acao: 'Requalificar o soldador antes da próxima junta.',
    desperdicios: ['Retrabalho'], prazo: '', responsavel: 'Rafael Lima', empresa: EMPRESA_DE['Rafael Lima'], status: 'em_andamento' }),
]

// ---------- Planejamento com histórico (usado pelos Relatórios) ----------
// `planejamentoDeExemplo` acima fica intacto: os testes do Planejamento dependem dele exatamente como está.
// `planejamentoCompleto` = o mesmo exemplo + 9 semanas de histórico da U12 (agosto a outubro, com previsto x real e a linha de base
// original), causas raiz variadas nas tarefas não realizadas e a `empresa` de cada tarefa (nomes iguais aos dos contratos).
const atvExtra = (id, titulo, parentId, ordem, inicio, fim, progresso, status, extra = {}) => ({
  id, titulo, parentId, ordem, inicio, fim, progresso, status, causa: '', causaDetalhe: '', concluidaEm: null, inicioReal: null, fimReal: null,
  arquivada: false, subtarefas: [], empresa: '', ...extra,
})
const concluidaH = (id, titulo, inicio, fim, concluidaEm, empresa = '') =>
  atvExtra(id, titulo, 13, id, inicio, fim, 100, 'concluida', { concluidaEm, inicioReal: inicio, fimReal: concluidaEm, empresa })

const EMPRESA_DA_ATIVIDADE = {
  U12: { 2: 'Demol Rápido Serviços', 3: 'Demol Rápido Serviços', 4: 'Demol Rápido Serviços', 6: 'Hidro Reforma Ltda', 7: 'Hidro Reforma Ltda',
    8: 'Volt Instalações Elétricas', 9: 'Gesso Forte Acabamentos', 11: 'Gesso Forte Acabamentos', 12: 'Tinturas & Cores Ltda' },
  T405: { 2: 'Concreto Norte Fundações', 3: 'Pintura Industrial Aço Vivo' },
}

// Grupo 13 (na ordem 5, para não renumerar a EAP que já existia). Várias concluíram depois do previsto: o PPC das semanas fica misto.
const HISTORICO_U12 = [
  atvExtra(13, 'Mobilização e preparos', null, 5, '2026-08-10', '2026-10-02', 0, 'a_fazer'),
  concluidaH(14, 'Tapumes e isolamento', '2026-08-10', '2026-08-12', '2026-08-12', 'Demol Rápido Serviços'),
  concluidaH(15, 'Ligação provisória de energia', '2026-08-10', '2026-08-14', '2026-08-14', 'Volt Instalações Elétricas'),
  concluidaH(16, 'Instalação do canteiro e vestiário', '2026-08-17', '2026-08-21', '2026-08-21'),
  concluidaH(17, 'Proteção de pisos e mobiliário', '2026-08-17', '2026-08-19', '2026-08-26', 'Tinturas & Cores Ltda'),
  concluidaH(18, 'Levantamento das instalações existentes', '2026-08-24', '2026-08-28', '2026-08-28', 'Volt Instalações Elétricas'),
  concluidaH(19, 'Locação de caçamba de entulho', '2026-08-24', '2026-08-25', '2026-09-02'),
  concluidaH(20, 'Demolição de paredes internas', '2026-08-31', '2026-09-04', '2026-09-04', 'Demol Rápido Serviços'),
  atvExtra(21, 'Retirada do forro antigo', 13, 21, '2026-08-31', '2026-09-03', 60, 'nao_realizado', {
    causa: 'Clima', causaDetalhe: 'Chuva forte na semana, telhado sem condição de acesso', inicioReal: '2026-09-01', empresa: 'Demol Rápido Serviços',
  }),
  concluidaH(22, 'Quebra do contrapiso do banheiro', '2026-09-08', '2026-09-11', '2026-09-11', 'Demol Rápido Serviços'),
  atvExtra(23, 'Abertura de rasgos para tubulação', 13, 23, '2026-09-08', '2026-09-11', 40, 'nao_realizado', {
    causa: 'Material', causaDetalhe: 'Disco diamantado não chegou', inicioReal: '2026-09-09', empresa: 'Hidro Reforma Ltda',
  }),
  concluidaH(24, 'Reforço da laje do terraço', '2026-09-08', '2026-09-11', '2026-09-16', 'Gesso Forte Acabamentos'),
  concluidaH(25, 'Instalação das caixas de passagem', '2026-09-14', '2026-09-18', '2026-09-18', 'Volt Instalações Elétricas'),
  concluidaH(26, 'Quebra do revestimento da cozinha', '2026-09-21', '2026-09-25', '2026-09-24', 'Demol Rápido Serviços'),
  concluidaH(27, 'Regularização das paredes', '2026-09-28', '2026-10-02', '2026-10-01', 'Gesso Forte Acabamentos'),
  atvExtra(28, 'Impermeabilização do banheiro suíte', 13, 28, '2026-09-28', '2026-10-02', 50, 'andamento', {
    inicioReal: '2026-09-29', empresa: 'Tinturas & Cores Ltda',
    subtarefas: [
      sub(1, 'Limpar e preparar o substrato', true), sub(2, 'Aplicar o primer', true),
      subNao(3, 'Primeira demão', 'Clima', 'Chuva: substrato úmido'), subNao(4, 'Segunda demão', 'Clima', 'Chuva: substrato úmido'),
      subNao(5, 'Teste de estanqueidade', 'Material', 'Manta não entregue'),
    ],
  }),
  atvExtra(29, 'Chapisco das paredes', 13, 29, '2026-10-01', '2026-10-02', 30, 'andamento', {
    inicioReal: '2026-10-01', empresa: 'Gesso Forte Acabamentos',
    subtarefas: [
      sub(1, 'Preparar a argamassa', true),
      subNao(2, 'Chapisco da sala', 'Mão de obra', 'Faltou um ajudante'), subNao(3, 'Chapisco da cozinha', 'Mão de obra', 'Faltou um ajudante'),
    ],
  }),
]

// Datas originais das tarefas do histórico (linha de base de 10/09): as que fecharam depois do previsto aparecem como "atrasou".
const BASELINE_HISTORICO_U12 = HISTORICO_U12.map((a) => ({ id: a.id, inicio: a.inicio, fim: a.fim }))
  .map((i) => ({ ...i, fim: { 21: '2026-09-02', 24: '2026-09-09', 28: '2026-10-01' }[i.id] || i.fim }))

function completo(codigo) {
  const base = structuredClone(planejamentoDeExemplo[codigo])
  const empresas = EMPRESA_DA_ATIVIDADE[codigo] || {}
  base.atividades = base.atividades.map((a) => ({ ...a, empresa: empresas[a.id] || '' }))
  if (codigo === 'U12') {
    base.atividades.push(...structuredClone(HISTORICO_U12))
    base.baseline = { ...base.baseline, itens: [...base.baseline.itens, ...structuredClone(BASELINE_HISTORICO_U12)] }
  }
  return base
}

export const planejamentoCompleto = Object.fromEntries(Object.keys(planejamentoDeExemplo).map((codigo) => [codigo, completo(codigo)]))
