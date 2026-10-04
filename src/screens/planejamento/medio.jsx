import { useState } from 'react'
import { Chip, Icone, Seletor, Vazio } from '../../components/index.jsx'
import { useDados } from '../../lib/DadosContext.jsx'
import { usePlanejamento } from '../../lib/PlanejamentoContext.jsx'
import {
  atividadesAtivas, contadoresDeRestricoes, DIAS_SEMANA, diaDaSemana, errosRestricao, montarLookahead, opcoesDePai, OPCOES_SEMANAS, prazoMovido,
  responsaveisDasRestricoes, SEMANAS_PADRAO, semanasDoLookahead, TIPOS_RESTRICAO_PLAN, tipoDaRestricao,
} from '../../lib/planejamento.js'
import { formatarDataCurta } from '../../lib/regras.js'
import { Aviso, Estado, Folha, useAvisos } from './ui.jsx'

const Etiqueta = ({ tipo }) => {
  const t = tipoDaRestricao(tipo)
  return <span className={`tipo ${t.chave}`}><Icone nome={t.icone} />{t.rotulo}</span>
}

// Criar ou editar uma restrição. Obrigatório avisa na hora; o prazo nasce com hoje.
function FormRestricao({ restricao, onSalvar, onFechar }) {
  const { atividades, restricoes, hoje } = usePlanejamento()
  const { perfis } = useDados()
  const [atividadeId, setAtividadeId] = useState(restricao ? String(restricao.atividadeId) : '')
  const [descricao, setDescricao] = useState(restricao?.descricao ?? '')
  const [tipo, setTipo] = useState(restricao?.tipo ?? '')
  const [prazo, setPrazo] = useState(restricao?.prazo ?? hoje)
  const [responsavel, setResponsavel] = useState(restricao?.responsavel ?? '')
  const [salvando, setSalvando] = useState(false)

  const erros = errosRestricao({ atividadeId, descricao, tipo, prazo, responsavel }, hoje, !restricao)
  const { aviso, tocar, tentar } = useAvisos(erros)
  const atividadesDaLista = opcoesDePai(atividades, null)
  const sugestoes = [...new Set([...responsaveisDasRestricoes(restricoes), ...perfis.map((p) => p.nome).filter(Boolean)])]
  const sujo = restricao
    ? atividadeId !== String(restricao.atividadeId) || descricao !== restricao.descricao || tipo !== restricao.tipo || prazo !== restricao.prazo || responsavel !== restricao.responsavel
    : Boolean(atividadeId || descricao.trim() || tipo || responsavel.trim() || prazo !== hoje)

  const salvar = async () => {
    if (!tentar() || salvando) return
    setSalvando(true)
    await onSalvar({ atividadeId, descricao, tipo, prazo, responsavel })
    setSalvando(false)
  }

  return (
    <Folha titulo={restricao ? 'Editar restrição' : 'Nova restrição'} sujo={sujo} onFechar={onFechar}>
      {(fechar) => (
        <>
          <div className="field">
            <label htmlFor="res-atividade">Atividade impedida</label>
            <select id="res-atividade" className="select" value={atividadeId} onChange={(e) => setAtividadeId(e.target.value)} onBlur={() => tocar('atividadeId')}>
              <option value="">Escolha a atividade</option>
              {atividadesDaLista.map((a) => <option key={a.id} value={a.id}>{a.rotulo}</option>)}
            </select>
            <Aviso texto={aviso('atividadeId')} />
          </div>
          <div className="field">
            <label htmlFor="res-descricao">O que está impedindo</label>
            <textarea id="res-descricao" rows={3} maxLength={200} placeholder="Ex.: Eletrodutos ainda não chegaram na obra" value={descricao} onChange={(e) => setDescricao(e.target.value)} onBlur={() => tocar('descricao')} />
            <Aviso texto={aviso('descricao')} />
          </div>
          <div className="field">
            <span className="lb">Tipo</span>
            <div className="chips">
              {TIPOS_RESTRICAO_PLAN.map((t) => (
                <button key={t.chave} type="button" className={tipo === t.rotulo ? 'on' : ''} aria-pressed={tipo === t.rotulo} onClick={() => { setTipo(t.rotulo); tocar('tipo') }}>{t.rotulo}</button>
              ))}
            </div>
            <Aviso texto={aviso('tipo')} />
          </div>
          <div className="field">
            <label htmlFor="res-prazo">Prazo de resolução</label>
            <input id="res-prazo" className="input" type="date" min={restricao ? undefined : hoje} value={prazo} onChange={(e) => setPrazo(e.target.value)} onBlur={() => tocar('prazo')} />
            <Aviso texto={aviso('prazo')} />
          </div>
          <div className="field">
            <label htmlFor="res-resp">Responsável</label>
            <input id="res-resp" className="input" list="res-sugestoes" maxLength={60} placeholder="Quem resolve" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} onBlur={() => tocar('responsavel')} />
            <datalist id="res-sugestoes">{sugestoes.map((n) => <option key={n} value={n} />)}</datalist>
            <Aviso texto={aviso('responsavel')} />
          </div>
          <div className="form-actions">
            <button type="button" className="btn" disabled={salvando} onClick={salvar}>{salvando ? 'Salvando…' : 'Salvar restrição'}</button>
            <button type="button" className="btn secondary" onClick={fechar}>Cancelar</button>
          </div>
        </>
      )}
    </Folha>
  )
}

