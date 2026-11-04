# Dune Tempest — playable-course graph integration handoff

**Working branch:** feature/playable-dune-tempest
**Integration target:** feature/epic-multiroute-longform-tracks
**Shared baseline:** 347f17940498275fd94152c0ed6005dae59ba323
**State:** CourseGraph data draft only; NOT playable or released. Homepage Coming Soon protection is intentionally unchanged.

## Authored, testable slice

- Data: src/courses/dune-tempest.ts; regression: tests/dune-tempest-course.test.js.
- 12 nodes, 14 directed edges (11 mandatory main and 3 alternative), one unique START and FINISH, four ordered checkpoints, no laps. The main polyline estimate is 13,499 m; final arc-length sampling and 3–5-minute play time are **unmeasured**.
- Four 120–155-degree canyon hairpin turn groups with 150 m pre-turn signage metadata, dune S bends and an open high-speed final stretch.
- Three branches with actual separate coordinates and route rejoins: safe wadi vs dune crest (~310 m potential saving); four-hairpin canyon vs 95-m-altitude flight (~2,401 m potential saving; needs balancing); natural arch road vs dry wash (~279 m saving).
- Nine authored hazards (rocks/rockfall/scree/sand pits) with visible footprint and AI warning metadata; three deterministic sandstorm zones with Low/Medium/High and Reduced Motion particle budgets; three legal off-road regions and recovery intent.
- Landmark identifiers for natural stone ring, arch, canyon outlet, and sunset finish. Actual WebGL scene remains owned by src/upcoming-scenes/dune-tempest.ts.

## Shared CourseGraph runtime dependencies (integrator ownership)

1. Introduce stable typed CourseGraph validation/route-schema integration. Agree an adapter for this data contract before renaming fields. Keep the 10 existing classic/World Tour routes and their records unchanged.
2. Sample road, vehicle, AI, items, terrain collision, camera and minimap from one **arc-length 3D route frame**, not the existing single z=-distance. Use the shared Three.js renderer and the existing drift, BOOST, NITRO, flight and collision systems; no second engine.
3. Implement per-car edgeId/localS/lateral/altitude and independent gated progression. Require cp1→cp2→cp3→cp4→FINISH in order, including at high flight altitude. At splits/merges handle 8-car AI, physical routing, fair standings, branch-relative collisions, ghost versioning and safe respawn.
4. Render and collide matching rockfall, rocks, scree and pits at all quality tiers. Reuse existing knock/hitProp/avoidObstacles; keep 120 m AI warning, 150 m hairpin cues, safe maneuver space, recoverable flight landing and visible collision envelopes.
5. Build streamed native Three.js sand/canyon geometry, rock ring/arch, off-road ground, jump/landing surfaces, sunset lighting, localized sandwalls/dust particles. Reuse existing quality, reduced-motion, renderer and disposal. Concept JPEGs are references, not fake 3D backdrops.
6. Calibrate actual spline arc length and collect 20+ completed runs, including 30/60/120 FPS and eight AI cars; rebalance the large aerial shortcut advantage from measurements.

## Visual acceptance references

- docs/designs/new-tracks/source-concept-jpeg/dune-tempest/concept-view-01.jpg
- docs/designs/new-tracks/source-concept-jpeg/dune-tempest/concept-view-02.jpg
- docs/designs/new-tracks/route-schematics/dune-tempest.svg

The files exist at the shared baseline, but the connector could not decode the JPEG binary. **No actual WebGL race screenshot, visual JPEG comparison, desktop/mobile rendering acceptance, FPS benchmark or GPU disposal inspection was completed.** After runtime integration capture real Ground, Aerial, Hairpin, Obstacle, and Landing frames at desktop 1440×900 and mobile 390×844, then record fidelity PASS/FAIL/APPROVED DEVIATION against the project's visual-acceptance-gate.md.

## Verification evidence and open gates

- RED: local node --experimental-strip-types --test tests/dune-tempest-course.test.js against deliberately empty draft; 8 semantic assertion failures.
- GREEN: identical isolated command with authored course data; 9/9 pass.
- Standalone strict TypeScript host tsc 5.8.3 check passed; project specifies TypeScript 5.9.3. This does not prove whole-project typecheck.
- Full repository clone unavailable from this isolated environment (GitHub DNS inaccessible), therefore npm test, npm run typecheck, npm run build, Playwright, make verify and manual WebGL screenshot capture **not run locally**. Inspect new exact-HEAD Actions after push; skipped browser or World Tour is not an acceptable full regression.

