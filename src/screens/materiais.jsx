import { useEffect, useRef, useState } from 'react'
import { Chip, Icone, Topo, Vazio } from '../components/index.jsx'
import { useDados } from '../lib/DadosContext.jsx'
import { criarPedido, listarCatalogo, listarPedidos, moverPedido } from '../lib/dados.js'
import {
  aplicarMovimento, CATEGORIAS_MATERIAL, colunaAntes, colunaDepois, COLUNAS_MATERIAL, contadoresMateriais, diasEntre,
  diasNaColuna, errosCompra, errosEntrega, errosPedido, errosRecebimento, estaAtrasado, formatarData, leadTimeDias,
  limparNumero, lerQuantidade, novoPedido, pillDoPedido, pode, temAlertaDeRecebimento, textoDeDias,
} from '../lib/regras.js'

const numero = (n) => Number(n).toLocaleString('pt-BR')
const provisorio = (p) => String(p.id).startsWith('novo-')

// Validação na hora: o aviso aparece quando o campo perde o foco ou quando a pessoa tenta salvar.
function useAvisos(erros) {
  const [tocados, setTocados] = useState({})
  const [tentou, setTentou] = useState(false)
  return {
    aviso: (campo) => (tentou || tocados[campo]) && erros[campo],
    tocar: (campo) => setTocados((t) => ({ ...t, [campo]: true })),
    tentar: () => { setTentou(true); return Object.keys(erros).length === 0 },
  }
}

function Aviso({ texto }) {
  return texto ? <div className="erro" role="alert">{texto}</div> : null
}

function Folha({ titulo, sujo, onFechar, children }) {
  const fechar = () => {
    if (sujo && !window.confirm('Descartar? O que você preencheu será perdido.')) return
    onFechar()
  }
  return (
    <div className="sheet-fundo" onClick={fechar}>
      <div
        className="sheet" role="dialog" aria-modal="true" aria-label={titulo}
        onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.key === 'Escape' && fechar()}
      >
        <h2>{titulo}</h2>
        {children(fechar)}
      </div>
    </div>
  )
}

function SimNao({ rotulo, valor, onTroca, onToque, erro }) {
  return (
    <div className="field">
      <span className="lb">{rotulo}</span>
      <div className="chips">
        {[[true, 'Sim'], [false, 'Não']].map(([v, t]) => (
          <button key={t} type="button" className={valor === v ? 'on' : ''} aria-pressed={valor === v} onClick={() => { onTroca(v); onToque() }}>{t}</button>
        ))}
      </div>
      <Aviso texto={erro} />
    </div>
  )
}

function FormNovo({ catalogo, onSalvar, onFechar }) {
  const [materialId, setMaterialId] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [frente, setFrente] = useState('')
  const [prioridade, setPrioridade] = useState('normal')
  const erros = errosPedido({ materialId, quantidade, frente, prioridade })
  const { aviso, tocar, tentar } = useAvisos(erros)
  const unidade = catalogo.find((m) => m.id === Number(materialId))?.unidade

  return (
    <Folha titulo="Novo pedido" sujo={Boolean(materialId || quantidade || frente || prioridade !== 'normal')} onFechar={onFechar}>
      {(fechar) => (
        <>
          <div className="field">
            <label htmlFor="ped-material">Material</label>
            <select id="ped-material" className="select" value={materialId} onChange={(e) => setMaterialId(e.target.value)} onBlur={() => tocar('materialId')}>
              <option value="">Escolha o material</option>
              {Object.entries(CATEGORIAS_MATERIAL).map(([cat, rotulo]) => (
                <optgroup key={cat} label={rotulo}>
                  {catalogo.filter((m) => m.categoria === cat).map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </optgroup>
              ))}
            </select>
            <Aviso texto={aviso('materialId')} />
          </div>
          <div className="field">
            <label htmlFor="ped-qtd">Quantidade{unidade ? ` (${unidade})` : ''}</label>
            <input
              id="ped-qtd" className="input" inputMode="decimal" maxLength={8} placeholder="0" value={quantidade}
              onChange={(e) => setQuantidade(limparNumero(e.target.value))} onBlur={() => tocar('quantidade')}
            />
            <Aviso texto={aviso('quantidade')} />
          </div>
          <div className="field">
            <label htmlFor="ped-frente">Frente</label>
            <input id="ped-frente" className="input" maxLength={60} placeholder="Ex.: Banheiro suíte" value={frente} onChange={(e) => setFrente(e.target.value)} onBlur={() => tocar('frente')} />
            <Aviso texto={aviso('frente')} />
          </div>
          <div className="field">
            <span className="lb">Prioridade</span>
            <div className="chips">
              {[['normal', 'Normal'], ['critico', 'Crítico']].map(([v, t]) => (
                <button key={v} type="button" className={prioridade === v ? 'on' : ''} aria-pressed={prioridade === v} onClick={() => setPrioridade(v)}>{t}</button>
              ))}
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn" onClick={() => tentar() && onSalvar({ materialId: Number(materialId), quantidade: lerQuantidade(quantidade), frente, prioridade })}>Pedir material</button>
            <button type="button" className="btn secondary" onClick={fechar}>Cancelar</button>
          </div>
        </>
      )}
    </Folha>
  )
}

function FormCompra({ hoje, onSalvar, onFechar }) {
  const [fornecedor, setFornecedor] = useState('')
  const [previsaoEntrega, setPrevisao] = useState(hoje)
  const erros = errosCompra({ fornecedor, previsaoEntrega }, hoje)
  const { aviso, tocar, tentar } = useAvisos(erros)
  return (
    <Folha titulo="Compra feita" sujo={Boolean(fornecedor) || previsaoEntrega !== hoje} onFechar={onFechar}>
      {(fechar) => (
        <>
          <div className="field">
            <label htmlFor="cmp-fornecedor">Fornecedor</label>
            <input id="cmp-fornecedor" className="input" maxLength={60} value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} onBlur={() => tocar('fornecedor')} />
            <Aviso texto={aviso('fornecedor')} />
          </div>
          <div className="field">
            <label htmlFor="cmp-previsao">Previsão de entrega</label>
            <input id="cmp-previsao" className="input" type="date" min={hoje} value={previsaoEntrega} onChange={(e) => setPrevisao(e.target.value)} onBlur={() => tocar('previsaoEntrega')} />
            <Aviso texto={aviso('previsaoEntrega')} />
          </div>
          <div className="form-actions">
            <button type="button" className="btn" onClick={() => tentar() && onSalvar({ fornecedor, previsaoEntrega })}>Confirmar compra</button>
            <button type="button" className="btn secondary" onClick={fechar}>Cancelar</button>
          </div>
        </>
      )}
    </Folha>
  )
}

