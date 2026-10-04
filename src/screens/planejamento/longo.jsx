import { useRef, useState } from 'react'
import { Aba, BarraAvanco, Chip, Icone, Vazio } from '../../components/index.jsx'
import { usePlanejamento } from '../../lib/PlanejamentoContext.jsx'
import {
  ampliarPeriodo, atividadesAtivas, colunasDoCronograma, compararBaseline, diasUteis, escalaPadrao, periodoDoCronograma,
  periodoRealDaAtividade, posicaoDoDia, posicaoNaLinha, previstoDaAtividade, progressoDaAtividade, resumoBaseline, resumoDoCronograma,
  rotuloDoPrazo, textoDesvio, textoDiasUteis, tomDoDesvio,
} from '../../lib/planejamento.js'
import { formatarData, formatarDataCurta } from '../../lib/regras.js'
import { Estado, useConfirmar, useTelaLarga } from './ui.jsx'

const LARGURA_NOME = 210
const LARGURA_COLUNA = { semana: 64, mes: 110 }
const ESCALAS = [['semana', 'Por semana'], ['mes', 'Por mês']]

// Uma linha por atividade viva, com tudo que o gráfico e a lista precisam já calculado.
// `lb` é a comparação com a linha de base (null quando não se está comparando).
function linhasDoCronograma(atividades, hoje, cal, comparacao) {
  return atividadesAtivas(atividades).map((a) => {
    const real = progressoDaAtividade(atividades, a.id, cal)
    const previsto = previstoDaAtividade(atividades, a.id, hoje, cal)
    return {
      ...a, real, previsto, tom: tomDoDesvio(real, previsto), grupo: a.filhos > 0, dias: diasUteis(a.inicio, a.fim, cal),
      periodoReal: periodoRealDaAtividade(atividades, a.id), lb: comparacao?.get(a.id) ?? null,
    }
  })
}

const pct = (n) => `${Math.round(n)}%`
const dataOuTraco = (iso) => (iso ? formatarDataCurta(iso) : '—')

function Resumo({ resumo }) {
  const desvio = Math.round(resumo.desvio)
  return (
    <div className="contadores">
      <div className="cont"><b>{pct(resumo.previsto)}</b>previsto até hoje</div>
      <div className="cont"><b>{pct(resumo.real)}</b>real</div>
      <div className={`cont ${tomDoDesvio(resumo.real, resumo.previsto) === 'bad' ? 'ruim' : ''}`}><b>{desvio > 0 ? '+' : ''}{desvio}</b>pontos de desvio</div>
    </div>
  )
}

// Planejado original (linha de base) x planejado atual: quanto o término da obra e as atividades escorregaram.
function ResumoBaseline({ resumo, salvaEm }) {
  return (
    <>
      <div className="contadores">
        <div className={`cont ${resumo.desvioFinal > 0 ? 'ruim' : ''}`}><b>{resumo.desvioFinal > 0 ? '+' : ''}{resumo.desvioFinal}</b>dias úteis no término</div>
        <div className="cont"><b>{resumo.atrasadas}</b>atrasaram</div>
        <div className="cont"><b>{resumo.adiantadas}</b>adiantaram</div>
      </div>
      <p className="mono">Linha de base de {formatarData(salvaEm)} · término {dataOuTraco(resumo.fimLB)} → {dataOuTraco(resumo.fimAtual)} ({textoDesvio(resumo.desvioFinal)}){resumo.novas ? ` · ${resumo.novas} ${resumo.novas === 1 ? 'atividade nova' : 'atividades novas'} fora da linha de base` : ''}</p>
    </>
  )
}

