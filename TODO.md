# TODO — Gameplay depth design

## 操作教學 v1（2026-10-23）

- [x] Desktop：靜態鍵盤示意與目前自訂按鍵、中英文說明。
- [x] Mobile：Slide／Buttons、加速、FLY、BOOST、NITRO 與暫停圖解。
- [x] 首次進入自動展示；關閉後記住；Controls 可重新開啟並切換裝置說明。
- [ ] TDD 與整合驗證：首次／重開／儲存不可用／暫停、桌面與手機直橫向。
- [ ] 後續版本：搭配遊戲畫面、實際操作與逐步完成判定的互動教學（本版不實作）。
- [ ] 實體 iOS Safari／Android 觸控裝置驗收（目前以 Chrome 手機模擬驗證）。

Original baseline (everything below builds on these initial systems): a single 5 km coastal highway
sprint (`RACE_LENGTH`), 3 rivals, 36 recycled traffic cars, flight and BOOST sharing one `fuel` pool,
near-miss combos that recharge fuel, 7 purely decorative cyan rings in the sky (`world.js` gates),
and a single saved best time (`skyline-rush-best`).

Implementation rules: game rules live in the pure simulation layer `src/game.js`, test-first in
`tests/game.test.js` (TDD). `world.js` only renders, `main.js` owns the HUD and persistence. Pickup
and ring placement comes from a per-track seed so runs are reproducible and testable.

Current scope: all gamepad-related work (input support, mapping UI, and acceptance checks)
is **Lowest priority** and **out of scope for this iteration**. Gamepad references below
describe future work, not current requirements.

Remaining open items are split into logic (Claude, `src/game.js` + `tests/game.test.js`) and UI
(Codex, rendering / HUD / browser specs) in
`docs/superpowers/plans/2026-10-20-remaining-items-split.md`, which holds the frozen UI
contracts, file ownership, the parallel schedule and the prompt for each AI; the sub-checkboxes
below mirror that split.

---

## 0. Desktop + mobile (applies to every item below)

Every item is done only when it works on both platforms. Targets match the viewports the browser
tests already use: desktop 1440×900, phone portrait 390×844 and 320×740, phone landscape 844×390
(touch). Desktop = keyboard (+ optional gamepad — **Lowest priority**, deferred; mouse for menus);
mobile = touch via the existing `(pointer: coarse)` detection and the `.touch-controls` layout.

### Shared rules

- **One input model**: every action is a named control in `input.js` (`fly`, `boost`, `nitro`, `brake`…)
  that keys, touch buttons, and gamepad (gamepad mapping — **Lowest priority**, deferred) all map to.
  Game rules never check the device
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

- [ ] **Physical-device acceptance** (manual — user on a phone, not Claude / Codex work; steps in
  the split plan §A): measure before/after frame time on a mid-range phone and
  check Android/iOS hardware and Safari. The 2026-10-20 implementation checks below cover desktop
  and touch-browser viewports; this real-device gate remains open (see `docs/verification.md`).
  - [x] iOS Simulator Safari (iPhone 17, iOS 26.5), 2026-10-20: Coast and Neon, portrait and landscape, touch FLY works; it found and fixed two short-landscape layout bugs (HUD overlap, START RACE below the fold)
  - [x] Measurement tool: `?perf` shows racing frame-time p50/p95/fps over the last 20 s; checked in iOS Simulator Safari (p50 17.0 ms, p95 24.0 ms, 59.7 fps on the Mac GPU, so not a phone number)
  - [ ] Real phones: frame time p95 on a mid-range Android (Chrome) and an iPhone (Safari), read from `?perf`; the Android emulator's translated GPU (7.5 fps, black 3D canvas) cannot stand in for hardware

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
- [ ] **Gamepad mapping view** — **Lowest priority**; out of scope for this iteration

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
| 7. Controls | `J`/`K`/`L` alternate keys, key remapping, steering sensitivity; gamepad (**Lowest priority**, deferred) | Slide steering default, Buttons / Tilt modes, handedness mirror, editable layout, AUTO default, FLY toggle |
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
- [x] **Ghost race**: record the best run's `x / altitude` trace at 10 Hz and replay it as a translucent ghost car next time; can be turned off in settings
  - [x] Controls UI: ghost toggle and per-track replay status; 10 Hz recording, validation and translucent playback connected
- [x] If storage fails (private mode) the game keeps working, using the existing try/catch pattern
- [x] Acceptance: unit tests for write / read / 50-record cap / old-best migration; browser test for the History screen

## 6. Other ideas to make it more fun

