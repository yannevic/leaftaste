import { useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { GripVertical, Star, X } from 'lucide-react'
import { useAllDishes } from '../../hooks/useAllDishes'
import { useRanking } from '../../hooks/useRanking'
import { PLACES_BY_ID, placeLabel } from '../../lib/places'
import type { Dish, DishType } from '../../types/dish'

type Props = {
  uid: string
  onClose: () => void
}

const ABAS: { tipo: DishType; nome: string }[] = [
  { tipo: 'doce', nome: 'Doces' },
  { tipo: 'salgado', nome: 'Salgados' },
]

// Uma linha do ranking que pode ser arrastada
function LinhaPrato({
  prato,
  indice,
  uid,
}: {
  prato: Dish
  indice: number
  uid: string
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: prato.id })

  const lugar = PLACES_BY_ID[prato.placeId]
  const nota = prato.ratings[uid]?.score

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        transition,
        zIndex: isDragging ? 10 : undefined,
      }}
      className={`flex items-center gap-3 rounded-2xl border border-white/60 bg-white/50 px-3 py-2 ${
        isDragging ? 'shadow-xl' : ''
      }`}
    >
      {/* A alca: so ela inicia o arrastar */}
      <button
        {...attributes}
        {...listeners}
        aria-label={`Arrastar ${prato.name}`}
        style={{ touchAction: 'none' }}
        className="cursor-grab rounded-full p-1 text-pink-600 hover:bg-white/60 active:cursor-grabbing"
      >
        <GripVertical size={18} />
      </button>
      <span className="w-6 text-center text-lg font-bold text-pink-600">
        {indice + 1}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{prato.name}</p>
        <p className="truncate text-xs text-[#b0476f]">
          {lugar ? placeLabel(lugar) : prato.placeId}
        </p>
      </div>
      {nota !== undefined && (
        <span className="flex items-center gap-1 text-sm font-semibold text-pink-600">
          <Star size={14} />
          {nota.toLocaleString('pt-BR')}
        </span>
      )}
    </li>
  )
}

export default function RankingPanel({ uid, onClose }: Props) {
  const [tipo, setTipo] = useState<DishType>('doce')
  const [erroSalvar, setErroSalvar] = useState(false)
  const { dishes, carregando: lendoPratos, erro: erroPratos } = useAllDishes()
  const {
    ranking,
    carregando: lendoRanking,
    erro: erroRanking,
    salvarOrdem,
  } = useRanking(uid)

  // Sensores: mouse/toque (so depois de mexer 5px, para nao confundir com clique)
  // e teclado (setas), para quem preferir
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  // Pratos do tipo escolhido
  const doTipo = dishes.filter((d) => d.type === tipo)
  const porId = new Map(doTipo.map((d) => [d.id, d]))

  // 1) Primeiro os que ja estao no ranking, na ordem salva
  const ordenados: Dish[] = []
  for (const id of ranking[tipo]) {
    const prato = porId.get(id)
    if (prato) {
      ordenados.push(prato)
      porId.delete(id) // ja entrou, sai da lista de "novos"
    }
  }
  // 2) Depois os pratos novos (fora do ranking), do mais antigo ao mais recente
  const novos = [...porId.values()].sort(
    (a, b) =>
      (a.cookedAt?.toMillis() ?? Number.MAX_SAFE_INTEGER) -
      (b.cookedAt?.toMillis() ?? Number.MAX_SAFE_INTEGER),
  )
  ordenados.push(...novos)

  // Soltou o prato: calcula a nova ordem e salva
  async function terminouArrastar(evento: DragEndEvent) {
    const { active, over } = evento
    if (!over || active.id === over.id) return

    const ids = ordenados.map((d) => d.id)
    const de = ids.indexOf(String(active.id))
    const para = ids.indexOf(String(over.id))
    if (de === -1 || para === -1) return

    try {
      setErroSalvar(false)
      await salvarOrdem(tipo, arrayMove(ids, de, para))
    } catch (err) {
      console.error('Erro ao salvar ranking:', err)
      setErroSalvar(true)
    }
  }

  const carregando = lendoPratos || lendoRanking
  const erro = erroPratos || erroRanking

  return (
    <div className="fixed left-1/2 top-1/2 z-20 max-h-[80vh] w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-white/60 bg-white/40 p-5 text-[#5c3347] shadow-xl backdrop-blur-md">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-pink-600">Meu ranking</h2>
        <button
          onClick={onClose}
          aria-label="Fechar ranking"
          className="rounded-full p-1 text-pink-600 hover:bg-white/60"
        >
          <X size={20} />
        </button>
      </div>

      <div className="mb-4 flex gap-2">
        {ABAS.map((aba) => (
          <button
            key={aba.tipo}
            onClick={() => setTipo(aba.tipo)}
            className={`rounded-full px-4 py-1.5 font-semibold ${
              tipo === aba.tipo
                ? 'bg-[#f48fb1] text-white'
                : 'bg-white/50 text-pink-600 hover:bg-white/70'
            }`}
          >
            {aba.nome}
          </button>
        ))}
      </div>

      {carregando && <p className="text-sm">Carregando...</p>}

      {erro && (
        <p role="alert" className="text-sm text-[#c2255c]">
          Não foi possível carregar o ranking.
        </p>
      )}

      {erroSalvar && (
        <p role="alert" className="mb-2 text-sm text-[#c2255c]">
          Não foi possível salvar a nova ordem.
        </p>
      )}

      {!carregando && !erro && ordenados.length === 0 && (
        <p className="text-sm">Ainda não tem nenhum prato desse tipo.</p>
      )}

      <DndContext
        sensors={sensores}
        collisionDetection={closestCenter}
        onDragEnd={terminouArrastar}
      >
        <SortableContext
          items={ordenados.map((d) => d.id)}
          strategy={verticalListSortingStrategy}
        >
          <ol className="flex flex-col gap-2">
            {ordenados.map((prato, indice) => (
              <LinhaPrato
                key={prato.id}
                prato={prato}
                indice={indice}
                uid={uid}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
    </div>
  )
}