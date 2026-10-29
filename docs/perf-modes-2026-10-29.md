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
| D | both fixes 844e0ad | 16.7 | 33.4 | 51.7 |
| D | main 0a08d02 | 16.7 | 33.4 | 51.4 |
| E | both fixes 844e0ad | 16.7 | 16.8 | 57.2 |
| E | first fix only 0b00515 | 16.7 | 33.4 | 48.2 |

**Cause.** A sourcemapped CPU profile (10 s, same conditions) traced most `getAnimations` self time to one line.
- **Where:** `updateCallout` in `src/race-hud.ts`. With no callout on screen it called `getAnimations()` on every HUD tick, which forces a style recalculation.
- **Cost:** 356 ms on main and 909 ms on integration.
- **Not the cause:** draw calls are the same, and DOM writes per second are about the same.

**Fix.** `createAnimationGate` in `src/hud-dom.ts` reads a node's animations only after it has started one.
- **Test:** `tests/hud-dom.test.js` counts the reads. It was RED before the fix and GREEN after.
- **Result:** fps rose about 22% against the pre-fix build (run B), and p95 now matches main (run C).
- **Open after this fix:** main still led by about 19% fps in run C, so a second per-frame cost remained.

**Second cause.** It was not draws, JS or uploads.
- **Ruled out:** WebGL calls per frame were equal (about 410 draws, 61–63 `useProgram`, no texture uploads), and JS self time per function was equal.
- **Where:** the timeline showed each style recalculation restyling about 107 elements, against 19 on main.
- **Culprit:** invalidation tracking named `body:has(#photo-screen[open]) #app > :not(#world):not(#photo-screen)` from Photo Studio. Its "everything but" subject gives Chrome no class to scope the work, so any DOM change restyles the whole page.
- **Confirmation:** deleting only that rule at runtime brought recalcs back to 20 elements.

**Second fix.** Photo Studio sets `body.photo-studio` on open and drops it when the dialog hides: Close button, Escape (`cancel`), with `close` as a backstop.
- **Guard:** `tests/page-utilities.test.js` fails on any body-level `:has()` rule whose subject names no class or id. It was RED on exactly that selector.
- **Result:** desktop fps now matches main (run D) and beats the first fix alone (run E).
- **Commits:** 844e0ad and 332d3b5. 332d3b5 changes only when the class comes off, not the CSS that was measured.
