import { useEffect, useMemo, useRef, useState } from "react";
import {
  Mail,
  Phone,
  NotebookPen,
  UserRoundPlus,
  Users,
  ShieldCheck,
  Camera,
  Loader2,
  Upload,
  Pencil,
  Power,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

const initialForm = {
  studio_name: "",
  email: "",
  phone: "",
  notes: "",
  active: true,
  avatar_url: "",
};

export default function PartnersPage() {
  const avatarInputRef = useRef(null);

  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [message, setMessage] = useState("");

  const [editingPartnerId, setEditingPartnerId] = useState(null);

  const [form, setForm] = useState(initialForm);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [screenWidth, setScreenWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1440
  );


  useEffect(() => {
    loadPartners();
  }, []);
  useEffect(() => {
    function handleResize() {
      setScreenWidth(window.innerWidth);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const responsive = useMemo(() => {
    const isMobile = screenWidth <= 768;
    const isTablet = screenWidth > 768 && screenWidth <= 1080;

    if (isMobile) {
      return {
        grid: { gridTemplateColumns: "1fr", gap: "16px" },
        title: { fontSize: "26px" },
        avatarCard: {
          flexDirection: "column",
          alignItems: "flex-start",
        },
        avatarInfo: {
          minWidth: 0,
          width: "100%",
        },
        partnerTop: {
          flexDirection: "column",
          alignItems: "flex-start",
        },
        partnerMetaGrid: {
          gridTemplateColumns: "1fr",
        },
        partnerActions: {
          flexDirection: "column",
        },
        actionButton: {
          width: "100%",
        },
        primaryButton: {
          width: "100%",
        },
        secondaryButton: {
          width: "100%",
        },
        formActions: {
          flexDirection: "column",
        },
        card: {
          padding: "18px",
        },
        subtitle: {
          fontSize: "14px",
        },
      };
    }

    if (isTablet) {
      return {
        grid: { gridTemplateColumns: "1fr" },
        title: {},
        avatarCard: {},
        avatarInfo: {},
        partnerTop: {},
        partnerMetaGrid: {
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        },
        partnerActions: {},
        actionButton: {},
        primaryButton: {},
        secondaryButton: {},
        formActions: {},
        card: {},
        subtitle: {},
      };
    }

    return {
      grid: {},
      title: {},
      avatarCard: {},
      avatarInfo: {},
      partnerTop: {},
      partnerMetaGrid: {},
      partnerActions: {},
      actionButton: {},
      primaryButton: {},
      secondaryButton: {},
      formActions: {},
      card: {},
      subtitle: {},
    };
  }, [screenWidth]);


  async function loadPartners() {
    setLoading(true);

    const { data, error } = await supabase
      .from("partners")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setMessage(error.message);
    } else {
      setPartners(data || []);
    }

    setLoading(false);
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function resetForm() {
    setEditingPartnerId(null);
    setForm(initialForm);
    setAvatarPreview("");
    setMessage("");
    if (avatarInputRef.current) {
      avatarInputRef.current.value = "";
    }
  }

  function startEdit(partner) {
    setEditingPartnerId(partner.id);
    setForm({
      studio_name: partner.studio_name || "",
      email: partner.email || "",
      phone: partner.phone || "",
      notes: partner.notes || "",
      active: typeof partner.active === "boolean" ? partner.active : true,
      avatar_url: partner.avatar_url || "",
    });
    setAvatarPreview(partner.avatar_url || "");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function sanitizeFileName(name = "avatar") {
    const parts = name.split(".");
    const ext = parts.length > 1 ? parts.pop() : "jpg";
    const base = parts
      .join(".")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9-_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();

    return `${base || "avatar"}.${ext.toLowerCase()}`;
  }

  async function handleAvatarChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage("Selecione uma imagem válida.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage("A imagem deve ter no máximo 5MB.");
      return;
    }

    try {
      setAvatarUploading(true);
      setMessage("");

      const safeName = sanitizeFileName(file.name);
      const targetFolder = editingPartnerId
        ? `partners/${editingPartnerId}/avatar`
        : `partners/temp`;

      const filePath = `${targetFolder}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("partner-assets")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from("partner-assets")
        .getPublicUrl(filePath);

      const avatarUrl = publicData?.publicUrl || "";

      setAvatarPreview(avatarUrl);
      setForm((prev) => ({
        ...prev,
        avatar_url: avatarUrl,
      }));
    } catch (error) {
      console.error("Erro ao enviar avatar:", error);
      setMessage(error?.message || "Não foi possível enviar a foto.");
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.email.trim()) {
      setMessage("Informe o email do fotógrafo.");
      return;
    }

    if (!form.studio_name.trim()) {
      setMessage("Informe o nome do estúdio.");
      return;
    }

    setSaving(true);
    setMessage("");

    const payload = {
      studio_name: form.studio_name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim() || null,
      notes: form.notes.trim() || null,
      active: form.active,
      avatar_url: form.avatar_url || null,
    };

    let error = null;

    if (editingPartnerId) {
      const response = await supabase
        .from("partners")
        .update(payload)
        .eq("id", editingPartnerId);

      error = response.error;
    } else {
      const response = await supabase.from("partners").insert([payload]);
      error = response.error;
    }

    if (error) {
      console.error(error);
      setMessage(error.message);
    } else {
      setMessage(
        editingPartnerId
          ? "Parceiro atualizado com sucesso."
          : "Parceiro cadastrado com sucesso."
      );
      resetForm();
      await loadPartners();
    }

    setSaving(false);
  }

  async function handleToggleActive(partner) {
    const confirmText = partner.active
      ? `Deseja desativar ${partner.studio_name}?`
      : `Deseja reativar ${partner.studio_name}?`;

    const confirmed = window.confirm(confirmText);
    if (!confirmed) return;

    const { error } = await supabase
      .from("partners")
      .update({ active: !partner.active })
      .eq("id", partner.id);

    if (error) {
      console.error(error);
      setMessage(error.message || "Não foi possível alterar o status do parceiro.");
      return;
    }

    if (editingPartnerId === partner.id) {
      setForm((prev) => ({
        ...prev,
        active: !partner.active,
      }));
    }

    setMessage(
      partner.active
        ? "Parceiro desativado com sucesso."
        : "Parceiro reativado com sucesso."
    );

    await loadPartners();
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <p style={styles.kicker}>Administração</p>
          <h1 style={{ ...styles.title, ...responsive.title }}>Fotógrafos Parceiros</h1>
          <p style={{ ...styles.subtitle, ...responsive.subtitle }}>
            Cadastre parceiros pelo email. Quando eles criarem a conta com o mesmo email,
            o sistema poderá vincular o acesso automaticamente.
          </p>
        </div>
      </div>

      {message ? <div style={styles.alert}>{message}</div> : null}

      <div style={{ ...styles.grid, ...responsive.grid }}>
        <section style={{ ...styles.card, ...responsive.card }}>
          <div style={styles.cardHeader}>
            <div style={styles.cardIcon}>
              <UserRoundPlus size={18} />
            </div>
            <div>
              <h2 style={styles.cardTitle}>
                {editingPartnerId ? "Editar parceiro" : "Novo parceiro"}
              </h2>
              <p style={styles.cardText}>
                {editingPartnerId
                  ? "Atualize os dados do fotógrafo parceiro."
                  : "Cadastre um fotógrafo parceiro no sistema."}
              </p>
            </div>
          </div>

          <div style={styles.avatarSection}>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              style={{ display: "none" }}
            />

            <div style={{ ...styles.avatarCard, ...responsive.avatarCard }}>
              <div style={styles.avatarPreviewWrap}>
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Foto do fotógrafo"
                    style={styles.avatarPreview}
                  />
                ) : (
                  <div style={styles.avatarFallback}>
                    <Camera size={30} />
                  </div>
                )}
              </div>

              <div style={{ ...styles.avatarInfo, ...responsive.avatarInfo }}>
                <h3 style={styles.avatarTitle}>Foto do fotógrafo</h3>
                <p style={styles.avatarText}>
                  Essa foto poderá aparecer no painel, nos detalhes do evento e nas páginas públicas.
                </p>

                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  style={styles.avatarButton}
                  disabled={avatarUploading}
                >
                  {avatarUploading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      {avatarPreview ? "Trocar foto" : "Enviar foto"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            <label style={styles.label}>
              Nome do estúdio
              <div style={styles.inputWrap}>
                <Users size={16} style={styles.inputIcon} />
                <input
                  type="text"
                  name="studio_name"
                  value={form.studio_name}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="Ex: Maxwell Fotografia"
                  required
                />
              </div>
            </label>

            <label style={styles.label}>
              Email do fotógrafo
              <div style={styles.inputWrap}>
                <Mail size={16} style={styles.inputIcon} />
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="fotografo@email.com"
                  required
                />
              </div>
            </label>

            <label style={styles.label}>
              Telefone
              <div style={styles.inputWrap}>
                <Phone size={16} style={styles.inputIcon} />
                <input
                  type="text"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="(79) 99999-9999"
                />
              </div>
            </label>

            <label style={styles.label}>
              Observações
              <div style={styles.textareaWrap}>
                <NotebookPen size={16} style={styles.inputIconTop} />
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  style={styles.textarea}
                  placeholder="Informações adicionais sobre o parceiro"
                />
              </div>
            </label>

            <label style={styles.checkboxRow}>
              <input
                type="checkbox"
                name="active"
                checked={form.active}
                onChange={handleChange}
              />
              Parceiro ativo
            </label>

            <div style={{ ...styles.formActions, ...responsive.formActions }}>
              <button type="submit" style={{ ...styles.primaryButton, ...responsive.primaryButton }} disabled={saving}>
                {saving
                  ? "Salvando..."
                  : editingPartnerId
                  ? "Salvar alterações"
                  : "Cadastrar parceiro"}
              </button>

              {editingPartnerId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  style={{ ...styles.secondaryButton, ...responsive.secondaryButton }}
                >
                  <X size={16} />
                  Cancelar edição
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section style={{ ...styles.card, ...responsive.card }}>
          <div style={styles.cardHeader}>
            <div style={styles.cardIconAlt}>
              <ShieldCheck size={18} />
            </div>
            <div>
              <h2 style={styles.cardTitle}>Parceiros cadastrados</h2>
              <p style={styles.cardText}>
                Veja quem já está cadastrado e se a conta já foi vinculada.
              </p>
            </div>
          </div>

          {loading ? (
            <p style={styles.emptyText}>Carregando parceiros...</p>
          ) : partners.length === 0 ? (
            <p style={styles.emptyText}>Nenhum parceiro cadastrado.</p>
          ) : (
            <div style={styles.list}>
              {partners.map((partner) => (
                <div key={partner.id} style={styles.partnerCard}>
                  <div style={{ ...styles.partnerTop, ...responsive.partnerTop }}>
                    <div style={styles.partnerIdentity}>
                      {partner.avatar_url ? (
                        <img
                          src={partner.avatar_url}
                          alt={partner.studio_name}
                          style={styles.partnerAvatar}
                        />
                      ) : (
                        <div style={styles.partnerAvatarFallback}>
                          <Camera size={18} />
                        </div>
                      )}

                      <div>
                        <strong style={styles.partnerName}>{partner.studio_name}</strong>
                        <p style={styles.partnerEmail}>{partner.email || "Sem email"}</p>
                      </div>
                    </div>

                    <span
                      style={{
                        ...styles.statusBadge,
                        ...(partner.active ? styles.statusActive : styles.statusInactive),
                      }}
                    >
                      {partner.active ? "Ativo" : "Inativo"}
                    </span>
                  </div>

                  <div style={{ ...styles.partnerMetaGrid, ...responsive.partnerMetaGrid }}>
                    <MetaItem label="Telefone" value={partner.phone || "—"} />
                    <MetaItem
                      label="Conta vinculada"
                      value={partner.profile_id ? "Sim" : "Ainda não"}
                    />
                  </div>

                  {partner.notes ? (
                    <div style={styles.notesBox}>
                      <span style={styles.notesLabel}>Observações</span>
                      <p style={styles.notesText}>{partner.notes}</p>
                    </div>
                  ) : null}

                  <div style={{ ...styles.partnerActions, ...responsive.partnerActions }}>
                    <button
                      type="button"
                      onClick={() => startEdit(partner)}
                      style={{ ...styles.actionButton, ...responsive.actionButton }}
                    >
                      <Pencil size={15} />
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleActive(partner)}
                      style={{
                        ...styles.actionButton,
                        ...responsive.actionButton,
                        ...(partner.active
                          ? styles.actionButtonWarn
                          : styles.actionButtonSuccess),
                      }}
                    >
                      <Power size={15} />
                      {partner.active ? "Desativar" : "Reativar"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function MetaItem({ label, value }) {
  return (
    <div style={styles.metaItem}>
      <span style={styles.metaLabel}>{label}</span>
      <strong style={styles.metaValue}>{value}</strong>
    </div>
  );
}

const styles = {
  page: {
    padding: "4px",
    width: "100%",
    boxSizing: "border-box",
  },
  header: {
    marginBottom: "18px",
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
  subtitle: {
    margin: 0,
    color: "#687086",
    lineHeight: 1.6,
    maxWidth: "760px",
  },
  alert: {
    marginBottom: "18px",
    background: "#fff7e6",
    color: "#ddce00",
    border: "1px solid #f0d999",
    borderRadius: "14px",
    padding: "12px 14px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "minmax(320px, 430px) minmax(0, 1fr)",
    gap: "20px",
    alignItems: "start",
  },
  card: {
    background: "#fff",
    border: "1px solid #ececf3",
    borderRadius: "24px",
    padding: "22px",
    boxShadow: "0 12px 30px rgba(24, 32, 79, 0.06)",
    minWidth: 0,
  },
  cardHeader: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    marginBottom: "18px",
  },
  cardIcon: {
    width: "40px",
    height: "40px",
    borderRadius: "14px",
    background: "#1e2440",
    color: "#fff",
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
  },
  cardIconAlt: {
    width: "40px",
    height: "40px",
    borderRadius: "14px",
    background: "#f1e5d8",
    color: "#ddce00",
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
  },
  cardTitle: {
    margin: 0,
    fontSize: "22px",
    color: "#1f2333",
  },
  cardText: {
    margin: "4px 0 0",
    color: "#6f768c",
    fontSize: "14px",
    lineHeight: 1.5,
  },
  avatarSection: {
    marginBottom: "18px",
  },
  avatarCard: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
    flexWrap: "wrap",
    background: "#fafbff",
    border: "1px solid #ececf3",
    borderRadius: "18px",
    padding: "16px",
  },
  avatarPreviewWrap: {
    flexShrink: 0,
  },
  avatarPreview: {
    width: "96px",
    height: "96px",
    borderRadius: "50%",
    objectFit: "cover",
    border: "3px solid rgba(255,255,255,0.9)",
    boxShadow: "0 10px 24px rgba(24,32,79,0.12)",
  },
  avatarFallback: {
    width: "96px",
    height: "96px",
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(135deg, #1e2440 0%, #34406d 100%)",
    color: "#fff",
    boxShadow: "0 10px 24px rgba(24,32,79,0.12)",
  },
  avatarInfo: {
    flex: 1,
    minWidth: "240px",
  },
  avatarTitle: {
    margin: "0 0 6px",
    fontSize: "18px",
    fontWeight: 800,
    color: "#1f2333",
  },
  avatarText: {
    margin: "0 0 14px",
    fontSize: "14px",
    lineHeight: 1.6,
    color: "#6f768b",
  },
  avatarButton: {
    minHeight: "42px",
    borderRadius: "14px",
    border: "1px solid #e1ddd6",
    background: "#fff",
    color: "#29314d",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    cursor: "pointer",
    fontWeight: 700,
    padding: "10px 16px",
  },
  form: {
    display: "grid",
    gap: "14px",
  },
  label: {
    display: "grid",
    gap: "6px",
    color: "#42485c",
    fontWeight: 700,
    fontSize: "14px",
  },
  inputWrap: {
    position: "relative",
  },
  textareaWrap: {
    position: "relative",
  },
  inputIcon: {
    position: "absolute",
    left: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#7b8196",
  },
  inputIconTop: {
    position: "absolute",
    left: "12px",
    top: "14px",
    color: "#7b8196",
  },
  input: {
    width: "100%",
    height: "46px",
    borderRadius: "14px",
    border: "1px solid #dfe3ec",
    padding: "0 12px 0 38px",
    outline: "none",
    fontSize: "14px",
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    minHeight: "110px",
    borderRadius: "14px",
    border: "1px solid #dfe3ec",
    padding: "12px 12px 12px 38px",
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
  },
  formActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginTop: "4px",
  },
  primaryButton: {
    height: "48px",
    border: "none",
    borderRadius: "14px",
    background: "#1e2440",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
    padding: "0 18px",
  },
  secondaryButton: {
    height: "48px",
    border: "1px solid #dfe3ec",
    borderRadius: "14px",
    background: "#fff",
    color: "#29314d",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    cursor: "pointer",
    fontWeight: 700,
    padding: "0 16px",
  },
  emptyText: {
    color: "#687086",
    fontSize: "14px",
  },
  list: {
    display: "grid",
    gap: "14px",
  },
  partnerCard: {
    border: "1px solid #ececf3",
    borderRadius: "18px",
    padding: "16px",
    background: "#fafbff",
  },
  partnerTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    marginBottom: "14px",
  },
  partnerIdentity: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    minWidth: 0,
  },
  partnerAvatar: {
    width: "52px",
    height: "52px",
    borderRadius: "50%",
    objectFit: "cover",
    flexShrink: 0,
    border: "2px solid #fff",
    boxShadow: "0 8px 18px rgba(24,32,79,0.12)",
  },
  partnerAvatarFallback: {
    width: "52px",
    height: "52px",
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(135deg, #1e2440 0%, #34406d 100%)",
    color: "#fff",
    flexShrink: 0,
    boxShadow: "0 8px 18px rgba(24,32,79,0.12)",
  },
  partnerName: {
    display: "block",
    color: "#1f2333",
    fontSize: "16px",
    marginBottom: "4px",
  },
  partnerEmail: {
    margin: 0,
    color: "#6f768c",
    fontSize: "14px",
    wordBreak: "break-word",
  },
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "30px",
    padding: "0 12px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 800,
    whiteSpace: "nowrap",
  },
  statusActive: {
    background: "#e9f8ef",
    color: "#257a45",
  },
  statusInactive: {
    background: "#f3f4f7",
    color: "#7c8399",
  },
  partnerMetaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "10px",
    marginBottom: "12px",
  },
  metaItem: {
    background: "#fff",
    border: "1px solid #e7eaf2",
    borderRadius: "12px",
    padding: "10px 12px",
  },
  metaLabel: {
    display: "block",
    fontSize: "11px",
    color: "#8a90a3",
    textTransform: "uppercase",
    letterSpacing: ".05em",
    marginBottom: "5px",
  },
  metaValue: {
    color: "#23283a",
    fontSize: "14px",
    wordBreak: "break-word",
  },
  notesBox: {
    background: "#fff",
    border: "1px solid #e7eaf2",
    borderRadius: "12px",
    padding: "12px",
    marginBottom: "12px",
  },
  notesLabel: {
    display: "block",
    fontSize: "11px",
    color: "#8a90a3",
    textTransform: "uppercase",
    letterSpacing: ".05em",
    marginBottom: "6px",
  },
  notesText: {
    margin: 0,
    color: "#4c536b",
    fontSize: "14px",
    lineHeight: 1.5,
    whiteSpace: "pre-wrap",
  },
  partnerActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  actionButton: {
    minHeight: "40px",
    borderRadius: "12px",
    border: "1px solid #dfe3ec",
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
  actionButtonWarn: {
    border: "1px solid #f0d4d4",
    color: "#9b2e2e",
    background: "#fff7f7",
  },
  actionButtonSuccess: {
    border: "1px solid #cfe8d5",
    color: "#257a45",
    background: "#f3fbf5",
  },
};