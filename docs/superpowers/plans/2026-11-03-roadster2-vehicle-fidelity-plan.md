# Roadster 2-inspired model fidelity — Implementation plan (2026-11-03)

Spec: [2026-11-03-roadster2-vehicle-fidelity-design.md](../specs/2026-11-03-roadster2-vehicle-fidelity-design.md)

## Constraints
Feature branch only, created at `develop` b34b1bfc; no PR / merge / deploy. Do not change simulation, collision or VFX ports. Use the existing Three.js model factory and share geometric resources. Treat reference photos (`docs/designs/roadster2-reference/`) as artistic reference only, not exact engineering CAD.

## Tasks
1. **Characterization and RED** — `tests/roadster-fidelity.test.js` exercises 2026 silhouette, physical paint/glass, nose and side details, aerofoil travel, recessed exhaust at `REAR_PORTS`, four animatable wheels and non-Roadster regression. Run `node --test tests/roadster-fidelity.test.js` before implementation and record failure as evidence.
2. **Sculptural form** — `src/roadster-fidelity.js`: `roadsterBody(): BufferGeometry`, `roadsterCanopy(): BufferGeometry` with constrained stations, wheel-arch openings and continuous fastback. Preserve bounding geometry.
3. **Materials / detail** — `src/car-model.js`: roadster-only `MeshPhysicalMaterial` paint/glass; `addRoadsterTrim` and `addRoadsterWheelDetail` for contour creases, lamps, rockers, diffuser, recessed thrusters, deployable wing and five-spoke wheel geometry. All variants retain animation and shared VFX contracts.
4. **Draw-call budget** — Cache immutable wheel/nozzle/path geometry, preserve static merge behavior and semantic detail metadata. In `tests/car-model-draws.test.js`, retain exact snapshots for rival styles, bounded triangle envelope plus dedicated feature tests for roadster.
5. **Verification** — Run focused RED→GREEN, `npm test`, build, typecheck, `make verify`, photo capture and exact-HEAD Actions. Record real status, do not mark pending checks complete, and no branch integration until user approves.

## Review focus
- Wheel arches must visually expose tyre/rims at front and rear, no collision-envelope expansion.
- Black diffuser/rockers must not consume or flatten the white shell silhouette.
- Rear-light, 4 VFX nozzles, wing `userData.lift` and road/flight wheel rotation stay synchronized.
- All Garage paint presets still target the body mesh; default glass remains black/copper tinted.
- No scene graph regeneration per frame; caches and dispose behavior remain safe.
