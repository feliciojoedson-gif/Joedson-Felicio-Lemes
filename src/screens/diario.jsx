import { useEffect, useRef, useState } from 'react'
import { Chip, Icone, Topo, Vazio } from '../components/index.jsx'
import { comprimirFoto } from '../components/comprimirFoto.js'
import { useDados } from '../lib/DadosContext.jsx'
import {
  acumuladoAnterior, efetivoSugerido, formatarData, FOTOS_POR_LANCAMENTO, lancamentoDoDia, MOTIVOS, ordenarFrentes, semaforo,
  validarLancamento,
} from '../lib/regras.js'

function Formulario({ f, existente, onVoltar, onSalvo, avisar }) {
  const { hoje, obra, apontamentos, fotos: fotosDaObra, lancarDiario } = useDados()
  const enviadas = existente ? fotosDaObra.filter((x) => x.apontamento_id === existente.id) : []
  const anterior = acumuladoAnterior(f, apontamentos, hoje)
  const [av, setAv] = useState(existente ? existente.percentual_acumulado : anterior)
  const [ef, setEf] = useState(existente ? existente.efetivo_qtd : efetivoSugerido(f.id, apontamentos))
  const [motivo, setMotivo] = useState(existente?.motivo_sem_avanco || null)
  const [equipamentos, setEquipamentos] = useState(existente?.equipamentos || '')
  const [observacao, setObservacao] = useState(existente?.observacao || '')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [fotos, setFotos] = useState([])
  const [comprimindo, setComprimindo] = useState(false)
  const seletor = useRef(null)
  const previasAbertas = useRef([])
  const houve = av > anterior

  // Miniaturas são endereços temporários do navegador: soltam a memória ao sair do formulário.
  useEffect(() => () => previasAbertas.current.forEach(URL.revokeObjectURL), [])

  const subir = (n) => setAv(Math.min(100, av + n))

  const escolherFotos = async (e) => {
    const arquivos = [...e.target.files].slice(0, FOTOS_POR_LANCAMENTO - fotos.length)
    e.target.value = ''
    if (!arquivos.length) return
    setComprimindo(true)
    setErro('')
    try {
      const novas = []
      for (const arquivo of arquivos) {
        const blob = await comprimirFoto(arquivo)
        const previa = URL.createObjectURL(blob)
        previasAbertas.current.push(previa)
        novas.push({ blob, previa })
      }
      setFotos((atuais) => [...atuais, ...novas])
    } catch (_) {
      setErro('Não consegui ler a foto. Tente de novo ou escolha outra.')
    }
    setComprimindo(false)
  }

  const salvar = async () => {
    const motivoValido = houve ? null : motivo
    const problema = validarLancamento({ anterior, acumulado: av, efetivo: ef, motivo: motivoValido })
    if (problema) return setErro(problema)
    setSalvando(true)
    const { erro: falha, fotosFalharam } = await lancarDiario(
      f, { acumulado: av, efetivo: ef, motivo: motivoValido, equipamentos, observacao, fotos: fotos.map((x) => x.blob) }, existente,
    )
    setSalvando(false)
    if (falha) return setErro(falha)
    if (fotosFalharam.length) {
      // O lançamento já está salvo: fica só o que não subiu, e Salvar de novo tenta de novo.
      setFotos(fotos.filter((x) => fotosFalharam.includes(x.blob)))
      return setErro(`Lançamento salvo, mas ${fotosFalharam.length === 1 ? '1 foto não subiu' : `${fotosFalharam.length} fotos não subiram`}. Toque em Salvar para tentar de novo.`)
    }
    avisar(av >= 100 ? 'Lançado. Frente concluída: foi para Medições.' : 'Lançado.')
    onSalvo()
  }

  return (
    <>
      <button className="back" onClick={onVoltar}><Icone nome="voltar" />Voltar para a lista</button>
      <div className="card" style={{ marginBottom: 16 }}>
        <b style={{ fontSize: '1.15rem' }}>{f.nome}</b>
        <div className="mono">{obra.codigo} · {formatarData(hoje)}{existente ? ' · corrigindo o lançamento de hoje' : ''}</div>
      </div>
      <div className="field">
        <span className="lb">Avanço acumulado</span>
        <div className="stepper">
          <button aria-label="Diminuir 1 ponto" onClick={() => av > anterior && setAv(av - 1)}>−</button>
          <div className="val">{av}%<small>anterior: {anterior}% · não pode diminuir</small></div>
          <button aria-label="Aumentar 1 ponto" onClick={() => subir(1)}>+</button>
        </div>
        <div className="chips" style={{ marginTop: 8 }}>
          <button onClick={() => subir(5)}>+5</button>
          <button onClick={() => subir(10)}>+10</button>
          <button onClick={() => setAv(100)}>Concluída (100%)</button>
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
        <Chip tom={houve ? 'ok' : 'neutral'}>{houve ? `Sim — avanço de ${av - anterior} pontos` : 'Não — informe o motivo'}</Chip>
      </div>
      {!houve && (
        <div className="field">
          <span className="lb">Motivo de não haver avanço</span>
          <div className="chips">
            {MOTIVOS.map((m) => <button key={m} className={motivo === m ? 'on' : ''} onClick={() => { setMotivo(m); setErro('') }}>{m}</button>)}
          </div>
        </div>
      )}
      <div className="field"><label htmlFor="equip">Equipamentos</label><input id="equip" value={equipamentos} onChange={(e) => setEquipamentos(e.target.value)} placeholder="Opcional" /></div>
      <div className="field"><label htmlFor="obs">Observação</label><textarea id="obs" rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Opcional" /></div>
      {enviadas.length > 0 && (
        <div className="field">
          <span className="lb">Já enviadas hoje ({enviadas.length})</span>
          <div className="photos">
            {enviadas.map((x) => (
              <div key={x.id} className="photo">{x.link ? <img src={x.link} alt={x.legenda} /> : <Icone nome="fotos" />}</div>
            ))}
          </div>
        </div>
      )}
      {fotos.length > 0 && (
        <div className="field">
          <span className="lb">Fotos do dia ({fotos.length} de {FOTOS_POR_LANCAMENTO})</span>
          <div className="photos">
            {fotos.map((x, i) => (
              <div key={x.previa} className="photo miniatura">
                <img src={x.previa} alt={`Foto ${i + 1} do lançamento`} />
                <button className="remover" aria-label={`Remover foto ${i + 1}`} onClick={() => setFotos(fotos.filter((y) => y !== x))}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}
      <input ref={seletor} type="file" accept="image/*" multiple hidden onChange={escolherFotos} />
      {erro && <div className="pending" role="alert" style={{ marginBottom: 10 }}>{erro}</div>}
      <div className="form-actions">
        <button
          className="btn secondary"
          disabled={comprimindo || fotos.length >= FOTOS_POR_LANCAMENTO}
          onClick={() => seletor.current.click()}
        >
          <Icone nome="fotos" />{comprimindo ? 'Preparando foto…' : fotos.length >= FOTOS_POR_LANCAMENTO ? 'Limite de fotos' : 'Adicionar foto'}
        </button>
        <button className="btn" disabled={salvando} onClick={salvar}>{salvando ? 'Salvando…' : 'Salvar lançamento'}</button>
      </div>
    </>
  )
}

export default function Diario({ params, avisar }) {
  const { hoje, frentes, apontamentos } = useDados()
  const [aberta, setAberta] = useState(params.frenteId || null)

  const jaLancou = (id) => lancamentoDoDia(id, apontamentos, hoje) !== null
  const minhas = ordenarFrentes(frentes.filter((f) => f.status !== 'Concluída' && !f.eh_marco), hoje)
    .sort((a, b) => jaLancou(a.id) - jaLancou(b.id))
  const frente = frentes.find((f) => f.id === aberta)

  if (frente) {
    return (
      <>
        <Topo titulo="Diário de obra" />
        <Formulario
          key={frente.id}
          f={frente}
          existente={lancamentoDoDia(frente.id, apontamentos, hoje)}
          avisar={avisar}
          onVoltar={() => setAberta(null)}
          onSalvo={() => setAberta(null)}
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
