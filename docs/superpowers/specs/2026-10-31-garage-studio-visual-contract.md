# Garage Preview Studio — visual implementation contract (2026-10-31)

**Source of truth:** approved Desktop, mobile portrait and mobile landscape GPT concept images generated in the assigned ChatGPT thread. They are **non-game design references**, not live screenshots or actual car/product inventory. No rasterized UI or screenshot-backed canvas is shipped.

## Visual composition

- **Desktop 1440×900:** ~70% showroom / ~30% scrollable collection. Preview car is fully visible within a separate dark studio scene; camera toolbar belongs below the canvas, not in the 3D picking layer. Safe-area aware full viewport.
- **Portrait 390×844 / 320×740:** upper half previews the whole car; lower pane scrolls independently with existing paints, equipped/owned/locked state labels, and restore action. Camera buttons wrap but remain ≥44 px.
- **Landscape 844×390:** wide showroom left, narrow scrolling paint collection right; camera toolbar stays reachable, may scroll within its own row, ≥44 px targets.
- **Lighting:** charcoal/navy stage; cool cyan key, warm amber rear rim, understated lit turntable. Geometry and lights are actual Three.js objects, *not* a generated image, and remain legible on Low quality / VFX off.
- **Copy:** en + zh-TW, dynamic live preview status, semantic buttons and an explicit cosmetic-only disclaimer. Locked cosmetics never become equippable merely by previewing.
- **Non-goals:** concept car 'Nexus GT', fake 812 HP stats, mock profile/notifications, invented inventory, skins, shop, trail unlocks, or a new WebGL context. Existing roadster and production PAINTS remain authoritative.

## Rendering and ownership

The render pipeline retains **one** `THREE.WebGLRenderer`, canvas, PerspectiveCamera, EffectComposer and scene target. A lightweight scene in `src/garage-stage.ts` contains the existing roadster model and studio props, and becomes the RenderPass input *only while Garage Studio is active*. Race scene and renderer resources are retained for reliable return. No reactive writes in the frame loop. The car is isolated from race physics, rivals, traffic, track streaming and HUD.

## Verification matrix

- RED/GREEN static scene/paint-state contract tests; Playwright 1440×900, 390×844, 844×390; keyboard and pointer controls, back and close.
- Mandatory subsequent evidence: **actual** Playwright WebGL screenshots (before/after), car NDC bounds using `inspectGarageStudio()`, Draw Calls / Triangles, FPS and frame-time p50/p95 for each Quality tier. Physical iPhone/Android touch + thermal testing not automated here.
- Check exact HEAD GitHub `quality-gate`. **Do not mark TODO 5.2/5.4 complete** without complete real-world verification.

## Implementation refinements

- Camera radius is measured from the real shared roadster body. Its mathematical FOV fit applies to 0.5×–1.8× aspect ratios and all safe zoom levels; zoom is never allowed to clip a vehicle.
- “Restore default paint” is a persistent equip of the already-owned `pearl` finish, not a temporary preview. Locked cosmetics remain preview-only.
- Paint buttons announce equipped/owned/locked in the active language; the Studio instructions accurately describe real star unlocks rather than claiming all cosmetics are unavailable.
- When leaving Studio for Garage Home, pending pointer contacts are cleared to prevent an interrupted orbit gesture from affecting later input.
