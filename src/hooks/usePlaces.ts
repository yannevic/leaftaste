import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { CountryStatus } from '../types/country'

const STATUS_VALIDOS: string[] = ['pending', 'in_progress', 'done', 'skipped']

// Hook que le a colecao "places" do Firestore em tempo real.
// "ativo" so fica true quando tem alguem logado.
export function usePlaces(ativo: boolean) {
  const [statuses, setStatuses] = useState<Record<string, CountryStatus>>({})
  const [erro, setErro] = useState(false)

  useEffect(() => {
    if (!ativo) return undefined

    const parar = onSnapshot(
      collection(db, 'places'),
      (snapshot) => {
        const novo: Record<string, CountryStatus> = {}
        snapshot.forEach((documento) => {
          const status = documento.data().status
          if (STATUS_VALIDOS.includes(status)) {
            novo[documento.id] = status as CountryStatus
          }
        })
        setStatuses(novo)
        setErro(false)
      },
      (err) => {
        console.error('Erro ao ler places:', err)
        setErro(true)
      },
    )

    // limpeza: desliga a "campainha" do Firestore
    return parar
  }, [ativo])

  return { statuses, erro }
}