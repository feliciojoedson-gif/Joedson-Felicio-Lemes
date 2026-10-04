// Importação de cronograma por planilha (.xlsx ou .csv) para a EAP. Só regra pura, sem biblioteca e sem `window`:
// a leitura do arquivo em si mora em `planilha.js`. Roda no Node: `node tests/importacao.mjs`.
// A hierarquia vem do código da coluna ITEM: 1 é de topo, 1.1 é filho do 1, 1.1.1 é filho do 1.1, em qualquer profundidade.
import { dataValida, diasUteis } from './planejamento.js'

export const COLUNAS_MODELO = ['ITEM', 'Atividade', 'Início', 'Término', 'Duração (Dias)']
export const LIMITE_LINHAS_VISIVEIS = 200

const semAcento = (t) => String(t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

// Nomes de coluna aceitos (sem acento, em minúsculas). Os do cronograma exportado do MS Project entram de graça.
const ALIAS = {
  codigo: ['item', 'edt', 'codigo', 'wbs', 'eap'],
  titulo: ['atividade', 'nome da tarefa', 'tarefa', 'nome', 'descricao'],
  inicio: ['inicio', 'data inicio', 'data de inicio'],
  termino: ['termino', 'fim', 'data termino', 'data de termino', 'data fim'],
  duracao: ['duracao (dias)', 'duracao', 'dias'],
}

// ---------- Datas ----------

const doisDigitos = (n) => String(n).padStart(2, '0')
export const formatarDataBr = (iso) => (iso && dataValida(iso) ? iso.split('-').reverse().join('/') : '')

// Aceita 05/10/2026, 5/10/26, "Ter 03/06/25 07:30" (MS Project) e 2026-10-05. Nunca passa por Date: sem fuso, sem dia a menos.
export function lerDataBr(texto) {
  let t = String(texto ?? '').trim()
  if (!t) return null
  t = t.replace(/^[A-Za-zÀ-ú]{3,}\.?,?\s+/, '').replace(/\s+\d{1,2}:\d{2}(:\d{2})?.*$/, '')
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return dataValida(t) ? t : null
  const m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/)
  if (!m) return null
  const ano = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])
  const iso = `${ano}-${doisDigitos(m[2])}-${doisDigitos(m[1])}`
  return dataValida(iso) ? iso : null
}

// ---------- Código da coluna ITEM ----------

// '' = vazio, null = inválido, senão o código limpo. "1.0" vira "1" (planilha antiga); "1.10" continua "1.10".
// A vírgula vale como ponto: o Excel em português mostra o número 1.1 como "1,1".
export function normalizarCodigo(texto) {
  const t = String(texto ?? '').trim().replace(/\s+/g, '').replace(/,/g, '.')
  if (!t) return ''
  if (!/^\d+(\.\d+)*$/.test(t)) return null
  const partes = t.split('.').map((p) => String(Number(p)))
  while (partes.length > 1 && partes[partes.length - 1] === '0') partes.pop()
  return partes[0] === '0' ? null : partes.join('.')
}

const compararCodigos = (a, b) => {
  const x = a.split('.').map(Number)
  const y = b.split('.').map(Number)
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if ((x[i] ?? -1) !== (y[i] ?? -1)) return (x[i] ?? -1) - (y[i] ?? -1)
  }
  return 0
}
const paiDoCodigo = (cod) => cod.split('.').slice(0, -1).join('.')

// ---------- CSV (sem biblioteca) ----------

// Separador ; ou , (o Excel em português salva com ;). Aspas duplas protegem separador e quebra de linha.
export function lerCsv(texto) {
  const corpo = String(texto).replace(/^\uFEFF/, '')
  const primeira = corpo.split(/\r?\n/, 1)[0]
  const sep = (primeira.match(/;/g) || []).length >= (primeira.match(/,/g) || []).length ? ';' : ','
  const linhas = []
  let linha = []
  let campo = ''
  let aspas = false
  const fecharCampo = () => { linha.push(campo); campo = '' }
  const fecharLinha = () => { fecharCampo(); linhas.push(linha); linha = [] }
  for (let i = 0; i < corpo.length; i++) {
    const c = corpo[i]
    if (aspas) {
      if (c === '"' && corpo[i + 1] === '"') { campo += '"'; i++ } else if (c === '"') aspas = false
      else campo += c
    } else if (c === '"') aspas = true
    else if (c === sep) fecharCampo()
    else if (c === '\n') fecharLinha()
    else if (c !== '\r') campo += c
  }
  if (campo || linha.length) fecharLinha()
  return linhas
}

// ---------- Da matriz de células às linhas ----------

