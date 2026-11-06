# Skyline Rush v0.29.0 — Wave 3 Go Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or subagent-driven-development and superpowers:test-driven-development. Every completed checkbox requires actual RED, GREEN, and verification evidence.

**Status:** DEFERRED / NOT IMPLEMENTED / NOT APPROVED FOR LIVE AWARDS OR PAYMENTS. This document is a future implementation prompt and acceptance contract, not evidence of running backend services.

**Repository:** https://github.com/weskao/skyline-rush

**Only permitted writable branch (when this future task is explicitly authorized):** `feature/wave3-garage-integration-20261105`

**Read-only references:** `develop`, `main`, `feature/garage-economy-foundation`, `feature/garage-rewards-and-missions`, `feature/garage-store-readiness`, `feature/garage-vfx-skins`.

**Goal:** Add a secure, Go-language, server-authoritative Wave 3 backend for verified racing outcomes, mission progress, idempotent settlement, inventory/entitlements, and future store readiness **without interrupting existing playable game features before, during, or after backend rollout**.

**Architecture:** Keep the existing Vue 3 / TypeScript / Vite / Three.js race and Garage clients. Implement the trusted business authority in **Go** (prefer a small HTTP service deployed to Google Cloud Run after separate deployment approval; Firebase Auth token verification and Firestore Admin/transaction APIs). Choose an equivalent approved Go hosting option only after documenting why. Firebase Security Rules protect direct client SDK reads/writes; the Go Admin SDK bypasses these rules, so the Go service must enforce the same or stronger authorization and validation itself. No Go implementation, service, new infrastructure, or deployment is authorized by the creation of this plan.

**Tech stack:** Go (currently supported stable toolchain selected and pinned at implementation time), standard `net/http` and `context` where appropriate, Firebase Admin SDK for Go, Firestore Go client and Firestore Emulator, Firebase Auth, existing Node 22+ / TypeScript / Playwright checks, GitHub Actions. Avoid speculative frameworks or payment dependencies.

**Canonical references:**
- `AGENTS.md`
- `CLAUDE.md`
- `docs/regression-first-workflow.md`
- `.claude/rules/ci-gates.md`
- `.claude/rules/branch-release.md`
- `docs/superpowers/plans/2026-11-03-wave3-v029-completion-plan.md`
- `docs/superpowers/specs/2026-10-31-garage-economy-foundation-design.md` (source branch)
- `docs/superpowers/specs/2026-10-31-garage-rewards-and-missions-design.md` (source branch)
- `docs/superpowers/specs/2026-10-31-garage-store-readiness-design.md`
- `docs/garage-release-policy.md`
- `TODO.md`

## Non-negotiable: backward compatibility and anti-cheat

