import React, { useState } from 'react'
import './LogsheetPage.css'

const LOGSHEET_CONFIG = {
    'Threshing Station': {
        sections: [
            {
                title: 'Machine Status & Load',
                params: [
                    { label: 'Thresher Drum V-201', value: 'RUNNING', unit: '' },
                    { label: 'Drum Load (Amps)', value: '42.5', unit: 'A' },
                    { label: 'Drum Speed', value: '22.0', unit: 'RPM' },
                    { label: 'Indicated Vibration', value: 'NORMAL', unit: '' },
                ]
            },
            {
                title: 'Material Flow',
                params: [
                    { label: 'Inlet FFB Feed Rate', value: '30.0', unit: 'TPH' },
                    { label: 'Empty Fruit Bunch (EFB)', value: '6.4', unit: 'TPH' },
                    { label: 'Bottom Cross Conveyor', value: 'ACTIVE', unit: '' },
                    { label: 'Thresher Loss Est.', value: '0.45', unit: '%' },
                ]
            },
            {
                title: 'Power & Energy',
                params: [
                    { label: 'Total Station Power', value: '112.5', unit: 'kW' },
                    { label: 'Energy today', value: '840', unit: 'kWh' },
                    { label: 'Power Factor', value: '0.88', unit: 'φ' },
                    { label: 'Uptime (Shift)', value: '6.2', unit: 'Hrs' },
                ]
            },
            {
                title: 'Current Health & Condition',
                params: [
                    { label: 'Mechanical Integrity', value: 'HEALTHY', unit: '' },
                    { label: 'Vibration Analysis', value: '0.45', unit: 'mm/s' },
                    { label: 'Bearing Temp Avg', value: '42.0', unit: '°C' },
                    { label: 'Lubrication System', value: 'OPTIMAL', unit: '' },
                ]
            }
        ]
    },
    'Press Station': {
        sections: [
            {
                title: 'Press Performance',
                params: [
                    { label: 'Screw Press #1 Load', value: '38.2', unit: 'A' },
                    { label: 'Screw Press #2 Load', value: '36.5', unit: 'A' },
                    { label: 'Hydraulic Pressure', value: '55.0', unit: 'Bar' },
                    { label: 'Cake Thickness', value: '12.0', unit: 'mm' },
                ]
            },
            {
                title: 'Dilution System',
                params: [
                    { label: 'Dilution Water Temp', value: '92.4', unit: '°C' },
                    { label: 'Water Flow Rate', value: '4.2', unit: 'm3/h' },
                    { label: 'Oil Loss in Fiber', value: '5.2', unit: '%' },
                    { label: 'Crude Oil Output', value: '12.5', unit: 'TPH' },
                ]
            },
            {
                title: 'Digester Data',
                params: [
                    { label: 'Digester Level', value: '85.4', unit: '%' },
                    { label: 'Digester Temp', value: '94.0', unit: '°C' },
                    { label: 'Steam Pressure', value: '3.2', unit: 'Bar' },
                    { label: 'Retention Time', value: '45', unit: 'Min' },
                ]
            },
            {
                title: 'Maintenance Log',
                params: [
                    { label: 'Last Oil Change', value: '15-Feb-2026', unit: '' },
                    { label: 'Screw Wear Index', value: '0.24', unit: 'mm/1000h' },
                    { label: 'Next Scheduled SVC', value: '12500', unit: 'Hrs' },
                    { label: 'Shift Operator', value: 'Agus P.', unit: '' },
                ]
            }
        ]
    },
    'Kernel Plant': {
        sections: [
            {
                title: 'Cracking & Separation',
                params: [
                    { label: 'Nut Cracker RPM', value: '1450', unit: 'RPM' },
                    { label: 'Cracking Efficiency', value: '98.5', unit: '%' },
                    { label: 'Claybath Density', value: '1.14', unit: 'g/cm3' },
                    { label: 'Kernel Loss in Shell', value: '1.2', unit: '%' },
                ]
            },
            {
                title: 'Blower & Extraction',
                params: [
                    { label: 'Blower Pressure', value: '450', unit: 'Pa' },
                    { label: 'Suction Fan Status', value: 'ACTIVE', unit: '' },
                    { label: 'Dryer Unit Temp', value: '78.5', unit: '°C' },
                    { label: 'Air Flow Rate', value: '1250', unit: 'm3/m' },
                ]
            },
            {
                title: 'Silo Management',
                params: [
                    { label: 'Kernel Silo Level', value: '62.0', unit: '%' },
                    { label: 'Silo Top Temp', value: '42.5', unit: '°C' },
                    { label: 'Aeration Fan #1', value: 'RUNNING', unit: '' },
                    { label: 'Humidity Sensor', value: '12.4', unit: '%' },
                ]
            },
            {
                title: 'Quality Control',
                params: [
                    { label: 'Dirt Content', value: '5.4', unit: '%' },
                    { label: 'Moisture Content', value: '6.8', unit: '%' },
                    { label: 'Broken Kernel', value: '8.4', unit: '%' },
                    { label: 'Sampler Status', value: 'AUTO', unit: '' },
                ]
            }
        ]
    }
}

