// CAMADA DE DADOS: única porta de entrada dos dados. Nenhuma tela chama o Supabase direto.
// Quem decide o que cada perfil enxerga é a RLS do banco (supabase/migrations); aqui só se escolhe
// a view certa para Cliente e Engenharia, que leem menos colunas que os outros.
//
// APP MULTI-OBRA: tudo que é lançamento (frentes, diário, fotos, medições, restrições)
// sai daqui já recortado por UMA obra. Nenhuma tela recebe dado de duas obras juntas.
import { supabase } from './supabase.js'
import { diarios as diariosDeExemplo, materiaisCatalogo, pedidos as pedidosDeExemplo, pendenciasDeExemplo, planejamentoCompleto,
  modelosFvs as modelosFvsDeExemplo, vistoriasDeExemplo, ncsDeExemplo, gembaDeExemplo } from './mockData.js'
import { acrescentarObservacao, aplicarMudanca, errosMudanca, novaPendencia, proximoNumero } from './qualidade.js'
import {
  aplicarAtividade, aplicarRestricao, arquivarAtividade, calendarioPadrao, reprogramarRestricao, resolverRestricao,
  restricoesDaImportacao, baselineDaImportacao, criarBaseline,
} from './planejamento.js'
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

// Medições de empreiteiros: contratos, itens do escopo e boletins, sempre de UMA obra (obra_id + RLS por obra).
// As regras de dinheiro (100%, numeração, ordem das colunas) são conferidas aqui E nos gatilhos do banco;
// o banco escreve as recusas em português (código P0001) e a tela mostra o texto como veio.
const bloqueioDeRegra = (texto) => Object.assign(new Error(texto), { regra: true })
const deErroDoBanco = (error) => (error.code === 'P0001' ? bloqueioDeRegra(error.message) : error)

const doContrato = (r) => ({
  id: r.id, obraId: r.obra_id, empreiteiro: r.empreiteiro, descricao: r.descricao, status: r.status,
  modo: r.modo, valorTotal: r.valor_total === null ? null : Number(r.valor_total), criadoEm: r.criado_em,
})
const doItem = (r) => ({
  id: r.id, contratoId: r.contrato_id, descricao: r.descricao, unidade: r.unidade,
  quantidade: Number(r.quantidade), precoUnitario: Number(r.preco_unitario),
})
const doBoletim = (r) => ({
  id: r.id, contratoId: r.contrato_id, numero: r.numero, data: r.data, valor: Number(r.valor),
  linhas: r.linhas.map((l) => ({ itemId: l.itemId, quantidade: Number(l.quantidade) })),
})

// O Supabase devolve no máximo 1000 linhas por consulta e não avisa quando corta: lê em páginas até acabar.
// (Boletim cortado em silêncio distorceria o % medido.) `consulta()` monta a consulta de novo a cada página.
async function lerTudo(consulta) {
  const POR_PAGINA = 1000
  const tudo = []
  for (let de = 0; ; de += POR_PAGINA) {
    const pagina = await ler(consulta().range(de, de + POR_PAGINA - 1))
    tudo.push(...pagina)
    if (pagina.length < POR_PAGINA) return tudo
  }
}

// Devolve contratos da obra + os itens e boletins deles.
export async function listarContratos(obra) {
  try {
    const [contratos, itens, boletins] = await Promise.all([
      lerTudo(() => supabase.from('contratos_empreiteiro').select('*').eq('obra_id', obra.id).order('id')),
      lerTudo(() => supabase.from('itens_contrato').select('*').eq('obra_id', obra.id).order('id')),
      lerTudo(() => supabase.from('boletins_empreiteiro').select('*').eq('obra_id', obra.id).order('id')),
    ])
    return { data: { contratos: contratos.map(doContrato), itens: itens.map(doItem), medicoes: boletins.map(doBoletim) }, erro: null }
  } catch (erro) {
    return { data: null, erro }
  }
}

