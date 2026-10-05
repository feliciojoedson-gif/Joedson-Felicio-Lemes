import { useState } from 'react'
import { useDados } from '../lib/DadosContext.jsx'
import {
  atualizarFrente, atualizarObra, atualizarPerfil, criarFrente, criarMedicaoDaFrente, criarObra, criarRestricaoCadastro, definirObrasDoPerfil,
  excluirFrente, liberarConta,
} from '../lib/dados.js'
import { errosFrente, errosLiberacao, errosMedicaoDaFrente, errosObra, errosRestricaoDaObra, PERFIS_LIBERAVEIS, tiposQueUmPerfilCria } from '../lib/cadastros.js'
import { CRITICIDADES, DISCIPLINAS, pode, STATUS_OBRA, veTodasAsObras } from '../lib/regras.js'
import { Aviso, Folha, useAvisos, useConfirmar } from './planejamento/ui.jsx'

// Formulários de cadastro (frente, restrição, medição, obra, acesso de pessoas). Cada um valida na hora com as regras de
// lib/cadastros.js, grava pela camada de dados e recarrega a base da obra. O erro do banco aparece em português dentro do painel.

const TEXTO_FALHA = 'Não consegui salvar. Verifique a conexão e tente de novo.'
const textoDoErro = (erro) => (erro?.regra ? erro.message : TEXTO_FALHA)

// Roda a gravação, mostra o erro no painel e, se deu certo, recarrega a base e fecha.
function useEnvio(onFechar, avisar, mensagemOk) {
  const { recarregar } = useDados()
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const enviar = async (operacao) => {
    setEnviando(true)
    setErro('')
    try {
      const { erro: falha } = await operacao()
      if (falha) { setErro(textoDoErro(falha)); setEnviando(false); return }
    } catch (_) {
      setErro(TEXTO_FALHA)
      setEnviando(false)
      return
    }
    recarregar()
    avisar(mensagemOk)
    onFechar()
  }
  return { erro, enviando, enviar }
}

function Campo({ id, rotulo, erro, children }) {
  return (
    <div className="field">
      <label htmlFor={id}>{rotulo}</label>
      {children}
      <Aviso texto={erro} />
    </div>
  )
}

const Opcoes = ({ lista, vazio }) => (
  <>
    {vazio && <option value="">{vazio}</option>}
    {lista.map((o) => (Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o} value={o}>{o}</option>))}
  </>
)

// Quem pode ser responsável: gente da equipe (cliente não responde por frente nem restrição).
const useResponsaveis = () => {
  const { perfis } = useDados()
  return perfis.filter((p) => p.role !== 'Cliente' && p.role !== 'Pendente').map((p) => [p.id, p.nome])
}

// ---------- Frente ----------