Ordered by small effort, big fun:

- [x] **Style score**: near-misses, rings, PERFECT LINEs, airtime, and clean sections score points; 1–3 star rating at the finish, so there's something to chase besides winning
- [x] **Slipstream**: staying right behind a rival / traffic car for 1.5 s → speed cap +6 and +0.25 nitro
- [x] **Air tricks**: quick left-right flick while flying = barrel roll; land it → +0.25 nitro; a hard landing loses the reward (uses `landing.speed`)
  - [x] Logic (Claude): flick detection within 0.3 s of raw `steer` sign change while airborne → `player.trick = { dir, time, done }`; 0.7 s roll; landing with `done` and `landing.speed < 11` pays +0.25 via `addNitro`, ≥ 11 writes `trickPayout = { nitro: 0, hard: true }`; contact / roof hit / gap fall / early landing cancel without payout; 8 unit tests (plan §C)
  - [x] UI (Codex → Claude): `world.js` body roll (`rotation.z`), callouts `BARREL ROLL` / `TRICK +0.25` / `HARD LANDING`, `TRICK` flight-state label, whoosh cue, haptic on payout, browser test at desktop + 390×844
- [x] **Rivals use NITRO too**: give rivals personalities (NOVA steady, ORBIT loves flying, APEX late surge) plus light rubber-banding to keep races tense
- [x] **Daily challenge**: date-seeded track + modifier (no flight, double traffic, gold rings only…), with its own board in History
  - [x] History UI: today's track + modifier, start action and the daily board (fastest five)
- [x] **Achievements / medals**: first win, zero-collision finish, 5 PERFECT LINEs in one race, triple nitro chain…, shown in History
  - [x] History UI: four medal entries with awarded dates; award rules and persistence in `src/history.js`
- [x] **Shortcuts**: one flight-only elevated shortcut per track, with pickups but also risk
  - [x] Logic (Claude): `{ from, to, type: 'shortcut', x: ±7.5, altitude: 6 }` section on all four tracks; `player.inShortcut` (|dx| < 3, |dAltitude| < 2.5); inside: flight burns no fuel and the speed cap gets +12; `shortcutPylons(section)` every 100 m alternating ±2.2 m, hitting one is `barrier` contact; corridor cells + one tank from `createPickups`; 7 unit tests incl. the coast-sections assertion update, plus the `SHORTCUT / FLY HIGH` sign entry in `world.js` (plan §D)
  - [x] UI (Codex → Claude): `world.js` elevated deck + pylons via `shortcutPylons`, `SHORTCUT` label and entry callout, `∞` fuel budget while inside, `trackNotes`, browser test at desktop + 844×390
- [x] **Final sprint**: in the last 500 m the music speeds up (`audio.js` bpm) and rival gaps are shown, for comeback drama
- [x] **Cosmetic unlocks**: stars unlock car paint / tail light colors (visual only, no stat changes)
  - [x] Garage UI: live previews; best stars per track (summed) unlock Coral 3 / Glacier 6 / Aurora 9; equip is saved

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
- [x] **NITRO doesn't use fuel** (separate `nitro` reserve from item 2), so FLY + NITRO always works together; NITRO while flying = straight-line air dash
  - [x] Logic (Claude): already true in `game.js`; add the acceptance tests — `{ fly, nitro }` held 2 s → `thrusting`, `nitroTime > 0`, not `exhausted`, fuel down by 19/s only; `{ fly, boost, nitro }` keeps the 22/s AIR DASH drain and the `MAX_SPEED + 30` cap (plan §B; no new physics unless decision 1b is chosen)
  - [x] UI (Codex): flight-state label `AIR DASH · NITRO` when thrusting with NITRO active (`main.js:833`)
  - [x] Browser test: `tests/nitro-fly-browser.spec.js` holds FLY + NITRO at desktop and 844×390 touch
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
- [ ] **Gamepad support**: the browser's built-in Gamepad API, analog stick steering, triggers for throttle / brake — **Lowest priority**; out of scope for this iteration
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
- [x] Acceptance: browser tests verify callout lifetime, results after the finish sequence and reduced-motion behavior; short local Chrome samples show no frame-cadence drop (desktop callback p95 increased 1.8 → 2.9–3.0 ms). See `docs/verification.md`; physical-device performance remains unverified.

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
10. **Gamepad support + mapping view** — **Lowest priority**; deferred beyond this iteration


---

## 9. Game modes and race-session configuration (new roadmap — 2026-10-22)