// Acha o cabeçalho nas primeiras 30 linhas e devolve as linhas de dados já com o nº da linha na planilha.
export function linhasDaPlanilha(matriz) {
  let cab = -1
  let col = {}
  for (let i = 0; i < Math.min(matriz.length, 30) && cab < 0; i++) {
    const achado = {}
    matriz[i].forEach((celula, j) => {
      const nome = semAcento(celula)
      for (const [campo, nomes] of Object.entries(ALIAS)) {
        if (achado[campo] === undefined && nomes.includes(nome)) achado[campo] = j
      }
    })
    if (achado.codigo !== undefined && achado.titulo !== undefined) { cab = i; col = achado }
  }
  const ajuda = 'O cabeçalho deve ter as colunas: ITEM, Atividade, Início, Término e Duração (Dias). Baixe a planilha modelo para ver o formato.'
  if (cab < 0) return { linhas: [], erro: `Não encontrei o cabeçalho da planilha (colunas ITEM e Atividade). ${ajuda}` }
  const faltam = [['inicio', 'Início'], ['termino', 'Término']].filter(([c]) => col[c] === undefined).map(([, n]) => n)
  if (faltam.length) return { linhas: [], erro: `Não encontrei a coluna ${faltam.join(' e ')}. ${ajuda}` }

  const linhas = []
  for (let i = cab + 1; i < matriz.length; i++) {
    const pegar = (campo) => (col[campo] === undefined ? '' : String(matriz[i][col[campo]] ?? '').trim())
    const l = { codigo: pegar('codigo'), titulo: pegar('titulo'), inicio: pegar('inicio'), termino: pegar('termino'), duracao: pegar('duracao') }
    if (!Object.values(l).some(Boolean)) continue
    linhas.push({ chave: linhas.length, linhaOrigem: i + 1, ...l })
  }
  if (!linhas.length) return { linhas: [], erro: 'A planilha não tem atividades abaixo do cabeçalho.' }
  return { linhas, erro: null }
}

// ---------- Conferência ----------

// Interpreta as linhas (que a pessoa pode ter corrigido na tela) e aponta cada erro, em português, no campo certo.
// Devolve os itens em ordem de código; linha com código inválido vai para o fim.
export function analisarLinhas(linhas, cal) {
  const itens = linhas.map((l) => ({
    ...l, cod: normalizarCodigo(l.codigo), isoInicio: lerDataBr(l.inicio), isoFim: lerDataBr(l.termino), erros: {},
  }))
  const primeira = new Map()
  for (const it of itens) if (it.cod && !primeira.has(it.cod)) primeira.set(it.cod, it.linhaOrigem)

  for (const it of itens) {
    const e = it.erros
    if (it.cod === '') e.codigo = 'Código vazio.'
    else if (it.cod === null) e.codigo = 'Código inválido: use números separados por ponto (1, 1.1, 1.2.1).'
    else if (primeira.get(it.cod) !== it.linhaOrigem) e.codigo = `Código repetido (já usado na linha ${primeira.get(it.cod)}).`
    else {
      const pai = paiDoCodigo(it.cod)
      if (pai && !primeira.has(pai)) e.codigo = `Falta o item ${pai}, que é o pai de ${it.cod}.`
    }
    if (!it.titulo) e.titulo = 'Atividade sem nome.'
    if (!it.isoInicio) e.inicio = 'Data de início inválida (use DD/MM/AAAA).'
    if (!it.isoFim) e.termino = 'Data de término inválida (use DD/MM/AAAA).'
    else if (it.isoInicio && it.isoFim < it.isoInicio) e.termino = 'O término não pode ser antes do início.'
    it.temErro = Object.keys(e).length > 0
    it.duracaoUteis = it.isoInicio && it.isoFim && it.isoFim >= it.isoInicio ? diasUteis(it.isoInicio, it.isoFim, cal) : null
    it.nivel = it.cod ? it.cod.split('.').length - 1 : 0
  }
  const comCodigo = itens.filter((i) => i.cod).sort((a, b) => compararCodigos(a.cod, b.cod) || a.linhaOrigem - b.linhaOrigem)
  const resto = itens.filter((i) => !i.cod)
  const ordenados = [...comCodigo, ...resto]
  return { itens: ordenados, totalErros: ordenados.filter((i) => i.temErro).length }
}

// Lista final de atividades da obra. `adicionar` entra depois das que já existem (as importadas de topo viram novos
// grupos no fim); `substituir` descarta as existentes. Só chame com a análise sem erros.
export function montarAtividades(itens, modo, existentes) {
  const base = modo === 'substituir' ? [] : existentes
  let proximoId = Math.max(0, ...base.map((a) => a.id)) + 1
  const ordemDoPai = new Map()
  const idDoCodigo = new Map()
  const novas = []
  const ordemRaiz = Math.max(-1, ...base.filter((a) => (a.parentId ?? null) === null).map((a) => a.ordem)) + 1
  for (const it of itens) {
    const pai = paiDoCodigo(it.cod)
    const chavePai = pai || ''
    const ordem = ordemDoPai.get(chavePai) ?? (pai ? 0 : ordemRaiz)
    ordemDoPai.set(chavePai, ordem + 1)
    idDoCodigo.set(it.cod, proximoId)
    novas.push({
      id: proximoId++, titulo: it.titulo, parentId: pai ? idDoCodigo.get(pai) : null, ordem, inicio: it.isoInicio, fim: it.isoFim,
      progresso: 0, status: 'a_fazer', causa: '', arquivada: false, subtarefas: [],
    })
  }
  return [...base, ...novas]
}

// ---------- Planilha modelo ----------

export const EXEMPLOS_MODELO = [
  ['1', 'Demolição', '2026-10-05', '2026-10-09'],
  ['2', 'Hidráulica', '2026-10-13', '2026-10-30'],
  ['2.1', 'Tubulação de água fria', '2026-10-13', '2026-10-21'],
  ['2.2', 'Instalação de ralos', '2026-10-22', '2026-10-30'],
]
