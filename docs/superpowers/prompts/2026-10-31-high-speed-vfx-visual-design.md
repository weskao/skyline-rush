# NITRO/BOOST Sprint VFX Storyboard — Visual Design Prompt & Asset Plan

**Repo:** https://github.com/weskao/skyline-rush
**Scope:** prepare visuals for a future separately approved feature implementation; this file is a prompt and approval brief, not proof that any image was generated, source modified or asset shipped.
**Existing game:** Vue 3 + strict TS UI, Three.js rendering, realistic × arcade mixed aesthetic; use the current `CLAUDE.md` and `.claude/rules/{ui-architecture,performance-review,device-quality,ui-phase-interactions}.md` as constraints.
**Nonnegotiable:** Android Chrome and iOS Safari/Chrome in both orientations, desktop keyboard/mouse, 3 visual quality tiers, reduced-motion and VFX-off parity, en/zh-TW, actual player control; no misleading UI, clutter, licensed assets or real product screenshots misrepresented as implemented.
**Important distinction:** illustrated concept/mockup and optional SVG/WebP art are only design assets. Implement UI with accessible Vue/CSS and effects with existing game renderer; use actual WebGL shots for visual QA.

**Branch:** `feature/high-speed-vfx`
**Date:** 2026-10-31
**Status:** Independent visual assets listed below have been committed; actual feature/UI integration is deferred until Wave prerequisites pass.

## 已預製並存入 GitHub 的素材（2026-10-31）

**已完成：** [Commit `e891bc8`](https://github.com/weskao/skyline-rush/commit/e891bc8069ccc603a0aaeaa626ef0ccd9cdb2316)。[`sprint-vfx-storyboard.svg`](https://github.com/weskao/skyline-rush/blob/feature/high-speed-vfx/docs/designs/high-speed-vfx/sprint-vfx-storyboard.svg)；詳見 [素材清單](https://github.com/weskao/skyline-rush/blob/feature/high-speed-vfx/docs/designs/high-speed-vfx/ASSET-MANIFEST.md)。

NITRO／BOOST 四階段概念分鏡完成（不透明背景）；這只是設計參考，實際 Renderer／Shader／FPS 的工作仍須等 HUD 整合後進行。 **不要在正式開發階段無理由重新生成同類圖示**；先驗證是否能直接引用現有素材，測試真實瀏覽器畫面與載入失敗 fallback。所有素材仍未接入 Vue／Three.js，**不可把圖片完成當成 TODO 實作完成**。

## Locked-source-first design instruction (Visual Fidelity v2)

**Before using the generative art prompt below, open** [the feature's source reference map](https://github.com/weskao/skyline-rush/blob/feature/high-speed-vfx/docs/designs/high-speed-vfx/VISUAL-FIDELITY.md). Actual user reference PNGs were located and cropped into `skyline-rush-design-reference-crops.zip`, provided as a conversation download; the **cropped PNG bytes are not yet committed into GitHub**. Import selected PNG files into this branch and request approval before claiming visual fidelity. The user expects high-detail neon/metallic racing-game artwork, not basic low-poly/vector approximations. Avoid producing a newly styled illustration unrelated to the original; use the original concept as a visual reference and record differences.

**Production distinction:** the high-fidelity image is a visual reference (not a live game screenshot), a tiny SVG can be an accessible icon fallback, and real UI is functional Vue3+strict TS/CSS + Three.js. A flattened concept screenshot must not become an interactive screen. A true-transparent cutout must be verified for actual Alpha, not inferred from “transparent” text printed on the source sheet. Include mobile portrait/landscape and desktop comparative screenshots, Low/Medium/High and Reduced Motion, original vs implemented asset identity, materials/glow/lighting and interactive motion, then obtain explicit visual signoff. CI alone does not establish appearance accuracy.

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

## GPT image-generation decision and production-ready asset prompt (Wave 2／3)

**Asset decision:** Use shared Three.js renderer and existing VFX inputs for FOV/shaders/trails. Do NOT use static full-screen overlays or game screenshots as pseudo-speed.

**Potential outputs:** NITRO/BOOST speed-ramp storyboard and possibly microtextures/sprite candidates.

**Transparency:** Storyboards with full scenes can be opaque; isolated energy-ring/speed-streak sprite candidates only when justified: true alpha. A transparent PNG/WebP needs **real alpha channel**; a white/checkerboard background drawn into RGB pixels is **not transparent**. SVG/vector icons must be actually authored as SVG and checked, never created by renaming a raster file.

### Direct image-generation brief (use only if actually needed during implementation)

> Produce a six-panel original concept storyboard comparing NITRO and BOOST across ignition, sustain and ease-down, annotated with clear car/road sightline and visual intensity. For any *optional* reusable energy-ring sprite, create a separate **transparent-background** centered ring with no lettering, no car, no horizon and no fake checkerboard; otherwise deliver storyboards only. Favor actual real-time Three.js effects over image-based blur. Visual design for Skyline Rush (https://github.com/weskao/skyline-rush), branch `feature/high-speed-vfx`. Keep the original game art direction: realistic car/track with restrained arcade effects. Generate individual assets separately when a transparent background is requested. Concept boards and production assets are **different deliverables**. Responsive preview on Android/iOS browser portrait and landscape plus desktop. Low/Medium/High visual quality, Reduced Motion and VFX Off must remain usable. Never reproduce a competitor's identifiable art or trademark.

### Production acceptance & planned storage

- [ ] **S0 — Decide necessity:** inspect `src/icons.ts`, `public/icons/`, CSS, current Three.js effects and actual source assets. If reusable primitives are adequate, explicitly mark “no new image generated” and proceed; a new bitmap is not automatically a better UI.
- [ ] **S1 — Generate only with real tools:** when visual assets add demonstrable value, use available GPT image-generation capability in the implementation chat and inspect its actual results. If unavailable, note blocked design work rather than pretending the file exists.
- [ ] **S2 — Check transparent alpha:** verify background really disappears over white, dark and saturated checker tiles (the test checker is outside the asset), no unintentional matte/fringes, no cropping, artifacts, trademark/copyright reuse or unreadable fine detail at intended CSS pixels.
- [ ] **S3 — Package:** store reviewed concept boards under `docs/designs/high-speed-vfx/` and production assets in an established appropriate `public/` path, using semantic names. Prefer existing 24×24 SVG icons where possible; for raster use transparent PNG as source and WebP/PNG after compression as appropriate. Document size, dimensions, alpha mode, actual usage and fallbacks; **do not commit font binaries, massive uncompressed atlases, screenshot-based interactive UI or unused candidate assets**.
- [ ] **S4 — BDD/TDD:** Given missing/slow asset, wrong quality tier, RTL? (not required), VFX Off/Reduced Motion or short landscape; When component renders; Then readable semantic fallback and valid controls remain. Verify 320×740, 390×844, 844×390 and 1440×900, en/zh-TW, touch/keyboard, Low/Medium/High; perform RED→GREEN and capture actual UI/WebGL screenshots.
- [ ] **S5 — Real perf:** measure decoded image/texture memory, network bytes, shader warmup, Draw Calls and p50/p95 frame time if changed. Do not make raster art a fake dynamic renderer or UI. Only mark the corresponding implementation TODO `- [x]` after full feature proof and exact-HEAD CI green.

**This design brief is not proof that runtime integration exists.** The pre-created SVG assets listed above are real and committed; further optional imagery must be justified separately.

