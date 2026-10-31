# Hybrid A+B and Competitive C HUD Design — Visual Design Prompt & Asset Plan

**Repo:** https://github.com/weskao/skyline-rush
**Scope:** prepare visuals for a future separately approved feature implementation; this file is a prompt and approval brief, not proof that any image was generated, source modified or asset shipped.
**Existing game:** Vue 3 + strict TS UI, Three.js rendering, realistic × arcade mixed aesthetic; use the current `CLAUDE.md` and `.claude/rules/{ui-architecture,performance-review,device-quality,ui-phase-interactions}.md` as constraints.
**Nonnegotiable:** Android Chrome and iOS Safari/Chrome in both orientations, desktop keyboard/mouse, 3 visual quality tiers, reduced-motion and VFX-off parity, en/zh-TW, actual player control; no misleading UI, clutter, licensed assets or real product screenshots misrepresented as implemented.
**Important distinction:** illustrated concept/mockup and optional SVG/WebP art are only design assets. Implement UI with accessible Vue/CSS and effects with existing game renderer; use actual WebGL shots for visual QA.

**Branch:** `feature/mobile-controls-hud`
**Date:** 2026-10-31
**Status:** Prompt only; assets intentionally NOT created in this documentation stage.

## Locked-source-first design instruction (Visual Fidelity v2)

**Before using the generative art prompt below, open** [the feature's source reference map](https://github.com/weskao/skyline-rush/blob/feature/mobile-controls-hud/docs/designs/mobile-controls-hud/VISUAL-FIDELITY.md). Actual user reference PNGs were located and cropped into `skyline-rush-design-reference-crops.zip`, provided as a conversation download; the **cropped PNG bytes are not yet committed into GitHub**. Import selected PNG files into this branch and request approval before claiming visual fidelity. The user expects high-detail neon/metallic racing-game artwork, not basic low-poly/vector approximations. Avoid producing a newly styled illustration unrelated to the original; use the original concept as a visual reference and record differences.

**Production distinction:** the high-fidelity image is a visual reference (not a live game screenshot), a tiny SVG can be an accessible icon fallback, and real UI is functional Vue3+strict TS/CSS + Three.js. A flattened concept screenshot must not become an interactive screen. A true-transparent cutout must be verified for actual Alpha, not inferred from “transparent” text printed on the source sheet. Include mobile portrait/landscape and desktop comparative screenshots, Low/Medium/High and Reduced Motion, original vs implemented asset identity, materials/glow/lighting and interactive motion, then obtain explicit visual signoff. CI alone does not establish appearance accuracy.

## Ready-to-paste visual generation / design prompt

> Design a cohesive, original UI/UX concept sheet for the browser racing game **Skyline Rush** (https://github.com/weskao/skyline-rush), specifically branch **feature/mobile-controls-hud**. Art direction: physically plausible car/road materials with exciting but controlled arcade-racing accents, legible compact HUD, high contrast and no distracting center-screen overlay. Focus on **Hybrid A+B and Competitive C HUD Design**. Produce **Show one core race scene as three mockups: iPhone portrait Hybrid A+B, short landscape Hybrid A+B, Competitive C with leaderboard/minimap. Include NITRO disabled/charging/READY/active button states, edit controls overlay, distance-to-finish chip and toast**. Deliver composition and interaction annotations rather than a beautiful but unusable game screenshot. **Format:** Production-feasible Vue/CSS HUD layout and SVG iconography with touch hitboxes, not a decorative full-screen bitmap. Responsive reference views: 320×740, 390×844, 412×892, 844×390, 568×320 stress, 1440×900; dark/light track contrast and zh-TW/en text. Use clear, properly spaced Traditional Chinese and English text in final UI copy; if generated text is inaccurate, replace with real editable Vue text later. Keep all interaction targets realistic and preserve 44×44 CSS px minimum touch targets. Three.js visuals must be designed to degrade gracefully on Low/Medium while still recognizable on High. Do not copy commercial game art/brands. Mark renderings as **CONCEPT / NOT ACTUAL GAMEPLAY** until built and captured from running code. Provide a small iconography/asset checklist and annotate what must remain true when VFX is off.

## Proposed output and owning branch

- **Concept sheets:** 320×740, 390×844, 412×892, 844×390, 568×320 stress, 1440×900; dark/light track contrast and zh-TW/en text.
- **Assets / medium:** Re-use src/icons.ts line icons; add simple 24×24 SVG for progress/rank or status only where needed. NO icon-only critical warning.
- **Visual guardrails:** 44px+ hit areas, safe-area offsets, centered car/race sightline unobstructed, C must collapse widgets safely on narrow screens.
- **Acceptance:** Provide element placement annotations and interactive-state sheet, no overlapping buttons, nonessential HUD never replaces full car/road view.
- **Before production:** compare with existing `src/icons.ts` (24px SVG strokes), `public/icons/` and styles; avoid duplicate assets. No PNG sprite sheet for stateful text or interactive controls.
- **Asset paths when explicitly approved:** `docs/designs/mobile-controls-hud/` for concept references, and `public/icons/` or another existing established folder for optimized production SVG/WebP where appropriate. Keep editable source SVG, documented dimensions/transparency and reduced-motion fallback; do not include font binaries.
- **Performance QA:** measure before/after actual browser/WebGL Draw Calls, Triangles, frame-time p50/p95 and GPU memory where possible. Compare Low/Medium/High; never quietly delete gameplay-critical elements at Low.

## Future art-production gates (SDD → BDD → TDD)

- [ ] SDD: review candidate compositions, map each on-screen element/effect to real code and record accepted reference/visual token sheet; no product approval presumed from this Markdown.
- [ ] BDD: add scenario(s) for phone portrait/landscape, desktop, both locales, Low/Medium/High, VFX off, reduced motion and key input states.
- [ ] TDD RED: write relevant UI layout/renderer regression test and verify failure; then implement only accepted SVG/assets/real-time visuals; observe GREEN and refactor.
- [ ] Inspect **real** running WebGL/UI screenshots and actual pointer/keyboard interactions, not generated concept sheets, to approve implementation; verify files optimized and accessible.
- [ ] Check `TODO.md` item only when real integrated feature, image integration, BDD/TDD, `make verify` and exact-HEAD CI are proven green. Do not check off in design phase.
