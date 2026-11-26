# Baseline measurement set (Wave 0)

- Evidence class: **local-chromium** (see `../README.md` "Evidence classes"). Not software-WebGL CI, not a physical-device result.
- Code: merge commit `61728485` (Wave 0 + develop `a9fed6f1`). Diagnostics only; selected graphics and 60 Hz physics are unchanged
  relative to base `d9c144ba`, which has no probe of its own, so this is the baseline Wave 1 compares against.
- Environment: Google Chrome 158 via Playwright (`channel: chrome`), macOS 27 arm64. The GPU backend was not verified
  (the timer query reported `available`); treat as an unverified, probably hardware, GPU. No temperature, power or thermal data.
- Settings: `node scripts/thermal-baseline.mjs` (all 40 scenarios), `THERMAL_FRAMES=180 THERMAL_VIEWPORT=390x844 THERMAL_DPR=3`,
  High quality (render DPR 1.5, 585x1266 target, MSAA 4), fixed 60 FPS target, render scale 1, seed 12345, fixed throttle/boost input,
  60 warmup ticks. Racing advances 180-253 m in 180 ticks. Each scenario is a fresh page.
- Data: [`61728485-390x844-dpr3-local-chromium.json`](61728485-390x844-dpr3-local-chromium.json), the input of
  `node scripts/thermal-compare.mjs <this file> <after.json>`.
- Reading the numbers:
  - Frame interval is pinned at the 16.7 ms display refresh (vsync); it cannot show a gain until the frame misses 60 FPS.
  - Draw calls, triangles and resource counts are deterministic (A/A repeat: identical, drawCalls differ by 1 once). They are the
    primary Before/After evidence; they are counters, not GPU time or bytes.
  - CPU times and GPU times are noisy. A/A repeat of the same build (2 runs, priority tracks): CPU submission p50 +12% to +52%,
    GPU frame p50 -5% to +83%. A Wave 1 timing claim needs 3+ alternating rounds and a delta larger than this spread.
  - GPU frame/pass samples are taken every 15th frame: n=5 per 180 ticks, too few for a meaningful p95/p99 (p95 shown is
    near the max). Use `THERMAL_FRAMES=900` or more when a GPU number is the claim.
  - CPU simulation reads 0.00 for `home` because no simulation step runs there; it is not a measured improvement.

Columns: draw calls, triangles, geometries/textures/programs, CPU sim p50 ms, CPU submission p50/p95 ms,
frame interval p50/p95 ms, GPU full composer p50 ms (n samples).

