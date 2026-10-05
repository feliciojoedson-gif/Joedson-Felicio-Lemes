import { formatarDataCurta } from '../../lib/regras.js'
import { Bloqueado, Cartao, Legenda } from './graficos.jsx'

const dias = (n) => `${n} ${n === 1 ? 'dia' : 'dias'}`
const decimal = (n) => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 1 })

function LeadTime({ leadTime, tendencia, variacao }) {
  const maximo = Math.max(1, ...tendencia.map((t) => t.media || 0))
  return (
    <>
      <div className="bi-lead">
        <b>{leadTime ? decimal(leadTime.media) : '—'}</b>
        <span>{leadTime ? `dias em média, do pedido à chegada no almoxarifado (${leadTime.qtd} pedidos)` : 'Nenhum pedido chegou ao almoxarifado ainda.'}</span>
      </div>
      <p className="sub">Tendência das últimas 4 semanas (semana que começa em):</p>
      <div className="bi-colunas" role="img" aria-label={`Lead time por semana: ${tendencia.map((t) => `${formatarDataCurta(t.inicio)} ${t.media === null ? 'sem chegadas' : `${decimal(t.media)} dias`}`).join(', ')}.`}>
        {tendencia.map((t) => (
          <div className="col" key={t.inicio}>
            <b>{t.media === null ? '—' : decimal(t.media)}</b>
            <span className="barra"><span style={{ height: `${t.media === null ? 0 : Math.max(4, (t.media / maximo) * 100)}%` }} /></span>
            <span className="dt">{formatarDataCurta(t.inicio)}</span>
          </div>
        ))}
      </div>
      {variacao !== null && (
        <p className={`bi-variacao ${variacao > 0 ? 'bad' : variacao < 0 ? 'ok' : ''}`}>
          {variacao > 0 ? `O canteiro está esperando ${dias(variacao)} a mais pelo material.`
            : variacao < 0 ? `O canteiro está esperando ${dias(-variacao)} a menos pelo material.` : 'A espera pelo material está estável.'}
        </p>
      )}
    </>
  )
}

export default function Materiais({ dados, modulos }) {
  if (!dados) return <Cartao titulo="Materiais"><Bloqueado modulo="materiais" modulos={modulos} /></Cartao>
  const { etapas, atrasados, leadTime, tendencia, variacao, estoque } = dados
  return (
    <>
      <Cartao titulo="Pedidos por etapa" subtitulo="Onde cada pedido está no caminho até a frente de serviço.">
        <div className="bi-minis cinco">
          {etapas.map((e) => (
            <div className="bi-mini" key={e.id}>
              <span className="t">{e.rotulo}</span>
              <b className="n">{e.qtd}</b>
              <span className={`s${e.criticos ? ' bad' : ''}`}>{e.criticos ? `${e.criticos} crítico${e.criticos > 1 ? 's' : ''}` : ' '}</span>
            </div>
          ))}
        </div>
      </Cartao>

      <div className={`bi-card bi-atrasados${atrasados.length ? ' tem' : ''}`}>
        <h3>Atrasados</h3>
        <p className="sub">Pedidos comprados cuja previsão de entrega já venceu.</p>
        <div className="bi-lead"><b>{atrasados.length}</b><span>{atrasados.length === 1 ? 'pedido atrasado' : 'pedidos atrasados'}</span></div>
        {atrasados.length > 0 && (
          <ul className="bi-lista">
            {atrasados.map((a) => (
              <li key={a.id}>
                <span><b>{a.material}</b>{a.critico && <em className="chip bad">Crítico</em>}<small>{a.frente}{a.fornecedor ? ` · ${a.fornecedor}` : ''}</small></span>
                <b className="neg">{dias(a.dias)} de atraso</b>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Cartao titulo="Lead time médio" subtitulo="Quanto tempo o canteiro espera do pedido até o material chegar.">
        <LeadTime leadTime={leadTime} tendencia={tendencia} variacao={variacao} />
      </Cartao>

      {estoque && (
        <Cartao titulo="Estoque" subtitulo="Insumos no mínimo e movimento das últimas 4 semanas.">
          {estoque.alertas.length ? (
            <ul className="bi-lista">
              {estoque.alertas.map((i) => (
                <li key={i.id}><span><b>{i.nome}</b></span><b className="neg">{i.saldo} / mín. {i.minimo} {i.unidade}</b></li>
              ))}
            </ul>
          ) : <p className="bi-sem-dado">Nenhum insumo abaixo do mínimo.</p>}
          <div className="bi-colunas duplas">
            {estoque.semanas.map((s) => (
              <div className="col" key={s.inicio}>
                <span className="par"><i style={{ height: `${Math.min(100, s.entradas)}%`, background: 'var(--bi-real)' }} /><i style={{ height: `${Math.min(100, s.saidas)}%`, background: 'var(--bi-s4)' }} /></span>
                <span className="dt">{formatarDataCurta(s.inicio)}</span>
              </div>
            ))}
          </div>
          <Legenda itens={[{ rotulo: 'Entradas', cor: 'var(--bi-real)' }, { rotulo: 'Saídas', cor: 'var(--bi-s4)' }]} />
        </Cartao>
      )}
    </>
  )
}
