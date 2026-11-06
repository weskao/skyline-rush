# Race Rewards, Missions and Settlement — SDD Design Spec and BDD Acceptance

## 2026-11-02 — VERIFIED 3× SOURCE MATERIALS AVAILABLE (Wave 3 asset handoff)

**Read this before image generation or UI implementation.** The user's original `skyline-rush-3x-garage-rewards-and-missions.zip` was recovered from the ChatGPT File Library (SHA-256 `d526e1570865887924c09909f85d057186477cf189862ae351457847f4754b60`). All **eight original 3× transparent WebP icons** are now verified Git blobs in the **shared asset-only branch** `feature/3x-ui-materials`, pinned reference commit `82c7beda8bf5e0c409416c37b39cf1107a13f7e1`. Source: [asset library and exact Git blobs](https://github.com/weskao/skyline-rush/blob/feature/3x-ui-materials/docs/designs/3x-asset-library/README.md) and [Rewards/Missions WebPs](https://github.com/weskao/skyline-rush/tree/feature/3x-ui-materials/docs/designs/3x-asset-library/webp/garage-rewards-and-missions).

**8 actual files:** `mission-race@3x.webp`, `mission-time@3x.webp`, `mission-drift@3x.webp`, `mission-combo@3x.webp`, `trophy-bronze@3x.webp`, `trophy-silver@3x.webp`, `trophy-gold@3x.webp`, `trophy-platinum@3x.webp` (all **288×288 physical pixels**; set **96×96 CSS px** on use, e.g. `<img width="96" height="96">` plus `width:96px;height:96px;object-fit:contain`). Use `import.meta.env.BASE_URL` when copying approved assets into `public/feature-assets/garage-rewards-and-missions/raster/` to ensure GitHub Pages subpath support. Do **not** resize the original images to 1×: only the rendered CSS box is 1×. The PNG originals/source archive remain in ChatGPT File Library, not the Git branch.

**Next implementer's mandatory sequence:** (1) Sync latest `develop` only when branch dependencies/gates permit (never treat historical `main` instructions as the current integration target); (2) inspect the actual 8 WebPs and existing icons, reject glow halos / baked fake balances / illegible cutouts and select only suitable files; (3) fetch `origin/feature/3x-ui-materials` and copy approved Git blobs from `docs/designs/3x-asset-library/webp/garage-rewards-and-missions/` to runtime public path; (4) write RED BDD/tests for 1× layout, missing-image text fallback, en/zh-TW, verified-only rewards (no fake/pending payout), account isolation and retry idempotency; (5) implement Vue 3/TS at 96 CSS px and verify build/CI/WebGL and accessibility. Image existence does **not** approve settlement, create credits, make missions functional, or satisfy the rest of Wave 3.

---


**Repository:** https://github.com/weskao/skyline-rush
**Branch:** `feature/garage-rewards-and-missions`
**Wave:** 3 · **Source TODO:** 5.5, 5.9
**Status:** DOCUMENTATION ONLY · **Date:** 2026-10-31
**Dependencies:** Garage Economy Foundation merged; align scoring with Eight-Car Grid if it is already landed.

## 1. Goals and boundaries (SDD)

Future soft currency race payout and event-based missions; verified once-only settlement and compact results, account isolation, Cloud Save-safe idempotency. Do not invent rates or launch until economy approved.

This branch's design is limited to the stated responsibilities. The separate source-of-truth requirements for the full project are in [the planning TODO](https://github.com/weskao/skyline-rush/blob/feature/ux-ui-combo-mobile-controls/TODO.md); do not confuse this branch's inherited older `TODO.md` with the newer planning file.

## 2. Baseline and intended architecture

Current implementation paths to inspect first:
- `src/race-results.ts`
- `src/result-screen.ts`
- `src/history-achievements.ts`
- `src/cloud-progress.ts`

