// Regras de src/lib/regras.js. Node puro: `node tests/regras.mjs`.
import {
  desvio, itensDaBarra, ordenarFrentes, planejadoHoje, pode, progressoDaObra, semaforo,
  semaforoDaObra, tiposDeRestricaoVisiveis, estaParadaHa3Dias, concluidaSemMedicao,
} from '../src/lib/regras.js'
import * as mock from '../src/lib/mock.js'

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

const H = mock.HOJE
const f = (id) => mock.frentes.find((x) => x.id === id)

// Planejado: reta entre início e fim
conferir('depois do fim é 100%', planejadoHoje(f(1), H), 100)
conferir('antes do início é 0%', planejadoHoje({ ...f(8), inicio_planejado: '2026-12-01', fim_planejado: '2026-12-31' }, H), 0)
conferir('frente 2 está em 81% do planejado', Math.round(planejadoHoje(f(2), H)), 81)
conferir('marco não tem planejado', planejadoHoje(f(9), H), null)
conferir('desvio da frente 3 é atraso (negativo)', desvio(f(3), H) < 0, true)

// Semáforo da frente: bate com a coluna "Saúde" dos dados de exemplo do PRD
const esperado = { 1: 'bad', 2: 'bad', 3: 'warn', 4: 'ok', 5: 'ok', 6: 'ok', 7: 'bad', 8: 'warn', 9: 'neutral', 10: 'ok' }
for (const [id, tom] of Object.entries(esperado)) conferir(`semáforo da frente ${id}`, semaforo(f(Number(id)), H), tom)

// Obra: média ponderada sem marcos
const u12 = progressoDaObra(mock.frentes.filter((x) => x.obra_id === 1), H)
const t405 = progressoDaObra(mock.frentes.filter((x) => x.obra_id === 2), H)
conferir('U12 real/plan', [Math.round(u12.real), Math.round(u12.plan)], [55, 61])
conferir('T405 real/plan (marco fora da conta)', [Math.round(t405.real), Math.round(t405.plan)], [53, 58])
conferir('limites do semáforo da obra', [semaforoDaObra(-3), semaforoDaObra(-6), semaforoDaObra(-12)], ['ok', 'warn', 'bad'])

// Ordem do Painel: frente 1 (5 dias), depois 7 (4), depois 2 (3)
const ordem = ordenarFrentes(mock.frentes, H).slice(0, 3).map((x) => x.id)
conferir('ordenação por dias sem avanço', ordem, [1, 7, 2])
conferir('paradas há 3 dias ou mais são 1, 2 e 7', mock.frentes.filter(estaParadaHa3Dias).map((x) => x.id), [1, 2, 7])
conferir('frente 6 concluída sem medição enviada entra em "A medir"', concluidaSemMedicao(f(6), mock.medicoes), true)

// Multi-obra: toda tabela de lançamento carrega obra_id
for (const tabela of ['frentes', 'apontamentos', 'fotos', 'medicoes', 'restricoes']) {
  conferir(`${tabela}: todo registro tem obra_id`, mock[tabela].every((r) => Number.isInteger(r.obra_id)), true)
}
conferir('duas obras de exemplo', mock.obras.map((o) => o.codigo), ['U12', 'T405'])

// Permissões
conferir('produção não vê medição', pode('Produção', 'verMedicao'), false)
conferir('diretoria vê medição e não cria', [pode('Diretoria', 'verMedicao'), pode('Diretoria', 'criarMedicao')], [true, false])
conferir('só coordenador apaga', ['Coordenador', 'Planejamento', 'Diretoria'].map((r) => pode(r, 'apagar')), [true, false, false])
conferir('cliente não vê restrição', tiposDeRestricaoVisiveis('Cliente'), [])
conferir('engenharia só vê Restrição e RFI', tiposDeRestricaoVisiveis('Engenharia'), ['Restrição', 'RFI'])

// Menu do celular: no máximo 5 itens
conferir('coordenador: 4 + Mais', itensDaBarra('Coordenador'), { barra: ['painel', 'frentes', 'diario', 'medicoes', 'mais'], mais: ['restricoes', 'admin', 'perfil'] })
conferir('cliente: 3 itens, sem Mais', itensDaBarra('Cliente').mais, [])

console.log(`${ok}/${tot} — regras`)
process.exit(ok === tot ? 0 : 1)
