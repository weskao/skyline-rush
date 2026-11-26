# Wave 1 / 12 — zero-visual-downgrade VFX buffers

Branch `feature/perf-thermal-12-vfx-buffers`, base `9d3c2e69` (`feature/perf-thermal-00-baseline`).
Scope: fewer buffer uploads and fewer dead primitives sent to the rasterizer, with an identical image.
No particle count, size, density, lifetime, colour, glow, speed, animation length or launch-flare timing
changed; no quality tier, FPS policy, `src/world.js`, `src/main.js` or chunk-management change.

## What changed

| Change | Where |
|---|---|
| `markRange` keeps one widening pending range per attribute (three r186 appends a range per `addUpdateRange` and only clears it on upload, so a hidden object would otherwise grow the list); `createLiveSpan` tracks the `[first,last]` ring slots that may be alive, uploads only that span and optionally sets the draw range | `src/effects-particle-upload.js:4`, `:18` |
| Race particle pool (992 points) extracted with a fixed pool, in-place `emit` (no `Object.assign` per spark) and the live span | `src/effects-particle-pool.js:6`; loop/commit `src/effects.js:294`, `:340`; reset `:373` |
| Vapor wake and dash ribbon upload only live points / segments; the ribbon also draws only its live span. The wake keeps its quality-budget draw range (asserted by `tests/garage-skin-renderer.test.js`) | `src/aero-vfx.js:111-112`, `:344-375`; reset `:153-154` |
| Vertex-stage cull of alpha ≤ 0 (clip-space discard, `gl_PointSize=0`) in the particle, vapor and ribbon shaders. Pixel-exact: Normal (SRC_ALPHA, 1−SRC_ALPHA) and Additive (SRC_ALPHA, ONE) blending leave the destination unchanged for alpha 0, and a ribbon segment's 6 vertices share one alpha | `src/effects-particle-shaders.js:7`, `src/aero-wake-meshes.js:14`, `:37` |
| Instanced meshes: hidden EMP discharges, rival status waves and rival tint skip their uploads (every slot is rewritten each frame, so the next shown frame uploads the full current state); the pickup aura uploads only the `used` instances | `src/debuff/emp/emp-discharges.ts:107`, `src/rival-status-fx.ts:68`, `src/rival-status-tint.ts:172`, `src/pickup-aura.js:42-43` |

## Equivalence evidence

- `scripts/vfx-buffer-bench.mjs` drives the real `effects.js` + `aero-vfx.js` update paths with seeded `Math.random`
  and scripted race state, emulates the r186 upload rule into shadow (GPU-side) buffers and digests every primitive
  the GPU would draw with alpha > 0. Digests are identical before/after in all 9 scenarios (table below).
- `tests/helpers/gpu-upload-shadow.js` (`assertGpuMatchesCpu`) is used by
  `tests/effects.test.js` ("the particle pool uploads and draws only live particles…"),
  `tests/aero-vfx.test.js` ("the vapor wake and dash ribbon upload only live primitives…") and
  `tests/vfx-instanced-uploads.test.js`: across skipped-sync frames, quality switches, expiry and reset, the GPU copy
  of every drawn slot equals the CPU state, and GPU-drawn ⇔ CPU alpha > 0.

## Observed RED (before each implementation)

| Command | Failure |
|---|---|
| `node --test --test-name-pattern="particle pool uploads" tests/effects.test.js` | `an empty pool uploads nothing 23040 !== 0` |
| `node --test --test-name-pattern="zero-alpha particle" tests/effects.test.js` | regex did not match `PARTICLE_VERTEX` |
| `node --test --test-name-pattern="upload only live" tests/aero-vfx.test.js` | `an expired wake and ribbon upload nothing 16384 !== 0` |
| `node --test --test-name-pattern="clip" tests/aero-vfx.test.js` | regex did not match the vapor/ribbon vertex shaders |
| `node --test tests/vfx-instanced-uploads.test.js` | `calm 0 Pickup aura: 9728 B for 16 halos` |

## Before / after

### A. Fixed-input buffer probe — environment `node-cpu-no-webgl`

`node scripts/vfx-buffer-bench.mjs --frames=600` (Node, no WebGL; before = 5 runs on the `ec2f836b` source, after = 3
runs on `810d4e47`). Per-frame means. "Dead raster" = alpha-0 points inside the draw range that reach the rasterizer.

