import { useEffect, useMemo, useRef, useState } from "react"
import { useParams } from "react-router-dom"
import { motion } from "framer-motion"
import {
  Upload,
  Image as ImageIcon,
  Video,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { supabase } from "../lib/supabase"
import {
  getFileCategory,
  validateFileSize,
  validateFileType,
  validateVideoDuration,
} from "../lib/validators"
import { formatBytes } from "../lib/utils"

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

function buildStoragePath(slug, fileName) {
  const safeName = sanitizeFileName(fileName)
  const timestamp = Date.now()
  const random = Math.random().toString(36).slice(2, 8)
  return `events/${slug}/uploads/${timestamp}-${random}-${safeName}`
}

export default function EventUploadPage() {
  const { slug } = useParams()
  const fileInputRef = useRef(null)

  const [event, setEvent] = useState(null)
  const [settings, setSettings] = useState(null)
  const [loadingPage, setLoadingPage] = useState(true)
  const [pageError, setPageError] = useState("")

  const [guestName, setGuestName] = useState("")
  const [selectedFile, setSelectedFile] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState("idle")

  useEffect(() => {
    async function loadEventPage() {
      setLoadingPage(true)
      setPageError("")

      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select(`
          id,
          slug,
          name,
          description,
          logo_url,
          cover_url,
          primary_color,
          secondary_color,
          accent_color,
          instructions,
          is_upload_open
        `)
        .eq("slug", slug)
        .single()

      if (eventError || !eventData) {
        setPageError("Evento não encontrado ou indisponível.")
        setLoadingPage(false)
        return
      }

      const { data: settingsData } = await supabase
        .from("event_settings")
        .select(`
          allow_videos,
          max_photo_size_mb,
          max_video_size_mb,
          max_video_duration_seconds,
          require_guest_name,
          gallery_mode
        `)
        .eq("event_id", eventData.id)
        .single()

      setEvent(eventData)
      setSettings(settingsData ?? null)
      setLoadingPage(false)
    }

    loadEventPage()
  }, [slug])

  const theme = useMemo(() => {
    return {
      primary: event?.primary_color || "#111827",
      secondary: event?.secondary_color || "#ffffff",
      accent: event?.accent_color || "#ec4899",
    }
  }, [event])

  const handleSelectClick = () => {
    if (uploading) return
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    setMessage("")
    setMessageType("idle")

    if (!file) {
      setSelectedFile(null)
      setSelectedCategory(null)
      return
    }

    const typeError = validateFileType(file)
    if (typeError) {
      setSelectedFile(null)
      setSelectedCategory(null)
      setMessage(typeError)
      setMessageType("error")
      return
    }

    const category = getFileCategory(file)

    if (category === "video" && settings?.allow_videos === false) {
      setSelectedFile(null)
      setSelectedCategory(null)
      setMessage("Este evento não aceita envio de vídeos.")
      setMessageType("error")
      return
    }

    const sizeError = validateFileSize(file, settings)
    if (sizeError) {
      setSelectedFile(null)
      setSelectedCategory(null)
      setMessage(sizeError)
      setMessageType("error")
      return
    }

    if (category === "video") {
      try {
        const durationError = await validateVideoDuration(file, settings)
        if (durationError) {
          setSelectedFile(null)
          setSelectedCategory(null)
          setMessage(durationError)
          setMessageType("error")
          return
        }
      } catch (error) {
        setSelectedFile(null)
        setSelectedCategory(null)
        setMessage(error.message || "Não foi possível validar o vídeo.")
        setMessageType("error")
        return
      }
    }

    setSelectedFile(file)
    setSelectedCategory(category)
    setMessage("Arquivo selecionado com sucesso.")
    setMessageType("success")
  }

  const handleUpload = async () => {
    setMessage("")
    setMessageType("idle")

    if (!event) return

    if (!event.is_upload_open) {
      setMessage("Os envios para este evento estão encerrados no momento.")
      setMessageType("error")
      return
    }

    if (settings?.require_guest_name && !guestName.trim()) {
      setMessage("Informe seu nome antes de enviar o arquivo.")
      setMessageType("error")
      return
    }

    if (!selectedFile || !selectedCategory) {
      setMessage("Selecione uma foto ou vídeo antes de enviar.")
      setMessageType("error")
      return
    }

    setUploading(true)

    const storagePath = buildStoragePath(event.slug, selectedFile.name)

    const { error: storageError } = await supabase.storage
      .from("event-media")
      .upload(storagePath, selectedFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: selectedFile.type,
      })

    if (storageError) {
  console.error("ERRO STORAGE:", storageError)
  setMessage(`STORAGE: ${storageError.message || "Falha ao enviar o arquivo."}`)
  setMessageType("error")
  setUploading(false)
  return
}

    let durationSeconds = null

    if (selectedCategory === "video") {
      try {
        const video = document.createElement("video")
        const url = URL.createObjectURL(selectedFile)

        durationSeconds = await new Promise((resolve, reject) => {
          video.preload = "metadata"

          video.onloadedmetadata = () => {
            URL.revokeObjectURL(url)
            resolve(Math.round(video.duration))
          }

          video.onerror = () => {
            URL.revokeObjectURL(url)
            reject(new Error("Não foi possível obter a duração do vídeo."))
          }

          video.src = url
        })
      } catch {
        durationSeconds = null
      }
    }

    const { error: insertError } = await supabase
      .from("uploads")
      .insert({
        event_id: event.id,
        file_path: storagePath,
        file_url: null,
        file_type: selectedCategory,
        mime_type: selectedFile.type,
        size_bytes: selectedFile.size,
        duration_seconds: durationSeconds,
        orientation: null,
        status: settings?.gallery_mode === "approved_only" ? "pending" : "approved",
        guest_name: guestName.trim() || null,
      })

    if (insertError) {
  console.error("ERRO BANCO:", insertError)
  setMessage(
    `BANCO: ${insertError.message || "Arquivo enviado, mas houve erro ao registrar no banco."}`
  )
  setMessageType("error")
  setUploading(false)
  return
}

    setMessage("Arquivo enviado com sucesso. Obrigado por compartilhar esse momento.")
    setMessageType("success")
    setSelectedFile(null)
    setSelectedCategory(null)
    setGuestName("")

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }

    setUploading(false)
  }

  if (loadingPage) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-600" />
          <p className="mt-3 text-slate-600">Carregando evento...</p>
        </div>
      </main>
    )
  }

  if (pageError || !event) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
          <AlertCircle className="mx-auto h-10 w-10 text-rose-500" />
          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            Evento indisponível
          </h1>
          <p className="mt-3 text-slate-600">
            {pageError || "Não foi possível carregar a página."}
          </p>
        </div>
      </main>
    )
  }

  return (
    <main
      className="min-h-screen px-4 py-8 sm:px-6"
      style={{
        background: `linear-gradient(180deg, ${theme.secondary} 0%, #f8fafc 100%)`,
      }}
    >
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-[28px] bg-white shadow-sm ring-1 ring-slate-200"
        >
          <div
            className="relative min-h-[240px] px-6 py-8 sm:px-8"
            style={
              event?.cover_url
            ? {
               backgroundImage: `linear-gradient(rgba(15,23,42,0.45), rgba(15,23,42,0.55)), url(${event.cover_url})`,
               backgroundSize: "cover",
               backgroundPosition: "center",
              }
            : { backgroundColor: theme.primary }
          }
          >
            <div className="relative z-10 max-w-xl text-white">
            <div
              className="inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]"
              style={{ backgroundColor: theme.accent, color: theme.secondary }}
            >
              Envie seus registros
            </div>

              {event.logo_url && (
                <img
                    src={event.logo_url}
                    alt={`Logo de ${event.name}`}
                    className="mb-4 mt-4 h-16 w-auto max-w-[180px] object-contain"
                />
              )}

            <h1 className="mt-5 text-3xl font-bold leading-tight sm:text-4xl">
            {event.name}
            </h1>

  <p className="mt-4 text-sm/6 text-white/80 sm:text-base/7">
    {event.description || "Compartilhe fotos e vídeos desse momento especial."}
  </p>
</div>

            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_40%)]" />
          </div>

          <div className="p-6 sm:p-8">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-800">Instruções</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {event.instructions ||
                  "Selecione uma foto ou vídeo e envie com poucos toques."}
              </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-slate-800">
                  <ImageIcon className="h-4 w-4" />
                  <span className="text-sm font-medium">Fotos</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  Até {settings?.max_photo_size_mb ?? 20} MB
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-slate-800">
                  <Video className="h-4 w-4" />
                  <span className="text-sm font-medium">Vídeos</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {settings?.allow_videos === false
                    ? "Desativado"
                    : `Até ${settings?.max_video_duration_seconds ?? 45}s`}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-slate-800">
                  <Upload className="h-4 w-4" />
                  <span className="text-sm font-medium">Envio rápido</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  Feito direto do celular
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8"
        >
          <div>
            <p className="text-sm font-semibold" style={{ color: theme.accent }}>
              Área de upload
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              Compartilhe sua foto ou vídeo
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Arquivos aceitos: JPG, PNG, WEBP, MP4, MOV e WEBM.
            </p>
          </div>

          <div className="mt-6 space-y-5">
            {settings?.require_guest_name && (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Seu nome
                </label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Digite seu nome"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
                />
              </div>
            )}

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
                onChange={handleFileChange}
                className="hidden"
              />

              <button
                type="button"
                onClick={handleSelectClick}
                className="flex w-full flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center transition hover:border-slate-500 hover:bg-slate-100"
              >
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: `${theme.accent}20`, color: theme.accent }}
                >
                  <Upload className="h-7 w-7" />
                </div>

                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  Selecionar arquivo
                </h3>

                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
                  Toque aqui para escolher uma foto ou vídeo da sua galeria.
                </p>
              </button>
            </div>

            {selectedFile && (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <div
                    className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${theme.primary}12`, color: theme.primary }}
                  >
                    {selectedCategory === "image" ? (
                      <ImageIcon className="h-5 w-5" />
                    ) : (
                      <Video className="h-5 w-5" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {selectedFile.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {selectedCategory === "image" ? "Foto" : "Vídeo"} ·{" "}
                      {formatBytes(selectedFile.size)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {message && (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  messageType === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : messageType === "error"
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                <div className="flex items-start gap-2">
                  {messageType === "success" ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4" />
                  ) : messageType === "error" ? (
                    <AlertCircle className="mt-0.5 h-4 w-4" />
                  ) : null}
                  <span>{message}</span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading || !event.is_upload_open}
              className="inline-flex w-full items-center justify-center rounded-2xl px-5 py-3.5 font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-60"
              style={{ backgroundColor: theme.primary }}
            >
              {uploading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando arquivo...
                </span>
              ) : event.is_upload_open ? (
                "Enviar agora"
              ) : (
                "Envios encerrados"
              )}
            </button>
          </div>
        </motion.section>
      </div>
    </main>
  )
}