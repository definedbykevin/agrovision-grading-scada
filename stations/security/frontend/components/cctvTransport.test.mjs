import assert from 'node:assert/strict';
import { test } from 'node:test';
import http from 'node:http';
import { webcrypto } from 'node:crypto';
import { FrameDecoder, StreamClock, subscribeCctv, getCctvDiagnostics } from './cctvTransport.js';
globalThis.crypto ??= webcrypto;

function packet(id, sequence = 1, extra = {}, jpeg = Buffer.from([255, 216, id, 255, 217])) {
    const header = Buffer.from(JSON.stringify({ camera_id: id, sequence, status: 'live', length: jpeg.length, ...extra }));
    const prefix = Buffer.alloc(4); prefix.writeUInt32BE(header.length);
    return Buffer.concat([prefix, header, jpeg]);
}
const waitFor = async (condition, timeout = 3000) => {
    const until = Date.now() + timeout;
    while (!condition()) {
        if (Date.now() > until) throw new Error('Condition timed out');
        await new Promise(resolve => setTimeout(resolve, 20));
    }
};

test('fragmented binary packets retain all 16 channels without mixing JPEG bytes', () => {
    const data = Buffer.concat(Array.from({ length: 16 }, (_, i) => packet(i + 1)));
    const decoder = new FrameDecoder();
    const received = [];
    for (let i = 0; i < data.length; i += 7) received.push(...decoder.push(data.subarray(i, i + 7)));
    assert.equal(received.length, 16);
    received.forEach(({ meta, jpeg }, i) => {
        assert.equal(meta.camera_id, i + 1); assert.equal(jpeg[2], i + 1);
    });
    assert.equal(decoder.bufferedBytes, 0);
    assert.throws(() => new FrameDecoder().push(Buffer.from([255, 255, 255, 255])));
});

