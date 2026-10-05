import { useState } from 'react'
import { Aba, Topo } from '../components/index.jsx'
import { useDados } from '../lib/DadosContext.jsx'
import { QualidadeProvider, useQualidade } from '../lib/QualidadeContext.jsx'
import Fvs from './qualidade/fvs.jsx'
import Gemba from './qualidade/gemba.jsx'
import Pendencias from './qualidade/pendencias.jsx'
import Relatorio from './qualidade/relatorio.jsx'
import './qualidade/qualidade.css'

// Controle segmentado do módulo.
const ABAS = [['pendencias', 'Pendências'], ['fvs', 'FVS'], ['gemba', 'Gemba Walk']]
const TELAS = { pendencias: Pendencias, fvs: Fvs, gemba: Gemba }

function Corpo({ avisar }) {
  const { obra } = useDados()
  const q = useQualidade()
  const [aba, setAba] = useState('pendencias')
  const [relatorio, setRelatorio] = useState(false)
  const Tela = TELAS[aba]
  return (
    <>
      <Topo titulo="Qualidade" subtitulo={`${obra.codigo} — ${obra.nome}`}>
        <button type="button" className="btn" disabled={q.status !== 'pronto'} onClick={() => setRelatorio(true)}>Relatório</button>
      </Topo>
      <Aba opcoes={ABAS} valor={aba} onTroca={setAba} />
      <Tela avisar={avisar} />
      {relatorio && <Relatorio onFechar={() => setRelatorio(false)} />}
    </>
  )
}

export default function Qualidade({ avisar }) {
  const { obra } = useDados()
  return (
    <QualidadeProvider key={obra.id}>
      <Corpo avisar={avisar} />
    </QualidadeProvider>
  )
}
