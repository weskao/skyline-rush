# Remaining TODO items — logic / UI split

Scope: the four unchecked non-gamepad items in `TODO.md` (gamepad input, mapping view and its
acceptance stay deferred). Logic lands in `src/game.js` test-first (`tests/game.test.js`) and is
implemented by Claude; UI (`world.js`, `main.js`, `style.css`, `audio.js`, `effects.js`, browser
specs) is implemented by Codex. **The "State exposed to UI (contract)" blocks below are frozen**:
both AIs code against them, so Codex can read this file directly — no separate handoff file.
If a contract must change, Claude edits the block here first and says so in the TODO sub-item.

Decisions confirmed 2026-10-20: 1(a) no new NITRO physics · 2(a) corridor = free flight +
speed-cap bonus, no distance warp · 3 = yes, Coast gets a shortcut.

Status 2026-10-20: §B, §C and §D are closed (logic, UI and browser tests merged in `18d66d1`).
Codex ran out of quota mid-§C after writing the red tests and most of the code; Claude finished
§C and built §D in the same `ui/air-tricks-shortcuts` worktree. Only §A (real phones) remains.

## File ownership and parallel schedule

| Owner | Files | Never edits |
|---|---|---|
| Claude | `src/game.js`, `tests/game.test.js`, this plan | `world.js`, `main.js`, `style.css`, `audio.js`, `effects.js`, `tests/*-browser.spec.js` |
| Codex | `src/world.js`, `src/main.js`, `src/style.css`, `src/audio.js`, `src/effects.js`, `tests/*-browser.spec.js` | `src/game.js`, `tests/game.test.js`, this plan |
| Both | `TODO.md` — each ticks only its own `Logic (Claude)` / `UI (Codex)` sub-item | |

Run the two AIs in **separate git worktrees** (Claude in the main checkout, Codex in
`git worktree add ../skyline-rush-ui -b ui/<item>`): one tree with half-written edits from the
other side makes `npm test` flaky, and Codex's browser tests need the logic merged to pass.
Merge logic first (local `--no-ff` merge after `npm test`), rebase the UI branch, then run
`npm run test:browser` there.

| Stage | Claude (logic) | Codex (UI) | Dependency |
|---|---|---|---|
| 1 | §C Air tricks | §B label `AIR DASH · NITRO` | none |
| 2 | §D Shortcuts | §C Air tricks UI | Codex codes against the §C contract; browser test runs green only after stage-1 logic is merged |
| 3 | — | §D Shortcuts UI | same, against the §D contract after stage-2 logic merges |

Until the matching logic is merged, Codex reads the new fields defensively (`car.trick?.done`)
so the UI branch builds and the existing browser suite stays green on its own.

Rules carried over from `TODO.md`: game rules never check the device; `world.js` only renders;
`main.js` owns HUD and persistence; placement comes from the track seed; every browser test runs
at a desktop and at least one touch viewport; animate only `transform` / `opacity` and respect
`prefers-reduced-motion` / comfortable mode.

## Inventory (4 items)

| # | TODO line | Item | Claude (logic) | Codex (UI) | Manual |
|---|---|---|---|---|---|
| A | 0 · line 41 | Physical-device acceptance | — | — | ✔ user, on a phone |
| B | 7B · line 239 | NITRO + FLY together | acceptance test | HUD label | — |
| C | 6 · line 213 | Air tricks (barrel roll) | detection, payout, cancel | car roll pose, callout, cue, haptic | — |
| D | 6 · line 219 | Shortcuts (elevated corridor) | section type, rules, pickups, pylons | deck, pylons, sign, HUD, callout | — |

Logic order: B (done 2026-10-20, 2 tests) → C → D. C and D both touch the landing / contact code
path in `game.js`, so the logic halves are sequential; the UI halves trail one stage behind
(schedule above).

## Decisions to confirm before coding

1. **B — "straight-line air dash" meaning.** (a) *Recommended:* no new physics; the separate
   `nitro` reserve already lets FLY + NITRO coexist, so B is an acceptance test plus a HUD
   label. (b) Add physics: while NITRO is active in the air, halve the lateral cap and ignore
   crosswind so the car tracks straight. (b) changes handling on Canyon; pick only if (a) feels
   wrong in play.
2. **D — what "shortcut" buys in a 1-D distance model.** (a) *Recommended:* a faster line —
   `+12` speed cap and free flight inside the corridor, no distance warp. (b) Literal shortcut:
   `+60 m` distance on completing the corridor; reuses the gap-respawn ring-skip path but warps
   past traffic and ghost traces. (a) has no side effects on rings, ghosts or history.
