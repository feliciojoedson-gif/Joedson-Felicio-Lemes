import { useState } from 'react'
import { Chip, Icone, Vazio } from '../../components/index.jsx'
import { useDados } from '../../lib/DadosContext.jsx'
import { useQualidade } from '../../lib/QualidadeContext.jsx'
import { formatarData, pode } from '../../lib/regras.js'
import {
  diasDeAtraso, errosPendencia, filtrarPendencias, kpisPendencias, ordenarPendencias, pendentesPorResponsavel, PRAZOS_PENDENCIA,
  PROXIMO_PASSO, responsaveisDasPendencias, STATUS_PENDENCIA, vencida,
} from '../../lib/qualidade.js'
import { Aviso, Folha, useAvisos, useConfirmar } from '../planejamento/ui.jsx'
import { CampoFoto, Estado, Foto, Kpi } from './ui.jsx'

const SeloVencido = () => <span className="q-selo" role="img" aria-label="Vencido">VENCIDO</span>

function Cartao({ p, hoje, onAbrir }) {
  const st = STATUS_PENDENCIA[p.status]
  const atrasada = vencida(p, hoje)
  return (
    <button type="button" className={`q-card ${p.status}`} onClick={() => onAbrir(p.id)}>
      <div className="q-card-topo">
        <b className="q-num">#{p.numeroRegistro}</b>
        <Chip tom={st.tom}>{st.rotulo}</Chip>
      </div>
      <div className="q-foto-caixa">
        <Foto src={p.foto} alt={`Foto da pendência ${p.numeroRegistro}`} />
        {atrasada && <SeloVencido />}
      </div>
      <div className="q-desc">{p.descricao}</div>
      <div className="q-meta">
        <span><Icone nome="perfil" tamanho={16} /> {p.responsavel}</span>
        <span className={atrasada ? 'q-atraso' : ''}>Prazo {formatarData(p.prazo)}</span>
      </div>
    </button>
  )
}

