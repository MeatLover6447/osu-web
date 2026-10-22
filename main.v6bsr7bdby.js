// main.js — browser bring-up for osu!web.
//
// Order matters:
//   1. dotnet.create()            — boots the mono runtime, exposes heap views + interop APIs
//   2. osuGL.init()               — WebGL2 context (GLRenderer.Initialise queries GL during runMain)
//   3. setModuleImports           — registers the osuGL (osuTK GL bindings), osuHost (window
//                                   queries) and osuAudio (Web Audio backend) modules that .NET
//                                   [JSImport]s resolve against
//   4. getAssemblyExports         — binds [JSExport] types (BrowserPump: Frame/input/LoadShaders;
//                                   WebAudio: decode + source-ended callbacks)
//   5. shaders.json -> LoadShaders— build-time precompiled shader dictionary (web/tools/ShaderGen)
//   6. DOM event wiring           — all input/window events forwarded to BrowserPump exports
//   7. runMain()                  — C# Program.Main: creates BrowserGameHost + SpikeGame (non-blocking)
//   8. Frame pump                — BrowserPump.Frame() per display refresh; timers while hidden

import { dotnet } from './_framework/dotnet.js';
import * as osuGL from './osuGL.js';
import * as osuAudio from './osuAudio.js';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const frameWorkEl = document.getElementById('frame-work');

// Render scale — the fraction of the canvas' CSS-pixel box that the WebGL backing store is
// actually allocated at. The browser stretches the canvas back over the same CSS box, so the game
// stays the same size on screen and only gets sharper or softer. It costs sharpness and nothing
// else.
//
// Why this is safe to change: osu!framework lays the game out in *backing-store* pixels, not CSS
// pixels — that is the mechanism HiDPI support runs on, where a dpr of 2 doubles the backing
// store and the UI keeps its physical size. Scaling the backing store therefore scales the whole
// image uniformly, and input stays aligned for free: BrowserPump converts pointer and touch
// coordinates by multiplying by Window.Scale, which is backing store / css, so a change here moves
// the input space by exactly as much as it moves the drawn space. Nothing is recomputed and no
// Resized event fires, because BrowserWindow.UpdateSize only raises that when the CSS size moves.
//
// This exists because fill rate is the one expensive thing on a GPU-less target that no CPU-side
// measurement can see. Every pixel is blended by the integrated GPU, so halving each dimension
// quarters that work.
let renderScale = 1;

// Assigned by wireSizing so the setting can re-run the same sizing path the ResizeObserver does,
// rather than duplicating it or waiting for the next layout change.
let applyCanvasSizing = null;

// Boot milestones, in the order main.js reports them, mapped onto how far along the loading bar
// should read. Matching on the message text keeps every existing call site unchanged; an
// unmatched message (an error, say) simply leaves the bar where it was.
//
// The first phase — fetching the runtime and its assemblies — owns everything below
// BOOT_DOWNLOAD_END and is driven by real bytes rather than by a milestone (see pumpBootDownload),
// because on a slow link it dwarfs every other phase put together.
const BOOT_DOWNLOAD_END = 90;

const BOOT_MILESTONES = [
    ['binding exports', 93, 'linking JavaScript bindings'],
    ['shaders.json', 96, 'loading precompiled shaders'],
    ['starting game', 98, 'starting the game host'],
    ['running', 100, ''],
];

const bootEl = document.getElementById('boot');
const bootFillEl = document.getElementById('boot-fill');
const bootDetailEl = document.getElementById('boot-detail');

let bootDownloadPhase = true;

function setBootBar(pct) {
    if (bootFillEl) bootFillEl.style.width = `${Math.max(0, Math.min(100, pct)).toFixed(1)}%`;
}

function setBootDetail(text) {
    if (bootDetailEl) bootDetailEl.textContent = text ?? '';
}

