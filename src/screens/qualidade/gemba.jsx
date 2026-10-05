import { useState } from 'react'
import { Icone, Vazio } from '../../components/index.jsx'
import { useDados } from '../../lib/DadosContext.jsx'
import { useQualidade } from '../../lib/QualidadeContext.jsx'
import { formatarData, pode } from '../../lib/regras.js'
import {
  classeDoDesperdicio, COLUNAS_GEMBA, DESPERDICIOS, errosGemba, filtrarGemba, ordenarGemba, PRAZOS_GEMBA, rankingDesperdicios, vencida,
} from '../../lib/qualidade.js'
import { Aviso, Folha, useAvisos, useConfirmar } from '../planejamento/ui.jsx'
import { CampoFoto, Estado, Foto } from './ui.jsx'

const Tag = ({ nome }) => <span className={`q-tag-d ${classeDoDesperdicio(nome)}`}>{nome}</span>

function Ranking({ lista }) {
  const ranking = rankingDesperdicios(lista)
  const maior = ranking[0]?.qtd || 1
  return (
    <div className="card q-resp">
      <h3 className="q-titulo-card">Ranking de desperdícios</h3>
      {ranking.length === 0 ? <p className="mono">Nenhum desperdício registrado.</p> : (
        <ol className="q-ranking">
          {ranking.map((r) => (
            <li key={r.nome}>
              <span className="q-rank-nome">{r.nome}</span>
              <span className="q-rank-barra"><i className={classeDoDesperdicio(r.nome)} style={{ width: `${(r.qtd / maior) * 100}%` }} /></span>
              <b>{r.qtd}</b>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function CartaoGemba({ o, hoje, podeGerir, onAbrir, onMover }) {
  const atrasada = vencida(o, hoje)
  return (
    <article className={`q-card gemba ${o.status}`}>
      <button type="button" className="q-card-corpo" onClick={() => onAbrir(o.id)}>
        {o.foto && <Foto src={o.foto} alt={`Foto: ${o.local}`} />}
        <div className="q-local"><Icone nome="pin" tamanho={16} /> {o.local}</div>
        <div className="q-desc">{o.descricao}</div>
        <div className="q-tags">{o.desperdicios.map((d) => <Tag key={d} nome={d} />)}</div>
        <div className="q-meta">
          <span><Icone nome="perfil" tamanho={16} /> {o.responsavel}</span>
          {o.prazo && <span className={atrasada ? 'q-selo solto' : ''}>{atrasada ? 'Vencido ' : 'Prazo '}{formatarData(o.prazo)}</span>}
        </div>
      </button>
      {podeGerir && (
        <select className="select" aria-label={`Mover observação de ${o.local}`} value={o.status} onChange={(e) => onMover(o.id, e.target.value)}>
          {COLUNAS_GEMBA.map(([k, t]) => <option key={k} value={k}>{k === o.status ? `Em: ${t}` : `Mover para ${t}`}</option>)}
        </select>
      )}
    </article>
  )
}

function FormNova({ onSalvar, onFechar }) {
  const [c, setC] = useState({ local: '', descricao: '', causaRaiz: '', acao: '', desperdicios: [], responsavel: '', prazo: '', foto: '' })
  const erros = errosGemba(c)
  const { aviso, tocar, tentar } = useAvisos(erros)
  const campo = (k) => (e) => setC((x) => ({ ...x, [k]: e.target.value }))
  const alternar = (nome) => setC((x) => ({ ...x, desperdicios: x.desperdicios.includes(nome) ? x.desperdicios.filter((d) => d !== nome) : [...x.desperdicios, nome] }))
  const sujo = Boolean(c.local || c.descricao || c.causaRaiz || c.acao || c.desperdicios.length || c.responsavel || c.prazo || c.foto)
  const texto = (k, rotulo, extra = {}) => (
    <div className="field">
      <label htmlFor={`gb-${k}`}>{rotulo}</label>
      <input id={`gb-${k}`} className="input" maxLength={80} value={c[k]} onChange={campo(k)} onBlur={() => tocar(k)} {...extra} />
      <Aviso texto={aviso(k)} />
    </div>
  )
  const area = (k, rotulo, placeholder) => (
    <div className="field">
      <label htmlFor={`gb-${k}`}>{rotulo}</label>
      <textarea id={`gb-${k}`} rows={2} maxLength={300} placeholder={placeholder} value={c[k]} onChange={campo(k)} onBlur={() => tocar(k)} />
      <Aviso texto={aviso(k)} />
    </div>
  )
  return (
    <Folha titulo="Nova observação" sujo={sujo} larga onFechar={onFechar}>
      {(fechar) => (
        <>
          <CampoFoto id="gb-foto" rotulo="Foto" valor={c.foto} onTroca={(foto) => setC((x) => ({ ...x, foto }))} />
          {texto('local', 'Local', { placeholder: 'Ex.: Rack 3 · Linha L-340' })}
          {area('descricao', 'O que você viu', 'Descreva a situação')}
          {area('causaRaiz', 'Causa raiz', 'Por que isso acontece?')}
          {area('acao', 'Ação', 'O que será feito para resolver')}
          <div className="field">
            <span className="lb">Tipos de desperdício</span>
            <div className="q-pills" role="group" aria-label="Tipos de desperdício">
              {DESPERDICIOS.map(([nome, classe]) => (
                <button key={nome} type="button" className={`q-pill ${classe} ${c.desperdicios.includes(nome) ? 'on' : ''}`} aria-pressed={c.desperdicios.includes(nome)} onClick={() => { alternar(nome); tocar('desperdicios') }}>{nome}</button>
              ))}
            </div>
            <Aviso texto={aviso('desperdicios')} />
          </div>
          {texto('responsavel', 'Responsável')}
          <div className="field">
            <label htmlFor="gb-prazo">Prazo (opcional)</label>
            <input id="gb-prazo" className="input" type="date" value={c.prazo} onChange={campo('prazo')} />
          </div>
          <div className="form-actions">
            <button type="button" className="btn" onClick={() => tentar() && onSalvar(c)}>Registrar observação</button>
            <button type="button" className="btn secondary" onClick={fechar}>Cancelar</button>
          </div>
        </>
      )}
    </Folha>
  )
}

function Detalhe({ id, podeGerir, avisar, onFechar }) {
  const q = useQualidade()
  const o = q.gemba.find((x) => x.id === id)
  const { pedir, caixa } = useConfirmar()
  if (!o) return null
  const atrasada = vencida(o, q.hoje)
  const excluir = () => pedir('Excluir esta observação? Isso não pode ser desfeito.', () => {
    onFechar()
    q.excluirGemba(o.id).then((e) => e && avisar(e))
    avisar('Observação excluída')
  }, 'Excluir')
  const mover = (status) => q.moverGemba(o.id, status).then((e) => e && avisar(e))
  const dado = (rotulo, valor) => <div><dt>{rotulo}</dt><dd>{valor}</dd></div>
  return (
    <>
      <Folha titulo={o.local} larga onFechar={onFechar}>
        {() => (
          <>
            {o.foto && <Foto src={o.foto} alt={`Foto: ${o.local}`} />}
            <div className="q-tags" style={{ marginTop: 10 }}>{o.desperdicios.map((d) => <Tag key={d} nome={d} />)}</div>
            <p className="q-desc cheia">{o.descricao}</p>
            <h3 className="q-titulo-card">Causa raiz</h3>
            <p>{o.causaRaiz}</p>
            <h3 className="q-titulo-card">Ação</h3>
            <p>{o.acao}</p>
            <dl className="q-dados">
              {dado('Responsável', o.responsavel)}
              {dado('Prazo', o.prazo ? `${formatarData(o.prazo)}${atrasada ? ' (vencido)' : ''}` : 'Sem prazo')}
              {dado('Status', COLUNAS_GEMBA.find(([k]) => k === o.status)[1])}
            </dl>
            {podeGerir && (
              <>
                <div className="chips" role="group" aria-label="Mover para">
                  {COLUNAS_GEMBA.filter(([k]) => k !== o.status).map(([k, t]) => <button key={k} type="button" onClick={() => mover(k)}>Mover para {t}</button>)}
                </div>
                <button type="button" className="btn secondary block q-excluir" onClick={excluir}>Excluir observação</button>
              </>
            )}
            <button type="button" className="btn secondary block" onClick={onFechar}>Fechar</button>
          </>
        )}
      </Folha>
      {caixa}
    </>
  )
}

export default function Gemba({ avisar }) {
  const q = useQualidade()
  const { usuario } = useDados()
  const podeGerir = pode(usuario.role, 'gerirQualidade')
  const [nova, setNova] = useState(false)
  const [aberta, setAberta] = useState(null)
  const { gemba, filtrosGemba: f, setFiltrosGemba } = q
  const visiveis = filtrarGemba(gemba, f, q.hoje)
  const filtrando = Boolean(f.tipo || f.prazo || f.busca)
  const muda = (k) => (e) => setFiltrosGemba((x) => ({ ...x, [k]: e.target.value }))
  const salvar = (campos) => {
    setNova(false)
    q.criarGemba(campos).then((e) => e && avisar(e))
    avisar('Observação registrada')
  }
  const mover = (id, status) => q.moverGemba(id, status).then((e) => e && avisar(e))
  const formNova = nova && <FormNova onSalvar={salvar} onFechar={() => setNova(false)} />

  const vazio = q.status === 'pronto' && gemba.length === 0 ? (
    <>
      <Vazio icone="qualidade" titulo="Nenhuma observação ainda" texto="Ande pela obra, veja onde há desperdício e registre a primeira observação: local, o que viu, a causa e a ação.">
        {podeGerir && <button type="button" className="btn" onClick={() => setNova(true)}><Icone nome="plus" />Registrar a primeira observação</button>}
      </Vazio>
      {formNova}
    </>
  ) : null

  return (
    <Estado vazio={vazio}>
      <Ranking lista={gemba} />

      <div className="q-filtros tres">
        <input className="input" type="search" aria-label="Buscar por texto ou local" placeholder="Buscar por texto ou local" value={f.busca} onChange={muda('busca')} />
        <select className="select" aria-label="Tipo de desperdício" value={f.tipo} onChange={muda('tipo')}>
          <option value="">Todos os desperdícios</option>
          {DESPERDICIOS.map(([nome]) => <option key={nome} value={nome}>{nome}</option>)}
        </select>
        <select className="select" aria-label="Prazo" value={f.prazo} onChange={muda('prazo')}>
          <option value="">Todos os prazos</option>
          {PRAZOS_GEMBA.map(([k, t]) => <option key={k} value={k}>{t}</option>)}
        </select>
      </div>

      {visiveis.length === 0 ? (
        <Vazio icone="qualidade" titulo="Nenhuma observação com esses filtros" texto="Tire um filtro ou limpe a busca para ver as outras.">
          {filtrando && <button type="button" className="btn secondary" onClick={q.limparFiltrosGemba}>Limpar filtros</button>}
        </Vazio>
      ) : (
        <div className="q-kanban">
          {COLUNAS_GEMBA.map(([status, titulo]) => {
            const doStatus = ordenarGemba(visiveis.filter((o) => o.status === status), q.hoje)
            return (
              <section key={status} className="q-coluna" aria-label={titulo}>
                <h3 className="q-coluna-titulo"><span>{titulo}</span><b>{doStatus.length}</b></h3>
                {doStatus.length === 0
                  ? <p className="mono q-coluna-vazia">Nada aqui.</p>
                  : doStatus.map((o) => <CartaoGemba key={o.id} o={o} hoje={q.hoje} podeGerir={podeGerir} onAbrir={setAberta} onMover={mover} />)}
              </section>
            )
          })}
        </div>
      )}

      {podeGerir && <button type="button" className="q-fab" aria-label="Nova observação" onClick={() => setNova(true)}><Icone nome="plus" /></button>}
      {formNova}
      {aberta !== null && <Detalhe id={aberta} podeGerir={podeGerir} avisar={avisar} onFechar={() => setAberta(null)} />}
    </Estado>
  )
}