test('offscreen tiles retain live status without JPEG decoding and resume when scrolled into view', async () => {
    const observers = new Map(), decoded = new Map(), urls = [], statuses = new Map();
    globalThis.IntersectionObserver = class {
        constructor(callback) { this.callback = callback; }
        observe(target) { observers.set(target, this.callback); }
        disconnect() {}
    };
    globalThis.document = { hidden: false, addEventListener() {} };
    globalThis.createImageBitmap = async blob => {
        const id = new Uint8Array(await blob.arrayBuffer())[2];
        decoded.set(id, (decoded.get(id) || 0) + 1);
        return { width: 640, height: 360, close() {} };
    };
    const server = http.createServer((req, res) => {
        urls.push(req.url);
        const view = new URL(req.url, 'http://localhost').searchParams.get('view').split(',');
        res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
        let sequence = 0;
        const send = () => {
            sequence++;
            for (const id of [1, 2]) res.write(view.includes(String(id)) ? packet(id, sequence)
                : packet(id, sequence, {}, Buffer.alloc(0)));
        };
        send(); const timer = setInterval(send, 50);
        res.on('close', () => clearInterval(timer));
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    globalThis.window = { location: { href: origin }, addEventListener() {} };
    const canvases = [1, 2].map(() => ({ dataset: { fit: 'cover' }, clientWidth: 320, clientHeight: 180,
        getContext: () => ({ fillRect() {}, drawImage() {} }) }));
    const unsubscribes = [];
    try {
        for (const id of [1, 2]) unsubscribes.push(subscribeCctv(`${origin}/api/security/cctv/stream/${id}`, canvases[id - 1], status => statuses.set(id, status)));
        observers.get(canvases[1])([{ isIntersecting: false }]);
        await waitFor(() => statuses.get(1) === 'live' && statuses.get(2) === 'live' && decoded.get(1) > 3);
        assert.equal(decoded.get(2), undefined);
        assert.equal(urls.length, 1);
        assert.equal(new URL(urls[0], origin).searchParams.get('view'), '1');
        observers.get(canvases[1])([{ isIntersecting: true }]);
        await waitFor(() => decoded.get(2) > 3);
        assert.equal(urls.length, 2);
        assert.equal(statuses.get(1), 'live');
        assert.equal(statuses.get(2), 'live');
    } finally {
        unsubscribes.forEach(unsubscribe => unsubscribe());
        delete globalThis.IntersectionObserver;
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
    }
});

test('backlog detection ignores clock offset and catches continuously arriving delayed frames', () => {
    const clock = new StreamClock();
    assert.equal(clock.backlog({ sent_ms: 9000000, age_ms: 20 }, 100), 0);
    assert.equal(clock.backlog({ sent_ms: 9000100, age_ms: 20 }, 200), 0);
    assert.equal(clock.backlog({ sent_ms: 9000200, age_ms: 60000, status: 'reconnecting' }, 300), 0);
    assert.ok(clock.backlog({ sent_ms: 9000200, age_ms: 20 }, 2300) > 1500);
    assert.equal(clock.backlog({ age_ms: 20 }, 2400), 0); // older protocol
});

test('long viewing sessions tolerate clock drift while still detecting real delivery backlog', () => {
    const clock = new StreamClock();
    for (let second = 0; second <= 8 * 3600; second++) {
        const sent = second * 1000;
        const received = 9000000 + sent * 1.00008;
        assert.ok(clock.backlog({ sent_ms: sent }, received) < 6, 'clock drift must not turn fresh frames into permanent backlog');
    }
    assert.ok(clock.samples.length <= 61);
    const fresh = new StreamClock();
    fresh.backlog({ sent_ms: 0 }, 0);
    assert.ok(fresh.backlog({ sent_ms: 1000 }, 3000) > 1500, 'real backlog must still be detected immediately');
});

test('sustained bandwidth backlog reduces grid pixels once and restores healthy playback', async () => {
    const urls = [], statuses = new Map(), unsubscribe = [];
    let delayed = false;
    const server = http.createServer((req, res) => {
        const url = new URL(req.url, 'http://localhost'); urls.push(url);
        const width = Number(url.searchParams.get('width'));
        const fps = Number(url.searchParams.get('fps'));
        res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
        let sequence = 0;
        const send = () => {
            sequence++;
            for (let id = 1; id <= 18; id++) res.write(packet(id, sequence, {
                sent_ms: performance.now() - (delayed && sequence > 2 && (width > 160 || fps > 15) ? 2500 : 0),
                jpeg_width: width, jpeg_height: Math.round(width * 9 / 16),
            }));
        };
        send(); const timer = setInterval(send, 33);
        res.on('close', () => clearInterval(timer));
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    globalThis.window = { location: { href: origin }, addEventListener() {} };
    globalThis.document = { hidden: false, addEventListener() {} };
    globalThis.createImageBitmap = async (_blob, settings) => ({
        width: settings?.resizeWidth || 320, height: settings?.resizeHeight || 180, close() {},
    });
    const canvas = fit => ({ dataset: { fit }, clientWidth: 320, clientHeight: 180,
        getContext: () => ({ fillRect() {}, drawImage() {} }) });
    try {
        for (let id = 1; id <= 18; id++) unsubscribe.push(subscribeCctv(`${origin}/api/security/cctv/stream/${id}`,
            canvas('cover'), status => statuses.set(id, status)));
        await waitFor(() => [...statuses.values()].filter(status => status === 'live').length === 18);
        assert.equal(urls[0].searchParams.get('width'), '320');
        delayed = true;
        await waitFor(() => urls.length === 3 && [...statuses.values()].every(status => status === 'live'), 7000);
        assert.equal(urls[1].searchParams.get('width'), '160');
        assert.equal(urls[2].searchParams.get('width'), '160');
        assert.equal(urls[2].searchParams.get('fps'), '15');
        assert.equal(getCctvDiagnostics()[0].bandwidthAdaptations, 2);
        const before = getCctvDiagnostics()[0].cameras[0].decodedFrames;
        await new Promise(resolve => setTimeout(resolve, 400));
        assert.ok(getCctvDiagnostics()[0].cameras[0].decodedFrames - before >= 8, 'adaptation must retain high decode rate');
        assert.equal(urls.length, 3, 'adapted preview must stop the reconnect loop');
        delayed = false;
        unsubscribe.push(subscribeCctv(`${origin}/api/security/cctv/stream/1`, canvas('contain'), () => {}));
        await waitFor(() => urls.length === 4);
        assert.equal(urls[3].searchParams.get('focus'), '1');
        assert.equal(urls[3].searchParams.get('width'), '320', 'grid bandwidth adaptation must not reduce fullscreen detail');
        assert.equal(urls[3].searchParams.get('fps'), '30', 'fullscreen has an independent delivery budget');
    } finally {
        unsubscribe.forEach(fn => fn());
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
    }
});

test('backpressure that skips source sequences adapts without timestamp backlog', async () => {
    const widths = [], unsubscribe = [];
    let status;
    const server = http.createServer((req, res) => {
        const width = Number(new URL(req.url, 'http://localhost').searchParams.get('width'));
        widths.push(width);
        res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
        let sequence = 0;
        const send = () => {
            sequence += width > 160 ? 3 : 1;
            res.write(packet(1, sequence, { sent_ms: performance.now(), jpeg_width: width,
                jpeg_height: Math.round(width * 9 / 16) }));
        };
        send(); const timer = setInterval(send, width > 160 ? 100 : 33);
        res.on('close', () => clearInterval(timer));
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    globalThis.window = { location: { href: origin }, addEventListener() {} };
    globalThis.document = { hidden: false, addEventListener() {} };
    globalThis.createImageBitmap = async () => ({ width: 160, height: 90, close() {} });
    const canvas = { dataset: { fit: 'cover' }, clientWidth: 320, clientHeight: 180,
        getContext: () => ({ fillRect() {}, drawImage() {} }) };
    try {
        unsubscribe.push(subscribeCctv(`${origin}/api/security/cctv/stream/1`, canvas, next => { status = next; }));
        await waitFor(() => widths.length === 2 && status === 'live', 7500);
        assert.deepEqual(widths, [320, 160]);
        assert.equal(getCctvDiagnostics()[0].droppedBacklog, 0);
        assert.equal(getCctvDiagnostics()[0].requestedFps, 30, 'pixel adaptation is preferred over lowering FPS');
    } finally {
        unsubscribe.forEach(fn => fn());server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
    }
});

test('large coalesced chunks of valid frames do not reset all cameras', () => {
    const jpeg = Buffer.alloc(1024 * 1024);
    const header = Buffer.from(JSON.stringify({ camera_id: 1, length: jpeg.length }));
    const prefix = Buffer.alloc(4); prefix.writeUInt32BE(header.length);
    const frame = Buffer.concat([prefix, header, jpeg]);
    assert.equal(new FrameDecoder().push(Buffer.concat(Array(5).fill(frame))).length, 5);
});

test('feedback changes delivery budget, fullscreen and layout without reopening live video', async () => {
    let requests = 0, feedbackRequests = 0, ack = 0, sent = 0, busy = 0, maxBusy = 0;
    let options, sequence = 0, status;
    const budgets = [];
    const observers = new Map();
    globalThis.ResizeObserver = class {
        constructor(callback) { this.callback = callback; }
        observe(canvas) { observers.set(canvas, this.callback); }
        disconnect() {}
    };
    const server = http.createServer((req, res) => {
        if (req.method === 'POST') {
            feedbackRequests++; busy++; maxBusy = Math.max(maxBusy, busy);
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => setTimeout(() => {
                const data = JSON.parse(body);
                assert.ok(data.ack >= ack && data.ack <= sent);
                ack = data.ack;
                options = new URLSearchParams(data.query);
                budgets.push(Number(options.get('width')));
                busy--;
                res.end('{"success":true}');
            }, 50));
            return;
        }
        requests++;
        options = new URL(req.url, 'http://localhost').searchParams;
        res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'X-CCTV-Control': '1' });
        res.flushHeaders();
        const timer = setInterval(() => {
            if (sent - ack >= 8) return;
            const slow = Number(options.get('width')) > 160 && !options.has('focus');
            sequence += slow ? 3 : 1;
            res.write(Buffer.concat([
                packet(1, sequence, { sent_ms: performance.now(), jpeg_width: 640, jpeg_height: 360 }),
                packet(0, 0, { type: 'batch', batch_id: ++sent }, Buffer.alloc(0)),
            ]));
        }, 50);
        res.on('close', () => clearInterval(timer));
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    globalThis.window = { location: { href: origin }, addEventListener() {} };
    globalThis.document = { hidden: false, addEventListener() {} };
    globalThis.createImageBitmap = async () => ({ width: 320, height: 180, close() {} });
    const canvas = fit => ({ dataset: { fit }, clientWidth: 320, clientHeight: 180,
        getContext: () => ({ fillRect() {}, drawImage() {} }) });
    const grid = canvas('cover'), modal = canvas('contain'), unsubscribe = [];
    try {
        unsubscribe.push(subscribeCctv(`${origin}/api/security/cctv/stream/1`, grid, next => { status = next; }));
        await waitFor(() => budgets.includes(160) && status === 'live', 7500);
        assert.equal(requests, 1, 'adaptation must keep the existing video connection');
        assert.equal(getCctvDiagnostics()[0].bandwidthAdaptations, 1);
        unsubscribe.push(subscribeCctv(`${origin}/api/security/cctv/stream/1`, modal, () => {}));
        await waitFor(() => options.get('focus') === '1');
        assert.equal(options.get('width'), '320');
        assert.equal(options.get('fps'), '30');
        unsubscribe.pop()();
        await waitFor(() => !options.has('focus'));
        grid.clientWidth = 640;
        observers.get(grid)();
        await waitFor(() => options.get('width') === '320');
        assert.equal(requests, 1, 'modal and resize must update the same connection');
        assert.ok(feedbackRequests > 3);
        assert.equal(maxBusy, 1, 'feedback requests must be serialized');
        assert.equal(getCctvDiagnostics()[0].flowControlled, true);
        assert.ok(getCctvDiagnostics()[0].acknowledgedBatch > 0);
    } finally {
        unsubscribe.forEach(fn => fn());
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
        delete globalThis.ResizeObserver;
    }
});

test('fragmented large JPEG uses one payload allocation and rejects oversized payloads', () => {
    const jpeg = Buffer.alloc(1024 * 1024, 17);
    const data = packet(47, 3, {}, jpeg);
    const decoder = new FrameDecoder();
    const received = [];
    let payload;
    for (let offset = 0; offset < data.length; offset += 1024) {
        received.push(...decoder.push(data.subarray(offset, offset + 1024)));
        if (decoder.stage === 'jpeg') {
            payload ??= decoder.part;
            assert.equal(decoder.part, payload, 'fragment arrival must not reallocate the partial JPEG');
        }
    }
    assert.equal(received.length, 1);
    assert.deepEqual(Buffer.from(received[0].jpeg), jpeg);
    assert.equal(decoder.bufferedBytes, 0);
    assert.throws(() => new FrameDecoder().push(packet(1, 1, { length: 3 * 1024 * 1024 })), /Invalid CCTV frame length/);
    assert.equal(new FrameDecoder().push(packet(1, 1, {}, Buffer.alloc(0))).length, 1);
});

test('47 cameras bound concurrent decodes, coalesce before paint and isolate bad JPEGs', async () => {
    const statuses = new Map(), canvases = [], releases = [], unsubscribe = [];
    let inFlight = 0, maxInFlight = 0, decodes = 0, paints = 0, send;
    let failCamera = true;
    const server = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
        send = sequence => res.write(Buffer.concat(Array.from({ length: 47 }, (_, i) => packet(i + 1, sequence))));
        send(1);
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    globalThis.window = { location: { href: origin }, addEventListener() {} };
    globalThis.document = { hidden: false, addEventListener() {} };
    const animationFrames = new Map(); let animationId = 0;
    globalThis.requestAnimationFrame = callback => { animationFrames.set(++animationId, callback); return animationId; };
    globalThis.cancelAnimationFrame = id => animationFrames.delete(id);
    globalThis.createImageBitmap = async blob => {
        decodes++; inFlight++; maxInFlight = Math.max(maxInFlight, inFlight);
        const id = new Uint8Array(await blob.arrayBuffer())[2];
        await new Promise(resolve => releases.push(resolve));
        inFlight--;
        if (id === 7 && failCamera) throw new Error('corrupt JPEG');
        return { width: 640, height: 360, close() {} };
    };
    const releaseWave = async () => {
        releases.splice(0).forEach(resolve => resolve());
        await new Promise(resolve => setTimeout(resolve, 20));
    };
    const paint = () => {
        const callbacks = [...animationFrames.values()]; animationFrames.clear();
        callbacks.forEach(callback => callback());
    };
    try {
        for (let id = 1; id <= 47; id++) {
            const canvas = { dataset: { fit: 'cover' }, clientWidth: 320, clientHeight: 180,
                getContext: () => ({ fillRect() {}, drawImage() { paints++; } }) };
            canvases.push(canvas);
            unsubscribe.push(subscribeCctv(`${origin}/api/security/cctv/stream/${id}`, canvas, status => statuses.set(id, status)));
        }
        await waitFor(() => releases.length === 8);
        for (let sequence = 2; sequence <= 20; sequence++) send(sequence);
        await new Promise(resolve => setTimeout(resolve, 60));
        for (let wave = 0; wave < 8; wave++) await releaseWave();
        assert.equal(maxInFlight, 8);
        assert.ok(decodes <= 48, 'unpainted cameras must not repeatedly decode queued frames');
        assert.equal(paints, 0);
        assert.equal(statuses.get(7), 'connecting', 'bad JPEG must not reset all statuses');
        assert.equal([...statuses.values()].filter(status => status === 'live').length, 46);
        assert.equal(getCctvDiagnostics()[0].connections, 1);
        assert.ok(getCctvDiagnostics()[0].cameras.some(camera => camera.decodeErrors > 0));
        failCamera = false;
        send(21);
        paint();
        for (let wave = 0; wave < 8; wave++) await releaseWave();
        paint();
        assert.equal([...statuses.values()].filter(status => status === 'live').length, 47);
        assert.ok(canvases.every(canvas => Number(canvas.dataset.cctvRenderedFrames) > 0));
    } finally {
        unsubscribe.forEach(fn => fn());
        await releaseWave();
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
        delete globalThis.requestAnimationFrame;
        delete globalThis.cancelAnimationFrame;
    }
    assert.equal(getCctvDiagnostics().length, 0);
});

test('bitmap resolution follows grid dimensions and restores fullscreen detail', async () => {
    const options = [], connections = [];
    const server = http.createServer((req, res) => {
        const focus = new URL(req.url, 'http://localhost').searchParams.has('focus');
        connections.push(focus);
        res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
        let sequence = 0;
        const send = () => res.write(packet(1, ++sequence,
            { jpeg_width: focus ? 1280 : 640, jpeg_height: focus ? 720 : 360 }));
        send(); const timer = setInterval(send, 50);
        res.on('close', () => clearInterval(timer));
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    globalThis.window = { location: { href: origin }, addEventListener() {} };
    globalThis.document = { hidden: false, addEventListener() {} };
    globalThis.createImageBitmap = async (_blob, settings) => {
        options.push(settings);
        return { width: settings?.resizeWidth || 1280, height: settings?.resizeHeight || 720, close() {} };
    };
    const grid = { dataset: { fit: 'cover' }, clientWidth: 320, clientHeight: 180,
        getContext: () => ({ fillRect() {}, drawImage() {} }) };
    const modal = { dataset: { fit: 'contain' }, clientWidth: 1920, clientHeight: 1080,
        getContext: grid.getContext };
    const unsubscribe = [];
    try {
        unsubscribe.push(subscribeCctv(`${origin}/api/security/cctv/stream/1`, grid, () => {}));
        await waitFor(() => Number(grid.dataset.cctvRenderedFrames) > 2);
        assert.deepEqual(options.at(-1), { resizeWidth: 320, resizeHeight: 180, resizeQuality: 'medium' });
        const gridFrames = grid.dataset.cctvRenderedFrames;
        unsubscribe.push(subscribeCctv(`${origin}/api/security/cctv/stream/1`, modal, () => {}));
        await waitFor(() => connections.length === 2 && connections[1]);
        const modalFrames = Number(modal.dataset.cctvRenderedFrames || 0);
        await waitFor(() => Number(modal.dataset.cctvRenderedFrames) > modalFrames + 2);
        assert.equal(options.at(-1), undefined, 'fullscreen must retain the 1280px source detail');
        assert.equal(getCctvDiagnostics()[0].cameras[0].bitmapResolution[0], 1280);
        assert.ok(Number(grid.dataset.cctvRenderedFrames) <= Number(gridFrames) + 2);
        assert.deepEqual(connections, [false, true]);
    } finally {
        unsubscribe.forEach(fn => fn());
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
    }
});

test('16 cameras and modal share one connection, reconnect on disconnect, and release it on unmount', async () => {
    let requests = 0, closed = 0, active = 0, maximum = 0;
    const urls = [];
    const connections = new Set();
    let delayed = false, brokenCamera = false;
    const server = http.createServer((req, res) => {
        requests++; active++; maximum = Math.max(maximum, active); urls.push(req.url);
        connections.add(res);
        res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
        let sequence = 0;
        const send = () => {
            sequence++;
            for (let id = 1; id <= 16; id++) res.write(packet(id, sequence, {
                sent_ms: performance.now() - (delayed ? 2000 : 0),
                status: brokenCamera && id === 3 ? 'offline' : 'live',
            }));
        };
        send(); const timer = setInterval(send, 50);
        res.on('close', () => { clearInterval(timer); active--; closed++; connections.delete(res); });
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    globalThis.window = { location: { href: origin }, addEventListener() {} };
    globalThis.document = { hidden: false, addEventListener() {} };
    let bitmaps = 0;
    globalThis.createImageBitmap = async () => {
        bitmaps++;
        return { width: 640, height: 360, close() { bitmaps--; } };
    };
    const statuses = new Map(); const unsubscribe = [];
    const canvas = fit => ({ dataset: { fit }, clientWidth: 320, clientHeight: 180,
        getContext: () => ({ fillRect() {}, drawImage() {} }) });
    try {
        for (let id = 1; id <= 16; id++) {
            unsubscribe.push(subscribeCctv(`${origin}/api/security/cctv/stream/${id}`, canvas('cover'),
                status => statuses.set(id, status)));
        }
        unsubscribe.push(subscribeCctv(`${origin}/api/security/cctv/stream/16`, canvas('contain'), () => {}));
        await waitFor(() => statuses.size === 16 && [...statuses.values()].every(s => s === 'live'));
        assert.equal(requests, 1); assert.equal(maximum, 1);
        assert.equal(new URL(urls[0], origin).searchParams.get('ids').split(',').length, 16);
        assert.equal(new URL(urls[0], origin).searchParams.get('focus'), '16');
        assert.equal(new URL(urls[0], origin).searchParams.get('view'), '16', 'fullscreen should not decode the covered grid');
        delayed = true;
        await new Promise(resolve => setTimeout(resolve, 250));
        delayed = false;
        await new Promise(resolve => setTimeout(resolve, 100));
        assert.equal(requests, 1, 'transient backlog must not reconnect the shared grid');
        brokenCamera = true;
        await waitFor(() => statuses.get(3) === 'offline');
        assert.equal([...statuses.values()].filter(s => s === 'live').length, 15);
        assert.equal(requests, 1, 'one offline source must not reconnect healthy cameras');
        brokenCamera = false;
        await waitFor(() => statuses.get(3) === 'live');
        unsubscribe.pop()(); // Closing fullscreen restores the visible grid.
        await waitFor(() => requests === 2 && bitmaps === 16);
        assert.equal(new URL(urls[1], origin).searchParams.get('focus'), null);
        assert.equal(new URL(urls[1], origin).searchParams.get('view').split(',').length, 16);
        const beforeDisconnect = requests;
        for (const res of connections) res.destroy();
        await waitFor(() => requests === beforeDisconnect + 1 && [...statuses.values()].every(s => s === 'live'));
        assert.equal(maximum, 1);
    } finally {
        unsubscribe.forEach(fn => fn());
        await waitFor(() => active === 0 && bitmaps === 0);
        await new Promise(resolve => server.close(resolve));
    }
    assert.equal(closed, requests);
});
