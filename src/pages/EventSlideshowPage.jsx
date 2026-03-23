import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import QRCode from "qrcode";
import {
  AlertCircle,
  ChevronLeft,
  Copy,
  Expand,
  Images,
  Loader2,
  MonitorPlay,
  Play,
  QrCode,
  RefreshCw,
  Shrink,
  Sparkles,
} from "lucide-react";
import { supabase } from "../lib/supabase";

const SLIDE_DURATION_MS = 7000;
const REFRESH_INTERVAL_MS = 30000;
const FALLBACK_EVENT_TITLE = "Galeria ao vivo";

function formatEventDate(dateValue) {
  if (!dateValue) return "";
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function normalizeStoragePath(filePath) {
  if (!filePath) return "";

  return String(filePath)
    .replace(/^event-media\//i, "")
    .replace(/^\/+/, "")
    .trim();
}

function resolveImageUrl(item) {
  if (!item) return null;

  if (item.file_url && /^https?:\/\//i.test(item.file_url)) {
    return item.file_url;
  }

  const normalizedPath = normalizeStoragePath(item.file_path);

  if (!normalizedPath) {
    return null;
  }

  const { data } = supabase.storage
    .from("event-media")
    .getPublicUrl(normalizedPath);

  return data?.publicUrl || null;
}

function dedupePhotos(list) {
  const seen = new Set();
  const result = [];

  for (const item of list) {
    const key = item.id || item.file_path || item.display_url;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}

function samePhotoOrder(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i]?.id !== b[i]?.id) return false;
  }
  return true;
}

