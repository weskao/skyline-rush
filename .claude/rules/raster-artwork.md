---
paths:
  - "public/feature-assets/**"
  - "public/icons/**"
  - "public/whats-new/**"
  - "docs/designs/**"
  - "src/Garage*.vue"
  - "src/garage-*.ts"
  - "src/*Store*.vue"
  - "src/*Reward*.vue"
  - "tests/garage-*browser.spec.js"
---

# Raster artwork: native 3x, uncropped, audited

## AI-generated images: always 3x

Any image produced by an AI generator must be rendered at **3x the size it is displayed at in
the project**: an asset shown at 10 × 20 px is generated at 30 × 60 px. Work out the display
size first, ask the generator for exactly 3x that size, and keep the 3x original as the
source file. Never upscale a smaller output to reach 3x.

## Mandatory raster icon completeness / anti-clipping gate

When adding or updating Garage, HUD, Store, Rewards or any other transparent icon artwork:
- Design the complete **uncropped** silhouette first; regenerate the source if any bottom edge,
  glow, shadow or decorative flourish is missing. CSS `object-fit: contain` cannot restore
  missing source pixels. Never present an upscaled crop as a repaired 3× original.
- When repairing an existing icon, **preserve its established art direction and identity**:
  original shape, 3D materials, hue, vividness, gradients, specular highlights and glow.
  Fix completeness and visual sharpness without replacing colorful illustrated source art
  with a simplified flat/vector icon set unless the user expressly requests that style.
  Review a side-by-side comparison against the original reference board at native 1×.
  For rich Store artwork, also regression-check color variety and vivid highlights;
  geometry/alpha margins alone cannot detect an unwanted style regression.
- Export true native 3× transparent WebP (or lossless master → WebP), with image dimensions
  exactly 3× the intended 1× CSS display. Keep editable masters in a documented source
  directory (`docs/designs/3x-asset-library/`). All runtime paths must respect Vite
  `import.meta.env.BASE_URL`.
- Audit real alpha bounds, not just image dimensions. For newly drawn 216×216 store icons,
  preserve at least 20 pixels of transparent safety margin on **each** edge at alpha >16/255;
  adjust the threshold for other image types if the design requires more space. Preserve
  the full glow, shadows, and lower tips in the source. Review on dark and light backgrounds.
- Use shared `GarageArtworkImage` / `GarageArtworkTile` where applicable, native 1× CSS
  sizes, `object-fit: contain`, a frame with at least 8 CSS px internal padding and the
  caption *below* the image. No `object-fit: cover`, fixed-height clipping, cropped filter
  shadows or overlapping captions.
- For **every** new/revised gallery icon, add a Playwright test verifying decoded natural
  dimensions, alpha pixel bounds using Canvas, image/frame/caption rectangles and no clipping
  at portrait 390×844, landscape 844×390 and desktop 1440×900. Preserve keyboard/touch,
  locale, fallback and store-preview-only controls. Capture actual browser screenshots.
- Follow RED → GREEN → `make verify` → full exact-HEAD CI and actual visual review;
  programmatic alpha insets do not prove that the original silhouette is artistically complete.
  Do not call it accepted while any required test or manual review remains pending.
