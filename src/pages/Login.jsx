import { useState } from 'react'
import { Logo } from '../components/index.jsx'
import { entrar } from '../lib/dados.js'

// Só entrada. Não existe cadastro aqui: quem cria o login é o administrador, no Painel de admin.
export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [aviso, setAviso] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const enviar = async (e) => {
    e.preventDefault()
    setAviso('')
    setOcupado(true)
    const erro = await entrar(email.trim(), senha)
    if (erro) setAviso(erro)
    setOcupado(false)
  }

  return (
    <div className="login">
      <form className="box" onSubmit={enviar}>
        <div className="marca">
          <Logo />
          <h1 className="sr-only">Kaefer Rip</h1>
        </div>
        <div className="corpo">
          <label htmlFor="login-email" className="lb">Email</label>
          <input id="login-email" className="input" type="email" placeholder="seu.nome@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          <label htmlFor="login-senha" className="lb">Senha</label>
          <input id="login-senha" className="input" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required autoComplete="current-password" />
          <button className="btn block" type="submit" disabled={ocupado}>Entrar</button>
          <button className="link" type="button" onClick={() => setAviso('Peça uma senha nova ao administrador.')}>Esqueci minha senha</button>
          {aviso && <div className="pending" role="status">{aviso}</div>}
        </div>
      </form>
    </div>
  )
}
