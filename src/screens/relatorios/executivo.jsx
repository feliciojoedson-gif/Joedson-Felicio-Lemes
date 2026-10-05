import { formatarData, formatarDinheiro } from '../../lib/regras.js'
import { Bloqueado, Cartao, Donut, Kpi, Legenda, CurvaS } from './graficos.jsx'

function KpiEvolucao({ evolucao, modulos }) {
  if (!evolucao) return <div className="bi-kpi"><span className="t">Evolução</span><Bloqueado modulo="planejamento" modulos={modulos} mini /></div>
  const adiantado = evolucao.desvio >= 0
  const pontos = Math.abs(evolucao.desvio)
  return (
    <Kpi
      titulo="Evolução"
      valor={`${evolucao.real}%`}
      pequeno={`| plan ${evolucao.previsto}%`}
      detalhe={adiantado ? (pontos ? `${pontos} p.p. à frente do planejado` : 'no ritmo do planejado') : `${pontos} p.p. atrás do planejado`}
      tom={evolucao.tom}
      seta={adiantado ? 'sobe' : 'desce'}
    />
  )
}

function KpiPrazo({ prazo }) {
  if (!prazo) return <Kpi titulo="Prazo" valor="—" detalhe="Sem data de término cadastrada" />
  const dias = Math.abs(prazo.dias)
  return (
    <Kpi
      titulo="Prazo"
      valor={prazo.atrasado ? `${dias}` : `${prazo.dias}`}
      pequeno={prazo.atrasado ? (dias === 1 ? 'dia de atraso' : 'dias de atraso') : (prazo.dias === 1 ? 'dia' : 'dias')}
      detalhe={`Término da reforma em ${formatarData(prazo.fim)}`}
      tom={prazo.tom}
    />
  )
}

function KpiCusto({ custo, modulos }) {
  if (!custo) return <div className="bi-kpi"><span className="t">Custo medido</span><Bloqueado modulo="contratos" modulos={modulos} mini /></div>
  return (
    <Kpi
      titulo="Custo medido"
      valor={formatarDinheiro(custo.medido)}
      detalhe={custo.total ? `${custo.pct}% de ${formatarDinheiro(custo.total)} contratados` : 'Nenhum contrato ativo ainda'}
    />
  )
}

export default function Executivo({ dados, modulos }) {
  const { evolucao, prazo, custo, curva, ppc } = dados
  return (
    <>
      <div className="bi-grade tres">
        <KpiEvolucao evolucao={evolucao} modulos={modulos} />
        <KpiPrazo prazo={prazo} />
        <KpiCusto custo={custo} modulos={modulos} />
      </div>

      <Cartao titulo="Curva S" subtitulo="Acumulado por semana: onde as linhas se afastam, a obra está atrasada.">
        {curva ? (
          <>
            <CurvaS semanas={curva.semanas} />
            <Legenda itens={[
              { rotulo: 'Planejado acumulado', cor: 'var(--bi-plan)', linha: true },
              { rotulo: 'Real acumulado', cor: 'var(--bi-real)', linha: true },
            ]} />
          </>
        ) : <Bloqueado modulo="planejamento" modulos={modulos} />}
      </Cartao>

      <Cartao titulo="PPC geral" subtitulo="Percentual de tarefas concluídas no prazo, somando todas as semanas.">
        {ppc ? (
          <Donut
            fatias={[
              { rotulo: 'Concluídas no prazo', valor: ppc.feitas, cor: 'var(--bi-real)' },
              { rotulo: 'Não concluídas', valor: ppc.total - ppc.feitas, cor: 'var(--bi-plan-fraco)' },
            ]}
            centro={`${ppc.ppc}%`}
            rotuloCentro="PPC"
            resumo={`PPC geral de ${ppc.ppc}%: ${ppc.feitas} de ${ppc.total} tarefas concluídas no prazo.`}
          />
        ) : <Bloqueado modulo="planejamento" modulos={modulos} />}
      </Cartao>
    </>
  )
}
