import { useEffect, useMemo, useState } from "react"
import { Link, Navigate } from "react-router-dom"
import QRCode from "qrcode"
import {
  Copy,
  ExternalLink,
  Image as ImageIcon,
  LogOut,
  PlusCircle,
  QrCode,
  CheckCircle2,
  Settings2,
  Download,
  Globe,
  Sparkles,
  Link2,
  LayoutDashboard,
} from "lucide-react"
import { supabase } from "../lib/supabase"
import { slugify } from "../lib/utils"

const initialForm = {
  name: "",
  description: "",
  primary_color: "#111827",
  secondary_color: "#ffffff",
  accent_color: "#ec4899",
  instructions: "Envie fotos e vídeos de até 45 segundos.",
}

function InfoChip({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  )
}

function ActionButton({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${className}`}
    >
      {children}
    </button>
  )
}

function EventCard({ event }) {
  const [qrCodeUrl, setQrCodeUrl] = useState("")
  const [copiedField, setCopiedField] = useState("")

  const uploadUrl = `${window.location.origin}/evento/${event.slug}/upload`
  const privateGalleryUrl = `${window.location.origin}/evento/${event.slug}/galeria`
  const publicGalleryUrl = `${window.location.origin}/galeria/${event.slug}`

  useEffect(() => {
    async function generateQr() {
      try {
        const dataUrl = await QRCode.toDataURL(uploadUrl, {
          width: 240,
          margin: 2,
        })
        setQrCodeUrl(dataUrl)
      } catch (error) {
        console.error("Erro ao gerar QR Code:", error)
      }
    }

    generateQr()
  }, [uploadUrl])

  async function handleCopy(text, type) {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(type)
      setTimeout(() => setCopiedField(""), 1800)
    } catch (error) {
      console.error("Erro ao copiar:", error)
      alert("Não foi possível copiar o link.")
    }
  }

  return (
    <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
      <div
        className="relative overflow-hidden p-6"
        style={{
          background: `linear-gradient(135deg, ${event.primary_color} 0%, ${event.accent_color} 100%)`,
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_30%)]" />

        <div className="relative flex items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-white backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              Evento ativo
            </div>

            <h3 className="mt-4 text-2xl font-bold text-white sm:text-3xl">
              {event.name}
            </h3>

            <p className="mt-3 max-w-xl text-sm leading-6 text-white/85">
              {event.description || "Sem descrição cadastrada."}
            </p>
          </div>

          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur">
            {event.is_upload_open ? "Upload aberto" : "Upload fechado"}
          </span>
        </div>
      </div>

      <div className="grid gap-6 p-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          <div>
            <p className="text-sm font-medium text-yellow-600">Resumo do evento</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <InfoChip label="Slug" value={event.slug} />
              <InfoChip label="Papel" value={event.role} />
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-yellow-600" />
                <p className="text-sm font-semibold text-slate-900">Link público de upload</p>
              </div>

              <p className="mt-3 break-all text-sm leading-6 text-slate-600">
                {uploadUrl}
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                <ActionButton
                  type="button"
                  onClick={() => handleCopy(uploadUrl, "upload")}
                  className="bg-slate-900 text-white"
                >
                  {copiedField === "upload" ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copiar link
                    </>
                  )}
                </ActionButton>

                <a
                  href={uploadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-900"
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir página
                </a>
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-yellow-600" />
                <p className="text-sm font-semibold text-slate-900">Galeria privada</p>
              </div>

              <p className="mt-3 break-all text-sm leading-6 text-slate-600">
                {privateGalleryUrl}
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                <ActionButton
                  type="button"
                  onClick={() => handleCopy(privateGalleryUrl, "private-gallery")}
                  className="bg-slate-900 text-white"
                >
                  {copiedField === "private-gallery" ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copiar galeria privada
                    </>
                  )}
                </ActionButton>

                <Link
                  to={`/evento/${event.slug}/galeria`}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-900"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Ver galeria
                </Link>
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-yellow-600" />
                <p className="text-sm font-semibold text-slate-900">Galeria pública</p>
              </div>

              <p className="mt-3 break-all text-sm leading-6 text-slate-600">
                {publicGalleryUrl}
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                <ActionButton
                  type="button"
                  onClick={() => handleCopy(publicGalleryUrl, "public-gallery")}
                  className="bg-slate-900 text-white"
                >
                  {copiedField === "public-gallery" ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copiar galeria pública
                    </>
                  )}
                </ActionButton>

                <a
                  href={publicGalleryUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-900"
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir pública
                </a>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to={`/evento/${event.slug}/configuracoes`}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-900"
              >
                <Settings2 className="h-4 w-4" />
                Editar evento
              </Link>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-6 text-center">
          <div className="mx-auto flex w-fit items-center gap-2 rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-700">
            <QrCode className="h-4 w-4" />
            QR Code do evento
          </div>

          <div className="mt-5">
            {qrCodeUrl ? (
              <img
                src={qrCodeUrl}
                alt={`QR Code do evento ${event.name}`}
                className="mx-auto rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200"
              />
            ) : (
              <div className="mx-auto flex h-[240px] w-[240px] items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200">
                <p className="text-sm text-slate-500">Gerando QR Code...</p>
              </div>
            )}
          </div>

          <p className="mx-auto mt-4 max-w-xs text-sm leading-6 text-slate-600">
            Use esse QR Code nas mesas, convites ou materiais impressos para coletar fotos e vídeos dos convidados.
          </p>

          <div className="mt-5 flex flex-col gap-3">
            <ActionButton
              type="button"
              onClick={() => handleCopy(uploadUrl, "qr")}
              className="justify-center bg-slate-900 text-white"
            >
              {copiedField === "qr" ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Link copiado
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copiar link do QR
                </>
              )}
            </ActionButton>

            {qrCodeUrl && (
              <a
                href={qrCodeUrl}
                download={`qrcode-${event.slug}.png`}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-900"
              >
                <Download className="h-4 w-4" />
                Baixar QR Code
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [events, setEvents] = useState([])
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [form, setForm] = useState(initialForm)

  const slug = useMemo(() => slugify(form.name), [form.name])

  useEffect(() => {
    async function loadUser() {
      const { data, error } = await supabase.auth.getUser()

      if (error) {
        console.error("Erro ao obter usuário:", error)
      }

      setUser(data?.user ?? null)
      setLoadingUser(false)
    }

    loadUser()
  }, [])

  useEffect(() => {
    if (!user) return
    loadEvents(user.id)
  }, [user])

  async function loadEvents(userId) {
    setLoadingEvents(true)

    const { data: relations, error: relError } = await supabase
      .from("event_users")
      .select("event_id, role")
      .eq("user_id", userId)

    if (relError) {
      console.error("Erro ao buscar relações:", relError)
      setLoadingEvents(false)
      return
    }

    if (!relations || relations.length === 0) {
      setEvents([])
      setLoadingEvents(false)
      return
    }

    const eventIds = relations.map((r) => r.event_id)

    const { data: eventsData, error: eventsError } = await supabase
      .from("events")
      .select("*")
      .in("id", eventIds)
      .order("created_at", { ascending: false })

    if (eventsError) {
      console.error("Erro ao buscar eventos:", eventsError)
      setLoadingEvents(false)
      return
    }

    const normalized = eventsData.map((event) => {
      const relation = relations.find((r) => r.event_id === event.id)

      return {
        ...event,
        role: relation?.role || "viewer",
      }
    })

    setEvents(normalized)
    setLoadingEvents(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  function handleChange(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  async function handleCreateEvent(e) {
    e.preventDefault()
    setMessage("")

    if (!form.name.trim()) {
      setMessage("Informe o nome do evento.")
      return
    }

    if (!slug) {
      setMessage("Não foi possível gerar o slug do evento.")
      return
    }

    setSaving(true)

    const { error } = await supabase.rpc("create_event_with_owner", {
      p_slug: slug,
      p_name: form.name.trim(),
      p_description: form.description.trim() || null,
      p_logo_url: null,
      p_cover_url: null,
      p_primary_color: form.primary_color,
      p_secondary_color: form.secondary_color,
      p_accent_color: form.accent_color,
      p_instructions: form.instructions.trim() || null,
    })

    if (error) {
      console.error("Erro ao criar evento:", error)
      setMessage(error.message)
      setSaving(false)
      return
    }

    setMessage("Evento criado com sucesso.")
    setForm(initialForm)
    await loadEvents(user.id)
    setSaving(false)
  }

  if (loadingUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <p className="text-slate-600">Carregando...</p>
      </main>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-100 p-4 sm:p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(236,72,153,0.08),transparent_20%),radial-gradient(circle_at_left,rgba(15,23,42,0.05),transparent_18%)]" />

      <div className="relative mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-8 p-6 sm:p-8 xl:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-700">
                <Sparkles className="h-4 w-4" />
                Painel premium
              </div>

              <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                Gerencie seus eventos com uma experiência mais refinada.
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
                Crie páginas personalizadas, gere QR Codes, acompanhe galerias e transforme a experiência dos convidados em uma entrega elegante e profissional.
              </p>

              <p className="mt-5 text-sm text-slate-500">
                Logado como: {user.email}
              </p>

              <div className="mt-6">
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-medium text-yellow-600">Eventos</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{events.length}</p>
                <p className="mt-2 text-sm text-slate-600">Eventos vinculados à sua conta</p>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-medium text-yellow-600">Links públicos</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">QR</p>
                <p className="mt-2 text-sm text-slate-600">Prontos para compartilhar e imprimir</p>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-medium text-yellow-600">Galerias</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">Live</p>
                <p className="mt-2 text-sm text-slate-600">Privadas e públicas no mesmo sistema</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-700">
                <PlusCircle className="h-4 w-4" />
                Novo evento
              </div>

              <h2 className="mt-4 text-2xl font-bold text-slate-900">
                Criar evento
              </h2>
              <p className="mt-2 text-slate-600">
                Defina nome, descrição, identidade visual e inicie um novo fluxo de coleta para seus convidados.
              </p>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Nome do evento
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Ex.: Casamento Deni & Fernanda"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Slug gerado automaticamente
                </label>
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-slate-600">
                  {slug || "O slug aparecerá aqui"}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Descrição
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  rows={4}
                  placeholder="Uma mensagem curta para os convidados."
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Instruções da página pública
                </label>
                <textarea
                  value={form.instructions}
                  onChange={(e) => handleChange("instructions", e.target.value)}
                  rows={3}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Cor principal
                  </label>
                  <input
                    type="color"
                    value={form.primary_color}
                    onChange={(e) => handleChange("primary_color", e.target.value)}
                    className="h-12 w-full rounded-xl border border-slate-300 bg-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Cor secundária
                  </label>
                  <input
                    type="color"
                    value={form.secondary_color}
                    onChange={(e) => handleChange("secondary_color", e.target.value)}
                    className="h-12 w-full rounded-xl border border-slate-300 bg-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Cor de destaque
                  </label>
                  <input
                    type="color"
                    value={form.accent_color}
                    onChange={(e) => handleChange("accent_color", e.target.value)}
                    className="h-12 w-full rounded-xl border border-slate-300 bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex rounded-2xl bg-slate-900 px-5 py-3 font-medium text-white"
              >
                {saving ? "Criando evento..." : "Criar evento"}
              </button>

              {message && <p className="text-sm text-slate-600">{message}</p>}
            </form>
          </article>

          <aside className="space-y-6">
            <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-5">
                <p className="text-sm font-medium text-yellow-600">Eventos cadastrados</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">
                  Seus eventos
                </h2>
                <p className="mt-2 text-slate-600">
                  Acesse QR Codes, links públicos e configurações em um só lugar.
                </p>
              </div>

              {loadingEvents ? (
                <p className="text-slate-600">Carregando eventos...</p>
              ) : events.length === 0 ? (
                <p className="text-slate-600">Você ainda não criou nenhum evento.</p>
              ) : (
                <div className="space-y-6">
                  {events.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              )}
            </section>
          </aside>
        </section>
      </div>
    </main>
  )
}