// CAMADA DE DADOS: única porta de entrada dos dados. Nenhuma tela lê mock.js nem o Supabase direto.
// Hoje devolve o mock já filtrado pelo que cada perfil pode ver (o mesmo que a RLS fará no banco).
// Na virada para o Supabase, só o miolo deste arquivo muda.
//
// APP MULTI-OBRA: tudo que é lançamento (frentes, diário, fotos, medições, restrições)
// sai daqui já recortado por UMA obra. Nenhuma tela recebe dado de duas obras juntas.
import * as mock from './mock.js'
import { tiposDeRestricaoVisiveis, veTodasAsObras } from './regras.js'

// Campos que o Cliente pode ler de uma frente (PRD-BACKEND, permissões de `frentes`).
const CAMPOS_DA_FRENTE_DO_CLIENTE = [
  'id', 'obra_id', 'nome', 'local', 'disciplina', 'inicio_planejado', 'fim_planejado',
  'percentual_realizado', 'eh_marco', 'peso',
]
const soCampos = (obj, campos) => Object.fromEntries(campos.map((c) => [c, obj[c]]))

export const listarPerfisDeTeste = () => mock.perfis.filter((p) => p.ativo)

// Tudo o que as telas precisam para a obra escolhida, recortado pelo perfil.
// `obraPedida` pode ser null ou de uma obra que a pessoa não enxerga: cai na primeira que ela vê.
export async function carregarBase(usuario, obraPedida) {
  const { role } = usuario
  const vazio = {
    hoje: mock.HOJE, obras: [], obra: null, frentes: [], apontamentos: [], fotos: [],
    medicoes: [], restricoes: [], perfis: [], membros: [],
  }
  if (role === 'Pendente' || !usuario.ativo) return { data: vazio, erro: null }

  const todas = veTodasAsObras(role)
  const idsVisiveis = todas
    ? mock.obras.map((o) => o.id)
    : mock.obraMembros.filter((m) => m.profile_id === usuario.id).map((m) => m.obra_id)
  const obras = mock.obras.filter((o) => idsVisiveis.includes(o.id))
  const obra = obras.find((o) => o.id === obraPedida) || obras[0] || null
  if (!obra) return { data: { ...vazio, obras }, erro: null }

  const daObra = (x) => x.obra_id === obra.id

  let frentes = mock.frentes.filter(daObra)
  if (role === 'Cliente') frentes = frentes.map((f) => soCampos(f, CAMPOS_DA_FRENTE_DO_CLIENTE))

  let apontamentos = []
  if (role === 'Coordenador' || role === 'Diretoria' || role === 'Planejamento') apontamentos = mock.apontamentos.filter(daObra)
  if (role === 'Produção') apontamentos = mock.apontamentos.filter((a) => daObra(a) && a.autor_id === usuario.id)
  if (role === 'Engenharia') apontamentos = mock.apontamentos.filter(daObra).map(({ efetivo_qtd: _efetivo, ...resto }) => resto)

  let fotos = mock.fotos.filter(daObra)
  if (role === 'Cliente') fotos = fotos.filter((f) => f.visivel_cliente)

  const medicoes = role === 'Coordenador' || role === 'Diretoria' ? mock.medicoes.filter(daObra) : []

  const tipos = tiposDeRestricaoVisiveis(role)
  const restricoes = mock.restricoes.filter((r) => daObra(r) && tipos.includes(r.tipo))

  // Pessoas e ligações são cadastro (tela de Administração), não lançamento de obra.
  let perfis = []
  if (todas) perfis = mock.perfis
  else if (role !== 'Cliente') {
    const colegas = mock.obraMembros.filter((m) => m.obra_id === obra.id).map((m) => m.profile_id)
    perfis = mock.perfis
      .filter((p) => colegas.includes(p.id) || p.id === usuario.id || p.role === 'Coordenador')
      .map(({ id, nome, role: r }) => ({ id, nome, role: r }))
  }
  const membros = todas ? mock.obraMembros : []

  return { data: { hoje: mock.HOJE, obras, obra, frentes, apontamentos, fotos, medicoes, restricoes, perfis, membros }, erro: null }
}
