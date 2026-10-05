// CAMADA DE DADOS: única porta de entrada dos dados. Nenhuma tela chama o Supabase direto.
// Quem decide o que cada perfil enxerga é a RLS do banco (supabase/migrations); aqui só se escolhe
// a view certa para Cliente e Engenharia, que leem menos colunas que os outros.
//
// APP MULTI-OBRA: tudo que é lançamento (frentes, diário, fotos, medições, restrições)
// sai daqui já recortado por UMA obra. Nenhuma tela recebe dado de duas obras juntas.
import { supabase } from './supabase.js'
import { comprimirFoto } from '../components/comprimirFoto.js'
import { acrescentarObservacao, aplicarMudanca, errosMudanca, novaPendencia } from './qualidade.js'
import {
  aplicarAtividade, aplicarRestricao, arquivarAtividade, calendarioPadrao, reprogramarRestricao, resolverRestricao,
  restricoesDaImportacao, baselineDaImportacao, criarBaseline,
} from './planejamento.js'
import { lerNumero, primeiroDiaDoMes } from './cadastros.js'
import { aplicarMovimento, caminhoDaFoto, hojeEmBrasilia, legendaDaFoto, novoPedido, veTodasAsObras } from './regras.js'

const MENSAGENS = {
  'Invalid login credentials': 'Email ou senha incorretos.',
  'Email not confirmed': 'Confirme seu email pelo link que enviamos e entre de novo.',
  'User already registered': 'Já existe uma conta com este email.',
  'User is banned': 'Conta bloqueada. Fale com o administrador.',
}
const traduzir = (erro) => MENSAGENS[erro.message] || 'Não consegui concluir. Tente de novo.'

