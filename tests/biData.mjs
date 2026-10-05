// Motor adaptativo dos Relatórios (src/lib/biData.js). Node puro: `node tests/biData.mjs`.
import {
  descricaoDosFiltros, rodapeDeImpressao, climaEfetivo, financeiro, materiais, qualidade, mapaDePendencias, ritmo, aplicarFiltros, custoMedido, empresasPresentes, evolucao, executivo, intervaloDoPeriodo, modulosDisponiveis, paretoDeCausas, ppcSemanal, prazo,
} from '../src/lib/biData.js'
import { calendarioPadrao } from '../src/lib/planejamento.js'
import {
  contratos, diarios, gembaDeExemplo, medicoes, ncsDeExemplo, pedidos, pendenciasDeExemplo, vistoriasDeExemplo,
} from '../src/lib/mockData.js'
import { planejamentoCompleto } from '../src/lib/mockData.js'

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
const semNaN = (x) => !/NaN|Infinity|undefined/.test(JSON.stringify(x))

const HOJE = '2026-10-04'
const obra = { codigo: 'U12', data_fim_contratual: '2026-10-30' }
const daObra = (lista, codigo) => lista.filter((x) => x.obraCodigo === codigo)
function fontesDa(codigo) {
  const ids = new Set(daObra(contratos, codigo).map((c) => c.id))
  return {
    atividades: planejamentoCompleto[codigo].atividades, calendario: calendarioPadrao(), baseline: null,
    rdo: daObra(diarios, codigo), pedidos: daObra(pedidos, codigo), catalogo: [],
    contratos: daObra(contratos, codigo), itensContrato: [], boletins: medicoes.filter((m) => ids.has(m.contratoId)),
    pendencias: daObra(pendenciasDeExemplo, codigo), vistorias: daObra(vistoriasDeExemplo, codigo),
    ncs: daObra(ncsDeExemplo, codigo), gemba: daObra(gembaDeExemplo, codigo),
  }
}
const cheia = fontesDa('U12')
const filtrar = (f, filtros = {}) => aplicarFiltros(f, filtros, HOJE)

// Módulos disponíveis
conferir('U12 tem todos os módulos, menos o estoque opcional',
  modulosDisponiveis(cheia), { planejamento: true, diario: true, materiais: true, contratos: true, pendencias: true, fvs: true, gemba: true, estoque: false })
conferir('fontes vazias: nenhum módulo', Object.values(modulosDisponiveis({})).some(Boolean), false)

// REGRA DE OURO: nada quebra nem vira NaN sem dados
const vazia = filtrar({})
conferir('sem dados: executivo todo null', executivo(vazia, HOJE, null), { evolucao: null, prazo: null, custo: null, curva: null, ppc: null })
conferir('sem dados: pareto null', paretoDeCausas(vazia), null)
conferir('sem dados: empresas vazias', empresasPresentes({}), [])
conferir('só Diário: sem Planejamento e sem contratos, sem NaN', semNaN(executivo(filtrar({ rdo: cheia.rdo }), HOJE, obra)), true)

// Evolução, prazo e custo
const v = filtrar(cheia)
const evo = evolucao(v, HOJE)
conferir('evolução: real e previsto são inteiros entre 0 e 100', [Number.isInteger(evo.real), evo.real >= 0 && evo.real <= 100, evo.previsto >= 0 && evo.previsto <= 100], [true, true, true])
conferir('evolução: desvio = real - previsto', evo.desvio, evo.real - evo.previsto)
conferir('prazo: 26 dias até 30/10', prazo(obra, HOJE), { fim: '2026-10-30', dias: 26, atrasado: false, tom: 'ok' })
conferir('prazo vencido', prazo({ data_fim_contratual: '2026-10-01' }, HOJE).dias, -3)
conferir('prazo sem data da obra', prazo({}, HOJE), null)
const custo = custoMedido(v)
conferir('custo medido: Gesso 12.000 + Drywall 17.600 + Demol 12.000', custo.medido, 41600)
conferir('custo medido: só contratos ativos e concluídos', custo.contratos, 3)

