// Um prato sugerido pela IA para um lugar
export type Sugestao = {
  name: string
  type: 'doce' | 'salgado'
  description: string // uma linha
  difficulty: 'facil' | 'medio'
  easyIngredients: boolean // ingredientes fáceis de achar no Brasil?
  timeMinutes: number
  // Os campos abaixo são opcionais (?): sugestões antigas não têm.
  // Quando faltam, contam como "não".
  mantida?: boolean // marcada com o checkzinho: segura a opção na lista
  escolhida?: boolean // escolhida de vez (vira prato na etapa 6.5c)
}
