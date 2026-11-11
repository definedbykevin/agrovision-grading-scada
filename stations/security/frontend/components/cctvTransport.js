// Wire format: uint32 header length (network order), JSON header, JPEG bytes.
// One connection carries every camera. There is never a per-camera fetch queue.
export class FrameDecoder {
    constructor() {
        this.decoder = new TextDecoder();
        this.reset();
    }
    reset() {
        this.stage = 'prefix';
        this.part = new Uint8Array(4);
        this.filled = 0;
        this.bufferedBytes = 0;
        this.meta = null;
    }
    push(chunk) {
        let offset = 0;
        const packets = [];
        // Allocate each header/JPEG once. Re-copying the entire partial JPEG on
        // every network chunk makes fragmented multi-camera streams quadratic.
        while (offset < chunk.length) {
            const count = Math.min(this.part.length - this.filled, chunk.length - offset);
            this.part.set(chunk.subarray(offset, offset + count), this.filled);
            this.filled += count;
            this.bufferedBytes += count;
            offset += count;
            if (this.filled !== this.part.length) continue;
            if (this.stage === 'prefix') {
                const size = new DataView(this.part.buffer).getUint32(0);
                if (!size || size > 4096) throw new Error('Invalid CCTV header');
                this.stage = 'header';
                this.part = new Uint8Array(size);
                this.filled = 0;
            } else if (this.stage === 'header') {
                this.meta = JSON.parse(this.decoder.decode(this.part));
                if (!this.meta || typeof this.meta !== 'object' || Array.isArray(this.meta)
                    || !Number.isSafeInteger(this.meta.length) || this.meta.length < 0
                    || this.meta.length > 2 * 1024 * 1024) throw new Error('Invalid CCTV frame length');
                this.stage = 'jpeg';
                this.part = new Uint8Array(this.meta.length);
                this.filled = 0;
                if (!this.meta.length) {
                    packets.push({ meta: this.meta, jpeg: this.part });
                    this.reset();
                }
            } else {
                packets.push({ meta: this.meta, jpeg: this.part });
                this.reset();
            }
        }
        return packets;
    }
}

const groups = new Map();

// Compare monotonic clock deltas; server/browser wall clocks need not match.
export class StreamClock {
    constructor() { this.offset = Infinity; this.samples = []; }
    backlog(meta, receivedAt) {
        if (!Number.isFinite(meta.sent_ms)) return 0;
        const offset = receivedAt - meta.sent_ms;
        // Different monotonic clocks can drift during an all-day viewing session.
        // Keep one minimum per second over a minute, rather than anchoring every
        // future frame to the smallest offset ever observed on this connection.
        const second = Math.floor(receivedAt / 1000);
        const last = this.samples.at(-1);
        if (last?.[0] === second) last[1] = Math.min(last[1], offset);
        else this.samples.push([second, offset]);
        while (this.samples[0][0] < second - 60) this.samples.shift();
        this.offset = Infinity;
        for (const [, minimum] of this.samples) this.offset = Math.min(this.offset, minimum);
        return Math.max(0, offset - this.offset);
    }
}
const messages = {
    connecting: 'Menghubungkan kamera…', reconnecting: 'Koneksi terputus. Menghubungkan ulang…',
    offline: 'Kamera tidak aktif atau tidak tersedia', live: '',
};

function notify(source, status) {
    if (source.status === status) return;
    source.status = status;
    for (const listener of source.subscribers.values()) listener(status, messages[status]);
}

