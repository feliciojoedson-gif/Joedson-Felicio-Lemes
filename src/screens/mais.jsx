import { Icone, Topo } from '../components/index.jsx'
import { useDados } from '../lib/DadosContext.jsx'
import { itensDaBarra, ROTULOS } from '../lib/regras.js'

export default function Mais({ goto }) {
  const { usuario } = useDados()
  return (
    <>
      <Topo titulo="Mais" />
      <div className="menu-list">
        {itensDaBarra(usuario.role).mais.map((k) => (
          <button key={k} onClick={() => goto(k)}><Icone nome={k} />{ROTULOS[k]}</button>
        ))}
      </div>
    </>
  )
}