function FormRecebimento({ onSalvar, onFechar }) {
  const [qtdBateNF, setQtdBate] = useState(null)
  const [estadoOk, setEstadoOk] = useState(null)
  const [avarias, setAvarias] = useState('')
  const [foto, setFoto] = useState('')
  const seletor = useRef(null)
  const erros = errosRecebimento({ qtdBateNF, estadoOk })
  const { aviso, tocar, tentar } = useAvisos(erros)

  const escolherFoto = (e) => {
    const arquivo = e.target.files[0]
    e.target.value = ''
    if (!arquivo) return
    if (foto) URL.revokeObjectURL(foto)
    setFoto(URL.createObjectURL(arquivo))
  }
  // A prévia só é liberada se a pessoa desistir; ao salvar ela segue no card do pedido.
  const aoFechar = () => { if (foto) URL.revokeObjectURL(foto); onFechar() }

  return (
    <Folha titulo="Recebimento no almoxarifado" sujo={qtdBateNF !== null || estadoOk !== null || Boolean(avarias || foto)} onFechar={aoFechar}>
      {(fechar) => (
        <>
          <SimNao rotulo="A quantidade bate com a nota fiscal?" valor={qtdBateNF} onTroca={setQtdBate} onToque={() => tocar('qtdBateNF')} erro={aviso('qtdBateNF')} />
          <SimNao rotulo="O material chegou em perfeito estado?" valor={estadoOk} onTroca={setEstadoOk} onToque={() => tocar('estadoOk')} erro={aviso('estadoOk')} />
          <div className="field">
            <label htmlFor="rec-avarias">Avarias</label>
            <textarea id="rec-avarias" rows={2} value={avarias} onChange={(e) => setAvarias(e.target.value)} placeholder="Opcional: o que veio errado ou quebrado" />
          </div>
          <div className="field">
            <span className="lb">Foto da nota fiscal</span>
            <input ref={seletor} type="file" accept="image/*" hidden onChange={escolherFoto} />
            {foto && <div className="photos"><div className="photo miniatura"><img src={foto} alt="Prévia da nota fiscal" /></div></div>}
            <button type="button" className="btn secondary" style={{ marginTop: 8 }} onClick={() => seletor.current.click()}>
              <Icone nome="fotos" />{foto ? 'Trocar foto' : 'Tirar ou escolher foto'}
            </button>
          </div>
          <div className="form-actions">
            <button type="button" className="btn" onClick={() => tentar() && onSalvar({ qtdBateNF, estadoOk, avarias, fotoNF: foto })}>Confirmar recebimento</button>
            <button type="button" className="btn secondary" onClick={fechar}>Cancelar</button>
          </div>
        </>
      )}
    </Folha>
  )
}

