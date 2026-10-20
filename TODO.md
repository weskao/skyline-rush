# TODO — Gameplay depth design

Original baseline (everything below builds on these initial systems): a single 5 km coastal highway
sprint (`RACE_LENGTH`), 3 rivals, 36 recycled traffic cars, flight and BOOST sharing one `fuel` pool,
near-miss combos that recharge fuel, 7 purely decorative cyan rings in the sky (`world.js` gates),
and a single saved best time (`skyline-rush-best`).

Implementation rules: game rules live in the pure simulation layer `src/game.js`, test-first in
`tests/game.test.js` (TDD). `world.js` only renders, `main.js` owns the HUD and persistence. Pickup
and ring placement comes from a per-track seed so runs are reproducible and testable.

Current scope: all gamepad-related work (input support, mapping UI, and acceptance checks)
is the **lowest priority** and **out of scope for this iteration**. Gamepad references below
describe future work, not current requirements.

---

## 0. Desktop + mobile (applies to every item below)

Every item is done only when it works on both platforms. Targets match the viewports the browser
tests already use: desktop 1440×900, phone portrait 390×844 and 320×740, phone landscape 844×390
(touch). Desktop = keyboard (+ optional gamepad, mouse for menus); mobile = touch via the existing
`(pointer: coarse)` detection and the `.touch-controls` layout.

### Shared rules

- **One input model**: every action is a named control in `input.js` (`fly`, `boost`, `nitro`, `brake`…)
  that keys, touch buttons, and gamepad all map to. Game rules never check the device
- **Same rules, same numbers** on both platforms; mobile only differs in layout, hints, and effect budget
- **Hints match the device**: desktop shows keys (`HOLD SPACE`), mobile shows button names (`HOLD FLY`),
  extending the existing `touchPreference` switch in `main.js`
- **Touch targets** ≥ 44×44 px, buttons never cover the car or the center callout area, respect
  `env(safe-area-inset-*)` for notches and home bars
- **Performance**: mobile gets a lower budget — smaller particle counts for pickups / drift / ring bursts,
  capped pixel ratio, fewer simultaneous HUD animations; measure frame time on a mid-range phone before
  and after each item
- **Orientation**: portrait and landscape both playable; landscape is the recommended racing orientation
- **Tests**: each item's browser test runs at a desktop viewport and at least one touch viewport

- [ ] **Physical-device acceptance**: measure before/after frame time on a mid-range phone and
  check Android/iOS hardware and Safari. The 2026-10-20 implementation checks below cover desktop
  and touch-browser viewports; this real-device gate remains open (see `docs/verification.md`).

### Mobile control layout (with all new actions)

Two thumbs, so the right side must not need two simultaneous presses. Steering has two modes,
picked in Settings → Controls.

**Mode A — Slide steering (default)**: no precise left / right buttons. The whole steering half of
the screen is a slide pad; put the thumb down anywhere and slide.

```
 ┌────────────────────────────────────────────┐
 │                                            │
 │  ┌ ─ ─ steering pad ─ ─ ┐    [NITRO]       │
 │      ◀ ── (●) ── ▶          [BOOST] [ FLY ]│
 │  │   slide down = brake │                  │
 │  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘                  │
 └────────────────────────────────────────────┘
   steering hand                action hand
```

- [x] Touch-down point becomes the center; horizontal distance from it = steering amount
  (dead zone 6 px, full lock at ~60 px, analog in between — `stepRace` already accepts a fractional `steer`)
- [x] If the thumb slides past full lock, the center follows it, so steering back the other way responds immediately
- [x] Release = straight ahead (with lane assist from 7C if enabled)
- [x] **Slide down past ~40 px = brake**; down + sideways = **drift** (brake + steer), so brake and drift need no button
- [x] A faint floating ring + knob shows where the center and thumb are; it fades after a few seconds of play
- [x] Pad covers the bottom ~45% of its half of the screen, so it never blocks the car or the callouts

