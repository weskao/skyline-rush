# Thermal baseline and Wave 1 handoff

Scope: measurement only; no change to selected graphics fidelity or fixed 60 Hz physics.
Base: d9c144ba39546378cdae32f76ae305fee1f9305f.

## Existing system and diagnostic entry points

- `src/perf.ts`, `src/perf-overlay.ts`: 20 s racing presentation interval, nearest-rank p50/p95 and FPS; car triangle attribution. Legacy strip remains compatible.
- `src/performance-evidence.ts`, `scripts/verify-performance-evidence.mjs`: existing software WebGL gates; retain their historical budgets.
- `src/frame-pacing.ts`: Auto can choose 0.85 scale and 30/60/90/120 FPS. Keep behavior unchanged in this branch. Fixed target for comparisons.
- `src/render-resolution.ts`: High caps DPR at 1.5 before adaptive scale; scene MSAA 4 (Low 2); canvas MSAA disabled. Measure actual render target, not advertised screen resolution.
- `src/world.js`: composer scene/bloom/lens/output; renderer.info aggregates draws including passes, excluding shader warmup. Counts are not bytes or GPU time.
- `scripts/perf.mjs`: desktop comparisons/phone serving; `scripts/course-race-bench.mjs`: CPU-only Coast/Dune eight-car benchmark; `scripts/frostbite-scene-cost.mjs`: CPU scene build and visible mesh estimates, not actual GPU draws.

Use `?perf` for legacy measurements and `?perf=deep&seed=12345` for extended measurements. Seed pins pickup layout only; it is not a claim that all browser inputs/camera/time are deterministic.
Read/export in DevTools: `JSON.parse(document.getElementById('perf-overlay').dataset.deep)`.
Schema v1 contains phase/track, current GPU status, metric count/p50/p95/p99/mean in ms,
actual FPS, configuration, mixedConfig flag, resource/draw counts and stall count.
CPU simulation covers the fixed-step block including input, tutorial and telemetry; CPU submission
covers world.render and scene preparation, not GPU completion. GPU full composer and individual
passes alternate on sampled frames (every 15 presentations); individual bloom subpasses and
warmup/snapshot draws are not included. Timing is asynchronous and delayed samples retain their
original scenario. No samples = absent/null; GPU status does not imply valid samples.
Each phase/track retains its latest visit report, with up to 20 seconds of recent samples.
Counts are the latest presented frame, not a percentile or memory byte estimate.
For long sessions export periodic snapshots externally; do not equate a final 20 s window with the entire soak.
Reject mixedConfig for controlled comparisons. Source is unclassified until operator verifies backend.
Deep mode is intentionally more expensive than ordinary gameplay; compare instrumented with
instrumented and repeat with diagnostics off for thermal validation.

## Reproducible matrix

Derive playable IDs from RACE_TRACKS, COURSE_TRACKS, and CIRCUIT_ID; use unlocked dev only for
gated tracks. Include all six UPCOMING_TRACKS as Home 3D showcase, not as released races.
Priority: Volcanic Crown, Taipei and Tokyo; then all other IDs. For each track record high quality
Home, Countdown, Racing, Paused, Results, Garage, Photo (where applicable). Mark unavailable phases
explicitly rather than treating them as passes. Record initial asset warmup separately.
Use fixed seed 12345, same car, skins/VFX, mode, input replay and camera route; record exact route
segments, distance/time, orientation and FPS preference. Use fixed 60 FPS for matched comparison,
then repeat existing Auto separately. Never teleport and call it continuous driving.
For a fixed-step scene probe, run `node scripts/thermal-baseline.mjs volcanic-crown taipei tokyo`
(or omit IDs for the complete matrix). Uses real WebGL on the Vite dev fixture, fixed seed 12345,
60 simulation warmup ticks, fixed throttle/boost/steer input, fixed camera time and 180 measured ticks.
Configure THERMAL_FRAMES, THERMAL_VIEWPORT and THERMAL_DPR. This probe is not production
frame pacing, not a full race and not a physical-device thermal result. Its fixed step can run slower
than real time. Record starting/ending distance and drawn count; do not compare mismatched paths.
The full-regression Playwright suite now runs every registry scenario at 32 measured ticks using the same
fixture and validation as the CLI. Missing draws, stationary driving, missing CPU/frame evidence or mixed
configuration fail rather than being treated as successful. CI-only records are named
`render-performance-thermal-*.json` for the existing shard artifact upload. GPU unavailability is explicit,
not a reason to manufacture timing samples. These short smoke records are not the 180-tick comparison.
The app browser suite also checks the seven phase transitions (Results uses a seeded finish solely for UI state).
For the real application use 3 alternating before/after rounds, same warmup and 20 s measured window.
A dev-only actual-app replay now drives 180 fixed 60 Hz simulation ticks twice through main.js, with the same
seed and tick-indexed inputs, the real chase-camera renderer, and a one-draw-per-tick test hook. It compares
simulation state exactly and camera samples with a documented sub-metre tolerance. It is a deterministic
opening-segment check, not a full-length race replay or production frame-pacing benchmark. Longer route
segments and full-race comparisons remain separate acceptance evidence. Capture input trace and camera route.
Run existing CPU/scene scripts separately, retain their provenance. Test desktop, portrait and landscape.

