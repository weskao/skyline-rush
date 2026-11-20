---
paths:
  - "src/wave3-browser-experience.ts"
  - "src/wave3-race-events.ts"
  - "src/wave3-demo-race-locked.ts"
  - "src/main.js"
  - "src/cloud-ui.ts"
---

# Wave 3 trial persistence traps

Guard: `tests/wave3-experience-guards.test.js`.

- **Deletion is an invalidation, not just a delete.** A settlement queued or retried after
  the cloud data is deleted reads `null`, which looks like a new account. If nothing marks the
  account as deleted, the settlement writes the save back. Call
  `forgetWave3DemoAccount(uid)` before `deleteCloudProgress(uid)`; `forgetAccount` makes every
  queued and later write for that account in this tab a no-op.
- **A race's scope is captured at countdown.** Restoring the signed-in wallet and applying the
  7-day expiry both change the generation. If they finish after the countdown, the race settles
  as `expired`. Every path that calls `startRace` with rewards (`start`, `restart`, Cup resume)
  first returns early on `deferWave3RaceStart(...)`. A new start path must do the same.
- **Reset trial writes without reading.** Reset replaces the stored save, so it must not parse
  it first: a corrupted, invalid or future-dated save would block the reset, or leave the save
  in place. The Firestore reset uses `overwrite`, and the guest reset skips `syncDisk`.
