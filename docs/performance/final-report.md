# Perf-thermal program: final performance report

Scope: measurement and evidence only. No `src/` change was made for this report; graphics, simulation and tests are
untouched. Every number below is labelled with the environment it came from. Unavailable is written `n/a` or
`UNVERIFIED`, never 0.

| Label | Commit | What it is |
| --- | --- | --- |
| A | `d9c144ba39546378cdae32f76ae305fee1f9305f` | original develop base of the program |
| B | `32b82da7` | latest `origin/develop` at integration time (control: develop work that is not part of this program) |
| C | `8e5f4cf6` | integration head `feature/perf-thermal-90-integration` (Stage A + branch 11 rain fix + Wave 2 frame lifecycle + B + Wave 3 items 30, 31, 32) |

Re-measured 2026-11-27 with C = `8e5f4cf6` (Wave 3 integration). The first report measured C = `1fcfa98a`; the
visual first-pass table and the RNG-isolated re-test below keep that commit and say so.

Raw comparison data: [`final-report/comparison.json`](final-report/comparison.json) (every per-round value, medians,
min/max). Charts are generated from it by `scripts/final-report/build-report.mjs`.

## Environment

- **LOCAL-CHROME** (evidence class `local-chromium`): Playwright 1.64.1 driving Google Chrome (channel `chrome`) on an
  Apple M4 Mac mini (Mac16,10, 10 cores, 32 GB), macOS 27.2, Node 24.19. WebGL renderer reported by
  `WEBGL_debug_renderer_info`: ANGLE (Apple, ANGLE Metal Renderer: Apple M4, Unspecified Version).
- **Concurrent load:** the machine was shared with other agent sessions running builds and browser tests. The
  1-minute load average was 29-60 during the timing and counter runs and 8-17 during the course, particle and
  visual runs, on 10 cores. The first counter pass lost B to a `page.goto` timeout under that load; it was re-run at
  load 15-17 and only the complete re-run is used. This is the dominant noise source;
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
| GPU frame time | -30% | -34% (per scene -33% to -58%) | **met** |
| CPU render submission | -25% | 0% (per scene -4% to +13%, within noise) | not met |
| Draw calls, complex scenes | -40% | -13% (per scene -0.2% to -29%) | not met |
| Particle upload | -50% | -81% (per scenario -54% to -93%) | **met** |

Definitions (fixed before the data was read, in `scripts/final-report/build-report.mjs`): GPU and CPU use the five
racing scenes (coast, neon, taipei, tokyo, volcanic-crown), `gpuFrameMs.p50` and `cpuRenderSubmissionMs.p50`, the
median of the three rounds per scene, then the median of the per-scene changes. "Complex scenes" are the six
non-showcase scenes with the highest draw count on A. Particle upload is `uploadBytesPerFrame` over the nine
`vfx-buffer-bench` rows.

What the numbers say, honestly:

- **GPU frame -30%: met.** Racing GPU frame p50 fell 33-58% on every racing scene (median -34%) and 32-63% on Home;
  B is within noise of A, so the gain is from this program. It is all in the post chain. Stage A made the lens pass
  write the final sRGB output, so the separate `OutputPass` (a full-screen HalfFloat read and write) is gone, and the
  lens itself is cheaper (single-sample target). Wave 3 item 30 then adds the bloom inside the lens instead of
  blending it back into the 4x MSAA scene target, which now resolves once, colour only
  ([gpu-pipeline.md](gpu-pipeline.md)). The 4x MSAA scene target and the 5-mip bloom are kept, so the picture is
  unchanged. Volcanic Crown gains most (-58%). On a tile-based mobile GPU the removed full-screen work is likely worth
  more than on this desktop-class GPU, but that is UNVERIFIED.
- **CPU render submission -25%: not met.** The median change is 0% (per scene -4% to +13%). The submission time is
  dominated by Three.js traversal and per-object uniform upload, and the round-to-round spread is larger than any
  change. Wave 3 item 32 kept only pixel-identical changes and claims no gain; the changes that reached -25% to -43%
  moved pixels and were rejected ([cpu-submission.md](cpu-submission.md)).
- **Draw calls -40% on complex scenes: not met.** The median of the six heaviest scenes is -13%. The static-mesh
  merge of workstream 11 ([scene-streaming.md](scene-streaming.md)) cut the landmark-heavy tracks: Taipei racing 623
  to 477 (-23%), Taipei home 471 to 344 (-27%), Tokyo home 305 to 247 (-19%). Wave 3 item 31 merged each bridge
  tower's 55 steel and 3 trim parts into 2 draws: Aurora racing 399 to 285 (-29%). Item 31 on its own branch measured
  -13.1% (median of the six scenes); this re-run of the integration head gives -13.4%, the same within round spread.
  Rival wheel instancing reached -19.6% but moved wheel-edge pixels on 7 of 20 gate scenes (max delta 53); the owner
  rejected it and it is not in the integration head. Alpine and Coastal racing are
  dominated by distinct materials, transparent, animated or render-ordered meshes, which `canBatch` must exclude to
  keep the picture identical, so they changed by 1-3 draws. A colour-only tint pool reached -33% but flipped
  depth-tied seams and was rejected (scene-streaming.md "Wave 3 item 31").
- **Particle upload -50%: met.** Median -81%, every scenario at least -54%. The real app agrees: race bufferSubData falls from 66.6 KB to 29.7 KB per frame (-55%), Home from 4.5 to 2.4 MB/s. Particle buffers now upload only the live range
  ([vfx-buffers.md](vfx-buffers.md)); the simulation digests of A, B and C are identical in every row, so the same
  particles are drawn.

![GPU frame p50 per racing scene](final-report/gpu-frame-p50.svg)

![CPU render submission p50 per racing scene](final-report/cpu-render-p50.svg)

![Draw calls in the most complex scenes](final-report/draw-calls.svg)

![Particle upload bytes per frame](final-report/particle-upload.svg)

<!-- tables:start -->

