import React, { useState } from 'react';
import '../theme/coordinate-picker.css';

/**
 * Reusable panel component for the Coordinate Picker tool.
 */
export const CoordinatePickerPanel = ({ 
    isCoordMode, 
    capturedCoords, 
    pathD, 
    panelSide, 
    setPanelSide, 
    isPanelMinimized, 
    setIsPanelMinimized, 
    setCapturedCoords,
    copyPathToClipboard,
    onClose 
}) => {
    const [copied, setCopied] = useState(false);

    if (!isCoordMode) return null;

    const handleCopy = () => {
        copyPathToClipboard();
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={`som-coord-picker-panel side-${panelSide} ${isPanelMinimized ? 'minimized' : ''}`}>
            <div className="som-coord-header">
                <div className="som-coord-title" onClick={() => setIsPanelMinimized(!isPanelMinimized)} style={{ cursor: 'pointer' }}>
                    <span className="som-coord-pulse"></span>
                    {isPanelMinimized ? 'COORD PICKER' : 'COORDINATE PICKER'}
                </div>
                <div className="som-coord-actions">
                    <button className="som-coord-btn-icon" title="Switch Side" onClick={() => setPanelSide(panelSide === 'left' ? 'right' : 'left')}>
                        ⇔
                    </button>
                    <button className="som-coord-btn-icon" title={isPanelMinimized ? "Expand" : "Minimize"} onClick={() => setIsPanelMinimized(!isPanelMinimized)}>
                        {isPanelMinimized ? '□' : '−'}
                    </button>
                    <button className="som-coord-btn-icon" title="Close" onClick={onClose}>
                        ×
                    </button>
                </div>
            </div>

            {!isPanelMinimized && (
                <div className="som-coord-content">
                    <div className="som-coord-instruction">
                        <strong>L:</strong> Click any point on SVG to capture.<br />
                        <strong>Backspace:</strong> Undo last point.<br />
                        <strong>C:</strong> Clear all points.<br />
                        <strong>P / Esc:</strong> Exit Picker.
                    </div>

                    <div className="som-coord-list">
                        {capturedCoords.map((c, i) => (
                            <div key={i} className="som-coord-item">
                                <span className="som-coord-index">#{i}</span>
                                <span className="som-coord-val">X: {c.x}, Y: {c.y}</span>
                            </div>
                        ))}
                    </div>

                    {capturedCoords.length > 0 && (
                        <div className="som-path-output">
                            <span className="som-path-label">SVG Path Data (d):</span>
                            <span className="som-path-string">{pathD}</span>
                            <button className={`som-copy-btn ${copied ? 'copied' : ''}`} onClick={handleCopy}>
                                {copied ? '✓ COPIED TO CLIPBOARD' : '📋 COPY PATH STRING'}
                            </button>
                        </div>
                    )}
                    
                    {capturedCoords.length === 0 && (
                        <div style={{ textAlign: 'center', color: '#8b949e', fontSize: '13px', marginTop: '10px' }}>
                            Click on SVG to start...
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

/**
 * Visual markers for the captured points on the SVG canvas.
 */
export const CoordinatePickerMarkers = ({ capturedCoords }) => {
    if (!capturedCoords || capturedCoords.length === 0) return null;

    return (
        <g className="som-coord-markers">
            {capturedCoords.map((p, i) => (
                <g key={i}>
                    {/* Pulsing outer ring */}
                    <circle cx={p.x} cy={p.y} r="8" fill="#39FF14" fillOpacity="0.2">
                        <animate attributeName="r" values="8;12;8" dur="1.5s" repeatCount="indefinite" />
                        <animate attributeName="fill-opacity" values="0.2;0;0.2" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                    
                    <circle cx={p.x} cy={p.y} r="4" fill="#39FF14" />
                    <text x={p.x + 8} y={p.y + 15} className="som-coord-label">{i}</text>
                    
                    {/* Connecting lines */}
                    {i > 0 && (
                        <line 
                            x1={capturedCoords[i-1].x} 
                            y1={capturedCoords[i-1].y} 
                            x2={p.x} 
                            y2={p.y} 
                            className="som-coord-guide-line" 
                        />
                    )}
                </g>
            ))}
        </g>
    );
};
