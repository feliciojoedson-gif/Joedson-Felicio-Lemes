// TESTE DO ESTRANHO: tenta entrar no banco como um intruso e imprime, para cada tentativa, se a porta está fechada ou aberta.
//
//   node teste-do-estranho.mjs                 -> só o estranho SEM login (usa apenas a URL e a chave pública do .env.local)
//   TESTE_PAPEL=comum|pendente TESTE_EMAIL=... TESTE_SENHA=... TESTE_CTX='{...}' node teste-do-estranho.mjs
//                                              -> além do estranho, o mesmo teste logado como um usuário de teste
//
// 🔒 PORTA FECHADA = o banco recusou ou não devolveu/alterou nada.
// 🟢 PERMITIDO     = passou, e é o que o papel DEVE poder fazer (ex.: o canteiro lança diário).
// 🚨 PORTA ABERTA  = passou e NÃO deveria. Qualquer 🚨 é um defeito de segurança.
// ❓ INCONCLUSIVO  = o banco respondeu com um erro que não é de permissão (pedido de teste mal formado). Não prova nada: precisa ser investigado.
// O teste logado só mexe em linhas de uma obra de teste ("ZZAUD"); nada dos dados reais é tocado.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync(new URL('./.env.local', import.meta.url), 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)
const URL_SUPABASE = env.VITE_SUPABASE_URL
const CHAVE_PUBLICA = env.VITE_SUPABASE_PUBLISHABLE_KEY
if (!URL_SUPABASE || !CHAVE_PUBLICA) throw new Error('Faltam VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no .env.local')

const snap = JSON.parse(readFileSync(new URL('./tests/schema-snapshot.json', import.meta.url), 'utf8'))
const TABELAS = Object.keys(snap.tabelas)
const VIEWS = Object.keys(snap.views)

const novoCliente = () => createClient(URL_SUPABASE, CHAVE_PUBLICA, { auth: { persistSession: false, autoRefreshToken: false } })
let abertas = 0
let fechadas = 0
let permitidas = 0
let inconclusivas = 0
const linha = (estado, quem, tabela, operacao, detalhe = '') => {
  if (estado === 'fechada') { fechadas++; console.log(`🔒 PORTA FECHADA  | ${quem} | ${tabela} | ${operacao}${detalhe ? ` | ${detalhe}` : ''}`) }
  else if (estado === 'permitida') { permitidas++; console.log(`🟢 PERMITIDO      | ${quem} | ${tabela} | ${operacao}${detalhe ? ` | ${detalhe}` : ''}`) }
  else if (estado === 'duvida') { inconclusivas++; console.log(`❓ INCONCLUSIVO   | ${quem} | ${tabela} | ${operacao}${detalhe ? ` | ${detalhe}` : ''}`) }
  else { abertas++; console.log(`🚨 PORTA ABERTA   | ${quem} | ${tabela} | ${operacao}${detalhe ? ` | ${detalhe}` : ''}`) }
}
// Só chamamos de "porta fechada" quando o banco diz CLARAMENTE que não tem permissão (42501 / row-level security).
const foiRecusa = (erro) => erro.code === '42501' || /permission denied|row-level security|violates row-level/i.test(erro.message || '')
const motivoDoErro = (erro) => (foiRecusa(erro) ? 'o banco recusou' : `erro: ${(erro.message || '').slice(0, 60)}`)
const IMPOSSIVEL = '00000000-0000-0000-0000-000000000000'
const primeiraColuna = (t) => snap.tabelas[t][0]
// Valor que nunca existe, do TIPO certo da primeira coluna (senão o banco recusa por tipo antes de checar a permissão).
const TABELAS_UUID = ['fvs_modelos', 'fvs_vistorias', 'fvs_ncs', 'gemba_observacoes']
const valorImpossivel = (t) => (TABELAS_UUID.includes(t) ? IMPOSSIVEL : -1)
// Alteração inofensiva e do tipo certo (todas as tabelas têm created_at).
const ALTERACAO_INOFENSIVA = { created_at: '2000-01-01T00:00:00Z' }

