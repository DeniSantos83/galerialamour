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
  Settings,
  Sparkles,
  UserCircle2,
} from "lucide-react";
import { supabase } from "../lib/supabase";

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1080;

export default function MeuEventoDetalhe() {
  const { slug } = useParams();

  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [partner, setPartner] = useState(null);
  const [event, setEvent] = useState(null);
  const [settings, setSettings] = useState(null);

  const [error, setError] = useState("");
  const [copiedKey, setCopiedKey] = useState("");
  const [screenWidth, setScreenWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1440
  );

  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "";

  const isMobile = screenWidth <= MOBILE_BREAKPOINT;

  const responsive = useMemo(
    () => getResponsiveStyles(screenWidth),
    [screenWidth]
  );

  useEffect(() => {
    function handleResize() {
      setScreenWidth(window.innerWidth);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
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
      } catch (err) {
        console.error("Erro ao carregar detalhe do evento:", err);
        setError(err?.message || "Erro ao carregar o evento.");
      } finally {
        setLoading(false);
      }
    }

    loadEvent();
  }, [slug]);

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
                    <InfoBox
                      label="Data do evento"
                      value={formatDate(event.event_date)}
                    />
                    <InfoBox
                      label="Upload"
                      value={event.is_upload_open ? "Aberto" : "Fechado"}
                    />
                    <InfoBox
                      label="Modo da galeria"
                      value={
                        settings?.gallery_mode === "public" ? "Pública" : "Privada"
                      }
                    />
                    <InfoBox
                      label="Vídeos"
                      value={settings?.allow_videos ? "Permitidos" : "Bloqueados"}
                    />
                    <InfoBox
                      label="Nome do convidado"
                      value={
                        settings?.require_guest_name ? "Obrigatório" : "Opcional"
                      }
                    />
                  </div>
                </div>

                <div style={styles.panelCard}>
                  <div style={styles.panelHeader}>
                    <p style={styles.kicker}>Links</p>
                    <h2 style={styles.panelTitle}>Acessos rápidos do evento</h2>
                  </div>

                  <div style={styles.linkCardsWrap}>
                    <LinkCard
                      title="Link público de upload"
                      icon={<Link2 size={16} />}
                      url={urls.uploadUrl}
                      copyLabel={copiedKey === "upload" ? "Copiado!" : "Copiar link"}
                      onCopy={() => copyText(urls.uploadUrl, "upload")}
                      openLabel="Abrir página"
                      isMobile={isMobile}
                    />

                    <LinkCard
                      title="Galeria privada"
                      icon={<ImageIcon size={16} />}
                      url={urls.privateGalleryUrl}
                      copyLabel={
                        copiedKey === "private"
                          ? "Copiado!"
                          : "Copiar galeria privada"
                      }
                      onCopy={() => copyText(urls.privateGalleryUrl, "private")}
                      openLabel="Ver galeria"
                      isMobile={isMobile}
                    />

                    <LinkCard
                      title="Galeria pública"
                      icon={<Globe size={16} />}
                      url={urls.publicGalleryUrl}
                      copyLabel={
                        copiedKey === "public"
                          ? "Copiado!"
                          : "Copiar galeria pública"
                      }
                      onCopy={() => copyText(urls.publicGalleryUrl, "public")}
                      openLabel="Abrir pública"
                      isMobile={isMobile}
                    />
                  </div>
                </div>
              </div>

              <div style={styles.rightColumn}>
                <div style={styles.qrCard}>
                  <div style={styles.qrTitle}>QR Code do evento</div>

                  <div
                    style={{
                      ...styles.qrImageWrap,
                      ...responsive.qrImageWrap,
                    }}
                  >
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
                          <Instagram size={15} />
                          Instagram
                        </a>
                      ) : null}

                      {partner.whatsapp || partner.phone ? (
                        <a
                          href={normalizeWhatsapp(
                            partner.whatsapp || partner.phone
                          )}
                          target="_blank"
                          rel="noreferrer"
                          style={styles.partnerActionButton}
                        >
                          <MessageCircle size={15} />
                          WhatsApp
                        </a>
                      ) : null}
                    </div>
                  </div>
                ) : null}
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

