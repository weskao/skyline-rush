# Sprint Button Flames Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** NITRO and BOOST burn with a flipbook flame that leaves the button; NITRO / GAS / BOOST / FLY share one bezel and a four-hue palette; the two readiness cues sound like ignition.

**Architecture:** One alpha-only 16-frame strip masks a CSS heat gradient on `.sprint-ready-effect::before`; state attributes pick the sustained size, and Web Animations play the one-shot burst and shock ring. No per-frame JavaScript.

**Tech Stack:** CSS masks and `@property`, Web Animations, Pillow (generator only), node:test, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-14-sprint-button-flames-design.md`

## Global Constraints

- Hitboxes stay at least 44 px and cover the whole rectangle; the flame has `pointer-events: none`.
- Never animate the button's own `transform`: `.is-positioned` buttons use it for placement.
- No edit to `src/style.css` above the NITRO marker (`tests/main-ui-contract.test.js` hashes it).
- No localStorage read and no DOM write per frame; write `dataset` only when the value changes.
- Reduced motion, forced colours, HUD animation off and `motion === false` remove the flame.
- Strip: 16 frames × 288 × 384 px in one row (4608 × 384), at most 150 KB, Pillow only.
- `nitro-ready` and `boost-ready` keep three oscillators each and every NITRO start pitch stays above
  every BOOST start pitch (`tests/audio.test.js`).
- No user-specific absolute path in any committed file.

## Review Focus

- Repositioned buttons (`.is-positioned`, drag-to-move): flame and stacking still follow the button.
- A neighbour under a flame: a tap there reaches the neighbour, and its icon stays on top.
- HUD animation preference off mid-race: no flame after the next state change.
- BOOST held on an empty tank (`charging` + `.is-held`): no blaze.
- Browsers without `@property` or `steps(…, jump-none)`: colours switch instantly, button stays usable.

---

### Task 1: Flame strip

**Files:** Create `scripts/generate-sprint-flame.py`, `src/sprint-flame-strip.webp`. Delete `src/sprint-ready-flame.svg` (in Task 2, with its last reference).

**Interfaces:** Produces the strip; frame *k* sits at x = *k* × 288. Within a frame the button occupies
x 13.2 %–86.8 %, y 38.9 %–94.4 % (flame box = button + 70 % above, 18 % each side, 10 % below).

- [ ] `python3 scripts/generate-sprint-flame.py` writes the strip: seeded tileable noise scrolled up one period over 16 frames, added to a falloff field around the button rectangle, soft threshold to alpha, white RGB.
- [ ] `python3 scripts/generate-sprint-flame.py --check` asserts size 4608 × 384, bytes ≤ 150 000, and alpha 0 on the left, right and top edge of every frame. Expected output: `ok`.
- [ ] Look at frames 0, 5 and 10 at native size before continuing.

### Task 2: Flame, states, stacking and palette (CSS)

**Files:** Modify `src/touch-sprint-buttons.css`, `tests/hud-3x-artwork-browser.spec.js`. Delete `src/sprint-ready-flame.svg`.

**Interfaces:** Consumes `data-nitro-state`, `data-boost-state`, `.is-held`, `:disabled`, and `data-flame="on"` from Task 3. Produces `--flame-rest` (sustained `scaleY`, origin at the button's top edge): NITRO ready `.55`, BOOST ready `.3`, active `1`.

- [ ] RED: in the browser spec replace the "outset ≤ 8, no neighbour overlap, FLY and throttle untouched" assertions with: flame box clears the top by ≥ 40 % of the button height and each side by ≥ 8 px, stays in the viewport; mask image is 4608 × 384; with `data-flame="on"` and a ready state the `::before` mask position differs between two samples 250 ms apart; a point in the overlap on a neighbour hits the neighbour; stacking is BOOST < NITRO < FLY = GAS; all four buttons have a transparent background and the `-1px` bezel; GAS rim is green; reduced motion hides the effect.
- [ ] Run `npm run build && PLAYWRIGHT_PORT=<free port> npx playwright test tests/hud-3x-artwork-browser.spec.js` and see it fail on the old CSS.
- [ ] GREEN: apply the shared bezel to the four buttons, the per-button palette and state colours (registered `--rim`, `--face-top`, `--face-bottom`, 0.2 s), the flame box, `::before` flipbook (`steps(16, jump-none)`), `::after` shock ring, the stacking order, and the green preview key under `#controls-panel`.
- [ ] Re-run the spec: PASS.

### Task 3: Flame gate, burst and ring (TypeScript)

**Files:** Modify `src/sprint-ready-feedback.ts`, `tests/sprint-ready-feedback.test.js`.

**Interfaces:** Produces `button.dataset.flame = 'on' | 'off'` on both buttons. `on` = `motion && phase === 'racing' && readHudFeedback().animation`, recomputed only when a state, `motion` or the phase changes.

- [ ] RED: unit tests — the cue animates `::before` (burst) and `::after` (ring) once each per button; `dataset.flame` is `on` while racing with motion and `off` when motion drops or the preference is off; `localStorage.getItem` is not called on frames where nothing changed.
- [ ] Run `node --test tests/sprint-ready-feedback.test.js`: FAIL.
- [ ] GREEN: implement the gate and the two `pseudoElement` animations.
- [ ] Re-run: PASS.

### Task 4: Ignition cues

**Files:** Modify `src/feedback-sounds.ts`.

- [ ] Rewrite the two tables as thump / rising sweep / bright tail, three notes each, within today's gain and length range.
- [ ] `node --test tests/audio.test.js`: PASS unchanged.

### Task 5: Verify and record

- [ ] `node --test tests/module-size.test.js`, `npm run typecheck`, `npm test`, `npm run build`, the focused browser spec, `tests/controls-preview-browser.spec.js`.
- [ ] Real screenshots: NITRO ready and active, BOOST embers and blaze, at 390 × 844 and 844 × 390.
- [ ] Frame time before / after with both flames lit (`scripts/perf.mjs desktop --base 5d94cda8`).
- [ ] `TODO.md` entry with evidence; check `README.md` for a needed update.
