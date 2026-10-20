# Verification — 2026-10-18

## NITRO + FLY closed: browser coverage for `AIR DASH · NITRO` — 2026-10-20

Scope: TODO 7B "NITRO doesn't use fuel". Logic tests and Codex's label (`873f76a`) already
existed; no browser test checked the label. New `tests/nitro-fly-browser.spec.js`: desktop
(hold W, E, Space) and 844×390 touch (NITRO + FLY held as two touch points).

- TDD: built with the label clause removed from `main.js` (source restored right after the
  build). Both tests failed on `Expected "AIR DASH · NITRO"` while the HUD showed
  `NITRO ACTIVE` / `CRUISE`. A first draft tapped NITRO and failed for the wrong reason (the
  down/up pair fell between frames and NITRO never activated), so both tests now hold it.
  With the real build: **2 passed (15.2 s)**.
- Test seam: the player has no NITRO charge at start and earning one needs a full PERFECT
  LINE, so the spec rewrites `nitro:0` to `nitro:3` in the served bundle. A guard assertion
  fails loudly if a minifier change breaks the rewrite.
- Review of `873f76a`: unlike `NITRO ACTIVE`, the new label does not check
  `race.phase === 'racing'`. Low risk; the finished and countdown phases were not checked.
- Not run: the full browser suite after adding this file (it is a new, independent spec).

## Logic for NITRO + FLY, air tricks and shortcuts — 2026-10-20

Scope: the logic half of the remaining TODO items as split in
`docs/superpowers/plans/2026-10-20-remaining-items-split.md` (§B, §C, §D). The UI half is
Codex's. `src/game.js` adds `player.trick` / `trickPayout` / `flick`, `player.inShortcut`,
a `shortcut` section on all four tracks and `shortcutPylons()`; `src/world.js` gains only the
`SHORTCUT / FLY HIGH` sign entry so the new section type gets a material.

- TDD: 2 NITRO + FLY acceptance tests (§B, no physics change: they pass on existing code and
  pin the behaviour), 8 air-trick tests and 7 shortcut tests. Each of the 15 new-logic tests
  failed on its own assertion first. Two cancel tests passed vacuously at first; they got an
  `assert.ok(trick)` precondition and went red. Two existing tests were narrowed: the
  air-pickup invariant now allows pickups inside shortcut sections, and the tunnel-ring test
  filters `type === 'tunnel'`.
- Results: `npm test` **211 passed**. `npm run test:browser` (1 worker) ran 104 passed and
  21 failed with `ERR_CONNECTION_REFUSED`. The test server on port 5178 went down mid-run,
  while a parallel Codex session committed in the same tree. `npx playwright test
  --last-failed` on a fresh build then gave **21 passed**, so **125/125** in total.
- Visual: a screenshot of Coast with the corridor moved to 300 m in the served bundle only
  shows the `SHORTCUT / FLY HIGH` sign over the left side.
- Cost: each step does one extra section check for `inShortcut`, a timer for an active trick,
  and one `shortcutPylons(section)` scan (≤ 5 pylons) only inside a shortcut section.
- Not verified: the deck, pylon meshes, trick roll, callouts and HUD (Codex's UI half, not
  built yet); how the tuning feels in play (0.3 s flick window, +12 cap, pylon spacing).

## Gameplay follow-up: ghost, daily challenge, medals, cosmetic unlocks — 2026-10-20

Scope: the four gameplay TODOs the UI pass left open (`HANDOFF.md`, removed after this pass).
Gamepad stays excluded. Race phases and input actions are unchanged; `createRace` gains an
optional daily `modifier`, `stepRace` ignores FLY under `no-flight`, and results gain `nitroChain`.

- TDD: 17 new unit tests failed first on missing exports or fields (`nitroChain`,
  `recordMedals`, `loadStars`, `PAINTS[].stars`, `ghost.js`, `DAILY_MODIFIERS`). Three
  control-settings tests needed the new `ghost` default added to their expected objects. A new
  `progression-browser.spec.js` (3 tests) and the updated collections spec (4 viewports) failed
  on the old placeholder states before the wiring went in.
