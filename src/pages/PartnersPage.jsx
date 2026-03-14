import { useEffect, useState } from "react";
import { Mail, Phone, NotebookPen, UserRoundPlus, Users, ShieldCheck } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export default function PartnersPage() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    studio_name: "",
    email: "",
    phone: "",
    notes: "",
    active: true,
  });

  useEffect(() => {
    loadPartners();
  }, []);

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
    };

    const { error } = await supabase.from("partners").insert([payload]);

    if (error) {
      console.error(error);
      setMessage(error.message);
    } else {
      setMessage("Parceiro cadastrado com sucesso.");
      setForm({
        studio_name: "",
        email: "",
        phone: "",
        notes: "",
        active: true,
      });
      await loadPartners();
    }

    setSaving(false);
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <p style={styles.kicker}>Administração</p>
          <h1 style={styles.title}>Fotógrafos Parceiros</h1>
          <p style={styles.subtitle}>
            Cadastre parceiros pelo email. Quando eles criarem a conta com o mesmo email,
            o sistema poderá vincular o acesso automaticamente.
          </p>
        </div>
      </div>

      {message ? <div style={styles.alert}>{message}</div> : null}

      <div style={styles.grid}>
        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardIcon}>
              <UserRoundPlus size={18} />
            </div>
            <div>
              <h2 style={styles.cardTitle}>Novo parceiro</h2>
              <p style={styles.cardText}>Cadastre um fotógrafo parceiro no sistema.</p>
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

            <button type="submit" style={styles.primaryButton} disabled={saving}>
              {saving ? "Salvando..." : "Cadastrar parceiro"}
            </button>
          </form>
        </section>

        <section style={styles.card}>
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
                  <div style={styles.partnerTop}>
                    <div>
                      <strong style={styles.partnerName}>{partner.studio_name}</strong>
                      <p style={styles.partnerEmail}>{partner.email || "Sem email"}</p>
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

                  <div style={styles.partnerMetaGrid}>
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
  primaryButton: {
    height: "48px",
    border: "none",
    borderRadius: "14px",
    background: "#1e2440",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
    marginTop: "4px",
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
};