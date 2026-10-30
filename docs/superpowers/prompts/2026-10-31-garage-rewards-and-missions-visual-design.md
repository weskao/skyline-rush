# Race Rewards and Missions Iconography — Visual Design Prompt & Asset Plan

**Repo:** https://github.com/weskao/skyline-rush
**Scope:** prepare visuals for a future separately approved feature implementation; this file is a prompt and approval brief, not proof that any image was generated, source modified or asset shipped.
**Existing game:** Vue 3 + strict TS UI, Three.js rendering, realistic × arcade mixed aesthetic; use the current `CLAUDE.md` and `.claude/rules/{ui-architecture,performance-review,device-quality,ui-phase-interactions}.md` as constraints.
**Nonnegotiable:** Android Chrome and iOS Safari/Chrome in both orientations, desktop keyboard/mouse, 3 visual quality tiers, reduced-motion and VFX-off parity, en/zh-TW, actual player control; no misleading UI, clutter, licensed assets or real product screenshots misrepresented as implemented.
**Important distinction:** illustrated concept/mockup and optional SVG/WebP art are only design assets. Implement UI with accessible Vue/CSS and effects with existing game renderer; use actual WebGL shots for visual QA.

**Branch:** `feature/garage-rewards-and-missions`
**Date:** 2026-10-31
**Status:** Prompt only; assets intentionally NOT created in this documentation stage.

## Ready-to-paste visual generation / design prompt

