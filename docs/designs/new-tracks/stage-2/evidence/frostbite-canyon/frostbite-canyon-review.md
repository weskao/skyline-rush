# frostbite-canyon real-WebGL visual review

**Status:** agent review only — **not signed off**. Human visual sign-off is still required.
**Game commit for these frames:** `5c34bbd5` (scene code unchanged since); captured 2026-11-03.
**How to reproduce:** `FROSTBITE_CAPTURE_DIR=<dir> npx playwright test --config=playwright.world-tour.config.js tests/frostbite-canyon-browser.spec.js`
(dev server; the Stage 2 gate is compiled only into dev / `VITE_STAGE2_PREVIEW=1` builds).

| Frame | File | Shot | Route frame | Camera | Tier / device profile | Viewport |
| --- | --- | --- | --- | --- | --- | --- |
| P01 ground | `p01-1440x900-medium.jpg` | `p01` | `riverbed-hairpin` @ L−330 m | shared home drive pose, 50° FOV | Medium (CI profile 4 cores / 8 GiB) | 1440×900 |
| P01 phone | `p01-390x844-medium.jpg` | `p01` | same | portrait drive pose | Medium | 390×844 |
| P01 Reduced Motion | `p01-reduced-motion-1440x900-medium.jpg` | `p01` | same | same, time frozen | Medium | 1440×900 |
| P02 flight | `p02-1440x900-medium.jpg` | `p02` | `rift-flight` @ 380 m (y≈97 m, bridge deck ≈23 m below) | authored flight chase pose (side 14, back 30, height 13), 50° FOV | Medium | 1440×900 |
| P02 phone | `p02-390x844-medium.jpg` | `p02` | same | same pose (no portrait variant) | Medium | 390×844 |
| Cover | `public/track-teasers/frostbite-canyon.jpg` | `p01` | same as P01 | home drive pose | High (auto) | 2280×822 native (3× of the 760×274 CSS fallback hero) |

Weather seed: `FROSTBITE_SEED = 0x0f2057`, stream `frostbite-home`. References: `../../source-concept-jpeg/frostbite-canyon/concept-view-01.jpg`, `concept-view-02.jpg`.

## View 01 (ground) vs `concept-view-01.jpg`

| # | Category | Result | Notes |
| --- | --- | --- | --- |
| 1 | Main silhouette / landmark | PASS | Faceted cyan crystal cluster on the left, large rock arch on the right on the outside of the left-hand bend, glacier walls both sides. |
| 2 | Terrain and road geometry | PASS | Curved ice road from the real CourseGraph; carved canyon walls; road never buried (unit test: 0/3035 samples). |
| 3 | Car size / camera composition | PROPOSED DEVIATION | Shared 50° home pose and real Roadster/rivals. Reference car is black; ours uses the equipped paint (pearl by default). Desktop: car mid-left, not lower-left. Phone portrait (2026-11-04): Frostbite's own portrait pose frames the whole car above the home panel (AIRFLOW off) or below the telemetry card (AIRFLOW on); unit-checked projected body bounds. The shared Stage 1 portrait pose still hides/crops the car on the other cards — shared follow-up. |
| 4 | Weather / materials / lighting | PROPOSED DEVIATION | Teal aurora curtains, snowfall, cold fog present. 2026-11-04: magenta upper band now glows above the walls (upper-band glow + magenta high colours; measured magenta share of the upper half 0.0006 → 0.011); the arch wears a pale ice crust over its face with dark rock only underneath (front rays 28/28 pale). Remaining: crystals are semi-transparent emissive, not refractive. |
| 5 | Branch / landing visibility | N/A for P01 | Fork is beyond this frame (see P02). |
| 6 | No clipping / invisible walls | PASS | No invisible walls; arch legs clear of the driving line (unit test). |

## View 02 (aerial) vs `concept-view-02.jpg`

| # | Category | Result | Notes |
| --- | --- | --- | --- |
| 1 | Main silhouette / landmark | PASS | Long elevated deck crossing diagonally over a deep cobalt crevasse, as in the reference. |
| 2 | Terrain and road geometry | PASS | Sheer blue ice/rock cliffs ≈145 m below the deck; bridge connects to the approach and the merge road. |
| 3 | Car size / camera composition | PROPOSED DEVIATION | Car is airborne on the authored `rift-flight` edge; camera is a higher flight-layer chase (not the home pose) so the span reads. 2026-11-04: with AIRFLOW on, P02 re-anchors onto the raced `rift-ice-bridge` deck (car rests on the real deck, unit raycast); portrait poses for AIRFLOW off/on. |
| 4 | Weather / materials / lighting | PROPOSED DEVIATION | Frosted deck, dark fascia, warm orange safety markers, icicles and snow present; 2026-11-04: soft drifting chasm mist sheets under the deck (still under Reduced Motion), also in the race Rift beside the lower road. |
| 5 | Branch / landing visibility | PASS (partial) | Landing chevrons and merge road visible ahead. The lower canyon road passes under the deck and is not visible from this pose. |
| 6 | No clipping / invisible walls | PASS | Visible rails and posts; rails are visual only (no collision runtime yet). |

## Performance (preview only, not racing)

Headless Chrome on an Apple M4 (ANGLE Metal), 1440×900, 300 rAF intervals after a 3 s warm-up:
Frostbite P01/P02 p50 16.7 ms (vsync-locked) on Medium and High; occasional 33 ms p95 also appears on the Stage 1
Dune Tempest baseline. Scene build ≈40 ms (Node, warm); 34 renderable objects, ≈51.6k triangles. Low-end GPU,
iPhone and Android device measurements: **not done**.

## Not proven here

Race runtime (physics on the graph, AI, checkpoints in play, HUD/minimap, results, Ghost), 20+ timed finishes,
real-device QA, human sign-off.
