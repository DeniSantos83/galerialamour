import { useEffect, useMemo, useState } from "react"
import { Navigate, useParams } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  Image as ImageIcon,
  Video,
  Trash2,
  Loader2,
  AlertCircle,
  Check,
  Filter,
  Clock3,
  CheckCircle2,
  XCircle,
  Sparkles,
  Shield,
  Images,
} from "lucide-react"
import { supabase } from "../lib/supabase"
import { formatBytes } from "../lib/utils"

function getSignedUrlForPath(filePath) {
  return supabase.storage
    .from("event-media")
    .createSignedUrl(filePath, 60 * 60)
}

function StatusBadge({ status }) {
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Aprovado
      </span>
    )
  }

  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
        <Clock3 className="h-3.5 w-3.5" />
        Pendente
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
      {status}
    </span>
  )
}

function MediaCard({
  item,
  onOpen,
  onDelete,
  onApprove,
  onReject,
  deletingId,
  updatingId,
  userRole,
}) {
  const isVideo = item.file_type === "video"
  const canModerate = userRole === "owner" || userRole === "editor"

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="group overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm"
    >
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="relative block w-full overflow-hidden bg-slate-100 text-left"
      >
        {isVideo ? (
          <div className="relative aspect-[4/5] w-full bg-slate-900">
            {item.signedUrl ? (
              <video
                src={item.signedUrl}
                className="h-full w-full object-cover opacity-90 transition duration-300 group-hover:scale-[1.02]"
                muted
                playsInline
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Video className="h-10 w-10 text-white/70" />
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent" />
            <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-800">
              Vídeo
            </div>
          </div>
        ) : item.signedUrl ? (
          <div className="relative">
            <img
              src={item.signedUrl}
              alt={item.guest_name || "Foto do evento"}
              className="h-auto w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            />
            <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-800">
              Foto
            </div>
          </div>
        ) : (
          <div className="flex aspect-[4/5] items-center justify-center bg-slate-100">
            <ImageIcon className="h-10 w-10 text-slate-400" />
          </div>
        )}
      </button>

      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              {item.guest_name || "Convidado"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {isVideo ? "Vídeo" : "Foto"} · {formatBytes(item.size_bytes)}
            </p>
          </div>

          <StatusBadge status={item.status} />
        </div>

        {canModerate && (
          <div className="flex flex-wrap gap-2">
            {item.status === "pending" && (
              <>
                <button
                  type="button"
                  onClick={() => onApprove(item)}
                  disabled={updatingId === item.id}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-60"
                >
                  {updatingId === item.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  Aprovar
                </button>

                <button
                  type="button"
                  onClick={() => onReject(item)}
                  disabled={updatingId === item.id}
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 disabled:opacity-60"
                >
                  {updatingId === item.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5" />
                  )}
                  Rejeitar
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => onDelete(item)}
              disabled={deletingId === item.id}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 disabled:opacity-60"
            >
              {deletingId === item.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Excluir
            </button>
          </div>
        )}
      </div>
    </motion.article>
  )
}

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
          className="relative w-full max-w-5xl overflow-hidden rounded-3xl bg-black shadow-2xl"
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

          <div className="max-h-[85vh] overflow-auto bg-black">
            {isVideo ? (
              <video
                src={item.signedUrl}
                controls
                autoPlay
                playsInline
                className="max-h-[85vh] w-full bg-black object-contain"
              />
            ) : (
              <img
                src={item.signedUrl}
                alt={item.guest_name || "Foto ampliada"}
                className="max-h-[85vh] w-full object-contain"
              />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default function EventGalleryPage() {
  const { slug } = useParams()

  const [user, setUser] = useState(null)
  const [loadingUser, setLoadingUser] = useState(true)

  const [event, setEvent] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedItem, setSelectedItem] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [updatingId, setUpdatingId] = useState(null)
  const [userRole, setUserRole] = useState("viewer")
  const [filter, setFilter] = useState("all")

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

    async function loadGallery() {
      setLoading(true)
      setError("")

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

      const { data: relations, error: relationError } = await supabase
        .from("event_users")
        .select("event_id, role")
        .eq("user_id", user.id)

      if (relationError) {
        setError(relationError.message || "Erro ao validar acesso ao evento.")
        setLoading(false)
        return
      }

      const relation = relations?.find((r) => r.event_id === eventData.id)

      let resolvedRole = relation?.role || "viewer"
      let hasAccess = !!relation

      if (!hasAccess) {
        const { data: partnerData, error: partnerError } = await supabase
          .from("partners")
          .select("id")
          .eq("profile_id", user.id)
          .maybeSingle()

        if (partnerError) {
          setError(partnerError.message || "Erro ao validar parceiro.")
          setLoading(false)
          return
        }

        const isOwner = eventData.created_by === user.id
        const isLinkedPartner =
          !!partnerData && eventData.partner_id === partnerData.id

        if (isOwner || isLinkedPartner) {
          hasAccess = true
          resolvedRole = isOwner ? "owner" : "editor"
        }
      }

      if (!hasAccess) {
        setError("Você não tem acesso a esta galeria.")
        setLoading(false)
        return
      }

      setUserRole(resolvedRole)
      setEvent(eventData)

      const { data: uploadsData, error: uploadsError } = await supabase
        .from("uploads")
        .select("*")
        .eq("event_id", eventData.id)
        .in("status", ["approved", "pending"])
        .order("created_at", { ascending: false })

      if (uploadsError) {
        setError(uploadsError.message || "Erro ao carregar uploads.")
        setLoading(false)
        return
      }

      const withUrls = await Promise.all(
        (uploadsData || []).map(async (item) => {
          const { data: signedData, error: signedError } = await getSignedUrlForPath(
            item.file_path
          )

          return {
            ...item,
            signedUrl: signedError ? null : signedData?.signedUrl || null,
          }
        })
      )

      setItems(withUrls)
      setLoading(false)
    }

    loadGallery()
  }, [slug, user])

  const stats = useMemo(() => {
    const total = items.length
    const photos = items.filter((item) => item.file_type === "image").length
    const videos = items.filter((item) => item.file_type === "video").length
    const pending = items.filter((item) => item.status === "pending").length
    const approved = items.filter((item) => item.status === "approved").length

    return { total, photos, videos, pending, approved }
  }, [items])

  const filteredItems = useMemo(() => {
    if (filter === "all") return items
    return items.filter((item) => item.status === filter)
  }, [items, filter])

  async function handleDelete(item) {
    const confirmed = window.confirm("Deseja excluir este arquivo da galeria?")
    if (!confirmed) return

    setDeletingId(item.id)

    const { error: storageError } = await supabase.storage
      .from("event-media")
      .remove([item.file_path])

    if (storageError) {
      alert(storageError.message || "Erro ao excluir arquivo do storage.")
      setDeletingId(null)
      return
    }

    const { error: dbError } = await supabase
      .from("uploads")
      .delete()
      .eq("id", item.id)

    if (dbError) {
      alert(dbError.message || "Erro ao excluir registro do banco.")
      setDeletingId(null)
      return
    }

    setItems((prev) => prev.filter((media) => media.id !== item.id))
    if (selectedItem?.id === item.id) setSelectedItem(null)
    setDeletingId(null)
  }

  async function updateStatus(item, status) {
    setUpdatingId(item.id)

    const { error } = await supabase
      .from("uploads")
      .update({ status })
      .eq("id", item.id)

    if (error) {
      alert(error.message || "Erro ao atualizar status.")
      setUpdatingId(null)
      return
    }

    if (status === "rejected") {
      setItems((prev) => prev.filter((media) => media.id !== item.id))
      setUpdatingId(null)
      return
    }

    setItems((prev) =>
      prev.map((media) =>
        media.id === item.id ? { ...media, status } : media
      )
    )

    if (selectedItem?.id === item.id) {
      setSelectedItem((prev) => (prev ? { ...prev, status } : prev))
    }

    setUpdatingId(null)
  }

  function handleApprove(item) {
    updateStatus(item, "approved")
  }

  function handleReject(item) {
    updateStatus(item, "rejected")
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
          <p className="mt-3 text-slate-600">Carregando galeria...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
          <AlertCircle className="mx-auto h-10 w-10 text-rose-500" />
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Erro na galeria</h1>
          <p className="mt-3 text-slate-600">{error}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-8 p-6 sm:p-8 xl:grid-cols-[1.05fr_0.95fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-700">
                <Sparkles className="h-4 w-4" />
                Galeria premium
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                {event?.name}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
                Visualize os registros enviados pelos convidados, aprove ou remova conteúdos e mantenha a galeria organizada com um fluxo mais elegante.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-medium text-yellow-600">Total</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{stats.total}</p>
                <p className="mt-2 text-sm text-slate-600">Arquivos carregados</p>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-medium text-yellow-600">Aprovados</p>
                <p className="mt-2 text-3xl font-bold text-emerald-700">{stats.approved}</p>
                <p className="mt-2 text-sm text-slate-600">Prontos para exibição</p>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-medium text-yellow-600">Pendentes</p>
                <p className="mt-2 text-3xl font-bold text-amber-700">{stats.pending}</p>
                <p className="mt-2 text-sm text-slate-600">Aguardando moderação</p>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-medium text-yellow-600">Fotos</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{stats.photos}</p>
                <p className="mt-2 text-sm text-slate-600">Imagens do evento</p>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-medium text-yellow-600">Vídeos</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{stats.videos}</p>
                <p className="mt-2 text-sm text-slate-600">Clipes curtos enviados</p>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-medium text-yellow-600">Acesso</p>
                <p className="mt-2 text-2xl font-bold text-slate-900 capitalize">{userRole}</p>
                <p className="mt-2 text-sm text-slate-600">Seu papel na moderação</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
              <Filter className="h-4 w-4" />
              Filtro
            </div>

            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                filter === "all"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              Todos
            </button>

            <button
              type="button"
              onClick={() => setFilter("approved")}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                filter === "approved"
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              Aprovados
            </button>

            <button
              type="button"
              onClick={() => setFilter("pending")}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                filter === "pending"
                  ? "bg-amber-500 text-white"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              Pendentes
            </button>

            <div className="ml-auto hidden items-center gap-2 rounded-full bg-yellow-100 px-3 py-2 text-sm font-medium text-yellow-700 sm:inline-flex">
              <Shield className="h-4 w-4" />
              Moderação ativa
            </div>
          </div>
        </section>

        {filteredItems.length === 0 ? (
          <section className="rounded-[30px] border border-slate-200 bg-white p-10 text-center shadow-sm">
            <Images className="mx-auto h-10 w-10 text-slate-400" />
            <p className="mt-4 text-lg font-semibold text-slate-900">
              Nenhum arquivo neste filtro
            </p>
            <p className="mt-2 text-slate-600">
              Assim que houver envios compatíveis com o filtro selecionado, eles aparecerão aqui.
            </p>
          </section>
        ) : (
          <section className="columns-1 gap-4 space-y-4 sm:columns-2 lg:columns-3 xl:columns-4">
            {filteredItems.map((item) => (
              <div key={item.id} className="break-inside-avoid">
                <MediaCard
                  item={item}
                  onOpen={setSelectedItem}
                  onDelete={handleDelete}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  deletingId={deletingId}
                  updatingId={updatingId}
                  userRole={userRole}
                />
              </div>
            ))}
          </section>
        )}
      </div>

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