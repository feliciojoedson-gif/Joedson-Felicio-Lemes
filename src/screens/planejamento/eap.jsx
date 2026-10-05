import { useRef, useState } from 'react'
import { Chip, Icone, Vazio } from '../../components/index.jsx'
import { useDados } from '../../lib/DadosContext.jsx'
import { usePlanejamento } from '../../lib/PlanejamentoContext.jsx'
import { linhasDaPlanilha } from '../../lib/importacao.js'
import { gerarModelo, lerPlanilha } from '../../lib/planilha.js'
import { formatarDataCurta, pode } from '../../lib/regras.js'
import {
  arvore, diasUteis, errosAtividade, opcoesDePai, opcoesDePosicao, progressoDaAtividade, restricoesAbertasPorAtividade, ROTULO_STATUS,
  periodoRealDaAtividade, statusDaAtividade, textoDiasUteis, TOM_STATUS,
} from '../../lib/planejamento.js'
import Importacao from './importacao.jsx'
import { Aviso, Estado, Folha, useAvisos, useConfirmar } from './ui.jsx'

// Formulário de criar/editar. `base` traz os valores iniciais (editar) ou só o pai pré-escolhido (subatividade).
function FormAtividade({ atividade, paiInicial, onSalvar, onFechar }) {
  const { atividades, calendario, hoje } = usePlanejamento()
  const [titulo, setTitulo] = useState(atividade?.titulo ?? '')
  const [inicio, setInicio] = useState(atividade?.inicio ?? hoje)
  const [fim, setFim] = useState(atividade?.fim ?? hoje)
  const [parentId, setParentId] = useState(String(atividade ? atividade.parentId ?? '' : paiInicial ?? ''))
  const [inicioReal, setInicioReal] = useState(atividade?.inicioReal ?? '')
  const [fimReal, setFimReal] = useState(atividade?.fimReal ?? '')
  const [antesDeId, setAntesDeId] = useState('')
  const [salvando, setSalvando] = useState(false)

  const folha = atividade?.filhos === 0 // grupo não tem datas reais próprias: elas vêm das atividades dentro dele
  const erros = errosAtividade({ titulo, inicio, fim, inicioReal, fimReal })
  const { aviso, tocar, tentar } = useAvisos(erros)
  const pais = opcoesDePai(atividades, atividade?.id)
  const posicoes = opcoesDePosicao(atividades, parentId === '' ? null : Number(parentId), atividade?.id)
  const sujo = atividade
    ? titulo !== atividade.titulo || inicio !== atividade.inicio || fim !== atividade.fim || parentId !== String(atividade.parentId ?? '') || antesDeId !== ''
      || inicioReal !== (atividade.inicioReal ?? '') || fimReal !== (atividade.fimReal ?? '')
    : Boolean(titulo.trim())
  const duracao = diasUteis(inicio, fim, calendario)

  const salvar = async () => {
    if (!tentar() || salvando) return
    setSalvando(true)
    await onSalvar({
      titulo, inicio, fim,
      // As datas reais só existem na edição: atividade nova ainda não começou.
      ...(folha ? { inicioReal, fimReal } : {}),
      parentId: parentId === '' ? null : Number(parentId),
      antesDeId: antesDeId === '' ? null : Number(antesDeId),
    })
    setSalvando(false)
  }

  return (
    <Folha titulo={atividade ? 'Editar atividade' : 'Nova atividade'} sujo={sujo} onFechar={onFechar}>
      {(fechar) => (
        <>
          <div className="field">
            <label htmlFor="atv-titulo">Título</label>
            <input id="atv-titulo" className="input" maxLength={80} placeholder="Ex.: Tubulação de água fria" value={titulo} onChange={(e) => setTitulo(e.target.value)} onBlur={() => tocar('titulo')} />
            <Aviso texto={aviso('titulo')} />
          </div>
          <div className="field">
            <label htmlFor="atv-inicio">Data de início</label>
            <input id="atv-inicio" className="input" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} onBlur={() => tocar('inicio')} />
            <Aviso texto={aviso('inicio')} />
          </div>
          <div className="field">
            <label htmlFor="atv-fim">Data de fim</label>
            <input id="atv-fim" className="input" type="date" min={inicio || undefined} value={fim} onChange={(e) => setFim(e.target.value)} onBlur={() => tocar('fim')} />
            <Aviso texto={aviso('fim')} />
            {!erros.inicio && !erros.fim && <div className="mono" style={{ marginTop: 6 }}>Duração: {textoDiasUteis(duracao)}</div>}
          </div>
          {folha && (
            <>
              <div className="field">
                <label htmlFor="atv-inicio-real">Início real (opcional)</label>
                <input id="atv-inicio-real" className="input" type="date" value={inicioReal} onChange={(e) => setInicioReal(e.target.value)} onBlur={() => tocar('inicioReal')} />
                <Aviso texto={aviso('inicioReal')} />
              </div>
              <div className="field">
                <label htmlFor="atv-fim-real">Término real (opcional)</label>
                <input id="atv-fim-real" className="input" type="date" min={inicioReal || undefined} value={fimReal} onChange={(e) => setFimReal(e.target.value)} onBlur={() => tocar('fimReal')} />
                <Aviso texto={aviso('fimReal')} />
              </div>
            </>
          )}
          <div className="field">
            <label htmlFor="atv-pai">Dentro de</label>
            <select id="atv-pai" className="select" value={parentId} onChange={(e) => { setParentId(e.target.value); setAntesDeId('') }}>
              <option value="">Nenhuma (nível principal)</option>
              {pais.map((p) => <option key={p.id} value={p.id}>{p.rotulo}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="atv-pos">Posição</label>
            <select id="atv-pos" className="select" value={antesDeId} onChange={(e) => setAntesDeId(e.target.value)}>
              <option value="">{atividade ? 'Manter onde está (ou no final, se mudou de grupo)' : 'No final da lista'}</option>
              {posicoes.map((p) => <option key={p.id} value={p.id}>Antes de {p.rotulo}</option>)}
            </select>
          </div>
          <div className="form-actions">
            <button type="button" className="btn" disabled={salvando} onClick={salvar}>{salvando ? 'Salvando…' : 'Salvar'}</button>
            <button type="button" className="btn secondary" onClick={fechar}>Cancelar</button>
          </div>
        </>
      )}
    </Folha>
  )
}

function LinhaEap({ a, atividades, calendario, restricoes, onEditar, onSub, onArquivar }) {
  const progresso = Math.round(progressoDaAtividade(atividades, a.id, calendario))
  const status = statusDaAtividade(atividades, a.id)
  const dias = diasUteis(a.inicio, a.fim, calendario)
  const grupo = a.filhos > 0
  const real = periodoRealDaAtividade(atividades, a.id)
  return (
    <li className={`eap-linha n${Math.min(a.nivel, 3)} ${a.arquivadaEfetiva ? 'arquivada' : ''}`}>
      <div className="eap-topo">
        <span className="eap-cod mono">{a.codigo}</span>
        <span className="eap-tit">{a.titulo}</span>
        {a.arquivadaEfetiva ? <span className="tag">Arquivada</span> : <Chip tom={TOM_STATUS[status]}>{ROTULO_STATUS[status]}</Chip>}
        {restricoes > 0 && !a.arquivadaEfetiva && <Chip tom="bad">{restricoes} {restricoes === 1 ? 'restrição' : 'restrições'}</Chip>}
      </div>
      <div className="eap-meta mono">
        {formatarDataCurta(a.inicio)} → {formatarDataCurta(a.fim)} · {textoDiasUteis(dias)} · {progresso}%{grupo ? ` · ${a.filhos} ${a.filhos === 1 ? 'sub' : 'subs'}` : ''}
      </div>
      <div className="eap-meta mono">Início real: {formatarDataCurta(real.inicioReal)} · Término real: {formatarDataCurta(real.fimReal)}</div>
      <div className="eap-acoes">
        {!a.arquivada && !a.arquivadaEfetiva && <button type="button" className="btn secondary" onClick={() => onEditar(a)}>Editar</button>}
        {!a.arquivadaEfetiva && <button type="button" className="btn secondary" onClick={() => onSub(a)}><Icone nome="plus" />Sub</button>}
        {(!a.arquivadaEfetiva || a.arquivada) && (
          <button type="button" className="btn secondary" onClick={() => onArquivar(a)}>{a.arquivada ? 'Desarquivar' : 'Arquivar'}</button>
        )}
      </div>
    </li>
  )
}

export default function Eap({ avisar }) {
  const { atividades, restricoes, calendario, salvarAtividade, arquivarAtividade } = usePlanejamento()
  const { usuario } = useDados()
  const podeImportar = pode(usuario.role, 'importarPlanejamento')
  const abertasPorAtividade = restricoesAbertasPorAtividade(restricoes)
  const [form, setForm] = useState(null) // { atividade? , paiInicial? }
  const [verArquivadas, setVerArquivadas] = useState(false)
  const [importando, setImportando] = useState(null) // { nome, linhas }
  const [lendo, setLendo] = useState(false)
  const [erroArquivo, setErroArquivo] = useState('')
  const seletor = useRef(null)
  const { pedir, caixa } = useConfirmar()

  const todas = arvore(atividades)
  const vivas = todas.filter((a) => !a.arquivadaEfetiva)
  const visiveis = verArquivadas ? todas : vivas
  const qtdArquivadas = todas.length - vivas.length
  const emAndamento = vivas.filter((a) => a.filhos === 0 && statusDaAtividade(atividades, a.id) === 'andamento').length
  const concluidas = vivas.filter((a) => a.filhos === 0 && a.status === 'concluida').length

  const salvar = async (campos) => {
    const erro = await salvarAtividade(campos, form.atividade?.id)
    if (erro) return avisar(erro)
    avisar(form.atividade ? 'Atividade atualizada.' : 'Atividade criada.')
    setForm(null)
  }
  const trocarArquivada = async (a) => {
    const erro = await arquivarAtividade(a.id, !a.arquivada)
    avisar(erro || (a.arquivada ? 'Atividade desarquivada.' : 'Atividade arquivada.'))
  }
  const arquivar = (a) => {
    if (a.arquivada) return trocarArquivada(a)
    const dentro = todas.filter((x) => x.parentId === a.id).length
    const aviso = dentro ? ` Os ${dentro} itens dentro dela também saem das outras abas.` : ''
    pedir(`Arquivar "${a.titulo}"?${aviso} Dá para desarquivar depois.`, () => trocarArquivada(a), 'Arquivar')
  }

  const baixarModelo = async () => {
    try {
      const bytes = await gerarModelo(calendario)
      const link = document.createElement('a')
      link.href = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
      link.download = 'cronograma-modelo.xlsx'
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (_) {
      setErroArquivo('Não consegui gerar a planilha modelo. Tente de novo.')
    }
  }
  // Lê o arquivo escolhido aqui mesmo, no navegador; só abre a conferência se a estrutura estiver certa.
  const escolherArquivo = async (e) => {
    const arquivo = e.target.files[0]
    e.target.value = ''
    if (!arquivo) return
    setErroArquivo('')
    setLendo(true)
    try {
      const { linhas, erro } = linhasDaPlanilha(await lerPlanilha(arquivo))
      if (erro) setErroArquivo(erro)
      else setImportando({ nome: arquivo.name, linhas })
    } catch (erro) {
      setErroArquivo(erro.message || 'Não consegui ler a planilha. Tente de novo.')
    }
    setLendo(false)
  }

  const botoesPlanilha = (
    <>
      <button type="button" className="btn secondary" onClick={baixarModelo}>BAIXAR PLANILHA MODELO</button>
      {podeImportar && <button type="button" className="btn secondary" disabled={lendo} onClick={() => seletor.current.click()}>{lendo ? 'LENDO…' : 'IMPORTAR PLANILHA'}</button>}
      {podeImportar && <input ref={seletor} type="file" accept=".xlsx,.csv" className="sr-only" tabIndex={-1} aria-label="Escolher planilha .xlsx ou .csv" onChange={escolherArquivo} />}
    </>
  )

  const vazio = todas.length === 0
    ? (
      <Vazio icone="frentes" titulo="Nenhuma atividade ainda" texto="A EAP é a base do planejamento: crie a primeira atividade da reforma. As outras abas usam esta mesma lista.">
        <button type="button" className="btn" onClick={() => setForm({})}><Icone nome="plus" />Criar primeira atividade</button>
        <div className="eap-barra centro">{botoesPlanilha}</div>
      </Vazio>
    )
    : null

  return (
    <>
      {caixa}
      <Estado vazio={vazio}>
        <div className="contadores">
          <div className="cont"><b>{vivas.length}</b>atividades</div>
          <div className="cont"><b>{emAndamento}</b>em andamento</div>
          <div className="cont"><b>{concluidas}</b>concluídas</div>
        </div>
        <div className="eap-barra">
          <button type="button" className="btn" onClick={() => setForm({})}><Icone nome="plus" />Nova atividade</button>
          {botoesPlanilha}
          {qtdArquivadas > 0 && (
            <label className="eap-check">
              <input type="checkbox" checked={verArquivadas} onChange={(e) => setVerArquivadas(e.target.checked)} />
              Mostrar arquivadas ({qtdArquivadas})
            </label>
          )}
        </div>
        <ul className="eap-lista">
          {visiveis.map((a) => (
            <LinhaEap
              key={a.id} a={a} atividades={atividades} calendario={calendario} restricoes={abertasPorAtividade.get(a.id) || 0}
              onEditar={(x) => setForm({ atividade: x })} onSub={(x) => setForm({ paiInicial: x.id })} onArquivar={arquivar}
            />
          ))}
        </ul>
      </Estado>
      {erroArquivo && (
        <div className="card imp-erro-arquivo" role="alert">
          <b>Não consegui usar a planilha.</b> {erroArquivo}
          <button type="button" className="btn secondary" onClick={() => setErroArquivo('')}>Fechar aviso</button>
        </div>
      )}
      {importando && (
        <Importacao
          nomeArquivo={importando.nome} linhasIniciais={importando.linhas} avisar={avisar}
          onFechar={() => setImportando(null)}
        />
      )}
      {form && <FormAtividade atividade={form.atividade} paiInicial={form.paiInicial} onSalvar={salvar} onFechar={() => setForm(null)} />}
    </>
  )
}
