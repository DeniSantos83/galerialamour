import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-slate-900">404</h1>
        <p className="mt-2 text-slate-600">Página não encontrada.</p>
        <Link to="/" className="mt-6 inline-flex rounded-full bg-slate-900 px-5 py-3 text-white">
          Voltar ao início
        </Link>
      </div>
    </main>
  )
}