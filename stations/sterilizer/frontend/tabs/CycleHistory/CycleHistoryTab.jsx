import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import "./CycleHistoryTab.css";

const CATEGORY_COLORS = {
  ripe: {
    bg: "#ecfdf5",
    text: "#059669",
    border: "#a7f3d0",
    badge: "#10b981",
    label: "RIPE",
  },
  underripe: {
    bg: "#fffbeb",
    text: "#d97706",
    border: "#fde68a",
    badge: "#f59e0b",
    label: "UNDERRIPE",
  },
  overripe: {
    bg: "#faf5ff",
    text: "#7e22ce",
    border: "#e9d5ff",
    badge: "#a855f7",
    label: "OVERRIPE",
  },
};

export default function CycleHistoryTab() {
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLine, setSelectedLine] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Konstanta limit tetap 50 foto per halaman (sangat ringan & bebas lag)
  const CAPTURES_PER_PAGE = 50;

  // Modal State untuk Galeri Capture per Siklus
  const [activeCycleModal, setActiveCycleModal] = useState(null);
  const [cycleCaptures, setCycleCaptures] = useState([]);
  const [loadingCaptures, setLoadingCaptures] = useState(false);
  const [captureFilter, setCaptureFilter] = useState("ALL");
  const [capturesPage, setCapturesPage] = useState(1);
  const [capturesTotal, setCapturesTotal] = useState(0);
  const [capturesTotalPages, setCapturesTotalPages] = useState(1);
  const [zoomedImage, setZoomedImage] = useState(null);
  const modalBodyRef = useRef(null);

  // Helper resolusi path foto inspeksi
  const resolveImageUrl = useCallback((path) => {
    if (!path) return null;
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    if (path.startsWith("/api/")) return path;
    if (path.startsWith("captures/")) return `/api/sterilizer/ai/${path}`;
    return `/api/sterilizer/ai/captures/${path}`;
  }, []);

  // Format durasi detik ke format menit detik
  const formatDuration = (seconds) => {
    if (seconds === null || seconds === undefined) return "-";
    const sec = parseInt(seconds, 10);
    if (isNaN(sec)) return "-";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s < 10 ? "0" : ""}${s}s`;
  };

  // Format tanggal & jam lokal
  const formatDateTime = (isoStr) => {
    if (!isoStr) return "-";
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  // Mengambil daftar riwayat siklus dari backend
  const fetchCycleSummaries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const lineParam = selectedLine !== "all" ? `&line_no=${selectedLine}` : "";
      const res = await fetch(`/api/sterilizer/ai/cycles/summaries?limit=100${lineParam}`);
      if (!res.ok) {
        throw new Error(`Gagal memuat riwayat siklus (Status: ${res.status})`);
      }
      const data = await res.json();
      if (data && Array.isArray(data.data)) {
        setCycles(data.data);
      } else {
        setCycles([]);
      }
    } catch (err) {
      console.error("[CycleHistory] Fetch error:", err);
      setError(err.message || "Gagal menghubungi server riwayat siklus");
    } finally {
      setLoading(false);
    }
  }, [selectedLine]);

  useEffect(() => {
    fetchCycleSummaries();
  }, [fetchCycleSummaries]);

  // Mengambil daftar foto capture untuk siklus tertentu dengan pagination tetap 100 foto
  const fetchCycleCaptures = useCallback(
    async (cycleCode, page = 1, filter = "ALL") => {
      setLoadingCaptures(true);
      try {
        const catParam = filter !== "ALL" ? `&class_name=${encodeURIComponent(filter)}` : "";
        const res = await fetch(
          `/api/sterilizer/ai/detections/raw?cycle_code=${encodeURIComponent(cycleCode)}&page=${page}&limit=${CAPTURES_PER_PAGE}${catParam}`
        );
        if (res.ok) {
          const json = await res.json();
          const items = json.data || [];
          setCycleCaptures(items);
          setCapturesPage(json.page || page);
          setCapturesTotal(json.total !== undefined ? json.total : items.length);
          setCapturesTotalPages(
            json.total_pages || Math.ceil((json.total || items.length) / CAPTURES_PER_PAGE) || 1
          );
        } else {
          setCycleCaptures([]);
        }
      } catch (err) {
        console.error("[CycleHistory] Error loading captures for cycle:", err);
        setCycleCaptures([]);
      } finally {
        setLoadingCaptures(false);
      }
    },
    []
  );

  // Membuka modal galeri foto capture untuk 1 siklus tertentu
  const handleOpenCapturesModal = (cycle) => {
    setActiveCycleModal(cycle);
    setCaptureFilter("ALL");
    setCapturesPage(1);
    setCycleCaptures([]);
    fetchCycleCaptures(cycle.cycle_code, 1, "ALL");
  };

  const handleCloseCapturesModal = () => {
    setActiveCycleModal(null);
    setCycleCaptures([]);
    setZoomedImage(null);
    setCapturesPage(1);
    setCapturesTotal(0);
  };

  const handleFilterChange = (newCat) => {
    setCaptureFilter(newCat);
    setCapturesPage(1);
    setCycleCaptures([]);
    if (modalBodyRef.current) {
      modalBodyRef.current.scrollTop = 0;
    }
    if (activeCycleModal) {
      fetchCycleCaptures(activeCycleModal.cycle_code, 1, newCat);
    }
  };

  // Perpindahan tepat 1 halaman saja (Prev / Next) tanpa lompat jauh
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > capturesTotalPages || newPage === capturesPage) return;
    setCapturesPage(newPage);
    if (modalBodyRef.current) {
      modalBodyRef.current.scrollTop = 0;
    }
    if (activeCycleModal) {
      fetchCycleCaptures(activeCycleModal.cycle_code, newPage, captureFilter);
    }
  };

  // Filter siklus berdasarkan input pencarian
  const filteredCycles = useMemo(() => {
    return cycles.filter((c) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const code = (c.cycle_code || "").toLowerCase();
      const recipe = (c.recommended_recipe_name || "").toLowerCase();
      const cat = (c.majority_category || "").toLowerCase();
      return code.includes(q) || recipe.includes(q) || cat.includes(q);
    });
  }, [cycles, searchQuery]);

  return (
    <div className="som-cycle-history-container">
      {/* ════════════════════════════════════════════════════════════════════
          HEADER FILTER & SEARCH BAR (TIDAK ADA KARTU KPI)
          ════════════════════════════════════════════════════════════════════ */}
      <div className="som-ch-header-bar">
        <div className="som-ch-title-box">
          <h2>FFB STERILIZER CYCLE HISTORY</h2>
          <span className="som-ch-subtitle">
            Kumpulan rekapitulasi data per siklus & galeri inspeksi tangkapan buah sawit
          </span>
        </div>

        <div className="som-ch-controls">
          {/* Filter Line Toggle */}
          <div className="som-ch-line-pills">
            {["all", 1, 2, 3, 4].map((l) => (
              <button
                key={l}
                type="button"
                className={`som-ch-pill-btn ${selectedLine === l ? "active" : ""}`}
                onClick={() => setSelectedLine(l)}
              >
                {l === "all" ? "ALL LINES" : `LINE ${l}`}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="som-ch-search-box">
            <input
              type="text"
              placeholder="Cari Kode Siklus / Resep..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="som-ch-search-clear"
                onClick={() => setSearchQuery("")}
              >
                ✕
              </button>
            )}
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            className="som-ch-refresh-btn"
            onClick={fetchCycleSummaries}
            title="Refresh Data Riwayat"
            disabled={loading}
          >
            <span className={`refresh-icon ${loading ? "spinning" : ""}`}>🔄</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          TABEL UTAMA REKAPITULASI SIKLUS
          ════════════════════════════════════════════════════════════════════ */}
      <div className="som-ch-table-card">
        {loading && cycles.length === 0 ? (
          <div className="som-ch-loading-state">
            <div className="som-ch-spinner" />
            <p>Memuat riwayat siklus sterilizer dari database...</p>
          </div>
        ) : error ? (
          <div className="som-ch-error-state">
            <span className="error-icon">⚠️</span>
            <p>{error}</p>
            <button type="button" onClick={fetchCycleSummaries}>
              Coba Lagi
            </button>
          </div>
        ) : filteredCycles.length === 0 ? (
          <div className="som-ch-empty-state">
            <div className="empty-illustration">📋</div>
            <h3>Belum Ada Riwayat Siklus Tercatat</h3>
            <p>
              {searchQuery
                ? `Tidak ditemukan siklus dengan kata kunci "${searchQuery}".`
                : "Siklus akan otomatis tersimpan di sini setiap kali proses inlet sterilizer diselesaikan (Inlet Closed)."}
            </p>
          </div>
        ) : (
          <div className="som-ch-table-wrapper">
            <table className="som-ch-table">
              <thead>
                <tr>
                  <th style={{ width: "40px", textAlign: "center" }}>NO</th>
                  <th style={{ width: "80px", textAlign: "center" }}>LINE</th>
                  <th>KODE SIKLUS</th>
                  <th>WAKTU MULAI & SELESAI</th>
                  <th style={{ textAlign: "center" }}>DURASI</th>
                  <th style={{ textAlign: "center" }}>TOTAL BUAH</th>
                  <th style={{ minWidth: "200px" }}>KOMPOSISI MUTU</th>
                  <th>MUTU MAYORITAS</th>
                  <th>REKOMENDASI RESEP</th>
                  <th style={{ textAlign: "center", width: "130px" }}>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {filteredCycles.map((cycle, idx) => {
                  const majorityKey = (cycle.majority_category || "ripe").toLowerCase();
                  const majorityStyle =
                    CATEGORY_COLORS[majorityKey] || CATEGORY_COLORS.ripe;

                  return (
                    <tr key={cycle.id || cycle.cycle_code || idx}>
                      <td style={{ textAlign: "center", color: "#64748b" }}>
                        {idx + 1}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span className={`som-ch-line-badge line-${cycle.line_no}`}>
                          LINE {cycle.line_no}
                        </span>
                      </td>
                      <td>
                        <span className="som-ch-code-badge">{cycle.cycle_code}</span>
                      </td>
                      <td>
                        <div className="som-ch-datetime-cell">
                          <span className="dt-start">
                            🟢 {formatDateTime(cycle.started_at)}
                          </span>
                          <span className="dt-end">
                            🔴 {formatDateTime(cycle.completed_at)}
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: "center", fontWeight: "700", color: "#334155" }}>
                        {formatDuration(cycle.duration_seconds)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span className="som-ch-total-badge">
                          <strong>{cycle.total_bunches || 0}</strong> Tandan
                        </span>
                      </td>
                      <td>
                        {/* Visual Breakdown Bar & Tags */}
                        <div className="som-ch-breakdown-box">
                          <div className="som-ch-stacked-bar">
                            <span
                              className="bar-ripe"
                              style={{ width: `${cycle.ripe_pct || 0}%` }}
                              title={`Ripe: ${cycle.ripe_count || 0} (${cycle.ripe_pct || 0}%)`}
                            />
                            <span
                              className="bar-underripe"
                              style={{ width: `${cycle.underripe_pct || 0}%` }}
                              title={`Underripe: ${cycle.underripe_count || 0} (${cycle.underripe_pct || 0}%)`}
                            />
                            <span
                              className="bar-overripe"
                              style={{ width: `${cycle.overripe_pct || 0}%` }}
                              title={`Overripe: ${cycle.overripe_count || 0} (${cycle.overripe_pct || 0}%)`}
                            />
                          </div>
                          <div className="som-ch-breakdown-labels">
                            <span className="tag-ripe">
                              R: {cycle.ripe_count || 0} ({cycle.ripe_pct || 0}%)
                            </span>
                            <span className="tag-underripe">
                              U: {cycle.underripe_count || 0} ({cycle.underripe_pct || 0}%)
                            </span>
                            <span className="tag-overripe">
                              O: {cycle.overripe_count || 0} ({cycle.overripe_pct || 0}%)
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className="som-ch-majority-badge"
                          style={{
                            background: majorityStyle.bg,
                            color: majorityStyle.text,
                            borderColor: majorityStyle.border,
                          }}
                        >
                          <i style={{ background: majorityStyle.badge }} />
                          {cycle.majority_category || "RIPE"}{" "}
                          {cycle.majority_pct ? `(${cycle.majority_pct}%)` : ""}
                        </span>
                      </td>
                      <td>
                        <span className="som-ch-recipe-badge">
                          {cycle.recommended_recipe_name || "STANDAR RECIPE"}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          type="button"
                          className="som-ch-view-captures-btn"
                          onClick={() => handleOpenCapturesModal(cycle)}
                          title="Buka seluruh capture foto tandan untuk siklus ini"
                        >
                          📸 Lihat Capture
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          MODAL GALERI CAPTURE FOTO LENGKAP PER SIKLUS
          ════════════════════════════════════════════════════════════════════ */}
      {activeCycleModal && (
        <div className="som-ch-modal-overlay" onClick={handleCloseCapturesModal}>
          <div
            className="som-ch-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="som-ch-modal-header">
              <div className="modal-title-group">
                <h3>
                  📸 FOTO CAPTURE INSPEKSI SIKLUS:{" "}
                  <span className="highlight-code">
                    {activeCycleModal.cycle_code}
                  </span>
                </h3>
                <div className="modal-sub-meta">
                  <span>Line: <strong>Line {activeCycleModal.line_no}</strong></span>
                  <span>•</span>
                  <span>Total Terdeteksi: <strong>{activeCycleModal.total_bunches || cycleCaptures.length} Tandan</strong></span>
                  <span>•</span>
                  <span>Waktu: <strong>{formatDateTime(activeCycleModal.started_at)}</strong></span>
                </div>
              </div>

              <button
                type="button"
                className="som-ch-modal-close"
                onClick={handleCloseCapturesModal}
                title="Tutup Galeri"
              >
                ✕
              </button>
            </div>

            {/* Filter Kategori Capture di dalam Modal */}
            <div className="som-ch-modal-filter-bar">
              <span className="filter-label">Filter Kategori:</span>
              {["ALL", "RIPE", "UNDERRIPE", "OVERRIPE"].map((cat) => {
                let count = activeCycleModal.total_bunches || capturesTotal;
                if (cat === "RIPE") count = activeCycleModal.ripe_count ?? 0;
                if (cat === "UNDERRIPE") count = activeCycleModal.underripe_count ?? 0;
                if (cat === "OVERRIPE") count = activeCycleModal.overripe_count ?? 0;

                return (
                  <button
                    key={cat}
                    type="button"
                    className={`modal-filter-pill ${captureFilter === cat ? "active" : ""}`}
                    onClick={() => handleFilterChange(cat)}
                  >
                    {cat === "ALL"
                      ? `SEMUA (${Number(count || 0).toLocaleString("id-ID")})`
                      : `${cat} (${Number(count || 0).toLocaleString("id-ID")})`}
                  </button>
                );
              })}
            </div>

            {/* Toolbar Kontrol: Paginasi 1 Halaman & Status Counter (100 Foto / Hal) */}
            <div className="som-ch-modal-toolbar">
              <div className="toolbar-info-group">
                <span className="toolbar-count-info">
                  Menampilkan{" "}
                  <strong>
                    {capturesTotal > 0 ? (capturesPage - 1) * CAPTURES_PER_PAGE + 1 : 0}
                  </strong>{" "}
                  -{" "}
                  <strong>
                    {Math.min(
                      (capturesPage - 1) * CAPTURES_PER_PAGE + cycleCaptures.length,
                      capturesTotal
                    )}
                  </strong>{" "}
                  dari <strong>{capturesTotal.toLocaleString("id-ID")}</strong> Foto
                </span>
              </div>

              <div className="toolbar-pagination-group">
                <div className="som-ch-pagination">
                  <button
                    type="button"
                    className="som-ch-page-btn"
                    disabled={capturesPage <= 1 || loadingCaptures}
                    onClick={() => handlePageChange(capturesPage - 1)}
                    title="Halaman Sebelumnya (Mundur 1 Halaman)"
                  >
                    ◀ Prev
                  </button>

                  <span className="som-ch-page-label">
                    Halaman <strong>{capturesPage}</strong> dari{" "}
                    <strong>{capturesTotalPages}</strong>
                  </span>

                  <button
                    type="button"
                    className="som-ch-page-btn"
                    disabled={capturesPage >= capturesTotalPages || loadingCaptures}
                    onClick={() => handlePageChange(capturesPage + 1)}
                    title="Halaman Berikutnya (Maju 1 Halaman)"
                  >
                    Next ▶
                  </button>
                </div>
              </div>
            </div>

            {/* Body Galeri Grid (Tetap 50 Foto, Ringan & Anti-Lag) */}
            <div className="som-ch-modal-body" ref={modalBodyRef}>
              {loadingCaptures ? (
                <div className="modal-loading-box">
                  <div className="som-ch-spinner" />
                  <p>Memuat 50 foto capture tandan...</p>
                </div>
              ) : cycleCaptures.length === 0 ? (
                <div className="modal-empty-box">
                  <p>Tidak ada tangkapan foto tandan untuk kategori ini.</p>
                </div>
              ) : (
                <>
                  <div className="som-ch-captures-grid">
                    {cycleCaptures.map((item, idx) => {
                      const catKey = (item.class_name || "ripe").toLowerCase();
                      const styleMeta =
                        CATEGORY_COLORS[catKey] || CATEGORY_COLORS.ripe;
                      const imgUrl = resolveImageUrl(item.image_path);

                      return (
                        <div
                          key={item.id || idx}
                          className="som-ch-capture-card"
                          onClick={() => imgUrl && setZoomedImage(imgUrl)}
                          title="Klik untuk memperbesar foto"
                        >
                          <div className="capture-img-container">
                            {imgUrl ? (
                              <img
                                src={imgUrl}
                                alt={`Bunch ${item.track_id || idx}`}
                                loading="lazy"
                                decoding="async"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                  e.target.nextSibling.style.display = "flex";
                                }}
                              />
                            ) : null}
                            <div
                              className="img-fallback-placeholder"
                              style={{ display: imgUrl ? "none" : "flex" }}
                            >
                              <span>📷 Foto Tidak Tersedia</span>
                            </div>

                            <span
                              className="card-category-tag"
                              style={{
                                background: styleMeta.bg,
                                color: styleMeta.text,
                                borderColor: styleMeta.border,
                              }}
                            >
                              {item.class_name || "RIPE"}
                            </span>
                          </div>

                          <div className="capture-card-info">
                            <div className="info-row-top">
                              <span className="track-id">
                                TRK-{item.track_id || item.id || idx + 1}
                              </span>
                              <span className="conf-value">
                                {parseFloat(item.confidence || 0).toFixed(1)}%
                              </span>
                            </div>
                            <div className="info-row-bottom">
                              <span className="time-val">
                                ⏱️{" "}
                                {item.detected_at
                                  ? formatDateTime(item.detected_at).split(", ")[1] ||
                                    formatDateTime(item.detected_at)
                                  : "Just now"}
                              </span>
                              <span className="zoom-hint">🔍 Klik Zoom</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Navigasi Bawah untuk Kemudahan Operator Setelah Scroll */}
                  {capturesTotalPages > 1 && (
                    <div className="som-ch-modal-bottom-nav">
                      <div className="som-ch-pagination">
                        <button
                          type="button"
                          className="som-ch-page-btn"
                          disabled={capturesPage <= 1 || loadingCaptures}
                          onClick={() => handlePageChange(capturesPage - 1)}
                          title="Halaman Sebelumnya"
                        >
                          ◀ Prev
                        </button>

                        <span className="som-ch-page-label">
                          Halaman <strong>{capturesPage}</strong> dari{" "}
                          <strong>{capturesTotalPages}</strong>
                        </span>

                        <button
                          type="button"
                          className="som-ch-page-btn"
                          disabled={capturesPage >= capturesTotalPages || loadingCaptures}
                          onClick={() => handlePageChange(capturesPage + 1)}
                          title="Halaman Berikutnya"
                        >
                          Next ▶
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          LIGHTBOX ZOOM PREVIEW FOTO
          ════════════════════════════════════════════════════════════════════ */}
      {zoomedImage && (
        <div className="som-ch-zoom-overlay" onClick={() => setZoomedImage(null)}>
          <div className="som-ch-zoom-box" onClick={(e) => e.stopPropagation()}>
            <img src={zoomedImage} alt="Full Zoom Preview" />
            <button
              type="button"
              className="zoom-close-btn"
              onClick={() => setZoomedImage(null)}
            >
              ✕ Tutup Zoom
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
