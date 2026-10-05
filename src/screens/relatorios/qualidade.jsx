import { BarrasH } from './barras.jsx'
import { Bloqueado, Cartao, Donut, SemDado } from './graficos.jsx'

const CORES = ['var(--bi-s1)', 'var(--bi-s2)', 'var(--bi-s3)', 'var(--bi-s4)', 'var(--bi-s5)', 'var(--bi-s6)', 'var(--bi-s7)']
const COR_DO_TOM = { ok: 'var(--ok)', warn: 'var(--warn)', bad: 'var(--bad)', neutro: 'var(--bi-plan)' }

// Treemap simplificado: blocos flexbox com largura e altura proporcionais ao nº de pendências; o maior é o pior local.
function Treemap({ locais, total }) {
  const maior = Math.max(1, ...locais.map((l) => l.qtd))
  return (
    <div className="bi-treemap" role="list" aria-label="Pendências em aberto por local">
      {locais.map((l) => (
        <div
          key={l.nome} role="listitem" className="bloco" title={`${l.nome}: ${l.qtd}`}
          style={{ flex: `${l.qtd} 1 ${Math.max(28, (l.qtd / total) * 100)}%`, minHeight: 56 + (l.qtd / maior) * 70, background: `color-mix(in srgb, var(--bad) ${35 + (l.qtd / maior) * 55}%, #fff)` }}
        >
          <b>{l.qtd}</b>
          <span>{l.nome}</span>
        </div>
      ))}
    </div>
  )
}

export default function Qualidade({ dados, modulos }) {
  const { conforme, pendencias, mapa, desperdicios } = dados
  return (
    <>
      <Cartao titulo="% conforme por modelo de FVS" subtitulo="Barra baixa = serviço sendo refeito. Cobrar o empreiteiro desse serviço.">
        {conforme ? (
          <>
            <BarrasH
              maximo={100}
              itens={conforme.modelos.map((m) => ({
                rotulo: m.nome, valor: m.conforme ?? 0, texto: m.conforme === null ? '—' : `${m.conforme}%`, cor: COR_DO_TOM[m.tom],
              }))}
            />
            <p className="bi-resumo"><span>NCs abertas: <b>{conforme.ncsAbertas}</b></span></p>
          </>
        ) : <Bloqueado modulo="fvs" modulos={modulos} />}
      </Cartao>

      <Cartao titulo="Pendências por empresa" subtitulo="Em aberto: quem cobrar antes de liberar o pagamento do mês.">
        {pendencias ? (
          pendencias.total ? (
            <Donut
              fatias={pendencias.empresas.map((e, i) => ({ rotulo: e.nome, valor: e.qtd, cor: CORES[i % CORES.length] }))}
              centro={pendencias.total} rotuloCentro="em aberto"
              resumo={`${pendencias.total} pendências em aberto: ${pendencias.empresas.map((e) => `${e.nome} ${e.qtd}`).join(', ')}.`}
            />
          ) : <SemDado texto="Nenhuma pendência em aberto. Tudo resolvido." />
        ) : <Bloqueado modulo="pendencias" modulos={modulos} />}
      </Cartao>

      <Cartao titulo="Mapa de pendências por local" subtitulo="O bloco maior é o local mais problemático.">
        {mapa ? (
          mapa.total ? <Treemap locais={mapa.locais} total={mapa.total} /> : <SemDado texto="Nenhuma pendência em aberto." />
        ) : <Bloqueado modulo="pendencias" modulos={modulos} />}
      </Cartao>

      <Cartao titulo="Ranking de desperdícios" subtitulo={desperdicios ? `Gemba Walk: ${desperdicios.observacoes} observações, por tipo de desperdício.` : 'Gemba Walk, por tipo de desperdício.'}>
        {desperdicios ? <BarrasH itens={desperdicios.ranking.map((r) => ({ rotulo: r.nome, valor: r.qtd }))} cor="var(--bi-s3)" /> : <Bloqueado modulo="gemba" modulos={modulos} />}
      </Cartao>
    </>
  )
}