function setStatus(message, isError = false) {
    statusEl.textContent = message;
    statusEl.style.color = isError ? '#ff7a7a' : '#8ab4ff';
    if (isError) console.error('[osu!web]', message);

    for (const [needle, pct, detail] of BOOT_MILESTONES) {
        if (message.includes(needle)) {
            bootDownloadPhase = false;
            setBootBar(pct);
            setBootDetail(detail);
            break;
        }
    }

    // 'running' is the last milestone: the game is interactive from here, so the boot screen goes.
    if (message === 'running') {
        setBootBar(100);
        bootEl.hidden = true;
    }
}

const formatMb = (bytes) => `${(bytes / 1048576).toFixed(1)} MB`;

// Drives the loading bar while `dotnet.create()` pulls the runtime and every assembly it needs.
//
// Every one of those requests passes through the fetch shim in index.html, which reports bytes,
// file counts and failures on window.__boot — the only place that can see real progress, since
// main.js is parked inside a single await for the whole phase. Without it, the longest phase of
// the entire boot is one fixed label and minutes of apparent nothing.
function pumpBootDownload(startedAt) {
    const tick = () => {
        if (!bootDownloadPhase) return;

        const b = window.__boot;
        if (!b) { setTimeout(tick, 250); return; }

        const elapsed = (performance.now() - startedAt) / 1000;

        // "of X MB" only when the denominator is known: a dev build built by a plain
        // `dotnet publish` has no shipped total to compare against, so it reports what has
        // arrived and nothing more.
        const size = b.total > 0
            ? `${formatMb(b.bytes)} of ${formatMb(b.total)}`
            : `${formatMb(b.bytes)} downloaded`;

        const parts = [size, `${b.files} files`, `${elapsed.toFixed(0)}s`];
        if (b.inflight > 0) parts.push(`${b.inflight} in flight`);
        if (b.failed > 0) parts.push(`${b.failed} retried`);

        setBootDetail(parts.join('  ·  '));

        // A known denominator gives an honest percentage. A plain `dotnet publish` leaves the
        // placeholder at 0, meaning "unknown" — in that case leave the bar alone rather than
        // print a percentage that cannot be backed up; the shimmer and the byte counter still
        // show that bytes are arriving.
        if (b.total > 0) setBootBar((Math.min(b.bytes, b.total) / b.total) * BOOT_DOWNLOAD_END);

        setTimeout(tick, 250);
    };

    tick();
}

/** Locates an exported type object by one of its method names, regardless of namespace layout. */
function findByMethod(root, methodName, depth = 0) {
    if (root === null || typeof root !== 'object' || depth > 8) return null;
    if (typeof root[methodName] === 'function') return root;
    let keys;
    try {
        keys = Object.keys(root);
    } catch {
        return null;
    }
    for (const key of keys) {
        try {
            const found = findByMethod(root[key], methodName, depth + 1);
            if (found) return found;
        } catch {
            // accessor failures are irrelevant when searching
        }
    }
    return null;
}

