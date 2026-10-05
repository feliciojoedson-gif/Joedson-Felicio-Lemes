import { useState } from 'react'
import { FormRestricao } from './cadastros.jsx'
import { excluirRestricaoCadastro, mudarStatusRestricaoCadastro } from '../lib/dados.js'
import { PASSOS_RESTRICAO } from '../lib/cadastros.js'
import { Chip, Icone, Seletor, Topo, Vazio } from '../components/index.jsx'
import { useDados } from '../lib/DadosContext.jsx'
import {
  CRITICIDADES, formatarDataCurta, ordenarRestricoes, pode, STATUS_RESTRICAO, tiposDeRestricaoVisiveis,
} from '../lib/regras.js'

const tomDaCriticidade = { Alta: 'bad', Média: 'warn', Baixa: 'neutral' }

export default function Restricoes({ params, avisar }) {
  const { usuario, obra, restricoes, frentes, nomeDe, recarregar } = useDados()
  const [formAberto, setFormAberto] = useState(false)
  const mudar = async (r, para) => {
    const { erro } = await mudarStatusRestricaoCadastro(obra, r.id, para)
    if (erro) return avisar(erro.regra ? erro.message : 'Não consegui mudar o status. Tente de novo.')
    recarregar()
  }
  const excluir = async (r) => {
    const { erro } = await excluirRestricaoCadastro(obra, r.id)
    if (erro) return avisar('Não consegui excluir. Tente de novo.')
    recarregar()
    avisar('Restrição excluída.')
  }
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
          <button className="btn" onClick={() => setFormAberto(true)}><Icone nome="plus" />Nova</button>
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
                {pode(usuario.role, 'criarRestricao') && (
                  <div className="form-actions" style={{ marginTop: 8 }}>
                    {PASSOS_RESTRICAO[r.status].map((p) => <button key={p.para} type="button" className="btn secondary" onClick={() => mudar(r, p.para)}>{p.rotulo}</button>)}
                    {pode(usuario.role, 'apagar') && <button type="button" className="btn secondary q-excluir-inline" onClick={() => excluir(r)}>Excluir</button>}
                  </div>
                )}
              </div>
            )
          })}
      </div>
      {formAberto && <FormRestricao onFechar={() => setFormAberto(false)} avisar={avisar} />}
    </>
  )
}
