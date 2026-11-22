---
paths:
  - "src/touch-sprint-buttons.css"
  - "src/sprint-ready-feedback.ts"
  - "src/sprint-tier-hud.ts"
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
- **One sprint ladder, one look per tier.** With BOOST held during NITRO the speed caption said
  BOOST ENGAGED while the flight state said NITRO ACTIVE, and both buttons burned the same
  full-height flame on the same 0.7 s loop, so BOOST, NITRO, both and a x3 chain looked alike.
  `src/sprint-tier-hud.ts` is the HUD's only reading of `sprintTier()` (`src/sprint-tier.ts`): it
  writes `body[data-sprint-tier]` (the tier id, racing only) and `body[data-sprint-chain]` (2 or 3)
  on change and returns the one caption every HUD line shows (`hud.tier.<id>`, `hud.tierChain.<id>`
  in `src/locales/nitro-hud.ts`). Each tier is one `body[data-sprint-tier="<id>"]` rule in
  `style.css` setting `--tier-lift`, `--tier-loop`, `--tier-glow`, `--tier-core`, `--tier-rim`; the
  buttons and HUD lines consume those variables and name no tier. A new tier is that rule plus its
  caption key: no branch in `race-hud.ts`, no tier id in `touch-sprint-buttons.css`.
  - `--flame-rest` stays the per-state flame size; the tier scales beside it through
    `--flame-lift`. Combined tier times x3 chain stays at or below 1.05: taller covers the NITRO
    meter in landscape and the mode panel in portrait.
  - The button glow and the caption colours are static, so the ladder still reads with the flame
    off (Reduced Motion, Comfortable, HUD animation off, Low graphics). Forced colours drops both.
  - The combined tier is NITRO gold at the core and BOOST red-orange at the rim, from the tokens.
    The charge bar keeps draining in the BOOST colour: it is information.
  - Guard: `tests/sprint-tier-hud.test.js`. Real frames: `tests/sprint-tier-hud-capture-browser.spec.js`
    (`SPRINT_TIER_HUD_CAPTURE=1`).
- **AUTO on hides GAS and widens NITRO** (last block of `touch-sprint-buttons.css`). Traps found building it:
  - `buttons` steering caps every button at `--compact-key-width`, so the wide NITRO needs `max-width: none`.
  - The flame box is relative to the padding box (1px borders sit outside): `--cell` is one button minus 2px.
  - **The fire follows the width at one button's flame size, never a twin or a stretched mask.** Two flames side by
    side showed a dip and two fires in the centre; one centred flame left the wide button's ends bare; stretching the
    strip mask doubles every tongue. The wide NITRO shows the centred flame plus two `.sprint-ready-flank` copies
    (`data-side="start"`/`"end"`, anchored to each end, phase-offset by a third of `--flame-loop`), so the three read
    as one fire. Flanks are `display: none` except under AUTO, and that show rule sits inside the
    `prefers-reduced-motion: no-preference` / `forced-colors: none` media so it never outranks the flame-off rule.
    Flanks have no ring (`::after` `content: none`); the one ring hugs the wide button. `sprint-ready-feedback.ts`
    bursts every `.sprint-ready-effect` (`querySelectorAll`). Cost: three masked layers instead of one, AUTO only.
  - Hiding is `visibility: hidden` (layout and `offsetWidth` stay). A spec that reads or presses GAS starts with
    AUTO off (`skyline-rush-auto` = `off`), never with a weaker assertion.
  - Guards: `tests/touch-gas-auto-layout.test.js`, `tests/touch-gas-auto-layout-browser.spec.js`. The tutorial
    exclusion is a `shortcut:` comment to remove when `feature/tutorial-auto-lesson` lands.
- Visual changes here need real frames on a phone, portrait and landscape: the unit guard checks
  colours, not layout, Reduced Motion or touch opacity.
