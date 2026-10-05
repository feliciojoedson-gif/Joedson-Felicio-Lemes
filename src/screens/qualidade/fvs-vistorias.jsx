import { useState } from 'react'
import { Chip, Icone, Vazio } from '../../components/index.jsx'
import { useDados } from '../../lib/DadosContext.jsx'
import { useQualidade } from '../../lib/QualidadeContext.jsx'
import { formatarData, pode } from '../../lib/regras.js'
import {
  errosFinalizar, errosNc, errosNovaVistoria, numerarGrupos, progressoVistoria, RESPOSTAS, SEVERIDADES, tomConformidade,
} from '../../lib/qualidade.js'
import { Aviso, Folha, useAvisos, useConfirmar } from '../planejamento/ui.jsx'
import { BarraQ, CampoFotos } from './ui.jsx'

const pctTexto = (p) => (p.conformidade === null ? '—' : `${p.conformidade}%`)

function SeloConcluida() {
  return <span className="q-concluida">✓ Concluída</span>
}

function CartaoVistoria({ v, onAbrir }) {
  const p = progressoVistoria(v)
  return (
    <button type="button" className="q-card" onClick={() => onAbrir(v.id)}>
      <div className="q-card-topo">
        <b className="q-num">{v.modeloCodigo}</b>
        {v.status === 'concluida' ? <SeloConcluida /> : <Chip tom="warn">Em andamento</Chip>}
      </div>
      <div className="q-desc">{v.ambiente}</div>
      <div className="q-meta"><span>{v.modeloNome}</span></div>
      <BarraQ p={p} />
      <div className="q-meta">
        <span>{p.verificados} de {p.total} itens verificados</span>
        <span className={`q-pct ${tomConformidade(p.conformidade)}`}>{pctTexto(p)} conforme</span>
      </div>
    </button>
  )
}

function FormNovaVistoria({ modelos, onSalvar, onFechar }) {
  const [c, setC] = useState({ modeloId: '', ambiente: '' })
  const erros = errosNovaVistoria(c)
  const { aviso, tocar, tentar } = useAvisos(erros)
  return (
    <Folha titulo="Nova vistoria" sujo={Boolean(c.modeloId || c.ambiente)} onFechar={onFechar}>
      {(fechar) => (
        <>
          <div className="field">
            <label htmlFor="nv-modelo">Modelo da ficha</label>
            <select id="nv-modelo" className="select" value={c.modeloId} onChange={(e) => setC((x) => ({ ...x, modeloId: e.target.value }))} onBlur={() => tocar('modeloId')}>
              <option value="">Escolha o modelo</option>
              {modelos.map((m) => <option key={m.id} value={m.id}>{m.codigo} — {m.nome}</option>)}
            </select>
            <Aviso texto={aviso('modeloId')} />
          </div>
          <div className="field">
            <label htmlFor="nv-ambiente">Ambiente</label>
            <input id="nv-ambiente" className="input" maxLength={80} placeholder="Ex.: Banheiro Social · Térreo" value={c.ambiente} onChange={(e) => setC((x) => ({ ...x, ambiente: e.target.value }))} onBlur={() => tocar('ambiente')} />
            <Aviso texto={aviso('ambiente')} />
          </div>
          <div className="form-actions">
            <button type="button" className="btn" onClick={() => tentar() && onSalvar(modelos.find((m) => String(m.id) === c.modeloId).id, c.ambiente)}>Abrir checklist</button>
            <button type="button" className="btn secondary" onClick={fechar}>Cancelar</button>
          </div>
        </>
      )}
    </Folha>
  )
}

