import { useEffect, useRef } from 'react'
import { useDados } from '../lib/DadosContext.jsx'
import {
  desvio, formatarData, formatarDataCurta, planejadoHoje, rotuloSemaforo, semaforo, ultimoMotivo,
} from '../lib/regras.js'

const CAMINHOS = {
  painel: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
  frentes: <><path d="M4 6h16M4 12h16M4 18h10" /><circle cx="19" cy="18" r="1.4" /></>,
  diario: <><path d="M6 3h11a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6z" /><path d="M9 8h6M9 12h6M9 16h3" /></>,
  rdo: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1M9 11h6M9 15h4" /></>,
  medicoes: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  restricoes: <><path d="M12 3 2 20h20z" /><path d="M12 10v4M12 17.5v.01" /></>,
  materiais: <><path d="M3 8l9-5 9 5v9l-9 5-9-5z" /><path d="M3 8l9 5 9-5M12 13v9" /></>,
  planejamento: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4M7 14h4M13 14h4M7 18h7" /></>,
  mais: <><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></>,
  admin: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" /><path d="M18 8v6M15 11h6" /></>,
  fotos: <><path d="M4 8h3l2-3h6l2 3h3v12H4z" /><circle cx="12" cy="13.5" r="3.5" /></>,
  perfil: <><circle cx="12" cy="8" r="4" /><path d="M4 21c.8-4.2 4-6 8-6s7.2 1.8 8 6" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  proxima: <path d="M9 5l7 7-7 7" />,
  check: <path d="M5 12l5 5L20 7" />,
  't-material': <><path d="M3 8l9-5 9 5v9l-9 5-9-5z" /><path d="M3 8l9 5 9-5M12 13v9" /></>,
  't-mao': <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" /><circle cx="18" cy="9" r="2.5" /><path d="M18 14.5c2 .3 3.3 1.8 3.5 4.5" /></>,
  't-metodo': <><path d="M9 6h11M9 12h11M9 18h11" /><path d="M3.5 6l1.5 1.5L7 5M3.5 12l1.5 1.5L7 11M3.5 18l1.5 1.5L7 17" /></>,
  't-equip': <path d="M14.5 6.5a4 4 0 0 0-5 5L3 18l3 3 6.5-6.5a4 4 0 0 0 5-5l-2.5 2.5-2.5-.5-.5-2.5z" />,
  't-projeto': <><rect x="3" y="4" width="18" height="16" rx="1.5" /><path d="M3 9h18M9 9v11" /></>,
  't-seguranca': <><path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z" /><path d="M9 12l2 2 4-4" /></>,
  't-logistica': <><path d="M2 6h11v10H2zM13 10h5l3 3v3h-8" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></>,
  voltar: <path d="M15 5l-7 7 7 7" />,
}

export const Logo = () => <span className="placa"><img src="/logo-kaefer.jpg" alt="Kaefer Rip" /></span>

export function Icone({ nome, tamanho }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {CAMINHOS[nome]}
    </svg>
  )
}

export function Topo({ titulo, subtitulo, children }) {
  const { usuario, hoje } = useDados()
  return (
    <div className="topbar">
      <div>
        <h1>{titulo}</h1>
        {subtitulo && <div className="sub">{subtitulo}</div>}
      </div>
      {children || (
        <div className="who"><b>{usuario.nome}</b>{usuario.role} · {formatarData(hoje)}</div>
      )}
    </div>
  )
}

export const Chip = ({ tom = 'neutral', children }) => <span className={`chip ${tom}`}>{children}</span>

export function Vazio({ icone = 'frentes', titulo, texto, children }) {
  return (
    <div className="empty">
      <div className="ic"><Icone nome={icone} /></div>
      <h3>{titulo}</h3>
      {texto && <p>{texto}</p>}
      {children}
    </div>
  )
}

export function Aba({ opcoes, valor, onTroca }) {
  return (
    <div className="tabs">
      {opcoes.map(([k, rotulo]) => (
        <button key={k} className={valor === k ? 'on' : ''} onClick={() => onTroca(k)}>{rotulo}</button>
      ))}
    </div>
  )
}