3. **D — Coast gets a shortcut too?** `TODO.md` says "per track". *Recommended:* yes, all four
   tracks; `coast` ground behaviour is untouched (the corridor only affects an airborne car), so
   the "coast behaves exactly as today" rule holds, but the assertion
   `RACE_TRACKS.coast.sections.length === 0` in `tests/game.test.js:454` becomes "coast has
   only `shortcut` sections".

## A. Physical-device acceptance (manual)

Not implementable by Claude or Codex. Stays `- [ ]` until the user runs it:

1. `npm run build && npm run preview`, open on a mid-range Android (Chrome) and an iPhone
   (Safari) over LAN; one Coast and one Neon run each, portrait and landscape.
2. Chrome: `chrome://inspect` → Performance panel, record 20 s of racing, note frame time p95.
   Safari: Develop → device → Timelines → Rendering frames.
3. Check tilt steering calibration (Settings → Controls → Tilt) and haptics fire on impact.
4. Record the numbers in `docs/verification.md` under a new dated heading, then tick line 41.

## B. 7B — NITRO doesn't use fuel; FLY + NITRO always works together

### Logic (Claude)

Already true in `src/game.js`: `nitro` is its own reserve (`addNitro`, `NITRO_MAX`), the fuel
drain at `stepRace` lines 364–374 never reads `nitroTime`. Missing: the acceptance test.

- Test: race with `nitro = 1`, `speed = 60`, hold `{ fly: true, nitro: true }` for 2 s at
  `dt = 0.05` → `thrusting === true`, `nitroTime > 0`, `exhausted === false`,
  `speed > MAX_SPEED + 14`, and `fuel` dropped by `19 × 2` only (within 0.5).
- Test: same with `{ fly: true, boost: true, nitro: true }` → fuel drain is the AIR DASH 22/s,
  not more; cap is `MAX_SPEED + 30`.
- No production change under decision 1(a).

### UI (Codex)

- `src/main.js:832–833`: flight-state label shows `AIR DASH · NITRO` when `car.thrusting &&
  car.nitroTime > 0` (today AIR DASH wins over NITRO ACTIVE and hides the nitro state).
- Browser test: none new; covered by the existing HUD label assertions if one exists for
  AIR DASH, otherwise one assertion added to `tests/motion-browser.spec.js`.

## C. Air tricks — barrel roll

### Rules

| Constant | Value | Meaning |
|---|---|---|
| `TRICK_FLICK_WINDOW` | 0.3 s | a steer press in the opposite direction within this window of the previous press, while airborne, starts a roll |
| `TRICK_ROLL_TIME` | 0.7 s | roll duration; the pose is finished when `trick.time ≥ TRICK_ROLL_TIME` |
| `TRICK_NITRO` | 0.25 | payout on a landed roll, through `addNitro` (cap / overflow rule from item 3 applies) |
| `TRICK_HARD_LANDING` | 11 m/s | `landing.speed` at or above this loses the payout |

Why 11: glide fall acceleration is 7 m/s², so `landing.speed = √(2·7·h)`; 11 m/s means a roll
can be landed from ≤ 8.6 m without feathering FLY, and from 12 m (the altitude cap) only by
tapping FLY before touchdown. Tune after play, keep it a single constant.

Flick detection reads the raw `steer` input sign (not the ramped `car.steering`): the player
flicks a key or the slide pad, and the ramp would hide a fast flick.

### State exposed to UI (contract)

```js
player.trick        // null | { dir: ±1, time: seconds, done: boolean }
player.trickPayout  // null | { time: race.elapsed, nitro: 0.25 | 0, hard: boolean }
player.flick        // internal: { dir, time } — the latest steer press and when it began
player.steerSign    // internal: last frame's raw steer sign, to detect a fresh press
```

- `trick.dir` is the direction of the second press (left → right flick gives `dir: 1`).
- `trick` lives from the flick until the landing frame (or a cancel), where it is set back to
  `null`; a finished roll has already turned 2π, so the pose returns to 0 with no snap.
- Implemented 2026-10-20 (`src/game.js`, 8 tests under "Air tricks" in `tests/game.test.js`).
  One addition to the rules: touching down over a gap is a fall, so a finished roll there pays
  nothing.
- `trickPayout` is written once per landing (same pattern as `driftPayout`, read in
  `src/main.js:888–894`). `nitro: 0, hard: true` is the "hard landing, reward lost" case.
- Cancelled rolls (contact, roof hit, gap fall, landing before `done`) write no payout.