function FormNova({ empresas, onSalvar, onFechar }) {
  const { hoje, usuario } = useDados()
  const [c, setC] = useState({
    foto: '', descricao: '', local: '', pavimento: '', empresa: '', responsavel: '', vistoriadoPor: usuario.nome, dataVistoria: hoje, prazo: hoje,
  })
  const campo = (k) => (v) => setC((x) => ({ ...x, [k]: v }))
  const erros = errosPendencia(c)
  const { aviso, tocar, tentar } = useAvisos(erros)
  const sujo = Boolean(c.foto || c.descricao || c.local || c.pavimento || c.empresa || c.responsavel)
  const texto = (k, rotulo, extra = {}) => (
    <div className="field">
      <label htmlFor={`pn-${k}`}>{rotulo}</label>
      <input id={`pn-${k}`} className="input" maxLength={80} value={c[k]} onChange={(e) => campo(k)(e.target.value)} onBlur={() => tocar(k)} {...extra} />
      <Aviso texto={aviso(k)} />
    </div>
  )
  return (
    <Folha titulo="Nova pendência" sujo={sujo} larga onFechar={onFechar}>
      {(fechar) => (
        <>
          <CampoFoto id="pn-foto" rotulo="Foto do problema" valor={c.foto} onTroca={campo('foto')} />
          <div className="field">
            <label htmlFor="pn-descricao">Descrição</label>
            <textarea id="pn-descricao" rows={3} maxLength={300} placeholder="O que está errado?" value={c.descricao} onChange={(e) => campo('descricao')(e.target.value)} onBlur={() => tocar('descricao')} />
            <Aviso texto={aviso('descricao')} />
          </div>
          {texto('local', 'Local', { placeholder: 'Ex.: Linha L-340' })}
          <div className="field">
            <label htmlFor="pn-pavimento">Pavimento (opcional)</label>
            <input id="pn-pavimento" className="input" maxLength={40} placeholder="Ex.: Rack 3" value={c.pavimento} onChange={(e) => campo('pavimento')(e.target.value)} />
          </div>
          <datalist id="pn-empresas">{empresas.map((e) => <option key={e} value={e} />)}</datalist>
          {texto('empresa', 'Empresa que corrige', { list: 'pn-empresas' })}
          {texto('responsavel', 'Responsável pelo acompanhamento')}
          <div className="field">
            <label htmlFor="pn-vistoriadoPor">Vistoriado por</label>
            <input id="pn-vistoriadoPor" className="input" maxLength={80} value={c.vistoriadoPor} onChange={(e) => campo('vistoriadoPor')(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="pn-vistoria">Data da vistoria</label>
            <input id="pn-vistoria" className="input" type="date" value={c.dataVistoria} onChange={(e) => campo('dataVistoria')(e.target.value)} onBlur={() => tocar('dataVistoria')} />
            <Aviso texto={aviso('dataVistoria')} />
          </div>
          <div className="field">
            <label htmlFor="pn-prazo">Prazo para corrigir</label>
            <input id="pn-prazo" className="input" type="date" value={c.prazo} onChange={(e) => campo('prazo')(e.target.value)} onBlur={() => tocar('prazo')} />
            <Aviso texto={aviso('prazo')} />
          </div>
          <div className="form-actions">
            <button type="button" className="btn" onClick={() => tentar() && onSalvar(c)}>Registrar pendência</button>
            <button type="button" className="btn secondary" onClick={fechar}>Cancelar</button>
          </div>
        </>
      )}
    </Folha>
  )
}

// A foto da correção é obrigatória: é a prova de que foi resolvido.
function FormResolver({ p, onSalvar, onFechar }) {
  const [foto, setFoto] = useState('')
  const [tentou, setTentou] = useState(false)
  return (
    <Folha titulo={`Resolver #${p.numeroRegistro}`} sujo={Boolean(foto)} onFechar={onFechar}>
      {(fechar) => (
        <>
          <p>Anexe a foto que mostra a correção feita.</p>
          <CampoFoto id="rs-foto" rotulo="Foto da correção" obrigatoria valor={foto} onTroca={setFoto} erro={tentou && !foto ? 'Tire a foto que mostra a correção.' : ''} />
          <div className="form-actions">
            <button type="button" className="btn" onClick={() => { setTentou(true); if (foto) onSalvar(foto) }}>Marcar como resolvido</button>
            <button type="button" className="btn secondary" onClick={fechar}>Cancelar</button>
          </div>
        </>
      )}
    </Folha>
  )
}

function Detalhe({ id, podeGerir, podeApagar, avisar, onFechar }) {
  const q = useQualidade()
  const p = q.pendencias.find((x) => x.id === id)
  const [nota, setNota] = useState('')
  const [resolvendo, setResolvendo] = useState(false)
  const { pedir, caixa } = useConfirmar()
  if (!p) return null
  const st = STATUS_PENDENCIA[p.status]
  const passo = PROXIMO_PASSO[p.status]
  const atraso = diasDeAtraso(p, q.hoje)
  const falhou = (promessa) => promessa.then((e) => e && avisar(e))

  const avancar = () => {
    if (passo.para === 'resolvido') { setResolvendo(true); return }
    falhou(q.mudarStatus(p.id, passo.para))
    avisar('Pendência em andamento')
  }
  const resolver = (fotoEvidencia) => {
    setResolvendo(false)
    falhou(q.mudarStatus(p.id, 'resolvido', { fotoEvidencia }))
    avisar('Pendência resolvida')
  }
  const anotar = () => {
    if (!nota.trim()) return
    falhou(q.adicionarObservacao(p.id, nota))
    setNota('')
    avisar('Observação registrada')
  }
  const excluir = () => pedir(`Excluir a pendência #${p.numeroRegistro}? Isso não pode ser desfeito.`, () => {
    onFechar()
    falhou(q.excluirPendencia(p.id))
    avisar('Pendência excluída')
  }, 'Excluir')
  const linhas = p.observacoes ? p.observacoes.split('\n') : []
  const dado = (rotulo, valor) => (valor ? <div><dt>{rotulo}</dt><dd>{valor}</dd></div> : null)

  return (
    <>
      <Folha titulo={`Pendência #${p.numeroRegistro}`} sujo={Boolean(nota.trim())} larga onFechar={onFechar}>
        {() => (
          <>
            <div className="q-card-topo">
              <Chip tom={st.tom}>{st.rotulo}</Chip>
              {atraso > 0 && <span className="q-selo solto">VENCIDO há {atraso} {atraso === 1 ? 'dia' : 'dias'}</span>}
            </div>
            <div className="q-fotos-detalhe">
              <figure><Foto src={p.foto} alt="Foto do problema" /><figcaption>Problema</figcaption></figure>
              {p.fotoEvidencia && <figure><Foto src={p.fotoEvidencia} alt="Foto da correção" /><figcaption>Correção · {formatarData(p.dataResolucao)}</figcaption></figure>}
            </div>
            <p className="q-desc cheia">{p.descricao}</p>
            <dl className="q-dados">
              {dado('Local', p.local)}
              {dado('Pavimento', p.pavimento)}
              {dado('Empresa', p.empresa)}
              {dado('Responsável', p.responsavel)}
              {dado('Prazo', formatarData(p.prazo))}
              {dado('Vistoria', `${formatarData(p.dataVistoria)} · ${p.vistoriadoPor}`)}
              {p.dataResolucao && dado('Resolvido em', formatarData(p.dataResolucao))}
            </dl>
            {podeGerir && passo && (
              <button type="button" className="btn block" onClick={avancar}>{passo.botao}</button>
            )}
            <h3 className="section-title">Observações</h3>
            {podeGerir && (
              <div className="field">
                <label htmlFor="pd-nota">Nova observação</label>
                <textarea id="pd-nota" rows={2} maxLength={300} placeholder="Escreva uma observação…" value={nota} onChange={(e) => setNota(e.target.value)} />
                <button type="button" className="btn secondary block" disabled={!nota.trim()} onClick={anotar}>Adicionar observação</button>
              </div>
            )}
            {linhas.length === 0
              ? <p className="mono">Nenhuma observação ainda.</p>
              : <ul className="q-log">{linhas.map((l, i) => <li key={`${i}-${l}`}>{l}</li>)}</ul>}
            {podeApagar && <button type="button" className="btn secondary block q-excluir" onClick={excluir}>Excluir pendência</button>}
            <button type="button" className="btn secondary block" onClick={onFechar}>Fechar</button>
          </>
        )}
      </Folha>
      {resolvendo && <FormResolver p={p} onSalvar={resolver} onFechar={() => setResolvendo(false)} />}
      {caixa}
    </>
  )
}

export default function Pendencias({ avisar }) {
  const q = useQualidade()
  const { usuario } = useDados()
  const podeGerir = pode(usuario.role, 'gerirQualidade')
  const [nova, setNova] = useState(false)
  const [aberta, setAberta] = useState(null)
  const { pendencias, filtrosPend: f, setFiltrosPend } = q

  const kpis = kpisPendencias(pendencias)
  const porResponsavel = pendentesPorResponsavel(pendencias)
  const visiveis = ordenarPendencias(filtrarPendencias(pendencias, f, q.hoje))
  const filtrando = Boolean(f.status || f.responsavel || f.prazo || f.busca)
  const muda = (k) => (e) => setFiltrosPend((x) => ({ ...x, [k]: e.target.value }))
  const salvar = (campos) => {
    setNova(false)
    q.criarPendencia(campos).then((e) => e && avisar(e))
    avisar('Pendência registrada')
  }
  const formNova = nova && (
    <FormNova empresas={[...new Set(pendencias.map((p) => p.empresa))].sort()} onSalvar={salvar} onFechar={() => setNova(false)} />
  )

  const vazio = q.status === 'pronto' && pendencias.length === 0 ? (
    <>
      <Vazio icone="qualidade" titulo="Nenhuma pendência ainda" texto="Faça a vistoria e registre o primeiro problema: tire a foto, descreva e escolha quem corrige.">
        {podeGerir && <button type="button" className="btn" onClick={() => setNova(true)}><Icone nome="plus" />Registrar a primeira pendência</button>}
      </Vazio>
      {formNova}
    </>
  ) : null

  return (
    <Estado vazio={vazio}>
      <div className="q-kpis">
        <Kpi rotulo="Total" valor={kpis.total} cor="var(--slate)" />
        <Kpi rotulo="Pendentes" valor={kpis.pendente} cor="var(--bad)" />
        <Kpi rotulo="Em andamento" valor={kpis.em_andamento} cor="var(--warn)" />
        <Kpi rotulo="Resolvidos" valor={kpis.resolvido} cor="var(--ok)" />
      </div>

      <div className="card q-resp">
        <h3 className="q-titulo-card">Pendentes por responsável</h3>
        {porResponsavel.length === 0
          ? <p className="mono">Nada em aberto.</p>
          : <div className="q-badges">{porResponsavel.map((r) => <span key={r.nome} className="q-badge"><b>{r.qtd}</b>{r.nome}</span>)}</div>}
      </div>

      <div className="q-filtros">
        <input className="input" type="search" aria-label="Buscar por texto ou local" placeholder="Buscar por texto ou local" value={f.busca} onChange={muda('busca')} />
        <select className="select" aria-label="Status" value={f.status} onChange={muda('status')}>
          <option value="">Todos os status</option>
          {Object.entries(STATUS_PENDENCIA).map(([k, s]) => <option key={k} value={k}>{s.rotulo}</option>)}
        </select>
        <select className="select" aria-label="Responsável" value={f.responsavel} onChange={muda('responsavel')}>
          <option value="">Todos os responsáveis</option>
          {responsaveisDasPendencias(pendencias).map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select className="select" aria-label="Prazo" value={f.prazo} onChange={muda('prazo')}>
          <option value="">Todos os prazos</option>
          {PRAZOS_PENDENCIA.map(([k, t]) => <option key={k} value={k}>{t}</option>)}
        </select>
      </div>

      {visiveis.length === 0 ? (
        <Vazio icone="qualidade" titulo="Nenhuma pendência com esses filtros" texto="Tire um filtro ou limpe a busca para ver as outras.">
          {filtrando && <button type="button" className="btn secondary" onClick={q.limparFiltrosPend}>Limpar filtros</button>}
        </Vazio>
      ) : (
        <div className="q-grid">{visiveis.map((p) => <Cartao key={p.id} p={p} hoje={q.hoje} onAbrir={setAberta} />)}</div>
      )}

      {podeGerir && (
        <button type="button" className="q-fab" aria-label="Nova pendência" onClick={() => setNova(true)}><Icone nome="fotos" /></button>
      )}
      {formNova}
      {aberta !== null && (
        <Detalhe id={aberta} podeGerir={podeGerir} podeApagar={pode(usuario.role, 'apagar')} avisar={avisar} onFechar={() => setAberta(null)} />
      )}
    </Estado>
  )
}
