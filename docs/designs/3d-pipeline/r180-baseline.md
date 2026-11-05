# Three.js r180 baseline — Plan Task 1

The baseline runs the game on r180 before the migration. Each device must capture its own
screenshots, renderer metrics and performance results under the gitignored `audits/` directory;
measurements from another machine are not acceptance evidence for this one.

## Reproduce

Build the current r180 revision, then run the capture spec for desktop and phone viewport classes:

```sh
npm run build
THREE_BASELINE=1 LABEL=r180 VIEWPORT=phone RACE_SECONDS=4 npx playwright test tests/three-baseline-browser.spec.js
THREE_BASELINE=1 LABEL=r180 VIEWPORT=desktop RACE_SECONDS=4 npx playwright test tests/three-baseline-browser.spec.js
make perf VIEWPORT=desktop RATE=6 ROUNDS=3
```

The capture covers the Garage home preview, Studio front/side/rear, and every current track.
Coast and Sky Spiral also capture NITRO, FLY and landing. Browser phone emulation does not
establish physical-phone GPU, touch, or thermal performance; run phone acceptance separately.
Weather and quality variants, reduced motion and context recovery still need separate captures
and review.

## Compatibility RED

At the r180 revision, `node --test tests/three-version-contract.test.js` fails on the intended
version, lockfile, missing declared types and dynamic type-install assertions. Keep those tests
and verify they pass after the migration. Garage preview draw calls and triangles must come from
the preview itself; the original capture accidentally overwrote them with world-renderer values.

Compare the same device, viewport, settings and scenarios after migration. Inspect the actual
images as well as metrics: stable counters alone cannot prove visual parity. See the per-device
checklist in `phases/README.md` for the remaining gates.