### Targets

| Target | Goal | C vs A (median of scenes) | Met | Scenes |
| --- | --- | --- | --- | --- |
| GPU frame time p50 (racing) | -30% | -34% | yes | 5 |
| CPU render submission p50 (racing) | -25% | 0% | no | 5 |
| Draw calls, six most complex scenes | -40% | -13% | no | 6 |
| Particle upload bytes per frame | -50% | -81% | yes | 9 |

### GPU and CPU timing (median (min-max) of rounds, ms)

| Scene | Build | GPU frame p50 | GPU frame p95 | GPU p99 | CPU submit p50 | CPU submit p95 | CPU sim p50 | CPU sim p95 | GPU samples |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| home/coast | A | 5.83 (5.74-6.51) | 7.48 (6.83-9.73) | 9.28 | 2.00 (1.90-2.00) | 3.30 (2.60-4.60) | 0.00 | 0.00 | 29 |
|  | B | 5.91 (5.86-5.96) | 8.61 (6.77-10.45) | 11.18 | 2.05 (2.00-2.10) | 4.20 (3.60-4.80) | 0.00 | 0.00 | 29 |
|  | C | 3.77 (3.49-4.05) | 5.17 (3.94-6.44) | 6.65 | 1.90 (1.90-2.80) | 3.20 (2.20-5.40) | 0.00 | 0.00 | 29 |
| home/neon | A | 6.13 (5.38-6.46) | 6.90 (6.59-9.62) | 6.95 | 2.40 (2.10-2.50) | 3.00 (2.70-5.90) | 0.00 | 0.00 | 29 |
|  | B | 6.20 (6.15-6.26) | 8.16 (7.58-8.73) | 10.41 | 2.60 (2.50-2.70) | 4.70 (3.10-6.30) | 0.00 | 0.00 | 29 |
|  | C | 4.19 (3.86-4.23) | 7.03 (4.75-9.39) | 8.15 | 2.60 (2.30-3.00) | 6.10 (2.90-6.10) | 0.00 | 0.00 | 29 |
| home/taipei | A | 5.23 (5.20-5.24) | 6.05 (5.85-6.59) | 7.45 | 2.70 (2.70-2.80) | 3.40 (3.10-6.60) | 0.00 | 0.00 | 29 |
|  | B | 5.45 (5.28-5.62) | 9.83 (9.79-9.87) | 10.30 | 2.80 (2.70-2.90) | 5.05 (3.30-6.80) | 0.00 | 0.00 | 29 |
|  | C | 1.96 (1.85-2.15) | 3.82 (3.33-6.38) | 4.04 | 3.30 (2.60-3.70) | 7.00 (3.40-7.70) | 0.00 | 0.00 | 29 |
| home/tokyo | A | 5.20 (5.05-5.57) | 5.76 (5.74-5.78) | 5.85 | 2.40 (2.30-2.50) | 3.00 (2.60-5.50) | 0.00 | 0.00 | 29 |
|  | B | 5.42 (5.26-5.57) | 6.73 (5.69-7.78) | 7.60 | 2.40 (2.40-2.40) | 4.25 (2.60-5.90) | 0.00 | 0.00 | 29 |
|  | C | 3.26 (3.13-3.27) | 5.59 (3.79-8.95) | 5.79 | 2.30 (2.30-2.90) | 5.60 (5.00-6.40) | 0.00 | 0.00 | 29 |
| home/volcanic-crown | A | 6.06 (5.44-6.13) | 7.35 (7.31-10.87) | 8.40 | 2.20 (2.20-2.30) | 2.70 (2.60-3.70) | 0.00 | 0.00 | 29 |
|  | B | 6.03 (5.71-6.25) | 7.68 (6.55-8.52) | 9.70 | 2.30 (2.30-2.70) | 2.80 (2.60-6.00) | 0.00 | 0.00 | 29 |
|  | C | 2.26 (2.11-2.28) | 4.41 (2.91-4.88) | 4.44 | 2.20 (1.90-2.30) | 3.10 (2.60-5.60) | 0.00 | 0.00 | 29 |
| racing/coast | A | 6.17 (6.13-6.32) | 7.19 (6.88-12.34) | 12.23 | 2.10 (2.00-2.10) | 2.70 (2.40-4.60) | 0.10 | 0.20 | 29 |
|  | B | 6.41 (6.30-6.53) | 9.20 (6.89-11.52) | 9.32 | 2.25 (2.20-2.30) | 4.90 (4.30-5.50) | 0.10 | 0.25 | 29 |
|  | C | 4.01 (2.57-4.71) | 6.79 (4.94-9.64) | 9.04 | 2.30 (1.80-2.60) | 5.00 (2.20-5.50) | 0.20 | 0.30 | 29 |
| racing/neon | A | 6.47 (6.20-6.53) | 8.99 (7.60-10.09) | 10.58 | 2.40 (2.20-2.60) | 3.00 (2.70-5.60) | 0.20 | 0.30 | 29 |
|  | B | 6.24 (6.00-6.49) | 8.84 (7.12-10.56) | 11.11 | 2.50 (2.40-2.60) | 4.60 (2.90-6.30) | 0.20 | 0.35 | 29 |
|  | C | 4.36 (4.08-4.58) | 6.84 (5.08-8.10) | 7.32 | 2.70 (2.40-3.80) | 6.00 (3.30-6.90) | 0.20 | 0.40 | 29 |
| racing/taipei | A | 5.79 (5.62-6.17) | 6.64 (6.55-7.58) | 6.77 | 3.00 (3.00-3.10) | 3.80 (3.40-7.20) | 0.10 | 0.20 | 29 |
|  | B | 6.11 (5.74-6.49) | 8.24 (6.75-9.74) | 9.13 | 3.25 (3.00-3.50) | 6.05 (3.40-8.70) | 0.15 | 0.25 | 29 |
|  | C | 3.81 (3.50-4.10) | 8.43 (6.48-9.43) | 8.51 | 2.90 (2.90-3.90) | 6.70 (4.90-7.90) | 0.10 | 0.30 | 29 |
| racing/tokyo | A | 5.63 (5.53-6.13) | 8.33 (6.69-8.45) | 8.70 | 2.70 (2.60-2.80) | 3.40 (3.40-6.50) | 0.20 | 0.30 | 29 |
|  | B | 5.91 (5.76-6.06) | 9.85 (6.32-13.37) | 12.05 | 2.70 (2.60-2.80) | 4.55 (3.10-6.00) | 0.20 | 0.30 | 29 |
|  | C | 3.75 (3.49-4.10) | 7.82 (4.23-9.92) | 9.26 | 2.70 (2.60-3.70) | 6.10 (3.00-7.40) | 0.20 | 0.40 | 29 |
| racing/volcanic-crown | A | 5.98 (5.90-6.12) | 9.11 (6.71-10.99) | 9.95 | 2.50 (2.50-2.60) | 4.50 (3.20-4.70) | 0.10 | 0.20 | 29 |
|  | B | 6.14 (5.98-6.29) | 7.68 (6.68-8.68) | 9.37 | 2.60 (2.50-2.70) | 4.70 (2.80-6.60) | 0.10 | 0.25 | 29 |
|  | C | 2.53 (2.39-3.76) | 5.16 (2.94-9.24) | 9.58 | 2.40 (2.20-3.10) | 5.60 (2.80-6.50) | 0.10 | 0.30 | 29 |
| showcase/volcanic-crown | A | 4.88 (4.68-4.92) | 5.18 (5.09-8.48) | 9.90 | 0.70 (0.70-0.80) | 0.90 (0.80-1.60) | 0.00 | 0.00 | 29 |
|  | B | 4.77 (4.63-4.90) | 7.01 (5.27-8.75) | 8.97 | 0.85 (0.80-0.90) | 1.40 (1.00-1.80) | 0.00 | 0.00 | 29 |
|  | C | 2.53 (2.48-2.79) | 2.78 (2.77-8.38) | 3.86 | 0.80 (0.80-0.90) | 1.60 (1.10-2.00) | 0.00 | 0.00 | 29 |

