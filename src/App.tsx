import { useState } from 'react'
import { Pause, Play, X } from 'lucide-react'
import GlobeView from './components/globe/GlobeView'
import { CONTINENT_NAMES, placeDetail, type Place } from './lib/places'
import type { CountryStatus } from './types/country'

// Status de mentirinha, só para ver as cores. Na Fase 2 virá do Firestore.
const FAKE_STATUSES: Record<string, CountryStatus> = {
  BR: 'done',
  FR: 'done',
  IT: 'done',
  JP: 'in_progress',
  MX: 'skipped',
  PT: 'in_progress',
  GF: 'in_progress',
}

function App() {
  const [selected, setSelected] = useState<Place | null>(null)
  const [autoRotate, setAutoRotate] = useState(true)

  return (
    <>
      <GlobeView
        statuses={FAKE_STATUSES}
        selectedId={selected?.id ?? null}
        autoRotate={autoRotate}
        onSelect={setSelected}
      />

      <button
        onClick={() => setAutoRotate((v) => !v)}
        className="fixed left-6 top-6 flex items-center gap-2 rounded-full border border-white/60 bg-white/40 px-4 py-2 font-semibold text-pink-600 shadow-lg backdrop-blur-md hover:bg-white/60"
      >
        {autoRotate ? <Pause size={18} /> : <Play size={18} />}
        <span>{autoRotate ? 'Pausar rotação' : 'Girar globo'}</span>
      </button>

      {selected && (
        <aside className="fixed right-6 top-6 w-80 rounded-3xl border border-white/60 bg-white/40 p-6 shadow-xl backdrop-blur-md">
          <button
            onClick={() => setSelected(null)}
            className="absolute right-4 top-4 text-pink-500 hover:text-pink-700"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
          <h2 className="text-3xl font-bold text-pink-600">{selected.name}</h2>
          <p className="mt-1 text-pink-500">
            {CONTINENT_NAMES[selected.continent]}
          </p>
          {selected.kind === 'territory' && (
            <p className="mt-2 text-sm text-pink-400">
              Território{placeDetail(selected) && ` · ${placeDetail(selected)}`}
            </p>
          )}
        </aside>
      )}
    </>
  )
}

export default App