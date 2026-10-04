import { useState } from 'react'
import { Aba, Chip, Icone, Topo, Vazio } from '../components/index.jsx'
import { useDados } from '../lib/DadosContext.jsx'
import { formatarData, veTodasAsObras } from '../lib/regras.js'

const tomDaObra = { Planejamento: 'neutral', Ativa: 'ok', Suspensa: 'warn', Encerrada: 'neutral', Arquivada: 'neutral' }

// Administração é cadastro (obras e pessoas), não lançamento: é a única tela que
// lista todas as obras de uma vez, de propósito.
export default function Admin({ avisar }) {
  const { obras, perfis, membros, nomeDe } = useDados()
  const [aba, setAba] = useState('obras')
  const etapa = (t) => avisar(`${t} chega na próxima etapa.`)

  const pendentes = perfis.filter((p) => p.role === 'Pendente')
  const ativos = perfis.filter((p) => p.role !== 'Pendente')
  const qtdObras = (p) => (veTodasAsObras(p.role) ? 'todas as obras' : `${membros.filter((m) => m.profile_id === p.id).length} obras`)

  return (
    <>
      <Topo titulo="Administração">
        {aba === 'obras' && <button className="btn" onClick={() => etapa('O formulário de nova obra')}><Icone nome="plus" />Nova obra</button>}
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
            <Chip tom={tomDaObra[o.status]}>{o.status}</Chip>
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
                <button className="btn secondary" onClick={() => etapa('A escolha de perfil e obras')}>Liberar</button>
              </div>
            ))}
          <div className="section-title">Usuários</div>
          {ativos.map((p) => (
            <div className="row-card" key={p.id}>
              <div><div className="t">{p.nome}</div><div className="s">{p.role} · {qtdObras(p)}</div></div>
              <Chip tom={p.ativo ? 'ok' : 'neutral'}>{p.ativo ? 'Ativo' : 'Inativo'}</Chip>
            </div>
          ))}
        </>
      )}
    </>
  )
}
