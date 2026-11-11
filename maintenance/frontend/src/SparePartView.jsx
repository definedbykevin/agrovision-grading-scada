import { useState, useEffect } from 'react';
import {
  FiPackage, FiPlus, FiEdit2, FiTrash2, FiX, FiTool, FiAlertTriangle,
  FiActivity, FiClock, FiBox, FiFileText, FiPrinter,
  FiCheckCircle, FiAlertCircle, FiDownload
} from 'react-icons/fi';
import QRPlate from './QRPlate.jsx';
import './SparePartView.css';

/* ── Dummy data helpers ──────────────────────────────────── */
const DUMMY_SCHEDULE = [
  { id: 1, task: 'Pengecekan Bearing', interval: 30,  nextDue: '2026-07-09', status: 'upcoming' },
  { id: 2, task: 'Penggantian V-Belt',  interval: 90,  nextDue: '2026-08-01', status: 'upcoming' },
  { id: 3, task: 'Pelumasan Shaft',     interval: 14,  nextDue: '2026-06-20', status: 'overdue'  },
];

const DUMMY_INVENTORY = [
  { id: 1, item: 'Bearing SKF 6205',        stock: 8,  unit: 'PCS',   min: 3,  status: 'ok'      },
  { id: 2, item: 'V-Belt B-54',             stock: 2,  unit: 'PCS',   min: 4,  status: 'low'     },
  { id: 3, item: 'Mechanical Seal 25mm',    stock: 0,  unit: 'SET',   min: 2,  status: 'empty'   },
  { id: 4, item: 'Gasket Spiral Wound 4"',  stock: 15, unit: 'PCS',   min: 10, status: 'ok'      },
  { id: 5, item: 'Grease Alvania R2',       stock: 5,  unit: 'KG',    min: 5,  status: 'low'     },
];

const DUMMY_DOCS = [
  { id: 1, title: 'Manual Operasi Mesin',   type: 'MANUAL', date: '2025-01-15', url: '#' },
  { id: 2, title: 'SOP Penggantian Spare Part', type: 'SOP', date: '2025-03-10', url: '#' },
  { id: 3, title: 'Assembly Drawing',       type: 'DWG',    date: '2024-11-20', url: '#' },
];

/* ── Tab config ──────────────────────────────────────────── */
const TABS = [
  { key: 'history',   label: 'HISTORY',   icon: FiActivity  },
  { key: 'schedule',  label: 'SCHEDULE',  icon: FiClock     },
  { key: 'inventory', label: 'INVENTORY', icon: FiBox       },
  { key: 'docs',      label: 'DOCS',      icon: FiFileText  },
  { key: 'qr',        label: 'QR CODE',   icon: FiPrinter   },
];

