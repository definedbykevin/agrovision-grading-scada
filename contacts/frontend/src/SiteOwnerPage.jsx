import React from 'react'
import './ContactInfoPage.css'

const SiteOwnerPage = () => {
    return (
        <div className="contact-page-container">
            <div className="contact-card" style={{ textAlign: 'center', padding: '60px 40px', minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div className="role-tag" style={{ background: 'rgba(148, 163, 184, 0.1)', color: '#94a3b8', margin: '0 auto 20px' }}>MILL OWNER & OPERATOR</div>
                
                <div className="empty-state-icon" style={{ fontSize: '4rem', marginBottom: '20px', opacity: 0.3 }}>
                    🏢
                </div>
                
                <h1 className="company-name" style={{ color: '#94a3b8', fontStyle: 'italic' }}>Site Owner Information Pending</h1>
                <p className="company-desc" style={{ maxWidth: '300px', margin: '0 auto' }}>
                    The official mill owner and operator data for this station has not been configured in the system.
                </p>

                <div style={{ marginTop: '40px', paddingTop: '40px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Please contact the system developer for administrator assignment.</p>
                </div>
            </div>
        </div>
    )
}

export default SiteOwnerPage
