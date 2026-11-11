# CCTV live preview

The grid and fullscreen use one binary HTTP connection through
`/api/security/cctv/live?ids=18,19,...&view=18,19,...&focus=18&width=320&fps=30`.
The gateway forwards to `/api/security-ai/live` on port 4101. `ids` includes up
to 256 positive IDs. `view` selects visible tiles; omitting it sends every image,
and an empty value sends statuses only. `focus` selects a fullscreen JPEG up to
1280 pixels. Packets contain a 4-byte big-endian JSON-header length, UTF-8 metadata,
then `length` JPEG bytes. Unchanged frames produce a heartbeat once per second.
Current browsers also send a random 32-hex `session` token. The server advertises
`X-CCTV-Control: 1` and ends each batch with a zero-payload packet containing
`type: "batch"` and `batch_id`. The browser acknowledges consumed batches with
`POST /api/security/cctv/live/control/<session>` and JSON `{ack, query}`, where
`query` contains the validated live subscription parameters. The gateway forwards
this to the corresponding `/api/security-ai/live/control/<session>` endpoint.
The server stops producing for this viewer at eight unacknowledged batches or a
512 KiB outstanding-byte watermark. A batch stops after crossing 256 KiB; one
JPEG can cross that threshold. These are watermarks, not strict payload limits.
Capture continues independently, retaining the newest frame rather than a history.
Feedback expires after 30 seconds; closing/expiring the response removes its state.
Feedback and video must reach the same Python process. The existing single-worker
PM2 launcher provides this; a multi-process WSGI deployment would require shared
session state or affinity.
The legacy live endpoint batches one polling sweep into writes around 2 MiB maximum
(plus a single frame's header), retaining individual binary packet boundaries.
This reduces WSGI/HTTP write overhead without waiting for a batch to fill.

## Server lifecycle

The CCTV supervisor starts with Python and warms all enabled cameras from
`agrovision_security.public.cctv_cameras`. Every five seconds it reconciles new URLs,
edits, deletions and activation changes. Identical URLs share a reader. Database
outages preserve existing readers and retry. Live CCTV uses this master table
directly, independently of the secondary AI configuration sync.
The delivery loop consumes the supervisor's configuration snapshot and detects
snapshot replacements immediately. Database refreshes run off the delivery path;
a database timeout does not pause every healthy camera on the shared connection.

Enabled preview readers continue reading RTSP when users leave the page or close
the browser, while the project services remain running. Stopping services, the PC,
or the NVR/network stops delivery. With no viewer for two seconds, RTSP is still
decoded/drained continuously; only BGR conversion/JPEG encoding drops to 1 FPS.
Viewers and frame consumers restore the full rate. This does not add recording.

Capture uses OpenCV's in-process FFmpeg backend with CPU decoding explicitly
selected, one decoder thread, and five-second open/read timeouts. There are no
FFmpeg child consoles, CUDA requirements, unread stderr pipes or 100 MB Python
pipe buffers. Native aspect ratio and resolution are retained. The supported
parameters are in the [OpenCV video I/O reference](https://docs.opencv.org/4.12.0/d4/d15/group__videoio__flags__base.html).

Defaults: preview width 640, JPEG quality 72, maximum 30 encoded FPS. Optional
`CCTV_PREVIEW_FPS` is clamped to 1-30; a 20 FPS source cannot yield 30 unique frames.
`CCTV_PREVIEW_WIDTH`, `CCTV_JPEG_QUALITY`, and `CCTV_PREFER_SUBSTREAM` remain
optional service-wide settings. New cameras only require saving a valid RTSP URL
and enabling the camera; no per-camera process/deployment configuration is needed.
Camera name/code are optional when adding a camera; saving only a valid RTSP URL
automatically creates them, defaults to Security, and enables the camera. The
management form retains a usable default station if the station API is unavailable.
The browser initially sends a grid preview `width` between 320 and 1280 based on visible
tile dimensions, rounded up in 80-pixel increments. Readers use the largest active
viewer's requested width, capped by `CCTV_PREVIEW_WIDTH`; viewer requests expire
after two seconds. This reduces grid JPEG size without reducing the source frame,
fullscreen detail, or main-stream snapshots. Existing clients without `width`
retain the configured preview size. A ResizeObserver updates the subscription
when the grid layout changes.
Each viewer receives its requested JPEG width, even when another viewer requests
a larger preview. Size variants share a per-frame cache and a separate encoding
lock, so concurrent viewers reuse matching encodes without blocking the capture
lock. Delivery FPS is checked before requesting/encoding fullscreen frames.
The endpoint also accepts widths down to 160 for bandwidth adaptation, and an
optional per-viewer `fps` from 1 to 30. Lower delivery rates sample the newest
shared frame; they do not change capture FPS, snapshots, or other viewers.

Hikvision `*01` URLs are tried as `*02` substreams, falling back independently to
the stored URL after two failures. Other RTSP paths are used as entered. Preview
readers that have fallen back to main streams probe the preferred substream in
the background after `CCTV_SUBSTREAM_RETRY_SECONDS` (default 300, minimum 60), with
up to 60 seconds of jitter. A valid decoded substream replaces the main capture;
failed probes leave the working main stream intact. This prevents a temporary
substream failure from leaving previews on expensive main streams indefinitely.
Snapshot and AI callers use a shared main reader that closes after 30 idle seconds. Cold
snapshots wait up to five seconds for the first frame. Reconnects use interruptible
exponential backoff with jitter, bounded around 30 seconds. Repeated failures show
`offline` while retrying, without stopping healthy readers.

Some Windows OpenCV builds serialize RTSP opens, so 47 cold readers can take
roughly a minute to warm. Future viewers reuse warmed readers. FFmpeg safety
locks remain enabled: disabling them requires a verified threading-capable build
and OpenCV notes Linux testing in its [environment reference](https://docs.opencv.org/4.12.0/d6/dea/tutorial_env_reference.html).

PM2 runs `run-service.cjs`, launching Python with `windowsHide: true`, keeping logs
in PM2 and refusing a duplicate worker on an occupied port. PM2 stop/restart
terminates the child. `SECURITY_AI_PYTHON` selects the interpreter. The PM2 memory
restart limit applies to the Node launcher; monitor Python child RSS separately.
The old root `patch_streamer.py` no longer reinstalls the CUDA/15 FPS path.

## Browser behavior

Each camera keeps at most one pending JPEG. Replaced ImageBitmaps are closed and
painting is coalesced through animation frames. Opaque Canvas2D contexts request
CPU backing with `willReadFrequently`; actual backing depends on the browser.
IntersectionObserver skips offscreen decoding/painting and updates `view` so
those tiles receive status only. Their server readers continue running.
While fullscreen is open, only the focused camera sends images and the covered
grid stops painting. Closing fullscreen restores visible grid images.
There are at most eight simultaneous JPEG decode jobs per connection. A camera
cannot decode another JPEG before its completed bitmap is painted; newer pending
frames replace older ones. JPEGs are resized to display dimensions while creating
the ImageBitmap, with native aspect ratio preserved. Fullscreen keeps its larger
image. Fragmented payloads use one allocation per JPEG instead of repeatedly
copying the entire partial frame. A malformed JPEG affects only its camera.

Monotonic send/receive clock deltas detect backlog. Frames over 1.5 seconds behind
are identified using minimum offsets from the latest minute, bounded to one
sample per second. This follows gradual server/browser clock drift during long
viewing sessions instead of mistaking it for an ever-growing network queue.
Delayed frames
are discarded. With feedback enabled, subscriptions and bandwidth budgets update
on the existing video connection. Grid resizing, scrolling, opening/closing
fullscreen, and automatic delivery adaptation do not reopen that connection.
Legacy servers without feedback retain the previous reconnect-based adaptation.
Transient backlog no longer reconnects every tile. Actual connection loss or a
12-second stream stall still retries. An individual stale/offline camera affects
only itself. Subscription changes retain healthy camera statuses.
If backlog exceeds 1.5 seconds continuously for two seconds, grid width is
halved first, down to 160 pixels. If that is still insufficient, only this
connection's delivery FPS is halved, down to 1 FPS. Feedback applies adaptation
in place; outstanding batches drain while newly produced frames use the new
budget. Only legacy connections reopen after 100 ms. The chosen budget
is retained for the current group rather than repeatedly retrying the same
overloaded resolution/rate. Grid and fullscreen have separate FPS budgets;
fullscreen detail resolution is retained. This trades grid detail/rate for
freshness only when the delivery path cannot sustain the initial request.
Backpressure can also discard producer sequences without a growing timestamp
backlog. A five-second receive window compares unique received JPEGs against
the producer sequence rate and current delivery limit. Below 70% of that rate,
the same adaptation is applied. Low camera/producer FPS by itself is not treated
as insufficient delivery capacity.

Hidden tabs close viewing HTTP connections and resume when visible; unmount
aborts fetch and the gateway releases upstream. Camera lists refresh every five
seconds and after camera-management saves. URLs are relative to the app origin
for local, remote and proxied clients. New cameras appear without page refresh.

## Verification

From the repository root:

```powershell
node --test stations/security/frontend/components/cctvTransport.test.mjs
```

Actual FPS depends on source rate, CPU, browser and bandwidth.
Canvas `data-cctv-rendered-frames` exposes render counts.
These are actual unique bitmap paints rather than completed JPEG decode counts.
Measure the difference in counts over elapsed seconds to obtain displayed FPS.
The `getCctvDiagnostics()` export from `cctvTransport.js` reports decode queue
sizes, connection attempts, decode errors, dropped frames/backlog, bitmap sizes,
and the last transport error, without RTSP credentials. It also includes
`bandwidthAdaptations`, `requestedWidth`, and `requestedFps`.
`flowControlled` confirms negotiation and `acknowledgedBatch` confirms that
browser feedback reaches the streaming worker.

From `stations/security/ai/backend`:

```powershell
python -B -m unittest discover -s tests -v
```

From `stations/security/backend`:

```powershell
node --test tests/cctv-crud-isolated.test.mjs
node --test tests/cctv-delivery-proxy.test.mjs
```

The CRUD test creates/drops only `cctv_verify_api_<pid>`. It uses real PostgreSQL
for identities, imported-code collisions, concurrent saves, URL validation/edits,
activation and deletion, plus a local mock for secondary AI HTTP sync. It does not
modify real cameras.

`GET /api/security/cctv/stream/status` reports existing readers, persistence,
CPU decoding, sequence, status, frame age, resolution, source/target FPS and
reconnect counts without RTSP credentials.
It also reports `encoded_fps` over recent frames, `encoding_mode` (idle/viewing),
and `preview_resolution`. Idle encodes normally run at 1 FPS; `target_fps=30`
is a limit, not evidence that the source or displayed image runs at 30 FPS.
`substream_recoveries` counts successful background switches from main fallback.
