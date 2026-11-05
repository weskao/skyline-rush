---
paths:
  - "public/track-teasers/**"
---

# Track teaser art — shared asset and rollback rules

- Source of truth: `develop:public/track-teasers/*.jpg`. Every playable-course and preview/integration branch that displays a track teaser must reuse the **same JPEG file (same Git blob SHA)**; do not independently regenerate or re-encode branch copies.
- Frostbite Canyon canonical path: `public/track-teasers/frostbite-canyon.jpg`. The approved **vehicle-free** source is the file introduced in commit `a4cb704553b89b20180f79a1fb86d280509ab0af` (Frostbite blob `95264f93c0ebe7a08f0b2c73b3742e53dc1e92a0`). Monsoon is the approved no-human-portrait rainforest scene from `5182ee2ce48ea14c8281340879d068a258b5ef02`.
- Each final image must be a JPEG that decodes to exactly **568 × 205**. No car, vehicle, wheel, nitro plume, trail, embedded text, title, watermark, logo, borders, foreign map strips or unrelated scenery replacement.
- Only repair designated content. For Skyfall Archipelago, Stormline Megacity, Volcanic Crown and Frostbite Canyon, preserve the original camera/viewpoint, terrain, road, buildings, bridges, sky and lighting outside an explicit localized inpainting mask. Monsoon uses the approved replacement without a human face.
- Verify: decode all five JPEG files and check dimensions; inspect every image at native resolution and inside the actual game UI; compare untouched areas with the original; verify all target branches have the same five blob SHAs as `develop`; report manual review and exact-HEAD CI separately.
- Update scope: only these five asset files plus a narrowly scoped `CLAUDE.md` / rule update when necessary. Avoid full cross-branch merges for artwork-only changes; copy the selected blobs on top of each branch's existing tree to preserve other work. Reject changed or mismatched HEADs instead of force-pushing.
- Rollback landmarks (full 40-character commit IDs): original Frostbite art with car `15db9d8ebdddff67c5409f9e3ba4728a330d7690`; pre-removal five-teaser baseline `ca592105631bc2abc6717b1e2c0bf737f91785ce`; vehicle-removal four-teaser commit `a4cb704553b89b20180f79a1fb86d280509ab0af`; approved Monsoon replacement `5182ee2ce48ea14c8281340879d068a258b5ef02`.
- To restore just the previous Frostbite-with-car source for an authorized rollback: `git restore --source=15db9d8ebdddff67c5409f9e3ba4728a330d7690 -- public/track-teasers/frostbite-canyon.jpg`; review the diff, then commit and push normally. To restore the approved vehicle-free image: use `--source=a4cb704553b89b20180f79a1fb86d280509ab0af` with the same path. Never reset or force-push shared branches for asset rollback.

## Canonical five-image change log (2026-11-06)

These commits changed the **actual image files**, not merely the documentation. The Git blob SHA is a byte-for-byte identity check across branches. Copy approved blobs; never independently recompress the same JPEG.

| JPEG under `public/track-teasers/` | Image-change commit | Approved blob SHA (no car) | Previous blob SHA at pre-removal baseline |
| --- | --- | --- | --- |
| `monsoon-ruins.jpg` | `5182ee2ce48ea14c8281340879d068a258b5ef02` | `9828d88749d5ff37404ddda7ba0d9d46b8fac29c` | `be2801e0979956d8aba02dd06461831bf57483cd` |
| `skyfall-archipelago.jpg` | `a4cb704553b89b20180f79a1fb86d280509ab0af` | `8e2f7beeebb35e01c9027d02a2c164e949cf3162` | `f96a5f7928b7ab57d184f147f37c0f11fd77ee6d` |
| `stormline-megacity.jpg` | `a4cb704553b89b20180f79a1fb86d280509ab0af` | `8353ae6e68896e1a44808ad413c898060527845d` | `bb6aa5adf67c08a846da115b7ca4c3710800c399` |
| `volcanic-crown.jpg` | `a4cb704553b89b20180f79a1fb86d280509ab0af` | `8c2be46416dc1f614feec19d190ea7798b12622f` | `bbf5c7903cde287c488313770ab24bbaa5798a62` |
| `frostbite-canyon.jpg` | `a4cb704553b89b20180f79a1fb86d280509ab0af` | `95264f93c0ebe7a08f0b2c73b3742e53dc1e92a0` | `ca2dfc8043fc2e0dee6393c024ff7ce2deab7ce4` |

- All five pre-removal baseline blobs above are from `ca592105631bc2abc6717b1e2c0bf737f91785ce`.
- Frostbite's earlier full illustration commit before vehicle removal: `15db9d8ebdddff67c5409f9e3ba4728a330d7690`.
- The rule/rollback documentation introduction: `86d8ace73776ed8831ab3e9622f6e4746bae2b0b` (does not itself change the JPEG bytes).
- To roll back **one** image without moving branch history: `git restore --source=ca592105631bc2abc6717b1e2c0bf737f91785ce -- public/track-teasers/<image>.jpg`, inspect the image and diff, then commit/push normally.
- To recover the approved **no-car** image: use `git restore --source=5182ee2ce48ea14c8281340879d068a258b5ef02 -- public/track-teasers/monsoon-ruins.jpg` for Monsoon, or `git restore --source=a4cb704553b89b20180f79a1fb86d280509ab0af -- public/track-teasers/<image>.jpg` for the other four.
- Before retiring an old feature branch, verify its uniquely authored code and documents are present or intentionally superseded in `develop`. Identical image blob SHAs alone do not establish that the entire branch was merged.

