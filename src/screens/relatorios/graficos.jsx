// Peças dos gráficos dos Relatórios: tudo em CSS e SVG, sem biblioteca. Cada peça aceita lista vazia e nunca mostra NaN.
import { Icone } from '../../components/index.jsx'
import { MODULOS } from '../../lib/biData.js'
import { formatarDataCurta } from '../../lib/regras.js'

// Estado vazio elegante: o módulo que alimenta o painel ainda não foi construído (ou ainda não tem registro).
// `modulos` (de modulosDisponiveis) diz se o módulo tem dado: se tem, o vazio é culpa do filtro, não do módulo.
export function Bloqueado({ modulo, modulos, mini = false }) {
  const nome = MODULOS[modulo] || modulo
  if (modulos?.[modulo]) return <SemDado />
  return (
    <div className={`bi-bloq${mini ? ' mini' : ''}`} role="note">
      <Icone nome="cadeado" />
      <b>Painel bloqueado</b>
      <p>Construa o módulo <strong>[{nome}]</strong> pra liberar este painel</p>
    </div>
  )
}

// Módulo existe, mas o filtro (ou o período) não deixou nada na tela.
export const SemDado = ({ texto = 'Nenhum registro com os filtros escolhidos.' }) => <div className="bi-sem-dado">{texto}</div>

export function Cartao({ titulo, subtitulo, children, className = '' }) {
  return (
    <div className={`bi-card ${className}`}>
      <h3>{titulo}</h3>
      {subtitulo && <p className="sub">{subtitulo}</p>}
      {children}
    </div>
  )
}

export function Legenda({ itens }) {
  return (
    <ul className="bi-legenda">
      {itens.map((i) => (
        <li key={i.rotulo}><i className={i.linha ? 'linha' : ''} style={{ background: i.cor }} />{i.rotulo}</li>
      ))}
    </ul>
  )
}

const SETA = {
  sobe: <path d="M12 19V5M5 12l7-7 7 7" />,
  desce: <path d="M12 5v14M5 12l7 7 7-7" />,
}
export function Kpi({ titulo, valor, pequeno, detalhe, tom = '', seta = null }) {
  return (
    <div className={`bi-kpi ${tom}`}>
      <span className="t">{titulo}</span>
      <span className="v">
        {valor}{pequeno && <small>{pequeno}</small>}
        {seta && (
          <span className={`seta ${seta}`} role="img" aria-label={seta === 'sobe' ? 'à frente do planejado' : 'atrás do planejado'}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{SETA[seta]}</svg>
          </span>
        )}
      </span>
      {detalhe && <span className="s">{detalhe}</span>}
    </div>
  )
}

// Donut: conic-gradient com um círculo vazado por cima. `fatias` = [{ rotulo, valor, cor }]; total zero = anel cinza.
export function Donut({ fatias, centro, rotuloCentro, legenda = true, resumo }) {
  const total = fatias.reduce((s, f) => s + (Number(f.valor) || 0), 0)
  let acumulado = 0
  const partes = total
    ? fatias.filter((f) => f.valor > 0).map((f) => {
      const de = (acumulado / total) * 100
      acumulado += f.valor
      return `${f.cor} ${de}% ${(acumulado / total) * 100}%`
    })
    : ['var(--bi-plan-fraco) 0% 100%']
  return (
    <div className="bi-donut-caixa">
      <div className="bi-donut" style={{ background: `conic-gradient(${partes.join(', ')})` }} role="img" aria-label={resumo}>
        <div className="centro"><div><b>{centro}</b>{rotuloCentro && <span>{rotuloCentro}</span>}</div></div>
      </div>
      {legenda && (
        <ul className="bi-legenda">
          {fatias.map((f) => <li key={f.rotulo}><i style={{ background: f.cor }} />{f.rotulo}: <b>{f.valor}</b></li>)}
        </ul>
      )}
    </div>
  )
}

// Curva S: linha cinza = % planejado acumulado; linha teal com área = % real acumulado. Rola na horizontal se tiver muitas semanas.
export function CurvaS({ semanas }) {
  const L = 40
  const D = 14
  const T = 14
  const B = 34
  const H = 250
  const POR_SEMANA = 48
  const W = Math.max(520, L + D + semanas.length * POR_SEMANA)
  const largura = (W - L - D) / semanas.length
  const x = (i) => L + (i + 0.5) * largura
  const y = (v) => T + ((100 - v) / 100) * (H - T - B)
  const ponto = (s, i, chave) => `${x(i).toFixed(1)},${y(s[chave]).toFixed(1)}`
  const plan = semanas.map((s, i) => ponto(s, i, 'plan')).join(' ')
  const reais = semanas.map((s, i) => ({ s, i })).filter(({ s }) => s.real !== null)
  const real = reais.map(({ s, i }) => ponto(s, i, 'real')).join(' ')
  const area = reais.length
    ? `${x(reais[0].i).toFixed(1)},${y(0)} ${real} ${x(reais[reais.length - 1].i).toFixed(1)},${y(0)}`
    : ''
  const hoje = semanas.findIndex((s) => s.atual)
  const ultimoReal = reais.length ? reais[reais.length - 1].s : null
  const resumo = ultimoReal
    ? `Curva S: na semana de ${formatarDataCurta(ultimoReal.inicio)}, ${ultimoReal.real}% realizado e ${ultimoReal.plan}% planejado.`
    : 'Curva S: sem avanço registrado.'
  return (
    <div className="bi-rolagem">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={resumo}>
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={L} x2={W - D} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeWidth="1" />
            <text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--muted)" fontWeight="700">{v}%</text>
          </g>
        ))}
        {hoje >= 0 && (
          <g>
            <line x1={x(hoje)} x2={x(hoje)} y1={T} y2={H - B} stroke="var(--ink)" strokeWidth="1.5" strokeDasharray="4 4" />
            <text x={x(hoje)} y={T - 3} textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--ink)">hoje</text>
          </g>
        )}
        {area && <polygon points={area} fill="var(--bi-real-fraco)" />}
        <polyline points={plan} fill="none" stroke="var(--bi-plan)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        {real && <polyline points={real} fill="none" stroke="var(--bi-real)" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />}
        {reais.map(({ s, i }) => <circle key={s.inicio} cx={x(i)} cy={y(s.real)} r="3.5" fill="var(--bi-real)" />)}
        {semanas.map((s, i) => (
          <text key={s.inicio} x={x(i)} y={H - B + 16} textAnchor="middle" fontSize="11" fill="var(--muted)" fontWeight="700">{formatarDataCurta(s.inicio)}</text>
        ))}
        <text x={L} y={H - 4} fontSize="11" fill="var(--muted)" fontWeight="700">início da semana</text>
      </svg>
    </div>
  )
}
