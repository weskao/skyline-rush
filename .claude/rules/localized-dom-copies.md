---
paths:
  - "src/route-map.ts"
  - "src/race-lobby-ui.ts"
  - "src/race-select-ui.ts"
  - "src/main.js"
  - "tests/route-map-locale-browser.spec.js"
---
# A cloned localized element is relabelled by whoever cloned it

Trap (2026-11-18): after a live language switch the Home hero map kept "Full Coast main route" in
zh-TW (and 海岸公路完整主要路線 in en). `copyRouteMap()` in `src/race-lobby-ui.ts` puts a
`cloneNode(true)` of a track card's `svg.route-overview` into `#lobby-hero-map` and
`#track-choose-map`. `createRouteMap().relabel()` updates only the element it created, and
`applyLocale()` in `src/main.js` re-copies the hero (`showTracks()` → `renderLobbyTrackArt`)
*before* `relabelRouteMaps()`, so the copy took the old label and nothing reached it again.

- **Mechanism:** `relabelRouteMaps()` (`src/race-select-ui.ts`) ends with
  `refreshCopiedRouteMaps()`, which copies every map slot again from its relabelled source
  card. The result no longer depends on the order of calls in `applyLocale()`.
- A new place that shows a copy of a route map (or of any element that localizes itself through
  its own `relabel()`) adds its slot to `refreshCopiedRouteMaps()`, or creates its own map with
  `createRouteMap()` and registers it for relabelling. A copy nobody refreshes stays in the
  language it was copied in.
- **Guard:** `tests/route-map-locale-browser.spec.js` checks that every `svg.route-overview` in
  the DOM, hidden copies included, is in the new language after en → zh-TW and zh-TW → en
  switches. It fails on the old code with `lobby-hero-map: …`. The full flow in
  `tests/i18n-browser.spec.js` (`after-switch-to-*`) checks only visible elements.
