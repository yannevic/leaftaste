import { useState } from 'react'
import { Star } from 'lucide-react'

type Props = {
  value: number // 0 = sem nota; vai de 0,5 em 0,5 até 5
  onChange?: (valor: number) => void // se não vier, as estrelas só mostram
  size?: number
}

export default function StarRating({ value, onChange, size = 20 }: Props) {
  const [hover, setHover] = useState<number | null>(null)
  const mostrado = hover ?? value
  const editavel = onChange !== undefined

  return (
    <div
      className="inline-flex"
      role={editavel ? 'group' : 'img'}
      aria-label={editavel ? 'Escolha a nota' : `${value} de 5 estrelas`}
      onMouseLeave={() => setHover(null)}
    >
      {[1, 2, 3, 4, 5].map((estrela) => {
        // quanto desta estrela fica pintada: 0, 0,5 ou 1
        const pintada = Math.max(0, Math.min(1, mostrado - (estrela - 1)))

        return (
          <span
            key={estrela}
            className="relative inline-block"
            style={{ width: size, height: size }}
          >
            {/* estrela vazia, só o contorno */}
            <Star size={size} className="text-[#e7b4c8]" />

            {/* estrela cheia, cortada na largura que deve ficar pintada */}
            <span
              className="absolute left-0 top-0 h-full overflow-hidden"
              style={{ width: `${pintada * 100}%` }}
            >
              <Star
                size={size}
                className="max-w-none text-[#f48fb1]"
                fill="currentColor"
              />
            </span>

            {/* duas áreas clicáveis: metade esquerda e metade direita */}
            {editavel && (
              <>
                <button
                  type="button"
                  aria-label={`${estrela - 0.5} estrelas`}
                  className="absolute left-0 top-0 h-full w-1/2 cursor-pointer"
                  onMouseEnter={() => setHover(estrela - 0.5)}
                  onClick={() => onChange?.(estrela - 0.5)}
                />
                <button
                  type="button"
                  aria-label={`${estrela} estrelas`}
                  className="absolute right-0 top-0 h-full w-1/2 cursor-pointer"
                  onMouseEnter={() => setHover(estrela)}
                  onClick={() => onChange?.(estrela)}
                />
              </>
            )}
          </span>
        )
      })}
    </div>
  )
}