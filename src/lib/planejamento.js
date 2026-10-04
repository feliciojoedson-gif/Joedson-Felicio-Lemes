// Regras do módulo PLANEJAMENTO (Last Planner): EAP, calendário de dias úteis e, nas abas seguintes,
// cronograma, restrições e PPC. Só regra pura: sem React, sem banco, sem `window`. Roda no Node: `node tests/planejamento.mjs`.
// Todas as abas leem a MESMA lista de atividades; o que muda de uma aba para outra é só a visão sobre ela.

// ---------- Vocabulário (um dono só) ----------

export const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
export const DIAS_SEMANA_LONGO = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

export const STATUS_ATIVIDADE = ['a_fazer', 'andamento', 'concluida', 'nao_realizado']
export const ROTULO_STATUS = {
  a_fazer: 'A fazer', andamento: 'Em andamento', concluida: 'Concluída', nao_realizado: 'Não realizado',
}
export const TOM_STATUS = { a_fazer: 'neutral', andamento: 'warn', concluida: 'ok', nao_realizado: 'bad' }

// Feriados nacionais de 2026 (sem ponto facultativo). A pessoa ajusta na tela "Calendário".
export const FERIADOS_NACIONAIS_2026 = [
  '2026-01-01', '2026-04-03', '2026-04-21', '2026-05-01', '2026-09-07',
  '2026-10-12', '2026-11-02', '2026-11-15', '2026-11-20', '2026-12-25',
]
export const calendarioPadrao = () => ({ diasTrabalho: [1, 2, 3, 4, 5], feriados: [...FERIADOS_NACIONAIS_2026] })

// ---------- Datas (AAAA-MM-DD, sem fuso) ----------

const MS_DIA = 86400000
const paraMs = (iso) => {
  const [a, m, d] = iso.split('-').map(Number)
  return Date.UTC(a, m - 1, d)
}
export const somarDias = (iso, n) => new Date(paraMs(iso) + n * MS_DIA).toISOString().slice(0, 10)
export const diaDaSemana = (iso) => new Date(paraMs(iso)).getUTCDay()
export const dataValida = (iso) => /^\d{4}-\d{2}-\d{2}$/.test(iso || '') && !Number.isNaN(paraMs(iso)) && somarDias(iso, 0) === iso

export const ehDiaUtil = (iso, cal) => cal.diasTrabalho.includes(diaDaSemana(iso)) && !cal.feriados.includes(iso)

// Dias úteis de `inicio` a `fim`, os dois contados. Fim antes do início: 0.
export function diasUteis(inicio, fim, cal) {
  if (!dataValida(inicio) || !dataValida(fim) || fim < inicio) return 0
  let n = 0
  for (let d = inicio; d <= fim; d = somarDias(d, 1)) if (ehDiaUtil(d, cal)) n++
  return n
}

export const textoDiasUteis = (n) => `${n} ${n === 1 ? 'dia útil' : 'dias úteis'}`

// ---------- Árvore da EAP ----------

// Lista plana em ordem de leitura, com o código automático (1, 1.1, 1.2.1…), o nível e o nº de filhos.
// O código conta TODOS os irmãos, inclusive arquivados: arquivar e desarquivar nunca renumera ninguém.
export function arvore(atividades) {
  const porPai = new Map()
  for (const a of atividades) {
    const chave = a.parentId ?? null
    if (!porPai.has(chave)) porPai.set(chave, [])
    porPai.get(chave).push(a)
  }
  const saida = []
  const visitar = (pai, prefixo, nivel, arquivadoAcima) => {
    const irmaos = [...(porPai.get(pai) || [])].sort((x, y) => x.ordem - y.ordem || x.id - y.id)
    irmaos.forEach((a, i) => {
      const codigo = prefixo ? `${prefixo}.${i + 1}` : `${i + 1}`
      const arquivadaEfetiva = arquivadoAcima || Boolean(a.arquivada)
      saida.push({ ...a, codigo, nivel, filhos: (porPai.get(a.id) || []).length, arquivadaEfetiva })
      visitar(a.id, codigo, nivel + 1, arquivadaEfetiva)
    })
  }
  visitar(null, '', 0, false)
  return saida
}

