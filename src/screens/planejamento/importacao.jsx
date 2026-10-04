import { useMemo, useState } from 'react'
import { Chip } from '../../components/index.jsx'
import { usePlanejamento } from '../../lib/PlanejamentoContext.jsx'
import { analisarLinhas, formatarDataBr, LIMITE_LINHAS_VISIVEIS, montarAtividades } from '../../lib/importacao.js'
import { textoDiasUteis } from '../../lib/planejamento.js'
import { Folha, useConfirmar } from './ui.jsx'

// Campos de uma linha com erro: a pessoa corrige aqui, a análise roda de novo a cada letra.
function LinhaComErro({ it, onMudar, onRemover }) {
  const id = `imp-${it.chave}`
  return (
    <li className="imp-linha erro">
      <div className="imp-topo">
        <span className="eap-cod mono">linha {it.linhaOrigem}</span>
        <button type="button" className="btn secondary" onClick={() => onRemover(it)}>Remover linha</button>
      </div>
      <div className="imp-campos">
        <div className="field">
          <label htmlFor={`${id}-cod`}>Código</label>
          <input id={`${id}-cod`} className="input" value={it.codigo} onChange={(e) => onMudar(it.chave, { codigo: e.target.value })} />
          {it.erros.codigo && <div className="erro" role="alert">{it.erros.codigo}</div>}
        </div>
        <div className="field">
          <label htmlFor={`${id}-tit`}>Atividade</label>
          <input id={`${id}-tit`} className="input" maxLength={80} value={it.titulo} onChange={(e) => onMudar(it.chave, { titulo: e.target.value })} />
          {it.erros.titulo && <div className="erro" role="alert">{it.erros.titulo}</div>}
        </div>
        <div className="field">
          <label htmlFor={`${id}-ini`}>Início</label>
          <input id={`${id}-ini`} className="input" type="date" value={it.isoInicio || ''} onChange={(e) => onMudar(it.chave, { inicio: formatarDataBr(e.target.value) })} />
          {it.erros.inicio && <div className="erro" role="alert">{it.erros.inicio}{it.inicio ? ` Veio: "${it.inicio}".` : ''}</div>}
        </div>
        <div className="field">
          <label htmlFor={`${id}-fim`}>Término</label>
          <input id={`${id}-fim`} className="input" type="date" value={it.isoFim || ''} onChange={(e) => onMudar(it.chave, { termino: formatarDataBr(e.target.value) })} />
          {it.erros.termino && <div className="erro" role="alert">{it.erros.termino}{it.erros.termino.startsWith('Data') && it.termino ? ` Veio: "${it.termino}".` : ''}</div>}
        </div>
      </div>
      {(it.erros.inicioReal || it.erros.fimReal) && (
        <div className="imp-campos reais">
          <div className="field">
            <label htmlFor={`${id}-ireal`}>Início real</label>
            <input id={`${id}-ireal`} className="input" type="date" value={it.isoInicioReal || ''} onChange={(e) => onMudar(it.chave, { inicioReal: formatarDataBr(e.target.value) })} />
            {it.erros.inicioReal && <div className="erro" role="alert">{it.erros.inicioReal}{it.inicioReal ? ` Veio: "${it.inicioReal}".` : ''}</div>}
          </div>
          <div className="field">
            <label htmlFor={`${id}-freal`}>Término real</label>
            <input id={`${id}-freal`} className="input" type="date" value={it.isoFimReal || ''} onChange={(e) => onMudar(it.chave, { fimReal: formatarDataBr(e.target.value) })} />
            {it.erros.fimReal && <div className="erro" role="alert">{it.erros.fimReal}{it.erros.fimReal.startsWith('Término real inválido') && it.fimReal ? ` Veio: "${it.fimReal}".` : ''}</div>}
          </div>
        </div>
      )}
    </li>
  )
}

function LinhaCerta({ it }) {
  return (
    <li className={`imp-linha n${Math.min(it.nivel, 4)}`}>
      <div className="eap-topo">
        <span className="eap-cod mono">{it.cod}</span>
        <span className="eap-tit">{it.titulo}</span>
      </div>
      <div className="eap-meta mono">
        {formatarDataBr(it.isoInicio)} → {formatarDataBr(it.isoFim)} · {textoDiasUteis(it.duracaoUteis)}
        {(it.isoInicioReal || it.isoFimReal) && <> · real: {formatarDataBr(it.isoInicioReal) || '—'} → {formatarDataBr(it.isoFimReal) || 'em andamento'}</>}
        {it.duracao && !/^\d+ ?(dias?)?$/i.test(it.duracao) ? '' : ''}
      </div>
    </li>
  )
}

