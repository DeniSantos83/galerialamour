import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import QRCode from "qrcode";
import PanelLoader from "../components/PanelLoader";
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
  QrCode,
  Settings,
  UserCircle2,
} from "lucide-react";
import { supabase } from "../lib/supabase";

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

export default function MeusEventos() {
  const [authLoading, setAuthLoading] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

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
  const isTablet = screenWidth > MOBILE_BREAKPOINT && screenWidth <= TABLET_BREAKPOINT;
  const isDesktop = screenWidth > TABLET_BREAKPOINT;

  const responsive = useMemo(() => getResponsiveStyles(screenWidth), [screenWidth]);

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

    return {
      total,
      uploadsOpen,
      withDate,
    };
  }, [events]);

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
      const user = userData.user;

      if (!user) {
        setEvents([]);
        return;
      }

      const { data: partner, error: partnerError } = await supabase
        .from("partners")
        .select("id")
        .eq("profile_id", user.id)
        .single();

      if (partnerError || !partner) {
        console.error("Parceiro não encontrado");
        setEvents([]);
        return;
      }

      const { data: events, error } = await supabase
        .from("events")
        .select(`
          *,
          event_settings (*)
        `)
        .eq("partner_id", partner.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const normalizedEvents = events || [];
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

  if (authLoading || loadingEvents) {
  return (
    <PanelLoader
      title="Carregando painel..."
      subtitle="Aguarde enquanto buscamos seus eventos e acessos."
      icon="camera"
    />
  );
}

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profile?.role === "admin") {
    return <Navigate to="/painel" replace />;
  }

  const partnerName =
    profile?.studio_name ||
    profile?.full_name ||
    profile?.["full-name"] ||
    user.email ||
    "Fotógrafo parceiro";

  return (
    <div style={styles.page}>
      <div style={styles.backgroundGlowTop} />
      <div style={styles.backgroundGlowBottom} />

      <header
        style={{
          ...styles.header,
          ...responsive.header,
        }}
      >
        <div
          style={{
            ...styles.headerLeft,
            ...responsive.headerLeft,
          }}
        >
          <div style={styles.brandIcon}>
            <Camera size={22} />
          </div>

          <div>
            <div style={styles.brandTitle}>L’Amour Galeria</div>
            <div style={styles.brandSubtitle}>Painel do Fotógrafo</div>
          </div>
        </div>

        <div
          style={{
            ...styles.headerRight,
            ...responsive.headerRight,
          }}
        >
          <div
            style={{
              ...styles.partnerBadge,
              ...responsive.partnerBadge,
            }}
          >
            <UserCircle2 size={18} />
            <div style={styles.partnerBadgeText}>
              <strong style={styles.partnerName}>{partnerName}</strong>
              <span style={styles.partnerEmail}>{user.email}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              ...styles.logoutButton,
              ...responsive.fullWidthButtonMaybe,
            }}
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </header>

      <main
        style={{
          ...styles.main,
          ...responsive.main,
        }}
      >
        {message ? <div style={styles.alert}>{message}</div> : null}

        <section
          style={{
            ...styles.heroCard,
            ...responsive.heroCard,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <p style={styles.kicker}>Área do Parceiro</p>
            <h1
              style={{
                ...styles.heroTitle,
                ...responsive.heroTitle,
              }}
            >
              Seus eventos em um só lugar
            </h1>
            <p
              style={{
                ...styles.heroSubtitle,
                ...responsive.heroSubtitle,
              }}
            >
              Acesse links, QR Code, galerias e configurações dos eventos
              vinculados à sua conta.
            </p>
          </div>

          <div style={styles.heroActions}>
            <button
              type="button"
              style={{
                ...styles.refreshButton,
                ...responsive.fullWidthButtonMaybe,
              }}
              onClick={() => loadEvents()}
            >
              Atualizar eventos
            </button>
          </div>
        </section>

        <section
          style={{
            ...styles.statsGrid,
            ...responsive.statsGrid,
          }}
        >
          <div style={styles.statCard}>
            <div style={styles.statIconWrap}>
              <CalendarDays size={18} />
            </div>
            <div>
              <div
                style={{
                  ...styles.statValue,
                  ...responsive.statValue,
                }}
              >
                {stats.total}
              </div>
              <div style={styles.statLabel}>Eventos vinculados</div>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIconWrap}>
              <ImageIcon size={18} />
            </div>
            <div>
              <div
                style={{
                  ...styles.statValue,
                  ...responsive.statValue,
                }}
              >
                {stats.uploadsOpen}
              </div>
              <div style={styles.statLabel}>Uploads abertos</div>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIconWrap}>
              <Globe size={18} />
            </div>
            <div>
              <div
                style={{
                  ...styles.statValue,
                  ...responsive.statValue,
                }}
              >
                {stats.withDate}
              </div>
              <div style={styles.statLabel}>Com data definida</div>
            </div>
          </div>
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
                <div>
                  <p style={styles.kicker}>Eventos</p>
                  <h2
                    style={{
                      ...styles.panelTitle,
                      ...responsive.panelTitle,
                    }}
                  >
                    Minha lista de eventos
                  </h2>
                </div>
              </div>

              {loadingEvents && events.length === 0 ? (
                <p style={styles.emptyText}>Carregando seus eventos...</p>
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
                        <div style={styles.eventItemContent}>
                          <div
                            style={{
                              ...styles.eventTopRow,
                              ...responsive.eventTopRow,
                            }}
                          >
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
                              {event.is_upload_open
                                ? "Upload aberto"
                                : "Upload fechado"}
                            </span>
                          </div>

                          <div style={styles.eventMeta}>
                            <span>{event.slug || "sem-slug"}</span>
                            <span>•</span>
                            <span>{formatDate(event.event_date)}</span>
                          </div>

                          <div style={styles.eventDescription}>
                            {event.description?.trim()
                              ? event.description
                              : "Sem descrição cadastrada para este evento."}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div style={styles.rightColumn}>
            <div style={styles.panelCard}>
              <div style={styles.panelHeader}>
                <div>
                  <p style={styles.kicker}>Resumo</p>
                  <h2
                    style={{
                      ...styles.panelTitle,
                      ...responsive.panelTitle,
                    }}
                  >
                    Evento selecionado
                  </h2>
                </div>
              </div>

              {!selectedEvent ? (
                <p style={styles.emptyText}>
                  Selecione um evento para visualizar seus links e QR Code.
                </p>
              ) : (
                <>
                  <InfoBox label="Evento" value={selectedEvent.name} />
                  <InfoBox label="Slug" value={selectedEvent.slug} />
                  <InfoBox
                    label="Data"
                    value={formatDate(selectedEvent.event_date)}
                  />
                  <InfoBox
                    label="Parceiro"
                    value={selectedEvent.partner_name || partnerName}
                  />
                  <InfoBox
                    label="Modo da galeria"
                    value={selectedEvent.event_settings?.gallery_mode || "private"}
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
                </>
              )}
            </div>

            <div style={styles.panelCard}>
              <div style={styles.panelHeader}>
                <div>
                  <p style={styles.kicker}>Acessos rápidos</p>
                  <h2
                    style={{
                      ...styles.panelTitle,
                      ...responsive.panelTitle,
                    }}
                  >
                    Links do evento
                  </h2>
                </div>
              </div>

              {!selectedEvent ? (
                <p style={styles.emptyText}>
                  Selecione um evento para exibir os links.
                </p>
              ) : (
                <>
                  <LinkBox
                    icon={<Link2 size={16} />}
                    title="Link público de upload"
                    url={selectedLinks.uploadUrl}
                    onCopy={() => copyText(selectedLinks.uploadUrl, "upload")}
                    copied={copiedKey === "upload"}
                    isMobile={isMobile}
                  />

                  <LinkBox
                    icon={<ExternalLink size={16} />}
                    title="Galeria privada"
                    url={selectedLinks.privateGalleryUrl}
                    onCopy={() => copyText(selectedLinks.privateGalleryUrl, "private")}
                    copied={copiedKey === "private"}
                    isMobile={isMobile}
                  />

                  <LinkBox
                    icon={<Globe size={16} />}
                    title="Galeria pública"
                    url={selectedLinks.publicGalleryUrl}
                    onCopy={() => copyText(selectedLinks.publicGalleryUrl, "public")}
                    copied={copiedKey === "public"}
                    isMobile={isMobile}
                  />
                </>
              )}
            </div>

            <div style={styles.panelCard}>
              <div style={styles.panelHeader}>
                <div>
                  <p style={styles.kicker}>QR Code</p>
                  <h2
                    style={{
                      ...styles.panelTitle,
                      ...responsive.panelTitle,
                    }}
                  >
                    Compartilhamento rápido
                  </h2>
                </div>
              </div>

              {!selectedEvent ? (
                <p style={styles.emptyText}>
                  Selecione um evento para gerar o QR Code.
                </p>
              ) : (
                <>
                  <div
                    style={{
                      ...styles.qrPreview,
                      ...responsive.qrPreview,
                    }}
                  >
                    {qrCodeDataUrl ? (
                      <img
                        src={qrCodeDataUrl}
                        alt="QR Code do evento"
                        style={styles.qrImage}
                      />
                    ) : (
                      <div style={styles.qrPlaceholder}>
                        <QrCode size={32} />
                        <span>Gerando QR Code...</span>
                      </div>
                    )}
                  </div>

                  <div style={styles.qrActions}>
                    <button
                      type="button"
                      onClick={() => copyText(selectedLinks.uploadUrl, "qrcode-link")}
                      style={{
                        ...styles.secondaryButton,
                        ...responsive.actionButton,
                      }}
                    >
                      <Copy size={16} />
                      {copiedKey === "qrcode-link" ? "Copiado!" : "Copiar link"}
                    </button>

                    <button
                      type="button"
                      onClick={downloadQr}
                      style={{
                        ...styles.secondaryButton,
                        ...responsive.actionButton,
                      }}
                    >
                      <Download size={16} />
                      Baixar QR
                    </button>
                  </div>

                  <div style={styles.qrActions}>
                    <a
                      href={selectedLinks.uploadUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        ...styles.primaryLinkButton,
                        ...responsive.actionButton,
                      }}
                    >
                      <ExternalLink size={16} />
                      Abrir upload
                    </a>

                    <Link
                      to={`/evento/${selectedEvent.slug}/configuracoes`}
                      style={{
                        ...styles.secondaryLinkButton,
                        ...responsive.actionButton,
                      }}
                    >
                      <Settings size={16} />
                      Configurações
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      </main>
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

function LinkBox({ icon, title, url, onCopy, copied, isMobile }) {
  return (
    <div style={styles.linkBox}>
      <div style={styles.linkBoxTitle}>
        <span style={styles.linkIcon}>{icon}</span>
        <strong>{title}</strong>
      </div>

      <div style={styles.linkUrl}>{url || "—"}</div>

      <div style={styles.linkActions}>
        <button
          type="button"
          onClick={onCopy}
          style={{
            ...styles.secondaryButton,
            ...(isMobile ? styles.mobileActionButton : {}),
          }}
        >
          <Copy size={16} />
          {copied ? "Copiado!" : "Copiar"}
        </button>

        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          style={{
            ...styles.secondaryLinkButton,
            ...(isMobile ? styles.mobileActionButton : {}),
          }}
        >
          <ExternalLink size={16} />
          Abrir
        </a>
      </div>
    </div>
  );
}

function getResponsiveStyles(screenWidth) {
  const isMobile = screenWidth <= MOBILE_BREAKPOINT;
  const isTablet = screenWidth > MOBILE_BREAKPOINT && screenWidth <= TABLET_BREAKPOINT;

  if (isMobile) {
    return {
      header: {
        padding: "14px 16px",
        alignItems: "stretch",
      },
      headerLeft: {
        width: "100%",
      },
      headerRight: {
        width: "100%",
        justifyContent: "stretch",
      },
      partnerBadge: {
        width: "100%",
      },
      main: {
        padding: "16px",
      },
      heroCard: {
        padding: "20px",
        borderRadius: "24px",
      },
      heroTitle: {
        fontSize: "26px",
      },
      heroSubtitle: {
        fontSize: "14px",
      },
      statsGrid: {
        gridTemplateColumns: "1fr",
      },
      statValue: {
        fontSize: "24px",
      },
      contentGrid: {
        gridTemplateColumns: "1fr",
      },
      panelTitle: {
        fontSize: "21px",
      },
      eventTopRow: {
        flexDirection: "column",
        alignItems: "flex-start",
      },
      qrPreview: {
        minHeight: "220px",
      },
      actionButton: {
        width: "100%",
      },
      fullWidthButtonMaybe: {
        width: "100%",
      },
    };
  }

  if (isTablet) {
    return {
      header: {
        padding: "18px 20px",
      },
      main: {
        padding: "20px",
      },
      heroCard: {
        padding: "24px",
      },
      heroTitle: {
        fontSize: "28px",
      },
      statsGrid: {
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      },
      contentGrid: {
        gridTemplateColumns: "1fr",
      },
      panelTitle: {
        fontSize: "22px",
      },
      qrPreview: {
        minHeight: "240px",
      },
      actionButton: {
        flex: "1 1 220px",
      },
      fullWidthButtonMaybe: {},
    };
  }

  return {
    header: {},
    headerLeft: {},
    headerRight: {},
    partnerBadge: {},
    main: {},
    heroCard: {},
    heroTitle: {},
    heroSubtitle: {},
    statsGrid: {},
    statValue: {},
    contentGrid: {},
    panelTitle: {},
    eventTopRow: {},
    qrPreview: {},
    actionButton: {},
    fullWidthButtonMaybe: {},
  };
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top left, rgba(240,210,170,0.18), transparent 25%), radial-gradient(circle at bottom right, rgba(176,137,104,0.16), transparent 22%), linear-gradient(180deg, #f7f5f2 0%, #f4f0ea 100%)",
    position: "relative",
    overflow: "hidden",
  },
  backgroundGlowTop: {
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
  backgroundGlowBottom: {
    position: "absolute",
    bottom: "-140px",
    right: "-120px",
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
    background: "rgba(247,245,242,0.72)",
    borderBottom: "1px solid rgba(30,36,64,0.08)",
    flexWrap: "wrap",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    minWidth: 0,
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
    flexShrink: 0,
  },
  brandTitle: {
    fontSize: "17px",
    fontWeight: 800,
    color: "#1f2333",
  },
  brandSubtitle: {
    fontSize: "13px",
    color: "#7c8295",
    marginTop: "2px",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  partnerBadge: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "rgba(255,255,255,0.78)",
    border: "1px solid rgba(30,36,64,0.08)",
    borderRadius: "16px",
    padding: "10px 14px",
    color: "#1f2333",
    minWidth: 0,
  },
  partnerBadgeText: {
    display: "grid",
    gap: "2px",
    minWidth: 0,
  },
  partnerName: {
    fontSize: "14px",
  },
  partnerEmail: {
    fontSize: "12px",
    color: "#737a8f",
    wordBreak: "break-word",
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
  alert: {
    marginBottom: "18px",
    background: "#fff4e8",
    color: "#8a5a00",
    border: "1px solid #efd7b5",
    borderRadius: "16px",
    padding: "14px 16px",
    boxShadow: "0 10px 24px rgba(138,90,0,0.06)",
  },
  heroCard: {
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
  kicker: {
    margin: 0,
    color: "#e5c79a",
    fontWeight: 800,
    fontSize: "12px",
    letterSpacing: ".08em",
    textTransform: "uppercase",
  },
  heroTitle: {
    margin: "10px 0 10px",
    fontSize: "32px",
    lineHeight: 1.1,
  },
  heroSubtitle: {
    margin: 0,
    maxWidth: "700px",
    color: "rgba(255,255,255,0.8)",
    fontSize: "15px",
    lineHeight: 1.6,
  },
  heroActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    width: "100%",
    maxWidth: "260px",
  },
  refreshButton: {
    minHeight: "46px",
    width: "100%",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: "14px",
    background: "rgba(255,255,255,0.12)",
    color: "#fff",
    padding: "12px 18px",
    cursor: "pointer",
    fontWeight: 700,
    backdropFilter: "blur(8px)",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "16px",
    marginBottom: "22px",
  },
  statCard: {
    background: "rgba(255,255,255,0.8)",
    border: "1px solid rgba(30,36,64,0.08)",
    borderRadius: "24px",
    padding: "20px",
    boxShadow: "0 14px 34px rgba(24,32,79,0.06)",
    display: "flex",
    alignItems: "center",
    gap: "14px",
    minWidth: 0,
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
  contentGrid: {
    display: "grid",
    gridTemplateColumns: "1.05fr 0.95fr",
    gap: "20px",
    alignItems: "start",
  },
  leftColumn: {
    display: "grid",
    gap: "20px",
    minWidth: 0,
  },
  rightColumn: {
    display: "grid",
    gap: "20px",
    minWidth: 0,
  },
  panelCard: {
    background: "rgba(255,255,255,0.78)",
    backdropFilter: "blur(14px)",
    border: "1px solid rgba(30,36,64,0.08)",
    borderRadius: "28px",
    padding: "22px",
    boxShadow: "0 14px 36px rgba(24,32,79,0.06)",
    minWidth: 0,
  },
  panelHeader: {
    marginBottom: "16px",
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
  eventItemContent: {
    display: "grid",
    gap: "8px",
  },
  eventTopRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap",
  },
  eventName: {
    color: "#1f2333",
    fontSize: "16px",
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
  eventDescription: {
    fontSize: "14px",
    color: "#5f667b",
    lineHeight: 1.5,
  },
  infoBox: {
    background: "#f8f6f2",
    border: "1px solid #eee9e1",
    borderRadius: "16px",
    padding: "12px 14px",
    marginBottom: "10px",
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
  linkBox: {
    background: "#f8f6f2",
    border: "1px solid #eee9e1",
    borderRadius: "18px",
    padding: "14px",
    marginBottom: "12px",
  },
  linkBoxTitle: {
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
  mobileActionButton: {
    width: "100%",
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
  qrActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "10px",
  },
};