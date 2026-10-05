// Regras do módulo QUALIDADE (Pendências, FVS e Gemba Walk). Funções puras: sem React, sem banco, sem `window`.
// Datas são sempre texto 'AAAA-MM-DD' (nunca `toISOString`, que vira UTC e pula um dia à noite).

// ---------- Datas ----------

const MS_DIA = 86400000
const paraUTC = (iso) => { const [a, m, d] = iso.split('-').map(Number); return Date.UTC(a, m - 1, d) }
const diasEntre = (de, ate) => Math.round((paraUTC(ate) - paraUTC(de)) / MS_DIA)
export function somarDias(iso, n) {
  const d = new Date(paraUTC(iso) + n * MS_DIA)
  const pad = (x) => String(x).padStart(2, '0')
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

// "DD/MM/AAAA HH:MM" no horário de Brasília (o servidor e o celular podem estar em outro fuso).
export function carimbo(agora = new Date()) {
  return agora
    .toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
    })
    .replace(', ', ' ')
}

// ---------- Pendências ----------

export const STATUS_PENDENCIA = {
  pendente: { rotulo: 'Pendente', tom: 'bad' },
  em_andamento: { rotulo: 'Em andamento', tom: 'warn' },
  resolvido: { rotulo: 'Resolvido', tom: 'ok' },
}
export const ORDEM_STATUS = ['pendente', 'em_andamento', 'resolvido']
export const PRAZOS_PENDENCIA = [['atrasados', 'Atrasados'], ['hoje', 'Hoje'], ['semana', 'Esta semana']]

// Próximo passo do fluxo (Pendente → Em andamento → Resolvido) e o texto do botão.
export const PROXIMO_PASSO = {
  pendente: { para: 'em_andamento', botao: 'Colocar em andamento' },
  em_andamento: { para: 'resolvido', botao: 'Resolver' },
}

export const vencida = (p, hoje) => p.status !== 'resolvido' && Boolean(p.prazo) && p.prazo < hoje

export function kpisPendencias(lista) {
  const conta = (s) => lista.filter((p) => p.status === s).length
  return { total: lista.length, pendente: conta('pendente'), em_andamento: conta('em_andamento'), resolvido: conta('resolvido') }
}

// Quantas pendências em aberto (não resolvidas) cada responsável tem, da maior para a menor.
export function pendentesPorResponsavel(lista) {
  const mapa = new Map()
  for (const p of lista) {
    if (p.status === 'resolvido' || !p.responsavel) continue
    mapa.set(p.responsavel, (mapa.get(p.responsavel) || 0) + 1)
  }
  return [...mapa].map(([nome, qtd]) => ({ nome, qtd })).sort((a, b) => b.qtd - a.qtd || a.nome.localeCompare(b.nome, 'pt-BR'))
}

