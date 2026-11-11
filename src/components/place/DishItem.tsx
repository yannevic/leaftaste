import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import RecipeChat from './RecipeChat'
import StarRating from '../ui/StarRating'
import { rateDish } from '../../lib/dishes'
import type { Dish } from '../../types/dish'

// 3,5 vira "3,5" e 4 vira "4"
function formatarNota(nota: number): string {
  return nota.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
}

type Props = {
  dish: Dish
  uid: string // quem está logado
  lugar: string // nome do lugar do prato (usado pelo chat de receita)
}

export default function DishItem({ dish, uid, lugar }: Props) {
  const ratings = dish.ratings ?? {}
  const minha = ratings[uid]
  // a avaliação da outra pessoa (só existem duas contas)
  const outra = Object.entries(ratings).find(([id]) => id !== uid)?.[1]

  const [editando, setEditando] = useState(false)
  const [score, setScore] = useState(0)
  const [comentario, setComentario] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [chatAberto, setChatAberto] = useState(false)

  function abrirEdicao() {
    // começa com o que já estava salvo (ou vazio, se ainda não avaliou)
    setScore(minha?.score ?? 0)
    setComentario(minha?.comment ?? '')
    setErro('')
    setEditando(true)
  }

  async function salvar() {
    if (score === 0) {
      setErro('Escolha uma nota.')
      return
    }
    setErro('')
    setEnviando(true)
    try {
      await rateDish(dish.id, uid, score, comentario.trim())
      setEditando(false)
    } catch (err) {
      console.error('Erro ao salvar nota:', err)
      setErro('Não foi possível salvar. Tente de novo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <li className="rounded-2xl bg-white/50 px-3 py-2 text-[#5c3347]">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold">{dish.name}</span>
        <span className="flex shrink-0 gap-1 text-xs font-semibold">
          <span className="rounded-full bg-[#f48fb1]/30 px-2 py-0.5 text-[#b0476f]">
            {dish.type === 'doce' ? 'Doce' : 'Salgado'}
          </span>
          {dish.isExtra && (
            <span className="rounded-full bg-[#fff0b8] px-2 py-0.5 text-[#8a6d1d]">
              Extra
            </span>
          )}
        </span>
      </div>

      {dish.recipe && (
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer font-semibold text-[#b0476f]">
            <span>Ver receita</span>
          </summary>
          <p className="mt-1 whitespace-pre-wrap wrap-break-word">
            {dish.recipe}
          </p>
        </details>
      )}

      {/* Chat de receita: abre e fecha. Fechar apaga a conversa. */}
      <button
        type="button"
        onClick={() => setChatAberto(!chatAberto)}
        aria-expanded={chatAberto}
        className="mt-2 flex items-center gap-1 text-sm font-semibold text-[#b0476f] hover:text-pink-600"
      >
        <MessageCircle size={16} />
        <span>{chatAberto ? 'Fechar chat' : 'Conversar sobre a receita'}</span>
      </button>
      {chatAberto && (
        <RecipeChat
          dishId={dish.id}
          prato={dish.name}
          lugar={lugar}
          temReceita={dish.recipe.trim() !== ''}
        />
      )}

      <div className="mt-2 space-y-2 text-sm">
        {/* A minha avaliação */}
        <div>
          <p className="text-xs font-semibold text-[#b0476f]">Você</p>

          {editando ? (
            <div className="mt-1 space-y-2">
              <StarRating value={score} onChange={setScore} size={26} />
              <textarea
                placeholder="Comentário (opcional)"
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                rows={2}
                className="w-full rounded-2xl border border-white/70 bg-white/60 px-3 py-2 text-[#5c3347] placeholder:text-[#b0476f]/50 outline-none focus:border-[#f48fb1] focus:ring-2 focus:ring-[#f48fb1]/40"
              />
              {erro && (
                <p role="alert" className="text-[#c2255c]">
                  {erro}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={salvar}
                  disabled={enviando}
                  className="flex-1 rounded-2xl bg-[#f48fb1] py-1.5 font-semibold text-white shadow-md transition hover:bg-[#ee7ba3] disabled:opacity-60"
                >
                  <span>{enviando ? 'Salvando...' : 'Salvar'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditando(false)}
                  disabled={enviando}
                  className="rounded-2xl border border-white/70 bg-white/50 px-3 py-1.5 font-semibold text-[#b0476f] hover:bg-white/70 disabled:opacity-60"
                >
                  <span>Cancelar</span>
                </button>
              </div>
            </div>
          ) : minha ? (
            <div className="mt-1">
              <div className="flex items-center gap-2">
                <StarRating value={minha.score} size={16} />
                <span className="font-semibold">
                  {formatarNota(minha.score)}
                </span>
              </div>
              {minha.comment && (
                <p className="mt-1 whitespace-pre-wrap wrap-break-word">
                  {minha.comment}
                </p>
              )}
              <button
                type="button"
                onClick={abrirEdicao}
                className="mt-1 font-semibold text-[#b0476f] underline"
              >
                <span>Editar</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={abrirEdicao}
              className="mt-1 rounded-full border border-white/70 bg-white/60 px-3 py-1 font-semibold text-[#b0476f] hover:bg-white/80"
            >
              <span>Avaliar</span>
            </button>
          )}
        </div>

        {/* A avaliação da outra pessoa (só leitura) */}
        <div>
          <p className="text-xs font-semibold text-[#b0476f]">Parceiro(a)</p>
          {outra ? (
            <div className="mt-1">
              <div className="flex items-center gap-2">
                <StarRating value={outra.score} size={16} />
                <span className="font-semibold">
                  {formatarNota(outra.score)}
                </span>
              </div>
              {outra.comment && (
                <p className="mt-1 whitespace-pre-wrap wrap-break-word">
                  {outra.comment}
                </p>
              )}
            </div>
          ) : (
            <p className="mt-1 text-pink-400">Ainda não avaliou.</p>
          )}
        </div>
      </div>
    </li>
  )
}
