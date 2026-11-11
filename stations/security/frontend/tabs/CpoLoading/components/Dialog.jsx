import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';

export default function Dialog({ title, eyebrow, children, onClose, wide = false, className = '' }) {
    const ref = useRef(null), titleId = useId();
    useEffect(() => {
        const dialog = ref.current, previousFocus = document.activeElement;
        dialog.showModal();
        return () => {
            if (dialog.open) dialog.close();
            if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
        };
    }, []);
    return createPortal(<dialog ref={ref} className={`cpo-dialog ${wide ? 'cpo-dialog--wide' : ''} ${className}`} aria-labelledby={titleId}
        onCancel={event => { event.preventDefault(); onClose(); }}
        onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
        <div className="cpo-dialog-inner">
            <header className="cpo-dialog-heading"><div><span className="cpo-eyebrow">{eyebrow}</span><h2 id={titleId}>{title}</h2></div><button type="button" className="cpo-icon-button" aria-label="Tutup dialog" onClick={onClose}><FiX /></button></header>
            {children}
        </div>
    </dialog>, document.body);
}
