# HUD, Vue, DOM and CSS compositing (workstream 13)

Scope: fewer unchanged DOM writes and no always-running invisible animation, with identical UI/UX.
Every number below is `local-chromium-swiftshader`: Playwright Chromium (channel `chrome`, software WebGL), a
developer machine, fixed 60 FPS setting, music/sound off. It is **not** Safari, a phone, or a GPU measurement.

## Method

`tests/hud-compositing-browser.spec.js` starts a Free-mode race, then holds throttle for a 4 s window while steering
alternates every 500 ms. It records, per profile (desktop 1440x900, iPhone 390x844 touch):

- DOM mutation records through one `MutationObserver` (attributes with old value, text, child list); a record whose
  old value equals the current value is counted as **redundant** (a same-value write).
- CDP `Performance.getMetrics` deltas (`LayoutCount`, `RecalcStyleCount`, `LayoutDuration`, `RecalcStyleDuration`,
  `ScriptDuration`) and `browser.startTracing` event totals (Layout, UpdateLayoutTree, Paint, PrePaint, Layerize, Commit).
- A visible-layer audit (`backdrop-filter`, `filter`, `will-change`, `mix-blend-mode`) while racing.
- `HUD_TRACE_INVALIDATION=1` adds style-invalidation tracking (diagnosis only; it slows the page).

Env vars: `HUD_ENV` (label), `HUD_BENCH_OUT` (writes `<prefix>.<profile>.json`). The same spec was run against the base
build (HEAD before this workstream) and this branch, alternating, three runs each.

## Before / After (mean of 3 interleaved runs, 4 s window, ~260-290 frames)

| Metric | Desktop before | Desktop after | iPhone before | iPhone after |
| --- | --- | --- | --- | --- |
| DOM mutation records | 1789 | 1036 (-42%) | 1611 | 968 (-40%) |
| Redundant (same-value) records | 680 | 2 | 638 | 18 |
| LayoutCount | 265 | 257 | 248 | 248 |
| RecalcStyleCount | 287 | 273 | 256 | 256 |
| Style recalc time (ms) | 192 (range 141-280) | 114 (109-119) | 231 | 193 |
| Script time (ms) | 965 (range 723-1292) | 807 | 723 | 700 |
| Paint events / ms | 581 / 33 | 566 / 29 | 823 / 35 | 836 / 34 |
| Layerize / Commit (ms) | 18.5 / 28.3 | 17.0 / 24.9 | 20.3 / 23.4 | 21.1 / 22.9 |

Reading the table honestly: the DOM-write reduction is exact and deterministic. Time metrics are noisy (the before
runs on desktop varied by 2x), so the style-recalc and script improvements are directional, not a guaranteed
number. Layout count, recalc count and paint count did not change: they are driven by visible per-frame animation
(see items 7 and 8), which this workstream must not remove.

Observed RED for the gate: the new spec failed on the pre-change build with `.is-held[aria-pressed]` etc. redundant
(`n: 49, redundant: 41`), then passed after the fix.

## Per-requirement status (p05)

