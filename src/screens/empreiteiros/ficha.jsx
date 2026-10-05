import { useState } from 'react'
import { Chip, Icone, Vazio } from '../../components/index.jsx'
import {
  acumuladoDepois, acumuladoDoItem, boletimDasEntradas, errosBoletim, medidoDoContrato, MODOS, pctDaQuantidade, pctDoValor, percentualAMedir,
  percentualMedido, proximoNumero, quantidadeDaEntrada, recebeMedicao, rotuloPercentual, saldoDoContrato, saldoDoItem, valorDaEntradaGlobal,
  valorDaQuantidade,
} from '../../lib/empreiteiros.js'
import { formatarData, formatarDinheiro, limparNumero } from '../../lib/regras.js'
import { Folha } from '../planejamento/ui.jsx'
import { Aviso, useAvisos } from './ui.jsx'

const decimal = (n, casas) => Number(n.toFixed(casas)).toString().replace('.', ',')
const numero = (n) => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 3 })

// Campo de uma entrada: o que a pessoa digitou aparece como digitou; os outros dois campos mostram o valor derivado.
const mostrar = (entrada, campo, derivado) => {
  if (!entrada || !String(entrada.texto).trim()) return ''
  return entrada.campo === campo ? entrada.texto : derivado()
}

function FormBoletim({ contrato, itens, medicoes, hoje, onSalvar, onFechar }) {
  const [data, setData] = useState(hoje)
  const [entradas, setEntradas] = useState({})
  const erros = errosBoletim({ contrato, itens, medicoes, entradas, data }, hoje)
  const { aviso, tocar, tentar } = useAvisos(erros)
  const boletim = boletimDasEntradas(contrato, itens, entradas, data, medicoes)
  const acumulado = acumuladoDepois(contrato, medicoes, boletim.valor)
  const global = contrato.modo === 'global'

  const digitar = (chave, campo, texto) => setEntradas((e) => {
    const novas = { ...e }
    if (texto) novas[chave] = { campo, texto: limparNumero(texto) }
    else delete novas[chave]
    return novas
  })
  const salvar = () => tentar() && onSalvar(boletim)

  return (
    <Folha titulo={`Medição nº ${proximoNumero(contrato.id, medicoes)}`} larga sujo={Object.keys(entradas).length > 0 || data !== hoje} onFechar={onFechar}>
      {(fechar) => (
        <>
          <p className="mono" style={{ marginTop: 0 }}>{contrato.empreiteiro} · {contrato.descricao}</p>
          <div className="field">
            <label htmlFor="med-data">Data da medição</label>
            <input id="med-data" className="input" type="date" max={hoje} value={data} onChange={(e) => setData(e.target.value)} onBlur={() => tocar('data')} />
            <Aviso texto={aviso('data')} />
          </div>

          {global && (
            <div className="field">
              <span className="lb">Quanto foi medido? Digite o % ou o valor: o outro é calculado.</span>
              <div className="med-campos">
                <div className="field">
                  <label htmlFor="med-pct">% do contrato</label>
                  <input
                    id="med-pct" className="input" inputMode="decimal" maxLength={7} placeholder="0"
                    value={mostrar(entradas.global, 'pct', () => decimal(pctDoValor(valorDaEntradaGlobal(entradas.global, contrato), contrato), 2))}
                    onChange={(e) => digitar('global', 'pct', e.target.value)} onBlur={() => tocar('global')}
                  />
                </div>
                <div className="field">
                  <label htmlFor="med-valor">Valor (R$)</label>
                  <input
                    id="med-valor" className="input" inputMode="decimal" maxLength={13} placeholder="0,00"
                    value={mostrar(entradas.global, 'valor', () => valorDaEntradaGlobal(entradas.global, contrato).toFixed(2).replace('.', ','))}
                    onChange={(e) => digitar('global', 'valor', e.target.value)} onBlur={() => tocar('global')}
                  />
                </div>
              </div>
              <Aviso texto={aviso('global')} />
            </div>
          )}

          {!global && (
            <div className="field">
              <span className="lb">Execução do período, por item. Digite a quantidade, o % ou o valor: os outros são calculados.</span>
              <div className="itens-valor">
                {itens.map((item) => {
                  const entrada = entradas[item.id]
                  const q = quantidadeDaEntrada(entrada, item)
                  const saldo = saldoDoItem(item, medicoes)
                  const chave = `i${item.id}`
                  return (
                    <div className={`med-linha${aviso(chave) ? ' com-erro' : ''}`} key={item.id}>
                      <div className="med-item">
                        <b>{item.descricao}</b>
                        <span className="mono">
                          Contratado {numero(item.quantidade)} {item.unidade} · medido {rotuloPercentual(pctDaQuantidade(acumuladoDoItem(item.id, medicoes), item))} · saldo {numero(saldo)} {item.unidade}
                        </span>
                      </div>
                      <div className="field">
                        <label htmlFor={`mq-${item.id}`}>Quantidade ({item.unidade})</label>
                        <input
                          id={`mq-${item.id}`} className="input" inputMode="decimal" maxLength={12} placeholder="0"
                          value={mostrar(entrada, 'quantidade', () => decimal(q, 3))}
                          onChange={(e) => digitar(item.id, 'quantidade', e.target.value)} onBlur={() => tocar(chave)}
                        />
                      </div>
                      <div className="field">
                        <label htmlFor={`mp-${item.id}`}>% do item</label>
                        <input
                          id={`mp-${item.id}`} className="input" inputMode="decimal" maxLength={7} placeholder="0"
                          value={mostrar(entrada, 'pct', () => decimal(pctDaQuantidade(q, item), 2))}
                          onChange={(e) => digitar(item.id, 'pct', e.target.value)} onBlur={() => tocar(chave)}
                        />
                      </div>
                      <div className="field">
                        <label htmlFor={`mv-${item.id}`}>Valor (R$)</label>
                        <input
                          id={`mv-${item.id}`} className="input" inputMode="decimal" maxLength={13} placeholder="0,00"
                          value={mostrar(entrada, 'valor', () => valorDaQuantidade(item, medicoes, q).toFixed(2).replace('.', ','))}
                          onChange={(e) => digitar(item.id, 'valor', e.target.value)} onBlur={() => tocar(chave)}
                        />
                      </div>
                      <button type="button" className="btn secondary" disabled={saldo <= 0} onClick={() => digitar(item.id, 'quantidade', decimal(saldo, 6))}>Medir o saldo</button>
                      <Aviso texto={aviso(chave)} />
                    </div>
                  )
                })}
              </div>
              <Aviso texto={aviso('itens')} />
            </div>
          )}

          <div className="total-valor"><span>Total do boletim</span><b>{formatarDinheiro(boletim.valor)}</b></div>
          <p className="mono">Novo acumulado: {formatarDinheiro(acumulado)} ({rotuloPercentual(pctDoValor(acumulado, contrato))} do contrato)</p>

          <div className="form-actions">
            <button type="button" className="btn" onClick={salvar}>Salvar medição</button>
            <button type="button" className="btn secondary" onClick={fechar}>Cancelar</button>
          </div>
        </>
      )}
    </Folha>
  )
}