## Wave 1 shared interfaces (Before/After contract)

Wave 1 branches never edit `src/deep-perf.ts`, `src/gpu-timer.ts` or the thermal scripts; they call them.
Every number carries its environment label (see Evidence classes) and its before/after SHAs.

| Need | Call | Output |
| --- | --- | --- |
| Live app numbers | open the build with `?perf=deep&seed=12345`; read `JSON.parse(document.getElementById('perf-overlay').dataset.deep)` | schema v1: `reports["<phase>/<track>"].metrics.{frameIntervalMs,cpuSimulationMs,cpuRenderSubmissionMs,gpuFrameMs,scene,bloom,lens,output}` each `{count,p50,p95,p99,mean}`, `.load`, `.config`, `.mixedConfig`, `.stalls`, `gpuStatus` |
| Instrument a new code path | inside `world.js` code use `world.deepPerf?.` (null in production). Outside it `createDeepPerf(location.search, renderer, composer, () => quality)` returns `null` unless `?perf=deep` | no allocation, listener or timer query when null |
| Time a GPU section | `createGpuTimer(gl).measure(cb, draw)`; `poll()` once per frame; `status` is `available`, `unsupported`, `disjoint` or `context-lost` | async `EXT_disjoint_timer_query_webgl2`; never a sync readback; unavailable is not 0 |
| Fixed-step scene matrix | `node scripts/thermal-baseline.mjs [track-id ...]` with `THERMAL_FRAMES`, `THERMAL_VIEWPORT`, `THERMAL_DPR` | `docs/performance/local/<sha>-<w>x<h>-<time>.json` (ignored, local only) |
| Validate a record | `validateThermalRecord` in `scripts/thermal-report.mjs` | throws on empty draws, stationary driving, missing CPU evidence, mixed config |
| Before/After table | `node scripts/thermal-compare.mjs <before.json> <after.json>` | Markdown rows (p50/p95, draw calls, triangles); refuses runs whose frames, viewport, DPR, harness or source differ; skips scenarios with unequal render config |
| CPU-only simulation | `node --experimental-strip-types --expose-gc scripts/course-race-bench.mjs` | separate provenance; not GPU or frame time |
| Real app build/CPU throttle | `node scripts/perf.mjs desktop --base <ref>` | alternating-round frame times from the `?perf` strip |

Procedure for one Wave 1 change:

1. In the Wave 1 worktree run the baseline probe at the matrix and settings of the committed baseline
   (`docs/performance/baseline/`: 390x844, DPR 3, 180 ticks, seed 12345, High) on the merge-base commit, then on the change.
   Run each side at least 3 times alternating (A B A B A B) on an otherwise idle machine and compare medians of the runs.
2. `node scripts/thermal-compare.mjs <before.json> <after.json>`; paste the rows into a copy of the
   [report template](report-template.md) and fill the Evidence source line.
3. A change is adopted only with a measured benefit and an unchanged selected graphics fidelity. No benefit or
   unproven visual equivalence: record it as rejected, with the reason, in `docs/performance/<topic>.md`.
