# Wave 3 — Frontend-first Image Generation, Asset Specs and Visual Acceptance

**Date:** 2026-11-10 · **Status:** DESIGN/PRODUCTION PLAN ONLY; this commit generates **zero new images**.
**Feature goal:** make a full backend-free demo of Missions, Rewards, Demo Points, Collection and Demo Store feel polished and consistent with existing Skyline Rush Garage art.
**Primary rule:** `.claude/rules/raster-artwork.md`; animated items additionally `.claude/rules/animated-image-production.md`; existing `docs/designs/garage-animated-gifs/gpt-gif-prompts.md` takes priority for its 25 tracked GIFs.
**Master:** `docs/superpowers/plans/wave3-remaining-implementation-master-plan.md`.

## 1. Preserve existing appearance — audit first

**Look:** rich illustrative translucent 3D/sci-fi racing visuals, deep navy/indigo glass, cyan/teal and magenta edge lights, controlled amber/gold accents, crisp metallic highlights, layered specular gradients, physically plausible objects and distinctive silhouettes. Keep original hue, richness, object identity, perspective and light direction for an existing item. Never "repair" a 3D colorful original by replacing it with flat generic vector art. Do not add false balance numbers, monetary symbols, unreadable microtext, labels inside images, vendor logos or copyrighted emblems.

**Existing sources to audit before a single generation:**

| Screen/category | Already tracked source assets | Native source canvas → CSS | Planned action |
| --- | --- | --- | --- |
| Mission center | `mission-race`, `mission-time`, `mission-drift`, `mission-combo` in `public/feature-assets/garage-rewards-and-missions/raster/`; reference in `docs/designs/3x-asset-library/webp/garage-rewards-and-missions/` | 288×288 → 96×96 | **Reuse** after completeness/style/alpha audit; keep current localized text outside art |
| Trophy showcase | `trophy-bronze`, `trophy-silver`, `trophy-gold`, `trophy-platinum` in same folder | 288×288 → 96×96 | Reuse, add true "demo earned" state in text/CSS, not engraved pixels |
| Demo Store preview | `store-cart`, `store-box`, `store-bundle`, `store-tag`, `store-star`, `store-collection` in `public/feature-assets/garage-store-readiness/raster/` | 216×216 → 72×72 | Reuse; do not reinterpret source "box" as paid/random purchase |
| Garage cosmetic skins | `GarageSkinCatalog.vue` references existing runtime `public/feature-assets/garage-vfx-skins/` and `public/feature-assets/garage-animated/`; compare original 3× library | Mostly 288×288 → 96×96, badge 216×216 → 72×72 | Existing visual identity locked; inspect 25 GIF/source lock rules |
| Store banner/summary | Existing store entry uses a 52px display art and current CSS/text | Existing implementation, not a reason to regenerate | Prefer CSS/text; generate only if the actual UI audit shows a missing visual role |

**Original archive caveat:** The 59-image archive includes some PNG cutouts resampled with Lanczos to 3× dimensions; file dimensions alone do **not** prove native generator detail. Do not claim "newly generated native 3×" unless the generation step actually produced that detail. Store restored source SVGs are flat draft references, not license to overwrite richer rendered WebPs.

## 2. Visual asset backlog: one candidate per genuine UI need

| ID | Intended component | Source display size | Required? | Treatment |
| --- | --- | --- | --- | --- |
| A-00 | Existing 4 mission icons + 4 trophy icons | 96 CSS / 288 physical | **Required reuse/audit** | Retain images unless damaged; patch exact original source when cropped or blurry |
| A-01 | Existing 6 Store category illustrations | 72 CSS / 216 physical | **Required reuse/audit** | Do not redraw full set; validate safety glow and screenshot |
| A-02 | Existing trial/equipped/rarity badges, VFX GIFs | 72 or 96 CSS / 216 or 288 physical | **Required reuse/audit** | No generic moving overlay, match physically meaningful motion |
| A-03 | "Demo points / 試玩點數" token, clearly not real money | 72 CSS / **216×216 RGBA** | **Conditional new** — only if textual balance UI needs an icon | Original single iridescent futuristic chip with a non-currency center motif; cyan/amber, no coin currency symbol |
| A-04 | "Demo reward claim" status marker | 72 CSS / **216×216 RGBA** | **Conditional new** — only if existing check icon is insufficient | Original small capsule/reward glow with readable silhouette; actual claimed text remains live |
| A-05 | Empty demo collection illustration | 96 CSS / **288×288 RGBA** | **Optional** — not worth generating if a good CSS/text empty state works | Glowing open display pedestal / outline of a vehicle cosmetic, no fake owned items |
| A-06 | Local-result demo-reward banner | 144×52 CSS / **432×156 RGBA** | **Optional** — only if the real results layout needs artwork | Slim decorative techno-ribbon with clear 1× readability; amount/status rendered by Vue, not baked |
| A-07 | Additional daily/weekly or expiry motif | 72 CSS / **216×216 RGBA** | **Reuse first** | Existing `daily-mission.svg` and `weekly-challenge.svg` available; avoid new art unless visual audit proves they do not fit |

