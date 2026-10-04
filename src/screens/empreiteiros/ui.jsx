import { useState } from 'react'

// Validação na hora: o aviso aparece quando o campo perde o foco ou quando a pessoa tenta salvar.
export function useAvisos(erros) {
  const [tocados, setTocados] = useState({})
  const [tentou, setTentou] = useState(false)
  return {
    aviso: (campo) => (tentou || tocados[campo]) && erros[campo],
    tocar: (campo) => setTocados((t) => ({ ...t, [campo]: true })),
    tentar: () => { setTentou(true); return Object.keys(erros).length === 0 },
  }
}

export function Aviso({ texto }) {
  return texto ? <div className="erro" role="alert">{texto}</div> : null
}