1. **The pre-backend game must continue to work.** Offline/local races, existing track selection, controls, vehicle physics, NITRO/FLY/BOOST, race history and results display, tutorial, PAINTS/star progression, Garage Studio, existing VFX trials, Coming Soon store/reward previews, localization, accessibility, and the already-approved Cloud Save behavior must remain usable when the Go backend does not exist, is offline, times out, or returns an error.
2. **No backend dependency on the critical path of offline play.** Startup, race rendering/simulation, navigation, safe cosmetic previews, and local-only progression must not be gated behind a Go service call. Feature-detect the approved service and use bounded timeouts, cancellation, non-blocking loading, and explicit offline/unavailable states. Preserve legacy storage formats and migration rules. Never delete or overwrite pre-existing local saves or granted PAINTS stars.
3. **Fail closed only for privileged server-authoritative actions.** If Go authority is unavailable, a user may still race and use existing safe features, but cannot mint credits, advance authoritative missions, claim prizes, unlock paid cosmetics, or confirm purchases. Existing UI may show clearly differentiated personal/local results and pending/unavailable status, not fake verified awards. Reconnect and retry must be safe.
4. **No client-side anti-cheat guarantee.** A browser game can be modified and its network traffic replayed. Firebase Auth, App Check, HTTPS, an opaque challenge, obfuscation, client-signed JSON, local timestamps, and UI disablement are not sufficient evidence of legitimate race completion. Treat all client inputs, local storage, Cloud Save payloads, client-side physics/score, and client-provided telemetry as untrusted.
5. **Define a credible trusted-verification mechanism before granting rewards.** Prefer server-owned race session IDs, cryptographically strong one-use challenges, server time windows, server-side canonical rules/track/config version, bounded event sequence, and deterministic replay or server-side authoritative simulation/checks where technically feasible. Anti-replay, rate limits, tamper detection, plausibility checks, and App Check may add defense in depth, but **do not alone prove a race happened**. If server-side replay/authority is not feasible with the current client-only physics, document the residual cheating risk and keep redeemable/paid rewards disabled.
6. **Isolation and idempotency:** Verify Firebase ID tokens on each privileged request, bind all records to authenticated UID, enforce Firestore document ownership/roles and service-side authorization, prohibit writes of verified completion/ledger/entitlement from clients, and atomically reject duplicate `(uid, completionId)` settlement across devices/retries/reconnects.
7. **Safe migration and reversible rollout:** Version APIs, missions, entitlements, and schemas; add-only first, read-only/shadow validation before serving authoritative writes; do not reinterpret legacy local achievements/PAINTS stars as paid entitlements. Keep a tested kill switch and rollback plan. Feature flags must not be a way for the browser to grant privileged access.
8. **No functional regression permitted:** The acceptance gate includes full before/after integration tests, offline/Go-down scenarios, Firebase emulator tests, browser/mobile/WebGL manual checks and exact-HEAD full CI. Until these are run, **do not claim the guarantee has been verified**. Never weaken tests/quality gates to conceal failures.

## Phase 0 — prerequisites (must be satisfied before implementation, not inferred)

- [ ] **Explicit task authorization:** Confirm the user has started the backend implementation phase. Creating this Markdown file does not authorize backend code, CI modifications, infrastructure provisioning, deployment, purchasing, or release.
- [ ] **Frontend baseline:** Complete authorized Wave 3 frontend integration on `feature/wave3-garage-integration-20261105`; record exact HEAD, source ancestry, test baseline, current user-facing flows, and a migration/rollback matrix. Resolve outstanding full CI before treating baseline as passing.
- [ ] **Product security decisions:** Define whether authoritative progression is nonredeemable only or whether any rewards have cash/paid/transferable value. Get approval for eligible race modes, mission definitions/IDs, reset rules, limits, rejection policy, antifraud tolerance, replay rules and data-retention/account-deletion requirements. Without approval, create safe verification scaffolding only; reward, wallet, claim, checkout and real entitlements stay blocked.
- [ ] **Anti-cheat feasibility review:** Inventory how race simulation, final results, input events, random seeds, track versions and finish predicates actually work. Choose and threat-model a server-verifiable event model or replay model. If cheat-resistant proof cannot be established, do not promise real-money/fungible rewards.
- [ ] **Infrastructure authorization:** Obtain a dedicated Firebase/GCP development project (never reuse production implicitly), project roles/IAM, Firebase Auth configuration, Firestore database and emulator setup, separate Cloud Run staging target if hosting is approved, HTTPS, API enablement and approved budget/quotas. No actual deployment without separate approval.
- [ ] **Go environment:** Install or verify a current supported Go toolchain; decide/pin the Go version, `go.mod`, dependency versions and vulnerability policy at implementation time. Confirm Node >=22.12, local Firebase CLI, Java 21 for emulator, credentials for test environment, and documented commands. Never check service-account keys or .env secrets into the public repository.
- [ ] **Current contracts:** Read `src/garage-settlement-gate.ts`, Skin Session, Cloud Save, Garage UI/Store helpers, result-screen and Firebase rules. Preserve existing public TypeScript API contracts or add backwards-compatible adapters.
- [ ] **Observability/privacy:** Approve minimally scoped logging, request IDs, rate limiting, privacy notice, data retention, GDPR/local policy obligations as applicable, alert thresholds, and operational incident/rollback owner. Do not log tokens, PII, raw secrets, or sensitive client data.
- [ ] **Test specification and ownership:** Identify concrete Go package layout only after inspecting repository architecture. Define Firestore emulator integration tests, Go unit/race tests, TypeScript contract and browser tests, offline/network-failure fault injection, and cost/performance test budgets.
- [ ] **Release gates:** Decide approved rollout phase, shadow-mode acceptance, promotion procedure, post-release monitoring and explicit authorization for service deployment or enabling authoritative grants.