// Curva S
const curva = executivo(v, HOJE, obra).curva
conferir('curva S: 9+ semanas de história', curva.semanas.length >= 9, true)
conferir('curva S: planejado nunca decresce', curva.semanas.every((s, i) => i === 0 || s.plan >= curva.semanas[i - 1].plan), true)
conferir('curva S: termina em 100% planejado', curva.semanas.at(-1).plan, 100)
conferir('curva S: real para na semana de hoje', curva.semanas.filter((s) => s.real !== null).at(-1).atual, true)
conferir('curva S: último real = KPI de evolução', curva.semanas.find((s) => s.atual).real, evo.real)

// PPC
const ppc = ppcSemanal(v, HOJE)
conferir('PPC: 8 semanas ou mais', ppc.semanas.length >= 8, true)
conferir('PPC: feitas + não feitas = total em cada semana', ppc.semanas.every((s) => s.feitas + s.naoFeitas === s.total), true)
conferir('PPC geral = soma das feitas / soma dos totais', ppc.ppc, Math.round((ppc.feitas / ppc.total) * 100))

// Pareto
const pareto = paretoDeCausas(v)
conferir('pareto: ordenado do maior para o menor', pareto.causas.every((c, i) => i === 0 || c.qtd <= pareto.causas[i - 1].qtd), true)
conferir('pareto: Clima lidera (3), Mão de obra e Material empatam (2)', pareto.causas.slice(0, 3).map((c) => c.qtd), [3, 2, 2])
conferir('pareto: 1º é Clima', pareto.causas[0].nome, 'Clima')

// Filtros cruzados
conferir('empresas: lista dos contratos, tarefas e qualidade juntas', empresasPresentes(cheia).includes('Gesso Forte Acabamentos') && empresasPresentes(cheia).includes('Metalúrgica Alfa'), true)
const gesso = filtrar(cheia, { empresa: 'Gesso Forte Acabamentos' })
conferir('filtro por empresa: só os contratos dela', gesso.contratos.map((c) => c.empreiteiro), ['Gesso Forte Acabamentos'])
conferir('filtro por empresa: só as tarefas dela', gesso.atividades.every((a) => a.empresa === 'Gesso Forte Acabamentos') && gesso.atividades.length > 0, true)
conferir('filtro por empresa: custo medido é o dela', custoMedido(gesso).medido, 12000)
conferir('filtro por empresa: pendências sem a empresa dela ficam vazias', gesso.pendencias.length, 0)
conferir('filtro por empresa: pendências da Metalúrgica Alfa', filtrar(cheia, { empresa: 'Metalúrgica Alfa' }).pendencias.length, 2)
conferir('filtro por empresa: Diário não filtra', gesso.rdo.length, cheia.rdo.length)
conferir('filtro de empresa sem nada: sem NaN', semNaN(executivo(filtrar(cheia, { empresa: 'Ninguém' }), HOJE, obra)), true)

// Período
conferir('período: tudo = sem intervalo', intervaloDoPeriodo('tudo', HOJE), null)
conferir('período: este mês', intervaloDoPeriodo('mes', HOJE), { de: '2026-10-01', ate: '2026-10-31' })
conferir('período: últimas 4 semanas', intervaloDoPeriodo('4semanas', HOJE), { de: '2026-09-07', ate: '2026-10-04' })
conferir('período mês: diários de outubro', filtrar(cheia, { periodo: 'mes' }).rdo.map((r) => r.data).sort(), ['2026-10-01', '2026-10-02', '2026-10-03'])
conferir('período 4 semanas: contrato continua com o saldo inteiro', filtrar(cheia, { periodo: '4semanas' }).boletinsTodos.length, cheia.boletins.length)
const zoom = executivo(filtrar(cheia, { periodo: '4semanas' }), HOJE, obra, intervaloDoPeriodo('4semanas', HOJE))
conferir('período 4 semanas: curva S mostra só essas semanas', zoom.curva.semanas.every((s) => s.fim >= '2026-09-07' && s.inicio <= '2026-10-04'), true)

