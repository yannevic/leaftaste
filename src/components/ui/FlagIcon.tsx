import 'flag-icons/css/flag-icons.min.css'
import { Flag } from 'lucide-react'
import type { Place } from '../../lib/places'

// Lugares que o pacote flag-icons não tem bandeira própria
const SEM_BANDEIRA = new Set([
  'BQ-BO',
  'BQ-SA',
  'BQ-SE',
  'XC',
  'XS',
  'XA',
  'XL',
])

// Descobre qual código de bandeira usar (ou null se não tiver nenhum)
function codigoDaBandeira(place: Place): string | null {
  if (!SEM_BANDEIRA.has(place.id)) return place.id.toLowerCase()
  if (place.parent) return place.parent.toLowerCase()
  return null
}

type Props = {
  place: Place
  size?: string // tamanho da bandeira, ex.: '2rem'
}

export default function FlagIcon({ place, size = '2rem' }: Props) {
  const codigo = codigoDaBandeira(place)

  // Com bandeira: usa a imagem SVG do pacote
  if (codigo) {
    return (
      <span
        className={`fi fi-${codigo} rounded-md shadow-sm`}
        style={{ fontSize: size }}
        role="img"
        aria-label={`Bandeira: ${place.name}`}
      />
    )
  }

  // Sem bandeira: ícone neutro
  return (
    <span
      className="inline-flex items-center justify-center rounded-md border border-white/70 bg-white/60 text-[#b0476f] shadow-sm"
      style={{ fontSize: size, width: '1.3333em', height: '1em' }}
      role="img"
      aria-label={`Sem bandeira: ${place.name}`}
    >
      <Flag style={{ width: '0.6em', height: '0.6em' }} />
    </span>
  )
}