# Three.js r180 baseline — Plan Task 1

Captured 2026-11-05 on branch `feature/3d-visual-fidelity-pipeline` with `three` 0.180.0, before any engine change.
Public-safe: tables only. Screenshots and raw `metrics.json` stay in the gitignored
`docs/designs/3d-pipeline/audits/baseline/r180-{phone,desktop}/`.

## Reproduce (run again after the r186.1 upgrade with `LABEL=r186`)

```sh
THREE_BASELINE=1 LABEL=r180 VIEWPORT=phone   RACE_SECONDS=4 npx playwright test tests/three-baseline-browser.spec.js
THREE_BASELINE=1 LABEL=r180 VIEWPORT=desktop RACE_SECONDS=4 npx playwright test tests/three-baseline-browser.spec.js
make perf VIEWPORT=desktop RATE=6 ROUNDS=3
```

Phone = 412×915 @2x touch; desktop = 1440×900. All ten tracks are unlocked through `localStorage`, Classic mode, default
paint. Each track is driven with `W` for 4 s, then screenshotted; Coast and Sky Spiral also capture NITRO, FLY (airborne) and
the landing. Garage is the home Garage preview.

## RED (compatibility contract)

`tests/three-version-contract.test.js` fails 4/4 at r180 on the intended assertions: `three` is `^0.180.0`, not exactly
`0.186.1`; the lockfile resolves 0.180.0; `@types/three` is not a declared devDependency; `typecheck:ts` and
`typecheck:vue` install `@types/three@0.180.0` on the fly.

## Renderer stats at r180

Draw calls (`renderer.info.render.calls`) and triangles are the last frame. Both **vary run to run** with live traffic and
rival positions (Coast road was 96.6k and 98.8k triangles in two identical phone runs), so judge them with a tolerance
(±10 %). Textures, geometries and programs are the stable invariants; a change there is a real behaviour change.

| Scenario | Phone calls | Phone tris | Desktop calls | Desktop tris | Textures | Geometries | Programs |
|---|---:|---:|---:|---:|---:|---:|---:|
| garage | 143 | 103,691 | 578 | 122,145 | 17 | 534 | 51 |
| coast-road | 498 | 98,823 | 497 | 103,439 | 17 | 534 | 51 |
| coast-nitro | 477 | 101,549 | 486 | 105,785 | 17 | 534 | 51 |
| coast-fly | 461 | 100,905 | 465 | 105,665 | 17 | 534 | 51 |
| coast-landed | 364 | 97,049 | 363 | 97,033 | 17 | 534 | 51 |
| neon-road | 528 | 98,313 | 528 | 96,809 | 19 | 534 | 51 |
| canyon-road | 484 | 56,403 | 500 | 55,117 | 20 | 534 | 51 |
| aurora-road | 485 | 55,195 | 500 | 56,149 | 19 | 534 | 51 |
| spiral-road | 292 | 54,729 | 293 | 57,833 | 19 | 534 | 51 |
| spiral-nitro | 289 | 56,663 | 297 | 60,947 | 19 | 534 | 51 |
| spiral-fly | 271 | 55,967 | 275 | 60,783 | 19 | 534 | 51 |
| spiral-landed | 187 | 47,917 | 188 | 50,173 | 19 | 534 | 51 |
| taipei-road | 334 | 49,115 | 652 | 66,665 | 20 | 542 | 66 |
| tokyo-road | 529 | 55,009 | 562 | 55,773 | 19 | 542 | 52 |
| alpine-road | 288 | 44,595 | 372 | 49,085 | 18 | 560 | 54 |
| coastal-road | 446 | 55,673 | 451 | 53,163 | 19 | 568 | 54 |
| cosmic-road | 364 | 49,629 | 391 | 52,525 | 18 | 545 | 67 |

Desktop textures and programs equal phone's; desktop geometries equal phone's except alpine 566 and coastal 569.
No page errors or console errors in either run. Programs stay constant from road to NITRO to FLY to landing on Coast and
Sky Spiral, so the first-frame shader warmup holds at r180.

## Frame time

| Run | p50 | p95 | fps |
|---|---:|---:|---:|
| Every scenario above, no throttle (`?perf`, 4 s) | 16.7 ms | 16.7–16.8 ms | 60 |
| `make perf`, desktop viewport, CPU throttled 6×, median of 3 | 16.7 ms | 16.8 ms | 59.2 |

Both are pinned at the 60 fps display cap, so r180 has **headroom**: a regression shows only if r186 drops below 60 fps.
This is a Mac desktop GPU; phone-class GPU timings need a real device (`make perf-phone`) and are still open.

## Known gaps

- Screenshots were inspected for two frames (Coast NITRO desktop, Garage phone); the rest are saved for side-by-side
  comparison after the upgrade and have not been reviewed one by one.
- Not captured: rain/day Coast variants, World Tour long-run, Low/Medium/High quality tiers, reduced motion, context loss.
- `tests/typescript-primary.test.js` fails at this HEAD because `@types/three` is not installed (it was only ever a
  `--no-save` install). That is the stale-types hazard Task 2 removes by declaring it a devDependency.
