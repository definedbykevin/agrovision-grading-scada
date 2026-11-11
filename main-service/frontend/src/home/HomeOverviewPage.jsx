import React from 'react';
import homeDashboardUrl from './assets/home-dashboard.jpeg';
import './HomeOverviewPage.css';

const getMappedStationTitle = (cardTitle) => {
  if (["Anaerobic Pond", "Aerobic Pond", "Effluent Final Discharge"].includes(cardTitle)) {
    return "Effluent Treatment";
  }
  return cardTitle;
};

const HomeOverviewPage = ({ user, onNavigate, stations }) => {
  const isCardLocked = (cardTitle) => {
    const mappedTitle = getMappedStationTitle(cardTitle);
    if (stations && stations.length > 0) {
      const station = stations.find((s) => s.title === mappedTitle);
      if (station) {
        return !station.is_active;
      }
    }
    return false;
  };

  return (
    <div className="som-home-overview">
      <main className="som-home-main">
        <div className="som-home-layout">
          <div className="som-home-flow-card">
            <div className="som-home-flow-body">
              <svg viewBox="0 0 1600 700" className="som-home-svg-canvas" preserveAspectRatio="xMidYMid meet">
                <foreignObject x="0" y="0" width="1600" height="723">
                  <div className="som-home-ultra-fit-shell">
                    {/* Background Image */}
                    <div className="som-home-background-wrapper">
                      <img src={`${homeDashboardUrl}?v=${Date.now()}`} alt="Factory Overview" className="som-home-bg-image" />
                      <div className="som-home-overlay"></div>
                    </div>

                    {/* Title Badge */}
                    <div className="som-home-title-badge">
                      <div className="som-home-title-dot"></div>
                      <div>
                        <div className="som-home-title-main">Current Mill Performance Score <span className="som-home-title-score">99%</span></div>
                        <div className="som-home-title-sub">Throughput <span className="som-home-title-highlight">45.0 mt/hr</span></div>
                      </div>
                    </div>

                    {/* All Station Cards */}
                    <div className="som-home-content-overlay">

                      {/* ── TOP-LEFT: Oil Losses Report ── */}
                      <StationCard
                        title="Oil Losses Report"
                        style={{ top: '12%', left: '1%' }}
                        params={[
                          { label: 'USB count', value: '0.65%' },
                          { label: 'PSB count', value: '1.25%' },
                          { label: 'EFB', value: 'Wet' },
                          { label: 'Unprocessed EFB', value: '50%' },
                          { label: 'Press Floor', value: 'Wet' },
                          { label: 'Station', value: 'Oily' },
                        ]}
                        onView={() => onNavigate('Oil Losses Report')}
                        isLocked={isCardLocked('Oil Losses Report')}
                      />

                      <StationCard
                        title="Oil Losses Report"
                        style={{ top: '12%', left: '9.3%' }}
                        params={[
                          { label: 'KL in Fibre', value: '0.9%' },
                          { label: 'KL in TDS 1', value: '0.5%' },
                          { label: 'KL in TDS 2', value: '0.8%' },
                          { label: 'KL in Wet Shell', value: '0.6%' },
                          { label: 'TOL', value: '0.30%' },
                        ]}
                        onView={() => onNavigate('Oil Losses Report')}
                        isLocked={isCardLocked('Oil Losses Report')}
                      />

                      {/* ── Boiler House ── */}
                      <StationCard
                        title="Boiler House"
                        style={{ top: '32%', left: '19.55%' }}
                        params={[
                          { label: 'Steam Pressure', value: '23 bar' },
                          { label: 'Water Level', value: '50%' },
                          { label: 'TDS', value: '1,200 mg/L' },
                          { label: 'Station Score', value: '100%' },
                          { label: 'Capacity', value: '18% (60/30)' },
                        ]}
                        onView={() => onNavigate('Boiler House')}
                        isLocked={isCardLocked('Boiler House')}
                      />

                      {/* ── Press Station ── */}
                      <StationCard
                        title="Press Station"
                        style={{ top: '33%', left: '28%' }}
                        params={[
                          { label: 'Throughput', value: '45.00 mt/hr' },
                          { label: 'Station Score', value: '00%' },
                        ]}
                        onView={() => onNavigate('Press Station')}
                        isLocked={isCardLocked('Press Station')}
                      />

                      {/* ── Threshing Station ── */}
                      <StationCard
                        title="Threshing Station"
                        style={{ top: '33%', left: '37%' }}
                        params={[
                          { label: 'Throughput', value: '45.00 mt/hr' },
                          { label: 'Station Score', value: '00%' },
                        ]}
                        onView={() => onNavigate('Threshing Station')}
                        isLocked={isCardLocked('Threshing Station')}
                      />

                      {/* ── EFB Plant ── */}
                      <StationCard
                        title="EFB Plant"
                        style={{ top: '33%', left: '46%' }}
                        params={[
                          { label: 'FFB Processed', value: '100%' },
                          { label: 'Station Score', value: '100%' },
                        ]}
                        onView={() => onNavigate('EFB Plant')}
                        isLocked={isCardLocked('EFB Plant')}
                      />

                      {/* ── Mini Mill ── */}
                      <StationCard
                        title="Mini Mill"
                        style={{ top: '51%', left: '11%' }}
                        params={[
                          { label: 'LF Received', value: '200 mt' },
                          { label: 'LF Processed', value: '100.0 mt' },
                          { label: 'LF balance', value: '100 mt' },
                          { label: 'Nut Produced', value: '28.0 mt' },
                          { label: 'CPO Produced', value: '22.0 mt' },
                          { label: 'OER', value: '20.0%' },
                          { label: 'Station Score', value: '100%' },
                        ]}
                        onView={() => onNavigate('Mini Mill')}
                        isLocked={isCardLocked('Mini Mill')}
                      />

                      {/* ── Engine Room ── */}
                      <StationCard
                        title="Engine Room"
                        style={{ top: '50%', left: '25%' }}
                        params={[
                          { label: 'Power Consumption', value: '1,000 kW' },
                          { label: 'Steam Consumption', value: '25 mt/hr' },
                          { label: 'Frequency', value: '50.12 Hz' },
                          { label: 'Station Score', value: '100% 100%' },
                        ]}
                        onView={() => onNavigate('Engine Room')}
                        isLocked={isCardLocked('Engine Room')}
                      />

                      {/* ── Kernel Plant ── */}
                      <StationCard
                        title="Kernel Plant"
                        style={{ top: '50%', left: '35.3%' }}
                        params={[
                          { label: 'Throughput', value: '45.00 mt/hr' },
                          { label: 'Station Score', value: '00%' },
                        ]}
                        onView={() => onNavigate('Kernel Plant')}
                        isLocked={isCardLocked('Kernel Plant')}
                      />

                      {/* ── Oil Clarification Room ── */}
                      <StationCard
                        title="Oil Clarification Room"
                        style={{ top: '50%', left: '44.3%' }}
                        params={[
                          { label: 'Throughput', value: '45.00 mt/hr' },
                          { label: 'Station Score', value: '00%' },
                        ]}
                        onView={() => onNavigate('Oil Clarification Room')}
                        isLocked={isCardLocked('Oil Clarification Room')}
                      />

                      {/* ── Sterilizer Station ── */}
                      <StationCard
                        title="Sterilizer Station"
                        style={{ top: '50%', left: '54%' }}
                        params={[
                          { label: 'Throughput', value: '45.00 mt/hr' },
                          { label: 'Station Score', value: '00%' },
                        ]}
                        onView={() => onNavigate('Sterilizer Station')}
                        isLocked={isCardLocked('Sterilizer Station')}
                      />

                      {/* ── CPO Storage ── */}
                      <StationCard
                        title="CPO Storage"
                        accent="gold"
                        style={{ top: '68%', left: '32%' }}
                        params={[
                          { label: 'Tank 1', value: '1,000 mt' },
                          { label: 'Tank 2', value: '500 mt.' },
                          { label: 'Tank 3', value: '1' },
                        ]}
                        onView={() => onNavigate('CPO Storage')}
                        isLocked={isCardLocked('CPO Storage')}
                      />

                      {/* ── Weighbridge ── */}
                      <StationCard
                        title="Weighbridge"
                        style={{ top: '77%', left: '5%' }}
                        params={[
                          { label: 'FFB Received', value: '200.0 mt' },
                          { label: 'FFB Grading', value: '16 trucks' },
                          { label: 'FFB Grading', value: '5 trucks' },
                        ]}
                        onView={() => onNavigate('Weighbridge')}
                        isLocked={isCardLocked('Weighbridge')}
                      />

                      {/* ── Grading Ramp ── */}
                      <StationCard
                        title="Grading Ramp"
                        style={{ top: '78%', left: '48.7%' }}
                        params={[
                          { label: 'FFB Ripeness', value: '70.0%' },
                          { label: 'Dust', value: '70.0%' },
                          { label: 'OGER', value: '16.0%' },
                        ]}
                        onView={() => onNavigate('Grading Ramp')}
                        isLocked={isCardLocked('Grading Ramp')}
                      />

                      {/* ── FFB Balance ── */}
                      <StationCard
                        title="FFB Balance"
                        style={{ top: '78%', left: '57%' }}
                        params={[
                          { label: 'FFB Received', value: '530 mt' },
                          { label: 'FFB Processed', value: '200 mt' },
                          { label: 'FFB Balance', value: '320 mt' },
                        ]}
                        onView={() => onNavigate('FFB Balance')}
                        isLocked={isCardLocked('FFB Balance')}
                      />

                      {/* ── Loading Ramp ── */}
                      <StationCard
                        title="Loading Ramp"
                        style={{ top: '61%', left: '59%' }}
                        params={[
                          { label: 'Throughput', value: '90.00 mt/hr' },
                          { label: 'Station Score', value: '00%' },
                        ]}
                        onView={() => onNavigate('Loading Ramp')}
                        isLocked={isCardLocked('Loading Ramp')}
                      />

                      {/* ── Raw Water Treatment ── */}
                      <StationCard
                        title="Raw Water Treatment"
                        style={{ top: '41%', left: '60.5%' }}
                        params={[
                          { label: 'Throughput', value: '98.00 m3/hr' },
                          { label: 'Turbidity', value: '3.00 NTU' },
                        ]}
                        onView={() => onNavigate('Raw Water Treatment')}
                        isLocked={isCardLocked('Raw Water Treatment')}
                      />

                      {/* ── Water Consumption ── */}
                      <StationCard
                        title="Water Consumption"
                        style={{ top: '41%', left: '69.95%' }}
                        params={[
                          { label: 'Domestic', value: '5%' },
                          { label: 'Process', value: '10%' },
                          { label: 'Boiler', value: '85%' },
                          { label: 'Water Consumption', value: '1m3/mt.FFB' },
                        ]}
                        onView={() => onNavigate('Water Consumption')}
                        isLocked={isCardLocked('Water Consumption')}
                      />

                      {/* ── Anaerobic Pond ── */}
                      <StationCard
                        title="Anaerobic Pond"
                        style={{ top: '16%', left: '67.2%' }}
                        params={[
                          { label: 'pH', value: '7.8' },
                          { label: 'MLSS', value: '6,500 mg/L' },
                          { label: 'Recycling', value: 'ON' },
                          { label: 'Scrimming', value: 'ON' },
                          { label: 'Score', value: '100%' },
                        ]}
                        onView={() => onNavigate('Anaerobic Pond')}
                        isLocked={isCardLocked('Anaerobic Pond')}
                      />

                      {/* ── Aerobic Pond ── */}
                      <StationCard
                        title="Aerobic Pond"
                        style={{ top: '16%', left: '75.5%' }}
                        params={[
                          { label: 'pH', value: '8.5' },
                          { label: 'MLSS', value: '3,500 mg/L' },
                          { label: 'DO', value: '5.5 mg/L' },
                          { label: 'Recycling', value: 'ON' },
                          { label: 'Deludging', value: 'OFF' },
                          { label: 'Station Score', value: '100%' },
                        ]}
                        onView={() => onNavigate('Aerobic Pond')}
                        isLocked={isCardLocked('Aerobic Pond')}
                      />

                      {/* ── Effluent Final Discharge ── */}
                      <StationCard
                        title="Effluent Final Discharge"
                        style={{ top: '16%', left: '83.8%' }}
                        params={[
                          { label: 'pH', value: '8.8' },
                          { label: 'TSS', value: '11.0 mg/L' },
                          { label: 'COD', value: '230.0 mg/L' },
                          { label: 'D&O', value: '6.0 mg/L' },
                        ]}
                        onView={() => onNavigate('Effluent Final Discharge')}
                        isLocked={isCardLocked('Effluent Final Discharge')}
                      />

                    </div>
                  </div>
                </foreignObject>
              </svg>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

function StationCard({ title, params, style, onView, accent, isLocked }) {
  return (
    <div
      className={`hov-card ${accent === 'gold' ? 'hov-card--gold' : ''} ${isLocked ? 'hov-card--locked' : ''}`}
      style={style}
      onClick={isLocked ? undefined : onView}
    >
      <div className="hov-card-header">
        <span className="hov-card-title" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {title}
          {isLocked && (
            <svg
              stroke="currentColor"
              fill="currentColor"
              strokeWidth="0"
              viewBox="0 0 448 512"
              height="10px"
              width="10px"
              xmlns="http://www.w3.org/2000/svg"
              style={{ color: '#d4ac0d' }}
            >
              <path d="M400 224h-24v-72C376 68.4 307.6 0 224 0S72 68.4 72 152v72H48c-26.5 0-48 21.5-48 48v192c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V272c0-26.5-21.5-48-48-48zm-104 0H152v-72c0-39.7 32.3-72 72-72s72 32.3 72 72v72z"></path>
            </svg>
          )}
        </span>
        {!isLocked && <div className="hov-card-pulse"></div>}
      </div>
      <div className="hov-card-body">
        {params.map((p, idx) => (
          <div key={idx} className="hov-card-row">
            <span className="hov-card-label">{p.label}</span>
            <span className="hov-card-dots"></span>
            <span className="hov-card-value">{p.value}</span>
          </div>
        ))}
      </div>
      <div className="hov-card-glow"></div>
    </div>
  );
}

export default HomeOverviewPage;
