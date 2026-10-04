// Dados de exemplo do Diário de Obra (RDO). Só `lib/dados.js` importa este arquivo.
// `obraId` é o id da obra em mock.js: 1 = Parada Geral Unidade 12, 2 = Montagem Tanque T-405.

// Foto de exemplo: um quadro colorido, para a miniatura aparecer sem arquivo de verdade.
const foto = (cor, rotulo) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120"><rect width="160" height="120" fill="${cor}"/><text x="80" y="66" font-family="Arial" font-size="15" font-weight="700" fill="#fff" text-anchor="middle">${rotulo}</text></svg>`,
  )}`

export const diarios = [
  { id: 1, obraId: 1, data: '2026-10-03', clima: 'sol', efetivo: 9,
    atividades: 'Soldas do spool 14 da linha L-340 concluídas e líquido penetrante aprovado. Pintura da segunda demão no pórtico P-3.',
    ocorrencias: '', fotos: [foto('#5B5754', 'Spool 14'), foto('#C92D16', 'Pórtico P-3')] },
  { id: 2, obraId: 1, data: '2026-10-02', clima: 'chuva', efetivo: 4,
    atividades: 'Içamento do feixe do trocador E-210 suspenso. Equipe só preparou o feixe tubular e organizou o canteiro.',
    ocorrencias: 'Chuva forte pela manhã: içamento cancelado por segurança.', fotos: [foto('#3A3735', 'Canteiro')] },
  { id: 3, obraId: 1, data: '2026-10-01', clima: 'nublado', efetivo: 7,
    atividades: 'Lançamento de cabos até o painel PC-12 e calibração dos transmissores de pressão.',
    ocorrencias: '', fotos: [] },
  { id: 4, obraId: 1, data: '2026-09-30', clima: 'sol', efetivo: 8,
    atividades: 'Desmontagem de andaimes do forno F-101 até a cota 12 m. Revisão dos suportes do rack 3.',
    ocorrencias: 'Permissão de trabalho do forno F-101 não liberada pela operação: equipe parada das 8h às 11h.',
    fotos: [foto('#E1371E', 'Forno F-101'), foto('#5E5A57', 'Rack 3'), foto('#2B2928', 'Andaimes')] },
  { id: 5, obraId: 2, data: '2026-10-03', clima: 'nublado', efetivo: 6,
    atividades: 'Preparação das chapas do fundo do tanque T-405 e conferência do alinhamento da base.',
    ocorrencias: '', fotos: [foto('#5B5754', 'Chapas do fundo')] },
]
