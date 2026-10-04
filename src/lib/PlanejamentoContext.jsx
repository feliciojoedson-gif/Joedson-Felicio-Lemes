import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useDados } from './DadosContext.jsx'
import {
  arquivarAtividadeDaObra, importarAtividades, listarPlanejamento, reprogramarRestricaoDaObra, resolverRestricaoDaObra, salvarAtividade,
  salvarBaseline, salvarCalendario, salvarRestricao, substituirAtividade,
} from './dados.js'

const Ctx = createContext(null)
const VAZIO = { status: 'carregando', atividades: [], restricoes: [], baseline: null, calendario: null }
const doBanco = (data) => ({
  status: 'pronto', atividades: data.atividades, restricoes: data.restricoes || [], baseline: data.baseline || null, calendario: data.calendario,
})

// UM estado só para o módulo inteiro: as quatro abas leem e gravam a mesma lista de atividades,
// então uma mudança numa aba aparece nas outras sem ninguém avisar ninguém.
// Vive dentro da tela Planejamento, que o Shell remonta ao trocar de obra: obra nova, estado novo.
export function PlanejamentoProvider({ children }) {
  const { obra, hoje } = useDados()
  const [estado, setEstado] = useState(VAZIO)
  const [rodada, setRodada] = useState(0)

  useEffect(() => {
    let vivo = true
    listarPlanejamento(obra).then(({ data, erro }) => {
      if (!vivo) return
      setEstado(erro || !data ? { ...VAZIO, status: 'erro' } : doBanco(data))
    }).catch(() => vivo && setEstado({ ...VAZIO, status: 'erro' }))
    return () => { vivo = false }
  }, [obra, rodada])

  const tentarDeNovo = useCallback(() => {
    setEstado(VAZIO)
    setRodada((n) => n + 1)
  }, [])

  // Toda gravação passa por aqui: troca o estado pela foto nova ou devolve o texto do erro.
  const gravar = async (operacao) => {
    try {
      const { data, erro } = await operacao()
      if (erro || !data) return 'Não consegui salvar. Tente de novo.'
      setEstado(doBanco(data))
      return null
    } catch (_) {
      return 'Não consegui salvar. Tente de novo.'
    }
  }

  const valor = {
    obra, hoje, status: estado.status, atividades: estado.atividades, restricoes: estado.restricoes, baseline: estado.baseline, calendario: estado.calendario, tentarDeNovo,
    salvarAtividade: (campos, id) => gravar(() => salvarAtividade(obra, campos, id)),
    arquivarAtividade: (id, arquivada) => gravar(() => arquivarAtividadeDaObra(obra, id, arquivada)),
    importarAtividades: (lista, modo) => gravar(() => importarAtividades(obra, lista, modo)),
    salvarRestricao: (campos, id) => gravar(() => salvarRestricao(obra, campos, id)),
    resolverRestricao: (id, resolvida) => gravar(() => resolverRestricaoDaObra(obra, id, resolvida, hoje)),
    reprogramarRestricao: (id, prazo) => gravar(() => reprogramarRestricaoDaObra(obra, id, prazo)),
    substituirAtividade: (atividade) => gravar(() => substituirAtividade(obra, atividade)),
    salvarBaseline: () => gravar(() => salvarBaseline(obra, hoje)),
    salvarCalendario: (calendario) => gravar(() => salvarCalendario(obra, calendario)),
  }
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

export const usePlanejamento = () => useContext(Ctx)