**Status:** Sections 9–13 are a feature roadmap; checked entries are implemented and have passed
targeted verification on `feature/race-modes-p0`. Larger acceptance gates remain unchecked
until the complete requirement and required browser/device testing pass.
The original 2026-10-22 roadmap had all tasks unchecked.
The preceding sections (0–8) are the existing implementation history; do not reset their
completion state or regress Classic Race. Priority labels: **P0** = first release, **P1** =
second wave, **P2** = larger/long-term work. Keep the existing 10 tracks, official unlock
rules, track showcase parity, NITRO/FLY/BOOST, rivals, daily challenges, Ghost, Garage,
saved history, English/Traditional Chinese UI and production-only access restrictions.

**Design boundary:** All 10 current tracks are **point-to-point sprint courses**, not closed
circuits. A repeat of the same sprint or a multi-stage event is **not** a seamless lap. The
actual closed-circuit/1–3–5 lap feature below needs genuine looped route geometry and
checkpoint validation; merely multiplying `race.length` or resetting distance would be wrong.

### 9A. Common mode/session model (P0; prerequisite)

- [ ] **MODE-00 — Versioned `RaceConfig` / session contract.** Define a validated, serializable
  configuration with stable fields such as `mode`, `trackId`, `seed`, `rivalCount`,
  `aiDifficulty`, `trafficDensity`, `itemsEnabled`, `collisionRule`, `ghostEnabled`,
  `durationSeconds` / `stageCount` (only when applicable), `visualPreset` and `rulesVersion`.
  Declare mode-specific allowed options and defaults in a pure module; distinguish
  **simulation rules** from **visual-only** settings.
- [x] Extend/refactor `createRace(trackId, options)` (or add a compatible wrapper) to build
  sessions from `RaceConfig` **without breaking** existing `createRace('coast')` and
  `createRace(trackId, dailyModifier)` callers. Keep the current Daily Challenge seed,
  modifier rules and official Classic Race parameters identical.
- [ ] Model explicit objectives and completion conditions per mode: `placement`,
  `finish-time`, `score-target`, `checkpoint-timer`, `stage-points`, `survival` or
  `no-auto-finish`. Do not keep reusing `race.length` completion for every mode.
- [x] Separate `Classic / Campaign` from `Custom / Practice / Challenge` in eligibility:
  only qualifying Classic finishes unlock the next track or award career progression.
  A local test-all-unlocked run must never grant unlocks, stars or achievements.
- [ ] Produce deterministic simulation seeds for traffic, checkpoints, obstacles and items
  with **separate named streams**, so adding decoration or an option cannot silently
  reshuffle the original pickups or rings. Validate finite coordinates and bounded counts.
- [ ] **Acceptance:** unit tests cover old call signatures, default-rule parity,
  incompatible/unknown options, deterministic replay, mode-specific finishing and
  access rules; all ten existing courses remain raceable.

### 9B. Free Drive / Practice mode (P0)

- [x] **MODE-01 — Free Drive v1:** drive and fly on any **already unlocked** course with
  no finishing position, mandatory countdown, AI race placement or automatic victory.
  Add a visible return/restart control and an optional one-tap reset-to-start.
- [x] Allow selectable **no AI**, traffic density and item availability. Reuse existing
  steering, cameras, drift, FLY, BOOST, NITRO and 3D scenery; do not build a new
  physics engine.
- [ ] At the authored end of an open sprint, offer **Restart / Choose Track / End
  Session**, or stop safely in a designated free-drive area. Do **not** claim
  endless roadway, reverse-map continuity or loop back to the start until implemented.
- [x] Optional practice HUD: current speed, air time, travel distance, max speed,
  clean near-miss chain and trick counter; hide rival position and race countdown.
- [ ] **Acceptance:** crossing the old finish cannot save an official best, stars,
  campaign unlock or Daily record; exit/restart/pause work for keyboard and touch;
  world buffers do not grow across repeated sessions.

### 9C. Custom Race (P0)

- [ ] **MODE-02 — Custom Race:** choose an unlocked track, 0–3 rivals, AI
  **Easy / Normal / Hard**, traffic **Off / Light / Normal / Heavy**, power-ups
  **On / Off**, collisions **Normal / Relaxed**, Ghost visibility and weather/time
  **visual preset**. Preserve original defaults in Classic mode.
- [x] AI difficulty adjusts clearly named parameters (target speed, mistake rate
  or rubber-band bounds) without breaking current rival personalities `NOVA`,
  `ORBIT` and `APEX`. Support 0, 1, 2 and 3 rivals correctly.
