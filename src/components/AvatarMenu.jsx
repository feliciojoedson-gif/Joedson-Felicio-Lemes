import { useEffect, useRef, useState } from 'react'

// Ícone redondo com a inicial do nome, no topo. Abre um menu pequeno com nome, perfil, "Painel de admin" (só para quem
// administra) e "Sair". Fecha ao clicar fora ou apertar Esc.
export default function AvatarMenu({ usuario, podeAdministrar, onAdmin, onSair }) {
  const [aberto, setAberto] = useState(false)
  const raiz = useRef(null)
  useEffect(() => {
    if (!aberto) return undefined
    const fora = (e) => { if (!raiz.current?.contains(e.target)) setAberto(false) }
    const esc = (e) => { if (e.key === 'Escape') setAberto(false) }
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', esc) }
  }, [aberto])
  const inicial = (usuario.nome || '?').trim().charAt(0).toUpperCase()
  return (
    <div className="avatar-raiz" ref={raiz}>
      <button type="button" className="avatar" aria-label={`Menu de ${usuario.nome}`} aria-haspopup="menu" aria-expanded={aberto} onClick={() => setAberto((v) => !v)}>
        {inicial}
      </button>
      {aberto && (
        <div className="avatar-menu" role="menu">
          <div className="avatar-quem"><b>{usuario.nome}</b><span>{usuario.role}</span></div>
          {podeAdministrar && <button type="button" role="menuitem" onClick={() => { setAberto(false); onAdmin() }}>Painel de admin</button>}
          <button type="button" role="menuitem" onClick={() => { setAberto(false); onSair() }}>Sair</button>
        </div>
      )}
    </div>
  )
}
