import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import QRCode from "qrcode";
import {
  CalendarDays,
  Camera,
  Copy,
  Download,
  ExternalLink,
  Globe,
  Image as ImageIcon,
  Link2,
  LogOut,
  MessageCircle,
  PlayCircle,
  QrCode,
  Settings,
  Sparkles,
  Video,
} from "lucide-react";
import { supabase } from "../lib/supabase";

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1080;
const FILM_STORAGE_BUCKET = "event-media";
const FILM_DURATION_OPTIONS = [15, 30, 45];

export default function MeusEventos() {
  const [authLoading, setAuthLoading] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingFilms, setLoadingFilms] = useState(false);
  const [generatingFilm, setGeneratingFilm] = useState(false);

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [partnerInfo, setPartnerInfo] = useState(null);

  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const [eventFilms, setEventFilms] = useState([]);
  const [filmItems, setFilmItems] = useState([]);

  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [copiedKey, setCopiedKey] = useState("");
  const [message, setMessage] = useState("");
  const [selectedFilmDuration, setSelectedFilmDuration] = useState(30);
  const [screenWidth, setScreenWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1440
  );

  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "";

  const isMobile = screenWidth <= MOBILE_BREAKPOINT;
  const isTablet =
    screenWidth > MOBILE_BREAKPOINT && screenWidth <= TABLET_BREAKPOINT;

  const selectedLinks = useMemo(() => {
    if (!selectedEvent?.slug) {
      return {
        uploadUrl: "",
        privateGalleryUrl: "",
        publicGalleryUrl: "",
      };
    }

    return {
      uploadUrl: `${baseUrl}/evento/${selectedEvent.slug}/upload`,
      privateGalleryUrl: `${baseUrl}/evento/${selectedEvent.slug}/galeria`,
      publicGalleryUrl: `${baseUrl}/galeria/${selectedEvent.slug}`,
    };
  }, [selectedEvent, baseUrl]);

  const stats = useMemo(() => {
    const total = events.length;
    const uploadsOpen = events.filter((event) => event.is_upload_open).length;
    const withDate = events.filter((event) => !!event.event_date).length;
    const publicEvents = events.filter(
      (event) => event.event_settings?.gallery_mode === "public"
    ).length;

    return {
      total,
      uploadsOpen,
      withDate,
      publicEvents,
    };
  }, [events]);

  const photographer = useMemo(() => {
    const name =
      partnerInfo?.studio_name ||
      profile?.studio_name ||
      profile?.full_name ||
      profile?.["full-name"] ||
      "Fotógrafo parceiro";

    const avatar =
      partnerInfo?.avatar_url ||
      profile?.avatar_url ||
      profile?.photo_url ||
      profile?.image_url ||
      "";

    const whatsapp = partnerInfo?.phone || "";

    return {
      name,
      avatar,
      whatsapp,
      email: partnerInfo?.email || user?.email || "",
    };
  }, [partnerInfo, profile, user]);

  const featuredFilms = useMemo(() => {
    return [...eventFilms].sort((a, b) => {
      const aReady = a.status === "completed" || a.status === "ready" ? 1 : 0;
      const bReady = b.status === "completed" || b.status === "ready" ? 1 : 0;

      if (aReady !== bReady) return bReady - aReady;

      const aDate = new Date(a.created_at || 0).getTime();
      const bDate = new Date(b.created_at || 0).getTime();
      return bDate - aDate;
    });
  }, [eventFilms]);

  const videoItems = useMemo(() => {
    return filmItems.filter((item) => {
      const mediaType = String(item.media_type || "").toLowerCase();
      return mediaType.includes("video");
    });
  }, [filmItems]);

  const hasProcessingFilm = useMemo(() => {
    return eventFilms.some((film) => {
      const status = String(film.status || "").toLowerCase();
      return status === "queued" || status === "processing";
    });
  }, [eventFilms]);

  useEffect(() => {
    loadSession();
  }, []);

  useEffect(() => {
    function handleResize() {
      setScreenWidth(window.innerWidth);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (selectedEvent?.slug) {
      generateQrCode(`${baseUrl}/evento/${selectedEvent.slug}/upload`);
    } else {
      setQrCodeDataUrl("");
    }
  }, [selectedEvent, baseUrl]);

  useEffect(() => {
    if (selectedEvent?.id) {
      loadFilmsForEvent(selectedEvent.id);
    } else {
      setEventFilms([]);
      setFilmItems([]);
    }
  }, [selectedEvent?.id]);

  async function loadSession() {
    try {
      setAuthLoading(true);
      setMessage("");

      const {
        data: { user: authUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!authUser) {
        setUser(null);
        setProfile(null);
        setPartnerInfo(null);
        return;
      }

      setUser(authUser);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();

      if (profileError) throw profileError;

      setProfile(profileData || null);
      await loadEvents(authUser.id);
    } catch (error) {
      console.error("Erro ao carregar sessão:", error);
      setMessage("Erro ao carregar sessão do usuário.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function loadEvents(profileIdFromSession) {
    try {
      setLoadingEvents(true);

      let profileId = profileIdFromSession;

      if (!profileId) {
        const { data: userData } = await supabase.auth.getUser();
        profileId = userData?.user?.id || null;
      }

      if (!profileId) {
        setEvents([]);
        setPartnerInfo(null);
        return;
      }

      const { data: partner, error: partnerError } = await supabase
        .from("partners")
        .select(
          "id, profile_id, studio_name, phone, notes, active, created_at, email, avatar_url"
        )
        .eq("profile_id", profileId)
        .maybeSingle();

      if (partnerError || !partner) {
        console.error("Parceiro não encontrado", partnerError);
        setPartnerInfo(null);
        setEvents([]);
        return;
      }

      setPartnerInfo(partner);

      const { data: eventsData, error } = await supabase
        .from("events")
        .select(
          `
          *,
          event_settings (*)
        `
        )
        .eq("partner_id", partner.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const normalizedEvents = eventsData || [];
      setEvents(normalizedEvents);

      if (normalizedEvents.length > 0) {
        setSelectedEvent((currentSelected) => {
          if (!currentSelected) return normalizedEvents[0];

          const stillExists = normalizedEvents.find(
            (event) => event.id === currentSelected.id
          );

          return stillExists || normalizedEvents[0];
        });
      } else {
        setSelectedEvent(null);
      }
    } catch (error) {
      console.error("Erro ao carregar eventos:", error);
      setMessage("Erro ao carregar eventos do parceiro.");
    } finally {
      setLoadingEvents(false);
    }
  }

  async function loadFilmsForEvent(eventId) {
    try {
      setLoadingFilms(true);

      const { data: filmsData, error: filmsError } = await supabase
        .from("event_films")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

      if (filmsError) throw filmsError;

      const films = filmsData || [];
      setEventFilms(films);

      if (films.length === 0) {
        setFilmItems([]);
        return;
      }

      const filmIds = films.map((film) => film.id);

      const { data: itemsData, error: itemsError } = await supabase
        .from("event_film_items")
        .select("*")
        .in("film_id", filmIds)
        .eq("approved", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (itemsError) throw itemsError;

      setFilmItems(itemsData || []);
    } catch (error) {
      console.error("Erro ao carregar filmes do evento:", error);
      setEventFilms([]);
      setFilmItems([]);
    } finally {
      setLoadingFilms(false);
    }
  }

  async function updateQueuedFilmDuration(eventId, durationSeconds) {
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

    const { error: updateError } = await supabase
      .from("event_films")
      .update({
        duration_seconds: durationSeconds,
        updated_at: new Date().toISOString(),
      })
      .eq("id", queuedFilm.id);

    if (updateError) throw updateError;

    return queuedFilm.id;
  }

  async function triggerFilmProcessing() {
    const response = await fetch("/.netlify/functions/process-film", {
      method: "POST",
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "Não foi possível iniciar o processamento do filme.");
    }

    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  async function handleGenerateFilm() {
    if (!selectedEvent?.id || generatingFilm || hasProcessingFilm) return;

    try {
      setGeneratingFilm(true);
      setMessage("");

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      const { error } = await supabase.rpc(
        "generate_event_film_from_unused_public_photos",
        {
          p_event_id: selectedEvent.id,
          p_created_by: authUser?.id || null,
          p_title: null,
          p_style: "cinematic",
          p_format: "mp4",
        }
      );

      if (error) throw error;

      await updateQueuedFilmDuration(selectedEvent.id, selectedFilmDuration);
      await triggerFilmProcessing();
      await loadFilmsForEvent(selectedEvent.id);
      setMessage(`Filme enviado para processamento (${selectedFilmDuration}s).`);

      setTimeout(() => {
        loadFilmsForEvent(selectedEvent.id);
      }, 2500);
    } catch (error) {
      console.error("Erro ao gerar filme:", error);
      setMessage(error?.message || "Não foi possível gerar o filme.");
    } finally {
      setGeneratingFilm(false);
    }
  }

  async function generateQrCode(text) {
    try {
      const url = await QRCode.toDataURL(text, {
        width: 320,
        margin: 2,
      });
      setQrCodeDataUrl(url);
    } catch (error) {
      console.error("Erro ao gerar QR Code:", error);
      setQrCodeDataUrl("");
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  async function copyText(text, key) {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(""), 1800);
    } catch (error) {
      console.error("Erro ao copiar:", error);
    }
  }

  function downloadQr() {
    if (!qrCodeDataUrl || !selectedEvent?.slug) return;

    const a = document.createElement("a");
    a.href = qrCodeDataUrl;
    a.download = `qr-${selectedEvent.slug}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function formatDate(dateValue) {
    if (!dateValue) return "Sem data";
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "Sem data";
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
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

  function getFilmPreviewItems(filmId) {
    return videoItems.filter((item) => item.film_id === filmId);
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

  if (authLoading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.loadingCard}>
          <div style={styles.logoBadge}>
            <Camera size={24} />
          </div>
          <h2 style={styles.loadingTitle}>Carregando painel premium...</h2>
          <p style={styles.loadingText}>Preparando seus eventos e acessos.</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profile?.role === "admin") {
    return <Navigate to="/painel" replace />;
  }

  return (
    <div style={styles.page}>
      <div style={styles.glowOne} />
      <div style={styles.glowTwo} />

      <header
        style={{
          ...styles.header,
          ...(isMobile ? styles.headerMobile : {}),
        }}
      >
        <div style={styles.headerBrand}>
          <div style={styles.brandIcon}>
            <Camera size={22} />
          </div>
          <div>
            <div style={styles.brandTitle}>L’Amour Galeria</div>
            <div style={styles.brandSubtitle}>Painel Premium do Fotógrafo</div>
          </div>
        </div>

        <button type="button" onClick={handleLogout} style={styles.logoutButton}>
          <LogOut size={16} />
          Sair
        </button>
      </header>

      <main
        style={{
          ...styles.main,
          ...(isMobile ? styles.mainMobile : {}),
        }}
      >
        {message ? <div style={styles.alert}>{message}</div> : null}

        <section
          style={{
            ...styles.hero,
            ...(isMobile ? styles.heroMobile : {}),
          }}
        >
          <div style={styles.heroContent}>
            <div style={styles.heroBadge}>
              <Sparkles size={14} />
              Área exclusiva do fotógrafo
            </div>

            <h1
              style={{
                ...styles.heroTitle,
                ...(isMobile ? styles.heroTitleMobile : {}),
              }}
            >
              Seu estúdio com presença premium
            </h1>

            <p style={styles.heroText}>
              Gerencie eventos, compartilhe QR Codes, acompanhe galerias e entregue
              uma experiência mais profissional para seus clientes.
            </p>
          </div>

          <div style={styles.heroActions}>
            <button type="button" onClick={loadEvents} style={styles.primaryButton}>
              Atualizar eventos
            </button>
          </div>
        </section>

        <section
          style={{
            ...styles.dashboardGrid,
            ...(isTablet || isMobile ? styles.dashboardGridMobile : {}),
          }}
        >
          <aside style={styles.sidebar}>
            <div style={styles.profileCard}>
              <div style={styles.profileTop}>
                {photographer.avatar ? (
                  <img
                    src={photographer.avatar}
                    alt={photographer.name}
                    style={styles.avatar}
                  />
                ) : (
                  <div style={styles.avatarFallback}>
                    {photographer.name?.[0]?.toUpperCase() || "F"}
                  </div>
                )}

                <div style={{ minWidth: 0 }}>
                  <div style={styles.profileName}>{photographer.name}</div>
                  <div style={styles.profileEmail}>{photographer.email}</div>
                </div>
              </div>

              <div style={styles.profileActions}>
                {photographer.whatsapp ? (
                  <a
                    href={normalizeWhatsapp(photographer.whatsapp)}
                    target="_blank"
                    rel="noreferrer"
                    style={styles.profileActionButton}
                  >
                    <MessageCircle size={15} />
                    WhatsApp
                  </a>
                ) : null}
              </div>
            </div>

            <div
              style={{
                ...styles.statsGrid,
                ...(isMobile ? styles.statsGridMobile : {}),
              }}
            >
              <StatCard
                icon={<CalendarDays size={18} />}
                value={stats.total}
                label="Eventos"
              />
              <StatCard
                icon={<ImageIcon size={18} />}
                value={stats.uploadsOpen}
                label="Uploads abertos"
              />
              <StatCard
                icon={<Globe size={18} />}
                value={stats.publicEvents}
                label="Galerias públicas"
              />
              <StatCard
                icon={<Video size={18} />}
                value={stats.withDate}
                label="Com data"
              />
            </div>

            <div style={styles.panelCard}>
              <div style={styles.panelHeader}>
                <p style={styles.kicker}>Meus eventos</p>
                <h2 style={styles.panelTitle}>Lista do fotógrafo</h2>
              </div>

              {loadingEvents && events.length === 0 ? (
                <p style={styles.emptyText}>Carregando eventos...</p>
              ) : events.length === 0 ? (
                <p style={styles.emptyText}>
                  Nenhum evento vinculado à sua conta no momento.
                </p>
              ) : (
                <div style={styles.eventList}>
                  {events.map((event) => {
                    const isActive = selectedEvent?.id === event.id;

                    return (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => setSelectedEvent(event)}
                        style={{
                          ...styles.eventListButton,
                          ...(isActive ? styles.eventListButtonActive : {}),
                        }}
                      >
                        <div style={styles.eventListTop}>
                          <strong style={styles.eventListTitle}>
                            {event.name || "Evento sem nome"}
                          </strong>
                          <span style={styles.eventListDate}>
                            {formatDate(event.event_date)}
                          </span>
                        </div>

                        <div style={styles.eventListMeta}>
                          <span>
                            {event.is_upload_open ? "Upload aberto" : "Upload fechado"}
                          </span>
                          <span>
                            {event.event_settings?.gallery_mode === "public"
                              ? "Pública"
                              : "Privada"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          <section style={styles.mainPanel}>
            <div style={styles.panelCardLarge}>
              <div style={styles.panelHeader}>
                <p style={styles.kicker}>Evento selecionado</p>
                <h2 style={styles.panelTitle}>
                  {selectedEvent?.name || "Selecione um evento"}
                </h2>
              </div>

              {!selectedEvent ? (
                <p style={styles.emptyText}>
                  Escolha um evento para visualizar os detalhes.
                </p>
              ) : (
                <>
                  <div
                    style={{
                      ...styles.eventHero,
                      backgroundImage: selectedEvent.cover_url
                        ? `linear-gradient(rgba(19,24,42,.45), rgba(19,24,42,.58)), url(${selectedEvent.cover_url})`
                        : "linear-gradient(135deg, #1e2440 0%, #34406d 100%)",
                    }}
                  >
                    <div style={styles.eventHeroOverlay}>
                      <div style={styles.eventHeroTags}>
                        <span style={styles.eventHeroTag}>
                          {selectedEvent.is_upload_open
                            ? "Upload aberto"
                            : "Upload fechado"}
                        </span>
                        <span style={styles.eventHeroTag}>
                          {selectedEvent.event_settings?.gallery_mode === "public"
                            ? "Galeria pública"
                            : "Galeria privada"}
                        </span>
                      </div>

                      <p style={styles.eventHeroDate}>
                        {formatDate(selectedEvent.event_date)}
                      </p>

                      <p style={styles.eventHeroDescription}>
                        {selectedEvent.description ||
                          "Sem descrição cadastrada para este evento."}
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      ...styles.linkGrid,
                      ...(isMobile ? styles.linkGridMobile : {}),
                    }}
                  >
                    <ActionLink
                      href={selectedLinks.uploadUrl}
                      icon={<ExternalLink size={16} />}
                      title="Página de upload"
                      subtitle="Abra a página usada pelos convidados"
                    />
                    <ActionLink
                      href={selectedLinks.privateGalleryUrl}
                      icon={<ImageIcon size={16} />}
                      title="Galeria privada"
                      subtitle="Acesse a galeria restrita do evento"
                    />
                    <ActionLink
                      href={selectedLinks.publicGalleryUrl}
                      icon={<Globe size={16} />}
                      title="Galeria pública"
                      subtitle="Visualize a versão pública do evento"
                    />
                    <Link
                      to={`/meus-eventos/${selectedEvent.slug}`}
                      style={styles.actionTile}
                    >
                      <Settings size={16} />
                      <div>
                        <strong style={styles.actionTileTitle}>
                          Ver detalhes
                        </strong>
                        <span style={styles.actionTileText}>
                          Abrir painel detalhado deste evento
                        </span>
                      </div>
                    </Link>
                  </div>
                </>
              )}
            </div>

            <div
              style={{
                ...styles.secondaryGrid,
                ...(isMobile ? styles.secondaryGridMobile : {}),
              }}
            >
              <div style={styles.panelCard}>
                <div style={styles.panelHeader}>
                  <p style={styles.kicker}>QR Code</p>
                  <h2 style={styles.panelTitle}>Compartilhe com convidados</h2>
                </div>

                {!selectedEvent ? (
                  <p style={styles.emptyText}>
                    Selecione um evento para gerar o QR Code.
                  </p>
                ) : (
                  <>
                    <div style={styles.qrCard}>
                      {qrCodeDataUrl ? (
                        <img
                          src={qrCodeDataUrl}
                          alt={`QR Code do evento ${selectedEvent.name}`}
                          style={styles.qrImage}
                        />
                      ) : (
                        <div style={styles.qrPlaceholder}>
                          <QrCode size={42} />
                        </div>
                      )}
                    </div>

                    <div style={styles.qrActions}>
                      <button
                        type="button"
                        onClick={() => copyText(selectedLinks.uploadUrl, "upload")}
                        style={styles.secondaryButton}
                      >
                        <Copy size={15} />
                        {copiedKey === "upload" ? "Copiado!" : "Copiar link"}
                      </button>

                      <button
                        type="button"
                        onClick={downloadQr}
                        style={styles.secondaryButton}
                      >
                        <Download size={15} />
                        Baixar QR
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div style={styles.panelCard}>
                <div style={styles.panelHeader}>
                  <p style={styles.kicker}>Links rápidos</p>
                  <h2 style={styles.panelTitle}>Ações úteis</h2>
                </div>

                {!selectedEvent ? (
                  <p style={styles.emptyText}>
                    Selecione um evento para visualizar os links.
                  </p>
                ) : (
                  <div style={styles.linkList}>
                    <LinkRow
                      label="Upload"
                      value={selectedLinks.uploadUrl}
                      copiedKey={copiedKey}
                      copyId="upload2"
                      onCopy={copyText}
                    />
                    <LinkRow
                      label="Galeria privada"
                      value={selectedLinks.privateGalleryUrl}
                      copiedKey={copiedKey}
                      copyId="private"
                      onCopy={copyText}
                    />
                    <LinkRow
                      label="Galeria pública"
                      value={selectedLinks.publicGalleryUrl}
                      copiedKey={copiedKey}
                      copyId="public"
                      onCopy={copyText}
                    />
                  </div>
                )}
              </div>
            </div>

            <div style={styles.panelCardLarge}>
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

                {selectedEvent ? (
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

                    <button
                      type="button"
                      onClick={handleGenerateFilm}
                      disabled={generatingFilm || hasProcessingFilm}
                      style={{
                        ...styles.primaryButtonDark,
                        opacity: generatingFilm || hasProcessingFilm ? 0.6 : 1,
                        cursor:
                          generatingFilm || hasProcessingFilm
                            ? "not-allowed"
                            : "pointer",
                      }}
                    >
                      <Video size={16} />
                      {generatingFilm
                        ? "Gerando filme..."
                        : hasProcessingFilm
                        ? "Filme em processamento"
                        : "Gerar filme"}
                    </button>
                  </div>
                ) : null}
              </div>

              {!selectedEvent ? (
                <p style={styles.emptyText}>
                  Selecione um evento para visualizar os filmes.
                </p>
              ) : loadingFilms ? (
                <p style={styles.emptyText}>Carregando filmes do evento...</p>
              ) : featuredFilms.length === 0 ? (
                <p style={styles.emptyText}>
                  Este evento ainda não possui filme gerado.
                </p>
              ) : (
                <div
                  style={{
                    ...styles.filmGrid,
                    ...(isMobile ? styles.filmGridMobile : {}),
                  }}
                >
                  {featuredFilms.map((film) => {
                    const outputUrl = getFilmOutputUrl(film);
                    const filmPreviewList = getFilmPreviewItems(film.id);
                    const firstPreview = filmPreviewList[0];
                    const previewUrl = getPublicMediaUrl(firstPreview?.media_path);

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
                          ) : previewUrl ? (
                            <video
                              src={previewUrl}
                              style={styles.filmVideo}
                              controls
                              preload="metadata"
                            />
                          ) : (
                            <div style={styles.filmFallback}>
                              <PlayCircle size={34} />
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
                            <span>{film.style || "Estilo padrão"}</span>
                            <span>
                              {film.duration_seconds
                                ? `${film.duration_seconds}s`
                                : "Duração não informada"}
                            </span>
                            <span>{film.format || "Formato padrão"}</span>
                          </div>

                          {film.error_message ? (
                            <p style={styles.filmErrorText}>{film.error_message}</p>
                          ) : null}

                          {filmPreviewList.length > 0 ? (
                            <div style={styles.previewStrip}>
                              {filmPreviewList.slice(0, 4).map((item) => {
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
                                  <div key={item.id} style={styles.previewThumbFallback}>
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
                              style={styles.primaryLinkInline}
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
          </section>
        </section>
      </main>
    </div>
  );
}

function StatCard({ icon, value, label }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statIcon}>{icon}</div>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

function ActionLink({ href, icon, title, subtitle }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" style={styles.actionTile}>
      {icon}
      <div>
        <strong style={styles.actionTileTitle}>{title}</strong>
        <span style={styles.actionTileText}>{subtitle}</span>
      </div>
    </a>
  );
}

function LinkRow({ label, value, copiedKey, copyId, onCopy }) {
  return (
    <div style={styles.linkRow}>
      <div style={{ minWidth: 0 }}>
        <div style={styles.linkRowLabel}>{label}</div>
        <div style={styles.linkRowValue}>{value || "—"}</div>
      </div>

      <button
        type="button"
        onClick={() => onCopy(value, copyId)}
        style={styles.iconButton}
        disabled={!value}
      >
        {copiedKey === copyId ? <CheckIcon /> : <Link2 size={15} />}
      </button>
    </div>
  );
}

function CheckIcon() {
  return <span style={{ fontSize: 13, fontWeight: 800 }}>OK</span>;
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
  loadingScreen: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: "24px",
    background: "linear-gradient(180deg, #f7f5f2 0%, #f4f0ea 100%)",
  },
  loadingCard: {
    width: "100%",
    maxWidth: "440px",
    background: "rgba(255,255,255,0.76)",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(255,255,255,0.65)",
    borderRadius: "28px",
    padding: "32px",
    boxShadow: "0 18px 50px rgba(24,32,79,0.08)",
    textAlign: "center",
  },
  logoBadge: {
    width: "64px",
    height: "64px",
    borderRadius: "22px",
    margin: "0 auto 16px",
    background: "linear-gradient(135deg, #1e2440 0%, #2d355d 100%)",
    color: "#fff",
    display: "grid",
    placeItems: "center",
  },
  loadingTitle: {
    margin: "0 0 10px",
    fontSize: "24px",
    color: "#1f2333",
  },
  loadingText: {
    margin: 0,
    color: "#6c7388",
    fontSize: "15px",
  },
  header: {
    position: "sticky",
    top: 0,
    zIndex: 20,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    padding: "20px 28px",
    backdropFilter: "blur(18px)",
    background: "rgba(247,245,242,0.72)",
    borderBottom: "1px solid rgba(30,36,64,0.08)",
  },
  headerMobile: {
    padding: "16px",
    flexDirection: "column",
    alignItems: "stretch",
  },
  headerBrand: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },
  brandIcon: {
    width: "52px",
    height: "52px",
    borderRadius: "18px",
    background: "linear-gradient(135deg, #1e2440 0%, #34406d 100%)",
    color: "#fff",
    display: "grid",
    placeItems: "center",
    boxShadow: "0 12px 28px rgba(30,36,64,0.22)",
  },
  brandTitle: {
    fontSize: "18px",
    fontWeight: 800,
    color: "#1f2333",
  },
  brandSubtitle: {
    fontSize: "13px",
    color: "#7c8295",
    marginTop: "2px",
  },
  logoutButton: {
    height: "44px",
    borderRadius: "14px",
    border: "1px solid rgba(30,36,64,0.08)",
    background: "#fff",
    color: "#1f2333",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    cursor: "pointer",
    fontWeight: 700,
    padding: "0 16px",
    boxShadow: "0 8px 22px rgba(24,32,79,0.06)",
  },
  main: {
    position: "relative",
    zIndex: 1,
    padding: "28px",
  },
  mainMobile: {
    padding: "16px",
  },
  alert: {
    marginBottom: "18px",
    background: "#fff7e6",
    color: "#8a5a00",
    border: "1px solid #efd7b5",
    borderRadius: "16px",
    padding: "14px 16px",
    boxShadow: "0 10px 24px rgba(24,32,79,0.06)",
  },
  hero: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "18px",
    flexWrap: "wrap",
    background:
      "linear-gradient(135deg, rgba(30,36,64,0.98) 0%, rgba(52,64,109,0.96) 100%)",
    borderRadius: "30px",
    padding: "28px",
    color: "#fff",
    boxShadow: "0 18px 50px rgba(30,36,64,0.18)",
    marginBottom: "22px",
  },
  heroMobile: {
    padding: "22px",
  },
  heroContent: {
    maxWidth: "760px",
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
    marginBottom: "16px",
  },
  heroTitle: {
    margin: "0 0 12px",
    fontSize: "40px",
    lineHeight: 1.1,
  },
  heroTitleMobile: {
    fontSize: "30px",
  },
  heroText: {
    margin: 0,
    maxWidth: "700px",
    color: "rgba(255,255,255,0.82)",
    fontSize: "15px",
    lineHeight: 1.7,
  },
  heroActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  primaryButton: {
    height: "48px",
    border: "none",
    borderRadius: "14px",
    background: "#fff",
    color: "#1e2440",
    fontWeight: 800,
    cursor: "pointer",
    padding: "0 18px",
  },
  primaryButtonDark: {
    minHeight: "46px",
    border: "none",
    borderRadius: "14px",
    background: "linear-gradient(135deg, #1e2440 0%, #33406b 100%)",
    color: "#fff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    fontWeight: 800,
    padding: "0 16px",
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
  dashboardGrid: {
    display: "grid",
    gridTemplateColumns: "360px minmax(0, 1fr)",
    gap: "20px",
    alignItems: "start",
  },
  dashboardGridMobile: {
    gridTemplateColumns: "1fr",
  },
  sidebar: {
    display: "grid",
    gap: "20px",
  },
  mainPanel: {
    display: "grid",
    gap: "20px",
  },
  profileCard: {
    background: "rgba(255,255,255,0.78)",
    backdropFilter: "blur(14px)",
    border: "1px solid rgba(30,36,64,0.08)",
    borderRadius: "28px",
    padding: "22px",
    boxShadow: "0 14px 36px rgba(24,32,79,0.06)",
  },
  profileTop: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    marginBottom: "14px",
  },
  avatar: {
    width: "74px",
    height: "74px",
    borderRadius: "50%",
    objectFit: "cover",
    border: "3px solid rgba(255,255,255,0.9)",
    boxShadow: "0 10px 24px rgba(24,32,79,0.12)",
    flexShrink: 0,
  },
  avatarFallback: {
    width: "74px",
    height: "74px",
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(135deg, #1e2440 0%, #34406d 100%)",
    color: "#fff",
    fontSize: "28px",
    fontWeight: 800,
    flexShrink: 0,
  },
  profileName: {
    fontSize: "19px",
    fontWeight: 800,
    color: "#1f2333",
  },
  profileEmail: {
    fontSize: "14px",
    color: "#6f768c",
    marginTop: "4px",
    wordBreak: "break-word",
  },
  profileActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  profileActionButton: {
    minHeight: "42px",
    borderRadius: "14px",
    border: "1px solid #e3e7f0",
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
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "14px",
  },
  statsGridMobile: {
    gridTemplateColumns: "1fr 1fr",
  },
  statCard: {
    background: "rgba(255,255,255,0.78)",
    border: "1px solid rgba(30,36,64,0.08)",
    borderRadius: "22px",
    padding: "18px",
    boxShadow: "0 12px 28px rgba(24,32,79,0.06)",
  },
  statIcon: {
    width: "42px",
    height: "42px",
    borderRadius: "14px",
    display: "grid",
    placeItems: "center",
    background: "#f2e4d2",
    color: "#6a5139",
    marginBottom: "12px",
  },
  statValue: {
    fontSize: "28px",
    fontWeight: 800,
    color: "#1f2333",
    lineHeight: 1,
    marginBottom: "8px",
  },
  statLabel: {
    color: "#71788c",
    fontSize: "13px",
  },
  panelCard: {
    background: "rgba(255,255,255,0.78)",
    backdropFilter: "blur(14px)",
    border: "1px solid rgba(30,36,64,0.08)",
    borderRadius: "28px",
    padding: "22px",
    boxShadow: "0 14px 36px rgba(24,32,79,0.06)",
  },
  panelCardLarge: {
    background: "rgba(255,255,255,0.78)",
    backdropFilter: "blur(14px)",
    border: "1px solid rgba(30,36,64,0.08)",
    borderRadius: "30px",
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
  emptyText: {
    color: "#6f768b",
    fontSize: "14px",
    lineHeight: 1.6,
    margin: 0,
  },
  eventList: {
    display: "grid",
    gap: "12px",
  },
  eventListButton: {
    width: "100%",
    textAlign: "left",
    border: "1px solid #e4e8f0",
    background: "#fff",
    borderRadius: "18px",
    padding: "14px 15px",
    cursor: "pointer",
  },
  eventListButtonActive: {
    border: "1px solid rgba(30,36,64,0.22)",
    background: "linear-gradient(135deg, #f8f6f2 0%, #f3efe9 100%)",
    boxShadow: "0 10px 22px rgba(24,32,79,0.08)",
  },
  eventListTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    alignItems: "flex-start",
    marginBottom: "8px",
  },
  eventListTitle: {
    color: "#1f2333",
    fontSize: "15px",
  },
  eventListDate: {
    color: "#6f768c",
    fontSize: "12px",
    whiteSpace: "nowrap",
  },
  eventListMeta: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    fontSize: "12px",
    color: "#7d8497",
  },
  eventHero: {
    minHeight: "250px",
    borderRadius: "26px",
    overflow: "hidden",
    backgroundSize: "cover",
    backgroundPosition: "center",
    boxShadow: "0 18px 40px rgba(24,32,79,0.12)",
    marginBottom: "18px",
  },
  eventHeroOverlay: {
    width: "100%",
    height: "100%",
    minHeight: "250px",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
  },
  eventHeroTags: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginBottom: "12px",
  },
  eventHeroTag: {
    minHeight: "30px",
    padding: "0 12px",
    borderRadius: "999px",
    display: "inline-flex",
    alignItems: "center",
    background: "rgba(255,255,255,0.14)",
    color: "#fff",
    fontSize: "12px",
    fontWeight: 700,
    border: "1px solid rgba(255,255,255,0.16)",
  },
  eventHeroDate: {
    margin: "0 0 10px",
    color: "#f0d7b5",
    fontWeight: 800,
    fontSize: "13px",
  },
  eventHeroDescription: {
    margin: 0,
    color: "rgba(255,255,255,0.88)",
    lineHeight: 1.6,
    maxWidth: "720px",
  },
  linkGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "14px",
  },
  linkGridMobile: {
    gridTemplateColumns: "1fr",
  },
  actionTile: {
    minHeight: "92px",
    borderRadius: "20px",
    border: "1px solid #e4e8f0",
    background: "#fff",
    padding: "16px",
    display: "flex",
    gap: "12px",
    alignItems: "flex-start",
    textDecoration: "none",
    color: "#1f2333",
  },
  actionTileTitle: {
    display: "block",
    fontSize: "15px",
    marginBottom: "5px",
  },
  actionTileText: {
    display: "block",
    fontSize: "13px",
    color: "#6f768c",
    lineHeight: 1.5,
  },
  secondaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "20px",
  },
  secondaryGridMobile: {
    gridTemplateColumns: "1fr",
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
  qrActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginTop: "14px",
  },
  secondaryButton: {
    minHeight: "44px",
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
    padding: "0 16px",
  },
  linkList: {
    display: "grid",
    gap: "10px",
  },
  linkRow: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: "10px",
    alignItems: "center",
    background: "#fff",
    border: "1px solid #e7eaf2",
    borderRadius: "16px",
    padding: "12px 14px",
  },
  linkRowLabel: {
    fontSize: "12px",
    color: "#8a90a3",
    textTransform: "uppercase",
    letterSpacing: ".05em",
    marginBottom: "4px",
  },
  linkRowValue: {
    fontSize: "13px",
    color: "#23283a",
    wordBreak: "break-word",
  },
  iconButton: {
    width: "38px",
    height: "38px",
    borderRadius: "12px",
    border: "1px solid #dfe3ec",
    background: "#fff",
    color: "#29314d",
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
  },
  filmGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "18px",
  },
  filmGridMobile: {
    gridTemplateColumns: "1fr",
  },
  filmCard: {
    borderRadius: "24px",
    overflow: "hidden",
    background: "#fff",
    border: "1px solid rgba(30,36,64,0.08)",
    boxShadow: "0 12px 28px rgba(24,32,79,0.08)",
  },
  filmPreviewWrap: {
    position: "relative",
    background: "#eef1f7",
    minHeight: "240px",
  },
  filmVideo: {
    width: "100%",
    height: "100%",
    minHeight: "240px",
    objectFit: "cover",
    display: "block",
    background: "#111",
  },
  filmFallback: {
    width: "100%",
    minHeight: "240px",
    display: "grid",
    placeItems: "center",
    color: "#34406d",
    background: "linear-gradient(135deg, #eef1f7 0%, #e4e9f5 100%)",
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
    width: "74px",
    height: "74px",
    objectFit: "cover",
    borderRadius: "12px",
    background: "#111",
  },
  previewThumbFallback: {
    width: "74px",
    height: "74px",
    borderRadius: "12px",
    background: "#eef1f7",
    display: "grid",
    placeItems: "center",
    color: "#7b8196",
  },
  primaryLinkInline: {
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
};