// Curto prazo (Kanban + PPC): regra da semana, PPC, mover, causa raiz, subtarefas. Node puro: `node tests/curto.mjs`.
import {
  alternarSubtarefa, arquivarAtividade, atividadesDaSemana, CAUSAS_RAIZ, causasDaSemana, colunaNaSemana, errosCausa, errosSubtarefa,
  historicoPPC, moverAtividade, naoRealizarSubtarefa, novaSubtarefa, percentualDasSubtarefas, ppcDaSemana, recalcularAtividade,
  removerSubtarefa, semanaAtual, semanaPorInicio, subtarefasPendentes,
} from '../src/lib/planejamento.js'
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

const U12 = planejamentoDeExemplo.U12.atividades
const T405 = planejamentoDeExemplo.T405.atividades
const HOJE = '2026-10-04' // domingo
const S = semanaAtual(HOJE)
const ids = (itens) => itens.map((i) => i.id)
const base = { id: 1, titulo: 'X', inicio: '2026-10-05', fim: '2026-10-09', progresso: 0, status: 'a_fazer', causa: '', causaDetalhe: '', concluidaEm: null, subtarefas: [] }

// Semana
conferir('domingo olha para a semana que começa na segunda', [S.inicio, S.fim, S.periodo], ['2026-10-05', '2026-10-11', '05/10 a 11/10'])
conferir('semana por início', semanaPorInicio('2026-09-28').periodo, '28/09 a 04/10')

// Regra de entrada na semana (folhas vivas): cruza OU acumulada
const daSemana = atividadesDaSemana(U12, S)
conferir('semana atual da U12: 5 atividades', ids(daSemana), [3, 4, 6, 7, 8])
conferir('acumulada: venceu em 02/10 e não terminou', daSemana.filter((i) => i.acumulada).map((i) => i.id), [3])
conferir('feitas na semana', daSemana.filter((i) => i.feita).map((i) => i.id), [4, 7])
conferir('concluída antes da semana não volta', ids(daSemana).includes(2), false)
conferir('grupos não entram, só folhas', daSemana.every((i) => i.filhos === 0), true)
conferir('muito tempo depois: tudo que ficou por fazer acumula', ids(atividadesDaSemana(U12, semanaPorInicio('2027-03-01'))), [3, 6, 8, 9, 11, 12])
conferir('semana futura: pendentes acumulam, concluídas não', ids(atividadesDaSemana(U12, semanaPorInicio('2026-10-26'))), [3, 6, 8, 9])
conferir('atividade futura só entra quando cruza', ids(atividadesDaSemana(U12, semanaPorInicio('2026-11-09'))), [3, 6, 8, 9, 11])
conferir('arquivada sai da semana', ids(atividadesDaSemana(arquivarAtividade(U12, 8, true), S)), [3, 4, 6, 7])
conferir('outra obra, outra semana', ids(atividadesDaSemana(T405, S)), [3])

// PPC
conferir('PPC da U12 na semana atual: 2 de 5 = 40%', ppcDaSemana(daSemana), { total: 5, feitas: 2, ppc: 40 })
conferir('semana vazia não tem PPC', ppcDaSemana([]), { total: 0, feitas: 0, ppc: null })
const semanaPassada = ppcDaSemana(atividadesDaSemana(U12, semanaPorInicio('2026-09-21')))
conferir('semana de 21/09: concluída em 25/09 conta nela', [semanaPassada.total, semanaPassada.feitas, semanaPassada.ppc], [2, 1, 50])
conferir('histórico do PPC', historicoPPC(U12, HOJE).map((s) => [s.inicio, s.feitas, s.total, s.ppc]), [['2026-09-14', 0, 1, 0], ['2026-09-21', 1, 2, 50], ['2026-09-28', 0, 2, 0], ['2026-10-05', 2, 5, 40]])
conferir('histórico limitado', historicoPPC(U12, HOJE, 2).length, 2)
conferir('sem atividades, sem histórico', historicoPPC([], HOJE), [])
conferir('conclusão no fim de semana conta na semana seguinte', atividadesDaSemana([{ ...base, status: 'concluida', progresso: 100, concluidaEm: '2026-10-04' }], S)[0].feita, true)

// Coluna do cartão
conferir('coluna pelo status', [colunaNaSemana({ status: 'a_fazer' }), colunaNaSemana({ status: 'andamento' }), colunaNaSemana({ status: 'nao_realizado' }), colunaNaSemana({ status: 'concluida', feita: true })], ['a_fazer', 'andamento', 'a_fazer', 'concluida'])
conferir('concluída em outra semana não aparece como concluída', colunaNaSemana({ status: 'concluida', feita: false, progresso: 100 }), 'andamento')

