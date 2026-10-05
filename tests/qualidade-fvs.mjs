// Regras da FVS e das não conformidades (src/lib/qualidade.js). Node puro: `node tests/qualidade-fvs.mjs`.
import {
  acoesDaNc, aplicarAcaoNc, contarItensDoModelo, diasEmAberto, errosFinalizar, errosMarcacao, errosModelo, errosNc, errosNovaVistoria,
  finalizarVistoria, itensDaVistoria, kpisFvs, marcarItem, normalizarModelo, novaNc, novaVistoria, numerarGrupos, ordenarNcs,
  percentualConforme, proximoCodigoNc, progressoVistoria, tomConformidade,
} from '../src/lib/qualidade.js'
import { modelosFvs, ncsDeExemplo, vistoriasDeExemplo } from './fixtures/mockData.js'

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
const [impermeab, ceramico] = modelosFvs
const [vConcluida, vAndamento] = vistoriasDeExemplo
const ncsU12 = ncsDeExemplo.filter((n) => n.obraCodigo === 'U12')
const ncsT405 = ncsDeExemplo.filter((n) => n.obraCodigo === 'T405')

// Massa de exemplo
conferir('modelo 1: 3 grupos e 8 a 10 itens', [impermeab.grupos.length, contarItensDoModelo(impermeab) >= 8 && contarItensDoModelo(impermeab) <= 10], [3, true])
conferir('modelo 2: 2 grupos e 6 a 8 itens', [ceramico.grupos.length, contarItensDoModelo(ceramico) >= 6 && contarItensDoModelo(ceramico) <= 8], [2, true])
conferir('numeração dos itens por grupo', numerarGrupos(impermeab.grupos).flatMap((g) => g.itens.map((i) => i.numero)).slice(0, 5), ['1.1', '1.2', '1.3', '2.1', '2.2'])
conferir('obra 1: uma vistoria concluída e uma em andamento', vistoriasDeExemplo.filter((v) => v.obraCodigo === 'U12').map((v) => v.status).sort(), ['concluida', 'em_andamento'])
conferir('obra 1: 4 NCs em 4 status', [ncsU12.length, new Set(ncsU12.map((n) => n.status)).size], [4, 4])

// Progresso e conformidade
conferir('progresso da concluída', progressoVistoria(vConcluida), { total: 7, ok: 4, nc: 2, na: 1, pendentes: 0, verificados: 7, conformidade: 67 })
const p2 = progressoVistoria(vAndamento)
conferir('progresso da em andamento', [p2.ok, p2.nc, p2.pendentes, p2.verificados, p2.conformidade], [3, 2, 4, 5, 60])
conferir('conformidade = ok / (ok + nc), N.A. fora', percentualConforme(4, 2), 67)
conferir('sem OK nem NC a conformidade é nula', percentualConforme(0, 0), null)
conferir('cor da conformidade', [tomConformidade(null), tomConformidade(90), tomConformidade(70), tomConformidade(69)], ['neutro', 'ok', 'warn', 'bad'])
conferir('KPIs da obra 1', kpisFvs(vistoriasDeExemplo.slice(0, 2), ncsU12), { conformidade: 64, ncsAbertas: 3, concluidas: 1 })
conferir('KPIs da obra 2', kpisFvs(vistoriasDeExemplo.slice(2), ncsT405), { conformidade: 50, ncsAbertas: 1, concluidas: 0 })

// Vistoria nova: cópia dos grupos, nada marcado
const nova = novaVistoria(impermeab, ' Banheiro 2 ', { id: 'v9', obraCodigo: 'U12', hoje: HOJE, quem: 'Maria' })
conferir('nasce em andamento e sem respostas', [nova.status, nova.ambiente, nova.respostas, progressoVistoria(nova).pendentes], ['em_andamento', 'Banheiro 2', {}, 9])
const tituloOriginal = impermeab.grupos[0].itens[0].titulo
impermeab.grupos[0].itens[0].titulo = 'mudou depois'
conferir('mudar o modelo não mexe na vistoria já criada', nova.grupos[0].itens[0].titulo, tituloOriginal)
impermeab.grupos[0].itens[0].titulo = tituloOriginal
conferir('validação da nova vistoria', Object.keys(errosNovaVistoria({})).sort(), ['ambiente', 'modeloId'])

// Marcar itens
conferir('marcar OK é permitido', errosMarcacao(nova, 101, 'ok', []), null)
conferir('NC não marca direto', errosMarcacao(nova, 101, 'nc', []), 'Detalhe a não conformidade para marcar NC.')
conferir('item com NC não volta a OK', errosMarcacao(vAndamento, 103, 'ok', ncsDeExemplo), 'Este item tem uma não conformidade. Trate ela na lista de NCs.')
conferir('concluída é só leitura', errosMarcacao(vConcluida, 201, 'na', ncsDeExemplo), 'Vistoria concluída: só leitura.')
const marcada = marcarItem(nova, 101, 'ok')
conferir('marcar não altera o original', [marcada.respostas[101], nova.respostas[101]], ['ok', undefined])

