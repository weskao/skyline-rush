# Perf-thermal program: final performance report

Scope: measurement and evidence only. No `src/` change was made for this report; graphics, simulation and tests are
untouched. Every number below is labelled with the environment it came from. Unavailable is written `n/a` or
`UNVERIFIED`, never 0.

| Label | Commit | What it is |
| --- | --- | --- |
| A | `d9c144ba39546378cdae32f76ae305fee1f9305f` | original develop base of the program |
| B | `32b82da7` | latest `origin/develop` at integration time (control: develop work that is not part of this program) |
| C | `1fcfa98a` | integration head `feature/perf-thermal-90-integration` (Stage A + branch 11 rain fix + Wave 2 frame lifecycle + B) |

Raw comparison data: [`final-report/comparison.json`](final-report/comparison.json) (every per-round value, medians,
min/max). Charts are generated from it by `scripts/final-report/build-report.mjs`.

## Environment

- **LOCAL-CHROME** (evidence class `local-chromium`): Playwright 1.64.1 driving Google Chrome (channel `chrome`) on an
  Apple M4 Mac mini (Mac16,10, 10 cores, 32 GB), macOS 27.2, Node 24.19. WebGL renderer reported by
  `WEBGL_debug_renderer_info`: ANGLE (Apple, ANGLE Metal Renderer: Apple M4, Unspecified Version).
- **Concurrent load:** the machine was shared with up to five other agent sessions running builds and browser
  tests. Load average during the timing runs was 60-108 (1-minute average; up to 241 during the course bench) on 10 cores. This is the dominant noise source;
  it is why every timing number is the median of interleaved rounds with its min-max spread, and why small timing
  deltas are not claimed.
- This is the same hardware class as the "Mac mini M4" acceptance device, but **not** that acceptance run:
  the machine was not idle, the browser was automated, and no thermal, power or 30-minute data was taken.
- Fixture settings (all timing and counter runs): 390x844 CSS px, device DPR 3, quality High, render DPR 1.5
  (585x1266), scene MSAA 4, 60 FPS target, seed 12345, fixed throttle+boost input, 60 warm-up ticks, fixed camera
  time, 900 measured frames. Identical render configuration on A, B and C (`mixedConfig` false).

## Method

| Data | Harness | Builds | Rounds |
| --- | --- | --- | --- |
| GPU frame and pass time, CPU submission, CPU simulation, frame interval | `scripts/thermal-baseline.mjs` (`?perf=deep` fixture) via `scripts/final-report/run-scene-matrix.mjs`, `THERMAL_FRAMES=900` | A, B, C | 3, order rotated each round (ABC, BCA, CAB) |
| Draw calls, triangles, geometries, textures, programs | same fixture, all tracks, 180 frames | A, B, C | 1 (deterministic counters) |
| Particle buffer upload | `scripts/vfx-buffer-bench.mjs --frames=600 --json` (node, no WebGL) | A, B, C | 1 (deterministic byte counts) |
| Real app: load, FPS, stutter, draws, uploads, idle renders, heap | `scripts/final-report/app-probe.mjs` on each production build (`vite preview`) | A, B, C | 3, order rotated |
| CPU simulation, full 8-car race | `scripts/course-race-bench.mjs` (node, `--expose-gc`) | A, B, C | 3, order rotated |
| Visual fidelity | `scripts/final-report/visual-fidelity.mjs` | A vs C (+ C vs C floor) | 1 per scene |
| 5/15-minute sustained | reused from [frame-lifecycle.md](frame-lifecycle.md) (soak spec) | 1520b8ba vs branch 20 | 1 each |

A and B predate the opt-in `?perf=deep` diagnostics. Their temporary checkouts were given a **measurement-only
overlay** (`scripts/final-report/overlay-probe.mjs`): it copies this tree's diagnostics and bench scripts and wires
`createDeepPerf` into `world.js` exactly as Wave 0 did (5 anchored edits; null and untouched without `?perf=deep`).
No pass, material, geometry or simulation code changes. A and B draw four composer passes (scene, bloom, lens,
output); C draws three, because the lens pass now does tone mapping and sRGB output itself
([gpu-pipeline.md](gpu-pipeline.md)). On A/B the fourth pass is reported as `output`.

The deep GPU timer samples the whole composer every 30th frame and each pass every 30th frame (offset), so 900
frames give about 29 GPU-frame samples and 30 per pass per run. GPU p99 of 29 samples is close to the maximum and is
shown for completeness only.

Known limitation: the `spiral` track cannot be measured on A and B; the fixture throws
`Cannot read properties of undefined (reading 'dispose')` in `world.dispose` (fixed in Wave 0, 9d3c2e69). Its rows
are C only.

The per-pass GPU samples are separate timer queries. They overlap in the GPU queue, so they are not additive (their sum
is larger than the whole-frame sample). Compare a pass only with the same pass on another build.

## Result against the program targets

![Target progress, C vs A](final-report/targets.svg)

| Target | Goal | Measured, C vs A (median of scenes, LOCAL-CHROME) | Status |
| --- | --- | --- | --- |
| GPU frame time | -30% | -15% (per scene -12% to -19%) | not met |
| CPU render submission | -25% | 0% (per scene -36% to +12%, within noise) | not met |
| Draw calls, complex scenes | -40% | -1.6% (per scene -0.2% to -27%) | not met |
| Particle upload | -50% | -81% (per scenario -54% to -93%) | **met** |

Definitions (fixed before the data was read, in `scripts/final-report/build-report.mjs`): GPU and CPU use the five
racing scenes (coast, neon, taipei, tokyo, volcanic-crown), `gpuFrameMs.p50` and `cpuRenderSubmissionMs.p50`, the
median of the three rounds per scene, then the median of the per-scene changes. "Complex scenes" are the six
non-showcase scenes with the highest draw count on A. Particle upload is `uploadBytesPerFrame` over the nine
`vfx-buffer-bench` rows.

What the numbers say, honestly:

- **GPU frame -30%: not met.** Racing GPU frame p50 fell 12-19% on every racing scene, and 9-30% on Home; B is within noise of A, so the gain is from this program. Almost all of it is the post chain: the lens pass now writes the
  final sRGB output, so the separate `OutputPass` (a full-screen HalfFloat read and write) is gone, and the lens
  pass itself is cheaper (single-sample target, see [gpu-pipeline.md](gpu-pipeline.md)). Scene and bloom pass times
  are unchanged within noise, because their fidelity (4x MSAA scene target, 5-mip bloom) was deliberately kept. The
  remaining 30% would have to come from those two passes, which means a visual change. On a tile-based mobile GPU
  the removed full-screen pass is likely worth more than on this desktop-class GPU, but that is UNVERIFIED.
