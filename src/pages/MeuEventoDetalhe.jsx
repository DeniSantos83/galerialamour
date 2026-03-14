import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

<<<<<<< HEAD
const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

=======
>>>>>>> 1fdfefb1840d0121480be2b3d1e43ee401c6062e
export default function MeuEventoDetalhe() {
  const { slug } = useParams();

  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState(null);
  const [partner, setPartner] = useState(null);
  const [event, setEvent] = useState(null);
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState("");
  const [copiedKey, setCopiedKey] = useState("");
<<<<<<< HEAD
  const [screenWidth, setScreenWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1440
  );

  useEffect(() => {
    function handleResize() {
      setScreenWidth(window.innerWidth);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
=======
>>>>>>> 1fdfefb1840d0121480be2b3d1e43ee401c6062e

  useEffect(() => {
    const loadEvent = async () => {
      try {
        setLoading(true);
        setError("");

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;

        if (!user) {
          setAuthChecked(true);
          setLoading(false);
          return;
        }

        setUser(user);
        setAuthChecked(true);

        const { data: partnerData, error: partnerError } = await supabase
<<<<<<< HEAD
          .from("partners")
          .select("*")
          .eq("profile_id", user.id)
          .maybeSingle();

        if (partnerError) throw partnerError;

        if (!partnerData) {
          setPartner(null);
          setEvent(null);
          setSettings(null);
          setLoading(false);
          return;
=======
             .from("partners")
             .select("*")
             .eq("profile_id", user.id)
             .maybeSingle();

            if (partnerError) throw partnerError;

            if (!partnerData) {
                setPartner(null);
                setEvent(null);
                setSettings(null);
                setLoading(false);
            return;
>>>>>>> 1fdfefb1840d0121480be2b3d1e43ee401c6062e
        }

        setPartner(partnerData);

        const { data: eventData, error: eventError } = await supabase
          .from("events")
          .select("*")
          .eq("slug", slug)
          .eq("partner_id", partnerData.id)
          .maybeSingle();

        if (eventError) throw eventError;

        if (!eventData) {
          setEvent(null);
          setSettings(null);
          setLoading(false);
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
        setError(err.message || "Erro ao carregar o evento.");
      } finally {
        setLoading(false);
      }
    };

    loadEvent();
  }, [slug]);

<<<<<<< HEAD
  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "";

  const isMobile = screenWidth <= MOBILE_BREAKPOINT;
  const isTablet = screenWidth > MOBILE_BREAKPOINT && screenWidth <= TABLET_BREAKPOINT;

  const responsive = useMemo(
    () => getResponsiveStyles(screenWidth),
    [screenWidth]
  );
=======
  const baseUrl = window.location.origin;
>>>>>>> 1fdfefb1840d0121480be2b3d1e43ee401c6062e

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
<<<<<<< HEAD
    const privateGalleryUrl = `${baseUrl}/evento/${event.slug}/galeria`;
=======

    // ajuste esta rota se sua galeria privada usar outro caminho
    const privateGalleryUrl = `${baseUrl}/evento/${event.slug}/galeria`;

    // escolha qual link o QR deve abrir
>>>>>>> 1fdfefb1840d0121480be2b3d1e43ee401c6062e
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

  const copyText = async (text, key) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(""), 1800);
    } catch (err) {
      console.error("Erro ao copiar:", err);
    }
  };

  const downloadQrCode = async () => {
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
  };

  const formatDate = (date) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("pt-BR");
  };

  if (authChecked && !user && !loading) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div style={styles.page}>
<<<<<<< HEAD
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
            to="/meus-eventos"
            style={{
              ...styles.backLink,
              ...responsive.backLink,
            }}
          >
=======
      <div style={styles.container}>
        <div style={styles.topBar}>
          <Link to="/meus-eventos" style={styles.backLink}>
>>>>>>> 1fdfefb1840d0121480be2b3d1e43ee401c6062e
            ← Voltar para meus eventos
          </Link>

          {partner && (
<<<<<<< HEAD
            <div
              style={{
                ...styles.partnerChip,
                ...responsive.partnerChip,
              }}
            >
              <span style={styles.partnerChipLabel}>Parceiro</span>
              <strong style={styles.partnerChipName}>{partner.name}</strong>
=======
            <div style={styles.partnerChip}>
              <span style={styles.partnerChipLabel}>Parceiro</span>
              <strong>{partner.name}</strong>
>>>>>>> 1fdfefb1840d0121480be2b3d1e43ee401c6062e
            </div>
          )}
        </div>

        {loading && (
          <div style={styles.stateBox}>
            <p>Carregando evento...</p>
          </div>
        )}

        {!loading && error && (
          <div style={styles.stateBoxError}>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && !partner && (
          <div style={styles.stateBox}>
            <p>Nenhum parceiro vinculado foi encontrado para este login.</p>
          </div>
        )}

        {!loading && !error && partner && !event && (
          <div style={styles.stateBox}>
            <p>Evento não encontrado ou sem permissão de acesso.</p>
          </div>
        )}

        {!loading && !error && event && (
          <div style={styles.contentCard}>
            <div
              style={{
                ...styles.hero,
<<<<<<< HEAD
                ...responsive.hero,
=======
>>>>>>> 1fdfefb1840d0121480be2b3d1e43ee401c6062e
                backgroundImage: event.cover_url
                  ? `linear-gradient(rgba(35,40,58,.25), rgba(35,40,58,.35)), url(${event.cover_url})`
                  : "linear-gradient(135deg, #9e8f90 0%, #ead6d6 100%)",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
<<<<<<< HEAD
              <div
                style={{
                  ...styles.heroTopRow,
                  ...responsive.heroTopRow,
                }}
              >
                <div style={styles.heroBadge}>
                  {event.is_upload_open ? "Evento ativo" : "Upload fechado"}
                </div>

                <div style={styles.heroTopRight}>
                  <span style={styles.heroMiniTag}>Acesso parceiro</span>
                </div>
              </div>

              <h1
                style={{
                  ...styles.heroTitle,
                  ...responsive.heroTitle,
                }}
              >
                {event.name}
              </h1>

              <p
                style={{
                  ...styles.heroDescription,
                  ...responsive.heroDescription,
                }}
              >
=======
              <div style={styles.heroBadge}>
                {event.is_upload_open ? "Evento ativo" : "Upload fechado"}
              </div>

              <div style={styles.heroTopRight}>
                <span style={styles.heroMiniTag}>Acesso parceiro</span>
              </div>

              <h1 style={styles.heroTitle}>{event.name}</h1>

              <p style={styles.heroDescription}>
>>>>>>> 1fdfefb1840d0121480be2b3d1e43ee401c6062e
                {event.description || "Sem descrição cadastrada para este evento."}
              </p>
            </div>

<<<<<<< HEAD
            <div
              style={{
                ...styles.bodyGrid,
                ...responsive.bodyGrid,
              }}
            >
              <div style={styles.leftColumn}>
                <div style={styles.sectionTitle}>Resumo do evento</div>

                <div
                  style={{
                    ...styles.infoGrid,
                    ...responsive.infoGrid,
                  }}
                >
=======
            <div style={styles.bodyGrid}>
              <div style={styles.leftColumn}>
                <div style={styles.sectionTitle}>Resumo do evento</div>

                <div style={styles.infoGrid}>
>>>>>>> 1fdfefb1840d0121480be2b3d1e43ee401c6062e
                  <InfoBox label="Slug" value={event.slug} />
                  <InfoBox label="Acesso" value="parceiro" />
                  <InfoBox label="Data do evento" value={formatDate(event.event_date)} />
                  <InfoBox
                    label="Upload"
                    value={event.is_upload_open ? "aberto" : "fechado"}
                  />
                  <InfoBox
                    label="Modo da galeria"
                    value={settings?.gallery_mode || "—"}
                  />
                  <InfoBox
                    label="Vídeos"
                    value={settings?.allow_videos ? "permitidos" : "não"}
                  />
                </div>

                <LinkCard
                  title="Link público de upload"
                  url={urls.uploadUrl}
                  copyLabel={copiedKey === "upload" ? "Copiado!" : "Copiar link"}
                  onCopy={() => copyText(urls.uploadUrl, "upload")}
                  openLabel="Abrir página"
<<<<<<< HEAD
                  isMobile={isMobile}
=======
>>>>>>> 1fdfefb1840d0121480be2b3d1e43ee401c6062e
                />

                <LinkCard
                  title="Galeria privada"
                  url={urls.privateGalleryUrl}
                  copyLabel={
                    copiedKey === "private" ? "Copiado!" : "Copiar galeria privada"
                  }
                  onCopy={() => copyText(urls.privateGalleryUrl, "private")}
                  openLabel="Ver galeria"
<<<<<<< HEAD
                  isMobile={isMobile}
=======
>>>>>>> 1fdfefb1840d0121480be2b3d1e43ee401c6062e
                />

                <LinkCard
                  title="Galeria pública"
                  url={urls.publicGalleryUrl}
                  copyLabel={
                    copiedKey === "public" ? "Copiado!" : "Copiar galeria pública"
                  }
                  onCopy={() => copyText(urls.publicGalleryUrl, "public")}
                  openLabel="Abrir pública"
<<<<<<< HEAD
                  isMobile={isMobile}
=======
>>>>>>> 1fdfefb1840d0121480be2b3d1e43ee401c6062e
                />
              </div>

              <div style={styles.rightColumn}>
                <div style={styles.qrCard}>
                  <div style={styles.qrTitle}>QR Code do evento</div>

<<<<<<< HEAD
                  <div
                    style={{
                      ...styles.qrImageWrap,
                      ...responsive.qrImageWrap,
                    }}
                  >
=======
                  <div style={styles.qrImageWrap}>
>>>>>>> 1fdfefb1840d0121480be2b3d1e43ee401c6062e
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
                    levar os convidados direto para o evento.
                  </p>

                  <button
                    type="button"
<<<<<<< HEAD
                    style={{
                      ...styles.darkButton,
                      ...responsive.fullWidthAction,
                    }}
=======
                    style={styles.darkButton}
>>>>>>> 1fdfefb1840d0121480be2b3d1e43ee401c6062e
                    onClick={() => copyText(urls.qrTargetUrl, "qr")}
                    disabled={!urls.qrTargetUrl}
                  >
                    {copiedKey === "qr" ? "Copiado!" : "Copiar link do QR"}
                  </button>

                  <button
                    type="button"
<<<<<<< HEAD
                    style={{
                      ...styles.lightButton,
                      ...responsive.fullWidthAction,
                    }}
=======
                    style={styles.lightButton}
>>>>>>> 1fdfefb1840d0121480be2b3d1e43ee401c6062e
                    onClick={downloadQrCode}
                    disabled={!urls.qrCodeUrl}
                  >
                    Baixar QR Code
                  </button>
                </div>
              </div>
            </div>
          </div>
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

<<<<<<< HEAD
function LinkCard({ title, url, copyLabel, onCopy, openLabel, isMobile }) {
=======
function LinkCard({ title, url, copyLabel, onCopy, openLabel }) {
>>>>>>> 1fdfefb1840d0121480be2b3d1e43ee401c6062e
  return (
    <div style={styles.linkCard}>
      <div style={styles.linkCardTitle}>{title}</div>
      <div style={styles.linkUrl}>{url || "Link não disponível."}</div>

      <div style={styles.linkActions}>
        <button
          type="button"
<<<<<<< HEAD
          style={{
            ...styles.darkButtonSmall,
            ...(isMobile ? styles.mobileActionButton : {}),
          }}
=======
          style={styles.darkButtonSmall}
>>>>>>> 1fdfefb1840d0121480be2b3d1e43ee401c6062e
          onClick={onCopy}
          disabled={!url}
        >
          {copyLabel}
        </button>

        <a
          href={url || "#"}
          target="_blank"
          rel="noreferrer"
          style={{
            ...styles.lightButtonSmall,
<<<<<<< HEAD
            ...(isMobile ? styles.mobileActionButton : {}),
=======
>>>>>>> 1fdfefb1840d0121480be2b3d1e43ee401c6062e
            pointerEvents: url ? "auto" : "none",
            opacity: url ? 1 : 0.55,
          }}
        >
          {openLabel}
        </a>
      </div>
    </div>
  );
}

<<<<<<< HEAD
function getResponsiveStyles(screenWidth) {
  const isMobile = screenWidth <= MOBILE_BREAKPOINT;
  const isTablet = screenWidth > MOBILE_BREAKPOINT && screenWidth <= TABLET_BREAKPOINT;

  if (isMobile) {
    return {
      container: {
        maxWidth: "100%",
      },
      topBar: {
        alignItems: "stretch",
      },
      backLink: {
        width: "100%",
      },
      partnerChip: {
        width: "100%",
      },
      hero: {
        padding: "20px 16px 18px",
      },
      heroTopRow: {
        flexDirection: "column",
        alignItems: "flex-start",
      },
      heroTitle: {
        fontSize: "28px",
      },
      heroDescription: {
        fontSize: "14px",
      },
      bodyGrid: {
        gridTemplateColumns: "1fr",
        padding: "16px",
        gap: "16px",
      },
      infoGrid: {
        gridTemplateColumns: "1fr",
      },
      qrImageWrap: {
        maxWidth: "220px",
      },
      fullWidthAction: {
        width: "100%",
      },
    };
  }

  if (isTablet) {
    return {
      container: {
        maxWidth: "100%",
      },
      hero: {
        padding: "24px 20px 22px",
      },
      heroTitle: {
        fontSize: "32px",
      },
      bodyGrid: {
        gridTemplateColumns: "1fr",
        padding: "20px",
      },
      infoGrid: {
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      },
      qrImageWrap: {
        maxWidth: "240px",
      },
      fullWidthAction: {
        width: "100%",
      },
    };
  }

  return {
    container: {},
    topBar: {},
    backLink: {},
    partnerChip: {},
    hero: {},
    heroTopRow: {},
    heroTitle: {},
    heroDescription: {},
    bodyGrid: {},
    infoGrid: {},
    qrImageWrap: {},
    fullWidthAction: {},
  };
}

=======
>>>>>>> 1fdfefb1840d0121480be2b3d1e43ee401c6062e
const styles = {
  page: {
    minHeight: "100vh",
    background: "#f4f5f9",
    padding: "32px 14px",
  },
  container: {
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    marginBottom: "18px",
  },
  backLink: {
    textDecoration: "none",
    color: "#29314d",
    fontWeight: 700,
    fontSize: "14px",
<<<<<<< HEAD
    wordBreak: "break-word",
=======
>>>>>>> 1fdfefb1840d0121480be2b3d1e43ee401c6062e
  },
  partnerChip: {
    background: "#fff",
    border: "1px solid #e7e9f2",
    borderRadius: "14px",
    padding: "10px 14px",
    boxShadow: "0 10px 25px rgba(24, 32, 79, 0.06)",
<<<<<<< HEAD
    minWidth: 0,
=======
>>>>>>> 1fdfefb1840d0121480be2b3d1e43ee401c6062e
  },
  partnerChipLabel: {
    display: "block",
    fontSize: "11px",
    color: "#8a90a3",
    marginBottom: "4px",
  },
<<<<<<< HEAD
  partnerChipName: {
    wordBreak: "break-word",
  },
=======
>>>>>>> 1fdfefb1840d0121480be2b3d1e43ee401c6062e
  stateBox: {
    background: "#fff",
    border: "1px solid #e9ebf3",
    borderRadius: "20px",
    padding: "24px",
    color: "#2f3445",
  },
  stateBoxError: {
    background: "#fff1f1",
    border: "1px solid #ffd6d6",
    borderRadius: "20px",
    padding: "24px",
    color: "#9b2e2e",
  },
  contentCard: {
    background: "#fcfcfe",
    borderRadius: "28px",
    border: "1px solid #e8eaf3",
    overflow: "hidden",
    boxShadow: "0 18px 38px rgba(24, 32, 79, 0.08)",
  },
  hero: {
    position: "relative",
    padding: "28px 24px 24px",
    color: "#fff",
  },
<<<<<<< HEAD
  heroTopRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    flexWrap: "wrap",
  },
=======
>>>>>>> 1fdfefb1840d0121480be2b3d1e43ee401c6062e
  heroBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "28px",
    padding: "0 12px",
    borderRadius: "999px",
    background: "rgba(28, 32, 56, 0.55)",
    fontSize: "12px",
    fontWeight: 700,
  },
  heroTopRight: {
<<<<<<< HEAD
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
=======
    position: "absolute",
    right: "20px",
    top: "20px",
>>>>>>> 1fdfefb1840d0121480be2b3d1e43ee401c6062e
  },
  heroMiniTag: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: "30px",
    padding: "0 12px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.28)",
    fontSize: "12px",
    fontWeight: 700,
  },
  heroTitle: {
    margin: "18px 0 10px",
    fontSize: "36px",
    lineHeight: 1.1,
    color: "#fff",
<<<<<<< HEAD
    wordBreak: "break-word",
=======
>>>>>>> 1fdfefb1840d0121480be2b3d1e43ee401c6062e
  },
  heroDescription: {
    margin: 0,
    maxWidth: "760px",
    fontSize: "15px",
    lineHeight: 1.5,
    color: "rgba(255,255,255,0.96)",
<<<<<<< HEAD
    wordBreak: "break-word",
=======
>>>>>>> 1fdfefb1840d0121480be2b3d1e43ee401c6062e
  },
  bodyGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 2fr) minmax(290px, 360px)",
    gap: "22px",
    padding: "22px",
  },
  leftColumn: {
    minWidth: 0,
  },
  rightColumn: {
    minWidth: 0,
  },
  sectionTitle: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#b68628",
    marginBottom: "14px",
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: "12px",
    marginBottom: "16px",
  },
  infoBox: {
    background: "#f5f6fb",
    border: "1px solid #e6e9f3",
    borderRadius: "14px",
    padding: "14px",
<<<<<<< HEAD
    minWidth: 0,
=======
>>>>>>> 1fdfefb1840d0121480be2b3d1e43ee401c6062e
  },
  infoLabel: {
    display: "block",
    fontSize: "11px",
    color: "#8e94a6",
    marginBottom: "5px",
    textTransform: "uppercase",
    letterSpacing: ".04em",
  },
  infoValue: {
    color: "#23283a",
    fontSize: "14px",
    wordBreak: "break-word",
  },
  linkCard: {
    background: "#f8f9fd",
    border: "1px solid #e6e9f3",
    borderRadius: "18px",
    padding: "16px",
    marginBottom: "14px",
<<<<<<< HEAD
    minWidth: 0,
=======
>>>>>>> 1fdfefb1840d0121480be2b3d1e43ee401c6062e
  },
  linkCardTitle: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#b68628",
    marginBottom: "10px",
  },
  linkUrl: {
    fontSize: "13px",
    color: "#48506a",
    background: "#fff",
    border: "1px solid #e7eaf2",
    borderRadius: "12px",
    padding: "10px 12px",
    wordBreak: "break-word",
    marginBottom: "12px",
  },
  linkActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  qrCard: {
    background: "#f8f9fd",
    border: "1px solid #e6e9f3",
    borderRadius: "22px",
    padding: "18px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    height: "100%",
  },
  qrTitle: {
    alignSelf: "stretch",
    fontSize: "14px",
    fontWeight: 700,
    color: "#b68628",
    marginBottom: "14px",
    textAlign: "center",
    background: "#f0e4a8",
    borderRadius: "999px",
    padding: "10px 12px",
  },
  qrImageWrap: {
    width: "100%",
    maxWidth: "200px",
    aspectRatio: "1 / 1",
    background: "#fff",
    borderRadius: "18px",
    border: "1px solid #e4e8f1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "12px",
    marginBottom: "14px",
  },
  qrImage: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    borderRadius: "10px",
  },
  qrPlaceholder: {
    color: "#8d92a3",
    fontSize: "14px",
<<<<<<< HEAD
    textAlign: "center",
=======
>>>>>>> 1fdfefb1840d0121480be2b3d1e43ee401c6062e
  },
  qrText: {
    margin: "0 0 16px",
    textAlign: "center",
    color: "#5f667d",
    fontSize: "13px",
    lineHeight: 1.5,
  },
  darkButton: {
    width: "100%",
    minHeight: "44px",
    border: "none",
    borderRadius: "12px",
    background: "#1e2440",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
    marginBottom: "10px",
<<<<<<< HEAD
    padding: "10px 14px",
=======
>>>>>>> 1fdfefb1840d0121480be2b3d1e43ee401c6062e
  },
  lightButton: {
    width: "100%",
    minHeight: "44px",
    border: "1px solid #dbe0ea",
    borderRadius: "12px",
    background: "#fff",
    color: "#6b7390",
    fontWeight: 700,
    cursor: "pointer",
<<<<<<< HEAD
    padding: "10px 14px",
  },
  darkButtonSmall: {
    minHeight: "40px",
    padding: "10px 14px",
=======
  },
  darkButtonSmall: {
    minHeight: "40px",
    padding: "0 14px",
>>>>>>> 1fdfefb1840d0121480be2b3d1e43ee401c6062e
    border: "none",
    borderRadius: "12px",
    background: "#1e2440",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },
  lightButtonSmall: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "40px",
<<<<<<< HEAD
    padding: "10px 14px",
=======
    padding: "0 14px",
>>>>>>> 1fdfefb1840d0121480be2b3d1e43ee401c6062e
    border: "1px solid #dbe0ea",
    borderRadius: "12px",
    background: "#fff",
    color: "#6b7390",
    fontWeight: 700,
    textDecoration: "none",
  },
<<<<<<< HEAD
  mobileActionButton: {
    width: "100%",
  },
=======
>>>>>>> 1fdfefb1840d0121480be2b3d1e43ee401c6062e
};