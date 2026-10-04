// Regras puras do sistema: sem React, sem banco, sem window. Testadas em tests/.

export const PERFIS = [
  'Coordenador', 'Planejamento', 'Engenharia', 'Produção', 'Medição', 'Custos e Controle',
  'Gestão Contratual', 'Cliente', 'Diretoria', 'Administrador',
]
export const DISCIPLINAS = ['Civil', 'Mecânica', 'Tubulação', 'Elétrica', 'Instrumentação', 'Andaimes', 'Pintura', 'Outra']
export const STATUS_FRENTE = ['Não iniciada', 'Em andamento', 'Parada', 'Concluída']
export const MOTIVOS = ['Chuva', 'Falta de material', 'Falta de liberação', 'Falta de efetivo', 'Interferência', 'Retrabalho', 'Outro']
export const TIPOS_RESTRICAO = ['Restrição', 'RFI', 'Risco', 'Pleito potencial']
export const CRITICIDADES = ['Alta', 'Média', 'Baixa']
export const STATUS_OBRA = ['Planejamento', 'Ativa', 'Suspensa', 'Encerrada', 'Arquivada']
export const STATUS_MEDICAO = ['Rascunho', 'Enviada', 'Aprovada pela Gestão', 'Aprovada']
export const STATUS_RESTRICAO = ['Aberta', 'Em tratamento', 'Resolvida']

// ---------- Menus e permissões ----------

export const MENUS = {
  Coordenador: ['painel', 'frentes', 'diario', 'medicoes', 'restricoes', 'admin', 'perfil'],
  Planejamento: ['painel', 'frentes', 'medicoes', 'perfil'],
  Engenharia: ['restricoes', 'frentes', 'perfil'],
  Produção: ['diario', 'frentes', 'restricoes', 'perfil'],
  Medição: ['medicoes', 'frentes', 'perfil'],
  'Custos e Controle': ['painel', 'medicoes', 'perfil'],
  'Gestão Contratual': ['restricoes', 'medicoes', 'frentes', 'perfil'],
  Cliente: ['painel', 'fotos', 'perfil'],
  Diretoria: ['painel', 'medicoes', 'restricoes', 'perfil'],
  Administrador: ['painel', 'medicoes', 'restricoes', 'admin', 'perfil'],
}

export const ROTULOS = {
  painel: 'Painel',
  frentes: 'Frentes',
  diario: 'Diário',
  medicoes: 'Medições',
  restricoes: 'Restrições',
  fotos: 'Fotos',
  admin: 'Administração',
  perfil: 'Meu perfil',
  mais: 'Mais',
}

export const menuDoPerfil = (role) => MENUS[role] || []
export const telaInicial = (role) => menuDoPerfil(role)[0] || null

// Barra inferior do celular: no máximo 5 itens. Passou disso, os 4 primeiros + "Mais".
export function itensDaBarra(role) {
  const todos = menuDoPerfil(role)
  if (todos.length <= 5) return { barra: todos, mais: [] }
  return { barra: [...todos.slice(0, 4), 'mais'], mais: todos.slice(4) }
}

const PERMISSOES = {
  criarFrente: ['Coordenador', 'Planejamento'],
  editarFrente: ['Coordenador', 'Planejamento'],
  apagar: ['Coordenador'],
  lancarDiario: ['Coordenador', 'Produção'],
  verMedicao: ['Coordenador', 'Diretoria', 'Administrador', 'Planejamento', 'Medição', 'Custos e Controle', 'Gestão Contratual'],
  criarMedicao: ['Coordenador', 'Medição'],
  aprovarMedicaoPelaGestao: ['Gestão Contratual'],
  aprovarMedicaoFinal: ['Coordenador'],
  criarRestricao: ['Coordenador', 'Planejamento', 'Engenharia', 'Produção', 'Gestão Contratual'],
  verEfetivo: ['Coordenador', 'Planejamento', 'Produção', 'Medição', 'Custos e Controle', 'Diretoria', 'Administrador'],
  liberarFoto: ['Coordenador'],
  administrar: ['Coordenador'],
  rodarAtualizacao: ['Coordenador'],
}
export const pode = (role, acao) => (PERMISSOES[acao] || []).includes(role)

export const veTodasAsObras = (role) => ['Coordenador', 'Diretoria', 'Administrador'].includes(role)

// Quem lê todo o diário (os demais: Produção só o que lançou, Engenharia sem efetivo, Cliente e Gestão Contratual nada).
export const veTodoODiario = (role) =>
  ['Coordenador', 'Diretoria', 'Administrador', 'Planejamento', 'Medição', 'Custos e Controle'].includes(role)