function LinkCard({
  title,
  icon,
  url,
  copyLabel,
  onCopy,
  openLabel,
  isMobile,
}) {
  return (
    <div style={styles.linkCard}>
      <div style={styles.linkCardTitle}>
        <span style={styles.linkIcon}>{icon}</span>
        <strong>{title}</strong>
      </div>

      <div style={styles.linkUrl}>{url || "—"}</div>

      <div
        style={{
          ...styles.linkActions,
          ...(isMobile ? styles.linkActionsMobile : {}),
        }}
      >
        <button type="button" onClick={onCopy} style={styles.lightButton}>
          {copyLabel}
        </button>

        <a
          href={url || "#"}
          target="_blank"
          rel="noreferrer"
          style={styles.secondaryLinkButton}
        >
          <ExternalLink size={16} />
          {openLabel}
        </a>
      </div>
    </div>
  );
}

function getResponsiveStyles(screenWidth) {
  const isMobile = screenWidth <= MOBILE_BREAKPOINT;
  const isTablet =
    screenWidth > MOBILE_BREAKPOINT && screenWidth <= TABLET_BREAKPOINT;

  if (isMobile) {
    return {
      container: {
        padding: "16px",
      },
      topBar: {
        flexDirection: "column",
        alignItems: "stretch",
      },
      backLink: {
        width: "100%",
        justifyContent: "center",
      },
      partnerChip: {
        width: "100%",
        justifyContent: "space-between",
      },
      hero: {
        padding: "22px",
        borderRadius: "24px",
      },
      heroTop: {
        flexDirection: "column",
        alignItems: "flex-start",
      },
      heroTitle: {
        fontSize: "28px",
      },
      heroDescription: {
        fontSize: "14px",
      },
      contentGrid: {
        gridTemplateColumns: "1fr",
      },
      infoGrid: {
        gridTemplateColumns: "1fr",
      },
      qrImageWrap: {
        minHeight: "220px",
      },
      fullWidthAction: {
        width: "100%",
      },
    };
  }

  if (isTablet) {
    return {
      container: {
        padding: "20px",
      },
      contentGrid: {
        gridTemplateColumns: "1fr",
      },
      infoGrid: {
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      },
      heroTitle: {
        fontSize: "34px",
      },
      fullWidthAction: {},
    };
  }

  return {
    container: {},
    topBar: {},
    backLink: {},
    partnerChip: {},
    hero: {},
    heroTop: {},
    heroTitle: {},
    heroDescription: {},
    contentGrid: {},
    infoGrid: {},
    qrImageWrap: {},
    fullWidthAction: {},
  };
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
  container: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "28px",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "14px",
    marginBottom: "18px",
  },
  backLink: {
    minHeight: "44px",
    padding: "10px 16px",
    borderRadius: "14px",
    background: "rgba(255,255,255,0.82)",
    border: "1px solid rgba(30,36,64,0.08)",
    color: "#1f2333",
    textDecoration: "none",
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    boxShadow: "0 10px 24px rgba(24,32,79,0.06)",
  },
  partnerChip: {
    minHeight: "44px",
    padding: "10px 16px",
    borderRadius: "14px",
    background: "rgba(255,255,255,0.82)",
    border: "1px solid rgba(30,36,64,0.08)",
    color: "#1f2333",
    display: "inline-flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
    boxShadow: "0 10px 24px rgba(24,32,79,0.06)",
  },
  partnerChipLabel: {
    fontSize: "12px",
    fontWeight: 800,
    color: "#b08968",
    textTransform: "uppercase",
    letterSpacing: ".08em",
  },
  partnerChipName: {
    fontSize: "14px",
    color: "#1f2333",
  },
  stateBox: {
    background: "rgba(255,255,255,0.84)",
    border: "1px solid rgba(30,36,64,0.08)",
    borderRadius: "24px",
    padding: "24px",
    boxShadow: "0 14px 36px rgba(24,32,79,0.06)",
  },
  stateBoxError: {
    background: "#fff4e8",
    border: "1px solid #efd7b5",
    borderRadius: "24px",
    padding: "24px",
    boxShadow: "0 14px 36px rgba(138,90,0,0.06)",
  },
  stateText: {
    margin: 0,
    color: "#4f566b",
    fontSize: "15px",
    lineHeight: 1.6,
  },
  hero: {
    borderRadius: "30px",
    padding: "30px",
    color: "#fff",
    boxShadow: "0 18px 50px rgba(30,36,64,0.18)",
    marginBottom: "22px",
  },
  heroTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap",
    marginBottom: "18px",
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
  },
  heroPills: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  heroMiniTag: {
    minHeight: "30px",
    padding: "6px 12px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.14)",
    color: "#fff",
    fontWeight: 700,
    fontSize: "12px",
    display: "inline-flex",
    alignItems: "center",
  },
  heroTitle: {
    margin: "0 0 12px",
    fontSize: "40px",
    lineHeight: 1.08,
    maxWidth: "900px",
  },
  heroDescription: {
    margin: 0,
    color: "rgba(255,255,255,0.84)",
    fontSize: "15px",
    lineHeight: 1.7,
    maxWidth: "780px",
  },
  contentGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.2fr) minmax(340px, 0.8fr)",
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
    background: "rgba(255,255,255,0.82)",
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
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "12px",
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
  linkCardsWrap: {
    display: "grid",
    gap: "12px",
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
  linkActionsMobile: {
    flexDirection: "column",
  },
  qrCard: {
    background: "rgba(255,255,255,0.82)",
    backdropFilter: "blur(14px)",
    border: "1px solid rgba(30,36,64,0.08)",
    borderRadius: "28px",
    padding: "22px",
    boxShadow: "0 14px 36px rgba(24,32,79,0.06)",
  },
  qrTitle: {
    fontSize: "24px",
    fontWeight: 800,
    color: "#1f2333",
    marginBottom: "16px",
  },
  qrImageWrap: {
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
    color: "#7a8091",
    fontSize: "14px",
  },
  qrText: {
    margin: "0 0 14px",
    color: "#6f768b",
    fontSize: "14px",
    lineHeight: 1.7,
  },
  qrButtons: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  darkButton: {
    minHeight: "44px",
    border: "none",
    borderRadius: "14px",
    background: "linear-gradient(135deg, #1e2440 0%, #33406b 100%)",
    color: "#fff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    fontWeight: 800,
    padding: "10px 16px",
    cursor: "pointer",
    boxShadow: "0 12px 24px rgba(30,36,64,0.16)",
  },
  lightButton: {
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
  quickActions: {
    display: "grid",
    gap: "12px",
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
    width: "64px",
    height: "64px",
    borderRadius: "50%",
    objectFit: "cover",
    border: "3px solid rgba(255,255,255,0.9)",
    boxShadow: "0 10px 22px rgba(24,32,79,0.12)",
  },
  partnerAvatar: {
    width: "64px",
    height: "64px",
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(135deg, #1e2440 0%, #34406d 100%)",
    color: "#fff",
    boxShadow: "0 10px 22px rgba(24,32,79,0.12)",
  },
  partnerCardTitle: {
    fontSize: "18px",
    fontWeight: 800,
    color: "#1f2333",
    lineHeight: 1.2,
  },
  partnerCardSub: {
    marginTop: "4px",
    fontSize: "13px",
    color: "#6f768b",
  },
  partnerActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  partnerActionButton: {
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
};