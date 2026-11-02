# Garage VFX Skins — Prebuilt independent vector artwork

These four original transparent SVG category icons are **generated and committed now** so later implementation can reuse them. They are now **wired into the read-only Phase A Vue catalog**, but **not** wired into the Three.js renderer, inventory, trial logic or an item entitlement.

| File | Purpose |
| --- | --- |
| `thruster.svg` | Exhaust / thruster category |
| `airflow.svg` | Airflow / aerodynamic effects category |
| `nitro-trail.svg` | NITRO trail category |
| `launch-flare.svg` | Launch flare category |

All have transparent root backgrounds, a `96×96` `viewBox`, inline fills/strokes only, accessible SVG titles, no scripts, external fonts, text labels, branding, raster conversion, or painted checkerboard. The read-only Vue catalog displays these icons without suggesting they are premium Three.js materials; missing icon loads fall back to visible category text. Future integration must test iOS/Android browser and desktop, 1×/2× scaling, contrast, VFX-off/reduced-motion fallback, and Low/Medium/High quality without changing ownership rules. Do not infer finished visual effects from the icon files. Source: original GPT-authored vector artwork for Skyline Rush. No bitmap or AI-generated concept sheet is shipped as a runtime asset.
