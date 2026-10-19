# Gameplay depth completion

Scope: finish the five requested TODO groups using existing simulation, history, input,
rendering and telemetry. Preserve existing race controls and stored data. No dependencies.

1. **Red:** add simulation regressions for style sources, clean-section resets and finish
   stars; history regressions for durable top-three track unlocks; browser acceptance for
   History/filter/sparkline, selection/restart, gauge feedback and touch pad lifecycle.
   Run the tests before changing production code and record the actual missing behavior.
2. **Green:** extend `src/game.js` for points/stars, `src/history.js` for unlock persistence,
   `src/main.js` for History, track selection and HUD, and `src/style.css` for responsive
   layouts and reduced/comfortable motion. Reuse the existing pad implementation.
3. **Track presentation:** update `src/world.js` with per-track palettes, procedural roadside
   decoration and visible tunnel/gap/ice/wind sections. Keep counts bounded and configure
   on track changes, not every frame. Render all simulated traffic on Neon.
4. **Verify:** unit suite, production build, complete browser suite; desktop 1440×900,
   touch 390×844, 320×740 and 844×390. Compare local browser frame timing before/after;
   this does not substitute for physical-phone calibration.
5. **Close:** mark only covered TODO checkboxes, capture/inspect annotated UI screenshots,
   send photos and a zh-TW done report through the requested skills; preserve final images
   and remove only this task's temporary intermediates. Do not commit or publish.

Verification: 162 unit tests and all 78 browser tests pass; production build and diff/syntax
checks pass. Seven annotated screenshots cover the new UI. The fresh review's score-rounding
and visible-unlock findings were fixed and scored resolved. Local Coast frame cadence stays
at 16.7 ms median; physical-device/Safari/thermal acceptance remains open in `TODO.md`.
