# Skyline Rush — Visual Fidelity Gate (SDD → BDD → TDD)

**Scope:** future Skyline Rush UI, 3D preview, icons, art, HUD and VFX on Android/iOS portrait+landscape, desktop, Low/Medium/High Quality.  
**Repo:** https://github.com/weskao/skyline-rush  
**Authority:** this is a **proposed process contract**, not approval of any specific AI mockup. Per-feature reviewed designs govern appearance after signoff. Live gameplay and existing game rules govern functional correctness.  
**Motivation:** early AI concept sheets and later simplified SVGs did not share a precise, implementable layout/asset contract. CI and function tests did not prove fidelity.

## Ownership and artifact rules

1. **Reference intake:** identify the real image (Git blob or local file verified at handoff), source and rights; distinguish **AI CONCEPT**, **APPROVED DESIGN**, **REAL WEBGL CAPTURE**, **RUNTIME ASSET**. Do not rely on an image from another GPT conversation that is not committed, and do not re-create unrelated art by hand while reporting it as the reference.
2. **SDD — Visual Contract before code:** review the latest `CLAUDE.md`, UI/3D modules and brand direction (realistic × arcade). Store a self-contained source-of-truth artifact under `docs/designs/<feature>/` with desktop 1440×900, mobile portrait 390×844, landscape 844×390; add 320×740 and 568×320 stress cases. Include layer map, CSS pixel dimensions or normalized proportions, placement, spacing/typography/color tokens, z-order and touch-hit geometry (≥44px), exact asset IDs, states, camera framing/3D lighting, transitions/timing, quality-tier delta and responsive rules. When AI spelling/text is distorted, text must be separately typed as editable zh-TW/en Vue copy.
3. **Design gate:** **stop before visually affected implementation** unless the design is explicitly marked approved by user/reviewer in the owning feature's `VISUAL-FIDELITY.md`, including design ref SHA. If no approval, code may implement infrastructure/behavior, but visual signoff is **Blocked / Awaiting design approval**, never `- [x]`. Record tradeoffs/intentional deviations.
4. **Asset pipeline:** prefer existing CSS/SVG/Three.js. When needed use image generation for **original** UI cutouts/backgrounds; archive final image bytes under `docs/designs/<feature>/references/` and approved optimized runtime copies under `public/`. For icons/isolated VFX require **real transparent alpha** PNG/WebP or genuine alpha-less-background SVG (no white/checkerboard pixels); standalone backdrops may be opaque. Preserve source, license/provenance, output sizes, variants and accessible fallbacks. **A flattened AI collage is never directly a clickable UI.** Do not substitute newly simplified 2D SVG for user-approved rich 3D art without design review.
5. **BDD — behavior and appearance:** Given named viewport/locale/mode/tier/state, When the user enters/exits/interacts, Then the same expected zones, readability, camera framing, asset identity and actual control behavior appear. Include overlay conflicts, orientation rotation, pointer cancellation, text expansion, VFX OFF, Reduced Motion, icon load failure.
6. **TDD:** write failing geometry, state and image-asset contract tests before updates; then GREEN real Vue3+strict TS/CSS and shared Three.js; REFACTOR without shifting accepted layout. Prefer stable Playwright locators and deterministic DOM geometry (rectangles; safe-area bounds), and PNG snapshot tests for non-random static UI. GPU-rendered gameplay cannot be judged purely by snapshot pixel diff; capture real WebGL, seed repeatability if possible, record GPU/browser/quality and manually compare design composition, car cropping, atmosphere and VFX.
7. **Visual Fidelity Gate — before `TODO.md - [x]`:** capture reference and **real implementation** side by side on each target viewport at consistent scale. Review (a) structure/placement, (b) relative car size/angle and central sightline, (c) color/material/lighting/glow, (d) text/hierarchy/icon/state fidelity, (e) motion/feedback/timing, (f) live interaction & focus and (g) perf/comfort. Record each as PASS/FAIL/DEVIATION APPROVED/BLOCKED with links, exact commit, screenshot and acceptance owner. A pixel score alone never substitutes design review; **do not invent a 90% similarity score**.
8. **Quality and performance:** Low/Medium/High preserve gameplay/HUD/menus and visual identity while scaling expensive particles/post-process; benchmark Draw Calls, triangles, network bytes, memory, p50/p95 frame-time at equal setups. Reduced Motion overrides rich motion. Do not preload huge uncompressed art on phones.
9. **CI and merge:** baseline browser screenshots are *not* acceptance by themselves. Only after required typecheck, unit/BDD tests, build, browser/layout tests, actual image/animation capture, full quality matrix evidence and final-HEAD CI should a fully complete TODO subitem be checked. Never auto-merge into main, PR or deploy without user instruction. If capabilities for real recording/device are absent, mark **UNVERIFIED**, don't simulate proof.
10. **Parallel branch policy:** separate feature-owned assets/evidence and `docs/designs/<feature>/`. Design baseline modifications require a reviewed diff/change note. Wave 2/3 assets may be drafted independently; live scene and animation integration waits for stated prior Wave gates.

## Mandatory evidence manifest template

```yaml
feature_branch: feature/<slug>
head_sha: <actual SHA>
reference:
  file: docs/designs/<feature>/...
  design_sha: <actual blob SHA>
  approval: pending  # pending | approved with timestamp/reviewer
platforms:
  android_chrome_portrait: not-verified
  android_chrome_landscape: not-verified
  ios_safari_portrait: not-verified
  ios_safari_landscape: not-verified
  desktop_1440x900: not-verified
quality:
  low: not-verified
  medium: not-verified
  high: not-verified
captures:
  actual_png: []
  actual_video: []
gate:
  geometry: not-verified
  styling: not-verified
  effects: not-verified
  accessibility: not-verified
  performance: not-verified
  final_ci: not-verified
deviations: []
todo_checked: false
```

## Why the original concepts still need design ownership

Prior AI multi-panel HUD/Garage/item images were visual inspiration, **not exact pixels approved and committed to feature branches**. They contain future features, invented currency/statuses, and sometimes unfit mobile control geometry. A new self-contained editable layout **proposal** is prepared in W1 feature branches; the product owner can approve/revise it, and only then use it as an authoritative fidelity baseline. Previous 96×96 SVG assets are real but simplified, not equivalent to the concept collage. Avoid claiming they match until a side-by-side asset review passes.