export function FormFrente({ frente, onFechar, avisar, onExcluida }) {
  const { obra, usuario } = useDados()
  const responsaveis = useResponsaveis()
  const [c, setC] = useState({
    nome: frente?.nome || '', disciplina: frente?.disciplina || '', local: frente?.local || '', responsavelId: frente?.responsavel_id || '',
    inicio: frente?.inicio_planejado || '', fim: frente?.fim_planejado || '', peso: String(frente?.peso ?? 1), ehMarco: frente?.eh_marco || false,
  })
  const campo = (k) => (v) => setC((x) => ({ ...x, [k]: v }))
  const erros = errosFrente(c)
  const { aviso, tocar, tentar } = useAvisos(erros)
  const { erro, enviando, enviar } = useEnvio(onFechar, avisar, frente ? 'Frente atualizada.' : 'Frente criada.')
  const { pedir, caixa } = useConfirmar()
  const salvar = () => tentar() && enviar(() => (frente ? atualizarFrente(obra, frente.id, c) : criarFrente(obra, c)))
  const excluir = () => pedir('Excluir esta frente? Isso não pode ser desfeito.', () => enviar(async () => {
    const r = await excluirFrente(obra, frente.id)
    if (!r.erro) onExcluida?.()
    return r
  }), 'Excluir')
  return (
    <Folha titulo={frente ? 'Editar frente' : 'Nova frente'} sujo={Boolean(c.nome)} onFechar={onFechar}>
      {(fechar) => (
        <>
          <Campo id="fr-nome" rotulo="Nome" erro={aviso('nome')}>
            <input id="fr-nome" className="input" maxLength={80} value={c.nome} onChange={(e) => campo('nome')(e.target.value)} onBlur={() => tocar('nome')} />
          </Campo>
          <Campo id="fr-disc" rotulo="Disciplina" erro={aviso('disciplina')}>
            <select id="fr-disc" className="input" value={c.disciplina} onChange={(e) => campo('disciplina')(e.target.value)} onBlur={() => tocar('disciplina')}>
              <Opcoes lista={DISCIPLINAS} vazio="Escolha…" />
            </select>
          </Campo>
          <Campo id="fr-local" rotulo="Local (opcional)">
            <input id="fr-local" className="input" maxLength={80} value={c.local} onChange={(e) => campo('local')(e.target.value)} />
          </Campo>
          <Campo id="fr-resp" rotulo="Responsável (opcional)">
            <select id="fr-resp" className="input" value={c.responsavelId} onChange={(e) => campo('responsavelId')(e.target.value ? Number(e.target.value) : '')}>
              <Opcoes lista={responsaveis} vazio="Sem responsável" />
            </select>
          </Campo>
          <Campo id="fr-ini" rotulo="Início planejado" erro={aviso('inicio')}>
            <input id="fr-ini" className="input" type="date" value={c.inicio} onChange={(e) => campo('inicio')(e.target.value)} onBlur={() => tocar('inicio')} />
          </Campo>
          <Campo id="fr-fim" rotulo="Fim planejado" erro={aviso('fim')}>
            <input id="fr-fim" className="input" type="date" value={c.fim} onChange={(e) => campo('fim')(e.target.value)} onBlur={() => tocar('fim')} />
          </Campo>
          <Campo id="fr-peso" rotulo="Peso na obra" erro={aviso('peso')}>
            <input id="fr-peso" className="input" inputMode="decimal" value={c.peso} onChange={(e) => campo('peso')(e.target.value)} onBlur={() => tocar('peso')} />
          </Campo>
          <div className="field">
            <label><input type="checkbox" checked={c.ehMarco} onChange={(e) => campo('ehMarco')(e.target.checked)} /> É um marco (acontece em um dia só)</label>
          </div>
          <Aviso texto={erro} />
          <div className="form-actions">
            <button type="button" className="btn" disabled={enviando} onClick={salvar}>{enviando ? 'Salvando…' : 'Salvar'}</button>
            <button type="button" className="btn secondary" onClick={fechar}>Cancelar</button>
          </div>
          {frente && pode(usuario.role, 'apagar') && (
            <button type="button" className="btn secondary block q-excluir" disabled={enviando} onClick={excluir}>Excluir frente</button>
          )}
          {caixa}
        </>
      )}
    </Folha>
  )
}

// ---------- Restrição ----------

