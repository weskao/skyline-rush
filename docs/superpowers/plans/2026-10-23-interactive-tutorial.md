# Interactive driving tutorial implementation plan

**Goal:** Teach eight driving actions against the live game scene on keyboard, touch and tablet layouts.

**Architecture:** A pure session owns a disposable Free Drive race and action/outcome detection. The existing renderer and input controller run that race; main.js saves and restores the original race without saving tutorial results. A responsive coach presents each step and highlights the real controls.

**Tech stack:** Existing Vue, JavaScript modules, Three.js, Node tests and Playwright. No new dependency.

**Spec:** The interactive tutorial checklist in `TODO.md`; static guide remains available and is the first-visit entry point.

## Constraints

- Preserve control preferences, current key map, paused race, progression, history, ghosts and daily challenges.
- Start on the coast with no traffic/rivals/pickups/rings. Training charge is ephemeral.
- Do not complete steps on elapsed time alone, automatic throttle, wrong input, or while paused.
- Use current Slide, Buttons, Tilt and FLY hold/toggle settings; never request tilt permission automatically.
- Keep controls usable at 320 px, phone landscape and tablet sizes; native dialogs and reduced motion remain supported.

## Task 1: Pure tutorial session

Files: `src/interactive-tutorial.js`, `tests/interactive-tutorial.test.js`.

- [ ] Write and observe failing tests for the eight-step sequence, wrong/idle inputs, pause and real physics outcomes.
- [ ] Export `TUTORIAL_STEPS` and `createInteractiveTutorial()` returning `race`, `index`, `step`, `progress`, `complete`, `update(input, dt)`.
- [ ] Use existing Free Drive physics; prepare safe practice conditions per step and grant one tutorial-only NITRO charge.
- [ ] Run `node --test tests/interactive-tutorial.test.js` successfully.

## Task 2: Live coach and lifecycle

Files: `src/main.js`, `src/App.vue`, `src/style.css`, `src/locales/ui.js`, `tests/interactive-tutorial-browser.spec.js`.

- [ ] Write failing browser tests for live keyboard/touch completion, exit/restore, pause and unchanged persistent progression.
- [ ] Add entry buttons in the static guide and Controls; save the original race and run the disposable tutorial session.
- [ ] Show localized current-key/input instructions, actual-control highlighting, step count, pause, exit, completion and replay.
- [ ] Restore the original race on exit; do not record tutorial ghosts/results/rewards. Preserve completion separately when storage works.
- [ ] Verify desktop, phone portrait/landscape, Buttons and Slide, hold/toggle FLY, tablet and custom keys.

## Task 3: Verification and delivery

- [ ] Run `npm test`, `npm run build`, focused tutorial browser tests and required existing controls/navigation regressions.
- [ ] Inspect real WebGL screenshots and check mobile target overlap and keyboard focus.
- [ ] Mark only verified TODO items complete; keep real-device acceptance open if unavailable.
- [ ] Use screenshot-mark-send and done-report after verification; preserve final artifacts and clean only task-owned temporary files.

## Review focus

Paused race restoration; automatic throttle falsely passing a lesson; held FLY toggle preventing landing; accidental career writes; coach blocking mobile controls after rotation.
