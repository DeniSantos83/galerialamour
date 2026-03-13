import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Camera, UserPlus, LogIn } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

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
      .select('*')
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

    // Se existir parceiro com o email, garantimos role partner
    // sem sobrescrever admin.
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
      <div style={styles.card}>
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
      "linear-gradient(135deg, #f7f3f1 0%, #f1f4fb 50%, #f8f8fc 100%)",
  },
  card: {
    width: "100%",
    maxWidth: "460px",
    background: "#ffffff",
    border: "1px solid #ececf3",
    borderRadius: "28px",
    padding: "28px",
    boxShadow: "0 18px 50px rgba(24, 32, 79, 0.10)",
  },
  brand: {
    display: "flex",
    gap: "14px",
    alignItems: "center",
    marginBottom: "20px",
  },
  brandIcon: {
    width: "52px",
    height: "52px",
    borderRadius: "18px",
    background: "#1e2440",
    color: "#fff",
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
  },
  title: {
    margin: 0,
    fontSize: "28px",
    color: "#1f2333",
  },
  subtitle: {
    margin: "6px 0 0",
    color: "#6a7188",
    fontSize: "14px",
    lineHeight: 1.5,
  },
  tabs: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
    marginBottom: "18px",
  },
  tabButton: {
    height: "44px",
    borderRadius: "14px",
    border: "1px solid #e3e7ef",
    background: "#f8f9fd",
    color: "#49506a",
    fontWeight: 700,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },
  tabButtonActive: {
    background: "#1e2440",
    color: "#fff",
    border: "1px solid #1e2440",
  },
  form: {
    display: "grid",
    gap: "14px",
  },
  label: {
    display: "grid",
    gap: "6px",
    color: "#3f4558",
    fontWeight: 700,
    fontSize: "14px",
  },
  input: {
    height: "46px",
    borderRadius: "14px",
    border: "1px solid #dfe3ec",
    padding: "0 14px",
    outline: "none",
    fontSize: "14px",
  },
  passwordWrap: {
    display: "grid",
    gridTemplateColumns: "1fr 46px",
    border: "1px solid #dfe3ec",
    borderRadius: "14px",
    overflow: "hidden",
    background: "#fff",
  },
  passwordInput: {
    height: "46px",
    border: "none",
    padding: "0 14px",
    outline: "none",
    fontSize: "14px",
  },
  eyeButton: {
    border: "none",
    background: "#fff",
    cursor: "pointer",
    color: "#5f667d",
  },
  primaryButton: {
    height: "48px",
    borderRadius: "14px",
    border: "none",
    background: "#1e2440",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
    marginTop: "4px",
  },
  message: {
    marginTop: "16px",
    background: "#fff7e6",
    border: "1px solid #f0d999",
    color: "#775300",
    borderRadius: "14px",
    padding: "12px 14px",
    fontSize: "14px",
  },
  footerText: {
    marginTop: "16px",
    color: "#7c8399",
    fontSize: "13px",
    textAlign: "center",
  },
};