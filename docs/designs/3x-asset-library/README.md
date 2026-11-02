# Original 3× Skyline Rush UI materials — shared asset library

**Verified archive branch:** `feature/3x-ui-materials`
**Status:** 59 **real** committed WebP Git blobs, pre-production candidates; **not shipped by default**, **not approval or implementation**.
**Integration branch:** `develop` (do not change `main`).

## Source archives, provenance and intended consumers

| Original ChatGPT Library ZIP (preserved there, not duplicated in Git) | SHA-256 | WebPs committed here | Consumer |
| --- | --- | ---: | --- |
| `skyline-rush-3x-garage-vfx-skins.zip` | `4112ef97f6ec8d0860220a93f95a5b19f77b2a05cc36c1eebf5385d457d73414` | 27 | Wave 2 `feature/garage-vfx-skins` |
| `skyline-rush-3x-garage-rewards-and-missions.zip` | `d526e1570865887924c09909f85d057186477cf189862ae351457847f4754b60` | 8 | Wave 3 `feature/garage-rewards-and-missions` |
| `skyline-rush-3x-garage-store-readiness.zip` | `3f5f37d2c4f417fa1b84c3356ef15ff297825d6b49d602f858f9cd342fa11751` | 6 | Wave 3 `feature/garage-store-readiness` |
| `skyline-rush-3x-mobile-controls-hud.zip` | `4f033be8ebb1cd6162b0e266d922b5dca901ad75e5eb6ac39b5c06953c5ae615` | 18 | Existing mobile HUD / shared UI (review before replacement) |
| `skyline-rush-3x-ui-assets.zip` | `2a917c5448b1c2f2dff1039cbfa4d8089d07e56cc4a1008f41640b4b1eee3a19` | Same 59 above; **do not double count** | Original consolidated ZIP + 59 PNG sources + CSS sizing + preview/QA |
| `skyline-rush-design-reference-crops.zip` | `acce84e43424ddf874615da7f7f35a625e9edc6b5b07b90692241150d15308e5` | 0; reference PNGs stored in ChatGPT Library | Visual QA only |

**Important:** These are PNG source cutouts resampled to 3× pixel dimensions with Lanczos and WebP conversion; not guaranteed native-detail 3× generation. The original PNG counterparts, reference sheets, and consolidated ZIP remain in the user's **ChatGPT File Library**. Never imply the ZIPs themselves were committed to Git.

## Critical render rule: 3× file pixels, 1× CSS layout

| Actual image pixels | CSS display size | Typical use |
| --- | --- | --- |
| 288 × 288 | **96 × 96 CSS px** | Garage skin thumbnails, race rewards and mission tiles |
| 216 × 216 | **72 × 72 CSS px** | Badges, rarities, store icons and small HUD controls |
| 432 × 156 | **144 × 52 CSS px** | Wide mobile buttons / controls |

The file dimensions **must not be modified or resampled to 1×**. In a feature branch, copy only reviewed WebPs from this archive to its runtime public asset folder and use the **1× CSS dimensions**, for example:

```vue
<script setup lang="ts">
const icon = `${import.meta.env.BASE_URL}feature-assets/garage-rewards-and-missions/raster/mission-drift@3x.webp`;
</script>
<template>
  <img :src="icon" width="96" height="96" alt="" decoding="async" class="mission-icon" />
</template>
<style scoped>
.mission-icon { width: 96px; height: 96px; max-width: 100%; object-fit: contain; }
</style>
```

Use semantic localized adjacent text or a correct accessible name (illustrative `alt=""` only if the graphic is decorative). Keep responsive safe areas, touch targets ≥44 CSS px, Low/Medium/High, VFX-Off, Reduced Motion, iOS/Android browser and desktop fallback.

## How to import in each implementation branch

1. Read your Wave 2/3 **Spec**, **Plan**, **TODO.md**, this README, and the per-feature `RASTER-ASSET-HANDOFF.md`.
2. Fetch `feature/3x-ui-materials` and selectively copy the exact Git blobs you need. Example:

```sh
git fetch origin feature/3x-ui-materials
git checkout origin/feature/3x-ui-materials -- docs/designs/3x-asset-library/webp/garage-rewards-and-missions/
mkdir -p public/feature-assets/garage-rewards-and-missions/raster
cp docs/designs/3x-asset-library/webp/garage-rewards-and-missions/mission-drift@3x.webp public/feature-assets/garage-rewards-and-missions/raster/
```

