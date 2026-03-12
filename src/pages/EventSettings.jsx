import { useEffect, useMemo, useState } from "react"
import { Link, Navigate, useParams } from "react-router-dom"
import {
  ArrowLeft,
  ImagePlus,
  Loader2,
  Save,
  Settings2,
  Upload,
} from "lucide-react"
import { supabase } from "../lib/supabase"
import { slugify } from "../lib/utils"

const initialState = {
  id: "",
  name: "",
  slug: "",
  description: "",
  instructions: "",
  logo_url: "",
  cover_url: "",
  primary_color: "#111827",
  secondary_color: "#ffffff",
  accent_color: "#ec4899",
  is_upload_open: true,
  allow_videos: true,
  max_photo_size_mb: 20,
  max_video_size_mb: 80,
  max_video_duration_seconds: 45,
  require_guest_name: false,
  gallery_mode: "private",
}

function sanitizeFileName(name = "arquivo") {
  const parts = name.split(".")
  const ext = parts.length > 1 ? parts.pop() : "bin"
  const base = parts
    .join(".")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()

  return `${base || "arquivo"}.${ext.toLowerCase()}`
}

function buildAssetPath(slug, type, fileName) {
  const safeName = sanitizeFileName(fileName)
  const timestamp = Date.now()
  const random = Math.random().toString(36).slice(2, 8)
  return `events/${slug}/${type}/${timestamp}-${random}-${safeName}`
}