export const responsaveisDasPendencias = (lista) =>
  [...new Set(lista.map((p) => p.responsavel).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'))

const semAcento = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function passaPrazo(p, prazo, hoje) {
  if (!prazo) return true
  if (prazo === 'atrasados') return vencida(p, hoje)
  if (p.status === 'resolvido' || !p.prazo) return false
  if (prazo === 'hoje') return p.prazo === hoje
  // Esta semana: de hoje até daqui a 6 dias.
  return prazo === 'semana' && p.prazo >= hoje && p.prazo <= somarDias(hoje, 6)
}

export function filtrarPendencias(lista, { status = '', responsavel = '', prazo = '', busca = '' }, hoje) {
  const termo = semAcento(busca.trim())
  return lista.filter((p) =>
    (!status || p.status === status)
    && (!responsavel || p.responsavel === responsavel)
    && passaPrazo(p, prazo, hoje)
    && (!termo || semAcento(`${p.descricao} ${p.local} ${p.pavimento} ${p.empresa}`).includes(termo)))
}

// Em aberto primeiro (prazo mais próximo no topo); resolvidas por último; empate pelo número.
export function ordenarPendencias(lista) {
  const fechada = (p) => (p.status === 'resolvido' ? 1 : 0)
  return [...lista].sort((a, b) =>
    fechada(a) - fechada(b) || (a.prazo || '9999').localeCompare(b.prazo || '9999') || a.numeroRegistro - b.numeroRegistro)
}

export const proximoNumero = (lista) => Math.max(0, ...lista.map((p) => p.numeroRegistro)) + 1

export function errosPendencia({ descricao = '', local = '', empresa = '', responsavel = '', prazo = '', dataVistoria = '' }) {
  const e = {}
  if (!descricao.trim()) e.descricao = 'Descreva o problema.'
  if (!local.trim()) e.local = 'Informe o local.'
  if (!empresa.trim()) e.empresa = 'Informe quem vai corrigir.'
  if (!responsavel.trim()) e.responsavel = 'Informe quem acompanha.'
  if (!dataVistoria) e.dataVistoria = 'Informe a data da vistoria.'
  if (!prazo) e.prazo = 'Informe o prazo.'
  else if (dataVistoria && prazo < dataVistoria) e.prazo = 'O prazo não pode ser antes da vistoria.'
  return e
}

// Nota nova entra NO TOPO do histórico, com carimbo [DD/MM/AAAA HH:MM].
export function acrescentarObservacao(antigo, texto, agora = new Date()) {
  const nota = `[${carimbo(agora)}] ${texto.trim()}`
  return antigo ? `${nota}\n${antigo}` : nota
}

export function novaPendencia(campos, { id, obraCodigo, numeroRegistro }, usuarioNome) {
  const t = (v) => (v || '').trim()
  return {
    id, obraCodigo, numeroRegistro,
    descricao: t(campos.descricao), local: t(campos.local), pavimento: t(campos.pavimento),
    empresa: t(campos.empresa), prazo: campos.prazo, responsavel: t(campos.responsavel),
    dataVistoria: campos.dataVistoria, vistoriadoPor: t(campos.vistoriadoPor) || usuarioNome,
    status: 'pendente', foto: campos.foto || '', fotoEvidencia: '', dataResolucao: '', observacoes: '',
  }
}

// Erro em português se a mudança não pode acontecer; null se pode. Resolver exige a foto da correção.
export function errosMudanca(p, para, { fotoEvidencia } = {}) {
  if (PROXIMO_PASSO[p.status]?.para !== para) return 'Esta pendência não pode ir para esse status.'
  if (para === 'resolvido' && !fotoEvidencia) return 'Tire a foto que mostra a correção.'
  return null
}

export function aplicarMudanca(p, para, { fotoEvidencia } = {}, hoje) {
  return para === 'resolvido'
    ? { ...p, status: para, fotoEvidencia, dataResolucao: hoje }
    : { ...p, status: para }
}

// Dias de atraso (positivo = vencida há N dias); 0 se não está vencida.
export const diasDeAtraso = (p, hoje) => (vencida(p, hoje) ? diasEntre(p.prazo, hoje) : 0)

// ---------- FVS (Ficha de Verificação de Serviço) ----------

export const CATEGORIAS_FVS = ['Impermeabilização', 'Estrutura', 'Instalações', 'Acabamento']
export const SEVERIDADES = ['Baixa', 'Média', 'Alta']
export const TOM_SEVERIDADE = { Baixa: 'neutral', Média: 'warn', Alta: 'bad' }
export const RESPOSTAS = [['ok', 'OK'], ['nc', 'NC'], ['na', 'N.A.']]

// Itens numerados por grupo: 1.1, 1.2, 2.1...
export const numerarGrupos = (grupos) =>
  grupos.map((g, gi) => ({ nome: g.nome, itens: g.itens.map((it, ii) => ({ ...it, numero: `${gi + 1}.${ii + 1}` })) }))
export const itensDaVistoria = (v) => numerarGrupos(v.grupos).flatMap((g) => g.itens)

// Conformidade = ok / (ok + nc); N.A. não entra na conta. Sem nenhum OK/NC ainda: null (a tela mostra "—").
export const percentualConforme = (ok, nc) => (ok + nc === 0 ? null : Math.round((ok / (ok + nc)) * 100))

export function progressoVistoria(v) {
  const itens = itensDaVistoria(v)
  const conta = (r) => itens.filter((i) => v.respostas[i.id] === r).length
  const ok = conta('ok')
  const nc = conta('nc')
  const na = conta('na')
  const total = itens.length
  const pendentes = total - ok - nc - na
  return { total, ok, nc, na, pendentes, verificados: total - pendentes, conformidade: percentualConforme(ok, nc) }
}

// Cor do indicador de conformidade: verde a partir de 85%, âmbar a partir de 70%, vermelho abaixo; sem dado, neutro.
export const tomConformidade = (pct) => (pct === null ? 'neutro' : pct >= 85 ? 'ok' : pct >= 70 ? 'warn' : 'bad')

export function kpisFvs(vistorias, ncs) {
  const soma = vistorias.map(progressoVistoria).reduce((t, p) => ({ ok: t.ok + p.ok, nc: t.nc + p.nc }), { ok: 0, nc: 0 })
  return {
    conformidade: percentualConforme(soma.ok, soma.nc),
    ncsAbertas: ncs.filter((n) => n.status !== 'fechada').length,
    concluidas: vistorias.filter((v) => v.status === 'concluida').length,
  }
}

// Modelo (template): a validação acusa o que falta; `codigosEmUso` são os códigos dos OUTROS modelos.
export function errosModelo({ codigo = '', nome = '', categoria = '', grupos = [] }, codigosEmUso = []) {
  const e = {}
  if (!codigo.trim()) e.codigo = 'Informe o código (ex.: FVS-03).'
  else if (codigosEmUso.includes(codigo.trim().toUpperCase())) e.codigo = 'Já existe um modelo com esse código.'
  if (!nome.trim()) e.nome = 'Dê um nome ao modelo.'
  if (!CATEGORIAS_FVS.includes(categoria)) e.categoria = 'Escolha a categoria.'
  if (grupos.length === 0) e.grupos = 'Adicione ao menos um grupo com itens.'
  else if (grupos.some((g) => !g.nome.trim())) e.grupos = 'Dê um nome a todos os grupos.'
  else if (grupos.some((g) => g.itens.length === 0 || g.itens.some((i) => !i.titulo.trim()))) e.grupos = 'Todo grupo precisa de itens, e todo item de um título.'
  return e
}

export function normalizarModelo(c, id, versao) {
  return {
    id, codigo: c.codigo.trim().toUpperCase(), nome: c.nome.trim(), categoria: c.categoria, versao,
    grupos: c.grupos.map((g) => ({ nome: g.nome.trim(), itens: g.itens.map((i) => ({ id: i.id, titulo: i.titulo.trim() })) })),
  }
}

export const contarItensDoModelo = (m) => m.grupos.reduce((t, g) => t + g.itens.length, 0)

export function errosNovaVistoria({ modeloId = '', ambiente = '' }) {
  const e = {}
  if (!modeloId) e.modeloId = 'Escolha o modelo da ficha.'
  if (!ambiente.trim()) e.ambiente = 'Informe o ambiente (ex.: Banheiro Social · Térreo).'
  return e
}

// A vistoria guarda uma CÓPIA dos grupos do modelo: mudar o modelo depois não bagunça vistoria já feita.
export function novaVistoria(modelo, ambiente, { id, obraCodigo, hoje, quem }) {
  return {
    id, obraCodigo, modeloId: modelo.id, modeloCodigo: modelo.codigo, modeloNome: modelo.nome, versao: modelo.versao,
    ambiente: ambiente.trim(), grupos: structuredClone(modelo.grupos), respostas: {}, status: 'em_andamento',
    criadaEm: hoje, criadaPor: quem, concluidaEm: '',
  }
}

// OK e N.A. marcam direto; NC só nasce pelo painel que detalha a não conformidade (registrarNc).
export function errosMarcacao(v, itemId, resposta, ncs) {
  if (v.status === 'concluida') return 'Vistoria concluída: só leitura.'
  if (resposta === 'nc') return 'Detalhe a não conformidade para marcar NC.'
  if (ncs.some((n) => n.vistoriaId === v.id && String(n.itemId) === String(itemId))) {
    return 'Este item tem uma não conformidade. Trate ela na lista de NCs.'
  }
  return null
}
export const marcarItem = (v, itemId, resposta) => ({ ...v, respostas: { ...v.respostas, [itemId]: resposta } })

export function errosFinalizar(v) {
  if (v.status === 'concluida') return 'A vistoria já está concluída.'
  const { pendentes } = progressoVistoria(v)
  return pendentes > 0 ? `Faltam ${pendentes} ${pendentes === 1 ? 'item' : 'itens'} para verificar.` : null
}
export const finalizarVistoria = (v, hoje) => ({ ...v, status: 'concluida', concluidaEm: hoje })

// ---------- Não conformidades ----------

export const STATUS_NC = {
  aberta: { rotulo: 'Aberta', tom: 'bad' },
  encaminhada: { rotulo: 'Encaminhada', tom: 'warn' },
  corrigida: { rotulo: 'Corrigida', tom: 'info' },
  fechada: { rotulo: 'Fechada', tom: 'ok' },
}

export function errosNc({ descricao = '', solucao = '', responsavel = '', severidade = '' }) {
  const e = {}
  if (!SEVERIDADES.includes(severidade)) e.severidade = 'Escolha a severidade.'
  if (!descricao.trim()) e.descricao = 'Descreva o problema.'
  if (!solucao.trim()) e.solucao = 'Proponha a solução.'
  if (!responsavel.trim()) e.responsavel = 'Informe o responsável.'
  return e
}

export const codigoDeNc = (n) => `NC-${String(n).padStart(3, '0')}`
export const proximoCodigoNc = (ncs) => codigoDeNc(Math.max(0, ...ncs.map((n) => Number(n.codigo.slice(3)))) + 1)

export function novaNc(campos, { id, codigo, vistoria, item, hoje, quem, agora }) {
  const t = (v) => (v || '').trim()
  return {
    id, obraCodigo: vistoria.obraCodigo, codigo, vistoriaId: vistoria.id, itemId: item.id, itemNumero: item.numero,
    titulo: item.titulo, servico: vistoria.modeloNome, ambiente: vistoria.ambiente, severidade: campos.severidade,
    responsavel: t(campos.responsavel), descricao: t(campos.descricao), solucao: t(campos.solucao), fotos: campos.fotos || [],
    status: 'aberta', abertaEm: hoje, fechadaEm: '', timeline: [{ em: carimbo(agora), texto: `Aberta por ${quem}` }],
  }
}

// Fluxo: aberta → encaminhada → corrigida → fechada, ou corrigida → (reprova) → encaminhada.
export const ACOES_NC = {
  encaminhar: { de: 'aberta', para: 'encaminhada', botao: 'Encaminhar p/ correção' },
  corrigir: { de: 'encaminhada', para: 'corrigida', botao: 'Marcar corrigida' },
  aprovar: { de: 'corrigida', para: 'fechada', botao: 'Aprovar e fechar' },
  reprovar: { de: 'corrigida', para: 'encaminhada', botao: 'Reprovar' },
}
export const acoesDaNc = (nc) => Object.entries(ACOES_NC).filter(([, a]) => a.de === nc.status).map(([chave, a]) => ({ chave, ...a }))

export function aplicarAcaoNc(nc, chave, quem, agora, hoje) {
  const a = ACOES_NC[chave]
  if (!a || a.de !== nc.status) return null
  const texto = {
    encaminhar: `Encaminhada para ${nc.responsavel} por ${quem}`,
    corrigir: `Marcada como corrigida por ${quem}`,
    aprovar: `Aprovada e fechada por ${quem}`,
    reprovar: `Reprovada por ${quem}: volta para correção`,
  }[chave]
  return { ...nc, status: a.para, fechadaEm: a.para === 'fechada' ? hoje : '', timeline: [...nc.timeline, { em: carimbo(agora), texto }] }
}

export const diasEmAberto = (nc, hoje) => Math.max(0, diasEntre(nc.abertaEm, nc.fechadaEm || hoje))

// Em aberto primeiro (mais grave e mais antiga no topo); fechadas no fim.
export function ordenarNcs(lista, hoje) {
  const peso = { Alta: 0, Média: 1, Baixa: 2 }
  return [...lista].sort((a, b) =>
    (a.status === 'fechada') - (b.status === 'fechada') || peso[a.severidade] - peso[b.severidade]
    || diasEmAberto(b, hoje) - diasEmAberto(a, hoje) || a.codigo.localeCompare(b.codigo))
}

// ---------- Gemba Walk (caça aos desperdícios) ----------

// Os 7 desperdícios do lean, nomes EXATOS. O segundo valor é a classe de cor usada na tela.
export const DESPERDICIOS = [
  ['Retrabalho', 'retrabalho'], ['Espera', 'espera'], ['Transporte', 'transporte'], ['Movimentação', 'movimentacao'],
  ['Estoque', 'estoque'], ['Superprodução', 'superproducao'], ['Processo desnecessário', 'processo'],
]
export const NOMES_DESPERDICIO = DESPERDICIOS.map(([nome]) => nome)
export const classeDoDesperdicio = (nome) => DESPERDICIOS.find(([n]) => n === nome)?.[1] || 'processo'

export const COLUNAS_GEMBA = [['pendente', 'Pendente'], ['em_andamento', 'Em Andamento'], ['resolvido', 'Resolvido']]
export const PRAZOS_GEMBA = [['vencidos', 'Vencidos'], ['hoje', 'Hoje'], ['semana', 'Esta semana'], ['sem_prazo', 'Sem prazo']]

export function errosGemba({ local = '', descricao = '', causaRaiz = '', acao = '', desperdicios = [], responsavel = '', prazo = '' }) {
  const e = {}
  if (!local.trim()) e.local = 'Informe o local.'
  if (!descricao.trim()) e.descricao = 'Descreva o que você viu.'
  if (!causaRaiz.trim()) e.causaRaiz = 'Informe a causa raiz.'
  if (!acao.trim()) e.acao = 'Diga o que será feito.'
  if (desperdicios.length === 0) e.desperdicios = 'Escolha ao menos um tipo de desperdício.'
  else if (desperdicios.some((d) => !NOMES_DESPERDICIO.includes(d))) e.desperdicios = 'Tipo de desperdício inválido.'
  if (!responsavel.trim()) e.responsavel = 'Informe o responsável.'
  if (prazo && !/^\d{4}-\d{2}-\d{2}$/.test(prazo)) e.prazo = 'Prazo inválido.'
  return e
}

export function novaObservacaoGemba(campos, { id, obraCodigo }) {
  const t = (v) => (v || '').trim()
  return {
    id, obraCodigo, local: t(campos.local), descricao: t(campos.descricao), causaRaiz: t(campos.causaRaiz), acao: t(campos.acao),
    // na ordem canônica, sem repetir, para o ranking e as tags saírem sempre iguais
    desperdicios: NOMES_DESPERDICIO.filter((d) => campos.desperdicios.includes(d)),
    prazo: campos.prazo || '', responsavel: t(campos.responsavel), status: 'pendente', foto: campos.foto || '',
  }
}

// Ranking: quantas observações citam cada tipo (uma observação pode ter vários), do maior para o menor; só quem aparece.
export function rankingDesperdicios(lista) {
  return NOMES_DESPERDICIO
    .map((nome, ordem) => ({ nome, ordem, qtd: lista.filter((o) => o.desperdicios.includes(nome)).length }))
    .filter((r) => r.qtd > 0)
    .sort((a, b) => b.qtd - a.qtd || a.ordem - b.ordem)
    .map(({ nome, qtd }) => ({ nome, qtd }))
}

export function filtrarGemba(lista, { tipo = '', prazo = '', busca = '' }, hoje) {
  const termo = semAcento(busca.trim())
  const passaPrazoGemba = (o) => {
    if (!prazo) return true
    if (prazo === 'sem_prazo') return !o.prazo
    if (prazo === 'vencidos') return vencida(o, hoje)
    if (!o.prazo || o.status === 'resolvido') return false
    return prazo === 'hoje' ? o.prazo === hoje : o.prazo >= hoje && o.prazo <= somarDias(hoje, 6)
  }
  return lista.filter((o) =>
    (!tipo || o.desperdicios.includes(tipo)) && passaPrazoGemba(o)
    && (!termo || semAcento(`${o.local} ${o.descricao} ${o.causaRaiz} ${o.acao}`).includes(termo)))
}

// Dentro da coluna: vencidas primeiro, depois prazo mais próximo; sem prazo por último.
export const ordenarGemba = (lista, hoje) =>
  [...lista].sort((a, b) => (vencida(b, hoje) - vencida(a, hoje)) || (a.prazo || '9999').localeCompare(b.prazo || '9999') || String(a.id).localeCompare(String(b.id)))

// ---------- Relatório de Qualidade ----------

// Texto dos filtros ativos, um item por aba que tem filtro. Lista vazia = nenhum filtro aplicado.
export function descreverFiltros({ pend = {}, gemba = {}, nc = '' }) {
  const rotulo = (lista, k) => lista.find(([x]) => x === k)?.[1] || k
  const busca = (b) => (b && b.trim() ? `busca “${b.trim()}”` : '')
  const linha = (nome, itens) => (itens.filter(Boolean).length ? `${nome}: ${itens.filter(Boolean).join('; ')}` : '')
  return [
    linha('Pendências', [
      pend.status && `status ${STATUS_PENDENCIA[pend.status].rotulo}`, pend.responsavel && `responsável ${pend.responsavel}`,
      pend.prazo && `prazo ${rotulo(PRAZOS_PENDENCIA, pend.prazo)}`, busca(pend.busca),
    ]),
    linha('NCs', [nc && `status ${STATUS_NC[nc].rotulo}`]),
    linha('Gemba Walk', [gemba.tipo && `desperdício ${gemba.tipo}`, gemba.prazo && `prazo ${rotulo(PRAZOS_GEMBA, gemba.prazo)}`, busca(gemba.busca)]),
  ].filter(Boolean)
}

// Tudo o que o relatório imprime, já recortado pelos filtros ativos nas abas. A tela só desenha.
export function montarRelatorio({ pendencias, filtrosPend, vistorias, ncs, filtroNc, gemba, filtrosGemba, hoje }) {
  const pend = ordenarPendencias(filtrarPendencias(pendencias, filtrosPend, hoje))
  const gembaFiltrado = filtrarGemba(gemba, filtrosGemba, hoje)
  const ordemVistorias = [...vistorias].sort((a, b) => (a.status === 'concluida') - (b.status === 'concluida') || b.criadaEm.localeCompare(a.criadaEm))
  return {
    filtros: descreverFiltros({ pend: filtrosPend, gemba: filtrosGemba, nc: filtroNc }),
    kpis: kpisPendencias(pend),
    porResponsavel: pendentesPorResponsavel(pend),
    pendencias: pend,
    kpisFvs: kpisFvs(vistorias, ncs),
    vistorias: ordemVistorias.map((v) => ({ v, p: progressoVistoria(v) })),
    ncs: ordenarNcs(ncs.filter((n) => !filtroNc || n.status === filtroNc), hoje).map((n) => ({ ...n, dias: diasEmAberto(n, hoje) })),
    ranking: rankingDesperdicios(gembaFiltrado),
    gembaAbertas: ordenarGemba(gembaFiltrado.filter((o) => o.status !== 'resolvido'), hoje),
  }
}
