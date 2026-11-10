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

type Props = {
  statuses: Record<string, CountryStatus> // chave = id do lugar
  selectedId: string | null // id do lugar selecionado (ou null)
  autoRotate: boolean
  onSelect: (place: Place) => void
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
  onSelect,
}: Props) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  const { width, height } = useWindowSize()
  const [features, setFeatures] = useState<MapFeature[]>([])
  const [ready, setReady] = useState(false)

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
    // Inércia só enquanto gira: ao pausar, o globo para na hora
    controls.enableDamping = autoRotate
  }, [autoRotate, ready])

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
      const globe = globeRef.current
      if (!globe) return
      const current = globe.pointOfView()
      globe.pointOfView(
        {
          lat: coords.lat,
          lng: coords.lng,
          altitude: Math.min(current.altitude, 1.8),
        },
        800,
      )
    },
    [onSelect],
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