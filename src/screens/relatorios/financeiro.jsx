import { formatarDinheiro } from '../../lib/regras.js'
import { BarrasH } from './barras.jsx'
import { Bloqueado, Cartao } from './graficos.jsx'

export default function Financeiro({ dados, modulos }) {
  if (!dados) return <Cartao titulo="Contratos & Medições"><Bloqueado modulo="contratos" modulos={modulos} /></Cartao>
  const { fluxo, matriz, saldos, saldoTotal } = dados
  return (
    <>
      <Cartao titulo="Fluxo dos contratos" subtitulo="Quantos contratos e quanto dinheiro há em cada etapa.">
        <div className="bi-minis quatro">
          {fluxo.map((f) => (
            <div className="bi-mini" key={f.id}>
              <span className="t">{f.rotulo}</span>
              <b className="n">{f.qtd}</b>
              <span className="s">{f.valor > 0 ? formatarDinheiro(f.valor) : f.qtd ? 'valor a definir' : '—'}</span>
            </div>
          ))}
        </div>
      </Cartao>

      <Cartao titulo="Matriz de empreiteiros" subtitulo="Só contratos ativos e concluídos: quanto já foi medido e quanto ainda falta.">
        {matriz.length ? (
          <div className="bi-rolagem">
            <table className="bi-tabela">
              <thead><tr><th>Empreiteiro</th><th className="d">Valor total</th><th>% medido</th><th className="d">Saldo a medir</th></tr></thead>
              <tbody>
                {matriz.map((m) => (
                  <tr key={m.empreiteiro}>
                    <td>{m.empreiteiro}</td>
                    <td className="d">{formatarDinheiro(m.valor)}</td>
                    <td>
                      <div className="bi-progresso" role="img" aria-label={`${m.pct}% medido`}>
                        <span className="trilho"><span className="enchimento" style={{ width: `${Math.min(100, m.pct)}%` }} /></span>
                        <b>{m.pct}%</b>
                      </div>
                    </td>
                    <td className="d">{formatarDinheiro(m.saldo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="bi-sem-dado">Nenhum contrato ativo ainda: nada foi medido.</p>}
      </Cartao>

      <Cartao titulo="Saldo a medir por contrato" subtitulo={`Quanto ainda vai sair do caixa, contrato a contrato. Total: ${formatarDinheiro(saldoTotal)}.`}>
        {saldos.length ? (
          <BarrasH itens={saldos.map((s) => ({ rotulo: s.rotulo, valor: s.saldo, texto: formatarDinheiro(s.saldo) }))} />
        ) : <p className="bi-sem-dado">Nenhum contrato ativo com saldo.</p>}
      </Cartao>
    </>
  )
}