export default function EventSlideshowPage() {
  const { slug } = useParams();

  const [loading, setLoading] = useState(true);
  const [eventData, setEventData] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [visibleIndex, setVisibleIndex] = useState(0);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(
    typeof document !== "undefined" ? Boolean(document.fullscreenElement) : false
  );
  const [isMutedVisualFx, setIsMutedVisualFx] = useState(false);

  const refreshIntervalRef = useRef(null);
  const slideTimeoutRef = useRef(null);
  const copyTimeoutRef = useRef(null);

  const galleryUrl = useMemo(() => {
    if (!slug || typeof window === "undefined") return "";
    return `${window.location.origin}/galeria/${slug}`;
  }, [slug]);

  const currentPhoto = photos[visibleIndex] || null;
  const nextPhoto =
    photos.length > 1 ? photos[(visibleIndex + 1) % photos.length] : null;

  const eventTitle = eventData?.name || FALLBACK_EVENT_TITLE;
  const coverUrl = eventData?.cover_url || "";
  const logoUrl = eventData?.logo_url || "";
  const eventDateLabel = formatEventDate(eventData?.event_date);

  const loadEventAndPhotos = useCallback(async () => {
    if (!slug) return;

    try {
      if (!eventData) setLoading(true);

      setError("");

      const { data: eventRow, error: eventError } = await supabase
        .from("events")
        .select(`
          id,
          slug,
          name,
          description,
          logo_url,
          cover_url,
          event_date,
          is_upload_open
        `)
        .eq("slug", slug)
        .maybeSingle();

      if (eventError) throw eventError;

      if (!eventRow) {
        setEventData(null);
        setPhotos([]);
        return;
      }

      setEventData(eventRow);

      const { data: uploads, error: uploadsError } = await supabase
        .from("uploads")
        .select(`
          id,
          event_id,
          file_path,
          file_url,
          file_type,
          mime_type,
          status,
          guest_name,
          created_at
        `)
        .eq("event_id", eventRow.id)
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (uploadsError) throw uploadsError;

      const nextPhotos = dedupePhotos(
        (uploads || [])
          .filter((item) => {
            const fileType = String(item.file_type || "").toLowerCase();
            const mimeType = String(item.mime_type || "").toLowerCase();
            return fileType === "image" || mimeType.startsWith("image/");
          })
          .map((item) => ({
            ...item,
            display_url: resolveImageUrl(item),
          }))
          .filter((item) => item.display_url)
      );

      setPhotos((prev) => {
        if (!nextPhotos.length) {
          setVisibleIndex(0);
          return [];
        }

        if (samePhotoOrder(prev, nextPhotos)) {
          return prev;
        }

        const currentId = prev[visibleIndex]?.id;
        const newIndex = nextPhotos.findIndex((item) => item.id === currentId);

        if (newIndex >= 0) {
          setVisibleIndex(newIndex);
        } else {
          setVisibleIndex((current) =>
            current >= nextPhotos.length ? 0 : current
          );
        }

        return nextPhotos;
      });
    } catch (err) {
      console.error("Erro ao carregar modo telão:", err);
      setError(err?.message || "Não foi possível carregar o modo telão.");
    } finally {
      setLoading(false);
    }
  }, [slug, eventData, visibleIndex]);

  useEffect(() => {
    loadEventAndPhotos();
  }, [loadEventAndPhotos]);

  useEffect(() => {
    if (!galleryUrl) return;

    QRCode.toDataURL(galleryUrl, {
      margin: 1,
      width: 180,
    })
      .then((url) => setQrCodeUrl(url))
      .catch(() => setQrCodeUrl(""));
  }, [galleryUrl]);

  useEffect(() => {
    if (photos.length <= 1) return undefined;

    slideTimeoutRef.current = window.setTimeout(() => {
      setVisibleIndex((prev) => {
        const next = (prev + 1) % photos.length;
        return next;
      });
    }, SLIDE_DURATION_MS);

    return () => {
      if (slideTimeoutRef.current) {
        window.clearTimeout(slideTimeoutRef.current);
      }
    };
  }, [visibleIndex, photos.length]);

  useEffect(() => {
    refreshIntervalRef.current = window.setInterval(() => {
      loadEventAndPhotos();
    }, REFRESH_INTERVAL_MS);

    return () => {
      if (refreshIntervalRef.current) {
        window.clearInterval(refreshIntervalRef.current);
      }
    };
  }, [loadEventAndPhotos]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const handlePrevious = useCallback(() => {
    if (!photos.length) return;
    setVisibleIndex((prev) => (prev - 1 + photos.length) % photos.length);
  }, [photos.length]);

  const handleNext = useCallback(() => {
    if (!photos.length) return;
    setVisibleIndex((prev) => (prev + 1) % photos.length);
  }, [photos.length]);

  const handleCopyGalleryLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(galleryUrl);
      setCopied(true);

      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current);
      }

      copyTimeoutRef.current = window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error("Erro ao copiar link:", err);
    }
  }, [galleryUrl]);

  const handleToggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error("Erro ao alternar tela cheia:", err);
    }
  }, []);

  if (!slug) {
    return <Navigate to="/" replace />;
  }

  if (!loading && !eventData) {
    return (
      <div style={styles.page}>
        <div style={styles.notFoundCard}>
          <AlertCircle size={36} />
          <h1 style={styles.notFoundTitle}>Evento não encontrado</h1>
          <p style={styles.notFoundText}>
            Não foi possível localizar o evento solicitado para o modo telão.
          </p>
          <Link to="/" style={styles.backButton}>
            Voltar ao início
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div
        style={{
          ...styles.backgroundLayer,
          backgroundImage: coverUrl ? `url(${coverUrl})` : undefined,
        }}
      />
      <div style={styles.backgroundOverlay} />
      <div style={styles.radialGlowTop} />
      <div style={styles.radialGlowBottom} />

      {!isMutedVisualFx && (
        <>
          <div style={{ ...styles.spark, ...styles.sparkOne }} />
          <div style={{ ...styles.spark, ...styles.sparkTwo }} />
          <div style={{ ...styles.spark, ...styles.sparkThree }} />
          <div style={{ ...styles.spark, ...styles.sparkFour }} />
          <div style={{ ...styles.spark, ...styles.sparkFive }} />
          <div style={{ ...styles.spark, ...styles.sparkSix }} />
        </>
      )}

      <div style={styles.topBar} className="event-slideshow-top-bar">
        <div style={styles.topBarLeft} className="event-slideshow-top-bar-side">
          <Link to={`/galeria/${slug}`} style={styles.iconButton}>
            <ChevronLeft size={18} />
            <span>Galeria</span>
          </Link>

          <button type="button" onClick={handleCopyGalleryLink} style={styles.iconButton}>
            <Copy size={18} />
            <span>{copied ? "Link copiado" : "Copiar link"}</span>
          </button>

          <button type="button" onClick={loadEventAndPhotos} style={styles.iconButton}>
            <RefreshCw size={18} />
            <span>Atualizar</span>
          </button>
        </div>

        <div style={styles.topBarRight} className="event-slideshow-top-bar-side">
          <button
            type="button"
            onClick={() => setIsMutedVisualFx((prev) => !prev)}
            style={styles.iconButton}
          >
            <Sparkles size={18} />
            <span>{isMutedVisualFx ? "Efeitos off" : "Efeitos on"}</span>
          </button>

          <button type="button" onClick={handleToggleFullscreen} style={styles.iconButton}>
            {isFullscreen ? <Shrink size={18} /> : <Expand size={18} />}
            <span>{isFullscreen ? "Sair da tela cheia" : "Tela cheia"}</span>
          </button>
        </div>
      </div>

      <div style={styles.content}>
        <header style={styles.header} className="event-slideshow-header">
          <div style={styles.brandBlock} className="event-slideshow-brand">
            {logoUrl ? (
              <img src={logoUrl} alt={eventTitle} style={styles.logo} />
            ) : (
              <div style={styles.logoFallback}>
                <MonitorPlay size={34} />
              </div>
            )}

            <div style={styles.headerText}>
              <span style={styles.kicker}>Modo telão ao vivo</span>
              <h1 style={styles.title} className="event-slideshow-title">
                {eventTitle}
              </h1>
              <div style={styles.metaRow}>
                {eventDateLabel ? <span style={styles.metaPill}>{eventDateLabel}</span> : null}
                <span style={styles.metaPill}>
                  <Images size={14} />
                  {photos.length} foto{photos.length === 1 ? "" : "s"}
                </span>
                <span style={styles.metaPill}>
                  <Play size={14} />
                  7s por foto
                </span>
              </div>
            </div>
          </div>

          {eventData?.description ? (
            <p style={styles.description}>{eventData.description}</p>
          ) : null}
        </header>

        <main style={styles.mainGrid} className="event-slideshow-main-grid">
          <section style={styles.slideshowPanel} className="event-slideshow-slide-panel">
            {loading ? (
              <div style={styles.centerState}>
                <Loader2 size={30} style={styles.spinner} />
                <p style={styles.stateTitle}>Carregando telão...</p>
              </div>
            ) : error ? (
              <div style={styles.centerState}>
                <AlertCircle size={34} />
                <p style={styles.stateTitle}>Erro ao carregar</p>
                <p style={styles.stateText}>{error}</p>
              </div>
            ) : !currentPhoto ? (
              <div style={styles.centerState}>
                <Images size={34} />
                <p style={styles.stateTitle}>Nenhuma foto aprovada ainda</p>
                <p style={styles.stateText}>
                  Assim que as fotos forem aprovadas, elas aparecerão automaticamente aqui.
                </p>
              </div>
            ) : (
              <div style={styles.slideViewport}>
                <div style={styles.slideFrame}>
                  <img
                    key={`${currentPhoto.id}-${visibleIndex}`}
                    src={currentPhoto.display_url}
                    alt={currentPhoto.guest_name || eventTitle}
                    style={styles.slideImage}
                  />
                  <div style={styles.slideShadow} />
                </div>

                <div style={styles.slideCaption}>
                  <span style={styles.liveBadge}>
                    <span style={styles.liveDot} />
                    AO VIVO
                  </span>

                  <span style={styles.counterBadge}>
                    {visibleIndex + 1}/{photos.length}
                  </span>
                </div>

                <button type="button" onClick={handlePrevious} style={styles.navButtonLeft}>
                  ‹
                </button>

                <button type="button" onClick={handleNext} style={styles.navButtonRight}>
                  ›
                </button>
              </div>
            )}
          </section>

          <aside style={styles.sidebar} className="event-slideshow-sidebar">
            <div style={styles.infoCard}>
              <div style={styles.infoCardHeader}>
                <QrCode size={18} />
                <span>Galeria pública</span>
              </div>

              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="QR Code da galeria" style={styles.qrCode} />
              ) : (
                <div style={styles.qrPlaceholder}>QR indisponível</div>
              )}

              <p style={styles.infoText}>
                Os convidados podem acessar a galeria pública apontando a câmera do celular para
                este QR Code.
              </p>

              <div style={styles.urlBox}>{galleryUrl}</div>
            </div>

            <div style={styles.infoCard}>
              <div style={styles.infoCardHeader}>
                <Sparkles size={18} />
                <span>Próxima foto</span>
              </div>

              {nextPhoto?.display_url ? (
                <img
                  key={`${nextPhoto.id}-${visibleIndex}`}
                  src={nextPhoto.display_url}
                  alt="Próxima foto"
                  style={styles.nextPhotoPreview}
                />
              ) : (
                <div style={styles.nextPlaceholder}>Aguardando imagens</div>
              )}

              <p style={styles.infoText}>
                A próxima imagem fica preparada enquanto a foto atual permanece em destaque por 10
                segundos.
              </p>
            </div>
          </aside>
        </main>
      </div>

      <style>{`
        @keyframes slideshowFade {
          0% { opacity: 0.92; transform: scale(1.005); }
          100% { opacity: 1; transform: scale(1); }
        }

        @keyframes spinSoft {
          to { transform: rotate(360deg); }
        }

        @keyframes floatSpark {
          0% { transform: translateY(0px) scale(1); opacity: 0; }
          20% { opacity: 0.9; }
          100% { transform: translateY(-180px) scale(1.35); opacity: 0; }
        }

        @media (max-width: 1180px) {
          .event-slideshow-main-grid {
            grid-template-columns: 1fr !important;
          }

          .event-slideshow-sidebar {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            display: grid !important;
          }
        }

        @media (max-width: 820px) {
          .event-slideshow-top-bar {
            flex-direction: column !important;
            align-items: stretch !important;
          }

          .event-slideshow-top-bar-side {
            justify-content: center !important;
            flex-wrap: wrap !important;
          }

          .event-slideshow-header {
            padding-top: 96px !important;
          }

          .event-slideshow-brand {
            flex-direction: column !important;
            text-align: center !important;
          }

          .event-slideshow-sidebar {
            grid-template-columns: 1fr !important;
          }

          .event-slideshow-title {
            font-size: 2rem !important;
          }

          .event-slideshow-slide-panel {
            min-height: 420px !important;
          }
        }
      `}</style>
    </div>
  );
}

