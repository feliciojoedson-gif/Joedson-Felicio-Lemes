import { useRef, useState } from 'react'
import { Aba, BarraAvanco, Chip, Icone, Vazio } from '../../components/index.jsx'
import { usePlanejamento } from '../../lib/PlanejamentoContext.jsx'
import {
  atividadesAtivas, colunasDoCronograma, diasUteis, escalaPadrao, periodoDoCronograma, posicaoDoDia, posicaoNaLinha, previstoDaAtividade,
  progressoDaAtividade, resumoDoCronograma, rotuloDoPrazo, textoDiasUteis, tomDoDesvio,
} from '../../lib/planejamento.js'
import { formatarDataCurta } from '../../lib/regras.js'
import { Estado, useTelaLarga } from './ui.jsx'

const LARGURA_NOME = 210
const LARGURA_COLUNA = { semana: 64, mes: 110 }
const ESCALAS = [['semana', 'Por semana'], ['mes', 'Por mês']]

// Uma linha por atividade viva, com tudo que o gráfico e a lista precisam já calculado.
function linhasDoCronograma(atividades, hoje, cal) {
  return atividadesAtivas(atividades).map((a) => {
    const real = progressoDaAtividade(atividades, a.id, cal)
    const previsto = previstoDaAtividade(atividades, a.id, hoje, cal)
    return { ...a, real, previsto, tom: tomDoDesvio(real, previsto), grupo: a.filhos > 0, dias: diasUteis(a.inicio, a.fim, cal) }
  })
}

const pct = (n) => `${Math.round(n)}%`

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

function Grafico({ linhas, colunas, escala, hoje }) {
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
            return (
              <div className="cron-linha" key={l.id}>
                <div className="cron-nome" title={`${l.codigo} ${l.titulo}`} style={{ paddingLeft: 8 + l.nivel * 12 }}>
                  <span className="eap-cod mono">{l.codigo}</span><span className={`cron-tit ${l.grupo ? 'grupo' : ''}`}>{l.titulo}</span>
                </div>
                <div className="cron-trilha" style={grade}>
                  <div
                    className={`cron-barra ${l.grupo ? 'grupo' : ''} ${l.tom}`} style={{ left: `${esquerda}%`, width: `${larguraBarra}%` }}
                    role="img" aria-label={`${l.titulo}: ${formatarDataCurta(l.inicio)} a ${formatarDataCurta(l.fim)}, real ${pct(l.real)}, previsto ${pct(l.previsto)}`}
                  >
                    <i className="cron-real" style={{ width: `${l.real}%` }} />
                    <u className="cron-prev" style={{ left: `${l.previsto}%` }} />
                    <span>{pct(l.real)}</span>
                  </div>
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
function Lista({ linhas }) {
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
          <BarraAvanco real={l.real} plan={l.previsto} />
        </li>
      ))}
    </ul>
  )
}

export default function Longo({ irPara }) {
  const { atividades, calendario, hoje } = usePlanejamento()
  const larga = useTelaLarga()
  const periodo = periodoDoCronograma(atividades)
  // Enquanto a pessoa não escolhe, vale o padrão da obra (que só se conhece depois de carregar as atividades).
  const [escolhida, setEscala] = useState(null)
  const escala = escolhida ?? escalaPadrao(periodo)

  const vazio = !periodo
    ? (
      <Vazio icone="planejamento" titulo="Nada para mostrar no cronograma" texto="O cronograma é desenhado com as atividades da EAP. Crie ou importe as atividades primeiro.">
        <button type="button" className="btn" onClick={() => irPara('eap')}><Icone nome="plus" />Ir para a EAP</button>
      </Vazio>
    )
    : null

  return (
    <Estado vazio={vazio}>
      {periodo && (
        <>
          <Resumo resumo={resumoDoCronograma(atividades, hoje, calendario)} />
          {larga && <div style={{ marginTop: 14 }}><Aba opcoes={ESCALAS} valor={escala} onTroca={setEscala} /></div>}
          <div style={{ marginTop: 14 }}>
            {larga
              ? <Grafico linhas={linhasDoCronograma(atividades, hoje, calendario)} colunas={colunasDoCronograma(periodo.inicio, periodo.fim, escala)} escala={escala} hoje={hoje} />
              : <Lista linhas={linhasDoCronograma(atividades, hoje, calendario)} />}
          </div>
        </>
      )}
    </Estado>
  )
}
