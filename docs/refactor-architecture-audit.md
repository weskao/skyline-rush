# Vue 3 / TypeScript refactor — architecture and verification audit

Scope: `refactor/vue-ui-typecheck-incremental` (2026-10-27). This document distinguishes implementation coverage from final observed full-suite acceptance.

## Typed coverage

- `tsconfig.json` includes `src/**/*.ts` and `src/**/*.vue`, uses `strict: true`, and includes TypeScript and semantic Vue SFC checks.
- Legacy `.js` uses a separate `jsconfig.json` / `npm run typecheck:js`; `allowJs: true` plus `checkJs: false` in `tsconfig.json` is **not** whole-repository JS checking.
- Event-driven UI controllers, state, gameplay configuration, cloud/data services, route projection, input, geometry utilities and rear-LED composition now use `.ts`; Vue panels use `<script setup lang="ts">` where applicable.
- Remaining `.js` in `src/` are intentional engine islands listed below. New app UI, business, and persistence modules must be TypeScript. Do not convert frame-loop HUD to Vue reactivity.

## Remaining JavaScript engine / hot-path exceptions

| File | Why it stays JS in this phase |
| --- | --- |
| `src/main.js` | Bootstrap, controller wiring, race lifecycle (start/restart/pause/next/again/tutorial), the phase orchestrator and the requestAnimationFrame loop. 688 lines with a ratcheting ceiling in `tests/module-size.test.js`; screen areas live in the TypeScript controllers listed under "Module split" |
| `src/game.js` | Physics, movement and race frame simulation |
| `src/world.js` | High-frequency Three.js renderer and camera |
| `src/audio.js` | Web Audio synthesis, mix and music scheduling; song data lives in `music-tracks.ts`, race→cue detection in `race-audio-events.ts` |
| `src/aero-vfx.js` | WebGL aerodynamic visual effects |
| `src/effects.js` | Transient WebGL particle and lighting effects |
| `src/sky-scene.js` | Sky Spiral WebGL scene construction and rendering |
| `src/world-tour-landmarks.js` | World Tour 3D landmark scene generation |
| `src/world-tour-scene.js` | World Tour 3D scene/render orchestration |
| `src/world-tour-scenery.js` | World Tour landscape mesh generation |
| `src/world-tour-tunnels.js` | World Tour tunnel 3D geometry |

These are not exemptions from regression tests or proof of faster execution. Any future conversion must show a measured maintenance benefit and preserve render behavior.

## Module split (2026-10-27, `refactor/split-main-audio`)

`src/main.js` went from 1,881 to 688 lines and `src/audio.js` from 403 to 243, one TDD slice per commit
(each test failed against the previous tree first). Source modules are limited to 400 lines by
`tests/module-size.test.js`; files that predate the limit have ceilings that only go down.

| Responsibility | Module |
| --- | --- |
| Song data, race→cue detection, synthesis/mix | `music-tracks.ts`, `race-audio-events.ts`, `audio.js` |
| Audio switches, sliders, Mute all, autoplay unlock | `audio-ui.ts` |
| Cloud Save sign-in/sync/import/export/delete (Firebase injected) | `cloud-ui.ts` |
| Session progress copies and ghost caches | `session-progress.ts`, `ghost-store.ts` |
| Recording a finished race (bests, unlocks, medals, ghosts, series) | `race-results.ts` |
| Result screens per mode | `result-screen.ts`, `time-format.ts` |
| In-race HUD (per tick, imperative) | `race-hud.ts`, `race-hud-modes.ts` |
| Home race selection, track picker, route maps | `race-select-ui.ts` |
| Key rebinding and key legends | `keymap-ui.ts` |
| Touch layout, slide pad, tilt, Controls form | `touch-controls-ui.ts` |
| VFX settings, showcase camera, calm motion | `vfx-ui.ts`, `motion.ts` |
| Reduced-quality notice | `performance-notice-ui.ts` |
| History dialog, photo mode, pressed buttons, `?perf` strip | `history-dialog-ui.ts`, `photo-ui.ts`, `pressed-buttons.ts`, `perf-overlay.ts` |

`tests/legacy-js-names.test.js` compiles `src/**/*.js` loosely and fails on syntax errors and unresolved
identifiers: a move that leaves a caller behind used to fail only at runtime (it found the audio slider's
removed `showChannel` call, fixed in `8dc75b1`).

## Vue ownership audit

| UI area | Vue template and reactive view | TypeScript event/service adapter |
| --- | --- | --- |
| Release notes | `ReleaseNotesPanel.vue`, `release-view-state.ts` | `release-notes-ui.ts` |
| History / challenge records | `HistoryPanel.vue`, `history-view-state.ts` | `history-ui.ts` |
| Cloud Save (in History) | `HistoryPanel.vue`, `cloud-view-state.ts` (account identity, avatar fallback, actions, status, last sync) | `main.js` Auth and Firestore lifecycle only |
| Garage / paint | `GaragePanel.vue`, `garage-view-state.ts` | `garage-ui.ts` |
| Settings and audio | `SettingsPanel.vue`, `audio-view-state.ts`, `control-panels-view-state.ts` | `audio-ui.ts`, `controls-panels-ui.ts` |
| Controls | `ControlsPanel.vue`, `control-panels-view-state.ts` | `controls-panels-ui.ts` |
| Guide and practice | `GuidePanel.vue`, `CollectiblesGuide.vue`, `TutorialCoach.vue`, guide/tutorial view state | `guide-ui.ts`, `tutorial-ui.ts`, `collectibles-guide-copy.ts` |

