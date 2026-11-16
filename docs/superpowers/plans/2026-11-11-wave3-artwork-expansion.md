# Skyline Rush Wave 3 — approved A-03/A-04 + existing NITRO/BOOST artwork expansion

**2026-11-11 · Implementation branch:** `feature/wave3-demo-acceptance` (Prompt F QA).
**Source:** `feature/wave3-implementation-plan-audit-20261110`, `docs/designs/wave3-frontend-first-visual-assets.md`.
**Scope:** Frontend-only visual wiring, no Go/Firebase payments, entitlements, physics modifications, cosmetic unlocks or rewrites to established artwork.

## 1. Source provenance and render contract

| Key | Approved Git source blob | Runtime file | UI |
| --- | --- | --- | --- |
| A-03 Demo Points WebP | `c5027a27b01f4e9b9440f980abb23546a3c8987b` | `public/feature-assets/wave3-demo/raster/demo-points@3x.webp` | Garage mission demo-wallet, Store trial wallet, actual local result payout |
| A-03 PNG backup | `1e42ee8cafd6c3bee1c5993497df7d6cdbecc9d7` | `demo-points@3x.png` | Browser fallback after WebP failure |
| A-04 Demo Claim WebP | `856dfa604dd8b00a5b59ebe14f1db97f7875022d` | `public/feature-assets/wave3-demo/raster/demo-claim@3x.webp` | Claimable or already claimed local-only mission rows |
| A-04 PNG backup | `7901ff2864dd5d3c4d0f3aae986284f36ed6a173` | `demo-claim@3x.png` | Browser fallback after WebP failure |

All four assets are **216×216 native RGBA**, WebP/PNG with ≥20 source-alpha pixels at each edge. A-03/A-04 render at 72×72 CSS pixels inside an 88×88 frame with 8px spacing. Subpath URLs must use `import.meta.env.BASE_URL`. No numeric balances, localized text, eligibility or paid entitlements are embedded in pixels.

The reusable `Wave3DemoArt.vue` delegates loading/PNG fallback to existing `GarageArtworkImage.vue`; no new image dependency or independent economy state. In Results, the existing accessible text and ✦ marker remain on broken-image fallback. The image is decorative; local-only wallet and claim action remain the sole source of truth.

## 2. Other already-produced images — inventory versus runtime need

| Source | Repository status | Wave 3 action |
| --- | --- | --- |
| `public/feature-assets/mobile-controls-hud/raster/hud-nitro@3x.webp` | Existing verified 216×216 WebP; already shown in the 18-art HUD gallery | **Integrate lightweight decorative icon into actual `#nitro-status` HUD**, without touching charge, meter, NITRO button or physics; if image missing retain translated live text/meter |
| `.../button-nitro@3x.webp` | Existing 432×156 concept with baked-in English text | **Do not replace** clickable/translated NITRO button; keep actual `<button data-control="nitro">` and SVG |
| `artifacts/boost-polish.png` | Existing large composite visual reference, not an approved standalone 216px alpha UI icon | **Do not crop, upscale or treat as a BOOST control image**; retain the existing accessible `icons.boost` SVG and `.boost-status` state. A standalone transparent approved asset, source SHA and before/after screenshot would be needed first |
| `hud-brake`, `hud-combo`, `hud-drift`, `hud-speed`, `hud-pause` and UI arrows/settings | Existing 216px WebPs, exposed in the HUD source gallery | Keep as authored source previews, not extra overlays on the roadway; only move to actual existing control slot after direct visual/interaction checks; existing mission-drift/mission-combo and trophy art already represent Wave 3 rewards |
| `nitro-trail-*@3x.gif` | Existing authored 25-GIF Garage VFX inventory family | Continue using Garage preview/skin pipeline; do not confuse premium VFX with a consumable NITRO or a permanent demo entitlement |
| `A-05` collection-empty and `A-06` result banner | Optional assets not delivered | No placeholders/fake source files. Text/CSS fallback remains correct unless an actual visual review proves a need |

The racing HUD is a **shared base-game subsystem** that predates Wave 3. Existing NITRO and BOOST graphics are NOT new demo currencies, mission claim icons or sellable skins. The small `hud-nitro` enhancement may show in all play modes; it must not replace actionable controls, introduce speed/charge calculations or worsen 568×320 / 844×390 touch-safe overlays.

## 3. Verification and rollout

- [x] Git blob provenance for four A-03/A-04 assets documented; copy the exact binaries from plan branch, **do not regenerate or rescale**.
- [x] Existing NITRO/HUD source files and actual `race-hud.ts`, `App.vue`, `HudSourceArtwork.vue`, `garage-skin-catalog.ts` consumers identified.
- [ ] Playwright on **new exact QA SHA**: 216×216, rendered 72×72, proper transparent alpha, WebP→PNG fallback, failed image retains live bilingual labels and claim, no counterfeit canBuy/ownership.
- [ ] Genuine Time Attack Results→Garage→daily mission claim→Demo Store→Collection→reload/reset E2E. Verify A-03 card in result is decorative and never settles rewards again.
- [ ] NITRO real meter still displays `aria-valuemax=3`, BOOST uses its original touch button/SVG, no lost interactions with failed WebP or reduced motion. Verify 390×844, 844×390, 1440×900. Low/Medium/High and VFX Off must not start new animated icon work.
- [ ] Browser image screenshots for dark / light / saturated surfaces, phone and desktop; manual human approval, physical iPhone/Android/Mac Chrome remain separately pending.
- [ ] Full `[full-regression]` QA CI: Unit/typecheck/build, Cloud Save, all 13 browser shards, all 5 World Tour shards, Quality Gate. After all green, merge to `develop` only as previously authorized and independently verify `develop`.

**Safety:** Original button text, boost state and hitbox remain DOM/CSS/engine owned. Existing `main`, `develop` and `coming-soon` feature gates are unchanged by this artwork-only wiring. All asset QA acceptance checkboxes require actual CI and screenshot evidence; source file existence alone does not close them.
