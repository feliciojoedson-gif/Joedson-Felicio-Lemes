import { useState } from 'react'
import {
  CabecalhoDaLista, Chip, FrenteItem, FrenteItemCliente, Icone, Seletor, Topo, Vazio,
} from '../components/index.jsx'
import { useDados } from '../lib/DadosContext.jsx'
import {
  concluidaSemMedicao, DISCIPLINAS, estaParadaHa3Dias, formatarData, formatarDinheiro, menuDoPerfil,
  ordenarFrentes, passaPeriodo, pode, progressoDaObra, restricaoCriticaAberta, rotuloDaObra,
  semaforoDaObra, semDiarioHoje,
} from '../lib/regras.js'

const PERIODOS = [['recente', 'Último avanço: até 3 dias'], ['antigo', 'Último avanço: mais de 3 dias']]

function proximoMarco(obra, frentes, hoje) {
  const marco = frentes
    .filter((f) => f.eh_marco && f.fim_planejado >= hoje)
    .sort((a, b) => (a.fim_planejado < b.fim_planejado ? -1 : 1))[0]
  if (marco) return `${marco.nome.replace(/^Marco:\s*/, '')} · ${formatarData(marco.fim_planejado)}`
  return `Término contratual · ${formatarData(obra.data_fim_contratual)}`
}

function CartaoDaObra({ mostrarMedicao }) {
  const { hoje, obra, frentes, medicoes } = useDados()
  const prog = progressoDaObra(frentes, hoje)
  const tom = semaforoDaObra(prog.desvio)
  const medido = medicoes.reduce((s, m) => s + Number(m.valor_medido), 0)
  const dv = Math.round(prog.desvio)
  return (
    <div className="card obra">
      <div>
        <h3>{obra.nome}</h3>
        <div className="cli mono">{obra.cliente} · {obra.codigo}</div>
        <Chip tom={tom}>{rotuloDaObra(tom)}</Chip>
      </div>
      <div className="photo" title="Foto mais recente"><Icone nome="fotos" /></div>
      <div className="kpis">
        <div className="kpi"><div className="v">{Math.round(prog.real)}%</div><div className="k">Avanço real</div></div>
        <div className="kpi"><div className="v">{Math.round(prog.plan)}%</div><div className="k">Planejado hoje</div></div>
        <div className={`kpi ${dv <= -10 ? 'bad' : dv < 0 ? 'warn' : ''}`}><div className="v">{dv}</div><div className="k">Desvio em pontos</div></div>
      </div>
      <div className="obra-foot">
        {mostrarMedicao && <span>Medição acumulada <b>{formatarDinheiro(medido)}</b></span>}
        <span>Próximo marco <b>{proximoMarco(obra, frentes, hoje)}</b></span>
      </div>
    </div>
  )
}

function PainelCliente({ goto }) {
  const { frentes } = useDados()
  const lista = [...frentes].sort((a, b) => (a.fim_planejado < b.fim_planejado ? -1 : 1))
  return (
    <>
      <Topo titulo="Painel" />
      <CartaoDaObra mostrarMedicao={false} />
      <div className="section-title">Frentes</div>
      {lista.length === 0
        ? <Vazio titulo="Sem frentes" texto="Ainda não há frentes para mostrar." />
        : (
          <>
            <CabecalhoDaLista cliente />
            <div className="flist">{lista.map((f) => <FrenteItemCliente key={f.id} f={f} onAbrir={(id) => goto('detalhe', { id })} />)}</div>
          </>
        )}
    </>
  )
}

