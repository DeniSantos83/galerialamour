import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import QRCode from "qrcode";
import PanelLoader from "../components/PanelLoader";
import {
  Copy,
  ExternalLink,
  LogOut,
  PlusCircle,
  QrCode,
  CheckCircle2,
  Download,
  Globe,
  Link2,
  LayoutDashboard,
  Users,
  CalendarDays,
  Menu,
  X,
  UploadCloud,
  Image as ImageIcon,
  Palette,
  Sparkles,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { slugify } from "../lib/utils";
import PartnersPage from "./PartnersPage";

const EVENT_ASSETS_BUCKET = "event-assets";

const initialForm = {
  name: "",
  description: "",
  cover_url: "",
  logo_url: "",
  primary_color: "#1e2440",
  secondary_color: "#f6f7fb",
  accent_color: "#b08968",
  instructions: "",
  is_upload_open: true,
  partner_id: "",
  partner_name: "",
  event_date: "",
};

function useWindowWidth() {
  const getWidth = () =>
    typeof window !== "undefined" ? window.innerWidth : 1280;

  const [width, setWidth] = useState(getWidth);

  useEffect(() => {
    function handleResize() {
      setWidth(getWidth());
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return width;
}

export default function Dashboard() {
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  const [activeTab, setActiveTab] = useState("eventos");

  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  const [partners, setPartners] = useState([]);
  const [loadingPartners, setLoadingPartners] = useState(true);

  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [copiedKey, setCopiedKey] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState("");

  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 900;
  const isSmallMobile = windowWidth < 560;

  const slug = useMemo(() => slugify(form.name || ""), [form.name]);

  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "";

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

  useEffect(() => {
    loadSession();
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

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        setUser(null);
        setProfile(null);
        setAuthLoading(false);
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

      await Promise.all([loadEvents(), loadPartners()]);
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

      const { data, error } = await supabase
        .from("events")
        .select(`*, event_settings (*)`)
        .order("created_at", { ascending: false });

      console.log("USER:", user);
      console.log("EVENTS DATA:", data);
      console.log("EVENTS ERROR:", error);

      if (error) throw error;

      setEvents(data || []);

      if (data?.length) {
        setSelectedEvent((current) => {
          if (!current) return data[0];
          const stillExists = data.find((item) => item.id === current.id);
          return stillExists || data[0];
        });
      } else {
        setSelectedEvent(null);
      }
    } catch (error) {
      console.error("Erro ao carregar eventos:", error);
      setMessage("Erro ao carregar eventos.");
    } finally {
      setLoadingEvents(false);
    }
  }

  async function loadPartners() {
    try {
      setLoadingPartners(true);

      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setPartners(data || []);
    } catch (error) {
      console.error("Erro ao carregar parceiros:", error);
      setMessage("Erro ao carregar parceiros.");
    } finally {
      setLoadingPartners(false);
    }
  }

  async function generateQrCode(text) {
    try {
      const url = await QRCode.toDataURL(text, {
        width: 300,
        margin: 2,
      });
      setQrCodeDataUrl(url);
    } catch (error) {
      console.error("Erro ao gerar QR Code:", error);
      setQrCodeDataUrl("");
    }
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function handlePartnerChange(event) {
    const value = event.target.value;
    const partner = partners.find((item) => item.id === value);

    setForm((prev) => ({
      ...prev,
      partner_id: value,
      partner_name: partner?.studio_name || "",
    }));
  }

  async function handleImageUpload(event, fieldName) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage("Selecione um arquivo de imagem válido.");
      return;
    }

    const maxSizeMb = 8;
    const maxSizeBytes = maxSizeMb * 1024 * 1024;

    if (file.size > maxSizeBytes) {
      setMessage(`A imagem precisa ter no máximo ${maxSizeMb}MB.`);
      return;
    }

    try {
      setUploadingMedia(fieldName);
      setMessage("");

      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const safeName = slugify(file.name.replace(/\.[^/.]+$/, "")) || "imagem";
      const folder = slug || "novo-evento";
      const path = `${user?.id || "admin"}/${folder}/${fieldName}-${Date.now()}-${safeName}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from(EVENT_ASSETS_BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from(EVENT_ASSETS_BUCKET)
        .getPublicUrl(path);

      if (!data?.publicUrl) {
        throw new Error("Não foi possível gerar a URL pública da imagem.");
      }

      setForm((prev) => ({
        ...prev,
        [fieldName]: data.publicUrl,
      }));

      setMessage(fieldName === "cover_url" ? "Capa enviada com sucesso." : "Logo enviada com sucesso.");
    } catch (error) {
      console.error("Erro ao enviar imagem:", error);
      setMessage(
        error.message ||
          `Erro ao enviar imagem. Verifique se o bucket ${EVENT_ASSETS_BUCKET} existe no Supabase.`
      );
    } finally {
      setUploadingMedia("");
    }
  }

  async function handleCreateEvent(e) {
    e.preventDefault();

    if (!form.name.trim()) {
      setMessage("Informe o nome do evento.");
      return;
    }

    const baseSlug = slugify(form.name);
    if (!baseSlug) {
      setMessage("Não foi possível gerar o slug do evento.");
      return;
    }

    async function generateUniqueSlug(base) {
      let newSlug = base;
      let counter = 1;

      while (true) {
        const { data } = await supabase
          .from("events")
          .select("id")
          .eq("slug", newSlug)
          .maybeSingle();

        if (!data) break;

        newSlug = `${base}-${counter}`;
        counter++;
      }

      return newSlug;
    }

    let createdEvent = null;

    try {
      setSaving(true);
      setMessage("");

      const uniqueSlug = await generateUniqueSlug(baseSlug);

      const payload = {
        slug: uniqueSlug,
        name: form.name.trim(),
        description: form.description.trim() || null,
        logo_url: form.logo_url.trim() || null,
        cover_url: form.cover_url.trim() || null,
        primary_color: form.primary_color,
        secondary_color: form.secondary_color,
        accent_color: form.accent_color,
        instructions: form.instructions.trim() || null,
        is_upload_open: form.is_upload_open,
        created_by: user?.id || null,
        partner_id: form.partner_id || null,
        partner_name: form.partner_name || null,
        event_date: form.event_date || null,
      };

      const { data: insertedEvent, error: eventError } = await supabase
        .from("events")
        .insert([payload])
        .select("*")
        .single();

      if (eventError) throw eventError;

      createdEvent = insertedEvent;

      const { error: settingsError } = await supabase
        .from("event_settings")
        .insert([
          {
            event_id: createdEvent.id,
            allow_videos: true,
            max_photo_size_mb: 20,
            max_video_size_mb: 80,
            max_video_duration_seconds: 45,
            require_guest_name: false,
            gallery_mode: "private",
          },
        ]);

      if (settingsError) throw settingsError;

      const { error: eventUserError } = await supabase
        .from("event_users")
        .insert([
          {
            event_id: createdEvent.id,
            user_id: user.id,
            role: "owner",
          },
        ]);

      if (eventUserError) throw eventUserError;

      setForm(initialForm);
      setMessage("Evento criado com sucesso.");
      await loadEvents();
      setSelectedEvent(createdEvent);
      setActiveTab("eventos");
    } catch (error) {
      console.error("Erro ao criar evento:", error);
      setMessage(error.message || "Erro ao criar evento.");

      if (createdEvent?.id) {
        await supabase.from("events").delete().eq("id", createdEvent.id);
      }
    } finally {
      setSaving(false);
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

  async function downloadQr() {
    if (!qrCodeDataUrl || !selectedEvent?.slug) return;

    const a = document.createElement("a");
    a.href = qrCodeDataUrl;
    a.download = `qr-${selectedEvent.slug}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  if (authLoading) {
  return (
    <PanelLoader
      title="Carregando painel..."
      subtitle="Aguarde enquanto buscamos seus eventos e configurações."
      icon="dashboard"
    />
  );
}

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profile && profile.role === "partner") {
    return <Navigate to="/meus-eventos" replace />;
  }

  const adminName =
    profile?.["full-name"] || profile?.full_name || user.email || "Administrador";

  return (
    <div
      style={{
        ...styles.page,
        gridTemplateColumns: isMobile ? "1fr" : "280px 1fr",
      }}
    >
      {isMobile && (
        <div style={styles.mobileTopbar}>
          <div style={styles.mobileBrandWrap}>
            <div style={styles.mobileBrandIcon}>
              <LayoutDashboard size={18} />
            </div>
            <div>
              <div style={styles.brandTitle}>Painel L’Amour</div>
              <div style={styles.brandSubtitleDark}>Administração</div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            style={styles.mobileMenuButton}
            aria-label="Abrir menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      )}

      {(!isMobile || mobileMenuOpen) && (
        <aside
          style={{
            ...styles.sidebar,
            ...(isMobile ? styles.sidebarMobile : {}),
          }}
        >
          <div>
            {!isMobile && (
              <div style={styles.brand}>
                <div style={styles.brandIcon}>
                  <LayoutDashboard size={18} />
                </div>
                <div>
                  <div style={styles.brandTitle}>Painel L’Amour</div>
                  <div style={styles.brandSubtitle}>Administração</div>
                </div>
              </div>
            )}

            <div style={styles.menu}>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("eventos");
                  setMobileMenuOpen(false);
                }}
                style={{
                  ...styles.menuButton,
                  ...(activeTab === "eventos" ? styles.menuButtonActive : {}),
                }}
              >
                <CalendarDays size={18} />
                Eventos
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("parceiros");
                  setMobileMenuOpen(false);
                }}
                style={{
                  ...styles.menuButton,
                  ...(activeTab === "parceiros" ? styles.menuButtonActive : {}),
                }}
              >
                <Users size={18} />
                Parceiros
              </button>
            </div>
          </div>

          <div style={styles.sidebarFooter}>
            <div style={styles.adminBox}>
              <strong style={styles.adminName}>{adminName}</strong>
              <span style={styles.adminEmail}>{user.email}</span>
            </div>

            <button type="button" onClick={handleLogout} style={styles.logoutButton}>
              <LogOut size={16} />
              Sair
            </button>
          </div>
        </aside>
      )}

      <main
        style={{
          ...styles.main,
          padding: isSmallMobile ? "14px" : isMobile ? "18px" : "24px",
        }}
      >
        {message ? <div style={styles.alert}>{message}</div> : null}

        {activeTab === "eventos" && (
          <div
            style={{
              ...styles.contentGrid,
              gridTemplateColumns: isMobile ? "1fr" : "1.25fr 0.95fr",
            }}
          >
            <section
              style={{
                ...styles.card,
                padding: isSmallMobile ? "16px" : "22px",
              }}
            >
              <div style={styles.sectionHeader}>
                <div>
                  <p style={styles.kicker}>Administração</p>
                  <h1
                    style={{
                      ...styles.title,
                      fontSize: isSmallMobile ? "24px" : isMobile ? "27px" : "30px",
                    }}
                  >
                    Criar novo evento
                  </h1>
                  <p style={styles.subtitle}>
                    Crie eventos, vincule a um fotógrafo parceiro e gere links prontos.
                  </p>
                </div>
              </div>

              <form
                onSubmit={handleCreateEvent}
                style={{
                  ...styles.formGrid,
                  gridTemplateColumns: isSmallMobile
                    ? "1fr"
                    : isMobile
                    ? "1fr"
                    : "repeat(2, minmax(0, 1fr))",
                }}
              >
                <Field label="Nome do evento" required>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    style={styles.input}
                    placeholder="Ex: Casamento Ana & Pedro"
                  />
                </Field>

                <Field label="Slug gerado">
                  <input
                    type="text"
                    value={slug}
                    readOnly
                    style={{ ...styles.input, background: "#f6f7fb" }}
                    placeholder="slug-do-evento"
                  />
                </Field>

                <Field label="Data do evento">
                  <input
                    type="date"
                    name="event_date"
                    value={form.event_date}
                    onChange={handleChange}
                    style={styles.input}
                  />
                </Field>

                <Field label="Fotógrafo parceiro">
                  <select
                    name="partner_id"
                    value={form.partner_id}
                    onChange={handlePartnerChange}
                    style={styles.input}
                  >
                    <option value="">
                      {loadingPartners ? "Carregando parceiros..." : "Nenhum parceiro vinculado"}
                    </option>
                    {partners.map((partner) => (
                      <option key={partner.id} value={partner.id}>
                        {partner.studio_name}
                      </option>
                    ))}
                  </select>
                </Field>

                <div style={styles.fullWidth}>
                  <div
                    style={{
                      ...styles.visualGrid,
                      gridTemplateColumns: isSmallMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
                    }}
                  >
                    <ImageUrlCard
                      label="Capa da festa"
                      name="cover_url"
                      value={form.cover_url}
                      onChange={handleChange}
                      onUpload={(event) => handleImageUpload(event, "cover_url")}
                      uploading={uploadingMedia === "cover_url"}
                      placeholder="Cole aqui a URL da imagem de capa"
                      type="cover"
                    />

                    <ImageUrlCard
                      label="Logo da festa"
                      name="logo_url"
                      value={form.logo_url}
                      onChange={handleChange}
                      onUpload={(event) => handleImageUpload(event, "logo_url")}
                      uploading={uploadingMedia === "logo_url"}
                      placeholder="Cole aqui a URL da logo ou monograma"
                      type="logo"
                    />
                  </div>
                </div>

                <div style={styles.fullWidth}>
                  <div style={styles.appearanceCard}>
                    <div style={styles.appearanceHeader}>
                      <div style={styles.appearanceIcon}>
                        <Sparkles size={18} />
                      </div>
                      <div>
                        <strong style={styles.appearanceTitle}>Identidade visual da galeria</strong>
                        <span style={styles.appearanceSubtitle}>
                          Ajuste as cores e veja uma prévia rápida da página do evento.
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        ...styles.colorGrid,
                        gridTemplateColumns: isSmallMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
                      }}
                    >
                      <ColorPickerCard
                        label="Principal"
                        name="primary_color"
                        value={form.primary_color}
                        onChange={handleChange}
                        hint="Topo, botões e títulos"
                      />

                      <ColorPickerCard
                        label="Fundo"
                        name="secondary_color"
                        value={form.secondary_color}
                        onChange={handleChange}
                        hint="Base clara da galeria"
                      />

                      <ColorPickerCard
                        label="Destaque"
                        name="accent_color"
                        value={form.accent_color}
                        onChange={handleChange}
                        hint="Detalhes e chamadas"
                      />
                    </div>

                    <div
                      style={{
                        ...styles.galleryPreview,
                        background: `linear-gradient(135deg, ${form.primary_color}, ${form.accent_color})`,
                      }}
                    >
                      <div style={styles.galleryPreviewOverlay}>
                        <div style={styles.galleryPreviewLogoWrap}>
                          {form.logo_url ? (
                            <img
                              src={form.logo_url}
                              alt="Prévia da logo"
                              style={styles.galleryPreviewLogo}
                            />
                          ) : (
                            <ImageIcon size={24} />
                          )}
                        </div>
                        <div style={styles.galleryPreviewText}>
                          <span style={styles.galleryPreviewBadge}>Prévia da galeria</span>
                          <strong>{form.name || "Nome da festa"}</strong>
                          <small>{form.partner_name || "L’Amour Fotografia"}</small>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={styles.fullWidth}>
                  <Field label="Descrição">
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      style={styles.textarea}
                      placeholder="Descrição do evento"
                    />
                  </Field>
                </div>

                <div style={styles.fullWidth}>
                  <Field label="Instruções">
                    <textarea
                      name="instructions"
                      value={form.instructions}
                      onChange={handleChange}
                      style={styles.textarea}
                      placeholder="Orientações para convidados ou equipe"
                    />
                  </Field>
                </div>

                <div style={styles.fullWidth}>
                  <label style={styles.checkboxRow}>
                    <input
                      type="checkbox"
                      name="is_upload_open"
                      checked={form.is_upload_open}
                      onChange={handleChange}
                    />
                    Upload aberto para convidados
                  </label>
                </div>

                <div style={styles.fullWidth}>
                  <button
                    type="submit"
                    style={{
                      ...styles.primaryButton,
                      width: isSmallMobile ? "100%" : "auto",
                    }}
                    disabled={saving}
                  >
                    <PlusCircle size={18} />
                    {saving ? "Salvando..." : "Criar evento"}
                  </button>
                </div>
              </form>
            </section>

            <section style={styles.rightColumn}>
              <div
                style={{
                  ...styles.card,
                  padding: isSmallMobile ? "16px" : "22px",
                }}
              >
                <div style={styles.sectionHeaderSmall}>
                  <div>
                    <p style={styles.kicker}>Eventos</p>
                    <h2
                      style={{
                        ...styles.sectionTitle,
                        fontSize: isSmallMobile ? "19px" : "22px",
                      }}
                    >
                      Eventos criados
                    </h2>
                  </div>
                </div>

                {loadingEvents ? (
                  <p>Carregando eventos...</p>
                ) : events.length === 0 ? (
                  <p>Nenhum evento cadastrado ainda.</p>
                ) : (
                  <div style={styles.eventList}>
                    {events.map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => setSelectedEvent(event)}
                        style={{
                          ...styles.eventItem,
                          ...(selectedEvent?.id === event.id
                            ? styles.eventItemActive
                            : {}),
                          alignItems: isSmallMobile ? "flex-start" : "center",
                          flexDirection: isSmallMobile ? "column" : "row",
                        }}
                      >
                        <div style={{ width: "100%" }}>
                          <strong style={styles.eventName}>{event.name}</strong>
                          <div style={styles.eventMeta}>
                            {event.partner_name || "Sem parceiro"} • {event.slug}
                          </div>
                        </div>

                        <div style={{ alignSelf: isSmallMobile ? "flex-end" : "center" }}>
                          {event.is_upload_open ? (
                            <CheckCircle2 size={18} color="#2e8b57" />
                          ) : (
                            <Globe size={18} color="#999" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div
                style={{
                  ...styles.card,
                  padding: isSmallMobile ? "16px" : "22px",
                }}
              >
                <div style={styles.sectionHeaderSmall}>
                  <div>
                    <p style={styles.kicker}>Resumo</p>
                    <h2
                      style={{
                        ...styles.sectionTitle,
                        fontSize: isSmallMobile ? "19px" : "22px",
                      }}
                    >
                      Links do evento
                    </h2>
                  </div>
                </div>

                {!selectedEvent ? (
                  <p>Selecione um evento para ver os links e o QR Code.</p>
                ) : (
                  <>
                    <InfoBox label="Evento" value={selectedEvent.name} />
                    <InfoBox label="Slug" value={selectedEvent.slug} />
                    <InfoBox
                      label="Parceiro"
                      value={selectedEvent.partner_name || "Sem parceiro"}
                    />

                    <LinkBox
                      icon={<Link2 size={16} />}
                      title="Link público de upload"
                      url={selectedLinks.uploadUrl}
                      onCopy={() => copyText(selectedLinks.uploadUrl, "upload")}
                      copied={copiedKey === "upload"}
                      isSmallMobile={isSmallMobile}
                    />

                    <LinkBox
                      icon={<ExternalLink size={16} />}
                      title="Galeria privada"
                      url={selectedLinks.privateGalleryUrl}
                      onCopy={() =>
                        copyText(selectedLinks.privateGalleryUrl, "private")
                      }
                      copied={copiedKey === "private"}
                      isSmallMobile={isSmallMobile}
                    />

                    <LinkBox
                      icon={<Globe size={16} />}
                      title="Galeria pública"
                      url={selectedLinks.publicGalleryUrl}
                      onCopy={() =>
                        copyText(selectedLinks.publicGalleryUrl, "public")
                      }
                      copied={copiedKey === "public"}
                      isSmallMobile={isSmallMobile}
                    />

                    <div style={styles.qrCard}>
                      <div style={styles.qrHeader}>
                        <QrCode size={18} />
                        <strong>QR Code do upload</strong>
                      </div>

                      <div
                        style={{
                          ...styles.qrPreview,
                          minHeight: isSmallMobile ? "180px" : "220px",
                        }}
                      >
                        {qrCodeDataUrl ? (
                          <img
                            src={qrCodeDataUrl}
                            alt="QR Code do evento"
                            style={styles.qrImage}
                          />
                        ) : (
                          <span>Sem QR Code</span>
                        )}
                      </div>

                      <div
                        style={{
                          ...styles.qrActions,
                          flexDirection: isSmallMobile ? "column" : "row",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => copyText(selectedLinks.uploadUrl, "qrlink")}
                          style={{
                            ...styles.secondaryButton,
                            width: isSmallMobile ? "100%" : "auto",
                          }}
                        >
                          <Copy size={16} />
                          {copiedKey === "qrlink" ? "Copiado!" : "Copiar link"}
                        </button>

                        <button
                          type="button"
                          onClick={downloadQr}
                          style={{
                            ...styles.secondaryButton,
                            width: isSmallMobile ? "100%" : "auto",
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
    style={styles.linkButton}
  >
    <ExternalLink size={16} />
    Abrir upload
  </a>

  <Link
    to={`/meus-eventos/${selectedEvent.slug}`}
    style={styles.linkButton}
  >
    Ver detalhes do evento
  </Link>

  <Link
    to={`/evento/${selectedEvent.slug}/configuracoes`}
    style={styles.linkButton}
  >
    Configurações
  </Link>
</div>
                    </div>
                  </>
                )}
              </div>
            </section>
          </div>
        )}

        {activeTab === "parceiros" && <PartnersPage />}
      </main>
    </div>
  );
}

function Field({ label, children, required = false }) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>
        {label} {required ? <span style={styles.required}>*</span> : null}
      </span>
      {children}
    </label>
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

function ImageUrlCard({
  label,
  name,
  value,
  onChange,
  onUpload,
  uploading = false,
  placeholder,
  type = "cover",
}) {
  const isCover = type === "cover";

  return (
    <div style={styles.mediaCard}>
      <div style={styles.mediaHeader}>
        <div style={styles.mediaIcon}>
          <ImageIcon size={18} />
        </div>
        <div>
          <span style={styles.mediaLabel}>{label}</span>
          <small style={styles.mediaHint}>
            {isCover
              ? "Imagem horizontal para abrir a galeria"
              : "Marca, brasão ou monograma do evento"}
          </small>
        </div>
      </div>

      <label
        style={{
          ...styles.uploadDropBox,
          ...(isCover ? styles.uploadDropBoxCover : styles.uploadDropBoxLogo),
          ...(value ? styles.uploadDropBoxWithImage : {}),
        }}
      >
        <input
          type="file"
          accept="image/*"
          onChange={onUpload}
          disabled={uploading}
          style={styles.hiddenFileInput}
        />

        {value ? (
          <>
            <img
              src={value}
              alt={`Prévia - ${label}`}
              style={isCover ? styles.coverPreviewImage : styles.logoPreviewImage}
            />
            <div style={styles.uploadImageOverlay}>
              <div style={styles.uploadPlusSmall}>
                <PlusCircle size={22} />
              </div>
              <strong>{uploading ? "Enviando..." : "Trocar imagem"}</strong>
            </div>
          </>
        ) : (
          <div style={styles.uploadDropContent}>
            <div style={styles.uploadPlusIcon}>
              {uploading ? <UploadCloud size={32} /> : <PlusCircle size={36} />}
            </div>
            <strong>{uploading ? "Enviando imagem..." : isCover ? "Adicionar capa" : "Adicionar logo"}</strong>
            <span>{isCover ? "Clique para buscar uma capa no dispositivo" : "Clique para buscar uma logo no dispositivo"}</span>
            <small>PNG, JPG ou WEBP</small>
          </div>
        )}
      </label>

      <div style={styles.urlDivider}>ou cole uma URL</div>

      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        style={styles.mediaInput}
        placeholder={placeholder}
      />
    </div>
  );
}

function ColorPickerCard({ label, name, value, onChange, hint }) {
  return (
    <label style={styles.colorCard}>
      <div style={styles.colorTopLine}>
        <span style={styles.colorName}>{label}</span>
        <span style={styles.colorHex}>{value}</span>
      </div>

      <div style={styles.colorControlRow}>
        <span style={{ ...styles.colorSwatch, background: value }} />
        <input
          type="color"
          name={name}
          value={value}
          onChange={onChange}
          style={styles.colorPickerNative}
        />
      </div>

      <small style={styles.colorHint}>
        <Palette size={13} />
        {hint}
      </small>
    </label>
  );
}


function LinkBox({ icon, title, url, onCopy, copied, isSmallMobile = false }) {
  return (
    <div style={styles.linkBox}>
      <div style={styles.linkBoxTitle}>
        <span style={styles.linkIcon}>{icon}</span>
        <strong>{title}</strong>
      </div>

      <div style={styles.linkUrl}>{url}</div>

      <div
        style={{
          ...styles.linkActions,
          flexDirection: isSmallMobile ? "column" : "row",
        }}
      >
        <button
          type="button"
          onClick={onCopy}
          style={{
            ...styles.secondaryButton,
            width: isSmallMobile ? "100%" : "auto",
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
            ...styles.linkButton,
            width: isSmallMobile ? "100%" : "auto",
          }}
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
    display: "grid",
    background: "#f6f7fb",
  },
  centerScreen: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#f6f7fb",
    color: "#29314d",
  },
  mobileTopbar: {
    position: "sticky",
    top: 0,
    zIndex: 20,
    background: "#ffffffee",
    backdropFilter: "blur(10px)",
    borderBottom: "1px solid #ececf3",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    padding: "14px 16px",
  },
  mobileBrandWrap: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  mobileBrandIcon: {
    width: "40px",
    height: "40px",
    borderRadius: "12px",
    background: "#1e2440",
    color: "#fff",
    display: "grid",
    placeItems: "center",
  },
  mobileMenuButton: {
    width: "42px",
    height: "42px",
    borderRadius: "12px",
    border: "1px solid #dfe3ec",
    background: "#fff",
    color: "#1e2440",
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
  },
  sidebar: {
    background: "#1e2440",
    color: "#fff",
    padding: "24px 18px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: "24px",
    minHeight: "100vh",
  },
  sidebarMobile: {
    minHeight: "auto",
    borderBottomLeftRadius: "20px",
    borderBottomRightRadius: "20px",
    paddingTop: "12px",
    paddingBottom: "18px",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "28px",
  },
  brandIcon: {
    width: "42px",
    height: "42px",
    borderRadius: "14px",
    background: "rgba(255,255,255,0.12)",
    display: "grid",
    placeItems: "center",
  },
  brandTitle: {
    fontWeight: 800,
    fontSize: "16px",
  },
  brandSubtitle: {
    fontSize: "13px",
    opacity: 0.72,
  },
  brandSubtitleDark: {
    fontSize: "13px",
    color: "#687086",
  },
  menu: {
    display: "grid",
    gap: "10px",
  },
  menuButton: {
    border: "none",
    background: "transparent",
    color: "rgba(255,255,255,0.82)",
    padding: "14px 14px",
    borderRadius: "14px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontWeight: 700,
    cursor: "pointer",
    textAlign: "left",
    width: "100%",
  },
  menuButtonActive: {
    background: "rgba(255,255,255,0.12)",
    color: "#fff",
  },
  sidebarFooter: {
    display: "grid",
    gap: "12px",
  },
  adminBox: {
    background: "rgba(255,255,255,0.08)",
    borderRadius: "16px",
    padding: "14px",
    display: "grid",
    gap: "4px",
  },
  adminName: {
    fontSize: "14px",
  },
  adminEmail: {
    fontSize: "12px",
    opacity: 0.75,
    wordBreak: "break-word",
  },
  logoutButton: {
    height: "44px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "transparent",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    cursor: "pointer",
    fontWeight: 700,
    width: "100%",
  },
  main: {
    padding: "24px",
    minWidth: 0,
  },
  alert: {
    marginBottom: "18px",
    background: "#fff7e6",
    color: "#8a6a00",
    border: "1px solid #f0d999",
    borderRadius: "14px",
    padding: "12px 14px",
  },
  contentGrid: {
    display: "grid",
    gap: "20px",
    alignItems: "start",
  },
  rightColumn: {
    display: "grid",
    gap: "20px",
    minWidth: 0,
  },
  card: {
    background: "#fff",
    border: "1px solid #ececf3",
    borderRadius: "24px",
    padding: "22px",
    boxShadow: "0 12px 30px rgba(24, 32, 79, 0.06)",
    minWidth: 0,
  },
  sectionHeader: {
    marginBottom: "18px",
  },
  sectionHeaderSmall: {
    marginBottom: "16px",
  },
  kicker: {
    margin: 0,
    color: "#b08968",
    fontWeight: 700,
    fontSize: "13px",
  },
  title: {
    margin: "6px 0 8px",
    fontSize: "30px",
    color: "#1f2333",
    lineHeight: 1.15,
  },
  sectionTitle: {
    margin: "6px 0 0",
    fontSize: "22px",
    color: "#1f2333",
    lineHeight: 1.2,
  },
  subtitle: {
    margin: 0,
    color: "#687086",
    fontSize: "14px",
    lineHeight: 1.5,
  },
  formGrid: {
    display: "grid",
    gap: "14px",
  },
  fullWidth: {
    gridColumn: "1 / -1",
  },
  visualGrid: {
    display: "grid",
    gap: "14px",
  },
  mediaCard: {
    border: "1px solid #ececf3",
    borderRadius: "18px",
    background: "linear-gradient(180deg, #ffffff, #fafbff)",
    padding: "14px",
    display: "grid",
    gap: "12px",
    boxShadow: "0 10px 24px rgba(30, 36, 64, 0.05)",
    minWidth: 0,
  },
  mediaHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  mediaIcon: {
    width: "38px",
    height: "38px",
    borderRadius: "13px",
    background: "#fff8f3",
    color: "#b08968",
    display: "grid",
    placeItems: "center",
    flex: "0 0 auto",
  },
  mediaLabel: {
    display: "block",
    color: "#1f2333",
    fontSize: "14px",
    fontWeight: 800,
  },
  mediaHint: {
    display: "block",
    color: "#7b8296",
    fontSize: "12px",
    lineHeight: 1.35,
  },
  uploadDropBox: {
    position: "relative",
    width: "100%",
    borderRadius: "20px",
    border: "1.5px dashed #cfd6e6",
    background: "linear-gradient(180deg, #f8f9fd, #ffffff)",
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
    boxSizing: "border-box",
    transition: "border-color .2s ease, background .2s ease, transform .2s ease",
  },
  uploadDropBoxCover: {
    minHeight: "210px",
  },
  uploadDropBoxLogo: {
    minHeight: "190px",
  },
  uploadDropBoxWithImage: {
    borderStyle: "solid",
    borderColor: "#e2e6f0",
    background: "#f6f7fb",
  },
  uploadDropContent: {
    display: "grid",
    placeItems: "center",
    gap: "9px",
    color: "#687086",
    textAlign: "center",
    padding: "28px 18px",
  },
  uploadPlusIcon: {
    width: "68px",
    height: "68px",
    borderRadius: "22px",
    background: "#fff8f3",
    color: "#b08968",
    display: "grid",
    placeItems: "center",
    boxShadow: "0 12px 26px rgba(176, 137, 104, 0.16)",
  },
  uploadImageOverlay: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(180deg, rgba(30,36,64,0.06), rgba(30,36,64,0.58))",
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    opacity: 1,
    textAlign: "center",
    padding: "14px",
  },
  uploadPlusSmall: {
    width: "46px",
    height: "46px",
    borderRadius: "16px",
    background: "rgba(255,255,255,0.92)",
    color: "#1e2440",
    display: "grid",
    placeItems: "center",
  },
  urlDivider: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    color: "#8a90a3",
    fontSize: "12px",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: ".04em",
  },
  coverPreview: {
    height: "150px",
    borderRadius: "16px",
    border: "1px dashed #d7dcea",
    background: "#f6f7fb",
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
  },
  logoPreview: {
    height: "150px",
    borderRadius: "16px",
    border: "1px dashed #d7dcea",
    background: "radial-gradient(circle at top, #ffffff, #f6f7fb)",
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
  },
  coverPreviewImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  logoPreviewImage: {
    width: "82%",
    height: "82%",
    objectFit: "contain",
    display: "block",
  },
  emptyPreview: {
    display: "grid",
    placeItems: "center",
    gap: "8px",
    color: "#8a90a3",
    fontSize: "13px",
    fontWeight: 700,
    textAlign: "center",
  },
  mediaInput: {
    width: "100%",
    height: "44px",
    borderRadius: "13px",
    border: "1px solid #dfe3ec",
    padding: "0 12px",
    outline: "none",
    fontSize: "13px",
    minWidth: 0,
    boxSizing: "border-box",
    background: "#fff",
  },
  appearanceCard: {
    border: "1px solid #ececf3",
    borderRadius: "20px",
    background: "#fff",
    padding: "16px",
    display: "grid",
    gap: "14px",
    boxShadow: "0 10px 24px rgba(30, 36, 64, 0.05)",
  },
  appearanceHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  appearanceIcon: {
    width: "42px",
    height: "42px",
    borderRadius: "15px",
    background: "#1e2440",
    color: "#fff",
    display: "grid",
    placeItems: "center",
    flex: "0 0 auto",
  },
  appearanceTitle: {
    display: "block",
    color: "#1f2333",
    fontSize: "15px",
  },
  appearanceSubtitle: {
    display: "block",
    color: "#7b8296",
    fontSize: "13px",
    lineHeight: 1.4,
  },
  colorGrid: {
    display: "grid",
    gap: "12px",
  },
  colorCard: {
    border: "1px solid #e7eaf2",
    borderRadius: "16px",
    padding: "12px",
    background: "#fafbff",
    display: "grid",
    gap: "10px",
    cursor: "pointer",
  },
  colorTopLine: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px",
  },
  colorName: {
    color: "#29314d",
    fontWeight: 800,
    fontSize: "13px",
  },
  colorHex: {
    color: "#7b8296",
    fontWeight: 700,
    fontSize: "12px",
    textTransform: "uppercase",
  },
  colorControlRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  colorSwatch: {
    width: "42px",
    height: "42px",
    borderRadius: "14px",
    border: "1px solid rgba(0,0,0,0.08)",
    boxShadow: "inset 0 0 0 3px rgba(255,255,255,0.65)",
    flex: "0 0 auto",
  },
  colorPickerNative: {
    width: "100%",
    height: "42px",
    border: "1px solid #dfe3ec",
    borderRadius: "14px",
    padding: "4px",
    background: "#fff",
    boxSizing: "border-box",
    cursor: "pointer",
  },
  colorHint: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: "#7b8296",
    fontSize: "12px",
    lineHeight: 1.3,
  },
  galleryPreview: {
    minHeight: "118px",
    borderRadius: "20px",
    padding: "16px",
    overflow: "hidden",
    position: "relative",
  },
  galleryPreviewOverlay: {
    height: "100%",
    minHeight: "86px",
    borderRadius: "16px",
    background: "rgba(255,255,255,0.16)",
    border: "1px solid rgba(255,255,255,0.22)",
    backdropFilter: "blur(10px)",
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "12px",
    color: "#fff",
  },
  galleryPreviewLogoWrap: {
    width: "62px",
    height: "62px",
    borderRadius: "20px",
    background: "rgba(255,255,255,0.92)",
    color: "#1e2440",
    display: "grid",
    placeItems: "center",
    overflow: "hidden",
    flex: "0 0 auto",
  },
  galleryPreviewLogo: {
    width: "86%",
    height: "86%",
    objectFit: "contain",
    display: "block",
  },
  galleryPreviewText: {
    display: "grid",
    gap: "4px",
    minWidth: 0,
  },
  galleryPreviewBadge: {
    width: "fit-content",
    background: "rgba(255,255,255,0.18)",
    border: "1px solid rgba(255,255,255,0.22)",
    borderRadius: "999px",
    padding: "4px 9px",
    fontSize: "11px",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: ".04em",
  },
  field: {
    display: "grid",
    gap: "6px",
    minWidth: 0,
  },
  label: {
    color: "#42485c",
    fontWeight: 700,
    fontSize: "14px",
  },
  required: {
    color: "#d9534f",
  },
  input: {
    width: "100%",
    height: "46px",
    borderRadius: "12px",
    border: "1px solid #dfe3ec",
    padding: "0 12px",
    outline: "none",
    fontSize: "14px",
    minWidth: 0,
    boxSizing: "border-box",
  },
  colorInput: {
    width: "100%",
    height: "46px",
    borderRadius: "12px",
    border: "1px solid #dfe3ec",
    padding: "4px",
    background: "#fff",
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    minHeight: "100px",
    borderRadius: "12px",
    border: "1px solid #dfe3ec",
    padding: "12px",
    resize: "vertical",
    outline: "none",
    fontSize: "14px",
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px",
    color: "#42485c",
    fontWeight: 600,
    flexWrap: "wrap",
  },
  primaryButton: {
    height: "48px",
    border: "none",
    borderRadius: "14px",
    background: "#1e2440",
    color: "#fff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    cursor: "pointer",
    fontWeight: 800,
    padding: "0 18px",
  },
  secondaryButton: {
    height: "40px",
    border: "1px solid #dfe3ec",
    borderRadius: "12px",
    background: "#fff",
    color: "#29314d",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    cursor: "pointer",
    fontWeight: 700,
    padding: "0 14px",
    boxSizing: "border-box",
  },
  linkButton: {
    height: "40px",
    border: "1px solid #dfe3ec",
    borderRadius: "12px",
    background: "#fff",
    color: "#29314d",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    textDecoration: "none",
    fontWeight: 700,
    padding: "0 14px",
    boxSizing: "border-box",
  },
  eventList: {
    display: "grid",
    gap: "10px",
  },
  eventItem: {
    width: "100%",
    border: "1px solid #ececf3",
    borderRadius: "14px",
    background: "#fafbff",
    padding: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    cursor: "pointer",
    textAlign: "left",
    boxSizing: "border-box",
  },
  eventItemActive: {
    border: "1px solid #b08968",
    background: "#fff8f3",
  },
  eventName: {
    display: "block",
    color: "#1f2333",
    marginBottom: "4px",
    wordBreak: "break-word",
  },
  eventMeta: {
    fontSize: "13px",
    color: "#687086",
    wordBreak: "break-word",
  },
  infoBox: {
    background: "#f8f9fd",
    border: "1px solid #ececf3",
    borderRadius: "14px",
    padding: "12px 14px",
    marginBottom: "10px",
  },
  infoLabel: {
    display: "block",
    fontSize: "11px",
    color: "#8a90a3",
    textTransform: "uppercase",
    letterSpacing: ".05em",
    marginBottom: "5px",
  },
  infoValue: {
    color: "#23283a",
    fontSize: "14px",
    wordBreak: "break-word",
  },
  linkBox: {
    background: "#f8f9fd",
    border: "1px solid #ececf3",
    borderRadius: "16px",
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
    border: "1px solid #e7eaf2",
    borderRadius: "12px",
    padding: "10px 12px",
    fontSize: "13px",
    color: "#48506a",
    wordBreak: "break-word",
    marginBottom: "10px",
    overflowWrap: "anywhere",
  },
  linkActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  qrCard: {
    marginTop: "12px",
    background: "#f8f9fd",
    border: "1px solid #ececf3",
    borderRadius: "18px",
    padding: "16px",
  },
  qrHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "12px",
    color: "#1f2333",
    flexWrap: "wrap",
  },
  qrPreview: {
    background: "#fff",
    border: "1px solid #e7eaf2",
    borderRadius: "16px",
    display: "grid",
    placeItems: "center",
    padding: "12px",
    marginBottom: "12px",
  },
  qrImage: {
    width: "100%",
    maxWidth: "220px",
    height: "auto",
    display: "block",
  },
  qrActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "10px",
  },
};