// Finalizar só sem pendência
conferir('finalizar com pendência é recusado', errosFinalizar(nova), 'Faltam 9 itens para verificar.')
const quaseTudo = { ...nova, respostas: Object.fromEntries(itensDaVistoria(nova).slice(1).map((i) => [i.id, 'ok'])) }
conferir('uma pendência, no singular', errosFinalizar(quaseTudo), 'Faltam 1 item para verificar.')
const completa = { ...nova, respostas: Object.fromEntries(itensDaVistoria(nova).map((i) => [i.id, 'ok'])) }
conferir('tudo marcado pode finalizar', errosFinalizar(completa), null)
conferir('finalizada trava e grava a data', [finalizarVistoria(completa, HOJE).status, finalizarVistoria(completa, HOJE).concluidaEm], ['concluida', HOJE])
conferir('concluída não finaliza de novo', errosFinalizar(finalizarVistoria(completa, HOJE)), 'A vistoria já está concluída.')

// Modelos
const modeloOk = { codigo: 'fvs-03', nome: 'Pintura', categoria: 'Acabamento', grupos: [{ nome: 'Execução', itens: [{ id: 'a', titulo: 'Demão' }] }] }
conferir('modelo válido', errosModelo(modeloOk), {})
conferir('modelo vazio acusa tudo', Object.keys(errosModelo({})).sort(), ['categoria', 'codigo', 'grupos', 'nome'])
conferir('código repetido', errosModelo(modeloOk, ['FVS-03']).codigo, 'Já existe um modelo com esse código.')
conferir('grupo sem item', errosModelo({ ...modeloOk, grupos: [{ nome: 'X', itens: [] }] }).grupos, 'Todo grupo precisa de itens, e todo item de um título.')
conferir('grupo sem nome', errosModelo({ ...modeloOk, grupos: [{ nome: ' ', itens: [{ id: 'a', titulo: 'b' }] }] }).grupos, 'Dê um nome a todos os grupos.')
const norm = normalizarModelo({ ...modeloOk, nome: ' Pintura ' }, 7, 3)
conferir('normalizar: código em maiúsculas, sem espaços sobrando', [norm.codigo, norm.nome, norm.versao], ['FVS-03', 'Pintura', 3])

// Não conformidades
conferir('código seguinte é por obra', [proximoCodigoNc(ncsU12), proximoCodigoNc(ncsT405), proximoCodigoNc([])], ['NC-005', 'NC-002', 'NC-001'])
conferir('validação da NC', Object.keys(errosNc({})).sort(), ['descricao', 'responsavel', 'severidade', 'solucao'])
conferir('NC válida', errosNc({ descricao: 'a', solucao: 'b', responsavel: 'c', severidade: 'Alta' }), {})
const itemNc = itensDaVistoria(vAndamento)[2]
const nc = novaNc({ descricao: ' x ', solucao: 'y', responsavel: 'Ana', severidade: 'Alta', fotos: ['blob:1'] }, { id: 'n1', codigo: 'NC-005', vistoria: vAndamento, item: itemNc, hoje: HOJE, quem: 'Maria', agora: new Date('2026-10-04T17:18:00Z') })
conferir('NC nova: ligada ao item, aberta, timeline começa', [nc.itemNumero, nc.status, nc.descricao, nc.timeline], ['1.3', 'aberta', 'x', [{ em: '04/10/2026 14:18', texto: 'Aberta por Maria' }]])

// Fluxo e timeline
conferir('aberta só pode encaminhar', acoesDaNc(nc).map((a) => a.chave), ['encaminhar'])
const enc = aplicarAcaoNc(nc, 'encaminhar', 'Maria', new Date('2026-10-04T18:00:00Z'), HOJE)
conferir('encaminhada: timeline cresce', [enc.status, enc.timeline.length, enc.timeline[1].texto], ['encaminhada', 2, 'Encaminhada para Ana por Maria'])
const cor = aplicarAcaoNc(enc, 'corrigir', 'Ana', new Date('2026-10-05T12:00:00Z'), '2026-10-05')
conferir('corrigida pode aprovar ou reprovar', acoesDaNc(cor).map((a) => a.chave), ['aprovar', 'reprovar'])
const repro = aplicarAcaoNc(cor, 'reprovar', 'Maria', new Date('2026-10-06T12:00:00Z'), '2026-10-06')
conferir('reprovar volta para encaminhada', [repro.status, repro.fechadaEm], ['encaminhada', ''])
const fechada = aplicarAcaoNc(cor, 'aprovar', 'Maria', new Date('2026-10-06T12:00:00Z'), '2026-10-06')
conferir('aprovar fecha com a data e encerra o fluxo', [fechada.status, fechada.fechadaEm, acoesDaNc(fechada)], ['fechada', '2026-10-06', []])
conferir('passo fora de ordem é recusado', aplicarAcaoNc(nc, 'aprovar', 'Maria', new Date(), HOJE), null)
conferir('a NC original não muda', [nc.status, nc.timeline.length], ['aberta', 1])

// Dias em aberto e ordem da lista
conferir('dias em aberto', diasEmAberto(ncsDeExemplo[2], HOJE), 2)
conferir('fechada para de contar no dia do fechamento', diasEmAberto(ncsDeExemplo[0], HOJE), 2)
conferir('ordem: abertas por gravidade, fechada no fim', ordenarNcs(ncsU12, HOJE).map((n) => n.codigo), ['NC-002', 'NC-004', 'NC-003', 'NC-001'])

console.log(ok === tot ? `qualidade-fvs: ${ok}/${tot} ok` : `qualidade-fvs: ${ok}/${tot} ok — FALHOU`)
process.exit(ok === tot ? 0 : 1)