function wireInput(pump) {
    // Only a control the user is actually typing text into should swallow game keys. The shell is
    // full of inputs that are focused merely by being clicked — mod sliders, mod checkboxes, the
    // graphics selects, the .osz/.osk file pickers — and none of those consume Escape, backtick or
    // the play keys. Treating them as "typing" is what made the pause and quick-retry hotkeys
    // silently stop working the moment a file had been imported or a mod setting touched.
    const isTyping = () => {
        const el = document.activeElement;
        if (!el) return false;
        if (el.isContentEditable) return true;
        if (el.tagName === 'TEXTAREA') return true;
        if (el.tagName !== 'INPUT') return false;
        return ['text', 'search', 'email', 'url', 'tel', 'password', 'number'].includes(el.type);
    };

    // --- pointer (mouse / pen; touch goes through touch events below) ---
    canvas.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'touch') return;
        pump.PointerMove(e.offsetX, e.offsetY);
    });

    canvas.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'touch') return;
        pump.PointerButton(e.button, true);
        canvas.focus();
        e.preventDefault();
    });

    window.addEventListener('pointerup', (e) => {
        if (e.pointerType === 'touch') return;
        pump.PointerButton(e.button, false);
    });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // --- wheel ---
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        pump.Wheel(e.deltaY, e.deltaMode);
    }, { passive: false });

    // --- keyboard (window-level so input works without canvas focus) ---
    //
    // The framework only emits a key transition when state *changes*, so a keyup that never
    // arrives leaves that key logically held down forever and every later press for it is a
    // silent no-op — which is why Escape and Backtick stop working intermittently. Two things
    // lose keyups here:
    //
    //   - the browser does not deliver them while the tab is hidden or the window is blurred
    //     (alt-tab mid-key). SDL handles exactly this by synthesising releases on focus loss;
    //     the browser host had nothing equivalent.
    //   - isTyping() gates keydown and keyup alike, so if focus lands on a text field between a
    //     press and its release, the release is dropped even though the press already went out.
    //
    // So track what we pressed ourselves, always forward the release for anything we pressed
    // (even once isTyping() has become true), and synthesise releases for everything still down
    // the moment focus goes away.
    const heldKeys = new Set();

    const releaseKey = (code) => {
        if (!heldKeys.delete(code)) return;
        pump.KeyboardKey(code, false);
    };

    const releaseAllKeys = () => {
        for (const code of [...heldKeys]) releaseKey(code);
    };

    window.addEventListener('keydown', (e) => {
        if (isTyping()) return;
        if (e.code === 'Space' || e.code === 'Tab' || e.code.startsWith('Arrow')) e.preventDefault();
        // Key auto-repeat re-fires keydown with the key already down; the framework would treat
        // it as a no-op anyway, and hold-to-activate bindings read the held state, not repeats.
        if (heldKeys.has(e.code)) return;
        heldKeys.add(e.code);
        pump.KeyboardKey(e.code, true);
    });

    window.addEventListener('keyup', (e) => {
        // Deliberately not gated on isTyping(): a release for a key we pressed must always get
        // through, or that key is stuck down.
        releaseKey(e.code);
    });

    window.addEventListener('blur', releaseAllKeys);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) releaseAllKeys();
    });

    // --- touch ---
    const forwardTouches = (e, phase) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        for (const t of e.changedTouches)
            pump.Touch(phase, t.identifier, t.clientX - rect.left, t.clientY - rect.top);
    };

    canvas.addEventListener('touchstart', (e) => forwardTouches(e, 0), { passive: false });
    canvas.addEventListener('touchmove', (e) => forwardTouches(e, 1), { passive: false });
    canvas.addEventListener('touchend', (e) => forwardTouches(e, 2), { passive: false });
    canvas.addEventListener('touchcancel', (e) => forwardTouches(e, 2), { passive: false });
}

function wireSizing(pump) {
    const resize = () => {
        // devicePixelRatio comes first so a HiDPI display gets more pixels than its CSS box, then
        // renderScale caps the result. Both feed the backing store only — the CSS box is left
        // alone and is what the browser stretches this canvas back over.
        const dpr = window.devicePixelRatio || 1;
        const cssW = canvas.clientWidth;
        const cssH = canvas.clientHeight;
        const w = Math.max(1, Math.round(cssW * dpr * renderScale));
        const h = Math.max(1, Math.round(cssH * dpr * renderScale));
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
        }
        pump.Resize(cssW, cssH, w, h);
    };

    applyCanvasSizing = resize;

    new ResizeObserver(resize).observe(canvas);
    window.addEventListener('resize', resize);
    resize();
}

function wireWindow(pump) {
    window.addEventListener('focus', () => pump.Focus(true));
    window.addEventListener('blur', () => pump.Focus(false));
    document.addEventListener('visibilitychange', () => pump.Visibility(!document.hidden));
}