| Phase | Track | Draws | Triangles | Geo/Tex/Prog | CPU sim | CPU submit | Frame | GPU frame |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| home | volcanic-crown | 184 | 50907 | 1062/48/99 | 0.00 | 2.50 / 3.30 | 16.70 / 16.80 | 5.58 (n=5) |
| racing | volcanic-crown | 335 | 64129 | 1062/48/99 | 0.10 | 2.90 / 4.00 | 16.70 / 16.70 | 5.51 (n=5) |
| home | taipei | 471 | 102685 | 476/50/97 | 0.00 | 2.60 / 3.90 | 16.70 / 16.80 | 4.28 (n=5) |
| racing | taipei | 623 | 112755 | 476/50/97 | 0.10 | 3.20 / 4.40 | 16.70 / 16.80 | 5.55 (n=5) |
| home | tokyo | 305 | 76219 | 474/50/97 | 0.00 | 2.50 / 3.60 | 16.70 / 16.70 | 4.14 (n=5) |
| racing | tokyo | 472 | 89211 | 474/50/97 | 0.20 | 3.00 / 3.80 | 16.70 / 16.70 | 5.14 (n=5) |
| home | coast | 195 | 428999 | 499/69/106 | 0.00 | 1.90 / 4.20 | 16.70 / 16.80 | 5.42 (n=5) |
| racing | coast | 247 | 429068 | 499/69/106 | 0.10 | 2.30 / 3.60 | 16.70 / 16.70 | 5.09 (n=5) |
| home | neon | 232 | 265352 | 533/71/109 | 0.00 | 2.50 / 3.50 | 16.70 / 16.70 | 5.48 (n=5) |
| racing | neon | 282 | 260951 | 533/71/109 | 0.20 | 2.80 / 3.80 | 16.70 / 16.80 | 5.97 (n=5) |
| home | canyon | 221 | 90125 | 468/49/97 | 0.00 | 2.00 / 2.40 | 16.70 / 16.80 | 4.87 (n=5) |
| racing | canyon | 294 | 78733 | 468/49/97 | 0.10 | 2.10 / 2.80 | 16.70 / 16.80 | 5.20 (n=5) |
| home | aurora | 282 | 86479 | 468/51/97 | 0.00 | 2.00 / 2.30 | 16.70 / 16.70 | 4.56 (n=5) |
| racing | aurora | 399 | 90097 | 468/51/97 | 0.20 | 2.60 / 3.50 | 16.70 / 16.80 | 6.80 (n=5) |
| home | spiral | 221 | 109021 | 497/59/103 | 0.00 | 2.90 / 3.60 | 16.70 / 16.70 | 11.34 (n=5) |
| racing | spiral | 218 | 88376 | 497/59/103 | 0.10 | 2.80 / 3.40 | 16.70 / 16.80 | 6.44 (n=5) |
| home | alpine | 313 | 80247 | 508/51/99 | 0.00 | 2.70 / 3.30 | 16.70 / 16.70 | 7.06 (n=5) |
| racing | alpine | 412 | 92973 | 502/51/99 | 0.10 | 2.80 / 3.40 | 16.70 / 16.80 | 5.86 (n=5) |
| home | coastal | 224 | 71837 | 507/50/98 | 0.00 | 2.30 / 3.00 | 16.70 / 16.80 | 5.53 (n=5) |
| racing | coastal | 404 | 88813 | 502/50/98 | 0.10 | 2.60 / 3.60 | 16.70 / 16.70 | 11.23 (n=5) |
| home | cosmic | 242 | 74175 | 477/50/97 | 0.00 | 2.20 / 2.70 | 16.70 / 16.80 | 4.74 (n=5) |
| racing | cosmic | 354 | 83421 | 477/50/97 | 0.10 | 2.40 / 2.70 | 16.70 / 16.70 | 5.49 (n=5) |
| home | frostbite-canyon | 229 | 86087 | 468/50/97 | 0.00 | 2.60 / 3.60 | 16.70 / 16.80 | 4.45 (n=5) |
| racing | frostbite-canyon | 237 | 79905 | 468/50/97 | 0.10 | 2.60 / 3.40 | 16.70 / 16.70 | 4.91 (n=5) |
| home | stormline-megacity | 243 | 55549 | 897/48/100 | 0.00 | 2.50 / 3.30 | 16.70 / 16.70 | 5.04 (n=5) |
| racing | stormline-megacity | 358 | 66627 | 897/48/100 | 0.20 | 2.70 / 3.30 | 16.70 / 16.80 | 5.06 (n=5) |
| home | monsoon-ruins | 294 | 135681 | 1670/48/100 | 0.00 | 2.90 / 3.70 | 16.70 / 16.80 | 4.95 (n=5) |
| racing | monsoon-ruins | 353 | 150963 | 1670/48/100 | 0.10 | 2.90 / 4.00 | 16.70 / 16.70 | 5.56 (n=5) |
| home | dune-tempest | 143 | 34233 | 678/47/98 | 0.00 | 2.00 / 2.80 | 16.70 / 16.70 | 4.47 (n=5) |
| racing | dune-tempest | 286 | 88579 | 680/47/98 | 0.50 | 2.60 / 3.20 | 16.70 / 16.80 | 5.19 (n=5) |
| home | skyfall-archipelago | 171 | 35217 | 494/47/97 | 0.00 | 2.00 / 3.40 | 16.70 / 16.80 | 5.05 (n=5) |
| racing | skyfall-archipelago | 265 | 66523 | 494/47/97 | 0.40 | 2.00 / 2.60 | 16.70 / 16.70 | 4.94 (n=5) |
| home | harbor-circuit | 179 | 78881 | 468/47/97 | 0.00 | 1.70 / 2.40 | 16.70 / 16.80 | 5.49 (n=5) |
| racing | harbor-circuit | 250 | 109129 | 468/47/97 | 0.10 | 2.10 / 2.40 | 16.70 / 16.80 | 5.90 (n=5) |
| showcase | volcanic-crown | 139 | 30137 | 98/21/34 | 0.00 | 0.70 / 1.10 | 16.70 / 16.80 | 5.10 (n=5) |
| showcase | dune-tempest | 134 | 33023 | 100/21/33 | 0.00 | 0.70 / 1.60 | 16.70 / 16.80 | 4.77 (n=5) |
| showcase | monsoon-ruins | 161 | 48227 | 128/21/35 | 0.00 | 0.80 / 1.20 | 16.70 / 16.70 | 4.92 (n=5) |
| showcase | skyfall-archipelago | 143 | 50467 | 109/21/35 | 0.00 | 0.90 / 1.40 | 16.70 / 16.80 | 7.70 (n=5) |
| showcase | stormline-megacity | 163 | 30643 | 106/21/32 | 0.00 | 0.90 / 1.30 | 16.70 / 16.80 | 4.73 (n=5) |
| showcase | frostbite-canyon | 143 | 75159 | 104/21/41 | 0.00 | 1.00 / 1.60 | 16.70 / 16.70 | 7.19 (n=5) |

Not covered by this probe (separate evidence, see `../README.md`): Countdown, Paused, Results, Garage and Photo Mode are
asserted live by `tests/thermal-baseline-browser.spec.js` (state and diagnostics only, no timing baseline);
5/15/30 minute soak, iPhone/Mac mini temperature, power, fan and thermal state are **UNVERIFIED** (owner waiver of the manual
gate, 2026-11-26, is not a measurement).
