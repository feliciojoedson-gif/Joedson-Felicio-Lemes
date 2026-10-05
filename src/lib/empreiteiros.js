// Regras do módulo Medições de Empreiteiros: contratos em Kanban e cadastro do valor.
// Sem React, sem banco, sem `window`: roda no Node (`tests/empreiteiros.mjs`). Dinheiro sempre somado em centavos.
import { formatarDinheiro, lerQuantidade } from './regras.js'

export const COLUNAS_CONTRATO = [
  { id: 'elaboracao', rotulo: 'Em Elaboração' },
  { id: 'enviado', rotulo: 'Enviado p/ Aprovação' },
  { id: 'ativo', rotulo: 'Aprovado / Ativo' },
  { id: 'concluido', rotulo: 'Concluído' },
]
export const UNIDADES = ['m2', 'm', 'un', 'vb']
export const MODOS = { global: 'Contrato global', escopo: 'Contrato por escopo' }

const posicao = (id) => COLUNAS_CONTRATO.findIndex((c) => c.id === id)
export const colunaContratoDepois = (id) => COLUNAS_CONTRATO[posicao(id) + 1] || null
export const colunaContratoAntes = (id) => COLUNAS_CONTRATO[posicao(id) - 1] || null

// ---------- Dinheiro e medido ----------

// O 1e-9 evita o erro de ponto flutuante nos empates de meio centavo (2,675 x 100 = 267,4999...): arredonda como o Postgres.
const centavos = (n) => Math.round(Number(n) * 100 + 1e-9)
const numeroOuZero = (texto) => {
  const n = lerQuantidade(texto)
  return Number.isFinite(n) ? n : 0
}

// Linha do formulário (campos em texto) -> total da linha; texto inválido conta zero.
export const valorDaLinha = (linha) => centavos(numeroOuZero(linha.quantidade) * numeroOuZero(linha.precoUnitario)) / 100
const totalDasLinhas = (linhas) => linhas.reduce((soma, l) => soma + centavos(valorDaLinha(l)), 0) / 100

// Valor total que o cadastro vai gravar no contrato.
export const valorDoCadastro = ({ modo, valorGlobal, itens }) =>
  modo === 'global' ? centavos(numeroOuZero(valorGlobal)) / 100 : totalDasLinhas(itens)

export const medidoDoContrato = (contrato, medicoes) =>
  medicoes.filter((m) => m.contratoId === contrato.id).reduce((soma, m) => soma + centavos(m.valor), 0) / 100

export const saldoDoContrato = (contrato, medicoes) =>
  Math.max(0, centavos(contrato.valorTotal || 0) - centavos(medidoDoContrato(contrato, medicoes))) / 100

export function percentualMedido(contrato, medicoes) {
  const total = centavos(contrato.valorTotal || 0)
  if (!total) return 0
  return (centavos(medidoDoContrato(contrato, medicoes)) / total) * 100
}

export const percentualAMedir = (contrato, medicoes) => Math.max(0, 100 - percentualMedido(contrato, medicoes))
export const acumuladoDepois = (contrato, medicoes, valor) => (centavos(medidoDoContrato(contrato, medicoes)) + centavos(valor)) / 100

export const estaTotalmenteMedido = (contrato, medicoes) =>
  centavos(contrato.valorTotal || 0) > 0 && centavos(medidoDoContrato(contrato, medicoes)) >= centavos(contrato.valorTotal)

export const rotuloPercentual = (n) => `${Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`

// Só contrato "Aprovado / Ativo" recebe medição.
export const recebeMedicao = (contrato) => contrato.status === 'ativo'
// A barra de % medido só faz sentido depois da ativação.
export const mostraMedido = (contrato) => ['ativo', 'concluido'].includes(contrato.status)
// Ativar (Enviado -> Ativo) é o único movimento que pede o cadastro do valor.
export const pedeCadastroDoValor = (contrato, para) => contrato.status === 'enviado' && para === 'ativo'

// ---------- Contrato novo e movimento ----------

export const novoContrato = ({ id, obraId, empreiteiro, descricao }, hoje) => ({
  id, obraId, empreiteiro: empreiteiro.trim(), descricao: descricao.trim(),
  status: 'elaboracao', modo: null, valorTotal: null, criadoEm: hoje,
})

export function errosContrato({ empreiteiro, descricao }) {
  const erros = {}
  if (!String(empreiteiro).trim()) erros.empreiteiro = 'Informe o nome do empreiteiro.'
  if (!String(descricao).trim()) erros.descricao = 'Descreva o serviço contratado.'
  return erros
}

