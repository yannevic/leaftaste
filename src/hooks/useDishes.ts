import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Dish } from '../types/dish'

// Le em tempo real os pratos de UM lugar
export function useDishes(placeId: string) {
  const [dishes, setDishes] = useState<Dish[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    const filtro = query(
      collection(db, 'dishes'),
      where('placeId', '==', placeId),
    )

    const parar = onSnapshot(
      filtro,
      (snapshot) => {
        const lista = snapshot.docs.map(
          (documento) => ({ id: documento.id, ...documento.data() }) as Dish,
        )
        // mais antigos primeiro; os que ainda nao tem data vao pro fim
        lista.sort(
          (a, b) =>
            (a.cookedAt?.toMillis() ?? Number.MAX_SAFE_INTEGER) -
            (b.cookedAt?.toMillis() ?? Number.MAX_SAFE_INTEGER),
        )
        setDishes(lista)
        setErro(false)
        setCarregando(false)
      },
      (err) => {
        console.error('Erro ao ler dishes:', err)
        setErro(true)
        setCarregando(false)
      },
    )

    return parar
  }, [placeId])

  return { dishes, carregando, erro }
}