- **CPU render submission -25%: not met.** The median change is 0%. The submission time is dominated by Three.js traversal and
  per-object uniform upload, and the per-scene results go both ways with round-to-round spread larger than the
  change (for example taipei +12%, volcanic-crown -36%). Under the concurrent load of this machine no CPU
  submission change can be claimed in either direction.
- **Draw calls -40% on complex scenes: not met.** The median of the six heaviest scenes is -1.6%. The static-mesh merge of workstream 11
  ([scene-streaming.md](scene-streaming.md)) cut the two landmark-heavy tracks: Taipei racing 623 to 478 (-23%),
  Taipei home 471 to 345 (-27%), Tokyo home 305 to 248 (-19%), Monsoon racing 366 to 266 (-27%). The other
  heavy scenes (Alpine, Coastal, Aurora) are already dominated by distinct materials, transparent, animated or
  render-ordered meshes, which `canBatch` must exclude to keep the picture identical, so they changed by 1-3 draws.
- **Particle upload -50%: met.** Median -81%, every scenario at least -54%. The real app agrees: race bufferSubData falls from 66.6 KB to 29.5 KB per frame (-56%), Home from 4.5 to 2.4 MB/s. Particle buffers now upload only the live range
  ([vfx-buffers.md](vfx-buffers.md)); the simulation digests of A, B and C are identical in every row, so the same
  particles are drawn.

![GPU frame p50 per racing scene](final-report/gpu-frame-p50.svg)

![CPU render submission p50 per racing scene](final-report/cpu-render-p50.svg)

![Draw calls in the most complex scenes](final-report/draw-calls.svg)

![Particle upload bytes per frame](final-report/particle-upload.svg)

<!-- tables:start -->
## Data tables (LOCAL-CHROME unless noted)

Generated by `build-report.mjs` from `final-report/comparison.json`. Medians of rotated rounds with (min-max).

### GPU and CPU timing (median (min-max) of rounds, ms)

| Scene | Build | GPU frame p50 | GPU frame p95 | GPU p99 | CPU submit p50 | CPU submit p95 | CPU sim p50 | CPU sim p95 | GPU samples |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| home/coast | A | 6.29 (5.97-6.42) | 9.26 (6.67-9.48) | 9.78 | 2.60 (2.20-3.70) | 5.00 (4.80-5.40) | 0.00 | 0.00 | 29 |
|  | B | 5.92 (5.87-6.69) | 8.33 (6.78-9.32) | 8.93 | 2.80 (2.20-3.50) | 5.10 (4.80-5.20) | 0.00 | 0.00 | 29 |
|  | C | 5.12 (4.98-5.36) | 6.72 (5.82-6.89) | 7.13 | 3.90 (2.10-4.30) | 5.20 (4.70-5.40) | 0.00 | 0.00 | 29 |
| home/neon | A | 6.30 (6.08-7.14) | 7.55 (7.00-8.87) | 9.18 | 3.10 (2.50-4.80) | 6.50 (6.00-7.00) | 0.00 | 0.00 | 29 |
|  | B | 6.63 (6.48-6.96) | 9.41 (9.31-9.53) | 10.17 | 4.40 (3.40-4.70) | 7.00 (6.50-7.10) | 0.00 | 0.00 | 29 |
|  | C | 5.74 (5.58-5.75) | 6.79 (6.24-7.48) | 8.58 | 3.40 (2.40-4.00) | 5.90 (5.70-6.50) | 0.00 | 0.00 | 29 |
| home/taipei | A | 6.55 (5.56-9.73) | 14.89 (7.65-15.05) | 15.03 | 6.20 (4.50-6.50) | 9.20 (7.10-9.90) | 0.00 | 0.00 | 29 |
|  | B | 5.53 (5.50-10.48) | 7.59 (6.03-13.29) | 10.74 | 5.80 (5.00-6.00) | 7.50 (7.30-8.20) | 0.00 | 0.00 | 29 |
|  | C | 4.58 (4.37-5.11) | 5.11 (4.95-7.40) | 5.67 | 4.60 (2.70-4.90) | 6.80 (6.40-6.90) | 0.00 | 0.00 | 29 |
| home/tokyo | A | 5.48 (5.14-6.81) | 10.09 (7.48-10.26) | 10.73 | 4.00 (2.60-4.50) | 6.60 (6.60-7.00) | 0.00 | 0.00 | 29 |
|  | B | 5.52 (5.33-11.64) | 7.08 (5.98-20.41) | 7.16 | 4.10 (3.60-5.70) | 6.60 (6.50-8.80) | 0.00 | 0.00 | 29 |
|  | C | 4.58 (4.47-4.64) | 6.39 (5.01-8.01) | 7.56 | 3.50 (3.40-4.50) | 6.10 (6.10-7.00) | 0.00 | 0.00 | 29 |
| home/volcanic-crown | A | 6.16 (5.39-6.54) | 8.07 (7.00-8.36) | 8.17 | 2.90 (2.60-3.00) | 5.80 (5.60-5.90) | 0.00 | 0.00 | 29 |
|  | B | 6.12 (5.86-6.40) | 7.67 (6.66-8.71) | 8.06 | 2.70 (2.50-2.90) | 5.70 (5.60-5.70) | 0.00 | 0.00 | 29 |
|  | C | 5.21 (5.10-5.27) | 7.44 (5.99-8.43) | 7.65 | 3.00 (2.10-3.60) | 5.30 (4.40-5.60) | 0.00 | 0.00 | 29 |
| racing/coast | A | 6.40 (6.32-7.37) | 8.61 (8.16-8.90) | 9.86 | 3.20 (2.10-4.00) | 5.60 (4.90-6.00) | 0.20 | 0.30 | 29 |
|  | B | 6.46 (6.17-7.06) | 8.65 (8.10-9.55) | 9.79 | 3.20 (2.70-4.40) | 5.80 (5.60-6.40) | 0.20 | 0.30 | 29 |
|  | C | 5.44 (5.26-6.01) | 6.86 (6.42-7.17) | 9.35 | 3.20 (2.10-3.70) | 5.20 (4.60-5.60) | 0.20 | 0.40 | 29 |
| racing/neon | A | 6.59 (6.31-7.35) | 8.17 (7.54-10.18) | 8.74 | 3.50 (2.30-4.80) | 6.70 (5.50-8.30) | 0.20 | 0.40 | 29 |
|  | B | 6.74 (6.31-6.86) | 10.31 (7.26-10.83) | 10.63 | 4.20 (3.90-6.80) | 7.70 (6.90-9.30) | 0.20 | 0.50 | 29 |
|  | C | 5.51 (5.42-5.89) | 6.36 (6.32-7.30) | 6.46 | 3.50 (2.70-4.70) | 6.70 (6.10-7.10) | 0.20 | 0.40 | 29 |
| racing/taipei | A | 6.16 (5.83-6.39) | 9.18 (7.22-10.54) | 10.64 | 5.20 (3.10-6.60) | 9.00 (7.60-9.90) | 0.20 | 0.30 | 29 |
|  | B | 6.10 (5.96-6.44) | 7.53 (7.39-14.70) | 8.24 | 6.60 (6.00-6.70) | 9.60 (9.40-9.90) | 0.20 | 0.40 | 29 |
|  | C | 5.25 (5.08-5.43) | 7.65 (6.26-9.32) | 9.77 | 5.80 (5.10-6.00) | 8.60 (8.60-9.10) | 0.20 | 0.40 | 29 |
| racing/tokyo | A | 5.97 (5.79-6.07) | 9.63 (7.10-9.94) | 9.68 | 5.50 (2.80-6.10) | 8.70 (6.40-8.80) | 0.20 | 0.40 | 29 |
|  | B | 6.10 (5.90-6.13) | 8.75 (6.94-17.96) | 9.86 | 6.10 (5.70-7.10) | 8.70 (8.50-10.70) | 0.20 | 0.40 | 29 |
|  | C | 4.82 (4.72-5.46) | 6.76 (6.13-8.41) | 7.09 | 4.20 (3.70-5.50) | 7.40 (7.30-8.50) | 0.20 | 0.40 | 29 |
| racing/volcanic-crown | A | 6.18 (5.92-6.57) | 8.67 (7.77-9.22) | 9.77 | 4.50 (3.50-5.10) | 6.50 (6.40-6.90) | 0.10 | 0.30 | 29 |
|  | B | 6.20 (6.04-7.33) | 8.16 (7.67-10.26) | 8.56 | 3.20 (2.90-5.10) | 6.40 (6.20-6.70) | 0.10 | 0.30 | 29 |
|  | C | 5.41 (5.30-5.48) | 6.03 (5.86-6.27) | 6.65 | 2.90 (2.40-4.50) | 6.20 (5.60-6.20) | 0.10 | 0.30 | 29 |
| showcase/volcanic-crown | A | 4.94 (4.53-5.03) | 8.80 (6.78-9.05) | 13.69 | 0.80 (0.80-1.30) | 1.80 (1.70-2.00) | 0.00 | 0.00 | 29 |
|  | B | 4.98 (4.92-5.04) | 5.88 (5.46-8.70) | 7.85 | 1.00 (0.90-1.20) | 1.80 (1.80-1.80) | 0.00 | 0.00 | 29 |
|  | C | 4.05 (4.01-4.30) | 5.20 (4.34-5.76) | 5.76 | 0.80 (0.70-0.90) | 1.60 (1.60-1.80) | 0.00 | 0.00 | 29 |

