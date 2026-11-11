# ═══════════════════════════════════════════════════════════════════════
# CORE MODULE: REDIS EVENT PUBLISHER
# ═══════════════════════════════════════════════════════════════════════

import json
import logging
import redis
from config.settings import Config

logging.basicConfig(level=logging.INFO)

class RedisEventPublisher:
    """
    // ISI DISINI UNTUK LOGIC A I U E O: PUBLISH EVENT REALTIME KE REDIS PUB/SUB (`kip:security:ai_event`)
    """
    def __init__(self):
        try:
            self.redis_client = redis.Redis.from_url(Config.REDIS_URL, decode_responses=True)
            logging.info("[RedisPublisher] Connected to Redis Pub/Sub successfully.")
        except Exception as e:
            logging.error(f"[RedisPublisher] Failed to connect to Redis: {e}")
            self.redis_client = None

    def publish_ai_event(self, event_type, payload):
        """
        Mempublikasikan payload JSON ke channel Redis `kip:security:ai_event`
        """
        if not self.redis_client:
            logging.warning("[RedisPublisher] Redis client not connected. Skipping publish.")
            return False
            
        message_data = {
            "station": "security",
            "event_type": event_type,
            "payload": payload
        }
        
        try:
            self.redis_client.publish(Config.REDIS_CHANNEL_AI_EVENT, json.dumps(message_data))
            logging.info(f"[RedisPublisher] Published event '{event_type}' to channel {Config.REDIS_CHANNEL_AI_EVENT}")
            return True
        except Exception as e:
            logging.error(f"[RedisPublisher] Error publishing event: {e}")
            return False

# Singleton Instance
redis_pub = RedisEventPublisher()