- [x] Offer a longer session with **1 / 2 / 3 / 5 sprint stages** (same or selectable
  unlocked courses), but label it **stages / heats**, not circuit laps; show aggregate
  time or points explicitly and reset physical state between stages.
- [x] Support validated presets **Standard / Traffic Rush / No Items / Air Focus /
  Precision** and a custom configuration, all with one-tap Reset to Default.
- [ ] **Acceptance:** generated item/traffic counts, HUD placement labels, AI finish
  detection and results all work with 0 rivals; Custom scores never overwrite
  Classic or Daily records.

### 9D. Time Attack / Ghost Trial (P0)

- [x] **MODE-03 — Time Attack:** solo fixed-course trial with clean start/finish,
  immediate retry and best time per stable `trackId + mode + ruleset`. No rival
  race position or opponent-driven rubber banding.
- [x] Reuse the existing 10 Hz best-run Ghost when the recorded trace and rules
  are compatible; show `Ahead / Behind` split against the personal record.
  Keep separate Ghost data for mode-specific bests if necessary.
- [x] Optional **Clean Time Trial** variant: collisions invalidate a clean medal or
  apply an explicit time penalty; do not silently change legacy physics.
- [ ] **Acceptance:** timed results/ghosts remain isolated from Classic bests;
  blocked localStorage never prevents play; mobile HUD remains readable.

### 9E. Stunt & Style Attack (P1)

- [ ] **MODE-04 — Stunt Attack:** timed 2 / 3 / 5-minute score run for air tricks,
  sustained drift, near-misses, rings, PERFECT LINE groups and flying shortcuts.
  Reuse existing `player.score`, `trick`, `drift` and ring events.
- [ ] Add explicit style-combo multiplier, clean landing bonus and fair combo
  break/decay on crashes; prevent stationary or repeated reset farming.
- [ ] Save best score, combo, air time and medal thresholds by exact track/ruleset.
- [ ] **Acceptance:** deterministic scoring independent of FPS and input device;
  end-of-timer results work without reaching the sprint finish.

### 9F. Checkpoint Rush (P1)

- [x] **MODE-05 — Checkpoint Rush:** pass a deterministic sequence of grounded or
  aerial gates before time expires; each clean gate extends the timer.
- [ ] Choose checkpoints from the **real track route and reachable flight envelopes**;
  prevent impossible gates inside tunnel roofs, road gaps or conflicting hazards.
- [ ] Show next target distance/direction, time left, checkpoint chain and optional
  perfect-gate rewards. Invalid/missed gates cannot secretly count.
- [ ] **Acceptance:** gated time-extension and expiry have unit tests; minimap
  uses the official main route and never reveals hidden shortcut geometry.

### 9G. Multi-track Championship Cup (P1)

- [x] **MODE-06 — Championship:** select a curated 3–5-track cup consisting of
  **unlocked** stages; award stage ranking points and a clear final champion.
- [ ] Preserve stage standings across transitions with fair AI participation,
  an explicit continue/retry flow, and optional saved in-progress cup recovery.
- [ ] Distinguish cup medals/bests from individual Classic times; a cup does
  not grant unearned unlocks for stages skipped or completed in practice mode.
- [ ] **Acceptance:** ties, quit/resume, mid-cup restart, 0-rival rejection and
  incomplete data produce deterministic, understandable results.

### 9H. Obstacle Gauntlet (P1)

- [ ] **MODE-07 — Obstacle Gauntlet:** fixed-seed hazard challenges with
  escalating moving gates, road barricades, flying hoops, debris and safe/risky
  alternate lines. Keep the ordinary track drivable in Classic mode by default.
- [x] Add difficulty tiers based on warning time, obstacle spacing and
  activation frequency **without random unavoidable collisions**.
- [ ] Score clean obstacle passes, near-misses and finish time; practice and
  obstacle-mode records stay separate.
- [ ] **Acceptance:** each generated hazard arrangement leaves a reasonable
  passable ground/air path and has predictable collision tests.

### 9I. Elimination / Last Racer Standing (P2)

- [ ] **MODE-08 — Elimination:** after an announced interval/checkpoint, eliminate
  the last active racer until one remains; show a readable knockout countdown.
- [ ] Define whether the player loses immediately or gets one short comeback window;
  do not eliminate AI simply because an actor is off-camera.
- [ ] **Acceptance:** active AI count/rank changes cleanly; results work after
  early elimination and never award Classic progression.

### 9J. Endless Highway / Distance Survival (P2)

- [ ] **MODE-09 — Endless Highway:** deterministic extension/streaming **beyond**
  the fixed 4–8 km authored tracks; progressively increase challenge and record
  longest distance/survival score.