| Scenario | Upload B/frame | Drawn points | Dead raster | Live particles | Drawables | Digest |
|---|---|---|---|---|---|---|
| driving | 58229 → 4494 | 992 → 512 | 992 → 0 | unchanged | 81.3 = | 811c9dc5 = |
| boost | 58204 → 16316 | 992 → 512 | 813.9 → 0 | unchanged | 91.6 = | bf907674 = |
| nitro | 58209 → 16369 | 992 → 523.7 | 824.7 → 0 | unchanged | 94.8 = | 7d929039 = |
| drift-chain | 58518 → 9627 | 992 → 609.6 | 940.2 → 0 | unchanged | 81.3 = | a132057d = |
| multi-car-flight | 58235 → 26772 | 992 → 975.6 | 528.4 → 0 | unchanged | 112.0 = | 89c44c1e = |
| pickups-impacts | 58229 → 23815 | 992 → 910.8 | 759.8 → 0 | unchanged | 83.2 = | 47cb20f2 = |
| garage-preview | 58368 → 14117 | 992 → 578.6 | 856.6 → 0 | unchanged | 92.0 = | ea4579f8 = |
| launch-countdown | 58066 → 4187 | 992 → 512 | 992 → 0 | unchanged | 80.1 = | 811c9dc5 = |
| idle-after-burst | 58252 → 5000 | 992 → 521.4 | 985.1 → 0 | unchanged | 81.0 = | e330ef77 = |

CPU ms/frame from this probe is **not reported as a result**: the host load average was ~97 and interleaved runs
varied 0.13–0.45 ms/frame in both directions, larger than any plausible delta. Raw output:
`docs/performance/local/vfx-bench-before.{txt,json}` (git-ignored).

### B. Real WebGL scene probe — environment `unclassified-browser-webgl` (desktop Chrome, macOS host, 390×844 @ DPR 3, High, render DPR 1.5, MSAA 4)

`THERMAL_FRAMES=300 node scripts/thermal-baseline.mjs coast`, three interleaved before/after pairs, host load
average 23–80. Before = pre-change `src/` snapshot, after = `810d4e47`.

| Coast | Draw calls | Triangles | Geometries | GPU frame p50 ms (3 runs, n=9 samples each) | CPU submit p50 ms |
|---|---|---|---|---|---|
| home, before | 195 | 428 999 | 499 | 6.62 / 6.63 / 6.87 | 2.1 / 2.4 / 2.0 |
| home, after | 195 | 428 871 | 499 | 6.20 / 7.77 / 6.04 | 2.0 / 2.4 / 2.0 |
| racing, before | 191 | 418 368 | 499 | 12.71 / 6.57 / 6.17 | 3.1 / 2.5 / 2.1 |
| racing, after | 191 | 418 368 | 499 | 6.82 / 7.05 / 5.95 | 2.3 / 2.5 / 2.2 |

- Draw calls and geometries are unchanged (no batching change; see item 7). Home triangles drop by 128 = the idle dash
  ribbon's 64 dead segments now outside its draw range. `renderer.info.triangles` counts the draw range, not vertex-culled
  points, so the particle/wake cull does not appear in this counter.
- GPU and CPU timings are **noise-dominated** (9 timer samples per run on a loaded shared host, overlapping ranges):
  no GPU or CPU time improvement is claimed.
- Memory: buffer capacities, attribute counts and geometry counts are unchanged, so GPU buffer memory is unchanged;
  CPU heap gains only one span object per pool. Upload bytes are the measured win.
- Raw files: `docs/performance/local/vfx-webgl-before/` and `docs/performance/local/810d4e47…-390x844-*.json` (git-ignored).

