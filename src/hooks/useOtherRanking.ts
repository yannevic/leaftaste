import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Ranking } from './useRanking'

// Le em tempo real o ranking da OUTRA pessoa: o documento de "rankings"
// cujo id nao e o meu. Se ela ainda nao salvou nada, devolve null.
export function useOtherRanking(meuUid: string) {
  const [outro, setOutro] = useState<{ uid: string; ranking: Ranking } | null>(
    null,
  )
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    const parar = onSnapshot(
      collection(db, 'rankings'),
      (snapshot) => {
        const documento = snapshot.docs.find((d) => d.id !== meuUid)
        if (documento) {
          const dados = documento.data()
          setOutro({
            uid: documento.id,
            ranking: {
              doce: dados.doce ?? [],
              salgado: dados.salgado ?? [],
            },
          })
        } else {
          setOutro(null)
        }
        setErro(false)
        setCarregando(false)
      },
      (err) => {
        console.error('Erro ao ler ranking do outro:', err)
        setErro(true)
        setCarregando(false)
      },
    )

    return parar
  }, [meuUid])

  return { outro, carregando, erro }
}