| # | Requirement | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Audit unnecessary DOM updates / reflow / reactivity | DONE | Mutation audit found 5 hot same-value sources: `aria-pressed` on 5 touch buttons (50/4 s each), fuel meter `aria-valuenow`/`aria-valuetext`/`data-refilling`, nitro meter `data-refilling`, `#boost-status[data-state]`, `body` custom properties. No forced reflow found in the HUD tick. |
| 2 | Keep HUD update frequency; drop only no-change writes | DONE | Tick rate untouched; writes now guarded in `src/race-hud.ts:151-284`. |
| 3 | Reuse existing helpers, no duplicate abstraction | DONE | One new 3-line sibling `setAttributeIfChanged` in `src/hud-dom.ts:12` beside `setTextIfChanged`/`setHiddenIfChanged` (no helper existed for attributes; `classList.toggle(token, force)` and same-value `style.setProperty` already produce no record). |
| 4 | No deep reactive tracking of game state | DONE (no change needed) | The race HUD is imperative, not Vue-reactive; game state is not in a Vue `ref`/`reactive`. Vue components only hold UI view state. |
| 5 | Speedometer, fuel, nitro, leaderboard, minimap, position, timer, touch controls | DONE for fuel, nitro, boost status, touch controls, ghost split; REJECTED for the rest | Speed/timer/distance/leaderboard/position already skip equal text (`setTextIfChanged`; `tests/hud-dom-browser.spec.js` shows 0 redundant text writes). Minimap already `setIfChanged`-gates (`src/route-map.ts:28`); quantizing `cx`/`cy` was REJECTED because pixel equivalence cannot be proven. The speed-needle transform and FLIP leaderboard animation are visible motion and stay. |
| 6 | Scope high-frequency CSS variables | DONE | `--flight-bank` / `--streak-opacity` moved from `<body>` to `.flight-director` / `.speed-streaks` (`src/flight-fx-hud.ts`, `src/race-hud.ts:95,244`). Spec asserts no `body[style]` writes while racing. |
| 7 | Audit backdrop-filter / filter / drop-shadow / box-shadow / blend | DONE (audit), no change | While racing only 3 elements create these layers: `#race-clock` backdrop-filter, one svg filter, one small icon filter (`layers` in the JSON output). The other `backdrop-filter` rules (16 in total) sit on Home, dialogs and overlays that are not visible in a race. Nothing to remove without a visual change. |
| 8 | Merge redundant compositor layers | REJECTED | Only 3 effect layers exist during racing (item 7); merging any would change the glass look. The per-frame style recalcs come from visible animations (`route-player-pulse` on an SVG circle, speed-needle, `.flight-director`, racer FLIP), which are main-thread because SVG children cannot be composited. |
| 9 | Stop invisible animations, timers, watchers, observers | DONE for speed streaks; others verified or REJECTED | Faded-out speed streaks stop 18 infinite `wind-rush` loops (`src/flight-fx-hud.ts`, `src/style.css:2796`; spec asserts 0 running, `tests/flight-fx-hud.test.js`). Resume on the next boost. Existing observers are already gated (`GarageDriftPreview.vue:71`, `GarageArtworkImage.vue:58`, `pickup-preview-stage.ts:84`) or scoped by `attributeFilter` (`race-feedback-placement.ts:147`). `GarageMissionBoard.vue` 60 s timer and `startup-audio.ts` 750 ms timer left: negligible and the latter ends on entering the lobby. |
| 10 | No will-change abuse | DONE (no change) | 4 uses (`pickup-guide-art.css:71`, `GarageArtworkTile.vue:69`, `GaragePaintPreview.vue:32,49`), all on transform animations that are already disabled for reduced motion / low VFX. None is visible during racing (layer audit). |
| 11 | Pause off-screen GIF / animated WebP / video | DONE (already in place, verified) | `GarageArtworkImage.vue` swaps to the static image unless intersecting, reduced-motion and VFX allow it (covered by `tests/garage-animated-artwork*`); release video pauses on viewer open/close (`ReleaseNotesPanel.vue:22`, `release-notes-ui.ts:130`). Store and Collection use the same component. |
| 12 | iPhone portrait/landscape, Android, desktop, foldable intact | DONE (automated), UNVERIFIED on physical devices | `race-hud-overlap-browser.spec.js` (390x844, 844x390, vertical 844x390 and horizontal 600x900 folds, en/zh-TW) 25/25 pass; `touch-actions`, `handoff` specs pass. No physical-device run. |
| 13 | Menus, dropdowns, hints, i18n, toasts, a11y, dialogs | DONE for what changed; UNVERIFIED otherwise | Spec asserts `aria-valuenow`/`aria-valuetext` of the meters stay current; `hud-settings`, `hud-focus`, `race-hud-overlap` (en/zh-TW) and `test:layout` pass. Menus/dropdowns/toasts were not edited. |
| 14 | No loss of decoration or visible animation | DONE | No decoration, glassmorphism or visible animation removed. The only animation change is pausing loops at opacity 0. |

Screenshot regression: no pixel baselines were added. The suite has none, a live race is time-dependent, and
software-GL pixels differ per platform. Visual equivalence is protected by the geometry/overlap specs above and by
leaving every visible style untouched; this is a limit, not a proof.

## Not measured / SOP

- Safari Web Inspector and any iPhone/Mac layout, paint and thermal numbers: UNVERIFIED. SOP: run the same spec
  scenario on a physical iPhone with Web Inspector's Timelines (Layout & Rendering, Energy) and record into
  `docs/performance/local/` (ignored). Do not publish device identifiers.
- `input[value]` produced 16 same-value records per 4 s on the iPhone profile. They come from a settings panel's
  Vue-bound range inputs, not the HUD tick; left untouched.

## Wiring for later waves

None. No change to `src/main.js`, FPS control, GPU or audio modules was needed.
