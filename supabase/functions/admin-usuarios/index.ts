// Edge Function admin-usuarios: o painel de admin cria, bloqueia, redefine senha e exclui logins.
// Usa a chave de serviço (SUPABASE_SERVICE_ROLE_KEY), que já existe como segredo do próprio Supabase e NUNCA vai para o navegador.
// Publicada com verificação de JWT ligada. A cada chamada: (1) descobre quem chama pelo token da sessão e (2) confere NO BANCO
// se essa pessoa é Coordenador ativo (o papel que administra o app). Nada que venha escrito no pedido vale como papel.
// Erro interno nunca vai cru para a tela: o detalhe fica no log da função e a tela recebe uma frase em português.
import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const PERFIS = ['Coordenador', 'Planejamento', 'Engenharia', 'Produção', 'Medição', 'Custos e Controle', 'Gestão Contratual', 'Cliente', 'Diretoria', 'Administrador']
const VE_TODAS_AS_OBRAS = ['Coordenador', 'Diretoria', 'Administrador']
// Módulos de menu que o administrador pode desligar por pessoa (igual ao CHECK profiles_modulos_validos do banco).
const MODULOS = ['painel', 'frentes', 'diario', 'medicoes', 'restricoes', 'materiais', 'planejamento', 'qualidade', 'relatorios', 'rdo', 'fotos']
const BANIDO = '876000h' // ~100 anos: bloqueado de fato

class Recusa extends Error {
  status: number
  constructor(mensagem: string, status = 400) {
    super(mensagem)
    this.status = status
  }
}
const resposta = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

// Senha provisória: 12 caracteres sem letras que se confundem (0/O, 1/l/I).
function senhaProvisoria() {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join('')
}

// deno-lint-ignore no-explicit-any
type Cliente = any

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    if (req.method !== 'POST') throw new Recusa('Pedido inválido.', 405)
    const admin: Cliente = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // 1) Quem está chamando: pelo token da sessão.
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
    const { data: sessao, error: erroSessao } = await admin.auth.getUser(token)
    if (erroSessao || !sessao?.user) throw new Recusa('Sessão inválida. Entre de novo.', 401)

    // 2) Essa pessoa é administradora ativa? Pergunta ao banco, nunca ao pedido.
    const { data: eu } = await admin.from('profiles').select('id, nome, role, ativo').eq('auth_uid', sessao.user.id).maybeSingle()
    if (!eu || !eu.ativo || eu.role !== 'Coordenador') throw new Recusa('Só o administrador pode fazer isso.', 403)

    const corpo = await req.json().catch(() => ({}))
    const resultado = await executar(admin, eu, corpo)
    return resposta(resultado)
  } catch (e) {
    if (e instanceof Recusa) return resposta({ erro: e.message }, e.status)
    // Regra do banco escrita em português (ex.: último administrador): vira recusa; qualquer outro erro é interno e fica só no log.
    if ((e as { code?: string })?.code === 'P0001') return resposta({ erro: (e as Error).message }, 409)
    console.error('admin-usuarios: erro interno', e)
    return resposta({ erro: 'Não consegui concluir. Tente de novo em instantes.' }, 500)
  }
})

async function executar(admin: Cliente, eu: { id: number }, corpo: Record<string, unknown>) {
  const acao = String(corpo.acao || '')
  if (acao === 'listar') return { usuarios: await listar(admin) }
  if (acao === 'criar') return await criar(admin, corpo)

  const alvo = await carregarAlvo(admin, Number(corpo.perfilId))
  if (alvo.id === eu.id) throw new Recusa('Esta é a sua própria conta: aqui você não pode mudar, bloquear nem excluir a si mesmo.', 409)

  switch (acao) {
    case 'atualizar': return await atualizar(admin, alvo, corpo)
    case 'redefinir': return await redefinir(admin, alvo)
    case 'bloquear': return await bloquear(admin, alvo, true)
    case 'desbloquear': return await bloquear(admin, alvo, false)
    case 'excluir': return await excluir(admin, alvo, String(corpo.confirmaNome || ''))
    default: throw new Recusa('Ação desconhecida.')
  }
}

