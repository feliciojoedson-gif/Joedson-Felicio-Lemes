// Médio prazo (lookahead de restrições): semanas, colunas, mover por botão, filtros, validação. Node puro: `node tests/lookahead.mjs`.
import {
  aplicarRestricao, colunaDaRestricao, contadoresDeRestricoes, errosRestricao, montarLookahead, prazoMovido, reprogramarRestricao,
  resolverRestricao, responsaveisDasRestricoes, restricoesAbertasPorAtividade, semanasDoLookahead, TIPOS_RESTRICAO_PLAN, tipoDaRestricao,
  arquivarAtividade, segundaDeReferencia,
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

const H = '2026-10-04' // domingo: a semana atual é a de 05/10
const { atividades, restricoes } = planejamentoDeExemplo.U12
const sem4 = semanasDoLookahead(H, 4)
const ids = (lista) => lista.map((r) => r.id)

// Tipos
conferir('7 tipos, cada um com ícone e chave próprios', [TIPOS_RESTRICAO_PLAN.length, new Set(TIPOS_RESTRICAO_PLAN.map((t) => t.chave)).size, new Set(TIPOS_RESTRICAO_PLAN.map((t) => t.icone)).size], [7, 7, 7])
conferir('tipo pelo rótulo, com padrão', [tipoDaRestricao('Mão de Obra').chave, tipoDaRestricao('xx').chave], ['mao-de-obra', 'material'])
conferir('todo tipo do exemplo existe', Object.values(planejamentoDeExemplo).every((o) => o.restricoes.every((r) => TIPOS_RESTRICAO_PLAN.some((t) => t.rotulo === r.tipo))), true)

// Semanas
conferir('domingo já olha para a semana que começa na segunda', sem4.map((s) => [s.inicio, s.fim]), [['2026-10-05', '2026-10-11'], ['2026-10-12', '2026-10-18'], ['2026-10-19', '2026-10-25'], ['2026-10-26', '2026-11-01']])
conferir('sábado também; sexta ainda é a semana de hoje', [segundaDeReferencia('2026-10-03'), segundaDeReferencia('2026-10-02')], ['2026-10-05', '2026-09-28'])
const semU = semanasDoLookahead('2026-10-07', 3)
conferir('quarta-feira: semana atual vai de 05 a 11/10', [semU[0].inicio, semU[0].fim, semU[0].atual, semU[1].atual, semU[0].periodo], ['2026-10-05', '2026-10-11', true, false, '05/10 a 11/10'])
conferir('nº de semanas pedido', [semanasDoLookahead('2026-10-07', 6).length, semanasDoLookahead('2026-10-07', 3).length], [6, 3])

// A massa de exemplo é lida numa quarta-feira, com a semana atual de 05 a 09/10
const H2 = '2026-10-07'
const s4 = semanasDoLookahead(H2, 4)
const col = (id, semanas = s4) => colunaDaRestricao(restricoes.find((r) => r.id === id), semanas)
conferir('prazo de semana passada e aberta: atrasadas', col(7), 'atrasadas')
conferir('prazo na semana atual', [col(1), col(2)], [0, 0])
conferir('prazos nas semanas seguintes', [col(3), col(5)], [1, 2])
conferir('prazo além do horizonte: fora', col(6), null)
conferir('resolvida de semana passada não é atrasada', col(4), null)

const board = montarLookahead(restricoes, atividades, s4)
conferir('board: atrasadas', ids(board.atrasadas), [7])
conferir('board: por semana', board.semanas.map(ids), [[1, 2], [3], [5], []])
conferir('board: 1 aberta além do horizonte', board.alem, 1)
conferir('6 semanas mostram a restrição distante', montarLookahead(restricoes, atividades, semanasDoLookahead(H2, 6)).alem, 0)
conferir('resolvida só aparece quando pedido', ids(montarLookahead(restricoes, atividades, s4, { resolvidas: true }).atrasadas), [4, 7])
conferir('filtro por responsável', montarLookahead(restricoes, atividades, s4, { responsavel: 'Paula (Engenharia)' }).semanas.map(ids), [[], [], [5], []])
conferir('responsáveis sem repetição, em ordem', responsaveisDasRestricoes(restricoes), ['Ana (Planejamento)', 'Carlos (Suprimentos)', 'Marcos (Produção)', 'Paula (Engenharia)', 'Rafael (Segurança)'])
conferir('atividade arquivada some do board', montarLookahead(restricoes, arquivarAtividade(atividades, 8, true), s4).semanas[0].length, 1)
conferir('na T405 outro board', montarLookahead(planejamentoDeExemplo.T405.restricoes, planejamentoDeExemplo.T405.atividades, s4).semanas.map(ids), [[1], [], [], []])

// Contadores
conferir('contadores da U12', contadoresDeRestricoes(restricoes, atividades, H2), { abertas: 6, vencidas: 1, resolvidas: 1 })
conferir('restrições abertas por atividade', [...restricoesAbertasPorAtividade(restricoes)].sort((a, b) => a[0] - b[0]), [[3, 1], [6, 1], [8, 1], [9, 2], [11, 1]])

// Mover por botão: mesma posição na semana vizinha
const r1 = restricoes.find((r) => r.id === 1) // quinta 08/10, semana 1
conferir('próxima semana: quinta continua quinta', prazoMovido(r1, 1, s4), '2026-10-15')
conferir('semana atual não volta para trás', prazoMovido(r1, -1, s4), null)
const r5 = restricoes.find((r) => r.id === 5) // 23/10, semana 3
conferir('semana anterior', prazoMovido(r5, -1, s4), '2026-10-16')
conferir('última semana visível não avança', prazoMovido({ ...r5, prazo: '2026-10-28' }, 1, s4), null)
const r7 = restricoes.find((r) => r.id === 7) // sexta 02/10, atrasada
conferir('atrasada vai para a semana atual, mesma posição', [prazoMovido(r7, 1, s4), prazoMovido(r7, -1, s4)], ['2026-10-09', null])
conferir('fora do horizonte não tem seta', prazoMovido(restricoes.find((r) => r.id === 6), 1, s4), null)
const movida = reprogramarRestricao(restricoes, 1, '2026-10-15')
conferir('reprogramar muda só o prazo e não altera a original', [movida.find((r) => r.id === 1).prazo, restricoes.find((r) => r.id === 1).prazo], ['2026-10-15', '2026-10-08'])

// Criar, editar, resolver
const campos = { atividadeId: '8', descricao: '  Falta cabo  ', tipo: 'Material', prazo: '2026-10-10', responsavel: ' Ana ' }
const criada = aplicarRestricao(restricoes, campos, undefined, 8)
conferir('cria aberta, com texto aparado e atividade numérica', criada.at(-1), { id: 8, atividadeId: 8, descricao: 'Falta cabo', tipo: 'Material', prazo: '2026-10-10', responsavel: 'Ana', resolvida: false, resolvidaEm: null })
conferir('editar mantém id e situação', aplicarRestricao(restricoes, { ...campos, descricao: 'Outra' }, 4, undefined).find((r) => r.id === 4).resolvida, true)
const res = resolverRestricao(restricoes, 1, true, H2)
conferir('resolver grava o dia', [res.find((r) => r.id === 1).resolvida, res.find((r) => r.id === 1).resolvidaEm], [true, H2])
conferir('reabrir limpa o dia', resolverRestricao(res, 1, false, H2).find((r) => r.id === 1).resolvidaEm, null)

// Validação
conferir('tudo vazio avisa', Object.keys(errosRestricao({ atividadeId: '', descricao: ' ', tipo: '', prazo: '', responsavel: '' }, H2, true)), ['atividadeId', 'descricao', 'tipo', 'prazo', 'responsavel'])
conferir('restrição válida', errosRestricao(campos, H2, true), {})
conferir('prazo no passado só é erro ao criar', [errosRestricao({ ...campos, prazo: '2026-10-01' }, H2, true).prazo, errosRestricao({ ...campos, prazo: '2026-10-01' }, H2, false).prazo], ['O prazo não pode ser antes de hoje.', undefined])
conferir('tipo fora da lista', errosRestricao({ ...campos, tipo: 'Outro' }, H2, true).tipo, 'Escolha o tipo da restrição.')

console.log(`lookahead: ${ok}/${tot}`)
process.exit(ok === tot ? 0 : 1)
