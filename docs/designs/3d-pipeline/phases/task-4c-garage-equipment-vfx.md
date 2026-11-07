# Task 4c — Garage equipment and VFX alignment with the GLB car

Part of [../../../superpowers/plans/2026-11-04-3d-visual-fidelity-pipeline-plan.md](../../../superpowers/plans/2026-11-04-3d-visual-fidelity-pipeline-plan.md) · Spec Phase 2c · TODO Phase 3c · Scope tags: [README.md](README.md).

**Depends on:** Task 4b accepted (GLB car on Home and in races, owner sign-off). **Blocks:** Task 6 launch/cover captures (Spec Phase 5).
**Files:** src/aero-vfx.js, src/effects.js, src/garage-void-beams.js, src/garage-nitro-trail.js, src/garage-launch-flare.js (+ `-styles.ts`, `-shaders.js`), src/garage-paint-shader.ts, src/garage-model-rig.ts (paint/light targets on the GLB), src/garage-stage.ts. Catalogs `src/appearance.ts` and `src/garage-skin-catalog.ts` are read, not changed. Optional baked textures under assets-src/ and public/materials/.
**Produces:** every Garage car equipment item checked, and tuned where the owner asks, so it looks right on the PBR GLB car in Garage, on the Home showcase and in race. Behaviour, ports and entitlements stay exactly as they are today.

Owner decisions (2026-11-07): add this phase after 2b; it must include **all** Garage car equipment, not only NITRO flames and Void beams.

## Equipment inventory (derive in tests from the catalogs, never a hand-copied list)

| Group | Source | Items |
|---|---|---|
| Paint | `PAINTS` in `src/appearance.ts` | 6: pearl, aurora, glacier, coral, cobalt, obsidian (paint colour, light colour, metalness/roughness) |
| Thruster skin | `GARAGE_SKINS` in `src/garage-skin-catalog.ts` | 4: basic, ion, plasma, void (Void pulse beams in `src/garage-void-beams.js`) |
| Airflow skin | same | 4: basic, slipstream, vortex, prism |
| NITRO trail skin | same (`src/garage-nitro-trail.js`) | 5: basic, cyan, gold, red, purple |
| Launch flare skin | same (`src/garage-launch-flare.js`) | 9: basic, blue, ring, pulse, gold, red, cyan, magenta, white |
| Base effects | `src/aero-vfx.js`, `src/effects.js` | NITRO, FLY jets, BOOST, airflow stream, vapor, ribbon, shock ring |
| Garage controls that show them | `src/garage-ui.ts`, `src/garage-view-state.ts` | Ground / Flight / Wing pose, bright / dim lighting, Studio camera views |

A paint or skin added later joins this task automatically through the catalog-driven test.

## By project (committed once)
- [ ] RED tests first: for every `PAINTS` id and every `GARAGE_SKINS` id, the GLB car shows it in Garage Home, Preview Studio, Home showcase and race; VFX port positions equal the procedural car's; a skin swap writes uniforms only (no new geometry, material or draw call); every style is compiled during warm-up, with no shader compile after GO; preview never grants a locked item and trial/owned/equipped rules are unchanged; paints and skins survive a Cloud Save round trip.
- [ ] Audit: real WebGL before/after captures of each item, procedural vs GLB car, in Garage (both lighting levels and all three poses) and in race (ground, BOOST, NITRO, FLY, landing, launch), desktop and phone viewports. Owner marks each item "matches" or "mismatch".
- [ ] Tune only the mismatched items: shader uniforms, colour, intensity, size and blend on the existing ports. Use Three.js shaders or sprites; Blender may bake flame/beam textures (sRGB/linear correct, KTX2 when used), never VFX meshes. Record "no change" for the rest.
- [ ] Quality tiers: each heavy item (Void beams, NITRO trails, launch flares, vapor) has a Low-tier fallback; record draw calls and fill-rate cost per tier.
- [ ] Regression matrix: Garage Home, Preview Studio, the shared six-course Home carousel and every playable track including World Tour, desktop and phone; `npm test`, `npm run build`, `npm run test:browser`, `make verify`; exact-HEAD full `quality-gate` on `develop`.
- [ ] Owner visual sign-off on the final per-item before/after matrix.

## By device (repeat per machine; evidence in ignored `../audits/`)
- [ ] Frame-time p50/p95 on a Mac and a real low-end phone (`make phone-diag`) with the heaviest skin of each category equipped during NITRO/FLY, before and after; commit only the device-class summary.
- [ ] Real-phone screenshots of tuned items in Garage and in race.
