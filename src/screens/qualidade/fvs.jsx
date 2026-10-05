import { useState } from 'react'
import { Aba } from '../../components/index.jsx'
import { useQualidade } from '../../lib/QualidadeContext.jsx'
import { kpisFvs, tomConformidade } from '../../lib/qualidade.js'
import Modelos from './fvs-modelos.jsx'
import NaoConformidades from './fvs-ncs.jsx'
import { Estado, Kpi } from './ui.jsx'
import Vistorias from './fvs-vistorias.jsx'

const SUBABAS = [['vistorias', 'Vistorias'], ['ncs', 'Não conformidades'], ['modelos', 'Modelos']]
const TELAS = { vistorias: Vistorias, ncs: NaoConformidades, modelos: Modelos }
const COR = { ok: 'var(--ok)', warn: 'var(--warn)', bad: 'var(--bad)', neutro: 'var(--slate)' }

export default function Fvs({ avisar }) {
  const q = useQualidade()
  const [sub, setSub] = useState('vistorias')
  const k = kpisFvs(q.vistorias, q.ncs)
  const Tela = TELAS[sub]
  return (
    <Estado>
      <div className="q-kpis tres">
        <Kpi rotulo="Conforme (geral)" valor={k.conformidade === null ? '—' : `${k.conformidade}%`} cor={COR[tomConformidade(k.conformidade)]} />
        <Kpi rotulo="NCs abertas" valor={k.ncsAbertas} cor={k.ncsAbertas ? 'var(--bad)' : 'var(--ok)'} />
        <Kpi rotulo="Vistorias concluídas" valor={k.concluidas} cor="var(--slate)" />
      </div>
      <Aba opcoes={SUBABAS} valor={sub} onTroca={setSub} />
      <Tela avisar={avisar} />
    </Estado>
  )
}
