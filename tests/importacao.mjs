// Importação de cronograma (src/lib/importacao.js e planilha.js). Node puro: `node tests/importacao.mjs`.
import {
  analisarLinhas, formatarDataBr, lerCsv, lerDataBr, linhasDaPlanilha, montarAtividades, normalizarCodigo,
} from '../src/lib/importacao.js'
import { arvore, calendarioPadrao, restricoesDaImportacao } from '../src/lib/planejamento.js'
import { gerarModelo, lerPlanilha } from '../src/lib/planilha.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else {
    console.log(`  ✗ ${descricao}`)
    console.log(`     esperado: ${JSON.stringify(esperado)}`)
    console.log(`     veio:     ${JSON.stringify(real)}`)
  }
}
const cal = calendarioPadrao()

// Código da coluna ITEM
conferir('1.10 não vira 1.1', normalizarCodigo('1.10'), '1.10')
conferir('1.0 vira 1', normalizarCodigo('1.0'), '1')
conferir('2.1.0 vira 2.1', normalizarCodigo('2.1.0'), '2.1')
conferir('vírgula do Excel em português', normalizarCodigo('1,1'), '1.1')
conferir('espaços e zeros à esquerda', normalizarCodigo(' 01.02 '), '1.2')
conferir('vazio', normalizarCodigo('  '), '')
conferir('texto não é código', [normalizarCodigo('a.1'), normalizarCodigo('1..2'), normalizarCodigo('0')], [null, null, null])

// Datas
conferir('DD/MM/AAAA', lerDataBr('05/10/2026'), '2026-10-05')
conferir('dia e mês sem zero, ano com 2 dígitos', lerDataBr('5/1/26'), '2026-01-05')
conferir('formato do MS Project', lerDataBr('Ter 03/06/25 07:30'), '2025-06-03')
conferir('ISO', lerDataBr('2026-10-05'), '2026-10-05')
conferir('31/02 não existe', lerDataBr('31/02/2026'), null)
conferir('texto e vazio', [lerDataBr('amanhã'), lerDataBr('')], [null, null])
conferir('formatar', formatarDataBr('2026-10-05'), '05/10/2026')

// CSV
conferir('CSV com ; e aspas', lerCsv('ITEM;Atividade\r\n1;"Demolição; geral"\r\n'), [['ITEM', 'Atividade'], ['1', 'Demolição; geral']])
conferir('CSV com , e BOM', lerCsv('﻿a,b\n1,2'), [['a', 'b'], ['1', '2']])

// Cabeçalho
const cab = ['ITEM', 'Atividade', 'Início', 'Término', 'Duração (Dias)']
conferir('sem cabeçalho', linhasDaPlanilha([['x', 'y']]).erro.startsWith('Não encontrei o cabeçalho'), true)
conferir('sem coluna Término', linhasDaPlanilha([['ITEM', 'Atividade', 'Início']]).erro.startsWith('Não encontrei a coluna Término'), true)
conferir('só cabeçalho', linhasDaPlanilha([cab]).erro, 'A planilha não tem atividades abaixo do cabeçalho.')
conferir('nomes do MS Project e linhas em branco', linhasDaPlanilha([['EDT', 'Nome da Tarefa', 'Duração', 'Início', 'Término'], ['1', '  Obra ', '5 dias', 'Seg 05/10/26 07:30', 'Sex 09/10/26 17:30'], ['', '', '', '', '']]).linhas.map((l) => [l.codigo, l.titulo, l.inicio, l.duracao, l.linhaOrigem]), [['1', 'Obra', 'Seg 05/10/26 07:30', '5 dias', 2]])

// Conferência: árvore e erros
const matriz = (...linhas) => [cab, ...linhas]
const analisar = (...linhas) => analisarLinhas(linhasDaPlanilha(matriz(...linhas)).linhas, cal)
const bom = analisar(
  ['1', 'Demolição', '05/10/2026', '09/10/2026', ''],
  ['2', 'Hidráulica', '13/10/2026', '30/10/2026', ''],
  ['2.1', 'Tubulação', '13/10/2026', '21/10/2026', ''],
  ['2.1.1', 'Prumadas', '13/10/2026', '15/10/2026', ''],
)
conferir('planilha certa não tem erro', bom.totalErros, 0)
conferir('duração em branco é calculada em dias úteis', bom.itens.map((i) => i.duracaoUteis), [5, 14, 7, 3])
conferir('nível pela profundidade do código', bom.itens.map((i) => i.nivel), [0, 0, 1, 2])

const ordem = analisar(
  ['1.10', 'J', '05/10/2026', '05/10/2026', ''], ['1', 'Pai', '05/10/2026', '05/10/2026', ''],
  ['1.2', 'B', '05/10/2026', '05/10/2026', ''], ['1.9', 'I', '05/10/2026', '05/10/2026', ''], ['1.0', 'Pai repetido', '05/10/2026', '05/10/2026', ''],
)
conferir('ordena por código numérico (1.9 antes de 1.10)', ordem.itens.map((i) => i.cod), ['1', '1', '1.2', '1.9', '1.10'])
conferir('1.0 e 1 são o mesmo código: o repetido é apontado', ordem.itens.filter((i) => i.erros.codigo).map((i) => i.titulo), ['Pai repetido'])