export async function entrar(email, senha) {
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
  return error ? traduzir(error) : null
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

// FOTOS de módulos sem frente (Diário de Obra, nota fiscal): comprime no navegador (JPEG 0,8, até 1200 px) e sobe para
// <obra>/<módulo>/ no bucket privado `fotos`. Devolve o CAMINHO, que a tabela guarda; o link assinado sai na leitura.
export async function uploadFoto(arquivo, obraId, modulo) {
  const blob = await comprimirFoto(arquivo)
  const caminho = `${obraId}/${modulo}/${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage.from('fotos').upload(caminho, blob, { contentType: 'image/jpeg' })
  if (error) throw error
  return caminho
}

// Sobe várias; as que falham não impedem as outras nem o registro (a tela avisa quantas ficaram de fora).
async function subirFotos(arquivos, obraId, modulo) {
  const caminhos = []
  let falharam = 0
  for (const arquivo of arquivos || []) {
    try { caminhos.push(await uploadFoto(arquivo, obraId, modulo)) } catch (_) { falharam += 1 }
  }
  return { caminhos, falharam }
}

// Link assinado -> caminho do arquivo (o inverso do que a leitura devolve), para regravar um registro sem perder a foto.
const linkParaCaminho = new Map()

// Caminho -> link assinado de 1 hora (Map). Caminho que não abre fica de fora: a tela mostra sem a imagem.
async function linksDeCaminhos(caminhos) {
  const lista = [...new Set(caminhos.filter(Boolean))]
  if (!lista.length) return new Map()
  const { data } = await supabase.storage.from('fotos').createSignedUrls(lista, 3600)
  for (const d of data || []) linkParaCaminho.set(d.signedUrl, d.path)
  return new Map((data || []).map((d) => [d.path, d.signedUrl]))
}

// Diário de Obra (RDO): uma linha por dia de obra, com as fotos como caminhos do Storage.
const doRdo = (r, links) => ({
  id: r.id, obraId: r.obra_id, data: r.data, clima: r.clima, efetivo: r.efetivo, atividades: r.atividades,
  ocorrencias: r.ocorrencias, fotos: r.fotos.map((c) => links.get(c)).filter(Boolean),
})

export async function listarRdo(obra) {
  try {
    const linhas = await lerTudo(() => supabase.from('rdo_registros').select('*').eq('obra_id', obra.id).order('data', { ascending: false }).order('id', { ascending: false }))
    const links = await linksDeCaminhos(linhas.flatMap((r) => r.fotos))
    return { data: linhas.map((r) => doRdo(r, links)), erro: null }
  } catch (erro) {
    return { data: null, erro }
  }
}

// `campos.arquivos` são as fotos escolhidas. Foto que falha não perde o registro: devolve `fotosFalharam`.
export async function salvarRdo(obra, campos) {
  const { caminhos, falharam } = await subirFotos(campos.arquivos, obra.id, 'rdo')
  const { data, error } = await supabase.from('rdo_registros').insert({
    obra_id: obra.id, data: campos.data, clima: campos.clima, efetivo: campos.efetivo,
    atividades: campos.atividades, ocorrencias: campos.ocorrencias, fotos: caminhos,
  }).select('*').single()
  if (error) return { data: null, erro: deErroDoBanco(error), fotosFalharam: 0 }
  return { data: doRdo(data, await linksDeCaminhos(caminhos)), erro: null, fotosFalharam: falharam }
}

// Materiais: catálogo da empresa (global) e pedidos por obra (Kanban). A foto da nota fiscal fica em recebimento.fotoNF.
const doPedido = (r, links) => ({
  id: r.id, obraId: r.obra_id, materialId: r.material_id, quantidade: Number(r.quantidade), frente: r.frente, prioridade: r.prioridade,
  status: r.status, fornecedor: r.fornecedor, previsaoEntrega: r.previsao_entrega || '', historico: r.historico,
  recebimento: { ...r.recebimento, fotoNF: links.get(r.recebimento.fotoNF) || '' },
})

export async function listarCatalogo() {
  try {
    const linhas = await lerTudo(() => supabase.from('materiais_catalogo').select('*').order('id'))
    return { data: linhas.map((m) => ({ id: m.id, nome: m.nome, unidade: m.unidade, categoria: m.categoria })), erro: null }
  } catch (erro) {
    return { data: null, erro }
  }
}

export async function listarPedidos(obra) {
  try {
    const linhas = await lerTudo(() => supabase.from('pedidos_material').select('*').eq('obra_id', obra.id).order('id'))
    const links = await linksDeCaminhos(linhas.map((p) => p.recebimento?.fotoNF))
    return { data: linhas.map((p) => doPedido(p, links)), erro: null }
  } catch (erro) {
    return { data: null, erro }
  }
}

export async function criarPedido(obra, campos, hoje) {
  const base = novoPedido({ ...campos, id: 0, obraCodigo: obra.codigo }, hoje)
  const { data, error } = await supabase.from('pedidos_material').insert({
    obra_id: obra.id, material_id: base.materialId, quantidade: base.quantidade, frente: base.frente, prioridade: base.prioridade,
    status: base.status, historico: base.historico, recebimento: base.recebimento,
  }).select('*').single()
  return error ? { data: null, erro: deErroDoBanco(error) } : { data: doPedido(data, new Map()), erro: null }
}

// O pedido só é movido se for da obra informada. A regra do movimento (`aplicarMovimento`) roda sobre a linha do banco,
// não sobre o que a tela mostra: a tela tem links assinados e prévias, o banco guarda o caminho do arquivo.
export async function moverPedido(obra, id, status, dados, hoje) {
  const { data: linha, error: erroLeitura } = await supabase.from('pedidos_material').select('*').eq('id', id).eq('obra_id', obra.id).maybeSingle()
  if (erroLeitura || !linha) return { data: null, erro: erroLeitura || new Error('pedido não encontrado'), fotoFalhou: false }
  const atual = { status: linha.status, frente: linha.frente, fornecedor: linha.fornecedor, previsaoEntrega: linha.previsao_entrega || '', historico: linha.historico, recebimento: linha.recebimento }
  const { caminhos, falharam } = await subirFotos(dados.arquivoNF ? [dados.arquivoNF] : [], obra.id, 'materiais')
  const novo = aplicarMovimento(atual, status, { ...dados, fotoNF: caminhos[0] || '' }, hoje)
  const { data: gravado, error } = await supabase.from('pedidos_material').update({
    status: novo.status, frente: novo.frente, fornecedor: novo.fornecedor, previsao_entrega: novo.previsaoEntrega || null,
    historico: novo.historico, recebimento: novo.recebimento,
  }).eq('id', id).eq('obra_id', obra.id).select('*')
  // Sem erro e sem linha: a RLS recusou. Conferir evita um "movido" falso.
  if (error || !gravado?.length) return { data: null, erro: error || new Error('sem permissão para mover o pedido'), fotoFalhou: false }
  return { data: doPedido(gravado[0], await linksDeCaminhos([gravado[0].recebimento.fotoNF])), erro: null, fotoFalhou: falharam > 0 }
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

// PLANEJAMENTO (Last Planner) no Supabase: atividades, restrições do lookahead e a config (calendário + linha de base) por obra.
// Uma lista de atividades por obra, compartilhada por todas as abas. O id é numerado POR OBRA (chave obra_id + id).
// Cada gravação calcula a lista nova pelas regras de lib/planejamento.js, `gravarPlanejamento` grava só a diferença
// e devolve a foto nova lida do banco: a tela só troca o estado.
const daAtividade = (r) => ({
  id: r.id, titulo: r.titulo, parentId: r.parent_id, ordem: r.ordem, inicio: r.inicio, fim: r.fim, progresso: Number(r.progresso),
  status: r.status, causa: r.causa, causaDetalhe: r.causa_detalhe, concluidaEm: r.concluida_em, inicioReal: r.inicio_real, fimReal: r.fim_real,
  arquivada: r.arquivada, empresa: r.empresa, subtarefas: r.subtarefas,
})
const paraAtividade = (obra, a) => ({
  obra_id: obra.id, id: a.id, titulo: a.titulo, parent_id: a.parentId ?? null, ordem: a.ordem ?? 0, inicio: a.inicio, fim: a.fim,
  progresso: a.progresso ?? 0, status: a.status, causa: a.causa || '', causa_detalhe: a.causaDetalhe || '',
  concluida_em: a.concluidaEm || null, inicio_real: a.inicioReal || null, fim_real: a.fimReal || null,
  arquivada: !!a.arquivada, empresa: a.empresa || '', subtarefas: a.subtarefas || [],
})
const daRestricaoPlan = (r) => ({
  id: r.id, atividadeId: r.atividade_id, descricao: r.descricao, tipo: r.tipo, prazo: r.prazo, responsavel: r.responsavel, resolvida: r.resolvida,
})
const paraRestricaoPlan = (obra, r) => ({
  obra_id: obra.id, id: r.id, atividade_id: r.atividadeId, descricao: r.descricao, tipo: r.tipo, prazo: r.prazo,
  responsavel: r.responsavel, resolvida: !!r.resolvida,
})

async function lerPlanejamento(obra) {
  const [atividades, restricoes, config] = await Promise.all([
    lerTudo(() => supabase.from('atividades_planejamento').select('*').eq('obra_id', obra.id).order('id')),
    lerTudo(() => supabase.from('restricoes_planejamento').select('*').eq('obra_id', obra.id).order('id')),
    ler(supabase.from('planejamento_config').select('*').eq('obra_id', obra.id).maybeSingle()),
  ])
  return {
    atividades: atividades.map(daAtividade), restricoes: restricoes.map(daRestricaoPlan),
    baseline: config?.baseline || null, calendario: config?.calendario || calendarioPadrao(),
  }
}

const mudou = (a, b) => JSON.stringify(a) !== JSON.stringify(b)
const falhou = (error) => { if (error) throw error }

// Grava só o que mudou entre `antes` e `depois`. Ordem: atividades novas/alteradas, restrições, e só então as atividades
// removidas (as restrições que apontavam para elas já saíram).
async function gravarPlanejamento(obra, antes, mudanca) {
  try {
    const depois = { ...antes, ...mudanca }
    // Registro NOVO é INSERT (não upsert): se outra pessoa criou o mesmo número agora há pouco, o banco recusa em vez de sobrescrever.
    const gravarMudancas = async (tabela, antesLista, depoisLista, paraLinha) => {
      const mudadas = depoisLista.filter((x) => mudou(x, antesLista.find((y) => y.id === x.id)))
      const criadas = mudadas.filter((x) => !antesLista.some((y) => y.id === x.id))
      const editadas = mudadas.filter((x) => antesLista.some((y) => y.id === x.id))
      if (criadas.length) falhou((await supabase.from(tabela).insert(criadas.map((x) => paraLinha(obra, x)))).error)
      if (editadas.length) falhou((await supabase.from(tabela).upsert(editadas.map((x) => paraLinha(obra, x)))).error)
    }
    await gravarMudancas('atividades_planejamento', antes.atividades, depois.atividades, paraAtividade)
    await gravarMudancas('restricoes_planejamento', antes.restricoes, depois.restricoes, paraRestricaoPlan)
    const restFora = antes.restricoes.filter((r) => !depois.restricoes.some((x) => x.id === r.id)).map((r) => r.id)
    if (restFora.length) falhou((await supabase.from('restricoes_planejamento').delete().eq('obra_id', obra.id).in('id', restFora)).error)
    const atvFora = antes.atividades.filter((a) => !depois.atividades.some((x) => x.id === a.id)).map((a) => a.id)
    if (atvFora.length) falhou((await supabase.from('atividades_planejamento').delete().eq('obra_id', obra.id).in('id', atvFora)).error)
    if (mudou(antes.baseline, depois.baseline) || mudou(antes.calendario, depois.calendario)) {
      falhou((await supabase.from('planejamento_config').upsert({ obra_id: obra.id, calendario: depois.calendario, baseline: depois.baseline })).error)
    }
    const foto = await lerPlanejamento(obra)
    // Apagar sem permissão não dá erro: só não apaga. Conferir evita um "salvo" falso.
    if (foto.atividades.length !== depois.atividades.length || foto.restricoes.length !== depois.restricoes.length) {
      return { data: null, erro: new Error('sem permissão para apagar') }
    }
    return { data: foto, erro: null }
  } catch (erro) {
    return { data: null, erro: erro?.code === '23505' ? bloqueioDeRegra('Outra pessoa criou um item ao mesmo tempo. Tente de novo.') : deErroDoBanco(erro) }
  }
}

// Lê a foto atual, deixa `calcular` montar a mudança e grava. `calcular` pode devolver um Error (ex.: item não encontrado).
async function mudarPlanejamento(obra, calcular) {
  try {
    const antes = await lerPlanejamento(obra)
    const mudanca = calcular(antes)
    return mudanca instanceof Error ? { data: null, erro: mudanca } : await gravarPlanejamento(obra, antes, mudanca)
  } catch (erro) {
    return { data: null, erro }
  }
}

export async function listarPlanejamento(obra) {
  try {
    return { data: await lerPlanejamento(obra), erro: null }
  } catch (erro) {
    return { data: null, erro }
  }
}

// `id` vazio cria; com `id` edita. Dados de entrada já validados pela tela com `errosAtividade`.
export const salvarAtividade = (obra, campos, id) => mudarPlanejamento(obra, (base) => ({
  atividades: aplicarAtividade(base.atividades, campos, id, Math.max(0, ...base.atividades.map((a) => a.id)) + 1),
}))

export const arquivarAtividadeDaObra = (obra, id, arquivada) => mudarPlanejamento(obra, (base) => (
  base.atividades.some((a) => a.id === id) ? { atividades: arquivarAtividade(base.atividades, id, arquivada) } : new Error('atividade não encontrada')))

// Importação de planilha: recebe a lista final já montada e o modo ('adicionar' ou 'substituir').
export const importarAtividades = (obra, atividades, modo) => mudarPlanejamento(obra, (base) => ({
  atividades: modo === 'adicionar' ? [...base.atividades.filter((a) => !atividades.some((n) => n.id === a.id)), ...atividades] : atividades,
  restricoes: restricoesDaImportacao(base.restricoes, modo), baseline: baselineDaImportacao(base.baseline, modo),
}))

// Linha de base: congela as datas planejadas de agora. Salvar de novo substitui a anterior (a tela confirma antes).
export const salvarBaseline = (obra, hoje) => mudarPlanejamento(obra, (base) => ({ baseline: criarBaseline(base.atividades, hoje) }))

// Restrições do lookahead (médio prazo). Sempre da obra informada.
export const salvarRestricao = (obra, campos, id) => mudarPlanejamento(obra, (base) => ({
  restricoes: aplicarRestricao(base.restricoes, campos, id, Math.max(0, ...base.restricoes.map((r) => r.id)) + 1),
}))

export const resolverRestricaoDaObra = (obra, id, resolvida, hoje) => mudarPlanejamento(obra, (base) => ({
  restricoes: resolverRestricao(base.restricoes, id, resolvida, hoje),
}))

export const reprogramarRestricaoDaObra = (obra, id, prazo) => mudarPlanejamento(obra, (base) => ({
  restricoes: reprogramarRestricao(base.restricoes, id, prazo),
}))

// Troca uma atividade (mesmo id) já calculada pelas regras de lib/planejamento.js: mover de coluna, subtarefas, progresso.
export const substituirAtividade = (obra, atividade) => mudarPlanejamento(obra, (base) => (
  base.atividades.some((a) => a.id === atividade.id)
    ? { atividades: base.atividades.map((a) => (a.id === atividade.id ? atividade : a)) }
    : new Error('atividade não encontrada')))

export const salvarCalendario = (obra, calendario) => mudarPlanejamento(obra, () => ({ calendario }))

// QUALIDADE no Supabase: pendências, FVS (modelos da empresa; vistorias e NCs por obra) e Gemba Walk. Sempre recortado por UMA obra.
// A tela monta o registro inteiro (com id próprio) e a camada grava; a numeração da pendência é do banco.
// FOTOS: a tela entrega a prévia local (blob:); aqui ela é comprimida e enviada ao bucket `fotos` (<obra>/qualidade/), e a
// tabela guarda o CAMINHO. Na leitura volta o link assinado, e `linkParaCaminho` traduz o link de volta ao caminho ao regravar.
// Foto que falha não perde o registro: ele é salvo sem ela e a resposta traz `fotoFalhou`.
async function fotoParaCaminho(valor, obraId) {
  if (!valor) return { caminho: '', falhou: false }
  if (linkParaCaminho.has(valor)) return { caminho: linkParaCaminho.get(valor), falhou: false }
  if (!valor.startsWith('blob:')) return { caminho: '', falhou: false }
  try {
    const arquivo = await (await fetch(valor)).blob()
    const caminho = await uploadFoto(arquivo, obraId, 'qualidade')
    linkParaCaminho.set(valor, caminho) // regravar o mesmo registro não sobe a foto de novo
    return { caminho, falhou: false }
  } catch (_) {
    return { caminho: '', falhou: true }
  }
}
async function fotosParaCaminhos(valores, obraId) {
  const feitas = await Promise.all((valores || []).map((v) => fotoParaCaminho(v, obraId)))
  return { caminhos: feitas.map((f) => f.caminho).filter(Boolean), falhou: feitas.some((f) => f.falhou) }
}
const atualizarUm = (tabela, obra, id, campos) => supabase.from(tabela).update(campos).eq('id', id).eq('obra_id', obra.id).select('*')
const semPermissao = () => new Error('sem permissão ou registro não encontrado')

// ----- Pendências -----
const daPendencia = (r, obra, links) => ({
  id: r.id, obraCodigo: obra.codigo, numeroRegistro: r.numero_registro, descricao: r.descricao, local: r.local, pavimento: r.pavimento,
  empresa: r.empresa, prazo: r.prazo || '', responsavel: r.responsavel, dataVistoria: r.data_vistoria || '', vistoriadoPor: r.vistoriado_por,
  status: r.status, foto: links.get(r.foto) || '', fotoEvidencia: links.get(r.foto_evidencia) || '', dataResolucao: r.data_resolucao || '',
  observacoes: r.observacoes,
})
// A pendência como o banco a guarda (fotos = caminhos), para as regras de qualidade.js trabalharem sobre o dado de verdade.
const pendenciaCrua = (r, obra) => daPendencia(r, obra, new Map([[r.foto, r.foto], [r.foto_evidencia, r.foto_evidencia]]))
const paraColunasPendencia = (p) => ({
  status: p.status, foto_evidencia: p.fotoEvidencia, data_resolucao: p.dataResolucao || null, observacoes: p.observacoes,
})

export async function listarPendencias(obra) {
  try {
    const linhas = await lerTudo(() => supabase.from('qualidade_pendencias').select('*').eq('obra_id', obra.id).order('numero_registro'))
    const links = await linksDeCaminhos(linhas.flatMap((r) => [r.foto, r.foto_evidencia]))
    return { data: linhas.map((r) => daPendencia(r, obra, links)), erro: null }
  } catch (erro) {
    return { data: null, erro }
  }
}

export async function criarPendencia(obra, campos, usuarioNome) {
  const base = novaPendencia(campos, { id: 0, obraCodigo: obra.codigo, numeroRegistro: 0 }, usuarioNome)
  const { caminho, falhou } = await fotoParaCaminho(campos.foto, obra.id)
  const { data, error } = await supabase.from('qualidade_pendencias').insert({
    obra_id: obra.id, descricao: base.descricao, local: base.local, pavimento: base.pavimento, empresa: base.empresa, prazo: base.prazo || null,
    responsavel: base.responsavel, data_vistoria: base.dataVistoria || null, vistoriado_por: base.vistoriadoPor, foto: caminho,
  }).select('*').single()
  if (error) return { data: null, erro: deErroDoBanco(error) }
  return { data: daPendencia(data, obra, await linksDeCaminhos([data.foto])), erro: null, fotoFalhou: falhou }
}

async function pendenciaDaObra(obra, id) {
  const { data, error } = await supabase.from('qualidade_pendencias').select('*').eq('id', id).eq('obra_id', obra.id).maybeSingle()
  if (error) throw error
  if (!data) throw semPermissao()
  return data
}

export async function mudarStatusPendencia(obra, id, para, dados, hoje) {
  try {
    const linha = await pendenciaDaObra(obra, id)
    const atual = pendenciaCrua(linha, obra)
    const recusa = errosMudanca(atual, para, dados)
    if (recusa) return { data: null, erro: bloqueioDeRegra(recusa) }
    const { caminho, falhou } = await fotoParaCaminho(dados?.fotoEvidencia, obra.id)
    // Resolver exige a foto da correção: se ela não subiu, nada muda e a pessoa tenta de novo.
    if (para === 'resolvido' && !caminho) return { data: null, erro: bloqueioDeRegra('A foto da correção não subiu. Tente de novo.') }
    const nova = aplicarMudanca(atual, para, { ...dados, fotoEvidencia: caminho }, hoje)
    const { data, error } = await atualizarUm('qualidade_pendencias', obra, id, paraColunasPendencia(nova))
    if (error || !data?.length) return { data: null, erro: error || semPermissao() }
    return { data: daPendencia(data[0], obra, await linksDeCaminhos([data[0].foto, data[0].foto_evidencia])), erro: null, fotoFalhou: falhou }
  } catch (erro) {
    return { data: null, erro }
  }
}

export async function adicionarObservacaoPendencia(obra, id, texto, agora) {
  try {
    const linha = await pendenciaDaObra(obra, id)
    const { data, error } = await atualizarUm('qualidade_pendencias', obra, id, { observacoes: acrescentarObservacao(linha.observacoes, texto, agora) })
    if (error || !data?.length) return { data: null, erro: error || semPermissao() }
    return { data: daPendencia(data[0], obra, await linksDeCaminhos([data[0].foto, data[0].foto_evidencia])), erro: null }
  } catch (erro) {
    return { data: null, erro }
  }
}

// Apagar sem permissão não dá erro: só não apaga. Pedir as linhas apagadas de volta evita um "excluído" falso.
const apagarUm = async (tabela, id, obra) => {
  const consulta = supabase.from(tabela).delete().eq('id', id)
  const { data, error } = await (obra ? consulta.eq('obra_id', obra.id) : consulta).select('id')
  return error || !data?.length ? { data: null, erro: error || semPermissao() } : { data: true, erro: null }
}
export const excluirPendencia = (obra, id) => apagarUm('qualidade_pendencias', id, obra)

// ----- FVS: modelos (da empresa toda), vistorias e não conformidades (de uma obra) -----
const doModelo = (r) => ({ id: r.id, codigo: r.codigo, nome: r.nome, categoria: r.categoria, versao: r.versao, grupos: r.grupos })
const daVistoria = (r, obra) => ({
  id: r.id, obraCodigo: obra.codigo, modeloId: r.modelo_id, modeloCodigo: r.modelo_codigo, modeloNome: r.modelo_nome, versao: r.versao,
  ambiente: r.ambiente, grupos: r.grupos, respostas: r.respostas, status: r.status, criadaEm: r.criada_em, criadaPor: r.criada_por,
  concluidaEm: r.concluida_em || '', empresa: r.empresa,
})
const daNc = (r, obra, links) => ({
  id: r.id, obraCodigo: obra.codigo, codigo: r.codigo, vistoriaId: r.vistoria_id, itemId: r.item_id, itemNumero: r.item_numero, titulo: r.titulo,
  servico: r.servico, ambiente: r.ambiente, severidade: r.severidade, responsavel: r.responsavel, empresa: r.empresa, descricao: r.descricao,
  solucao: r.solucao, status: r.status, abertaEm: r.aberta_em, fechadaEm: r.fechada_em || '', fotos: r.fotos.map((c) => links.get(c)).filter(Boolean),
  timeline: r.timeline,
})

export async function listarModelosFvs() {
  try {
    return { data: (await lerTudo(() => supabase.from('fvs_modelos').select('*').order('codigo'))).map(doModelo), erro: null }
  } catch (erro) {
    return { data: null, erro }
  }
}
export async function salvarModeloFvs(modelo) {
  const { data, error } = await supabase.from('fvs_modelos').upsert({
    id: modelo.id, codigo: modelo.codigo, nome: modelo.nome, categoria: modelo.categoria, versao: modelo.versao, grupos: modelo.grupos,
  }).select('*').single()
  return error ? { data: null, erro: deErroDoBanco(error) } : { data: doModelo(data), erro: null }
}
export const excluirModeloFvs = (id) => apagarUm('fvs_modelos', id)

export async function listarVistorias(obra) {
  try {
    const linhas = await lerTudo(() => supabase.from('fvs_vistorias').select('*').eq('obra_id', obra.id).order('created_at'))
    return { data: linhas.map((r) => daVistoria(r, obra)), erro: null }
  } catch (erro) {
    return { data: null, erro }
  }
}
export async function listarNcs(obra) {
  try {
    const linhas = await lerTudo(() => supabase.from('fvs_ncs').select('*').eq('obra_id', obra.id).order('created_at'))
    const links = await linksDeCaminhos(linhas.flatMap((r) => r.fotos))
    return { data: linhas.map((r) => daNc(r, obra, links)), erro: null }
  } catch (erro) {
    return { data: null, erro }
  }
}

const linhaVistoria = (obra, v) => ({
  id: v.id, obra_id: obra.id, modelo_id: v.modeloId, modelo_codigo: v.modeloCodigo, modelo_nome: v.modeloNome, versao: v.versao, ambiente: v.ambiente,
  grupos: v.grupos, respostas: v.respostas, status: v.status, criada_em: v.criadaEm, criada_por: v.criadaPor, concluida_em: v.concluidaEm || null,
})
export async function salvarVistoria(obra, vistoria) {
  const { data, error } = await supabase.from('fvs_vistorias').upsert(linhaVistoria(obra, vistoria)).select('*').single()
  return error ? { data: null, erro: deErroDoBanco(error) } : { data: daVistoria(data, obra), erro: null }
}

const linhaNc = (obra, nc, fotos) => ({
  id: nc.id, obra_id: obra.id, codigo: nc.codigo, vistoria_id: nc.vistoriaId, item_id: nc.itemId, item_numero: nc.itemNumero, titulo: nc.titulo,
  servico: nc.servico, ambiente: nc.ambiente, severidade: nc.severidade, responsavel: nc.responsavel, empresa: nc.empresa || '',
  descricao: nc.descricao, solucao: nc.solucao, status: nc.status, aberta_em: nc.abertaEm, fechada_em: nc.fechadaEm || null, fotos, timeline: nc.timeline,
})
export async function salvarNc(obra, nc) {
  const { caminhos, falhou } = await fotosParaCaminhos(nc.fotos, obra.id)
  const { data, error } = await supabase.from('fvs_ncs').upsert(linhaNc(obra, nc, caminhos)).select('*').single()
  if (error) return { data: null, erro: deErroDoBanco(error) }
  return { data: daNc(data, obra, await linksDeCaminhos(data.fotos)), erro: null, fotoFalhou: falhou }
}
// Marcar NC no item grava a NC e a resposta da vistoria juntas, numa função do banco (ou as duas, ou nenhuma).
export async function registrarNc(obra, vistoria, nc) {
  const { caminhos, falhou } = await fotosParaCaminhos(nc.fotos, obra.id)
  const { error } = await supabase.rpc('fvs_registrar_nc', { p_nc: linhaNc(obra, nc, caminhos), p_vistoria: vistoria.id, p_respostas: vistoria.respostas })
  if (error) return { data: null, erro: deErroDoBanco(error) }
  const links = await linksDeCaminhos(caminhos)
  return { data: { vistoria, nc: { ...nc, fotos: caminhos.map((c) => links.get(c)).filter(Boolean) } }, erro: null, fotoFalhou: falhou }
}

// ----- Gemba Walk -----
const doGemba = (r, obra, links) => ({
  id: r.id, obraCodigo: obra.codigo, local: r.local, descricao: r.descricao, causaRaiz: r.causa_raiz, acao: r.acao, desperdicios: r.desperdicios,
  prazo: r.prazo || '', responsavel: r.responsavel, empresa: r.empresa, status: r.status, foto: links.get(r.foto) || '',
})
export async function listarGemba(obra) {
  try {
    const linhas = await lerTudo(() => supabase.from('gemba_observacoes').select('*').eq('obra_id', obra.id).order('created_at'))
    const links = await linksDeCaminhos(linhas.map((r) => r.foto))
    return { data: linhas.map((r) => doGemba(r, obra, links)), erro: null }
  } catch (erro) {
    return { data: null, erro }
  }
}
export async function salvarGemba(obra, o) {
  const { caminho, falhou } = await fotoParaCaminho(o.foto, obra.id)
  const { data, error } = await supabase.from('gemba_observacoes').upsert({
    id: o.id, obra_id: obra.id, local: o.local, descricao: o.descricao, causa_raiz: o.causaRaiz, acao: o.acao, desperdicios: o.desperdicios,
    prazo: o.prazo || null, responsavel: o.responsavel, empresa: o.empresa || '', status: o.status, foto: caminho,
  }).select('*').single()
  if (error) return { data: null, erro: deErroDoBanco(error) }
  return { data: doGemba(data, obra, await linksDeCaminhos([data.foto])), erro: null, fotoFalhou: falhou }
}
export const excluirGemba = (obra, id) => apagarUm('gemba_observacoes', id, obra)

// CADASTROS: frentes, restrições da obra, medição das frentes, liberação de foto ao cliente, obras e acesso de pessoas.
// Quem pode o quê é a RLS e os gatilhos do banco (a tela só esconde os botões). Escrita sem permissão não dá erro no
// Supabase (só não muda nada): por isso toda gravação pede a linha de volta (`.select`) e confere que ela veio.
const umaLinha = ({ data, error }) => {
  if (error) return { data: null, erro: error.code === '23505' ? bloqueioDeRegra(REPETIDO) : deErroDoBanco(error) }
  return data?.length ? { data: data[0], erro: null } : { data: null, erro: semPermissao() }
}
const REPETIDO = 'Já existe um registro igual a este.'
const aoApagar = (resultado, texto) => (resultado.erro?.code === '23503' ? { data: null, erro: bloqueioDeRegra(texto) } : resultado)

// ----- Frentes -----
const colunasFrente = (c) => ({
  nome: c.nome.trim(), disciplina: c.disciplina, local: c.local?.trim() || null, responsavel_id: c.responsavelId || null,
  inicio_planejado: c.inicio, fim_planejado: c.fim, peso: lerNumero(c.peso), eh_marco: Boolean(c.ehMarco),
})
// O banco zera avanço, status e saúde na criação e guarda o fim planejado original: a tela só informa o plano.
export async function criarFrente(obra, c) {
  return umaLinha(await supabase.from('frentes').insert({ obra_id: obra.id, ...colunasFrente(c), fim_planejado_original: c.fim }).select('id'))
}
export async function atualizarFrente(obra, id, c) {
  return umaLinha(await supabase.from('frentes').update(colunasFrente(c)).eq('id', id).eq('obra_id', obra.id).select('id'))
}
export async function excluirFrente(obra, id) {
  return aoApagar(await apagarUm('frentes', id, obra), 'Esta frente já tem lançamentos ou registros ligados a ela e não pode ser excluída.')
}

// ----- Restrições da obra (as do cadastro; as do lookahead ficam em Planejamento) -----
export async function criarRestricaoCadastro(obra, usuario, c) {
  return umaLinha(await supabase.from('restricoes').insert({
    obra_id: obra.id, frente_id: c.frenteId || null, tipo: c.tipo, titulo: c.titulo.trim(), descricao: c.descricao?.trim() || null,
    criticidade: c.criticidade, responsavel_id: c.responsavelId || null, autor_id: usuario.id, data_limite: c.dataLimite || null,
    impacto_prazo_dias: c.impacto === '' || c.impacto == null ? null : Number(c.impacto),
  }).select('id'))
}
export async function mudarStatusRestricaoCadastro(obra, id, status) {
  return umaLinha(await supabase.from('restricoes').update({ status }).eq('id', id).eq('obra_id', obra.id).select('id'))
}
export async function excluirRestricaoCadastro(obra, id) {
  return apagarUm('restricoes', id, obra)
}

// ----- Medição das frentes (mensal) -----
export async function criarMedicaoDaFrente(obra, frenteId, c) {
  const resultado = umaLinha(await supabase.from('medicoes').insert({
    obra_id: obra.id, frente_id: frenteId, mes_referencia: primeiroDiaDoMes(c.mes), quantidade: lerNumero(c.quantidade), unidade: c.unidade.trim(),
    percentual_medido: lerNumero(c.percentual), valor_medido: lerNumero(c.valor), status: c.enviar ? 'Enviada' : 'Rascunho',
    observacao: c.observacao?.trim() || null,
  }).select('id'))
  return resultado.erro?.message === REPETIDO
    ? { data: null, erro: bloqueioDeRegra('Esta frente já tem medição neste mês.') } : resultado
}
// O gatilho do banco confere a ordem (Rascunho → Enviada → Aprovada pela Gestão → Aprovada) e quem pode dar cada passo.
export async function mudarStatusMedicaoDaFrente(obra, id, status) {
  return umaLinha(await supabase.from('medicoes').update({ status }).eq('id', id).eq('obra_id', obra.id).select('id'))
}

// ----- Foto liberada ao cliente -----
export async function liberarFotoAoCliente(obra, id, visivel) {
  return umaLinha(await supabase.from('fotos').update({ visivel_cliente: visivel }).eq('id', id).eq('obra_id', obra.id).select('id'))
}

// ----- Obras (só o Coordenador) -----
const colunasObra = (c) => ({
  codigo: c.codigo.trim(), nome: c.nome.trim(), cliente: c.cliente.trim(), endereco: c.endereco?.trim() || null,
  numero_contrato: c.numeroContrato?.trim() || null, data_inicio: c.inicio, data_fim_contratual: c.fim, status: c.status,
  responsavel_id: c.responsavelId || null,
})
const codigoRepetido = (r) => (r.erro?.message === REPETIDO ? { data: null, erro: bloqueioDeRegra('Já existe uma obra com este código.') } : r)
export async function criarObra(c) {
  return codigoRepetido(umaLinha(await supabase.from('obras').insert(colunasObra(c)).select('id')))
}
export async function atualizarObra(id, c) {
  return codigoRepetido(umaLinha(await supabase.from('obras').update(colunasObra(c)).eq('id', id).select('id')))
}

// ----- Pessoas (painel de admin) -----
// Criar login, trocar senha, mudar perfil e obras, bloquear e excluir passam TODOS pela Edge Function admin-usuarios: a chave de
// serviço só existe lá, e a função confere no banco que quem chama é administrador ativo. Aqui só se pede e se traduz o erro.
export async function adminUsuarios(acao, dados = {}) {
  try {
    const { data, error } = await supabase.functions.invoke('admin-usuarios', { body: { acao, ...dados } })
    if (!error) return data?.erro ? { data: null, erro: bloqueioDeRegra(data.erro) } : { data, erro: null }
    // A função responde com { erro: 'frase em português' } e um status de recusa (400/403/409...).
    const corpo = await error.context?.json?.().catch(() => null)
    return { data: null, erro: bloqueioDeRegra(corpo?.erro || 'Não consegui falar com o servidor. Tente de novo.') }
  } catch (_) {
    return { data: null, erro: bloqueioDeRegra('Não consegui falar com o servidor. Verifique a conexão e tente de novo.') }
  }
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
