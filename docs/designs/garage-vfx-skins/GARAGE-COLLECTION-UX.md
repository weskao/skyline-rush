# Garage Collection interaction and Airflow artwork — 2026-11-02

**Feature branch:** `feature/garage-vfx-skins` only. Integration target `develop`; do not merge, open PR or deploy without authorization. This is a visual and interaction-only change, never a currency/entitlement/physics change.

## UX contract

- `#garage-screen .garage-collection` retains the current paint selection behavior: clicking **any paint card** (native `<button type="button">`) immediately previews paint, and the existing dedicated `#garage-equip` button persists the paint only if legitimately owned.
- All 22 VFX collection cards share one native **full-card Preview button** (`.garage-skin-preview-hitarea`), containing the 3× artwork, localized title and real entitlement state. It is a sibling of (not a wrapper around) the **single visible Try/Equip/Locked button**. Cards are focusable with Tab and activate with Enter/Space. The Preview action updates the car immediately in both Garage Home and Studio, and never grants ownership.
- CSS theme uses `--card-hue` and a **single shared gradient recipe**, with selectable cyan, blue, violet, magenta and gold, keyboard focus rings, visible selection halo, pointer-capable hover lift, touchscreen press feedback and Reduced Motion fallbacks.
- Equip/Try is a distinct button with `@click.stop`, isolated from Preview; disabled state is guarded by `garageSkinEntry().canEquip` in the existing session contract. The existing trial flag is **not** a purchase.
- Keep all 44 semantic native buttons in the 22 VFX cards: 22 visually invisible but fully clickable/focusable Preview surfaces + 22 visible ownership actions. Do not introduce nested buttons.
- Paint swatch cards use matching gradient, state chips, high contrast titles, 44+ CSS-pixel primary actions, focus outlines and touch-friendly spacing. Do not change the paint stars/Cloud Save source of truth.
- Native 3× imagery remains displayed at **1× CSS size**, with 8px safe visual framing and a common image fallback `GarageArtworkImage.vue`.

## Card states and sprint preview — 2026-11-21

- **One row per skin.** A skin is one row of `GARAGE_SKINS` in `src/garage-skin-catalog.ts` (id, category, names, `hue`, art id) plus its art. `skinAccentHue()` reads the row; a drift row keeps its hue in `DRIFT_TRAIL_STYLES`. No SFC names a skin id. Guard: `tests/garage-preview-tier.test.js`.
- **A state is said once.** The action button says Try free, Equip, Equipped or Locked. The pill only adds what the button cannot: `Owned` and `Trial active`, or `Previewing` while a card is previewed without being equipped. An empty pill keeps its row, so a preview never moves the cards below.
- **Equipped and locked look different.** Equipped is a teal button with a tick. Locked is a grey button with the shared padlock icon (`icons.lock`), and its art sits back (desaturated) until the card is previewed.
- **Four cards are a 2×2 block**, like the loadout strip, never three and an orphan.
- **Sprint preview control.** `src/GaragePreviewTier.vue` sits under the Thruster heading in Garage Home and Inspect: one button per row of `SPRINT_TIERS` (`src/sprint-tier.ts`) above idle, in ladder order, labelled BOOST, NITRO and NITRO + BOOST in both locales. It defaults to the top tier, keeps the choice between Home and Inspect, hides with the effects toggle and never equips or unlocks anything. `src/garage-preview-tier.ts` holds the choice; `src/garage-stage.ts` reads it every frame for the Inspect car. A new ladder row appears in the control once it has a label.
- **Known limit.** Garage Home's car idles on the home scene, whose showroom burn is fixed in `src/aero-vfx.js`; the control says so on Home ("Open Inspect to see the chosen tier on the car."). Guard: `tests/garage-preview-tier-browser.spec.js`.

## Four source Airflow icon designs

The original 59-item ZIP had no individual Airflow thumbnails; previously all four skins used a single category SVG. Four distinct, **intrinsically 288×288 vector SVG artwork sources** now live at:

- `public/feature-assets/garage-vfx-skins/raster/airflow-basic@3x.svg`: parallel cyan air streams
- `public/feature-assets/garage-vfx-skins/raster/airflow-slipstream@3x.svg`: fast blue long-arc slipstream curves
- `public/feature-assets/garage-vfx-skins/raster/airflow-vortex@3x.svg`: violet circular vortex
- `public/feature-assets/garage-vfx-skins/raster/airflow-prism@3x.svg`: refracted teal/magenta polygonal streaks

These vector originals have intrinsic 288×288 coordinates and display in a 96×96 CSS box, i.e. **3× source → 1× UI**, with transparent backgrounds and fallback to `airflow.svg`. Vector originals scale without lossy downsampling. The artist additionally exported 288×288 transparent PNG/WebP raster backups in a separately delivered source ZIP; **those optional raster exports are not committed as PNG/WebP in this branch yet**, so do not claim them shipped. The four committed SVGs are the actual runtime images.

The existing `createAeroVFX()` exposes **four distinct GPU flow patterns (0–3)** via a shared, reused Flow shader. The preview selection applies `skinVfxPattern` to the car in Home and Studio. No shader geometry, race dynamics, reward, or paid access changes were needed for this UI redesign; visually verify actual differentiated flow at Low/Medium/High before signoff.

## TDD and acceptance

- Browser specs: `tests/garage-vfx-catalog-browser.spec.js` (full card hit area, keyboard Enter, independent Try/Equip, hover, paint preview, three viewport widths), `tests/garage-cosmetics-preview-browser.spec.js` (four native 3× Airflow asset dimensions and GPU pattern selection), `tests/garage-skin-trial-browser.spec.js` (entitlement isolation).
- Unit specs: `tests/garage-skin-catalog.test.js` (all four unique source paths, 96px display) and `tests/garage-skin-renderer.test.js` (different shader modes, no reallocation).
- Exact-HEAD **full-regression** CI and screenshots in 1440×900 desktop, 390×844 phone portrait, 844×390 landscape are required. Review actual image load, keyboard/hover/focus, first-card click, equipped/locked states, reduced motion, WebGL effects, FPS tiers and native mobile touch before marking accepted. Do not infer success from a queued workflow.
