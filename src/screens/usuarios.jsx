import { useEffect, useState } from 'react'
import { Chip, Vazio } from '../components/index.jsx'
import { useDados } from '../lib/DadosContext.jsx'
import { adminUsuarios } from '../lib/dados.js'
import { errosLiberacao, PERFIS_LIBERAVEIS } from '../lib/cadastros.js'
import { modulosDoPerfil, ROTULOS, veTodasAsObras } from '../lib/regras.js'
import { Aviso, Folha, useConfirmar } from './planejamento/ui.jsx'
import { Campo, Opcoes } from './cadastros.jsx'

// Painel de usuários: lista de todo mundo e as ações do administrador. Tudo passa pela Edge Function admin-usuarios
// (a chave de serviço só existe lá); aqui a tela só pede e mostra o resultado em português.

const quando = (iso) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Nunca entrou')
const situacaoDe = (p) => (p.role === 'Pendente' ? ['Aguardando liberação', 'warn'] : p.ativo ? ['Ativo', 'ok'] : ['Bloqueado', 'bad'])

function EscolhaDeObras({ obras, valor, onTroca, erro }) {
  const alternar = (id) => onTroca(valor.includes(id) ? valor.filter((o) => o !== id) : [...valor, id])
  return (
    <div className="field">
      <span className="lb">Obras liberadas</span>
      {obras.map((o) => (
        <label key={o.id} style={{ display: 'block' }}>
          <input type="checkbox" checked={valor.includes(o.id)} onChange={() => alternar(o.id)} /> {o.codigo} — {o.nome}
        </label>
      ))}
      <Aviso texto={erro} />
    </div>
  )
}

// Chaves de módulo: ligado = a pessoa vê no menu; desligado = some do menu dela. Só os módulos que o perfil dela já tem.
function EscolhaDeModulos({ role, desligados, onTroca }) {
  const modulos = modulosDoPerfil(role)
  if (!modulos.length) return null
  const alternar = (k) => onTroca(desligados.includes(k) ? desligados.filter((m) => m !== k) : [...desligados, k])
  return (
    <div className="field">
      <span className="lb">Módulos liberados (desmarque para esconder do menu desta pessoa)</span>
      {modulos.map((k) => (
        <label key={k} style={{ display: 'block' }}>
          <input type="checkbox" checked={!desligados.includes(k)} onChange={() => alternar(k)} /> {ROTULOS[k]}
        </label>
      ))}
    </div>
  )
}

// Mostra a senha provisória UMA vez. Depois de fechar, ela não existe mais em lugar nenhum.
function SenhaUnica({ titulo, email, senha, onFechar }) {
  const [copiado, setCopiado] = useState(false)
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(senha)
      setCopiado(true)
    } catch (_) {
      setCopiado(false)
    }
  }
  return (
    <Folha titulo={titulo} sujo={false} onFechar={onFechar}>
      {() => (
        <>
          <p>Mande estes dados para a pessoa. <b>Esta senha aparece só agora</b>: depois de fechar esta janela, ela não pode mais ser vista.</p>
          <div className="card">
            <div className="mono">E-mail</div><b>{email}</b>
            <div className="mono" style={{ marginTop: 10 }}>Senha provisória</div>
            <b style={{ fontSize: '1.4rem', letterSpacing: '.05em', userSelect: 'all' }}>{senha}</b>
          </div>
          <div className="form-actions">
            <button type="button" className="btn" onClick={copiar}>{copiado ? 'Copiado!' : 'Copiar senha'}</button>
            <button type="button" className="btn secondary" onClick={onFechar}>Já anotei, fechar</button>
          </div>
        </>
      )}
    </Folha>
  )
}

