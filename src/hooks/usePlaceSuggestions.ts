import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Sugestao } from '../types/suggestion'

type Estado = {
  placeId: string // de qual lugar são estas sugestões
  sugestoes: Sugestao[]
}

// Le em tempo real as sugestoes salvas de UM lugar
export function usePlaceSuggestions(placeId: string) {
  const [estado, setEstado] = useState<Estado | null>(null)

  useEffect(() => {
    const parar = onSnapshot(
      doc(db, 'places', placeId),
      (snapshot) => {
        // se o lugar ainda não tem documento, data() vem vazio
        const dados = snapshot.data()
        setEstado({
          placeId,
          sugestoes: Array.isArray(dados?.suggestions)
            ? (dados.suggestions as Sugestao[])
            : [],
        })
      },
      (err) => {
        console.error('Erro ao ler sugestoes:', err)
        setEstado({ placeId, sugestoes: [] })
      },
    )
    return parar
  }, [placeId])

  // só vale se o que está guardado é do lugar que está aberto agora
  const atual = estado?.placeId === placeId
  return {
    sugestoes: atual ? estado.sugestoes : [],
    carregando: !atual,
  }
}
