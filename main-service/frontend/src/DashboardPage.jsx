import { useState, useEffect } from "react";
import "@core/theme/dashboard.css";
import ComingSoonPage from "@pages/ComingSoonPage.jsx";
import PressStationPage from "@stations/press-station/PressStationPage.jsx";
import { LogsheetView as PressLogsheet } from "@stations/press-station";
import ThreshingStationPage from "@stations/threshing-station/ThreshingStationPage.jsx";
import { LogsheetView as KernelLogsheet } from "@stations/kernel-plant";
import SterilizerStationPage from "@stations/sterilizer-station/SterilizerStationPage.jsx";
import SecurityLogsheetHub from "@stations/security/logsheet/SecurityLogsheetHub.jsx";
import KernelStationPage from "@stations/kernel-plant/KernelStationPage.jsx";
import GradingRampPage from "@stations/grading-ramp/GradingRampPage.jsx";
import UserManagementPage from "@pages/UserManagementPage.jsx";
import ProductionDashboardPage from "@pages/ProductionDashboardPage.jsx";
import ActivityLogPage from "@reports/ActivityLogPage.jsx";
import {
  AlarmListView,
  NotifSettingsView,
  SystemErrorPage,
  InternetErrorPage,
  InstrumentErrorPage,
  PowerErrorPage,
  BreakdownPage,
  ProcessDisturbancePage,
} from "@alarm";
import HomeOverviewPage from "@home/HomeOverviewPage.jsx";
import RunningHoursPage from "@reports/RunningHoursPage.jsx";
import DailyAbnormalitiesPage from "@reports/DailyAbnormalitiesPage.jsx";
import MillStabilityPage from "@reports/MillStabilityPage.jsx";
import { DeveloperPage, ContactListView } from "@contact";
import LogsheetBase from "@core/logsheet/LogsheetBase.jsx";
import SterilizerLogsheet from "@stations/sterilizer-station/LogsheetView.jsx";
import KernelPlantSettingsPage from "@stations/kernel-plant/settings/KernelPlantSettingsPage.jsx";
import PressStationSettingsPage from "@stations/press-station/settings/PressStationSettingsPage.jsx";
import ThreshingStationSettingsPage from "@stations/threshing-station/settings/ThreshingStationSettingsPage.jsx";
import SterilizerStationSettingsPage from "@stations/sterilizer-station/settings/SterilizerStationSettingsPage.jsx";
import BoilerHouseSettingsPage from "@stations/boiler-house/settings/BoilerHouseSettingsPage.jsx";
import SystemSettingsPage from "@core/pages/SystemSettingsPage.jsx";
import usePlcStore from "@core/store";
import DashboardHeader from "./layout/DashboardHeader.jsx";
import BoilerHousePage from "@stations/boiler-house/BoilerHousePage.jsx";
// import EFBPlantPage from "@stations/efb-plant/EFBPlantPage.jsx";
import EngineRoomPage from "@stations/engine-room/EngineRoomPage.jsx";
import SecurityStationPage from "@stations/security/SecurityStationPage.jsx";
import WeighbridgePage from "@stations/weighbridge/WeighbridgePage.jsx";
import LoadingRampPage from "@stations/loading-ramp/LoadingRampPage.jsx";
// import OilClarificationPage from "@stations/oil-clarification/OilClarificationPage.jsx";
// import RawWaterPage from "@stations/raw-water/RawWaterPage.jsx";
// import EffluentPage from "@stations/effluent-treatment/EffluentPage.jsx";
// import DafOsrPage from "@stations/daf-osr/DafOsrPage.jsx";
// import DafOsrSettingsPage from "@stations/daf-osr/settings/DafOsrSettingsPage.jsx";
// import CmrsPage from "@stations/cmrs/CmrsPage.jsx";
import {
  MaintenanceHub,
  MachineryListView,
  SparePartView,
  OGReplacementView,
} from "@maintenance";
import ThreeDPlantViewPage from "@overview/ThreeDPlantViewPage.jsx";
import PressPlcConfig from "@stations/press-station/PlcConfigView.jsx";
import ThreshingPlcConfig from "@stations/threshing-station/PlcConfigView.jsx";
import SterilizerPlcConfig from "@stations/sterilizer-station/PlcConfigView.jsx";
import AiCameraConfigModal from "@stations/sterilizer-station/components/AiCameraConfigModal.jsx";
import KernelPlcConfig from "@stations/kernel-plant/PlcConfigView.jsx";
import BoilerHousePlcConfig from "@stations/boiler-house/PlcConfigView.jsx";
import SterilizerCalibrationView from "@stations/sterilizer-station/calibration/SterilizerCalibrationView.jsx";
import PressCalibrationView from "@stations/press-station/calibration/PressCalibrationView.jsx";
import ThreshingCalibrationView from "@stations/threshing-station/calibration/ThreshingCalibrationView.jsx";
import KernelCalibrationView from "@stations/kernel-plant/calibration/KernelCalibrationView.jsx";
// import EFBPlantPlcConfig from "@stations/efb-plant/PlcConfigView.jsx";
import EngineRoomPlcConfig from "@stations/engine-room/PlcConfigView.jsx";
// import WeighbridgePlcConfig from "@stations/weighbridge/PlcConfigView.jsx";
import LoadingRampPlcConfig from "@stations/loading-ramp/PlcConfigView.jsx";
// import OilClarificationPlcConfig from "@stations/oil-clarification/PlcConfigView.jsx";
// import RawWaterPlcConfig from "@stations/raw-water/PlcConfigView.jsx";
// import EffluentPlcConfig from "@stations/effluent-treatment/PlcConfigView.jsx";
// import DafOsrPlcConfig from "@stations/daf-osr/PlcConfigView.jsx";
// import CmrsPlcConfig from "@stations/cmrs/PlcConfigView.jsx";
import GradingRampPlcConfig from "@stations/grading-ramp/PlcConfigView.jsx";
import CamConfigView from "@stations/security/camconfig/CamConfigView.jsx";

