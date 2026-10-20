# UI implementation handoff — Codex → Claude Code

## Scope and ownership

Codex owns the existing UI, animation, camera presentation, touch interaction and browser
verification. Claude Code owns new gameplay rules, result validation, progression and saved
gameplay data. Gamepad support, mapping UI and hardware acceptance are the lowest priority
and excluded from this iteration. No dependency, deployment or remote push is planned.

Keep the existing visual identity and motion tokens. Use transform/opacity for DOM motion;
respect system reduced motion and Comfort mode. The finish presentation must not change
the race clock, finish order, score, or number of saved race records.

## Implementation plan / progress

Each batch follows RED (observable regression) → GREEN (minimal implementation) → regression
checks → documentation update → Conventional Commit. All work runs in this session.

- [x] Race presentation: intro exit, countdown entrance and GO camera push, pause depth,
  restart wipe, 0.6 s render-only finish coast / side camera, results entrance, sequential
  stat counts, earned stars and NEW BEST. Reuse the existing tick/GO/finish audio cues.
- [x] Menu: bounded palette previews on track cards; History entrance/exit with focus restoration.
- [x] Controls: adjacent FLY/BOOST single-pointer AIR DASH, right-thumb arc, Tilt permission,
  calibration, orientation handling and fallback. Preserve layout editing, remapping and drift.
- [x] Extension UI: Ghost preference, daily challenge, achievements and cosmetic surfaces;
  only expose honest available/unavailable states until gameplay contracts exist.
- [ ] Final acceptance: unit suite, complete Playwright suite, desktop / mobile portrait /
  narrow / landscape visual review, reduced-motion and comfort checks, frame cadence sample.
- [ ] Final annotated screenshots and Telegram delivery via screenshot-mark-send; done-report.

## Presentation contracts

- `race.phase`: `ready | countdown | racing | paused | finished` remains authoritative.
- Countdown consumes `race.countdown`. Audio already emits tick / GO / finish in `audio.js`.
- Results consume `race.result`, `race.elapsed` and the existing history/best functions.
- Finish animation operates after simulation finishes; presentation time never feeds `stepRace`.
- UI-only transition state is private to the presentation layer; restart and navigation cancel it.
- Input continues to emit `steer`, `brake`, `fly`, `boost`, `nitro`, `throttle`.
- Storage and device permissions may fail; racing and existing controls must remain usable.

## Claude Code follow-up

Do not implement gamepad work during this iteration. Preserve the presentation contracts and
re-run browser tests if changing race phases or input. New Ghost traces (10 Hz), date-seeded
challenge simulation/boards, achievement awards and cosmetic unlock rules still require real
simulation/storage implementations; a UI surface alone does not complete their TODO entries.

## Evidence and limits

Initial inspection: existing countdown lights and sound cues, History slide-in, touch buttons,
motion tokens, input lifecycle and result persistence are reused. Only `TODO.md` was dirty at
task start (the already authorized gamepad deferral). Implementation/test results are recorded
below as batches complete. Physical phones, Safari and subjective audio quality need separate
hardware verification; Chrome touch emulation does not establish those results.

### Batch 1 — race presentation and controls

- Presentation regressions first failed on missing preview elements; a stricter 600 ms
  interruption check then reproduced a running 4 s animation ignoring reduced motion.
  Finish integration found that the immediate reduced-motion path skipped focus transfer.
  Both were fixed at the presentation boundary. Unit tests protect race/result immutability.
- `src/presentation.js:createPresentation().update(race, dt, calm)` consumes display-frame
  delta only. The finish coasts visually for 0.6 s, reveals results, then counts time/best/style
  over 1.2 s. `world.render` accepts an optional fifth presentation argument. No game rule changed.
- Existing audio tick/GO/finish signals are reused rather than duplicated.
- Track preview loops pause when clipped, hidden or outside the ready screen; comfort/reduced
  motion removes them. History exit preserves native modal focus and Escape semantics.
- Input regressions first failed on the FLY/BOOST seam and unsupported `tilt` preference.
  An 8 px seam applies only to touch movement on action buttons. Cancellation, clear and
  blur release all actions; toggle-FLY retains its existing latch semantics.
