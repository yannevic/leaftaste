import {
  collection,
  doc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { db } from './firebase'
import type { CountryStatus } from '../types/country'
import type { DishType } from '../types/dish'

type NovoPrato = {
  placeId: string
  type: DishType
  isExtra: boolean
  name: string
  recipe: string
}

// Registra um prato e, se o lugar ainda estava pendente (ou pulado),
// já marca o lugar como "em andamento". As duas coisas juntas, num lote.
export async function addDish(prato: NovoPrato, statusAtual: CountryStatus) {
  const batch = writeBatch(db)

  // doc(collection(...)) cria uma referencia com id automatico
  const dishRef = doc(collection(db, 'dishes'))
  batch.set(dishRef, {
    placeId: prato.placeId,
    type: prato.type,
    isExtra: prato.isExtra,
    name: prato.name,
    recipe: prato.recipe,
    cookedAt: serverTimestamp(),
    ratings: {},
  })

  if (statusAtual === 'pending' || statusAtual === 'skipped') {
    // merge: true cria o documento se nao existir, sem apagar outros campos
    batch.set(
      doc(db, 'places', prato.placeId),
      { status: 'in_progress' },
      { merge: true },
    )
  }

  await batch.commit()
}