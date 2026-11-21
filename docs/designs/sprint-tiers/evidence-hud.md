# Sprint tiers: HUD session evidence
Status: done

Branch `feature/sprint-tier-hud`, commits `1f9d14ec` (implementation, guards, rule) and `7b1098e1` (opt-in
capture spec). Not pushed, not merged. Browser specs and further captures were waived on the user's
instruction part-way through; everything not run is listed under "Not run", and nothing unrun is recorded
as passed.

## What changed

- `src/sprint-tier-hud.ts` (new, 26 lines) writes `body[data-sprint-tier]` (the tier id from
  `sprintTier()` in `src/sprint-tier.ts`, while racing) and `body[data-sprint-chain]` (`2` or `3`), on
  change only, and returns the caption for the running tier (`hud.tier.<id>`, or `hud.tierChain.<id>`
  during a chain).
- `src/race-hud.ts` (395 of 400 lines) calls it once per HUD pass and names no tier itself. The flight
  state, the NITRO status and the speed caption all show that one caption.
- `src/style.css` (after the NITRO marker, so the main CSS contract hash is unchanged): one rule per tier
  sets `--tier-lift`, `--tier-loop`, `--tier-glow`, `--tier-core`, `--tier-rim`; one rule per chain level
  sets `--chain-lift`, `--chain-pace`, `--chain-glow`.
- `src/touch-sprint-buttons.css` reads those variables: flame height, loop speed, flame and glow colours,
  a static button glow, press feedback and the ready-ring glow. It holds no tier id.
- `src/locales/nitro-hud.ts` holds the captions; `hud.boostEngaged` left `src/locales/ui.ts` for
  `hud.tier.boost`.
- A future tier is one `body[data-sprint-tier="<id>"]` rule plus one `hud.tier.<id>` key.

## What each tier looks like

| Step | `data-sprint-tier` / chain | Flame height | Loop | Glow | Colours (core / rim) | Caption en | Caption zh-TW |
| --- | --- | --- | --- | --- | --- | --- | --- |
| BOOST | `boost` | 0.62 | 0.9 s | 7 px | `--boost-text` / `--boost` | BOOST ENGAGED | BOOST 啟動 |
| NITRO | `nitro` | 0.8 | 0.66 s | 11 px | `--nitro-text` / `--nitro` | NITRO ACTIVE | NITRO 啟動中 |
| NITRO with BOOST held | `nitro-boost` | 0.92 | 0.5 s | 15 px | `--nitro` / `--boost` | NITRO + BOOST | NITRO + BOOST |
| Chain x2 | chain `2` | x 1.06 | x 0.86 | + 4 px | of the running tier | NITRO ×2 (+ BOOST) | NITRO ×2 (+ BOOST) |
| Chain x3 | chain `3` | x 1.12 | x 0.72 | + 8 px | of the running tier | NITRO ×3 (+ BOOST) | NITRO ×3 (+ BOOST) |

- Flame height is a share of the flame box; the tallest case (combined, x3) is 0.92 x 1.12 = 1.03, inside
  the 1.05 the box allows.
- Combined is one look on both buttons (gold core, red-orange rim), not two looks stacked. The charge bar
  keeps draining in the BOOST colour (`boost-draining` is unchanged).
- The speed number takes the tier colour and a glow that widens with the tier and the chain; the small
  captions take the colour only (a wide glow smeared 8 px text in the first frames).
- With flames off (Reduced Motion, Comfortable mode, HUD animation off) the static button glow and the
  caption colours still carry the ladder. Forced colours drops the glow; the captions still name the tier.
- Before this change, NITRO with BOOST held showed "NITRO ACTIVE" on the flight state and "BOOST ENGAGED"
  on the speed caption at the same time (visible in the `before/` frames).

## Commands and observed results

RED first:

- `node --test tests/sprint-tier-hud.test.js` before the implementation: tests 1, pass 0, fail 1 (the file
  could not load `src/sprint-tier-hud.ts`).
- `PLAYWRIGHT_PORT=5245 npx playwright test tests/nitro-fly-browser.spec.js -g "pressing NITRO again"` on
  the old `dist/`: 1 failed, `toHaveAttribute` on `body` expected `data-sprint-tier="nitro"`, received `""`.

GREEN, final tree (`1f9d14ec`):

