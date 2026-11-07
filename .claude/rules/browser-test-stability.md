---
paths:
  - "tests/**/*browser.spec.js"
  - "tests/helpers/**"
  - "playwright*.config.js"
---

# Browser specs survive a slow CI runner

CI renders WebGL on CPU, several times slower than a laptop (`slow = 3` in `tests/helpers/ci.js`).
A spec that passes 68 of 68 runs locally can still fail 1 in 2 on CI. Main/develop runs from
2026-10-27 to 2026-11-04 failed 15 times. Most failures were timing races, not product bugs.
Write every assertion so that runner speed cannot change its outcome.

## Freeze, then assert

- **The race keeps driving while the test reads it.** A slow runner may already have passed
  the pad, ring or checkpoint you wanted to judge. Pause the race (`#pause-button`) or seed
  `race.player.distance` just before the target, *then* assert. Never assume the car is still
  where it was a few awaits ago (bonus-gates: the car passed every pad before the locale
  switch, 2026-11-04).
- **Pause freezes the race clock.** Timed labels such as COLLECTED (1.2 s) stay up while paused.
  Judge whichever label the frozen state legitimately shows, not one fixed string.

## Poll anything a UI action changes asynchronously

- `click` / `check` / `selectOption` / `press` resolve once the events are dispatched. They do
  not wait for the race rebuild, Vue render, transition, `localStorage` write or video `play()`
  that follows. Write `await expect.poll(() => page.evaluate(...))` or use a web-first locator
  assertion (`toHaveText`, `toHaveAttribute`), never `expect(await page.evaluate(...))`.
- **Enforced by** `tests/browser-timeouts.test.js` (*poll page state after a UI action*). A
  one-shot read on the line right after an action fails the test. If the action itself settles
  the read, say why on that line with `// settled: <reason>`; an absence check is one example.
- **Media playback is asynchronous.** Judge playing by `currentTime` advancing, polled; do not
  judge it by `paused` read once or by the `play()` promise. A hero clip resuming after a viewer
  closes failed 1 in 2 CI runs this way (`release-media-zoom-browser.spec.js`, not yet
  reproduced).

## Assert only what a player can see

- Hidden elements keep stale text. Check `toBeVisible()` before you judge text, or the
  assertion passes or fails on copy no player sees. Example: hidden `#bonus-status` still held
  "NEXT · AIR +25 · 6 M" in English after a switch to zh-TW.
- Compare against the text actually shown, not a literal guessed in advance. Read it once the
  element is visible and the state is frozen, then assert that it changes.

## Budgets and retries

- Wrap fixed waits and timeouts in `ciTimeout()`. This is enforced by the same test file.
- **A test must fit its budget with room to spare on CI.** CI steps the game at about 1/4 speed (each slow
  frame is clamped to 0.05 s), so a flow that plays N s of game time needs about 4N s of wall clock. A test
  whose passing CI run (the `(1.7m)` in the job log) uses more than about half of its budget gets an explicit
  `test.setTimeout(ciTimeout(…))`, set in the shared flow helper so every caller inherits it. Example: the
  keyboard full-practice tests took 1.7 min of the 135 s default and timed out mid-glide on slower runners
  (develop, 2026-11-07); `keyboardToNitro` now sets `FULL_PRACTICE_BUDGET`, guarded in `browser-timeouts.test.js`.
  A `Test timeout … exceeded` with the page still progressing is a budget miss; a frozen page is a bug.
- CI retries a failed test once (`retries` in `playwright.config.js`). The retry absorbs runner
  stalls such as `browserType.launch: Timeout 180000ms`. It does **not** make a flake
  acceptable. The `github` reporter annotates every test that passed only on retry. Treat that
  annotation as a failing test: find the timing race and fix it as above. Never raise
  `retries`, add `test.describe.configure({ retries })`, or wrap an assertion in a loop to get
  CI green.
- To check a flake fix locally, stress the spec under CI timing:
  `CI=1 npx playwright test <spec> --repeat-each=8 --workers=4 --retries=0` after
  `npm run build`. `--retries=0` keeps the CI retry from hiding a flake. Report the pass count.
  A single local pass does not prove a fix.
