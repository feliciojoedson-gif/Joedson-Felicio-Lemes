// Regras do módulo Planejamento (src/lib/planejamento.js): EAP, códigos, dias úteis, progresso. Node puro: `node tests/planejamento.mjs`.
import {
  aplicarAtividade, arquivarAtividade, arvore, atividadesAtivas, calendarioPadrao, dataValida, descendentes, diasUteis,
  ehDiaUtil, errosAtividade, errosCalendario, errosFeriado, opcoesDePai, opcoesDePosicao, progressoDaAtividade, somarDias,
  statusDaAtividade,
} from '../src/lib/planejamento.js'
import { planejamentoDeExemplo } from '../src/lib/mockData.js'

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
const T405 = planejamentoDeExemplo.T405.atividades

// Massa de exemplo
conferir('U12 tem de 8 a 12 atividades', U12.length >= 8 && U12.length <= 12, true)
conferir('T405 tem poucos registros', T405.length, 3)
conferir('códigos da U12', arvore(U12).map((a) => a.codigo), ['1', '1.1', '1.2', '1.3', '2', '2.1', '2.2', '3', '4', '5', '5.1', '5.2'])
conferir('códigos da T405', arvore(T405).map((a) => a.codigo), ['1', '1.1', '2'])

// Datas e dias úteis
conferir('somarDias atravessa o mês', somarDias('2026-10-30', 3), '2026-11-02')
conferir('data inválida', [dataValida('2026-02-30'), dataValida(''), dataValida('2026-10-04')], [false, false, true])
conferir('sábado e domingo não são úteis', [ehDiaUtil('2026-10-03', cal), ehDiaUtil('2026-10-04', cal), ehDiaUtil('2026-10-05', cal)], [false, false, true])
conferir('feriado não é útil', ehDiaUtil('2026-10-12', cal), false)
conferir('semana cheia = 5 dias úteis', diasUteis('2026-10-05', '2026-10-11', cal), 5)
conferir('semana com feriado = 4', diasUteis('2026-10-12', '2026-10-18', cal), 4)
conferir('um dia só', diasUteis('2026-10-05', '2026-10-05', cal), 1)
conferir('fim antes do início = 0', diasUteis('2026-10-09', '2026-10-05', cal), 0)
conferir('trabalhando sábado', diasUteis('2026-10-05', '2026-10-11', { ...cal, diasTrabalho: [1, 2, 3, 4, 5, 6] }), 6)

// Validação
conferir('tudo vazio avisa', Object.keys(errosAtividade({ titulo: ' ', inicio: '', fim: '' })), ['titulo', 'inicio', 'fim'])
conferir('fim antes do início', errosAtividade({ titulo: 'A', inicio: '2026-10-10', fim: '2026-10-09' }).fim, 'O fim não pode ser antes do início.')
conferir('atividade válida', errosAtividade({ titulo: 'A', inicio: '2026-10-04', fim: '2026-10-04' }), {})
conferir('calendário sem dia', Object.keys(errosCalendario({ diasTrabalho: [] })), ['diasTrabalho'])
conferir('feriado repetido', errosFeriado('2026-10-12', cal.feriados), 'Este feriado já está na lista.')
conferir('feriado novo', errosFeriado('2026-10-13', cal.feriados), null)

// Criar: no final, como filha, antes de outra
const campos = (titulo, extra = {}) => ({ titulo, inicio: '2026-10-05', fim: '2026-10-09', parentId: null, antesDeId: null, ...extra })
let lista = aplicarAtividade(T405, campos('  Nova  '), undefined, 4)
conferir('cria no final, título aparado', arvore(lista).map((a) => `${a.codigo} ${a.titulo}`), ['1 Preparação da área', '1.1 Isolamento e sinalização', '2 Remoção de revestimento', '3 Nova'])
conferir('nasce a fazer, 0%, sem subtarefas', [lista.at(-1).status, lista.at(-1).progresso, lista.at(-1).subtarefas], ['a_fazer', 0, []])
lista = aplicarAtividade(T405, campos('Sub nova', { parentId: 1 }), undefined, 4)
conferir('cria como subatividade', arvore(lista).map((a) => a.codigo), ['1', '1.1', '1.2', '2'])
lista = aplicarAtividade(T405, campos('Primeira', { antesDeId: 1 }), undefined, 4)
conferir('cria antes de outra e renumera', arvore(lista).map((a) => `${a.codigo} ${a.titulo}`).filter((t) => !t.includes('Isolamento')), ['1 Primeira', '2 Preparação da área', '3 Remoção de revestimento'])
conferir('a lista original não muda', T405.length, 3)

