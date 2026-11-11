import AiGradingPanel from "../AiGradingShared/AiGradingPanel.jsx";
import ebcPreviewImg from "../../assets/ai_grading_ebc_cctv.png";

const categories = [
  { key: "usb", label: "USB", color: "#ef4444" },
  { key: "psb", label: "PSB", color: "#f59e0b" },
  { key: "eb", label: "EB", color: "#10b981" },
];

const ebcSimulationData = {
  counts: { eb: 860, psb: 56, usb: 18 },
  metrics: { average_confidence: 97.5, detections_per_minute: 28 },
  current: {
    decision_status: "READY",
    majority_category: "eb",
    majority_percentage: 92.1,
    recommended_action_name: "THRESHER SPEED OPTIMAL (STRIPPING RATIO > 90%)",
    recommended_action_code: "THR-OPT-02",
  },
};

export default function AiGradingEbcTab({ configMode }) {
  return (
    <AiGradingPanel
      service="EBC"
      servicePort={4206}
      apiPath="/api/threshing-ebc"
      storageKey="agrovision_threshing_ebc_api_base"
      streamTitle="LIVE EBC CONVEYOR STREAM"
      analysisTitle="CATEGORY ANALYSIS"
      categories={categories}
      primaryCategory="eb"
      configMode={configMode}
      throughputUnit="EFB/m"
      previewImage={ebcPreviewImg}
      simulationData={ebcSimulationData}
    />
  );
}
