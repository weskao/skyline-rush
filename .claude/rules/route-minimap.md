---
paths:
  - "src/route-map.ts"
  - "src/course-route-map.ts"
  - "src/course-minimap.ts"
  - "src/track-paths.ts"
  - "src/sky-track.ts"
  - "src/race-tracks.ts"
  - "src/course-race.ts"
  - "src/courses/*-race.ts"
  - "tests/*route-map*"
  - "tests/*minimap*"
---

# Route minimap: every gap in the road is visible

Owner request (2026-11-19): where the road surface is missing and the car must jump, the minimap
must show it. Before this, a gap was drawn as a solid road line, so the map hid the fall.

- **One source:** gap spans come from the data the physics drops the car with: classic
  `type: 'gap'` sections in `src/race-tracks.ts` (Sky Spiral's are built from `SKY_JUMPS`) and
  each course runtime's `spec.noRoad` (graph metres per edge). Never a hand-written map table.
- **Mechanism:** `routeGapPaths(trackId)` in `src/route-map.ts` builds the geometry once per
  track (cached) and `createRouteMap` appends three static, `aria-hidden` paths above the road
  and travelled trail, below every driver marker:
  `route-gap-cut` (map-background stroke over the true span, so the road line breaks),
  `route-gap-dots` (orange dotted jump across the break) and `route-gap-caps` (orange bars
  across the road at takeoff and landing). Nothing is added to `updateDrivers`.
- **Style choice:** a break with end caps, the map convention for a missing bridge span. The
  plain dash is already taken on this map (`route-flight-line` = optional flight branch,
  `route-spiral-upper` = Sky Spiral overpass), so a dash alone would read as a branch. The caps
  keep a short gap readable: Canyon's 60 m gap is about 1.6 map units, under 1 px on the
  smallest phone map, so there the two caps read as one orange crossbar.
- Strokes are `vector-effect: non-scaling-stroke` px widths in inline styles, like
  `route-elevation-cue`; the cut uses the theme's `--map-bg` (fallback `#051025`).
- **Modes:** Endless and Elimination clear every section (`prepareEndless`), so streaming maps
  draw no gap marks. Measured courses (Monsoon, Volcanic, Stormline, Frostbite) have no
  `noRoad`; their flight branches stay dashed `route-flight-line` edges. A new gap is marked
  only once the physics drops the car there.
- A new track or course with a gap needs no map code: if its gap is in `sections` or
  `noRoad`, the minimap marks it.
- **Guard:** `tests/minimap-gap-marks.test.js` asserts the inventory (Canyon 1, Sky Spiral 3,
  Dune 1, Skyfall 3), the exact start/end of every mark on the drawn route, no marks on
  gapless tracks or streaming maps, layer order, and one cached geometry per track. Browser:
  `tests/minimap-gap-marks-browser.spec.js`.
