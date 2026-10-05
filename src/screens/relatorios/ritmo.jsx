import { formatarDataCurta } from '../../lib/regras.js'
import { BarrasH, ClimaEfetivo } from './barras.jsx'
import { Bloqueado, Cartao, Legenda, SemDado } from './graficos.jsx'

function PpcSemanal({ ppc }) {
  const { semanas } = ppc
  return (
    <>
      <div className="bi-rolagem" role="img" aria-label={`PPC por semana: ${semanas.map((s) => `${formatarDataCurta(s.inicio)} ${s.ppc}%`).join(', ')}.`}>
        <div className="bi-ppc">
          {semanas.map((s) => (
            <div className="col" key={s.inicio}>
              <span className="pc">{s.ppc}%</span>
              <div className="pilha" title={`${s.feitas} de ${s.total} metas batidas`}>
                {s.naoFeitas > 0 && <span className="nao" style={{ flex: s.naoFeitas }}>{s.naoFeitas}</span>}
                {s.feitas > 0 && <span className="ok" style={{ flex: s.feitas }}>{s.feitas}</span>}
              </div>
              <span className="dt">{formatarDataCurta(s.inicio)}</span>
            </div>
          ))}
        </div>
      </div>
      <Legenda itens={[{ rotulo: 'Metas batidas', cor: 'var(--ok)' }, { rotulo: 'Metas não batidas', cor: 'var(--bad)' }]} />
    </>
  )
}

export default function Ritmo({ dados, modulos }) {
  const { ppc, pareto, clima } = dados
  return (
    <>
      <Cartao titulo="PPC semanal" subtitulo="Uma barra por semana (início na segunda): o verde precisa dominar o histórico.">
        {ppc ? <PpcSemanal ppc={ppc} /> : <Bloqueado modulo="planejamento" modulos={modulos} />}
      </Cartao>

      <Cartao titulo="Pareto de causas" subtitulo="Por que as tarefas não foram realizadas, da causa mais frequente para a menos.">
        {pareto ? (
          <BarrasH
            itens={pareto.causas.map((c) => ({ rotulo: c.nome, valor: c.qtd, texto: `${c.qtd} · ${Math.round((c.qtd / pareto.total) * 100)}%` }))}
            cor="var(--bad)"
          />
        ) : <SemDado texto="Nenhuma tarefa não realizada com causa registrada." />}
      </Cartao>

      <Cartao titulo="Clima & efetivo" subtitulo="Pessoas na obra por dia (Diário de Obra). Dias de chuva ficam azulados.">
        {clima ? (
          <>
            <ClimaEfetivo dias={clima.dias} maxEfetivo={clima.maxEfetivo} />
            <Legenda itens={[{ rotulo: 'Efetivo no dia', cor: 'var(--bi-real)' }, { rotulo: 'Dia de chuva', cor: '#3A6EA5' }]} />
            <p className="bi-resumo">
              <span>Média: <b>{clima.mediaGeral}</b> pessoas</span>
              <span>Dias de chuva: <b>{clima.diasChuva}</b></span>
              {clima.diasChuva > 0 && <span>Com chuva: <b>{clima.mediaComChuva}</b> · sem chuva: <b>{clima.mediaSemChuva}</b></span>}
            </p>
          </>
        ) : <Bloqueado modulo="diario" modulos={modulos} />}
      </Cartao>
    </>
  )
}
