import { useEffect, useRef, useState } from 'react'
import { Chip, Icone, Topo, Vazio } from '../components/index.jsx'
import { useDados } from '../lib/DadosContext.jsx'
import { listarRdo, salvarRdo } from '../lib/dados.js'
import { CLIMAS, climaDe, dataExtensa, errosRdo, FOTOS_POR_LANCAMENTO, ordenarRdo } from '../lib/regras.js'

function Formulario({ hoje, onSalvar, onFechar }) {
  const [data, setData] = useState(hoje)
  const [clima, setClima] = useState(null)
  const [efetivo, setEfetivo] = useState('')
  const [atividades, setAtividades] = useState('')
  const [ocorrencias, setOcorrencias] = useState('')
  const [fotos, setFotos] = useState([])
  const [tocados, setTocados] = useState({})
  const [tentou, setTentou] = useState(false)
  const seletor = useRef(null)
  const arquivos = useRef(new Map()) // prévia -> arquivo original, que é o que sobe para o Storage

  const erros = errosRdo({ data, clima, efetivo, atividades })
  const aviso = (campo) => (tentou || tocados[campo]) && erros[campo]
  const tocar = (campo) => setTocados((t) => ({ ...t, [campo]: true }))
  const sujo = Boolean(clima || efetivo || atividades || ocorrencias || fotos.length || data !== hoje)

  const fechar = () => {
    if (sujo && !window.confirm('Descartar este registro? O que você preencheu será perdido.')) return
    fotos.forEach((p) => URL.revokeObjectURL(p))
    onFechar()
  }

  const escolherFotos = (e) => {
    const novas = [...e.target.files].slice(0, FOTOS_POR_LANCAMENTO - fotos.length).map((a) => {
      const previa = URL.createObjectURL(a)
      arquivos.current.set(previa, a)
      return previa
    })
    e.target.value = ''
    setFotos((atuais) => [...atuais, ...novas])
  }
  const tirarFoto = (previa) => {
    URL.revokeObjectURL(previa)
    setFotos((atuais) => atuais.filter((p) => p !== previa))
  }

  const salvar = () => {
    setTentou(true)
    if (Object.keys(erros).length) return
    onSalvar({ data, clima, efetivo: Number(efetivo), atividades: atividades.trim(), ocorrencias: ocorrencias.trim(), fotos, arquivos: fotos.map((p) => arquivos.current.get(p)) })
  }

  return (
    <div className="sheet-fundo" onClick={fechar}>
      <div
        className="sheet" role="dialog" aria-modal="true" aria-label="Novo registro do diário"
        onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.key === 'Escape' && fechar()}
      >
        <h2>Novo registro</h2>
        <div className="field">
          <label htmlFor="rdo-data">Data</label>
          <input id="rdo-data" className="input" type="date" value={data} max={hoje} onChange={(e) => setData(e.target.value)} onBlur={() => tocar('data')} />
          {aviso('data') && <div className="erro" role="alert">{erros.data}</div>}
        </div>
        <div className="field">
          <span className="lb">Clima</span>
          <div className="chips">
            {CLIMAS.map((c) => (
              <button key={c.id} type="button" className={clima === c.id ? 'on' : ''} aria-pressed={clima === c.id} onClick={() => { setClima(c.id); tocar('clima') }}>{c.rotulo}</button>
            ))}
          </div>
          {aviso('clima') && <div className="erro" role="alert">{erros.clima}</div>}
        </div>
        <div className="field">
          <label htmlFor="rdo-efetivo">Efetivo (pessoas)</label>
          <input
            id="rdo-efetivo" className="input" inputMode="numeric" pattern="[0-9]*" maxLength={3} placeholder="0"
            value={efetivo} onChange={(e) => setEfetivo(e.target.value.replace(/\D/g, ''))} onBlur={() => tocar('efetivo')}
          />
          {aviso('efetivo') && <div className="erro" role="alert">{erros.efetivo}</div>}
        </div>
        <div className="field">
          <label htmlFor="rdo-atividades">Atividades do dia</label>
          <textarea id="rdo-atividades" rows={3} value={atividades} onChange={(e) => setAtividades(e.target.value)} onBlur={() => tocar('atividades')} placeholder="O que foi feito hoje" />
          {aviso('atividades') && <div className="erro" role="alert">{erros.atividades}</div>}
        </div>
        <div className="field">
          <label htmlFor="rdo-ocorrencias">Ocorrências</label>
          <textarea id="rdo-ocorrencias" rows={2} value={ocorrencias} onChange={(e) => setOcorrencias(e.target.value)} placeholder="Opcional: paradas, acidentes, interferências" />
        </div>
        {fotos.length > 0 && (
          <div className="field">
            <span className="lb">Fotos ({fotos.length} de {FOTOS_POR_LANCAMENTO})</span>
            <div className="photos">
              {fotos.map((previa, i) => (
                <div key={previa} className="photo miniatura">
                  <img src={previa} alt={`Foto ${i + 1} do registro`} />
                  <button type="button" className="remover" aria-label={`Remover foto ${i + 1}`} onClick={() => tirarFoto(previa)}>×</button>
                </div>
              ))}
            </div>
          </div>
        )}
        <input ref={seletor} type="file" accept="image/*" multiple hidden onChange={escolherFotos} />
        <div className="form-actions">
          <button type="button" className="btn secondary" disabled={fotos.length >= FOTOS_POR_LANCAMENTO} onClick={() => seletor.current.click()}>
            <Icone nome="fotos" />{fotos.length >= FOTOS_POR_LANCAMENTO ? 'Limite de fotos' : 'Adicionar foto'}
          </button>
          <button type="button" className="btn" onClick={salvar}>Salvar registro</button>
          <button type="button" className="btn secondary" onClick={fechar}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}