function draw(source, target) {
    const image = source.bitmap;
    if (!image || target.dataset.cctvVisible === 'false' || document.hidden
        || !target.clientWidth || !target.clientHeight) return;
    const width = Math.max(1, Math.round(target.clientWidth));
    const height = Math.max(1, Math.round(target.clientHeight));
    if (target.width !== width) target.width = width;
    if (target.height !== height) target.height = height;
    const scale = target.dataset.fit === 'contain'
        ? Math.min(width / image.width, height / image.height)
        : Math.max(width / image.width, height / image.height);
    // Opaque CPU-backed canvas avoids allocating a GPU surface per CCTV tile.
    const context = target.getContext('2d', { alpha: false, willReadFrequently: true });
    if (!context) return;
    context.fillStyle = '#000';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, (width - image.width * scale) / 2,
        (height - image.height * scale) / 2, image.width * scale, image.height * scale);
    // Count actual paints, not JPEG decodes that were replaced before painting.
    if (target.dataset.cctvFrameSerial !== String(source.frameSerial)) {
        target.dataset.cctvFrameSerial = String(source.frameSerial);
        target.dataset.cctvRenderedFrames = String(Number(target.dataset.cctvRenderedFrames || 0) + 1);
    }
}

const visible = source => [...source.subscribers.keys()].some(canvas => canvas.dataset.cctvVisible !== 'false');
const focused = group => [...group.sources].find(([, source]) =>
    [...source.subscribers.keys()].some(canvas => canvas.dataset.fit === 'contain' && canvas.dataset.cctvVisible !== 'false'));
const wantsImage = (group, id, source) => {
    return group.focusId ? group.focusId === id : visible(source);
};

function scheduleDraw(group, source) {
    group.dirty.add(source);
    if (group.paint !== null) return;
    const paint = () => {
        group.paint = null;
        const focus = group.focusId;
        for (const dirty of group.dirty) {
            for (const canvas of dirty.subscribers.keys()) {
                if (!focus || canvas.dataset.fit === 'contain') draw(dirty, canvas);
            }
        }
        group.dirty.clear();
        for (const source of group.sources.values()) queueDecode(group, source);
        pumpDecodes(group);
    };
    group.paint = typeof requestAnimationFrame === 'function' ? requestAnimationFrame(paint) : setTimeout(paint, 0);
}

function streamUrl(group) {
    const url = new URL(group.endpoint);
    url.searchParams.set('ids', [...group.sources.keys()].join(','));
    const focus = focused(group);
    url.searchParams.set('view', focus ? focus[0] : [...group.sources].filter(([, source]) => visible(source)).map(([id]) => id).join(','));
    if (focus) url.searchParams.set('focus', focus[0]);
    let width = 320;
    for (const [, source] of group.sources) {
        for (const canvas of source.subscribers.keys()) {
            if (canvas.dataset.cctvVisible === 'false' || canvas.dataset.fit === 'contain') continue;
            const aspect = source.nativeSize ? source.nativeSize[0] / source.nativeSize[1] : 16 / 9;
            width = Math.max(width, canvas.clientWidth, canvas.clientHeight * aspect);
        }
    }
    // Quantize to avoid reconnecting for tiny layout rounding changes.
    const previewWidth = focus ? width : width * group.previewScale;
    url.searchParams.set('width', String(Math.max(160, Math.min(1280, Math.ceil(previewWidth / 80) * 80))));
    url.searchParams.set('fps', String(group.transportFps));
    return url;
}

