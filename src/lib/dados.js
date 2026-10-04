// CAMADA DE DADOS: única porta de entrada dos dados. Nenhuma tela chama o Supabase direto.
// Quem decide o que cada perfil enxerga é a RLS do banco (supabase/migrations); aqui só se escolhe
// a view certa para Cliente e Engenharia, que leem menos colunas que os outros.
//
// APP MULTI-OBRA: tudo que é lançamento (frentes, diário, fotos, medições, restrições)
// sai daqui já recortado por UMA obra. Nenhuma tela recebe dado de duas obras juntas.
import { supabase } from './supabase.js'
import { diarios as diariosDeExemplo, materiaisCatalogo, pedidos as pedidosDeExemplo } from './mockData.js'
import { aplicarMovimento, caminhoDaFoto, hojeEmBrasilia, legendaDaFoto, novoPedido, veTodasAsObras } from './regras.js'

const MENSAGENS = {
  'Invalid login credentials': 'Email ou senha incorretos.',
  'Email not confirmed': 'Confirme seu email pelo link que enviamos e entre de novo.',
  'User already registered': 'Já existe uma conta com este email.',
}
const traduzir = (erro) => MENSAGENS[erro.message] || 'Não consegui concluir. Tente de novo.'

export async function entrar(email, senha) {
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
  return error ? traduzir(error) : null
}

// Conta nova nasce `Pendente` (gatilho do banco). `confirmar` = o Supabase mandou email de confirmação.
export async function cadastrar(nome, email, senha) {
  const { data, error } = await supabase.auth.signUp({ email, password: senha, options: { data: { nome } } })
  if (error) return { erro: traduzir(error), confirmar: false }
  return { erro: null, confirmar: !data.session }
}

export const sair = () => supabase.auth.signOut()

// Escuta entrar/sair e devolve a função que para de escutar.
export function aoMudarSessao(aviso) {
  const { data } = supabase.auth.onAuthStateChange((_evento, sessao) => aviso(sessao))
  return () => data.subscription.unsubscribe()
}

// Perfil de quem está logado (null: sem sessão, ou conta desativada, que a RLS esconde).
export async function perfilDaSessao() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const { data } = await supabase.from('profiles').select('*').eq('auth_uid', session.user.id).maybeSingle()
  return data
}

const ler = async (consulta) => {
  const { data, error } = await consulta
  if (error) throw error
  return data
}

// Tudo o que as telas precisam para a obra escolhida.
// `obraPedida` pode ser null ou de uma obra que a pessoa não enxerga: cai na primeira que ela vê.
export async function carregarBase(usuario, obraPedida) {
  const { role } = usuario
  const hoje = hojeEmBrasilia()
  const vazio = {
    hoje, obras: [], obra: null, frentes: [], apontamentos: [], fotos: [],
    medicoes: [], restricoes: [], perfis: [], membros: [], virada: null,
  }
  if (role === 'Pendente' || !usuario.ativo) return { data: vazio, erro: null }

  try {
    const obras = await ler(supabase.from('obras').select('*').order('codigo'))
    const obra = obras.find((o) => o.id === obraPedida) || obras[0] || null
    if (!obra) return { data: { ...vazio, obras }, erro: null }

    const daObra = (tabela) => supabase.from(tabela).select('*').eq('obra_id', obra.id)
    const [frentes, apontamentos, fotos, medicoes, restricoes, perfis, membros, virada] = await Promise.all([
      ler(daObra(role === 'Cliente' ? 'frentes_cliente' : 'frentes')),
      ler(daObra(role === 'Engenharia' ? 'apontamentos_sem_efetivo' : 'apontamentos')),
      // ponytail: um link assinado por foto, todas de uma vez. Se a obra passar de algumas centenas de fotos, paginar.
      ler(daObra('fotos')).then(comLinks),
      ler(daObra(role === 'Cliente' ? 'medicoes_cliente' : 'medicoes')),
      ler(daObra('restricoes')),
      // Pessoas e vínculos são cadastro (tela de Administração), não lançamento de obra.
      ler(supabase.from(role === 'Coordenador' || role === 'Administrador' ? 'profiles' : 'perfis_colegas').select('*')),
      veTodasAsObras(role) ? ler(supabase.from('obra_membros').select('*')) : [],
      supabase.rpc('virada_estado').then(({ data }) => data?.[0] ?? null),
    ])
    return { data: { hoje, obras, obra, frentes, apontamentos, fotos, medicoes, restricoes, perfis, membros, virada }, erro: null }
  } catch (erro) {
    return { data: null, erro }
  }
}

// Fotos ficam em bucket privado: a tela precisa de um link assinado (1 hora) para mostrar cada uma.
// Foto sem arquivo (dado de exemplo) ou sem permissão fica com `link: null` e a tela mostra o ícone.
async function comLinks(fotos) {
  const caminhos = fotos.map((f) => f.url).filter(Boolean)
  if (!caminhos.length) return fotos.map((f) => ({ ...f, link: null }))
  const { data } = await supabase.storage.from('fotos').createSignedUrls(caminhos, 3600)
  const links = new Map((data || []).map((d) => [d.path, d.signedUrl]))
  return fotos.map((f) => ({ ...f, link: links.get(f.url) || null }))
}

