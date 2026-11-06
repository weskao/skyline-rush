---
paths:
  - "src/ring-layout.ts"
  - "src/race-tracks.ts"
  - "src/game.js"
  - "src/track-themes*.ts"
  - "src/gauntlet-course.ts"
  - "src/endless-highway.ts"
  - "src/catch-up-items.ts"
  - "tests/ring-*.test.js"
  - "tests/pickup-economy.test.js"
  - "scripts/ring-variety.mjs"
---

# Ring and reward layout: authored sequences are design

Rings come from two sources. Keep them apart.

**Random layout** (`createRings`, `createPickups`): re-rolled every race. Every ring line picks one of the four
lanes and keeps the previous ring's lane 65% of the time (`LINE_STAY`). Trains run down their slot's lane, rows
span all lanes, and pickups trail runs of 1–4. Tuning is allowed if `tests/ring-variety.test.js` stays green: every
lane ≥ 15% and none > 35%, trains and rows still appear, and the bot's ring take and NITRO/min hold near the
pre-2026-11-07 baseline (user: more variety, but collecting must not get much harder). Measure with
`node scripts/ring-variety.mjs 12` before and after.

**Authored sequences**: deliberately consecutive rings and rewards placed by hand:

- Sky Spiral's 5 spinning hoops and Cosmic Orbit's two climbing 3-hoop gates (`track-themes-classic.ts`,
  `track-themes-world-tour.ts`, themed races)
- the mixed Gauntlet's hoop over each barricade (`gauntlet-course.ts`, merged by `withHoops`)
- each shortcut corridor's reward line: a cell every 60 m from `from + 30` and a tank halfway (`createPickups`)
- trains (6 consecutive rings) and full-width rows still occurring in every race

Never move, remove, thin out or randomize an authored sequence as a side effect of layout, variety or economy
work. **Before changing one on purpose, ask the user with `AskUserQuestion`** (zh-TW, first option
"(Recommended)"). Then update `tests/ring-authored-sequences.test.js`, which locks them across re-rolled seeds,
in the same commit. Never weaken that test to make a change pass.

**Catch-up items** (`src/catch-up-items.ts`) are added while racing, never at race start: Classic (not Daily) and
Cup only, player-only, beyond the 900 m draw range, never near sections or other items. Keep them out of start
layouts, rival takes and PERFECT LINE groups (`tests/catch-up-items.test.js`; design:
`docs/superpowers/specs/2026-11-07-catch-up-items-design.md`).
