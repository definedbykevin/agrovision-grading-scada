import { useState, useEffect } from 'react'
import './UserManagementPage.css'

export default function UserManagementPage({ user }) {
    const currentUserRole = (user?.userRole || user?.role || '').toLowerCase()
    
    const formatRoleName = (rName) => {
        if (!rName) return '';
        const lower = rName.toLowerCase();
        if (lower === 'admin') return 'Admin';
        if (lower === 'general_manager') return 'General Manager';
        if (lower === 'mill_manager') return 'Mill Manager';
        if (lower === 'electrical_automation') return 'Electrical Automation';
        return rName;
    };

    const [activeTab, setActiveTab] = useState('users')
    const [users, setUsers] = useState([])
    const [roles, setRoles] = useState([])
    const [permissions, setPermissions] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)

    const [showUserModal, setShowUserModal] = useState(false)
    const [showRoleModal, setShowRoleModal] = useState(false)
    const [editingUser, setEditingUser] = useState(null)
    const [newRole, setNewRole] = useState({ name: '', description: '' })

    const [newUser, setNewUser] = useState({
        username: '',
        password: 'password123',
        roleId: '',
        positionTitle: '',
        companyName: '',
        permissionIds: []
    })

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setIsLoading(true)
        try {
            const token = localStorage.getItem('kip_token')
            const headers = { 'Authorization': `Bearer ${token}` }
            const [usersRes, rolesRes, permsRes] = await Promise.all([
                fetch('/api/admin/users', { headers }),
                fetch('/api/admin/roles', { headers }),
                fetch('/api/admin/permissions', { headers })
            ])

            if (!usersRes.ok || !rolesRes.ok || !permsRes.ok) throw new Error('Failed to fetch management data')
            
            const usersData = await usersRes.json()
            const rolesData = await rolesRes.json()
            const permsData = await permsRes.json()

            // Filter out developer accounts and roles to keep them hidden from customers
            const filteredUsers = (usersData.data || []).filter(u => u.role_name?.toLowerCase() !== 'developer')
            const filteredRoles = (rolesData.data || []).filter(r => r.name?.toLowerCase() !== 'developer')

            setUsers(filteredUsers)
            setRoles(filteredRoles)
            setPermissions(permsData.data || [])
        } catch (err) {
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    const handleCreateUser = async (e) => {
        e.preventDefault()
        try {
            const url = editingUser ? `/api/admin/users/${editingUser.id}` : '/api/admin/users'
            const method = editingUser ? 'PUT' : 'POST'

            const payload = { 
                username: newUser.username,
                password: newUser.password,
                role_id: newUser.roleId,
                position_title: newUser.positionTitle,
                company_name: newUser.companyName,
                permissionIds: newUser.permissionIds
            }
            if (editingUser && !payload.password) {
                delete payload.password
            }

            const token = localStorage.getItem('kip_token')
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            })
            if (!res.ok) throw new Error(`Failed to ${editingUser ? 'update' : 'create'} user`)
            setShowUserModal(false)
            setEditingUser(null)
            setNewUser({ username: '', password: 'password123', roleId: '', positionTitle: '', companyName: '', permissionIds: [] })
            fetchData()
        } catch (err) {
            alert(err.message)
        }
    }

    const handleStartEditUser = (u) => {
        setEditingUser(u)
        setNewUser({
            username: u.username,
            password: '',
            roleId: u.role_id || '',
            positionTitle: u.positionTitle || u.position_title || '',
            companyName: u.companyName || u.company_name || '',
            permissionIds: (u.permissions || []).map(p => p.id)
        })
        setShowUserModal(true)
    }

    const handleDeleteUser = async (id) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return
        try {
            const token = localStorage.getItem('kip_token')
            const res = await fetch(`/api/admin/users/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (!res.ok) {
                const data = await res.json().catch(() => null)
                throw new Error(data?.error || 'Failed to delete user')
            }
            fetchData()
        } catch (err) {
            alert(err.message)
        }
    }
    const handleCreateRole = async (e) => {
        e.preventDefault()
        try {
            const token = localStorage.getItem('kip_token')
            const res = await fetch('/api/admin/roles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(newRole)
            })
            if (!res.ok) {
                const data = await res.json().catch(() => null)
                throw new Error(data?.error || 'Failed to create role')
            }
            setShowRoleModal(false)
            setNewRole({ name: '', description: '' })
            fetchData()
        } catch (err) {
            alert(err.message)
        }
    }

    const groupedPermissions = permissions.reduce((acc, perm) => {
        // Exclude legacy global permissions without ':' to eliminate the 'Other' group
        if (!perm.slug.includes(':')) return acc;

        const parts = perm.slug.split(':');
        let category = parts[0];
        let cleanName = parts[1] || perm.name;

        // Special handling for Station-related permissions
        if (['Station View', 'Logsheet', 'Setting'].includes(parts[0]) && parts.length > 1) {
            category = `Station: ${parts[1]}`; // e.g., "Station: Sterilizer Station"
            // Rename "Station View" to "Process View" in the UI for better UX as requested
            cleanName = parts[0] === 'Station View' ? 'Process View' : parts[0];
        }

        if (!acc[category]) acc[category] = [];
        acc[category].push({ ...perm, cleanName });
        return acc;
    }, {});

    if (isLoading) return <div className="som-management-loading" style={{color: '#ffdb3b', background: '#f3f4f6', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'}}>Loading Management Data...</div>
    if (error) return <div className="som-management-error" style={{color: '#ef4444', background: '#f3f4f6', height: '100vh', padding: '2rem'}}>Error: {error}</div>

    return (
         <div className="som-user-management">
            <header className="som-management-header">
                <div className="som-header-left">
                    <h2 className="som-management-title">User & Access Management</h2>
                    <p className="som-section-subtitle">System users and station permissions directory</p>
                </div>
            </header>

            <main className="som-management-content">
                    <div className="som-users-section animate-fade-in">
                        <div className="som-section-actions" style={{ display: 'flex', gap: '8px' }}>
                            <button className="som-btn-primary" onClick={() => { setEditingUser(null); setNewUser({ username: '', password: '', roleId: '', positionTitle: '', companyName: '', permissionIds: [] }); setShowUserModal(true); }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                Add New Account
                            </button>
                            <button className="som-btn-secondary" onClick={() => { setNewRole({ name: '', description: '' }); setShowRoleModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.5rem 1.2rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', transition: 'all 0.2s' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                Create New Role
                            </button>
                        </div>
                        <div className="som-table-container">
                            <table className="som-management-table">
                                <thead>
                                    <tr>
                                        <th>User Identity</th>
                                        <th>Access Level</th>
                                        <th>Position & Company</th>
                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(u => (
                                        <tr key={u.id} className="som-table-row">
                                            <td>
                                                <div className="som-user-info">
                                                    <div className="som-user-avatar-sm">
                                                        {u.username.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="som-username-text">{u.username}</div>
                                                        <div className="som-user-id-text">ID: #{u.id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`som-role-pill ${u.role_name ? u.role_name.toLowerCase() : ''}`}>{formatRoleName(u.role_name || u.role)}</span>
                                            </td>
                                            <td>
                                                <div className="som-pos-text">{u.positionTitle || u.position_title || 'Worker'}</div>
                                                <div className="som-comp-text">{u.companyName || u.company_name || 'AGROVISION Mill'}</div>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                                                    {!(currentUserRole === 'mill_manager' && ['admin', 'developer', 'electrical_automation'].includes((u.role_name || u.role || '').toLowerCase())) && (
                                                        <button className="som-action-btn som-btn-edit" onClick={() => handleStartEditUser(u)} title="Edit">
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                                        </button>
                                                    )}
                                                    {!(currentUserRole === 'mill_manager' && ['admin', 'developer', 'electrical_automation'].includes((u.role_name || u.role || '').toLowerCase())) && (
                                                        <button className="som-action-btn som-btn-delete" onClick={() => handleDeleteUser(u.id)} title="Delete">
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
            </main>

            {showUserModal && (
                <div className="som-modal-backdrop" onClick={() => setShowUserModal(false)} style={{ background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }}>
                    <div className="som-management-modal" onClick={e => e.stopPropagation()} style={{ width: '950px', maxWidth: '95vw', maxHeight: '80vh', overflow: 'hidden', padding: '16px', background: '#ffffff', borderRadius: '12px', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                        <h3 style={{ margin: '0 0 10px 0', fontSize: '1.05rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="17" y1="11" x2="23" y2="11" /></svg>
                            {editingUser ? 'Update Account' : 'Add New Account'}
                        </h3>
                        <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
                            <div style={{ display: 'flex', gap: '24px', flexGrow: 1, overflow: 'hidden', minHeight: 0 }}>
                                
                                {/* Left Column: User Identity Details */}
                                <div style={{ width: '300px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', paddingRight: '4px' }}>
                                    <div className="som-form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569' }}>Username</label>
                                        <input
                                            type="text"
                                            value={newUser.username}
                                            onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                                            required
                                            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                                        />
                                    </div>
                                    <div className="som-form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569' }}>Password {editingUser && '(Leave blank to keep current)'}</label>
                                        <input
                                            type="password"
                                            value={newUser.password}
                                            onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                            required={!editingUser}
                                            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                                        />
                                    </div>
                                    <div className="som-form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569' }}>Role</label>
                                        <select
                                            value={newUser.roleId}
                                            onChange={e => setNewUser({ ...newUser, roleId: e.target.value })}
                                            required
                                            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: '#ffffff', cursor: 'pointer' }}
                                        >
                                            <option value="">Select Role</option>
                                            {roles.filter(r => {
                                                if (currentUserRole === 'mill_manager') {
                                                    return !['admin', 'developer', 'electrical_automation'].includes(r.name?.toLowerCase());
                                                }
                                                return true;
                                            }).map(r => <option key={r.id} value={r.id}>{formatRoleName(r.name)}</option>)}
                                        </select>
                                    </div>
                                    <div className="som-form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569' }}>Position Title</label>
                                        <input
                                            type="text"
                                            value={newUser.positionTitle}
                                            onChange={e => setNewUser({ ...newUser, positionTitle: e.target.value })}
                                            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                                        />
                                    </div>
                                    <div className="som-form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569' }}>Company Name</label>
                                        <input
                                            type="text"
                                            value={newUser.companyName}
                                            onChange={e => setNewUser({ ...newUser, companyName: e.target.value })}
                                            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                                        />
                                    </div>
                                </div>

                                {/* Divider Line */}
                                <div style={{ width: '1px', background: '#e2e8f0', alignSelf: 'stretch' }}></div>

                                {/* Right Column: Grouped Access Permissions */}
                                <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Assign Access Permissions</label>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button 
                                                type="button" 
                                                onClick={() => {
                                                    const allIds = [];
                                                    Object.values(groupedPermissions).forEach(group => group.forEach(p => allIds.push(p.id)));
                                                    setNewUser({ ...newUser, permissionIds: allIds });
                                                }}
                                                style={{ fontSize: '0.65rem', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#334155', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}
                                            >
                                                Select All
                                            </button>
                                            <button 
                                                type="button" 
                                                onClick={() => setNewUser({ ...newUser, permissionIds: [] })}
                                                style={{ fontSize: '0.65rem', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff', color: '#64748b', cursor: 'pointer', fontWeight: '500', transition: 'all 0.2s' }}
                                            >
                                                Clear All
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ maxHeight: '450px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {Object.keys(groupedPermissions).map(category => (
                                            <div key={category} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <h5 style={{ margin: 0, fontSize: '0.75rem', fontWeight: 'bold', color: '#0f172a', borderBottom: '2px solid #e2e8f0', paddingBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <span>{category}</span>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <span style={{ fontSize: '0.65rem', fontWeight: 'normal', color: '#64748b' }}>
                                                            {groupedPermissions[category].filter(p => newUser.permissionIds.includes(p.id)).length} of {groupedPermissions[category].length} assigned
                                                        </span>
                                                        <button 
                                                            type="button"
                                                            onClick={() => {
                                                                const categoryIds = groupedPermissions[category].map(p => p.id);
                                                                const allChecked = categoryIds.every(id => newUser.permissionIds.includes(id));
                                                                if (allChecked) {
                                                                    setNewUser({ ...newUser, permissionIds: newUser.permissionIds.filter(id => !categoryIds.includes(id)) });
                                                                } else {
                                                                    const newIds = new Set([...newUser.permissionIds, ...categoryIds]);
                                                                    setNewUser({ ...newUser, permissionIds: Array.from(newIds) });
                                                                }
                                                            }}
                                                            style={{ fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px', border: '1px solid #e2e8f0', background: '#fff', color: '#475569', cursor: 'pointer' }}
                                                        >
                                                            {groupedPermissions[category].every(p => newUser.permissionIds.includes(p.id)) ? 'Deselect Group' : 'Select Group'}
                                                        </button>
                                                    </div>
                                                </h5>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
                                                    {groupedPermissions[category].map(perm => {
                                                        const isChecked = newUser.permissionIds.includes(perm.id);
                                                        return (
                                                            <label 
                                                                key={perm.id} 
                                                                className={`agrovision-perm-item ${isChecked ? 'assigned' : ''}`} 
                                                                style={{ 
                                                                    display: 'flex', 
                                                                    alignItems: 'center', 
                                                                    justifyContent: 'space-between', 
                                                                    cursor: 'pointer', 
                                                                    padding: '8px 12px', 
                                                                    borderRadius: '6px', 
                                                                    border: isChecked ? '1px solid #ffdb3b' : '1px solid #e2e8f0', 
                                                                    background: isChecked ? '#fffdf0' : '#ffffff', 
                                                                    transition: 'all 0.2s', 
                                                                    fontSize: '0.75rem',
                                                                    userSelect: 'none'
                                                                }}
                                                            >
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isChecked}
                                                                        onChange={(e) => {
                                                                            const checkedIds = e.target.checked
                                                                                ? [...newUser.permissionIds, perm.id]
                                                                                : newUser.permissionIds.filter(id => id !== perm.id);
                                                                            setNewUser({ ...newUser, permissionIds: checkedIds });
                                                                        }}
                                                                        style={{ margin: 0 }}
                                                                    />
                                                                    <span style={{ color: '#1e293b', fontWeight: isChecked ? '600' : 'normal', overflow: 'hidden', textOverflow: 'ellipsis' }} title={perm.cleanName}>
                                                                        {perm.cleanName}
                                                                    </span>
                                                                </div>
                                                                
                                                                {/* Dynamic Lock/Unlock Indicator */}
                                                                <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                                                                    {isChecked ? (
                                                                        <span title="Unlocked (Akses Terbuka)" style={{ color: '#10b981', display: 'flex', alignItems: 'center', fontSize: '0.65rem', gap: '3px', fontWeight: 'bold' }}>
                                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                                                                <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
                                                                            </svg>
                                                                            OPEN
                                                                        </span>
                                                                    ) : (
                                                                        <span title="Locked (Akses Terkunci)" style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', fontSize: '0.65rem', gap: '3px' }}>
                                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                                                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                                                            </svg>
                                                                            LOCK
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                            </div>
                            <div className="som-modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                                <button type="button" onClick={() => setShowUserModal(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" className="som-btn-primary" style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#ffdb3b', color: '#0f172a', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}>{editingUser ? 'Update User' : 'Create User'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {showRoleModal && (
                <div className="som-modal-backdrop" onClick={() => setShowRoleModal(false)}>
                    <div className="som-management-modal" onClick={e => e.stopPropagation()}>
                        <h3>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                            Create New Role
                        </h3>
                        <form onSubmit={handleCreateRole}>
                            <div className="som-form-group">
                                <label>Role Name</label>
                                <input
                                    type="text"
                                    value={newRole.name}
                                    onChange={e => setNewRole({ ...newRole, name: e.target.value })}
                                    placeholder="e.g. maintenance_editor"
                                    required
                                />
                            </div>
                            <div className="som-form-group">
                                <label>Description</label>
                                <input
                                    type="text"
                                    value={newRole.description}
                                    onChange={e => setNewRole({ ...newRole, description: e.target.value })}
                                    placeholder="What can this role do?"
                                />
                            </div>
                            <div className="som-modal-actions">
                                <button type="button" onClick={() => setShowRoleModal(false)}>Cancel</button>
                                <button type="submit" className="som-btn-primary">Create Role</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    )
}