- Results: `npm test` **194 passed**. `npm run test:browser -- --workers=2` **125 passed (7.9 min)**.
  This includes the complete 5 km sprint, which now also checks that the saved ghost has about
  10 samples per second of finish time and that the coast stars were saved.
- Visual: a screenshot taken during the countdown, with a ghost saved for the track, shows the
  translucent blue ghost car one lane over.
- Trust boundary: saved ghosts, medals, stars, paint and daily runs are validated on load.
  Board rows are rendered with `textContent`; the browser spec plants an `<img onerror>` row
  and checks that it never renders.
- Cost: the world now builds traffic meshes for double traffic (up to 108 cars, hidden when
  not used) plus one ghost car. Each simulation step adds one comparison for ghost recording.
  A ghost is about 600-900 samples, roughly 15 kB of JSON per track. Frame timing was not
  re-measured.
- Not verified: real phones and Safari, how the ghost looks on every track and palette, and
  daily runs that cross midnight (the board keeps the id of the challenge you started).

## Remaining UI and animation pass — 2026-10-20

Scope: TODO 8B finish, transitions, countdown and menu; touch action arc / AIR DASH seam;
Tilt settings and permissions; Garage and the Ghost / daily challenge / medal UI surfaces.
Gamepad is explicitly excluded. The Ghost recorder, challenge simulation, award criteria and
cosmetic unlock/equip persistence remain open for Claude Code in `HANDOFF.md`.

- TDD: the first presentation/collection tests failed on missing preview/Garage elements;
  input regressions failed on unsupported Tilt settings and a touch seam that did not activate
  BOOST. Stricter browser regressions then reproduced live reduced-motion cancellation,
  immediate-results focus transfer, Garage Escape propagation, fractional scroll clipping,
  narrow-phone NITRO/car overlap, countdown/HUD overlap and landscape ranking/charge overlap.
  Each was corrected and its targeted checks rerun successfully. Six Node and fifteen
  Playwright tests were added, using existing runners and no additional dependency.
- Finish presentation is a separate clock: official finish/result/history are finalized once,
  followed by 0.6 s of visual coast / side camera, then results and sequential counters.
  Reduced motion and Comfort skip the wait and movement. Unit checks protect official race
  immutability and restart cancellation; real desktop and reduced-motion phone races verify
  ordering, accuracy, focus and one history record. Existing audio cues are reused.
- Track preview loops stop outside the ready screen, when clipped/backgrounded and in calm
  modes. History retains modal keyboard behavior and opener focus through animated close.
- Tilt permission is requested only on explicit selection/recenter. Denial/errors/no readings
  fall back to Slide. Sensor values are finite-checked, screen-oriented and calibrated; stale
  steering expires after 500 ms. Native sensor permission is substituted in browser tests;
  real DOM orientation events exercise the actual input path and rendered car steering.
  Physical calibration and sensor direction still need Android/iOS hardware verification.
- Garage reuses the live renderer, previews paint/tail lights without saved-data changes and
  restores canvas placement, viewport, standard appearance and focus when closed. Progression
  states are explicitly unavailable rather than fabricating earned awards or recorded ghosts.
- Four main viewport flows and fourteen existing responsive sizes passed targeted checks.
  Actual screenshots were inspected at 1440×900, 390×844, 320×740 and 844×390, including race,
  countdown, pause, controls, Garage, history/daily board and the complete medal list.
  Nine final PNGs were annotated from native-pixel DOM bounds and individually inspected.
- Independent read-only code review found a finish shadow left behind by the visual coast;
  the shadow now follows the player's presentation Z offset. No other actionable code finding.
- Final acceptance: `npm test` **177 passed**, zero failures/skips;
  `npm run test:browser -- --workers=2` **122 passed in 7.2 minutes**. Production build,
  source/test syntax checks and `git diff --check` pass; the existing >500 kB chunk advisory
  remains. No source/test changes followed this run. Prior complete-suite attempts were
  interrupted for screenshot-discovered fixes and are not counted as final acceptance.
- One completed run reported **121/122**, failing only the pre-existing earned-ring pilot.
  The original test passed unchanged in isolation. Its host-driven polling was replaced by
  an in-page frame loop through the real Space handlers and HUD; all reward assertions remain.
  Two parallel repetitions then passed in 26.7 s. The successful final whole-suite run includes
  this repair. All 42 pre-existing artifact files were restored and byte-verified afterward.
