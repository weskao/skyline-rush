# Skyline Rush World Tour: Five Tracks, Minimap, and Track-Name Localization

**Date:** 2026-10-21
**Status:** Design specification for user review — implementation not yet authorized
**Base:** `main` at `ec9f9ca2ffb0cd8a720e5f25775d4ee22c2e2a55`
**Feature branch:** `feature/world-tour-tracks-minimap-i18n`

## 1. Intent, scope, and acceptance criteria

Build on the existing Vue 3 / Vite / Three.js racing game without breaking the original five playable courses, racing physics, achievements, ghosts, controls, or save files.

1. Add **five unique, drivable courses, each 5–8 km**, with recognizable themed scenery and terrain. The requested locations are artistic interpretations, not GPS-accurate road networks.
2. Add a compact **whole-main-route map** to every course card on the home screen (all ten courses) and an in-race minimap that plots the player and all three rival drivers at their current race distances.
3. The minimap must **never disclose secret or flying-shortcut corridor geometry**. Display only the ordinary navigable main route; drivers taking a shortcut are projected onto the public main-route centreline at their current longitudinal progress.
4. Localize **course names only** to English (`en`) and Traditional Chinese (`zh-TW`). Other text stays in English, but localization data organization must allow future UI fields without changing storage identifiers.
5. Preserve the existing `make dev-unlocked` flow and all existing saved progression; do not ship development-only unlock modules to production.
6. After implementation, produce authentic **desktop and mobile browser screenshots** of each new course and minimap, and include at least one route/design image. Concept mockups must be clearly identified and must not be passed off as running-game screenshots.

### Course catalog

| Immutable ID | English display | Traditional Chinese | Length | Theme and hero landmarks |
| --- | --- | --- | ---: | --- |
| coast | Coast | 海岸公路 | 5.0 km | Existing dusk coast |
| neon | Neon Downtown | 霓虹都會 | 4.0 km | Existing rainy downtown |
| canyon | Canyon Skyway | 峽谷天橋 | 6.0 km | Existing bridge gaps |
| aurora | Aurora Pass | 極光山道 | 5.5 km | Existing snowy road |
| spiral | Sky Spiral | 天際螺旋 | 5.6 km | Existing helix city |
| taipei | Taipei Heritage | 台北古都 | 6.2 km | Presidential Office Building-inspired façade, North Gate-inspired city gate, temple alleys, urban boulevards |
| tokyo | Tokyo Afterdark | 東京夜行 | 6.8 km | Shibuya-style crossing, Tokyo Tower-inspired silhouette, elevated rail lines, neon canyons |
| alpine | Alpine Rail Pass | 山岳鐵道 | 7.6 km | Hairpin mountain road, carved cliff tunnels, stone viaducts, parallel railway with passing train |
| coastal | Coastal Horizon | 海岸天際 | 5.8 km | Sea cliffs, lighthouse, coastal arch, causeway, ocean-side bridges |
| cosmic | Cosmic Orbit | 星際軌道 | 8.0 km | Nebula sky, large planets, asteroid silhouettes, luminous suspended space highway |

Landmark models are low-poly / procedural visual interpretations with original game artwork, not texture scraping, copyrighted branding, or promised 1:1 reconstructions. Railway scenery must not intersect the drivable surface unless a crossing is implemented and tested.

## 2. Architecture and module boundaries

### 2.1 Course definitions remain the single catalog

Retain `RACE_TRACKS` in `src/game.js` with **stable IDs, immutable English `name` values, length, seeds, traffic and section data**. Add the five new definitions after the original five so prior unlock and history semantics continue unchanged. New courses should reuse normal section types where possible (`tunnel`, `crosswind`, `gap`, `uphill`, `shortcut`) rather than creating untested gameplay rules. Define exactly one optional flight-only shortcut corridor for each new track; do not draw its shortcut shape in the minimap.

### 2.2 Shared main-route coordinates

Add a small, pure, deterministic, dependency-light `src/track-paths.js` API:
- `trackPoint(trackId, distance)` → continuous main-route world-coordinate point `{ x, y, z }`.
- `trackFrame(trackId, distance)` → tangent/right/up vectors for placing cars, props, road surface and camera.
- `trackOverview(trackId, count = 128)` → ordered 2D sample array on the horizontal map plane, normalized for drawing, with distance fractions.

**Important:** The selected physical road and the overview must both sample the **same route function**, not independent invented artwork. Existing `coast`, `neon`, `canyon`, `aurora` should initially preserve their current sinusoidal `roadCenter(distance)` path and flat surface. Existing `spiral` should call the `skyPoint/skyFrame` functions in `src/sky-track.js`; convert its projected X/Z into a 2D overview. The five new courses get distinct handcrafted parameterized curve/spline profiles and optional elevation, all preserving continuity (no teleporting, tight discontinuities or road self-crossings that confuse driving). The race remains an open sprint (start and finish), not a closed circuit, unless explicitly specified later.

Handle elevation and banking consistently in camera, collision/landing, roadside structures, effects and AI positioning. If reusing the existing flat road implementation cannot represent required geometry, extract the smallest useful path/road placement adapter rather than copy-pasting `src/world.js` five times. Reuse instanced geometry, materials and quality settings; keep draw-call and update budgets suitable for mobile.

### 2.3 Theme scene assembly

Add **one reusable theme scene module** (or small modules only where necessary) that consumes a theme configuration for colors, weather, common building profiles, prop density and landmark placements. Each course config specifies a short list of unique hero landmarks and coordinates **by race distance and roadside offset**; placement resolves through the shared track-frame API.

