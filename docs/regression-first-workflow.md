# Regression-first development & merge gate

**Scope:** All future gameplay, track, physics, rendering, UI, controls and race-flow changes.
This is the working procedure referenced by `CLAUDE.md` and `AGENTS.md`. Apply the
more specific rules in `.claude/rules/` as well. Keep the change on the current
feature branch; **do not create a PR, merge into main, tag or deploy without an
explicit user request**.

## 1. Identify the real failure (before editing)

- Read `CLAUDE.md` plus file-scoped rules; trace simulation → track coordinates →
  world renderer → UI event handling. Search all callers and sibling tracks before
  adding an exception. Prefer a single shared root-cause fix over track-specific
  offsets, cosmetic smoothing, z-index escalation without hit testing or retries.
- Check the branch against current `origin/main` before implementation and again
  before a requested merge. Integrate upstream changes and resolve conflicts without
  dropping either side's completed features.
- Record the user-visible repro, expected behavior, affected tracks/devices and a
  specific acceptance condition in `TODO.md` with `- [ ]`.

## 2. TDD: RED → GREEN → REFACTOR

- Add the smallest deterministic regression test that reproduces the original
  problem. **Run it and inspect the expected failure** (a syntax/import error is not RED).
- Implement the minimum shared fix; re-run the focused test until GREEN, then
  `npm test`. Preserve camera, collision, speed, handling and effects unless the
  fix legitimately requires changing them. Do not weaken or delete old tests.
- Write down test command and observed results; a test merely *written* or a CI job
  merely *started* does not count as verified. Mark TODO boxes `[x]` only when
  evidence for that exact item is available.

## 3. Cross-track and input regression matrix

- Track/vehicle/physics: exercise **every track**, including Sky Spiral's helix
  joins and all five World Tour routes; low/high speeds, straight-to-curve,
  inner/outer edges, steering/drift, slope/bank, jumps, landing, other car types
  and 30/60/120 FPS equivalents. Inspect wheel/body clearance against the actual
  road *mesh*, not only the car origin (`vehicle-road-stability.md`).
- UI/controls/results: drive, collide, finish, then **actually click** camera,
  language, Next, Race Again and relevant modal controls (no JavaScript
  `element.click()` substitutes). Verify state changes, focus, stacking order,
  pointer capture and browser console errors on desktop and mobile;
  include portrait/landscape where affected (`ui-phase-interactions.md`).
- Accessibility, localized strings, saved progress, touch controls and any
  previously working mechanics must remain intact.

## 4. Local executable gate

Run from the repository root:

```sh
make verify
```

This runs `npm test`, `npm run test:browser` (including the production
`npm run build` via its pretest hook), then
`npx playwright test --config=playwright.world-tour.config.js`. The latter
is **not** part of the default browser suite. For cloud-save changes, additionally
run `npm run test:cloud` with the required Java 21/Firebase emulators.

Investigate all failures before proceeding. If a local test cannot be run,
state the specific blocker and leave the acceptance item unchecked.

## 5. Visual and behavior evidence (human review)

- For visual/movement/interaction changes, capture **real running-game**
  before/after screenshots or a recording from the affected corner/finish screen.
  Playwright artifacts help, but automated DOM or frame-only assertions do **not**
  prove physically correct road contact or that the result screen works on devices.
- Include: affected track and distance/phase, browser, desktop/mobile viewport,
  reproduction inputs, observed result, console errors and artifact link/path.
- Manual WebGL, touch hardware and perception checks are a **manual gate**, not
  something GitHub Actions can certify. Explicitly list missing coverage.
- Do not announce “all fixed” if an original symptom cannot be reproduced and
  verified after the change.

## 6. CI & approval before merge

- Push to the feature branch; inspect **the workflow for its current HEAD SHA**.
  CI runs unit, browser shards, cloud-save and the dedicated World Tour long-run
  suite. Any failed, cancelled, skipped-required or still-running job is not green.
- Confirm no behind commits from `main`, resolve any conflicts, and repeat the
  entire gate on the resulting merge commit. A past SHA's green CI is not evidence
  for a new SHA.
- Provide a summary: root cause, changed shared code, tracks checked, RED/GREEN
  evidence, build and CI URL/SHA, real-game images, and remaining uncertainty.
- **Only when all required automated checks and manual evidence pass** may the
  work be marked merge-ready. Merge to `main` **only upon the user's explicit
  authorization**. Do not bypass red gates to tag or deploy.

## Practical distinction

`CLAUDE.md` and this file tell coding agents **what to do**; `make verify`
runs the available local gates; `.github/workflows/ci.yml` provides remote
checks. Requiring CI status checks on merges or preventing a direct push to
`main` additionally needs repository branch rulesets/protection. Manual
visual proof and TDD's historical RED observation cannot be guaranteed by
static Markdown or GitHub Actions alone.
