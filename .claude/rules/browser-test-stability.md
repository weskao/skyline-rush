---
paths:
  - "Makefile"
  - "tests/**/*browser.spec.js"
  - "tests/helpers/**"
  - "playwright*.config.js"
---

# Browser specs survive a slow CI runner

CI renders WebGL on CPU, several times slower than a laptop (`slow = 3` in `tests/helpers/ci.js`).
A spec that passes 68 of 68 runs locally can still fail 1 in 2 on CI. Main/develop runs from
2026-10-27 to 2026-11-04 failed 15 times. Most failures were timing races, not product bugs.
Write every assertion so that runner speed cannot change its outcome.

Keep Playwright helper imports outside the source string served by a module mock. A test-only import in the served module can break application startup before the first assertion.

A spec that fails to load reddens every shard, because CI plans shards from `playwright test --list`. Trap
(2026-11-20, develop `a7a6afd1`): two merges both added `clickLobbyOption` to `result-cloud-browser.spec.js`
and the duplicate import failed all 16 browser shards. Enforced by `tests/browser-specs-load.test.js` (`npm test`, pre-push).

## Freeze, then assert

- **The race keeps driving while the test reads it.** A slow runner may already have passed
  the pad, ring or checkpoint you wanted to judge. Pause the race (`#pause-button`) or seed
  `race.player.distance` just before the target, *then* assert. Never assume the car is still
  where it was a few awaits ago (bonus-gates: the car passed every pad before the locale
  switch, 2026-11-04).
- **Pause freezes the race clock.** Timed labels such as COLLECTED (1.2 s) stay up while paused.
  Judge whichever label the frozen state legitimately shows, not one fixed string.
- **Pause does not freeze the camera.** The chase camera keeps easing to its rig (about 1.6 s at
  60 fps), so the frustum moves under a draw-count, culling or screen-position read. Trap
  (2026-11-16): Neon traffic measured 22 calls instead of 21 whenever the race paused early (cold
  Vite cache); a rival's wheel rim crossed the frustum edge between the baseline and the reading.
  Wait for the camera to come to rest first: `pausedRace()` in `tests/helpers/traffic-browser.js`
  asserts it.

- **A timed HUD element is measured in one browser task.** Callouts expire after ~1.2 s of race time, so rects and
  opacities read through separate Playwright calls can mix a live element with a stale one. Trap (2026-11-26, CI
  `45679379454`, `responsive-browser` flight director vs callout at 375x667): the director had already returned when its
  opacity was read, reporting an overlap with the callout's old rect. Trigger and measure inside one `page.evaluate`
  on the first frame the element shows; a 1.1 s stall between the reads reproduces the CI error text locally.

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
- **Measure one-shot sound cues on the audio rendering thread.** A stalled WebGL frame can
  make a `ScriptProcessorNode` miss an entire cue (CI 44250995528). Arm an `AudioWorkletNode`
  before the action and retain its measured peak for the browser assertion.

## Assert only what a player can see

- **Accept earned rewards before measuring the mobile results dock.** The native acquisition dialog
  owns the top layer. Parallel locator evaluations can stall on the automatic dismissal handler
  (CI `44486279087`). The portrait dock spec keeps the real dialog open, taps Continue, verifies
  it closes and then reads all controls in one browser tick, before and after scrolling.
- Hidden elements keep stale text. Check `toBeVisible()` before you judge text, or the
  assertion passes or fails on copy no player sees. Example: hidden `#bonus-status` still held
  "NEXT · AIR +25 · 6 M" in English after a switch to zh-TW.
- Match a live value's format to its writer, not to the usual sample. `#nitro-meter` `aria-valuenow` is the charge
  to two decimals (`src/race-hud.ts`); `/^\d+$/` held only while no partial pickup landed in the window, so
  `hud-compositing-browser` failed on CI with "1.5" and "0.75" (runs 45872013667, 45901796976).
- Compare against the text actually shown, not a literal guessed in advance. Read it once the
  element is visible and the state is frozen, then assert that it changes.
