import { useState, useEffect } from 'react'
import '../theme/dashboard.css'

const MENU_ITEMS = [
  'Dashboard',
  'Overview',
  'Station View',
  'Settings',
  'Maintenance',
  'Logsheet',
  'Activity Log',
  'Alarm',
  'Report',
  'Contacts',
]

const STATIONS = [
  'Security',
  'Weighbridge',
  'Grading Ramp',
  'Loading Ramp',
  'Sterilizer Station',
  'Threshing Station',
  'EFB Plant',
  'Press Station',
  'Kernel Plant',
  'Oil Clarification Room',
  'Boiler House',
  'Engine Room',
  'Raw Water Treatment',
  'DAF / OSR',
  'CMRS',
  'Effluent Treatment',
];

// Stations that are unlocked and accessible
const UNLOCKED_STATIONS = [
  // 'Security',
  // 'Weighbridge',
  // 'Grading Ramp',
  // 'Loading Ramp',
  'Sterilizer Station',
  'Threshing Station',
  // 'EFB Plant',
  'Press Station',
  'Kernel Plant',
  // 'Oil Clarification Room',
  'Boiler House',
  'Engine Room',
  // 'Raw Water Treatment',
  // 'DAF / OSR',
  // 'CMRS',
  // 'Effluent Treatment',
];

const DROPDOWN_ITEMS = {
  Dashboard: ['Production Dashboard', 'Daily Operation Dashboard'],
  // Overview: ['3D Plant View', '2D Layout Plant'],
  'Station View': STATIONS,
  Settings: [
    ...STATIONS,
    'PLC Configuration',
    'User Management',
    'System Configuration'
  ],
  Maintenance: [
    { label: 'Spare Part Replacement', children: STATIONS },
    { label: 'O&G Replacement', children: STATIONS },
    { label: 'Instrument Calibration', children: STATIONS },
  ],
  Logsheet: STATIONS,
  'Activity Log': ['User Login', 'Settings Changes'],
  Alarm: [
    'System Error',
    'Internet Error',
    'Instrument Error',
    'Power Error',
    'Breakdown',
    'Process Disturbance',
  ],
  Report: ['Running Hours', 'Daily Report Abnormalities', 'Daily Report Mill Stability'],
  Contacts: ['Developer', 'Site Owner'],
}

const DROPDOWN_GROUPS = new Set(Object.keys(DROPDOWN_ITEMS))

