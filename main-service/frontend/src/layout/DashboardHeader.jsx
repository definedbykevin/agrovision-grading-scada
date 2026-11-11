import { useState, useEffect } from "react";
import "../core/theme/dashboard.css";
import agrovisionLogo from "../core/layout/assets/agrovision.png";
import premierLogo from "../core/layout/assets/premier.png";

const MENU_ITEMS = [
  "Dashboard",
  "Overview",
  "Station View",
  "Maintenance",
  "Logsheet",
  "Activity Log",
  "Alarm",
  "Report",
  "Contacts",
];

function DashboardHeader({
  user,
  activeMenu,
  activeSubmenu,
  onSelectSubmenu,
  onMenuClick,
  onLogoutSuccess,
  onProfileUpdate,
  isSystemMenuUnlocked,
}) {
  const [openDropdown, setOpenDropdown] = useState(null);
  const [nestedMenu, setNestedMenu] = useState(null);
  const [doubleNestedMenu, setDoubleNestedMenu] = useState(null);
  const [tripleNestedMenu, setTripleNestedMenu] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Fullscreen state and handler
  const [isFullscreen, setIsFullscreen] = useState(() => (typeof document !== 'undefined' ? !!document.fullscreenElement : false));

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);
    document.addEventListener("mozfullscreenchange", handleFsChange);
    document.addEventListener("MSFullscreenChange", handleFsChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("webkitfullscreenchange", handleFsChange);
      document.removeEventListener("mozfullscreenchange", handleFsChange);
      document.removeEventListener("MSFullscreenChange", handleFsChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.mozFullScreenElement && !document.msFullscreenElement) {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(() => {});
      } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen();
      } else if (docEl.mozRequestFullScreen) {
        docEl.mozRequestFullScreen();
      } else if (docEl.msRequestFullscreen) {
        docEl.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  };

  // Modal State for Change Password
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Profile edit states
  const [username, setUsername] = useState(user?.username || "");
  const [positionTitle, setPositionTitle] = useState(user?.positionTitle || "");
  const [companyName, setCompanyName] = useState(user?.companyName || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");

  const [machineryStations, setMachineryStations] = useState([]);
  const [rawMachineryData, setRawMachineryData] = useState([]);

  // Modal state for Add Machine / Add Part
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalInput, setModalInput] = useState("");
  const [modalCallback, setModalCallback] = useState(null);

  // Fetch stations data from API for dynamic dropdown
  const [stations, setStations] = useState([]);
  const [unlockedSlugs, setUnlockedSlugs] = useState([]);

  useEffect(() => {
    fetch("/api/config/stations")
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setStations(res.data);
          setUnlockedSlugs(
            res.data.filter((s) => s.is_active).map((s) => s.title),
          );
        }
      })
      .catch((err) =>
        console.error("[DashboardHeader] Failed to fetch stations:", err),
      );
  }, []);

  // Build dynamic dropdown items from stations data
  const stationTitles = stations.map((s) => s.title);

  const DROPDOWN_ITEMS = {
    "Station View": stationTitles,
    Maintenance: [
      { label: "Spare Part Replacement", children: stationTitles },
      { label: "O&G Replacement", children: stationTitles },
      { label: "Instrument Calibration", children: stationTitles },
    ],
    Logsheet: stationTitles,
    "Activity Log": ["User Login", "Settings Changes"],
    Alarm: [
      "Alarm Center",
      "Notification Settings",
      "System Error",
      "Internet Error",
      "Instrument Error",
      "Power Error",
      "Breakdown",
      "Process Disturbance",
    ],
    Report: [
      "Running Hours",
      "Daily Report Abnormalities",
      "Daily Report Mill Stability",
    ],
    Contacts: ["Developer", "Site Owner"],
    System: ["User Management", "System Configuration"],
  };

  const DROPDOWN_GROUPS = new Set(Object.keys(DROPDOWN_ITEMS));

  const isDev = ["developer"].includes(user?.userRole?.toLowerCase() || user?.role?.toLowerCase() || "");
  const dynamicMenuItems = (isDev || isSystemMenuUnlocked) ? [...MENU_ITEMS, "System"] : MENU_ITEMS;

  const hasPermission = (parent, submenu) => {
    const roleLower = user?.userRole?.toLowerCase() || user?.role?.toLowerCase() || "";
    if (roleLower === "developer") return true;
    
    const key = `${parent}:${submenu}`;
    const perms = user?.permissions || [];
    return perms.includes(key);
  };

  const isMenuLocked = (menuName) => {
    const roleLower = user?.userRole?.toLowerCase() || user?.role?.toLowerCase() || "";
    if (roleLower === "developer") return false;

    if (menuName === "Dashboard") {
      return !hasPermission("Dashboard", "Production Dashboard");
    }
    if (menuName === "Overview") {
      return !hasPermission("Overview", "3D Plant View");
    }

    // Do not lock main menus that have submenus. 
    return false;
  };

  const canManageUsers = (user?.userRole?.toLowerCase() === "developer" || user?.role?.toLowerCase() === "developer" || user?.username === "dev");

  const LockIcon = () => (
    <svg
      stroke="currentColor"
      fill="currentColor"
      strokeWidth="0"
      viewBox="0 0 448 512"
      height="12px"
      width="12px"
      xmlns="http://www.w3.org/2000/svg"
      style={{ marginLeft: "auto", color: "#d4ac0d" }}
    >
      <path d="M400 224h-24v-72C376 68.4 307.6 0 224 0S72 68.4 72 152v72H48c-26.5 0-48 21.5-48 48v192c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V272c0-26.5-21.5-48-48-48zm-104 0H152v-72c0-39.7 32.3-72 72-72s72 32.3 72 72v72z"></path>
    </svg>
  );

  // Fetch machinery data from backend on mount
  const fetchMachineryData = async () => {
    try {
      const token = localStorage.getItem("kip_token");
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch("/api/maintenance/machinery/all", {
        credentials: "include",
        headers,
      });
      const result = await res.json();
      if (result.success) {
        setRawMachineryData(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch machinery data:", error);
    }
  };

  // Merge raw machinery data with stationTitles setiap kali salah satu berubah
  useEffect(() => {
    const grouped = {};
    rawMachineryData.forEach((row) => {
      if (!grouped[row.station_name]) {
        grouped[row.station_name] = [];
      }
      grouped[row.station_name].push({
        label: row.machine_name,
        id: row.id,
        children: (row.parts || []).map((p) => ({
          label: p.part_name,
          id: p.id,
          isLeaf: true,
        })),
      });
    });
    // Tampilkan SEMUA stasiun, merge dengan data mesin dari API
    const titles = stations.map((s) => s.title);
    const formatted = titles.map((title) => ({
      label: title,
      children: grouped[title] || [],
    }));
    setMachineryStations(formatted);
  }, [rawMachineryData, stations]);

  useEffect(() => {
    fetchMachineryData();
  }, []);

  const handleAddMachine = async (stationLabel) => {
    setModalTitle(`Add Machine for ${stationLabel}`);
    setModalInput("");
    setModalCallback(() => async (name) => {
      if (!name || !name.trim()) return;
      const token = localStorage.getItem("kip_token");
      try {
        const res = await fetch("/api/maintenance/machinery/machines/add", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
          body: JSON.stringify({
            station_name: stationLabel,
            machine_name: name.trim(),
          }),
        });
        const result = await res.json();
        if (result.success) {
          fetchMachineryData();
          setShowModal(false);
        } else {
          alert("Failed: " + (result.error || result.message));
        }
      } catch (err) {
        alert("Error: " + err.message);
      }
    });
    setShowModal(true);
  };

  const handleAddPart = async (machineId, machineLabel) => {
    setModalTitle(`Add Part for ${machineLabel}`);
    setModalInput("");
    setModalCallback(() => async (name) => {
      if (!name || !name.trim()) return;
      const token = localStorage.getItem("kip_token");
      try {
        const res = await fetch("/api/maintenance/machinery/parts/add", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
          body: JSON.stringify({ machineId, partName: name.trim() }),
        });
        const result = await res.json();
        if (result.success) {
          fetchMachineryData();
          setShowModal(false);
        } else {
          alert("Failed: " + (result.error || result.message));
        }
      } catch (err) {
        alert("Error: " + err.message);
      }
    });
    setShowModal(true);
  };

  // Delete machine — uses modal confirmation
  const handleDeleteMachine = async (machineId, machineLabel) => {
    setModalTitle(
      `Please type "${machineLabel}" to confirm deletion of this machine.`,
    );
    setModalInput("");
    setModalCallback(() => async (input) => {
      if (input.trim() !== machineLabel) {
        alert(
          `Incorrect name. Please type "${machineLabel}" exactly to confirm.`,
        );
        return;
      }
      const token = localStorage.getItem("kip_token");
      try {
        const res = await fetch(
          `/api/maintenance/machinery/machines/${machineId}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
            credentials: "include",
          },
        );
        const result = await res.json();
        if (result.success) {
          fetchMachineryData();
          setShowModal(false);
        } else {
          alert("Failed: " + (result.error || result.message));
        }
      } catch (err) {
        alert("Error: " + err.message);
      }
    });
    setShowModal(true);
  };

  // Delete part — uses modal confirmation
  const handleDeletePart = async (machineId, partId, partLabel) => {
    setModalTitle(
      `Please type "${partLabel}" to confirm deletion of this part.`,
    );
    setModalInput("");
    setModalCallback(() => async (input) => {
      if (input.trim() !== partLabel) {
        alert(`Incorrect name. Please type "${partLabel}" exactly to confirm.`);
        return;
      }
      const token = localStorage.getItem("kip_token");
      try {
        const res = await fetch(
          `/api/maintenance/machinery/parts/${machineId}/${partId}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
            credentials: "include",
          },
        );
        const result = await res.json();
        if (result.success) {
          fetchMachineryData();
          setShowModal(false);
        } else {
          alert("Failed: " + (result.error || result.message));
        }
      } catch (err) {
        alert("Error: " + err.message);
      }
    });
    setShowModal(true);
  };

  const getDropdownItems = (item) => {
    if (item === "Maintenance") {
      // Fallback ke stationTitles jika data machinery kosong
      const maintenanceStations =
        machineryStations.length > 0
          ? machineryStations
          : stationTitles.map((s) => ({ label: s, children: [] }));

      return [
        {
          label: "Machinery List",
          children: maintenanceStations,
        },
        // Spare Part Replacement: Station -> Machine -> Part
        {
          label: "Spare Part Replacement",
          children: maintenanceStations.map((station) => ({
            label: station.label,
            children: station.children.map((machine) => ({
              label: machine.label,
              id: machine.id,
              children: (machine.children || []).map((part) => ({
                label: part.label,
                isLeaf: true,
              })),
            })),
          })),
        },
        // O&G Replacement: Station -> Machine
        {
          label: "O&G Replacement",
          children: maintenanceStations.map((station) => ({
            label: station.label,
            children: station.children.map((machine) => ({
              label: machine.label,
              id: machine.id,
              isLeaf: true,
            })),
          })),
        },
        { label: "Instrument Calibration", children: stationTitles },
      ];
    }
    return DROPDOWN_ITEMS[item];
  };

  useEffect(() => {
    if (!isEditingProfile) {
      setUsername(user?.username || "");
      setPositionTitle(user?.positionTitle || "");
      setCompanyName(user?.companyName || "");
    }

    const handleClickOutside = () => {
      setOpenDropdown(null);
      setNestedMenu(null);
      setDoubleNestedMenu(null);
      setTripleNestedMenu(null);
      setShowProfileMenu(false);
    };

    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, [user, isEditingProfile]);

  const handleMenuClick = (e, item) => {
    if (DROPDOWN_GROUPS.has(item)) {
      e.preventDefault();
      e.stopPropagation();
      setOpenDropdown((prev) => (prev === item ? null : item));
      setNestedMenu(null);
      setDoubleNestedMenu(null);
      setTripleNestedMenu(null);
      return;
    }

    if (onMenuClick) onMenuClick(item);

    setOpenDropdown(null);
    setNestedMenu(null);
    setDoubleNestedMenu(null);
    setTripleNestedMenu(null);
  };

  const handleMenuHover = (item) => {
    if (DROPDOWN_GROUPS.has(item)) {
      setOpenDropdown(item);
    }
  };

  return (
    <header className="som-dashboard-header">
      <div className="som-dashboard-header-top">
        <div className="som-dashboard-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #047857 0%, #065f46 100%)',
              color: '#ffffff',
              fontWeight: 900,
              fontSize: '0.9rem',
              letterSpacing: '0.05em',
              boxShadow: '0 2px 4px rgba(4,120,87,0.25)'
            }}>AV</span>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
              <span style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '0.08em', color: '#0f172a' }}>
                AGROVISION <span style={{ color: '#059669', fontWeight: 700, fontSize: '0.8rem' }}>// Industrial AI SCADA</span>
              </span>
              <span style={{ fontSize: '0.62rem', color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 600 }}>
                Next-Gen Palm Oil Mill Automation &amp; Grading System
              </span>
            </div>
          </div>
        </div>
        <div className="som-dashboard-logos-right">
          <a
            href="https://github.com/definedbykevin"
            target="_blank"
            rel="noopener noreferrer"
            title="Portfolio of definedbykevin"
            style={{
              textDecoration: 'none',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              fontWeight: 700,
              fontSize: '0.82rem',
              padding: '6px 14px',
              borderRadius: '6px',
              background: '#0f172a',
              color: '#38bdf8',
              border: '1px solid #334155',
              boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              letterSpacing: '0.05em',
              transition: 'all 0.2s ease',
              cursor: 'pointer'
            }}
          >
            &lt; &#123;definedbykevin&#125; /&gt;
          </a>
        </div>
      </div>
      <nav className="som-dashboard-nav">
        <ul
          className="som-dashboard-menu"
          onMouseLeave={() => {
            setOpenDropdown(null);
            setNestedMenu(null);
            setDoubleNestedMenu(null);
            setTripleNestedMenu(null);
          }}
        >
          {dynamicMenuItems.map((item) => {
            const isActive = activeMenu === item;
            const isOpen = openDropdown === item && getDropdownItems(item);
            const isLockedMenu = isMenuLocked(item);

            return (
              <li key={item} className="som-dashboard-menu-item">
                <button
                  type="button"
                  className={`som-dashboard-menu-button ${isActive ? "som-dashboard-menu-button--active" : ""} ${isLockedMenu ? "som-dashboard-menu-button--locked" : ""}`}
                  onClick={(e) => {
                    if (isLockedMenu) return;
                    handleMenuClick(e, item);
                  }}
                  onMouseEnter={() => {
                    if (isLockedMenu) return;
                    handleMenuHover(item);
                  }}
                  disabled={isLockedMenu}
                  style={{
                    cursor: isLockedMenu ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  {item.toUpperCase()}
                  {isLockedMenu && <LockIcon />}
                </button>
                {isOpen && (
                  <div
                    className="som-dashboard-dropdown"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="som-dashboard-dropdown-inner">
                      {getDropdownItems(item).map((itemValue) => {
                        const label =
                          typeof itemValue === "object"
                            ? itemValue.label
                            : itemValue;
                        const hasChildren =
                          typeof itemValue === "object" && itemValue.children;

                        const isStation = stationTitles.includes(label);
                        const isLockedStation =
                          isStation && !unlockedSlugs.includes(label);
                        const isLockedSubmenu = !hasPermission(item, label);
                        const isSubmenuDisabled = isLockedStation || isLockedSubmenu;

                        return (
                          <div
                            key={label}
                            className="som-dropdown-item-wrapper"
                            onMouseEnter={() =>
                              hasChildren && !isSubmenuDisabled
                                ? setNestedMenu(label)
                                : setNestedMenu(null)
                            }
                          >
                            <button
                              type="button"
                              className={`som-dashboard-dropdown-item ${hasChildren ? "has-nested" : ""} ${nestedMenu === label ? "nested-active" : ""} ${isSubmenuDisabled ? "som-dashboard-dropdown-item--locked" : ""}`}
                              disabled={isSubmenuDisabled}
                              onClick={() => {
                                if (hasChildren) {
                                  setNestedMenu((prev) =>
                                    prev === label ? null : label,
                                  );
                                } else if (!isSubmenuDisabled) {
                                  onSelectSubmenu(label, item);
                                  setOpenDropdown(null);
                                }
                              }}
                              style={
                                isSubmenuDisabled
                                  ? {
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      width: "100%",
                                      gap: "8px",
                                    }
                                  : undefined
                              }
                            >
                              {isSubmenuDisabled ? (
                                <>
                                  {label}
                                  <LockIcon />
                                </>
                              ) : (
                                <>
                                  {label}
                                  {hasChildren && (
                                    <span className="nested-arrow">›</span>
                                  )}
                                </>
                              )}
                            </button>

                            {hasChildren && nestedMenu === label && (
                              <div className="som-nested-dropdown">
                                <div className="som-dashboard-dropdown-inner">
                                  {itemValue.children.map(
                                    (childValue, childIdx) => {
                                      const childLabel =
                                        typeof childValue === "object"
                                          ? childValue.label
                                          : childValue;
                                      const childHasChildren =
                                        typeof childValue === "object" &&
                                        childValue.children;
                                      const isLockedChildStation =
                                        stationTitles.includes(childLabel) &&
                                        !unlockedSlugs.includes(childLabel);
                                      const isBottomHalf =
                                        childIdx >=
                                        itemValue.children.length / 2;

                                      return (
                                        <div
                                          key={childLabel}
                                          className="som-dropdown-item-wrapper"
                                          onMouseEnter={() =>
                                            childHasChildren &&
                                            !isLockedChildStation
                                              ? setDoubleNestedMenu(childLabel)
                                              : setDoubleNestedMenu(null)
                                          }
                                        >
                                          <button
                                            type="button"
                                            className={`som-dashboard-dropdown-item ${childHasChildren ? "has-nested" : ""} ${doubleNestedMenu === childLabel ? "nested-active" : ""} ${isLockedChildStation ? "som-dashboard-dropdown-item--locked" : ""}`}
                                            disabled={isLockedChildStation}
                                            onClick={() => {
                                              if (childHasChildren) return;
                                              if (!isLockedChildStation) {
                                                const tabMap = {
                                                  "Machinery List":
                                                    "machinery-list",
                                                  "Spare Part Replacement":
                                                    "spare-part",
                                                  "O&G Replacement": "og",
                                                  "Instrument Calibration":
                                                    "calib",
                                                };
                                                const targetTab =
                                                  tabMap[label] || "spare-part";
                                                onSelectSubmenu(
                                                  `${label} - ${childLabel}|${targetTab}`,
                                                  item,
                                                );
                                                setOpenDropdown(null);
                                                setNestedMenu(null);
                                                setDoubleNestedMenu(null);
                                                setTripleNestedMenu(null);
                                              }
                                            }}
                                            style={
                                              isLockedChildStation
                                                ? {
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent:
                                                      "space-between",
                                                    width: "100%",
                                                    gap: "8px",
                                                  }
                                                : undefined
                                            }
                                          >
                                            {isLockedChildStation ? (
                                              <>
                                                {childLabel}
                                                <LockIcon />
                                              </>
                                            ) : (
                                              <>
                                                {childLabel}
                                                {childHasChildren && (
                                                  <span className="nested-arrow">
                                                    ›
                                                  </span>
                                                )}
                                              </>
                                            )}
                                          </button>

                                          {childHasChildren &&
                                            doubleNestedMenu === childLabel &&
                                            !isLockedChildStation && (
                                              <div
                                                className={`som-nested-dropdown level-4 ${isBottomHalf ? "som-nested-dropdown-bottom" : ""} ${childLabel === "Kernel Plant" ? "som-nested-dropdown-kernel" : ""}`}
                                                style={{
                                                  height: "fit-content",
                                                  alignSelf: "flex-start",
                                                }}
                                              >
                                                <div
                                                  className="som-dashboard-dropdown-inner"
                                                  style={{
                                                    width: "220px",
                                                    minWidth: 220,
                                                    maxWidth: "220px",
                                                    height: "fit-content",
                                                  }}
                                                >
                                                  {childValue.children
                                                    .length === 0 ? (
                                                    <div
                                                      className="som-no-data"
                                                      style={{
                                                        minHeight: 0,
                                                        padding:
                                                          "0.4rem 0.5rem",
                                                      }}
                                                    >
                                                      {label ===
                                                      "Machinery List" ? (
                                                        <>
                                                          No machines yet
                                                          <div className="som-dropdown-divider" />
                                                          <button
                                                            type="button"
                                                            className="som-add-machine-btn"
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              handleAddMachine(
                                                                childLabel,
                                                              );
                                                            }}
                                                          >
                                                            + Add Machine
                                                          </button>
                                                        </>
                                                      ) : (
                                                        "No machines yet"
                                                      )}
                                                    </div>
                                                  ) : (
                                                    <div
                                                      className={
                                                        childLabel ===
                                                          "Kernel Plant" ||
                                                        childLabel ===
                                                          "Boiler House"
                                                          ? "som-dropdown-scrollable-list"
                                                          : ""
                                                      }
                                                      style={
                                                        childLabel ===
                                                          "Kernel Plant" ||
                                                        childLabel ===
                                                          "Boiler House"
                                                          ? {
                                                              maxHeight:
                                                                "350px",
                                                              overflowY: "auto",
                                                              paddingRight:
                                                                "4px",
                                                            }
                                                          : undefined
                                                      }
                                                    >
                                                      {childValue.children.map(
                                                        (gChild, gIdx) => {
                                                          const gChildLabel =
                                                            typeof gChild ===
                                                            "object"
                                                              ? gChild.label
                                                              : gChild;
                                                          const gChildId =
                                                            typeof gChild ===
                                                            "object"
                                                              ? gChild.id
                                                              : null;
                                                          const gChildHasChildren =
                                                            typeof gChild ===
                                                              "object" &&
                                                            gChild.children;
                                                          const isGChildBottomHalf =
                                                            gIdx >=
                                                            childValue.children
                                                              .length /
                                                              2;

                                                          return (
                                                            <div
                                                              key={gChildLabel}
                                                              className="som-dropdown-item-wrapper"
                                                              onMouseEnter={() =>
                                                                gChildHasChildren
                                                                  ? setTripleNestedMenu(
                                                                      gChildLabel,
                                                                    )
                                                                  : setTripleNestedMenu(
                                                                      null,
                                                                    )
                                                              }
                                                            >
                                                              <button
                                                                type="button"
                                                                className={`som-dashboard-dropdown-item ${gChildHasChildren ? "has-nested" : ""} ${tripleNestedMenu === gChildLabel ? "nested-active" : ""}`}
                                                                onClick={() => {
                                                                  if (
                                                                    gChildHasChildren
                                                                  )
                                                                    return;
                                                                  const targetTab =
                                                                    "machinery-list";
                                                                  onSelectSubmenu(
                                                                    `${label} - ${childLabel} - ${gChildLabel}|${targetTab}`,
                                                                    item,
                                                                  );
                                                                  setOpenDropdown(
                                                                    null,
                                                                  );
                                                                  setNestedMenu(
                                                                    null,
                                                                  );
                                                                  setDoubleNestedMenu(
                                                                    null,
                                                                  );
                                                                  setTripleNestedMenu(
                                                                    null,
                                                                  );
                                                                }}
                                                              >
                                                                <span
                                                                  style={{
                                                                    display:
                                                                      "flex",
                                                                    alignItems:
                                                                      "center",
                                                                    gap: "0.4rem",
                                                                  }}
                                                                >
                                                                  {label ===
                                                                    "Machinery List" &&
                                                                    gChildId && (
                                                                      <span
                                                                        onClick={(
                                                                          e,
                                                                        ) => {
                                                                          e.stopPropagation();
                                                                          handleDeleteMachine(
                                                                            gChildId,
                                                                            gChildLabel,
                                                                          );
                                                                        }}
                                                                        title="Delete machine"
                                                                        style={{
                                                                          cursor:
                                                                            "pointer",
                                                                          fontSize:
                                                                            "0.8rem",
                                                                          marginRight:
                                                                            "6px",
                                                                        }}
                                                                      >
                                                                        <svg
                                                                          width="12"
                                                                          height="12"
                                                                          viewBox="0 0 24 24"
                                                                          fill="none"
                                                                          stroke="currentColor"
                                                                          stroke-width="2"
                                                                          stroke-linecap="round"
                                                                          stroke-linejoin="round"
                                                                        >
                                                                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                                        </svg>
                                                                      </span>
                                                                    )}
                                                                  {gChildLabel}
                                                                </span>
                                                                {gChildHasChildren && (
                                                                  <span className="nested-arrow">
                                                                    ›
                                                                  </span>
                                                                )}
                                                              </button>

                                                              {gChildHasChildren &&
                                                                tripleNestedMenu ===
                                                                  gChildLabel && (
                                                                  <div
                                                                    className={`som-nested-dropdown level-5 ${isGChildBottomHalf ? "som-nested-dropdown-bottom" : ""}`}
                                                                    style={{
                                                                      height:
                                                                        "fit-content",
                                                                      alignSelf:
                                                                        "flex-start",
                                                                    }}
                                                                  >
                                                                    <div
                                                                      className="som-dashboard-dropdown-inner"
                                                                      style={{
                                                                        width:
                                                                          "220px",
                                                                        minWidth: 220,
                                                                        maxWidth:
                                                                          "220px",
                                                                        height:
                                                                          "fit-content",
                                                                      }}
                                                                    >
                                                                      {!gChild.children ||
                                                                      gChild
                                                                        .children
                                                                        .length ===
                                                                        0 ? (
                                                                        <div
                                                                          className="som-no-data"
                                                                          style={{
                                                                            minHeight: 0,
                                                                            padding:
                                                                              "0.4rem 0.5rem",
                                                                          }}
                                                                        >
                                                                          {label ===
                                                                          "Machinery List" ? (
                                                                            <>
                                                                              No
                                                                              parts
                                                                              yet
                                                                              <div className="som-dropdown-divider" />
                                                                              <button
                                                                                type="button"
                                                                                className="som-add-machine-btn"
                                                                                onClick={(
                                                                                  e,
                                                                                ) => {
                                                                                  e.stopPropagation();
                                                                                  handleAddPart(
                                                                                    gChildId,
                                                                                    gChildLabel,
                                                                                  );
                                                                                }}
                                                                              >
                                                                                +
                                                                                Add
                                                                                Part
                                                                              </button>
                                                                            </>
                                                                          ) : (
                                                                            "No parts yet"
                                                                          )}
                                                                        </div>
                                                                      ) : (
                                                                        gChild.children.map(
                                                                          (
                                                                            ggChild,
                                                                          ) => {
                                                                            const ggChildLabel =
                                                                              typeof ggChild ===
                                                                              "object"
                                                                                ? ggChild.label
                                                                                : ggChild;
                                                                            const ggChildId =
                                                                              typeof ggChild ===
                                                                              "object"
                                                                                ? ggChild.id
                                                                                : null;
                                                                            const ggChildHasChildren =
                                                                              typeof ggChild ===
                                                                                "object" &&
                                                                              ggChild.children;

                                                                            return (
                                                                              <div
                                                                                key={
                                                                                  ggChildLabel
                                                                                }
                                                                                className="som-dropdown-item-wrapper"
                                                                              >
                                                                                <button
                                                                                  type="button"
                                                                                  className={`som-dashboard-dropdown-item ${ggChildHasChildren ? "has-nested" : ""}`}
                                                                                  onClick={() => {
                                                                                    if (
                                                                                      ggChildHasChildren
                                                                                    )
                                                                                      return;
                                                                                    const targetTab =
                                                                                      "machinery-list";
                                                                                    onSelectSubmenu(
                                                                                      `${label} - ${childLabel} - ${gChildLabel} - ${ggChildLabel}|${targetTab}`,
                                                                                      item,
                                                                                    );
                                                                                    setOpenDropdown(
                                                                                      null,
                                                                                    );
                                                                                    setNestedMenu(
                                                                                      null,
                                                                                    );
                                                                                    setDoubleNestedMenu(
                                                                                      null,
                                                                                    );
                                                                                    setTripleNestedMenu(
                                                                                      null,
                                                                                    );
                                                                                  }}
                                                                                >
                                                                                  <span
                                                                                    style={{
                                                                                      display:
                                                                                        "flex",
                                                                                      alignItems:
                                                                                        "center",
                                                                                      gap: "0.4rem",
                                                                                    }}
                                                                                  >
                                                                                    {label ===
                                                                                      "Machinery List" &&
                                                                                      gChildId &&
                                                                                      ggChildId && (
                                                                                        <span
                                                                                          onClick={(
                                                                                            e,
                                                                                          ) => {
                                                                                            e.stopPropagation();
                                                                                            handleDeletePart(
                                                                                              gChildId,
                                                                                              ggChildId,
                                                                                              ggChildLabel,
                                                                                            );
                                                                                          }}
                                                                                          title="Delete part"
                                                                                          style={{
                                                                                            cursor:
                                                                                              "pointer",
                                                                                            fontSize:
                                                                                              "0.8rem",
                                                                                            marginRight:
                                                                                              "6px",
                                                                                          }}
                                                                                        >
                                                                                          <svg
                                                                                            width="12"
                                                                                            height="12"
                                                                                            viewBox="0 0 24 24"
                                                                                            fill="none"
                                                                                            stroke="currentColor"
                                                                                            stroke-width="2"
                                                                                            stroke-linecap="round"
                                                                                            stroke-linejoin="round"
                                                                                          >
                                                                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                                                          </svg>
                                                                                        </span>
                                                                                      )}
                                                                                    {
                                                                                      ggChildLabel
                                                                                    }
                                                                                  </span>
                                                                                  {ggChildHasChildren && (
                                                                                    <span className="nested-arrow">
                                                                                      ›
                                                                                    </span>
                                                                                  )}
                                                                                </button>
                                                                              </div>
                                                                            );
                                                                          },
                                                                        )
                                                                      )}
                                                                      {label ===
                                                                        "Machinery List" &&
                                                                        gChild.children &&
                                                                        gChild
                                                                          .children
                                                                          .length >
                                                                          0 && (
                                                                          <>
                                                                            <div className="som-dropdown-divider" />
                                                                            <button
                                                                              type="button"
                                                                              className="som-add-machine-btn"
                                                                              onClick={(
                                                                                e,
                                                                              ) => {
                                                                                e.stopPropagation();
                                                                                handleAddPart(
                                                                                  gChildId,
                                                                                  gChildLabel,
                                                                                );
                                                                              }}
                                                                            >
                                                                              +
                                                                              Add
                                                                              Part
                                                                            </button>
                                                                          </>
                                                                        )}
                                                                    </div>
                                                                  </div>
                                                                )}
                                                            </div>
                                                          );
                                                        },
                                                      )}

                                                      {label ===
                                                        "Machinery List" && (
                                                        <>
                                                          <div className="som-dropdown-divider" />
                                                          <button
                                                            type="button"
                                                            className="som-add-machine-btn"
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              handleAddMachine(
                                                                childLabel,
                                                              );
                                                            }}
                                                          >
                                                            + Add Machine
                                                          </button>
                                                        </>
                                                      )}
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            )}
                                        </div>
                                      );
                                    },
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {user && (
          <div className="som-dashboard-nav-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {canManageUsers && (
              <button
                type="button"
                className={`som-dashboard-menu-button ${activeSubmenu === "User Management" ? "som-dashboard-menu-button--active" : ""}`}
                onClick={() => onSelectSubmenu("User Management", "System")}
                style={{
                  marginRight: "8px",
                }}
              >
                USER MANAGEMENT
              </button>
            )}
            {/* Fullscreen Toggle Button */}
            <button
              type="button"
              className={`som-fullscreen-btn ${isFullscreen ? "active" : ""}`}
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit Fullscreen (F11)" : "Fullscreen Mode (F11)"}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: isFullscreen ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.08)",
                border: isFullscreen ? "1px solid #10b981" : "1px solid rgba(255, 255, 255, 0.2)",
                color: isFullscreen ? "#10b981" : "#e2e8f0",
                cursor: "pointer",
                transition: "all 0.2s ease",
                padding: 0,
                marginRight: "4px"
              }}
            >
              {isFullscreen ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                </svg>
              )}
            </button>
            <div
              className="som-profile-wrapper"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="som-profile-button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowProfileMenu(!showProfileMenu);
                }}
              >
                <span className="som-profile-initial">
                  {(user.username || "U").charAt(0).toUpperCase()}
                </span>
              </button>
              {showProfileMenu && (
                <div className="som-profile-menu">
                  <div className="som-profile-info">
                    <span className="som-profile-name">{user.username}</span>
                    <span className="som-profile-meta">
                      {user.positionTitle}
                    </span>
                  </div>
                  <div className="som-profile-divider"></div>
                  <div className="som-profile-actions" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                      className="som-profile-secondary"
                      onClick={() => {
                        setShowProfileMenu(false);
                        setShowPasswordModal(true);
                      }}
                    >
                      Change Password
                    </button>
                    <button
                      className="som-profile-secondary"
                      onClick={() => onLogoutSuccess && onLogoutSuccess()}
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* ── Modal Popup for Change Password ── */}
      {showPasswordModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", width: "400px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column", gap: "16px" }}>
            <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "bold", color: "#0f172a" }}>Change Password</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input type="password" placeholder="New Password (min 6 chars)" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={{ padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1" }} />
              <input type="password" placeholder="Confirm New Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={{ padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1" }} />
              {passwordError && <div style={{ color: "#ef4444", fontSize: "0.8rem", textAlign: "center" }}>{passwordError}</div>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
              <button 
                disabled={isChangingPassword}
                onClick={async () => {
                  setPasswordError("");
                  if (newPassword.length < 6) return setPasswordError("Password must be at least 6 characters long");
                  if (newPassword !== confirmPassword) return setPasswordError("Passwords do not match");
                  setIsChangingPassword(true);
                  try {
                    const token = localStorage.getItem("kip_token");
                    const response = await fetch("/auth/profile", {
                      method: "PUT",
                      headers: {
                        "Content-Type": "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                      },
                      body: JSON.stringify({ newPassword }),
                    });
                    if (!response.ok) {
                      const body = await response.json().catch(() => ({}));
                      throw new Error(body.message || "Failed to update password");
                    }
                    const data = await response.json();
                    if (data && data.token) localStorage.setItem("kip_token", data.token);
                    alert("Password updated successfully!");
                    setShowPasswordModal(false);
                    setNewPassword("");
                    setConfirmPassword("");
                  } catch (err) {
                    setPasswordError(err.message);
                  } finally {
                    setIsChangingPassword(false);
                  }
                }}
                style={{ width: "100%", padding: "12px", background: "#ffdb3b", color: "#0f172a", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", opacity: isChangingPassword ? 0.7 : 1 }}
              >
                {isChangingPassword ? "Saving..." : "Save Password"}
              </button>
              <button onClick={() => { setShowPasswordModal(false); setNewPassword(""); setConfirmPassword(""); setPasswordError(""); }} style={{ width: "100%", padding: "12px", background: "#f1f5f9", color: "#64748b", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Popup for Add Machine / Add Part ── */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              padding: "24px",
              minWidth: "360px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                margin: "0 0 16px 0",
                fontSize: "1.1rem",
                color: "#1e293b",
              }}
            >
              {modalTitle}
            </h3>
            <input
              type="text"
              value={modalInput}
              onChange={(e) => setModalInput(e.target.value)}
              placeholder="Enter name..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && modalCallback) {
                  modalCallback(modalInput);
                }
                if (e.key === "Escape") setShowModal(false);
              }}
              style={{
                width: "100%",
                padding: "10px 14px",
                fontSize: "0.95rem",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                outline: "none",
                boxSizing: "border-box",
                marginBottom: "16px",
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "8px",
              }}
            >
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: "8px 20px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (modalCallback) modalCallback(modalInput);
                }}
                style={{
                  padding: "8px 20px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#1e293b",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export default DashboardHeader;
