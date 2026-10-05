import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useDados } from './DadosContext.jsx'
import {
  adicionarObservacaoPendencia, criarPendencia, excluirGemba, excluirModeloFvs, excluirPendencia, listarGemba, listarModelosFvs, listarNcs, listarPendencias,
  listarVistorias, mudarStatusPendencia, registrarNc, salvarGemba, salvarModeloFvs, salvarNc, salvarVistoria,
} from './dados.js'
import {
  acrescentarObservacao, aplicarAcaoNc, aplicarMudanca, errosFinalizar, errosMarcacao, errosMudanca, finalizarVistoria, itensDaVistoria,
  marcarItem, normalizarModelo, novaNc, novaObservacaoGemba, novaPendencia, novaVistoria, proximoCodigoNc, proximoNumero,
} from './qualidade.js'

const Ctx = createContext(null)
const FALHA = 'Não consegui salvar. Tente de novo.'
const FILTROS_PENDENCIAS = { status: '', responsavel: '', prazo: '', busca: '' }
const FILTROS_GEMBA = { tipo: '', prazo: '', busca: '' }
const VAZIO = { status: 'carregando', pendencias: [], modelos: [], vistorias: [], ncs: [], gemba: [] }
const novoId = () => crypto.randomUUID()

// UM estado para o módulo inteiro (as abas e o relatório leem o mesmo). Vive dentro da tela Qualidade,
// que o Shell remonta ao trocar de obra: obra nova, estado novo.
// Toda gravação é otimista: a tela muda na hora; se o salvamento falhar, volta ao que era e devolve o texto do erro.
// Registros novos já nascem com id próprio (uuid) e com número/código calculados aqui, então a tela não espera o banco.
export function QualidadeProvider({ children }) {
  const { obra, hoje, usuario } = useDados()
  const [estado, setEstado] = useState(VAZIO)
  const [filtrosPend, setFiltrosPend] = useState(FILTROS_PENDENCIAS)
  const [filtrosGemba, setFiltrosGemba] = useState(FILTROS_GEMBA)
  const [filtroNc, setFiltroNc] = useState('')
  const [rodada, setRodada] = useState(0)

  useEffect(() => {
    let vivo = true
    Promise.all([listarPendencias(obra), listarModelosFvs(), listarVistorias(obra), listarNcs(obra), listarGemba(obra)]).then((r) => {
      if (!vivo) return
      const falhou = r.some(({ data, erro }) => erro || !data)
      setEstado(falhou ? { ...VAZIO, status: 'erro' } : {
        status: 'pronto', pendencias: r[0].data, modelos: r[1].data, vistorias: r[2].data, ncs: r[3].data, gemba: r[4].data,
      })
    }).catch(() => vivo && setEstado({ ...VAZIO, status: 'erro' }))
    return () => { vivo = false }
  }, [obra, rodada])

  const tentarDeNovo = useCallback(() => {
    setEstado(VAZIO)
    setRodada((n) => n + 1)
  }, [])

  const { pendencias, modelos, vistorias, ncs, gemba } = estado
  const mutar = (fn) => setEstado((e) => ({ ...e, ...fn(e) }))
  // Aplica `otimista` já; se `operacao` falhar, restaura o estado de antes. `depois(data)` acerta o que o banco devolveu.
  const gravar = async (otimista, operacao, depois) => {
    const antes = estado
    mutar(otimista)
    try {
      const { data, erro } = await operacao()
      if (erro || !data) throw erro || new Error('sem retorno')
      if (depois) mutar((e) => depois(e, data))
      // O registro está salvo; só a foto ficou de fora. A tela mostra o aviso sem desfazer nada.
      return data.fotoFalhou ? 'Registro salvo, mas a foto não subiu. Tente anexar de novo.' : null
    } catch (e) {
      setEstado(antes)
      return e?.regra ? e.message : FALHA
    }
  }
  const trocarPor = (lista, registro) => lista.map((x) => (x.id === registro.id ? registro : x))
  const trocarPend = (id, fn) => (e) => ({ pendencias: e.pendencias.map((p) => (p.id === id ? fn(p) : p)) })
  const agora = () => new Date()

  const valor = {
    obra, hoje, status: estado.status, pendencias, modelos, vistorias, ncs, gemba, tentarDeNovo, filtrosPend, setFiltrosPend, filtrosGemba, setFiltrosGemba, filtroNc, setFiltroNc,
    limparFiltrosPend: () => setFiltrosPend(FILTROS_PENDENCIAS),
    limparFiltrosGemba: () => setFiltrosGemba(FILTROS_GEMBA),

    // ----- Pendências -----
    criarPendencia: (campos) => {
      const provisoria = novaPendencia(campos, { id: `novo-${novoId()}`, obraCodigo: obra.codigo, numeroRegistro: proximoNumero(pendencias) }, usuario.nome)
      return gravar(
        (e) => ({ pendencias: [...e.pendencias, provisoria] }),
        () => criarPendencia(obra, campos, usuario.nome),
        (e, real) => ({ pendencias: e.pendencias.map((p) => (p.id === provisoria.id ? real : p)) }),
      )
    },
    mudarStatus: (id, para, dados = {}) => {
      const atual = pendencias.find((p) => p.id === id)
      const recusa = atual && errosMudanca(atual, para, dados)
      if (recusa) return Promise.resolve(recusa)
      return gravar(trocarPend(id, (p) => aplicarMudanca(p, para, dados, hoje)), () => mudarStatusPendencia(obra, id, para, dados, hoje))
    },
    adicionarObservacao: (id, texto) => {
      const quando = agora()
      return gravar(trocarPend(id, (p) => ({ ...p, observacoes: acrescentarObservacao(p.observacoes, texto, quando) })), () => adicionarObservacaoPendencia(obra, id, texto, quando))
    },
    excluirPendencia: (id) => gravar((e) => ({ pendencias: e.pendencias.filter((p) => p.id !== id) }), () => excluirPendencia(obra, id)),

    // ----- FVS: modelos -----
    // `id` vazio cria; com `id` edita (e a versão sobe, porque as vistorias já feitas guardam a cópia da versão antiga).
    salvarModelo: (campos, id) => {
      const antigo = modelos.find((m) => m.id === id)
      const modelo = normalizarModelo(campos, antigo ? antigo.id : novoId(), antigo ? antigo.versao + 1 : 1)
      return gravar(
        (e) => ({ modelos: antigo ? trocarPor(e.modelos, modelo) : [...e.modelos, modelo] }),
        () => salvarModeloFvs(modelo),
      )
    },
    excluirModelo: (id) => gravar((e) => ({ modelos: e.modelos.filter((m) => m.id !== id) }), () => excluirModeloFvs(id)),

    // ----- FVS: vistorias -----
    // Devolve { id, promessa }: a tela abre a vistoria na hora e a promessa traz o erro, se houver.
    criarVistoria: (modeloId, ambiente) => {
      const vistoria = novaVistoria(modelos.find((m) => m.id === modeloId), ambiente, { id: novoId(), obraCodigo: obra.codigo, hoje, quem: usuario.nome })
      return { id: vistoria.id, promessa: gravar((e) => ({ vistorias: [...e.vistorias, vistoria] }), () => salvarVistoria(obra, vistoria)) }
    },
    marcarItem: (vistoriaId, itemId, resposta) => {
      const v = vistorias.find((x) => x.id === vistoriaId)
      const recusa = errosMarcacao(v, itemId, resposta, ncs)
      if (recusa) return Promise.resolve(recusa)
      const nova = marcarItem(v, itemId, resposta)
      return gravar((e) => ({ vistorias: trocarPor(e.vistorias, nova) }), () => salvarVistoria(obra, nova))
    },
    // Marcar NC: grava a não conformidade (com o código seguinte da obra) e a resposta do item.
    registrarNc: (vistoriaId, itemId, campos) => {
      const v = vistorias.find((x) => x.id === vistoriaId)
      if (v.status === 'concluida') return Promise.resolve('Vistoria concluída: só leitura.')
      const item = itensDaVistoria(v).find((i) => String(i.id) === String(itemId))
      const nc = novaNc(campos, { id: novoId(), codigo: proximoCodigoNc(ncs), vistoria: v, item, hoje, quem: usuario.nome, agora: agora() })
      const nova = marcarItem(v, itemId, 'nc')
      return gravar(
        (e) => ({ vistorias: trocarPor(e.vistorias, nova), ncs: [...e.ncs, nc] }),
        () => registrarNc(obra, nova, nc),
      )
    },
    finalizarVistoria: (vistoriaId) => {
      const v = vistorias.find((x) => x.id === vistoriaId)
      const recusa = errosFinalizar(v)
      if (recusa) return Promise.resolve(recusa)
      const nova = finalizarVistoria(v, hoje)
      return gravar((e) => ({ vistorias: trocarPor(e.vistorias, nova) }), () => salvarVistoria(obra, nova))
    },

    // ----- Gemba Walk -----
    criarGemba: (campos) => {
      const obs = novaObservacaoGemba(campos, { id: novoId(), obraCodigo: obra.codigo })
      return gravar((e) => ({ gemba: [...e.gemba, obs] }), () => salvarGemba(obra, obs))
    },
    // Mover entre colunas (pendente, em andamento, resolvido): qualquer coluna para qualquer outra.
    moverGemba: (id, status) => {
      const nova = { ...gemba.find((o) => o.id === id), status }
      return gravar((e) => ({ gemba: trocarPor(e.gemba, nova) }), () => salvarGemba(obra, nova))
    },
    excluirGemba: (id) => gravar((e) => ({ gemba: e.gemba.filter((o) => o.id !== id) }), () => excluirGemba(obra, id)),

    // ----- FVS: não conformidades -----
    agirNaNc: (id, chave) => {
      const nc = ncs.find((n) => n.id === id)
      const nova = aplicarAcaoNc(nc, chave, usuario.nome, agora(), hoje)
      if (!nova) return Promise.resolve('Esta NC não pode ir para esse passo.')
      return gravar((e) => ({ ncs: trocarPor(e.ncs, nova) }), () => salvarNc(obra, nova))
    },
  }
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

export const useQualidade = () => useContext(Ctx)