function FormNovo({ obras, onFechar, onCriado }) {
  const [c, setC] = useState({ nome: '', email: '', role: '', obraIds: [], modulosDesligados: [] })
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [tentou, setTentou] = useState(false)
  const erros = {
    ...(c.nome.trim() ? {} : { nome: 'Informe o nome.' }),
    ...(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email.trim()) ? {} : { email: 'Informe um e-mail válido.' }),
    ...errosLiberacao(c, veTodasAsObras),
  }
  const ver = (k) => tentou && erros[k]
  const criar = async () => {
    setTentou(true)
    if (Object.keys(erros).length) return
    setEnviando(true)
    setErro('')
    const { data, erro: falha } = await adminUsuarios('criar', { nome: c.nome.trim(), email: c.email.trim(), role: c.role, obraIds: c.obraIds, modulosDesligados: c.modulosDesligados })
    setEnviando(false)
    if (falha) return setErro(falha.message)
    onCriado(data)
  }
  return (
    <Folha titulo="Novo usuário" sujo={Boolean(c.nome || c.email)} onFechar={onFechar}>
      {(fechar) => (
        <>
          <Campo id="nu-nome" rotulo="Nome" erro={ver('nome')}>
            <input id="nu-nome" className="input" maxLength={80} value={c.nome} onChange={(e) => setC({ ...c, nome: e.target.value })} />
          </Campo>
          <Campo id="nu-email" rotulo="E-mail" erro={ver('email')}>
            <input id="nu-email" className="input" type="email" autoComplete="off" value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} />
          </Campo>
          <Campo id="nu-role" rotulo="Perfil" erro={ver('role')}>
            <select id="nu-role" className="input" value={c.role} onChange={(e) => setC({ ...c, role: e.target.value, modulosDesligados: [] })}><Opcoes lista={PERFIS_LIBERAVEIS} vazio="Escolha…" /></select>
          </Campo>
          {c.role && (veTodasAsObras(c.role)
            ? <p className="mono">Este perfil enxerga todas as obras.</p>
            : <EscolhaDeObras obras={obras} valor={c.obraIds} onTroca={(obraIds) => setC({ ...c, obraIds })} erro={ver('obras')} />)}
          {c.role && <EscolhaDeModulos role={c.role} desligados={c.modulosDesligados} onTroca={(modulosDesligados) => setC({ ...c, modulosDesligados })} />}
          <Aviso texto={erro} />
          <div className="form-actions">
            <button type="button" className="btn" disabled={enviando} onClick={criar}>{enviando ? 'Criando…' : 'Criar usuário'}</button>
            <button type="button" className="btn secondary" onClick={fechar}>Cancelar</button>
          </div>
        </>
      )}
    </Folha>
  )
}

// Troca o perfil e as obras de uma pessoa (e libera uma conta pendente).
function FormAcesso({ pessoa, obras, onFechar, onFeito }) {
  const pendente = pessoa.role === 'Pendente'
  const [c, setC] = useState({ role: pendente ? '' : pessoa.role, obraIds: pessoa.obraIds, modulosDesligados: pessoa.modulosDesligados || [] })
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [tentou, setTentou] = useState(false)
  const erros = errosLiberacao(c, veTodasAsObras)
  const salvar = async () => {
    setTentou(true)
    if (Object.keys(erros).length) return
    setEnviando(true)
    setErro('')
    const { erro: falha } = await adminUsuarios('atualizar', { perfilId: pessoa.id, role: c.role, obraIds: c.obraIds, modulosDesligados: c.modulosDesligados.filter((m) => modulosDoPerfil(c.role).includes(m)) })
    setEnviando(false)
    if (falha) return setErro(falha.message)
    onFeito(pendente ? 'Conta liberada.' : 'Acesso atualizado.')
  }
  return (
    <Folha titulo={pendente ? `Liberar ${pessoa.nome}` : `Perfil e obras de ${pessoa.nome}`} sujo={false} onFechar={onFechar}>
      {(fechar) => (
        <>
          <p className="mono">{pessoa.email}</p>
          <Campo id="ac-role" rotulo="Perfil" erro={tentou && erros.role}>
            <select id="ac-role" className="input" value={c.role} onChange={(e) => setC({ ...c, role: e.target.value, modulosDesligados: [] })}><Opcoes lista={PERFIS_LIBERAVEIS} vazio="Escolha…" /></select>
          </Campo>
          {c.role && (veTodasAsObras(c.role)
            ? <p className="mono">Este perfil enxerga todas as obras.</p>
            : <EscolhaDeObras obras={obras} valor={c.obraIds} onTroca={(obraIds) => setC({ ...c, obraIds })} erro={tentou && erros.obras} />)}
          {c.role && <EscolhaDeModulos role={c.role} desligados={c.modulosDesligados} onTroca={(modulosDesligados) => setC({ ...c, modulosDesligados })} />}
          <Aviso texto={erro} />
          <div className="form-actions">
            <button type="button" className="btn" disabled={enviando} onClick={salvar}>{enviando ? 'Salvando…' : pendente ? 'Liberar' : 'Salvar'}</button>
            <button type="button" className="btn secondary" onClick={fechar}>Cancelar</button>
          </div>
        </>
      )}
    </Folha>
  )
}