function Cartao({ r, hoje, semanas, onEditar, onResolver, onMover }) {
  const vencida = !r.resolvida && r.prazo < hoje
  const anterior = prazoMovido(r, -1, semanas)
  const proxima = prazoMovido(r, 1, semanas)
  return (
    <article className={`card restricao ${tipoDaRestricao(r.tipo).chave} ${r.resolvida ? 'resolvida' : ''}`}>
      <div className="rest-topo">
        <Etiqueta tipo={r.tipo} />
        {vencida && <Chip tom="bad">Vencida</Chip>}
        {r.resolvida && <Chip tom="ok">Resolvida{r.resolvidaEm ? ` ${formatarDataCurta(r.resolvidaEm)}` : ''}</Chip>}
      </div>
      <p className="rest-desc">{r.descricao}</p>
      <div className="m mono">{r.atividade.codigo} {r.atividade.titulo}</div>
      <div className="m">Prazo: {DIAS_SEMANA[diaDaSemana(r.prazo)]} {formatarDataCurta(r.prazo)} · {r.responsavel}</div>
      <div className="rest-acoes">
        {!r.resolvida && (
          <>
            <button type="button" className="btn secondary" disabled={!anterior} onClick={() => onMover(r, -1)}><Icone nome="voltar" />Semana anterior</button>
            <button type="button" className="btn secondary" disabled={!proxima} onClick={() => onMover(r, 1)}>Próxima semana<Icone nome="proxima" /></button>
          </>
        )}
        <button type="button" className="btn" onClick={() => onResolver(r)}>{r.resolvida ? 'Reabrir' : <><Icone nome="check" />Resolvida</>}</button>
        <button type="button" className="btn secondary" onClick={() => onEditar(r)}>Editar</button>
      </div>
    </article>
  )
}

function Coluna({ titulo, periodo, itens, vazio, children }) {
  return (
    <section className="coluna" aria-label={titulo}>
      <h2><span>{titulo}</span><span>{itens.length}</span></h2>
      {periodo && <div className="mono">{periodo}</div>}
      {itens.length === 0 ? <p className="vazia">{vazio}</p> : itens.map(children)}
    </section>
  )
}

