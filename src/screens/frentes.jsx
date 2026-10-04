import { useState } from 'react'
import { CabecalhoDaLista, FrenteItem, Icone, Seletor, Topo, Vazio } from '../components/index.jsx'
import { useDados } from '../lib/DadosContext.jsx'
import { DISCIPLINAS, ordenarFrentes, pode, STATUS_FRENTE } from '../lib/regras.js'

export default function Frentes({ goto, avisar }) {
  const { usuario, hoje, frentes, nomeDe } = useDados()
  const [disc, setDisc] = useState('')
  const [resp, setResp] = useState('')
  const [status, setStatus] = useState('')

  const nova = () => avisar('O formulário de nova frente chega na próxima etapa.')
  const lista = ordenarFrentes(
    frentes.filter((f) => (!disc || f.disciplina === disc) && (!resp || String(f.responsavel_id) === resp) && (!status || f.status === status)),
    hoje,
  )
  const podeCriar = pode(usuario.role, 'criarFrente')

  return (
    <>
      <Topo titulo="Frentes">
        {podeCriar && <button className="btn" onClick={nova}><Icone nome="plus" />Nova frente</button>}
      </Topo>
      <div className="filters">
        <Seletor valor={disc} onTroca={setDisc} rotulo="Disciplina" todas="Todas as disciplinas" opcoes={DISCIPLINAS.map((d) => [d, d])} />
        <Seletor valor={resp} onTroca={setResp} rotulo="Responsável" todas="Todos os responsáveis"
          opcoes={[...new Set(frentes.map((f) => f.responsavel_id).filter(Boolean))].map((id) => [String(id), nomeDe(id) || '—'])} />
        <Seletor valor={status} onTroca={setStatus} rotulo="Status" todas="Todos os status" opcoes={STATUS_FRENTE.map((s) => [s, s])} />
      </div>
      <div style={{ marginTop: 14 }}>
        {frentes.length === 0
          ? <Vazio titulo="Nenhuma frente" texto="Nenhuma frente nesta obra ainda.">
              {podeCriar && <button className="btn" onClick={nova}><Icone nome="plus" />Cadastrar primeira frente</button>}
            </Vazio>
          : lista.length === 0
            ? <Vazio titulo="Nada com esse filtro" texto="Troque o filtro para ver as frentes." />
            : (
              <>
                <CabecalhoDaLista />
                <div className="flist">{lista.map((f) => <FrenteItem key={f.id} f={f} onAbrir={(id) => goto('detalhe', { id })} />)}</div>
              </>
            )}
      </div>
    </>
  )
}
