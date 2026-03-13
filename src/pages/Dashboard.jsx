import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import QRCode from "qrcode";
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
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { slugify } from "../lib/utils";
import PartnersPage from "./PartnersPage";

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
        .select('*')
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
  async function loadEvents() {
  try {
    setLoadingEvents(true);

    const { data, error } = await supabase
      .from("events")
      .select(`*,event_settings (*)`)
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
      <div style={styles.centerScreen}>
        <p>Carregando painel...</p>
      </div>
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
    <div style={styles.page}>
      <aside style={styles.sidebar}>
        <div>
          <div style={styles.brand}>
            <div style={styles.brandIcon}>
              <LayoutDashboard size={18} />
            </div>
            <div>
              <div style={styles.brandTitle}>Painel L’Amour</div>
              <div style={styles.brandSubtitle}>Administração</div>
            </div>
          </div>

          <div style={styles.menu}>
            <button
              type="button"
              onClick={() => setActiveTab("eventos")}
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
              onClick={() => setActiveTab("parceiros")}
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

      <main style={styles.main}>
        {message ? <div style={styles.alert}>{message}</div> : null}

        {activeTab === "eventos" && (
          <div style={styles.contentGrid}>
            <section style={styles.card}>
              <div style={styles.sectionHeader}>
                <div>
                  <p style={styles.kicker}>Administração</p>
                  <h1 style={styles.title}>Criar novo evento</h1>
                  <p style={styles.subtitle}>
                    Crie eventos, vincule a um fotógrafo parceiro e gere links prontos.
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreateEvent} style={styles.formGrid}>
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
                    <option value="">Nenhum parceiro vinculado</option>
                    {partners.map((partner) => (
                      <option key={partner.id} value={partner.id}>
                        {partner.studio_name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="URL da capa">
                  <input
                    type="text"
                    name="cover_url"
                    value={form.cover_url}
                    onChange={handleChange}
                    style={styles.input}
                    placeholder="https://..."
                  />
                </Field>

                <Field label="URL da logo">
                  <input
                    type="text"
                    name="logo_url"
                    value={form.logo_url}
                    onChange={handleChange}
                    style={styles.input}
                    placeholder="https://..."
                  />
                </Field>

                <Field label="Cor principal">
                  <input
                    type="color"
                    name="primary_color"
                    value={form.primary_color}
                    onChange={handleChange}
                    style={styles.colorInput}
                  />
                </Field>

                <Field label="Cor secundária">
                  <input
                    type="color"
                    name="secondary_color"
                    value={form.secondary_color}
                    onChange={handleChange}
                    style={styles.colorInput}
                  />
                </Field>

                <Field label="Cor de destaque">
                  <input
                    type="color"
                    name="accent_color"
                    value={form.accent_color}
                    onChange={handleChange}
                    style={styles.colorInput}
                  />
                </Field>

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
                  <button type="submit" style={styles.primaryButton} disabled={saving}>
                    <PlusCircle size={18} />
                    {saving ? "Salvando..." : "Criar evento"}
                  </button>
                </div>
              </form>
            </section>

            <section style={styles.rightColumn}>
              <div style={styles.card}>
                <div style={styles.sectionHeaderSmall}>
                  <div>
                    <p style={styles.kicker}>Eventos</p>
                    <h2 style={styles.sectionTitle}>Eventos criados</h2>
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
                        }}
                      >
                        <div>
                          <strong style={styles.eventName}>{event.name}</strong>
                          <div style={styles.eventMeta}>
                            {event.partner_name || "Sem parceiro"} • {event.slug}
                          </div>
                        </div>

                        {event.is_upload_open ? (
                          <CheckCircle2 size={18} color="#2e8b57" />
                        ) : (
                          <Globe size={18} color="#999" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div style={styles.card}>
                <div style={styles.sectionHeaderSmall}>
                  <div>
                    <p style={styles.kicker}>Resumo</p>
                    <h2 style={styles.sectionTitle}>Links do evento</h2>
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
                    />

                    <LinkBox
                      icon={<ExternalLink size={16} />}
                      title="Galeria privada"
                      url={selectedLinks.privateGalleryUrl}
                      onCopy={() =>
                        copyText(selectedLinks.privateGalleryUrl, "private")
                      }
                      copied={copiedKey === "private"}
                    />

                    <LinkBox
                      icon={<Globe size={16} />}
                      title="Galeria pública"
                      url={selectedLinks.publicGalleryUrl}
                      onCopy={() =>
                        copyText(selectedLinks.publicGalleryUrl, "public")
                      }
                      copied={copiedKey === "public"}
                    />

                    <div style={styles.qrCard}>
                      <div style={styles.qrHeader}>
                        <QrCode size={18} />
                        <strong>QR Code do upload</strong>
                      </div>

                      <div style={styles.qrPreview}>
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

                      <div style={styles.qrActions}>
                        <button
                          type="button"
                          onClick={() => copyText(selectedLinks.uploadUrl, "qrlink")}
                          style={styles.secondaryButton}
                        >
                          <Copy size={16} />
                          {copiedKey === "qrlink" ? "Copiado!" : "Copiar link"}
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

function LinkBox({ icon, title, url, onCopy, copied }) {
  return (
    <div style={styles.linkBox}>
      <div style={styles.linkBoxTitle}>
        <span style={styles.linkIcon}>{icon}</span>
        <strong>{title}</strong>
      </div>

      <div style={styles.linkUrl}>{url}</div>

      <div style={styles.linkActions}>
        <button type="button" onClick={onCopy} style={styles.secondaryButton}>
          <Copy size={16} />
          {copied ? "Copiado!" : "Copiar"}
        </button>

        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          style={styles.linkButton}
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
    gridTemplateColumns: "280px 1fr",
    background: "#f6f7fb",
  },
  centerScreen: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#f6f7fb",
    color: "#29314d",
  },
  sidebar: {
    background: "#1e2440",
    color: "#fff",
    padding: "24px 18px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: "24px",
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
  },
  main: {
    padding: "24px",
  },
  alert: {
    marginBottom: "18px",
    background: "#fff7e6",
    color: "#ddce00",
    border: "1px solid #f0d999",
    borderRadius: "14px",
    padding: "12px 14px",
  },
  contentGrid: {
    display: "grid",
    gridTemplateColumns: "1.25fr 0.95fr",
    gap: "20px",
    alignItems: "start",
  },
  rightColumn: {
    display: "grid",
    gap: "20px",
  },
  card: {
    background: "#fff",
    border: "1px solid #ececf3",
    borderRadius: "24px",
    padding: "22px",
    boxShadow: "0 12px 30px rgba(24, 32, 79, 0.06)",
  },
  sectionHeader: {
    marginBottom: "18px",
  },
  sectionHeaderSmall: {
    marginBottom: "16px",
  },
  kicker: {
    margin: 0,
    color: "#ddce00",
    fontWeight: 700,
    fontSize: "13px",
  },
  title: {
    margin: "6px 0 8px",
    fontSize: "30px",
    color: "#1f2333",
  },
  sectionTitle: {
    margin: "6px 0 0",
    fontSize: "22px",
    color: "#1f2333",
  },
  subtitle: {
    margin: 0,
    color: "#687086",
    fontSize: "14px",
    lineHeight: 1.5,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "14px",
  },
  fullWidth: {
    gridColumn: "1 / -1",
  },
  field: {
    display: "grid",
    gap: "6px",
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
    height: "46px",
    borderRadius: "12px",
    border: "1px solid #dfe3ec",
    padding: "0 12px",
    outline: "none",
    fontSize: "14px",
  },
  colorInput: {
    width: "100%",
    height: "46px",
    borderRadius: "12px",
    border: "1px solid #dfe3ec",
    padding: "4px",
    background: "#fff",
  },
  textarea: {
    minHeight: "100px",
    borderRadius: "12px",
    border: "1px solid #dfe3ec",
    padding: "12px",
    resize: "vertical",
    outline: "none",
    fontSize: "14px",
    fontFamily: "inherit",
  },
  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px",
    color: "#42485c",
    fontWeight: 600,
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
  },
  eventItemActive: {
    border: "1px solid #ddce00",
    background: "#fff8f3",
  },
  eventName: {
    display: "block",
    color: "#1f2333",
    marginBottom: "4px",
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
  },
  linkIcon: {
    display: "inline-flex",
    color: "#ddce00",
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
  },
  qrPreview: {
    background: "#fff",
    border: "1px solid #e7eaf2",
    borderRadius: "16px",
    minHeight: "220px",
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