const MAX_DECODES = 8;
function bitmapOptions(group, source) {
    if (!source.nativeSize) return undefined;
    const [width, height] = source.nativeSize;
    let scale = 0;
    for (const canvas of source.subscribers.keys()) {
        if (canvas.dataset.cctvVisible === 'false' || (group.focusId && canvas.dataset.fit !== 'contain')) continue;
        const fit = canvas.dataset.fit === 'contain' ? Math.min : Math.max;
        scale = Math.max(scale, fit(canvas.clientWidth / width, canvas.clientHeight / height));
    }
    scale = Math.min(1, scale);
    if (!scale || scale >= 1) return undefined;
    // Keep only the pixels the canvas can display; fullscreen retains its own
    // higher-resolution JPEG. Avoid resizing a full 640px bitmap on every paint.
    return { resizeWidth: Math.max(1, Math.ceil(width * scale)),
        resizeHeight: Math.max(1, Math.ceil(height * scale)), resizeQuality: 'medium' };
}
function queueDecode(group, source) {
    if (source.pending && !source.decoding && !group.dirty.has(source)) group.decodeQueue.add(source);
}
function pumpDecodes(group) {
    for (const source of group.decodeQueue) {
        if (group.activeDecodes >= MAX_DECODES) break;
        group.decodeQueue.delete(source);
        if (!source.pending || source.decoding || group.dirty.has(source)) continue;
        void decodeLatest(group, source);
    }
}
async function decodeLatest(group, source) {
    source.decoding = true;
    group.activeDecodes++;
    try {
        const { jpeg, meta, generation, frameEpoch } = source.pending;
        source.pending = null;
        if (Number.isSafeInteger(meta.jpeg_width) && meta.jpeg_width > 0
            && Number.isSafeInteger(meta.jpeg_height) && meta.jpeg_height > 0) {
            source.nativeSize = [meta.jpeg_width, meta.jpeg_height];
        }
        const bitmap = await createImageBitmap(new Blob([jpeg], { type: 'image/jpeg' }), bitmapOptions(group, source));
        if (generation !== group.generation || frameEpoch !== source.frameEpoch
            || group.controller?.signal.aborted || !source.subscribers.size || document.hidden
            || !wantsImage(group, source.id, source)) { bitmap.close(); return; }
        source.bitmap?.close();
        source.nativeSize ??= [bitmap.width, bitmap.height];
        source.bitmap = bitmap;
        source.frameSerial++;
        notify(source, 'live');
        scheduleDraw(group, source);
    } catch {
        // A bad JPEG is local to this camera and must not reset the shared stream.
        source.decodeErrors++;
    } finally {
        source.decoding = false;
        group.activeDecodes--;
        queueDecode(group, source);
        pumpDecodes(group);
    }
}

function stop(group) {
    group.generation++;
    group.controller?.abort();
    group.controller = null;
    clearTimeout(group.retry);
    group.retry = null;
    clearTimeout(group.feedbackTimer);
    group.feedbackTimer = null;
    group.controlled = false;
    group.feedbackBusy = false;
    group.decodeQueue.clear();
    for (const source of group.sources.values()) {
        source.pending = null;
        source.frameEpoch++;
        source.nativeSize = null;
        source.rateWindow = null;
    }
}

function subscription(group) {
    const nextFocus = focused(group)?.[0] || null;
    if (nextFocus !== group.focusId) {
        if (group.focusId) group.focusFps = group.transportFps;
        else group.gridFps = group.transportFps;
        group.transportFps = nextFocus ? group.focusFps : group.gridFps;
    }
    const url = streamUrl(group);
    group.focusId = url.searchParams.get('focus');
    return url;
}

// Feedback travels separately from the video response. The server limits
// unacknowledged bytes and always samples the newest shared camera frame.
function feedback(group, generation, delay = 80) {
    if (!group.controlled || generation !== group.generation || group.feedbackBusy
        || !group.controller || group.controller.signal.aborted) return;
    const deadline = performance.now() + delay;
    if (group.feedbackTimer !== null) {
        if (group.feedbackAt <= deadline) return;
        clearTimeout(group.feedbackTimer);
    }
    group.feedbackAt = deadline;
    group.feedbackTimer = setTimeout(async () => {
        group.feedbackTimer = null;
        if (generation !== group.generation || !group.controlled || group.controller.signal.aborted) return;
        group.feedbackBusy = true;
        const controller = new AbortController();
        const cancel = () => controller.abort();
        const videoSignal = group.controller.signal;
        videoSignal.addEventListener('abort', cancel, { once: true });
        const timeout = setTimeout(cancel, 5000);
        const ack = group.ack;
        const signature = group.signature;
        try {
            const response = await fetch(`${group.endpoint}/control/${group.session}`, {
                method: 'POST', signal: controller.signal, cache: 'no-store',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ack, query: new URL(signature).searchParams.toString() }),
            });
            await response.arrayBuffer();
            if (!response.ok) throw new Error(`CCTV feedback HTTP ${response.status}`);
            if (generation !== group.generation) return;
            group.feedbackFailures = 0;
            group.acknowledged = ack;
        } catch (error) {
            if (generation !== group.generation || videoSignal.aborted) return;
            if (++group.feedbackFailures >= 3) {
                group.lastError = error.message;
                group.controller.abort();
                return;
            }
        } finally {
            clearTimeout(timeout);
            videoSignal.removeEventListener('abort', cancel);
            if (generation === group.generation && group.controlled) {
                group.feedbackBusy = false;
                // A heartbeat also keeps an otherwise status-only viewer alive.
                feedback(group, generation, group.ack > ack || group.signature !== signature ? 0 : 250);
            }
        }
    }, delay);
}

