import { useState } from "react"
import { supabase } from "../lib/supabase"

export default function Login() {
  const [mode, setMode] = useState("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
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
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-[30px] bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <div className="mb-6 text-center">
          <p className="text-sm font-medium text-pink-600">Galeria L’Amour</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            {mode === "login" ? "Entrar no painel" : "Criar conta"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {mode === "login"
              ? "Acesse o painel administrativo com email e senha."
              : "Crie seu acesso para administrar seus eventos."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seuemail@exemplo.com"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Senha
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua senha"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
            />
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
            className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 font-medium text-white"
          >
            {loading
              ? mode === "login"
                ? "Entrando..."
                : "Criando conta..."
              : mode === "login"
              ? "Entrar"
              : "Criar conta"}
          </button>
        </form>

        <div className="mt-6 text-center">
          {mode === "login" ? (
            <p className="text-sm text-slate-600">
              Ainda não tem conta?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signup")
                  setMessage("")
                  setError("")
                }}
                className="font-semibold text-pink-600"
              >
                Criar conta
              </button>
            </p>
          ) : (
            <p className="text-sm text-slate-600">
              Já tem conta?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("login")
                  setMessage("")
                  setError("")
                }}
                className="font-semibold text-pink-600"
              >
                Entrar
              </button>
            </p>
          )}
        </div>
      </div>
    </main>
  )
}