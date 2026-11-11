import { useState, useCallback, useRef, useMemo } from "react";
import "./WTFlowBuilder.css";

/* ================================================================
   MAX_POINTS — limit per flow path
   ================================================================ */
const MAX_POINTS = 10;

/* ================================================================
   Pipe Path Helper — calculates rounded corners
   ================================================================ */
function calculatePipePath(pins, radius = 25) {
  if (pins.length < 2) return "";

  let path = `M ${pins[0].x},${pins[0].y}`;

  for (let i = 1; i < pins.length; i++) {
    const prev = pins[i - 1];
    const curr = pins[i];
    const next = pins[i + 1];

    if (next && radius > 0) {
      const v1 = { x: prev.x - curr.x, y: prev.y - curr.y };
      const v1Len = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
      const v2 = { x: next.x - curr.x, y: next.y - curr.y };
      const v2Len = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
      const r = Math.min(radius, v1Len / 2, v2Len / 2);

      if (r > 1) {
        const p1 = {
          x: Math.round(curr.x + (v1.x / v1Len) * r),
          y: Math.round(curr.y + (v1.y / v1Len) * r),
        };
        const p2 = {
          x: Math.round(curr.x + (v2.x / v2Len) * r),
          y: Math.round(curr.y + (v2.y / v2Len) * r),
        };
        path += ` L ${p1.x},${p1.y} Q ${curr.x},${curr.y} ${p2.x},${p2.y}`;
        continue;
      }
    }
    path += ` L ${curr.x},${curr.y}`;
  }
  return path;
}

/* ================================================================
   Generate JSX code from flow path
   ================================================================ */
function generateJSX(pins, flowType, color, radius = 25, thickness = 8, flowId = "") {
  if (pins.length === 0) return "// No data";

  const d = calculatePipePath(pins, radius);
  const condition = flowId ? `parseFloat(lv('${flowId}', 'FLOW', '0')) > 0` : `true`;
  
  if (flowType === "water") {
    return `{${condition} && (
  <LiquidFlowSVG
    d="${d}"
    isRunning={true}
    color="${color}"
    thickness={${thickness}}
  />
)}`;
  } else if (flowType === "steam") {
    return `{${condition} && (
  <SteamFlowSVG
    d="${d}"
    active={true}
    mode="flowing"
    color="${color}"
    thickness={${thickness}}
  />
)}`;
  }
  return "";
}

/* ================================================================
   Color Presets
   ================================================================ */
const COLOR_PRESETS = [
  { name: "Water Blue", value: "#38bdf8" },
  { name: "Dark Blue", value: "#2563eb" },
  { name: "Steam Cyan", value: "#a9dbe1ff" },
  { name: "Green", value: "#22c55e" },
  { name: "Red", value: "#ef4444" },
  { name: "Purple", value: "#a855f7" },
  { name: "Brown", value: "#965608" },
  { name: "White", value: "#e2e8f0" },
];

/* ================================================================
   WTFlowBuilder — Main Component  
   Renders inside Water Treatment SVG + floating panel
   ================================================================ */
