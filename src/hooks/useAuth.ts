import { useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from '../lib/firebase'

// Hook que descobre se tem alguem logado.
// Devolve o usuario (ou null) e se ainda estamos descobrindo (loading).
export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // o Firebase chama essa funcao toda vez que o login mudar
    const parar = onAuthStateChanged(auth, (usuario) => {
      setUser(usuario)
      setLoading(false) // ja sabemos a resposta
    })

    // limpeza: desliga a "campainha" quando o componente sumir
    return parar
  }, [])

  return { user, loading }
}