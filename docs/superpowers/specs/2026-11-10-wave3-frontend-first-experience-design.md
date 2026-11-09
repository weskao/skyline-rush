# Wave 3 Frontend-first, Backend-optional Early Access — Product and Integration Design

**Date:** 2026-11-10 · **Status:** PROPOSED implementation contract, NOT shipped functionality.
**Baseline audited:** `develop` at `dbf2ffc1e8e248c4042cce35a09bc7b5e58255fc`.
**Authoritative execution order:** complete and accept the frontend-only player journey; optionally allow an explicitly labeled public preview; implement the separate Go backend **afterward**. This document supersedes the historical backend-first dependency ordering in older Wave 3 plans, not their security constraints.
**Master plan:** `docs/superpowers/plans/wave3-remaining-implementation-master-plan.md`.
**Visual production brief:** `docs/designs/wave3-frontend-first-visual-assets.md`.

## 1. Intent and scope

The player must be able to finish a race → see mission progress → view a demo reward → optionally claim demo points → preview a store item → redeem it with demo points → see it in a demo collection → temporarily equip an eligible cosmetic → race again, **without a Go service, payment provider, network connection, signed-in account or real-money data**. This is a local, disposable experience, not a cryptocurrency, a balance with monetary value, official achievement ownership or a promise of future restoration.

Keep the existing offline race, classic records, local/cloud progress, star-earned PAINTS, 22 VFX skin catalog/trial mechanics and graphics/physics behavior unchanged. A first-time guest should be able to try the full experience. Do not disable established local features to simulate the future Go service.

## 2. Player experience, two deliberately different levels of truth

| Concept | Early-access local demo (`local-demo`) | Future verified experience (`server`) |
| --- | --- | --- |
| Availability | Default in a separately approved preview build/feature flag; no backend | Enable only after independent authorization and backend verification |
| Race result | Existing `settleRace` local result remains authoritative only for local gameplay | Go validates independently before granting rewards |
| Mission progress | Derived from actual game events but **locally simulated**, labeled "試玩進度 / Demo progress" | From verified server events and account-scoped durable state |
| Daily/weekly boundaries | UTC-boundary simulation from device time; clock may be modified | Server UTC clock, canonical mission version and replay protection |
| Points | "試玩點數 / Demo points" only, nontransferable, no cash or premium-equivalent value | Approved server-issued currency only, never inferred from local points |
| Claim/redeem | Interactive local demo settlement and demo store exchange; no billing | Server ledger + idempotent settlement; paid purchase out of scope until approved |
| Inventory | Ephemeral demo unlock / trial-equipped selection distinctly labeled "試玩" | Verified permanent entitlements and separately authorized trials |
| Storage | In-memory, optional small versioned local demo snapshot; removable | Server database; never import demo points/unlocks as verified grants |
| Offline/backend outage | All demo actions usable; status must remain "Local demo" | Graceful fallback to demo/local racing without fabricated verified progress |
| Cross-device | Not promised; never Cloud Save-synced | Explicitly server-scoped after successful migration/verification |

**Critical language:** Never use "已正式獲得", "永久擁有", "交易成功", "真實餘額" or "伺服器驗證完成" for a local demo. Use "試玩取得 / Demo unlocked", "試玩兌換 / Demo redeem", "僅此裝置 / This device only" and "可重設 / Reset demo". Existing genuine stars/paint ownership labels may remain as-is, but must never be conflated with demo inventory.

## 3. Frontend data boundaries (stable seams, not premature backend implementation)

- Define a small `Wave3ExperiencePort` contract, used by UI/application orchestration and implemented by an initial `LocalDemoAdapter`. Later add a `ServerExperienceAdapter` behind the same port. Keep race physics and Three.js frame loops unaware of either adapter. Do not write a speculative Go client today.
- Versioned `MissionDefinition` and `GameEvent` carry stable `missionId`, `eventId`, `completionId`, `trackId`, `mode`, `occurredAt`, `schemaVersion` and eligibility metadata. Use actual finish/drift/COMBO/landing events rather than fabricated UI counters. Document which event fields are trustworthy only locally; none are trusted proof of server completion.
- `ExperienceSnapshot` separates `mode` (`local-demo` or `server`), `authority` (`local` or `verified`), `syncState`, `missions`, `demoPoints`, `demoInventory`, `equippedPreview`, `catalogVersion` and `updatedAt`. Do not use an ambiguous `owned` field for demo unlocks.
- Suggested port operations: `getSnapshot()`; `subscribe(listener)`; `recordGameEvent(event)`; `settleCompletion(completion)`; `claimMission(missionId)`; `redeemPreview(itemId)`; `equipPreview(itemId)`; `resetDemo()`. Make each result a typed status with stable error reason (`completed`, `duplicate`, `ineligible`, `insufficient-demo-points`, `unavailable`, `expired`, `invalid`); no exceptions for normal offline behavior. Concrete TS signatures are settled in F01 before code.
- No UI component directly imports Firebase Admin, a Go API, or arbitrary browser storage. The adapter owns its state. Existing `src/race-results.ts` and `src/result-screen.ts` remain working independently; integrate via an after-settlement callback/adapter instead of replacing `settleRace` or changing scoring.
- Keep current `createGarageSettlementGate` and `garage-economy-state.ts` **unchanged** as safe read-only/server-authority boundaries until a separately reviewed integration. Do not make `verified: true` mean money paid; local demo results must use a new explicitly local status rather than falsifying the server verifier.
- Use existing account/skin session boundaries. Local guest may use demo content; on Firebase A→B or logout, reset or isolate demo namespace, clear in-flight UI and suppress stale callbacks. Never elevate `garage-skin-preference.ts` picks or `skinCloudPayload` to permanent entitlement.

