# Task 4c — Garage equipment and VFX alignment with the GLB car

Part of [../../../superpowers/plans/3d-visual-fidelity-pipeline-plan-v2.md](../../../superpowers/plans/3d-visual-fidelity-pipeline-plan-v2.md) · Spec Phase 2c · TODO Phase 3c · Scope tags: [README.md](README.md).

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
- [x] Audit: real WebGL captures of every item, procedural vs GLB, in Garage (bright/dim × ground/flight/wing) and in race (launch, ground, BOOST, NITRO, FLY, landing), desktop 1440×900 and phone 390×844.
  - First captured on 2026-11-08 by `GARAGE_EQUIPMENT_AUDIT=1 npx playwright test tests/garage-equipment-audit-browser.spec.js` (headless software WebGL, not look evidence).
  - Recaptured the same day on a **real GPU** (headed Chrome, ANGLE Metal, Apple-silicon Mac; spec v2 §8.1) at the branch merge commit: 3/3 tests passed, 12 contact sheets in the ignored `../audits/`. An annotated tail-light composite and a NITRO/FLY composite went to the owner.
  - Owner marks (2026-11-08): **mismatch**, the GLB tail light. It took the paint's light colour (aurora purple, glacier cyan, coral amber) and glowed much brighter than the procedural rear strip, which stays red. Every other item **matches**: all 22 skins, the paint colours, the flare glow, NITRO trail, Void beams, airflow and the base NITRO/FLY/BOOST effects.
- [x] Tune only the mismatched items: shader uniforms, colour, intensity, size and blend on the existing ports. Use Three.js shaders or sprites; Blender may bake flame/beam textures (sRGB/linear correct, KTX2 when used), never VFX meshes. Record "no change" for the rest.
  - Tail light, chosen by the owner to match the procedural car: `bindGarageRig` (`src/garage-model-rig.ts`) now copies the procedural rear LED core (`src/rear-light.ts`) emissive colour and power (1, 2.1 BOOST, 3.8 brake) onto the GLB `_light` material, instead of the paint light colour. It is a material copy only, with no port, mesh or per-frame allocation change.
  - RED: `tests/garage-model-rig.test.js` 14 pass / 1 fail (tail light `59ff95`, expected `ff3030`). GREEN: 29/29 rig and model tests; `npm test` 2143 pass / 0 fail / 3 skipped; typecheck and build clean.
  - No change: the 6 paints (body colour), the 22 skins and the base effects.
- [ ] Real-GPU after-capture of the tuned tail light (Garage bright/dim, race BOOST and brake), desktop and phone. Evidence only; the sign-off below no longer waits for it.
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
- [x] ~~Owner visual sign-off on the final per-item before/after matrix~~: owner-accepted on 2026-11-08 without a manual review (the owner treats every manual-verification item as verified).

## By device (repeat per machine; evidence in ignored `../audits/`)
- [ ] Mac frame-time p50/p95 with the heaviest skin of each category equipped during NITRO/FLY, GLB vs procedural, real GPU, before and after. The only tuned item is a material colour copy, so the expected cost difference is none. Not measured yet.
- [x] ~~Real low-end phone frame-time p50/p95 (`make phone-diag`) with the same loadout~~: owner-accepted on 2026-11-08 without a manual review (the owner treats every manual-verification item as verified). Not measured.
- [x] ~~Real-phone screenshots of tuned items in Garage and in race~~: owner-accepted on 2026-11-08 without a manual review (the owner treats every manual-verification item as verified). Not captured.
