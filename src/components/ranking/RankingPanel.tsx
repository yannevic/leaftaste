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
import { useOtherRanking } from '../../hooks/useOtherRanking'
import { useRanking } from '../../hooks/useRanking'
import { PLACES_BY_ID, placeLabel } from '../../lib/places'
import type { Dish, DishType } from '../../types/dish'

type Props = {
  uid: string
  onClose: () => void
}

type Quem = 'meu' | 'outro'

const ABAS: { tipo: DishType; nome: string }[] = [
  { tipo: 'doce', nome: 'Doces' },
  { tipo: 'salgado', nome: 'Salgados' },
]

// Monta a lista na ordem do ranking: primeiro os ids salvos, depois os
// pratos novos (fora do ranking), do mais antigo ao mais recente
function ordenar(dishes: Dish[], tipo: DishType, ids: string[]): Dish[] {
  const porId = new Map(
    dishes.filter((d) => d.type === tipo).map((d) => [d.id, d]),
  )
  const ordenados: Dish[] = []
  for (const id of ids) {
    const prato = porId.get(id)
    if (prato) {
      ordenados.push(prato)
      porId.delete(id)
    }
  }
  const novos = [...porId.values()].sort(
    (a, b) =>
      (a.cookedAt?.toMillis() ?? Number.MAX_SAFE_INTEGER) -
      (b.cookedAt?.toMillis() ?? Number.MAX_SAFE_INTEGER),
  )
  return [...ordenados, ...novos]
}

// Conteudo de uma linha (igual para a lista arrastavel e a so de leitura)
function ConteudoLinha({
  prato,
  indice,
  nota,
}: {
  prato: Dish
  indice: number
  nota: number | undefined
}) {
  const lugar = PLACES_BY_ID[prato.placeId]
  return (
    <>
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
    </>
  )
}

// Linha que pode ser arrastada (meu ranking)
function LinhaArrastavel({
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
      <ConteudoLinha
        prato={prato}
        indice={indice}
        nota={prato.ratings[uid]?.score}
      />
    </li>
  )
}

// Linha so para olhar (ranking do outro)
function LinhaLeitura({
  prato,
  indice,
  uidNota,
}: {
  prato: Dish
  indice: number
  uidNota: string | null
}) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/50 px-3 py-2">
      <ConteudoLinha
        prato={prato}
        indice={indice}
        nota={uidNota ? prato.ratings[uidNota]?.score : undefined}
      />
    </li>
  )
}

export default function RankingPanel({ uid, onClose }: Props) {
  const [quem, setQuem] = useState<Quem>('meu')
  const [tipo, setTipo] = useState<DishType>('doce')
  const [erroSalvar, setErroSalvar] = useState(false)
  const { dishes, carregando: lendoPratos, erro: erroPratos } = useAllDishes()
  const {
    ranking,
    carregando: lendoRanking,
    erro: erroRanking,
    salvarOrdem,
  } = useRanking(uid)
  const {
    outro,
    carregando: lendoOutro,
    erro: erroOutro,
  } = useOtherRanking(uid)

  // Sensores: mouse/toque (so depois de mexer 5px, para nao confundir com clique)
  // e teclado (setas), para quem preferir
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const meuOrdenado = ordenar(dishes, tipo, ranking[tipo])
  const outroOrdenado = ordenar(dishes, tipo, outro?.ranking[tipo] ?? [])

  // Quem e o outro: pelo documento de ranking dele; se ele ainda nao tem,
  // tenta achar pelo uid de alguma nota que nao seja a minha
  let outroUid: string | null = outro?.uid ?? null
  if (!outroUid) {
    for (const prato of dishes) {
      const achou = Object.keys(prato.ratings).find((u) => u !== uid)
      if (achou) {
        outroUid = achou
        break
      }
    }
  }

  // Soltou o prato: calcula a nova ordem e salva
  async function terminouArrastar(evento: DragEndEvent) {
    const { active, over } = evento
    if (!over || active.id === over.id) return

    const ids = meuOrdenado.map((d) => d.id)
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

  const verMeu = quem === 'meu'
  const lista = verMeu ? meuOrdenado : outroOrdenado
  const carregando = lendoPratos || lendoRanking || (!verMeu && lendoOutro)
  const erro = erroPratos || erroRanking || (!verMeu && erroOutro)

  return (
    <div className="fixed left-1/2 top-1/2 z-20 max-h-[80vh] w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-white/60 bg-white/40 p-5 text-[#5c3347] shadow-xl backdrop-blur-md">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-pink-600">
          {verMeu ? 'Meu ranking' : 'Ranking do(a) parceiro(a)'}
        </h2>
        <button
          onClick={onClose}
          aria-label="Fechar ranking"
          className="rounded-full p-1 text-pink-600 hover:bg-white/60"
        >
          <X size={20} />
        </button>
      </div>

      {/* De quem e o ranking */}
      <div className="mb-3 flex gap-2">
        <button
          onClick={() => setQuem('meu')}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
            verMeu
              ? 'bg-[#b0476f] text-white'
              : 'bg-white/50 text-[#b0476f] hover:bg-white/70'
          }`}
        >
          Meu
        </button>
        <button
          onClick={() => setQuem('outro')}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
            !verMeu
              ? 'bg-[#b0476f] text-white'
              : 'bg-white/50 text-[#b0476f] hover:bg-white/70'
          }`}
        >
          Parceiro(a)
        </button>
      </div>

      {/* Doces ou salgados */}
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

      {!verMeu && !carregando && !erro && !outro && lista.length > 0 && (
        <p className="mb-2 text-xs text-[#b0476f]">
          O(a) parceiro(a) ainda não montou o ranking: está na ordem em que os
          pratos foram feitos.
        </p>
      )}

      {!carregando && !erro && lista.length === 0 && (
        <p className="text-sm">Ainda não tem nenhum prato desse tipo.</p>
      )}

      {verMeu ? (
        <DndContext
          sensors={sensores}
          collisionDetection={closestCenter}
          onDragEnd={terminouArrastar}
        >
          <SortableContext
            items={meuOrdenado.map((d) => d.id)}
            strategy={verticalListSortingStrategy}
          >
            <ol className="flex flex-col gap-2">
              {meuOrdenado.map((prato, indice) => (
                <LinhaArrastavel
                  key={prato.id}
                  prato={prato}
                  indice={indice}
                  uid={uid}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      ) : (
        <ol className="flex flex-col gap-2">
          {outroOrdenado.map((prato, indice) => (
            <LinhaLeitura
              key={prato.id}
              prato={prato}
              indice={indice}
              uidNota={outroUid}
            />
          ))}
        </ol>
      )}
    </div>
  )
}
