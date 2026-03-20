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
  QrCode,
  Settings,
  Sparkles,
  Video,
} from "lucide-react";
import { supabase } from "../lib/supabase";

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1080;

export default function MeusEventos() {
  const [authLoading, setAuthLoading] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [partnerInfo, setPartnerInfo] = useState(null);

  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [copiedKey, setCopiedKey] = useState("");
  const [message, setMessage] = useState("");
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

  async function loadSession() {
    try {
      setAuthLoading(true);
      setMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        setUser(null);
        setProfile(null);
        setPartnerInfo(null);
        return;
      }

      setUser(user);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      setProfile(profileData || null);
      await loadEvents();
    } catch (error) {
      console.error("Erro ao carregar sessão:", error);
      setMessage("Erro ao carregar sessão do usuário.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function loadEvents() {
    try {
      setLoadingEvents(true);

      const { data: userData } = await supabase.auth.getUser();
      const authUser = userData.user;

      if (!authUser) {
        setEvents([]);
        setPartnerInfo(null);
        return;
      }

      const { data: partner, error: partnerError } = await supabase
        .from("partners")
        .select(
          "id, profile_id, studio_name, phone, notes, active, created_at, email, avatar_url"
        )
        .eq("profile_id", authUser.id)
        .single();

      if (partnerError || !partner) {
        console.error("Parceiro não encontrado", partnerError);
        setPartnerInfo(null);
        setEvents([]);
        return;
      }

      setPartnerInfo(partner);

      const { data: eventsData, error } = await supabase
        .from("events")
        .select(`
          *,
          event_settings (*)
        `)
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
                          ...styles.eventItem,
                          ...(isActive ? styles.eventItemActive : {}),
                        }}
                      >
                        <div style={styles.eventItemTop}>
                          <strong style={styles.eventName}>
                            {event.name || "Evento sem nome"}
                          </strong>

                          <span
                            style={{
                              ...styles.statusBadge,
                              ...(event.is_upload_open
                                ? styles.statusOpen
                                : styles.statusClosed),
                            }}
                          >
                            {event.is_upload_open ? "Upload aberto" : "Fechado"}
                          </span>
                        </div>

                        <div style={styles.eventMeta}>
                          <span>{event.slug || "sem-slug"}</span>
                          <span>•</span>
                          <span>{formatDate(event.event_date)}</span>
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
                  {selectedEvent?.name || "Nenhum evento selecionado"}
                </h2>
              </div>

              {!selectedEvent ? (
                <p style={styles.emptyText}>
                  Selecione um evento para visualizar os detalhes.
                </p>
              ) : (
                <>
                  <div
                    style={{
                      ...styles.infoGrid,
                      ...(isMobile ? styles.infoGridMobile : {}),
                    }}
                  >
                    <InfoBox label="Slug" value={selectedEvent.slug} />
                    <InfoBox
                      label="Data"
                      value={formatDate(selectedEvent.event_date)}
                    />
                    <InfoBox
                      label="Upload"
                      value={selectedEvent.is_upload_open ? "Aberto" : "Fechado"}
                    />
                    <InfoBox
                      label="Modo da galeria"
                      value={
                        selectedEvent.event_settings?.gallery_mode === "public"
                          ? "Pública"
                          : "Privada"
                      }
                    />
                    <InfoBox
                      label="Vídeos"
                      value={
                        selectedEvent.event_settings?.allow_videos
                          ? "Permitidos"
                          : "Bloqueados"
                      }
                    />
                    <InfoBox
                      label="Nome do convidado"
                      value={
                        selectedEvent.event_settings?.require_guest_name
                          ? "Obrigatório"
                          : "Opcional"
                      }
                    />
                  </div>

                  <div
                    style={{
                      ...styles.linksGrid,
                      ...(isMobile ? styles.linksGridMobile : {}),
                    }}
                  >
                    <LinkCard
                      title="Link de upload"
                      icon={<Link2 size={16} />}
                      url={selectedLinks.uploadUrl}
                      onCopy={() => copyText(selectedLinks.uploadUrl, "upload")}
                      copied={copiedKey === "upload"}
                    />

                    <LinkCard
                      title="Galeria privada"
                      icon={<ExternalLink size={16} />}
                      url={selectedLinks.privateGalleryUrl}
                      onCopy={() =>
                        copyText(selectedLinks.privateGalleryUrl, "private")
                      }
                      copied={copiedKey === "private"}
                    />

                    <LinkCard
                      title="Galeria pública"
                      icon={<Globe size={16} />}
                      url={selectedLinks.publicGalleryUrl}
                      onCopy={() => copyText(selectedLinks.publicGalleryUrl, "public")}
                      copied={copiedKey === "public"}
                    />
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
                  <h2 style={styles.panelTitle}>Compartilhamento rápido</h2>
                </div>

                {!selectedEvent ? (
                  <p style={styles.emptyText}>
                    Selecione um evento para gerar o QR Code.
                  </p>
                ) : (
                  <>
                    <div style={styles.qrPreview}>
                      {qrCodeDataUrl ? (
                        <img
                          src={qrCodeDataUrl}
                          alt="QR Code do evento"
                          style={styles.qrImage}
                        />
                      ) : (
                        <div style={styles.qrPlaceholder}>
                          <QrCode size={30} />
                          <span>Gerando QR Code...</span>
                        </div>
                      )}
                    </div>

                    <div style={styles.actionRow}>
                      <button
                        type="button"
                        onClick={() =>
                          copyText(selectedLinks.uploadUrl, "qrcode-link")
                        }
                        style={styles.secondaryButton}
                      >
                        <Copy size={16} />
                        {copiedKey === "qrcode-link" ? "Copiado!" : "Copiar link"}
                      </button>

                      <button
                        type="button"
                        onClick={downloadQr}
                        style={styles.secondaryButton}
                      >
                        <Download size={16} />
                        Baixar QR
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div style={styles.panelCard}>
                <div style={styles.panelHeader}>
                  <p style={styles.kicker}>Ações rápidas</p>
                  <h2 style={styles.panelTitle}>Acesso direto</h2>
                </div>

                {!selectedEvent ? (
                  <p style={styles.emptyText}>
                    Selecione um evento para exibir os atalhos.
                  </p>
                ) : (
                  <div style={styles.quickActions}>
                    <a
                      href={selectedLinks.uploadUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={styles.primaryLinkButton}
                    >
                      <ExternalLink size={16} />
                      Abrir upload
                    </a>

                    <Link
                      to={`/evento/${selectedEvent.slug}/galeria`}
                      style={styles.secondaryLinkButton}
                    >
                      <ImageIcon size={16} />
                      Galeria privada
                    </Link>

                    <Link
                      to={`/evento/${selectedEvent.slug}/configuracoes`}
                      style={styles.secondaryLinkButton}
                    >
                      <Settings size={16} />
                      Configurações
                    </Link>

                    <a
                      href={selectedLinks.publicGalleryUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={styles.secondaryLinkButton}
                    >
                      <Globe size={16} />
                      Galeria pública
                    </a>

                    <Link
                      to={`/meus-eventos/${selectedEvent.slug}`}
                      style={styles.secondaryLinkButton}
                    >
                      <Camera size={16} />
                      Detalhes do evento
                    </Link>
                  </div>
                )}
              </div>
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
      <div style={styles.statIconWrap}>{icon}</div>
      <div>
        <div style={styles.statValue}>{value}</div>
        <div style={styles.statLabel}>{label}</div>
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

function LinkCard({ title, icon, url, onCopy, copied }) {
  return (
    <div style={styles.linkCard}>
      <div style={styles.linkCardTitle}>
        <span style={styles.linkIcon}>{icon}</span>
        <strong>{title}</strong>
      </div>

      <div style={styles.linkUrl}>{url || "—"}</div>

      <div style={styles.linkActions}>
        <button type="button" onClick={onCopy} style={styles.secondaryButton}>
          <Copy size={16} />
          {copied ? "Copiado!" : "Copiar"}
        </button>

        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          style={styles.secondaryLinkButton}
        >
          <ExternalLink size={16} />
          Abrir
        </a>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top left, rgba(240,210,170,0.18), transparent 25%), radial-gradient(circle at bottom right, rgba(176,137,104,0.16), transparent 22%), linear-gradient(180deg, #f7f5f2 0%, #f3eee7 100%)",
    position: "relative",
    overflow: "hidden",
  },
  glowOne: {
    position: "absolute",
    top: "-120px",
    right: "-120px",
    width: "320px",
    height: "320px",
    borderRadius: "50%",
    background: "rgba(176,137,104,0.14)",
    filter: "blur(60px)",
    pointerEvents: "none",
  },
  glowTwo: {
    position: "absolute",
    bottom: "-100px",
    left: "-90px",
    width: "300px",
    height: "300px",
    borderRadius: "50%",
    background: "rgba(30,36,64,0.08)",
    filter: "blur(70px)",
    pointerEvents: "none",
  },
  loadingScreen: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(180deg, #f7f5f2 0%, #f4f0ea 100%)",
    padding: "24px",
  },
  loadingCard: {
    width: "100%",
    maxWidth: "440px",
    background: "rgba(255,255,255,0.75)",
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
    boxShadow: "0 12px 30px rgba(30,36,64,0.22)",
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
    background: "rgba(247,245,242,0.74)",
    borderBottom: "1px solid rgba(30,36,64,0.08)",
  },
  headerMobile: {
    padding: "16px",
    flexWrap: "wrap",
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
    minHeight: "44px",
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
    padding: "10px 16px",
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
    background: "#fff4e8",
    color: "#8a5a00",
    border: "1px solid #efd7b5",
    borderRadius: "16px",
    padding: "14px 16px",
    boxShadow: "0 10px 24px rgba(138,90,0,0.06)",
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
    padding: "30px",
    color: "#fff",
    boxShadow: "0 18px 50px rgba(30,36,64,0.18)",
    marginBottom: "22px",
  },
  heroMobile: {
    padding: "22px",
    borderRadius: "24px",
  },
  heroContent: {
    maxWidth: "760px",
  },
  heroBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    borderRadius: "999px",
    padding: "8px 14px",
    background: "rgba(255,255,255,0.12)",
    color: "#f1d9b0",
    fontWeight: 700,
    fontSize: "12px",
    marginBottom: "14px",
  },
  heroTitle: {
    margin: "0 0 12px",
    fontSize: "38px",
    lineHeight: 1.08,
  },
  heroTitleMobile: {
    fontSize: "28px",
  },
  heroText: {
    margin: 0,
    color: "rgba(255,255,255,0.82)",
    fontSize: "15px",
    lineHeight: 1.7,
    maxWidth: "720px",
  },
  heroActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  primaryButton: {
    minHeight: "46px",
    border: "none",
    borderRadius: "14px",
    background: "#fff",
    color: "#1f2333",
    padding: "0 18px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 12px 24px rgba(255,255,255,0.12)",
  },
  dashboardGrid: {
    display: "grid",
    gridTemplateColumns: "380px minmax(0, 1fr)",
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
    marginBottom: "16px",
  },
  avatar: {
    width: "72px",
    height: "72px",
    borderRadius: "50%",
    objectFit: "cover",
    border: "3px solid rgba(255,255,255,0.9)",
    boxShadow: "0 10px 22px rgba(24,32,79,0.12)",
  },
  avatarFallback: {
    width: "72px",
    height: "72px",
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(135deg, #1e2440 0%, #34406d 100%)",
    color: "#fff",
    boxShadow: "0 10px 22px rgba(24,32,79,0.12)",
    fontSize: "28px",
    fontWeight: 800,
  },
  profileName: {
    fontSize: "19px",
    fontWeight: 800,
    color: "#1f2333",
    lineHeight: 1.2,
  },
  profileEmail: {
    marginTop: "4px",
    fontSize: "13px",
    color: "#6f768b",
    wordBreak: "break-word",
  },
  profileActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  profileActionButton: {
    minHeight: "40px",
    borderRadius: "14px",
    border: "1px solid #e1ddd6",
    background: "#fff",
    color: "#29314d",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    textDecoration: "none",
    fontWeight: 700,
    padding: "0 14px",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "14px",
  },
  statsGridMobile: {
    gridTemplateColumns: "1fr",
  },
  statCard: {
    background: "rgba(255,255,255,0.82)",
    border: "1px solid rgba(30,36,64,0.08)",
    borderRadius: "22px",
    padding: "18px",
    boxShadow: "0 14px 34px rgba(24,32,79,0.06)",
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },
  statIconWrap: {
    width: "46px",
    height: "46px",
    borderRadius: "15px",
    background: "linear-gradient(135deg, #f0dfc6 0%, #edd0a9 100%)",
    color: "#5e4632",
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
  },
  statValue: {
    fontSize: "28px",
    fontWeight: 800,
    color: "#1f2333",
    lineHeight: 1,
    marginBottom: "6px",
  },
  statLabel: {
    fontSize: "13px",
    color: "#71788c",
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
    background: "rgba(255,255,255,0.82)",
    backdropFilter: "blur(14px)",
    border: "1px solid rgba(30,36,64,0.08)",
    borderRadius: "30px",
    padding: "24px",
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
  eventItem: {
    width: "100%",
    border: "1px solid #ebe9e3",
    borderRadius: "18px",
    background: "#fbfaf8",
    padding: "16px",
    cursor: "pointer",
    textAlign: "left",
    transition: "all .2s ease",
  },
  eventItemActive: {
    border: "1px solid #d8b98d",
    background: "#fff6eb",
    boxShadow: "0 12px 26px rgba(176,137,104,0.12)",
  },
  eventItemTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "8px",
  },
  eventName: {
    color: "#1f2333",
    fontSize: "15px",
  },
  statusBadge: {
    minHeight: "28px",
    borderRadius: "999px",
    padding: "4px 12px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: 700,
  },
  statusOpen: {
    background: "#e7f7ef",
    color: "#257549",
  },
  statusClosed: {
    background: "#f3f3f5",
    color: "#777f90",
  },
  eventMeta: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    fontSize: "13px",
    color: "#747c90",
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "12px",
    marginBottom: "16px",
  },
  infoGridMobile: {
    gridTemplateColumns: "1fr",
  },
  infoBox: {
    background: "#f8f6f2",
    border: "1px solid #eee9e1",
    borderRadius: "16px",
    padding: "12px 14px",
  },
  infoLabel: {
    display: "block",
    fontSize: "11px",
    color: "#8a90a3",
    textTransform: "uppercase",
    letterSpacing: ".06em",
    marginBottom: "5px",
  },
  infoValue: {
    color: "#23283a",
    fontSize: "14px",
    wordBreak: "break-word",
  },
  linksGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "14px",
  },
  linksGridMobile: {
    gridTemplateColumns: "1fr",
  },
  linkCard: {
    background: "#f8f6f2",
    border: "1px solid #eee9e1",
    borderRadius: "18px",
    padding: "14px",
  },
  linkCardTitle: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "10px",
    color: "#1f2333",
    flexWrap: "wrap",
  },
  linkIcon: {
    display: "inline-flex",
    color: "#b08968",
  },
  linkUrl: {
    background: "#fff",
    border: "1px solid #ece8e0",
    borderRadius: "14px",
    padding: "10px 12px",
    fontSize: "13px",
    color: "#49516a",
    wordBreak: "break-word",
    marginBottom: "10px",
  },
  linkActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  secondaryGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 0.9fr) minmax(0, 1.1fr)",
    gap: "20px",
    alignItems: "start",
  },
  secondaryGridMobile: {
    gridTemplateColumns: "1fr",
  },
  qrPreview: {
    background: "#fff",
    border: "1px solid #ece8e0",
    borderRadius: "20px",
    minHeight: "260px",
    display: "grid",
    placeItems: "center",
    padding: "14px",
    marginBottom: "12px",
  },
  qrImage: {
    width: "100%",
    maxWidth: "230px",
    height: "auto",
    display: "block",
  },
  qrPlaceholder: {
    display: "grid",
    gap: "10px",
    placeItems: "center",
    color: "#7a8091",
    fontSize: "14px",
    textAlign: "center",
  },
  actionRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  quickActions: {
    display: "grid",
    gap: "12px",
  },
  secondaryButton: {
    minHeight: "42px",
    border: "1px solid #e1ddd6",
    borderRadius: "14px",
    background: "#fff",
    color: "#29314d",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    cursor: "pointer",
    fontWeight: 700,
    padding: "10px 14px",
    textDecoration: "none",
  },
  primaryLinkButton: {
    minHeight: "44px",
    border: "none",
    borderRadius: "14px",
    background: "linear-gradient(135deg, #1e2440 0%, #33406b 100%)",
    color: "#fff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    textDecoration: "none",
    fontWeight: 800,
    padding: "10px 16px",
    boxShadow: "0 12px 24px rgba(30,36,64,0.16)",
  },
  secondaryLinkButton: {
    minHeight: "42px",
    border: "1px solid #e1ddd6",
    borderRadius: "14px",
    background: "#fff",
    color: "#29314d",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    textDecoration: "none",
    fontWeight: 700,
    padding: "10px 14px",
  },
};