- Tilt normalizes gamma/beta to screen angle, calibrates the first valid sample, recalibrates
  on rotation/clear, uses a 2 degree dead zone and 20 degree full lock, and expires stale
  steering after 500 ms. Permission is requested only from explicit selection/recenter.
  Denial/error or no initial readings within 2.5 s falls back to Slide. Saved Tilt requires
  re-enabling after reload. Validate direction/calibration on actual iOS/Android hardware.
- Evidence so far: Node suite 177 passed; 8 presentation browser tests passed (including
  complete desktop and reduced-motion phone races). Final combined suite is still pending.

### Batch 2 — Garage and progression UI

- Garage reuses the single live WebGL canvas in `#garage-preview`; `world.resize()` now reads
  the canvas's actual bounds. Closing (button or Escape) restores the canvas to the app,
  its full-screen viewport, Pearl appearance and opener focus. Preview never writes storage.
- `src/appearance.js:PAINTS` is the shared catalog; `world.previewAppearance(PAINTS[id])`
  changes player paint and baseline tail light color only. New skins are explicitly preview-only;
  no fabricated unlocks or stat changes. The Equip action remains disabled.
- Future UI integration points (all saved/rendered data must be validated and displayed with
  textContent, following the existing History pattern):
  - `#ghost-enabled` / `#ghost-status`: currently disabled, no recorded trace. Enable only once
    10 Hz recording, per-track best-trace validation and playback are implemented. Define a
    persistent user preference then; no new replay storage format is assumed by this UI.
  - `#daily-status`, `#daily-start`, `#daily-board`: currently honest unavailable/empty states.
    Supply a date-seeded track + modifier, start flow and distinct board in the logic pass.
  - `#achievement-list [data-medal]`: `first-win`, `clean-run`, `perfect-five`, `nitro-chain`.
    Supply validated awarded facts, then replace the unawarded copy/style; UI does not infer
    awards from raw History or confuse fresh NITRO activations with extensions.
  - `#garage-equip`: implement star-based ownership and saved equipped paint before enabling.
    Restore the actual equipped appearance when previews close; Pearl is the current default.
- These surfaces complete only their nested UI TODOs. The four parent gameplay TODOs stay open.
- RED: four viewport tests failed on the absent Garage entry. Integration then reproduced
  Escape being swallowed by the driving shortcuts; both dialogs now use the established
  History keyboard propagation guard. Four collection tests pass, with 14 existing responsive
  checks passing after adding scroll padding for fractional-pixel clipping.
- Visual review found landscape countdown overlapping the instruments; a new geometry
  regression failed before correction. Countdown now has intrinsic width, a clear mobile
  location and temporarily hides mobile telemetry through GO. Review also found the finish
  shadow left behind; it now shares the player's presentation Z offset.
- A second real-race screenshot pass reproduced NITRO covering the centred car at 320 px and
  the landscape leaderboard covering the charge/altitude instruments. New browser geometry
  checks failed on both before correction. NITRO remains above FLY at the outer edge; short
  wide touch screens place rankings between position and progress, leaving charge unobscured.
  All four presentation viewport checks pass. Earlier full-suite runs were intentionally
  interrupted when screenshot review found these issues; only the final stable-build run
  counts as whole-suite acceptance.
- One fixed-build run completed at 121/122: the pre-existing earned-ring pilot missed its
  flight window under parallel rendering. The same unchanged test passed in isolation.
  Only its driver was moved from host round trips to page animation frames, sending the
  real Space key handlers and reading the real HUD; all reward/persistence assertions remain.
  Two parallel repeats now pass (26.7 s). The final full-suite rerun is still required.

<details>
<summary>Previous handoff (historical; current scope above takes precedence)</summary>

# HANDOFF: gameplay-depth logic pass (run goal-20261019-203853)

## Follow-up implementation (2026-10-19)

- [x] Controls: live key remapping, conflict/reset feedback, steering sensitivity, editable touch positions and persistence.
- [x] HUD: AIR DASH, fractional three-charge NITRO meter, touch NITRO, PERFECT LINE and drift/mini-boost feedback.
- [x] Rendering/audio: NITRO camera/lens, collectible pickup feedback, drift yaw/smoke/sparks/screech, correctly sized and coloured rings with collection bursts.
- [x] Verifier gaps: uphill recharge, finished-rival sprint gaps, invalid best times, lane-assist/gap/tunnel regressions and successful ring-hit markers.
- [x] Acceptance: TDD red/green evidence, unit/build/browser checks, annotated UI screenshots and Telegram delivery; tick only verified TODO requirements.

