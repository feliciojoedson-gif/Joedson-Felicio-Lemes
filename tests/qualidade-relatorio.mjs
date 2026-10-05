// Dados do relatório de qualidade (src/lib/qualidade.js). Node puro: `node tests/qualidade-relatorio.mjs`.
import { descreverFiltros, montarRelatorio } from '../src/lib/qualidade.js'
import { gembaDeExemplo, ncsDeExemplo, pendenciasDeExemplo, vistoriasDeExemplo } from '../src/lib/mockData.js'

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
const daObra = (codigo) => ({
  pendencias: pendenciasDeExemplo.filter((x) => x.obraCodigo === codigo),
  vistorias: vistoriasDeExemplo.filter((x) => x.obraCodigo === codigo),
  ncs: ncsDeExemplo.filter((x) => x.obraCodigo === codigo),
  gemba: gembaDeExemplo.filter((x) => x.obraCodigo === codigo),
})
const SEM = { filtrosPend: {}, filtrosGemba: {}, filtroNc: '', hoje: HOJE }
const ids = (l) => l.map((x) => x.id)

// Texto dos filtros
conferir('sem filtro, lista vazia', descreverFiltros({ pend: {}, gemba: {}, nc: '' }), [])
conferir('filtros de pendências', descreverFiltros({ pend: { status: 'pendente', responsavel: 'Ana', prazo: 'atrasados', busca: ' solda ' } }),
  ['Pendências: status Pendente; responsável Ana; prazo Atrasados; busca “solda”'])
conferir('filtros de NC e Gemba', descreverFiltros({ nc: 'aberta', gemba: { tipo: 'Espera', prazo: 'sem_prazo' } }),
  ['NCs: status Aberta', 'Gemba Walk: desperdício Espera; prazo Sem prazo'])

// Sem filtros: a obra inteira
const u12 = montarRelatorio({ ...daObra('U12'), ...SEM })
conferir('KPIs e registros da obra 1', [u12.kpis, ids(u12.pendencias)], [{ total: 6, pendente: 3, em_andamento: 2, resolvido: 1 }, [1, 2, 3, 4, 6, 5]])
conferir('pendentes por responsável', u12.porResponsavel, [{ nome: 'Juliana Prado', qtd: 3 }, { nome: 'Carlos Menezes', qtd: 2 }])
conferir('FVS: 2 vistorias, 4 NCs, 1 concluída', [u12.vistorias.length, u12.ncs.length, u12.kpisFvs.concluidas], [2, 4, 1])
conferir('NCs com dias em aberto', u12.ncs.map((n) => [n.codigo, n.dias]), [['NC-002', 5], ['NC-004', 2], ['NC-003', 2], ['NC-001', 2]])
conferir('Gemba: só as em aberto', ids(u12.gembaAbertas), [1, 7, 2, 5, 3, 4])
conferir('Gemba: ranking completo', u12.ranking.length, 7)

// Com filtros: o relatório respeita o que está na tela
const filtrado = montarRelatorio({ ...daObra('U12'), hoje: HOJE, filtrosPend: { responsavel: 'Carlos Menezes' }, filtroNc: 'aberta', filtrosGemba: { tipo: 'Espera' } })
conferir('pendências filtradas', [ids(filtrado.pendencias), filtrado.kpis.total], [[1, 3], 2])
conferir('NCs filtradas por status', filtrado.ncs.map((n) => n.codigo), ['NC-003'])
conferir('Gemba filtrado: ranking e abertas', [filtrado.ranking, ids(filtrado.gembaAbertas)], [[{ nome: 'Espera', qtd: 2 }, { nome: 'Movimentação', qtd: 1 }], [7, 2]])
conferir('texto dos filtros aplicados', filtrado.filtros.length, 3)
conferir('FVS: as vistorias não têm filtro', filtrado.vistorias.length, 2)

// Outra obra: nada da primeira aparece
const t405 = montarRelatorio({ ...daObra('T405'), ...SEM })
conferir('obra 2 só tem os dados dela', [t405.kpis.total, t405.vistorias.length, t405.ncs.map((n) => n.codigo), t405.gembaAbertas.length], [2, 1, ['NC-001'], 2])

// Obra vazia
const vazia = montarRelatorio({ pendencias: [], vistorias: [], ncs: [], gemba: [], ...SEM })
conferir('obra sem registros gera relatório vazio sem quebrar', [vazia.kpis.total, vazia.kpisFvs.conformidade, vazia.ranking, vazia.ncs], [0, null, [], []])

console.log(ok === tot ? `qualidade-relatorio: ${ok}/${tot} ok` : `qualidade-relatorio: ${ok}/${tot} ok — FALHOU`)
process.exit(ok === tot ? 0 : 1)