// Mover
const andou = moverAtividade(base, 'andamento', {}, HOJE)
conferir('iniciar sem subtarefas: 10%', [andou.status, andou.progresso], ['andamento', 10])
conferir('concluir: 100% e data de hoje', (({ status, progresso, concluidaEm }) => [status, progresso, concluidaEm])(moverAtividade(andou, 'concluida', {}, HOJE)), ['concluida', 100, HOJE])
conferir('voltar para a fazer zera a data e o progresso', (({ status, progresso, concluidaEm }) => [status, progresso, concluidaEm])(moverAtividade(moverAtividade(andou, 'concluida', {}, HOJE), 'a_fazer', {}, HOJE)), ['a_fazer', 0, null])
const nao = moverAtividade({ ...andou, progresso: 40 }, 'nao_realizado', { causa: 'Material', detalhe: ' sem cimento ' }, HOJE)
conferir('não realizado guarda causa e mantém o progresso', [nao.status, nao.causa, nao.causaDetalhe, nao.progresso], ['nao_realizado', 'Material', 'sem cimento', 40])
conferir('sair de não realizado limpa a causa', [moverAtividade(nao, 'andamento', {}, HOJE).causa, moverAtividade(nao, 'andamento', {}, HOJE).progresso], ['', 40])
conferir('original não é alterado', base.status, 'a_fazer')

// Causa raiz obrigatória
conferir('sem causa avisa', errosCausa({ causa: '', detalhe: '' }), { causa: 'Informe a causa raiz.' })
conferir('Outro exige descrição', errosCausa({ causa: 'Outro', detalhe: ' ' }), { detalhe: 'Descreva a causa.' })
conferir('causa válida', [errosCausa({ causa: 'Clima', detalhe: '' }), CAUSAS_RAIZ.includes('Mão de obra')], [{}, true])

// Subtarefas
let a = novaSubtarefa(base, '  Furar laje  ')
conferir('adicionar subtarefa', [a.subtarefas.length, a.subtarefas[0].titulo, a.progresso], [1, 'Furar laje', 0])
a = novaSubtarefa(a, 'Passar tubo')
a = alternarSubtarefa(a, 1, true)
conferir('marcar uma de duas: 50% e sai de a fazer', [a.progresso, a.status], [50, 'andamento'])
conferir('pendentes', subtarefasPendentes(a), 1)
a = naoRealizarSubtarefa(a, 2, 'Projeto', 'desenho com erro')
conferir('subtarefa não realizada guarda a causa e não conta como feita', [a.subtarefas[1].naoRealizado, a.subtarefas[1].causa, a.progresso], [true, 'Projeto', 50])
a = alternarSubtarefa(a, 2, true)
conferir('marcar feita limpa a causa', [a.subtarefas[1].naoRealizado, a.subtarefas[1].causa, a.progresso], [false, '', 100])
const concl = moverAtividade(a, 'concluida', {}, HOJE)
conferir('nova subtarefa pendente reabre a concluída', [novaSubtarefa(concl, 'Retoque').status, novaSubtarefa(concl, 'Retoque').progresso, novaSubtarefa(concl, 'Retoque').concluidaEm], ['andamento', 67, null])
conferir('concluir marca todas as subtarefas', moverAtividade(naoRealizarSubtarefa(a, 1, 'Clima', ''), 'concluida', {}, HOJE).subtarefas.every((s) => s.feita && !s.naoRealizado), true)
conferir('remover subtarefa recalcula', removerSubtarefa(novaSubtarefa(alternarSubtarefa(a, 1, false), 'Z'), 3).progresso, 50)
conferir('percentual sem subtarefas é nulo', [percentualDasSubtarefas([]), recalcularAtividade(base)], [null, base])
conferir('subtarefa sem nome avisa', errosSubtarefa('  '), { titulo: 'Informe o nome da subtarefa.' })

// Causas da semana (massa de exemplo: a porta da cozinha ficou sem permissão de trabalho)
conferir('causas da semana da U12', causasDaSemana(daSemana), [['Segurança', 1]])
conferir('causas somam atividade e subtarefa', causasDaSemana([nao, { ...base, subtarefas: [{ naoRealizado: true, causa: 'Material' }, { naoRealizado: true, causa: 'Clima' }] }]), [['Material', 2], ['Clima', 1]])

console.log(`curto: ${ok}/${tot}`)
process.exit(ok === tot ? 0 : 1)
