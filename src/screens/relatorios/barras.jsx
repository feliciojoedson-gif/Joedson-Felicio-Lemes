// Gráficos de barras dos Relatórios: divs proporcionais (barras horizontais) e SVG (clima & efetivo).
import { formatarDataCurta } from '../../lib/regras.js'

// Barras horizontais: largura proporcional ao maior valor. `itens` = [{ rotulo, valor, texto?, cor? }].
// `maximo` fixo (ex.: 100 para percentuais) ou, se omitido, o maior valor da lista.
export function BarrasH({ itens, maximo, cor = 'var(--bi-real)' }) {
  const teto = maximo || Math.max(1, ...itens.map((i) => Number(i.valor) || 0))
  return (
    <ul className="bi-barras">
      {itens.map((i) => {
        const largura = Math.max(0, Math.min(100, ((Number(i.valor) || 0) / teto) * 100))
        return (
          <li key={i.rotulo}>
            <span className="rot" title={i.rotulo}>{i.rotulo}</span>
            <span className="trilho"><span className="enchimento" style={{ width: `${largura}%`, background: i.cor || cor }} /></span>
            <b className="val">{i.texto ?? i.valor}</b>
          </li>
        )
      })}
    </ul>
  )
}

const ICONE_CLIMA = {
  sol: <><circle cx="12" cy="12" r="4" fill="#F5A623" stroke="#F5A623" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" stroke="#F5A623" /></>,
  nublado: <path d="M7 18h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7 9.5 4.3 4.3 0 0 0 7 18z" fill="#D9D5D2" stroke="#5B5754" />,
  chuva: <><path d="M7 14h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7 5.5 4.3 4.3 0 0 0 7 14z" fill="#B8CFE3" stroke="#3A6EA5" /><path d="M9 17l-1 3M13 17l-1 3M17 17l-1 3" stroke="#3A6EA5" /></>,
}

// Clima & Efetivo: colunas = efetivo do dia; ícone do clima em cima; dias de chuva com fundo azulado.
export function ClimaEfetivo({ dias, maxEfetivo }) {
  const L = 34
  const D = 10
  const T = 34
  const B = 30
  const H = 230
  const POR_DIA = 42
  const W = Math.max(520, L + D + dias.length * POR_DIA)
  const largura = (W - L - D) / dias.length
  const cx = (i) => L + (i + 0.5) * largura
  const y = (v) => T + (1 - v / maxEfetivo) * (H - T - B)
  const passos = [0, Math.ceil(maxEfetivo / 2), maxEfetivo]
  return (
    <div className="bi-rolagem">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={`Efetivo por dia, até ${maxEfetivo} pessoas, com o clima de cada dia.`}>
        {dias.map((d, i) => d.chuva && <rect key={`f${d.data}`} x={L + i * largura} y={0} width={largura} height={H - B} fill="var(--bi-azul)" />)}
        {passos.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - D} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeWidth="1" />
            <text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--muted)" fontWeight="700">{v}</text>
          </g>
        ))}
        {dias.map((d, i) => (
          <g key={d.data}>
            <rect x={cx(i) - largura * 0.3} y={y(d.efetivo)} width={largura * 0.6} height={Math.max(0, H - B - y(d.efetivo))} fill={d.chuva ? '#3A6EA5' : 'var(--bi-real)'} rx="2">
              <title>{`${formatarDataCurta(d.data)}: ${d.efetivo} pessoas, clima ${d.clima || 'não informado'}`}</title>
            </rect>
            <text x={cx(i)} y={y(d.efetivo) - 4} textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--ink)">{d.efetivo}</text>
            <g transform={`translate(${cx(i) - 10}, 4) scale(.84)`} fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{ICONE_CLIMA[d.clima] || ICONE_CLIMA.nublado}</g>
            <text x={cx(i)} y={H - B + 16} textAnchor="middle" fontSize="11" fill="var(--muted)" fontWeight="700">{formatarDataCurta(d.data)}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}
