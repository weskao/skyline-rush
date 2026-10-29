# Expanded Challenge Medals Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task. Do not delegate: this session's active workflow continues on its isolated branch.

**Goal:** Complete TODO REPLAY-01 with five personal challenge medals, separate from the four Career medals.

**Architecture:** Extend the existing Stunt scorer's bounded, deterministic telemetry. A pure typed medal service validates finished runs and maintains a small versioned local ledger. Existing settlement/session/History boundaries own presentation; local backup/account snapshots carry the ledger without changing the cloud payload.

**Tech Stack:** Existing TypeScript, Vue 3 script setup, Node test runner and Playwright; no dependencies.

**Spec:** TODO.md section 12C REPLAY-01, with the builder choices below under the user's standing instruction to implement the TODO using TDD and continue autonomously.

## Scope and choices

- Five medals: successful collision-free all-gate Checkpoint chain; collision-free Time Attack; successful themed Gauntlet with all authored hazards passed and no hits; Stunt single flight at least 8 seconds; Stunt airborne scoring chain at least 3 events.
- The 8-second/3-event thresholds and Stunt-specific aerial challenges are builder choices. Reuse existing scoring events and limit of five; do not change physics, scores, Career rewards, routes or saved rule signatures.
- Persist five allowlisted award dates and bounded flight/combo bests independently of the 50-run History cap. Storage failures retain current-session results.
- Keep awards local, include them in local backup and per-account browser snapshots, isolate account switches and clear them on progress deletion. Preserve old v1/v2 backups. Do not extend Firebase fields or rules.
- Add a typed Vue History section and translated result announcement; keep the home Career chip at 0–4. Existing success/finish audio already acknowledges the award event; no overlapping new sound or music.
- Every module stays below 400 lines; do not grow game.js/main.js ratchets or add production test hooks. All real tests use existing APIs/fixture instrumentation.

## Review focus

1. Separate 4-second flights and ground combo carry must not earn aerial medals.
2. Failed/intermediate heats must not award medals; multi-heat Stunt peaks survive until completion.
3. Old/corrupt/future storage, blocked storage and quota rollback must preserve existing progress.
4. Account switching/deletion and legacy backup import must not leak or silently erase local medals; cloud payload remains unchanged.
5. English/zh-TW, keyboard/touch and result/retry/History controls remain operable; the Career count stays four.

### Task 1: Aerial telemetry

Files: `src/stunt-attack.ts`, `tests/stunt-attack.test.js`.

- [ ] Add regression cases through existing createStuntAttack/scoreStuntAttack for continuous flight, landing/crash reset, frame-rate equivalence and aerial-only combos.
- [ ] Observe assertion RED (no missing-module/syntax failure).
- [ ] Add only bounded numeric state/counters, preserving existing score calculations; run owner and sibling tests; commit.

### Task 2: Awards and safe local persistence

Files: new `src/history-challenge-medals.ts`; `src/race-results.ts`, `src/session-progress.ts`; owner tests `tests/race-results.test.js` plus focused new medal service tests.

- [ ] First assert the absent award through existing settleRace and observe RED.
- [ ] Implement typed validation, five rules, monotonic local ledger and session fallback; retain Stunt peaks across heats and clear on restart.
- [ ] Cover malformed data, boundaries, idempotence and failures at their owning boundaries; commit.

### Task 3: Local account/backup lifecycle

Files: `src/cloud-progress.ts`, `src/cloud-ui.ts`, `tests/cloud-progress.test.js`, `tests/session-progress.test.js` and existing emulator regression suite.

- [ ] Observe RED for switching away/back, clear, old backup preservation and quota rollback.
- [ ] Add an optional local-only ledger to existing atomic local writes, browser account snapshots and file backup; periodic cloud snapshots exclude it.
- [ ] Run focused lifecycle tests and local Auth/Firestore compatibility; commit.

### Task 4: Player presentation

Files: new `src/ChallengeMedals.vue`, new `src/locales/challenge-medals.ts`; `src/HistoryPanel.vue`, `src/history-view-state.ts`, `src/history-ui.ts`, `src/i18n.ts`, `src/result-screen.ts`; minimal `src/main.js` wiring without growth.

- [ ] Add a real-browser RED showing a qualifying completed run, result announcement and separate History collection.
- [ ] Implement accessible bilingual cards/criteria and result text; reuse existing achievement styling and finish audio.
- [ ] Verify desktop/phone, locale switch, storage failure, repeat award, retry and unchanged Career count; preserve original-resolution images; commit.

### Task 5: Final gates

- [ ] Run strict typechecks, full npm test and full `make verify` on the resulting feature code; preserve RED/GREEN and failure receipts.
- [ ] Measure Stunt-path frame p50/p95 before/after with identical conditions; keep physical/all-quality long-drive gates separate.
- [ ] Mark REPLAY-01 and this ledger complete only after observed results. Update overall progress/table and the thread report.
- [ ] Exact-HEAD CI remains pending explicit public-push authorization; original pending question covers only the six preceding branches. Never bypass the rejected public push, merge into main, PR, tag or deploy.
