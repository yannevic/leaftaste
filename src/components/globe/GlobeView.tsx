import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MeshPhongMaterial } from 'three'
import Globe, { type GlobeMethods } from 'react-globe.gl'
import { PLACES_BY_ID, placeLabel, type Place } from '../../lib/places'
import { createOceanTexture } from '../../lib/oceanTexture'
import type { CountryStatus } from '../../types/country'

// Cada polígono do mapa traz só o ID do lugar (ex.: "BR", "GF")
type MapFeature = { properties: { ID: string } }

const STATUS_COLORS: Record<CountryStatus, string> = {
  pending: '#d9d2dc', // cinza suave
  in_progress: '#fff0b8', // amarelo creme
  done: '#f48fb1', // rosa
  skipped: '#e8d6b8', // bege areia
}
const OUTSIDE_COLOR = '#efe9ee' // só por segurança, se um ID não for encontrado

// Funções fixas ficam FORA do componente para não serem recriadas à toa
const sideColor = () => 'rgba(255,255,255,0.2)'
const strokeColor = () => 'rgba(255,255,255,0.8)'
// O anel pede uma função que devolve outra função: t vai de 0 a 1
// enquanto o anel cresce, e a cor vai ficando transparente
const ringColor = () => (t: number) => `rgba(233, 30, 99, ${1 - t})`
function labelOf(f: object): string {
  const place = PLACES_BY_ID[(f as MapFeature).properties.ID]
  return place ? `<div class="globe-tip">${placeLabel(place)}</div>` : ''
}

// Pedido de "vá até este lugar" (feito pela busca). O n muda a cada pedido,
// assim buscar o mesmo lugar duas vezes também mexe a câmera.
export type FocusRequest = { id: string; n: number }

type Props = {
  statuses: Record<string, CountryStatus> // chave = id do lugar
  selectedId: string | null // id do lugar selecionado (ou null)
  autoRotate: boolean
  focusRequest: FocusRequest | null // pedido para a câmera ir até um lugar
  spinRequest: FocusRequest | null // pedido de roleta (sorteio)
  onSelect: (place: Place) => void
  onSpinEnd: (place: Place) => void // avisa quando a roleta parou
  onLoaded?: () => void // avisa quando o globo e o mapa estão prontos
}