// O que as outras abas enxergam: atividades vivas (arquivar um grupo esconde tudo que está dentro dele).
export const atividadesAtivas = (atividades) => arvore(atividades).filter((a) => !a.arquivadaEfetiva)

export function descendentes(atividades, id) {
  const achados = new Set()
  const varrer = (pai) => {
    for (const a of atividades) {
      if (a.parentId === pai && !achados.has(a.id)) {
        achados.add(a.id)
        varrer(a.id)
      }
    }
  }
  varrer(id)
  return achados
}

// Folhas (atividades sem filhos) são as que de fato se executam; grupos só agrupam.
export const folhas = (lista) => lista.filter((a) => a.filhos === 0)

// "Dentro de": qualquer atividade viva, menos ela mesma e o que está dentro dela (senão vira um laço).
export function opcoesDePai(atividades, excluirId) {
  const fora = excluirId ? descendentes(atividades, excluirId) : new Set()
  return atividadesAtivas(atividades)
    .filter((a) => a.id !== excluirId && !fora.has(a.id))
    .map((a) => ({ id: a.id, rotulo: `${a.codigo} ${a.titulo}`, nivel: a.nivel }))
}

// "Posição": os irmãos que já estão naquele pai, para a pessoa escolher "antes de…".
export function opcoesDePosicao(atividades, parentId, excluirId) {
  return atividadesAtivas(atividades)
    .filter((a) => (a.parentId ?? null) === (parentId ?? null) && a.id !== excluirId)
    .map((a) => ({ id: a.id, rotulo: `${a.codigo} ${a.titulo}` }))
}

// ---------- Criar e editar ----------

export function errosAtividade({ titulo, inicio, fim }) {
  const erros = {}
  if (!String(titulo || '').trim()) erros.titulo = 'Informe o título da atividade.'
  if (!inicio) erros.inicio = 'Informe a data de início.'
  else if (!dataValida(inicio)) erros.inicio = 'Data de início inválida.'
  if (!fim) erros.fim = 'Informe a data de fim.'
  else if (!dataValida(fim)) erros.fim = 'Data de fim inválida.'
  else if (inicio && dataValida(inicio) && fim < inicio) erros.fim = 'O fim não pode ser antes do início.'
  return erros
}

// Devolve a lista nova (nunca altera a recebida).
// campos: { titulo, inicio, fim, parentId (número ou null), antesDeId (número ou null = no final) }.
// Sem `id`, cria. Com `id`, edita; só muda de lugar se o pai mudou ou se pediram "antes de…".
export function aplicarAtividade(atividades, campos, id, proximoId) {
  const parentId = campos.parentId ?? null
  const antesDeId = campos.antesDeId ?? null
  const dados = { titulo: campos.titulo.trim(), inicio: campos.inicio, fim: campos.fim }
  const existente = id ? atividades.find((a) => a.id === id) : null
  const mudouDeLugar = !existente || (existente.parentId ?? null) !== parentId || antesDeId !== null

  let lista
  let alvoId
  if (existente) {
    alvoId = existente.id
    lista = atividades.map((a) => (a.id === id ? { ...a, ...dados, parentId } : a))
  } else {
    alvoId = proximoId
    const nova = { id: proximoId, ...dados, parentId, ordem: 0, progresso: 0, status: 'a_fazer', causa: '', arquivada: false, subtarefas: [] }
    lista = [...atividades, nova]
  }
  if (!mudouDeLugar) return lista

  const irmaos = lista
    .filter((a) => (a.parentId ?? null) === parentId && a.id !== alvoId)
    .sort((x, y) => x.ordem - y.ordem || x.id - y.id)
  const alvo = lista.find((a) => a.id === alvoId)
  const pos = antesDeId === null ? -1 : irmaos.findIndex((a) => a.id === antesDeId)
  irmaos.splice(pos < 0 ? irmaos.length : pos, 0, alvo)
  const ordemNova = new Map(irmaos.map((a, i) => [a.id, i]))
  return lista.map((a) => (ordemNova.has(a.id) ? { ...a, ordem: ordemNova.get(a.id) } : a))
}