## 4. Lightweight disposable persistence

Default to in-memory behavior, with an optional **bounded** browser `localStorage` cache to make refresh feel natural. If implemented, use a separate key `skyline-rush-wave3-demo:v1:<guest-or-uid>` with strict version/schema and size limit (recommended ≤64 KiB), last-updated timestamp and rolling 7-day expiry, plus a visible "Reset demo" action. The user need not sign in or consent to a real transaction. If storage is unavailable, the current session still works fully in memory. Never store auth tokens, PII, payment details or high-value data. Clear the demo cache without touching existing PAINTS/history/Cloud Save keys. Document that incognito/device clearing/reset can remove progress.

**Backend migration rule:** Future `server` first loads verified server state and starts with zero new authority for demo values. Demo points, demo claims, demo cosmetics and local timestamps are **never automatically migrated** into currency, official achievements or purchases. A future approved migration may transfer *non-authoritative presentation preferences only* (e.g. selected category) after validation. A server failure must never turn local demo status into verified ownership.

## 5. Functional early-access BDD

| Scenario | Given / When | Then |
| --- | --- | --- |
| Guest first visit | No account or Go endpoint; open Garage | All local-demo Mission, Demo Wallet, Collection and Demo Store views work without a spinner dead-end |
| Race to mission | Finish a genuine local race, perform a documented drift/combo, return to Garage | Matching demo mission counts update once; unrelated tasks do not increment |
| Double result | Results screen rerenders / Race Again / reload/reconnect | Same completionId is not counted twice in current demo state |
| Daily/weekly | UTC boundary changes while the app is open | Daily/weekly demo objectives rotate deterministically once; old events never grant new rewards |
| Claim | Claim an earned demo objective | One local claim, points update once; repeated clicks show already claimed |
| Redeem | Open demo store, choose item, confirm with enough demo points | Points decrease in local demo only; demo inventory changes; trial/equip path remains valid |
| Insufficient | Try demo redeem without enough points | Explanatory message, balance and inventory unchanged |
| Trial/locked | Expired demo trial / feature flag off / unsupported item | Fall back to default; never forge paid/owned entitlement |
| Refresh | Reopen after a saved demo snapshot | Only valid, unexpired, correctly versioned demo state returns; otherwise safe fresh state |
| Account change | A signs out and B signs in during an action | A's demo counters and selections are not shown to B; stale callback ignored |
| Backend absent | Simulate offline, 404, timeout or no Firebase | Local racing, demo exchange, Garage, navigation and history still work |
| Switch to server | Later server adapter returns empty verified inventory | UI does not promote demo credits/unlocks; explicit "not yet verified" indication |
| Existing progress | Player has PAINTS stars, bests, medals and cloud history | Nothing is cleared, overwritten or reclassified by demo resets |

All UI must support `en`/`zh-TW`, phone 390×844 portrait and 844×390 landscape, desktop 1440×900, Low/Medium/High, VFX Off and Reduced Motion; keyboard/focus and ≥44 CSS-px tap targets. No Vue writes/DOM queries in frame-hot paths.

## 6. Demo catalog and balance fixtures (not launch economy policy)

At implementation time, choose **explicit, easily adjustable local-only fixtures** to let a new guest complete a first win, claim a mission, redeem one item and equip it in a short session. Suggested test fixture, **not approved official payout**: start 20 demo points; first eligible local race grants 20; first demo mission claim grants 10; one starter cosmetic costs 25. All labels must use "Demo/試玩", and another deliberately too-expensive item must exercise "insufficient points". Never write these sample values to `firestore.rules`, purchase contracts, Go plans or actual monetary policies. Real balances/rates/restrictions remain a product decision.

Avoid random purchasable mystery boxes in the preview. Existing `store-box` is artwork only, unless a separate no-gambling/no-paid-randomness design is approved. No payment SDK, billing details, hidden "BUY" action or conversion rates. Preview browsing may be called "商城試玩" and may contain **demo redemption** but not real checkout.

## 7. Launch and promotion gates

**Preview build:** gated and explicitly disclosed as local-only; working end-to-end UX in a backend-free deployment; clear reset, local save disclaimer and no false server-authoritative claims. Security measures for *real* economic assets are not required to simulate disposable points, but prevent user misunderstanding, account data leakage and corruption of existing saves.

**Backend phase:** start only after frontend scope and acceptance are confirmed and a separate authorization is given. See `docs/superpowers/plans/2026-11-06-wave3-go-backend-implementation.md`; keep the same app-facing adapter and test suite, add authenticated Go/Firestore authoritative validation. Roll out server in shadow/read-only mode first, with server-only entitlements disabled until approved. Test both adapter modes and fallback on actual devices.

**Not in scope of this documentation-only branch:** implementation of game UI, image files, payment or Go service, Firebase rules deployment, merging to develop/main, a PR, or publishing an early access build.
