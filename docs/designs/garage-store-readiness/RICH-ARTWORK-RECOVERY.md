# Rich Store artwork recovery — 2026-11-03

The six store-preview artworks in `#garage-art-source-garage-store-readiness` are **rich illustrated neon icons**, not the simplified vector badges of `#garage-vfx-art-badges`.

## Source / visual contract

- Reference: the original `Store / Shop Icons` section (09) of the shared futuristic racing asset board, prior to the flat/vector redraw; preserve its magenta cart, orange sci-fi crate, gold star, hot-pink tag, purple/gold gift, and purple collection cards.
- Repainted the six complete silhouettes as detailed translucent 3D neon illustrations with specular highlights and saturated glow. Source generation was 3 columns × 2 rows of native 512px square cells; each was isolated and **downsampled** to a 176px art area inside a 216px transparent WebP canvas, providing >=20px alpha-safe inset at threshold >16/255. Never upscale a crop to label it 3×.
- Runtime assets: `public/feature-assets/garage-store-readiness/raster/store-{cart,box,bundle,tag,star,collection}@3x.webp`. 216×216 source displayed at 72×72 CSS pixels via `GarageSourceArtGallery.vue` → `GarageArtworkTile.vue`; preserve `object-fit: contain` and captions below art.
- Historical SVGs in `restored-source/` remain earlier **flat draft references**, not source masters for these illustrated WebPs. Do not regenerate the production art from those drafts. The original source board and higher-resolution regenerated transparent artwork are retained in the visual handoff; future updates must use the rich style reference.
- These icons are **preview-only**, not shopping transactions, payment, unlock, ownership or rewards.

## Gate

The Store gallery's Playwright test must verify native 216px WebP dimensions, >=20px alpha margins, CSS/framing and caption clearance at 390×844, 844×390, 1440×900, plus color richness (bright saturated fraction and multiple quantized color bins). Those are regression tripwires, **not substitutes for a human side-by-side review**. Run `make verify` and inspect the exact-HEAD GitHub CI before announcing visual acceptance.
