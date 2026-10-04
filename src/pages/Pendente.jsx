import { Logo } from '../components/index.jsx'

export default function Pendente({ onSair }) {
  return (
    <div className="login">
      <div className="box">
        <div className="marca">
          <Logo />
          <h1 className="sr-only">Kaefer Rip</h1>
        </div>
        <div className="corpo">
          <div className="empty" style={{ padding: '24px 12px' }}>
            <h3>Quase lá</h3>
            <p>Conta aguardando liberação do administrador.</p>
          </div>
          <button className="btn secondary block" onClick={onSair}>Sair</button>
        </div>
      </div>
    </div>
  )
}
