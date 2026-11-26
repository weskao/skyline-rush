# Energy-aware frame pacing and render lifecycle (workstream 20)

Scope: p07. Auto FPS targets a steady 60, Quality / Target FPS / Adaptive resolution are separate, load is read
from frame delivery and the GPU timer, and the canvas stops drawing only when the picture cannot change. Physics
stays fixed at 60 Hz, rival AI and race logic always run, and no model, material, resolution, MSAA, VFX or
animation speed was changed.

Every number here is labelled. `LOCAL-CHROME` = Playwright Chromium on a developer Mac, 1280x800, music and sound
off. It is **not** Safari, a phone, a GPU-power or a thermal measurement.

## Design

### Pacer (`src/frame-pacing.ts`)

- **Auto = steady 60** (`min(60, refresh)`), never climbs to 90/120. 90 and 120 stay manual choices and are never
  forced down (`src/frame-pacing.ts:51`, `:60`). Saved `30/60/90/120/auto` values are read unchanged.
- **Load signal** (`src/frame-pacing.ts:49-52`, `:96`): a missed vsync is an rAF interval over 1.5x the measured
  refresh period. Over an 8 s racing window (at least 40 callbacks), a window is *stressed* when more than 10% of
  vsyncs were missed, or when the GPU timer mean (at least 10 samples) is over 85% of the frame budget. It is
  *relaxed* under 2% missed and a GPU mean under 60% of the 60 FPS budget. CPU submission time
  (`performance.now()` around `world.render`) is no longer an input. It is kept only as a deep-perf diagnostic
  (`src/main.js:563`).
- **Hysteresis**: two stressed windows to step down, three relaxed windows to step back up. Each further step-down
  doubles the recovery requirement, up to 24 windows (`src/frame-pacing.ts:13-14`, `:57`). A device that holds 30
  but misses at 60 switches 1-10 times in 10 minutes instead of every 16 s (test below).
- **Adaptive resolution** is a separate opt-in, off by default (`skyline-rush-adaptive-resolution-v1`, `'1'` = on).
  When off, render scale is always 1, so High is never silently lowered. When on, the first step-down is scale
  0.85 before FPS. Turning it off restores scale 1. It never changes a manual FPS or the Quality setting.
- **GPU timer**: `src/deep-perf.ts:98` forwards each GPU timer sample (`EXT_disjoint_timer_query`, sampled every
  30th frame under `?perf=deep`) to `pacer.observeGpu` via `onGpuFrame` (`src/fps-ui.ts:30`). In production there
  is no timer, so Auto uses frame delivery only.

### Render on demand (`src/render-lifecycle.ts`, gate at `src/main.js:549`)

| Screen | Draws |
| --- | --- |
| Home showcase (`ready`), Garage (opens only in `ready`), Coming Soon 3D, countdown, start flare, racing, results (`finished`, camera and cars keep moving) | every paced frame, as before |
| Paused race (incl. Photo Mode) | 90 frames after pausing or after any input (pointer, wheel, key, input/change, click), then 0 until the next input or layout change |
| Any phase under an opaque full-viewport dialog, or with the WebGL context lost | 0. Uncovering or restoring redraws the full settle budget |
| A pending scene frame (`world.raceFramePending`) | always drawn |

- Simulation (`drainSteps`, at most 3 steps per callback), `sound.update` (`src/main.js:565`), the HUD tick
  (75 ms) and deep-perf run every rAF callback regardless of draw demand. Audio cues stay tied to simulation steps,
  as `docs/performance/audio-cpu.md` requires.
- **Cover detection** (`src/render-lifecycle.ts:34-48`): a dialog covers the canvas only if it does not contain
  the canvas, has opacity 1, and has either an opaque modal `::backdrop` or a full-viewport panel with a solid
  opaque background colour. Gradients and images count as see-through. The result is cached and recomputed only
  after a structural change: `open` attribute mutation, canvas resize, `resize`, `orientationchange`, `pageshow`,
  `animationend`, `transitionend`, `visibilitychange`, `webglcontextrestored`. Pointer and key events only
  invalidate the draw budget and never force a style read (unit-tested: 0 `getComputedStyle` calls on 100
  pointer moves).
