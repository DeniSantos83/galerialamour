import { useState } from "react"
import { supabase } from "../lib/supabase"

export default function Login() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    const { error } = await supabase.auth.signInWithOtp({
  email,
  options: {
    emailRedirectTo: `${window.location.origin}/painel`,
  },
}) 

    if (error) {
      setMessage(error.message)
    } else {
      setMessage("Verifique seu email para acessar o painel.")
    }

    setLoading(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200"
      >
        <h1 className="text-2xl font-bold text-slate-900">Entrar</h1>

        <p className="mt-2 text-slate-600">
          Digite seu email para receber um link de acesso.
        </p>

        <input
          type="email"
          required
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-6 w-full rounded-xl border border-slate-300 px-4 py-3"
        />

        <button
          disabled={loading}
          className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 text-white"
        >
          {loading ? "Enviando..." : "Entrar"}
        </button>

        {message && (
          <p className="mt-4 text-sm text-slate-600">
            {message}
          </p>
        )}
      </form>
    </main>
  )
}