# Roadster 2-inspired vehicle fidelity — Design (2026-11-03)

## Intent
Rebuild Skyline Rush's shared player car mesh to closely resemble the **2026 Tesla Roadster 2 reference images** (stored in `docs/designs/roadster2-reference/`, indexed in its `README.md`): low wedge nose, folded broad shoulders, seamless black/copper-glazed fastback, pearl white satin-gloss body, five-blade aero wheels, hidden front light, continuous rear light, deep quad thrusters, black split diffuser and deployable rear aerofoil. This is a game-ready visual interpretation, **not OEM CAD**. Performance/weight/thruster claims in articles are not dimensional inputs.

## Existing architecture
`src/car-model.js` is the shared factory for racing, Home preview and Garage Studio. `src/geometry.ts` uses a six-station, four-corner rectangular shell and eight-vertex trapezoid canopy; roadster trim relies on blocks and flat nozzle discs. `src/rear-light.ts` already implements the animated full-width brake light, and `src/aero-vfx.js` owns the four rear jet coordinates. `src/garage-stage.ts` replaces the body paint material for the Garage clearcoat shader and animates `userData.wing` / wheels.

## Design decisions
- Keep existing roadster vehicle scale and collision physics; geometry is visual-only (negative Z nose, positive Z tail, Y up).
- Introduce one roadster-only procedural geometry/detail module rather than changing `carShell` for every other vehicle. Use multi-station faceted shell with bevelled shoulders and tapered hood; fastback lofted canopy; visible side rockers and sculpted lower fascia.
- Build distinct physical pearl paint and dark glazed glass materials. Continue honoring Garage paint overrides and the main `userData.body` reference; no per-frame material or mesh allocations.
- Reuse `createRearLight()` and `REAR_PORTS` without relocating exhaust VFX. Turn flat discs into recessed three-dimensional nozzle cavities. Add deployed aerofoil on the existing wing Group with `restY` and `lift`.
- Four wheels remain independent animated Groups; render deep tyres, aero hub and geometry-based five-blade insets. Share immutable geometries for repeated wheel detail.
- No new dependencies, no functional change to racing, physics, collision, VFX selection, garage equip, purchases, skins or touch UI.
- Keep the individual module under 400 lines and respect static-parts merging. Avoid exaggerated emissive glow and maintain white/black contrast under diverse track lighting.

## Validation and acceptance
1. Deterministic RED test in `tests/roadster-fidelity.test.js`: section count, PBR properties, canopy, new named mesh parts, wing contract, thruster positions, wheel groups, rival-car regression. Observe failure on old model before GREEN.
2. Update outdated roadster geometry snapshot in `tests/car-model-draws.test.js` to meaningful structural bounds/complexity assertions while preserving exact numerical snapshots for all other styles. Don't weaken performance invariants.
3. `npm test`, `npm run build`, `make verify` and exact-HEAD Actions. Capture running WebGL screenshots at Garage and in race (front, profile, rear, with wing, road/flight), desktop and phone if available. Any unrun gates remain explicitly pending.
4. Compare draw calls and visual fidelity at matching camera/quality; preserve shared animation and effects. No claims of exact proportions or physical-device QA without corresponding artifacts.

## Scope boundary
Only `feature/roadster2-high-fidelity-body` based on `develop`; no PR, no merge to `develop`, no `main` changes and no deploy without new approval.
