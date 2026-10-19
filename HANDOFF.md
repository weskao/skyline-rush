# HANDOFF: gameplay-depth logic pass (run goal-20261019-203853)

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
- **NITRO (#29/#30)**: E and L fire an invisible NITRO in the live game until HUD/rendering land. Tank tier spawns airborne only (TODO says "inside traffic gaps"; traffic moves, so no static gaps). `nitroUses` counts fresh activations only (a triple-chain achievement needs its own counter). The 0.7 retention also applies to rival contact. Overflow converts 32 fuel per charge, fuel capped at 100. Pickups are never marked collected (the renderer can hide those behind the car).
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