async function carregarAlvo(admin: Cliente, perfilId: number) {
  if (!Number.isInteger(perfilId)) throw new Recusa('Pessoa não informada.')
  const { data } = await admin.from('profiles').select('id, auth_uid, nome, email, role, ativo').eq('id', perfilId).maybeSingle()
  if (!data) throw new Recusa('Pessoa não encontrada.', 404)
  return data as { id: number; auth_uid: string; nome: string; email: string; role: string; ativo: boolean }
}

// O último Coordenador ativo não pode sair do cargo (nem ser excluído nem bloqueado): sem ele ninguém abre o painel.
async function garantirOutroAdministrador(admin: Cliente, alvo: { id: number; role: string; ativo: boolean }) {
  if (alvo.role !== 'Coordenador' || !alvo.ativo) return
  const { count } = await admin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'Coordenador').eq('ativo', true).neq('id', alvo.id)
  if (!count) throw new Recusa('Este é o último administrador ativo. Cadastre outro antes de mudar, bloquear ou excluir esta conta.', 409)
}

async function listar(admin: Cliente) {
  const { data: perfis, error } = await admin.from('profiles').select('id, auth_uid, nome, email, role, ativo, modulos_desligados, created_at').order('nome')
  if (error) throw error
  const { data: membros } = await admin.from('obra_membros').select('profile_id, obra_id')
  const logins = new Map<string, { last_sign_in_at: string | null; banned_until: string | null }>()
  for (let pagina = 1; pagina <= 20; pagina++) {
    const { data, error: e } = await admin.auth.admin.listUsers({ page: pagina, perPage: 1000 })
    if (e) throw e
    for (const u of data.users) logins.set(u.id, { last_sign_in_at: u.last_sign_in_at ?? null, banned_until: u.banned_until ?? null })
    if (data.users.length < 1000) break
  }
  return perfis.map((p: { id: number; auth_uid: string; nome: string; email: string; role: string; ativo: boolean; modulos_desligados: string[] }) => ({
    id: p.id, nome: p.nome, email: p.email, role: p.role, ativo: p.ativo, modulosDesligados: p.modulos_desligados,
    ultimoAcesso: logins.get(p.auth_uid)?.last_sign_in_at ?? null,
    obraIds: (membros || []).filter((m: { profile_id: number }) => m.profile_id === p.id).map((m: { obra_id: number }) => m.obra_id),
  }))
}

function validarModulos(valor: unknown): string[] {
  if (valor === undefined || valor === null) return []
  if (!Array.isArray(valor) || valor.some((m) => !MODULOS.includes(String(m)))) throw new Recusa('Módulo desconhecido na lista de módulos.')
  return [...new Set(valor.map(String))]
}

async function validarObras(admin: Cliente, perfil: string, obraIds: unknown): Promise<number[]> {
  if (VE_TODAS_AS_OBRAS.includes(perfil)) return []
  const ids = Array.isArray(obraIds) ? obraIds.map(Number).filter(Number.isInteger) : []
  if (!ids.length) throw new Recusa('Escolha ao menos uma obra para essa pessoa.')
  const { data } = await admin.from('obras').select('id').in('id', ids)
  if ((data || []).length !== new Set(ids).size) throw new Recusa('Uma das obras escolhidas não existe.')
  return [...new Set(ids)]
}

async function gravarObras(admin: Cliente, perfilId: number, obraIds: number[]) {
  const { error: e1 } = await admin.from('obra_membros').delete().eq('profile_id', perfilId)
  if (e1) throw e1
  if (obraIds.length) {
    const { error: e2 } = await admin.from('obra_membros').insert(obraIds.map((obra_id) => ({ obra_id, profile_id: perfilId })))
    if (e2) throw e2
  }
}

