# Six-Chat Stage 1 Coming-Soon Home Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver five visually faithful, selectable but non-playable Stage 1 homepage teaser maps and one fully verified, bilingual, fixed-width shared start button using six isolated GPT chats.

**Architecture:** Five art-only feature branches each supply one high-detail native JPEG and one map note, without touching shared code. One GPT works on `feature/epic-multiroute-longform-tracks`, which already contains the first UX implementation. It applies tests first to any gaps and incorporates artwork selectively by Git blob SHA rather than full branch merges.

**Tech Stack:** Vue 3, TypeScript, vanilla CSS, Three.js for existing playable scene, node:test, Playwright, GitHub CI; image output in JPEG.

**Spec:** `docs/superpowers/specs/2026-11-03-stage1-coming-soon-home-preview-design.md`
**Six self-contained chat prompts:** `docs/superpowers/prompts/2026-11-03-six-chat-home-preview-implementation.md`

## Global Constraints

- Include only `dune-tempest`, `monsoon-ruins`, `skyfall-archipelago`, `volcanic-crown`, `stormline-megacity` as Coming Soon; Stage 2 five **must not** be exposed.
- Ten original sprint courses remain playable/locked under original progression; five future tracks remain concept-only, distinct START and FINISH and never registered with `createRace`.
- 5 original native JPEG hero images should be at least 2400×900 pixels if generator supports true native generation; do not relabel upscaling as native detail.
- Text: en `Start race`, `LOCKED`, `COMING SOON`; zh-TW `開始比賽`, `未解鎖`, `即將推出`. `#start-button` fixed width: desktop 236px / mobile 210px / compact landscape 190px.
- Never modify `main`, `develop`, create PR, deploy or force push. Full CI and phone/browser visual review must be verified before signoff.

## Review Focus

1. Spoofed unlock storage includes a future ID → cannot start, save race, qualify for cup or create a `Race`.
2. Change mode / locale with future preview selected → no stale disabled CTA, no wrong race label, no stale hero.
3. Home drag/swipe and keyboard navigation across last playable → first future card → no accidental gameplay transition or lost focus.
4. Unusually long translations and 320px/390px screens → fixed CTA hit target with no clipping/unreadable status.
5. Race exit or Daily challenge after preview focus → old real race resumes and its unlocked/locked state remains accurate.

---

### Task 1: Five Art Branch Owners — Original Native JPEG and Design Note

**Files:** Each of five art branches `feature/epic-home-art-<id>` owns precisely `public/track-teasers/<id>.jpg` and `docs/designs/new-tracks/home-art/<id>.md`.

**Interfaces:** `src/upcoming-tracks.ts` on shared branch already resolves image URL `track-teasers/<id>.jpg`. Art chats never change this interface.

- [ ] Read both real source JPEGs and the route SVG; identify three scene anchors and ground+flight differentiation.
- [ ] Generate source artwork at a truly native landscape resolution; preserve safe space for left home text and avoid misleading circular race topology.
- [ ] Convert/export sRGB JPEG with sensible compression; inspect dimensions, size, cropping, and resemblance to each JPEG source.
- [ ] Write the single owned `.md` with exact source paths, three anchors, weather, camera, dimensions, bytes and allowed visual deviations.
- [ ] Commit only two owned files to that art branch, verify GitHub JPEG blob actually exists, and report commit SHA. If binary upload cannot be done, do not claim completion; share artifact and limitation.

### Task 2: GPT 6 — Home Status / Start State TDD

**Files:** `src/upcoming-tracks.ts`, `src/race-select-ui.ts`, `src/App.vue`, `src/locales/ui.ts`; tests `tests/upcoming-tracks.test.js`, `tests/upcoming-home-browser.spec.js`, `tests/home-track-focus-browser.spec.js`.

**Interfaces:** `isUpcomingTrack(id: string): id is UpcomingTrackId`, `homeTrackStatus(id: string, unlocked: ReadonlySet<string>): HomeTrackStatus`; `selectedRace(trackId)` MUST NOT be called with a future ID. Preview state is separate.

- [ ] Run existing focused tests for first implementation, record observed failures and add a targeted failing regression test if necessary.
- [ ] Fix source of each failure without adding `UPCOMING_TRACKS` to gameplay `RACE_TRACKS`; re-run until passing.
- [ ] Verify status precedence: planned always Coming Soon, regardless of forged progress; real maps selected/locked/unlocked retain old behavior.
- [ ] Verify `#start-button` exact localized statuses, fixed sizes, clear `aria-describedby`, keyboard Enter no bypass, no stale ghost/rival/route data on planned selection.
- [ ] Test mode switching, Daily, home re-entry and swipes; use reduced-motion checks and accessibility naming.

### Task 3: GPT 6 — Selective Art Integration and Real Home UI Screenshots

**Files:** Shared branch `public/track-teasers/<id>.jpg` and `docs/designs/new-tracks/home-art/<id>.md` only for imported art; `src/style.css` / `src/App.vue` only for directly evidenced UI crop/legibility fixes.

- [ ] Verify each of the five art commits and corresponding image/native dimension. Work with available art branches; do not claim five complete if only a subset has delivered.
- [ ] Copy exactly two owned Git blobs from each approved branch to the canonical shared branch without full-history merges, maintaining a checksum/size ledger.
- [ ] Capture 1440×900 desktop and 390×844 mobile portrait (and compact landscape) real homepage screenshots for each map, check concept fidelity, legible left text, hero crop and card states.
- [ ] Re-run en/zh-TW, reduced-motion, keyboard and responsive browser checks; document differences and rerender if materially divergent.
- [ ] Record actual screenshot paths, approval/FAIL outcomes, image SHAs and open tasks in the Stage 1 design spec and `TODO.md`.

### Task 4: GPT 6 — Regressions, Exact-HEAD CI and Handoff

**Files:** Tests, Stage 1 spec and `TODO.md`. Do not touch other branches.

- [ ] Run `npm test` and make the focused red/green progression explicit; report actual tests.
- [ ] Run `npm run typecheck`, `npm run build`, `npm run test:layout`, and `make verify` where local environment supports them; list unavailable commands and blockers.
- [ ] Trigger/check exact-HEAD GitHub CI with `[full-regression]` on the committed shared branch (avoid repeated identical CI runs).
- [ ] Validate all 10 existing playable courses, all 5 Coming Soon cards, start label locale parity, photo carousel responsiveness and no new runtime dependency.
- [ ] Commit final docs + evidence references, report branch/commit/CI run URL/status. Leave `develop` and `main` unchanged; do not present a pending CI as passed.