export function FormRestricao({ frenteId, onFechar, avisar }) {
  const { obra, usuario, frentes } = useDados()
  const responsaveis = useResponsaveis()
  const tipos = tiposQueUmPerfilCria(usuario.role)
  const [c, setC] = useState({ tipo: tipos[0] || '', titulo: '', descricao: '', criticidade: 'Média', frenteId: frenteId || '', responsavelId: '', dataLimite: '', impacto: '' })
  const campo = (k) => (v) => setC((x) => ({ ...x, [k]: v }))
  const erros = errosRestricaoDaObra(c, tipos)
  const { aviso, tocar, tentar } = useAvisos(erros)
  const { erro, enviando, enviar } = useEnvio(onFechar, avisar, 'Restrição registrada.')
  return (
    <Folha titulo="Nova restrição" sujo={Boolean(c.titulo || c.descricao)} onFechar={onFechar}>
      {(fechar) => (
        <>
          <Campo id="rs-tipo" rotulo="Tipo" erro={aviso('tipo')}>
            <select id="rs-tipo" className="input" value={c.tipo} onChange={(e) => campo('tipo')(e.target.value)}><Opcoes lista={tipos} /></select>
          </Campo>
          <Campo id="rs-titulo" rotulo="Título" erro={aviso('titulo')}>
            <input id="rs-titulo" className="input" maxLength={100} value={c.titulo} onChange={(e) => campo('titulo')(e.target.value)} onBlur={() => tocar('titulo')} />
          </Campo>
          <Campo id="rs-desc" rotulo="Descrição (opcional)">
            <textarea id="rs-desc" rows={3} maxLength={400} value={c.descricao} onChange={(e) => campo('descricao')(e.target.value)} />
          </Campo>
          <Campo id="rs-crit" rotulo="Criticidade" erro={aviso('criticidade')}>
            <select id="rs-crit" className="input" value={c.criticidade} onChange={(e) => campo('criticidade')(e.target.value)}><Opcoes lista={CRITICIDADES} /></select>
          </Campo>
          <Campo id="rs-frente" rotulo="Frente (opcional)">
            <select id="rs-frente" className="input" value={c.frenteId} onChange={(e) => campo('frenteId')(e.target.value ? Number(e.target.value) : '')}>
              <Opcoes lista={frentes.map((f) => [f.id, f.nome])} vazio="Da obra toda" />
            </select>
          </Campo>
          <Campo id="rs-resp" rotulo="Responsável (opcional)">
            <select id="rs-resp" className="input" value={c.responsavelId} onChange={(e) => campo('responsavelId')(e.target.value ? Number(e.target.value) : '')}>
              <Opcoes lista={responsaveis} vazio="Sem responsável" />
            </select>
          </Campo>
          <Campo id="rs-data" rotulo="Decidir até (opcional)" erro={aviso('dataLimite')}>
            <input id="rs-data" className="input" type="date" value={c.dataLimite} onChange={(e) => campo('dataLimite')(e.target.value)} />
          </Campo>
          <Campo id="rs-imp" rotulo="Impacto no prazo, em dias (opcional)" erro={aviso('impacto')}>
            <input id="rs-imp" className="input" inputMode="numeric" maxLength={3} value={c.impacto} onChange={(e) => campo('impacto')(e.target.value.replace(/\D/g, ''))} />
          </Campo>
          <Aviso texto={erro} />
          <div className="form-actions">
            <button type="button" className="btn" disabled={enviando} onClick={() => tentar() && enviar(() => criarRestricaoCadastro(obra, usuario, c))}>{enviando ? 'Salvando…' : 'Registrar'}</button>
            <button type="button" className="btn secondary" onClick={fechar}>Cancelar</button>
          </div>
        </>
      )}
    </Folha>
  )
}

// ---------- Medição da frente ----------

export function FormMedicao({ frente, onFechar, avisar }) {
  const { obra, hoje } = useDados()
  const [c, setC] = useState({ mes: hoje.slice(0, 7), quantidade: '', unidade: '', percentual: '', valor: '', observacao: '' })
  const campo = (k) => (v) => setC((x) => ({ ...x, [k]: v }))
  const erros = errosMedicaoDaFrente(c)
  const { aviso, tocar, tentar } = useAvisos(erros)
  const { erro, enviando, enviar } = useEnvio(onFechar, avisar, 'Medição registrada.')
  const gravar = (enviarAgora) => tentar() && enviar(() => criarMedicaoDaFrente(obra, frente.id, { ...c, enviar: enviarAgora }))
  const numero = (k, rotulo, extra = {}) => (
    <Campo id={`md-${k}`} rotulo={rotulo} erro={aviso(k)}>
      <input id={`md-${k}`} className="input" inputMode="decimal" value={c[k]} onChange={(e) => campo(k)(e.target.value)} onBlur={() => tocar(k)} {...extra} />
    </Campo>
  )
  return (
    <Folha titulo={`Medir: ${frente.nome}`} sujo={Boolean(c.quantidade || c.valor || c.percentual)} onFechar={onFechar}>
      {(fechar) => (
        <>
          <Campo id="md-mes" rotulo="Mês da medição" erro={aviso('mes')}>
            <input id="md-mes" className="input" type="month" value={c.mes} onChange={(e) => campo('mes')(e.target.value)} onBlur={() => tocar('mes')} />
          </Campo>
          {numero('quantidade', 'Quantidade medida')}
          <Campo id="md-unidade" rotulo="Unidade" erro={aviso('unidade')}>
            <input id="md-unidade" className="input" maxLength={12} placeholder="m², m, un…" value={c.unidade} onChange={(e) => campo('unidade')(e.target.value)} onBlur={() => tocar('unidade')} />
          </Campo>
          {numero('percentual', 'Percentual medido (0 a 100)')}
          {numero('valor', 'Valor medido (R$)')}
          <Campo id="md-obs" rotulo="Observação (opcional)">
            <textarea id="md-obs" rows={2} maxLength={300} value={c.observacao} onChange={(e) => campo('observacao')(e.target.value)} />
          </Campo>
          <Aviso texto={erro} />
          <div className="form-actions">
            <button type="button" className="btn" disabled={enviando} onClick={() => gravar(true)}>{enviando ? 'Salvando…' : 'Enviar para aprovação'}</button>
            <button type="button" className="btn secondary" disabled={enviando} onClick={() => gravar(false)}>Salvar rascunho</button>
            <button type="button" className="btn secondary" onClick={fechar}>Cancelar</button>
          </div>
        </>
      )}
    </Folha>
  )
}