function PainelInterno({ goto }) {
  const { usuario, hoje, frentes, restricoes, medicoes, apontamentos, nomeDe } = useDados()
  const [disc, setDisc] = useState('')
  const [resp, setResp] = useState('')
  const [periodo, setPeriodo] = useState('')
  const [alerta, setAlerta] = useState(null)

  const verMedicao = pode(usuario.role, 'verMedicao')
  const filtradas = frentes.filter(
    (f) => (!disc || f.disciplina === disc) && (!resp || String(f.responsavel_id) === resp) && passaPeriodo(f, periodo, hoje),
  )
  const idsComCritica = restricoes.filter(restricaoCriticaAberta).map((r) => r.frente_id)
  const alertas = [
    { k: 'paradas', tom: 'bad', rotulo: 'Paradas há 3 dias ou mais', n: filtradas.filter(estaParadaHa3Dias).length },
    { k: 'criticas', tom: 'bad', rotulo: 'Restrições críticas abertas', n: restricoes.filter(restricaoCriticaAberta).length },
    ...(verMedicao ? [{ k: 'medir', tom: 'warn', rotulo: 'Concluídas e não medidas', n: filtradas.filter((f) => concluidaSemMedicao(f, medicoes)).length }] : []),
    { k: 'semdiario', tom: 'warn', rotulo: 'Sem diário hoje', n: filtradas.filter((f) => semDiarioHoje(f, apontamentos, hoje)).length },
  ]
  const predicados = {
    paradas: estaParadaHa3Dias,
    criticas: (f) => idsComCritica.includes(f.id),
    medir: (f) => concluidaSemMedicao(f, medicoes),
    semdiario: (f) => semDiarioHoje(f, apontamentos, hoje),
  }

  const clicarAlerta = (k) => {
    if (k === 'criticas' && menuDoPerfil(usuario.role).includes('restricoes')) {
      goto('restricoes', { criticidade: 'Alta' })
      return
    }
    setAlerta(alerta === k ? null : k)
  }

  const lista = ordenarFrentes(alerta ? filtradas.filter(predicados[alerta]) : filtradas, hoje)

  // Planejado × real por disciplina, só da obra atual.
  const porDisciplina = DISCIPLINAS
    .map((d) => ({ d, ...progressoDaObra(frentes.filter((f) => f.disciplina === d), hoje), n: frentes.filter((f) => f.disciplina === d && !f.eh_marco).length }))
    .filter((x) => x.n > 0)

  return (
    <>
      <Topo titulo="Painel" />
      <div className="filters">
        <Seletor valor={disc} onTroca={setDisc} rotulo="Disciplina" todas="Todas as disciplinas" opcoes={DISCIPLINAS.map((d) => [d, d])} />
        <Seletor valor={resp} onTroca={setResp} rotulo="Responsável" todas="Todos os responsáveis"
          opcoes={[...new Set(frentes.map((f) => f.responsavel_id).filter(Boolean))].map((id) => [String(id), nomeDe(id) || '—'])} />
        <Seletor valor={periodo} onTroca={setPeriodo} rotulo="Período do último avanço" todas="Último avanço: qualquer data" opcoes={PERIODOS} />
      </div>

      <div className="section-title">O que exige ação hoje</div>
      <div className="alerts">
        {alertas.map((a) => (
          <button key={a.k} className={`alert ${a.tom} ${alerta === a.k ? 'on' : ''}`} onClick={() => clicarAlerta(a.k)}>
            <span className="l">{a.rotulo}</span><span className="n">{a.n}</span>
          </button>
        ))}
      </div>

      <div className="section-title">Obra</div>
      <CartaoDaObra mostrarMedicao={verMedicao} />

      <div className="section-title">Avanço planejado × real por disciplina</div>
      <div className="card">
        {porDisciplina.length === 0 ? <span className="mono">Sem frentes</span> : (
          <div className="bars">
            {porDisciplina.map((x) => (
              <div className="bar-row" key={x.d}>
                <div className="lab"><span>{x.d}</span><span>{Math.round(x.real)}% de {Math.round(x.plan)}%</span></div>
                <div className="track plan"><i style={{ width: `${x.plan}%` }} /></div>
                <div className="track real"><i style={{ width: `${x.real}%` }} /></div>
              </div>
            ))}
          </div>
        )}
        <div className="legend mono"><span className="p">Planejado</span><span className="r">Real</span></div>
      </div>

      <div className="section-title">Frentes — mais tempo parado primeiro</div>
      {frentes.length === 0
        ? <Vazio titulo="Nenhuma frente cadastrada" texto="Nenhuma frente cadastrada nesta obra. Cadastre a primeira em Frentes.">
            {pode(usuario.role, 'criarFrente') && <button className="btn" onClick={() => goto('frentes')}>Ir para Frentes</button>}
          </Vazio>
        : lista.length === 0
          ? <Vazio titulo="Nada com esse filtro" texto="Troque o filtro para ver as frentes." />
          : (
            <>
              <CabecalhoDaLista />
              <div className="flist">{lista.map((f) => <FrenteItem key={f.id} f={f} onAbrir={(id) => goto('detalhe', { id })} />)}</div>
            </>
          )}
    </>
  )
}

export default function Painel(props) {
  const { usuario } = useDados()
  return usuario.role === 'Cliente' ? <PainelCliente {...props} /> : <PainelInterno {...props} />
}

