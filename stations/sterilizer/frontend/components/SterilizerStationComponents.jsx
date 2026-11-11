import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import valveActuatorSvg from '../assets/item/valve_actuator.svg';
import valvePositionerSvg from '../assets/item/valve_positioner.svg';

/**
 * Reusable Valve SVG Component
 */
export const ValveSVG = ({ x, y, id, type = 'actuator', status, opening, label, onClick, size = 50, labelYOffset, labelXOffset, labelWidth = 60 }) => {
    const isOpen = status.toLowerCase() === 'open' || (opening !== undefined && opening > 0)
    const icon = type === 'positioner' ? valvePositionerSvg : valveActuatorSvg
    const statusClass = isOpen ? 'valve-on' : 'valve-off'

    const offset = size / 2
    const ly = labelYOffset !== undefined ? labelYOffset : offset - 78
    const lx = labelXOffset !== undefined ? labelXOffset : offset - 10

    return (
        <g id={id} className={`svg-equipment valve-group ${statusClass}`} onClick={() => onClick && onClick(id)}>
            <image href={icon} x={x - offset} y={y - offset} width={size} height={size} />
            <foreignObject x={x + lx} y={y + ly} width={labelWidth} height="45">
                <div className="som-sterilizer-mini-card compact" style={{ border: 'none', background: 'transparent', boxShadow: 'none' }}>
                    <span className="som-mini-label" style={{ textAlign: 'center' }}>{label}</span>
                    <span className={`som-mini-value ${isOpen ? 'som-mini-value--open' : 'som-mini-value--closed'}`} style={{ textAlign: 'center' }}>
                        {status.toUpperCase()}
                    </span>
                </div>
            </foreignObject>
        </g>
    )
}

/**
 * Reusable Sensor SVG Component
 */
export const SensorCardSVG = ({ x, y, id, label, value, unit, equipmentName, trendType, onClick }) => {
    return (
        <g id={id} className="svg-equipment sensor-group" onClick={() => onClick && onClick(id)}>
            <foreignObject x={x - 60} y={y - 35} width="120" height="70" style={{ overflow: 'visible' }}>
                <div className="som-dig-card" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', minWidth: '90px', textAlign: 'center' }}>
                    <div className="som-dig-card-header" style={{ fontSize: '10px', padding: '3px 8px' }}>
                        {label || equipmentName}
                    </div>
                    <div className="som-dig-card-body" style={{ padding: '6px 10px', display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: '3px' }}>
                        <span className="som-dig-value" style={{ fontSize: '18px', fontWeight: '900' }}>{value}</span>
                        <span className="som-dig-unit" style={{ fontSize: '11px', fontWeight: '800', opacity: 0.7 }}>{unit}</span>
                    </div>
                </div>
            </foreignObject>
        </g>
    )
}

/**
 * Reusable Door SVG Component
 */
