import React, { useState } from 'react';
import fanSvg from '../assets/item/fan.svg';

import PIDCardV7 from './PIDCardV7';

/** 
 * FURNACE STATION FULL PAGE (Image 1 Style - Refined)
 */
function FurnaceStation() {
  const fans = [
    { id: "FEEDER 1", status: "RUN" }, { id: "FEEDER 2", status: "RUN" }, { id: "FF FAN", status: "RUN" },
    { id: "SA FAN", status: "RUN" }, { id: "PA FAN", status: "RUN" }, { id: "IDF FAN", status: "RUN" }
  ];

  const [states, setStates] = useState([
    { title: "FUEL CONTROL", mode: "AUTO", pv: 45.2, sp: 50.0, mv: 20 },
    { title: "AIR CONTROL", mode: "AUTO", pv: 12.8, sp: 15.0, mv: 60 },
    { title: "DRAFT CONTROL", mode: "AUTO", pv: -3.1, sp: -5.0, mv: 35 }
  ]);

  const handleToggle = (idx) => {
    const n = [...states];
    n[idx].mode = n[idx].mode === 'AUTO' ? 'MANUAL' : 'AUTO';
    setStates(n);
  };

  const handleValueChange = (idx, field, val) => {
    const n = [...states];
    n[idx][field] = parseFloat(val);
    setStates(n);
  };

  return (
    <div className="station-subpage furnace-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: '1000px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Top: Motor Cluster */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>FAN STATUS & CONTROL</h3>
          <div className="som-motor-grid-v7" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
            {fans.map((f, i) => (
              <div key={i} className="motor-pod-v7">
                <span className="m-v7-header">{f.id}</span>
                <div className={`m-v7-visual ${f.status === 'RUN' ? 'spinning' : ''}`}>
                  <img src={fanSvg} alt="fan" style={{ filter: f.status === 'RUN' ? 'brightness(1.5) drop-shadow(0 0 10px #f59e0b)' : 'grayscale(1)' }} />
                </div>
                <div className="m-v7-actions">
                  <button className="m-v7-btn on">START</button>
                  <button className="m-v7-btn off">STOP</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: PID Cluster */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>STATION PID CONTROLLER</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
            {states.map((s, i) => (
              <PIDCardV7
                key={i}
                title={s.title}
                data={s}
                mode={s.mode}
                onToggle={() => handleToggle(i)}
                onValueChange={(field, val) => handleValueChange(i, field, val)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FurnaceStation;