const styles = {
  page: {
    position: "relative",
    minHeight: "100vh",
    overflow: "hidden",
    background:
      "radial-gradient(circle at top, rgba(255,255,255,0.06), transparent 30%), #050816",
    color: "#fff",
  },
  backgroundLayer: {
    position: "absolute",
    inset: 0,
    backgroundPosition: "center",
    backgroundSize: "cover",
    filter: "blur(18px)",
    transform: "scale(1.08)",
    opacity: 0.26,
  },
  backgroundOverlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(180deg, rgba(5,8,22,0.22) 0%, rgba(5,8,22,0.72) 35%, rgba(5,8,22,0.94) 100%)",
  },
  radialGlowTop: {
    position: "absolute",
    top: -160,
    left: "10%",
    width: 520,
    height: 520,
    borderRadius: "50%",
    background: "rgba(255, 180, 80, 0.13)",
    filter: "blur(90px)",
    pointerEvents: "none",
  },
  radialGlowBottom: {
    position: "absolute",
    bottom: -180,
    right: "8%",
    width: 580,
    height: 580,
    borderRadius: "50%",
    background: "rgba(255, 255, 255, 0.08)",
    filter: "blur(120px)",
    pointerEvents: "none",
  },
  spark: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,214,140,0.95) 35%, rgba(255,214,140,0) 75%)",
    boxShadow: "0 0 18px rgba(255, 221, 160, 0.6)",
    animation: "floatSpark 7s linear infinite",
    pointerEvents: "none",
  },
  sparkOne: { left: "10%", bottom: 40, animationDelay: "0s" },
  sparkTwo: { left: "20%", bottom: 80, animationDelay: "1.4s" },
  sparkThree: { left: "72%", bottom: 40, animationDelay: "0.8s" },
  sparkFour: { left: "83%", bottom: 110, animationDelay: "2.2s" },
  sparkFive: { left: "52%", bottom: 30, animationDelay: "1.8s" },
  sparkSix: { left: "38%", bottom: 100, animationDelay: "2.8s" },

  topBar: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    zIndex: 20,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  topBarLeft: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  topBarRight: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  iconButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.08)",
    color: "#fff",
    padding: "10px 14px",
    borderRadius: 999,
    textDecoration: "none",
    backdropFilter: "blur(16px)",
    cursor: "pointer",
    fontSize: "0.92rem",
  },

  content: {
    position: "relative",
    zIndex: 2,
    maxWidth: 1500,
    margin: "0 auto",
    padding: "110px 24px 32px",
  },
  header: {
    marginBottom: 28,
  },
  brandBlock: {
    display: "flex",
    alignItems: "center",
    gap: 20,
    marginBottom: 14,
  },
  logo: {
    width: 94,
    height: 94,
    borderRadius: 28,
    objectFit: "cover",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.18)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.28)",
  },
  logoFallback: {
    width: 94,
    height: 94,
    borderRadius: 28,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.18)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.28)",
  },
  headerText: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  kicker: {
    display: "inline-flex",
    alignItems: "center",
    width: "fit-content",
    padding: "8px 14px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.09)",
    border: "1px solid rgba(255,255,255,0.14)",
    fontSize: "0.82rem",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
  },
  title: {
    margin: 0,
    fontSize: "clamp(2.2rem, 4vw, 4.4rem)",
    lineHeight: 1.02,
    fontWeight: 800,
  },
  metaRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  metaPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 12px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.12)",
    fontSize: "0.92rem",
  },
  description: {
    maxWidth: 860,
    margin: 0,
    color: "rgba(255,255,255,0.82)",
    fontSize: "1.02rem",
    lineHeight: 1.7,
  },

  mainGrid: {
    display: "grid",
    gridTemplateColumns: "1.5fr 360px",
    gap: 22,
    alignItems: "stretch",
  },
  slideshowPanel: {
    position: "relative",
    minHeight: 620,
    borderRadius: 32,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    backdropFilter: "blur(18px)",
    overflow: "hidden",
    boxShadow: "0 28px 100px rgba(0,0,0,0.26)",
  },
  centerState: {
    minHeight: 620,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    textAlign: "center",
    padding: 24,
    color: "rgba(255,255,255,0.9)",
  },
  spinner: {
    animation: "spinSoft 1s linear infinite",
  },
  stateTitle: {
    margin: 0,
    fontSize: "1.2rem",
    fontWeight: 700,
  },
  stateText: {
    margin: 0,
    maxWidth: 520,
    color: "rgba(255,255,255,0.7)",
    lineHeight: 1.7,
  },

  slideViewport: {
    position: "relative",
    minHeight: 620,
    padding: 18,
  },
  slideFrame: {
    position: "relative",
    width: "100%",
    minHeight: 584,
    height: "584px",
    borderRadius: 26,
    overflow: "hidden",
    background: "#060a14",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  slideImage: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    objectPosition: "center",
    animation: "slideshowFade 7s ease forwards",
    display: "block",
    background: "#060a14",
  },
  slideShadow: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.24) 100%)",
    pointerEvents: "none",
  },
  slideCaption: {
    position: "absolute",
    left: 32,
    right: 32,
    bottom: 32,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    pointerEvents: "none",
  },
  liveBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: "rgba(7,10,18,0.62)",
    border: "1px solid rgba(255,255,255,0.14)",
    padding: "10px 14px",
    borderRadius: 999,
    backdropFilter: "blur(16px)",
    fontSize: "0.86rem",
    letterSpacing: "0.12em",
    fontWeight: 700,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "#ff5a5a",
    boxShadow: "0 0 0 6px rgba(255,90,90,0.18)",
  },
  counterBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 76,
    background: "rgba(7,10,18,0.62)",
    border: "1px solid rgba(255,255,255,0.14)",
    padding: "10px 14px",
    borderRadius: 999,
    backdropFilter: "blur(16px)",
    fontSize: "0.95rem",
    fontWeight: 700,
  },
  navButtonLeft: {
    position: "absolute",
    left: 26,
    top: "50%",
    transform: "translateY(-50%)",
    width: 52,
    height: 52,
    borderRadius: "50%",
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(6,10,20,0.48)",
    color: "#fff",
    fontSize: "2rem",
    cursor: "pointer",
    zIndex: 3,
    backdropFilter: "blur(14px)",
  },
  navButtonRight: {
    position: "absolute",
    right: 26,
    top: "50%",
    transform: "translateY(-50%)",
    width: 52,
    height: 52,
    borderRadius: "50%",
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(6,10,20,0.48)",
    color: "#fff",
    fontSize: "2rem",
    cursor: "pointer",
    zIndex: 3,
    backdropFilter: "blur(14px)",
  },

  sidebar: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  infoCard: {
    borderRadius: 28,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    backdropFilter: "blur(18px)",
    padding: 20,
    boxShadow: "0 24px 70px rgba(0,0,0,0.18)",
  },
  infoCardHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
    fontWeight: 700,
    color: "#fff",
  },
  qrCode: {
    width: "100%",
    maxWidth: 200,
    margin: "0 auto 14px",
    display: "block",
    borderRadius: 20,
    background: "#fff",
    padding: 10,
  },
  qrPlaceholder: {
    display: "grid",
    placeItems: "center",
    minHeight: 180,
    borderRadius: 20,
    background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.64)",
    marginBottom: 14,
  },
  infoText: {
    margin: "0 0 14px",
    color: "rgba(255,255,255,0.76)",
    lineHeight: 1.7,
    fontSize: "0.95rem",
  },
  urlBox: {
    fontSize: "0.85rem",
    wordBreak: "break-word",
    padding: "12px 14px",
    borderRadius: 16,
    background: "rgba(0,0,0,0.2)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.82)",
  },
  nextPhotoPreview: {
    width: "100%",
    height: 220,
    objectFit: "contain",
    objectPosition: "center",
    borderRadius: 20,
    marginBottom: 14,
    display: "block",
    background: "#060a14",
  },
  nextPlaceholder: {
    minHeight: 220,
    display: "grid",
    placeItems: "center",
    borderRadius: 20,
    background: "#060a14",
    color: "rgba(255,255,255,0.64)",
    marginBottom: 14,
  },

  notFoundCard: {
    maxWidth: 520,
    margin: "14vh auto 0",
    padding: 28,
    borderRadius: 28,
    textAlign: "center",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
  },
  notFoundTitle: {
    margin: "14px 0 8px",
    fontSize: "1.6rem",
  },
  notFoundText: {
    margin: 0,
    color: "rgba(255,255,255,0.75)",
    lineHeight: 1.7,
  },
  backButton: {
    display: "inline-flex",
    marginTop: 18,
    padding: "12px 18px",
    borderRadius: 999,
    textDecoration: "none",
    color: "#fff",
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.14)",
  },
};