Design choices: isolate event/state contracts from presentation, use Vue 3 + TypeScript for screens/panels/controllers, keep simulation and Three.js hot paths unreactive, and avoid overlapping other branches' files where practical. `main` is the original implementation base, not proof that these features exist. If a dependency has changed an API, update this spec and the implementation plan before writing code.

## 3. Behavior (BDD — acceptance scenarios)

#### Scenario 1: Eligible finish

**Given** a race has a verified eligible completion ID

**When** results settle

**Then** one award and matching mission progress are committed once

#### Scenario 2: Duplicate

**Given** the same result renders or reconnects twice

**When** settlement repeats

**Then** no duplicate award

#### Scenario 3: Ineligible practice

**Given** tutorial or excluded mode ends

**When** results appear

**Then** no real currency is claimed

#### Scenario 4: Account change

**Given** account A finished a mission

**When** account B signs in

**Then** wallet and progress are not shared

## 4. Interfaces, migration and non-goals

- The owning implementation plan must define the smallest typed contract across affected source modules and deterministic tests before code. No unbounded new dependencies, classes or parallel state stores.
- Do not alter gameplay/ownership/race records incidentally or allow visual Quality to change physics, HUD options, progress or owned inventory.
- Preserve preexisting iPhone/Android browser input, keyboard/mouse, interruption recovery and finish/pause clickability; all new player copy must be bilingual.
- The following are mandatory review risks, with tests assigned in the plan:
1. Balance is not authorized until economy sign-off
2. Retry and replays must not double-mint
3. Firestore offline and account transitions are security-sensitive
4. Mode eligibility may change with eight-car branch
5. Results cannot promise credits while settlement pending

## 4A. Image Generation and Asset Contracts (Wave 2 / Wave 3)

**Decision:** Optional transparent original reward, medal, task and provisional coin glyphs, only for authorized UI. Never bake award amount, title, localized text or dates in pictures. Actual reward settlement remains authoritative, idempotent and separate.

- **Necessity gate:** review `src/icons.ts`, `public/icons/`, existing Vue/CSS/Three.js before making any image. The need for a concept sheet does **not** automatically justify a production bitmap. Record why the asset is needed and who owns it.
- **Prompt / production plan:** [Visual brief](../prompts/2026-10-31-garage-rewards-and-missions-visual-design.md); [Superpowers plan](../plans/2026-10-31-garage-rewards-and-missions-plan.md). The separately assigned future GPT may generate original images **only if actually needed and its image generation capability is available**; otherwise record the missing deliverable and use documented SVG/CSS/Three.js fallback. No pretend asset URLs or pre-emptive completion claims.
- **Alpha and formats:** true alpha RGBA PNG / compressed transparent WebP for isolated icon, badge, sprite or overlay, **not** white/checkerboard as image pixels; opaque compressed WebP/JPEG for standalone backgrounds. Actual vector SVG must be properly authored, not a renamed raster. Verify alpha over light, dark and saturated backgrounds, silhouette at intended CSS size, safe margins, transparent edge fringes and no baked interactive text.
- **Runtime semantics:** use real Vue 3 + strict TypeScript for controls/labels/rank/reward status; use shared Three.js renderer for 3D cars/dynamic VFX. Generated concepts are not runtime screenshots or fully implemented gameplay. No branded copyrighted lookalikes or unapproved real-money claims.
- **SDD → BDD → TDD / accessibility:** define asset semantics and ownership/loader contract, write failing behavior tests when a code behavior is missing, keep readable alt/label/fallback on asset error, test touch/focus and occlusion. Verified BDD edge cases:
  1. Given a pending or failed payout and a decorative reward icon, When the results panel renders, Then no claimed balance or award is displayed.
  2. Given a missing/corrupted icon image, When the player checks missions on mobile portrait, Then semantic text and status remain readable without accidental double claim.
