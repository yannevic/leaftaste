import { useEffect, useState } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { DishType } from '../types/dish'

// Ordem dos pratos: uma lista de ids para doces e outra para salgados
export type Ranking = Record<DishType, string[]>

// Le em tempo real o ranking de UMA pessoa (documento rankings/{uid})
export function useRanking(uid: string) {
  const [ranking, setRanking] = useState<Ranking>({ doce: [], salgado: [] })
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    const parar = onSnapshot(
      doc(db, 'rankings', uid),
      (snapshot) => {
        // Se a pessoa ainda nao montou o ranking, o documento nao existe:
        // data() devolve undefined e usamos listas vazias
        const dados = snapshot.data()
        setRanking({
          doce: dados?.doce ?? [],
          salgado: dados?.salgado ?? [],
        })
        setErro(false)
        setCarregando(false)
      },
      (err) => {
        console.error('Erro ao ler ranking:', err)
        setErro(true)
        setCarregando(false)
      },
    )

    return parar
  }, [uid])

  // Salva a nova ordem de um tipo (doce ou salgado).
  // O merge: true mexe so nessa lista e nao apaga a outra.
  async function salvarOrdem(tipo: DishType, ids: string[]) {
    await setDoc(doc(db, 'rankings', uid), { [tipo]: ids }, { merge: true })
  }

  return { ranking, carregando, erro, salvarOrdem }
}