// `hoje` vem do app (fuso de Brasília): o `current_date` do banco é UTC e viraria o dia seguinte depois das 21h.
export async function criarContrato(obra, campos, hoje) {
  const { data, error } = await supabase.from('contratos_empreiteiro')
    .insert({ obra_id: obra.id, empreiteiro: campos.empreiteiro.trim(), descricao: campos.descricao.trim(), criado_em: hoje })
    .select('*').single()
  return error ? { data: null, erro: deErroDoBanco(error) } : { data: doContrato(data), erro: null }
}

// Move uma coluna. Ao ativar, `cadastro` ({ modo, valorTotal, itens }) vai por uma função do banco que troca os itens,
// grava o valor e muda o status numa transação só (ou tudo, ou nada).
export async function moverContrato(obra, id, status, cadastro) {
  // A função de ativação não recebe a obra: confere aqui que o contrato é DESTA obra antes de mexer nele.
  const { data: doDestaObra, error: erroConferencia } = await supabase.from('contratos_empreiteiro').select('id').eq('id', id).eq('obra_id', obra.id)
  if (erroConferencia || !doDestaObra?.length) return { data: null, erro: erroConferencia || new Error('contrato não encontrado nesta obra') }
  const { error } = cadastro
    ? await supabase.rpc('ativar_contrato_empreiteiro', { p_contrato: id, p_modo: cadastro.modo, p_valor: cadastro.valorTotal, p_itens: cadastro.itens })
    : await supabase.from('contratos_empreiteiro').update({ status }).eq('id', id).eq('obra_id', obra.id)
  if (error) return { data: null, erro: deErroDoBanco(error) }
  try {
    const [contrato, itens] = await Promise.all([
      ler(supabase.from('contratos_empreiteiro').select('*').eq('id', id).eq('obra_id', obra.id).single()),
      ler(supabase.from('itens_contrato').select('*').eq('contrato_id', id).order('id')),
    ])
    // Sem permissão o UPDATE não dá erro: só não muda nada. Conferir o status evita um "movido" falso.
    if (contrato.status !== status) return { data: null, erro: new Error('sem permissão para mover o contrato') }
    return { data: { contrato: doContrato(contrato), itens: itens.map(doItem) }, erro: null }
  } catch (erro) {
    return { data: null, erro }
  }
}

// Lança um boletim. O número é do banco (o 1 abaixo só preenche a coluna obrigatória) e o banco recusa passar de 100%.
export async function criarMedicao(obra, contratoId, boletim) {
  const { data, error } = await supabase.from('boletins_empreiteiro')
    .insert({ obra_id: obra.id, contrato_id: contratoId, numero: 1, data: boletim.data, valor: boletim.valor, linhas: boletim.linhas })
    .select('*').single()
  return error ? { data: null, erro: deErroDoBanco(error) } : { data: doBoletim(data), erro: null }
}

// PLANEJAMENTO (Last Planner): também em memória. Uma lista de atividades por obra, compartilhada por todas as abas
// (EAP, longo, médio e curto prazo). Toda gravação devolve a foto nova da obra: a tela só troca o estado.
// ponytail: trocar pelo Supabase (atividades e restrições com obra_id e RLS por obra); só o miolo destas funções muda.
const planejamentoEmMemoria = new Map()

function doPlanejamento(obra) {
  if (!planejamentoEmMemoria.has(obra.codigo)) {
    const exemplo = planejamentoCompleto[obra.codigo] || { atividades: [], restricoes: [] }
    planejamentoEmMemoria.set(obra.codigo, { calendario: calendarioPadrao(), baseline: null, ...structuredClone(exemplo) })
  }
  return planejamentoEmMemoria.get(obra.codigo)
}
const fotoDoPlanejamento = (obra) => structuredClone(doPlanejamento(obra))
const gravarPlanejamento = (obra, mudanca) => {
  Object.assign(doPlanejamento(obra), mudanca)
  return { data: fotoDoPlanejamento(obra), erro: null }
}