Reuse procedural mesh primitives and `InstancedMesh` for repeated buildings, lighting, trees, coastal barriers, rock faces, pillars, railway props, etc. Keep spectacular scenery recognizable from the driving camera rather than filling every metre with costly detail. Honor the existing low/medium/high-quality and reduced-motion options.

## 3. Route-map component

### 3.1 Single source and presentation

Implement one reusable route-map view / drawing helper, preferably **SVG generated from normalized samples**, to avoid a second Three.js renderer or an extra graphics dependency.

- **Home screen:** a small full-course preview drawn for **every available track button**, including locked tracks. The visible layout continues using the current responsive `.track-select` scroll region. A larger selected-route overview may appear alongside the selection details if it remains legible on mobile.
- **Race HUD:** a compact fixed-area overview with start/end indicators and **four distinct driver markers** (`YOU`, `NOVA`, `ORBIT`, `APEX`). Update marker transforms using each actor's actual `distance / race.length` every frame or at a bounded cadence; don't recompute 128 route samples per frame.
- **Projection:** Map each driver's distance onto the cached main-route sample/polyline, clamped to [0, track.length], including when airborne or using a shortcut. Map displays no hidden paths, shortcuts, or secret corridor markings.
- All ten overviews are distinct enough for users to visually differentiate courses. Aspect ratio normalization preserves route shape. For long, nearly straight tracks, a reasonable consistent horizontal exaggeration is permissible **only as a presentational transform** of the sampled real geometry, not fabricated turns.
- Maintain readable contrast, accessible labels, a non-color distinction for YOU, sensible `aria-label` for the map region, and an unobtrusive compact mobile layout.
- Race HUD must not obscure touch throttle, steer, brake, BOOST, FLY or NITRO controls.

### 3.2 Data flow

`RACE_TRACKS (IDs + length)` → `trackPoint/trackOverview` → `shared route-map renderer`
`race.player.distance + race.rivals[].distance` → `distance interpolator` → `live marker positions`

Existing ghost, traffic and AI simulation are not rewritten; only the main four competitors are mapped.

## 4. Localization scope

Add `src/i18n.js` (or equivalently small module) containing:
- `SUPPORTED_LOCALES = ['en', 'zh-TW']`
- A `MESSAGES` catalog keyed by locale and track ID: e.g. `MESSAGES['zh-TW'].tracks.taipei = '台北古都'`.
- `trackName(trackId, locale)` with graceful fallback to `en` and then immutable `RACE_TRACKS[trackId].name` if needed.
- A stable `loadLocale()/saveLocale()` preference with validation and safe storage handling; no session requirement and no modification of track IDs.

Default to `en` unless a previously saved supported locale exists. Add a compact `EN / 繁體中文` toggle on the home screen that updates rendered course names without a full page reload. Use the same formatter in **track cards, selected-route heading, history track selector, daily challenge track references, results/overlay, ghost status and user-facing track labels**, while leaving generic copy/notes/tooltips in English for now. Ensure switching the language never changes `race.trackId`, history keys, saved ghosts, daily records or unlocks.

Prepare other localization groups as *optional naming slots* or a thin hierarchical shape, but do not translate buttons, HUD labels, sounds, descriptions or other strings in this iteration. Preserve internationalized UTF-8 rendering and a font stack supporting CJK glyphs.

## 5. UI and experience details

- Keep the original styling rhythm; upgrade the home track strip to show a legible route silhouette in each track card without crowding ten cards on small screens.
- Give each new track its own scene palette and map accent; do not rely on only gradients or palette swaps to imply landmark identity.
- During the race, keep the overview visible in a small HUD pocket with live racer dots; make the selected track's course silhouette stable throughout the session rather than scrolling with the camera.
- Course length, race position, result board and controls must remain correct for 5–8 km.
- Avoid expensive per-frame DOM rebuilding: update only marker coordinates or SVG attributes.

## 6. Tests, screenshots, and boundaries

Required verification:
1. Unit tests assert original 5 tracks stay stable, exactly 5 new definitions of 5–8 km exist, all IDs have two localized names and unknown locale fallback works.
2. Route-sampling tests check finite points, smooth continuity, enough distinct silhouettes, stable deterministic shape and normalized endpoints, no shortcut geometry in public output.
3. Race tests for every new track cover creation, sections, seeded repeatability, unlocking and checkpoint/gap logic.
4. Browser tests (desktop + mobile) verify language switching updates all course-name surfaces, route previews are present for every course, four marker positions respond to changing race distances, and controls stay usable.
5. Run `npm test`, `npm run build`, `npm run test:browser`; review GitHub Actions checks and report any failures.
6. Capture screenshots from **the running feature-branch game** (home selector, each of five new scenes, in-race minimap, mobile display) via browser automation. Label concept renders as concept only. Save approved screenshots in `artifacts/` and link them.

No change to default `main` or GitHub Pages release until explicit merge/deploy approval. Preserve `CLAUDE.md` build-time unlock separation. Avoid unrelated dependencies, client-side payment entitlements or reworking the audio system.

## 7. Sequencing

1. Introduce pure route path/overview functions and tests, preserving existing tracks.
2. Add SVG overview + interactive live driver markers and browser tests.
3. Add track-name localization and EN/繁體中文 UI, with fallback tests.
4. Add five course definitions and a reusable theme-scene system, one course at a time with regression checks.
5. Polish desktop/mobile experience, screenshots, documentation (README in both languages), automated verification and PR review.

**User approval checkpoint:** This specification describes the approved concept plus newly requested name localization. Ask the user to review the written spec before producing the implementation plan or modifying product code.