## p04 items

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | Review pools, BufferGeometry, InstancedMesh, ShaderMaterial, lifecycles | DONE | Race pool, wake, ribbon, pickup aura, EMP, rival status fx/tint, pickup collect slots and marker pool reviewed; changes listed above. Pickup collect (`src/pickup-collect-vfx.js`) and launch flare already reuse fixed slots. |
| 2 | Fixed pools with active indices | DONE | `src/effects-particle-pool.js:6` + `createLiveSpan` (`src/effects-particle-upload.js:18`); wake/ribbon `src/aero-vfx.js:111-112`. No capacity changed. |
| 3 | Update ranges, dirty flags, `setDrawRange` | DONE | `markRange` single widening range; race pool and ribbon draw ranges follow the live span. Wake draw range keeps its quality budget by contract. |
| 4 | Don't process or submit dead / fully transparent particles | DONE | CPU loops iterate the live span only (`src/effects.js:294`, `src/aero-vfx.js:344`, `:360`); vertex cull (`src/effects-particle-shaders.js:7`, `src/aero-wake-meshes.js:14`, `:37`); dead raster 528–992 → 0 per frame (table A). |
| 5 | GPU motion only if measured and identical | REJECTED | Particle motion depends on road contact, random grounding, chunk rebasing and per-frame race state; a shader port cannot be proven bit-identical and would duplicate CPU interaction (item 6). |
| 6 | Road / game-state / vehicle interaction on CPU | DONE | Unchanged: all integration stays in `effects.js` / `aero-vfx.js` CPU loops. |
| 7 | Transparent batching, blend state, sharing, overdraw | DONE (overdraw) / REJECTED (batching) | Overdraw of dead points/segments removed (item 4). Thruster cores (`src/effects.js:54`) and sprint-plume jets (`src/sprint-plume.ts:100`) use one cloned material per jet for per-jet opacity; merging into an InstancedMesh changes per-object transparent depth sorting against other transparent VFX, so not proven identical. Draw calls unchanged (table B). |
| 8 | Remove hot-path allocation | DONE (owned) / wiring need | `emit` assigns in place (no per-spark `Object.assign`). Remaining per-frame allocations sit outside owned files (below). The `dashSamples` callback closures in `src/aero-vfx.js:306-329` are 3 small closures per frame per car, left as-is (no measurable cost on the loaded host). |
| 9 | Garage equipment shares resources across cars | DONE (existing) | One AeroVFX per scene (`src/garage-stage.ts:61`, `src/upcoming-showcase.ts:122`); `setSkins` only rewrites uniforms/flags on existing materials (`src/aero-vfx.js:169`); guarded by `tests/garage-skin-renderer.test.js` ("toggling skins reuses GPU resources") and `tests/garage-skin-stage.test.js`. |
| 10 | EMP, Freeze, collision, flight, exhaust, airflow, Nitro afterimage, speed lines, pickup rings, special items | DONE | Bench scenarios A plus `tests/vfx-instanced-uploads.test.js` (EMP on a rival, player Freeze, 3 rivals); existing `tests/emp-debuff-fx`, `freeze-debuff-fx`, `nitro-*`, `pickup-collect-vfx`, `garage-*`, `aero-*`, `mini-boost-*` suites pass. |
| 11 | Launch flare frequency, speed, start, play count exactly as-is | DONE (untouched) | `src/garage-launch-flare*.js` not modified; 1.4 s × 2 countdown waves (`src/garage-launch-flare.js:123-124`), 1.1 s direct start (`src/aero-vfx.js:263`); guarded by `tests/garage-launch-flare-3d.test.js:86`, `:138`, `:164`. |
| 12 | No accumulation across FPS, pause, restart, Garage switching | DONE | `markRange` bounds pending ranges to one per attribute even when not rendered (tests assert `updateRanges.length ≤ 1` over skipped frames); reset clears spans and uploads zero alpha (`src/effects-particle-pool.js`, `src/aero-vfx.js:153-154`); Garage stage disposes its aero geometry/materials (`src/garage-stage.ts:185`). Physical-device soak: UNVERIFIED (SOP below). |

## Wiring needs (files outside this workstream)

- `src/world.js:727-728` builds `{ ...effectsVisual, worldPoint: (s,x,y,origin,item) => … }` and a new closure every
  frame, and `worldPoint` returns a new array per particle placement. Suggest hoisting the visual object (mutate its
  fields per frame) and an out-parameter `worldPoint(s, x, y, origin, item, out)`; `effects.js` can accept both.
- Optional follow-up (owned, not done): the race-pool span becomes conservative (the whole ring) once the emission
  cursor wraps, which is why multi-car-flight and pickups-impacts still upload 23–27 KB/frame. A two-range circular span
  would cut this further; it needs its own equivalence test.

## Not measured / UNVERIFIED

- GPU time, power and thermals on iPhone / Mac hardware: UNVERIFIED. Manual SOP: build `pnpm run build`, serve `dist/`,
  open `/?perf=deep&seed=12345` on the device for the base and this branch, race Coast with BOOST/Nitro for 10 min each
  at the same brightness and charge state, export `JSON.parse(document.getElementById('perf-overlay').dataset.deep)`
  every 2 min, and compare `gpuFrameMs`, `cpuRenderSubmissionMs`, `actualFps` and device temperature. Store raw output
  under `docs/performance/local/` only.
