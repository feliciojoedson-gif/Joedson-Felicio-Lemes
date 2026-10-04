import { useState } from 'react'
import Login from './pages/Login.jsx'
import Pendente from './pages/Pendente.jsx'
import Shell from './pages/Shell.jsx'
import { DadosProvider } from './lib/DadosContext.jsx'

// Fase de mock: o "login" escolhe um dos usuários de exemplo. Na etapa do Supabase,
// este componente passa a escutar supabase.auth e buscar o perfil em `profiles`.
export default function App() {
  const [usuario, setUsuario] = useState(null)
  const sair = () => setUsuario(null)

  if (!usuario) return <Login onEntrar={setUsuario} />
  if (usuario.role === 'Pendente') return <Pendente onSair={sair} />
  return (
    <DadosProvider usuario={usuario}>
      <Shell onSair={sair} />
    </DadosProvider>
  )
}
