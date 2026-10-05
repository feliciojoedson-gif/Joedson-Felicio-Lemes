// Regras do módulo Empreiteiros (src/lib/empreiteiros.js). Node puro: `node tests/empreiteiros.mjs`.
import {
  acumuladoDoItem, aplicarMovimentoContrato, boletimDasEntradas, colunaContratoAntes, colunaContratoDepois, errosBoletim, errosContrato, errosValor,
  estaTotalmenteMedido, itensDoCadastro, medidoDoContrato, novaLinha, novaMedicao, novoContrato, percentualMedido, proximoNumero,
  quantidadeDaEntrada, recebeMedicao, saldoDoContrato, saldoDoItem, valorDaEntradaGlobal, valorDaQuantidade, valorDoCadastro,
  pedeCadastroDoValor, mostraMedido, percentualAMedir, acumuladoDepois, verificarMovimento,
} from '../src/lib/empreiteiros.js'
import { contratos, itensContrato, medicoes } from '../src/lib/mockData.js'

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

const valorDoItem = (item) => Math.round(item.quantidade * item.precoUnitario * 100 + 1e-9) / 100
const totalDosItens = (itens) => itens.reduce((soma, i) => soma + Math.round(valorDoItem(i) * 100), 0) / 100
const contrato = (id) => contratos.find((c) => c.id === id)
const GESSO = contrato(3)
const DRYWALL = contrato(4)
const DEMOLICAO = contrato(5)

// Massa de exemplo
conferir('duas obras no exemplo', [...new Set(contratos.map((c) => c.obraCodigo))].sort(), ['T405', 'U12'])
conferir('a maioria está na obra 1', contratos.filter((c) => c.obraCodigo === 'U12').length > contratos.filter((c) => c.obraCodigo === 'T405').length, true)
conferir('as quatro colunas têm contrato na obra 1', [...new Set(contratos.filter((c) => c.obraCodigo === 'U12').map((c) => c.status))].sort(), ['ativo', 'concluido', 'elaboracao', 'enviado'])
conferir('Drywall: 3 itens somam o valor do contrato', totalDosItens(itensContrato.filter((i) => i.contratoId === 4)), DRYWALL.valorTotal)
conferir('Drywall: placas 200 x 80', valorDoItem(itensContrato[0]), 16000)
conferir('Gesso é global e ativo', [GESSO.modo, GESSO.status, GESSO.valorTotal], ['global', 'ativo', 30000])

// Medido e percentual
conferir('Gesso: medido', medidoDoContrato(GESSO, medicoes), 12000)
conferir('Gesso: 40%', percentualMedido(GESSO, medicoes), 40)
conferir('Gesso: saldo', saldoDoContrato(GESSO, medicoes), 18000)
conferir('Drywall: medido', medidoDoContrato(DRYWALL, medicoes), 17600)
conferir('boletim do Drywall = soma das quantidades x preço',
  medicoes.filter((m) => m.contratoId === 4).map((m) => m.linhas.reduce((s, l) => s + valorDoItem({ ...itensContrato.find((i) => i.id === l.itemId), quantidade: l.quantidade }), 0)),
  [8000, 9600])
conferir('contrato sem valor tem 0%', percentualMedido(contrato(1), medicoes), 0)
conferir('Demolição está 100% medida', estaTotalmenteMedido(DEMOLICAO, medicoes), true)
conferir('Gesso não está 100%', estaTotalmenteMedido(GESSO, medicoes), false)
conferir('centavos não acumulam erro', totalDosItens([{ quantidade: 0.1, precoUnitario: 3 }, { quantidade: 0.2, precoUnitario: 3 }]), 0.9)

// Colunas
conferir('depois de elaboração vem enviado', colunaContratoDepois('elaboracao').id, 'enviado')
conferir('concluído não tem próxima', colunaContratoDepois('concluido'), null)
conferir('elaboração não tem anterior', colunaContratoAntes('elaboracao'), null)
conferir('só ativo recebe medição', [1, 2, 3, 4, 5].map((id) => recebeMedicao(contrato(id))), [false, false, true, true, false])