// Marcar NC: painel que detalha o problema; ao salvar nasce a não conformidade ligada ao item.
function FormNc({ item, onSalvar, onFechar }) {
  const [c, setC] = useState({ fotos: [], descricao: '', solucao: '', severidade: 'Média', responsavel: '' })
  const erros = errosNc(c)
  const { aviso, tocar, tentar } = useAvisos(erros)
  const campo = (k) => (e) => setC((x) => ({ ...x, [k]: e.target.value }))
  return (
    <Folha titulo={`NC no item ${item.numero}`} sujo={Boolean(c.fotos.length || c.descricao || c.solucao || c.responsavel)} larga onFechar={onFechar}>
      {(fechar) => (
        <>
          <p className="q-item-ref"><b>{item.numero}</b> {item.titulo}</p>
          <CampoFotos id="nc-fotos" rotulo="Fotos" valor={c.fotos} onTroca={(fotos) => setC((x) => ({ ...x, fotos }))} />
          <div className="field">
            <label htmlFor="nc-descricao">Descrição do problema</label>
            <textarea id="nc-descricao" rows={3} maxLength={300} value={c.descricao} onChange={campo('descricao')} onBlur={() => tocar('descricao')} />
            <Aviso texto={aviso('descricao')} />
          </div>
          <div className="field">
            <label htmlFor="nc-solucao">Solução proposta</label>
            <textarea id="nc-solucao" rows={3} maxLength={300} value={c.solucao} onChange={campo('solucao')} onBlur={() => tocar('solucao')} />
            <Aviso texto={aviso('solucao')} />
          </div>
          <div className="field">
            <span className="lb">Severidade</span>
            <div className="chips">
              {SEVERIDADES.map((s) => (
                <button key={s} type="button" className={c.severidade === s ? 'on' : ''} aria-pressed={c.severidade === s} onClick={() => setC((x) => ({ ...x, severidade: s }))}>{s}</button>
              ))}
            </div>
          </div>
          <div className="field">
            <label htmlFor="nc-responsavel">Responsável pela correção</label>
            <input id="nc-responsavel" className="input" maxLength={80} value={c.responsavel} onChange={campo('responsavel')} onBlur={() => tocar('responsavel')} />
            <Aviso texto={aviso('responsavel')} />
          </div>
          <div className="form-actions">
            <button type="button" className="btn" onClick={() => tentar() && onSalvar(c)}>Registrar não conformidade</button>
            <button type="button" className="btn secondary" onClick={fechar}>Cancelar</button>
          </div>
        </>
      )}
    </Folha>
  )
}

