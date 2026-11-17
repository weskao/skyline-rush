---
paths:
  - "src/style.css"
  - "src/race-lobby.css"
  - "src/track-chooser.css"
  - "src/wave3-demo-results.css"
  - "src/App.vue"
  - "tests/responsive-browser.spec.js"
  - "tests/*layout*"
---

# Portrait and landscape are two layouts; iOS WebKit paints them differently

On iPhone landscape (Chrome, 743×340, 2026-11-09) START RACE, Daily and the camera dock had
their place and took taps but were never painted. iOS WebKit clips a `position: fixed` box to
an overflow scroller when that scroller, or a `sticky` box inside it, is the box's nearest
stacking context; hit-testing ignores the clip. Desktop Chromium/WebKit and portrait on the
same phone looked fine, so neither proves anything about landscape (fix: `65b73d30`).

- **No stacking context between a fixed rail and the viewport inside a scroller.** Between
  `#start-button`, `#daily-card`, `#showcase-camera-dock` and their nearest `fixed` ancestor,
  no ancestor may be `sticky`, or positioned with a `z-index`, while it sits in an
  `overflow: auto|scroll` element. Landscape `.intro` scrolls, so it keeps `z-index: auto`; the
  pinned Garage/History/Practice row is `fixed`, not `sticky` (the panel keeps bottom padding so
  the Rules row scrolls clear).
- **No ancestor of the rail animates.** A running `opacity`/`transform` animation or transition
  makes the ancestor a stacking context for its duration, and the rail is painted into that
  clipped layer. Landscape has no arrival fade for this reason.
- **Both orientations, every time.** A change to a landscape media query
  (`(orientation: landscape)`, `max-height: 500px` / `380px`), to `.intro`, the pinned row, or
  anything `fixed`/`sticky` on the home is checked in portrait and landscape, and a new
  `fixed`/`sticky` home element is added to the paint guards in
  `tests/responsive-browser.spec.js` (743×340, 756×265, 844×390). Those guards are RED on the old
  CSS; keep them that way rather than relaxing them.
- **Reproduce on iOS before claiming fixed.** A paint bug that only WebKit on iOS shows needs an
  iOS simulator or a device in that orientation (`make phone-diag`), not a desktop viewport of
  the same size.

- **Linux CI fonts are not the phone's fonts.** A `line-height: normal` line box takes its height from the
  font: Avenir Next (macOS and iOS) gives ~22 px at 16 px, the Linux CI fallback ~18.5 px. At 750×342 and
  743×340 the paused-practice screen overflowed its 197 px overlay by 20 px and cut Resume by 0.4–2.4 px on
  Mac and iPhone fonts while every CI shard stayed green (2026-11-15). Short-landscape practice now hides the
  route label (as portrait practice and short-landscape results do) and uses 10 px overlay padding, so the
  pause screen fits without scrolling. Guard: the no-scroll check for landscape sizes in
  `tests/interactive-tutorial-browser.spec.js` (*paused practice*). Size a short-landscape overlay with slack,
  never to the pixel a CI screenshot shows.
- **Wave 3 results stay out of the landscape overlay flow.** The extra mission/result card must
  not push Race Again, Next, History or Cloud Sign in below the viewport. Keep the card
  independently bounded and preserve `tests/overlay-landscape-fit-browser.spec.js` at
  667×375, 740×360, 844×390, 932×430 and a foldable viewport; the RED regression was
  43–100px of unwanted `#race-overlay` scrolling in CI run 42811323467.

- **Wave 3 post-race rewards must not jump between coordinate systems.** `enter(.overlay-content)` animates `transform`, making `position: fixed` descendants resolve against the animated parent before snapping back to the viewport. Keep `.wave3-demo-results` in the normal `.overlay-summary` flow; short landscape uses an accessible compact summary rather than a floating toast. Protect the regression with `tests/wave3-demo-results.test.js`, `tests/wave3-demo-results-layout-browser.spec.js`, and `tests/overlay-landscape-fit-browser.spec.js`.