- **Reach a lobby mode button the way a player does.** At 1000px wide or less, or 500px tall or less,
  the lobby folds the mode list (`#lobby-mode-options`) behind `#lobby-modes-toggle`
  (`src/race-lobby.css`), so `button[data-race-mode="…"]` is in the DOM but hidden. A direct
  `.click()` waits out the whole timeout and reads like a product bug. Use `clickLobbyOption()` or
  `openLobbyModes()` from `tests/helpers/home-lobby.js`; both do nothing extra on desktop.
  `close-button`, `event-lab` and `mode-first-setup` failed this way at 390x844.
  **Enforced by** `tests/lobby-mode-helper.test.js`: a spec that names a mode button must call the
  helper. It cannot see a single missed click in a spec that already uses the helper; run the
  spec at a phone size. The helpers wait for Home (`lobbyShown`) before `isVisible()`, which answers at
  once: called right after `page.goto` it found no button and expanded the Mode list on desktop, pushing
  the Cup recovery panel 82px past `#intro` (develop CI 44674764907). Guarded in the same test file.

- **A Tab walk can end on the browser's own UI.** `assertTrapped` (`tests/responsive-focus-browser.spec.js`) presses
  Tab past the dialog's last control; the page logs `browser` and `activeElement` is `<body>`. The Escape pressed next
  goes to the address bar, so the dialog stays open and the test reads like a product close bug (Event Lab at 320x740,
  red on attempt 1 and green on retry, develop CI 44892040873). The walk ends by focusing a control inside the dialog.
  Enforced by `tests/browser-timeouts.test.js` (*a Tab-trap walk ends with focus back inside the dialog*).

## Catalog drift and deterministic physics

- Home route-map checks cover both `RACE_TRACKS` and `UPCOMING_TRACKS`. Keep classic-only
  single-line/no-secret-corridor assertions scoped to `[data-track]`; gated CourseGraph cards
  legitimately draw multiple authored edges. Assert each preview has a route, not a fixed
  overall polyline count. Adding an upcoming track must not invalidate the classic contract.
- A browser scenario teleported onto a gap/span must keep the car inside that section while
  waiting for a fall. Force an unpowered glide at a stable mid-span position and assert the
  *real engine's* respawn; separate deterministic unit tests cover natural falls at several
  simulation frame rates. Do not use wall-clock sleeps or bigger timeouts to hide movement.

## Judge a feature in its own frame, by its own assets

- Vite can inline small raster assets as data URLs or emit hashed filenames. A browser artwork
  assertion compares the bytes of the actual CSS image with the committed artwork, not its URL spelling
  (track-pack atlas, develop CI 45355866805). A raceable track-confirmation scenario explicitly seeds
  the track unlock; locked and Coming Soon preview-only labels remain independently covered by
  `tests/track-chooser-states-browser.spec.js`.

Trap (2026-11-14): three merges changed intended behaviour and left sibling browser specs red on develop for a
day, unseen because each develop push cancelled the previous full CI run. Classic tracks now curve
(`fbbfb8e5`), Endless shows a rolling minimap (same commit) and pickups are always-on meshopt + KTX2 GLBs (`e30ee752`).

- **Poses on a classic road are road-relative.** Hazards and gates turn with the road
  (`hazard-render.ts` `yawAt`), so a world yaw of 0 or a world-x sweep only held while the road was straight.
  Read the heading from `classicRoadRoute(trackId).heading(distance)`, the source the renderer uses, and
  measure lateral sweeps on the ground plane (`tests/hazard-captures-browser.spec.js`).
- **An absence check names the feature's own files.** A shared decoder (`basis/basis_transcoder.*`,
  meshopt) belongs to whichever system loads it first; "no Coast KTX2" is `.ktx2` files, not the transcoder
  (`tests/coast-scenery-browser.spec.js`).
- **A control's name is unique only inside its landmark.** Home's race setup and the VFX panel both have a
  "Showcase camera" combobox (`498d84d0`), so a page-wide `getByRole('combobox', { name })` hit strict mode in
  `browser.spec.js` and `custom-controls-browser.spec.js` (2026-11-16). Scope role locators to the landmark
  that owns the control (`getByRole('complementary', { name: 'Airflow and visual effects' })`).
- **Rival `i` is `window.gameScene.rivals[i]`, never the i-th scene child.** `createRivalFleet`
  (`src/rival-fleet.js`) keeps one pooled car per chassis in scene order and deals each race a shuffled
  lineup, so `scene.children.filter(o => o.userData.driveCue)[1]` was another rival's car and the NITRO
  trail read false (rival-drive-vfx, CI 44395376200). Enforced by `tests/browser-timeouts.test.js`
  (*gameScene.rivals, not scene order*).
