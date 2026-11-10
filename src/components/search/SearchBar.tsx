import { useState, type KeyboardEvent } from 'react'
import { Search } from 'lucide-react'
import FlagIcon from '../ui/FlagIcon'
import { PLACES, type Place } from '../../lib/places'

// Tira acentos e deixa tudo minusculo: "França" vira "franca"
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

// Feito uma vez so, fora do componente, para a busca ser rapida
const INDICE = PLACES.map((place) => ({
  place,
  nome: normalizar(place.name),
}))

function buscar(texto: string): Place[] {
  const t = normalizar(texto.trim())
  if (t === '') return []

  const comecam = INDICE.filter((item) => item.nome.startsWith(t))
  const contem = INDICE.filter(
    (item) => !item.nome.startsWith(t) && item.nome.includes(t),
  )

  return [...comecam, ...contem].slice(0, 8).map((item) => item.place)
}

type Props = {
  onSelect: (place: Place) => void
}

export default function SearchBar({ onSelect }: Props) {
  const [texto, setTexto] = useState('')
  const [aberto, setAberto] = useState(false)
  const [destaque, setDestaque] = useState(0) // qual resultado esta marcado

  const resultados = buscar(texto)

  function escolher(place: Place) {
    onSelect(place)
    setTexto('')
    setAberto(false)
    setDestaque(0)
  }

  function aoDigitar(valor: string) {
    setTexto(valor)
    setAberto(true)
    setDestaque(0)
  }

  function aoApertarTecla(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setDestaque((d) => Math.min(d + 1, Math.max(resultados.length - 1, 0)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setDestaque((d) => Math.max(d - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const escolhido = resultados[destaque]
      if (escolhido) escolher(escolhido)
    } else if (e.key === 'Escape') {
      setAberto(false)
    }
  }

  return (
    <div className="fixed left-1/2 top-6 w-72 -translate-x-1/2">
      <label className="relative block">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#b0476f]/70" />
        <input
          type="text"
          aria-label="Buscar lugar"
          placeholder="Buscar país ou território"
          value={texto}
          onChange={(e) => aoDigitar(e.target.value)}
          onKeyDown={aoApertarTecla}
          onFocus={() => setAberto(true)}
          onBlur={() => setAberto(false)}
          className="w-full rounded-full border border-white/60 bg-white/40 py-2.5 pl-10 pr-4 text-[#5c3347] shadow-lg backdrop-blur-md outline-none placeholder:text-[#b0476f]/60 focus:border-[#f48fb1] focus:ring-2 focus:ring-[#f48fb1]/40"
        />
      </label>

      {aberto && texto.trim() !== '' && (
        <ul className="mt-2 overflow-hidden rounded-3xl border border-white/60 bg-white/60 p-1 shadow-xl backdrop-blur-md">
          {resultados.length === 0 ? (
            <li className="px-4 py-2 text-sm text-pink-400">
              Nenhum lugar encontrado.
            </li>
          ) : (
            resultados.map((place, i) => (
              <li key={place.id}>
                <button
                  type="button"
                  // onMouseDown (e nao onClick) para o clique valer antes do
                  // campo perder o foco e a lista fechar
                  onMouseDown={(e) => {
                    e.preventDefault()
                    escolher(place)
                  }}
                  onMouseEnter={() => setDestaque(i)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-[#5c3347] ${
                    i === destaque ? 'bg-[#f48fb1]/30' : ''
                  }`}
                >
                  <FlagIcon place={place} size="1.25rem" />
                  <span className="font-semibold">{place.name}</span>
                  {place.kind === 'territory' && (
                    <span className="ml-auto text-xs text-pink-400">
                      Território
                    </span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
