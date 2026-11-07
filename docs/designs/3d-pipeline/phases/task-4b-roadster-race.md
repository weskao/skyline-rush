# Task 4b — One hero Roadster GLB on Home showcase and in races

Part of [../../../superpowers/plans/2026-11-04-3d-visual-fidelity-pipeline-plan.md](../../../superpowers/plans/2026-11-04-3d-visual-fidelity-pipeline-plan.md) · Spec Phase 2b · TODO Phase 3b · Scope tags: [README.md](README.md).

**Depends on:** Task 4 accepted (owner visual sign-off on it6 given 2026-11-07) and merged into `develop`. **Blocks:** Task 6 launch/cover captures (Spec Phase 5).
**Files:** src/garage-model.ts and src/garage-model-rig.ts (reuse the loader and rig; no second loader), src/world.js (Home showcase and race player car share this scene), assets-src/roadster2/ (remaining procedural parts), public/models/roadster2/. src/car-model.js and src/roadster-fidelity.js stay the procedural fallback and must not change behaviour. New tests next to `tests/garage-model-rig.test.js`, `tests/garage-model-roadster-browser.spec.js` and the existing showcase specs.
**Produces:** one Blender-authored roadster2 GLB car, with movable wheels, wing and thruster parts, used by Garage, the Home showcase and every race. Physics, collisions and VFX stay exactly as they are today.

Owner decisions (2026-11-07): add this phase; the Home showcase hero car (formerly Spec Phase 5) moves here, because the showcase and the race share one live `#world` renderer, scene and Roadster poses, so one adapter and one regression matrix cover both. Spec Phase 5 keeps cover/promotion polish and Ultra and starts after this task, so promotion captures show the car players drive. The GLB starts behind `?model=roadster`; making it the default is a separate, owner-approved last step. Rival cars stay procedural unless the owner opts in separately (the spec still excludes invented cars).

## By project (committed once)
- [x] RED tests first: the Home showcase and the race player car show the GLB; collision box, road contact, camera target and NITRO/FLY/BOOST/VFX port positions are identical to the procedural car; Home AIRFLOW ON is grounded and OFF hovers with jets; a 404 or decode failure falls back to the procedural car with no page error; no shader compile after GO; the GLB is disposed on restart, track switch and returning Home, with no second copy across Home ↔ race.
  - Evidence (2026-11-07): `tests/hero-roadster-race-browser.spec.js` RED 7/7 (`data-garage-model` was `""`), GREEN 7/7. Unit RED on assertions (inert stubs, not import errors) in `tests/garage-model.test.js`, `tests/garage-model-rig.test.js`, `tests/upcoming-showcase.test.js`.
  - "Disposed, no second copy" is implemented as **one persistent instance** on the shared main-scene player car: restart, track switch and End race keep the same instance uuid and one GLB root, and renderer geometry/texture memory returns to the same baseline after a warm cycle. The Coming Soon card car and the Garage Studio car take the instance over and release it before their stage is disposed.
- [x] Author in Blender the parts still drawn procedurally (lift fans and any other remaining part), with named pivots; `check-glb` PASS on both LODs; manifest hashes updated.
  - `lift_fans` > `lift_fan_01..04` pivots at the procedural LIFT_PORTS (y 0.19), one `lift_fan_0N_disc` each, material `roadster_fan`. The rig copies the procedural jets' visibility, so the fans show only while thrusting, as before. Rig update runs after `compileAsync`, because `compileAsync` skips hidden objects (guard test).
  - Authored with the headless `assets-src/roadster2/build.py` + `bake.py` path (Blender 5.2): the live Blender MCP answered, but its open scene belonged to another checkout, so it was not edited. 74 objects; main 6,784 tris / 1,395,788 B; low 4,326 tris / 493,852 B; both `check-glb` PASS and promoted.
- [x] One adapter reuses `createGarageModel` / `bindGarageRig` for Home and race: the GLB only dresses the existing procedural car; physics, collisions and VFX ports stay owned by it. Preload and compile before the countdown.
  - `createWorldGarageModel().frame()` picks one host per frame (Studio > Coming Soon card > Home/race car) and a mode: `garage`, `drive` (Home) or `race`. In `race` mode nothing is attached or swapped mid-race; a dress that finishes compiling after GO is dropped, and the car stays procedural until the race stops. The GLB loads and compiles on Home, so the program count is unchanged after GO.
  - GLB `thruster_0N` and `nozzle_rear_0N` world positions sit within 1e-4 m of the procedural VFX ports; the GLB root has identity TRS.
