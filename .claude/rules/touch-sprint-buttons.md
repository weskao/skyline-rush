---
paths:
  - "src/touch-sprint-buttons.css"
  - "src/sprint-ready-feedback.ts"
  - "tests/touch-sprint-bezel.test.js"
---

# Touch thumb buttons (GAS, BRAKE, NITRO, BOOST): bezel and readiness looks

- **Vanishing edge.** The rim is a 148° gradient on `::before`. Every stop must derive from the
  state's `--rim` (lighter or darker `color-mix`), never a fixed colour: a fixed `#162035` stop was
  near the button faces and the road (contrast 1.02–1.18), so the right, bottom and lower-right
  chamfer edges disappeared on all four buttons at every size and DPR. Guard:
  `tests/touch-sprint-bezel.test.js` (every rim stop ≥ 1.6:1 against each state's face and the road).
- **Not pressable yet.** NITRO `charging` shows progress: a muted bezel and a gold fill to
  `--charge` (0..1, floored to 2% steps by `nitroFill`, written by `sprint-ready-feedback.ts` only
  when the step changes, never per frame). BOOST `charging` (empty tank) has no progress because any
  refuel makes it ready at once (`game.js`); it is a dim red-orange, distinct from braking grey.
- **Colours come from tokens.** NITRO gold, BOOST red-orange and FLY cyan are the `--nitro*`,
  `--boost*`, `--fly*` tokens on `:root` in `style.css`; states derive from them with `color-mix`,
  only neutral greys stay literal. The meter, charge bar, key hints and the 3D NITRO trail
  (`aero-vfx.js`) use the same values. Guard: `tests/sprint-color-tokens.test.js`.
- Visual changes here need real frames on a phone, portrait and landscape: the unit guard checks
  colours, not layout, Reduced Motion or touch opacity.