function useWindowSize() {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  })
  useEffect(() => {
    const onResize = () =>
      setSize({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return size
}

export default function GlobeView({
  statuses,
  selectedId,
  autoRotate,
  focusRequest,
  spinRequest,
  onSelect,
  onSpinEnd,
  onLoaded,
}: Props) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  const { width, height } = useWindowSize()
  const [features, setFeatures] = useState<MapFeature[]>([])
  const [ready, setReady] = useState(false)
  // Guarda a função "a roleta parou" numa caixinha (ref), assim a animação
  // não reinicia se o App recriar a função
  const onSpinEndRef = useRef(onSpinEnd)
  useEffect(() => {
    onSpinEndRef.current = onSpinEnd
  }, [onSpinEnd])

  // Baixa o mapa uma vez
  useEffect(() => {
    async function loadMap() {
      const resposta = await fetch('/data/countries.geojson')
      const dados = await resposta.json()
      setFeatures(dados.features)
    }
    loadMap()
  }, [])

  // Textura e material do oceano, criados uma vez só
  const oceanTexture = useMemo(() => createOceanTexture(), [])
  const oceanMaterial = useMemo(
    () =>
      new MeshPhongMaterial({
        map: oceanTexture,
        emissiveMap: oceanTexture,
        emissive: '#ffffff',
        emissiveIntensity: 0.4,
        specular: '#000000', // sem reflexo de espelho
        shininess: 0,
      }),
    [oceanTexture],
  )

  // Desliza a textura bem devagar: dá a sensação de água se mexendo
  useEffect(() => {
    let frameId = 0
    function animate() {
      oceanTexture.offset.x += 0.00012
      frameId = requestAnimationFrame(animate)
    }
    animate()
    return () => cancelAnimationFrame(frameId)
  }, [oceanTexture])

  const handleReady = useCallback(() => setReady(true), [])

  // Avisa o App quando o globo e o mapa já estão prontos
  useEffect(() => {
    if (!ready || features.length === 0) return undefined
    // espera 2 quadros para os países terem sido desenhados na tela
    let id2 = 0
    const id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => onLoaded?.())
    })
    return () => {
      cancelAnimationFrame(id1)
      cancelAnimationFrame(id2)
    }
  }, [ready, features, onLoaded])

  // Um anel no lugar selecionado; lista vazia = nenhum anel
  const ringsData = useMemo(() => {
    const place = selectedId ? PLACES_BY_ID[selectedId] : undefined
    return place ? [{ lat: place.lat, lng: place.lng }] : []
  }, [selectedId])

  // Liga/desliga a rotação (botão de pausa)
  useEffect(() => {
    const controls = globeRef.current?.controls()
    if (!controls) return
    controls.autoRotate = autoRotate
    controls.autoRotateSpeed = 0.4
    controls.minDistance = 102 // não deixa a câmera chegar colada nos países
    // Inércia só enquanto gira: ao pausar, o globo para na hora
    controls.enableDamping = autoRotate
  }, [autoRotate, ready])

  // Leva a câmera até um ponto (usada pelo clique no mapa e pela busca)
  const flyTo = useCallback((lat: number, lng: number) => {
    const globe = globeRef.current
    if (!globe) return
    const current = globe.pointOfView()
    globe.pointOfView(
      {
        lat,
        lng,
        altitude: Math.min(current.altitude, 1.8),
      },
      800,
    )
  }, [])

  // Quando chega um pedido novo da busca, a câmera vai até o lugar
  useEffect(() => {
    if (!focusRequest) return
    const place = PLACES_BY_ID[focusRequest.id]
    if (place) flyTo(place.lat, place.lng)
  }, [focusRequest, flyTo])

  // Roleta do sorteio: gira o globo e desacelera até parar no lugar sorteado
  useEffect(() => {
    if (!spinRequest) return
    const globeOuNada = globeRef.current
    const lugarOuNada = PLACES_BY_ID[spinRequest.id]
    if (!globeOuNada || !lugarOuNada) return
    // Cópias "garantidas": daqui para baixo o TypeScript sabe que existem
    const globe: GlobeMethods = globeOuNada
    const place: Place = lugarOuNada

    const inicio = globe.pointOfView()
    const altitude = Math.min(inicio.altitude, 1.8)
    // O que falta girar até o lugar, mais 2 voltas completas
    const falta = (((place.lng - inicio.lng) % 360) + 360) % 360
    const total = falta + 720
    const duracao = 3500 // milissegundos
    const comeco = performance.now()
    let frameId = 0

    function passo(agora: number) {
      const p = Math.min((agora - comeco) / duracao, 1) // 0 até 1
      const suave = 1 - Math.pow(1 - p, 3) // começa rápido, termina devagar
      const lng = ((inicio.lng + total * suave + 540) % 360) - 180
      const lat = inicio.lat + (place.lat - inicio.lat) * suave
      globe.pointOfView({ lat, lng, altitude }, 0)
      if (p < 1) {
        frameId = requestAnimationFrame(passo)
      } else {
        onSpinEndRef.current(place)
      }
    }
    frameId = requestAnimationFrame(passo)

    return () => cancelAnimationFrame(frameId)
  }, [spinRequest])

  // Só muda se os status mudarem
  const capColor = useCallback(
    (f: object) => {
      const place = PLACES_BY_ID[(f as MapFeature).properties.ID]
      if (!place) return OUTSIDE_COLOR
      return STATUS_COLORS[statuses[place.id] ?? 'pending']
    },
    [statuses],
  )

  const handleClick = useCallback(
    (f: object, _event: MouseEvent, coords: { lat: number; lng: number }) => {
      const place = PLACES_BY_ID[(f as MapFeature).properties.ID]
      if (!place) return
      onSelect(place)

      // A câmera vai até o ponto clicado
      flyTo(coords.lat, coords.lng)
    },
    [onSelect, flyTo],
  )

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{
        background:
          'linear-gradient(180deg, #cdb8ee 0%, #f3b8d4 55%, #ffd9c7 100%)',
      }}
    >
      <Globe
        ref={globeRef}
        width={width}
        height={height}
        backgroundColor="rgba(0,0,0,0)"
        globeImageUrl={null}
        globeMaterial={oceanMaterial}
        showAtmosphere
        atmosphereColor="#ff9ec4"
        atmosphereAltitude={0.22}
        onGlobeReady={handleReady}
        polygonsData={features}
        polygonCapColor={capColor}
        polygonSideColor={sideColor}
        polygonStrokeColor={strokeColor}
        polygonAltitude={0.01}
        polygonsTransitionDuration={0}
        polygonLabel={labelOf}
        onPolygonClick={handleClick}
        ringsData={ringsData}
        ringColor={ringColor}
        ringAltitude={0.012}
        ringMaxRadius={4}
        ringPropagationSpeed={2}
        ringRepeatPeriod={1200}
      />
    </div>
  )
}