### GPU pass breakdown p50 (ms, A / B / C; output pass exists on A/B only)

| Scene | scene | bloom | lens | output | passes |
| --- | --- | --- | --- | --- | --- |
| home/coast | 2.22 / 2.13 / 1.85 | 2.87 / 2.88 / 1.54 | 3.42 / 3.41 / 1.54 | 3.52 / 3.51 / n/a | 4 / 4 / 3 |
| home/neon | 2.21 / 2.26 / 2.18 | 2.91 / 2.96 / 1.84 | 3.50 / 3.49 / 1.71 | 3.57 / 3.59 / n/a | 4 / 4 / 3 |
| home/taipei | 1.61 / 1.67 / 1.47 | 2.63 / 2.70 / 1.43 | 3.00 / 3.13 / 0.25 | 3.08 / 3.25 / n/a | 4 / 4 / 3 |
| home/tokyo | 1.52 / 1.56 / 1.51 | 2.53 / 2.62 / 1.47 | 2.98 / 2.98 / 1.23 | 3.04 / 3.07 / n/a | 4 / 4 / 3 |
| home/volcanic-crown | 1.85 / 1.96 / 1.69 | 2.94 / 3.08 / 1.61 | 3.30 / 3.42 / 0.24 | 3.28 / 3.45 / n/a | 4 / 4 / 3 |
| racing/coast | 2.22 / 2.21 / 2.08 | 2.93 / 2.95 / 1.72 | 3.45 / 3.53 / 1.70 | 3.54 / 3.68 / n/a | 4 / 4 / 3 |
| racing/neon | 2.24 / 2.23 / 2.25 | 2.94 / 2.92 / 1.84 | 3.59 / 3.52 / 1.74 | 3.64 / 3.60 / n/a | 4 / 4 / 3 |
| racing/taipei | 1.86 / 1.94 / 1.79 | 2.85 / 2.89 / 1.72 | 3.31 / 3.34 / 1.76 | 3.40 / 3.44 / n/a | 4 / 4 / 3 |
| racing/tokyo | 1.89 / 1.84 / 1.76 | 2.86 / 2.96 / 1.54 | 3.22 / 3.40 / 1.57 | 3.30 / 3.47 / n/a | 4 / 4 / 3 |
| racing/volcanic-crown | 1.92 / 1.88 / 1.82 | 3.00 / 2.95 / 1.78 | 3.29 / 3.28 / 0.29 | 3.39 / 3.33 / n/a | 4 / 4 / 3 |
| showcase/volcanic-crown | 1.35 / 1.35 / 1.21 | 2.48 / 2.50 / 1.28 | 2.75 / 2.76 / 1.06 | 2.82 / 2.82 / n/a | 4 / 4 / 3 |

### Frame interval and FPS (fixture, A / B / C)