export const tiposDeRestricaoVisiveis = (role) => {
  if (['Coordenador', 'Diretoria', 'Administrador', 'Gestão Contratual'].includes(role)) return TIPOS_RESTRICAO
  if (['Cliente', 'Pendente', 'Medição', 'Custos e Controle'].includes(role)) return []
  return ['Restrição', 'RFI']
}

// ---------- Datas e formatação ----------

// Data de hoje no fuso de Brasília, como AAAA-MM-DD (é o fuso em que a virada diária roda).
export const hojeEmBrasilia = (agora = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(agora)

// A atualização diária das 06h não rodou hoje? Antes das 7h ainda não é atraso.
export function viradaAtrasada(virada, agora = new Date()) {
  if (!virada || virada.rodou_hoje) return false
  const hora = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false }).format(agora))
  return hora >= 7
}

const MS_DIA = 86400000
const paraUTC = (iso) => {
  const [a, m, d] = iso.split('-').map(Number)
  return Date.UTC(a, m - 1, d)
}
export const diasEntre = (de, ate) => Math.round((paraUTC(ate) - paraUTC(de)) / MS_DIA)

export function formatarData(iso) {
  if (!iso) return '—'
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}
export function formatarDataCurta(iso) {
  if (!iso) return '—'
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}
export function formatarMes(iso) {
  const [a, m] = iso.split('-')
  return `${m}/${a}`
}
export const formatarDinheiro = (n) =>
  Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// ---------- Avanço e semáforo ----------

// Reta entre início e fim planejados. Antes do início 0%, depois do fim 100%.
export function planejadoHoje(f, hoje) {
  if (f.eh_marco) return null
  const total = diasEntre(f.inicio_planejado, f.fim_planejado)
  const passado = diasEntre(f.inicio_planejado, hoje)
  if (passado <= 0) return 0
  if (total <= 0 || passado >= total) return 100
  return (passado / total) * 100
}

// Desvio em pontos percentuais. Negativo é atraso.
export function desvio(f, hoje) {
  if (f.eh_marco) return 0
  return f.percentual_realizado - planejadoHoje(f, hoje)
}

export const estaParada = (f) => f.status === 'Parada'
export const estaParadaHa3Dias = (f) => f.status === 'Parada' && f.dias_sem_avanco >= 3

// 'bad' | 'warn' | 'ok' | 'neutral'
export function semaforo(f, hoje) {
  if (f.eh_marco) return 'neutral'
  if (f.status === 'Concluída') return 'ok'
  if (f.status === 'Parada') return 'bad'
  if (f.status === 'Não iniciada') return planejadoHoje(f, hoje) > 0 ? 'warn' : 'ok'
  const d = desvio(f, hoje)
  if (d <= -10) return 'bad'
  if (d <= -5) return 'warn'
  if (f.dias_sem_avanco >= 1 && f.dias_sem_avanco <= 2 && d < 0) return 'warn'
  return 'ok'
}

export function rotuloSemaforo(f, hoje) {
  if (f.eh_marco) return 'Marco'
  if (f.status === 'Concluída') return 'Concluída'
  if (f.status === 'Parada') return 'Parada'
  return { bad: 'Atrasada', warn: 'Atenção', ok: 'Em dia' }[semaforo(f, hoje)]
}

// Média ponderada pelo peso. Marcos não entram.
export function progressoDaObra(frentes, hoje) {
  const itens = frentes.filter((f) => !f.eh_marco)
  const pesoTotal = itens.reduce((s, f) => s + Number(f.peso), 0)
  if (!pesoTotal) return { real: 0, plan: 0, desvio: 0 }
  const real = itens.reduce((s, f) => s + f.percentual_realizado * Number(f.peso), 0) / pesoTotal
  const plan = itens.reduce((s, f) => s + planejadoHoje(f, hoje) * Number(f.peso), 0) / pesoTotal
  return { real, plan, desvio: real - plan }
}

// Mesmos limites da frente, aplicados ao desvio da obra.
export function semaforoDaObra(desvioObra) {
  if (desvioObra <= -10) return 'bad'
  if (desvioObra <= -5) return 'warn'
  return 'ok'
}
export const rotuloDaObra = (tom) => ({ bad: 'Crítica', warn: 'Atenção', ok: 'Em dia' }[tom])

// Mais dias parado primeiro; empate, pior desvio primeiro.
export function ordenarFrentes(frentes, hoje) {
  return [...frentes].sort(
    (a, b) => (b.dias_sem_avanco ?? -1) - (a.dias_sem_avanco ?? -1) || desvio(a, hoje) - desvio(b, hoje),
  )
}

