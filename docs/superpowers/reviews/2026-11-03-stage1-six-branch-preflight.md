# Six-branch preflight: preserve earlier art, resume with live Three.js home prompts

**Checked:** 2026-11-03, `weskao/skyline-rush`.
**Purpose:** The previous five art chats used **JPEG-only** prompts before the user corrected the goal to *animated Three.js home showrooms*, so their partial work must not be erased.

## Result: NO rollback is required

The original art branch base was `f5c411d98d48a1164894dbe3b927b2cc6c60257c`. At the audit no art branch has committed `src/upcoming-scenes/<id>.ts` or changed the shared home UI; so none of the existing commits conflicts with the new scene module ownership. **Keep existing commits, old notes and any completed JPEG. Do not hard reset, force push, delete, or revert.** Historical art notes may still mention superseded JPEG-only plans; the updated scene specification and six-chat prompt take precedence.

| Branch | Audited HEAD | Added changes since original art base | Required action before using updated prompt |
| --- | --- | --- | --- |
| `feature/epic-home-art-dune-tempest` | `5eb18b315c7436bf3ec1bbeaa1803f7d55033324` | `docs/designs/new-tracks/home-art/dune-tempest.md` (art direction + blocked JPEG report; **no new JPG**). | **Retain art note**, do not wait for a new JPEG; implement `src/upcoming-scenes/dune-tempest.ts`, test, and append new 3D implementation section to note |
| `feature/epic-home-art-monsoon-ruins` | `c48882367685d0ce64901baf27c5cee13775d182` | `public/track-teasers/monsoon-ruins.jpg` (real 3072×1152 JPEG, 461751 bytes, image SHA `cdb8c3dd7fa55ded9b37c564fe6f2c211923cada`) + `home-art/monsoon-ruins.md`. | **Retain JPEG and provenance**. The image is the home thumbnail/art direction, NOT a completed dynamic scene. Add `src/upcoming-scenes/monsoon-ruins.ts` and focused scene test, extend note |
| `feature/epic-home-art-skyfall-archipelago` | `f5c411d98d48a1164894dbe3b927b2cc6c60257c` | No new commits. | Start 3D environment from existing branch |
| `feature/epic-home-art-volcanic-crown` | `f5c411d98d48a1164894dbe3b927b2cc6c60257c` | No new commits. | Start 3D environment from existing branch |
| `feature/epic-home-art-stormline-megacity` | `1e9e2f0b4f5e28843e49e46b707652d03c600887` | `home-art/stormline-megacity.md`, records locally generated 3072×1152 JPEG **not uploaded** and SHA-256 `a9930f33a55b5e33531c898d891cc35a124d1f4795df924606fccd8c432963b0`. | **Retain note**; do not claim missing JPG is committed; make 3D scene/test first. JPEG can be imported separately for thumbnail when available |
| `feature/epic-multiroute-longform-tracks` | Latest at audit after revised 3D spec: `2fa1bc98f98300a70747bd12964cdb2e624f9fc5` | First-pass five selectable Coming Soon UI, localized fixed-width Start, JPEG overlay as **temporary** fallback, plus corrected real 3D specs and tasks. | GPT 6 must build shared scene host, replace interim hero JPEG behavior when WebGL is healthy, integrate five isolated scene modules via selected file blobs, run TDD and actual visual/CI verification |

## Conflict and ownership conclusions

- **No art-branch reset.** Each prior branch has at most its own documentation and one JPEG; there are no future scene module commits yet.
- The shared integration branch's `src/App.vue` / `src/race-select-ui.ts` currently select five preview cards but display a **static image** on top of an existing racing scene. This is **not the final required result** and must be changed by GPT 6. Do not revert the entire shared branch or discard existing UX work.
- Art branch workers should **not merge** the shared integration branch back into old art branches merely to read the revised spec, which risks accidental UI conflicts. Read the [current binding spec](../specs/2026-11-03-stage1-animated-3d-home-showcase-design.md) and [six corrected prompts](../prompts/2026-11-03-six-chat-home-preview-implementation.md) using the GitHub **shared integration branch ref** explicitly, then edit only their assigned art branch.
- Five art chats own `src/upcoming-scenes/<id>.ts`, `tests/upcoming-<id>-scene.test.js`, `docs/designs/new-tracks/home-art/<id>.md`, optional JPEG thumbnail. GPT 6 owns shared renderer, scene host, player/rival/jet animation, camera, UI, locales, tests and selective approved-blob integration.
- **Do not drop any prior local-only image artifact** before checking its original chat download; there is no current GitHub JPG for Stormline on its art branch.
- The new homepage P0 is *actual real-time 3D geometry, vehicles, weather/landmark motion* matched to the two JPEGs, with selection but no race start. A screenshot or static background is insufficient. Separate later stage completes actual playable 13–16 km point-to-point race.

## Safe starting checklist for each future GPT chat

1. Read this preflight, the [latest six-chat prompt](../prompts/2026-11-03-six-chat-home-preview-implementation.md) and [binding live 3D homepage spec](../specs/2026-11-03-stage1-animated-3d-home-showcase-design.md) **from the integration branch**. Do not rely on old `CLAUDE.md` / prompt copies on the art branches as if they contained this update.
2. Refresh **your branch's current HEAD**; the audited SHAs above are snapshots, not a license to overwrite commits made after this check.
3. Inspect existing `home-art/<id>.md` and `public/track-teasers/<id>.jpg` if present; carry forward useful art landmarks and existing images.
4. Implement per-map time-driven Three.js scene and corresponding tests first, using existing single renderer via the shared host interface. Do not invent a second WebGL context or full gameplay simulation.
5. Commit only new/updated owned files; do not reset, force, PR, deploy, or merge `develop`/`main`. Report actual commit and tests. GPT 6 later integrates only reviewed art module, test and art note blobs, optionally JPEG, not entire histories.

**Status:** Audit/plan only. No 3D module built, no automated tests or CI claimed passing by this document.
