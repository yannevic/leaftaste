import { X } from 'lucide-react'
import FlagIcon from '../ui/FlagIcon'
import { CONTINENT_NAMES, placeDetail, type Place } from '../../lib/places'
import type { CountryStatus } from '../../types/country'

// Nome e cor de cada status (as mesmas cores do globo)
const STATUS_INFO: Record<CountryStatus, { rotulo: string; cor: string }> = {
  pending: { rotulo: 'Pendente', cor: '#d9d2dc' },
  in_progress: { rotulo: 'Em andamento', cor: '#fff0b8' },
  done: { rotulo: 'Finalizado', cor: '#f48fb1' },
  skipped: { rotulo: 'Pulado', cor: '#e8d6b8' },
}

type Props = {
  place: Place
  status: CountryStatus
  onClose: () => void
}

export default function PlacePanel({ place, status, onClose }: Props) {
  const info = STATUS_INFO[status]
  const detalhe = placeDetail(place)

  return (
    <aside className="fixed right-6 top-6 w-80 rounded-3xl border border-white/60 bg-white/40 p-6 shadow-xl backdrop-blur-md">
      <button
        onClick={onClose}
        className="absolute right-4 top-4 text-pink-500 hover:text-pink-700"
        aria-label="Fechar"
      >
        <X size={20} />
      </button>

      <div className="flex items-center gap-3 pr-8">
        <FlagIcon place={place} size="2.25rem" />
        <h2 className="text-2xl font-bold leading-tight text-pink-600">
          {place.name}
        </h2>
      </div>

      <p className="mt-3 text-pink-500">{CONTINENT_NAMES[place.continent]}</p>

      {place.kind === 'territory' && (
        <p className="mt-1 text-sm text-pink-400">
          Território{detalhe && ` · ${detalhe}`}
        </p>
      )}

      <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1 text-sm font-semibold text-[#5c3347]">
        <span
          className="h-3 w-3 rounded-full border border-white"
          style={{ background: info.cor }}
        />
        <span>{info.rotulo}</span>
      </div>
    </aside>
  )
}