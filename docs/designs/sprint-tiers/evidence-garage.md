# Sprint tiers: Garage session evidence
Status: blocked on one line in `src/aero-vfx.js` (outside this session's files): with motion on, the Inspect jets burn NITRO + BOOST with NITRO's look, so the combined tier cannot be told from NITRO in the Garage

Branch `feature/garage-thruster-ui`. Commits: `38186116` (cards, tier control, guards, UX contract),
`df62e108` (merge of `feature/nitro-realistic-flame`), then the commit that adds this file. Not pushed, not
merged anywhere else. A first session built the code and was killed before it committed; a second session
checked that tree against the brief, committed it, merged and wrote this file. No browser test, screenshot
or recording was run by the second session: they were stopped on the user's instruction. Everything not
run is under "Not run", and nothing unrun is recorded as passed.

## What was built

| Brief item | State |
| --- | --- |
| Tier control driven by the shared ladder | Done. `src/GaragePreviewTier.vue` (47 lines) draws one button per row of `SPRINT_TIERS` above idle, in ladder order. `src/garage-preview-tier.ts` (18 lines) holds the choice and gets each tier's inputs by asking `sprintTier()`; it names no tier id. `src/garage-stage.ts` writes those inputs to the Inspect driver every frame (3 assignments, no allocation). |
| Keyboard and touch, both locales, Home and Inspect | Built: real `<button>`s with `aria-pressed`, 44 px minimum, focus outline, group label "Sprint preview" / 「衝刺預覽」. The labels BOOST, NITRO and NITRO + BOOST are the game's own terms in both locales, as on the HUD. The choice lives in the module, so it survives Home to Inspect. Not confirmed in a browser. |
| A future thruster skin is one catalog row plus its art | Done for the Garage UI: the card hue moved into the `GARAGE_SKINS` row, and no SFC names a skin id (guarded). The 3D look of a new thruster still needs its rows in `src/garage-skin-palette.ts` and `THRUSTER_LOOKS`, which the exhaust work owns. |
| One source per card hue | Done: the per-id `SKIN_ACCENT_HUES` table is gone. The hue is not derived from `src/garage-skin-palette.ts`, for three reasons: that table holds shader tint multipliers, not display colours (every default skin is neutral `[1, 1, 1]`, which has no hue); the tints that exist give other hues than the artwork (Ion 210 against the card's 178, Void pulse 251 against 272); and the palette imports the catalog, so the reverse import would be a cycle. Drift rows keep their hue in `DRIFT_TRAIL_STYLES`, where it already was. |
| Guard tests RED first | The first session's RED run was not recorded. Re-checked: the five tests fail 5 of 5 against the source of `071cd340` (the commit before the work) and pass on the final tree. |
| Ownership, trial and entitlement unchanged | No runtime, profile or entitlement module was edited (`git diff 071cd340 38186116 --stat` lists only the four owned source files, the two new ones, the doc and the two tests). |
| Before and after captures | Not run: waived on the user's instruction. |
| The existing Garage specs pass unchanged | Not run: waived on the user's instruction. No existing spec was edited. Read by hand: no existing spec asserts the pill texts that were removed, and `tests/garage-skin-trial-browser.spec.js` line 83 (`/free trial|免費試用/`) still matches the new intro copy. |

## Audit list

The first session left no written audit and no captures, so this list is rebuilt from its diff and from
`docs/designs/garage-vfx-skins/GARAGE-COLLECTION-UX.md`. Each fix is in the code; none was looked at in a
browser by the session that wrote this file.

| Finding | What was done |
| --- | --- |
| The preview always burned BOOST and NITRO together | The tier control above. |
| A card said its state twice (pill "Equipped" over a button "Equipped", "Free trial" over "Try free", "Locked" over "Locked") | The pill now only says what the button cannot: Owned, Trial active, or Previewing. An empty pill keeps its row, so starting a preview does not move the cards below. |
| Equipped and Locked were both plain disabled buttons | Equipped is teal with a tick. Locked is grey with the shared padlock icon (`icons.lock`). |
| Locked art looked as available as owned art | Locked art is desaturated until the card is previewed. |
| Four cards wrapped as three and an orphan on a 390 px phone | Exactly four cards form a 2x2 block (thruster and airflow). Other counts keep the auto-fill grid. |
| The trial intro line was long | Shortened in en and zh-TW; it still says a trial is not ownership. |
| Card colours lived in a second per-id table | Moved into the catalog row. |
| Art clarity, truncation, spacing, touch targets in the real layout | Not audited: these need captures, which were waived. The thruster card art was not changed. |

## Open: the combined look does not reach the Inspect jets

Measured on the merged tree with a throwaway probe (not committed) that reads the jets' `tier` uniform
after 2 s of `stage.update()` per choice:

| Chosen in the control | Motion on | Reduced Motion |
| --- | --- | --- |
| BOOST | `boost` row (9, 0.6, 0, 1.7) | `boost` row |
| NITRO | `nitro` row (6.5, 0.85, 0, 1.5) | `nitro` row |
| NITRO + BOOST | **`nitro` row** (6.5, 0.85, 0, 1.5) | `nitro-boost` row (5, 1, 1, 1.35) |

- Cause: the Garage stage calls `aero.update(…, studioDemo = true)`. In that branch `src/aero-vfx.js`
  picks the jet's tier as `sprintTier(jet.nitroMix > 0, jet.nitroMix <= 0)`, which can never be
  `nitro-boost`, and ignores the driver's `boosting`. The exhaust work wrote it when the Studio had no
  tier control. The control, its state and the driver inputs are correct; the last hop is not.
- `src/aero-vfx.js` is outside this session's edit list, so it was left alone.
- Proposed change, the `jet.tier` line: replace both `pulse < 0 ?` with `pulse < 0 || active ?`. A
  showroom that drives a racing car (Inspect) then reads the driver like a race; a parked showroom (Home,
  phase `ready`) keeps today's rule. Same line count.
- Tried on a scratch copy of HEAD outside the repo: the probe then reports `boost`, `nitro`, `nitro-boost`
  with motion on and with Reduced Motion, and `node --test` on garage-preview-tier, sprint-plume-flame,
  sprint-plume, aero-vfx, sprint-tier, garage-skin-renderer and garage-skin-replacement gives 78 tests, 78
  pass. Not tried: any browser spec, the glare, veil and warm-up guards.
- A guard for it (the Inspect jets' `tier` uniform reaches the chosen tier's `TIER_LOOKS` row) belongs in
  the same commit as that line. It would be RED today, so it is not committed here.

Also open, and unchanged by the merge: on Garage Home the car idles on the home scene, whose showroom burn
is fixed (BOOST, or NITRO while a trail skin previews). The control says so on Home ("Open Inspect to see
the chosen tier on the car.").

`sprintCue()` and `TIER_LOOKS` / `THRUSTER_LOOKS` are not imported by Garage code and nothing from them is
copied: the control needs only the ladder's ids and levels, and the jet reads the looks itself. Feeding the
Inspect airflow a `sprintCue()` frame was considered and left out: it changes how every tier renders in
Inspect and could not be looked at.

## Commands and observed results

Final tree (the commit that adds this file):

| Command | Result |
| --- | --- |
| `node --test tests/module-size.test.js` | 3 tests, 3 pass. `src/GarageSkinCatalog.vue` 311 lines, `src/garage-stage.ts` 226, `src/garage-skin-catalog.ts` 147 |
| `node --test tests/garage-preview-tier.test.js` | 5 tests, 5 pass |
| `node --test` on module-size, garage-preview-tier, sprint-tier, sprint-plume-flame, garage-skin-catalog* | 36 tests, 36 pass |
| `npm run typecheck` | exit 0 |
| `npm run build` | exit 0, built in 4.32 s, "Production coming-soon bundle checked" |
| `npm test` | exit 0: 3701 tests, 3697 pass, 0 fail, 4 skipped (132 s) |

A first `npm test` run on this tree is void: 3701 tests, 3692 pass, 5 fail, 4 skipped. The worktree had no
install of its own (packages resolved from the parent checkout), and the five tests that read
`node_modules/three` and `node_modules/typescript` in the checkout failed with `MODULE_NOT_FOUND`. After
`npm ci` in the worktree, every command in the table was run again; the table holds those runs. The
`npm test` row was filled in after its run, which is the only edit to this file since.

Before the merge, on `38186116` (parent checkout's install): module-size and garage-preview-tier 8 tests,
8 pass; `npm run typecheck` exit 0; `npm run build` exit 0 (17.08 s).

RED: `node --test tests/garage-preview-tier.test.js` against the source of `071cd340`, in a scratch copy
outside the repo: 5 tests, 0 pass, 5 fail.

## Not run

Reason for every item: waived on the user's instruction.

- `tests/garage-preview-tier-browser.spec.js`: written by the first session, never run by anyone on
  record. It is listed by `playwright test --list` inside `npm test`, which only proves it parses. Its
  selectors and helpers were checked by hand against the source.
- `tests/garage-vfx-catalog-browser.spec.js`, `tests/garage-cosmetics-preview-browser.spec.js`,
  `tests/garage-skin-trial-browser.spec.js`, `tests/garage-preview-vfx-toggle-browser.spec.js` (the four
  the brief names), and the other Garage specs that read the cards
  (`tests/garage-vfx-completion-browser.spec.js`, `tests/garage-vfx-live-loadout-browser.spec.js`,
  `tests/garage-unlocked-browser.spec.js`, `tests/garage-equipment-audit-browser.spec.js`).
- `node scripts/build-garage-browser.mjs`, `npm run test:browser`, `npm run test:layout`, `make verify`.
- Before and after captures at 390 x 844, 844 x 390 and 1440 x 900 in en and zh-TW. No capture file
  exists for this session.
- The control and the cards on every selectable car, on a real phone, in forced colours and with Reduced
  Motion in a browser.

## For the coordinating session

- The `jet.tier` line above, with its guard, closes the Status line.
- The pre-push layout gate and the exact-HEAD CI have not run for this branch.
- `:has()` drives the 2x2 block (`.garage-vfx-category ul:has(> li:nth-child(4):last-child)`); a browser
  without it falls back to the old auto-fill grid.
