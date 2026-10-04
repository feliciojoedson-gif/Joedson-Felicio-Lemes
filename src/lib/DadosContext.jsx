import { createContext, useContext, useEffect, useState } from 'react'
import { carregarBase } from './dados.js'

const Ctx = createContext(null)

// A obra escolhida fica guardada neste navegador, uma por pessoa.
const chave = (usuario) => `obra-atual:${usuario.id}`
function lerObraGuardada(usuario) {
  try {
    const v = window.localStorage.getItem(chave(usuario))
    return v ? Number(v) : null
  } catch (_) {
    return null
  }
}
function guardarObra(usuario, id) {
  try {
    window.localStorage.setItem(chave(usuario), String(id))
  } catch (_) {
    // sem armazenamento (janela privada): o app funciona, só não lembra da obra
  }
}

// Carrega uma vez tudo o que as telas usam, sempre de UMA obra. `trocarObra` recarrega tudo.
export function DadosProvider({ usuario, children }) {
  const [obraId, setObraId] = useState(() => lerObraGuardada(usuario))
  const [estado, setEstado] = useState({ erro: null, base: null })

  useEffect(() => {
    let vivo = true
    carregarBase(usuario, obraId).then(({ data, erro }) => {
      if (!vivo) return
      if (data?.obra) guardarObra(usuario, data.obra.id)
      setEstado({ erro, base: data })
    })
    return () => { vivo = false }
  }, [usuario, obraId])

  if (estado.erro) return <div className="login"><p>Não consegui carregar. Tente de novo.</p></div>
  if (!estado.base) return <div className="login"><p className="mono">Carregando…</p></div>

  const nomeDe = (id) => estado.base.perfis.find((p) => p.id === id)?.nome || null
  const trocarObra = (id) => setObraId(Number(id))
  return <Ctx.Provider value={{ usuario, ...estado.base, nomeDe, trocarObra }}>{children}</Ctx.Provider>
}

export const useDados = () => useContext(Ctx)
