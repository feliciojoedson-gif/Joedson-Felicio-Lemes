import { useState } from 'react'
import { Chip, Icone, Topo, Vazio } from '../components/index.jsx'
import { useDados } from '../lib/DadosContext.jsx'
import { formatarData, MOTIVOS, ordenarFrentes, semaforo } from '../lib/regras.js'

function Formulario({ f, onVoltar, onSalvar, avisar }) {
  const { hoje, obra } = useDados()
  const [av, setAv] = useState(f.percentual_realizado)
  const [ef, setEf] = useState(8)
  const [motivo, setMotivo] = useState(null)
  const [erro, setErro] = useState('')
  const houve = av > f.percentual_realizado

  const salvar = () => {
    if (!houve && !motivo) return setErro('Informe o motivo de não haver avanço.')
    onSalvar()
  }

  return (
    <>
      <button className="back" onClick={onVoltar}><Icone nome="voltar" />Voltar para a lista</button>
      <div className="card" style={{ marginBottom: 16 }}>
        <b style={{ fontSize: '1.15rem' }}>{f.nome}</b>
        <div className="mono">{obra.codigo} · {formatarData(hoje)}</div>
      </div>
      <div className="field">
        <span className="lb">Avanço acumulado</span>
        <div className="stepper">
          <button aria-label="Diminuir 1 ponto" onClick={() => av > f.percentual_realizado && setAv(av - 1)}>−</button>
          <div className="val">{av}%<small>anterior: {f.percentual_realizado}% · não pode diminuir</small></div>
          <button aria-label="Aumentar 1 ponto" onClick={() => av < 100 && setAv(av + 1)}>+</button>
        </div>
      </div>
      <div className="field">
        <span className="lb">Efetivo (pessoas)</span>
        <div className="stepper">
          <button aria-label="Diminuir efetivo" onClick={() => ef > 0 && setEf(ef - 1)}>−</button>
          <div className="val">{ef}</div>
          <button aria-label="Aumentar efetivo" onClick={() => setEf(ef + 1)}>+</button>
        </div>
      </div>
      <div className="field">
        <span className="lb">Houve avanço?</span>
        <Chip tom={houve ? 'ok' : 'neutral'}>{houve ? `Sim — avanço de ${av - f.percentual_realizado} pontos` : 'Não — informe o motivo'}</Chip>
      </div>
      {!houve && (
        <div className="field">
          <span className="lb">Motivo de não haver avanço</span>
          <div className="chips">
            {MOTIVOS.map((m) => <button key={m} className={motivo === m ? 'on' : ''} onClick={() => { setMotivo(m); setErro('') }}>{m}</button>)}
          </div>
        </div>
      )}
      <div className="field"><label htmlFor="obs">Observação</label><textarea id="obs" rows={2} placeholder="Opcional" /></div>
      {erro && <div className="pending" role="alert" style={{ marginBottom: 10 }}>{erro}</div>}
      <div className="form-actions">
        <button className="btn secondary" onClick={() => avisar('O envio de foto chega na próxima etapa.')}><Icone nome="fotos" />Adicionar foto</button>
        <button className="btn" onClick={salvar}>Salvar lançamento</button>
      </div>
    </>
  )
}

export default function Diario({ params, avisar }) {
  const { hoje, frentes, apontamentos } = useDados()
  const [aberta, setAberta] = useState(params.frenteId || null)
  // Nesta fase o lançamento ainda não é gravado; só marcamos como lançado nesta tela.
  const [lancadasAgora, setLancadasAgora] = useState([])

  const jaLancou = (id) => lancadasAgora.includes(id) || apontamentos.some((a) => a.frente_id === id && a.data === hoje)
  const minhas = ordenarFrentes(frentes.filter((f) => f.status !== 'Concluída' && !f.eh_marco), hoje)
    .sort((a, b) => jaLancou(a.id) - jaLancou(b.id))
  const frente = frentes.find((f) => f.id === aberta)

  if (frente) {
    return (
      <>
        <Topo titulo="Diário de obra" />
        <Formulario
          f={frente}
          avisar={avisar}
          onVoltar={() => setAberta(null)}
          onSalvar={() => { setLancadasAgora([...lancadasAgora, frente.id]); setAberta(null); avisar('Lançado.') }}
        />
      </>
    )
  }

  return (
    <>
      <Topo titulo="Diário de obra" />
      {minhas.length === 0
        ? <Vazio icone="diario" titulo="Nada para lançar" texto="Nada lançado hoje. Toque em uma frente para lançar." />
        : (
          <>
            <p style={{ margin: '0 0 12px', color: 'var(--muted)', fontWeight: 700 }}>Toque em uma frente para lançar o dia.</p>
            <div className="flist">
              {minhas.map((f) => (
                <button key={f.id} className={`frente ${semaforo(f, hoje)}`} style={{ minHeight: 80 }} onClick={() => setAberta(f.id)}>
                  <div><div className="t">{f.nome}</div><div className="s mono">{f.local}</div></div>
                  <div>{jaLancou(f.id) ? <span className="done">Lançado</span> : <span className="pending">Falta lançar</span>}</div>
                  <div className="meta" style={{ gridColumn: '1 / -1' }}>
                    <span>Último avanço: <b>{f.percentual_realizado}%</b></span>
                    {f.dias_sem_avanco >= 1 && f.status !== 'Não iniciada' && <span className="neg">{f.dias_sem_avanco} dias sem avanço</span>}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
    </>
  )
}