function Cartao({ r }) {
  const clima = climaDe(r.clima)
  return (
    <article className="card rdo-card">
      <div className="cab">
        <div className="dia">{dataExtensa(r.data)}</div>
        <Chip tom={clima.tom}>{clima.rotulo}</Chip>
      </div>
      <div className="mono">{r.efetivo} {r.efetivo === 1 ? 'pessoa' : 'pessoas'} no efetivo</div>
      <p className="resumo">{r.atividades}</p>
      {r.ocorrencias && <div className="oc">Ocorrência: {r.ocorrencias}</div>}
      {r.fotos.length > 0 && (
        <div className="photos">
          {r.fotos.map((url, i) => <div key={url} className="photo"><img src={url} alt={`Foto ${i + 1} de ${dataExtensa(r.data)}`} /></div>)}
        </div>
      )}
    </article>
  )
}

export default function Rdo({ avisar }) {
  const { obra, hoje } = useDados()
  const [estado, setEstado] = useState({ status: 'carregando', lista: [] })
  const [rodada, setRodada] = useState(0)
  const [aberto, setAberto] = useState(false)

  // A tela é remontada ao trocar de obra (Shell), então a lista nunca mistura obras.
  useEffect(() => {
    let vivo = true
    listarRdo(obra).then(({ data, erro }) => {
      if (vivo) setEstado(erro ? { status: 'erro', lista: [] } : { status: 'ok', lista: ordenarRdo(data) })
    })
    return () => { vivo = false }
  }, [obra.id, rodada])

  const tentarDeNovo = () => {
    setEstado({ status: 'carregando', lista: [] })
    setRodada((n) => n + 1)
  }

  // Otimista: o card aparece já; se o salvamento falhar, ele sai e a pessoa é avisada.
  const salvar = async (campos) => {
    const provisorio = { ...campos, id: `novo-${Date.now()}`, obraCodigo: obra.codigo }
    setEstado((e) => ({ status: 'ok', lista: ordenarRdo([provisorio, ...e.lista]) }))
    setAberto(false)
    const { data, erro, fotosFalharam } = await salvarRdo(obra, campos)
    if (erro) {
      setEstado((e) => ({ ...e, lista: e.lista.filter((r) => r !== provisorio) }))
      avisar('Não consegui salvar o registro. Tente de novo.')
      return
    }
    setEstado((e) => ({ ...e, lista: ordenarRdo(e.lista.map((r) => (r === provisorio ? data : r))) }))
    avisar(fotosFalharam ? `Registro salvo, mas ${fotosFalharam} foto(s) não subiram. Tente anexar de novo.` : 'Registro salvo.')
  }

  const novo = <button className="btn" onClick={() => setAberto(true)}><Icone nome="plus" />Novo registro</button>

  return (
    <>
      <Topo titulo="Diário de Obra" subtitulo={`${obra.codigo} — ${obra.nome}`}>{novo}</Topo>
      {estado.status === 'carregando' && <p className="mono" role="status">Carregando registros…</p>}
      {estado.status === 'erro' && (
        <div className="empty" role="alert">
          <h3>Não consegui carregar o diário</h3>
          <p>Verifique a conexão e tente de novo.</p>
          <button className="btn" onClick={tentarDeNovo}>Tentar de novo</button>
        </div>
      )}
      {estado.status === 'ok' && estado.lista.length === 0 && (
        <Vazio icone="rdo" titulo="Nenhum registro ainda" texto="Registre o primeiro dia de obra: clima, equipe, atividades e fotos.">
          {novo}
        </Vazio>
      )}
      {estado.status === 'ok' && estado.lista.map((r) => <Cartao key={r.id} r={r} />)}
      {aberto && <Formulario hoje={hoje} onSalvar={salvar} onFechar={() => setAberto(false)} />}
    </>
  )
}
