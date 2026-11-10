import { Star, X } from 'lucide-react'
import { useAllDishes } from '../../hooks/useAllDishes'
import { PLACES_BY_ID, placeLabel } from '../../lib/places'
import { progressoPorContinente } from '../../lib/progress'
import type { CountryStatus } from '../../types/country'
import type { Dish } from '../../types/dish'

type Props = {
  uid: string
  statuses: Record<string, CountryStatus>
  onClose: () => void
}

// Media de uma lista de numeros (ou null se a lista esta vazia)
function media(numeros: number[]): number | null {
  if (numeros.length === 0) return null
  return numeros.reduce((soma, n) => soma + n, 0) / numeros.length
}

// Numero com 1 casa decimal no formato brasileiro (ou um tracinho se nao tem)
function formatar(n: number | null): string {
  if (n === null) return '—'
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
}

type PratoComMedia = { prato: Dish; media: number }

// Lista dos melhores pratos de um tipo
function ListaMelhores({
  titulo,
  pratos,
}: {
  titulo: string
  pratos: PratoComMedia[]
}) {
  return (
    <div className="mb-4">
      <h4 className="mb-2 font-semibold text-[#b0476f]">{titulo}</h4>
      {pratos.length === 0 ? (
        <p className="text-sm">Ainda não tem pratos avaliados.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {pratos.map(({ prato, media: nota }, indice) => {
            const lugar = PLACES_BY_ID[prato.placeId]
            return (
              <li
                key={prato.id}
                className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/50 px-3 py-2"
              >
                <span className="w-6 text-center text-lg font-bold text-pink-600">
                  {indice + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{prato.name}</p>
                  <p className="truncate text-xs text-[#b0476f]">
                    {lugar ? placeLabel(lugar) : prato.placeId}
                  </p>
                </div>
                <span className="flex items-center gap-1 text-sm font-semibold text-pink-600">
                  <Star size={14} />
                  {formatar(nota)}
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

export default function StatsPanel({ uid, statuses, onClose }: Props) {
  const { dishes, carregando, erro } = useAllDishes()

  // Continentes: os que mais faltam primeiro
  const continentes = [...progressoPorContinente(statuses)].sort(
    (a, b) => b.total - b.resolvidos - (a.total - a.resolvidos),
  )

  // Quem e o(a) parceiro(a): o uid de alguma nota que nao seja o meu
  let outroUid: string | null = null
  for (const prato of dishes) {
    const achou = Object.keys(prato.ratings).find((u) => u !== uid)
    if (achou) {
      outroUid = achou
      break
    }
  }

  const minhas = dishes
    .map((d) => d.ratings[uid]?.score)
    .filter((n): n is number => n !== undefined)
  const dele = outroUid
    ? dishes
        .map((d) => d.ratings[outroUid]?.score)
        .filter((n): n is number => n !== undefined)
    : []

  // Media das notas de cada prato (juntando as notas dos dois)
  const comMedia: PratoComMedia[] = []
  for (const prato of dishes) {
    const m = media(Object.values(prato.ratings).map((r) => r.score))
    if (m !== null) comMedia.push({ prato, media: m })
  }
  comMedia.sort((a, b) => b.media - a.media)
  const melhoresDoces = comMedia.filter((p) => p.prato.type === 'doce').slice(0, 5)
  const melhoresSalgados = comMedia
    .filter((p) => p.prato.type === 'salgado')
    .slice(0, 5)

  return (
    <div className="fixed left-1/2 top-1/2 z-20 max-h-[80vh] w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-white/60 bg-white/40 p-5 text-[#5c3347] shadow-xl backdrop-blur-md">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-pink-600">Estatísticas</h2>
        <button
          onClick={onClose}
          aria-label="Fechar estatísticas"
          className="rounded-full p-1 text-pink-600 hover:bg-white/60"
        >
          <X size={20} />
        </button>
      </div>

      {/* 1) Quanto falta em cada continente */}
      <h3 className="mb-2 text-lg font-bold text-pink-600">
        Faltam por continente
      </h3>
      <div className="mb-5 flex flex-col gap-3">
        {continentes.map((c) => {
          const faltam = c.total - c.resolvidos
          const porcento = Math.round((c.resolvidos / c.total) * 100)
          return (
            <div key={c.code}>
              <div className="flex justify-between text-sm">
                <span className="font-semibold">{c.nome}</span>
                <span className="text-[#b0476f]">
                  {faltam === 0 ? 'Completo!' : `faltam ${faltam}`}
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/60">
                <div
                  className="h-full rounded-full bg-[#f48fb1]"
                  style={{ width: `${porcento}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {carregando && <p className="text-sm">Carregando...</p>}

      {erro && (
        <p role="alert" className="text-sm text-[#c2255c]">
          Não foi possível carregar os pratos.
        </p>
      )}

      {!carregando && !erro && (
        <>
          {/* 2) Nota media de cada um */}
          <h3 className="mb-2 text-lg font-bold text-pink-600">Nota média</h3>
          <div className="mb-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/60 bg-white/50 px-3 py-2 text-center">
              <p className="text-2xl font-bold text-pink-600">
                {formatar(media(minhas))}
              </p>
              <p className="text-sm">Você ({minhas.length} notas)</p>
            </div>
            <div className="rounded-2xl border border-white/60 bg-white/50 px-3 py-2 text-center">
              <p className="text-2xl font-bold text-pink-600">
                {formatar(media(dele))}
              </p>
              <p className="text-sm">Parceiro(a) ({dele.length} notas)</p>
            </div>
          </div>

          {/* 3) Melhores pratos */}
          <h3 className="mb-2 text-lg font-bold text-pink-600">
            Melhores pratos
          </h3>
          <p className="mb-3 text-xs text-[#b0476f]">
            Pela média das notas dos dois.
          </p>
          <ListaMelhores titulo="Doces" pratos={melhoresDoces} />
          <ListaMelhores titulo="Salgados" pratos={melhoresSalgados} />
        </>
      )}
    </div>
  )
}