# Stage 1 Home Preview Artwork — Five Independent GPT Art Assignments

> **Update 2026-11-03:** For full six-way execution, including the sixth GPT that owns shared homepage selection, bilingual fixed-width `#start-button`, keyboard no-start gates and CI, use [Six-Chat Implementation Prompts](2026-11-03-six-chat-home-preview-implementation.md). The five art-only prompts below remain valid and must not modify shared UI files.

**Canonical shared UI integration branch:** `feature/epic-multiroute-longform-tracks`.
**Scope:** Only these five first-stage coming-soon maps, never the later five Stage 2 plans. All maps are **point-to-point** (START != FINISH, no laps); they are currently image-only previews, not playable 3D courses.

## Parallel collaboration rules

- Open **five independent GPT chats yourself**, one brief below per chat. This chat cannot automatically create or operate separate conversations.
- Each chat uses **only its assigned art branch** `feature/epic-home-art-<track-id>`, created from the shared pre-UI planning commit `f5c411d98d48a1164894dbe3b927b2cc6c60257c`. DO NOT modify `main`, `develop` or any other track's branch. DO NOT create a PR, deploy or force push.
- One art owner per hero file: `public/track-teasers/<track-id>.jpg`. If the file does not yet exist on the art branch, create it; it already exists on the updated shared UI branch. Only write this assigned JPEG and an assigned design note `docs/designs/new-tracks/home-art/<track-id>.md` (if directory absent, create it).
- Read this repository's `AGENTS.md`, `CLAUDE.md`, `.claude/rules/track-showcase.md`, `docs/designs/new-tracks/visual-acceptance-gate.md`, and that map's `source-concept-jpeg/<track-id>/concept-view-{01,02}.jpg` and route SVG before drawing. Future-run JPEG references are **inspiration**, not actual engine WebGL screenshots.
- Generate a **new native** JPEG master at least **2400 × 900 pixels** (roughly 2.7:1; match the current card/hero crop), sRGB, high quality, no watermarks/text/UI mock labels. **Do not upscale the existing small JPEG** and call it a 3× source. Composition must be readable behind left-aligned home UI and preserve important map landmarks on the right / centre-right. Native 2400 × 900 supports 3× display at ~800 × 300 CSS px.
- Performance: optimize output JPEG (recommend ≤ 1.3 MB) while preserving readable detail; keep fallback semantics if custom art cannot be generated. No new runtime dependencies, no editing shared `src/App.vue`, `src/race-select-ui.ts`, `src/style.css`, `src/locales/*`, `src/upcoming-tracks.ts`, or shared tests.
- Deliver back the art branch's commit SHA, source/render pixel dimensions, file size, exact path, and a concise visual-parity checklist in the assigned `.md`. After that this integration chat merges the five verified art commits onto the shared UI feature branch sequentially (not into `develop`).

## Individual prompts (copy an entire section into its own GPT chat)

### 1. 沙暴裂谷 Dune Tempest

> **Task:** With connected GitHub repository `weskao/skyline-rush`, create **one original native 2400 × 900+ JPEG homepage artwork** on existing branch `feature/epic-home-art-dune-tempest` only.
>
> - Destination: `public/track-teasers/dune-tempest.jpg`.
> - Paired art-direction references: `docs/designs/new-tracks/source-concept-jpeg/dune-tempest/concept-view-01.jpg`, `concept-view-02.jpg` and `docs/designs/new-tracks/route-schematics/dune-tempest.svg`. Read `docs/designs/new-tracks/visual-acceptance-gate.md`.
> - **Ground composition:** 乾燥赭金色沙丘、無標線自然沙路、兩個大髮夾彎、石環和高大峽谷.
> - **Split/air identity:** 呈現地面路線與遠處橫跨斷崖的空中捷徑；傍晚夕照、沙塵牆與車輪揚塵；不能把整條路渲染成封閉賽車場.
> - Must be cinematic, legible on desktop/mobile, original assets only, with clear sense of course forward direction; no false circuit-loop map, no gameplay-ready claims, no fake playable UI. Preserve left-side negative space so the existing intro remains readable.
> - Native artwork at least 2400 × 900 px (do not enlarge the old 568 × 205 crop as a substitute); export optimized sRGB JPEG. Add a concise `docs/designs/new-tracks/home-art/dune-tempest.md` with concept reference paths, image description, palette/landmark/visibility notes, exact pixels and file size.
> - **Do not edit any shared UI, code, locale or other map's asset files.** Do not merge, PR, deploy or force push. Report the exact commit SHA and preview image in chat, and whether actual GitHub image bytes are verified.