// ---------------------------------------------------------------------------------------------------------------
// 1) O ESTRANHO SEM LOGIN: só a chave pública. Ele não deveria conseguir NADA em NENHUMA tabela.
// ---------------------------------------------------------------------------------------------------------------
async function estranhoSemLogin() {
  console.log('\n=== O ESTRANHO SEM LOGIN (só a chave pública) ===')
  const sb = novoCliente()
  for (const t of [...TABELAS, ...VIEWS]) {
    const ler = await sb.from(t).select('*').limit(5)
    if (ler.error) linha('fechada', 'estranho', t, 'LER', motivoDoErro(ler.error))
    else if (ler.data.length > 0) linha('aberta', 'estranho', t, 'LER', `leu ${ler.data.length} linha(s)`)
    else linha('fechada', 'estranho', t, 'LER', 'o banco devolveu 0 linhas')
    if (VIEWS.includes(t)) continue

    // INSERIR com um pedido vazio: a checagem de permissão vem antes de qualquer validação de dado.
    const inserir = await sb.from(t).insert({})
    if (inserir.error && foiRecusa(inserir.error)) linha('fechada', 'estranho', t, 'INSERIR', 'o banco recusou')
    else if (inserir.error) linha('duvida', 'estranho', t, 'INSERIR', motivoDoErro(inserir.error))
    else linha('aberta', 'estranho', t, 'INSERIR', 'inseriu')

    // o filtro impossível garante que, mesmo que a porta estivesse aberta, nenhuma linha real seria apagada
    const apagar = await sb.from(t).delete({ count: 'exact' }).eq(primeiraColuna(t), valorImpossivel(t))
    if (apagar.error && foiRecusa(apagar.error)) linha('fechada', 'estranho', t, 'APAGAR', 'o banco recusou')
    else if (apagar.error) linha('duvida', 'estranho', t, 'APAGAR', motivoDoErro(apagar.error))
    else linha('aberta', 'estranho', t, 'APAGAR', 'passou da permissão (o filtro de proteção não apagou nada)')

    const alterar = await sb.from(t).update(ALTERACAO_INOFENSIVA, { count: 'exact' }).eq(primeiraColuna(t), valorImpossivel(t))
    if (alterar.error && foiRecusa(alterar.error)) linha('fechada', 'estranho', t, 'ALTERAR', 'o banco recusou')
    else if (alterar.error) linha('duvida', 'estranho', t, 'ALTERAR', motivoDoErro(alterar.error))
    else linha('aberta', 'estranho', t, 'ALTERAR', 'passou da permissão (o filtro de proteção não alterou nada)')
  }

  for (const funcao of ['rodar_virada', 'virada_estado', 'ativar_contrato_empreiteiro', 'fvs_registrar_nc']) {
    const r = await sb.rpc(funcao, {})
    if (r.error && (r.error.code === '42501' || /permission denied|not found|Could not find/i.test(r.error.message))) linha('fechada', 'estranho', `função ${funcao}`, 'CHAMAR', 'o banco recusou')
    else linha('aberta', 'estranho', `função ${funcao}`, 'CHAMAR', r.error ? `executou (${r.error.message.slice(0, 50)})` : 'executou')
  }

  for (const balde of ['fotos', 'evidencias']) {
    const lista = await sb.storage.from(balde).list('', { limit: 5 })
    if (lista.error || !lista.data?.length) linha('fechada', 'estranho', `arquivos (${balde})`, 'LISTAR', lista.error ? 'o banco recusou' : 'lista vazia')
    else linha('aberta', 'estranho', `arquivos (${balde})`, 'LISTAR', `viu ${lista.data.length} item(ns)`)
    const subir = await sb.storage.from(balde).upload(`ZZ/estranho-${Date.now()}.txt`, new Blob(['x']), { contentType: 'text/plain' })
    linha(subir.error ? 'fechada' : 'aberta', 'estranho', `arquivos (${balde})`, 'ENVIAR', subir.error ? 'o banco recusou' : 'enviou')
  }

  const criarConta = await sb.auth.signUp({ email: `estranho-${Date.now()}@example.com`, password: 'SenhaDoEstranho123' })
  linha(criarConta.error || !criarConta.data?.user ? 'fechada' : 'aberta', 'estranho', 'cadastro de conta', 'CRIAR', criarConta.error ? `recusado (${criarConta.error.code || 'erro'})` : 'criou conta')

  const admin = await fetch(`${URL_SUPABASE}/functions/v1/admin-usuarios`, {
    method: 'POST', headers: { apikey: CHAVE_PUBLICA, Authorization: `Bearer ${CHAVE_PUBLICA}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ acao: 'listar' }),
  })
  linha(admin.status === 401 || admin.status === 403 ? 'fechada' : 'aberta', 'estranho', 'função admin-usuarios', 'CHAMAR', `resposta ${admin.status}`)
}

// ---------------------------------------------------------------------------------------------------------------
// 2) O INTRUSO LOGADO: usuário de teste de um papel (comum = Produção, ou Pendente) numa obra de teste.
// ---------------------------------------------------------------------------------------------------------------
const PAPEIS = {
  // Produção: o dia a dia do canteiro. Cria/edita o que é do canteiro; NÃO apaga nada, NÃO mexe em valores, NÃO mexe em pessoas.
  comum: {
    nome: 'usuário comum (Produção)',
    ler: ['apontamentos', 'atividades_planejamento', 'fotos', 'frentes', 'fvs_modelos', 'fvs_ncs', 'fvs_vistorias', 'gemba_observacoes', 'materiais_catalogo',
      'obra_membros', 'obras', 'pedidos_material', 'planejamento_config', 'profiles', 'qualidade_pendencias', 'rdo_registros', 'restricoes',
      'restricoes_planejamento', 'perfis_colegas'],
    inserir: ['apontamentos', 'atividades_planejamento', 'fotos', 'fvs_modelos', 'fvs_ncs', 'fvs_vistorias', 'gemba_observacoes', 'pedidos_material',
      'qualidade_pendencias', 'rdo_registros', 'restricoes', 'restricoes_planejamento'],
    alterar: ['apontamentos', 'atividades_planejamento', 'fvs_modelos', 'fvs_ncs', 'fvs_vistorias', 'gemba_observacoes', 'pedidos_material',
      'qualidade_pendencias', 'rdo_registros', 'restricoes', 'restricoes_planejamento'],
    apagar: [],
  },
  // Pendente: conta nova que ainda não foi liberada. Não lê dado nenhum e não se aprova.
  pendente: { nome: 'conta pendente', ler: [], inserir: [], alterar: [], apagar: [] },
  // Cliente: só consulta, e só o recorte das views (frentes sem responsável/impacto, medição Aprovada) e das fotos liberadas.
  cliente: { nome: 'cliente', ler: ['obras', 'obra_membros', 'fotos', 'frentes_cliente', 'medicoes_cliente'], inserir: [], alterar: [], apagar: [] },
}
// Colunas que o Cliente nunca pode receber da view de frentes (PRD: sem responsável, dias sem avanço, impacto, data de decisão).
const COLUNAS_PROIBIDAS_AO_CLIENTE = ['responsavel_id', 'dias_sem_avanco', 'impacto_prazo_dias', 'data_limite_decisao', 'ultimo_avanco_em', 'status', 'saude', 'created_by']

async function intrusoLogado(papel, email, senha, ctx) {
  const cfg = PAPEIS[papel]
  const quem = cfg.nome
  console.log(`\n=== O INTRUSO LOGADO: ${cfg.nome} ===`)
  const sb = novoCliente()
  const entrada = await sb.auth.signInWithPassword({ email, password: senha })
  if (entrada.error) throw new Error(`Não consegui logar o usuário de teste: ${entrada.error.message}`)

  // r = { error, count }: efeito (count > 0) => permitido ou ABERTA; recusa clara => fechada; erro de outro tipo => inconclusivo.
  const registrar = (t, op, estaPermitido, r, ok, semEfeito = 'nada foi afetado') => {
    if (!r.error && (r.count || 0) > 0) linha(estaPermitido ? 'permitida' : 'aberta', quem, t, op, ok)
    else if (!r.error) linha(estaPermitido ? 'duvida' : 'fechada', quem, t, op, semEfeito)
    else if (foiRecusa(r.error)) linha(estaPermitido ? 'duvida' : 'fechada', quem, t, op, 'o banco recusou')
    else linha('duvida', quem, t, op, motivoDoErro(r.error))
  }

  // --- LER ---
  for (const t of [...TABELAS, ...VIEWS]) {
    const r = await sb.from(t).select('*').limit(200)
    if (r.error) { linha('fechada', quem, t, 'LER', motivoDoErro(r.error)); continue }
    const linhas = r.data
    if (t === 'profiles') {
      const alheios = linhas.filter((p) => p.id !== ctx.perfilEu)
      linha(alheios.length ? 'aberta' : (linhas.length ? 'permitida' : 'fechada'), quem, t, 'LER perfis dos outros', alheios.length ? `viu ${alheios.length} perfil(is) de outras pessoas` : 'só o próprio perfil')
      continue
    }
    if (!cfg.ler.includes(t)) { linha(linhas.length ? 'aberta' : 'fechada', quem, t, 'LER', linhas.length ? `leu ${linhas.length} linha(s) que o papel não deveria ver` : 'o banco devolveu 0 linhas'); continue }
    const deOutraObra = linhas.filter((x) => 'obra_id' in x && x.obra_id !== ctx.obra && !['obras'].includes(t))
    if (deOutraObra.length) linha('aberta', quem, t, 'LER', `vazou ${deOutraObra.length} linha(s) de OUTRA obra`)
    else if (t === 'obras' && linhas.some((o) => o.id !== ctx.obra)) linha('aberta', quem, t, 'LER', 'viu obras que não são dele')
    else linha(linhas.length ? 'permitida' : 'fechada', quem, t, 'LER', linhas.length ? `${linhas.length} linha(s) da obra liberada` : 'sem linhas')
  }

  // --- Recorte do Cliente: o que a leitura PERMITIDA devolve tem que respeitar o recorte ---
  if (papel === 'cliente') {
    const fotos = await sb.from('fotos').select('*')
    const escondidas = (fotos.data || []).filter((f) => !f.visivel_cliente)
    linha(escondidas.length ? 'aberta' : 'fechada', quem, 'fotos', 'LER só as liberadas', escondidas.length ? `viu ${escondidas.length} foto(s) NÃO liberada(s)` : `só fotos liberadas (${fotos.data?.length ?? 0})`)
    const meds = await sb.from('medicoes_cliente').select('*')
    const naoAprovadas = (meds.data || []).filter((m) => m.status !== 'Aprovada')
    linha(naoAprovadas.length ? 'aberta' : 'fechada', quem, 'medicoes_cliente', 'LER só as Aprovadas', naoAprovadas.length ? `viu ${naoAprovadas.length} medição(ões) não aprovada(s)` : `só Aprovadas (${meds.data?.length ?? 0})`)
    const fr = await sb.from('frentes_cliente').select('*').limit(5)
    const colunas = Object.keys(fr.data?.[0] || {})
    const vazadas = colunas.filter((c) => COLUNAS_PROIBIDAS_AO_CLIENTE.includes(c))
    linha(vazadas.length ? 'aberta' : 'fechada', quem, 'frentes_cliente', 'LER colunas proibidas', vazadas.length ? `expõe: ${vazadas.join(', ')}` : 'sem coluna proibida')
    const colegas = await sb.from('perfis_colegas').select('*').limit(5)
    linha(colegas.data?.length ? 'aberta' : 'fechada', quem, 'perfis_colegas', 'LER', colegas.data?.length ? `viu ${colegas.data.length} colega(s)` : 'o banco devolveu 0 linhas')
  }

  // --- INSERIR (linhas válidas na obra de teste: se a porta estiver aberta, ela passa) ---
  const hoje = new Date().toISOString().slice(0, 10)
  // chaves únicas por rodada: rodar o teste de novo não esbarra em linhas que a rodada anterior deixou na obra de teste
  const RODADA = Math.floor(Math.random() * 90000) + 1000
  const diaUnico = `20${30 + (RODADA % 9)}-${String((RODADA % 12) + 1).padStart(2, '0')}-${String((RODADA % 27) + 1).padStart(2, '0')}`
  const eu = ctx.perfilEu
  const O = ctx.obra
  const novos = {
    apontamentos: { obra_id: O, frente_id: ctx.frente, data: diaUnico, autor_id: eu, percentual_acumulado: 100, houve_avanco: false, motivo_sem_avanco: 'Chuva', efetivo_qtd: 1 },
    atividades_planejamento: { obra_id: O, id: RODADA, titulo: 'ZZ', inicio: hoje, fim: hoje },
    auditoria: { tabela: 'zz', registro_id: 1, acao: 'Criou' },
    boletins_empreiteiro: { obra_id: O, contrato_id: ctx.contrato, numero: 1, data: hoje, valor: 1, linhas: [{ itemId: ctx.item, quantidade: 1 }] },
    contratos_empreiteiro: { obra_id: O, empreiteiro: 'ZZ', descricao: 'ZZ' },
    fotos: { obra_id: O, frente_id: ctx.frente, url: 'zz', autor_id: eu, tirada_em: new Date().toISOString() },
    frentes: { obra_id: O, nome: 'ZZ', disciplina: 'Civil', inicio_planejado: hoje, fim_planejado: hoje, fim_planejado_original: hoje },
    fvs_modelos: { codigo: `ZZ-${Date.now() % 100000}`, nome: 'ZZ', categoria: 'Acabamento' },
    fvs_ncs: { obra_id: O, codigo: `NC-ZZ${RODADA}`, vistoria_id: ctx.vistoria, item_id: 1, item_numero: '1', titulo: 'ZZ', servico: 'ZZ', ambiente: 'ZZ', severidade: 'Baixa', aberta_em: hoje },
    fvs_vistorias: { obra_id: O, modelo_codigo: 'ZZ', modelo_nome: 'ZZ', versao: 1, ambiente: 'ZZ', grupos: [], criada_em: hoje },
    gemba_observacoes: { obra_id: O, local: 'ZZ', descricao: 'ZZ' },
    itens_contrato: { obra_id: O, contrato_id: ctx.contratoElab, descricao: 'ZZ', unidade: 'm2', quantidade: 1, preco_unitario: 1 },
    materiais_catalogo: { nome: 'ZZ novo item', unidade: 'un', categoria: 'grosso' },
    medicoes: { obra_id: O, frente_id: ctx.frente, mes_referencia: `${diaUnico.slice(0, 7)}-01`, quantidade: 1, unidade: 'm2', percentual_medido: 1, valor_medido: 1 },
    obra_membros: { obra_id: ctx.obra2, profile_id: eu }, // tentar se ligar sozinho a outra obra
    obras: { codigo: `ZZI${RODADA}`, nome: 'ZZ', cliente: 'ZZ', data_inicio: hoje, data_fim_contratual: hoje },
    pedidos_material: { obra_id: O, material_id: ctx.catalogo, quantidade: 1, frente: 'ZZ' },
    planejamento_config: { obra_id: O, calendario: {} },
    profiles: { auth_uid: IMPOSSIVEL, nome: 'ZZ', email: 'zz@zz.zz' },
    qualidade_pendencias: { obra_id: O, descricao: 'ZZ' },
    rdo_registros: { obra_id: O, data: hoje, clima: 'sol', efetivo: 1, atividades: 'ZZ' },
    restricoes: { obra_id: O, tipo: 'RFI', titulo: 'ZZ', criticidade: 'Baixa', autor_id: eu },
    restricoes_planejamento: { obra_id: O, id: RODADA, atividade_id: ctx.atividade, descricao: 'ZZ', tipo: 'Material', prazo: hoje, responsavel: 'ZZ' },
  }
  for (const t of TABELAS) {
    const r = await sb.from(t).insert(novos[t], { count: 'exact' })
    registrar(t, 'INSERIR', cfg.inserir.includes(t), r.error ? r : { count: r.count ?? 1 }, 'inseriu')
  }

  // --- ALTERAR: valores de contratos e medições, perfis dos outros, o PRÓPRIO papel/status ---
  const alterar = async (t, op, estaPermitido, consulta) => {
    registrar(t, op, estaPermitido, await consulta, 'alterou', 'nada foi alterado')
  }
  const um = { count: 'exact' }
  await alterar('medicoes', 'ALTERAR o valor medido', false, sb.from('medicoes').update({ valor_medido: 999999 }, um).eq('id', ctx.medicao))
  await alterar('medicoes', 'APROVAR (mudar o status)', false, sb.from('medicoes').update({ status: 'Aprovada' }, um).eq('id', ctx.medicao))
  await alterar('contratos_empreiteiro', 'ALTERAR o valor do contrato', false, sb.from('contratos_empreiteiro').update({ valor_total: 999999 }, um).eq('id', ctx.contrato))
  await alterar('itens_contrato', 'ALTERAR o preço do item', false, sb.from('itens_contrato').update({ preco_unitario: 999999 }, um).eq('id', ctx.item))
  await alterar('profiles', 'ALTERAR o papel de OUTRA pessoa', false, sb.from('profiles').update({ role: 'Coordenador' }, um).eq('id', ctx.perfilAlvo))
  await alterar('profiles', 'BLOQUEAR/DESBLOQUEAR OUTRA pessoa', false, sb.from('profiles').update({ ativo: false }, um).eq('id', ctx.perfilAlvo))
  await alterar('profiles', 'MUDAR O PRÓPRIO papel', false, sb.from('profiles').update({ role: 'Coordenador' }, um).eq('id', eu))
  await alterar('profiles', 'MUDAR A PRÓPRIA situação (ativo)', false, sb.from('profiles').update({ ativo: true }, um).eq('id', eu))
  await alterar('profiles', 'SE APROVAR (Pendente -> Produção)', false, sb.from('profiles').update({ role: 'Produção' }, um).eq('id', eu))
  await alterar('obras', 'ALTERAR uma obra', false, sb.from('obras').update({ nome: 'ZZ mudou' }, um).eq('id', ctx.obra))
  await alterar('frentes', 'ALTERAR uma frente', false, sb.from('frentes').update({ nome: 'ZZ mudou' }, um).eq('id', ctx.frente))
  await alterar('materiais_catalogo', 'ALTERAR o catálogo', false, sb.from('materiais_catalogo').update({ nome: 'ZZ mudou' }, um).eq('id', ctx.catalogo))
  await alterar('profiles', 'MUDAR o próprio nome', true, sb.from('profiles').update({ nome: 'Teste Auditoria' }, um).eq('id', eu))
  const alteracoes = {
    apontamentos: ['observacao', ctx.apontamento, 'id'], atividades_planejamento: ['titulo', ctx.atividade, 'id'], fvs_modelos: ['nome', ctx.modelo, 'id'],
    fvs_ncs: ['descricao', ctx.nc, 'id'], fvs_vistorias: ['ambiente', ctx.vistoria, 'id'], gemba_observacoes: ['descricao', ctx.gemba, 'id'],
    pedidos_material: ['frente', ctx.pedido, 'id'], qualidade_pendencias: ['descricao', ctx.pendencia, 'id'], rdo_registros: ['atividades', ctx.rdo, 'id'],
    restricoes: ['titulo', ctx.restricao, 'id'], restricoes_planejamento: ['descricao', ctx.restricaoPlan, 'id'],
  }
  for (const [t, [coluna, id, chave]] of Object.entries(alteracoes)) {
    const filtro = t === 'atividades_planejamento' || t === 'restricoes_planejamento' ? sb.from(t).update({ [coluna]: 'ZZ editado' }, um).eq('obra_id', O).eq(chave, id) : sb.from(t).update({ [coluna]: 'ZZ editado' }, um).eq(chave, id)
    await alterar(t, 'ALTERAR', cfg.alterar.includes(t), filtro)
  }

  // --- APAGAR: linhas de teste da obra ZZAUD (se a porta estiver aberta, só elas somem) ---
  const apagaveis = {
    apontamentos: ['id', ctx.apontamento], atividades_planejamento: ['id', ctx.atividade], contratos_empreiteiro: ['id', ctx.contrato], fotos: ['id', ctx.foto],
    frentes: ['id', ctx.frente], fvs_modelos: ['id', ctx.modelo], gemba_observacoes: ['id', ctx.gemba], itens_contrato: ['id', ctx.item], materiais_catalogo: ['id', ctx.catalogo],
    medicoes: ['id', ctx.medicao], pedidos_material: ['id', ctx.pedido], qualidade_pendencias: ['id', ctx.pendencia], rdo_registros: ['id', ctx.rdo],
    restricoes: ['id', ctx.restricao], restricoes_planejamento: ['id', ctx.restricaoPlan],
    obra_membros: ['id', ctx.membroAlvo], profiles: ['id', ctx.perfilAlvo],
  }
  for (const t of TABELAS) {
    const [coluna, id] = apagaveis[t] || [primeiraColuna(t), valorImpossivel(t)]
    const r = await sb.from(t).delete({ count: 'exact' }).eq(coluna, id)
    registrar(t, 'APAGAR', cfg.apagar.includes(t), r, 'apagou', 'nada foi apagado')
  }

  // --- Funções e arquivos ---
  const virada = await sb.rpc('rodar_virada')
  linha(virada.error ? 'fechada' : 'aberta', quem, 'função rodar_virada', 'CHAMAR', virada.error ? virada.error.message.slice(0, 60) : 'executou')
  const admin = await fetch(`${URL_SUPABASE}/functions/v1/admin-usuarios`, {
    method: 'POST', headers: { apikey: CHAVE_PUBLICA, Authorization: `Bearer ${entrada.data.session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ acao: 'criar', nome: 'Intruso', email: 'intruso@example.com', role: 'Coordenador', obraIds: [] }),
  })
  linha(admin.status === 403 ? 'fechada' : 'aberta', quem, 'função admin-usuarios', 'CRIAR um Coordenador', `resposta ${admin.status}`)
  const arquivoAlheio = await sb.storage.from('fotos').createSignedUrl(ctx.arquivoDeOutraObra, 60)
  linha(arquivoAlheio.error ? 'fechada' : 'aberta', quem, 'arquivo de OUTRA obra (fotos)', 'ABRIR', arquivoAlheio.error ? 'o banco recusou' : 'gerou link de acesso')
  const subirOutra = await sb.storage.from('fotos').upload(`${ctx.obra2}/qualidade/zz-${Date.now()}.txt`, new Blob(['x']), { contentType: 'text/plain' })
  linha(subirOutra.error ? 'fechada' : 'aberta', quem, 'arquivos de OUTRA obra (fotos)', 'ENVIAR', subirOutra.error ? 'o banco recusou' : 'enviou')
  await sb.auth.signOut()
}

// ---------------------------------------------------------------------------------------------------------------
await estranhoSemLogin()
if (process.env.TESTE_PAPEL) {
  const ctx = JSON.parse(process.env.TESTE_CTX || '{}')
  await intrusoLogado(process.env.TESTE_PAPEL, process.env.TESTE_EMAIL, process.env.TESTE_SENHA, ctx)
}
console.log(`\nRESUMO: ${fechadas} 🔒 fechadas · ${permitidas} 🟢 permitidas pelo papel · ${abertas} 🚨 abertas · ${inconclusivas} ❓ inconclusivas`)
process.exit(abertas || inconclusivas ? 1 : 0)
