import { useState, type FormEvent } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { Leaf, Mail, Lock, LogIn } from 'lucide-react'
import { auth } from '../../lib/firebase'

// Traduz o codigo de erro do Firebase para uma frase em portugues
function mensagemDeErro(codigo: string): string {
  switch (codigo) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'E-mail ou senha incorretos.'
    case 'auth/invalid-email':
      return 'Esse e-mail não parece válido.'
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Espere um pouco e tente de novo.'
    case 'auth/network-request-failed':
      return 'Sem conexão com a internet.'
    default:
      return 'Não foi possível entrar. Tente de novo.'
  }
}

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function entrar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault() // impede a pagina de recarregar ao enviar o formulario
    setErro('')
    setEnviando(true)
    try {
      await signInWithEmailAndPassword(auth, email.trim(), senha)
      // se deu certo, o useAuth percebe sozinho e o App troca de tela
    } catch (err) {
      const codigo = (err as { code?: string }).code ?? ''
      setErro(mensagemDeErro(codigo))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{
        background:
          'linear-gradient(180deg, #cdb8ee 0%, #f3b8d4 55%, #ffd9c7 100%)',
      }}
    >
      <form
        onSubmit={entrar}
        className="w-full max-w-sm rounded-3xl border border-white/60 bg-white/40 p-8 shadow-xl backdrop-blur-md"
      >
        <div className="mb-6 flex flex-col items-center gap-2">
          <Leaf className="h-10 w-10 text-[#d9578a]" />
          <h1 className="text-3xl font-bold text-[#b0476f]">Leaftaste</h1>
          <p className="text-sm text-[#8a5a74]">Entre para provar o mundo</p>
        </div>

        <label className="relative mb-3 block">
          <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#b0476f]/70" />
          <input
            type="email"
            autoComplete="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-2xl border border-white/70 bg-white/60 py-3 pl-10 pr-4 text-[#5c3347] placeholder:text-[#b0476f]/50 outline-none focus:border-[#f48fb1] focus:ring-2 focus:ring-[#f48fb1]/40"
          />
        </label>

        <label className="relative mb-4 block">
          <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#b0476f]/70" />
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            className="w-full rounded-2xl border border-white/70 bg-white/60 py-3 pl-10 pr-4 text-[#5c3347] placeholder:text-[#b0476f]/50 outline-none focus:border-[#f48fb1] focus:ring-2 focus:ring-[#f48fb1]/40"
          />
        </label>

        {erro && (
          <p role="alert" className="mb-4 text-center text-sm text-[#c2255c]">
            {erro}
          </p>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#f48fb1] py-3 font-semibold text-white shadow-md transition hover:bg-[#ee7ba3] disabled:opacity-60"
        >
          <LogIn className="h-5 w-5" />
          <span>{enviando ? 'Entrando...' : 'Entrar'}</span>
        </button>
      </form>
    </div>
  )
}