| Command | Result |
| --- | --- |
| `node --test tests/module-size.test.js` | 3 tests, 3 pass |
| `npm test` | 3678 tests, 3674 pass, 0 fail, 4 skipped (656 s under heavy machine load) |
| `npm run typecheck` | exit 0 |
| `npm run build` | built in 7.93 s; release-bundle check passed |
| `node --test tests/sprint-tier-hud.test.js tests/sprint-color-tokens.test.js tests/main-ui-contract*.test.js` | 16 tests, 16 pass |

Browser, run before the waiver and before the last two edits (the caption-glow rule in `src/style.css` and
the zh-TW combined caption), so they do not cover the final tree:

- `PLAYWRIGHT_PORT=5245 npx playwright test tests/nitro-fly-browser.spec.js` after `npm run build`: the
  extended chain test passed (19.4 s), the touch test passed (6.1 s), and the sibling "FLY + NITRO shows
  AIR DASH · NITRO and keeps flying" failed once on the 45 s test timeout (received "ASCENDING") with the
  load average near 137 on 10 cores. Rerun alone with `--repeat-each=2`: 2 passed (8.8 s, 8.4 s). I read it
  as load, not as proven.
- One earlier `npm test` run in this session was killed from outside mid-run (its
  `playwright test --list` child was mistaken for a browser run) and reported file-level failures. It is
  void; the run in the table is the rerun.

## HUD frame cost, before and after

Measured by `tests/sprint-tier-hud-capture-browser.spec.js` over 3 s per step: the whole `updateUI` pass
(ms, median / p95 / mean), the frame time, and Chrome's style and layout time per second.

| View | Step | HUD pass before | HUD pass after | Style ms/s before → after | Layout ms/s before → after |
| --- | --- | --- | --- | --- | --- |
| portrait en | boost | 0.5 / 11.5 / 1.6 | 0.4 / 13.1 / 1.967 | 80.8 → 82.45 | 4.55 → 4.44 |
| portrait en | nitro | 0.4 / 14.8 / 2.097 | 0.5 / 16.5 / 2.146 | 75.34 → 94.58 | 5.03 → 5.7 |
| portrait en | nitro-boost | 0.4 / 10.7 / 1.381 | 0.5 / 13.2 / 1.608 | 76.58 → 83.6 | 4.76 → 5.57 |
| portrait en | chain-x3 | 0.3 / 9.5 / 0.961 | 0.5 / 16.9 / 2.214 | 55.82 → 94.5 | 3.99 → 5.7 |
| portrait zh-TW | boost | 0.4 / 8.4 / 1.369 | 0.4 / 13.9 / 2.122 | 72.25 → 84.04 | 4.22 → 5.37 |
| portrait zh-TW | nitro | 0.4 / 9.3 / 1.764 | 0.4 / 17.5 / 2.219 | 70.55 → 80.11 | 4.33 → 5.45 |
| portrait zh-TW | nitro-boost | 0.4 / 11.4 / 1.344 | 0.5 / 17.6 / 2.619 | 79.6 → 107.1 | 5.48 → 7.53 |
| portrait zh-TW | chain-x3 | 0.3 / 11.3 / 1.549 | 0.4 / 14.2 / 1.889 | 67.85 → 141.1 | 4.48 → 8.72 |
| landscape en | boost | 0.4 / 12.4 / 1.364 | 0.4 / 15.6 / 2.214 | 69.77 → 97.07 | 4.55 → 7.82 |
| landscape en | nitro | 0.4 / 14 / 2.344 | 0.7 / 17 / 2.269 | 80.11 → 96.99 | 5.11 → 7.13 |
| landscape en | nitro-boost | 0.4 / 11.5 / 1.524 | 0.7 / 17.1 / 2.694 | 76.02 → 130.19 | 4.86 → 8.94 |
| landscape en | chain-x3 | 0.5 / 12.2 / 1.333 | 0.4 / 14.2 / 1.828 | 79.62 → 87.59 | 4.94 → 6.85 |
| landscape zh-TW | boost | 0.4 / 14 / 1.73 | 0.4 / 16.6 / 1.756 | 117.67 → 90.83 | 8.07 → 7.29 |
| landscape zh-TW | nitro | 0.4 / 18.2 / 2.517 | 0.3 / 27 / 2.506 | 95.94 → 117.29 | 6.79 → 8.2 |
| landscape zh-TW | nitro-boost | 0.5 / 14.7 / 2.422 | 0.4 / 21.3 / 2.183 | 80.05 → 92.84 | 4.95 → 6.43 |
| landscape zh-TW | chain-x3 | 0.3 / 11.2 / 1.219 | 0.4 / 15 / 2.153 | 74.6 → 80.26 | 5.02 → 7.47 |

