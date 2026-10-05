import { useRef } from 'react'
import { Icone, Vazio } from '../../components/index.jsx'
import { useQualidade } from '../../lib/QualidadeContext.jsx'
import { Aviso } from '../planejamento/ui.jsx'

// Peças compartilhadas pelas abas do módulo Qualidade e pelo relatório.

// Os quatro estados de toda aba: carregando, erro (com "tentar de novo"), vazio (com convite) e sucesso.
export function Estado({ vazio, children }) {
  const { status, tentarDeNovo } = useQualidade()
  if (status === 'carregando') return <p className="mono" role="status">Carregando a qualidade da obra…</p>
  if (status === 'erro') {
    return (
      <Vazio icone="restricoes" titulo="Não consegui carregar a qualidade" texto="Verifique a conexão e tente de novo.">
        <button type="button" className="btn" onClick={tentarDeNovo}>Tentar de novo</button>
      </Vazio>
    )
  }
  return vazio || children
}

// KPI com borda esquerda colorida: `cor` é uma variável de cor do design system.
export function Kpi({ rotulo, valor, cor }) {
  return (
    <div className="q-kpi" style={{ '--c': cor }}>
      <div className="v">{valor}</div>
      <div className="k">{rotulo}</div>
    </div>
  )
}

// Foto com preview local (URL.createObjectURL): nada é enviado a servidor. `capture` abre direto a câmera do celular.
export function CampoFoto({ id, rotulo, valor, onTroca, erro, obrigatoria }) {
  const entrada = useRef(null)
  const escolher = (e) => {
    const arquivo = e.target.files?.[0]
    if (arquivo) onTroca(URL.createObjectURL(arquivo))
    e.target.value = ''
  }
  return (
    <div className="field">
      <span className="lb">{rotulo}{obrigatoria ? '' : ' (opcional)'}</span>
      {valor && <img className="q-preview" src={valor} alt="Pré-visualização da foto" />}
      <div className="q-foto-botoes">
        <button type="button" className="btn secondary" onClick={() => entrada.current?.click()}>
          <Icone nome="fotos" />{valor ? 'Trocar foto' : 'Tirar foto'}
        </button>
        {valor && <button type="button" className="btn secondary" onClick={() => onTroca('')}>Remover</button>}
      </div>
      <input id={id} ref={entrada} type="file" accept="image/*" capture="environment" hidden onChange={escolher} />
      <Aviso texto={erro} />
    </div>
  )
}

export const Foto = ({ src, alt }) => (
  <div className="q-foto">
    {src ? <img src={src} alt={alt} /> : <div className="q-sem-foto"><Icone nome="fotos" /><span>Sem foto</span></div>}
  </div>
)

// Várias fotos, cada uma com preview local e botão de remover.
export function CampoFotos({ id, rotulo, valor, onTroca }) {
  const entrada = useRef(null)
  const escolher = (e) => {
    const novas = [...(e.target.files || [])].map((a) => URL.createObjectURL(a))
    if (novas.length) onTroca([...valor, ...novas])
    e.target.value = ''
  }
  return (
    <div className="field">
      <span className="lb">{rotulo} (opcional)</span>
      {valor.length > 0 && (
        <div className="q-miniaturas">
          {valor.map((src) => (
            <div key={src} className="q-miniatura">
              <img src={src} alt="Pré-visualização da foto" />
              <button type="button" aria-label="Remover foto" onClick={() => onTroca(valor.filter((x) => x !== src))}>×</button>
            </div>
          ))}
        </div>
      )}
      <button type="button" className="btn secondary" onClick={() => entrada.current?.click()}><Icone nome="fotos" />Adicionar foto</button>
      <input id={id} ref={entrada} type="file" accept="image/*" capture="environment" multiple hidden onChange={escolher} />
    </div>
  )
}

// Barra de progresso dividida: verde (OK), vermelho (NC), cinza escuro (N.A.) e cinza claro (pendente).
export function BarraQ({ p }) {
  const pct = (n) => (p.total ? `${(n / p.total) * 100}%` : '0%')
  return (
    <div className="q-barra" role="img" aria-label={`${p.ok} OK, ${p.nc} não conformes, ${p.na} não se aplicam, ${p.pendentes} pendentes`}>
      <i className="ok" style={{ width: pct(p.ok) }} />
      <i className="nc" style={{ width: pct(p.nc) }} />
      <i className="na" style={{ width: pct(p.na) }} />
    </div>
  )
}
