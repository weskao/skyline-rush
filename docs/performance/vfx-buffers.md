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
| 12 | No accumulation across FPS, pause, restart, Garage switching | DONE | `markRange` bounds pending ranges per attribute even when not rendered (one in Wave 1, ≤ 2 since the Stage A two-range span; tests assert the bound over skipped frames); reset clears spans and uploads zero alpha (`src/effects-particle-pool.js`, `src/aero-vfx.js:153-154`); Garage stage disposes its aero geometry/materials (`src/garage-stage.ts:185`). Physical-device soak: UNVERIFIED (SOP below). |

## Wiring needs (files outside this workstream)

- **DONE (Stage A 90a)** — `src/world.js:727-728` built `{ ...effectsVisual, worldPoint: (s,x,y,origin,item) => … }`
  and closures every frame, and `worldPoint` returned a new array per particle placement.
  - Now `src/world.js:363-364` hoists `classicEffects` / `framedEffects` (refreshed in place, `:726-728`) and the
    `graphPoint` / `graphFrame` closures.
  - The contract is `worldPoint(s, x, y, origin, item, out)`: it may write into `out` and return it, and callers use
    the return value, so test stubs that return fresh arrays still work.
  - Writers: `classicPosition` (`src/world.js:73`), `trackLocalPosition` (`src/track-paths.ts:72`) and
    `courseItemPoint` (`src/course-items.ts:121`).
  - Callers pass one scratch array each: `src/effects.js:62` (marker, particles, rings, magnet) and
    `src/pickup-collect-vfx.js:86`.
  - Observed RED: `node --test tests/world-point-out.test.js` failed 3/3 on the old source (`out` not written:
    `[0.977…] !== [7,7,7]`; effects never passed an `out`; world.js call still spread `effectsVisual`).
  - Equivalence: `tests/world-point-out.test.js` (seeded Tokyo, 160 frames) gives identical particle, ring and marker
    positions every frame through an allocating vs an out-param `worldPoint`.
  - Measurement, **LOCAL-NODE** (Node 24, no WebGL; `--max-semi-space-size=1024 --expose-gc`, heap bytes allocated
    by `effects.update` with world.js-style options; seeded, 3 rivals, boost/nitro/landing/magnet script, 600 frames
    after 120 warm-up; 3 interleaved runs each, host load ~9–15):

    | Track | worldPoint calls/frame | Heap B/frame before | after | Position digest |
    |---|---|---|---|---|
    | Tokyo (framed) | 197.3 | 16 209 / 17 959 / 18 031 | 3 308 / 3 063 / 3 066 | `ba00e8b5` = |
    | Sky Spiral | 214.9 | 23 853 / 27 767 / 24 862 | 10 184 / 10 291 / 11 050 | `87061f7e` = |

    CPU ms/frame (Tokyo 0.12–0.21 → 0.12–0.13, Spiral 0.29–0.44 → 0.29) overlaps across runs on a loaded host:
    no CPU-time gain is claimed, only fewer allocations (less GC pressure). The remaining allocations are
    `trackFrame`/`trackPoint` objects inside `trackLocalPosition`, left as-is.
- Two-range circular span: DONE in Stage A 90c (section below).

## Stage A 90c — two-range circular live span

| Item | Status | Where |
|---|---|---|
| Once the emission cursor wraps, the span is `[first,last]` minus its widest dead hole, so a wrapped ring uploads `[0,wrapEnd)` + `[start,end)` (one `addUpdateRange` each per attribute) instead of the whole ring. Callers iterate `i = span.next(i)` (skips the hole), report `span.live(i)`, then `span.commit()` | DONE | `src/effects-particle-upload.js:27`; race pool `src/effects.js:293`, `:338`; ribbon `src/aero-vfx.js:343`, `:355`; wake `:357`, `:371` |
| `markRange` keeps ≤ 2 pending ranges per attribute (widens an overlapping/adjacent one, else the nearer one) so skipped renders stay bounded | DONE | `src/effects-particle-upload.js:5` |
| Holes narrower than `capacity/8` slots are rewritten instead (an extra `bufferSubData` per attribute is not worth a few bytes) | DONE | `src/effects-particle-upload.js:29` |
| Draw range stays one contiguous `[first live, last live]` (one draw call, slot order = draw order); dead slots in it stay alpha 0 and are vertex-clipped | unchanged | — |