### 2. 雨林失落神殿 Monsoon Ruins

> **Task:** With connected GitHub repository `weskao/skyline-rush`, create **one original native 2400 × 900+ JPEG homepage artwork** on existing branch `feature/epic-home-art-monsoon-ruins` only.
>
> - Destination: `public/track-teasers/monsoon-ruins.jpg`.
> - Paired art-direction references: `docs/designs/new-tracks/source-concept-jpeg/monsoon-ruins/concept-view-01.jpg`, `concept-view-02.jpg` and `docs/designs/new-tracks/route-schematics/monsoon-ruins.svg`. Read `docs/designs/new-tracks/visual-acceptance-gate.md`.
> - **Ground composition:** 深綠雨林冠層、濕泥河道、層疊遺跡、可見的寺廟髮夾彎.
> - **Split/air identity:** 瀑布和古橋構成明確高低分岔；雨滴與濕潤反光但前路必須清晰，避免連續黑暗及大量遮擋.
> - Must be cinematic, legible on desktop/mobile, original assets only, with clear sense of course forward direction; no false circuit-loop map, no gameplay-ready claims, no fake playable UI. Preserve left-side negative space so the existing intro remains readable.
> - Native artwork at least 2400 × 900 px (do not enlarge the old 568 × 205 crop as a substitute); export optimized sRGB JPEG. Add a concise `docs/designs/new-tracks/home-art/monsoon-ruins.md` with concept reference paths, image description, palette/landmark/visibility notes, exact pixels and file size.
> - **Do not edit any shared UI, code, locale or other map's asset files.** Do not merge, PR, deploy or force push. Report the exact commit SHA and preview image in chat, and whether actual GitHub image bytes are verified.

### 3. 浮空群島 Skyfall Archipelago

> **Task:** With connected GitHub repository `weskao/skyline-rush`, create **one original native 2400 × 900+ JPEG homepage artwork** on existing branch `feature/epic-home-art-skyfall-archipelago` only.
>
> - Destination: `public/track-teasers/skyfall-archipelago.jpg`.
> - Paired art-direction references: `docs/designs/new-tracks/source-concept-jpeg/skyfall-archipelago/concept-view-01.jpg`, `concept-view-02.jpg` and `docs/designs/new-tracks/route-schematics/skyfall-archipelago.svg`. Read `docs/designs/new-tracks/visual-acceptance-gate.md`.
> - **Ground composition:** 白色雲海、浮島石橋、巨大空中石環、流入雲海的瀑布.
> - **Split/air identity:** 低層地面路與高層飛行捷徑同時可見，清楚呈現分岔與匯合；景深壯觀且不採環狀計圈.
> - Must be cinematic, legible on desktop/mobile, original assets only, with clear sense of course forward direction; no false circuit-loop map, no gameplay-ready claims, no fake playable UI. Preserve left-side negative space so the existing intro remains readable.
> - Native artwork at least 2400 × 900 px (do not enlarge the old 568 × 205 crop as a substitute); export optimized sRGB JPEG. Add a concise `docs/designs/new-tracks/home-art/skyfall-archipelago.md` with concept reference paths, image description, palette/landmark/visibility notes, exact pixels and file size.
> - **Do not edit any shared UI, code, locale or other map's asset files.** Do not merge, PR, deploy or force push. Report the exact commit SHA and preview image in chat, and whether actual GitHub image bytes are verified.

