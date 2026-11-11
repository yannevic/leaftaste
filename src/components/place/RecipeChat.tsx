import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Send } from 'lucide-react'
import { criarChatReceita } from '../../lib/ai'
import { salvarReceita } from '../../lib/dishes'

// Máximo de mensagens que o casal pode mandar por conversa
const LIMITE = 20

// Uma mensagem na tela: 'eu' = o casal, 'ia' = a resposta da IA
type Mensagem = {
  de: 'eu' | 'ia'
  texto: string
}

type Props = {
  dishId: string // id do prato (para gravar a receita nele)
  prato: string // nome do prato
  lugar: string // nome do lugar (a IA usa para entender de onde é o prato)
  temReceita: boolean // o prato já tem uma receita salva?
}

export default function RecipeChat({
  dishId,
  prato,
  lugar,
  temReceita,
}: Props) {
  // A conversa é criada UMA vez e guarda o histórico (ver criarChatReceita)
  const [enviar] = useState(() => criarChatReceita(prato, lugar))
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [digitado, setDigitado] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  // null = caixinha de revisão fechada; texto = aberta, com esse texto
  const [rascunho, setRascunho] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [aviso, setAviso] = useState('')
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
    setAviso('')
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

  // Grava o texto da caixinha de revisão no campo "recipe" do prato
  async function confirmarReceita() {
    if (rascunho === null) return
    const texto = rascunho.trim()
    if (texto === '') {
      setErro('A receita está vazia. Escreva algo ou cancele.')
      return
    }

    setErro('')
    setSalvando(true)
    try {
      await salvarReceita(dishId, texto)
      setRascunho(null)
      setAviso('Receita salva no prato! Ela aparece em "Ver receita".')
    } catch (err) {
      console.error('Erro ao salvar receita:', err)
      setErro('Não foi possível salvar a receita. Tente de novo.')
    } finally {
      setSalvando(false)
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
            <div className="max-w-[85%]">
              <p
                className={`whitespace-pre-wrap wrap-break-word rounded-2xl px-3 py-1.5 text-[#5c3347] ${
                  m.de === 'eu' ? 'bg-[#f48fb1]/40' : 'bg-white/70'
                }`}
              >
                {m.texto}
              </p>
              {/* Só as respostas da IA podem virar receita */}
              {m.de === 'ia' && (
                <button
                  type="button"
                  onClick={() => {
                    setErro('')
                    setAviso('')
                    setRascunho(m.texto)
                  }}
                  disabled={salvando}
                  className="mt-1 text-xs font-semibold text-[#b0476f] underline disabled:opacity-60"
                >
                  <span>Usar como receita</span>
                </button>
              )}
            </div>
          </div>
        ))}
        {enviando && <p className="text-pink-400">Pensando...</p>}
      </div>

      {/* Caixinha de revisão: edite o texto e só depois confirme */}
      {rascunho !== null && (
        <div className="mt-2 space-y-2 rounded-2xl border border-[#f48fb1] bg-white/60 p-2">
          <p className="font-semibold text-[#b0476f]">
            Revise a receita antes de salvar
          </p>
          <p className="text-xs text-[#b0476f]">
            Apague o que não for receita (como cumprimentos) e confira as
            quantidades.
            {temReceita &&
              ' Este prato já tem uma receita: ao salvar, a atual será substituída.'}
          </p>
          <textarea
            value={rascunho}
            onChange={(e) => setRascunho(e.target.value)}
            rows={8}
            disabled={salvando}
            className="w-full rounded-2xl border border-white/70 bg-white/70 px-3 py-2 text-[#5c3347] outline-none focus:border-[#f48fb1] focus:ring-2 focus:ring-[#f48fb1]/40 disabled:opacity-60"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={confirmarReceita}
              disabled={salvando}
              className="flex-1 rounded-2xl bg-[#f48fb1] py-1.5 font-semibold text-white shadow-md transition hover:bg-[#ee7ba3] disabled:opacity-60"
            >
              <span>{salvando ? 'Salvando...' : 'Salvar como receita'}</span>
            </button>
            <button
              type="button"
              onClick={() => setRascunho(null)}
              disabled={salvando}
              className="rounded-2xl border border-white/70 bg-white/50 px-3 py-1.5 font-semibold text-[#b0476f] hover:bg-white/70 disabled:opacity-60"
            >
              <span>Cancelar</span>
            </button>
          </div>
        </div>
      )}

      {aviso && (
        <p role="status" className="mt-2 font-semibold text-pink-600">
          {aviso}
        </p>
      )}

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