- **Lifecycle**: one listener set and two observers. A real `pagehide` (`persisted: false`) disposes them all; a
  bfcache `pagehide` keeps them, and `pageshow` redraws. `src/main.js` keeps its single rAF loop, existing
  `visibilitychange` pause, context-loss pause and real-pagehide teardown. The browser spec asserts no callback is
  ever pending twice (`maxPendingPerCallback === 1`).

### Dialog probe (LOCAL-CHROME, 1280x800 and 390x844)

Every production dialog was opened and its computed style read. None is an opaque cover today, so production
dialogs never freeze the scene:

| Dialog | Panel | `::backdrop` | Verdict |
| --- | --- | --- | --- |
| guide, history, leave, confirm, settings, event-lab, acquisition-reveal | solid, not full viewport | rgba 0.65-0.85 | translucent, keeps drawing |
| whats-new, track-chooser | gradient | rgba 0.55-0.82 | translucent, keeps drawing |
| photo-screen | rgba(16,38,55,0.93) corner panel | transparent | keeps drawing (paused rules apply) |
| garage-screen | full viewport, gradient, hosts the canvas when opened by the app | rgba 0.82 | keeps drawing |
| release-media-viewer | 0x0 when idle | rgba 0.9 | translucent |

The opaque-cover path is covered by a synthetic `dialog` (`rgb(0,0,0)`, full viewport) in the browser spec, so a
future opaque screen stops drawing with no further wiring.

## Per-requirement status (p07)