| Scene | interval p50 | p95 | p99 | actual FPS | stalls |
| --- | --- | --- | --- | --- | --- |
| home/coast | 16.7 / 16.7 / 16.7 | 16.7 / 16.8 / 16.7 | 16.8 / 16.8 / 16.8 | 60.0 / 60.0 / 60.0 | 0 / 0 / 0 |
| home/neon | 16.7 / 16.7 / 16.7 | 16.8 / 16.8 / 16.8 | 16.8 / 16.8 / 16.8 | 60.0 / 60.0 / 60.0 | 0 / 0 / 0 |
| home/taipei | 16.7 / 16.7 / 16.7 | 16.8 / 16.8 / 16.8 | 16.8 / 16.8 / 16.8 | 60.0 / 60.0 / 60.0 | 0 / 0 / 0 |
| home/tokyo | 16.7 / 16.7 / 16.7 | 16.7 / 16.7 / 16.7 | 16.8 / 16.8 / 16.8 | 60.0 / 60.0 / 60.0 | 0 / 0 / 0 |
| home/volcanic-crown | 16.7 / 16.7 / 16.7 | 16.8 / 16.8 / 16.7 | 16.8 / 16.8 / 16.8 | 60.0 / 60.0 / 60.0 | 0 / 0 / 0 |
| racing/coast | 16.7 / 16.7 / 16.7 | 16.7 / 16.8 / 16.8 | 16.8 / 16.8 / 16.8 | 60.0 / 60.0 / 60.0 | 0 / 0 / 0 |
| racing/neon | 16.7 / 16.7 / 16.7 | 16.8 / 16.8 / 16.8 | 16.8 / 16.8 / 16.8 | 60.0 / 60.0 / 60.0 | 0 / 0 / 0 |
| racing/taipei | 16.7 / 16.7 / 16.7 | 16.8 / 16.8 / 16.7 | 16.8 / 16.8 / 16.8 | 60.0 / 60.0 / 60.0 | 0 / 0 / 0 |
| racing/tokyo | 16.7 / 16.7 / 16.7 | 16.7 / 16.8 / 16.7 | 16.8 / 16.8 / 16.8 | 60.0 / 60.0 / 60.0 | 0 / 0 / 0 |
| racing/volcanic-crown | 16.7 / 16.7 / 16.7 | 16.7 / 16.7 / 16.8 | 16.8 / 16.8 / 16.8 | 60.0 / 60.0 / 60.0 | 0 / 0 / 0 |
| showcase/volcanic-crown | 16.7 / 16.7 / 16.7 | 16.7 / 16.8 / 16.7 | 16.8 / 16.8 / 16.8 | 60.0 / 60.0 / 60.0 | 0 / 0 / 0 |

### Renderer load counters (latest frame, A / B / C)

| Scene | draw calls | triangles | geometries | textures | programs |
| --- | --- | --- | --- | --- | --- |
| home/alpine | 313 / 313 / 307 | 80247 / 80247 / 80117 | 508 / 508 / 511 | 51 / 51 / 50 | 99 / 99 / 98 |
| home/aurora | 282 / 282 / 209 | 86479 / 86479 / 86817 | 468 / 468 / 468 | 51 / 51 / 50 | 97 / 97 / 96 |
| home/canyon | 221 / 221 / 207 | 90125 / 90125 / 90499 | 468 / 468 / 468 | 49 / 49 / 48 | 97 / 97 / 96 |
| home/coast | 195 / 195 / 193 | 428999 / 428999 / 428869 | 499 / 499 / 499 | 69 / 69 / 68 | 106 / 106 / 105 |
| home/coastal | 224 / 224 / 219 | 71837 / 71837 / 71707 | 507 / 507 / 511 | 50 / 50 / 49 | 98 / 98 / 97 |
| home/cosmic | 242 / 242 / 236 | 74175 / 74175 / 74045 | 477 / 477 / 482 | 50 / 50 / 49 | 97 / 97 / 96 |
| home/dune-tempest | 143 / 143 / 141 | 34233 / 34233 / 34103 | 678 / 678 / 678 | 47 / 47 / 46 | 98 / 98 / 97 |
| home/frostbite-canyon | 229 / 229 / 227 | 86087 / 86087 / 85957 | 468 / 468 / 468 | 50 / 50 / 49 | 97 / 97 / 96 |
| home/harbor-circuit | 179 / 179 / 177 | 78881 / 78881 / 78751 | 468 / 468 / 468 | 47 / 47 / 46 | 97 / 97 / 96 |
| home/monsoon-ruins | 294 / 294 / 258 | 135681 / 135681 / 135761 | 1670 / 1670 / 1021 | 48 / 48 / 47 | 100 / 100 / 99 |
| home/neon | 232 / 232 / 230 | 265352 / 265352 / 265222 | 533 / 533 / 533 | 71 / 71 / 70 | 109 / 109 / 108 |
| home/skyfall-archipelago | 171 / 171 / 169 | 35217 / 35217 / 35087 | 494 / 494 / 494 | 47 / 47 / 46 | 97 / 97 / 96 |
| home/spiral | n/a / n/a / 219 | n/a / n/a / 108891 | n/a / n/a / 497 | n/a / n/a / 58 | n/a / n/a / 102 |
| home/stormline-megacity | 243 / 243 / 241 | 55549 / 55549 / 55419 | 897 / 897 / 897 | 48 / 48 / 47 | 100 / 100 / 99 |
| home/taipei | 471 / 471 / 344 | 102685 / 102685 / 102555 | 476 / 476 / 483 | 50 / 50 / 49 | 97 / 97 / 96 |
| home/tokyo | 305 / 305 / 247 | 76219 / 76219 / 76089 | 474 / 474 / 479 | 50 / 50 / 49 | 97 / 97 / 96 |
| home/volcanic-crown | 184 / 184 / 182 | 50907 / 50907 / 50777 | 1062 / 1062 / 1062 | 48 / 48 / 47 | 99 / 99 / 99 |
| racing/alpine | 411 / 412 / 410 | 92657 / 92913 / 92891 | 502 / 502 / 505 | 51 / 51 / 50 | 99 / 99 / 98 |
| racing/aurora | 399 / 399 / 285 | 90097 / 90107 / 90181 | 468 / 468 / 468 | 51 / 51 / 50 | 97 / 97 / 96 |
| racing/canyon | 295 / 295 / 224 | 79119 / 79065 / 79129 | 468 / 468 / 468 | 49 / 49 / 48 | 97 / 97 / 96 |
| racing/coast | 247 / 246 / 245 | 428646 / 428496 / 428954 | 499 / 499 / 499 | 69 / 69 / 68 | 106 / 106 / 105 |
| racing/coastal | 404 / 404 / 401 | 88925 / 88803 / 88449 | 502 / 502 / 506 | 50 / 50 / 49 | 98 / 98 / 97 |
| racing/cosmic | 355 / 354 / 351 | 83693 / 83421 / 83709 | 477 / 477 / 482 | 50 / 50 / 49 | 97 / 97 / 96 |
| racing/dune-tempest | 285 / 285 / 284 | 88271 / 88323 / 88557 | 680 / 680 / 680 | 47 / 47 / 46 | 98 / 98 / 97 |
| racing/frostbite-canyon | 224 / 237 / 235 | 78193 / 79791 / 79481 | 468 / 468 / 468 | 50 / 50 / 49 | 97 / 97 / 96 |
| racing/harbor-circuit | 249 / 250 / 248 | 108805 / 109389 / 109059 | 468 / 468 / 468 | 47 / 47 / 46 | 97 / 97 / 96 |
| racing/monsoon-ruins | 368 / 353 / 268 | 153987 / 150953 / 150771 | 1670 / 1670 / 1021 | 48 / 48 / 47 | 100 / 100 / 99 |
| racing/neon | 282 / 283 / 281 | 260873 / 261367 / 261469 | 533 / 533 / 533 | 71 / 71 / 70 | 109 / 109 / 108 |
| racing/skyfall-archipelago | 265 / 265 / 263 | 66689 / 66577 / 66529 | 494 / 494 / 494 | 47 / 47 / 46 | 97 / 97 / 96 |
| racing/spiral | n/a / n/a / 216 | n/a / n/a / 88544 | n/a / n/a / 497 | n/a / n/a / 58 | n/a / n/a / 102 |
| racing/stormline-megacity | 358 / 358 / 356 | 66745 / 66745 / 66423 | 897 / 897 / 897 | 48 / 48 / 47 | 100 / 100 / 99 |
| racing/taipei | 623 / 623 / 477 | 112745 / 112755 / 112707 | 476 / 476 / 483 | 50 / 50 / 49 | 97 / 97 / 96 |
| racing/tokyo | 472 / 471 / 456 | 89211 / 88891 / 88813 | 474 / 474 / 479 | 50 / 50 / 49 | 97 / 97 / 96 |
| racing/volcanic-crown | 335 / 334 / 324 | 64129 / 64083 / 63889 | 1062 / 1062 / 1062 | 48 / 48 / 47 | 99 / 99 / 99 |
| showcase/dune-tempest | 134 / 134 / 132 | 33023 / 33023 / 32893 | 100 / 100 / 100 | 21 / 21 / 20 | 33 / 33 / 32 |
| showcase/frostbite-canyon | 143 / 143 / 141 | 75159 / 75159 / 75029 | 104 / 104 / 104 | 21 / 21 / 20 | 41 / 41 / 40 |
| showcase/monsoon-ruins | 161 / 161 / 159 | 48227 / 48227 / 48097 | 128 / 128 / 128 | 21 / 21 / 20 | 35 / 35 / 34 |
| showcase/skyfall-archipelago | 143 / 143 / 141 | 50467 / 50467 / 50337 | 109 / 109 / 109 | 21 / 21 / 20 | 35 / 35 / 34 |
| showcase/stormline-megacity | 163 / 163 / 161 | 30643 / 30643 / 30513 | 106 / 106 / 106 | 21 / 21 / 20 | 32 / 32 / 31 |
| showcase/volcanic-crown | 139 / 139 / 137 | 30137 / 30137 / 30007 | 98 / 98 / 98 | 21 / 21 / 20 | 34 / 34 / 33 |

