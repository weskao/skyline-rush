---
paths:
  - "src/garage-ui.ts"
  - "src/upcoming-showcase.ts"
  - "src/car-bounds.ts"
  - "tests/coming-soon-views-browser.spec.js"
  - "tests/garage-home-framing.test.js"
---

# Garage Home framing is measured from the camera that draws it

`#garage-preview[data-car-in-frame]` and `data-car-bounds` come from `inspectGarageStudio()` in `src/world.js`.

- Project the car through the **camera's own pose** (`camera.getWorldDirection`), never through `smoothLook`.
  `smoothLook` belongs to the classic Home path. A Coming Soon track sets its camera in
  `src/upcoming-showcase.ts`, so `smoothLook` stayed stale there and the marker followed timing: 19 to 24 of 24
  `coming-soon-views-browser` cases failed under `CI=1 --workers=12`, and stormline and monsoon failed on main
  (CI 44925164077, 2026-11-21). The stale read had also hidden a real defect.
- Measure **the car the stage draws**. `createCarBounds` defaults to the classic `player` group; a Coming Soon
  track draws `upcomingStage.modelHost.car`, so `inspectGarageStudio()` passes that host (and skips its `keep`
  airflow group). The classic car sat 2.4 m off to the side, so stormline Rear failed on a lone idle runner
  (2026-11-22), and every "timing flake" before it was this.
- The Garage has no home panel beside the car. Landscape Home aims 4 m left of the car to leave room for that
  panel, which clipped the car at the right edge of the Garage canvas on Dune, Frostbite and the rest
  (phone Rear view, desktop Front view). Centre the camera whenever the Garage preview is active, as the classic
  path does with `garageHomePreview` (`world.js`).
- A showcase view change moves the camera, so the Garage clears and re-samples the marker on every `data-view`
  change. A one-shot sample at open time reported the first view's framing for all six.

Guards: `tests/garage-home-framing.test.js` (source), `tests/coming-soon-views-browser.spec.js` (real WebGL, all six
tracks, six views, 1440 and 390). Stress it with
`CI=1 pnpm exec playwright test tests/coming-soon-views-browser.spec.js --retries=0 --workers=12 --repeat-each=2`.