// ---------- Obra ----------

export function FormObra({ obra, onFechar, avisar }) {
  const responsaveis = useResponsaveis()
  const [c, setC] = useState({
    codigo: obra?.codigo || '', nome: obra?.nome || '', cliente: obra?.cliente || '', endereco: obra?.endereco || '', numeroContrato: obra?.numero_contrato || '',
    inicio: obra?.data_inicio || '', fim: obra?.data_fim_contratual || '', status: obra?.status || 'Planejamento', responsavelId: obra?.responsavel_id || '',
  })
  const campo = (k) => (v) => setC((x) => ({ ...x, [k]: v }))
  const erros = errosObra(c)
  const { aviso, tocar, tentar } = useAvisos(erros)
  const { erro, enviando, enviar } = useEnvio(onFechar, avisar, obra ? 'Obra atualizada.' : 'Obra criada.')
  const texto = (k, rotulo, extra = {}) => (
    <Campo id={`ob-${k}`} rotulo={rotulo} erro={aviso(k)}>
      <input id={`ob-${k}`} className="input" maxLength={100} value={c[k]} onChange={(e) => campo(k)(e.target.value)} onBlur={() => tocar(k)} {...extra} />
    </Campo>
  )
  return (
    <Folha titulo={obra ? 'Editar obra' : 'Nova obra'} sujo={Boolean(c.codigo || c.nome)} onFechar={onFechar}>
      {(fechar) => (
        <>
          {texto('codigo', 'Código', { maxLength: 20, placeholder: 'Ex.: U12' })}
          {texto('nome', 'Nome')}
          {texto('cliente', 'Cliente')}
          <Campo id="ob-endereco" rotulo="Endereço (opcional)">
            <input id="ob-endereco" className="input" maxLength={160} value={c.endereco} onChange={(e) => campo('endereco')(e.target.value)} />
          </Campo>
          <Campo id="ob-contrato" rotulo="Número do contrato (opcional)">
            <input id="ob-contrato" className="input" maxLength={40} value={c.numeroContrato} onChange={(e) => campo('numeroContrato')(e.target.value)} />
          </Campo>
          <Campo id="ob-inicio" rotulo="Início" erro={aviso('inicio')}>
            <input id="ob-inicio" className="input" type="date" value={c.inicio} onChange={(e) => campo('inicio')(e.target.value)} onBlur={() => tocar('inicio')} />
          </Campo>
          <Campo id="ob-fim" rotulo="Meta de entrega" erro={aviso('fim')}>
            <input id="ob-fim" className="input" type="date" value={c.fim} onChange={(e) => campo('fim')(e.target.value)} onBlur={() => tocar('fim')} />
          </Campo>
          <Campo id="ob-status" rotulo="Status" erro={aviso('status')}>
            <select id="ob-status" className="input" value={c.status} onChange={(e) => campo('status')(e.target.value)}><Opcoes lista={STATUS_OBRA} /></select>
          </Campo>
          <Campo id="ob-resp" rotulo="Responsável (opcional)">
            <select id="ob-resp" className="input" value={c.responsavelId} onChange={(e) => campo('responsavelId')(e.target.value ? Number(e.target.value) : '')}>
              <Opcoes lista={responsaveis} vazio="Sem responsável" />
            </select>
          </Campo>
          <Aviso texto={erro} />
          <div className="form-actions">
            <button type="button" className="btn" disabled={enviando} onClick={() => tentar() && enviar(() => (obra ? atualizarObra(obra.id, c) : criarObra(c)))}>{enviando ? 'Salvando…' : 'Salvar'}</button>
            <button type="button" className="btn secondary" onClick={fechar}>Cancelar</button>
          </div>
        </>
      )}
    </Folha>
  )
}

