import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Send } from 'lucide-react'
import { criarChatReceita } from '../../lib/ai'

// Máximo de mensagens que o casal pode mandar por conversa
const LIMITE = 20

// Uma mensagem na tela: 'eu' = o casal, 'ia' = a resposta da IA
type Mensagem = {
  de: 'eu' | 'ia'
  texto: string
}

type Props = {
  prato: string // nome do prato
  lugar: string // nome do lugar (a IA usa para entender de onde é o prato)
}

export default function RecipeChat({ prato, lugar }: Props) {
  // A conversa é criada UMA vez e guarda o histórico (ver criarChatReceita)
  const [enviar] = useState(() => criarChatReceita(prato, lugar))
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [digitado, setDigitado] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const caixaRef = useRef<HTMLDivElement>(null)

  // Quantas mensagens o casal já mandou (calculado, sem estado extra)
  const usadas = mensagens.filter((m) => m.de === 'eu').length
  const noLimite = usadas >= LIMITE

  // Sempre que chega mensagem nova, rola a caixa até o fim
  useEffect(() => {
    const caixa = caixaRef.current
    if (caixa) caixa.scrollTop = caixa.scrollHeight
  }, [mensagens, enviando])

  async function enviarMensagem() {
    const texto = digitado.trim()
    if (texto === '' || enviando || noLimite) return

    setErro('')
    setDigitado('')
    setEnviando(true)
    // mostra a mensagem do casal na hora
    setMensagens((atual) => [...atual, { de: 'eu', texto }])

    try {
      const resposta = await enviar(texto)
      setMensagens((atual) => [...atual, { de: 'ia', texto: resposta }])
    } catch (err) {
      console.error('Erro no chat de receita:', err)
      // tira a mensagem que não foi respondida e devolve o texto para a caixa
      setMensagens((atual) => atual.slice(0, -1))
      setDigitado(texto)
      setErro('A IA não respondeu agora. Tente de novo em instantes.')
    } finally {
      setEnviando(false)
    }
  }

  // Enter envia; Shift + Enter pula linha
  function aoApertarTecla(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviarMensagem()
    }
  }

  return (
    <div className="mt-2 rounded-2xl border border-white/70 bg-white/40 p-2 text-sm">
      <div ref={caixaRef} className="max-h-56 space-y-2 overflow-y-auto pr-1">
        {mensagens.length === 0 && (
          <p className="text-pink-400">
            Converse com a IA sobre a receita de {prato}. Por exemplo: me dá uma
            receita simples.
          </p>
        )}
        {mensagens.map((m, i) => (
          <div
            key={i}
            className={
              m.de === 'eu' ? 'flex justify-end' : 'flex justify-start'
            }
          >
            <p
              className={`max-w-[85%] whitespace-pre-wrap wrap-break-word rounded-2xl px-3 py-1.5 text-[#5c3347] ${
                m.de === 'eu' ? 'bg-[#f48fb1]/40' : 'bg-white/70'
              }`}
            >
              {m.texto}
            </p>
          </div>
        ))}
        {enviando && <p className="text-pink-400">Pensando...</p>}
      </div>

      {erro && (
        <p role="alert" className="mt-2 text-[#c2255c]">
          {erro}
        </p>
      )}

      <div className="mt-2 flex items-end gap-2">
        <textarea
          value={digitado}
          onChange={(e) => setDigitado(e.target.value)}
          onKeyDown={aoApertarTecla}
          rows={2}
          disabled={noLimite}
          placeholder={
            noLimite ? 'Limite de mensagens atingido' : 'Escreva sua mensagem'
          }
          className="w-full rounded-2xl border border-white/70 bg-white/60 px-3 py-2 text-[#5c3347] placeholder:text-[#b0476f]/50 outline-none focus:border-[#f48fb1] focus:ring-2 focus:ring-[#f48fb1]/40 disabled:opacity-60"
        />
        <button
          type="button"
          onClick={enviarMensagem}
          disabled={enviando || noLimite || digitado.trim() === ''}
          aria-label="Enviar mensagem"
          className="rounded-full bg-[#f48fb1] p-2.5 text-white shadow-md transition hover:bg-[#ee7ba3] disabled:opacity-60"
        >
          <Send size={18} />
        </button>
      </div>

      <p className="mt-1 text-xs text-[#b0476f]">
        {usadas}/{LIMITE} mensagens. A conversa some quando você fecha o chat.
        {noLimite && ' Para recomeçar, feche e abra o chat de novo.'}
      </p>
    </div>
  )
}