The original handoff below records the starting state. Explicitly excluded features remain excluded. Three chained NITRO presses follow the existing 2.5 + 2 + 2 = 6.5 s rule; drift remains derived from brake + steer rather than adding a separate input.

Branch: `feat/handoff-gameplay-ui`. The implementation also closes layout editing before starting/restarting/resuming, respects device safe areas for custom positions, releases every marker material on disposal, and suppresses MAX animation in comfort/reduced-motion modes. Seventeen newly completed requirements are checked in `TODO.md`; gamepad mapping was split out so it stays unchecked.

Verification: unit tests **154/154**; production build and source/test syntax checks pass. Complete Chrome run **65/66** exposed MINI BOOST masking TOUCHDOWN; after rebuilding its fix, the landing, earned-ring/NITRO/drift and full-race/history flows passed **3/3**. The complete suite was not rerun after that one-line fix. Independent review passed. See `docs/verification.md` for TDD evidence and the exact verification boundary. Physical phones, Safari and subjective audio quality remain unchecked.

Delivery: four inspected, annotated UI screenshots and the zh-TW completion summary were sent through Telegram, with successful `sendPhoto` / `sendMessage` receipts. The requested annotated images were retained; temporary raw images, capture scripts and logs were removed. No commit, push or deployment was performed.

<details>
<summary>Original handoff (historical starting state)</summary>

State: `npm test` 132/132, `npm run build` ok. The game rules for 27 in-scope items are in `src/game.js` and the pure modules `src/key-map.js`, `src/history.js`, `src/rng.js`, with unit tests. What remains is UI, rendering and feel. Browser/Playwright tests and on-device checks were not run.

