import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai'
import { app } from './firebase'

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
