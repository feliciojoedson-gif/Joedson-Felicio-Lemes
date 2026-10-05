// Regras puras dos cadastros que a pessoa preenche na tela: frente, restrição, medição da frente, obra e acesso de pessoas.
// Sem React e sem banco: a tela valida com estas funções e o banco repete as regras (CHECK, gatilhos e RLS).
import { CRITICIDADES, DISCIPLINAS, PERFIS, STATUS_OBRA, TIPOS_RESTRICAO } from './regras.js'

const vazio = (v) => !String(v ?? '').trim()
const ehData = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || '')
// Número digitado no celular: aceita vírgula ("12,5") e devolve NaN se não for número.
export const lerNumero = (texto) => Number(String(texto ?? '').trim().replace(',', '.'))

// ---------- Frente ----------

export function errosFrente({ nome, disciplina, inicio, fim, peso, ehMarco }) {
  const erros = {}
  if (vazio(nome)) erros.nome = 'Dê um nome à frente.'
  if (!DISCIPLINAS.includes(disciplina)) erros.disciplina = 'Escolha a disciplina.'
  if (!ehData(inicio)) erros.inicio = 'Informe o início planejado.'
  if (!ehData(fim)) erros.fim = 'Informe o fim planejado.'
  else if (ehData(inicio) && fim < inicio) erros.fim = 'O fim não pode ser antes do início.'
  if (ehMarco && ehData(inicio) && ehData(fim) && inicio !== fim) erros.fim = 'Um marco acontece em um dia só: início e fim iguais.'
  const p = lerNumero(peso)
  if (!(p > 0)) erros.peso = 'O peso precisa ser maior que zero.'
  return erros
}

// ---------- Restrição ----------

export function errosRestricaoDaObra({ tipo, titulo, criticidade, dataLimite, impacto }, tiposPermitidos = TIPOS_RESTRICAO) {
  const erros = {}
  if (!tiposPermitidos.includes(tipo)) erros.tipo = 'Escolha o tipo.'
  if (vazio(titulo)) erros.titulo = 'Dê um título.'
  if (!CRITICIDADES.includes(criticidade)) erros.criticidade = 'Escolha a criticidade.'
  if (dataLimite && !ehData(dataLimite)) erros.dataLimite = 'Data inválida.'
  if (!vazio(impacto) && !/^\d+$/.test(String(impacto).trim())) erros.impacto = 'Informe os dias de impacto só com números.'
  return erros
}

// Próximo passo do status da restrição (o botão que a tela mostra). Resolvida pode reabrir.
export const PASSOS_RESTRICAO = {
  Aberta: [{ para: 'Em tratamento', rotulo: 'Colocar em tratamento' }, { para: 'Resolvida', rotulo: 'Marcar como resolvida' }],
  'Em tratamento': [{ para: 'Resolvida', rotulo: 'Marcar como resolvida' }],
  Resolvida: [{ para: 'Aberta', rotulo: 'Reabrir' }],
}

// ---------- Medição da frente ----------

// A medição é do mês: sempre guardada no dia 1 (o banco exige).
export const primeiroDiaDoMes = (iso) => `${String(iso).slice(0, 7)}-01`

export function errosMedicaoDaFrente({ mes, quantidade, unidade, percentual, valor }) {
  const erros = {}
  if (!/^\d{4}-\d{2}$/.test(mes || '')) erros.mes = 'Escolha o mês da medição.'
  const q = lerNumero(quantidade)
  if (vazio(quantidade) || Number.isNaN(q) || q < 0) erros.quantidade = 'Informe a quantidade medida.'
  if (vazio(unidade)) erros.unidade = 'Informe a unidade (m², m, un…).'
  const p = lerNumero(percentual)
  if (vazio(percentual) || Number.isNaN(p) || p < 0 || p > 100) erros.percentual = 'O percentual vai de 0 a 100.'
  const v = lerNumero(valor)
  if (vazio(valor) || Number.isNaN(v) || v < 0) erros.valor = 'Informe o valor medido.'
  return erros
}

// Fluxo da medição: Medição ou Coordenador enviam, a Gestão Contratual dá a 1ª aprovação, o Coordenador a final.
// O banco confere a mesma ordem (gatilho medicoes_protege); aqui só se decide qual botão aparece.
export function passoDaMedicao(status, role) {
  if (status === 'Rascunho' && ['Coordenador', 'Medição'].includes(role)) return { para: 'Enviada', rotulo: 'Enviar para aprovação' }
  if (status === 'Enviada' && role === 'Gestão Contratual') return { para: 'Aprovada pela Gestão', rotulo: 'Aprovar (Gestão)' }
  if (status === 'Aprovada pela Gestão' && role === 'Coordenador') return { para: 'Aprovada', rotulo: 'Aprovação final' }
  return null
}

// ---------- Obra ----------

export function errosObra({ codigo, nome, cliente, inicio, fim, status }) {
  const erros = {}
  if (vazio(codigo)) erros.codigo = 'Informe o código da obra.'
  if (vazio(nome)) erros.nome = 'Dê um nome à obra.'
  if (vazio(cliente)) erros.cliente = 'Informe o cliente.'
  if (!ehData(inicio)) erros.inicio = 'Informe a data de início.'
  if (!ehData(fim)) erros.fim = 'Informe a meta de entrega.'
  else if (ehData(inicio) && fim < inicio) erros.fim = 'A entrega não pode ser antes do início.'
  if (status !== undefined && !STATUS_OBRA.includes(status)) erros.status = 'Escolha o status.'
  return erros
}

// ---------- Acesso de pessoas ----------

// Quem aprova uma conta escolhe o perfil (nunca "Pendente") e, se o perfil não vê todas as obras, as obras liberadas.
export const PERFIS_LIBERAVEIS = PERFIS.filter((p) => p !== 'Pendente')

export function errosLiberacao({ role, obraIds }, veTodas) {
  const erros = {}
  if (!PERFIS_LIBERAVEIS.includes(role)) erros.role = 'Escolha o perfil.'
  if (PERFIS_LIBERAVEIS.includes(role) && !veTodas(role) && (!obraIds || obraIds.length === 0)) erros.obras = 'Escolha ao menos uma obra para essa pessoa.'
  return erros
}

// Tipos de restrição que cada perfil pode CRIAR (a RLS repete a regra; aqui só se monta a lista do formulário).
export function tiposQueUmPerfilCria(role) {
  if (role === 'Coordenador') return TIPOS_RESTRICAO
  if (role === 'Gestão Contratual') return ['Risco', 'Pleito potencial']
  if (['Planejamento', 'Engenharia', 'Produção'].includes(role)) return ['Restrição', 'RFI']
  return []
}
