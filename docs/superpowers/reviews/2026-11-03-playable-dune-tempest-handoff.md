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
