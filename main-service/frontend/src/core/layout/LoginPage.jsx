import { useState } from "react";
import "../theme/login.css";

function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePortfolioLogin = () => {
    const demoUser = {
      id: 1,
      username: "portfolio_demo",
      name: "Demo Engineer",
      role: "developer",
      userRole: "developer",
      permissions: ["all"],
      mustChangePassword: false,
    };
    localStorage.setItem("kip_token", "demo-portfolio-token");
    onLoginSuccess(demoUser);
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    // Quick portfolio credentials bypass
    if (username.toLowerCase() === "demo" || username.toLowerCase() === "admin") {
      handlePortfolioLogin();
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.message || "Login failed");
        setLoading(false);
        return;
      }

      const data = await response.json();
      setUsername("");
      setPassword("");
      if (data && data.user) {
        localStorage.setItem("kip_token", data.token);
        onLoginSuccess(data.user);
      }
    } catch (err) {
      // Backend not running / offline -> Offer instant portfolio mode fallback
      handlePortfolioLogin();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="som-login-shell">
      <div className="som-login-panel">
        <header className="som-login-header">
          <div className="som-login-logo-group">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #047857 0%, #065f46 100%)',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '1rem',
                letterSpacing: '0.05em'
              }}>AV</span>
              <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', lineHeight: 1.2 }}>
                <span style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '0.08em', color: '#0f172a' }}>
                  AGROVISION
                </span>
                <span style={{ color: '#059669', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.04em' }}>
                  // Industrial AI SCADA
                </span>
              </div>
            </div>
            <div className="som-login-divider"></div>
          </div>
        </header>
        <form className="som-login-form" onSubmit={handleLogin}>
          <div className="som-login-field">
            <div className="som-login-input-wrapper">
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="som-login-icon"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div className="som-login-field">
            <div className="som-login-input-wrapper">
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="som-login-icon"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          {error && <p className="som-login-error">{error}</p>}
          <button className="som-login-button" type="submit" disabled={loading}>
            {loading ? "Signing in…" : "LOGIN"}
          </button>
          <div style={{ margin: "14px 0 6px", display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ flex: 1, height: "1px", background: "rgba(0,0,0,0.08)" }} />
            <span style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Atau</span>
            <div style={{ flex: 1, height: "1px", background: "rgba(0,0,0,0.08)" }} />
          </div>
          <button
            type="button"
            onClick={handlePortfolioLogin}
            className="som-login-button"
            style={{
              background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
              boxShadow: "0 4px 14px rgba(5, 150, 105, 0.25)",
              color: "#ffffff",
              cursor: "pointer"
            }}
          >
            ⚡ ENTER PORTFOLIO PREVIEW MODE
          </button>
        </form>
        <footer className="som-login-footer">
          <span className="som-login-status-dot" />
          <span className="som-login-status-text">
            Portfolio Edition &bull;{" "}
            <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#059669' }}>
              &lt; &#123;definedbykevin&#125; /&gt;
            </span>
          </span>
        </footer>
      </div>
    </div>
  );
}

export default LoginPage;