export function Seletor({ valor, onTroca, rotulo, opcoes, todas }) {
  return (
    <select className="select" aria-label={rotulo} value={valor} onChange={(e) => onTroca(e.target.value)}>
      {todas !== undefined && <option value="">{todas}</option>}
      {opcoes.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
    </select>
  )
}

export function BarraAvanco({ real, plan }) {
  const desv = real - plan
  return (
    <div className="pbar">
      <div className="tr"><i style={{ width: `${real}%` }} /><u style={{ left: `calc(${plan}% - 1px)` }} /></div>
      <small>
        Real {Math.round(real)}% · planejado {Math.round(plan)}%
        {desv < -0.5 && <> · <span className="neg">{Math.round(desv)} pts</span></>}
      </small>
    </div>
  )
}

export function CabecalhoDaLista({ cliente }) {
  if (cliente) return <div className="flist-head cli"><div>Frente</div><div>Avanço</div><div>Planejado</div></div>
  return (
    <div className="flist-head">
      <div>Frente</div><div>Dias sem avanço</div><div>Real × planejado</div><div>Impacto no prazo</div><div>Decidir até</div><div>Responsável</div>
    </div>
  )
}

// Linha de frente para quem vê tudo (Coordenador, Planejamento, Engenharia, Produção, Diretoria).
export function FrenteItem({ f, onAbrir }) {
  const { hoje, apontamentos, nomeDe } = useDados()
  const tom = semaforo(f, hoje)
  const motivo = ultimoMotivo(f.id, apontamentos)
  const dias = f.dias_sem_avanco === null || f.status === 'Concluída' || f.status === 'Não iniciada' || f.eh_marco ? '—' : f.dias_sem_avanco
  return (
    <button className={`frente ${tom}`} onClick={() => onAbrir(f.id)}>
      <div>
        <div className="t">{f.nome}</div>
        <div className="s mono">{f.disciplina} · {f.local}</div>
        <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Chip tom={tom}>{rotuloSemaforo(f, hoje)}</Chip>
          {motivo && f.status === 'Parada' && <span className="tag">{motivo}</span>}
        </div>
      </div>
      <div className="days"><div className="n">{dias}</div><div className="u">dias sem avanço</div></div>
      <div className="meta">
        {f.eh_marco
          ? <div className="pbar"><small>Marco em {formatarData(f.fim_planejado)}</small></div>
          : <BarraAvanco real={f.percentual_realizado} plan={planejadoHoje(f, hoje)} />}
        {f.impacto_prazo_dias ? <span className="neg">+{f.impacto_prazo_dias} dias</span> : <span className="mono">—</span>}
        {f.data_limite_decisao
          ? <span style={{ fontWeight: 800 }}>{formatarDataCurta(f.data_limite_decisao)}</span>
          : <span className="mono">—</span>}
        <span style={{ fontSize: '.88rem' }}>{nomeDe(f.responsavel_id) || '—'}</span>
      </div>
    </button>
  )
}

// Versão do Cliente: sem responsável, sem dias sem avanço, sem impacto no prazo.
export function FrenteItemCliente({ f, onAbrir }) {
  const { hoje } = useDados()
  return (
    <button className="frente cli" style={{ gridTemplateColumns: '1fr' }} onClick={() => onAbrir(f.id)}>
      <div>
        <div className="t">{f.nome}</div>
        <div className="s mono">{f.local} · {f.disciplina}</div>
      </div>
      {f.eh_marco
        ? <div className="pbar"><small>Marco em {formatarData(f.fim_planejado)}</small></div>
        : <BarraAvanco real={f.percentual_realizado} plan={planejadoHoje(f, hoje)} />}
      <div className="mono">{formatarData(f.inicio_planejado)} a {formatarData(f.fim_planejado)}</div>
    </button>
  )
}

export function Modal({ onFechar, children }) {
  const fechar = useRef(null)
  useEffect(() => {
    const aoTeclar = (e) => e.key === 'Escape' && onFechar()
    document.addEventListener('keydown', aoTeclar)
    fechar.current?.focus()
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [onFechar])
  return (
    <div className="modal" onClick={onFechar} role="dialog" aria-modal="true">
      <div className="box" onClick={(e) => e.stopPropagation()}>
        {children}
        <button ref={fechar} className="btn secondary block" onClick={onFechar}>Fechar</button>
      </div>
    </div>
  )
}

export { desvio }
