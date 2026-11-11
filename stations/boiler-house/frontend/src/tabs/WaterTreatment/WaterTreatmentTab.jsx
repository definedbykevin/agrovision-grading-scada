import React from 'react';
import waterTreatmentImageUrl from '../../assets/Boiler House Water Treatment.webp';
import { BoilerMachineCard } from '../../components/BoilerSharedComponents';
import { CrosshairOverlay } from '../../components/CoordinatePicker.jsx';


import {
  ValveImage,
  MotorImage,
  TextLabel,
  DiagOverlay,
  WaterFlowSVG,
  SteamFlowSVG,
  LiquidFlowSVG,
  Flows
} from '../../BoilerHousePage.jsx';

import { WTFlowPanel, WTFlowOverlay } from '../../components/WTFlowBuilder.jsx';

export default function WaterTreatmentTab({
  wtFlow,
  svgRef,
  handleMouseMove,
  monVal,
  configMode,
  handleTagEditRequest,
  coords,
  isRunning
}) {
  return (
              <div className="som-boiler-flow-card" style={{ flex: 1, padding: '0', position: 'relative' }}>
                {/* WT Flow Builder Toggle */}
                <button
                  className={`wt-flow-toggle-btn ${wtFlow.isActive ? 'active' : ''}`}
                  onClick={wtFlow.toggle}
                  style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 150 }}
                >
                  <span>{wtFlow.isActive ? '🔴' : '🔧'}</span>
                  {wtFlow.isActive ? 'Exit Flow Builder' : 'Flow Builder'}
                </button>

                <div className="som-boiler-flow-body">
                  <svg ref={svgRef} viewBox="0 0 2000 1100" className="station-svg-canvas" preserveAspectRatio="xMidYMid slice" onMouseMove={handleMouseMove}>
                    <g transform="translate(200, 110) scale(0.8)">
                      <image href={waterTreatmentImageUrl} width="2000" height="1100" />
                      {/* TOP SUMMARY PANELS (Boiler Style) */}
                      <foreignObject x={40} y={140} width="700" height="300" style={{ overflow: 'visible' }}>
                        <div className="som-boiler-mini-card" style={{ minWidth: '680px', borderTop: '3px solid #3b82f6' }}>
                          <div className="som-boiler-mini-header">
                            <span className="som-boiler-mini-tag">DASHBOARD SUMMARY</span>
                          </div>
                          <div className="som-boiler-mini-body">
                            <div className="som-boiler-mini-param">
                              <span className="som-boiler-mini-label">Feedwater Level</span>
                              <span className="som-boiler-mini-value">{monVal('WT FEEDWATER LEVEL', '80')}<span className="som-boiler-mini-unit">%</span></span>
                            </div>
                            <div className="som-boiler-mini-param">
                              <span className="som-boiler-mini-label">Feedwater TDS</span>
                              <span className="som-boiler-mini-value">{monVal('WT FEEDWATER TDS', '45')}<span className="som-boiler-mini-unit">ppm</span></span>
                            </div>
                            <div className="som-boiler-mini-param">
                              <span className="som-boiler-mini-label">Hardness</span>
                              <span className="som-boiler-mini-value">{monVal('WT FEEDWATER HARDNESS', '0')}<span className="som-boiler-mini-unit">ppm</span></span>
                            </div>
                            </div>
                          </div>
                        </foreignObject>

                      {/* Hardness Indicators (Alert Style) */}
                      <foreignObject x={35} y={380} width="200" height="100" style={{ overflow: 'visible' }}>
                        <div className="som-boiler-mini-card" style={{ minWidth: '180px', borderColor: 'rgba(239, 68, 68, 0.5)', background: 'rgba(15, 23, 42, 0.95)', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)' }}>
                          <div className="som-boiler-mini-header" style={{ background: 'rgba(239, 68, 68, 0.2)', borderBottom: 'none' }}>
                            <span className="som-boiler-mini-tag" style={{ color: '#f87171' }}>HARDNESS</span>
                          </div>
                          <div className="som-boiler-mini-body">
                            <span className="som-boiler-mini-value" style={{ color: '#f87171', textAlign: 'center', fontSize: '24px' }}>35<span className="som-boiler-mini-unit" style={{ color: '#fca5a5' }}>ppm</span></span>
                          </div>
                        </div>
                      </foreignObject>

                      <foreignObject x={480} y={380} width="200" height="100" style={{ overflow: 'visible' }}>
                        <div className="som-boiler-mini-card" style={{ minWidth: '180px', borderColor: 'rgba(239, 68, 68, 0.5)', background: 'rgba(15, 23, 42, 0.95)', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)' }}>
                          <div className="som-boiler-mini-header" style={{ background: 'rgba(239, 68, 68, 0.2)', borderBottom: 'none' }}>
                            <span className="som-boiler-mini-tag" style={{ color: '#f87171' }}>HARDNESS</span>
                          </div>
                          <div className="som-boiler-mini-body">
                            <span className="som-boiler-mini-value" style={{ color: '#f87171', textAlign: 'center', fontSize: '24px' }}>15<span className="som-boiler-mini-unit" style={{ color: '#fca5a5' }}>ppm</span></span>
                          </div>
                        </div>
                      </foreignObject>

                      <foreignObject x={950} y={975} width="200" height="100" style={{ overflow: 'visible' }}>
                        <div className="som-boiler-mini-card" style={{ minWidth: '180px', borderColor: 'rgba(56, 189, 248, 0.5)', background: 'rgba(15, 23, 42, 0.95)', boxShadow: '0 4px 15px rgba(56, 189, 248, 0.2)' }}>
                          <div className="som-boiler-mini-header" style={{ background: 'rgba(56, 189, 248, 0.1)', borderBottom: 'none' }}>
                            <span className="som-boiler-mini-tag" style={{ color: '#38bdf8' }}>HARDNESS</span>
                          </div>
                          <div className="som-boiler-mini-body">
                            <span className="som-boiler-mini-value" style={{ color: '#38bdf8', textAlign: 'center', fontSize: '24px' }}>0<span className="som-boiler-mini-unit" style={{ color: '#7dd3fc' }}>ppm</span></span>
                          </div>
                        </div>
                      </foreignObject>

                      <foreignObject x={170} y={850} width="200" height="100" style={{ overflow: 'visible' }}>
                        <div className="som-boiler-mini-card" style={{ minWidth: '180px', borderColor: 'rgba(56, 189, 248, 0.5)', background: 'rgba(15, 23, 42, 0.95)', boxShadow: '0 4px 15px rgba(56, 189, 248, 0.2)' }}>
                          <div className="som-boiler-mini-header" style={{ background: 'rgba(56, 189, 248, 0.1)', borderBottom: 'none' }}>
                            <span className="som-boiler-mini-tag" style={{ color: '#38bdf8' }}>PUMP 1</span>
                          </div>
                          <div className="som-boiler-mini-body">
                            <span className="som-boiler-mini-value" style={{ color: '#38bdf8', textAlign: 'center', fontSize: '24px' }}>10<span className="som-boiler-mini-unit" style={{ color: '#7dd3fc' }}>A</span></span>
                          </div>
                        </div>
                      </foreignObject>
                      <foreignObject x={690} y={850} width="200" height="100" style={{ overflow: 'visible' }}>
                        <div className="som-boiler-mini-card" style={{ minWidth: '180px', borderColor: 'rgba(56, 189, 248, 0.5)', background: 'rgba(15, 23, 42, 0.95)', boxShadow: '0 4px 15px rgba(56, 189, 248, 0.2)' }}>
                          <div className="som-boiler-mini-header" style={{ background: 'rgba(56, 189, 248, 0.1)', borderBottom: 'none' }}>
                            <span className="som-boiler-mini-tag" style={{ color: '#38bdf8' }}>PUMP 2</span>
                          </div>
                          <div className="som-boiler-mini-body">
                            <span className="som-boiler-mini-value" style={{ color: '#38bdf8', textAlign: 'center', fontSize: '24px' }}>10<span className="som-boiler-mini-unit" style={{ color: '#7dd3fc' }}>A</span></span>
                          </div>
                        </div>
                      </foreignObject>
                      <foreignObject x={940} y={865} width="200" height="100" style={{ overflow: 'visible' }}>
                        <div className="som-boiler-mini-card" style={{ minWidth: '180px', borderColor: 'rgba(56, 189, 248, 0.5)', background: 'rgba(15, 23, 42, 0.95)', boxShadow: '0 4px 15px rgba(56, 189, 248, 0.2)' }}>
                          <div className="som-boiler-mini-header" style={{ background: 'rgba(56, 189, 248, 0.1)', borderBottom: 'none' }}>
                            <span className="som-boiler-mini-tag" style={{ color: '#38bdf8' }}>PUMP 3</span>
                          </div>
                          <div className="som-boiler-mini-body">
                            <span className="som-boiler-mini-value" style={{ color: '#38bdf8', textAlign: 'center', fontSize: '24px' }}>10<span className="som-boiler-mini-unit" style={{ color: '#7dd3fc' }}>A</span></span>
                          </div>
                        </div>
                      </foreignObject>
                      <foreignObject x={1165} y={865} width="200" height="100" style={{ overflow: 'visible' }}>
                        <div className="som-boiler-mini-card" style={{ minWidth: '180px', borderColor: 'rgba(56, 189, 248, 0.5)', background: 'rgba(15, 23, 42, 0.95)', boxShadow: '0 4px 15px rgba(56, 189, 248, 0.2)' }}>
                          <div className="som-boiler-mini-header" style={{ background: 'rgba(56, 189, 248, 0.1)', borderBottom: 'none' }}>
                            <span className="som-boiler-mini-tag" style={{ color: '#38bdf8' }}>PUMP 4</span>
                          </div>
                          <div className="som-boiler-mini-body">
                            <span className="som-boiler-mini-value" style={{ color: '#38bdf8', textAlign: 'center', fontSize: '24px' }}>10<span className="som-boiler-mini-unit" style={{ color: '#7dd3fc' }}>A</span></span>
                          </div>
                        </div>
                      </foreignObject>
                      <foreignObject x={1530} y={780} width="200" height="140" style={{ overflow: 'visible' }}>
                        <div className="som-boiler-mini-card" style={{ minWidth: '180px', borderColor: 'rgba(56, 189, 248, 0.5)', background: 'rgba(15, 23, 42, 0.95)', boxShadow: '0 4px 15px rgba(56, 189, 248, 0.2)' }}>
                          <div className="som-boiler-mini-header" style={{ background: 'rgba(56, 189, 248, 0.1)', borderBottom: 'none' }}>
                            <span className="som-boiler-mini-tag" style={{ color: '#38bdf8' }}>DEAERATOR PUMP</span>
                          </div>
                          <div className="som-boiler-mini-body" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div className="som-boiler-mini-param" style={{ width: '100%' }}>
                              <span className="som-boiler-mini-label">PUMP 1</span>
                              <span className="som-boiler-mini-value">10<span className="som-boiler-mini-unit">A</span></span>
                            </div>
                            <div className="som-boiler-mini-param" style={{ width: '100%' }}>
                              <span className="som-boiler-mini-label">PUMP 2</span>
                              <span className="som-boiler-mini-value">10<span className="som-boiler-mini-unit">A</span></span>
                            </div>
                          </div>
                        </div>
                      </foreignObject>
                      <foreignObject x={1890} y={770} width="200" height="140" style={{ overflow: 'visible' }}>
                        <div className="som-boiler-mini-card" style={{ minWidth: '180px', borderColor: 'rgba(56, 189, 248, 0.5)', background: 'rgba(15, 23, 42, 0.95)', boxShadow: '0 4px 15px rgba(56, 189, 248, 0.2)' }}>
                          <div className="som-boiler-mini-header" style={{ background: 'rgba(56, 189, 248, 0.1)', borderBottom: 'none' }}>
                            <span className="som-boiler-mini-tag" style={{ color: '#38bdf8' }}>VALVE PUMP</span>
                          </div>
                          <div className="som-boiler-mini-body" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div className="som-boiler-mini-param" style={{ width: '100%' }}>
                              <span className="som-boiler-mini-label">PUMP 1</span>
                              <span className="som-boiler-mini-value">10<span className="som-boiler-mini-unit">A</span></span>
                            </div>
                            <div className="som-boiler-mini-param" style={{ width: '100%' }}>
                              <span className="som-boiler-mini-label">PUMP 2</span>
                              <span className="som-boiler-mini-value">10<span className="som-boiler-mini-unit">A</span></span>
                            </div>
                          </div>
                        </div>
                      </foreignObject>
                      <foreignObject x={1850} y={245} width="200" height="140" style={{ overflow: 'visible' }}>
                        <div className="som-boiler-mini-card" style={{ minWidth: '180px', borderColor: 'rgba(56, 189, 248, 0.5)', background: 'rgba(15, 23, 42, 0.95)', boxShadow: '0 4px 15px rgba(56, 189, 248, 0.2)' }}>
                          <div className="som-boiler-mini-header" style={{ background: 'rgba(56, 189, 248, 0.1)', borderBottom: 'none' }}>
                            <span className="som-boiler-mini-tag" style={{ color: '#38bdf8' }}>TO BOILER PUMP</span>
                          </div>
                          <div className="som-boiler-mini-body" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div className="som-boiler-mini-param" style={{ width: '100%' }}>
                              <span className="som-boiler-mini-label">PUMP 1</span>
                              <span className="som-boiler-mini-value">10<span className="som-boiler-mini-unit">A</span></span>
                            </div>
                            <div className="som-boiler-mini-param" style={{ width: '100%' }}>
                              <span className="som-boiler-mini-label">PUMP 2</span>
                              <span className="som-boiler-mini-value">10<span className="som-boiler-mini-unit">A</span></span>
                            </div>
                          </div>
                        </div>
                      </foreignObject>

                      {/* MAIN TANKS (Boiler Style) */}
                      <foreignObject x={1340} y={635} width="220" height="150" style={{ overflow: 'visible' }}>
                        <BoilerMachineCard configMode={configMode} onTagEdit={handleTagEditRequest} title="FW TANK" params={[{ label: 'LEVEL', value: '80.0', unit: '%' }, { label: 'TEMP', value: '110.6', unit: '°C' }]} />
                      </foreignObject>

                      <foreignObject x={1160} y={250} width="220" height="150" style={{ overflow: 'visible' }}>
                        <BoilerMachineCard configMode={configMode} onTagEdit={handleTagEditRequest} title="DEAERATOR" params={[{ label: 'PRESS', value: '3.65', unit: 'bar' }, { label: 'TEMP', value: '110.6', unit: '°C' }]} />
                      </foreignObject>

                      {/* SMALL LABELS */}
                      <foreignObject x={1478} y={195} width="200" height="150" style={{ overflow: 'visible' }}>
                        <BoilerMachineCard configMode={configMode} onTagEdit={handleTagEditRequest} title="LP VALVE" params={[{ label: 'PRESS', value: '3.65', unit: 'bar' }]} />
                      </foreignObject>

                      <foreignObject x={1745} y={935} width="200" height="150" style={{ overflow: 'visible' }}>
                        <BoilerMachineCard configMode={configMode} onTagEdit={handleTagEditRequest} title="STEAM IN" params={[{ label: 'PRESS', value: '3.05', unit: 'bar' }]} />
                      </foreignObject>

                      <foreignObject x={1930} y={450} width="140" height="150" style={{ overflow: 'visible' }}>
                        <div className="som-boiler-mini-card interactive-label pulsate" style={{ border: '1px solid #f59e0b' }}>
                          <div className="som-boiler-mini-header"><span className="som-boiler-mini-tag">TO BOILER</span></div>
                          <div className="som-boiler-mini-body">
                            <span className="som-boiler-mini-value" style={{ textAlign: 'center', fontSize: '18px' }}>23.6<span className="som-boiler-mini-unit">m3/hr</span></span>
                          </div>
                        </div>
                      </foreignObject>

                      {/* WT Flow Builder Overlay */}
                      <WTFlowOverlay
                        flows={wtFlow.flows}
                        activeFlowIdx={wtFlow.activeFlowIdx}
                        isActive={wtFlow.isActive}
                        isPlacing={wtFlow.isPlacing}
                        onPointDrag={wtFlow.updatePoint}
                        onInsertPoint={wtFlow.insertPoint}
                        onDeletePoint={wtFlow.deletePoint}
                        onSelectFlow={wtFlow.setActiveFlowIdx}
                        onCanvasClick={(x, y) => wtFlow.addPointToActiveFlow(x, y)}
                      />

                      {/* Crosshair overlay when builder is active */}
                      {wtFlow.isActive && <CrosshairOverlay coords={coords} />}

                      {/* Permanent Water Flows — di atas semua overlay agar terlihat */}
                      <g className="wt-permanent-flows">
                        <LiquidFlowSVG
                          d="M 571,967 L 1124,967 Q 1142,967 1142,949 L 1142,930"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <LiquidFlowSVG
                          d="M 143,846 L 145,455"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <LiquidFlowSVG
                          d="M 17,455 L 433,454"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <LiquidFlowSVG
                          d="M 329,461 L 329,531"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <LiquidFlowSVG
                          d="M 186,738 L 187,528 Q 187,503 212,503 L 261,503 Q 278,503 279,520 L 279,536"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <LiquidFlowSVG
                          d="M 336,939 L 336,966"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <LiquidFlowSVG
                          d="M 126,968 L 470,968 Q 495,968 495,943 L 494,479 Q 494,454 519,454 L 946,454"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <LiquidFlowSVG
                          d="M 656,850 L 656,463"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <LiquidFlowSVG
                          d="M 839,460 L 839,531"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <LiquidFlowSVG
                          d="M 694,745 L 692,524 Q 692,504 712,504 L 770,504 Q 784,504 784,519 L 784,533"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <LiquidFlowSVG
                          d="M 838,936 L 838,962"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <LiquidFlowSVG
                          d="M 1083,964 L 1084,935"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <LiquidFlowSVG
                          d="M 1084,860 L 1086,839 Q 1088,826 1102,826 L 1102,826 Q 1115,825 1115,811 L 1114,530 Q 1114,510 1134,510 L 1182,511"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <LiquidFlowSVG
                          d="M 1142,875 L 1143,845 Q 1143,831 1129,828 L 1115,824"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <LiquidFlowSVG
                          d="M 1634,881 L 1717,880 Q 1734,880 1736,863 L 1737,846"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <LiquidFlowSVG
                          d="M 1677,879 L 1677,845"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <SteamFlowSVG
                          d="M 1294,874 L 1293,947 Q 1292,972 1317,972 L 1732,971"
                          active={true}
                          mode="flowing"
                          color="#38bdf8"
                          thickness={8}
                        />
                        <LiquidFlowSVG
                          d="M 1680,776 L 1680,762 Q 1679,747 1693,743 L 1693,743 Q 1707,738 1707,723 L 1706,468 Q 1706,443 1681,443 L 1037,442 Q 1012,442 1012,417 L 1014,226 Q 1014,201 1039,201 L 1132,201"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <LiquidFlowSVG
                          d="M 1185,373 L 1184,393 Q 1182,412 1202,412 L 1748,411 Q 1773,411 1773,436 L 1773,861 Q 1773,880 1792,882 L 1792,882 Q 1810,884 1810,865 L 1809,842"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <LiquidFlowSVG
                          d="M 1810,778 L 1811,756 Q 1812,743 1825,742 L 1825,742 Q 1838,740 1838,727 L 1839,459 Q 1839,434 1864,433 L 1891,431"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <LiquidFlowSVG
                          d="M 1827,342 L 1894,342 Q 1919,342 1918,367 L 1917,409 Q 1916,434 1941,434 L 1982,433"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <LiquidFlowSVG
                          d="M 1798,882 L 1845,882 Q 1861,882 1865,867 L 1869,851"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <LiquidFlowSVG
                          d="M 1737,790 L 1736,766 Q 1736,749 1721,743 L 1705,737"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <LiquidFlowSVG
                          d="M 1868,774 L 1868,762 Q 1867,749 1856,744 L 1839,736"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <LiquidFlowSVG
                          d="M 1892,433 L 1892,399 Q 1892,374 1867,374 L 1713,374"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <LiquidFlowSVG
                          d="M 1676,351 L 1676,316"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />

                        {/* New flow: horizontal pipe M 17,454 → 433,454 */}
                        <LiquidFlowSVG
                          d="M 17,454 L 433,454"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <LiquidFlowSVG
                          d="M 1850,433 L 1981,434"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <SteamFlowSVG
                          d="M 1347,215 L 1346,193 Q 1345,170 1368,170 L 1483,172"
                          active={true}
                          mode="flowing"
                          color="#38bdf8"
                          thickness={8}
                        />

                        {/* Valve Actuators — 6 green (OPEN), 6 red (CLOSED) */}
                        {/* Green valves */}
                        <ValveImage x={230} y={415} rotate={0} size={50} filter="hue-rotate(330deg) saturate(4) brightness(1.1)" />
                        <ValveImage x={360} y={930} rotate={0} size={50} filter="hue-rotate(330deg) saturate(4) brightness(1.1)" />
                        <ValveImage x={750} y={415} rotate={0} size={50} filter="hue-rotate(360deg) saturate(4) brightness(1.1)" />
                        <ValveImage x={880} y={930} rotate={0} size={50} filter="hue-rotate(330deg) saturate(4) brightness(1.1)" />
                        <ValveImage x={1380} y={132} rotate={0} size={50} filter="hue-rotate(330deg) saturate(4) brightness(1.1)" />



                        {/* Red valves */}
                        <ValveImage x={360} y={415} rotate={0} filter="sepia(1) saturate(5) hue-rotate(310deg) brightness(1.1)" />
                        <ValveImage x={230} y={930} rotate={0} filter="sepia(1) saturate(5) hue-rotate(310deg) brightness(1.1)" />
                        <ValveImage x={880} y={415} rotate={0} filter="sepia(1) saturate(5) hue-rotate(310deg) brightness(1.1)" />
                        <ValveImage x={750} y={930} rotate={0} filter="sepia(1) saturate(5) hue-rotate(310deg) brightness(1.1)" />
                        <ValveImage x={205} y={472} rotate={0} size={40} filter="sepia(1) saturate(5) hue-rotate(310deg) brightness(1.1)" />
                        <ValveImage x={720} y={472} rotate={0} size={40} filter="sepia(1) saturate(5) hue-rotate(310deg) brightness(1.1)" />
                        <ValveImage x={105} y={502} rotate={270} filter="sepia(1) saturate(5) hue-rotate(310deg) brightness(1.1)" />
                        <ValveImage x={617} y={502} rotate={270} filter="sepia(1) saturate(5) hue-rotate(310deg) brightness(1.1)" />

                        {/* Motor Icons - 2 motors */}
                        <MotorImage x={45} y={710} rotate={90} />
                        <MotorImage x={560} y={710} rotate={90} />
                        <MotorImage x={1650} y={110} rotate={90} />
                        <MotorImage x={1768} y={110} rotate={90} />

                        {/* Text Labels */}
                        <TextLabel x={100} y={810} text="NaCl" rotate={270} color="#0e0d0d" fontSize={28} fontWeight="bold" />
                        <TextLabel x={615} y={814} text="H2S04" rotate={270} color="#0e0d0d" fontSize={28} fontWeight="bold" />
                        <TextLabel x={1095} y={680} text="SOFTENER PUMP 1" rotate={270} color="#0e0d0d" fontSize={20} fontWeight="bold" />
                        <TextLabel x={1140} y={680} text="SOFTENER PUMP 2" rotate={270} color="#0e0d0d" fontSize={20} fontWeight="bold" />
                        <TextLabel x={1680} y={590} text="DEAREATOR PUMP 1" rotate={270} color="#0e0d0d" fontSize={20} fontWeight="bold" />
                        <TextLabel x={1735} y={590} text="DEAREATOR PUMP 2" rotate={270} color="#0e0d0d" fontSize={20} fontWeight="bold" />
                        <TextLabel x={1814} y={590} text="FEED WATER PUMP 1" rotate={270} color="#0e0d0d" fontSize={20} fontWeight="bold" />
                        <TextLabel x={1870} y={590} text="FEED WATER PUMP 2" rotate={270} color="#0e0d0d" fontSize={20} fontWeight="bold" />
                        <TextLabel x={230} y={400} text="SOFTENER" rotate={0} color="#0e0d0d" fontSize={15} fontWeight="bold" />
                        <TextLabel x={230} y={412} text="INLET" rotate={0} color="#0e0d0d" fontSize={15} fontWeight="bold" />
                        <TextLabel x={370} y={385} text="SOFTENER" rotate={0} color="#0e0d0d" fontSize={15} fontWeight="bold" />
                        <TextLabel x={370} y={400} text="BACKWASH" rotate={0} color="#0e0d0d" fontSize={15} fontWeight="bold" />
                        <TextLabel x={370} y={413} text="INLET" rotate={0} color="#0e0d0d" fontSize={15} fontWeight="bold" />
                        <TextLabel x={170} y={610} text="Air Relief Valve " rotate={270} color="#0e0d0d" fontSize={20} fontWeight="bold" />
                        <TextLabel x={640} y={620} text="Air Relief Valve " rotate={270} color="#0e0d0d" fontSize={20} fontWeight="bold" />
                        <TextLabel x={750} y={400} text="DEMIN" rotate={0} color="#0e0d0d" fontSize={15} fontWeight="bold" />
                        <TextLabel x={750} y={412} text="INLET" rotate={0} color="#0e0d0d" fontSize={15} fontWeight="bold" />
                        <TextLabel x={880} y={385} text="DEMIN" rotate={0} color="#0e0d0d" fontSize={15} fontWeight="bold" />
                        <TextLabel x={880} y={400} text="BACKWASH" rotate={0} color="#0e0d0d" fontSize={15} fontWeight="bold" />
                        <TextLabel x={880} y={413} text="INLET" rotate={0} color="#0e0d0d" fontSize={15} fontWeight="bold" />
                        <TextLabel x={230} y={990} text="SOFTENER" rotate={0} color="#0e0d0d" fontSize={15} fontWeight="bold" />
                        <TextLabel x={230} y={1005} text="BACKWASH" rotate={0} color="#0e0d0d" fontSize={15} fontWeight="bold" />
                        <TextLabel x={230} y={1020} text="INLET" rotate={0} color="#0e0d0d" fontSize={15} fontWeight="bold" />
                        <TextLabel x={390} y={990} text="SOFTENER" rotate={0} color="#0e0d0d" fontSize={15} fontWeight="bold" />
                        <TextLabel x={390} y={1005} text="INLET" rotate={0} color="#0e0d0d" fontSize={15} fontWeight="bold" />
                        <TextLabel x={750} y={990} text="DEMIN" rotate={0} color="#0e0d0d" fontSize={15} fontWeight="bold" />
                        <TextLabel x={750} y={1020} text="INLET" rotate={0} color="#0e0d0d" fontSize={15} fontWeight="bold" />
                        <TextLabel x={880} y={990} text="DEMIN" rotate={0} color="#0e0d0d" fontSize={15} fontWeight="bold" />
                        <TextLabel x={750} y={1005} text="BACKWASH" rotate={0} color="#0e0d0d" fontSize={15} fontWeight="bold" />
                        <TextLabel x={880} y={1005} text="INLET" rotate={0} color="#0e0d0d" fontSize={15} fontWeight="bold" />
                        <TextLabel x={1680} y={300} text="VALVE 1" rotate={0} color="#0e0d0d" fontSize={15} fontWeight="bold" />
                        <TextLabel x={1800} y={300} text="VALVE 2" rotate={0} color="#0e0d0d" fontSize={15} fontWeight="bold" />
                        <TextLabel x={1820} y={400} text="CHEMICAL 1" rotate={0} color="#0e0d0d" fontSize={15} fontWeight="bold" />
                        <TextLabel x={1970} y={350} text="CHEMICAL 2" rotate={0} color="#0e0d0d" fontSize={15} fontWeight="bold" />



                      </g>
                    </g>
                  </svg>

                  {/* WT Flow Builder Panel */}
                  {wtFlow.isActive && (
                    <WTFlowPanel
                      flows={wtFlow.flows}
                      activeFlowIdx={wtFlow.activeFlowIdx}
                      isPlacing={wtFlow.isPlacing}
                      onSelectFlow={wtFlow.setActiveFlowIdx}
                      onAddNewFlow={wtFlow.addNewFlow}
                      onDeleteFlow={wtFlow.deleteFlow}
                      onUpdateFlowSettings={wtFlow.updateFlowSettings}
                      onFinishPlacing={wtFlow.finishPlacing}
                      onClose={wtFlow.toggle}
                    />
                  )}
                </div>
              </div>
  );
}