// ---------- Acesso de pessoas (liberar conta nova, trocar perfil, bloquear, escolher obras) ----------

export function FormAcesso({ pessoa, onFechar, avisar }) {
  const { obras, membros } = useDados()
  const pendente = pessoa.role === 'Pendente'
  const [c, setC] = useState({
    role: pendente ? '' : pessoa.role, ativo: pessoa.ativo,
    obraIds: membros.filter((m) => m.profile_id === pessoa.id).map((m) => m.obra_id),
  })
  const erros = errosLiberacao(c, veTodasAsObras)
  const { aviso, tentar } = useAvisos(erros)
  const { erro, enviando, enviar } = useEnvio(onFechar, avisar, pendente ? 'Conta liberada.' : 'Acesso atualizado.')
  const alternar = (id) => setC((x) => ({ ...x, obraIds: x.obraIds.includes(id) ? x.obraIds.filter((o) => o !== id) : [...x.obraIds, id] }))
  const todas = veTodasAsObras(c.role)
  const salvar = () => tentar() && enviar(async () => {
    const obraIds = todas ? [] : c.obraIds
    const r = pendente ? await liberarConta(pessoa.id, c.role, obraIds) : await atualizarPerfil(pessoa.id, { role: c.role, ativo: c.ativo })
    if (r.erro || pendente) return r
    return definirObrasDoPerfil(pessoa.id, obraIds)
  })
  return (
    <Folha titulo={pendente ? `Liberar ${pessoa.nome}` : `Acesso de ${pessoa.nome}`} sujo={false} onFechar={onFechar}>
      {(fechar) => (
        <>
          <p className="mono">{pessoa.email}</p>
          <Campo id="ac-role" rotulo="Perfil" erro={aviso('role')}>
            <select id="ac-role" className="input" value={c.role} onChange={(e) => setC((x) => ({ ...x, role: e.target.value }))}>
              <Opcoes lista={PERFIS_LIBERAVEIS} vazio="Escolha…" />
            </select>
          </Campo>
          {c.role && (todas
            ? <p className="mono">Este perfil enxerga todas as obras.</p>
            : (
              <div className="field">
                <span className="lb">Obras liberadas</span>
                {obras.map((o) => (
                  <label key={o.id} style={{ display: 'block' }}>
                    <input type="checkbox" checked={c.obraIds.includes(o.id)} onChange={() => alternar(o.id)} /> {o.codigo} — {o.nome}
                  </label>
                ))}
                <Aviso texto={aviso('obras')} />
              </div>
            ))}
          {!pendente && (
            <div className="field">
              <label><input type="checkbox" checked={c.ativo} onChange={(e) => setC((x) => ({ ...x, ativo: e.target.checked }))} /> Conta ativa (desmarque para bloquear o acesso)</label>
            </div>
          )}
          <Aviso texto={erro} />
          <div className="form-actions">
            <button type="button" className="btn" disabled={enviando} onClick={salvar}>{enviando ? 'Salvando…' : pendente ? 'Liberar' : 'Salvar'}</button>
            <button type="button" className="btn secondary" onClick={fechar}>Cancelar</button>
          </div>
        </>
      )}
    </Folha>
  )
}
