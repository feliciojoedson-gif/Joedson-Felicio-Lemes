import { useState } from 'react'
import { Icone, Modal, Seletor, Topo, Vazio } from '../components/index.jsx'
import { useDados } from '../lib/DadosContext.jsx'
import { diasEntre, formatarData, formatarDataCurta } from '../lib/regras.js'

const PERIODOS = [['7', 'Últimos 7 dias'], ['30', 'Últimos 30 dias']]

export default function Fotos() {
  const { hoje, fotos, frentes } = useDados()
  const [frente, setFrente] = useState('')
  const [periodo, setPeriodo] = useState('')
  const [aberta, setAberta] = useState(null)
  const nomeDaFrente = (id) => frentes.find((f) => f.id === id)?.nome || ''

  const lista = fotos
    .filter((x) => (!frente || String(x.frente_id) === frente) && (!periodo || diasEntre(x.tirada_em.slice(0, 10), hoje) <= Number(periodo)))
    .sort((a, b) => (a.tirada_em < b.tirada_em ? 1 : -1))

  return (
    <>
      <Topo titulo="Fotos" />
      <div className="filters one">
        <Seletor valor={frente} onTroca={setFrente} rotulo="Frente" todas="Todas as frentes" opcoes={frentes.map((f) => [String(f.id), f.nome])} />
        <Seletor valor={periodo} onTroca={setPeriodo} rotulo="Período" todas="Qualquer data" opcoes={PERIODOS} />
      </div>
      <div style={{ marginTop: 14 }}>
        {lista.length === 0
          ? <Vazio icone="fotos" titulo="Sem fotos" texto="Ainda não há fotos liberadas." />
          : (
            <div className="photos grade">
              {lista.map((x) => (
                <button key={x.id} className="photo" onClick={() => setAberta(x)} aria-label={x.legenda}>
                  {x.link ? <img src={x.link} alt={x.legenda} loading="lazy" /> : <Icone nome="fotos" />}
                  <span className="cap">{formatarDataCurta(x.tirada_em.slice(0, 10))} · {nomeDaFrente(x.frente_id)}</span>
                </button>
              ))}
            </div>
          )}
      </div>
      {aberta && (
        <Modal onFechar={() => setAberta(null)}>
          <div className="photo">{aberta.link ? <img src={aberta.link} alt={aberta.legenda} /> : <Icone nome="fotos" tamanho={56} />}</div>
          <p style={{ margin: '0 0 6px', fontWeight: 800 }}>{aberta.legenda}</p>
          <p className="mono" style={{ margin: '0 0 12px' }}>{formatarData(aberta.tirada_em.slice(0, 10))} · {nomeDaFrente(aberta.frente_id)}</p>
        </Modal>
      )}
    </>
  )
}
