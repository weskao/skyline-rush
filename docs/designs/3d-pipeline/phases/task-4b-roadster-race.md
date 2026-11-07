# Task 4b — One hero Roadster GLB on Home showcase and in races

Part of [../../../superpowers/plans/2026-11-04-3d-visual-fidelity-pipeline-plan.md](../../../superpowers/plans/2026-11-04-3d-visual-fidelity-pipeline-plan.md) · Spec Phase 2b · TODO Phase 3b · Scope tags: [README.md](README.md).

**Depends on:** Task 4 accepted (owner visual sign-off on it6 given 2026-11-07) and merged into `develop`. **Blocks:** Task 6 launch/cover captures (Spec Phase 5).
**Files:** src/garage-model.ts and src/garage-model-rig.ts (reuse the loader and rig; no second loader), src/world.js (Home showcase and race player car share this scene), assets-src/roadster2/ (remaining procedural parts), public/models/roadster2/. src/car-model.js and src/roadster-fidelity.js stay the procedural fallback and must not change behaviour. New tests next to `tests/garage-model-rig.test.js`, `tests/garage-model-roadster-browser.spec.js` and the existing showcase specs.
**Produces:** one Blender-authored roadster2 GLB car, with movable wheels, wing and thruster parts, used by Garage, the Home showcase and every race. Physics, collisions and VFX stay exactly as they are today.

Owner decisions (2026-11-07): add this phase; the Home showcase hero car (formerly Spec Phase 5) moves here, because the showcase and the race share one live `#world` renderer, scene and Roadster poses, so one adapter and one regression matrix cover both. Spec Phase 5 keeps cover/promotion polish and Ultra and starts after this task, so promotion captures show the car players drive. The GLB starts behind `?model=roadster`; making it the default is a separate, owner-approved last step. Rival cars stay procedural unless the owner opts in separately (the spec still excludes invented cars).

## By project (committed once)
- [ ] RED tests first: the Home showcase and the race player car show the GLB; collision box, road contact, camera target and NITRO/FLY/BOOST/VFX port positions are identical to the procedural car; Home AIRFLOW ON is grounded and OFF hovers with jets; a 404 or decode failure falls back to the procedural car with no page error; no shader compile after GO; the GLB is disposed on restart, track switch and returning Home, with no second copy across Home ↔ race.
- [ ] Author in Blender the parts still drawn procedurally (lift fans and any other remaining part), with named pivots; `check-glb` PASS on both LODs; manifest hashes updated.
- [ ] One adapter reuses `createGarageModel` / `bindGarageRig` for Home and race: the GLB only dresses the existing procedural car; physics, collisions and VFX ports stay owned by it. Preload and compile before the countdown.
- [ ] Quality tiers: Low loads only `roadster2-low.glb` (or stays procedural if the budget fails); Medium/High use the full GLB. Record draw calls, triangles and texture memory for each tier.
- [ ] Regression matrix: the shared six-course Home carousel and camera dock (`.claude/rules/playable-course-shared-template.md`), and every playable track including World Tour, on desktop and phone viewports, with drive, collision, NITRO, FLY, BOOST, landing and finish → retry; `npm test`, `npm run build`, `npm run test:browser`, `make verify`; exact-HEAD full `quality-gate` on `develop`.
- [ ] Real WebGL screenshots of the GLB car on Home (AIRFLOW on/off) and in race (ground, BOOST, NITRO, FLY, landing); owner visual sign-off on both.
- [ ] Owner-approved default-on: remove the `?model=roadster` gate in its own commit, with procedural fallback kept.

## By device (repeat per machine; evidence in ignored `../audits/`)
- [ ] Frame-time p50/p95 and sustained-FPS note on a Mac and a real phone (`make phone-diag`), GLB vs procedural, Home showcase and the same race track and tier; commit only the device-class summary.
- [ ] Real-phone screenshots of the GLB car on Home and in race (ground, NITRO, FLY).