function updateSubscription(group) {
    const url = subscription(group);
    group.signature = url.href;
    for (const source of group.sources.values()) source.rateWindow = null;
    feedback(group, group.generation, 0);
}

function adaptDelivery(group, url) {
    if (!group.focusId && Number(url.searchParams.get('width')) > 160) group.previewScale /= 2;
    else if (group.transportFps > 1) group.transportFps = Math.max(1, Math.floor(group.transportFps / 2));
    else return false;
    group.bandwidthAdaptations++;
    return true;
}

async function connect(group) {
    stop(group);
    if (!group.sources.size || document.hidden) return;
    const generation = group.generation;
    const controller = new AbortController();
    group.controller = controller;
    const url = subscription(group);
    group.signature = url.href;
    // Opaque capability for feedback; legacy servers simply ignore this query.
    group.session = Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
    const requestUrl = new URL(url);
    requestUrl.searchParams.set('session', group.session);
    group.ack = 0;
    group.feedbackFailures = 0;
    group.connections++;
    let receivedAt = performance.now();
    let behindSince = null;
    let retryDelay = 1500;
    let reader;
    const watchdog = setInterval(() => {
        if (performance.now() - receivedAt > 12000) {
            group.lastError = 'stream-stalled';
            controller.abort();
        }
        for (const source of group.sources.values()) {
            if (source.status === 'live' && performance.now() - source.lastFrameAt > 4500) {
                notify(source, 'reconnecting');
            }
        }
    }, 1000);
    try {
        const response = await fetch(requestUrl, { signal: controller.signal, cache: 'no-store' });
        if (!response.ok || !response.body) throw new Error('CCTV server unavailable');
        if (generation !== group.generation || controller.signal.aborted) return;
        group.controlled = response.headers.get('X-CCTV-Control') === '1';
        if (group.controlled) feedback(group, generation, 0);
        reader = response.body.getReader();
        const decoder = new FrameDecoder();
        const clock = new StreamClock();
        while (generation === group.generation) {
            const { value, done } = await reader.read();
            if (done) throw new Error('CCTV stream ended');
            receivedAt = performance.now();
            for (const { meta, jpeg } of decoder.push(value)) {
                if (meta.type === 'batch') {
                    if (Number.isSafeInteger(meta.batch_id) && meta.batch_id > group.ack) group.ack = meta.batch_id;
                    feedback(group, generation);
                    continue;
                }
                if (clock.backlog(meta, receivedAt) > 1500) {
                    group.droppedBacklog++;
                    // Discard transient backlog without disconnecting every camera.
                    // Only a sustained backlog needs a fresh TCP connection.
                    behindSince ??= receivedAt;
                    const activeUrl = new URL(group.signature);
                    if (receivedAt - behindSince > 2000 && adaptDelivery(group, activeUrl)) {
                        // A fresh socket alone cannot fix sustained insufficient
                        // bandwidth. Reduce grid pixels first, then delivery FPS
                        // for this viewer only. Fullscreen retains its detail.
                        if (group.controlled) {
                            updateSubscription(group);
                            behindSince = receivedAt;
                        } else {
                            retryDelay = 100;
                            throw new Error('CCTV bandwidth backlog; adapting preview delivery');
                        }
                    }
                    if (!group.controlled && receivedAt - behindSince > 8000) throw new Error('CCTV connection behind live video');
                    continue;
                }
                behindSince = null;
                const source = group.sources.get(String(meta.camera_id));
                if (!source) continue;
                if (meta.status !== 'live' || (Number.isFinite(meta.age_ms) && meta.age_ms > 1500)) {
                    source.pending = null;
                    source.frameEpoch++;
                    notify(source, meta.status !== 'live' && meta.status in messages ? meta.status : 'reconnecting');
                    continue;
                }
                source.lastFrameAt = receivedAt;
                const display = wantsImage(group, String(meta.camera_id), source);
                if (!display) notify(source, 'live');
                if (!jpeg.length || document.hidden || !display) continue;
                if (Number.isSafeInteger(meta.sequence)) {
                    source.rateWindow ??= { started: receivedAt, sequence: meta.sequence, frames: 0 };
                    const window = source.rateWindow;
                    window.frames++;
                    const seconds = (receivedAt - window.started) / 1000;
                    if (seconds >= 5) {
                        const delivered = (window.frames - 1) / seconds;
                        const produced = (meta.sequence - window.sequence) / seconds;
                        // TCP backpressure may skip sequences without accumulating
                        // timestamp backlog. Detect missing delivery capacity too.
                        if (produced > 0 && delivered < Math.min(produced, group.transportFps) * .7
                            && adaptDelivery(group, new URL(group.signature))) {
                            if (group.controlled) updateSubscription(group);
                            else {
                                retryDelay = 100;
                                throw new Error('CCTV delivery capacity below producer rate; adapting preview delivery');
                            }
                        }
                        source.rateWindow = { started: receivedAt, sequence: meta.sequence, frames: 1 };
                    }
                }
                // At most one pending frame per camera. Slow clients drop old frames.
                if (source.pending) source.droppedFrames++;
                source.pending = { jpeg, meta, generation, frameEpoch: source.frameEpoch };
                queueDecode(group, source);
            }
            // Coalesce all packets in this chunk before starting expensive JPEG work.
            pumpDecodes(group);
        }
    } catch (error) {
        if (generation === group.generation) {
            if (error.name !== 'AbortError') group.lastError = error.message;
            for (const source of group.sources.values()) notify(source, 'reconnecting');
        }
    } finally {
        clearInterval(watchdog);
        controller.abort();
        if (generation === group.generation) {
            group.controlled = false;
            clearTimeout(group.feedbackTimer);
            group.feedbackTimer = null;
        }
        if (reader) { try { await reader.cancel(); } catch { /* already closed */ } }
        if (generation === group.generation && group.sources.size && !document.hidden) {
            group.retry = setTimeout(() => { void connect(group); }, retryDelay);
        }
    }
}

