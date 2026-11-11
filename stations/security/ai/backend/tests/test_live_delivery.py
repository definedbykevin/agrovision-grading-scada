import json
import struct
import threading
import time
import unittest
from unittest.mock import patch

import numpy as np
from flask import Flask
from core import rtsp_streamer as streams
from core.live_delivery import LiveDelivery, deliveries
from routes.stream_routes import stream_bp


def unpack(data):
    packets = []
    while data:
        size = struct.unpack('!I', data[:4])[0]
        meta = json.loads(data[4:4 + size])
        packets.append((meta, data[4 + size:4 + size + meta['length']]))
        data = data[4 + size + meta['length']:]
    return packets


class LiveDeliveryTests(unittest.TestCase):
    def options(self, **changes):
        return dict(camera_ids=[1], focus_id=None, viewed_ids={1}, preview_width=320, preview_fps=30, **changes)

    def test_credit_limits_ack_validation_and_expiry(self):
        delivery = LiveDelivery(self.options())
        first = delivery.reserve(300000)
        last = delivery.reserve(300000)
        self.assertFalse(delivery.available())
        with self.assertRaises(ValueError): delivery.update(last + 1)
        delivery.update(first)
        self.assertTrue(delivery.available())
        self.assertEqual(delivery.pending_bytes, 300000)
        with self.assertRaises(ValueError): delivery.update(0)
        delivery.update(last)
        for _ in range(delivery.MAX_BATCHES): delivery.reserve(1)
        self.assertFalse(delivery.available())
        delivery.updated_at = time.monotonic() - 31
        self.assertTrue(delivery.expired())

    def test_slow_viewer_stops_writes_then_resumes_at_latest_frame_without_reopening_reader(self):
        clock = [0.0]
        reader = unittest.mock.Mock(running=True)
        reader.get_packet.side_effect = lambda **kw: ({'camera_id': 1, 'sequence': round(clock[0] * 30), 'status': 'live'}, b'jpeg')
        delivery = LiveDelivery(self.options())
        def tick(seconds):
            clock[0] += seconds
            if clock[0] >= 2:
                delivery.update(delivery.sent)
        with patch.object(streams, 'get_stream_manager', return_value=reader) as opens, \
                patch.object(streams.time, 'monotonic', side_effect=lambda: clock[0]), \
                patch.object(streams.time, 'sleep', side_effect=tick):
            delivery.updated_at = 0
            generator = streams.generate_combined_stream(camera_infos={1: {'id': 1}}, batch=True, delivery=delivery, **self.options())
            packets = [unpack(next(generator)) for _ in range(delivery.MAX_BATCHES)]
            self.assertEqual(delivery.sent, 8)
            received = unpack(next(generator))
            self.assertGreaterEqual(received[0][0]['sequence'], 60)
            self.assertEqual(received[-1][0]['type'], 'batch')
            self.assertEqual(opens.call_count, 1)
            generator.close()

    def test_feedback_updates_focus_and_camera_subset_on_existing_stream(self):
        clock = [0.0]
        infos = {cid: {'id': cid, 'rtsp_url': f'rtsp://test/{cid}'} for cid in [1, 2]}
        class Reader:
            running = True
            def __init__(self, cid): self.cid, self.rtsp_url = cid, infos[cid]['rtsp_url']
            def get_packet(self, **kw):
                return {'camera_id': self.cid, 'sequence': round(clock[0] * 30), 'status': 'live'}, b'detail' if kw.get('detail') else b'grid'
        options = self.options()
        delivery = LiveDelivery(options)
        with patch.object(streams, 'get_stream_manager', side_effect=lambda cid, **kw: Reader(cid)), \
                patch.object(streams, 'get_live_camera_infos', side_effect=lambda ids: {cid: infos[cid] for cid in ids}), \
                patch.object(streams.time, 'sleep', side_effect=lambda seconds: clock.__setitem__(0, clock[0] + seconds)), \
                patch.object(streams.time, 'monotonic', side_effect=lambda: clock[0]):
            generator = streams.generate_combined_stream(camera_infos={1: infos[1]}, batch=True, delivery=delivery, **options)
            self.assertEqual(unpack(next(generator))[0][1], b'grid')
            delivery.update(1, {**options, 'camera_ids': [2], 'viewed_ids': {2}, 'focus_id': 2})
            received = unpack(next(generator))
            self.assertEqual(received[0][0]['camera_id'], 2)
            self.assertEqual(received[0][1], b'detail')
            generator.close()

    def test_per_viewer_jpeg_dimensions_are_independent_and_encodes_are_shared(self):
        with patch.object(threading.Thread, 'start'):
            manager = streams.CameraStreamManager({'id': 1, 'camera_name': 'test', 'rtsp_url': 'rtsp://test'}, preview=True)
        manager.latest_frame = np.zeros((720, 1280, 3), dtype=np.uint8)
        manager.latest_jpeg = streams.encode_preview(manager.latest_frame, 640)
        manager.source_shape = [1280, 720]
        manager.jpeg_shape = [640, 360]
        manager.last_frame_at = time.monotonic()
        with patch.object(streams, 'encode_preview', wraps=streams.encode_preview) as encoder:
            for width in [160, 320, 160, 320, 640]:
                meta, jpeg = manager.get_packet(preview_width=width, viewer_key=width)
                image = streams.cv2.imdecode(np.frombuffer(jpeg, np.uint8), streams.cv2.IMREAD_COLOR)
                self.assertEqual(image.shape[1], width)
                self.assertEqual(meta['jpeg_width'], width)
            self.assertEqual(encoder.call_count, 2)
        manager.stop()

    def test_http_feedback_validation_and_session_cleanup(self):
        app = Flask(__name__)
        app.register_blueprint(stream_bp)
        client = app.test_client()
        token = 'a' * 32
        reader = unittest.mock.Mock(running=True)
        reader.get_packet.return_value = ({'camera_id': 1, 'sequence': 1, 'status': 'live'}, b'jpeg')
        with patch('routes.stream_routes.get_live_camera_infos', return_value={1: {'id': 1}}), \
                patch.object(streams, 'get_stream_manager', return_value=reader):
            self.assertEqual(client.get('/api/security-ai/live?ids=1&session=bad').status_code, 400)
            response = client.get(f'/api/security-ai/live?ids=1&session={token}', buffered=False)
            self.assertEqual(response.headers['X-CCTV-Control'], '1')
            self.assertIn(token, deliveries)
            self.assertEqual(client.get(f'/api/security-ai/live?ids=1&session={token}').status_code, 409)
            control = f'/api/security-ai/live/control/{token}'
            self.assertEqual(client.post(control, json={'ack': 999}).status_code, 400)
            self.assertEqual(client.post(control, json={'ack': 1, 'query': 'ids=2&view=1'}).status_code, 400)
            self.assertEqual(client.post(control, json={'ack': 1, 'query': 'ids=2&view=2&focus=2&width=160&fps=15'}).status_code, 200)
            self.assertEqual(deliveries[token].snapshot()[0]['focus_id'], 2)
            response.close()
            self.assertNotIn(token, deliveries)
            self.assertEqual(client.post(control, json={'ack': 1}).status_code, 404)

    def test_substream_probe_only_hands_over_a_valid_capture_and_closes_it_on_stop(self):
        with patch.object(threading.Thread, 'start'):
            manager = streams.CameraStreamManager({'id': 1, 'camera_name': 'test', 'rtsp_url': 'rtsp://test'}, preview=True, persistent=True)
        bad = unittest.mock.Mock()
        bad.read.return_value = (False, None)
        with patch.object(streams.cv2, 'VideoCapture', return_value=bad):
            manager._probe_substream('rtsp://test/sub', [])
        bad.release.assert_called_once()
        self.assertIsNone(manager._take_substream())
        healthy = unittest.mock.Mock()
        healthy.read.return_value = (True, np.zeros((360, 640, 3), dtype=np.uint8))
        with patch.object(streams.cv2, 'VideoCapture', return_value=healthy):
            manager._probe_substream('rtsp://test/sub', [])
        healthy.release.assert_not_called()
        self.assertIs(manager._take_substream(), healthy)
        manager.substream_capture = healthy
        manager.stop()
        healthy.release.assert_called_once()

    def test_main_fallback_switches_to_valid_substream_without_reopening_main(self):
        clock = [0.0]
        with patch.object(threading.Thread, 'start'):
            manager = streams.CameraStreamManager({'id': 1, 'camera_name': 'test',
                'rtsp_url': 'rtsp://test/Streaming/Channels/101'}, preview=True, persistent=True)
        manager.stop_event = unittest.mock.Mock()
        manager.stop_event.wait.side_effect = lambda seconds: clock.__setitem__(0, clock[0] + seconds)
        class Capture:
            def __init__(self, opened=True, recovered=False):
                self.opened, self.recovered = opened, recovered
                self.releases, self.grabs = 0, 0
            def isOpened(self): return self.opened
            def get(self, prop): return 20
            def read(self): return True, np.zeros((180, 320, 3), np.uint8)
            def retrieve(self): return self.read()
            def grab(self):
                self.grabs += 1
                clock[0] += .05
                if self.recovered and self.grabs >= 3: manager.running = False
                return True
            def release(self): self.releases += 1
        class Probe:
            def __init__(self, target, args, **kw): self.target, self.args = target, args
            def start(self): self.target(*self.args)
            def is_alive(self): return False
        failed = [Capture(False), Capture(False)]
        main, sub = Capture(), Capture(recovered=True)
        with patch.object(streams.cv2, 'VideoCapture', side_effect=[*failed, main, sub]) as opened, \
                patch.object(streams.threading, 'Thread', Probe), \
                patch.object(streams, 'SUBSTREAM_RETRY_SECONDS', .1), \
                patch.object(streams.random, 'uniform', return_value=0), \
                patch.object(streams.time, 'monotonic', side_effect=lambda: clock[0]):
            manager._update_loop()
        self.assertEqual(opened.call_count, 4)
        self.assertEqual(manager.source_kind, 'substream')
        self.assertEqual(manager.substream_recoveries, 1)
        self.assertEqual(manager.reconnects, 2)
        self.assertEqual(main.releases, 1)
        self.assertEqual(sub.releases, 1)


if __name__ == '__main__':
    unittest.main()