- A merge that changes a shared HUD, road or asset rule runs the browser specs that assert it before it lands
  (`git grep` the selector or asset name in `tests/*browser.spec.js`); do not rely on develop's CI to finish.

## Budgets and retries

- **Specs start at Low graphics; a heavier tier is opt-in per spec.** Making the full 3D look the
  default Medium/High path (2026-11-16) doubled every unpinned spec on CI's software WebGL and
  timed out 13 of 16 shards (main run `43924576729`). `tests/helpers/test.js` saves the weak-device
  Low settings unless a spec sets `lowGraphics: false` (automatic-choice / notice specs) or seeds
  its own `skyline-rush-vfx` tier (look, model and effect specs). Guard: *browser specs start at
  Low* in `device-quality-browser.spec.js`. A new default-on rendering cost needs no test change,
  but a spec that must see it pins the tier itself. Low also turns effects *off*: the Garage GIF
  artwork, the mini-boost streaks and the full pickup collect effect. Six specs asserting them failed
  on main run `44012297806`. Scope `test.use({ lowGraphics: false })` to just those tests. Guard:
  *a spec that observes an effect Low turns off chooses a heavier tier* in
  `tests/browser-timeouts.test.js`. When a new Low-only cut gets an observable marker, add it to
  `LOW_GATED` there.
- **Split WebGL preview sweeps into small batches.** Each track switch rebuilds the scene. Keep all catalog entries covered, but let Playwright schedule bounded cases independently. The desktop locked-preview sweep exhausted the 135-second budget as Coast started in CI run `43563563658`.
  The Garage skin catalog grows the same way: previewing a drift trail also opens `GarageDriftPreview`, a second live
  WebGL renderer, and the one-test Crimson GT sweep timed out at 367 s of 360 s (develop CI `44736477255`). Sweep one
  `SKIN_CATEGORIES` entry per test with `reducedMotion: 'reduce'`. Enforced by `tests/browser-timeouts.test.js`
  (*whole Garage skin catalog*); a sweep that must animate ends its loop line with `// motion: <why>`.
- Wrap fixed waits and timeouts in `ciTimeout()`. This is enforced by the same test file.
- **A page load is not a rendered Home.** `index.html` boots `src/startup-entry.ts`, which imports
  `main.js` dynamically (`3033736b`), so `domcontentloaded` and `load` fire before Home is rendered.
  The first wait after `page.goto` keeps the default expect budget. Trap (2026-11-19): the lobby
  summaries spec gave `.route-drivers` 2.5 s and saw it empty in 1 of 3 local runs, which blocked the
  pre-push layout gate. Enforced by `tests/browser-timeouts.test.js` (*first wait after a page load*).
  A key pressed before `main.js` subscribes is lost for good, so no wait retries it. Trap (2026-11-20, since
  `74da0992`): the airflow showcase spec pressed `v` straight after `page.goto` and failed 7 of 7 viewports;
  the "music-off stays silent" spec passed without the game hearing its gesture. Load with `gotoHome(page)`
  (`tests/helpers/test.js`) before the first key press. Enforced by the same test file (*key press after a
  page load*). The same holds for `window.gameScene`/`window.gameplay`: `garage-model-lifecycle` read
  `gameScene.renderer` straight after its load helper and got undefined on CI (44674764907); a load helper
  whose callers read the scene ends with `waitForHome(page)`. Not machine-enforced: 74 specs follow a load
  with the music-prompt `isVisible()` check, which answers at once, so the pattern alone proves nothing.
  A dispatched gesture and an absence branch fail the same way: `dispatchEvent` before `main.js` subscribes
  reaches no listener, and `if (!await x.isVisible())` takes the wrong branch (44674764907: the wallet summary
  tapped while hidden in portrait; `contextmenu` not cancelled). Load with `gotoHome(page)` and scope title
  locators to Home (`#intro-title`): the startup h1 stays in the DOM. Enforced by the same test file
  (*gesture or absence branch after a page load*). `page.reload()` resolves before `main.js` runs too: take a
  storage or state baseline only after `waitForHome(page)`.
