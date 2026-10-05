import { useRef, useState } from 'react'
import { Icone, Logo } from '../components/index.jsx'
import { useDados } from '../lib/DadosContext.jsx'
import { itensDaBarra, menuDoPerfil, ROTULOS, telaInicial } from '../lib/regras.js'
import Painel from '../screens/painel.jsx'
import Frentes from '../screens/frentes.jsx'
import Detalhe from '../screens/detalhe.jsx'
import Diario from '../screens/diario.jsx'
import Medicoes from '../screens/medicoes.jsx'
import Restricoes from '../screens/restricoes.jsx'
import Fotos from '../screens/fotos.jsx'
import Admin from '../screens/admin.jsx'
import Perfil from '../screens/perfil.jsx'
import Mais from '../screens/mais.jsx'
import Rdo from '../screens/rdo.jsx'
import Materiais from '../screens/materiais.jsx'
import Planejamento from '../screens/planejamento.jsx'
import Relatorios from '../screens/relatorios.jsx'
import Qualidade from '../screens/qualidade.jsx'

const TELAS = {
  painel: Painel, frentes: Frentes, detalhe: Detalhe, diario: Diario, medicoes: Medicoes,
  restricoes: Restricoes, fotos: Fotos, admin: Admin, perfil: Perfil, mais: Mais, rdo: Rdo, materiais: Materiais, planejamento: Planejamento, qualidade: Qualidade, relatorios: Relatorios,
}

// Uma shell para todos os perfis: o que muda é o menu, que vem de lib/regras.js.
// Navegação por estado (sem URL): `route` guarda a tela e os parâmetros.
export default function Shell({ onSair }) {
  const { usuario, obra, obras, trocarObra } = useDados()
  const [route, setRoute] = useState({ screen: telaInicial(usuario.role), params: {}, de: null })
  const [aviso, setAviso] = useState('')
  const temporizador = useRef(null)

  const goto = (screen, params = {}) => {
    window.scrollTo(0, 0)
    setRoute((r) => ({ screen, params, de: screen === 'detalhe' ? r.screen : null }))
  }
  const avisar = (texto) => {
    setAviso(texto)
    clearTimeout(temporizador.current)
    temporizador.current = setTimeout(() => setAviso(''), 2600)
  }

  const trocar = (id) => {
    // O detalhe de uma frente é de uma obra só: ao trocar de obra, sai dele.
    if (route.screen === 'detalhe') goto(route.de || telaInicial(usuario.role))
    trocarObra(id)
  }

  const { barra, mais } = itensDaBarra(usuario.role)
  const tela = route.screen === 'detalhe' ? (route.de || 'frentes') : route.screen
  const destacarNaBarra = (k) => k === tela || (k === 'mais' && mais.includes(tela))
  const Corpo = TELAS[route.screen]

  return (
    <div className="app">
      <aside className="sidebar no-print">
        <Logo />
        <nav>
          {menuDoPerfil(usuario.role).map((k) => (
            <button key={k} className={tela === k ? 'on' : ''} onClick={() => goto(k)}>
              <Icone nome={k} />{ROTULOS[k]}
            </button>
          ))}
        </nav>
        <div className="foot"><b>{usuario.nome}</b>{usuario.role}</div>
      </aside>

      <main className="main">
        <div className="logobar no-print"><Logo /></div>
        <div className="obrabar no-print">
          <label htmlFor="obra-atual">Obra</label>
          <select id="obra-atual" value={obra?.id ?? ''} onChange={(e) => trocar(e.target.value)} disabled={!obra}>
            {obras.map((o) => <option key={o.id} value={o.id}>{o.codigo} — {o.nome}</option>)}
            {!obra && <option value="">Nenhuma obra liberada</option>}
          </select>
        </div>
        {obra
          ? <section key={obra.id}><Corpo goto={goto} params={route.params} avisar={avisar} de={route.de} onSair={onSair} /></section>
          : <div className="empty" style={{ marginTop: 16 }}><h3>Nenhuma obra liberada</h3><p>Peça ao coordenador para ligar você a uma obra.</p></div>}
      </main>

      <nav className="bottomnav no-print">
        {barra.map((k) => (
          <button key={k} className={destacarNaBarra(k) ? 'on' : ''} onClick={() => goto(k)}>
            <Icone nome={k} />{ROTULOS[k]}
          </button>
        ))}
      </nav>
      <div className={`toast no-print ${aviso ? 'show' : ''}`} role="status">{aviso}</div>
    </div>
  )
}
