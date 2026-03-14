import { Loader2, Camera, LayoutDashboard } from "lucide-react";

export default function PanelLoader({
  title = "Carregando painel...",
  subtitle = "Aguarde enquanto organizamos tudo para você.",
  icon = "dashboard",
}) {
  const Icon = icon === "camera" ? Camera : LayoutDashboard;

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.iconBox}>
          <Icon size={26} />
        </div>

        <div style={styles.spinnerWrap}>
          <Loader2 size={28} style={styles.spinner} />
        </div>

        <h2 style={styles.title}>{title}</h2>
        <p style={styles.subtitle}>{subtitle}</p>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background:
      "linear-gradient(180deg, #f8f9fd 0%, #f1f3f9 100%)",
    padding: "24px",
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    background: "#fff",
    border: "1px solid #ececf3",
    borderRadius: "28px",
    padding: "32px 24px",
    boxShadow: "0 18px 40px rgba(24, 32, 79, 0.08)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
  },
  iconBox: {
    width: "64px",
    height: "64px",
    borderRadius: "20px",
    background: "#1e2440",
    color: "#fff",
    display: "grid",
    placeItems: "center",
    marginBottom: "16px",
  },
  spinnerWrap: {
    marginBottom: "16px",
  },
  spinner: {
    animation: "spin 1s linear infinite",
    color: "#b08968",
  },
  title: {
    margin: "0 0 8px",
    fontSize: "22px",
    color: "#1f2333",
    fontWeight: 800,
  },
  subtitle: {
    margin: 0,
    fontSize: "14px",
    lineHeight: 1.5,
    color: "#687086",
  },
};