### Particle buffer upload (node vfx-buffer-bench, 600 frames)

| Row | bytes/frame A / B / C | C vs A | upload calls/frame A / B / C | CPU ms/frame A / B / C | digests equal |
| --- | --- | --- | --- | --- | --- |
| driving | 58229 / 58229 / 4494 | -92% | 26.8 / 26.8 / 8.8 | 0.07 / 0.06 / 0.05 | yes |
| boost | 58204 / 58204 / 14286 | -75% | 27.1 / 27.1 / 15.1 | 0.05 / 0.05 / 0.06 | yes |
| nitro | 58209 / 58209 / 14472 | -75% | 27.4 / 27.4 / 21.2 | 0.07 / 0.04 / 0.05 | yes |
| drift-chain | 58518 / 58518 / 7686 | -87% | 29.7 / 29.7 / 18.2 | 0.05 / 0.05 / 0.04 | yes |
| multi-car-flight | 58235 / 58235 / 26772 | -54% | 26.6 / 26.6 / 14.6 | 0.07 / 0.07 / 0.08 | yes |
| pickups-impacts | 58229 / 58229 / 20208 | -65% | 26.8 / 26.8 / 18.3 | 0.05 / 0.05 / 0.05 | yes |
| garage-preview | 58368 / 58368 / 11321 | -81% | 27.0 / 27.0 / 21.2 | 0.05 / 0.05 / 0.04 | yes |
| launch-countdown | 58066 / 58066 / 4187 | -93% | 26.2 / 26.2 / 8.2 | 0.04 / 0.04 / 0.04 | yes |
| idle-after-burst | 58252 / 58252 / 5000 | -91% | 26.5 / 26.5 / 9.1 | 0.04 / 0.04 / 0.04 | yes |

### Real app, production build (median (min-max) of rounds)