// Arquivar um grupo esconde o que há dentro; desarquivar traz tudo de volta.
export const arquivarAtividade = (atividades, id, arquivada) =>
  atividades.map((a) => (a.id === id ? { ...a, arquivada } : a))

// ---------- Progresso e situação (grupos são calculados pelas folhas) ----------

// Média ponderada pelos dias úteis de cada folha. Folha devolve o próprio valor; grupo, a média das folhas dentro dele.
function mediaDasFolhas(atividades, id, cal, valorDe) {
  const lista = atividadesAtivas(atividades)
  const alvo = lista.find((a) => a.id === id)
  if (!alvo) return 0
  if (alvo.filhos === 0) return valorDe(alvo)
  const dentro = descendentes(atividades, id)
  return media(folhas(lista).filter((a) => dentro.has(a.id)), cal, valorDe)
}
function media(partes, cal, valorDe) {
  const peso = (a) => Math.max(1, diasUteis(a.inicio, a.fim, cal))
  const total = partes.reduce((s, a) => s + peso(a), 0)
  if (!total) return 0
  return partes.reduce((s, a) => s + valorDe(a) * peso(a), 0) / total
}

// Folha: o % real dela. Grupo: média dos % das folhas, ponderada pelos dias úteis de cada uma.
export const progressoDaAtividade = (atividades, id, cal) => mediaDasFolhas(atividades, id, cal, (a) => a.progresso || 0)

// ---------- Previsto x real (cronograma do longo prazo) ----------

// % que já deveria estar feito hoje: dias úteis completos (até ontem) sobre os dias úteis da atividade.
export function previstoDaFolha(a, hoje, cal) {
  if (hoje <= a.inicio) return 0
  if (hoje > a.fim) return 100
  const total = diasUteis(a.inicio, a.fim, cal)
  if (!total) return 0
  return Math.min(100, (diasUteis(a.inicio, somarDias(hoje, -1), cal) / total) * 100)
}
export const previstoDaAtividade = (atividades, id, hoje, cal) =>
  mediaDasFolhas(atividades, id, cal, (a) => previstoDaFolha(a, hoje, cal))

// A obra toda (folhas vivas): previsto, real e desvio em pontos.
export function resumoDoCronograma(atividades, hoje, cal) {
  const partes = folhas(atividadesAtivas(atividades))
  const real = media(partes, cal, (a) => a.progresso || 0)
  const previsto = media(partes, cal, (a) => previstoDaFolha(a, hoje, cal))
  return { real, previsto, desvio: real - previsto }
}

// Mesmos limites do semáforo das frentes: até 5 pontos de atraso é ok, até 10 é atenção, acima disso é crítico.
export function tomDoDesvio(real, previsto) {
  const desvio = real - previsto
  if (desvio >= -5) return 'ok'
  return desvio >= -10 ? 'warn' : 'bad'
}

export function rotuloDoPrazo(real, tom) {
  if (real >= 100) return 'Concluída'
  return { ok: 'No prazo', warn: 'Atenção', bad: 'Atrasada' }[tom]
}

// ---------- Linha do tempo ----------

export const diasEntreDatas = (de, ate) => Math.round((paraMs(ate) - paraMs(de)) / MS_DIA)
export const segundaDaSemana = (iso) => somarDias(iso, -((diaDaSemana(iso) + 6) % 7))
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

