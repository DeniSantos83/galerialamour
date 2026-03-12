import { useState } from "react"
import { Eye, EyeOff, Lock, Mail, Sparkles } from "lucide-react"
import { supabase } from "../lib/supabase"

export default function Login() {
  const [mode, setMode] = useState("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setMessage("")
    setError("")

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })

        if (error) throw error

        setMessage("Conta criada com sucesso. Agora você já pode entrar.")
        setMode("login")
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        window.location.href = "/painel"
      }
    } catch (err) {
      setError(err.message || "Erro ao autenticar.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(236,72,153,0.16),transparent_22%),radial-gradient(circle_at_left,rgba(255,255,255,0.06),transparent_18%),radial-gradient(circle_at_bottom,rgba(168,85,247,0.12),transparent_22%)]" />

      <div className="relative grid w-full max-w-6xl overflow-hidden rounded-[32px] border border-white/10 bg-white/5 shadow-2xl backdrop-blur xl:grid-cols-[0.95fr_1.05fr]">
        <section className="hidden xl:flex xl:flex-col xl:justify-between xl:bg-white/6 xl:p-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm font-medium text-pink-200">
              <Sparkles className="h-4 w-4" />
              Galeria L’Amour
            </div>

            <h1 className="mt-8 text-4xl font-bold tracking-tight text-white">
              Acesse seu painel e gerencie seus eventos com elegância.
            </h1>

            <p className="mt-5 max-w-lg text-base leading-8 text-white/70">
              Organize uploads, personalize páginas, gere QR Codes e acompanhe a galeria dos convidados em uma experiência mais profissional.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm font-medium text-pink-200">Recursos</p>
              <ul className="mt-3 space-y-2 text-sm text-white/75">
                <li>• QR Code por evento</li>
                <li>• Upload de fotos e vídeos</li>
                <li>• Galeria privada e pública</li>
                <li>• Aprovação e moderação</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="bg-white px-6 py-8 sm:px-10 sm:py-10">
          <div className="mx-auto w-full max-w-md">
            <div className="text-center xl:text-left">
              <p className="text-sm font-medium text-pink-600">Painel administrativo</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                {mode === "login" ? "Entrar" : "Criar conta"}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {mode === "login"
                  ? "Use seu email e senha para acessar o painel."
                  : "Crie sua conta para começar a administrar seus eventos."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seuemail@exemplo.com"
                    className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-slate-900 outline-none transition focus:border-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua senha"
                    className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-11 pr-12 text-slate-900 outline-none transition focus:border-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-800"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {message && (
                <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-200">
                  {message}
                </div>
              )}

              {error && (
                <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-3.5 font-medium text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading
                  ? mode === "login"
                    ? "Entrando..."
                    : "Criando conta..."
                  : mode === "login"
                  ? "Entrar no painel"
                  : "Criar conta"}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-600 xl:text-left">
              {mode === "login" ? (
                <p>
                  Ainda não tem conta?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signup")
                      setMessage("")
                      setError("")
                    }}
                    className="font-semibold text-pink-600 transition hover:text-pink-700"
                  >
                    Criar conta
                  </button>
                </p>
              ) : (
                <p>
                  Já tem conta?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login")
                      setMessage("")
                      setError("")
                    }}
                    className="font-semibold text-pink-600 transition hover:text-pink-700"
                  >
                    Entrar
                  </button>
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}