async function criar(admin: Cliente, corpo: Record<string, unknown>) {
  const nome = String(corpo.nome || '').trim()
  const email = String(corpo.email || '').trim().toLowerCase()
  const perfil = String(corpo.role || '')
  if (!nome) throw new Recusa('Informe o nome.')
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Recusa('Informe um e-mail válido.')
  if (!PERFIS.includes(perfil)) throw new Recusa('Escolha o perfil.')
  const obraIds = await validarObras(admin, perfil, corpo.obraIds)
  const modulosDesligados = validarModulos(corpo.modulosDesligados)

  const senha = senhaProvisoria()
  const { data: criado, error } = await admin.auth.admin.createUser({ email, password: senha, email_confirm: true, user_metadata: { nome } })
  if (error || !criado?.user) {
    if (error && /already|registered|exists/i.test(error.message)) throw new Recusa('Já existe uma conta com este e-mail.', 409)
    console.error('admin-usuarios: createUser', error)
    throw new Recusa('Não consegui criar o login. Tente de novo.', 500)
  }
  const uid = criado.user.id
  try {
    // O gatilho do banco já criou o perfil como Pendente; aqui ele vira o perfil escolhido, ativo.
    const { data: perfilCriado, error: e1 } = await admin.from('profiles').update({ role: perfil, nome, ativo: true, modulos_desligados: modulosDesligados }).eq('auth_uid', uid).select('id').single()
    if (e1) throw e1
    await gravarObras(admin, perfilCriado.id, obraIds)
    return { perfilId: perfilCriado.id, email, senhaProvisoria: senha }
  } catch (e) {
    // Desfaz o login pela metade para não sobrar conta sem perfil.
    console.error('admin-usuarios: criar, desfazendo', e)
    const { error: eMembros } = await admin.from('obra_membros').delete().eq('profile_id', (await admin.from('profiles').select('id').eq('auth_uid', uid).maybeSingle()).data?.id ?? -1)
    const { error: ePerfil } = await admin.from('profiles').delete().eq('auth_uid', uid)
    const { error: eLogin } = await admin.auth.admin.deleteUser(uid)
    if (eMembros || ePerfil || eLogin) {
      console.error('admin-usuarios: não consegui desfazer o cadastro pela metade', { eMembros, ePerfil, eLogin })
      throw new Recusa(`Não consegui terminar o cadastro e nem desfazê-lo por completo: o e-mail ${email} pode ter ficado ocupado. Procure a conta no painel e exclua, ou tente de novo.`, 500)
    }
    throw new Recusa('Não consegui terminar o cadastro. Nada foi criado; tente de novo.', 500)
  }
}

async function atualizar(admin: Cliente, alvo: { id: number; role: string; ativo: boolean }, corpo: Record<string, unknown>) {
  const novoPerfil = corpo.role === undefined ? alvo.role : String(corpo.role)
  if (!PERFIS.includes(novoPerfil)) throw new Recusa('Escolha o perfil.')
  if (alvo.role === 'Coordenador' && novoPerfil !== 'Coordenador') await garantirOutroAdministrador(admin, alvo)
  const obraIds = await validarObras(admin, novoPerfil, corpo.obraIds ?? (await obrasAtuais(admin, alvo.id)))
  const mudanca: Record<string, unknown> = {}
  if (novoPerfil !== alvo.role) mudanca.role = novoPerfil
  if (corpo.modulosDesligados !== undefined) mudanca.modulos_desligados = validarModulos(corpo.modulosDesligados)
  if (Object.keys(mudanca).length) {
    const { error } = await admin.from('profiles').update(mudanca).eq('id', alvo.id)
    if (error) throw error
  }
  await gravarObras(admin, alvo.id, obraIds)
  return { ok: true }
}
async function obrasAtuais(admin: Cliente, perfilId: number) {
  const { data } = await admin.from('obra_membros').select('obra_id').eq('profile_id', perfilId)
  return (data || []).map((m: { obra_id: number }) => m.obra_id)
}

async function redefinir(admin: Cliente, alvo: { id: number; auth_uid: string; email: string }) {
  const senha = senhaProvisoria()
  const { error } = await admin.auth.admin.updateUserById(alvo.auth_uid, { password: senha })
  if (error) {
    console.error('admin-usuarios: updateUserById', error)
    throw new Recusa('Não consegui redefinir a senha. Tente de novo.', 500)
  }
  return { email: alvo.email, senhaProvisoria: senha }
}

