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

export default function OilRecoveryTab({ viewMode, configMode, handleEquipmentClick, lv }) {
    return (
        <g>
            <OCLabelSVG x={360} y={105} label={"Liquor\nDistribution Tank"} fontSize="15px" hasOutline={true} />
            <OCLabelSVG x={1250} y={180} label="Sludge Holding Tank" fontSize="22px" />
            <OCLabelSVG x={860} y={816} label="Light Phase Pump" fontSize="20px" hasOutline={true} />
            <OCLabelSVG x={670} y={1000} label="Heavy Phase Pump" fontSize="20px" hasOutline={true} />
            <OCLabelSVG x={1260} y={1070} label="Separator 1" fontSize="20px" hasOutline={true} />
            <OCLabelSVG x={1430} y={1070} label="Separator 2" fontSize="20px" hasOutline={true} />
            <OCLabelSVG x={1598} y={1070} label="Separator 3" fontSize="20px" hasOutline={true} />
            <OCLabelSVG x={1780} y={1070} label="Separator 4" fontSize="20px" hasOutline={true} />

            <LiquidFlowSVG d="M 12,986 L 35,987" isRunning={true} color="#da8c62ff" thickness={7} />
            <LiquidFlowSVG d="M 67,937 L 68,603 Q 68,589 82,588 L 95,587" isRunning={true} color="#da8c62ff" thickness={7} />
            <LiquidFlowSVG d="M 112,562 L 111,62 Q 111,37 136,38 L 201,40 Q 217,40 223,55 L 228,69" isRunning={true} color="#da8c62ff" thickness={7} />
            <LiquidFlowSVG d="M 177,991 L 172,979 Q 166,966 166,952 L 166,124" isRunning={true} color="#da8c62ff" thickness={7} />
            <LiquidFlowSVG d="M 208,932 L 206,604 Q 206,588 222,586 L 237,584" isRunning={true} color="#da8c62ff" thickness={7} />
            <LiquidFlowSVG d="M 252,571 L 250,66 Q 250,41 275,40 L 333,39 Q 345,39 350,50 L 355,61" isRunning={true} color="#da8c62ff" thickness={7} />
            <LiquidFlowSVG d="M 412,144 L 423,148 Q 433,151 434,162 L 434,165 Q 435,178 435,192 L 434,725" isRunning={true} color="#da8c62ff" thickness={7} />
            <LiquidFlowSVG d="M 441,829 L 442,929 Q 442,954 467,954 L 607,953" isRunning={true} color="#da8c62ff" thickness={7} />
            <LiquidFlowSVG d="M 442,695 L 494,696 Q 513,696 516,715 L 518,733" isRunning={true} color="#da8c62ff" thickness={7} />
            <LiquidFlowSVG d="M 531,830 L 531,850 Q 531,860 541,863 L 541,863 Q 551,865 561,865 L 607,866" isRunning={true} color="#da8c62ff" thickness={7} />
            <LiquidFlowSVG d="M 716,789 L 724,779 Q 731,768 744,768 L 905,770" isRunning={true} color="#da8c62ff" thickness={7} />
            <LiquidFlowSVG d="M 680,954 L 735,953" isRunning={true} color="#da8c62ff" thickness={7} />
            <LiquidFlowSVG d="M 761,875 L 767,866 Q 773,857 784,857 L 855,858 Q 873,858 879,875 L 885,891" isRunning={true} color="#da8c62ff" thickness={7} />
            <LiquidFlowSVG d="M 1074,928 L 1075,499 Q 1075,485 1063,478 L 1063,478 Q 1051,471 1037,472 L 1001,473 Q 976,474 976,449 L 978,79 Q 978,54 1003,54 L 1111,57 Q 1129,57 1131,75 L 1133,93" isRunning={true} color="#da8c62ff" thickness={7} />
            <LiquidFlowSVG d="M 1302,398 L 1163,398 Q 1138,398 1138,423 L 1138,581 Q 1138,606 1163,606 L 1870,607" isRunning={true} color="#da8c62ff" thickness={7} />
            <LiquidFlowSVG d="M 1254,793 L 1286,791 Q 1311,790 1311,765 L 1312,725" isRunning={true} color="#da8c62ff" thickness={7} />
            <LiquidFlowSVG d="M 1279,707 L 1907,708" isRunning={true} color="#da8c62ff" thickness={7} />
            <LiquidFlowSVG d="M 1245,614 L 1244,825" isRunning={true} color="#da8c62ff" thickness={7} />
            <LiquidFlowSVG d="M 1253,825 L 1911,827" isRunning={true} color="#da8c62ff" thickness={7} />
            <LiquidFlowSVG d="M 1423,612 L 1424,699" isRunning={true} color="#da8c62ff" thickness={7} />
            <LiquidFlowSVG d="M 1608,615 L 1607,699" isRunning={true} color="#da8c62ff" thickness={7} />
            <LiquidFlowSVG d="M 1423,714 L 1423,814" isRunning={true} color="#da8c62ff" thickness={7} />
            <LiquidFlowSVG d="M 1606,717 L 1607,818" isRunning={true} color="#da8c62ff" thickness={7} />
            <LiquidFlowSVG d="M 1790,718 L 1789,820" isRunning={true} color="#da8c62ff" thickness={7} />
            <LiquidFlowSVG d="M 1227,1026 L 1232,1033 Q 1236,1039 1244,1039 L 1909,1042" isRunning={true} color="#da8c62ff" thickness={7} />
            <LiquidFlowSVG d="M 673,864 L 699,864" isRunning={true} color="#da8c62ff" thickness={7} />
            <LiquidFlowSVG d="M 1435,789 L 1460,790 Q 1484,791 1485,766 L 1486,724" isRunning={true} color="#da8c62ff" thickness={7} />
            <LiquidFlowSVG d="M 1617,790 L 1644,787 Q 1669,785 1671,760 L 1673,722" isRunning={true} color="#da8c62ff" thickness={7} />
            <LiquidFlowSVG d="M 1802,795 L 1828,791 Q 1853,788 1852,763 L 1851,725" isRunning={true} color="#da8c62ff" thickness={7} />
            <LiquidFlowSVG d="M 1790,622 L 1791,697" isRunning={true} color="#da8c62ff" thickness={7} />

            {viewMode === "process" ? (
                <g>
                    <OCCardSVG x={540} y={150} label="Dist. Tank" values={[{ label: "Temp", value: "92", unit: "°C", type: "temp" }, { label: "T1 Level", value: "90", unit: "%" }, { label: "T2 Level", value: "60", unit: "%" }]} isRunning={true} onClick={() => handleEquipmentClick("dist_tank")} />
                    <OCCardSVG x={120} y={330} label="Line 1" values={[{ label: "Press", value: "0.45", unit: "bar" }, { label: "Temp", value: "75", unit: "°C", type: "temp" }]} status="STEAM IN" onClick={() => handleEquipmentClick("line1")} />
                    <OCCardSVG x={470} y={330} label="Line 2" values={[{ label: "Press", value: "0.55", unit: "bar" }, { label: "Temp", value: "75", unit: "°C", type: "temp" }]} status="STEAM IN" onClick={() => handleEquipmentClick("line2")} />
                    <OCCardSVG x={314} y={1016} label="Decanter" values={[{ label: "Flushing", value: "OFF", unit: "" }]} status="RUNNING" isRunning={true} onClick={() => handleEquipmentClick("decanter")} />
                    <OCCardSVG x={1260} y={280} label="Sludge Tank" values={[{ label: "Temp", value: "90", unit: "°C", type: "temp" }, { label: "Level", value: "90", unit: "%" }]} status="STEAM IN" isRunning={true} onClick={() => handleEquipmentClick("sludge_holding")} />
                    <OCCardSVG x={1320} y={925} label="Separator 1" values={[{ label: "Ampere", value: "100", unit: "A" }, { label: "Vibration", value: "0,5", unit: "mm/s" }]} />
                    <OCCardSVG x={1495} y={925} label="Separator 2" values={[{ label: "Ampere", value: "100", unit: "A" }, { label: "Vibration", value: "0,5", unit: "mm/s" }]} />
                    <OCCardSVG x={1680} y={925} label="Separator 3" values={[{ label: "Ampere", value: "100", unit: "A" }, { label: "Vibration", value: "0,5", unit: "mm/s" }]} />
                    <OCCardSVG x={1860} y={925} label="Separator 4" values={[{ label: "Ampere", value: "100", unit: "A" }, { label: "Vibration", value: "0,5", unit: "mm/s" }]} />
                </g>
            ) : (
                <g>
                    <MaintenanceCardSVG x={400} y={240} id="m-distank" label="M-DIST_TANK" params={[{ label: "TEMP", value: "92.1", unit: "°C" }, { label: "LEVEL", value: "90", unit: "%" }]} onClick={handleEquipmentClick} />
                    <MaintenanceCardSVG x={50} y={330} id="m-line1" label="M-LINE_1" params={[{ label: "PRESS", value: "0.45", unit: "bar" }, { label: "TEMP", value: "75.2", unit: "°C" }]} onClick={handleEquipmentClick} />
                    <MaintenanceCardSVG x={250} y={330} id="m-line2" label="M-LINE_2" params={[{ label: "PRESS", value: "0.55", unit: "bar" }, { label: "TEMP", value: "75.5", unit: "°C" }]} onClick={handleEquipmentClick} />
                    <MaintenanceCardSVG x={231} y={905} id="m-decanter" label="M-DECANTER" params={[{ label: "AMP", value: "32.4", unit: "A" }, { label: "VIB", value: "1.8", unit: "mm/s" }]} onClick={handleEquipmentClick} />
                    <MaintenanceCardSVG x={1660} y={290} id="m-sludge_rec" label="M-HOLD_TANK" params={[{ label: "TEMP", value: "90.1", unit: "°C" }, { label: "LEVEL", value: "90", unit: "%" }]} onClick={handleEquipmentClick} />
                </g>
            )}

            <OCLabelSVG x={500} y={810} label={"Light Phase\nto CST"} fontSize="14px" hasOutline={true} />

            <EquipmentImageSVG src={pompaAtasSvg} x={24} y={935} width={84} height={110} preserveAspect={false} isRunning={true} />
            <EquipmentImageSVG src={pompaAtasSvg} x={165} y={935} width={84} height={110} preserveAspect={false} isRunning={true} />
            <EquipmentImageSVG src={pompaAtasSvg} x={675} y={785} width={84} height={110} preserveAspect={false} isRunning={true} />
            <EquipmentImageSVG src={pompaAtasSvg} x={721} y={871} width={84} height={110} preserveAspect={false} isRunning={true} />
            <EquipmentImageSVG src={motorSvg} x={328} y={715} width={90} height={105} preserveAspect={false} isRunning={true} />
            <EquipmentImageSVG src={valveAtasSvg} x={1466} y={290} width={60} height={60} preserveAspect={false} isRunning={true} />
            <EquipmentImageSVG src={valveKananSvg} x={1233} y={620} width={60} height={60} preserveAspect={false} isRunning={true} />
            <EquipmentImageSVG src={valveKananSvg} x={1412} y={620} width={60} height={60} preserveAspect={false} isRunning={true} />
            <EquipmentImageSVG src={valveKananSvg} x={1594} y={620} width={60} height={60} preserveAspect={false} isRunning={true} />
            <EquipmentImageSVG src={valveKananSvg} x={1777} y={620} width={60} height={60} preserveAspect={false} isRunning={true} />
            <EquipmentImageSVG src={valveKananSvg} x={1297} y={720} width={60} height={60} preserveAspect={false} isRunning={true} />
            <EquipmentImageSVG src={valveKananSvg} x={1410} y={720} width={60} height={60} preserveAspect={false} isRunning={true} />
            <EquipmentImageSVG src={valveKananSvg} x={1594} y={720} width={60} height={60} preserveAspect={false} isRunning={true} />
            <EquipmentImageSVG src={valveKananSvg} x={1779} y={720} width={60} height={60} preserveAspect={false} isRunning={true} />
            <EquipmentImageSVG src={valveKiriSvg} x={90} y={700} width={30} height={30} preserveAspect={false} isRunning={true} />
            <EquipmentImageSVG src={valveKiriSvg} x={225} y={700} width={35} height={35} preserveAspect={false} isRunning={true} />
            <EquipmentImageSVG src={valveKananSvg} x={420} y={550} width={65} height={65} preserveAspect={false} isRunning={true} />
            <EquipmentImageSVG src={pipeVertSvg} x={197} y={213} width={60} height={100} preserveAspect={false} />
            <EquipmentImageSVG src={pipeVertSvg} x={317} y={213} width={60} height={100} preserveAspect={false} />
            <EquipmentImageSVG src={pipeHoriSvg} x={60} y={152} width={350} height={10} preserveAspect={false} />
            <EquipmentImageSVG src={pipeHoriSvg} x={440} y={625} width={200} height={20} preserveAspect={false} />
            <EquipmentImageSVG src={valveKiriSvg} x={191} y={247} width={45} height={45} preserveAspect={false} isRunning={true} />
            <EquipmentImageSVG src={valveKiriSvg} x={312} y={247} width={45} height={45} preserveAspect={false} isRunning={true} />
            <EquipmentImageSVG src={valveAtasSvg} x={55} y={122} width={45} height={45} preserveAspect={false} isRunning={true} />
            <EquipmentImageSVG src={valveAtasSvg} x={551} y={578} width={75} height={75} preserveAspect={false} isRunning={true} />
            <EquipmentImageSVG src={valveKiriSvg} x={85} y={840} width={35} height={35} preserveAspect={false} isRunning={true} />
            <EquipmentImageSVG src={valveKiriSvg} x={225} y={840} width={35} height={35} preserveAspect={false} isRunning={true} />
            <EquipmentImageSVG src={valveKananSvg} x={130} y={690} width={35} height={35} preserveAspect={false} isRunning={true} />
            <EquipmentImageSVG src={valveKananSvg} x={270} y={690} width={35} height={35} preserveAspect={false} isRunning={true} />

            <foreignObject x={836} y={830} width={283} height={200} style={{ pointerEvents: "none", overflow: "hidden" }}>
                <img src={waterGif} style={{ width: "100%", height: "100%", objectFit: "fill", opacity: 0.8, filter: "sepia(1) hue-rotate(330deg) saturate(1.5) brightness(0.8)" }} />
            </foreignObject>
        </g>
    );
}
