# Verification — 2026-10-18

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