three r186 does **not** merge the two ranges: `WebGLAttributes.updateBuffer` sorts and merges only overlapping or
adjacent (`start <= prevEnd + 1`) ranges, then issues one `bufferSubData` per remaining range
(`node_modules/three/src/renderers/webgl/WebGLAttributes.js`). So the bytes saved are real.

Equivalence: `tests/helpers/gpu-upload-shadow.js` now runs three's own `WebGLAttributes` against a recording fake GL
(every `bufferSubData` copied into a shadow buffer) instead of a re-implementation of its rule; the bench uses the
same helper and also counts `bufferSubData` calls. `tests/effects-particle-upload.test.js`: a hand-built wrapped ring
uploads exactly its 6 live slots in 2 ranges per attribute; a seeded 600-frame ring run (bursts + trickle, skipped
renders) keeps every drawn slot on the GPU equal to the CPU state (= a full upload) and GPU-drawn ⇔ CPU alpha > 0 on
every frame, and wrapped frames upload < 75 % of the ring.

Observed RED: `node --test tests/effects-particle-upload.test.js` → `TypeError: span.next is not a function` /
`span.live is not a function`; the same wrapped-ring scenario on the old linear span uploaded 256 B instead of 96 B.

### Before / after — environment `node-cpu-no-webgl` (LOCAL-NODE)

`node scripts/vfx-buffer-bench.mjs --frames=600 --runs=1`, before = `7cc2cad7` source with the new real-three
upload helper (bytes and digests identical to table A), after = this change. Bytes and digests are deterministic.

| Scenario | Upload B/frame | bufferSubData calls/frame | Digest |
|---|---|---|---|
| driving | 4494 → 4494 | 8.8 → 8.8 | 811c9dc5 = |
| boost | 16316 → 14286 (−12 %) | 14.1 → 15.1 | bf907674 = |
| nitro | 16369 → 14472 (−12 %) | 20.3 → 21.2 | 7d929039 = |
| drift-chain | 9627 → 7686 (−20 %) | 17.7 → 18.2 | a132057d = |
| multi-car-flight | 26772 → 26772 | 14.6 → 14.6 | 89c44c1e = |
| pickups-impacts | 23815 → 20208 (−15 %) | 14.8 → 18.3 | 47cb20f2 = |
| garage-preview | 14117 → 11321 (−20 %) | 20.0 → 21.2 | ea4579f8 = |
| launch-countdown | 4187 → 4187 | 8.2 → 8.2 | 811c9dc5 = |
| idle-after-burst | 5000 → 5000 | 9.1 → 9.1 | e330ef77 = |

- multi-car-flight is unchanged because its race pool never wraps: a probe of the pool alpha every 60 frames showed
  480 live slots packed in `[0, 479]` with no interior gap, so its ~23 KB is live data, not a wrapped ring (the Wave 1
  note attributing it to wrapping was wrong for this scenario).
- Call-count trade-off, environment `headless-chromium-playwright` on a loaded shared host: 6 race-pool attributes,
  400 frames × 7 runs (median), `gl.finish()` per frame, whole ring (6 calls, 47 616 B) vs wrapped two arcs (12 calls,
  23 616 B). SwiftShader: 0.0030 / 0.0030 / 0.0030 ms whole vs 0.0055 / 0.0030 / 0.0038 ms split; ANGLE Metal
  (Apple M4): 0.0070 / 0.0035 / 0.0040 ms whole vs 0.0035 / 0.0030 / 0.0028 ms split (one more pair, whole value lost
  to output truncation, gave split 0.0033 SwiftShader / 0.0060 Metal). All at timer resolution (a few
  µs): no measurable CPU submit cost either way, so the upload-byte reduction is the claimed win. GPU time, iPhone/Mac
  power and thermals: UNVERIFIED (SOP above).

## Not measured / UNVERIFIED

- GPU time, power and thermals on iPhone / Mac hardware: UNVERIFIED. Manual SOP: build `pnpm run build`, serve `dist/`,
  open `/?perf=deep&seed=12345` on the device for the base and this branch, race Coast with BOOST/Nitro for 10 min each
  at the same brightness and charge state, export `JSON.parse(document.getElementById('perf-overlay').dataset.deep)`
  every 2 min, and compare `gpuFrameMs`, `cpuRenderSubmissionMs`, `actualFps` and device temperature. Store raw output
  under `docs/performance/local/` only.
