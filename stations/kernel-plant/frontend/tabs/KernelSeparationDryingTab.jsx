import nutCrackingImgUrl from '../assets/kernel_nut_cracking.webp'
import motorSvg from '../assets/item/motor.svg'
import backMotorSvg from '../assets/item/back_motor.svg'
import pompaAtasSvg from '../assets/item/pompa_atas.svg'
import {
  DefsOverlay, DiagOverlay, KernelLabelSVG, KSTCardSVG,
  KSTTableSVG, KSTSimpleTextBoxSVG, EquipmentIconSVG,
} from '../KernelStationPage'

export default function KernelSeparationDryingTab({
  svgRef, viewMode, configMode, handleMouseMove, handleEquipmentClick, kernelStatus, lv
}) {
  return (
    <div className="som-kernel-scada-container">
      <img src={nutCrackingImgUrl} alt="Nut Cracking & Separation" className="som-full-tab-image" />
      <svg ref={svgRef} viewBox="0 0 1920 1080" className="som-kernel-svg-layer"
        preserveAspectRatio="xMidYMid meet" onMouseMove={handleMouseMove}>
        <DefsOverlay />
        {viewMode === 'maintenance' && <DiagOverlay viewX="0" viewWidth="1920" bannerX="660" />}

        <KernelLabelSVG x={940} y={280} label="Kernel Silo 1" fontSize="18px" />
        <KernelLabelSVG x={1190} y={280} label="Kernel Silo 2" fontSize="18px" />
        <KernelLabelSVG x={1440} y={280} label="Kernel Silo 3" fontSize="18px" />
        <KernelLabelSVG x={1690} y={280} label="Kernel Silo 4" fontSize="18px" />

        <KernelLabelSVG x={940} y={350} label="V1" fontSize='18px' />
        <KernelLabelSVG x={940} y={540} label="V2" fontSize='18px' />
        <KernelLabelSVG x={940} y={725} label="V3" fontSize='18px' />
        <KernelLabelSVG x={1190} y={350} label="V1" fontSize='18px' />
        <KernelLabelSVG x={1190} y={540} label="V2" fontSize='18px' />
        <KernelLabelSVG x={1190} y={725} label="V3" fontSize='18px' />
        <KernelLabelSVG x={1440} y={350} label="V1" fontSize='18px' />
        <KernelLabelSVG x={1440} y={540} label="V2" fontSize='18px' />
        <KernelLabelSVG x={1440} y={725} label="V3" fontSize='18px' />
        <KernelLabelSVG x={1690} y={350} label="V1" fontSize='18px' />
        <KernelLabelSVG x={1690} y={540} label="V2" fontSize='18px' />
        <KernelLabelSVG x={1690} y={725} label="V3" fontSize='18px' />

        {/* Silo Identifiers */}
        <KernelLabelSVG x={940} y={330} label="Kernel Silo 1" fontSize="18px" />
        <KernelLabelSVG x={1190} y={330} label="Kernel Silo 2" fontSize="18px" />
        <KernelLabelSVG x={1440} y={330} label="Kernel Silo 3" fontSize="18px" />
        <KernelLabelSVG x={1690} y={330} label="Kernel Silo 4" fontSize="18px" />

        {/* === MOTORS === */}
        {/* Anda dapat mengubah nilai x, y, size (ukuran), rotation (rotasi dalam derajat), dan scaleX (1 atau -1 untuk flip) di bawah ini */}
        <EquipmentIconSVG x={-117} y={900} icon={motorSvg} isRunning={kernelStatus.clayPump1.run === 'run'} size={100} rotation={0} scaleX={1} />
        <EquipmentIconSVG x={670} y={803} icon={motorSvg} isRunning={kernelStatus.wetShellBlower.run === 'run'} size={93} rotation={0} scaleX={1} />
        <EquipmentIconSVG x={1850} y={890} icon={motorSvg} isRunning={kernelStatus.driedKernelBlow.run === 'run'} size={60} rotation={0} scaleX={-1} />
        <EquipmentIconSVG x={1988} y={170} icon={motorSvg} isRunning={kernelStatus.wetKernelConv.run === 'run'} size={93} rotation={0} scaleX={-1} />

        {/* === POMPA ATAS === */}
        {/* Anda dapat mengubah nilai x, y, size, rotation, dan scaleX di bawah ini */}
        <EquipmentIconSVG x={655} y={985} icon={pompaAtasSvg} isRunning={kernelStatus.driedKernelConv.run === 'run'} size={120} rotation={0} scaleX={1} />
        <EquipmentIconSVG x={1710} y={1020} icon={pompaAtasSvg} isRunning={kernelStatus.driedKernelAir.run === 'run'} size={120} rotation={0} scaleX={1} />

        {/* === BACK MOTOR === */}
        <EquipmentIconSVG x={427} y={880} icon={backMotorSvg} isRunning={kernelStatus.vibScreen.run === 'run'} size={70} rotation={0} scaleX={1} />

        {/* Row 1 - Cards */}
        <KSTCardSVG id="vibScreen" isEditable={configMode} onClick={handleEquipmentClick}
          x={250} y={660} label="Vibrating Screen"
          values={[{ label: 'Wet Shell', value: lv('vibScreen', 'AMP_WS', 'No Tag'), unit: 'A' }, { label: 'Wet Kernel', value: lv('vibScreen', 'AMP_WK', 'No Tag'), unit: 'A' }]}
          isRunning={kernelStatus.vibScreen.run === 'run'} />
        <KSTCardSVG id="clayDensity" isEditable={configMode} onClick={handleEquipmentClick}
          x={180} y={908} label="Clay Density"
          values={[{ label: 'Density', value: lv('clayDensity', 'DENS', 'No Tag'), unit: 'mg/L' }]} isRunning={kernelStatus.clayDensity.run === 'run'} />
        <KSTCardSVG id="wetShellBlower" isEditable={configMode} onClick={handleEquipmentClick}
          x={800} y={1010} label="Wet Shell Blower"
          values={[{ label: 'Load', value: lv('wetShellBlower', 'AMP', 'No Tag'), unit: 'A' }]} status={kernelStatus.wetShellBlower.run === 'run' ? 'RUN' : 'STOP'} isRunning={kernelStatus.wetShellBlower.run === 'run'} />
        <KSTCardSVG id="wetKernelElev" isEditable={configMode} onClick={handleEquipmentClick}
          x={950} y={130} label="Wet Kernel Elev"
          values={[{ label: 'Load', value: lv('wetKernelElev', 'AMP', 'No Tag'), unit: 'A' }]} isRunning={kernelStatus.wetKernelElev.run === 'run'} />

        {/* Row 2 - Cards */}
        <KSTCardSVG id="clayPump1" isEditable={configMode} onClick={handleEquipmentClick}
          x={-100} y={1030} label="Claybath Pump 1"
          values={[{ label: 'Load', value: lv('clayPump1', 'AMP', 'No Tag'), unit: 'A' }]} status={kernelStatus.clayPump1.run === 'run' ? 'RUNNING' : 'STOP'} isRunning={kernelStatus.clayPump1.run === 'run'} />
        <KSTCardSVG id="clayPump2" isEditable={configMode} onClick={handleEquipmentClick}
          x={80} y={1030} label="Claybath Pump 2"
          values={[{ label: 'Load', value: lv('clayPump2', 'AMP', 'No Tag'), unit: 'A' }]} status={kernelStatus.clayPump2.run === 'run' ? 'RUNNING' : 'STOP'} isRunning={kernelStatus.clayPump2.run === 'run'} />
        <KSTCardSVG id="wetKernelConv" isEditable={configMode} onClick={handleEquipmentClick}
          x={1900} y={130} label="Wet Kernel Conv"
          values={[{ label: 'Load', value: lv('wetKernelConv', 'AMP', 'No Tag'), unit: 'A' }]} isRunning={kernelStatus.wetKernelConv.run === 'run'} />

        {/* Dried Kernel Monitoring */}
        <KSTCardSVG id="driedKernelConv" isEditable={configMode} onClick={handleEquipmentClick} x={710} y={770} label="D. Kernel Conv"
          values={[{ label: 'Load', value: lv('driedKernelConv', 'AMP', 'No Tag'), unit: 'A' }]} isRunning={kernelStatus.driedKernelConv.run === 'run'} />
        <KSTCardSVG id="driedKernelAir" isEditable={configMode} onClick={handleEquipmentClick} x={1640} y={940} label="D. Kernel Airlock"
          values={[{ label: 'Load', value: lv('driedKernelAir', 'AMP', 'No Tag'), unit: 'A' }]} isRunning={kernelStatus.driedKernelAir.run === 'run'} />
        <KSTCardSVG id="driedKernelBlow" isEditable={configMode} onClick={handleEquipmentClick} x={1840} y={1060} label="D. Kernel Blower"
          values={[{ label: 'Load', value: lv('driedKernelBlow', 'AMP', 'No Tag'), unit: 'A' }]} isRunning={kernelStatus.driedKernelBlow.run === 'run'} />

        {/* Data Tables */}
        <KSTTableSVG id="siloTempMoist" isEditable={configMode} onClick={handleEquipmentClick} x={10} y={180} title="Kernel Silo Temperatures & Moisture"
          headers={["T1", "T2", "T3", "T4", "Moist"]}
          rows={[
            { label: "Silo 1", values: [lv('silo1', 'T1', 'No Tag'), lv('silo1', 'T2', 'No Tag'), lv('silo1', 'T3', 'No Tag'), lv('silo1', 'T4', 'No Tag'), lv('silo1', 'MOISTURE', 'No Tag')] },
            { label: "Silo 2", values: [lv('silo2', 'T1', 'No Tag'), lv('silo2', 'T2', 'No Tag'), lv('silo2', 'T3', 'No Tag'), lv('silo2', 'T4', 'No Tag'), lv('silo2', 'MOISTURE', 'No Tag')] },
            { label: "Silo 3", values: [lv('silo3', 'T1', 'No Tag'), lv('silo3', 'T2', 'No Tag'), lv('silo3', 'T3', 'No Tag'), lv('silo3', 'T4', 'No Tag'), lv('silo3', 'MOISTURE', 'No Tag')] },
            { label: "Silo 4", values: [lv('silo4', 'T1', 'No Tag'), lv('silo4', 'T2', 'No Tag'), lv('silo4', 'T3', 'No Tag'), lv('silo4', 'T4', 'No Tag'), lv('silo4', 'MOISTURE', 'No Tag')] }
          ]} />
        <KSTTableSVG id="bunkerStorageDrying" isEditable={configMode} onClick={handleEquipmentClick} x={10} y={380} title="Bunker Storage Management"
          headers={["Storage (MT)"]}
          rows={[
            { label: "Bunker 1", values: [lv('bunker1', 'STOCK', 'No Tag')] },
            { label: "Bunker 2", values: [lv('bunker2', 'STOCK', 'No Tag')] },
            { label: "Bunker 3", values: [lv('bunker3', 'STOCK', 'No Tag')] },
            { label: "Bunker 4", values: [lv('bunker4', 'STOCK', 'No Tag')] },
            { label: "Shell Flour", values: [lv('shellFlour', 'STOCK', 'No Tag')] }
          ]} />
        <KSTSimpleTextBoxSVG id="productionStats" isEditable={configMode} onClick={handleEquipmentClick} x={10} y={660} lines={[
          `PK WEIGHT INCREASED TODAY = ${lv('prod', 'PK_WEIGHT', 'No Tag')}`,
          `EXPECTED KER = ${lv('prod', 'EXP_KER', 'No Tag')}`,
          `PKS WEIGHT INCREASED TODAY = ${lv('prod', 'PKS_WEIGHT', 'No Tag')}`,
          `EXPECTED SER = ${lv('prod', 'EXP_SER', 'No Tag')}`
        ]} />
      </svg>
    </div>
  )
}
