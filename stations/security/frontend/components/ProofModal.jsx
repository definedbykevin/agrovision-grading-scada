import React from 'react';
import { createPortal } from 'react-dom';

function ProofModal({ activeProof, setActiveProof, proofIndex, setProofIndex, currentTime }) {
    if (!activeProof) return null;

    const downloadWithWatermark = () => {
        if (!activeProof || !activeProof.proofs || activeProof.proofs.length === 0) return;
        const currentProof = activeProof.proofs[proofIndex];
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.src = currentProof.img;

        img.onload = () => {
            canvas.width = 1024;
            canvas.height = 1024;
            ctx.drawImage(img, 0, 0, 1024, 1024);

            // 1. TOP BRAND OVERLAY
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fillRect(0, 0, canvas.width, 60);

            ctx.font = 'bold 20px "Inter", sans-serif';
            ctx.fillStyle = '#0f172a';
            ctx.textAlign = 'left';
            ctx.fillText('AgroVision V2 SECURITY', 30, 38);

            ctx.fillStyle = '#ffdb3b';
            ctx.font = 'bold 12px "Inter", sans-serif';
            ctx.fillText('• SECURE SITE VERIFIED', 230, 37);

            // 2. BOTTOM DATA BAR
            const barHeight = 140;
            const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
            gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.95)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 1)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);

            // STATION LABEL (GOLD)
            ctx.font = 'bold 14px "Inter", sans-serif';
            ctx.fillStyle = '#ffdb3b';
            ctx.textAlign = 'left';
            ctx.fillText('STATION:', 30, canvas.height - 90);

            ctx.font = 'bold 36px "Inter", sans-serif';
            ctx.fillStyle = '#0f172a';
            ctx.fillText(activeProof.name.toUpperCase(), 30, canvas.height - 50);

            // GUARD LABEL
            ctx.font = 'bold 14px "Inter", sans-serif';
            ctx.fillStyle = '#64748b';
            ctx.fillText('GUARD:', 30, canvas.height - 25);
            ctx.fillStyle = '#0f172a';
            ctx.font = '700 16px "Inter", sans-serif';
            ctx.fillText(`${currentProof.guard}`, 95, canvas.height - 25);

            // RIGHT SIDE: TIME & DATE
            ctx.textAlign = 'right';
            ctx.font = 'bold 14px "Inter", sans-serif';
            ctx.fillStyle = '#64748b';
            ctx.fillText('TIME:', canvas.width - 200, canvas.height - 65);
            ctx.font = 'bold 24px "JetBrains Mono", monospace';
            ctx.fillStyle = '#0f172a';
            ctx.fillText(currentProof.time || currentTime, canvas.width - 30, canvas.height - 65);

            ctx.font = 'bold 14px "Inter", sans-serif';
            ctx.fillStyle = '#64748b';
            ctx.fillText('DATE:', canvas.width - 200, canvas.height - 25);
            ctx.font = 'bold 24px "JetBrains Mono", monospace';
            ctx.fillStyle = '#0f172a';
            ctx.fillText(currentProof.date || new Date().toLocaleDateString('id-ID'), canvas.width - 30, canvas.height - 25);

            // Final Accent Line
            ctx.fillStyle = '#ffdb3b';
            ctx.fillRect(30, canvas.height - 42, 250, 2);

            const a = document.createElement('a');
            a.href = canvas.toDataURL('image/jpeg', 0.9);
            a.download = `VERIFIED_PATROL_${activeProof.name.replace(/\s+/g, '_')}_${currentProof.id}.jpg`;
            a.click();
        };
    };

    return createPortal(
        <div className="som-proof-modal-overlay">
            <div className="som-proof-modal-content animate-in">
                <div className="som-proof-modal-header">
                    <h2>VERIFIED PATROL PROOF</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                        <span className="live-tag">LIVE SYNCED</span>
                        <button className="som-close-modal" onClick={() => setActiveProof(null)}>×</button>
                    </div>
                </div>
                <div className="som-proof-modal-body">
                    <div className="som-proof-image-stage">
                        <img src={activeProof.proofs[proofIndex].img} alt="Guard Proof" />

                        {activeProof.proofs.length > 1 && (
                            <div className="som-proof-gallery-nav">
                                <button className="nav-btn prev" onClick={() => setProofIndex((proofIndex - 1 + activeProof.proofs.length) % activeProof.proofs.length)}>‹</button>
                                <div className="gallery-info">PATROL {proofIndex + 1} OF {activeProof.proofs.length}</div>
                                <button className="nav-btn next" onClick={() => setProofIndex((proofIndex + 1) % activeProof.proofs.length)}>›</button>
                            </div>
                        )}

                        <div className="som-proof-watermark">
                            <div className="w-row"><span className="w-label">STATION:</span> <span className="w-val">{activeProof.name}</span></div>
                            <div className="w-row">
                                <span className="w-label">GUARD:</span>
                                <span className="w-val">
                                    {activeProof.proofs[proofIndex].guard}
                                </span>
                            </div>
                            <div className="w-row"><span className="w-label">TIMESTAMP:</span> <span className="w-val">{activeProof.proofs[proofIndex].time || currentTime}</span></div>
                        </div>
                    </div>
                    <div className="som-proof-modal-actions">
                        <button className="som-btn-download" onClick={downloadWithWatermark}>
                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            SAVE & DOWNLOAD WATERMARK
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

export default ProofModal;