function Boletim({ m, itens }) {
  return (
    <article className="card boletim">
      <div className="cab">
        <div><b className="num">Medição nº {m.numero}</b><div className="mono">{formatarData(m.data)}</div></div>
        <div className="money">{formatarDinheiro(m.valor)}</div>
      </div>
      {m.linhas.length > 0 && (
        <ul className="boletim-linhas">
          {m.linhas.map((l) => {
            const item = itens.find((i) => i.id === l.itemId)
            return item && <li key={l.itemId}>{item.descricao}: {numero(l.quantidade)} {item.unidade} ({rotuloPercentual(pctDaQuantidade(l.quantidade, item))})</li>
          })}
        </ul>
      )}
    </article>
  )
}

// Ficha de medição de um contrato: resumo no topo, botão "Nova medição" e histórico (mais recente primeiro).
export default function Ficha({ contrato, itens, medicoes, hoje, podeMedir, onVoltar, onSalvar }) {
  const [formAberto, setFormAberto] = useState(false)
  const doContrato = medicoes.filter((m) => m.contratoId === contrato.id).sort((a, b) => b.numero - a.numero)
  const pct = percentualMedido(contrato, medicoes)
  const podeNova = podeMedir && recebeMedicao(contrato)
  const nova = podeNova && <button className="btn" onClick={() => setFormAberto(true)}><Icone nome="plus" />Nova medição</button>

  return (
    <>
      <button type="button" className="btn secondary" onClick={onVoltar}><Icone nome="voltar" />Voltar aos contratos</button>
      <div className="card ficha-resumo">
        <div className="h"><b>{contrato.empreiteiro}</b> <Chip>{MODOS[contrato.modo]}</Chip></div>
        <div className="m">{contrato.descricao}</div>
        <div className="resumo-grade">
          <div className="cont"><span>Valor total</span><b>{formatarDinheiro(contrato.valorTotal)}</b></div>
          <div className="cont"><span>Medido acumulado</span><b>{formatarDinheiro(medidoDoContrato(contrato, medicoes))}</b><span>{rotuloPercentual(pct)}</span></div>
          <div className="cont"><span>Saldo a medir</span><b>{formatarDinheiro(saldoDoContrato(contrato, medicoes))}</b><span>{rotuloPercentual(percentualAMedir(contrato, medicoes))}</span></div>
        </div>
        <div className="pbar">
          <div className="tr" role="progressbar" aria-label="Percentual medido" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}><i style={{ width: `${Math.min(100, pct)}%` }} /></div>
        </div>
        {nova && <div style={{ marginTop: 12 }}>{nova}</div>}
        {!recebeMedicao(contrato) && <p className="mono">Este contrato não está ativo: só consulta.</p>}
      </div>

      <h2 className="secao">Histórico de medições</h2>
      {doContrato.length === 0
        ? (
          <Vazio icone="medicoes" titulo="Nenhuma medição lançada" texto={podeNova ? 'Lance o primeiro boletim deste contrato.' : 'Este contrato ainda não tem boletins.'}>
            {nova}
          </Vazio>
        )
        : doContrato.map((m) => <Boletim key={m.id} m={m} itens={itens} />)}

      {formAberto && (
        <FormBoletim
          contrato={contrato} itens={itens} medicoes={medicoes} hoje={hoje}
          onSalvar={(boletim) => { setFormAberto(false); onSalvar(contrato, boletim) }} onFechar={() => setFormAberto(false)}
        />
      )}
    </>
  )
}