// Regras de movimento
conferir('concluir com 40% é barrado', verificarMovimento(GESSO, 'concluido', medicoes)?.startsWith('Só dá para concluir com 100% medido'), true)
conferir('o aviso diz quanto falta', verificarMovimento(GESSO, 'concluido', medicoes).includes('40%'), true)
conferir('concluir com 100% passa', verificarMovimento({ ...DEMOLICAO, status: 'ativo' }, 'concluido', medicoes), null)
conferir('pular coluna é barrado', typeof verificarMovimento(contrato(1), 'ativo', medicoes), 'string')
conferir('ativo com medição não volta', typeof verificarMovimento(GESSO, 'enviado', medicoes), 'string')
conferir('ativo sem medição volta', verificarMovimento({ ...GESSO, id: 99 }, 'enviado', medicoes), null)
conferir('avançar para ativo é permitido', verificarMovimento(contrato(2), 'ativo', medicoes), null)
const ativado = aplicarMovimentoContrato(contrato(2), 'ativo', { modo: 'global', valorTotal: 8000 })
conferir('ativar grava modo e valor', [ativado.status, ativado.modo, ativado.valorTotal], ['ativo', 'global', 8000])
conferir('mover sem cadastro preserva o valor', aplicarMovimentoContrato(GESSO, 'concluido').valorTotal, 30000)

// Contrato novo
conferir('nasce em elaboração, sem valor', (({ status, modo, valorTotal, criadoEm }) => ({ status, modo, valorTotal, criadoEm }))(novoContrato({ id: 8, obraId: 1, empreiteiro: ' Ana ', descricao: ' Pintura ' }, '2026-10-04')), { status: 'elaboracao', modo: null, valorTotal: null, criadoEm: '2026-10-04' })
conferir('nome é aparado', novoContrato({ id: 8, obraId: 1, empreiteiro: ' Ana ', descricao: ' Pintura ' }, '2026-10-04').empreiteiro, 'Ana')
conferir('campos obrigatórios', Object.keys(errosContrato({ empreiteiro: ' ', descricao: '' })), ['empreiteiro', 'descricao'])
conferir('contrato válido', errosContrato({ empreiteiro: 'Ana', descricao: 'Pintura' }), {})

// Cadastro do valor
conferir('sem modo escolhido', Object.keys(errosValor({ modo: '', valorGlobal: '', itens: [] })), ['modo'])
conferir('global sem valor', Object.keys(errosValor({ modo: 'global', valorGlobal: '', itens: [] })), ['valorGlobal'])
conferir('global com valor zero', Object.keys(errosValor({ modo: 'global', valorGlobal: '0', itens: [] })), ['valorGlobal'])
conferir('global válido', errosValor({ modo: 'global', valorGlobal: '30000,50', itens: [] }), {})
conferir('global: valor com vírgula', valorDoCadastro({ modo: 'global', valorGlobal: '30000,50', itens: [] }), 30000.5)
conferir('escopo sem itens', Object.keys(errosValor({ modo: 'escopo', valorGlobal: '', itens: [] })), ['itens'])
conferir('escopo com linha vazia', Object.keys(errosValor({ modo: 'escopo', valorGlobal: '', itens: [novaLinha('a')] })), ['0.descricao', '0.quantidade', '0.precoUnitario'])
const linhas = [
  { chave: 'a', descricao: 'Placas', unidade: 'm2', quantidade: '200', precoUnitario: '80' },
  { chave: 'b', descricao: 'Tabica', unidade: 'm', quantidade: '50,5', precoUnitario: '120' },
]
conferir('escopo válido', errosValor({ modo: 'escopo', valorGlobal: '', itens: linhas }), {})
conferir('escopo: o app soma sozinho', valorDoCadastro({ modo: 'escopo', valorGlobal: '', itens: linhas }), 22060)
conferir('itens do cadastro viram números', itensDoCadastro(linhas)[1], { descricao: 'Tabica', unidade: 'm', quantidade: 50.5, precoUnitario: 120 })

