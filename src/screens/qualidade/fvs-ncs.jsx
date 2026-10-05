import { useState } from 'react'
import { Chip, Vazio } from '../../components/index.jsx'
import { useDados } from '../../lib/DadosContext.jsx'
import { useQualidade } from '../../lib/QualidadeContext.jsx'
import { formatarData, pode } from '../../lib/regras.js'
import { acoesDaNc, diasEmAberto, ordenarNcs, STATUS_NC, TOM_SEVERIDADE } from '../../lib/qualidade.js'
import { Folha } from '../planejamento/ui.jsx'
import { Foto } from './ui.jsx'

const textoDias = (n) => (n === 1 ? '1 dia' : `${n} dias`)

function CartaoNc({ nc, hoje, onAbrir }) {
  const st = STATUS_NC[nc.status]
  return (
    <button type="button" className="q-card" onClick={() => onAbrir(nc.id)}>
      <div className="q-card-topo">
        <b className="q-num">{nc.codigo}</b>
        <Chip tom={st.tom}>{st.rotulo}</Chip>
      </div>
      <div className="q-desc">{nc.titulo}</div>
      <div className="q-meta"><span>{nc.servico} · {nc.ambiente}</span></div>
      <div className="q-meta">
        <Chip tom={TOM_SEVERIDADE[nc.severidade]}>{nc.severidade}</Chip>
        <span>{nc.responsavel}</span>
        <span>{nc.status === 'fechada' ? `Fechada em ${textoDias(diasEmAberto(nc, hoje))}` : `${textoDias(diasEmAberto(nc, hoje))} em aberto`}</span>
      </div>
    </button>
  )
}

function DetalheNc({ id, podeGerir, avisar, onFechar }) {
  const q = useQualidade()
  const nc = q.ncs.find((n) => n.id === id)
  if (!nc) return null
  const st = STATUS_NC[nc.status]
  const agir = (chave, rotulo) => {
    q.agirNaNc(nc.id, chave).then((e) => e && avisar(e))
    avisar(rotulo)
  }
  const dado = (rotulo, valor) => <div><dt>{rotulo}</dt><dd>{valor}</dd></div>
  return (
    <Folha titulo={`${nc.codigo} · ${nc.titulo}`} larga onFechar={onFechar}>
      {() => (
        <>
          <div className="q-card-topo">
            <Chip tom={st.tom}>{st.rotulo}</Chip>
            <Chip tom={TOM_SEVERIDADE[nc.severidade]}>{nc.severidade}</Chip>
          </div>
          {nc.fotos.length > 0 && <div className="q-fotos-detalhe">{nc.fotos.map((f) => <Foto key={f} src={f} alt="Foto da não conformidade" />)}</div>}
          <dl className="q-dados">
            {dado('Serviço', nc.servico)}
            {dado('Ambiente', nc.ambiente)}
            {dado('Item da ficha', nc.itemNumero)}
            {dado('Responsável', nc.responsavel)}
            {dado('Aberta em', formatarData(nc.abertaEm))}
            {dado(nc.status === 'fechada' ? 'Dias até fechar' : 'Dias em aberto', textoDias(diasEmAberto(nc, q.hoje)))}
          </dl>
          <h3 className="q-titulo-card">Problema</h3>
          <p>{nc.descricao}</p>
          <h3 className="q-titulo-card">Solução proposta</h3>
          <p>{nc.solucao}</p>
          {podeGerir && acoesDaNc(nc).length > 0 && (
            <div className="form-actions">
              {acoesDaNc(nc).map((a) => (
                <button key={a.chave} type="button" className={a.chave === 'reprovar' ? 'btn secondary' : 'btn'} onClick={() => agir(a.chave, a.chave === 'reprovar' ? 'NC reprovada: volta para correção' : `${nc.codigo}: ${a.para}`)}>{a.botao}</button>
              ))}
            </div>
          )}
          <h3 className="section-title">Linha do tempo</h3>
          <ol className="q-timeline">
            {nc.timeline.map((t, i) => <li key={`${i}-${t.em}`}><span className="mono">{t.em}</span>{t.texto}</li>)}
          </ol>
          <button type="button" className="btn secondary block" onClick={onFechar}>Fechar</button>
        </>
      )}
    </Folha>
  )
}

export default function NaoConformidades({ avisar }) {
  const q = useQualidade()
  const { usuario } = useDados()
  const podeGerir = pode(usuario.role, 'gerirQualidade')
  const [aberta, setAberta] = useState(null)
  const { filtroNc: filtro, setFiltroNc: setFiltro } = q
  const lista = ordenarNcs(q.ncs.filter((n) => !filtro || n.status === filtro), q.hoje)

  if (q.ncs.length === 0) {
    return <Vazio icone="restricoes" titulo="Nenhuma não conformidade" texto="Elas aparecem aqui quando você marca NC em um item de uma vistoria." />
  }
  return (
    <>
      <div className="q-filtros um">
        <select className="select" aria-label="Status da NC" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="">Todos os status</option>
          {Object.entries(STATUS_NC).map(([k, s]) => <option key={k} value={k}>{s.rotulo}</option>)}
        </select>
      </div>
      {lista.length === 0
        ? <Vazio icone="restricoes" titulo="Nenhuma NC com esse status" texto="Troque o filtro para ver as outras." />
        : <div className="q-grid">{lista.map((n) => <CartaoNc key={n.id} nc={n} hoje={q.hoje} onAbrir={setAberta} />)}</div>}
      {aberta && <DetalheNc id={aberta} podeGerir={podeGerir} avisar={avisar} onFechar={() => setAberta(null)} />}
    </>
  )
}