## Phase 1 — backend foundation (Go)

**Deliverable:** An isolated Go service with authenticated, versioned, testable contracts; no new privileged action enabled.

- [ ] RED: tests reject unauthenticated, expired/malformed/wrong-audience Firebase ID tokens, UID mismatch, unsupported API version, oversized/malformed payload, forged headers, service unavailable and account switching.
- [ ] GREEN: minimal Go `net/http` HTTP surface, context deadlines, structured error codes, input validation, Firebase Auth verifier, authenticated subject middleware and per-request UID scoping.
- [ ] Integrate Firestore with least-privilege server IAM. No service-account keys in source or browser; avoid sharing privileged Admin SDK credentials with untrusted clients.
- [ ] Design and version explicit contracts for completion submission, verification status, mission progress, read-only catalog/ownership, and settlement. Document request/response examples and idempotency semantics.
- [ ] Keep the current client flows fully operable when the service is not configured. Nonprivileged flows must have no mandatory network dependency.
- [ ] Test service-down, timeout, rejected auth, HTTP 429/5xx, aborted requests and recovery; no fake success, UI crash or lost local progress.
- [ ] Record observed RED→GREEN and Go test command/output. Do not claim production readiness.

## Phase 2 — server-verifiable race completion and anti-cheat

**Deliverable:** A trustworthy authorization boundary, or an explicitly blocked grant path if a trustworthy boundary is not available.

- [ ] Define server-issued, UID-bound, short-lived one-use race session/challenge, track/mode/physics version, eligibility, start/end server times, and idempotent completion ID.
- [ ] Assess canonical deterministic replay or authoritative server simulation, rather than blindly trusting browser result, score, time, steering/drift, finish flag or telemetry.
- [ ] RED tests for forged completion, fabricated track finish, impossible duration/speed/distance, edited client clock, old/unknown track version, invalid race mode, tampered event ordering, duplicate and replayed completion, challenge reuse and mismatched UID.
- [ ] Reject tutorial, practice, cancelled, incomplete, unknown or otherwise ineligible races at the server verification boundary.
- [ ] Protect against request floods, mass account abuse and retries with server-side rate limits, request size bounds, replay protection and monitoring. Defense-in-depth mechanisms are not a substitute for trusted outcome validation.
- [ ] Separate `localFinished`, `pendingVerification`, `verifiedCompletion` and `rejected`; frontend may continue showing personal/local result history without implying server verified reward eligibility.
- [ ] If server proof remains insufficient, return explicit `unverified` and **do not issue persistent grants**. Document the residual anti-cheat limitation as a release blocker.

## Phase 3 — exactly-once verified settlement (Go + Firestore)

**Deliverable:** Authenticated, atomic, idempotent record of eligible verified results, with no unapproved currency payouts.

- [ ] Preserve the client contract `createGarageSettlementGate(verify?: CompletionVerifier).settle(accountId, completionId)`; `verified` only means accepted evidence, never credits paid.
- [ ] Use a Firestore transaction or equivalently trusted durable atomic primitive, uniquely keyed by `(uid, completionId)`, with durable verification proof reference and schema/rules version.
- [ ] RED tests for two concurrent clients, multiple Go instances, reconnect/retry, same completion with different payloads, cross-user ID replay, transaction conflict and offline/unknown response.
- [ ] GREEN: commit at most once, return stable replay result, and never temporarily show uncommitted award/balance.
- [ ] Emulator test for direct user attempts to create/change server-owned completion or settlement documents.
- [ ] Explicitly block nonzero payout, wallet credits and claim success until separate economy approval.

