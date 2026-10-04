import { useState } from 'react'
import { Topo, Vazio } from '../components/index.jsx'
import { useDados } from '../lib/DadosContext.jsx'
import { PlanejamentoProvider, usePlanejamento } from '../lib/PlanejamentoContext.jsx'
import Calendario from './planejamento/calendario.jsx'
import Eap from './planejamento/eap.jsx'
import Longo from './planejamento/longo.jsx'
import Curto from './planejamento/curto.jsx'
import Medio from './planejamento/medio.jsx'

// Menu interno do módulo. Ciclo ideal de uso, da esquerda para a direita: EAP → Longo → Médio → Curto.
const ABAS = [
  ['eap', 'EAP'],
  ['longo', 'Longo prazo'],
  ['medio', 'Médio prazo'],
  ['curto', 'Curto prazo'],
]
const TELAS = { eap: Eap, longo: Longo, medio: Medio, curto: Curto }

function EmBreve({ aba }) {
  const rotulo = ABAS.find(([k]) => k === aba)[1]
  return <Vazio icone="painel" titulo={`${rotulo}: em construção`} texto="Esta aba chega na próxima etapa e vai usar as mesmas atividades da EAP." />
}

function Corpo({ avisar }) {
  const { obra, calendario, status } = usePlanejamento()
  const [aba, setAba] = useState('eap')
  const [calendarioAberto, setCalendarioAberto] = useState(false)
  const Tela = TELAS[aba]

  return (
    <>
      <Topo titulo="Planejamento" subtitulo={`${obra.codigo} — ${obra.nome}`}>
        <button type="button" className="btn" disabled={status !== 'pronto'} onClick={() => setCalendarioAberto(true)}>
          Calendário{calendario ? ` · ${calendario.diasTrabalho.length} dias/sem` : ''}
        </button>
      </Topo>
      <div className="tabs menu-plan" role="tablist" aria-label="Horizontes do planejamento">
        {ABAS.map(([k, rotulo]) => (
          <button key={k} type="button" role="tab" aria-selected={aba === k} className={aba === k ? 'on' : ''} onClick={() => setAba(k)}>{rotulo}</button>
        ))}
      </div>
      {Tela ? <Tela avisar={avisar} irPara={setAba} /> : <EmBreve aba={aba} />}
      {calendarioAberto && <Calendario avisar={avisar} onFechar={() => setCalendarioAberto(false)} />}
    </>
  )
}

// Tela do módulo: o provider mantém UM estado para as quatro abas e é remontado a cada troca de obra.
export default function Planejamento({ avisar }) {
  const { obra } = useDados()
  return (
    <PlanejamentoProvider key={obra.id}>
      <Corpo avisar={avisar} />
    </PlanejamentoProvider>
  )
}
