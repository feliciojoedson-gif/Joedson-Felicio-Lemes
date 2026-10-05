import { useState } from 'react'
import { Chip, Icone, Vazio } from '../../components/index.jsx'
import { useDados } from '../../lib/DadosContext.jsx'
import { useQualidade } from '../../lib/QualidadeContext.jsx'
import { pode } from '../../lib/regras.js'
import { CATEGORIAS_FVS, contarItensDoModelo, errosModelo } from '../../lib/qualidade.js'
import { Aviso, Folha, useAvisos, useConfirmar } from '../planejamento/ui.jsx'

const chave = () => crypto.randomUUID()
const itemVazio = () => ({ id: `novo-${chave()}`, titulo: '' })
const grupoVazio = () => ({ chave: chave(), nome: '', itens: [itemVazio()] })

// Criar ou editar um modelo: grupos e itens são listas que a pessoa monta no próprio formulário.
function FormModelo({ modelo, codigosEmUso, onSalvar, onFechar }) {
  const [c, setC] = useState(() => modelo
    ? { codigo: modelo.codigo, nome: modelo.nome, categoria: modelo.categoria, grupos: modelo.grupos.map((g) => ({ chave: chave(), nome: g.nome, itens: g.itens.map((i) => ({ ...i })) })) }
    : { codigo: '', nome: '', categoria: '', grupos: [grupoVazio()] })
  const erros = errosModelo(c, codigosEmUso)
  const { aviso, tocar, tentar } = useAvisos(erros)
  const campo = (k) => (e) => setC((x) => ({ ...x, [k]: e.target.value }))
  const mudaGrupo = (gi, fn) => setC((x) => ({ ...x, grupos: x.grupos.map((g, i) => (i === gi ? fn(g) : g)) }))
  const sujo = !modelo ? Boolean(c.codigo || c.nome || c.categoria || c.grupos.some((g) => g.nome || g.itens.some((i) => i.titulo))) : true

  return (
    <Folha titulo={modelo ? `Editar ${modelo.codigo}` : 'Novo modelo de FVS'} sujo={sujo} larga onFechar={onFechar}>
      {(fechar) => (
        <>
          <div className="field">
            <label htmlFor="md-codigo">Código</label>
            <input id="md-codigo" className="input" maxLength={12} placeholder="FVS-03" value={c.codigo} onChange={campo('codigo')} onBlur={() => tocar('codigo')} />
            <Aviso texto={aviso('codigo')} />
          </div>
          <div className="field">
            <label htmlFor="md-nome">Nome do serviço</label>
            <input id="md-nome" className="input" maxLength={80} value={c.nome} onChange={campo('nome')} onBlur={() => tocar('nome')} />
            <Aviso texto={aviso('nome')} />
          </div>
          <div className="field">
            <label htmlFor="md-categoria">Categoria</label>
            <select id="md-categoria" className="select" value={c.categoria} onChange={campo('categoria')} onBlur={() => tocar('categoria')}>
              <option value="">Escolha a categoria</option>
              {CATEGORIAS_FVS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
            <Aviso texto={aviso('categoria')} />
          </div>

          <h3 className="section-title">Grupos e itens</h3>
          {c.grupos.map((g, gi) => (
            <div key={g.chave} className="q-grupo-form">
              <div className="q-linha">
                <input className="input" aria-label={`Nome do grupo ${gi + 1}`} maxLength={60} placeholder={`Grupo ${gi + 1} (ex.: Execução)`} value={g.nome} onChange={(e) => mudaGrupo(gi, (x) => ({ ...x, nome: e.target.value }))} />
                <button type="button" className="btn secondary q-x" aria-label={`Remover o grupo ${gi + 1}`} onClick={() => setC((x) => ({ ...x, grupos: x.grupos.filter((_, i) => i !== gi) }))}>×</button>
              </div>
              {g.itens.map((it, ii) => (
                <div key={it.id} className="q-linha">
                  <span className="q-ordem">{gi + 1}.{ii + 1}</span>
                  <input className="input" aria-label={`Título do item ${gi + 1}.${ii + 1}`} maxLength={120} placeholder="O que verificar" value={it.titulo} onChange={(e) => mudaGrupo(gi, (x) => ({ ...x, itens: x.itens.map((y, j) => (j === ii ? { ...y, titulo: e.target.value } : y)) }))} />
                  <button type="button" className="btn secondary q-x" aria-label={`Remover o item ${gi + 1}.${ii + 1}`} onClick={() => mudaGrupo(gi, (x) => ({ ...x, itens: x.itens.filter((_, j) => j !== ii) }))}>×</button>
                </div>
              ))}
              <button type="button" className="btn secondary" onClick={() => mudaGrupo(gi, (x) => ({ ...x, itens: [...x.itens, itemVazio()] }))}><Icone nome="plus" />Adicionar item</button>
            </div>
          ))}
          <Aviso texto={aviso('grupos')} />
          <button type="button" className="btn secondary block" onClick={() => setC((x) => ({ ...x, grupos: [...x.grupos, grupoVazio()] }))}><Icone nome="plus" />Adicionar grupo</button>
          {modelo && <p className="mono">Ao salvar, a versão sobe para v{modelo.versao + 1}. As vistorias já feitas não mudam.</p>}
          <div className="form-actions">
            <button type="button" className="btn" onClick={() => tentar() && onSalvar(c)}>Salvar modelo</button>
            <button type="button" className="btn secondary" onClick={fechar}>Cancelar</button>
          </div>
        </>
      )}
    </Folha>
  )
}

export default function Modelos({ avisar }) {
  const q = useQualidade()
  const { usuario } = useDados()
  const podeGerir = pode(usuario.role, 'gerirQualidade')
  const [form, setForm] = useState(null) // null | { modelo? }
  const { pedir, caixa } = useConfirmar()
  const salvar = (campos) => {
    const id = form.modelo?.id
    setForm(null)
    q.salvarModelo(campos, id).then((e) => e && avisar(e))
    avisar('Modelo salvo')
  }
  const excluir = (m) => pedir(`Excluir o modelo ${m.codigo}? As vistorias já feitas continuam como estão.`, () => {
    q.excluirModelo(m.id).then((e) => e && avisar(e))
    avisar('Modelo excluído')
  }, 'Excluir')
  const botaoNovo = podeGerir && <button type="button" className="btn" onClick={() => setForm({})}><Icone nome="plus" />Novo modelo</button>

  return (
    <>
      {q.modelos.length === 0 ? (
        <Vazio icone="qualidade" titulo="Nenhum modelo de FVS" texto="Um modelo é o checklist de um serviço, com grupos e itens. Crie o primeiro para começar as vistorias.">{botaoNovo}</Vazio>
      ) : (
        <>
          <div className="q-barra-acao">{botaoNovo}</div>
          <div className="q-grid">
            {q.modelos.map((m) => (
              <div key={m.id} className="q-card q-modelo">
                <div className="q-card-topo"><b className="q-num">{m.codigo}</b><Chip tom="neutral">v{m.versao}</Chip></div>
                <div className="q-desc">{m.nome}</div>
                <div className="q-meta"><span>{m.categoria}</span><span>{m.grupos.length} grupos · {contarItensDoModelo(m)} itens</span></div>
                {podeGerir && (
                  <div className="q-foto-botoes">
                    <button type="button" className="btn secondary" onClick={() => setForm({ modelo: m })}>Editar</button>
                    <button type="button" className="btn secondary q-excluir-inline" onClick={() => excluir(m)}>Excluir</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
      {form && (
        <FormModelo
          key={form.modelo?.id || 'novo'} modelo={form.modelo}
          codigosEmUso={q.modelos.filter((m) => m.id !== form.modelo?.id).map((m) => m.codigo)}
          onSalvar={salvar} onFechar={() => setForm(null)}
        />
      )}
      {caixa}
    </>
  )
}