- Nine inspected annotated PNGs were delivered through `screenshot-mark-send` / `tg-send.sh`:
  confirmed photo message IDs **21246, 21247, 21248, 21249, 21250, 21251, 21252, 21253, 21254**.
  Blue marks new/modified regions. The requested handoff filename is **HANDOFF.md** at the
  project root; the final `done-report` text is sent after the documentation commit.
  Commits are local only; no push or deployment.

### Performance sample

One Chrome browser at a time, DPR 1, AUTO race, 2 s warmup and 120 requestAnimationFrame
intervals per viewport. Before/after use the same sampler. Values below are milliseconds:

| Viewport | Cadence median before → after | Cadence p95 before → after | Callback p95 before → after |
| --- | --- | --- | --- |
| 1440×900 | 16.7 → 16.7 (both repeats) | 16.8 → 16.7 / 16.8 | 1.8 → 2.9 / 3.0 |
| Touch 390×844 | 16.7 → 16.7 (both repeats) | 16.7 → 16.8 (both repeats) | 1.6 → 1.6 / 2.0 |

No frame-cadence drop was observed in these short steady-race samples. Desktop callback tail
cost increased in both samples; it remained below the 16.7 ms frame budget and is disclosed
rather than called a CPU performance improvement. This measures callbacks/render submission,
not GPU completion, sustained thermal behavior, or physical-phone performance.

## HUD motion and event feedback — 2026-10-20

Scope: TODO 8B Consistency → Event callouts → Button feel → Animated numbers → Leaderboard reorder (five checkboxes).

- **TDD:** browser tests first failed on fixed 180 ms button timing, absent press scaling/held glow,
  the missing speed needle, and rows being relabelled instead of moved. The callout tests first failed
  on missing queued events, then passed for coalescing, expiry, phase resets, NITRO activation/extension,
  fractional refills and drift tiers. All tests use the existing Node/Playwright runners; no dependency was added.
- Review regressions first failed for contact/callout coexistence, a queued drift instruction after release,
  and a drift payout hidden by a longer existing mini boost. Contact banners now suspend callout display time;
  historical spark-tier copy stays valid in the queue; `driftPayout` records the actual reward for haptics.
- The existing 320 px touch-target test caught AUTO shrinking the throttle to 42.24 px. Physical pointer presses
  now own compression, while logical held state owns illumination. Release, cancel, capture loss, blur and pause
  clear the physical press. Screenshot inspection also caught landscape HUD overlap; the three phone viewports
  now assert that callouts stay clear of progress and flight-state panels, and all three pass.
- `npm test`: **170 passed**, zero failures/skips. Source/test syntax checks and `git diff --check` pass.
- `npm run test:browser -- --workers=2`: **88 passed in 5.7 minutes**, with one stable production build.
  This includes all existing gameplay/audio/storage/controls tests and nine new motion tests. Desktop 1440×900
  and touch 390×844, 320×740, 844×390 are covered. The production build succeeds with the existing >500 kB chunk advisory.
- Four real-race PNGs (desktop ranking, desktop events, phone portrait, phone landscape) were inspected
  before and after blue-box annotation. Markers use native-pixel DOM bounds; the images preserve readable
  event/position feedback, the speed needle, complete leaderboard rows and the held FLY button.
- **Frame cadence:** one headless Chrome browser at a time, DPR 1, AUTO racing, two-second warmup, 120
  requestAnimationFrame intervals per viewport. Desktop median 16.7 → 16.7 ms, p95 16.8 → 16.7 ms;
  touch 390×844 median 16.7 → 16.7 ms, p95 16.8 → 16.8 ms. No regression was measured in this short steady-race
  sample; it does not measure GPU completion or sustained physical-phone performance.
- Independent review findings were reproduced and repaired, then rechecked with no remaining actionable findings.
  Change size excluding documentation: production **+176 / −27 lines**, tests **+300 / −0 lines**.
  All 50 pre-existing artifact files were restored after browser tests and hash-checked against the pre-test archive.
  The five requested TODO entries and README are updated. No commit, push or deployment was performed.