### GPU pass breakdown p50 (ms, A / B / C; output pass exists on A/B only)

| Scene | scene | bloom | lens | output | passes |
| --- | --- | --- | --- | --- | --- |
| home/coast | 2.11 / 2.15 / 2.28 | 2.85 / 3.00 / 2.94 | 3.36 / 3.57 / 2.77 | 3.47 / 3.64 / n/a | 4 / 4 / 3 |
| home/neon | 2.28 / 2.43 / 2.39 | 2.98 / 3.14 / 3.04 | 3.56 / 3.63 / 2.96 | 3.59 / 3.58 / n/a | 4 / 4 / 3 |
| home/taipei | 1.82 / 1.77 / 1.73 | 3.35 / 2.69 / 2.79 | 3.19 / 3.14 / 2.34 | 3.25 / 3.21 / n/a | 4 / 4 / 3 |
| home/tokyo | 1.70 / 1.74 / 1.71 | 2.72 / 2.82 / 2.74 | 3.15 / 3.08 / 2.33 | 3.24 / 3.17 / n/a | 4 / 4 / 3 |
| home/volcanic-crown | 1.99 / 1.98 / 1.96 | 3.07 / 3.12 / 3.07 | 3.34 / 3.37 / 2.66 | 3.53 / 3.39 / n/a | 4 / 4 / 3 |
| racing/coast | 2.33 / 2.28 / 2.41 | 3.09 / 3.11 / 3.12 | 3.59 / 3.44 / 2.97 | 3.60 / 3.47 / n/a | 4 / 4 / 3 |
| racing/neon | 2.41 / 2.37 / 2.43 | 3.08 / 3.07 / 3.09 | 3.58 / 3.53 / 2.79 | 3.64 / 3.61 / n/a | 4 / 4 / 3 |
| racing/taipei | 2.17 / 2.17 / 2.17 | 3.03 / 2.79 / 2.93 | 3.22 / 3.11 / 2.52 | 3.27 / 3.20 / n/a | 4 / 4 / 3 |
| racing/tokyo | 1.93 / 2.36 / 2.10 | 2.64 / 2.63 / 2.78 | 2.89 / 2.34 / 2.29 | 2.98 / 2.46 / n/a | 4 / 4 / 3 |
| racing/volcanic-crown | 2.04 / 2.16 / 2.11 | 3.06 / 3.20 / 3.15 | 3.34 / 3.44 / 2.76 | 3.44 / 3.48 / n/a | 4 / 4 / 3 |
| showcase/volcanic-crown | 1.44 / 1.44 / 1.47 | 2.56 / 2.58 / 2.62 | 2.76 / 2.87 / 2.29 | 2.84 / 2.94 / n/a | 4 / 4 / 3 |

### Frame interval and FPS (fixture, A / B / C)

