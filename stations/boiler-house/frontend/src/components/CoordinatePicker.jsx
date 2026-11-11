import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import "./CoordinatePicker.css";

/* ================================================================
   Active Mode Banner — floating pill at top of canvas
   ================================================================ */
export function PickerBanner({ pinCount, isPathMode }) {
  return (
    <div className="som-coord-picker-banner">
      <div className="som-coord-picker-banner-dot" />
      <span className="som-coord-picker-banner-text">
        {isPathMode ? "Pipe Editor Active" : "Picker Mode"}
      </span>
      <span className="som-coord-picker-banner-key">P</span>
      <span className="som-coord-picker-banner-hint">
        {isPathMode
          ? "Drag points to bend · Click line to add point · Right-click to delete"
          : "Click to pin · Drag to move · Right-click to delete"}
      </span>
    </div>
  );
}

/* ================================================================
   Crosshair Overlay — displays coordinates at cursor
   ================================================================ */
export function CrosshairOverlay({ coords }) {
  if (!coords) return null;
  return (
    <g style={{ pointerEvents: "none" }}>
      <line
        x1={0}
        y1={coords.y}
        x2="100%"
        y2={coords.y}
        stroke="rgba(255, 255, 255, 0.5)"
        strokeWidth="1"
        strokeDasharray="5,5"
      />
      <line
        x1={coords.x}
        y1={0}
        x2={coords.x}
        y2="100%"
        stroke="rgba(255, 255, 255, 0.5)"
        strokeWidth="1"
        strokeDasharray="5,5"
      />
      <circle cx={coords.x} cy={coords.y} r="5" fill="red" />
      <text
        x={coords.x + 10}
        y={coords.y - 10}
        fill="white"
        fontSize="12"
        style={{ textShadow: "1px 1px 2px black" }}
      >
        X: {coords.x}, Y: {coords.y}
      </text>
    </g>
  );
}

/* ================================================================
   Visual Path Editor — The "Live" Pipe being edited
   ================================================================ */
