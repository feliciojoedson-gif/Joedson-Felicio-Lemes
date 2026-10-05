// Regras do Kanban de Materiais (src/lib/regras.js) (a camada dados.js importa o Supabase e só roda no Vite, por isso não entra aqui). Node puro: `node tests/materiais.mjs`.
import {
  aplicarMovimento, chegaNaSemana, contadoresMateriais, diasNaColuna, errosCompra, errosEntrega, errosPedido,
  errosRecebimento, estaAtrasado, leadTimeDias, limparNumero, novoPedido, pillDoPedido, temAlertaDeRecebimento, textoDeDias,
} from '../src/lib/regras.js'
import { materiaisCatalogo, pedidos } from './fixtures/mockData.js'

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

const HOJE = '2026-10-04'
const doMock = (id) => pedidos.find((p) => p.id === id)
const daObra = (n) => pedidos.filter((p) => p.obraCodigo === (n === 1 ? 'U12' : 'T405'))

// Massa de exemplo
conferir('catálogo tem 10 a 12 materiais', materiaisCatalogo.length >= 10 && materiaisCatalogo.length <= 12, true)
conferir('obra 1 tem 8 a 10 pedidos', daObra(1).length >= 8 && daObra(1).length <= 10, true)
conferir('obra 2 tem poucos pedidos', daObra(2).length, 2)
conferir('os 5 status aparecem na obra 1', [...new Set(daObra(1).map((p) => p.status))].sort(), ['almoxarifado', 'comprado', 'cotacao', 'entregue', 'solicitar'])

// Aging, atraso e lead time
conferir('atrasado: previsão vencida e ainda comprado', estaAtrasado(doMock(6), HOJE), true)
conferir('não atrasado: previsão futura', estaAtrasado(doMock(5), HOJE), false)
conferir('previsão vencida mas já no almoxarifado não é atraso', estaAtrasado({ ...doMock(6), status: 'almoxarifado' }, HOJE), false)
conferir('previsão de hoje não é atraso', estaAtrasado({ ...doMock(5), previsaoEntrega: HOJE }, HOJE), false)
conferir('chega na semana: daqui a 3 dias', chegaNaSemana(doMock(5), HOJE), true)
conferir('chega na semana: daqui a 8 dias não', chegaNaSemana({ ...doMock(5), previsaoEntrega: '2026-10-12' }, HOJE), false)
conferir('aging conta da última entrada na coluna', diasNaColuna(doMock(6), HOJE), 8)
conferir('aging de hoje = 0', diasNaColuna(doMock(2), HOJE), 0)
conferir('texto de dias', [textoDeDias(0), textoDeDias(1), textoDeDias(5)], ['hoje', 'há 1 dia', 'há 5 dias'])
conferir('lead time: solicitar até almoxarifado', leadTimeDias(doMock(7)), 11)
conferir('lead time é nulo antes de chegar', leadTimeDias(doMock(6)), null)
conferir('contadores da obra 1', contadoresMateriais(daObra(1), HOJE), { cotacao: 2, semana: 1, atrasados: 1 })
conferir('contadores da obra 2', contadoresMateriais(daObra(2), HOJE), { cotacao: 1, semana: 0, atrasados: 0 })

// Recebimento e cores
conferir('alerta quando a quantidade não bate', temAlertaDeRecebimento(doMock(8)), true)
conferir('sem alerta quando tudo certo', temAlertaDeRecebimento(doMock(7)), false)
conferir('pill crítico é vermelho', pillDoPedido(doMock(2), 'instalacoes').tom, 'bad')
conferir('pill grosso é azul', pillDoPedido(doMock(1), 'grosso').tom, 'info')
conferir('pill acabamento é verde', pillDoPedido(doMock(3), 'acabamento').tom, 'ok')

// Movimentos
const novo = novoPedido({ id: 99, obraCodigo: 'U12', materialId: 1, quantidade: 5, frente: ' Garagem ', prioridade: 'normal' }, HOJE)
conferir('pedido novo nasce em solicitar com histórico', [novo.status, novo.historico, novo.frente], ['solicitar', [{ status: 'solicitar', data: HOJE }], 'Garagem'])
const comprado = aplicarMovimento(novo, 'comprado', { fornecedor: ' Loja X ', previsaoEntrega: '2026-10-10' }, '2026-10-05')
conferir('comprado grava fornecedor, previsão e histórico', [comprado.fornecedor, comprado.previsaoEntrega, comprado.historico.at(-1)], ['Loja X', '2026-10-10', { status: 'comprado', data: '2026-10-05' }])
conferir('mover não altera o pedido original', novo.status, 'solicitar')
const recebido = aplicarMovimento(comprado, 'almoxarifado', { qtdBateNF: false, estadoOk: true, avarias: ' faltou ', fotoNF: 'blob:x' }, '2026-10-06')
conferir('almoxarifado grava o checklist', recebido.recebimento, { qtdBateNF: false, estadoOk: true, avarias: 'faltou', fotoNF: 'blob:x' })
conferir('resposta não gera alerta', temAlertaDeRecebimento(recebido), true)
conferir('lead time do pedido movido', leadTimeDias(recebido), 2)
conferir('entregue confirma a frente', aplicarMovimento(recebido, 'entregue', { frente: ' Cozinha ' }, '2026-10-07').frente, 'Cozinha')
conferir('voltar de coluna reinicia o aging e mantém o fornecedor', [diasNaColuna(aplicarMovimento(recebido, 'comprado', {}, '2026-10-08'), '2026-10-09'), aplicarMovimento(recebido, 'comprado', {}, '2026-10-08').fornecedor], [1, 'Loja X'])

// Validações
conferir('pedido válido', errosPedido({ materialId: 1, quantidade: '50', frente: 'Sala', prioridade: 'normal' }), {})
conferir('pedido vazio avisa tudo', Object.keys(errosPedido({ materialId: '', quantidade: '', frente: ' ', prioridade: 'normal' })), ['materialId', 'quantidade', 'frente'])
conferir('quantidade zero avisa', Object.keys(errosPedido({ materialId: 1, quantidade: '0', frente: 'Sala', prioridade: 'normal' })), ['quantidade'])
conferir('quantidade decimal com vírgula vale', errosPedido({ materialId: 1, quantidade: '2,5', frente: 'Sala', prioridade: 'critico' }), {})
conferir('limparNumero só deixa número e uma vírgula', [limparNumero('1a2,3,4'), limparNumero('2.5'), limparNumero('abc')], ['12,34', '2,5', ''])
conferir('compra exige fornecedor e previsão', Object.keys(errosCompra({ fornecedor: '', previsaoEntrega: '' }, HOJE)), ['fornecedor', 'previsaoEntrega'])
conferir('compra recusa previsão no passado', Object.keys(errosCompra({ fornecedor: 'X', previsaoEntrega: '2026-10-03' }, HOJE)), ['previsaoEntrega'])
conferir('compra com previsão de hoje vale', errosCompra({ fornecedor: 'X', previsaoEntrega: HOJE }, HOJE), {})
conferir('recebimento exige as duas respostas', Object.keys(errosRecebimento({ qtdBateNF: null, estadoOk: null })), ['qtdBateNF', 'estadoOk'])
conferir('recebimento aceita resposta não', errosRecebimento({ qtdBateNF: false, estadoOk: false }), {})
conferir('entrega exige frente', Object.keys(errosEntrega({ frente: ' ' })), ['frente'])

console.log(`${ok}/${tot} — materiais`)
process.exit(ok === tot ? 0 : 1)