// Colunas da linha do tempo cobrindo de `inicio` a `fim`: semanas (de segunda a domingo) ou meses.
export function colunasDoCronograma(inicio, fim, escala) {
  const colunas = []
  if (escala === 'mes') {
    let [a, m] = inicio.split('-').map(Number)
    for (;;) {
      const de = `${a}-${String(m).padStart(2, '0')}-01`
      if (de > fim) break
      const [a2, m2] = m === 12 ? [a + 1, 1] : [a, m + 1]
      const ate = somarDias(`${a2}-${String(m2).padStart(2, '0')}-01`, -1)
      colunas.push({ inicio: de, fim: ate, rotulo: `${MESES[m - 1]}/${String(a).slice(2)}` })
      ;[a, m] = [a2, m2]
    }
    return colunas
  }
  for (let de = segundaDaSemana(inicio); de <= fim; de = somarDias(de, 7)) {
    const [, m, d] = de.split('-')
    colunas.push({ inicio: de, fim: somarDias(de, 6), rotulo: `${d}/${m}` })
  }
  return colunas
}

// Onde a barra fica na linha do tempo, em % da largura (escala linear em dias corridos).
export function posicaoNaLinha(de, ate, colunas) {
  const t0 = colunas[0].inicio
  const total = diasEntreDatas(t0, somarDias(colunas[colunas.length - 1].fim, 1))
  return {
    esquerda: (diasEntreDatas(t0, de) / total) * 100,
    largura: Math.max(0.6, ((diasEntreDatas(de, ate) + 1) / total) * 100),
  }
}
// O dia de hoje na linha do tempo (% da largura), ou null se estiver fora dela.
export function posicaoDoDia(iso, colunas) {
  const t0 = colunas[0].inicio
  const fimLinha = somarDias(colunas[colunas.length - 1].fim, 1)
  if (iso < t0 || iso >= fimLinha) return null
  return (diasEntreDatas(t0, iso) / diasEntreDatas(t0, fimLinha)) * 100
}

// Obra longa abre por mês, curta por semana (a pessoa troca quando quiser).
export const LIMITE_SEMANAS_INICIAL = 26
export function escalaPadrao(periodo) {
  if (!periodo) return 'semana'
  return colunasDoCronograma(periodo.inicio, periodo.fim, 'semana').length > LIMITE_SEMANAS_INICIAL ? 'mes' : 'semana'
}

// Primeiro e último dia entre as atividades vivas (null se não houver nenhuma).
export function periodoDoCronograma(atividades) {
  const lista = atividadesAtivas(atividades)
  if (!lista.length) return null
  return { inicio: lista.map((a) => a.inicio).sort()[0], fim: lista.map((a) => a.fim).sort().at(-1) }
}

export function statusDaAtividade(atividades, id) {
  const lista = atividadesAtivas(atividades)
  const alvo = lista.find((a) => a.id === id)
  if (!alvo) return 'a_fazer'
  if (alvo.filhos === 0) return alvo.status
  const dentro = descendentes(atividades, id)
  const partes = folhas(lista).filter((a) => dentro.has(a.id))
  if (partes.length && partes.every((a) => a.status === 'concluida')) return 'concluida'
  if (partes.some((a) => a.status === 'andamento' || a.status === 'concluida' || a.progresso > 0)) return 'andamento'
  return 'a_fazer'
}

// ---------- Calendário ----------

export function errosCalendario({ diasTrabalho }) {
  const erros = {}
  if (!diasTrabalho.length) erros.diasTrabalho = 'Marque pelo menos um dia de trabalho.'
  return erros
}

export function errosFeriado(data, feriados) {
  if (!data) return 'Informe a data do feriado.'
  if (!dataValida(data)) return 'Data inválida.'
  if (feriados.includes(data)) return 'Este feriado já está na lista.'
  return null
}

export const ordenarFeriados = (feriados) => [...feriados].sort()

