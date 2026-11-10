import { useState } from 'react'
import { signOut } from 'firebase/auth'
import { Leaf, LogOut, Pause, Play } from 'lucide-react'
import GlobeView, { type FocusRequest } from './components/globe/GlobeView'
import LoginScreen from './components/auth/LoginScreen'
import PlacePanel from './components/place/PlacePanel'
import SearchBar from './components/search/SearchBar'
import { useAuth } from './hooks/useAuth'
import { usePlaces } from './hooks/usePlaces'
import { auth } from './lib/firebase'
import type { Place } from './lib/places'

function App() {
  // Todos os hooks ficam aqui em cima, antes de qualquer "return" condicional
  const { user, loading } = useAuth()
  const { statuses, erro } = usePlaces(user !== null)
  const [selected, setSelected] = useState<Place | null>(null)
  const [autoRotate, setAutoRotate] = useState(true)
  const [focus, setFocus] = useState<FocusRequest | null>(null)

  async function sair() {
    setSelected(null)
    setFocus(null)
    await signOut(auth)
  }

  // Escolheu um lugar na busca: abre o painel e pede para a câmera ir até ele
  function escolherNaBusca(place: Place) {
    setSelected(place)
    setFocus((anterior) => ({ id: place.id, n: (anterior?.n ?? 0) + 1 }))
  }

  // 1) Ainda descobrindo se tem alguém logado: tela simples de espera
  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{
          background:
            'linear-gradient(180deg, #cdb8ee 0%, #f3b8d4 55%, #ffd9c7 100%)',
        }}
      >
        <Leaf className="h-12 w-12 animate-pulse text-[#d9578a]" />
      </div>
    )
  }

  // 2) Ninguém logado: mostra o login
  if (!user) {
    return <LoginScreen />
  }

  // 3) Logado: mostra o globo
  return (
    <>
      <GlobeView
        statuses={statuses}
        selectedId={selected?.id ?? null}
        autoRotate={autoRotate}
        focusRequest={focus}
        onSelect={setSelected}
      />

      <SearchBar onSelect={escolherNaBusca} />

      <button
        onClick={() => setAutoRotate((v) => !v)}
        className="fixed left-6 top-6 flex items-center gap-2 rounded-full border border-white/60 bg-white/40 px-4 py-2 font-semibold text-pink-600 shadow-lg backdrop-blur-md hover:bg-white/60"
      >
        {autoRotate ? <Pause size={18} /> : <Play size={18} />}
        <span>{autoRotate ? 'Pausar rotação' : 'Girar globo'}</span>
      </button>

      <button
        onClick={sair}
        className="fixed left-6 top-20 flex items-center gap-2 rounded-full border border-white/60 bg-white/40 px-4 py-2 font-semibold text-pink-600 shadow-lg backdrop-blur-md hover:bg-white/60"
      >
        <LogOut size={18} />
        <span>Sair</span>
      </button>

      {erro && (
        <p
          role="alert"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-white/60 bg-white/50 px-4 py-2 text-sm text-[#c2255c] shadow-lg backdrop-blur-md"
        >
          Não foi possível carregar os lugares.
        </p>
      )}

      {selected && (
        <PlacePanel
          key={selected.id}
          place={selected}
          status={statuses[selected.id] ?? 'pending'}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}

export default App