- [x] Data-only graph, reachable branch/merge paths, 4 real hairpins, checkpoints and 13.5-km polyline target.
- [x] Focused RED→GREEN tests: topology, boundaries, forks, alternative risk, hazards, off-road and deterministic sand weather.
- [ ] Shared arc-length route runtime + actual drivable geometry, realistic collision, AI obstacle avoidance and ordered finish.
- [ ] Roadside visibility, air fuel/takeoff/landing and off-road recovery demonstrated in gameplay.
- [ ] Measured 3–5 min race, 8-car AI, 30/60/120 FPS, quality and Reduced Motion.
- [ ] Real desktop/mobile WebGL visual evidence, GPU disposal, frame timing and draw calls.
- [ ] Full local verification and exact-HEAD remote FULL CI green (required jobs not skipped).

## 2026-11-04 source merge safety gate — blocked

- Source (read-only): `feature/epic-multiroute-longform-tracks` exact HEAD `679dd6b8ea7da331afb57d9dc04be830a1dcedb5`.
- Destination at inspection: `feature/playable-dune-tempest` HEAD `9974fd491d39124525fd620eb778d21d4ea13cc2`. The branches diverged (source 34 commits ahead, 4 behind, relative to destination); a safe merge needs a reviewed non-fast-forward merge with conflict preservation.
- Source exact-HEAD FULL CI: [run 41664995763](https://github.com/weskao/skyline-rush/actions/runs/41664995763) had unit-tests SUCCESS, World Tour shard 5 FAILURE, multiple browser shards FAILURE, and an unfinished browser shard at inspection. Thus the required FULL CI / quality-gate has **not** passed. Do not merge this source HEAD until all required checks (including Browser and World Tour) have completed successfully for that exact SHA.
- Actual source-run failures inspected: World Tour shard 5, `tests/showcase-camera-views-browser.spec.js`, Taipei 390×844 orbit at 105 degrees reported car body occlusion; Browser shards 3 and 13, `tests/track-swipe-browser...`, reported old-track reappearance after snap. These defects belong to the read-only source/shared UI and were **not** patched on another branch.
- This update documents inspection only; no Dune gameplay/renderer/runtime code was changed, no test rerun was performed, and no WebGL screenshots or 3–5-minute/eight-car measurements are available. Earlier focused RED/GREEN evidence remains historical and does not validate this HEAD.
- Next safe Dune-owned work: maintain existing 13.5-km draft and route/split/hazard invariants, prepare fixture-backed render acceptance once the integrator supplies its shared CourseGraph arc-length runtime, and then test checkpoint/AI/landing/recovery in the real renderer. Do not mark playable, register in RACE_TRACKS, or remove Coming Soon protection without runtime and acceptance evidence.

## 2026-11-04 — map-owned directional checkpoint descriptors

- Added `src/courses/dune-tempest-gates.ts` with validated direction, width, elevation band and main incoming edge for cp1→cp2→cp3→cp4→FINISH. It derives gate orientation from each edge's last real control-point segment, not a global z-distance assumption.
- Exported `DUNE_TEMPEST_GATES` from the map's data module and added both isolated synthetic bad-graph tests and real-course data assertions. High 95-m flight must not count for a gate because the contract caps relative altitude at 22 m. **This remains static metadata**; the shared runtime still owns gated crossing, persistence, finish, collision, vehicles and camera.
- Local TDD evidence in an isolated minimal fixture: before implementation, 2/3 tests failed by semantic assertion; after minimal implementation, 3/3 passed under Node 22 `--experimental-strip-types`. Standalone strict `tsc --noEmit --strict --target ES2022 --module ESNext --moduleResolution bundler` on the helper exited 0. Whole-repo `npm test`, project TypeScript, build, Playwright, `make verify`, genuine WebGL and new exact-HEAD FULL CI are **not yet verified**.
- Source integration remains **blocked** on exact HEAD `679dd6b8` and failing Browser/World Tour run 41664995763 as previously recorded; no other branch modified or merged.

## 2026-11-04 — directional gate crossing geometry (map-owned)
- Added pure `crossesDuneGate` for the authored gates: only signed forward plane crossing on the correct incoming edge, within road width and interpolated altitude, with approach-angle and >90 m per-sample jump rejection. Does **not** award checkpoints or advance race state; shared runtime must own order, movement substeps, vehicle progress and anti-teleport enforcement.
- TDD local isolated gate module: failing stub yielded 2/4 passing, 2 semantic failures; after implementation 4/4 passed (`node --experimental-strip-types --test tests/dune-tempest-gate-crossing.test.js`). Standalone `tsc --noEmit --strict --target ES2022 --module ESNext --moduleResolution bundler src/courses/dune-tempest-gates.ts` passed using locally available TypeScript 5.8.3.
- Whole-repository npm / build / Playwright / make verify and actual WebGL screenshots were unavailable locally (GitHub DNS is blocked); exact-HEAD full-regression CI requested by commit marker. Do not claim playable/visual acceptance without real running captures.
