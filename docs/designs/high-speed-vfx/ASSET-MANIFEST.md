# Sprint VFX storyboard — design-only independent asset

- `sprint-vfx-storyboard.svg` is a newly authored, self-contained **concept illustration**, not gameplay, shader, texture, UI component or finished particle effect.
- Two rows: NITRO (violet) and BOOST (cyan); four columns: READY → IGNITION → SUSTAIN → RECOVERY. Center lane/car visibility is prioritized; all text is explanatory only.
- This is an **opaque** design board; transparency is intentionally not required for a storyboard. No game texture or transparent energy-ring sprite is manufactured without renderer profiling.
- The downstream Wave 2 implementation must inspect the current `src/world.js`, `src/effects.js`, `src/aero-vfx.js` and VFX Settings *after* Mobile HUD integration; test actual shader warm-up, reduced motion and Low/Medium/High, compare real WebGL screenshots. The storyboard must never replace live shaders.
- Status: independent design illustration completed and committed; runtime VFX implementation **not started**. Original GPT-authored SVG design graphic.