// ──────────────────────────────────────
// Static station → component mappings
// ──────────────────────────────────────

const STATION_PAGE_MAP = {
  "Press Station": PressStationPage,
  "Threshing Station": ThreshingStationPage,
  "Sterilizer Station": SterilizerStationPage,
  "Kernel Plant": KernelStationPage,
  "Grading Ramp": GradingRampPage,
  "Boiler House": BoilerHousePage,
  "EFB Plant": ComingSoonPage, // Locked/inactive
  "Engine Room": EngineRoomPage,
  "Security": SecurityStationPage,
  "Weighbridge": WeighbridgePage,
  "Loading Ramp": LoadingRampPage,
  "Oil Clarification Room": ComingSoonPage, // Locked/inactive
  "Raw Water Treatment": ComingSoonPage, // Locked/inactive
  "Effluent Treatment": ComingSoonPage, // Locked/inactive
  "DAF / OSR": ComingSoonPage, // Locked/inactive
  CMRS: ComingSoonPage, // Locked/inactive
};

const STATION_PLC_CONFIG_MAP = {
  "Press Station": PressPlcConfig,
  "Threshing Station": ThreshingPlcConfig,
  "Sterilizer Station": SterilizerPlcConfig,
  "Kernel Plant": KernelPlcConfig,
  "Boiler House": BoilerHousePlcConfig,
  "EFB Plant": ComingSoonPage,
  "Engine Room": EngineRoomPlcConfig,
  "Security": CamConfigView,
  "Weighbridge": WeighbridgePage,
  "Loading Ramp": LoadingRampPlcConfig,
  "Oil Clarification Room": ComingSoonPage,
  "Raw Water Treatment": ComingSoonPage,
  "Effluent Treatment": ComingSoonPage,
  "DAF / OSR": ComingSoonPage,
  CMRS: ComingSoonPage,
  "Grading Ramp": GradingRampPlcConfig,
};

const STATION_SETTINGS_MAP = {
  "Threshing Station": ThreshingStationSettingsPage,
  "Press Station": PressStationSettingsPage,
  "Kernel Plant": KernelPlantSettingsPage,
  "Sterilizer Station": SterilizerStationSettingsPage,
  "Boiler House": BoilerHouseSettingsPage,
  "DAF / OSR": ComingSoonPage,
};

