import AiGradingPanel from "../AiGradingShared/AiGradingPanel.jsx";
import mpdPreviewImg from "../../assets/ai_grading_mpd_cctv.png";

const categories = [
  { key: "normal_cook", label: "NORMAL COOK", color: "#10b981" },
  { key: "under_cook", label: "UNDER COOK", color: "#f59e0b" },
  { key: "over_cook", label: "OVER COOK", color: "#f97316" },
];

const mpdSimulationData = {
  counts: { normal_cook: 1420, under_cook: 168, over_cook: 84 },
  metrics: { average_confidence: 96.8, detections_per_minute: 145 },
  current: {
    decision_status: "READY",
    majority_category: "normal_cook",
    majority_percentage: 84.9,
    recommended_action_name: "STANDARD DIGESTER RESIDENCE TIME (OPTIMAL COOKING)",
    recommended_action_code: "DIG-AUTO-01",
  },
};

export default function AiGradingMpdTab({ configMode }) {
  return (
    <AiGradingPanel
      service="MPD"
      servicePort={4106}
      apiPath="/api/threshing-mpd"
      storageKey="agrovision_threshing_mpd_api_base"
      streamTitle="LIVE MPD CONVEYOR STREAM"
      analysisTitle="CATEGORY ANALYSIS"
      categories={categories}
      primaryCategory="normal_cook"
      configMode={configMode}
      throughputUnit="LF/m"
      previewImage={mpdPreviewImg}
      simulationData={mpdSimulationData}
    />
  );
}
