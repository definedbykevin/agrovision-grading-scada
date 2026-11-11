import { useEffect, useState } from 'react'
import LoginPage from './core/layout/LoginPage.jsx'
import DashboardPage from './DashboardPage.jsx'
import OrientationGuard from './core/components/OrientationGuard.jsx'
import ForcePasswordChangePage from './core/layout/ForcePasswordChangePage.jsx'
import SecurityStationPage from '@stations/security/SecurityStationPage.jsx'

function App() {
  const [user, setUser] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)

  // Direct Mobile Embed Bypass: If ?mode=mobile is present in URL, render SecurityStationPage directly
  const urlParams = new URLSearchParams(window.location.search);
  const isMobileEmbed = urlParams.get('mode') === 'mobile';

  // Enforce light theme globally (AGROVISION Standard)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light')
  }, [])

  useEffect(() => {
    let cancelled = false

    const checkSession = async () => {
      try {
        const token = localStorage.getItem("kip_token");
        const response = await fetch('/auth/me', {
          method: 'GET',
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: 'include',
        })
        if (!cancelled && response.ok) {
          const data = await response.json().catch(() => null)
          if (data && data.user) {
            setUser(data.user)
          }
        }
      } catch {
        // ignore – will fall back to login page
      } finally {
        if (!cancelled) {
          setCheckingSession(false)
        }
      }
    }

    checkSession()

    return () => {
      cancelled = true
    }
  }, [])

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser)
  }

  const handleLogoutSuccess = async () => {
    try {
      await fetch('/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      // ignore network errors — still clear local state
    }
    localStorage.removeItem("kip_token")
    setUser(null)
  }

  const handleProfileUpdate = (updatedUser) => {
    setUser(updatedUser)
  }

  if (isMobileEmbed) {
    return <SecurityStationPage />;
  }

  if (checkingSession) {
    return (
      <div className="som-login-shell">
        <div className="som-login-panel">
          <header className="som-login-header">
            <div className="som-login-title-block">
              <p className="som-login-badge">CONTROL ROOM</p>
              <h1 className="som-login-title">SMART OIL MILL</h1>
              <p className="som-login-subtitle">Checking session…</p>
            </div>
          </header>
        </div>
      </div>
    )
  }

  return (
    <>
      <OrientationGuard />
      {user ? (
        user.mustChangePassword ? (
          <ForcePasswordChangePage
            user={user}
            onPasswordChanged={handleProfileUpdate}
            onLogout={handleLogoutSuccess}
          />
        ) : (
          <DashboardPage
            user={user}
            onLogoutSuccess={handleLogoutSuccess}
            onProfileUpdate={handleProfileUpdate}
          />
        )
      ) : (
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
        />
      )}
    </>
  )
}

export default App
