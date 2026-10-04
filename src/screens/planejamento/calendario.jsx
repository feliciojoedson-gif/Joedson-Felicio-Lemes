import { useState } from 'react'
import { usePlanejamento } from '../../lib/PlanejamentoContext.jsx'
import { formatarData } from '../../lib/regras.js'
import {
  calendarioPadrao, DIAS_SEMANA, DIAS_SEMANA_LONGO, errosCalendario, errosFeriado, ordenarFeriados,
} from '../../lib/planejamento.js'
import { Aviso, Folha, useConfirmar } from './ui.jsx'

// Dias de trabalho e feriados da obra. Valem para todas as abas: duração, semana, atraso, PPC.
export default function Calendario({ avisar, onFechar }) {
  const { calendario, hoje, salvarCalendario } = usePlanejamento()
  const [dias, setDias] = useState(calendario.diasTrabalho)
  const [feriados, setFeriados] = useState(calendario.feriados)
  const [novo, setNovo] = useState(hoje)
  const [erroNovo, setErroNovo] = useState('')
  const [salvando, setSalvando] = useState(false)
  const { pedir, caixa } = useConfirmar()

  const erros = errosCalendario({ diasTrabalho: dias })
  const [tentou, setTentou] = useState(false)
  const sujo = JSON.stringify([dias, ordenarFeriados(feriados)]) !== JSON.stringify([calendario.diasTrabalho, ordenarFeriados(calendario.feriados)])

  const alternar = (d) => setDias((l) => (l.includes(d) ? l.filter((x) => x !== d) : [...l, d].sort()))
  const adicionar = () => {
    const erro = errosFeriado(novo, feriados)
    setErroNovo(erro || '')
    if (!erro) setFeriados((l) => [...l, novo])
  }
  const remover = (data) => {
    pedir(`Remover o feriado de ${formatarData(data)}?`, () => setFeriados((l) => l.filter((x) => x !== data)), 'Remover')
  }
  const restaurar = () => {
    pedir('Voltar ao padrão (segunda a sexta e feriados nacionais)? Suas mudanças serão perdidas.', () => {
      const padrao = calendarioPadrao()
      setDias(padrao.diasTrabalho)
      setFeriados(padrao.feriados)
    }, 'Voltar ao padrão')
  }
  const salvar = async () => {
    setTentou(true)
    if (Object.keys(erros).length || salvando) return
    setSalvando(true)
    const erro = await salvarCalendario({ diasTrabalho: dias, feriados: ordenarFeriados(feriados) })
    setSalvando(false)
    if (erro) return avisar(erro)
    avisar('Calendário salvo.')
    onFechar()
  }

  return (
    <>
    <Folha titulo="Calendário da obra" sujo={sujo} onFechar={onFechar}>
      {(fechar) => (
        <>
          <div className="field">
            <span className="lb">Dias de trabalho</span>
            <div className="chips">
              {DIAS_SEMANA.map((nome, d) => (
                <button key={d} type="button" className={dias.includes(d) ? 'on' : ''} aria-pressed={dias.includes(d)} aria-label={DIAS_SEMANA_LONGO[d]} onClick={() => alternar(d)}>{nome}</button>
              ))}
            </div>
            <Aviso texto={tentou && erros.diasTrabalho} />
          </div>
          <div className="field">
            <label htmlFor="fer-data">Adicionar feriado</label>
            <div className="fer-novo">
              <input id="fer-data" className="input" type="date" value={novo} onChange={(e) => { setNovo(e.target.value); setErroNovo('') }} />
              <button type="button" className="btn secondary" onClick={adicionar}>Adicionar</button>
            </div>
            <Aviso texto={erroNovo} />
          </div>
          <div className="field">
            <span className="lb">Feriados ({feriados.length})</span>
            {feriados.length === 0 && <p className="mono">Nenhum feriado cadastrado.</p>}
            <ul className="fer-lista">
              {ordenarFeriados(feriados).map((f) => (
                <li key={f}>
                  <span>{formatarData(f)}</span>
                  <button type="button" className="btn secondary" aria-label={`Remover feriado de ${formatarData(f)}`} onClick={() => remover(f)}>Remover</button>
                </li>
              ))}
            </ul>
          </div>
          <div className="form-actions">
            <button type="button" className="btn" disabled={salvando} onClick={salvar}>{salvando ? 'Salvando…' : 'Salvar calendário'}</button>
            <button type="button" className="btn secondary" onClick={fechar}>Cancelar</button>
          </div>
          <button type="button" className="login link" onClick={restaurar}>Voltar ao padrão</button>
        </>
      )}
    </Folha>
    {caixa}
    </>
  )
}
