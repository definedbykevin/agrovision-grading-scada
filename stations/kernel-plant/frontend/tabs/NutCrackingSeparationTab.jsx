import kernelStationImageUrl from '../assets/kernel-station.png'
import motorSvg from '../assets/item/motor.svg'
import backMotorSvg from '../assets/item/back_motor.svg'
import {
  DefsOverlay, DiagOverlay, EquipmentIconSVG, FanIconSVG,
  MotorCardSVG, MaintenanceCardSVG,
} from '../KernelStationPage'

export default function NutCrackingSeparationTab({
  svgRef, viewMode, configMode, handleMouseMove, handleEquipmentClick, kernelStatus, lv,
}) {
  return (
    <div className="som-kernel-layout">
      <div className="som-kernel-flow-card">
        <div className="som-kernel-flow-body">
          <svg ref={svgRef} viewBox="-350 0 2625 1080" className="station-svg-canvas"
            preserveAspectRatio="xMidYMid meet" onMouseMove={handleMouseMove}>
            <DefsOverlay />
            <image href={kernelStationImageUrl} width="2625" x="-350" y="-29" />

            {viewMode === 'maintenance' && <DiagOverlay viewX="-350" viewWidth="2625" bannerX="700" />}
            <EquipmentIconSVG x={-20} y={1008} icon={motorSvg} isRunning={kernelStatus.polishingDrum.run === 'run'} size={60} />
            <FanIconSVG x={120} y={320} isRunning={kernelStatus.fiberCyclone.run === 'run'} size={80} />
            <EquipmentIconSVG x={215} y={360} icon={backMotorSvg} isRunning={kernelStatus.fiberCyclone.run === 'run'} size={90} />
            <EquipmentIconSVG x={-148} y={421} icon={motorSvg} isRunning={kernelStatus.fiberCyclone.airlock === 'run'} size={70} />
            <FanIconSVG x={835} y={320} isRunning={kernelStatus.destoner.run === 'run'} size={80} />
            <EquipmentIconSVG x={929} y={365} icon={backMotorSvg} isRunning={kernelStatus.destoner.run === 'run'} size={90} />
            <EquipmentIconSVG x={570} y={420} icon={motorSvg} isRunning={kernelStatus.destoner.airlock === 'run'} size={70} />
            <EquipmentIconSVG x={210} y={970} icon={backMotorSvg} isRunning={kernelStatus.nutConveyor.run === 'run'} size={60} />
            <EquipmentIconSVG x={670} y={871} icon={motorSvg} isRunning={kernelStatus.rippleMills[0].run === 'run'} scaleX={-1} size={53} />
            <EquipmentIconSVG x={814} y={875} icon={motorSvg} isRunning={kernelStatus.rippleMills[1].run === 'run'} scaleX={-1} size={53} />
            <EquipmentIconSVG x={952} y={873} icon={motorSvg} isRunning={kernelStatus.rippleMills[2].run === 'run'} scaleX={-1} size={53} />
            <EquipmentIconSVG x={1093} y={876} icon={motorSvg} isRunning={kernelStatus.rippleMills[3].run === 'run'} scaleX={-1} size={53} />
            <EquipmentIconSVG x={1233} y={874} icon={motorSvg} isRunning={kernelStatus.rippleMills[4].run === 'run'} scaleX={-1} size={53} />
            <EquipmentIconSVG x={1376} y={877} icon={motorSvg} isRunning={kernelStatus.rippleMills[5].run === 'run'} scaleX={-1} size={53} />
            <FanIconSVG x={1162} y={345} isRunning={kernelStatus.ltds1.run === 'run'} size={80} />
            <EquipmentIconSVG x={1075} y={390} icon={backMotorSvg} isRunning={kernelStatus.ltds1.run === 'run'} size={90} />
            <EquipmentIconSVG x={1318} y={415} icon={motorSvg} isRunning={kernelStatus.ltds1.airlock === 'run'} size={70} />
            <FanIconSVG x={2140} y={335} isRunning={kernelStatus.ltds2.run === 'run'} size={80} />
            <EquipmentIconSVG x={2235} y={378} icon={backMotorSvg} isRunning={kernelStatus.ltds2.run === 'run'} size={90} />
            <EquipmentIconSVG x={1875} y={429} icon={motorSvg} isRunning={kernelStatus.ltds2.airlock === 'run'} size={70} />
            <EquipmentIconSVG x={535} y={1038} icon={motorSvg} isRunning={kernelStatus.mixtureConv.run === 'run'} size={70} />
            <EquipmentIconSVG x={1435} y={1030} icon={backMotorSvg} isRunning={kernelStatus.mixtureElev.run === 'run'} size={60} />
            {viewMode === 'process' ? (
              <g>
                <MotorCardSVG isEditable={configMode} x={-85} y={1020} id="drum" label="Polishing Drum" ampere={lv('drum', 'AMP', 'No Tag')} frequency={lv('drum', 'HZ', 'No Tag')} ampTag="KRN_PD_AMP" hzTag="KRN_PD_HZ" onClick={handleEquipmentClick} />
                <MotorCardSVG isEditable={configMode} x={195} y={240} id="fibFan" label="Cyclone Fan" ampere={lv('fibFan', 'AMP', 'No Tag')} frequency={lv('fibFan', 'HZ', 'No Tag')} ampTag="KRN_FC_AMP" hzTag="KRN_FC_HZ" onClick={handleEquipmentClick} />
                <MotorCardSVG isEditable={configMode} x={-160} y={365} id="fibAir" label="Cyc Airlock" ampere={lv('fibAir', 'AMP', 'No Tag')} frequency={lv('fibAir', 'HZ', 'No Tag')} ampTag="" hzTag="" onClick={handleEquipmentClick} />
                <MotorCardSVG isEditable={configMode} x={910} y={240} id="desFan" label="Destoner Fan" ampere={lv('desFan', 'AMP', 'No Tag')} frequency={lv('desFan', 'HZ', 'No Tag')} ampTag="KRN_DS_AMP" hzTag="KRN_DS_HZ" onClick={handleEquipmentClick} />
                <MotorCardSVG isEditable={configMode} x={555} y={365} id="desAir" label="Dst Airlock" ampere={lv('desAir', 'AMP', 'No Tag')} frequency={lv('desAir', 'HZ', 'No Tag')} ampTag="" hzTag="" onClick={handleEquipmentClick} />
                <MotorCardSVG isEditable={configMode} x={330} y={940} id="nutConv" label="Nut Conv" ampere={lv('nutConv', 'AMP', 'No Tag')} frequency={lv('nutConv', 'HZ', 'No Tag')} ampTag="KRN_NC_AMP" hzTag="KRN_NC_HZ" onClick={handleEquipmentClick} />
                <MotorCardSVG isEditable={configMode} x={635} y={960} id="rm1" label="Ripple Mill 1" ampere={lv('rm1', 'AMP', 'No Tag')} frequency={lv('rm1', 'HZ', 'No Tag')} ampTag="KRN_RM1_AMP" hzTag="KRN_RM1_HZ" onClick={handleEquipmentClick} topLabel="PV" topUnit="A" topUseHz={false} botLabel="LOAD" botUnit="%" botUseHz={true} modalParams={[{key: "AMP", label: "Ampere"}, {key: "HZ", label: "Load"}]} />
                <MotorCardSVG isEditable={configMode} x={780} y={960} id="rm2" label="Ripple Mill 2" ampere={lv('rm2', 'AMP', 'No Tag')} frequency={lv('rm2', 'HZ', 'No Tag')} ampTag="KRN_RM2_AMP" hzTag="KRN_RM2_HZ" onClick={handleEquipmentClick} topLabel="PV" topUnit="A" topUseHz={false} botLabel="LOAD" botUnit="%" botUseHz={true} modalParams={[{key: "AMP", label: "Ampere"}, {key: "HZ", label: "Load"}]} />
                <MotorCardSVG isEditable={configMode} x={920} y={960} id="rm3" label="Ripple Mill 3" ampere={lv('rm3', 'AMP', 'No Tag')} frequency={lv('rm3', 'HZ', 'No Tag')} ampTag="KRN_RM3_AMP" hzTag="KRN_RM3_HZ" onClick={handleEquipmentClick} topLabel="PV" topUnit="A" topUseHz={false} botLabel="LOAD" botUnit="%" botUseHz={true} modalParams={[{key: "AMP", label: "Ampere"}, {key: "HZ", label: "Load"}]} />
                <MotorCardSVG isEditable={configMode} x={1060} y={960} id="rm4" label="Ripple Mill 4" ampere={lv('rm4', 'AMP', 'No Tag')} frequency={lv('rm4', 'HZ', 'No Tag')} ampTag="KRN_RM4_AMP" hzTag="KRN_RM4_HZ" onClick={handleEquipmentClick} topLabel="PV" topUnit="A" topUseHz={false} botLabel="LOAD" botUnit="%" botUseHz={true} modalParams={[{key: "AMP", label: "Ampere"}, {key: "HZ", label: "Load"}]} />
                <MotorCardSVG isEditable={configMode} x={1205} y={960} id="rm5" label="Ripple Mill 5" ampere={lv('rm5', 'AMP', 'No Tag')} frequency={lv('rm5', 'HZ', 'No Tag')} ampTag="KRN_RM5_AMP" hzTag="KRN_RM5_HZ" onClick={handleEquipmentClick} topLabel="PV" topUnit="A" topUseHz={false} botLabel="LOAD" botUnit="%" botUseHz={true} modalParams={[{key: "AMP", label: "Ampere"}, {key: "HZ", label: "Load"}]} />
                <MotorCardSVG isEditable={configMode} x={1345} y={960} id="rm6" label="Ripple Mill 6" ampere={lv('rm6', 'AMP', 'No Tag')} frequency={lv('rm6', 'HZ', 'No Tag')} ampTag="KRN_RM6_AMP" hzTag="KRN_RM6_HZ" onClick={handleEquipmentClick} topLabel="PV" topUnit="A" topUseHz={false} botLabel="LOAD" botUnit="%" botUseHz={true} modalParams={[{key: "AMP", label: "Ampere"}, {key: "HZ", label: "Load"}]} />
                <MotorCardSVG isEditable={configMode} x={1145} y={270} id="ltdsFan1" label="LTDS Fan 1" ampere={lv('ltdsFan1', 'AMP', 'No Tag')} frequency={lv('ltdsFan1', 'HZ', 'No Tag')} ampTag="KRN_LT1_AMP" hzTag="KRN_LT1_HZ" onClick={handleEquipmentClick} />
                <MotorCardSVG isEditable={configMode} x={2217} y={255} id="ltdsFan2" label="LTDS Fan 2" ampere={lv('ltdsFan2', 'AMP', 'No Tag')} frequency={lv('ltdsFan2', 'HZ', 'No Tag')} ampTag="KRN_LT2_AMP" hzTag="KRN_LT2_HZ" onClick={handleEquipmentClick} />
                <MotorCardSVG isEditable={configMode} x={1310} y={365} id="ltdsAir1" label="LTDS Airlock 1" ampere={lv('ltdsAir1', 'AMP', 'No Tag')} frequency={lv('ltdsAir1', 'HZ', 'No Tag')} ampTag="" hzTag="" onClick={handleEquipmentClick} />
                <MotorCardSVG isEditable={configMode} x={1860} y={380} id="ltdsAir2" label="LTDS Airlock 2" ampere={lv('ltdsAir2', 'AMP', 'No Tag')} frequency={lv('ltdsAir2', 'HZ', 'No Tag')} ampTag="" hzTag="" onClick={handleEquipmentClick} />
                <MotorCardSVG isEditable={configMode} x={470} y={1050} id="mixConv" label="Mixture Conv" ampere={lv('mixConv', 'AMP', 'No Tag')} frequency={lv('mixConv', 'HZ', 'No Tag')} ampTag="KRN_MXC_AMP" hzTag="KRN_MXC_HZ" onClick={handleEquipmentClick} />
                <MotorCardSVG isEditable={configMode} x={1520} y={1040} id="mixElev" label="Mixture Elev" ampere={lv('mixElev', 'AMP', 'No Tag')} frequency={lv('mixElev', 'HZ', 'No Tag')} ampTag="KRN_MXE_AMP" hzTag="KRN_MXE_HZ" onClick={handleEquipmentClick} />
              </g>
            ) : (
              <g>
                <MaintenanceCardSVG isEditable={configMode} x={-85} y={1020} id="m-drum" label="M-DRUM" params={[{ label: 'AMP', value: lv('drum', 'AMP', 'No Tag'), unit: 'A' }, { label: 'HZ', value: lv('drum', 'HZ', 'No Tag'), unit: 'Hz' }]} onClick={handleEquipmentClick} />
                <MaintenanceCardSVG isEditable={configMode} x={195} y={240} id="m-fibfan" label="M-FCFAN" params={[{ label: 'AMP', value: lv('fibFan', 'AMP', 'No Tag'), unit: 'A' }, { label: 'HZ', value: lv('fibFan', 'HZ', 'No Tag'), unit: 'Hz' }]} onClick={handleEquipmentClick} />
                <MaintenanceCardSVG isEditable={configMode} x={910} y={240} id="m-desfan" label="M-DSFAN" params={[{ label: 'AMP', value: lv('desFan', 'AMP', 'No Tag'), unit: 'A' }, { label: 'HZ', value: lv('desFan', 'HZ', 'No Tag'), unit: 'Hz' }]} onClick={handleEquipmentClick} />
                <MaintenanceCardSVG isEditable={configMode} x={635} y={960} id="m-rm1" label="M-RM_1" params={[{ label: 'AMP', value: lv('rm1', 'AMP', 'No Tag'), unit: 'A' }, { label: 'HZ', value: lv('rm1', 'HZ', 'No Tag'), unit: 'Hz' }]} onClick={handleEquipmentClick} />
                <MaintenanceCardSVG isEditable={configMode} x={780} y={960} id="m-rm2" label="M-RM_2" params={[{ label: 'AMP', value: lv('rm2', 'AMP', 'No Tag'), unit: 'A' }, { label: 'HZ', value: lv('rm2', 'HZ', 'No Tag'), unit: 'Hz' }]} onClick={handleEquipmentClick} />
                <MaintenanceCardSVG isEditable={configMode} x={920} y={960} id="m-rm3" label="M-RM_3" params={[{ label: 'AMP', value: lv('rm3', 'AMP', 'No Tag'), unit: 'A' }, { label: 'HZ', value: lv('rm3', 'HZ', 'No Tag'), unit: 'Hz' }]} onClick={handleEquipmentClick} />
                <MaintenanceCardSVG isEditable={configMode} x={1060} y={960} id="m-rm4" label="M-RM_4" params={[{ label: 'AMP', value: lv('rm4', 'AMP', 'No Tag'), unit: 'A' }, { label: 'HZ', value: lv('rm4', 'HZ', 'No Tag'), unit: 'Hz' }]} onClick={handleEquipmentClick} />
                <MaintenanceCardSVG isEditable={configMode} x={1205} y={960} id="m-rm5" label="M-RM_5" params={[{ label: 'AMP', value: lv('rm5', 'AMP', 'No Tag'), unit: 'A' }, { label: 'HZ', value: lv('rm5', 'HZ', 'No Tag'), unit: 'Hz' }]} onClick={handleEquipmentClick} />
                <MaintenanceCardSVG isEditable={configMode} x={1345} y={960} id="m-rm6" label="M-RM_6" params={[{ label: 'AMP', value: lv('rm6', 'AMP', 'No Tag'), unit: 'A' }, { label: 'HZ', value: lv('rm6', 'HZ', 'No Tag'), unit: 'Hz' }]} onClick={handleEquipmentClick} />
                <MaintenanceCardSVG isEditable={configMode} x={1145} y={270} id="m-lt1" label="M-LTDS_1" params={[{ label: 'AMP', value: lv('ltdsFan1', 'AMP', 'No Tag'), unit: 'A' }, { label: 'HZ', value: lv('ltdsFan1', 'HZ', 'No Tag'), unit: 'Hz' }]} onClick={handleEquipmentClick} />
                <MaintenanceCardSVG isEditable={configMode} x={2217} y={255} id="m-lt2" label="M-LTDS_2" params={[{ label: 'AMP', value: lv('ltdsFan2', 'AMP', 'No Tag'), unit: 'A' }, { label: 'HZ', value: lv('ltdsFan2', 'HZ', 'No Tag'), unit: 'Hz' }]} onClick={handleEquipmentClick} />
              </g>
            )}
          </svg>
        </div>
      </div>
    </div>
  )
}
