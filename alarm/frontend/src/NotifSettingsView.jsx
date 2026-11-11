import React, { useState, useEffect } from 'react';
import { FiBell, FiSend, FiLock, FiAlertCircle } from 'react-icons/fi';
import './AlarmPage.css';

function NotifSettingsView({ user }) {
  const [enabled, setEnabled] = useState(false);
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const isAdmin = user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'developer';

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/alarm/notifications/config', { credentials: 'include' });
      const result = await res.json();
      if (result.success) {
        setEnabled(result.data.notif_enabled === '1');
        setBotToken(result.data.notif_telegram_token || '');
        setChatId(result.data.notif_telegram_chatid || '');
      } else {
        console.error('Failed to load notifications config:', result.error);
      }
    } catch (err) {
      console.error('Error fetching notification config:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchConfig();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;

    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/alarm/notifications/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notif_enabled: enabled ? '1' : '0',
          notif_telegram_token: botToken,
          notif_telegram_chatid: chatId,
        }),
        credentials: 'include'
      });
      const result = await res.json();
      if (result.success) {
        setMessage({ text: 'Settings updated successfully!', type: 'success' });
      } else {
        setMessage({ text: 'Failed to update settings: ' + result.error, type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Network error updating settings: ' + err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="alm-page">
        <div className="alm-empty" style={{ margin: '4rem auto', maxWidth: '500px', padding: '3rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '20px', border: '1px solid rgba(239, 68, 68, 0.2)', textAlign: 'center' }}>
          <FiLock style={{ fontSize: '3rem', color: '#ef4444', marginBottom: '1rem' }} />
          <h2 style={{ color: '#fff', marginBottom: '0.5rem' }}>Access Denied</h2>
          <p style={{ color: '#94a3b8' }}>Only Administrators or Developers are permitted to modify system notification dispatch settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="alm-page">
      {message && (
        <div className={`alm-toast alm-toast--${message.type === 'success' ? 'success' : 'critical'}`} style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1000 }}>
          {message.text}
        </div>
      )}

      <div className="alm-page-header">
        <div className="alm-header-left">
          <div className="alm-header-icon" style={{ color: '#a855f7' }}>
            <FiBell />
          </div>
          <div>
            <h2 className="alm-page-title">Notification Channels Configuration</h2>
            <p className="alm-page-sub">Configure automatic system alerts forwarding to Telegram channels</p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '600px', margin: '2rem 0', padding: '2rem', background: 'var(--alm-card-bg, #0b0f19)', borderRadius: '20px', border: '1px solid var(--alm-border, rgba(255,255,255,0.08))' }}>
        {loading ? (
          <div className="alm-loading">
            <div className="alm-spinner"></div>
            <p>Loading configurations...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div>
                <h4 style={{ color: '#fff', margin: 0, fontSize: '1rem' }}>Enable Notifications</h4>
                <p style={{ color: '#64748b', margin: '0.2rem 0 0', fontSize: '0.85rem' }}>Forward critical/warning alarms to external channels</p>
              </div>
              <label className="som-switch" style={{ position: 'relative', display: 'inline-block', width: '50px', height: '26px' }}>
                <input 
                  type="checkbox" 
                  checked={enabled} 
                  onChange={(e) => setEnabled(e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span className="som-slider round" style={{
                  position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: enabled ? '#a855f7' : '#334155', transition: '.4s', borderRadius: '34px'
                }}>
                  <span style={{
                    position: 'absolute', content: '', height: '18px', width: '18px', left: enabled ? '28px' : '4px', bottom: '4px',
                    backgroundColor: 'white', transition: '.4s', borderRadius: '50%'
                  }} />
                </span>
              </label>
            </div>

            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 500 }}>Telegram Bot Token</label>
              <input
                type="text"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder="e.g. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                disabled={!enabled}
                style={{
                  padding: '0.8rem 1rem', background: '#070a13', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px', color: '#fff', outline: 'none', transition: 'border-color 0.2s'
                }}
              />
            </div>

            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 500 }}>Telegram Chat ID(s)</label>
              <input
                type="text"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="e.g. -100123456789 (comma separated for multiple)"
                disabled={!enabled}
                style={{
                  padding: '0.8rem 1rem', background: '#070a13', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px', color: '#fff', outline: 'none', transition: 'border-color 0.2s'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(168, 85, 247, 0.05)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(168, 85, 247, 0.15)' }}>
              <FiAlertCircle style={{ color: '#a855f7', fontSize: '1.2rem', flexShrink: 0, marginTop: '2px' }} />
              <p style={{ color: '#c084fc', fontSize: '0.8rem', margin: 0 }}>
                <strong>How to setup:</strong> Create a Telegram bot using BotFather, get the bot token, add the bot to your channel or group as an administrator, and retrieve the group/channel Chat ID (usually prefixed with -100).
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              style={{
                marginTop: '1rem', padding: '1rem', background: '#a855f7', color: '#fff', border: 'none',
                borderRadius: '10px', fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
              }}
            >
              <FiSend /> {saving ? 'Saving Settings...' : 'Save Configuration'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default NotifSettingsView;
