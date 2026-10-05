// Regras do módulo Qualidade (src/lib/qualidade.js). Node puro: `node tests/qualidade.mjs`.
import {
  acrescentarObservacao, aplicarMudanca, carimbo, diasDeAtraso, errosMudanca, errosPendencia, filtrarPendencias, kpisPendencias,
  novaPendencia, ordenarPendencias, pendentesPorResponsavel, proximoNumero, somarDias, vencida,
} from '../src/lib/qualidade.js'
import { pendenciasDeExemplo } from '../src/lib/mockData.js'

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
const u12 = pendenciasDeExemplo.filter((p) => p.obraCodigo === 'U12')
const t405 = pendenciasDeExemplo.filter((p) => p.obraCodigo === 'T405')
const doMock = (id) => pendenciasDeExemplo.find((p) => p.id === id)

// Massa de exemplo: duas obras, a segunda com poucos registros
conferir('obra 1 tem 5 a 6 pendências', u12.length >= 5 && u12.length <= 6, true)
conferir('obra 2 tem poucas', t405.length, 2)
conferir('numeração começa em 1 em cada obra', [u12[0].numeroRegistro, t405[0].numeroRegistro], [1, 1])
conferir('há uma resolvida com evidência', u12.filter((p) => p.status === 'resolvido' && p.fotoEvidencia).length, 1)
conferir('há uma vencida', u12.filter((p) => vencida(p, HOJE)).length, 1)

// Vencimento
conferir('pendente com prazo passado é vencida', vencida(doMock(1), HOJE), true)
conferir('prazo de hoje não é vencido', vencida(doMock(2), HOJE), false)
conferir('resolvida nunca é vencida', vencida({ ...doMock(1), status: 'resolvido' }, HOJE), false)
conferir('dias de atraso', diasDeAtraso(doMock(1), HOJE), 2)

// KPIs e responsáveis
conferir('KPIs da obra 1', kpisPendencias(u12), { total: 6, pendente: 3, em_andamento: 2, resolvido: 1 })
conferir('por responsável: só em aberto, da maior para a menor', pendentesPorResponsavel(u12), [
  { nome: 'Carlos Menezes', qtd: 2 }, { nome: 'Juliana Prado', qtd: 3 },
].sort((a, b) => b.qtd - a.qtd))

// Filtros
conferir('status', filtrarPendencias(u12, { status: 'resolvido' }, HOJE).map((p) => p.id), [5])
conferir('responsável', filtrarPendencias(u12, { responsavel: 'Carlos Menezes' }, HOJE).map((p) => p.id), [1, 3])
conferir('atrasados', filtrarPendencias(u12, { prazo: 'atrasados' }, HOJE).map((p) => p.id), [1])
conferir('hoje', filtrarPendencias(u12, { prazo: 'hoje' }, HOJE).map((p) => p.id), [2])
conferir('esta semana (hoje a +6 dias)', filtrarPendencias(u12, { prazo: 'semana' }, HOJE).map((p) => p.id), [2, 3, 4])
conferir('busca ignora acento e maiúscula', filtrarPendencias(u12, { busca: 'PORTICO' }, HOJE).map((p) => p.id), [2])
conferir('busca pelo local', filtrarPendencias(u12, { busca: 'casa de bombas' }, HOJE).map((p) => p.id), [6])
conferir('ordem: em aberto por prazo, resolvidas no fim', ordenarPendencias(u12).map((p) => p.id), [1, 2, 3, 4, 6, 5])

// Datas sem UTC
conferir('somar dias passa o fim do mês', somarDias('2026-10-30', 3), '2026-11-02')
conferir('carimbo em Brasília (23h50 de Brasília ainda é o mesmo dia)', carimbo(new Date('2026-10-05T02:50:00Z')), '04/10/2026 23:50')

// Observações acumulativas: a nova vai no topo
const obs1 = acrescentarObservacao('', ' primeira ', new Date('2026-10-04T15:30:00Z'))
conferir('primeira nota', obs1, '[04/10/2026 12:30] primeira')
conferir('nota nova entra em cima', acrescentarObservacao(obs1, 'segunda', new Date('2026-10-04T16:00:00Z')), '[04/10/2026 13:00] segunda\n[04/10/2026 12:30] primeira')

// Validação do formulário
conferir('tudo vazio acusa os obrigatórios', Object.keys(errosPendencia({})).sort(), ['dataVistoria', 'descricao', 'empresa', 'local', 'prazo', 'responsavel'])
conferir('formulário certo não tem erro', errosPendencia({ descricao: 'a', local: 'b', empresa: 'c', responsavel: 'd', prazo: HOJE, dataVistoria: HOJE }), {})
conferir('prazo antes da vistoria', errosPendencia({ descricao: 'a', local: 'b', empresa: 'c', responsavel: 'd', prazo: '2026-10-01', dataVistoria: HOJE }).prazo, 'O prazo não pode ser antes da vistoria.')

// Criação e fluxo
conferir('próximo número é por obra', [proximoNumero(u12), proximoNumero(t405), proximoNumero([])], [7, 3, 1])
const nova = novaPendencia({ descricao: ' vazamento ', local: 'Bomba 2', empresa: 'Alfa', responsavel: 'Ana', prazo: HOJE, dataVistoria: HOJE }, { id: 99, obraCodigo: 'U12', numeroRegistro: 7 }, 'Maria')
conferir('nasce pendente, vistoriada pelo usuário, sem espaços sobrando', [nova.status, nova.vistoriadoPor, nova.descricao], ['pendente', 'Maria', 'vazamento'])
conferir('pendente só vai para em andamento', [errosMudanca(nova, 'em_andamento'), errosMudanca(nova, 'resolvido', { fotoEvidencia: 'x' })], [null, 'Esta pendência não pode ir para esse status.'])
const andando = aplicarMudanca(nova, 'em_andamento', {}, HOJE)
conferir('resolver exige a foto da correção', errosMudanca(andando, 'resolvido', {}), 'Tire a foto que mostra a correção.')
const resolvida = aplicarMudanca(andando, 'resolvido', { fotoEvidencia: 'blob:y' }, HOJE)
conferir('resolvida guarda evidência e data', [resolvida.status, resolvida.fotoEvidencia, resolvida.dataResolucao], ['resolvido', 'blob:y', HOJE])
conferir('mudar não altera o original', nova.status, 'pendente')
conferir('resolvida não anda mais', errosMudanca(resolvida, 'em_andamento'), 'Esta pendência não pode ir para esse status.')

console.log(ok === tot ? `qualidade: ${ok}/${tot} ok` : `qualidade: ${ok}/${tot} ok — FALHOU`)
process.exit(ok === tot ? 0 : 1)
