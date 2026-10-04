import { useState } from 'react'
import { BarraAvanco, Chip, Icone, Modal, Topo } from '../components/index.jsx'
import { useDados } from '../lib/DadosContext.jsx'
import {
  formatarData, formatarDataCurta, formatarDinheiro, formatarMes, planejadoHoje, pode,
  rotuloSemaforo, semaforo,
} from '../lib/regras.js'

export default function Detalhe({ goto, params, avisar, de }) {
  const { usuario, hoje, frentes, apontamentos, fotos, restricoes, medicoes, nomeDe } = useDados()
  const [foto, setFoto] = useState(null)
  const { role } = usuario
  const f = frentes.find((x) => x.id === params.id)
  if (!f) return <div className="empty"><h3>Frente não encontrada</h3></div>

  const ehCliente = role === 'Cliente'
  const plan = planejadoHoje(f, hoje)
  const tom = semaforo(f, hoje)
  const historico = apontamentos.filter((a) => a.frente_id === f.id).sort((a, b) => (a.data < b.data ? 1 : -1))
  const fotosDaFrente = fotos.filter((x) => x.frente_id === f.id)
  const restricoesDaFrente = restricoes.filter((r) => r.frente_id === f.id)
  const medicoesDaFrente = medicoes.filter((m) => m.frente_id === f.id)
  const mostraDias = f.status !== 'Concluída' && f.status !== 'Não iniciada' && !f.eh_marco
  const toastEtapa = (t) => avisar(`${t} chega na próxima etapa.`)

  return (
    <>
      <button className="back" onClick={() => goto(de || (ehCliente ? 'painel' : 'frentes'))}><Icone nome="voltar" />Voltar</button>
      <Topo titulo={f.nome} subtitulo={`${f.disciplina} · ${f.local}`}>
        {!ehCliente && <Chip tom={tom}>{rotuloSemaforo(f, hoje)}</Chip>}
      </Topo>

      {ehCliente ? (
        <div className="big-stats">
          <div className="stat"><div className="v">{f.eh_marco ? '—' : `${Math.round(f.percentual_realizado)}%`}</div><div className="k">avanço real</div></div>
          <div className="stat"><div className="v" style={{ fontSize: '2rem' }}>{formatarData(f.inicio_planejado)}</div><div className="k">início planejado</div></div>
          <div className="stat"><div className="v" style={{ fontSize: '2rem' }}>{formatarData(f.fim_planejado)}</div><div className="k">fim planejado</div></div>
        </div>
      ) : (
        <div className="big-stats">
          <div className={`stat ${tom === 'bad' && mostraDias ? 'bad' : tom === 'warn' ? 'warn' : ''}`}>
            <div className="v">{mostraDias ? f.dias_sem_avanco : '—'}</div><div className="k">dias sem avanço</div>
          </div>
          <div className="stat">
            <div className="v">{f.eh_marco ? '—' : `${Math.round(f.percentual_realizado)}%`}</div>
            <div className="k">avanço real · planejado {f.eh_marco ? '—' : `${Math.round(plan)}%`}</div>
          </div>
          <div className={`stat ${f.impacto_prazo_dias ? 'bad' : ''}`}>
            <div className="v">{f.impacto_prazo_dias ? `+${f.impacto_prazo_dias}` : '0'}</div><div className="k">dias de impacto no prazo</div>
          </div>
          <div className={`stat ${f.data_limite_decisao ? 'warn' : ''}`}>
            <div className="v">{f.data_limite_decisao ? formatarDataCurta(f.data_limite_decisao) : '—'}</div><div className="k">decidir até</div>
          </div>
        </div>
      )}

      <div className="two">
        <div>
          {!ehCliente && (
            <>
              <div className="section-title" style={{ marginTop: 8 }}>Histórico do diário</div>
              <div className="card">
                {historico.length === 0 ? <span className="mono">Nenhum lançamento ainda.</span> : (
                  <ul className="timeline">
                    {historico.map((a) => (
                      <li key={a.id}>
                        <span className="d">{formatarDataCurta(a.data)}</span>
                        <div>
                          <b>{a.houve_avanco ? `Avanço para ${Math.round(a.percentual_acumulado)}%` : 'Sem avanço'}</b>
                          <div className="x">
                            {!a.houve_avanco && `${a.motivo_sem_avanco} · `}
                            {pode(role, 'verEfetivo') && a.efetivo_qtd !== undefined && `efetivo ${a.efetivo_qtd} pessoas`}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          <div className="section-title">Fotos da frente</div>
          {fotosDaFrente.length === 0 ? <span className="mono">Nenhuma foto ainda.</span> : (
            <div className="photos">
              {fotosDaFrente.map((x) => (
                <button key={x.id} className="photo" onClick={() => setFoto(x)} aria-label={x.legenda}>
                  <Icone nome="fotos" />
                  <span className="cap">{formatarDataCurta(x.tirada_em.slice(0, 10))}{x.visivel_cliente ? ' · cliente' : ''}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="section-title" style={{ marginTop: 8 }}>{ehCliente ? 'Datas planejadas' : 'Quem responde'}</div>
          <div className="card">
            {!ehCliente && <b style={{ fontSize: '1.1rem' }}>{nomeDe(f.responsavel_id) || 'Sem responsável'}</b>}
            <div style={{ color: 'var(--muted)', marginTop: 2 }}>
              Planejado de {formatarData(f.inicio_planejado)} a {formatarData(f.fim_planejado)}
              {f.fim_planejado_original && f.fim_planejado_original !== f.fim_planejado && ` (original: ${formatarData(f.fim_planejado_original)})`}
            </div>
            {!f.eh_marco && <div style={{ marginTop: 10 }}><BarraAvanco real={f.percentual_realizado} plan={plan} /></div>}
          </div>

          {!ehCliente && (
            <>
              <div className="section-title">Restrições da frente</div>
              {restricoesDaFrente.length === 0 ? <span className="mono">Nenhuma restrição nesta frente.</span> : restricoesDaFrente.map((r) => (
                <div className="rest-item" key={r.id}>
                  <div className="h"><span>{r.titulo}</span><Chip tom={r.criticidade === 'Alta' ? 'bad' : r.criticidade === 'Média' ? 'warn' : 'neutral'}>{r.criticidade}</Chip></div>
                  <div className="m">{r.tipo} · {r.status}</div>
                </div>
              ))}
            </>
          )}

          {pode(role, 'verMedicao') && (
            <>
              <div className="section-title">Medições da frente</div>
              {medicoesDaFrente.length === 0 ? <span className="mono">Nenhuma medição ainda.</span> : medicoesDaFrente.map((m) => (
                <div className="row-card" key={m.id}>
                  <div><div className="t">{formatarMes(m.mes_referencia)}</div><div className="s">{m.percentual_medido}% medido · {m.status}</div></div>
                  <div className="money">{formatarDinheiro(m.valor_medido)}</div>
                </div>
              ))}
            </>
          )}

          {!ehCliente && role !== 'Diretoria' && (
            <>
              <div className="section-title">Ações</div>
              <div className="form-actions" style={{ gridTemplateColumns: '1fr' }}>
                {pode(role, 'lancarDiario') && !f.eh_marco && <button className="btn" onClick={() => goto('diario', { frenteId: f.id })}><Icone nome="diario" />Lançar diário</button>}
                {pode(role, 'criarMedicao') && <button className="btn secondary" onClick={() => toastEtapa('O formulário de medição')}>Medir</button>}
                {pode(role, 'criarRestricao') && <button className="btn secondary" onClick={() => toastEtapa('O formulário de restrição')}>Nova restrição</button>}
              </div>
            </>
          )}
        </div>
      </div>

      {foto && (
        <Modal onFechar={() => setFoto(null)}>
          <div className="photo"><Icone nome="fotos" tamanho={56} /></div>
          <p style={{ margin: '0 0 6px', fontWeight: 800 }}>{foto.legenda}</p>
          <p className="mono" style={{ margin: '0 0 12px' }}>{formatarData(foto.tirada_em.slice(0, 10))}{foto.visivel_cliente ? ' · liberada para o cliente' : ''}</p>
          {pode(role, 'liberarFoto') && (
            <button className="btn accent block" style={{ marginBottom: 10 }} onClick={() => toastEtapa('Gravar a liberação ao cliente')}>
              {foto.visivel_cliente ? 'Ocultar do cliente' : 'Mostrar ao cliente'}
            </button>
          )}
        </Modal>
      )}
    </>
  )
}
