import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  CheckCircle2,
  Image as ImageIcon,
  Lock,
  Save,
  Settings,
  Shield,
  Video,
  UserCircle2,
  LogOut,
  Upload,
  ImagePlus,
} from "lucide-react";
import { supabase } from "../lib/supabase";

const defaultSettings = {
  allow_videos: true,
  max_photo_size_mb: 20,
  max_video_size_mb: 80,
  max_video_duration_seconds: 45,
  require_guest_name: false,
  gallery_mode: "private",
};

const defaultEventForm = {
  name: "",
  description: "",
  cover_url: "",
  logo_url: "",
  primary_color: "#1e2440",
  secondary_color: "#f6f7fb",
  accent_color: "#b08968",
  instructions: "",
  is_upload_open: true,
  event_date: "",
};

export default function EventSettings() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  const [eventData, setEventData] = useState(null);
  const [settingsId, setSettingsId] = useState(null);

  const [form, setForm] = useState(defaultSettings);
  const [eventForm, setEventForm] = useState(defaultEventForm);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "";

  const previewLinks = useMemo(() => {
    if (!eventData?.slug) {
      return {
        uploadUrl: "",
        privateGalleryUrl: "",
        publicGalleryUrl: "",
      };
    }

    return {
      uploadUrl: `${baseUrl}/evento/${eventData.slug}/upload`,
      privateGalleryUrl: `${baseUrl}/evento/${eventData.slug}/galeria`,
      publicGalleryUrl: `${baseUrl}/galeria/${eventData.slug}`,
    };
  }, [eventData, baseUrl]);

  useEffect(() => {
    loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function loadPage() {
    try {
      setAuthLoading(true);
      setLoading(true);
      setMessage("");
      setErrorMessage("");

      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!authUser) {
        setUser(null);
        setProfile(null);
        setEventData(null);
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

      const { data: foundEvent, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (eventError) throw eventError;

      if (!foundEvent) {
        setEventData(null);
        setErrorMessage("Evento não encontrado.");
        return;
      }

      setEventData(foundEvent);

      setEventForm({
        name: foundEvent.name || "",
        description: foundEvent.description || "",
        cover_url: foundEvent.cover_url || "",
        logo_url: foundEvent.logo_url || "",
        primary_color: foundEvent.primary_color || "#1e2440",
        secondary_color: foundEvent.secondary_color || "#f6f7fb",
        accent_color: foundEvent.accent_color || "#b08968",
        instructions: foundEvent.instructions || "",
        is_upload_open:
          typeof foundEvent.is_upload_open === "boolean"
            ? foundEvent.is_upload_open
            : true,
        event_date: foundEvent.event_date || "",
      });

      const isAdminUser = profileData?.role === "admin";
      const isOwner = foundEvent.created_by === authUser.id;
      const isPartner = foundEvent.partner_id === authUser.id;

      if (!isAdminUser && !isOwner && !isPartner) {
        setErrorMessage("Você não tem permissão para acessar este evento.");
        return;
      }

      const { data: foundSettings, error: settingsError } = await supabase
        .from("event_settings")
        .select("*")
        .eq("event_id", foundEvent.id)
        .maybeSingle();

      if (settingsError) throw settingsError;

      if (foundSettings) {
        setSettingsId(foundSettings.id);
        setForm({
          allow_videos:
            typeof foundSettings.allow_videos === "boolean"
              ? foundSettings.allow_videos
              : defaultSettings.allow_videos,
          max_photo_size_mb:
            foundSettings.max_photo_size_mb ?? defaultSettings.max_photo_size_mb,
          max_video_size_mb:
            foundSettings.max_video_size_mb ?? defaultSettings.max_video_size_mb,
          max_video_duration_seconds:
            foundSettings.max_video_duration_seconds ??
            defaultSettings.max_video_duration_seconds,
          require_guest_name:
            typeof foundSettings.require_guest_name === "boolean"
              ? foundSettings.require_guest_name
              : defaultSettings.require_guest_name,
          gallery_mode:
            foundSettings.gallery_mode || defaultSettings.gallery_mode,
        });
      } else {
        const payload = {
          event_id: foundEvent.id,
          ...defaultSettings,
        };

        const { data: createdSettings, error: createError } = await supabase
          .from("event_settings")
          .upsert(payload, { onConflict: "event_id" })
          .select("*")
          .single();

        if (createError) throw createError;

        setSettingsId(createdSettings.id);
        setForm({
          allow_videos:
            typeof createdSettings.allow_videos === "boolean"
              ? createdSettings.allow_videos
              : defaultSettings.allow_videos,
          max_photo_size_mb:
            createdSettings.max_photo_size_mb ??
            defaultSettings.max_photo_size_mb,
          max_video_size_mb:
            createdSettings.max_video_size_mb ??
            defaultSettings.max_video_size_mb,
          max_video_duration_seconds:
            createdSettings.max_video_duration_seconds ??
            defaultSettings.max_video_duration_seconds,
          require_guest_name:
            typeof createdSettings.require_guest_name === "boolean"
              ? createdSettings.require_guest_name
              : defaultSettings.require_guest_name,
          gallery_mode:
            createdSettings.gallery_mode || defaultSettings.gallery_mode,
        });
      }
    } catch (error) {
      console.error("Erro ao carregar configurações do evento:", error);
      setErrorMessage(
        error?.message || "Não foi possível carregar as configurações do evento."
      );
    } finally {
      setAuthLoading(false);
      setLoading(false);
    }
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : name === "max_photo_size_mb" ||
            name === "max_video_size_mb" ||
            name === "max_video_duration_seconds"
          ? Number(value)
          : value,
    }));
  }

  function handleEventChange(event) {
    const { name, value, type, checked } = event.target;

    setEventForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleImageUpload(file, type) {
    if (!file || !eventData?.id) return;

    const isCover = type === "cover";
    const setUploading = isCover ? setUploadingCover : setUploadingLogo;

    try {
      setUploading(true);
      setMessage("");
      setErrorMessage("");

      if (!file.type.startsWith("image/")) {
        throw new Error("Selecione um arquivo de imagem válido.");
      }

      const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const safeExt = fileExt === "jpeg" ? "jpg" : fileExt;
      const fileName = `${type}-${Date.now()}.${safeExt}`;
      const filePath = `${eventData.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("event-images")
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("event-images")
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData?.publicUrl || "";

      if (!publicUrl) {
        throw new Error("Não foi possível obter a URL do arquivo enviado.");
      }

      setEventForm((prev) => ({
        ...prev,
        [isCover ? "cover_url" : "logo_url"]: publicUrl,
      }));

      setMessage(
        isCover ? "Capa enviada com sucesso." : "Logo enviada com sucesso."
      );
    } catch (error) {
      console.error(`Erro ao enviar ${type}:`, error);
      setErrorMessage(
        error?.message ||
          `Não foi possível enviar ${isCover ? "a capa" : "a logo"}.`
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();

    if (!eventData?.id) {
      setErrorMessage("Evento inválido.");
      return;
    }

    if (!eventForm.name.trim()) {
      setErrorMessage("O nome do evento é obrigatório.");
      return;
    }

    if (form.max_photo_size_mb < 1) {
      setErrorMessage("O tamanho máximo de foto deve ser maior que zero.");
      return;
    }

    if (form.allow_videos) {
      if (form.max_video_size_mb < 1) {
        setErrorMessage("O tamanho máximo de vídeo deve ser maior que zero.");
        return;
      }

      if (form.max_video_duration_seconds < 1) {
        setErrorMessage("A duração máxima do vídeo deve ser maior que zero.");
        return;
      }
    }

    try {
      setSaving(true);
      setMessage("");
      setErrorMessage("");

      const eventPayload = {
        name: eventForm.name.trim(),
        description: eventForm.description.trim() || null,
        cover_url: eventForm.cover_url.trim() || null,
        logo_url: eventForm.logo_url.trim() || null,
        primary_color: eventForm.primary_color,
        secondary_color: eventForm.secondary_color,
        accent_color: eventForm.accent_color,
        instructions: eventForm.instructions.trim() || null,
        is_upload_open: eventForm.is_upload_open,
        event_date: eventForm.event_date || null,
      };

      const { data: updatedEvent, error: eventError } = await supabase
        .from("events")
        .update(eventPayload)
        .eq("id", eventData.id)
        .select("*")
        .single();

      if (eventError) throw eventError;

      const settingsPayload = {
        event_id: eventData.id,
        allow_videos: form.allow_videos,
        max_photo_size_mb: Number(form.max_photo_size_mb),
        max_video_size_mb: Number(form.max_video_size_mb),
        max_video_duration_seconds: Number(form.max_video_duration_seconds),
        require_guest_name: form.require_guest_name,
        gallery_mode: form.gallery_mode,
      };

      const { data, error } = await supabase
        .from("event_settings")
        .upsert(settingsPayload, { onConflict: "event_id" })
        .select("*")
        .single();

      if (error) throw error;

      setEventData(updatedEvent);
      setSettingsId(data.id);
      setMessage("Configurações salvas com sucesso.");
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      setErrorMessage(
        error?.message || "Não foi possível salvar as configurações."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
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

  if (authLoading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.loadingCard}>
          <div style={styles.logoBadge}>
            <Settings size={24} />
          </div>
          <h2 style={styles.loadingTitle}>Carregando configurações...</h2>
          <p style={styles.loadingText}>
            Preparando os dados do evento e suas permissões.
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isAdmin = profile?.role === "admin";
  const backLink = isAdmin ? "/painel" : "/meus-eventos";

  function handleBack() {
    navigate(backLink, { replace: true });
  }

  const displayName =
    profile?.studio_name ||
    profile?.full_name ||
    profile?.["full-name"] ||
    user.email ||
    "Usuário";

  return (
    <div style={styles.page}>
      <div style={styles.backgroundGlowTop} />
      <div style={styles.backgroundGlowBottom} />

      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.brandIcon}>
            <Settings size={22} />
          </div>

          <div>
            <div style={styles.brandTitle}>Configurações do Evento</div>
            <div style={styles.brandSubtitle}>
              Painel premium L’Amour Galeria
            </div>
          </div>
        </div>

        <div style={styles.headerRight}>
          <div style={styles.partnerBadge}>
            <UserCircle2 size={18} />
            <div style={styles.partnerBadgeText}>
              <strong style={styles.partnerName}>{displayName}</strong>
              <span style={styles.partnerEmail}>{user.email}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            style={styles.logoutButton}
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </header>

      <main style={styles.main}>
        {message ? (
          <div style={{ ...styles.alert, ...styles.alertSuccess }}>
            {message}
          </div>
        ) : null}

        {errorMessage ? (
          <div style={{ ...styles.alert, ...styles.alertError }}>
            {errorMessage}
          </div>
        ) : null}

        <section style={styles.heroCard}>
          <div>
            <p style={styles.kicker}>Evento selecionado</p>
            <p style={styles.heroSubtitle}>
              Defina como sua galeria vai funcionar para convidados, uploads,
              vídeos e identidade visual.
            </p>
          </div>

          <div style={styles.heroActions}>
            <button
              type="button"
              onClick={() => {
                navigate(backLink, { replace: true });
              }}
              style={styles.ghostButton}
            >
              <ArrowLeft size={16} />
              Voltar
            </button>
          </div>
        </section>

        {loading ? (
          <section style={styles.panelCard}>
            <p style={styles.emptyText}>Carregando informações do evento...</p>
          </section>
        ) : !eventData ? (
          <section style={styles.panelCard}>
            <p style={styles.emptyText}>Evento não encontrado.</p>
            <div style={{ marginTop: 16 }}>
              <button
                type="button"
                onClick={handleBack}
                style={styles.secondaryButton}
              >
                <ArrowLeft size={16} />
                Voltar
              </button>
            </div>
          </section>
        ) : (
          <section style={styles.contentGrid}>
            <div style={styles.leftColumn}>
              <div style={styles.panelCard}>
                <div style={styles.panelHeader}>
                  <div>
                    <p style={styles.kicker}>Resumo</p>
                    <h2 style={styles.panelTitle}>Dados do evento</h2>
                  </div>
                </div>

                <InfoBox label="Nome do evento" value={eventForm.name || eventData.name} />
                <InfoBox label="Slug" value={eventData.slug} />
                <InfoBox
                  label="Data"
                  value={formatDate(eventForm.event_date || eventData.event_date)}
                />
                <InfoBox
                  label="Upload para convidados"
                  value={eventForm.is_upload_open ? "Aberto" : "Fechado"}
                />
                <InfoBox
                  label="Parceiro"
                  value={eventData.partner_name || "Sem parceiro vinculado"}
                />
                <InfoBox
                  label="Link de upload"
                  value={previewLinks.uploadUrl || "—"}
                />
                <InfoBox
                  label="Galeria privada"
                  value={previewLinks.privateGalleryUrl || "—"}
                />
                <InfoBox
                  label="Galeria pública"
                  value={previewLinks.publicGalleryUrl || "—"}
                />
              </div>

              <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                  <div style={styles.statIconWrap}>
                    <ImageIcon size={18} />
                  </div>
                  <div>
                    <div style={styles.statValue}>
                      {form.max_photo_size_mb}MB
                    </div>
                    <div style={styles.statLabel}>Máximo por foto</div>
                  </div>
                </div>

                <div style={styles.statCard}>
                  <div style={styles.statIconWrap}>
                    <Video size={18} />
                  </div>
                  <div>
                    <div style={styles.statValue}>
                      {form.allow_videos ? `${form.max_video_size_mb}MB` : "Off"}
                    </div>
                    <div style={styles.statLabel}>Vídeos</div>
                  </div>
                </div>

                <div style={styles.statCard}>
                  <div style={styles.statIconWrap}>
                    <Lock size={18} />
                  </div>
                  <div>
                    <div style={styles.statValue}>
                      {form.gallery_mode === "private" ? "Privada" : "Pública"}
                    </div>
                    <div style={styles.statLabel}>Modo da galeria</div>
                  </div>
                </div>
              </div>
            </div>

            <div style={styles.rightColumn}>
              <form onSubmit={handleSave} style={styles.panelCard}>
                <div style={styles.panelHeader}>
                  <div>
                    <p style={styles.kicker}>Preferências</p>
                    <h2 style={styles.panelTitle}>Editar configurações</h2>
                  </div>
                </div>

                <div style={styles.formGrid}>
                  <label style={styles.field}>
                    <span style={styles.label}>Nome do evento</span>
                    <input
                      type="text"
                      name="name"
                      value={eventForm.name}
                      onChange={handleEventChange}
                      style={styles.input}
                      placeholder="Ex: Casamento Ana & Pedro"
                    />
                  </label>

                  <label style={styles.field}>
                    <span style={styles.label}>Data do evento</span>
                    <input
                      type="date"
                      name="event_date"
                      value={eventForm.event_date}
                      onChange={handleEventChange}
                      style={styles.input}
                    />
                  </label>

                  <div style={styles.fullWidth}>
                    <label style={styles.field}>
                      <span style={styles.label}>Descrição</span>
                      <textarea
                        name="description"
                        value={eventForm.description}
                        onChange={handleEventChange}
                        style={styles.textarea}
                        placeholder="Descrição do evento"
                      />
                    </label>
                  </div>

                  <div style={styles.fullWidth}>
                    <div style={styles.uploadGroup}>
                      <label style={styles.field}>
                        <span style={styles.label}>URL da capa</span>
                        <input
                          type="text"
                          name="cover_url"
                          value={eventForm.cover_url}
                          onChange={handleEventChange}
                          style={styles.input}
                          placeholder="https://..."
                        />
                      </label>

                      <label style={styles.field}>
                        <span style={styles.label}>Upload da capa</span>
                        <input
                          type="file"
                          accept="image/*"
                          style={styles.fileInput}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file, "cover");
                          }}
                        />
                        <span style={styles.uploadHint}>
                          {uploadingCover
                            ? "Enviando capa..."
                            : "Selecione uma imagem para capa"}
                        </span>
                      </label>
                    </div>
                  </div>

                  <div style={styles.fullWidth}>
                    <div style={styles.uploadGroup}>
                      <label style={styles.field}>
                        <span style={styles.label}>URL da logo</span>
                        <input
                          type="text"
                          name="logo_url"
                          value={eventForm.logo_url}
                          onChange={handleEventChange}
                          style={styles.input}
                          placeholder="https://..."
                        />
                      </label>

                      <label style={styles.field}>
                        <span style={styles.label}>Upload da logo</span>
                        <input
                          type="file"
                          accept="image/*"
                          style={styles.fileInput}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file, "logo");
                          }}
                        />
                        <span style={styles.uploadHint}>
                          {uploadingLogo
                            ? "Enviando logo..."
                            : "Selecione uma imagem para logo"}
                        </span>
                      </label>
                    </div>
                  </div>

                  {eventForm.cover_url ? (
                    <div style={styles.fullWidth}>
                      <div style={styles.previewBox}>
                        <span style={styles.infoLabel}>Prévia da capa</span>
                        <img
                          src={eventForm.cover_url}
                          alt="Prévia da capa"
                          style={styles.previewImage}
                        />
                      </div>
                    </div>
                  ) : null}

                  {eventForm.logo_url ? (
                    <div style={styles.fullWidth}>
                      <div style={styles.previewBox}>
                        <span style={styles.infoLabel}>Prévia da logo</span>
                        <img
                          src={eventForm.logo_url}
                          alt="Prévia da logo"
                          style={styles.previewLogo}
                        />
                      </div>
                    </div>
                  ) : null}

                  <label style={styles.field}>
                    <span style={styles.label}>Cor principal</span>
                    <input
                      type="color"
                      name="primary_color"
                      value={eventForm.primary_color}
                      onChange={handleEventChange}
                      style={styles.colorInput}
                    />
                  </label>

                  <label style={styles.field}>
                    <span style={styles.label}>Cor secundária</span>
                    <input
                      type="color"
                      name="secondary_color"
                      value={eventForm.secondary_color}
                      onChange={handleEventChange}
                      style={styles.colorInput}
                    />
                  </label>

                  <label style={styles.field}>
                    <span style={styles.label}>Cor de destaque</span>
                    <input
                      type="color"
                      name="accent_color"
                      value={eventForm.accent_color}
                      onChange={handleEventChange}
                      style={styles.colorInput}
                    />
                  </label>

                  <div style={styles.fullWidth}>
                    <label style={styles.field}>
                      <span style={styles.label}>Instruções</span>
                      <textarea
                        name="instructions"
                        value={eventForm.instructions}
                        onChange={handleEventChange}
                        style={styles.textarea}
                        placeholder="Orientações para convidados ou equipe"
                      />
                    </label>
                  </div>

                  <div style={styles.fullWidth}>
                    <label style={styles.checkboxRow}>
                      <input
                        type="checkbox"
                        name="is_upload_open"
                        checked={eventForm.is_upload_open}
                        onChange={handleEventChange}
                      />
                      Upload aberto para convidados
                    </label>
                  </div>

                  <label style={styles.field}>
                    <span style={styles.label}>Modo da galeria</span>
                    <select
                      name="gallery_mode"
                      value={form.gallery_mode}
                      onChange={handleChange}
                      style={styles.input}
                    >
                      <option value="private">Privada</option>
                      <option value="public">Pública</option>
                    </select>
                  </label>

                  <label style={styles.field}>
                    <span style={styles.label}>Tamanho máximo da foto (MB)</span>
                    <input
                      type="number"
                      min="1"
                      name="max_photo_size_mb"
                      value={form.max_photo_size_mb}
                      onChange={handleChange}
                      style={styles.input}
                    />
                  </label>

                  <div style={styles.fullWidth}>
                    <label style={styles.checkboxRow}>
                      <input
                        type="checkbox"
                        name="allow_videos"
                        checked={form.allow_videos}
                        onChange={handleChange}
                      />
                      Permitir envio de vídeos
                    </label>
                  </div>

                  <label style={styles.field}>
                    <span style={styles.label}>Tamanho máximo do vídeo (MB)</span>
                    <input
                      type="number"
                      min="1"
                      name="max_video_size_mb"
                      value={form.max_video_size_mb}
                      onChange={handleChange}
                      style={{
                        ...styles.input,
                        ...(form.allow_videos ? {} : styles.inputDisabled),
                      }}
                      disabled={!form.allow_videos}
                    />
                  </label>

                  <label style={styles.field}>
                    <span style={styles.label}>
                      Duração máxima do vídeo (segundos)
                    </span>
                    <input
                      type="number"
                      min="1"
                      name="max_video_duration_seconds"
                      value={form.max_video_duration_seconds}
                      onChange={handleChange}
                      style={{
                        ...styles.input,
                        ...(form.allow_videos ? {} : styles.inputDisabled),
                      }}
                      disabled={!form.allow_videos}
                    />
                  </label>

                  <div style={styles.fullWidth}>
                    <label style={styles.checkboxRow}>
                      <input
                        type="checkbox"
                        name="require_guest_name"
                        checked={form.require_guest_name}
                        onChange={handleChange}
                      />
                      Exigir nome do convidado no envio
                    </label>
                  </div>

                  <div style={styles.fullWidth}>
                    <button
                      type="submit"
                      style={styles.primaryButton}
                      disabled={saving || uploadingCover || uploadingLogo}
                    >
                      <Save size={18} />
                      {saving ? "Salvando..." : "Salvar configurações"}
                    </button>
                  </div>
                </div>
              </form>

              <div style={styles.panelCard}>
                <div style={styles.panelHeader}>
                  <div>
                    <p style={styles.kicker}>Pré-visualização</p>
                    <h2 style={styles.panelTitle}>Status atual</h2>
                  </div>
                </div>

                <div style={styles.statusList}>
                  <StatusRow
                    icon={<Shield size={16} />}
                    label="Modo da galeria"
                    value={form.gallery_mode === "private" ? "Privada" : "Pública"}
                  />
                  <StatusRow
                    icon={<Video size={16} />}
                    label="Vídeos"
                    value={form.allow_videos ? "Permitidos" : "Bloqueados"}
                  />
                  <StatusRow
                    icon={<Camera size={16} />}
                    label="Limite de foto"
                    value={`${form.max_photo_size_mb} MB`}
                  />
                  <StatusRow
                    icon={<CalendarDays size={16} />}
                    label="Limite de vídeo"
                    value={
                      form.allow_videos
                        ? `${form.max_video_size_mb} MB / ${form.max_video_duration_seconds}s`
                        : "Desativado"
                    }
                  />
                  <StatusRow
                    icon={<CheckCircle2 size={16} />}
                    label="Identificação do convidado"
                    value={form.require_guest_name ? "Obrigatória" : "Opcional"}
                  />
                </div>

                <div style={styles.actionsRow}>
                  <button
                    type="button"
                    onClick={() => {
                      navigate(backLink, { replace: true });
                    }}
                    style={styles.secondaryButton}
                  >
                    <ArrowLeft size={16} />
                    Voltar ao painel
                  </button>

                  <Link
                    to={`/evento/${eventData.slug}/galeria`}
                    style={styles.primaryLinkButton}
                  >
                    <ImageIcon size={16} />
                    Abrir galeria
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}
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

function StatusRow({ icon, label, value }) {
  return (
    <div style={styles.statusRow}>
      <div style={styles.statusLeft}>
        <span style={styles.statusIcon}>{icon}</span>
        <span style={styles.statusLabel}>{label}</span>
      </div>
      <strong style={styles.statusValue}>{value}</strong>
    </div>
  );
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
  },
  headerLeft: {
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
  },
  partnerBadgeText: {
    display: "grid",
    gap: "2px",
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
  alert: {
    marginBottom: "18px",
    borderRadius: "16px",
    padding: "14px 16px",
    boxShadow: "0 10px 24px rgba(24,32,79,0.06)",
  },
  alertSuccess: {
    background: "#eef9f1",
    color: "#22663f",
    border: "1px solid #cbe8d4",
  },
  alertError: {
    background: "#fff4e8",
    color: "#8a5a00",
    border: "1px solid #efd7b5",
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
  },
  ghostButton: {
    height: "46px",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: "14px",
    background: "rgba(255,255,255,0.12)",
    color: "#fff",
    padding: "0 18px",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    fontWeight: 700,
    backdropFilter: "blur(8px)",
    cursor: "pointer",
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
  },
  rightColumn: {
    display: "grid",
    gap: "20px",
  },
  panelCard: {
    background: "rgba(255,255,255,0.78)",
    backdropFilter: "blur(14px)",
    border: "1px solid rgba(30,36,64,0.08)",
    borderRadius: "28px",
    padding: "22px",
    boxShadow: "0 14px 36px rgba(24,32,79,0.06)",
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
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "16px",
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
  },
  statIconWrap: {
    width: "46px",
    height: "46px",
    borderRadius: "15px",
    background: "linear-gradient(135deg, #f0dfc6 0%, #edd0a9 100%)",
    color: "#5e4632",
    display: "grid",
    placeItems: "center",
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
  input: {
    height: "46px",
    borderRadius: "12px",
    border: "1px solid #dfe3ec",
    padding: "0 12px",
    outline: "none",
    fontSize: "14px",
    background: "#fff",
    width: "100%",
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
    background: "#fff",
    boxSizing: "border-box",
  },
  uploadGroup: {
    display: "grid",
    gap: "12px",
  },
  fileInput: {
    width: "100%",
    minHeight: "46px",
    borderRadius: "12px",
    border: "1px solid #dfe3ec",
    padding: "10px 12px",
    outline: "none",
    fontSize: "14px",
    background: "#fff",
    boxSizing: "border-box",
  },
  uploadHint: {
    fontSize: "12px",
    color: "#7c8295",
    marginTop: "-2px",
  },
  previewBox: {
    marginTop: "4px",
    background: "#fff",
    border: "1px solid #e7eaf2",
    borderRadius: "14px",
    padding: "10px",
  },
  previewImage: {
    width: "100%",
    maxHeight: "220px",
    objectFit: "cover",
    borderRadius: "10px",
    display: "block",
  },
  previewLogo: {
    maxWidth: "160px",
    maxHeight: "100px",
    objectFit: "contain",
    display: "block",
  },
  inputDisabled: {
    background: "#f2f3f7",
    color: "#8d93a5",
    cursor: "not-allowed",
  },
  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px",
    color: "#42485c",
    fontWeight: 600,
    minHeight: "46px",
  },
  primaryButton: {
    height: "48px",
    border: "none",
    borderRadius: "14px",
    background: "linear-gradient(135deg, #1e2440 0%, #33406b 100%)",
    color: "#fff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    cursor: "pointer",
    fontWeight: 800,
    padding: "0 18px",
    boxShadow: "0 12px 24px rgba(30,36,64,0.16)",
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
  statusList: {
    display: "grid",
    gap: "10px",
  },
  statusRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    padding: "14px",
    borderRadius: "16px",
    background: "#f8f6f2",
    border: "1px solid #eee9e1",
    flexWrap: "wrap",
  },
  statusLeft: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  statusIcon: {
    width: "30px",
    height: "30px",
    borderRadius: "10px",
    background: "#fff",
    border: "1px solid #ebe6dd",
    display: "grid",
    placeItems: "center",
    color: "#7b5e44",
  },
  statusLabel: {
    color: "#4d5367",
    fontSize: "14px",
    fontWeight: 600,
  },
  statusValue: {
    color: "#1f2333",
    fontSize: "14px",
  },
  actionsRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginTop: "16px",
  },
  primaryLinkButton: {
    height: "44px",
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
    padding: "0 16px",
    boxShadow: "0 12px 24px rgba(30,36,64,0.16)",
  },
  secondaryButton: {
    height: "42px",
    border: "1px solid #e1ddd6",
    borderRadius: "14px",
    background: "#fff",
    color: "#29314d",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    fontWeight: 700,
    padding: "0 14px",
    cursor: "pointer",
  },
};