import { useState } from 'react'
import { Chip, Icone, Seletor, Topo, Vazio } from '../components/index.jsx'
import { useDados } from '../lib/DadosContext.jsx'
import {
  CRITICIDADES, formatarDataCurta, ordenarRestricoes, pode, STATUS_RESTRICAO, tiposDeRestricaoVisiveis,
} from '../lib/regras.js'

const tomDaCriticidade = { Alta: 'bad', Média: 'warn', Baixa: 'neutral' }

export default function Restricoes({ params, avisar }) {
  const { usuario, restricoes, frentes, nomeDe } = useDados()
  const [tipo, setTipo] = useState('')
  const [status, setStatus] = useState('')
  const [crit, setCrit] = useState(params.criticidade || '')
  const tipos = tiposDeRestricaoVisiveis(usuario.role)

  const lista = ordenarRestricoes(
    restricoes.filter((r) => (!tipo || r.tipo === tipo) && (!status || r.status === status) && (!crit || r.criticidade === crit)),
  )

  return (
    <>
      <Topo titulo="Restrições">
        {pode(usuario.role, 'criarRestricao') && (
          <button className="btn" onClick={() => avisar('O formulário de restrição chega na próxima etapa.')}><Icone nome="plus" />Nova</button>
        )}
      </Topo>
      <div className="filters">
        <Seletor valor={tipo} onTroca={setTipo} rotulo="Tipo" todas="Todos os tipos" opcoes={tipos.map((t) => [t, t])} />
        <Seletor valor={status} onTroca={setStatus} rotulo="Status" todas="Todos os status" opcoes={STATUS_RESTRICAO.map((s) => [s, s])} />
        <Seletor valor={crit} onTroca={setCrit} rotulo="Criticidade" todas="Todas as criticidades" opcoes={CRITICIDADES.map((c) => [c, c])} />
      </div>
      <div style={{ marginTop: 14 }}>
        {lista.length === 0
          ? <Vazio icone="restricoes" titulo="Nada por aqui" texto="Nenhuma restrição aberta. Bom sinal." />
          : lista.map((r) => {
            const frente = frentes.find((f) => f.id === r.frente_id)
            return (
              <div className="rest-item" key={r.id}>
                <div className="h"><span>{r.titulo}</span><Chip tom={tomDaCriticidade[r.criticidade]}>{r.criticidade}</Chip></div>
                <div className="m">
                  {frente ? `${frente.nome} · ` : ''}{r.tipo} · {r.status}
                  {r.data_limite && ` · decidir até ${formatarDataCurta(r.data_limite)}`}
                  {r.impacto_prazo_dias ? ` · impacto ${r.impacto_prazo_dias} dias` : ''}
                  {r.responsavel_id && nomeDe(r.responsavel_id) ? ` · responsável ${nomeDe(r.responsavel_id)}` : ''}
                </div>
              </div>
            )
          })}
      </div>
    </>
  )
}