function Checklist({ id, podeGerir, avisar, onVoltar }) {
  const q = useQualidade()
  const v = q.vistorias.find((x) => x.id === id)
  const [ncItem, setNcItem] = useState(null)
  const { pedir, caixa } = useConfirmar()
  if (!v) return null
  const p = progressoVistoria(v)
  const travada = v.status === 'concluida' || !podeGerir
  const ncDoItem = (item) => q.ncs.find((n) => n.vistoriaId === v.id && String(n.itemId) === String(item.id))
  const falhou = (promessa) => promessa.then((e) => e && avisar(e))

  const marcar = (item, resposta) => {
    if (resposta === 'nc') {
      const nc = ncDoItem(item)
      if (nc) avisar(`Este item já tem a ${nc.codigo}.`)
      else setNcItem(item)
      return
    }
    if (v.respostas[item.id] === resposta) return
    falhou(q.marcarItem(v.id, item.id, resposta))
  }
  const salvarNc = (campos) => {
    const item = ncItem
    setNcItem(null)
    falhou(q.registrarNc(v.id, item.id, campos))
    avisar('Não conformidade registrada')
  }
  const finalizar = () => pedir('Finalizar a vistoria? Depois disso ela fica travada, só para leitura.', () => {
    falhou(q.finalizarVistoria(v.id))
    avisar('Vistoria concluída')
  }, 'Finalizar')
  const faltam = errosFinalizar(v)

  return (
    <>
      <button type="button" className="btn secondary q-voltar" onClick={onVoltar}><Icone nome="voltar" />Vistorias</button>
      <div className="q-checklist-topo">
        <div className="q-card-topo">
          <div>
            <b className="q-num">{v.modeloCodigo}</b> <span className="mono">v{v.versao}</span>
            <div className="q-desc cheia">{v.ambiente}</div>
            <div className="mono">{v.modeloNome}</div>
          </div>
          {v.status === 'concluida' ? <SeloConcluida /> : <Chip tom="warn">Em andamento</Chip>}
        </div>
        <div className="q-progresso">
          <BarraQ p={p} />
          <div className="q-meta">
            <span>{p.verificados} de {p.total} itens verificados</span>
            <span className={`q-pct grande ${tomConformidade(p.conformidade)}`}>{pctTexto(p)} conforme</span>
          </div>
          <div className="q-legenda"><span className="ok">OK {p.ok}</span><span className="nc">NC {p.nc}</span><span className="na">N.A. {p.na}</span><span className="pend">Pendente {p.pendentes}</span></div>
        </div>
      </div>

      {numerarGrupos(v.grupos).map((g, gi) => (
        <section key={g.nome} className="q-grupo">
          <h3 className="section-title">{gi + 1}. {g.nome}</h3>
          {g.itens.map((item) => {
            const resp = v.respostas[item.id]
            const nc = ncDoItem(item)
            return (
              <div key={item.id} className="q-item">
                <div className="q-item-t"><b>{item.numero}</b> {item.titulo}{nc && <Chip tom="bad">{nc.codigo}</Chip>}</div>
                <div className="q-resp-btns" role="group" aria-label={`Resposta do item ${item.numero}`}>
                  {RESPOSTAS.map(([k, rotulo]) => (
                    <button key={k} type="button" className={resp === k ? `on ${k}` : ''} aria-pressed={resp === k} disabled={travada} onClick={() => marcar(item, k)}>{rotulo}</button>
                  ))}
                </div>
              </div>
            )
          })}
        </section>
      ))}

      {v.status === 'concluida' ? (
        <p className="mono q-fim">Vistoria concluída em {formatarData(v.concluidaEm)}. Somente leitura.</p>
      ) : podeGerir && (
        <div className="q-fim">
          <button type="button" className="btn block" disabled={Boolean(faltam)} onClick={finalizar}>Finalizar vistoria</button>
          {faltam && <p className="mono">{faltam}</p>}
        </div>
      )}
      {ncItem && <FormNc item={ncItem} onSalvar={salvarNc} onFechar={() => setNcItem(null)} />}
      {caixa}
    </>
  )
}

export default function Vistorias({ avisar }) {
  const q = useQualidade()
  const { usuario } = useDados()
  const podeGerir = pode(usuario.role, 'gerirQualidade')
  const [abertaId, setAbertaId] = useState(null)
  const [nova, setNova] = useState(false)
  const ordenadas = [...q.vistorias].sort((a, b) => (a.status === 'concluida') - (b.status === 'concluida') || b.criadaEm.localeCompare(a.criadaEm))

  const criar = (modeloId, ambiente) => {
    setNova(false)
    const { id, promessa } = q.criarVistoria(modeloId, ambiente)
    setAbertaId(id)
    promessa.then((e) => { if (e) { setAbertaId(null); avisar(e) } })
  }

  if (abertaId) return <Checklist id={abertaId} podeGerir={podeGerir} avisar={avisar} onVoltar={() => setAbertaId(null)} />

  const botao = podeGerir && q.modelos.length > 0 && (
    <button type="button" className="btn" onClick={() => setNova(true)}><Icone nome="plus" />Nova vistoria</button>
  )
  return (
    <>
      {ordenadas.length === 0 ? (
        <Vazio icone="qualidade" titulo="Nenhuma vistoria ainda" texto={q.modelos.length ? 'Escolha um modelo de ficha e o ambiente para começar o primeiro checklist.' : 'Crie primeiro um modelo de ficha na aba Modelos.'}>
          {botao}
        </Vazio>
      ) : (
        <>
          <div className="q-barra-acao">{botao}</div>
          <div className="q-grid">{ordenadas.map((v) => <CartaoVistoria key={v.id} v={v} onAbrir={setAbertaId} />)}</div>
        </>
      )}
      {nova && <FormNovaVistoria modelos={q.modelos} onSalvar={criar} onFechar={() => setNova(false)} />}
    </>
  )
}