| Metric | A | B | C |
| --- | --- | --- | --- |
| Load: Start button enabled (ms) | 627 (506-643) | 572 (566-670) | 505 (466-507) |
| Load: first WebGL draw (ms) | 129 (121-144) | 152 (139-197) | 127 (119-138) |
| Home: rendered frames/s | 60.0 (59.8-60.0) | 60.1 (60.0-60.1) | 60.0 (60.0-60.1) |
| Home: draws/frame | 199 (199-199) | 199 (199-199) | 197 (197-197) |
| Home: bufferSubData bytes/s | 4509481 (4499483-4510625) | 4519402 (4509737-4520410) | 2437043 (2434995-2440580) |
| Home: main-thread busy | 0.206 (0.181-0.209) | 0.203 (0.177-0.203) | 0.205 (0.187-0.220) |
| Home: JS heap MB | 41.5 (35.6-46.1) | 50.8 (35.5-60.0) | 35.2 (34.6-38.0) |
| Race: rendered frames/s | 60.0 (59.9-60.1) | 59.9 (59.9-60.0) | 59.9 (59.9-59.9) |
| Race: rAF interval p50 ms | 16.7 (16.7-16.7) | 16.7 (16.7-16.7) | 16.7 (16.7-16.7) |
| Race: rAF interval p95 ms | 16.7 (16.7-16.8) | 16.7 (16.7-16.8) | 16.7 (16.7-16.8) |
| Race: rAF interval p99 ms | 16.8 (16.8-16.8) | 16.8 (16.8-16.8) | 16.8 (16.8-16.8) |
| Race: frames > 33 ms (15 s) | 0 (0-1) | 0 (0-1) | 0 (0-1) |
| Race: frames > 50 ms (15 s) | 0 (0-0) | 0 (0-0) | 0 (0-0) |
| Race: draws/frame | 265 (263-265) | 226 (226-226) | 225 (224-226) |
| Race: bufferSubData bytes/frame | 66640 (66640-66640) | 66832 (66832-66832) | 29696 (29648-29744) |
| Race: bufferSubData bytes/s | 5098550 (5094344-5107111) | 5085311 (5082942-5089922) | 2787623 (2787120-2788924) |
| Race: texture upload bytes/s | 139949 (139829-139976) | 139968 (139900-139979) | 139958 (139881-139982) |
| Race: main-thread busy | 0.287 (0.260-0.293) | 0.332 (0.267-0.351) | 0.264 (0.232-0.354) |
| Race: script busy | 0.178 (0.160-0.183) | 0.203 (0.163-0.215) | 0.163 (0.145-0.217) |
| Race: JS heap MB | 42.9 (33.8-54.1) | 41.3 (34.2-51.1) | 44.6 (31.6-45.7) |
| Race: heap change over 15 s MB | 2.2 (-1.9-18.9) | 6.3 (-6.9-8.6) | -6.1 (-16.4--3.9) |
| Paused: rendered frames/s (idle render count) | 60.0 (59.9-60.0) | 60.0 (59.9-60.0) | 0.0 (0.0-0.0) |
| Paused: main-thread busy | 0.185 (0.177-0.223) | 0.205 (0.198-0.224) | 0.039 (0.036-0.040) |
| Paused: script busy | 0.147 (0.139-0.176) | 0.163 (0.153-0.178) | 0.008 (0.007-0.008) |
| Page errors | 0 (0-0) | 0 (0-0) | 0 (0-0) |

### CPU simulation, 8-car race (node course-race-bench, median (min-max) of rounds)

| Metric | A | B | C |
| --- | --- | --- | --- |
| coast.meanUs | 73.2 (68.0-78.0) | 88.8 (71.8-205.1) | 79.7 (71.4-255.5) |
| coast.p95Us | 136.5 (109.2-162.5) | 190.3 (125.4-385.5) | 175.9 (119.3-613.3) |
| dune.meanUs | 380.7 (375.9-462.3) | 517.4 (409.6-635.8) | 319.0 (237.8-382.6) |
| dune.p95Us | 507.2 (450.7-926.4) | 994.3 (594.3-1271.5) | 675.3 (321.8-837.6) |
| coast.heapBytesPerFrame | 1797.0 (1579.0-3178.0) | 2876.0 (1800.0-3335.0) | 2673.0 (2625.0-3509.0) |
| dune.heapBytesPerFrame | 997.0 (655.0-2076.0) | 1610.0 (1425.0-2017.0) | 1933.0 (1374.0-2085.0) |

### Visual fidelity

| Scene | Canvas | Max channel delta | Pixels > 8 | PSNR dB | C repeat max | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| m-home-coast | 585x1266 | 1 | 0 (0.000%) | 62.3 | 0 | `final-report/visual/m-home-coast.webp` |
| m-home-tokyo | 585x1266 | 143 | 179 (0.024%) | 49.5 | 0 | `final-report/visual/m-home-tokyo.webp` |
| m-showcase-volcanic-crown | 585x1266 | 1 | 0 (0.000%) | 64.8 | 0 | `final-report/visual/m-showcase-volcanic-crown.webp` |
| m-showcase-frostbite-canyon | 585x1266 | 1 | 0 (0.000%) | 63.1 | 0 | `final-report/visual/m-showcase-frostbite-canyon.webp` |
| m-garage-high | 585x1266 | 1 | 0 (0.000%) | 65.1 | 0 | `final-report/visual/m-garage-high.webp` |
| m-garage-ultra | 585x1266 | 1 | 0 (0.000%) | 65.1 | 0 | `final-report/visual/m-garage-ultra.webp` |
| m-race-coast-high | 585x1266 | 1 | 0 (0.000%) | 61.6 | 0 | `final-report/visual/m-race-coast-high.webp` |
| m-race-tokyo-high | 585x1266 | 225 | 7412 (1.001%) | 32.9 | 0 | `final-report/visual/m-race-tokyo-high.webp` |
| m-race-taipei-high | 585x1266 | 229 | 12561 (1.696%) | 33.0 | 0 | `final-report/visual/m-race-taipei-high.webp` |
| m-race-neon-ultra | 585x1266 | 1 | 0 (0.000%) | 62.9 | 0 | `final-report/visual/m-race-neon-ultra.webp` |
| m-race-volcanic-crown-ultra | 585x1266 | 219 | 26011 (3.512%) | 36.6 | 0 | `final-report/visual/m-race-volcanic-crown-ultra.webp` |
| m-photo-tokyo | 585x1266 | 62 | 15 (0.002%) | 64.8 | 0 | `final-report/visual/m-photo-tokyo.webp` |
| m-results-coast | 585x1266 | 1 | 0 (0.000%) | 61.7 | 0 | `final-report/visual/m-results-coast.webp` |
| d-home-coast | 1440x900 | 7 | 0 (0.000%) | 61.4 | 0 | `final-report/visual/d-home-coast.webp` |
| d-showcase-frostbite-canyon | 1440x900 | 1 | 0 (0.000%) | 62.5 | 0 | `final-report/visual/d-showcase-frostbite-canyon.webp` |
| d-garage-ultra | 1440x900 | 1 | 0 (0.000%) | 64.1 | 0 | `final-report/visual/d-garage-ultra.webp` |
| d-race-tokyo-high | 1440x900 | 229 | 22401 (1.728%) | 30.9 | 0 | `final-report/visual/d-race-tokyo-high.webp` |
| d-race-volcanic-crown-ultra | 1440x900 | 208 | 38027 (2.934%) | 36.3 | 0 | `final-report/visual/d-race-volcanic-crown-ultra.webp` |
| d-photo-tokyo | 1440x900 | 96 | 53 (0.004%) | 63.7 | 0 | `final-report/visual/d-photo-tokyo.webp` |
| d-results-coast | 1440x900 | 1 | 0 (0.000%) | 61.8 | 0 | `final-report/visual/d-results-coast.webp` |

