import { useState } from 'react'
import { Chip, Icone, Vazio } from '../../components/index.jsx'
import { usePlanejamento } from '../../lib/PlanejamentoContext.jsx'
import {
  alternarSubtarefa, atividadesDaSemana, CAUSAS_RAIZ, causasDaSemana, colunaNaSemana, COLUNAS_CURTO, errosCausa, errosSubtarefa,
  historicoPPC, moverAtividade, naoRealizarSubtarefa, novaSubtarefa, ppcDaSemana, removerSubtarefa, restricoesAbertasPorAtividade,
  semanaAtual, semanaPorInicio, somarDias, subtarefasPendentes, textoDiasUteis, diasUteis,
} from '../../lib/planejamento.js'
import { formatarDataCurta } from '../../lib/regras.js'
import { Aviso, Estado, Folha, useAvisos, useConfirmar } from './ui.jsx'

const DESTINOS = [['a_fazer', 'A Fazer'], ['andamento', 'Em Andamento'], ['concluida', 'Concluído'], ['nao_realizado', 'Não realizado']]
const PROGRESSOS = [10, 20, 30, 40, 50, 60, 70, 80, 90]
const pct = (n) => `${Math.round(n)}%`

// Pede a causa raiz (obrigatória) de uma atividade ou subtarefa que não foi realizada.
function FormCausa({ titulo, onSalvar, onFechar }) {
  const [causa, setCausa] = useState('')
  const [detalhe, setDetalhe] = useState('')
  const erros = errosCausa({ causa, detalhe })
  const { aviso, tocar, tentar } = useAvisos(erros)
  return (
    <Folha titulo="Não realizado" sujo={Boolean(causa || detalhe)} onFechar={onFechar}>
      {(fechar) => (
        <>
          <p className="confirma-texto">{titulo}</p>
          <div className="field">
            <label htmlFor="causa-raiz">Causa raiz</label>
            <select id="causa-raiz" className="select" value={causa} onChange={(e) => setCausa(e.target.value)} onBlur={() => tocar('causa')}>
              <option value="">Escolha a causa</option>
              {CAUSAS_RAIZ.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <Aviso texto={aviso('causa')} />
          </div>
          <div className="field">
            <label htmlFor="causa-detalhe">{causa === 'Outro' ? 'Descreva a causa' : 'Detalhe (opcional)'}</label>
            <input id="causa-detalhe" className="input" maxLength={120} value={detalhe} onChange={(e) => setDetalhe(e.target.value)} onBlur={() => tocar('detalhe')} />
            <Aviso texto={aviso('detalhe')} />
          </div>
          <div className="form-actions">
            <button type="button" className="btn" onClick={() => tentar() && onSalvar({ causa, detalhe })}>Marcar como não realizado</button>
            <button type="button" className="btn secondary" onClick={fechar}>Cancelar</button>
          </div>
        </>
      )}
    </Folha>
  )
}

function Checklist({ item, editavel, onAlternar, onNaoRealizar, onRemover, onAdicionar }) {
  const [titulo, setTitulo] = useState('')
  const [tentou, setTentou] = useState(false)
  const erro = errosSubtarefa(titulo).titulo
  const adicionar = () => {
    setTentou(true)
    if (erro) return
    onAdicionar(titulo)
    setTitulo('')
    setTentou(false)
  }
  return (
    <div className="checklist">
      <ul>
        {item.subtarefas.map((s) => (
          <li key={s.id} className={s.naoRealizado ? 'nao' : ''}>
            <label>
              <input type="checkbox" checked={s.feita} disabled={!editavel} onChange={(e) => onAlternar(s, e.target.checked)} />
              <span>{s.titulo}</span>
            </label>
            {s.naoRealizado && <Chip tom="bad">Não realizada · {s.causa}{s.causaDetalhe ? ` (${s.causaDetalhe})` : ''}</Chip>}
            {editavel && (
              <div className="sub-acoes">
                {!s.feita && !s.naoRealizado && <button type="button" className="btn secondary" onClick={() => onNaoRealizar(s)}>Não realizada</button>}
                <button type="button" className="btn secondary" aria-label={`Remover ${s.titulo}`} onClick={() => onRemover(s)}>Remover</button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {editavel && (
        <div className="sub-nova">
          <input className="input" aria-label="Nova subtarefa" maxLength={80} placeholder="Nova subtarefa" value={titulo} onChange={(e) => setTitulo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && adicionar()} />
          <button type="button" className="btn secondary" onClick={adicionar}>Adicionar</button>
        </div>
      )}
      {tentou && erro && <Aviso texto={erro} />}
    </div>
  )
}

function Cartao({ item, editavel, restricoes, calendario, onMover, onProgresso, onSub }) {
  const [aberto, setAberto] = useState(false)
  const total = item.subtarefas.length
  const feitas = item.subtarefas.filter((s) => s.feita).length
  const naoRealizado = item.status === 'nao_realizado'
  const coluna = colunaNaSemana(item)
  const avancar = { a_fazer: ['andamento', 'Iniciar'], andamento: ['concluida', 'Concluir'] }[coluna]
  return (
    <article className={`card pedido atividade-curta ${naoRealizado ? 'nao' : ''} ${item.acumulada ? 'acumulada' : ''}`}>
      <div className="h"><span className="eap-cod mono">{item.codigo}</span> <b>{item.titulo}</b></div>
      <div className="m mono">{formatarDataCurta(item.inicio)} → {formatarDataCurta(item.fim)} · {textoDiasUteis(diasUteis(item.inicio, item.fim, calendario))}</div>
      <div className="tags">
        {item.acumulada && <Chip tom="warn">Acumulada</Chip>}
        {naoRealizado && <Chip tom="bad">Não realizado · {item.causa}{item.causaDetalhe ? ` (${item.causaDetalhe})` : ''}</Chip>}
        {restricoes > 0 && <Chip tom="bad">{restricoes} {restricoes === 1 ? 'restrição' : 'restrições'}</Chip>}
        {item.status === 'concluida' && !item.feita && <Chip tom="neutral">Concluída em {formatarDataCurta(item.concluidaEm || item.fim)}</Chip>}
        {item.feita && item.concluidaEm && <Chip tom="ok">Concluída em {formatarDataCurta(item.concluidaEm)}</Chip>}
      </div>
      <div className="pbar"><div className="tr"><i style={{ width: `${item.progresso}%` }} /></div><small>{pct(item.progresso)} concluído{total ? ` · ${feitas}/${total} subtarefas` : ''}</small></div>
      {editavel && (
        <div className="mover">
          {avancar && <button type="button" className="btn" onClick={() => onMover(item, avancar[0])}>{avancar[1]}<Icone nome="proxima" /></button>}
          <select className="select" aria-label={`Mover ${item.titulo} para`} value={item.status} onChange={(e) => e.target.value !== item.status && onMover(item, e.target.value)}>
            {DESTINOS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
          {item.status === 'andamento' && !total && (
            <select className="select" aria-label={`Progresso de ${item.titulo}`} value={PROGRESSOS.includes(item.progresso) ? item.progresso : ''} onChange={(e) => onProgresso(item, Number(e.target.value))}>
              {!PROGRESSOS.includes(item.progresso) && <option value="">{pct(item.progresso)}</option>}
              {PROGRESSOS.map((p) => <option key={p} value={p}>{p}%</option>)}
            </select>
          )}
        </div>
      )}
      <button type="button" className="btn secondary" aria-expanded={aberto} onClick={() => setAberto(!aberto)}>
        {aberto ? 'Esconder subtarefas' : total ? `Subtarefas (${feitas}/${total})` : editavel ? 'Adicionar subtarefas' : 'Sem subtarefas'}
      </button>
      {aberto && (
        <Checklist
          item={item} editavel={editavel}
          onAlternar={(s, feita) => onSub(item, 'alternar', s, feita)} onNaoRealizar={(s) => onSub(item, 'nao', s)}
          onRemover={(s) => onSub(item, 'remover', s)} onAdicionar={(t) => onSub(item, 'adicionar', t)}
        />
      )}
    </article>
  )
}

function Ppc({ resumo, semana, atual }) {
  const vazio = resumo.ppc === null
  return (
    <section className="card ppc" aria-label="PPC da semana">
      <div className="ppc-topo">
        <div>
          <div className="mono">PPC · {semana.periodo}{atual ? ' · semana atual' : ''}</div>
          <div className="ppc-numero">{vazio ? '—' : pct(resumo.ppc)}</div>
        </div>
        <div className="ppc-quanto">{vazio ? 'Nada planejado' : <><b>{resumo.feitas} de {resumo.total}</b> concluídas</>}</div>
      </div>
      <div className="ppc-barra" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={vazio ? 0 : Math.round(resumo.ppc)} aria-label="PPC da semana"><i style={{ width: `${vazio ? 0 : resumo.ppc}%` }} /></div>
      <p className="mono">PPC = atividades concluídas ÷ atividades planejadas da semana × 100. Mede a confiabilidade do planejamento.</p>
    </section>
  )
}

function Historico({ lista, inicioAtual }) {
  if (lista.length < 2) return null
  return (
    <section className="card" aria-label="PPC ao longo das semanas">
      <h3 className="section-title" style={{ marginTop: 0 }}>PPC por semana</h3>
      <ol className="hist">
        {lista.map((s) => (
          <li key={s.inicio} className={s.inicio === inicioAtual ? 'on' : ''}>
            <span className="mono">{pct(s.ppc)}</span>
            <div className="hist-col" title={`${s.periodo}: ${s.feitas} de ${s.total}`}><i style={{ height: `${Math.max(s.ppc, 2)}%` }} /></div>
            <span className="mono">{s.periodo.slice(0, 5)}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

export default function Curto({ avisar, irPara }) {
  const { atividades, restricoes, calendario, hoje, substituirAtividade } = usePlanejamento()
  const atual = semanaAtual(hoje)
  const [inicio, setInicio] = useState(atual.inicio)
  const [causa, setCausa] = useState(null) // { titulo, aoSalvar }
  const { pedir, caixa } = useConfirmar()

  const semana = semanaPorInicio(inicio)
  const ehAtual = inicio === atual.inicio
  const itens = atividadesDaSemana(atividades, semana)
  const resumo = ppcDaSemana(itens)
  const causas = causasDaSemana(itens)
  const abertas = restricoesAbertasPorAtividade(restricoes)
  const original = (id) => atividades.find((a) => a.id === id)

  const gravar = async (nova, mensagem) => {
    const erro = await substituirAtividade(nova)
    avisar(erro || mensagem)
  }
  const mover = (item, destino) => {
    const a = original(item.id)
    if (destino === 'nao_realizado') {
      return setCausa({ titulo: `"${item.titulo}": por que não foi realizada?`, aoSalvar: (c) => gravar(moverAtividade(a, destino, c, hoje), 'Marcada como não realizada.') })
    }
    const aplicar = () => gravar(moverAtividade(a, destino, {}, hoje), `Movida para ${DESTINOS.find(([v]) => v === destino)[1]}.`)
    const pendentes = subtarefasPendentes(a)
    if (destino === 'concluida' && pendentes > 0) {
      return pedir(`"${item.titulo}" tem ${pendentes} ${pendentes === 1 ? 'subtarefa pendente' : 'subtarefas pendentes'}. Concluir marca todas como feitas.`, aplicar, 'Concluir mesmo assim')
    }
    return aplicar()
  }
  const progresso = (item, valor) => gravar({ ...original(item.id), progresso: valor }, `Progresso em ${valor}%.`)
  const sub = (item, acao, s, extra) => {
    const a = original(item.id)
    if (acao === 'adicionar') return gravar(novaSubtarefa(a, s), 'Subtarefa adicionada.')
    if (acao === 'alternar') return gravar(alternarSubtarefa(a, s.id, extra), extra ? 'Subtarefa concluída.' : 'Subtarefa reaberta.')
    if (acao === 'nao') {
      return setCausa({ titulo: `Subtarefa "${s.titulo}": por que não foi realizada?`, aoSalvar: (c) => gravar(naoRealizarSubtarefa(a, s.id, c.causa, c.detalhe), 'Subtarefa marcada como não realizada.') })
    }
    return pedir(`Remover a subtarefa "${s.titulo}"?`, () => gravar(removerSubtarefa(a, s.id), 'Subtarefa removida.'), 'Remover')
  }

  const semAtividades = atividades.length === 0
  const vazio = semAtividades
    ? (
      <Vazio icone="planejamento" titulo="Nenhuma atividade para a semana" texto="O Kanban usa as atividades da EAP. Crie ou importe as atividades primeiro.">
        <button type="button" className="btn" onClick={() => irPara('eap')}><Icone nome="plus" />Ir para a EAP</button>
      </Vazio>
    )
    : null

  return (
    <>
      {caixa}
      <Estado vazio={vazio}>
        <div className="semana-nav">
          <button type="button" className="btn secondary" onClick={() => setInicio(somarDias(inicio, -7))}><Icone nome="voltar" />Semana anterior</button>
          <button type="button" className="btn secondary" onClick={() => setInicio(somarDias(inicio, 7))}>Próxima semana<Icone nome="proxima" /></button>
          {!ehAtual && <button type="button" className="btn" onClick={() => setInicio(atual.inicio)}>Voltar à semana atual</button>}
        </div>
        <Ppc resumo={resumo} semana={semana} atual={ehAtual} />
        {!ehAtual && <p className="imp-aviso" role="status">Você está vendo outra semana: só leitura. Para mover atividades, volte à semana atual.</p>}
        {causas.length > 0 && (
          <p className="mono">Causas do que não foi realizado: {causas.map(([c, n]) => `${c} (${n})`).join(' · ')}</p>
        )}
        <Historico lista={historicoPPC(atividades, hoje)} inicioAtual={atual.inicio} />
        {itens.length === 0 && (
          <Vazio icone="planejamento" titulo="Nenhuma atividade planejada nesta semana" texto="Entram na semana as atividades cujo período cruza a semana e as que já deviam ter terminado e ainda não terminaram." />
        )}
        <div className="kanban">
          {COLUNAS_CURTO.map((c) => {
            const daColuna = itens.filter((i) => colunaNaSemana(i) === c.id)
            return (
              <section className="coluna" key={c.id} aria-label={c.rotulo}>
                <h2><span>{c.rotulo}</span><span>{daColuna.length}</span></h2>
                {daColuna.length === 0
                  ? <p className="vazia">Nada em {c.rotulo.toLowerCase()}.</p>
                  : daColuna.map((i) => (
                    <Cartao key={i.id} item={i} editavel={ehAtual} restricoes={abertas.get(i.id) || 0} calendario={calendario} onMover={mover} onProgresso={progresso} onSub={sub} />
                  ))}
              </section>
            )
          })}
        </div>
      </Estado>
      {causa && <FormCausa titulo={causa.titulo} onSalvar={(c) => { causa.aoSalvar(c); setCausa(null) }} onFechar={() => setCausa(null)} />}
    </>
  )
}
