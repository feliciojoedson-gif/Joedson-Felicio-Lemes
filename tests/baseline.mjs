// Linha de base (planejado original x atual) e datas reais (início e término). Node puro: `node tests/baseline.mjs`.
import {
  alternarSubtarefa, aplicarAtividade, baselineDaImportacao, calendarioPadrao, compararBaseline, criarBaseline, deslocamentoUteis,
  ampliarPeriodo, errosAtividade, moverAtividade, periodoRealDaAtividade, resumoBaseline, textoDesvio,
} from '../src/lib/planejamento.js'
import { analisarLinhas, linhasDaPlanilha, montarAtividades } from '../src/lib/importacao.js'
import { planejamentoDeExemplo } from './fixtures/mockData.js'

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
const { atividades, baseline } = planejamentoDeExemplo.U12
const HOJE = '2026-10-04'

// Deslocamento em dias úteis, com sinal
conferir('igual', deslocamentoUteis('2026-10-05', '2026-10-05', cal), 0)
conferir('atrasou 2 dias úteis (sexta para terça, pulando o fim de semana)', deslocamentoUteis('2026-10-02', '2026-10-06', cal), 2)
conferir('feriado não conta (12/10): sexta 09 para quarta 14 são 2', deslocamentoUteis('2026-10-09', '2026-10-14', cal), 2)
conferir('adiantou 3 dias úteis (13, 14 e 15 de outubro)', deslocamentoUteis('2026-10-15', '2026-10-09', cal), -3)
conferir('texto do desvio', [textoDesvio(0), textoDesvio(1), textoDesvio(2), textoDesvio(-3)], ['no prazo', '+1 dia útil', '+2 dias úteis', '-3 dias úteis'])

// Criar a linha de base
const foto = criarBaseline(atividades, HOJE)
conferir('foto das datas planejadas', [foto.salvaEm, foto.itens.length, foto.itens[0]], [HOJE, 12, { id: 1, inicio: '2026-09-14', fim: '2026-10-06' }])
conferir('só guarda id e datas planejadas', Object.keys(foto.itens[2]), ['id', 'inicio', 'fim'])
conferir('logo depois de salvar, nada se desviou', [...compararBaseline(atividades, foto, cal).values()].every((c) => c.situacao === 'igual'), true)

// Comparar (massa de exemplo)
const cmp = compararBaseline(atividades, baseline, cal)
conferir('sem linha de base não há comparação', compararBaseline(atividades, null, cal), null)
conferir('situação de cada atividade', [...cmp].map(([id, c]) => `${id}:${c.situacao}`).join(' '), '1:igual 2:igual 3:atrasou 4:igual 5:atrasou 6:atrasou 7:igual 8:atrasou 9:atrasou 10:atrasou 11:atrasou 12:atrasou')
conferir('louças terminam 2 dias úteis depois', [cmp.get(3).fimLB, cmp.get(3).desvioFim, cmp.get(3).desvioInicio], ['2026-09-30', 2, 0])
const res = resumoBaseline(cmp, atividades, baseline, cal)
conferir('resumo: 8 atrasadas, término final +2 dias úteis', [res.atrasadas, res.adiantadas, res.novas, res.fimLB, res.fimAtual, res.desvioFinal], [8, 0, 0, '2026-12-09', '2026-12-11', 2])

// Atividade nova depois da linha de base, adiantada, e arquivada
const comNova = aplicarAtividade(atividades, { titulo: 'Extra', inicio: '2026-10-05', fim: '2026-10-06', parentId: null, antesDeId: null }, undefined, 13)
conferir('atividade criada depois é "nova"', compararBaseline(comNova, baseline, cal).get(13), { situacao: 'nova' })
const adiantada = atividades.map((a) => (a.id === 9 ? { ...a, fim: '2026-11-03' } : a))
conferir('término antes do original = adiantou', compararBaseline(adiantada, baseline, cal).get(9).situacao, 'adiantou')
conferir('arquivada some da comparação', compararBaseline(atividades.map((a) => (a.id === 9 ? { ...a, arquivada: true } : a)), baseline, cal).has(9), false)
conferir('"substituir" na importação descarta a linha de base', [baselineDaImportacao(baseline, 'substituir'), baselineDaImportacao(baseline, 'adicionar') === baseline], [null, true])
conferir('T405 não tem linha de base', planejamentoDeExemplo.T405.baseline, undefined)

