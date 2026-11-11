import React, { useState, useEffect } from 'react';
import { FaArrowLeft, FaPlus, FaEdit, FaTrash, FaCheck, FaTimes, FaToggleOn, FaToggleOff } from 'react-icons/fa';

const CheckpointSettingsView = ({ onBack }) => {
    const [checkpoints, setCheckpoints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Edit/Create state
    const [isEditing, setIsEditing] = useState(false);
    const [editingCp, setEditingCp] = useState(null);
    const [formData, setFormData] = useState({
        checkpoint_code: '',
        label: '',
        latitude: '',
        longitude: '',
        radius_meters: 30,
        sequence_order: 1
    });

    const thStyle = { padding: '12px 20px', fontSize: '11px', color: '#94a3b8', fontWeight: '800', letterSpacing: '0.5px' };
    const tdStyle = { padding: '16px 20px', verticalAlign: 'middle', borderBottom: '1px solid #f1f5f9' };

    useEffect(() => {
        fetchCheckpoints();
    }, []);

    const fetchCheckpoints = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('kip_token');
            const res = await fetch('/api/security/patrol/master-checkpoints', {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            if (!res.ok) throw new Error('Failed to fetch checkpoints');
            const data = await res.json();
            setCheckpoints(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (id, currentStatus) => {
        try {
            const token = localStorage.getItem('kip_token');
            const res = await fetch(`/api/security/patrol/master-checkpoints/${id}/toggle`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                },
                body: JSON.stringify({ is_active: currentStatus ? 0 : 1 })
            });
            if (res.ok) {
                fetchCheckpoints();
            }
        } catch (err) {
            console.error('Failed to toggle status', err);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('kip_token');
            const url = editingCp && editingCp.id 
                ? `/api/security/patrol/master-checkpoints/${editingCp.id}` 
                : `/api/security/patrol/master-checkpoints`;
            const method = editingCp && editingCp.id ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setIsEditing(false);
                setEditingCp(null);
                fetchCheckpoints();
            }
        } catch (err) {
            console.error('Failed to save checkpoint', err);
        }
    };

    const openEdit = (cp = null) => {
        if (cp) {
            setFormData({
                checkpoint_code: cp.checkpoint_code,
                label: cp.label,
                latitude: cp.latitude,
                longitude: cp.longitude,
                radius_meters: cp.radius_meters || 30,
                sequence_order: cp.sequence_order !== undefined ? cp.sequence_order : 1
            });
            setEditingCp(cp);
        } else {
            // Auto-generate next code & sequence
            let nextNum = 1;
            if (checkpoints.length > 0) {
                const maxNum = Math.max(...checkpoints.map(c => {
                    const match = c.checkpoint_code.match(/\d+/);
                    return match ? parseInt(match[0]) : 0;
                }));
                nextNum = maxNum + 1;
            }
            const nextCode = `CP-${nextNum.toString().padStart(2, '0')}`;
            setFormData({
                checkpoint_code: nextCode,
                label: '',
                latitude: '',
                longitude: '',
                radius_meters: 30,
                sequence_order: nextNum
            });
            setEditingCp(null);
        }
        setIsEditing(true);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#f8fafc' }}>
            {/* ── HEADER ── */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 24px',
                background: '#ffffff',
                borderBottom: '1px solid #e2e8f0',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button
                        onClick={onBack}
                        style={{
                            background: '#0f172a',
                            border: '1px solid #0f172a',
                            color: '#ffdb3b',
                            padding: '8px 14px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '13px',
                            fontWeight: '700',
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                    >
                        <FaArrowLeft /> Back to Map
                    </button>
                    
                    <div style={{ width: '1px', height: '24px', background: '#e2e8f0' }}></div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>Master Data Checkpoints</h2>
                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Manage patrol coordinates and geofencing</div>
                        </div>
                    </div>
                </div>

                {!isEditing && (
                    <button onClick={() => openEdit(null)} style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '700', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                        <FaPlus /> Tambah Titik Baru
                    </button>
                )}
            </div>

            <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
                {isEditing ? (
                    <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', maxWidth: '600px', margin: '0 auto' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#1e293b' }}>
                            {editingCp ? 'Edit Checkpoint' : 'Tambah Checkpoint Baru'}
                        </h3>
                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <label style={{ fontWeight: 'bold', fontSize: '13px', color: '#475569' }}>Kode Checkpoint</label>
                                <input type="text" required value={formData.checkpoint_code} onChange={e => setFormData({...formData, checkpoint_code: e.target.value})} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <label style={{ fontWeight: 'bold', fontSize: '13px', color: '#475569' }}>Nama Lokasi</label>
                                <input type="text" required value={formData.label} onChange={e => setFormData({...formData, label: e.target.value})} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                                    <label style={{ fontWeight: 'bold', fontSize: '13px', color: '#475569' }}>Latitude</label>
                                    <input type="number" step="any" required value={formData.latitude} onChange={e => setFormData({...formData, latitude: e.target.value})} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                                    <label style={{ fontWeight: 'bold', fontSize: '13px', color: '#475569' }}>Longitude</label>
                                    <input type="number" step="any" required value={formData.longitude} onChange={e => setFormData({...formData, longitude: e.target.value})} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                                    <label style={{ fontWeight: 'bold', fontSize: '13px', color: '#475569' }}>Radius Toleransi (Meter)</label>
                                    <input type="number" required min="1" value={formData.radius_meters} onChange={e => setFormData({...formData, radius_meters: e.target.value})} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                                    <label style={{ fontWeight: 'bold', fontSize: '13px', color: '#475569' }}>Urutan Patroli (Sequence)</label>
                                    <input type="number" required min="1" value={formData.sequence_order} onChange={e => setFormData({...formData, sequence_order: e.target.value})} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => setIsEditing(false)} style={{ padding: '8px 16px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Batal</button>
                                <button type="submit" style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Simpan</button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                        {loading ? (
                            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontWeight: '600' }}>Loading data...</div>
                        ) : error ? (
                            <div style={{ padding: '60px', textAlign: 'center', color: '#ef4444', fontWeight: '600' }}>{error}</div>
                        ) : checkpoints.length === 0 ? (
                            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontWeight: '600' }}>Belum ada titik checkpoint terdaftar.</div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                    <tr>
                                        <th style={{ ...thStyle, textAlign: 'center' }}>URUTAN</th>
                                        <th style={thStyle}>KODE</th>
                                        <th style={thStyle}>LOKASI</th>
                                        <th style={thStyle}>KOORDINAT (LAT, LNG)</th>
                                        <th style={{ ...thStyle, textAlign: 'center' }}>RADIUS (M)</th>
                                        <th style={{ ...thStyle, textAlign: 'center' }}>STATUS</th>
                                        <th style={{ ...thStyle, textAlign: 'center' }}>AKSI</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {checkpoints.map((cp, idx) => (
                                        <tr key={cp.id} style={{ background: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                                            <td style={{ ...tdStyle, textAlign: 'center' }}>
                                                <span style={{ background: '#0f172a', color: '#ffdb3b', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '800' }}>
                                                    #{cp.sequence_order ?? (idx + 1)}
                                                </span>
                                            </td>
                                            <td style={{ ...tdStyle, fontWeight: '800', color: '#0f172a' }}>{cp.checkpoint_code}</td>
                                            <td style={{ ...tdStyle, fontWeight: '600' }}>{cp.label}</td>
                                            <td style={tdStyle}><span style={{ fontFamily: 'monospace', fontSize: '13px', color: '#64748b', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px' }}>{cp.latitude}, {cp.longitude}</span></td>
                                            <td style={{ ...tdStyle, textAlign: 'center' }}><span style={{ background: '#e2e8f0', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '700' }}>{cp.radius_meters || 30}m</span></td>
                                            <td style={{ ...tdStyle, textAlign: 'center' }}>
                                                {cp.is_active ? 
                                                    <span style={{ display: 'inline-block', padding: '4px 10px', background: '#dcfce7', color: '#16a34a', borderRadius: '12px', fontSize: '11px', fontWeight: '800' }}>AKTIF</span> : 
                                                    <span style={{ display: 'inline-block', padding: '4px 10px', background: '#fee2e2', color: '#dc2626', borderRadius: '12px', fontSize: '11px', fontWeight: '800' }}>NONAKTIF</span>
                                                }
                                            </td>
                                            <td style={tdStyle}>
                                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                                    <button onClick={() => openEdit(cp)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '4px' }} title="Edit">
                                                        <FaEdit size={16} />
                                                    </button>
                                                    <button onClick={() => handleToggleStatus(cp.id, cp.is_active)} style={{ background: 'none', border: 'none', color: cp.is_active ? '#f59e0b' : '#10b981', cursor: 'pointer', padding: '4px' }} title={cp.is_active ? "Nonaktifkan" : "Aktifkan"}>
                                                        {cp.is_active ? <FaToggleOn size={20} /> : <FaToggleOff size={20} />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CheckpointSettingsView;
