import { useState } from "react";
import "../theme/login.css";
import agrovisionLogo from "./assets/agrovision.png";

function ForcePasswordChangePage({ user, onPasswordChanged, onLogout }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("kip_token");
      const response = await fetch("/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ newPassword }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.message || "Failed to update password");
        setLoading(false);
        return;
      }

      const data = await response.json();
      if (data && data.user) {
        if (data.token) {
          localStorage.setItem("kip_token", data.token);
        }
        alert("Password updated successfully! Welcome to AGROVISION SCADA.");
        onPasswordChanged(data.user);
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
        <header className="som-login-header" style={{ marginBottom: "1rem", flexDirection: "column", alignItems: "center" }}>
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
          <div className="som-login-title-block" style={{ marginTop: "1rem", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: '#fef3c7', color: '#d97706', padding: '6px 14px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 'bold', letterSpacing: '0.05em', marginBottom: '12px', gap: '6px', border: '1px solid #fde68a' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              SECURITY NOTICE
            </div>
            <h2 className="som-login-title" style={{ fontSize: "1.5rem", fontWeight: "800", color: "#0f172a", margin: "0 0 8px 0" }}>CHANGE PASSWORD</h2>
            <p className="som-login-subtitle" style={{ fontSize: "0.85rem", color: "#64748b", lineHeight: "1.5", padding: "0 10px", margin: "0" }}>
              Hi <strong style={{ color: '#0f172a' }}>{user.username}</strong>, this is your first time logging in.<br/>Please set a new secure password.
            </p>
          </div>
        </header>
        <form className="som-login-form" onSubmit={handleSubmit}>
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
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New Password (min 6 chars)"
                autoComplete="new-password"
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
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm New Password"
                autoComplete="new-password"
                required
              />
            </div>
          </div>

          {error && <p className="som-login-error" style={{ color: '#ef4444', fontSize: '0.85rem', textAlign: 'center', margin: '0' }}>{error}</p>}
          <button className="som-login-button" type="submit" disabled={loading} style={{ padding: '14px', borderRadius: '10px' }}>
            {loading ? "Updating password…" : "UPDATE PASSWORD"}
          </button>
          
          <button 
            type="button" 
            onClick={onLogout}
            style={{
              width: "100%",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              color: "#64748b",
              padding: "14px",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: "700",
              fontSize: "0.85rem",
              marginTop: "4px",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "#f1f5f9";
              e.target.style.color = "#475569";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "#f8fafc";
              e.target.style.color = "#64748b";
            }}
          >
            CANCEL & LOGOUT
          </button>
        </form>
        <footer className="som-login-footer">
          <span className="som-login-status-dot" style={{ backgroundColor: "#f59e0b", boxShadow: "0 0 8px #f59e0b" }} />
          <span className="som-login-status-text">
            Security Enforced by <span className="premier-brand">PREMIER<sup>TM</sup></span>
          </span>
        </footer>
      </div>
    </div>
  );
}

export default ForcePasswordChangePage;