// Início e término reais: validação
conferir('reais são opcionais', errosAtividade({ titulo: 'A', inicio: '2026-10-05', fim: '2026-10-09' }), {})
conferir('término real sem início real', errosAtividade({ titulo: 'A', inicio: '2026-10-05', fim: '2026-10-09', inicioReal: '', fimReal: '2026-10-08' }).fimReal, 'Informe o início real antes do término real.')
conferir('término real antes do início real', errosAtividade({ titulo: 'A', inicio: '2026-10-05', fim: '2026-10-09', inicioReal: '2026-10-08', fimReal: '2026-10-07' }).fimReal, 'O término real não pode ser antes do início real.')
conferir('datas reais válidas', errosAtividade({ titulo: 'A', inicio: '2026-10-05', fim: '2026-10-09', inicioReal: '2026-10-06', fimReal: '2026-10-10' }), {})
conferir('data real inválida', errosAtividade({ titulo: 'A', inicio: '2026-10-05', fim: '2026-10-09', inicioReal: '2026-02-30' }).inicioReal, 'Início real inválido.')

// Guardar as datas reais
const base = { inicio: '2026-10-05', fim: '2026-10-09', parentId: null, antesDeId: null }
conferir('atividade nova nasce sem datas reais', (({ inicioReal, fimReal }) => [inicioReal, fimReal])(aplicarAtividade([], { ...base, titulo: 'N' }, undefined, 1)[0]), [null, null])
const editada = aplicarAtividade(atividades, { ...base, titulo: 'Retirada', parentId: 1, inicioReal: '2026-09-15', fimReal: '2026-09-26' }, 2, undefined).find((a) => a.id === 2)
conferir('editar grava as datas reais e o dia da conclusão acompanha o término real', [editada.inicioReal, editada.fimReal, editada.concluidaEm], ['2026-09-15', '2026-09-26', '2026-09-26'])
conferir('editar sem informar as reais não apaga as que existem', aplicarAtividade(atividades, { ...base, titulo: 'Retirada', parentId: 1 }, 2, undefined).find((a) => a.id === 2).inicioReal, '2026-09-14')
conferir('limpar as reais no formulário', aplicarAtividade(atividades, { ...base, titulo: 'Retirada', parentId: 1, inicioReal: '', fimReal: '' }, 2, undefined).find((a) => a.id === 2).inicioReal, null)

// Mover no Kanban preenche e limpa as datas reais
const a0 = { id: 1, titulo: 'X', inicio: '2026-10-05', fim: '2026-10-09', progresso: 0, status: 'a_fazer', concluidaEm: null, inicioReal: null, fimReal: null, subtarefas: [] }
const a1 = moverAtividade(a0, 'andamento', {}, '2026-10-06')
conferir('iniciar grava o início real', [a1.inicioReal, a1.fimReal], ['2026-10-06', null])
const a2 = moverAtividade(a1, 'concluida', {}, '2026-10-08')
conferir('concluir grava o término real e mantém o início', [a2.inicioReal, a2.fimReal, a2.concluidaEm], ['2026-10-06', '2026-10-08', '2026-10-08'])
conferir('concluir direto grava início e fim no mesmo dia', (({ inicioReal, fimReal }) => [inicioReal, fimReal])(moverAtividade(a0, 'concluida', {}, '2026-10-07')), ['2026-10-07', '2026-10-07'])
conferir('reabrir limpa só o término real', (({ inicioReal, fimReal }) => [inicioReal, fimReal])(moverAtividade(a2, 'andamento', {}, '2026-10-09')), ['2026-10-06', null])
conferir('voltar para a fazer limpa as duas', (({ inicioReal, fimReal }) => [inicioReal, fimReal])(moverAtividade(a2, 'a_fazer', {}, '2026-10-09')), [null, null])
const comSub = alternarSubtarefa({ ...a0, subtarefas: [{ id: 1, titulo: 'a', feita: false }, { id: 2, titulo: 'b', feita: false }] }, 1, true, '2026-10-06')
conferir('marcar a primeira subtarefa grava o início real', [comSub.status, comSub.inicioReal], ['andamento', '2026-10-06'])

