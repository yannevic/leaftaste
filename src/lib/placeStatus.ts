import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import type { CountryStatus } from '../types/country'

// Muda o status de um lugar. Ao finalizar, guarda a data (finishedAt);
// em qualquer outro status, finishedAt volta a ficar vazio (null).
export async function setPlaceStatus(placeId: string, status: CountryStatus) {
  await setDoc(
    doc(db, 'places', placeId),
    {
      status,
      finishedAt: status === 'done' ? serverTimestamp() : null,
    },
    { merge: true }, // cria o documento se não existir, sem apagar outros campos
  )
}