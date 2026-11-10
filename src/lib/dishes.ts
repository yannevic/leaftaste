import {
  collection,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from './firebase'
import type { CountryStatus } from '../types/country'
import type { DishType } from '../types/dish'
import type { Sugestao } from '../types/suggestion'

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

// Salva a nota e o comentário de UMA pessoa num prato.
// O caminho com ponto ("ratings.UID") mexe só na chave dessa pessoa,
// sem apagar a avaliação do outro.
export async function rateDish(
  dishId: string,
  uid: string,
  score: number,
  comment: string,
) {
  await updateDoc(doc(db, 'dishes', dishId), {
    [`ratings.${uid}`]: { score, comment },
  })
}

// Guarda as sugestões da IA no lugar, para não gastar IA de novo.
// merge: true cria o documento se não existir, sem mexer no status.
export async function salvarSugestoes(placeId: string, sugestoes: Sugestao[]) {
  await setDoc(
    doc(db, 'places', placeId),
    { suggestions: sugestoes, suggestionsAt: serverTimestamp() },
    { merge: true },
  )
}

// Liga ou desliga o "manter" de UMA sugestão (o checkzinho).
// Como o Firestore não deixa mudar um item solto de dentro de um array,
// montamos a lista nova com .map (trocando só a sugestão clicada)
// e gravamos a lista inteira de volta.
// Usamos updateDoc (e não setDoc) porque o lugar já existe: ele só tem
// sugestões se alguém já gerou. O suggestionsAt não muda.
export async function alternarMantida(
  placeId: string,
  sugestoes: Sugestao[],
  nome: string,
) {
  const novaLista = sugestoes.map((s) =>
    s.name === nome ? { ...s, mantida: !s.mantida } : s,
  )
  await updateDoc(doc(db, 'places', placeId), { suggestions: novaLista })
}
