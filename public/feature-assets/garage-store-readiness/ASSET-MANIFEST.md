# Store Readiness — Independent artwork and non-transactional UI

## Production image contract

Six separately authored, 216 × 216 pixel Store illustrations; the **1× Store catalog card size is 72 × 72 CSS pixels**. Each has its own full silhouette with genuine transparent alpha, ≥20 physical pixels of transparent padding on all four edges, and no surrounding cards, payment buttons or source-board fragments.

| Item ID | Source (existing, fully restored) | Target PNG (generated, audited) | Display role |
| --- | --- | --- | --- |
| `store-cart` | `raster/store-cart@3x.webp` | `raster/store-cart@3x.png` | Store entry/category |
| `store-box` | `raster/store-box@3x.webp` | `raster/store-box@3x.png` | Unavailable package concept |
| `store-bundle` | `raster/store-bundle@3x.webp` | `raster/store-bundle@3x.png` | Featured bundle concept |
| `store-tag` | `raster/store-tag@3x.webp` | `raster/store-tag@3x.png` | Unavailable label concept |
| `store-star` | `raster/store-star@3x.webp` | `raster/store-star@3x.png` | Featured collections |
| `store-collection` | `raster/store-collection@3x.webp` | `raster/store-collection@3x.png` | Collection category |

The repaired original SVG masters remain at `docs/designs/garage-store-readiness/restored-source/`. The existing colorful repaired WebPs remain as exact source-of-pixels for **lossless PNG re-encoding**, not as screenshots of other controls. `node scripts/render-store-png.mjs` produces the PNGs, and `node --test tests/garage-store-png.test.js` checks native dimensions, true transparency, safe bounds, vividness and uniqueness. Browser tests also compare every decoded PNG pixel to the repaired WebP source, plus confirm 1× display, safe captions, fallback and responsive layout.

The generator workflow `.github/workflows/store-png-generator.yml` is only enabled for this branch and only on a commit marked `[render-store-png]`; it must pass PNG integrity tests before committing the six files. **This manifest specifies required outputs; it is not evidence that any queued CI run has finished.**

## Presentation and boundaries

`src/GaragePanel.vue` offers the visible Store entry and `src/GarageSourceArtGallery.vue` renders category filters, featured concept statuses, selected previews and an explicitly disabled unavailable control. States, copy and labels remain live Vue DOM; no entire UI screenshot is used as a button.

Image paths use `import.meta.env.BASE_URL`; Store PNGs have a repaired WebP fallback and then accessible text fallback. English/Traditional Chinese labels, 44px minimum touch targets, keyboard focus and reduced-motion are maintained.

The two existing standalone transparent SVG fallback concepts remain:
- `coming-soon.svg`: locked/unavailable storefront concept.
- `collection.svg`: non-purchasable collection concept.

**No approved price, checkout, balance deduction, claim, inventory mutation, simulated purchase or entitlement grant exists.** Financial policy, pricing and ownership must receive separate approval. PNG output and browser/manual evidence remain separate acceptance gates.