| Scene | interval p50 | p95 | p99 | actual FPS | stalls |
| --- | --- | --- | --- | --- | --- |
| home/coast | 16.7 / 16.7 / 16.7 | 16.7 / 16.7 / 16.8 | 16.8 / 16.8 / 16.8 | 60.0 / 60.0 / 60.0 | 0 / 0 / 0 |
| home/neon | 16.7 / 16.7 / 16.7 | 16.8 / 16.7 / 16.7 | 16.8 / 16.8 / 16.8 | 60.0 / 59.9 / 60.0 | 0 / 0 / 0 |
| home/taipei | 16.7 / 16.7 / 16.7 | 16.8 / 16.7 / 16.7 | 16.8 / 16.8 / 16.8 | 59.8 / 59.9 / 59.9 | 0 / 0 / 0 |
| home/tokyo | 16.7 / 16.7 / 16.7 | 16.7 / 16.7 / 16.7 | 16.8 / 16.8 / 16.8 | 60.0 / 60.0 / 60.0 | 0 / 0 / 0 |
| home/volcanic-crown | 16.7 / 16.7 / 16.7 | 16.7 / 16.8 / 16.8 | 16.8 / 16.8 / 16.8 | 60.0 / 60.0 / 60.0 | 0 / 0 / 0 |
| racing/coast | 16.7 / 16.7 / 16.7 | 16.8 / 16.8 / 16.7 | 16.8 / 16.8 / 16.8 | 60.0 / 60.0 / 60.0 | 0 / 0 / 0 |
| racing/neon | 16.7 / 16.7 / 16.7 | 16.8 / 16.8 / 16.7 | 16.8 / 16.8 / 16.8 | 60.0 / 59.9 / 60.0 | 0 / 0 / 0 |
| racing/taipei | 16.7 / 16.7 / 16.7 | 16.7 / 16.7 / 16.7 | 16.8 / 16.8 / 16.8 | 60.0 / 60.0 / 60.0 | 0 / 0 / 0 |
| racing/tokyo | 16.7 / 16.7 / 16.7 | 16.7 / 16.7 / 16.8 | 16.8 / 16.8 / 16.8 | 60.0 / 60.0 / 60.0 | 0 / 0 / 0 |
| racing/volcanic-crown | 16.7 / 16.7 / 16.7 | 16.7 / 16.7 / 16.8 | 16.8 / 16.8 / 16.8 | 60.0 / 60.0 / 60.0 | 0 / 0 / 0 |
| showcase/volcanic-crown | 16.7 / 16.7 / 16.7 | 16.7 / 16.7 / 16.7 | 16.8 / 16.8 / 16.8 | 59.9 / 60.0 / 60.0 | 0 / 0 / 0 |

### Renderer load counters (latest frame, A / B / C)

| Scene | draw calls | triangles | geometries | textures | programs |
| --- | --- | --- | --- | --- | --- |
| home/alpine | 313 / 313 / 308 | 80247 / 80247 / 80118 | 508 / 508 / 511 | 51 / 51 / 50 | 99 / 99 / 99 |
| home/aurora | 282 / 282 / 281 | 86479 / 86479 / 86350 | 468 / 468 / 468 | 51 / 51 / 50 | 97 / 97 / 97 |
| home/canyon | 221 / 221 / 220 | 90125 / 90125 / 89996 | 468 / 468 / 468 | 49 / 49 / 48 | 97 / 97 / 97 |
| home/coast | 195 / 195 / 194 | 428999 / 428999 / 428870 | 499 / 499 / 499 | 69 / 69 / 68 | 106 / 106 / 106 |
| home/coastal | 224 / 224 / 220 | 71837 / 71837 / 71708 | 507 / 507 / 511 | 50 / 50 / 49 | 98 / 98 / 98 |
| home/cosmic | 242 / 242 / 237 | 74175 / 74175 / 74046 | 477 / 477 / 482 | 50 / 50 / 49 | 97 / 97 / 97 |
| home/dune-tempest | 143 / 143 / 142 | 34233 / 34233 / 34104 | 678 / 678 / 678 | 47 / 47 / 46 | 98 / 98 / 98 |
| home/frostbite-canyon | 229 / 229 / 228 | 86087 / 86087 / 85958 | 468 / 468 / 468 | 50 / 50 / 49 | 97 / 97 / 97 |
| home/harbor-circuit | 179 / 179 / 178 | 78881 / 78881 / 78752 | 468 / 468 / 468 | 47 / 47 / 46 | 97 / 97 / 97 |
| home/monsoon-ruins | 294 / 294 / 259 | 135681 / 135681 / 135762 | 1670 / 1670 / 1021 | 48 / 48 / 47 | 100 / 100 / 100 |
| home/neon | 232 / 232 / 231 | 265352 / 265352 / 265223 | 533 / 533 / 533 | 71 / 71 / 70 | 109 / 109 / 109 |
| home/skyfall-archipelago | 171 / 171 / 170 | 35217 / 35217 / 35088 | 494 / 494 / 494 | 47 / 47 / 46 | 97 / 97 / 97 |
| home/spiral | n/a / n/a / 220 | n/a / n/a / 108892 | n/a / n/a / 497 | n/a / n/a / 58 | n/a / n/a / 103 |
| home/stormline-megacity | 243 / 243 / 242 | 55549 / 55549 / 55420 | 897 / 897 / 897 | 48 / 48 / 47 | 100 / 100 / 100 |
| home/taipei | 471 / 471 / 345 | 102685 / 102685 / 102556 | 476 / 476 / 483 | 50 / 50 / 49 | 97 / 97 / 97 |
| home/tokyo | 305 / 305 / 248 | 76219 / 76219 / 76090 | 474 / 474 / 479 | 50 / 50 / 49 | 97 / 97 / 97 |
| home/volcanic-crown | 184 / 184 / 183 | 50907 / 50907 / 50778 | 1062 / 1062 / 1062 | 48 / 48 / 47 | 99 / 99 / 99 |
| racing/alpine | 412 / 412 / 410 | 92913 / 92913 / 92620 | 502 / 502 / 505 | 51 / 51 / 50 | 99 / 99 / 99 |
| racing/aurora | 399 / 399 / 398 | 90037 / 90219 / 90300 | 468 / 468 / 468 | 51 / 51 / 50 | 97 / 97 / 97 |
| racing/canyon | 295 / 294 / 293 | 79119 / 78749 / 78380 | 468 / 468 / 468 | 49 / 49 / 48 | 97 / 97 / 97 |
| racing/coast | 247 / 246 / 246 | 429112 / 428630 / 428821 | 499 / 499 / 499 | 69 / 69 / 68 | 106 / 106 / 106 |
| racing/coastal | 404 / 404 / 403 | 88925 / 88925 / 88766 | 502 / 502 / 506 | 50 / 50 / 49 | 98 / 98 / 98 |
| racing/cosmic | 355 / 355 / 352 | 83737 / 83977 / 83710 | 477 / 477 / 482 | 50 / 50 / 49 | 97 / 97 / 97 |
| racing/dune-tempest | 285 / 285 / 284 | 88453 / 88287 / 88242 | 680 / 680 / 680 | 47 / 47 / 46 | 98 / 98 / 98 |
| racing/frostbite-canyon | 223 / 236 / 236 | 77907 / 79413 / 79716 | 468 / 468 / 468 | 50 / 50 / 49 | 97 / 97 / 97 |
| racing/harbor-circuit | 249 / 250 / 249 | 108843 / 109263 / 109122 | 468 / 468 / 468 | 47 / 47 / 46 | 97 / 97 / 97 |
| racing/monsoon-ruins | 366 / 349 / 266 | 153223 / 149425 / 149704 | 1670 / 1670 / 1021 | 48 / 48 / 47 | 100 / 100 / 100 |
| racing/neon | 283 / 283 / 281 | 261629 / 261367 / 261036 | 533 / 533 / 533 | 71 / 71 / 70 | 109 / 109 / 109 |
| racing/skyfall-archipelago | 265 / 265 / 263 | 66523 / 66567 / 66214 | 494 / 494 / 494 | 47 / 47 / 46 | 97 / 97 / 97 |
| racing/spiral | n/a / n/a / 217 | n/a / n/a / 88501 | n/a / n/a / 497 | n/a / n/a / 58 | n/a / n/a / 103 |
| racing/stormline-megacity | 358 / 358 / 357 | 66445 / 66445 / 66468 | 897 / 897 / 897 | 48 / 48 / 47 | 100 / 100 / 100 |
| racing/taipei | 623 / 623 / 478 | 112985 / 112745 / 112830 | 476 / 476 / 483 | 50 / 50 / 49 | 97 / 97 / 97 |
| racing/tokyo | 471 / 470 / 458 | 88851 / 88607 / 89154 | 474 / 474 / 479 | 50 / 50 / 49 | 97 / 97 / 97 |
| racing/volcanic-crown | 334 / 334 / 334 | 63699 / 63851 / 63926 | 1062 / 1062 / 1062 | 48 / 48 / 47 | 99 / 99 / 99 |
| showcase/dune-tempest | 134 / 134 / 133 | 33023 / 33023 / 32894 | 100 / 100 / 100 | 21 / 21 / 20 | 33 / 33 / 33 |
| showcase/frostbite-canyon | 143 / 143 / 142 | 75159 / 75159 / 75030 | 104 / 104 / 104 | 21 / 21 / 20 | 41 / 41 / 41 |
| showcase/monsoon-ruins | 161 / 161 / 160 | 48227 / 48227 / 48098 | 128 / 128 / 128 | 21 / 21 / 20 | 35 / 35 / 35 |
| showcase/skyfall-archipelago | 143 / 143 / 142 | 50467 / 50467 / 50338 | 109 / 109 / 109 | 21 / 21 / 20 | 35 / 35 / 35 |
| showcase/stormline-megacity | 163 / 163 / 162 | 30643 / 30643 / 30514 | 106 / 106 / 106 | 21 / 21 / 20 | 32 / 32 / 32 |
| showcase/volcanic-crown | 139 / 139 / 138 | 30137 / 30137 / 30008 | 98 / 98 / 98 | 21 / 21 / 20 | 34 / 34 / 34 |