// ---------- Faixa de alertas e filtros ----------

export const concluidaSemMedicao = (f, medicoes) =>
  f.status === 'Concluída' &&
  !medicoes.some((m) => m.frente_id === f.id && (m.status === 'Enviada' || m.status === 'Aprovada pela Gestão' || m.status === 'Aprovada'))

export const semDiarioHoje = (f, apontamentos, hoje) =>
  (f.status === 'Em andamento' || f.status === 'Parada') &&
  !f.eh_marco &&
  !apontamentos.some((a) => a.frente_id === f.id && a.data === hoje)

// ---------- Diário ----------

export const lancamentoDoDia = (frenteId, apontamentos, data) =>
  apontamentos.find((a) => a.frente_id === frenteId && a.data === data) || null

// Piso do acumulado: o que a frente já tinha antes do lançamento do dia. Com lançamento do dia
// já gravado, o piso é o do dia anterior (senão não dá para corrigir um valor para baixo).
// Produção só enxerga os próprios lançamentos: se o anterior é de outra pessoa, o banco confere.
export function acumuladoAnterior(frente, apontamentos, data) {
  if (!lancamentoDoDia(frente.id, apontamentos, data)) return frente.percentual_realizado
  const antes = apontamentos
    .filter((a) => a.frente_id === frente.id && a.data < data)
    .sort((a, b) => b.data.localeCompare(a.data))[0]
  return antes ? antes.percentual_acumulado : 0
}

// Efetivo sugerido: o do último lançamento visível da frente (o dia costuma repetir o anterior).
export function efetivoSugerido(frenteId, apontamentos) {
  const ultimo = apontamentos
    .filter((a) => a.frente_id === frenteId)
    .sort((a, b) => b.data.localeCompare(a.data))[0]
  return ultimo ? ultimo.efetivo_qtd : 0
}

// Devolve o texto do erro, ou null se o lançamento pode ser salvo.
export function validarLancamento({ anterior, acumulado, efetivo, motivo }) {
  if (!Number.isFinite(acumulado) || acumulado < anterior || acumulado > 100) return `O avanço acumulado tem que ficar entre ${anterior}% e 100%.`
  if (!Number.isInteger(efetivo) || efetivo < 0) return 'Informe o efetivo (número de pessoas).'
  if (acumulado === anterior && !motivo) return 'Informe o motivo de não haver avanço.'
  return null
}

// ---------- Fotos do diário ----------

export const FOTOS_POR_LANCAMENTO = 4
// Maior lado da foto depois de comprimida: dá para ler no celular e fica bem abaixo do limite de 5 MB do bucket.
export const LADO_MAXIMO_FOTO = 1600

// Reduz mantendo a proporção; foto já pequena não é ampliada.
export function tamanhoComprimido(largura, altura, maximo = LADO_MAXIMO_FOTO) {
  const maior = Math.max(largura, altura)
  if (maior <= maximo) return { largura, altura }
  const escala = maximo / maior
  return { largura: Math.round(largura * escala), altura: Math.round(altura * escala) }
}

// Caminho no bucket `fotos`: <obra>/<frente>/<arquivo>. A política de envio do banco lê a obra da primeira pasta.
export const caminhoDaFoto = (obraId, frenteId, nome) => `${obraId}/${frenteId}/${nome}`

export const legendaDaFoto = (frente, data) => `${frente.nome} · ${formatarData(data)}`

export const restricaoCriticaAberta =(r) => r.criticidade === 'Alta' && r.status !== 'Resolvida'

export function passaPeriodo(f, periodo, hoje) {
  if (!periodo) return true
  const dias = f.ultimo_avanco_em ? diasEntre(f.ultimo_avanco_em, hoje) : null
  if (periodo === 'recente') return dias !== null && dias <= 3
  if (periodo === 'antigo') return dias === null || dias > 3
  return true
}

// Último motivo registrado de não avanço de uma frente (mais recente primeiro).
export function ultimoMotivo(frenteId, apontamentos) {
  const semAvanco = apontamentos
    .filter((a) => a.frente_id === frenteId && !a.houve_avanco && a.motivo_sem_avanco)
    .sort((a, b) => (a.data < b.data ? 1 : -1))
  return semAvanco[0]?.motivo_sem_avanco || null
}

// Ordem das restrições: criticidade (Alta primeiro), depois data limite.
export function ordenarRestricoes(lista) {
  const peso = { Alta: 0, Média: 1, Baixa: 2 }
  return [...lista].sort(
    (a, b) =>
      peso[a.criticidade] - peso[b.criticidade] ||
      (a.data_limite || '9999').localeCompare(b.data_limite || '9999'),
  )
}