const STORAGE_KEY = "smart_oil_mill_active_submenu";

function DashboardPage({ user, onLogoutSuccess, onProfileUpdate }) {
  const initSocket = usePlcStore((state) => state.initSocket);
  useEffect(() => {
    initSocket();
  }, [initSocket]);

  // Retrieve the saved active submenu from localStorage, if any.
  // We'll update this in the useEffect below if they don't have permission for it.
  const [activeSubmenu, setActiveSubmenu] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || "Production Dashboard";
  });
  const [activeMenu, setActiveMenu] = useState("Dashboard");
  const [viewPlcConfig, setViewPlcConfig] = useState(false);
  const [isCamConfigOpen, setIsCamConfigOpen] = useState(false);
  const [isAiCamConfigOpen, setIsAiCamConfigOpen] = useState(false);
  const [isXooraUnlocked, setIsXooraUnlocked] = useState(false);
  const [stations, setStations] = useState([]);
  const [stationTitles, setStationTitles] = useState([]);

  // Validate the current active submenu against user permissions and fallback if restricted.
  useEffect(() => {
    // Wait for stations to load before evaluating permissions, as we need them for mapping
    if (stations.length === 0) return;

    const roleLower = user?.userRole?.toLowerCase() || user?.role?.toLowerCase() || "";
    if (roleLower === "developer") {
      // If developer, at least ensure activeMenu is somewhat correct for stations if stuck on Dashboard
      if (activeMenu === "Dashboard" && STATION_PAGE_MAP[activeSubmenu]) {
        setActiveMenu("Station View");
      }
      return;
    }

    const perms = user?.permissions || [];
    if (perms.length > 0) {
      // Strip pipe from activeSubmenu for permission checking (e.g., "Instrument Calibration - Sterilizer Station|calib")
      const cleanSubmenu = activeSubmenu.split('|')[0];

      let currentPerm = null;

      // 0. Special case for Maintenance categories
      if (activeMenu === "Maintenance" && cleanSubmenu.includes(" - ")) {
        const mainCategory = cleanSubmenu.split(" - ")[0];
        currentPerm = perms.find(p => p === `Maintenance:${mainCategory}`);
      }

      // 1. Try to find EXACT match first
      if (!currentPerm) {
        currentPerm = perms.find(p => p === `${activeMenu}:${cleanSubmenu}`);
      }

      // 2. Fallbacks if no exact match (e.g. activeMenu is out of sync)
      if (!currentPerm) {
        currentPerm = perms.find(p => {
          if (p.endsWith(`:${cleanSubmenu}`)) return true;

          const st = stations.find(s => s.title === cleanSubmenu);
          if (st && p.startsWith(`${st.slug}:`)) return true;

          if (cleanSubmenu === "Production Dashboard" && (p.startsWith("menu_dashboard:") || p.startsWith("Dashboard:"))) return true;
          if (cleanSubmenu === "Home Overview" && (p.startsWith("menu_home:") || p.startsWith("Overview:"))) return true;

          return false;
        });
      }

      if (currentPerm) {
        const [parent] = currentPerm.split(":");
        // Only fix activeMenu if it's mismatched, and the current activeMenu wasn't an exact match
        if (parent && parent !== activeMenu && !currentPerm.startsWith(`${activeMenu}:`) && !["view_dashboard", "logsheet_input", "manage_users", "maintenance_edit", "view_reports", "manage_settings"].includes(parent)) {
          setActiveMenu(parent.trim());
        }
      } else {
        // Fallback to the first available permission
        const firstPerm = perms.find(p => p.includes(":")) || perms[0];
        const [parent, submenu] = firstPerm.split(":");
        if (parent && submenu) {
          if (parent.startsWith("station_")) {
            const st = stations.find(s => s.slug === parent);
            if (st) {
              setActiveMenu("Station View");
              setActiveSubmenu(st.title);
            }
          } else if (parent === "menu_dashboard") {
            setActiveMenu("Dashboard");
            setActiveSubmenu("Production Dashboard");
          } else if (parent === "menu_home") {
            setActiveMenu("Overview");
            setActiveSubmenu("Home Overview");
          } else {
            setActiveMenu(parent.trim());
            setActiveSubmenu(submenu.trim());
          }
        }
      }
    }
  }, [user, activeSubmenu, stations]);


  // Fetch station list from API
  useEffect(() => {
    fetch("/api/config/stations")
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setStations(res.data);
          setStationTitles(res.data.map((s) => s.title));
        }
      })
      .catch((err) =>
        console.error("[DashboardPage] Failed to fetch stations:", err),
      );
  }, []);

  // Save active submenu to localStorage whenever it changes
  useEffect(() => {
    if (activeSubmenu) {
      localStorage.setItem(STORAGE_KEY, activeSubmenu);
    }
    setViewPlcConfig(false);
  }, [activeSubmenu]);

  const [isSystemMenuUnlocked, setIsSystemMenuUnlocked] = useState(false);

  // Cheat code detector: press Ctrl+X for PLC Config, Ctrl+U for System Menu (hanya developer)
  useEffect(() => {
    const isDev =
      user?.userRole?.toLowerCase() === "developer" ||
      user?.role?.toLowerCase() === "developer";
    if (!isDev) return;

    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === "x") {
        e.preventDefault();
        setIsXooraUnlocked((prev) => {
          const nextVal = !prev;
          if (!nextVal) setViewPlcConfig(false);
          return nextVal;
        });
      }

      if (e.ctrlKey && e.key.toLowerCase() === "u") {
        e.preventDefault();
        setIsSystemMenuUnlocked((prev) => {
          console.log(`🔓 System Menu Unlocked: ${!prev}`);
          return !prev;
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [user]);

  // Handle submenu selection
  const handleSelectSubmenu = (submenu, parentMenu = null) => {
    if (parentMenu) {
      setActiveMenu(parentMenu);
    }
    setActiveSubmenu(submenu);
  };

  // Handle menu click to track active menu
  const handleMenuClick = (menu) => {
    setActiveMenu(menu);
    // If Dashboard is clicked, clear active submenu as it has no submenus
    if (menu === "Dashboard") {
      setActiveSubmenu("Production Dashboard");
    }
    if (menu === "Overview") {
      setActiveSubmenu("3D Plant View");
    }
  };

  // Handle navigation from Home cards
  const handleStationNavigate = (stationName) => {
    setActiveMenu("Station View");
    setActiveSubmenu(stationName);
  };

  const renderPage = () => {
    // PLC Config View is now handled inline inside Priority 3: Station Pages to prevent unmounting/remounting

    // Priority 1: Settings Pages — cek dari settings map
    if (activeMenu === "Settings") {
      const SettingsComponent = STATION_SETTINGS_MAP[activeSubmenu];
      if (SettingsComponent)
        return <SettingsComponent onSelectSubmenu={handleSelectSubmenu} />;
    }

    // Priority 2: Logsheet
    if (activeMenu === "Logsheet") {
      if (activeSubmenu === "Security") {
        return <SecurityLogsheetHub />;
      }
      if (activeSubmenu === "Sterilizer Station") {
        return <SterilizerLogsheet stationSlug="sterilizer" />;
      }
      if (activeSubmenu === "Press Station") {
        return <PressLogsheet stationSlug="press" />;
      }
      if (activeSubmenu === "Kernel Plant") {
        return <KernelLogsheet />;
      }
      const stationSlug =
        stations.find((s) => s.title === activeSubmenu)?.slug || "";
      return <LogsheetBase stationTitle={activeSubmenu} stationSlug={stationSlug} />;
    }

    // Priority 2: Dashboard
    if (activeMenu === "Dashboard") {
      if (activeSubmenu === "Home Overview")
        return (
          <HomeOverviewPage user={user} onNavigate={handleStationNavigate} stations={stations} />
        );
      return <ProductionDashboardPage user={user} />;
    }

    // Overview
    if (activeMenu === "Overview") {
      if (activeSubmenu === "3D Plant View")
        return (
          <ThreeDPlantViewPage user={user} onNavigate={handleStationNavigate} stations={stations} />
        );
      if (activeSubmenu === "2D Layout Plant")
        return <ComingSoonPage title="2D Layout Plant" />;
    }

    // Maintenance — sama seperti sebelumnya
    if (activeMenu === "Maintenance") {
      const [leftPart, targetTab] = activeSubmenu.split("|");
      const parts = leftPart?.split(" - ") || [];
      const category = parts[0];
      const stationMatch = parts[1] || "";

      if (category === "Machinery List") {
        return <MachineryListView initialContext={activeSubmenu} />;
      }
      if (category === "Spare Part Replacement") {
        return <SparePartView station={stationMatch} />;
      }
      if (category === "O&G Replacement") {
        return <OGReplacementView station={stationMatch} />;
      }
      if (category === "Instrument Calibration" && stationMatch === "Sterilizer Station") {
        const StationPlcConfig = STATION_PLC_CONFIG_MAP["Sterilizer Station"];
        return (
          <>
            <div style={{ display: viewPlcConfig ? "block" : "none", height: "100%", width: "100%" }}>
              {StationPlcConfig && <StationPlcConfig stationSlug="sterilizer" user={user} />}
            </div>
            <div style={{ display: viewPlcConfig ? "none" : "block", height: "100%", width: "100%" }}>
              <SterilizerCalibrationView configMode={isXooraUnlocked} />
            </div>
          </>
        );
      }
      if (category === "Instrument Calibration" && stationMatch === "Press Station") {
        const StationPlcConfig = STATION_PLC_CONFIG_MAP["Press Station"];
        return (
          <>
            <div style={{ display: viewPlcConfig ? "block" : "none", height: "100%", width: "100%" }}>
              {StationPlcConfig && <StationPlcConfig stationSlug="press" user={user} />}
            </div>
            <div style={{ display: viewPlcConfig ? "none" : "block", height: "100%", width: "100%" }}>
              <PressCalibrationView configMode={isXooraUnlocked} />
            </div>
          </>
        );
      }
      if (category === "Instrument Calibration" && stationMatch === "Threshing Station") {
        const StationPlcConfig = STATION_PLC_CONFIG_MAP["Threshing Station"];
        return (
          <>
            <div style={{ display: viewPlcConfig ? "block" : "none", height: "100%", width: "100%" }}>
              {StationPlcConfig && <StationPlcConfig stationSlug="threshing" user={user} />}
            </div>
            <div style={{ display: viewPlcConfig ? "none" : "block", height: "100%", width: "100%" }}>
              <ThreshingCalibrationView configMode={isXooraUnlocked} />
            </div>
          </>
        );
      }
      if (category === "Instrument Calibration" && stationMatch === "Kernel Plant") {
        const StationPlcConfig = STATION_PLC_CONFIG_MAP["Kernel Plant"];
        return (
          <>
            <div style={{ display: viewPlcConfig ? "block" : "none", height: "100%", width: "100%" }}>
              {StationPlcConfig && <StationPlcConfig stationSlug="kernel-plant" user={user} />}
            </div>
            <div style={{ display: viewPlcConfig ? "none" : "block", height: "100%", width: "100%" }}>
              <KernelCalibrationView configMode={isXooraUnlocked} />
            </div>
          </>
        );
      }

      if (stationMatch === "Boiler House") {
        return (
          <MaintenanceHub
            station="Boiler House"
            initialTab={targetTab || "spare-part"}
          />
        );
      }
    }

    // Priority 3: Station Pages — cek dari page map
    const StationComponent = STATION_PAGE_MAP[activeSubmenu];
    if (StationComponent) {
      const stationSlug =
        stations.find((s) => s.title === activeSubmenu)?.slug ||
        (activeSubmenu === "Press Station" ? "press" :
          activeSubmenu === "Kernel Plant" ? "kernel-plant" :
            activeSubmenu === "Threshing Station" ? "threshing" :
              activeSubmenu === "Boiler House" ? "boiler-house" : "sterilizer");
      const StationPlcConfig = STATION_PLC_CONFIG_MAP[activeSubmenu];

      if (StationPlcConfig && StationPlcConfig !== ComingSoonPage) {
        const isShowConfigPage = activeSubmenu === "Security" ? isCamConfigOpen : viewPlcConfig;
        return (
          <>
            <div style={{ display: isShowConfigPage ? "block" : "none", height: "100%", width: "100%" }}>
              <StationPlcConfig key={stationSlug} stationSlug={stationSlug} user={user} />
            </div>
            <div style={{ display: isShowConfigPage ? "none" : "block", height: "100%", width: "100%" }}>
              <div
                className={`som-station-container ${(user?.userRole?.toLowerCase() === 'developer' || user?.role?.toLowerCase() === 'developer' || (user?.permissions || []).includes(`Setting:${activeSubmenu}`))
                  ? 'has-setting-permission'
                  : 'no-setting-permission'
                  }`}
                style={{ height: '100%' }}
              >
                <StationComponent
                  user={user}
                  onSelectSubmenu={handleSelectSubmenu}
                  configMode={isXooraUnlocked}
                  isCamConfigOpen={isCamConfigOpen}
                  setIsCamConfigOpen={setIsCamConfigOpen}
                />
              </div>
            </div>
          </>
        );
      }
      return (
        <div
          className={`som-station-container ${(user?.userRole?.toLowerCase() === 'developer' || user?.role?.toLowerCase() === 'developer' || (user?.permissions || []).includes(`Setting:${activeSubmenu}`))
            ? 'has-setting-permission'
            : 'no-setting-permission'
            }`}
          style={{ height: '100%' }}
        >
          <StationComponent
            user={user}
            onSelectSubmenu={handleSelectSubmenu}
            configMode={isXooraUnlocked}
            isCamConfigOpen={isCamConfigOpen}
            setIsCamConfigOpen={setIsCamConfigOpen}
          />
        </div>
      );
    }

    // Non-station pages (alarm, report, etc) — tetap hardcoded
    if (activeSubmenu === "User Management") {
      const isDev = (user?.userRole?.toLowerCase() === "developer") || (user?.role?.toLowerCase() === "developer") || (user?.username === "dev");
      if (!isDev) return <ComingSoonPage title="Access Denied" />;
      return <UserManagementPage user={user} />;
    }
    if (activeSubmenu === "PLC Configuration") {
      if (
        user?.userRole?.toLowerCase() !== "developer" &&
        user?.role?.toLowerCase() !== "developer"
      )
        return <ComingSoonPage title="Access Denied" />;
      const firstStation = stations.length > 0 ? stations[0] : null;
      if (firstStation) {
        const PlcComp = STATION_PLC_CONFIG_MAP[firstStation.title];
        if (PlcComp) return <PlcComp stationSlug={firstStation.slug} />;
      }
      return <ComingSoonPage title="No stations available" />;
    }
    if (activeSubmenu === "System Configuration") {
      if (
        user?.userRole?.toLowerCase() !== "developer" &&
        user?.role?.toLowerCase() !== "developer"
      )
        return <ComingSoonPage title="Access Denied" />;
      return <SystemSettingsPage user={user} />;
    }
    if (activeSubmenu === "User Login" || activeSubmenu === "Settings Changes")
      return <ActivityLogPage type={activeSubmenu} user={user} />;
    if (activeSubmenu === "Alarm Center") return <AlarmListView user={user} />;
    if (activeSubmenu === "Notification Settings")
      return <NotifSettingsView user={user} />;
    if (activeSubmenu === "System Error")
      return <SystemErrorPage user={user} />;
    if (activeSubmenu === "Internet Error")
      return <InternetErrorPage user={user} />;
    if (activeSubmenu === "Instrument Error")
      return <InstrumentErrorPage user={user} />;
    if (activeSubmenu === "Power Error") return <PowerErrorPage user={user} />;
    if (activeSubmenu === "Breakdown") return <BreakdownPage user={user} />;
    if (activeSubmenu === "Process Disturbance")
      return <ProcessDisturbancePage user={user} />;
    if (activeSubmenu === "Running Hours")
      return <RunningHoursPage user={user} />;
    if (activeSubmenu === "Daily Report Abnormalities")
      return <DailyAbnormalitiesPage user={user} />;
    if (activeSubmenu === "Daily Report Mill Stability")
      return <MillStabilityPage user={user} />;
    if (activeSubmenu === "Developer") return <DeveloperPage user={user} />;
    if (activeSubmenu === "Site Owner") return <ContactListView user={user} />;

    return <ComingSoonPage title={activeSubmenu} />;
  };

  return (
    <div className="som-dashboard-shell">
      <DashboardHeader
        user={user}
        activeMenu={activeMenu}
        activeSubmenu={activeSubmenu}
        onSelectSubmenu={handleSelectSubmenu}
        onMenuClick={handleMenuClick}
        onLogoutSuccess={onLogoutSuccess}
        onProfileUpdate={onProfileUpdate}
        isSystemMenuUnlocked={isSystemMenuUnlocked}
      />
      <main className="som-dashboard-main">{renderPage()}</main>

      {(user?.userRole?.toLowerCase() === "developer" ||
        user?.role?.toLowerCase() === "developer") &&
        isXooraUnlocked && (
          <>
            {activeSubmenu === "Security" && (user?.id === 5 || user?.user_id === 5 || user?.userRole?.toLowerCase() === "developer" || user?.role?.toLowerCase() === "developer") && (
              <button
                onClick={() => setIsCamConfigOpen(!isCamConfigOpen)}
                style={{
                  position: "fixed",
                  bottom: "80px",
                  right: "24px",
                  zIndex: 9999,
                  padding: "12px 18px",
                  background: isCamConfigOpen
                    ? "#ef4444"
                    : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "9999px",
                  boxShadow:
                    "0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(16, 185, 129, 0.4)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "0.8rem",
                  fontWeight: 800,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
                  e.currentTarget.style.boxShadow =
                    "0 15px 30px -5px rgba(16, 185, 129, 0.5)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0px) scale(1)";
                  e.currentTarget.style.boxShadow =
                    "0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(16, 185, 129, 0.4)";
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {isCamConfigOpen ? "CLOSE CAM CONFIG" : "CAM CONFIG"}
              </button>
            )}

            {/* AI CAMERAS BUTTON KHUSUS STERILIZER STATION (MODE DEV CTRL+X) */}
            {(activeSubmenu === "Sterilizer Station" || activeSubmenu === "Sterilizer") && (
              <button
                onClick={() => setIsAiCamConfigOpen(!isAiCamConfigOpen)}
                style={{
                  position: "fixed",
                  bottom: "80px",
                  right: "24px",
                  zIndex: 9999,
                  padding: "12px 18px",
                  background: isAiCamConfigOpen
                    ? "#ef4444"
                    : "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "9999px",
                  boxShadow:
                    "0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(14, 165, 233, 0.4)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "0.8rem",
                  fontWeight: 800,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
                  e.currentTarget.style.boxShadow =
                    "0 15px 30px -5px rgba(14, 165, 233, 0.5)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0px) scale(1)";
                  e.currentTarget.style.boxShadow =
                    "0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(14, 165, 233, 0.4)";
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {isAiCamConfigOpen ? "CLOSE AI CAMERAS" : "AI CAMERAS"}
              </button>
            )}

            {/* Modal Dialog AI Cameras */}
            <AiCameraConfigModal
              isOpen={isAiCamConfigOpen}
              onClose={() => setIsAiCamConfigOpen(false)}
            />

            <button
              onClick={() => setViewPlcConfig(!viewPlcConfig)}
              style={{
                position: "fixed",
                bottom: "24px",
                right: "24px",
                zIndex: 9999,
                padding: "12px 18px",
                background: viewPlcConfig
                  ? "#ef4444"
                  : "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                color: "#fff",
                border: "none",
                borderRadius: "9999px",
                boxShadow:
                  "0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "0.8rem",
                fontWeight: 800,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
                e.currentTarget.style.boxShadow =
                  "0 15px 30px -5px rgba(0, 0, 0, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0px) scale(1)";
                e.currentTarget.style.boxShadow =
                  "0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)";
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
              </svg>
              {viewPlcConfig ? "CLOSE" : "PLC INTEGRATION"}
            </button>
          </>
        )}
    </div>
  );
}

export default DashboardPage;