// Ficha de medição
const HOJE = '2026-10-04'
const itensDrywall = itensContrato.filter((i) => i.contratoId === 4)
const [placas, , tabica] = itensDrywall
conferir('próximo boletim do Drywall é o nº 3', proximoNumero(4, medicoes), 3)
conferir('contrato sem boletim começa no nº 1', proximoNumero(1, medicoes), 1)
conferir('acumulado das placas = 140 m2', acumuladoDoItem(1, medicoes), 140)
conferir('saldo das placas = 60 m2', saldoDoItem(placas, medicoes), 60)
conferir('saldo da tabica = 30 m', saldoDoItem(tabica, medicoes), 30)

// três jeitos de digitar chegam na mesma quantidade
conferir('digitou quantidade', quantidadeDaEntrada({ campo: 'quantidade', texto: '50' }, placas), 50)
conferir('digitou % (25% de 200 m2)', quantidadeDaEntrada({ campo: 'pct', texto: '25' }, placas), 50)
conferir('digitou R$ (4.000 / 80)', quantidadeDaEntrada({ campo: 'valor', texto: '4000' }, placas), 50)
conferir('campo vazio = 0', quantidadeDaEntrada({ campo: 'pct', texto: '' }, placas), 0)
conferir('R$ digitado volta ao mesmo R$ (sem erro de arredondamento)', boletimDasEntradas(DRYWALL, itensDrywall, { 3: { campo: 'valor', texto: '100' } }, HOJE, medicoes).valor, 100)
conferir('R$ que não divide certo continua exato', boletimDasEntradas(DRYWALL, itensDrywall, { 3: { campo: 'valor', texto: '100' } }, HOJE, medicoes).linhas[0].quantidade, 0.833333)

// boletim do escopo
const entradas = { 1: { campo: 'quantidade', texto: '30' }, 3: { campo: 'pct', texto: '20' } }
const boletim = boletimDasEntradas(DRYWALL, itensDrywall, entradas, HOJE, medicoes)
conferir('só entram itens com execução', boletim.linhas, [{ itemId: 1, quantidade: 30 }, { itemId: 3, quantidade: 10 }])
conferir('valor = soma de quantidade x preço', boletim.valor, 3600)
conferir('boletim válido não tem erro', errosBoletim({ contrato: DRYWALL, itens: itensDrywall, medicoes, entradas, data: HOJE }, HOJE), {})
conferir('saldo exato (60 m2) passa', errosBoletim({ contrato: DRYWALL, itens: itensDrywall, medicoes, entradas: { 1: { campo: 'quantidade', texto: '60' } }, data: HOJE }, HOJE), {})
conferir('passar de 100% no item é barrado', Object.keys(errosBoletim({ contrato: DRYWALL, itens: itensDrywall, medicoes, entradas: { 1: { campo: 'quantidade', texto: '60,01' } }, data: HOJE }, HOJE)), ['i1'])
conferir('o aviso diz o saldo', errosBoletim({ contrato: DRYWALL, itens: itensDrywall, medicoes, entradas: { 1: { campo: 'pct', texto: '40' } }, data: HOJE }, HOJE).i1, 'Passa de 100%: o saldo deste item é 60 m2.')
conferir('boletim vazio é barrado', Object.keys(errosBoletim({ contrato: DRYWALL, itens: itensDrywall, medicoes, entradas: {}, data: HOJE }, HOJE)), ['itens'])
conferir('data futura é barrada', Object.keys(errosBoletim({ contrato: DRYWALL, itens: itensDrywall, medicoes, entradas, data: '2026-10-05' }, HOJE)), ['data'])
conferir('sem data é barrado', Object.keys(errosBoletim({ contrato: DRYWALL, itens: itensDrywall, medicoes, entradas, data: '' }, HOJE)), ['data'])
conferir('numera o boletim novo', novaMedicao(DRYWALL, medicoes, 99, boletim).numero, 3)

