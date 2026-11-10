import { useState } from 'react'
import { ChevronDown, Sparkles } from 'lucide-react'
import { sugerirPratos } from '../../lib/ai'
import { salvarSugestoes } from '../../lib/dishes'
import { usePlaceSuggestions } from '../../hooks/usePlaceSuggestions'
import type { Place } from '../../lib/places'
import type { Sugestao } from '../../types/suggestion'

type Props = {
  place: Place
}

function ListaSugestoes({
  titulo,
  itens,
}: {
  titulo: string
  itens: Sugestao[]
}) {
  if (itens.length === 0) return null
  return (
    <div className="mt-3">
      <p className="text-sm font-bold text-[#b0476f]">{titulo}</p>
      <ul className="mt-1 space-y-2">
        {itens.map((s) => (
          <li
            key={s.name}
            className="rounded-2xl bg-white/50 px-3 py-2 text-[#5c3347]"
          >
            <p className="font-semibold">{s.name}</p>
            {s.description && <p className="text-sm">{s.description}</p>}
            <p className="mt-1 text-xs text-[#b0476f]">
              {s.difficulty === 'facil' ? 'Fácil' : 'Médio'}
              {s.timeMinutes > 0 && ` · ${s.timeMinutes} min`}
              {!s.easyIngredients && ' · ingredientes mais difíceis'}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function SuggestionsSection({ place }: Props) {
  const { sugestoes, carregando } = usePlaceSuggestions(place.id)
  const [aberto, setAberto] = useState(true)
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState('')

  async function gerar() {
    setErro('')
    setGerando(true)
    try {
      const lista = await sugerirPratos(place.name)
      await salvarSugestoes(place.id, lista)
    } catch (err) {
      console.error('Erro ao gerar sugestoes:', err)
      setErro(
        'A IA não está disponível agora. Tente de novo mais tarde, ou registre o prato à mão.',
      )
    } finally {
      setGerando(false)
    }
  }

  return (
    <div className="mt-5">
      {/* O título vira um botão: clicar abre ou fecha a seção */}
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        aria-expanded={aberto}
        className="flex w-full items-center justify-between text-left"
      >
        <h3 className="text-lg font-bold text-pink-600">Sugestões</h3>
        <ChevronDown
          size={20}
          className={`text-pink-500 transition-transform ${
            aberto ? 'rotate-180' : ''
          }`}
        />
      </button>

      {aberto && (
        <>
          {!carregando && sugestoes.length === 0 && (
            <button
              type="button"
              onClick={gerar}
              disabled={gerando}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/70 bg-white/50 py-2 font-semibold text-[#b0476f] hover:bg-white/70 disabled:opacity-60"
            >
              <Sparkles size={18} />
              <span>{gerando ? 'Pensando...' : 'Sugerir pratos'}</span>
            </button>
          )}

          {erro && (
            <p role="alert" className="mt-2 text-sm text-[#c2255c]">
              {erro}
            </p>
          )}

          <ListaSugestoes
            titulo="Doces"
            itens={sugestoes.filter((s) => s.type === 'doce')}
          />
          <ListaSugestoes
            titulo="Salgados"
            itens={sugestoes.filter((s) => s.type === 'salgado')}
          />
        </>
      )}
    </div>
  )
}
