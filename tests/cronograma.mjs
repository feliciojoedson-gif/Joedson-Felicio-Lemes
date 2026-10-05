// Longo prazo: previsto x real, linha do tempo e posição das barras (src/lib/planejamento.js). Node puro: `node tests/cronograma.mjs`.
import {
  calendarioPadrao, colunasDoCronograma, periodoDoCronograma, posicaoDoDia, posicaoNaLinha, previstoDaAtividade, previstoDaFolha,
  escalaPadrao, progressoDaAtividade, resumoDoCronograma, rotuloDoPrazo, segundaDaSemana, tomDoDesvio,
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

const cal = calendarioPadrao()
const U12 = planejamentoDeExemplo.U12.atividades
const H = '2026-10-04'
const semana = { inicio: '2026-10-05', fim: '2026-10-09' }

// Previsto de uma atividade: dias úteis completos até ontem sobre os dias úteis dela
conferir('antes do início: 0', previstoDaFolha(semana, '2026-10-05', cal), 0)
conferir('depois do fim: 100', previstoDaFolha(semana, '2026-10-10', cal), 100)
conferir('quarta-feira: 2 de 5 dias completos', previstoDaFolha(semana, '2026-10-07', cal), 40)
conferir('no último dia: 4 de 5', previstoDaFolha(semana, '2026-10-09', cal), 80)
conferir('fim de semana e feriado não contam: 5 de 9 dias úteis (12/10 é feriado)', Math.round(previstoDaFolha({ inicio: '2026-10-05', fim: '2026-10-16' }, '2026-10-11', cal)), 56)
conferir('atividade só em dia não útil não divide por zero', previstoDaFolha({ inicio: '2026-10-10', fim: '2026-10-11' }, '2026-10-10', cal), 0)

// Na massa de exemplo (hoje = 04/10/2026)
conferir('Tubulação de água fria (28/09 a 09/10): 5 de 10 dias', Math.round(previstoDaAtividade(U12, 6, H, cal)), 50)
conferir('Remoção de louças já venceu: 100', previstoDaAtividade(U12, 3, H, cal), 100)
conferir('Elétrica ainda não começou: 0', previstoDaAtividade(U12, 8, H, cal), 0)
conferir('real de folha e de grupo', [progressoDaAtividade(U12, 6, cal), Math.round(progressoDaAtividade(U12, 1, cal))], [60, 91])
const geral = resumoDoCronograma(U12, H, cal)
conferir('desvio = real - previsto', geral.desvio, geral.real - geral.previsto)
conferir('previsto e real da obra', [Math.round(geral.previsto), Math.round(geral.real)], [29, 33])
conferir('obra sem atividades', resumoDoCronograma([], H, cal), { real: 0, previsto: 0, desvio: 0 })

// Semáforo (mesmos limites das frentes: -5 e -10)
conferir('limites do semáforo', [tomDoDesvio(50, 50), tomDoDesvio(45, 50), tomDoDesvio(44, 50), tomDoDesvio(40, 50), tomDoDesvio(39, 50), tomDoDesvio(80, 50)], ['ok', 'ok', 'warn', 'warn', 'bad', 'ok'])
conferir('rótulos', [rotuloDoPrazo(100, 'bad'), rotuloDoPrazo(50, 'ok'), rotuloDoPrazo(50, 'warn'), rotuloDoPrazo(10, 'bad')], ['Concluída', 'No prazo', 'Atenção', 'Atrasada'])

// Linha do tempo
conferir('segunda-feira da semana', [segundaDaSemana('2026-10-04'), segundaDaSemana('2026-10-05'), segundaDaSemana('2026-10-10')], ['2026-09-28', '2026-10-05', '2026-10-05'])
const per = periodoDoCronograma(U12)
conferir('período da U12', per, { inicio: '2026-09-14', fim: '2026-12-11' })
conferir('sem atividades, sem período', periodoDoCronograma([]), null)
const sem = colunasDoCronograma(per.inicio, per.fim, 'semana')
conferir('semanas: 13 colunas', [sem.length, sem[0].rotulo, sem[0].inicio, sem.at(-1).fim], [13, '14/09', '2026-09-14', '2026-12-13'])
const mes = colunasDoCronograma(per.inicio, per.fim, 'mes')
conferir('meses: set a dez', mes.map((c) => c.rotulo), ['set/26', 'out/26', 'nov/26', 'dez/26'])
conferir('mês termina no último dia', [mes[0].fim, mes[1].fim, mes[3].fim], ['2026-09-30', '2026-10-31', '2026-12-31'])
conferir('virada de ano', colunasDoCronograma('2026-12-15', '2027-01-10', 'mes').map((c) => c.rotulo), ['dez/26', 'jan/27'])

// Posição das barras (% da largura)
const toda = posicaoNaLinha('2026-09-14', '2026-12-13', sem)
conferir('período inteiro: de 0 a 100%', [toda.esquerda, toda.largura], [0, 100])
const umaSemana = posicaoNaLinha('2026-09-21', '2026-09-27', sem)
conferir('uma semana de 13', [Math.round(umaSemana.esquerda * 100) / 100, Math.round(umaSemana.largura * 100) / 100], [7.69, 7.69])
conferir('hoje dentro e fora da linha', [Math.round(posicaoDoDia('2026-10-05', sem)), posicaoDoDia('2026-08-01', sem), posicaoDoDia('2027-01-01', sem)], [23, null, null])
conferir('barra de um dia não some', posicaoNaLinha('2026-09-14', '2026-09-14', colunasDoCronograma('2025-01-01', '2027-12-31', 'semana')).largura >= 0.6, true)

// Escala inicial: obra curta por semana, obra longa por mês, sem atividades por semana
conferir('escala padrão', [escalaPadrao(per), escalaPadrao({ inicio: '2025-06-03', fim: '2027-04-08' }), escalaPadrao(null)], ['semana', 'mes', 'semana'])

console.log(`cronograma: ${ok}/${tot}`)
process.exit(ok === tot ? 0 : 1)
