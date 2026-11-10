import { useState } from 'react'
import { Check, RotateCcw, SkipForward } from 'lucide-react'
import { setPlaceStatus } from '../../lib/placeStatus'
import type { CountryStatus } from '../../types/country'

type Props = {
  placeId: string
  status: CountryStatus
  temPratos: boolean // o lugar já tem pelo menos um prato?
  carregando: boolean // os pratos ainda estão sendo lidos do Firestore?
}

const BOTAO_CHEIO =
  'flex w-full items-center justify-center gap-2 rounded-2xl bg-[#f48fb1] py-2 font-semibold text-white shadow-md transition hover:bg-[#ee7ba3] disabled:opacity-60'
const BOTAO_VAZADO =
  'flex w-full items-center justify-center gap-2 rounded-2xl border border-white/70 bg-white/50 py-2 font-semibold text-[#b0476f] transition hover:bg-white/70 disabled:opacity-60'

export default function PlaceActions({
  placeId,
  status,
  temPratos,
  carregando,
}: Props) {
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  async function mudarPara(novo: CountryStatus) {
    setErro('')
    setEnviando(true)
    try {
      await setPlaceStatus(placeId, novo)
    } catch (err) {
      console.error('Erro ao mudar status:', err)
      setErro('Não foi possível atualizar. Tente de novo.')
    } finally {
      setEnviando(false)
    }
  }

  // Enquanto os pratos carregam, não deixa clicar (o botão depende deles)
  const bloqueado = enviando || carregando

  return (
    <div className="mt-4 border-t border-white/50 pt-4">
      {status === 'pending' && (
        <>
          <button
            type="button"
            onClick={() => mudarPara('skipped')}
            disabled={bloqueado}
            className={BOTAO_VAZADO}
          >
            <SkipForward size={18} />
            <span>Pular lugar</span>
          </button>
          <p className="mt-2 text-center text-xs text-pink-400">
            Marca como resolvido sem fazer nenhum prato.
          </p>
        </>
      )}

      {status === 'in_progress' && (
        <button
          type="button"
          onClick={() => mudarPara('done')}
          disabled={bloqueado || !temPratos}
          className={BOTAO_CHEIO}
        >
          <Check size={18} />
          <span>Finalizar lugar</span>
        </button>
      )}

      {(status === 'done' || status === 'skipped') && (
        <button
          type="button"
          onClick={() => mudarPara(temPratos ? 'in_progress' : 'pending')}
          disabled={bloqueado}
          className={BOTAO_VAZADO}
        >
          <RotateCcw size={18} />
          <span>Reabrir lugar</span>
        </button>
      )}

      {erro && (
        <p role="alert" className="mt-2 text-center text-sm text-[#c2255c]">
          {erro}
        </p>
      )}
    </div>
  )
}