- **Quality and measurement:** Low / Medium / High must preserve game state/critical HUD, en/zh-TW, mobile Android/iOS browsers in portrait+landscape and desktop, VFX Off, Reduced Motion and sound mute. Check image bytes, alpha, decoder/texture memory, first-use shader cost, Draw Calls, FPS and frame-time p95 where relevant. Inspect actual game output, not only a generated design board.
- **Completion:** do not check any `TODO.md` item `- [x]` until genuine asset integration, relevant SDD/BDD/TDD and CI are verified. This is a future implementation requirement, **not** an instruction to generate art now.

## 5. Cross-platform visual and performance acceptance

| Area | Required gate |
| --- | --- |
| Mobile | Android Chrome and iOS Safari/Chrome, portrait 320×740 / 390×844 / 412×892; landscape 844×390 / short-screen stress |
| Desktop/tablet | 1440×900 and tablet portrait/landscape with keyboard/mouse/touch as relevant |
| Quality | Low/Medium/High VFX fidelity may change; critical DOM/menu/HUD/ability meaning never disappears |
| Accessibility | `en`/`zh-TW`, safe-area, focus, 44px minimum touch targets, mute, Reduced Motion and VFX disabled |
| Real rendering | Before/after WebGL screenshots and Draw Calls/Triangles/FPS/frame-time p50/p95; note untested physical devices |
| Regression | RED→GREEN→Refactor, local test commands and exact-HEAD GitHub CI, then explicit merge approval |

## 6. Wave / merge gate

**Dependency:** Garage Economy Foundation merged; align scoring with Eight-Car Grid if it is already landed.

- [ ] Review and approve spec plus BDD scenarios before implementation.
- [ ] Read branch-local current `CLAUDE.md` and file-scoped rules; sync newest `main` after dependencies merge.
- [ ] Implement only per [the companion Superpowers Plan](../plans/2026-10-31-garage-rewards-and-missions-plan.md).
- [ ] Verify tests, actual screen/input behavior and performance; record evidence and only then check off relevant `TODO.md` items, with partial requirements remaining unchecked.
- [ ] Do not open PR or merge to `main` without explicit user authorization.

### Required shared constraints

- Baseline main commit: `bea47cf61c162b4341021fa6d24ca45850af7796`. Product requirements: [UX/UI source TODO](https://github.com/weskao/skyline-rush/blob/feature/ux-ui-combo-mobile-controls/TODO.md); **they have not yet been merged into main**. Before implementation reconcile this source into the working branch without overwriting newer main data.
- Planning-only commit. No source edits, no tests run, no merge/PR/deploy. Product spec and BDD are intended implementation contracts, not proof of behavior.
- Read the current `CLAUDE.md`, `.claude/rules/ui-architecture.md`, `performance-review.md`, `device-quality.md`, `touch-input.md`, `ui-phase-interactions.md` and domain-specific rules; follow newer revisions when implementing.
- New UI: Vue 3 + strict TypeScript (SFC `<script setup lang="ts">`), typed adapters for necessary JS physics/Three.js render loop. No Vue reactive writes or DOM queries per frame.
- Android Chrome and iPhone Safari/Chrome portrait + landscape, tablet and desktop; `en`/`zh-TW`, Low/Medium/High, VFX off, Reduced Motion, muted audio; preserve critical controls/data at every tier.
- Performance first with before/after real WebGL evidence, FPS, p50/p95 frame-time, Draw Calls, Triangles, GPU uploads; screen overlays and touch controls must not block the game.
- TDD RED→GREEN→Refactor, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:layout`, `npm run test:browser`, World Tour/Cloud Save when relevant, `make verify`, exact-HEAD GitHub CI. Only mark `TODO.md` item `- [x]` after each *fully implemented and verified* requirement is complete; never mark for a plan.
- Each agent owns its feature branch and specific files; dependent implementation waits for prerequisites merged into `main` after user approval. If source TODO is absent on the branch, first integrate the approved spec using an explicit non-destructive merge/cherry-pick and do not copy stale contents over main.