// Ao importar, "substituir" recomeça os ids das atividades em 1: restrição antiga ficaria presa a uma atividade nova sem relação.
// "Adicionar" mantém os ids existentes, então as restrições continuam valendo.
export const restricoesDaImportacao = (restricoes, modo) => (modo === 'substituir' ? [] : restricoes)

// ---------- Médio prazo: lookahead de restrições ----------

// Tipos de restrição (um dono só). `chave` vira classe de cor; `icone` é um caminho do componente Icone.
export const TIPOS_RESTRICAO_PLAN = [
  { chave: 'material', rotulo: 'Material', icone: 't-material' },
  { chave: 'mao-de-obra', rotulo: 'Mão de Obra', icone: 't-mao' },
  { chave: 'metodo', rotulo: 'Método', icone: 't-metodo' },
  { chave: 'equipamento', rotulo: 'Equipamento', icone: 't-equip' },
  { chave: 'projeto', rotulo: 'Projeto', icone: 't-projeto' },
  { chave: 'seguranca', rotulo: 'Segurança', icone: 't-seguranca' },
  { chave: 'logistica', rotulo: 'Logística', icone: 't-logistica' },
]
export const tipoDaRestricao = (rotulo) => TIPOS_RESTRICAO_PLAN.find((t) => t.rotulo === rotulo) || TIPOS_RESTRICAO_PLAN[0]
export const OPCOES_SEMANAS = [3, 4, 5, 6]
export const SEMANAS_PADRAO = 4

// A semana que o planejamento trata como "atual": a de hoje, mas sábado e domingo já olham para a semana que começa na segunda.
export function segundaDeReferencia(hoje) {
  const dia = diaDaSemana(hoje)
  return segundaDaSemana(dia === 0 ? somarDias(hoje, 1) : dia === 6 ? somarDias(hoje, 2) : hoje)
}

// As semanas do horizonte, de segunda a domingo, começando na semana atual.
export function semanasDoLookahead(hoje, quantidade) {
  const primeira = segundaDeReferencia(hoje)
  return Array.from({ length: quantidade }, (_, i) => {
    const inicio = somarDias(primeira, i * 7)
    const fim = somarDias(inicio, 6)
    const curto = (iso) => iso.slice(8) + '/' + iso.slice(5, 7)
    return { indice: i, inicio, fim, rotulo: `Semana ${i + 1}`, periodo: `${curto(inicio)} a ${curto(fim)}`, atual: i === 0 }
  })
}

export function errosRestricao({ atividadeId, descricao, tipo, prazo, responsavel }, hoje, nova) {
  const erros = {}
  if (!atividadeId) erros.atividadeId = 'Escolha a atividade que a restrição impede.'
  if (!String(descricao || '').trim()) erros.descricao = 'Descreva a restrição.'
  if (!TIPOS_RESTRICAO_PLAN.some((t) => t.rotulo === tipo)) erros.tipo = 'Escolha o tipo da restrição.'
  if (!prazo) erros.prazo = 'Informe o prazo de resolução.'
  else if (!dataValida(prazo)) erros.prazo = 'Prazo inválido.'
  else if (nova && prazo < hoje) erros.prazo = 'O prazo não pode ser antes de hoje.'
  if (!String(responsavel || '').trim()) erros.responsavel = 'Informe o responsável.'
  return erros
}

// Cria (sem `id`) ou edita uma restrição. Devolve a lista nova.
export function aplicarRestricao(restricoes, campos, id, proximoId) {
  const dados = {
    atividadeId: Number(campos.atividadeId), descricao: campos.descricao.trim(), tipo: campos.tipo, prazo: campos.prazo,
    responsavel: campos.responsavel.trim(),
  }
  if (id) return restricoes.map((r) => (r.id === id ? { ...r, ...dados } : r))
  return [...restricoes, { id: proximoId, ...dados, resolvida: false, resolvidaEm: null }]
}

export const resolverRestricao = (restricoes, id, resolvida, hoje) =>
  restricoes.map((r) => (r.id === id ? { ...r, resolvida, resolvidaEm: resolvida ? hoje : null } : r))