export async function listarPlanejamento(obra) {
  return { data: fotoDoPlanejamento(obra), erro: null }
}

// `id` vazio cria; com `id` edita. Dados de entrada já validados pela tela com `errosAtividade`.
export async function salvarAtividade(obra, campos, id) {
  const base = doPlanejamento(obra)
  const proximoId = Math.max(0, ...base.atividades.map((a) => a.id)) + 1
  return gravarPlanejamento(obra, { atividades: aplicarAtividade(base.atividades, campos, id, proximoId) })
}

export async function arquivarAtividadeDaObra(obra, id, arquivada) {
  const base = doPlanejamento(obra)
  if (!base.atividades.some((a) => a.id === id)) return { data: null, erro: new Error('atividade não encontrada') }
  return gravarPlanejamento(obra, { atividades: arquivarAtividade(base.atividades, id, arquivada) })
}

// Importação de planilha: recebe a lista final já montada e o modo ('adicionar' ou 'substituir').
export async function importarAtividades(obra, atividades, modo) {
  const base = doPlanejamento(obra)
  return gravarPlanejamento(obra, {
    atividades, restricoes: restricoesDaImportacao(base.restricoes || [], modo), baseline: baselineDaImportacao(base.baseline, modo),
  })
}

// Linha de base: congela as datas planejadas de agora. Salvar de novo substitui a anterior (a tela confirma antes).
export async function salvarBaseline(obra, hoje) {
  const base = doPlanejamento(obra)
  return gravarPlanejamento(obra, { baseline: criarBaseline(base.atividades, hoje) })
}

// Restrições do lookahead (médio prazo). Sempre da obra informada.
export async function salvarRestricao(obra, campos, id) {
  const base = doPlanejamento(obra)
  const restricoes = base.restricoes || []
  const proximoId = Math.max(0, ...restricoes.map((r) => r.id)) + 1
  return gravarPlanejamento(obra, { restricoes: aplicarRestricao(restricoes, campos, id, proximoId) })
}

export async function resolverRestricaoDaObra(obra, id, resolvida, hoje) {
  const base = doPlanejamento(obra)
  return gravarPlanejamento(obra, { restricoes: resolverRestricao(base.restricoes || [], id, resolvida, hoje) })
}

export async function reprogramarRestricaoDaObra(obra, id, prazo) {
  const base = doPlanejamento(obra)
  return gravarPlanejamento(obra, { restricoes: reprogramarRestricao(base.restricoes || [], id, prazo) })
}

// Troca uma atividade (mesmo id) já calculada pelas regras de lib/planejamento.js: mover de coluna, subtarefas, progresso.
export async function substituirAtividade(obra, atividade) {
  const base = doPlanejamento(obra)
  if (!base.atividades.some((a) => a.id === atividade.id)) return { data: null, erro: new Error('atividade não encontrada') }
  return gravarPlanejamento(obra, { atividades: base.atividades.map((a) => (a.id === atividade.id ? atividade : a)) })
}

export async function salvarCalendario(obra, calendario) {
  return gravarPlanejamento(obra, { calendario })
}

// QUALIDADE: também em memória (volta ao exemplo ao recarregar). Sempre recortado por UMA obra.
// ponytail: trocar pelo Supabase (tabelas com obra_id e RLS por obra; numeroRegistro vira sequência por obra).
const pendenciasEmMemoria = pendenciasDeExemplo.map((p) => ({ ...p }))
const daObraQ = (lista, obra) => lista.filter((x) => x.obraCodigo === obra.codigo)

export async function listarPendencias(obra) {
  return { data: daObraQ(pendenciasEmMemoria, obra).map((p) => ({ ...p })), erro: null }
}

export async function criarPendencia(obra, campos, usuarioNome) {
  const registro = novaPendencia(campos, {
    id: Math.max(0, ...pendenciasEmMemoria.map((p) => p.id)) + 1,
    obraCodigo: obra.codigo,
    numeroRegistro: proximoNumero(daObraQ(pendenciasEmMemoria, obra)),
  }, usuarioNome)
  pendenciasEmMemoria.push(registro)
  return { data: { ...registro }, erro: null }
}

