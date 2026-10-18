// osuAudio.js — the "osuAudio" JS module imported by osu.Framework's Audio/Web backend
// (source of truth for signatures: osu-framework/osu.Framework/Audio/Web/WebAudio.cs).
//
// Provides the Web Audio implementation behind osu!framework's audio abstractions:
//  * one lazily-created AudioContext (browsers allow creation without a gesture, but it starts
//    `suspended` under the autoplay policy — main.js calls userGesture() on the first real input
//    to resume it; currentTime is frozen while suspended, so tracks simply don't advance until then)
//  * a small node-graph surface (gain / stereo-panner / buffer-source) marshalled as JSObject
//    handles both ways — the .NET runtime proxies JS values, no registry needed on this side
//  * decodeAudioData as the mp3/wav/ogg decoder, called with a pointer+length into the wasm heap
//    (bytes are copied out synchronously first: the heap can grow while the promise is pending,
//    which detaches any views over it)
//  * asynchronous completion routed back through [JSExport]s bound by main.js via bindExports():
//      - AudioDecoded(id, ok, buffer, error)   — decodeAudioData resolved/rejected
//      - AudioSourceEnded(id)                  — an AudioBufferSourceNode finished naturally
//    Intentional stops null out onended first, so they never report as completion.
//
// Everything is one-shot per play: AudioBufferSourceNode can only start once, so every (re)start
// creates a fresh source (see TrackWeb / SampleChannelWeb on the C# side).

let heaps = null;
let ctx = null;
let exports_ = null;

const stats = { decoded: 0, decodeFailed: 0, sourcesStarted: 0, sourcesEnded: 0 };

export function init(heapAccessors) {
    heaps = heapAccessors;
}

export function bindExports(exp) {
    exports_ = exp;
}

function ensureContext() {
    if (ctx) return ctx;
    try {
        const Ctor = window.AudioContext || window.webkitAudioContext;
        if (!Ctor) return null;
        ctx = new Ctor();
    } catch (e) {
        console.warn('[osuAudio] AudioContext creation failed:', e);
        ctx = null;
    }
    return ctx;
}

// ---- context -------------------------------------------------------------

/** Resume the context from the autoplay-policy `suspended` state. Must run inside a real user
 *  gesture (untrusted/synthetic events do not count), which main.js wires on first input. */
export function userGesture() {
    const c = ensureContext();
    if (c && c.state !== 'running') {
        c.resume().catch((e) => console.warn('[osuAudio] resume() rejected:', e));
    }
}

export function contextState() {
    return ctx ? ctx.state : 'none';
}

export function currentTime() {
    return ctx ? ctx.currentTime : 0;
}

export function sampleRate() {
    return ctx ? ctx.sampleRate : 0;
}

/** JSON debug snapshot consumed by window.__osuAudio in main.js. */
export function audioStats() {
    return JSON.stringify({
        ...stats,
        state: contextState(),
        time: ctx ? ctx.currentTime : 0,
    });
}

// ---- node graph ------------------------------------------------------------

/** Mixer inputs route straight to the destination — mirroring BASS, where every mixer stream
 *  outputs to the device independently (nesting only ever happened under experimental WASAPI,
 *  which has no browser equivalent). The `fallbackMixer` concept only redirects removed channels. */
export function createMixerInput() {
    const c = ensureContext();
    if (!c) return null;
    const g = c.createGain();
    g.connect(c.destination);
    return g;
}

export function createGain() {
    const c = ensureContext();
    return c ? c.createGain() : null;
}

export function createStereoPanner() {
    const c = ensureContext();
    return c ? c.createStereoPanner() : null;
}

export function createBufferSource() {
    const c = ensureContext();
    return c ? c.createBufferSource() : null;
}

export function setGain(node, value) {
    if (node) node.gain.value = value > 0 ? value : 0;
}

export function setPan(node, value) {
    if (!node) return;
    try {
        node.pan.value = Math.max(-1, Math.min(1, value));
    } catch {
        // node detached
    }
}

export function setRate(source, value) {
    if (source) source.playbackRate.value = value;
}

export function connect(from, to) {
    if (!from || !to) return;
    try {
        from.connect(to);
    } catch (e) {
        console.warn('[osuAudio] connect failed:', e);
    }
}

export function disconnect(from, to) {
    if (!from || !to) return;
    try {
        from.disconnect(to);
    } catch {
        // not connected (or already disconnected) — expected on teardown races
    }
}

export function disconnectAll(node) {
    if (!node) return;
    try {
        node.disconnect();
    } catch {
        // nothing connected
    }
}

// ---- playback ----------------------------------------------------------------

/** Starts `source` playing `buffer` at `offset` seconds. Returns the AudioContext time the start
 *  was scheduled at — the C# side anchors its position math on that exact value (while the
 *  context is suspended, currentTime doesn't move, so this stays perfectly aligned until resume). */
export function startSource(source, buffer, endId, offset, loop) {
    const c = ctx;
    if (!c || !source || !buffer) return 0;

    source.buffer = buffer;
    source.loop = !!loop;
    source.onended = () => {
        stats.sourcesEnded++;
        try {
            if (exports_) exports_.AudioSourceEnded(endId);
        } catch (e) {
            console.warn('[osuAudio] AudioSourceEnded callback failed:', e);
        }
    };

    let off = offset > 0 ? offset : 0;
    if (off >= buffer.duration) off = Math.max(0, buffer.duration - 0.001);

    const when = c.currentTime;
    source.start(when, off);
    stats.sourcesStarted++;
    return when;
}

/** Toggles seamless looping on a started source (live — mirrors BASS_ChannelFlags(Loop)). */
export function setLoopFlag(source, loop) {
    if (source) source.loop = !!loop;
}

/** Stops a source *without* reporting completion (intentional stop / seek restart / eviction).
 *  Also disconnects it from the graph and detaches the ended callback. */
export function stopSource(source) {
    if (!source) return;
    source.onended = null;
    try {
        source.stop();
    } catch {
        // never started or already stopped
    }
    try {
        source.disconnect();
    } catch {
        // not connected
    }
}

export function bufferDuration(buffer) {
    return buffer ? buffer.duration : 0;
}

// ---- decoding ------------------------------------------------------------------

export function decodeAudioBytes(ptr, len, id) {
    const c = ensureContext();
    if (!c) {
        notifyDecoded(id, false, null, 'AudioContext unavailable');
        return;
    }

    let ab;
    try {
        // Copy out of the wasm heap synchronously — it may grow while the promise is pending,
        // detaching any views over it.
        ab = heaps.u8().slice(ptr, ptr + len).buffer;
    } catch (e) {
        notifyDecoded(id, false, null, String(e));
        return;
    }

    let done = false;
    const once = (ok, value, error) => {
        if (done) return;
        done = true;
        if (ok) stats.decoded++;
        else stats.decodeFailed++;
        notifyDecoded(id, ok, value, error);
    };

    try {
        // Callback and promise forms are both specified; guard so exactly one notification wins.
        const promise = c.decodeAudioData(ab, (b) => once(true, b, null), (e) => once(false, null, String(e)));
        if (promise && typeof promise.then === 'function') {
            promise.then((b) => once(true, b, null), (e) => once(false, null, String(e)));
        }
    } catch (e) {
        once(false, null, String(e));
    }
}

function notifyDecoded(id, ok, buffer, error) {
    try {
        if (exports_) exports_.AudioDecoded(id, ok, buffer, error);
    } catch (e) {
        console.warn('[osuAudio] AudioDecoded callback failed:', e);
    }
}
