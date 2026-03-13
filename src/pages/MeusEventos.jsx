import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function MeusEventos() {
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState(null);
  const [partner, setPartner] = useState(null);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
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
                 setEvents([]);
                 setLoading(false);
             return;
        }

        setPartner(partnerData);

        const { data: eventsData, error: eventsError } = await supabase
          .from("events")
          .select("id, name, slug, description, cover_url, created_at, is_upload_open, partner_id")
          .eq("partner_id", partnerData.id)
          .order("created_at", { ascending: false });

        if (eventsError) throw eventsError;

        setEvents(eventsData || []);
      } catch (err) {
        console.error("Erro ao carregar meus eventos:", err);
        setError(err.message || "Erro ao carregar os eventos.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (authChecked && !user && !loading) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <p style={styles.kicker}>Área do parceiro</p>
            <h1 style={styles.title}>Meus eventos</h1>
            <p style={styles.subtitle}>
              Aqui você encontra apenas os eventos vinculados à sua conta.
            </p>
          </div>

          {partner && (
            <div style={styles.partnerBadge}>
              <span style={styles.partnerLabel}>Parceiro</span>
              <strong>{partner.name}</strong>
            </div>
          )}
        </div>

        {loading && (
          <div style={styles.stateBox}>
            <p>Carregando seus eventos...</p>
          </div>
        )}

        {!loading && error && (
          <div style={styles.stateBoxError}>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && !partner && (
          <div style={styles.stateBox}>
            <p>
              Nenhum parceiro vinculado foi encontrado para este login.
            </p>
            <p style={styles.helperText}>
              Confira se o email do usuário é o mesmo email cadastrado na tabela
              <strong> partners</strong>.
            </p>
          </div>
        )}

        {!loading && !error && partner && events.length === 0 && (
          <div style={styles.stateBox}>
            <p>Você ainda não possui eventos vinculados.</p>
          </div>
        )}

        {!loading && !error && events.length > 0 && (
          <div style={styles.grid}>
            {events.map((event) => (
              <div key={event.id} style={styles.card}>
                <div
                  style={{
                    ...styles.cover,
                    backgroundImage: event.cover_url
                      ? `linear-gradient(rgba(13,18,40,.35), rgba(13,18,40,.45)), url(${event.cover_url})`
                      : "linear-gradient(135deg, #d8c3c3 0%, #efe4e4 100%)",
                  }}
                >
                  <span style={styles.statusBadge}>
                    {event.is_upload_open ? "Upload aberto" : "Upload fechado"}
                  </span>

                  <h2 style={styles.cardTitle}>{event.name}</h2>

                  <p style={styles.cardDescription}>
                    {event.description || "Sem descrição cadastrada."}
                  </p>
                </div>

                <div style={styles.cardBody}>
                  <div style={styles.metaBox}>
                    <span style={styles.metaLabel}>Slug</span>
                    <strong style={styles.metaValue}>{event.slug}</strong>
                  </div>

                  <div style={styles.metaBox}>
                    <span style={styles.metaLabel}>Criado em</span>
                    <strong style={styles.metaValue}>
                      {new Date(event.created_at).toLocaleDateString("pt-BR")}
                    </strong>
                  </div>

                  <div style={styles.actions}>
                    <Link to={`/meus-eventos/${event.slug}`} style={styles.primaryButton}>
                             Ver detalhes
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f6f7fb",
    padding: "32px 16px",
  },
  container: {
    width: "100%",
    maxWidth: "1100px",
    margin: "0 auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    alignItems: "flex-start",
    flexWrap: "wrap",
    marginBottom: "24px",
  },
  kicker: {
    margin: 0,
    color: "#b08968",
    fontWeight: 700,
    fontSize: "14px",
  },
  title: {
    margin: "6px 0 8px",
    fontSize: "32px",
    color: "#1e1f2a",
  },
  subtitle: {
    margin: 0,
    color: "#666b7a",
    fontSize: "15px",
  },
  partnerBadge: {
    background: "#fff",
    border: "1px solid #ececf3",
    borderRadius: "16px",
    padding: "14px 16px",
    minWidth: "220px",
    boxShadow: "0 8px 30px rgba(24, 32, 79, 0.06)",
  },
  partnerLabel: {
    display: "block",
    fontSize: "12px",
    color: "#7f8596",
    marginBottom: "6px",
  },
  stateBox: {
    background: "#fff",
    border: "1px solid #ececf3",
    borderRadius: "18px",
    padding: "24px",
    color: "#2e3240",
  },
  stateBoxError: {
    background: "#fff1f1",
    border: "1px solid #ffd2d2",
    borderRadius: "18px",
    padding: "24px",
    color: "#9f2d2d",
  },
  helperText: {
    marginTop: "10px",
    color: "#667085",
    fontSize: "14px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "20px",
  },
  card: {
    background: "#fff",
    borderRadius: "24px",
    overflow: "hidden",
    border: "1px solid #ececf3",
    boxShadow: "0 14px 32px rgba(24, 32, 79, 0.07)",
  },
  cover: {
    minHeight: "180px",
    backgroundSize: "cover",
    backgroundPosition: "center",
    padding: "18px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    color: "#fff",
  },
  statusBadge: {
    alignSelf: "flex-start",
    background: "rgba(255,255,255,0.18)",
    color: "#fff",
    padding: "8px 12px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
    backdropFilter: "blur(4px)",
  },
  cardTitle: {
    margin: "18px 0 8px",
    fontSize: "26px",
    lineHeight: 1.2,
  },
  cardDescription: {
    margin: 0,
    fontSize: "14px",
    opacity: 0.95,
  },
  cardBody: {
    padding: "18px",
  },
  metaBox: {
    background: "#f8f8fc",
    border: "1px solid #ececf3",
    borderRadius: "14px",
    padding: "12px 14px",
    marginBottom: "12px",
  },
  metaLabel: {
    display: "block",
    fontSize: "12px",
    color: "#848a9c",
    marginBottom: "4px",
  },
  metaValue: {
    color: "#252839",
    fontSize: "14px",
    wordBreak: "break-word",
  },
  actions: {
    marginTop: "16px",
  },
  primaryButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "44px",
    padding: "0 18px",
    borderRadius: "12px",
    background: "#1d2440",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 700,
  },
};