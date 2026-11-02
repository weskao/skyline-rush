# Skyline Rush — Six-GPT Parallel Home Preview Implementation (2026-11-03)

**Use:** six **separate ChatGPT conversations opened by the user**. This file prepares isolated, copy/paste prompts; saving it does not launch the chats or begin background execution.

**Design authority:** [Homepage spec](../specs/2026-11-03-stage1-coming-soon-home-preview-design.md) · [Concept JPEG catalogue](../../designs/new-tracks/README.md) · [Visual parity rules](../../designs/new-tracks/visual-acceptance-gate.md) · [Existing five artwork prompts](2026-11-03-stage1-home-teasers-parallel.md).

**Recommended execution:** launch GPT 1–5 independently to create each new JPEG, and GPT 6 simultaneously to stabilize and verify the home controller. Five art branches already exist at `f5c411d98d48a1164894dbe3b927b2cc6c60257c`; shared UI branch already contains first implementation. Do not treat these initial states as finished art or passing CI.

## File and branch ownership

| Chat | Branch (existing) | Authorized files |
| --- | --- | --- |
| GPT 1 沙暴裂谷 / Dune Tempest | `feature/epic-home-art-dune-tempest` | `public/track-teasers/dune-tempest.jpg`, `docs/designs/new-tracks/home-art/dune-tempest.md` |
| GPT 2 雨林失落神殿 / Monsoon Ruins | `feature/epic-home-art-monsoon-ruins` | `public/track-teasers/monsoon-ruins.jpg`, `docs/designs/new-tracks/home-art/monsoon-ruins.md` |
| GPT 3 浮空群島 / Skyfall Archipelago | `feature/epic-home-art-skyfall-archipelago` | `public/track-teasers/skyfall-archipelago.jpg`, `docs/designs/new-tracks/home-art/skyfall-archipelago.md` |
| GPT 4 熔火天脊 / Volcanic Crown | `feature/epic-home-art-volcanic-crown` | `public/track-teasers/volcanic-crown.jpg`, `docs/designs/new-tracks/home-art/volcanic-crown.md` |
| GPT 5 霓虹暴雨都市 / Stormline Megacity | `feature/epic-home-art-stormline-megacity` | `public/track-teasers/stormline-megacity.jpg`, `docs/designs/new-tracks/home-art/stormline-megacity.md` |
| GPT 6 UI | `feature/epic-multiroute-longform-tracks` | Shared homepage UI/TypeScript/CSS/locales/tests/docs and selective **verified-image-only** incorporation |

**Critical:** All five art branches are based on a planning commit that predates the shared preview UI. They should not merge the shared branch into their art branches and should not change any shared files. GPT 6 takes their **two specifically owned blobs** only after verification. For actual race maps, later Stage 1 real Three.js rendering has separate acceptance and is **not** part of this homepage teaser task.

---

## GPT 1 — 沙暴裂谷 / Dune Tempest

Copy this entire prompt into a separate GPT chat:

> **Implement one new high-fidelity HOME PAGE concept JPEG for Skyline Rush.**
>
> **Assigned Git branch:** `feature/epic-home-art-dune-tempest` (already exists). Use its latest HEAD; do not create a new branch.
>
> **Assigned reference images:**
> - `docs/designs/new-tracks/source-concept-jpeg/dune-tempest/concept-view-01.jpg` (ground).
> - `docs/designs/new-tracks/source-concept-jpeg/dune-tempest/concept-view-02.jpg` (flight/alternate route).
> - `docs/designs/new-tracks/route-schematics/dune-tempest.svg` (course design, not pixel-accurate map).
>
> **Creative direction:** 壯觀橙金沙丘、自然寬沙路、峽谷懸崖及兩處明顯髮夾彎；落日和沙塵營造深度. **Flight/branch:** 跨越斷崖的獨立高層飛行捷徑、安全落地區與回到單程主路的匯合點. **Avoid:** 不要平直柏油路、白色道路標線、封閉環道，也不要用沙塵遮住前方走線.
>
> **Required handoff:** **GitHub repository:** `weskao/skyline-rush`. **Only Stage 1**: the five proposed point-to-point races. Do not touch Stage 2, `develop`, `main`, PRs, deployments, or force-push.
> >
> > Read `AGENTS.md`, `CLAUDE.md`, `.claude/rules/track-showcase.md`, `docs/designs/new-tracks/visual-acceptance-gate.md`, `docs/designs/new-tracks/README.md`, and the exact **two source JPEGs** and route schematic for your map. Preserve the named landmarks, major terrain shapes, lighting/weather identity and the visual distinction between ground and flight; do not copy concept image topology literally when its map doodle looks circular. Main race is **one-way** (distinct START & FINISH, not laps).
> >
> > **File ownership:** modify only your branch's `public/track-teasers/dune-tempest.jpg` and `docs/designs/new-tracks/home-art/dune-tempest.md`. No edits to shared UI, TypeScript, locales, tests, CSS or other maps; do not merge into the shared branch. Use original generated **native high-resolution landscape JPEG** (target at least 2400 × 900, sRGB; if unavailable, state actual generated resolution and do not pretend upscaling is native detail), with no words/logos/watermarks/fake UI in the image. Keep the left third quieter for homepage text, preserve prominent road/landmark composition centre/right; readable after cropping to mobile. Aim for reasonable download bytes while maintaining fidelity. If image bytes cannot actually be written via GitHub tools, deliver the image in chat and report the block; never claim it was committed.
> >
> > Write your map art note with paths to both sources, scene palette, ground and aerial references, key landmarks, crop safety, weather/particles, final **real** pixel dimensions/size, commit SHA and any intentional deviations. Verify real GitHub blob path after committing.
>
> Final reply: link to the actual JPEG, GitHub commit URL, visual preview, generated native dimensions, file bytes and design-note URL, and note any unmet constraints.


