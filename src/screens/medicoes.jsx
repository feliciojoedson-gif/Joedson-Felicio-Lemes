import { useState } from 'react'
import { Aba, Seletor, Topo, Vazio } from '../components/index.jsx'
import { useDados } from '../lib/DadosContext.jsx'
import Empreiteiros from './empreiteiros.jsx'
import { FormMedicao } from './cadastros.jsx'
import { mudarStatusMedicaoDaFrente } from '../lib/dados.js'
import { passoDaMedicao } from '../lib/cadastros.js'
import {
  concluidaSemMedicao, DISCIPLINAS, formatarData, formatarDinheiro, formatarMes, pode,
} from '../lib/regras.js'

const tomDoStatus = { Rascunho: 'pending', Enviada: 'pending', 'Aprovada pela Gestão': 'pending', Aprovada: 'done' }

export default function Medicoes({ avisar }) {
  const { usuario, obra, frentes, medicoes, recarregar } = useDados()
  const [medindo, setMedindo] = useState(null)
  const avancar = async (m, para) => {
    const { erro } = await mudarStatusMedicaoDaFrente(obra, m.id, para)
    if (erro) return avisar(erro.regra ? erro.message : 'Não consegui mudar o status da medição. Tente de novo.')
    recarregar()
    avisar('Medição atualizada.')
  }
  const [aba, setAba] = useState('medir')
  const [disc, setDisc] = useState('')
  const [mes, setMes] = useState('')
  const podeMedir = pode(usuario.role, 'criarMedicao')
  const frenteDe = (id) => frentes.find((f) => f.id === id)
  const meses = [...new Set(medicoes.map((m) => m.mes_referencia))].sort().reverse()

  const aMedir = frentes
    .filter((f) => concluidaSemMedicao(f, medicoes) && (!disc || f.disciplina === disc))
    .sort((a, b) => (a.ultimo_avanco_em || '') < (b.ultimo_avanco_em || '') ? -1 : 1)
  const historico = medicoes
    .filter((m) => (!disc || frenteDe(m.frente_id)?.disciplina === disc) && (!mes || m.mes_referencia === mes))
    .sort((a, b) => (a.mes_referencia < b.mes_referencia ? 1 : -1))

  return (
    <>
      <Topo titulo="Medições" />
      {aba !== 'empreiteiros' && <div className="filters one">
        <Seletor valor={disc} onTroca={setDisc} rotulo="Disciplina" todas="Todas as disciplinas" opcoes={DISCIPLINAS.map((d) => [d, d])} />
        {aba === 'historico' && <Seletor valor={mes} onTroca={setMes} rotulo="Mês" todas="Todos os meses" opcoes={meses.map((m) => [m, formatarMes(m)])} />}
      </div>}
      <div style={{ marginTop: 14 }}>
        <Aba valor={aba} onTroca={setAba} opcoes={[['medir', 'A medir'], ['historico', 'Histórico'], ['empreiteiros', 'Empreiteiros']]} />
      </div>

      {aba === 'empreiteiros' && <Empreiteiros avisar={avisar} embutida />}

      {aba === 'medir' && (aMedir.length === 0
        ? <Vazio icone="medicoes" titulo="Nada a medir" texto="Nenhuma frente a medir agora." />
        : aMedir.map((f) => (
          <div className="row-card" key={f.id}>
            <div><div className="t">{f.nome}</div><div className="s">{f.disciplina} · concluída em {formatarData(f.ultimo_avanco_em)}</div></div>
            {podeMedir && <button className="btn accent" onClick={() => setMedindo(f)}>Medir</button>}
          </div>
        )))}

      {aba === 'historico' && (historico.length === 0
        ? <Vazio icone="medicoes" titulo="Sem medições" texto="Nenhuma medição registrada." />
        : historico.map((m) => (
          <div className="row-card" key={m.id}>
            <div>
              <div className="t">{frenteDe(m.frente_id)?.nome} · {formatarMes(m.mes_referencia)}</div>
              <div className="s">{m.percentual_medido}% medido · <span className={tomDoStatus[m.status]}>{m.status}</span></div>
            </div>
            <div className="money">{formatarDinheiro(m.valor_medido)}</div>
            {passoDaMedicao(m.status, usuario.role) && (
              <button type="button" className="btn accent" onClick={() => avancar(m, passoDaMedicao(m.status, usuario.role).para)}>{passoDaMedicao(m.status, usuario.role).rotulo}</button>
            )}
          </div>
        )))}
      {medindo && <FormMedicao frente={medindo} onFechar={() => setMedindo(null)} avisar={avisar} />}
    </>
  )
}
