import { useEffect, useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import { Topo, Vazio } from '../components/index.jsx'
import { useDados } from '../lib/DadosContext.jsx'
import { carregarRelatorio } from '../lib/dados.js'
import {
  aplicarFiltros, avisosDosFiltros, descricaoDosFiltros, empresasPresentes, executivo, FILTROS_INICIAIS, financeiro, intervaloDoPeriodo,
  materiais, modulosDisponiveis, PERIODOS, qualidade, ritmo, rodapeDeImpressao,
} from '../lib/biData.js'
import { formatarData } from '../lib/regras.js'
import Executivo from './relatorios/executivo.jsx'
import Financeiro from './relatorios/financeiro.jsx'
import Materiais from './relatorios/materiais.jsx'
import Qualidade from './relatorios/qualidade.jsx'
import Ritmo from './relatorios/ritmo.jsx'
import './relatorios/relatorios.css'

// Barra fixa no topo: vale para TODOS os painéis (empresa e período).
function BarraDeFiltros({ filtros, setFiltros, empresas }) {
  return (
    <div className="bi-filtros no-print" role="group" aria-label="Filtros dos relatórios">
      <div>
        <label className="rotulo" htmlFor="bi-empresa">Empresa / empreiteiro</label>
        <select id="bi-empresa" className="select" value={filtros.empresa} onChange={(e) => setFiltros((f) => ({ ...f, empresa: e.target.value }))}>
          <option value="">Todas as empresas</option>
          {empresas.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>
      <div>
        <span className="rotulo" id="bi-periodo">Período</span>
        <div className="chips" role="group" aria-labelledby="bi-periodo">
          {PERIODOS.map(([k, rotulo]) => (
            <button key={k} type="button" className={filtros.periodo === k ? 'on' : ''} aria-pressed={filtros.periodo === k} onClick={() => setFiltros((f) => ({ ...f, periodo: k }))}>{rotulo}</button>
          ))}
        </div>
      </div>
    </div>
  )
}

function Painel({ id, titulo, subtitulo, largo = false, children }) {
  return (
    <section className={`bi-painel${largo ? ' largo' : ''}`} aria-labelledby={`bi-${id}`}>
      <h2 id={`bi-${id}`}>{titulo}{subtitulo && <small>{subtitulo}</small>}</h2>
      {children}
    </section>
  )
}

export default function Relatorios({ goto }) {
  const { obra, hoje } = useDados()
  const [estado, setEstado] = useState({ status: 'carregando', fontes: null })
  const [rodada, setRodada] = useState(0)
  const [filtros, setFiltros] = useState(FILTROS_INICIAIS)
  const [geradoEm, setGeradoEm] = useState(() => new Date())

  useEffect(() => {
    let vivo = true
    carregarRelatorio(obra).then(({ data, erro }) => {
      if (!vivo) return
      setEstado(erro || !data ? { status: 'erro', fontes: null } : { status: 'pronto', fontes: data })
    }).catch(() => vivo && setEstado({ status: 'erro', fontes: null }))
    return () => { vivo = false }
  }, [obra, rodada])

  // O rodapé mostra a hora de quando o papel sai, também quando a pessoa imprime com Ctrl+P.
  useEffect(() => {
    const atualizar = () => flushSync(() => setGeradoEm(new Date()))
    window.addEventListener('beforeprint', atualizar)
    return () => window.removeEventListener('beforeprint', atualizar)
  }, [])

  const tentarDeNovo = () => {
    setEstado({ status: 'carregando', fontes: null })
    setRodada((n) => n + 1)
  }

  const fontes = estado.fontes
  const empresas = useMemo(() => (fontes ? empresasPresentes(fontes) : []), [fontes])
  const visao = useMemo(() => (fontes ? aplicarFiltros(fontes, filtros, hoje) : null), [fontes, filtros, hoje])
  const intervalo = intervaloDoPeriodo(filtros.periodo, hoje)
  const exec = useMemo(() => (visao ? executivo(visao, hoje, obra, intervalo) : null), [visao, hoje, obra, intervalo?.de, intervalo?.ate])
  const rit = useMemo(() => (visao ? ritmo(visao, hoje, intervalo) : null), [visao, hoje, intervalo?.de, intervalo?.ate])
  const fin = useMemo(() => (visao ? financeiro(visao) : null), [visao])
  const mat = useMemo(() => (visao ? materiais(visao, hoje, visao.catalogo) : null), [visao, hoje])
  const qual = useMemo(() => (visao ? qualidade(visao) : null), [visao])

  const cabecalho = (botao) => (
    <div className="no-print">
      <Topo titulo="Relatórios" subtitulo={`${obra.codigo} — ${obra.nome}`}>{botao}</Topo>
    </div>
  )

  if (estado.status === 'carregando') return <>{cabecalho()}<p className="mono" role="status">Carregando os relatórios…</p></>
  if (estado.status === 'erro') {
    return (
      <>
        {cabecalho()}
        <Vazio icone="relatorios" titulo="Não consegui carregar os relatórios" texto="Algo falhou ao buscar os dados da obra. Seus dados não foram alterados.">
          <button type="button" className="btn" onClick={tentarDeNovo}>Tentar de novo</button>
        </Vazio>
      </>
    )
  }

  const modulos = modulosDisponiveis(fontes)
  if (!Object.values(modulos).some(Boolean)) {
    return (
      <>
        {cabecalho()}
        <Vazio icone="relatorios" titulo="Ainda não há o que mostrar" texto="Os relatórios nascem dos registros da obra. Faça o primeiro registro no Diário de Obra e volte aqui.">
          <button type="button" className="btn" onClick={() => goto('rdo')}>Registrar o 1º dia no Diário de Obra</button>
        </Vazio>
      </>
    )
  }

  const imprimir = () => {
    flushSync(() => setGeradoEm(new Date()))
    window.print()
  }
  const avisos = avisosDosFiltros(filtros)
  return (
    <div className="bi">
      {cabecalho(<button type="button" className="btn" onClick={imprimir}>Imprimir relatório executivo</button>)}
      <header className="bi-print-cab">
        <div className="empresa">KAEFER RIP</div>
        <h1>Relatório executivo da reforma</h1>
        <p><b>{obra.nome}</b> ({obra.codigo}) · {formatarData(hoje)}</p>
        <p>{descricaoDosFiltros(filtros)}</p>
      </header>
      <BarraDeFiltros filtros={filtros} setFiltros={setFiltros} empresas={empresas} />
      {fontes.falhas.length > 0 && (
        <div className="bi-aviso no-print" role="alert">
          <span>Não consegui ler: {fontes.falhas.join(', ')}. Os outros painéis seguem normais.</span>
          <button type="button" className="btn secondary" onClick={tentarDeNovo}>Tentar de novo</button>
        </div>
      )}
      {avisos.map((a) => <p key={a} className="bi-nota no-print">{a}</p>)}
      <div className="bi-paineis">
        <Painel id="executivo" titulo="Executivo" subtitulo="a saúde da reforma hoje" largo>
          <Executivo dados={exec} modulos={modulos} />
        </Painel>
        <Painel id="ritmo" titulo="Ritmo & Produção" subtitulo="planejamento e diário de obra">
          <Ritmo dados={rit} modulos={modulos} />
        </Painel>
        <Painel id="financeiro" titulo="Contratos & Medições" subtitulo="financeiro">
          <Financeiro dados={fin} modulos={modulos} />
        </Painel>
        <Painel id="materiais" titulo="Materiais" subtitulo="pedidos e prazos de entrega">
          <Materiais dados={mat} modulos={modulos} />
        </Painel>
        <Painel id="qualidade" titulo="Qualidade & Entrega" subtitulo="pendências, FVS e Gemba">
          <Qualidade dados={qual} modulos={modulos} />
        </Painel>
      </div>
      <footer className="bi-print-rodape">{rodapeDeImpressao(geradoEm)}</footer>
    </div>
  )
}
