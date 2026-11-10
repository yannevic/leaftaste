import { useState } from 'react'
import { Check, ChevronDown, RefreshCw, Sparkles } from 'lucide-react'
import { sugerirNovos, sugerirPratos } from '../../lib/ai'
import {
  alternarMantida,
  escolherSugestao,
  salvarSugestoes,
} from '../../lib/dishes'
import { usePlaceSuggestions } from '../../hooks/usePlaceSuggestions'
import type { Place } from '../../lib/places'
import type { CountryStatus } from '../../types/country'
import type { Dish } from '../../types/dish'
import type { Sugestao } from '../../types/suggestion'

type Props = {
  place: Place
  dishes: Dish[] // pratos que o lugar já tem
  status: CountryStatus // status atual do lugar
}

// Quantas sugestões de cada tipo a lista deve ter
const META_POR_TIPO = 4

function ListaSugestoes({
  titulo,
  itens,
  ocupado,
  onAlternar,
  onEscolher,
}: {
  titulo: string
  itens: Sugestao[]
  ocupado: boolean // true enquanto a IA ou um salvamento está trabalhando
  // funções que recebem o nome da sugestão clicada
  onAlternar: (nome: string) => void
  onEscolher: (nome: string) => void
}) {
  if (itens.length === 0) return null
  return (
    <div className="mt-3">
      <p className="text-sm font-bold text-[#b0476f]">{titulo}</p>
      <ul className="mt-1 space-y-2">
        {itens.map((s) => (
          <li
            key={s.name}
            className={`rounded-2xl px-3 py-2 text-[#5c3347] ${
              s.escolhida
                ? 'bg-[#f48fb1]/30 ring-2 ring-[#f48fb1]'
                : s.mantida
                  ? 'bg-white/70 ring-2 ring-pink-300'
                  : 'bg-white/50'
            }`}
          >
            <p className="font-semibold">{s.name}</p>
            {s.description && <p className="text-sm">{s.description}</p>}
            <p className="mt-1 text-xs text-[#b0476f]">
              {s.difficulty === 'facil' ? 'Fácil' : 'Médio'}
              {s.timeMinutes > 0 && ` · ${s.timeMinutes} min`}
              {!s.easyIngredients && ' · ingredientes mais difíceis'}
            </p>

            {s.escolhida ? (
              // Já escolhida: só mostra o selo (ela vira prato em "Pratos")
              <p className="mt-2 flex items-center gap-1 text-sm font-semibold text-pink-600">
                <Check size={16} />
                <span>Escolhida</span>
              </p>
            ) : (
              <>
                {/* Checkzinho: marcar = "quero manter essa opção" */}
                <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-[#b0476f]">
                  <input
                    type="checkbox"
                    checked={s.mantida === true}
                    onChange={() => onAlternar(s.name)}
                    className="h-4 w-4 accent-pink-500"
                  />
                  <span>Manter como opção</span>
                </label>
                <button
                  type="button"
                  onClick={() => onEscolher(s.name)}
                  disabled={ocupado}
                  className="mt-2 w-full rounded-2xl bg-[#f48fb1] py-1.5 text-sm font-semibold text-white transition hover:bg-[#ee7ba3] disabled:opacity-60"
                >
                  <span>Escolher de vez</span>
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function SuggestionsSection({ place, dishes, status }: Props) {
  const { sugestoes, carregando } = usePlaceSuggestions(place.id)
  const [aberto, setAberto] = useState(true)
  const [gerando, setGerando] = useState(false)
  const [escolhendo, setEscolhendo] = useState(false)
  const [erro, setErro] = useState('')

  // true se a IA ou um salvamento está trabalhando: desativa os botões
  const ocupado = gerando || escolhendo

  // Só dá para atualizar se existir pelo menos uma sugestão sem check
  // e que ainda não foi escolhida de vez
  const podeAtualizar = sugestoes.some((s) => !s.mantida && !s.escolhida)

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

  async function atualizar() {
    setErro('')
    setGerando(true)
    try {
      // 1) As que FICAM: marcadas com o check ou já escolhidas de vez
      const ficam = sugestoes.filter((s) => s.mantida || s.escolhida)

      // 2) Quantas faltam de cada tipo para voltar a 4 doces e 4 salgados
      const docesQueFicam = ficam.filter((s) => s.type === 'doce').length
      const salgadosQueFicam = ficam.filter((s) => s.type === 'salgado').length
      const faltamDoces = Math.max(0, META_POR_TIPO - docesQueFicam)
      const faltamSalgados = Math.max(0, META_POR_TIPO - salgadosQueFicam)

      // 3) Pede à IA só o que falta, mandando TODOS os nomes atuais
      //    (inclusive os que vão sair) para ela não repetir nenhum
      const novas = await sugerirNovos(
        place.name,
        faltamDoces,
        faltamSalgados,
        sugestoes.map((s) => s.name),
      )

      // 4) Junta as que ficaram com as novas e grava a lista inteira
      await salvarSugestoes(place.id, [...ficam, ...novas])

      // Se vier menos do que faltava, avisa em vez de ficar quieto
      const faltavam = faltamDoces + faltamSalgados
      if (novas.length < faltavam) {
        setErro(
          `A IA só trouxe ${novas.length} de ${faltavam} opções novas. Clique em atualizar de novo para completar.`,
        )
      }
    } catch (err) {
      console.error('Erro ao atualizar sugestoes:', err)
      setErro(
        'Não deu para buscar opções novas agora. As atuais continuam salvas. Tente de novo mais tarde.',
      )
    } finally {
      setGerando(false)
    }
  }

  async function alternar(nome: string) {
    setErro('')
    try {
      await alternarMantida(place.id, sugestoes, nome)
    } catch (err) {
      console.error('Erro ao marcar sugestao:', err)
      setErro('Não deu para salvar a marcação. Tente de novo.')
    }
  }

  async function escolher(nome: string) {
    const sugestao = sugestoes.find((s) => s.name === nome)
    if (!sugestao) return

    // Avisa antes de registrar, e já diz se vai entrar como extra
    const vagaOcupada = dishes.some(
      (p) => p.type === sugestao.type && !p.isExtra,
    )
    const aviso = vagaOcupada
      ? ' Como o lugar já tem o prato principal desse tipo, ele entra como extra.'
      : ''
    const confirmou = window.confirm(
      `Registrar "${sugestao.name}" como prato deste lugar?${aviso}`,
    )
    if (!confirmou) return

    setErro('')
    setEscolhendo(true)
    try {
      await escolherSugestao(place.id, sugestoes, nome, dishes, status)
    } catch (err) {
      console.error('Erro ao escolher sugestao:', err)
      setErro('Não deu para registrar o prato. Tente de novo.')
    } finally {
      setEscolhendo(false)
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
              disabled={ocupado}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/70 bg-white/50 py-2 font-semibold text-[#b0476f] hover:bg-white/70 disabled:opacity-60"
            >
              <Sparkles size={18} />
              <span>{gerando ? 'Pensando...' : 'Sugerir pratos'}</span>
            </button>
          )}

          {sugestoes.length > 0 && (
            <>
              <button
                type="button"
                onClick={atualizar}
                disabled={ocupado || !podeAtualizar}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/70 bg-white/50 py-2 font-semibold text-[#b0476f] hover:bg-white/70 disabled:opacity-60"
              >
                <RefreshCw size={18} />
                <span>
                  {gerando ? 'Pensando...' : 'Atualizar não marcadas'}
                </span>
              </button>
              <p className="mt-1 text-xs text-[#b0476f]">
                As opções com check e as escolhidas ficam. As outras são
                trocadas por pratos novos.
              </p>
            </>
          )}

          {erro && (
            <p role="alert" className="mt-2 text-sm text-[#c2255c]">
              {erro}
            </p>
          )}

          <ListaSugestoes
            titulo="Doces"
            itens={sugestoes.filter((s) => s.type === 'doce')}
            ocupado={ocupado}
            onAlternar={alternar}
            onEscolher={escolher}
          />
          <ListaSugestoes
            titulo="Salgados"
            itens={sugestoes.filter((s) => s.type === 'salgado')}
            ocupado={ocupado}
            onAlternar={alternar}
            onEscolher={escolher}
          />
        </>
      )}
    </div>
  )
}