// Devolve o texto do bloqueio, ou null se o movimento é permitido. Só anda uma coluna por vez.
export function verificarMovimento(contrato, para, medicoes) {
  if (Math.abs(posicao(para) - posicao(contrato.status)) !== 1) return 'Movimento inválido: o contrato anda uma coluna por vez.'
  if (para === 'concluido' && !estaTotalmenteMedido(contrato, medicoes)) {
    const faltam = formatarDinheiro(saldoDoContrato(contrato, medicoes))
    return `Só dá para concluir com 100% medido. Este contrato está em ${rotuloPercentual(percentualMedido(contrato, medicoes))} (faltam ${faltam}).`
  }
  if (contrato.status === 'ativo' && para === 'enviado' && medicoes.some((m) => m.contratoId === contrato.id)) {
    return 'Este contrato já tem medição lançada e não pode voltar para aprovação.'
  }
  return null
}

// `cadastro` ({ modo, valorTotal }) só vem ao ativar o contrato.
export const aplicarMovimentoContrato = (contrato, para, cadastro) => ({
  ...contrato,
  status: para,
  ...(cadastro ? { modo: cadastro.modo, valorTotal: cadastro.valorTotal } : {}),
})

// ---------- Cadastro do valor ----------

export const novaLinha = (chave) => ({ chave, descricao: '', unidade: 'm2', quantidade: '', precoUnitario: '' })
export const linhaDoItem = (item) => ({
  chave: `i${item.id}`, descricao: item.descricao, unidade: item.unidade,
  quantidade: String(item.quantidade).replace('.', ','), precoUnitario: String(item.precoUnitario).replace('.', ','),
})

// Chaves: `modo`, `valorGlobal`, `itens` e, por linha, `<posição>.descricao|unidade|quantidade|precoUnitario`.
export function errosValor({ modo, valorGlobal, itens }) {
  const erros = {}
  if (!MODOS[modo]) {
    erros.modo = 'Escolha como o valor será cadastrado.'
    return erros
  }
  if (modo === 'global') {
    if (!String(valorGlobal).trim() || !(numeroOuZero(valorGlobal) > 0)) erros.valorGlobal = 'Informe o valor total fechado (só número, maior que zero).'
    return erros
  }
  if (itens.length === 0) erros.itens = 'Adicione ao menos um item ao escopo.'
  itens.forEach((l, i) => {
    if (!l.descricao.trim()) erros[`${i}.descricao`] = 'Descreva o item.'
    if (!UNIDADES.includes(l.unidade)) erros[`${i}.unidade`] = 'Escolha a unidade.'
    if (!(numeroOuZero(l.quantidade) > 0)) erros[`${i}.quantidade`] = 'Informe a quantidade.'
    if (!(numeroOuZero(l.precoUnitario) > 0)) erros[`${i}.precoUnitario`] = 'Informe o preço unitário.'
  })
  return erros
}

// Linhas do formulário -> itens do contrato (números de verdade).
export const itensDoCadastro = (linhas) => linhas.map((l) => ({
  descricao: l.descricao.trim(), unidade: l.unidade,
  quantidade: numeroOuZero(l.quantidade), precoUnitario: numeroOuZero(l.precoUnitario),
}))

// ---------- Ficha de medição (boletins) ----------
// A QUANTIDADE é a fonte da verdade do escopo: % e R$ de cada item são derivados dela, nunca somados entre si.
// Quantidades ficam com 6 casas: o erro de arredondamento não chega a um centavo.
const arredondar = (n, casas = 6) => Number(Number(n).toFixed(casas))

export const proximoNumero = (contratoId, medicoes) =>
  Math.max(0, ...medicoes.filter((m) => m.contratoId === contratoId).map((m) => m.numero)) + 1

export const acumuladoDoItem = (itemId, medicoes) =>
  arredondar(medicoes.reduce((soma, m) => soma + m.linhas.filter((l) => l.itemId === itemId).reduce((s, l) => s + l.quantidade, 0), 0))
export const saldoDoItem = (item, medicoes) => Math.max(0, arredondar(item.quantidade - acumuladoDoItem(item.id, medicoes)))
export const pctDaQuantidade = (quantidade, item) => (item.quantidade ? (quantidade / item.quantidade) * 100 : 0)