<!-- tables:end -->

Reading the tables:

- **FPS and stutter.** Every build delivers 60 FPS with a 16.7 ms p50 and 16.8 ms p99 interval, in the fixture and in the
  real app, with 0 stalls and 0 frames over 50 ms. This display is 60 Hz and the machine is fast, so frame rate cannot
  show a difference here; GPU and CPU time are the comparison.
- **Idle render count.** A paused race renders 0.0 frames/s on C against 60.0 on A and B. Main-thread busy time
  while paused falls from 18.5% to 3.9%, script time from 14.7% to 0.8%.
- **Loading.** First WebGL draw 129 / 152 / 127 ms on A / B / C; Start button enabled 627 / 572 / 505 ms. Rounds of
  one build differ by up to 150 ms, so no load change is claimed.
- **Real-app race.** Draws per frame 265 / 226 / 225: the default race scene lost its extra draws in develop (A to
  B), not in this program. Race main-thread busy is 29% / 33% / 26%, within the round spread.
- **JS heap.** 31-60 MB on all builds. The 15-second heap change swings between -16 and +19 MB from round to round
  (GC timing), so no leak or saving is claimed; the 15-minute soak below shows a flat trend.
- **CPU simulation (node).** Coast mean 73 / 89 / 80 us and Dune mean 381 / 517 / 319 us, but one build varies up to
  3x between rounds (C Coast 71-256 us), so no CPU simulation change is claimed. The bench's own CPU budget check
  failed (exit 1) on A and B in every round and on C in one of three; the data was kept.

Wave 3 re-run (C = `8e5f4cf6`): the composites linked below now show this run; its numbers are the generated
"Visual fidelity" table above. Against the first pass, racing Coast and Neon now **PASS** (max delta 1); Taipei,
Tokyo, Volcanic Crown and Photo keep the RNG-only and develop-origin differences explained below (Photo Tokyo
now 15 pixels over 8, from 2223). The Wave 3 gate itself, candidate against the pre-merge integration head
`e8e8d48b`, is 20 of 20 scenes at max delta 0 (items 31 and 32, and the bridge-tower id fix in
performance-review.md).

The first pass used one shared `Math.random` stream and C as merged (1fcfa98a), before the fix below.
Home, showcase, Garage (High and Ultra), Results and desktop Home **PASS** there (max channel delta 1 or less; desktop
Home 7, equal to its own C repeat, from the animated sky; PSNR about 65 dB). Tokyo Home (179 px, 0.024%) is faint edge
anti-aliasing on the Tokyo Tower that workstream 11 merged into one mesh; it was not re-run and stays **UNVERIFIED**
as equivalent. The racing and Photo rows were re-tested as follows.

### RNG-isolated re-test (racing and Photo)

Probe: `scripts/final-report/visual-rng.mjs` with `scripts/final-report/visual-rng.html`, same fake clocks, seed,
input, viewports and readback as above, with three changes:

1. **One random stream per call site.** `Math.random` is replaced by a separate mulberry32 stream for each calling
   function (name and module path, no line numbers), and every stream restarts at GO. A draw made somewhere else, such
   as three's `generateUUID` for an object only one build creates, can no longer move a particle system's numbers.
2. **Census.** It counts the draws per call site while racing. Equal counts mean both builds asked for the same numbers
   in the same places. They are equal in all nine scenes (for example Tokyo racing 8321 / 8321). The only differing
   keys are three's `generateUUID`, whose key includes the Vite dependency chunk hash, which differs between
   checkouts. Its counts are also equal (Tokyo 7020 / 7020).
3. **Attribution.** `hide=` re-renders the captured frame without chosen parts (particles, sprites, additive,
   transparent, by name, opaque, lens effects, full attribute upload). `watch:` records the world matrix and material
   of matching objects, and the page records the transparent draw order.

Each scene renders base, candidate, and candidate again (the determinism floor; it is 0 in every row below). B
(develop, 32b82da7) is the attribution baseline: C minus B is the program, B minus A is develop.

| Scene | A vs C, pixels > 8 (max) | B vs C, pixels > 8 (max) | Verdict |
| --- | --- | --- | --- |
| m-race-coast-high | 0 (1) | 0 (1) | **DOWNGRADE, fixed**: now EQUIVALENT (see 1) |
| m-race-neon-ultra | 0 (1) | 0 (4) | EQUIVALENT |
| m-race-tokyo-high | 1799 (120) | 92 (32) | **RNG-ONLY (proven)** for the program part (see 2); the rest is DEVELOP-ORIGIN (see 3) |
| m-race-taipei-high | 313 (67) | 108 (32) | **RNG-ONLY (proven)** for the program part; the rest is DEVELOP-ORIGIN |
| m-race-volcanic-crown-ultra | 26210 (219) | 116 (35) | **RNG-ONLY (proven)** for the program part; the rest is DEVELOP-ORIGIN |
| d-race-tokyo-high | 2849 (101) | 86 (31) | **RNG-ONLY**: same strip and same cause; the cue values were checked on mobile only |
| d-race-volcanic-crown-ultra | 37684 (208) | 90 (34) | **RNG-ONLY**: same strip and same cause; the cue values were checked on mobile only |
| m-photo-tokyo | 15 (62) | 0 (1) | EQUIVALENT to develop; A to B is DEVELOP-ORIGIN |
| d-photo-tokyo | 53 (96) | 0 (1) | EQUIVALENT to develop; A to B is DEVELOP-ORIGIN |