export function useWTFlowBuilder() {
  const [isActive, setIsActive] = useState(false);
  const [flows, setFlows] = useState([]);
  const [activeFlowIdx, setActiveFlowIdx] = useState(-1);
  const [radius, setRadius] = useState(25);
  const [flowType, setFlowType] = useState("water");
  const [color, setColor] = useState("#f59e0b");
  const [thickness, setThickness] = useState(8);
  const [isPlacing, setIsPlacing] = useState(false);

  const toggle = useCallback(() => {
    setIsActive((v) => !v);
  }, []);

  const addNewFlow = useCallback(() => {
    setFlows((prev) => {
      const newId = `flow_${Date.now()}`;
      const next = [...prev, { id: newId, points: [], flowType: "water", color: "#f59e0b", thickness: 12, radius: 18 }];
      setActiveFlowIdx(next.length - 1);
      setIsPlacing(true);
      return next;
    });
  }, []);

  const addPoint = useCallback((x, y) => {
    setFlows((prev) => {
      const next = [...prev];
      const flow = { ...next[prev.length - 1] };
      if (flow.points.length >= MAX_POINTS) return prev;
      flow.points = [...flow.points, { x, y }];
      next[prev.length - 1] = flow;
      return next;
    });
  }, []);

  const addPointToActiveFlow = useCallback((x, y) => {
    setFlows((prev) => {
      if (prev.length === 0) return prev;
      const idx = prev.length - 1;
      const next = [...prev];
      const flow = { ...next[idx] };
      if (flow.points.length >= MAX_POINTS) return prev;
      flow.points = [...flow.points, { x, y }];
      next[idx] = flow;
      return next;
    });
  }, []);

  const insertPoint = useCallback((flowIdx, insertIdx, x, y) => {
    setFlows((prev) => {
      const next = [...prev];
      const flow = { ...next[flowIdx] };
      if (flow.points.length >= MAX_POINTS) return prev;
      flow.points = [...flow.points];
      flow.points.splice(insertIdx, 0, { x, y });
      next[flowIdx] = flow;
      return next;
    });
  }, []);

  const updatePoint = useCallback((flowIdx, ptIdx, x, y) => {
    setFlows((prev) => {
      const next = [...prev];
      const flow = { ...next[flowIdx] };
      flow.points = [...flow.points];
      flow.points[ptIdx] = { x, y };
      next[flowIdx] = flow;
      return next;
    });
  }, []);

  const deletePoint = useCallback((flowIdx, ptIdx) => {
    setFlows((prev) => {
      const next = [...prev];
      const flow = { ...next[flowIdx] };
      flow.points = flow.points.filter((_, i) => i !== ptIdx);
      if (flow.points.length < 1) {
        // Remove flow entirely
        const filtered = next.filter((_, i) => i !== flowIdx);
        setActiveFlowIdx(-1);
        return filtered;
      }
      next[flowIdx] = flow;
      return next;
    });
  }, []);

  const deleteFlow = useCallback((flowIdx) => {
    setFlows((prev) => {
      const filtered = prev.filter((_, i) => i !== flowIdx);
      setActiveFlowIdx(-1);
      return filtered;
    });
  }, []);

  const updateFlowSettings = useCallback((flowIdx, settings) => {
    setFlows((prev) => {
      const next = [...prev];
      next[flowIdx] = { ...next[flowIdx], ...settings };
      return next;
    });
  }, []);

  const finishPlacing = useCallback(() => {
    setIsPlacing(false);
  }, []);

  return {
    isActive,
    toggle,
    flows,
    activeFlowIdx,
    setActiveFlowIdx,
    addNewFlow,
    addPoint,
    addPointToActiveFlow,
    insertPoint,
    updatePoint,
    deletePoint,
    deleteFlow,
    updateFlowSettings,
    radius,
    setRadius,
    flowType,
    setFlowType,
    color,
    setColor,
    thickness,
    setThickness,
    isPlacing,
    setIsPlacing,
    finishPlacing,
  };
}

/* ================================================================
   SVG Overlay — renders the interactive paths on the canvas
   ================================================================ */
