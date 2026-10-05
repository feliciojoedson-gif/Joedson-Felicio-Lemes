// Regras do Gemba Walk (src/lib/qualidade.js). Node puro: `node tests/qualidade-gemba.mjs`.
import {
  classeDoDesperdicio, DESPERDICIOS, errosGemba, filtrarGemba, novaObservacaoGemba, ordenarGemba, rankingDesperdicios, vencida,
} from '../src/lib/qualidade.js'
import { gembaDeExemplo } from '../src/lib/mockData.js'

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
const u12 = gembaDeExemplo.filter((o) => o.obraCodigo === 'U12')
const t405 = gembaDeExemplo.filter((o) => o.obraCodigo === 'T405')
const ids = (l) => l.map((o) => o.id)

// Massa de exemplo
conferir('os 7 tipos têm o nome exato', DESPERDICIOS.map(([n]) => n), ['Retrabalho', 'Espera', 'Transporte', 'Movimentação', 'Estoque', 'Superprodução', 'Processo desnecessário'])
conferir('obra 1: 6 a 8 observações', u12.length >= 6 && u12.length <= 8, true)
conferir('obra 2 tem poucas', t405.length, 2)
conferir('a obra 1 cobre os 7 tipos', new Set(u12.flatMap((o) => o.desperdicios)).size, 7)
conferir('os 3 status aparecem', [...new Set(u12.map((o) => o.status))].sort(), ['em_andamento', 'pendente', 'resolvido'])
conferir('todo registro tem ao menos 1 tipo', gembaDeExemplo.every((o) => o.desperdicios.length >= 1), true)

// Ranking: do maior para o menor, só quem aparece
conferir('ranking da obra 1', rankingDesperdicios(u12), [
  { nome: 'Retrabalho', qtd: 3 }, { nome: 'Espera', qtd: 2 }, { nome: 'Movimentação', qtd: 2 },
  { nome: 'Transporte', qtd: 1 }, { nome: 'Estoque', qtd: 1 }, { nome: 'Superprodução', qtd: 1 }, { nome: 'Processo desnecessário', qtd: 1 },
])
conferir('ranking da obra 2', rankingDesperdicios(t405), [{ nome: 'Retrabalho', qtd: 1 }, { nome: 'Espera', qtd: 1 }])
conferir('ranking vazio', rankingDesperdicios([]), [])

// Filtros
conferir('por tipo (uma observação pode ter vários)', ids(filtrarGemba(u12, { tipo: 'Movimentação' }, HOJE)), [3, 7])
conferir('vencidos: prazo passou e não resolvida', ids(filtrarGemba(u12, { prazo: 'vencidos' }, HOJE)), [1])
conferir('resolvida nunca é vencida', vencida(u12.find((o) => o.id === 6), HOJE), false)
conferir('hoje', ids(filtrarGemba(u12, { prazo: 'hoje' }, HOJE)), [7])
conferir('esta semana (hoje a +6 dias)', ids(filtrarGemba(u12, { prazo: 'semana' }, HOJE)), [2, 3, 5, 7])
conferir('sem prazo', ids(filtrarGemba(u12, { prazo: 'sem_prazo' }, HOJE)), [4])
conferir('busca ignora acento e maiúscula', ids(filtrarGemba(u12, { busca: 'PERMISSAO' }, HOJE)), [2])
conferir('busca acha na causa raiz', ids(filtrarGemba(u12, { busca: 'desenho' }, HOJE)), [1])
conferir('filtros combinam', ids(filtrarGemba(u12, { tipo: 'Retrabalho', prazo: 'vencidos' }, HOJE)), [1])

// Ordem dentro da coluna: vencidas, depois prazo; sem prazo por último
const pendentes = u12.filter((o) => o.status === 'pendente')
conferir('ordem da coluna pendente', ids(ordenarGemba(pendentes, HOJE)), [1, 7, 3, 4])

// Validação do formulário
const certo = { local: 'a', descricao: 'b', causaRaiz: 'c', acao: 'd', desperdicios: ['Espera'], responsavel: 'e' }
conferir('formulário válido (prazo é opcional)', errosGemba(certo), {})
conferir('vazio acusa os obrigatórios', Object.keys(errosGemba({})).sort(), ['acao', 'causaRaiz', 'descricao', 'desperdicios', 'local', 'responsavel'])
conferir('tipo inventado é recusado', errosGemba({ ...certo, desperdicios: ['Atraso'] }).desperdicios, 'Tipo de desperdício inválido.')
conferir('prazo mal formado', errosGemba({ ...certo, prazo: '04/10/2026' }).prazo, 'Prazo inválido.')

// Criação
const nova = novaObservacaoGemba({ ...certo, local: ' Rack 9 ', desperdicios: ['Superprodução', 'Espera'], prazo: '' }, { id: 'x', obraCodigo: 'U12' })
conferir('nasce pendente, sem espaços, tipos na ordem canônica', [nova.status, nova.local, nova.desperdicios, nova.prazo, nova.foto], ['pendente', 'Rack 9', ['Espera', 'Superprodução'], '', ''])
conferir('classe de cor por tipo', [classeDoDesperdicio('Espera'), classeDoDesperdicio('Processo desnecessário')], ['espera', 'processo'])

console.log(ok === tot ? `qualidade-gemba: ${ok}/${tot} ok` : `qualidade-gemba: ${ok}/${tot} ok — FALHOU`)
process.exit(ok === tot ? 0 : 1)
