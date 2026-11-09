# Wave 3 frontend core — pinned contract and integration handoff

**Repo:** https://github.com/weskao/skyline-rush
**Owner branch:** `feature/wave3-frontend-demo-integration`
**Frozen F01 commit (base for satellite agents):** `3a5ff9378667a53f23f17134c4d0f2cbaafb83d4`
**Later integration commits:** `fff37750c6b1e6b1b1fb2dca1112db11f7c90b9d`, `74a71f956f90180d8018a33765a1c7d92e3b5bf6`, `e430077f3a1e743250b7283d8f3899ecaf86dc56`
**Base:** `develop@dbf2ffc1e8e248c4042cce35a09bc7b5e58255fc`

## Shared TypeScript API (F01 commit)

- `src/wave3-experience-contract.ts`: `Wave3ExperiencePort`, `ExperienceSnapshot`, `GameEvent`, `RaceCompletion`, `ExperienceResult`, `MissionProgress`, version constants.
- `src/wave3-local-demo.ts`: `createWave3LocalDemo({ now?: () => number })` → `Wave3ExperiencePort`.
- `src/wave3-demo-settlement.ts`: `DEMO_REDEMPTION_COSTS` and local-only starter/reward fixtures (20 initial + 20 race + 10 claim; starter thruster-ion 25).
- `src/wave3-race-events.ts` (after F02): `wave3DemoExperience` is the singleton to subscribe to for mission/store/results Vue; `captureWave3RaceTelemetry` and `settleWave3RaceDemo` are wired into the live race through `race-results.ts` and `main.js`.

`Wave3ExperiencePort` operations: `getSnapshot`, `subscribe`, `recordGameEvent`, `settleCompletion`, `claimMission`, `redeemPreview`, `equipPreview`, `resetDemo`, `setAccount`.

`ExperienceSnapshot` contains `version`, `catalogVersion`, `mode:'local-demo'`, `authority:'local'`, `syncState:'local-only'`, `accountId`, `missions`, `demoPoints`, `demoInventory`, `equippedPreview`, `updatedAt`. The mission IDs currently present are `mission-race`, `mission-time`, `mission-drift`, `mission-combo`; mission agent may add its pure reducer only after coordination, without breaking these identifiers.

The active demo state is **memory only** and resets on refresh; F06 persistence agent must add its bounded, versioned save/restore seam without assuming existing `ExperienceSnapshot` includes replay-protection IDs. A checkpoint/restore extension requires explicit, backward-compatible coordination. Do not write or change `firestore.rules`, Cloud Save, paid wallet or skin ownership to simulate local persistence.

## Coordination contracts

- **Mission agent:** own `GarageMissionBoard.vue` and new mission reducer/tests; subscribe to `wave3DemoExperience` and call `claimMission`. Do not edit `main.js` or result settlement; actual events already arrive from real races.
- **Store/Collection agent:** isolated `Wave3DemoStore.vue`, `Wave3DemoCollection.vue`, catalog/tests; call `redeemPreview` and `equipPreview`. These change **demoInventory only**, not `SkinProfile.owned`; integration owner wires a separately gated temporary preview into real Garage.
- **Storage agent:** separate demo namespace; handle guest/auth change, reset, invalid/expired payload, no cross-account leakage; coordinate checkpoint/rehydration extension before writing final adapter.
- **Result agent:** pure result presentation component; **no direct payout** on rerender. Read the already-settled `ExperienceSnapshot` after `settleRaceAndDemo`, not a second result mutation.
- **Asset agent:** inspect originals and add safe asset checks; never regenerate established 3D illustrations just to fill the local-demo UI.
- **QA agent:** verify actual race→mission→claim→store→collection→equip plus backend-outage/blocked-storage/phone checks; do not equate a synthetic race fixture with hardware acceptance.

`src/main.js`, `src/race-results.ts`, `src/GaragePanel.vue`, `src/garage-ui.ts`, shared contract/core modules, and root `TODO.md` are integration-owner only. Satellites must not push into this branch. Integrate their pinned tested commit SHAs one at a time, preserving commit history and without merging to `develop` or `main`.

## Verification evidence and outstanding gates

Observed local RED for missing F01 implementation; GREEN: 9 F01 tests. Observed RED for F02 missing module; GREEN: 13 tests. Additional abort-race RED 2 / GREEN 14; final-frame drift RED 1 / GREEN 15. Standalone strict TypeScript 5.8.3 check exit 0. `src/main.js` stays at its existing 677-line ratchet.

The GitHub run on F01 commit passed its unit/typecheck/build/cloud jobs but was cancelled by newer pushes; no full branch acceptance is claimed. The current exact-HEAD `[full-regression]` GitHub Actions, real browser and phone checks are independent pending gates. Update `TODO.md` and this handoff after each verified stage; only the narrow observed tasks may be checked.
