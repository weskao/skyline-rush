---
paths:
  - "src/ring-layout.ts"
  - "src/race-tracks.ts"
  - "src/game.js"
  - "src/track-themes*.ts"
  - "src/gauntlet-course.ts"
  - "src/endless-highway.ts"
  - "src/catch-up-items.ts"
  - "src/course-items.ts"
  - "src/course-race-step.ts"
  - "src/shortcut-rewards.ts"
  - "src/courses/*-race.ts"
  - "tests/ring-*.test.js"
  - "tests/shortcut-rewards.test.js"
  - "tests/course-item-density.test.js"
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
- each long-form shortcut or hidden path also gets the dense mix below, in that same window. Classic `RACE_TRACKS` corridors do not
- trains (6 consecutive rings) and full-width rows still occurring in every race

Never move, remove, thin out or randomize an authored sequence as a side effect of layout, variety or economy
work. **Before changing one on purpose, ask the user with `AskUserQuestion`** (zh-TW, first option
"(Recommended)"). Then update `tests/ring-authored-sequences.test.js`, which locks them across re-rolled seeds,
in the same commit. Never weaken that test to make a change pass.

**Catch-up items** (`src/catch-up-items.ts`) are added while racing, never at race start: Classic (not Daily) and
Cup only, player-only, beyond the 900 m draw range, never near sections or other items. Keep them out of start
layouts, rival takes and PERFECT LINE groups (`tests/catch-up-items.test.js`; design:
`docs/superpowers/specs/2026-11-07-catch-up-items-design.md`).

**Long-form courses** (`topology: 'course-graph' | 'course-graph-runtime'`; user, 2026-11-09): rings and pickups scale
with length, `itemScale(track) = length / mean classic length` (`race-tracks.ts`). Classic tracks stay at scale 1, so
their counts are unchanged. Classic traffic uses a `trafficDensity` inside the classic range (0.65–1.5), never 0.
On graph runtimes (`src/course-items.ts`) the shared layout is re-keyed to `(edgeId, localS)` on the ground route.
Every alternate branch gets the shortcut reward line above plus the dense mix, rivals take items on their own edges, and traffic
runs as unranked course cars on the ground route. Catch-up items stay off graph courses. Guards:
`tests/course-item-density.test.js`, `tests/course-items-browser.spec.js` (real WebGL: drawn where they score).

**Dense mix on a shortcut or hidden path** (user, 2026-11-09): a shortcut or hidden path is a section with `type: 'shortcut'`, or a CourseGraph edge that is not on `groundRoute`. The six long-form courses (Dune Tempest, Monsoon Ruins, Skyfall Archipelago, Volcanic Crown, Stormline Megacity, Frostbite Canyon) fill that corridor. The window is the existing reward span, inset 30 m from each end (`from + 30` until `to`, or local arc 30 m until `length - 30`). Rings sit every 25 m from the window start (`group: -4`, `groupSize: Infinity`, so they never complete a PERFECT LINE). Cells sit 12 m after each of those rings, which never lands on the 60 m lattice. The 60 m cells and the halfway tank stay. The mix is authored: re-rolling the layout seed does not move it. Classic tracks keep only the 60 m line. The per-km density cap counts the shared road layout and that 60 m line; the extra rings and the offset-12 cells are outside it. Home: `src/shortcut-rewards.ts`. Guard: `tests/shortcut-rewards.test.js`.