// Excluir apaga o login. Só depois de digitar o nome; se a pessoa tem registros lançados, a função recusa e a tela oferece bloquear.
function FormExcluir({ pessoa, onFechar, onFeito, onBloquear }) {
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [temRegistros, setTemRegistros] = useState(false)
  const confere = nome.trim() === pessoa.nome.trim()
  const excluir = async () => {
    setEnviando(true)
    setErro('')
    const { erro: falha } = await adminUsuarios('excluir', { perfilId: pessoa.id, confirmaNome: nome })
    setEnviando(false)
    if (falha) {
      setTemRegistros(/registro\(s\) lançado/.test(falha.message))
      return setErro(falha.message)
    }
    onFeito('Usuário excluído.')
  }
  return (
    <Folha titulo={`Excluir ${pessoa.nome}`} sujo={false} onFechar={onFechar}>
      {(fechar) => (
        <>
          <p>Isto apaga o login de <b>{pessoa.nome}</b> e não pode ser desfeito. É para cadastro feito errado. Quem saiu da equipe deve ser <b>bloqueado</b>, não excluído.</p>
          <Campo id="ex-nome" rotulo={`Digite o nome para confirmar: ${pessoa.nome}`}>
            <input id="ex-nome" className="input" autoComplete="off" value={nome} onChange={(e) => setNome(e.target.value)} />
          </Campo>
          <Aviso texto={erro} />
          <div className="form-actions">
            <button type="button" className="btn" disabled={!confere || enviando} onClick={excluir}>{enviando ? 'Excluindo…' : 'Excluir definitivamente'}</button>
            {temRegistros && pessoa.ativo && <button type="button" className="btn accent" onClick={onBloquear}>Bloquear no lugar</button>}
            <button type="button" className="btn secondary" onClick={fechar}>Cancelar</button>
          </div>
        </>
      )}
    </Folha>
  )
}

