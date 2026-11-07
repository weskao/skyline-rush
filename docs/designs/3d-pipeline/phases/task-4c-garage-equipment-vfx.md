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
- [x] RED tests first (`tests/hero-roadster-equipment-browser.spec.js`, catalog-driven; `tests/garage-model-rig.test.js`):
  - RED on the 2b code: the launch flare body glow stayed on the hidden procedural body, so the GLB car showed no glow in race or on the phone, and the Studio paint sweep was missing on the GLB paint.
  - GREEN: every `PAINTS` id matches the GLB paint in Garage Home, Preview Studio and the Home / Coming Soon showcase. Every `GARAGE_SKINS` preview leaves no effect hidden. Skin swaps add no shader program and no geometry (uniforms only). The race with the heaviest loadout compiles nothing after GO. `data-owned` stays false while previewing.
  - Ports: thruster, airflow, NITRO trail and jet effects ride the procedural `keep` group, which stays drawn, so their ports are the procedural car's by construction. The flare glow now wraps the GLB body through a `bodyFrame` uniform (`src/garage-model-rig.ts`, `src/garage-launch-flare-shaders.js`).
  - Cloud Save: no save, entitlement or catalog code changed. The existing trial, owned and cloud tests stay green in `npm test`. No new round-trip test was added.
  - Stress: 16/16 with `CI=1 --repeat-each=4 --retries=0`.
- [ ] Audit: real WebGL captures of every item, procedural vs GLB, in Garage (bright/dim × ground/flight/wing) and in race (launch, ground, BOOST, NITRO, FLY, landing), desktop 1440×900 and phone 390×844.
  - Captured on 2026-11-08 by `GARAGE_EQUIPMENT_AUDIT=1 npx playwright test tests/garage-equipment-audit-browser.spec.js`. There are 12 contact sheets in the ignored `../audits/garage-equipment/`.
  - Still open: the owner marks each item "matches" or "mismatch".
  - Candidate mismatch for the owner: the GLB `_light` emissive takes the paint's light colour and reads much brighter than the procedural light strip (aurora, glacier and coral show it most). This is the Task 4b light binding, not a skin.
  - The flare glow, NITRO trail, Void beams and airflow look alike on both cars.
- [ ] Tune only the mismatched items: shader uniforms, colour, intensity, size and blend on the existing ports. Use Three.js shaders or sprites; Blender may bake flame/beam textures (sRGB/linear correct, KTX2 when used), never VFX meshes. Record "no change" for the rest. Waiting for the owner's marks; nothing has been tuned.
- [x] Quality tiers: the Low fallbacks already exist.
  - Flare body glow off and half the sparks below 0.25.
  - NITRO road glow off below 0.25.
  - Void beam brightness scales with tier (floor 0.25).
  - Vapor emission scales with tier.
  - Median draw calls / triangles with the heaviest loadout during NITRO + FLY (desktop, Apple-silicon Mac, 2026-11-08):

    | Tier | Procedural | GLB |
    |---|---|---|
    | Low | 352 / 92.7k | 335 / 95.9k |
    | Medium | 365 / 95.7k | 344 / 97.1k |
    | High | 365 / 106.5k | 346 / 97.5k |

  - Fill rate: NOT VERIFIED (not measured).
- [ ] Regression matrix: Garage Home, Preview Studio, the shared six-course Home carousel and every playable track including World Tour, desktop and phone; `npm test`, `npm run build`, `npm run test:browser`, `make verify`; exact-HEAD full `quality-gate` on `develop`.
- [ ] Owner visual sign-off on the final per-item before/after matrix.

## By device (repeat per machine; evidence in ignored `../audits/`)
- [ ] Frame-time p50/p95 on a Mac and a real low-end phone (`make phone-diag`) with the heaviest skin of each category equipped during NITRO/FLY, before and after; commit only the device-class summary.
- [ ] Real-phone screenshots of tuned items in Garage and in race.