// Editar: mantém lugar, muda de grupo, muda de posição
lista = aplicarAtividade(T405, campos('Remoção (editada)'), 3, undefined)
conferir('editar mantém o lugar', arvore(lista).map((a) => a.codigo), ['1', '1.1', '2'])
conferir('editar troca o título', lista.find((a) => a.id === 3).titulo, 'Remoção (editada)')
lista = aplicarAtividade(T405, campos('Remoção de revestimento', { parentId: 1 }), 3, undefined)
conferir('mover para dentro de outro grupo vai pro final dele', arvore(lista).map((a) => `${a.codigo} ${a.titulo}`), ['1 Preparação da área', '1.1 Isolamento e sinalização', '1.2 Remoção de revestimento'])
lista = aplicarAtividade(T405, campos('Remoção de revestimento', { antesDeId: 1 }), 3, undefined)
conferir('mover para antes de outra', arvore(lista).map((a) => a.titulo), ['Remoção de revestimento', 'Preparação da área', 'Isolamento e sinalização'])
conferir('editar preserva status e progresso', aplicarAtividade(T405, campos('X'), 2, undefined).find((a) => a.id === 2).progresso, 100)

// Opções do formulário: sem laço
conferir('pai não oferece ela mesma nem os filhos', opcoesDePai(U12, 5).map((o) => o.rotulo), ['1 Demolição', '1.1 Retirada de revestimentos', '1.2 Remoção de louças e esquadrias', '1.3 Remoção de entulho', '3 Elétrica', '4 Reboco', '5 Acabamento', '5.1 Assentamento de pisos', '5.2 Pintura geral'])
conferir('descendentes de Acabamento', [...descendentes(U12, 10)].sort((a, b) => a - b), [11, 12])
conferir('posições entre irmãos', opcoesDePosicao(U12, 5, 7).map((o) => o.rotulo), ['2.1 Tubulação de água fria'])
conferir('posições no nível principal', opcoesDePosicao(U12, null).length, 5)

// Arquivar: some das outras abas, não renumera, desarquivar volta
lista = arquivarAtividade(U12, 5, true)
conferir('arquivar grupo esconde os filhos', atividadesAtivas(lista).map((a) => a.id).includes(6), false)
conferir('arquivar não renumera quem vem depois', arvore(lista).find((a) => a.id === 8).codigo, '3')
conferir('desarquivar traz tudo de volta', atividadesAtivas(arquivarAtividade(lista, 5, false)).length, 12)
conferir('arquivar um filho só esconde ele', atividadesAtivas(arquivarAtividade(U12, 6, true)).length, 11)

// Progresso e situação dos grupos
conferir('folha: o próprio %', progressoDaAtividade(U12, 6, cal), 60)
conferir('Demolição: média ponderada pelos dias úteis', Math.round(progressoDaAtividade(U12, 1, cal)), 91)
conferir('grupo sem avanço = 0', progressoDaAtividade(U12, 10, cal), 0)
conferir('grupo em andamento', statusDaAtividade(U12, 1), 'andamento')
conferir('grupo a fazer', statusDaAtividade(U12, 10), 'a_fazer')
conferir('grupo concluído quando todas as folhas concluem', statusDaAtividade(T405, 1), 'concluida')

// Massa de exemplo: restrições e semana atual (05 a 09/10) para o PPC já aparecer
const TIPOS = ['Material', 'Mão de Obra', 'Método', 'Equipamento', 'Projeto', 'Segurança', 'Logística']
for (const [obra, dados] of Object.entries(planejamentoDeExemplo)) {
  conferir(`${obra}: restrição aponta para atividade existente e tipo válido`, dados.restricoes.every((r) => dados.atividades.some((a) => a.id === r.atividadeId) && TIPOS.includes(r.tipo)), true)
}
const abertas = planejamentoDeExemplo.U12.restricoes.filter((r) => !r.resolvida)
conferir('U12 tem restrições abertas e uma resolvida', [abertas.length, planejamentoDeExemplo.U12.restricoes.length - abertas.length], [6, 1])
const daSemana = arvore(U12).filter((a) => a.filhos === 0 && ((a.inicio <= '2026-10-09' && a.fim >= '2026-10-05') || (a.fim < '2026-10-05' && a.status !== 'concluida')))
conferir('U12: 5 atividades na semana, 2 concluídas (PPC 40%)', [daSemana.length, daSemana.filter((a) => a.status === 'concluida').length], [5, 2])
conferir('U12: 3 atividades concluídas no total', U12.filter((a) => a.status === 'concluida').length, 3)

console.log(`planejamento: ${ok}/${tot}`)
process.exit(ok === tot ? 0 : 1)