- [ ] Build extendable road geometry, scene chunks, encounter seeds, objective
  markers, camera/traffic recycling and safe recovery. Respect absolute distance
  to avoid repeated scenery, teleporting objects or floating-point problems.
- [ ] Keep memory/GPU resources bounded after lengthy play; verify pause, resume,
  context loss and browser tab backgrounding.
- [ ] **Acceptance:** play can continue past the former end without hitting
  clamped `trackPoint()`, missing geometry, a fake lap or an unintended finish.

### 9K. Event Lab Lite / course creator (P2)

- [ ] **MODE-10 — Event Lab Lite:** begin with **preset course modifiers** and
  validated placement templates (cones, barricades, ramps, gates, pickups,
  checkpoints), not a full free-form level editor.
- [ ] Add a later visual designer for positioning supported objects on unlocked
  courses, with snap-to-lane, collision previews, Undo/Redo and Reset.
- [ ] Import/export **versioned, size-limited JSON** that validates track IDs,
  geometry bounds, obstacle count, segment reachability and sanitizes labels;
  no script execution, remote code, or dependency on online accounts.
- [ ] Community sharing or multiplayer uploads require a separate backend,
  moderation/storage and security design; **not** part of offline-first v1.
- [ ] **Acceptance:** creation and replay produce the same stage with the same
  seed on desktop and mobile; malformed/corrupt creations fail safely.

## 10. Mode-selection UX, race settings, true laps and saved progress

### 10A. Start-screen setup and player experience (P0)

- [ ] **UX-01 — Mode-first flow:** `Choose Mode → Choose Unlocked Track →
  Configure Rules → Start`. Retain the current animated 3D track previews,
  vehicle scale, three-rival showcase, full-route maps and mobile usability.
- [ ] Use a compact, readable configuration panel rather than filling every
  track card with controls; allow mode descriptions, Restore Defaults and a
  preview/summary of active rules before Start.
- [ ] Disable or explain unsupported combinations (e.g. lap count on open
  sprint, elimination with 0 AI, no-flight over mandatory bridge gaps,
  checkpoint in unreachable aerial areas).
- [ ] Add appropriate pre-race options for AI 0–3, AI difficulty, traffic
  density, pickups, collision severity, Ghost, stage count, timed duration,
  cosmetic scenery/weather, item rules, and per-mode eligibility.
- [ ] Saved user presets must not alter unlocks, reward eligibility or
  existing `skyline-rush-controls` / `skyline-rush-history` formats.
- [ ] All labels, option descriptions, countdowns, HUD outcomes, tooltips,
  error messages and results are localized in **English and zh-TW**, live
  switchable without changing stable track/mode IDs.
- [ ] Preserve keyboard, pointer and mobile touch navigation, visible focus,
  readable contrast, safe-area layout and reduced-motion/Comfort settings.

### 10B. Honest laps versus repeated sprints (P2)

- [ ] **LAP-01 — Separate session types:** support multi-stage/repeated
  **point-to-point** sprints first (P0/P1), and label them “Stage 1/3”,
  not “Lap 1/3”. The original 10 tracks must keep their authored geography.
- [ ] **LAP-02 — Genuine closed circuits:** author at least one actual loop
  whose start/finish world position, tangent, road banking and width connect
  continuously; do **not** fake it with instant distance wrap.
- [ ] **LAP-03 — Configurable 1 / 3 / 5 laps** only on circuits with a valid
  topology; lap timer, personal best lap, total race time, split sectors,
  lap HUD, AI lap standings and finish sequence.
- [ ] **LAP-04 — Anti-shortcut checkpoints:** ordered sector validation
  prevents crossing the finish backwards, flying over the finish repeatedly,
  teleports or respawns from granting false laps.
- [ ] **Acceptance:** completion requires the configured number of valid
  laps; player/AI cameras, positions, world props, mini-route map, Ghost,
  checkpoints and collision physics remain continuous across every seam.

### 10C. Result/history isolation and safeguards (P0)

- [ ] Store a stable `modeId + trackId + rulesVersion + rulesSignature` on
  each **new-mode** result, plus appropriate time, score, distance,
  stage/lap data and item/hazard statistics. Keep legacy history readable.
- [ ] Show per-mode bests, mode-filtered History and applicable Ghosts;
  clearly distinguish personal practice milestones from official medals.
- [ ] Use validated persistence with storage-failure fallbacks, reasonable
  caps and migration tests; prevent a custom “no traffic” best from
  replacing an official Classic best.