Handlers may still call native `dialog.showModal/close`, set focus, coordinate persisted state, or move the live WebGL canvas into the Garage preview. Those effects are not duplicated Vue-rendered state mutations. The racing HUD intentionally stays imperative.

Controls ownership is deliberately narrower than a complete controller extraction: Vue owns panel disclosure; `main.js` still coordinates control-form values, tilt permission/preview, key rebinding and persistence. Those unbound form fields do not have competing Vue writers. This is an explicit remaining bootstrap boundary, not a claim that all event handlers left `main.js`.

## Current-main integration (2026-10-27)

- `771274d` integrates `main` at `bd71ac8`, preserving the upstream collectibles guide in the extracted Vue panel, with its full bilingual catalog unchanged. The component and catalog use strict TypeScript. A real Chrome regression failed because Items was excluded from the guide selection guard; the shared view contract and guard now include it.
- The same guide test independently exposed 23px of overflow at 320px. Reward badges now wrap instead of forcing a horizontal overflow. Nine guide browser cases pass across 1440/390/320/844px and both locales, including tab exclusivity and resetting the selected tab on reopen.
- `cda325e` fixes an additional screenshot-discovered normal-home overlap: the fixed camera dock covered Start/Practice on portrait phones. The single existing dock participates in compact intro flow; desktop and AIRFLOW keep their fixed placement. Twenty-five camera cases pass across normal/AIRFLOW layouts, six viewport sizes and World Tour routes. Existing audio behavior is preserved; these static reference/layout changes need no additional sound cues.
- `d1a91f4` records that intentional camera correction in the strict migration golden. The first broad run passed 445 cases and failed only the old DOM-order/CSS snapshots. The five camera entries move without changing any of the 228 element/tag/class records; the full stylesheet hash and every assertion remain. Independent review confirmed that the stylesheet diff contains only the camera visibility/flow rules. Both focused parity cases pass. This updates the recorded baseline, not physical-device or human visual approval.
- Independent source integration review found no issues in `771274d`. Local full-suite and final visual/hardware acceptance remain distinct; see `TODO.md` and `docs/verification.md` for current receipts.

## Verification and acceptance criteria

- **Already verified per-slice:** strict `npm run typecheck`, unit tests, Cloud Save and focused quality gate on exact commits. This is not full-browser parity.
- **CI software-WebGL profiling:** #40391848831 (SHA `0213b0d`) observed p50/p95 199.9/216.7ms (1440×900) and 100.0/116.7ms (390×844 viewport), 3s samples on CPU-only CI; `tests/hud-dom-browser.spec.js` observed 0 redundant HUD lookup/text/visibility writes in both viewports. No baseline/hardware comparative result exists; these are not frame-time improvement claims.
- **Focused Cloud Save Vue red/green:** account/avatar RED #40443850579 → GREEN #40444356946; Cloud Save status/action visibility RED #40444601683 → GREEN #40444880513. Unchanged simulation and Firestore account/data rules; browser review remains part of final acceptance.
- **2026-10-27 complete regression:** [CI #40445190377](https://github.com/weskao/skyline-rush/actions/runs/40445190377) at `a9002c9` passed unit/TypeScript/Vue, all 8×55 Browser tests, both responsive-layout groups (29+42), 15 Cloud Save emulator Browser tests and 3 Rules tests, 72 World Tour tests and the quality gate. It predates the later avatar fallback fix, whose own focused RED #40451146836 and GREEN #40451343678 provide unit/Cloud Save evidence.
- **Screenshots sampled:** reviewed 18 race-mode and 7 World Tour capture screenshots from #40445190377; no immediately obvious clipping in these captures. These are sample artifact images, not full human pixel-diff acceptance against `main`, Safari or physical mobile devices.
- **Final automated gate:** commit with `[full-regression]` on this refactor branch; verify `unit-tests`, `cloud-save`, all eight `browser-tests` shards (including layout), `world-tour-mid-race` and `quality-gate` on the **same HEAD**, with no failed/cancelled required job. Local `make verify` must be run where a checkout with network and browsers is available.
- **Hardware gate not fulfilled by CI:** compare baseline versus optimized p50/p95 under the same thermal, browser, graphics and input conditions on actual desktop/mobile devices, plus iPhone Safari/Android Chrome visual, audio, touch and thermals; record device and browser versions, sample duration and frame distributions. No numeric improvement claim until comparative evidence exists.
- **Release/deploy:** outside this refactor; no merge into `main` on an incomplete gate.
