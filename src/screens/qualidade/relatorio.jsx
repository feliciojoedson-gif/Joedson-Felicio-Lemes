import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Chip } from '../../components/index.jsx'
import { useQualidade } from '../../lib/QualidadeContext.jsx'
import { formatarData } from '../../lib/regras.js'
import {
  carimbo, classeDoDesperdicio, diasDeAtraso, montarRelatorio, STATUS_NC, STATUS_PENDENCIA, TOM_SEVERIDADE, tomConformidade, vencida,
} from '../../lib/qualidade.js'
import { Kpi } from './ui.jsx'

const pct = (n) => (n === null ? '—' : `${n}%`)
const dias = (n) => (n === 1 ? '1 dia' : `${n} dias`)
const COR = { ok: 'var(--ok)', warn: 'var(--warn)', bad: 'var(--bad)', neutro: 'var(--slate)' }

function Registro({ p, hoje }) {
  const st = STATUS_PENDENCIA[p.status]
  const atraso = diasDeAtraso(p, hoje)
  const linhas = p.observacoes ? p.observacoes.split('\n') : []
  const dado = (rotulo, valor) => <div><dt>{rotulo}</dt><dd>{valor || '—'}</dd></div>
  return (
    <article className="q-rel-registro">
      <div className="q-rel-fotos">
        {p.foto ? <img src={p.foto} alt={`Foto da pendência ${p.numeroRegistro}`} /> : <div className="q-rel-sem-foto">Sem foto</div>}
        {p.fotoEvidencia && <img src={p.fotoEvidencia} alt="Foto da correção" />}
      </div>
      <div className="q-rel-corpo">
        <dl className="q-rel-dados">
          {dado('Nº', `#${p.numeroRegistro}`)}
          <div><dt>Status</dt><dd><Chip tom={st.tom}>{st.rotulo}</Chip>{vencida(p, hoje) && <> <span className="q-selo solto">VENCIDO há {dias(atraso)}</span></>}</dd></div>
          {dado('Data da vistoria', formatarData(p.dataVistoria))}
          {dado('Vistoriado por', p.vistoriadoPor)}
          {dado('Responsável', p.responsavel)}
          {dado('Prazo', formatarData(p.prazo))}
          {dado('Local', [p.local, p.pavimento].filter(Boolean).join(' · '))}
          {dado('Empresa', p.empresa)}
          {p.dataResolucao && dado('Resolvido em', formatarData(p.dataResolucao))}
        </dl>
        <p className="q-rel-descricao">{p.descricao}</p>
        {linhas.length > 0 && (
          <div className="q-rel-obs"><b>Observações</b><ul>{linhas.map((l, i) => <li key={`${i}-${l}`}>{l}</li>)}</ul></div>
        )}
      </div>
    </article>
  )
}

