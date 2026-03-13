import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Camera, UserPlus, LogIn } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import logo from "../assets/logo.png";

export default function Login() {
  const navigate = useNavigate();

  const [mode, setMode] = useState("login"); // login | register
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  const [registerForm, setRegisterForm] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  function handleLoginChange(e) {
    const { name, value } = e.target;
    setLoginForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleRegisterChange(e) {
    const { name, value } = e.target;
    setRegisterForm((prev) => ({ ...prev, [name]: value }));
  }

  async function getPartnerByEmail(email) {
    const normalizedEmail = email.trim().toLowerCase();

    const { data, error } = await supabase
      .from("partners")
      .select("*")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data || null;
  }

  async function getProfileById(userId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data || null;
  }

  async function createProfileIfMissing(user, fullNameFallback = "") {
    const existingProfile = await getProfileById(user.id);
    if (existingProfile) return existingProfile;

    const partner = await getPartnerByEmail(user.email || "");
    const role = partner ? "partner" : "partner";

    const payload = {
      id: user.id,
      email: (user.email || "").toLowerCase(),
      role,
      active: true,
      full_name:
        fullNameFallback?.trim() ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        "",
    };

    const { error } = await supabase.from("profiles").insert([payload]);
    if (error) throw error;

    return payload;
  }

  async function vincularParceiro(user) {
    if (!user?.email) return null;

    const normalizedEmail = user.email.trim().toLowerCase();

    const { data: partner, error: partnerError } = await supabase
      .from("partners")
      .select("*")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (partnerError) {
      throw partnerError;
    }

    if (partner && !partner.profile_id) {
      const { error: updateError } = await supabase
        .from("partners")
        .update({ profile_id: user.id })
        .eq("id", partner.id);

      if (updateError) {
        throw updateError;
      }
    }

    return partner || null;
  }

  async function syncUserAccess(user, fullNameFallback = "") {
    await vincularParceiro(user);

    let profile = await getProfileById(user.id);

    if (!profile) {
      profile = await createProfileIfMissing(user, fullNameFallback);
    }

    const partner = await getPartnerByEmail(user.email || "");

    if (partner && profile.role !== "admin") {
      const { error } = await supabase
        .from("profiles")
        .update({ role: "partner", active: true })
        .eq("id", user.id);

      if (error) throw error;

      profile = { ...profile, role: "partner", active: true };
    }

    return profile;
  }

  function redirectByRole(profile) {
    if (profile?.role === "admin") {
      navigate("/painel", { replace: true });
      return;
    }

    navigate("/meus-eventos", { replace: true });
  }

  async function handleLoginSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const email = loginForm.email.trim().toLowerCase();
      const password = loginForm.password;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!data?.user) throw new Error("Não foi possível autenticar o usuário.");

      const profile = await syncUserAccess(data.user);
      redirectByRole(profile);
    } catch (error) {
      console.error("Erro no login:", error);
      setMessage(error.message || "Erro ao fazer login.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const fullName = registerForm.fullName.trim();
      const email = registerForm.email.trim().toLowerCase();
      const password = registerForm.password;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            name: fullName,
          },
        },
      });

      if (error) throw error;

      if (!data?.user) {
        throw new Error("Conta criada, mas não foi possível obter o usuário.");
      }

      const profile = await syncUserAccess(data.user, fullName);

      setMessage("Conta criada com sucesso.");
      redirectByRole(profile);
    } catch (error) {
      console.error("Erro no cadastro:", error);
      setMessage(error.message || "Erro ao criar conta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.glowTop} />
      <div style={styles.glowBottom} />

      <div style={styles.card}>
        <div style={styles.logoWrap}>
          <div style={styles.logoBox}>
            <img src={logo} alt="Galeria L’Amour" style={styles.logoImage} />
          </div>
        </div>

        <div style={styles.brand}>
          <div style={styles.brandIcon}>
            <Camera size={22} />
          </div>
          <div>
            <h1 style={styles.title}>Galeria L’Amour</h1>
            <p style={styles.subtitle}>
              Acesse o painel administrativo ou a área do fotógrafo parceiro.
            </p>
          </div>
        </div>

        <div style={styles.tabs}>
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setMessage("");
            }}
            style={{
              ...styles.tabButton,
              ...(mode === "login" ? styles.tabButtonActive : {}),
            }}
          >
            <LogIn size={16} />
            Entrar
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("register");
              setMessage("");
            }}
            style={{
              ...styles.tabButton,
              ...(mode === "register" ? styles.tabButtonActive : {}),
            }}
          >
            <UserPlus size={16} />
            Criar conta
          </button>
        </div>

        {mode === "login" ? (
          <form onSubmit={handleLoginSubmit} style={styles.form}>
            <label style={styles.label}>
              Email
              <input
                type="email"
                name="email"
                value={loginForm.email}
                onChange={handleLoginChange}
                style={styles.input}
                placeholder="seuemail@exemplo.com"
                required
              />
            </label>

            <label style={styles.label}>
              Senha
              <div style={styles.passwordWrap}>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={loginForm.password}
                  onChange={handleLoginChange}
                  style={styles.passwordInput}
                  placeholder="Sua senha"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  style={styles.eyeButton}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            <button type="submit" style={styles.primaryButton} disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit} style={styles.form}>
            <label style={styles.label}>
              Nome completo
              <input
                type="text"
                name="fullName"
                value={registerForm.fullName}
                onChange={handleRegisterChange}
                style={styles.input}
                placeholder="Seu nome"
                required
              />
            </label>

            <label style={styles.label}>
              Email
              <input
                type="email"
                name="email"
                value={registerForm.email}
                onChange={handleRegisterChange}
                style={styles.input}
                placeholder="seuemail@exemplo.com"
                required
              />
            </label>

            <label style={styles.label}>
              Senha
              <div style={styles.passwordWrap}>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={registerForm.password}
                  onChange={handleRegisterChange}
                  style={styles.passwordInput}
                  placeholder="Crie uma senha"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  style={styles.eyeButton}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            <button type="submit" style={styles.primaryButton} disabled={loading}>
              {loading ? "Criando conta..." : "Criar conta"}
            </button>
          </form>
        )}

        {message ? <div style={styles.message}>{message}</div> : null}

        <div style={styles.footerText}>
          Admin entra no painel. Parceiros entram na área de eventos vinculados.
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: "24px",
    background:
      "radial-gradient(circle at top left, rgba(176,137,104,0.14), transparent 22%), radial-gradient(circle at bottom right, rgba(30,36,64,0.16), transparent 25%), linear-gradient(135deg, #f7f3f1 0%, #f1f4fb 50%, #f8f8fc 100%)",
    position: "relative",
    overflow: "hidden",
  },
  glowTop: {
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
  glowBottom: {
    position: "absolute",
    bottom: "-120px",
    right: "-120px",
    width: "340px",
    height: "340px",
    borderRadius: "50%",
    background: "rgba(30,36,64,0.10)",
    filter: "blur(70px)",
    pointerEvents: "none",
  },
  card: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: "480px",
    background: "rgba(255,255,255,0.86)",
    backdropFilter: "blur(14px)",
    border: "1px solid rgba(255,255,255,0.7)",
    borderRadius: "32px",
    padding: "30px",
    boxShadow: "0 20px 60px rgba(24, 32, 79, 0.12)",
  },
  logoWrap: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "22px",
  },
  logoBox: {
    background: "#ffffff",
    border: "1px solid #ececf3",
    borderRadius: "28px",
    padding: "16px 22px",
    boxShadow: "0 14px 36px rgba(24, 32, 79, 0.08)",
  },
  logoImage: {
    height: "150px",
    width: "auto",
    display: "block",
    objectFit: "contain",
    borderRadius: "28px"
  },
  brand: {
    display: "flex",
    gap: "14px",
    alignItems: "center",
    marginBottom: "22px",
  },
  brandIcon: {
    width: "54px",
    height: "54px",
    borderRadius: "18px",
    background: "linear-gradient(135deg, #1e2440 0%, #34406d 100%)",
    color: "#fff",
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
    boxShadow: "0 12px 24px rgba(30,36,64,0.18)",
  },
  title: {
    margin: 0,
    fontSize: "28px",
    color: "#1f2333",
    fontWeight: 800,
  },
  subtitle: {
    margin: "6px 0 0",
    color: "#6a7188",
    fontSize: "14px",
    lineHeight: 1.6,
  },
  tabs: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
    marginBottom: "20px",
    padding: "6px",
    background: "#f4f6fb",
    borderRadius: "18px",
    border: "1px solid #e7ebf3",
  },
  tabButton: {
    height: "46px",
    borderRadius: "14px",
    border: "1px solid transparent",
    background: "transparent",
    color: "#49506a",
    fontWeight: 700,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    transition: "all .2s ease",
  },
  tabButtonActive: {
    background: "linear-gradient(135deg, #1e2440 0%, #34406d 100%)",
    color: "#fff",
    border: "1px solid #1e2440",
    boxShadow: "0 8px 18px rgba(30,36,64,0.16)",
  },
  form: {
    display: "grid",
    gap: "14px",
  },
  label: {
    display: "grid",
    gap: "7px",
    color: "#3f4558",
    fontWeight: 700,
    fontSize: "14px",
  },
  input: {
    height: "48px",
    borderRadius: "16px",
    border: "1px solid #dfe3ec",
    padding: "0 16px",
    outline: "none",
    fontSize: "14px",
    background: "#fff",
    color: "#1f2333",
    boxShadow: "inset 0 1px 2px rgba(15,23,42,0.03)",
  },
  passwordWrap: {
    display: "grid",
    gridTemplateColumns: "1fr 50px",
    border: "1px solid #dfe3ec",
    borderRadius: "16px",
    overflow: "hidden",
    background: "#fff",
    boxShadow: "inset 0 1px 2px rgba(15,23,42,0.03)",
  },
  passwordInput: {
    height: "48px",
    border: "none",
    padding: "0 16px",
    outline: "none",
    fontSize: "14px",
    color: "#1f2333",
    background: "#fff",
  },
  eyeButton: {
    border: "none",
    background: "#fff",
    cursor: "pointer",
    color: "#5f667d",
    display: "grid",
    placeItems: "center",
  },
  primaryButton: {
    height: "50px",
    borderRadius: "16px",
    border: "none",
    background: "linear-gradient(135deg, #1e2440 0%, #34406d 100%)",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
    marginTop: "6px",
    boxShadow: "0 14px 28px rgba(30,36,64,0.18)",
  },
  message: {
    marginTop: "16px",
    background: "#fff7e6",
    border: "1px solid #f0d999",
    color: "#775300",
    borderRadius: "16px",
    padding: "12px 14px",
    fontSize: "14px",
    lineHeight: 1.5,
  },
  footerText: {
    marginTop: "18px",
    color: "#7c8399",
    fontSize: "13px",
    textAlign: "center",
    lineHeight: 1.6,
  },
};