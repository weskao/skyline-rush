# Rewards and Missions — Prebuilt independent vector artwork

Four original transparent SVG icons are complete and committed; they are **not yet wired into results, mission progress, reward calculations or the economy**.

- `finish-medal.svg`: finish/race medal category
- `daily-mission.svg`: daily mission category
- `weekly-challenge.svg`: recurring challenge category
- `trophy.svg`: generic trophy/reward category

The icons contain **no currency, numbers, reward amount, balance, date, payment mark or text labels**. Actual rewards and missions must use authoritative state in Vue 3 + TypeScript. Icons use transparent 96×96 SVG roots, inline paths/gradients, accessible SVG titles, no external font/scripts/raster. Validate with reduced-motion, color/contrast and asset fallback when integrated after the economy prerequisite is approved. **Only the art assets are complete; rewards, entitlement and settlement are not implemented.** Original GPT-authored vector artwork.


## 2026-11-04 Formal transparent PNG handoff (Wave 3 visual completion work)

- Authorized target branch: `feature/garage-rewards-and-missions`. No other branch changed.
- Source archive: `skyline-rush-3x-garage-rewards-and-missions.zip`, SHA-256 `d526e1570865887924c09909f85d057186477cf189862ae351457847f4754b60` (checked before processing).
- Eight independent icons: `mission-race`, `mission-time`, `mission-drift`, `mission-combo`, `trophy-bronze`, `trophy-silver`, `trophy-gold`, `trophy-platinum`. Each exports as `raster/<id>@3x.png` (288×288 RGBA) and displays at 96×96 CSS px. Visible alpha bounds have ≥26 source-pixel margin in local review.
- `scripts/export-rewards-png.py` and branch-restricted GitHub Actions `rewards-png-export.yml` export verified independent WebPs (not crop regions) into PNG. The existing 8 WebP references remain available as a historical source.
- Actual screens: `src/GarageMissionBoard.vue` (four unavailable state cards, bilingual, 96px icons), `src/GaragePanel.vue` (mount), `src/result-screen.ts` and `src/finish-placement-badge.ts` (display-only classic top-three trophies), `src/GarageSourceArtGallery.vue` (source preview). All asset URL creation uses `import.meta.env.BASE_URL`.
- `src/GarageArtworkImage.vue` provides card image-load fallback; the Results renderer hides failed decorative PNG while preserving textual badge. CSS podium entrance animation is disabled by `prefers-reduced-motion`.
- These are **display-only** assets and an **unavailable** mission board. Do not show 0% or completed state as real progression. No signed-off goal counters, awarding, earned-trophy ownership, payouts, or backend-authoritative settlement exist yet. Never grant rewards from the source Gallery or result decorations.
- Required pending verification: physically present PNG Git blobs, successful GitHub PNG-export job, full exact-HEAD Actions, desktop/mobile browser screenshots, hardware and visually reviewed layouts. Mark acceptance complete only when the evidence exists.

## 2026-11-12 WebP-only premium asset pass (supersedes the PNG runtime handoff)

- Branch: `feature/wave3-premium-webp-art-v2`, starting from `develop`; no `develop` or `main` write.
- `scripts/generate-wave3-premium-webp.py` recreates four mission, four trophy and two
  wallet icons as distinct transparent multi-layer metallic 3x WebP illustrations.
- Native dimensions: 8 mission/trophy icons 288×288 at 96 CSS px; 2 wallet icons
  144×144 at 48 CSS px. The approved Demo Points/Claim WebPs remain 216×216.
- Runtime Gallery, Missions, Results, Wallet and Demo artwork now request WebP only.
  When a WebP cannot load, the UI retains existing text/CSS semantics rather than
  requesting a removed PNG. The fourteen original archived WebPs in
  `docs/designs/3x-asset-library/webp/` are unchanged for reference.
- PNG files in the Wave 3 Demo, Rewards/Missions and Store Readiness runtime raster
  folders were removed, along with the obsolete PNG export workflow and script.
- Live effects: coin orbit and sparkle, diamond prism/floating facets, mission radar
  rings and claimed animation, trophy light/corona and bob. Effects honor reduced
  motion and VFX-disabled modes and never confer real currency or entitlements.
- Verify with `npm test`, Vue/TS typecheck, full regression GitHub Actions and visual
  screenshot review before considering this branch ready for merge.
