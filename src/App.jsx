import { useEffect, useState } from 'react'
import Login from './pages/Login.jsx'
import Pendente from './pages/Pendente.jsx'
import Shell from './pages/Shell.jsx'
import { DadosProvider } from './lib/DadosContext.jsx'
import { aoMudarSessao, perfilDaSessao, sair } from './lib/dados.js'

// `usuario` é o perfil em `profiles` de quem está logado. undefined = ainda descobrindo; null = sem sessão.
export default function App() {
  const [usuario, setUsuario] = useState(undefined)

  useEffect(() => {
    let vivo = true
    const atualizar = () => perfilDaSessao().then((p) => vivo && setUsuario(p))
    atualizar()
    const parar = aoMudarSessao(atualizar)
    return () => { vivo = false; parar() }
  }, [])

  if (usuario === undefined) return <div className="login"><p className="mono">Carregando…</p></div>
  if (!usuario) return <Login />
  if (usuario.role === 'Pendente') return <Pendente onSair={sair} />
  return (
    <DadosProvider usuario={usuario}>
      <Shell onSair={sair} />
    </DadosProvider>
  )
}
