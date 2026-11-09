# Skyline Rush Wave 3 — Demo Artwork Source & Integration QA Audit

**Date:** 2026-11-10  
**Branch:** feature/wave3-demo-assets-qa (only writable branch)  
**Base:** origin/develop at dbf2ffc1e8e248c4042cce35a09bc7b5e58255fc  
**Design authority:** [Wave 3 frontend-first visual assets](https://github.com/weskao/skyline-rush/blob/feature/wave3-implementation-plan-audit-20261110/docs/designs/wave3-frontend-first-visual-assets.md)  
**Scope:** audit/test only. No image regeneration, no runtime Vue modifications, no simulated entitlement, no deploy or merge.

## Outcome and evidence boundary

- **Git tree/source mapping VERIFIED:** eight existing 288×288 Mission/Trophy PNGs, six existing 216×216 Store PNGs, their source WebPs and 25 tracked animated Garage GIFs are committed at the base SHA.
- **Source-byte integrity PENDING RUN:** tests/wave3-demo-assets.test.js locks exact original and current-runtime Git blob SHAs and decodes the actual PNG files, including per-edge alpha margins at threshold >16.
- **Browser layout PENDING RUN:** tests/wave3-demo-artwork-browser.spec.js checks decoded natural size, 1× CSS size, contain, 8 CSS-px Store frame padding, captions, URL base, fallback and per-viewport evidence.
- **Visual quality and all-device acceptance NOT VERIFIED:** full silhouettes, clipped highlights, original 3D material identity, blur, neighboring-sprite contamination, GPU/WebGL continuity and touch behavior require reviewing actual screenshots and device renders.
- **Manual visual sign-off: PENDING.** Numeric alpha checks, SHA consistency and a green CI are not artistic approval.
- **New image generation: NOT STARTED IN THIS BRANCH.** The separate GPT conversation owns the image creation. No placeholder, invented file or overwritten original is included.

These states are deliberately distinct: file exists ≠ decodes ≠ artistically complete ≠ browser verified ≠ manually accepted.

## Current runtime → source inventory

Git blob SHA values below were read from the Git tree of the base commit above. Every row is **reuse / locked baseline**, not an approved repair. Two common directory prefixes:

- Reference: docs/designs/3x-asset-library/webp/{category}/{id}@3x.webp
- Runtime: public/feature-assets/{category}/raster/{id}@3x.png, with a same-name WebP beside it.

The category is garage-rewards-and-missions for Mission/Trophy and garage-store-readiness for Store.

| ID | Original reference WebP Git SHA | Current runtime WebP Git SHA | Current runtime PNG Git SHA | Native → CSS |
| --- | --- | --- | --- | --- |
| mission-race | 29ef3c4428a90e245146d38852a1870aff3b467a | same as original | dd62626ba5dda50a5055913604a578d9af5fcd0b | 288→96 |
| mission-time | a34c583f513ec47fd8c78574390cbe41aa90757c | same as original | d7d0577e981acb185e121f179ad451fd964beb9c | 288→96 |
| mission-drift | 01c89de3dc38103f5a55ccbd0f15c0ad50038736 | same as original | 2254190d54337a072331b52c106427b747a79007 | 288→96 |
| mission-combo | 50274af65f5eb7270ced933e29f52e659b062fb8 | same as original | bbd394fb034e099247e0df89bc05d4cf0003e919 | 288→96 |
| trophy-bronze | 02e0cdc6c95cfca90a3f8c81bcc64d9d8d69f674 | same as original | 5d9c00546f088b42ec16678679557dcd69b425f5 | 288→96 |
| trophy-silver | 14060c3c0ce8c9b4b2ffae0e528894de26a6c0a6 | same as original | 32f9f0cc202295ebffd41983d2fdd697beecde7f | 288→96 |
| trophy-gold | 93097c103bddbe8e4aac1302ba9df467b83ae12b | same as original | b9c14b7cf044972d6c798384c151ff65382c19db | 288→96 |
| trophy-platinum | 728fa01f442db9e6ae0793b9c9170cd39d088bc0 | same as original | 2dbb9945800a20a598143e1f52de1bc2b36bb353 | 288→96 |
| store-cart | 87614922a57a1ad9b0a068db2a9c664491d01c60 | 1bfc221dfc6c454fb1834324699c9f1486358b66 | 9dcd7fb18d83e7811f8d1e12f185646644b16da6 | 216→72 |
| store-box | 529df6e087571fa4adef7435bab887e7452f831e | 4919f83451672fd8031b0b5f491846ee76cf98ba | 26d64f8bdcc729276996fb30cdba7123cbd0aa01 | 216→72 |
| store-bundle | 64de8dcb4429994a029a5f6bb86dc44d08e21129 | 560b72ccca71593b2536e58ce9288a7fee681775 | a1692822de25afee72f515797aed9d461a8859dd | 216→72 |
| store-tag | e5a9690f2d318f054c0ccf81afca1aeeb986d32f | 2055041f122c4e571b876f1b3d31b3bd002d5655 | dd8fff4e72873c3c37667d3bd95c231a07f91402 | 216→72 |
| store-star | 9bb8af9589d711e4656d145b3301bc647cc87ffd | 5112dfc7bfde28aa24374a945edf7c4035bc4cd3 | 24863d81f973a817fe22cd89ab91171dcc2c4b4e | 216→72 |
| store-collection | b55e84a485eef3164a5955f98bfe0d4b2e2173a6 | 4bda9a899a3529292b0a573de7b4eeeb3f6f90dc | 72a8c4ec3fcdfa27098a67be3c7ca50f4e67432a | 216→72 |

**Important provenance finding:** all six Store runtime WebPs have different Git blob SHAs from the archived source references. This is consistent with the existing Store artwork-restoration workflow and must not be treated as accidental edits or proof of equal pixels. The runtime PNGs are the currently displayed images; their SHA is locked in the tests until a specifically approved repair is documented. The eight Mission/Trophy runtime WebPs match the original archive SHA.

**Runtime ownership (read-only during this task):** src/garage-wave3-preview-catalog.ts supplies all 14 IDs, display sizes and bilingual labels; src/GarageMissionBoard.vue renders the eight real PNGs; src/GarageSourceArtGallery.vue mounts the six Store PNGs and WebP fallbacks; src/GarageArtworkImage.vue handles loading failures; src/GarageArtworkTile.vue provides contain, padded frame and caption; src/GarageSkinCatalog.vue handles cosmetic cards. The Garage result podium also references trophy PNGs. Source galleries are not proof of earned rewards or completed missions.

## Existing animation preservation

Manifest: public/feature-assets/garage-animated/manifest.json, Git blob SHA a264a9dadab2d496e1b6c24989ee8d8ed790864e.

- 25 manifest entries, matching 25 dedicated GIF filenames observed in the base Git tree: 4 thrusters, 4 airflow, 5 nitro trails, 9 launch flares and 3 Store concepts.
- Three Store GIFs (store-box, store-bundle, store-collection) are mounted via GarageArtworkTile. Their original PNG stays available for static and reduced-motion display. Store cart/star/tag use the existing CSS sweep.
- Unit verification checks manifest entry count, source existence, GIF89a, native GIF frame canvas, byte size and manifest alignment; existing specialized tests remain the authority for frames, loop, alpha/matte and behavior.
- The existing manifest marks entries gpt-authored. This is source metadata, **not** an independent visual sign-off from this QA task. No mass regeneration or manifest rewrite was attempted.
- **Open behavior review:** GarageArtworkImage checks Reduced Motion for GIF playback, but current source does not separately check a VFX-Off flag before selecting animatedSrc. GarageArtworkTile suppresses its CSS sweep for VFX-Off. Full GIF-off behavior requires an integration-owner decision/change; this branch does not edit their Vue components.

## New Demo artwork: Awaiting external generation

Base branch contains **zero** files under public/feature-assets/wave3-demo/. These names are planned candidates, not evidence that image files exist:

| File | Intended native size | CSS size | Gate / status |
| --- | --- | --- | --- |
| demo-points@3x.webp | 216×216 transparent | 72×72 | Conditional A-03, awaiting external generation and approval; ≥20px alpha inset at >16 |
| demo-claim@3x.webp | 216×216 transparent | 72×72 | Conditional A-04, awaiting external generation and approval; ≥20px inset |
| demo-collection-empty@3x.webp | 288×288 transparent | 96×96 | Optional A-05, awaiting UI need and approval; ≥12px inset |
| demo-results-banner@3x.webp | 432×156 transparent | 144×52 | Optional A-06, awaiting UI need and approval |

Approved destination: public/feature-assets/wave3-demo/raster/. This branch mounts **none** of these into Vue. The integration owner must determine genuine UI need, validate generated native pixels (not upscaled crops), preserve visual identity, record source and new blob SHAs, and mount using Vite BASE_URL. Test files automatically reject malformed WebP candidates when present; browser image decode/natural pixel size/alpha verification runs only when a file is committed.

The 59-image source archive includes some resampled PNG cutouts. A 3× dimension or passing alpha test alone never establishes native generated detail. No flat-vector substitutes, speculative paid inventory art, false balance numbers or fake trophy ownership are authorized.

## Automated checks and screenshots

| Gate | Implementation | Evidence / current state |
| --- | --- | --- |
| Runtime names and sources | Unit test reads live catalog, 14 PNGs, reference WebPs, current runtime hashes | Tests committed; execution evidence pending |
| Native dimensions and true transparency | Existing shared PNG decoder with alpha threshold >16; 288×288 and 216×216; pins source SHA | Tests committed; execution pending |
| Sprite contamination / missing highlights | Source-locked SHA + largest connected component + browser alpha; manual visual comparison still required | Structural guards added; artistic QA pending |
| 20px inset on Store icons | Per-side actual alpha bounds on Store PNGs and WebP candidates once supplied | Tests committed; execution pending |
| CSS display / contain / padding / caption | Actual Garage and Store DOM in Playwright; 96px/72px, 8px Store frame inset | Tests committed; execution pending |
| Missing and corrupted image | Corrupt Store PNG → original WebP; absent Store PNG + WebP → text; absent Mission PNG → text | Browser tests committed; execution pending |
| Three viewports, two languages | 390×844, 844×390, 1440×900; en and zh-TW; screenshots per matrix cell | Screenshots **not captured yet** |
| Reduced Motion and VFX-Off | Static frame and CSS sweep controls; GIF-off gap noted above | Browser test committed; execution pending |
| Vite subpath URL | Static source paths include import.meta.env.BASE_URL; loaded runtime URL starts with page-relative feature-assets prefix | Actual non-root hosting remains a follow-up |
| Actual WebGL / Results → Garage | Integration owner must exercise real driving flow, all quality tiers and handheld devices | Manual QA **not performed** |
| Blur / 3D identity / original angle | 1× rendered side-by-side and source-zoom comparison required | Manual visual sign-off: PENDING |

**Screenshot collection after a successful browser run:** Playwright per-test attachments are named store-icons-safe-3x-wave3-missions-*, store-icons-safe-3x-wave3-store-* and store-icons-safe-3x-wave3-reduced-motion-vfx-off.png. These names intentionally match the existing CI workflow's garage-store-review-* artifact upload glob; their presence must be checked in a completed run. They are baseline screenshots, **not** before/after repairs. A screenshot attachment being requested by the test is not itself proof it was created.

**Required commands in a full checkout:** node --test tests/wave3-demo-assets.test.js; npm test; npm run typecheck; npm run build; npx playwright test tests/wave3-demo-artwork-browser.spec.js; make verify. Full project verification also includes the World Tour suite. Review exact branch HEAD CI and the artifact upload; a queued run is not a pass.

### TDD evidence ledger

1. **Tests-first:** tests/wave3-demo-assets.test.js was created at commit 908fc4c44456855bab198fbdf49e1a023851c0ab; browser spec at da1dd35f9794aba2ca6d8beaec2cfe73c5fb36e8; screenshot artifact naming refinement at 525148f0543df182121ff5187d260028a0f5b93e.
2. **RED (expected; observation pending):** the unit test titled "asset audit has an explicit unfinished-generation state and baseline SHA" was pushed *before this audit document existed*. This is a legitimate missing-deliverable failure condition, not a demonstrated pixel defect or a repaired image. Earlier Actions runs were superseded/cancelled as newer test commits arrived; no observed failing test is claimed without logs.
3. **GREEN (pending):** this report supplies the exact missing-document contract. Unit, browser, build and full exact-HEAD CI must still execute and be read before GREEN is recorded.
4. **Repairs approved/applied:** zero. **Before/after repair images:** N/A, because no existing artwork was touched. Do not fabricate a before/after pair.
5. **Production regressions identified from pixels:** none *verified*; numeric and visual checks have not been run on a local complete checkout in this session.

### Manual QA checklist (must remain open)

- [ ] Review 14 actual 1× displays and original sources at 100% against dark, light and saturated card backgrounds. Catch blur, cut-off tips and foreign neighboring sprites by eye.
- [ ] Review 25 animations at first/middle/last frames and on the actual Garage card tint; verify natural physically anchored motion and smooth loop.
- [ ] Inspect the six portrait/landscape/desktop English/Chinese baseline screenshots at completed exact-HEAD CI; verify no scroll or caption/touch overlap.
- [ ] Drive Results → Garage / Mission / Trophy / Store / Collection in Low, Medium, High, VFX-Off and Reduced Motion on representative real devices.
- [ ] Decide whether VFX-Off must also turn off animated GIFs; arrange with the integration owner if so.
- [ ] Accept or reject each externally generated new image; record true native pixel review, source SHA, new SHA, prompt version, generated-vs-runtime path and screenshot.
- [ ] For any *approved* original-art repair, provide a real before-and-after 1× comparison, original and repaired SHA, reviewer and exact-HEAD CI. Until that occurs, preserve all original pixels.

**Handoff status:** reused/locked existing art; tests added; candidate generation awaiting external conversation; browser/CI/human visual acceptance pending. Never mark art generation or end-to-end integration complete based on this audit alone.