### Particle buffer upload (node vfx-buffer-bench, 600 frames)

| Row | bytes/frame A / B / C | C vs A | upload calls/frame A / B / C | CPU ms/frame A / B / C | digests equal |
| --- | --- | --- | --- | --- | --- |
| driving | 58229 / 58229 / 4494 | -92% | 26.8 / 26.8 / 8.8 | 6.01 / 3.27 / 1.56 | yes |
| boost | 58204 / 58204 / 14286 | -75% | 27.1 / 27.1 / 15.1 | 5.67 / 4.49 / 4.92 | yes |
| nitro | 58209 / 58209 / 14472 | -75% | 27.4 / 27.4 / 21.2 | 7.90 / 5.19 / 5.48 | yes |
| drift-chain | 58518 / 58518 / 7686 | -87% | 29.7 / 29.7 / 18.2 | 4.78 / 3.22 / 6.65 | yes |
| multi-car-flight | 58235 / 58235 / 26772 | -54% | 26.6 / 26.6 / 14.6 | 6.18 / 6.41 / 7.66 | yes |
| pickups-impacts | 58229 / 58229 / 20208 | -65% | 26.8 / 26.8 / 18.3 | 4.51 / 3.17 / 1.18 | yes |
| garage-preview | 58368 / 58368 / 11321 | -81% | 27.0 / 27.0 / 21.2 | 7.92 / 2.52 / 5.08 | yes |
| launch-countdown | 58066 / 58066 / 4187 | -93% | 26.2 / 26.2 / 8.2 | 4.18 / 2.19 / 3.10 | yes |
| idle-after-burst | 58252 / 58252 / 5000 | -91% | 26.5 / 26.5 / 9.1 | 2.55 / 2.43 / 3.10 | yes |

### Real app, production build (median (min-max) of rounds)

| Metric | A | B | C |
| --- | --- | --- | --- |
| Load: Start button enabled (ms) | 1459 (1442-1651) | 1012 (916-1293) | 1131 (866-1235) |
| Load: first WebGL draw (ms) | 737 (541-811) | 287 (266-553) | 256 (214-360) |
| Home: rendered frames/s | 60.0 (55.2-60.1) | 60.1 (59.9-60.1) | 60.0 (60.0-60.2) |
| Home: draws/frame | 199 (199-199) | 199 (199-199) | 198 (198-198) |
| Home: bufferSubData bytes/s | 4512811 (4146397-4518536) | 4516826 (4506852-4519418) | 2434000 (2432201-2445118) |
| Home: main-thread busy | 0.254 (0.240-0.274) | 0.252 (0.215-0.275) | 0.222 (0.194-0.252) |
| Home: JS heap MB | 36.2 (35.1-53.1) | 35.0 (30.6-40.9) | 42.3 (40.2-59.2) |
| Race: rendered frames/s | 60.1 (60.0-60.3) | 59.9 (59.8-59.9) | 59.8 (59.8-59.9) |
| Race: rAF interval p50 ms | 16.7 (16.7-16.7) | 16.7 (16.7-16.7) | 16.7 (16.7-16.7) |
| Race: rAF interval p95 ms | 16.8 (16.8-16.8) | 16.7 (16.7-16.7) | 16.7 (16.7-16.8) |
| Race: rAF interval p99 ms | 16.8 (16.8-16.8) | 16.8 (16.8-16.8) | 16.8 (16.8-16.8) |
| Race: frames > 33 ms (15 s) | 0 (0-0) | 0 (0-1) | 0 (0-2) |
| Race: frames > 50 ms (15 s) | 0 (0-0) | 0 (0-0) | 0 (0-0) |
| Race: draws/frame | 264 (264-264) | 227 (226-227) | 226 (225-226) |
| Race: bufferSubData bytes/frame | 66640 (66640-66704) | 66832 (66832-66832) | 29536 (29504-29648) |
| Race: bufferSubData bytes/s | 5108512 (5101585-5135780) | 5083143 (5079942-5085324) | 2775195 (2774112-2782172) |
| Race: texture upload bytes/s | 139930 (139877-156926) | 139820 (139722-139897) | 139494 (139317-139865) |
| Race: main-thread busy | 0.341 (0.333-0.358) | 0.382 (0.337-0.387) | 0.386 (0.352-0.397) |
| Race: script busy | 0.212 (0.203-0.225) | 0.231 (0.204-0.237) | 0.234 (0.218-0.242) |
| Race: JS heap MB | 48.7 (45.4-49.0) | 46.2 (36.7-56.3) | 45.2 (37.0-48.9) |
| Race: heap change over 15 s MB | -0.5 (-0.7-8.1) | 15.9 (-13.0-24.0) | -1.1 (-10.6--0.7) |
| Paused: rendered frames/s (idle render count) | 59.9 (59.9-60.1) | 60.1 (59.9-60.2) | 0.0 (0.0-0.0) |
| Paused: main-thread busy | 0.257 (0.241-0.258) | 0.250 (0.214-0.259) | 0.039 (0.039-0.046) |
| Paused: script busy | 0.205 (0.191-0.207) | 0.197 (0.169-0.206) | 0.008 (0.008-0.009) |
| Page errors | 0 (0-0) | 0 (0-0) | 0 (0-0) |