- **A START click is not a saved setup.** `start()` (`src/main.js`) awaits the stale-pack check and the first-start guide
  gate before `saveRecentCustom` writes, so `click()` then `page.reload()` loses the recent Custom setup. Trap (2026-11-23):
  `race-modes-browser` "completed Custom setup appears as a recent preset" passed once alone and failed 4 of 5 repeats on a
  loaded machine, reading `#recent-custom` hidden; it looked like a product bug and was not (the preset is saved, just not yet).
  Poll `skyline-rush-recent-custom-v1` between the click and the reload, and `waitForHome(page)` before the first click.
  Enforced by `tests/browser-timeouts.test.js` (*never reloads straight after the START click*).
- **`data-phase="ready"` is not a painted preview.** `#world` keeps `data-frame-loading` (`visibility:hidden`,
  `src/race-loading.css`, set in `src/world.js`) until its first frame paints, and again after each race rebuild, so
  `document.elementFromPoint` returns `#app` and a mouse press on the preview never starts a drag. Trap (develop CI
  44892040873, since `820f9038`): four desktop `track-swipe-browser` tests failed; the trackpad ones passed because they
  dispatch the wheel on the canvas element itself. Call `waitForWorldFrame(page)` (`tests/helpers/test.js`) after
  `waitForHome` before any real mouse press or hit-test on the preview. Enforced by `tests/browser-timeouts.test.js`
  (*waits for the painted world frame*).
- **A held asset is released on the loading step, never on RACING.** Since `556d163c` the starting grid waits for the
  equipped car, scenery and pickups (`#countdown[data-step="loading"]`, `race-hud.ts`), so a race cannot start while a
  GLB is held. Trap (2026-11-21, develop CI 44892040873): crimson-gt held the GT GLB until `#race-status` read RACING;
  the grid sat in COUNTDOWN until the loader's 15 s deadline (`timeoutMs`, `src/asset-model-loader.ts`) fell back to
  the procedural car, and the spec then read `data-garage-model` `fallback:timeout` instead of `model`. Never raise
  or weaken the shipped deadline: wait for the loading step, release, then expect RACING. A hold that outlasts a slow
  runner calls `widenModelDeadline(page)` (`tests/helpers/gameplay-browser.js`, Vite dev server only). Enforced by
  `tests/browser-timeouts.test.js` (*releases it before it waits for RACING*, *widens the loader deadline*).
- **COUNTDOWN includes the loading hold.** `#race-status` reads COUNTDOWN while the grid waits for the car, scenery
  and pickups (`#countdown[data-step="loading"]`), and the 3-2-1 only starts after it. A RACING wait under the 10 s
  default budget therefore waits for `#countdown` to leave `data-step="loading"` first. Trap (2026-11-21, main CI
  44925164077): `countdown-slow-render` gave RACING `ciTimeout(4000)` straight after COUNTDOWN and failed both attempts;
  its screenshot shows the race starting just after the budget. Enforced by `tests/browser-timeouts.test.js`
  (*a short RACING wait starts after the grid has left its loading step*).
- **A route handler can outlive its test.** A spec that ends on a navigation leaves `route.fetch()` in flight;
  closing the context disposes the response and fails a passed test with "Response has been disposed"
  (hazard-captures, track-themes, 44674764907). The shared context fixture runs `unrouteAll` with
  `ignoreErrors`; a spec on plain `@playwright/test` does it in `afterEach`. Enforced by
  `tests/browser-timeouts.test.js` (*cannot outlive its test*).
- **The setting toast lives 1.8 s (`TOAST_MS`).** Find, check and measure `#game-toast .game-toast-pill` in one
  `page.waitForFunction`, as for the halfway card; chained locator reads found it gone on CI (toggle-feedback,
  44674764907). Enforced by `tests/browser-timeouts.test.js` (*self-expiring element in one page tick*). A fixed
  sleep or an `isVisible()` check after a load is not readiness either; that guard rejects both.
- **The swipe hint chip clears itself 6 s after it shows (`showSwipeChip`, `src/track-swipe-ui.ts`).** The Settings
  toggle that raises it (`toggleAirflowPreview`: open, click, close) can outlast that on CI, so the live
  `data-state` read `""` for the whole 30 s while AIRFLOW was already on (phone reload hint, red on both attempts,
  main 44925164077). Record each hint in a `MutationObserver` installed before the toggle (`watchHints`,
  `tests/track-swipe-browser.spec.js`) and assert on the record. Enforced by `tests/browser-timeouts.test.js`
  (*records the self-clearing swipe hint with an observer*).