## GPT 2 — 雨林失落神殿 / Monsoon Ruins

Copy this entire prompt into a separate GPT chat:

> **Implement one new high-fidelity HOME PAGE concept JPEG for Skyline Rush.**
>
> **Assigned Git branch:** `feature/epic-home-art-monsoon-ruins` (already exists). Use its latest HEAD; do not create a new branch.
>
> **Assigned reference images:**
> - `docs/designs/new-tracks/source-concept-jpeg/monsoon-ruins/concept-view-01.jpg` (ground).
> - `docs/designs/new-tracks/source-concept-jpeg/monsoon-ruins/concept-view-02.jpg` (flight/alternate route).
> - `docs/designs/new-tracks/route-schematics/monsoon-ruins.svg` (course design, not pixel-accurate map).
>
> **Creative direction:** 巨大古代神殿、濃綠熱帶樹冠、泥地與蜿蜒 S 彎、暴雨水霧. **Flight/branch:** 瀑布旁的起飛段、跨越古石橋的空中捷徑、落地匯合處與背景分層. **Avoid:** 避免暴雨太黑讓道路不可見、巨石/枝葉阻擋前景、誤畫成環狀.
>
> **Required handoff:** **GitHub repository:** `weskao/skyline-rush`. **Only Stage 1**: the five proposed point-to-point races. Do not touch Stage 2, `develop`, `main`, PRs, deployments, or force-push.
> >
> > Read `AGENTS.md`, `CLAUDE.md`, `.claude/rules/track-showcase.md`, `docs/designs/new-tracks/visual-acceptance-gate.md`, `docs/designs/new-tracks/README.md`, and the exact **two source JPEGs** and route schematic for your map. Preserve the named landmarks, major terrain shapes, lighting/weather identity and the visual distinction between ground and flight; do not copy concept image topology literally when its map doodle looks circular. Main race is **one-way** (distinct START & FINISH, not laps).
> >
> > **File ownership:** modify only your branch's `public/track-teasers/monsoon-ruins.jpg` and `docs/designs/new-tracks/home-art/monsoon-ruins.md`. No edits to shared UI, TypeScript, locales, tests, CSS or other maps; do not merge into the shared branch. Use original generated **native high-resolution landscape JPEG** (target at least 2400 × 900, sRGB; if unavailable, state actual generated resolution and do not pretend upscaling is native detail), with no words/logos/watermarks/fake UI in the image. Keep the left third quieter for homepage text, preserve prominent road/landmark composition centre/right; readable after cropping to mobile. Aim for reasonable download bytes while maintaining fidelity. If image bytes cannot actually be written via GitHub tools, deliver the image in chat and report the block; never claim it was committed.
> >
> > Write your map art note with paths to both sources, scene palette, ground and aerial references, key landmarks, crop safety, weather/particles, final **real** pixel dimensions/size, commit SHA and any intentional deviations. Verify real GitHub blob path after committing.
>
> Final reply: link to the actual JPEG, GitHub commit URL, visual preview, generated native dimensions, file bytes and design-note URL, and note any unmet constraints.


## GPT 3 — 浮空群島 / Skyfall Archipelago

Copy this entire prompt into a separate GPT chat:

