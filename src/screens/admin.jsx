import { useState } from 'react'
import { Aba, Chip, Icone, Topo, Vazio } from '../components/index.jsx'
import { useDados } from '../lib/DadosContext.jsx'
import { formatarData, pode } from '../lib/regras.js'
import { FormObra } from './cadastros.jsx'
import PainelUsuarios from './usuarios.jsx'

const tomDaObra = { Planejamento: 'neutral', Ativa: 'ok', Suspensa: 'warn', Encerrada: 'neutral', Arquivada: 'neutral' }

// Administração é cadastro (obras e pessoas), não lançamento: é a única tela que
// lista todas as obras de uma vez, de propósito.
export default function Admin({ avisar }) {
  const { usuario, obras, nomeDe } = useDados()
  const [aba, setAba] = useState('obras')
  const [formObra, setFormObra] = useState(null) // null | {} (nova) | obra
  const podeAdministrar = pode(usuario.role, 'administrar')


  return (
    <>
      <Topo titulo="Painel de admin">
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

      {aba === 'usuarios' && <PainelUsuarios avisar={avisar} />}
      {formObra && <FormObra obra={formObra.id ? formObra : null} onFechar={() => setFormObra(null)} avisar={avisar} />}
    </>
  )
}