### CPU simulation, 8-car race (node course-race-bench, median (min-max) of rounds)

| Metric | A | B | C |
| --- | --- | --- | --- |
| coast.meanUs | 1651.8 (1021.3-1752.8) | 1557.4 (762.0-1888.2) | 904.2 (749.8-976.8) |
| coast.p95Us | 7030.1 (2582.6-8299.7) | 8083.6 (1329.5-8801.9) | 1088.0 (725.7-2530.5) |
| dune.meanUs | 6501.0 (4566.1-8161.6) | 6543.6 (3021.6-7733.3) | 3950.5 (3156.7-4604.6) |
| dune.p95Us | 35136.2 (23181.2-44947.0) | 36985.4 (13062.5-41889.4) | 21172.7 (15575.7-25209.5) |
| coast.heapBytesPerFrame | 2281.0 (1674.0-2401.0) | 2365.0 (1615.0-2524.0) | 1649.0 (1574.0-3311.0) |
| dune.heapBytesPerFrame | 731.0 (530.0-826.0) | 1400.0 (1334.0-1453.0) | 825.0 (764.0-1742.0) |
<!-- tables:end -->

Reading the tables:

- **FPS and stutter.** Every build delivers 60 FPS with a 16.7 ms p50 and 16.8 ms p99 interval, in the fixture and in the
  real app, with 0 stalls and 0 frames over 50 ms. This display is 60 Hz and the machine is fast, so frame rate cannot
  show a difference here; GPU and CPU time are the comparison.
- **Idle render count.** A paused race renders 0.0 frames/s on C against 59.9 on A and 60.1 on B. Main-thread busy time
  while paused falls from 25.7% to 3.9%, script time from 20.5% to 0.8%.
- **Loading.** First WebGL draw 737 ms on A, 287 ms on B, 256 ms on C; Start button enabled 1459 / 1012 / 1131 ms. Most
  of the load gain is develop work (A to B); B to C is within the round spread.
- **Real-app race.** Draws per frame 264 / 227 / 226: the default race scene lost its extra draws in develop (A to B),
  not in this program. Race main-thread busy is 34% on A and 38-39% on B and C, so B and C are equal; the A-to-B
  increase is develop work and is within this machine's noise.
- **JS heap.** 36-49 MB on all builds. The 15-second heap change swings between -13 and +24 MB from round to round
  (GC timing), so no leak or saving is claimed; the 15-minute soak below shows a flat trend.
- **CPU simulation (node).** C has the lowest medians (Coast mean 904 us against 1652 on A), but the load average
  reached 241 during this bench and the same build varies 2-6x between rounds. No CPU simulation change is claimed.
  The bench's own CPU budget check failed on every build and round (exit 1) for the same reason. The data was kept.

## Sustained 5 and 15 minutes (reused, not re-run)

Reused unchanged from [frame-lifecycle.md](frame-lifecycle.md), soak spec `tests/frame-lifecycle-soak-browser.spec.js`
(`SOAK=1`). LOCAL-CHROME, Coast Free race, alternating one minute racing and one minute paused. Before is
`1520b8ba` (frame-lifecycle base), After is the frame-lifecycle branch that is part of C. These are not A/B/C runs.

| LOCAL-CHROME | Racing rAF fps | Racing draws/s | Racing main-thread busy | Paused draws/s | Paused draws/min | Paused main-thread busy | Paused script busy |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Before, 5 min | 60.0 | 60.1 | 23.6% | 60.0 | 3602 | 19.3% | 15.3% |
| After, 5 min | 59.9 | 60.0 | 24.6% | 0.0 | 106 | 7.0% | 1.5% |
| Before, 15 min | 59.9 | 60.0 | 26.9% | 59.9 | 3600 | 19.7% | 15.5% |
| After, 15 min | 59.8 | 59.9 | 22.1% | 0.0 | 105 | 5.5% | 1.2% |

Racing is unchanged. A paused race draws about 105 frames a minute instead of 3600, and main-thread busy time drops
about 3x. Heap stayed between 34 and 60 MB with a flat trend in both builds. The 30-minute run was not run there and
is not run here: **UNVERIFIED**.

<!-- visual:start -->
## Visual fidelity gate (LOCAL-CHROME)

Harness: `scripts/final-report/visual-fidelity.mjs` with `scripts/final-report/visual-fidelity.html`. Each build is
served from its own source by Vite; the page fakes `requestAnimationFrame`, `performance.now` and `Date.now`,
seeds `Math.random` (mulberry32), reseeds after `createWorld`, steps a fixed number of frames with the same input
and reads the pixels in the same task as the draw. So scene, simulated time, animation phase, camera and input are
the same on both builds (the car distance at capture matches to the last digit in every racing scene). Mobile is
390x844 at DPR 3, desktop 1440x900 at DPR 1. Renderer: ANGLE (Apple, ANGLE Metal Renderer: Apple M4, Unspecified Version). Each composite is
base | candidate | absolute difference x8 (amber), WebP quality 0.82, downscaled; the metrics are computed on the
full-resolution RGBA readback, not on the WebP. "C repeat" renders C twice and is the determinism floor.