> **Implement one new high-fidelity HOME PAGE concept JPEG for Skyline Rush.**
>
> **Assigned Git branch:** `feature/epic-home-art-skyfall-archipelago` (already exists). Use its latest HEAD; do not create a new branch.
>
> **Assigned reference images:**
> - `docs/designs/new-tracks/source-concept-jpeg/skyfall-archipelago/concept-view-01.jpg` (ground).
> - `docs/designs/new-tracks/source-concept-jpeg/skyfall-archipelago/concept-view-02.jpg` (flight/alternate route).
> - `docs/designs/new-tracks/route-schematics/skyfall-archipelago.svg` (course design, not pixel-accurate map).
>
> **Creative direction:** 多層浮島、雲海、跨島可行駛石橋、遠處懸空瀑布與巨型石環. **Flight/branch:** 島與島之間可見的高空捷徑與下層陸橋雙選擇、懸崖落差及安全匯合. **Avoid:** 不要只畫一條空中光軌、不可落地的華麗場景或封閉環道.
>
> **Required handoff:** **GitHub repository:** `weskao/skyline-rush`. **Only Stage 1**: the five proposed point-to-point races. Do not touch Stage 2, `develop`, `main`, PRs, deployments, or force-push.
> >
> > Read `AGENTS.md`, `CLAUDE.md`, `.claude/rules/track-showcase.md`, `docs/designs/new-tracks/visual-acceptance-gate.md`, `docs/designs/new-tracks/README.md`, and the exact **two source JPEGs** and route schematic for your map. Preserve the named landmarks, major terrain shapes, lighting/weather identity and the visual distinction between ground and flight; do not copy concept image topology literally when its map doodle looks circular. Main race is **one-way** (distinct START & FINISH, not laps).
> >
> > **File ownership:** modify only your branch's `public/track-teasers/skyfall-archipelago.jpg` and `docs/designs/new-tracks/home-art/skyfall-archipelago.md`. No edits to shared UI, TypeScript, locales, tests, CSS or other maps; do not merge into the shared branch. Use original generated **native high-resolution landscape JPEG** (target at least 2400 × 900, sRGB; if unavailable, state actual generated resolution and do not pretend upscaling is native detail), with no words/logos/watermarks/fake UI in the image. Keep the left third quieter for homepage text, preserve prominent road/landmark composition centre/right; readable after cropping to mobile. Aim for reasonable download bytes while maintaining fidelity. If image bytes cannot actually be written via GitHub tools, deliver the image in chat and report the block; never claim it was committed.
> >
> > Write your map art note with paths to both sources, scene palette, ground and aerial references, key landmarks, crop safety, weather/particles, final **real** pixel dimensions/size, commit SHA and any intentional deviations. Verify real GitHub blob path after committing.
>
> Final reply: link to the actual JPEG, GitHub commit URL, visual preview, generated native dimensions, file bytes and design-note URL, and note any unmet constraints.


## GPT 4 — 熔火天脊 / Volcanic Crown

Copy this entire prompt into a separate GPT chat:

> **Implement one new high-fidelity HOME PAGE concept JPEG for Skyline Rush.**
>
> **Assigned Git branch:** `feature/epic-home-art-volcanic-crown` (already exists). Use its latest HEAD; do not create a new branch.
>
> **Assigned reference images:**
> - `docs/designs/new-tracks/source-concept-jpeg/volcanic-crown/concept-view-01.jpg` (ground).
> - `docs/designs/new-tracks/source-concept-jpeg/volcanic-crown/concept-view-02.jpg` (flight/alternate route).
> - `docs/designs/new-tracks/route-schematics/volcanic-crown.svg` (course design, not pixel-accurate map).
>
> **Creative direction:** 黑色玄武岩、橙紅岩漿、壯觀火山口、連續大 U 彎及熱浪. **Flight/branch:** 跨岩漿裂谷的空中分岔、火山拱門和可辨識的安全降落點. **Avoid:** 不要讓烈焰粒子蓋住道路或產生誤導性的封閉環形跑圈.
>
> **Required handoff:** **GitHub repository:** `weskao/skyline-rush`. **Only Stage 1**: the five proposed point-to-point races. Do not touch Stage 2, `develop`, `main`, PRs, deployments, or force-push.
> >
> > Read `AGENTS.md`, `CLAUDE.md`, `.claude/rules/track-showcase.md`, `docs/designs/new-tracks/visual-acceptance-gate.md`, `docs/designs/new-tracks/README.md`, and the exact **two source JPEGs** and route schematic for your map. Preserve the named landmarks, major terrain shapes, lighting/weather identity and the visual distinction between ground and flight; do not copy concept image topology literally when its map doodle looks circular. Main race is **one-way** (distinct START & FINISH, not laps).
> >
> > **File ownership:** modify only your branch's `public/track-teasers/volcanic-crown.jpg` and `docs/designs/new-tracks/home-art/volcanic-crown.md`. No edits to shared UI, TypeScript, locales, tests, CSS or other maps; do not merge into the shared branch. Use original generated **native high-resolution landscape JPEG** (target at least 2400 × 900, sRGB; if unavailable, state actual generated resolution and do not pretend upscaling is native detail), with no words/logos/watermarks/fake UI in the image. Keep the left third quieter for homepage text, preserve prominent road/landmark composition centre/right; readable after cropping to mobile. Aim for reasonable download bytes while maintaining fidelity. If image bytes cannot actually be written via GitHub tools, deliver the image in chat and report the block; never claim it was committed.
> >
> > Write your map art note with paths to both sources, scene palette, ground and aerial references, key landmarks, crop safety, weather/particles, final **real** pixel dimensions/size, commit SHA and any intentional deviations. Verify real GitHub blob path after committing.
>
> Final reply: link to the actual JPEG, GitHub commit URL, visual preview, generated native dimensions, file bytes and design-note URL, and note any unmet constraints.


