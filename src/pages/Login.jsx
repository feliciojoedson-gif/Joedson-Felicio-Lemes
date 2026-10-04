import { useState } from 'react'
import { Logo } from '../components/index.jsx'
import { cadastrar, entrar } from '../lib/dados.js'

export default function Login() {
  const [criando, setCriando] = useState(false)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [aviso, setAviso] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const enviar = async (e) => {
    e.preventDefault()
    setAviso('')
    setOcupado(true)
    if (criando) {
      const { erro, confirmar } = await cadastrar(nome.trim(), email.trim(), senha)
      setAviso(erro || (confirmar ? 'Conta criada. Confirme seu email pelo link que enviamos e depois entre.' : ''))
      if (!erro && confirmar) setCriando(false)
    } else {
      const erro = await entrar(email.trim(), senha)
      if (erro) setAviso(erro)
    }
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
          {criando && (
            <>
              <label htmlFor="login-nome" className="lb">Nome</label>
              <input id="login-nome" className="input" value={nome} onChange={(e) => setNome(e.target.value)} required autoComplete="name" />
            </>
          )}
          <label htmlFor="login-email" className="lb">Email</label>
          <input id="login-email" className="input" type="email" placeholder="nome@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          <label htmlFor="login-senha" className="lb">Senha</label>
          <input id="login-senha" className="input" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={criando ? 8 : undefined} autoComplete={criando ? 'new-password' : 'current-password'} />
          <button className="btn block" type="submit" disabled={ocupado}>{criando ? 'Criar conta' : 'Entrar'}</button>
          <button className="link" type="button" onClick={() => { setCriando(!criando); setAviso('') }}>
            {criando ? 'Já tenho conta' : 'Criar conta'}
          </button>
          {aviso && <div className="pending" role="status">{aviso}</div>}
        </div>
      </form>
    </div>
  )
}