// boletim do contrato global (Gesso: R$ 30.000, medido R$ 12.000)
conferir('global: 10% = R$ 3.000', valorDaEntradaGlobal({ campo: 'pct', texto: '10' }, GESSO), 3000)
conferir('global: R$ digitado vale', valorDaEntradaGlobal({ campo: 'valor', texto: '4500,50' }, GESSO), 4500.5)
const globalOk = { contrato: GESSO, itens: [], medicoes, entradas: { global: { campo: 'pct', texto: '60' } }, data: HOJE }
conferir('global: 60% = o saldo exato passa', errosBoletim(globalOk, HOJE), {})
conferir('global: 60,1% passa de 100%', Object.keys(errosBoletim({ ...globalOk, entradas: { global: { campo: 'pct', texto: '60,1' } } }, HOJE)), ['global'])
conferir('global: R$ acima do saldo é barrado', Object.keys(errosBoletim({ ...globalOk, entradas: { global: { campo: 'valor', texto: '18000,01' } } }, HOJE)), ['global'])
conferir('global: sem valor é barrado', Object.keys(errosBoletim({ ...globalOk, entradas: {} }, HOJE)), ['global'])

// depois de salvar: acumulado e saldo na hora
const depois = [...medicoes, novaMedicao(GESSO, medicoes, 99, { data: HOJE, valor: 3000, linhas: [] })]
conferir('acumulado depois do boletim', medidoDoContrato(GESSO, depois), 15000)
conferir('saldo depois do boletim', saldoDoContrato(GESSO, depois), 15000)
conferir('50% depois do boletim', percentualMedido(GESSO, depois), 50)

// arredondamento: os boletins somam EXATAMENTE o total do item (0,5 x R$ 0,05 não vira R$ 0,03 duas vezes)
const itemFino = { id: 50, contratoId: 50, descricao: 'Parafuso', unidade: 'un', quantidade: 1, precoUnitario: 0.05 }
const metade = [{ id: 1, contratoId: 50, numero: 1, data: HOJE, valor: 0.03, linhas: [{ itemId: 50, quantidade: 0.5 }] }]
conferir('1a metade de R$ 0,05 = R$ 0,03', valorDaQuantidade(itemFino, [], 0.5), 0.03)
conferir('2a metade completa exatamente R$ 0,05', valorDaQuantidade(itemFino, metade, 0.5), 0.02)
const terco = { ...itemFino, quantidade: 3, precoUnitario: 3.33 }
const passo = (antes, q) => valorDaQuantidade(terco, antes, q)
const m1 = [{ contratoId: 50, numero: 1, valor: passo([], 1), linhas: [{ itemId: 50, quantidade: 1 }] }]
const m2 = [...m1, { contratoId: 50, numero: 2, valor: passo(m1, 1), linhas: [{ itemId: 50, quantidade: 1 }] }]
conferir('3 boletins de 1/3 somam o total do item', Math.round((passo([], 1) + passo(m1, 1) + passo(m2, 1)) * 100) / 100, 9.99)


conferir('só contrato ativo recebe boletim', [1, 2, 3, 4, 5].map((id) => recebeMedicao(contrato(id))), [false, false, true, true, false])
conferir('meio centavo arredonda para cima (0,5 x R$ 5,35 = R$ 2,68)', valorDaQuantidade({ id: 60, precoUnitario: 5.35 }, [], 0.5), 2.68)

// regras que a tela pergunta à lib
conferir('só Enviado -> Ativo pede o valor', [pedeCadastroDoValor(contrato(2), 'ativo'), pedeCadastroDoValor(contrato(5), 'ativo'), pedeCadastroDoValor(contrato(1), 'enviado')], [true, false, false])
conferir('barra de medido só em Ativo e Concluído', [1, 2, 3, 5].map((id) => mostraMedido(contrato(id))), [false, false, true, true])
conferir('% a medir do Gesso', percentualAMedir(GESSO, medicoes), 60)
conferir('acumulado depois em centavos', acumuladoDepois(GESSO, medicoes, 0.1), 12000.1)

console.log(`${ok}/${tot} conferências de empreiteiros passaram.`)
process.exit(ok === tot ? 0 : 1)