// Tela de conferência: mostra a árvore interpretada e os erros. Nada é criado até "Confirmar importação".
export default function Importacao({ nomeArquivo, linhasIniciais, avisar, onFechar }) {
  const { atividades, calendario, importarAtividades } = usePlanejamento()
  const [linhas, setLinhas] = useState(linhasIniciais)
  const [modo, setModo] = useState('adicionar')
  const [soErros, setSoErros] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erroSalvar, setErroSalvar] = useState('')
  const { pedir, caixa } = useConfirmar()

  const analise = useMemo(() => analisarLinhas(linhas, calendario), [linhas, calendario])
  const { itens, totalErros } = analise
  const certas = itens.filter((i) => !i.temErro)
  const existentes = atividades.length

  const mudar = (chave, campos) => setLinhas((l) => l.map((x) => (x.chave === chave ? { ...x, ...campos } : x)))
  const remover = (it) => {
    pedir(`Remover a linha ${it.linhaOrigem} da importação? Ela não será criada.`, () => setLinhas((l) => l.filter((x) => x.chave !== it.chave)), 'Remover linha')
  }
  const executar = async () => {
    setErroSalvar('')
    setSalvando(true)
    const modoFinal = existentes ? modo : 'substituir'
    const erro = await importarAtividades(montarAtividades(itens, modoFinal, atividades), modoFinal)
    setSalvando(false)
    if (erro) return setErroSalvar(erro)
    avisar(`${itens.length} atividades importadas.`)
    onFechar(true)
  }
  const confirmar = () => {
    if (totalErros || !itens.length || salvando) return
    if (modo === 'substituir' && existentes) {
      pedir(`Substituir? As ${existentes} atividades atuais da EAP serão apagadas e trocadas pelas ${itens.length} da planilha.`, executar, 'Substituir')
    } else executar()
  }

  // Linhas com erro aparecem sempre; das certas, só as primeiras (todas serão importadas).
  const mostradasCertas = soErros ? [] : certas.slice(0, LIMITE_LINHAS_VISIVEIS)
  const mostradas = itens.filter((i) => i.temErro || mostradasCertas.includes(i))

  return (
    <>
    <Folha titulo="Conferir importação" sujo larga onFechar={() => onFechar(false)}>
      {(fechar) => (
        <>
          <p className="mono">{nomeArquivo}</p>
          <div className="imp-resumo">
            <Chip tom="neutral">{itens.length} atividades</Chip>
            {totalErros > 0 ? <Chip tom="bad">{totalErros} com erro</Chip> : itens.length > 0 && <Chip tom="ok">Tudo certo</Chip>}
          </div>
          {totalErros > 0 && (
            <div className="imp-aviso" role="alert">
              Corrija as linhas em vermelho (ou remova-as) para poder importar. Nada foi criado ainda.
              <label className="eap-check">
                <input type="checkbox" checked={soErros} onChange={(e) => setSoErros(e.target.checked)} />
                Mostrar só as linhas com erro
              </label>
            </div>
          )}
          <p className="mono">Os códigos da EAP são recalculados pela ordem: se faltar um número na sequência, os seguintes sobem.</p>

          {itens.length === 0 && <p className="mono">Não sobrou nenhuma linha para importar.</p>}
          <ul className="imp-lista">
            {mostradas.map((it) => (it.temErro
              ? <LinhaComErro key={it.chave} it={it} onMudar={mudar} onRemover={remover} />
              : <LinhaCerta key={it.chave} it={it} />))}
          </ul>
          {!soErros && certas.length > mostradasCertas.length && (
            <p className="mono">Mostrando as primeiras {LIMITE_LINHAS_VISIVEIS} das {certas.length} linhas certas. Todas serão importadas.</p>
          )}

          {existentes > 0 && (
            <div className="field" style={{ marginTop: 16 }}>
              <span className="lb">A EAP já tem {existentes} atividades. O que fazer?</span>
              <div className="chips">
                <button type="button" className={modo === 'adicionar' ? 'on' : ''} aria-pressed={modo === 'adicionar'} onClick={() => setModo('adicionar')}>Adicionar às existentes</button>
                <button type="button" className={modo === 'substituir' ? 'on' : ''} aria-pressed={modo === 'substituir'} onClick={() => setModo('substituir')}>Substituir tudo</button>
              </div>
            </div>
          )}
          {erroSalvar && <div className="imp-aviso" role="alert">{erroSalvar}</div>}
          <div className="form-actions">
            <button type="button" className="btn" disabled={totalErros > 0 || itens.length === 0 || salvando} onClick={confirmar}>
              {salvando ? 'Importando…' : 'Confirmar importação'}
            </button>
            <button type="button" className="btn secondary" onClick={fechar}>Cancelar</button>
          </div>
        </>
      )}
    </Folha>
    {caixa}
    </>
  )
}
