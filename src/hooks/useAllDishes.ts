import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Dish } from '../types/dish'

// Le em tempo real os pratos de TODOS os lugares (usado pelo ranking)
export function useAllDishes() {
  const [dishes, setDishes] = useState<Dish[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    const parar = onSnapshot(
      collection(db, 'dishes'),
      (snapshot) => {
        const lista = snapshot.docs.map(
          (documento) => ({ id: documento.id, ...documento.data() }) as Dish,
        )
        setDishes(lista)
        setErro(false)
        setCarregando(false)
      },
      (err) => {
        console.error('Erro ao ler todos os dishes:', err)
        setErro(true)
        setCarregando(false)
      },
    )

    return parar
  }, [])

  return { dishes, carregando, erro }
}