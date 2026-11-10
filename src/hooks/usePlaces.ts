import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { CountryStatus } from '../types/country'

const STATUS_VALIDOS: string[] = ['pending', 'in_progress', 'done', 'skipped']

// Hook que le a colecao "places" do Firestore em tempo real.
// "ativo" so fica true quando tem alguem logado.
export function usePlaces(ativo: boolean) {
  const [statuses, setStatuses] = useState<Record<string, CountryStatus>>({})
  // Data em que cada lugar foi finalizado (so lugares finalizados tem)
  const [datas, setDatas] = useState<Record<string, Date>>({})
  const [erro, setErro] = useState(false)

  useEffect(() => {
    if (!ativo) return undefined

    const parar = onSnapshot(
      collection(db, 'places'),
      (snapshot) => {
        const novo: Record<string, CountryStatus> = {}
        const novasDatas: Record<string, Date> = {}
        snapshot.forEach((documento) => {
          const dados = documento.data()
          if (STATUS_VALIDOS.includes(dados.status)) {
            novo[documento.id] = dados.status as CountryStatus
          }
          // finishedAt e um Timestamp do Firebase; toDate() vira uma data normal
          if (dados.status === 'done' && dados.finishedAt) {
            novasDatas[documento.id] = dados.finishedAt.toDate()
          }
        })
        setStatuses(novo)
        setDatas(novasDatas)
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

  return { statuses, datas, erro }
}