- **Two tabs racing a store confirm depend on order.** Since `2a98ebde` a tab withdraws a confirmation another
  tab's commit made stale; hold the demo Web Lock until both tabs show `aria-busy`, then release it
  (`wave3-economy-transactions-browser.spec.js`).
- **The preview serves `dist/` only.** A page-side `import('/src/…')` needs `test` from `gameplay-browser.js` (Vite
  dev server); on the preview it fails with "Failed to fetch dynamically imported module". Enforced by
  `tests/browser-timeouts.test.js` (*imports /src in the page*).
- **A raw `browser.newPage()` skips the suite's Low start and CI canvas size.** Pass the fixture's `viewport` and
  `deviceScaleFactor` and seed a tier; crimson-gt's second page rendered High while the first kept running and
  timed out on CI (44674764907). Even at Low, two live renderers starve the runner: the second page never set
  `window.gameScene` in 30 s while `gameplayPage` kept drawing the GT (44716140443). Give the second page its
  own test, or open pages one at a time and close each. Enforced by `tests/browser-timeouts.test.js` (*never
  opens a second browser page beside it*).
- **A test must fit its budget with room to spare on CI.** CI steps the game at about 1/4 speed (each slow
  frame is clamped to 0.05 s), so a flow that plays N s of game time needs about 4N s of wall clock. A test
  whose passing CI run (the `(1.7m)` in the job log) uses more than about half of its budget gets an explicit
  `test.setTimeout(ciTimeout(…))`, set in the shared flow helper so every caller inherits it. Example: the
  keyboard full-practice tests took 1.7 min of the 135 s default and timed out mid-glide on slower runners
  (develop, 2026-11-07); `keyboardToNitro` now sets `FULL_PRACTICE_BUDGET`, guarded in `browser-timeouts.test.js`.
  A `Test timeout … exceeded` with the page still progressing is a budget miss; a frozen page is a bug.
- **CI warns before a test tips over.** `tests/helpers/budget-reporter.js` (CI only) adds a
  "Near its test timeout" warning and a job-summary row for every test that used more than half
  its own budget. Treat it like a retry annotation: fix the wait or set an explicit budget.
- **Inside `page.evaluate`, wait on game state per frame, bounded by race time.** A CPU-only
  runner stretches every `setTimeout` to a whole ~300 ms frame, so `for (i < 200 && !ring.hit)
  await wait(10)` burned 60 s on one missed ring and timed ring-sfx out (CI 42489399352). Write
  `while (!decided && race.elapsed < until) await new Promise(requestAnimationFrame)`. Enforced by
  `tests/browser-timeouts.test.js` (*counted wall-clock sleep*).
- **A wall-clock poll cannot wait out game time; a wall-clock phase cannot wait for the test.** A landing is
  up to 2.6 s of game time (about 50 CPU-rendered frames at ~1 s each on High), past a 45 s poll: wait in
  the page per frame, bounded by race time, then poll. The practice 3-2-1 runs 3 s of wall clock, so a
  check made "during the countdown" after two expects arrives after GO: sample it per frame from before
  the click (`hero-roadster-race-browser.spec.js`, `interactive-tutorial-browser.spec.js`, CI 44025345247).
  Mechanism: `landed(page)` in `tests/helpers/gameplay-browser.js` goes on the line before every
  altitude-0 poll. Enforced by `tests/browser-timeouts.test.js` (*waits out the fall in game time*,
  *never asserts absence between its countdown wait and its racing wait*).
- **A slow-frame shim stalls each frame once, not each `requestAnimationFrame` callback.** Since the results
  credit roll runs its own rAF loop, a per-callback 300 ms stall made the 17 frames a finish needs (4 to cross
  the line, 12 for the 0.6 s results reveal at 0.05 s each) cost 39 stalls: 11.9 s, past the 10 s expect, while
  a real slow device took 5.4 s. Key the stall on the frame timestamp (`stalledFrame`); enforced by
  `tests/browser-timeouts.test.js` (*slow-frame shim*).
- **A page-wide animation wait must survive a cancel.** `document.getAnimations()` also holds the setting toast
  (`GameToast.vue`, 1.8 s entry, unmounted by `TOAST_MS`); a cancelled animation rejects `finished` with
  AbortError. Trap (2026-11-20): pressing `v` raised the toast and `readAirflowStart` failed 7 of 7 viewports.
  Write `a.finished.catch(() => {})` or scope to one element. Enforced by `tests/browser-timeouts.test.js`
  (*a page-wide animation wait tolerates a cancelled animation*).
