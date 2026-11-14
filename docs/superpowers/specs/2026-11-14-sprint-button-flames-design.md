# Sprint button flames: flipbook fire, four-button palette, ignition cues

Status: approved by the user 2026-11-14. Branch `feature/nitro-boost-touch-buttons`, on top of `5d94cda8`.

## Intent

The readiness effect from `5d94cda8` is a 0.93 s jagged mask with a sliding gradient, at most 8 px
outside the button. Its outline never changes, so it reads as a flash, not as fire. The player wants
NITRO and BOOST to look like they are burning, with fire that wraps and rises beyond the button, and
wants the palette, state colours, full-charge animation and cue sounds of the right-thumb cluster
(NITRO / GAS / BOOST / FLY) tuned as one set.

## Goals

- NITRO and BOOST show fire whose silhouette changes frame to frame and that visibly leaves the
  button on the top and both sides.
- Reaching readiness plays an ignition burst, then settles into a low sustained flame until the
  ability is used. Using it raises the flame to a full blaze.
- NITRO, GAS, BOOST and FLY share one bezel language with four distinct hues and clear
  idle / ready / active / disabled colours.
- The two readiness sounds gain an ignition character and stay distinguishable from each other.

## Non-goals / anti-goals

- No change to hitboxes (still at least 44 px, whole rectangle), layout, drag-to-move editing,
  input handling, or NITRO / BOOST / FLY rules.
- No fire on GAS or FLY: neither has a "charged" moment. They get colour and state styling only.
- No continuous colour ramp tied to the charge value; the NITRO meter already shows charge.
- No new audio assets and no synthesizer change: the cues stay note tables in
  `src/feedback-sounds.ts`. A noise-based whoosh would need a synth change and is left out.
- Anti-goals: per-frame JavaScript for the fire; flames that cover a neighbouring button's icon or
  label; flames that intercept touches; a measurable frame-time regression on the Low tier.

## Approaches considered

| Option | Look | Race-time cost | Verdict |
| --- | --- | --- | --- |
| **Flipbook strip (picked by the user)** | Real changing silhouette, tintable per button | No JS; one small repaint per flipbook step | Picked |
| Layered CSS tongues | Stylised, close to today's look | Compositor only | Too close to what is being replaced |
| Real-time canvas fire | Most alive, follows charge continuously | JS every frame beside WebGL | Rejected for the hot path |
| SVG turbulence filter | Good | Heavy on iOS Safari | Rejected |

## Design

### Flame asset

- `scripts/generate-sprint-flame.py` (Pillow only, seeded, deterministic) writes
  `src/sprint-flame-strip.webp`: 16 frames in one row, each 288 × 384 px (3x of a 96 × 128 CSS box),
  alpha-only artwork, at most 150 KB. Fire = tileable noise scrolled upward by one full period over
  the 16 frames (so the loop is seamless), multiplied by a body-shaped falloff and thresholded
  softly. Left, right and top edges of every frame are fully transparent.
- The strip is a CSS `mask` over a heat gradient (`--flame-core` → `--flame-tip` → `--flame` →
  `--flame-edge`), so one asset serves both buttons and any future hue.
- Played with `mask-position` and `steps(16, jump-none)`. It replaces `src/sprint-ready-flame.svg`,
  which is deleted.

### Placement and layering

- `.sprint-ready-effect` stays the one flame element, behind the bezel (`z-index: -3`),
  `pointer-events: none`. Its box grows to roughly 60 % of the button height above the button, about
  12 px past each side and a few px below; exact numbers are the builder's, bounded by "inside the
  viewport at 390 × 844, 844 × 390 and 568 × 320".
- BOOST sits under NITRO and beside FLY; NITRO sits beside GAS. Stacking order is BOOST below NITRO
  below FLY and GAS, so a flame passes behind its neighbours and never over their icon or label.

### States

| State | NITRO | BOOST |
| --- | --- | --- |
| charging / disabled | No flame, dimmed cool face | No flame, grey face |
| readiness cue (one shot, ~0.9 s) | Burst: flame overshoots to full height, shock ring expands and fades | Same |
| ready (sustained) | Low flame, about half height | Low embers at the base |
| active / held | Full blaze, faster flipbook, white-hot core | Same |

- The sustained flame is CSS, driven by the existing `data-nitro-state` / `data-boost-state` plus one
  new gate attribute on the button. `sprint-ready-feedback.ts` writes the gate only when the state or
  the `motion` flag changes, reading the HUD animation preference at that moment, never per frame.
- The one-shot burst and shock ring stay Web Animations calls made at the cue, as today.
- Reduced motion, forced colours, HUD animation off and the calm / comfort motion flag all remove the
  flame; the state colours still tell ready from charging.

### Palette

| Button | Hue | Notes |
| --- | --- | --- |
| NITRO | Violet, flame violet → white | Unchanged family, stronger ready / active contrast |
| BOOST | Amber-orange, flame red-orange → yellow-white | Unchanged family |
| FLY | Cyan | Gains the shared chamfered bezel; held = bright cyan; disabled keeps grey + lock |
| GAS | Green (was coral) | Gains the shared bezel; held = brighter face |

State colours cross-fade over about 0.2 s through registered colour properties; browsers without
`@property` switch instantly. The settings preview keys follow the same hues.

### Sound

`nitro-ready` and `boost-ready` are rewritten as three layers each (low thump, rising sweep, bright
tail) within today's gain and length range. NITRO stays high and electric, BOOST low and combustive.
One cue per readiness, the 0.33 s stagger and the HUD sound preference are unchanged.

## Decisions (user, 2026-11-14)

1. GAS turns green, so the cluster reads violet / amber / cyan / green. The settings preview follows.
2. BOOST counts as ready whenever any fuel is left, which is most of a race, so its sustained flame
   is only low embers at the base. The burst plays when it becomes ready again after running dry,
   and holding BOOST gives the full blaze.

## Acceptance criteria

1. Browser, three viewports above, NITRO ready: the flame box clears the button top by at least
   40 % of its height and each side by at least 8 px, stays in the viewport, and its mask position
   differs between two samples.
2. Hit targets at least 44 px; a point inside the flame overlap on a neighbour hits the neighbour.
3. charging / disabled: no flame. ready: sustained flame shorter than the active one.
4. Reduced motion, forced colours, HUD animation off, motion flag off: no flame element painted.
5. Unit: the gate attribute is written only on change; the preference is not read per frame; cues
   stay one-shot and staggered.
6. Generator self-check: 4608 × 384, at most 150 KB, transparent left / right / top edge columns.
7. Frame time p50 / p95 in a race with both flames lit, before and after, on the Low tier. A
   measurable p95 regression means stepping the flipbook slower or moving to a transform-driven strip.
8. `node --test tests/module-size.test.js`, `npm run typecheck`, `npm test`, `npm run build` and the
   focused browser spec are green; portrait and landscape checked.

## Contract changes to existing tests

`tests/hud-3x-artwork-browser.spec.js` asserts a flame outset of at most 8 px, no overlap with
neighbours, and that FLY and throttle keep their old opaque background. All three are replaced by the
criteria above on purpose; no assertion is dropped without a replacement.

## Left to the builder

Exact flame box numbers, flipbook speeds, gradient stops, note values, and whether the preview-key
colours need the `main-ui-contract.json` CSS hash updated.
