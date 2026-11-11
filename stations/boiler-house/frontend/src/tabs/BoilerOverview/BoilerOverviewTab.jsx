import React from 'react';
import boilerHouseImageUrl from '../../assets/Boiler House AgroVision.webp';
import fireGif from '../../assets/fire.gif';
import waterGif from '../../assets/water.gif';
import smokeGif from '../../assets/smoke.gif';

import {
  ValveImage,
  MotorImage,
  TextLabel,
  DiagOverlay,
  WaterFlowSVG,
  SteamFlowSVG,
  LiquidFlowSVG,
  DefsOverlay,
  FanIconSVG,
  Flows
} from '../../BoilerHousePage.jsx';

import { PickerBanner } from '../../components/CoordinatePicker.jsx';
import { BoilerMachineCard } from '../../components/BoilerSharedComponents';
import valveActuatorSvg from '../../assets/item/valve_actuator.svg';
import { CrosshairOverlay, InteractivePath, CoordinatePanel } from '../../components/CoordinatePicker.jsx';


export default function BoilerOverviewTab({
  isPickerMode,
  isPathMode,
  svgRef,
  isFullscreen,
  handleMouseMove,
  viewMode,
  monVal,
  activePathIndex,
  configMode,
  handleTagEditRequest,
  setShowCombinedCard,
  manualTemp,
  manualBrightness,
  manualDraft,
  getAlertState,
  openControl,
  coords,
  paths,
  radius,
  updatePoint,
  addPointToPath,
  deletePoint,
  addNewPath,
  setRadius,
  flowType,
  setFlowType,
  isRunning
}) {
  return (
          <div className="som-boiler-layout">
            <div className="som-boiler-flow-card">
              <div className="som-boiler-flow-body">
                {isPickerMode && <PickerBanner isPathMode={isPathMode} />}
                <svg ref={svgRef} viewBox={isFullscreen ? "0 0 2000 1100" : "80 0 1850 1100"} className="station-svg-canvas" preserveAspectRatio="xMidYMid slice" onMouseMove={handleMouseMove}>
                  <DefsOverlay />
                  <g transform={isFullscreen ? "translate(0, 0) scale(1.0)" : "translate(200, 110) scale(0.8)"}>
                    <image href={boilerHouseImageUrl} width="2000" height="1100" x="-10" y="14" />

                    {/* --- MAINTENANCE DIAGNOSTIC OVERLAYS --- */}
                    {viewMode === 'maintenance' && (
                      <DiagOverlay viewX="0" viewWidth="2000" bannerX="600" />
                    )}

                    {/* ANIMATION OVERLAYS */}
                    <foreignObject x={290} y={58} width="310" height="850" style={{ pointerEvents: 'none' }} className="fire-fx"><img src={fireGif} alt="Fire" className="som-boiler-video" /></foreignObject>
                    <foreignObject x={740} y={150} width="93" height="93" style={{ pointerEvents: 'none' }} className="water-fx"><img src={waterGif} alt="Water" className="som-boiler-video" /></foreignObject>
                    <foreignObject x={740} y={687} width="95" height="95" style={{ pointerEvents: 'none' }} className="water-fx water-full"><img src={waterGif} alt="Water" className="som-boiler-video" /></foreignObject>
                    <foreignObject x={1460} y={-170} width="780" height="500" style={{ pointerEvents: 'none' }} className="smoke-fx"><img src={smokeGif} alt="Smoke" className="som-boiler-video" /></foreignObject>

                    {/* ✅ FIX #3: Monitoring cards now read live values */}
                    {viewMode === 'process' && (
                      <>
                        <foreignObject x={90} y={165} width="280" height="200" style={{ overflow: "visible" }}>
                          <div className={`som-boiler-mini-card ${configMode ? 'som-editable' : ''}`} onClick={(e) => handleTagEditRequest(e, 'main_steam')} style={{ cursor: configMode ? 'pointer' : 'default', minWidth: '220px' }}>
                            <div className="som-boiler-mini-header">
                              <span className="som-boiler-mini-tag">MAIN STEAM PIPE</span>
                              <div className="som-boiler-status-indicator active"></div>
                            </div>
                            <div className="som-boiler-mini-body" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                              <div className="som-boiler-mini-param" style={{ width: "100%", textAlign: "center" }}>
                                <span className="som-boiler-mini-label">PRESS</span>
                                <span className="som-boiler-mini-value">{monVal('main_steam', '--', 2)}</span>
                                <span className="som-boiler-mini-unit">Bar</span>
                              </div>
                            </div>
                          </div>
                        </foreignObject>

                        <foreignObject x={360} y={440} width="260" height="260" style={{ overflow: 'visible' }}>
                          <div className="som-boiler-mini-card" onClick={() => setShowCombinedCard(true)} style={{ cursor: 'pointer', minWidth: '220px' }}>
                            <div className="som-boiler-mini-header">
                              <span className="som-boiler-mini-tag">FURNACE</span>
                              <div className="som-boiler-status-indicator active"></div>
                            </div>
                            <div className="som-boiler-mini-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <div className="som-boiler-mini-param" style={{ width: '100%' }}>
                                <span className="som-boiler-mini-label">TEMP</span>
                                <span className="som-boiler-mini-value">{manualTemp}</span>
                                <span className="som-boiler-mini-unit">°C</span>
                              </div>
                              <div className="som-boiler-mini-param" style={{ width: '100%' }}>
                                <span className="som-boiler-mini-label">BRIGHTNESS</span>
                                <span className="som-boiler-mini-value">{manualBrightness}</span>
                                <span className="som-boiler-mini-unit">lm</span>
                              </div>
                              <div className="som-boiler-mini-param" style={{ width: '100%' }}>
                                <span className="som-boiler-mini-label">DRAFT</span>
                                <span className="som-boiler-mini-value">{manualDraft}</span>
                                <span className="som-boiler-mini-unit">mm h2o</span>
                              </div>
                            </div>
                          </div>
                        </foreignObject>

                        {/* Sub-ID Fans area - Increased vertical spacing to avoid overlap */}
                        <foreignObject x={1470} y={640} width="340" height="200" style={{ overflow: 'visible' }}><BoilerMachineCard configMode={configMode} onTagEdit={handleTagEditRequest} title="SPEED" params={[{ label: 'RPM', value: monVal('SPEED', '0'), unit: 'RPM' }]} /></foreignObject>
                        <foreignObject x={1470} y={750} width="340" height="200" style={{ overflow: 'visible' }}><BoilerMachineCard configMode={configMode} onTagEdit={handleTagEditRequest} title="CURRENT" params={[{ label: 'LOAD', value: monVal('CURRENT', '43.30', 1), unit: 'A' }]} alertState={getAlertState('ampereIdf', monVal('CURRENT'))} /></foreignObject>
                      </>
                    )}

                    {/* Equipment label cards (interactive) */}
                    <foreignObject x={40} y={310} width="220" height="200" style={{ overflow: 'visible' }}>
                      {viewMode === 'process' ? (
                        <div className="som-boiler-mini-card" style={{ minWidth: '200px', cursor: 'pointer' }}
                          onClick={(e) => openControl(e, 'FUEL FEEDER', ['FEEDER 1', 'FEEDER 2'])}>
                          <div className="som-boiler-mini-header">
                            <span className="som-boiler-mini-tag">FUEL FEEDER</span>
                            <div className="som-boiler-status-indicator active"></div>
                          </div>
                          <div className="som-boiler-mini-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div className="som-boiler-mini-param" style={{ width: '100%' }}>
                              <span className="som-boiler-mini-label">No.1</span>
                              <span className="som-boiler-mini-value">40,5</span>
                              <span className="som-boiler-mini-unit">Hz</span>
                            </div>
                            <div className="som-boiler-mini-param" style={{ width: '100%' }}>
                              <span className="som-boiler-mini-label">No.2</span>
                              <span className="som-boiler-mini-value">43,2</span>
                              <span className="som-boiler-mini-unit">Hz</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <BoilerMachineCard configMode={configMode} onTagEdit={handleTagEditRequest} title="FUEL FEEDER" isMaintenance params={[{ label: 'AMP', value: '14.2', unit: 'A' }, { label: 'HZ', value: '45.0', unit: 'Hz' }, { label: 'VIB', value: '1.2', unit: 'mm/s' }]} />
                      )}
                    </foreignObject>

                    {/* Feed Pump Labels - Ubah x dan y untuk tukar posisi */}

                    {/* FEED WATER PUMP Card 1 (No.1 RUN) - Ubah x dan y untuk tukar posisi */}
                    <foreignObject x={1300} y={480} width="220" height="160" style={{ overflow: 'visible' }}>
                      {viewMode === 'process' ? (
                        <div className="som-boiler-mini-card" style={{ minWidth: '200px', cursor: 'pointer' }}
                          onClick={(e) => openControl(e, 'FW PUMP', ['PUMP 1'])}>
                          <div className="som-boiler-mini-header">
                            <span className="som-boiler-mini-tag">FEED WATER PUMP</span>
                            <div className="som-boiler-status-indicator active"></div>
                          </div>
                          <div className="som-boiler-mini-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div className="som-boiler-mini-param" style={{ width: '100%' }}>
                              <span className="som-boiler-mini-label">No. 1</span>
                              <span className="som-boiler-mini-value" style={{ color: '#10b981', fontSize: '14px' }}>RUN</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <BoilerMachineCard configMode={configMode} onTagEdit={handleTagEditRequest} title="FWP 1" isMaintenance params={[{ label: 'AMP', value: '28.5', unit: 'A' }, { label: 'VIB', value: '2.1', unit: 'mm/s' }]} />
                      )}
                    </foreignObject>

                    {/* FEED WATER PUMP Card 2 (No.2 STOP) - Ubah x dan y untuk tukar posisi */}
                    <foreignObject x={1470} y={480} width="220" height="160" style={{ overflow: 'visible' }}>
                      {viewMode === 'process' ? (
                        <div className="som-boiler-mini-card" style={{ minWidth: '200px', cursor: 'pointer' }}
                          onClick={(e) => openControl(e, 'FW PUMP', ['PUMP 2'])}>
                          <div className="som-boiler-mini-header">
                            <span className="som-boiler-mini-tag">FEED WATER PUMP</span>
                            <div className="som-boiler-status-indicator" style={{ background: '#ef4444', boxShadow: '0 0 10px rgba(239,68,68,0.8)' }}></div>
                          </div>
                          <div className="som-boiler-mini-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div className="som-boiler-mini-param" style={{ width: '100%' }}>
                              <span className="som-boiler-mini-label">No. 2</span>
                              <span className="som-boiler-mini-value" style={{ color: '#ef4444', fontSize: '14px' }}>STOP</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <BoilerMachineCard configMode={configMode} onTagEdit={handleTagEditRequest} title="FWP 2" isMaintenance params={[{ label: 'AMP', value: '0.0', unit: 'A' }, { label: 'VIB', value: '0.0', unit: 'mm/s' }]} />
                      )}
                    </foreignObject>

                    {/* FLUED GAS Card - Ubah x dan y foreignObject untuk tukar posisi */}
                    <foreignObject x={1960} y={450} width="280" height="380" style={{ overflow: 'visible' }}>
                      <BoilerMachineCard configMode={configMode} onTagEdit={handleTagEditRequest} title="FLUED GAS" params={[{ label: 'TEMPERATURE', value: '290', unit: '°C' }, { label: 'O2', value: '--', unit: '%' }, { label: 'CO2', value: '--', unit: '%' }, { label: 'CO', value: '--', unit: 'ppm' }, { label: 'NOX', value: '--', unit: 'ppm' }, { label: 'SO2', value: '--', unit: 'ppm' }, { label: 'PM', value: '--', unit: 'mg/m³' }, { label: 'H2O', value: '--', unit: '%' },]} />
                    </foreignObject>



                    <foreignObject x={1400} y={900} width="220" height="200" style={{ overflow: 'visible' }}>
                      {viewMode === 'process' ? (
                        <div className="som-boiler-mini-card" style={{ minWidth: '200px', cursor: 'pointer' }}
                          onClick={(e) => openControl(e, 'IDF FAN')}>
                          <div className="som-boiler-mini-header">
                            <span className="som-boiler-mini-tag">IDF FAN</span>
                            <div className="som-boiler-status-indicator active"></div>
                          </div>
                          <div className="som-boiler-mini-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div className="som-boiler-mini-param" style={{ width: '100%' }}>
                              <span className="som-boiler-mini-label">AMP</span>
                              <span className="som-boiler-mini-value">110,6</span>
                              <span className="som-boiler-mini-unit">A</span>
                            </div>
                            <div className="som-boiler-mini-param" style={{ width: '100%' }}>
                              <span className="som-boiler-mini-label">DRAFT</span>
                              <span className="som-boiler-mini-value">-25</span>
                              <span className="som-boiler-mini-unit">mmH₂O</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <BoilerMachineCard configMode={configMode} onTagEdit={handleTagEditRequest} title="IDF FAN" isMaintenance params={[{ label: 'AMP', value: '142.1', unit: 'A' }, { label: 'HZ', value: '48.2', unit: 'Hz' }, { label: 'VIB', value: '3.4', unit: 'mm/s' }]} />
                      )}
                    </foreignObject>



                    <foreignObject x={525} y={920} width="220" height="160" style={{ overflow: 'visible', zIndex: 10 }}>
                      {viewMode === 'process' ? (
                        <div className="som-boiler-mini-card" style={{ minWidth: '200px', cursor: 'pointer' }}
                          onClick={(e) => openControl(e, 'FF FAN')}>
                          <div className="som-boiler-mini-header">
                            <span className="som-boiler-mini-tag">FF FAN</span>
                            <div className="som-boiler-status-indicator active"></div>
                          </div>
                          <div className="som-boiler-mini-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div className="som-boiler-mini-param" style={{ width: '100%' }}>
                              <span className="som-boiler-mini-label">AMP</span>
                              <span className="som-boiler-mini-value">6,6</span>
                              <span className="som-boiler-mini-unit">A</span>
                            </div>
                          </div>
                        </div>
                      ) : <BoilerMachineCard configMode={configMode} onTagEdit={handleTagEditRequest} title="FF FAN" isMaintenance params={[{ label: 'AMP', value: '78.5', unit: 'A' }, { label: 'HZ', value: '45.0', unit: 'Hz' }, { label: 'VIB', value: '2.5', unit: 'mm/s' }]} />}
                    </foreignObject>

                    <foreignObject x={80} y={920} width="220" height="160" style={{ overflow: 'visible', zIndex: 10 }}>
                      {viewMode === 'process' ? (
                        <div className="som-boiler-mini-card" style={{ minWidth: '200px', cursor: 'pointer' }}
                          onClick={(e) => openControl(e, 'FD FAN')}>
                          <div className="som-boiler-mini-header">
                            <span className="som-boiler-mini-tag">FD FAN</span>
                            <div className="som-boiler-status-indicator active"></div>
                          </div>
                          <div className="som-boiler-mini-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div className="som-boiler-mini-param" style={{ width: '100%' }}>
                              <span className="som-boiler-mini-label">AMP</span>
                              <span className="som-boiler-mini-value">11,6</span>
                              <span className="som-boiler-mini-unit">A</span>
                            </div>
                          </div>
                        </div>
                      ) : <BoilerMachineCard configMode={configMode} onTagEdit={handleTagEditRequest} title="FD FAN" isMaintenance params={[{ label: 'AMP', value: '80.1', unit: 'A' }, { label: 'HZ', value: '45.2', unit: 'Hz' }, { label: 'VIB', value: '2.4', unit: 'mm/s' }]} />}
                    </foreignObject>

                    <foreignObject x={740} y={880} width="220" height="160" style={{ overflow: 'visible', zIndex: 10 }}>
                      {viewMode === 'process' ? (
                        <div className="som-boiler-mini-card" style={{ minWidth: '200px', cursor: 'pointer' }}
                          onClick={(e) => openControl(e, 'SD FAN')}>
                          <div className="som-boiler-mini-header">
                            <span className="som-boiler-mini-tag">SD FAN</span>
                            <div className="som-boiler-status-indicator active"></div>
                          </div>
                          <div className="som-boiler-mini-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div className="som-boiler-mini-param" style={{ width: '100%' }}>
                              <span className="som-boiler-mini-label">AMP</span>
                              <span className="som-boiler-mini-value">8,9</span>
                              <span className="som-boiler-mini-unit">A</span>
                            </div>
                          </div>
                        </div>
                      ) : <BoilerMachineCard configMode={configMode} onTagEdit={handleTagEditRequest} title="SD FAN" isMaintenance params={[{ label: 'AMP', value: '62.4', unit: 'A' }, { label: 'HZ', value: '48.5', unit: 'Hz' }, { label: 'VIB', value: '1.8', unit: 'mm/s' }]} />}
                    </foreignObject>

                    {/* DUST AIRLOCK Card - Ubah x dan y untuk tukar posisi */}
                    <foreignObject x={800} y={800} width="220" height="160" style={{ overflow: 'visible', zIndex: 10 }}>
                      <div className="som-boiler-mini-card" style={{ minWidth: '200px', cursor: 'pointer' }}
                        onClick={(e) => openControl(e, 'AIRLOCK', ['AIRLOCK'])}>
                        <div className="som-boiler-mini-header">
                          <span className="som-boiler-mini-tag">DUST AIRLOCK</span>
                          <div className="som-boiler-status-indicator active"></div>
                        </div>
                        <div className="som-boiler-mini-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div className="som-boiler-mini-param" style={{ width: '100%' }}>
                            <span className="som-boiler-mini-label">AMP</span>
                            <span className="som-boiler-mini-value">3,4</span>
                            <span className="som-boiler-mini-unit">A</span>
                          </div>
                        </div>
                      </div>
                    </foreignObject>

                    {/* DUST CONVEYOR Card - Ubah x dan y untuk tukar posisi */}
                    <foreignObject x={860} y={880} width="220" height="160" style={{ overflow: 'visible', zIndex: 10 }}>
                      <div className="som-boiler-mini-card" style={{ minWidth: '200px', cursor: 'pointer' }}
                        onClick={(e) => openControl(e, 'DUST CONVEYOR', ['DUST CONVEYOR'])}>
                        <div className="som-boiler-mini-header">
                          <span className="som-boiler-mini-tag">DUST CONVEYOR</span>
                          <div className="som-boiler-status-indicator active"></div>
                        </div>
                        <div className="som-boiler-mini-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div className="som-boiler-mini-param" style={{ width: '100%' }}>
                            <span className="som-boiler-mini-label">AMP</span>
                            <span className="som-boiler-mini-value">5,6</span>
                            <span className="som-boiler-mini-unit">A</span>
                          </div>
                        </div>
                      </div>
                    </foreignObject>

                    {/* Icons & Flows */}
                    <Flows viewMode={viewMode} isRunning={isRunning} />
                    <FanIconSVG x={47} y={425} isRunning={isRunning('FEEDER 1')} size={40} viewMode={viewMode} />
                    <FanIconSVG x={52} y={508} isRunning={isRunning('FEEDER 2')} size={40} viewMode={viewMode} />
                    <FanIconSVG x={668} y={962} isRunning={isRunning('FF FAN')} size={50} viewMode={viewMode} />
                    <FanIconSVG x={695} y={925} isRunning={isRunning('SD FAN')} size={40} viewMode={viewMode} />
                    <FanIconSVG x={220} y={971} isRunning={isRunning('FD FAN')} size={40} viewMode={viewMode} />
                    <FanIconSVG x={995} y={835} isRunning={isRunning('DUST CONVEYOR')} size={30} viewMode={viewMode} />
                    <FanIconSVG x={1233} y={932} isRunning={isRunning('AIRLOCK')} size={103} viewMode={viewMode} />
                    <FanIconSVG x={995} y={870} isRunning={isRunning('IDF FAN')} size={40} viewMode={viewMode} />
                    <FanIconSVG x={1355} y={413} isRunning={isRunning('PUMP 1')} size={40} viewMode={viewMode} />
                    <FanIconSVG x={1525} y={413} isRunning={isRunning('PUMP 2')} size={40} viewMode={viewMode} />

                    {/* Valve Actuators - Ubah x dan y untuk tukar posisi */}
                    <image href={valveActuatorSvg} x={650} y={80} width={80} height={80} />
                    <image href={valveActuatorSvg} x={950} y={125} width={80} height={80} />
                    <image href={valveActuatorSvg} x={1060} y={785} width={80} height={80}
                      style={{ transform: 'rotate(90deg)', transformBox: 'fill-box', transformOrigin: 'center' }}
                    />
                    {/* Valve ke-3 - Ubah x, y untuk posisi dan rotate untuk putaran (0, 90, 180, 270) */}

                    {/* TDS & BLOWDOWN Card - Ubah x dan y foreignObject untuk tukar posisi */}
                    <foreignObject x={1085} y={700} width="220" height="160" style={{ overflow: 'visible' }}>
                      <div className="som-boiler-mini-card" style={{ minWidth: '200px' }}>
                        <div className="som-boiler-mini-header">
                          <span className="som-boiler-mini-tag">BOILER WATER</span>
                          <div className="som-boiler-status-indicator active"></div>
                        </div>
                        <div className="som-boiler-mini-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div className="som-boiler-mini-param" style={{ width: '100%' }}>
                            <span className="som-boiler-mini-label">TDS</span>
                            <span className="som-boiler-mini-value">1,348</span>
                            <span className="som-boiler-mini-unit">mg/L</span>
                          </div>
                          <div className="som-boiler-mini-param" style={{ width: '100%' }}>
                            <span className="som-boiler-mini-label">BLOWDOWN</span>
                            <span className="som-boiler-mini-value" style={{ color: '#ef4444', fontSize: '14px' }}>ON</span>
                          </div>
                        </div>
                      </div>
                    </foreignObject>
                    {/* ✅ Coordinate picker overlays */}
                    {isPickerMode && <CrosshairOverlay coords={coords} />}
                    {paths.map((points, i) => (
                      <InteractivePath
                        key={i}
                        points={points}
                        radius={radius}
                        isActive={i === activePathIndex}
                        isPickerMode={isPickerMode}
                        onSelect={() => setActivePathIndex(i)}
                        onPointDrag={(ptIdx, x, y) => updatePoint(i, ptIdx, x, y)}
                        onAddPoint={(insertIdx, x, y) =>
                          addPointToPath(i, insertIdx, x, y)
                        }
                        onPointDelete={(ptIdx) => deletePoint(i, ptIdx)}
                      />
                    ))}
                  </g>
                </svg>
                {isPickerMode && (
                  <CoordinatePanel
                    paths={paths}
                    activePathIndex={activePathIndex}
                    onSelectPath={setActivePathIndex}
                    onAddNewPath={addNewPath}
                    onUpdatePoint={updatePoint}
                    onAddPoint={addPointToPath}
                    onDeletePoint={deletePoint}
                    radius={radius}
                    setRadius={setRadius}
                    flowType={flowType}
                    setFlowType={setFlowType}
                  />
                )}
              </div>
            </div>
          </div>

  );
}