All columns use the fixed C. Evidence:

- A vs C: [`visual/rng/visual-rng.json`](final-report/visual/rng/visual-rng.json) and `all.log`.
- B vs C: [`visual/rng/BvsC/visual-rng.json`](final-report/visual/rng/BvsC/visual-rng.json) and `all.log`.
- Bisect runs: `visual-rng-hide-*.json` and `bisect.log` in both folders.

Findings:

1. **Rear-diffuser glow (every racing scene; the only difference on Coast): a real downgrade in C, now fixed.**
   - **What was wrong.** The earlier "nitro sparks, shifted random stream" explanation was wrong. The blob was still
     there with per-site streams: Coast A vs C max 65, 3408 px. In the differing pixels C was darker (mean 124.4 to
     103.5), so the glow was lost, not moved.
   - **Bisect.** Hiding the additive parts leaves max 1. Hiding the dash ribbon alone leaves max 1. Hiding particles
     changes nothing.
   - **Cause.** The recorded draw order shows C drew the additive `Continuous dash ribbon` *before* the car's
     normal-blended transparent parts, so the car's paint covered the part of the trail in front of it. A drew the
     ribbon after them.
     - three sorts transparent items by `renderOrder`, then by the depth of the geometry's bounding sphere, and
       computes that sphere only once, at the first draw.
     - In A, `src/aero-wake-meshes.js` rewrote every ribbon slot each frame, so that frozen sphere sat at the floating
       origin offset.
     - In C, the live-span upload leaves dead slots at zero. The sphere freezes at the render-space origin, next to the
       car, and the ribbon now sorts in front of the car.
   - **Fix** (TDD). The ribbon now has `renderOrder = 1`, so it draws after the car's normal-blended transparent parts
     whatever its stale sphere says.
     - The only other objects with `renderOrder = 1` (sprint road glow, grace-fade shell) are additive too, so their
       order relative to the ribbon does not change the image.
     - RED: the new test in `tests/aero-vfx.test.js` sorts a real `WebGLRenderList` and got
       `['Continuous dash ribbon', 'car paint']`. GREEN: 28 / 28 pass.
   - **After the fix.** Coast A vs C is max 1, 0 px. The transparent draw order matches A in all nine scenes.
   - **Proof the fix restores A.** `hide=ribbon-order-0` puts back the unfixed sort in the fixed build, and the 3408 px
     difference returns: `visual-rng-hide-ribbon-order-0-m-race-coast.json`.
2. **Rival BOOST flame size (B vs C strip of 86 to 116 px in Tokyo, Taipei and Volcanic Crown): RNG-ONLY, proven.**
   - **Bisect.** Hiding `name:rival` leaves max 1 (`BvsC/visual-rng-hide-name:rival-m-race-taipei.json`).
   - **What differs.** `watch:rival nitro` shows the three `Rival NITRO flame` sprites with identical position,
     opacity, colour and material in both builds. Only the scale differs.
   - **Cause.** The scale comes from `rivalDriveCue`. Its flicker phase is `car.id * 1.7`, and three's `Object3D.id` is
     a creation counter. C creates one Object3D fewer before the rivals, so every rival id is one lower (504/574/680
     in B, 503/573/679 in C).
   - **Check.** `scripts/final-report/rival-flicker-phase.mjs` recomputes `rivalDriveCue` from each recorded parent id
     and the race time (t = 2.000 s in both builds).
     - It reproduces all 18 recorded flames within 4 dp rounding (worst error 0.00011).
     - Swapping in the other build's id reproduces the other build's value exactly.
     - Log: [`BvsC/rival-flicker-phase.log`](final-report/visual/rng/BvsC/rival-flicker-phase.log).
   - **Why this is not a downgrade.** The flicker amplitude, range and distribution are unchanged; only which point of
     the same flicker the frame catches differs. The flames are dimmer than B at this instant because of the phase,
     not lost.
3. **Volcanic Crown wireframe, the larger Tokyo and Taipei differences, and Photo m/d: DEVELOP-ORIGIN.**
   - Against B, C differs only by item 2. So everything else in A vs C is the A to B change on develop: Volcanic 26210
     to 116 px (mobile) and 37684 to 90 px (desktop), Tokyo 1799 to 92 px, Taipei 313 to 108 px, Photo 15 and 53 to 0
     px.
   - Develop's rival flame change (`BOOST_FLAME` 0.65 to 0.55 between A and B) is part of this.
   - Develop-origin differences are outside this program's zero-downgrade scope and were not reviewed as intended or
     not.
4. **Particles and embers.** With per-site streams and equal census counts, they are not a visible difference in any
   scene: hiding particles never changes a residual. The earlier "particle positions moved" finding was the shared
   stream, as claimed. It is now shown in the browser, not only by the `vfx-buffer-bench` digests.

Verdict: **PASS (zero visual downgrade from the program) after the dash ribbon fix**, LOCAL-CHROME, Apple M4 ANGLE
Metal only.

UNVERIFIED:

- Tokyo Home edge anti-aliasing (not re-run).
- Desktop rival flame values (pixels bisected on mobile; same strip geometry and the same ids are expected).
- Other GPUs, browsers and devices.
- Tiers other than High/Ultra.
- Scenes outside the nine listed.
- The composites in the table above still show the unfixed C. They were not regenerated.
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
