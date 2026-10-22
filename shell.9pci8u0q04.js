// The HTML shell around the real osu!lazer gameplay host.
//
// main.js is bring-up only (wasm, GL, audio, exports, frame pump). Everything here is control
// surface — import a .osz, list its difficulties, pick mods, play one, show results, pick a skin,
// and set osu!'s gameplay options. The game code (window.osu, exported by BrowserShell.cs) owns
// every decision; this file is presentation over five calls.
//
// The contract it drives:
//     window.osu.importOsz(bytes)             -> JSON { ok, count, difficulties[] }
//     window.osu.play(index, mods, push)      -> JSON { ok, name, rejected[] }  (two-phase)
//     window.osu.getStats(index, mods)        -> JSON { ok, starRating, colour, textColour,
//                                                       category, bpm, bpmMin, bpmMax, lengthMs,
//                                                       circleSize, approachRate, overallDifficulty,
//                                                       drainRate, scoreMultiplier, ranked, ... }
//     window.osu.getMods()                    -> JSON { ok, mods[] }  (each with multiplier + settings)
//     window.osu.setModSetting(acronym, key, value) -> JSON
//     window.osu.getBackground(index)         -> JSON { ok, url }
//     window.osu.importSkin(bytes)            -> JSON { ok, name }
//     window.osu.setSetting(key, value)       -> JSON
// and C# calls back into JS through the osuShell module (document events osu:ready / osu:score /
// osu:stage). Every call is synchronous — wasm is single-threaded and these run on the frame
// pump's thread — so results are readable the moment they return (see the note in BrowserShell.cs).
//
// Play is two-phase on purpose: play(..., false) builds the player, play(..., true) shows the one
// it built, and the shell paints between them. Each half is one long blocking wasm call, and a
// browser cannot repaint in the middle of one — without the yield the loading overlay was simply
// replaced by a frozen frame for the whole of a cold load.