- Physical Android/iOS devices, Safari, sustained thermal behavior and vibration feel remain unverified.
  Browser haptic verification observes calls to the native API boundary, not a hardware motor.

## Gameplay depth completion — 2026-10-20

Scope: History, gauge feedback, slide-pad feedback, track selection/scenery/unlocks, and style points/stars.

- **TDD:** new simulation/history tests first failed for missing points, stars and unlock persistence.
  Browser tests first failed on missing History and track selection, absent gauge refill feedback,
  and indistinguishable track skies. The existing slide-pad feedback passed without new production code.
  Additional red/green regressions cover black Neon rendering from zero-scale lit instances,
  legacy unlocks surviving the 50-record rollover, fractional star thresholds, chart direction,
  touch-readable unlock instructions, and mobile gauge/button overlap.
- `npm test`: **162 passed**. Production build succeeds; Vite retains its existing >500 kB chunk advisory.
- Final complete browser acceptance: `npx playwright test --fully-parallel --workers=2`:
  **78 passed in 5.0 minutes**, using one stable production build. Desktop 1440×900, touch 390×844,
  320×740 and 844×390 are covered. An earlier run passed 77/78; its remaining test received a local
  HTTP navigation failure while the build directory was being replaced.
- **Visual evidence:** seven inspected, blue-box annotated PNGs under `artifacts/gameplay-depth/`:
  desktop/mobile track menu, History, desktop/mobile real-race results, and mobile pad/gauges.
  History/menu screenshots use synthetic records; the results came from an actual 5 km UI-driven run
  (second place, 01:07.13, 600 points, one star). A fresh 320×740 menu shows the unlock rule without hover.
- A fresh-context review found the fractional-score mismatch and tooltip-only unlock rule. Both
  were reproduced, fixed and independently scored resolved; the reviewer also checked the gauge overlap
  correction. Its final `ship` disposition covers those fixes and their visible regressions.
- **Frame cadence:** one browser at a time, 120 intervals per viewport during a Coast race, DPR 1,
  installed headless Chrome/SwiftShader. Desktop 1440×900 median 16.7 ms before/after; p95 16.7 → 16.8 ms.
  Touch 390×844 median 16.7 ms and p95 16.8 ms before/after. See `frame-times.json` for the method and limits.
  This short sample does not establish physical-phone performance or measure GPU completion.
- Physical Android/iOS devices, Safari and sustained thermal behavior remain unverified. No new
  dependency, commit, push or deployment is part of this task; a separate release-version operation
  changed the checkout during implementation and its changes were preserved.
- Eight implementation/automated-acceptance checkboxes in `TODO.md` are marked complete; the
  physical-device acceptance gate remains explicitly unchecked. `git diff --check` and source
  syntax checks pass. Final annotated images are preserved; task-owned temporary captures/scripts
  are removed after delivery.

## HANDOFF implementation — 2026-10-19

Branch: `feat/handoff-gameplay-ui`. The eight remaining feature groups in `HANDOFF.md` are implemented, along with its simulation/data verifier gaps. Seventeen related `TODO.md` requirements are now checked. Gamepad mapping, tilt, History/Track-select screens, and physical-phone comfort remain outside this pass.

TDD evidence:

- Control/input regressions first failed for missing sensitivity persistence/scaling and editing triggering driving actions; the owner suite then passed 21/21.
- Effects/audio regressions first failed for missing pickup/ring markers and bursts, drift smoke/sparks, pickup cues, NITRO thrust and drift screech. Semantic color and pooled-material disposal regressions also failed before their fixes.
- Simulation/history regressions first failed for unchanged uphill recharge, invalid best times, missing ring-hit markers and missing unfinished-rival gap calculation. Additional lane-assist/gap/tunnel coverage exercised already-correct behavior; mutations removing the guards were detected.
- Browser regressions first failed for missing controls/NITRO UI, resuming while still editing, unsafe custom positions and MAX animation ignoring reduced motion. The new gameplay test earns the first five rings with real keyboard input, checks fractional fill/MAX/PERFECT LINE, then spends NITRO and drifts. The touch tests use trusted CDP touches and verify actual saved/mirrored positions, not just stored JSON.
- The complete browser run exposed MINI BOOST masking TOUCHDOWN. The HUD now preserves landing feedback; its existing acceptance test is the regression.

