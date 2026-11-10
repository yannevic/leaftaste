import { useCallback, useState } from 'react'
import { signOut } from 'firebase/auth'
import {
  BarChart3,
  BookOpen,
  Dices,
  Leaf,
  LogOut,
  Pause,
  Play,
  Trophy,
} from 'lucide-react'
import GlobeView, { type FocusRequest } from './components/globe/GlobeView'
import LoginScreen from './components/auth/LoginScreen'
import PlacePanel from './components/place/PlacePanel'
import RankingPanel from './components/ranking/RankingPanel'
import SearchBar from './components/search/SearchBar'
import StatsPanel from './components/stats/StatsPanel'
import PassportPanel from './components/passport/PassportPanel'
import { useAuth } from './hooks/useAuth'
import { usePlaces } from './hooks/usePlaces'
import { auth } from './lib/firebase'
import { PLACES, type Place } from './lib/places'

function App() {
  // Todos os hooks ficam aqui em cima, antes de qualquer "return" condicional
  const { user, loading } = useAuth()
  const { statuses, datas, erro } = usePlaces(user !== null)
  const [selected, setSelected] = useState<Place | null>(null)
  const [autoRotate, setAutoRotate] = useState(true)
  const [focus, setFocus] = useState<FocusRequest | null>(null)
  const [spin, setSpin] = useState<FocusRequest | null>(null)
  const [sorteando, setSorteando] = useState(false)
  const [rankingAberto, setRankingAberto] = useState(false)
  const [passaporteAberto, setPassaporteAberto] = useState(false)
  const [estatisticasAberto, setEstatisticasAberto] = useState(false)
  const [globoPronto, setGloboPronto] = useState(false)
  const globoCarregou = useCallback(() => setGloboPronto(true), [])

  async function sair() {
    setSelected(null)
    setFocus(null)
    setSorteando(false)
    setRankingAberto(false)
    setPassaporteAberto(false)
    setEstatisticasAberto(false)
    setGloboPronto(false)
    await signOut(auth)
  }

  // Escolheu um lugar na busca: abre o painel e pede para a câmera ir até ele
  function escolherNaBusca(place: Place) {
    setSelected(place)
    setFocus((anterior) => ({ id: place.id, n: (anterior?.n ?? 0) + 1 }))
  }
  // Contador: lugar finalizado ou pulado conta como "resolvido"
  let feitos = 0
  let pulados = 0
  for (const lugar of PLACES) {
    const status = statuses[lugar.id]
    if (status === 'done') feitos++
    if (status === 'skipped') pulados++
  }
  const resolvidos = feitos + pulados

  // Sorteio: só entra lugar pendente (sem documento no Firestore também é pendente)
  const pendentes = PLACES.filter(
    (lugar) => (statuses[lugar.id] ?? 'pending') === 'pending',
  )

  function sortear() {
    if (pendentes.length === 0 || sorteando) return
    const escolhido = pendentes[Math.floor(Math.random() * pendentes.length)]
    setSelected(null) // fecha o painel enquanto a roleta gira
    setSorteando(true)
    setSpin((anterior) => ({ id: escolhido.id, n: (anterior?.n ?? 0) + 1 }))
  }

  // A roleta parou: agora sim abre o painel do lugar sorteado
  function terminouSorteio(place: Place) {
    setSorteando(false)
    setSelected(place)
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
        spinRequest={spin}
        onSpinEnd={terminouSorteio}
        onSelect={setSelected}
        onLoaded={globoCarregou}
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

      <button
        onClick={sortear}
        disabled={pendentes.length === 0 || sorteando}
        className="fixed left-6 top-34 flex items-center gap-2 rounded-full border border-white/60 bg-white/40 px-4 py-2 font-semibold text-pink-600 shadow-lg backdrop-blur-md hover:bg-white/60 disabled:opacity-50"
      >
        <Dices size={18} />
        <span>Sortear lugar</span>
      </button>

      <button
        onClick={() => {
          setPassaporteAberto(false)
          setEstatisticasAberto(false)
          setRankingAberto(true)
        }}
        className="fixed left-6 top-48 flex items-center gap-2 rounded-full border border-white/60 bg-white/40 px-4 py-2 font-semibold text-pink-600 shadow-lg backdrop-blur-md hover:bg-white/60"
      >
        <Trophy size={18} />
        <span>Ranking</span>
      </button>

      <button
        onClick={() => {
          setRankingAberto(false)
          setPassaporteAberto(true)
          setEstatisticasAberto(false)
        }}
        className="fixed left-6 top-62 flex items-center gap-2 rounded-full border border-white/60 bg-white/40 px-4 py-2 font-semibold text-pink-600 shadow-lg backdrop-blur-md hover:bg-white/60"
      >
        <BookOpen size={18} />
        <span>Passaporte</span>
      </button>

      <button
        onClick={() => {
          setRankingAberto(false)
          setPassaporteAberto(false)
          setEstatisticasAberto(true)
        }}
        className="fixed left-6 top-76 flex items-center gap-2 rounded-full border border-white/60 bg-white/40 px-4 py-2 font-semibold text-pink-600 shadow-lg backdrop-blur-md hover:bg-white/60"
      >
        <BarChart3 size={18} />
        <span>Estatísticas</span>
      </button>

      <div className="fixed bottom-6 left-6 rounded-3xl border border-white/60 bg-white/40 px-5 py-3 text-[#5c3347] shadow-xl backdrop-blur-md">
        <p className="text-2xl font-bold text-pink-600">
          {resolvidos}/{PLACES.length}
        </p>
        <p className="text-sm">lugares resolvidos</p>
        {pulados > 0 && (
          <p className="text-xs text-[#b0476f]">{pulados} pulados</p>
        )}
      </div>

      {erro && (
        <p
          role="alert"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-white/60 bg-white/50 px-4 py-2 text-sm text-[#c2255c] shadow-lg backdrop-blur-md"
        >
          Não foi possível carregar os lugares.
        </p>
      )}

      {rankingAberto && (
        <RankingPanel uid={user.uid} onClose={() => setRankingAberto(false)} />
      )}

      {passaporteAberto && (
        <PassportPanel
          statuses={statuses}
          datas={datas}
          onClose={() => setPassaporteAberto(false)}
        />
      )}

      {estatisticasAberto && (
        <StatsPanel
          uid={user.uid}
          statuses={statuses}
          onClose={() => setEstatisticasAberto(false)}
        />
      )}

      {selected && (
        <PlacePanel
          key={selected.id}
          place={selected}
          uid={user.uid}
          status={statuses[selected.id] ?? 'pending'}
          onClose={() => setSelected(null)}
        />
      )}

      <div
        aria-hidden={globoPronto}
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 transition-opacity duration-700 ${
          globoPronto ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
        style={{
          background:
            'linear-gradient(180deg, #cdb8ee 0%, #f3b8d4 55%, #ffd9c7 100%)',
        }}
      >
        <Leaf className="h-12 w-12 animate-pulse text-[#d9578a]" />
        <p className="font-semibold text-[#b0476f]">Carregando o globo...</p>
      </div>
    </>
  )
}

export default App