// Sobe cada foto do lançamento (já comprimida na tela) e grava a linha que a liga ao dia e à frente.
// Devolve as que falharam, para a tela deixá-las no formulário: o lançamento já está salvo e não é desfeito.
// ponytail: se o arquivo sobe e a linha falha, o arquivo fica órfão (só o Coordenador apaga no Storage);
// limpar com uma rotina no banco se isso aparecer no uso.
async function enviarFotos(usuario, frente, apontamentoId, data, arquivos) {
  const falharam = []
  for (const arquivo of arquivos) {
    const caminho = caminhoDaFoto(frente.obra_id, frente.id, `${crypto.randomUUID()}.jpg`)
    const subiu = await supabase.storage.from('fotos').upload(caminho, arquivo, { contentType: 'image/jpeg' })
    if (subiu.error) { falharam.push(arquivo); continue }
    const { error } = await supabase.from('fotos').insert({
      obra_id: frente.obra_id, frente_id: frente.id, apontamento_id: apontamentoId, url: caminho,
      legenda: legendaDaFoto(frente, data), autor_id: usuario.id, tirada_em: new Date().toISOString(),
    })
    if (error) falharam.push(arquivo)
  }
  return falharam
}

// Diário: grava (ou corrige, no mesmo dia) o lançamento de uma frente. Os gatilhos do banco calculam
// "houve avanço" e atualizam a frente na mesma transação; falhou, nada fica pela metade.
// Devolve { erro, fotosFalharam }: `erro` é null se o lançamento foi salvo, ou o texto do erro;
// `fotosFalharam` são os arquivos que não subiram.
export async function salvarLancamento(usuario, frente, data, campos, existente) {
  const dados = {
    percentual_acumulado: campos.acumulado,
    efetivo_qtd: campos.efetivo,
    motivo_sem_avanco: campos.motivo || null,
    equipamentos: campos.equipamentos.trim() || null,
    observacao: campos.observacao.trim() || null,
  }
  const consulta = existente
    ? supabase.from('apontamentos').update(dados).eq('id', existente.id)
    : supabase.from('apontamentos').insert({ ...dados, obra_id: frente.obra_id, frente_id: frente.id, data, autor_id: usuario.id })
  const { data: gravado, error } = await consulta.select('id')
  const recusa = (erro) => ({ erro, fotosFalharam: [] })
  if (error?.code === '23505') return recusa('Esta frente já tem lançamento hoje, de outra pessoa.')
  // O banco escreve esta mensagem em português, para a pessoa ler.
  if (error?.message?.startsWith('O acumulado não pode')) return recusa(error.message)
  // Sem erro e sem linha: a RLS recusou (por exemplo, edição de um lançamento que não é de hoje).
  if (error || !gravado?.length) return recusa('Não consegui salvar. Tente de novo.')
  const fotosFalharam = await enviarFotos(usuario, frente, gravado[0].id, data, campos.fotos || [])
  return { erro: null, fotosFalharam }
}

// Coordenador pede para a atualização diária das frentes rodar de novo.
export async function rodarAtualizacaoDasFrentes() {
  const { error } = await supabase.rpc('rodar_virada')
  return error ? 'Não consegui rodar a atualização. Tente de novo.' : null
}

// Diário de Obra (RDO): ainda sem banco. Lê e grava numa lista em memória, que volta ao exemplo
// ao recarregar a página. Quando a tabela existir, só o miolo destas duas funções muda.
// ponytail: trocar pelo Supabase, com tabela nova e RLS por obra, como as demais.
const rdoEmMemoria = [...diariosDeExemplo]

export async function listarRdo(obra) {
  return { data: rdoEmMemoria.filter((r) => r.obraCodigo === obra.codigo), erro: null }
}

export async function salvarRdo(obra, campos) {
  const registro = { ...campos, id: Math.max(0, ...rdoEmMemoria.map((r) => r.id)) + 1, obraCodigo: obra.codigo }
  rdoEmMemoria.unshift(registro)
  return { data: registro, erro: null }
}

// Materiais (Kanban de pedidos): também em memória, como o RDO. Sempre recortado por UMA obra.
// ponytail: trocar pelo Supabase (catálogo global; pedidos com obra_id e RLS por obra).
const pedidosEmMemoria = pedidosDeExemplo.map((p) => ({ ...p }))

export async function listarCatalogo() {
  return { data: materiaisCatalogo, erro: null }
}

export async function listarPedidos(obra) {
  return { data: pedidosEmMemoria.filter((p) => p.obraCodigo === obra.codigo).map((p) => ({ ...p })), erro: null }
}

export async function criarPedido(obra, campos, hoje) {
  const id = Math.max(0, ...pedidosEmMemoria.map((p) => p.id)) + 1
  const pedido = novoPedido({ ...campos, id, obraCodigo: obra.codigo }, hoje)
  pedidosEmMemoria.push(pedido)
  return { data: { ...pedido }, erro: null }
}

// O pedido só é movido se for da obra informada: nunca mexe em pedido de outra obra.
export async function moverPedido(obra, id, status, dados, hoje) {
  const i = pedidosEmMemoria.findIndex((p) => p.id === id && p.obraCodigo === obra.codigo)
  if (i < 0) return { data: null, erro: new Error('pedido não encontrado') }
  pedidosEmMemoria[i] = aplicarMovimento(pedidosEmMemoria[i], status, dados, hoje)
  return { data: { ...pedidosEmMemoria[i] }, erro: null }
}
