import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai'
import { app } from './firebase'
import type { Sugestao } from '../types/suggestion'

// Usa o Gemini Developer API, pelo intermediário do Firebase (sem chave)
const ai = getAI(app, { backend: new GoogleAIBackend() })

// Modelos em ordem de preferência: se o primeiro falhar, tenta o próximo
export const MODELOS = ['gemini-3.5-flash-lite', 'gemini-3.8-flash']

type Opcoes = {
  json?: boolean // true = pede a resposta em JSON puro
}

// Manda um texto para a IA e devolve a resposta em texto
export async function gerarTexto(
  prompt: string,
  opcoes: Opcoes = {},
): Promise<string> {
  for (const nome of MODELOS) {
    try {
      const modelo = getGenerativeModel(ai, {
        model: nome,
        generationConfig: opcoes.json
          ? { responseMimeType: 'application/json' }
          : undefined,
      })
      const resultado = await modelo.generateContent(prompt)
      return resultado.response.text()
    } catch (err) {
      console.warn(`Modelo ${nome} falhou:`, err)
    }
  }
  throw new Error('IA indisponivel')
}

// Transforma o texto da IA numa lista de sugestões, descartando itens tortos
function lerSugestoes(texto: string): Sugestao[] {
  const dados: unknown = JSON.parse(texto)
  if (!Array.isArray(dados)) throw new Error('Resposta fora do formato')

  const lista: Sugestao[] = []
  for (const item of dados) {
    if (typeof item !== 'object' || item === null) continue
    const x = item as Record<string, unknown>
    if (typeof x.name !== 'string' || x.name.trim() === '') continue
    if (x.type !== 'doce' && x.type !== 'salgado') continue

    lista.push({
      name: x.name.trim(),
      type: x.type,
      description: typeof x.description === 'string' ? x.description : '',
      difficulty: x.difficulty === 'medio' ? 'medio' : 'facil',
      easyIngredients: x.easyIngredients === true,
      timeMinutes: typeof x.timeMinutes === 'number' ? x.timeMinutes : 0,
    })
  }

  if (lista.length === 0) throw new Error('Nenhuma sugestao valida')
  return lista
}

// Pede 8 pratos típicos (4 doces e 4 salgados) de um lugar
export async function sugerirPratos(lugar: string): Promise<Sugestao[]> {
  const prompt = `Você é um assistente de culinária. Sugira 8 pratos típicos de ${lugar}, sendo 4 doces e 4 salgados. Prefira pratos que um casal consiga fazer em casa com ingredientes fáceis de comprar no Brasil. Se o lugar for pequeno ou tiver pouca culinária própria, use a culinária local dele, não a de outro país. Escreva em português do Brasil. Responda SOMENTE com JSON, sem texto antes ou depois, neste formato: [{ "name": "", "type": "doce" | "salgado", "description": "uma linha", "difficulty": "facil" | "medio", "easyIngredients": true | false, "timeMinutes": 0 }]`

  const texto = await gerarTexto(prompt, { json: true })
  return lerSugestoes(texto)
}

// Deixa o texto minúsculo e sem acento, para comparar nomes de pratos
// ("Crème Brûlée" e "creme brulee" passam a ser iguais)
function normalizar(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

// true se o nome é igual a algum da lista, ou muito parecido
// (um contém o outro, como "Sopa de Peixe" e "Sopa de Peixe Adaptada").
// O menor precisa ter 8+ letras, para nomes curtos não bloquearem tudo.
function ehRepetido(nome: string, existentes: string[]): boolean {
  const a = normalizar(nome)
  return existentes.some((existente) => {
    const b = normalizar(existente)
    if (a === b) return true
    const curto = a.length <= b.length ? a : b
    const longo = a.length <= b.length ? b : a
    return curto.length >= 8 && longo.includes(curto)
  })
}

// Pede só os pratos que FALTAM para a lista voltar a 4 doces e 4 salgados.
// nomesExistentes = todos os nomes que já estão na lista (os que ficam e os
// que vão ser trocados), para a IA não devolver o mesmo prato de novo.
// Se depois de descartar os repetidos ainda faltar prato, pede de novo só o
// que falta (até 3 tentativas).
export async function sugerirNovos(
  lugar: string,
  quantDoces: number,
  quantSalgados: number,
  nomesExistentes: string[],
): Promise<Sugestao[]> {
  const novas: Sugestao[] = []
  // nomes que a IA não pode repetir: os que já existem + os que aceitamos agora
  const proibidos = [...nomesExistentes]

  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const jaDoces = novas.filter((s) => s.type === 'doce').length
    const jaSalgados = novas.filter((s) => s.type === 'salgado').length
    const faltaDoces = quantDoces - jaDoces
    const faltaSalgados = quantSalgados - jaSalgados

    // já temos tudo: sai do laço
    if (faltaDoces <= 0 && faltaSalgados <= 0) break

    // Monta o pedido só com o que falta: "2 doces e 3 salgados"
    const pedidos: string[] = []
    if (faltaDoces > 0) pedidos.push(`${faltaDoces} doces`)
    if (faltaSalgados > 0) pedidos.push(`${faltaSalgados} salgados`)

    const prompt = `Você é um assistente de culinária. Sugira ${pedidos.join(' e ')} típicos de ${lugar}. NÃO repita nenhum destes pratos, nem variações deles, que já estão na lista: ${proibidos.join(', ')}. Prefira pratos que um casal consiga fazer em casa com ingredientes fáceis de comprar no Brasil. Se o lugar for pequeno ou tiver pouca culinária própria, use a culinária local dele, não a de outro país. Escreva em português do Brasil. Responda SOMENTE com JSON, sem texto antes ou depois, neste formato: [{ "name": "", "type": "doce" | "salgado", "description": "uma linha", "difficulty": "facil" | "medio", "easyIngredients": true | false, "timeMinutes": 0 }]`

    let recebidas: Sugestao[]
    try {
      recebidas = lerSugestoes(await gerarTexto(prompt, { json: true }))
    } catch (err) {
      console.warn('Tentativa de novas sugestoes falhou:', err)
      continue // vai para a próxima tentativa
    }

    // A IA pode errar: repetir um prato ou mandar mais do que pedimos.
    // Por isso conferimos prato por prato antes de aceitar.
    for (const s of recebidas) {
      if (ehRepetido(s.name, proibidos)) continue // repetido: descarta
      const doces = novas.filter((n) => n.type === 'doce').length
      const salgados = novas.filter((n) => n.type === 'salgado').length
      if (
        (s.type === 'doce' && doces < quantDoces) ||
        (s.type === 'salgado' && salgados < quantSalgados)
      ) {
        novas.push(s)
        proibidos.push(s.name)
      }
    }
  }

  if (novas.length === 0) throw new Error('Nenhuma sugestao nova')
  return novas
}
