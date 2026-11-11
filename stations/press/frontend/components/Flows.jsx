import React from 'react';

export const LiquidFlowSVG = ({
  d,
  points,
  isRunning,
  mode = "liquid",
  flowing = true,
  color = "#38bdf8",
  dotColor,
  thickness = 8,
}) => {
  if (!isRunning) return null;

  const pathD = d || (points ? `M ${points}` : "");
  if (!pathD) return null;

  return (
    <g style={{ pointerEvents: "none" }}>
      {/* 1. Outer Glow */}
      <path
        d={pathD}
        className="oc-water-path-base"
        style={{
          stroke: color,
          strokeWidth: `${thickness + Math.min(12, thickness * 0.8)}px`,
          filter: `blur(${Math.min(6, thickness * 0.4)}px)`,
          opacity: 0.4,
        }}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 2. Inner Rim */}
      <path
        d={pathD}
        className="oc-water-path-base"
        style={{
          stroke: color,
          strokeWidth: `${thickness + Math.min(2, thickness * 0.2)}px`,
          filter: `blur(${Math.min(3, thickness * 0.2)}px)`,
          opacity: 0.6,
        }}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 3. Core */}
      <path
        d={pathD}
        className="oc-water-path-stream"
        style={{
          stroke: color,
          strokeWidth: `${Math.max(thickness * 0.7, 1)}px`,
          filter: `blur(${thickness < 8 ? 0 : 1.5}px) drop-shadow(0px 0px 5px rgba(0,0,0,0.7))`,
          opacity: 1,
        }}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 4. Surface Highlight / Dotted */}
      <path
        d={pathD}
        className={
          mode === "dotted" ? "oc-water-path-dotted" : "oc-water-path-highlight"
        }
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          animationPlayState: flowing ? "running" : "paused",
          strokeWidth: `${Math.max(2.5, thickness / 6)}px`,
          ...(dotColor ? { stroke: dotColor } : {})
        }}
      />
    </g>
  );
};

export const WaterFlowSVG = ({ d, points, isRunning }) => (
  <LiquidFlowSVG d={d} points={points} isRunning={isRunning} color="#38bdf8" thickness={15} />
);

export const SteamFlowSVG = ({ d, points, active, isRunning, mode = "flowing", color = "#f59e0b", thickness = 2 }) => {
  const isActive = active !== undefined ? active : isRunning;
  if (!isActive) return null;

  const pathD = d || (points ? `M ${points}` : "");
  if (!pathD) return null;

  let modeClass = "steam-flow--flowing";
  if (mode === "standby") modeClass = "steam-flow--standby";
  if (mode === "liquid") modeClass = "steam-flow--liquid";

  return (
    <g className={modeClass} style={{ pointerEvents: "none", '--base-thickness': `${thickness}px`, '--base-blur': `${Math.max(1, thickness * 0.8)}px` }}>
      <path
        d={pathD}
        fill="none"
        stroke={color}
        className="steam-flow-glow"
        pointerEvents="none"
      />
      <path
        d={pathD}
        fill="none"
        stroke={color}
        className="steam-flow-aura"
        pointerEvents="none"
      />
    </g>
  );
};