export const reprogramarRestricao = (restricoes, id, prazo) =>
  restricoes.map((r) => (r.id === id ? { ...r, prazo } : r))

// Em qual coluna do board a restrição está: 'atrasadas' (prazo numa semana que já passou, ainda aberta),
// o índice da semana, ou null (prazo além do horizonte visível).
export function colunaDaRestricao(r, semanas) {
  const atual = semanas[0].inicio
  if (r.prazo < atual) return r.resolvida ? null : 'atrasadas'
  const semana = semanas.find((s) => r.prazo >= s.inicio && r.prazo <= s.fim)
  return semana ? semana.indice : null
}

// Para onde a seta leva o prazo: mesma posição na semana vizinha (quinta continua quinta).
// A partir de "atrasadas", a seta para frente leva à semana atual. Devolve null onde a seta não vale.
export function prazoMovido(r, direcao, semanas) {
  const coluna = colunaDaRestricao(r, semanas)
  if (coluna === null) return null
  if (coluna === 'atrasadas') {
    if (direcao < 0) return null
    return somarDias(semanas[0].inicio, diasEntreDatas(segundaDaSemana(r.prazo), r.prazo))
  }
  const destino = coluna + direcao
  if (destino < 0 || destino >= semanas.length) return null
  return somarDias(r.prazo, direcao * 7)
}

// O que o board mostra, só de atividades vivas (arquivar uma atividade esconde as restrições dela).
// Filtros: responsável (texto exato ou '') e mostrar resolvidas. `alem` conta as abertas fora do horizonte.
export function montarLookahead(restricoes, atividades, semanas, { responsavel = '', resolvidas = false } = {}) {
  const vivas = new Map(atividadesAtivas(atividades).map((a) => [a.id, a]))
  const colunas = { atrasadas: [], semanas: semanas.map(() => []) }
  let alem = 0
  const ordenadas = [...restricoes].sort((x, y) => x.prazo.localeCompare(y.prazo) || x.id - y.id)
  for (const r of ordenadas) {
    const atividade = vivas.get(r.atividadeId)
    if (!atividade) continue
    if (responsavel && r.responsavel !== responsavel) continue
    if (r.resolvida && !resolvidas) continue
    const item = { ...r, atividade }
    if (r.resolvida) {
      // Resolvida fica na semana do prazo (ou em "atrasadas" se o prazo já passou, só para a pessoa conferir).
      const semana = semanas.find((s) => r.prazo >= s.inicio && r.prazo <= s.fim)
      if (semana) colunas.semanas[semana.indice].push(item)
      else if (r.prazo < semanas[0].inicio) colunas.atrasadas.push(item)
      else alem++
      continue
    }
    const coluna = colunaDaRestricao(r, semanas)
    if (coluna === 'atrasadas') colunas.atrasadas.push(item)
    else if (coluna === null) alem++
    else colunas.semanas[coluna].push(item)
  }
  return { ...colunas, alem }
}

export function contadoresDeRestricoes(restricoes, atividades, hoje) {
  const vivas = new Set(atividadesAtivas(atividades).map((a) => a.id))
  const dasVivas = restricoes.filter((r) => vivas.has(r.atividadeId))
  const abertas = dasVivas.filter((r) => !r.resolvida)
  return {
    abertas: abertas.length,
    vencidas: abertas.filter((r) => r.prazo < hoje).length,
    resolvidas: dasVivas.length - abertas.length,
  }
}

// Quantas restrições abertas cada atividade tem (a EAP mostra um aviso nas que têm).
export function restricoesAbertasPorAtividade(restricoes) {
  const mapa = new Map()
  for (const r of restricoes) if (!r.resolvida) mapa.set(r.atividadeId, (mapa.get(r.atividadeId) || 0) + 1)
  return mapa
}

