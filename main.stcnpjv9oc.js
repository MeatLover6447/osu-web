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

function setStatus(message, isError = false) {
    statusEl.textContent = message;
    statusEl.style.color = isError ? '#ff7a7a' : '#8ab4ff';
    if (isError) console.error('[osu!web]', message);
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
    window.addEventListener('keydown', (e) => {
        if (isTyping()) return;
        if (e.code === 'Space' || e.code === 'Tab' || e.code.startsWith('Arrow')) e.preventDefault();
        pump.KeyboardKey(e.code, true);
    });

    window.addEventListener('keyup', (e) => {
        if (isTyping()) return;
        pump.KeyboardKey(e.code, false);
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
        const dpr = window.devicePixelRatio || 1;
        const cssW = canvas.clientWidth;
        const cssH = canvas.clientHeight;
        const w = Math.max(1, Math.round(cssW * dpr));
        const h = Math.max(1, Math.round(cssH * dpr));
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
        }
        pump.Resize(cssW, cssH, w, h);
    };

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

        const sample = (now) => {
            if (previous > 0) samples.push(now - previous);
            previous = now;

            if (samples.length < 12) {
                requestAnimationFrame(sample);
                return;
            }

            samples.sort((a, b) => a - b);
            const median = samples[Math.floor(samples.length / 2)];
            if (median > 0.5) displayRefreshRate = Math.round(1000 / median);

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

        if (document.hidden) {
            wakeHandle = setTimeout(frame, 0);
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
        schedule();
    }

    document.addEventListener('visibilitychange', () => {
        if (wakeHandle) {
            clearTimeout(wakeHandle);
            cancelAnimationFrame(wakeHandle);
            wakeHandle = 0;
            lastPumped = 0;
            schedule();
        }
    });

    // Debug/verification hooks (frame counter + canvas grab for headless testing).
    window.__osuweb = {
        frames: 0,
        // Frame limiter, written by the shell's settings. Accepts the mode names above or a bare
        // fps number; the display's measured refresh rate is exposed for the shell to label 2x
        // and friends with what they actually resolve to.
        setFpsLimit(mode) {
            limiter = resolveLimiter(mode);
            lastPumped = 0;
        },
        refreshRate: () => displayRefreshRate,
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
