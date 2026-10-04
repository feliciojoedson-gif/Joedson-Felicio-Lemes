import { useState } from 'react'
import {
  errosValor, itensDoCadastro, linhaDoItem, MODOS, novaLinha, UNIDADES, valorDaLinha, valorDoCadastro,
} from '../../lib/empreiteiros.js'
import { formatarDinheiro, limparNumero } from '../../lib/regras.js'
import { Folha, useConfirmar } from '../planejamento/ui.jsx'
import { Aviso, useAvisos } from './ui.jsx'

// Cadastro do valor ao ativar o contrato: global (um valor) ou por escopo (tabela de itens).
// `itensAtuais` pré-preenche quando o contrato volta a ser ativado.
export default function FormValor({ contrato, itensAtuais, onSalvar, onFechar }) {
  const { pedir, caixa } = useConfirmar()
  const [modo, setModo] = useState(contrato.modo || '')
  const [valorGlobal, setValorGlobal] = useState(contrato.modo === 'global' ? String(contrato.valorTotal).replace('.', ',') : '')
  const [linhas, setLinhas] = useState(() => itensAtuais.map(linhaDoItem))
  const [contador, setContador] = useState(1)
  const erros = errosValor({ modo, valorGlobal, itens: linhas })
  const { aviso, tocar, tentar } = useAvisos(erros)
  const total = valorDoCadastro({ modo, valorGlobal, itens: linhas })

  const mudar = (chave, campo, valor) => setLinhas((ls) => ls.map((l) => (l.chave === chave ? { ...l, [campo]: valor } : l)))
  const adicionar = () => {
    setLinhas((ls) => [...ls, novaLinha(`n${contador}`)])
    setContador((n) => n + 1)
  }
  const preenchida = (l) => Boolean(l.descricao.trim() || l.quantidade || l.precoUnitario)
  const remover = (l) => {
    const tirar = () => setLinhas((ls) => ls.filter((x) => x.chave !== l.chave))
    if (preenchida(l)) pedir(`Remover o item "${l.descricao.trim() || 'sem descrição'}" do escopo?`, tirar, 'Remover')
    else tirar()
  }
  const escolher = (m) => {
    setModo(m)
    if (m === 'escopo' && linhas.length === 0) adicionar()
  }
  const salvar = () => {
    if (!tentar()) return
    onSalvar({ modo, valorTotal: total, itens: modo === 'escopo' ? itensDoCadastro(linhas) : [] })
  }

  return (
    <>
      <Folha titulo="Cadastro do valor" larga sujo={Boolean(valorGlobal) || linhas.some(preenchida)} onFechar={onFechar}>
        {(fechar) => (
          <>
            <p className="mono" style={{ marginTop: 0 }}>{contrato.empreiteiro} · {contrato.descricao}</p>
            <div className="field">
              <span className="lb">Como será o valor do contrato?</span>
              <div className="chips">
                {Object.entries(MODOS).map(([k, rotulo]) => (
                  <button key={k} type="button" className={modo === k ? 'on' : ''} aria-pressed={modo === k} onClick={() => escolher(k)}>{rotulo}</button>
                ))}
              </div>
              <Aviso texto={aviso('modo')} />
            </div>

            {modo === 'global' && (
              <div className="field">
                <label htmlFor="val-global">Valor total fechado (R$)</label>
                <input
                  id="val-global" className="input" inputMode="decimal" maxLength={13} placeholder="0,00" value={valorGlobal}
                  onChange={(e) => setValorGlobal(limparNumero(e.target.value))} onBlur={() => tocar('valorGlobal')}
                />
                <Aviso texto={aviso('valorGlobal')} />
              </div>
            )}

            {modo === 'escopo' && (
              <div className="field">
                <span className="lb">Itens do escopo</span>
                <div className="itens-valor">
                  {linhas.map((l, i) => (
                    <div className="item-linha" key={l.chave}>
                      <div className="field">
                        <label htmlFor={`it-d-${l.chave}`}>Descrição</label>
                        <input id={`it-d-${l.chave}`} className="input" maxLength={80} value={l.descricao} onChange={(e) => mudar(l.chave, 'descricao', e.target.value)} onBlur={() => tocar(`${i}.descricao`)} />
                        <Aviso texto={aviso(`${i}.descricao`)} />
                      </div>
                      <div className="field">
                        <label htmlFor={`it-u-${l.chave}`}>Unidade</label>
                        <select id={`it-u-${l.chave}`} className="select" value={l.unidade} onChange={(e) => mudar(l.chave, 'unidade', e.target.value)}>
                          {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                      <div className="field">
                        <label htmlFor={`it-q-${l.chave}`}>Quantidade</label>
                        <input id={`it-q-${l.chave}`} className="input" inputMode="decimal" maxLength={10} placeholder="0" value={l.quantidade} onChange={(e) => mudar(l.chave, 'quantidade', limparNumero(e.target.value))} onBlur={() => tocar(`${i}.quantidade`)} />
                        <Aviso texto={aviso(`${i}.quantidade`)} />
                      </div>
                      <div className="field">
                        <label htmlFor={`it-p-${l.chave}`}>Preço unitário (R$)</label>
                        <input id={`it-p-${l.chave}`} className="input" inputMode="decimal" maxLength={12} placeholder="0,00" value={l.precoUnitario} onChange={(e) => mudar(l.chave, 'precoUnitario', limparNumero(e.target.value))} onBlur={() => tocar(`${i}.precoUnitario`)} />
                        <Aviso texto={aviso(`${i}.precoUnitario`)} />
                      </div>
                      <div className="item-total"><span className="mono">Total do item</span><b>{formatarDinheiro(valorDaLinha(l))}</b></div>
                      <button type="button" className="btn secondary" onClick={() => remover(l)} aria-label={`Remover item ${i + 1}`}>Remover</button>
                    </div>
                  ))}
                </div>
                <Aviso texto={aviso('itens')} />
                <button type="button" className="btn secondary" style={{ marginTop: 10 }} onClick={adicionar}>+ Adicionar item</button>
              </div>
            )}

            {modo && <div className="total-valor"><span>Valor total do contrato</span><b>{formatarDinheiro(total)}</b></div>}
            {modo === 'escopo' && linhas.length > 0 && <p className="mono">{linhas.length} {linhas.length === 1 ? 'item' : 'itens'} no escopo</p>}

            <div className="form-actions">
              <button type="button" className="btn" onClick={salvar}>Ativar contrato</button>
              <button type="button" className="btn secondary" onClick={fechar}>Cancelar</button>
            </div>
          </>
        )}
      </Folha>
      {caixa}
    </>
  )
}