async function boot() {
    setStatus('starting .NET runtime…');

    // Start reporting download bytes before parking on the await below: everything after this
    // point for the next however-many-seconds happens inside dotnet.create().
    pumpBootDownload(performance.now());

    const host = await dotnet.create();
    const { setModuleImports, getAssemblyExports, getConfig, runMain } = host;

    // 1. WebGL2 context — must exist before .NET touches GL (GLRenderer.Initialise).
    if (!osuGL.init(canvas, {
        u8: host.localHeapViewU8,
        u16: host.localHeapViewU16,
        u32: host.localHeapViewU32,
        f32: host.localHeapViewF32,
        f64: host.localHeapViewF64,
    })) {
        setStatus('WebGL2 is not available in this browser.', true);
        return;
    }

    // 2. osuTK GL entry points (source of truth: web/osuTK.WebGL/WebGL/WebGLImports.cs).
    const glImports = {};
    for (const [name, fn] of Object.entries(osuGL)) {
        if (typeof fn === 'function' && name !== 'init' && name !== 'hasContext')
            glImports[name] = fn;
    }
    setModuleImports('osuGL', glImports);

    // 2b. Web Audio backend (source of truth: osu-framework/osu.Framework/Audio/Web/WebAudio.cs).
    //     Heap accessors let decodeAudioBytes copy encoded bytes out of the wasm heap synchronously
    //     before decodeAudioData resolves (the heap may grow in the meantime).
    osuAudio.init({ u8: host.localHeapViewU8 });
    const audioImports = {};
    for (const [name, fn] of Object.entries(osuAudio)) {
        if (typeof fn === 'function' && name !== 'init' && name !== 'bindExports')
            audioImports[name] = fn;
    }
    setModuleImports('osuAudio', audioImports);

    // 3. osu!framework window/canvas queries (source of truth: Platform/Browser/BrowserImports.cs).
    setModuleImports('osuHost', {
        getCanvasCssWidth: () => canvas.clientWidth,
        getCanvasCssHeight: () => canvas.clientHeight,
        getCanvasWidth: () => canvas.width,
        getCanvasHeight: () => canvas.height,
        getScreenWidth: () => (window.screen?.width ?? 1920),
        getScreenHeight: () => (window.screen?.height ?? 1080),
        hasGLContext: () => osuGL.hasContext(),
        setTitle: (title) => { document.title = title; },
        openUrl: (url) => { window.open(url, '_blank', 'noopener,noreferrer'); },
    });

    // 4. Bind [JSExport] types. BrowserPump lives in osu.Framework, so its exports may surface
    //    under either assembly name depending on runtime binding — search both.
    setStatus('binding exports…');
    const config = getConfig();
    let pump = null;
    let audioExports = null;
    for (const asm of [config.mainAssemblyName, 'osu.Framework']) {
        if (!asm) continue;
        try {
            const exports = await getAssemblyExports(asm);
            if (!pump) pump = findByMethod(exports, 'Frame');
            if (!audioExports) audioExports = findByMethod(exports, 'AudioDecoded');
            if (pump && audioExports) break;
        } catch (e) {
            console.warn(`[osu!web] getAssemblyExports(${asm}) failed:`, e);
        }
    }

    if (!pump) {
        setStatus('BrowserPump exports not found — rebuild with web/build.ps1', true);
        return;
    }

    if (typeof pump.LoadShaders !== 'function') {
        setStatus('BrowserPump.LoadShaders missing — framework build is stale, run web/build.ps1', true);
        return;
    }

    if (!audioExports || typeof audioExports.AudioSourceEnded !== 'function') {
        setStatus('WebAudio exports not found — framework build is stale, run web/build.ps1', true);
        return;
    }

    // Web Audio [JSExport] callbacks: decodeAudioData resolution + natural source completion.
    osuAudio.bindExports({
        AudioDecoded: audioExports.AudioDecoded,
        AudioSourceEnded: audioExports.AudioSourceEnded,
    });

    // The C# → JS half of the shell bridge: BrowserShell.NotifyReady / .NotifyScore call into this
    // module (see web/osu.Browser/BrowserShell.cs). It must be registered before runMain, because
    // LoadComplete fires NotifyReady as soon as the game finishes loading.
    let shellReady = false;
    setModuleImports('osuShell', {
        onReady() { shellReady = true; document.dispatchEvent(new CustomEvent('osu:ready')); },
        onScore(summaryJson) {
            document.dispatchEvent(new CustomEvent('osu:score', { detail: summaryJson }));
        },
        onStage(stage) {
            document.dispatchEvent(new CustomEvent('osu:stage', { detail: stage }));
        },
    });

    // The JS → C# half. BrowserShell lives in the app assembly, so it surfaces under the main
    // assembly name; expose it on window so the shell's own script can drive import/play.
    const shellExports = findByMethod(await getAssemblyExports(config.mainAssemblyName), 'ImportOsz');
    if (!shellExports) {
        setStatus('BrowserShell exports not found — rebuild with web/build.ps1', true);
        return;
    }
    window.osu = {
        importOsz: (bytes) => shellExports.ImportOsz(bytes),
        // Two-phase on purpose: play(index, mods, false) builds the player, play(index, mods, true)
        // shows the one it built. The shell paints between them, because each call blocks the main
        // thread and back to back they would freeze the page for the whole of a cold load.
        play: (index, modAcronyms, push) => shellExports.Play(index, modAcronyms || '', !!push),
        getDifficulties: () => shellExports.GetDifficulties(),
        // Star rating and modded stats for one difficulty under a mod selection — runs the
        // difficulty calculator, so it is asked for per row rather than as part of the import.
        getStats: (index, modAcronyms) => shellExports.GetStats(index, modAcronyms || ''),
        getMods: () => shellExports.GetMods(),
        // Which mods lazer would grey out for a selection, and what a toggle reduces a selection to.
        // Both go back to C# because incompatibility is matched on .NET types (DT and HT conflict by
        // sharing a base class), which the shell has no faithful way to test on its own.
        getModCompatibility: (modAcronyms) => shellExports.GetModCompatibility(modAcronyms || ''),
        applyModSelection: (modAcronyms, toggleAcronym) => shellExports.ApplyModSelection(modAcronyms || '', toggleAcronym || ''),
        // One mod setting (e.g. DT's speed, flashlight's size). The C# side takes strings because
        // a JSExport can't marshal a union; numbers and booleans are stringified here so callers
        // can pass whatever they have.
        setModSetting: (acronym, key, value) => shellExports.SetModSetting(acronym, key, String(value)),
        // Backdrop artwork for the shell's menus, as a data URL (null when the .osz has none).
        getBackground: (index) => shellExports.GetBackground(index),
        // Diagnostic: which screen is up and, during a play, whether it's paused and where its
        // gameplay clock is — a paused map and a running one look identical from outside.
        getGameState: () => shellExports.GetGameState(),
        getPerformance: () => JSON.stringify(window.__osuweb?.performance() ?? null),
        setAudioEnabled: (enabled) => shellExports.SetAudioEnabled(enabled),
        importSkin: (bytes) => shellExports.ImportSkin(bytes),
        getSkin: () => shellExports.GetSkin(),
        getSettings: () => shellExports.GetSettings(),
        // SetSetting's C# side takes a double (JSExport can't marshal a union), so normalise the
        // value here — otherwise passing a boolean throws a runtime marshalling assert rather
        // than doing anything useful. shell.js already sends 0/1; this is for direct callers.
        setSetting: (key, value) => shellExports.SetSetting(key,
            typeof value === 'boolean' ? (value ? 1 : 0) : Number(value)),
        get ready() { return shellReady; },
    };

    // 5. Shader precompilation dictionary (web/tools/ShaderGen output).
    setStatus('loading shaders.json…');
    const response = await fetch('./shaders.json');
    if (!response.ok) {
        setStatus(`shaders.json unavailable (${response.status}) — run web/build.ps1`, true);
        return;
    }
    pump.LoadShaders(await response.text());

    // 6. DOM wiring (calls before runMain are safe no-ops: BrowserWindow doesn't exist yet).
    wireInput(pump);
    wireSizing(pump);
    wireWindow(pump);

    // Autoplay policy: the AudioContext is created suspended and only resumes from within a real
    // user gesture. Hook the first genuine inputs (synthetic/CDP-dispatched events don't count);
    // C# can also trigger this via WebAudio.UserGesture when a gesture is known to be active.
    const resumeAudio = () => osuAudio.userGesture();
    window.addEventListener('pointerdown', resumeAudio, { capture: true });
    window.addEventListener('keydown', resumeAudio, { capture: true });
    window.addEventListener('touchstart', resumeAudio, { capture: true, passive: true });

    // 7. C# entry point: BrowserGameHost + game; returns once the host is set up.
    setStatus('starting game…');
    await runMain();

    // 8. Frame pump — one input/update/draw pass per display refresh. Hidden tabs stop firing
    //    requestAnimationFrame altogether, so while the document is hidden the pump falls back to
    //    timers (the game keeps progressing; visibility is forwarded to C# separately so osu.Game
    //    can apply its own focus/pause rules later).
    let lastError = null;
    let wakeHandle = 0;
    let pumping = false;

    // The display's refresh rate, measured below from rAF timing. Nothing in the browser reports
    // it directly, and the 2x/4x/8x frame limiter options are relative to it.
    let displayRefreshRate = 60;

    (function measureRefreshRate() {
        const samples = [];
        let previous = 0;

        // A handful of startup samples is not enough. rAF fires as fast as the compositor is
        // willing to run it, which during load (or while the tab is not the focused one) is
        // often well above the panel's real rate: this measured 238 Hz on a 60 Hz display, and
        // silently armed the 2x/4x/8x limiters at multiples of a rate the panel never had.
        //
        // So ignore samples taken while the document is not visible, take enough of them to
        // survive a couple of outliers, and snap the median to a rate a monitor actually runs at.
        const KNOWN_RATES = [30, 48, 50, 60, 72, 75, 90, 100, 120, 144, 165, 180, 240, 360];
        const SAMPLES_NEEDED = 32;

        const sample = (now) => {
            if (document.hidden) {
                // Not visible: restart the pairing rather than record one enormous gap.
                previous = 0;
                requestAnimationFrame(sample);
                return;
            }

            if (previous > 0) samples.push(now - previous);
            previous = now;

            if (samples.length < SAMPLES_NEEDED) {
                requestAnimationFrame(sample);
                return;
            }

            samples.sort((a, b) => a - b);
            const median = samples[Math.floor(samples.length / 2)];

            if (median > 0.5) {
                const measured = 1000 / median;
                const snapped = KNOWN_RATES.reduce((best, rate) =>
                    Math.abs(rate - measured) < Math.abs(best - measured) ? rate : best, KNOWN_RATES[0]);

                // Only accept a snap when it is genuinely close — a 61 Hz measurement should become
                // 60, but an odd 200 Hz should stay 200 rather than being forced onto 180 or 240.
                displayRefreshRate = Math.abs(snapped - measured) <= snapped * 0.25
                    ? snapped
                    : Math.min(360, Math.max(30, Math.round(measured)));
            }

            // Tell the shell, so the 2x/4x/8x limiter options can be labelled with the rate they
            // actually resolve to (they are multiples of this, not of a hard-coded 60).
            document.dispatchEvent(new CustomEvent('osu:refresh', { detail: displayRefreshRate }));
        };

        requestAnimationFrame(sample);
    })();

    // Frame limiter, driven by the shell's graphics settings.
    //
    //   vsync      — wake on rAF and run every one: the display's own rate, tear-free.
    //   2x/4x/8x   — multiples of the measured refresh rate, above which rAF can never reach, so
    //                they run on the fast pump instead (see below).
    //   1000       — a fixed 1000 fps target, likewise on the fast pump.
    //   unlimited  — the fast pump with no pacing at all: one pass immediately after the last.
    //
    // The fast pump is a MessageChannel round-trip instead of rAF. rAF is vsync-locked — it
    // cannot fire more than once per refresh, no matter how fast the callback returns — whereas a
    // posted message runs as soon as the current task ends, which is what lets the game run well
    // past the display's rate (as "unlimited" does in the real client with vsync off).
    let limiter = { fast: false, targetFps: 0 };

    let lastPumped = 0;
    let fastChannel = null;
    let showFrameWork = false;
    let frameWorkSamples = [];
    let lastWorkReport = 0;
    let frameWorkReport = null;

    function recordFrameWork(milliseconds, now) {
        if (document.hidden || !document.hasFocus()) {
            frameWorkSamples.length = 0;
            lastWorkReport = now;
            return;
        }

        frameWorkSamples.push(milliseconds);
        if (now - lastWorkReport < 1000) return;

        const samples = frameWorkSamples.sort((a, b) => a - b);
        const cpuMs = samples.reduce((sum, value) => sum + value, 0) / samples.length;
        const p95CpuMs = samples[Math.ceil(samples.length * 0.95) - 1];
        let state = {};
        try { state = JSON.parse(window.osu.getGameState()); } catch { /* timing still works */ }

        frameWorkReport = { cpuMs, p95CpuMs, ...state.frameWork, hudMode: state.hudMode, samples: samples.length };
        frameWorkEl.textContent = `CPU ${cpuMs.toFixed(1)} ms | 95% ${p95CpuMs.toFixed(1)} ms`
            + `\nupdate ${(state.frameWork?.updateMs ?? 0).toFixed(1)} | draw ${(state.frameWork?.drawMs ?? 0).toFixed(1)} ms`;
        frameWorkSamples = [];
        lastWorkReport = now;
    }

    // Drops whatever elapsed while the tab was hidden so the first resumed frame cannot carry the
    // whole hidden period as one enormous delta. The thread clocks are stopwatch-backed and keep
    // running regardless, and the framework's clocks have no way to be reset from outside — so this
    // asks the host to re-base them to their source. Harmless if the host is an older build.
    const discardHiddenTime = () => {
        try {
            pump.ResetTime?.();
        } catch {
            // Older framework build without the export: the resume is still correct, just without
            // the delta clamp.
        }
    };

    function resolveLimiter(mode) {
        const text = String(mode ?? 'vsync').trim().toLowerCase();

        switch (text) {
            case 'vsync':
            case '':
                return { fast: false, targetFps: 0 };
            case 'unlimited':
                return { fast: true, targetFps: 0 };
            case '2x':
                return { fast: true, targetFps: displayRefreshRate * 2 };
            case '4x':
                return { fast: true, targetFps: displayRefreshRate * 4 };
            case '8x':
                return { fast: true, targetFps: displayRefreshRate * 8 };
            case '1000':
                return { fast: true, targetFps: 1000 };
        }

        // A plain number keeps working (older shell.js builds stored "60", "120", …): pace on rAF
        // while the display can still show every frame, and move to the fast pump above that.
        const numeric = Number(text);
        if (!Number.isFinite(numeric) || numeric <= 0) return { fast: false, targetFps: 0 };

        return { fast: numeric > displayRefreshRate, targetFps: numeric };
    }

    const schedule = (delayMs = 0) => {
        if (wakeHandle) return;

        // The game keeps running while hidden, but on a timer rather than rAF (which stops firing
        // for a hidden document). It is re-based on the way back to visible — see
        // discardHiddenTime() — so no single frame ever carries the whole hidden period as one
        // delta, which is what made returning to the tab stutter.
        //
        // A timer rather than nothing also means a pump that starts while the page is already
        // hidden — a background tab booting — still gets going, instead of waiting on a
        // visibilitychange event that has already fired.
        //
        // 100ms rather than a busy loop: background timers are throttled anyway, and the point
        // while hidden is to keep the game coherent, not to render.
        if (document.hidden) {
            wakeHandle = setTimeout(frame, 100);
            return;
        }

        if (limiter.fast) {
            if (delayMs > 0) wakeHandle = setTimeout(frame, delayMs);
            else {
                fastChannel ??= new MessageChannel();
                fastChannel.port1.onmessage = () => frame();
                fastChannel.port2.postMessage(null);
                wakeHandle = -1; // in flight; frame() clears it
            }
            return;
        }

        wakeHandle = requestAnimationFrame(frame);
    };

    function frame() {
        wakeHandle = 0;
        if (pumping) return;

        const now = performance.now();

        if (limiter.targetFps > 0) {
            const interval = 1000 / limiter.targetFps;

            if (now - lastPumped < interval - 0.25) {
                // Wait out the rest of the interval on a timer rather than re-posting a message
                // every time: the fast pump has nothing else to do in the gap, and spinning on it
                // would burn a core to save a frame that cannot be shown yet anyway.
                schedule(Math.max(0, lastPumped + interval - now));
                return;
            }

            // Advance by whole intervals rather than snapping to `now`, so the limit stays a
            // rational fraction of the refresh rate instead of creeping downwards; resynchronise
            // after a stall long enough that catching up would mean a burst of frames.
            lastPumped = lastPumped === 0 ? now : lastPumped + interval;
            if (lastPumped < now - interval) lastPumped = now;
        }

        pumping = true;
        window.__osuweb.frames++;
        const workStarted = showFrameWork ? performance.now() : 0;
        try {
            pump.Frame();
            lastError = null;
        } catch (e) {
            const text = String(e);
            if (text !== lastError) {
                console.error('[osu!web] frame error:', e);
                lastError = text;
            }
        }
        pumping = false;
        if (showFrameWork && workStarted > 0) recordFrameWork(performance.now() - workStarted, performance.now());
        schedule();
    }

    document.addEventListener('visibilitychange', () => {
        if (wakeHandle) {
            clearTimeout(wakeHandle);
            cancelAnimationFrame(wakeHandle);
            wakeHandle = 0;
        }

        // Unconditional. The previous `if (wakeHandle)` guard wrapped this reset too, so a
        // visibility flip landing in the middle of pump.Frame() — when wakeHandle is 0 — left
        // lastPumped stale and the fast limiter resynchronised against a stale origin.
        lastPumped = 0;

        if (document.hidden) return;

        discardHiddenTime();
        schedule();
    });

    // Debug/verification hooks (frame counter + canvas grab for headless testing).
    window.__osuweb = {
        frames: 0,
        showFrameWork(show) {
            showFrameWork = !!show;
            frameWorkEl.hidden = !showFrameWork;
            frameWorkSamples = [];
            frameWorkReport = null;
            lastWorkReport = performance.now();
            frameWorkEl.textContent = 'measuring CPU frame work…';
        },
        performance: () => frameWorkReport,
        // Frame limiter, written by the shell's settings. Accepts the mode names above or a bare
        // fps number; the display's measured refresh rate is exposed for the shell to label 2x
        // and friends with what they actually resolve to.
        setFpsLimit(mode) {
            limiter = resolveLimiter(mode);
            lastPumped = 0;
        },
        refreshRate: () => displayRefreshRate,
        // Render scale, written by the shell's settings. Clamped to (0, 1]: this is a resolution
        // reduction knob, and letting it exceed 1 would let a visitor silently buy sharpness at
        // the cost of the very framerate the rest of this file exists to protect.
        setRenderScale(scale) {
            const next = Number(scale);
            if (!Number.isFinite(next) || next <= 0) return;
            renderScale = Math.min(1, next);
            applyCanvasSizing?.();
        },
        renderScale: () => renderScale,
        // Backing-store resolution and the display's pixel ratio, for reading back what a given
        // machine is actually rendering at without needing devtools.
        canvasPixels: () => `${canvas.width}x${canvas.height}`,
        devicePixelRatio: () => window.devicePixelRatio || 1,
        capture() {
            const grab = () => {
                const out = document.createElement('canvas');
                out.width = 480;
                out.height = 270;
                out.getContext('2d').drawImage(canvas, 0, 0, 480, 270);
                window.__cap = out;
            };
            window.__cap = null;
            // Hidden: no compositing occurs, so the WebGL buffer still holds the last drawn frame
            // and can be copied directly. Visible: wait for the next draw (before compositing).
            if (document.hidden) grab();
            else requestAnimationFrame(grab);
        },
    };

    // Audio verification hooks (decode/source counters + AudioContext state; `resume` can be used
    // to retry the autoplay-policy resume from test code).
    window.__osuAudio = {
        stats: () => osuAudio.audioStats(),
        resume: () => osuAudio.userGesture(),
    };

    schedule();
    setStatus('running');
}

boot().catch((e) => {
    setStatus(`boot failed: ${e}`, true);
    console.error('[osu!web] boot failed:', e);
});