// Só mexe em pendência da obra informada.
const acharPendencia = (obra, id) => pendenciasEmMemoria.findIndex((p) => p.id === id && p.obraCodigo === obra.codigo)

export async function mudarStatusPendencia(obra, id, para, dados, hoje) {
  const i = acharPendencia(obra, id)
  if (i < 0) return { data: null, erro: new Error('pendência não encontrada') }
  const recusa = errosMudanca(pendenciasEmMemoria[i], para, dados)
  if (recusa) return { data: null, erro: bloqueioDeRegra(recusa) }
  pendenciasEmMemoria[i] = aplicarMudanca(pendenciasEmMemoria[i], para, dados, hoje)
  return { data: { ...pendenciasEmMemoria[i] }, erro: null }
}

export async function adicionarObservacaoPendencia(obra, id, texto, agora) {
  const i = acharPendencia(obra, id)
  if (i < 0) return { data: null, erro: new Error('pendência não encontrada') }
  pendenciasEmMemoria[i] = { ...pendenciasEmMemoria[i], observacoes: acrescentarObservacao(pendenciasEmMemoria[i].observacoes, texto, agora) }
  return { data: { ...pendenciasEmMemoria[i] }, erro: null }
}

export async function excluirPendencia(obra, id) {
  const i = acharPendencia(obra, id)
  if (i < 0) return { data: null, erro: new Error('pendência não encontrada') }
  pendenciasEmMemoria.splice(i, 1)
  return { data: true, erro: null }
}

// QUALIDADE — FVS: modelos (da empresa toda), vistorias e não conformidades (de uma obra só). Em memória, como o resto do módulo.
// A tela monta o registro inteiro (ids e códigos incluídos) e a camada só guarda: com o banco, ela passa a numerar.
// ponytail: trocar pelo Supabase (modelos globais; vistorias e NCs com obra_id, RLS por obra e a gravação da NC numa função só).
const modelosEmMemoria = structuredClone(modelosFvsDeExemplo)
const vistoriasEmMemoria = structuredClone(vistoriasDeExemplo)
const ncsEmMemoria = structuredClone(ncsDeExemplo)

const guardar = (lista, registro) => {
  const i = lista.findIndex((x) => x.id === registro.id)
  if (i < 0) lista.push(structuredClone(registro))
  else lista[i] = structuredClone(registro)
}
// Só aceita registro da obra informada: nunca grava dado de outra obra.
const daObraOuErro = (obra, ...registros) =>
  registros.every((r) => r.obraCodigo === obra.codigo) ? null : { data: null, erro: new Error('registro de outra obra') }

export async function listarModelosFvs() {
  return { data: structuredClone(modelosEmMemoria), erro: null }
}
export async function salvarModeloFvs(modelo) {
  guardar(modelosEmMemoria, modelo)
  return { data: structuredClone(modelo), erro: null }
}
export async function excluirModeloFvs(id) {
  const i = modelosEmMemoria.findIndex((m) => m.id === id)
  if (i < 0) return { data: null, erro: new Error('modelo não encontrado') }
  modelosEmMemoria.splice(i, 1)
  return { data: true, erro: null }
}

export async function listarVistorias(obra) {
  return { data: structuredClone(daObraQ(vistoriasEmMemoria, obra)), erro: null }
}
export async function listarNcs(obra) {
  return { data: structuredClone(daObraQ(ncsEmMemoria, obra)), erro: null }
}
export async function salvarVistoria(obra, vistoria) {
  const recusa = daObraOuErro(obra, vistoria)
  if (recusa) return recusa
  guardar(vistoriasEmMemoria, vistoria)
  return { data: structuredClone(vistoria), erro: null }
}
export async function salvarNc(obra, nc) {
  const recusa = daObraOuErro(obra, nc)
  if (recusa) return recusa
  guardar(ncsEmMemoria, nc)
  return { data: structuredClone(nc), erro: null }
}
// Marcar NC no item grava a NC e a resposta da vistoria juntas (ou nenhuma das duas).
export async function registrarNc(obra, vistoria, nc) {
  const recusa = daObraOuErro(obra, vistoria, nc)
  if (recusa) return recusa
  guardar(ncsEmMemoria, nc)
  guardar(vistoriasEmMemoria, vistoria)
  return { data: { vistoria: structuredClone(vistoria), nc: structuredClone(nc) }, erro: null }
}