- [x] Quality tiers: Low loads only `roadster2-low.glb` (or stays procedural if the budget fails); Medium/High use the full GLB. Record draw calls, triangles and texture memory for each tier.
  - Headless Chrome on an Apple-silicon Mac (Metal), Coast, Home showcase / race (draw calls / triangles; programs on Home):

    | Tier | Model | Home | Race | GLB tris | GLB texture memory |
    |---|---|---|---|---|---|
    | Low | procedural | 720 / 109,070 / 52 | 483 / 98,648 | – | – |
    | Low | GLB | 700 / 105,980 / 56 | 463 / 91,702 | 4,326 | 683 KiB (2× ASTC 512) |
    | Medium | procedural | 732 / 112,739 / 60 | 496 / 100,725 | – | – |
    | Medium | GLB | 713 / 109,747 / 64 | 476 / 98,549 | 6,784 | 2,731 KiB (2× ASTC 1024) |
    | High | procedural | 731 / 115,851 / 60 | 495 / 99,293 | – | – |
    | High | GLB | 712 / 110,507 / 64 | 477 / 98,581 | 6,784 | 2,731 KiB |

    The GLB draws about 20 fewer calls and fewer triangles than the procedural body at every tier (it replaces many small meshes), so Low keeps the low LOD.
- [x] Regression matrix: the shared six-course Home carousel and camera dock, and every playable track including World Tour, on desktop and phone viewports, with drive, collision, NITRO, FLY, BOOST, landing and finish → retry.
  - `tests/hero-roadster-tracks-browser.spec.js`: 10 tracks × desktop/phone portrait, plus the six-course carousel and camera dock on both (22/22).
- [ ] `npm test`, `npm run build`, `npm run test:browser`, `make verify` on the Phase 3b HEAD.
- [ ] Exact-HEAD full CI on the feature branch (`[full-regression]`); exact-HEAD full `quality-gate` on `develop` after the owner-approved merge.
- [x] Real WebGL screenshots of the GLB car on Home (AIRFLOW on/off) and in race (ground, BOOST, NITRO, FLY, landing), attached by the browser spec.
- [ ] Owner visual sign-off on the Home and in-race screenshots.
- [ ] Owner-approved default-on: remove the `?model=roadster` gate in its own commit, with procedural fallback kept.

Known limitation: the in-race Home link (`#leave-home`) reloads `./` and drops `?model=roadster`; End race (`#leave-end`) keeps it. Moot once the gate is removed.

## By device (repeat per machine; evidence in ignored `../audits/`)
- [x] Mac: frame-time p50/p95, GLB vs procedural (2026-11-07, Apple-silicon Mac, headless Chrome, production build, CPU throttled 6×, Coast, high tier, median of 3 rounds alternating the order; Home = 10 s of rAF deltas, race = the `?perf` strip after 24 s):
  - Desktop 1440×900: Home p50 16.7 / p95 33.3 vs 33.4 ms; race p50 33.3 / p95 50.0 ms for both; race fps 29.5 procedural vs 28.7 GLB.
  - Phone viewport 412×915 @2×, GLB first: Home p50 16.7 / p95 33.4 ms for both; race p50 33.3 / p95 50.0 vs 50.1 ms; race fps 30.1 procedural vs 29.1 GLB. (With procedural run first, later rounds drifted for both variants; the reversed order removed the gap, so it was order/thermal bias.)
  - Verdict: p50/p95 unchanged at frame quantisation; the GLB costs about 1 fps (~3 %) of average race fps under 6× throttle. Recorded as a known trade-off for the default-on decision.
- [ ] Real phone: frame-time p50/p95 and sustained-FPS note (`make phone-diag`), GLB vs procedural, Home showcase and the same race track and tier; commit only the device-class summary.
- [ ] Real-phone screenshots of the GLB car on Home and in race (ground, NITRO, FLY).
