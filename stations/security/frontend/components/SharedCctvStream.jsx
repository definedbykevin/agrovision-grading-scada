import { useEffect, useRef, useState } from 'react';
import { subscribeCctv } from './cctvTransport.js';

export default function SharedCctvStream({ src, alt, style, fit = 'cover', onStatus }) {
    const canvasRef = useRef(null);
    const callbackRef = useRef(onStatus);
    callbackRef.current = onStatus;
    const [state, setState] = useState({ status: 'connecting', message: 'Menghubungkan kamera…' });
    useEffect(() => subscribeCctv(src, canvasRef.current, (status, message) => {
        setState(previous => previous.status === status ? previous : { status, message });
        callbackRef.current?.(status);
    }), [src, fit]);
    return <>
        <canvas ref={canvasRef} role="img" aria-label={alt} data-fit={fit}
            style={{ ...style, visibility: state.status === 'live' ? 'visible' : 'hidden' }} />
        {state.status !== 'live' && <span role="status" style={{ color: '#64748b', fontSize: 12,
            position: 'relative', textAlign: 'center', padding: 12 }}>{state.message}</span>}
    </>;
}