`npm test`: **154/154 passed**. `npm run build` succeeds (635.28 kB JS / 171.42 kB gzip), retaining Vite's existing large-chunk advisory. All source/test JavaScript syntax checks and `git diff --check` pass; there is no separate lint script.

The complete `npm run test:browser` run exercised all **66 tests**: **65 passed / 1 failed** in 8.3 minutes, exposing the landing-feedback regression above. After rebuilding its fix, `npx playwright test tests/browser.spec.js tests/handoff-browser.spec.js --grep 'complete 5 km|flight HUD|earned ring'` passed **3/3** in 1.8 minutes. This rechecked landing, real NITRO/drift/comfort behavior and the full race's history/per-track/legacy-best persistence. The complete suite was not repeated after that one-line priority fix.

Independent code review found and verified repairs for editor race transitions, safe-area placement and pooled-material disposal, then accepted the final landing-priority fix. No important findings remain.

Render-cost samples used the same 1440×900 headless Chrome, keyboard acceleration, two-second warmup and two-second measurement. Both produced 120 callbacks: mean **1.13 → 1.56 ms**, p95 **1.30 → 3.00 ms**. The added visible pickups, ring materials and feedback have measurable cost; pools remain fixed and allocate no per-frame geometry/materials. These short samples measure JavaScript/render submission, not GPU completion, sustained FPS or physical-phone thermals.

Four full-resolution Chrome screenshots were captured from the production build: controls/remapping, an earned PERFECT LINE with NITRO MAX, active NITRO, and mirrored touch-layout editing. Blue annotations use measured DOM bounds in native image pixels; each raw and annotated image was visually inspected. Temporary capture scripts/raw images are removed after delivery, retaining the four annotated images requested by the user.

An external release process stashed the uncommitted work mid-run. Only this task's files were restored, including the new test from the stash's untracked snapshot; that external stash was retained. The feature branch was then created without committing or publishing.

## Screenshot refresh — 2026-10-19

All 35 PNG/JPEG images in `artifacts/` were recaptured from the current production build in Chrome at full resolution, including the four README images. Existing filenames are retained for compatibility; images named `before` and `after` now both show the current build and no longer preserve the historical comparisons described below. Annotated images identify the current flight and airflow controls. Videos and performance JSON reports remain historical artifacts.

The README image URLs and social-preview URL use a new cache version. `public/og-image.jpeg` matches the refreshed `artifacts/readme-hero.jpeg`.

## Final results

- `npm test`: 15 tests passed, 0 failed. Driving, speed/road limits, launch speed, flight, fuel exhaustion, landing, collision altitude/cooldown, pause/invalid time steps, rival flight, reset, boost consumption, within-tick finish order, outward-facing geometry, keyboard cleanup and touch cancellation.
- `npm run test:browser`: production build succeeded; 6 real Chrome browser tests passed in 1.5 minutes. The suite serves `dist/` through Vite preview, not the development server.
- Browser checks exercised desktop keyboard driving/flight/landing, sound and camera controls, pause/resume, blur pause, restart, portrait multi-pointer driving/flight, coarse-pointer landscape, WebGL initialization failure, and preserved-page lifecycle events.
- The full 5 km sprint test drove with actual keyboard events, reached FINISHED, verified results and local best-time storage, then restarted with Race again. It took 1.1 minutes of wall time.
- JavaScript syntax checks passed for every source module. `git diff --check` was clean.
- `make run`: Vite started at `http://127.0.0.1:5173/`; an HTTP check returned 200 and confirmed the Skyline Rush application entry. The owned preview server was then stopped.
- Local repository root and `main` branch verified. No commits or remote; no publication performed.

## TDD evidence

1. Eight simulation tests failed against explicitly unimplemented rules, then passed after implementation.
2. Four input tests failed before keyboard/touch handling existed, then passed.
3. The geometry regression failed with `Triangle 0 points into the car`; corrected triangle winding made it pass.
4. Review regressions failed with boost still at 99.83% and a first-place crossing ranked second. Suspending boost recharge and interpolating finish crossing times made both pass.
5. Browser acceptance initially failed because the interface did not exist. Landscape controls and the preserved-page lifecycle each had a reproduced failing browser test before their fixes.
6. Final green suite: 15 unit tests plus 6 browser tests.