3. Before runtime import, visually inspect alpha and edges against dark/light/colorful backgrounds; reject lettering and baked false currency/award states. Test missing files, 1× CSS dimensions, image decode/size, performance and layout. No fake ownership, balance, paid checkout, reward settlement or mission completion.
4. Use proper **SDD → BDD → TDD** for UI behavior changes; run the target branch's checks and exact-HEAD CI. Keep the source archive under `docs/`; it is deliberately **not** served automatically. Never turn the source 3× pixel size into 3× touch targets.
5. The parent `feature/3x-ui-materials` is **asset-only**. Individual Wave3 branches do not automatically include it. Merge/cherry-pick only when cleared with branch owner; always target `develop`, never `main`. This archive isn't approval to implement/ship a store or monetization.

## Complete Git manifest (59 files)

**Source files use actual content-addressed Git blob SHA.** All stored under `docs/designs/3x-asset-library/webp/`.


### garage-vfx-skins (27)

| File | Bytes | Git blob SHA |
| --- | ---: | --- |
| `badge-equipped@3x.webp` | 18872 | `1264e8cc9d393eb7527e6c7ba49e698aa4b3ad6c` |
| `badge-favorite@3x.webp` | 16476 | `01c014052c8a8ff9e9ccdf535ec5913e19f97926` |
| `badge-limited@3x.webp` | 16792 | `23433d6abdf00c9deaa7c512b2cc6eb6c8ca6c16` |
| `badge-locked@3x.webp` | 19236 | `df707e0cf1ff1ee57b3b899278f73cf0e78bdcbf` |
| `badge-new@3x.webp` | 14478 | `2d0b64d06bda35888268df2bc14224933f895476` |
| `badge-trial@3x.webp` | 18632 | `edb9d66d98c76072dcb5fdd88b51b78b0b9c3c4b` |
| `flare-blue@3x.webp` | 23362 | `046bc00bd3d087de4c624fab99201db186cb108c` |
| `flare-cyan@3x.webp` | 20648 | `44687a15e921fa733066a40dfbecc03757f2c186` |
| `flare-gold@3x.webp` | 24746 | `eb044fb90f7c88c9081fcfbb866fa760549ffc6c` |
| `flare-magenta@3x.webp` | 19056 | `b805e0301ccd7d1863e7c3016f5d58c5c1d57058` |
| `flare-purple@3x.webp` | 22498 | `0d3520a41f4fa193d49a5f11b554c504c1988ac5` |
| `flare-red@3x.webp` | 22276 | `4cdc10b3fbd507eff49be5fee32b57c2c84db48f` |
| `flare-ring@3x.webp` | 16922 | `eef89b894ceb7a35bb3c2e87696a617f7f690df5` |
| `flare-white@3x.webp` | 21970 | `67e282722166b43158cca899598a9ed08cabaeaf` |
| `rarity-common@3x.webp` | 12670 | `9f47ae8a02588e039a55f6a57d13b5959a134c09` |
| `rarity-epic@3x.webp` | 13330 | `ca0d99ce9ec53a1798a0d6a607bfcb9f0873336e` |
| `rarity-legendary@3x.webp` | 12512 | `53f1ac548139dede6a0e90b9e9286362030e0615` |
| `rarity-mythic@3x.webp` | 13356 | `bcb809b077443eafda2f200347b515dcee2858e7` |
| `rarity-rare@3x.webp` | 12376 | `c27f446c940a29c99b71793140cbdeb6ce000d0b` |
| `thruster-basic@3x.webp` | 29810 | `4d06909a41b9c72a70892c0791d644f1f557c2e5` |
| `thruster-ion@3x.webp` | 27654 | `527e1a59995be912d8425b7f629c4d3034c08a0b` |
| `thruster-plasma@3x.webp` | 26870 | `cb3d361dc1324ea37862b1d27d32c6179645eefd` |
| `thruster-void@3x.webp` | 26642 | `790a34f11131c674756c247ee615a5b2717fede6` |
| `trail-cyan@3x.webp` | 20706 | `5ee9ac57d259f779ca8a097a8ae988dffacd73d9` |
| `trail-gold@3x.webp` | 20078 | `650b4798488477c025490f142db13863adedc299` |
| `trail-purple@3x.webp` | 18724 | `d959268b46a1ab56e14b546811362206add73637` |
| `trail-red@3x.webp` | 19548 | `6828d89f04408972dd2dbf203efd7f6f8fcd9c27` |

