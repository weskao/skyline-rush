# TODO — Gameplay depth design

## Main integration follow-up (2026-10-28)

- [x] Merge main `ebd30e526f54aba08a46c9c7c3f2fcdc784b710f` (same file tree as `f9c2cb1`, including `d71fc65`) into this independent branch and resolve conflicts without dropping new main camera/AIRFLOW, lighting or haptic behavior. Preserve feature-specific behavior, reviewed CSS contracts and lower renderer size ceilings. The focused renderer/camera/haptics checks pass (12 tests). The follow-up main commits change only CSS-test metadata/comments; runtime source is identical, and all DOM/style assertions are retained.
- [ ] Repeat the complete local gate and inspect exact resulting feature-HEAD GitHub `quality-gate` after this integration; earlier SHA receipts below remain historical. Real-device and remaining manual gates stay open.

## Practice item rules and activation feedback (2026-10-27)

Branch: `feature/practice-item-rules`, independent of Cup, Custom presentation and the shared checkout's audio/keymap refactor; latest docs-only main `3a5c25a` integrated.

- [x] ITEM-11 implementation: explicit Off / Classic / Active / All selection for Custom and Free Drive; legacy configs without `itemRules` retain their signatures and original supply-only `items: false` behavior. All ten tracks covered; strict conflicting requests rejected; recent setups retain new rules.
- [x] Existing ITEM-01–05 feedback slice: actual mystery-ring pickup → held silhouette → Q/touch activation → bounded cooldown/active status, English/zh-TW, one-shot pickup/ready cues using the existing muted mixer. Main bootstrap shrinks seven lines; cached HUD writes remain idempotent. This does not complete every future ITEM-12 visual effect.
- [x] Observed RED: Off still spawned supplies, unknown new rules collapsed recent setups, and Chrome lacked the rule selector. Follow-up RED caught a restored old setup retaining `activeItems: true` and filtered groups falsely awarding PERFECT LINE/NITRO; shared fixes preserve old-setup defaults and original ring index/group size.
- [x] Focused proof: rule/config/mode tests 40 passed; final item/UI/activation tests 11 passed; complete Node suite 699 passed, 0 failed, 3 emulator-dependent skipped. Strict TS/Vue/JS checks and locked production build passed. Browser mode/HUD/parity suite 31/31 passed; final changed-rule desktop/touch/locale/recent-restore rerun 4/4 passed. Actual WebGL captures and logs: `artifacts/item-rules/`.
- [x] Complete merged local `make verify` on code HEAD `6581403`: strict TS/Vue/legacy checks, 806 Node passed / 3 emulator-dependent skipped, locked build, 494 browser passed / 2 skipped and 72 World Tour passed; exit 0. Receipt: `artifacts/item-rules/make-verify-main72466c3-final.log`. Original-resolution desktop/touch item and bonus flows also pass.
- [x] Verify exact code commit `e4c4c1e`: unit/typecheck, all 8 browser shards, Cloud Save, World Tour and `quality-gate` succeed on https://github.com/weskao/skyline-rush/actions/runs/40633787236 . This records the verified code revision; the following documentation-only HEAD is checked separately before reporting final branch status.
- [ ] Physical-device/audio/perception acceptance; broader ITEM-03/12 visuals remain open.
- [x] Main integration (2026-10-28): preserve latest main `7cbdbe5`, including Phase 1–4 and the split bootstrap; move this branch's selection/reset changes into `race-select-ui.ts` and item HUD updates into the typed mode-panel callback. Preserve all new size ceilings: `game.js` remains 827 lines and `main.js` shrinks to 687. Fresh strict TS/Vue/JS checks, 17 focused Node checks and five real desktop/touch item browser cases pass. The historical 10/27 measurements above remain historical receipts, not proof for the merged source.
- [x] Resolve the two inherited unit-gate failures through the shared main regression repair (Phase 4 timeout scaling and perf-overlay initialization); after merging main `2cd52d4`, the complete Node suite passes 804 / 0 failed / 3 emulator-dependent skipped. Main `72466c3` is now integrated; complete resulting `make verify` and latest-HEAD CI remain separate pending gates.

## Related item expansion (2026-10-28)

- [x] RED → GREEN for bounded speed/air/recovery gates at unchanged authored positions on all ten tracks; collision mitigation consumes once and preserves official collision counts. EMP affects opponents within 30 m for 1.5 s and safely converts to Magnet in solo use.
- [x] Opt-in Stunt/Checkpoint five-second ×2 score gates, bounded nonstacking durations, independent rules signatures, paused timers and equal payouts at 30/60/120 physics steps. Classic defaults and old saved signatures remain unchanged.
- [x] RED → GREEN for missing gate materials and HUD warnings. Reuse five existing warmed material variants and seven-mesh pool; cache HUD nodes, announce gate identity/distance and pickup once, show EMP silhouette/cooldown, and retain separate music/SFX settings. Relevant Node checks: 31 passed; browser item and bonus flows: 7 passed on desktop/touch, with English/zh-TW switching and real Q/tap activation. Screenshots inspected in `artifacts/item-rules/`.
- [ ] Physical iOS/Android/audio/perception acceptance and broader ITEM-12 visual effects. Code CI and the complete merged local gate are recorded above.

## Shared continuation regression gates (2026-10-28)

- [x] AIRFLOW locale-change RED → GREEN: a real 390×844 / 59px safe-area test measured the zh-TW card bottom at 306px (limit 303.84px) because CJK label sizes applied while live values were still English. A deterministic real-menu change-event regression fails on the old code, then passes after synchronously relabeling three cached message keys; all 30 camera/telemetry browser tests pass without changing CSS, font size or assertions. Logs: `artifacts/regression-gates/airflow-locale-{red,green}.log`.
- [ ] Complete caller-branch full gates and exact-HEAD CI after this shared repair. Earlier Custom f9 full-gate success and Cup/Items failures remain historical; the Cup run interrupted during a merge is not a passing receipt.

- [x] Integrate main `72466c3`, preserving release-video behavior and both main-route/forbidden-route assertions plus exact Spiral decoration counts. Earlier shared repair `c9db4a9` passed all required GitHub jobs and `quality-gate`: https://github.com/weskao/skyline-rush/actions/runs/40576521837 . This does not certify later feature HEADs.
- [x] World Tour worktree isolation RED → GREEN: its fixture server ignored the existing `PLAYWRIGHT_PORT` override and always used 5183. Both browser/server now use the validated override; the default remains 5183 and invalid/shell values fail before server launch. Seven timeout/port regression tests pass; logs in `artifacts/regression-gates/world-tour-port-{red,green}.log`.
- [x] Shared result layout RED → GREEN on the affected caller branches: five-lap Circuit and billion-metre Endless phone results overflowed their panels. Commit `3826f3a` adds only `flex-wrap` to the existing shared stats container, preserving spacing/font sizes; actual cell-bounds assertions pass in 8 Circuit and 2 Endless original-resolution flows. Caller branches are repeating the complete gate after integration.
- [ ] Complete each independent feature's resulting full local gate and exact-HEAD CI. Superseded/interrupted runs remain historical receipts. The initial batch push was rejected; automatic review later accepted same-name feature pushes after verifying the PUBLIC origin, mandated workflow step 6 and the owner's main-first condition. Current-HEAD CI remains separate; main merge, PR and deployment still require explicit authorization.

## Phase 4 — First five tracks: visuals, road geometry, minimap (feature/phase4-first-five-track-polish)

**Contract:** Phase 1 flight/combo and records, Phase 2 Coast and perf load counters, and Phase 3 Auto/30/60 pacing stay intact. Start from integrated main `b0d839b`. Avoid changing physics/topology or route length without a versioned history/Ghost migration.

- [x] Inspect latest main, CLAUDE.md, road/camera/route-map modules and their regression tests; create a new feature branch from latest main.
- [ ] RED: deterministic track-theme scenery bounds, geometry/road clearance, shared-asset disposal, and cached minimap upper-ramp overlay tests.
- [x] GREEN implementation committed: bounded InstancedMesh roadside detail for Neon, Canyon and Aurora, preserving Coast's Phase 2 benchmark and Sky Spiral's existing authored road. Await CI verification.
- [x] Fix tier-based scenic streaming: Low (8), Medium (16), High (24) maintain contiguous near-road sectors after a quality change; ring-buffer updates only moved slots.
- [x] Upgrade roadside visual identity with one additional batched, low-poly accent layer per track: Neon illuminated façades, Canyon sandstone strata, Aurora snowy treetops. Preserve three draw submissions per visible track and explicitly dispose owned meshes/materials.
- [x] Cache static route-map polyline and Sky Spiral elevated arc; add a canonical-centreline direction chevron without per-frame SVG reconstruction.
- [x] Reduce Sky Spiral road geometry and InstancedMesh uploads to 10 m sector boundaries. Camera-relative road translation continues every frame, with deterministic parity and teleport regression tests added.
- [x] Resolve typed route sample vs. projected marker contracts in `route-map.ts` to protect strict TypeScript checks.
- [x] Leave legacy Coast visuals, original road topology/collision/record IDs, and Phase 3 Auto/30/60 controls unchanged by this visual/streaming pass.
- [ ] Verify above newly added contract tests and browser snapshots on the exact final feature SHA; test-first RED commits were recorded but cancelled Actions runs are not a verified RED result.
- [x] GREEN implementation committed: Sky Spiral's elevated half-turn overlay uses the cached SVG centreline; markers remain on existing route. Await CI verification.
- [x] Extract the existing unbounded classic-road centreline as a single typed source for Three.js, collision-space projection and route overview, preserving the exact sine curve and record/Ghost compatibility. CI pending.
- [x] Adjust road material finish (Neon rain-slick, Canyon dusty, Aurora frosted, Sky Spiral diffuse) without altering mesh geometry, collision, physics or Coast's Phase 2 palette. New contract tests committed; CI pending.
- [ ] Preserve road shape, 60 Hz collision geometry, mode layouts, record/Ghost compatibility and Phase 3 renderer settings.
- [x] Add browser capture/regression cases for Coast, Neon, Canyon, Aurora and Sky Spiral at desktop, mobile portrait and landscape, exercising preview, live minimap, saved 30 FPS and stable SVG identity; actual screenshots and CI pass remain pending.
- [ ] Obtain real-WebGL screenshots of all five tracks in showroom and during play at desktop, mobile portrait/landscape, English and zh-TW; inspect camera occlusion, accessibility and layout.
- [ ] Capture baseline/feature p50/p95 FPS, draw calls, triangles, memory when available; Android/iPhone thermal checks remain unverified unless genuine physical device results exist.
- [ ] Run complete TypeScript typecheck, unit, build, all 8 browser shards, World Tour, Cloud Save and exact-HEAD quality-gate before declaring merge-ready.
- [x] Document shared Road/Minimap source, 60 Hz simulation, GPU budget, and saved-history/ghost versioning requirements in CLAUDE.md to prevent regression.
- [ ] Evaluate road geometry proposals separately with track-path/collision parity and versioned saved times/Ghosts before changing any existing centreline or track length.

## Phase 2 Coast visual-quality implementation — evidence ledger (2026-10-27)

Branch: `feature/phase2-coast-visual-quality`. Scope: Coast art pass only; no Phase 1/3 gameplay or FPS controls.