| # | Requirement | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Review rAF / loop / accumulator / presentation / audio / HUD / GPU relation | DONE | Single loop `src/main.js:512-572`: rAF first, `drainSteps` fixed steps, presentation, paced and demand-gated draw, then `sound.update`, HUD (75 ms), deep-perf. Only the draw is gated. |
| 2 | Fixed 60 Hz physics, independent of render FPS and visibility | DONE | `drainSteps` unchanged; `tests/frame-pacing.test.js` "30fps rendering keeps 60Hz simulated…" and "real game engine preserves…" pass; paused race clock stays frozen in `tests/render-on-demand-browser.spec.js:74`. |
| 3-4 | Auto aims for sustained 60, keeps manual 30/60/90/120 and saved choices | DONE | `src/frame-pacing.ts:51`; tests "Auto holds a stable 60 on high-refresh callbacks" (`tests/phase3-high-refresh.test.js:50`), "saved explicit FPS choices survive…" (`tests/frame-pacing.test.js:128`), browser `tests/fps-browser.spec.js` (saved `90` kept). |
| 5-7 | Quality / Target FPS / Adaptive resolution separate; High never silently lowered; adaptive is an explicit opt-in, default off | DONE | `src/frame-pacing.ts:5,11,59`, `src/fps-ui.ts:10-28`, toggle `src/App.vue:106-107`, en/zh-TW `src/locales/display-settings.ts:6-8,18-20`. Tests: "adaptive resolution is opt-in…" (`tests/frame-pacing.test.js:109`), "opted-in adaptive resolution keeps a manual FPS…" (`:118`), browser persistence + zh-TW copy in `tests/fps-browser.spec.js`. |
| 8 | CPU submission time is not GPU load | DONE | `completeRender` removed; `src/main.js:563` is diagnostic only. Test "CPU submission time is not GPU load" (`tests/frame-pacing.test.js:82`) replays the old 19 ms feed and keeps 60. |
| 9 | GPU timer + frame delivery + missed deadlines + long trend, no oscillation | DONE | `src/frame-pacing.ts:49-60,96`, `src/deep-perf.ts:98`, `src/fps-ui.ts:30`. Tests "GPU timer near budget counts as load" (`:89`) and "marginal load backs off recovery" (`:98`, 1-10 switches in 10 min). |
| 10 | Render on demand for truly static pause / results / Garage / Photo | DONE for pause + Photo Mode; REJECTED for results and Garage | Results (finish camera, cars) and Garage (turntable studio) animate, so stopping them would freeze visible motion (item 11). `src/render-lifecycle.ts:8-22`. |
| 11 | Keep Home, Garage, Coming Soon, countdown, flare, results animations | DONE | Only `paused` settles (`src/render-lifecycle.ts:16`). Unit test "every animated screen keeps drawing" and browser Home step. No animation speed or duration changed. |
| 12 | Opaque full-screen dialog stops drawing; translucent never freezes | DONE | `src/render-lifecycle.ts:34-48`, probe above, browser steps (History keeps drawing; synthetic opaque cover settles to 0 and resumes on close). |
| 13 | Visibility, pagehide/pageshow, bfcache, orientation, WebGL loss/restore | DONE | `src/render-lifecycle.ts:51-81`; existing handlers `src/main.js:402-409,585-596,654-662`. Unit test "bfcache restore, visibility, orientation and WebGL context restore all request a redraw". Real-device bfcache/orientation: UNVERIFIED (SOP below). |
| 14 | No duplicate rAF / timer / observer / listener; no burst catch-up | DONE | Unit test "one registration per listener and observer, all removed on dispose and on a real pagehide"; browser `maxPendingPerCallback === 1`; "a long background gap or hitch never replays a burst of physics steps" (at most 3 steps per callback). |
| 15 | Wire Wave 1 interfaces | DONE | GPU timer feed `src/deep-perf.ts:98` -> `src/fps-ui.ts:30`. Audio: `sound.update` stays per callback (`src/main.js:565`). HUD: DOM, not canvas, so it needs no invalidation. Lens/warmup: untouched (`world.js` not edited). `hud-compositing.md` and `scene-streaming.md` list no wiring needs. |
| 16 | Screenshot, photo export, Garage preview, shader warmup | DONE | Browser spec: photo orbit redraws and a synthetic-click export after settle downloads a `.png`. Garage only opens in `ready` (`src/main.js:257`), which always draws. Warmup runs inside `world.render` on drawn frames; a lost/restored context resets settle. `photo-studio`, `garage-covers-home`, `graphics-first-frame` specs pass (below). |
| - | Energy, thermals, GPU power on iPhone / Mac | UNVERIFIED | No physical-device numbers are claimed. SOP below. |

## RED evidence (observed before the implementation)

- `node --test tests/frame-pacing.test.js tests/phase3-high-refresh.test.js` against the old pacer with stubbed
  exports: 10 assertion failures, e.g. "Auto holds a stable 60 on high-refresh callbacks" (`actual: 120, expected:
  60`), "CPU submission time is not GPU load" (`actual: 30, expected: 60`), "adaptive resolution is opt-in…"
  (`actual: 0.85, expected: 1`), "marginal load backs off recovery…", "opted-in adaptive resolution keeps a manual
  FPS…".
- `node --test tests/render-lifecycle.test.js` against an always-draw stub: 6 of 7 failed (paused settle, cover,
  cover detection, lazy recompute, dispose/pagehide, lifecycle redraw). Only "every animated screen keeps drawing"
  passed, as intended.
- `PLAYWRIGHT_PORT=5220 pnpm exec playwright test tests/render-on-demand-browser.spec.js --workers=1` before the
  gate was wired into `src/main.js`: failed at the opaque-cover step, `Expected: 0, Received: 30`.

## Before / After

Soak: `tests/frame-lifecycle-soak-browser.spec.js` (runs only with `SOAK=1`). It drives a Coast Free race in
LOCAL-CHROME (Playwright Chromium, 60 Hz rAF, Auto FPS, default Quality), alternating one minute of racing with
throttle held and one minute paused. Each minute records:

- the delivered rAF rate and composer draws per second over the last 10 s, after the paused camera settled;
- composer draws in that minute;
- CDP `Performance.getMetrics` `TaskDuration` / `ScriptDuration` deltas, as a percentage of wall time.