const LogsheetPage = ({ station }) => {
    const [period, setPeriod] = useState('Day')
    const config = LOGSHEET_CONFIG[station] || LOGSHEET_CONFIG['Threshing Station']

    return (
        <div className="logsheet-container">
            {/* Header */}
            <div className="scada-log-header">
                <div className="scada-log-title">
                    <h1>SLS - STATION LOGSHEET SUMMARY</h1>
                </div>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <div className="scada-filter-group">
                        <button
                            className={`filter-btn ${period === 'Day' ? 'active' : ''}`}
                            onClick={() => setPeriod('Day')}
                        >
                            Day
                        </button>
                        <button
                            className={`filter-btn ${period === 'Week' ? 'active' : ''}`}
                            onClick={() => setPeriod('Week')}
                        >
                            Week
                        </button>
                        <button
                            className={`filter-btn ${period === 'Month' ? 'active' : ''}`}
                            onClick={() => setPeriod('Month')}
                        >
                            Month
                        </button>
                    </div>
                    <button className="scada-btn-primary">SUBMIT_SHIFT_LOG</button>
                </div>
            </div>

            {/* Shift & Time Strip */}
            <div className="scada-shift-strip">
                <div className="shift-node">
                    <label>CURRENT_PERIOD</label>
                    <span className="val">{period.toUpperCase()}_VIEW</span>
                </div>
                <div className="shift-node">
                    <label>STATION_ID</label>
                    <span className="val" style={{ color: '#10b981' }}>{station.toUpperCase()}</span>
                </div>
                <div className="shift-node">
                    <label>LOG_DATE</label>
                    <span className="val">{new Date().toLocaleDateString()}</span>
                </div>
                <div className="shift-node" style={{ marginLeft: 'auto', textAlign: 'right' }}>
                    <label>LAST_PLC_SYNC</label>
                    <span className="val" style={{ fontSize: '0.75rem' }}>2026-02-25 15:04:12</span>
                </div>
            </div>

            {/* Main Data Grid */}
            <div className="logsheet-data-area">
                {config.sections.map((section, idx) => (
                    <div className="log-section-box" key={idx}>
                        <div className="log-section-title">{section.title}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {section.params.map((p, pIdx) => (
                                <div className="log-param-row" key={pIdx}>
                                    <span className="log-param-label">{p.label}</span>
                                    <span className="log-param-val" style={{ color: '#000000' }}>
                                        {p.value} {p.unit}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {/* Remarks Section */}
                <div className="scada-remarks-box">
                    <div className="log-section-title">Operational Remarks / Condition Summary</div>
                    <p style={{ fontSize: '0.75rem', color: '#475569', margin: '4px 0' }}>
                        - {period}ly summary: High efficiency observed across all mechanical units.<br />
                        - Vibration levels for primary components within technical specifications.<br />
                        - Production stability maintained at 94.2% for the selected period.
                    </p>
                    <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #1e293b', paddingTop: '8px' }}>
                        <span style={{ fontSize: '0.6rem', color: '#64748b' }}>LOG_VERSION: SCADA_V4.2</span>
                        <span style={{ fontSize: '0.6rem', color: '#64748b' }}>AGROVISION // INDUSTRIAL AI SCADA</span>
                    </div>
                </div>
            </div>

            {/* Footer Meta */}
            <div style={{
                padding: '6px 24px',
                background: '#f1f5f9',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.65rem',
                color: '#64748b'
            }}>
                <span>SYSTEM_ORIGIN: AGROVISION_CORE</span>
                <span>STATION_LOG_TYPE: {station.toUpperCase()}</span>
            </div>
        </div>
    )
}

export default LogsheetPage