## Phase 4 — authoritative daily/weekly missions and achievements

- [ ] Define/version eligible mission types, goals, UTC reset instants, day/week boundaries, progress limits and account-scoped identities.
- [ ] RED tests for duplicate event, late/out-of-order event, cross-account leak, clock spoof, UTC rollover, reset/replay, corrupted version, rejected/offline settlement and account deletion/recovery.
- [ ] Consume only verified event records at the server; atomically update mission progress once per event, no browser-supplied counters as proof.
- [ ] Expose read-only progress and pending/rejected states to the existing Garage/Results UI. Preview-only artwork remains labeled concept until authoritative progress exists.
- [ ] Trophy and achievement display may reflect server-proven milestones only. No real value, payout or ownership grant without approval.

## Phase 5 — authoritative cosmetics, economy and inventory

- [ ] Define versioned server-owned inventory/entitlement records and safe, explicit migration from existing local PAINTS, Skin Session and Cloud Save data. Legacy progress must survive migration; local display state is not paid ownership proof.
- [ ] RED tests reject forged localStorage, modified Cloud Save ownership, altered item IDs, client-admin fields, expired temporary trials, account-switch leakage, revoked entitlements and stale permissions.
- [ ] Keep existing free preview/trial behavior and default cosmetics operational, including when backend is offline; enforce backend authority only where real permanent ownership/grants are required.
- [ ] Test and preserve `coming-soon` / `trial` / `released` build-mode contracts in `docs/garage-release-policy.md`. Never ship previously locked trial modules accidentally.
- [ ] Implement only approved ownership reads and validated state hydration. Do not add wallet amounts, exchange rates, paid items or currency minting without policy sign-off.

## Phase 6 — store security readiness; transactions blocked until approval

- [ ] Define safe catalog, item ID, inventory lookup, entitlement eligibility, idempotency, audit records and explicit disabled/Coming Soon state.
- [ ] Do not add real prices, checkout, receipt validation, in-app purchasing, paid ownership, refunds or currency settlement without new explicit approvals for product policy, platform rules, finance, privacy and refund/revocation.
- [ ] If later separately approved: design provider-verified purchase receipts, server-side fulfillment, idempotent transaction handling, account-bound ownership, refund/revocation paths, reconciliation and abuse testing in a new reviewed scope.
- [ ] Store preview must still work without Go service, while Buy/Claim never silently becomes enabled.

## Phase 7 — Firestore Rules and Go service hardening

- [ ] Security Rules deny untrusted client writes to verified race completions, settlement ledger, mission authoritative counters, inventory grants and prices; allow only scoped reads required by approved client flows.
- [ ] Remember Firestore Admin SDK bypasses Security Rules: assert **service-side** ID-token verification, authorization, validation, transactional integrity and least-privilege IAM as separate tests.
- [ ] Emulator tests cover unauthorized/cross-account reads/writes, forged fields, concurrent operations, replay, credential expiry, account deletion and rollback.
- [ ] Verify secrets management, no credentials in repository, safe logs, TLS endpoints, rate limits, dependency audit, alerting and operational rollback. Never store user secrets in game assets.
- [ ] Define versioned migrations, data backups/recovery, compatibility across multiple app versions and stage-only dry-run verification.

## Phase 8 — zero-regression frontend integration and staged rollout

