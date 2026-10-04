import { Topo } from '../components/index.jsx'
import { useDados } from '../lib/DadosContext.jsx'

export default function Perfil({ onSair }) {
  const { usuario } = useDados()
  return (
    <>
      <Topo titulo="Meu perfil" />
      <div className="card">
        <div className="mono">Nome</div><b style={{ fontSize: '1.2rem' }}>{usuario.nome}</b>
        <div className="mono" style={{ marginTop: 12 }}>Email</div><div>{usuario.email}</div>
        <div className="mono" style={{ marginTop: 12 }}>Perfil</div><div>{usuario.role}</div>
      </div>
      <button className="btn secondary block" style={{ marginTop: 16 }} onClick={onSair}>Sair</button>
    </>
  )
}