## Screenshots

- `artifacts/desktop-ready.jpeg`
- `artifacts/desktop-flight.jpeg`
- `artifacts/mobile-ready.jpeg`
- `artifacts/mobile-flight.jpeg`
- `artifacts/mobile-landscape.jpeg`
- `artifacts/race-results.jpeg`

Desktop, portrait, landscape and flight screenshots were visually inspected. All visuals show the actual WebGL renderer.

## Limits

Browser verification used installed Chrome and emulated mobile/touch contexts, not physical phones or Safari. The preserved-page test dispatches browser lifecycle events; it does not prove a particular browser's real navigation-cache eligibility. Audio enable/mute controls were exercised, but subjective sound quality was not assessed through speakers.

Vite reports the expected bundle-size advisory for the single Three.js game bundle (about 514 kB minified, 132 kB gzip). The build succeeds; no artificial chunk splitting was added because the renderer is required for gameplay.

No external deployment, remote Git operations or changes to other projects were made. No task-owned temporary files were created under `/tmp`.

## Immersive UI update — 2026-10-18

- Final `npm test`: 19 tests passed, 0 failed. Added red-to-green coverage for vehicle impact data/rebound, guardrail contact versus airborne clearance, one-shot landing events and particle initialization with a nonpositive first-frame delta.
- Final `npm run test:browser`: production build succeeded and all 10 Chrome tests passed in 2.2 minutes. Includes the complete 5 km sprint, restart, best-time storage, keyboard/touch flight, ascent/descent/touchdown instructions, collision report and recovery with sound enabled, reduced motion, landscape, and all six touch targets at 320px.
- Low-charge guidance was reproduced as an actual browser failure: the UI reported empty charge while positive usable charge remained. The corrected HUD offers lift while descending until charge is genuinely exhausted. The test asserts during descent so a later landing cannot falsely satisfy it.
- The 320px layout regression failed on a 42px boost target. The final test checks all six button rectangles are within the viewport and at least 44px wide. HUD layout was also adjusted to keep the car visible in landscape.
- The first rendering failure was traced to a negative initial animation-frame delta reviving dormant particle entries. A focused test reproduced the exact exception before the timing clamp was fixed.
- Fresh read-only review identified the low-charge and narrow-layout issues; both were corrected and reverified. No new runtime dependencies were added.

### Visual and performance evidence

`artifacts/ui-before.png` and `artifacts/ui-after.png` preserve the visual comparison. `flight-immersive.jpeg`, `collision-immersive.jpeg`, `mobile-narrow.jpeg` and `skyline-panorama.png` show real gameplay; the standard desktop/mobile/result captures were refreshed by the suite.

The comparison measures 90 animation frames after accelerating past 110 km/h and flying above 3m in 1440×900 headless Chrome on this machine. The original scene recorded 16.57ms mean / 16.8ms p95, approximately 60 FPS. Exact after measurements and browser error results are in `artifacts/performance-after.json`; the baseline is in `artifacts/performance-before.json`. These measurements do not establish performance on physical phones.

The updated production bundle is about 562 kB minified / 146 kB gzip and retains Vite's bundle-size advisory. The added bloom/lens passes use the existing Three.js dependency. Particle allocation is capped at 480 entries. Reduced motion removes shake, camera banking, dynamic field of view and speed streaks while retaining flight and contact feedback.

Physical phones, Safari and subjective speaker/headphone sound quality remain unverified. No deployment, commits, pushes or changes to other projects were performed for this update.

## Sound, handling and car polish — 2026-10-18

This pass builds on the existing uncommitted immersive update. It covers six areas: race flow, sound, contact/reward rules, controls, vehicle/visual polish and performance/responsive verification. No runtime dependency was added.

