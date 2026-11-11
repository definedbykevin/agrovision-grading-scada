import { createClient } from "redis";
import { dbPool } from "../config/db.js";

const REDIS_URL =
  process.env.REDIS_URL || "redis://:REDIS_PASSWORD@localhost:6379";
const ALARM_EVENT_CHANNEL =
  process.env.ALARM_EVENT_CHANNEL || "kip:alarm:events";

export async function startNotificationWorker() {
  const subscriber = createClient({ url: REDIS_URL });

  subscriber.on("error", (err) => {
    console.error("[alarm worker] Redis connection error:", err.message);
  });

  try {
    await subscriber.connect();
    console.log(
      `[alarm worker] Redis subscriber connected to ${ALARM_EVENT_CHANNEL}`,
    );
  } catch (err) {
    console.error("[alarm worker] Failed to connect to Redis:", err.message);
    return;
  }

  await subscriber.subscribe(ALARM_EVENT_CHANNEL, async (message) => {
    try {
      const event = JSON.parse(message);
      const { station, tag, value, severity, threshold, unit, timestamp } =
        event;

      console.log(
        `[alarm worker] Received alarm event: ${tag} = ${value} (${severity}) at ${station}`,
      );

      // Generate unique alarm code
      const code = `ALM-${Math.floor(1000 + Math.random() * 9000)}`;
      const category =
        severity === "Critical" ? "System Error" : "Process Disturbance";
      const description = `Value of ${tag} (${value} ${unit}) exceeded threshold (${threshold})`;

      // Log alarm into database
      await dbPool
        .query(
          `INSERT INTO alarm_events (code, category, station, description, severity, status, timestamp)
         VALUES (?, ?, ?, ?, ?, 'Active', NOW())`,
          [code, category, station, description, severity],
        )
        .catch((err) => {
          console.error(
            "[alarm worker] Failed to save alarm event:",
            err.message,
          );
        });

      // Send Telegram alert
      await sendTelegramAlert(station, tag, value, severity);
    } catch (err) {
      console.error(
        "[alarm worker] Error processing alarm event:",
        err.message,
      );
    }
  });
}

async function sendTelegramAlert(station, tag, value, severity) {
  try {
    const [settingsRows] = await dbPool.query(
      "SELECT * FROM notification_settings",
    );
    const settings = {};
    settingsRows.forEach((r) => {
      settings[r.setting_key] = r.setting_value;
    });

    if (settings.notif_enabled !== "1") return;

    const botToken = settings.notif_telegram_token;
    const chatId = settings.notif_telegram_chatid;

    if (!botToken || !chatId) return;

    const emoji = severity === "ALARM" ? "🚨" : "⚠️";
    const message = `${emoji} *AgroVision SCADA ALERT*\n\n📍 *Station:* ${station}\n🏷️ *Tag:* ${tag}\n📊 *Value:* ${value}\n⚠️ *Severity:* ${severity}\n🕒 *Time:* ${new Date().toLocaleString()}`;

    for (const id of chatId.split(",")) {
      const targetId = id.trim();
      if (!targetId) continue;

      fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: targetId,
          text: message,
          parse_mode: "Markdown",
        }),
      }).catch((err) => {
        console.error(
          "[alarm worker] Telegram notification failed:",
          err.message,
        );
      });
    }
  } catch (err) {
    console.error("[alarm worker] Alert dispatcher error:", err.message);
  }
}