// Importar com colunas reais
const cab = ['ITEM', 'Atividade', 'Início', 'Término', 'Duração (Dias)', 'Início Real', 'Término Real']
const ler = (...linhas) => analisarLinhas(linhasDaPlanilha([cab, ...linhas]).linhas, cal)
const imp = ler(
  ['1', 'Feita', '05/10/2026', '09/10/2026', '', '06/10/2026', '08/10/2026'],
  ['2', 'Andando', '05/10/2026', '09/10/2026', '', '07/10/2026', ''],
  ['3', 'Parada', '05/10/2026', '09/10/2026', '', '', ''],
)
conferir('importar: sem erros', imp.totalErros, 0)
const importadas = montarAtividades(imp.itens, 'substituir', [])
conferir('importar: término real = concluída; só início = em andamento; nada = a fazer', importadas.map((a) => [a.status, a.progresso, a.inicioReal, a.fimReal, a.concluidaEm]), [['concluida', 100, '2026-10-06', '2026-10-08', '2026-10-08'], ['andamento', 10, '2026-10-07', null, null], ['a_fazer', 0, null, null, null]])
const ruim = ler(['1', 'A', '05/10/2026', '09/10/2026', '', '31/02/2026', ''], ['2', 'B', '05/10/2026', '09/10/2026', '', '', '08/10/2026'], ['3', 'C', '05/10/2026', '09/10/2026', '', '08/10/2026', '07/10/2026'])
conferir('importar: erros das datas reais', ruim.itens.map((i) => i.erros.inicioReal || i.erros.fimReal), ['Início real inválido (use DD/MM/AAAA).', 'Informe o início real antes do término real.', 'O término real não pode ser antes do início real.'])
conferir('importar: planilha de 5 colunas continua valendo', analisarLinhas(linhasDaPlanilha([cab.slice(0, 5), ['1', 'A', '05/10/2026', '09/10/2026', '']]).linhas, cal).totalErros, 0)

// Período da linha do tempo e datas reais dos grupos
conferir('ampliar o período para caber a linha de base', ampliarPeriodo({ inicio: '2026-09-14', fim: '2026-12-11' }, ['2026-09-01', null, '2026-12-20', undefined]), { inicio: '2026-09-01', fim: '2026-12-20' })
conferir('datas dentro do período não mudam nada', ampliarPeriodo({ inicio: '2026-09-14', fim: '2026-12-11' }, ['2026-10-01', null]), { inicio: '2026-09-14', fim: '2026-12-11' })
conferir('real de uma folha', periodoRealDaAtividade(atividades, 3), { inicioReal: '2026-09-22', fimReal: null })
conferir('real do grupo: começou na primeira, ainda não terminou (louças em aberto)', periodoRealDaAtividade(atividades, 1), { inicioReal: '2026-09-14', fimReal: null })
const todasConcluidas = atividades.map((a) => (a.id === 3 ? { ...a, inicioReal: '2026-09-22', fimReal: '2026-10-02' } : a))
conferir('real do grupo: termina quando todas terminam, na última data', periodoRealDaAtividade(todasConcluidas, 1), { inicioReal: '2026-09-14', fimReal: '2026-10-06' })
conferir('grupo sem nenhuma data real', periodoRealDaAtividade(atividades, 10), { inicioReal: null, fimReal: null })

console.log(`baseline: ${ok}/${tot}`)
process.exit(ok === tot ? 0 : 1)