// Entrada de uma linha: { campo: 'quantidade' | 'pct' | 'valor', texto }. Só o campo digitado vale; os outros são derivados.
export function quantidadeDaEntrada(entrada, item) {
  if (!entrada || !String(entrada.texto).trim()) return 0
  const n = numeroOuZero(entrada.texto)
  if (entrada.campo === 'quantidade') return n
  return arredondar(entrada.campo === 'pct' ? (n / 100) * item.quantidade : n / item.precoUnitario)
}

// Entrada do contrato global: { campo: 'pct' | 'valor', texto }; o % é sobre o valor total do contrato.
export function valorDaEntradaGlobal(entrada, contrato) {
  if (!entrada || !String(entrada.texto).trim()) return 0
  const n = numeroOuZero(entrada.texto)
  return entrada.campo === 'valor' ? centavos(n) / 100 : centavos((contrato.valorTotal * n) / 100) / 100
}
export const pctDoValor = (valor, contrato) => (contrato.valorTotal ? (valor / contrato.valorTotal) * 100 : 0)

// Entradas do formulário -> boletim numérico. Escopo: uma linha por item com execução; global: só o valor.
export function boletimDasEntradas(contrato, itens, entradas, data, medicoes) {
  if (contrato.modo === 'global') return { data, valor: valorDaEntradaGlobal(entradas.global, contrato), linhas: [] }
  const linhas = itens
    .map((item) => ({ itemId: item.id, quantidade: quantidadeDaEntrada(entradas[item.id], item) }))
    .filter((l) => l.quantidade > 0)
  const valor = linhas.reduce((soma, l) => soma + centavos(valorDaQuantidade(itens.find((i) => i.id === l.itemId), medicoes, l.quantidade)), 0) / 100
  return { data, valor, linhas }
}

// Valor de uma execução = valor do acumulado novo menos o do acumulado anterior, cada um arredondado UMA vez:
// assim os boletins somam exatamente o total do item, sem sobra nem falta de centavo.
export function valorDaQuantidade(item, medicoes, quantidade) {
  const antes = acumuladoDoItem(item.id, medicoes)
  return (centavos((antes + quantidade) * item.precoUnitario) - centavos(antes * item.precoUnitario)) / 100
}

// Nenhum item (nem o global) passa de 100% acumulado. Devolve { global?: texto, [itemId]: texto }.
function excessos(contrato, itens, medicoes, boletim) {
  const achados = {}
  if (contrato.modo === 'global') {
    if (centavos(medidoDoContrato(contrato, medicoes)) + centavos(boletim.valor) > centavos(contrato.valorTotal)) {
      achados.global = `Passa de 100%: o saldo a medir é ${formatarDinheiro(saldoDoContrato(contrato, medicoes))}.`
    }
    return achados
  }
  boletim.linhas.forEach((l) => {
    const item = itens.find((i) => i.id === l.itemId)
    if (!item) achados[l.itemId] = 'Item que não é deste contrato.'
    else if (arredondar(acumuladoDoItem(item.id, medicoes) + l.quantidade) > item.quantidade) {
      achados[l.itemId] = `Passa de 100%: o saldo deste item é ${saldoDoItem(item, medicoes).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} ${item.unidade}.`
    }
  })
  return achados
}

// Erros por campo do formulário. Chaves: `data`, `global`, `itens` e `i<itemId>`.
export function errosBoletim({ contrato, itens, medicoes, entradas, data }, hoje) {
  const erros = {}
  if (!data) erros.data = 'Informe a data da medição.'
  else if (data > hoje) erros.data = 'A data não pode ser futura.'
  const boletim = boletimDasEntradas(contrato, itens, entradas, data, medicoes)
  const achados = excessos(contrato, itens, medicoes, boletim)
  if (contrato.modo === 'global') {
    if (achados.global) erros.global = achados.global
    else if (!(boletim.valor > 0)) erros.global = 'Informe o % ou o valor em R$ medido neste boletim.'
    return erros
  }
  Object.entries(achados).forEach(([itemId, texto]) => { erros[`i${itemId}`] = texto })
  if (boletim.linhas.length === 0) erros.itens = 'Informe a execução de ao menos um item.'
  return erros
}

export const novaMedicao = (contrato, medicoes, id, boletim) => ({
  id, contratoId: contrato.id, numero: proximoNumero(contrato.id, medicoes), data: boletim.data, valor: boletim.valor, linhas: boletim.linhas,
})
