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