- [x] Inspect latest main, TODO, CLAUDE.md, renderer/lighting/scene/VFX structure; create the Phase 2 branch from `3a5c25a`. Review and branch creation confirmed via GitHub.
- [x] Commit a test-first Coast scene contract and real-WebGL browser capture specification (`9c5679`). Historical RED test execution is **not verified**; test-only CI was interrupted by a follow-on push.
- [x] Commit Coast material/palette changes, typed pooled coastline scenery, tier-bounded instancing and QA render-load instrumentation (`bcff252`). These checkboxes indicate files committed, not runtime acceptance.
- [x] The new RED tests on `b93f31f` failed for the intended reasons on [CI 40532546923](https://github.com/weskao/skyline-rush/actions/runs/40532546923): palette module missing, perf load metadata absent and `world.js` past its new line ceiling.
- [x] The corresponding GREEN `04edea5` [unit/typecheck job](https://github.com/weskao/skyline-rush/actions/runs/40533007218) reported success; full-browser/Coast capture/Cloud Save are separate gates.
- [x] Merge refactored main `325fe9e` as `71a60cb`, then integrate later Phase 1 main `3788ca3` as `a55f7cb` without rewriting Phase 1. The GitHub comparison showed Behind 0 after the second merge.
- [ ] Obtain `BEFORE` images from the exact integrated main SHA `3788ca3` and `AFTER` from feature WebGL. These are distinct from a pre-race vs in-race comparison. Coast captures are required in Phase 2's quality-gate, and screenshot artifacts must be saved before a later Playwright suite clears them.
- [ ] Verify deterministic RED `tests/coast-visuals.test.js` on a test-only commit and GREEN on the implementation, plus strict TS and unit tests.
- [ ] Inspect actual Before screenshots taken from unchanged main and After screenshots from the running Coast WebGL renderer across 1440×900 / 390×844 / 320×740 / 844×390; verify cockpit and showroom camera modes, reduced motion and both locales.
- [ ] Report numerical before/after `?perf` p50/p95/FPS, draw calls, and triangles for identical conditions. CI SwiftShader is software-rendered, not physical device evidence.
- [ ] Validate manual Android Chrome / iPhone Safari and thermals when real devices are available.
- [x] Complete CI for the final Phase 2 integration commit `d0c889f`: [run 40543815702](https://github.com/weskao/skyline-rush/actions/runs/40543815702) reports unit/typecheck, all 8 browser shards, Coast visual-evidence, World Tour, Cloud Save and `quality-gate` successful.
- [x] Integrate Phase 2 into `main` without PR; integrated history includes Phase 2 commit `d0c889f` and the successful full Phase 2 CI noted above.

**Audio assessment:** Purely cosmetic Coast changes use existing Web Audio feedback; no new cues warranted.

## Delivered gameplay and presentation phases (2026-10-27)

**Checklist meaning:** The three milestones below mark feature delivery and integration into `main`, not proof that every physical-device or before/after performance acceptance step is complete. Keep such evidence gates unchecked in their phase ledgers below.

- [x] **Phase 1 — Flight and arcade gameplay feel:** Extend FLY, improve DRIFT → NITRO → FLY → clean-landing chain and localized feedback while retaining physics, records and mode rules. Implemented in `feature/phase1-flight-combo-gamefeel`, merged into `main` as `3788ca3`. Full [CI #40506587701](https://github.com/weskao/skyline-rush/actions/runs/40506587701) passed, including unit, 8 browser shards, Cloud Save, World Tour and quality-gate.
- [x] **Phase 2 — Coast visual-quality benchmark:** Deliver Coast scene/material/lighting improvements with tier-bounded scenery and render-work diagnostics, preserving gameplay. Merged into `main`; complete [CI #40543815702](https://github.com/weskao/skyline-rush/actions/runs/40543815702) passed, including Coast visual-evidence job, 8 browser shards and quality-gate. Manual screenshot review, same-device performance comparison and physical-device thermals remain separate unchecked acceptance items.
- [x] **Phase 3 — FPS and adaptive performance:** Deliver Auto / 30 / 60 FPS UI, persisted settings, adaptive render scale, and fixed 60 Hz gameplay. Merged into `main` via `b0d839b`. The feature branch's [CI #40543440614](https://github.com/weskao/skyline-rush/actions/runs/40543440614) did **not** pass the full quality-gate; CI and physical-device acceptance remain unchecked below.

## Module split: `main.js` and `audio.js` by responsibility (2026-10-27, `refactor/split-main-audio`)

**Status:** implemented as TDD slices (each new test failed against the previous tree first); local gates and full CI green; physical device check pending.

- [x] `audio.js` 403 → 243 lines: songs in `music-tracks.ts`, race→cue detection in `race-audio-events.ts` (pure, no per-frame allocation).
- [x] `main.js` 1,881 → 688 lines: cloud save, key map, touch controls, VFX/motion/notice, session progress and ghosts, race settlement, result screens, HUD, race selection, History dialog, photo mode, pressed buttons and `?perf` strip each moved to their own TypeScript module (map in `docs/refactor-architecture-audit.md`).
- [x] Remaining `main.js` (bootstrap, controller wiring, race lifecycle, phase orchestrator, frame loop) is the documented exception, held by a ratcheting ceiling.
- [x] Prevention: `tests/module-size.test.js` (400-line limit, ceilings only go down), `tests/legacy-js-names.test.js` (syntax and unresolved names in `src/**/*.js`), `.claude/rules/module-size.md`, `CLAUDE.md` section.
- [x] Bug found on the way: dragging an audio slider threw `showChannel is not defined` on every step and froze its label; fixed in `8dc75b1` with a browser RED → GREEN test.
- [x] Local evidence at `8c4ac0f`: `make verify` exit 0 (typecheck; 748 unit pass, 0 fail, 3 skipped; browser 450/450; World Tour 72/72); Firebase emulator suite 15/15 + rules 3/3 after the cloud and progress slices; `npm run test:layout` 30 + 42 after race selection.
- [x] HUD perf A/B (`make perf BASE=130a7e0`, 6× CPU throttle, 3 × 20 s): p50 16.7 / p95 16.7 ms / 59.9 fps vs baseline p50 16.7 / p95 16.8 ms / 60 fps. Vsync-capped; no sub-frame comparison.
- [x] Independent read-only review of every slice against `bc2838c` found no behavior divergence.
- [x] Full GitHub CI on `423b445` (workflow_dispatch `full_regression=true`, run 40518765394): unit, cloud-save, browser shards 1–8, world-tour-mid-race and quality-gate all success. The push run 40517690494 used the focused refactor gate.
- [ ] Physical iPhone Safari / Android Chrome pass (touch pad, tilt, audio slider drag, results/pause clickability).

## Phase 3 — FPS and adaptive performance (feature/phase3-adaptive-fps)

- [x] Merge current `main` into this feature branch, preserving main's Vue/TypeScript module extraction and RED tests; merge commit `b370169`.
- [x] Implement an isolated TypeScript FPS pacer supporting Auto, 30 FPS and 60 FPS (120 FPS withheld until real device/refresh capability validation).
- [x] Add local-only FPS preference storage with invalid-value fallback, bilingual VFX-panel controls, and independent Quality selection.
- [x] Keep fixed 60 Hz simulation and ghost sampling outside the rendering limit, and accumulate VFX elapsed time across skipped renders.
- [x] Limit adaptive rendering cost using the existing Three.js DPR/composer path without modifying saved graphics quality.
- [x] Add deterministic unit tests for pacing/auto policy and engine-state parity, plus browser tests for save/restore, i18n and malformed preferences.
- [ ] Confirm RED failure on the test-first commit from CI logs; record evidence explicitly before treating historical RED as verified.
- [ ] Confirm TypeScript/JS typecheck, unit tests, production build, all browser shards, World Tour, Cloud Save and exact-HEAD CI success.
- [ ] Capture paired baseline/feature frame p50/p95 and render-work timings in the same desktop/mobile environment. No before/after performance claims until measured.
- [ ] Validate Android Chrome and iPhone Safari on real devices, including thermals, input latency, 120 Hz capability and long-session stability.
- [x] Merge into latest main at owner's request without waiting for final CI; remaining verification gates stay open.

**Scope:** Auto uses sustained measured CPU-side render submission time; browser/driver GPU queues and device temperature require real-world verification. A 120 FPS option is deliberately unavailable until those checks justify it. `?perf` reports actual presented frame intervals, not merely the rate of rAF callbacks. Manual FPS never silently changes itself.

## FPS feature request — delivered in Phase 3 (2026-10-27)

**Status:** The approved Auto / 30 / 60 FPS scope is implemented and merged. This denotes functionality delivered, **not** an all-green Phase 3 CI or verified device-temperature improvement.

- [x] **Manual FPS selection:** User-selectable 30 FPS and 60 FPS; stored independently of visual Quality, with stable 60 Hz gameplay physics. The 120 FPS option is deliberately not available until separately validated.
- [x] **Automatic device-performance adaptation:** Auto adjusts render pacing/scale using sustained render-submission measurements; it respects a user's explicit manual FPS choice.
- [ ] **Future device acceptance:** Independently verify 120 Hz support, input latency, before/after FPS/p50/p95 and thermals on physical Android/iPhone devices before adding further FPS options or making temperature claims.

## Player feedback: gameplay excitement and visual quality (2026-10-27)

**Status:** The following are player-reported opinions and requests, not confirmed defects or approved implementation plans. Preserve them for evaluation without treating subjective comparisons as verified facts.

- [ ] **Flight duration:** Players report that the available FLY duration is too short.
- [ ] **Momentum and combos:** Players feel that the game is not exciting enough and does not offer enough opportunities for sustained acceleration, continuous rushing, or chaining varied moves and combos.
- [ ] **Visual polish:** Players want more aesthetically appealing and refined graphics; the earlier tracks are especially perceived as rough or unfinished.
- [ ] **Classic racing-game reference:** Consider studying or taking inspiration from classic racing games through [morluto/rea](https://github.com/morluto/rea), including gameplay and visual design. This is a reference suggestion only, not a decision to reproduce any game.
- [ ] **Weak engagement:** One player felt they could barely motivate themselves to finish and implied the experience lacked appeal to someone who regularly plays games.
- [ ] **Poor first impression and fun factor:** Players say the current visuals do not make them want to try the game and compare its entertainment value unfavorably with Mario Kart and KartRider.
- [ ] **Perceived amateur quality:** Players liken the presentation to an old university student project and describe the artwork as overly simplistic or unpolished.
- [ ] **Preference for realism:** Some players would prefer the visual realism associated with AAA racing games.

**Decision gate (future work only):**
- [ ] Review the feedback, propose possible improvements that fit Skyline Rush, and discuss the trade-offs and preferences through `AskUserQuestion` **before** deciding what to implement.
- [ ] Keep implementation scope and acceptance criteria undecided until that discussion is complete. Do not treat recording these comments as approval to change gameplay, art direction, or rendering.

## BUG: Tutorial trigger flow needs redesign — to be discussed (2026-10-26)

- [ ] **Symptom (as reported):** the tutorial only appears when the player selects the **first track** *and* has never completed or skipped the tutorial before. On any other track, or after a prior run/skip, it never shows up, so the entry point is hard to discover and depends on which track happens to be selected.
- [ ] **Current behavior (from code, unverified at runtime):** `start()` in `src/main.js` (~L1238) sends the player into the practice only when `!guideSeen`, setting `raceAfterTutorial = true`; `closeGuide()` and completion (`skyline-rush-tutorial-completed`, ~L2210) mark it as seen. Check how `guideSeen` interacts with track selection before assuming a cause.
- [ ] **Open questions to settle before any change:**
  - Should the tutorial be offered on first Start regardless of track, or be an explicit, always-visible entry (home button / Controls / first-run prompt)?
  - Should "skipped" and "completed" be tracked separately, and may a skipped tutorial be offered again later?
  - Which modes count (Free Drive, Daily, Cup, Time Attack, locked-track edge cases), and what happens when storage is unavailable (currently once per page)?
  - How should it interact with cloud save / a fresh device (currently local storage only)?
- [ ] After the flow is agreed: follow the regression-first workflow (RED → GREEN), cover desktop and mobile in en + zh-TW, and keep the tutorial isolated from records, unlocks, Ghost and Daily. Decide whether any new prompt needs an audio cue (UI/UX audio assessment).

## Mobile README media (2026-10-26)

- [x] Capture the real Coast game with a fresh demo profile in Chrome touch emulation: portrait 390×844 and landscape 844×390, English and Traditional Chinese. All four runs lift off using touch FLY and land after release; no page or console errors, no horizontal overflow.
- [x] Review four screenshots and a video contact sheet; add localized portrait-home and landscape-flight JPEGs plus a shared 13.125-second portrait GIF/MP4 to both READMEs. `imgmin` reduces the screenshot set from 1,087,024 to 197,454 bytes; `vidpress` reduces the MP4 from 1,331,650 to 1,214,410 bytes.
- [x] Check README synchronization, local media references, JPEG/GIF decoding, MP4 decoding and the documentation diff. Capture assertions verify visible FLY bounds, lift-off and landing in both orientations/locales.
- Documentation/media only: gameplay source is unchanged, so test-first RED and the full `make verify` gameplay matrix are not applicable to this change. Commit/push and exact-commit CI receipts are reported separately; no release or deployment is requested.
- [ ] Physical iOS/Android hardware, Safari and phone performance remain untested by these captures. GIF/MP4 are silent browser recordings.

## Development pause checkpoint — before Vue + TypeScript refactor (2026-10-25)

**Stop point:** complete the focused MODE-06 / 9G Championship Cup *data-integrity hardening* and hand off the remaining roadmap to a future Vue 3 + TypeScript architecture refactor. This is not the completion of the entire Cup UX or all TODOs. Do not start further modes, JavaScript-to-TypeScript migration, Vue-panel extraction, or a broad UI rewrite on this branch.

- [x] Merge `main` `f36c3ce` into `feature/todo-nonfirebase-20261025` via two-parent merge `df46d69`; preserve latest upstream work, HUD optimization and browser regressions.
- [x] Confirm prior HUD regression CI `40162448892` on `acbe5c2`: unit, 8 browser shards, cloud-save, World Tour and quality-gate passed. This does **not** provide a measured before/after HUD p50/p95 or historical RED.
- [x] Cup RED #1: add malformed saved/in-progress heat regression in `558d46f` and observe the expected unit failure in Actions `40175029652` (`Missing expected exception`).
- [x] Cup GREEN #1: validate completed heat snapshots before advancing or calculating standings in `51b52b6`; Actions `40175210037` unit: 576 passed, 0 failed, 3 skipped.
- [x] Cup RED #2: cover `cupComplete` / `cupTotalTime` in `afe1c88`; observed expected unit failure in Actions `40175367171`.
- [x] Cup implementation #2: extend the same standings validation to the completion and total-time readers in `754af46` without changing gameplay, UI, audio or stored formats. Unit job succeeded on Actions `40175527138`.
- [ ] Confirm all required jobs, including 8 browser shards, cloud-save, World Tour and `quality-gate`, succeed for the final feature HEAD. Code CI: https://github.com/weskao/skyline-rush/actions/runs/40175527138 ; a documentation commit starts a new exact-HEAD CI.
- [ ] Existing open items stay open: Cup saved mid-session recovery / quit-resume UX, real physical-device evidence, comparative HUD p50/p95, remaining MODE/UX/ENV/ITEM work, and all Firebase/Gamepad work.
- [ ] **Future separate project phase:** plan and implement the Vue + TypeScript centered refactor with component boundaries, typed simulation adapters, migration tests and feature parity. Do not convert the current large plain-JS codebase piecemeal merely to close this old `checkJs` TODO.

**Handoff:** stop after this bounded Cup data-integrity checkpoint. Do not merge into `main`, deploy or start unrelated features without a new explicit instruction. Notion progress: https://app.notion.com/p/4041a2df84a781638fa0fc182d8e05fb.
## Non-Firebase / non-Gamepad continuation (2026-10-25)

Branch: `feature/todo-nonfirebase-20261025` from `main` `f53bf0fc`. Evidence: [Notion stage 20](https://app.notion.com/p/4041a2df84a781638fa0fc182d8e05fb) and [feature CI](https://github.com/weskao/skyline-rush/actions?query=branch%3Afeature%2Ftodo-nonfirebase-20261025).

- [x] Audit the current main TODO and Notion stage history, keep existing completed features intact, and isolate this work on a new branch.
- [x] Commit desktop/mobile HUD DOM regression test source *before* the code change (`928bab8`); browser RED observation remains unverified without a completed run.
- [x] Commit an initial targeted fix: cache 16 repeated per-frame HUD element queries and skip 4 identical static text writes (`630b2ba`). This records code committed, **not** verified completion of Step 1 below.
- [x] Merge latest `main` (`94c44a3`) into this branch with a two-parent commit `5807225`; verify `behind 0`, preserving both recent World Tour fixes and branch HUD changes.
- [x] Commit follow-up browser tests for redundant racing status/label writes (`d34a9ab`) before its minimal optimization (`e5b0299`): `race-status`, `speed-caption`, and `countdown-label` only update when their text changes. TDD RED is **not observed**; test-only workflow was interrupted by newer pushes, so Step 1 remains open.
- [ ] Obtain observable RED on the pre-fix commit (test failure caused by unwanted HUD queries/writes), then a GREEN browser run on the fix commit, including desktop 1440×900 and touch 390×844.
- [x] Measure comparable before/after HUD CPU cost / frame p50,p95 with a running browser, include real values rather than assumed speedup. Done 2026-10-27: desktop GPU, throttled desktop CPU and a physical Galaxy A52 (`docs/verification.md` perf table).
- [x] Run `make verify`, `npm run test:layout`, and check the exact HEAD `quality-gate`; fix failures before ticking Step 1 as complete. Full CI #40489569625 on `a926b24` (includes `test:layout`) and local `make verify` passed; see Step 5.
- [ ] Continue the remaining non-Firebase / non-Gamepad tasks in this TODO after closing the verification gates. Preserve real-device acceptance as manual pending.

Firebase and Gamepad are explicitly excluded. Do not retick historical requirements or claim that a pushed commit is a passed test.


## Home version footer alignment (2026-10-25)

- [x] RED: the real Chrome regression observed a 2.5px center difference in zh-TW at 320px. Put the version inside the shared footer grid with centered alignment; retain the 44px What's New button and tablet access. No audio change is needed for static alignment.
- [x] GREEN: en/zh-TW at 320px/390px portrait, 844px landscape and 1440px desktop align within 1px and the version opens What's New through real clicks. The iOS safe-area regression passes. Real WebGL screenshots are in `playwright-report/footer-alignment/green/`.
- [ ] Finish `make verify` and `npm run test:layout`; receipts are in `playwright-report/footer-alignment/`. The first layout run hit a transient preview HTTP failure while another build rewrote the shared `dist/`; rerun sequentially.
- [ ] Exact-commit GitHub CI `quality-gate` and physical-device/Safari acceptance remain separate gates.

## CI regression: side-view showroom size measurement (2026-10-25)

- [x] Trace feature CI run 40157117052: all 10 AIRFLOW/hovering World Tour checks fail on the left camera's near-zero `screenWidth`; unit, eight browser shards and cloud-save pass.
- [x] RED: the unchanged `taipei: AIRFLOW showcase is not occluded` browser regression fails locally with width `2.476533666182568e-17` against the unchanged `> .035` size requirement.
- [x] Fix the shared QA projection in `inspectShowcase`: project the actual body mesh vertices instead of two axle endpoints that overlap in a side view. This only runs when QA requests inspection; camera, scenery, physics and audio need no change.
- [x] GREEN: the complete World Tour showcase browser file passes 37/37, including all five tracks, both AIRFLOW states and six angles with existing size/occlusion assertions unchanged. Real WebGL screenshots are preserved in `playwright-report/ci-showcase-width/green/`.
- [x] Unit tests: 575 passed, 3 skipped; production build and production-lock assertion pass. The initial full gate stopped because another process owned port 5178; rerun `make verify` with a free `PLAYWRIGHT_PORT` without stopping that process.
- [x] Full `make verify`: 575 unit tests passed / 3 skipped, production build, 422 browser tests and 42 World Tour tests passed. Log: `playwright-report/ci-showcase-width/make-verify.log`.
- [x] Inspect exact-commit main run 40161135561 on `94c44a3`: World Tour, unit, cloud-save and seven browser shards pass; shard 6 fails only on the trackpad handoff below. The aggregate gate is red, so release remains blocked.

## CI regression: trackpad snapshot handoff under delayed input (2026-10-25)

- [x] Trace main run 40161135561: the next track is selected, but the visual handoff observer sees no snapshot pair. Production CSS minifies `240ms` to `.24s`; `parseFloat` incorrectly schedules a 0.24 ms animation.
- [x] RED: the built-app regression reports `[0.24]` instead of 240 ms. After correcting time units, 210 ms input delivery reproduces the exact missing-handoff failure: a prior snap-back completes during a resumed swipe and clears its snapshots.
- [x] Shared fix: convert CSS seconds to milliseconds, cancel obsolete layer animations on resumed preparation, and clear snapshots only when the snap-back still owns them. Commit uses the same preparation path; shared cleanup releases the busy flag. Existing UI sounds remain appropriate; no audio change is needed.
- [x] Independent review found cancellation by reduced motion could leave input busy; its new regression reproduced RED (two stale snapshot children). An animation identity guard preserves successor snapshots and still unlocks when the current animation is canceled. Final read-only review found no blockers.
- [x] Full swipe browser file: 11/11 pass with unchanged handoff geometry assertions, including ordinary/delayed input, phone touch, reduced-motion interruption, momentum and edge behavior. Final regressions cover both native milliseconds and minified seconds, with real-game screenshots under `playwright-report/ci-swipe-handoff/`.
- [ ] Run full `make verify`, inspect exact-commit main CI, and continue Telegram job-status tables until all required checks pass. Physical-device/Safari acceptance remains separate.

## Remaining phone browser regressions (2026-10-25)

- [x] RED: the unchanged implementation reproduced all three original failures. The new fixed-date title regressions also failed at 320px and 390px on 2026-10-25's `Aurora Pass · Double traffic` title; full text overflowed its box.
- [x] Fixed-date title regressions pass at 320px and 390px in en/zh-TW after removing single-line clipping. The original two phone i18n flows pass too. Typography stays 14px and the Daily button remains at least 44px tall.
- [x] Pointer-event traces confirm that the next gesture starts during the previous snap-back: snapshot canvases still exist and `swipeBusy` rejects the new pointerdown. Wait for `#track-swipe-scenes.childElementCount === 0` after cancel/commit, rather than checking the unanimated `#world`. All 7 swipe tests pass; temporary event tracing was removed. Short-drag, next/previous-track, edge-swipe and hint-persistence checks remain intact.
- [x] Inspect real WebGL phone screenshots (320/390px, both locales) and desktop screenshots (1280/1440/1804px wide, 900px tall, both locales). All six desktop checks retain the 740px intro height without scrolling; typography wrapping needs no new audio. Evidence is in `playwright-report/phone-regressions/`.
- Local gate receipt: unit tests passed 547 with 1 skipped and production build passed. The first full browser run was interrupted at the user's explicit request to commit and safe-push first; its partial results are preserved in `playwright-report/phone-regressions/make-verify-interrupted.log`. After pushing, run the complete `make verify` again; its final output is recorded in `playwright-report/phone-regressions/make-verify.log`.
- Push/CI receipts: the mandatory home layout hook output is preserved in `playwright-report/phone-regressions/safe-push.log`; the exact pushed commit, workflow URL and final required-job conclusions are written after the run to `playwright-report/phone-regressions/ci-status.json`. These receipts distinguish observed results from pending checks without requiring a second documentation-only CI run.
- [ ] Physical device: Android has no attached device; paired iPhone is unavailable in CoreDevice. Ask for a connected/unlocked phone; do not equate emulation with hardware acceptance.

## CI regression: optional release hero images (2026-10-25)

- [x] Trace the shard 5 failure: v0.22.0 intentionally has `image: null`; the browser test still assumes the latest release has v0.21.0's localized OG image. The renderer correctly hides absent images, as required by `docs/release-announcements.md`.
- [x] RED: `PLAYWRIGHT_PORT=5193 npm run test:browser -- tests/release-announcements-browser.spec.js -g 'release hero image'` failed at the original visibility assertion (`Expected: visible`, `Received: hidden`) in real Chrome. No production change was needed: repair the test's version-dependent assumption.
- [x] GREEN: the complete release-announcements browser file passed 11/11, including a final rerun after screenshot stabilization. The repaired test checks all five displayed releases in en/zh-TW: image visibility/path/decoding when supplied, readable text and no stale `src` when absent, plus Enter never starting a race.
- Historical full run before the phone follow-up: unit tests passed 547 with 1 skipped; production build passed; browser suite finished 397 passed / 3 failed. All three failures reproduced: `tests/i18n-browser.spec.js:173` en/zh-TW phone flows reported `daily-card-route` clipping (`Aurora Pass · Double traffic`, 183px > 160px), and `tests/track-swipe-browser.spec.js:42` phone swipe stayed on `coast` instead of `neon`. Their repair and current verification receipts are recorded above.
- [x] Independently run the World Tour gate skipped after the browser failure: `npx playwright test --config=playwright.world-tour.config.js --output=playwright-report/ci-release-hero/world-tour` passed 27/27.
- [x] Inspect settled real-WebGL release-dialog screenshots using the requested premium-ui-design Web/adaptive playbooks: desktop en/zh-TW, 390x844, 320x740 and 844x390. Text hierarchy, scrolling content and Continue remain readable/reachable without requiring a hero. Capture animations at their finished state; evidence and full gate log are in `playwright-report/ci-release-hero/`. Physical-device/Safari checks remain unperformed.
- At the announcement-only handoff, exact-commit remote CI was unverified. The follow-up repair's push and CI evidence are recorded above.

## Codebase refactor: Vue 3 + strict TypeScript as the primary stack (2026-10-25)

**Supersedes the earlier JSDoc-first migration plan for this dedicated refactor branch.**

- [x] Final continuation (2026-10-27): integrate current `main` collectibles guide into the typed Vue guide; preserve keyboard/touch/items tab exclusivity, reopen reset, both locales and existing panels. Observe the missing-items-tab regression RED → GREEN, run local `make verify` / layout / cloud gates and exact-commit full CI, and review running-game captures. Physical-phone performance/audio/touch/thermal evidence remains a separate requirement.
  - [x] Integrated `main`'s `bd71ac8` collectibles guide into `GuidePanel.vue`, preserving the extracted panels. Migrated its component/catalog to strict TypeScript. Chrome RED: clicking Items left its panel hidden; GREEN: 9 guide tests including tab exclusivity, reopen reset and en/zh-TW at 1440/390/320/844px. The 320px regression separately exposed 23px overflow from nonwrapping reward badges; wrapping fixes it. Strict TS/Vue and 17 focused type/i18n tests pass. Full verification remains pending below.
  - [x] Screenshot follow-up RED → GREEN: with AIRFLOW off at 390×844, the fixed showroom camera dock covered Start/Practice. The single dock now participates in compact intro layout (≤1000px), reserving space; desktop/AIRFLOW retain fixed placement and AIRFLOW explicitly retains visibility. All 25 camera tests pass, including normal-home nonintersection in both locales at 320/390/760/768/844/1440px and the existing ≥18px AIRFLOW Start gap. Strict TS/Vue plus all 693 unit tests pass (3 skipped). Full final verification is still tracked separately.
  - [x] Full-run follow-up: observed two migration-golden failures after the intentional camera layout correction. Updated only the five camera IDs' recorded order and the full stylesheet blob hash; all 228 element/tag/class records and every assertion remain intact. Independent review confirmed the stylesheet diff contains only the camera flow/visibility correction. Both parity cases now pass (2/2); physical visual signoff remains separate, and full `make verify` must be rerun against this final fixture.

**Focused TDD gate during migration (2026-10-26):** on refactor pushes, check strict TypeScript/Vue typecheck, unit tests and Cloud Save only. Defer Browser 8/8, World Tour and UI visual parity until all steps have been implemented; run `CI → Run workflow → refactor/vue-ui-typecheck-incremental → full_regression=true` and `make verify` at final exact HEAD. Focused quality-gate success is **not** merge-ready evidence. No bypass on main, other branches or release tags. Keep Step 1 / parity / Step 5 unchecked until final full verification.

The game loop, physics, WebGL renderer and hot-path HUD may remain `.js` only as measured,
documented exceptions. UI, state, business logic, services and new components default to
Vue 3 SFCs with `<script setup lang="ts">` and `.ts` modules. `jsconfig.json` checking a few
legacy files is *not* completion of TypeScript migration. Never tick incomplete coverage.

- [x] Step 0: establish Vue 3 + TypeScript-first architectural policy in `CLAUDE.md` and
  `.claude/rules/ui-architecture.md` (replaces the former JSDoc-only guidance).
- [x] Step 1: profile baseline/optimized HUD frame cost (p50/p95 on desktop/mobile),
  confirm no redundant DOM writes and full regression suite before marking complete.
  - [x] Hot-path HUD DOM setter idempotence is covered by tests/hud-dom.test.js (unit pass on focused CI 40290017276); p50/p95 real-device measurements and complete visual/regression suite remain open.
  - [x] Full CI #40391848831, SHA `0213b0d`: HUD 900ms audit on desktop 1440 and phone 390 shows 0 redundant id lookups, unchanged text/visibility writes. CI software-WebGL `?perf` (3s sampling only): desktop 1440×900 p50=199.9ms, p95=216.7ms, 5.1fps; phone viewport 390×844 p50=100.0ms, p95=116.7ms, 9.4fps. These are CPU-only CI observations and **not** a before/after or real GPU hardware comparison.
  - [x] Physical Android Chrome A/B (2026-10-27): Galaxy A52 5G, Android 14, production builds `bd71ac8` vs `a926b24`, three alternating 28 s Coast races each at thermal status 1: p50 33.3 ms in all six; p95 83.0/83.1/83.0 vs 83.0 ×3 ms; 24.2/24.1/24.2 vs 24.4/24.4/24.5 FPS. Refactor equal or better in every pair. Throttled desktop Chrome (6×/20× CPU, 412×915) agrees. A physical iPhone was replaced by this phone at the owner's direction (no signed mobile-mcp agent); iOS Safari flow ran in the Simulator. Data: `docs/verification.md`, `artifacts/refactor-20261027/android-a52-prod-ab-*`. `make perf` / `make perf-phone` repeat both checks.
  - [x] Superseded note: physical iPhone Safari / Android Chrome p50/p95 baseline-versus-refactor captures were outstanding; the actual desktop GPU comparison is recorded below. Browser `tests/perf-browser.spec.js` logs current optimized measurements in CI software WebGL without claiming a hardware comparison; do not mark Step 1 complete from emulation alone.
  - [x] Actual desktop GPU comparison (2026-10-27): macOS 27.0 / Chrome 156.0.8078.48 / Apple M4 Pro Metal, 1440×900 DPR 1, High/Cinematic, Coast Classic AUTO, three alternating 20s samples per build. Baseline `bd71ac8`: p50 16.7/16.7/16.7ms, p95 16.7/16.8/16.7ms, FPS 60/60/60; final source `cda325e`: p50/p95 16.7/16.7/16.7ms, FPS 60/60/60. No page errors. Raw data and game captures: `artifacts/refactor-20261027/desktop-performance.json`. This is headless Chrome using the actual Mac GPU, a version comparison rather than isolated HUD speedup proof; physical phones and sustained thermals remain open.
  - [x] Reproducible physical desktop/Android/iPhone baseline-versus-refactor profiling checklist added to `docs/verification.md`; device and browser configuration, 3×20s p50/p95 runs, visual/thermal evidence and attribution limits are explicitly defined. The checklist itself is not a measurement; actual desktop observations are recorded above, while physical-phone samples remain pending, so the parent Step 1 stays unchecked.
- [x] Step 2: strict `tsconfig.json`, shared TypeScript race/player/track interfaces,
  `<script setup lang="ts">` on Vue components and typed props; `npm run typecheck`
  must check TypeScript (and Vue SFCs), while explicitly separating legacy `checkJs` coverage.
  - Verified strict TypeScript, semantic Vue SFC checking and isolated legacy JS checking in CI run 40223963528 (6074422); TypeScript-first contracts and typed component props are present.
- [x] Step 2b (optional): decide on ESLint + TypeScript/Vue rules with a measured maintenance
  benefit; do not block feature parity merely to add tooling.
  - Decision: do not add ESLint now. Strict tsc + vue-tsc and existing Node/Playwright regressions already protect this migration; revisit only on demonstrated lint-only defects.
- [ ] UI parity acceptance before further broad rewrites: first-visitor start (desktop/mobile), main DOM/CSS structural contract, modal controls, screenshot comparisons on affected devices, exact-HEAD browser and cloud/World Tour gates. User-reported visual differences remain open until observed in a real browser and fixed.
- [x] Step 3: convert feature UI controllers, app services and state modules from `.js` to
  `.ts`, with typed engine-facing adapters and move-only behavioral guarantees.
  Main bootstrap/frame loop remains only as a documented performance exception.
  - [x] Inventory audited: TypeScript controllers/state/business and cloud services and Vue SFCs are under strict typecheck, with precisely 11 engine/render/audio/frame-loop JavaScript exceptions documented in `docs/refactor-architecture-audit.md`. Baseline full regression #40391848831 passed, and focused TS/Vue/Node/cloud/quality gate #40444880513 on `f4f953f` passed. New complete Browser/World Tour acceptance is checked separately in Step 5.
  - [x] Hot-path HUD `src/hud-dom.js` migrated to strict `src/hud-dom.ts`, without adding Vue frame reactivity or changing conditional DOM writes. GREEN focused CI #40387106570 (RED candidate #40387014293 was cancelled and must not be counted as observed RED). Final Browser/Layout/World Tour checks remain Step 5.
  - [x] Rear brake/Nitro/high-speed LED geometry and animation migrated from `src/rear-light.js` to strict `src/rear-light.ts` with no duplicate JS, preserving 3D shapes, boosts, calm/reduced-motion and pause behavior. Observed RED unit failure #40390895125 (missing typed module) → GREEN #40391254300 (690 unit pass, 0 fail, 3 skip; TypeScript/Vue, Cloud Save and focused gate success). Browser rear-light parity remains Step 5.
  - [x] Ten-track geometry and minimap projections migrated from `src/track-paths.js` to strict `src/track-paths.ts`, reusing typed Sky Spiral Vec3 and preserving all course profiles, boundary clamping, flat-map readability and helix map projection. Renderer, route-map.ts, World Tour and tests imports updated atomically. TDD RED #40384335633 → GREEN #40385034048 (689 unit passed, 0 failed, 3 skipped, strict TypeScript/Vue, Cloud Save, focused quality gate green). Full Browser/World Tour and real device parity remain Step 5.
  - [x] World Tour static scenery GPU instancing migrated from `src/world-tour-batching.js` to strict `src/world-tour-batching.ts`, with grouped Mesh type guards and no change to geometry/material identity, chunk matrices, draw-batch counts or parent markers. TDD RED #40383021940 → GREEN #40383799186 (688 unit pass, 0 fail, 3 skipped; TypeScript/Vue, Cloud Save emulator and focused quality gate green). Complete Browser/World Tour visual parity remains Step 5.
  - [x] Sky Spiral deterministic helix, jump gap, camera-relative coordinate and orthonormal road-frame geometry migrated from `src/sky-track.js` to strict `src/sky-track.ts`; game/world/sky scene/track path and tests updated atomically. Fixed-length Vec3 types preserve three axes without changing elevation or curve formulas. TDD RED #40381959781 → GREEN #40382466551 (687 passed, 0 failed, 3 skipped; TypeScript/Vue, Cloud Save, focused quality gate green). Exact-HEAD Browser/World Tour remains Step 5.
  - [x] WebKit shader pipeline warmup migrated from `src/shader-warmup.js` to strict `src/shader-warmup.ts`, preserving hidden lights, culling and visibility restoration, World renderer and existing tests. TDD RED #40377965371 → GREEN #40378453045 (686 pass, 0 fail, 3 skip, TypeScript/Vue, Cloud Save, focused quality gate). Native Browser and World Tour parity remains Step 5.
  - [x] Ghost replay stores and 512 KiB bounded per-ruleset replays plus validated Daily challenge history migrated from `history.js` to strict `history-ghost.ts` and `history-daily.ts`, with centralized 50-run policy. Existing storage keys and public exports preserved. TDD RED #40371362578 → GREEN #40371724839 (684 unit pass, 0 fail, 3 skipped; TypeScript/Vue, Cloud Save and quality gate passed). Browser World Tour parity remains Step 5.
  - [x] Cloud progress schema/Classic, Mode and Daily merge and identity dedup moved into strictly typed `src/cloud-progress-merge.ts`; `src/cloud-progress.ts` now owns versioned import, account-isolated local rollback and save/restore with no legacy `cloud-progress.js`. TDD RED for local TS gate #40368903124, GREEN of merge #40368478261 and exact-HEAD full local storage #40370747316 (strict TypeScript, 683 unit passes / 0 failures / 3 skips, Cloud Save emulator and focused quality-gate all passed). Full Browser/World Tour acceptance remains Step 5.
  - [x] Classic bests, medals, stars and paint preferences migrated to strict `history-achievements.ts` plus guarded `history-storage.ts` while preserving original localStorage keys, legacy coast best and public history exports. TDD RED #40370257485 → GREEN #40370747316 (683 unit pass, 0 failures, 3 skips; TypeScript/Vue, Cloud Save and focused gate passed). Full device and visual parity remains Step 5.
  - [x] AIRFLOW showroom art direction and camera presets migrated from `src/track-preview.js` to strict `src/track-preview.ts`; updated World renderer plus two showcase tests. Preserve all curated landmark distances, six camera modes, reduced-motion behavior, unknown future-track fallback and player/rival immutability; no duplicate JS. TDD RED #40363630707 → GREEN #40364111629 (680 unit passed, 0 failed, 3 skipped; TS/Vue, Cloud Save and focused gate green). Full Browser/World Tour and device screenshots remain Step 5.
  - [x] Road-relative car orientation migrated from `src/vehicle-pose.js` to strict `src/vehicle-pose.ts` with generic Quaternion-based mesh contract. Existing World renderer and road-stability regressions use the typed module, no duplicate JS. TDD RED #40362636641 → GREEN #40363093166 (679 passed, 0 failed, 3 skipped, TS/Vue and Cloud Save and focused quality gate green). Complete Browser/World Tour evidence remains Step 5.
  - [x] Shared car shell, canopy and road ribbon geometry migrated from `src/geometry.js` to strict `src/geometry.ts`; World/World Tour/Sky renderers and geometry tests now import the typed module. Existing winding and upward-normal tests pass. TDD RED #40355826973, fixed missing official Three.js declaration with pinned `@types/three@0.180.0`, exact-HEAD GREEN #40356913926: 678 unit pass/0 fail/3 skip, TypeScript/Vue, Cloud Save and focused quality gate green. Full Browser/World Tour remains Step 5.
  - [x] Gauntlet hazard generation and lane oscillation migrated as a move-only implementation from `src/hazards.js` to strict `src/hazards.ts`; updated game/world callers and five legacy test imports. Track seed stream, tunnel clearance, tier spacing and obstacle math unchanged. TDD RED #40354764534 → GREEN #40355365206 (TypeScript/Vue, 677 passed/0 failed/3 skipped; Cloud Save and focused quality-gate PASS). Full Browser/World Tour remains Step 5.
  - [x] Permanent ruleset Bests/Stunt peak cloud merge extracted from `src/cloud-progress.js` into strict `src/cloud-mode-bests.ts`, preserving mode signatures, best-time minimum, stunt maximum, score telemetry, 200-entry limit and original exports. TDD RED #40351705301 → GREEN #40352400023: 676 unit pass / 0 fail / 3 skip, TypeScript/Vue, Cloud Save Emulator, focused gate green. Browser/World Tour parity remains Step 5.
  - [x] Career aggregates, sorted Daily board, and star total/validation extracted from `src/history.js` into strict `src/history-stats.ts` while retaining the original `history.js` API and data formats. Observed RED #40350561005 → GREEN #40351144161 (675 unit pass, 0 fail, 3 skipped; TypeScript/Vue, Cloud Save and focused gate green). Full Browser/World Tour acceptance remains Step 5.
  - [x] Deterministic PRNG stream service and 20-second HUD performance statistics migrated without algorithm/stream-name changes to `src/rng.ts` and `src/perf.ts`; all imports updated and duplicate JS removed. TDD RED #40349403064 → GREEN #40350054789 (TypeScript/Vue, 674 unit passes, 0 fail, 3 skipped, Cloud Save and focused quality gate). Full Browser/World Tour parity remains Step 5.
  - [x] Per-account Cloud Sync status extracted from `cloud-progress.js` into strict `cloud-sync-status.ts`, keeping the existing public exports, stored key, pending/last-success semantics and blocked-storage protection. TDD RED #40340442536 → GREEN #40340769114 (typecheck, unit, Cloud Save, focused quality-gate). Full Browser/World Tour parity is Step 5.
  - [x] Input keyboard/touch/tilt controller migrated from `input.js` to strict `input.ts`; existing input tests plus new lifecycle regression, no duplicated JS. Canonical `game-types.ts` replaces unused JSDoc `game-types.js`. TDD RED runs 40334317350 / 40335751478 → exact-HEAD GREEN 40335983183 (TypeScript/Vue, 668 unit passes, 0 fails, 3 skips, Cloud Save and focused gate).
  - [x] Release note catalog and production/development progression access aliases migrated to typed modules with prior RED/GREEN evidence; no changes to player-facing copy or unlock rules. Focused CI 40333765235 and 40332262015 verified.

  - [x] Player-facing release notes and bilingual version announcements migrated as a single typed module; RED run 40331770864 → GREEN 40332262015 (strict typecheck, unit tests, Cloud Save, focused gate). All existing release records and localized copy preserved; full visual parity remains Step 5.
  - [x] Locale service migrated from i18n.js to strict i18n.ts, preserving UI/GAME catalogs, saved locale precedence, accessibility text and onLocaleChange; no parallel legacy copy. Focused CI 40284587634: TypeScript/Vue + unit 640 passed, 0 failed, 3 skipped; Cloud Save + quality-gate green. Browser/iOS manual parity deferred to final audit.
  - [x] Touch slide-pad state machine migrated to strict TypeScript, keeping its steering/brake math and removing duplicate JS; focused CI 40283660649 (typecheck; unit 638 pass, 0 fail, 3 skipped; Cloud Save; quality-gate).
  - [x] Minimap SVG route samples / live markers converted to strict TypeScript; duplicate JS removed, focused CI 40283144937 (typecheck, 637 pass / 0 fail / 3 skipped, Cloud Save, quality-gate). Browser visual check deferred.
  - [x] Visual SVG icons and track-section sign contracts moved to strict TypeScript; removed duplicate JS, no SVG/path/label edits; focused exact-HEAD CI 40282591936 (unit 636 pass / 0 fail / 3 skipped, Cloud Save and gate passed). Full visual parity still reserved for Step 5.
  - [x] Practice metrics and Sprint Series moved to typed services, without parallel JS copies; RED 40288752236 and GREEN 40288971774 (typecheck, unit, Cloud Save, focused gate).
  - [x] English/Traditional Chinese player-facing UI and game locale catalogs migrated as move-only typed files; RED 40317239579 → GREEN 40317562474 (typecheck, 663 unit pass, 0 fail, 3 skipped, Cloud Save and focused gate), original strings and keys unchanged; browser parity deferred.
  - [x] Ghost replay serialization, validation and 10 Hz interpolation migrated to typed service; RED 40316613266 → GREEN 40316856195, typecheck, unit 661 passed / 0 failed / 3 skipped, Cloud Save + focused gate. Browser Ghost UI check deferred.
  - [x] Interactive tutorial eight-step input controller migrated to strict TypeScript with typed legacy-engine adapter; RED 40315449839 → GREEN 40316234138 (typecheck, unit 659 passed / 0 failed / 3 skipped, Cloud Save + focused gate). Real desktop/mobile tutorial parity pending final Browser audit.
  - [x] Race configuration normalization and strict player request validation migrated to TypeScript without changing stored rules signatures or Classic defaults; RED 40314174935 → GREEN 40315046782, typecheck, unit 657 passed / 0 failed / 3 skipped, Cloud Save + focused gate. Final Browser/World Tour deferred.
  - [x] Mode-specific sound cues and in-race callouts migrated to strict TS; RED 40313264374 → GREEN 40313691599, typecheck, unit 655 passed / 0 failed / 3 skipped, Cloud Save and focused gate. Retained sound/callout event behavior; removed two duplicate JS files. Final browser/visual verification pending.
  - [x] Elimination, Checkpoint Rush and Stunt Attack rules migrated to strict TS (no duplicate JS); RED 40312341781 → GREEN 40312783413, typecheck, unit 652 passed / 0 failed / 3 skipped, Cloud Save and focused quality-gate success. Browser gameplay parity deferred to Step 5.
  - [x] Championship Cup standings and result validation migrated to strict TypeScript; RED 40289793617 and focused GREEN 40290017276 (typecheck, unit, Cloud Save, quality gate). Full browser gameplay validation deferred.
- [x] Step 4: move event-driven dialogs and panels to Vue 3 TypeScript one at a time
  (release notes, history, garage, audio/settings, guide/tutorial, etc.);
  remove duplicate imperative DOM ownership. Run desktop/mobile, accessibility,
  localization, Firebase/cloud-save, finish/pause and World Tour regressions.
  - [x] Automated Step 4 acceptance at exact code SHA `a9002c9`, [full CI #40445190377](https://github.com/weskao/skyline-rush/actions/runs/40445190377): strict TypeScript/Vue and 692 unit pass/0 fail/3 skip; 8×55 Browser cases; responsive layout 29+42; Cloud Save 15 browser+3 Rules; World Tour 72; quality gate success. Reviewed 18 Race Mode and 7 World Tour captured screenshot samples (desktop/mobile): no obvious clipping/overlap in these samples, **not** pixel-parity against `main` or physical device approval.
  - [x] Follow-up regression: same failed Google avatar URL must keep its fallback on locale/sync refresh; changed URL may retry. TDD RED #40451146836 (`c07f17c`, missing guarded profile update) → GREEN focused #40451343678 (`59ca5c1`, 693 unit passed/0 fail/3 skip, Cloud Save, TypeScript/Vue and focused quality gate green). Latest exact-HEAD Browser/World Tour regression belongs to Step 5.
  - [x] History Cloud Save profile (Google display name, account identity, HTTPS avatar + broken-image fallback) and status/action buttons are Vue-owned `cloud-view-state.ts` / `HistoryPanel.vue`, not competing DOM setters in `main.js`. Observed RED #40443850579 → GREEN focused #40444356946 for avatar identity (cloud emulator repaired to send realistic Vue image failure), and observed RED #40444601683 → GREEN #40444880513 for status, ARIA announcements, login/logout/switch/delete visibility, disabled sync controls. Focused checks: TS/Vue, 692 units pass/0 fail/3 skipped, Cloud Save emulator, quality gate green. Full desktop/mobile Browser/World Tour still needs final HEAD acceptance.
  - [x] The What's New opener unread badge and visibility are now Vue-owned reactive state (`release-view-state.ts` / `App.vue`), with no imperative DOM writes from `release-notes-ui.ts`; keyboard focus/click orchestration remains intact. TDD RED run 40344072762 → GREEN run 40344545178 (strict TypeScript/Vue, 673 passed / 0 failed / 3 skipped, Cloud Save, focused quality gate). Full Browser/World Tour/Layout confirmation remains Step 5.
  - [x] Audio settings Vue reactive presentation owns mute icon, Music/SFX switches, slider values, percentage labels and accessible value text. `audio-ui.ts` retains playback/localStorage only, no imperative HTML/ARIA writes. TDD RED #40341239974 → GREEN #40341674534 (TypeScript/Vue, 671 passed / 0 failed / 3 skipped, Cloud Save and focused quality-gate). Full Browser/audio parity remains Step 5.
  - [x] Settings and Controls disclosure buttons now derive aria-expanded from the same Vue reactive state as panel visibility, removing duplicate imperative writes; RED run 40288061638, GREEN run 40288441175 (typecheck, unit, Cloud Save, focused gate). Final screenshot parity deferred.
  - [x] Home-screen Daily Challenge and medal status now use a single typed Vue reactive view (`src/home-status-view-state.ts`), with no competing imperative writes in `history-ui.ts`; original `#daily-card-*` and `#medal-*` selectors, i18n and action buttons preserved. Observed RED in unit job of Actions 40337519982, then GREEN Actions 40337884060 (TypeScript/Vue checks, 669 passed / 0 failed / 3 skipped, Cloud Save and focused quality gate). Full browser/visual parity remains Step 5.
- [x] Step 5: final architecture and feature-parity audit: all new UI/business code
  uses TypeScript, `tsconfig` coverage is reported, remaining plain-JS exceptions
  are documented, and exact-HEAD `make verify`, layout and CI quality-gate pass.
  - [x] Earlier complete regression #40391848831 (`0213b0d`) passed TypeScript/Vue, 8/8 Browser shards, responsive layout, 72 World Tour, Cloud emulator and quality gate. It predates current Step 4 Cloud Save Vue changes and is not an exact-HEAD receipt for the updated code.
  - [x] Exact code SHA `a9002c9`, [full CI #40445190377](https://github.com/weskao/skyline-rush/actions/runs/40445190377): Unit/strict TS+Vue success (692/0/3), all Browser shards (440/440), responsive layout (29+42), Cloud Save emulator (15 Browser + 3 Rules), World Tour (72), and `quality-gate` success. This supersedes older code-only CI, but predates the small subsequent avatar fallback regression fix.
  - [x] Report's pending exact code SHA `4876c90` is now confirmed: full CI #40451947889 passed Unit/strict TS+Vue, all 8 Browser shards, Cloud Save, World Tour and `quality-gate`. This predates continuation commits `771274d` / `cda325e` and is not a current-source CI receipt.
  - [x] Code SHA `a926b24` (last source change): full CI #40489569625 passed Unit, all 8 Browser shards, Cloud Save, World Tour mid-race and `quality-gate`. Local `make verify` there: 448/449 Browser, the one failure a `page.goto` HTTP error from the local preview server (no assertion); rerun of that test ×3 (15/15) and World Tour 72/72 passed. Fixes since the last receipt: `034f0de` phone intro scroll edge, `d3f09e8` stylesheet golden, `a926b24` mid-race VFX rows without dropdowns (all RED→GREEN). Later commits are tooling/docs only and get their own full run.
  - [x] Superseded: continuation's final HEAD full CI remained open. Push only the current refactor branch through the normal approval path and confirm every required job on that exact commit; the initial push attempt was rejected by automatic approval review, so no new remote verification is claimed.
  - [x] Local macOS `make verify` on final source/test content (`cda325e` / `d1a91f4`) actually completed with exit code 0: strict TS/Vue/legacy boundary checks; 693 unit pass / 0 fail / 3 emulator-dependent skip; production build/locked-bundle assertion; Browser 447/447; World Tour 72/72. Preserved output: `artifacts/refactor-20261027/make-verify.log`. The first broad run's two old golden failures were repaired without removing assertions, then the entire gate was rerun successfully. This supersedes the earlier remote-container DNS blocker; exact-HEAD remote CI and physical-phone acceptance remain separate.
  - [x] Dedicated final-source local gates completed, both exit 0: `npm run test:layout` passed 29+42 cases; `npm run test:cloud` passed 15 emulator browser cases and all 3 Firestore Rules tests (0 skipped). The normal unit run's three emulator-dependent skips were exercised here. Outputs: `artifacts/refactor-20261027/layout.log` and `cloud.log`. Java 25 and synthetic emulator accounts were used; no production cloud save was tested or modified.
  - [x] Pushed `a2e2563`: full CI #40473458810 passed Unit, all 8 Browser shards, Cloud Save, World Tour and `quality-gate`. Later commits still need their own exact-HEAD full run.
  - [x] iOS 26.5 Simulator Safari (iPhone 17 Pro, visible viewport 402×714) on the phone-dev server: first visit → tutorial throttle lesson by touch → Skip → Coast race → Pause → switch to zh-TW over the pause screen → Resume → finish (2/4, new record) → Next starts Neon Downtown. Found a pre-existing (also in `main`) hard clip of the scrollable phone intro on the footer line that made History/Garage look cut by the footer; fixed in `034f0de` with a non-AIRFLOW scroll-edge fade (RED→GREEN 402×714 test; race-modes + showcase-camera 48/48; layout 42/42; unit 693/0/3). Simulator evidence, not physical-device acceptance. The Android 16 emulator's network dropped repeatedly this session (baseline equally blank), so Android Chrome relies on the earlier `artifacts/refactor-20261027/android-*` captures.
  - [x] Physical Galaxy A52 (Android 14, Chrome 155): production A/B equal or better in every pair (Step 1); touch Start, tutorial Skip, VFX panel, Pause, Resume, finish (2/4, new record) and Next → Neon Downtown all work; Chrome's media audio stream runs unmuted during racing; thermal status stayed light (SKIN ≤ 37.9 °C). Before/after screenshots of each UI fix were sent to the owner. The owner then confirmed the audio sounds right and ran both production builds on a physical iPhone 16 Pro (iOS 26.3, Safari): same frame rate on the `?perf` strip, Start/Pause/Resume/finish/Next working, no UI problems (observation, per-run numbers not recorded).
  - [x] Superseded: baseline vs optimized p50/p95 on actual comparable desktop/mobile hardware, screenshots reviewed by a human, iPhone Safari/Android Chrome touch/audio/thermal acceptance are still unavailable and are not substituted by software WebGL or viewport emulation.
- [ ] Not planned: a mandatory Big Bang `.ts` rewrite of WebGL rendering/physics
  or reactive per-frame HUD; performance correctness takes priority.

## Audio preference moves from cookies to localStorage; Chrome first-visit autoplay (2026-10-25)

- [x] Repro in real Chrome with its default autoplay policy (Playwright strips `--autoplay-policy=no-user-gesture-required`; scratch script, 4 runs): `AudioContext` stays `suspended` on load as Chrome requires, and the first click or key resumes it (`running`, audible RMS > 0.01). Autoplay without a gesture cannot be fixed client-side; the existing first-gesture unlock (`unlockAudio`, `src/main.js`) is the fix and is kept.
- [x] Preference storage: `src/audio-settings.js` `readAudio(localStorage)` reads `skyline-rush-music` / `skyline-rush-sound` (`on`/`off`) and `-volume` percent; `setAudio` in `src/main.js` writes them. Nothing stored → on at 100%, stored as `on` on the first `unlockAudio`. Cookie writes and the `skyline-rush-audio-v=2` legacy marker are gone.
- [x] RED: `tests/audio-settings.test.js` rewritten against a storage object failed on the old module (`AUDIO_KEYS` missing). GREEN: `npm test` 533 pass; `npm run build` ok; `npx playwright test tests/browser.spec.js -g "music|audio|volume|sound"` 13/13 (off choice + volume survive reload from localStorage, saved off stays silent after the gesture, fresh visit stores both channels `on`).
- [ ] Full `make verify` and CI `quality-gate` on the committing HEAD; a human check in desktop Chrome/Safari/Firefox and on a phone that the first tap starts the intro music.
- [ ] Known loss: a music/sound-off saved in the old cookie is not migrated; those players hear audio once more and have to mute again.

## CI regression: trackpad momentum must select one course per swipe (2026-10-24)

- [x] Inspect failed CI run 40102405872: only browser-tests shard 6 failed; the existing Playwright RED shows expected `neon` but actual `alpine` during one prolonged wheel gesture. The aggregate quality-gate correctly failed because the browser shard was red.
- [x] Trace `src/main.js` wheel gesture lifecycle: under CPU-heavy WebGL event gaps can exceed the 160 ms inactivity timer, rearming the same swipe and advancing several tracks.
- [x] Add a dedicated browser regression simulating momentum event intervals beyond 160 ms in `tests/track-swipe-browser.spec.js`, committed before the fix.
- [x] ~~Apply the minimal shared fix: increase the wheel gesture idle window to 320 ms~~ — replaced. Any CI delivery hiccup over 320 ms still split a swipe, and users would have to pause 320 ms between swipes.
- [x] Root cause, measured: wheel events were stamped 16 ms apart (`event.timeStamp`), but Playwright/CDP delivered some 168–203 ms apart while frame times stayed under 50 ms. The 160 ms wall-clock timer read late delivery as a pause, and also reset unfinished drags. Fix in `src/main.js`: the gesture pause is timed on `event.timeStamp` (`WHEEL_END_MS` back to 160 ms), and the timer only springs an unfinished drag back.
- [x] Deterministic RED/GREEN: both trackpad tests send CDP wheel events stamped 16 ms apart (`trackpadSwipe`): one delivers a single event 300 ms late, the other delivers every event 210 ms apart. On the original timer code: 3/3 RED (expected `neon`, got `canyon`/`aurora`). After the fix: the whole `tests/track-swipe-browser.spec.js` passes 30/30 local runs (6 repeats).
- [x] CI run 40110604502 on `1fd4178` failed only on "a nudge springs back": the Linux runner scaled native CDP wheel deltas, so a 40 px nudge passed the 96 px swipe distance (macOS does not scale). `trackpadSwipe` now dispatches a `WheelEvent` with a pinned CSS-pixel delta and a pinned `timeStamp`. On the original timer code: 6/6 RED (got `canyon`/`coast`). On the fix: 20/20 GREEN locally.
- [x] Obtain GREEN evidence on the final commit, including both trackpad tests and all CI shards, then mark the confirmed tests complete. Done: run 40113913209 on `ab150f3` passed all eight browser shards, unit, cloud-save, World Tour and `quality-gate`. The earlier RED was observed on the original test in the cited CI run; the new focused test was committed test-first but its isolated RED has not been separately observed.
- [ ] Confirm real Mac trackpad gestures, momentum separation and touch/mouse swipes remain natural before calling this a fully device-verified fix.

## Regression-first workflow adoption (2026-10-24)

- [x] Define one reusable six-gate development protocol in `docs/regression-first-workflow.md`: root-cause analysis, observed TDD RED, GREEN, cross-track/input matrix, local and manual WebGL checks, exact-commit CI before user-authorized merge.
- [x] Reference the protocol from `CLAUDE.md` and `AGENTS.md`, alongside the existing file-scoped physics/UI regression rules.
- [x] Provide `make verify` to run unit tests, production build via `pretest:browser`, all standard Playwright tests and the separate World Tour fixture suite.
- [x] Add GitHub CI `quality-gate` that fails unless unit/browser/cloud/World Tour jobs all succeed; block manual feature-branch deployments and make deploy consider World Tour results.
- [x] Run CI on future `feature/**` pushes while keeping the explicitly disabled `feature/mode00-objective-contract` branch excluded.
- [x] Confirm the complete `quality-gate` succeeds at the **final** feature HEAD; test infrastructure changes are not accepted based on an older SHA.
  - Green: run 40113913209 on `ab150f3`, the last code commit. Later commits that only touch `TODO.md` add no code to gate.
  - `ddbeb3a` (run 40102405872) failed: the trackpad-swipe test above failed in shard 6; `main` `d2b35e5` fails CI on the same test. The fix is in the section above, and the gate is re-checked on the commit that carries it.
  - `1fd4178` (run 40110604502, main merged in) failed only on the CDP delta scaling recorded above.
- [ ] Complete real-game visual/interaction evidence for Sky Spiral road clipping and Tokyo finish controls on affected devices (automation alone cannot certify these).
  - Done at `ddbeb3a` (headless Chromium, real WebGL, 1440×900 and 390×844 touch): Sky Spiral approach, helix entry, both quarter turns, left/right rail, helix exit and first ramp at ~305 km/h show the car seated on the banked road with no clipping, and 0 page errors. Tokyo finish after 2 real collisions: camera, language switch to zh-TW, Next and Race Again all respond to real clicks (`tests/tokyo-finish-controls-browser.spec.js`, 4/4).
  - Still open: a human playthrough on a physical iPhone/Android (touch hardware, Safari WebGL) and on desktop Safari/Firefox.
- [ ] Before user-approved merge, integrate latest `main`, resolve any conflicts, repeat exact-commit CI and assess manual evidence; do not claim merge readiness while behind or unchecked.
  - `main` (`d2b35e5`) is fully merged, with 0 commits behind and no conflicts. Still waiting on a green gate at the final HEAD, the physical-device check above and the user's merge approval.
- [x] Consider configuring GitHub branch protection/ruleset to require `quality-gate` on `main` if repository administration permissions become available; documentation/CI do not by themselves prevent direct pushes.
  - Ruleset `main requires quality-gate` (id 25785253, active, 2026-10-24) on the default branch. Repository admins can bypass it so the local-merge and `/release` flow keeps working; every other push or PR to `main` needs a green `quality-gate`.


## Sky Spiral & cross-track cornering stability (2026-10-24)

- [x] Identify shared renderer issue: local road orientation was converted back into Euler angles, overwriting road pitch/banking in curved and elevated sections.
- [x] Compose steering lean, airborne pitch, drift and trick roll as local quaternion offsets, keeping the canonical road frame on Sky Spiral and all five World Tour tracks.
- [x] Prevent repeated rail crashes while steering continuously into the same road edge; re-arm only after pulling away; preserve first-contact collision and existing scrape behavior.
- [x] Add pose-continuity, road-alignment and repeated-rail-contact regression test sources covering all routes.
- [x] Run full `npm test` through GitHub Actions on feature commit `b4134c0` (unit-tests: success). Previous run exposed a braking regression, fixed by preventing drifting while pressed against the contacted rail.
- [ ] Independently capture the initial RED for each newly introduced focused regression test; the full green unit run alone does not prove TDD test-first execution.
- [ ] Run `npm run build`, desktop/mobile Playwright, and full GitHub CI on this feature branch.
- [ ] Manually verify actual driving at Sky Spiral's helix entry, both quarter turns, exit, rails, elevations, ramps, and every other track; capture before/after gameplay screenshots or recordings.
- [ ] Independently verify vehicle-to-road mesh clearance at high speeds and road edges with real WebGL rendering.

## Tokyo finished-race UI controls (2026-10-24)

- [x] Merge latest `main` into `feature/sky-spiral-cornering-stability` using a true two-parent merge commit (`baa46ec`), retaining upstream game mode fixes and the feature changes.
- [x] Fix a concrete click-interception risk: `.aero-tools` (language and VFX) was at the same stacking level as the later `.race-overlay`; lift it above the results overlay without removing either control.
- [x] Add desktop and touch Playwright coverage for Tokyo: multiple actual simulation collisions, finish, camera click, language switch, Next, Race Again and page errors (`tests/tokyo-finish-controls-browser.spec.js`).
- [x] Document UI layer/input invariants for future changes in `CLAUDE.md` and `.claude/rules/ui-phase-interactions.md`; document car pose and rail rules in `.claude/rules/vehicle-road-stability.md`.
- [ ] Confirm actual Playwright results and pointer hit targets (desktop and mobile), plus real device/browser reproduction and before/after images. Script committed does not mean browser behavior passed.
- [ ] Confirm all CI jobs are green at the final tested commit and report exact run URL; separate `playwright.world-tour.config.js` testing must also finish.

## 每日挑戰：禁止飛行 UI / UX 修正（2026-10-25）

- [x] 「禁止飛行」時 FLY 控制停用、清除 Toggle；鍵盤與觸控不得啟動起飛。
- [x] FLY 顯示降彩度及鎖頭，HUD 改為禁止飛行與能源用途提示；中英文與 ARIA 同步。
- [ ] 實機 iOS Safari 與 Android Chrome 手動確認禁用控制及輔助工具朗讀。

## 每日挑戰獎勵規劃（未納入本次實作）

保留目前每日獨立排行榜／最快成績及既有獎章規則。本階段僅記錄需求；獎勵數據結構、雲端同步及解鎖規則尚未設計或實作。

- [ ] 首次完成當日挑戰的獎勵：明確界定完賽、首次領取及每日重玩不重複發放，顯示領取狀態。
- [ ] 三種挑戰（禁止飛行／雙倍車流／僅限金環）的專屬成就：設定條件、進度與中英文敘述。
- [ ] 連續完成天數與獎勵：以本地日界或伺服器日界制定一致規則，處理跨時區、補登及中斷。
- [ ] 每日挑戰限定車漆：設計達成門檻、展示／裝備流程；不影響車輛能力及既有星數解鎖。
- [ ] 獎勵上線前補 TDD：本機防重領、Firestore 免費額度評估、跨裝置合併、離線重試及手機／桌面領獎驗收。

## UX-Release-01 — 玩家可讀的新版本公告（What's New，2026-10-24）

規格：[docs/release-announcements.md](docs/release-announcements.md)。開發於 `feature/whats-new-release-announcements`，從 `main` 建立。僅對已正式發布的新版本公告已確認的玩家體驗，不展示開發技術詞彙。

- [x] **TDD 狀態契約：**可發布公告判斷、每版本已讀、Local Storage 受阻與相容既有更新重載機制，先 RED 後 GREEN。
- [x] **玩家公告資料：**已建立版本、日期、English／繁中玩家導向文字及可選圖片（無圖完整顯示）；Node 測試與正式建置已在 [Actions #40097497428](https://github.com/weskao/skyline-rush/actions/runs/40097497428) 對應提交成功，仍待最新 UI browser 驗收。
- [ ] **桌面／手機公告 UI：**原生 dialog、版本與更新卡、圖片缺失降級、44px 控制、手機安全區、無障礙與減少動畫。
- [ ] **觸發及互動：**僅首頁安全狀態首度顯示、關閉存已讀、Escape 與按鈕、首頁版本號可重新開啟，其他 dialog／教學／賽事不打斷。
- [x] **公告文案英文規則：**`CLAUDE.md` 已規定所有公告從玩家角度描述新體驗，避免工程專業術語，且英／繁中同步更新；已重新讀取確認。
- [x] **雙語與可維護性：**介面及更新內容支援 en / zh-TW、開啟時跟隨全站語言選單即時切換；CLAUDE.md 英文規則要求玩家導向文案；無新套件或後端。
- [ ] **自動化測試與 CI：**改版後重新驗證：`npm test`、`npm run build`、`npm run test:browser`、`npm run test:layout` 全數通過；推送後的 CI 狀態另行確認。（2026-10-25：`npm test` 534/534、build 通過、`test:layout` 29＋42 通過；`test:browser` 修正封鎖儲存空間時自動彈出的問題後仍有 i18n 手機每日挑戰路線文字被截斷（183>160px），`origin/main` 同樣失敗，非本分支造成，待修）
- [x] **真實畫面佐證：**改版後的桌面 1440×900（English）與手機 390×844（繁體中文）公告畫面已擷取、標註並傳送 Telegram（2026-10-25）。
- [x] **移除完整更新紀錄：**公告內不再出現「完整更新紀錄 / All changes」連結，相關文字鍵與樣式一併移除；瀏覽器測試確認對話框內沒有外部連結。
- [x] **最近五版切換：**以版本分頁顯示最新 3–5 個已發布版本（最多 5 個、不顯示尚未發布的版本），可點擊或用 ←/→、Home、End 切換，切換語言保留所選版本，重新開啟回到最新版。
- [x] **自動顯示與已讀紀錄：**localStorage 記錄玩家看過的最新版本；有更新版本時自動顯示，一顯示就更新紀錄並清除提示點；新玩家不顯示舊消息但會記錄目前版本。
- [x] **發版前更新公告：**`CLAUDE.md` 與規格要求每次發版前先寫好該版公告（圖片可選，存於 `public/whats-new/<version>/`，歷史內容與圖片保留在 repo）；`scripts/release-gate.sh` 透過 `scripts/check-release-notes.mjs` 擋下缺少公告的版本。
- [x] **介面美化：**版本分頁、更新類型標籤、主視覺、置底的「繼續遊戲」按鈕與進場動畫（減少動畫時停用），桌面與手機四種尺寸皆不溢出。（2026-10-25：公告瀏覽器測試四種尺寸通過、`test:layout` 29＋42 通過，桌面／手機截圖已人工確認）
- [ ] **實體裝置驗收：**iOS Safari／Android Chrome 觸控、短橫向、字體放大、返回首頁等（無真機則保留未完成）。


## 最高優先：儲存與跨裝置還原（2026-10-23）

原則：需要在清除瀏覽器資料後還原的遊戲成果，以 Google 登入後的 Firestore 帳號資料為主、本機資料為離線副本；裝置操作偏好留在本機。Firestore 單一使用者文件採版本化格式，僅在登入、完成比賽及成果改變時同步，不按影格寫入。勾選只代表該項已實作並完成對應驗證。

執行順序：先針對每個雲端欄位與跨裝置情境寫會失敗的單元／規則／瀏覽器測試，再寫最小實作，最後跑單元、Firestore 模擬器、正式建置與相關瀏覽器測試。共用 `history.js` 既有讀寫與驗證邏輯；合併規則集中一處，不複製每個模式的儲存流程。每項通過對應驗證後才改為 `[x]`。

### 雲端基礎與資料安全

- [x] 建立獨立 Firebase 專案、台灣區 Firestore Standard、Google 登入與 GitHub Pages 授權網域；部署僅本人可讀寫的規則。
- [x] 查詢專案帳務設定，確認 `billingEnabled=false` 且未綁定付費帳戶；資料量與讀寫次數仍須遵守 Spark 免費額度。
- [x] History 提供登入／登出、成功／待同步／失敗狀態；離線或雲端失敗時不阻止遊戲使用本機進度。
- [x] 首頁提供容易發現的雲端儲存入口，開啟時直接帶到 Google 登入與同步狀態；驗證手機與桌面版面。
- [x] `skyline-rush-unlocked` 已解鎖賽道：首次登入合併本機與雲端集合，完成 Classic 解鎖後同步；禁止未知賽道進入儲存資料。
- [ ] 已發布網站實測「解鎖 → 儲存 → 清除 Cookie／Local Storage → 用同一 Google 帳號登入 → 還原」，另測不同裝置與手機 Safari 登入。
- [ ] 在完成本地與模擬器驗證後，依專案發佈規則把新版網站上線；部署後再執行上述真實帳號驗收。
- [x] 帳號切換時隔離不同玩家的本機副本，避免共用裝置將甲的進度自動上傳到乙的帳號；提供可理解的安全切換路徑。（Firebase Auth／Firestore 模擬器驗證）
- [x] 網路恢復後自動重試未同步成果；提供「上次成功同步時間／待同步」狀態，避免把本機成功誤認為雲端成功。（離線回線與跨瀏覽器還原模擬器驗證）
- [x] 提供本人刪除雲端進度與匯出資料的操作；驗證登出、刪除與重新登入的結果。（模擬器通過；正式站需先發布新版規則與程式）
- [x] 限制進度文件大小，並區分額度耗盡、服務不可用與本機寫入失敗；只有確認本機寫入成功才顯示「成果已留在本裝置」。（單元與模擬器瀏覽器測試）
- [ ] 發布後查看 Spark Usage 儀表板的實際儲存量及每日讀／寫量，並在正式站驗收服務故障提示；操作步驟見 `docs/cloud-save.md`。
- [x] 明確區分 Firebase 登入狀態與資料同步狀態；清除 Cookie、Local Storage 或 IndexedDB 後需重新登入，但不能把未同步資料誤標為已備份。（全新瀏覽器資料模擬器驗證）

### 要同步的遊戲成果（同一份版本化帳號進度）

- [x] `skyline-rush-stars`：各賽道最佳星數取較高值；還原後重新計算塗裝解鎖。
- [x] `skyline-rush-best-tracks` 與舊版 `skyline-rush-best`：各賽道最佳時間取較低值，舊版 Coast 成績只用來遷移。
- [x] `skyline-rush-medals`：獎章取聯集，同一獎章保留較早取得日期。
- [x] `skyline-rush-history`：Classic 最近 50 場紀錄；依紀錄內容去重、驗證欄位，合併時保留最新 50 場，並重算生涯統計。
- [x] `skyline-rush-mode-history-v1`：Custom、Time Attack、Cup、Stunt 等模式的最近 50 場紀錄；沿用原模式／規則簽章與最佳成績計算。
- [x] `skyline-rush-daily`：每日挑戰最近 50 筆；依挑戰 ID 保留獨立排行，避免誤併進 Classic 解鎖。
- [x] 替上述欄位新增版本遷移、Firestore 規則、模擬跨裝置合併測試及還原後 UI 更新；雲端舊版地圖資料不可被新版本覆蓋或遺失。
- [x] 對同帳號雙裝置同時完成比賽、重複登入、離線後回線與受損雲端資料做回歸；重試不得重複紀錄或倒退最佳成績。（雙瀏覽器並行交易、離線回線、重複登入與合併單元測試通過）
- [x] 重要合併、復原與帳號隔離問題先以失敗測試重現再修正；共用賽道清單與既有資料驗證，通過完整單元、Firestore 規則模擬器、相關瀏覽器案例與正式建置檢查。

### 維持裝置本機儲存的項目

- [x] 音樂／音效開關與音量：現有 Cookie；不需要隨帳號跨裝置同步。
- [x] 駕駛控制與觸控配置 `skyline-rush-controls`、鍵盤改鍵 `skyline-rush-keymap`、AUTO `skyline-rush-auto`：裝置與輸入方式相關，維持 Local Storage。
- [x] 畫質／特效 `skyline-rush-vfx`、語言 `skyline-rush-locale`：維持 Local Storage，換裝置使用該裝置預設值或自行選擇。
- [x] 已選塗裝 `skyline-rush-paint`、最近 3 組 Custom 設定 `skyline-rush-recent-custom-v1`：屬便利偏好，維持 Local Storage；塗裝的**解鎖資格**由雲端星數還原。
- [x] Classic／Time Attack Ghost `skyline-rush-ghosts`、`skyline-rush-mode-ghosts-v1`：體積較大且可再跑出，保持裝置本機，不塞進 Firestore 進度文件。
- [x] 為 Ghost 設容量上限或遷往本機 IndexedDB，避免 Local Storage 額滿導致重要成果的本機副本無法寫入。（Classic／模式 Ghost 各限 512 Ki 字元，超過時淘汰最舊重播；單元測試驗證）
- [x] 教學已看／已完成、裝置效能提示：維持 Local Storage；瀏覽器資料清除後重新顯示不會損失遊戲成果。
- [x] 上次賽道 `skyline-rush-last-track` 與更新檢查標記：維持 Session Storage，僅供目前分頁使用。
- [x] 評估 Ghost 與偏好的可選匯出／匯入：目前維持裝置本機，理由與日後跨裝置方案見 `docs/cloud-save.md`；尚未提供這些項目的匯入／同步。

進度更新（2026-10-24）：Firebase 雲端儲存功能已由 `feature/firebase-cloud-save` 合併至 `main`（`671416cd`）；本分支整合 main，保留 MODE-00 TDD 與玩法項目。雲端存檔正式站與 Safari 驗收尚未完成；請依 `docs/cloud-save.md` 驗證。詳見 [階段 15](https://app.notion.com/p/4021a2df84a7817da29afa84cf8bb326)。

## 操作教學 v1（2026-10-23）

- [x] Desktop：靜態鍵盤示意與目前自訂按鍵、中英文說明。
- [x] Mobile：Slide／Buttons、加速、FLY、BOOST、NITRO 與暫停圖解。
- [x] Controls 可開啟並切換裝置說明；關閉後視為已看過教學（不再於載入時自動跳出，見下方首次開始流程）。
- [x] TDD 與整合驗證：首次／重開／儲存不可用／暫停、桌面與手機直橫向。
- [x] 搭配遊戲畫面、實際操作與逐步完成判定的互動教學（詳見下方互動操作教學）。
- [ ] 實體 iOS Safari／Android 觸控裝置驗收（目前以 Chrome 手機模擬驗證）。

驗證：379 項單元測試、正式建置通過；297 項瀏覽器案例中 290 項首輪通過、7 項重跑或修正後通過。語言測試的延遲音樂提示改用實際可見狀態處理，4 個使用檔案的 73 項相關回歸全部通過。畫面證據位於 `artifacts/control-guide/`。

## 互動操作教學（2026-10-23）

- [x] 真實 Free Drive 場景：加速、左轉、右轉、煞車、起飛、降落、BOOST、NITRO 八步，依實際輸入與車況判定完成。
- [x] 畫面提示與控制高亮；中英文、目前鍵盤配置、Slide／Buttons／Tilt、手機與平板直橫向。
- [x] 從操作教學與 Controls 開始；暫停、略過、退出、完成與重練流程。
- [x] 首次按「開始比賽」自動進入互動練習：「跳過」或完成後的「開始比賽」直接開始所選比賽；看過說明或練習後不再自動帶入，儲存不可用時每頁一次。
- [x] 教學隔離正式紀錄、解鎖、Ghost 與每日挑戰；退出還原原本選擇或暫停中的比賽。
- [x] TDD 單元、桌面與手機實際操作瀏覽器回歸、正式建置。
- [x] 傳送桌面／手機標註截圖與完成摘要。
- [x] 錄製桌面／手機八步操作影片並傳送 Telegram。
- [ ] 真機 Safari／Android／平板驗收（模擬器與瀏覽器尺寸測試不視為真機）。

驗證：444 項單元、325 項完整瀏覽器回歸及正式建置通過；最新教學檔案另由主代理獨立重跑 11 項全數通過。額外以繁體中文橫向 Slide 完成八步，提示卡與滑動區沒有重疊。截圖、桌面／手機影片與驗證說明位於 `artifacts/interactive-tutorial/`，均已透過 Telegram 傳送。教學採暫時標準按鍵位置；未授權 Tilt 暫用 Slide，旋轉仍可操作，退出即還原偏好。

Original baseline (everything below builds on these initial systems): a single 5 km coastal highway
sprint (`RACE_LENGTH`), 3 rivals, 36 recycled traffic cars, flight and BOOST sharing one `fuel` pool,
near-miss combos that recharge fuel, 7 purely decorative cyan rings in the sky (`world.js` gates),
and a single saved best time (`skyline-rush-best`).

Implementation rules: game rules live in the pure simulation layer `src/game.js`, test-first in
`tests/game.test.js` (TDD). `world.js` only renders, `main.js` owns the HUD and persistence. Pickup
and ring placement comes from a per-track seed so runs are reproducible and testable.

Branch rules: implement every new feature on its own new `feature/<name>` branch and commit to it
directly. Do **not** open a pull request for feature work.

Current scope: all gamepad-related work (input support, mapping UI, and acceptance checks)
is **Lowest priority** and **out of scope for this iteration**. Gamepad references below
describe future work, not current requirements.

Remaining open items are split into logic (Claude, `src/game.js` + `tests/game.test.js`) and UI
(Codex, rendering / HUD / browser specs) in
`docs/superpowers/plans/2026-10-20-remaining-items-split.md`, which holds the frozen UI
contracts, file ownership, the parallel schedule and the prompt for each AI; the sub-checkboxes
below mirror that split.

---

## 0. Desktop + mobile (applies to every item below)

Every item is done only when it works on both platforms. Targets match the viewports the browser
tests already use: desktop 1440×900, phone portrait 390×844 and 320×740, phone landscape 844×390
(touch). Desktop = keyboard (+ optional gamepad — **Lowest priority**, deferred; mouse for menus);
mobile = touch via the existing `(pointer: coarse)` detection and the `.touch-controls` layout.

### Shared rules

- **One input model**: every action is a named control in `input.js` (`fly`, `boost`, `nitro`, `brake`…)
  that keys, touch buttons, and gamepad (gamepad mapping — **Lowest priority**, deferred) all map to.
  Game rules never check the device
- **Same rules, same numbers** on both platforms; mobile only differs in layout, hints, and effect budget
- **Hints match the device**: desktop shows keys (`HOLD SPACE`), mobile shows button names (`HOLD FLY`),
  extending the existing `touchPreference` switch in `main.js`
- **Touch targets** ≥ 44×44 px, buttons never cover the car or the center callout area, respect
  `env(safe-area-inset-*)` for notches and home bars
- **Performance**: mobile gets a lower budget — smaller particle counts for pickups / drift / ring bursts,
  capped pixel ratio, fewer simultaneous HUD animations; measure frame time on a mid-range phone before
  and after each item
- **Orientation**: portrait and landscape both playable; landscape is the recommended racing orientation
- **Tests**: each item's browser test runs at a desktop viewport and at least one touch viewport

- [ ] **Physical-device acceptance** (manual — user on a phone, not Claude / Codex work; steps in
  the split plan §A): measure before/after frame time on a mid-range phone and
  check Android/iOS hardware and Safari. The 2026-10-20 implementation checks below cover desktop
  and touch-browser viewports; this real-device gate remains open (see `docs/verification.md`).
  - [x] iOS Simulator Safari (iPhone 17, iOS 26.5), 2026-10-20: Coast and Neon, portrait and landscape, touch FLY works; it found and fixed two short-landscape layout bugs (HUD overlap, START RACE below the fold)
  - [x] Measurement tool: `?perf` shows racing frame-time p50/p95/fps over the last 20 s; checked in iOS Simulator Safari (p50 17.0 ms, p95 24.0 ms, 59.7 fps on the Mac GPU, so not a phone number)
  - [ ] Real phones: frame time p95 on a mid-range Android (Chrome) and an iPhone (Safari), read from `?perf`; the Android emulator's translated GPU (7.5 fps, black 3D canvas) cannot stand in for hardware

### Mobile control layout (with all new actions)

Two thumbs, so the right side must not need two simultaneous presses. Steering has two modes,
picked in Settings → Controls.

**Mode A — Slide steering (default)**: no precise left / right buttons. The whole steering half of
the screen is a slide pad; put the thumb down anywhere and slide.

```
 ┌────────────────────────────────────────────┐
 │                                            │
 │  ┌ ─ ─ steering pad ─ ─ ┐    [NITRO]       │
 │      ◀ ── (●) ── ▶          [BOOST] [ FLY ]│
 │  │   slide down = brake │                  │
 │  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘                  │
 └────────────────────────────────────────────┘
   steering hand                action hand
```

- [x] Touch-down point becomes the center; horizontal distance from it = steering amount
  (dead zone 6 px, full lock at ~60 px, analog in between — `stepRace` already accepts a fractional `steer`)
- [x] If the thumb slides past full lock, the center follows it, so steering back the other way responds immediately
- [x] Release = straight ahead (with lane assist from 7C if enabled)
- [x] **Slide down past ~40 px = brake**; down + sideways = **drift** (brake + steer), so brake and drift need no button
- [x] A faint floating ring + knob shows where the center and thumb are; it fades after a few seconds of play
- [x] Pad covers the bottom ~45% of its half of the screen, so it never blocks the car or the callouts

**Mode B — Buttons (classic)**: today's `[◀] [▶]` + `[BRAKE]` buttons, for players who prefer tapping.

```
 ┌────────────────────────────────────────────┐
 │                                            │
 │  [◀] [▶]                  [NITRO]          │
 │                       [BOOST]  [ FLY ]     │
 │  [BRAKE]                                   │
 └────────────────────────────────────────────┘
```

Shared by both modes:
- [x] **AUTO accelerator on by default on touch** (the existing assist), so no thumb is spent holding the throttle; the gas button stays available when AUTO is off
- [x] Action hand: FLY (largest), BOOST, NITRO in an arc around it; sliding between FLY and BOOST holds both (AIR DASH)
- [x] **Drift = brake + steer** in both modes, the same rule as the keyboard

### Settings → Controls (control customization)

Mobile:
- [x] **Steering mode**: Slide (default) / Buttons / Tilt (device orientation, asks permission only when chosen); physical-device calibration acceptance remains open above
- [x] **Handedness**: steering on left (default) / steering on right — mirrors the whole layout for left-handed players
- [x] **Slide sensitivity**: distance for full lock (40 / 60 / 80 px)
- [x] **Button size** (S / M / L) and **opacity**
- [x] **Edit layout**: drag each action button (FLY / BOOST / NITRO / and the classic buttons in mode B) to a new spot, with a live preview over a paused race; Reset to default
- [x] **FLY behavior**: hold (default) / toggle

Desktop:
- [x] **Key remapping**: click an action, press the new key; conflicts are flagged and swapped; Reset to default (the `J`/`K`/`L` alternates from 7B are part of the default map)
- [x] **Steering sensitivity** (from 7C)
- [ ] **Gamepad mapping view** — **Lowest priority**; out of scope for this iteration

Both:
- [x] Saved to `localStorage['skyline-rush-controls']` with try/catch like the existing VFX settings; invalid / outdated saves fall back to defaults
- [x] `input.js` reads the saved map; game rules stay device-agnostic
- [x] Acceptance: unit tests for slide → steer mapping (dead zone, full lock, center follow, slide-down brake) and key remap conflicts; browser test at touch viewports: slide steering moves the car, Buttons mode still works, mirrored layout and edited button positions survive reload

### Per-item platform notes

| Item | Desktop | Mobile |
|---|---|---|
| 1. Tracks | Track select with keyboard / mouse, arrow keys + Enter | Swipeable track cards; lighter roadside detail and fewer neon lights / rain particles on Neon Downtown |
| 2–3. Nitro | `E` and `L` | NITRO button in the right-thumb arc; the 3-segment bar sits next to the button so the thumb sees it |
| 4. Rings | Full burst particles | Smaller bursts; ring centers slightly more forgiving (+10% radius) since touch steering is coarser |
| 5. History | Table with columns, hover for details | Stacked cards, tap for details; sparkline fits 320 px width |
| 6. Others | Daily challenge / achievements in the menu | Same, plus share-result via `navigator.share` where available |
| 7. Controls | `J`/`K`/`L` alternate keys, key remapping, steering sensitivity; gamepad (**Lowest priority**, deferred) | Slide steering default, Buttons / Tilt modes, handedness mirror, editable layout, AUTO default, FLY toggle |
| 8. UI / motion | Full motion | Same motion with fewer simultaneous effects; `navigator.vibrate` haptics where supported |

---

## 1. Three new tracks

First make tracks data-driven: a `TRACKS` table (name, length, palette / sky, traffic density, rival
speeds, special sections, seed for pickups and rings), read by `createRace(trackId)`. The current
coast track becomes `coast`.

| Track | Length | Mood | Signature mechanic |
|---|---|---|---|
| **Neon Downtown** | 4 km | Rainy night, neon billboards, wet reflections | **Tunnels**: 4 m ceiling, flying too high hits the roof (barrier contact). Traffic density ×1.5, so more near-miss chances |
| **Canyon Skyway** | 6 km | Desert noon, red rock canyon | **Broken bridge gaps**: 2–3 missing road sections you must fly over; falling = slowdown and respawn past the gap. **Crosswind zones** keep pushing the car sideways |
| **Aurora Pass** | 5.5 km | Snowy night, aurora sky | **Ice patches**: slower steering response. **Uphill sections**: slower ground recharge, so pickups and rings matter more |

- [x] `TRACKS` table + `createRace(trackId)`; `coast` behaves exactly as today (existing tests stay unchanged)
- [x] Special sections described as `{ from, to, type }`; `stepRace` looks them up by current distance
- [x] `world.js` switches palette / sky / roadside decoration per track (procedural geometry only, no downloaded assets)
- [x] Track select in the menu; unlock rule: finish top 3 on the previous track
- [x] Acceptance: every track can be finished; tunnel roof hit, gap fall, crosswind, and ice each have a unit test

## 2. Power-up: NITRO

Separate from the existing BOOST: BOOST still burns fuel (sustained), NITRO is a **one-shot burst**
with its own `nitro` reserve.

Nitro pickups on the road and in the air, in tiers:

| Pickup | Look | Adds | Where |
|---|---|---|---|
| Nitro cell | Small blue canister | **+0.25** | On the road, common, laid out in rows |
| Nitro can | Orange canister | **+0.5** | On the road, between lanes, requires a lane change |
| Nitro tank | Large gold tank | **+1** | In the air (flight only) or inside traffic gaps |
| Overcharge core | Spinning rainbow core | **Fills to the cap** | One per track, placed in a high-risk spot |

Use (press `E` / touch NITRO button):
- [x] Spends **1 full charge** for 2.5 s: speed cap `MAX_SPEED + 30`, much stronger acceleration, wider FOV + the existing lens boost effect
- [x] Cannot fire with less than 1 full charge (HUD shows that charge's fill progress)
- [x] Pressing again during NITRO **extends it by 2 s** instead of stacking speed (keeps it controllable)
- [x] Hitting traffic during NITRO keeps more speed (retention 0.45 → 0.7), rewarding bold driving

- [x] `player.nitro` (float), `player.nitroTime`; `input.nitro` with the `E` key / touch button
- [x] `race.pickups` generated from the track seed as `{ distance, x, altitude, tier }`; pass-through check uses the same previousDistance → distance window as near-misses
- [x] Pickup effects reuse the `effects.js` particle pool; sounds reuse `audio.js`
- [x] Acceptance: tests for each tier's amount, "under 1 charge cannot fire", and "extend does not stack speed"

## 3. Nitro cap: up to 3 charges

- [x] Cap of **3 charges** (`NITRO_MAX = 3`). Once a charge reaches 1.0 the next one starts filling, up to 3.0
- [x] HUD: 3-segment capsule bar; full segments glow, the filling one shows its ratio, the whole bar pulses `NITRO MAX` at 3
- [x] **Overflow conversion**: pickups at the cap convert the excess into fuel (each 0.25 = +8 fuel), nothing is wasted
- [x] Chained bursts: with 3 charges, pressing 3 times gives a 6.5 s burst (2.5 s + 2 s + 2 s via the extend rule)
- [x] Tests: pickup 0.5 at 2.9 → nitro = 3 and 0.4 converted to fuel; using one charge takes 3 → 2

## 4. Special rewards for flying through rings

Turn the existing 7 decorative gates into interactive rings. Only passing through the center
(`hypot(dx, dAltitude) < radius`) counts. Colors mean rewards:

| Ring | Color | Reward |
|---|---|---|
| Charge ring | Cyan (current color) | +20 fuel |
| Nitro ring | Gold | +0.5 nitro |
| Slipstream ring | Purple | 3 s of BOOST that burns no fuel (slipstream tunnel visual) |
| Risk ring | Red, smaller radius, placed high | +1 nitro + large score bonus |
| Mystery ring | Rainbow | One at random: **Shield** (absorbs the next collision), **Magnet** (pulls nearby pickups for 5 s), **Ghost** (pass through traffic for 3 s), **Freeze** (rivals slow down for 2 s) |

**Ring chain bonus**: rings appear in groups of 3–5
- [x] Clearing a whole group = **PERFECT LINE**: extra +1 nitro and a big HUD callout
- [x] Missing one breaks the group bonus (individual ring rewards already earned are kept)

- [x] `race.rings` as `{ distance, x, altitude, radius, type, group }`, generated from the track seed
- [x] `world.js` gates read position / color from `race.rings`; a collected ring bursts once and every crossed ring disappears
- [x] Shield / Magnet / Ghost / Freeze as `player.effects = { shield, magnet, ghost, freeze }` (seconds remaining)
- [x] Acceptance: tests for center hit (grazing the edge does not count), PERFECT LINE, and each mystery effect

## 5. History

- [x] Save one record per finished race to `localStorage['skyline-rush-history']` (keep the latest 50):
      date, track, position, time, collisions, near-misses, rings / PERFECT LINEs, NITRO uses, score
- [x] Best time per track (replaces the single `skyline-rush-best`; migrate the old value to `coast` once)
- [x] History screen: list filtered by track, best-run marker, sparkline of the last 10 times
- [x] Career stats: races, wins, total distance, longest combo, most rings in one run
- [x] **Ghost race**: record the best run's `x / altitude` trace at 10 Hz and replay it as a translucent ghost car next time; can be turned off in settings
  - [x] Controls UI: ghost toggle and per-track replay status; 10 Hz recording, validation and translucent playback connected
- [x] If storage fails (private mode) the game keeps working, using the existing try/catch pattern
- [x] Acceptance: unit tests for write / read / 50-record cap / old-best migration; browser test for the History screen

## 6. Other ideas to make it more fun

Ordered by small effort, big fun:

- [x] **Style score**: near-misses, rings, PERFECT LINEs, airtime, and clean sections score points; 1–3 star rating at the finish, so there's something to chase besides winning
- [x] **Slipstream**: staying right behind a rival / traffic car for 1.5 s → speed cap +6 and +0.25 nitro
- [x] **Air tricks**: quick left-right flick while flying = barrel roll; land it → +0.25 nitro; a hard landing loses the reward (uses `landing.speed`)
  - [x] Logic (Claude): flick detection within 0.3 s of raw `steer` sign change while airborne → `player.trick = { dir, time, done }`; 0.7 s roll; landing with `done` and `landing.speed < 11` pays +0.25 via `addNitro`, ≥ 11 writes `trickPayout = { nitro: 0, hard: true }`; contact / roof hit / gap fall / early landing cancel without payout; 8 unit tests (plan §C)
  - [x] UI (Codex → Claude): `world.js` body roll (`rotation.z`), callouts `BARREL ROLL` / `TRICK +0.25` / `HARD LANDING`, `TRICK` flight-state label, whoosh cue, haptic on payout, browser test at desktop + 390×844
- [x] **Rivals use NITRO too**: give rivals personalities (NOVA steady, ORBIT loves flying, APEX late surge) plus light rubber-banding to keep races tense
- [x] **Daily challenge**: date-seeded track + modifier (no flight, double traffic, gold rings only…), with its own board in History
  - [x] History UI: today's track + modifier, start action and the daily board (fastest five)
- [x] **Achievements / medals**: first win, zero-collision finish, 5 PERFECT LINEs in one race, triple nitro chain…, shown in History
  - [x] History UI: four medal entries with awarded dates; award rules and persistence in `src/history.js`
- [x] **Shortcuts**: one flight-only elevated shortcut per track, with pickups but also risk
  - [x] Logic (Claude): `{ from, to, type: 'shortcut', x: ±7.5, altitude: 6 }` section on all four tracks; `player.inShortcut` (|dx| < 3, |dAltitude| < 2.5); inside: flight burns no fuel and the speed cap gets +12; `shortcutPylons(section)` every 100 m alternating ±2.2 m, hitting one is `barrier` contact; corridor cells + one tank from `createPickups`; 7 unit tests incl. the coast-sections assertion update, plus the `SHORTCUT / FLY HIGH` sign entry in `world.js` (plan §D)
  - [x] UI (Codex → Claude): `world.js` elevated deck + pylons via `shortcutPylons`, `SHORTCUT` label and entry callout, `∞` fuel budget while inside, `trackNotes`, browser test at desktop + 844×390
- [x] **Final sprint**: in the last 500 m the music speeds up (`audio.js` bpm) and rival gaps are shown, for comeback drama
- [x] **Cosmetic unlocks**: stars unlock car paint / tail light colors (visual only, no stat changes)
  - [x] Garage UI: live previews; best stars per track (summed) unlock Coral 3 / Glacier 6 / Aurora 9; equip is saved

## 7. Controls: easier handling, FLY + boost together, drifting

### 7A. Current problems (from `game.js` / `input.js`)

| Problem | Cause |
|---|---|
| Steering is twitchy, easy to hit the barrier | At high speed lateral speed caps at 12 m/s, so one lane (5 m) changes in ~0.4 s; steering responds in ~70 ms and input is digital (0 or ±1) |
| FLY + BOOST barely work together | Both drain the shared `fuel`: flight 19/s + BOOST 10/s = 29/s, empty in ~3.4 s, then `exhausted` forces the flight to end |
| Keyboard can't register the combo | W + A/D + Shift + Space is 4 keys; many keyboards ghost (drop key presses) |
| Touch can't FLY + BOOST at once | Touch has 6 buttons (left / right, FLY / BOOST, brake / gas) for two thumbs; with steering on the left and pedals on the right, FLY and BOOST can't both be held |
| Grazing the barrier is punished hard | Any barrier touch triggers `contact`: 0.75 speed retention and a 1.5 s cooldown, even for a light scrape |

### 7B. FLY and boost at the same time

- [x] **AIR DASH**: holding FLY + BOOST together caps the combined drain at **22/s** (instead of 29/s), keeping the `MAX_SPEED + 14` cap; HUD shows `AIR DASH`
- [x] **NITRO doesn't use fuel** (separate `nitro` reserve from item 2), so FLY + NITRO always works together; NITRO while flying = straight-line air dash
  - [x] Logic (Claude): already true in `game.js`; add the acceptance tests — `{ fly, nitro }` held 2 s → `thrusting`, `nitroTime > 0`, not `exhausted`, fuel down by 19/s only; `{ fly, boost, nitro }` keeps the 22/s AIR DASH drain and the `MAX_SPEED + 30` cap (plan §B; no new physics unless decision 1b is chosen)
  - [x] UI (Codex): flight-state label `AIR DASH · NITRO` when thrusting with NITRO active (`main.js:833`)
  - [x] Browser test: `tests/nitro-fly-browser.spec.js` holds FLY + NITRO at desktop and 844×390 touch
- [x] **Alternate keys**: right hand `J` = FLY, `K` = BOOST, `L` = NITRO, left hand stays on WASD, avoiding the Shift + Space conflict (original keys still work)
- [x] **Touch** (layout in item 0):
  - [x] AUTO accelerator on by default, so the right thumb is free for FLY / BOOST / NITRO
  - [x] FLY button can be set to "toggle" (tap to lift off and hold altitude, tap again to land), freeing the right thumb for BOOST / NITRO
  - [x] FLY and BOOST buttons sit side by side; sliding a finger onto the border between them activates both (uses the existing pointer tracking)
- [x] Acceptance: test `input = { fly: true, boost: true }` held for 2 s → `thrusting` and `boosting` both true, not `exhausted`, speed > `MAX_SPEED`

### 7C. Handling feel

- [x] **Steering curve**: input ramps to full over 0.15 s (like an analog stick); high-speed lateral cap 12 → 9 m/s; "Steering sensitivity" in settings
- [x] **Lane assist** (part of AUTO, can be turned off): releasing steering eases the car to the nearest lane center
- [x] **Barrier scrape**: shallow-angle touches become a "scrape" — 0.92 speed retention, car pushed back onto the road, no collision counted, combo kept; only head-on hits use the existing `contact`
- [x] **Forgiving hitbox**: vehicle collision width 1.9 → 1.7, so more "almost hit" moments become near-misses instead of crashes
- [x] **Takeoff buffer**: holding FLY below 18 m/s is remembered and lifts off automatically once fast enough (no need to press again)
- [x] **Glide**: releasing FLY in the air lowers fall acceleration 11 → 7 for more controllable, softer landings (`landing.speed`)
- [ ] **Gamepad support**: the browser's built-in Gamepad API, analog stick steering, triggers for throttle / brake — **Lowest priority**; out of scope for this iteration
- [x] Move the touch brake to the left thumb, next to steering (see item 0), so brake + steer = drift works on touch

### 7D. DRIFT (builds nitro)

Trigger:
- [x] Keyboard: at ≥ 45 m/s hold **brake + direction** (S + A/D) → drift instead of hard braking
- [x] Touch: the same brake + steer, both under the left thumb (no extra button)
- [x] Ground only (`altitude === 0`); taking off or crashing ends the drift

Physics:
- [x] Car body slides out 20–30° (`world.js` body yaw), arc still controlled by steering
- [x] Drifting only bleeds a little speed (−3 m/s², normal braking is −35)
- [x] Near-miss combo points ×2 while drifting

**Nitro build-up** (longer drift, bigger reward on release, like a mini-turbo):

| Drift time | Spark color | Reward on release |
|---|---|---|
| ≥ 1 s | Blue | +0.15 nitro + 0.5 s mini boost |
| ≥ 2 s | Orange | +0.3 nitro + 0.8 s mini boost |
| ≥ 3 s | Purple | +0.5 nitro + 1.2 s mini boost |

- [x] Rewards count toward the 3-charge cap; overflow converts to fuel per item 3
- [x] Hitting a car / barrier mid-drift → the build-up is lost
- [x] Visuals / audio: tire smoke and sparks share the `effects.js` particle pool; add tire screech to `audio.js`
- [x] `player.drift = { time, dir }`; brake + steer derives drift, and `stepRace` handles enter / hold / release payout
- [x] Acceptance: tests for no drift below 45 m/s, the three time thresholds and rewards, crash cancels, no drift in the air

## 8. UI / UX polish and animation

### 8A. Original gaps (status tracked in 8B)

- Speed, position, and timer numbers just swap text every frame, with no motion
- Leaderboard rows jump when positions change, with no reorder animation
- The results overlay appears instantly; finishing a race has no "moment"
- Fuel bar only has a 0.1 s linear width transition; no feedback when it's low or refilling
- Near-miss, impact, and boost feedback is text-only in small HUD labels and easy to miss mid-race
- Screen changes (intro → countdown → racing → pause → results) are mostly hard cuts

### 8B. Improvements

- [x] **Animated numbers**: speedometer needle / arc that eases with speed; position number flips with a ↑ green / ↓ red pulse when you gain or lose a place
- [x] **Leaderboard reorder**: FLIP animation (measure old/new row positions, animate `transform`) when places swap
- [x] **Event callouts**: center-screen pop-ups that scale in and fade out for `NEAR MISS ×3`, `PERFECT LINE`, `NITRO`, `+0.5`, drift spark tiers; queue them so they don't overlap
- [x] **Gauges**: fuel and the 3-segment nitro bar ease (not linear), flash red under 20%, shimmer while refilling, pulse when a nitro charge completes
- [x] **Finish sequence**: render-only coast over the line (~0.6 s), camera swings to a side view, then the results card slides in; stats count up one by one; stars pop in; "NEW BEST" stamp; official timing/results are frozen before presentation
- [x] **Screen transitions**: intro slides out as the countdown lights drop in; pause blurs and dims the scene; restart wipes instead of cutting
- [x] **Countdown**: start lights turn on one by one with a sound tick; "GO" bursts out with a short camera push
- [x] **Button feel**: press scale (0.96) + release spring on all buttons; touch buttons glow while held; optional haptics via `navigator.vibrate` on mobile for impacts, nitro, and drift payout
- [x] **Menu**: track select cards with a looping preview of the track's sky / palette; History screen slides in from the side
- [x] **Consistency**: one shared set of motion tokens in `style.css` (`--ease-out`, `--ease-spring`, `--dur-fast` 120 ms / `--dur-base` 240 ms / `--dur-slow` 480 ms) used by every new animation
- Rules: animate only `transform` / `opacity` (no layout thrash on the hot render path); every new animation respects the existing `prefers-reduced-motion` and "comfortable" settings by falling back to an instant or fade-only version
- [x] Acceptance: browser tests verify callout lifetime, results after the finish sequence and reduced-motion behavior; short local Chrome samples show no frame-cadence drop (desktop callback p95 increased 1.8 → 2.9–3.0 ms). See `docs/verification.md`; physical-device performance remains unverified.

---

## Suggested order

1. **Control fixes** (7A–7C: AIR DASH drain, alternate keys, steering curve, barrier scrape) — small changes, immediately better feel
2. Track data refactor (pure refactor, `coast` behavior unchanged) — everything else depends on it
3. NITRO + 3-charge cap + pickups (items 2 and 3 together)
4. DRIFT (7D, needs the nitro reserve)
5. Interactive rings and rewards (item 4)
6. UI / UX polish (item 8) — motion tokens and callouts first, since items 2–4 need them to be readable
7. History + per-track best + ghost (item 5)
8. Three new tracks (content part of item 1)
9. Pick from item 6
10. **Gamepad support + mapping view** — **Lowest priority**; deferred beyond this iteration


---

## 9. Game modes and race-session configuration (new roadmap — 2026-10-22)

**Status:** Sections 9–13 are a feature roadmap; checked entries are implemented and have passed
targeted verification on `feature/race-modes-p0`. Larger acceptance gates remain unchecked
until the complete requirement and required browser/device testing pass.
The original 2026-10-22 roadmap had all tasks unchecked.
The preceding sections (0–8) are the existing implementation history; do not reset their
completion state or regress Classic Race. Priority labels: **P0** = first release, **P1** =
second wave, **P2** = larger/long-term work. Keep the existing 10 tracks, official unlock
rules, track showcase parity, NITRO/FLY/BOOST, rivals, daily challenges, Ghost, Garage,
saved history, English/Traditional Chinese UI and production-only access restrictions.

**Design boundary:** All 10 current tracks are **point-to-point sprint courses**, not closed
circuits. A repeat of the same sprint or a multi-stage event is **not** a seamless lap. The
actual closed-circuit/1–3–5 lap feature below needs genuine looped route geometry and
checkpoint validation; merely multiplying `race.length` or resetting distance would be wrong.

### 9A. Common mode/session model (P0; prerequisite)

- [x] **MODE-00 — Versioned `RaceConfig` / session contract.** Define a validated, serializable
  configuration with stable fields such as `mode`, `trackId`, `seed`, `rivalCount`,
  `aiDifficulty`, `trafficDensity`, `itemsEnabled`, `collisionRule`, `ghostEnabled`,
  `durationSeconds` / `stageCount` (only when applicable), `visualPreset` and `rulesVersion`.
  Declare mode-specific allowed options and defaults in a pure module; distinguish
  **simulation rules** from **visual-only** settings.
- [x] Extend/refactor `createRace(trackId, options)` (or add a compatible wrapper) to build
  sessions from `RaceConfig` **without breaking** existing `createRace('coast')` and
  `createRace(trackId, dailyModifier)` callers. Keep the current Daily Challenge seed,
  modifier rules and official Classic Race parameters identical.
- [x] Model explicit objectives and completion conditions per mode: `placement`,
  `finish-time`, `score-target`, `checkpoint-timer`, `stage-points`, `survival` or
  `no-auto-finish`. Do not keep reusing `race.length` completion for every mode.
- [x] Separate `Classic / Campaign` from `Custom / Practice / Challenge` in eligibility:
  only qualifying Classic finishes unlock the next track or award career progression.
  A local test-all-unlocked run must never grant unlocks, stars or achievements.
- [x] Produce deterministic simulation seeds for traffic, checkpoints, obstacles and items
  with **separate named streams**, so adding decoration or an option cannot silently
  reshuffle the original pickups or rings. Validate finite coordinates and bounded counts.
- [ ] **Acceptance:** unit tests cover old call signatures, default-rule parity,
  incompatible/unknown options, deterministic replay, mode-specific finishing and
  access rules; all ten existing courses remain raceable.

**MODE-00 implementation / verification (2026-10-23):** On
`feature/mode00-objective-contract`, the pure, JSON-serializable `createRaceSessionContract`
now separates fixed gameplay rules, a per-track seed, and presentation-only metadata
(ghost visibility and visual preset). `validateRaceRequest` rejects invalid/unsupported
new user options; tolerant legacy `normalizeRaceConfig` and existing mode best/Ghost
signatures remain unchanged. Existing named RNG streams are centralized without
changing their string values, and all nine shipped modes now have explicit finish
objectives (Cup = stage-points; Stunt = timed-score; Free Drive = no auto-finish).

Targeted unit tests **passed** at `da3d81a` (GitHub Actions
`39865378561`). RED evidence: the Cup objective expectation fails at
`2ce05e5` (run `39864803654`, unit job); implementation GREEN at
`da3d81a`. The previous full CI had failed browser shards even though
unit/smoke/World Tour passed, and main's prior run also contained browser
failures. Do not mark the stage-wide acceptance as done or merge until
**the final SHA** has all required CI checks green.


**MODE-00 deterministic seed / bounds completion (2026-10-23):** RED tests at
`6d5f9ff` ([run #39939858288](https://github.com/weskao/skyline-rush/actions/runs/39939858288)); GREEN at
`b1edafb` ([run #39940097050](https://github.com/weskao/skyline-rush/actions/runs/39940097050)):
focused tests, full `npm test`, and `npm run build` passed. Stable, isolated
32-bit seeds now exist for traffic, checkpoints, authored world obstacles,
active items, original pickups/rings and hazards. Authored traffic/checkpoint
layouts and Classic/Daily replay signatures remain unchanged. Ten track layouts,
finite entity positions, bounded counts and invalid external geometry are covered.
**Stage-wide acceptance remains open** until required browser/physical-device
checks and access/persistence regressions are independently verified.

Still open: stage-wide mode acceptance, browser and physical-device
performance/UX checks. Traffic and checkpoint layouts intentionally remain
authored and deterministic; newly named seeds are available if those layouts
later become procedural, without changing Classic/Daily replay rules.
No operation-guide files, audio or UI were changed by MODE-00; no new sound
cue is warranted for these pure simulation contracts.

---

### 9B. Free Drive / Practice mode (P0)

- [x] **MODE-01 — Free Drive v1:** drive and fly on any **already unlocked** course with
  no finishing position, mandatory countdown, AI race placement or automatic victory.
  Add a visible return/restart control and an optional one-tap reset-to-start.
- [x] Allow selectable **no AI**, traffic density and item availability. Reuse existing
  steering, cameras, drift, FLY, BOOST, NITRO and 3D scenery; do not build a new
  physics engine.
- [x] At the authored end of an open sprint, offer **Restart / Choose Track / End
  Session**, or stop safely in a designated free-drive area. Do **not** claim
  endless roadway, reverse-map continuity or loop back to the start until implemented.
- [x] Optional practice HUD: current speed, air time, travel distance, max speed,
  clean near-miss chain and trick counter; hide rival position and race countdown.
- [ ] **Acceptance:** crossing the old finish cannot save an official best, stars,
  campaign unlock or Daily record; exit/restart/pause work for keyboard and touch;
  world buffers do not grow across repeated sessions.

### 9C. Custom Race (P0)

- [ ] **MODE-02 — Custom Race:** choose an unlocked track, 0–3 rivals, AI
  **Easy / Normal / Hard**, traffic **Off / Light / Normal / Heavy**, power-ups
  **On / Off**, collisions **Normal / Relaxed**, Ghost visibility and weather/time
  **visual preset**. Preserve original defaults in Classic mode.
- [x] AI difficulty adjusts clearly named parameters (target speed, mistake rate
  or rubber-band bounds) without breaking current rival personalities `NOVA`,
  `ORBIT` and `APEX`. Support 0, 1, 2 and 3 rivals correctly.
- [x] Offer a longer session with **1 / 2 / 3 / 5 sprint stages** (same or selectable
  unlocked courses), but label it **stages / heats**, not circuit laps; show aggregate
  time or points explicitly and reset physical state between stages.
- [x] Support validated presets **Standard / Traffic Rush / No Items / Air Focus /
  Precision** and a custom configuration, all with one-tap Reset to Default.
- [ ] **Acceptance:** generated item/traffic counts, HUD placement labels, AI finish
  detection and results all work with 0 rivals; Custom scores never overwrite
  Classic or Daily records.

### 9D. Time Attack / Ghost Trial (P0)

- [x] **MODE-03 — Time Attack:** solo fixed-course trial with clean start/finish,
  immediate retry and best time per stable `trackId + mode + ruleset`. No rival
  race position or opponent-driven rubber banding.
- [x] Reuse the existing 10 Hz best-run Ghost when the recorded trace and rules
  are compatible; show `Ahead / Behind` split against the personal record.
  Keep separate Ghost data for mode-specific bests if necessary.
- [x] Optional **Clean Time Trial** variant: collisions invalidate a clean medal or
  apply an explicit time penalty; do not silently change legacy physics.
- [ ] **Acceptance:** timed results/ghosts remain isolated from Classic bests;
  blocked localStorage never prevents play; mobile HUD remains readable.

### 9E. Stunt & Style Attack (P1)

- [x] **MODE-04 — Stunt Attack:** timed 2 / 3 / 5-minute score run for air tricks,
  sustained drift, near-misses, rings, PERFECT LINE groups and flying shortcuts.
  Reuse existing `player.score`, `trick`, `drift` and ring events.
- [x] Add explicit style-combo multiplier, clean landing bonus and fair combo
  break/decay on crashes; prevent stationary or repeated reset farming.
- [x] Save best score, combo, air time and medal thresholds by exact track/ruleset.
- [ ] **Acceptance:** deterministic scoring independent of FPS and input device;
  end-of-timer results work without reaching the sprint finish.

**Stunt best persistence (2026-10-23):** RED [`b4c4262`](https://github.com/weskao/skyline-rush/commit/b4c4262cc4557d58cf58243f99f078dfcc54f863),
[Actions #39940564407](https://github.com/weskao/skyline-rush/actions/runs/39940564407);
GREEN [`5a7cb28`](https://github.com/weskao/skyline-rush/commit/5a7cb2886613a319a6dcb70ecc5293abfd3b99a2),
[Actions #39940729574](https://github.com/weskao/skyline-rush/actions/runs/39940729574).
Stores a validated, rule-scoped personal best score, longest combo, longest air
time and derived medal; 50-run history rotation cannot lose lifetime bests.
Existing records and Classic unlock rules are unchanged. Focused MODE-00 tests,
full `npm test` and production build passed. Frame-rate/device acceptance remains open.

### 9F. Checkpoint Rush (P1)

- [x] **MODE-05 — Checkpoint Rush:** pass a deterministic sequence of grounded or
  aerial gates before time expires; each clean gate extends the timer.
- [x] Choose checkpoints from the **real track route and reachable flight envelopes**;
  prevent impossible gates inside tunnel roofs, road gaps or conflicting hazards.
- [x] Show next target distance/direction, time left, checkpoint chain and optional
  perfect-gate rewards. Invalid/missed gates cannot secretly count.
- [x] **Acceptance:** gated time-extension and expiry have unit tests; minimap
  uses the official main route and never reveals hidden shortcut geometry.

**MODE-05 gate route/clearance verified (2026-10-23):** RED
[`9be5f04`](https://github.com/weskao/skyline-rush/commit/9be5f04effbc832599dd1488ec4478c5fb7d086b)
([Actions #39943129958](https://github.com/weskao/skyline-rush/actions/runs/39943129958)):
three obstacle avoidance/bounds tests failed as intended. GREEN
[`b4c2d17`](https://github.com/weskao/skyline-rush/commit/b4c2d17071f0e148399d3b83ad75e5e791be7c76);
ten-route real-scenery regression [`88c7aa0`](https://github.com/weskao/skyline-rush/commit/88c7aa0ac4c0ed16e5473c2828ba484580ff24d7).
[Actions #39943573134](https://github.com/weskao/skyline-rush/actions/runs/39943573134):
focused MODE-00, full unit suite, production build and desktop Checkpoint Rush
WebGL browser smoke all GREEN; an actual game screenshot is in the
`checkpoint-rush-gameplay` Actions artifact. Lane selection avoids authored
roadside obstacle bounding boxes; impossible gates are skipped, and existing
70 m tunnel/gap/shortcut safety buffers remain. Full stage acceptance and
physical-device checks are still open.

**MODE-05 navigation and route acceptance (2026-10-23):** The existing
[`checkpoint-navigation.test.js`](https://github.com/weskao/skyline-rush/blob/feature/mode00-objective-contract/tests/checkpoint-navigation.test.js)
and [`checkpoint-expiry.test.js`](https://github.com/weskao/skyline-rush/blob/feature/mode00-objective-contract/tests/checkpoint-expiry.test.js)
cover precise/near/missed-gate scoring and fair timer expiry. The authored
[`route-map.test.js`](https://github.com/weskao/skyline-rush/blob/feature/mode00-objective-contract/tests/route-map.test.js)
covers all ten official main-route polylines; hidden shortcut geometry is
not part of the route samples. Browser assertions
[`391b28f`](https://github.com/weskao/skyline-rush/commit/391b28fd199a3a9fe04fba7b1d1ea41bd31d0d85)
verify gate count, perfect count, distance, directional cue, remaining time.
[Actions #39944609373](https://github.com/weskao/skyline-rush/actions/runs/39944609373)
passed full unit tests, build and real desktop WebGL smoke. Mobile/device
acceptance remains under the shared stage-wide QA, not claimed here.

### 9G. Multi-track Championship Cup (P1)

- [x] **MODE-06 — Championship:** select a curated 3–5-track cup consisting of
  **unlocked** stages; award stage ranking points and a clear final champion.
- [ ] Preserve stage standings across transitions with fair AI participation,
  an explicit continue/retry flow, and optional saved in-progress cup recovery.
- [x] Distinguish cup medals/bests from individual Classic times; a cup does
  not grant unearned unlocks for stages skipped or completed in practice mode.
- [ ] **Acceptance:** ties, quit/resume, mid-cup restart, 0-rival rejection and
  incomplete data produce deterministic, understandable results.

### 9H. Obstacle Gauntlet (P1)

- [ ] **MODE-07 — Obstacle Gauntlet:** fixed-seed hazard challenges with
  escalating moving gates, road barricades, flying hoops, debris and safe/risky
  alternate lines. Keep the ordinary track drivable in Classic mode by default.
- [x] Add difficulty tiers based on warning time, obstacle spacing and
  activation frequency **without random unavoidable collisions**.
- [x] Score clean obstacle passes, near-misses and finish time; practice and
  obstacle-mode records stay separate.
- [x] **Acceptance:** each generated hazard arrangement leaves a reasonable
  passable ground/air path and has predictable collision tests.

**MODE-07 scoring TDD (2026-10-23):** RED
[`60a5e99`](https://github.com/weskao/skyline-rush/commit/60a5e99edfabc4c91d164ef6894c5ce52a2a5769)
([CI #39945677012](https://github.com/weskao/skyline-rush/actions/runs/39945677012));
GREEN [`7fbb126`](https://github.com/weskao/skyline-rush/commit/7fbb12667ae0372a7bb16876164df004f05bcd11)
and WebGL smoke [`c2b6c8e`](https://github.com/weskao/skyline-rush/commit/c2b6c8ef68b7b46d893b5d9a7800bd1038884061).
A safe barrier pass earns 150 points, a close clean near-miss earns 300
and increments the once-only nearMisses counter. Challenge records remain
isolated from Classic Career. Focused/unit/build/actual WebGL smoke all passed
[CI #39945865189](https://github.com/weskao/skyline-rush/actions/runs/39945865189).
Full route navigability and hazard arrangement acceptance remain open.

**MODE-07 generated-route acceptance (2026-10-23):** RED
[`25e74f9`](https://github.com/weskao/skyline-rush/commit/25e74f9d3c3a20a6f40c052fc609ab2b9032260d)
([CI #39946490119](https://github.com/weskao/skyline-rush/actions/runs/39946490119))
demonstrated hazards placed over raised shortcut approaches and nonfinite
positions under invalid elapsed time. GREEN
[`8455a70`](https://github.com/weskao/skyline-rush/commit/8455a70b48be24eea0f74f948b576830152174e1)
([CI #39946619729](https://github.com/weskao/skyline-rush/actions/runs/39946619729)):
all ten tracks in standard/extreme tiers remain deterministic; at least two
ground lanes and the air path are open at sampled motion times; spacing,
safe section buffers and once-only collision/scoring tests pass. Full unit
suite, production build and real WebGL smoke all GREEN. Device-specific
manual QA remains tracked separately.

### 9I. Elimination / Last Racer Standing (P2)

- [x] **MODE-08 — Elimination:** after an announced interval/checkpoint, eliminate
  the last active racer until one remains; show a readable knockout countdown.
- [x] Define whether the player loses immediately or gets one short comeback window;
  do not eliminate AI simply because an actor is off-camera.
- [x] **Acceptance:** active AI count/rank changes cleanly; results work after
  early elimination and never award Classic progression.

**MODE-08 elimination finishing/acceptance (2026-10-23):** RED
[`884e057`](https://github.com/weskao/skyline-rush/commit/884e057659c21c711b53b5e7008ffed2801a42b0)
([Actions #39944092143](https://github.com/weskao/skyline-rush/actions/runs/39944092143))
exposed fixed-fourth-place results for second/third-round player eliminations.
GREEN [`da8bd45`](https://github.com/weskao/skyline-rush/commit/da8bd4550226334138d2a29697a28a2646b3e571):
position derives from actual contenders left; knockouts are based on track
progress, not render/camera visibility. Tests
[`912a832`](https://github.com/weskao/skyline-rush/commit/912a83264a23459068d1b37cd0645587fc4846d1)
prove losses never persist results and challenge wins never grant Classic unlocks.
[Actions #39944609373](https://github.com/weskao/skyline-rush/actions/runs/39944609373):
unit suite, production build, Checkpoint Rush and Elimination live WebGL browser
smoke all GREEN. Device-specific QA belongs to shared manual acceptance.

### 9J. Endless Highway / Distance Survival (P2)

- [ ] **MODE-09 — Endless Highway:** deterministic extension/streaming **beyond**
  the fixed 4–8 km authored tracks; progressively increase challenge and record
  longest distance/survival score.
- [ ] Build extendable road geometry, scene chunks, encounter seeds, objective
  markers, camera/traffic recycling and safe recovery. Respect absolute distance
  to avoid repeated scenery, teleporting objects or floating-point problems.
- [ ] Keep memory/GPU resources bounded after lengthy play; verify pause, resume,
  context loss and browser tab backgrounding.
- [ ] **Acceptance:** play can continue past the former end without hitting
  clamped `trackPoint()`, missing geometry, a fake lap or an unintended finish.

### 9K. Event Lab Lite / course creator (P2)

- [ ] **MODE-10 — Event Lab Lite:** begin with **preset course modifiers** and
  validated placement templates (cones, barricades, ramps, gates, pickups,
  checkpoints), not a full free-form level editor.
- [ ] Add a later visual designer for positioning supported objects on unlocked
  courses, with snap-to-lane, collision previews, Undo/Redo and Reset.
- [ ] Import/export **versioned, size-limited JSON** that validates track IDs,
  geometry bounds, obstacle count, segment reachability and sanitizes labels;
  no script execution, remote code, or dependency on online accounts.
- [ ] Community sharing or multiplayer uploads require a separate backend,
  moderation/storage and security design; **not** part of offline-first v1.
- [ ] **Acceptance:** creation and replay produce the same stage with the same
  seed on desktop and mobile; malformed/corrupt creations fail safely.

## 10. Mode-selection UX, race settings, true laps and saved progress

### 10A. Start-screen setup and player experience (P0)

- [ ] **UX-01 — Mode-first flow:** `Choose Mode → Choose Unlocked Track →
  Configure Rules → Start`. Retain the current animated 3D track previews,
  vehicle scale, three-rival showcase, full-route maps and mobile usability.
- [ ] Use a compact, readable configuration panel rather than filling every
  track card with controls; allow mode descriptions, Restore Defaults and a
  preview/summary of active rules before Start.
- [ ] Disable or explain unsupported combinations (e.g. lap count on open
  sprint, elimination with 0 AI, no-flight over mandatory bridge gaps,
  checkpoint in unreachable aerial areas).
- [ ] Add appropriate pre-race options for AI 0–3, AI difficulty, traffic
  density, pickups, collision severity, Ghost, stage count, timed duration,
  cosmetic scenery/weather, item rules, and per-mode eligibility.
- [ ] Saved user presets must not alter unlocks, reward eligibility or
  existing `skyline-rush-controls` / `skyline-rush-history` formats.
- [ ] All labels, option descriptions, countdowns, HUD outcomes, tooltips,
  error messages and results are localized in **English and zh-TW**, live
  switchable without changing stable track/mode IDs.
- [ ] Preserve keyboard, pointer and mobile touch navigation, visible focus,
  readable contrast, safe-area layout and reduced-motion/Comfort settings.

### 10B. Honest laps versus repeated sprints (P2)

- [x] **LAP-01 — Separate session types:** support multi-stage/repeated
  **point-to-point** sprints first (P0/P1), and label them “Stage 1/3”,
  not “Lap 1/3”. The original 10 tracks must keep their authored geography.
- [ ] **LAP-02 — Genuine closed circuits:** author at least one actual loop
  whose start/finish world position, tangent, road banking and width connect
  continuously; do **not** fake it with instant distance wrap.
- [ ] **LAP-03 — Configurable 1 / 3 / 5 laps** only on circuits with a valid
  topology; lap timer, personal best lap, total race time, split sectors,
  lap HUD, AI lap standings and finish sequence.
- [ ] **LAP-04 — Anti-shortcut checkpoints:** ordered sector validation
  prevents crossing the finish backwards, flying over the finish repeatedly,
  teleports or respawns from granting false laps.
- [ ] **Acceptance:** completion requires the configured number of valid
  laps; player/AI cameras, positions, world props, mini-route map, Ghost,
  checkpoints and collision physics remain continuous across every seam.

### 10C. Result/history isolation and safeguards (P0)

- [x] Store a stable `modeId + trackId + rulesVersion + rulesSignature` on
  each **new-mode** result, plus appropriate time, score, distance,
  stage/lap data and item/hazard statistics. Keep legacy history readable.
- [x] Show per-mode bests, mode-filtered History and applicable Ghosts;
  clearly distinguish personal practice milestones from official medals.
  Verified 2026-10-24: 10C History WebGL browser regression, mode-focused tests,
  full unit suite and production build passed on `cc24bb8c` (CI `40071240211`).
  English/zh-TW notice, filters, PB and Ghost badges have complete translations;
  unrelated full-browser CI shards and hardware QA remain tracked independently.
- [x] Use validated persistence with storage-failure fallbacks, reasonable
  caps and migration tests; prevent a custom “no traffic” best from
  replacing an official Classic best.
- [ ] Keep Classic Career unlocks, 1–3 stars, Garage paint unlocking,
  achievements and Daily Challenge board isolated from custom/free-drive
  sessions unless a specific future rule explicitly grants eligibility.
- [ ] Pausing, restarting, exiting, switching modes or closing a dialog
  cannot double-write a result or award the same benefit twice.

**10C versioned mode records (2026-10-23):** RED
[`e3581a7`](https://github.com/weskao/skyline-rush/commit/e3581a704557506d5dcb669b3ad253d8a10c6281)
([Actions #39945181620](https://github.com/weskao/skyline-rush/actions/runs/39945181620));
GREEN [`d25d025`](https://github.com/weskao/skyline-rush/commit/d25d0252dba9d0aac2ab691a090dbc5fdc6582cc)
([Actions #39945279475](https://github.com/weskao/skyline-rush/actions/runs/39945279475)).
New-mode runs store additive `modeId`, `trackId`, `rulesVersion`,
`rulesSignature`, finite distance, sprint stage count (no fake circuit laps),
bounded item activations and hazard statistics. Legacy records remain readable;
no new storage key or changed best comparison; Classic history and unlocks
remain isolated. Focused and full unit tests, production build, and two
real desktop mode smoke tests passed. Other 10C UI/persistence acceptance
items remain open.

**10C storage safety TDD (2026-10-23):** RED
[`d78e717`](https://github.com/weskao/skyline-rush/commit/d78e7178ef0314dd5f87eb224f12b0d72c59329d)
([CI #39947103275](https://github.com/weskao/skyline-rush/actions/runs/39947103275))
exposed invalid saved mode history, overlong rule strings and impossible
new-mode records. GREEN
[`3d4a5a8`](https://github.com/weskao/skyline-rush/commit/3d4a5a89cce60fab595ac1c1e7b4c9a23d6dda09)
([CI #39947280443](https://github.com/weskao/skyline-rush/actions/runs/39947280443)):
preserve legacy v1 records without newer metadata, filter non-existent
tracks/bad positions/nonfinite or negative scores, cap times and rules,
retain 50 latest valid runs and fail safely when storage is blocked.
New-mode custom/no-traffic results cannot replace official Classic bests
or unlocks. Focused/unit/build/real browser mode smoke all pass.

## 11. Interactive scenery, track hazards and procedural world props

### 11A. Data model and runtime behavior (P1)

- [ ] **ENV-01 — Typed object catalog:** separate
  **visual-only scenery** (buildings, crowds, parked trains, signs, lamps,
  spaceships) from **collidable / triggerable gameplay objects**.
- [ ] **ENV-02 — Deterministic hazard schema:** define bounded properties
  such as `id`, `trackId`, `distance`, `lateralOffset`, `altitude`,
  `type`, `hitbox`, `triggerWindow`, `warningLeadSeconds`,
  `movementPattern`, `difficulty` and `seed`.
- [x] **ENV-03 — Logic/render separation:** calculate hits, passes,
  rewards and state changes in the pure simulation (`src/game.js` or
  extracted rules module), not by reading Three.js mesh positions.
  Render exactly the hazard state described by the simulation.
- [ ] **ENV-04 — Hazard behaviors:** static cones/barricades, moving
  side-to-side gates, periodic energy barriers, falling debris/rocks,
  wind gusts, hazardous terrain, rotating rings, rail crossing events
  and safe/risky branch markers.
- [ ] **ENV-05 — Safety/readability:** visible anticipation cues, adequate
  reaction distance at maximum NITRO speed, accessible color+shape
  signals, a reachable escape route, and forgiving hitboxes on touch.
  Hazards must not randomly spawn inside the player.
- [ ] **ENV-06 — Reusable renderer:** pool or instance shared meshes and
  emitters, load/unload by visible distance with bounded chunk lifetime,
  no new material/geometry allocations every frame, and stable
  Low/Medium/High quality fallbacks.
- [ ] **ENV-07 — Play-mode switches:** allow hazards Off / Standard /
  Extreme only where a mode supports that option; Classic uses the
  existing base behavior until intentionally updated.
- [ ] **Acceptance:** deterministic placement, cross-frame collision
  sweeps, warning timing, out-of-range cleanup, no impossible gates
  and no device-specific simulation differences.

### 11B. Track-specific gameplay identities (P1)

- [ ] **Coast:** scattered cargo, gust warnings and temporary shoulder
  closures; combine clean high-speed overtakes with coastal visibility.
- [ ] **Neon Downtown:** animated construction barriers, temporary lane
  closures, traffic diversions and readable neon gate timing.
- [ ] **Canyon Skyway:** warned falling rocks, cliff-side debris,
  precision launch ramps and risk/reward routes over broken bridges.
- [ ] **Aurora Pass:** snowbanks, localized low-grip ice bends,
  timed blizzard visibility and safer alternative lines.
- [ ] **Sky Spiral:** rotating light hoops, synchronized aerial gates,
  changing platform barriers and airborne precision scoring.
- [ ] **Taipei Heritage:** festival street furniture, temporary
  boulevard closures and scenic props, while preserving landmark
  visibility and the existing curated ready-screen showcase.
- [ ] **Tokyo Afterdark:** traffic-control signals, timed gates,
  neon construction equipment and dynamic but fair crossing events.
- [ ] **Alpine Rail Pass:** avalanche warnings, snow drift obstacles,
  passing trains as scenery, and rail-crossing interactions **only**
  where real drivable-road geometry and clearance permit them.
- [ ] **Coastal Horizon:** wave-spray warning zones, crosswinds,
  lighthouse-side narrow bridge obstacles and safe shoulder routes.
- [ ] **Cosmic Orbit:** floating asteroid fragments, moving energy
  barriers, low-gravity sectors and aerial gate sequences.
- [ ] **Acceptance:** every themed hazard has at least one collision/
  reward test and an in-game desktop + mobile visual check; never let
  hero landmarks or scenery block the route unexpectedly.

### 11C. More visual world richness (P1)

- [ ] Add **non-colliding** per-track detail sets: spectators, billboards,
  parked service vehicles, rail platforms, moving background trains,
  signs, drones/ships, coastline spray, atmospheric lights and skyline
  animation. Reuse `world-tour-scenery.js` placement planning, batching
  and chunk lifecycle when applicable.
- [ ] **Weather/time-of-day presets:** daylight, dusk, night, rain/fog,
  snowfall or aurora where stylistically appropriate; start with
  visual-only overrides. Treat physical wet-grip/wind changes as
  opt-in, independently tested rules rather than surprise difficulty.
- [ ] Respect `track-showcase.md`: every new or changed course ready
  screen must still show the player, three rivals, visible jets,
  appropriate chase camera and recognizable track world.
- [ ] Degrade particle density, transparent overlays and shadow/light
  count on weak hardware without removing essential hazard silhouettes
  or necessary traffic warnings.

## 12. Items, pickups, active inventory and bonus challenges

### 12A. Turn current ring effects into optional active items (P1)

- [x] **ITEM-01 — Single item slot:** pick up and hold one active item;
  show icon, ready/held state, cooldown and an accessible Activate
  action on keyboard and touch. Keep NITRO and FLY/BOOST as separate
  systems; do not overload existing controls without remapping.
- [x] **ITEM-02 — Shield:** reuse existing “absorb one collision” effect
  as a held/triggerable item, with a clear hit/expiration state.
- [ ] **ITEM-03 — Magnet:** reuse current timed pickup attraction,
  with an optional active duration and visible radius indicator.
- [x] **ITEM-04 — Ghost:** reuse short traffic phasing with explicit
  cooldown; it must not let players pass invalid lap checkpoints.
- [x] **ITEM-05 — Freeze:** reuse temporary rival slowdown only in modes
  with AI; provide a harmless conversion/fallback in solo events.
- [ ] **Acceptance:** no unintended double-stacks or unbounded
  durations, correct activation order and no change to existing
  mystery-ring payouts in Classic mode.

### 12B. Additional pickups and interactive pads (P1/P2)

- [x] **ITEM-06 — Precision speed strips / Energy Gates:** reward
  accurately crossing a boost pad or flight gate; apply capped,
  readable acceleration or thruster recharge.
- [x] **ITEM-07 — Air recharge pads:** restore a bounded share of
  FLY energy mid-flight, making aerial precision lines worthwhile.
- [x] **ITEM-08 — Repair / recovery pad:** temporarily mitigate
  one obstacle's speed loss or restore a limited resource without
  erasing official collision counts.
- [x] **ITEM-09 — Score multiplier token:** temporary style-combo
  bonus in Stunt/Checkpoint modes; cap multipliers and prevent
  overlapping infinite reward loops.
- [x] **ITEM-10 — EMP Pulse (P2):** short-range rival disruption
  exclusive to suitable competitive rule sets; clear fair warning
  and no effect on player control accessibility.
- [x] **ITEM-11 — Mode item rules:** Off / Classic Mystery Rings /
  Active Items / All Items. Resolve item positions from seeded
  streams and never place important rewards inside impossible gaps.
- [x] **New-mode procedural audio (2026-10-22):** original Web Audio music loops
  for Checkpoint Rush, Stunt Attack, Obstacle Run, Championship and Free Drive;
  one-shot gate/challenge/near-hazard/Combo/landing cues, bounded event transitions,
  separate music/SFX volume controls and unit tests (`src/mode-audio.js`,
  `src/audio.js`, `tests/audio.test.js`, `tests/mode-audio.test.js`).
  This does **not** complete ITEM-12's future active-item effects or special pickup visuals.
- [ ] **ITEM-12 — Visual/audio feedback:** unique item outlines,
  landing sparks, pickup beams, cooldown audio and special hit FX
  that reuse `src/effects.js`, `src/audio.js` and comfort settings.
- [ ] **Acceptance:** item effects, caps, cooldowns, pickups, misses,
  blocked storage, mode restrictions and touch button layout have
  unit/browser coverage.

### 12C. Extra replayability and optional presentation (P2)

- [ ] **PHOTO-01 — Photo / Showcase mode:** in paused Free Drive,
  orbit the camera, hide HUD, adjust compatible time/weather presets
  and export a browser-generated screenshot where supported;
  do not claim cloud storage or full replay video without a backend.
- [ ] **REPLAY-01 — Expanded challenge medals:** clean checkpoint
  chain, longest flight, zero-collision time trial, best aerial
  combination and themed gauntlet completion; keep separate from
  existing four Career medals.
- [ ] **REPLAY-02 — Personalized challenge presets:** remember a
  few recent custom-rule setups and allow duplicate/retry from the
  results screen without modifying the base track.
- [ ] **REPLAY-03 — Risk/reward course lines:** alternate ground and
  aerial targets that give more score or item charge at higher
  difficulty, with hazards and scoring that can be disabled for
  straightforward practice.

## 13. Implementation order, test plan and release gates

### 13A. Recommended milestones

1. **P0-A / Foundation:** `RaceConfig`, schema validation, explicit
   objectives, rule signatures, legacy compatibility and progression
   separation (9A, 10C).
2. **P0-B / Player setup:** accessible mode-first selector,
   pre-race options, presets and localization (10A).
3. **P0-C / First playable modes:** Custom Race, Time Attack and
   Free Drive v1; per-mode History and safe results (9B–9D).
4. **P1-A / Built on existing systems:** Stunt Attack, Checkpoint Rush
   and Championship; multi-stage **sprints**, not fake laps (9E–9G).
5. **P1-B / Hazards and world detail:** typed obstacle contract,
   first two obstacle families, art/performance tests, then all
   10 distinct track-specific sets (9H, 11).
6. **P1-C / Items:** one-slot active inventory, reuse Shield/Magnet/
   Ghost/Freeze, then new pads/bonuses (12A–12B).
7. **P2-A / Long-term modes:** Elimination, true closed-circuit laps,
   streamed Endless Highway and Event Lab Lite (9I–9K, 10B).
8. **P2-B / Polish:** photo mode, bonus medals and user presets (12C).

### 13B. File ownership and coding rules

- [ ] Keep core deterministic rules in `src/game.js` or focused pure
  imported modules; test in `tests/game.test.js` and new
  mode/hazard/item unit-test files as needed.
- [ ] Keep rendering, moving obstacles, shaders and scenery in
  `src/world.js`, `src/world-tour-scene.js` and appropriate modules
  under `src/`; don't clone the renderer once per new mode.
- [ ] Keep mode-selection UI in `src/App.vue` and screen flow in
  `src/main.js`; maintain the project's existing static Vue shell /
  imperative HUD integration unless separately refactored.
- [ ] Keep per-mode records, migration, eligibility and safe storage
  in `src/history.js` (or small companion modules); route topology
  in `src/track-paths.js`; device inputs in `src/input.js`.
- [ ] Do not weaken `.claude/rules/unlock-separation.md` or use
  runtime/dev query toggles for shipped content: unlocked-track
  testing remains local-only through existing Vite alias rules.
- [ ] Keep `README.md` and `README.zh-TW.md` consistent if game
  documentation changes. Maintain `CLAUDE.md` and scoped rules
  only when real implementation conventions change.

### 13C. Mandatory acceptance and performance (all new features)

- [ ] **Correctness:** tests for 0/1/3 AI, seeded hazard determinism,
  item disabled, Ghost compatibility, checkpoint/lap order, time
  expiry, stage ties, restart/exit, storage failures and score
  eligibility. Include no NaNs, invisible collision objects or
  unreachable objective sequences.
- [ ] **Classic regression:** original 10 tracks, Daily Challenge,
  Garage stars/unlocks, medals, best Ghosts, NITRO/FLY/BOOST,
  air tricks, camera, performance notice and save migration.
- [ ] **Responsive:** Playwright desktop 1440×900 and touch phone
  390×844, 320×740 and landscape 844×390; no HUD/touch control
  overlap, focus traps or offscreen Start/Exit actions.
- [ ] **Motion & accessibility:** comfortable/reduced-motion,
  low/medium/high visuals, color-independent hazard telegraphs,
  touch hit targets, keyboard remapping and screen-reader
  labels on important buttons.
- [ ] **Performance:** bounded spawned/active objects, chunk
  evictions, fixed update/simulation behavior, and before/after
  `?perf` p50/p95/fps comparison on desktop and **real** midrange
  Android Chrome + iPhone Safari when available. Simulator results
  are not substitutes for phone GPU testing.
- [ ] **Verification:** `npm test` + `npm run build` for all logic
  or progression changes; also `npm run test:browser` for any
  UI, rendering, controls or unlock visibility changes. Ensure
  production build excludes local-only unlock wiring.
- [ ] **Delivery:** implement on a feature branch unless the user
  explicitly requests direct `main` changes; review and mark
  individual tasks `[x]` only after implementation and tests.

### 13D. Inspiration and design references

- **Mario Kart World:** Free Roam and custom VS-style rules — adapt
  settings, not copyrighted tracks/characters.
- **Forza Horizon 5 EventLab:** rule presets, track props and event
  creation — begin with a small, validated object library.
- **Trackmania:** time trials, ghosts, stunt/platform challenges,
  checkpoint precision and eventually authored looped circuits.
- **Hot Wheels Unleashed 2: Turbocharged:** modular hazards, jumps,
  obstacle timing and arcade risk/reward.

Reference entry points:
[Mario Kart World](https://www.nintendo.com/us/gaming-systems/switch-2/featured-games/mario-kart-world/) ·
[Forza](https://forza.net/) ·
[Trackmania](https://www.trackmania.com/) ·
[Hot Wheels Unleashed 2](https://hotwheelsunleashed.com/).

**Scope reminder:** This is a backlog, not a claim that features exist or are
approved for implementation. Preserve the earlier completed work and
never conflate future modes with existing Control “steering mode” options.

## Firebase 資料完整性、Google 帳號與 Cloud Save UI：實作清單（2026-10-25）

### 工作分流：三種 TODO 狀態（2026-10-25）

**適用範圍：** 下方既有 P0／P1 36 項（目前 23 項標示完成、13 項尚未完成），以及 P2 2 項和候選 S1–S3。**狀態分類不等於完成**：只有執行相應 TDD／CI 或正式驗收且留有證據，才可將原項目由 `- [ ]` 改為 `- [x]`。已完成 23 項保留原勾選狀態；不要因重新分類改成未完成，也不要將已存在的功能重做一遍。

#### 狀態一：現在必須完成（Spark 免費方案可執行）

**P0 優先：** `A5` 不同 Google UID 切換及離線／待同步資料保護、`B5` 永久 Stunt score／maxCombo／airTime／medal 跨裝置的模擬器回歸、`D1` Firestore Rules 欄位／型別／範圍／權限負向測試，以及 `H1` 的本地 TDD 與 CI 部分。遵守先 RED、後 GREEN、再重構的流程，測試有失敗須先修復；不可因已有程式碼或單次測試通過就提前勾選。

**P1 接續：** `A1`、`A3`、`D4`、`D5`、`E1`、`E2`、`E6`、`E7`、`E8`。先針對**現有實作**補上或修復名稱／頭像 fallback、備份驗證、六種同步狀態、操作回饋、繁中／英文與 ARIA、桌面和手機直／橫向測試；僅在實際缺功能或測試紅燈時修改程式碼。不得引入付費 Firebase 服務。

- [ ] **H1-Local** — 完整重跑 `npm test`、`npm run build`、Firestore Emulator Rules 與 Cloud Save 瀏覽器測試、全部相關 Playwright／CI 分片，記錄**同一個最新提交 SHA** 的綠燈證據；若有失敗保留 `[ ]` 並修正，特別覆核 A5／B5／D1。
- [ ] **H1-Regressions** — 用模擬器驗證 A→B→A 帳號切換（含離線 pending）、Stunt 永久成績新裝置還原、不同 UID 的禁止讀寫、資料刪除防復活，並保留測試輸出／原因分析。
- **執行準則：** 適合在本機／CI 測試的項目不得因欠缺實機或正式站權限而無限延後；反之本機綠燈不能取代實際上線的授權或資料使用驗收。

#### 狀態二：正式環境具備條件後驗收（不代表現在缺少功能）

僅在**正式網站已部署相應程式碼與 Firestore Rules、可使用授權的真實測試 Google 帳號／裝置**時逐項驗收；未具備條件時保持 `[ ]`，寫下阻礙與可重現步驟。避免為了讓核取方塊變成 `[x]`，重寫已通過模擬器的功能。

- [ ] **H1-Prod-Auth** — 使用正式站測試 Google popup 登入／登出、名稱與 Email 寫入、頭像有／無時顯示；須先有合法測試帳號與可用的正式站。
- [ ] **H1-Prod-Rules** — 已部署與 repo 相符的 Firestore Rules 後，以授權測試帳號實測 `accounts/{uid}`、`saves/{uid}`、`modeBests/{uid}` 的讀寫、跨 UID 拒絕與刪除；未部署不得宣稱已正式驗收。
- [ ] **H1-Prod-Devices** — 有可測裝置時，完成桌面 Chrome、iPhone Safari、手機直橫向／跨裝置同帳號還原與登出後資料隔離；需要真人與真機的檢查不得以 Playwright 模擬結果取代。
- [ ] **H1-Spark-Usage** — 正式站確認 Firestore／Authentication 使用量維持 Spark 限制，不進行方案升級、綁定帳務或開通付費產品。
- **H1 原始總項目**：本地驗證與上述適用的正式環境驗收**全部**取得證據後才可勾選 `H1 (P0)`；如果只有本地測試成功，應保留本段實機／正式驗收待辦，不重複開發。

#### 狀態三：未來符合需求才實作（本次延後）

| 原項目 | 真正的啟動條件 | 現在的處理 |
|---|---|---|
| `G1 (P2)` 公開玩家 Profile | 正式決定推出自訂暱稱、公開個人頁及隱私設計 | 保留 `[ ]`，沿用 Auth 名稱與 Email |
| `G2 (P2)` 排行榜／raceResults | 正式推出多人競技排名、需要可信的成績驗證／反作弊 | 保留 `[ ]`，現有私人存檔已足夠 |
| `S1` Cloud Functions／可信後端 | 有不能用本地或 Spark Rules 解決的可信運算需求，且已經評估可行方案 | 保留 `[ ]`；禁止自行升級 Blaze |
| `S2` PITR／TTL／託管備份還原 | 手動 JSON 備份已不符合可恢復性、保留年限或營運要求 | 保留 `[ ]`；禁止自行啟用收費功能 |
| `S3` 額度監測／容量擴充 | Firestore 使用量接近 Spark 免費限制或使用者量明顯增加 | 先觀察 Usage 並優化讀寫；不自行升級 |

**費用底線：** 此專案本次只允許 Firebase **Spark** 內可執行的功能。任何需要 Blaze、付款資訊、Cloud Functions、PITR／託管備份等方案變更的事項，都不得在本次自動實作；必須等未來有明確需求且使用者**另行明確同意**後再重新評估。

---

**範圍：原先 P0／P1 35 項 + 新增 Google 名稱／Email 入 Firestore 1 項，共 36 項。** 原先 2 項 P2 保留未勾選、不在此次實作。僅項目經對應 TDD／回歸證據驗證通過後才改為 `[x]`。不可因存在程式碼、模擬器通過而把尚未驗收的正式站事項宣稱完成。

**Spark-only／成本限制：** 使用現有 Firebase Authentication Google 登入和**既有免費 Firestore 資料庫**的文件讀寫，禁止啟用 Blaze、設定帳務、建立第二個資料庫、Cloud Functions、Firestore TTL、PITR、代管備份／還原等付費方案功能。Spark 有 1 GiB 儲存、每天 50,000 reads／20,000 writes／20,000 deletes 等限制，實際以官方方案與 Usage 頁為準。不得每影格同步；登入 profile 同值應跳過寫入。若功能需要付費：僅將其維持 `[ ]`，註明原因、免費替代方案與「經使用者明確同意升級／實測足夠配額才開始」條件，絕不自動升級。

**實作流程：** 建立 feature 分支；每階段先寫會失敗的測試、驗證 RED，最小修正後驗證 GREEN、Refactor；每個成功階段就更新本清單與 commit。不得建立 PR，未收到合併指令不得合併 main。正式環境需更新 Rules 並實機驗證，不能把本地測試視為已發布。

### A. Google 登入與帳號管理

- [ ] **A1 (P1)** Cloud Save 顯示 Google displayName，沒有名稱時顯示合理替代值。 **【狀態一：現在必須完成；先補測試／修正，不重做已存在功能】**
- [x] **A2 (P1)** Cloud Save 顯示並辨識目前 Google Email。
- [ ] **A3 (P1)** 顯示 Google photoURL 頭像，讀取失敗有替代圖示。 **【狀態一：現在必須完成；先補測試／修正，不重做已存在功能】**
- [x] **A4 (P1)** 登入、登出及 Auth 初始化時明確顯示使用者身分狀態。
- [ ] **A5 (P0)** 安全切換 Google 帳號，避免不同 UID 的資料混用或遺失未同步進度。 **【狀態一：現在必須完成；先補測試／修正，不重做已存在功能】**
- [x] **A6 (P0)** Firebase Auth／UID 管理身分，禁止遊戲資料儲存 Google 密碼、OAuth Token 與無關個資。
- [x] **A7 (P1)** 【新增需求】於免費 Spark 既有 Firestore 儲存 accounts/{uid}：Google displayName 與 email；登入／變更時更新，Rules 限本人存取，空值不覆蓋有效資料，刪除流程同步清理。

### B. Firestore 儲存內容與資料版本

- [x] **B1 (P0)** 保留 saves/{uid} 既有版本化成果與相容性，不破壞舊帳號存檔。
- [x] **B2 (P0)** modeHistory 雲端保留 rulesVersion、distance、stageCount、itemsUsed、hazardPasses、hazardHits 等完整合法資料。
- [x] **B3 (P0)** 統一 mode rules 的本機與雲端長度上限和驗證契約（現有 4096／2000 不一致）。
- [x] **B4 (P0)** 永久 modeBests 跨裝置同步，避免最近 50 場輪替後永久紀錄消失。
- [ ] **B5 (P0)** 永久 stuntBests（score、maxCombo、airTime、medal）跨裝置同步。 **【狀態一：現在必須完成；先補測試／修正，不重做已存在功能】**
- [x] **B6 (P0)** 最近 50 場 history 與永久 best 分離；合併去重，不讓最佳成績倒退。
- [x] **B7 (P1)** 版本升級、無損遷移與向下相容；需要時保留 updatedAt，拒絕未知未來版本覆寫。

### C. 雲端同步與本機資料可靠性

- [x] **C1 (P1)** 整合登入／完賽／成果改變／重連同步入口，不逐影格寫 Firestore。
- [x] **C2 (P0)** 各 UID 獨立本機快照，帳號切換安全保護未同步資料。
- [x] **C3 (P0)** 離線 pending 狀態按 UID 持久化；網路恢復與重新開啟時重試。
- [x] **C4 (P0)** 同帳號雙裝置並發交易與重複登入不丟最佳成績、不重複紀錄。
- [x] **C5 (P0)** 僅在 Firestore 成功確認後顯示已同步及更新最後成功時間。
- [x] **C6 (P1)** localStorage 多 Key 寫入一致性與失敗回復，禁止把寫入失敗誤報成功。

### D. Rules、備份、刪除與安全

- [ ] **D1 (P0)** Firestore Rules 驗證欄位、型別、範圍、合法賽道／模式、列表及字串長度。 **【狀態一：現在必須完成；先補測試／修正，不重做已存在功能】**
- [x] **D2 (P0)** saves／accounts／永久最佳成績僅由對應登入 UID 私有讀寫，禁止列舉其他玩家。
- [x] **D3 (P0)** 刪除進度後避免舊本機副本／排隊同步使資料復活，帳號基本資訊的刪除範圍明確。
- [ ] **D4 (P1)** 匯出及匯入 JSON：大小／版本／內容驗證與可理解的失敗提示。 **【狀態一：現在必須完成；先補測試／修正，不重做已存在功能】**
- [ ] **D5 (P1)** 清楚區分登出、刪除遊戲資料、未來可能的刪除 Firebase Auth 帳號。 **【狀態一：現在必須完成；先補測試／修正，不重做已存在功能】**

### E. Cloud Save UI／UX

- [ ] **E1 (P1)** Cloud Save 保持遊戲視覺風格，顯示 Google 名稱、Email、頭像。 **【狀態一：現在必須完成；先補測試／修正，不重做已存在功能】**
- [ ] **E2 (P1)** 明確提供未登入／同步中／已同步／等待網路／雲端失敗／本機寫入失敗六種狀態。 **【狀態一：現在必須完成；先補測試／修正，不重做已存在功能】**
- [x] **E3 (P1)** 最後同步時間只顯示實際 Firestore 成功結果。
- [x] **E4 (P1)** 新增手動「立即同步」，避免重複寫入及切換帳號期間觸發。
- [x] **E5 (P0)** 帳號切換確認 UI；清楚警告未同步資料並禁止破壞性切換。
- [ ] **E6 (P1)** 登出／刪除／匯入／匯出提供明確 UX、成功與失敗回饋。 **【狀態一：現在必須完成；先補測試／修正，不重做已存在功能】**
- [ ] **E7 (P1)** 所有文案繁中／英文及無障礙 ARIA、鍵盤操作、焦點與狀態公告。 **【狀態一：現在必須完成；先補測試／修正，不重做已存在功能】**
- [ ] **E8 (P1)** 支援 Desktop／Mobile 直橫向，不遮擋比賽，沿用現有設計。 **【狀態一：現在必須完成；先補測試／修正，不重做已存在功能】**

### F. 裝置設定及本機進度

- [x] **F1 (P1)** Ghost／控制／音效／畫質／語言／塗裝選擇等裝置偏好保持本機，不額外產生雲端費用。
- [x] **F2 (P1)** 重要本機遊戲副本、同步資訊與帳號歸屬依 UID 隔離，既有 Local Storage Keys 相容遷移。

### H. TDD／CI／正式環境驗收

- [ ] **H1 (P0)** 每功能 Red→Green→Refactor，npm test／test:cloud／build／瀏覽器、Rules、安全、真實帳號 Chrome／Safari／跨裝置；正式站與用量驗收未完成前不得勾選。 **【狀態一：本機 TDD／CI；狀態二：正式站／實機待驗收；兩段皆完成才能勾選】**

### G. P2 延後實作／啟動條件（本次不得勾選或實作）

- [ ] **G1 (P2)** 玩家自訂暱稱與公開個人資料 profiles/{uid}。**延後原因與條件：**現在使用 Firebase Auth 的 Google 名稱／Email 即可；只有正式推出玩家自訂名稱、公開個人頁、可見的公開頭像與隱私授權需求時才設計獨立 Profile 與 Rules。 **【狀態三：未來條件式啟動；本次不實作】**

- [ ] **G2 (P2)** 公開排行榜／比賽結果 leaderboards、raceResults。**延後原因與條件：**目前私人賽事成績可透過 saves 還原，瀏覽器提交的分數不能直接作競技可信依據；只有推出對外排名／競賽或防作弊驗證時再評估可信任後端與費用。Spark 不提供 Cloud Functions，若方案要求 Blaze 或其他付費服務，必須由使用者明確同意才做。 **【狀態三：未來條件式啟動；本次不實作】**

### Firebase 模擬器與 CI 通過驗證（2026-10-25）

- **已驗證：** [CI #40122717700](https://github.com/weskao/skyline-rush/actions/runs/40122717700)，提交 `63e6432`：`unit-tests` 成功；`cloud-save` 成功，包含 **9 個 Auth／Firestore Emulator 瀏覽器案例**及 **3 個 Firestore Rules 測試**。
- **勾選原則：** 上述已勾選項目具單元／模擬器驗收或維持既有已回歸行為；`H1` 仍未完成，**不可把 unit/cloud-save 的成功當作全套 Browser CI、正式網站或真機 Safari 驗收成功**。本檔文件提交後將重新觸發 CI，須以最新提交結果為準。
- **尚未勾選：** 頭像失敗回退完整 UI 測試、Stunt 永久最佳成績獨立新裝置回歸、完整 Rules 內層數值約束、JSON 匯入端到端、所有錯誤狀態與無障礙、各個手機／桌面尺寸、完整 browser shards、正式站／真機 Safari。
- **免費限制：** 使用者指定僅 Spark；不能以升級方案或付費 Cloud Functions 代替未完成項目。

### 本輪 TDD 與 CI 驗證記錄（2026-10-25）

- [x] **B2、B3**：cloud modeHistory 的額外統計與本機相同 4096 字元規則上限；回歸測試已納入 `npm test`。
- [x] **C6**：localStorage 多 Key 寫入失敗採最佳努力回復，原本資料可還原時不遺留部分新成果；有單元回歸測試，無法保證已不可寫的瀏覽器儲存仍可回復。
- **實際 CI 證據**：`https://github.com/weskao/skyline-rush/actions/runs/40122441074` 的 `unit-tests` job 已成功（SHA `6e5fffef`）。後續 SHA 對文件與文案有修改，須再檢查 CI。
- **仍在進行或未驗證**：Auth／Firestore Emulator、全部瀏覽器分片、實機 Safari、正式 Google 帳號與 Firestore Rules 部署；A7、B4、B5、C2/C3/D3/D4、E1–E8 等維持 `[ ]`，直到其驗收證據確認。
- **本批已提交的實作**：UID 私人帳號名稱／Email、永續 Mode／Stunt 最佳成績、離線 pending、帳號快照與切換、原子多文件刪除及重上傳防護、Google 帳號 UI、手動同步、JSON 匯入／匯出、雙語字串與專項測試。
- **免費限制**：完全沿用 Firebase Spark，無 Blaze 升級、無 Cloud Functions 或其他付費服務。未實作的 P2 和付費候選項目維持原定條件。

### 本分支實作紀錄（2026-10-25）

- **已提交、待完整 CI／模擬器驗收：** A7 私人帳號資料 accounts/{uid} 的 displayName／email 正規化與登入同步、刪除流程清理；已新增純函式測試與 Firestore Rules 測試。此功能不使用 Blaze 或 Cloud Functions。
- **已提交、待完整 CI／回歸驗收：** B2／B3 cloud modeHistory 保留規則版本、距離、關卡與障礙統計，接受與本機一致的 4096 字元 rules；已加入雲端合併回歸測試。
- **驗證紀錄：** 帳號正規化的精簡 Node 隔離測試先 RED（模組不存在）後 GREEN（3/3）；**尚未在完整專案執行 npm test、npm run test:cloud、npm run build、browser CI，因此相關 checkbox 暫不勾選**。
- **部署限制：** 新 accounts/{uid} Firestore Rules 尚未部署至正式 Firebase；任何正式站登入測試與 Usage 確認仍待完成。禁止把 GitHub commit 當作已上線證據。
- **待執行的下一步：** 執行完整單元與 Firebase Emulator Rules／Browser 測試；若出錯先修正；通過後才將 A7、B2、B3 與相關驗證標記 [x]，再依 P0→P1 清單繼續。

### Spark 免費額度相關候選項目（只有符合條件才實作）

- [ ] **S1 — 後端驗證／Cloud Functions**：Spark 無法使用 Cloud Functions。本次以 Firestore Rules 及本地驗證保護私人資料；若要防作弊或伺服端競技排行，需先有實際需求與**使用者明確同意 Blaze 或其他可用免費替代方案**才重新評估。 **【狀態三：未來條件式啟動；本次不實作】**
- [ ] **S2 — 託管備份／PITR／TTL 刪除／Firestore 還原**：Firestore 免費額度不含這些功能。本次改用玩家手動 JSON 匯出／經驗證匯入；只有資料量、RPO／RTO 要求使本機匯出不夠且**經使用者明確同意付費**，才納入實作。 **【狀態三：未來條件式啟動；本次不實作】**
- [ ] **S3 — 免費額度監控與升級門檻**：發布後先觀測現有 Firestore Usage；若讀寫、存量或使用者數接近 Spark 限制，先降低重複寫入／資料量，未經同意不得啟用任何付費服務。 **【狀態三：未來條件式啟動；本次不實作】**

**官方參考**：https://firebase.google.com/pricing 、https://firebase.google.com/docs/firestore/pricing 、https://firebase.google.com/docs/projects/billing/firebase-pricing-plans
## Home showroom camera parity & discovery (2026-10-25)
- [x] Identify camera precedence bug: curated maps bypass selected VFX view, while older maps require AIRFLOW.
- [x] Create shared camera modes and reusable framing for every current and future track.
- [x] Add homepage prev/next camera dock and synchronize it with VFX and zh-TW/en localization.
- [x] Document reusable showroom camera rules in CLAUDE.md and .claude/rules/track-showcase.md.
- [x] Commit unit and browser regression test cases on fix/home-showcase-camera-parity.
- [ ] Run Node/Vite checks and confirm RED -> GREEN in CI (not verifiable from current tool runtime).
- [ ] Verify real Chromium/Safari desktop and touch screenshots for all tracks; adjust overlapping elements if necessary.
- [ ] Merge only after verified green CI and QA.

## AIRFLOW showroom grounding parity (2026-10-25)
- [x] Identify the root cause: curated `HERO_PREVIEWS` branch in `previewPlayer` ignored `groundedShowcase`, leaving World Tour cars airborne when AIRFLOW was active.
- [x] Add regression unit cases for all current tracks and an unknown future track; normal flying showcase remains available with AIRFLOW off.
- [x] Add live-WebGL checks for the five World Tour roads with AIRFLOW enabled, including grounded actor position, no hovering jets and six selectable camera views; expose test-only VFX options in the existing World Tour fixture.
- [x] Unify preview player altitude and thrusting in one shared function, independent of the curated map list, without duplicating rendering logic.
- [x] Update CLAUDE.md and .claude/rules/track-showcase.md for future track design consistency.
- [ ] Verify tests RED → GREEN by executing Node unit tests and the World Tour WebGL suite at this exact HEAD (CI pending).
- [ ] Confirm real home-screen AIRFLOW, all six camera views, full landscape/portrait screenshots and roadmap landmarks on actual browser/devices.
- [ ] Confirm full GitHub quality-gate green on this exact branch HEAD before merging to main.

## Home showroom vehicle occlusion / AIRFLOW layout (2026-10-25)
- [x] Trace the coverage gap: existing showroom checks only asserted that the car's screen-space center/width were finite; opaque scenery between the camera and the real vehicle was not measured.
- [x] Add real-WebGL five-body-point ray visibility assertions, for all five World Tour maps, all six camera views, AIRFLOW enabled and disabled. Threshold: at least 4/5 body points unobscured and within the viewport.
- [x] Implement cached preview-only camera clearance. Prefer the reference angle; if blocked, try small dolly-back / local-road sideways and vertical offsets while retaining each track's landmark look target. No removal of scenery or change to in-race camera.
- [x] Add desktop 1440×900 and mobile 390×844 home UI regression cases that select each of the five maps, activate AIRFLOW and cycle six camera views via real click/touch targets, capturing screenshots.
- [x] Document camera visibility, visual fidelity, and frame-performance rules in CLAUDE.md and the scoped showroom rule.
- [ ] Run and inspect latest branch HEAD Node/unit/build, all browser shards, World Tour and cloud-save GitHub CI with quality-gate green (still pending).
- [ ] Review actual screenshots of Tokyo, Alpine, Taipei, Coastal and Cosmic with AIRFLOW on/off, verify car wheel/ground contact, body fully unobscured, landmark framing and nonblocking HUD across both orientations; real iOS/Android hardware acceptance pending.
- [ ] Only after exact-HEAD CI success, sync any newer main and obtain CI success again before merging feature branch directly into main.


## Roadmap continuation: inherited regression gates (2026-10-28)

- [x] Reproduce inherited main failures before changing expectations: unscaled Phase 4 timeout, first-frame perf sampling, reviewed CSS baseline drift and stale paused-overlay result checks. Evidence: `artifacts/regression-gates/unit-red.log`, `browser-red.log`, `latest-main-css-red.log`.
- [x] Preserve assertions while repairing their assumptions: use CI timeout helper, prime the presented-frame clock, review accepted main CSS changes without changing recorded DOM, and await finished phase before measuring/clicking Race Again. Focused unit and full unit suites pass (784 passed, 3 skipped); affected browser suite passes (41 passed, 1 desktop-only skip).
- [x] Integrate main `53d4a0a` including its 44px touch targets and narrow VFX selector overflow fix; review the exact CSS delta before updating the golden hash.
- [x] Exact-commit CI exposed three stale minimap assumptions after Phase 4 added two decorative Spiral polylines. Preserve a single main centreline per map, exact permitted total counts, curve bounds and four racer markers; target the existing main-path CSS hook instead of every polyline. Remote RED: `40565776298`, shards 3/4/7; local focused retest recorded separately.
- [ ] Run complete `make verify` on the resulting branch and inspect exact-commit GitHub `quality-gate`; retain real hardware gates separately.

- [x] Integrate current main `2cd52d4` (BOOST/chain landing, spark/audio cue, localized release clips). Resolve only overlapping test assumptions; preserve the new gameplay and media. Shared FPS test now checks the 1000/1016/1032 ms sequence and zero early counter reads. Reviewed main's three release-video CSS rules before synchronizing the style contract. Fresh full Node: 791 passed / 3 skipped; affected minimap/parity/release-video browser suite: 13 passed.