// Visão de impressão: a tela desenha um papel A4 e o botão chama window.print(). Respeita os filtros ativos nas abas.
// Vai para o <body> (portal) e, ao imprimir, o CSS esconde o app inteiro: só o relatório sai no papel.
export default function Relatorio({ onFechar }) {
  const q = useQualidade()
  const r = montarRelatorio({
    pendencias: q.pendencias, filtrosPend: q.filtrosPend, vistorias: q.vistorias, ncs: q.ncs, filtroNc: q.filtroNc,
    gemba: q.gemba, filtrosGemba: q.filtrosGemba, hoje: q.hoje,
  })
  const [dataGerado, horaGerada] = carimbo().split(' ')

  useEffect(() => {
    document.body.classList.add('q-imprimindo')
    const aoTeclar = (e) => e.key === 'Escape' && onFechar()
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.body.classList.remove('q-imprimindo')
      document.removeEventListener('keydown', aoTeclar)
    }
  }, [onFechar])

  return createPortal(
    <div className="q-relatorio" role="dialog" aria-modal="true" aria-label="Relatório de qualidade">
      <div className="q-rel-barra no-print">
        <button type="button" className="btn" autoFocus onClick={() => window.print()}>Imprimir / Salvar PDF</button>
        <button type="button" className="btn secondary" onClick={onFechar}>Fechar</button>
      </div>

      <div className="q-rel-pagina">
        <header className="q-rel-cabecalho">
          <div className="q-rel-logo">KAEFER<span> Rip</span></div>
          <h1>RELATÓRIO DE QUALIDADE</h1>
          <div className="q-rel-obra">{q.obra.codigo} — {q.obra.nome}</div>
          <div>{formatarData(q.hoje)}</div>
          <div className="q-rel-filtros">
            {r.filtros.length === 0 ? 'Filtros aplicados: nenhum' : <>Filtros aplicados: {r.filtros.join(' · ')}</>}
          </div>
        </header>

        <section className="q-rel-bloco">
          <h2>Pendências</h2>
          <div className="q-kpis q-rel-kpis">
            <Kpi rotulo="Total" valor={r.kpis.total} cor="var(--slate)" />
            <Kpi rotulo="Pendentes" valor={r.kpis.pendente} cor="var(--bad)" />
            <Kpi rotulo="Em andamento" valor={r.kpis.em_andamento} cor="var(--warn)" />
            <Kpi rotulo="Resolvidos" valor={r.kpis.resolvido} cor="var(--ok)" />
          </div>
          <h3>Pendentes por responsável</h3>
          {r.porResponsavel.length === 0
            ? <p>Nada em aberto.</p>
            : <div className="q-badges q-rel-badges">{r.porResponsavel.map((x) => <span key={x.nome} className="q-badge"><b>{x.qtd}</b>{x.nome}</span>)}</div>}
          <h3>Registros</h3>
          {r.pendencias.length === 0
            ? <p>Nenhuma pendência para os filtros aplicados.</p>
            : r.pendencias.map((p) => <Registro key={p.id} p={p} hoje={q.hoje} />)}
        </section>

        <section className="q-rel-bloco">
          <h2>FVS — Ficha de Verificação de Serviço</h2>
          <div className="q-kpis tres q-rel-kpis">
            <Kpi rotulo="Conforme (geral)" valor={pct(r.kpisFvs.conformidade)} cor={COR[tomConformidade(r.kpisFvs.conformidade)]} />
            <Kpi rotulo="NCs abertas" valor={r.kpisFvs.ncsAbertas} cor={r.kpisFvs.ncsAbertas ? 'var(--bad)' : 'var(--ok)'} />
            <Kpi rotulo="Vistorias concluídas" valor={r.kpisFvs.concluidas} cor="var(--slate)" />
          </div>
          <h3>Andamento das vistorias</h3>
          {r.vistorias.length === 0 ? <p>Nenhuma vistoria nesta obra.</p> : (
            <table className="q-tabela">
              <thead><tr><th>Modelo / ambiente</th><th>OK</th><th>NC</th><th>% conforme</th><th>Status</th></tr></thead>
              <tbody>
                {r.vistorias.map(({ v, p }) => (
                  <tr key={v.id}>
                    <td><b>{v.modeloCodigo}</b> {v.modeloNome}<br />{v.ambiente}</td>
                    <td>{p.ok}</td><td>{p.nc}</td><td>{pct(p.conformidade)}</td>
                    <td>{v.status === 'concluida' ? '✓ Concluída' : `Em andamento (${p.verificados}/${p.total})`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <h3>Não conformidades</h3>
          {r.ncs.length === 0 ? <p>Nenhuma não conformidade para os filtros aplicados.</p> : (
            <table className="q-tabela">
              <thead><tr><th>Código</th><th>Título</th><th>Severidade</th><th>Status</th><th>Responsável</th><th>Dias em aberto</th></tr></thead>
              <tbody>
                {r.ncs.map((n) => (
                  <tr key={n.id}>
                    <td><b>{n.codigo}</b></td>
                    <td>{n.titulo}<br /><small>{n.ambiente}</small></td>
                    <td><Chip tom={TOM_SEVERIDADE[n.severidade]}>{n.severidade}</Chip></td>
                    <td><Chip tom={STATUS_NC[n.status].tom}>{STATUS_NC[n.status].rotulo}</Chip></td>
                    <td>{n.responsavel}</td>
                    <td>{n.status === 'fechada' ? `${dias(n.dias)} (fechada)` : dias(n.dias)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="q-rel-bloco">
          <h2>Gemba Walk — desperdícios</h2>
          <h3>Ranking de desperdícios</h3>
          {r.ranking.length === 0 ? <p>Nenhum desperdício para os filtros aplicados.</p> : (
            <ol className="q-ranking">
              {r.ranking.map((x) => (
                <li key={x.nome}>
                  <span className="q-rank-nome">{x.nome}</span>
                  <span className="q-rank-barra"><i className={classeDoDesperdicio(x.nome)} style={{ width: `${(x.qtd / r.ranking[0].qtd) * 100}%` }} /></span>
                  <b>{x.qtd}</b>
                </li>
              ))}
            </ol>
          )}
          <h3>Observações em aberto</h3>
          {r.gembaAbertas.length === 0 ? <p>Nenhuma observação em aberto.</p> : (
            <table className="q-tabela">
              <thead><tr><th>Local / descrição</th><th>Desperdícios</th><th>Ação</th><th>Responsável</th><th>Prazo</th></tr></thead>
              <tbody>
                {r.gembaAbertas.map((o) => (
                  <tr key={o.id}>
                    <td><b>{o.local}</b><br />{o.descricao}</td>
                    <td>{o.desperdicios.map((d) => <span key={d} className={`q-tag-d ${classeDoDesperdicio(d)}`}>{d}</span>)}</td>
                    <td>{o.acao}</td>
                    <td>{o.responsavel}</td>
                    <td>{o.prazo ? <>{formatarData(o.prazo)}{vencida(o, q.hoje) && <> <span className="q-selo solto">VENCIDO</span></>}</> : 'Sem prazo'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <footer className="q-rel-rodape">Relatório gerado automaticamente em {dataGerado} às {horaGerada}</footer>
      </div>
    </div>,
    document.body,
  )
}
