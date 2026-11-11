# ═══════════════════════════════════════════════════════════════════════
# CORE MODULE: STERILIZER FFB CYCLE MANAGER & SUMMARY GENERATOR
# Menangani siklus pintu inlet: Mentahan terisi dulu -> Generate Rekap
# ═══════════════════════════════════════════════════════════════════════

import os
import time
import math
from datetime import datetime
import logging
from config.database import get_db_ai_connection
from core.ffb_detector import detector_engine

logging.basicConfig(level=logging.INFO)

class CycleManager:
    def __init__(self):
        # State aktif per line sterilizer (1, 2, 3, 4)
        self.active_cycles = {1: None, 2: None, 3: None, 4: None}
        self.last_completed_cycles = {1: None, 2: None, 3: None, 4: None}
        self.camera_code = "XNO102"

    def is_line_active(self, line_no=1):
        return self.active_cycles.get(line_no) is not None

    def get_active_cycle_code(self, line_no=1):
        cycle = self.active_cycles.get(line_no)
        return cycle["cycle_code"] if cycle else None

    def start_cycle(self, line_no=1):
        """
        Memulai siklus deteksi baru untuk Line X (Inlet Door = OPEN):
        Menerbitkan cycle_code unik dan mengosongkan cache pelacakan.
        """
        line_no = int(line_no)
        if self.is_line_active(line_no):
            return {
                "success": True,
                "message": f"Line {line_no} is already active",
                "cycle": self.active_cycles[line_no]
            }

        # Validasi Mutual Exclusion: Hanya 1 siklus line yang boleh aktif pada satu waktu
        for other_line, cycle in self.active_cycles.items():
            if cycle is not None and other_line != line_no:
                return {
                    "success": False,
                    "message": f"Siklus Line {other_line} sedang aktif ({cycle['cycle_code']}). Selesaikan siklus tersebut terlebih dahulu.",
                    "active_line": other_line
                }

        now_dt = datetime.now()
        timestamp_str = now_dt.strftime("%Y%m%d_%H%M%S")
        cycle_code = f"CYC_L{line_no}_{timestamp_str}"

        # Bersihkan cache tracking untuk siklus baru
        detector_engine.tracked_ids_captured.clear()

        cycle_info = {
            "cycle_code": cycle_code,
            "line_no": line_no,
            "camera_code": self.camera_code,
            "started_at": now_dt,
            "status": "ACTIVE"
        }
        # Reset siklus terakhir untuk line ini agar tampilan refresh / ngulang dari awal ke 0
        self.last_completed_cycles[line_no] = None
        self.active_cycles[line_no] = cycle_info

        logging.info(f"[CycleManager] >>> STARTED DETECTION CYCLE for Line {line_no}: {cycle_code} (Inlet Door: OPEN)")
        return {
            "success": True,
            "message": f"Detection cycle started for Line {line_no}",
            "cycle": {
                "cycle_code": cycle_code,
                "line_no": line_no,
                "started_at": now_dt.isoformat(),
                "status": "ACTIVE"
            }
        }

    def stop_cycle(self, line_no=1):
        """
        Menghentikan siklus deteksi untuk Line X (Inlet Door = CLOSED):
        Mengagregasi data dari ai_ffb_raw_detections dan men-generate 1 baris ai_ffb_cycle_summaries.
        """
        line_no = int(line_no)
        cycle_info = self.active_cycles.get(line_no)
        if not cycle_info:
            return {
                "success": False,
                "message": f"No active detection cycle found for Line {line_no}"
            }

        # 1. Kunci dan matikan siklus aktif seketika agar thread AI langsung berhenti evaluasi
        self.active_cycles[line_no] = None
        cycle_code = cycle_info["cycle_code"]
        self.last_completed_cycles[line_no] = cycle_code
        started_at = cycle_info["started_at"]
        completed_at = datetime.now()
        duration_seconds = max(1, int((completed_at - started_at).total_seconds()))

        # 2. Tunggu antrian snapshot async yang tersisa selesai ditulis ke DB sebelum agregasi
        try:
            detector_engine.flush_snapshots(timeout=2.0)
        except Exception as e:
            logging.warning(f"[CycleManager] Flush snapshots warning: {e}")

        # 1. Agregasi data dari tabel mentahan
        counts = {"ripe": 0, "overripe": 0, "underripe": 0}
        total_bunches = 0

        try:
            conn = get_db_ai_connection()
            if conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT class_name, COUNT(*) as cnt
                        FROM ai_ffb_raw_detections
                        WHERE cycle_code = %s
                        GROUP BY class_name
                    """, (cycle_code,))
                    rows = cur.fetchall()
                    for r in rows:
                        c_name = (r.get("class_name") or "").lower()
                        c_cnt = int(r.get("cnt") or 0)
                        if c_name in counts:
                            counts[c_name] = c_cnt
                        total_bunches += c_cnt

                # 2. Validasi: Jika tidak ada buah yang terdeteksi (0 tandan), JANGAN simpan rekap siklus
                if total_bunches == 0:
                    conn.close()
                    # Bersihkan folder siklus jika kosong
                    cycle_dir = os.path.join(os.path.dirname(__file__), "..", "captures", cycle_code)
                    if os.path.exists(cycle_dir) and not os.listdir(cycle_dir):
                        try:
                            os.rmdir(cycle_dir)
                        except Exception:
                            pass
                    self.active_cycles[line_no] = None
                    self.last_completed_cycles[line_no] = None
                    logging.info(f"[CycleManager] Siklus {cycle_code} Line {line_no} selesai tanpa buah (0 tandan). Rekapitulasi dilewati.")
                    return {
                        "success": True,
                        "message": f"Siklus Line {line_no} selesai tanpa buah (0 tandan terdeteksi). Rekapitulasi dilewati.",
                        "summary": None
                    }

                # 3. Tentukan persentase & fraksi mayoritas
                r_cnt = counts.get("ripe", 0)
                o_cnt = counts.get("overripe", 0)
                u_cnt = counts.get("underripe", 0)

                r_pct = round((r_cnt / total_bunches * 100), 1) if total_bunches > 0 else 0.0
                o_pct = round((o_cnt / total_bunches * 100), 1) if total_bunches > 0 else 0.0
                u_pct = round((u_cnt / total_bunches * 100), 1) if total_bunches > 0 else 0.0

                majority_cat = "RIPE"
                majority_pct = r_pct
                if o_cnt > r_cnt and o_cnt >= u_cnt:
                    majority_cat = "OVERRIPE"
                    majority_pct = o_pct
                elif u_cnt > r_cnt and u_cnt > o_cnt:
                    majority_cat = "UNDERRIPE"
                    majority_pct = u_pct

                recipe_name = f"{majority_cat}-RECIPE"
                recipe_code = f"RECIPE_{majority_cat}_DEFAULT"

                # 3. Tulis 1 baris ke tabel ai_ffb_cycle_summaries
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO ai_ffb_cycle_summaries (
                            cycle_code, line_no, camera_code,
                            total_bunches, ripe_count, overripe_count, underripe_count,
                            ripe_pct, overripe_pct, underripe_pct,
                            majority_category, majority_pct,
                            recommended_recipe_name, recommended_recipe_code,
                            status, started_at, completed_at, duration_seconds
                        ) VALUES (
                            %s, %s, %s,
                            %s, %s, %s, %s,
                            %s, %s, %s,
                            %s, %s,
                            %s, %s,
                            'COMPLETED', %s, %s, %s
                        )
                        ON CONFLICT (cycle_code) DO NOTHING
                    """, (
                        cycle_code, line_no, self.camera_code,
                        total_bunches, r_cnt, o_cnt, u_cnt,
                        r_pct, o_pct, u_pct,
                        majority_cat, majority_pct,
                        recipe_name, recipe_code,
                        started_at, completed_at, duration_seconds
                    ))
                conn.close()
        except Exception as e:
            logging.error(f"[CycleManager] Error generating cycle summary: {e}")

        logging.info(f"[CycleManager] <<< COMPLETED DETECTION CYCLE for Line {line_no}: {cycle_code} | Total: {total_bunches} | Majority: {majority_cat} ({majority_pct}%)")

        return {
            "success": True,
            "message": f"Detection cycle completed for Line {line_no}",
            "summary": {
                "cycle_code": cycle_code,
                "line_no": line_no,
                "total_bunches": total_bunches,
                "counts": counts,
                "percentages": {"ripe": r_pct, "overripe": o_pct, "underripe": u_pct},
                "majority_category": majority_cat,
                "majority_pct": majority_pct,
                "recommended_recipe_name": recipe_name,
                "duration_seconds": duration_seconds
            }
        }

    def get_all_status(self):
        """
        Mengembalikan status seluruh line (Line 1..4)
        """
        status_res = {}
        for l_num in [1, 2, 3, 4]:
            act = self.active_cycles.get(l_num)
            raw_count = 0
            if act:
                try:
                    conn = get_db_ai_connection()
                    if conn:
                        with conn.cursor() as cur:
                            cur.execute("SELECT COUNT(*) as c FROM ai_ffb_raw_detections WHERE cycle_code = %s", (act["cycle_code"],))
                            row = cur.fetchone()
                            raw_count = int(row.get("c") or 0) if row else 0
                        conn.close()
                except:
                    pass

            status_res[str(l_num)] = {
                "is_active": act is not None,
                "cycle_code": act["cycle_code"] if act else None,
                "inlet_door_status": "OPEN" if act else "CLOSED",
                "raw_detections_count": raw_count,
                "started_at": act["started_at"].isoformat() if act else None
            }
        return status_res

    def get_cycle_stats_and_captures(self, line_no=1, slide=1, limit=12):
        """
        Mengambil statistik kategori & daftar tangkapan riil untuk Line X:
        1. Jika siklus sedang aktif (Inlet OPEN) -> agregasi seluruh deteksi realtime kumulatif (tanpa limit).
        2. Jika siklus sedang tidak aktif (Inlet CLOSED) -> ambil deteksi dari siklus terakhir yang selesai.
        3. Paginasi foto slide: mengambil tepat 'limit' foto (default 12) sesuai halaman 'slide'.
        """
        line_no = int(line_no)
        slide = max(1, int(slide or 1))
        limit = max(1, min(100, int(limit or 12)))
        offset = (slide - 1) * limit

        is_active = self.is_line_active(line_no)
        target_cycle_code = self.get_active_cycle_code(line_no)

        if not target_cycle_code:
            target_cycle_code = self.last_completed_cycles.get(line_no)
            if not target_cycle_code:
                try:
                    conn = get_db_ai_connection()
                    if conn:
                        with conn.cursor() as cur:
                            cur.execute("""
                                SELECT cycle_code FROM ai_ffb_cycle_summaries
                                WHERE line_no = %s
                                ORDER BY id DESC LIMIT 1
                            """, (line_no,))
                            row = cur.fetchone()
                            if row and row.get("cycle_code"):
                                target_cycle_code = row["cycle_code"]
                                self.last_completed_cycles[line_no] = target_cycle_code
                        conn.close()
                except Exception as e:
                    logging.error(f"[CycleManager] Error fetching last completed cycle: {e}")

        counts = {"overripe": 0, "ripe": 0, "underripe": 0}
        total_bunches = 0
        recent_captures = []
        conf_list = []

        if target_cycle_code:
            try:
                conn = get_db_ai_connection()
                if conn:
                    with conn.cursor() as cur:
                        # 1. Agregasi seluruh tandan yang terdeteksi dalam siklus ini (Realtime Kumulatif Tanpa Limit)
                        cur.execute("""
                            SELECT class_name, COUNT(*) as cnt
                            FROM ai_ffb_raw_detections
                            WHERE cycle_code = %s
                            GROUP BY class_name
                        """, (target_cycle_code,))
                        agg_rows = cur.fetchall()
                        for ar in agg_rows:
                            cn = (ar.get("class_name") or "").lower()
                            cnt_val = int(ar.get("cnt") or 0)
                            if cn in counts:
                                counts[cn] = cnt_val
                            else:
                                counts[cn] = cnt_val
                            total_bunches += cnt_val

                        # Fallback jika raw_detections kosong tapi siklus sudah selesai
                        if total_bunches == 0 and not is_active:
                            cur.execute("""
                                SELECT total_bunches, ripe_count, overripe_count, underripe_count
                                FROM ai_ffb_cycle_summaries
                                WHERE cycle_code = %s
                                LIMIT 1
                            """, (target_cycle_code,))
                            sum_row = cur.fetchone()
                            if sum_row:
                                total_bunches = int(sum_row.get("total_bunches") or 0)
                                counts["ripe"] = int(sum_row.get("ripe_count") or 0)
                                counts["overripe"] = int(sum_row.get("overripe_count") or 0)
                                counts["underripe"] = int(sum_row.get("underripe_count") or 0)

                        # 2. Ambil foto slide sesuai halaman (limit=12, offset)
                        cur.execute("""
                            SELECT id, track_id, class_name, confidence, image_path, detected_at,
                                   trigger_condition, has_stalk
                            FROM ai_ffb_raw_detections
                            WHERE cycle_code = %s
                            ORDER BY id DESC
                            LIMIT %s OFFSET %s
                        """, (target_cycle_code, limit, offset))
                        rows = cur.fetchall()
                        for r in rows:
                            c_name = (r.get("class_name") or "").lower()
                            conf_val = float(r.get("confidence") or 0.0)
                            conf_list.append(conf_val)

                            t_str = "Just now"
                            if r.get("detected_at"):
                                t_str = r["detected_at"].strftime("%H:%M:%S")

                            img_path = r.get("image_path") or ""
                            if img_path.startswith("captures/"):
                                img_url = f"/api/sterilizer/ai/{img_path}"
                            elif img_path:
                                img_url = f"/api/sterilizer/ai/captures/{img_path}"
                            else:
                                img_url = None

                            recent_captures.append({
                                "id": r.get("track_id") or f"TRK-{r['id']}",
                                "category": c_name,
                                "confidence": round(conf_val, 1),
                                "time": t_str,
                                "line": line_no,
                                "trigger_condition": r.get("trigger_condition") or "NORMAL",
                                "has_stalk": bool(r.get("has_stalk")),
                                "image_url": img_url,
                                "image_path": img_path
                            })
                    conn.close()
            except Exception as e:
                logging.error(f"[CycleManager] Error fetching detections for {target_cycle_code}: {e}")

        total_slides = math.ceil(total_bunches / limit) if total_bunches > 0 else 1
        avg_conf = round(sum(conf_list) / len(conf_list), 1) if conf_list else 0.0
        det_per_min = round(len(recent_captures) * 2.0, 1) if is_active else 0.0

        return {
            "success": True,
            "line_no": line_no,
            "cycle_code": target_cycle_code,
            "is_active": is_active,
            "total_bunches": total_bunches,
            "total_slides": total_slides,
            "slide": slide,
            "limit": limit,
            "counts": counts,
            "metrics": {
                "average_confidence": avg_conf,
                "detections_per_minute": det_per_min
            },
            "recent_captures": recent_captures
        }

    def get_current_decision(self, line_no=1):
        stats = self.get_cycle_stats_and_captures(line_no)
        counts = stats.get("counts", {})
        total_bunches = sum(counts.values())

        if total_bunches == 0:
            majority_cat = "WAITING" if stats.get("is_active") else "IDLE"
            majority_pct = 0
            recipe_name = "WAITING FOR BUNCHES" if stats.get("is_active") else "NO ACTIVE CYCLE"
            recipe_code = "RECIPE_DEFAULT"
        else:
            r_cnt = counts.get("ripe", 0)
            o_cnt = counts.get("overripe", 0)
            u_cnt = counts.get("underripe", 0)

            max_val = max(r_cnt, o_cnt, u_cnt)
            if max_val == r_cnt:
                majority_cat = "RIPE"
                majority_pct = round((r_cnt / total_bunches) * 100)
            elif max_val == o_cnt:
                majority_cat = "OVERRIPE"
                majority_pct = round((o_cnt / total_bunches) * 100)
            else:
                majority_cat = "UNDERRIPE"
                majority_pct = round((u_cnt / total_bunches) * 100)

            recipe_name = f"{majority_cat}-RECIPE"
            recipe_code = f"RECIPE_{majority_cat}_DEFAULT"

        return {
            "success": True,
            "data": {
                "line_no": line_no,
                "cycle_code": stats.get("cycle_code"),
                "is_active": stats.get("is_active"),
                "total_bunches": total_bunches,
                "majority_category": majority_cat,
                "majority_percentage": majority_pct,
                "recommended_recipe_name": recipe_name,
                "recommended_recipe_code": recipe_code
            }
        }

# Global Cycle Manager Instance
cycle_manager = CycleManager()