- [ ] Keep Classic Career unlocks, 1–3 stars, Garage paint unlocking,
  achievements and Daily Challenge board isolated from custom/free-drive
  sessions unless a specific future rule explicitly grants eligibility.
- [ ] Pausing, restarting, exiting, switching modes or closing a dialog
  cannot double-write a result or award the same benefit twice.

## 11. Interactive scenery, track hazards and procedural world props

### 11A. Data model and runtime behavior (P1)

- [ ] **ENV-01 — Typed object catalog:** separate
  **visual-only scenery** (buildings, crowds, parked trains, signs, lamps,
  spaceships) from **collidable / triggerable gameplay objects**.
- [ ] **ENV-02 — Deterministic hazard schema:** define bounded properties
  such as `id`, `trackId`, `distance`, `lateralOffset`, `altitude`,
  `type`, `hitbox`, `triggerWindow`, `warningLeadSeconds`,
  `movementPattern`, `difficulty` and `seed`.
- [ ] **ENV-03 — Logic/render separation:** calculate hits, passes,
  rewards and state changes in the pure simulation (`src/game.js` or
  extracted rules module), not by reading Three.js mesh positions.
  Render exactly the hazard state described by the simulation.
- [ ] **ENV-04 — Hazard behaviors:** static cones/barricades, moving
  side-to-side gates, periodic energy barriers, falling debris/rocks,
  wind gusts, hazardous terrain, rotating rings, rail crossing events
  and safe/risky branch markers.
- [ ] **ENV-05 — Safety/readability:** visible anticipation cues, adequate
  reaction distance at maximum NITRO speed, accessible color+shape
  signals, a reachable escape route, and forgiving hitboxes on touch.
  Hazards must not randomly spawn inside the player.
- [ ] **ENV-06 — Reusable renderer:** pool or instance shared meshes and
  emitters, load/unload by visible distance with bounded chunk lifetime,
  no new material/geometry allocations every frame, and stable
  Low/Medium/High quality fallbacks.
- [ ] **ENV-07 — Play-mode switches:** allow hazards Off / Standard /
  Extreme only where a mode supports that option; Classic uses the
  existing base behavior until intentionally updated.
- [ ] **Acceptance:** deterministic placement, cross-frame collision
  sweeps, warning timing, out-of-range cleanup, no impossible gates
  and no device-specific simulation differences.

### 11B. Track-specific gameplay identities (P1)

- [ ] **Coast:** scattered cargo, gust warnings and temporary shoulder
  closures; combine clean high-speed overtakes with coastal visibility.
- [ ] **Neon Downtown:** animated construction barriers, temporary lane
  closures, traffic diversions and readable neon gate timing.
- [ ] **Canyon Skyway:** warned falling rocks, cliff-side debris,
  precision launch ramps and risk/reward routes over broken bridges.
- [ ] **Aurora Pass:** snowbanks, localized low-grip ice bends,
  timed blizzard visibility and safer alternative lines.
- [ ] **Sky Spiral:** rotating light hoops, synchronized aerial gates,
  changing platform barriers and airborne precision scoring.
- [ ] **Taipei Heritage:** festival street furniture, temporary
  boulevard closures and scenic props, while preserving landmark
  visibility and the existing curated ready-screen showcase.
- [ ] **Tokyo Afterdark:** traffic-control signals, timed gates,
  neon construction equipment and dynamic but fair crossing events.
- [ ] **Alpine Rail Pass:** avalanche warnings, snow drift obstacles,
  passing trains as scenery, and rail-crossing interactions **only**
  where real drivable-road geometry and clearance permit them.
- [ ] **Coastal Horizon:** wave-spray warning zones, crosswinds,
  lighthouse-side narrow bridge obstacles and safe shoulder routes.
- [ ] **Cosmic Orbit:** floating asteroid fragments, moving energy
  barriers, low-gravity sectors and aerial gate sequences.
- [ ] **Acceptance:** every themed hazard has at least one collision/
  reward test and an in-game desktop + mobile visual check; never let
  hero landmarks or scenery block the route unexpectedly.

### 11C. More visual world richness (P1)

- [ ] Add **non-colliding** per-track detail sets: spectators, billboards,
  parked service vehicles, rail platforms, moving background trains,
  signs, drones/ships, coastline spray, atmospheric lights and skyline
  animation. Reuse `world-tour-scenery.js` placement planning, batching
  and chunk lifecycle when applicable.
