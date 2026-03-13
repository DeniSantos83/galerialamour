import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

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

  const baseUrl = window.location.origin;

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

    // ajuste esta rota se sua galeria privada usar outro caminho
    const privateGalleryUrl = `${baseUrl}/evento/${event.slug}/galeria`;

    // escolha qual link o QR deve abrir
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
      <div style={styles.container}>
        <div style={styles.topBar}>
          <Link to="/meus-eventos" style={styles.backLink}>
            ← Voltar para meus eventos
          </Link>

          {partner && (
            <div style={styles.partnerChip}>
              <span style={styles.partnerChipLabel}>Parceiro</span>
              <strong>{partner.name}</strong>
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
                backgroundImage: event.cover_url
                  ? `linear-gradient(rgba(35,40,58,.25), rgba(35,40,58,.35)), url(${event.cover_url})`
                  : "linear-gradient(135deg, #9e8f90 0%, #ead6d6 100%)",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div style={styles.heroBadge}>
                {event.is_upload_open ? "Evento ativo" : "Upload fechado"}
              </div>

              <div style={styles.heroTopRight}>
                <span style={styles.heroMiniTag}>Acesso parceiro</span>
              </div>

              <h1 style={styles.heroTitle}>{event.name}</h1>

              <p style={styles.heroDescription}>
                {event.description || "Sem descrição cadastrada para este evento."}
              </p>
            </div>

            <div style={styles.bodyGrid}>
              <div style={styles.leftColumn}>
                <div style={styles.sectionTitle}>Resumo do evento</div>

                <div style={styles.infoGrid}>
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
                />

                <LinkCard
                  title="Galeria privada"
                  url={urls.privateGalleryUrl}
                  copyLabel={
                    copiedKey === "private" ? "Copiado!" : "Copiar galeria privada"
                  }
                  onCopy={() => copyText(urls.privateGalleryUrl, "private")}
                  openLabel="Ver galeria"
                />

                <LinkCard
                  title="Galeria pública"
                  url={urls.publicGalleryUrl}
                  copyLabel={
                    copiedKey === "public" ? "Copiado!" : "Copiar galeria pública"
                  }
                  onCopy={() => copyText(urls.publicGalleryUrl, "public")}
                  openLabel="Abrir pública"
                />
              </div>

              <div style={styles.rightColumn}>
                <div style={styles.qrCard}>
                  <div style={styles.qrTitle}>QR Code do evento</div>

                  <div style={styles.qrImageWrap}>
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
                    style={styles.darkButton}
                    onClick={() => copyText(urls.qrTargetUrl, "qr")}
                    disabled={!urls.qrTargetUrl}
                  >
                    {copiedKey === "qr" ? "Copiado!" : "Copiar link do QR"}
                  </button>

                  <button
                    type="button"
                    style={styles.lightButton}
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

function LinkCard({ title, url, copyLabel, onCopy, openLabel }) {
  return (
    <div style={styles.linkCard}>
      <div style={styles.linkCardTitle}>{title}</div>
      <div style={styles.linkUrl}>{url || "Link não disponível."}</div>

      <div style={styles.linkActions}>
        <button
          type="button"
          style={styles.darkButtonSmall}
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
  },
  partnerChip: {
    background: "#fff",
    border: "1px solid #e7e9f2",
    borderRadius: "14px",
    padding: "10px 14px",
    boxShadow: "0 10px 25px rgba(24, 32, 79, 0.06)",
  },
  partnerChipLabel: {
    display: "block",
    fontSize: "11px",
    color: "#8a90a3",
    marginBottom: "4px",
  },
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
    position: "absolute",
    right: "20px",
    top: "20px",
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
  },
  heroDescription: {
    margin: 0,
    maxWidth: "760px",
    fontSize: "15px",
    lineHeight: 1.5,
    color: "rgba(255,255,255,0.96)",
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
  },
  darkButtonSmall: {
    minHeight: "40px",
    padding: "0 14px",
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
    padding: "0 14px",
    border: "1px solid #dbe0ea",
    borderRadius: "12px",
    background: "#fff",
    color: "#6b7390",
    fontWeight: 700,
    textDecoration: "none",
  },
};