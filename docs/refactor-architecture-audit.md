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
| `src/main.js` | Bootstrap and requestAnimationFrame simulation/render/UI orchestration; core frame path |
| `src/game.js` | Physics, movement and race frame simulation |
| `src/world.js` | High-frequency Three.js renderer and camera |
| `src/audio.js` | Web Audio synthesis and frame-sensitive playback engine |
| `src/aero-vfx.js` | WebGL aerodynamic visual effects |
| `src/effects.js` | Transient WebGL particle and lighting effects |
| `src/sky-scene.js` | Sky Spiral WebGL scene construction and rendering |
| `src/world-tour-landmarks.js` | World Tour 3D landmark scene generation |
| `src/world-tour-scene.js` | World Tour 3D scene/render orchestration |
| `src/world-tour-scenery.js` | World Tour landscape mesh generation |
| `src/world-tour-tunnels.js` | World Tour tunnel 3D geometry |

These are not exemptions from regression tests or proof of faster execution. Any future conversion must show a measured maintenance benefit and preserve render behavior.

## Vue ownership audit

| UI area | Vue template and reactive view | TypeScript event/service adapter |
| --- | --- | --- |
| Release notes | `ReleaseNotesPanel.vue`, `release-view-state.ts` | `release-notes-ui.ts` |
| History / challenge records | `HistoryPanel.vue`, `history-view-state.ts` | `history-ui.ts` |
| Cloud Save (in History) | `HistoryPanel.vue`, `cloud-view-state.ts` (account identity, avatar fallback, actions, status, last sync) | `main.js` Auth and Firestore lifecycle only |
| Garage / paint | `GaragePanel.vue`, `garage-view-state.ts` | `garage-ui.ts` |
| Settings and audio | `SettingsPanel.vue`, `audio-view-state.ts`, `control-panels-view-state.ts` | `audio-ui.ts`, `controls-panels-ui.ts` |
| Controls | `ControlsPanel.vue`, `control-panels-view-state.ts` | `controls-panels-ui.ts` |
| Guide and practice | `GuidePanel.vue`, `TutorialCoach.vue`, guide/tutorial view state | `guide-ui.ts`, `tutorial-ui.ts` |

Handlers may still call native `dialog.showModal/close`, set focus, coordinate persisted state, or move the live WebGL canvas into the Garage preview. Those effects are not duplicated Vue-rendered state mutations. The racing HUD intentionally stays imperative.

## Verification and acceptance criteria

- **Already verified per-slice:** strict `npm run typecheck`, unit tests, Cloud Save and focused quality gate on exact commits. This is not full-browser parity.
- **CI software-WebGL profiling:** #40391848831 (SHA `0213b0d`) observed p50/p95 199.9/216.7ms (1440×900) and 100.0/116.7ms (390×844 viewport), 3s samples on CPU-only CI; `tests/hud-dom-browser.spec.js` observed 0 redundant HUD lookup/text/visibility writes in both viewports. No baseline/hardware comparative result exists; these are not frame-time improvement claims.
- **Focused Cloud Save Vue red/green:** account/avatar RED #40443850579 → GREEN #40444356946; Cloud Save status/action visibility RED #40444601683 → GREEN #40444880513. Unchanged simulation and Firestore account/data rules; browser review remains part of final acceptance.
- **Final automated gate:** commit with `[full-regression]` on this refactor branch; verify `unit-tests`, `cloud-save`, all eight `browser-tests` shards (including layout), `world-tour-mid-race` and `quality-gate` on the **same HEAD**, with no failed/cancelled required job. Local `make verify` must be run where a checkout with network and browsers is available.
- **Hardware gate not fulfilled by CI:** compare baseline versus optimized p50/p95 under the same thermal, browser, graphics and input conditions on actual desktop/mobile devices, plus iPhone Safari/Android Chrome visual, audio, touch and thermals; record device and browser versions, sample duration and frame distributions. No numeric improvement claim until comparative evidence exists.
- **Release/deploy:** outside this refactor; no merge into `main` on an incomplete gate.
