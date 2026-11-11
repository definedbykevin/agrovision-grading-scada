import pompaAtasSvg from "../../assets/pompa_atas.svg";
import pompaKananSvg from "../../assets/pompa_kanan.svg";
import motorSvg from "../../assets/motor.svg";
import valveAtasSvg from "../../assets/valve_atas.svg";
import valveKiriSvg from "../../assets/valve_kiri.svg";
import valveKananSvg from "../../assets/valve_kanan.svg";
import pipeVertSvg from "../../assets/pipe_vert.svg";
import pipeHoriSvg from "../../assets/pipe_hori.svg";
import waterGif from "../../assets/water.gif";
import { LiquidFlowSVG } from "../../components/OilClarificationComponents.jsx";
import { EquipmentImageSVG, OCLabelSVG, VibScreenLabel, OCCardSVG, MaintenanceCardSVG } from "../../OilClarificationPage.jsx";

export default function OilClarificationOverviewTab({ viewMode, configMode, handleEquipmentClick, lv }) {
    return (
        <g>

                                        {/* MAIN STEAM PIPE */}
                                        <foreignObject x="40" y="0" width="300" height="100" style={{ overflow: 'visible' }}>
                                            <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
                                                <div
                                                    onClick={() => handleEquipmentClick('main_steam')}
                                                    className={`som-oc-mini-card ${configMode ? 'som-editable' : ''}`}
                                                    style={{ cursor: configMode ? 'pointer' : 'default' }}
                                                >
                                                    <div className="som-oc-mini-header" >
                                                        <span className="som-oc-mini-label" >MAIN STEAM PIPE</span>
                                                        <div className="som-oc-mini-status status-running"></div>
                                                    </div>
                                                    <div
                                                        className="som-oc-mini-body"
                                                        style={{
                                                            flexDirection: "row",
                                                            justifyContent: "center",
                                                            alignItems: "baseline",
                                                            gap: "5px",
                                                        }}
                                                    >
                                                        <span
                                                            className="som-oc-mini-value"
                                                            style={{ fontSize: "20px" }}
                                                        >
                                                            {lv('main_steam', 'MONITOR', '2.6', 2)}
                                                        </span>
                                                        <span
                                                            style={{
                                                                fontSize: "12px",
                                                                fontWeight: "800",
                                                                color: "#94a3b8",
                                                            }}
                                                        >
                                                            Bar
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </foreignObject>

                                        {/* Station Labels */}
                                        <OCLabelSVG x={670} y={150} label={"Sand Trap\nTank"} fontSize="18px" />
                                        <OCLabelSVG x={1180} y={320} label="CST" fontSize="26px" />
                                        <OCLabelSVG x={1486} y={410} label={"Sludge\nTank 1"} fontSize="16px" />
                                        <OCLabelSVG x={1655} y={410} label={"Sludge\nTank 2"} fontSize="16px" />
                                        <OCLabelSVG x={1820} y={410} label="POT" fontSize="16px" />
                                        <VibScreenLabel x={135} y={445} number="1" />
                                        <VibScreenLabel x={274} y={445} number="2" />
                                        <VibScreenLabel x={410} y={445} number="3" />
                                        <VibScreenLabel x={544} y={445} number="4" />

                                        {/* Flowlines */}
                                        <LiquidFlowSVG d="M 31,76 L 597,76" isRunning={true} color="#da8c62ff" thickness={15} />
                                        <LiquidFlowSVG d="M 597,311 L 31,311" isRunning={true} color="#da8c62ff" thickness={15} />
                                        <LiquidFlowSVG d="M 31,594 L 597,594" isRunning={true} color="#da8c62ff" thickness={15} />
                                        <LiquidFlowSVG d="M 585,929 L 587,1006 Q 587,1031 612,1031 L 817,1031" isRunning={true} color="#da8c62ff" thickness={5} />
                                        <LiquidFlowSVG d="M 600,956 L 820,957" isRunning={true} color="#da8c62ff" thickness={5} />
                                        <LiquidFlowSVG d="M 809,888 L 822,889" isRunning={true} color="#da8c62ff" thickness={5} />
                                        <LiquidFlowSVG d="M 808,817 L 823,817" isRunning={true} color="#da8c62ff" thickness={5} />
                                        <LiquidFlowSVG d="M 902,1026 L 927,1026 Q 951,1026 951,1002 L 954,119 Q 954,94 979,93 L 1081,91 Q 1089,91 1094,98 L 1094,98 Q 1098,105 1099,113 L 1101,124" isRunning={true} color="#da8c62ff" thickness={5} />
                                        <LiquidFlowSVG d="M 903,886 L 915,885 Q 926,884 928,873 L 928,871 Q 930,857 930,843 L 928,72 Q 928,47 953,47 L 1804,50 Q 1829,50 1829,75 L 1832,374" isRunning={true} color="#da8c62ff" thickness={5} />
                                        <LiquidFlowSVG d="M 902,957 L 941,956" isRunning={true} color="#da8c62ff" thickness={5} />
                                        <LiquidFlowSVG d="M 1224,242 L 1225,311 Q 1225,336 1250,336 L 1305,336" isRunning={true} color="#da8c62ff" thickness={5} />
                                        <LiquidFlowSVG d="M 1338,291 L 1614,290 Q 1626,290 1638,291 L 1638,291 Q 1649,291 1651,302 L 1654,319" isRunning={true} color="#da8c62ff" thickness={5} />
                                        <LiquidFlowSVG d="M 1325,338 L 1751,336 Q 1769,336 1787,337 L 1787,337 Q 1804,338 1807,355 L 1811,374" isRunning={true} color="#da8c62ff" thickness={5} />
                                        <LiquidFlowSVG d="M 1818,623 L 1819,717 Q 1819,726 1812,731 L 1812,731 Q 1804,736 1795,736 L 1371,739 Q 1346,739 1347,764 L 1348,798 Q 1349,823 1374,823 L 1584,823" isRunning={true} color="#da8c62ff" thickness={5} />
                                        <LiquidFlowSVG d="M 1484,615 L 1485,727" isRunning={true} color="#da8c62ff" thickness={5} />
                                        <LiquidFlowSVG d="M 1655,613 L 1655,729" isRunning={true} color="#da8c62ff" thickness={5} />
                                        <LiquidFlowSVG d="M 1602,1000 L 1604,1010 Q 1605,1018 1612,1022 L 1612,1022 Q 1619,1026 1627,1026 L 1893,1027" isRunning={true} color="#da8c62ff" thickness={5} />
                                        <LiquidFlowSVG d="M 1643,823 L 1669,822" isRunning={true} color="#da8c62ff" thickness={5} />
                                        <LiquidFlowSVG d="M 136,326 L 137,410" isRunning={true} color="#da8c62ff" thickness={15} />
                                        <LiquidFlowSVG d="M 276,327 L 276,409" isRunning={true} color="#da8c62ff" thickness={15} />
                                        <LiquidFlowSVG d="M 407,326 L 407,409" isRunning={true} color="#da8c62ff" thickness={15} />
                                        <LiquidFlowSVG d="M 547,331 L 547,410" isRunning={true} color="#da8c62ff" thickness={15} />
                                        <LiquidFlowSVG d="M 1315,254 L 1314,502 Q 1314,512 1308,520 L 1301,528" isRunning={true} color="#da8c62ff" thickness={5} />
                                        <LiquidFlowSVG d="M 1483,303 L 1483,322" isRunning={true} color="#da8c62ff" thickness={5} />
                                        <LiquidFlowSVG d="M 1653,350 L 1653,376" isRunning={true} color="#da8c62ff" thickness={5} />
                                        <LiquidFlowSVG d="M 71,616 L 70,705" isRunning={true} color="#da8c62ff" thickness={15} />
                                        <LiquidFlowSVG d="M 894,818 L 918,817" isRunning={true} color="#da8c62ff" thickness={5} />

                                        {/* Equipment Cards */}
                                        {viewMode === "process" ? (
                                            <g>
                                                <OCCardSVG isEditable={configMode} onClick={handleEquipmentClick} id="sandtrap" x={668} y={275} label="Sand Trap" values={[{ label: "Temp", value: "75", unit: "°C", type: "temp" }]} status="BLOWDOWN" isRunning={true} />
                                                <OCCardSVG isEditable={configMode} onClick={handleEquipmentClick} id="vibScreen1" x={136} y={555} label="Vibration Screen 1" values={[{ label: "Ampere", value: "100" }]} isRunning={true} />
                                                <OCCardSVG isEditable={configMode} onClick={handleEquipmentClick} id="vibScreen2" x={270} y={555} label="Vibration Screen 2" values={[{ label: "Ampere", value: "100" }]} />
                                                <OCCardSVG isEditable={configMode} onClick={handleEquipmentClick} id="vibScreen3" x={410} y={555} label="Vibration Screen 3" values={[{ label: "Ampere", value: "100" }]} />
                                                <OCCardSVG isEditable={configMode} onClick={handleEquipmentClick} id="vibScreen4" x={547} y={555} label="Vibration Screen 4" values={[{ label: "Ampere", value: "100" }]} />
                                                <OCCardSVG isEditable={configMode} onClick={handleEquipmentClick} id="cst" x={1200} y={430} label="CST Tank" values={[{ label: "Temp", value: "90", unit: "°C", type: "temp" }, { label: "Level", value: "311", unit: "mm" }, { label: "Steam", value: "30", unit: "%" }]} status="SKIMMER RUN" isRunning={true} />
                                                <OCCardSVG isEditable={configMode} onClick={handleEquipmentClick} id="sludge1" x={1497} y={518} label="Sludge Tank 1" values={[{ label: "Temp", value: "90", unit: "°C", type: "temp" }, { label: "Level", value: "311", unit: "mm" }, { label: "Steam", value: "30", unit: "%" }]} />
                                                <OCCardSVG isEditable={configMode} onClick={handleEquipmentClick} id="sludge2" x={1665} y={518} label="Sludge Tank 2" values={[{ label: "Temp", value: "90", unit: "°C", type: "temp" }, { label: "Level", value: "311", unit: "mm" }, { label: "Steam", value: "30", unit: "%" }]} isRunning={true} />
                                                <OCCardSVG isEditable={configMode} onClick={handleEquipmentClick} id="pot" x={1832} y={518} label="POT" values={[{ label: "Temp", value: "90", unit: "°C", type: "temp" }, { label: "Level", value: "311", unit: "mm" }, { label: "Steam", value: "30", unit: "%" }]} isRunning={true} />
                                                <OCCardSVG isEditable={configMode} onClick={handleEquipmentClick} id="strainer1" x={1500} y={930} label="Brush Strainer 1" status="RUNNING" isRunning={true} scale={1.4} />
                                                <OCCardSVG isEditable={configMode} onClick={handleEquipmentClick} id="strainer2" x={1820} y={930} label="Brush Strainer 2" status="STANDBY" isRunning={false} scale={1.4} />
                                            </g>
                                        ) : (
                                            <g>
                                                <MaintenanceCardSVG isEditable={configMode} x={605} y={280} id="m-sandtrap" label="M-SAND_TRAP" params={[{ label: "TEMP", value: "75.2", unit: "°C" }, { label: "VIB", value: "0.3", unit: "mm/s" }]} onClick={handleEquipmentClick} />
                                                <MaintenanceCardSVG isEditable={configMode} x={1240} y={425} id="m-cst" label="M-CST_TANK" params={[{ label: "TEMP", value: "90.1", unit: "°C" }, { label: "LEVEL", value: "311", unit: "mm" }, { label: "VIB", value: "0.5", unit: "mm/s" }]} onClick={handleEquipmentClick} />
                                                <MaintenanceCardSVG isEditable={configMode} x={1633} y={535} id="m-sludge1" label="M-SLUDGE_1" params={[{ label: "TEMP", value: "89.8", unit: "°C" }, { label: "LEVEL", value: "311", unit: "mm" }]} onClick={handleEquipmentClick} />
                                                <MaintenanceCardSVG isEditable={configMode} x={1848} y={535} id="m-sludge2" label="M-SLUDGE_2" params={[{ label: "TEMP", value: "90.2", unit: "°C" }, { label: "LEVEL", value: "311", unit: "mm" }]} onClick={handleEquipmentClick} />
                                                <MaintenanceCardSVG isEditable={configMode} x={2054} y={535} id="m-pot" label="M-POT_TANK" params={[{ label: "TEMP", value: "90.0", unit: "°C" }, { label: "LEVEL", value: "311", unit: "mm" }]} onClick={handleEquipmentClick} />
                                                <MaintenanceCardSVG isEditable={configMode} x={1670} y={930} id="m-strainer1" label="M-BRUSH_1" params={[{ label: "AMP", value: "4.2", unit: "A" }, { label: "VIB", value: "1.2", unit: "mm/s" }]} onClick={handleEquipmentClick} />
                                                <MaintenanceCardSVG isEditable={configMode} x={2010} y={930} id="m-strainer2" label="M-BRUSH_2" params={[{ label: "AMP", value: "0.0", unit: "A" }, { label: "VIB", value: "0.0", unit: "mm/s" }]} onClick={handleEquipmentClick} />
                                            </g>
                                        )}

                                        {/* Water GIF animation */}
                                        <foreignObject x={31} y={681} width={630} height={228} style={{ pointerEvents: "none", overflow: "visible" }}>
                                            <img src={waterGif} style={{ width: "100%", height: "100%", objectFit: "fill", opacity: 0.8, filter: "sepia(1) hue-rotate(330deg) saturate(1.5) brightness(0.8)" }} />
                                        </foreignObject>

                                        {/* Equipment Icons */}
                                        <EquipmentImageSVG src={pompaKananSvg} x={814} y={761} width={84} height={110} preserveAspect={false} isRunning={true} />
                                        <EquipmentImageSVG src={pompaKananSvg} x={814} y={833} width={84} height={110} preserveAspect={false} isRunning={true} />
                                        <EquipmentImageSVG src={pompaKananSvg} x={814} y={903} width={84} height={110} preserveAspect={false} isRunning={true} />
                                        <EquipmentImageSVG src={pompaKananSvg} x={814} y={973} width={84} height={110} preserveAspect={false} isRunning={true} />
                                        <EquipmentImageSVG src={valveKananSvg} x={118} y={526} width={70} height={70} preserveAspect={false} isRunning={true} />
                                        <EquipmentImageSVG src={valveKananSvg} x={255} y={526} width={70} height={70} preserveAspect={false} isRunning={true} />
                                        <EquipmentImageSVG src={valveKananSvg} x={393} y={526} width={70} height={70} preserveAspect={false} isRunning={true} />
                                        <EquipmentImageSVG src={valveKananSvg} x={530} y={526} width={70} height={70} preserveAspect={false} isRunning={true} />
                                        <EquipmentImageSVG src={valveAtasSvg} x={705} y={390} width={75} height={75} preserveAspect={false} isRunning={true} />
                                        <EquipmentImageSVG src={valveAtasSvg} x={949} y={501} width={75} height={75} preserveAspect={false} isRunning={true} />
                                        <EquipmentImageSVG src={valveAtasSvg} x={1041} y={735} width={75} height={75} preserveAspect={false} isRunning={true} />
                                        <EquipmentImageSVG src={valveKiriSvg} x={1425} y={635} width={75} height={75} preserveAspect={false} isRunning={true} />
                                        <EquipmentImageSVG src={valveKiriSvg} x={1595} y={635} width={75} height={75} preserveAspect={false} isRunning={true} />
                                        <EquipmentImageSVG src={valveKiriSvg} x={1759} y={635} width={75} height={75} preserveAspect={false} isRunning={true} />
        </g>
    );
}
