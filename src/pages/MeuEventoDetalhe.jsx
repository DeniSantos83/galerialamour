import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

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

  const [films, setFilms] = useState([]);
  const [loadingFilms, setLoadingFilms] = useState(true);
  const [creatingFilm, setCreatingFilm] = useState(false);
  const [filmForm, setFilmForm] = useState({
    duration_seconds: 30,
    format: "landscape",
    style: "romantic",
    title: "",
  });

  useEffect(() => {
    function handleResize() {
      setScreenWidth(window.innerWidth);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const loadEvent = async () => {
      try {
        setLoading(true);
        setError("");
        setLoadingFilms(true);

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;

        if (!user) {
          setAuthChecked(true);
          setLoading(false);
          setLoadingFilms(false);
          return;
        }

        setUser(user);
        setAuthChecked(true);

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        setProfile(profileData || null);

        const isAdmin = profileData?.role === "admin";

        let partnerData = null;

        if (!isAdmin) {
          const { data: fetchedPartner, error: partnerError } = await supabase
            .from("partners")
            .select("*")
            .eq("profile_id", user.id)
            .maybeSingle();

          if (partnerError) throw partnerError;

          if (!fetchedPartner) {
            setPartner(null);
            setEvent(null);
            setSettings(null);
            setFilms([]);
            setLoadingFilms(false);
            setLoading(false);
            return;
          }

          partnerData = fetchedPartner;
          setPartner(fetchedPartner);
        } else {
          setPartner(null);
        }

        let eventQuery = supabase.from("events").select("*").eq("slug", slug);

        if (!isAdmin && partnerData?.id) {
          eventQuery = eventQuery.eq("partner_id", partnerData.id);
        }

        const { data: eventData, error: eventError } = await eventQuery.maybeSingle();

        if (eventError) throw eventError;

        if (!eventData) {
          setEvent(null);
          setSettings(null);
          setFilms([]);
          setLoadingFilms(false);
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

        const { data: filmsData, error: filmsError } = await supabase
          .from("event_films")
          .select("*")
          .eq("event_id", eventData.id)
          .order("created_at", { ascending: false });

        if (filmsError) throw filmsError;

        setFilms(filmsData || []);
      } catch (err) {
        console.error("Erro ao carregar detalhe do evento:", err);
        setError(err.message || "Erro ao carregar o evento.");
      } finally {
        setLoading(false);
        setLoadingFilms(false);
      }
    };

    loadEvent();
  }, [slug]);

  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "";

  const isMobile = screenWidth <= MOBILE_BREAKPOINT;

  const responsive = useMemo(
    () => getResponsiveStyles(screenWidth),
    [screenWidth]
  );

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

  const isAdmin = profile?.role === "admin";
  const backLink = isAdmin ? "/painel" : "/meus-eventos";
  const accessLabel = isAdmin ? "admin" : "parceiro";

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

  const formatDateTime = (date) => {
    if (!date) return "—";
    return new Date(date).toLocaleString("pt-BR");
  };

  async function loadFilms(eventId) {
    try {
      setLoadingFilms(true);

      const { data, error } = await supabase
        .from("event_films")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setFilms(data || []);
    } catch (err) {
      console.error("Erro ao carregar filmes:", err);
    } finally {
      setLoadingFilms(false);
    }
  }

  async function handleGenerateFilm() {
    if (!event?.id || !user?.id) {
      alert("Evento ou usuário não identificado.");
      return;
    }

    try {
      setCreatingFilm(true);

      const titleFinal =
        filmForm.title?.trim() || `Filme de ${event.name || "Evento"}`;

      const { data, error } = await supabase
        .from("event_films")
        .insert([
          {
            event_id: event.id,
            created_by: user.id,
            status: "queued",
            duration_seconds: Number(filmForm.duration_seconds) || 30,
            format: filmForm.format || "landscape",
            style: filmForm.style || "romantic",
            title: titleFinal,
          },
        ])
        .select("*")
        .single();

      if (error) throw error;

      setFilms((prev) => [data, ...prev]);
      await fetch("/.netlify/functions/process-film", {
  method: "POST",
});
      alert("Filme solicitado com sucesso.");
    } catch (err) {
      console.error("Erro ao criar filme:", err);
      alert(err.message || "Erro ao gerar filme.");
    } finally {
      setCreatingFilm(false);
    }
  }

  function translateFilmStatus(status) {
    switch (status) {
      case "queued":
        return "Na fila";
      case "processing":
        return "Processando";
      case "ready":
        return "Pronto";
      case "failed":
        return "Falhou";
      default:
        return status || "Desconhecido";
    }
  }

  if (authChecked && !user && !loading) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div style={styles.page}>
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
            to={backLink}
            style={{
              ...styles.backLink,
              ...responsive.backLink,
            }}
          >
            ← {isAdmin ? "Voltar para o painel" : "Voltar para meus eventos"}
          </Link>

          {isAdmin ? (
            <div
              style={{
                ...styles.partnerChip,
                ...responsive.partnerChip,
              }}
            >
              <span style={styles.partnerChipLabel}>Acesso</span>
              <strong style={styles.partnerChipName}>Administrador</strong>
            </div>
          ) : partner ? (
            <div
              style={{
                ...styles.partnerChip,
                ...responsive.partnerChip,
              }}
            >
              <span style={styles.partnerChipLabel}>Parceiro</span>
              <strong style={styles.partnerChipName}>
                {partner.studio_name || partner.name || "Parceiro"}
              </strong>
            </div>
          ) : null}
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

        {!loading && !error && !isAdmin && !partner && (
          <div style={styles.stateBox}>
            <p>Nenhum parceiro vinculado foi encontrado para este login.</p>
          </div>
        )}

        {!loading && !error && !event && (
          <div style={styles.stateBox}>
            <p>Evento não encontrado ou sem permissão de acesso.</p>
          </div>
        )}

        {!loading && !error && event && (
          <div style={styles.contentCard}>
            <div
              style={{
                ...styles.hero,
                ...responsive.hero,
                backgroundImage: event.cover_url
                  ? `linear-gradient(rgba(35,40,58,.25), rgba(35,40,58,.35)), url(${event.cover_url})`
                  : "linear-gradient(135deg, #9e8f90 0%, #ead6d6 100%)",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
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
                  <span style={styles.heroMiniTag}>
                    Acesso {isAdmin ? "admin" : "parceiro"}
                  </span>
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
                {event.description || "Sem descrição cadastrada para este evento."}
              </p>
            </div>

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
                  <InfoBox label="Slug" value={event.slug} />
                  <InfoBox label="Acesso" value={accessLabel} />
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
                  isMobile={isMobile}
                />

                <LinkCard
                  title="Galeria privada"
                  url={urls.privateGalleryUrl}
                  copyLabel={
                    copiedKey === "private" ? "Copiado!" : "Copiar galeria privada"
                  }
                  onCopy={() => copyText(urls.privateGalleryUrl, "private")}
                  openLabel="Ver galeria"
                  isMobile={isMobile}
                />

                <LinkCard
                  title="Galeria pública"
                  url={urls.publicGalleryUrl}
                  copyLabel={
                    copiedKey === "public" ? "Copiado!" : "Copiar galeria pública"
                  }
                  onCopy={() => copyText(urls.publicGalleryUrl, "public")}
                  openLabel="Abrir pública"
                  isMobile={isMobile}
                />
                {isAdmin && (
  <div style={styles.sectionBlock}>
    <div style={styles.sectionTitle}>Utilidades do evento</div>

    <div style={styles.linkCard}>
      <p style={styles.helperText}>
        Ferramentas rápidas para gerenciar este evento.
      </p>

      <div style={styles.linkActions}>
        <Link
          to={`/evento/${event.slug}/configuracoes`}
          style={{
            ...styles.darkButtonSmall,
            ...(isMobile ? styles.mobileActionButton : {}),
          }}
        >
          ⚙️ Configurações do evento
        </Link>

        <a
          href={urls.publicGalleryUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            ...styles.lightButtonSmall,
            ...(isMobile ? styles.mobileActionButton : {}),
          }}
        >
          🌐 Abrir galeria pública
        </a>

        <a
          href={urls.uploadUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            ...styles.lightButtonSmall,
            ...(isMobile ? styles.mobileActionButton : {}),
          }}
        >
          📤 Abrir página de upload
        </a>
      </div>
    </div>
  </div>
)}
                <div style={styles.sectionBlock}>
                  <div style={styles.sectionTitle}>Filme automático da festa</div>

                  <div style={styles.linkCard}>
                    <p style={styles.helperText}>
                      Gere um highlight automático com as mídias aprovadas do evento.
                    </p>

                    <div style={styles.filmFormGrid}>
                      <label style={styles.field}>
                        <span style={styles.infoLabel}>Título do filme</span>
                        <input
                          type="text"
                          value={filmForm.title}
                          onChange={(e) =>
                            setFilmForm((prev) => ({
                              ...prev,
                              title: e.target.value,
                            }))
                          }
                          style={styles.input}
                          placeholder={`Filme de ${event?.name || "Evento"}`}
                        />
                      </label>

                      <label style={styles.field}>
                        <span style={styles.infoLabel}>Duração</span>
                        <select
                          value={filmForm.duration_seconds}
                          onChange={(e) =>
                            setFilmForm((prev) => ({
                              ...prev,
                              duration_seconds: Number(e.target.value),
                            }))
                          }
                          style={styles.input}
                        >
                          <option value={30}>30 segundos</option>
                          <option value={60}>60 segundos</option>
                        </select>
                      </label>

                      <label style={styles.field}>
                        <span style={styles.infoLabel}>Formato</span>
                        <select
                          value={filmForm.format}
                          onChange={(e) =>
                            setFilmForm((prev) => ({
                              ...prev,
                              format: e.target.value,
                            }))
                          }
                          style={styles.input}
                        >
                          <option value="landscape">Horizontal</option>
                          <option value="portrait">Vertical</option>
                        </select>
                      </label>

                      <label style={styles.field}>
                        <span style={styles.infoLabel}>Estilo</span>
                        <select
                          value={filmForm.style}
                          onChange={(e) =>
                            setFilmForm((prev) => ({
                              ...prev,
                              style: e.target.value,
                            }))
                          }
                          style={styles.input}
                        >
                          <option value="romantic">Romântico</option>
                          <option value="elegant">Elegante</option>
                          <option value="party">Animado</option>
                        </select>
                      </label>
                    </div>

                    <div style={styles.linkActions}>
                      <button
                        type="button"
                        style={{
                          ...styles.darkButtonSmall,
                          ...(isMobile ? styles.mobileActionButton : {}),
                        }}
                        onClick={handleGenerateFilm}
                        disabled={creatingFilm}
                      >
                        {creatingFilm ? "Gerando..." : "Gerar filme"}
                      </button>

                      <button
                        type="button"
                        style={{
                          ...styles.lightButtonSmall,
                          ...(isMobile ? styles.mobileActionButton : {}),
                        }}
                        onClick={() => loadFilms(event.id)}
                        disabled={loadingFilms}
                      >
                        {loadingFilms ? "Atualizando..." : "Atualizar lista"}
                      </button>
                    </div>
                  </div>
                </div>

                <div style={styles.sectionBlock}>
                  <div style={styles.sectionTitle}>Filmes gerados</div>

                  <div style={styles.linkCard}>
                    {loadingFilms ? (
                      <p style={styles.helperText}>Carregando filmes...</p>
                    ) : films.length === 0 ? (
                      <p style={styles.helperText}>Nenhum filme gerado ainda.</p>
                    ) : (
                      <div style={styles.filmList}>
                        {films.map((film) => (
                          <div key={film.id} style={styles.filmItem}>
                            <div style={styles.filmInfo}>
                              <strong style={styles.infoValue}>
                                {film.title || "Filme sem título"}
                              </strong>

                              <div style={styles.filmMeta}>
                                {film.duration_seconds}s • {film.format} • {film.style}
                              </div>

                              <div style={styles.filmMeta}>
                                Status:{" "}
                                <strong>{translateFilmStatus(film.status)}</strong>
                              </div>

                              <div style={styles.filmMeta}>
                                Criado em: {formatDateTime(film.created_at)}
                              </div>

                              {film.error_message ? (
                                <div style={styles.filmError}>
                                  Erro: {film.error_message}
                                </div>
                              ) : null}
                            </div>

                            <div style={styles.filmActions}>
                              {film.output_url ? (
                                <a
                                  href={film.output_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    ...styles.lightButtonSmall,
                                    ...(isMobile ? styles.mobileActionButton : {}),
                                  }}
                                >
                                  Abrir filme
                                </a>
                              ) : (
                                <span style={styles.statusBadge}>
                                  {translateFilmStatus(film.status)}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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
                    levar os convidados direto para o evento.
                  </p>

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

function LinkCard({ title, url, copyLabel, onCopy, openLabel, isMobile }) {
  return (
    <div style={styles.linkCard}>
      <div style={styles.linkCardTitle}>{title}</div>
      <div style={styles.linkUrl}>{url || "Link não disponível."}</div>

      <div style={styles.linkActions}>
        <button
          type="button"
          style={{
            ...styles.darkButtonSmall,
            ...(isMobile ? styles.mobileActionButton : {}),
          }}
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
            ...(isMobile ? styles.mobileActionButton : {}),
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

function getResponsiveStyles(screenWidth) {
  const isMobile = screenWidth <= MOBILE_BREAKPOINT;
  const isTablet =
    screenWidth > MOBILE_BREAKPOINT && screenWidth <= TABLET_BREAKPOINT;

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
    wordBreak: "break-word",
  },
  partnerChip: {
    background: "#fff",
    border: "1px solid #e7e9f2",
    borderRadius: "14px",
    padding: "10px 14px",
    boxShadow: "0 10px 25px rgba(24, 32, 79, 0.06)",
    minWidth: 0,
  },
  partnerChipLabel: {
    display: "block",
    fontSize: "11px",
    color: "#8a90a3",
    marginBottom: "4px",
  },
  partnerChipName: {
    wordBreak: "break-word",
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
  heroTopRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    flexWrap: "wrap",
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
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
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
    wordBreak: "break-word",
  },
  heroDescription: {
    margin: 0,
    maxWidth: "760px",
    fontSize: "15px",
    lineHeight: 1.5,
    color: "rgba(255,255,255,0.96)",
    wordBreak: "break-word",
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
  sectionBlock: {
    marginTop: "18px",
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
    minWidth: 0,
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
    minWidth: 0,
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
  helperText: {
    margin: "0 0 14px",
    color: "#5f667d",
    fontSize: "13px",
    lineHeight: 1.5,
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
    textAlign: "center",
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
    padding: "10px 14px",
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
    padding: "10px 14px",
  },
  darkButtonSmall: {
    minHeight: "42px",
    border: "none",
    borderRadius: "12px",
    background: "#1e2440",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
    padding: "10px 14px",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  lightButtonSmall: {
    minHeight: "42px",
    border: "1px solid #dbe0ea",
    borderRadius: "12px",
    background: "#fff",
    color: "#6b7390",
    fontWeight: 700,
    cursor: "pointer",
    padding: "10px 14px",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  mobileActionButton: {
    width: "100%",
  },
  filmFormGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "12px",
    marginBottom: "14px",
  },
  field: {
    display: "grid",
    gap: "6px",
  },
  input: {
    width: "100%",
    minHeight: "44px",
    borderRadius: "12px",
    border: "1px solid #dbe0ea",
    background: "#fff",
    color: "#23283a",
    padding: "10px 12px",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
  },
  filmList: {
    display: "grid",
    gap: "12px",
  },
  filmItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    flexWrap: "wrap",
    border: "1px solid #e6e9f3",
    background: "#fff",
    borderRadius: "14px",
    padding: "14px",
  },
  filmInfo: {
    flex: 1,
    minWidth: "220px",
  },
  filmMeta: {
    fontSize: "13px",
    color: "#687086",
    marginTop: "4px",
    wordBreak: "break-word",
  },
  filmError: {
    marginTop: "6px",
    fontSize: "13px",
    color: "#b42318",
    wordBreak: "break-word",
  },
  filmActions: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "38px",
    padding: "0 12px",
    borderRadius: "999px",
    background: "#eef2ff",
    color: "#344054",
    fontWeight: 700,
    fontSize: "13px",
  },
};