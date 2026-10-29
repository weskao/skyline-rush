# New-content performance evidence (2026-10-29)

Evidence for TODO 13C C5 (new content vs Classic) and 1792 (desktop before/after). All numbers come from
desktop Chrome with **software WebGL and a 6× CPU throttle** on one Mac. They are not physical-device,
GPU, thermal or battery measurements. Frame times snap to vsync (16.7 / 33.3 / 50 ms), so p95 only says a
frame was missed; fps is the finer signal. Compare rows only within the same table: machine load
differed between runs.

## C5 — new content vs Classic (`make perf-modes`)

Commit 94f4826. Phone 412×915 @2x touch, RATE 6, ROUNDS 3, Vite dev server, medians. Every scenario
drove its full 20 s with no page errors.

| Scenario | p50 ms | p95 ms | fps | Draw calls | Triangles |
|---|---:|---:|---:|---:|---:|
| Classic Coast | 16.7 | 50.0 | 39.1 | 551 | 79,053 |
| Custom Coast, themes + extreme | 16.7 | 50.0 | 41.4 | 534 | 78,327 |
| Obstacle Run, mixed | 16.7 | 33.4 | 46.5 | 235 | 70,043 |
| Endless at 20 km (teleported) | 16.7 | 33.4 | 46.9 | 601 | 82,479 |

No scenario's p95 exceeds Classic by more than 15%.
- Obstacle Run draws less because Gauntlet has no rivals or traffic.
- Endless was teleported to 20 km. It shows the draw cost at that distance, not resources built up over a real 20 km drive.

## 1792 — desktop regression and fix (`make perf BASE=… VIEWPORT=desktop ROUNDS=5`)

Production builds, 1440×900, median of 5 alternating rounds.

| Run | Build | p50 ms | p95 ms | fps |
|---|---|---:|---:|---:|
| A | integration b6059fb | 33.3 | 50.1 | 29.7 |
| A | main 0a08d02 | 16.7 | 33.4 | 46.2 |
| B | before fix 6d1d521 | 33.4 | 66.6 | 27.3 |
| B | after fix 0b00515 | 33.3 | 50.0 | 33.3 |
| C | after fix 0b00515 | 16.7 | 33.4 | 44.8 |
| C | main 0a08d02 | 16.7 | 33.3 | 55.2 |

**Cause.** A sourcemapped CPU profile (10 s, same conditions) traced most `getAnimations` self time to one line.
- **Where:** `updateCallout` in `src/race-hud.ts`. With no callout on screen it called `getAnimations()` on every HUD tick, which forces a style recalculation.
- **Cost:** 356 ms on main and 909 ms on integration.
- **Not the cause:** draw calls are the same, and DOM writes per second are about the same.

**Fix.** `createAnimationGate` in `src/hud-dom.ts` reads a node's animations only after it has started one.
- **Test:** `tests/hud-dom.test.js` counts the reads. It was RED before the fix and GREEN after.
- **Result:** fps rose about 22% against the pre-fix build (run B), and p95 now matches main (run C).
- **Open:** main still leads by about 19% fps in run C, so another per-frame cost remains.
