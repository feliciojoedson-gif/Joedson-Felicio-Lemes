import { useState } from 'react'
import { Logo } from '../components/index.jsx'
import { listarPerfisDeTeste } from '../lib/dados.js'

export default function Login({ onEntrar }) {
  const [aviso, setAviso] = useState('')
  const usuarios = listarPerfisDeTeste()
  const aindaNao = () => setAviso('O login de verdade chega com o banco. Por enquanto, entre por um perfil de teste abaixo.')

  return (
    <div className="login">
      <div className="box">
        <div className="marca">
          <Logo />
          <h1 className="sr-only">Kaefer Rip</h1>
        </div>
        <div className="corpo">
          <label htmlFor="login-email" className="lb">Email</label>
          <input id="login-email" className="input" type="email" placeholder="nome@empresa.com" />
          <label htmlFor="login-senha" className="lb">Senha</label>
          <input id="login-senha" className="input" type="password" />
          <button className="btn block" onClick={aindaNao}>Entrar</button>
          <button className="link" onClick={aindaNao}>Criar conta</button>
          {aviso && <div className="pending" role="status">{aviso}</div>}

          <div className="section-title">Perfis de teste</div>
          <div className="demo">
            {usuarios.map((u) => (
              <button key={u.id} onClick={() => onEntrar(u)}>
                {u.nome}
                <span>{u.role === 'Pendente' ? 'Conta nova (pendente)' : u.role}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
