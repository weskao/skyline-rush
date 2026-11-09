# HUD source-artwork completeness — original-style repair (2026-11-09)

Branch: `fix/wave3-hud-artwork-completeness`. Scope: the **18 existing** images in
`public/feature-assets/mobile-controls-hud/raster/*@3x.webp` used by the
`操作圖示素材` gallery. **No separate ZIP or new art style.**

## Source and root cause

The original pre-redesign Git commit `f67d3bf31012edfa52cc06f46abe586ad5bdd78e`
contains the illustrated source WebPs. Some were extracted from composite sheets:
a detached left-hand button scrap, top-edge strips from adjacent sprites,
severed circular arcs, and truncated button bevels were already present in
the source pixels. The earlier rejected procedural redesign was removed.
Neither CSS `object-fit: contain` nor enlarging a crop could restore those pixels.

## What the repair does

`scripts/repair-hud-original-art.py` always reads the pinned illustrated
originals, erases only recognized foreign areas, reconstructs missing rim/corner
pixels from *the same source art* using conservative reflection and inpainting
beneath original unmodified pixels, recentres the content, and applies a modest
sharpen without any upscaling. Exports are lossless WebP with transparent alpha.

- Six wide buttons remain **432×156 physical px / 144×52 CSS px**.
- Twelve HUD/UI icons remain **216×216 physical px / 72×72 CSS px**.
- The original text, metallic materials, colors, icon identity and filenames
  remain unchanged. No operational HUD input logic was modified.
- The reference archive in `docs/designs/3x-asset-library/webp/` remains an
  intentionally unmodified historical reference, not a clean replacement
  source. Use repaired runtime assets in preference to reimporting that archive.

## Evidence and remaining gates

The one-time GitHub Actions source-locked repair executes a **RED** comparison
against the previous files, then **GREEN** regeneration and `--check` of all
18 decoded WebPs, `tests/hud-original-artwork-regression.test.js` and
`tests/module-size.test.js`. Final source-backdrop inpainting run:
https://github.com/weskao/skyline-rush/actions/runs/42578641288

- [x] Verified the final WebP files exist in their original runtime paths and
  reviewed representative decoded images for the former detached/button strips.
- [x] Verified the one-time repair workflow passed source and pixel checks.
- [ ] Run and review the full gallery/browser screenshots on **390×844,
  844×390, 1440×900**, both supported locales and actual phone touch targets.
- [ ] Verify exact-HEAD remote CI on the final audit commit (previous green
  SHAs are not acceptable as the new HEAD's evidence).
- [ ] Human visual approval of *every* silhouette, softness/aliasing,
  bottom edge and glow. Alpha bounds alone cannot prove visual completeness.

The original cutouts were derived from a composite and resampled; this
reconstruction does **not** claim to restore unavailable genuine native 3×
detail. If high-frequency original detail is required beyond this restoration,
the original per-icon image masters must be recovered and individually redrawn
**in the same established art direction**, not replaced with flat icons.

## Follow-up: original-style clarity and missing-face correction

The image inventory is **18 existing runtime WebPs**, with unchanged paths,
transparent file format and 3× dimensions. Source identity remains the pinned
pre-redesign Git commit, not the rejected flat-icon redesign.

- Right-hand button bezels are reconstructed from the original opposite bezel
  rather than leaving opaque adjacent-sprite strips in front.
- Real missing enamel-face pixels are filled using the original icon's matching
  spatial gradient and alpha, without replacing a face with a flat rectangle.
- Detached lower-right cyan sheet scrap on NITRO is trimmed conservatively;
  the speedometer's mirrored extra arrow/highlight was removed.
- Output uses lossless WebP, no upscaling, and the source colors, highlights,
  baked original sample lettering and intended open-brake/drift-ring shapes.
- The source itself was derived from a previously cut composite. Recovering
  **true native 3× fine detail** that never existed in these files still requires
  the actual pre-cut per-icon masters, not extra sharpening or an invented art set.

Reproduced test failures (RED): [right-bezel / enamel gap](https://github.com/weskao/skyline-rush/actions/runs/42581568732)
and [spatial-gradient regression](https://github.com/weskao/skyline-rush/actions/runs/42582679819).
Regeneration + unit checks (GREEN):
[original-illustration repair run](https://github.com/weskao/skyline-rush/actions/runs/42582994962).
This action also committed the binary WebPs directly to the source branch.

The original 18-item source archive under `docs/designs/3x-asset-library/webp/`
is kept unmodified for side-by-side comparison. Automated pixel checks do NOT
replace final human review of every subtle halo/bezel and real phone screenshots.
Only this feature branch was modified; no ZIP, PR, merge or deploy.