export function InteractivePath({
  points,
  radius,
  isActive,
  onPointDrag,
  onAddPoint,
  onPointDelete,
  onSelect,
  isPickerMode = true,
}) {
  if (points.length === 0) return null;

  const d = calculatePipePath(points, radius);

  return (
    <g
      className={`som-path-editor-group ${isActive ? "active" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      style={{ cursor: !isPickerMode || isActive ? "default" : "pointer" }}
    >
      {/* The actual pipe preview */}
      <path d={d} className="som-path-preview-bg" />
      <path d={d} className="som-path-preview-outline" />
      <path d={d} className="som-path-preview-flow">
        <animate
          attributeName="stroke-dashoffset"
          values="0;-28"
          dur="1.2s"
          repeatCount="indefinite"
        />
      </path>

      {/* Interactive Handles */}
      {isActive &&
        points.map((p, i) => (
          <g key={i} className="som-path-handle-group">
            {/* Hitbox for adding midpoints */}
            {i < points.length - 1 && (
              <line
                x1={p.x}
                y1={p.y}
                x2={points[i + 1].x}
                y2={points[i + 1].y}
                className="som-path-segment-hitbox"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  const svg = e.currentTarget.closest("svg");
                  const pt = svg.createSVGPoint();
                  pt.x = e.clientX;
                  pt.y = e.clientY;
                  const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
                  onAddPoint(i + 1, Math.round(svgP.x), Math.round(svgP.y));
                }}
              />
            )}

            <circle
              cx={p.x}
              cy={p.y}
              r={10}
              className="som-path-handle"
              onPointerDown={(e) => {
                e.stopPropagation();
                const svg = e.currentTarget.closest("svg");
                const onMove = (me) => {
                  const pt = svg.createSVGPoint();
                  pt.x = me.clientX;
                  pt.y = me.clientY;
                  const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
                  onPointDrag(i, Math.round(svgP.x), Math.round(svgP.y));
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
                onPointDelete(i);
              }}
            />
            <text x={p.x} y={p.y - 15} className="som-path-handle-label">
              {i + 1}
            </text>
          </g>
        ))}
    </g>
  );
}

/* ================================================================
   Pipe Path Helper — calculates rounded corners
   ================================================================ */
function calculatePipePath(pins, radius = 10) {
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

function generateJSX(pins, flowType, radius = 10) {
  if (pins.length === 0) return "// No data";

  const d = calculatePipePath(pins, radius);
  if (flowType === "water") {
    return `<LiquidFlowSVG
  d="${d}"
  isRunning={true}
  color="#38bdf8"
  thickness={8}
/>`;
  } else if (flowType === "steam") {
    return `<SteamFlowSVG
  d="${d}"
  active={true}
  mode="flowing"
  color="#f59e0b"
  thickness={6}
/>`;
  }
  return "";
}

/* ================================================================
   useCoordinatePicker — Visual Editor Logic
   ================================================================ */
export function useCoordinatePicker() {
  const [isPickerMode, setIsPickerMode] = useState(false);
  const [paths, setPaths] = useState([]);
  const [activePathIndex, setActivePathIndex] = useState(-1);
  const [radius, setRadius] = useState(25);
  const [flowType, setFlowType] = useState("water"); // "water" or "steam"

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === "INPUT") return;
      if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        setIsPickerMode((v) => !v);
      }
      if (e.key === "Escape") setIsPickerMode(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const addNewPath = useCallback((x, y) => {
    const newPath = [
      { x: x - 100, y: y },
      { x: x + 100, y: y },
    ];
    setPaths((prev) => {
      const next = [...prev, newPath];
      setActivePathIndex(next.length - 1);
      return next;
    });
  }, []);

  const updatePoint = useCallback((pathIdx, ptIdx, x, y) => {
    setPaths((prev) => {
      const next = [...prev];
      next[pathIdx] = [...next[pathIdx]];
      next[pathIdx][ptIdx] = { ...next[pathIdx][ptIdx], x, y };
      return next;
    });
  }, []);

  const addPointToPath = useCallback((pathIdx, insertIdx, x, y) => {
    setPaths((prev) => {
      const next = [...prev];
      next[pathIdx] = [...next[pathIdx]];
      next[pathIdx].splice(insertIdx, 0, { x, y });
      return next;
    });
  }, []);

  const deletePoint = useCallback((pathIdx, ptIdx) => {
    setPaths((prev) => {
      const next = [...prev];
      next[pathIdx] = next[pathIdx].filter((_, i) => i !== ptIdx);
      if (next[pathIdx].length < 2) {
        const filtered = next.filter((_, i) => i !== pathIdx);
        setActivePathIndex(-1);
        return filtered;
      }
      return next;
    });
  }, []);

  return {
    isPickerMode,
    isPathMode: paths.length > 0,
    paths,
    activePathIndex,
    setActivePathIndex,
    addNewPath,
    updatePoint,
    addPointToPath,
    deletePoint,
    radius,
    setRadius,
    flowType,
    setFlowType,
  };
}

/* ================================================================
   Side Panel
   ================================================================ */
export function CoordinatePanel({
  paths,
  activePathIndex,
  onSelectPath,
  onAddNewPath,
  onUpdatePoint,
  onAddPoint,
  onDeletePoint,
  radius,
  setRadius,
  flowType,
  setFlowType,
}) {
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [panelPos, setPanelPos] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const activePath = paths[activePathIndex];
  const generatedCode = useMemo(() => {
    if (!activePath) return "// Pilih atau buat pipa baru";
    return generateJSX(activePath, flowType, radius);
  }, [activePath, flowType, radius]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handlePointerDown = (e) => {
    isDragging.current = true;
    dragStart.current = {
      x: e.clientX - panelPos.x,
      y: e.clientY - panelPos.y,
    };
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging.current) return;
    setPanelPos({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handlePointerUp = (e) => {
    isDragging.current = false;
    e.target.releasePointerCapture(e.pointerId);
  };

  return (
    <div
      className="som-coord-picker-panel visual-editor"
      style={{ transform: `translate(${panelPos.x}px, ${panelPos.y}px)` }}
    >
      <div
        className="som-coord-picker-panel-header"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{ cursor: isDragging.current ? "grabbing" : "grab" }}
      >
        <span className="som-coord-picker-panel-title">Visual Pipe Editor</span>
        <button
          className="som-add-path-btn"
          onClick={(e) => {
            e.stopPropagation();
            onAddNewPath(1000, 500);
          }}
        >
          + New Pipe
        </button>
      </div>

      <div className="som-path-list">
        {paths.length === 0 ? (
          <div className="som-path-empty">Klik "+ New Pipe" untuk mulai</div>
        ) : (
          paths.map((p, i) => (
            <div
              key={i}
              className={`som-path-item ${i === activePathIndex ? "active" : ""}`}
              onClick={() => onSelectPath(i)}
            >
              <span>Pipe {i + 1}</span>
              <small>{p.length} points</small>
            </div>
          ))
        )}
      </div>

      {activePath && (
        <div className="som-path-controls">
          <div className="som-radius-box">
            <label>Flow Type</label>
            <div className="som-flow-type-selector">
              <button
                className={`som-flow-type-btn ${flowType === "water" ? "active" : ""}`}
                onClick={() => setFlowType("water")}
              >
                Water
              </button>
              <button
                className={`som-flow-type-btn ${flowType === "steam" ? "active" : ""}`}
                onClick={() => setFlowType("steam")}
              >
                Steam
              </button>
            </div>
          </div>

          <div className="som-radius-box">
            <label>Smoothness: {radius}px</label>
            <input
              type="range"
              min="0"
              max="150"
              value={radius}
              onChange={(e) => setRadius(parseInt(e.target.value))}
            />
          </div>

          <button
            className="som-coord-picker-btn som-coord-picker-btn-primary"
            onClick={() => setShowCode(!showCode)}
          >
            {showCode ? "Hide Code" : "Generate Code"}
          </button>
        </div>
      )}

      {showCode && activePath && (
        <div className="som-coord-picker-code-box">
          <div className="som-coord-picker-code-header">
            <span>SVG JSX</span>
            <button className="som-coord-picker-copy-btn" onClick={handleCopy}>
              {copied ? "✓ Copied" : "Copy"}
            </button>
          </div>
          <div className="som-coord-picker-code-content">
            <pre>{generatedCode}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