// QUALIDADE — Gemba Walk: observações de desperdício de UMA obra. Em memória; a tela monta o registro inteiro.
// ponytail: trocar pelo Supabase (tabela com obra_id, RLS por obra e desperdicios como lista com CHECK nos 7 nomes).
const gembaEmMemoria = structuredClone(gembaDeExemplo)

export async function listarGemba(obra) {
  return { data: structuredClone(daObraQ(gembaEmMemoria, obra)), erro: null }
}
export async function salvarGemba(obra, observacao) {
  const recusa = daObraOuErro(obra, observacao)
  if (recusa) return recusa
  guardar(gembaEmMemoria, observacao)
  return { data: structuredClone(observacao), erro: null }
}
export async function excluirGemba(obra, id) {
  const i = gembaEmMemoria.findIndex((o) => o.id === id && o.obraCodigo === obra.codigo)
  if (i < 0) return { data: null, erro: new Error('observação não encontrada') }
  gembaEmMemoria.splice(i, 1)
  return { data: true, erro: null }
}

// RELATÓRIOS (BI da obra): só lê. Junta o que cada módulo já tem, sempre de UMA obra, pela mesma porta dos demais.
// Cada módulo é lido à parte: se um falhar, os outros painéis continuam e o nome dele vai em `falhas`.
// Módulo que não existe ou está vazio chega como lista vazia: o BI mostra "Painel bloqueado", nunca quebra.
export async function carregarRelatorio(obra) {
  const fontes = {
    atividades: [], calendario: null, baseline: null, rdo: [], pedidos: [], catalogo: [],
    contratos: [], itensContrato: [], boletins: [], pendencias: [], vistorias: [], ncs: [], gemba: [],
  }
  const falhas = []
  const lerUm = async (nome, pedir, aplicar) => {
    try {
      const { data, erro } = await pedir()
      if (erro || !data) throw erro || new Error('sem retorno')
      aplicar(data)
    } catch (_) {
      falhas.push(nome)
    }
  }
  await Promise.all([
    lerUm('Planejamento', () => listarPlanejamento(obra), (d) => Object.assign(fontes, { atividades: d.atividades, calendario: d.calendario, baseline: d.baseline })),
    lerUm('Diário de Obra', () => listarRdo(obra), (d) => { fontes.rdo = d }),
    lerUm('Materiais', async () => {
      const [p, c] = await Promise.all([listarPedidos(obra), listarCatalogo()])
      return { data: p.data && c.data ? { pedidos: p.data, catalogo: c.data } : null, erro: p.erro || c.erro }
    }, (d) => Object.assign(fontes, d)),
    lerUm('Contratos e Medições', () => listarContratos(obra), (d) => Object.assign(fontes, { contratos: d.contratos, itensContrato: d.itens, boletins: d.medicoes })),
    lerUm('Pendências', () => listarPendencias(obra), (d) => { fontes.pendencias = d }),
    lerUm('FVS', async () => {
      const [v, n] = await Promise.all([listarVistorias(obra), listarNcs(obra)])
      return { data: v.data && n.data ? { vistorias: v.data, ncs: n.data } : null, erro: v.erro || n.erro }
    }, (d) => Object.assign(fontes, d)),
    lerUm('Gemba Walk', () => listarGemba(obra), (d) => { fontes.gemba = d }),
  ])
  return { data: { ...fontes, falhas }, erro: null }
}
