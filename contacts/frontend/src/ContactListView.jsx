import React, { useState, useEffect } from 'react';
import { FiPhone, FiMail, FiUser, FiBriefcase, FiMapPin, FiPlus, FiEdit2, FiTrash2, FiSearch, FiX } from 'react-icons/fi';
import './ContactListView.css';

function ContactListView({ user }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [currentContact, setCurrentContact] = useState(null);
  
  // Form State
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [station, setStation] = useState('ALL');

  const isAdmin = user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'developer';

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/contacts', { credentials: 'include' });
      const result = await res.json();
      if (result.success) {
        setContacts(result.data);
      } else {
        console.error('Failed to load contacts:', result.error);
      }
    } catch (err) {
      console.error('Error fetching contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleOpenAdd = () => {
    setCurrentContact(null);
    setName('');
    setRole('');
    setPhone('');
    setEmail('');
    setStation('ALL');
    setModalOpen(true);
  };

  const handleOpenEdit = (contact) => {
    setCurrentContact(contact);
    setName(contact.name);
    setRole(contact.role);
    setPhone(contact.phone || '');
    setEmail(contact.email || '');
    setStation(contact.station || 'ALL');
    setModalOpen(true);
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Are you sure you want to delete contact for "${name}"?`)) return;
    try {
      const res = await fetch(`/api/contacts/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const result = await res.json();
      if (result.success) {
        fetchContacts();
      } else {
        alert('Failed to delete: ' + result.error);
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { name, role, phone, email, station };
    const method = currentContact ? 'PUT' : 'POST';
    const url = currentContact ? `/api/contacts/${currentContact.id}` : '/api/contacts';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });
      const result = await res.json();
      if (result.success) {
        setModalOpen(false);
        fetchContacts();
      } else {
        alert('Failed to save: ' + result.error);
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const filteredContacts = contacts.filter(c => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.role.toLowerCase().includes(q) ||
      (c.station && c.station.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

  return (
    <div className="contacts-dir-container">
      <div className="contacts-dir-header">
        <div className="header-left">
          <div className="role-tag">Directory</div>
          <h1 className="contacts-title">Mill Operations Directory</h1>
          <p className="contacts-subtitle">Official contacts for KIP Mill managers, shift engineers, and vendor support</p>
        </div>
        {isAdmin && (
          <button className="btn-add-contact" onClick={handleOpenAdd}>
            <FiPlus /> Add Personnel
          </button>
        )}
      </div>

      <div className="contacts-controls">
        <div className="search-box">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search directory by name, role, or station..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <FiX className="clear-icon" onClick={() => setSearch('')} />}
        </div>
      </div>

      {loading ? (
        <div className="contacts-loading">Loading directory listings...</div>
      ) : filteredContacts.length === 0 ? (
        <div className="contacts-empty">No personnel contacts match your query.</div>
      ) : (
        <div className="contacts-grid animate-fade-in">
          {filteredContacts.map(c => (
            <div key={c.id} className="contact-dir-card">
              <div className="contact-card-glow" />
              <div className="contact-card-body">
                <div className="contact-main">
                  <div className="contact-avatar">
                    <FiUser />
                  </div>
                  <div>
                    <h3 className="contact-name">{c.name}</h3>
                    <div className="contact-role-badge">
                      <FiBriefcase className="card-icon" />
                      {c.role}
                    </div>
                  </div>
                </div>

                <div className="contact-details">
                  <div className="detail-row">
                    <FiMapPin className="card-icon" />
                    <span>Station: <strong>{c.station}</strong></span>
                  </div>
                  <div className="detail-row">
                    <FiPhone className="card-icon" />
                    <span>{c.phone || '—'}</span>
                  </div>
                  <div className="detail-row">
                    <FiMail className="card-icon" />
                    <span>{c.email || '—'}</span>
                  </div>
                </div>

                {isAdmin && (
                  <div className="contact-actions">
                    <button className="btn-edit" onClick={() => handleOpenEdit(c)} title="Edit Contact">
                      <FiEdit2 /> Edit
                    </button>
                    <button className="btn-delete" onClick={() => handleDelete(c.id, c.name)} title="Delete Contact">
                      <FiTrash2 /> Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Dialog */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{currentContact ? 'Edit Personnel Contact' : 'Register Personnel Contact'}</h2>
              <button className="btn-close" onClick={() => setModalOpen(false)}>
                <FiX />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ahmad Fauzi"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Role / Position</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mill Manager"
                  value={role}
                  onChange={e => setRole(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. 081234567890"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. engineer@agrovision.io"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Station Responsibility</label>
                <input
                  type="text"
                  placeholder="e.g. STERILIZER, PRESS, or ALL"
                  value={station}
                  onChange={e => setStation(e.target.value)}
                />
              </div>
              <button type="submit" className="btn-submit">
                {currentContact ? 'Update Contact' : 'Register Contact'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContactListView;