function FormEntrega({ pedido, onSalvar, onFechar }) {
  const [frente, setFrente] = useState(pedido.frente)
  const erros = errosEntrega({ frente })
  const { aviso, tocar, tentar } = useAvisos(erros)
  return (
    <Folha titulo="Entrega na frente" sujo={frente !== pedido.frente} onFechar={onFechar}>
      {(fechar) => (
        <>
          <div className="field">
            <label htmlFor="ent-frente">Frente onde o material foi aplicado</label>
            <input id="ent-frente" className="input" maxLength={60} value={frente} onChange={(e) => setFrente(e.target.value)} onBlur={() => tocar('frente')} />
            <Aviso texto={aviso('frente')} />
          </div>
          <p className="mono">O pedido sai do quadro ativo. Use “Ver entregues” para consultar.</p>
          <div className="form-actions">
            <button type="button" className="btn" onClick={() => tentar() && onSalvar({ frente })}>Confirmar entrega</button>
            <button type="button" className="btn secondary" onClick={fechar}>Cancelar</button>
          </div>
        </>
      )}
    </Folha>
  )
}

function Cartao({ p, material, hoje, podeMover, onMover }) {
  const pill = pillDoPedido(p, material?.categoria)
  const atrasado = estaAtrasado(p, hoje)
  const alerta = temAlertaDeRecebimento(p)
  const lead = leadTimeDias(p)
  const antes = colunaAntes(p.status)
  const depois = colunaDepois(p.status)
  const ocupado = provisorio(p)
  return (
    <article className={`card pedido${atrasado ? ' atrasado' : ''}`}>
      <div className="h"><b>{material?.nome || 'Material'}</b></div>
      <div className="qtd">{numero(p.quantidade)} {material?.unidade}</div>
      <div className="m">{p.frente}</div>
      <div className="tags">
        <Chip tom={pill.tom}>{pill.rotulo}</Chip>
        {atrasado && <Chip tom="bad">Atrasado</Chip>}
        {alerta && <Chip tom="warn">Alerta no recebimento</Chip>}
      </div>
      {p.fornecedor && <div className="m">Fornecedor: {p.fornecedor}</div>}
      {p.previsaoEntrega && (
        <div className="m">
          Previsão: {formatarData(p.previsaoEntrega)}
          {atrasado && ` (venceu ${textoDeDias(diasEntre(p.previsaoEntrega, hoje))})`}
        </div>
      )}
      {alerta && p.recebimento.avarias && <div className="m">{p.recebimento.avarias}</div>}
      <div className="mono">Nesta coluna {textoDeDias(diasNaColuna(p, hoje))}</div>
      {lead !== null && <div className="mono">Lead time: {lead} {lead === 1 ? 'dia' : 'dias'}</div>}
      {podeMover && (antes || depois) && (
        <div className="mover">
          {antes && <button type="button" className="btn secondary" disabled={ocupado} onClick={() => onMover(p, antes.id)}>← {antes.rotulo}</button>}
          {depois && <button type="button" className="btn" disabled={ocupado} onClick={() => onMover(p, depois.id)}>{depois.rotulo} →</button>}
        </div>
      )}
    </article>
  )
}

