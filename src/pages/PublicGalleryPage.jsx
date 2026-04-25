import { useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"
import {
  X,
  Loader2,
  PlayCircle,
  Heart,
  Images,
  Sparkles,
  Camera,
  Video,
} from "lucide-react"
import { supabase } from "../lib/supabase"

function MediaModal({ item, onClose }) {
  if (!item) return null

  const isVideo = item.file_type === "video"

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="relative w-full max-w-6xl overflow-hidden rounded-[26px] bg-black shadow-2xl ring-1 ring-white/10"
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-slate-950 shadow-lg transition hover:scale-105 hover:bg-white"
            aria-label="Fechar mídia"
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
                className="max-h-[88vh] w-full bg-black object-contain"
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
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.25 }}
      className="group overflow-hidden rounded-2xl border border-white/10 bg-white/10 shadow-sm backdrop-blur transition hover:border-white/20 hover:shadow-2xl"
    >
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="relative block w-full overflow-hidden text-left"
      >
        {isVideo ? (
          <div className="relative aspect-square overflow-hidden bg-slate-900">
            <video
              src={item.url}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              muted
              playsInline
              preload="metadata"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

            <div className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-slate-900 shadow-sm sm:left-3 sm:top-3 sm:px-3 sm:py-1 sm:text-xs">
              <Video className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">Vídeo</span>
            </div>

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="rounded-full bg-white/90 p-2 text-slate-950 shadow-lg transition group-hover:scale-110 sm:p-3">
                <PlayCircle className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
            </div>
          </div>
        ) : (
          <div className="relative aspect-square overflow-hidden bg-slate-900">
            <img
              src={item.url}
              alt={item.guest_name || "Foto do evento"}
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-80" />

            <div className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-slate-900 shadow-sm sm:left-3 sm:top-3 sm:px-3 sm:py-1 sm:text-xs">
              <Camera className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">Foto</span>
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
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-white/5 shadow-sm backdrop-blur">
            <Loader2 className="h-8 w-8 animate-spin text-yellow-200" />
          </div>
          <p className="mt-4 text-sm font-medium text-white/75">
            Carregando galeria...
          </p>
        </div>
      </main>
    )
  }

  if (!event) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
        <div className="w-full max-w-lg rounded-[28px] border border-white/10 bg-white/5 p-8 text-center shadow-sm backdrop-blur">
          <Images className="mx-auto h-10 w-10 text-white/50" />
          <h1 className="mt-4 text-2xl font-bold text-white">
            Galeria não encontrada
          </h1>
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
          className="relative min-h-[330px] sm:min-h-[420px]"
          style={
            event.cover_url
              ? {
                  backgroundImage: `linear-gradient(rgba(15,23,42,0.42), rgba(15,23,42,0.82)), url(${event.cover_url})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : {
                  background: `linear-gradient(135deg, ${
                    event.primary_color || "#111827"
                  } 0%, ${event.accent_color || "#ec4899"} 100%)`,
                }
          }
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_26%)]" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-950 to-transparent" />

          <div className="relative mx-auto flex min-h-[330px] max-w-7xl items-end px-5 py-9 sm:min-h-[420px] sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-yellow-200 shadow-sm backdrop-blur sm:text-sm">
                <Heart className="h-4 w-4" />
                L’Amour Galeria
              </div>

              {event.logo_url && (
                <img
                  src={event.logo_url}
                  alt={`Logo de ${event.name}`}
                  className="mb-5 mt-5 h-14 w-auto max-w-[170px] object-contain drop-shadow-lg sm:h-20 sm:max-w-[210px]"
                />
              )}

              <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-sm sm:text-5xl">
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

      <section className="mx-auto max-w-7xl px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-4 shadow-sm backdrop-blur sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-medium text-yellow-200">
                <Sparkles className="h-4 w-4" />
                Momentos compartilhados
              </p>

              <h2 className="mt-2 text-2xl font-bold text-white">
                Galeria dos convidados
              </h2>

              <p className="mt-2 text-sm leading-6 text-white/65">
                Uma curadoria visual dos registros aprovados desse evento.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-center sm:px-4">
                <p className="text-xl font-bold text-white sm:text-2xl">
                  {stats.total}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-white/60 sm:text-xs">
                  Total
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-center sm:px-4">
                <p className="text-xl font-bold text-white sm:text-2xl">
                  {stats.photos}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-white/60 sm:text-xs">
                  Fotos
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-center sm:px-4">
                <p className="text-xl font-bold text-white sm:text-2xl">
                  {stats.videos}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-white/60 sm:text-xs">
                  Vídeos
                </p>
              </div>
            </div>
          </div>
        </div>

        {items.length === 0 ? (
          <section className="mt-6 rounded-[28px] border border-white/10 bg-white/5 p-10 text-center shadow-sm backdrop-blur">
            <Images className="mx-auto h-10 w-10 text-white/45" />
            <p className="mt-4 text-lg font-semibold text-white">
              Ainda não há arquivos aprovados
            </p>
            <p className="mt-2 text-white/65">
              Assim que houver fotos ou vídeos liberados, eles aparecerão aqui.
            </p>
          </section>
        ) : (
          <section className="mt-5 grid grid-cols-3 gap-2 sm:mt-6 sm:gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {items.map((item) => (
              <div key={item.id} className="min-w-0">
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