- [ ] **Before changes:** Record existing working flows at desktop 1440×900, phone portrait 390×844 and landscape 844×390, both en/zh-TW, offline/online, signed-out, account A→B, low graphics and reduced motion. Capture actual game screenshots/video.
- [ ] Keep gameplay simulation/physics, track selection, vehicle movement, race results/history, tutorial, PAINTS, Garage VFX trials, Store and Rewards previews functional with no backend. No mandatory backend call before entering a race or Garage.
- [ ] Introduce an optional, versioned Go client adapter; route privileged operations to Go only if available and approved. Clear account-scoped state on logout/switch; keep immutable local progress and old Cloud Save fields intact.
- [ ] Test `backend absent`, DNS/network failure, 401/403, 409, 429, 5xx, timeout, mid-race disconnect, reconnection, stale refresh, racing account changes and stale state responses.
- [ ] Shadow or read-only observation first; enable verified-only progress after demonstrated correctness. Keep new awards/payment capabilities disabled until explicit release approvals.
- [ ] Record rollback procedure that disables Go integration without deleting/migrating users' previous local race/garage data.
- [ ] RED→GREEN→REFACTOR for each regression, preserving graphics, controls, performance and accessibility. Never weaken tests, Cloud Save access controls or existing quality gates.

## Phase 9 — executable verification and CI

- [ ] Verify Go toolchain, `go.mod`, dependency compatibility and emulator startup; use the repository's actual prescribed commands, not invented scripts.
- [ ] Go: `go test ./...`, targeted `go test -race ./...` when supported, `go vet ./...`, tests for ID tokens, transaction concurrency and service-down behavior.
- [ ] Node/UI: `npm test`, `npm run typecheck`, `npm run build`, `npm run test:cloud` (with Java 21/Firebase emulators) and `make verify`; check Browser and World Tour separately.
- [ ] Keep existing Go unit/emulator tests and Node tests connected to CI with valid, minimal, scoped workflow changes only when implementation is authorized.
- [ ] Inspect current exact-HEAD GitHub Actions. For feature branch, require an actual `[full-regression]` run or supported manual full run; focused success with Browser/World Tour skipped is not sufficient.
- [ ] Validate no behavior break with Go stopped and with Go enabled. Capture genuine WebGL/screenshots and manual phone verification; CI is not a substitute.
- [ ] Run explicit anti-cheat abuse tests; record what is verified and what remains fundamentally unprovable in a client-rendered game.
- [ ] Commit and push only to `feature/wave3-garage-integration-20261105`; no PR, tag, deployment, main/develop change or force push without a new request.

## Future agent execution prompt

> Implement this Go backend plan task by task **only after the prerequisites and explicit authorization are satisfied**. Fetch fresh branch HEAD and follow project rules; inspect the existing frontend contracts before designing Go APIs. Keep all current game, Garage, offline and Cloud Save features operational throughout. TDD RED→GREEN→REFACTOR and verify on local tests, Firestore emulators, browser/mobile and exact-HEAD full CI. Never treat client race data as authoritative, never award/purchase/claim from the browser, and fail closed for grants if reliable Go proof is unavailable. When policy or authoritative race proof is missing, complete the safe foundation, preserve preview-only UI, and mark the privileged capability BLOCKED rather than fabricating success. Work only on the named existing integration branch, without deploy or PR.

## Final deliverable / reporting contract

Report in Traditional Chinese:
1. Exact branch and HEAD, including commit links and current exact-HEAD Actions URL.
2. Prerequisites met, missing or blocked; approvals and policy assumptions explicitly identified.
3. Go modules, API contract/schema, authentication/authorization model and Firestore Security Rules.
4. Verified anti-cheat proof model, abuse tests, threat limitations and release blockers.
5. TDD RED/GREEN evidence, Go race/emulator tests, Node/Cloud Save/Browser/World Tour and quality gate status.
6. **Before/after compatibility matrix**, including a backend-offline full game/garage play-through and preservation of existing local progress.
7. Security/privacy/rollout/rollback evidence, with no private data or credentials in this public repo.
8. Deferred payouts, wallet, store payment, receipts and entitlement grants until separately approved.
9. No claim of completion or anti-cheat protection without real observed tests and demonstrable authoritative verification.