export default function Materiais({ avisar }) {
  const { obra, hoje, usuario } = useDados()
  const [estado, setEstado] = useState({ status: 'carregando', pedidos: [], catalogo: [] })
  const [rodada, setRodada] = useState(0)
  const [verEntregues, setVerEntregues] = useState(false)
  const [aberto, setAberto] = useState(null)
  const podeMover = pode(usuario.role, 'gerirMateriais')

  // A tela é remontada ao trocar de obra (Shell), então o quadro nunca mistura obras.
  useEffect(() => {
    let vivo = true
    Promise.all([listarPedidos(obra), listarCatalogo()]).then(([ped, cat]) => {
      if (!vivo) return
      setEstado(ped.erro || cat.erro
        ? { status: 'erro', pedidos: [], catalogo: [] }
        : { status: 'ok', pedidos: ped.data, catalogo: cat.data })
    })
    return () => { vivo = false }
  }, [obra.id, rodada])

  const tentarDeNovo = () => {
    setEstado({ status: 'carregando', pedidos: [], catalogo: [] })
    setRodada((n) => n + 1)
  }
  const trocarPedido = (de, para) => setEstado((e) => ({ ...e, pedidos: e.pedidos.map((x) => (x.id === de.id ? para : x)) }))

  // Otimista: o card aparece já; se o salvamento falhar, ele sai e a pessoa é avisada.
  const criar = async (campos) => {
    const temp = novoPedido({ ...campos, id: `novo-${Date.now()}`, obraCodigo: obra.codigo }, hoje)
    setEstado((e) => ({ ...e, pedidos: [...e.pedidos, temp] }))
    setAberto(null)
    const { data, erro } = await criarPedido(obra, campos, hoje)
    if (erro) {
      setEstado((e) => ({ ...e, pedidos: e.pedidos.filter((x) => x !== temp) }))
      avisar('Não consegui salvar o pedido. Tente de novo.')
      return
    }
    trocarPedido(temp, data)
    avisar('Pedido criado em Solicitar.')
  }

  // Otimista: o card muda de coluna já; se falhar, volta para onde estava.
  const mover = async (p, status, dados = {}) => {
    const novo = aplicarMovimento(p, status, dados, hoje)
    trocarPedido(p, novo)
    setAberto(null)
    const { erro } = await moverPedido(obra, p.id, status, dados, hoje)
    if (erro) {
      trocarPedido(novo, p)
      avisar('Não consegui mover o pedido. Tente de novo.')
      return
    }
    avisar(`Pedido movido para ${COLUNAS_MATERIAL.find((c) => c.id === status).rotulo}.`)
  }
  // Compra, recebimento e entrega pedem dados antes; as demais trocas são diretas.
  const pedirMover = (p, status) => {
    if (['comprado', 'almoxarifado', 'entregue'].includes(status) && colunaDepois(p.status)?.id === status) setAberto({ tipo: status, pedido: p })
    else mover(p, status)
  }

  const novo = podeMover && <button className="btn" onClick={() => setAberto({ tipo: 'novo' })}><Icone nome="plus" />Novo pedido</button>
  const contadores = contadoresMateriais(estado.pedidos, hoje)
  const entregues = estado.pedidos.filter((p) => p.status === 'entregue').length
  const colunas = COLUNAS_MATERIAL.filter((c) => verEntregues || c.id !== 'entregue')
  const materialDe = (p) => estado.catalogo.find((m) => m.id === p.materialId)

  return (
    <>
      <Topo titulo="Materiais" subtitulo={`${obra.codigo} — ${obra.nome}`}>{novo}</Topo>
      {estado.status === 'carregando' && <p className="mono" role="status">Carregando pedidos…</p>}
      {estado.status === 'erro' && (
        <div className="empty" role="alert">
          <h3>Não consegui carregar os pedidos</h3>
          <p>Verifique a conexão e tente de novo.</p>
          <button className="btn" onClick={tentarDeNovo}>Tentar de novo</button>
        </div>
      )}
      {estado.status === 'ok' && estado.pedidos.length === 0 && (
        <Vazio icone="materiais" titulo="Nenhum pedido ainda" texto="Peça o primeiro material desta obra: escolha o item, a quantidade e a frente.">
          {novo}
        </Vazio>
      )}
      {estado.status === 'ok' && estado.pedidos.length > 0 && (
        <>
          <div className="contadores">
            <div className="cont"><b>{contadores.cotacao}</b>Em cotação</div>
            <div className="cont"><b>{contadores.semana}</b>Chegando esta semana</div>
            <div className={`cont${contadores.atrasados ? ' ruim' : ''}`}><b>{contadores.atrasados}</b>Atrasados</div>
          </div>
          <div className="chips" style={{ marginTop: 14 }}>
            <button type="button" className={verEntregues ? 'on' : ''} aria-pressed={verEntregues} onClick={() => setVerEntregues((v) => !v)}>
              Ver entregues ({entregues})
            </button>
          </div>
          <div className="kanban">
            {colunas.map((c) => {
              const doStatus = estado.pedidos.filter((p) => p.status === c.id)
              return (
                <section className="coluna" key={c.id} aria-label={c.rotulo}>
                  <h2>{c.rotulo} <span>{doStatus.length}</span></h2>
                  {doStatus.length === 0 && <p className="vazia">Nenhum pedido</p>}
                  {doStatus.map((p) => (
                    <Cartao key={p.id} p={p} material={materialDe(p)} hoje={hoje} podeMover={podeMover} onMover={pedirMover} />
                  ))}
                </section>
              )
            })}
          </div>
        </>
      )}
      {aberto?.tipo === 'novo' && <FormNovo catalogo={estado.catalogo} onSalvar={criar} onFechar={() => setAberto(null)} />}
      {aberto?.tipo === 'comprado' && <FormCompra hoje={hoje} onSalvar={(d) => mover(aberto.pedido, 'comprado', d)} onFechar={() => setAberto(null)} />}
      {aberto?.tipo === 'almoxarifado' && <FormRecebimento onSalvar={(d) => mover(aberto.pedido, 'almoxarifado', d)} onFechar={() => setAberto(null)} />}
      {aberto?.tipo === 'entregue' && <FormEntrega pedido={aberto.pedido} onSalvar={(d) => mover(aberto.pedido, 'entregue', d)} onFechar={() => setAberto(null)} />}
    </>
  )
}
