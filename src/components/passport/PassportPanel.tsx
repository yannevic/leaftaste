import type { ReactNode } from 'react'
import { Compass, Globe, X } from 'lucide-react'
import { PLACES } from '../../lib/places'
import { mundoCompleto, progressoPorContinente } from '../../lib/progress'
import type { CountryStatus } from '../../types/country'

type Props = {
  statuses: Record<string, CountryStatus>
  onClose: () => void
}

// Um carimbo redondo: rosa quando completo, apagado quando falta
function Carimbo({
  icone,
  titulo,
  detalhe,
  completo,
  inclinacao,
}: {
  icone: ReactNode
  titulo: string
  detalhe: string
  completo: boolean
  inclinacao: number
}) {
  return (
    <div
      style={{ transform: `rotate(${inclinacao}deg)` }}
      className={`flex h-28 w-28 flex-col items-center justify-center rounded-full border-4 border-dashed px-2 text-center ${
        completo
          ? 'border-[#f48fb1] bg-white/60 text-pink-600'
          : 'border-[#d9d2dc] bg-white/20 text-[#b9a9b3]'
      }`}
    >
      {icone}
      <span className="text-xs font-bold leading-tight">{titulo}</span>
      <span className="text-xs">{detalhe}</span>
    </div>
  )
}

export default function PassportPanel({ statuses, onClose }: Props) {
  const continentes = [...progressoPorContinente(statuses)].sort((a, b) =>
    a.nome.localeCompare(b.nome, 'pt-BR'),
  )
  const resolvidos = continentes.reduce((soma, c) => soma + c.resolvidos, 0)
  const mundo = mundoCompleto(statuses)

  return (
    <div className="fixed left-1/2 top-1/2 z-20 max-h-[80vh] w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-white/60 bg-white/40 p-5 text-[#5c3347] shadow-xl backdrop-blur-md">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-pink-600">Passaporte</h2>
        <button
          onClick={onClose}
          aria-label="Fechar passaporte"
          className="rounded-full p-1 text-pink-600 hover:bg-white/60"
        >
          <X size={20} />
        </button>
      </div>

      <p className="mb-4 text-sm text-[#b0476f]">
        Lugar finalizado ou pulado conta como resolvido. O carimbo fica rosa
        quando o continente inteiro está resolvido.
      </p>

      <div className="grid grid-cols-2 justify-items-center gap-4 sm:grid-cols-3">
        <Carimbo
          icone={<Globe size={26} />}
          titulo="Mundo"
          detalhe={mundo ? 'Completo!' : `${resolvidos}/${PLACES.length}`}
          completo={mundo}
          inclinacao={-4}
        />
        {continentes.map((c, indice) => (
          <Carimbo
            key={c.code}
            icone={<Compass size={26} />}
            titulo={c.nome}
            detalhe={c.completo ? 'Completo!' : `${c.resolvidos}/${c.total}`}
            completo={c.completo}
            inclinacao={indice % 2 === 0 ? 4 : -3}
          />
        ))}
      </div>
    </div>
  )
}