**Mode B — Buttons (classic)**: today's `[◀] [▶]` + `[BRAKE]` buttons, for players who prefer tapping.

```
 ┌────────────────────────────────────────────┐
 │                                            │
 │  [◀] [▶]                  [NITRO]          │
 │                       [BOOST]  [ FLY ]     │
 │  [BRAKE]                                   │
 └────────────────────────────────────────────┘
```

Shared by both modes:
- [x] **AUTO accelerator on by default on touch** (the existing assist), so no thumb is spent holding the throttle; the gas button stays available when AUTO is off
- [x] Action hand: FLY (largest), BOOST, NITRO in an arc around it; sliding between FLY and BOOST holds both (AIR DASH)
- [x] **Drift = brake + steer** in both modes, the same rule as the keyboard

### Settings → Controls (control customization)

Mobile:
- [x] **Steering mode**: Slide (default) / Buttons / Tilt (device orientation, asks permission only when chosen); physical-device calibration acceptance remains open above
- [x] **Handedness**: steering on left (default) / steering on right — mirrors the whole layout for left-handed players
- [x] **Slide sensitivity**: distance for full lock (40 / 60 / 80 px)
- [x] **Button size** (S / M / L) and **opacity**
- [x] **Edit layout**: drag each action button (FLY / BOOST / NITRO / and the classic buttons in mode B) to a new spot, with a live preview over a paused race; Reset to default
- [x] **FLY behavior**: hold (default) / toggle

Desktop:
- [x] **Key remapping**: click an action, press the new key; conflicts are flagged and swapped; Reset to default (the `J`/`K`/`L` alternates from 7B are part of the default map)
- [x] **Steering sensitivity** (from 7C)
- [ ] Gamepad mapping view — **lowest priority; out of scope for this iteration**

Both:
- [x] Saved to `localStorage['skyline-rush-controls']` with try/catch like the existing VFX settings; invalid / outdated saves fall back to defaults
- [x] `input.js` reads the saved map; game rules stay device-agnostic
- [x] Acceptance: unit tests for slide → steer mapping (dead zone, full lock, center follow, slide-down brake) and key remap conflicts; browser test at touch viewports: slide steering moves the car, Buttons mode still works, mirrored layout and edited button positions survive reload

### Per-item platform notes

| Item | Desktop | Mobile |
|---|---|---|
| 1. Tracks | Track select with keyboard / mouse, arrow keys + Enter | Swipeable track cards; lighter roadside detail and fewer neon lights / rain particles on Neon Downtown |
| 2–3. Nitro | `E` and `L` | NITRO button in the right-thumb arc; the 3-segment bar sits next to the button so the thumb sees it |
| 4. Rings | Full burst particles | Smaller bursts; ring centers slightly more forgiving (+10% radius) since touch steering is coarser |
| 5. History | Table with columns, hover for details | Stacked cards, tap for details; sparkline fits 320 px width |
| 6. Others | Daily challenge / achievements in the menu | Same, plus share-result via `navigator.share` where available |
| 7. Controls | `J`/`K`/`L` alternate keys, key remapping, gamepad, steering sensitivity | Slide steering default, Buttons / Tilt modes, handedness mirror, editable layout, AUTO default, FLY toggle |
| 8. UI / motion | Full motion | Same motion with fewer simultaneous effects; `navigator.vibrate` haptics where supported |

---

## 1. Three new tracks

First make tracks data-driven: a `TRACKS` table (name, length, palette / sky, traffic density, rival
speeds, special sections, seed for pickups and rings), read by `createRace(trackId)`. The current
coast track becomes `coast`.