// Segunda obra (poucos registros): trocar de obra troca tudo
const t405 = filtrar(fontesDa('T405'))
conferir('T405 tem poucos dados e nenhum NaN', semNaN(executivo(t405, HOJE, { data_fim_contratual: '2026-11-30' })), true)
conferir('T405: evolução diferente da U12', evolucao(t405, HOJE).real !== evo.real, true)
conferir('T405: causas vazias, pareto null', paretoDeCausas(t405), null)

// Painel 2: clima e efetivo
const clima = climaEfetivo(v)
conferir('clima: 10 ou mais diários da U12', clima.dias.length >= 10, true)
conferir('clima: do mais antigo para o mais novo', clima.dias.every((d, i) => i === 0 || d.data >= clima.dias[i - 1].data), true)
conferir('clima: os três climas aparecem', [...new Set(clima.dias.map((d) => d.clima))].sort(), ['chuva', 'nublado', 'sol'])
conferir('clima: dia de chuva tem menos gente que a média sem chuva', clima.mediaComChuva < clima.mediaSemChuva, true)
conferir('clima: dias de chuva contados', clima.diasChuva, clima.dias.filter((d) => d.clima === 'chuva').length)
conferir('clima: sem diário, null', climaEfetivo(vazia), null)
conferir('ritmo sem dados: tudo null', ritmo(vazia, HOJE), { ppc: null, pareto: null, clima: null })
conferir('ritmo da T405 não tem NaN', semNaN(ritmo(t405, HOJE)), true)
conferir('clima: filtro de período corta os dias', climaEfetivo(filtrar(cheia, { periodo: 'mes' })).dias.length, 3)

// Painel 3: financeiro
const fin = financeiro(v)
conferir('fluxo: quantidade por etapa', fin.fluxo.map((f) => f.qtd), [1, 1, 2, 1])
conferir('fluxo: valor do Ativo soma os dois contratos', fin.fluxo[2].valor, 60000)
conferir('matriz: % medido e saldo de cada empreiteiro', fin.matriz.map((m) => [m.empreiteiro, m.pct, m.saldo]),
  [['Gesso Forte Acabamentos', 40, 18000], ['Drywall Sul Divisórias', 59, 12400], ['Demol Rápido Serviços', 100, 0]])
conferir('saldo por contrato: só os ativos, do maior para o menor', fin.saldos.map((s) => s.saldo), [18000, 12400])
conferir('saldo total a medir', fin.saldoTotal, 30400)
conferir('financeiro sem contratos: null', financeiro(vazia), null)
conferir('financeiro filtrado por empresa: só ela', financeiro(gesso).matriz.map((m) => m.empreiteiro), ['Gesso Forte Acabamentos'])
conferir('financeiro: período não corta o saldo', financeiro(filtrar(cheia, { periodo: 'mes' })).saldoTotal, 30400)
conferir('financeiro sem NaN', semNaN(fin), true)

// Painel 4: materiais
const mat = materiais(v, HOJE, [{ id: 6, nome: 'Porcelanato 60x60' }, { id: 4, nome: 'Vergalhão CA-50 10 mm' }])
conferir('materiais: pedidos por etapa', mat.etapas.map((e) => e.qtd), [2, 2, 2, 2, 2])
conferir('materiais: 2 críticos entre os pedidos abertos', mat.etapas.reduce((s, e) => s + e.criticos, 0), 2)
conferir('materiais: 1 atrasado, com 3 dias', mat.atrasados.map((a) => [a.material, a.frente, a.dias]), [['Vergalhão CA-50 10 mm', 'Laje do mezanino', 3]])
conferir('materiais: lead time médio', mat.leadTime, { media: 8.8, qtd: 4 })
conferir('materiais: tendência das 4 semanas', mat.tendencia.map((t) => t.media), [null, 7, 10, 9])
conferir('materiais: variação do lead time', mat.variacao, 2)
conferir('materiais sem estoque: estoque null', mat.estoque, null)
conferir('materiais sem pedidos: null', materiais(vazia, HOJE), null)
const comEstoque = materiais({ ...v, insumos: [{ id: 1, nome: 'Cimento', saldo: 5, minimo: 10, unidade: 'sacos' }, { id: 2, nome: 'Areia', saldo: 30, minimo: 10 }],
  movimentos: [{ data: '2026-10-01', tipo: 'entrada', quantidade: 50 }, { data: '2026-10-02', tipo: 'saida', quantidade: 20 }] }, HOJE)
