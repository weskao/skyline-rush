# NITRO/BOOST Sprint VFX Storyboard — Visual Design Prompt & Asset Plan

**Repo:** https://github.com/weskao/skyline-rush
**Scope:** prepare visuals for a future separately approved feature implementation; this file is a prompt and approval brief, not proof that any image was generated, source modified or asset shipped.
**Existing game:** Vue 3 + strict TS UI, Three.js rendering, realistic × arcade mixed aesthetic; use the current `CLAUDE.md` and `.claude/rules/{ui-architecture,performance-review,device-quality,ui-phase-interactions}.md` as constraints.
**Nonnegotiable:** Android Chrome and iOS Safari/Chrome in both orientations, desktop keyboard/mouse, 3 visual quality tiers, reduced-motion and VFX-off parity, en/zh-TW, actual player control; no misleading UI, clutter, licensed assets or real product screenshots misrepresented as implemented.
**Important distinction:** illustrated concept/mockup and optional SVG/WebP art are only design assets. Implement UI with accessible Vue/CSS and effects with existing game renderer; use actual WebGL shots for visual QA.

**Branch:** `feature/high-speed-vfx`
**Date:** 2026-10-31
**Status:** Prompt only; assets intentionally NOT created in this documentation stage.

## Ready-to-paste visual generation / design prompt

> Design a cohesive, original UI/UX concept sheet for the browser racing game **Skyline Rush** (https://github.com/weskao/skyline-rush), specifically branch **feature/high-speed-vfx**. Art direction: physically plausible car/road materials with exciting but controlled arcade-racing accents, legible compact HUD, high contrast and no distracting center-screen overlay. Focus on **NITRO/BOOST Sprint VFX Storyboard**. Produce **NITRO idle→burst→sustained→ease-down versus BOOST idle→jet airflow→sustain→ease-down, plus both activated and near-top-speed line density; show peripheral streak zone, exact clear center road/camera composition**. Deliver composition and interaction annotations rather than a beautiful but unusable game screenshot. **Format:** Four-keyframe motion storyboard and GPU-feasibility design guide, NOT a static overlay used as the effect. Responsive reference views: Driver/chase cam desktop 1440×900, phone portrait 390×844, landscape 844×390; Low/Medium/High vs Reduced Motion side-by-side. Use clear, properly spaced Traditional Chinese and English text in final UI copy; if generated text is inaccurate, replace with real editable Vue text later. Keep all interaction targets realistic and preserve 44×44 CSS px minimum touch targets. Three.js visuals must be designed to degrade gracefully on Low/Medium while still recognizable on High. Do not copy commercial game art/brands. Mark renderings as **CONCEPT / NOT ACTUAL GAMEPLAY** until built and captured from running code. Provide a small iconography/asset checklist and annotate what must remain true when VFX is off.

## Proposed output and owning branch

- **Concept sheets:** Driver/chase cam desktop 1440×900, phone portrait 390×844, landscape 844×390; Low/Medium/High vs Reduced Motion side-by-side.
- **Assets / medium:** Storyboard only (reference PNG/WebP) and optional tiny transparent texture if benchmarks prove useful; production effects should use existing Three.js shaders, speedLines, shockwave, fov and trail systems.
- **Visual guardrails:** No full-screen blur, fake physics or flashing. Watch black-frame shader issues, first-frame compile, frame p95; all quality tiers preserve cues.
- **Acceptance:** Annotate speed/acceleration input, VFX intensity clamp and deceleration easing, and specify real WebGL capture/measurement criteria.
- **Before production:** compare with existing `src/icons.ts` (24px SVG strokes), `public/icons/` and styles; avoid duplicate assets. No PNG sprite sheet for stateful text or interactive controls.
- **Asset paths when explicitly approved:** `docs/designs/high-speed-vfx/` for concept references, and `public/icons/` or another existing established folder for optimized production SVG/WebP where appropriate. Keep editable source SVG, documented dimensions/transparency and reduced-motion fallback; do not include font binaries.
- **Performance QA:** measure before/after actual browser/WebGL Draw Calls, Triangles, frame-time p50/p95 and GPU memory where possible. Compare Low/Medium/High; never quietly delete gameplay-critical elements at Low.

## Future art-production gates (SDD → BDD → TDD)

- [ ] SDD: review candidate compositions, map each on-screen element/effect to real code and record accepted reference/visual token sheet; no product approval presumed from this Markdown.
- [ ] BDD: add scenario(s) for phone portrait/landscape, desktop, both locales, Low/Medium/High, VFX off, reduced motion and key input states.
- [ ] TDD RED: write relevant UI layout/renderer regression test and verify failure; then implement only accepted SVG/assets/real-time visuals; observe GREEN and refactor.
- [ ] Inspect **real** running WebGL/UI screenshots and actual pointer/keyboard interactions, not generated concept sheets, to approve implementation; verify files optimized and accessible.
- [ ] Check `TODO.md` item only when real integrated feature, image integration, BDD/TDD, `make verify` and exact-HEAD CI are proven green. Do not check off in design phase.