function DashboardHeader({
  user,
  onSelectSubmenu,
  onMenuClick,
  onLogoutSuccess,
  onProfileUpdate,
  activeMenu,
  activeSubmenu
}) {
  const [openDropdown, setOpenDropdown] = useState(null)
  const [nestedMenu, setNestedMenu] = useState(null)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  // ... (rest of useEffects remain the same, so we need to grab the middle chunk to preserve it)
  const [isEditingProfile, setIsEditingProfile] = useState(false)

  // Profile edit states
  const [username, setUsername] = useState(user.username || '')
  const [positionTitle, setPositionTitle] = useState(user.positionTitle || '')
  const [companyName, setCompanyName] = useState(user.companyName || '')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState('')

  useEffect(() => {
    if (!isEditingProfile) {
      setUsername(user.username || '')
      setPositionTitle(user.positionTitle || '')
      setCompanyName(user.companyName || '')
    }

    const handleClickOutside = () => {
      setOpenDropdown(null)
      setNestedMenu(null)
      setShowProfileMenu(false)
    }

    window.addEventListener('click', handleClickOutside)
    return () => window.removeEventListener('click', handleClickOutside)
  }, [user, isEditingProfile])

  const handleMenuClick = (e, item) => {
    if (DROPDOWN_GROUPS.has(item)) {
      e.preventDefault();
      e.stopPropagation();
      setOpenDropdown(prev => prev === item ? null : item);
      setNestedMenu(null);
      return;
    }

    if (onMenuClick) onMenuClick(item)

    setOpenDropdown(null)
    setNestedMenu(null)
  }

  const handleMenuHover = (item) => {
    if (DROPDOWN_GROUPS.has(item)) {
      setOpenDropdown(item)
    }
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileError('');
    if (newPassword && newPassword !== confirmPassword) {
      setProfileError('Passwords do not match');
      return;
    }
    setSavingProfile(true);
    try {
      const res = await fetch('/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, positionTitle, companyName, newPassword })
      });
      if (res.ok) {
        const data = await res.json();
        onProfileUpdate(data.user);
        setIsEditingProfile(false);
      } else {
        setProfileError('Failed to update profile');
      }
    } catch (err) {
      setProfileError('Network error');
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <header className="som-dashboard-header">
      <div className="som-dashboard-header-top">
        <div className="som-dashboard-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #047857 0%, #065f46 100%)',
              color: '#ffffff',
              fontWeight: 900,
              fontSize: '0.9rem',
              letterSpacing: '0.05em',
              boxShadow: '0 2px 4px rgba(4,120,87,0.25)'
            }}>AV</span>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
              <span style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '0.08em', color: '#0f172a' }}>
                AGROVISION <span style={{ color: '#059669', fontWeight: 700, fontSize: '0.8rem' }}>// Industrial AI SCADA</span>
              </span>
              <span style={{ fontSize: '0.62rem', color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 600 }}>
                Next-Gen Palm Oil Mill Automation &amp; Grading System
              </span>
            </div>
          </div>
        </div>
        <div className="som-dashboard-logos-right">
          <a
            href="https://github.com/definedbykevin"
            target="_blank"
            rel="noopener noreferrer"
            title="Portfolio of definedbykevin"
            style={{
              textDecoration: 'none',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              fontWeight: 700,
              fontSize: '0.82rem',
              padding: '6px 14px',
              borderRadius: '6px',
              background: '#0f172a',
              color: '#38bdf8',
              border: '1px solid #334155',
              boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              letterSpacing: '0.05em',
              transition: 'all 0.2s ease',
              cursor: 'pointer'
            }}
          >
            &lt; &#123;definedbykevin&#125; /&gt;
          </a>
        </div>
      </div>
      <nav className="som-dashboard-nav">
        <ul
          className="som-dashboard-menu"
          onMouseLeave={() => {
            setOpenDropdown(null);
            setNestedMenu(null);
          }}
        >
          {MENU_ITEMS.map((item) => {
            const isActive = activeMenu === item
            const isOpen = openDropdown === item && DROPDOWN_ITEMS[item]

            return (
              <li key={item} className="som-dashboard-menu-item">
                <button
                  type="button"
                  className={`som-dashboard-menu-button ${isActive ? 'som-dashboard-menu-button--active' : ''}`}
                  onClick={(e) => handleMenuClick(e, item)}
                  onMouseEnter={() => handleMenuHover(item)}
                >
                  {item.toUpperCase()}
                </button>
                {isOpen && (
                  <div
                    className="som-dashboard-dropdown"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="som-dashboard-dropdown-inner">
                      {DROPDOWN_ITEMS[item].map((itemValue) => {
                        const label = typeof itemValue === 'object' ? itemValue.label : itemValue;
                        const hasChildren = typeof itemValue === 'object' && itemValue.children;
                        
                        const isHardLocked = STATIONS.includes(label) && !UNLOCKED_STATIONS.includes(label);
                        let hasPerm = true;
                        if (user?.role?.toLowerCase() !== 'developer' && user?.userRole?.toLowerCase() !== 'developer') {
                          const perms = user?.permissions || [];
                          if (item === 'Station View') hasPerm = perms.includes(`View:${label}`);
                          else if (item === 'Settings' && STATIONS.includes(label)) hasPerm = perms.includes(`Setting:${label}`);
                          else if (item === 'Logsheet') hasPerm = perms.includes(`Logsheet:${label}`);
                          else if (item === 'Maintenance') hasPerm = perms.includes(`Maintenance:${label}`);
                        }
                        const isLocked = isHardLocked || !hasPerm;

                        if (['User Management', 'PLC Configuration', 'System Configuration'].includes(label)) {
                          if (user?.role?.toLowerCase() !== 'developer' && user?.userRole?.toLowerCase() !== 'developer') return null;
                        }

                        return (
                          <div key={label} className="som-dropdown-item-wrapper" onMouseEnter={() => (hasChildren && !isLocked) ? setNestedMenu(label) : setNestedMenu(null)}>
                            <button
                              type="button"
                              className={`som-dashboard-dropdown-item ${hasChildren ? 'has-nested' : ''} ${nestedMenu === label ? 'nested-active' : ''} ${activeSubmenu === label || (typeof activeSubmenu === 'string' && activeSubmenu.startsWith(label + ' -')) ? 'som-dashboard-dropdown-item--active' : ''} ${isLocked ? 'som-locked-item' : ''}`}
                              onClick={() => {
                                if (isLocked) return;
                                if (hasChildren) {
                                  setNestedMenu(prev => prev === label ? null : label);
                                } else {
                                  onSelectSubmenu(label, item);
                                  setOpenDropdown(null);
                                }
                              }}
                              disabled={isLocked}
                              style={{ cursor: isLocked ? 'not-allowed' : 'pointer' }}
                            >
                              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                                <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
                                {isLocked && (
                                  <span style={{ fontSize: '16px', opacity: 0.7 }}>🔒</span>
                                )}
                                {hasChildren && <span className="nested-arrow">›</span>}
                              </span>
                            </button>
                            {hasChildren && nestedMenu === label && !isLocked && (
                              <div className="som-nested-dropdown">
                                <div className="som-dashboard-dropdown-inner">
                                  {itemValue.children.map(child => {
                                    const isChildHardLocked = STATIONS.includes(child) && !UNLOCKED_STATIONS.includes(child);
                                    let hasChildPerm = true;
                                    if (user?.role?.toLowerCase() !== 'developer' && user?.userRole?.toLowerCase() !== 'developer') {
                                      const perms = user?.permissions || [];
                                      if (item === 'Maintenance') {
                                        hasChildPerm = perms.includes(`Maintenance:${label}`) && perms.includes(`View:${child}`);
                                      }
                                    }
                                    const isChildLocked = isChildHardLocked || !hasChildPerm;
                                    
                                    return (
                                      <button
                                        key={child}
                                        type="button"
                                        className={`som-dashboard-dropdown-item ${activeSubmenu === `${label} - ${child}` || (typeof activeSubmenu === 'string' && activeSubmenu.includes(`${label} - ${child}`)) ? 'som-dashboard-dropdown-item--active' : ''} ${isChildLocked ? 'som-locked-item' : ''}`}
                                        onClick={() => {
                                          if (isChildLocked) return;
                                          onSelectSubmenu(`${label} - ${child}`, item);
                                          setOpenDropdown(null);
                                          setNestedMenu(null);
                                        }}
                                        disabled={isChildLocked}
                                        style={{ cursor: isChildLocked ? 'not-allowed' : 'pointer' }}
                                      >
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                                          <span style={{ flex: 1, textAlign: 'left' }}>{child}</span>
                                          {isChildLocked && (
                                            <span style={{ fontSize: '16px', opacity: 0.7 }}>🔒</span>
                                          )}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      }
                    })}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
        <div className="som-dashboard-nav-right">
          <div className="som-profile-wrapper" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="som-profile-button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowProfileMenu(!showProfileMenu);
                setShowChangePassword(false); // Reset when toggling
              }}
            >
              <span className="som-profile-initial">{(user.username || 'U').charAt(0).toUpperCase()}</span>
            </button>
            {showProfileMenu && (
              <div className="som-profile-menu" style={{ width: '220px', padding: '15px' }}>
                {showChangePassword ? (
                  <form onSubmit={handleChangePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '5px' }}>Change Password</div>
                    
                    {passwordSuccess ? (
                      <div style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 'bold', textAlign: 'center', padding: '10px 0' }}>
                        Password updated successfully!
                      </div>
                    ) : (
                      <>
                        <input
                          type="password"
                          className="som-profile-input"
                          placeholder="New Password (min 6)"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          style={{ padding: '8px', fontSize: '0.75rem' }}
                        />
                        <input
                          type="password"
                          className="som-profile-input"
                          placeholder="Confirm Password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          style={{ padding: '8px', fontSize: '0.75rem' }}
                        />
                        {passwordError && <div style={{ color: '#ef4444', fontSize: '0.7rem' }}>{passwordError}</div>}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '5px' }}>
                          <button 
                            type="button" 
                            className="som-profile-secondary" 
                            style={{ flex: 1, padding: '6px' }}
                            onClick={() => {
                              setShowChangePassword(false);
                              setPasswordError('');
                              setNewPassword('');
                              setConfirmPassword('');
                            }}
                          >
                            Cancel
                          </button>
                          <button 
                            type="submit" 
                            className="som-profile-primary" 
                            style={{ flex: 1, padding: '6px' }}
                            disabled={passwordLoading}
                          >
                            {passwordLoading ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </>
                    )}
                  </form>
                ) : (
                  <>
                    <div className="som-profile-info">
                      <span className="som-profile-name">{user.username}</span>
                      <span className="som-profile-meta">{user.positionTitle}</span>
                    </div>
                    <div className="som-profile-divider"></div>
                    <div className="som-profile-actions" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <button className="som-profile-secondary" onClick={() => setShowChangePassword(true)}>Change Password</button>
                      <button className="som-profile-secondary" onClick={() => onLogoutSuccess()}>Logout</button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  )
}

export default DashboardHeader