## GPT 5 — 霓虹暴雨都市 / Stormline Megacity

Copy this entire prompt into a separate GPT chat:

> **Implement one new high-fidelity HOME PAGE concept JPEG for Skyline Rush.**
>
> **Assigned Git branch:** `feature/epic-home-art-stormline-megacity` (already exists). Use its latest HEAD; do not create a new branch.
>
> **Assigned reference images:**
> - `docs/designs/new-tracks/source-concept-jpeg/stormline-megacity/concept-view-01.jpg` (ground).
> - `docs/designs/new-tracks/source-concept-jpeg/stormline-megacity/concept-view-02.jpg` (flight/alternate route).
> - `docs/designs/new-tracks/route-schematics/stormline-megacity.svg` (course design, not pixel-accurate map).
>
> **Creative direction:** 超高密度未來城市、霓虹夜雨、濕潤路面、巨型高架立體交流道. **Flight/branch:** 街道與空中高架/樓宇間捷徑同畫面，落差明確，具有可理解的分岔/匯合. **Avoid:** 避免光暈與模糊過強、超寬招牌擋住路或把主要路線改成環道.
>
> **Required handoff:** **GitHub repository:** `weskao/skyline-rush`. **Only Stage 1**: the five proposed point-to-point races. Do not touch Stage 2, `develop`, `main`, PRs, deployments, or force-push.
> >
> > Read `AGENTS.md`, `CLAUDE.md`, `.claude/rules/track-showcase.md`, `docs/designs/new-tracks/visual-acceptance-gate.md`, `docs/designs/new-tracks/README.md`, and the exact **two source JPEGs** and route schematic for your map. Preserve the named landmarks, major terrain shapes, lighting/weather identity and the visual distinction between ground and flight; do not copy concept image topology literally when its map doodle looks circular. Main race is **one-way** (distinct START & FINISH, not laps).
> >
> > **File ownership:** modify only your branch's `public/track-teasers/stormline-megacity.jpg` and `docs/designs/new-tracks/home-art/stormline-megacity.md`. No edits to shared UI, TypeScript, locales, tests, CSS or other maps; do not merge into the shared branch. Use original generated **native high-resolution landscape JPEG** (target at least 2400 × 900, sRGB; if unavailable, state actual generated resolution and do not pretend upscaling is native detail), with no words/logos/watermarks/fake UI in the image. Keep the left third quieter for homepage text, preserve prominent road/landmark composition centre/right; readable after cropping to mobile. Aim for reasonable download bytes while maintaining fidelity. If image bytes cannot actually be written via GitHub tools, deliver the image in chat and report the block; never claim it was committed.
> >
> > Write your map art note with paths to both sources, scene palette, ground and aerial references, key landmarks, crop safety, weather/particles, final **real** pixel dimensions/size, commit SHA and any intentional deviations. Verify real GitHub blob path after committing.
>
> Final reply: link to the actual JPEG, GitHub commit URL, visual preview, generated native dimensions, file bytes and design-note URL, and note any unmet constraints.


## GPT 6 — Shared home UI, localization, TDD, CI, five-art integration

Copy this entire prompt into a **sixth separate** GPT chat:

