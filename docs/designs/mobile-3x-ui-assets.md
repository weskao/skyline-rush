# Mobile HUD 3× source art — implementation status (2026-11-02)

**Branch:** `feature/3x-hud-materials-integration` from latest `develop`. Do not merge to `main`. Do not overwrite the working Hybrid A+B control layout, player inputs, localization, or touch accessibility.

**Original source:** [the 59-WebP shared material archive](https://github.com/weskao/skyline-rush/blob/feature/3x-ui-materials/docs/designs/3x-asset-library/README.md), category `mobile-controls-hud`. All **18 original WebPs** have been copied byte-for-byte to `public/feature-assets/mobile-controls-hud/raster/`. Git blob SHA comparisons against source archive: 18/18 exact. All retain original 3× pixels:

- **6 wide button images**: `button-back`, `button-coming-soon`, `button-garage`, `button-nitro`, `button-play`, `button-retry`, at 432×156 source, **144×52 CSS**.
- **12 small UI/HUD images**: `hud-brake`, `hud-combo`, `hud-drift`, `hud-nitro`, `hud-pause`, `hud-speed`, `ui-arrow-left`, `ui-arrow-right`, `ui-close`, `ui-info`, `ui-settings`, `ui-tooltip`, at 216×216 source, **72×72 CSS**.

**Actually connected to controls (decorative, no behavior change):** `button-play` (#start-button), `button-garage` (#garage-button), `button-retry` (#again-button), `button-nitro` (touch NITRO), `hud-brake` (touch brake), `hud-pause` (pause), `ui-arrow-left` / `ui-arrow-right` (touch steer), `ui-settings` (settings button). These remain accessible and functional using their existing SVG/text and click/touch handlers; WebP is a pointer-events:none translucent graphic under that content.

**Remaining 9 images** are actually displayed (not forgotten) in the expandable `src/HudSourceArtwork.vue` gallery within Settings; no fake buttons or unsupported actions have been created. The gallery also displays the nine active images at exact 1× dimensions for visual QA. Source thumbnails never authorize behavioral changes to boost, drifting, purchases, tooltips or payout.

**Tests:** `tests/hud-3x-artwork-browser.spec.js` covers 18 native-resolution source images and real action-control embellishments; require exact-HEAD TypeScript/Vue/JS build + full Playwright + real Android/iOS/desktop accessibility and screenshot review to claim acceptance. No tests are reported passed without CI evidence. GitHub Pages subpath URLs use `import.meta.env.BASE_URL`. Missing image fallback in gallery is text. Images have aria-hidden in functional controls; essential SVG and labels remain.

**Release gate:** Keep pending until CI, localized screens and gameplay controls are tested. Integration target: `develop`, not `main`. Rewards/Missions and Store artwork live on their **separate** Wave3 branches, documented in each `AGENTS.md` and `RASTER-ASSET-HANDOFF.md`.
