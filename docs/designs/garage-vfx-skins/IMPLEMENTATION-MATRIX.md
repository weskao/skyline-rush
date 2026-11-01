# Wave 2 Phase B — Skin implementation and asset audit matrix

**Branch:** `feature/garage-vfx-skins` · **Status:** SOURCE CODED / REAL ART BLOCKED / CI & VISUAL ACCEPTANCE PENDING · **Updated:** 2026-11-02

This matrix distinguishes actual Three.js cosmetics from candidate artwork and from unapproved visual references.
The runtime still ships the four transparent category SVGs for cards; all approved per-item PNG/WebP assets remain absent from GitHub.
The original `skyline-rush-3x-garage-vfx-skins.zip` is not accessible here. SHA-256 expected:
`4112ef97f6ec8d0860220a93f95a5b19f77b2a05cc36c1eebf5385d457d73414`.
Do not silently reconstruct or fabricate the original ZIP.

## Planned/implemented IDs

The style numbers below select different patterns, movement or shape in the **same shared Aero shader/geometry**;
they are not new GPU allocations per equip. Visual equivalence to original references is **not approved**.

| Category | Skin ID | Style | Visual difference from default | Original candidate thumbnail | Reviewed/imported |
| --- | --- | ---: | --- | --- | --- |
| Thruster | `thruster-basic` | 0 | Baseline cold exhaust | `thruster-basic` | BLOCKED |
| Thruster | `thruster-ion` | 1 | Pulsing nozzle breakup | `thruster-ion` | BLOCKED |
| Thruster | `thruster-plasma` | 2 | Helical exhaust bands | `thruster-plasma` | BLOCKED |
| Thruster | `thruster-void` | 3 | Discontinuous pulse exhaust | `thruster-void` | BLOCKED |
| Airflow | `airflow-basic` | 0 | Baseline streamlines | none | NEEDS ART |
| Airflow | `airflow-slipstream` | 1 | Streamline wave displacement | none | NEEDS ART |
| Airflow | `airflow-vortex` | 2 | Vertical/horizontal oscillation | none | NEEDS ART |
| Airflow | `airflow-prism` | 3 | Lattice/pulsed stream segments | none | NEEDS ART |
| NITRO Trail | `nitro-trail-basic` | 0 | Baseline continuous ribbon | none | NEEDS ART |
| NITRO Trail | `nitro-trail-cyan` | 1 | Rhythmic bright ribbon bands | `trail-cyan` | BLOCKED |
| NITRO Trail | `nitro-trail-gold` | 2 | Oscillating segmented trail | `trail-gold` | BLOCKED |
| NITRO Trail | `nitro-trail-red` | 3 | Dash-gap trail sections | `trail-red` | BLOCKED |
| Launch Flare | `launch-flare-basic` | 0 | Original shock ring | none | NEEDS ART |
| Launch Flare | `launch-flare-blue` | 1 | Enlarged cyan/blue ring | `flare-blue` | BLOCKED |
| Launch Flare | `launch-flare-ring` | 2 | Elliptical pulsing ring | `flare-ring` | BLOCKED |
| Launch Flare | `launch-flare-pulse` | 3 | Rotating elongated energy pulse | `flare-purple` | BLOCKED |

The remaining cosmetic thumbnail candidates `trail-purple`, `flare-gold`, `flare-red`, `flare-cyan`,
`flare-magenta`, `flare-white` are **DEFERRED**, not committed or falsely mapped to duplicate Skin IDs.
The 11 `badge-*` / `rarity-*` candidates are also **DEFERRED** pending real state/rarity semantics.
All 27 candidate keys have therefore been accounted for: 10 mapped to current Skin IDs, 6 optional cosmetic
candidates deferred and 11 state overlays deferred. The remaining six selected Skin IDs lack their own
candidate thumbnail and require either approved new artwork or a truthful real-render capture.

## Tests and release gate

- Catalog has 16 backward-compatible IDs (four per category), with existing IDs and account/profile schema preserved.
- `skinVfxPattern` has modes 0–3 per category and rejects cross-category/tampered IDs to mode 0.
- Shared `createAeroVFX` receives patterns for flow, jets, ribbon and launch shock; studio and races use the same
  renderer. Shader-mode changes reuse meshes, buffers and materials.
- Production `coming-soon` alias has neutral pattern/palette exports; unpublished Skin IDs are included
  in the locked-bundle leak gate, and default release remains locked.
- **Open:** latest-HEAD unit, TypeScript, build, Playwright, cloud, World Tour CI; actual WebGL screenshots and
  per-skin visual comparison; mobile physical devices; image extraction/alpha/quality approval.
- **Do not mark Phase B complete** or merge/deploy until all actual behavior and visual gates are passed.

Source references: [3× raster handoff](RASTER-ASSET-HANDOFF.md),
[visual fidelity](VISUAL-FIDELITY.md),
[garage release policy](../../garage-release-policy.md),
[Wave 2 plan](../../superpowers/plans/2026-10-31-garage-vfx-skins-plan.md).
