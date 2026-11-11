import { useState, useEffect } from 'react'
import './CmrsPage.css'

function CmrsPage() {
    return (
        <div className="som-cmrs-page">
            <header className="som-cmrs-header">
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <h1 className="som-cmrs-title">CMRS MONITORING</h1>
                    <div className="som-cmrs-subtitle">CONTINUOUS MONITORING RECORDING SYSTEM (STACK EMISSIONS)</div>
                </div>
                <div className="cmrs-status-box">
                    COMPLIANT (DOE STANDARDS)
                </div>
            </header>

            <main className="som-cmrs-content">
                <section className="som-stack-hero">
                    <div className="opacity-gauge">
                        <div className="gauge-value">12.4%</div>
                        <div className="gauge-label">OPACITY</div>
                    </div>
                </section>

                <div className="cmrs-data-grid">
                    <div className="cmrs-card">
                        <div className="card-label">PARTICULATE MATTER (PM)</div>
                        <div className="cmrs-value">32.4 <small>MG/NM³</small></div>
                        <div className="cmrs-limit">LIMIT: 150 MG/NM³</div>
                        <div className="cmrs-progress-bar">
                            <div className="fill" style={{ width: '22%' }}></div>
                        </div>
                    </div>
                    
                    <div className="cmrs-card">
                        <div className="card-label">SULFUR DIOXIDE (SO2)</div>
                        <div className="cmrs-value">12.5 <small>PPM</small></div>
                        <div className="cmrs-limit">LIMIT: 500 PPM</div>
                        <div className="cmrs-progress-bar">
                            <div className="fill" style={{ width: '5%' }}></div>
                        </div>
                    </div>

                    <div className="cmrs-card">
                        <div className="card-label">NITROGEN OXIDES (NOX)</div>
                        <div className="cmrs-value">142 <small>PPM</small></div>
                        <div className="cmrs-limit">LIMIT: 800 PPM</div>
                        <div className="cmrs-progress-bar">
                            <div className="fill" style={{ width: '18%' }}></div>
                        </div>
                    </div>

                    <div className="cmrs-card">
                        <div className="card-label">CARBON MONOXIDE (CO)</div>
                        <div className="cmrs-value">42.1 <small>PPM</small></div>
                        <div className="cmrs-limit">LIMIT: 500 PPM</div>
                        <div className="cmrs-progress-bar">
                            <div className="fill" style={{ width: '8%' }}></div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

export default CmrsPage