Before = base `1520b8ba` (`src/` checked out from it), After = this branch. Order was After-5, Before-5, After-15,
Before-15. Raw JSON stays in the gitignored `docs/designs/3d-pipeline/audits/frame-lifecycle/`. The table shows
the mean of all minutes per phase; there were 0 page errors in every run.

| LOCAL-CHROME | Racing rAF fps | Racing draws/s | Racing main-thread busy | Paused draws/s | Paused draws/min | Paused main-thread busy | Paused script busy |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Before, 5 min | 60.0 | 60.1 | 23.6% | 60.0 | 3602 | 19.3% | 15.3% |
| After, 5 min | 59.9 | 60.0 | 24.6% | 0.0 | 106 | 7.0% | 1.5% |
| Before, 15 min | 59.9 | 60.0 | 26.9% | 59.9 | 3600 | 19.7% | 15.5% |
| After, 15 min | 59.8 | 59.9 | 22.1% | 0.0 | 105 | 5.5% | 1.2% |

How to read it:

- **Racing is unchanged** (60 fps delivered, 60 draws/s). The busy-time spread, 22-27%, is run-to-run noise in
  both directions.
- **A paused race now draws only its 90-frame settle plus input redraws** (about 105 per minute instead of 3600).
  Main-thread busy time drops about 3x and script time about 10x. The rAF loop keeps running at 60, so
  simulation, audio and HUD timing are unchanged.
- The display here is 60 Hz, so the high-refresh change (Auto no longer climbing to 90/120) is not visible in this
  soak. It is covered by `tests/phase3-high-refresh.test.js`.
- Heap stayed between 34 and 60 MB with no upward trend over 15 minutes in either build.
- These are main-thread numbers, not GPU, power or thermal measurements.
- **30-minute run: NOT RUN.** Both 15-minute runs (about 40 minutes of wall time with the 5-minute pair) showed a
  flat trend in every metric, and the remaining budget was spent on the gate. On a physical device, use the SOP
  below.

## Verification run

Local, on the final tree (LOCAL-CHROME for the browser specs, `PLAYWRIGHT_PORT=5220`, `--workers=1`):

| Check | Result |
| --- | --- |
| `node --test tests/module-size.test.js` | 3/3 pass (`src/main.js` at its 662-line ceiling, `src/world.js` untouched) |
| `pnpm test` | 4042 tests, 4038 pass, 0 fail |
| `pnpm run typecheck` | pass |
| `pnpm run build` | pass |
| fps, perf, perf-modes, photo-studio (12 scenes and profiles), garage-covers-home, graphics-first-frame, thermal-replay, hud-compositing, render-on-demand | 29 passed, 2 skipped (env-gated `perf-modes` and `sustained-fps`); render-on-demand and fps re-run after the last fix: 3 passed |

The first full `pnpm test` run failed `tests/browser-timeouts.test.js`: the new `fps-browser` assertion used a raw
`timeout: 10_000`. It now uses `ciTimeout(10_000)`, as the rule requires.

## Manual SOP for physical devices (UNVERIFIED)

1. Build the base (`1520b8ba`) and this branch with `pnpm run build`; serve each with `pnpm preview` on the LAN.
2. iPhone (Safari) and a Mac: for each build, run 5, 15 and 30 minutes of the same loop (one minute Coast Free
   racing, one minute paused, then Home idle), alternating A/B, same ambient temperature and battery level,
   starting cool.
3. Record Safari Web Inspector Timelines frame rate and CPU, the thermal state (Xcode Energy Log, or `pmset -g
   therm` / `powermetrics --samplers gpu_power` on the Mac), and battery drain per 15 minutes.
4. Check: a paused race and an opaque cover show near-zero GPU activity on B; Home, countdown and racing look and
   move the same on A and B; lock/unlock, app switch, back/forward (bfcache) and rotation redraw the scene; a
   context loss shows the existing reload message.
5. On a 120 Hz display (ProMotion), Auto must hold 60, and manual 90/120 must still reach 90/120.
