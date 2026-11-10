import { useState, type FormEvent } from 'react'
import { addDish } from '../../lib/dishes'
import type { CountryStatus } from '../../types/country'
import type { DishType } from '../../types/dish'

type Props = {
  placeId: string
  statusAtual: CountryStatus
  onDone: () => void // chamada depois de salvar ou ao cancelar
}

const CAMPO =
  'w-full rounded-2xl border border-white/70 bg-white/60 px-3 py-2 text-[#5c3347] placeholder:text-[#b0476f]/50 outline-none focus:border-[#f48fb1] focus:ring-2 focus:ring-[#f48fb1]/40'

export default function DishForm({ placeId, statusAtual, onDone }: Props) {
  const [name, setName] = useState('')
  const [type, setType] = useState<DishType>('doce')
  const [isExtra, setIsExtra] = useState(false)
  const [recipe, setRecipe] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (name.trim() === '') {
      setErro('Dê um nome ao prato.')
      return
    }
    setErro('')
    setEnviando(true)
    try {
      await addDish(
        { placeId, type, isExtra, name: name.trim(), recipe: recipe.trim() },
        statusAtual,
      )
      onDone()
    } catch (err) {
      console.error('Erro ao salvar prato:', err)
      setErro('Não foi possível salvar. Tente de novo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={salvar} className="mt-3 space-y-3">
      <input
        type="text"
        placeholder="Nome do prato"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className={CAMPO}
      />

      <div className="flex gap-2">
        {(['doce', 'salgado'] as const).map((opcao) => (
          <button
            key={opcao}
            type="button"
            onClick={() => setType(opcao)}
            aria-pressed={type === opcao}
            className={`flex-1 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
              type === opcao
                ? 'border-[#f48fb1] bg-[#f48fb1] text-white'
                : 'border-white/70 bg-white/50 text-[#b0476f] hover:bg-white/70'
            }`}
          >
            {opcao === 'doce' ? 'Doce' : 'Salgado'}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2 text-sm text-[#5c3347]">
        <input
          type="checkbox"
          checked={isExtra}
          onChange={(e) => setIsExtra(e.target.checked)}
          className="h-4 w-4 accent-[#f48fb1]"
        />
        <span>Prato extra (opcional)</span>
      </label>

      <textarea
        placeholder="Receita (pode deixar em branco por enquanto)"
        value={recipe}
        onChange={(e) => setRecipe(e.target.value)}
        rows={4}
        className={CAMPO}
      />

      {erro && (
        <p role="alert" className="text-sm text-[#c2255c]">
          {erro}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={enviando}
          className="flex-1 rounded-2xl bg-[#f48fb1] py-2 font-semibold text-white shadow-md transition hover:bg-[#ee7ba3] disabled:opacity-60"
        >
          <span>{enviando ? 'Salvando...' : 'Salvar prato'}</span>
        </button>
        <button
          type="button"
          onClick={onDone}
          disabled={enviando}
          className="rounded-2xl border border-white/70 bg-white/50 px-4 py-2 font-semibold text-[#b0476f] hover:bg-white/70 disabled:opacity-60"
        >
          <span>Cancelar</span>
        </button>
      </div>
    </form>
  )
}