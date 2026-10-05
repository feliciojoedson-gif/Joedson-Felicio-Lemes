import { useEffect, useState } from 'react'
import { Chip, Icone, Topo, Vazio } from '../components/index.jsx'
import { useDados } from '../lib/DadosContext.jsx'
import { criarContrato, criarMedicao, listarContratos, moverContrato } from '../lib/dados.js'
import {
  aplicarMovimentoContrato, colunaContratoAntes, colunaContratoDepois, COLUNAS_CONTRATO, errosContrato, medidoDoContrato, mostraMedido, MODOS, novaMedicao, novoContrato,
  pedeCadastroDoValor, percentualMedido, rotuloPercentual, verificarMovimento,
} from '../lib/empreiteiros.js'
import { formatarDinheiro, pode } from '../lib/regras.js'
import { Folha } from './planejamento/ui.jsx'
import { Aviso, useAvisos } from './empreiteiros/ui.jsx'
import Ficha from './empreiteiros/ficha.jsx'
import FormValor from './empreiteiros/valor.jsx'

const provisorio = (c) => String(c.id).startsWith('novo-')

function FormNovo({ onSalvar, onFechar }) {
  const [empreiteiro, setEmpreiteiro] = useState('')
  const [descricao, setDescricao] = useState('')
  const erros = errosContrato({ empreiteiro, descricao })
  const { aviso, tocar, tentar } = useAvisos(erros)
  return (
    <Folha titulo="Novo contrato" sujo={Boolean(empreiteiro || descricao)} onFechar={onFechar}>
      {(fechar) => (
        <>
          <div className="field">
            <label htmlFor="ctr-empreiteiro">Empreiteiro</label>
            <input id="ctr-empreiteiro" className="input" maxLength={60} placeholder="Ex.: Gesso Forte Acabamentos" value={empreiteiro} onChange={(e) => setEmpreiteiro(e.target.value)} onBlur={() => tocar('empreiteiro')} />
            <Aviso texto={aviso('empreiteiro')} />
          </div>
          <div className="field">
            <label htmlFor="ctr-descricao">Descrição do serviço</label>
            <textarea id="ctr-descricao" rows={3} maxLength={160} placeholder="Ex.: Forro e sancas de gesso" value={descricao} onChange={(e) => setDescricao(e.target.value)} onBlur={() => tocar('descricao')} />
            <Aviso texto={aviso('descricao')} />
          </div>
          <p className="mono">O contrato nasce em “Em Elaboração”. O valor é cadastrado quando ele for ativado.</p>
          <div className="form-actions">
            <button type="button" className="btn" onClick={() => tentar() && onSalvar({ empreiteiro, descricao })}>Criar contrato</button>
            <button type="button" className="btn secondary" onClick={fechar}>Cancelar</button>
          </div>
        </>
      )}
    </Folha>
  )
}

function Cartao({ c, medicoes, podeMover, onMover, onAbrir }) {
  const antes = colunaContratoAntes(c.status)
  const depois = colunaContratoDepois(c.status)
  const mostraBarra = mostraMedido(c)
  const pct = percentualMedido(c, medicoes)
  const ocupado = provisorio(c)
  return (
    <article className="card pedido">
      <div className="h"><b>{c.empreiteiro}</b></div>
      <div className="m">{c.descricao}</div>
      {c.valorTotal !== null && <div className="valor">{formatarDinheiro(c.valorTotal)}</div>}
      {c.modo && <div className="tags"><Chip>{MODOS[c.modo]}</Chip></div>}
      {mostraBarra && (
        <div className="pbar">
          <div className="tr" role="progressbar" aria-label="Percentual medido" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}><i style={{ width: `${Math.min(100, pct)}%` }} /></div>
          <small>{rotuloPercentual(pct)} medido · {formatarDinheiro(medidoDoContrato(c, medicoes))}</small>
        </div>
      )}
      {mostraBarra && <button type="button" className="btn secondary" disabled={ocupado} onClick={() => onAbrir(c)}>{c.status === 'ativo' ? 'Abrir ficha de medição' : 'Ver medições'}</button>}
      {podeMover && (antes || depois) && (
        <div className="mover">
          {antes && <button type="button" className="btn secondary" disabled={ocupado} onClick={() => onMover(c, antes.id)}>← {antes.rotulo}</button>}
          {depois && <button type="button" className="btn" disabled={ocupado} onClick={() => onMover(c, depois.id)}>{depois.rotulo} →</button>}
        </div>
      )}
    </article>
  )
}

