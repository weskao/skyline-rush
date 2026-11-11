# Skyline Rush Wave 3 — A-05 empty collection and A-06 result banner

**Date:** 2026-11-11
**Integration branch:** `feature/wave3-wallet-ui-polish`
**Scope:** Two new, originally generated transparent illustrations and visual-only UI animation. Preserve A-03/A-04, trial-only authority, payout semantics, purchase locks and original game controls.

## Original artwork and provenance

| Asset | Format and native size | Git blob SHA | Live use |
| --- | --- | --- | --- |
| `demo-collection-empty@3x.webp` | transparent 288×288 | `da505a869edbec3d56bb5f7af55d17e66298b0ae` | Empty Demo Collection; 96px image |
| `demo-collection-empty@3x.png` | transparent 288×288 PNG fallback | `59d7a1fe9917e9978cefa29384ca3365550d29b8` | Browser failure fallback |
| `demo-results-banner@3x.webp` | transparent 432×156 | `c09021fa6b9735796b1b9962a4e36cbd6b11f20e` | Earned-only local demo race result |
| `demo-results-banner@3x.png` | transparent 432×156 PNG fallback | `77953811c80021609231dbb1ab997b103cea9c8b` | Browser failure fallback |

Files reside in `public/feature-assets/wave3-demo/raster/` and use Vite's `BASE_URL`. Illustration sources are independently rendered new images; no original A-03/A-04 blobs are overwritten. A-05 is a holographic empty showroom stage; A-06 a racing trophy banner with gold, cyan, and violet accents. No names, balances, prices, or entitlements are embedded in the pictures.

## Actual interface integration and motion

- `Wave3DemoCollection.vue`: show the A-05 art only if `unlockedCount === 0`; retain existing empty-state text, "Open Demo Store" navigation and localized copy. The translucent `wave3-collection-scan` beam scans **over** the fixed image; the image itself is not scaled or moved.
- `wave3-demo-results-integration.ts` / `wave3-demo-results-ui.ts`: mount the A-06 banner in the existing read-only post-race result card only when the already-settled F01 state is `earned`. Hide for duplicate, ineligible, unverified, and absent receipts. Keep point values, mission progress, original racing results and cloud-save controls unchanged. A separate `wave3-results-sheen` highlight sweeps over the stationary image.
- Both animations are CSS-only; VFX Off, Low and comfort hide effects; `prefers-reduced-motion` disables all motion. Images are decorative (empty alt), retain accessible actual text, and fallback from WebP to PNG. A-06 hides the decoration without hiding results if both images fail.

## Verification

- [x] Original four A-05/A-06 binary assets committed to the feature Git tree; corresponding SHA and native dimensions recorded.
- [x] Actual Collection, Results and CSS motion integration committed. Added DOM, browser, native-size/alpha and three-viewport regression assertions.
- [ ] **Exact final HEAD** `[full-regression]`: unit/typecheck/build, Cloud Save, 13 Browser shards, five World Tour shards, quality gate. Evidence pending; partial/cancelled runs do not count.
- [ ] Review real WebGL screenshots at 390×844, 844×390 and 1440×900, both locales, missing-image fallback, Reduced Motion and VFX Off, including true no-clipping of results buttons.
- [ ] Physical iOS, Android and Mac GPU, frame-time and game visual sign-off (not inferable from CI).
- [ ] Merge to `develop` only after feature's latest exact-head full CI is green and verify merged develop independently; no `main`/release mutation.

**Safety:** A-05/A-06 are illustration-only. No exchange rate, coins, diamonds, ownership, `SkinProfile.owned`, Go/Firebase, payouts, or demo settlement rules are added or changed.
