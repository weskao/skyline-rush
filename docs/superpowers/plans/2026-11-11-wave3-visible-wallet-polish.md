# Wave 3 — Visible Wallet, HUD Artwork and Cross-device QA (2026-11-11)

Branch: `feature/wave3-wallet-ui-polish` from `feature/wave3-demo-acceptance@e8dd0c264a8990f69137bd52c099d1abb44cf569`.

## Product contract

- A player should immediately see the exact **local demo points** from the existing F01 `Wave3ExperiencePort` in the Garage, in the Store, and in race results; never invent a second wallet, credit payout or paid entitlement.
- Display gold coins and diamonds as **Coming soon / —**, not as zero or spendable amounts. `src/garage-economy-state.ts` intentionally exposes `balance:null`, `canBuy:false`, `canClaim:false`; do not change that contract or `SkinProfile.owned`.
- Use approved A-03 216px transparent WebP (+PNG fallback) for demo points. Gold/diamond may use small CSS-drawn decorative symbols pending independent approved 3x transparent source artwork; never show them as owned.
- Reuse the actual NITRO HUD icon and working BOOST SVG/button; preserve their logic and click targets. Move any NITRO image CSS out of the frozen main CSS baseline into the Wave 1 override segment.
- Visual treatment: dark racing telemetry, cyan/purple/gold accents, tabular numerals, gentle native CSS glint on balance changes, reduced-motion support, accessible bilingual labels, no JS animation loop or new dependency.
- Preserve viewport-safe Garage controls and scrolling on desktop (1440×900), phone portrait (390×844, 320×568), phone landscape (844×390, 658×320), and narrow/foldable widths. No overlays over touch zones.

## Plan / acceptance (RED → GREEN → REVIEW)

1. Add a pure read-only wallet projection test (local-only, invalid/unverified, account isolation, all locales). Confirm RED before implementation; implement `wave3-currency-view.ts` and run it locally.
2. Add a single reusable `Wave3CurrencyStrip.vue`, subscribed to the existing port. Show it once at the top of the actual Garage collection. Keep the Store's existing live A-03 wallet and result receipt unchanged; avoid duplicate per-screen rehydration.
3. Update mission claim status to show the real credited delta and current points, with CSS-only feedback/accessible status. Do not settle twice.
4. Repair the existing A-03/A-04 and NITRO browser-test selectors that accidentally include new 72px decorative art or nested SVG; assert their original native icon assets remain unchanged. Move the NITRO CSS override after the frozen CSS baseline and reduce icon layout shift in 658×320.
5. Run focused checks, typecheck, build and full exact-head CI. Any unresolved CI failure stays open; do not merge to `develop` before **all** jobs pass at the same SHA. Validate the release-media autoplay failure independently rather than changing unrelated behavior without a reproducer.
6. Review source without new dependencies, backend access or asset duplication. Update TODO.md based strictly on evidence; real-device/manual capture and server-authoritative economy remain explicit follow-up items.

## Non-goals

No monetization, no real coins or diamonds, no currency exchange, no server sync, no new Race HUD economy overlay that obscures play, no changes to original raster artwork, no new 3D postprocess cost in low settings.