Inventory: 27 of 27 in-scope items processed. 19 fully ticked, 5 partly ticked (#1, #29, #30, #31, #32), 3 left unticked (#3, #11, #14). 39 TODO lines ticked in total.

## Number to TODO line map

| # | TODO line(s) | Subject | Result |
| --- | --- | --- | --- |
| 1 | L224, L231 | AIR DASH 22/s + acceptance test | L231 ticked, L224 open |
| 2 | L226 | Alternate keys J/K/L | ticked |
| 3 | L235 | Steering curve + sensitivity | open |
| 4 | L236 | Lane assist | ticked |
| 5 | L237 | Barrier scrape | ticked |
| 6 | L238 | Hitbox 1.9 to 1.7 | ticked |
| 7 | L239 | Takeoff buffer | ticked |
| 8 | L240 | Glide | ticked |
| 11 | L90 | Key remapping | open |
| 13 | L95 | input.js reads the saved map | ticked |
| 14 | L96 | Controls acceptance (incl. browser test) | open |
| 15 | L242 | Touch brake to the left thumb | ticked |
| 16 | L124 | TRACKS table + createRace(trackId) | ticked |
| 17 | L125 | Special sections | ticked |
| 18 | L128 | Track acceptance tests | ticked |
| 19 | L187 | History record per race | ticked |
| 20 | L189 | Best time per track + migration | ticked |
| 21 | L191 | Career stats | ticked |
| 22 | L193 | Storage failure safe | ticked |
| 24 | L201 | Slipstream | ticked |
| 25 | L203 | Rival NITRO + personalities + rubber band | ticked |
| 28 | L207 | Final sprint | ticked |
| 29 | L145-153 | NITRO | L147, L148, L151, L153 ticked; L145, L146, L150, L152 open |
| 30 | L157-161 | 3-charge cap | L157, L159, L161 ticked; L158, L160 open |
| 31 | L247-268 | Drift | L247, L248, L249, L253, L254, L264, L265, L268 ticked; L252, L266, L267 open |
| 32 | L176-183 | Rings | L178, L180, L182, L183 ticked; L177, L181 open |
| 33 | L59 | Slide down = brake / drift | ticked |

## Unticked items and what remains

- **#1 L224**: the logic and test exist (22/s drain, cap kept). Remaining: the HUD `AIR DASH` label.
- **#3 L235**: ramp 0.15 s and 9 m/s lateral cap are done and tested. Remaining: the "Steering sensitivity" setting in the settings screen.
- **#11 L90**: `src/key-map.js` has rebind with swap, reset, validate, load/save. Remaining: the remapping screen (click action, press key, flag conflicts, Reset button).
- **#14 L96**: unit tests for slide-pad mapping and key-map conflicts exist. Remaining: the browser test at touch viewports (slide steering, Buttons mode, mirrored layout, edited positions survive reload).
- **#29 L145**: wider FOV + lens effect. **L146**: HUD shows the charge fill progress. **L150**: touch NITRO button (E/L keys exist). **L152**: reuse `effects.js` particles and `audio.js` sounds for pickups.
- **#30 L158**: 3-segment capsule HUD bar with `NITRO MAX` pulse. **L160**: see the spec contradiction below.
- **#31 L252**: car body yaw 20-30 degrees in `world.js`. **L266**: tire smoke, sparks (`effects.js`) and screech (`audio.js`). **L267**: `player.drift` and the enter/hold/release payout in `stepRace` exist; `input.drift` was not added because drift is derived from brake + steer in the sim, so the line stays open (tick it, or reword it to drop `input.drift`).
- **#32 L177**: PERFECT LINE +1 nitro is done and tested; remaining the big HUD callout. **L181**: `world.js` gates read position from `race.rings`; remaining colour per type and burst/disappear on pass.
- Related open lines from the same TODO sections (not in scope): L190 History screen/sparkline, L192 ghost race, L194 History browser test.

## Decisions for the user

- **L160 contradicts L147.** Extend is +2 s (L147), so three presses give 2.5 + 2 + 2 = 6.5 s, not the 7.5 s in L160. Either edit L160 to 6.5 s, or set `NITRO_EXTEND = 2.5` in `src/game.js`. The test asserts 6.5 s.
- **Ticks committed once.** The per-item ticks of TODO.md were made in the working tree by each worker and committed here in one commit (workers were told never to stage TODO.md).

## Playtest and tuning notes

All constants are named exports at the top of `src/game.js`.

- **#3 steering**: `STEER_RAMP` 0.15 s, high-speed lateral cap 9 m/s (was 12). Feel the stick response on keyboard and pad; an existing guardrail test was edited deliberately (steering 1 = head-on).
- **#4 lane assist**: gated by `input.laneAssist`, which `main.js` sets equal to AUTO. Waits out contact and standstill.
- **#5 scrape**: `SCRAPE_RATIO` 0.1; `car.scrape` has no HUD/audio/VFX consumer yet.
- **#7 takeoff buffer**: `TAKEOFF_BUFFER` 1.5 s acts as a virtual FLY hold (not consumed at takeoff); the HUD "reach speed" hint reads `input.fly`.
- **#8 glide**: fall 11 to 7 when FLY is released; an exhausted car with FLY still held falls at 11, a released one at 7.
- **#15 touch brake**: needs an on-phone thumb-comfort check for brake + steer drift (landscape and portrait, Large size, left- and right-handed). In Buttons mode telemetry lifts 180 px via `:has()` (iOS 15.4+): check for a collision with the top HUD on short landscape. Slide mode hides the brake button (the pad still brakes).
- **Drift (#31)**: thresholds 1/2/3 s pay nitro 0.15/0.3/0.5 and mini boost 0.5/0.8/1.2 s. NITRO's +40 acceleration still applies while drifting; dropping below 45 m/s pays out as a release; a rail scrape does not cancel drift; combo x2 is +2 per near-miss, capped at 5; no gap-fall cancel test; drift and mini boost are invisible outside the sim.
- **NITRO (#29/#30)**: E and L fire an invisible NITRO in the live game until HUD/rendering land. Tank tier spawns airborne only (TODO says "inside traffic gaps"; traffic moves, so no static gaps). `nitroUses` counts fresh activations only (a triple-chain achievement needs its own counter). The 0.7 retention also applies to rival contact. Overflow converts 32 fuel per charge, fuel capped at 100. Pickups are marked `taken` once collected (`src/game.js`), so the renderer can hide them.
- **#24 slipstream**: `SLIPSTREAM_TIME` 1.5 s, cap bonus +6, nitro +0.25, paid once per engagement and re-armed after leaving the draft; the cap bonus stacks with nitro/boost (max 124).
- **#25 rivals**: `RIVAL_NITRO_CHARGES` 2, time 2.5 s, bonus +12 m/s (raises the speed cap only). NOVA fires at 8 s then every 18 s; ORBIT fires in the air (altitude > 2, speed >= 60) once per hop, hop period 9 s vs 13 s; APEX from 75% of the race. Rubber band: `RUBBER_BAND_MAX` 0.04, free 50 m, range 250 m. A rival over its cap decays at (14 + i) m/s² instead of snapping.
- **#28 final sprint (T11, commit 6b43914)**: `sprintFactor` in `src/audio.js` ramps the race-music tempo 1.0 to 1.15 over the last 500 m; the HUD text `FINAL 500 M · +N m · −N m` reuses `#race-status`. The tempo change and the HUD text were not checked by ear or eye, and wrapping on narrow screens is unchecked. Only the sprint factor has a unit test.
- **#33 L59**: ticked on input + game tests (`createControls.read()` yields brake + steer; the sim drifts). The on-screen feel of a down+sideways slide is unchecked.

## Known mines and gaps

- **Key remap UI** (when built) must call `controls.clear()` on rebind (a held key would change action mid-hold). `main.js` passes a fixed `getKeyMap` closure loaded once, so a rebind needs it re-read. `main.js` does not call `rebind()`, so its `invalid` error is never shown.
- **Track select not wired**: `main.js` always calls `createRace()` (coast). `main.js` L523 and `world.js` L552-553 still use `RACE_LENGTH` (switch to `race.length`). Rivals ignore special sections. The traffic recycle `+1400` is a constant. Tracks `neon`, `canyon`, `aurora` exist in the sim only, with no scenery.
- **Rings**: gates are drawn at a fixed radius 4.8, so risk rings (radius 2.4) look 2x too big; scale by `ring.radius`. A shield also absorbs wall/roof hits. The ring hit test uses the end-of-step x and altitude. Coast has 22 rings every 220 m up to 4840 (the world shows the next 7; none in the last ~160 m). Mystery effect = `mysteryEffect(race.seed, ringIndex)`. Only risk rings add score (500 each).
- **History**: `careerStats` is a pure function with no UI; no History screen, sparkline or ghost. `main.js` still writes the legacy `skyline-rush-best` for coast (`tests/browser.spec.js` L388 reads it) and keeps in-memory `sessionBests`. `recordBest` does not validate a NaN time. Per-track bests live under `skyline-rush-best-tracks`.
- **Process**: workers must finalize their result file (VERDICT trailer) before returning; T8 left it `IN_PROGRESS`.

## Out of scope (not started)

#9 gamepad support, #10 tilt steering, #12 gamepad mapping view, #23 style score, #26 daily challenge, #27 achievements; all item-8 UI/animation polish (TODO L270-294); `world.js` rendering (per-track palette, ring colours/bursts, nitro/drift visuals); History and Track-select screens.

## Deviations from the plan

- TODO.md ticks were committed once at the end (`docs(todo): tick completed items`), not per item.
- Fix commit `3b014e0` (F1) addressed a T8 review finding: guard blocked `localStorage` and invalid keys in the key map.
- T11 = #28 final sprint, commit `6b43914`.
- Existing tests were edited only where a spec change forced it (steering guardrail test); `coast` behaviour is otherwise unchanged and its original tests pass.

## Verifier findings (not fixed)

- Aurora `uphill` sections (`RACE_TRACKS.aurora`, `src/game.js` L23-24) are data only; `stepRace` ignores them. TODO means slower ground recharge there.
- Final-sprint gap readout (`src/main.js` ~L594-604) also counts rivals that already finished; their `distance` keeps growing, so a finished rival can show as `+N m` ahead.
- Untested lines (removal still passes `npm test`): the `steer === 0` check for lane assist, the `fell ||` check that makes a gap respawn skip rings, and the tunnel ring rules (risk becomes nitro, altitude 1.5; neon has 6 tunnel rings).
- `src/main.js` wiring (history save on finish, sessionBests, legacy best write, key-map load, gap readout) has no unit test.
- Run tests with `npm test` or `node --test tests/*.test.js`; `node --test tests/` fails on Node 25.

</details>

</details>
