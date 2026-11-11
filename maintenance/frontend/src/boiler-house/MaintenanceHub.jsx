
import React, { useState, useEffect } from 'react';
import {
    FiTool, FiPlus, FiTrash2, FiSettings, FiActivity, FiBox,
    FiDroplet, FiZap, FiDownload, FiCheckCircle, FiClock,
    FiFileText, FiInfo, FiPrinter, FiAlertCircle, FiX
} from 'react-icons/fi';
import { QRCodeSVG } from 'qrcode.react';
import { toPng } from 'html-to-image';
import LogoRed from './assets/agrovision-red.png';
import PremierLogo from './assets/premier.png';
import './MaintenanceHub.css';

const MaintenanceHub = ({ station = 'Boiler House', initialTab = 'spare-part' }) => {
    const [machines, setMachines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newMachineName, setNewMachineName] = useState('');
    const [activeTab, setActiveTab] = useState(initialTab);
    const [selectedMachine, setSelectedMachine] = useState(null);
    const [hubWorkspace, setHubWorkspace] = useState('history');

    // Real Data States
    const [logs, setLogs] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [docs, setDocs] = useState([]);

    // Modal States
    const [showLogModal, setShowLogModal] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [showDocModal, setShowDocModal] = useState(false);

    // Form States
    const [logForm, setLogForm] = useState({ description: '', technician: '', parts: '', status: 'pending' });
    const [scheduleForm, setScheduleForm] = useState({ task: '', frequency: 30, nextDate: '' });
    const [docForm, setDocForm] = useState({ title: '', type: 'manual', url: '' });

    // Terminology
    const isCalibration = activeTab === 'calib';
    const term = isCalibration ? 'INSTRUMENT' : 'MACHINE';
    const termPlural = isCalibration ? 'INSTRUMENTS' : 'MACHINES';

    useEffect(() => {
        setActiveTab(initialTab);
        setSelectedMachine(null);
    }, [initialTab]);

    useEffect(() => {
        fetchMachines();
    }, [station, activeTab]);

    useEffect(() => {
        if (selectedMachine) {
            fetchAllWorkspaceData();
        }
    }, [selectedMachine, hubWorkspace]);

    const fetchMachines = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/settings/machines/${station}/${activeTab}`);
            const result = await res.json();
            if (result.success) {
                setMachines(result.data);
                if (result.data.length > 0) setSelectedMachine(result.data[0]);
            }
        } catch (error) {
            console.error('Failed to fetch:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAllWorkspaceData = () => {
        if (!selectedMachine) return;
        if (hubWorkspace === 'history') fetchLogs();
        if (hubWorkspace === 'schedule') fetchSchedules();
        if (hubWorkspace === 'inventory') fetchInventory();
        if (hubWorkspace === 'docs') fetchDocs();
    };

    const fetchLogs = async () => {
        const res = await fetch(`/api/maintenance/logs/${selectedMachine.id}/${activeTab}`);
        const result = await res.json();
        if (result.success) setLogs(result.data);
    };

    const fetchSchedules = async () => {
        const res = await fetch(`/api/maintenance/schedules/${selectedMachine.id}`);
        const result = await res.json();
        if (result.success) setSchedules(result.data);
    };

    const fetchInventory = async () => {
        const res = await fetch(`/api/maintenance/inventory/${activeTab}`);
        const result = await res.json();
        if (result.success) setInventory(result.data);
    };

    const fetchDocs = async () => {
        const res = await fetch(`/api/maintenance/docs/${selectedMachine.id}`);
        const result = await res.json();
        if (result.success) setDocs(result.data);
    };

    const handleDownloadPlate = async () => {
        const node = document.getElementById('qr-plate-to-download');
        if (!node) return;

        try {
            const dataUrl = await toPng(node, {
                quality: 1,
                pixelRatio: 3, // High-res for printing
            });
            const link = document.createElement('a');
            link.download = `PLAT_${selectedMachine.machine_name.replace(/\s+/g, '_')}_${selectedMachine.id}.png`;
            link.href = dataUrl;
            link.click();
        } catch (error) {
            console.error('Download failed:', error);
            alert('Export failed. Please try again or use Chrome/Edge.');
        }
    };

    const handleAddMachine = async (e) => {
        e.preventDefault();
        if (!newMachineName.trim()) return;
        try {
            const res = await fetch('/api/settings/machines/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ station, name: newMachineName.toUpperCase(), category: activeTab })
            });
            const result = await res.json();
            if (result.success) {
                setNewMachineName('');
                fetchMachines();
            }
        } catch (error) { alert('Error adding machine'); }
    };

    const handleAddLog = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/maintenance/logs/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    machineId: selectedMachine.id,
                    workType: activeTab,
                    ...logForm
                })
            });
            const result = await res.json();
            if (result.success) {
                setShowLogModal(false);
                setLogForm({ description: '', technician: '', parts: '', status: 'pending' });
                fetchLogs();
            }
        } catch (error) { alert('Error adding log'); }
    };

    const handleUpdateSchedule = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/maintenance/schedules/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    machineId: selectedMachine.id,
                    category: activeTab,
                    ...scheduleForm
                })
            });
            const result = await res.json();
            if (result.success) {
                setShowScheduleModal(false);
                fetchSchedules();
            }
        } catch (error) { alert('Error updating schedule'); }
    };

    const handleAddDoc = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/maintenance/docs/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    machineId: selectedMachine.id,
                    ...docForm
                })
            });
            const result = await res.json();
            if (result.success) {
                setShowDocModal(false);
                setDocForm({ title: '', type: 'manual', url: '' });
                fetchDocs();
            }
        } catch (error) { alert('Error adding doc'); }
    };

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [machineToDelete, setMachineToDelete] = useState(null);

    const handleDeleteMachine = (machine) => {
        setMachineToDelete(machine);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!machineToDelete) return;
        try {
            const res = await fetch(`/api/settings/machines/${machineToDelete.id}`, { method: 'DELETE' });
            const result = await res.json();
            if (result.success) {
                if (selectedMachine?.id === machineToDelete.id) setSelectedMachine(null);
                setShowDeleteModal(false);
                setMachineToDelete(null);
                fetchMachines();
            }
        } catch (error) { alert('Error deleting machine'); }
    };

    return (
        <div className="maintenance-hub-modern">
            <header className="hub-top-bar">
                <div className="hub-brand">
                    <div className="hub-logo"><FiTool /></div>
                    <div className="hub-title-stack">
                        <h1>{station.toUpperCase()}</h1>
                        <div className="hub-breadcrumb">
                            <span>MAINTENANCE</span><span className="b-sep">/</span>
                            <span className="active-breadcrumb">{activeTab.toUpperCase()}</span>
                        </div>
                    </div>
                </div>
                <div className="hub-header-actions">
                    <div className="quick-stat">
                        <span className="qs-label">STATION HEALTH</span>
                        <div className="qs-status-tag healthy"><span className="pulse-dot"></span>98.5% OPTIMAL</div>
                    </div>
                </div>
            </header>

            <div className="hub-layout">
                {/* Navigator Sidebar */}
                <aside className="hub-drawer">
                    <div className="drawer-header"><FiSettings /> <span>{termPlural}</span></div>
                    <form className="hub-search-add" onSubmit={handleAddMachine}>
                        <input
                            type="text"
                            placeholder={`ADD NEW ${term}...`}
                            value={newMachineName}
                            onChange={(e) => setNewMachineName(e.target.value)}
                        />
                        <button type="submit"><FiPlus /></button>
                    </form>
                    <div className="hub-scroll-list">
                        {loading ? (
                            <div className="hub-skeleton-list">
                                {[1, 2, 3].map(i => <div key={i} className="skeleton-item"></div>)}
                            </div>
                        ) : machines.map(m => (
                            <div
                                key={m.id}
                                className={`hub-item-card ${selectedMachine?.id === m.id ? 'active' : ''}`}
                                onClick={() => setSelectedMachine(m)}
                            >
                                <div className="item-info">
                                    <div className="item-indicator"></div>
                                    <span className="item-label">{m.machine_name}</span>
                                </div>
                                <button
                                    className="item-delete-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteMachine(m);
                                    }}
                                >
                                    <FiTrash2 />
                                </button>
                            </div>
                        ))}
                    </div>
                </aside>

                {/* Main Workspace */}
                <main className="hub-workspace">
                    <nav className="hub-tabs-modern">
                        <button className={activeTab === 'spare-part' ? 'active' : ''} onClick={() => setActiveTab('spare-part')}><FiBox /> SPARE PART</button>
                        <button className={activeTab === 'og' ? 'active' : ''} onClick={() => setActiveTab('og')}><FiDroplet /> O&G</button>
                        <button className={activeTab === 'calib' ? 'active' : ''} onClick={() => setActiveTab('calib')}><FiZap /> CALIBRATION</button>
                    </nav>

                    <div className="hub-viewport">
                        {selectedMachine ? (
                            <div className="workspace-panel">
                                <div className="panel-top">
                                    <div className="machine-header-info">
                                        <h2>{selectedMachine.machine_name}</h2>
                                        <div className="machine-identity-stack">
                                            <span className="asset-id-label">ID: {selectedMachine.id.toString().padStart(4, '0')}</span>
                                            <div className="status-indicator online">
                                                <span className="status-dot"></span>
                                                <span className="status-text">OPERATIONAL</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="sub-hub-nav">
                                        <button className={hubWorkspace === 'history' ? 'active' : ''} onClick={() => setHubWorkspace('history')}><FiActivity /> {isCalibration ? 'CAL LOG' : 'HISTORY'}</button>
                                        <button className={hubWorkspace === 'schedule' ? 'active' : ''} onClick={() => setHubWorkspace('schedule')}><FiClock /> {isCalibration ? 'RE-CAL' : 'SCHEDULE'}</button>
                                        <button className={hubWorkspace === 'inventory' ? 'active' : ''} onClick={() => setHubWorkspace('inventory')}><FiBox /> INVENTORY</button>
                                        <button className={hubWorkspace === 'docs' ? 'active' : ''} onClick={() => setHubWorkspace('docs')}><FiFileText /> DOCS</button>
                                        <button className={hubWorkspace === 'qr' ? 'active' : ''} onClick={() => setHubWorkspace('qr')}><FiPrinter /> QR CODE</button>
                                    </div>
                                </div>

                                <div className="panel-workspace-body">
                                    {hubWorkspace === 'history' && (
                                        <div className="ws-content">
                                            <div className="ws-header-actions">
                                                <div className="ws-title-group">
                                                    <h3>{isCalibration ? 'CALIBRATION LOG' : 'MAINTENANCE HISTORY'}</h3>
                                                    <p>{isCalibration ? 'Recorded accuracy checks' : 'Logged activities'}</p>
                                                </div>
                                                <button className="hub-primary-btn" onClick={() => setShowLogModal(true)}><FiPlus /> NEW ENTRY</button>
                                            </div>

                                            <div className="history-timeline">
                                                {logs.length === 0 ? (
                                                    <div className="empty-state-visual"><FiActivity /><p>No logs found.</p></div>
                                                ) : logs.map(log => (
                                                    <div key={log.id} className="timeline-item">
                                                        <div className={`t-status ${log.status}`}>{log.status.toUpperCase()}</div>
                                                        <div className="t-content">
                                                            <div className="t-header">
                                                                <h4>{log.description}</h4>
                                                                <span>{new Date(log.work_date).toLocaleString()}</span>
                                                            </div>
                                                            <div className="t-meta">
                                                                <span><FiTool /> BY: {log.technician_name}</span>
                                                                {log.parts_used && <span><FiBox /> PARTS: {log.parts_used}</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {hubWorkspace === 'schedule' && (
                                        <div className="ws-content">
                                            <div className="ws-header-actions">
                                                <div className="ws-title-group">
                                                    <h3>{isCalibration ? 'RE-CALIBRATION PLAN' : 'PREVENTIVE SCHEDULE'}</h3>
                                                    <p>Next verification due dates</p>
                                                </div>
                                                <button className="hub-outline-btn" onClick={() => setShowScheduleModal(true)}><FiSettings /> {schedules.length > 0 ? 'UPDATE' : 'CONFIGURE'}</button>
                                            </div>

                                            <div className="schedule-cards-grid">
                                                {schedules.length === 0 ? (
                                                    <div className="empty-state-visual"><FiClock /><p>No schedule configured.</p></div>
                                                ) : schedules.map(sch => (
                                                    <div key={sch.id} className={`sch-card ${isCalibration ? 'calib' : 'warning'}`}>
                                                        <div className="sch-icon-box"><FiClock /></div>
                                                        <div className="sch-info">
                                                            <span className="sch-category">{sch.task_name || 'ROUTINE CHECK'}</span>
                                                            <h4>Next Due: {new Date(sch.next_due_date).toLocaleDateString()}</h4>
                                                            <p>Interval: Every {sch.frequency_days} Days</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {hubWorkspace === 'inventory' && (
                                        <div className="ws-content">
                                            <div className="ws-header-actions">
                                                <div className="ws-title-group">
                                                    <h3>STOCK MONITORING</h3>
                                                    <p>Inventory level overview for {activeTab.toUpperCase()}</p>
                                                </div>
                                                <div className="inventory-legend">
                                                    <span className="leg-item"><span className="dot safe"></span> OK</span>
                                                    <span className="leg-item"><span className="dot danger"></span> RE-ORDER</span>
                                                </div>
                                            </div>
                                            <div className="inventory-modern-grid">
                                                {inventory.length === 0 ? (
                                                    <div className="empty-state-visual">
                                                        <FiBox />
                                                        <p>Sedang tidak ada stok tersedia untuk kategori ini.</p>
                                                    </div>
                                                ) : inventory.map(item => (
                                                    <div key={item.id} className="inv-item">
                                                        <div className="inv-icon"><FiBox /></div>
                                                        <div className="inv-details">
                                                            <span>{item.item_name}</span>
                                                            <div className="inv-status-row">
                                                                <strong className={item.stock_qty > item.min_stock ? 'in-stock' : 'out-of-stock'}>
                                                                    {item.stock_qty} {item.unit}
                                                                </strong>
                                                                <span className="min-tag">THRESHOLD: {item.min_stock}</span>
                                                            </div>
                                                        </div>
                                                        <div className={`stock-indicator-pill ${item.stock_qty > item.min_stock ? 'safe' : 'danger'}`}></div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {hubWorkspace === 'docs' && (
                                        <div className="ws-content">
                                            <div className="ws-header-actions">
                                                <div className="ws-title-group">
                                                    <h3>DOCUMENTS & SOP</h3>
                                                    <p>Operational resources</p>
                                                </div>
                                                <button className="hub-outline-btn" onClick={() => setShowDocModal(true)}><FiPlus /> ATTACH DOCUMENT</button>
                                            </div>
                                            <div className="doc-grid-modern">
                                                {docs.length === 0 ? (
                                                    <div className="empty-state-visual"><FiFileText /><p>No documents.</p></div>
                                                ) : docs.map(doc => (
                                                    <div key={doc.id} className="doc-item-card">
                                                        <div className={`doc-file-type ${doc.doc_type}`}>{doc.doc_type.toUpperCase()}</div>
                                                        <div className="doc-body">
                                                            <h5>{doc.title}</h5>
                                                            <p>Added: {new Date(doc.created_at).toLocaleDateString()}</p>
                                                        </div>
                                                        <button className="doc-action-icon" onClick={() => window.open(doc.file_url)}><FiDownload /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {hubWorkspace === 'qr' && (
                                        <div className="ws-content qr-plate-workspace">
                                            <div className="qr-plate-container">
                                                <div className="qr-industrial-plate horizontal" id="qr-plate-to-download">
                                                    <div className="plate-inner-horizontal">
                                                        <div className="plate-side-info">
                                                            <div className="plate-logo-group">
                                                                <span style={{ fontWeight: 900, fontSize: '0.95rem', letterSpacing: '0.08em', color: '#0f172a', fontFamily: 'monospace' }}>
                                                                    AGROVISION
                                                                </span>
                                                                <div className="plate-separator"></div>
                                                                <div className="p-brand-stack">
                                                                    <span className="p-station etching-black-sub">{station.toUpperCase()}</span>
                                                                </div>
                                                            </div>
                                                            <div className="plate-call-text etching-black-meta">INDUSTRIAL ASSET MONITORING UNIT</div>
                                                        </div>

                                                        <div className="plate-qr-zone black-etch">
                                                            <div className="qr-wrapper-gold">
                                                                <QRCodeSVG
                                                                    value={`agrovision://asset/${selectedMachine.qr_token || selectedMachine.id}`}
                                                                    size={150}
                                                                    bgColor="transparent"
                                                                    fgColor="#000000"
                                                                    level="H"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="plate-side-details">
                                                            <div className="plate-logo-group">
                                                                <img src={LogoRed} alt="AgroVision" className="p-logo-img-unified-red" />
                                                            </div>
                                                            <div className="p-asset-name etching-black">{selectedMachine.machine_name}</div>
                                                            <div className="p-id-tag etching-black">ASSET ID: {selectedMachine.id.toString().padStart(4, '0')}</div>
                                                            <div className="p-scan-footer etching-black">SCAN TO ACCESS HUB</div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="qr-actions-side">
                                                    <div className="qr-info-pills">
                                                        <div className="info-p"><FiCheckCircle /> READY FOR LOGGING</div>
                                                        <div className="info-p"><FiPrinter /> PRINT READY</div>
                                                    </div>
                                                    <button className="hub-primary-btn download-btn" onClick={handleDownloadPlate}>
                                                        <FiDownload /> DOWNLOAD PLATE
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="workspace-intro">
                                <FiSettings className="intro-spin" />
                                <h3>Select a {term.toLowerCase()} to begin</h3>
                                <p>Access maintenance logs, schedules, inventory, and QR codes.</p>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* MODALS */}
            {showLogModal && (
                <div className="hub-modal-overlay">
                    <div className="hub-modal">
                        <div className="hub-modal-header">
                            <h3>NEW {isCalibration ? 'CALIBRATION' : 'MAINTENANCE'} ENTRY</h3>
                            <button onClick={() => setShowLogModal(false)}><FiX /></button>
                        </div>
                        <form className="hub-modal-body" onSubmit={handleAddLog}>
                            <div className="form-group">
                                <label>Description / Work Done</label>
                                <textarea required value={logForm.description} onChange={e => setLogForm({ ...logForm, description: e.target.value })} />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Technician Name</label>
                                    <input type="text" required value={logForm.technician} onChange={e => setLogForm({ ...logForm, technician: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Parts/Materials (Optional)</label>
                                    <input type="text" value={logForm.parts} onChange={e => setLogForm({ ...logForm, parts: e.target.value })} />
                                </div>
                            </div>
                            <button type="submit" className="hub-primary-btn">SAVE LOG</button>
                        </form>
                    </div>
                </div>
            )}

            {showScheduleModal && (
                <div className="hub-modal-overlay">
                    <div className="hub-modal">
                        <div className="hub-modal-header">
                            <h3>CONFIGURE PREVENTIVE INTERVAL</h3>
                            <button onClick={() => setShowScheduleModal(false)}><FiX /></button>
                        </div>
                        <form className="hub-modal-body" onSubmit={handleUpdateSchedule}>
                            <div className="form-group">
                                <label>Task Name</label>
                                <input type="text" required value={scheduleForm.task} onChange={e => setScheduleForm({ ...scheduleForm, task: e.target.value })} />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Frequency (Days)</label>
                                    <input type="number" required value={scheduleForm.frequency} onChange={e => setScheduleForm({ ...scheduleForm, frequency: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Next Due Date</label>
                                    <input type="date" required value={scheduleForm.nextDate} onChange={e => setScheduleForm({ ...scheduleForm, nextDate: e.target.value })} />
                                </div>
                            </div>
                            <button type="submit" className="hub-primary-btn">SAVE SCHEDULE</button>
                        </form>
                    </div>
                </div>
            )}

            {showDocModal && (
                <div className="hub-modal-overlay">
                    <div className="hub-modal">
                        <div className="hub-modal-header">
                            <h3>ATTACH DOCUMENTATION</h3>
                            <button onClick={() => setShowDocModal(false)}><FiX /></button>
                        </div>
                        <form className="hub-modal-body" onSubmit={handleAddDoc}>
                            <div className="form-group">
                                <label>Document Title</label>
                                <input type="text" required value={docForm.title} onChange={e => setDocForm({ ...docForm, title: e.target.value })} />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Type</label>
                                    <select value={docForm.type} onChange={e => setDocForm({ ...docForm, type: e.target.value })}>
                                        <option value="manual">Manual</option>
                                        <option value="sop">SOP</option>
                                        <option value="drawing">Drawing</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>URL / File Path</label>
                                    <input type="text" required value={docForm.url} onChange={e => setDocForm({ ...docForm, url: e.target.value })} />
                                </div>
                            </div>
                            <button type="submit" className="hub-primary-btn">ATTACH DOCUMENT</button>
                        </form>
                    </div>
                </div>
            )}
            {showDeleteModal && machineToDelete && (
                <div className="hub-modal-overlay">
                    <div className="hub-modal danger-theme">
                        <div className="hub-modal-header danger">
                            <div className="title-with-icon">
                                <FiAlertCircle />
                                <h3>CRITICAL ACTION: DATA TERMINATION</h3>
                            </div>
                            <button onClick={() => setShowDeleteModal(false)}><FiX /></button>
                        </div>
                        <div className="hub-modal-body">
                            <div className="danger-message-box">
                                <p>You are about to permanently delete <strong>{machineToDelete.machine_name}</strong> from the <strong>{station}</strong> system.</p>
                                <div className="consequence-list">
                                    <div className="consequence-item">
                                        <FiX />
                                        <span>Entire Maintenance & Calibration History will be <strong>erased</strong>.</span>
                                    </div>
                                    <div className="consequence-item">
                                        <FiX />
                                        <span>Active Preventive Schedules will be <strong>cancelled</strong>.</span>
                                    </div>
                                    <div className="consequence-item">
                                        <FiX />
                                        <span>All linked Manuals, Drawings, and SOPs will be <strong>detached</strong>.</span>
                                    </div>
                                </div>
                                <p className="final-warning">This action is irreversible. All associated database records will be purged.</p>
                            </div>

                            <div className="modal-actions-row">
                                <button className="hub-outline-btn" onClick={() => setShowDeleteModal(false)}>CANCEL</button>
                                <button className="hub-primary-btn danger" onClick={confirmDelete}>DELETE PERMANENTLY</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MaintenanceHub;