| Scene | Canvas | A vs C max delta | A vs C pixels > 8 | PSNR dB | B vs C pixels > 8 | C repeat max | Finding | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| m-home-coast | 585x1266 | 1 | 0 (0.000%) | 64.7 | not run | 0 | PASS (max delta <= 1) | [webp](final-report/visual/m-home-coast.webp) |
| m-home-tokyo | 585x1266 | 143 | 179 (0.024%) | 49.5 | not run | 0 | edge AA on merged Tokyo Tower (program) | [webp](final-report/visual/m-home-tokyo.webp) |
| m-showcase-volcanic-crown | 585x1266 | 1 | 0 (0.000%) | 67.7 | not run | 0 | PASS (max delta <= 1) | [webp](final-report/visual/m-showcase-volcanic-crown.webp) |
| m-showcase-frostbite-canyon | 585x1266 | 1 | 0 (0.000%) | 64.4 | not run | 0 | PASS (max delta <= 1) | [webp](final-report/visual/m-showcase-frostbite-canyon.webp) |
| m-garage-high | 585x1266 | 1 | 0 (0.000%) | 67.0 | not run | 0 | PASS (max delta <= 1) | [webp](final-report/visual/m-garage-high.webp) |
| m-garage-ultra | 585x1266 | 1 | 0 (0.000%) | 67.0 | not run | 0 | PASS (max delta <= 1) | [webp](final-report/visual/m-garage-ultra.webp) |
| m-race-coast-high | 585x1266 | 65 | 3408 (0.460%) | 43.5 | 3408 (0.460%) | 0 | particle positions + exhaust sparks (program, RNG stream) | [webp](final-report/visual/m-race-coast-high.webp) |
| m-race-tokyo-high | 585x1266 | 225 | 11300 (1.526%) | 32.5 | 9634 (1.301%) | 0 | particle positions + exhaust sparks (program, RNG stream) | [webp](final-report/visual/m-race-tokyo-high.webp) |
| m-race-taipei-high | 585x1266 | 229 | 16345 (2.207%) | 32.6 | 16152 (2.181%) | 0 | particle positions + exhaust sparks (program, RNG stream) | [webp](final-report/visual/m-race-taipei-high.webp) |
| m-race-neon-ultra | 585x1266 | 83 | 4233 (0.572%) | 40.9 | 4233 (0.572%) | 4 | particle positions + exhaust sparks (program, RNG stream) | [webp](final-report/visual/m-race-neon-ultra.webp) |
| m-race-volcanic-crown-ultra | 585x1266 | 219 | 29966 (4.046%) | 35.6 | 4095 (0.553%) | 0 | mostly develop (A to B); rest particles | [webp](final-report/visual/m-race-volcanic-crown-ultra.webp) |
| m-photo-tokyo | 585x1266 | 62 | 2223 (0.300%) | 44.5 | not run | 0 | particle sprites at shifted positions (B vs C not run) | [webp](final-report/visual/m-photo-tokyo.webp) |
| m-results-coast | 585x1266 | 1 | 0 (0.000%) | 64.9 | not run | 0 | PASS (max delta <= 1) | [webp](final-report/visual/m-results-coast.webp) |
| d-home-coast | 1440x900 | 7 | 0 (0.000%) | 64.5 | not run | 7 | PASS (max delta <= 7) | [webp](final-report/visual/d-home-coast.webp) |
| d-showcase-frostbite-canyon | 1440x900 | 1 | 0 (0.000%) | 65.1 | not run | 0 | PASS (max delta <= 1) | [webp](final-report/visual/d-showcase-frostbite-canyon.webp) |
| d-garage-ultra | 1440x900 | 1 | 0 (0.000%) | 66.8 | not run | 0 | PASS (max delta <= 1) | [webp](final-report/visual/d-garage-ultra.webp) |
| d-race-tokyo-high | 1440x900 | 229 | 28011 (2.161%) | 30.7 | 25276 (1.950%) | 0 | particle positions + exhaust sparks (program, RNG stream) | [webp](final-report/visual/d-race-tokyo-high.webp) |
| d-race-volcanic-crown-ultra | 1440x900 | 208 | 43637 (3.367%) | 35.3 | 5923 (0.457%) | 0 | mostly develop (A to B); rest particles | [webp](final-report/visual/d-race-volcanic-crown-ultra.webp) |
| d-photo-tokyo | 1440x900 | 96 | 1166 (0.090%) | 49.6 | not run | 0 | particle sprites at shifted positions (B vs C not run) | [webp](final-report/visual/d-photo-tokyo.webp) |
| d-results-coast | 1440x900 | 1 | 0 (0.000%) | 65.0 | not run | 0 | PASS (max delta <= 1) | [webp](final-report/visual/d-results-coast.webp) |

Verdict: **PASS for Home, showcase, Garage (High and Ultra), Results and desktop Home**: max channel delta 1 or less
(desktop Home 7, equal to its own C repeat, from the animated sky), PSNR about 65 dB. **Non-trivial differences in every
racing scene and in Photo mode, investigated and not fixed (no `src/` change in this stage):**