(function () {
    'use strict';

    const el = (id) => document.getElementById(id);

    const shellEl = el('shell');
    const shellBg = el('shell-bg');
    const fileInput = el('osz-file');
    const importStatus = el('import-status');
    const listEl = el('difficulty-list');
    const emptyNote = el('empty-note');
    const infoEl = el('info');
    const beatmapInfo = el('beatmap-info');
    const playButton = el('play-button');
    const resultsEl = el('results');
    const volumeToggle = el('opt-volume');
    const settingsStatus = el('settings-status');
    const skinInput = el('osk-file');
    const skinName = el('skin-name');
    const skinStatus = el('skin-status');
    const settingsList = el('gameplay-settings');
    const loadOverlay = el('load-overlay');
    const loadFill = el('load-fill');
    const loadLabel = el('load-label');
    const gameBack = el('game-back');
    const modColumnsEl = el('mod-columns');
    const modNote = el('mod-note');
    const modFooter = el('mod-footer');
    const modMultiplier = el('mod-multiplier');
    const modRanked = el('mod-ranked');
    const modPreview = el('mod-preview');
    const settingsModal = el('settings');
    const settingsButton = el('settings-button');
    const settingsClose = el('settings-close');

    let difficulties = [];
    let selectedIndex = -1;
    let mods = [];
    let selectedMods = new Set();

    function setStatus(message, isError = false) {
        settingsStatus.textContent = message;
        settingsStatus.classList.toggle('error', isError);
    }

    // --- settings ---------------------------------------------------------------------
    // Every entry maps onto one real OsuConfigManager bindable (the keys are BrowserShell's, which
    // translates them onto OsuSetting names), so the value written here is the value lazer's own
    // gameplay code reads — UserDimContainer, Player, and friends. Grouped the way lazer's own
    // settings overlay sections are.
    //
    // `host` marks a setting that is this shell's own business rather than lazer's: it decides how
    // often main.js runs the frame pump, so it is applied straight to the pump instead of going
    // over the bridge to a bindable that would ignore it.
    const SETTINGS = [
        { section: 'visual', key: 'dimLevel', type: 'range', label: 'background dim' },
        { section: 'visual', key: 'blurLevel', type: 'range', label: 'background blur' },
        { section: 'visual', key: 'showStoryboard', type: 'bool', label: 'storyboard / video' },
        { section: 'visual', key: 'beatmapSkins', type: 'bool', label: 'beatmap skins' },
        { section: 'visual', key: 'beatmapColours', type: 'bool', label: 'beatmap colours' },
        { section: 'visual', key: 'lightenDuringBreaks', type: 'bool', label: 'lighten playfield during breaks' },
        { section: 'audio', key: 'beatmapHitsounds', type: 'bool', label: 'beatmap hitsounds' },
        { section: 'input', key: 'mouseDisableButtons', type: 'bool', label: 'disable clicks during gameplay' },
        { section: 'graphics', key: 'showFps', type: 'bool', label: 'show FPS' },
        {
            section: 'graphics', key: 'fpsLimit', type: 'select', label: 'frame limiter', host: true,
            // Multipliers resolve against the display's measured refresh rate at run time (see
            // main.js), so the labels are filled in below once that measurement lands.
            options: [
                ['vsync', 'vsync'],
                ['2x', '2x refresh rate'],
                ['4x', '4x refresh rate'],
                ['8x', '8x refresh rate'],
                ['1000', '1000 fps'],
                ['unlimited', 'unlimited'],
            ],
        },
        {
            // Not a lazer setting: this scales the WebGL backing store in main.js, so the browser
            // upscales it back to the same on-screen size. Nothing about the game changes but the
            // number of pixels the GPU shades per frame, which is the cheapest available lever on
            // a machine with no dedicated GPU — and the only one that no CPU-side profiling can
            // see, so it is left as a knob the player can feel out on their own hardware.
            section: 'graphics', key: 'renderScale', type: 'select', label: 'render resolution', host: true,
            options: [
                ['1', 'native'],
                ['0.85', '85%'],
                ['0.7', '70%'],
                ['0.55', '55%'],
            ],
        },
    ];

    const SECTION_HEADINGS = { visual: 'visual', audio: 'audio', input: 'input', graphics: 'graphics' };

    const SETTINGS_KEY = 'osuweb.settings';
    const controls = new Map();

    function buildSettings() {
        let lastSection = null;

        for (const setting of SETTINGS) {
            if (setting.section !== lastSection) {
                const heading = document.createElement('div');
                heading.className = 'setting-heading';
                heading.textContent = SECTION_HEADINGS[setting.section] ?? setting.section;
                settingsList.appendChild(heading);
                lastSection = setting.section;
            }

            const row = document.createElement('label');
            row.className = 'row setting';

            const caption = document.createElement('span');
            caption.className = 'label';
            caption.textContent = setting.label;

            // Built by type rather than always as an <input>: a <select> is its own element, and
            // appending <option>s to an <input> silently produces a control with no options at
            // all — which is how the frame limiter setting ended up dead.
            const input = document.createElement(setting.type === 'select' ? 'select' : 'input');
            input.id = `set-${setting.key}`;

            let readout = null;

            if (setting.type === 'range') {
                input.type = 'range';
                input.min = '0';
                input.max = '1';
                input.step = '0.01';

                readout = document.createElement('span');
                readout.className = 'value';
            } else if (setting.type === 'select') {
                for (const [value, label] of setting.options) {
                    const option = document.createElement('option');
                    option.value = value;
                    option.textContent = label;
                    input.appendChild(option);
                }
            } else {
                input.type = 'checkbox';
            }

            row.append(caption, input);
            if (readout) row.append(readout);
            settingsList.appendChild(row);

            controls.set(setting.key, { setting, input, readout });

            input.addEventListener('change', () => {
                const value = controlValue(setting.key);
                if (readout) readout.textContent = formatValue(setting, value);
                pushSetting(setting.key, value);
                saveSettings();
            });

            // The menu backdrop uses the same dim/blur the playfield does, so moving either slider
            // repaints it live rather than only when the next play starts.
            if (setting.key === 'dimLevel' || setting.key === 'blurLevel') {
                input.addEventListener('input', applyBackdropStyle);
            }
        }
    }

    function controlValue(key) {
        const control = controls.get(key);
        if (!control) return 0;

        if (control.setting.type === 'range') return Number.parseFloat(control.input.value);
        if (control.setting.type === 'select') return control.input.value;
        return control.input.checked ? 1 : 0;
    }

    function setControl(key, value) {
        const control = controls.get(key);
        if (!control) return;

        const numeric = Number(value);

        if (control.setting.type === 'select') {
            const wanted = String(value);
            const known = (control.setting.options || []).some(([v]) => v === wanted);

            // A stored value from an older build (the previous list was bare fps numbers) no
            // longer matches an option; fall back to the first rather than leaving the control
            // with no selection at all, which would silently mean "no limiter".
            control.input.value = known ? wanted : String(control.setting.options[0][0]);
            return;
        }

        if (control.setting.type === 'range') {
            control.input.value = String(numeric);
            if (control.readout) control.readout.textContent = formatValue(control.setting, numeric);
        } else {
            control.input.checked = numeric > 0.5;
        }
    }

    function formatValue(setting, value) {
        if (setting.type === 'select') {
            const found = (setting.options || []).find(([option]) => option === String(value));
            return found ? found[1] : String(value);
        }

        return setting.type === 'range' ? `${Math.round(value * 100)}%` : (value > 0.5 ? 'on' : 'off');
    }

    function pushSetting(key, value) {
        const control = controls.get(key);
        const host = control?.setting.host;

        if (host) {
            // Host settings belong to the shell, not to lazer, so they are dispatched by key to
            // whichever part of main.js owns them rather than crossing the bridge to a bindable.
            // fpsLimit is a string mode name; renderScale is the select's stringified fraction.
            const bridge = window.__osuweb;
            try {
                if (key === 'fpsLimit') bridge?.setFpsLimit(value);
                else if (key === 'renderScale') bridge?.setRenderScale(Number.parseFloat(value));
            } catch (e) {
                setStatus(`setting '${key}' failed: ${e.message || e}`);
            }
            return;
        }

        // Not booted yet is not an error: applySettings() re-pushes every stored value once the
        // game reports ready, so nothing the user set in the meantime is lost.
        if (!window.osu) return;

        try {
            window.osu.setSetting(key, value);
        } catch (e) {
            setStatus(`setting '${key}' failed: ${e.message || e}`);
        }
    }

    function loadStoredSettings() {
        try {
            return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') || {};
        } catch {
            return {};
        }
    }

    function saveSettings() {
        const values = {};
        for (const setting of SETTINGS) values[setting.key] = controlValue(setting.key);

        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(values));
        } catch {
            // Private browsing / quota — the session keeps its values regardless.
        }
    }

    // Resolves the value every control should start with, and pushes it to the game.
    //
    // A value the user has touched before (localStorage) wins; otherwise the game's own current
    // value is used, which on a first visit is lazer's default. Every control is resolved and
    // pushed — not only the stored ones.
    //
    // The old version skipped anything not in storage, so on a first visit nothing was applied at
    // all: the sliders sat on the HTML default with an empty readout, the game was never told a
    // thing, and each setting only started working once the user touched that control. saveSettings
    // then wrote those untouched HTML defaults out as if they had been chosen.
    function applySettings() {
        const stored = loadStoredSettings();

        // The game's own values, as lazer currently sees them. May be unavailable before boot, in
        // which case the stored values still apply and the game is told again once it is ready.
        let live = {};
        if (window.osu?.getSettings) {
            try { live = JSON.parse(window.osu.getSettings()) || {}; } catch { live = {}; }
        }

        for (const setting of SETTINGS) {
            // Host settings (frame limiter, render resolution) never come back from the game —
            // they are the shell's own business — so they fall through to whatever the control
            // already holds.
            const resolved = setting.key in stored ? stored[setting.key]
                : setting.key in live ? live[setting.key]
                    : controlValue(setting.key);

            setControl(setting.key, resolved);

            // Push what the control ended up holding rather than the raw value: setControl may
            // have corrected an unrecognised one (see its select branch), and the two must agree
            // or the UI would claim a limiter the pump is not applying.
            pushSetting(setting.key, controlValue(setting.key));
        }

        saveSettings();
        labelFpsOptions();
        applyBackdropStyle();
    }

    // The 2x/4x/8x options are multiples of the display's refresh rate, which main.js measures from
    // rAF timing (nothing in the browser reports it directly) and announces on this event.
    function labelFpsOptions() {
        const control = controls.get('fpsLimit');
        if (!control) return;

        const rate = window.__osuweb?.refreshRate?.() ?? 60;
        for (const option of control.input.options) {
            if (option.value === '2x') option.textContent = `2x refresh rate (${rate * 2} fps)`;
            else if (option.value === '4x') option.textContent = `4x refresh rate (${rate * 4} fps)`;
            else if (option.value === '8x') option.textContent = `8x refresh rate (${rate * 8} fps)`;
        }
    }

    document.addEventListener('osu:refresh', labelFpsOptions);

    // --- persistence ------------------------------------------------------------------
    // The imported .osk is kept in IndexedDB so a reload doesn't re-download it; the first visit
    // falls back to the copy served alongside the build, which is what makes it the default skin.
    // Finished scores go into a second store, one record per play.
    const IDB_NAME = 'osuweb';
    const SKIN_STORE = 'kv';
    const SCORE_STORE = 'scores';
    const DEFAULT_SKIN_URL = './test-content/Rosie (Zennan).osk';

    function idbOpen() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(IDB_NAME, 1);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(SKIN_STORE)) db.createObjectStore(SKIN_STORE);
                if (!db.objectStoreNames.contains(SCORE_STORE)) db.createObjectStore(SCORE_STORE, { keyPath: 'playedAt' });
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async function idbGet(storeName, key) {
        try {
            const db = await idbOpen();
            return await new Promise((resolve) => {
                const request = db.transaction(storeName, 'readonly').objectStore(storeName).get(key);
                request.onsuccess = () => resolve(request.result || null);
                request.onerror = () => resolve(null);
            });
        } catch {
            return null;
        }
    }

    async function idbPut(storeName, value, key) {
        try {
            const db = await idbOpen();
            await new Promise((resolve) => {
                const tx = db.transaction(storeName, 'readwrite');
                const store = tx.objectStore(storeName);

                // kv entries use out-of-line keys; score records key on `playedAt`.
                if (key === undefined) store.put(value);
                else store.put(value, key);

                tx.oncomplete = () => resolve(true);
                tx.onerror = () => resolve(false);
            });
        } catch {
            // Persistence is a convenience; the session keeps working without it.
        }
    }

    async function idbAll(storeName) {
        try {
            const db = await idbOpen();
            return await new Promise((resolve) => {
                const request = db.transaction(storeName, 'readonly').objectStore(storeName).getAll();
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => resolve([]);
            });
        } catch {
            return [];
        }
    }

    /** Records a finished play. Called from the osu:score handler below. */
    async function saveScore(score) {
        const record = {
            playedAt: Date.now(),
            beatmap: score.name ?? 'unknown',
            totalScore: score.totalScore ?? null,
            accuracy: score.accuracy ?? null,
            maxCombo: score.maxCombo ?? null,
            rank: score.rank ?? null,
            pp: score.pp ?? null,
            statistics: score.statistics ?? null,
        };

        await idbPut(SCORE_STORE, record);
        return record;
    }

    function applySkinBytes(bytes, fallbackName, note) {
        try {
            const result = JSON.parse(window.osu.importSkin(bytes));
            if (!result.ok) throw new Error(result.detail || result.error);

            skinName.textContent = result.name || fallbackName || 'unknown';
            skinStatus.textContent = note;
            skinStatus.classList.remove('error');
            return true;
        } catch (e) {
            skinStatus.textContent = `skin failed: ${e.message || e}`;
            skinStatus.classList.add('error');
            return false;
        }
    }

    async function bootstrapSkin() {
        const stored = await idbGet(SKIN_STORE, 'skin');

        if (stored && stored.bytes) {
            if (applySkinBytes(stored.bytes, stored.name, 'restored')) return;
        }

        try {
            const response = await fetch(DEFAULT_SKIN_URL);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const bytes = new Uint8Array(await response.arrayBuffer());
            if (!applySkinBytes(bytes, 'Rosie (Zennan)', 'default skin loaded')) return;

            await idbPut(SKIN_STORE, { bytes, name: 'Rosie (Zennan)' }, 'skin');
        } catch (e) {
            skinStatus.textContent = `no skin loaded (${e.message || e})`;
            skinStatus.classList.add('error');
        }
    }

    // --- boot / readiness -------------------------------------------------------------
    // main.js may not have assigned window.osu yet (wasm boot takes a moment), and the game's
    // osu:ready may fire before this module attaches its listener. Poll for both — every action
    // below funnels through this. Without the gate the very common case of picking a file during
    // a cold start threw instead of just importing the file the user had chosen.
    function whenReady(timeoutMs = 180000) {
        if (window.osu && window.osu.ready) return Promise.resolve();

        return new Promise((resolve, reject) => {
            const started = Date.now();

            const cleanup = () => {
                clearInterval(timer);
                document.removeEventListener('osu:ready', onReady);
            };

            const check = () => {
                if (window.osu && window.osu.ready) {
                    cleanup();
                    resolve();
                } else if (Date.now() - started > timeoutMs) {
                    cleanup();
                    reject(new Error('the game is still loading — check the browser console'));
                }
            };

            const onReady = () => check();

            document.addEventListener('osu:ready', onReady);
            const timer = setInterval(check, 100);
        });
    }

    // Yields to the browser so the DOM actually repaints. Two rAFs, because the first callback can
    // land in a frame that is already composing; and a timer fallback, because rAF does not fire
    // at all in a backgrounded tab, where hanging here would wedge the shell completely.
    function nextFrame() {
        return new Promise(resolve => {
            let settled = false;
            const finish = () => {
                if (settled) return;
                settled = true;
                resolve();
            };

            if (document.hidden) {
                setTimeout(finish, 30);
                return;
            }

            requestAnimationFrame(() => requestAnimationFrame(finish));
            setTimeout(finish, 250);
        });
    }

    // --- load overlay ----------------------------------------------------------------
    // Covers the gap between clicking Play and gameplay actually running, which on a cold load is
    // long enough to look like a hang. The bar tracks milestones it can actually observe: the
    // click, play() returning (the player is on the stack), and Player.OnGameplayStarted arriving
    // from C# as osu:stage. Between them it shimmers — a bar frozen at a made-up percentage reads
    // as broken, which is the exact impression this exists to avoid.
    const LOAD_STAGES = [
        { id: 'preparing', pct: 15, text: 'preparing…' },
        { id: 'loading', pct: 60, text: 'loading player…' },
        { id: 'playing', pct: 100, text: 'starting…' },
    ];

    function setLoadStage(id) {
        const stage = LOAD_STAGES.find(s => s.id === id);
        if (!stage) return;

        loadLabel.textContent = stage.text;
        loadFill.style.width = `${stage.pct}%`;
    }

    let loadDismissToken = 0;

    function showLoadOverlay(stageId) {
        loadDismissToken++; // any pending dismissal belongs to the previous run
        setLoadStage(stageId);
        loadOverlay.hidden = false;
    }

    function hideLoadOverlay() {
        loadDismissToken++;
        loadOverlay.hidden = true;
        loadFill.style.width = '0%';
    }

    // OnGameplayStarted can arrive *before* the player's remaining load has actually run: the update
    // thread then blocks for several hundred ms on the first gameplay frames, and dropping the
    // overlay the instant 'playing' lands exposes that block as a frozen playfield. So hide it only
    // once frames are flowing again. While the main thread is blocked rAF cannot fire at all, which
    // guarantees the overlay is still painted for the whole stall; the 3s cap is a safety net so an
    // unusually janky start can never strand the overlay over gameplay.
    function dismissLoadOverlayWhenSmooth() {
        const token = ++loadDismissToken;
        const startedAt = performance.now();
        let prev = startedAt;
        let smooth = 0;

        const tick = () => {
            if (token !== loadDismissToken) return;

            const now = performance.now();
            const gap = now - prev;
            prev = now;

            // A tick arriving right after a stall reports the stall itself as its gap, so a long gap
            // resets the streak rather than counting toward it.
            if (gap < 40) smooth++;
            else smooth = 0;

            if (smooth >= 3 || now - startedAt > 3000) {
                hideLoadOverlay();
                return;
            }

            requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);
    }

    // Wall-clock moment Play was last clicked; 0 again once gameplay has actually begun.
    //
    // C# delivers the previous run's score event asynchronously, so it can land *after* the next Play
    // has already raised this overlay — hideLoadOverlay() then fires during the new play and the
    // player's load (several hundred ms of Update-thread work) shows through as a frozen gameplay
    // frame. Between the click and OnGameplayStarted the run currently being started cannot possibly
    // have produced a score of its own, so any score arriving in that window is the previous run's
    // and must not touch the overlay or the shell.
    const SCORE_STALE_WINDOW_MS = 4000;
    let playStartedAt = 0;

    function scoreIsFromCurrentRun() {
        return playStartedAt === 0 || performance.now() - playStartedAt > SCORE_STALE_WINDOW_MS;
    }

    // --- rendering -------------------------------------------------------------------
    function formatLength(ms) {
        const total = Math.max(0, Math.round((ms || 0) / 1000));
        return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
    }

    function fmt(value) {
        return Number.isFinite(value) ? Number(value).toFixed(1) : '—';
    }

    // Every difficulty in the set in one column, easiest first — the way a difficulty-sorted
    // lazer carousel reads top to bottom. The band a difficulty sits in still shows as a small tag
    // and still decides its colour, but the ordering is the unmodded star rating: so ticking a
    // mod recolours the rows without reshuffling them out from under the user.
    // Used only if a stats payload ever arrives without its colour. A neutral grey rather than a
    // sampled one: the tag is a pill whose background is the fill spectrum, and inventing a colour
    // for a band we have not measured would misreport it.
    const BAND_FALLBACK = '#9a9ab0';

    const bandLabel = (band) => band.replace(/([a-z])([A-Z])/g, '$1 $2');

    // Scroll position survives a re-render, which happens every time the calculator answers for
    // another row — without it the column would jump back to the top under the user's cursor.
    let listScroll = 0;

    function renderDifficulties() {
        listScroll = listEl.scrollTop;
        listEl.replaceChildren();

        if (!difficulties.length) {
            listEl.hidden = true;
            emptyNote.hidden = false;
            infoEl.hidden = true;
            playButton.disabled = true;
            return;
        }

        listEl.hidden = false;
        emptyNote.hidden = true;

        // A difficulty whose stars have not been calculated yet sorts to the bottom rather than
        // bouncing to the top mid-fill, so the order only ever settles downwards.
        const order = difficulties
            .map((_, i) => i)
            .sort((a, b) => (cachedStats(a, BASE)?.starRating ?? Infinity) - (cachedStats(b, BASE)?.starRating ?? Infinity));

        for (const i of order) listEl.appendChild(buildDifficultyRow(i));

        listEl.scrollTop = listScroll;
        playButton.disabled = selectedIndex < 0;
    }

    function buildDifficultyRow(i) {
        const d = difficulties[i];

        // The unmodded answer decides the band and the band tag's colour; the modded one (when
        // there is one) decides the star number and its pill. Splitting them is what lets a mod
        // recolour the stars without the band tag disagreeing with its own label.
        const bandStats = cachedStats(i, BASE);
        const stats = cachedStats(i, modAcronyms()) || bandStats;

        const row = document.createElement('div');
        row.className = 'difficulty' + (i === selectedIndex ? ' selected' : '');
        row.dataset.index = String(i);

        // The band tag gets the same fill-behind / text-on-top pair as the star label, because the
        // fill spectrum runs to black past 9.0★ and an unmodded ExpertPlus is routinely above that:
        // as plain text the tag would vanish.
        row.style.setProperty('--band-fill', bandStats?.colour || BAND_FALLBACK);
        row.style.setProperty('--band-text', bandStats?.textColour || '#fff');

        const text = document.createElement('div');
        text.className = 'text';

        const name = document.createElement('span');
        name.className = 'name';
        name.textContent = d.name || `Difficulty ${i + 1}`;

        const mapper = document.createElement('span');
        mapper.className = 'mapper';

        if (d.mapper) {
            const by = document.createElement('span');
            by.className = 'mapper-name';
            by.textContent = `mapped by ${d.mapper}`;
            mapper.appendChild(by);
        }

        // The band, kept as a tag so a difficulty is still identifiable as, say, an Insane now
        // that it no longer has a column of its own.
        const band = bandStats?.category;
        if (band) {
            const tag = document.createElement('span');
            tag.className = 'band';
            tag.textContent = bandLabel(band);
            mapper.appendChild(tag);
        }

        text.append(name, mapper);

        const stars = document.createElement('span');
        stars.className = 'stars';
        stars.dataset.index = String(i);
        stars.textContent = stats ? `${Number(stats.starRating).toFixed(2)}★` : '…';

        // Lazer's StarRatingDisplay is a pill: the fill spectrum behind, ForStarDifficultyText on
        // top. Doing the same here is what keeps a 10★ label readable — the fill gradient alone
        // runs to black past 9.0★, which is fine as a background and invisible as text.
        if (stats && stats.colour) {
            stars.style.setProperty('--star-bg', stats.colour);
            stars.style.setProperty('--star-text', stats.textColour || '#fff');
        }

        row.append(text, stars);
        row.addEventListener('click', () => selectDifficulty(i));
        return row;
    }

    function selectDifficulty(index) {
        selectedIndex = index;
        renderDifficulties();
        renderBeatmapInfo();
        renderModFooter();
        loadBackdrop(index);
    }

    // --- difficulty statistics ---------------------------------------------------------
    // The one thing here that costs anything. getStats runs lazer's real difficulty calculator,
    // so every answer is fetched once and cached by (difficulty, mod selection) — and the fetches
    // are spread over macrotasks, one at a time, so the first paint after an import is never
    // stalled behind a whole pack's worth of calculation.
    const BASE = '';   // the mod selection that means "no mods"

    const statsCache = new Map();
    const statsKey = (index, modString) => `${index}|${modString}`;

    /** Read-only: rendering must never run the calculator inline. */
    function cachedStats(index, modString) {
        return statsCache.get(statsKey(index, modString)) ?? null;
    }

    function statsFor(index, modString) {
        const key = statsKey(index, modString);
        if (statsCache.has(key)) return statsCache.get(key);
        if (!window.osu || !window.osu.ready) return null;

        try {
            const result = JSON.parse(window.osu.getStats(index, modString));
            if (!result.ok) return null;

            statsCache.set(key, result);
            return result;
        } catch {
            return null;
        }
    }

    let fillToken = 0;

    // Fills whatever is missing, both the unmodded answer (which decides a difficulty's band and
    // colour) and the one for the mods currently ticked. A newer pass supersedes an older one, so
    // toggling mods mid-fill does not end up with two passes painting over each other.
    function fillStats() {
        const token = ++fillToken;
        const current = modAcronyms();

        const step = (i) => {
            if (token !== fillToken) return;
            if (i >= difficulties.length) return;

            let computed = false;

            if (!cachedStats(i, BASE)) { statsFor(i, BASE); computed = true; }
            if (!cachedStats(i, current)) { statsFor(i, current); computed = true; }

            if (computed) {
                renderDifficulties();
                renderBeatmapInfo();
                renderModFooter();
            }

            setTimeout(() => step(i + 1), 0);
        };

        setTimeout(() => step(0), 0);
    }

    // --- beatmap info -----------------------------------------------------------------
    // Everything but the statistics comes off the decoded beatmap, which the import already
    // parsed, so it is free. The panel mirrors lazer's own info presentation: identity, stars for
    // the current mod set, the object breakdown, and the four difficulty settings osu! shows —
    // all four, plus BPM and length, restated for the mods currently ticked, with the numbers the
    // mods moved picked out so the effect is legible at a glance.
    function renderBeatmapInfo() {
        const d = difficulties[selectedIndex];

        if (!d) {
            infoEl.hidden = true;
            beatmapInfo.replaceChildren();
            return;
        }

        infoEl.hidden = false;
        beatmapInfo.replaceChildren();

        const base = cachedStats(selectedIndex, BASE);
        const stats = cachedStats(selectedIndex, modAcronyms()) || base;
        const modded = stats != null && stats !== base;

        const title = document.createElement('div');
        title.className = 'beatmap-info-title';
        title.textContent = d.title || d.name || 'unknown';

        const sub = document.createElement('div');
        sub.className = 'beatmap-info-sub';
        sub.textContent = d.artist ? `${d.artist} — ` : '';
        if (d.mapper) {
            const who = document.createElement('span');
            who.className = 'mapper';
            who.textContent = d.mapper;
            sub.appendChild(who);
        }

        const stars = document.createElement('div');
        stars.className = 'beatmap-info-stars';
        stars.dataset.key = 'stars';
        stars.textContent = stats ? `${Number(stats.starRating).toFixed(2)}★` : '…';

        // Same fill-behind / text-on-top pair as the list, so a high modded rating stays legible
        // here too rather than turning the header black.
        if (stats && stats.colour) {
            stars.style.setProperty('--star-bg', stats.colour);
            stars.style.setProperty('--star-text', stats.textColour || '#fff');
        }

        // The modded value when the calculator has answered, the decoded beatmap's own value
        // otherwise — so the panel is populated from the moment a difficulty is picked.
        const list = document.createElement('div');
        for (const [key, label, value, baseValue] of [
            ['length', 'length', stats ? formatLength(stats.lengthMs) : formatLength(d.lengthMs), base ? formatLength(base.lengthMs) : null],
            ['bpm', 'bpm', stats ? String(stats.bpm) : String(d.bpm), base ? String(base.bpm) : null],
            ['objects', 'objects', String(d.hitObjectCount), null],
            ['cs', 'cs', fmt(stats?.circleSize ?? d.circleSize), base ? fmt(base.circleSize) : null],
            ['ar', 'ar', fmt(stats?.approachRate ?? d.approachRate), base ? fmt(base.approachRate) : null],
            ['od', 'od', fmt(stats?.overallDifficulty ?? d.overallDifficulty), base ? fmt(base.overallDifficulty) : null],
            ['hp', 'hp', fmt(stats?.drainRate ?? d.drainRate), base ? fmt(base.drainRate) : null],
        ]) {
            const row = document.createElement('div');
            row.className = 'beatmap-info-row';

            const caption = document.createElement('span');
            caption.className = 'label';
            caption.textContent = label;

            const readout = document.createElement('span');
            readout.className = 'value';
            readout.dataset.key = key;
            readout.textContent = value;

            // A number the mods actually moved reads differently from one they left alone, which
            // is the whole point of showing the modded stats at all.
            if (modded && baseValue != null && value !== baseValue) readout.classList.add('changed');

            row.append(caption, readout);
            list.appendChild(row);
        }

        const objects = document.createElement('div');
        objects.className = 'beatmap-info-objects';
        for (const [label, value] of [
            ['circles', d.circles],
            ['sliders', d.sliders],
            ['spinners', d.spinners],
        ]) {
            const cell = document.createElement('div');
            const count = document.createElement('b');
            count.textContent = String(value ?? 0);
            cell.append(count, document.createTextNode(label));
            objects.appendChild(cell);
        }

        beatmapInfo.append(title, sub, stars, list, objects);
    }

    // --- mod footer -------------------------------------------------------------------
    // What the current selection does, in the place lazer shows it: the total score multiplier
    // with a ranked/unranked verdict, then the difficulty the mods produce — stars, BPM and the
    // four osu! settings, each marked when the mods moved it.
    const PREVIEW_KEYS = [
        ['stars', 'stars'],
        ['bpm', 'bpm'],
        ['cs', 'cs'],
        ['ar', 'ar'],
        ['od', 'od'],
        ['hp', 'hp'],
    ];

    function renderModFooter() {
        const usable = difficulties.length > 0 && selectedIndex >= 0;
        modFooter.hidden = !usable;
        if (!usable) return;

        const base = cachedStats(selectedIndex, BASE);
        const stats = cachedStats(selectedIndex, modAcronyms()) || base;
        const modded = stats != null && stats !== base;

        if (stats) {
            modMultiplier.textContent = `${Number(stats.scoreMultiplier ?? 1).toFixed(2)}x`;
            modRanked.textContent = stats.ranked ? 'ranked' : 'unranked';
            modRanked.className = 'mod-ranked ranked-tag ' + (stats.ranked ? 'ranked' : 'unranked');
        } else {
            modMultiplier.textContent = '…';
            modRanked.textContent = '';
            modRanked.className = 'mod-ranked';
        }

        const values = stats && {
            stars: `${Number(stats.starRating).toFixed(2)}★`,
            bpm: String(stats.bpm),
            cs: fmt(stats.circleSize),
            ar: fmt(stats.approachRate),
            od: fmt(stats.overallDifficulty),
            hp: fmt(stats.drainRate),
        };

        const baseValues = base && {
            stars: `${Number(base.starRating).toFixed(2)}★`,
            bpm: String(base.bpm),
            cs: fmt(base.circleSize),
            ar: fmt(base.approachRate),
            od: fmt(base.overallDifficulty),
            hp: fmt(base.drainRate),
        };

        modPreview.replaceChildren();

        for (const [key, label] of PREVIEW_KEYS) {
            const cell = document.createElement('div');
            cell.className = 'cell';

            const caption = document.createElement('span');
            caption.className = 'label';
            caption.textContent = label;

            const readout = document.createElement('span');
            readout.className = 'value';
            readout.textContent = values ? values[key] : '—';

            if (modded && baseValues && values[key] !== baseValues[key]) readout.classList.add('changed');

            cell.append(caption, readout);
            modPreview.appendChild(cell);
        }
    }

    // --- backdrop ---------------------------------------------------------------------
    // The beatmap's own artwork, dimmed and blurred by the same settings the playfield uses, so
    // the shell reads as the same scene as the playfield it is about to hand over to (the values
    // drive the --bg-dim / --bg-blur custom properties in shell.css).
    const backdropCache = new Map();

    function loadBackdrop(index) {
        if (index < 0 || index >= difficulties.length) {
            applyBackdrop(null);
            return;
        }

        if (backdropCache.has(index)) {
            applyBackdrop(backdropCache.get(index));
            return;
        }

        if (!window.osu || !window.osu.ready) return;

        try {
            const result = JSON.parse(window.osu.getBackground(index));
            const url = result.ok ? result.url : null;
            backdropCache.set(index, url);
            if (index === selectedIndex) applyBackdrop(url);
        } catch {
            backdropCache.set(index, null);
        }
    }

    function applyBackdrop(url) {
        if (!url) {
            shellBg.style.removeProperty('--bg-image');
            shellBg.classList.remove('has-image');
            return;
        }

        shellBg.style.setProperty('--bg-image', `url("${url}")`);
        shellBg.classList.add('has-image');
    }

    function applyBackdropStyle() {
        const dim = Number(controlValue('dimLevel'));
        const blur = Number(controlValue('blurLevel'));

        shellBg.style.setProperty('--bg-dim', String(Number.isFinite(dim) ? dim : 0.6));
        shellBg.style.setProperty('--bg-blur', `${(Number.isFinite(blur) ? blur : 0.25) * 20}px`);
    }

    // --- mods -------------------------------------------------------------------------
    // Fetched from the ruleset itself (OsuRuleset.CreateAllMods, grouped by ModType), so this
    // picker cannot drift out of date against lazer's own list: a mod added or removed upstream
    // simply appears or disappears here. Grouped and coloured the way lazer's mod select is.
    const MOD_GROUPS = ['DifficultyReduction', 'DifficultyIncrease', 'Automation', 'Conversion', 'Fun', 'System'];

    // The per-ModType colours OsuColour.ForModType returns upstream (Lime1/Red1/Blue1/Purple1/
    // Pink1/Yellow), which is what lazer's mod select paints its group headers with.
    const MOD_GROUP_COLOURS = {
        DifficultyReduction: '#88da20',
        DifficultyIncrease: '#f2242b',
        Automation: '#4290fb',
        Conversion: '#8c66ff',
        Fun: '#ff66ab',
        System: '#ffcc22',
    };

    function loadMods() {
        try {
            const result = JSON.parse(window.osu.getMods());

            if (!result.ok) throw new Error(result.error || result.detail || 'mod query failed');

            mods = result.mods || [];
            renderMods();
        } catch (e) {
            modNote.textContent = `mods unavailable: ${e.message || e}`;
            modNote.classList.add('error');
        }
    }

    // Each ModType gets a column of its own, laid out left to right and scrolling its own mods —
    // the same shape lazer's mod select gives it, and the same shape the difficulty list had when
    // it was grouped by band. Each column carries its category's colour (OsuColour.ForModType).
    function renderMods() {
        modColumnsEl.replaceChildren();

        const groups = new Map();
        for (const mod of mods) {
            const type = mod.type && MOD_GROUPS.includes(mod.type) ? mod.type : null;
            const bucket = type ?? '__other';
            if (!groups.has(bucket)) groups.set(bucket, []);
            groups.get(bucket).push(mod);
        }

        for (const type of [...MOD_GROUPS, '__other']) {
            const inGroup = groups.get(type);
            if (!inGroup || inGroup.length === 0) continue;

            modColumnsEl.appendChild(buildModColumn(type, inGroup));
        }

        // Rows are freshly built, so any greyed-out state has to be recomputed rather than restored.
        refreshModIncompatibility();
    }

    function buildModColumn(type, inGroup) {
        const column = document.createElement('section');
        column.className = 'column';
        column.style.setProperty('--group-colour', MOD_GROUP_COLOURS[type] ?? '#9a9ab0');

        const heading = document.createElement('div');
        heading.className = 'column-heading';

        const label = document.createElement('span');
        label.textContent = type === '__other'
            ? 'other'
            : type.replace(/([a-z])([A-Z])/g, '$1 $2');

        const count = document.createElement('span');
        count.className = 'count';
        count.textContent = String(inGroup.length);

        heading.append(label, count);

        const body = document.createElement('div');
        body.className = 'column-body';

        for (const mod of inGroup) body.appendChild(buildModRow(mod));

        column.append(heading, body);
        return column;
    }

    // A mod is a row, not a chip: lazer writes the full name and the description straight onto the
    // panel, alongside the mod's own score multiplier and whether it still scores pp — so nothing
    // has to be hovered to find out what a mod does or what it costs.
    function buildModRow(mod) {
        const row = document.createElement('div');
        row.className = 'mod' + (selectedMods.has(mod.acronym) ? ' selected' : '');
        row.dataset.acronym = mod.acronym;

        const head = document.createElement('button');
        head.type = 'button';
        head.className = 'mod-head';

        const acronym = document.createElement('span');
        acronym.className = 'acronym';
        acronym.textContent = mod.acronym;

        const names = document.createElement('span');
        names.className = 'names';

        const fullName = document.createElement('span');
        fullName.className = 'full-name';
        fullName.textContent = mod.name || mod.acronym;

        const description = document.createElement('span');
        description.className = 'description';
        description.textContent = mod.description || '';

        names.append(fullName, description);

        const tags = document.createElement('span');
        tags.className = 'tags';

        const multiplier = document.createElement('span');
        multiplier.className = 'multiplier';
        multiplier.textContent = formatMultiplier(mod.multiplier);

        // Lazer under-values pp for anything not marked ranked, so saying so here beats leaving the
        // user to wonder why their number came out low.
        const ranked = document.createElement('span');
        ranked.className = 'ranked-tag ' + (mod.ranked ? 'ranked' : 'unranked');
        ranked.textContent = mod.ranked ? 'ranked' : 'unranked';

        tags.append(multiplier, ranked);
        head.append(acronym, names, tags);
        head.addEventListener('click', () => toggleMod(mod.acronym));

        row.appendChild(head);

        // Mods that expose settings (DT's speed, flashlight's size, DifficultyAdjust's CS/AR/OD/HP,
        // …) get an expander with the controls lazer would build from the same metadata.
        const settings = mod.settings || [];

        if (settings.length) {
            const toggle = document.createElement('button');
            toggle.type = 'button';
            toggle.className = 'mod-settings-toggle';
            toggle.textContent = `settings (${settings.length})`;

            const panel = document.createElement('div');
            panel.className = 'mod-settings';
            panel.hidden = true;

            for (const setting of settings) panel.appendChild(buildModSetting(mod.acronym, setting));

            toggle.addEventListener('click', () => {
                panel.hidden = !panel.hidden;
                toggle.textContent = panel.hidden ? 'settings (' + settings.length + ')' : 'settings (' + settings.length + ') ▴';
            });

            row.append(toggle, panel);
        }

        return row;
    }

    function formatMultiplier(value) {
        const number = Number(value ?? 1);
        return Number.isFinite(number) ? `${number.toFixed(2)}x` : '1.00x';
    }

    function buildModSetting(acronym, setting) {
        const row = document.createElement('label');
        row.className = 'mod-setting';

        const label = document.createElement('span');
        label.className = 'label';
        label.textContent = setting.label || setting.key;
        if (setting.description) label.title = setting.description;

        let input;
        let readout = null;

        if (setting.type === 'bool') {
            input = document.createElement('input');
            input.type = 'checkbox';
            input.checked = !!setting.value;
        } else if (setting.type === 'select') {
            input = document.createElement('select');
            for (const option of setting.options || []) {
                const element = document.createElement('option');
                element.value = option;
                element.textContent = option;
                input.appendChild(element);
            }
            input.value = String(setting.value ?? '');
        } else {
            input = document.createElement('input');
            input.type = 'range';
            input.min = String(setting.min ?? 0);
            input.max = String(setting.max ?? 1);
            input.step = String(setting.step ?? 0.01);
            input.value = String(setting.value ?? setting.min ?? 0);

            readout = document.createElement('span');
            readout.className = 'value';
            readout.textContent = formatSettingValue(setting, setting.value);
        }

        const commit = () => {
            const value = setting.type === 'bool' ? (input.checked ? 1 : 0) : input.value;

            try {
                const result = JSON.parse(window.osu.setModSetting(acronym, setting.key, value));
                if (!result.ok) throw new Error(result.detail || result.error);
            } catch (e) {
                modNote.textContent = `setting failed: ${e.message || e}`;
                modNote.classList.add('error');
                return;
            }

            if (readout) readout.textContent = formatSettingValue(setting, input.value);

            // Some settings move the mod's own multiplier (DT's rate, flashlight's size) and all of
            // them can move the stars, so the cached answers have to go.
            refreshModMultiplier(acronym);
            statsCache.clear();
            renderDifficulties();
            renderBeatmapInfo();
            renderModFooter();
            fillStats();
        };

        input.addEventListener('change', commit);

        // Live readout while dragging; the commit above still does the work on release.
        if (readout) input.addEventListener('input', () => { readout.textContent = formatSettingValue(setting, input.value); });

        row.append(label, input);
        if (readout) row.append(readout);

        return row;
    }

    function formatSettingValue(setting, value) {
        const number = Number(value);
        if (!Number.isFinite(number)) return String(value ?? '');

        const step = Number(setting.step);
        if (Number.isFinite(step) && step > 0 && step < 1) return number.toFixed(String(setting.step).split('.')[1].length);
        return String(number);
    }

    // Re-reads one mod's multiplier after its settings changed, without rebuilding the list —
    // a rebuild would collapse whatever settings panel the user has open.
    function refreshModMultiplier(acronym) {
        try {
            const result = JSON.parse(window.osu.getMods());
            if (!result.ok) return;

            const updated = (result.mods || []).find(m => m.acronym === acronym);
            if (!updated) return;

            const readout = modColumnsEl.querySelector(`.mod[data-acronym="${acronym}"] .multiplier`);
            if (readout) readout.textContent = formatMultiplier(updated.multiplier);
        } catch {
            // The footer recomputes the total from the stats call anyway, so this is cosmetic.
        }
    }

    // Marks every mod lazer would refuse to sit alongside the current selection. Called after every
    // toggle, because the answer depends entirely on what else is on: with nothing selected nothing
    // is greyed out, and adding DT greys out everything DT alone rules out.
    function refreshModIncompatibility() {
        let incompatible = [];

        try {
            const result = JSON.parse(window.osu.getModCompatibility(modAcronyms()));
            if (result.ok) incompatible = result.incompatible || [];
        } catch {
            // If the query fails the mods simply all stay clickable — which is what lazer does
            // anyway. A failure here costs colour, never function.
        }

        for (const row of modColumnsEl.querySelectorAll('.mod')) {
            row.classList.toggle('incompatible', incompatible.includes(row.dataset.acronym));
        }
    }

    function toggleMod(acronym) {
        // The click never decides the outcome on its own. Lazer's own mod select computes a whole
        // new selection for the click and reads the result, and the rule it applies is that the mod
        // just chosen wins: whatever it conflicts with is dropped from the selection rather than
        // the click being refused. So ticking Double Time while Half Time is active swaps the two
        // over, and clicking a greyed-out mod — grey is a colour, not a lock — does the same for
        // whatever it collides with. Handing C# the current selection plus the one acronym is what
        // keeps that decision exactly where lazer makes it, on .NET types rather than acronyms.
        try {
            const result = JSON.parse(window.osu.applyModSelection(modAcronyms(), acronym));

            if (result.ok && Array.isArray(result.acronyms)) {
                selectedMods = new Set(result.acronyms);
            } else {
                // Fall back to the plain toggle so the row still responds if the query failed.
                if (selectedMods.has(acronym)) selectedMods.delete(acronym);
                else selectedMods.add(acronym);
            }
        } catch {
            if (selectedMods.has(acronym)) selectedMods.delete(acronym);
            else selectedMods.add(acronym);
        }

        for (const row of modColumnsEl.querySelectorAll('.mod')) {
            row.classList.toggle('selected', selectedMods.has(row.dataset.acronym));
        }

        refreshModIncompatibility();

        // Star rating, BPM and CS/AR/OD/HP are all mod-dependent, so they have to be asked for
        // again — as does the info panel and the multiplier footer.
        renderBeatmapInfo();
        renderModFooter();
        refreshStats();
    }

    function modAcronyms() {
        return Array.from(selectedMods).join(',');
    }

    function refreshStats() {
        renderDifficulties();
        fillStats();
    }

    // --- actions ---------------------------------------------------------------------
    fileInput.addEventListener('change', () => {
        const file = fileInput.files && fileInput.files[0];
        if (!file) return;

        // Allow re-selecting the same file later.
        fileInput.value = '';

        importBeatmap(file);
    });

    // Drag & drop straight onto the page, which is much less fiddly than finding the input again
    // for every map.
    document.addEventListener('dragover', (event) => event.preventDefault());
    document.addEventListener('drop', (event) => {
        event.preventDefault();
        const file = event.dataTransfer?.files?.[0];
        if (!file) return;
        importBeatmap(file);
    });

    async function importBeatmap(file) {
        importStatus.textContent = 'reading file…';
        importStatus.classList.remove('error');

        try {
            // Read the file first so the user's choice survives the wait: on a cold load the
            // engine can still be several seconds away from accepting calls, and losing the
            // selection is what made this feel broken.
            const bytes = new Uint8Array(await file.arrayBuffer());

            if (!window.osu) {
                importStatus.textContent = 'waiting for the game to finish loading…';
                await whenReady();
            }

            importStatus.textContent = 'importing…';
            // Let the status text reach the screen before the synchronous import call blocks the
            // main thread for the duration of the parse.
            await nextFrame();

            const result = JSON.parse(window.osu.importOsz(bytes));

            if (!result.ok) throw new Error(result.detail || result.error);

            difficulties = result.difficulties || [];
            statsCache.clear();
            backdropCache.clear();

            // A new set starts with nothing ticked; the mod rows have to be redrawn to match, or
            // they would keep showing the previous set's selection. The catalogue is re-fetched
            // rather than just re-rendered because a mod's score multiplier is measured against a
            // beatmap (DifficultyAdjust's, specifically), and there was none to measure against
            // when the shell first asked at boot.
            selectedMods.clear();
            loadMods();

            importStatus.textContent = `${result.count} difficulties imported`;
            resultsEl.hidden = true;
            gameBack.hidden = true;

            // Start on the first difficulty rather than on nothing selected: the info panel and
            // backdrop have something to show immediately, and Play is one click away.
            selectedIndex = difficulties.length ? 0 : -1;

            renderDifficulties();
            renderBeatmapInfo();
            renderModFooter();
            if (selectedIndex >= 0) loadBackdrop(selectedIndex);
            fillStats();
        } catch (e) {
            importStatus.textContent = `import failed: ${e.message || e}`;
            importStatus.classList.add('error');
        }
    }

    playButton.addEventListener('click', async () => {
        if (selectedIndex < 0) return;

        playButton.disabled = true;
        modNote.textContent = '';
        modNote.classList.remove('error');
        showLoadOverlay('preparing');
        playStartedAt = performance.now();

        try {
            if (!window.osu) {
                await whenReady();
            }

            // The bar has to reach the screen before anything blocks.
            await nextFrame();

            const prepared = JSON.parse(window.osu.play(selectedIndex, modAcronyms(), false));
            if (!prepared.ok) throw new Error(prepared.detail || prepared.error);

            // Lazer's compatibility rules may have dropped part of the selection (HD+HR is fine,
            // DoubleTime+HalfTime is not). Drop the chips too, so what is ticked stays true.
            if (prepared.rejected && prepared.rejected.length) {
                for (const acronym of prepared.rejected) selectedMods.delete(acronym);
                renderMods();
                renderBeatmapInfo();
                renderModFooter();
                refreshStats();
                modNote.textContent = `dropped as incompatible: ${prepared.rejected.join(', ')}`;
                modNote.classList.add('error');
            }

            setLoadStage('loading');
            await nextFrame();

            const pushed = JSON.parse(window.osu.play(selectedIndex, modAcronyms(), true));
            if (!pushed.ok) throw new Error(pushed.detail || pushed.error);

            // Gameplay is in-canvas; hide the shell so the playfield is unobstructed. Everything
            // comes back on the osu:score event, so clear it all now rather than leaving a stale
            // result from the previous play on screen.
            shellEl.hidden = true;
            resultsEl.hidden = true;
            gameBack.hidden = true;
        } catch (e) {
            playStartedAt = 0;
            hideLoadOverlay();
            importStatus.textContent = `play failed: ${e.message || e}`;
            importStatus.classList.add('error');
        } finally {
            // Re-enables Play whenever a difficulty is still selected.
            playButton.disabled = selectedIndex < 0;
        }
    });

    skinInput.addEventListener('change', async () => {
        const file = skinInput.files && skinInput.files[0];
        if (!file) return;

        skinInput.value = '';

        try {
            const bytes = new Uint8Array(await file.arrayBuffer());

            // Same gate as the .osz importer: importSkin lives on window.osu too.
            if (!window.osu) {
                skinStatus.textContent = 'waiting for the game to finish loading…';
                await whenReady();
            }

            if (applySkinBytes(bytes, file.name, 'skin applied'))
                await idbPut(SKIN_STORE, { bytes, name: skinName.textContent }, 'skin');
        } catch (e) {
            skinStatus.textContent = `skin failed: ${e.message || e}`;
            skinStatus.classList.add('error');
        }
    });

    // Settings: audio on/off. The real mixer lives in C#, so this toggles the host's mixer
    // through the same bridge rather than touching Web Audio directly.
    volumeToggle.addEventListener('change', () => {
        setStatus(volumeToggle.checked ? 'audio on' : 'audio off');
        try {
            window.osu.setAudioEnabled(volumeToggle.checked);
        } catch {
            // Host predates the setting; the toggle is cosmetic until it does.
        }
    });

    // --- settings modal ---------------------------------------------------------------
    function openSettings() {
        settingsModal.hidden = false;
        settingsClose.focus();
    }

    function closeSettings() {
        settingsModal.hidden = true;
    }

    settingsButton.addEventListener('click', openSettings);
    settingsClose.addEventListener('click', closeSettings);
    settingsModal.addEventListener('pointerdown', (event) => {
        // Clicking the backdrop (rather than anything inside the panel) closes it.
        if (event.target === settingsModal) closeSettings();
    });

    // Escape closes the settings panel and nothing else: during gameplay the game canvas owns
    // Escape (GlobalAction.Back — pause), and reaching for it here would swallow that.
    document.addEventListener('keydown', (event) => {
        if (event.code === 'Escape' && !settingsModal.hidden) {
            closeSettings();
            event.stopPropagation();
        }
    });

    // The mods pane scrolls in two independent directions: .columns fans the category columns out
    // sideways, and each .column-body scrolls its own mods vertically. The wheel only reaches those
    // when the pointer happens to be over one of them, which leaves the pane's own padding, the
    // category headings and the gaps between columns dead — and since the categories run left to
    // right, that is most of the pane. A roll over any of those areas is therefore redirected to
    // move through the categories sideways, and a horizontal swipe pans them directly. Over a
    // column body that still has vertical room the native scroll is left alone, because that is the
    // list the pointer is pointing at; once a body runs out at either end the roll hands off to the
    // columns instead, so scrolling through one category carries on into the next.
    const modsPane = el('mods-pane');

    modsPane.addEventListener('wheel', (event) => {
        // A horizontal swipe (trackpad, shift+wheel) always pans the categories, wherever it starts.
        if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
            modColumnsEl.scrollLeft += event.deltaX;
            event.preventDefault();
            return;
        }

        const body = event.target instanceof Element ? event.target.closest('.column-body') : null;

        if (body && body.scrollHeight > body.clientHeight + 1) {
            const atTop = body.scrollTop <= 0 && event.deltaY < 0;
            const atBottom = body.scrollTop + body.clientHeight >= body.scrollHeight - 1 && event.deltaY > 0;
            if (!atTop && !atBottom) return;
        }

        modColumnsEl.scrollLeft += event.deltaY;
        event.preventDefault();
    }, { passive: false });

    // --- C# → JS ---------------------------------------------------------------------
    document.addEventListener('osu:stage', (event) => {
        if (event.detail === 'playing') {
            playStartedAt = 0;
            dismissLoadOverlayWhenSmooth();
        } else if (event.detail === 'loading') {
            // A restart (the quick retry hotkey held, or the pause/fail overlay's Retry button)
            // re-pushes the same play from the game side; cover the reload the same way the first
            // load is covered, so the frozen frame never shows.
            showLoadOverlay('loading');
        }
    });

    document.addEventListener('osu:score', (event) => {
        // A score for the run that just finished this play's predecessor would hide the overlay and
        // yank the shell back while the new player is still loading. See scoreIsFromCurrentRun().
        if (!scoreIsFromCurrentRun()) return;

        hideLoadOverlay();

        try {
            const score = JSON.parse(event.detail);

            // ok:false means gameplay ended without ever reaching lazer's results screen — a fail,
            // or quitting early. Player.progressToResults gates that on GameplayState.HasPassed,
            // and Player.PrepareScoreForResultsAsync refuses to build a record for anything else,
            // so there is deliberately nothing to persist. The partial run still comes back on the
            // payload (ScoreProcessor.FailScore populates it), so it renders exactly like a real
            // result minus the save; the shell has to return from the hidden overlay either way.
            const passed = score.ok !== false;
            if (passed) saveScore(score);

            // A pass leaves lazer's own ResultsScreen on the canvas — the real one, with its rank,
            // accuracy, per-judgement breakdown and pp statistic. Re-showing the shell on top of it
            // was covering precisely the thing the user asked to see, so a pass only floats the way
            // back over the playfield. The plain-text summary stays for the cases where nothing
            // else is on screen: a fail, or quitting out early.
            if (passed) {
                shellEl.hidden = true;
                resultsEl.hidden = true;
                gameBack.hidden = false;
                return;
            }

            shellEl.hidden = false;

            const stats = score.statistics
                ? Object.entries(score.statistics)
                    .filter(([, count]) => count !== 0)
                    .map(([judgement, count]) => `  ${judgement.padEnd(10)} ${count}`)
                    .join('\n')
                : '';

            if (score.totalScore == null && score.message) {
                showResults(score.message);
                return;
            }

            const lines = [score.name || 'score', '', 'ended without passing'];
            lines.push(
                `score     ${score.totalScore ?? '—'}`,
                `accuracy  ${score.accuracy != null ? (score.accuracy * 100).toFixed(2) + '%' : '—'}`,
                `max combo ${score.maxCombo ?? '—'}`,
                `rank      ${score.rank ?? '—'}`,
                // Rounded the way the results screen's counter rounds, so the two agree.
                `pp        ${score.pp != null ? Math.round(score.pp) : '—'}`
            );
            if (stats) lines.push('', stats);

            showResults(lines.join('\n'));
        } catch {
            showResults(String(event.detail));
        }
    });

    function showResults(text) {
        resultsEl.textContent = text;
        resultsEl.hidden = false;
    }

    // The results screen is lazer's, so the way out of it has to live outside the shell panel
    // rather than inside it — otherwise showing it would hide the screen it is meant to leave.
    gameBack.addEventListener('click', () => {
        gameBack.hidden = true;
        shellEl.hidden = false;
    });

    document.addEventListener('osu:ready', () => {
        document.body.classList.add('ready');
    });

    document.addEventListener('osu:error', (event) => {
        setStatus(`game error: ${event.detail}`, true);
    });

    // Read-back hooks for the persisted state (used by verification and the browser console).
    window.osuweb = {
        scores: () => idbAll(SCORE_STORE),
        skin: () => idbGet(SKIN_STORE, 'skin'),
        settings: () => loadStoredSettings(),
        refreshRate: () => window.__osuweb?.refreshRate?.() ?? 0,
    };

    // --- start -----------------------------------------------------------------------
    buildSettings();

    whenReady().then(async () => {
        importStatus.textContent = 'choose a .osz to begin';
        setStatus('audio on');

        // Each step is independent: a failure in one (a settings push the host rejects, a missing
        // default skin) must not take the others down with it.
        try {
            applySettings();
        } catch (e) {
            setStatus(`settings failed: ${e.message || e}`, true);
        }

        try {
            loadMods();
        } catch (e) {
            modNote.textContent = `mods unavailable: ${e.message || e}`;
            modNote.classList.add('error');
        }

        try {
            await bootstrapSkin();
        } catch (e) {
            skinStatus.textContent = `no skin loaded (${e.message || e})`;
            skinStatus.classList.add('error');
        }
    }).catch((e) => {
        importStatus.textContent = e.message || String(e);
        importStatus.classList.add('error');
    });
})();
