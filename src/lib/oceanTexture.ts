import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'

// Desenha manchas macias. Cada mancha também é desenhada nos lados vizinhos
// (-w, 0, +w e -h, 0, +h), assim a imagem emenda sem costura ao dar a volta.
function drawBlobs(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  count: number,
  minR: number,
  maxR: number,
  colors: string[],
) {
  for (let i = 0; i < count; i++) {
    const x = Math.random() * w
    const y = Math.random() * h
    const r = minR + Math.random() * (maxR - minR)
    const color = colors[Math.floor(Math.random() * colors.length)]
    for (const dx of [-w, 0, w]) {
      for (const dy of [-h, 0, h]) {
        const grad = ctx.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r)
        grad.addColorStop(0, color)
        grad.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = grad
        ctx.fillRect(x + dx - r, y + dy - r, r * 2, r * 2)
      }
    }
  }
}

// Devolve a textura do mar (cor com manchas suaves)
export function createOceanTexture(): CanvasTexture {
  const w = 1024
  const h = 512
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  // Base: azul pastel
  ctx.fillStyle = '#86aee0'
  ctx.fillRect(0, 0, w, h)

  // Manchas grandes e suaves: águas mais fundas, mais rasas e um toque de lilás
  drawBlobs(ctx, w, h, 70, 50, 160, [
    'rgba(90, 130, 200, 0.35)', // mais fundo
    'rgba(170, 200, 245, 0.35)', // mais raso
    'rgba(190, 170, 235, 0.3)', // toque lilás
  ])

  const texture = new CanvasTexture(canvas)
  texture.wrapS = RepeatWrapping
  texture.colorSpace = SRGBColorSpace
  return texture
}