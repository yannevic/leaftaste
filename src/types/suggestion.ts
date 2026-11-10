// Um prato sugerido pela IA para um lugar
export type Sugestao = {
  name: string
  type: 'doce' | 'salgado'
  description: string // uma linha
  difficulty: 'facil' | 'medio'
  easyIngredients: boolean // ingredientes fáceis de achar no Brasil?
  timeMinutes: number
}
