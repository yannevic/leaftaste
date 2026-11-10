import type { Timestamp } from 'firebase/firestore'

export type DishType = 'doce' | 'salgado'

// Um prato registrado (documento da coleção "dishes")
export type Dish = {
  id: string
  placeId: string
  type: DishType
  isExtra: boolean
  name: string
  recipe: string
  cookedAt: Timestamp | null // fica null por um instante, até o servidor responder
  ratings: Record<string, { score: number; comment: string }>
}
