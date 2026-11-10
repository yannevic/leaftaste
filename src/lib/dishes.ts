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
import type { Dish, DishType } from '../types/dish'
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

// Escolhe uma sugestão de vez: ela vira um prato registrado normal.
// Três coisas num lote só (ou grava tudo, ou não grava nada):
//   1) cria o prato em "dishes"
//   2) marca a sugestão como escolhida (ela fica na lista)
//   3) se o lugar estava pendente/pulado, passa para "em andamento"
// Se o lugar já tem o prato principal desse tipo, o novo entra como extra.
export async function escolherSugestao(
  placeId: string,
  sugestoes: Sugestao[],
  nome: string,
  pratos: Dish[],
  statusAtual: CountryStatus,
) {
  // .find devolve a sugestão com esse nome (ou undefined se não achar)
  const escolhida = sugestoes.find((s) => s.name === nome)
  if (!escolhida) throw new Error('Sugestao nao encontrada')
  if (escolhida.escolhida) return // já foi escolhida: não cria prato de novo

  // mesma regra do DishForm: vaga do tipo ocupada = entra como extra
  const vagaOcupada = pratos.some(
    (p) => p.type === escolhida.type && !p.isExtra,
  )

  const batch = writeBatch(db)

  // 1) o prato novo (id automático, igual no addDish)
  const dishRef = doc(collection(db, 'dishes'))
  batch.set(dishRef, {
    placeId,
    type: escolhida.type,
    isExtra: vagaOcupada,
    name: escolhida.name,
    recipe: '',
    cookedAt: serverTimestamp(),
    ratings: {},
  })

  // 2) a lista de sugestões, com só esta marcada como escolhida
  const novaLista = sugestoes.map((s) =>
    s.name === nome ? { ...s, escolhida: true } : s,
  )

  // 3) os dados do lugar: sempre a lista; o status só se precisar mudar
  const dadosLugar: { suggestions: Sugestao[]; status?: CountryStatus } = {
    suggestions: novaLista,
  }
  if (statusAtual === 'pending' || statusAtual === 'skipped') {
    dadosLugar.status = 'in_progress'
  }
  // merge: true grava só esses campos, sem apagar o resto do lugar
  batch.set(doc(db, 'places', placeId), dadosLugar, { merge: true })

  await batch.commit()
}
