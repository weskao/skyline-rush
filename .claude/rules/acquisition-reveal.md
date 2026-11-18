---
paths:
  - "src/acquisition-*.ts"
  - "src/acquisition-reveal.css"
  - "src/AcquisitionReveal.vue"
  - "src/race-results.ts"
  - "src/GarageMissionBoard*.vue"
  - "src/Wave3DemoStore.vue"
  - "src/wave3-demo-missions.ts"
  - "src/shortcut-rewards.ts"
  - "src/*-progress.ts"
  - "src/garage-ui.ts"
  - "src/garage-*catalog*.ts"
  - "tests/acquisition-reveal*"
---

# One reveal for every newly acquired or unlocked item

Whenever the player acquires or unlocks something new (car, track, paint, equipment, clothing,
item, medal or currency), show it through `presentAcquisition(batch)` from
`src/acquisition-reveal.ts`. `App.vue` mounts the single `AcquisitionReveal` dialog. Never add a
second unlock modal, toast, banner or per-feature reveal screen. API, fields and current callers:
`docs/acquisition-reveal.md`.

## Flow (same for every source)

1. The owning service commits the progress or transaction first. Call `presentAcquisition` only
   for a successful, newly granted result (`receipt.status === 'completed'` and the item is new),
   never on a click, a preview or before a receipt arrives.
2. Build the items in a pure `.ts` function next to the source and unit-test it, as
   `raceAcquisitionItems` (`acquisition-race-reveal.ts`) and `demoAcquisitionItems` /
   `missionTrophy` (`acquisition-demo-items.ts`) do. The UI caller stays a one-line
   `presentAcquisition(...)`.
3. `batch.id` = source + the stable operation id; member/demo operations also include the
   account and save generation (`demoAcquisitionId`). Retries, re-sent receipts and re-renders
   then show the batch only once. One operation is one batch, and its first item is the hero.
4. Race rewards join `raceAcquisitionItems`; never call `presentAcquisition` separately for
   race results. It opens with the results screen.
   Keep storefront builders and their catalog imports in `acquisition-demo-store.ts`. Race
   results import `acquisition-demo-items.ts` in locked builds, where the initialized store
   catalog would otherwise survive bundling. Guard: `tests/garage-release-build.test.js`.
5. Do not present items from save loads, cloud sync, equipping, try-on/preview, in-race pickups
   or items the player already owned.

## Same UI template

- Names come from the existing catalogs in en and zh-TW (`trackName`, `t('paint.' + id)`, Garage
  catalog names), never a second name table. Artwork reuses an existing public asset path
  relative to `BASE_URL`: `cover` for track/paint art, `cutout` for transparent car/clothing
  renders, `icon` for equipment/resources. Missing art falls back to the kind's glyph.
- A new kind extends the shared template in one place: `AcquisitionKind`, the en/zh-TW `labels`
  and `glyph` in `AcquisitionReveal.vue`, and a `[data-kind]` accent in
  `acquisition-reveal.css`. Never fork the component or restyle it from a caller.
- The FIFO queue, deferral during racing/countdown/pause, focus/Escape/back handling, landscape
  layout and the static Reduced Motion / Comfort / effects-off version are built in. Callers
  never reimplement them or add a second sound layer.

Guards: `tests/acquisition-reveal.test.js` (queue, dedupe, item builders),
`tests/race-results.test.js`, `tests/acquisition-reveal-browser.spec.js` (real dialog, both
orientations). A new source adds a builder + dedupe-id unit test; a new kind extends the browser
spec.
