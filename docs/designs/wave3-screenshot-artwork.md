# Wave 3 screenshot-derived 3D artwork (approved original)

The **user-supplied 1536×1024 image sheet**, not the earlier generated placeholder
graphics, is the source of truth for the ten 3D illustrations committed below.

## The ten cutouts

| Row in user image | Filename prefix | Runtime surface |
| --- | --- | --- |
| top left | `wallet-coin` | Garage Wallet coins |
| top second | `wallet-diamond` | Garage Wallet diamonds |
| middle left to right | `mission-race`, `mission-time`, `mission-drift`, `mission-combo` | Garage Missions / art gallery |
| bottom left to right | `trophy-bronze`, `trophy-silver`, `trophy-gold`, `trophy-platinum` | Garage achievements, rewards / art gallery |

All assets are **independent 3× WebP files with real alpha**. Wallet chips are
144×144 and all mission/trophy chips are 288×288. The original transparent glow
and 3D subject shapes are cut directly from the approved 10-icon sheet.

A black matte was removed programmatically using luminance-based unmatting
and alpha thresholding, with an inner halo preserved. The artwork was *not*
redrawn or replaced by generic symbolic icons.

## Runtime routing

The source URLs in `Wave3CurrencyStrip.vue`, `GarageMissionBoard.vue`,
`GarageSourceArtGallery.vue`, and `finish-placement-badge.ts` already route
to the ten exact WebP paths; replacing those binary blobs is what actually
updates the screens. `demo-points@3x.webp` remains unchanged.

## Avoid accidental image regressions

`tests/wave3-user-artwork.test.js` pins SHA-256 of **all 10** original
screenshot-derived sprites, validates transparent WebP canvas dimensions,
and verifies mounted UI source paths. It fails if a prior fake image, sprite,
PNG, or arbitrary re-render replaces any approved file.

The old `scripts/generate-wave3-premium-webp.py` is **legacy-only** and must
not run automatically: it constructs different art from archived symbols.
The dedicated GitHub workflow was converted to read-only verification instead
of silently regenerating or overwriting these approved image files.

The source sheet has been saved as a Canva image named
**Skyline Rush — original AAA 3D 10-icon sheet**.
