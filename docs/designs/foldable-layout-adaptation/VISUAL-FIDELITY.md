# Visual Fidelity Review — foldable-layout-adaptation

**Repo:** https://github.com/weskao/skyline-rush  
**Branch:** `feature/foldable-layout-adaptation`  
**Wave:** 2  
**Design state:** `CANDIDATE_REFS_ONLY / PENDING_REVIEW`. No reference has been certified visually equivalent to runtime UI.
**Required shared gate:** `docs/superpowers/specs/2026-10-31-visual-fidelity-gate.md` on `feature/ux-ui-combo-mobile-controls`.

## Exact original visual reference mapping

**Desired design elements:** Responsive hinge/foldable HUD and touch controls.

**Reference files in delivered archive:** `w1-mobile-hud-hybrid-a.png`, `w1-mobile-hud-competitive-c.png`.

**Implementation modules to inspect:** src/touch-controls-ui.ts, src/control-settings.ts, src/style.css.

**Critical detail:** Apply approved HUD visual language to hinge and split screen without hardcoding a device mockup.

## Provenance of candidate art

- **Reference pack:** `skyline-rush-design-reference-crops.zip`, exported from source images supplied with the conversation on 2026-10-31. This archive is provided as a downloadable artifact in the conversation; **not yet committed to GitHub**. The source names and SHA-256 are recorded below. Do not invent a GitHub image URL.
- `image(20261030-194940).png`: `b5c230027dd8c7923e73550135ec05f216d9941c2e2b725177764fd0f153ab7d`.
- `a_clean_high_resolution_game_ui_asset_showcase_sh.png`: `ed04a69c57a9d6982f0f5f6ed02aa7542821c617134065fbdd040d7ef91bca41`.
- `a_detailed_infographic_style_concept_design_mockup.png`: `80db0c6a726362ac3df9981b98427eff96e558809368404ab2734919d22943c3`.
- **No approval implied:** the images are candidate references and contain invented states/economy and distorted AI labels. Do not copy those fake data values. A later agent must add the appropriate selected PNG *bytes* to `docs/designs/<feature>/references/` via a real Git upload and record an approved SHA, or explicitly mark design review blocked. The built-in 2026-10-31 layout SVGs for Wave 1 are low-fidelity editable positioning sketches, **not replacements for these original renders**.


## Pending pixel/interaction contract (must be signed off before claiming fidelity)

- [ ] Confirm selected reference files exist as Git blobs in this branch and list SHA, approved viewport and recorded approval date; do not use a temporary chat preview as the long-term sole source.
- [ ] Define component bounds/relative anchors at desktop `1440×900`, iPhone portrait `390×844`, landscape `844×390`, small portrait `320×740`, landscape stress `568×320`; include safe areas, z-index, 44px touch zones, scroll behavior, Hindi? **No** — only `zh-TW` and `en`.
- [ ] Map every visually significant element to Vue 3 + strict TS/CSS, existing SVG, compressed true-alpha WebP/PNG, or real shared Three.js material/shader/lighting; do not use a flattened concept screenshot as an interactive HUD/scene.
- [ ] Define palette, typography, card/background hierarchy, sprite identity, icon labels, color contrast and motion (duration, easing, triggers), plus Low/Medium/High and Reduced Motion branches. Any deliberate simplification versus concept must be documented and approved, not silently substituted.
- [ ] Capture **actual current WebGL + DOM** as RED visual baseline on three core viewports; author BDD/Playwright state+geometry tests and iterate to an approved render. Reuse and properly optimize existing assets first; icon fallback must work.
- [ ] Side-by-side compare layout / car composition / lighting / visual polish / motion / interactivity; log each difference as `PASS`, `FAIL`, `APPROVED_DEVIATION` or `BLOCKED` with actual screenshots, video, branch SHA and reviewer.
- [ ] Do not mark TODO items `- [x]` until accepted visuals and behavior, browser tests, performance and exact-HEAD CI are proven. Do not auto-merge into main.

## Important current limits

The reference PNGs are not transparent cutouts, even if a collage visually says “transparent PNG”: alpha channel may be opaque or nearly opaque. Transparent production assets must be actually extracted/redrawn and verified against black/white/colored backgrounds, not simply crop a panel screenshot. A `*.svg` authored by hand is also not automatically as detailed as a user-approved 3D item illustration.

**Status:** design mapping drafted; screenshot verification and full fidelity signoff still pending.
