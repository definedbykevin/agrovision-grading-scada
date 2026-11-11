import React, { useRef } from 'react';
import waterDilutionImgUrl from '../../assets/waterdilution.webp';
import { LiquidFlowSVG } from "../../components/Flows.jsx";
import { WTFlowOverlay } from "../../components/WTFlowBuilder.jsx";
import waterGif from '../../assets/water.gif';

export default function WaterDilutionTab({
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
            viewBox="1550 -30 720 375"
            className="station-svg-canvas"
            preserveAspectRatio="xMidYMid meet"
        >
            <image
                href={waterDilutionImgUrl}
                width="720"
                height="375"
                x="1550"
                y="-30"
                className="som-station-bg-image"
            />

            {/* User requested flow graphic (empty for now, use Flow Builder to add) */}
            {parseFloat(lv('flow', 'FLOW', '0')) > 0 && parseFloat(lv('vcv', 'CV', '0')) < 1 && (
                <LiquidFlowSVG
                    d="M 1966,303 L 1873,305"
                    isRunning={true}
                    color="#f59e0b"
                    thickness={12}
                />
            )}
            {parseFloat(lv('flow', 'FLOW', '0')) > 0 && parseFloat(lv('vcv', 'CV', '0')) >= 1 && (
                <LiquidFlowSVG
                    d="M 1966,305 L 1733,307 Q 1715,307 1715,289 L 1717,105 Q 1717,87 1699,87 L 1550,86"
                    isRunning={true}
                    color="#f59e0b"
                    thickness={12}
                />
            )}

            {/* WATER TANK (NORMAL WATER) */}
            <image
                href={waterGif}
                x="1980"
                y="-14"
                width="217"
                height="122"
                preserveAspectRatio="none"
                opacity="0.8"
            />

            {/* CONDENSATE TANK (TINT BROWN) */}
            <image
                href={waterGif}
                x="1980"
                y="200"
                width="217"
                height="123"
                preserveAspectRatio="none"
                opacity="0.9"
                filter="url(#tint-brown)"
            />

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
