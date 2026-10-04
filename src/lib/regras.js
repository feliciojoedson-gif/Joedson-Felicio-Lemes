// Regras puras do sistema: sem React, sem banco, sem window. Testadas em tests/.

export const PERFIS = ['Coordenador', 'Planejamento', 'Engenharia', 'Produção', 'Cliente', 'Diretoria']
export const DISCIPLINAS = ['Civil', 'Mecânica', 'Tubulação', 'Elétrica', 'Instrumentação', 'Andaimes', 'Pintura', 'Outra']
export const STATUS_FRENTE = ['Não iniciada', 'Em andamento', 'Parada', 'Concluída']
export const MOTIVOS = ['Chuva', 'Falta de material', 'Falta de liberação', 'Falta de efetivo', 'Interferência', 'Retrabalho', 'Outro']
export const TIPOS_RESTRICAO = ['Restrição', 'RFI', 'Risco', 'Pleito potencial']
export const CRITICIDADES = ['Alta', 'Média', 'Baixa']
export const STATUS_OBRA = ['Em andamento', 'Concluída', 'Parada']
export const STATUS_RESTRICAO = ['Aberta', 'Em tratamento', 'Resolvida']

// ---------- Menus e permissões ----------

export const MENUS = {
  Coordenador: ['painel', 'frentes', 'diario', 'medicoes', 'restricoes', 'admin', 'perfil'],
  Planejamento: ['painel', 'frentes', 'perfil'],
  Engenharia: ['restricoes', 'frentes', 'perfil'],
  Produção: ['diario', 'frentes', 'restricoes', 'perfil'],
  Cliente: ['painel', 'fotos', 'perfil'],
  Diretoria: ['painel', 'medicoes', 'restricoes', 'perfil'],
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
  verMedicao: ['Coordenador', 'Diretoria'],
  criarMedicao: ['Coordenador'],
  criarRestricao: ['Coordenador', 'Planejamento', 'Engenharia', 'Produção'],
  verEfetivo: ['Coordenador', 'Planejamento', 'Produção', 'Diretoria'],
  liberarFoto: ['Coordenador'],
  administrar: ['Coordenador'],
}
export const pode = (role, acao) => (PERMISSOES[acao] || []).includes(role)

export const veTodasAsObras = (role) => role === 'Coordenador' || role === 'Diretoria'
export const tiposDeRestricaoVisiveis = (role) => {
  if (role === 'Coordenador' || role === 'Diretoria') return TIPOS_RESTRICAO
  if (role === 'Cliente' || role === 'Pendente') return []
  return ['Restrição', 'RFI']
}

// ---------- Datas e formatação ----------

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
  !medicoes.some((m) => m.frente_id === f.id && (m.status === 'Enviada' || m.status === 'Aprovada'))

export const semDiarioHoje = (f, apontamentos, hoje) =>
  (f.status === 'Em andamento' || f.status === 'Parada') &&
  !f.eh_marco &&
  !apontamentos.some((a) => a.frente_id === f.id && a.data === hoje)

export const restricaoCriticaAberta = (r) => r.criticidade === 'Alta' && r.status !== 'Resolvida'

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