function schedule(group) {
    clearTimeout(group.changeTimer);
    group.changeTimer = setTimeout(() => {
        if (group.controller && !group.controller.signal.aborted && streamUrl(group).href === group.signature) return;
        if (group.controlled && group.controller && !group.controller.signal.aborted) {
            updateSubscription(group);
            return;
        }
        void connect(group);
    }, 100);
}

let lifecycleBound = false;
export function subscribeCctv(src, canvas, listener) {
    const url = new URL(src, window.location.href);
    const id = url.pathname.match(/\/cctv\/stream\/(\d+)$/)?.[1];
    if (!id) { listener('offline', messages.offline); return () => {}; }
    const endpoint = new URL(url.pathname.replace(/\/stream\/\d+$/, '/live'), url.origin).href;
    let group = groups.get(endpoint);
    if (!group) {
        group = { endpoint, sources: new Map(), generation: 0, controller: null, dirty: new Set(), paint: null,
            controlled: false, feedbackTimer: null,
            decodeQueue: new Set(), activeDecodes: 0, connections: 0, droppedBacklog: 0, lastError: null,
            previewScale: 1, transportFps: 30, gridFps: 30, focusFps: 30, bandwidthAdaptations: 0 };
        groups.set(endpoint, group);
    }
    let source = group.sources.get(id);
    const isNew = !source;
    if (!source) {
        source = { id, subscribers: new Map(), bitmap: null, pending: null,
            decoding: false, status: 'connecting', lastFrameAt: 0, frameEpoch: 0, frameSerial: 0,
            droppedFrames: 0, decodeErrors: 0 };
        group.sources.set(id, source);
    }
    source.subscribers.set(canvas, listener);
    let observer;
    let resizeObserver;
    if (typeof ResizeObserver === 'function') {
        resizeObserver = new ResizeObserver(() => schedule(group));
        resizeObserver.observe(canvas);
    }
    if (typeof IntersectionObserver === 'function') {
        observer = new IntersectionObserver(entries => {
            for (const entry of entries) {
                const state = String(entry.isIntersecting);
                if (canvas.dataset.cctvVisible === state) continue;
                canvas.dataset.cctvVisible = state;
                if (!visible(source)) {
                    source.pending = null;
                    source.frameEpoch++;
                    source.bitmap?.close();
                    source.bitmap = null;
                } else draw(source, canvas);
                schedule(group);
            }
        });
        observer.observe(canvas);
    }
    listener(source.status, messages[source.status]);
    draw(source, canvas);
    if (isNew || canvas.dataset.fit === 'contain') schedule(group);
    if (!lifecycleBound) {
        lifecycleBound = true;
        document.addEventListener('visibilitychange', () => {
            for (const active of groups.values()) {
                if (document.hidden) stop(active); else schedule(active);
            }
        });
        window.addEventListener('pagehide', () => { for (const active of groups.values()) stop(active); });
        window.addEventListener('pageshow', () => { for (const active of groups.values()) schedule(active); });
    }
    return () => {
        observer?.disconnect();
        resizeObserver?.disconnect();
        source.subscribers.delete(canvas);
        if (!source.subscribers.size) {
            source.bitmap?.close();
            source.bitmap = null;
            source.pending = null;
            group.decodeQueue.delete(source);
            group.dirty.delete(source);
            group.sources.delete(id);
        }
        if (!group.sources.size) {
            clearTimeout(group.changeTimer);
            stop(group);
            groups.delete(endpoint);
            if (group.paint !== null) {
                if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(group.paint);
                else clearTimeout(group.paint);
                group.paint = null;
            }
            group.dirty.clear();
        } else if (!source.subscribers.size || canvas.dataset.fit === 'contain') schedule(group);
    };
}

// Read-only diagnostics for performance investigations; never includes RTSP URLs.
export function getCctvDiagnostics() {
    return [...groups.values()].map(group => ({
        connections: group.connections, activeDecodes: group.activeDecodes,
        queuedDecodes: group.decodeQueue.size, droppedBacklog: group.droppedBacklog,
        lastError: group.lastError, bandwidthAdaptations: group.bandwidthAdaptations,
        requestedWidth: group.signature ? Number(new URL(group.signature).searchParams.get('width')) : null,
        requestedFps: group.transportFps,
        flowControlled: group.controlled, acknowledgedBatch: group.acknowledged || 0,
        cameras: [...group.sources.values()].map(source => ({
            cameraId: source.id, status: source.status, decodedFrames: source.frameSerial,
            droppedFrames: source.droppedFrames, decodeErrors: source.decodeErrors,
            bitmapResolution: source.bitmap ? [source.bitmap.width, source.bitmap.height] : null,
        })),
    }));
}