// `embutida`: dentro da aba Empreiteiros da tela Medições (sem título próprio; o botão de novo contrato vem no topo da aba).
export default function Empreiteiros({ avisar, embutida = false }) {
  const { obra, hoje, usuario } = useDados()
  const [estado, setEstado] = useState({ status: 'carregando', contratos: [], itens: [], medicoes: [] })
  const [rodada, setRodada] = useState(0)
  const [aberto, setAberto] = useState(null)
  const [bloqueio, setBloqueio] = useState('')
  const [fichaId, setFichaId] = useState(null)
  const podeMover = pode(usuario.role, 'gerirEmpreiteiros')

  // A tela é remontada ao trocar de obra (Shell), então o quadro nunca mistura obras.
  useEffect(() => {
    let vivo = true
    listarContratos(obra).then(({ data, erro }) => {
      if (!vivo) return
      setEstado(erro ? { status: 'erro', contratos: [], itens: [], medicoes: [] } : { status: 'ok', ...data })
    })
    return () => { vivo = false }
  }, [obra.id, rodada])

  const tentarDeNovo = () => {
    setEstado({ status: 'carregando', contratos: [], itens: [], medicoes: [] })
    setRodada((n) => n + 1)
  }
  const trocarContrato = (de, para) => setEstado((e) => ({ ...e, contratos: e.contratos.map((x) => (x.id === de.id ? para : x)) }))
  const trocarItens = (contratoId, itens) => setEstado((e) => ({ ...e, itens: [...e.itens.filter((i) => i.contratoId !== contratoId), ...itens] }))

  // Otimista: o card aparece já; se o salvamento falhar, ele sai e a pessoa é avisada.
  const criar = async (campos) => {
    const temp = novoContrato({ ...campos, id: `novo-${Date.now()}`, obraId: obra.id }, hoje)
    setEstado((e) => ({ ...e, contratos: [...e.contratos, temp] }))
    setAberto(null)
    const { data, erro } = await criarContrato(obra, campos, hoje)
    if (erro) {
      setEstado((e) => ({ ...e, contratos: e.contratos.filter((x) => x !== temp) }))
      avisar('Não consegui salvar o contrato. Tente de novo.')
      return
    }
    trocarContrato(temp, data)
    avisar('Contrato criado em Em Elaboração.')
  }

  // Otimista: o card muda de coluna já; se falhar, volta para onde estava. As regras vêm da lib.
  const mover = async (c, status, cadastro) => {
    const barrado = verificarMovimento(c, status, estado.medicoes)
    if (barrado) {
      setBloqueio(barrado)
      setAberto(null)
      return
    }
    setBloqueio('')
    const itensAntes = estado.itens.filter((i) => i.contratoId === c.id)
    const novo = aplicarMovimentoContrato(c, status, cadastro)
    trocarContrato(c, novo)
    if (cadastro) trocarItens(c.id, cadastro.itens.map((it, k) => ({ ...it, id: `novo-${Date.now()}-${k}`, contratoId: c.id })))
    setAberto(null)
    const { data, erro } = await moverContrato(obra, c.id, status, cadastro)
    if (erro) {
      trocarContrato(novo, c)
      if (cadastro) trocarItens(c.id, itensAntes)
      avisar(erro.regra ? erro.message : 'Não consegui mover o contrato. Tente de novo.')
      return
    }
    if (cadastro) trocarItens(c.id, data.itens)
    avisar(`Contrato movido para ${COLUNAS_CONTRATO.find((col) => col.id === status).rotulo}.`)
  }
  // Otimista: o boletim entra no acumulado e no histórico já; se o salvamento falhar, sai e a pessoa é avisada.
  const lancarMedicao = async (c, boletim) => {
    const temp = novaMedicao(c, estado.medicoes, `novo-${Date.now()}`, boletim)
    setEstado((e) => ({ ...e, medicoes: [...e.medicoes, temp] }))
    const { data, erro } = await criarMedicao(obra, c.id, boletim)
    if (erro) {
      setEstado((e) => ({ ...e, medicoes: e.medicoes.filter((m) => m !== temp) }))
      avisar(erro.regra ? erro.message : 'Não consegui salvar a medição. Tente de novo.')
      return
    }
    setEstado((e) => ({ ...e, medicoes: e.medicoes.map((m) => (m === temp ? data : m)) }))
    avisar(`Medição nº ${data.numero} lançada.`)
  }
  // Ativar pede o valor antes; as demais trocas são diretas.
  const pedirMover = (c, status) => {
    if (pedeCadastroDoValor(c, status)) setAberto({ tipo: 'valor', contrato: c })
    else mover(c, status)
  }

  const novo = podeMover && <button className="btn" onClick={() => setAberto({ tipo: 'novo' })}><Icone nome="plus" />Novo contrato</button>

  // Trocar de quadro para ficha (e voltar) leva ao topo: senão a página fica na rolagem do quadro anterior.
  const abrirFicha = (id) => {
    window.scrollTo(0, 0)
    setFichaId(id)
  }
  const ficha = estado.contratos.find((c) => c.id === fichaId && !provisorio(c))
  if (ficha) {
    return (
      <>
        {!embutida && <Topo titulo="Ficha de medição" subtitulo={`${obra.codigo} — ${obra.nome}`} />}
        <Ficha
          contrato={ficha} itens={estado.itens.filter((i) => i.contratoId === ficha.id)} medicoes={estado.medicoes} hoje={hoje}
          podeMedir={podeMover} onVoltar={() => abrirFicha(null)} onSalvar={lancarMedicao}
        />
      </>
    )
  }

  return (
    <>
      {embutida
        ? estado.contratos.length > 0 && <div style={{ marginTop: 14 }}>{novo}</div>
        : <Topo titulo="Empreiteiros" subtitulo={`Fluxo dos contratos · ${obra.codigo} — ${obra.nome}`}>{novo}</Topo>}
      {estado.status === 'carregando' && <p className="mono" role="status">Carregando contratos…</p>}
      {estado.status === 'erro' && (
        <div className="empty" role="alert">
          <h3>Não consegui carregar os contratos</h3>
          <p>Verifique a conexão e tente de novo.</p>
          <button className="btn" onClick={tentarDeNovo}>Tentar de novo</button>
        </div>
      )}
      {estado.status === 'ok' && estado.contratos.length === 0 && (
        <Vazio icone="empreiteiros" titulo="Nenhum contrato ainda" texto={podeMover ? 'Crie o primeiro contrato desta obra: informe o empreiteiro e o serviço.' : 'Ainda não há contratos nesta obra.'}>
          {novo}
        </Vazio>
      )}
      {bloqueio && (
        <div className="bloqueio" role="alert">
          <span>{bloqueio}</span>
          <button type="button" className="btn secondary" onClick={() => setBloqueio('')}>Entendi</button>
        </div>
      )}
      {estado.status === 'ok' && estado.contratos.length > 0 && (
        <div className="kanban">
          {COLUNAS_CONTRATO.map((col) => {
            const doStatus = estado.contratos.filter((c) => c.status === col.id)
            return (
              <section className="coluna" key={col.id} aria-label={col.rotulo}>
                <h2>{col.rotulo} <span>{doStatus.length}</span></h2>
                {doStatus.length === 0 && <p className="vazia">Nenhum contrato</p>}
                {doStatus.map((c) => <Cartao key={c.id} c={c} medicoes={estado.medicoes} podeMover={podeMover} onMover={pedirMover} onAbrir={(x) => abrirFicha(x.id)} />)}
              </section>
            )
          })}
        </div>
      )}
      {aberto?.tipo === 'novo' && <FormNovo onSalvar={criar} onFechar={() => setAberto(null)} />}
      {aberto?.tipo === 'valor' && (
        <FormValor
          contrato={aberto.contrato} itensAtuais={estado.itens.filter((i) => i.contratoId === aberto.contrato.id)}
          onSalvar={(cadastro) => mover(aberto.contrato, 'ativo', cadastro)} onFechar={() => setAberto(null)}
        />
      )}
    </>
  )
}