- **Measure an overlay after its entry animation.** The Garage (`history-in`, translateX 22px), history, pause
  and results (`enter()` in `src/motion.ts`) all open with a transform. A rect read mid-entry is shifted and goes
  through float32 transform math: a 144 px Garage thumbnail measured 144.00001526 in 1 of 30 runs, the paused
  Race again button 43.99998474 px, while `offsetWidth`/`offsetHeight` stayed exact. Open the Garage with
  `openGarage()` and follow pause/results/history with `await settled(<overlay locator>)` (both in
  `tests/helpers/test.js`); never loosen a pixel bound to absorb it. Enforced by the same test file
  (*overlay geometry*) for every spec that opens one of them and then calls `getBoundingClientRect`/`boundingBox`.
  An incoming-debuff card (`hit('freeze'|'emp')`, `player-hit-in` in `src/PlayerHitCenter.vue`) counts too: its
  40 px artwork measured 39.99996948 px on desktop and 40.00001526 on foldable (2026-11-22); `settled(card)` first.
- **Read the results dock's hit targets together.** Use one `evaluateAll` per poll for the sticky dock and
  sign-in button. All targets share a layout sample, and the poll can report missing controls without
  waiting on several independent locator evaluations (CI 44468157574).
- **Read a timed cue in the tick that finds it.** The halfway card lives 2.15 s of race time; on CI,
  `toBeVisible` + two `toContainText` + `locator.evaluate` outlived it and the evaluate got a detached node
  (`parentElement` null, run 44269822759). Find, read and measure a self-expiring element inside one
  `page.waitForFunction`, then assert on the returned snapshot (`race-halfway-browser.spec.js`). The per-map sweep
  repeated it and measured a zero rect on Monsoon (dx 480, CI 44395376200). Enforced by `tests/browser-timeouts.test.js`
  (*halfway card in one page tick*).
- **Poll the condition you assert, not a weaker proxy.** `expect.poll(...).not.toEqual(before)` passes on the
  first change, which can be the live loop's own HUD tick (`updateUI` runs every 0.075 s) from before your
  stepped frames were drawn; a one-shot read on the next line then judged all eight minimap markers and found
  near-grid racers on Volcanic's wide map still on the same rounded 0.01 (2 in 3 runs). Put the full assertion
  inside the poll. Enforced by the same test file (*weaker change*).
- **A spec that spawns its own server takes a free port.** The diag relay spec spawned Vite on a fixed
  `DIAG_RELAY_PORT || 5191` with `--strictPort`; when `PLAYWRIGHT_PORT` held that port, Vite exited on
  EADDRINUSE and the readiness poll accepted the preview server, which has no relay (404 instead of 403, no
  beat). Listen on port 0 for the default, poll an endpoint only your server answers, and throw when
  `server.exitCode !== null`. Enforced by the same test file (*spawns a server*).
- **Count a confirmation sound by its own moment, not by a pitch the race also plays.** In-race cues share
  confirmation pitches (a cell pickup starts at 880 Hz). The slower the runner, the longer the race drives
  before the spec teleports to the finish, so "the result chime played once" counted 4. Skip notes while
  `data-phase` is `countdown` or `racing` (it lags `sound.update` by one frame). Enforced by the same test file
  (*Web Audio notes*).
- **Count requests only from your own navigation.** `gameplayPage` has already loaded the game once (no saved
  car: the Roadster), and that page keeps fetching lazily. Trap (2026-11-17, since ba867d53): specs that
  registered `page.on('request')` and then called `page.goto` also counted the old page's late
  `roadster2.glb`, so four `crimson-gt-browser` request counts went red (`['…roadster2.glb', '…roadster2.glb']`)
  while the product requested the GLB once per load. Start counting with `watchRequests(page, pattern)` from
  `tests/helpers/gameplay-browser.js`; it leaves for `about:blank` first. Enforced by
  `tests/browser-timeouts.test.js` (*leaves the fixture page first*).
- **Seeded positions stay clear of the field.** Teleporting the player back to the first rings put
  it in the pack: rivals step first and take the ring, traffic knocks the car off it. Seed ahead of
  every car (`race.rivals`) and pass traffic with `player.effects.ghost` (game seconds).
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