export function WTFlowOverlay({
  flows,
  activeFlowIdx,
  isActive,
  isPlacing,
  onPointDrag,
  onInsertPoint,
  onDeletePoint,
  onSelectFlow,
  onCanvasClick,
}) {
  if (!isActive) return null;

  const handleCanvasClick = (e) => {
    if (!isPlacing) return;
    const svg = e.currentTarget.closest("svg");
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = e.currentTarget.getScreenCTM();
    if (!ctm) return;
    const svgP = pt.matrixTransform(ctm.inverse());
    onCanvasClick(Math.round(svgP.x), Math.round(svgP.y));
  };

  return (
    <g>
      {/* Invisible click area for placing points */}
      {isPlacing && (
        <rect
          x={-200}
          y={-200}
          width={3000}
          height={2000}
          fill="transparent"
          style={{ cursor: "crosshair" }}
          onClick={handleCanvasClick}
        />
      )}

      {/* Render all flow paths */}
      {flows.map((flow, fIdx) => {
        if (flow.points.length < 2) {
          // Render individual points as dots
          return flow.points.map((p, pIdx) => (
            <g key={`f${fIdx}-p${pIdx}`}>
              <circle cx={p.x} cy={p.y} r={6} fill={flow.color} opacity={0.8} />
              <circle cx={p.x} cy={p.y} r={12} fill="none" stroke={flow.color} strokeWidth={2} opacity={0.4} strokeDasharray="3,3">
                <animate attributeName="r" values="12;18;12" dur="2s" repeatCount="indefinite" />
              </circle>
            </g>
          ));
        }

        const d = calculatePipePath(flow.points, flow.radius);
        const isActiveFlow = fIdx === activeFlowIdx;

        return (
          <g key={`flow-${fIdx}`} onClick={(e) => { e.stopPropagation(); onSelectFlow(fIdx); }} style={{ cursor: "pointer" }}>
            {/* Background glow */}
            <path d={d} fill="none" stroke={flow.color} strokeWidth={flow.thickness + 10} strokeLinecap="round" opacity={0.1} />
            {/* Main pipe */}
            <path d={d} fill="none" stroke={flow.color} strokeWidth={flow.thickness} strokeLinecap="round" opacity={0.6} />
            {/* Animated flow */}
            <path d={d} fill="none" stroke={flow.color} strokeWidth={2} strokeLinecap="round" strokeDasharray="6 20" opacity={0.9}>
              <animate attributeName="stroke-dashoffset" values="0;-26" dur="1s" repeatCount="indefinite" />
            </path>

            {/* Drag handles (only active flow) */}
            {isActiveFlow &&
              flow.points.map((p, pIdx) => (
                <g key={`h-${pIdx}`}>
                  {/* Segment hitbox for inserting midpoints */}
                  {pIdx < flow.points.length - 1 && (
                    <line
                      x1={p.x}
                      y1={p.y}
                      x2={flow.points[pIdx + 1].x}
                      y2={flow.points[pIdx + 1].y}
                      stroke="transparent"
                      strokeWidth={20}
                      style={{ cursor: flow.points.length < MAX_POINTS ? "cell" : "not-allowed" }}
                      onPointerDown={(e) => {
                        if (flow.points.length >= MAX_POINTS) return;
                        e.stopPropagation();
                        const svg = e.currentTarget.closest("svg");
                        const pt2 = svg.createSVGPoint();
                        pt2.x = e.clientX;
                        pt2.y = e.clientY;
                        const ctm = e.currentTarget.parentElement.closest("g[transform]")?.getScreenCTM();
                        const svgP = pt2.matrixTransform((ctm || svg.getScreenCTM()).inverse());
                        onInsertPoint(fIdx, pIdx + 1, Math.round(svgP.x), Math.round(svgP.y));
                      }}
                    />
                  )}

                  {/* Draggable handle */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={8}
                    className="wt-flow-handle"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      const svg = e.currentTarget.closest("svg");
                      const gTransform = e.currentTarget.parentElement.closest("g[transform]");
                      const onMove = (me) => {
                        const pt2 = svg.createSVGPoint();
                        pt2.x = me.clientX;
                        pt2.y = me.clientY;
                        const ctm = gTransform ? gTransform.getScreenCTM() : svg.getScreenCTM();
                        const svgP = pt2.matrixTransform(ctm.inverse());
                        onPointDrag(fIdx, pIdx, Math.round(svgP.x), Math.round(svgP.y));
                      };
                      const onUp = () => {
                        window.removeEventListener("pointermove", onMove);
                        window.removeEventListener("pointerup", onUp);
                      };
                      window.addEventListener("pointermove", onMove);
                      window.addEventListener("pointerup", onUp);
                      e.currentTarget.setPointerCapture(e.pointerId);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDeletePoint(fIdx, pIdx);
                    }}
                  />
                  {/* Point number label */}
                  <text x={p.x} y={p.y - 14} className="wt-flow-handle-label">
                    {pIdx + 1}
                  </text>
                  {/* Coordinate label */}
                  <text x={p.x + 14} y={p.y + 4} className="wt-flow-coord-label">
                    {p.x},{p.y}
                  </text>
                </g>
              ))}
          </g>
        );
      })}
    </g>
  );
}

/* ================================================================
   Floating Panel — controls for the flow builder
   ================================================================ */