- Frame time: median 16.7 ms before and after in every step (p95 16.7 before, 16.7 to 16.8 after).
- The median HUD pass stayed at 0.3 to 0.7 ms. p95, mean, style and layout rose in most rows.
- This is not a clean comparison: the "after" runs were taken with the machine's load average between 104
  and 180 on 10 cores (other sessions), the baseline at a lower load. The change adds two attribute writes
  on a tier change and no per-frame work, but the numbers above do not prove the rise is only load. A
  re-measure on a quiet machine is listed under "Not run".

## Captures

In `$TMPDIR/sprint-tiers-captures/hud/` (390 x 844 and 844 x 390, touch, device scale 2); the same names
under `before/` hold the baseline.

- `portrait-en-boost.png`, `portrait-en-nitro.png`, `portrait-en-nitro-boost.png`,
  `portrait-en-chain-x3.png`, `portrait-en.json`
- `portrait-zh-TW-boost.png`, `portrait-zh-TW-nitro.png`, `portrait-zh-TW-nitro-boost.png`,
  `portrait-zh-TW-chain-x3.png`, `portrait-zh-TW.json`
- `landscape-en-boost.png`, `landscape-en-nitro.png`, `landscape-en-nitro-boost.png`,
  `landscape-en-chain-x3.png`, `landscape-en.json`
- `landscape-zh-TW-boost.png`, `landscape-zh-TW-nitro.png`, `landscape-zh-TW-nitro-boost.png`,
  `landscape-zh-TW-chain-x3.png`, `landscape-zh-TW.json`
- `portrait-en-nitro-boost-reduced-motion.png`

What the frames show: the four steps read as a ladder in both orientations (low red-orange BOOST flame,
taller gold NITRO flame, gold core with a red-orange rim on both buttons for the combined tier, taller
with a wider glow at x3); the Reduced Motion frame has the static glows and no flames.

The saved frames are older than the final tree in two ways:

- The four `portrait-en-*` step frames predate the caption-glow fix: their small captions still carry the
  wide glow.
- All zh-TW frames show the earlier combined caption "NITRO + BOOST 齊發", which was cut off in the
  portrait mode panel ("NITRO + BOOST 齊…"). It is now "NITRO + BOOST", shorter than the x3 caption that
  fits the same box in the same frames. The fix itself has no frame.

Seen in the frames and left alone: in landscape the NITRO flame overlaps `#nitro-status` and the meter
pips. The baseline frames show the same overlap, so it predates this change.

## Not run

Reason for every item in this list: waived on the user's instruction.

- `tests/race-hud-overlap-browser.spec.js`
- `tests/hud-3x-artwork-browser.spec.js`
- `tests/touch-actions-browser.spec.js`
- `tests/hud-dom-browser.spec.js`
- `tests/handoff-browser.spec.js`
- `tests/i18n-browser.spec.js`
- `tests/browser.spec.js`
- `tests/controls-preview-browser.spec.js`, `tests/depth-browser.spec.js`,
  `tests/foldable-layout-browser.spec.js`, `tests/interactive-tutorial-browser.spec.js` (other specs that
  touch the sprint buttons)
- `tests/nitro-fly-browser.spec.js` on the final tree (it last ran before the caption-glow rule and the
  zh-TW caption edit)
- `npm run test:browser`, `npm run test:layout`, `make verify`
- Re-captures on the final tree: the four portrait en steps, every zh-TW frame
- Frames for forced colours, Comfortable mode (`.vfx-comfort`), HUD animation off and a 568 px wide phone
- A check on a real phone (the captures are Chromium phone emulation with touch)
- A HUD cost re-measure on a quiet machine

## For the coordinating session

- `src/locales/ui.ts` shrank from 1143 to 1141 lines. Its `LEGACY_CEILINGS` entry in
  `tests/module-size.test.js` is still 1143; that file is outside this session's edit list, so the ratchet
  is yours to lower.
- `tests/sprint-tier-hud-capture-browser.spec.js` runs only with `SPRINT_TIER_HUD_CAPTURE=1`.
- The pre-push layout gate applies to this branch (`src/style.css` and `src/locales/` changed) and has not
  run here.
