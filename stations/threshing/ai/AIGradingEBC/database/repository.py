import json
import logging
from datetime import datetime, timedelta, timezone

import pymysql
from pymysql.cursors import DictCursor

from config.settings import Settings


logger = logging.getLogger(__name__)


class ClassificationRepository:
    categories = ("usb", "psb", "eb")

    def _connect(self):
        return pymysql.connect(host=Settings.DB_HOST, port=Settings.DB_PORT, user=Settings.DB_USER,
                               password=Settings.DB_PASSWORD, database=Settings.DB_NAME,
                               cursorclass=DictCursor, autocommit=True, connect_timeout=3)

    def health(self):
        try:
            with self._connect() as connection, connection.cursor() as cursor:
                cursor.execute("SELECT 1"); cursor.fetchone()
            return True
        except Exception as error:
            logger.warning("EBC database unavailable: %s", error)
            return False

    def insert_detections(self, line_no, camera_code, detections, model_version):
        rows = [(line_no, camera_code, item["category"].upper(), float(item["confidence"]),
                 json.dumps(item.get("bounding_box")), model_version) for item in detections]
        if not rows:
            return
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.executemany("INSERT INTO ebc_detections (line_no,camera_code,category,confidence,bounding_box_json,model_version) VALUES (%s,%s,%s,%s,%s,%s)", rows)

    def publish_decision(self, decision):
        payload = dict(decision)
        counts = payload.pop("category_counts")
        payload.update({f"{key}_count": value for key, value in counts.items()})
        payload["action_parameters_json"] = json.dumps(payload.pop("action_parameters"))
        history = """
          INSERT INTO ebc_decision_history
           (line_no,camera_code,window_started_at,window_ended_at,usb_count,psb_count,eb_count,total_count,
            majority_category,majority_percentage,recommended_action_code,recommended_action_name,action_parameters_json,model_version)
          VALUES (%(line_no)s,%(camera_code)s,%(window_started_at)s,%(window_ended_at)s,%(usb_count)s,%(psb_count)s,%(eb_count)s,%(total_count)s,
                  %(majority_category)s,%(majority_percentage)s,%(recommended_action_code)s,%(recommended_action_name)s,%(action_parameters_json)s,%(model_version)s)
        """
        current = """
          INSERT INTO ebc_line_results
           (line_no,camera_code,window_started_at,window_ended_at,usb_count,psb_count,eb_count,total_count,
            majority_category,majority_percentage,recommended_action_code,recommended_action_name,action_parameters_json,decision_status,model_version,result_version)
          VALUES (%(line_no)s,%(camera_code)s,%(window_started_at)s,%(window_ended_at)s,%(usb_count)s,%(psb_count)s,%(eb_count)s,%(total_count)s,
                  %(majority_category)s,%(majority_percentage)s,%(recommended_action_code)s,%(recommended_action_name)s,%(action_parameters_json)s,%(decision_status)s,%(model_version)s,1)
          ON DUPLICATE KEY UPDATE camera_code=VALUES(camera_code),window_started_at=VALUES(window_started_at),window_ended_at=VALUES(window_ended_at),
           usb_count=VALUES(usb_count),psb_count=VALUES(psb_count),eb_count=VALUES(eb_count),total_count=VALUES(total_count),
           majority_category=VALUES(majority_category),majority_percentage=VALUES(majority_percentage),recommended_action_code=VALUES(recommended_action_code),
           recommended_action_name=VALUES(recommended_action_name),action_parameters_json=VALUES(action_parameters_json),decision_status=VALUES(decision_status),
           model_version=VALUES(model_version),result_version=result_version+1
        """
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute(history, payload); cursor.execute(current, payload)

    def publish_runtime_status(self, line_no, camera_code, status, model_version):
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        sql = """
          INSERT INTO ebc_line_results (line_no,camera_code,window_started_at,window_ended_at,majority_category,decision_status,model_version,result_version)
          VALUES (%s,%s,%s,%s,'INSUFFICIENT_DATA',%s,%s,1)
          ON DUPLICATE KEY UPDATE camera_code=VALUES(camera_code),window_ended_at=VALUES(window_ended_at),usb_count=0,psb_count=0,eb_count=0,total_count=0,
           majority_category='INSUFFICIENT_DATA',majority_percentage=0,recommended_action_code=NULL,recommended_action_name=NULL,
           action_parameters_json=NULL,decision_status=VALUES(decision_status),model_version=VALUES(model_version),result_version=result_version+1
        """
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute(sql, (line_no, camera_code, now, now, status, model_version))

    def get_current_result(self, line_no):
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute("SELECT * FROM ebc_line_results WHERE line_no=%s", (line_no,)); row = cursor.fetchone()
        if not row:
            return None
        output = dict(row)
        for key, value in list(output.items()):
            if isinstance(value, datetime): output[key] = value.isoformat()
            elif hasattr(value, "__float__") and not isinstance(value, (int, float)): output[key] = float(value)
        parameters = output.pop("action_parameters_json", None)
        output["action_parameters"] = json.loads(parameters) if parameters else None
        return output

    def get_stats(self, line_no, period):
        since = datetime.now(timezone.utc) - timedelta(hours={"DAY": 24, "WEEK": 168, "MONTH": 720}[period])
        counts = {category: 0 for category in self.categories}
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute("SELECT category,COUNT(*) count FROM ebc_detections WHERE line_no=%s AND detected_at>=%s GROUP BY category", (line_no, since.replace(tzinfo=None)))
            for row in cursor.fetchall(): counts[row["category"].lower()] = int(row["count"])
        return counts

    def get_metrics(self, line_no, period):
        since = datetime.now(timezone.utc) - timedelta(hours={"DAY": 24, "WEEK": 168, "MONTH": 720}[period])
        minute = datetime.now(timezone.utc) - timedelta(minutes=1)
        sql = """
          SELECT COALESCE(AVG(CASE WHEN detected_at >= %s THEN confidence END),0) average_confidence,
                 COALESCE(SUM(CASE WHEN detected_at >= %s THEN 1 ELSE 0 END),0) detections_per_minute
          FROM ebc_detections WHERE line_no=%s AND detected_at >= %s
        """
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute(sql, (since.replace(tzinfo=None), minute.replace(tzinfo=None), line_no, since.replace(tzinfo=None)))
            row = cursor.fetchone() or {}
        return {"average_confidence": round(float(row.get("average_confidence") or 0) * 100, 2),
                "detections_per_minute": int(row.get("detections_per_minute") or 0)}


classification_repository = ClassificationRepository()
