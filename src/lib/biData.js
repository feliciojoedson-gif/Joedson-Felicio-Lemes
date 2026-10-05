// MOTOR ADAPTATIVO dos Relatórios (BI): transforma o que cada módulo tem em séries prontas para os gráficos.
// Regras puras (sem React, sem banco, sem window), testadas em tests/biData.mjs.
//
// REGRA DE OURO: funciona com QUALQUER combinação de módulos. Módulo ausente ou vazio devolve `null` (o painel mostra
// "Painel bloqueado"); nenhuma função aqui devolve NaN, Infinity ou lança por falta de dado.
import {
  atividadesAtivas, calendarioPadrao, causasDaSemana, diasUteis, folhas, historicoPPC, previstoDaFolha, segundaDaSemana, somarDias,
} from './planejamento.js'
import { COLUNAS_MATERIAL, diasEntre, estaAtrasado, formatarData, hojeEmBrasilia, leadTimeDias } from './regras.js'
import { percentualConforme, progressoVistoria, rankingDesperdicios, tomConformidade } from './qualidade.js'
import { COLUNAS_CONTRATO, medidoDoContrato, mostraMedido, saldoDoContrato } from './empreiteiros.js'

// ---------- Módulos (nomes que o estado vazio mostra) ----------

export const MODULOS = {
  planejamento: 'Planejamento',
  diario: 'Diário de Obra',
  materiais: 'Materiais',
  contratos: 'Medições (Empreiteiros)',
  pendencias: 'Qualidade (Pendências)',
  fvs: 'Qualidade (FVS)',
  gemba: 'Qualidade (Gemba Walk)',
}

const lista = (x) => (Array.isArray(x) ? x : [])
const num = (n) => (Number.isFinite(Number(n)) ? Number(n) : 0)
export const arredondar = (n) => Math.round(num(n))
export const pct = (parte, total) => (total > 0 ? Math.round((num(parte) / total) * 100) : 0)

// Atividades que se executam (folhas vivas), soltas da árvore: sem `parentId`, para as funções do Planejamento
// aceitarem a lista filtrada sem perder ninguém.
export const folhasVivas = (atividades) =>
  folhas(atividadesAtivas(lista(atividades))).map((a) => ({ ...a, parentId: null }))

// ---------- Quais módulos têm dado ----------

export function modulosDisponiveis(f) {
  return {
    planejamento: folhasVivas(f.atividades).length > 0,
    diario: lista(f.rdo).length > 0,
    materiais: lista(f.pedidos).length > 0,
    contratos: lista(f.contratos).length > 0,
    pendencias: lista(f.pendencias).length > 0,
    fvs: lista(f.vistorias).length > 0,
    gemba: lista(f.gemba).length > 0,
    // estoque é opcional: só existe se alguém construir o módulo (arrays `insumos` e `movimentos`)
    estoque: lista(f.insumos).length > 0,
  }
}

// ---------- Filtros cruzados ----------

export const PERIODOS = [['tudo', 'Tudo'], ['mes', 'Este mês'], ['4semanas', 'Últimas 4 semanas']]
export const FILTROS_INICIAIS = { empresa: '', periodo: 'tudo' }

// Intervalo { de, ate } em AAAA-MM-DD, ou null para "Tudo".
export function intervaloDoPeriodo(periodo, hoje) {
  if (periodo === 'mes') {
    const [a, m] = hoje.split('-').map(Number)
    const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate()
    return { de: `${hoje.slice(0, 7)}-01`, ate: `${hoje.slice(0, 7)}-${String(ultimo).padStart(2, '0')}` }
  }
  if (periodo === '4semanas') return { de: somarDias(hoje, -27), ate: hoje }
  return null
}
export const noIntervalo = (data, intervalo) => !intervalo || (Boolean(data) && data >= intervalo.de && data <= intervalo.ate)

export function rotuloDoPeriodo(periodo) {
  return (PERIODOS.find(([k]) => k === periodo) || PERIODOS[0])[1]
}