> Design a cohesive, original UI/UX concept sheet for the browser racing game **Skyline Rush** (https://github.com/weskao/skyline-rush), specifically branch **feature/garage-rewards-and-missions**. Art direction: physically plausible car/road materials with exciting but controlled arcade-racing accents, legible compact HUD, high contrast and no distracting center-screen overlay. Focus on **Race Rewards and Missions Iconography**. Produce **Race end compact card showing earned soft-currency placeholder (not final rate), mission progress, claim status, once-only settlement and no-eligible-reward state; daily/weekly mission list**. Deliver composition and interaction annotations rather than a beautiful but unusable game screenshot. **Format:** Compact racing result/mission UI concept with consistent icons and accessible currency affordances. Responsive reference views: 390×844, 844×390, 1440×900; two language variations; no essential buttons covered. Use clear, properly spaced Traditional Chinese and English text in final UI copy; if generated text is inaccurate, replace with real editable Vue text later. Keep all interaction targets realistic and preserve 44×44 CSS px minimum touch targets. Three.js visuals must be designed to degrade gracefully on Low/Medium while still recognizable on High. Do not copy commercial game art/brands. Mark renderings as **CONCEPT / NOT ACTUAL GAMEPLAY** until built and captured from running code. Provide a small iconography/asset checklist and annotate what must remain true when VFX is off.

## Proposed output and owning branch

- **Concept sheets:** 390×844, 844×390, 1440×900; two language variations; no essential buttons covered.
- **Assets / medium:** Original SVG soft-currency symbol exploration (Aero Core/Flux name pending), checkmark/progress and task category icon, simple reward burst used only when actually granted.
- **Visual guardrails:** DO NOT depict real earned balance or claim paid rewards before backend/approved economics exist. Result states must reflect actual verified settlement, not client illusion.
- **Acceptance:** Icons paired with text, valid pending/committed/failed states, no misleading duplicate rewards, meaningful even with VFX off.
- **Before production:** compare with existing `src/icons.ts` (24px SVG strokes), `public/icons/` and styles; avoid duplicate assets. No PNG sprite sheet for stateful text or interactive controls.
- **Asset paths when explicitly approved:** `docs/designs/garage-rewards-and-missions/` for concept references, and `public/icons/` or another existing established folder for optimized production SVG/WebP where appropriate. Keep editable source SVG, documented dimensions/transparency and reduced-motion fallback; do not include font binaries.
- **Performance QA:** measure before/after actual browser/WebGL Draw Calls, Triangles, frame-time p50/p95 and GPU memory where possible. Compare Low/Medium/High; never quietly delete gameplay-critical elements at Low.

## Future art-production gates (SDD → BDD → TDD)

- [ ] SDD: review candidate compositions, map each on-screen element/effect to real code and record accepted reference/visual token sheet; no product approval presumed from this Markdown.
- [ ] BDD: add scenario(s) for phone portrait/landscape, desktop, both locales, Low/Medium/High, VFX off, reduced motion and key input states.
- [ ] TDD RED: write relevant UI layout/renderer regression test and verify failure; then implement only accepted SVG/assets/real-time visuals; observe GREEN and refactor.
- [ ] Inspect **real** running WebGL/UI screenshots and actual pointer/keyboard interactions, not generated concept sheets, to approve implementation; verify files optimized and accessible.
- [ ] Check `TODO.md` item only when real integrated feature, image integration, BDD/TDD, `make verify` and exact-HEAD CI are proven green. Do not check off in design phase.

## GPT image-generation decision and production-ready asset prompt (Wave 2／3)

**Asset decision:** Do not generate actual currency balances, numeric rewards, XP values, dates or localized label textures; these come from verified program state and Vue text.

**Potential outputs:** Earned reward badge, progress/task glyph, daily/weekly mission icons and candidate future soft-currency symbol.

**Transparency:** Icon/medal/coin artwork on truly transparent background with anti-aliased alpha; full results-screen concept may use opaque game screenshot-style backdrop. A transparent PNG/WebP needs **real alpha channel**; a white/checkerboard background drawn into RGB pixels is **not transparent**. SVG/vector icons must be actually authored as SVG and checked, never created by renaming a raster file.

### Direct image-generation brief (use only if actually needed during implementation)

> Produce original minimalist racing-game reward and mission badges, 1:1 icon variants: finish medal, daily task, weekly challenge, locked reward, provisional non-monetary soft-currency token. Each icon isolated on **transparent RGBA**, no white/checkerboard texture, no number/words, no currency symbol implying a real-world value. Do not depict a paid item as already owned; concept Results UI is separate and must clearly show Pending/Committed/Error states through editable text later. Visual design for Skyline Rush (https://github.com/weskao/skyline-rush), branch `feature/garage-rewards-and-missions`. Keep the original game art direction: realistic car/track with restrained arcade effects. Generate individual assets separately when a transparent background is requested. Concept boards and production assets are **different deliverables**. Responsive preview on Android/iOS browser portrait and landscape plus desktop. Low/Medium/High visual quality, Reduced Motion and VFX Off must remain usable. Never reproduce a competitor's identifiable art or trademark.

### Production acceptance & planned storage

- [ ] **S0 — Decide necessity:** inspect `src/icons.ts`, `public/icons/`, CSS, current Three.js effects and actual source assets. If reusable primitives are adequate, explicitly mark “no new image generated” and proceed; a new bitmap is not automatically a better UI.
- [ ] **S1 — Generate only with real tools:** when visual assets add demonstrable value, use available GPT image-generation capability in the implementation chat and inspect its actual results. If unavailable, note blocked design work rather than pretending the file exists.
- [ ] **S2 — Check transparent alpha:** verify background really disappears over white, dark and saturated checker tiles (the test checker is outside the asset), no unintentional matte/fringes, no cropping, artifacts, trademark/copyright reuse or unreadable fine detail at intended CSS pixels.
- [ ] **S3 — Package:** store reviewed concept boards under `docs/designs/garage-rewards-and-missions/` and production assets in an established appropriate `public/` path, using semantic names. Prefer existing 24×24 SVG icons where possible; for raster use transparent PNG as source and WebP/PNG after compression as appropriate. Document size, dimensions, alpha mode, actual usage and fallbacks; **do not commit font binaries, massive uncompressed atlases, screenshot-based interactive UI or unused candidate assets**.
- [ ] **S4 — BDD/TDD:** Given missing/slow asset, wrong quality tier, RTL? (not required), VFX Off/Reduced Motion or short landscape; When component renders; Then readable semantic fallback and valid controls remain. Verify 320×740, 390×844, 844×390 and 1440×900, en/zh-TW, touch/keyboard, Low/Medium/High; perform RED→GREEN and capture actual UI/WebGL screenshots.
- [ ] **S5 — Real perf:** measure decoded image/texture memory, network bytes, shader warmup, Draw Calls and p50/p95 frame time if changed. Do not make raster art a fake dynamic renderer or UI. Only mark the corresponding implementation TODO `- [x]` after full feature proof and exact-HEAD CI green.

**No image asset has been generated or installed by this planning document.**

