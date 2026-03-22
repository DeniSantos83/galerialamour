import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  Globe,
  Image as ImageIcon,
  Instagram,
  Link2,
  MessageCircle,
  PlayCircle,
  Settings,
  Sparkles,
  UserCircle2,
  Video,
} from "lucide-react";
import { supabase } from "../lib/supabase";

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1080;
const FILM_STORAGE_BUCKET = "event-media";
const FILM_DURATION_OPTIONS = [15, 30, 45];
const FILM_MUSIC_OPTIONS = [
  { value: "romantico", label: "Romântica" },
  { value: "jovem", label: "Jovem e enérgica" },
  { value: "forro", label: "Forró" },
  { value: "carnaval", label: "Carnaval" },
];

export default function MeuEventoDetalhe() {
  const { slug } = useParams();

  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [generatingFilm, setGeneratingFilm] = useState(false);

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [partner, setPartner] = useState(null);
  const [event, setEvent] = useState(null);
  const [settings, setSettings] = useState(null);

  const [films, setFilms] = useState([]);
  const [filmItems, setFilmItems] = useState([]);

  const [error, setError] = useState("");
  const [copiedKey, setCopiedKey] = useState("");
  const [selectedFilmDuration, setSelectedFilmDuration] = useState(30);
  const [selectedMusicStyle, setSelectedMusicStyle] = useState("romantico");
  const [screenWidth, setScreenWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1440
  );

  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "";

  const responsive = useMemo(
    () => getResponsiveStyles(screenWidth),
    [screenWidth]
  );

  const sortedFilms = useMemo(() => {
    return [...films].sort((a, b) => {
      const aReady = a.status === "completed" || a.status === "ready" ? 1 : 0;
      const bReady = b.status === "completed" || b.status === "ready" ? 1 : 0;

      if (aReady !== bReady) return bReady - aReady;

      const aDate = new Date(a.created_at || 0).getTime();
      const bDate = new Date(b.created_at || 0).getTime();
      return bDate - aDate;
    });
  }, [films]);

  const hasProcessingFilm = useMemo(() => {
    return films.some((film) => {
      const status = String(film.status || "").toLowerCase();
      return status === "queued" || status === "processing";
    });
  }, [films]);

  useEffect(() => {
    function handleResize() {
      setScreenWidth(window.innerWidth);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    loadEvent();
  }, [slug]);

  async function loadEvent() {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user: authUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!authUser) {
        setAuthChecked(true);
        setUser(null);
        setProfile(null);
        setPartner(null);
        setEvent(null);
        setSettings(null);
        setFilms([]);
        setFilmItems([]);
        return;
      }

      setUser(authUser);
      setAuthChecked(true);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();

      if (profileError) throw profileError;

      setProfile(profileData || null);

      const isAdmin = profileData?.role === "admin";

      let currentPartner = null;
      let eventData = null;

      if (isAdmin) {
        const { data: adminEvent, error: adminEventError } = await supabase
          .from("events")
          .select("*")
          .eq("slug", slug)
          .maybeSingle();

        if (adminEventError) throw adminEventError;
        eventData = adminEvent || null;

        if (eventData?.partner_id) {
          const { data: linkedPartner, error: linkedPartnerError } =
            await supabase
              .from("partners")
              .select("*")
              .eq("id", eventData.partner_id)
              .maybeSingle();

          if (linkedPartnerError) throw linkedPartnerError;
          currentPartner = linkedPartner || null;
        }
      } else {
        const { data: partnerData, error: partnerError } = await supabase
          .from("partners")
          .select("*")
          .eq("profile_id", authUser.id)
          .maybeSingle();

        if (partnerError) throw partnerError;

        if (!partnerData) {
          setPartner(null);
          setEvent(null);
          setSettings(null);
          setFilms([]);
          setFilmItems([]);
          return;
        }

        currentPartner = partnerData;

        const { data: partnerEvent, error: partnerEventError } = await supabase
          .from("events")
          .select("*")
          .eq("slug", slug)
          .eq("partner_id", partnerData.id)
          .maybeSingle();

        if (partnerEventError) throw partnerEventError;

        eventData = partnerEvent || null;
      }

      setPartner(currentPartner || null);

      if (!eventData) {
        setEvent(null);
        setSettings(null);
        setFilms([]);
        setFilmItems([]);
        return;
      }

      setEvent(eventData);

      const { data: settingsData, error: settingsError } = await supabase
        .from("event_settings")
        .select("*")
        .eq("event_id", eventData.id)
        .maybeSingle();

      if (settingsError) throw settingsError;

      setSettings(settingsData || null);

      await loadFilmsData(eventData.id);
    } catch (err) {
      console.error("Erro ao carregar detalhe do evento:", err);
      setError(err?.message || "Erro ao carregar o evento.");
    } finally {
      setLoading(false);
    }
  }

  async function loadFilmsData(eventId) {
    const { data: filmsData, error: filmsError } = await supabase
      .from("event_films")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    if (filmsError) throw filmsError;

    const normalizedFilms = filmsData || [];
    setFilms(normalizedFilms);

    if (normalizedFilms.length > 0) {
      const filmIds = normalizedFilms.map((film) => film.id);

      const { data: itemsData, error: itemsError } = await supabase
        .from("event_film_items")
        .select("*")
        .in("film_id", filmIds)
        .eq("approved", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (itemsError) throw itemsError;

      setFilmItems(itemsData || []);
    } else {
      setFilmItems([]);
    }
  }

  async function createQueuedFilm(eventId, createdBy, durationSeconds, musicStyle) {
    const normalizedMusicStyle = FILM_MUSIC_OPTIONS.some(
      (option) => option.value === musicStyle
    )
      ? musicStyle
      : "romantico";

    const { data, error } = await supabase
      .from("event_films")
      .insert({
        event_id: eventId,
        created_by: createdBy || null,
        title: null,
        style: normalizedMusicStyle,
        format: "mp4",
        status: "queued",
        duration_seconds: durationSeconds,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) throw error;

    return data?.id || null;
  }

  async function updateQueuedFilmSettings(eventId, durationSeconds, musicStyle) {
    const { data: queuedFilm, error: queuedFilmError } = await supabase
      .from("event_films")
      .select("id")
      .eq("event_id", eventId)
      .eq("status", "queued")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (queuedFilmError) throw queuedFilmError;
    if (!queuedFilm?.id) return null;

    const normalizedMusicStyle = FILM_MUSIC_OPTIONS.some(
      (option) => option.value === musicStyle
    )
      ? musicStyle
      : "romantico";

    const { error: updateError } = await supabase
      .from("event_films")
      .update({
        duration_seconds: durationSeconds,
        style: normalizedMusicStyle,
        updated_at: new Date().toISOString(),
      })
      .eq("id", queuedFilm.id);

    if (updateError) throw updateError;

    return queuedFilm.id;
  }

  async function triggerFilmProcessing(filmId, mode = "unused_only") {
  if (!filmId) {
    throw new Error("ID do filme não encontrado para iniciar o processamento.");
  }

  const response = await fetch(
    "https://www.galerialamour.com.br/.netlify/functions/process-film-background",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        film_id: filmId,
        mode,
      }),
    }
  );

  let payload = null;

  try {
    payload = await response.json();
  } catch (_) {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(
      payload?.error ||
        payload?.message ||
        "Não foi possível iniciar o processamento do filme."
    );
  }

  return payload;
}
  async function handleGenerateFilm(mode = "unused_only") {
    if (!event?.id || generatingFilm || hasProcessingFilm) return;

    try {
      setGeneratingFilm(true);
      setError("");

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      let filmId = null;

      if (mode === "allow_reuse") {
        filmId = await createQueuedFilm(
          event.id,
          authUser?.id || null,
          selectedFilmDuration,
          selectedMusicStyle
        );
      } else {
        const { error: rpcError } = await supabase.rpc(
          "generate_event_film_from_unused_public_photos",
          {
            p_event_id: event.id,
            p_created_by: authUser?.id || null,
            p_title: null,
            p_style: "cinematic",
            p_format: "mp4",
          }
        );

        if (rpcError) throw rpcError;

        const { data: queuedFilm, error: queuedFilmError } = await supabase
          .from("event_films")
          .select("id")
          .eq("event_id", event.id)
          .eq("status", "queued")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (queuedFilmError) throw queuedFilmError;
        if (!queuedFilm?.id) {
          throw new Error("Não foi possível localizar o filme na fila.");
        }

        filmId = queuedFilm.id;

        await supabase
          .from("event_films")
          .update({
            duration_seconds: selectedFilmDuration,
            style: selectedMusicStyle,
            updated_at: new Date().toISOString(),
          })
          .eq("id", filmId);
      }

      await triggerFilmProcessing(filmId, mode);
      await loadFilmsData(event.id);

      setTimeout(() => {
        loadFilmsData(event.id);
      }, 2500);
    } catch (err) {
      console.error("Erro ao gerar filme:", err);
      setError(err?.message || "Não foi possível gerar o filme.");
    } finally {
      setGeneratingFilm(false);
    }
  }

  const backTo = profile?.role === "admin" ? "/painel" : "/meus-eventos";

  const urls = useMemo(() => {
    if (!event?.slug) {
      return {
        uploadUrl: "",
        publicGalleryUrl: "",
        privateGalleryUrl: "",
        qrTargetUrl: "",
        qrCodeUrl: "",
      };
    }

    const uploadUrl = `${baseUrl}/evento/${event.slug}/upload`;
    const publicGalleryUrl = `${baseUrl}/galeria/${event.slug}`;
    const privateGalleryUrl = `${baseUrl}/evento/${event.slug}/galeria`;
    const qrTargetUrl = uploadUrl;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(
      qrTargetUrl
    )}`;

    return {
      uploadUrl,
      publicGalleryUrl,
      privateGalleryUrl,
      qrTargetUrl,
      qrCodeUrl,
    };
  }, [event, baseUrl]);

  async function copyText(text, key) {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(""), 1800);
    } catch (err) {
      console.error("Erro ao copiar:", err);
    }
  }

  async function downloadQrCode() {
    if (!urls.qrCodeUrl || !event?.slug) return;

    try {
      const response = await fetch(urls.qrCodeUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `qr-${event.slug}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Erro ao baixar QR Code:", err);
    }
  }

  function formatDate(date) {
    if (!date) return "—";

    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return "—";

    return parsed.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function normalizeInstagram(value) {
    if (!value) return "";
    if (value.startsWith("http")) return value;
    return `https://instagram.com/${value.replace("@", "").trim()}`;
  }

  function normalizeWhatsapp(value) {
    if (!value) return "";
    const clean = value.replace(/\D/g, "");
    return clean ? `https://wa.me/${clean}` : "";
  }

  function getPublicMediaUrl(path) {
    if (!path) return "";
    if (path.startsWith("http://") || path.startsWith("https://")) return path;

    const { data } = supabase.storage
      .from(FILM_STORAGE_BUCKET)
      .getPublicUrl(path);

    return data?.publicUrl || "";
  }

  function getFilmOutputUrl(film) {
    if (!film) return "";
    return film.output_url || getPublicMediaUrl(film.output_path);
  }

  function getFilmItemsByFilmId(filmId) {
    return filmItems.filter((item) => {
      const mediaType = String(item.media_type || "").toLowerCase();
      return item.film_id === filmId && mediaType.includes("video");
    });
  }

  function getFilmStatusLabel(status) {
    const normalized = String(status || "").toLowerCase();

    if (normalized === "completed" || normalized === "ready") {
      return "Pronto";
    }

    if (normalized === "processing" || normalized === "queued") {
      return "Processando";
    }

    if (normalized === "error" || normalized === "failed") {
      return "Erro";
    }

    return status || "Sem status";
  }

  function getMusicStyleLabel(style) {
    const normalized = String(style || "").toLowerCase();
    return (
      FILM_MUSIC_OPTIONS.find((option) => option.value === normalized)?.label ||
      style ||
      "Romântica"
    );
  }

  if (authChecked && !user && !loading) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div style={styles.page}>
      <div style={styles.glowOne} />
      <div style={styles.glowTwo} />

      <div
        style={{
          ...styles.container,
          ...responsive.container,
        }}
      >
        <div
          style={{
            ...styles.topBar,
            ...responsive.topBar,
          }}
        >
          <Link
            to={backTo}
            style={{
              ...styles.backLink,
              ...responsive.backLink,
            }}
          >
            <ArrowLeft size={16} />
            {profile?.role === "admin"
              ? "Voltar para o painel"
              : "Voltar para meus eventos"}
          </Link>

          {partner ? (
            <div
              style={{
                ...styles.partnerChip,
                ...responsive.partnerChip,
              }}
            >
              <span style={styles.partnerChipLabel}>Parceiro</span>
              <strong style={styles.partnerChipName}>
                {partner.studio_name || partner.name || "Fotógrafo parceiro"}
              </strong>
            </div>
          ) : null}
        </div>

        {loading ? (
          <div style={styles.stateBox}>
            <p style={styles.stateText}>Carregando evento...</p>
          </div>
        ) : error ? (
          <div style={styles.stateBoxError}>
            <p style={styles.stateText}>{error}</p>
          </div>
        ) : !event ? (
          <div style={styles.stateBox}>
            <p style={styles.stateText}>
              Evento não encontrado ou sem permissão de acesso.
            </p>
          </div>
        ) : (
          <>
            <section
              style={{
                ...styles.hero,
                ...responsive.hero,
                backgroundImage: event.cover_url
                  ? `linear-gradient(rgba(19,24,42,.42), rgba(19,24,42,.58)), url(${event.cover_url})`
                  : "linear-gradient(135deg, #1e2440 0%, #34406d 100%)",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div
                style={{
                  ...styles.heroTop,
                  ...responsive.heroTop,
                }}
              >
                <div style={styles.heroBadge}>
                  <Sparkles size={14} />
                  Detalhes premium do evento
                </div>

                <div style={styles.heroPills}>
                  <span style={styles.heroMiniTag}>
                    {event.is_upload_open ? "Upload aberto" : "Upload fechado"}
                  </span>

                  <span style={styles.heroMiniTag}>
                    {settings?.gallery_mode === "public"
                      ? "Galeria pública"
                      : "Galeria privada"}
                  </span>
                </div>
              </div>

              <h1
                style={{
                  ...styles.heroTitle,
                  ...responsive.heroTitle,
                }}
              >
                {event.name || "Evento sem nome"}
              </h1>

              <p
                style={{
                  ...styles.heroDescription,
                  ...responsive.heroDescription,
                }}
              >
                {event.description || "Sem descrição cadastrada para este evento."}
              </p>
            </section>

            <section
              style={{
                ...styles.contentGrid,
                ...responsive.contentGrid,
              }}
            >
              <div style={styles.leftColumn}>
                <div style={styles.panelCard}>
                  <div style={styles.panelHeader}>
                    <p style={styles.kicker}>Resumo</p>
                    <h2 style={styles.panelTitle}>Informações do evento</h2>
                  </div>

                  <div
                    style={{
                      ...styles.infoGrid,
                      ...responsive.infoGrid,
                    }}
                  >
                    <InfoBox label="Slug" value={event.slug} />
                    <InfoBox label="Data do evento" value={formatDate(event.event_date)} />
                    <InfoBox
                      label="Uploads"
                      value={event.is_upload_open ? "Abertos" : "Fechados"}
                    />
                    <InfoBox
                      label="Modo da galeria"
                      value={
                        settings?.gallery_mode === "public" ? "Pública" : "Privada"
                      }
                    />
                  </div>
                </div>

                <div style={styles.panelCard}>
                  <div style={styles.panelHeader}>
                    <p style={styles.kicker}>QR Code</p>
                    <h2 style={styles.panelTitle}>Compartilhamento</h2>
                  </div>

                  <div style={styles.qrCard}>
                    {urls.qrCodeUrl ? (
                      <img
                        src={urls.qrCodeUrl}
                        alt={`QR Code do evento ${event.name}`}
                        style={styles.qrImage}
                      />
                    ) : (
                      <div style={styles.qrPlaceholder}>Sem QR Code</div>
                    )}
                  </div>

                  <p style={styles.qrText}>
                    Use esse QR Code nas mesas, convites ou materiais impressos para
                    levar os convidados direto para a página de envio do evento.
                  </p>

                  <div style={styles.qrButtons}>
                    <button
                      type="button"
                      style={{
                        ...styles.darkButton,
                        ...responsive.fullWidthAction,
                      }}
                      onClick={() => copyText(urls.qrTargetUrl, "qr")}
                      disabled={!urls.qrTargetUrl}
                    >
                      {copiedKey === "qr" ? "Copiado!" : "Copiar link do QR"}
                    </button>

                    <button
                      type="button"
                      style={{
                        ...styles.lightButton,
                        ...responsive.fullWidthAction,
                      }}
                      onClick={downloadQrCode}
                      disabled={!urls.qrCodeUrl}
                    >
                      <Download size={16} />
                      Baixar QR Code
                    </button>
                  </div>
                </div>

                <div style={styles.panelCard}>
                  <div style={styles.panelHeader}>
                    <p style={styles.kicker}>Atalhos</p>
                    <h2 style={styles.panelTitle}>Ações rápidas</h2>
                  </div>

                  <div style={styles.quickActions}>
                    <a
                      href={urls.uploadUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={styles.primaryLinkButton}
                    >
                      <ExternalLink size={16} />
                      Abrir upload
                    </a>

                    <a
                      href={urls.privateGalleryUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={styles.secondaryLinkButton}
                    >
                      <ImageIcon size={16} />
                      Galeria privada
                    </a>

                    <a
                      href={urls.publicGalleryUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={styles.secondaryLinkButton}
                    >
                      <Globe size={16} />
                      Galeria pública
                    </a>

                    <Link
                      to={`/evento/${event.slug}/configuracoes`}
                      style={styles.secondaryLinkButton}
                    >
                      <Settings size={16} />
                      Configurações
                    </Link>
                  </div>
                </div>

                <div style={styles.panelCard}>
                  <div
                    style={{
                      ...styles.panelHeader,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <p style={styles.kicker}>Filmes do evento</p>
                      <h2 style={styles.panelTitle}>Vídeos gerados</h2>
                    </div>

                    <div style={styles.filmToolbar}>
                      <label style={styles.durationLabel}>
                        Duração
                        <select
                          value={selectedFilmDuration}
                          onChange={(event) =>
                            setSelectedFilmDuration(Number(event.target.value))
                          }
                          style={styles.durationSelect}
                          disabled={generatingFilm || hasProcessingFilm}
                        >
                          {FILM_DURATION_OPTIONS.map((duration) => (
                            <option key={duration} value={duration}>
                              {duration}s
                            </option>
                          ))}
                        </select>
                      </label>

                      <label style={styles.durationLabel}>
                        Música
                        <select
                          value={selectedMusicStyle}
                          onChange={(event) => setSelectedMusicStyle(event.target.value)}
                          style={styles.durationSelect}
                          disabled={generatingFilm || hasProcessingFilm}
                        >
                          {FILM_MUSIC_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <button
                        type="button"
                        onClick={() => handleGenerateFilm("unused_only")}
                        disabled={generatingFilm || hasProcessingFilm}
                        style={{
                          ...styles.darkButton,
                          opacity: generatingFilm || hasProcessingFilm ? 0.6 : 1,
                          cursor:
                            generatingFilm || hasProcessingFilm
                              ? "not-allowed"
                              : "pointer",
                        }}
                      >
                        <Video size={16} />
                        {generatingFilm ? "Gerando..." : "Gerar com inéditas"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleGenerateFilm("allow_reuse")}
                        disabled={generatingFilm || hasProcessingFilm}
                        style={{
                          ...styles.lightButton,
                          opacity: generatingFilm || hasProcessingFilm ? 0.6 : 1,
                          cursor:
                            generatingFilm || hasProcessingFilm
                              ? "not-allowed"
                              : "pointer",
                        }}
                      >
                        <PlayCircle size={16} />
                        Reutilizar fotos
                      </button>
                    </div>
                  </div>

                  {sortedFilms.length === 0 ? (
                    <p style={styles.stateText}>
                      Este evento ainda não possui filme gerado.
                    </p>
                  ) : (
                    <div style={styles.filmGrid}>
                      {sortedFilms.map((film) => {
                        const outputUrl = getFilmOutputUrl(film);
                        const previews = getFilmItemsByFilmId(film.id);
                        const firstPreviewUrl = getPublicMediaUrl(
                          previews[0]?.media_path
                        );

                        return (
                          <div key={film.id} style={styles.filmCard}>
                            <div style={styles.filmPreviewWrap}>
                              {outputUrl ? (
                                <video
                                  src={outputUrl}
                                  style={styles.filmVideo}
                                  controls
                                  preload="metadata"
                                />
                              ) : firstPreviewUrl ? (
                                <video
                                  src={firstPreviewUrl}
                                  style={styles.filmVideo}
                                  controls
                                  preload="metadata"
                                />
                              ) : (
                                <div style={styles.filmFallback}>
                                  <PlayCircle size={30} />
                                </div>
                              )}
                            </div>

                            <div style={styles.filmBody}>
                              <div style={styles.filmTopLine}>
                                <strong style={styles.filmTitle}>
                                  {film.title || "Filme do evento"}
                                </strong>

                                <span
                                  style={{
                                    ...styles.filmStatusBadge,
                                    ...(String(film.status || "")
                                      .toLowerCase()
                                      .includes("error")
                                      ? styles.filmStatusError
                                      : String(film.status || "")
                                          .toLowerCase()
                                          .includes("process")
                                      ? styles.filmStatusPending
                                      : styles.filmStatusReady),
                                  }}
                                >
                                  {getFilmStatusLabel(film.status)}
                                </span>
                              </div>

                              <div style={styles.filmMetaRow}>
                                <span>{getMusicStyleLabel(film.style)}</span>
                                <span>
                                  {film.duration_seconds
                                    ? `${film.duration_seconds}s`
                                    : "Duração não informada"}
                                </span>
                                <span>{film.format || "Formato padrão"}</span>
                              </div>

                              {film.error_message ? (
                                <p style={styles.filmErrorText}>
                                  {film.error_message}
                                </p>
                              ) : null}

                              {previews.length > 0 ? (
                                <div style={styles.previewStrip}>
                                  {previews.slice(0, 4).map((item) => {
                                    const itemUrl = getPublicMediaUrl(item.media_path);
                                    return itemUrl ? (
                                      <video
                                        key={item.id}
                                        src={itemUrl}
                                        style={styles.previewThumb}
                                        muted
                                        playsInline
                                        preload="metadata"
                                      />
                                    ) : (
                                      <div
                                        key={item.id}
                                        style={styles.previewThumbFallback}
                                      >
                                        <Video size={16} />
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : null}

                              {outputUrl ? (
                                <a
                                  href={outputUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={styles.openFilmButton}
                                >
                                  <PlayCircle size={16} />
                                  Abrir filme
                                </a>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div style={styles.rightColumn}>
                {partner ? (
                  <div style={styles.partnerCard}>
                    <div style={styles.partnerCardHeader}>
                      {partner.avatar_url ? (
                        <img
                          src={partner.avatar_url}
                          alt={
                            partner.studio_name ||
                            partner.name ||
                            "Fotógrafo parceiro"
                          }
                          style={styles.partnerAvatarImage}
                        />
                      ) : (
                        <div style={styles.partnerAvatar}>
                          <UserCircle2 size={28} />
                        </div>
                      )}

                      <div>
                        <div style={styles.partnerCardTitle}>
                          {partner.studio_name ||
                            partner.name ||
                            "Fotógrafo parceiro"}
                        </div>
                        <div style={styles.partnerCardSub}>
                          Gestão do evento e atendimento
                        </div>
                      </div>
                    </div>

                    <div style={styles.partnerActions}>
                      {partner.instagram ? (
                        <a
                          href={normalizeInstagram(partner.instagram)}
                          target="_blank"
                          rel="noreferrer"
                          style={styles.partnerActionButton}
                        >
                          <Instagram size={16} />
                          Instagram
                        </a>
                      ) : null}

                      {partner.phone ? (
                        <a
                          href={normalizeWhatsapp(partner.phone)}
                          target="_blank"
                          rel="noreferrer"
                          style={styles.partnerActionButton}
                        >
                          <MessageCircle size={16} />
                          WhatsApp
                        </a>
                      ) : null}

                      {partner.email ? (
                        <a
                          href={`mailto:${partner.email}`}
                          style={styles.partnerActionButton}
                        >
                          <Link2 size={16} />
                          E-mail
                        </a>
                      ) : null}
                    </div>

                    {partner.notes ? (
                      <div style={styles.partnerNotes}>{partner.notes}</div>
                    ) : null}
                  </div>
                ) : null}

                <div style={styles.panelCard}>
                  <div style={styles.panelHeader}>
                    <p style={styles.kicker}>Configurações</p>
                    <h2 style={styles.panelTitle}>Preferências atuais</h2>
                  </div>

                  <div style={styles.settingsList}>
                    <InfoLine
                      label="Permitir vídeos"
                      value={settings?.allow_videos ? "Sim" : "Não"}
                    />
                    <InfoLine
                      label="Limite foto"
                      value={
                        settings?.max_photo_size_mb
                          ? `${settings.max_photo_size_mb} MB`
                          : "—"
                      }
                    />
                    <InfoLine
                      label="Limite vídeo"
                      value={
                        settings?.allow_videos
                          ? `${settings?.max_video_size_mb || "—"} MB / ${
                              settings?.max_video_duration_seconds || "—"
                            }s`
                          : "Desativado"
                      }
                    />
                    <InfoLine
                      label="Nome do convidado"
                      value={settings?.require_guest_name ? "Obrigatório" : "Opcional"}
                    />
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div style={styles.infoBox}>
      <span style={styles.infoLabel}>{label}</span>
      <strong style={styles.infoValue}>{value || "—"}</strong>
    </div>
  );
}

function InfoLine({ label, value }) {
  return (
    <div style={styles.infoLine}>
      <span style={styles.infoLineLabel}>{label}</span>
      <strong style={styles.infoLineValue}>{value}</strong>
    </div>
  );
}

function getResponsiveStyles(screenWidth) {
  const isMobile = screenWidth <= MOBILE_BREAKPOINT;
  const isTablet =
    screenWidth > MOBILE_BREAKPOINT && screenWidth <= TABLET_BREAKPOINT;

  return {
    container: {
      padding: isMobile ? "16px" : "24px",
    },
    topBar: {
      flexDirection: isMobile ? "column" : "row",
      alignItems: isMobile ? "stretch" : "center",
    },
    backLink: {
      width: isMobile ? "100%" : "auto",
      justifyContent: isMobile ? "center" : "flex-start",
    },
    partnerChip: {
      width: isMobile ? "100%" : "auto",
      justifyContent: isMobile ? "center" : "flex-start",
    },
    hero: {
      padding: isMobile ? "24px 18px" : "30px",
      minHeight: isMobile ? "260px" : "320px",
    },
    heroTop: {
      flexDirection: isMobile ? "column" : "row",
      alignItems: isMobile ? "flex-start" : "center",
    },
    heroTitle: {
      fontSize: isMobile ? "30px" : isTablet ? "38px" : "46px",
    },
    heroDescription: {
      fontSize: isMobile ? "14px" : "15px",
      maxWidth: "760px",
    },
    contentGrid: {
      gridTemplateColumns: isMobile || isTablet ? "1fr" : "1.05fr 0.95fr",
    },
    infoGrid: {
      gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
    },
    fullWidthAction: {
      width: isMobile ? "100%" : "auto",
      justifyContent: "center",
    },
  };
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top left, rgba(240,210,170,0.18), transparent 25%), radial-gradient(circle at bottom right, rgba(176,137,104,0.14), transparent 22%), linear-gradient(180deg, #f7f5f2 0%, #f4f0ea 100%)",
    position: "relative",
    overflow: "hidden",
  },
  glowOne: {
    position: "absolute",
    top: "-120px",
    left: "-120px",
    width: "320px",
    height: "320px",
    borderRadius: "50%",
    background: "rgba(176,137,104,0.12)",
    filter: "blur(60px)",
    pointerEvents: "none",
  },
  glowTwo: {
    position: "absolute",
    right: "-120px",
    bottom: "-120px",
    width: "340px",
    height: "340px",
    borderRadius: "50%",
    background: "rgba(30,36,64,0.08)",
    filter: "blur(70px)",
    pointerEvents: "none",
  },
  container: {
    position: "relative",
    zIndex: 1,
    maxWidth: "1360px",
    margin: "0 auto",
    padding: "24px",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "18px",
  },
  backLink: {
    minHeight: "46px",
    borderRadius: "14px",
    padding: "0 16px",
    background: "rgba(255,255,255,0.82)",
    color: "#1f2333",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    border: "1px solid rgba(30,36,64,0.08)",
    fontWeight: 700,
    boxShadow: "0 8px 22px rgba(24,32,79,0.06)",
  },
  partnerChip: {
    minHeight: "46px",
    borderRadius: "14px",
    padding: "0 16px",
    background: "rgba(30,36,64,0.94)",
    color: "#fff",
    display: "inline-flex",
    alignItems: "center",
    gap: "10px",
    boxShadow: "0 12px 26px rgba(30,36,64,0.16)",
  },
  partnerChipLabel: {
    fontSize: "12px",
    color: "#f0d7b5",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: ".05em",
  },
  partnerChipName: {
    fontSize: "14px",
  },
  stateBox: {
    background: "rgba(255,255,255,0.78)",
    border: "1px solid rgba(30,36,64,0.08)",
    borderRadius: "28px",
    padding: "28px",
    boxShadow: "0 14px 36px rgba(24,32,79,0.06)",
  },
  stateBoxError: {
    background: "#fff4e8",
    border: "1px solid #efd7b5",
    borderRadius: "28px",
    padding: "28px",
    boxShadow: "0 14px 36px rgba(24,32,79,0.06)",
  },
  stateText: {
    margin: 0,
    color: "#5d6477",
    lineHeight: 1.6,
  },
  hero: {
    borderRadius: "32px",
    overflow: "hidden",
    minHeight: "320px",
    padding: "30px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    color: "#fff",
    boxShadow: "0 20px 46px rgba(24,32,79,0.16)",
    marginBottom: "20px",
  },
  heroTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    alignItems: "center",
    flexWrap: "wrap",
  },
  heroBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    minHeight: "34px",
    padding: "0 12px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.14)",
    color: "#f3d5ab",
    fontSize: "13px",
    fontWeight: 800,
  },
  heroPills: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  heroMiniTag: {
    minHeight: "30px",
    padding: "0 12px",
    borderRadius: "999px",
    display: "inline-flex",
    alignItems: "center",
    background: "rgba(255,255,255,0.14)",
    border: "1px solid rgba(255,255,255,0.16)",
    color: "#fff",
    fontSize: "12px",
    fontWeight: 700,
  },
  heroTitle: {
    margin: "18px 0 12px",
    fontWeight: 800,
    lineHeight: 1.05,
  },
  heroDescription: {
    margin: 0,
    color: "rgba(255,255,255,0.88)",
    lineHeight: 1.7,
  },
  contentGrid: {
    display: "grid",
    gap: "20px",
    alignItems: "start",
  },
  leftColumn: {
    display: "grid",
    gap: "20px",
  },
  rightColumn: {
    display: "grid",
    gap: "20px",
  },
  panelCard: {
    background: "rgba(255,255,255,0.78)",
    backdropFilter: "blur(14px)",
    border: "1px solid rgba(30,36,64,0.08)",
    borderRadius: "28px",
    padding: "22px",
    boxShadow: "0 14px 36px rgba(24,32,79,0.06)",
  },
  panelHeader: {
    marginBottom: "16px",
  },
  kicker: {
    margin: 0,
    color: "#b08968",
    fontWeight: 800,
    fontSize: "12px",
    letterSpacing: ".08em",
    textTransform: "uppercase",
  },
  panelTitle: {
    margin: "8px 0 0",
    fontSize: "24px",
    color: "#1f2333",
  },
  filmToolbar: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },
  durationLabel: {
    display: "grid",
    gap: "6px",
    color: "#5e6579",
    fontSize: "12px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: ".04em",
  },
  durationSelect: {
    height: "44px",
    minWidth: "110px",
    borderRadius: "14px",
    border: "1px solid #dfe3ec",
    background: "#fff",
    color: "#1f2333",
    padding: "0 12px",
    fontSize: "14px",
    fontWeight: 700,
    outline: "none",
  },
  infoGrid: {
    display: "grid",
    gap: "12px",
  },
  infoBox: {
    background: "#fff",
    border: "1px solid #e7eaf2",
    borderRadius: "18px",
    padding: "14px",
  },
  infoLabel: {
    display: "block",
    fontSize: "11px",
    color: "#8a90a3",
    textTransform: "uppercase",
    letterSpacing: ".06em",
    marginBottom: "6px",
  },
  infoValue: {
    color: "#23283a",
    fontSize: "14px",
    wordBreak: "break-word",
  },
  qrCard: {
    background: "#fff",
    border: "1px solid #e7eaf2",
    borderRadius: "22px",
    padding: "18px",
    display: "grid",
    placeItems: "center",
    minHeight: "260px",
  },
  qrImage: {
    width: "100%",
    maxWidth: "260px",
    display: "block",
    borderRadius: "18px",
  },
  qrPlaceholder: {
    width: "100%",
    maxWidth: "220px",
    aspectRatio: "1 / 1",
    borderRadius: "18px",
    background: "#f4f6fb",
    display: "grid",
    placeItems: "center",
    color: "#8b93a8",
  },
  qrText: {
    color: "#6f768c",
    lineHeight: 1.6,
    fontSize: "14px",
    margin: "14px 0 0",
  },
  qrButtons: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginTop: "14px",
  },
  darkButton: {
    minHeight: "46px",
    borderRadius: "14px",
    border: "none",
    background: "linear-gradient(135deg, #1e2440 0%, #33406b 100%)",
    color: "#fff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    cursor: "pointer",
    fontWeight: 800,
    padding: "0 18px",
  },
  lightButton: {
    minHeight: "46px",
    borderRadius: "14px",
    border: "1px solid #dfe3ec",
    background: "#fff",
    color: "#29314d",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    cursor: "pointer",
    fontWeight: 700,
    padding: "0 18px",
  },
  quickActions: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "12px",
  },
  primaryLinkButton: {
    minHeight: "50px",
    borderRadius: "16px",
    border: "none",
    background: "linear-gradient(135deg, #1e2440 0%, #33406b 100%)",
    color: "#fff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    textDecoration: "none",
    fontWeight: 800,
    padding: "0 16px",
  },
  secondaryLinkButton: {
    minHeight: "50px",
    borderRadius: "16px",
    border: "1px solid #dfe3ec",
    background: "#fff",
    color: "#29314d",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    textDecoration: "none",
    fontWeight: 700,
    padding: "0 16px",
  },
  filmGrid: {
    display: "grid",
    gap: "16px",
  },
  filmCard: {
    background: "#fff",
    border: "1px solid rgba(30,36,64,0.08)",
    borderRadius: "22px",
    overflow: "hidden",
    boxShadow: "0 12px 28px rgba(24,32,79,0.08)",
  },
  filmPreviewWrap: {
    minHeight: "240px",
    background: "#eef1f7",
  },
  filmVideo: {
    width: "100%",
    minHeight: "240px",
    display: "block",
    objectFit: "cover",
    background: "#111",
  },
  filmFallback: {
    width: "100%",
    minHeight: "240px",
    display: "grid",
    placeItems: "center",
    color: "#34406d",
  },
  filmBody: {
    padding: "16px",
    display: "grid",
    gap: "10px",
  },
  filmTopLine: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    alignItems: "flex-start",
  },
  filmTitle: {
    color: "#1f2333",
    fontSize: "16px",
    lineHeight: 1.4,
  },
  filmStatusBadge: {
    minHeight: "28px",
    borderRadius: "999px",
    padding: "0 10px",
    display: "inline-flex",
    alignItems: "center",
    fontSize: "12px",
    fontWeight: 800,
    whiteSpace: "nowrap",
  },
  filmStatusReady: {
    background: "#e9f8ef",
    color: "#257a45",
  },
  filmStatusPending: {
    background: "#fff5e8",
    color: "#996515",
  },
  filmStatusError: {
    background: "#ffecec",
    color: "#a13b3b",
  },
  filmMetaRow: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    color: "#6f768c",
    fontSize: "13px",
  },
  filmErrorText: {
    margin: 0,
    color: "#a13b3b",
    fontSize: "13px",
    lineHeight: 1.6,
  },
  previewStrip: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  previewThumb: {
    width: "72px",
    height: "72px",
    objectFit: "cover",
    borderRadius: "12px",
    background: "#111",
  },
  previewThumbFallback: {
    width: "72px",
    height: "72px",
    borderRadius: "12px",
    background: "#eef1f7",
    display: "grid",
    placeItems: "center",
    color: "#7b8196",
  },
  openFilmButton: {
    minHeight: "42px",
    borderRadius: "14px",
    background: "linear-gradient(135deg, #1e2440 0%, #33406b 100%)",
    color: "#fff",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    textDecoration: "none",
    fontWeight: 700,
    padding: "0 16px",
    justifySelf: "start",
  },
  partnerCard: {
    background: "rgba(255,255,255,0.82)",
    backdropFilter: "blur(14px)",
    border: "1px solid rgba(30,36,64,0.08)",
    borderRadius: "28px",
    padding: "22px",
    boxShadow: "0 14px 36px rgba(24,32,79,0.06)",
  },
  partnerCardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    marginBottom: "16px",
  },
  partnerAvatarImage: {
    width: "72px",
    height: "72px",
    borderRadius: "50%",
    objectFit: "cover",
    border: "3px solid rgba(255,255,255,0.9)",
    boxShadow: "0 10px 24px rgba(24,32,79,0.12)",
    flexShrink: 0,
  },
  partnerAvatar: {
    width: "72px",
    height: "72px",
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(135deg, #1e2440 0%, #34406d 100%)",
    color: "#fff",
    flexShrink: 0,
  },
  partnerCardTitle: {
    fontSize: "19px",
    fontWeight: 800,
    color: "#1f2333",
  },
  partnerCardSub: {
    fontSize: "14px",
    color: "#6f768c",
    marginTop: "4px",
  },
  partnerActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  partnerActionButton: {
    minHeight: "42px",
    borderRadius: "14px",
    border: "1px solid #dfe3ec",
    background: "#fff",
    color: "#29314d",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    textDecoration: "none",
    fontWeight: 700,
    padding: "0 16px",
  },
  partnerNotes: {
    marginTop: "14px",
    background: "#fff",
    border: "1px solid #e7eaf2",
    borderRadius: "16px",
    padding: "14px",
    color: "#4c536b",
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
  },
  settingsList: {
    display: "grid",
    gap: "10px",
  },
  infoLine: {
    display: "flex",
    justifyContent: "space-between",
    gap: "14px",
    alignItems: "center",
    background: "#fff",
    border: "1px solid #e7eaf2",
    borderRadius: "16px",
    padding: "14px",
    flexWrap: "wrap",
  },
  infoLineLabel: {
    color: "#4d5367",
    fontSize: "14px",
    fontWeight: 600,
  },
  infoLineValue: {
    color: "#1f2333",
    fontSize: "14px",
  },
};