// Todas as empresas que aparecem nos dados, em ordem alfabética.
export function empresasPresentes(f) {
  const nomes = new Set()
  const somar = (n) => { const t = String(n || '').trim(); if (t) nomes.add(t) }
  lista(f.atividades).forEach((a) => somar(a.empresa))
  lista(f.contratos).forEach((c) => somar(c.empreiteiro))
  lista(f.pendencias).forEach((p) => somar(p.empresa))
  lista(f.vistorias).forEach((v) => somar(v.empresa))
  lista(f.ncs).forEach((n) => somar(n.empresa))
  lista(f.gemba).forEach((g) => somar(g.empresa))
  return [...nomes].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

// Aplica EMPRESA e PERÍODO a todas as fontes de uma vez. Devolve as mesmas fontes, já recortadas.
// Empresa: atividades, contratos, pendências, vistorias, NCs e Gemba (os que têm empresa). Diário e Materiais são da obra toda.
// Período: só o que tem data (diário, pedidos, medições, pendências, vistorias, NCs). Estado de hoje (evolução, prazo) não muda.
export function aplicarFiltros(f, { empresa = '', periodo = 'tudo' } = {}, hoje) {
  const intervalo = intervaloDoPeriodo(periodo, hoje)
  const daEmpresa = (nome) => !empresa || nome === empresa
  const contratos = lista(f.contratos).filter((c) => daEmpresa(c.empreiteiro))
  const idsContratos = new Set(contratos.map((c) => c.id))
  return {
    ...f,
    atividades: folhasVivas(f.atividades).filter((a) => daEmpresa(a.empresa)),
    rdo: lista(f.rdo).filter((r) => noIntervalo(r.data, intervalo)),
    pedidos: lista(f.pedidos).filter((p) => noIntervalo(p.historico?.[0]?.data, intervalo)),
    contratos,
    boletins: lista(f.boletins).filter((b) => idsContratos.has(b.contratoId) && noIntervalo(b.data, intervalo)),
    // o saldo e o % medido precisam do histórico inteiro dos contratos: `boletinsTodos` não é cortado pelo período
    boletinsTodos: lista(f.boletins).filter((b) => idsContratos.has(b.contratoId)),
    pendencias: lista(f.pendencias).filter((p) => daEmpresa(p.empresa) && noIntervalo(p.dataVistoria, intervalo)),
    vistorias: lista(f.vistorias).filter((v) => daEmpresa(v.empresa) && noIntervalo(v.criadaEm, intervalo)),
    ncs: lista(f.ncs).filter((n) => daEmpresa(n.empresa) && noIntervalo(n.abertaEm, intervalo)),
    gemba: lista(f.gemba).filter((g) => daEmpresa(g.empresa)),
  }
}

// O que os filtros NÃO alcançam, para a tela avisar em vez de deixar a pessoa achar que filtrou.
export function avisosDosFiltros({ empresa = '', periodo = 'tudo' } = {}) {
  const avisos = []
  if (empresa) avisos.push('Diário de Obra e Materiais são da obra toda: não filtram por empresa.')
  if (periodo !== 'tudo') avisos.push('Período vale só para o que tem data: evolução, prazo, saldo e Gemba mostram a situação de hoje.')
  return avisos
}

// ---------- PAINEL 1 — Executivo ----------

const pesoDe = (a, cal) => Math.max(1, diasUteis(a.inicio, a.fim, cal))
const mediaPonderada = (partes, cal, valorDe) => {
  const total = partes.reduce((s, a) => s + pesoDe(a, cal), 0)
  return total ? partes.reduce((s, a) => s + valorDe(a) * pesoDe(a, cal), 0) / total : 0
}
const dataDaConclusao = (a) => (a.status === 'concluida' ? a.concluidaEm || a.fimReal || a.fim : null)

// Cor do desvio (mesmos limites do semáforo do app): até 5 pontos de atraso é ok, até 10 atenção, acima crítico.
const tomDoDesvio = (desvio) => (desvio >= -5 ? 'ok' : desvio >= -10 ? 'warn' : 'bad')

export function evolucao(v, hoje) {
  const partes = lista(v.atividades)
  if (!partes.length) return null
  const cal = v.calendario || calendarioPadrao()
  const real = arredondar(mediaPonderada(partes, cal, (a) => num(a.progresso)))
  const previsto = arredondar(mediaPonderada(partes, cal, (a) => previstoDaFolha(a, hoje, cal)))
  return { real, previsto, desvio: real - previsto, tom: tomDoDesvio(real - previsto) }
}

// Dias até o fim contratual (negativo = já venceu). Sem data da obra: null.
export function prazo(obra, hoje) {
  const fim = obra?.data_fim_contratual
  if (!fim) return null
  const dias = diasEntre(hoje, fim)
  return { fim, dias, atrasado: dias < 0, tom: dias < 0 ? 'bad' : dias <= 14 ? 'warn' : 'ok' }
}

// R$ medido nos contratos (todos os boletins lançados) e quanto isso é do valor contratado.
export function custoMedido(v) {
  const contratos = lista(v.contratos).filter((c) => ['ativo', 'concluido'].includes(c.status))
  if (!lista(v.contratos).length) return null
  const boletins = lista(v.boletins)
  const medido = contratos.reduce((s, c) => s + num(medidoDoContrato(c, boletins)), 0)
  const total = contratos.reduce((s, c) => s + num(c.valorTotal), 0)
  return { medido, total, pct: pct(medido, total), contratos: contratos.length }
}

// Curva S: uma linha por semana (segunda a domingo), do início do cronograma até o fim (ou hoje, o que for depois).
// plan = % planejado acumulado no fim da semana. real = % acumulado do que estava concluído até o fim da semana;
// na semana de hoje, o real é o avanço de verdade (igual ao KPI). Semanas futuras: real = null (a linha para em hoje).
export function curvaS(v, hoje, intervalo = null) {
  const partes = lista(v.atividades)
  if (!partes.length) return null
  const cal = v.calendario || calendarioPadrao()
  const inicioDe = partes.map((a) => a.inicio).sort()[0]
  const fimDe = partes.map((a) => a.fim).sort().slice(-1)[0]
  const primeira = segundaDaSemana(inicioDe)
  const atual = segundaDaSemana(hoje)
  const ultima = segundaDaSemana(fimDe > hoje ? fimDe : hoje)
  const semanas = []
  for (let inicio = primeira; inicio <= ultima; inicio = somarDias(inicio, 7)) {
    const fim = somarDias(inicio, 6)
    const plan = arredondar(mediaPonderada(partes, cal, (a) => previstoDaFolha(a, somarDias(fim, 1), cal)))
    let real = null
    if (inicio < atual) real = arredondar(mediaPonderada(partes, cal, (a) => (dataDaConclusao(a) && dataDaConclusao(a) <= fim ? 100 : 0)))
    else if (inicio === atual) real = arredondar(mediaPonderada(partes, cal, (a) => num(a.progresso)))
    semanas.push({ inicio, fim, plan, real, atual: inicio === atual })
  }
  const visiveis = intervalo ? semanas.filter((s) => s.fim >= intervalo.de && s.inicio <= intervalo.ate) : semanas
  return visiveis.length ? { semanas: visiveis } : null
}

// PPC por semana (concluídas / planejadas) e o geral (soma de todas as semanas, não a média dos %).
export function ppcSemanal(v, hoje, intervalo = null) {
  const partes = lista(v.atividades)
  if (!partes.length) return null
  const todas = historicoPPC(partes, hoje, 520)
  const semanas = (intervalo ? todas.filter((s) => s.fim >= intervalo.de && s.inicio <= intervalo.ate) : todas)
    .map((s) => ({ inicio: s.inicio, fim: s.fim, periodo: s.periodo, feitas: s.feitas, total: s.total, naoFeitas: s.total - s.feitas, ppc: arredondar(s.ppc) }))
  if (!semanas.length) return null
  const feitas = semanas.reduce((s, x) => s + x.feitas, 0)
  const total = semanas.reduce((s, x) => s + x.total, 0)
  return { semanas, feitas, total, ppc: pct(feitas, total) }
}

// Resumo do cockpit: cada pedaço é null quando o módulo dele não tem dado (o painel mostra só o que dá).
export function executivo(v, hoje, obra, intervalo = null) {
  return {
    evolucao: evolucao(v, hoje),
    prazo: prazo(obra, hoje),
    custo: custoMedido(v),
    curva: curvaS(v, hoje, intervalo),
    ppc: ppcSemanal(v, hoje, intervalo),
  }
}

// Causas raiz das tarefas "não realizadas" (atividades e subtarefas), da maior para a menor. Usado também no Painel 2.
export function paretoDeCausas(v) {
  const partes = lista(v.atividades)
  if (!partes.length) return null
  const causas = causasDaSemana(partes).map(([nome, qtd]) => ({ nome, qtd }))
  return causas.length ? { causas, total: causas.reduce((s, c) => s + c.qtd, 0) } : null
}


// ---------- PAINEL 2 — Ritmo & Produção ----------

// Efetivo por dia do Diário de Obra e o clima de cada dia (do mais antigo para o mais novo).
// "Parado" = dia de chuva: o efetivo despenca e o gráfico mostra o fundo azulado.
export function climaEfetivo(v) {
  const dias = lista(v.rdo)
    .filter((r) => r.data)
    .map((r) => ({ data: r.data, clima: r.clima, efetivo: Math.max(0, num(r.efetivo)), chuva: r.clima === 'chuva' }))
    .sort((a, b) => a.data.localeCompare(b.data))
  if (!dias.length) return null
  const media = (lst) => (lst.length ? Math.round(lst.reduce((s, d) => s + d.efetivo, 0) / lst.length) : 0)
  return {
    dias,
    diasChuva: dias.filter((d) => d.chuva).length,
    mediaGeral: media(dias),
    mediaSemChuva: media(dias.filter((d) => !d.chuva)),
    mediaComChuva: media(dias.filter((d) => d.chuva)),
    maxEfetivo: Math.max(1, ...dias.map((d) => d.efetivo)),
  }
}

export function ritmo(v, hoje, intervalo = null) {
  return { ppc: ppcSemanal(v, hoje, intervalo), pareto: paretoDeCausas(v), clima: climaEfetivo(v) }
}

// ---------- PAINEL 3 — Contratos & Medições (financeiro) ----------

const reais = (n) => Math.round(num(n) * 100) / 100

// Fluxo dos contratos (as 4 etapas do Kanban), matriz por empreiteiro e saldo a medir por contrato.
// O % medido e o saldo usam TODOS os boletins do contrato (o filtro de período não corta o saldo).
export function financeiro(v) {
  const contratos = lista(v.contratos)
  if (!contratos.length) return null
  const boletins = lista(v.boletinsTodos ?? v.boletins)
  const fluxo = COLUNAS_CONTRATO.map((c) => {
    const doStatus = contratos.filter((x) => x.status === c.id)
    return { id: c.id, rotulo: c.rotulo, qtd: doStatus.length, valor: reais(doStatus.reduce((s, x) => s + num(x.valorTotal), 0)) }
  })
  const medidos = contratos.filter(mostraMedido)
  const porEmpreiteiro = new Map()
  for (const c of medidos) {
    const atual = porEmpreiteiro.get(c.empreiteiro) || { empreiteiro: c.empreiteiro, valor: 0, medido: 0, contratos: 0 }
    atual.valor += num(c.valorTotal)
    atual.medido += num(medidoDoContrato(c, boletins))
    atual.contratos += 1
    porEmpreiteiro.set(c.empreiteiro, atual)
  }
  const matriz = [...porEmpreiteiro.values()]
    .map((e) => ({ ...e, valor: reais(e.valor), medido: reais(e.medido), pct: pct(e.medido, e.valor), saldo: reais(Math.max(0, e.valor - e.medido)) }))
    .sort((a, b) => b.saldo - a.saldo || a.empreiteiro.localeCompare(b.empreiteiro, 'pt-BR'))
  const saldos = contratos.filter((c) => c.status === 'ativo')
    .map((c) => ({ id: c.id, rotulo: `${c.empreiteiro}${c.descricao ? ` · ${c.descricao}` : ''}`, saldo: reais(saldoDoContrato(c, boletins)) }))
    .sort((a, b) => b.saldo - a.saldo)
  return { fluxo, matriz, saldos, saldoTotal: reais(saldos.reduce((s, x) => s + x.saldo, 0)) }
}

// ---------- PAINEL 4 — Materiais ----------

// Pedidos por etapa, atrasados, lead time médio (pedido -> almoxarifado) e a tendência das últimas 4 semanas.
// O estoque (`insumos` e `movimentos`) é opcional: sem ele, `estoque` fica null e a tela não mostra nada.
export function materiais(v, hoje, catalogo = []) {
  const pedidos = lista(v.pedidos)
  if (!pedidos.length) return null
  const nomes = new Map(lista(catalogo).map((m) => [m.id, m.nome]))
  const etapas = COLUNAS_MATERIAL.map((c) => {
    const daEtapa = pedidos.filter((p) => p.status === c.id)
    return { id: c.id, rotulo: c.rotulo, qtd: daEtapa.length, criticos: daEtapa.filter((p) => p.prioridade === 'critico').length }
  })
  const atrasados = pedidos.filter((p) => estaAtrasado(p, hoje))
    .map((p) => ({
      id: p.id, material: nomes.get(p.materialId) || 'Material', frente: p.frente, fornecedor: p.fornecedor || '',
      dias: diasEntre(p.previsaoEntrega, hoje), critico: p.prioridade === 'critico',
    }))
    .sort((a, b) => b.dias - a.dias)
  const lead = (lst) => {
    const dias = lst.map(leadTimeDias).filter((d) => d !== null && d >= 0)
    return dias.length ? { media: Math.round((dias.reduce((s, d) => s + d, 0) / dias.length) * 10) / 10, qtd: dias.length } : null
  }
  const chegada = (p) => p.historico?.find((h) => h.status === 'almoxarifado')?.data
  const atual = segundaDaSemana(hoje)
  const tendencia = [3, 2, 1, 0].map((atras) => {
    const inicio = somarDias(atual, -7 * atras)
    const fim = somarDias(inicio, 6)
    const l = lead(pedidos.filter((p) => chegada(p) && chegada(p) >= inicio && chegada(p) <= fim))
    return { inicio, media: l ? l.media : null, qtd: l ? l.qtd : 0 }
  })
  const geral = lead(pedidos)
  const comMedia = tendencia.filter((t) => t.media !== null)
  const variacao = comMedia.length >= 2 ? Math.round((comMedia[comMedia.length - 1].media - comMedia[0].media) * 10) / 10 : null
  return { etapas, atrasados, leadTime: geral, tendencia, variacao, estoque: estoque(v, hoje) }
}

// Só existe se alguém construir o módulo de estoque: insumos com saldo <= mínimo e entradas x saídas por semana.
function estoque(v, hoje) {
  const insumos = lista(v.insumos)
  if (!insumos.length) return null
  const alertas = insumos.filter((i) => num(i.saldo) <= num(i.minimo))
    .map((i) => ({ id: i.id, nome: i.nome, saldo: num(i.saldo), minimo: num(i.minimo), unidade: i.unidade || '' }))
  const movimentos = lista(v.movimentos)
  const atual = segundaDaSemana(hoje)
  const semanas = [3, 2, 1, 0].map((atras) => {
    const inicio = somarDias(atual, -7 * atras)
    const fim = somarDias(inicio, 6)
    const dela = movimentos.filter((m) => m.data >= inicio && m.data <= fim)
    const soma = (tipo) => dela.filter((m) => m.tipo === tipo).reduce((s, m) => s + num(m.quantidade), 0)
    return { inicio, entradas: soma('entrada'), saidas: soma('saida') }
  })
  return { alertas, semanas }
}

// ---------- PAINEL 5 — Qualidade & Entrega ----------

// % conforme por modelo de FVS (ok / (ok + nc), N.A. fora da conta), do pior para o melhor: a barra baixa é o serviço com retrabalho.
export function conformePorModelo(v) {
  const vistorias = lista(v.vistorias)
  if (!vistorias.length) return null
  const porModelo = new Map()
  for (const vis of vistorias) {
    const p = progressoVistoria(vis)
    const nome = vis.modeloNome || 'Sem modelo'
    const a = porModelo.get(nome) || { nome, ok: 0, nc: 0, vistorias: 0 }
    a.ok += p.ok
    a.nc += p.nc
    a.vistorias += 1
    porModelo.set(nome, a)
  }
  const modelos = [...porModelo.values()].map((m) => {
    const conforme = percentualConforme(m.ok, m.nc)
    return { ...m, conforme, tom: tomConformidade(conforme) }
  }).sort((a, b) => (a.conforme ?? 101) - (b.conforme ?? 101) || a.nome.localeCompare(b.nome, 'pt-BR'))
  return { modelos, ncsAbertas: lista(v.ncs).filter((n) => n.status !== 'fechada').length }
}

const abertas = (v) => lista(v.pendencias).filter((p) => p.status !== 'resolvido')

// Pendências em aberto por empresa: quem cobrar antes de liberar o pagamento do mês.
export function pendenciasPorEmpresa(v) {
  const todas = lista(v.pendencias)
  if (!todas.length) return null
  const contagem = new Map()
  for (const p of abertas(v)) contagem.set(p.empresa || 'Sem empresa', (contagem.get(p.empresa || 'Sem empresa') || 0) + 1)
  const empresas = [...contagem].map(([nome, qtd]) => ({ nome, qtd }))
    .sort((a, b) => b.qtd - a.qtd || a.nome.localeCompare(b.nome, 'pt-BR'))
  return { empresas, total: empresas.reduce((s, e) => s + e.qtd, 0), resolvidas: todas.length - abertas(v).length }
}

// Treemap: pendências em aberto por local. O bloco maior é o local mais problemático.
export function mapaDePendencias(v) {
  const todas = lista(v.pendencias)
  if (!todas.length) return null
  const contagem = new Map()
  for (const p of abertas(v)) contagem.set(p.local || 'Sem local', (contagem.get(p.local || 'Sem local') || 0) + 1)
  const locais = [...contagem].map(([nome, qtd]) => ({ nome, qtd }))
    .sort((a, b) => b.qtd - a.qtd || a.nome.localeCompare(b.nome, 'pt-BR'))
  return { locais, total: locais.reduce((s, l) => s + l.qtd, 0) }
}

export function desperdicios(v) {
  const ranking = rankingDesperdicios(lista(v.gemba))
  return lista(v.gemba).length ? { ranking, observacoes: lista(v.gemba).length } : null
}

export function qualidade(v) {
  return { conforme: conformePorModelo(v), pendencias: pendenciasPorEmpresa(v), mapa: mapaDePendencias(v), desperdicios: desperdicios(v) }
}

// ---------- Modo impressão ----------

// Linha do cabeçalho do relatório: os filtros que estavam ligados quando a pessoa mandou imprimir.
export const descricaoDosFiltros = ({ empresa = '', periodo = 'tudo' } = {}) =>
  `Empresa: ${empresa || 'todas'} · Período: ${rotuloDoPeriodo(periodo)}`

// "Gerado automaticamente em 04/10/2026 às 14:05", sempre no horário de Brasília.
export function rodapeDeImpressao(agora = new Date()) {
  const hora = agora.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
  return `Gerado automaticamente em ${formatarData(hojeEmBrasilia(agora))} às ${hora}`
}
