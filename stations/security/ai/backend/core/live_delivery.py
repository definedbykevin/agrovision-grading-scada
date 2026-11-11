"""Per-viewer flow control. Slow sockets never queue a history of live frames."""
import threading
import time
from collections import deque


class LiveDelivery:
    MAX_BATCHES = 8
    MAX_BYTES = 512 * 1024
    TIMEOUT = 30

    def __init__(self, options):
        self.lock = threading.Lock()
        self.options = options
        self.revision = 0
        self.sent = 0
        self.acked = 0
        self.pending = deque()
        self.pending_bytes = 0
        self.updated_at = time.monotonic()

    def update(self, ack, options=None):
        with self.lock:
            if not isinstance(ack, int) or isinstance(ack, bool) or not self.acked <= ack <= self.sent:
                raise ValueError('Invalid delivery acknowledgement')
            self.acked = ack
            while self.pending and self.pending[0][0] <= ack:
                _, size = self.pending.popleft()
                self.pending_bytes -= size
            if options is not None and options != self.options:
                self.options = options
                self.revision += 1
            self.updated_at = time.monotonic()

    def snapshot(self):
        with self.lock:
            return self.options, self.revision

    def available(self):
        with self.lock:
            return len(self.pending) < self.MAX_BATCHES and self.pending_bytes < self.MAX_BYTES

    def expired(self):
        return time.monotonic() - self.updated_at > self.TIMEOUT

    def reserve(self, size):
        with self.lock:
            self.sent += 1
            self.pending.append((self.sent, size))
            self.pending_bytes += size
            return self.sent


deliveries = {}
delivery_lock = threading.Lock()