- Sound now distinguishes countdown/GO, menu actions, lift, boost, wind, braking, vehicle/rail impacts, touchdown, low charge, close passes and finish. One-shot nodes disconnect after playback, simultaneous voices are bounded at 24, and a compressor limits overlapping peaks. Audio remains opt-in.
- AUTO / T holds the accelerator; the brake overrides both throttle and boost. Camera/sound shortcuts retain held inputs. Steering ramps quickly, and boost release decelerates progressively. Native Space activation is retained for focused buttons.
- Close ground passes award charge, chain for five seconds up to ×5, and reset on contact. A same-tick collision cancels the reward. Results report close passes and contacts, with a final-500m HUD prompt.
- The car gains a shaped nose, stripes, five-spoke wheels, steering front wheels, active wing, brake lighting and boost exhaust. Countdown lights, reward feedback and 44px minimum toolbar targets are included. Bloom was reduced to preserve car detail.
- City transforms formerly recomputed 160 buildings plus 2,880 windows per frame. The city now translates as a group; each building/window batch only updates when its wrap offset changes, including on race resets. Leaderboard rows and speed-tick queries are also reused.

### Regression evidence

The original 19 unit tests passed before edits. Five new regressions then failed for abrupt boost release, instant steering, absent close-pass rewards and shortcuts clearing held input. Two more failed for same-tick collision rewards and Space hijacking focused buttons. These were fixed at the simulation/input owners. Final unit count: 26 passing.

Browser tests first failed on the absent AUTO control and zero output from enabling sound in the ready screen. Real Web Audio analyser samples now verify audible UI/countdown output, driving audio, mute and paused silence, including re-enabling sound while paused. This verifies generated signal, not subjective speaker/headphone quality.

Performance comparison uses 1440×900 headless installed Chrome, a two-second sample during keyboard-controlled flight, and timing around the application's requestAnimationFrame callback. It measures JavaScript/render-submission work, not GPU completion or physical-phone FPS. Baseline: 124 callbacks, mean 2.071ms, p95 3.300ms. Raw comparison artifacts are stored alongside the screenshots.

Final performance sample: 120 callbacks, mean **1.460ms**, p95 **1.900ms**, no browser page errors. Compared with the pre-optimization scene, mean callback cost fell about **29.5%** and p95 about **42.4%**. Both samples used the local Vite development server and the same capture sequence; the acceptance suite separately uses the production build. This is a short local comparison, not a general GPU/FPS benchmark.

Artifacts for this pass: `polish-before.png`, `polish-after.png`, `countdown-polish.png`, `boost-polish.png`, `close-pass-polish.png`, and `polish-performance-before.json` / `polish-performance-after.json`. Standard desktop, mobile, collision, flight and result captures were refreshed by browser acceptance. The 320px check covers all six driving controls plus five toolbar buttons, checking both width and height >=44px and horizontal viewport bounds.

An additional failure probe reproduced an audio allocation error leaving a partial context alive (`Cannot read properties of undefined (reading 'gain')`). Failed initialization now closes and clears that context. The browser regression injects the allocation failure into real Web Audio and verifies driving still works and a later enable attempt remains safe.

### Final acceptance

- `npm test`: **26 passed**, 0 failed.
- `npm run test:browser`: production build succeeded; **13 Chrome tests passed in 2.7 minutes**. This includes desktop, portrait and landscape controls, countdown/AUTO/brake behavior, actual audio signal and mute/pause handling, audio allocation failure/retry, contact recovery, close-pass HUD, reduced motion, WebGL failure, preserved-page lifecycle and the full 5 km sprint with results/storage/restart.
- The final complete sprint finished first in 01:00.13, with 21 close passes and zero contacts. Results and reward screenshots were visually inspected, along with desktop flight, boost and the narrow mobile layout.
- Every source module passed `node --check`; `git diff --check` passed. There is no separate configured lint script.
- Final JS bundle: **567.73 kB minified / 148.45 kB gzip**. Vite's existing >500 kB advisory remains; no additional runtime dependency or artificial chunk split was introduced.
- Tracked worktree diff versus HEAD, including edits already present at task start: source +692/-109 lines; tests +298/-0 lines. This excludes the pre-existing untracked effects module/tests and is not a count solely attributable to this pass.
- The task's six acceptance areas are covered. Physical phones, Safari, sustained thermal performance and subjective audio listening remain unverified. No commits, pushes or deployment were performed. The owned development/preview servers were stopped; no task-owned `/tmp` files were created.