**Do not** generate a paid shopping cart, credit card, premium currency, simulated money stack, mystery loot animation, paid "success" receipt, fake trophy entitlement or unapproved permanent owned badge. Do not create speculative asset batches; A-03/A-04 need only one accepted variant each if approved.

## 3. Mandatory generation brief per new/repaired image

Record one row per file in the eventual production PR/commit handoff:

`asset_id; screen_id; functional_reason; current_source_path; source_blob_sha; operation(reuse|repair|generate); display_css_size; physical_native_size; color_palette; object/silhouette; perspective; lighting; alpha_inset; fixed_parts; moving_parts_if_any; output_path; alt_text_en/zh-TW; reduced_motion_fallback; mobile_qa; status; reviewer; actual_before_after_images`.

Use separate source masters and optimized runtime assets:
- Originals/editable masters: `docs/designs/3x-asset-library/` (or documented source subdirectory).
- Runtime: `public/feature-assets/garage-rewards-and-missions/raster/` or `.../garage-store-readiness/raster/`, by functional owner.
- New local demo art: prefer one dedicated `public/feature-assets/wave3-demo/raster/` and stable item IDs, not arbitrary renamed copies.
- URLs via `import.meta.env.BASE_URL`; native file pixels stay 3× while CSS is **1×**; `object-fit:contain` with ≥8 CSS-px frame padding. Captions must sit **below** images. Render control actions as Vue text/button, ≥44×44 CSS px.

**Mandatory raster acceptance:**
- For new 216×216 icons and store icon repairs, ≥20 pixels **transparent on each edge** at alpha >16/255; preserve the full luminous edge and dangling tip.
- For 288×288 static new assets, aim ≥12 transparent source pixels each side, but verify glow bounds visually and set tighter item-specific safe area if necessary; 288 GIF frames require ≥12 by existing rule.
- No cropped silhouette, adjacent sprite contamination, matte fringe, blurred rescaling, invented letter, color shift from original, missing part or overly tight bounding box. Test dark/light/saturated backgrounds.
- If native 3× cannot be produced from the image generator, report unmet quality and revise *generation/source* method; **never upscale a small rendered crop** to pass dimensions.

## 4. Reusable prompt recipe (for image generation during A01)

