# Wave 3 — Premium 3x WebP artwork and motion

## Intent and boundaries
Preserve the existing racing telemetry visual language and match the rich,
high-contrast, dimensional direction of `demo-points@3x.webp`. This release
recreates the **requested ten icons**, not the already approved Demo Points master,
and does not change any underlying wallet value, mission goal, result reward,
achievement entitlement or backend service.

## Reproducible source and artwork delivery
- Source of truth: `scripts/generate-wave3-premium-webp.py` (Pillow, fixed art
  geometry, deterministic color palettes, layered metal, alpha/glow and highlights).
- GitHub Actions: `.github/workflows/wave3-premium-webp-art.yml`.
- Output: `public/feature-assets/garage-rewards-and-missions/raster/`
  and `public/feature-assets/wave3-demo/raster/`.
- At 3×: mission/trophy **288×288**, wallet coin/diamond **144×144**,
  approved Demo Points/Claim **216×216** (not regenerated).
- No PNG source or fallbacks in the three Wave 3 runtime raster directories,
  including Store Readiness; existing archive WebPs remain intact.
- WebP decoding uses intrinsic dimensions and true transparent margins.
  Unavailable rewards remain explicitly display-only.

## Motion vocabulary
| Asset | Distinct visible animation | Reduced motion |
| --- | --- | --- |
| Gold coin | Rotating outer ring, floating coin, timed starburst | Static image |
| Diamond | Prism tilt, faceted rotation, cyan spectral sparkle | Static image |
| Race/time/drift/combo | Radar-like concentric telemetry orbit; drift reverses, combo accelerates | Static image |
| Trophy tiers | Breathing colored corona, gentle lifting and reflections | Static image |
| Claimed demo mission | One-shot brightness / scale burst | No animation |

The components preserve the existing local-demo permission and balance logic.
No paid coin or diamond balance is created, and no art interaction grants
anything. Progressive enhancement remains CSS-only and transform/opacity-led.

## Acceptance
Tests cover WebP-only runtime paths, RIFF/WebP signatures, transparent VP8X
native dimensions, updated element usage, missing-image readability,
localization, motion-reduction behavior, mobile layouts and regression checks.
Manual art review of the branch screenshots is still necessary; do not
confuse an automated green run with final visual sign-off.