export default function EventSettings() {
  const { slug } = useParams()

  const [user, setUser] = useState(null)
  const [loadingUser, setLoadingUser] = useState(true)

  const [form, setForm] = useState(initialState)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser()
      setUser(data?.user ?? null)
      setLoadingUser(false)
    }

    loadUser()
  }, [])

  useEffect(() => {
    if (!user) return

    async function loadEvent() {
      setLoading(true)
      setError("")
      setMessage("")

      const { data: relations, error: relationError } = await supabase
        .from("event_users")
        .select("event_id, role")
        .eq("user_id", user.id)

      if (relationError) {
        setError(relationError.message || "Erro ao validar acesso.")
        setLoading(false)
        return
      }

      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("slug", slug)
        .single()

      if (eventError || !eventData) {
        setError("Evento não encontrado.")
        setLoading(false)
        return
      }

      const relation = relations?.find((r) => r.event_id === eventData.id)

      if (!relation || !["owner", "editor"].includes(relation.role)) {
        setError("Você não tem permissão para editar este evento.")
        setLoading(false)
        return
      }

      const { data: settingsData, error: settingsError } = await supabase
        .from("event_settings")
        .select("*")
        .eq("event_id", eventData.id)
        .single()

      if (settingsError || !settingsData) {
        setError("Não foi possível carregar as configurações do evento.")
        setLoading(false)
        return
      }

      setForm({
        id: eventData.id,
        name: eventData.name || "",
        slug: eventData.slug || "",
        description: eventData.description || "",
        instructions: eventData.instructions || "",
        logo_url: eventData.logo_url || "",
        cover_url: eventData.cover_url || "",
        primary_color: eventData.primary_color || "#111827",
        secondary_color: eventData.secondary_color || "#ffffff",
        accent_color: eventData.accent_color || "#ec4899",
        is_upload_open: eventData.is_upload_open ?? true,
        allow_videos: settingsData.allow_videos ?? true,
        max_photo_size_mb: settingsData.max_photo_size_mb ?? 20,
        max_video_size_mb: settingsData.max_video_size_mb ?? 80,
        max_video_duration_seconds: settingsData.max_video_duration_seconds ?? 45,
        require_guest_name: settingsData.require_guest_name ?? false,
        gallery_mode: settingsData.gallery_mode || "private",
      })

      setLoading(false)
    }

    loadEvent()
  }, [slug, user])

  const previewStyles = useMemo(() => {
    return {
      background: `linear-gradient(135deg, ${form.primary_color} 0%, ${form.accent_color} 100%)`,
      color: form.secondary_color,
    }
  }, [form.primary_color, form.accent_color, form.secondary_color])

  function handleChange(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  async function uploadAsset(file, type) {
    if (!file) return null

    const currentSlug = slugify(form.name) || form.slug

    const path = buildAssetPath(currentSlug, type, file.name)

    const { error: uploadError } = await supabase.storage
      .from("event-media")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      })

    if (uploadError) {
      throw new Error(uploadError.message || `Erro ao enviar ${type}.`)
    }

    const { data, error } = await supabase.storage
      .from("event-media")
      .createSignedUrl(path, 60 * 60 * 24 * 30)

    if (error) {
      throw new Error(error.message || `Erro ao gerar URL da ${type}.`)
    }

    return {
      path,
      signedUrl: data?.signedUrl || "",
    }
  }

  async function handleLogoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploadingLogo(true)
      setError("")
      setMessage("")

      const result = await uploadAsset(file, "logo")

      if (!result?.signedUrl) {
        throw new Error("Não foi possível gerar a URL da logo.")
      }

      handleChange("logo_url", result.signedUrl)
      setMessage("Logo enviada com sucesso.")
    } catch (err) {
      setError(err.message || "Erro ao enviar logo.")
    } finally {
      setUploadingLogo(false)
    }
  }

  async function handleCoverChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploadingCover(true)
      setError("")
      setMessage("")

      const result = await uploadAsset(file, "cover")

      if (!result?.signedUrl) {
        throw new Error("Não foi possível gerar a URL da capa.")
      }

      handleChange("cover_url", result.signedUrl)
      setMessage("Capa enviada com sucesso.")
    } catch (err) {
      setError(err.message || "Erro ao enviar capa.")
    } finally {
      setUploadingCover(false)
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError("")
    setMessage("")

    const newSlug = slugify(form.name)

    if (!form.name.trim()) {
      setError("Informe o nome do evento.")
      setSaving(false)
      return
    }

    const { error: eventError } = await supabase
      .from("events")
      .update({
        name: form.name.trim(),
        slug: newSlug,
        description: form.description.trim() || null,
        instructions: form.instructions.trim() || null,
        logo_url: form.logo_url || null,
        cover_url: form.cover_url || null,
        primary_color: form.primary_color,
        secondary_color: form.secondary_color,
        accent_color: form.accent_color,
        is_upload_open: form.is_upload_open,
      })
      .eq("id", form.id)

    if (eventError) {
      setError(eventError.message || "Erro ao atualizar o evento.")
      setSaving(false)
      return
    }

    const { error: settingsError } = await supabase
      .from("event_settings")
      .update({
        allow_videos: form.allow_videos,
        max_photo_size_mb: Number(form.max_photo_size_mb),
        max_video_size_mb: Number(form.max_video_size_mb),
        max_video_duration_seconds: Number(form.max_video_duration_seconds),
        require_guest_name: form.require_guest_name,
        gallery_mode: form.gallery_mode,
      })
      .eq("event_id", form.id)

    if (settingsError) {
      setError(settingsError.message || "Erro ao atualizar configurações.")
      setSaving(false)
      return
    }

    setForm((prev) => ({
      ...prev,
      slug: newSlug,
    }))

    setMessage("Evento atualizado com sucesso.")
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

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-600" />
          <p className="mt-3 text-slate-600">Carregando configurações...</p>
        </div>
      </main>
    )
  }

  if (error && !form.id) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
          <h1 className="text-2xl font-bold text-slate-900">Erro</h1>
          <p className="mt-3 text-slate-600">{error}</p>
          <Link
            to="/painel"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao painel
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[30px] bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Link
                to="/painel"
                className="inline-flex items-center gap-2 text-sm font-medium text-pink-600"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar ao painel
              </Link>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-pink-100 px-3 py-1 text-sm font-medium text-pink-700">
                <Settings2 className="h-4 w-4" />
                Configurações do evento
              </div>

              <h1 className="mt-4 text-3xl font-bold text-slate-900 sm:text-4xl">
                Editar evento
              </h1>
              <p className="mt-3 max-w-2xl text-slate-600">
                Ajuste textos, imagens, cores e regras de upload.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
          <form
            onSubmit={handleSave}
            className="rounded-[30px] bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8"
          >
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Nome do evento
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Slug atual
                </label>
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-slate-600">
                  {form.slug || "Sem slug"}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Descrição
                </label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Instruções
                </label>
                <textarea
                  rows={3}
                  value={form.instructions}
                  onChange={(e) => handleChange("instructions", e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
                />
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Logo do evento
                  </label>

                  <label className="flex cursor-pointer items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center hover:bg-slate-100">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                    <div>
                      {uploadingLogo ? (
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-600" />
                      ) : (
                        <Upload className="mx-auto h-6 w-6 text-slate-600" />
                      )}
                      <p className="mt-2 text-sm font-medium text-slate-800">
                        {uploadingLogo ? "Enviando logo..." : "Enviar logo"}
                      </p>
                    </div>
                  </label>

                  {form.logo_url && (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                      <img
                        src={form.logo_url}
                        alt="Logo do evento"
                        className="h-24 w-auto object-contain"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Capa do evento
                  </label>

                  <label className="flex cursor-pointer items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center hover:bg-slate-100">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverChange}
                      className="hidden"
                    />
                    <div>
                      {uploadingCover ? (
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-600" />
                      ) : (
                        <ImagePlus className="mx-auto h-6 w-6 text-slate-600" />
                      )}
                      <p className="mt-2 text-sm font-medium text-slate-800">
                        {uploadingCover ? "Enviando capa..." : "Enviar capa"}
                      </p>
                    </div>
                  </label>

                  {form.cover_url && (
                    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                      <img
                        src={form.cover_url}
                        alt="Capa do evento"
                        className="h-32 w-full object-cover"
                      />
                    </div>
                  )}
                </div>
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

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                  <span>
                    <span className="block font-medium text-slate-900">Upload aberto</span>
                    <span className="mt-1 block text-sm text-slate-500">
                      Permite que convidados enviem arquivos.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={form.is_upload_open}
                    onChange={(e) => handleChange("is_upload_open", e.target.checked)}
                    className="h-5 w-5"
                  />
                </label>

                <label className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                  <span>
                    <span className="block font-medium text-slate-900">Permitir vídeos</span>
                    <span className="mt-1 block text-sm text-slate-500">
                      Aceitar ou bloquear vídeos no evento.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={form.allow_videos}
                    onChange={(e) => handleChange("allow_videos", e.target.checked)}
                    className="h-5 w-5"
                  />
                </label>

                <label className="flex items-center justify-between rounded-2xl border border-slate-200 p-4 sm:col-span-2">
                  <span>
                    <span className="block font-medium text-slate-900">Exigir nome do convidado</span>
                    <span className="mt-1 block text-sm text-slate-500">
                      Obriga a informar nome antes do upload.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={form.require_guest_name}
                    onChange={(e) => handleChange("require_guest_name", e.target.checked)}
                    className="h-5 w-5"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Máx. foto (MB)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.max_photo_size_mb}
                    onChange={(e) => handleChange("max_photo_size_mb", e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Máx. vídeo (MB)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.max_video_size_mb}
                    onChange={(e) => handleChange("max_video_size_mb", e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Duração vídeo (s)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.max_video_duration_seconds}
                    onChange={(e) =>
                      handleChange("max_video_duration_seconds", e.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Modo da galeria
                </label>
                <select
                  value={form.gallery_mode}
                  onChange={(e) => handleChange("gallery_mode", e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
                >
                  <option value="private">Aprovar automaticamente</option>
                  <option value="approved_only">Entrar como pendente</option>
                </select>
              </div>

              {(error || message) && (
                <div
                  className={`rounded-2xl px-4 py-3 text-sm ${
                    error
                      ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                      : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                  }`}
                >
                  {error || message}
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 font-medium text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Salvar alterações
                  </>
                )}
              </button>
            </div>
          </form>

          <aside className="space-y-6">
            <section className="overflow-hidden rounded-[30px] bg-white shadow-sm ring-1 ring-slate-200">
              {form.cover_url ? (
                <img
                  src={form.cover_url}
                  alt="Capa do evento"
                  className="h-48 w-full object-cover"
                />
              ) : (
                <div className="h-48 w-full" style={previewStyles} />
              )}

              <div
                className="p-6"
                style={!form.cover_url ? previewStyles : undefined}
              >
                {form.logo_url && (
                  <img
                    src={form.logo_url}
                    alt="Logo do evento"
                    className="mb-4 h-16 w-auto object-contain"
                  />
                )}

                <p className="text-sm font-medium opacity-80">Prévia visual</p>
                <h2 className="mt-3 text-3xl font-bold">
                  {form.name || "Nome do evento"}
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-6 opacity-90">
                  {form.description || "Descrição do evento aparecerá aqui."}
                </p>
              </div>

              <div className="p-6">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-semibold text-slate-800">Instruções</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {form.instructions || "As instruções aparecerão aqui."}
                  </p>
                </div>

                <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Novo slug ao salvar:{" "}
                  <span className="font-semibold">
                    {slugify(form.name) || "sem-slug"}
                  </span>
                </div>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  )
}