**Base prompt (English; append each item's own art direction):**

> Create one original isolated 3D-illustrated futuristic arcade-racing Garage UI icon for Skyline Rush. Preserve the established source reference's silhouette, material richness, saturated cyan/magenta/amber highlights, shiny metal and translucent glass depth; deep navy/indigo card lighting but **no opaque background**. Exactly the requested native 3x RGBA pixel dimensions, complete object and all glows with specified alpha safety inset. Centered stable viewpoint, crisp high-frequency material detail, readable at one-third rendered CSS size. The image contains NO text, logo, numeric amount, cash or premium-currency promise, UI screenshot, watermark or another sprite. Preserve the original item's color identity when repairing. Do not flatten/redesign existing rich artwork.

**Per-item additions:**

- `A-03 demo-points`: one small abstract futuristic energy token, not shaped like legal tender or a dollar coin; metallic indigo enclosure, cyan prismatic core, subtle amber readiness glow; 216×216 transparent, ≥20px alpha inset; distinguishable at 72px CSS next to the live "試玩點數" label.
- `A-04 claim status`: a self-contained holographic latch/confirmation chip, layered metal/plasma material and directional glint (not a whole-sprite white sweep); 216×216 transparent, ≥20px inset; live status label conveys the meaning.
- `A-05 empty collection`: empty illuminated garage display platform with faint vehicle-effect hologram silhouette; nothing falsely labeled "owned"; 288×288 transparent, ≥12px safe inset; 96px CSS and no lettering.
- `A-06 results banner`: horizontal sci-fi brushed metallic housing with subtle cyan-to-violet highlight and ample central negative space for separately rendered DOM status, 432×156 transparent. DO NOT bake point counts or button text.

**Negative prompt shared:** no flat replacement of original 3D illustration; no global luminous stripe overlay; no crop, no chopped tips, no checkerboard-in-pixels, no white matte, no neighboring sheet fragments, no tiny icon inside a huge empty canvas, no blur, no oversharpen halo, no watermark, no text/number/brand/logo.

When editing an existing item, **reference the exact existing image**, supply its blob path/SHA and explicitly request local inpainting of the broken part only. Show side-by-side original and corrected 1× CSS samples for approval. Do not repaint unrelated items.

## 5. Animated GIF / sprite sheet gate (only when needed)

For asset roles where motion conveys meaning (e.g. actual thruster, airflow, launch, energized demo reward), use the original item as frame reference. Genuine moving internal parts/plasma/particles, with stationary body, spatial continuity, spawn→motion→fade, physical easing, repeatable first/last frames; **not** moving entire icon or tint-wiping the artwork.

| Output class | Frame size | Frames | Timing | Edge inset | Limit |
| --- | --- | --- | --- | --- | --- |
| Garage/reward animated 96px UI | 288×288 | 20–24 | 50ms/frame, ~20 FPS | ≥12px | <900,000 bytes |
| Store/mini 72px UI | 216×216 | 20–24 | 50ms/frame, ~20 FPS | ≥20px | <900,000 bytes |

Export equal-size RGBA sheet cells first; **each cell** is already the full 3× frame resolution; consistent transparent backgrounds; GIF89a shared palette ≤255 colors + transparency index, infinite seamless loop. Handle alpha/glow matte against the **actual Garage card tint**, not an unrelated dark slab; GIF is 1-bit alpha. Refer to `scripts/package-garage-authored-gifs.py` only where it matches existing catalog ownership. Provide the unanimated first frame for Reduced Motion and VFX Off. No GIF required for static missions/points merely to look expensive.

## 6. Visual QA, test and evidence matrix

1. Unit/asset tests: each required file exists and decodes, native dimensions match CSS 3×, alpha bounds of actual source pixel data pass, no stale/unapproved file path in catalog; no hardcoded text inside assets. Inspect actual manifest/provenance.
2. Browser: `GarageArtworkImage.vue` and `GarageArtworkTile.vue` in active UI show full uncropped image with no overlapping caption/control, fallback when a WebP/PNG is missing, correct localized live labels and keyboard/touch. Include screens for 390×844 portrait, 844×390 landscape and 1440×900 desktop.
3. Game: capture actual live race Results→Garage, collection, demo store at Low/Medium/High, VFX Off, Reduced Motion, en/zh-TW. Ensure no GPU/texture churn or hidden input due to image overlay; avoid unreadable glow.
4. Style audit: compare input/reference source and new pixels at **1× actual display** and 100% source; preserve saturated 3D, angle and object shape. Art approval is **human** and separate from numeric alpha tests.
5. Record in `TODO.md` and the master-plan evidence ledger: asset ID, source SHA, generated file SHA, prompt version, source vs rendered preview path, test output, actual WebGL screenshots, reviewer PASS/FAIL, issues. Leave acceptance unchecked if any reference, test or real visual verification was not observed.

**Explicit current result:** only the plan, prompts, sizes and acceptance gates are authored; **no images are generated, changed or shipped by this documentation branch**.


## 7. A-03 / A-04 produced image filenames and implementation handoff (2026-11-10)

The user's first two new Wave 3 visual assets have been generated as standalone transparent RGBA images (not a sprite sheet). The filenames below are **canonical**; use them without renaming. This is an **asset handoff only**, not confirmation of working backend-free reward flows or a deployed Store. The demo wording remains mandatory; images alone must never imply real/verified balance or ownership.

| ID | Asset role | Required runtime filename and repo path | PNG counterpart | Native → CSS | Intended integration point |
| --- | --- | --- | --- | --- | --- |
| A-03 | Demo Points energy chip (試玩點數) | `public/feature-assets/wave3-demo/raster/demo-points@3x.webp` | `demo-points@3x.png` | 216×216 RGBA → 72×72 CSS px | Local-only demo points display in Garage, mission rewards, Results and demo Store; **not** real currency |
| A-04 | Local demo mission claim capsule (試玩領取) | `public/feature-assets/wave3-demo/raster/demo-claim@3x.webp` | `demo-claim@3x.png` | 216×216 RGBA → 72×72 CSS px | Claim-ready / completed **local demo** mission-reward presentation; actual claim state comes from local demo adapter |

**Consumer contract:** reference the stable runtime path with `import.meta.env.BASE_URL`; use an `<img>` with `object-fit: contain`, ≥8 CSS px frame padding, and localized text/status from Vue **outside** the image. Do not render new currency amounts, entitlement decisions, claim flags or payments inside artwork. Both raster sources are static, so Reduced Motion uses the same WebP; no GIF needed. If WebP cannot decode, use the sibling transparent PNG after it is published. A-05 (`demo-collection-empty@3x.webp`) and A-06 (`demo-results-banner@3x.webp`) remain **optional, not produced**.

**Rollout / provenance:** these image filenames are reserved for the user-approved A-03 / A-04 art. Before marking A01/A02 complete, check the physical files exist at the exact paths on this branch, validate 216×216 RGBA and a ≥20-pixel alpha safety inset, verify previews at 72×72 CSS against dark/light/saturated cards, and record runtime screenshots and human visual approval. Existing mission/trophy, Store and VFX assets must remain unchanged until individually reviewed. This documentation update alone is not evidence that the binary files or runtime UI have been integrated.