### 4. 熔火天脊 Volcanic Crown

> **Task:** With connected GitHub repository `weskao/skyline-rush`, create **one original native 2400 × 900+ JPEG homepage artwork** on existing branch `feature/epic-home-art-volcanic-crown` only.
>
> - Destination: `public/track-teasers/volcanic-crown.jpg`.
> - Paired art-direction references: `docs/designs/new-tracks/source-concept-jpeg/volcanic-crown/concept-view-01.jpg`, `concept-view-02.jpg` and `docs/designs/new-tracks/route-schematics/volcanic-crown.svg`. Read `docs/designs/new-tracks/visual-acceptance-gate.md`.
> - **Ground composition:** 黑色玄武岩、橘紅火山裂縫、火山口大迂迴彎與天然斷崖.
> - **Split/air identity:** 地面曲折道路和上方跨岩漿路線；煙灰與火星受控，保留可視距離與安全著陸.
> - Must be cinematic, legible on desktop/mobile, original assets only, with clear sense of course forward direction; no false circuit-loop map, no gameplay-ready claims, no fake playable UI. Preserve left-side negative space so the existing intro remains readable.
> - Native artwork at least 2400 × 900 px (do not enlarge the old 568 × 205 crop as a substitute); export optimized sRGB JPEG. Add a concise `docs/designs/new-tracks/home-art/volcanic-crown.md` with concept reference paths, image description, palette/landmark/visibility notes, exact pixels and file size.
> - **Do not edit any shared UI, code, locale or other map's asset files.** Do not merge, PR, deploy or force push. Report the exact commit SHA and preview image in chat, and whether actual GitHub image bytes are verified.

### 5. 霓虹暴雨都市 Stormline Megacity

> **Task:** With connected GitHub repository `weskao/skyline-rush`, create **one original native 2400 × 900+ JPEG homepage artwork** on existing branch `feature/epic-home-art-stormline-megacity` only.
>
> - Destination: `public/track-teasers/stormline-megacity.jpg`.
> - Paired art-direction references: `docs/designs/new-tracks/source-concept-jpeg/stormline-megacity/concept-view-01.jpg`, `concept-view-02.jpg` and `docs/designs/new-tracks/route-schematics/stormline-megacity.svg`. Read `docs/designs/new-tracks/visual-acceptance-gate.md`.
> - **Ground composition:** 深藍紫雨夜摩天樓、多層高架路、霓虹招牌、濕潤反射與路口急彎.
> - **Split/air identity:** 讓低層街道與高層空中捷徑立體交錯；極有速度感但不可用過度模糊/光暈掩蓋道路.
> - Must be cinematic, legible on desktop/mobile, original assets only, with clear sense of course forward direction; no false circuit-loop map, no gameplay-ready claims, no fake playable UI. Preserve left-side negative space so the existing intro remains readable.
> - Native artwork at least 2400 × 900 px (do not enlarge the old 568 × 205 crop as a substitute); export optimized sRGB JPEG. Add a concise `docs/designs/new-tracks/home-art/stormline-megacity.md` with concept reference paths, image description, palette/landmark/visibility notes, exact pixels and file size.
> - **Do not edit any shared UI, code, locale or other map's asset files.** Do not merge, PR, deploy or force push. Report the exact commit SHA and preview image in chat, and whether actual GitHub image bytes are verified.

## Integration and verification (owned only by shared UI chat)

- Collect five unique per-map art branch HEADs and verify each expected `public/track-teasers/<id>.jpg` Git blob. Integrate **one image and one art note per branch only**, never overwrite shared UI files.
- Compare desktop 1440×900 and phone 390×844 homepage captures, ensure legibility with bilingual names, `COMING SOON`/ `即將推出` statuses, disabled Start, no keyboard bypass, and size-locked start button; Reduced Motion must not animate static concept art.
- Run focused Node tests, Vue typecheck/build, browser home-layout + i18n/track-picker tests, `make verify`, then exact-HEAD GitHub CI. Image reference visual review is distinct from actual runnable game track acceptance.
