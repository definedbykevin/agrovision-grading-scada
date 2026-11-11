import React from 'react';
import fanSvg from '../assets/item/fan.svg';
import valveSvg from '../assets/item/valve_positioner.svg';
import waterGif from '../assets/water.gif';
import waterLevelImageUrl from '../assets/waterlevelcontrol.png';
import PIDCardV7 from './PIDCardV7';
import { BoilerMachineCard } from './BoilerSharedComponents';

/**
 * WATER LEVEL STATION FULL PAGE (Image 2 Style - Refined)
 */
function WaterLevelStation({ controlState, setControlState, toggleMode }) {
  const handleValueChange = (loop, field, val) => {
    setControlState(prev => ({
      ...prev,
      [loop]: { ...prev[loop], [field]: parseFloat(val) }
    }));
  };

  return (
    <div className="station-split-layout">
      {/* LEFT: Schematic Area (Image 2 Drum) */}
      <div className="station-schematic-side" style={{ flex: 1.8 }}>
        <div className="wl-canvas-wrap" style={{ width: '100%', height: '100%' }}>
          <img src={waterLevelImageUrl} alt="Schematic" className="wl-main-bg" style={{ opacity: 0.8 }} />

          {/* DYNAMIC WATER DRUM ANIMATION */}
          <div style={{ position: 'absolute', top: '10.2%', left: '18.3%', width: '33%', height: '25%', pointerEvents: 'none', overflow: 'hidden', borderRadius: '60px', opacity: 0.48, mixBlendMode: 'screen' }}>
            <img src={waterGif} style={{ width: '100%', height: '100%', objectFit: 'fill' }} />
          </div>

          {/* Monitoring Cards (Overview Style) */}
          <div className="wl-compact-monitoring" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
            <div style={{ position: 'absolute', top: '3%', left: '45%', pointerEvents: 'none' }}>
              <BoilerMachineCard title="STEAM TEMP" params={[{ value: '5.00', unit: '°C' }]} />
            </div>
            <div style={{ position: 'absolute', top: '-2%', left: '60%', pointerEvents: 'none' }}>
              <BoilerMachineCard title="STEAM P." params={[{ value: '20', unit: 'Bar' }]} />
            </div>
            <div style={{ position: 'absolute', top: '2%', right: '8%', pointerEvents: 'none' }}>
              <BoilerMachineCard title="STEAM FLOW" params={[{ value: '19', unit: 'T/H' }]} />
            </div>
            <div style={{ position: 'absolute', top: '39%', left: '17%', pointerEvents: 'none' }}>
              <BoilerMachineCard title="WATER FLOW" params={[{ value: '30', unit: 'T/H' }]} />
            </div>
            <div style={{ position: 'absolute', top: '54%', left: '38%', pointerEvents: 'none' }}>
              <BoilerMachineCard title="CONTROL V." params={[{ value: controlState.level.mv.toString(), unit: '%' }]} />
            </div>

            <div style={{ position: 'absolute', top: '2%', left: '20%', pointerEvents: 'none' }}>
              <BoilerMachineCard title="WATER LEVEL" params={[{ value: controlState.level.pv.toFixed(2), unit: '%' }]} />
            </div>
          </div>

          {/* DYNAMIC VALVE CONTROL SVG */}
          <div style={{ position: 'absolute', top: '36.5%', left: '38%', pointerEvents: 'none' }}>
            <img
              src={valveSvg}
              alt="Control Valve"
              style={{
                width: '110px',
                height: 'auto',
                transform: 'rotate(-90deg)',
                transformOrigin: 'center center',
                filter: controlState.level.mv > 0
                  ? 'drop-shadow(0 0 10px rgba(245, 158, 11, 0.8)) sepia(1) hue-rotate(10deg) saturate(10) brightness(1.2)'
                  : 'grayscale(1) brightness(0.6)',
                transition: 'all 0.3s ease'
              }}
            />
          </div>

          {/* SEPARATED PUMPS (RESIZED - Bypassing CSS limits) */}
          <div style={{ position: 'absolute', bottom: '7.4%', left: '8.4%', pointerEvents: 'none' }}>
            <div className="m-v7-visual spinning" style={{ width: '40px', height: '40px', borderRadius: '50%' }}><img src={fanSvg} style={{ width: '70px', height: '70px' }} /></div>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: '0.7rem', display: 'block', textAlign: 'center', marginTop: '6px' }}>FWP 1</span>
          </div>

          <div style={{ position: 'absolute', bottom: '8.3%', left: '38.3%', pointerEvents: 'none' }}>
            <div className="m-v7-visual" style={{ width: '40px', height: '40px', borderRadius: '50%' }}><img src={fanSvg} style={{ width: '70px', height: '70px', filter: 'grayscale(1)' }} /></div>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: '0.7rem', display: 'block', textAlign: 'center', marginTop: '6px' }}>FWP 2</span>
          </div>

          <div className="wl-mute-indicator" style={{ bottom: '12%', left: '68%' }}>
            <span className="mute-label">MUTE</span>
            <div className="mute-lamp"></div>
          </div>
        </div>
      </div>

      {/* RIGHT: Control Pane (Constrained Width for Minimalism) */}
      <div className="station-control-side" style={{ maxWidth: '360px', width: '100%', marginLeft: 'auto' }}>
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '0.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '0.8rem', color: '#f59e0b', letterSpacing: '0.1em', fontWeight: 900 }}>FEED WATER CONTROL</h2>
        </div>
        <PIDCardV7
          title="LEVEL CONTROL" data={controlState.level} mode={controlState.mode}
          onToggle={toggleMode} onValueChange={(f, v) => handleValueChange('level', f, v)}
        />
        <PIDCardV7
          title="FLOW CONTROL" data={controlState.flow} mode={controlState.mode}
          onToggle={toggleMode} onValueChange={(f, v) => handleValueChange('flow', f, v)}
        />
      </div>
    </div>
  );
}

export default WaterLevelStation;