export default function Medio({ avisar, irPara }) {
  const { atividades, restricoes, hoje, salvarRestricao, resolverRestricao, reprogramarRestricao } = usePlanejamento()
  const [quantidade, setQuantidade] = useState(SEMANAS_PADRAO)
  const [responsavel, setResponsavel] = useState('')
  const [resolvidas, setResolvidas] = useState(false)
  const [form, setForm] = useState(null) // { restricao? }

  const semanas = semanasDoLookahead(hoje, quantidade)
  const board = montarLookahead(restricoes, atividades, semanas, { responsavel, resolvidas })
  const contadores = contadoresDeRestricoes(restricoes, atividades, hoje)
  const responsaveis = responsaveisDasRestricoes(restricoes)

  const salvar = async (campos) => {
    const erro = await salvarRestricao(campos, form.restricao?.id)
    if (erro) return avisar(erro)
    avisar(form.restricao ? 'Restrição atualizada.' : 'Restrição criada.')
    setForm(null)
  }
  const alternar = async (r) => {
    const erro = await resolverRestricao(r.id, !r.resolvida)
    avisar(erro || (r.resolvida ? 'Restrição reaberta.' : 'Restrição resolvida.'))
  }
  const mover = async (r, direcao) => {
    const prazo = prazoMovido(r, direcao, semanas)
    if (!prazo) return
    const erro = await reprogramarRestricao(r.id, prazo)
    avisar(erro || `Prazo movido para ${DIAS_SEMANA[diaDaSemana(prazo)]} ${formatarDataCurta(prazo)}.`)
  }
  const cartao = (r) => <Cartao key={r.id} r={r} hoje={hoje} semanas={semanas} onEditar={(x) => setForm({ restricao: x })} onResolver={alternar} onMover={mover} />

  let vazio = null
  if (atividadesAtivas(atividades).length === 0) {
    vazio = (
      <Vazio icone="planejamento" titulo="Sem atividades para restringir" texto="As restrições ficam presas às atividades da EAP. Crie ou importe as atividades primeiro.">
        <button type="button" className="btn" onClick={() => irPara('eap')}><Icone nome="plus" />Ir para a EAP</button>
      </Vazio>
    )
  } else if (restricoes.length === 0) {
    vazio = (
      <Vazio icone="restricoes" titulo="Nenhuma restrição registrada" texto="Registre o que pode impedir as atividades das próximas semanas (material, mão de obra, projeto…) e resolva antes que vire atraso.">
        <button type="button" className="btn" onClick={() => setForm({})}><Icone nome="plus" />Registrar primeira restrição</button>
      </Vazio>
    )
  }

  return (
    <>
      <Estado vazio={vazio}>
        <div className="contadores">
          <div className="cont"><b>{contadores.abertas}</b>abertas</div>
          <div className={`cont ${contadores.vencidas ? 'ruim' : ''}`}><b>{contadores.vencidas}</b>vencidas</div>
          <div className="cont"><b>{contadores.resolvidas}</b>resolvidas</div>
        </div>
        <div className="eap-barra">
          <button type="button" className="btn" onClick={() => setForm({})}><Icone nome="plus" />Nova restrição</button>
        </div>
        <div className="filters one">
          <Seletor rotulo="Semanas visíveis" valor={String(quantidade)} onTroca={(v) => setQuantidade(Number(v))} opcoes={OPCOES_SEMANAS.map((n) => [String(n), `${n} semanas à frente`])} />
          <Seletor rotulo="Responsável" valor={responsavel} onTroca={setResponsavel} todas="Todos os responsáveis" opcoes={responsaveis.map((n) => [n, n])} />
          <label className="eap-check">
            <input type="checkbox" checked={resolvidas} onChange={(e) => setResolvidas(e.target.checked)} />
            Mostrar resolvidas
          </label>
        </div>
        {board.alem > 0 && <p className="mono">{board.alem} {board.alem === 1 ? 'restrição aberta está' : 'restrições abertas estão'} além das {quantidade} semanas. Aumente as semanas visíveis para ver.</p>}
        <div className="kanban">
          {board.atrasadas.length > 0 && (
            <Coluna titulo="Atrasadas" periodo="Prazo em semanas que já passaram" itens={board.atrasadas} vazio="Nada atrasado.">{cartao}</Coluna>
          )}
          {semanas.map((s) => (
            <Coluna key={s.indice} titulo={`${s.rotulo}${s.atual ? ' · atual' : ''}`} periodo={s.periodo} itens={board.semanas[s.indice]} vazio="Nenhuma restrição nesta semana.">{cartao}</Coluna>
          ))}
        </div>
      </Estado>
      {form && <FormRestricao restricao={form.restricao} onSalvar={salvar} onFechar={() => setForm(null)} />}
    </>
  )
}
