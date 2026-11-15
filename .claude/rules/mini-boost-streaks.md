---
paths:
  - "src/mini-boost-streaks.js"
  - "src/mini-boost-cue.ts"
  - "src/pickup-collect-streaks.js"
  - "src/drive-rules.ts"
  - "tests/mini-boost-streaks.test.js"
  - "tests/mini-boost-streaks-browser.spec.js"
---

# Mini-boost start cue (rear streaks)

Every mini-boost (`car.miniBoost`) starts with one 0.8 s play of two camera-facing ribbon bundles behind the
rear wheels, stretching back up to ~8.6 m in the fitted car frame (`src/mini-boost-streaks.js`).

- **One way in.** Drift release, slipstream ring, boost tunnel and chain landing all grant through
  `grantMiniBoost` (`src/drive-rules.ts`), which records `car.miniBoostEvent`. A new source that sets
  `car.miniBoost` directly gets no cue; route it through `grantMiniBoost`.
- **One play per boost** (`stepMiniBoostCue`, `src/mini-boost-cue.ts`): a play starts when the boost was empty
  or the previous play has ended. Chained slipstream rings refresh the boost but never restart a running play.
  Player only; no play while braking.
- **Colour:** a drift release uses its tier colour (`driftColors`, `src/effects.js`); every other source uses
  one neutral whitish cyan. Never plain orange, which crash impacts use.
- **No sustained layer here.** The exhaust/airflow shown while `miniBoost > 0` belongs to `src/aero-vfx.js`.
- **Rooted at the wheels (±1 m), not the exhausts.** The chase camera sits behind the car, so ribbons that
  start at the exhausts run down the screen inside aero-vfx's boost plumes and stay invisible (first tuning,
  2026-11-16). Judge visibility by A/B frames of one frozen race state (`composer.render()` with the mesh on,
  then off); a frozen rAF loop does not re-render by itself.
- **Quality:** High 8 lines, Medium 4, Low none; none under Reduced Motion or with effects disabled.
- **The energy can stays streak-free** (`pickup-body-sweep.md` § Energy can contact spark). The cue shares
  only the ribbon mesh (`createStreakRibbons`, `src/pickup-collect-streaks.js`) with the electric cell.

Guards: `tests/mini-boost-streaks.test.js` (sources, once-per-boost, geometry, colour, quality tiers, wiring),
`tests/mini-boost-streaks-browser.spec.js` (real WebGL tunnel and chain landing on desktop, phone portrait and
landscape; no shader compiled mid-race).