| Track | Length | Mood | Signature mechanic |
|---|---|---|---|
| **Neon Downtown** | 4 km | Rainy night, neon billboards, wet reflections | **Tunnels**: 4 m ceiling, flying too high hits the roof (barrier contact). Traffic density ×1.5, so more near-miss chances |
| **Canyon Skyway** | 6 km | Desert noon, red rock canyon | **Broken bridge gaps**: 2–3 missing road sections you must fly over; falling = slowdown and respawn past the gap. **Crosswind zones** keep pushing the car sideways |
| **Aurora Pass** | 5.5 km | Snowy night, aurora sky | **Ice patches**: slower steering response. **Uphill sections**: slower ground recharge, so pickups and rings matter more |

- [x] `TRACKS` table + `createRace(trackId)`; `coast` behaves exactly as today (existing tests stay unchanged)
- [x] Special sections described as `{ from, to, type }`; `stepRace` looks them up by current distance
- [x] `world.js` switches palette / sky / roadside decoration per track (procedural geometry only, no downloaded assets)
- [x] Track select in the menu; unlock rule: finish top 3 on the previous track
- [x] Acceptance: every track can be finished; tunnel roof hit, gap fall, crosswind, and ice each have a unit test

## 2. Power-up: NITRO

Separate from the existing BOOST: BOOST still burns fuel (sustained), NITRO is a **one-shot burst**
with its own `nitro` reserve.

Nitro pickups on the road and in the air, in tiers:

| Pickup | Look | Adds | Where |
|---|---|---|---|
| Nitro cell | Small blue canister | **+0.25** | On the road, common, laid out in rows |
| Nitro can | Orange canister | **+0.5** | On the road, between lanes, requires a lane change |
| Nitro tank | Large gold tank | **+1** | In the air (flight only) or inside traffic gaps |
| Overcharge core | Spinning rainbow core | **Fills to the cap** | One per track, placed in a high-risk spot |

