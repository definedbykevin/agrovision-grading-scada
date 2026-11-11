import React, { useRef, useState, useEffect } from 'react';
import digesterPressImgUrl from '../../assets/digester&press.webp';
import { LiquidFlowSVG, SteamFlowSVG } from "../../components/Flows.jsx";
import { WTFlowOverlay } from "../../components/WTFlowBuilder.jsx";

export default function DigesterPressTab({
    viewMode,
    pressStatus,
    configMode,
    handleEquipmentClick,
    lv,
    getTag,
    flowBuilder
}) {
    const svgRef = useRef(null);

    return (
        <svg
            ref={svgRef}
            viewBox="-350 -30 2000 1042"
            className="station-svg-canvas"
            preserveAspectRatio="xMidYMid meet"
        >
            <image
                href={digesterPressImgUrl}
                width="2000"
                height="1042"
                x="-350"
                y="-30"
                className="som-station-bg-image"
            />
            {/* MAIN DILUTION FLOW (Always on) */}
            {true && (
                <LiquidFlowSVG
                    d="M 1647,294 L -276,296"
                    isRunning={true}
                    color="#f59e0b"
                    thickness={8}
                />
            )}
            
            {/* DILUTION FLOW DIGESTER 1 */}
            {true && (
                <LiquidFlowSVG
                    d={parseFloat(lv('prs1', 'AMP', '0')) > 1 ? "M -123,313 L -120,570 L -121,586 L -110,596" : "M -123,307 L -123,423"}
                    isRunning={true}
                    flowing={parseFloat(lv('prs1', 'AMP', '0')) > 1}
                    color="#f59e0b"
                    thickness={8}
                />
            )}

            {/* DILUTION FLOW DIGESTER 2 */}
            {true && (
                <LiquidFlowSVG
                    d={parseFloat(lv('prs2', 'AMP', '0')) > 1 ? "M 376,307 L 375,564 L 376,586 L 392,596" : "M 377,307 L 376,423"}
                    isRunning={true}
                    flowing={parseFloat(lv('prs2', 'AMP', '0')) > 1}
                    color="#f59e0b"
                    thickness={8}
                />
            )}

            {/* DILUTION FLOW DIGESTER 3 */}
            {true && (
                <LiquidFlowSVG
                    d={parseFloat(lv('prs3', 'AMP', '0')) > 1 ? "M 879,310 L 879,579 L 882,592 L 892,596" : "M 878,310 L 878,421"}
                    isRunning={true}
                    flowing={parseFloat(lv('prs3', 'AMP', '0')) > 1}
                    color="#f59e0b"
                    thickness={8}
                />
            )}

            {/* DILUTION FLOW DIGESTER 4 */}
            {true && (
                <LiquidFlowSVG
                    d={parseFloat(lv('prs4', 'AMP', '0')) > 1 ? "M 1377,308 L 1378,574 L 1379,589 L 1389,597" : "M 1374,308 L 1375,423"}
                    isRunning={true}
                    flowing={parseFloat(lv('prs4', 'AMP', '0')) > 1}
                    color="#f59e0b"
                    thickness={8}
                />
            )}


            {true && (
  <SteamFlowSVG
    d="M 1644,234 L 1595,235"
    active={true}
    mode="flowing"
    color="#a9dbe1ff"
    thickness={6}
  />
)}
{true && (
  <SteamFlowSVG
    d="M 1416,234 L 1102,235"
    active={true}
    mode="flowing"
    color="#a9dbe1ff"
    thickness={6}
  />
)}
{true && (
  <SteamFlowSVG
    d="M 916,234 L 601,234"
    active={true}
    mode="flowing"
    color="#a9dbe1ff"
    thickness={6}
  />
)}
{true && (
  <SteamFlowSVG
    d="M 416,232 L 99,232"
    active={true}
    mode="flowing"
    color="#a9dbe1ff"
    thickness={6}
  />
)}
{true && (
  <SteamFlowSVG
    d="M -93,233 L -269,234"
    active={true}
    mode="flowing"
    color="#a9dbe1ff"
    thickness={6}
  />
)}
{/* STEAM FLOW DIGESTER 1 */}
{true && (
  <SteamFlowSVG
    d={parseFloat(lv('tc1', 'CV', '0')) > 0 ? "M 109,241 L 109,464 Q 109,476 98,477 L 86,478" : "M 112,255 L 111,379"}
    active={true}
    mode={parseFloat(lv('tc1', 'CV', '0')) > 0 ? "flowing" : "standby"}
    color="#a9dbe1ff"
    thickness={6}
  />
)}

{/* STEAM FLOW DIGESTER 2 */}
{true && (
  <SteamFlowSVG
    d={parseFloat(lv('tc2', 'CV', '0')) > 0 ? "M 603,250 L 601,452 Q 601,465 591,473 L 581,481" : "M 603,246 L 603,378"}
    active={true}
    mode={parseFloat(lv('tc2', 'CV', '0')) > 0 ? "flowing" : "standby"}
    color="#a9dbe1ff"
    thickness={6}
  />
)}

{/* STEAM FLOW DIGESTER 3 */}
{true && (
  <SteamFlowSVG
    d={parseFloat(lv('tc3', 'CV', '0')) > 0 ? "M 1104,250 L 1104,452 Q 1104,464 1096,473 L 1088,481" : "M 1103,248 L 1102,378"}
    active={true}
    mode={parseFloat(lv('tc3', 'CV', '0')) > 0 ? "flowing" : "standby"}
    color="#a9dbe1ff"
    thickness={6}
  />
)}

{/* STEAM FLOW DIGESTER 4 */}
{true && (
  <SteamFlowSVG
    d={parseFloat(lv('tc4', 'CV', '0')) > 0 ? "M 1602,251 L 1601,452 Q 1601,464 1591,472 L 1581,479" : "M 1599,244 L 1599,378"}
    active={true}
    mode={parseFloat(lv('tc4', 'CV', '0')) > 0 ? "flowing" : "standby"}
    color="#a9dbe1ff"
    thickness={6}
  />
)}

            {/* CRUDE OIL FLOW PRESS 1 */}
            {true && (
                <LiquidFlowSVG
                    d={parseFloat(lv('dc1', 'CV', '0')) > 0 ? "M 5,680 L 4,860 Q 4,878 -14,878 L -345,881" : "M 3,673 L 3,709"}
                    isRunning={true}
                    flowing={parseFloat(lv('dc1', 'CV', '0')) > 0}
                    color="#f59e0b"
                    thickness={8}
                />
            )}

            {/* CRUDE OIL FLOW PRESS 2 */}
            {true && (
                <LiquidFlowSVG
                    d={parseFloat(lv('dc2', 'CV', '0')) > 0 ? "M 504,680 L 503,861 Q 503,879 485,879 L -343,880" : "M 500,673 L 502,709"}
                    isRunning={true}
                    flowing={parseFloat(lv('dc2', 'CV', '0')) > 0}
                    color="#f59e0b"
                    thickness={8}
                />
            )}

            {/* CRUDE OIL FLOW PRESS 3 */}
            {true && (
                <LiquidFlowSVG
                    d={parseFloat(lv('dc3', 'CV', '0')) > 0 ? "M 1004,681 L 1003,861 Q 1003,879 985,879 L -349,880" : "M 1002,673 L 1002,709"}
                    isRunning={true}
                    flowing={parseFloat(lv('dc3', 'CV', '0')) > 0}
                    color="#f59e0b"
                    thickness={8}
                />
            )}

            {/* CRUDE OIL FLOW PRESS 4 */}
            {true && (
                <LiquidFlowSVG
                    d={parseFloat(lv('dc4', 'CV', '0')) > 0 ? "M 1501,673 L 1501,864 Q 1501,882 1483,882 L -335,880" : "M 1501,673 L 1499,707"}
                    isRunning={true}
                    flowing={parseFloat(lv('dc4', 'CV', '0')) > 0}
                    color="#f59e0b"
                    thickness={8}
                />
            )}
            
            {flowBuilder && (
                <WTFlowOverlay
                    flows={flowBuilder.flows}
                    activeFlowIdx={flowBuilder.activeFlowIdx}
                    isActive={flowBuilder.isActive}
                    isPlacing={flowBuilder.isPlacing}
                    onPointDrag={flowBuilder.updatePoint}
                    onInsertPoint={flowBuilder.insertPoint}
                    onDeletePoint={flowBuilder.deletePoint}
                    onSelectFlow={flowBuilder.setActiveFlowIdx}
                    onCanvasClick={flowBuilder.addPointToActiveFlow}
                />
            )}
        </svg>
    );
}