> **Continue implementing the existing Skyline Rush homepage functionality, DO NOT only plan it.**
>
> **Repository:** `weskao/skyline-rush`.
>
> **Only editable branch:** `feature/epic-multiroute-longform-tracks`. Read the **current branch HEAD** (as of initial handoff `4d09c51cd14c8822e213547ec23abdad84ef6c71`, may advance) and read `AGENTS.md`, `CLAUDE.md`, `docs/regression-first-workflow.md`, `TODO.md`, and `docs/superpowers/specs/2026-11-03-stage1-coming-soon-home-preview-design.md`. Follow SDD → BDD → Red/Green/Refactor TDD. Existing `src/upcoming-tracks.ts`, `src/App.vue`, `src/race-select-ui.ts`, `src/locales/ui.ts`, `src/style.css`, `tests/upcoming-tracks.test.js`, `tests/upcoming-home-browser.spec.js` and `tests/home-track-focus-browser.spec.js` contain a **first implementation**; inspect and improve, do not rebuild from scratch.
>
> **Feature scope:** Show exactly **five Stage 1** future tracks: Dune Tempest, Monsoon Ruins, Skyfall Archipelago, Volcanic Crown, Stormline Megacity. **None of the five Stage 2 proposals appear on the homepage.** Keep all existing 10 playable sprint maps and their records, unlocks, Daily/Cup/ghost unchanged.
>
> **Home UI contract:** Each future card shows its own original JPEG and route preview, is selectable via click/touch/keyboard (including keyboard carousel navigation), has visual `COMING SOON / 即將推出` status and can show localized info; no playable `RACE_TRACKS` entry, no `createRace`, saved-unlock/Enter/start/pad/swipe circumventing disabled Start. On future selection show a visually compelling homepage hero, not a fabricated live Three.js race. Clear future selection correctly on real map, race mode, Daily, and return-to-home. Hide or label route/ghost/rival HUD details that refer to the previous playable track.
>
> **CTA:** On `#start-button`, show `Start race / 開始比賽` for playable/eligible; `LOCKED / 未解鎖` for locked; `COMING SOON / 即將推出` for proposed. Disabled for unfinished maps, including Enter shortcuts. Preserve fixed widths (236px desktop, 210px mobile, 190px short landscape) with no width jump on locale or selection, and accessible screen reader labels. Existing game only supports English and Traditional Chinese; preserve supported locale parity, don't claim other locales.
>
> **Artwork integration:** Five independent art branches (each owned exclusively by its GPT chat) will provide **one original JPEG and one per-track art note**: `feature/epic-home-art-{dune-tempest,monsoon-ruins,skyfall-archipelago,volcanic-crown,stormline-megacity}`. **DO NOT modify or merge into these five branches.** When an art branch has a verified image and review, copy **only** that branch's `public/track-teasers/<id>.jpg` and `docs/designs/new-tracks/home-art/<id>.md` Git blobs to this shared branch. Never merge the art branch's full history or overwrite main UI files. If its art is not ready, retain the already-committed fallback JPEG and mark it pending.
>
> **Verification:** Inspect current GitHub CI (initial full-regression run `41481384038` may now be stale). Add failing tests first for defects, see them fail, fix, and rerun. Commands: `npm test`, `npm run typecheck`, `npm run build`, `npm run test:layout`, `make verify`; inspect browser Playwright tests for desktop 1440×900, phone portrait 390×844 and compact landscape. Verify both locales and no content overlap or unexpected CTA width changes, Reduced Motion, keyboard arrow/Enter, 10 original maps and five future maps. Record any environment limits; never claim test/visual PASS if not run. Require exact-HEAD complete CI and record run URL, status, SHA. Add actual results in `TODO.md`, spec and screenshot references.
>
> **Safety:** No `main` or `develop` writes, PRs, force push, deploy or automatic merge to `develop`. Do not wait indefinitely for image branches; deliver and verify the independent shared UI first. Report exact commits and unresolved items.


## Acceptance / final integrator checklist

- [ ] Five art branches contain their **new** native-resolution homepage JPEGs, with logged pixel dimensions, high-quality visual comparison to the two original references, committed GitHub blob URLs, and per-map Markdown art direction.
- [ ] All five future tracks are selectable with localized Coming Soon status and JPEG/route visual preview; **no other** future tracks appear, and none can start.
- [ ] Existing ten maps remain playable or locked as before, and home navigation/keyboard/mobile carousel works.
- [ ] Start CTA is localized and width-invariant; it cannot be overridden by `applyI18n` or bypassed with `Enter`.
- [ ] Unit/typecheck/build/browser/CI and real desktop/mobile visual evidence are recorded against the **same current HEAD**; do not guess green.
- [ ] Integrate artwork selectively into the shared branch, maintain `develop` / `main` untouched.

