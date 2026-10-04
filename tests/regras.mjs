// Regras de src/lib/regras.js. Node puro: `node tests/regras.mjs`.
import {
  desvio, itensDaBarra, ordenarFrentes, planejadoHoje, pode, progressoDaObra, semaforo,
  semaforoDaObra, tiposDeRestricaoVisiveis, estaParadaHa3Dias, concluidaSemMedicao,
  acumuladoAnterior, efetivoSugerido, lancamentoDoDia, validarLancamento,
  tamanhoComprimido, caminhoDaFoto, legendaDaFoto,
  CLIMAS, errosRdo, ordenarRdo, dataExtensa,
  PERFIS, MENUS, STATUS_OBRA, STATUS_MEDICAO, veTodasAsObras, veTodoODiario, hojeEmBrasilia, viradaAtrasada,
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

// 10 perfis: todo perfil tem menu, e só o Coordenador apaga
conferir('são 10 perfis', PERFIS.length, 10)
conferir('todo perfil tem menu', PERFIS.every((r) => MENUS[r]?.length > 0), true)
conferir('só o Coordenador apaga', PERFIS.filter((r) => pode(r, 'apagar')), ['Coordenador'])
conferir('status de obra', STATUS_OBRA, ['Planejamento', 'Ativa', 'Suspensa', 'Encerrada', 'Arquivada'])
conferir('status de medição', STATUS_MEDICAO, ['Rascunho', 'Enviada', 'Aprovada pela Gestão', 'Aprovada'])
conferir('mock usa só status de obra válidos', mock.obras.every((o) => STATUS_OBRA.includes(o.status)), true)
conferir('quem vê todas as obras', PERFIS.filter(veTodasAsObras), ['Coordenador', 'Diretoria', 'Administrador'])
conferir('Cliente, Produção e Engenharia não veem medição', ['Cliente', 'Produção', 'Engenharia'].map((r) => pode(r, 'verMedicao')), [false, false, false])
conferir('Planejamento vê medição e não cria', [pode('Planejamento', 'verMedicao'), pode('Planejamento', 'criarMedicao')], [true, false])
conferir('Medição cria e não aprova', [pode('Medição', 'criarMedicao'), pode('Medição', 'aprovarMedicaoPelaGestao'), pode('Medição', 'aprovarMedicaoFinal')], [true, false, false])
conferir('1ª aprovação: só a Gestão Contratual', PERFIS.filter((r) => pode(r, 'aprovarMedicaoPelaGestao')), ['Gestão Contratual'])
conferir('aprovação final: só o Coordenador', PERFIS.filter((r) => pode(r, 'aprovarMedicaoFinal')), ['Coordenador'])
conferir('medição aprovada só pela Gestão já conta como medida', concluidaSemMedicao(f(6), [{ frente_id: 6, status: 'Aprovada pela Gestão' }]), false)
conferir('Administrador lê e não grava', ['criarFrente', 'lancarDiario', 'criarMedicao', 'criarRestricao', 'apagar'].map((a) => pode('Administrador', a)), [false, false, false, false, false])
conferir('Gestão Contratual vê todos os tipos de restrição', tiposDeRestricaoVisiveis('Gestão Contratual').length, 4)
conferir('Medição e Custos não veem restrição', [tiposDeRestricaoVisiveis('Medição'), tiposDeRestricaoVisiveis('Custos e Controle')], [[], []])
conferir('diário completo: quem lê', PERFIS.filter(veTodoODiario), ['Coordenador', 'Planejamento', 'Medição', 'Custos e Controle', 'Diretoria', 'Administrador'])

// Fuso de Brasília: 23h30 de 04/10 em Brasília já é 05/10 em UTC
conferir('hoje em Brasília (02h UTC ainda é o dia anterior)', hojeEmBrasilia(new Date('2026-10-05T02:00:00Z')), '2026-10-04')
conferir('hoje em Brasília (12h UTC)', hojeEmBrasilia(new Date('2026-10-05T12:00:00Z')), '2026-10-05')

// Aviso da atualização diária: só vale depois das 7h de Brasília (10h UTC)
const naoRodou = { rodou_hoje: false }
conferir('antes das 7h não é atraso', viradaAtrasada(naoRodou, new Date('2026-10-05T09:30:00Z')), false)
conferir('depois das 7h sem rodar é atraso', viradaAtrasada(naoRodou, new Date('2026-10-05T10:30:00Z')), true)
conferir('rodou hoje: sem aviso', viradaAtrasada({ rodou_hoje: true }, new Date('2026-10-05T15:00:00Z')), false)
conferir('perfil sem acesso (null): sem aviso', viradaAtrasada(null, new Date('2026-10-05T15:00:00Z')), false)
conferir('só o Coordenador roda a atualização', PERFIS.filter((r) => pode(r, 'rodarAtualizacao')), ['Coordenador'])

// Diário: piso do acumulado, efetivo sugerido e validação do lançamento
const ap = (frente_id, data, acum, efetivo) => ({ frente_id, data, percentual_acumulado: acum, efetivo_qtd: efetivo })
const fr = { id: 1, percentual_realizado: 60 }
const hist = [ap(1, '2026-10-02', 50, 7), ap(1, '2026-10-03', 60, 9)]
conferir('sem lançamento hoje: piso é o avanço da frente', acumuladoAnterior(fr, hist, '2026-10-04'), 60)
conferir('com lançamento hoje: piso é o do dia anterior', acumuladoAnterior(fr, [...hist, ap(1, '2026-10-04', 65, 8)], '2026-10-04'), 60)
conferir('lançamento hoje sem dia anterior visível: piso 0 (o banco confere)', acumuladoAnterior(fr, [ap(1, '2026-10-04', 5, 8)], '2026-10-04'), 0)
conferir('lançamento de outra frente não conta', lancamentoDoDia(2, hist, '2026-10-03'), null)
conferir('efetivo sugerido é o do último lançamento', efetivoSugerido(1, hist), 9)
conferir('frente sem histórico sugere 0', efetivoSugerido(2, hist), 0)
conferir('avanço com efetivo: ok', validarLancamento({ anterior: 60, acumulado: 70, efetivo: 8, motivo: null }), null)
conferir('sem avanço exige motivo', validarLancamento({ anterior: 60, acumulado: 60, efetivo: 8, motivo: null }), 'Informe o motivo de não haver avanço.')
conferir('sem avanço com motivo: ok', validarLancamento({ anterior: 60, acumulado: 60, efetivo: 0, motivo: 'Chuva' }), null)
conferir('acumulado menor que o anterior é recusado', typeof validarLancamento({ anterior: 60, acumulado: 55, efetivo: 8, motivo: 'Chuva' }), 'string')
conferir('acumulado acima de 100 é recusado', typeof validarLancamento({ anterior: 60, acumulado: 101, efetivo: 8, motivo: null }), 'string')
conferir('efetivo negativo é recusado', typeof validarLancamento({ anterior: 60, acumulado: 70, efetivo: -1, motivo: null }), 'string')

// Fotos do diário
conferir('foto grande é reduzida mantendo a proporção', tamanhoComprimido(4000, 3000), { largura: 1600, altura: 1200 })
conferir('foto em pé é reduzida pelo lado maior', tamanhoComprimido(3000, 4000), { largura: 1200, altura: 1600 })
conferir('foto pequena não é ampliada', tamanhoComprimido(800, 600), { largura: 800, altura: 600 })
conferir('caminho começa pela obra (a política do banco lê a primeira pasta)', caminhoDaFoto(2, 7, 'a.jpg'), '2/7/a.jpg')
conferir('legenda traz frente e data', legendaDaFoto({ nome: 'Montagem do fundo' }, '2026-10-04'), 'Montagem do fundo · 04/10/2026')

// Menu do celular: no máximo 5 itens
conferir('coordenador: 4 + Mais', itensDaBarra('Coordenador'), { barra: ['painel', 'frentes', 'diario', 'medicoes', 'mais'], mais: ['restricoes', 'rdo', 'admin', 'perfil'] })
conferir('cliente: 3 itens, sem Mais', itensDaBarra('Cliente').mais, [])

// Diário de Obra (RDO)
const rdoOk = { data: '2026-10-04', clima: 'sol', efetivo: '8', atividades: 'Solda do spool 14' }
conferir('rdo completo é válido', errosRdo(rdoOk), {})
conferir('rdo sem clima avisa', Object.keys(errosRdo({ ...rdoOk, clima: null })), ['clima'])
conferir('rdo: efetivo só aceita número', Object.keys(errosRdo({ ...rdoOk, efetivo: '8a' })), ['efetivo'])
conferir('rdo: efetivo zero é válido', errosRdo({ ...rdoOk, efetivo: '0' }), {})
conferir('rdo: atividades só com espaços avisa', Object.keys(errosRdo({ ...rdoOk, atividades: '   ' })), ['atividades'])
conferir('rdo: tem 3 climas', CLIMAS.map((c) => c.id), ['sol', 'nublado', 'chuva'])
conferir('rdo: mais recente primeiro', ordenarRdo([{ id: 1, data: '2026-10-01' }, { id: 2, data: '2026-10-03' }, { id: 3, data: '2026-10-03' }]).map((r) => r.id), [3, 2, 1])
conferir('rdo: data não pula dia (sem UTC)', dataExtensa('2026-10-03').includes('03/10/2026'), true)
conferir('rdo: virada de mês não pula dia', dataExtensa('2026-10-01').includes('01/10/2026'), true)

console.log(`${ok}/${tot} — regras`)
process.exit(ok === tot ? 0 : 1)