export const responsaveisDasRestricoes = (restricoes) => [...new Set(restricoes.map((r) => r.responsavel))].sort((a, b) => a.localeCompare(b, 'pt-BR'))

// ---------- Curto prazo: Kanban da semana e PPC ----------

export const COLUNAS_CURTO = [
  { id: 'a_fazer', rotulo: 'A Fazer' },
  { id: 'andamento', rotulo: 'Em Andamento' },
  { id: 'concluida', rotulo: 'Concluído' },
]
// Causas raiz do que não foi feito (o PPC só melhora quando se ataca a causa).
export const CAUSAS_RAIZ = ['Material', 'Projeto', 'Mão de obra', 'Equipamento', 'Método', 'Clima', 'Segurança', 'Logística', 'Predecessora atrasada', 'Outro']

// "Não realizado" não tem coluna própria: o cartão fica em A Fazer, marcado em vermelho com a causa.
export const colunaDoStatus = (status) => (status === 'nao_realizado' ? 'a_fazer' : status)

export function semanaPorInicio(inicio) {
  const fim = somarDias(inicio, 6)
  const curto = (iso) => iso.slice(8) + '/' + iso.slice(5, 7)
  return { inicio, fim, periodo: `${curto(inicio)} a ${curto(fim)}` }
}
export const semanaAtual = (hoje) => semanaPorInicio(segundaDeReferencia(hoje))

export function errosCausa({ causa, detalhe }) {
  const erros = {}
  if (!CAUSAS_RAIZ.includes(causa)) erros.causa = 'Informe a causa raiz.'
  else if (causa === 'Outro' && !String(detalhe || '').trim()) erros.detalhe = 'Descreva a causa.'
  return erros
}
export const errosSubtarefa = (titulo) => (String(titulo || '').trim() ? {} : { titulo: 'Informe o nome da subtarefa.' })

export function percentualDasSubtarefas(subtarefas) {
  if (!subtarefas?.length) return null
  return Math.round((subtarefas.filter((s) => s.feita).length / subtarefas.length) * 100)
}

// Mantém a atividade coerente com o checklist: o % real vem das subtarefas, a primeira marcada tira da fila de "a fazer",
// e uma atividade concluída que ganha subtarefa pendente volta a andamento.
export function recalcularAtividade(a) {
  const pct = percentualDasSubtarefas(a.subtarefas)
  if (pct === null) return a
  const r = { ...a, progresso: pct }
  if (r.status === 'concluida' && pct < 100) { r.status = 'andamento'; r.concluidaEm = null }
  if (r.status === 'a_fazer' && pct > 0) r.status = 'andamento'
  return r
}

export const subtarefasPendentes = (a) => (a.subtarefas || []).filter((s) => !s.feita).length

// Move a atividade de coluna (ou para "não realizado", que exige causa). Devolve a atividade nova.
export function moverAtividade(a, destino, { causa = '', detalhe = '' } = {}, hoje) {
  const pct = percentualDasSubtarefas(a.subtarefas)
  const limpa = { causa: '', causaDetalhe: '' }
  switch (destino) {
    case 'a_fazer':
      return { ...a, ...limpa, status: 'a_fazer', concluidaEm: null, progresso: pct ?? 0 }
    case 'andamento':
      return { ...a, ...limpa, status: 'andamento', concluidaEm: null, progresso: pct ?? (a.progresso > 0 && a.progresso < 100 ? a.progresso : 10) }
    case 'concluida':
      return {
        ...a, ...limpa, status: 'concluida', progresso: 100, concluidaEm: hoje,
        subtarefas: (a.subtarefas || []).map((s) => ({ ...s, feita: true, naoRealizado: false, causa: '', causaDetalhe: '' })),
      }
    case 'nao_realizado':
      return { ...a, status: 'nao_realizado', causa, causaDetalhe: detalhe.trim(), concluidaEm: null, progresso: a.progresso >= 100 ? (pct ?? 90) : a.progresso }
    default:
      return a
  }
}

