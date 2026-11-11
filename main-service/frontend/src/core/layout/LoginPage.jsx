import { useState } from "react";
import "../theme/login.css";
import agrovisionLogo from "./assets/agrovision.png";
import agrovisionLogo from "./assets/agrovision-white.png";
import premierLogo from "./assets/premier.png";

function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

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
      setError("Cannot connect to server");
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
