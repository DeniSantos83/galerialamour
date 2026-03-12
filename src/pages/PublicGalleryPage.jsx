import { useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"
import {
  X,
  Video,
  Loader2,
  Camera,
  PlayCircle,
  Heart,
  Images,
} from "lucide-react"
import { supabase } from "../lib/supabase"

function MediaModal({ item, onClose }) {
  if (!item) return null

  const isVideo = item.file_type === "video"

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="relative w-full max-w-6xl overflow-hidden rounded-[28px] bg-black shadow-2xl"
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="max-h-[88vh] overflow-auto bg-black">
            {isVideo ? (
              <video
                src={item.url}
                controls
                autoPlay
                playsInline
                className="max-h-[88vh] w-full object-contain"
              />
            ) : (
              <img
                src={item.url}
                alt={item.guest_name || "Foto do evento"}
                className="max-h-[88vh] w-full object-contain"
              />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function MediaCard({ item, onOpen }) {
  const isVideo = item.file_type === "video"

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="group overflow-hidden rounded-[28px] border border-white/10 bg-white/6 shadow-sm backdrop-blur"
    >
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="block w-full text-left"
      >
        {isVideo ? (
          <div className="relative aspect-[4/5] overflow-hidden bg-slate-900">
            <video
              src={item.url}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
              muted
              playsInline
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
            <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-800">
              Vídeo
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="rounded-full bg-white/90 p-3 text-slate-900 shadow-lg">
                <PlayCircle className="h-7 w-7" />
              </div>
            </div>
          </div>
        ) : (
          <div className="relative overflow-hidden">
            <img
              src={item.url}
              alt={item.guest_name || "Foto do evento"}
              className="h-auto w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            />
            <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-800">
              Foto
            </div>
          </div>
        )}
      </button>
    </motion.article>
  )
}

export default function PublicGalleryPage() {
  const { slug } = useParams()

  const [event, setEvent] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState(null)

  useEffect(() => {
    loadGallery()
  }, [slug])

  async function loadGallery() {
    setLoading(true)

    const { data: eventData } = await supabase
      .from("events")
      .select("*")
      .eq("slug", slug)
      .single()

    if (!eventData) {
      setEvent(null)
      setItems([])
      setLoading(false)
      return
    }

    setEvent(eventData)

    const { data } = await supabase
      .from("uploads")
      .select("*")
      .eq("event_id", eventData.id)
      .eq("status", "approved")
      .order("created_at", { ascending: false })

    const itemsWithUrl = await Promise.all(
      (data || []).map(async (item) => {
        const { data: signed } = await supabase.storage
          .from("event-media")
          .createSignedUrl(item.file_path, 60 * 60)

        return {
          ...item,
          url: signed?.signedUrl || null,
        }
      })
    )

    setItems(itemsWithUrl.filter((item) => item.url))
    setLoading(false)
  }

  const stats = useMemo(() => {
    const total = items.length
    const photos = items.filter((item) => item.file_type === "image").length
    const videos = items.filter((item) => item.file_type === "video").length

    return { total, photos, videos }
  }, [items])

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-white/70" />
          <p className="mt-3 text-white/70">Carregando galeria...</p>
        </div>
      </main>
    )
  }

  if (!event) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
        <div className="w-full max-w-lg rounded-[28px] border border-white/10 bg-white/5 p-8 text-center shadow-sm backdrop-blur">
          <h1 className="text-2xl font-bold text-white">Galeria não encontrada</h1>
          <p className="mt-3 text-white/70">
            Não foi possível localizar esse evento.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative overflow-hidden">
        <div
          className="relative min-h-[340px] sm:min-h-[420px]"
          style={
            event.cover_url
              ? {
                  backgroundImage: `linear-gradient(rgba(15,23,42,0.48), rgba(15,23,42,0.72)), url(${event.cover_url})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : {
                  background: `linear-gradient(135deg, ${event.primary_color || "#111827"} 0%, ${event.accent_color || "#ec4899"} 100%)`,
                }
          }
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_24%)]" />
          <div className="relative mx-auto flex min-h-[340px] max-w-7xl items-end px-6 py-10 sm:min-h-[420px] lg:px-8">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm font-medium text-yellow-200 backdrop-blur">
                <Heart className="h-4 w-4" />
                L’Amour Galeria
              </div>

              {event.logo_url && (
                <img
                  src={event.logo_url}
                  alt={`Logo de ${event.name}`}
                  className="mb-5 mt-5 h-16 w-auto max-w-[180px] object-contain sm:h-20"
                />
              )}

              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                {event.name}
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/80 sm:text-base">
                {event.description ||
                  "Reviva esse momento por diferentes olhares, registros e emoções."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-[30px] border border-white/10 bg-white/5 p-5 shadow-sm backdrop-blur sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-200">Momentos compartilhados</p>
              <h2 className="mt-2 text-2xl font-bold text-white">
                Galeria dos convidados
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/65">
                Uma curadoria visual dos registros aprovados desse evento.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center">
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-xs uppercase tracking-wide text-white/60">Total</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center">
                <p className="text-2xl font-bold text-white">{stats.photos}</p>
                <p className="text-xs uppercase tracking-wide text-white/60">Fotos</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center">
                <p className="text-2xl font-bold text-white">{stats.videos}</p>
                <p className="text-xs uppercase tracking-wide text-white/60">Vídeos</p>
              </div>
            </div>
          </div>
        </div>

        {items.length === 0 ? (
          <section className="mt-6 rounded-[30px] border border-white/10 bg-white/5 p-10 text-center shadow-sm backdrop-blur">
            <Images className="mx-auto h-10 w-10 text-white/45" />
            <p className="mt-4 text-lg font-semibold text-white">
              Ainda não há arquivos aprovados
            </p>
            <p className="mt-2 text-white/65">
              Assim que houver fotos ou vídeos liberados, eles aparecerão aqui.
            </p>
          </section>
        ) : (
          <section className="mt-6 columns-1 gap-4 space-y-4 sm:columns-2 lg:columns-3 xl:columns-4">
            {items.map((item) => (
              <div key={item.id} className="break-inside-avoid">
                <MediaCard item={item} onOpen={setSelectedItem} />
              </div>
            ))}
          </section>
        )}
      </section>

      <AnimatePresence>
        {selectedItem && (
          <MediaModal
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
          />
        )}
      </AnimatePresence>
    </main>
  )
}