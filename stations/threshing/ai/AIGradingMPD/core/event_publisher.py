from __future__ import annotations

import json
import logging
from datetime import datetime

from config.settings import Settings


logger = logging.getLogger(__name__)


class EventPublisher:
    def __init__(self) -> None:
        self._client = None

    def publish(self, payload: dict) -> None:
        if not Settings.REDIS_URL:
            return
        try:
            if self._client is None:
                import redis
                self._client = redis.Redis.from_url(Settings.REDIS_URL, decode_responses=True)
            serializable = {
                key: value.isoformat() if isinstance(value, datetime) else value
                for key, value in payload.items()
            }
            self._client.publish(Settings.REDIS_CHANNEL, json.dumps(serializable))
        except Exception as error:
            logger.warning("Unable to publish MPD event: %s", error)
            self._client = None


event_publisher = EventPublisher()
