import { useState, useRef, useEffect } from 'react'
import './EffluentPage.css'
import effluentImage from './assets/effluent_treatment_plant.webp'

/**
 * Reusable Components for Effluent SCADA
 */
const EffLabelSVG = ({ x, y, label, fontSize = "16px", hasOutline = true }) => {
    const lines = String(label).split('\n')
    return (
        <text
            x={x} y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="som-eff-label-svg"
            style={{ fontSize: fontSize, stroke: hasOutline ? '#FFFFFF' : 'none' }}
        >
            {lines.map((line, i) => (
                <tspan key={i} x={x} dy={i === 0 ? 0 : '1.1em'}>{line}</tspan>
            ))}
        </text>
    )
}

const EffCardSVG = ({ x, y, label, values = [], accentColor = "#ffdb3b" }) => (
    <foreignObject x={x - 110} y={y - 80} width="220" height="240" style={{ overflow: 'visible' }}>
        <div className="som-eff-card-mini" style={{ borderLeft: `4px solid ${accentColor}` }}>
            <div className="som-eff-card-header">
                <span className="som-eff-card-title">{label}</span>
            </div>
            <div className="som-eff-card-body">
                {values.map((v, i) => (
                    <div key={i} className="som-eff-card-row">
                        <span className="som-eff-card-label">{v.label}</span>
                        <span className="som-eff-card-value" data-unit={v.unit}>{v.value}</span>
                    </div>
                ))}
            </div>
        </div>
    </foreignObject>
)

function EffluentPage() {
    const [coords, setCoords] = useState({ x: 0, y: 0 })
    const svgRef = useRef(null)

    const handleMouseMove = (e) => {
        if (!svgRef.current) return
        const svg = svgRef.current
        const pt = svg.createSVGPoint()
        pt.x = e.clientX; pt.y = e.clientY
        const svgP = pt.matrixTransform(svg.getScreenCTM().inverse())
        setCoords({ x: Math.round(svgP.x), y: Math.round(svgP.y) })
    }

    return (
        <div className="som-effluent-page">
            <header className="som-eff-header">
                <div className="som-header-left">
                    <h1 className="som-eff-title">EFFLUENT TREATMENT PLANT (POME)</h1>
                </div>
                <div className="som-header-right">
                    <div className="eff-top-stat">
                        <span className="label">ANAEROBIC PERFORMANCE</span>
                        <span className="value">100 <small>%</small></span>
                    </div>
                    <div className="eff-top-stat">
                        <span className="label">AEROBIC PERFORMANCE</span>
                        <span className="value">100 <small>%</small></span>
                    </div>
                </div>
            </header>

            <main className="som-eff-content-main">
                <div className="som-eff-scada-container">
                    <img src={effluentImage} alt="Effluent Treatment Plant" className="som-eff-full-image" />

                    <svg ref={svgRef} viewBox="0 0 1920 1080" className="som-eff-svg-layer" preserveAspectRatio="xMidYMid meet" onMouseMove={handleMouseMove}>

                        {/* Top Row - Quality Cards */}
                        <EffCardSVG x={-100} y={200} label="Influent Quality" accentColor="#ef4444" values={[
                            { label: 'pH', value: '4.3', unit: '' },
                            { label: 'Temperature', value: '80', unit: '°C' },
                            { label: 'COD', value: '60,000', unit: 'mg/L' },
                            { label: 'TSS', value: '25,000', unit: 'mg/L' }
                        ]} />

                        <EffCardSVG x={260} y={400} label="Acidification Pond" values={[
                            { label: 'pH', value: '4.8', unit: '' },
                            { label: 'Temperature', value: '60', unit: '°C' }
                        ]} />

                        <EffCardSVG x={600} y={400} label="Anaerobic Pond 1" values={[
                            { label: 'MLSS', value: '6,500', unit: 'mg/L' },
                            { label: 'pH', value: '6.5', unit: '' },
                            { label: 'Temp', value: '35', unit: '°C' }
                        ]} />

                        <EffCardSVG x={930} y={400} label="Anaerobic Pond 2" values={[
                            { label: 'MLSS', value: '5,500', unit: 'mg/L' },
                            { label: 'pH', value: '7.0', unit: '' },
                            { label: 'Temp', value: '33', unit: '°C' }
                        ]} />

                        {/* Bottom Row - Quality Cards */}
                        <EffCardSVG x={1260} y={400} label="Anaerobic Pond 3" values={[
                            { label: 'MLSS', value: '500', unit: 'mg/L' },
                            { label: 'pH', value: '7.5', unit: '' }
                        ]} />

                        <EffCardSVG x={930} y={1080} label="Aerobic Pond 2" accentColor="#f59e0b" values={[{ label: 'DO', value: '5.8', unit: 'mg/L' }]} />
                        <EffCardSVG x={1260} y={1080} label="Aerobic Pond 1" accentColor="#f59e0b" values={[{ label: 'DO', value: '5.5', unit: 'mg/L' }]} />

                        <EffCardSVG x={-100} y={700} label="Final Discharge" accentColor="#f59e0b" values={[
                            { label: 'pH', value: '8.5', unit: '' },
                            { label: 'O&G', value: '5.5', unit: 'mg/L' },
                            { label: 'COD', value: '250', unit: 'mg/L' }
                        ]} />

                        {/* Labels Verification Grid */}
                        <EffLabelSVG x={1600} y={480} label="Facultative Pond 1" fontSize="14px" />
                        <EffLabelSVG x={1930} y={480} label="Facultative Pond 2" fontSize="14px" />
                        <EffLabelSVG x={1930} y={1000} label="Facultative Pond 3" fontSize="14px" />
                        <EffLabelSVG x={1600} y={1000} label="Facultative Pond 4" fontSize="14px" />
                        <EffLabelSVG x={260} y={1000} label={"Maturity\nPond"} fontSize="14px" />
                        <EffLabelSVG x={600} y={1000} label={"Clarification\nPond"} fontSize="14px" />

                    </svg>
                </div>
            </main>
        </div>
    )
}

export default EffluentPage
