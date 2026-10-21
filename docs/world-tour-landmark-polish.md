# World Tour — Landmark and Hyperdrive Visual Pass

This work refines the existing five World Tour tracks on `feature/world-tour-landmark-boost-polish`. It does not alter original track IDs, race lengths, localization keys, saves or default unlock behavior.

## Scenery art direction

| Course | Hero architecture | Supporting scene | Hyperdrive section (metres) |
| --- | --- | --- | --- |
| Taipei Heritage | Presidential Office inspired five-floor red brick / white stripe façade, 60 m central tower; Cheng'en Gate stone arch with double tiled roof; Taiwanese temple eaves and lanterns | Historic and contemporary city blocks, lit windows | 3120–3450 |
| Tokyo Afterdark | Orange-and-white open-lattice Tokyo Tower, two observation decks, narrow antenna; Shibuya inspired luminous commercial crossing; elevated railway with train | Neon signage/windows, road-level zebra crossing markings | 5050–5450 |
| Alpine Rail Pass | Stone mountain tunnel portal, railway and elevated train, layered snowy mountain peaks | Switchback mountains, rock spires | 3850–4200 |
| Coastal Horizon | Tapered striped lighthouse with lantern and balcony, cable bridge pylons, natural coastal arch | Exposed water plane and rock shoreline | 2950–3310 |
| Cosmic Orbit | Ringed planets with satellites, plasma gate, luminous arches | Dark cosmic sky, starfield and asteroids | 6100–6540 |

**Fidelity:** these are original, recognizable **stylized procedural models**, not exact architectural reproductions, photographs, licensed textures or photogrammetry. For a photorealistic release, replace individual landmarks with properly licensed GLB models or commissioned texture assets while keeping shared distance/placement interfaces.

Architectural references:
- Presidential Office authoritative description: https://english.president.gov.tw/Page/91 (late-Renaissance/Tatsuno red brick and white bands, 60 m central tower, cornices and arches)
- Taipei Presidential Office building materials: https://www.president.gov.tw/qrcode/08c
- Tokyo Shibuya crossing official tourism overview: https://www.gotokyo.org/en/spot/78/index.html

## Reusable implementation

- `src/world-tour-landmarks.js`: shared procedural geometry builders for landmarks. Each landmark has a distinctive arrangement but reuses blocks, columns, roof ribs, beams, lighthouses and ring primitives.
- `src/world-tour-scene.js`: the **same** rolling road renderer for all five courses; data-driven palette/prop choice; the gallery of landmarks; instanced city, rock, asteroid and window meshes; translucent segmented energy tunnels, arrows and safety rails. Quality settings reduce prop/hoop density; reduced-motion disables tunnel animation.
- `src/track-paths.js`: `trackLocalPosition()` converts canonical race-distance/lateral/altitude to 3D and is reused by VFX so pickups follow the actual elevated/curved road. This also ensures the full-course minimap still shows **only the ordinary public route**.
- `src/game.js`: each new course has exactly one nonoverlapping `boost-tunnel` section. Driving through on-road above 20 m/s (not braking or airborne) grants **3.5 s fuel-free mini boost** and **0.25 NITRO charge**, once per tunnel per race. This uses race state, not browser storage; existing NITRO cap and overflow-to-fuel behavior remain intact.
- `src/main.js`: shows HYPERDRIVE status when triggered, without changing controls or localization.

**QA:** `make dev-unlocked` to select each track; drive to landmark/booster distances in the table; test ground entry, braking, air flyover, pausing, repeat traversal, restart, all five themed palette changes, mobile/low graphics and reduced-motion. Check collectibles appear on elevated roads. The boost-tunnel types are visible in scenery, not drawn as shortcuts on the minimap.

```bash
make dev-unlocked
npm test
npm run build
npm run test:browser
```

Unit tests: `tests/world-tour-boost.test.js` and `tests/world-tour-scene.test.js`. Merge only after PR CI is green and actual desktop/mobile render screenshots are reviewed. Do not trigger the GitHub Pages release on this branch.
