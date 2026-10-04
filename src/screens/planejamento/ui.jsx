import { useState, useSyncExternalStore } from 'react'
import { Vazio } from '../../components/index.jsx'
import { usePlanejamento } from '../../lib/PlanejamentoContext.jsx'

// Peças de formulário do módulo Planejamento (mesmo comportamento das do Kanban de Materiais).

// Tela larga (computador/tablet) ou estreita (celular): o cronograma troca o gráfico por uma lista.
const consulta = '(min-width: 700px)'
const assinar = (aviso) => {
  const m = window.matchMedia(consulta)
  m.addEventListener('change', aviso)
  return () => m.removeEventListener('change', aviso)
}
export const useTelaLarga = () => useSyncExternalStore(assinar, () => window.matchMedia(consulta).matches, () => true)

// Validação na hora: o aviso aparece quando o campo perde o foco ou quando a pessoa tenta salvar.
export function useAvisos(erros) {
  const [tocados, setTocados] = useState({})
  const [tentou, setTentou] = useState(false)
  return {
    aviso: (campo) => (tentou || tocados[campo]) && erros[campo],
    tocar: (campo) => setTocados((t) => ({ ...t, [campo]: true })),
    tentar: () => { setTentou(true); return Object.keys(erros).length === 0 },
  }
}

export function Aviso({ texto }) {
  return texto ? <div className="erro" role="alert">{texto}</div> : null
}

// Confirmação dentro da própria tela (o window.confirm some em navegador embutido e o clique "não faz nada").
// `pedir(texto, aoConfirmar, rotulo)` abre a caixa; `caixa` deve ser renderizado uma vez, fora de qualquer painel.
export function useConfirmar() {
  const [pedido, setPedido] = useState(null)
  const pedir = (texto, aoConfirmar, rotulo = 'Confirmar') => setPedido({ texto, aoConfirmar, rotulo })
  const caixa = pedido && (
    <div className="sheet-fundo confirma" onClick={() => setPedido(null)}>
      <div className="sheet" role="alertdialog" aria-modal="true" aria-label="Confirmação" onClick={(e) => e.stopPropagation()}>
        <p className="confirma-texto">{pedido.texto}</p>
        <div className="form-actions">
          <button type="button" className="btn" onClick={() => { const f = pedido.aoConfirmar; setPedido(null); f() }}>{pedido.rotulo}</button>
          <button type="button" className="btn secondary" onClick={() => setPedido(null)}>Voltar</button>
        </div>
      </div>
    </div>
  )
  return { pedir, caixa }
}

// Painel que sobe. Se a pessoa já preencheu algo, fechar pede confirmação.
export function Folha({ titulo, sujo, larga, onFechar, children }) {
  const { pedir, caixa } = useConfirmar()
  const fechar = () => {
    if (sujo) pedir('Descartar? O que você preencheu será perdido.', onFechar, 'Descartar')
    else onFechar()
  }
  return (
    <>
    <div className="sheet-fundo" onClick={fechar}>
      <div
        className={`sheet ${larga ? 'larga' : ''}`} role="dialog" aria-modal="true" aria-label={titulo}
        onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.key === 'Escape' && fechar()}
      >
        <h2>{titulo}</h2>
        {children(fechar)}
      </div>
    </div>
    {caixa}
    </>
  )
}

// Os quatro estados de toda aba: carregando, erro (com "tentar de novo"), vazio (com convite) e sucesso.
export function Estado({ vazio, children }) {
  const { status, tentarDeNovo } = usePlanejamento()
  if (status === 'carregando') return <p className="mono" role="status">Carregando o planejamento…</p>
  if (status === 'erro') {
    return (
      <Vazio icone="restricoes" titulo="Não consegui carregar o planejamento" texto="Verifique a conexão e tente de novo.">
        <button type="button" className="btn" onClick={tentarDeNovo}>Tentar de novo</button>
      </Vazio>
    )
  }
  return vazio || children
}