- [ ] **Weather/time-of-day presets:** daylight, dusk, night, rain/fog,
  snowfall or aurora where stylistically appropriate; start with
  visual-only overrides. Treat physical wet-grip/wind changes as
  opt-in, independently tested rules rather than surprise difficulty.
- [ ] Respect `track-showcase.md`: every new or changed course ready
  screen must still show the player, three rivals, visible jets,
  appropriate chase camera and recognizable track world.
- [ ] Degrade particle density, transparent overlays and shadow/light
  count on weak hardware without removing essential hazard silhouettes
  or necessary traffic warnings.

## 12. Items, pickups, active inventory and bonus challenges

### 12A. Turn current ring effects into optional active items (P1)

- [ ] **ITEM-01 — Single item slot:** pick up and hold one active item;
  show icon, ready/held state, cooldown and an accessible Activate
  action on keyboard and touch. Keep NITRO and FLY/BOOST as separate
  systems; do not overload existing controls without remapping.
- [ ] **ITEM-02 — Shield:** reuse existing “absorb one collision” effect
  as a held/triggerable item, with a clear hit/expiration state.
- [ ] **ITEM-03 — Magnet:** reuse current timed pickup attraction,
  with an optional active duration and visible radius indicator.
- [ ] **ITEM-04 — Ghost:** reuse short traffic phasing with explicit
  cooldown; it must not let players pass invalid lap checkpoints.
- [ ] **ITEM-05 — Freeze:** reuse temporary rival slowdown only in modes
  with AI; provide a harmless conversion/fallback in solo events.
- [ ] **Acceptance:** no unintended double-stacks or unbounded
  durations, correct activation order and no change to existing
  mystery-ring payouts in Classic mode.

### 12B. Additional pickups and interactive pads (P1/P2)

- [ ] **ITEM-06 — Precision speed strips / Energy Gates:** reward
  accurately crossing a boost pad or flight gate; apply capped,
  readable acceleration or thruster recharge.
- [ ] **ITEM-07 — Air recharge pads:** restore a bounded share of
  FLY energy mid-flight, making aerial precision lines worthwhile.
- [ ] **ITEM-08 — Repair / recovery pad:** temporarily mitigate
  one obstacle's speed loss or restore a limited resource without
  erasing official collision counts.
- [ ] **ITEM-09 — Score multiplier token:** temporary style-combo
  bonus in Stunt/Checkpoint modes; cap multipliers and prevent
  overlapping infinite reward loops.
- [ ] **ITEM-10 — EMP Pulse (P2):** short-range rival disruption
  exclusive to suitable competitive rule sets; clear fair warning
  and no effect on player control accessibility.
- [ ] **ITEM-11 — Mode item rules:** Off / Classic Mystery Rings /
  Active Items / All Items. Resolve item positions from seeded
  streams and never place important rewards inside impossible gaps.
- [ ] **ITEM-12 — Visual/audio feedback:** unique item outlines,
  landing sparks, pickup beams, cooldown audio and special hit FX
  that reuse `src/effects.js`, `src/audio.js` and comfort settings.
- [ ] **Acceptance:** item effects, caps, cooldowns, pickups, misses,
  blocked storage, mode restrictions and touch button layout have
  unit/browser coverage.

### 12C. Extra replayability and optional presentation (P2)

- [ ] **PHOTO-01 — Photo / Showcase mode:** in paused Free Drive,
  orbit the camera, hide HUD, adjust compatible time/weather presets
  and export a browser-generated screenshot where supported;
  do not claim cloud storage or full replay video without a backend.
- [ ] **REPLAY-01 — Expanded challenge medals:** clean checkpoint
  chain, longest flight, zero-collision time trial, best aerial
  combination and themed gauntlet completion; keep separate from
  existing four Career medals.
- [ ] **REPLAY-02 — Personalized challenge presets:** remember a
  few recent custom-rule setups and allow duplicate/retry from the
  results screen without modifying the base track.
- [ ] **REPLAY-03 — Risk/reward course lines:** alternate ground and
  aerial targets that give more score or item charge at higher
  difficulty, with hazards and scoring that can be disabled for
  straightforward practice.

## 13. Implementation order, test plan and release gates

### 13A. Recommended milestones

1. **P0-A / Foundation:** `RaceConfig`, schema validation, explicit
   objectives, rule signatures, legacy compatibility and progression
   separation (9A, 10C).
2. **P0-B / Player setup:** accessible mode-first selector,
   pre-race options, presets and localization (10A).
3. **P0-C / First playable modes:** Custom Race, Time Attack and
   Free Drive v1; per-mode History and safe results (9B–9D).