1. **Particle sprites at different positions (racing, Photo).** The amber dots in the diff are ember and spark sprites.
   Counting ember-coloured pixels in the base and candidate panels gives equal totals within 4% in both directions
   (for example Tokyo racing 3428 vs 3269, Taipei 2337 vs 2411), so particles are moved, not removed or dimmed. B vs C
   gives the same picture, so it comes from the program. The cause is the one documented in
   [gpu-pipeline.md](gpu-pipeline.md#visual-equivalence): three's `MathUtils.generateUUID` consumes `Math.random`,
   and C creates fewer objects (merged static meshes, one fewer pass), so the shared random stream that also drives
   particle spawns is shifted. Under one fixed random stream the particle output is identical: the
   `vfx-buffer-bench` digests match on A, B and C in all nine scenarios. Not proven pixel by pixel in the browser:
   the fixture cannot isolate the particle stream without a `src/` change.
2. **Glow at the player car's rear diffuser (every racing scene, including Coast where it is the only difference).**
   A small localised blob, max delta 65 on Coast. It sits where nitro sparks are emitted (`src/nitro-sparks.ts`
   draws from `Math.random`) and the fixture holds boost, so it is consistent with the same shifted random stream.
   The lens/output fold cannot cause it: it is a spatially uniform full-screen pass, and its in-page reference
   comparison is max delta 1 (`tests/gpu-pipeline-browser.spec.js`). Root cause **UNVERIFIED** beyond that.
3. **Volcanic Crown wireframe overlay (racing).** The large diff lines (29966 px on mobile) disappear in B vs C
   (4095 px, particles only), so they come from develop work between A and B, not from this program.
4. **Tokyo Tower edges on Home (179 px, 0.024%).** Faint edge differences on the landmark that workstream 11 merged
   into one mesh (Tokyo Home draws 305 to 248). Consistent with baked world-space vertices rasterising one
   anti-aliased edge sample differently; not visible at 1x in the composite.

No scene shows a missing object, a material or colour change, or a resolution, MSAA, bloom or tone-mapping change.
Under the zero-downgrade rule the racing results still count as **open**: the particle and exhaust differences are
explained, but are not shown to be equivalent by a same-stream pixel comparison.
<!-- visual:end -->

## p08 metric coverage

| p08 metric | Status | Where |
| --- | --- | --- |
| CPU simulation time | MEASURED (LOCAL-CHROME fixture; LOCAL-NODE full race) | timing table `CPU sim`; course table |
| CPU render submission time | MEASURED | timing table, `cpu-render-p50.svg` |
| GPU frame time | MEASURED (`EXT_disjoint_timer_query_webgl2`, about 29 samples per run) | timing table, `gpu-frame-p50.svg` |
| GPU pass breakdown | MEASURED | pass table |
| FPS, frame interval p50/p95/p99 | MEASURED (fixture and real app) | frame-interval table, real-app table |
| Draw calls, triangles | MEASURED | load-counter table, `draw-calls.svg` |
| Geometry, texture, program counts | MEASURED | load-counter table |
| Particle upload | MEASURED (byte counts, node) | particle table, `particle-upload.svg` |
| JS heap | MEASURED (`performance.memory`, Chrome only) | real-app table; soak heap above |
| JS allocation rate, GC count and pause in the browser | **UNVERIFIED**: no GC events are exposed to page script, and a CDP heap-sampling run under this load would not separate A/B/C from noise. Node-side GC pause is in the course table (`--expose-gc`). | course table |
| Idle render count | MEASURED (paused race renders per second, real app) | real-app table; soak table |
| Loading time and stutter | MEASURED (start-ready, first draw, long frames over 50 ms in the real app) | real-app table |
| 5 and 15 minutes sustained | REUSED from frame-lifecycle.md | section above |
| 30 minutes sustained | **UNVERIFIED** | SOP below |
| Power, thermal state, temperature, fan | **UNVERIFIED**: not observable from a browser, and the only machine available was shared | SOP below |
| iPhone 16 Pro, Mac mini M4 acceptance runs | **UNVERIFIED**: no physical-device session in this stage | SOP below |

## Physical devices: UNVERIFIED, manual SOP

Nothing in this report was measured on an iPhone 16 Pro, nor on a Mac mini M4 under acceptance conditions, and no
temperature, power or 30-minute number exists for A, B or C. Do not fill these cells from LOCAL-CHROME. The SOP below
extends [README.md](README.md#physical-device-soak) and the frame-lifecycle SOP for the three builds of this report.

1. **Builds.** For each of A, B and C: `git worktree add --detach <dir> <sha>`, `pnpm install --frozen-lockfile`,
   `pnpm run build`. Serve each `dist/` with `pnpm preview --host` on the LAN (or `make phone`). Do not add the
   measurement overlay for device runs; the timing overlay is for the fixture only.
2. **Fixed conditions.** Same room temperature (write it down), screen brightness fixed (auto-brightness off),
   iPhone at 80-100% battery and not charging, Low Power Mode off, no case, same browser version, all other apps
   closed. Mac: on mains power, lid or display as in production use, other apps closed. Let the device cool for
   at least 15 minutes between runs, until it feels as cool as at the first start.
3. **Game settings.** Quality High, Target FPS fixed at 60 (not Auto), Adaptive resolution off, same car, same
   track (Coast Free for the soak, plus Taipei and Tokyo as the heavy tracks), same seed `?seed=12345`.
4. **Order.** A, B, C, then C, B, A on a second day; one build per cool-down.
5. **30-minute run per build.** Cold start, then continuous racing (restart the race at the finish) for 30
   minutes. At 0, 5, 15 and 30 minutes: on the Mac, open the build with `?perf=deep&seed=12345` and save
   `JSON.parse(document.getElementById('perf-overlay').dataset.deep)`; on iPhone, record Safari Web Inspector
   Timelines (Frames and CPU) for 20 s over USB. Write the actual FPS, frame interval p50/p95/p99, GPU p50 where
   available, stalls and draw calls.
6. **Thermal and power.** Mac: `sudo powermetrics --samplers gpu_power,cpu_power,thermal -i 5000` for the whole
   run, and `pmset -g therm` at each checkpoint (a warning level, not a temperature). iPhone: Xcode Instruments
   Energy Log or the Thermal State in the Xcode device console; otherwise write `unavailable`. Battery percentage
   at 0 and 30 minutes. A subjective warmth note (cool, warm, hot) at each checkpoint is a note, never a number.
7. **Repeat without instrumentation** (no `?perf`) for C at least once to see whether the diagnostics change warmth.
8. **Visual check on device.** Home, Garage, countdown, racing, Photo mode and Results on A and C side by side;
   any visible difference is a failure of the zero-downgrade rule.
9. **Stop rule.** Stop when the OS warns or the device is uncomfortably hot. Record the stop time; an unfinished
   run is `UNVERIFIED`, not 0.
10. **Privacy.** Raw logs stay in the ignored `docs/performance/local/`. Publish only the summary table, labelled
    `physical-gpu`, with the device model and OS version, no serials, addresses or account names.

## Reproduce

From the repository root, with Chrome installed and `PLAYWRIGHT_PORT` free:

```sh
git worktree add --detach ../perf-A d9c144ba39546378cdae32f76ae305fee1f9305f
git worktree add --detach ../perf-B 32b82da7
# measurement-only overlay; then pnpm install --frozen-lockfile && pnpm run build in each
node scripts/final-report/overlay-probe.mjs ../perf-A
node scripts/final-report/overlay-probe.mjs ../perf-B
pnpm run build
OUT=docs/performance/local/final-report
THERMAL_FRAMES=900 node scripts/final-report/run-scene-matrix.mjs $OUT/timing 3 A=../perf-A B=../perf-B C=. \
  -- volcanic-crown taipei tokyo coast neon
THERMAL_FRAMES=180 node scripts/final-report/run-scene-matrix.mjs $OUT/counters 1 A=../perf-A B=../perf-B C=.
node scripts/final-report/app-probe.mjs $OUT/app.json 3 A=../perf-A B=../perf-B C=.
# per build, rounds rotated: node --experimental-strip-types --expose-gc scripts/course-race-bench.mjs > $OUT/course-<L>-r<N>.json
# per build: node scripts/vfx-buffer-bench.mjs --frames=600 --json > $OUT/vfx-<L>.json
node scripts/final-report/visual-fidelity.mjs docs/performance/final-report/visual A=../perf-A C=.
node scripts/final-report/build-report.mjs $OUT   # comparison.json, SVGs, $OUT/tables.md
git worktree remove --force ../perf-A && git worktree remove --force ../perf-B
```