export function WTFlowPanel({
  flows,
  activeFlowIdx,
  isPlacing,
  onSelectFlow,
  onAddNewFlow,
  onDeleteFlow,
  onUpdateFlowSettings,
  onFinishPlacing,
  onClose,
  onConfigFlow,
}) {
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [panelPos, setPanelPos] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const [codeTarget, setCodeTarget] = useState("single"); // "single" or "all"

  const activeFlow = flows[activeFlowIdx];

  const generatedCode = useMemo(() => {
    if (codeTarget === "all") {
      return flows
        .filter((f) => f.points.length >= 2)
        .map((f, i) => `{/* Flow ${i + 1} */}\n${generateJSX(f.points, f.flowType, f.color, f.radius, f.thickness, f.id)}`)
        .join("\n\n");
    }
    if (!activeFlow || activeFlow.points.length < 2) return "// Tambahkan minimal 2 titik";
    return generateJSX(activeFlow.points, activeFlow.flowType, activeFlow.color, activeFlow.radius, activeFlow.thickness, activeFlow.id);
  }, [activeFlow, flows, codeTarget]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handlePointerDown = (e) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX - panelPos.x, y: e.clientY - panelPos.y };
    e.target.setPointerCapture(e.pointerId);
  };
  const handlePointerMove = (e) => {
    if (!isDragging.current) return;
    setPanelPos({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  };
  const handlePointerUp = (e) => {
    isDragging.current = false;
    e.target.releasePointerCapture(e.pointerId);
  };

  return (
    <div className="wt-flow-panel" style={{ transform: `translate(${panelPos.x}px, ${panelPos.y}px)` }}>
      {/* Header */}
      <div
        className="wt-flow-panel-header"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="wt-flow-panel-title-row">
          <div className="wt-flow-panel-dot" />
          <span className="wt-flow-panel-title">WT Flow Builder</span>
        </div>
        <div className="wt-flow-panel-header-actions">
          <button className="wt-flow-add-btn" onClick={(e) => { e.stopPropagation(); onAddNewFlow(); }}>
            + New Flow
          </button>
          <button className="wt-flow-close-btn" onClick={(e) => { e.stopPropagation(); onClose(); }}>✕</button>
        </div>
      </div>

      {/* Placing mode banner */}
      {isPlacing && (
        <div className="wt-flow-placing-banner">
          <span className="wt-flow-placing-icon">⊕</span>
          <span>Klik pada gambar untuk menambah titik (maks {MAX_POINTS})</span>
          <button className="wt-flow-done-btn" onClick={onFinishPlacing}>Selesai</button>
        </div>
      )}

      {/* Flow list */}
      <div className="wt-flow-list">
        {flows.length === 0 ? (
          <div className="wt-flow-empty">
            <div className="wt-flow-empty-icon">🔧</div>
            <p>Klik <strong>"+ New Flow"</strong> untuk mulai membuat aliran pipa</p>
          </div>
        ) : (
          flows.map((flow, i) => (
            <div
              key={i}
              className={`wt-flow-item ${i === activeFlowIdx ? "active" : ""}`}
              onClick={() => onSelectFlow(i)}
            >
              <div className="wt-flow-item-left">
                <div className="wt-flow-item-color" style={{ background: flow.color }} />
                <span className="wt-flow-item-name">Flow {i + 1}</span>
                <span className="wt-flow-item-count">{flow.points.length} pts</span>
              </div>
              <button
                className="wt-flow-item-delete"
                onClick={(e) => { e.stopPropagation(); onDeleteFlow(i); }}
                title="Hapus flow"
              >
                🗑
              </button>
            </div>
          ))
        )}
      </div>

      {/* Active flow settings */}
      {activeFlow && (
        <div className="wt-flow-settings">
          <div className="wt-flow-settings-title">PENGATURAN FLOW {activeFlowIdx + 1}</div>



          {/* Coordinate table */}
          <div className="wt-flow-coord-table">
            <div className="wt-flow-coord-table-header">
              <span>#</span><span>X</span><span>Y</span>
            </div>
            {activeFlow.points.map((p, pIdx) => (
              <div key={pIdx} className="wt-flow-coord-row">
                <span className="wt-flow-coord-idx">{pIdx + 1}</span>
                <span className="wt-flow-coord-val">{p.x}</span>
                <span className="wt-flow-coord-val">{p.y}</span>
              </div>
            ))}
          </div>



          {/* Generate code */}
          <div className="wt-flow-code-section">
            <div className="wt-flow-code-actions">
              <button className="wt-flow-gen-btn" onClick={() => setShowCode(!showCode)}>
                {showCode ? "Sembunyikan Kode" : "📋 Generate Code"}
              </button>
              {showCode && (
                <div className="wt-flow-code-target-btns">
                  <button className={codeTarget === "single" ? "active" : ""} onClick={() => setCodeTarget("single")}>Aktif</button>
                  <button className={codeTarget === "all" ? "active" : ""} onClick={() => setCodeTarget("all")}>Semua</button>
                </div>
              )}
            </div>
            {showCode && (
              <div className="wt-flow-code-box">
                <div className="wt-flow-code-header">
                  <span>JSX Output</span>
                  <button className="wt-flow-copy-btn" onClick={handleCopy}>
                    {copied ? "✓ Disalin!" : "Salin"}
                  </button>
                </div>
                <pre className="wt-flow-code-content">{generatedCode}</pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
