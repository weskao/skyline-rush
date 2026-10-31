# Future Garage Store Coming-Soon UI — Visual Design Prompt & Asset Plan

**Repo:** https://github.com/weskao/skyline-rush
**Scope:** prepare visuals for a future separately approved feature implementation; this file is a prompt and approval brief, not proof that any image was generated, source modified or asset shipped.
**Existing game:** Vue 3 + strict TS UI, Three.js rendering, realistic × arcade mixed aesthetic; use the current `CLAUDE.md` and `.claude/rules/{ui-architecture,performance-review,device-quality,ui-phase-interactions}.md` as constraints.
**Nonnegotiable:** Android Chrome and iOS Safari/Chrome in both orientations, desktop keyboard/mouse, 3 visual quality tiers, reduced-motion and VFX-off parity, en/zh-TW, actual player control; no misleading UI, clutter, licensed assets or real product screenshots misrepresented as implemented.
**Important distinction:** illustrated concept/mockup and optional SVG/WebP art are only design assets. Implement UI with accessible Vue/CSS and effects with existing game renderer; use actual WebGL shots for visual QA.

**Branch:** `feature/garage-store-readiness`
**Date:** 2026-10-31
**Status:** Independent visual assets listed below have been committed; actual feature/UI integration is deferred until Wave prerequisites pass.

## 已預製並存入 GitHub 的素材（2026-10-31）

