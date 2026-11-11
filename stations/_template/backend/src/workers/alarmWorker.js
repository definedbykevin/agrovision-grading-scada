import { createClient } from "redis";
import { liveDataCache } from "../routes/monitorRoutes.js";

const REDIS_URL =
  process.env.REDIS_URL || "redis://:REDIS_PASSWORD@localhost:6379";
const REDIS_CHANNEL = process.env.REDIS_CHANNEL || "kip:plc:data";
const TAG_PREFIX = process.env.TAG_PREFIX || "TEMPLATE_";

export async function startAlarmWorker() {
  const subscriber = createClient({ url: REDIS_URL });

  subscriber.on("error", (err) => {
    console.error(
      `[${TAG_PREFIX} worker] Redis connection error:`,
      err.message || err.toString() || err,
    );
  });

  await subscriber.connect();
  console.log(
    `[${TAG_PREFIX} worker] Redis subscriber connected to ${REDIS_CHANNEL}`,
  );

  await subscriber.subscribe(REDIS_CHANNEL, async (message) => {
    try {
      const data = JSON.parse(message);

      // Hanya update liveDataCache untuk realtime display di monitorRoutes
      // Threshold evaluation & event logging dipindah ke station-service (single source of truth)
      for (const [tag, val] of Object.entries(data)) {
        if (tag.startsWith(TAG_PREFIX)) {
          liveDataCache[tag] = val;
        }
      }
    } catch (err) {
      console.error(
        `[${TAG_PREFIX} worker] Error processing message:`,
        err.message,
      );
    }
  });
}