Use (press `E` / touch NITRO button):
- [x] Spends **1 full charge** for 2.5 s: speed cap `MAX_SPEED + 30`, much stronger acceleration, wider FOV + the existing lens boost effect
- [x] Cannot fire with less than 1 full charge (HUD shows that charge's fill progress)
- [x] Pressing again during NITRO **extends it by 2 s** instead of stacking speed (keeps it controllable)
- [x] Hitting traffic during NITRO keeps more speed (retention 0.45 → 0.7), rewarding bold driving

- [x] `player.nitro` (float), `player.nitroTime`; `input.nitro` with the `E` key / touch button
- [x] `race.pickups` generated from the track seed as `{ distance, x, altitude, tier }`; pass-through check uses the same previousDistance → distance window as near-misses
- [x] Pickup effects reuse the `effects.js` particle pool; sounds reuse `audio.js`
- [x] Acceptance: tests for each tier's amount, "under 1 charge cannot fire", and "extend does not stack speed"

## 3. Nitro cap: up to 3 charges

- [x] Cap of **3 charges** (`NITRO_MAX = 3`). Once a charge reaches 1.0 the next one starts filling, up to 3.0
- [x] HUD: 3-segment capsule bar; full segments glow, the filling one shows its ratio, the whole bar pulses `NITRO MAX` at 3
- [x] **Overflow conversion**: pickups at the cap convert the excess into fuel (each 0.25 = +8 fuel), nothing is wasted
- [x] Chained bursts: with 3 charges, pressing 3 times gives a 6.5 s burst (2.5 s + 2 s + 2 s via the extend rule)
- [x] Tests: pickup 0.5 at 2.9 → nitro = 3 and 0.4 converted to fuel; using one charge takes 3 → 2

## 4. Special rewards for flying through rings

Turn the existing 7 decorative gates into interactive rings. Only passing through the center
(`hypot(dx, dAltitude) < radius`) counts. Colors mean rewards:

| Ring | Color | Reward |
|---|---|---|
| Charge ring | Cyan (current color) | +20 fuel |
| Nitro ring | Gold | +0.5 nitro |
| Slipstream ring | Purple | 3 s of BOOST that burns no fuel (slipstream tunnel visual) |
| Risk ring | Red, smaller radius, placed high | +1 nitro + large score bonus |
| Mystery ring | Rainbow | One at random: **Shield** (absorbs the next collision), **Magnet** (pulls nearby pickups for 5 s), **Ghost** (pass through traffic for 3 s), **Freeze** (rivals slow down for 2 s) |

**Ring chain bonus**: rings appear in groups of 3–5
- [x] Clearing a whole group = **PERFECT LINE**: extra +1 nitro and a big HUD callout
- [x] Missing one breaks the group bonus (individual ring rewards already earned are kept)

- [x] `race.rings` as `{ distance, x, altitude, radius, type, group }`, generated from the track seed
- [x] `world.js` gates read position / color from `race.rings`; a collected ring bursts once and every crossed ring disappears
- [x] Shield / Magnet / Ghost / Freeze as `player.effects = { shield, magnet, ghost, freeze }` (seconds remaining)
- [x] Acceptance: tests for center hit (grazing the edge does not count), PERFECT LINE, and each mystery effect

## 5. History

- [x] Save one record per finished race to `localStorage['skyline-rush-history']` (keep the latest 50):
      date, track, position, time, collisions, near-misses, rings / PERFECT LINEs, NITRO uses, score
- [x] Best time per track (replaces the single `skyline-rush-best`; migrate the old value to `coast` once)
- [x] History screen: list filtered by track, best-run marker, sparkline of the last 10 times
- [x] Career stats: races, wins, total distance, longest combo, most rings in one run
- [ ] **Ghost race**: record the best run's `x / altitude` trace at 10 Hz and replay it as a translucent ghost car next time; can be turned off in settings
  - [x] Controls UI: ghost toggle and no-recorded-replay state; disabled until recording/replay logic is connected (see `HANDOFF.md`)
- [x] If storage fails (private mode) the game keeps working, using the existing try/catch pattern
- [x] Acceptance: unit tests for write / read / 50-record cap / old-best migration; browser test for the History screen

## 6. Other ideas to make it more fun

Ordered by small effort, big fun:

- [x] **Style score**: near-misses, rings, PERFECT LINEs, airtime, and clean sections score points; 1–3 star rating at the finish, so there's something to chase besides winning
- [x] **Slipstream**: staying right behind a rival / traffic car for 1.5 s → speed cap +6 and +0.25 nitro
- [ ] **Air tricks**: quick left-right flick while flying = barrel roll; land it → +0.25 nitro; a hard landing loses the reward (uses `landing.speed`)
- [x] **Rivals use NITRO too**: give rivals personalities (NOVA steady, ORBIT loves flying, APEX late surge) plus light rubber-banding to keep races tense
- [ ] **Daily challenge**: date-seeded track + modifier (no flight, double traffic, gold rings only…), with its own board in History
  - [x] History UI: challenge status, disabled start action and empty daily board; gameplay/data integration remains for Claude Code
- [ ] **Achievements / medals**: first win, zero-collision finish, 5 PERFECT LINEs in one race, triple nitro chain…, shown in History
  - [x] History UI: four medal entries and unawarded states; award rules and persistence remain for Claude Code
- [ ] **Shortcuts**: one flight-only elevated shortcut per track, with pickups but also risk
- [x] **Final sprint**: in the last 500 m the music speeds up (`audio.js` bpm) and rival gaps are shown, for comeback drama
- [ ] **Cosmetic unlocks**: stars unlock car paint / tail light colors (visual only, no stat changes)
  - [x] Garage UI: live paint / tail light previews, standard finish and unavailable equip state; unlock/equip persistence remains for Claude Code

## 7. Controls: easier handling, FLY + boost together, drifting

### 7A. Current problems (from `game.js` / `input.js`)

| Problem | Cause |
|---|---|
| Steering is twitchy, easy to hit the barrier | At high speed lateral speed caps at 12 m/s, so one lane (5 m) changes in ~0.4 s; steering responds in ~70 ms and input is digital (0 or ±1) |
| FLY + BOOST barely work together | Both drain the shared `fuel`: flight 19/s + BOOST 10/s = 29/s, empty in ~3.4 s, then `exhausted` forces the flight to end |
| Keyboard can't register the combo | W + A/D + Shift + Space is 4 keys; many keyboards ghost (drop key presses) |
| Touch can't FLY + BOOST at once | Touch has 6 buttons (left / right, FLY / BOOST, brake / gas) for two thumbs; with steering on the left and pedals on the right, FLY and BOOST can't both be held |
| Grazing the barrier is punished hard | Any barrier touch triggers `contact`: 0.75 speed retention and a 1.5 s cooldown, even for a light scrape |

### 7B. FLY and boost at the same time

- [x] **AIR DASH**: holding FLY + BOOST together caps the combined drain at **22/s** (instead of 29/s), keeping the `MAX_SPEED + 14` cap; HUD shows `AIR DASH`
- [ ] **NITRO doesn't use fuel** (separate `nitro` reserve from item 2), so FLY + NITRO always works together; NITRO while flying = straight-line air dash
- [x] **Alternate keys**: right hand `J` = FLY, `K` = BOOST, `L` = NITRO, left hand stays on WASD, avoiding the Shift + Space conflict (original keys still work)
- [x] **Touch** (layout in item 0):
  - [x] AUTO accelerator on by default, so the right thumb is free for FLY / BOOST / NITRO
  - [x] FLY button can be set to "toggle" (tap to lift off and hold altitude, tap again to land), freeing the right thumb for BOOST / NITRO
  - [x] FLY and BOOST buttons sit side by side; sliding a finger onto the border between them activates both (uses the existing pointer tracking)
- [x] Acceptance: test `input = { fly: true, boost: true }` held for 2 s → `thrusting` and `boosting` both true, not `exhausted`, speed > `MAX_SPEED`

### 7C. Handling feel

- [x] **Steering curve**: input ramps to full over 0.15 s (like an analog stick); high-speed lateral cap 12 → 9 m/s; "Steering sensitivity" in settings
- [x] **Lane assist** (part of AUTO, can be turned off): releasing steering eases the car to the nearest lane center
- [x] **Barrier scrape**: shallow-angle touches become a "scrape" — 0.92 speed retention, car pushed back onto the road, no collision counted, combo kept; only head-on hits use the existing `contact`
- [x] **Forgiving hitbox**: vehicle collision width 1.9 → 1.7, so more "almost hit" moments become near-misses instead of crashes
- [x] **Takeoff buffer**: holding FLY below 18 m/s is remembered and lifts off automatically once fast enough (no need to press again)
- [x] **Glide**: releasing FLY in the air lowers fall acceleration 11 → 7 for more controllable, softer landings (`landing.speed`)
- [ ] **Gamepad support**: the browser's built-in Gamepad API, analog stick steering, triggers for throttle / brake — **lowest priority; out of scope for this iteration**
- [x] Move the touch brake to the left thumb, next to steering (see item 0), so brake + steer = drift works on touch

### 7D. DRIFT (builds nitro)

Trigger:
- [x] Keyboard: at ≥ 45 m/s hold **brake + direction** (S + A/D) → drift instead of hard braking
- [x] Touch: the same brake + steer, both under the left thumb (no extra button)
- [x] Ground only (`altitude === 0`); taking off or crashing ends the drift

Physics:
- [x] Car body slides out 20–30° (`world.js` body yaw), arc still controlled by steering
- [x] Drifting only bleeds a little speed (−3 m/s², normal braking is −35)
- [x] Near-miss combo points ×2 while drifting

**Nitro build-up** (longer drift, bigger reward on release, like a mini-turbo):

| Drift time | Spark color | Reward on release |
|---|---|---|
| ≥ 1 s | Blue | +0.15 nitro + 0.5 s mini boost |
| ≥ 2 s | Orange | +0.3 nitro + 0.8 s mini boost |
| ≥ 3 s | Purple | +0.5 nitro + 1.2 s mini boost |

- [x] Rewards count toward the 3-charge cap; overflow converts to fuel per item 3
- [x] Hitting a car / barrier mid-drift → the build-up is lost
- [x] Visuals / audio: tire smoke and sparks share the `effects.js` particle pool; add tire screech to `audio.js`
- [x] `player.drift = { time, dir }`; brake + steer derives drift, and `stepRace` handles enter / hold / release payout
- [x] Acceptance: tests for no drift below 45 m/s, the three time thresholds and rewards, crash cancels, no drift in the air

## 8. UI / UX polish and animation

### 8A. Original gaps (status tracked in 8B)

- Speed, position, and timer numbers just swap text every frame, with no motion
- Leaderboard rows jump when positions change, with no reorder animation
- The results overlay appears instantly; finishing a race has no "moment"
- Fuel bar only has a 0.1 s linear width transition; no feedback when it's low or refilling
- Near-miss, impact, and boost feedback is text-only in small HUD labels and easy to miss mid-race
- Screen changes (intro → countdown → racing → pause → results) are mostly hard cuts

### 8B. Improvements

- [x] **Animated numbers**: speedometer needle / arc that eases with speed; position number flips with a ↑ green / ↓ red pulse when you gain or lose a place
- [x] **Leaderboard reorder**: FLIP animation (measure old/new row positions, animate `transform`) when places swap
- [x] **Event callouts**: center-screen pop-ups that scale in and fade out for `NEAR MISS ×3`, `PERFECT LINE`, `NITRO`, `+0.5`, drift spark tiers; queue them so they don't overlap
- [x] **Gauges**: fuel and the 3-segment nitro bar ease (not linear), flash red under 20%, shimmer while refilling, pulse when a nitro charge completes
- [x] **Finish sequence**: render-only coast over the line (~0.6 s), camera swings to a side view, then the results card slides in; stats count up one by one; stars pop in; "NEW BEST" stamp; official timing/results are frozen before presentation
- [x] **Screen transitions**: intro slides out as the countdown lights drop in; pause blurs and dims the scene; restart wipes instead of cutting
- [x] **Countdown**: start lights turn on one by one with a sound tick; "GO" bursts out with a short camera push
- [x] **Button feel**: press scale (0.96) + release spring on all buttons; touch buttons glow while held; optional haptics via `navigator.vibrate` on mobile for impacts, nitro, and drift payout
- [x] **Menu**: track select cards with a looping preview of the track's sky / palette; History screen slides in from the side
- [x] **Consistency**: one shared set of motion tokens in `style.css` (`--ease-out`, `--ease-spring`, `--dur-fast` 120 ms / `--dur-base` 240 ms / `--dur-slow` 480 ms) used by every new animation
- Rules: animate only `transform` / `opacity` (no layout thrash on the hot render path); every new animation respects the existing `prefers-reduced-motion` and "comfortable" settings by falling back to an instant or fade-only version
- [ ] Acceptance: browser test checks callouts appear and disappear, results card renders after the finish sequence, and reduced-motion disables the motion; no frame-time regression measured during a race

---

## Suggested order

1. **Control fixes** (7A–7C: AIR DASH drain, alternate keys, steering curve, barrier scrape) — small changes, immediately better feel
2. Track data refactor (pure refactor, `coast` behavior unchanged) — everything else depends on it
3. NITRO + 3-charge cap + pickups (items 2 and 3 together)
4. DRIFT (7D, needs the nitro reserve)
5. Interactive rings and rewards (item 4)
6. UI / UX polish (item 8) — motion tokens and callouts first, since items 2–4 need them to be readable
7. History + per-track best + ghost (item 5)
8. Three new tracks (content part of item 1)
9. Pick from item 6
10. **Gamepad support + mapping view** — lowest priority; deferred beyond this iteration