const ruim = analisar(
  ['2.1', 'Órfão', '05/10/2026', '06/10/2026', ''],
  ['3', '', '05/10/2026', '06/10/2026', ''],
  ['4', 'Data ruim', '31/02/2026', '06/10/2026', ''],
  ['5', 'Volta no tempo', '10/10/2026', '06/10/2026', ''],
  ['x', 'Código ruim', '05/10/2026', '06/10/2026', ''],
  ['', 'Sem código', '05/10/2026', '06/10/2026', ''],
)
const msg = (titulo) => ruim.itens.find((i) => i.titulo === titulo).erros
conferir('órfão', msg('Órfão').codigo, 'Falta o item 2, que é o pai de 2.1.')
conferir('sem nome', ruim.itens.find((i) => i.cod === '3').erros.titulo, 'Atividade sem nome.')
conferir('data inválida', msg('Data ruim').inicio, 'Data de início inválida (use DD/MM/AAAA).')
conferir('término antes do início', msg('Volta no tempo').termino, 'O término não pode ser antes do início.')
conferir('código inválido e vazio', [msg('Código ruim').codigo, msg('Sem código').codigo], ['Código inválido: use números separados por ponto (1, 1.1, 1.2.1).', 'Código vazio.'])
conferir('6 linhas com erro', ruim.totalErros, 6)
conferir('código com erro vai para o fim', ruim.itens.slice(-2).map((i) => i.titulo), ['Código ruim', 'Sem código'])

// Corrigir na tela: trocar o código e a análise fecha
const linhasRuins = linhasDaPlanilha(matriz(['2.1', 'Órfão', '05/10/2026', '06/10/2026', ''])).linhas
conferir('antes de corrigir', analisarLinhas(linhasRuins, cal).totalErros, 1)
conferir('depois de corrigir o código', analisarLinhas(linhasRuins.map((l) => ({ ...l, codigo: '2' })), cal).totalErros, 0)

// Montar as atividades: vínculo pai-filho, ordem e modo
const existentes = [
  { id: 1, titulo: 'Velha', parentId: null, ordem: 0, inicio: '2026-10-01', fim: '2026-10-02', progresso: 50, status: 'andamento', causa: '', arquivada: false, subtarefas: [] },
  { id: 2, titulo: 'Velha filha', parentId: 1, ordem: 0, inicio: '2026-10-01', fim: '2026-10-02', progresso: 0, status: 'a_fazer', causa: '', arquivada: false, subtarefas: [] },
]
const substituida = montarAtividades(bom.itens, 'substituir', existentes)
conferir('substituir descarta as antigas', substituida.length, 4)
conferir('árvore montada respeita o código da planilha', arvore(substituida).map((a) => `${a.codigo} ${a.titulo}`), ['1 Demolição', '2 Hidráulica', '2.1 Tubulação', '2.1.1 Prumadas'])
conferir('vínculo pai-filho em 3 níveis', substituida.map((a) => a.parentId), [null, null, 2, 3])
conferir('datas ISO sem deslocamento de fuso', [substituida[0].inicio, substituida[0].fim], ['2026-10-05', '2026-10-09'])
const somada = montarAtividades(bom.itens, 'adicionar', existentes)
conferir('adicionar mantém as existentes', somada.length, 6)
conferir('adicionar põe os grupos novos depois dos antigos', arvore(somada).map((a) => `${a.codigo} ${a.titulo}`), ['1 Velha', '1.1 Velha filha', '2 Demolição', '3 Hidráulica', '3.1 Tubulação', '3.1.1 Prumadas'])
conferir('ids novos não colidem', new Set(somada.map((a) => a.id)).size, 6)
conferir('atividade nova nasce a fazer, 0%', [somada[2].status, somada[2].progresso, somada[2].subtarefas], ['a_fazer', 0, []])
conferir('a lista existente não é alterada', existentes.length, 2)
const restr = [{ id: 1, atividadeId: 2 }]
conferir('substituir descarta as restrições (os ids recomeçam em 1)', restricoesDaImportacao(restr, 'substituir'), [])
conferir('adicionar mantém as restrições', restricoesDaImportacao(restr, 'adicionar'), restr)

// Planilha modelo: gerar, abrir de novo e importar
const bytes = await gerarModelo(cal)
const lida = await lerPlanilha(new File([bytes], 'modelo.xlsx'))
conferir('modelo: cabeçalho idêntico', lida[0], cab)
conferir('modelo: ITEM sai como texto', lida.slice(1, 5).map((l) => l[0]), ['1', '2', '2.1', '2.2'])
conferir('modelo: datas em DD/MM/AAAA', lida[1].slice(2, 5), ['05/10/2026', '09/10/2026', '5'])
const doModelo = analisarLinhas(linhasDaPlanilha(lida).linhas, cal)
conferir('modelo importa sem erro', [doModelo.itens.length, doModelo.totalErros], [4, 0])
conferir('modelo vira EAP', arvore(montarAtividades(doModelo.itens, 'substituir', [])).map((a) => `${a.codigo} ${a.titulo}`), ['1 Demolição', '2 Hidráulica', '2.1 Tubulação de água fria', '2.2 Instalação de ralos'])
const csv = await lerPlanilha(new File(['ITEM;Atividade;Início;Término;Duração (Dias)\r\n1;Teste;05/10/2026;06/10/2026;\r\n'], 'a.csv'))
conferir('csv lido sem biblioteca', analisarLinhas(linhasDaPlanilha(csv).linhas, cal).totalErros, 0)
let recusa = ''
try { await lerPlanilha(new File(['x'], 'a.pdf')) } catch (e) { recusa = e.message }
conferir('formato recusado em português', recusa, 'Formato não aceito. Envie um arquivo .xlsx ou .csv.')
recusa = ''
try { recusa = linhasDaPlanilha(await lerPlanilha(new File(['isto não é um xlsx'], 'a.xlsx'))).erro } catch (e) { recusa = e.message }
conferir('arquivo que não é planilha avisa em português', recusa.length > 0, true)

console.log(`importacao: ${ok}/${tot}`)
process.exit(ok === tot ? 0 : 1)
