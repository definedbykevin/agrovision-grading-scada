import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import SharedCctvStream from './SharedCctvStream.jsx';

function CctvModal({ selectedCctv, setSelectedCctv, cctvCameras = [] }) {
    const isOpen = Boolean(selectedCctv);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                setSelectedCctv(null);
                return;
            }
            if (event.ctrlKey || event.metaKey || event.altKey
                || event.target?.closest?.('input, textarea, select, [contenteditable="true"]')) return;

            const key = event.key.toLowerCase();
            const direction = key === 'arrowleft' || key === 'a' ? -1
                : key === 'arrowright' || key === 'd' ? 1 : 0;
            if (!direction || cctvCameras.length < 2) return;
            event.preventDefault();
            setSelectedCctv(current => {
                if (!current) return current;
                const index = cctvCameras.findIndex(camera => camera.id === current.id);
                if (index < 0) return current;
                return cctvCameras[(index + direction + cctvCameras.length) % cctvCameras.length];
            });
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, setSelectedCctv, cctvCameras]);

    if (!selectedCctv) return null;

    const getAiStreamUrl = (camera) => {
        if (camera && camera.stream_url) return camera.stream_url;
        return `/api/security/cctv/stream/${camera ? camera.id : ''}`;
    };

    return createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(2, 6, 23, 0.95)', backdropFilter: 'blur(8px)', zIndex: 999999, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 20px', background: '#020617', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%', display: 'inline-block' }} className="animate-pulse"></span>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#ffffff', letterSpacing: '0.05em' }}>{selectedCctv.camera_name.toUpperCase()}</span>
                </div>
                <button
                    onClick={() => setSelectedCctv(null)}
                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                    &times;
                </button>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', background: '#000' }}>
                <SharedCctvStream
                    key={selectedCctv.id}
                    src={getAiStreamUrl(selectedCctv)}
                    alt={selectedCctv.camera_name}
                    fit="contain"
                    style={{ width: '100%', height: '100%' }}
                />
            </div>
        </div>,
        document.body
    );
}

export default CctvModal;