## A long local run needs a checkout nobody else moves

- **Use a free preview port for local gates.** Another worktree's preview can hold port 5178.
  `make verify` and the pre-push layout gate use `scripts/free-local-port.mjs`.
  Both stages of `make verify` use the same port and honor an explicit `PLAYWRIGHT_PORT`.

- **Gameplay specs serve live source.** `tests/helpers/gameplay-browser.js` starts a Vite dev server on
  the checkout, so a file that changes mid-run (a merge, a pull, another session's edit) reloads the page
  under the test. Trap (2026-11-13): a fast-forward during `make verify` changed `src/aero-vfx.js`; the
  race in progress went back to Home and the test failed with `#race-status` "READY" instead of "RACING".
  The run log names the cause: `[vite] (client) page reload <file>`.
- Before blaming the product, grep the run log for `page reload` and compare `git reflog` times with the
  failure time. A run whose HEAD moved proves nothing about either commit: rerun it.
- Run `make verify` and other long gates on a detached worktree pinned to the commit
  (`git worktree add --detach .claude/worktrees/<name> <sha>`, then `npm ci`), and record
  `git rev-parse HEAD` before and after the run.
- A tap after a raw `page.goto` waits for Home first (`waitForHome`). The diag-relay probe tapped and then gave the 500 ms
  flush only 4.5 s: on CI's cold Vite module load and CPU WebGL the page was starved and the poll timed out (develop run
  44946255115; passed on retry, never reproduced locally). Guard: "a touch tap after a raw page load waits for Home" in
  `tests/browser-timeouts.test.js`.
- The Home wallet card closes on any scroll (`dismissOnScroll`, `src/Wave3CurrencyStrip.vue`). In a short landscape
  viewport Playwright scrolls the currency button into view before its click, and the scroll event can land after the
  click, closing the card it opened (756x265, develop run 44946255115, 4/4 locally under load). Scroll into view, wait two
  frames, then click. Guard: "a spec clicks a wallet currency only after scrolling it into view and a frame".
- The 3-2-1 is short-lived wall-clock state. `interactive-tutorial-browser.spec.js` polled `data-phase` for `countdown` after
  `click()` and saw `racing` for the whole 30 s on CI (develop run 44946255115, both attempts; 4/4 pass locally). Record the
  countdown in the page per frame (`window.__countdownFrames`) and assert it after the race starts. Guard: "a spec that
  samples the countdown in the page does not also poll the live countdown phase".
- A browser test never sweeps every track. The Garage camera sweep (`showcase-camera-views-browser.spec.js`) took 2.3 m,
  2.8 m, then 3.1 m on CI's software WebGL and hit the 180 s timeout with each new course (develop runs 44925139371 and
  44946255115). Declare one test per track; do not raise the timeout. Guard: "a showcase camera spec loops over the
  tracks outside its tests".
- Read the setting toast on the line after the action that raises it. The pill unmounts 1.8 s after it shows;
  `toggle-feedback-browser.spec.js` asserted the settled switch state first and, on a starved CI page, those checks
  outlived it (main run 44953782730, red on both attempts). Assert settled state after `expectToast`. Guard: "a spec
  reads the setting toast straight after the action that raises it".

- Upcoming is the first release tab and can have no media; historical clip and picture-viewer specs must select the release that owns the media before testing it. A read tab clears its own dot immediately; compare styling on a still-unread tab and clear every unread version before asserting the aggregate Home dot is gone (CI 45403054733).
- Arm a page-side frame recorder before Start for launch-flare assertions: countdown waves are transient, animated, and end before GO, not a static pool followed by a GO glow. Keep the GLB attachment, visibility and GPU program-count checks (CI 45403054733).

- Measured-route tracks (Stormline, Frostbite, Monsoon, Volcanic) do not have a CourseGraph runtime. For their rendered player position, use the authored road frame and the rendered/interpolated lateral pose rather than `race.course.cars` or an arbitrary distance from the centreline; keep the strict horizontal error assertion in the measured-race pose helper.

- A stationary-grid test must arm its countdown at the real START boundary, after asynchronous pack preflight. A click-time RAF watcher with a wall-clock expiry can stop before the countdown starts on CPU-only CI (run 45665976529). Retain the actual START click, phase assertion and pose comparisons; use the existing test-only capture hook, never change production countdown timing.