- **Wave 3 reward card shows every line; no height cap.** A `max-height` + `overflow` on
  `.wave3-demo-results` cut mission progress and fine print on desktop/tablet (2026-11-13). Short
  landscape has zero spare height, so the strip stays one line and a 詳情 tap raises the details as
  an absolute panel over the summary column (card is `position: relative`, never `fixed`). The tap
  listener sits on the card, not a stretched `::before` on the button: `button.is-pressed` applies
  `filter`, which makes the button the pseudo's containing block mid-tap and the click misses.
  Guard: `tests/wave3-demo-results-layout-browser.spec.js` (zh-TW, `clipped()` per viewport).
- **Desktop/tablet results scroll, never run off-screen.** The split layout
  (`min-width: 761px and min-height: 501px`) had no `overflow`, so the Wave 3 coin row pushed the
  card 45–177px past the overlay bottom at 1440×900, 1366×768 and 1024×768, where nobody could
  reach it (2026-11-14). `#race-overlay` scrolls there; a new summary row is checked at those
  sizes. Guard: the scrolled-to-end assertion in `tests/wave3-demo-results-layout-browser.spec.js`.

- **A split viewport has two coordinate spaces.** Use the normalized Viewport Segments source
  in `foldable-layout.ts` and its published variables for fixed rails and native dialogs.
  The Home and race scene spans the whole viewport. Keep feedback and controls within visible
  segments, with no tap targets across the hinge.
  Release steering, throttle and native pointer capture when rotating or changing segments.
  Custom layouts stay viewport-relative and keep their independent portrait and landscape keys.
  Guards: `tests/foldable-layout-browser.spec.js` and `tests/foldable-layout.test.js`.

- **Track selection uses the Home hero card and a dedicated dialog.** The hero keeps its route silhouette, teaser
  art, and race distance while the setup is docked clear of the car. The chooser fills narrow or short viewports
  and stays within a single usable segment on a foldable. Its list scrolls independently of the fixed confirmation
  row. Distinguish the applied track (`aria-current`) from the preview (`aria-pressed`). Confirm commits the
  preview and refreshes Home. Closing the chooser preserves the previous selection. Honor reduced motion
  and comfort mode for both the chooser and its backdrop.
  Guards: `tests/lobby-polish-browser.spec.js` and the short-landscape checks in `tests/responsive-browser.spec.js`.

- **Keep the Home hierarchy consistent across sizes.** Present the full game wordmark and wallet balances
  above the scene on phone portrait. Keep the compact setup and its primary actions below the showcased car.
  Anchor the desktop setup near the upper left, below the toolbar. Keep the release footer clear of the
  setup on desktop and portrait. Reserve a separate cell for the hero route icon so short-landscape
  thumbnail positioning cannot overlay the track name or distance.
  Check 852×393, 390×844, and 1920×975 in `tests/lobby-polish-browser.spec.js`.

- **Center the version button along the bottom of short single-screen landscapes.** Keep its 44 px
  target above the safe area and any browser toolbar. The Home action rails reserve the center gap.
  Keep the existing release-notes dialog wired to that same button. Guard both placement and taps
  in the Home version and landscape toolbar tests in `tests/responsive-browser.spec.js`.

- **Short-landscape Home keeps the wallet row distinct from the selected-track hero.** Preserve at least 6 px between
  `.home-intro-topbar` and `.lobby-race-heading` when the compact resource strip is shown; do not zero the
  topbar's bottom margin. Guard 345×206, 667×375, 743×340 and 852×393 in `tests/lobby-polish-browser.spec.js`.

- **Home displays the track at its original brightness.** Keep the viewport-wide shade out of the ready phase,
  including the concept-image fallback. Any contrast treatment belongs to the controls that need it.
  Animate the Start highlight inside the button's own bounds so moving to or from the landscape rail cannot
  move the highlight outside the button. Both behaviors are covered in `tests/lobby-polish-browser.spec.js`.
