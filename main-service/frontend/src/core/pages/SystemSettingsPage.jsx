import React, { useState, useEffect } from 'react';
import './SystemSettingsPage.css';
import { 
  FaClock, 
  FaBell, 
  FaTelegram, 
  FaEnvelope, 
  FaSave, 
  FaCog,
  FaShieldAlt,
  FaInfoCircle,
  FaKey,
  FaServer
} from 'react-icons/fa';

const SystemSettingsPage = ({ user }) => {
    const [settings, setSettings] = useState({
        shift_config: {
            A: { start: 7, end: 15 },
            B: { start: 15, end: 23 },
            C: { start: 23, end: 7 }
        },
        notif_telegram_token: '',
        notif_telegram_chatid: '',
        notif_email_target: '',
        notif_email_user: '',
        notif_email_pass: '',
        notif_severity_level: 'ALARM',
        notif_enabled: '0'
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings/system/all');
            const result = await res.json();
            if (result.success) {
                setSettings(prev => ({ ...prev, ...result.data }));
            }
        } catch (err) {
            console.error('Failed to fetch settings:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleShiftChange = (shift, field, value) => {
        setSettings(prev => ({
            ...prev,
            shift_config: {
                ...prev.shift_config,
                [shift]: {
                    ...prev.shift_config[shift],
                    [field]: parseInt(value)
                }
            }
        }));
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    const saveSettings = async () => {
        setSaving(true);
        setMessage({ text: '', type: '' });
        try {
            const res = await fetch('/api/settings/system/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            const result = await res.json();
            if (result.success) {
                setMessage({ text: 'CORE_SYNC_SUCCESSFUL', type: 'success' });
                setTimeout(() => setMessage({ text: '', type: '' }), 4000);
            } else {
                setMessage({ text: 'SYNC_ERROR', type: 'error' });
            }
        } catch (err) {
            setMessage({ text: 'CONNECTION_FAILED', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div style={{ background: '#020617', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00ff41', fontFamily: 'monospace' }}>
            <FaCog className="fa-spin" style={{ marginRight: '10px' }} /> BOOTING_SYSTEM_CORE...
        </div>
    );

    return (
        <div className="system-settings-container">
            <header className="system-settings-header">
                <div className="header-title-section">
                    <div className="header-icon-wrapper">
                        <FaCog />
                    </div>
                    <div className="header-text">
                        <h1>SYSTEM CONFIG</h1>
                        <p>Core Intelligence & Notification Matrix</p>
                    </div>
                </div>
                <button 
                    className="system-save-btn" 
                    onClick={saveSettings}
                    disabled={saving}
                >
                    <FaSave /> {saving ? 'SYNCING...' : 'SAVE SETTINGS'}
                </button>
            </header>

            {message.text && (
                <div style={{ 
                    padding: '10px', 
                    borderRadius: '4px', 
                    marginBottom: '20px',
                    textAlign: 'center',
                    fontSize: '0.7rem',
                    fontWeight: 900,
                    backgroundColor: message.type === 'success' ? 'rgba(0, 255, 65, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                    color: message.type === 'success' ? '#00ff41' : '#f87171',
                    border: `1px solid ${message.type === 'success' ? 'rgba(0, 255, 65, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                    letterSpacing: '3px'
                }}>
                    {message.text}
                </div>
            )}

            <div className="settings-main-grid">
                {/* LEFT COLUMN: COMMUNICATION */}
                <div className="settings-column">
                    <section className="settings-card">
                        <div className="card-top">
                            <FaTelegram /> <h2>Telegram Bot API</h2>
                        </div>
                        <div className="card-content">
                            <div className="form-field">
                                <label>Bot Token</label>
                                <input 
                                    type="password" 
                                    name="notif_telegram_token" 
                                    placeholder="AUTH_TOKEN" 
                                    value={settings.notif_telegram_token} 
                                    onChange={handleInputChange} 
                                />
                            </div>
                            <div className="form-field">
                                <label>Recipient IDs (Comma Separated)</label>
                                <input 
                                    type="text" 
                                    name="notif_telegram_chatid" 
                                    placeholder="Example: 12345, 67890" 
                                    value={settings.notif_telegram_chatid} 
                                    onChange={handleInputChange} 
                                />
                            </div>
                            <div className="helper-box">
                                <FaInfoCircle />
                                <p>Multi-broadcast active via comma separation.</p>
                            </div>
                        </div>
                    </section>

                    <section className="settings-card">
                        <div className="card-top">
                            <FaEnvelope /> <h2>Email Registry (SMTP)</h2>
                        </div>
                        <div className="card-content">
                            <div className="form-field">
                                <label>Sender Email (Gmail)</label>
                                <input 
                                    type="email" 
                                    name="notif_email_user" 
                                    placeholder="your-system@gmail.com" 
                                    value={settings.notif_email_user} 
                                    onChange={handleInputChange} 
                                />
                            </div>
                            <div className="form-field">
                                <label>Gmail App Password</label>
                                <input 
                                    type="password" 
                                    name="notif_email_pass" 
                                    placeholder="16-character code" 
                                    value={settings.notif_email_pass} 
                                    onChange={handleInputChange} 
                                />
                            </div>
                            <div className="form-field">
                                <label>Recipient Emails (Comma Separated)</label>
                                <input 
                                    type="text" 
                                    name="notif_email_target" 
                                    placeholder="admin@pks.com, user@pks.com" 
                                    value={settings.notif_email_target} 
                                    onChange={handleInputChange} 
                                />
                            </div>
                            <div className="helper-box">
                                <FaShieldAlt />
                                <p>Encrypted delivery via Secure SMTP Relay.</p>
                            </div>
                        </div>
                    </section>
                </div>

                {/* RIGHT COLUMN: OPERATION */}
                <div className="settings-column">
                    <section className="settings-card">
                        <div className="card-top">
                            <FaClock /> <h2>Shift Matrix</h2>
                        </div>
                        <div className="card-content">
                            <div className="shift-rows">
                                {['A', 'B', 'C'].map(s => (
                                    <div key={s} className="shift-row">
                                        <span className="shift-label">SHFT_{s}</span>
                                        <div className="shift-controls">
                                            <div className="time-box">
                                                <span>IN</span>
                                                <input 
                                                    type="number" min="0" max="23"
                                                    value={settings.shift_config[s].start} 
                                                    onChange={e => handleShiftChange(s, 'start', e.target.value)}
                                                />
                                            </div>
                                            <div className="time-box">
                                                <span>OUT</span>
                                                <input 
                                                    type="number" min="0" max="23"
                                                    value={settings.shift_config[s].end} 
                                                    onChange={e => handleShiftChange(s, 'end', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <span className="footer-note">Midnight transitions handled by C-SHFT logic.</span>
                        </div>
                    </section>

                    <section className="settings-card">
                        <div className="card-top">
                            <FaBell /> <h2>Alert Relay</h2>
                        </div>
                        <div className="card-content">
                            <div className="toggle-row">
                                <label>Broadcast Status</label>
                                <select 
                                    name="notif_enabled" 
                                    value={settings.notif_enabled} 
                                    onChange={handleInputChange}
                                    className={settings.notif_enabled === '1' ? 'status-active' : 'status-inactive'}
                                >
                                    <option value="0">OFFLINE</option>
                                    <option value="1">ONLINE</option>
                                </select>
                            </div>
                            <div className="form-field">
                                <label>Priority Threshold</label>
                                <select name="notif_severity_level" value={settings.notif_severity_level} onChange={handleInputChange}>
                                    <option value="ALARM">ALARM_ONLY</option>
                                    <option value="WARNING">ALARM_&_WARNING</option>
                                    <option value="INFO">VERBOSE_DEBUG</option>
                                </select>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default SystemSettingsPage;