export default function PainelUsuarios({ avisar }) {
  const { obras, usuario } = useDados()
  const [estado, setEstado] = useState({ status: 'carregando', lista: [] })
  const [rodada, setRodada] = useState(0)
  const [novo, setNovo] = useState(false)
  const [acesso, setAcesso] = useState(null)
  const [excluindo, setExcluindo] = useState(null)
  const [senha, setSenha] = useState(null)
  const { pedir, caixa } = useConfirmar()

  useEffect(() => {
    let vivo = true
    adminUsuarios('listar').then(({ data, erro }) => {
      if (vivo) setEstado(erro || !data ? { status: 'erro', lista: [], texto: erro?.message } : { status: 'pronto', lista: data.usuarios })
    })
    return () => { vivo = false }
  }, [rodada])
  const recarregar = () => setRodada((n) => n + 1)

  const agir = async (acao, pessoa, mensagemOk) => {
    const { data, erro } = await adminUsuarios(acao, { perfilId: pessoa.id })
    if (erro) return avisar(erro.message)
    recarregar()
    if (data?.senhaProvisoria) setSenha({ titulo: `Nova senha de ${pessoa.nome}`, email: data.email, senha: data.senhaProvisoria })
    else avisar(mensagemOk)
  }
  const feito = (texto) => { setAcesso(null); setExcluindo(null); recarregar(); avisar(texto) }
  const codigosDe = (p) => (veTodasAsObras(p.role) ? 'Todas as obras' : p.obraIds.map((id) => obras.find((o) => o.id === id)?.codigo || '?').join(', ') || 'Nenhuma obra')

  const ordenada = [...estado.lista].sort((a, b) => (b.role === 'Pendente') - (a.role === 'Pendente') || a.nome.localeCompare(b.nome))

  return (
    <>
      <div className="form-actions" style={{ gridTemplateColumns: '1fr', marginBottom: 12 }}>
        <button type="button" className="btn" onClick={() => setNovo(true)}>Novo usuário</button>
      </div>
      {estado.status === 'carregando' && <p className="mono" role="status">Carregando usuários…</p>}
      {estado.status === 'erro' && (
        <Vazio icone="admin" titulo="Não consegui carregar os usuários" texto={estado.texto || 'Verifique a conexão e tente de novo.'}>
          <button type="button" className="btn" onClick={() => { setEstado({ status: 'carregando', lista: [] }); recarregar() }}>Tentar de novo</button>
        </Vazio>
      )}
      {ordenada.map((p) => {
        const [rotulo, tom] = situacaoDe(p)
        const eu = p.id === usuario.id
        const pendente = p.role === 'Pendente'
        return (
          <div className="row-card" key={p.id} style={{ flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 260px' }}>
              <div className="t">{p.nome} {eu && <span className="mono">(você)</span>}</div>
              <div className="s">{p.email}</div>
              <div className="s">{pendente ? 'Sem perfil ainda' : p.role} · {codigosDe(p)}</div>
              {p.modulosDesligados?.length > 0 && <div className="s">Módulos desligados: {p.modulosDesligados.map((k) => ROTULOS[k] || k).join(', ')}</div>}
              <div className="s">Último acesso: {quando(p.ultimoAcesso)}</div>
            </div>
            <Chip tom={tom}>{rotulo}</Chip>
            {!eu && (
              <div className="form-actions" style={{ flex: '1 1 100%', marginTop: 8 }}>
                <button type="button" className="btn secondary" onClick={() => setAcesso(p)}>{pendente ? 'Liberar' : 'Perfil e obras'}</button>
                {!pendente && <button type="button" className="btn secondary" onClick={() => pedir(`Criar uma senha nova para ${p.nome}? A senha atual deixa de funcionar.`, () => agir('redefinir', p), 'Criar senha nova')}>Nova senha</button>}
                {!pendente && (p.ativo
                  ? <button type="button" className="btn secondary" onClick={() => pedir(`Bloquear ${p.nome}? A pessoa perde o acesso agora; o que ela lançou continua no app.`, () => agir('bloquear', p, 'Conta bloqueada.'), 'Bloquear')}>Bloquear</button>
                  : <button type="button" className="btn secondary" onClick={() => agir('desbloquear', p, 'Conta desbloqueada.')}>Desbloquear</button>)}
                <button type="button" className="btn secondary q-excluir-inline" onClick={() => setExcluindo(p)}>Excluir</button>
              </div>
            )}
          </div>
        )
      })}
      {novo && <FormNovo obras={obras} onFechar={() => setNovo(false)} onCriado={(d) => { setNovo(false); recarregar(); setSenha({ titulo: 'Usuário criado', email: d.email, senha: d.senhaProvisoria }) }} />}
      {acesso && <FormAcesso pessoa={acesso} obras={obras} onFechar={() => setAcesso(null)} onFeito={feito} />}
      {excluindo && (
        <FormExcluir pessoa={excluindo} onFechar={() => setExcluindo(null)} onFeito={feito}
          onBloquear={() => { const p = excluindo; setExcluindo(null); agir('bloquear', p, 'Conta bloqueada.') }} />
      )}
      {senha && <SenhaUnica {...senha} onFechar={() => setSenha(null)} />}
      {caixa}
    </>
  )
}
