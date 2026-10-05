import { useState } from 'react'
import { Aba, Chip, Icone, Topo, Vazio } from '../components/index.jsx'
import { useDados } from '../lib/DadosContext.jsx'
import { formatarData, pode, veTodasAsObras } from '../lib/regras.js'
import { FormAcesso, FormObra } from './cadastros.jsx'

const tomDaObra = { Planejamento: 'neutral', Ativa: 'ok', Suspensa: 'warn', Encerrada: 'neutral', Arquivada: 'neutral' }

// Administração é cadastro (obras e pessoas), não lançamento: é a única tela que
// lista todas as obras de uma vez, de propósito.
export default function Admin({ avisar }) {
  const { usuario, obras, perfis, membros, nomeDe } = useDados()
  const [aba, setAba] = useState('obras')
  const [formObra, setFormObra] = useState(null) // null | {} (nova) | obra
  const [acesso, setAcesso] = useState(null) // pessoa
  const podeAdministrar = pode(usuario.role, 'administrar')

  const pendentes = perfis.filter((p) => p.role === 'Pendente')
  const ativos = perfis.filter((p) => p.role !== 'Pendente')
  const qtdObras = (p) => (veTodasAsObras(p.role) ? 'todas as obras' : `${membros.filter((m) => m.profile_id === p.id).length} obras`)

  return (
    <>
      <Topo titulo="Administração">
        {aba === 'obras' && podeAdministrar && <button className="btn" onClick={() => setFormObra({})}><Icone nome="plus" />Nova obra</button>}
      </Topo>
      <Aba valor={aba} onTroca={setAba} opcoes={[['obras', 'Obras'], ['usuarios', 'Usuários']]} />

      {aba === 'obras' && (obras.length === 0
        ? <Vazio icone="admin" titulo="Sem obras" texto="Nenhuma obra cadastrada. Cadastre a primeira para começar." />
        : obras.map((o) => (
          <div className="row-card" key={o.id}>
            <div>
              <div className="t">{o.codigo} — {o.nome}</div>
              <div className="s">{o.cliente}{o.numero_contrato ? ` · contrato ${o.numero_contrato}` : ''}</div>
              <div className="s">{o.endereco}</div>
              <div className="s">Início {formatarData(o.data_inicio)} · meta de entrega {formatarData(o.data_fim_contratual)} · responsável {nomeDe(o.responsavel_id) || '—'}</div>
            </div>
            <div>
              <Chip tom={tomDaObra[o.status]}>{o.status}</Chip>
              {podeAdministrar && <button type="button" className="btn secondary" style={{ marginTop: 6 }} onClick={() => setFormObra(o)}>Editar</button>}
            </div>
          </div>
        )))}

      {aba === 'usuarios' && (
        <>
          <div className="section-title">Contas aguardando liberação</div>
          {pendentes.length === 0
            ? <span className="mono">Nenhuma conta aguardando liberação.</span>
            : pendentes.map((p) => (
              <div className="row-card" key={p.id}>
                <div><div className="t">{p.nome} <span className="pending">Aguardando liberação</span></div><div className="s">{p.email}</div></div>
                {podeAdministrar && <button className="btn secondary" onClick={() => setAcesso(p)}>Liberar</button>}
              </div>
            ))}
          <div className="section-title">Usuários</div>
          {ativos.map((p) => (
            <div className="row-card" key={p.id}>
              <div><div className="t">{p.nome}</div><div className="s">{p.role} · {qtdObras(p)}</div></div>
              <div>
                <Chip tom={p.ativo ? 'ok' : 'neutral'}>{p.ativo ? 'Ativo' : 'Bloqueado'}</Chip>
                {podeAdministrar && p.id !== usuario.id && <button type="button" className="btn secondary" style={{ marginTop: 6 }} onClick={() => setAcesso(p)}>Acesso</button>}
              </div>
            </div>
          ))}
        </>
      )}
      {formObra && <FormObra obra={formObra.id ? formObra : null} onFechar={() => setFormObra(null)} avisar={avisar} />}
      {acesso && <FormAcesso pessoa={acesso} onFechar={() => setAcesso(null)} avisar={avisar} />}
    </>
  )
}