conferir('estoque opcional: alerta de saldo <= mínimo', comEstoque.estoque.alertas.map((a) => a.nome), ['Cimento'])
conferir('estoque opcional: entradas x saídas da semana', [comEstoque.estoque.semanas[3].entradas, comEstoque.estoque.semanas[3].saidas], [50, 20])
conferir('materiais T405: poucos pedidos, sem NaN', semNaN(materiais(t405, HOJE)), true)
conferir('materiais T405: nenhum atrasado', materiais(t405, HOJE).atrasados.length, 0)

// Painel 5: qualidade
const q = qualidade(v)
conferir('FVS: pior modelo primeiro (Impermeabilização 60%, Revestimento 67%)', q.conforme.modelos.map((m) => [m.nome, m.conforme, m.tom]),
  [['Impermeabilização — Áreas Molhadas', 60, 'bad'], ['Revestimento Cerâmico', 67, 'bad']])
conferir('FVS: NCs abertas', q.conforme.ncsAbertas, 3)
conferir('pendências por empresa: só as em aberto, da maior para a menor', q.pendencias.empresas, [{ nome: 'Metalúrgica Alfa', qtd: 2 }, { nome: 'Pinturas Beta', qtd: 2 }, { nome: 'Elétrica Gama', qtd: 1 }])
conferir('pendências: total aberto e resolvidas', [q.pendencias.total, q.pendencias.resolvidas], [5, 1])
conferir('mapa: um bloco por local, soma = total aberto', q.mapa.locais.reduce((s, l) => s + l.qtd, 0), q.pendencias.total)
conferir('desperdícios: Retrabalho lidera com 3', q.desperdicios.ranking[0], { nome: 'Retrabalho', qtd: 3 })
conferir('desperdícios: ordenado do maior para o menor', q.desperdicios.ranking.every((r, i) => i === 0 || r.qtd <= q.desperdicios.ranking[i - 1].qtd), true)
conferir('qualidade sem dados: tudo null', qualidade(vazia), { conforme: null, pendencias: null, mapa: null, desperdicios: null })
const alfa = qualidade(filtrar(cheia, { empresa: 'Metalúrgica Alfa' }))
conferir('qualidade filtrada pela Alfa: só pendências e Gemba dela', [alfa.pendencias.empresas.map((e) => e.nome), alfa.pendencias.total], [['Metalúrgica Alfa'], 2])
conferir('qualidade filtrada: NCs e Gemba dela', [alfa.desperdicios.observacoes, alfa.conforme], [2, null])
conferir('qualidade T405 sem NaN', semNaN(qualidade(t405)), true)
conferir('pendências todas resolvidas: mapa vazio mas existe', mapaDePendencias({ pendencias: [{ status: 'resolvido', local: 'X', empresa: 'Y' }] }), { locais: [], total: 0 })

// Modo impressão
conferir('cabeçalho: sem filtro', descricaoDosFiltros(), 'Empresa: todas · Período: Tudo')
conferir('cabeçalho: com filtros', descricaoDosFiltros({ empresa: 'Gesso Forte Acabamentos', periodo: '4semanas' }), 'Empresa: Gesso Forte Acabamentos · Período: Últimas 4 semanas')
conferir('rodapé em horário de Brasília', rodapeDeImpressao(new Date('2026-10-04T17:05:00Z')), 'Gerado automaticamente em 04/10/2026 às 14:05')

console.log(`biData: ${ok}/${tot} ok`)
process.exit(ok === tot ? 0 : 1)