**已完成：** [Commit `4802122`](https://github.com/weskao/skyline-rush/commit/480212262d5e5ae0d2dd11065cec7f489d685ef3)。[`coming-soon.svg`](https://github.com/weskao/skyline-rush/blob/feature/garage-store-readiness/public/feature-assets/garage-store-readiness/coming-soon.svg)、[`collection.svg`](https://github.com/weskao/skyline-rush/blob/feature/garage-store-readiness/public/feature-assets/garage-store-readiness/collection.svg)；詳見 [素材清單](https://github.com/weskao/skyline-rush/blob/feature/garage-store-readiness/public/feature-assets/garage-store-readiness/ASSET-MANIFEST.md)。

非交易性 Coming Soon 與 Collection 圖示完成；真正商店頁面、付款規則與商品尚未獲准實作。 **不要在正式開發階段無理由重新生成同類圖示**；先驗證是否能直接引用現有素材，測試真實瀏覽器畫面與載入失敗 fallback。所有素材仍未接入 Vue／Three.js，**不可把圖片完成當成 TODO 實作完成**。

## Source-reference-first image-generation gate (Visual Fidelity v2)

**Required source and status:** [`docs/designs/garage-store-readiness/VISUAL-FIDELITY.md`](https://github.com/weskao/skyline-rush/blob/feature/garage-store-readiness/docs/designs/garage-store-readiness/VISUAL-FIDELITY.md). The original high-resolution neon-metallic source images are preserved in the current conversation as `skyline-rush-design-reference-crops.zip`, **not yet uploaded as PNG bytes to GitHub**. Copy the selected approved reference into `docs/designs/garage-store-readiness/references/` with Git SHA before claiming artwork fidelity; note that earlier programmatic 96×96 SVGs were intentionally lightweight functional placeholders, *not* visually equivalent to premium 3D art.

**Do not blindly generate unrelated new concepts.** First compare original design composition, materials, shadows, glow, color palette, physical car rendering, button placement and animations against actual branch screenshots. When new independent artwork is justified, use actual GPT image generation to match the **approved** style, preserve transparent Alpha for cutouts, store real optimized files and traceable provenance. Keep any speculative coin/payment values nonfunctional. Implement real UI using Vue3 + strict TypeScript and actual VFX using shared Three.js. Run SDD → BDD → TDD and inspect real Playwright images plus interaction videos across portrait/landscape/desktop and all three graphics tiers. Gate on user-reviewed visual similarity and behavior, not CI or an invented percent score.

## Ready-to-paste visual generation / design prompt

> Design a cohesive, original UI/UX concept sheet for the browser racing game **Skyline Rush** (https://github.com/weskao/skyline-rush), specifically branch **feature/garage-store-readiness**. Art direction: physically plausible car/road materials with exciting but controlled arcade-racing accents, legible compact HUD, high contrast and no distracting center-screen overlay. Focus on **Future Garage Store Coming-Soon UI**. Produce **Garage Home Shop Coming Soon entry, future cosmetic bundle preview card with Preview Only/Unavailable labels, no clickable BUY or price until compliance and actual payments approved**. Deliver composition and interaction annotations rather than a beautiful but unusable game screenshot. **Format:** Muted Coming Soon storefront sketches and disabled commerce components ONLY, not a deployed transaction flow. Responsive reference views: 390×844 and 1440×900; screenshot with shop hidden vs coming-soon shown; bilingual UX. Use clear, properly spaced Traditional Chinese and English text in final UI copy; if generated text is inaccurate, replace with real editable Vue text later. Keep all interaction targets realistic and preserve 44×44 CSS px minimum touch targets. Three.js visuals must be designed to degrade gracefully on Low/Medium while still recognizable on High. Do not copy commercial game art/brands. Mark renderings as **CONCEPT / NOT ACTUAL GAMEPLAY** until built and captured from running code. Provide a small iconography/asset checklist and annotate what must remain true when VFX is off.

## Proposed output and owning branch

- **Concept sheets:** 390×844 and 1440×900; screenshot with shop hidden vs coming-soon shown; bilingual UX.
- **Assets / medium:** Optionally a vector shopping-bag/collection icon and lightweight coming-soon illustration; prioritize existing icon patterns; no real payment logos.
- **Visual guardrails:** No real-money claims, SDK integration, currency exchange rates, purchase receipts or entitlement grant logic.
- **Acceptance:** User cannot accidentally think a card is purchasable; both locale copy and accessibility identify disabled state.
- **Before production:** compare with existing `src/icons.ts` (24px SVG strokes), `public/icons/` and styles; avoid duplicate assets. No PNG sprite sheet for stateful text or interactive controls.
- **Asset paths when explicitly approved:** `docs/designs/garage-store-readiness/` for concept references, and `public/icons/` or another existing established folder for optimized production SVG/WebP where appropriate. Keep editable source SVG, documented dimensions/transparency and reduced-motion fallback; do not include font binaries.
- **Performance QA:** measure before/after actual browser/WebGL Draw Calls, Triangles, frame-time p50/p95 and GPU memory where possible. Compare Low/Medium/High; never quietly delete gameplay-critical elements at Low.

## Future art-production gates (SDD → BDD → TDD)

- [ ] SDD: review candidate compositions, map each on-screen element/effect to real code and record accepted reference/visual token sheet; no product approval presumed from this Markdown.
- [ ] BDD: add scenario(s) for phone portrait/landscape, desktop, both locales, Low/Medium/High, VFX off, reduced motion and key input states.
- [ ] TDD RED: write relevant UI layout/renderer regression test and verify failure; then implement only accepted SVG/assets/real-time visuals; observe GREEN and refactor.
- [ ] Inspect **real** running WebGL/UI screenshots and actual pointer/keyboard interactions, not generated concept sheets, to approve implementation; verify files optimized and accessible.
- [ ] Check `TODO.md` item only when real integrated feature, image integration, BDD/TDD, `make verify` and exact-HEAD CI are proven green. Do not check off in design phase.

## GPT image-generation decision and production-ready asset prompt (Wave 2／3)

**Asset decision:** Shop remains disabled Coming Soon; artwork cannot imply working checkout, paid balance, official prices or brand-backed receipts.

**Potential outputs:** Shop Coming Soon placeholder illustration and optional small collection/bag symbols.

**Transparency:** Isolated icon/bag and empty state artwork: transparent alpha; only standalone store scene background may be opaque. A transparent PNG/WebP needs **real alpha channel**; a white/checkerboard background drawn into RGB pixels is **not transparent**. SVG/vector icons must be actually authored as SVG and checked, never created by renaming a raster file.

### Direct image-generation brief (use only if actually needed during implementation)

> Produce a tasteful arcade-racing collection-shop **Coming Soon** original illustration and a separate centered shopping bag/category icon on **true transparent RGBA** background with no baked-in words, prices, buttons, credit cards or payment logos. Keep the store concept visually inactive and non-transactional; labels must be rendered later with accessible Vue text. No existing racing-game copyrighted brands. Visual design for Skyline Rush (https://github.com/weskao/skyline-rush), branch `feature/garage-store-readiness`. Keep the original game art direction: realistic car/track with restrained arcade effects. Generate individual assets separately when a transparent background is requested. Concept boards and production assets are **different deliverables**. Responsive preview on Android/iOS browser portrait and landscape plus desktop. Low/Medium/High visual quality, Reduced Motion and VFX Off must remain usable. Never reproduce a competitor's identifiable art or trademark.

### Production acceptance & planned storage

- [ ] **S0 — Decide necessity:** inspect `src/icons.ts`, `public/icons/`, CSS, current Three.js effects and actual source assets. If reusable primitives are adequate, explicitly mark “no new image generated” and proceed; a new bitmap is not automatically a better UI.
- [ ] **S1 — Generate only with real tools:** when visual assets add demonstrable value, use available GPT image-generation capability in the implementation chat and inspect its actual results. If unavailable, note blocked design work rather than pretending the file exists.
- [ ] **S2 — Check transparent alpha:** verify background really disappears over white, dark and saturated checker tiles (the test checker is outside the asset), no unintentional matte/fringes, no cropping, artifacts, trademark/copyright reuse or unreadable fine detail at intended CSS pixels.
- [ ] **S3 — Package:** store reviewed concept boards under `docs/designs/garage-store-readiness/` and production assets in an established appropriate `public/` path, using semantic names. Prefer existing 24×24 SVG icons where possible; for raster use transparent PNG as source and WebP/PNG after compression as appropriate. Document size, dimensions, alpha mode, actual usage and fallbacks; **do not commit font binaries, massive uncompressed atlases, screenshot-based interactive UI or unused candidate assets**.
- [ ] **S4 — BDD/TDD:** Given missing/slow asset, wrong quality tier, RTL? (not required), VFX Off/Reduced Motion or short landscape; When component renders; Then readable semantic fallback and valid controls remain. Verify 320×740, 390×844, 844×390 and 1440×900, en/zh-TW, touch/keyboard, Low/Medium/High; perform RED→GREEN and capture actual UI/WebGL screenshots.
- [ ] **S5 — Real perf:** measure decoded image/texture memory, network bytes, shader warmup, Draw Calls and p50/p95 frame time if changed. Do not make raster art a fake dynamic renderer or UI. Only mark the corresponding implementation TODO `- [x]` after full feature proof and exact-HEAD CI green.

**This design brief is not proof that runtime integration exists.** The pre-created SVG assets listed above are real and committed; further optional imagery must be justified separately.