export const DoorCardSVG = ({ x, y, id, label, status, onClick }) => {
    const s = status ? status.toLowerCase() : 'close'
    const isSafe = s === 'close' || s === 'lock'
    const color = isSafe ? '#39FF14' : '#ef4444'

    return (
        <g id={id} className="svg-equipment door-group" onClick={() => onClick && onClick(id)}>
            <foreignObject x={x - 50} y={y - 30} width="100" height="60" style={{ overflow: 'visible' }}>
                <div className="som-dig-card" style={{ display: 'flex', flexDirection: 'column', minWidth: '80px', textAlign: 'center' }}>
                    <div className="som-dig-card-header" style={{ fontSize: '10px', padding: '3px 8px' }}>
                        {label}
                    </div>
                    <div className="som-dig-card-body" style={{ padding: '6px 8px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <span style={{ fontSize: '14px', fontWeight: 'bold', color }}>
                            {status?.toUpperCase() || 'N/A'}
                        </span>
                    </div>
                </div>
            </foreignObject>
        </g>
    )
}

/**
 * Reusable Flow Animation Component
 */
export const SteamFlowSVG = ({ d, active, mode = "flowing", color = "#a9dbe1ff" }) => {
    if (!active) return null;

    let modeClass = "liquid-flow--flowing";
    if (mode === "standby") modeClass = "liquid-flow--standby";
    if (mode === "liquid") modeClass = "liquid-flow--liquid";

    return (
        <g className={modeClass}>
            <path d={d} fill="none" stroke={color} className="liquid-flow-glow" pointerEvents="none" />
            <path d={d} fill="none" stroke={color} className="liquid-flow-aura" pointerEvents="none" />
        </g>
    );
};

/**
 * Title/Label component
 */
export const StationLabelSVG = ({ x, y, label }) => (
    <text x={x} y={y} className="som-line-badge-svg" textAnchor="middle" dominantBaseline="middle" style={{ pointerEvents: 'none', fill: '#fff', fontWeight: '900', fontSize: '24px', textTransform: 'uppercase', textShadow: '0 0 10px rgba(57, 255, 20, 0.5)' }}>
        {label}
    </text>
)

/**
 * Reusable Maintenance SVG Component (HUD Style)
 */
export const MaintenanceCardSVG = ({ x, y, id, label, params = [], onClick }) => {
    return (
        <g id={id} className="svg-equipment maintenance-group" onClick={() => onClick && onClick(id)}>
            <foreignObject x={x - 60} y={y - 45} width="120" height="90" style={{ overflow: 'visible' }}>
                <div className="som-boiler-mini-card maintenance-card" style={{ padding: '6px', minWidth: '100px' }}>
                    <div className="som-boiler-mini-header">
                        <span className="som-boiler-mini-tag">{label}</span>
                    </div>
                    <div className="som-boiler-mini-body">
                        {params.map((p, i) => (
                            <div key={i} className="som-boiler-mini-param">
                                <span className="som-boiler-mini-label">{p.label}</span>
                                <span className="som-boiler-mini-value">{p.value}<span className="som-boiler-mini-unit">{p.unit}</span></span>
                            </div>
                        ))}
                    </div>
                </div>
            </foreignObject>
        </g>
    )
}

/**
 * Summary Table Component
 */
export const SummaryTableSVG = ({ x, y, title, data }) => (
    <foreignObject x={x} y={y} width="300" height="180">
        <div className="som-minimal-card" style={{ padding: '10px' }}>
            <div className="som-minimal-header" style={{ marginBottom: '8px', fontSize: '12px' }}>{title}</div>
            <div className="som-minimal-body">
                {data.map((row, i) => (
                    <div key={i} className="som-minimal-row" style={{ padding: '4px 0' }}>
                        <span className="som-minimal-label" style={{ fontSize: '11px' }}>{row.label}</span>
                        <div>
                            <span className="som-minimal-value" style={{ fontSize: '13px' }}>{row.value}</span>
                            <span className="som-minimal-unit" style={{ fontSize: '10px' }}>{row.unit}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </foreignObject>
)

/**
 * Custom hook for hover effects and sound
 */
export function useAmpHover() {
    const [isHovered, setIsHovered] = useState(false)
    const cardRef = useRef(null)
    const [popupPos, setPopupPos] = useState(null)
    const hoverTimeoutRef = useRef(null)

    const handleMouseEnter = () => {
        setIsHovered(true)
        if (cardRef.current) {
            const rect = cardRef.current.getBoundingClientRect()
            setPopupPos({
                top: rect.top,
                right: rect.right,
                left: rect.left,
                bottom: rect.bottom,
            })
        }
    }

    const handleMouseLeave = () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
        hoverTimeoutRef.current = setTimeout(() => {
            setIsHovered(false)
            setPopupPos(null)
        }, 150)
    }

    const handlePopupMouseEnter = () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
        setIsHovered(true)
    }

    const handlePopupMouseLeave = () => {
        setIsHovered(false)
        setPopupPos(null)
    }

    useEffect(() => {
        return () => {
            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
        }
    }, [])

    return {
        cardRef,
        isHovered,
        popupPos,
        handleMouseEnter,
        handleMouseLeave,
        handlePopupMouseEnter,
        handlePopupMouseLeave,
    }
}

/**
 * Trend Popup component (Portaled)
 */
export function StatusGraphPopup({ position, equipmentName, type = 'Pressure', value = 0, unit = 'Bar', onMouseEnter, onMouseLeave }) {
    const popupRef = useRef(null)
    const [style, setStyle] = useState({ opacity: 0, pointerEvents: 'none' })

    useEffect(() => {
        if (!position || !popupRef.current) return

        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight
        const popupWidth = 450
        const popupHeight = 400
        const padding = 20

        let left = position.right + 15
        let top = position.top - 10

        if (left + popupWidth > viewportWidth - padding) {
            left = position.left - popupWidth - 15
        }
        if (top + popupHeight > viewportHeight - padding) {
            top = viewportHeight - popupHeight - padding
        }
        if (top < padding) top = padding
        if (left < padding) left = padding

        setStyle({
            top: `${top}px`,
            left: `${left}px`,
            opacity: 1,
            pointerEvents: 'auto'
        })
    }, [position])

    const width = 400
    const height = 200
    const plotLeft = 40
    const plotRight = 360
    const plotTop = 20
    const plotBottom = 160

    const points = useMemo(() => {
        return Array.from({ length: 20 }).map((_, i) => {
            const x = plotLeft + ((plotRight - plotLeft) * i) / 19
            const yVal = Math.max(0, value)
            const maxRange = type === 'Pressure' ? 5 : 200
            const t = yVal / maxRange
            const y = plotBottom - t * (plotBottom - plotTop)
            return { x, y }
        })
    }, [value, type])

    const polyPoints = points.map((p) => `${p.x},${p.y}`).join(' ')

    return createPortal(
        <div
            ref={popupRef}
            className="som-amp-popup"
            style={style}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <div className="som-amp-popup-header">
                <div className="som-amp-popup-title">{type} Trend</div>
                <div className="som-amp-popup-subtitle">
                    <span>{equipmentName}</span>
                    <span>Current: {value.toFixed(2)} {unit}</span>
                </div>
            </div>
            <div className="som-amp-popup-body">
                <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="som-amp-graph-svg">
                    <defs>
                        <linearGradient id="trendGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
                        </linearGradient>
                    </defs>
                    <rect x={plotLeft} y={plotTop} width={plotRight - plotLeft} height={plotBottom - plotTop} fill="rgba(255, 255, 255, 0.02)" />
                    <line x1={plotLeft} y1={plotBottom} x2={plotRight} y2={plotBottom} stroke="rgba(255,255,255,0.2)" />
                    <line x1={plotLeft} y1={plotTop} x2={plotLeft} y2={plotBottom} stroke="rgba(255,255,255,0.2)" />
                    <polygon className="som-amp-graph-area" points={`${plotLeft},${plotBottom} ${polyPoints} ${plotRight},${plotBottom}`} style={{ fill: 'url(#trendGradient)' }} />
                    <polyline className="som-amp-graph-line-main" points={polyPoints} fill="none" stroke="#3b82f6" strokeWidth="2" />
                    {points.map((p, idx) => (
                        <circle key={idx} cx={p.x} cy={p.y} r="2.5" fill="#3b82f6" />
                    ))}
                </svg>
            </div>
        </div>,
        document.body
    )
}

export const SettingsCardSVG = ({ x, y, titleAuto, titleManual, dataAuto, dataManual, width = 580 }) => (
    <foreignObject x={x} y={y} width={width} height="500">
        <div className="som-minimal-card">
            <div className="som-minimal-header">{titleAuto}</div>
            <div className="som-minimal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    {dataAuto.map((row, i) => (
                        <div key={i} className="som-minimal-row" style={{ borderBottom: 'none' }}>
                            <span className="som-minimal-label">{row.label}</span>
                            <div>
                                <span className="som-minimal-value" style={{ color: '#ef4444' }}>{row.value}</span>
                                <span className="som-minimal-unit">{row.unit}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="som-minimal-divider" />
                <div className="som-minimal-section-title">{titleManual}</div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    {dataManual.map((row, i) => (
                        <div key={i} className="som-minimal-row" style={{ borderBottom: 'none' }}>
                            <span className="som-minimal-label">{row.label}</span>
                            <div>
                                <span className="som-minimal-value" style={{ color: '#ef4444' }}>{row.value}</span>
                                <span className="som-minimal-unit">{row.unit}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </foreignObject>
)

export const StatusTableCardSVG = ({ x, y, title, data, width = 450 }) => (
    <foreignObject x={x} y={y} width={width} height="650">
        <div className="som-minimal-card">
            <div className="som-minimal-header">{title}</div>
            <div className="som-minimal-body">
                {data.map((row, i) => (
                    <div key={i} className="som-minimal-row">
                        <span className="som-minimal-label">{row.label}</span>
                        <div>
                            <span className="som-minimal-value" style={{ color: row.isHighlight ? '#ef4444' : '#1e293b' }}>
                                {row.value}
                            </span>
                            {row.unit && <span className="som-minimal-unit">{row.unit}</span>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </foreignObject>
)