### Logic (Claude) — TDD list, `tests/game.test.js`

1. Airborne flick (steer `+1` then `−1` within 0.3 s, `altitude > 0`) sets `trick = { dir: -1,
   time: 0, done: false }`; the same flick on the ground does nothing.
2. A flick slower than 0.3 s does not start a roll; a second flick during a roll is ignored.
3. `trick.done` turns true after `TRICK_ROLL_TIME`; speed, x and altitude are unaffected by the
   roll (cosmetic pose only).
4. Landing with `done` and `landing.speed < 11` → `nitro + 0.25`, `trickPayout.hard === false`.
5. Landing with `done` and `landing.speed ≥ 11` → nitro unchanged, `trickPayout = { nitro: 0,
   hard: true }`.
6. Landing before `done` clears `trick`, no payout.
7. Vehicle contact, tunnel roof hit and gap fall mid-roll clear `trick`, no payout.
8. Payout goes through `addNitro`: at `nitro = 2.9` a landed roll gives `3` and converts the
   excess to fuel (reuses the overflow assertion style of the drift test at line 805).
9. `no-flight` daily modifier: no roll can start (car never leaves the ground — covered by 1).

Production change is one block in `stepRace`: flick bookkeeping after the steer read
(line 290), roll timer next to `miniBoost` (line 342), payout inside the existing landing branch
(line 383), `trick = null` inside `contact`, the roof-hit branch and the gap branch.

### UI (Codex)

- `src/world.js:491–492`: add `rotation.z = trick ? dir · 2π · min(1, time / TRICK_ROLL_TIME)`
  next to the drift yaw; ease with the existing motion curve, none in reduced motion (snap to
  0 — the pose still completes but without the spin).
- `src/main.js`: callout `BARREL ROLL` on `trick` appearing, `TRICK +0.25` on
  `trickPayout.nitro > 0`, `HARD LANDING` on `trickPayout.hard`, via `createCallouts`; haptic
  `[12, 20, 12]` on payout through the existing `navigator.vibrate` try/catch (line 890).
- `src/audio.js`: one `whoosh` cue on roll start, reuse the touchdown impulse on landing.
- Flight-state label: `TRICK` while `car.trick && !car.trick.done` (position it below
  `AIR DASH` / `NITRO` in the existing ternary).
- Browser test (`tests/motion-browser.spec.js`): keyboard `A` then `D` within 200 ms while
  airborne shows the `BARREL ROLL` callout; at 390×844 the same via two quick slide-pad moves.

## D. Shortcuts — one flight-only elevated corridor per track

### Rules (decision 2a, 3 yes)

A `shortcut` section is an aerial corridor above one edge lane. Inside it, flight is free and
faster; pylons stand in it as the risk.

| Constant | Value | Meaning |
|---|---|---|
| section shape | `{ from, to, type: 'shortcut', x: ±7.5, altitude: 6 }` | 450–550 m long, over lane 1 or 4; added to all four `RACE_TRACKS` without overlapping existing sections |
| `SHORTCUT_HALF_WIDTH` | 3 m | `abs(car.x − x) < 3` |
| `SHORTCUT_TOLERANCE` | 2.5 m | `abs(car.altitude − altitude) < 2.5` → corridor spans 3.5–8.5 m, hold it by feathering FLY |
| `SHORTCUT_CAP_BONUS` | +12 m/s | added to the speed limit while inside (same slot as `SLIPSTREAM_CAP_BONUS`) |
| free flight | — | flight fuel drain is 0 while inside; BOOST still burns |
| `SHORTCUT_PYLON_SPACING` | 100 m | pylons at `from + 50 + i·100`, alternating `x ± 2.2`, hit box `abs(dx) < 1.2 && abs(dAltitude) < 2.5` |
| pylon hit | `contact(race, 'barrier', …)` | existing 0.75 retention and 1.5 s cooldown; cancels a trick |
| pickups | cells row every 60 m at corridor `x / altitude`; one `tank` at the midpoint | generated in `createPickups`; `blocked()` already allows air pickups outside tunnels |

Pylons are derived from the section, not stored: `export const shortcutPylons = section => [...]`
in `game.js`, imported by `world.js` for rendering, so game and render never disagree.

### State exposed to UI (contract)