4. Wave 1 owns its own `docs/performance/<topic>.md`; wiring needed in a file another branch owns is written there for integration.

### Evidence classes

Every row and every report names exactly one class. Anything unclassified is `unverified`.

| Class | Meaning | May claim |
| --- | --- | --- |
| `software-webgl-ci` | SwiftShader/CPU WebGL on the CI runner | counts and relative CPU work; never real GPU time |
| `local-chromium` | Chromium via Playwright on the author machine; GPU backend unverified unless `chrome://gpu` or `WEBGL_debug_renderer_info` was checked and recorded | relative comparison on this machine only |
| `physical-gpu` | operator-verified real GPU/device | frame and GPU time for that device class |
| `estimate` | derived, not measured; label the formula | nothing about hardware improvement |
| `unverified` | not run or not measurable here (iPhone temperature, power, thermal state, fan noise) | nothing; keep the manual SOP |

Draw calls and triangles are renderer counters, not bytes or GPU time. CPU submission is not GPU time.

## Physical device soak

Use make phone or make phone-diag; open the branch build on iPhone 16 Pro Safari/Chrome and
Mac mini M4 Chrome. Verify commit, high quality, selected car, fixed FPS, render target and MSAA.
Keep ambient conditions, brightness, power/charging, case, battery mode, browser and background
apps consistent; allow devices to cool to comparable starting conditions. Do not record identifiers.
Run real continuous driving on priority tracks, repeat races as needed, and record transitions.
Run one continuous session per duration (5, 15 and 30 min; the 30 min run is the soak, the shorter ones can be
checkpoints of it). Before each: same commit, High, fixed 60 FPS, cold start, same track and car. At 0/5/15/30 min
export deep snapshots (or inspect legacy strip; the 20 s window is not the whole soak), visual capture and
subjective warmth/fan observation (a written note, never a number). Repeat once with `?perf` absent (diagnostics off)
to see whether the diagnostics themselves change warmth. A skipped duration is written `unverified`, not 0.
Record actual FPS, frame/CPU/GPU p50/p95/p99, GPU coverage, stalls, draw/triangle/resource counts and
any visible regressions. Repeat without instrumentation. Stop if OS warns or device becomes
uncomfortably hot; no requirement to continue an unsafe run. iPhone web APIs do not provide
trustworthy device temperature, power or native thermal status; record unavailable.
Mac pmset warning, if actually available, is a warning level, not temperature. Android adb sensors
are platform-specific and not a substitute for iPhone. Never publish raw personal logs,
device serials, local addresses, URLs with credentials, account names or personal filesystem paths.
All device-specific reports and raw probe output live only under the ignored `docs/performance/local/`.
Verify with `git check-ignore -v docs/performance/local/example.json`; never force-add. Follow
`docs/designs/3d-pipeline/phase0-multi-device-acceptance.md` for device evidence privacy.

## Acceptance / current status

Program result (A d9c144ba vs B develop vs C integration, LOCAL-CHROME, visual gate, device SOP):
[final-report.md](final-report.md).

No physical GPU or temperature measured for this branch at authoring. Existing historical numbers
in src/performance-evidence.ts are software WebGL counters, not current measurements.
Use [report template](report-template.md). Keep full regression gate unchanged.
Wave 1 consumers: createDeepPerf, createGpuTimer, existing inspectRenderLoad/inspectPrograms,
frame-pacing target/scale, legacy evidence parser, and the versioned data-deep JSON export.
Record new measurements, limitations and follow-up in this directory; do not claim baseline complete
until fixed-step probe, full-app replay, automated visual regression and exact-HEAD CI are verified.

### Owner acceptance decision (2026-11-26)

The owner explicitly accepts the manual/physical-device acceptance items for Wave 0 as passed by waiver.
This is permission to proceed without manual sign-off, not measured physical-device evidence.
The 5/15/30 minute physical soak, manual visual inspection and physical GPU/profiler overhead measurements
remain unmeasured; do not assign them numeric results or claim hardware improvements. Automated regression,
fixed-step matrix and replay checks remain required. Future Wave 1 comparisons must distinguish CI/software
WebGL from actual devices and report missing data explicitly.
