import React from 'react'
import './ContactInfoPage.css'

const DeveloperPage = () => {
    return (
        <div className="som-developer-portal">
            <main className="som-dev-content-area" style={{ paddingTop: '2rem' }}>
                <div className="contact-page-container animate-fade-in">
                    <div className="contact-card">
                        <div className="role-tag">SYSTEM DEVELOPER</div>
                        <div className="logo-container" style={{ margin: '1.5rem 0' }}>
                            <span style={{
                                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                fontSize: '1.6rem',
                                fontWeight: 800,
                                color: '#047857',
                                background: '#ecfdf5',
                                padding: '8px 24px',
                                borderRadius: '12px',
                                border: '2px solid #a7f3d0',
                                letterSpacing: '0.04em'
                            }}>
                                &lt; &#123;definedbykevin&#125; /&gt;
                            </span>
                        </div>
                        <h1 className="company-name">Kevin &bull; Industrial AI &amp; SCADA Engineer</h1>
                        <p className="company-desc">Architecting robust edge computer vision, automated PLC telemetry, and enterprise SCADA web applications for modern industrial manufacturing.</p>

                        <div className="info-grid">
                            <div className="info-item">
                                <label>Field of Expertise</label>
                                <p>Industrial AI, SCADA &amp; Edge Vision</p>
                            </div>
                            <div className="info-item">
                                <label>GitHub Portfolio</label>
                                <p><a href="https://github.com/definedbykevin" target="_blank" rel="noreferrer" style={{ color: '#047857', textDecoration: 'none', fontWeight: 600 }}>github.com/definedbykevin</a></p>
                            </div>
                            <div className="info-item">
                                <label>Specialization</label>
                                <p>YOLO, OpenVINO, React &amp; S7/Snap7</p>
                            </div>
                            <div className="info-item">
                                <label>Project Repository</label>
                                <p><a href="https://github.com/definedbykevin/agrovision-grading-scada" target="_blank" rel="noreferrer" style={{ color: '#047857', textDecoration: 'none', fontWeight: 600 }}>agrovision-grading-scada</a></p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

export default DeveloperPage
