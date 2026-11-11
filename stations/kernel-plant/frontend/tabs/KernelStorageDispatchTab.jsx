import kernelStorageImgUrl from '../assets/kernel_storage_dispatch.webp'
import {
  DefsOverlay, DiagOverlay, KernelLabelSVG,
  KSTBunkerCardSVG, KSTProductionBoxSVG, KSTTableSVG,
} from '../KernelStationPage'

export default function KernelStorageDispatchTab({ svgRef, viewMode, configMode, handleMouseMove, handleEquipmentClick, kernelStatus, lv }) {
  return (
    <div className="som-kernel-scada-container">
      <img src={kernelStorageImgUrl} alt="Kernel Storage Dispatch" className="som-full-tab-image" />
      <svg ref={svgRef} viewBox="0 0 1920 1080" className="som-kernel-svg-layer"
        preserveAspectRatio="xMidYMid meet" onMouseMove={handleMouseMove}>
        <DefsOverlay />
        {viewMode === 'maintenance' && <DiagOverlay viewX="0" viewWidth="1920" bannerX="660" />}

        {/* Row 1 - Bunker Identifiers */}
        <KernelLabelSVG x={185} y={450} label={"KERNEL BUNKER\n1"} fontSize="20px" />
        <KernelLabelSVG x={700} y={450} label={"KERNEL BUNKER\n2"} fontSize="20px" />
        <KernelLabelSVG x={1212} y={450} label={"KERNEL BUNKER\n3"} fontSize="20px" />
        <KernelLabelSVG x={1735} y={450} label={"KERNEL BUNKER\n4"} fontSize="20px" />

        {/* Row 2 - Bunker Detailed Cards */}
        <KSTBunkerCardSVG x={185} y={570} id="bunker1" label="Bunker 1 Status" stock={lv('bunker1', 'STOCK', 'No Tag')} moisture={lv('bunker1', 'MOISTURE', 'No Tag')} ds={lv('bunker1', 'DS', 'No Tag')} onClick={handleEquipmentClick} isEditable={configMode} />
        <KSTBunkerCardSVG x={700} y={570} id="bunker2" label="Bunker 2 Status" stock={lv('bunker2', 'STOCK', 'No Tag')} moisture={lv('bunker2', 'MOISTURE', 'No Tag')} ds={lv('bunker2', 'DS', 'No Tag')} onClick={handleEquipmentClick} isEditable={configMode} />
        <KSTBunkerCardSVG x={1212} y={570} id="bunker3" label="Bunker 3 Status" stock={lv('bunker3', 'STOCK', 'No Tag')} moisture={lv('bunker3', 'MOISTURE', 'No Tag')} ds={lv('bunker3', 'DS', 'No Tag')} onClick={handleEquipmentClick} isEditable={configMode} />
        <KSTBunkerCardSVG x={1735} y={570} id="bunker4" label="Bunker 4 Status" stock={lv('bunker4', 'STOCK', 'No Tag')} moisture={lv('bunker4', 'MOISTURE', 'No Tag')} ds={lv('bunker4', 'DS', 'No Tag')} onClick={handleEquipmentClick} isEditable={configMode} />

        {/* Top Right - Production Summary Box */}
        <KSTProductionBoxSVG id="productionDispatch" isEditable={configMode} onClick={handleEquipmentClick} x={1650} y={150} data={[
          { label: "PK WEIGHT TODAY", value: lv('prod', 'PK_WEIGHT', 'No Tag') },
          { label: "EXPECTED KER", value: lv('prod', 'EXP_KER', 'No Tag'), color: "#ffdb3b" },
          { label: "Total Kernel Stock", value: lv('prod', 'TOT_KER_STOCK', 'No Tag') },
          { label: "Kernel Ready for Dispatch", value: lv('prod', 'KER_READY', 'No Tag') }
        ]} />

        <KSTTableSVG id="bunkerStorageDispatch" isEditable={configMode} onClick={handleEquipmentClick} x={1575} y={150} title="Bunker Storage Management"
          headers={["Storage (MT)"]}
          rows={[
            { label: "Bunker 1", values: [lv('bunker1', 'STOCK', 'No Tag')] },
            { label: "Bunker 2", values: [lv('bunker2', 'STOCK', 'No Tag')] },
            { label: "Bunker 3", values: [lv('bunker3', 'STOCK', 'No Tag')] },
            { label: "Bunker 4", values: [lv('bunker4', 'STOCK', 'No Tag')] },
          ]} />
      </svg>
    </div>
  )
}