### garage-rewards-and-missions (8)

| File | Bytes | Git blob SHA |
| --- | ---: | --- |
| `mission-combo@3x.webp` | 14898 | `50274af65f5eb7270ced933e29f52e659b062fb8` |
| `mission-drift@3x.webp` | 25668 | `01c89de3dc38103f5a55ccbd0f15c0ad50038736` |
| `mission-race@3x.webp` | 23456 | `29ef3c4428a90e245146d38852a1870aff3b467a` |
| `mission-time@3x.webp` | 21628 | `a34c583f513ec47fd8c78574390cbe41aa90757c` |
| `trophy-bronze@3x.webp` | 22638 | `02e0cdc6c95cfca90a3f8c81bcc64d9d8d69f674` |
| `trophy-gold@3x.webp` | 23442 | `93097c103bddbe8e4aac1302ba9df467b83ae12b` |
| `trophy-platinum@3x.webp` | 20450 | `728fa01f442db9e6ae0793b9c9170cd39d088bc0` |
| `trophy-silver@3x.webp` | 23836 | `14060c3c0ce8c9b4b2ffae0e528894de26a6c0a6` |

### garage-store-readiness (6)

| File | Bytes | Git blob SHA |
| --- | ---: | --- |
| `store-box@3x.webp` | 13668 | `529df6e087571fa4adef7435bab887e7452f831e` |
| `store-bundle@3x.webp` | 12174 | `64de8dcb4429994a029a5f6bb86dc44d08e21129` |
| `store-cart@3x.webp` | 13338 | `87614922a57a1ad9b0a068db2a9c664491d01c60` |
| `store-collection@3x.webp` | 11654 | `b55e84a485eef3164a5955f98bfe0d4b2e2173a6` |
| `store-star@3x.webp` | 13292 | `9bb8af9589d711e4656d145b3301bc647cc87ffd` |
| `store-tag@3x.webp` | 9728 | `e5a9690f2d318f054c0ccf81afca1aeeb986d32f` |

### mobile-controls-hud (18)

| File | Bytes | Git blob SHA |
| --- | ---: | --- |
| `button-back@3x.webp` | 26176 | `0019f2912af385aa40bb393bd8a0060568524555` |
| `button-coming-soon@3x.webp` | 21250 | `270364656bbe01fc0751f4edbd34931cd56549b6` |
| `button-garage@3x.webp` | 22740 | `9ce4f0ef241dee50adb5eade0f7bbcd5d9f5b012` |
| `button-nitro@3x.webp` | 9430 | `bc8565de757c2b4579da6c1f37ea3ddc79700560` |
| `button-play@3x.webp` | 9762 | `575ece592c42133c46d18fc91ba93c6f9ce3c8ce` |
| `button-retry@3x.webp` | 27598 | `ee6a440b81bd574e9aff1d0a61e689c4c4d1b566` |
| `hud-brake@3x.webp` | 21694 | `011d010dd5f502e8c50445d8f50497cea44e2b13` |
| `hud-combo@3x.webp` | 18408 | `2750937b0f8e8b3b6f7b944954308fe605074f60` |
| `hud-drift@3x.webp` | 21398 | `91b2727c5040eaf5d33ed2480799a86420a4ee6e` |
| `hud-nitro@3x.webp` | 17140 | `246c4fde7c5bd32e53960c514da9112db0de807d` |
| `hud-pause@3x.webp` | 17806 | `51ac1294e28b5e9fb0e9808506d7bdb0cf4fbded` |
| `hud-speed@3x.webp` | 20504 | `1cfc36fb5871f469744af7fe84e94c47470b10da` |
| `ui-arrow-left@3x.webp` | 10458 | `68346645a18d7c8b53637c0d10744db675b4b466` |
| `ui-arrow-right@3x.webp` | 9340 | `6100ffd3c2760b9bfcbbc4a8e7916de7bd72c678` |
| `ui-close@3x.webp` | 11896 | `074a5c54e34480bc7e5fc6bd6dc44e1ca3447175` |
| `ui-info@3x.webp` | 15680 | `2f2d1c010d866edda8f236a48236570bf1b4b7a8` |
| `ui-settings@3x.webp` | 12340 | `07c9bcd63c31398db274851bdced0b082b92b67d` |
| `ui-tooltip@3x.webp` | 12454 | `34fcc49c8f8c588c324820d9648054178224dc99` |