4. **P1-A / Built on existing systems:** Stunt Attack, Checkpoint Rush
   and Championship; multi-stage **sprints**, not fake laps (9E–9G).
5. **P1-B / Hazards and world detail:** typed obstacle contract,
   first two obstacle families, art/performance tests, then all
   10 distinct track-specific sets (9H, 11).
6. **P1-C / Items:** one-slot active inventory, reuse Shield/Magnet/
   Ghost/Freeze, then new pads/bonuses (12A–12B).
7. **P2-A / Long-term modes:** Elimination, true closed-circuit laps,
   streamed Endless Highway and Event Lab Lite (9I–9K, 10B).
8. **P2-B / Polish:** photo mode, bonus medals and user presets (12C).

### 13B. File ownership and coding rules

- [ ] Keep core deterministic rules in `src/game.js` or focused pure
  imported modules; test in `tests/game.test.js` and new
  mode/hazard/item unit-test files as needed.
- [ ] Keep rendering, moving obstacles, shaders and scenery in
  `src/world.js`, `src/world-tour-scene.js` and appropriate modules
  under `src/`; don't clone the renderer once per new mode.
- [ ] Keep mode-selection UI in `src/App.vue` and screen flow in
  `src/main.js`; maintain the project's existing static Vue shell /
  imperative HUD integration unless separately refactored.
- [ ] Keep per-mode records, migration, eligibility and safe storage
  in `src/history.js` (or small companion modules); route topology
  in `src/track-paths.js`; device inputs in `src/input.js`.
- [ ] Do not weaken `.claude/rules/unlock-separation.md` or use
  runtime/dev query toggles for shipped content: unlocked-track
  testing remains local-only through existing Vite alias rules.
- [ ] Keep `README.md` and `README.zh-TW.md` consistent if game
  documentation changes. Maintain `CLAUDE.md` and scoped rules
  only when real implementation conventions change.

### 13C. Mandatory acceptance and performance (all new features)

- [ ] **Correctness:** tests for 0/1/3 AI, seeded hazard determinism,
  item disabled, Ghost compatibility, checkpoint/lap order, time
  expiry, stage ties, restart/exit, storage failures and score
  eligibility. Include no NaNs, invisible collision objects or
  unreachable objective sequences.
- [ ] **Classic regression:** original 10 tracks, Daily Challenge,
  Garage stars/unlocks, medals, best Ghosts, NITRO/FLY/BOOST,
  air tricks, camera, performance notice and save migration.
- [ ] **Responsive:** Playwright desktop 1440×900 and touch phone
  390×844, 320×740 and landscape 844×390; no HUD/touch control
  overlap, focus traps or offscreen Start/Exit actions.
- [ ] **Motion & accessibility:** comfortable/reduced-motion,
  low/medium/high visuals, color-independent hazard telegraphs,
  touch hit targets, keyboard remapping and screen-reader
  labels on important buttons.
- [ ] **Performance:** bounded spawned/active objects, chunk
  evictions, fixed update/simulation behavior, and before/after
  `?perf` p50/p95/fps comparison on desktop and **real** midrange
  Android Chrome + iPhone Safari when available. Simulator results
  are not substitutes for phone GPU testing.
- [ ] **Verification:** `npm test` + `npm run build` for all logic
  or progression changes; also `npm run test:browser` for any
  UI, rendering, controls or unlock visibility changes. Ensure
  production build excludes local-only unlock wiring.
- [ ] **Delivery:** implement on a feature branch unless the user
  explicitly requests direct `main` changes; review and mark
  individual tasks `[x]` only after implementation and tests.

### 13D. Inspiration and design references

- **Mario Kart World:** Free Roam and custom VS-style rules — adapt
  settings, not copyrighted tracks/characters.
- **Forza Horizon 5 EventLab:** rule presets, track props and event
  creation — begin with a small, validated object library.
- **Trackmania:** time trials, ghosts, stunt/platform challenges,
  checkpoint precision and eventually authored looped circuits.
- **Hot Wheels Unleashed 2: Turbocharged:** modular hazards, jumps,
  obstacle timing and arcade risk/reward.

Reference entry points:
[Mario Kart World](https://www.nintendo.com/us/gaming-systems/switch-2/featured-games/mario-kart-world/) ·
[Forza](https://forza.net/) ·
[Trackmania](https://www.trackmania.com/) ·
[Hot Wheels Unleashed 2](https://hotwheelsunleashed.com/).

**Scope reminder:** This is a backlog, not a claim that features exist or are
approved for implementation. Preserve the earlier completed work and
never conflate future modes with existing Control “steering mode” options.