Implemented 2026-10-20 (`src/game.js`, 7 tests under "Shortcuts" in `tests/game.test.js`).
Corridors: Coast 2200–2700 x −7.5 · Neon 1150–1650 x 7.5 (between tunnels) · Canyon 2000–2500
x −7.5 · Aurora 4920–5380 x 7.5 (final sprint), all at altitude 6. Inside, the 19/s flight drain
is 0; BOOST keeps its usual drain (3/s while flying). Claude also added the
`shortcut: 'SHORTCUT / FLY HIGH'` entry to the `signs` table in `world.js`: without it
`sectionSigns` would assign an undefined material on every track.

```js
race.sections[i]       // { from, to, type: 'shortcut', x, altitude }
player.inShortcut      // boolean, false at race start — inside the corridor volume this frame
player.section         // 'shortcut' while the distance is inside the section (already exists)
shortcutPylons(section) // [{ distance, x, altitude }]
```

### Logic (Claude) — TDD list

1. `RACE_TRACKS`: every track has exactly one `shortcut` section; sections still never overlap
   and stay inside `[0, length − 100]`; update the coast assertion (`tests/game.test.js:454`).
2. `inShortcut` is true only when distance, x and altitude are all inside; on the road under
   the corridor it is false.
3. Inside: 2 s of `{ fly: true }` at 60 m/s drains no fuel; outside, the same drains 38.
4. Inside: speed cap is `MAX_SPEED + 12` (and `MAX_SPEED + 14 + 12` with boost); leaving the
   corridor drops the cap again.
5. `shortcutPylons` returns the alternating positions; flying into one is a `barrier` contact
   and `collisions` increments; flying between them is safe.
6. `createPickups` places cells and one tank inside the corridor and none of them is dropped
   by `blocked()`; pickups still sort by distance and the existing tier tests stay green.
7. `no-flight` modifier: `inShortcut` stays false for the whole race (sanity, one assertion).
8. Pickup collection reuses the existing pass-through window (`stepRace` line 469: `|dx| < 1.7`,
   `|dAltitude| < 1.8`) — no change; one test collects a corridor cell from 5.5 m altitude.

### UI (Codex)

- `src/world.js`: translucent elevated deck strip (one instanced box per 12 m segment, same
  `put()` pattern as `tunnelRoofs`, hidden at `y = −1000` outside the section), pylons from
  `shortcutPylons(section)` as thin instanced boxes (the `SHORTCUT / FLY HIGH` sign already
  exists in the `signs` table, `world.js:378`, added by Claude). Per-track palette colour for the deck; low quality / touch halves
  the deck segment count like `cliffs`.
- `src/main.js`: flight-state label `SHORTCUT` while `inShortcut`; callout `SHORTCUT` on entry
  (edge of `inShortcut`); `trackNotes` (line 171) mention the shortcut per track; fuel HUD
  shows the budget as `∞` while `inShortcut`.
- `style.css`: none expected.
- Browser test (`tests/depth-browser.spec.js`): drive the race state to a shortcut section at
  corridor altitude via the existing test hooks and assert the `SHORTCUT` label and that the
  deck mesh is visible; desktop and 844×390.

## Prompts

Claude — stage 1 (§C) / stage 2 (§D), one session each:

> Read `docs/superpowers/plans/2026-10-20-remaining-items-split.md` — decisions are final and
> the contract blocks are frozen. Implement only the **Logic (Claude)** half of §C [or §D], TDD
> in `tests/game.test.js` following its numbered test list: write a test, run `npm test` to see
> it fail, then the smallest `src/game.js` change. Export the constants named in the rules
> table and expose exactly the contract fields. Stay inside the Claude file ownership. When all
> tests pass, tick the `Logic (Claude)` sub-item in `TODO.md` and report the `npm test` totals.
> If a contract field had to change, update the plan's contract block and say so.

Codex — stage 1 (§B label), stage 2 (§C UI), stage 3 (§D UI), one run each, in the UI worktree:

> Read `docs/superpowers/plans/2026-10-20-remaining-items-split.md`: "File ownership" and §B
> [or §C / §D]. Implement only the **UI (Codex)** half against the frozen contract block; the
> game fields already exist on `main` [stage 1: no new fields]. Read new fields defensively
> (`car.trick?.done`). Animate only `transform` / `opacity`; respect `prefers-reduced-motion`
> and the comfortable setting; touch viewports get the lower effect budget. Never edit
> `src/game.js`, `tests/game.test.js` or the plan. Run `npm test && npm run test:browser`,
> report the results, then tick the `UI (Codex)` sub-item in `TODO.md`.

## Closing each item

Tick the `TODO.md` checkbox only when logic tests, the Codex UI, and the browser test at both
viewports are green; record the run in `docs/verification.md`. Item A is ticked by the user.