export function novaSubtarefa(a, titulo) {
  const id = Math.max(0, ...(a.subtarefas || []).map((s) => s.id)) + 1
  return recalcularAtividade({ ...a, subtarefas: [...(a.subtarefas || []), { id, titulo: titulo.trim(), feita: false, naoRealizado: false, causa: '', causaDetalhe: '' }] })
}
export const alternarSubtarefa = (a, id, feita) => recalcularAtividade({
  ...a, subtarefas: a.subtarefas.map((s) => (s.id === id ? { ...s, feita, naoRealizado: false, causa: '', causaDetalhe: '' } : s)),
})
export const naoRealizarSubtarefa = (a, id, causa, detalhe) => recalcularAtividade({
  ...a, subtarefas: a.subtarefas.map((s) => (s.id === id ? { ...s, feita: false, naoRealizado: true, causa, causaDetalhe: String(detalhe || '').trim() } : s)),
})
export const removerSubtarefa = (a, id) => recalcularAtividade({ ...a, subtarefas: a.subtarefas.filter((s) => s.id !== id) })

// Regra da semana: a atividade entra se o período dela cruza a semana OU se deveria ter terminado antes da semana e ainda
// não terminou (acumulada). Concluída antes da semana já saiu da fila. Sábado e domingo contam para a semana seguinte.
// `feita` = concluída dentro desta semana. Só atividades que se executam (folhas vivas).
export function atividadesDaSemana(atividades, semana) {
  return folhas(atividadesAtivas(atividades)).flatMap((a) => {
    const concluidaEm = a.status === 'concluida' ? segundaDeReferencia(a.concluidaEm || a.fim) : null
    if (concluidaEm && concluidaEm < semana.inicio) return []
    const cruza = a.inicio <= semana.fim && a.fim >= semana.inicio
    const acumulada = a.fim < semana.inicio
    if (!cruza && !acumulada) return []
    return [{ ...a, acumulada, feita: concluidaEm === semana.inicio }]
  })
}

// PPC = concluídas / planejadas da semana x 100. Sem nada planejado, null (não existe PPC de semana vazia).
export function ppcDaSemana(itens) {
  const feitas = itens.filter((i) => i.feita).length
  return { total: itens.length, feitas, ppc: itens.length ? (feitas / itens.length) * 100 : null }
}

// Em qual coluna o cartão aparece naquela semana. Concluída em outra semana não conta como concluída nesta.
export function colunaNaSemana(item) {
  if (item.feita) return 'concluida'
  if (item.status === 'concluida') return item.progresso > 0 ? 'andamento' : 'a_fazer'
  return colunaDoStatus(item.status)
}

// PPC das últimas semanas (da primeira com atividade até a atual), só as que tinham algo planejado.
export function historicoPPC(atividades, hoje, maximo = 8) {
  const vivas = folhas(atividadesAtivas(atividades))
  if (!vivas.length) return []
  const atual = semanaAtual(hoje).inicio
  const primeira = segundaDeReferencia(vivas.map((a) => a.inicio).sort()[0])
  const lista = []
  for (let inicio = primeira; inicio <= atual; inicio = somarDias(inicio, 7)) {
    const semana = semanaPorInicio(inicio)
    const resumo = ppcDaSemana(atividadesDaSemana(atividades, semana))
    if (resumo.total) lista.push({ ...semana, ...resumo })
  }
  return lista.slice(-maximo)
}

// Causas dos itens não realizados na semana (atividades e subtarefas), da mais frequente para a menos.
export function causasDaSemana(itens) {
  const contagem = new Map()
  const somar = (causa) => causa && contagem.set(causa, (contagem.get(causa) || 0) + 1)
  for (const i of itens) {
    if (i.status === 'nao_realizado') somar(i.causa)
    for (const s of i.subtarefas || []) if (s.naoRealizado) somar(s.causa)
  }
  return [...contagem].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'))
}
