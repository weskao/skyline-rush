# Wave 2 Phase B — Skin implementation and asset audit matrix

**Branch:** `feature/garage-vfx-skins` · **Status:** 27 WEBPs IN RUNTIME / 22 SELECTABLE SKINS / 11 BADGE-ART REFERENCES / CI & VISUAL QA PENDING · **Updated:** 2026-11-02

This matrix distinguishes actual Three.js cosmetics from candidate artwork and from unapproved visual references.
The original ZIP was recovered from the ChatGPT File Library; SHA-256 **verified**:
`4112ef97f6ec8d0860220a93f95a5b19f77b2a05cc36c1eebf5385d457d73414`.
All 27 WebPs exist as Git blobs in [feature/3x-ui-materials](https://github.com/weskao/skyline-rush/tree/feature/3x-ui-materials/docs/designs/3x-asset-library/webp/garage-vfx-skins).
All 27 original 3x WebPs are imported into `public/feature-assets/garage-vfx-skins/raster/` in this feature branch. 16 effect images map to 16 individual 3D cosmetics inside a 22-skin catalog; 11 216px badge/rarity images are displayed separately at 72px CSS as reference artwork, without asserting ownership/rarity/limited offer. Six airflow items still use SVG category placeholders; these are genuine per-skin 3D patterns, but their individual images need approved artwork. The original source PNGs remain in ChatGPT Library. No live purchase/settlement feature is implied.
Do not silently reconstruct or fabricate the original ZIP.

## Planned/implemented IDs

The style numbers below select different patterns, movement or shape in the **same shared Aero shader/geometry**;
they are not new GPU allocations per equip. Visual equivalence to original references is **not approved**.

| Category | Skin ID | Style | Visual difference from default | Original candidate thumbnail | Reviewed/imported |
| --- | --- | ---: | --- | --- | --- |
| Thruster | `thruster-basic` | 0 | Baseline cold exhaust | `thruster-basic` | COMMITTED TO TRIAL (QA PENDING) |
| Thruster | `thruster-ion` | 1 | Pulsing nozzle breakup | `thruster-ion` | COMMITTED TO TRIAL (QA PENDING) |
| Thruster | `thruster-plasma` | 2 | Helical exhaust bands | `thruster-plasma` | COMMITTED TO TRIAL (QA PENDING) |
| Thruster | `thruster-void` | 3 | Four physical instanced car-mounted animated pulse beam shafts plus exhaust | `thruster-void` | COMMITTED TO TRIAL (QA PENDING) |
| Airflow | `airflow-basic` | 0 | Baseline streamlines | none | NEEDS ART |
| Airflow | `airflow-slipstream` | 1 | Streamline wave displacement | none | NEEDS ART |
| Airflow | `airflow-vortex` | 2 | Vertical/horizontal oscillation | none | NEEDS ART |
| Airflow | `airflow-prism` | 3 | Lattice/pulsed stream segments | none | NEEDS ART |
| NITRO Trail | `nitro-trail-basic` | 0 | Baseline continuous ribbon | none | NEEDS ART |
| NITRO Trail | `nitro-trail-cyan` | 1 | Rhythmic bright ribbon bands | `trail-cyan` | COMMITTED TO TRIAL (QA PENDING) |
| NITRO Trail | `nitro-trail-gold` | 2 | Oscillating segmented trail | `trail-gold` | COMMITTED TO TRIAL (QA PENDING) |
| NITRO Trail | `nitro-trail-red` | 3 | Dash-gap trail sections | `trail-red` | COMMITTED TO TRIAL (QA PENDING) |
| NITRO Trail | `nitro-trail-purple` | 4 | Pulsed nebula ribbon with distinct wave gating | `trail-purple` | COMMITTED TO TRIAL (QA PENDING) |
| Launch Flare | `launch-flare-basic` | 0 | Original shock ring | none | NEEDS ART |
| Launch Flare | `launch-flare-blue` | 1 | Enlarged cyan/blue ring | `flare-blue` | COMMITTED TO TRIAL (QA PENDING) |
| Launch Flare | `launch-flare-ring` | 2 | Elliptical pulsing ring | `flare-ring` | COMMITTED TO TRIAL (QA PENDING) |
| Launch Flare | `launch-flare-pulse` | 3 | Rotating elongated energy pulse with echo | `flare-purple` | COMMITTED TO TRIAL (QA PENDING) |
| Launch Flare | `launch-flare-gold` | 4 | Broad, slowly rotating golden corona with echo | `flare-gold` | COMMITTED TO TRIAL (QA PENDING) |
| Launch Flare | `launch-flare-red` | 5 | Tall crimson shock with separate timing | `flare-red` | COMMITTED TO TRIAL (QA PENDING) |
| Launch Flare | `launch-flare-cyan` | 6 | Thin aqua nova ellipse | `flare-cyan` | COMMITTED TO TRIAL (QA PENDING) |
| Launch Flare | `launch-flare-magenta` | 7 | Rotating elongated magenta vortex | `flare-magenta` | COMMITTED TO TRIAL (QA PENDING) |
| Launch Flare | `launch-flare-white` | 8 | White expanded supernova with beat rotation | `flare-white` | COMMITTED TO TRIAL (QA PENDING) |

**All 27 source images are used in this feature branch:** 16 equipment icons linked to 3D skin choices, plus 11 cosmetic badge/rarity sample icons (`badge-equipped`, `badge-favorite`, `badge-limited`, `badge-locked`, `badge-new`, `badge-trial`, and five `rarity-*`). Do not represent sample rarity as real entitlement. The six airflow skins show real shader geometry but only shared SVG thumbnails, so full art parity remains a QA blocker.

**Actual preview improvements committed:** 4 instanced Void pulse rear beams (physical meshes, no fake billboard), new launch echo ring, repeated 3D launch demonstrations in Studio and Home, ready-phase NITRO wake samples with no race-state mutation, all 22 preview buttons, selected-card glow; Low/Medium/High and Reduced Motion must still be verified by browser / physical device. [Playwright screenshot CI](../../../.github/workflows/ci.yml) uploads `garage-vfx-preview-*` screenshots when the run reaches browser jobs; no unverified image may be called a real capture.

## Tests and release gate

- Catalog has 22 backward-compatible IDs (4 Thruster, 4 Airflow, 5 NITRO Trail, 9 Launch Flare), with existing IDs and account/profile schema preserved.
- `skinVfxPattern` has 0–3 for the original 16 and distinct 4–8 for new trail/flare and rejects cross-category/tampered IDs to mode 0.
- Shared `createAeroVFX` receives patterns for flow, jets, ribbon and launch shock; studio and races use the same
  renderer. Shader-mode changes reuse meshes, buffers and materials.
- Production `coming-soon` alias has neutral pattern/palette exports; unpublished Skin IDs are included
  in the locked-bundle leak gate, and default release remains locked.
- **Open:** latest-HEAD unit, TypeScript, build, Playwright, cloud, World Tour CI; actual WebGL screenshots and
  per-skin visual comparison; mobile physical devices; image alpha/quality approval.
- **Do not mark Phase B complete** or merge/deploy until all actual behavior and visual gates are passed.

Source references: [3× raster handoff](RASTER-ASSET-HANDOFF.md),
[visual fidelity](VISUAL-FIDELITY.md),
[garage release policy](../../garage-release-policy.md),
[Wave 2 plan](../../superpowers/plans/2026-10-31-garage-vfx-skins-plan.md).