function Grafico({ linhas, colunas, escala, hoje, comparando }) {
  const rolagem = useRef(null)
  const largura = colunas.length * LARGURA_COLUNA[escala]
  const hojePos = posicaoDoDia(hoje, colunas)
  const grade = {
    width: largura, backgroundImage: 'linear-gradient(to right, var(--line) 1px, transparent 1px)', backgroundSize: `${LARGURA_COLUNA[escala]}px 100%`,
  }
  const irParaHoje = () => {
    if (hojePos !== null) rolagem.current.scrollLeft = Math.max(0, LARGURA_NOME + (hojePos / 100) * largura - 200)
  }
  return (
    <>
      <div className="cron-legenda">
        <span className="p">Planejado</span><span className="r">Real</span><span className="v">Previsto hoje</span><span className="h">Hoje</span>
        <span className="per">Período real</span>{comparando && <span className="lb">Linha de base</span>}
        {hojePos !== null && <button type="button" className="btn secondary" onClick={irParaHoje}>Ir para hoje</button>}
      </div>
      <div className="cron" ref={rolagem}>
        <div className="cron-corpo" style={{ width: LARGURA_NOME + largura }}>
          <div className="cron-linha cabeca">
            <div className="cron-nome">Atividade</div>
            <div className="cron-trilha" style={{ width: largura }}>
              {colunas.map((c) => <span key={c.inicio} className="cron-col" style={{ width: LARGURA_COLUNA[escala] }}>{c.rotulo}</span>)}
            </div>
          </div>
          {linhas.map((l) => {
            const { esquerda, largura: larguraBarra } = posicaoNaLinha(l.inicio, l.fim, colunas)
            const { inicioReal, fimReal } = l.periodoReal
            const real = inicioReal && inicioReal <= hoje ? posicaoNaLinha(inicioReal, fimReal || hoje, colunas) : null
            const lb = l.lb?.inicioLB ? posicaoNaLinha(l.lb.inicioLB, l.lb.fimLB, colunas) : null
            return (
              <div className="cron-linha" key={l.id}>
                <div className="cron-nome" title={`${l.codigo} ${l.titulo}`} style={{ paddingLeft: 8 + l.nivel * 12 }}>
                  <span className="eap-cod mono">{l.codigo}</span><span className={`cron-tit ${l.grupo ? 'grupo' : ''}`}>{l.titulo}</span>
                </div>
                <div className="cron-trilha" style={grade}>
                  {real && <div className="cron-realper" style={{ left: `${real.esquerda}%`, width: `${real.largura}%` }} title={`Real: ${dataOuTraco(inicioReal)} → ${fimReal ? dataOuTraco(fimReal) : 'em andamento'}`} />}
                  <div
                    className={`cron-barra ${l.grupo ? 'grupo' : ''} ${l.tom}`} style={{ left: `${esquerda}%`, width: `${larguraBarra}%` }}
                    role="img" aria-label={`${l.titulo}: ${formatarDataCurta(l.inicio)} a ${formatarDataCurta(l.fim)}, real ${pct(l.real)}, previsto ${pct(l.previsto)}`}
                  >
                    <i className="cron-real" style={{ width: `${l.real}%` }} />
                    <u className="cron-prev" style={{ left: `${l.previsto}%` }} />
                    <span>{pct(l.real)}</span>
                  </div>
                  {lb && <div className={`cron-lb ${l.lb.situacao}`} style={{ left: `${lb.esquerda}%`, width: `${lb.largura}%` }} title={`Linha de base: ${dataOuTraco(l.lb.inicioLB)} → ${dataOuTraco(l.lb.fimLB)} (${textoDesvio(l.lb.desvioFim)})`} />}
                  {hojePos !== null && <b className="cron-hoje" style={{ left: `${hojePos}%` }} />}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

// No celular o gráfico não cabe: cada atividade vira um cartão com código, título, datas e progresso.
function Lista({ linhas, comparando }) {
  return (
    <ul className="eap-lista">
      {linhas.map((l) => (
        <li key={l.id} className={`eap-linha n${Math.min(l.nivel, 3)}`}>
          <div className="eap-topo">
            <span className="eap-cod mono">{l.codigo}</span>
            <span className="eap-tit">{l.titulo}</span>
            <Chip tom={l.tom}>{rotuloDoPrazo(l.real, l.tom)}</Chip>
          </div>
          <div className="eap-meta mono">{formatarDataCurta(l.inicio)} → {formatarDataCurta(l.fim)} · {textoDiasUteis(l.dias)}</div>
          <div className="eap-meta mono">Início real: {dataOuTraco(l.periodoReal.inicioReal)} · Término real: {dataOuTraco(l.periodoReal.fimReal)}</div>
          {comparando && l.lb && (
            <div className="eap-meta mono">
              {l.lb.situacao === 'nova'
                ? 'Fora da linha de base (atividade nova)'
                : <>Linha de base: {dataOuTraco(l.lb.inicioLB)} → {dataOuTraco(l.lb.fimLB)} · <span className={l.lb.desvioFim > 0 ? 'neg' : ''}>término {textoDesvio(l.lb.desvioFim)}</span></>}
            </div>
          )}
          <BarraAvanco real={l.real} plan={l.previsto} />
        </li>
      ))}
    </ul>
  )
}

export default function Longo({ irPara, avisar }) {
  const { atividades, baseline, calendario, hoje, salvarBaseline } = usePlanejamento()
  const larga = useTelaLarga()
  const { pedir, caixa } = useConfirmar()
  // Enquanto a pessoa não escolhe, vale o padrão da obra (que só se conhece depois de carregar as atividades).
  const [escolhida, setEscala] = useState(null)
  const [semComparar, setSemComparar] = useState(false)

  const periodoBase = periodoDoCronograma(atividades)
  const comparando = Boolean(baseline) && !semComparar
  const comparacao = baseline ? compararBaseline(atividades, baseline, calendario) : null
  const linhas = periodoBase ? linhasDoCronograma(atividades, hoje, calendario, comparando ? comparacao : null) : []
  // A linha do tempo precisa caber também as barras da linha de base e do período real.
  const periodo = periodoBase && ampliarPeriodo(periodoBase, linhas.flatMap((l) => [l.lb?.inicioLB, l.lb?.fimLB, l.periodoReal.inicioReal, l.periodoReal.fimReal]))
  const escala = escolhida ?? escalaPadrao(periodo)

  const salvar = () => {
    const texto = baseline
      ? `Substituir a linha de base de ${formatarData(baseline.salvaEm)} pelas datas planejadas de hoje? A anterior será perdida.`
      : 'Salvar as datas planejadas de hoje como linha de base? Depois, qualquer mudança de prazo será comparada com elas.'
    pedir(texto, async () => {
      const erro = await salvarBaseline()
      avisar(erro || 'Linha de base salva.')
    }, baseline ? 'Substituir linha de base' : 'Salvar linha de base')
  }

  const vazio = !periodo
    ? (
      <Vazio icone="planejamento" titulo="Nada para mostrar no cronograma" texto="O cronograma é desenhado com as atividades da EAP. Crie ou importe as atividades primeiro.">
        <button type="button" className="btn" onClick={() => irPara('eap')}><Icone nome="plus" />Ir para a EAP</button>
      </Vazio>
    )
    : null

  return (
    <>
      {caixa}
      <Estado vazio={vazio}>
        {periodo && (
          <>
            <Resumo resumo={resumoDoCronograma(atividades, hoje, calendario)} />
            <div className="eap-barra">
              <button type="button" className="btn secondary" onClick={salvar}>{baseline ? 'Salvar nova linha de base' : 'Salvar linha de base'}</button>
              {baseline && (
                <label className="eap-check">
                  <input type="checkbox" checked={comparando} onChange={(e) => setSemComparar(!e.target.checked)} />
                  Comparar com a linha de base
                </label>
              )}
            </div>
            {!baseline && <p className="mono">Sem linha de base. Salve uma quando o plano estiver aprovado: depois dela, o app mostra quanto cada prazo escorregou.</p>}
            {comparando && <ResumoBaseline resumo={resumoBaseline(comparacao, atividades, baseline, calendario)} salvaEm={baseline.salvaEm} />}
            {larga && <div style={{ marginTop: 14 }}><Aba opcoes={ESCALAS} valor={escala} onTroca={setEscala} /></div>}
            <div style={{ marginTop: 14 }}>
              {larga
                ? <Grafico linhas={linhas} colunas={colunasDoCronograma(periodo.inicio, periodo.fim, escala)} escala={escala} hoje={hoje} comparando={comparando} />
                : <Lista linhas={linhas} comparando={comparando} />}
            </div>
          </>
        )}
      </Estado>
    </>
  )
}