/* ═══════════════════════════════════════════════════════════ */
function SparePartView({ station = '' }) {
  const [machines, setMachines]             = useState([]);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [parts, setParts]                   = useState([]);
  const [loading, setLoading]               = useState(true);
  const [activeTab, setActiveTab]           = useState('history');

  /* history from DB */
  const [logs, setLogs] = useState([]);

  /* add part modal */
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPartName, setNewPartName]   = useState('');
  const [saving, setSaving]             = useState(false);

  /* delete part modal */
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [partToDelete, setPartToDelete]       = useState(null);

  /* ── fetch ── */
  useEffect(() => { if (station) fetchData(); }, [station]);

  useEffect(() => {
    if (selectedMachine) {
      const found = machines.find(m => m.id === selectedMachine.id);
      setParts(found?.parts || []);
      if (activeTab === 'history') fetchLogs(selectedMachine.id);
    } else {
      setParts([]); setLogs([]);
    }
  }, [selectedMachine, machines]);

  useEffect(() => {
    if (activeTab === 'history' && selectedMachine) fetchLogs(selectedMachine.id);
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/maintenance/machinery/all', { credentials: 'include' });
      if (!res.ok) return;
      const result = await res.json();
      if (result.success) {
        const found = result.data.find(s => s.station_name === station);
        const list  = found?.machines || [];
        setMachines(list);
        setSelectedMachine(prev => {
          if (prev && list.find(m => m.id === prev.id)) return list.find(m => m.id === prev.id);
          return list[0] || null;
        });
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchLogs = async (machineId) => {
    try {
      const res = await fetch(`/api/maintenance/logs/${machineId}/spare-part`, { credentials: 'include' });
      const result = await res.json();
      if (result.success) setLogs(result.data);
    } catch (err) { console.error(err); }
  };

  /* ── add part ── */
  const handleAddPart = async (e) => {
    e.preventDefault();
    if (!newPartName.trim() || !selectedMachine) return;
    setSaving(true);
    try {
      const res = await fetch('/api/maintenance/machinery/parts/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ machineId: selectedMachine.id, partName: newPartName.trim() }),
      });
      const result = await res.json();
      if (result.success) { setShowAddModal(false); setNewPartName(''); fetchData(); }
      else alert('Failed: ' + (result.error || result.message));
    } catch (err) { alert('Error: ' + err.message); }
    finally { setSaving(false); }
  };

  /* ── edit part ── */
  const handleEditPart = async (part) => {
    const newName = prompt('Enter new part name:', part.part_name);
    if (!newName || !newName.trim() || newName === part.part_name) return;
    try {
      const res = await fetch(`/api/maintenance/machinery/parts/${part.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newName.trim() }),
      });
      const result = await res.json();
      if (result.success) fetchData();
      else alert('Failed: ' + (result.error || result.message));
    } catch (err) { alert('Error: ' + err.message); }
  };

  /* ── delete part ── */
  const confirmDelete = async () => {
    if (!partToDelete) return;
    try {
      const res = await fetch(`/api/maintenance/machinery/parts/${partToDelete.id}`, {
        method: 'DELETE', credentials: 'include',
      });
      const result = await res.json();
      if (result.success) { setShowDeleteModal(false); setPartToDelete(null); fetchData(); }
      else alert('Failed: ' + (result.error || result.message));
    } catch (err) { alert('Error: ' + err.message); }
  };

  /* ── tab content renderers ── */
  const renderHistory = () => (
    <div className="spv-tab-content">
      <div className="spv-tab-toolbar">
        <div>
          <p className="spv-section-title">MAINTENANCE HISTORY</p>
          <p className="spv-section-sub">Logged activities for {selectedMachine?.machine_name}</p>
        </div>
      </div>
      {logs.length === 0 ? (
        <div className="spv-empty"><FiActivity size={40} /><p>No history found</p></div>
      ) : (
        <div className="spv-timeline">
          {logs.map(log => (
            <div key={log.id} className="spv-timeline-item">
              <div className={`spv-tl-badge ${log.status}`}>{log.status.toUpperCase()}</div>
              <div className="spv-tl-body">
                <div className="spv-tl-header">
                  <span className="spv-tl-desc">{log.description}</span>
                  <span className="spv-tl-date">{new Date(log.work_date).toLocaleString('id-ID')}</span>
                </div>
                <div className="spv-tl-meta">
                  <span><FiTool size={11} /> {log.technician_name || '-'}</span>
                  {log.parts_used && <span><FiPackage size={11} /> {log.parts_used}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderSchedule = () => (
    <div className="spv-tab-content">
      <div className="spv-tab-toolbar">
        <div>
          <p className="spv-section-title">PREVENTIVE SCHEDULE</p>
          <p className="spv-section-sub">Next maintenance due dates</p>
        </div>
      </div>
      <div className="spv-schedule-list">
        {DUMMY_SCHEDULE.map(s => (
          <div key={s.id} className={`spv-schedule-card ${s.status}`}>
            <div className="spv-sch-icon">
              {s.status === 'overdue' ? <FiAlertCircle /> : <FiCheckCircle />}
            </div>
            <div className="spv-sch-info">
              <span className="spv-sch-task">{s.task}</span>
              <span className="spv-sch-interval">Every {s.interval} days</span>
            </div>
            <div className="spv-sch-due">
              <span className="spv-sch-due-label">Next Due</span>
              <span className={`spv-sch-due-date ${s.status}`}>{s.nextDue}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderInventory = () => (
    <div className="spv-tab-content">
      <div className="spv-tab-toolbar">
        <div>
          <p className="spv-section-title">STOCK MONITORING</p>
          <p className="spv-section-sub">Spare part inventory levels</p>
        </div>
        <div className="spv-legend">
          <span className="spv-legend-item ok"><span />OK</span>
          <span className="spv-legend-item low"><span />LOW</span>
          <span className="spv-legend-item empty"><span />EMPTY</span>
        </div>
      </div>
      <div className="spv-inventory-grid">
        {DUMMY_INVENTORY.map(item => (
          <div key={item.id} className="spv-inv-card">
            <div className={`spv-inv-stripe ${item.status}`} />
            <div className="spv-inv-icon"><FiBox /></div>
            <div className="spv-inv-info">
              <span className="spv-inv-name">{item.item}</span>
              <div className="spv-inv-row">
                <strong className={`spv-inv-qty ${item.status}`}>
                  {item.stock} {item.unit}
                </strong>
                <span className="spv-inv-min">Min: {item.min}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderDocs = () => (
    <div className="spv-tab-content">
      <div className="spv-tab-toolbar">
        <div>
          <p className="spv-section-title">DOCUMENTS & SOP</p>
          <p className="spv-section-sub">Operational references</p>
        </div>
      </div>
      <div className="spv-docs-grid">
        {DUMMY_DOCS.map(doc => (
          <div key={doc.id} className="spv-doc-card">
            <div className={`spv-doc-type ${doc.type.toLowerCase()}`}>{doc.type}</div>
            <div className="spv-doc-info">
              <span className="spv-doc-title">{doc.title}</span>
              <span className="spv-doc-date">Added: {doc.date}</span>
            </div>
            <button className="spv-doc-dl" onClick={() => window.open(doc.url)}>
              <FiDownload />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderQR = () => (
    <div className="spv-tab-content">
      <div className="spv-tab-toolbar">
        <div>
          <p className="spv-section-title">QR CODE</p>
          <p className="spv-section-sub">Asset identification for {selectedMachine?.machine_name}</p>
        </div>
      </div>
      <QRPlate machine={selectedMachine} station={station} accentColor="gold" />
    </div>
  );

  const renderParts = () => (
    <div className="spv-tab-content">
      <div className="spv-tab-toolbar">
        <div>
          <p className="spv-section-title">SPARE PARTS</p>
          <p className="spv-section-sub">Parts registered for {selectedMachine?.machine_name}</p>
        </div>
        <button className="spv-btn-add" onClick={() => setShowAddModal(true)}>
          <FiPlus /> Add Part
        </button>
      </div>
      {parts.length === 0 ? (
        <div className="spv-empty">
          <FiPackage size={40} />
          <p>No parts registered yet</p>
          <small>Click "Add Part" to register the first part</small>
        </div>
      ) : (
        <div className="spv-parts-list">
          {parts.map(part => (
            <div key={part.id} className="spv-part-card">
              <div className="spv-part-icon"><FiPackage /></div>
              <span className="spv-part-name">{part.part_name}</span>
              <div className="spv-part-actions">
                <button className="spv-btn-edit" onClick={() => handleEditPart(part)}>
                  <FiEdit2 /> Edit
                </button>
                <button className="spv-btn-delete"
                  onClick={() => { setPartToDelete(part); setShowDeleteModal(true); }}>
                  <FiTrash2 /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const TAB_RENDERERS = {
    history:   renderHistory,
    schedule:  renderSchedule,
    inventory: renderInventory,
    docs:      renderDocs,
    qr:        renderQR,
    parts:     renderParts,
  };

  /* ═══════════════════════════════════════════════════════ */
  return (
    <div className="spv-shell">

      {/* ── Page Header ── */}
      <header className="spv-header">
        <div className="spv-header-left">
          <div className="spv-header-icon"><FiPackage /></div>
          <div>
            <p className="spv-header-title">Spare Part Replacement</p>
            <p className="spv-header-subtitle">{station}</p>
          </div>
        </div>
        <span className="spv-badge">MAINTENANCE / SPARE PART</span>
      </header>

      {/* ── Body ── */}
      <div className="spv-body">

        {/* Sidebar */}
        <aside className="spv-sidebar">
          <div className="spv-sidebar-header"><FiTool size={13} /> Machines</div>
          <div className="spv-machine-list">
            {loading ? (
              <div className="spv-loading">Loading...</div>
            ) : machines.length === 0 ? (
              <div className="spv-empty">
                <FiTool size={32} /><p>No machines found</p>
                <small>Add via Machinery List</small>
              </div>
            ) : machines.map(m => (
              <div
                key={m.id}
                className={`spv-machine-card ${selectedMachine?.id === m.id ? 'active' : ''}`}
                onClick={() => { setSelectedMachine(m); setActiveTab('history'); }}
              >
                <div className="spv-machine-card-left">
                  <div className="spv-machine-dot" />
                  <span className="spv-machine-name">{m.machine_name}</span>
                </div>
                <span className="spv-machine-count">{m.parts?.length || 0}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* Main */}
        <main className="spv-main">
          {selectedMachine ? (
            <>
              {/* Machine heading */}
              <div className="spv-machine-header">
                <div className="spv-machine-heading">
                  <h2 className="spv-machine-title">{selectedMachine.machine_name}</h2>
                  <div className="spv-machine-meta">
                    <span className="spv-machine-id">
                      ID: {selectedMachine.id.toString().padStart(4, '0')}
                    </span>
                    <div className="spv-status-badge">
                      <span className="spv-status-dot" /> OPERATIONAL
                    </div>
                  </div>
                </div>

                {/* ── Tab bar ── */}
                <nav className="spv-tab-bar">
                  {TABS.map(tab => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.key}
                        className={`spv-tab-btn ${activeTab === tab.key ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.key)}
                      >
                        <Icon size={13} />
                        {tab.label}
                      </button>
                    );
                  })}
                  {/* Extra: Spare Parts tab */}
                  <button
                    className={`spv-tab-btn ${activeTab === 'parts' ? 'active' : ''}`}
                    onClick={() => setActiveTab('parts')}
                  >
                    <FiPackage size={13} /> SPARE PARTS
                  </button>
                </nav>
              </div>

              {/* Tab content */}
              <div className="spv-workspace">
                {TAB_RENDERERS[activeTab]?.()}
              </div>
            </>
          ) : (
            <div className="spv-intro">
              <FiTool size={48} style={{ opacity: 0.2 }} />
              <h3>Select a machine to begin</h3>
              <p>Choose a machine from the sidebar</p>
            </div>
          )}
        </main>
      </div>

      {/* ── Add Part Modal ── */}
      {showAddModal && (
        <div className="spv-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="spv-modal" onClick={e => e.stopPropagation()}>
            <div className="spv-modal-header">
              <h3>Add Spare Part</h3>
              <button className="spv-modal-close"
                onClick={() => { setShowAddModal(false); setNewPartName(''); }}>
                <FiX />
              </button>
            </div>
            <form className="spv-modal-body" onSubmit={handleAddPart}>
              <div className="spv-form-group">
                <label>Machine</label>
                <input type="text" value={selectedMachine?.machine_name || ''} disabled />
              </div>
              <div className="spv-form-group">
                <label>Part Name</label>
                <input
                  type="text"
                  placeholder="e.g. Bearing SKF 6205"
                  value={newPartName}
                  onChange={e => setNewPartName(e.target.value)}
                  required autoFocus
                />
              </div>
              <div className="spv-modal-actions">
                <button type="button" className="spv-btn-cancel"
                  onClick={() => { setShowAddModal(false); setNewPartName(''); }}>
                  Cancel
                </button>
                <button type="submit" className="spv-btn-save"
                  disabled={saving || !newPartName.trim()}>
                  {saving ? 'Saving...' : 'Save Part'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {showDeleteModal && partToDelete && (
        <div className="spv-modal-overlay"
          onClick={() => { setShowDeleteModal(false); setPartToDelete(null); }}>
          <div className="spv-modal" onClick={e => e.stopPropagation()}>
            <div className="spv-modal-header danger">
              <h3><FiAlertTriangle style={{ marginRight: 6 }} />Delete Part</h3>
              <button className="spv-modal-close"
                onClick={() => { setShowDeleteModal(false); setPartToDelete(null); }}>
                <FiX />
              </button>
            </div>
            <div className="spv-modal-body">
              <div className="spv-danger-box">
                <p>Are you sure you want to delete <strong>{partToDelete.part_name}</strong>?</p>
                <p className="warn">This action cannot be undone.</p>
              </div>
              <div className="spv-modal-actions">
                <button className="spv-btn-cancel"
                  onClick={() => { setShowDeleteModal(false); setPartToDelete(null); }}>
                  Cancel
                </button>
                <button className="spv-btn-danger" onClick={confirmDelete}>
                  <FiTrash2 /> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SparePartView;