// Bloquear = situação no perfil (a RLS deixa de enxergar a pessoa) + impedir novo login no Supabase Auth. Desbloquear desfaz as duas.
async function bloquear(admin: Cliente, alvo: { id: number; auth_uid: string; role: string; ativo: boolean }, bloquear: boolean) {
  if (bloquear) await garantirOutroAdministrador(admin, alvo)
  const { error: eAuth } = await admin.auth.admin.updateUserById(alvo.auth_uid, { ban_duration: bloquear ? BANIDO : 'none' })
  if (eAuth) {
    console.error('admin-usuarios: ban', eAuth)
    throw new Recusa('Não consegui mudar o bloqueio. Tente de novo.', 500)
  }
  const { error } = await admin.from('profiles').update({ ativo: !bloquear }).eq('id', alvo.id)
  if (error) {
    const { error: eReverter } = await admin.auth.admin.updateUserById(alvo.auth_uid, { ban_duration: bloquear ? 'none' : BANIDO })
    if (eReverter) console.error('admin-usuarios: não consegui reverter o bloqueio no Auth', eReverter)
    throw error
  }
  return { ok: true }
}

// Onde uma pessoa deixa registro: colunas que apontam para o perfil e colunas created_by que apontam para o login.
const POR_PERFIL: [string, string][] = [
  ['obras', 'responsavel_id'], ['auditoria', 'usuario_id'], ['restricoes', 'autor_id'], ['restricoes', 'responsavel_id'],
  ['fotos', 'autor_id'], ['apontamentos', 'autor_id'], ['frentes', 'responsavel_id'],
]
const POR_LOGIN = [
  'atividades_planejamento', 'restricoes_planejamento', 'planejamento_config', 'materiais_catalogo', 'pedidos_material', 'rdo_registros',
  'qualidade_pendencias', 'fvs_modelos', 'fvs_vistorias', 'fvs_ncs', 'gemba_observacoes',
  'frentes', 'medicoes', 'contratos_empreiteiro', 'itens_contrato', 'boletins_empreiteiro',
]
async function contarRegistros(admin: Cliente, alvo: { id: number; auth_uid: string }) {
  let total = 0
  const consultas = [
    ...POR_PERFIL.map(([tabela, coluna]) => admin.from(tabela).select('*', { count: 'exact', head: true }).eq(coluna, alvo.id)),
    ...POR_LOGIN.map((tabela) => admin.from(tabela).select('*', { count: 'exact', head: true }).eq('created_by', alvo.auth_uid)),
  ]
  for (const consulta of await Promise.all(consultas)) {
    if (consulta.error) throw consulta.error
    total += consulta.count || 0
  }
  return total
}

async function excluir(admin: Cliente, alvo: { id: number; auth_uid: string; nome: string; role: string; ativo: boolean }, confirmaNome: string) {
  if (confirmaNome.trim() !== alvo.nome.trim()) throw new Recusa('O nome digitado não confere com o da pessoa. Nada foi excluído.')
  await garantirOutroAdministrador(admin, alvo)
  const registros = await contarRegistros(admin, alvo)
  if (registros > 0) {
    throw new Recusa(`${alvo.nome} tem ${registros} registro(s) lançado(s) no app. Para não perder o histórico, nada foi excluído: bloqueie a conta no lugar.`, 409)
  }
  // Bloqueia antes de apagar: a pessoa não consegue lançar nada entre a conferência e a exclusão. Se surgir registro, desfaz o bloqueio e recusa.
  if (alvo.ativo) await bloquear(admin, alvo, true)
  const depois = await contarRegistros(admin, alvo)
  if (depois > 0) {
    if (alvo.ativo) await bloquear(admin, { ...alvo, role: 'Planejamento' }, false)
    throw new Recusa(`${alvo.nome} acabou de lançar ${depois} registro(s). Nada foi excluído: bloqueie a conta no lugar.`, 409)
  }
  const { error: e1 } = await admin.from('obra_membros').delete().eq('profile_id', alvo.id)
  if (e1) throw e1
  const { error: e2 } = await admin.from('profiles').delete().eq('id', alvo.id)
  if (e2) throw e2
  const { error: e3 } = await admin.auth.admin.deleteUser(alvo.auth_uid)
  if (e3) {
    console.error('admin-usuarios: perfil apagado, mas o login não', e3)
    throw new Recusa('O perfil foi apagado, mas o login não saiu por completo. Tente excluir de novo; se persistir, apague o e-mail em Authentication > Users no Supabase.', 500)
  }
  return { ok: true }
}
