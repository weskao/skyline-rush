# Tokyo Afterdark — dual Hyperdrive charge strips (2026-11-21)

## Intent and limits
Give Tokyo's 10 km nighttime route two visually readable powered-road sections rather than a single short one. Balance is important: not a full-lap fast charger, not a new pickup type, no changes to other tracks' mechanics.

## Chosen implementation
- Section A: **4880–5520 m** (640 m), adapting the existing central underpass.
- Section B: **8220–8900 m** (680 m), extending the existing late Hyperdrive section.
- 2700 m gap after sector A; total powered length = **1320 m / 10 km (13.2%)**.
- While on either Tokyo section at >=20 m/s and effectively on road, gain **+4 fuel/s**. BOOST still drains **10 fuel/s**, so charging offsets only 40% of that spend.
- Existing one-time-per-section reward persists: **3.5 s mini BOOST** and **0.25 NITRO**; at most two claims per race.
- Tokyo record layout advances to **5** (new speed opportunities make prior timed records incomparable). Older records are preserved; Firestore best-ID allowlist includes `tokyo@5`.

## Visual and UI
- Retro-futuristic low-glare cyan/magenta side charging rails, softly colored entrance arches and overhead trim; no solid obstruction in the road centre.
- Existing pooled World Tour tunnel geometry and camera-relative scene renderer remain shared. Select the sector close to the driver, not `sections.find`'s first sector; ensure both work on low/high graphics and with reduced motion.
- HUD fuel-caption shows a short translated powered-road message; fuel meter uses subtle static cyan feedback, rather than a screen-centre pop-up.

## Verification and regression gates
`tests/world-tour-boost.test.js`: section spacing, grounded recharge vs parked/airborne, single payouts. `tests/world-tour-scene.test.js`: both energy tunnels and quality tiers; `tests/record-layout.test.js`: historical record IDs and new layout.

Run `npm run typecheck`, `node --test tests/world-tour-boost.test.js tests/world-tour-scene.test.js tests/record-layout.test.js tests/module-size.test.js`, `npm test`, and `npm run build`. Check actual Tokyo WebGL frames at desktop, phone landscape, and low graphics before merging. This is a feature branch; do not publish GitHub Pages.
