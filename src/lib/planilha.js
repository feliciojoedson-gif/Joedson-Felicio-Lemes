// Leitura e geração de planilha 100% no navegador: nenhum dado sai da máquina.
// SheetJS (`xlsx`) é a única biblioteca extra do app e só é baixada quando alguém usa a importação (import dinâmico).
import { COLUNAS_MODELO, EXEMPLOS_MODELO, lerCsv } from './importacao.js'
import { calendarioPadrao, diasUteis } from './planejamento.js'

const TAMANHO_MAXIMO = 10 * 1024 * 1024
const LINHAS_DE_TEXTO_NO_MODELO = 300
const doisDigitos = (n) => String(n).padStart(2, '0')

// CSV do Excel costuma vir em Windows-1252; se não for UTF-8 válido, lê assim.
function decodificar(buffer) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch (_) {
    return new TextDecoder('windows-1252').decode(buffer)
  }
}

// O texto que a pessoa vê na célula. Data vira DD/MM/AAAA direto dos números (sem Date, sem fuso);
// o resto usa o valor formatado, não o numérico, para "1.10" não virar 1.1.
function textoDaCelula(XLSX, celula) {
  if (!celula) return ''
  if (celula.t === 'n' && celula.z && XLSX.SSF.is_date(celula.z)) {
    const d = XLSX.SSF.parse_date_code(celula.v)
    if (d) return `${doisDigitos(d.d)}/${doisDigitos(d.m)}/${d.y}`
  }
  return String(celula.w ?? celula.v ?? '').trim()
}

// Devolve a matriz de textos da primeira aba (ou do CSV). Erros viram Error com mensagem em português.
export async function lerPlanilha(arquivo) {
  const nome = String(arquivo.name || '').toLowerCase()
  if (arquivo.size > TAMANHO_MAXIMO) throw new Error('Arquivo grande demais (máximo 10 MB).')
  if (nome.endsWith('.csv')) return lerCsv(decodificar(await arquivo.arrayBuffer()))
  if (!nome.endsWith('.xlsx')) throw new Error('Formato não aceito. Envie um arquivo .xlsx ou .csv.')

  const XLSX = await import('xlsx')
  let pasta
  try {
    pasta = XLSX.read(await arquivo.arrayBuffer(), { type: 'array' })
  } catch (_) {
    throw new Error('Não consegui abrir a planilha. Confira se o arquivo não está corrompido.')
  }
  const aba = pasta.Sheets[pasta.SheetNames[0]]
  if (!aba || !aba['!ref']) throw new Error('A planilha está vazia.')
  const faixa = XLSX.utils.decode_range(aba['!ref'])
  const matriz = []
  for (let r = faixa.s.r; r <= faixa.e.r; r++) {
    const linha = []
    for (let c = 0; c <= faixa.e.c; c++) linha.push(textoDaCelula(XLSX, aba[XLSX.utils.encode_cell({ r, c })]))
    matriz.push(linha)
  }
  return matriz
}

const serialDoExcel = (iso) => {
  const [a, m, d] = iso.split('-').map(Number)
  return (Date.UTC(a, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000
}

// Planilha modelo: mesmas colunas da importação, 4 linhas de exemplo e a coluna ITEM formatada como TEXTO
// (o Excel não engole "1.10"). Devolve os bytes do .xlsx.
export async function gerarModelo(cal = calendarioPadrao()) {
  const XLSX = await import('xlsx')
  const aba = {}
  COLUNAS_MODELO.forEach((titulo, c) => { aba[XLSX.utils.encode_cell({ r: 0, c })] = { t: 's', v: titulo } })
  EXEMPLOS_MODELO.forEach(([item, atividade, inicio, fim], i) => {
    const r = i + 1
    aba[XLSX.utils.encode_cell({ r, c: 0 })] = { t: 's', v: item, z: '@' }
    aba[XLSX.utils.encode_cell({ r, c: 1 })] = { t: 's', v: atividade }
    aba[XLSX.utils.encode_cell({ r, c: 2 })] = { t: 'n', v: serialDoExcel(inicio), z: 'dd/mm/yyyy' }
    aba[XLSX.utils.encode_cell({ r, c: 3 })] = { t: 'n', v: serialDoExcel(fim), z: 'dd/mm/yyyy' }
    aba[XLSX.utils.encode_cell({ r, c: 4 })] = { t: 'n', v: diasUteis(inicio, fim, cal) }
  })
  // Linhas em branco já formatadas como texto, para os códigos que a pessoa digitar.
  for (let r = EXEMPLOS_MODELO.length + 1; r <= LINHAS_DE_TEXTO_NO_MODELO; r++) {
    aba[XLSX.utils.encode_cell({ r, c: 0 })] = { t: 's', v: '', z: '@' }
  }
  aba['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: LINHAS_DE_TEXTO_NO_MODELO, c: COLUNAS_MODELO.length - 1 } })
  aba['!cols'] = [{ wch: 10 }, { wch: 44 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 14 }]

  const instrucoes = XLSX.utils.aoa_to_sheet([
    ['Como preencher'],
    ['ITEM: o código da atividade. 1 é de topo; 1.1 é filho do 1; 1.1.1 é filho do 1.1. A coluna já está como texto.'],
    ['Atividade: o nome. Início e Término: datas no formato DD/MM/AAAA.'],
    ['Duração (Dias): pode deixar em branco; o app calcula em dias úteis pela diferença das datas.'],
    ['Início Real e Término Real: opcionais (DD/MM/AAAA). Com término real a atividade entra como concluída; só com início real, em andamento.'],
    ['Todo item filho precisa do pai na planilha (2.1 exige o 2).'],
  ])
  const pasta = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(pasta, aba, 'Cronograma')
  XLSX.utils.book_append_sheet(pasta, instrucoes, 'Instruções')
  return XLSX.write(pasta, { type: 'array', bookType: 'xlsx' })
}
