function PressOverviewCard({ pressStationData }) {
  const getStatusColor = (load) => {
    if (load === 0) return 'som-press-status-dot--idle'
    if (load < 50) return 'som-press-status-dot--low'
    if (load < 80) return 'som-press-status-dot--normal'
    return 'som-press-status-dot--high'
  }

  return (
    <div className="som-press-settings-control-card som-press-settings-press-overview-card">
      <div className="som-press-settings-control-card-header">
        <h4 className="som-press-settings-control-card-title">PRESS</h4>
      </div>
      <div className="som-press-settings-control-card-body">
        {/* Press Station Overall */}
        <div className="som-press-settings-press-overall">
          <span className="som-press-settings-label">PRESS STATION OVERALL</span>
          <div className="som-press-settings-value-box">
            <span className="som-press-settings-value">{pressStationData.totalLoad.toFixed(1)}</span>
            <span className="som-press-settings-unit">%</span>
          </div>
        </div>

        {/* Divider */}
        <div className="som-press-settings-press-divider"></div>

        {/* Press Cards Grid */}
        <div className="som-press-settings-press-cards">
          {pressStationData.pressData.map((press) => (
            <div key={press.press} className="som-press-settings-press-card">
              <div className="som-press-settings-press-card-header">
                <div className="som-press-settings-press-card-title-wrapper">
                  <span className={`som-press-status-dot ${getStatusColor(press.load)}`}></span>
                  <h5>Press No.{press.press}</h5>
                </div>
              </div>
              <div className="som-press-settings-press-card-body">
                <div className="som-press-settings-press-param">
                  <span className="som-press-settings-param-label">Low SP</span>
                  <span className="som-press-settings-param-value">{press.lowSP.toFixed(1)} A</span>
                </div>
                <div className="som-press-settings-press-param">
                  <span className="som-press-settings-param-label">PV</span>
                  <span className="som-press-settings-param-value som-press-settings-param-value--pv">{press.pv.toFixed(1)} A</span>
                </div>
                <div className="som-press-settings-press-param">
                  <span className="som-press-settings-param-label">High SP</span>
                  <span className="som-press-settings-param-value">{press.highSP.toFixed(1)} A</span>
                </div>
                <div className="som-press-settings-press-param">
                  <span className="som-press-settings-param-label">Load</span>
                  <span className="som-press-settings-param-value som-press-settings-param-value--load">{press.load.toFixed(1)} %</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* LL & OL Alarm Settings Card */}
        <div className="som-press-settings-press-card som-press-settings-alarm-card" style={{ marginTop: '0', marginBottom: '8px' }}>
          <div className="som-press-settings-press-card-header">
            <div className="som-press-settings-press-card-title-wrapper">
              <span className="som-press-status-dot som-press-status-dot--normal"></span>
              <h5>LL & OL ALARM SETTINGS</h5>
            </div>
          </div>
          <div className="som-press-settings-press-card-body" style={{ flexDirection: 'row', justifyContent: 'space-around', gap: '12px' }}>
            <div className="som-press-settings-press-param" style={{ flex: 1, backgroundColor: 'var(--scada-bg)', padding: '6px 10px', borderRadius: '4px' }}>
              <span className="som-press-settings-param-label">LL ALARM</span>
              <span className="som-press-settings-param-value">20.0 A</span>
            </div>
            <div className="som-press-settings-press-param" style={{ flex: 1, backgroundColor: 'var(--scada-bg)', padding: '6px 10px', borderRadius: '4px' }}>
              <span className="som-press-settings-param-label">OL ALARM</span>
              <span className="som-press-settings-param-value">75.0 A</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default PressOverviewCard
