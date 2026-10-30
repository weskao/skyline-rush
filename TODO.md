## UX/UI — AIR → ROAD CHAIN, tutorial and mobile controls (2026-10-31)

**Branch:** `feature/ux-ui-combo-mobile-controls` (created from `main`). **Scope of this chat:** requirements/documentation only for items 1–10; no gameplay, UI runtime, rendering, asset, persistence, purchase or CI configuration implementation. Items 4–5 (and the future economy) need separately approved feature branches. **Current step:** design and acceptance planning, not implementation. **Workflow:** trace the existing behavior → write failing regression tests (RED) → minimal implementation (GREEN) → refactor → full regression and exact-HEAD CI. Preserve existing race physics, player control authority, desktop input and en/zh-TW support.

### 1. 空地連擊 / AIR → ROAD CHAIN — hard to trigger (P0)

- [ ] Reproduce the reported low trigger frequency with real keyboard and mobile-touch play; trace the actual landing/flight state, input timing and clean-landing thresholds before changing any physics or rewards. The current advertised sequence is powered flight (BOOST or NITRO) followed by a smooth landing; compare it with the implementation and existing `tests/phase1-flight-flow.test.js`.
- [ ] Make the intended maneuver understandable and reliably achievable through normal player input (including an explicit precondition/ready or failure hint if helpful), without accidental triggers, double payouts or an exploit. Preserve the intended distinction between clean and hard landings and avoid changing unrelated modes.
- [ ] TDD: unit tests for eligible/short/ordinary/hard/collision landings, BOOST/NITRO combinations, single payout, cooldown/reset and race restart; real-browser desktop/mobile touch tests for player-triggered activation and localized on-screen/sound feedback.

### 2. Add 空地連擊 to the tutorial (P0)

- [ ] Add a dedicated AIR → ROAD CHAIN teaching step with concise en/zh-TW instructions: take off → use BOOST or NITRO in the air → land smoothly → observe the chain reward. Only advance after the real game event succeeds; show helpful retry feedback without taking control of the vehicle.
- [ ] Preserve existing tutorial progress/step transitions, free steering and normal inputs; do not teleport, auto-steer or silently grant a chain to complete the lesson. Check keyboard, touch, pause/resume, retry and accessibility announcements.
- [ ] TDD: RED → GREEN tests for both locales, genuine success vs failed landing, repeated attempts, no false completion, unaffected previous/next tutorial steps and normal race behavior.

### 3. Mobile in-race controls: ergonomics and optional customization (P1)

- [ ] Audit and improve mobile gameplay button positions, touch sizes and group spacing for comfortable thumbs and one-/two-handed operation (FLY, BOOST, NITRO, steering, accelerator/brake as applicable). Keep actionable hit targets at least 44×44 CSS px, preferably 48×48, without blocking the car, camera, HUD, minimap or results dialogs.
- [ ] Support narrow/wide phones, portrait/landscape, notches, safe-area insets, home indicators, browser edge-swipe zones and orientation changes; maintain pointer/touch release handling when phase changes or a button becomes hidden.
- [ ] Evaluate an optional **edit-controls mode** to drag/reposition entire control groups, with safe bounded zones, visible edit/confirm/reset actions, local preference persistence, sensible defaults and orientation-aware layouts. Dragging in edit mode must not steer/accelerate or disrupt normal gameplay; offer a usable non-drag alternative for accessibility. Do not require customization for a good default layout.
- [ ] TDD and acceptance: unit tests for layout bounds, save/restore/reset and touch cancellation; real-device/browser tests across representative phone sizes, two locales, landscape/portrait, multiple fingers and pause/finish transitions; no overlapping/unclickable UI or performance regression.

**Completion gates for items 1–3:** requirements confirmed against code; RED/GREEN evidence; Vue 3 + strict TypeScript preferred for new UI/controller code; `npm run typecheck`, `npm test`, `npm run build`, browser/layout regressions, `make verify` and full GitHub Actions `quality-gate` on the final branch HEAD. Do not mark implementation done, create a PR or merge to `main` based on this TODO-only commit.

### 4. Foldable and dual-screen layouts — separate future branch (P2; out of scope here)

- [ ] **Future branch only:** plan and later implement in an independently created `feature/foldable-layout-adaptation` branch from then-current `main`; do not implement foldable-specific layout code in the present branch.
- [ ] Define and verify target form factors, including cover screen, unfolded inner screen, portrait/landscape, split-screen, tabletop/flex posture and hinge/crease occlusion. User-suggested examples include “iPhone Duo” and “Samsung Fold 8”; confirm actual device availability, viewport specifications and browser support before making device-specific claims.
- [ ] Use responsive viewport/safe-area and progressive enhancement for supported fold/viewport-segment APIs, with graceful fallback in ordinary browsers. Keep HUD, track view, camera, minimap and touch controls reachable and readable without placing critical controls across a hinge.
- [ ] Set up an emulated viewport/hinge matrix and physical-device acceptance where available, covering layout changes while racing, rotation, taps, pointer release and performance. Use TDD and validate separately in its own branch.

### 5. Garage Skins / Preview Studio / Economy Planning (P2, planning first; implementation in separate branches)

**Current status:** planning and discussion only (2026-10-31). This is a large cross-cutting product area: Garage UI, Preview Studio, VFX cosmetics, inventory, rewards, currency, persistence and future monetization. **No implementation in this branch or conversation.** Finalize requirements and UX before creating smaller dedicated branches from the then-current `main`.

**Decisions accepted in this discussion:**
- **Confirmed:** Garage becomes an **independent full-screen page / Preview Studio**, not merely an enlarged dialog.
- **Confirmed:** during the initial rollout **all new Garage Skins may be previewed and temporarily equipped for free**. This is *trial access, not permanent ownership*; it must not be recorded as owned in the player account.
- **Confirmed:** provide extensibility for currencies, end-of-race rewards, missions and future real-money purchases, **but do not implement a heavy economy or paid checkout now**.
- **Recommended structure:** Garage Home → Preview Studio → Inventory / Collection. Garage Home shows equipped items and entries to Paint / Skins / Rewards / Missions / Shop (coming soon). Inventory groups Owned / Locked / Trial / Preview Only. Shop, currencies and missions may initially be visibly labeled Coming soon rather than pretending they already work.
- **Not yet selected:** final currency brand/icon, exact starter-skin quantities or pricing, item rarity and permanent-unlock rules. Proposed names: **Aero Core** or **Flux** (Pit Coin as an alternative); names/prices are *proposals*, not promised rewards.

#### 5.1 Scope and product goal

- [ ] Expand Garage from a simple dialog-based paint preview into a richer cosmetic system:
  - vehicle finish / paint
  - thruster / jet exhaust skins
  - airflow / wake / vapor skins
  - BOOST / NITRO trails, sparks, shockwaves and glow skins
  - race-start / launch flare / intro visual effects
  - future cosmetic categories (wheel glow, underglow, finish celebration, badge/banner, UI cosmetic packs, etc.)
- [ ] Keep all Garage customizations **cosmetic only**. No effect on car performance, handling, speed, hitboxes, scoring, physics, Ghost determinism or balance.
- [ ] Preserve compatibility with existing VFX settings, Reduced Motion, quality levels and accessibility constraints. The existing `src/GaragePanel.vue` is a dialog with `PAINTS` (vehicle paints and tail lights); do not break currently owned finishes or confuse existing progression unlocks with new trial cosmetics.

#### 5.2 Garage Preview Studio — independent full-screen page

- [ ] **Implement the decided full-screen Garage page / Preview Studio** rather than relying on only a small modal dialog. Evaluate whether to use an SPA screen or distinct client-side route while retaining browser history, mobile back navigation and clean return to the previous race/home state.
- [ ] Support:
  - larger preview canvas and full-car silhouette visibility, including exhaust and rear-light effects
  - front / rear / side / top / orbit / cinematic preview angles
  - rotate and inspect from different angles, including hold/long-press + drag to orbit; ordinary drag must also work for pointer/mouse users
  - release to resume slow auto-rotate, with an option to pause auto-rotate
  - reset camera and optional pinch / wheel zoom, with bounded distance and car always in frame
  - preview moving effects: idle thruster, airflow, nitro burst, launch flare, boosted trails, and optional finish effects
  - preview background options if useful (dark studio / bright stage / simple track-like scene), provided they do not obscure skins
  - change categories and items without leaving the page, with a stable camera unless the player chooses another angle
- [ ] Develop mobile and desktop layouts separately where necessary: large central car preview, categories/equipment controls around edges, safe areas, no clipping or interaction traps, and thumb-friendly actions.
- [ ] Confirm behavior when the player enters/exits Preview Studio during a running/paused game: game input released, preview-only resources isolated, no lingering overlays, WebGL state returned correctly, proper focus and history restoration.

#### 5.3 Cosmetic categories and starter catalog

- [ ] Start with a **small curated catalog** rather than a combinatorial matrix of effects:
  - Thruster skins
  - Airflow skins
  - Nitro / BOOST trail skins
  - Launch / intro flare skins
- [ ] Each category must distinguish default, preview, temporary equip, owned, locked, free trial, and future purchasable states; state transitions must be explicit and readable.
- [ ] Curated presets / bundles are preferred for a consistent "realistic × arcade racing" aesthetic. Plan visual themes (e.g. electric cyan, neon violet, molten orange) as examples, **not** final assets.
- [ ] Preview animation should be representative of actual gameplay and obey effect/quality constraints; do not ship a preview effect that differs materially from an equipped in-race effect.

#### 5.4 Interaction and controls inside Garage

- [ ] Design interactions for tap/click category selection, tap/click item preview, equip/unequip/restore default, hold+drag orbit, optional swipe browsing, pinch/wheel zoom and explicit VFX demo triggers (NITRO burst, launch flare, airflow loop).
- [ ] Offer dedicated touch-friendly camera controls and accessible keyboard/button alternatives; long-press should **not be the only** way to rotate the car. Dragging the car must not accidentally swipe categories or launch a race.
- [ ] Make preview, owned, locked, free trial, equipped and coming soon states distinguishable using both labels/icons and color; announce selection/changes for assistive technologies.
- [ ] Enforce camera bounds, no clipping of vehicle/trails, predictable close/back handling, and reliable pointer release after interrupted gestures.

#### 5.5 Currency, rewards, missions and acquisition design

- [ ] Design an item acquisition matrix for eventual ownership via end-of-race rewards, missions/quests, daily/weekly tasks, challenge milestones, events and future shop purchase. Decide which items are earnable vs future premium before the shop is implemented.
- [ ] **Proposed starter acquisition matrix (not final prices/entitlements):** default skins = permanently free; selected Thruster variants = repeatable race rewards; Airflow variants = mission/challenge milestones; NITRO/BOOST trails = clean-driving or AIR → ROAD CHAIN achievements; Launch flares = event rewards or earnable long-term challenges. Keep paths to earn cosmetics without mandatory payment, make the cosmetic-only nature transparent and prevent limited events from permanently removing essential functionality. **During the accepted trial phase, all these new items remain trial-usable regardless of future acquisition path.** Validate difficulty, rewards and availability before committing.

- [ ] Keep a **soft currency** (earnable through play) concept separate from a **future optional premium currency**; do not make the premium balance or purchasing system live yet. Currency name, icons, prices, earning rates, caps and conversion policies remain design choices.
- [ ] Plan an end-of-race results summary showing earned currency, mission progress, cosmetic unlock progress and optional bonus multipliers **only once those systems genuinely exist**. Distinguish reward preview/projection from committed settlement.
- [ ] Define mission types in an extensible, event-based manner: race completion, clean landing / AIR → ROAD CHAIN, drifting, distance, challenge milestones, repeatable daily/weekly objectives. Avoid contradictory/duplicate reward grants after restart, reconnect or replay.
- [ ] Clarify the interface flows: Garage Home balance → Rewards/Missions → post-race settlement → Inventory → optional Shop (coming soon), without implying that payments or balances already work in the current game.

#### 5.6 Temporary free-use phase before the full economy launches

- [ ] **Chosen transitional rollout:** initially, all **new Garage Skins** are free to preview and use temporarily; none of those trial skins is granted as permanent inventory ownership merely by equipping it. Existing legitimately owned paint finishes remain owned and unchanged.
- [ ] UI must clearly say **Free Trial / Preview Period / Trial Equip Only / Not Permanently Owned** (localized in en/zh-TW), and explain in advance that future access may require earning or buying items.
- [ ] Keep `access`/`entitlement` separate from `ownership` and `equipped`; a saved trial selection, if needed to preserve UX, is only an appearance preference and never an inventory grant. Do not write trial ownership into Firebase/Firestore or another authoritative player profile.
- [ ] Define feature/config flags for trial access, item availability and store launch. A flag change must revalidate the selected cosmetic and gracefully fall back to the default if trial access expires; do not remove any legitimate owned items.
- [ ] During transition, keep existing paint unlock/progression rules and history intact; tests must cover switching accounts/devices, expired trial, offline cache, saved preference from older versions and restoration after reload.
- [ ] Provide transparent messaging before removing temporary access; do not promise a permanent entitlement or charge players for an item without a separately authorized future purchase flow.

#### 5.7 Future monetization readiness

- [ ] **Future-only architecture**, no real-money/IAP flow in the current implementation scope: soft currency, premium currency, packs/bundles, shop sections, time-limited offers, entitlement checks and server-validated purchases.
- [ ] Separate catalog metadata, inventory ownership, equipped preference, trial access, pricing, rewards and storefront/presentation logic. Do not bake "everything free" into the ownership schema or game physics.
- [ ] Plan interfaces/boundaries for catalog, ownership, reward ledger, purchase/store and UI. Prefer no premature external/payment dependencies and avoid engineering a working currency ledger until its feature phase.
- [ ] Before any real-money launch: verify platform/app-store and local legal requirements for virtual goods, refunds, disclosures, consumer protections and minors; require server-side validation, non-forgeable entitlements, idempotent purchase/reward settlement, account recovery and auditability. Never trust the client for authoritative paid balance/ownership.
- [ ] Specify migration, refunds, chargeback handling and ownership restoration **when** implementing payments. Do not make live monetization, revenue claims or store buttons without a compliant approved integration.

#### 5.8 UI assets, emoji, icons and visual language

- [ ] Design a coherent set of Garage/economy assets: soft-currency symbol, future premium-currency indicator, mission, unlock/locked, temporary trial, equipped, preview-only, thruster, airflow, NITRO and launch-effect category icons.
- [ ] Consider drawing custom icons/miniatures and optional preview thumbnails/reward illustrations in the game's **realistic × arcade racing** style, with suitable contrast and 1x/2x sizes. Emoji may be used as temporary planning placeholders but are not a reliable cross-device asset strategy.
- [ ] Keep labels and icon variants legible on phone-sized screens, in en/zh-TW and at reduced motion/low VFX settings. Use SVG or appropriate optimised raster assets only when justified; reuse existing icon sets where possible.
- [ ] Evaluate **Aero Core / Flux / Pit Coin** brand concepts and the reward/shop UI visual language before accepting a currency name; no new asset files are to be created in this planning-only change.

#### 5.9 Data model and persistence planning

- [ ] Draft versioned catalog entries for cosmetic ID, category/subcategory, visual preset/preview metadata, compatibility, rarity (if introduced), unlock conditions, optional price/reward metadata and availability.
- [ ] Model **owned inventory**, **time-limited trial permission**, **equipped selection** and **currency/reward balance** as separate concepts; clarify which are authoritative/server-backed vs local UX preferences. A cosmetic may be previewed without being owned.
- [ ] Keep backward compatibility with existing Garage `PAINTS`, saved paint choices and user profiles. Treat existing item IDs as stable keys; unavailable or removed SKUs must fall back safely rather than corrupt a saved profile.
- [ ] Design the entitlement/resolution order for future phases: permanently owned item > currently permitted trial item > default item. Never grant ownership from a local-only feature flag, and do not let account switching leak selections across users.
- [ ] Reserve extensible fields and migration/version strategy without committing to a speculative or working purchase schema now.

#### 5.10 Branch strategy

- [ ] Keep `feature/ux-ui-combo-mobile-controls` documentation-only for this design phase.
- [ ] Implement later on *independent* branches from the then-current `main`, in dependency order:
  - `feature/garage-preview-studio` — full-screen screen/navigation, cameras, interactions and current paints
  - `feature/garage-vfx-skins` — catalog, preview/apply, cosmetic ownership vs trial selection
  - `feature/garage-economy-foundation` — future currency/entitlement models, when economics are approved
  - `feature/garage-rewards-and-missions` — actual race payouts, mission progress and idempotent settlement, after foundation
  - `feature/garage-store-readiness` — future shop/checkout foundations only when separately authorized
- [ ] Avoid one enormous branch; each phase should work independently, keep the prior phase intact, have its own RED → GREEN → refactor cycle, and meet project merge gates before integration. No implementation/merge/PR requested now.

#### 5.11 Technical and UX acceptance

- [ ] Preview Studio must show the complete car and selected effect across desktop/mobile portrait+landscape, common notches/safe areas and varied vehicle/camera positions, with no broken back navigation or invisible clickable overlays.
- [ ] Test all preview interactions including two-finger gestures, short/long presses, keyboard/mouse, focus, repeat selection, pause/finish/race return and reduced-motion behavior in both locales.
- [ ] TDD coverage for catalog states, preview/equip/reset, trial-vs-owned distinction, trial expiration, invalid-skin fallback, persistence migrations, account switching, and, once built, reward settlement and mission progress.
- [ ] Check Low/Medium/High VFX and disabled VFX, reduced motion, sound/comfort preferences, render resource cleanup, GPU draw-call/triangle changes and p50/p95 frame-time; do not add unbounded particles or per-frame allocations.
- [ ] Future implementation branches must pass `npm run typecheck`, `npm test`, `npm run build`, browser/layout regressions, `make verify` and exact-HEAD GitHub CI; validate actual WebGL/physical-device behavior separately from simulated screenshots.

### 6. NITRO/BOOST readiness feedback and mobile control states (P0 usability / P1 visual polish; plan only)

**Goal:** players can tell at a glance whether they have enough NITRO/BOOST charge, whether a button is operable, and when a full charge is ready, without covering the road or depending solely on sound/color. Retain normal race/control rules; do not invent a new charge mechanic.

- [ ] Audit the actual fuel/charge thresholds, charging events, cooldown and toggle/input behavior in all race modes (including tutorial, no-flight restrictions and pause/finish). Decide what "one full NITRO bar" actually means against current code, rather than basing logic on an unverified mockup.
- [ ] Specify a **four-state UI contract** for NITRO and applicable abilities: **Disabled/Unavailable** (muted icon + short reason), **Charging** (accurate segment/ring progress), **READY** (persistent distinct halo + clear label/icon), **Active** (active outline/energy streak + remaining-use indication). Distinguish cooldown/no charge from globally disabled or mode-locked controls; never show READY when action cannot succeed.
- [ ] Trigger a **one-shot** distinct ready sound and short celebratory pulse/ring burst **only on the crossing into available/full state**, not on every frame, on repeated rerenders, or after pause/resume. Re-arm after genuine consumption/reset; debounce threshold jitter and prevent overlapping sound spam. Respect music/sound volume and mute, browser gesture restrictions, reduced motion, comfort options and haptics preferences.
- [ ] Recommend: short (e.g. 0.5–1.0 s) bright ring/shimmer and light outward energy effect when ready, followed by a subtle persistent ready indicator. The effect remains readable in low VFX quality, and any large flashes/rapid flicker can be disabled independently; no aggressive screen-wide flash or camera shake merely for meter completion.
- [ ] Provide optional settings for **ready sound**, **ability-ready animation**, **haptics** (if already supported), control opacity, scale and tooltip/help; defaults should be informative but non-disruptive, and never disable actual ability input just because feedback is off.
- [ ] Use existing input ergonomics audit from item 3 for button placement; minimum interactive hit targets of 44×44 CSS px (prefer 48×48), consistent NITRO/BOOST/FLY icon meanings, adequate thumb spacing and obvious pressed/held indication.
- [ ] Offer default fixed controls plus a separate optional edit mode for draggable **groups**; snap/bound movement to safe zones, save portrait vs landscape layouts, reset to default, and ensure edit gestures cannot accidentally trigger abilities. Do not require customization for usable defaults.
- [ ] TDD: charging/ready/consume/recharge thresholds, disabled reason, one-shot sound, muted/gesture-locked audio, animation preference, low quality/reduced motion, account/viewport preference changes, multi-touch and cancellation, race restart, menu open/close and tutorial/other race modes.

### 7. Mobile in-race HUD redesign — preserve the playfield (P1; plan only)

**Problem:** distance-to-finish, center hint/toast, telemetry, minimap, position/leaderboard and controls can collectively obscure too much of the game, especially mobile portrait and short landscape. Optimize *real viewport visibility* instead of merely reducing opacity or shuffling overlapping boxes.

#### 7.1 Concept directions to compare (from the visual concepts already discussed)

- [ ] **A — Minimal immersive / preferred baseline:** compact edge-anchored HUD, central racing view as clear as possible, contextual information auto-collapses when safe. Avoid hiding time-critical race requirements.
- [ ] **B — Balanced standard:** persistent but smaller position, progress, speed and map; optional expanded telemetry/leaderboard on demand; consistent across mobile and desktop.
- [ ] **C — Competitive custom:** more detailed standings/map/telemetry and configurable widgets, but always enforce occlusion and hit-target constraints.
- [ ] **Recommended hybrid to prototype first:** **A's uncluttered playfield + B's information hierarchy + item 3's optional control customization + item 6's strong but short NITRO-ready feedback**. Treat these as *concept proposals*, not verified UI screenshots or final art; retain options for comparison before development.

#### 7.2 Placement and disclosure rules

- [ ] Move distance-to-finish/race progress to a compact **top-edge progress strip** or slim side widget; show meaningful remaining distance/checkpoints without a large central panel. Preserve accurate progress for Sprint/Circuit/Endless/other modes, where "finish" may not apply; mode-specific wording required.
- [ ] Put key facts (position, speed, time/lap and available abilities) near safe outer zones, with a stable layout. Use small icon + number/status rather than a wide text card when localization allows; optionally collapse leaderboard and detailed telemetry.
- [ ] Keep minimap legible at a reduced size and offer a hide/minimize/expand choice, but never let it overlap steering or the car's rear/approach visibility. Check road/car/obstacle occlusion at realistic camera positions, not only rectangles.
- [ ] Replace **center-screen hint/toast** with brief edge-anchored chips or compact icon prompts outside the driving sightline, limit simultaneous notices, prioritize critical warnings, deduplicate repeats and allow dismiss/auto-collapse. Tutorial steps requiring attention may use a dedicated accessible panel, without taking steering control.
- [ ] Use temporary context cues (e.g. unobtrusive READY indicator) near the relevant button rather than stacking huge banners in the center. Avoid losing high-priority collision, objective or accessibility feedback when notifications are condensed.
- [ ] Rework pause, camera and global tools to remain discoverable/tappable without consuming a permanent large header; keep finish/results buttons above decorative overlays. Respect notch, Dynamic Island, home indicator, viewport resizing and safe-area CSS.
- [ ] Consider compact **custom SVG/icon/image assets** where they genuinely reduce text and noise. Pair every meaningful icon with an accessible name, and preserve localization and contrast. Do not replace crucial text/quantities with ambiguous art.
- [ ] Prioritize the lower-left/right **thumb zones** for driving controls, 44×44 CSS px minimum targets (prefer 48×48) and responsive gaps. Keep car/track visible between control groups; adapt landscape/portrait independently and test browser back-swipe edge interactions.

#### 7.3 Visibility preferences and behavior

- [ ] Offer sensible default HUD plus **Compact / Standard / Competitive** display-density presets (only if usability evaluation justifies all three), and separate toggles for optional map, leaderboard, secondary telemetry and hint verbosity. Required position/progress/warnings must never disappear accidentally.
- [ ] Keep layout preferences distinct from renderer quality and game rules; store locally unless a future explicit sync design is approved. No change to speed/physics/boost or scoring.
- [ ] For smaller screens: collapse low-priority widgets before shrinking touch targets or hiding important status; preserve safe zones for oncoming traffic, car and route. Avoid large semi-transparent overlays that still block visibility.
- [ ] Compare image/icon vs text treatments for: race position, remaining distance, map, speed, AIR → ROAD CHAIN hint, NITRO-ready, and finish notification. Record the chosen hierarchy before converting any widget to art.

#### 7.4 TDD and acceptance matrix

- [ ] Capture **before/after actual running-game screenshots**, not generated artwork, for 320×740, 390×844, 412×892 portrait; 844×390 and short landscape (including known 568×320 limitations); desktop 1440×900 and relevant tablets. Add foldable cover/inner screen variants later in item 4's separate branch.
- [ ] Test both `en` / `zh-TW`, browser safe areas, device rotation/resizes, compact vs expanded, accessibility font scaling, color contrast, reduced motion, VFX enabled, active AIRFLOW, nitro-ready/active, long hints, different race modes and results/pause transitions.
- [ ] Browser assertions: no overlap between critical HUD/controls, no control off-screen, no interaction blocked by translucent overlays, results/topbar controls remain clickable, and an explicit **central racing sightline occlusion check**. Test real touch/gesture paths and pointer cleanup.
- [ ] Verify layout does not add noticeable main-thread work, frame-time regression or excessive DOM churn; document any tradeoff between information density, visible game area and readability. Keep automated layout/browser/CI checks and physical-device visual acceptance as distinct gates.
- [ ] This is **documentation/specification only** at present. Any later implementation needs its own RED → GREEN → refactor, user approval, full `make verify`, exact-HEAD CI and real-device acceptance where possible.

### 8. Tutorial — 桶滾 / BARREL ROLL (P0; planning only)

**Goal:** add a dedicated barrel-roll lesson to the existing tutorial. Teach the actual player-input technique without automating steering or creating a tutorial-only fake stunt. This is **a TODO/documentation change, not an implementation**.

- [ ] Audit the current tutorial step flow, lesson-completion events, mobile touch controls, and actual barrel-roll rules in `src/game.js` before implementing. The current engine describes a barrel roll as a **quick opposite-direction steering press while airborne** (existing `TRICK_FLICK_WINDOW = 0.3` seconds and `TRICK_ROLL_TIME = 0.7` seconds); a **clean landing** pays `TRICK_NITRO = 0.25`. Confirm these thresholds and the relevant state transitions against the latest `main` when work starts; do not change them solely to force tutorial completion.
- [ ] Add a clear en/zh-TW teaching sequence: (1) gain speed and press FLY to take off, (2) quickly steer one way then the opposite way while airborne to initiate **桶滾 / BARREL ROLL**, (3) maintain control and land cleanly, (4) observe the trick feedback and +0.25 NITRO reward. Keep instructions compact and adapt keyboard / mobile-touch hints; distinguish **桶滾** from **空地連擊** (item 2).
- [ ] Advance the lesson only when the engine has confirmed the intended maneuver **and valid landing/reward**; do not pass on arbitrary steering, an incomplete roll, a failed landing, a collision or unrelated NITRO gain. Offer a short contextual failure/retry hint without flooding center-screen notifications (coordinate with item 7).
- [ ] Preserve total player control: no auto-steering, injected inputs, snaps, forced teleport, or assist that changes racing physics. Players may keep driving/steering during the lesson; handle retry, step transitions, pause/resume, reset, quick opposite thumb presses and lost/canceled touch pointers safely.
- [ ] Provide accessible success/failure feedback in both languages, visible with muted sound or Reduced Motion; optional effects and audio must honor existing VFX, sound and comfort settings.
- [ ] **TDD acceptance:** deterministic RED → GREEN tests for correct reversal timing, airborne-only trigger, valid vs hard landing, no duplicate reward, unsuccessful retry, tutorial-only step completion, normal race parity, en/zh-TW text and real keyboard/mobile multi-touch completion. Run tutorial/browser regression and full project verification/CI on the future implementation branch.

### 9. Tutorial NITRO sprint experience — do not finish on button press (P0, plan only)

**Player report:** in the tutorial, using NITRO ends the lesson immediately; the player cannot actually appreciate the speed, controls or visual effects. The fix must teach and demonstrate a real sustained boost, not merely detect the click.

- [ ] Reproduce with real keyboard/touch gameplay and capture the activation → result/coach overlay timeline. **Source audit evidence:** `src/interactive-tutorial.ts` defines `TUTORIAL_STEPS` ending in `nitro`; it currently treats `controls.nitro === true && car.nitroUses > nitroUses` as success and advances immediately because the completion condition explicitly bypasses the normal 0.4-second hold for `nitro`. Investigate whether the completion overlay, input teardown or camera/phase changes explain the abrupt visual stop instead of assuming that physics itself stops.
- [ ] **Agreed UX direction:** divide the lesson into **Activate → Experience the sprint → Acknowledge completion**. After pressing NITRO, keep the actual practice race running with working steering and accelerator. Show a small non-blocking localized cue (“NITRO activated — feel the acceleration!”) and visible speed/effect changes; do not instantly show the tutorial-completed panel.
- [ ] Propose a **minimum hands-on observation window** (initial UX target: about 1.5–2 seconds, to validate against existing NITRO duration and actual visual transitions). Prefer a state transition tied to the real activation/boost lifecycle over an arbitrary UI delay; optionally offer a **Continue** action after the demonstration rather than forcibly interrupting the effect. Do not artificially extend NITRO physics or increase speed merely for the lesson.
- [ ] Show clear progress for **READY / ACTIVATED / SPRINT IN PROGRESS / COMPLETED**. Explain what the player should watch for (speed increase, appropriate camera/jet trails) and give a retriable hint if the press did not consume a valid charge. Do not mistake an already-active NITRO, an unrelated NITRO gain, or a held/replayed input for a fresh activation.
- [ ] Keep the intro coach and toast compact per item 7 (do not block the road); retain all driving controls and camera visibility through the entire demonstration. Align this teaching moment with items 2 (AIR → ROAD CHAIN), 6 (NITRO-ready feedback), 8 (BARREL ROLL tutorial) and 10 (high-speed visuals), without forcing the tutorial to exercise unrelated skills.
- [ ] TDD RED → GREEN: activation alone must **not** immediately complete the lesson; a genuine activation plus an actually observed sprint does; no charge / repeated press / pause-resume / reset / reduced motion / muted audio / invalid frames cannot advance prematurely. Preserve speed/physics determinism, existing steps, tutorial completion controls, both locales, desktop keyboard and mobile touch; verify real gameplay and exact-HEAD CI before checking off.
- [ ] **Done when:** the player can visibly continue driving and experience a meaningful stretch of the NITRO effect before the lesson ends, without a frozen frame, premature overlay, control loss or fake acceleration.

### 10. High-speed sprint sensation — NITRO, BOOST and top-speed visual language (P1 UX / P2 renderer polish, plan only)

**Goal:** when actually accelerating quickly or approaching each current mode/track's effective top speed, the game should convey exhilarating speed **without obscuring obstacles, the car, controls or the road**. Emphasize the existing “realistic vehicle/environment × arcade effects” visual identity; respect that BOOST and NITRO have different charge and acceleration rules.

#### 10.1 Reference-study notes (inspiration, not a request to imitate copyrighted artwork)

- [ ] **Need for Speed Unbound:** EA describes high-energy visuals/audio and Burst Nitrous; useful pattern = a distinct short **activation punctuation** followed by readable in-motion trails. Official: https://www.ea.com/en/games/need-for-speed/need-for-speed-unbound/features and https://forums.ea.com/discussions/need-for-speed-unbound-discussion-en/under-the-hood-show-up-and-show-off/9398276 .
- [ ] **Forza Horizon 5 / Hot Wheels:** official accessibility notes cover adjustable camera FOV, motion blur Off/Short/Long, camera movement and HUD options. Useful pattern = convey speed but **keep these effects individually controllable and comfortable**. Official: https://support.forza.net/hc/en-us/articles/4409280058259-Forza-Horizon-5-Accessibility-Support .
- [ ] **Asphalt Legends:** Gameloft describes Nitro Shockwave as a distinctive full-bar sprint. Useful pattern = unmistakable high-energy feedback at a meaningful ability threshold; **do not** import its double-tap mechanics or new Shockwave gameplay into Skyline Rush without separate approval. Official: https://gameloft.helpshift.com/hc/en/15-asphalt-legends/faq/606-how-do-i-perform-a-nitro-shockwave/?app_id=gameloft_app_20201014112613395-e42368ea99e21cf&faq_id=gameloft_faq_20201209100609272-e07e04f76030b91&is_preview=false&is_sdkx=false&language=zh-hant&p=winpc&platform_id=gameloft_platform_20180706081555519-996996bda0d4606&platform_type=ios .
- [ ] Collect before/after **real WebGL** screenshots/videos of current chase, front, cockpit/driver and other relevant camera modes, in all ten tracks, and use the references as design patterns, not literal asset or HUD copies.

#### 10.2 Three-phase intensity and speed-aware behavior

- [ ] Define a smooth visual intensity mapping from **real current speed, effective mode-dependent speed cap, acceleration delta and NITRO/BOOST active state**. Normal cruising = subtle; pressing boost = a short anticipation/activation accent; near effective top speed = sustained but restrained high-speed cues; effect eases down naturally on release, collision, braking, pause and finish. Avoid hard-coded fixed speeds across tracks or visually indicating a faster car than the simulation produces.
- [ ] **Phase A — activation (short):** localized exhaust/jet ignition flash, compact energy ring or shockwave trailing the car, brief audio accent and optional subtle camera impulse. Keep directionally grounded, not a blinding full-screen flash.
- [ ] **Phase B — sustained sprint:** mild interpolated chase-camera FOV expansion, peripheral speed lines / environment streaking, subtle edge-only radial or velocity-aligned blur, elongated exhaust/fluid trails, restrained bloom/afterimage and coherent wind/engine mix. The car, hazards, driving line, minimap, speed/ability controls and upcoming curves should stay crisp enough for reaction.
- [ ] **Phase C — easing/recovery:** taper intensity smoothly on deceleration and ability ending, without abrupt FOV snapping, camera jitter, black frames, disorienting repeated flashes or VFX persistence after pause/track switch.
- [ ] Reuse existing `src/vfx-settings.ts` capabilities (`speedLines`, `motionBlur`, `fov`, `shake`, `bloom`, `trailLength`, `afterimages`, `shockwave`) and current `src/world.js` speed-dependent FOV/lens plus `src/race-hud.ts` speed-line behavior; baseline/profile first to avoid duplicated post-processing or additional unbounded GPU allocations. Never make physics or render loop depend on Vue reactive updates.
- [ ] Distinguish modes: BOOST = cleaner airflow/thruster acceleration; NITRO = stronger but short-lived stylized burst and sustained streaks; both active = a coherent capped combination rather than additive flashes/blur that reduce readability. Near top-speed driving without abilities may have a lower-intensity natural speed cue. No new physics, speed caps, or NITRO charge behavior in this visual task.
- [ ] Preserve visual clarity in narrow mobile landscape, phone portrait and the tunnels/road gaps/high-curvature sections; disable or damp effects that hide obstacles or make steering feel disconnected. Assess performance on real devices; screen-wide post-processing is **optional**, not a default requirement.

#### 10.3 Player settings and acceptance

- [ ] Propose a high-speed effects preset: **Off / Subtle (comfort default if needed) / Cinematic / Extreme** while respecting the existing VFX enabled/disabled, Low/Medium/High, comfortable and Reduced Motion preferences. Off should retain accurate numeric speed and gameplay cues; animation intensity and sound remain independently configurable.
- [ ] For Reduced Motion/comfort: suppress shake, large FOV shifts, rapid flashes, hard blur and heavy streaks. Bound brightness/flicker frequency, avoid motion-sickness triggers, and do not put post-processing over important HUD text.
- [ ] TDD RED → GREEN for speed/intensity mapping, mode-dependent cap normalization, activation once-only, concurrent BOOST+NITRO bounds, start/stop/reset, race finished/paused/restart, threshold jitter, reduced motion, VFX off and quality switching. Ensure no geometry/resource leaks and stable frame-time.
- [ ] Visual acceptance matrix: all ten tracks where effects are applicable; driving viewpoints; desktop 1440×900, phone portrait 320×740 / 390×844 / 412×892, mobile landscape 844×390 and shorter screens; en/zh-TW; quality presets; speed cruise / onset / full boost / deceleration / tunnel / curve / collision / landing; no obscured car, road, obstacles, minimap or buttons.
- [ ] Compare **Draw Calls, Triangles, render uploads, CPU/GPU costs where measurable and frame-time p50/p95** on matching before/after actual WebGL runs, not generated pictures. Maintain current FPS pacing and physics. Require project `make verify`, browser/layout regression, world-tour/cloud-save checks as applicable and exact final-HEAD GitHub Actions; keep hardware visual/thermal acceptance separate.
- [ ] **Done when:** players can recognize NITRO/BOOST and approaching maximum speed by a distinctive, smooth and optional effect, while still safely reading the race and maintaining measured performance.

### Planning-only release order / boundaries (items 1–10)

- [ ] **P0 (first implementation candidate):** make AIR → ROAD CHAIN reasonably learnable/triggerable and add its tutorial (items 1–2); **add the dedicated barrel-roll tutorial lesson (item 8)** and **fix the immediately-ending tutorial NITRO lesson (item 9)**; plan the NITRO-ready state contract/one-shot notification (item 6) before choosing visual intensity.
- [ ] **P1 (mobile UX / speed feedback):** ergonomic touch controls and optional edit mode (item 3); refine NITRO states and audio/animation (item 6); implement the measured and accessible high-speed visuals (item 10) after baseline profiling; then refactor Mobile HUD and hints using A+B hybrid baseline (item 7). Avoid simultaneous unrelated rendering/physics rewrites.
- [ ] **P2 (independent branches):** foldable/dual-screen compatibility (item 4); independent full-screen Garage Studio, Skins and trial access (item 5); **economy foundation/rewards/store only when separately approved**.
- [ ] Confirm mockups and acceptance conditions before implementation; future branches start from current `main`, preserving project Vue 3 + strict TypeScript preferences, TDD, visual proof, CI gates and existing gameplay. **Nothing under items 1–10 is marked complete by this document update.**

## Endless Highway — all ten tracks and seamless continuation (2026-10-30)

**Branch:** `feature/endless-highway-all-tracks`. Keep the existing MODE-09, do not add a twelfth mode. The original finite Sprint/Circuit/Ghost tracks must remain unchanged.

- [x] Extend the existing Endless Highway selection to all ten tracks: Coast, Neon, Canyon, Aurora, Sky Spiral, Taipei, Tokyo, Alpine, Coastal and Cosmic. Retain each route's theme and original finite-route behavior.
- [x] Add deterministic absolute-distance road/scenery continuation, local-origin camera/geometry and bounded traffic, pickups, rings, chunks and collision windows; preserve World Tour themed scenery beyond the authored finish.
- [x] Add TDD coverage for all ten tracks at 25/50/85 km, finite-vs-endless parity, World Tour stream bounds, Sky Spiral helix joins, render-frame parity and landmark fade/teleport regressions.
- [x] Add CI screenshot capture at 85 km for all ten Endless routes; publish the actual WebGL images through the existing `race-mode-screenshots-*` artifact upload, so exact-HEAD visual acceptance can be reviewed before merge.
- [ ] Physical-device manual acceptance: long-drive road seams, steering/flight transitions, occlusion, thermals and real GPU frame pacing across ten tracks (software WebGL CI is not hardware evidence).

**Merge gate:** require full exact-feature-HEAD GitHub CI GREEN (typecheck/unit, 8/8 browser incl. responsive layout, 6/6 World Tour, cloud save and quality-gate) and inspection of captured WebGL screenshots. Then direct non-force merge to `main` without PR and verify `main` CI. Historical passing SHAs are not substitutes for the current HEAD.


## Tokyo classic finish — dead results buttons on iPhone, intermittent (2026-10-30)

- [x] Report: v0.27.0 (already carries the request-next-frame-first fix), phone, not every run. Static review of stacking (`.race-overlay` 4 < `.aero-tools` 6 < `.topbar` 7), `inert`, pointer capture, `canRace` early return and touch-control hiding found no deterministic blocker.
- [x] Real-browser repro attempts, all green: desktop real drive from 4000 m (held ArrowUp); Chrome phone 390×844 with a CDP touch held on the gas through the finish, then real taps on camera/Race again; WebKit phone tap-only. `elementFromPoint` hit the buttons, `pageerror` empty.
- [x] Instrumentation: `src/crash-log.ts` stores the last 8 uncaught errors/rejections with phase/track/mode in `localStorage` (`skyline-rush-crash-log`); `?diag` shows them in `#error-message`. Unit: `tests/crash-log.test.js`; browser: injected frame error recorded with `main.js`/`world.js` stack and read back after reload with `?diag`. `finish-frame-recovery` + `tokyo-finish-controls` specs 6/6.
- [x] Clue: happens after several object collisions. Repro with 10 (Chrome phone, gas held) and 12 (WebKit phone) wall hits then a real finish: still green, frame loop alive, no errors, buttons tappable.
- [ ] Hypothesis to A/B on the phone: iPhone-only, impact-only code is the iOS 18 switch-tick haptic (`src/haptics.ts`, `label.click()` on a hidden `<input switch>` per hit, shipped 0.25.0 on 2026-10-28, two days before the first dead-buttons report). Turn **Haptic feedback** off in the VFX menu and race Tokyo several times; if the freeze stops, the haptic path is the cause.
- [x] Occurrence on the phone (iPhone, Chrome, dev server via Tailscale, Coast classic, 3 contacts, 1st place, results card fully drawn): `?diag` after the freeze showed `crash log: empty`. A frame exception reaches `window` `error` (nothing in `frame()` catches), so the freeze is **not a throw**: a hung main thread, a stopped loop without an exception, or taps that never become clicks.
- [x] Silent-kill candidate: the `pagehide` handler at the end of `src/main.js` (initial commit) cancels the frame, destroys controls and disposes the world once when `event.persisted` is false, with no recovery. If iOS fires it without a navigation (app switch, share sheet, Dynamic Island activity) the game dies exactly like the report: no error, every button dead, only a reload helps.
- [x] Instrumentation round 2 (`src/crash-log.ts`): lifecycle events (`pagehide`/`pageshow`/`visibilitychange`/`blur`/`focus`/`freeze`/`resume`, with `persisted`) are logged like errors; `?diag` now runs a live panel: clock + game-loop frame counter (wrapped `requestAnimationFrame`) + phase/track/mode, `visibilityState`, `activeElement`, last 6 input events (`pointerdown/up/cancel`, `click`, `touchcancel`, got/lost pointer capture) with the `elementFromPoint` hit, and a heartbeat persisted every 500 ms (`skyline-rush-diag-beat`) shown as "before reload" after a refresh. Unit `tests/crash-log.test.js` 4/4; Chrome phone against the dev server: frames advance, tap listed with hit target, no page errors. `npm test` 1136/0, typecheck clean, build OK.
- [ ] Reading the next frozen screenshot: panel clock behind the status-bar clock → main thread hung; clock moving but `frames` frozen → loop stopped (check for a `pagehide` line in the log); taps listed as `pointerdown` without `click`, or `pointercancel`/`touchcancel` → iOS turned the tap into a gesture; `hit=` not the button → something covers it; no input lines at all → events never reach the document.
- [x] Second occurrence with the live panel (Coast classic, iPhone Chrome): every tap on Race again / Choose track / History shows `pointerdown` → `gotpointercapture` → `pointerup` → `lostpointercapture` on the button itself, `hit=` the button, **and no `click`**. Nothing covers the buttons and nothing of ours cancels touch events there (`preventDefault` only on driving buttons/slide pad, hidden at finish). Lifecycle log: `pagehide persisted` + `visibilitychange` at 11:43:05 while paused, no later `pageshow` — not the kill switch (frames kept running).
- [ ] Hypothesis (WebKit phantom touch): WebKit withholds the release of a touch that became the iOS back/forward edge swipe (`.claude/rules/touch-input.md`, bugs 136531/239014). While that touch stays "down" in the web process, every later one-finger tap is a second finger: `isPrimary=false`, `touches.length=2`, and WebKit synthesizes no `click` — until a reload. The slide pad keeps 20 px clear of the side edges, but the steer/pedal **buttons** start at 12 px (`.touch-controls { left: max(12px, …) }`, `src/style.css` 414/690), inside the edge-swipe zone. Frantic steering after collisions pushes a thumb outward → fits "after several hits, intermittent, phone only, any track".
- [x] Instrumentation round 3: panel lines now newest-last (banner grows upward and clipped the header), `touchstart/touchend` with `touches=N`, `NOT PRIMARY` marker on non-primary pointer events. `tests/crash-log.test.js` 4/4, typecheck clean, build OK, Chrome phone check green (`touches=1`/`0` on a healthy tap).
- [x] Third occurrence, panel with touch counts (iPhone 16, iOS Chrome, haptics off, calm off, VFX on and off; user: every race with a collision): nine minutes after the finish, the first tap on Race again delivered `pointerup button.touch-boost … NOT PRIMARY`, `touchend span touches=1`, `pointerup div.touch-pad`, `touchend touches=0` — the BOOST button and slide pad, hidden at the finish, still held two touches WebKit had never released. While WebKit counts a finger as down, every later one-finger tap is a second finger and gets no `click`. Not the edge-swipe zone: the stuck targets were controls hidden with `display: none` (`phaseUI` sets `hidden` on `#touch-controls` at paused/finished) while fingers were on them. Haptics ruled out.
- [x] Fix (`src/style.css`): `#touch-controls[hidden]` hides by `visibility: hidden` and keeps its grid box (the global `[hidden] { display: none !important }` rule now excludes `.touch-controls`), so a finger that was on gas/boost/pad at the line still has a target for its release; `visibility: hidden` is not hit-testable, so nothing covers the results buttons. RED → GREEN: `tests/tokyo-finish-controls-browser.spec.js` "touch controls hide by visibility at the finish" (old CSS: `display: none` / `visible`; new: `grid` / `hidden`, gas centre hit-tests outside `#touch-controls`). Finish-controls 5 passed + 1 desktop skip; `depth`/`finish-frame-recovery`/`browser.spec` touch-finish-pad subset 55 passed; `npm run test:layout` 42 passed; `npm test` 1136 pass / 1 fail (`tests/aero-vfx.test.js` "ambient history retains absolute XYZ", in-progress airflow work from another session, unrelated).
- [x] Verified on the iPhone 16 (iOS Chrome, dev server): after the CSS change the results buttons respond again after collisions.
- [x] Diagnostic panel kept, out of production: `src/crash-log.ts` loads only through `if (import.meta.env.VITE_DIAG) import(…)` in `src/main.js`, so a normal build drops the module; `make dev-diag` / `make phone-diag` set the flag and the banner shows without any URL parameter; `scripts/assert-production-locked.mjs` refuses a `dist/` containing its storage key (`skyline-rush-crash-log`), like the unlock marker. `src/main.js` shrank to 686 lines (ceiling lowered).
- [ ] Release: add the player-facing Upcoming What's New entry (results buttons respond after a race on iPhone) before `/release`.

## Barrel-roll wake correction (2026-10-30)

- [x] Clarify the intended trigger: existing airborne quick steering reversal (`player.trick`, 0.7-second barrel roll), rather than independently rotating showroom airflow. The earlier AIRFLOW recordings below do not demonstrate this requirement.
- [x] RED: corrected owner tests produced 7 pass / 3 fail for missing automatic roll wake, unwanted showroom spirals, and missing roll lifecycle.
- [x] GREEN: follow the real vehicle transform; activate appended helical streamlines, world-space vapor and the existing historical ribbon only during a real roll, then fade. Do not require AIRFLOW preview or BOOST, alter physics/scoring, or fake exhaust/FOV feedback. Low omits the added effect, Medium/High increase detail; VFX enabled/density/opacity/reduced-motion/comfort remain authoritative.
- [x] Owner and shader safety tests: 14/14 pass, covering completion retained until landing, cancellation, pause, reset, read-only simulation and immediate clearing of already emitted roll-owned trails after a visual setting is disabled. Independent narrow re-review found no remaining actionable issues.
- [x] Real keyboard/touch WebGL regressions plus warmup/black-frame checks: 5/5 pass. Full Node execution: 1131 pass / 3 skip; type checks and production build pass. Final dedicated World Tour: 326/326 pass.
- [x] Wake history height origin: `ambient history retains absolute XYZ` was RED on Alpine (0.073 m drift when the render origin's height moved); `update()` now takes `originY` and `world.js` passes the road height. GREEN: aero-vfx 13/13, Node 1137 pass / 3 skip, `vue-tsc` and both `tsc` projects clean. Software WebGL, not a device benchmark; the browser gate is unchanged.
- [ ] Full local browser gate and exact-change CI: browser 745 pass / 3 skip / 5 fail; isolated retry 5 pass / 1 fail (mobile theme scenario loses gameplay inspection hook after logged source reload). Keep shared-preview HTTP failures and source-reload interference distinct from the passing roll checks; do not mark merge-ready. See `artifacts/barrel-roll-wake/verification.md`.
- [x] Corrected desktop/mobile `screen-record` MP4s each demonstrate three real input-triggered rolls with AIRFLOW preview/BOOST input off, Low/Medium/High detail, and return-to-center touch steering. Telegram message_id: 22969 / 22975; paths and receipt metadata in `artifacts/barrel-roll-wake/delivery.json`.
- [x] Send three annotated real-game key frames (message_id: 22972 / 22973 / 22974), plus controlled Git-original/current before-after WebGL images (message_id: 22977 / 22978 / 22979). A/B asserts identical race state, vehicle/camera transforms and sky pixels; final files retained in `artifacts/barrel-roll-wake/screenshots/`.

## Earlier airflow interpretation — superseded by barrel-roll correction (2026-10-30)

- [x] Review shared AIRFLOW renderer and caller in `world.js`; scope: `aero-vfx.js`, owner unit/browser tests and this evidence log. Existing JS shader renderer remains the deliberate hot-path exception; no UI/state/physics change.
- [x] RED: `node --test tests/aero-vfx.test.js` — 6 pass, 2 fail because paired spirals and rotation are absent.
- [x] GREEN: paired expanding counter-rotating wakes share the existing flow geometry/material/draw; controls, reduced motion and reset respected. Owner + shader safety: 12/12 pass.
- [x] Quality RED → GREEN: regression first failed on unbounded submitted geometry; Low now omits the new wake, Medium draws one 32-segment pair, High adds a 64-segment pair. Actual custom Quality dropdown switches verified in Chrome; disabled/AIRFLOW/density/opacity controls suppress the wake without GPU allocation or uploads.
- [x] Type checks, production build and full Node suite: 1129 pass / 3 skip / 0 fail. New test timeout initially tripped the CI-budget guard; corrected to the existing `ciTimeout` helper. Shader warmup and NaN/bloom checks pass.
- [x] Before/after real-WebGL measurements on all ten tracks and desktop/phone screenshots: `artifacts/airflow-wake/verification.md`, `before.json`, `after.json`, `before.png`, `low.png`, `medium.png`, `high.png` and `native-results/`. Medium adds 512 triangles to the shared batch, no added flow draw calls; short p50/p95 samples are observations, not thermal/performance claims. Final full-resolution airflow + black-frame + shader-warmup: 3/3 pass.
- [x] World Tour full suite: 326/326 pass (`CI=1 npx playwright test --config=playwright.world-tour.config.js --workers=2`). Independent code review: no actionable introduced findings.
- [ ] Full `make verify` green: type/unit/build passed, then the full equivalent browser command (`CI=1 npm run test:browser -- --workers=4`) reported 742 pass / 3 skip / 6 fail. Failures: Endless desktop-en/phone-zh, Event Lab edit/import/export desktop-en/desktop-zh/phone-zh, finish-frame recovery phone. All three files pass independently (12/12); Vite reloads coincided with the original failures, but the full suite remains recorded as red. Full-resolution parallel trials were interrupted after contention/timeouts, not counted as successful gates.
- [ ] Exact-change GitHub `quality-gate`, cloud emulators, physical iOS/Android, thermal and continuous long-distance acceptance. Changes remain uncommitted; no push, PR, merge, tag or deploy performed.

## Mobile race HUD overlap — all devices (2026-10-29)

**Branch:** `fix/mobile-hud-overlap` from `main` `0a08d02`. **Report:** Android phone, zh-TW, AIRFLOW on mid-race — telemetry panel covered the speed readout; toolbar crowded.

- [x] **RED** (`tests/responsive-browser.spec.js` › racing HUD blocks stay apart, AIRFLOW on, new 375×667 / 412×892 Android-15 / 390×844 notch / 820×1180 iPad sizes, on-screen edge checks): 12 of 15 failed on `0a08d02` — `.airflow-hud` × speedometer/flight telemetry/POSITION/leaderboard (phones, landscape), `.race-route-map` × `.race-progress` (notch/Android top inset), `.race-progress` × `.aero-tools` (820px iPad), PAUSE off the right edge (375–400px en), POSITION × speed (844×390 with home-indicator inset).
- [x] **GREEN** (`src/style.css`): AIRFLOW panel shows on the ready showcase only on phones/short landscape; live map follows the top inset; iPad AIRFLOW bar moves under the leaderboard; compact CONTROLS label ≤400px; 5px tighter POSITION lines on short touch landscape. Responsive spec 72/72, unit 837 pass / 0 fail, typecheck, `test:layout` 37/37.
- [x] **RED → GREEN, round 2** (Playwright `devices` matrix, AIRFLOW on, real PAUSE/resume taps, 21 profiles × en/zh-TW): the pre-fix build failed 30 of 42 and round 1 still failed 5. Fixed in `src/style.css`:
  - Touch landscape under 761px wide (740×360, 750×342, 658×320, 640×360) fell into the portrait HUD, so every block stacked. It now uses the landscape HUD, with a narrowed centre column.
  - 1024×768 zh-TW: the AIRFLOW channel list no longer overlaps the speed readout (hidden below 840px tall).
  - 780×360 and 814×380: the ≤380px-tall leaderboard shift ran 7px into the progress bar. Its width and the progress bar now follow the shift.
  - 480×1040 en: PAUSE was off the right edge. The wordmark hides mid-race up to 540px.
  - Spec sizes added: 740×360, 750×342, 780×360, 814×380, 480×1040, 658×320, 640×360. Matrix now 0 of 42 failing.
- [x] Stylesheet baseline (`tests/fixtures/main-ui-contract.json` `cssBlob`) re-recorded for these intentional changes.
- [x] Known limit: 568×320 (iPhone SE 1st gen landscape) is too narrow for the centre column. The layout is verified down to 640px wide.
- [ ] Exact-HEAD GitHub CI `quality-gate`.
- [ ] Physical-device check on the reporter's Android phone (emulated viewports and Playwright device profiles only).

## Phase 5 — World Tour visual, road geometry & minimap polish (2026-10-29)

**Branch:** `feature/phase5-world-tour-polish`, created from `main` `7b1785e6`. **Scope:** Tokyo → Alpine → Taipei → Coastal → Cosmic, then ten-track regression and exact-HEAD CI. Plan: `docs/superpowers/plans/2026-10-29-phase5-world-tour-polish.md`.

- [x] Audit project architecture, track/renderer/minimap rules, current World Tour assets and regression suites; create feature branch and plan. **Code-only audit**; real WebGL baseline and profiling below remain pending.
- [x] Observe explicit RED for Medium vs High renderer budget on `962a1d1` — CI unit failure: Taipei low/medium/high=10/14/14. GREEN at `629fc3cd`: 818 passed, 0 failed, 3 skipped; TypeScript typecheck passed. Quality tiers now stream 10 / 12 / 14 chunks away from track ends, keeping Low's solid obstacles.
- [x] Verify cached Alpine/Cosmic up/down map grade math against `trackPoint` and `routeMarker` in the same 818-pass unit run; localized en/zh-TW route ARIA labels. Browser RED for this separate addition was cancelled by newer commits and is **not** claimed as observed.
- [x] Inspect actual main WebGL screenshots for all five World Tour showrooms, plus Taipei 390×844 race. Main baseline: [CI run 40740557010](https://github.com/weskao/skyline-rush/actions/runs/40740557010), artifact `world-tour-screenshots-7`. Limited 0.25-DPR CI output; additional four-size acceptance remains open.
- [x] Integrate main `ca1c777` into feature as two-parent `7452aed`; compare returned `behind=0`, keeping main's centreline caching and Phase 5 changes.
- [x] **Automated WebGL capture, all five World Tour tracks:** Phase 5 CI [40814107324](https://github.com/weskao/skyline-rush/actions/runs/40814107324) and All Tracks CI [40836574538](https://github.com/weskao/skyline-rush/actions/runs/40836574538) captured 1440×900, 390×844, 320×740 and 844×390 showroom/race screenshots; `world-tour-screenshots-4` has 55 images (20×2 plus 15 tier/reduced-motion). Per-track draw calls, triangles, FPS, frame p50/p95 are recorded by 35 structured CI JSON files at exact `21a04546`; all samples use 0.25 DPR software WebGL.
- [ ] **Physical visual/diagnostic acceptance:** inspect World Tour car-road contact and camera occlusion while *playing* on real devices; obtain GPU memory, thermal and battery measurements (not available from current software CI).
- [x] **Tokyo tunnel automated continuity:** `tests/world-tour-tunnels.test.js` verifies 24m absolute shell spacing at every 120m chunk seam; full Phase 5 unit test and World Tour mid-race Browser CI succeeded on `29b23fbc`. Original tunnel-specific RED run was not verified; do not retroactively claim it.
- [ ] **Tokyo manual visual signoff:** verify night reflections, elevated structures, road/car clearance and rapid camera changes on a physical device, including real high-speed steering.
- [x] **Alpine automated tunnel/road coverage:** the same 24m seam test covers both normal tunnels and boost tunnels, road-vs-physics geometry checks include Alpine, and mid-race WebGL long sweep completed successfully in Phase 5 CI.
- [ ] **Alpine manual visual signoff:** inspect both rock bore entrances/exits, terrain/railway occlusion, full car pose and camera clearance while steering through the mountain road.
- [x] **Taipei automated scene evidence:** all four viewport sizes have actual WebGL racing/showcase captures, centreline/ribbon parity unit tests, and landmark/vehicle visibility probes across showcase cameras.
- [ ] **Taipei manual art signoff:** review city bend composition, building density, landmarks, high-speed traffic/AI and minimap legibility on the target devices.
- [x] **Coastal automated sea/scene coverage:** fixed world-sea-level RED/GREEN tests across 5 distances × 3 tiers, real WebGL captures and long mid-race sweep passed on final Phase 5 HEAD.
- [ ] **Coastal manual art signoff:** inspect bridge boundaries and shoreline layers for overdraw, clipping and perceived depth at high speed on actual displays.
- [x] **Cosmic automated road/route coverage:** orbit road ribbon parity, cached altitude route cues, landmark visibility probes and all four viewport screenshots exist with Phase 5 passing CI.
- [ ] **Cosmic manual gameplay signoff:** drive and fly/land along orbital edges on hardware; inspect banking, airborne transitions and visibility of distinct landmarks.
- [x] **Automated road, camera, Ghost and cloud parity:** Phase 5 `tests/phase5-road-parity.test.js` checks actual mesh vertices/normals against `trackFrame` for five tracks and three tier selections; separate six-camera showcase, occlusion, full-car framing, long mid-race tunnel sweep, existing race/Ghost tests and Cloud Save tests all passed Phase 5 CI [40814107324](https://github.com/weskao/skyline-rush/actions/runs/40814107324). No saved schema or centreline changes are introduced by this branch.
- [ ] **Manual gameplay signoff:** real-controller steering, vehicle collisions, AI traffic, Ghost/history and 30/60/Auto responsiveness under prolonged play remain to be checked on target devices.
- [x] **Automated responsive, i18n and accessibility coverage:** four World Tour viewports, en-US and zh-TW, static route SVG identity/ARIA, HUD/touch non-overlap and Low/Medium/High reduced-motion WebGL showroom screenshots passed Phase 5 CI.
- [ ] **Manual inclusive-UI signoff:** actual touch targets, assistive technology, locale switching and Low/High *in-race* appearance on physical mobile screens.
- [x] Diagnose full CI run [40749523514](https://github.com/weskao/skyline-rush/actions/runs/40749523514): Browser (3) failed on intentional CSS hash drift; Browser (7) failed on Playwright evaluate scope. Preserve existing stylesheet snapshot by moving height-cue styling onto the SVG and passing `original` into the browser context. Fix commits: `a5b2412`, `fb6ad2f`, `5c620d9`; final GREEN pending.
- [x] Observe material TDD RED in [40759524201](https://github.com/weskao/skyline-rush/actions/runs/40759524201), test `World Tour asphalt uses restrained destination-specific PBR`: Taipei low actual roughness 0.94, expected 0.93. Implemented five distinct non-mirror asphalt finishes in `74ff689` with unchanged physics and scene shader type; GREEN in [40760661908](https://github.com/weskao/skyline-rush/actions/runs/40760661908) (821 passed, 0 failed, 3 skipped; typecheck passed).
- [x] **Coastal water world-space stability:** observed TDD RED [40760327626](https://github.com/weskao/skyline-rush/actions/runs/40760327626) (low / 600m sea stayed at -33 despite road elevation); compensated scene origin in `8d5029f` without changing track/physics. GREEN in [40760661908](https://github.com/weskao/skyline-rush/actions/runs/40760661908) (821 passed, 0 failed, 3 skipped), across five road positions and all three tiers; real WebGL + draw-call comparisons are still pending.
- [x] **Phase 5 pre-LOD CI:** [run 40761170986](https://github.com/weskao/skyline-rush/actions/runs/40761170986) at exact `598089b4`: unit/typecheck, 8/8 browser shards, 6/6 World Tour shards, Cloud Save and full quality-gate successful. Layout also succeeded in browser shard 1. **This is historical GREEN, not proof for changes after `598089b4`.**
- [x] **CI software-WebGL captures:** run `40761170986` artifact `world-tour-screenshots-4` includes all five World Tour showcase/race frames at 1440×900, 390×844, 320×740 and 844×390 plus Low/Medium/High reduced-motion captures; screenshot render DPR was 0.25, so visual inspection cannot establish full-resolution or physical-device quality.
- [x] **Medium scenery density TDD:** RED in [run 40802631620](https://github.com/weskao/skyline-rush/actions/runs/40802631620) (`222a3b76`: Medium props indistinguishable from High); GREEN in [run 40802838647](https://github.com/weskao/skyline-rush/actions/runs/40802838647) (`096bb13f`: unit tests 822 pass / 0 fail / 3 skipped, TypeScript pass). Props per side now Low 2 / Medium 3 / High 4, with solid-road obstacles preserved; actual performance impact requires after-change benchmarks.
- [x] **Exact Phase 5 HEAD full CI:** `29b23fbc` completed [run 40814107324](https://github.com/weskao/skyline-rush/actions/runs/40814107324) successfully: typecheck, unit, 8/8 Browser incl. layout, 6/6 mid-race, Cloud Save and quality-gate.
- [ ] **Successor final-HEAD CI:** `feature/all-tracks-render-cache` includes Phase 5 and has newer rendering/CI changes. Await complete CI and quality-gate for its final commit; never use an earlier successful run as final-head proof.
- [x] **Runnable TDD RED/GREEN and full Phase 5 regression:** e.g. material RED [40759524201](https://github.com/weskao/skyline-rush/actions/runs/40759524201) → GREEN [40760661908](https://github.com/weskao/skyline-rush/actions/runs/40760661908); Coastal sea RED [40760327626](https://github.com/weskao/skyline-rush/actions/runs/40760327626) → GREEN [40760661908](https://github.com/weskao/skyline-rush/actions/runs/40760661908). Final Phase 5 CI covers typecheck, unit, build via Browser, layout, browser, World Tour and Cloud Save. Tunnel-specific RED was not observed.
- [x] **Capture software-CI baseline before Medium prop-density change:** run `40761170986` browser (4) logs at 1440×900 (0.25 DPR) measured Taipei 864, Tokyo 687, Alpine 462, Coastal 566, Cosmic 465 draw calls; p95 233.2 / 200.1 / 200.0 / 216.6 / 166.7 ms respectively. CI observations only; no same-hardware/thermal validation.
- [x] **Software-WebGL Before/After evidence:** pre-pool baseline [40803061305](https://github.com/weskao/skyline-rush/actions/runs/40803061305), global-pool [40814107324](https://github.com/weskao/skyline-rush/actions/runs/40814107324), and spatially bounded All Tracks [40836574538](https://github.com/weskao/skyline-rush/actions/runs/40836574538) provide five-track 1440×900 Medium draw calls/triangles/frame times and captured real WebGL screenshots. See [acceptance evidence](docs/phase5-acceptance-evidence-2026-10-29.md) for exact comparisons and regression caveats.
- [ ] **Controlled hardware performance acceptance:** benchmark identical scene/camera on the *same* physical GPU/phone (FPS, GPU memory, overdraw, power, temperature), because cross-runner software FPS/p95 and global-versus-spatial pooling are not directly comparable.
- [x] **Git ancestry and merge-conflict check:** `main` `ca1c777` is an ancestor of both Phase 5 and All Tracks (ahead 31 / 50, behind 0 as of review). All Tracks fully contains Phase 5; only one final merge is necessary and user already approved it.
- [ ] **Final integration:** check current main again; finish latest All Tracks required CI, visual acceptance and performance review, then safe non-force fast-forward merge with expected SHA and verify new main CI; do not merge on incomplete checks.

**Audio assessment:** Tunnel-shell alignment is purely geometric/visual; retain current effects and audio, and do not add redundant sound cues.

# TODO — Gameplay depth design

## Handoff checkpoint (2026-10-29)

Read `HANDOFF-TODO-2026-10-29.md` before continuing. This checklist aggregates completed work on the independent feature branches listed there; it does **not** mean those branches have been merged into main.

- [x] Preserve seven completed feature branches with complete local gates after main `ca1c777` and 119/119 required checks on the recorded published feature-code commits.
- [x] Verify REPLAY-02 recent Custom setups, result retry and independent editable copies using real desktop/phone browser controls; mark the original item below complete.
- [x] Implement Photo Studio HUD isolation and responsive controls on `feature/photo-studio-hud-isolation`; observe both REDs, pass 25 focused cases plus actual touch/control/PNG validation, and preserve original-resolution evidence.
- [x] Stop local work at the user's request and write the English handoff with branch names, worktree paths, exact commits, CI snapshots and restart commands. Original roadmap: 56/120 complete (46.67%), 64 remain.
- [ ] Photo Studio full make verify and exact-source CI: the final local run was intentionally stopped after 31 browser cases; PHOTO-01 remains unchecked below.
- [ ] Final handoff check found `origin/main@bc5299b` 51 commits ahead of local `main@ca1c777`; none of the nine feature branches contains it. Preserve handoff documents, integrate upstream when work resumes and repeat gates on the resulting source. Earlier receipts certify only their recorded baseline.
- [ ] Recheck the latest documentation HEAD CI on the eight earlier branches. Older feature-code CI is green; these newer runs are still incomplete at handoff.
- [ ] Physical Safari/Android, long-drive/all-quality thermal validation and independent review remain open. Merge into main, PR, tag and deployment still require explicit authorization.

## Photo Studio continuation — PHOTO-01 (2026-10-29)

- [x] Final responsive source `d4e4e73` passes strict TS/Vue/legacy checks and Node 815 / 0 failures / 3 emulator skips. Focused browser gate: 25/25, exit 0. Actual desktop/phone controls and PNG decoding pass; the phone capture uses real touchscreen taps. Receipt: `artifacts/photo-studio/controls-responsive/receipt.json`.
- [x] Preserve all work and stop local verification at the user's explicit handoff request. The final `make verify` was terminated with exit 143 after browser ordinal 31; no full-gate success is claimed. No task-owned browser/make processes remain. English handoff: `/Users/wes_flutter/Documents/Workspace/skyline-rush/HANDOFF-TODO-2026-10-29.md`.
- [ ] Upstream changed at handoff: `origin/main@bc5299b` is 51 commits ahead of the local ca1c777 main baseline and is not in this branch. Preserve this handoff-only TODO edit, integrate upstream when work resumes, resolve conflicts without dropping either side and repeat complete gates on the resulting source.
- [ ] Resume full `make verify` on `d4e4e73` (or the actual source being resumed) and inspect exact-commit CI run 40851948100. PHOTO-01 stays unchecked until these gates pass; later commits need their own exact-HEAD CI. Latest source is published; this handoff-only TODO edit is intentionally uncommitted.

- [x] Inspect main ca1c777 and the real modal/CSS/renderer lifecycle; create independent feature/photo-studio-hud-isolation. Baseline strict types and Node pass: 815 / 3 emulator skips, failures 0. Plan: docs/superpowers/plans/2026-10-29-photo-studio-hud.md.
- [x] RED observed: the real Photo Studio shows `.telemetry` despite the clean-preview contract; the new browser test fails Expected hidden / Received visible on unmodified main source. Log: artifacts/photo-studio/hud-red.log; original-resolution before image: artifacts/photo-studio/before-desktop-coast.png. Browser build is locked; no import/syntax failure.
- [x] GREEN: one modal-open CSS rule shows only the canvas and Photo Studio, also hiding optional body-level ?perf output. All 22 ten-track/desktop/phone/narrow/landscape real-game lifecycle cases plus the existing orbit/lighting/PNG test pass (23/23). Back restores prior visibility, native Escape stays paused, and real Resume drives again; page errors 0. Preserve 22 DPR-1 after images and receipt in artifacts/photo-studio/; six representative original-resolution images inspected. Existing UI/save sound is retained; no new music or render-loop state.
- [x] Narrow/safe-area RED observed: the 320x740 panel ends at y422 and overlaps actual visible-mesh car bounds starting at y338; a 59px safe-top case puts the panel at y12. Both browser assertions fail before responsive CSS changes. Log: artifacts/photo-studio/preview-safearea-red.log; original-resolution before images preserved. The first full gate was intentionally stopped (exit 143 after 162 browser passes); its partial log is not a passing full-gate receipt.
- [x] Responsive GREEN: narrow screens place the original orbit/FOV fields side by side; the modal honors shared safe-area variables and short-landscape width. Actual per-mesh full-car projection confirms no panel overlap in all 24 track/layout cases, including 59px portrait and 47px landscape insets; the existing PNG case also passes (25/25, exit 0). Car, camera and font sizes are unchanged. Preserve 24 original-resolution after-responsive images; four narrow/inset/landscape representatives inspected. Short-landscape actions remain reachable by scrolling.
- [ ] Cross-track desktop/phone and narrow/landscape original-resolution images, complete make verify and exact-HEAD CI; keep physical devices and thermal acceptance separate.

## Current main integration and verification (2026-10-29)

- [x] User-integrated `main@ca1c777` is an ancestor of `4117dcc` on `feature/regression-gate-repair`; tracked tree was clean and no unresolved merge conflicts were found.
- [x] All six owning caller branches pass complete post-merge make verify on their user-published code: Cup, Custom, Items, Event Lab, Endless and Circuit. Receipts identify exact SHAs in each owning TODO. This helper has no separate standalone local full-gate receipt.
- [x] User-published helper code `4117dcc` passes all 17 required GitHub checks including quality-gate: https://github.com/weskao/skyline-rush/actions/runs/40818547878 . Later TODO-only commits need their own latest-HEAD CI before merge.


## Current main integration and verification (2026-10-29)

- [x] Integrate `origin/main@bc5299b` (51 upstream commits): no conflicts; `src/world.js` landed one line over its ratchet ceiling (both sides removed the same blank line, main added classic-road cache state), so `4d9f5f7` folds the `trackId`/`carBank` declarations instead of raising the ceiling. Complete make verify on `4d9f5f7` exits 0: strict TS/Vue/JS, Node 844 / Browser 526 / World Tour 303; 3 emulator skips and 2 desktop touch skips. Log: `artifacts/main-bc5299b-make-verify.log`. Later `0a08d02` merge is TODO-only; CI pending.
- [x] User-integrated `main@ca1c777` is an ancestor of `9b5202f` on `feature/cup-session-recovery`; tracked tree was clean and no unresolved merge conflicts were found.
- [x] Exact published code `9b5202f` GitHub CI: 17/17 required checks passed; quality-gate success. [CI run](https://github.com/weskao/skyline-rush/actions/runs/40818546745). This receipt names the tested commit; later TODO-only commits require their own latest-HEAD CI before merge.
- [x] Complete make verify on merged code `9b5202f` exits 0: strict TS/Vue/JS, Node 822 / Browser 502 / World Tour 303; Node has 3 emulator skips and Browser 2 desktop touch skips. Source is unchanged. Log: `artifacts/cup-recovery/make-verify-main-ca1c777-user-merge.log`.

Historical receipts below retain their original date and verification scope.


- [x] Integrate `origin/main@bc5299b` (51 upstream commits) and docs-only `0a08d02`: TODO conflict kept both sides; `src/world.js` landed one line over its ratchet ceiling, so `17af970` folds the `trackId`/`carBank` declarations instead of raising it. Complete make verify on `808e5a0` passes: strict TS/Vue/JS, Node 848 / Browser 525 / World Tour 303; 3 emulator skips and 2 desktop touch skips. Log: `artifacts/main-bc5299b-make-verify.log`. CI pending.
- [x] User-integrated `main@ca1c777` is an ancestor of `6bb9d13` on `feature/custom-race-presentation`; tracked tree was clean and no unresolved merge conflicts were found.
- [x] Exact published code `6bb9d13` GitHub CI: 17/17 required checks passed; quality-gate success. [CI run](https://github.com/weskao/skyline-rush/actions/runs/40818547188). This receipt names the tested commit; later TODO-only commits require their own latest-HEAD CI before merge.
- [x] Complete make verify on merged code `6bb9d13` exits 0: strict TS/Vue/JS, Node 826 / Browser 501 / World Tour 303; Node has 3 emulator skips and Browser 2 desktop touch skips. Source is unchanged. Log: `artifacts/custom-presentation/make-verify-main-ca1c777-user-merge.log`.

## Recent custom setup acceptance (2026-10-29)

- [x] REPLAY-02 already exists on published code `6bb9d13`: keep three distinct recent Custom setups, reload and restore each complete rule config, Race Again from results, and Choose Track to edit an independent copy without modifying the completed race, base Coast track or official progress. Real controls and actual simulation settlement pass at desktop 1440×900 en and touch-emulated 390×844 zh-TW; page errors 0. No production source changes or additional audio are needed; existing confirmation/finish feedback is reused.
- [x] Inspect the four original-resolution in-game captures and JSON receipt under `artifacts/custom-presentation/replay02-evidence/`. Complete local gate 826 Node / 501 Browser / 303 World Tour and exact-code CI 17/17 are recorded above. Chrome touch emulation does not complete physical-device acceptance.

Historical receipts below retain their original date and verification scope. Earlier publication blockers were superseded by the user-published commits verified above.
- [x] User-integrated `main@ca1c777` is an ancestor of `6c478de` on `feature/practice-item-rules`; tracked tree was clean and no unresolved merge conflicts were found.
- [x] Exact published code `6c478de` GitHub CI: 17/17 required checks passed; quality-gate success. [CI run](https://github.com/weskao/skyline-rush/actions/runs/40818547695). This receipt names the tested commit; later TODO-only commits require their own latest-HEAD CI before merge.
- [x] Complete make verify on merged code `6c478de` exits 0: strict TS/Vue/JS, Node 830 / Browser 502 / World Tour 303; Node has 3 emulator skips and Browser 2 desktop touch skips. Source is unchanged. Log: `artifacts/item-rules/make-verify-main-ca1c777-user-merge.log`.

## origin/main bc5299b / 0a08d02 integration (2026-10-29)

- [x] Merge origin/main `bc5299b` (51 commits) without conflicts. RED: `tests/module-size.test.js` failed because `src/world.js` was 1346 lines against this branch's lowered 1345 ceiling; GREEN by folding `let trackId, carBank = 0;` (the shared fold used by every integrated branch), never raising the ceiling.
- [x] Complete make verify on code `a6c9f14` exits 0: strict TS/Vue/JS, Node 844 / 3 emulator skips, locked build, Browser 523 / 2 desktop touch skips, World Tour 303. Log: `artifacts/make-verify-bc5299b-a6c9f14.log`. Docs-only `0a08d02` merged afterwards; `src` unchanged. CI pending.


- [x] User-integrated `main@ca1c777` is an ancestor of `8b34df1` on `feature/event-lab-lite`; tracked tree was clean and no unresolved merge conflicts were found.
- [x] Exact published code `8b34df1` GitHub CI: 17/17 required checks passed; quality-gate success. [CI run](https://github.com/weskao/skyline-rush/actions/runs/40818547459). This receipt names the tested commit; later TODO-only commits require their own latest-HEAD CI before merge.
- [x] Complete make verify on merged code `8b34df1` exits 0: strict TS/Vue/JS, Node 822 / Browser 499 / World Tour 303; Node has 3 emulator skips and Browser 2 desktop touch skips. Source is unchanged. Log: `artifacts/event-lab/make-verify-main-ca1c777-user-merge.log`.


- [x] User-integrated `main@ca1c777` is an ancestor of `733d848` on `feature/endless-highway`; tracked tree was clean and no unresolved merge conflicts were found.
- [x] Exact published code `733d848` GitHub CI: 17/17 required checks passed; quality-gate success. [CI run](https://github.com/weskao/skyline-rush/actions/runs/40818547563). This receipt names the tested commit; later TODO-only commits require their own latest-HEAD CI before merge.
- [x] Complete make verify on merged code `733d848` exits 0: strict TS/Vue/JS, Node 825 / Browser 497 / World Tour 303; Node has 3 emulator skips and Browser 2 desktop touch skips. Source is unchanged. Log: `artifacts/endless/make-verify-main-ca1c777-user-merge.log`.


- [x] User-integrated `main@ca1c777` is an ancestor of `87421b9` on `feature/genuine-circuit-laps`; tracked tree was clean and no unresolved merge conflicts were found.
- [x] Exact published code `87421b9` GitHub CI: 17/17 required checks passed; quality-gate success. [CI run](https://github.com/weskao/skyline-rush/actions/runs/40818546894). This receipt names the tested commit; later TODO-only commits require their own latest-HEAD CI before merge.
- [x] Complete make verify on merged code `87421b9` exits 0: strict TS/Vue/JS, Node 841 / Browser 503 / World Tour 326; Node has 3 emulator skips and Browser 2 desktop touch skips. Source is unchanged. Log: `artifacts/circuit/make-verify-main-ca1c777-user-merge.log`.

Historical receipts below retain their original date and verification scope.


- [x] User-integrated `main@ca1c777` is an ancestor of `3d8321b` on `feature/challenge-medals`; tracked tree was clean and no unresolved merge conflicts were found.
- [x] Exact published code `3d8321b` GitHub CI: 17/17 required checks passed; quality-gate success. [CI run](https://github.com/weskao/skyline-rush/actions/runs/40818547979). This receipt names the tested commit; later TODO-only commits require their own latest-HEAD CI before merge.
- [x] Current src is identical to locally verified `6624322`: complete make verify exit 0, Node 843 / Browser 508 / World Tour 303; local Cloud 15 + 3 and current original-resolution evidence pass. Requested main merge returned Already up to date.


## Expanded personal challenge medals — REPLAY-01 (2026-10-29)

- [x] Review the original requirement and existing scoring, settlement, History, storage/account/backup boundaries. Continue on independent `feature/challenge-medals`, leaving the six locally verified feature branches intact. Plan: `docs/superpowers/plans/2026-10-29-challenge-medals.md`.
- [x] Observe real assertion RED through the existing Stunt scoring API: four original cases pass, four new cases fail for missing continuous-flight/aerial-chain telemetry. No missing-module or syntax error. Log: `artifacts/challenge-medals/stunt-metrics-red.log`.
- [x] Stunt telemetry GREEN: 21 owner/sibling tests pass; after installing this worktree's existing TypeScript dependency, full Node suite passes 807 / 0 failures / 3 emulator skips. The earlier four missing-compiler failures are retained as environment setup evidence, not feature RED. Logs: `stunt-metrics-green.log`, `stunt-metrics-npm-test-ready.log`.
- [x] Settlement RED through existing APIs: missing personal-award results fail clean Time Attack, failed-attempt and multi-heat Stunt cases. Log: `artifacts/challenge-medals/settlement-red.log`.
- [x] Five-medal settlement/store GREEN: actual settlement RED, then Checkpoint/Gauntlet owner RED (2 fail / 7 pass), then timer-final-tick RED; full Node now 819 pass / 0 fail / 3 emulator skips. Strict TS/Vue/JS checks pass before the final numeric clipping correction; repeat them after lifecycle integration. Award dates stay separate from Career, survive History trimming and fall back to the session when storage is blocked. Logs in `artifacts/challenge-medals/`.
- [x] Local lifecycle RED/GREEN: six new assertion failures plus the already-passing cloud-boundary guard; 46 controller/storage/session tests now pass. Actual browser export/import first failed for absent medal data, then both passed. Future-version stores refuse account switching; quota failure rolls back progress.
- [x] Vue History/results RED/GREEN: missing collection fails after a successful import; both backup browser flows now pass with immediate 1 / 5 collection and unchanged Career count. Result announcements and explicit local adoption pass 11 focused cases; full Node 828 pass / 0 fail / 3 emulator skips; strict TS/Vue/JS pass with the worktree-local npm cache. Logs: `artifacts/challenge-medals/lifecycle-ui-*.log`, `history-backup-browser-green.log`.
- [x] Implement and verify bounded aerial telemetry, five separate personal medals, safe local/session persistence and local backup/account isolation; no new cloud schema.
- [x] Verify bilingual Vue History/result presentation with real desktop/touch actions and unchanged four Career medals.
- [x] Integrate latest main `ca1c777` into this feature; resolve the TODO header conflict by preserving both the complete feature ledger and main's new 90/120 FPS request. Preserve shared History/Intl/media/scenery cache fixes.
- [x] Current-source emulator compatibility passes 15 browser cases and 3 Rules cases on `6624322`. Log: `artifacts/challenge-medals/cloud-main-ca1c777-scroll-fix.log`. No production cloud writes or new cloud schema.
- [x] Original-resolution gameplay matrix passes all 11 cases after correcting the new test's intentionally hidden landscape shortcut and seeding Stunt completion at the timer rather than an intermediate route heat. A baseline worktree created while Vite was live also caused a reload in one phone case; preserve that failure and keep baseline preparation separate from the next run. Final result captures wait for the visible overlay and completed counters; initial premature captures remain archived.
- [x] Account-switch session-only loss RED → GREEN: the actual controller snapshots an empty old-account collection despite a current-session award; flush the session through the existing atomic local writer before switching. All 42 owner/lifecycle cases and full Node 843 / 0 failures / 3 emulator skips pass. Logs: `switch-session-{red,green,node}.log`. The earlier complete gate was intentionally stopped to include this protection, and must be restarted.
- [x] Career shortcut regression RED → GREEN: adding reactive personal-medal rows shifted the old Career heading after its synchronous scroll. Reproduce the existing home-medal-chip assertion failure, then await Vue nextTick before History scrolling/focus. All 25 focused browser cases pass (1 desktop touch skip), full Node 843 / 0 failures / 3 emulator skips and strict types pass. The original 84ff28f full gate failed 2 / passed 506 / skipped 2; preserve both failures. Its separate guide page-close did not reproduce in 3 unchanged diagnostic runs. Logs: `history-scroll-{red,green,node,typecheck}.log`, `guide-diagnostic.log`.
- [x] Final code `6624322` passes complete `make verify` with exit 0: strict TS/Vue/JS, Node 843 / 3 emulator skips, Browser 508 / 2 desktop touch skips, World Tour 303; all failures 0. Current-source local Cloud compatibility is 15 + 3. Eight original-resolution desktop/phone before/after images include results, collection and the repaired Career shortcut, with no page errors. Three alternating Stunt flight rounds at 412×915 / DPR 2 / 6× CPU / 20 s: main median p50/p95 16.7/16.7 ms, feature 16.7/16.8 ms; FPS 59.9/59.5. No FPS gain claimed. Logs: `make-verify-main-ca1c777-scroll-fix.log`, `perf-stunt.{log,json}`, `final-ui-main-ca1c777-scroll-fix/receipt.json` under `artifacts/challenge-medals/`.
- [x] Published `3d8321b` exact-commit CI passes all 17 required checks including quality-gate: https://github.com/weskao/skyline-rush/actions/runs/40818547979 . All seven published feature commits now pass 119/119 required checks.
- [ ] Physical Safari/Android, long-drive/all-quality thermal checks and independent review remain open; subsequent documentation-only HEADs still need their own CI before a merge.

## Main camera-probe integration (2026-10-28)

- [x] Merge requested main `31ac7b124c72a217dbb0706fdce385c56fa5c4fc` into this independent branch without conflicts; feature `src` is unchanged. Preserve every simulation tick and sampled/final WebGL frame in the upstream camera-probe optimization.
- [x] Merge-specific validation passes all 39 focused size/haptic/camera/release/draw-helper checks. Shared application fixes are covered by all six completed caller full gates; no standalone full-gate receipt is claimed here.
- [ ] Exact-HEAD CI for this helper/placeholder remains unverified. The pending publication request covers only the six implemented feature branches; no push from this helper/placeholder is authorized.

- [x] Complete resulting-main `make verify` on code `f88d43a` (verified 2026-10-29): strict TS/Vue/JS checks, 808 Node passed / 3 emulator-scoped skips, locked production build, 500 browser passed / 2 desktop-only touch-case skips, 303 dedicated World Tour passed; exit 0. Receipt: `artifacts/cup-recovery/make-verify-main-31ac7b1.log`. Earlier 0152611 runs remain separate historical receipts.
- [x] Preserve 5 original-resolution 0.25.0 real-game images in `artifacts/cup-recovery/reviewed-main-0152611/`; desktop and phone representatives were visually inspected. Their runtime `src` tree is identical to verified code `f88d43a` after the test-only upstream merge. Chrome emulation is not physical Safari/Android acceptance.
- [x] Local Auth/Firestore emulator compatibility on code `f88d43a`: 15 browser and 3 Rules tests pass, exit 0. Receipt: `artifacts/cup-recovery/cloud-main-31ac7b1.log`; no production cloud writes.

- [x] Complete resulting-main `make verify` on code `c5b885c` (verified 2026-10-29): strict TS/Vue/JS checks, 812 Node passed / 3 emulator-scoped skips, locked production build, 499 browser passed / 2 desktop-only touch-case skips, 303 dedicated World Tour passed; exit 0. Receipt: `artifacts/custom-presentation/make-verify-main-31ac7b1.log`. Earlier 0152611 runs remain separate historical receipts.
- [x] Preserve 4 original-resolution 0.25.0 real-game images in `artifacts/custom-presentation/reviewed-main-0152611/`; desktop and phone representatives were visually inspected. Their runtime `src` tree is identical to verified code `c5b885c` after the test-only upstream merge. Chrome emulation is not physical Safari/Android acceptance.
- [x] Complete resulting-main `make verify` on code `5d080fe` (verified 2026-10-29): strict TS/Vue/JS checks, 816 Node passed / 3 emulator-scoped skips, locked production build, 500 browser passed / 2 desktop-only touch-case skips, 303 dedicated World Tour passed; exit 0. Receipt: `artifacts/item-rules/make-verify-main-31ac7b1.log`. Earlier 0152611 runs remain separate historical receipts.
- [x] Preserve 4 original-resolution 0.25.0 real-game images in `artifacts/item-rules/reviewed-main-0152611/`; desktop and phone representatives were visually inspected. Their runtime `src` tree is identical to verified code `5d080fe` after the test-only upstream merge. Chrome emulation is not physical Safari/Android acceptance.

- [x] Complete resulting-main `make verify` on code `903846e` (verified 2026-10-29): strict TS/Vue/JS checks, 808 Node passed / 3 emulator-scoped skips, locked production build, 497 browser passed / 2 inapplicable desktop touch-case skips, 303 dedicated World Tour passed; exit 0. Receipt: `artifacts/event-lab/make-verify-main-31ac7b1.log`.
- [x] Preserve 12 original-resolution real-game images in `artifacts/event-lab/reviewed-main-31ac7b1/`; desktop and phone representatives were visually inspected. Fresh main31 original-resolution flows pass (4 cases). Chrome emulation remains separate from physical Safari/Android acceptance.
- [x] Local Auth/Firestore compatibility on code `903846e`: 15 browser + 3 Rules tests pass, exit 0. Receipt: `artifacts/event-lab/cloud-main-31ac7b1.log`; no production cloud writes.

- [x] Complete resulting-main `make verify` on code `6883d0a` (verified 2026-10-29): strict TS/Vue/JS checks, 811 Node passed / 3 emulator-scoped skips, locked production build, 495 browser passed / 2 inapplicable desktop touch-case skips, 303 dedicated World Tour passed; exit 0. Receipt: `artifacts/endless/make-verify-main-31ac7b1.log`.
- [x] Preserve 8 original-resolution real-game images in `artifacts/endless/reviewed-main-31ac7b1/`; desktop and phone representatives were visually inspected. Fresh main31 original-resolution flows pass (2 cases). Chrome emulation remains separate from physical Safari/Android acceptance.
- [x] Local Auth/Firestore compatibility on code `6883d0a`: 15 browser + 3 Rules tests pass, exit 0. Receipt: `artifacts/endless/cloud-main-31ac7b1.log`; no production cloud writes.

- [x] Complete resulting-main `make verify` on code `362a380` (verified 2026-10-29): strict TS/Vue/JS checks, 827 Node passed / 3 emulator-scoped skips, locked production build, 501 browser passed / 2 inapplicable desktop touch-case skips, 326 dedicated World Tour passed; exit 0. Receipt: `artifacts/circuit/make-verify-main-31ac7b1-recheck.log`.
- [x] Preserve 20 original-resolution real-game images in `artifacts/circuit/reviewed-main-0152611/`; desktop and phone representatives were visually inspected. Their runtime `src` equals this verified main31 integration; the images retain their original baseline label. Chrome emulation remains separate from physical Safari/Android acceptance.
- [x] Local Auth/Firestore compatibility on code `362a380`: 15 browser + 3 Rules tests pass, exit 0. Receipt: `artifacts/circuit/cloud-main-31ac7b1.log`; no production cloud writes.
- [x] After one high-host-load tilt failure, preserve the original first-run log/error context, observe 3/3 unchanged diagnostic repeats, then complete the entire recheck above with zero failures. No source, assertion or timeout changes. Add genuine unpaused desktop/phone first-seam crossings in `artifacts/circuit/seam-live-main-31ac7b1/`: visible HUD synced before capture, actual W-key input, lap count 0→1, four PNGs and two VP9 recordings (8.44s / 7.88s) validated. Original paused seam captures do not establish unobscured road geometry.
- [ ] Publish and verify exact-HEAD CI after the pending public feature-push authorization is resolved. Automatic review rejected the earlier public push for missing explicit disclosure authorization; no retry or workaround. No feature-to-main merge, main push, PR, tag or deployment is authorized.

- [x] Merge-specific validation passes all 39 focused size/haptic/camera/release/draw-helper checks. At the recorded base `fdeed8a`, expanded medals were unimplemented; the new phase ledger above tracks current implementation. No standalone full-gate receipt is claimed for that earlier placeholder.

## Main 0.25.0 integration (2026-10-28)

- [x] Merge latest requested main `01526118767b99a85b0a9b7570bdd87a27ac304e` into this independent branch. Preserve all feature source: the `src` tree is identical to the pre-merge parent. Integrate 0.25.0 metadata, per-map camera cases and six CI World Tour shards; retain the validated worktree port override. All 36 focused size/camera/haptic/release checks pass.
- [ ] Broader implementation/acceptance and exact-HEAD CI are separate from this merge check.

- [x] Complete the resulting 0.25.0 local gate and real-game review on code `f88d43a` after main `31ac7b1`; exact counts and source-equivalent original-resolution evidence are recorded above. Earlier 0197547 and 0152611 logs retain their original baseline labels.

- [x] Complete the resulting 0.25.0 local gate and real-game review on code `c5b885c` after main `31ac7b1`; exact counts and source-equivalent original-resolution evidence are recorded above. Earlier 0197547 and 0152611 logs retain their original baseline labels.
- [x] Complete the resulting 0.25.0 local gate and real-game review on code `5d080fe` after main `31ac7b1`; exact counts and source-equivalent original-resolution evidence are recorded above. Earlier 0197547 and 0152611 logs retain their original baseline labels.

- [x] Complete the resulting 0.25.0 local gate and real-game review on code `903846e` after main `31ac7b1`; current receipts and original-resolution evidence are recorded above. Earlier baseline logs retain their original labels.

- [x] Complete the resulting 0.25.0 local gate and real-game review on code `6883d0a` after main `31ac7b1`; current receipts and original-resolution evidence are recorded above. Earlier baseline logs retain their original labels.

- [x] Complete the resulting 0.25.0 local gate and real-game review on code `362a380` after main `31ac7b1`; current receipts and original-resolution evidence are recorded above. Earlier baseline logs retain their original labels.
- [ ] Publish only after explicit push authorization, then inspect exact-HEAD unit, Cloud Save, all 8 browser and all 6 World Tour shards plus quality-gate. A fresh automatic review rejected the attempted public feature push; an explicit six-feature approval question is pending. No feature-to-main merge, main push, PR, tag or deployment is authorized; no push-review workaround.

## Historical main integration through 0197547 (2026-10-28)

- [x] Integrate captured main `0197547d01a7bd4618bee7a969fdbc67e2caf1ac` (including `ebd30e5` / `d71fc65`) into this independent branch, resolve conflicts and preserve both main and feature behavior. Main now separates release data and includes upcoming notes; all 36 focused renderer/camera/haptic/release tests pass. Shared AIRFLOW locale repair `3e7f7d6` is included. This is the fixed baseline for the final verification batch.
- [ ] Broader feature implementation, full acceptance and exact-HEAD CI remain separate from this main-merge check.

- [x] Complete local `make verify` on code `ef2fa05` with main `0197547`: strict types, 805 Node passed / 3 emulator skips, locked build, 500 browser passed / 2 conditional skips and 94 World Tour passed; exit 0. Receipt: `artifacts/cup-recovery/make-verify-main-0197547.log`. This is a historical receipt if a newer main is integrated.
- [ ] Inspect the recorded feature-code SHA GitHub required jobs and `quality-gate`; the final documentation HEAD is checked separately. Real-device and remaining manual gates stay open.

## Staged roadmap continuation (2026-10-27)

The owner authorized TDD implementation of the remaining non-Firebase/non-Gamepad roadmap in independently mergeable feature branches. Unrelated features start from `origin/main`, not the dirty audio/keymap refactor checkout. This is implementation authorization, not merge/PR/release/deploy authorization.

### Stage: Cup session recovery — `feature/cup-session-recovery`

- [x] Observe real Chrome RED for a valid completed-heat checkpoint with no recovery entry; preserve `artifacts/cup-recovery/browser-red.log`.
- [x] Round-trip versioned Cup checkpoints with the shared standings validation; reject corrupt/oversized/complete/locked saves and tolerate denied storage. Observe functional round-trip/retry RED, then 12/12 focused Cup unit tests GREEN.
- [x] Add Vue-owned bilingual Resume/Discard controls; preserve standings, restart only the unfinished heat, roll back a retried completed heat, and clear recovery after final completion. Desktop and touch-phone tests finish real simulated heats, retry, advance, quit, resume and verify one final mode record with no Career stars.
- [x] Independent review found access restoration did not refresh the recovery entry. Observe Classic-unlock RED → GREEN and update the existing event-driven `showTracks` path, without frame-loop polling.
- [x] Deletion lifecycle RED → GREEN: clearing game progress left the new Cup checkpoint behind. The shared cleanup now removes its exported key, preserves device controls/audio, and reports a failed removal so the deletion guard remains active. Focused Cup/cloud checks: 35 passed; full Node: 798 passed, 0 failed, 3 emulator skips. Extended the existing emulator deletion browser test; fresh emulator verification passes 15 browser + 3 Rules tests (`artifacts/cup-recovery/deletion-cloud.log`).
- [x] Observe desktop intro overflow RED (164 px), then fit the fixed height by collapsing the promotional logo/slogan only while saved Cup settings are expanded. Recovery buttons retain 44 px targets. A second review found the selector also matched a hidden Cup panel; observe Classic-switch RED before restricting it to the visible panel.
- [x] Pre-main-integration `make verify` completed: strict TS/Vue/legacy checks, 697 unit passed / 3 emulator-dependent skipped, production build, 456 browser passed and 72 World Tour passed. Receipt: `artifacts/cup-recovery/make-verify-final.log`. The initial interrupted run is superseded by this complete run.
- [x] Integrate fetched main `7cbdbe5` (2026-10-28), retaining its flight/combo, Coast scenery, FPS pacing and module split. Resolve both TODO/main conflicts; restore Cup mode through `race-select-ui.ts`, checkpoint the result from `settleRace`, and reuse `result-screen.ts`. Move unchanged leave/focus navigation to a typed controller so `main.js` shrinks from 688 to 685 lines. New Cup copy uses a small locale subcatalog; no size ceiling was raised. Fresh strict typecheck and 39 focused unit tests passed; independent review reran 42 focused tests with no remaining Important findings.
- [x] Complete merged local `make verify` on code HEAD `25771ef`: strict TS/Vue/legacy checks, 798 Node passed / 3 emulator-dependent skipped, locked build, 494 browser passed / 2 skipped and 72 World Tour passed; exit 0. Receipt: `artifacts/cup-recovery/make-verify-main72466c3-post-delete.log`. The initial setup lock and superseded interrupted runs are not green receipts. Original-resolution recovery/heat flows also pass.
- [x] Verify exact code commit `02acf84`: unit/typecheck, all 8 browser shards, Cloud Save, World Tour and `quality-gate` succeed on https://github.com/weskao/skyline-rush/actions/runs/40633492551 . This records the verified code revision; the following documentation-only HEAD is checked separately before reporting final branch status.
- [ ] Physical-device Cup recovery/standings/touch acceptance; Chrome touch emulation is separate evidence. No original track physics, shaders or per-frame audio were changed. Existing confirmation SFX is reused.

Other independently tracked branches: `feature/custom-race-presentation` (Custom ruleset Ghost and cosmetic presets/setup summary) and `feature/practice-item-rules` (explicit item rules, real activation/cooldown and related new pads/items). Remaining genuine circuit laps, richer themed hazards, challenge medals, Endless Highway and Event Lab remain open. Existing Photo Studio, held Shield/Magnet/Ghost/Freeze and recent Custom setup storage are reused rather than reimplemented. Tutorial entry-flow decisions are being discussed separately.

- [x] Merged-main broad regression observed (2026-10-28): full browser run reached 487 passed / 2 skipped; the only three failures were inherited Phase 4 polyline-count assumptions. Integrate `6809503`, whose focused main-path/minimap suite passes 7/7. The complete resulting `make verify` and exact-HEAD CI remain pending, not implied by this receipt.

## Shared continuation regression gates (2026-10-28)

- [x] Measure the shared locale-HUD repair on code `50e34ca` against main `31ac7b1`: house `make perf BASE=31ac7b1 RATE=6 ROUNDS=3 RACE_SECONDS=20 TG=0`, alternating three 20s Chrome runs at 412×915 / DPR2 / 6× CPU, after task browser suites were idle; exit 0. Both median p50/p95 are 16.7/16.8ms; current 59.2fps vs baseline 58.6fps. Vsync-limited: no FPS improvement claimed. Log/JSON: `artifacts/regression-gates/hud-locale-perf-main-31ac7b1.*`. This covers the shared Classic HUD, not every feature mode, 5–8km quality tiers or physical thermals.

- [x] Complete local `make verify` on code `354ada5` with main `0197547`: strict types, 809 Node passed / 3 emulator skips, locked build, 499 browser passed / 2 conditional skips and 94 World Tour passed; exit 0. Receipt: `artifacts/custom-presentation/make-verify-main-0197547.log`. This is a historical receipt if a newer main is integrated.

## Custom race Ghost and cosmetic presentation continuation (2026-10-28)

Branch: `feature/custom-race-presentation`, checkpoint `29394e8`, integrates main `7cbdbe5`. This stage addresses the remaining Ghost/weather portion of 9C and cosmetic presets in 11C; Firebase/Gamepad and a whole-home layout rewrite remain separate.

- [x] Observe feature RED before implementation: `createRace` ignored presentation, the preset selector/active-rule summary were absent, and Custom heat replay persistence was unavailable. Preserve receipts in `artifacts/custom-presentation/`.
- [x] Reuse the integrated `ghost-store.ts` and `race-results.ts` for fastest compatible Custom heat Ghosts, including intermediate sprint heats and blocked-storage in-session fallback. Keep Classic/Time histories and Ghost signatures unchanged. Do not restore the branch's superseded duplicate Ghost store.
- [x] Add typed Vue Custom/Free preset controls for Track/Day/Dusk/Night/Rain/Fog, a bilingual live rule summary and setup-step hint. Presentation stays outside `race.config`; retry retains it and changing track or returning to Classic resets it. Reuse the confirmation cue; no new music is appropriate.
- [x] Keep speculative track preview creation pure: observe cancelled-swipe preset loss RED, fix the selection boundary, then pass the real browser short-drag cancellation test.
- [x] Share photo/race atmosphere application in strict TypeScript; preserve Photo Studio camera/export behavior, restore the active race theme on close, and reuse bounded rain particles. Keep main at 688 lines and lower the renderer ceiling from 1346 to 1332.
- [x] Fresh focused verification on integrated main: strict TypeScript/Vue/legacy checks and production build pass; 36 focused Node tests and 18 expanded lifecycle/scene/size tests pass. Desktop/touch Ghost, theme/retry/reset, live locale/photo restoration, visible bounded rain and cancelled-swipe checks pass. Settled real-game screenshots are under `artifacts/custom-presentation/`.
- [x] Complete merged local `make verify` on code HEAD `359c36f`: strict TS/Vue/legacy checks, 802 Node passed / 3 emulator-dependent skipped, locked production build, 493 browser passed / 2 skipped and 72 World Tour passed; exit 0. Receipt: `artifacts/custom-presentation/make-verify-main72466c3-final.log`. Shared repairs supersede the earlier timeout/perf/golden failures.
- [x] Verify exact code commit `a3277a3`: unit/typecheck, all 8 browser shards, Cloud Save, World Tour and `quality-gate` succeed on https://github.com/weskao/skyline-rush/actions/runs/40630628111 . This records the verified code revision; the following documentation-only HEAD is checked separately before reporting final branch status.
- [ ] Physical-device visual/performance/thermal acceptance; PHOTO-01 and broader UX-01 remain separately open.
- [ ] Broader UX-01: the existing home still physically places track cards before the mode picker. The compact hint/summary does not claim completion of a whole-home mode-first flow.
- [ ] PHOTO-01 remains open: the existing orbit/lighting/PNG flow passes, but merged real-game capture still shows speed/charge HUD, a driving callout and the device notice behind Photo Studio. Complete preview HUD hiding and its device coverage separately; appearance restoration does not close this acceptance. Evidence: `artifacts/custom-presentation/photo-studio-merged.png`.

- [x] Merged-main full browser receipt (2026-10-28): 486 passed / 2 skipped; only three inherited Phase 4 polyline assumptions failed. Integrate `6809503` (focused corrected suite 7/7) and rerun complete gates on the resulting source. This receipt does not claim a green full gate.
- [x] Complete local `make verify` on code `1776eda` with main `0197547`: strict types, 813 Node passed / 3 emulator skips, locked build, 500 browser passed / 2 conditional skips and 94 World Tour passed; exit 0. Receipt: `artifacts/item-rules/make-verify-main-0197547.log`. This is a historical receipt if a newer main is integrated.
- [ ] Inspect the recorded feature-code SHA GitHub required jobs and `quality-gate`; the final documentation HEAD is checked separately. Real-device and remaining manual gates stay open.

## Practice item rules and activation feedback (2026-10-27)

Branch: `feature/practice-item-rules`, independent of Cup, Custom presentation and the shared checkout's audio/keymap refactor; latest docs-only main `3a5c25a` integrated.

- [x] ITEM-11 implementation: explicit Off / Classic / Active / All selection for Custom and Free Drive; legacy configs without `itemRules` retain their signatures and original supply-only `items: false` behavior. All ten tracks covered; strict conflicting requests rejected; recent setups retain new rules.
- [x] Existing ITEM-01–05 feedback slice: actual mystery-ring pickup → held silhouette → Q/touch activation → bounded cooldown/active status, English/zh-TW, one-shot pickup/ready cues using the existing muted mixer. Main bootstrap shrinks seven lines; cached HUD writes remain idempotent. This does not complete every future ITEM-12 visual effect.
- [x] Observed RED: Off still spawned supplies, unknown new rules collapsed recent setups, and Chrome lacked the rule selector. Follow-up RED caught a restored old setup retaining `activeItems: true` and filtered groups falsely awarding PERFECT LINE/NITRO; shared fixes preserve old-setup defaults and original ring index/group size.
- [x] Focused proof: rule/config/mode tests 40 passed; final item/UI/activation tests 11 passed; complete Node suite 699 passed, 0 failed, 3 emulator-dependent skipped. Strict TS/Vue/JS checks and locked production build passed. Browser mode/HUD/parity suite 31/31 passed; final changed-rule desktop/touch/locale/recent-restore rerun 4/4 passed. Actual WebGL captures and logs: `artifacts/item-rules/`.
- [x] Complete merged local `make verify` on code HEAD `6581403`: strict TS/Vue/legacy checks, 806 Node passed / 3 emulator-dependent skipped, locked build, 494 browser passed / 2 skipped and 72 World Tour passed; exit 0. Receipt: `artifacts/item-rules/make-verify-main72466c3-final.log`. Original-resolution desktop/touch item and bonus flows also pass.
- [x] Verify exact code commit `e4c4c1e`: unit/typecheck, all 8 browser shards, Cloud Save, World Tour and `quality-gate` succeed on https://github.com/weskao/skyline-rush/actions/runs/40633787236 . This records the verified code revision; the following documentation-only HEAD is checked separately before reporting final branch status.
- [ ] Physical-device/audio/perception acceptance; broader ITEM-03/12 visuals remain open.
- [x] Main integration (2026-10-28): preserve latest main `7cbdbe5`, including Phase 1–4 and the split bootstrap; move this branch's selection/reset changes into `race-select-ui.ts` and item HUD updates into the typed mode-panel callback. Preserve all new size ceilings: `game.js` remains 827 lines and `main.js` shrinks to 687. Fresh strict TS/Vue/JS checks, 17 focused Node checks and five real desktop/touch item browser cases pass. The historical 10/27 measurements above remain historical receipts, not proof for the merged source.
- [x] Resolve the two inherited unit-gate failures through the shared main regression repair (Phase 4 timeout scaling and perf-overlay initialization); after merging main `2cd52d4`, the complete Node suite passes 804 / 0 failed / 3 emulator-dependent skipped. Main `72466c3` is now integrated; complete resulting `make verify` and latest-HEAD CI remain separate pending gates.

## Related item expansion (2026-10-28)

- [x] RED → GREEN for bounded speed/air/recovery gates at unchanged authored positions on all ten tracks; collision mitigation consumes once and preserves official collision counts. EMP affects opponents within 30 m for 1.5 s and safely converts to Magnet in solo use.
- [x] Opt-in Stunt/Checkpoint five-second ×2 score gates, bounded nonstacking durations, independent rules signatures, paused timers and equal payouts at 30/60/120 physics steps. Classic defaults and old saved signatures remain unchanged.
- [x] RED → GREEN for missing gate materials and HUD warnings. Reuse five existing warmed material variants and seven-mesh pool; cache HUD nodes, announce gate identity/distance and pickup once, show EMP silhouette/cooldown, and retain separate music/SFX settings. Relevant Node checks: 31 passed; browser item and bonus flows: 7 passed on desktop/touch, with English/zh-TW switching and real Q/tap activation. Screenshots inspected in `artifacts/item-rules/`.
- [ ] Physical iOS/Android/audio/perception acceptance and broader ITEM-12 visual effects. Code CI and the complete merged local gate are recorded above.


- [x] Complete fresh local `make verify` on code `bf7ed70` after captured main `0197547` and shared locale repair: strict TS/Vue/JS checks, 805 Node passed / 3 emulator skips, locked build, 497 browser passed / 2 conditional skips, 94 World Tour passed; exit 0. Receipt: `artifacts/event-lab/make-verify-main-0197547.log`. Fresh original-resolution real-game flows also pass; reviewed captures: `artifacts/event-lab/reviewed-main-0197547/`. Earlier SHA receipts below remain historical.

## Event Lab v1 continuation (2026-10-28, feature/event-lab-lite)

- [x] Observe schema/import/history/runtime RED; implement immutable version-1 local course documents, lane/distance editing, two templates, bounded Undo/Redo/Reset and text import/export. Unknown fields, inaccessible tracks, unsafe road sections, overlaps, malformed/oversized input and blocked storage are handled at the shared validation boundary.
- [x] Compile authored barriers, NITRO rings and supplies into actual simulation/render arrays; real collision/refill checks pass. Retry preserves the canonical course and seed while resetting mutable flags. Course records remain isolated from Custom/Career.
- [x] Follow-up RED → GREEN for a too-dense imported ring layout: require 150 m ring spacing so all visible authored gates fit the existing seven-ring pool. Preserve 44px mobile controls and a scrolling dialog.
- [x] Five core tests and four real Chrome desktop/touch × English/zh-TW editor-to-race/retry flows pass; strict Vue/TS check passes. Actual editor, barrier and result captures reviewed in `artifacts/event-lab/`.
- [x] Complete merged local `make verify` on code HEAD `068027c`: strict TS/Vue/legacy checks, 798 Node passed / 3 emulator-dependent skipped, locked build, 491 browser passed / 2 skipped and 72 World Tour passed; exit 0. Receipt: `artifacts/event-lab/make-verify-main72466c3-final.log`. Local cloud emulator: 15 browser + 3 Rules passed. Original-resolution flows pass; result capture waits for the final stored best and visible panel.
- [x] Verify exact code commit `68701b7`: unit/typecheck, all 8 browser shards, Cloud Save, World Tour and `quality-gate` succeed on https://github.com/weskao/skyline-rush/actions/runs/40634074855 . This records the verified code revision; the following documentation-only HEAD is checked separately before reporting final branch status.
- [ ] Physical-device acceptance. Original MODE-10 remains open for ramp/cone/checkpoint editing; no community/backend functionality is claimed.

## Event Lab designer (2026-10-29, feature/event-lab-designer)

Base: `feature/event-lab-lite` a6c9f14 + origin/main 0a08d02 + `feature/env-hazard-schema` 6289b46 (ENV-01/02 catalog).

- [x] RED → GREEN: timed checkpoints (Checkpoint Rush runtime, max 16), two-adjacent-lane reachability for solid objects (`reachable`), checkpoint and jumps templates.
- [x] RED → GREEN: designer collision preview (`previewPlacement`) and map tap snap-to-lane/10 m (`snapPlacement`); ghost outline + live reason in the panel.
- [x] RED → GREEN: cones with catalog-sized contact for player, rivals and traffic and catalog-sized barrier-pool rendering; footprints read from `OBJECT_CATALOG`.
- [x] RED → GREEN: ramps (max 8) through one shared launch rule `src/launch-ramps.ts` (Sky Spiral sections + authored ramps) and pooled wedge `src/ramp-view.ts`. `world.js` folded its duplicated road-position closure: 1345 → 1342, ceiling lowered.
- [x] Launch-seam regression: all 10 tracks × 30/60/120 FPS launch, land, finite state, airtime spread < 0.25 s, rivals drive over ramps; ramp case RED on pre-ramp `game.js`, Spiral case unchanged (preserved behaviour).
- [x] Acceptance unit tests: identical compiled stage from the same document/seed independent of device; 2000 mutated/truncated imports fail only with `CourseError`.
- [x] Audio: Event Lab checkpoints now play the shared gate pass/miss/low-time cues (RED → GREEN in `tests/mode-audio.test.js`). Ramp take-off intentionally adds no cue (Spiral launches have none; flight is visible).
- [ ] Browser: `tests/event-lab-browser.spec.js` (designer tap/preview/checkpoints/ramp render) and `tests/launch-ramps-browser.spec.js` (Spiral helix/joins/launch captures; first-grounded-frame wheel clearance ≤ 0.12 m on Spiral helix and flattest/steepest World Tour ramp spots), desktop + phone. World Tour roads have no lateral bank (`trackFrame` right.y = 0); banked coverage is Sky Spiral.
- [ ] Full local `make verify` on the branch HEAD; exact-HEAD CI pending.
- [ ] Pending, not claimed: ghost replay over ramps, physical devices.


- [x] Complete fresh local `make verify` on code `1515586` after captured main `0197547` and shared locale repair: strict TS/Vue/JS checks, 808 Node passed / 3 emulator skips, locked build, 495 browser passed / 2 conditional skips, 94 World Tour passed; exit 0. Receipt: `artifacts/endless/make-verify-main-0197547.log`. Fresh original-resolution real-game flows also pass; reviewed captures: `artifacts/endless/reviewed-main-0197547/`. Earlier SHA receipts below remain historical.

## Endless Highway continuation (2026-10-28, feature/endless-highway)

- [x] Real screenshot review exposed horizontal overflow in billion-metre phone results. Observe the new cell-bounds assertion fail before shared CSS commit `3826f3a`; the existing result container now wraps, retaining font sizes/gaps. Fresh original-resolution flows pass (Circuit: 8, including 1/3/5 laps; Endless: 2). Capture only visible, settled result panels.
- [x] Repeat complete local `make verify` after the CSS fix on `c0cd624`: strict TS/Vue/JS checks, 801 Node passed / 3 emulator skips, locked build, 489 browser passed / 2 skips and 72 World Tour passed; exit 0. Receipt: `artifacts/endless/make-verify-result-wrap.log`. Pre-fix full-gate receipts below remain historical.
- [ ] Verify exact post-wrap feature-HEAD GitHub quality-gate; no earlier HEAD CI is substituted.


- [x] Observe mode/streaming/settlement RED; implement Coast-only absolute-distance survival beyond authored finishes, five-contact settlement, capped difficulty and deterministic five-chunk traffic/pickup/ring pools. Classic/Daily/Cup routes and ordered catalogs remain unchanged.
- [x] Rebase Coast scenery and skyline GPU transforms near the camera, preserve existing materials/pools, hide finite minimap/progress/finish arch and avoid Ghost trace accumulation. Tests cover 8 km, 2 million metres and billion-metre progress with fixed object/resource counts.
- [x] Persist longest distance independently from Career, including a fifth real collision and rolling-history/cloud normalization/max-distance merges; reuse cruise music and one-shot milestones.
- [x] Follow-up GREEN: 126 focused core/type/Classic-route checks and two real desktop/touch bilingual browser flows pass, including pause, actual WebGL loss/restore, flight input, result persistence, locale switch and restart. Actual full-resolution distant-road/result captures inspected in `artifacts/endless/`.
- [x] Moving-traffic continuity RED → GREEN: a 20-minute deterministic driving regression reproduced nearby traffic disappearing when its birth chunk expired. Recycle by current distance and preserve the 40-car cap; all six Endless checks and the full Node suite pass (799 passed, 0 failed, 3 skipped). Logs: `artifacts/endless/traffic-continuity-{red,green,unit}.log`.
- [x] Complete merged local `make verify` on code HEAD `12150b7`: strict TS/Vue/legacy checks, 801 Node passed / 3 emulator-dependent skipped, locked production build, 489 browser passed / 2 skipped and 72 World Tour passed; exit 0. Receipt: `artifacts/endless/make-verify-main72466c3-final.log`. Cloud emulator checks also pass: 15 browser + 3 Rules tests (`cloud-main72466c3.log`).
- [ ] Latest-feature-HEAD GitHub quality-gate, actual background-tab acceptance and physical iOS/Android GPU/thermal endurance. Same-name feature pushes passed the renewed automatic review; latest-HEAD CI remains pending.

- [x] Complete local `make verify` on code `ca40ff0` with main `0197547`: strict types, 824 Node passed / 3 emulator skips, locked build, 501 browser passed / 2 conditional skips and 94 World Tour passed; exit 0. Receipt: `artifacts/circuit/make-verify-main-0197547-post-landmark.log`. This is a historical receipt if a newer main is integrated.

## Genuine circuit continuation (2026-10-28, feature/genuine-circuit-laps)

- [x] Main camera integration exposed Harbor beacon clipping in both portrait locales (projected x 1.1326, limit 0.95). Preserve the unchanged browser RED and ready captures; move only the visual beacon from 240m to 150m along the route, retaining lateral clearance, scale, camera and track geometry. All 8 existing Circuit device/lap/Ghost flows pass; full resulting gate remains separate. Logs: `make-verify-main-0197547.log` (RED), `landmark-green.log` (focused GREEN).

- [x] Real screenshot review exposed horizontal overflow in Circuit 5-lap phone metrics. Observe the new cell-bounds assertion fail before shared CSS commit `3826f3a`; the existing result container now wraps, retaining font sizes/gaps. Fresh original-resolution flows pass (Circuit: 8, including 1/3/5 laps; Endless: 2). Capture only visible, settled result panels.
- [x] Repeat complete local `make verify` after the CSS fix on `9cee557`: strict TS/Vue/JS checks, 817 Node passed / 3 emulator skips, locked build, 495 browser passed / 2 skips and 72 World Tour passed; exit 0. Receipt: `artifacts/circuit/make-verify-result-wrap.log`. Pre-fix full-gate receipts below remain historical.


- [x] Source/rules and topology-v1/history strategy in `docs/circuit-laps.md`; functional unknown-route RED is retained against baseline main for the separate `harbor-circuit` capability. The initial pre-implementation log was not preserved; follow-up RED/GREEN logs are retained. Preserve the ordered ten-route Classic/Daily/Cup catalog.
- [x] Genuine 2 km closed geometry with one periodic road/vehicle/camera/item/Ghost/map frame; unwrapped progress and seam-aware physical gaps, ordered 1/3/5-lap sectors, interpolated splits and per-lap collectible identities.
- [x] Follow-up RED/GREEN for Circuit records/Ghost bounds, default History selection, nonfinite progress, lap audio, ring orientation and shared geometry disposal. Permanent personal lap bests use the existing numeric bests map and survive rolling-history eviction/cloud merges.
- [x] Strict TS/Vue checks and targeted history/Ghost/cloud checks pass (73 focused checks before the final matrix). 1/3/5-lap tests pass at 30/60/120 Hz; all six desktop/phone portrait/landscape × English/zh-TW real-game flows pass, including visible landmark/minimap, stored lap best, seam capture, result, retry, quit and Classic restart. Captures and logs: `artifacts/circuit/`.
- [x] History discoverability RED → GREEN: Circuit Ghosts loaded but only Time Trial rows showed the Ghost badge. The shared view now includes valid Circuit Ghosts; 53 relevant Node checks, all 815 Node checks (3 emulator skips), and English desktop / zh-TW touch History menu flows pass. Cloud emulator checks pass: 15 browser + 3 Rules tests.
- [x] Integrate fetched main `72466c3`; preserve both feature and main behavior. Original LAP-02/03/04 implementation boxes below are checked against the focused geometry, timing, sector and browser evidence. The broad seam/device acceptance remains open.
- [x] Complete merged local `make verify` on code HEAD `c98a326`: strict TS/Vue/legacy checks, 817 Node passed / 3 emulator-dependent skipped, locked production build, 495 browser passed / 2 skipped and 72 World Tour passed; exit 0. Receipt: `artifacts/circuit/make-verify-main72466c3-final.log`. The earlier interrupted run is superseded. Cloud emulator proof is recorded above.
- [ ] Latest-feature-HEAD GitHub quality-gate and remaining manual acceptance: all showroom angles/AIRFLOW, rendered Ghost seam inspection, physical Safari/Android GPU, audio/perception and long-run checks. Same-name feature pushes passed the renewed automatic review; latest-HEAD CI remains pending.



- [x] AIRFLOW locale-change RED → GREEN: a real 390×844 / 59px safe-area test measured the zh-TW card bottom at 306px (limit 303.84px) because CJK label sizes applied while live values were still English. A deterministic real-menu change-event regression fails on the old code, then passes after synchronously relabeling three cached message keys; all 30 camera/telemetry browser tests pass without changing CSS, font size or assertions. Logs: `artifacts/regression-gates/airflow-locale-{red,green}.log`.
- [x] Complete all six caller full local gates after the shared repair and main `31ac7b1`: Cup, Custom, Items, Event Lab, Endless and Circuit exit 0 (verified 2026-10-29). Each owning branch records its code SHA, full log and reviewed images above; Circuit uses the separate recheck log. Superseded/interrupted runs remain historical receipts.

- [x] Integrate main `72466c3`, preserving release-video behavior and both main-route/forbidden-route assertions plus exact Spiral decoration counts. Earlier shared repair `c9db4a9` passed all required GitHub jobs and `quality-gate`: https://github.com/weskao/skyline-rush/actions/runs/40576521837 . This does not certify later feature HEADs.
- [x] World Tour worktree isolation RED → GREEN: its fixture server ignored the existing `PLAYWRIGHT_PORT` override and always used 5183. Both browser/server now use the validated override; the default remains 5183 and invalid/shell values fail before server launch. Seven timeout/port regression tests pass; logs in `artifacts/regression-gates/world-tour-port-{red,green}.log`.
- [x] Shared result layout RED → GREEN on the affected caller branches: five-lap Circuit and billion-metre Endless phone results overflowed their panels. Commit `3826f3a` adds only `flex-wrap` to the existing shared stats container, preserving spacing/font sizes; actual cell-bounds assertions pass in 8 Circuit and 2 Endless original-resolution flows. Caller branches are repeating the complete gate after integration.
- [ ] Complete each independent feature's exact-HEAD GitHub CI after public-push authorization; all six full local gates now pass. Earlier published code/CI receipts remain historical. The newer automatic review rejected public code disclosure for missing explicit authorization, and the six-feature approval question is still pending; do not retry or bypass. Feature-to-main merge, main push, PR, tag and deployment require explicit authorization.

## Feature request: 90 / 120 FPS render option (2026-10-29)
Status: not supported. `src/frame-pacing.ts` caps rendering at 60 FPS (`FpsPreference = 'auto' | '30' | '60'`); 90/120 Hz displays still paint at most 60 times a second. Physics stays fixed at 60 Hz.
- [ ] Measure first: `?perf` p50/p95 frame cost, draw calls and triangles per track at 60 FPS on a 120 Hz phone, to see whether 90/120 is affordable.
- [ ] RED tests in the frame-pacing unit tests: `'90'`/`'120'` parse, targets map correctly, Auto steps 120 → 60 → 30 under load and recovers.
- [ ] Extend `FpsPreference`, the target mapping and Auto step-down/recovery in `src/frame-pacing.ts`; keep the render-only pacer separate from the fixed 60 Hz physics, track/Ghost samples and deterministic replay.
- [ ] Offer 90/120 in the FPS settings UI only when the display refresh rate supports it; localize en + zh-TW; migrate the saved `skyline-rush-target-fps-v1` value safely.
- [ ] Check GPU, battery and thermal impact on physical iOS/Android devices (software WebGL is not a benchmark); interpolate or keep car pose smooth between 60 Hz physics steps.
- [ ] Add a What's New entry in `src/release-notes.js` (en + zh-TW) when it ships.

## Phase 4 — First five tracks: visuals, road geometry, minimap (feature/phase4-first-five-track-polish)

**Contract:** Phase 1 flight/combo and records, Phase 2 Coast and perf load counters, and Phase 3 Auto/30/60 pacing stay intact. Start from integrated main `b0d839b`. Avoid changing physics/topology or route length without a versioned history/Ghost migration.

- [x] Inspect latest main, CLAUDE.md, road/camera/route-map modules and their regression tests; create a new feature branch from latest main.
- [ ] RED: deterministic track-theme scenery bounds, geometry/road clearance, shared-asset disposal, and cached minimap upper-ramp overlay tests.
- [x] GREEN implementation committed: bounded InstancedMesh roadside detail for Neon, Canyon and Aurora, preserving Coast's Phase 2 benchmark and Sky Spiral's existing authored road. Await CI verification.
- [x] Fix tier-based scenic streaming: Low (8), Medium (16), High (24) maintain contiguous near-road sectors after a quality change; ring-buffer updates only moved slots.
- [x] Upgrade roadside visual identity with one additional batched, low-poly accent layer per track: Neon illuminated façades, Canyon sandstone strata, Aurora snowy treetops. Preserve three draw submissions per visible track and explicitly dispose owned meshes/materials.
- [x] Cache static route-map polyline and Sky Spiral elevated arc; add a canonical-centreline direction chevron without per-frame SVG reconstruction.
- [x] Reduce Sky Spiral road geometry and InstancedMesh uploads to 10 m sector boundaries. Camera-relative road translation continues every frame, with deterministic parity and teleport regression tests added.
- [x] Resolve typed route sample vs. projected marker contracts in `route-map.ts` to protect strict TypeScript checks.
- [x] Leave legacy Coast visuals, original road topology/collision/record IDs, and Phase 3 Auto/30/60 controls unchanged by this visual/streaming pass.
- [ ] Verify above newly added contract tests and browser snapshots on the exact final feature SHA; test-first RED commits were recorded but cancelled Actions runs are not a verified RED result.
- [x] GREEN implementation committed: Sky Spiral's elevated half-turn overlay uses the cached SVG centreline; markers remain on existing route. Await CI verification.
- [x] Extract the existing unbounded classic-road centreline as a single typed source for Three.js, collision-space projection and route overview, preserving the exact sine curve and record/Ghost compatibility. CI pending.
- [x] Adjust road material finish (Neon rain-slick, Canyon dusty, Aurora frosted, Sky Spiral diffuse) without altering mesh geometry, collision, physics or Coast's Phase 2 palette. New contract tests committed; CI pending.
- [ ] Preserve road shape, 60 Hz collision geometry, mode layouts, record/Ghost compatibility and Phase 3 renderer settings.
- [x] Add browser capture/regression cases for Coast, Neon, Canyon, Aurora and Sky Spiral at desktop, mobile portrait and landscape, exercising preview, live minimap, saved 30 FPS and stable SVG identity; actual screenshots and CI pass remain pending.
- [ ] Obtain real-WebGL screenshots of all five tracks in showroom and during play at desktop, mobile portrait/landscape, English and zh-TW; inspect camera occlusion, accessibility and layout.
- [ ] Capture baseline/feature p50/p95 FPS, draw calls, triangles, memory when available; Android/iPhone thermal checks remain unverified unless genuine physical device results exist.
- [ ] Run complete TypeScript typecheck, unit, build, all 8 browser shards, World Tour, Cloud Save and exact-HEAD quality-gate before declaring merge-ready.
- [x] Document shared Road/Minimap source, 60 Hz simulation, GPU budget, and saved-history/ghost versioning requirements in CLAUDE.md to prevent regression.
- [ ] Evaluate road geometry proposals separately with track-path/collision parity and versioned saved times/Ghosts before changing any existing centreline or track length.

## Phase 2 Coast visual-quality implementation — evidence ledger (2026-10-27)

Branch: `feature/phase2-coast-visual-quality`. Scope: Coast art pass only; no Phase 1/3 gameplay or FPS controls.

- [x] Inspect latest main, TODO, CLAUDE.md, renderer/lighting/scene/VFX structure; create the Phase 2 branch from `3a5c25a`. Review and branch creation confirmed via GitHub.
- [x] Commit a test-first Coast scene contract and real-WebGL browser capture specification (`9c5679`). Historical RED test execution is **not verified**; test-only CI was interrupted by a follow-on push.
- [x] Commit Coast material/palette changes, typed pooled coastline scenery, tier-bounded instancing and QA render-load instrumentation (`bcff252`). These checkboxes indicate files committed, not runtime acceptance.
- [x] The new RED tests on `b93f31f` failed for the intended reasons on [CI 40532546923](https://github.com/weskao/skyline-rush/actions/runs/40532546923): palette module missing, perf load metadata absent and `world.js` past its new line ceiling.
- [x] The corresponding GREEN `04edea5` [unit/typecheck job](https://github.com/weskao/skyline-rush/actions/runs/40533007218) reported success; full-browser/Coast capture/Cloud Save are separate gates.
- [x] Merge refactored main `325fe9e` as `71a60cb`, then integrate later Phase 1 main `3788ca3` as `a55f7cb` without rewriting Phase 1. The GitHub comparison showed Behind 0 after the second merge.
- [ ] Obtain `BEFORE` images from the exact integrated main SHA `3788ca3` and `AFTER` from feature WebGL. These are distinct from a pre-race vs in-race comparison. Coast captures are required in Phase 2's quality-gate, and screenshot artifacts must be saved before a later Playwright suite clears them.
- [ ] Verify deterministic RED `tests/coast-visuals.test.js` on a test-only commit and GREEN on the implementation, plus strict TS and unit tests.
- [ ] Inspect actual Before screenshots taken from unchanged main and After screenshots from the running Coast WebGL renderer across 1440×900 / 390×844 / 320×740 / 844×390; verify cockpit and showroom camera modes, reduced motion and both locales.
- [ ] Report numerical before/after `?perf` p50/p95/FPS, draw calls, and triangles for identical conditions. CI SwiftShader is software-rendered, not physical device evidence.
- [ ] Validate manual Android Chrome / iPhone Safari and thermals when real devices are available.
- [x] Complete CI for the final Phase 2 integration commit `d0c889f`: [run 40543815702](https://github.com/weskao/skyline-rush/actions/runs/40543815702) reports unit/typecheck, all 8 browser shards, Coast visual-evidence, World Tour, Cloud Save and `quality-gate` successful.
- [x] Integrate Phase 2 into `main` without PR; integrated history includes Phase 2 commit `d0c889f` and the successful full Phase 2 CI noted above.

**Audio assessment:** Purely cosmetic Coast changes use existing Web Audio feedback; no new cues warranted.

## Delivered gameplay and presentation phases (2026-10-27)

**Checklist meaning:** The three milestones below mark feature delivery and integration into `main`, not proof that every physical-device or before/after performance acceptance step is complete. Keep such evidence gates unchecked in their phase ledgers below.

- [x] **Phase 1 — Flight and arcade gameplay feel:** Extend FLY, improve DRIFT → NITRO → FLY → clean-landing chain and localized feedback while retaining physics, records and mode rules. Implemented in `feature/phase1-flight-combo-gamefeel`, merged into `main` as `3788ca3`. Full [CI #40506587701](https://github.com/weskao/skyline-rush/actions/runs/40506587701) passed, including unit, 8 browser shards, Cloud Save, World Tour and quality-gate.
- [x] **Phase 2 — Coast visual-quality benchmark:** Deliver Coast scene/material/lighting improvements with tier-bounded scenery and render-work diagnostics, preserving gameplay. Merged into `main`; complete [CI #40543815702](https://github.com/weskao/skyline-rush/actions/runs/40543815702) passed, including Coast visual-evidence job, 8 browser shards and quality-gate. Manual screenshot review, same-device performance comparison and physical-device thermals remain separate unchecked acceptance items.
- [x] **Phase 3 — FPS and adaptive performance:** Deliver Auto / 30 / 60 FPS UI, persisted settings, adaptive render scale, and fixed 60 Hz gameplay. Merged into `main` via `b0d839b`. The feature branch's [CI #40543440614](https://github.com/weskao/skyline-rush/actions/runs/40543440614) did **not** pass the full quality-gate; CI and physical-device acceptance remain unchecked below.

## Module split: `main.js` and `audio.js` by responsibility (2026-10-27, `refactor/split-main-audio`)

**Status:** implemented as TDD slices (each new test failed against the previous tree first); local gates and full CI green; physical device check pending.

- [x] `audio.js` 403 → 243 lines: songs in `music-tracks.ts`, race→cue detection in `race-audio-events.ts` (pure, no per-frame allocation).
- [x] `main.js` 1,881 → 688 lines: cloud save, key map, touch controls, VFX/motion/notice, session progress and ghosts, race settlement, result screens, HUD, race selection, History dialog, photo mode, pressed buttons and `?perf` strip each moved to their own TypeScript module (map in `docs/refactor-architecture-audit.md`).
- [x] Remaining `main.js` (bootstrap, controller wiring, race lifecycle, phase orchestrator, frame loop) is the documented exception, held by a ratcheting ceiling.
- [x] Prevention: `tests/module-size.test.js` (400-line limit, ceilings only go down), `tests/legacy-js-names.test.js` (syntax and unresolved names in `src/**/*.js`), `.claude/rules/module-size.md`, `CLAUDE.md` section.
- [x] Bug found on the way: dragging an audio slider threw `showChannel is not defined` on every step and froze its label; fixed in `8dc75b1` with a browser RED → GREEN test.
- [x] Local evidence at `8c4ac0f`: `make verify` exit 0 (typecheck; 748 unit pass, 0 fail, 3 skipped; browser 450/450; World Tour 72/72); Firebase emulator suite 15/15 + rules 3/3 after the cloud and progress slices; `npm run test:layout` 30 + 42 after race selection.
- [x] HUD perf A/B (`make perf BASE=130a7e0`, 6× CPU throttle, 3 × 20 s): p50 16.7 / p95 16.7 ms / 59.9 fps vs baseline p50 16.7 / p95 16.8 ms / 60 fps. Vsync-capped; no sub-frame comparison.
- [x] Independent read-only review of every slice against `bc2838c` found no behavior divergence.
- [x] Full GitHub CI on `423b445` (workflow_dispatch `full_regression=true`, run 40518765394): unit, cloud-save, browser shards 1–8, world-tour-mid-race and quality-gate all success. The push run 40517690494 used the focused refactor gate.
- [ ] Physical iPhone Safari / Android Chrome pass (touch pad, tilt, audio slider drag, results/pause clickability).

## Phase 3 — FPS and adaptive performance (feature/phase3-adaptive-fps)

- [x] Merge current `main` into this feature branch, preserving main's Vue/TypeScript module extraction and RED tests; merge commit `b370169`.
- [x] Implement an isolated TypeScript FPS pacer supporting Auto, 30 FPS and 60 FPS (the original Phase 3 delivery; the later 90/120 FPS extension is tracked below).
- [x] Add local-only FPS preference storage with invalid-value fallback, bilingual VFX-panel controls, and independent Quality selection.
- [x] Keep fixed 60 Hz simulation and ghost sampling outside the rendering limit, and accumulate VFX elapsed time across skipped renders.
- [x] Limit adaptive rendering cost using the existing Three.js DPR/composer path without modifying saved graphics quality.
- [x] Add deterministic unit tests for pacing/auto policy and engine-state parity, plus browser tests for save/restore, i18n and malformed preferences.
- [ ] Confirm RED failure on the test-first commit from CI logs; record evidence explicitly before treating historical RED as verified.
- [ ] Confirm TypeScript/JS typecheck, unit tests, production build, all browser shards, World Tour, Cloud Save and exact-HEAD CI success.
- [ ] Capture paired baseline/feature frame p50/p95 and render-work timings in the same desktop/mobile environment. No before/after performance claims until measured.
- [ ] Validate Android Chrome and iPhone Safari on real devices, including thermals, input latency, 120 Hz capability and long-session stability.
- [x] Merge into latest main at owner's request without waiting for final CI; remaining verification gates stay open.

**Scope:** Auto uses sustained measured CPU-side render submission time; browser/driver GPU queues and device temperature require real-world verification. The original Phase 3 withheld 120 FPS pending physical-device acceptance; the follow-up branch adds 90/120 choices with conservative browser-refresh fallback, while device and thermal acceptance remains pending. `?perf` reports actual presented frame intervals, not merely the rate of rAF callbacks. Manual FPS never silently changes itself.

## FPS feature request — delivered in Phase 3 (2026-10-27)

**Status:** The approved Auto / 30 / 60 FPS scope is implemented and merged. This denotes functionality delivered, **not** an all-green Phase 3 CI or verified device-temperature improvement.

- [x] **Manual FPS selection:** User-selectable 30 FPS and 60 FPS; stored independently of visual Quality, with stable 60 Hz gameplay physics. The 120 FPS option is deliberately not available until separately validated.
- [x] **Automatic device-performance adaptation:** Auto adjusts render pacing/scale using sustained render-submission measurements; it respects a user's explicit manual FPS choice.
- [ ] **Future device acceptance:** Independently verify high-refresh support, input latency, before/after FPS/p50/p95 and thermals on physical Android/iPhone devices before claiming reliable 90/120 FPS or temperature improvements.

## Phase 3 extension — 90/120 FPS (feature/phase3-120fps-support, 2026-10-28)

- [x] Add persisted 90 FPS and 120 FPS manual choices in the existing bilingual VFX menu; keep graphics Quality independent.
- [x] Observe actual foreground browser rAF cadence before allowing 90/120 drawing, with graceful lower-refresh fallback (selected preference remains stored).
- [x] Extend Auto to cautiously promote through 60 → 90 → 120 only after sustained low render cost and measured refresh capability, retaining adaptive render scale and step-down under load.
- [x] Preserve fixed 60 Hz physics/ghost simulation and fractional render deadlines for accurate 90 FPS pacing on 120 Hz screens.
- [x] Test-first RED verified: [run 40629027500](https://github.com/weskao/skyline-rush/actions/runs/40629027500), unit-tests failed for missing 90/120 support at `734ef43`; the run was subsequently cancelled by a GREEN push.
- [x] Add deterministic unit coverage for 60/90/120 Hz cadence, Auto recovery/load, suspend/resume and persisted preferences, plus bilingual browser UI regression.
- [ ] Verify final HEAD's full GitHub CI quality-gate (typecheck, unit, browser shards, World Tour and Cloud Save) before treating branch as merge-ready.
- [ ] Verify high-refresh p50/p95, latency, temperature/power and long-session stability on physical 90/120 Hz Android/iPhone devices. Browser rAF timing and CPU render-submission costs do **not** prove GPU or thermals.

## Player feedback: gameplay excitement and visual quality (2026-10-27)

**Status:** The following are player-reported opinions and requests, not confirmed defects or approved implementation plans. Preserve them for evaluation without treating subjective comparisons as verified facts.

- [ ] **Flight duration:** Players report that the available FLY duration is too short.
- [ ] **Momentum and combos:** Players feel that the game is not exciting enough and does not offer enough opportunities for sustained acceleration, continuous rushing, or chaining varied moves and combos.
- [ ] **Visual polish:** Players want more aesthetically appealing and refined graphics; the earlier tracks are especially perceived as rough or unfinished.
- [ ] **Classic racing-game reference:** Consider studying or taking inspiration from classic racing games through [morluto/rea](https://github.com/morluto/rea), including gameplay and visual design. This is a reference suggestion only, not a decision to reproduce any game.
- [ ] **Weak engagement:** One player felt they could barely motivate themselves to finish and implied the experience lacked appeal to someone who regularly plays games.
- [ ] **Poor first impression and fun factor:** Players say the current visuals do not make them want to try the game and compare its entertainment value unfavorably with Mario Kart and KartRider.
- [ ] **Perceived amateur quality:** Players liken the presentation to an old university student project and describe the artwork as overly simplistic or unpolished.
- [ ] **Preference for realism:** Some players would prefer the visual realism associated with AAA racing games.

**Decision gate (future work only):**
- [ ] Review the feedback, propose possible improvements that fit Skyline Rush, and discuss the trade-offs and preferences through `AskUserQuestion` **before** deciding what to implement.
- [ ] Keep implementation scope and acceptance criteria undecided until that discussion is complete. Do not treat recording these comments as approval to change gameplay, art direction, or rendering.

## BUG: Tutorial trigger flow needs redesign — to be discussed (2026-10-26)

- [ ] **Symptom (as reported):** the tutorial only appears when the player selects the **first track** *and* has never completed or skipped the tutorial before. On any other track, or after a prior run/skip, it never shows up, so the entry point is hard to discover and depends on which track happens to be selected.
- [ ] **Current behavior (from code, unverified at runtime):** `start()` in `src/main.js` (~L1238) sends the player into the practice only when `!guideSeen`, setting `raceAfterTutorial = true`; `closeGuide()` and completion (`skyline-rush-tutorial-completed`, ~L2210) mark it as seen. Check how `guideSeen` interacts with track selection before assuming a cause.
- [ ] **Open questions to settle before any change:**
  - Should the tutorial be offered on first Start regardless of track, or be an explicit, always-visible entry (home button / Controls / first-run prompt)?
  - Should "skipped" and "completed" be tracked separately, and may a skipped tutorial be offered again later?
  - Which modes count (Free Drive, Daily, Cup, Time Attack, locked-track edge cases), and what happens when storage is unavailable (currently once per page)?
  - How should it interact with cloud save / a fresh device (currently local storage only)?
- [ ] After the flow is agreed: follow the regression-first workflow (RED → GREEN), cover desktop and mobile in en + zh-TW, and keep the tutorial isolated from records, unlocks, Ghost and Daily. Decide whether any new prompt needs an audio cue (UI/UX audio assessment).

## Mobile README media (2026-10-26)

- [x] Capture the real Coast game with a fresh demo profile in Chrome touch emulation: portrait 390×844 and landscape 844×390, English and Traditional Chinese. All four runs lift off using touch FLY and land after release; no page or console errors, no horizontal overflow.
- [x] Review four screenshots and a video contact sheet; add localized portrait-home and landscape-flight JPEGs plus a shared 13.125-second portrait GIF/MP4 to both READMEs. `imgmin` reduces the screenshot set from 1,087,024 to 197,454 bytes; `vidpress` reduces the MP4 from 1,331,650 to 1,214,410 bytes.
- [x] Check README synchronization, local media references, JPEG/GIF decoding, MP4 decoding and the documentation diff. Capture assertions verify visible FLY bounds, lift-off and landing in both orientations/locales.
- Documentation/media only: gameplay source is unchanged, so test-first RED and the full `make verify` gameplay matrix are not applicable to this change. Commit/push and exact-commit CI receipts are reported separately; no release or deployment is requested.
- [ ] Physical iOS/Android hardware, Safari and phone performance remain untested by these captures. GIF/MP4 are silent browser recordings.

## Development pause checkpoint — before Vue + TypeScript refactor (2026-10-25)

**Stop point:** complete the focused MODE-06 / 9G Championship Cup *data-integrity hardening* and hand off the remaining roadmap to a future Vue 3 + TypeScript architecture refactor. This is not the completion of the entire Cup UX or all TODOs. Do not start further modes, JavaScript-to-TypeScript migration, Vue-panel extraction, or a broad UI rewrite on this branch.

- [x] Merge `main` `f36c3ce` into `feature/todo-nonfirebase-20261025` via two-parent merge `df46d69`; preserve latest upstream work, HUD optimization and browser regressions.
- [x] Confirm prior HUD regression CI `40162448892` on `acbe5c2`: unit, 8 browser shards, cloud-save, World Tour and quality-gate passed. This does **not** provide a measured before/after HUD p50/p95 or historical RED.
- [x] Cup RED #1: add malformed saved/in-progress heat regression in `558d46f` and observe the expected unit failure in Actions `40175029652` (`Missing expected exception`).
- [x] Cup GREEN #1: validate completed heat snapshots before advancing or calculating standings in `51b52b6`; Actions `40175210037` unit: 576 passed, 0 failed, 3 skipped.
- [x] Cup RED #2: cover `cupComplete` / `cupTotalTime` in `afe1c88`; observed expected unit failure in Actions `40175367171`.
- [x] Cup implementation #2: extend the same standings validation to the completion and total-time readers in `754af46` without changing gameplay, UI, audio or stored formats. Unit job succeeded on Actions `40175527138`.
- [ ] Confirm all required jobs, including 8 browser shards, cloud-save, World Tour and `quality-gate`, succeed for the final feature HEAD. Code CI: https://github.com/weskao/skyline-rush/actions/runs/40175527138 ; a documentation commit starts a new exact-HEAD CI.
- [ ] Existing open items stay open: Cup saved mid-session recovery / quit-resume UX, real physical-device evidence, comparative HUD p50/p95, remaining MODE/UX/ENV/ITEM work, and all Firebase/Gamepad work.
- [ ] **Future separate project phase:** plan and implement the Vue + TypeScript centered refactor with component boundaries, typed simulation adapters, migration tests and feature parity. Do not convert the current large plain-JS codebase piecemeal merely to close this old `checkJs` TODO.

**Handoff:** stop after this bounded Cup data-integrity checkpoint. Do not merge into `main`, deploy or start unrelated features without a new explicit instruction. Notion progress: https://app.notion.com/p/4041a2df84a781638fa0fc182d8e05fb.
## Non-Firebase / non-Gamepad continuation (2026-10-25)

Branch: `feature/todo-nonfirebase-20261025` from `main` `f53bf0fc`. Evidence: [Notion stage 20](https://app.notion.com/p/4041a2df84a781638fa0fc182d8e05fb) and [feature CI](https://github.com/weskao/skyline-rush/actions?query=branch%3Afeature%2Ftodo-nonfirebase-20261025).

- [x] Audit the current main TODO and Notion stage history, keep existing completed features intact, and isolate this work on a new branch.
- [x] Commit desktop/mobile HUD DOM regression test source *before* the code change (`928bab8`); browser RED observation remains unverified without a completed run.
- [x] Commit an initial targeted fix: cache 16 repeated per-frame HUD element queries and skip 4 identical static text writes (`630b2ba`). This records code committed, **not** verified completion of Step 1 below.
- [x] Merge latest `main` (`94c44a3`) into this branch with a two-parent commit `5807225`; verify `behind 0`, preserving both recent World Tour fixes and branch HUD changes.
- [x] Commit follow-up browser tests for redundant racing status/label writes (`d34a9ab`) before its minimal optimization (`e5b0299`): `race-status`, `speed-caption`, and `countdown-label` only update when their text changes. TDD RED is **not observed**; test-only workflow was interrupted by newer pushes, so Step 1 remains open.
- [ ] Obtain observable RED on the pre-fix commit (test failure caused by unwanted HUD queries/writes), then a GREEN browser run on the fix commit, including desktop 1440×900 and touch 390×844.
- [x] Measure comparable before/after HUD CPU cost / frame p50,p95 with a running browser, include real values rather than assumed speedup. Done 2026-10-27: desktop GPU, throttled desktop CPU and a physical Galaxy A52 (`docs/verification.md` perf table).
- [x] Run `make verify`, `npm run test:layout`, and check the exact HEAD `quality-gate`; fix failures before ticking Step 1 as complete. Full CI #40489569625 on `a926b24` (includes `test:layout`) and local `make verify` passed; see Step 5.
- [ ] Continue the remaining non-Firebase / non-Gamepad tasks in this TODO after closing the verification gates. Preserve real-device acceptance as manual pending.

Firebase and Gamepad are explicitly excluded. Do not retick historical requirements or claim that a pushed commit is a passed test.


## Home version footer alignment (2026-10-25)

- [x] RED: the real Chrome regression observed a 2.5px center difference in zh-TW at 320px. Put the version inside the shared footer grid with centered alignment; retain the 44px What's New button and tablet access. No audio change is needed for static alignment.
- [x] GREEN: en/zh-TW at 320px/390px portrait, 844px landscape and 1440px desktop align within 1px and the version opens What's New through real clicks. The iOS safe-area regression passes. Real WebGL screenshots are in `playwright-report/footer-alignment/green/`.
- [ ] Finish `make verify` and `npm run test:layout`; receipts are in `playwright-report/footer-alignment/`. The first layout run hit a transient preview HTTP failure while another build rewrote the shared `dist/`; rerun sequentially.
- [ ] Exact-commit GitHub CI `quality-gate` and physical-device/Safari acceptance remain separate gates.

## CI regression: side-view showroom size measurement (2026-10-25)

- [x] Trace feature CI run 40157117052: all 10 AIRFLOW/hovering World Tour checks fail on the left camera's near-zero `screenWidth`; unit, eight browser shards and cloud-save pass.
- [x] RED: the unchanged `taipei: AIRFLOW showcase is not occluded` browser regression fails locally with width `2.476533666182568e-17` against the unchanged `> .035` size requirement.
- [x] Fix the shared QA projection in `inspectShowcase`: project the actual body mesh vertices instead of two axle endpoints that overlap in a side view. This only runs when QA requests inspection; camera, scenery, physics and audio need no change.
- [x] GREEN: the complete World Tour showcase browser file passes 37/37, including all five tracks, both AIRFLOW states and six angles with existing size/occlusion assertions unchanged. Real WebGL screenshots are preserved in `playwright-report/ci-showcase-width/green/`.
- [x] Unit tests: 575 passed, 3 skipped; production build and production-lock assertion pass. The initial full gate stopped because another process owned port 5178; rerun `make verify` with a free `PLAYWRIGHT_PORT` without stopping that process.
- [x] Full `make verify`: 575 unit tests passed / 3 skipped, production build, 422 browser tests and 42 World Tour tests passed. Log: `playwright-report/ci-showcase-width/make-verify.log`.
- [x] Inspect exact-commit main run 40161135561 on `94c44a3`: World Tour, unit, cloud-save and seven browser shards pass; shard 6 fails only on the trackpad handoff below. The aggregate gate is red, so release remains blocked.

## CI regression: trackpad snapshot handoff under delayed input (2026-10-25)

- [x] Trace main run 40161135561: the next track is selected, but the visual handoff observer sees no snapshot pair. Production CSS minifies `240ms` to `.24s`; `parseFloat` incorrectly schedules a 0.24 ms animation.
- [x] RED: the built-app regression reports `[0.24]` instead of 240 ms. After correcting time units, 210 ms input delivery reproduces the exact missing-handoff failure: a prior snap-back completes during a resumed swipe and clears its snapshots.
- [x] Shared fix: convert CSS seconds to milliseconds, cancel obsolete layer animations on resumed preparation, and clear snapshots only when the snap-back still owns them. Commit uses the same preparation path; shared cleanup releases the busy flag. Existing UI sounds remain appropriate; no audio change is needed.
- [x] Independent review found cancellation by reduced motion could leave input busy; its new regression reproduced RED (two stale snapshot children). An animation identity guard preserves successor snapshots and still unlocks when the current animation is canceled. Final read-only review found no blockers.
- [x] Full swipe browser file: 11/11 pass with unchanged handoff geometry assertions, including ordinary/delayed input, phone touch, reduced-motion interruption, momentum and edge behavior. Final regressions cover both native milliseconds and minified seconds, with real-game screenshots under `playwright-report/ci-swipe-handoff/`.
- [ ] Run full `make verify`, inspect exact-commit main CI, and continue Telegram job-status tables until all required checks pass. Physical-device/Safari acceptance remains separate.

## Remaining phone browser regressions (2026-10-25)

- [x] RED: the unchanged implementation reproduced all three original failures. The new fixed-date title regressions also failed at 320px and 390px on 2026-10-25's `Aurora Pass · Double traffic` title; full text overflowed its box.
- [x] Fixed-date title regressions pass at 320px and 390px in en/zh-TW after removing single-line clipping. The original two phone i18n flows pass too. Typography stays 14px and the Daily button remains at least 44px tall.
- [x] Pointer-event traces confirm that the next gesture starts during the previous snap-back: snapshot canvases still exist and `swipeBusy` rejects the new pointerdown. Wait for `#track-swipe-scenes.childElementCount === 0` after cancel/commit, rather than checking the unanimated `#world`. All 7 swipe tests pass; temporary event tracing was removed. Short-drag, next/previous-track, edge-swipe and hint-persistence checks remain intact.
- [x] Inspect real WebGL phone screenshots (320/390px, both locales) and desktop screenshots (1280/1440/1804px wide, 900px tall, both locales). All six desktop checks retain the 740px intro height without scrolling; typography wrapping needs no new audio. Evidence is in `playwright-report/phone-regressions/`.
- Local gate receipt: unit tests passed 547 with 1 skipped and production build passed. The first full browser run was interrupted at the user's explicit request to commit and safe-push first; its partial results are preserved in `playwright-report/phone-regressions/make-verify-interrupted.log`. After pushing, run the complete `make verify` again; its final output is recorded in `playwright-report/phone-regressions/make-verify.log`.
- Push/CI receipts: the mandatory home layout hook output is preserved in `playwright-report/phone-regressions/safe-push.log`; the exact pushed commit, workflow URL and final required-job conclusions are written after the run to `playwright-report/phone-regressions/ci-status.json`. These receipts distinguish observed results from pending checks without requiring a second documentation-only CI run.
- [ ] Physical device: Android has no attached device; paired iPhone is unavailable in CoreDevice. Ask for a connected/unlocked phone; do not equate emulation with hardware acceptance.

## CI regression: optional release hero images (2026-10-25)

- [x] Trace the shard 5 failure: v0.22.0 intentionally has `image: null`; the browser test still assumes the latest release has v0.21.0's localized OG image. The renderer correctly hides absent images, as required by `docs/release-announcements.md`.
- [x] RED: `PLAYWRIGHT_PORT=5193 npm run test:browser -- tests/release-announcements-browser.spec.js -g 'release hero image'` failed at the original visibility assertion (`Expected: visible`, `Received: hidden`) in real Chrome. No production change was needed: repair the test's version-dependent assumption.
- [x] GREEN: the complete release-announcements browser file passed 11/11, including a final rerun after screenshot stabilization. The repaired test checks all five displayed releases in en/zh-TW: image visibility/path/decoding when supplied, readable text and no stale `src` when absent, plus Enter never starting a race.
- Historical full run before the phone follow-up: unit tests passed 547 with 1 skipped; production build passed; browser suite finished 397 passed / 3 failed. All three failures reproduced: `tests/i18n-browser.spec.js:173` en/zh-TW phone flows reported `daily-card-route` clipping (`Aurora Pass · Double traffic`, 183px > 160px), and `tests/track-swipe-browser.spec.js:42` phone swipe stayed on `coast` instead of `neon`. Their repair and current verification receipts are recorded above.
- [x] Independently run the World Tour gate skipped after the browser failure: `npx playwright test --config=playwright.world-tour.config.js --output=playwright-report/ci-release-hero/world-tour` passed 27/27.
- [x] Inspect settled real-WebGL release-dialog screenshots using the requested premium-ui-design Web/adaptive playbooks: desktop en/zh-TW, 390x844, 320x740 and 844x390. Text hierarchy, scrolling content and Continue remain readable/reachable without requiring a hero. Capture animations at their finished state; evidence and full gate log are in `playwright-report/ci-release-hero/`. Physical-device/Safari checks remain unperformed.
- At the announcement-only handoff, exact-commit remote CI was unverified. The follow-up repair's push and CI evidence are recorded above.

## Codebase refactor: Vue 3 + strict TypeScript as the primary stack (2026-10-25)

**Supersedes the earlier JSDoc-first migration plan for this dedicated refactor branch.**

- [x] Final continuation (2026-10-27): integrate current `main` collectibles guide into the typed Vue guide; preserve keyboard/touch/items tab exclusivity, reopen reset, both locales and existing panels. Observe the missing-items-tab regression RED → GREEN, run local `make verify` / layout / cloud gates and exact-commit full CI, and review running-game captures. Physical-phone performance/audio/touch/thermal evidence remains a separate requirement.
  - [x] Integrated `main`'s `bd71ac8` collectibles guide into `GuidePanel.vue`, preserving the extracted panels. Migrated its component/catalog to strict TypeScript. Chrome RED: clicking Items left its panel hidden; GREEN: 9 guide tests including tab exclusivity, reopen reset and en/zh-TW at 1440/390/320/844px. The 320px regression separately exposed 23px overflow from nonwrapping reward badges; wrapping fixes it. Strict TS/Vue and 17 focused type/i18n tests pass. Full verification remains pending below.
  - [x] Screenshot follow-up RED → GREEN: with AIRFLOW off at 390×844, the fixed showroom camera dock covered Start/Practice. The single dock now participates in compact intro layout (≤1000px), reserving space; desktop/AIRFLOW retain fixed placement and AIRFLOW explicitly retains visibility. All 25 camera tests pass, including normal-home nonintersection in both locales at 320/390/760/768/844/1440px and the existing ≥18px AIRFLOW Start gap. Strict TS/Vue plus all 693 unit tests pass (3 skipped). Full final verification is still tracked separately.
  - [x] Full-run follow-up: observed two migration-golden failures after the intentional camera layout correction. Updated only the five camera IDs' recorded order and the full stylesheet blob hash; all 228 element/tag/class records and every assertion remain intact. Independent review confirmed the stylesheet diff contains only the camera flow/visibility correction. Both parity cases now pass (2/2); physical visual signoff remains separate, and full `make verify` must be rerun against this final fixture.

**Focused TDD gate during migration (2026-10-26):** on refactor pushes, check strict TypeScript/Vue typecheck, unit tests and Cloud Save only. Defer Browser 8/8, World Tour and UI visual parity until all steps have been implemented; run `CI → Run workflow → refactor/vue-ui-typecheck-incremental → full_regression=true` and `make verify` at final exact HEAD. Focused quality-gate success is **not** merge-ready evidence. No bypass on main, other branches or release tags. Keep Step 1 / parity / Step 5 unchecked until final full verification.

The game loop, physics, WebGL renderer and hot-path HUD may remain `.js` only as measured,
documented exceptions. UI, state, business logic, services and new components default to
Vue 3 SFCs with `<script setup lang="ts">` and `.ts` modules. `jsconfig.json` checking a few
legacy files is *not* completion of TypeScript migration. Never tick incomplete coverage.

- [x] Step 0: establish Vue 3 + TypeScript-first architectural policy in `CLAUDE.md` and
  `.claude/rules/ui-architecture.md` (replaces the former JSDoc-only guidance).
- [x] Step 1: profile baseline/optimized HUD frame cost (p50/p95 on desktop/mobile),
  confirm no redundant DOM writes and full regression suite before marking complete.
  - [x] Hot-path HUD DOM setter idempotence is covered by tests/hud-dom.test.js (unit pass on focused CI 40290017276); p50/p95 real-device measurements and complete visual/regression suite remain open.
  - [x] Full CI #40391848831, SHA `0213b0d`: HUD 900ms audit on desktop 1440 and phone 390 shows 0 redundant id lookups, unchanged text/visibility writes. CI software-WebGL `?perf` (3s sampling only): desktop 1440×900 p50=199.9ms, p95=216.7ms, 5.1fps; phone viewport 390×844 p50=100.0ms, p95=116.7ms, 9.4fps. These are CPU-only CI observations and **not** a before/after or real GPU hardware comparison.
  - [x] Physical Android Chrome A/B (2026-10-27): Galaxy A52 5G, Android 14, production builds `bd71ac8` vs `a926b24`, three alternating 28 s Coast races each at thermal status 1: p50 33.3 ms in all six; p95 83.0/83.1/83.0 vs 83.0 ×3 ms; 24.2/24.1/24.2 vs 24.4/24.4/24.5 FPS. Refactor equal or better in every pair. Throttled desktop Chrome (6×/20× CPU, 412×915) agrees. A physical iPhone was replaced by this phone at the owner's direction (no signed mobile-mcp agent); iOS Safari flow ran in the Simulator. Data: `docs/verification.md`, `artifacts/refactor-20261027/android-a52-prod-ab-*`. `make perf` / `make perf-phone` repeat both checks.
  - [x] Superseded note: physical iPhone Safari / Android Chrome p50/p95 baseline-versus-refactor captures were outstanding; the actual desktop GPU comparison is recorded below. Browser `tests/perf-browser.spec.js` logs current optimized measurements in CI software WebGL without claiming a hardware comparison; do not mark Step 1 complete from emulation alone.
  - [x] Actual desktop GPU comparison (2026-10-27): macOS 27.0 / Chrome 156.0.8078.48 / Apple M4 Pro Metal, 1440×900 DPR 1, High/Cinematic, Coast Classic AUTO, three alternating 20s samples per build. Baseline `bd71ac8`: p50 16.7/16.7/16.7ms, p95 16.7/16.8/16.7ms, FPS 60/60/60; final source `cda325e`: p50/p95 16.7/16.7/16.7ms, FPS 60/60/60. No page errors. Raw data and game captures: `artifacts/refactor-20261027/desktop-performance.json`. This is headless Chrome using the actual Mac GPU, a version comparison rather than isolated HUD speedup proof; physical phones and sustained thermals remain open.
  - [x] Reproducible physical desktop/Android/iPhone baseline-versus-refactor profiling checklist added to `docs/verification.md`; device and browser configuration, 3×20s p50/p95 runs, visual/thermal evidence and attribution limits are explicitly defined. The checklist itself is not a measurement; actual desktop observations are recorded above, while physical-phone samples remain pending, so the parent Step 1 stays unchecked.
- [x] Step 2: strict `tsconfig.json`, shared TypeScript race/player/track interfaces,
  `<script setup lang="ts">` on Vue components and typed props; `npm run typecheck`
  must check TypeScript (and Vue SFCs), while explicitly separating legacy `checkJs` coverage.
  - Verified strict TypeScript, semantic Vue SFC checking and isolated legacy JS checking in CI run 40223963528 (6074422); TypeScript-first contracts and typed component props are present.
- [x] Step 2b (optional): decide on ESLint + TypeScript/Vue rules with a measured maintenance
  benefit; do not block feature parity merely to add tooling.
  - Decision: do not add ESLint now. Strict tsc + vue-tsc and existing Node/Playwright regressions already protect this migration; revisit only on demonstrated lint-only defects.
- [ ] UI parity acceptance before further broad rewrites: first-visitor start (desktop/mobile), main DOM/CSS structural contract, modal controls, screenshot comparisons on affected devices, exact-HEAD browser and cloud/World Tour gates. User-reported visual differences remain open until observed in a real browser and fixed.
- [x] Step 3: convert feature UI controllers, app services and state modules from `.js` to
  `.ts`, with typed engine-facing adapters and move-only behavioral guarantees.
  Main bootstrap/frame loop remains only as a documented performance exception.
  - [x] Inventory audited: TypeScript controllers/state/business and cloud services and Vue SFCs are under strict typecheck, with precisely 11 engine/render/audio/frame-loop JavaScript exceptions documented in `docs/refactor-architecture-audit.md`. Baseline full regression #40391848831 passed, and focused TS/Vue/Node/cloud/quality gate #40444880513 on `f4f953f` passed. New complete Browser/World Tour acceptance is checked separately in Step 5.
  - [x] Hot-path HUD `src/hud-dom.js` migrated to strict `src/hud-dom.ts`, without adding Vue frame reactivity or changing conditional DOM writes. GREEN focused CI #40387106570 (RED candidate #40387014293 was cancelled and must not be counted as observed RED). Final Browser/Layout/World Tour checks remain Step 5.
  - [x] Rear brake/Nitro/high-speed LED geometry and animation migrated from `src/rear-light.js` to strict `src/rear-light.ts` with no duplicate JS, preserving 3D shapes, boosts, calm/reduced-motion and pause behavior. Observed RED unit failure #40390895125 (missing typed module) → GREEN #40391254300 (690 unit pass, 0 fail, 3 skip; TypeScript/Vue, Cloud Save and focused gate success). Browser rear-light parity remains Step 5.
  - [x] Ten-track geometry and minimap projections migrated from `src/track-paths.js` to strict `src/track-paths.ts`, reusing typed Sky Spiral Vec3 and preserving all course profiles, boundary clamping, flat-map readability and helix map projection. Renderer, route-map.ts, World Tour and tests imports updated atomically. TDD RED #40384335633 → GREEN #40385034048 (689 unit passed, 0 failed, 3 skipped, strict TypeScript/Vue, Cloud Save, focused quality gate green). Full Browser/World Tour and real device parity remain Step 5.
  - [x] World Tour static scenery GPU instancing migrated from `src/world-tour-batching.js` to strict `src/world-tour-batching.ts`, with grouped Mesh type guards and no change to geometry/material identity, chunk matrices, draw-batch counts or parent markers. TDD RED #40383021940 → GREEN #40383799186 (688 unit pass, 0 fail, 3 skipped; TypeScript/Vue, Cloud Save emulator and focused quality gate green). Complete Browser/World Tour visual parity remains Step 5.
  - [x] Sky Spiral deterministic helix, jump gap, camera-relative coordinate and orthonormal road-frame geometry migrated from `src/sky-track.js` to strict `src/sky-track.ts`; game/world/sky scene/track path and tests updated atomically. Fixed-length Vec3 types preserve three axes without changing elevation or curve formulas. TDD RED #40381959781 → GREEN #40382466551 (687 passed, 0 failed, 3 skipped; TypeScript/Vue, Cloud Save, focused quality gate green). Exact-HEAD Browser/World Tour remains Step 5.
  - [x] WebKit shader pipeline warmup migrated from `src/shader-warmup.js` to strict `src/shader-warmup.ts`, preserving hidden lights, culling and visibility restoration, World renderer and existing tests. TDD RED #40377965371 → GREEN #40378453045 (686 pass, 0 fail, 3 skip, TypeScript/Vue, Cloud Save, focused quality gate). Native Browser and World Tour parity remains Step 5.
  - [x] Ghost replay stores and 512 KiB bounded per-ruleset replays plus validated Daily challenge history migrated from `history.js` to strict `history-ghost.ts` and `history-daily.ts`, with centralized 50-run policy. Existing storage keys and public exports preserved. TDD RED #40371362578 → GREEN #40371724839 (684 unit pass, 0 fail, 3 skipped; TypeScript/Vue, Cloud Save and quality gate passed). Browser World Tour parity remains Step 5.
  - [x] Cloud progress schema/Classic, Mode and Daily merge and identity dedup moved into strictly typed `src/cloud-progress-merge.ts`; `src/cloud-progress.ts` now owns versioned import, account-isolated local rollback and save/restore with no legacy `cloud-progress.js`. TDD RED for local TS gate #40368903124, GREEN of merge #40368478261 and exact-HEAD full local storage #40370747316 (strict TypeScript, 683 unit passes / 0 failures / 3 skips, Cloud Save emulator and focused quality-gate all passed). Full Browser/World Tour acceptance remains Step 5.
  - [x] Classic bests, medals, stars and paint preferences migrated to strict `history-achievements.ts` plus guarded `history-storage.ts` while preserving original localStorage keys, legacy coast best and public history exports. TDD RED #40370257485 → GREEN #40370747316 (683 unit pass, 0 failures, 3 skips; TypeScript/Vue, Cloud Save and focused gate passed). Full device and visual parity remains Step 5.
  - [x] AIRFLOW showroom art direction and camera presets migrated from `src/track-preview.js` to strict `src/track-preview.ts`; updated World renderer plus two showcase tests. Preserve all curated landmark distances, six camera modes, reduced-motion behavior, unknown future-track fallback and player/rival immutability; no duplicate JS. TDD RED #40363630707 → GREEN #40364111629 (680 unit passed, 0 failed, 3 skipped; TS/Vue, Cloud Save and focused gate green). Full Browser/World Tour and device screenshots remain Step 5.
  - [x] Road-relative car orientation migrated from `src/vehicle-pose.js` to strict `src/vehicle-pose.ts` with generic Quaternion-based mesh contract. Existing World renderer and road-stability regressions use the typed module, no duplicate JS. TDD RED #40362636641 → GREEN #40363093166 (679 passed, 0 failed, 3 skipped, TS/Vue and Cloud Save and focused quality gate green). Complete Browser/World Tour evidence remains Step 5.
  - [x] Shared car shell, canopy and road ribbon geometry migrated from `src/geometry.js` to strict `src/geometry.ts`; World/World Tour/Sky renderers and geometry tests now import the typed module. Existing winding and upward-normal tests pass. TDD RED #40355826973, fixed missing official Three.js declaration with pinned `@types/three@0.180.0`, exact-HEAD GREEN #40356913926: 678 unit pass/0 fail/3 skip, TypeScript/Vue, Cloud Save and focused quality gate green. Full Browser/World Tour remains Step 5.
  - [x] Gauntlet hazard generation and lane oscillation migrated as a move-only implementation from `src/hazards.js` to strict `src/hazards.ts`; updated game/world callers and five legacy test imports. Track seed stream, tunnel clearance, tier spacing and obstacle math unchanged. TDD RED #40354764534 → GREEN #40355365206 (TypeScript/Vue, 677 passed/0 failed/3 skipped; Cloud Save and focused quality-gate PASS). Full Browser/World Tour remains Step 5.
  - [x] Permanent ruleset Bests/Stunt peak cloud merge extracted from `src/cloud-progress.js` into strict `src/cloud-mode-bests.ts`, preserving mode signatures, best-time minimum, stunt maximum, score telemetry, 200-entry limit and original exports. TDD RED #40351705301 → GREEN #40352400023: 676 unit pass / 0 fail / 3 skip, TypeScript/Vue, Cloud Save Emulator, focused gate green. Browser/World Tour parity remains Step 5.
  - [x] Career aggregates, sorted Daily board, and star total/validation extracted from `src/history.js` into strict `src/history-stats.ts` while retaining the original `history.js` API and data formats. Observed RED #40350561005 → GREEN #40351144161 (675 unit pass, 0 fail, 3 skipped; TypeScript/Vue, Cloud Save and focused gate green). Full Browser/World Tour acceptance remains Step 5.
  - [x] Deterministic PRNG stream service and 20-second HUD performance statistics migrated without algorithm/stream-name changes to `src/rng.ts` and `src/perf.ts`; all imports updated and duplicate JS removed. TDD RED #40349403064 → GREEN #40350054789 (TypeScript/Vue, 674 unit passes, 0 fail, 3 skipped, Cloud Save and focused quality gate). Full Browser/World Tour parity remains Step 5.
  - [x] Per-account Cloud Sync status extracted from `cloud-progress.js` into strict `cloud-sync-status.ts`, keeping the existing public exports, stored key, pending/last-success semantics and blocked-storage protection. TDD RED #40340442536 → GREEN #40340769114 (typecheck, unit, Cloud Save, focused quality-gate). Full Browser/World Tour parity is Step 5.
  - [x] Input keyboard/touch/tilt controller migrated from `input.js` to strict `input.ts`; existing input tests plus new lifecycle regression, no duplicated JS. Canonical `game-types.ts` replaces unused JSDoc `game-types.js`. TDD RED runs 40334317350 / 40335751478 → exact-HEAD GREEN 40335983183 (TypeScript/Vue, 668 unit passes, 0 fails, 3 skips, Cloud Save and focused gate).
  - [x] Release note catalog and production/development progression access aliases migrated to typed modules with prior RED/GREEN evidence; no changes to player-facing copy or unlock rules. Focused CI 40333765235 and 40332262015 verified.

  - [x] Player-facing release notes and bilingual version announcements migrated as a single typed module; RED run 40331770864 → GREEN 40332262015 (strict typecheck, unit tests, Cloud Save, focused gate). All existing release records and localized copy preserved; full visual parity remains Step 5.
  - [x] Locale service migrated from i18n.js to strict i18n.ts, preserving UI/GAME catalogs, saved locale precedence, accessibility text and onLocaleChange; no parallel legacy copy. Focused CI 40284587634: TypeScript/Vue + unit 640 passed, 0 failed, 3 skipped; Cloud Save + quality-gate green. Browser/iOS manual parity deferred to final audit.
  - [x] Touch slide-pad state machine migrated to strict TypeScript, keeping its steering/brake math and removing duplicate JS; focused CI 40283660649 (typecheck; unit 638 pass, 0 fail, 3 skipped; Cloud Save; quality-gate).
  - [x] Minimap SVG route samples / live markers converted to strict TypeScript; duplicate JS removed, focused CI 40283144937 (typecheck, 637 pass / 0 fail / 3 skipped, Cloud Save, quality-gate). Browser visual check deferred.
  - [x] Visual SVG icons and track-section sign contracts moved to strict TypeScript; removed duplicate JS, no SVG/path/label edits; focused exact-HEAD CI 40282591936 (unit 636 pass / 0 fail / 3 skipped, Cloud Save and gate passed). Full visual parity still reserved for Step 5.
  - [x] Practice metrics and Sprint Series moved to typed services, without parallel JS copies; RED 40288752236 and GREEN 40288971774 (typecheck, unit, Cloud Save, focused gate).
  - [x] English/Traditional Chinese player-facing UI and game locale catalogs migrated as move-only typed files; RED 40317239579 → GREEN 40317562474 (typecheck, 663 unit pass, 0 fail, 3 skipped, Cloud Save and focused gate), original strings and keys unchanged; browser parity deferred.
  - [x] Ghost replay serialization, validation and 10 Hz interpolation migrated to typed service; RED 40316613266 → GREEN 40316856195, typecheck, unit 661 passed / 0 failed / 3 skipped, Cloud Save + focused gate. Browser Ghost UI check deferred.
  - [x] Interactive tutorial eight-step input controller migrated to strict TypeScript with typed legacy-engine adapter; RED 40315449839 → GREEN 40316234138 (typecheck, unit 659 passed / 0 failed / 3 skipped, Cloud Save + focused gate). Real desktop/mobile tutorial parity pending final Browser audit.
  - [x] Race configuration normalization and strict player request validation migrated to TypeScript without changing stored rules signatures or Classic defaults; RED 40314174935 → GREEN 40315046782, typecheck, unit 657 passed / 0 failed / 3 skipped, Cloud Save + focused gate. Final Browser/World Tour deferred.
  - [x] Mode-specific sound cues and in-race callouts migrated to strict TS; RED 40313264374 → GREEN 40313691599, typecheck, unit 655 passed / 0 failed / 3 skipped, Cloud Save and focused gate. Retained sound/callout event behavior; removed two duplicate JS files. Final browser/visual verification pending.
  - [x] Elimination, Checkpoint Rush and Stunt Attack rules migrated to strict TS (no duplicate JS); RED 40312341781 → GREEN 40312783413, typecheck, unit 652 passed / 0 failed / 3 skipped, Cloud Save and focused quality-gate success. Browser gameplay parity deferred to Step 5.
  - [x] Championship Cup standings and result validation migrated to strict TypeScript; RED 40289793617 and focused GREEN 40290017276 (typecheck, unit, Cloud Save, quality gate). Full browser gameplay validation deferred.
- [x] Step 4: move event-driven dialogs and panels to Vue 3 TypeScript one at a time
  (release notes, history, garage, audio/settings, guide/tutorial, etc.);
  remove duplicate imperative DOM ownership. Run desktop/mobile, accessibility,
  localization, Firebase/cloud-save, finish/pause and World Tour regressions.
  - [x] Automated Step 4 acceptance at exact code SHA `a9002c9`, [full CI #40445190377](https://github.com/weskao/skyline-rush/actions/runs/40445190377): strict TypeScript/Vue and 692 unit pass/0 fail/3 skip; 8×55 Browser cases; responsive layout 29+42; Cloud Save 15 browser+3 Rules; World Tour 72; quality gate success. Reviewed 18 Race Mode and 7 World Tour captured screenshot samples (desktop/mobile): no obvious clipping/overlap in these samples, **not** pixel-parity against `main` or physical device approval.
  - [x] Follow-up regression: same failed Google avatar URL must keep its fallback on locale/sync refresh; changed URL may retry. TDD RED #40451146836 (`c07f17c`, missing guarded profile update) → GREEN focused #40451343678 (`59ca5c1`, 693 unit passed/0 fail/3 skip, Cloud Save, TypeScript/Vue and focused quality gate green). Latest exact-HEAD Browser/World Tour regression belongs to Step 5.
  - [x] History Cloud Save profile (Google display name, account identity, HTTPS avatar + broken-image fallback) and status/action buttons are Vue-owned `cloud-view-state.ts` / `HistoryPanel.vue`, not competing DOM setters in `main.js`. Observed RED #40443850579 → GREEN focused #40444356946 for avatar identity (cloud emulator repaired to send realistic Vue image failure), and observed RED #40444601683 → GREEN #40444880513 for status, ARIA announcements, login/logout/switch/delete visibility, disabled sync controls. Focused checks: TS/Vue, 692 units pass/0 fail/3 skipped, Cloud Save emulator, quality gate green. Full desktop/mobile Browser/World Tour still needs final HEAD acceptance.
  - [x] The What's New opener unread badge and visibility are now Vue-owned reactive state (`release-view-state.ts` / `App.vue`), with no imperative DOM writes from `release-notes-ui.ts`; keyboard focus/click orchestration remains intact. TDD RED run 40344072762 → GREEN run 40344545178 (strict TypeScript/Vue, 673 passed / 0 failed / 3 skipped, Cloud Save, focused quality gate). Full Browser/World Tour/Layout confirmation remains Step 5.
  - [x] Audio settings Vue reactive presentation owns mute icon, Music/SFX switches, slider values, percentage labels and accessible value text. `audio-ui.ts` retains playback/localStorage only, no imperative HTML/ARIA writes. TDD RED #40341239974 → GREEN #40341674534 (TypeScript/Vue, 671 passed / 0 failed / 3 skipped, Cloud Save and focused quality-gate). Full Browser/audio parity remains Step 5.
  - [x] Settings and Controls disclosure buttons now derive aria-expanded from the same Vue reactive state as panel visibility, removing duplicate imperative writes; RED run 40288061638, GREEN run 40288441175 (typecheck, unit, Cloud Save, focused gate). Final screenshot parity deferred.
  - [x] Home-screen Daily Challenge and medal status now use a single typed Vue reactive view (`src/home-status-view-state.ts`), with no competing imperative writes in `history-ui.ts`; original `#daily-card-*` and `#medal-*` selectors, i18n and action buttons preserved. Observed RED in unit job of Actions 40337519982, then GREEN Actions 40337884060 (TypeScript/Vue checks, 669 passed / 0 failed / 3 skipped, Cloud Save and focused quality gate). Full browser/visual parity remains Step 5.
- [x] Step 5: final architecture and feature-parity audit: all new UI/business code
  uses TypeScript, `tsconfig` coverage is reported, remaining plain-JS exceptions
  are documented, and exact-HEAD `make verify`, layout and CI quality-gate pass.
  - [x] Earlier complete regression #40391848831 (`0213b0d`) passed TypeScript/Vue, 8/8 Browser shards, responsive layout, 72 World Tour, Cloud emulator and quality gate. It predates current Step 4 Cloud Save Vue changes and is not an exact-HEAD receipt for the updated code.
  - [x] Exact code SHA `a9002c9`, [full CI #40445190377](https://github.com/weskao/skyline-rush/actions/runs/40445190377): Unit/strict TS+Vue success (692/0/3), all Browser shards (440/440), responsive layout (29+42), Cloud Save emulator (15 Browser + 3 Rules), World Tour (72), and `quality-gate` success. This supersedes older code-only CI, but predates the small subsequent avatar fallback regression fix.
  - [x] Report's pending exact code SHA `4876c90` is now confirmed: full CI #40451947889 passed Unit/strict TS+Vue, all 8 Browser shards, Cloud Save, World Tour and `quality-gate`. This predates continuation commits `771274d` / `cda325e` and is not a current-source CI receipt.
  - [x] Code SHA `a926b24` (last source change): full CI #40489569625 passed Unit, all 8 Browser shards, Cloud Save, World Tour mid-race and `quality-gate`. Local `make verify` there: 448/449 Browser, the one failure a `page.goto` HTTP error from the local preview server (no assertion); rerun of that test ×3 (15/15) and World Tour 72/72 passed. Fixes since the last receipt: `034f0de` phone intro scroll edge, `d3f09e8` stylesheet golden, `a926b24` mid-race VFX rows without dropdowns (all RED→GREEN). Later commits are tooling/docs only and get their own full run.
  - [x] Superseded: continuation's final HEAD full CI remained open. Push only the current refactor branch through the normal approval path and confirm every required job on that exact commit; the initial push attempt was rejected by automatic approval review, so no new remote verification is claimed.
  - [x] Local macOS `make verify` on final source/test content (`cda325e` / `d1a91f4`) actually completed with exit code 0: strict TS/Vue/legacy boundary checks; 693 unit pass / 0 fail / 3 emulator-dependent skip; production build/locked-bundle assertion; Browser 447/447; World Tour 72/72. Preserved output: `artifacts/refactor-20261027/make-verify.log`. The first broad run's two old golden failures were repaired without removing assertions, then the entire gate was rerun successfully. This supersedes the earlier remote-container DNS blocker; exact-HEAD remote CI and physical-phone acceptance remain separate.
  - [x] Dedicated final-source local gates completed, both exit 0: `npm run test:layout` passed 29+42 cases; `npm run test:cloud` passed 15 emulator browser cases and all 3 Firestore Rules tests (0 skipped). The normal unit run's three emulator-dependent skips were exercised here. Outputs: `artifacts/refactor-20261027/layout.log` and `cloud.log`. Java 25 and synthetic emulator accounts were used; no production cloud save was tested or modified.
  - [x] Pushed `a2e2563`: full CI #40473458810 passed Unit, all 8 Browser shards, Cloud Save, World Tour and `quality-gate`. Later commits still need their own exact-HEAD full run.
  - [x] iOS 26.5 Simulator Safari (iPhone 17 Pro, visible viewport 402×714) on the phone-dev server: first visit → tutorial throttle lesson by touch → Skip → Coast race → Pause → switch to zh-TW over the pause screen → Resume → finish (2/4, new record) → Next starts Neon Downtown. Found a pre-existing (also in `main`) hard clip of the scrollable phone intro on the footer line that made History/Garage look cut by the footer; fixed in `034f0de` with a non-AIRFLOW scroll-edge fade (RED→GREEN 402×714 test; race-modes + showcase-camera 48/48; layout 42/42; unit 693/0/3). Simulator evidence, not physical-device acceptance. The Android 16 emulator's network dropped repeatedly this session (baseline equally blank), so Android Chrome relies on the earlier `artifacts/refactor-20261027/android-*` captures.
  - [x] Physical Galaxy A52 (Android 14, Chrome 155): production A/B equal or better in every pair (Step 1); touch Start, tutorial Skip, VFX panel, Pause, Resume, finish (2/4, new record) and Next → Neon Downtown all work; Chrome's media audio stream runs unmuted during racing; thermal status stayed light (SKIN ≤ 37.9 °C). Before/after screenshots of each UI fix were sent to the owner. The owner then confirmed the audio sounds right and ran both production builds on a physical iPhone 16 Pro (iOS 26.3, Safari): same frame rate on the `?perf` strip, Start/Pause/Resume/finish/Next working, no UI problems (observation, per-run numbers not recorded).
  - [x] Superseded: baseline vs optimized p50/p95 on actual comparable desktop/mobile hardware, screenshots reviewed by a human, iPhone Safari/Android Chrome touch/audio/thermal acceptance are still unavailable and are not substituted by software WebGL or viewport emulation.
- [ ] Not planned: a mandatory Big Bang `.ts` rewrite of WebGL rendering/physics
  or reactive per-frame HUD; performance correctness takes priority.

## Audio preference moves from cookies to localStorage; Chrome first-visit autoplay (2026-10-25)

- [x] Repro in real Chrome with its default autoplay policy (Playwright strips `--autoplay-policy=no-user-gesture-required`; scratch script, 4 runs): `AudioContext` stays `suspended` on load as Chrome requires, and the first click or key resumes it (`running`, audible RMS > 0.01). Autoplay without a gesture cannot be fixed client-side; the existing first-gesture unlock (`unlockAudio`, `src/main.js`) is the fix and is kept.
- [x] Preference storage: `src/audio-settings.js` `readAudio(localStorage)` reads `skyline-rush-music` / `skyline-rush-sound` (`on`/`off`) and `-volume` percent; `setAudio` in `src/main.js` writes them. Nothing stored → on at 100%, stored as `on` on the first `unlockAudio`. Cookie writes and the `skyline-rush-audio-v=2` legacy marker are gone.
- [x] RED: `tests/audio-settings.test.js` rewritten against a storage object failed on the old module (`AUDIO_KEYS` missing). GREEN: `npm test` 533 pass; `npm run build` ok; `npx playwright test tests/browser.spec.js -g "music|audio|volume|sound"` 13/13 (off choice + volume survive reload from localStorage, saved off stays silent after the gesture, fresh visit stores both channels `on`).
- [ ] Full `make verify` and CI `quality-gate` on the committing HEAD; a human check in desktop Chrome/Safari/Firefox and on a phone that the first tap starts the intro music.
- [ ] Known loss: a music/sound-off saved in the old cookie is not migrated; those players hear audio once more and have to mute again.

## CI regression: trackpad momentum must select one course per swipe (2026-10-24)

- [x] Inspect failed CI run 40102405872: only browser-tests shard 6 failed; the existing Playwright RED shows expected `neon` but actual `alpine` during one prolonged wheel gesture. The aggregate quality-gate correctly failed because the browser shard was red.
- [x] Trace `src/main.js` wheel gesture lifecycle: under CPU-heavy WebGL event gaps can exceed the 160 ms inactivity timer, rearming the same swipe and advancing several tracks.
- [x] Add a dedicated browser regression simulating momentum event intervals beyond 160 ms in `tests/track-swipe-browser.spec.js`, committed before the fix.
- [x] ~~Apply the minimal shared fix: increase the wheel gesture idle window to 320 ms~~ — replaced. Any CI delivery hiccup over 320 ms still split a swipe, and users would have to pause 320 ms between swipes.
- [x] Root cause, measured: wheel events were stamped 16 ms apart (`event.timeStamp`), but Playwright/CDP delivered some 168–203 ms apart while frame times stayed under 50 ms. The 160 ms wall-clock timer read late delivery as a pause, and also reset unfinished drags. Fix in `src/main.js`: the gesture pause is timed on `event.timeStamp` (`WHEEL_END_MS` back to 160 ms), and the timer only springs an unfinished drag back.
- [x] Deterministic RED/GREEN: both trackpad tests send CDP wheel events stamped 16 ms apart (`trackpadSwipe`): one delivers a single event 300 ms late, the other delivers every event 210 ms apart. On the original timer code: 3/3 RED (expected `neon`, got `canyon`/`aurora`). After the fix: the whole `tests/track-swipe-browser.spec.js` passes 30/30 local runs (6 repeats).
- [x] CI run 40110604502 on `1fd4178` failed only on "a nudge springs back": the Linux runner scaled native CDP wheel deltas, so a 40 px nudge passed the 96 px swipe distance (macOS does not scale). `trackpadSwipe` now dispatches a `WheelEvent` with a pinned CSS-pixel delta and a pinned `timeStamp`. On the original timer code: 6/6 RED (got `canyon`/`coast`). On the fix: 20/20 GREEN locally.
- [x] Obtain GREEN evidence on the final commit, including both trackpad tests and all CI shards, then mark the confirmed tests complete. Done: run 40113913209 on `ab150f3` passed all eight browser shards, unit, cloud-save, World Tour and `quality-gate`. The earlier RED was observed on the original test in the cited CI run; the new focused test was committed test-first but its isolated RED has not been separately observed.
- [ ] Confirm real Mac trackpad gestures, momentum separation and touch/mouse swipes remain natural before calling this a fully device-verified fix.

## Regression-first workflow adoption (2026-10-24)

- [x] Define one reusable six-gate development protocol in `docs/regression-first-workflow.md`: root-cause analysis, observed TDD RED, GREEN, cross-track/input matrix, local and manual WebGL checks, exact-commit CI before user-authorized merge.
- [x] Reference the protocol from `CLAUDE.md` and `AGENTS.md`, alongside the existing file-scoped physics/UI regression rules.
- [x] Provide `make verify` to run unit tests, production build via `pretest:browser`, all standard Playwright tests and the separate World Tour fixture suite.
- [x] Add GitHub CI `quality-gate` that fails unless unit/browser/cloud/World Tour jobs all succeed; block manual feature-branch deployments and make deploy consider World Tour results.
- [x] Run CI on future `feature/**` pushes while keeping the explicitly disabled `feature/mode00-objective-contract` branch excluded.
- [x] Confirm the complete `quality-gate` succeeds at the **final** feature HEAD; test infrastructure changes are not accepted based on an older SHA.
  - Green: run 40113913209 on `ab150f3`, the last code commit. Later commits that only touch `TODO.md` add no code to gate.
  - `ddbeb3a` (run 40102405872) failed: the trackpad-swipe test above failed in shard 6; `main` `d2b35e5` fails CI on the same test. The fix is in the section above, and the gate is re-checked on the commit that carries it.
  - `1fd4178` (run 40110604502, main merged in) failed only on the CDP delta scaling recorded above.
- [ ] Complete real-game visual/interaction evidence for Sky Spiral road clipping and Tokyo finish controls on affected devices (automation alone cannot certify these).
  - Done at `ddbeb3a` (headless Chromium, real WebGL, 1440×900 and 390×844 touch): Sky Spiral approach, helix entry, both quarter turns, left/right rail, helix exit and first ramp at ~305 km/h show the car seated on the banked road with no clipping, and 0 page errors. Tokyo finish after 2 real collisions: camera, language switch to zh-TW, Next and Race Again all respond to real clicks (`tests/tokyo-finish-controls-browser.spec.js`, 4/4).
  - Still open: a human playthrough on a physical iPhone/Android (touch hardware, Safari WebGL) and on desktop Safari/Firefox.
- [ ] Before user-approved merge, integrate latest `main`, resolve any conflicts, repeat exact-commit CI and assess manual evidence; do not claim merge readiness while behind or unchecked.
  - `main` (`d2b35e5`) is fully merged, with 0 commits behind and no conflicts. Still waiting on a green gate at the final HEAD, the physical-device check above and the user's merge approval.
- [x] Consider configuring GitHub branch protection/ruleset to require `quality-gate` on `main` if repository administration permissions become available; documentation/CI do not by themselves prevent direct pushes.
  - Ruleset `main requires quality-gate` (id 25785253, active, 2026-10-24) on the default branch. Repository admins can bypass it so the local-merge and `/release` flow keeps working; every other push or PR to `main` needs a green `quality-gate`.


## Sky Spiral & cross-track cornering stability (2026-10-24)

- [x] Identify shared renderer issue: local road orientation was converted back into Euler angles, overwriting road pitch/banking in curved and elevated sections.
- [x] Compose steering lean, airborne pitch, drift and trick roll as local quaternion offsets, keeping the canonical road frame on Sky Spiral and all five World Tour tracks.
- [x] Prevent repeated rail crashes while steering continuously into the same road edge; re-arm only after pulling away; preserve first-contact collision and existing scrape behavior.
- [x] Add pose-continuity, road-alignment and repeated-rail-contact regression test sources covering all routes.
- [x] Run full `npm test` through GitHub Actions on feature commit `b4134c0` (unit-tests: success). Previous run exposed a braking regression, fixed by preventing drifting while pressed against the contacted rail.
- [ ] Independently capture the initial RED for each newly introduced focused regression test; the full green unit run alone does not prove TDD test-first execution.
- [ ] Run `npm run build`, desktop/mobile Playwright, and full GitHub CI on this feature branch.
- [ ] Manually verify actual driving at Sky Spiral's helix entry, both quarter turns, exit, rails, elevations, ramps, and every other track; capture before/after gameplay screenshots or recordings.
- [ ] Independently verify vehicle-to-road mesh clearance at high speeds and road edges with real WebGL rendering.

## Tokyo finished-race UI controls (2026-10-24)

- [x] Merge latest `main` into `feature/sky-spiral-cornering-stability` using a true two-parent merge commit (`baa46ec`), retaining upstream game mode fixes and the feature changes.
- [x] Fix a concrete click-interception risk: `.aero-tools` (language and VFX) was at the same stacking level as the later `.race-overlay`; lift it above the results overlay without removing either control.
- [x] Add desktop and touch Playwright coverage for Tokyo: multiple actual simulation collisions, finish, camera click, language switch, Next, Race Again and page errors (`tests/tokyo-finish-controls-browser.spec.js`).
- [x] Document UI layer/input invariants for future changes in `CLAUDE.md` and `.claude/rules/ui-phase-interactions.md`; document car pose and rail rules in `.claude/rules/vehicle-road-stability.md`.
- [ ] Confirm actual Playwright results and pointer hit targets (desktop and mobile), plus real device/browser reproduction and before/after images. Script committed does not mean browser behavior passed.
- [ ] Confirm all CI jobs are green at the final tested commit and report exact run URL; separate `playwright.world-tour.config.js` testing must also finish.

## 每日挑戰：禁止飛行 UI / UX 修正（2026-10-25）

- [x] 「禁止飛行」時 FLY 控制停用、清除 Toggle；鍵盤與觸控不得啟動起飛。
- [x] FLY 顯示降彩度及鎖頭，HUD 改為禁止飛行與能源用途提示；中英文與 ARIA 同步。
- [ ] 實機 iOS Safari 與 Android Chrome 手動確認禁用控制及輔助工具朗讀。

## 每日挑戰獎勵規劃（未納入本次實作）

保留目前每日獨立排行榜／最快成績及既有獎章規則。本階段僅記錄需求；獎勵數據結構、雲端同步及解鎖規則尚未設計或實作。

- [ ] 首次完成當日挑戰的獎勵：明確界定完賽、首次領取及每日重玩不重複發放，顯示領取狀態。
- [ ] 三種挑戰（禁止飛行／雙倍車流／僅限金環）的專屬成就：設定條件、進度與中英文敘述。
- [ ] 連續完成天數與獎勵：以本地日界或伺服器日界制定一致規則，處理跨時區、補登及中斷。
- [ ] 每日挑戰限定車漆：設計達成門檻、展示／裝備流程；不影響車輛能力及既有星數解鎖。
- [ ] 獎勵上線前補 TDD：本機防重領、Firestore 免費額度評估、跨裝置合併、離線重試及手機／桌面領獎驗收。

## UX-Release-01 — 玩家可讀的新版本公告（What's New，2026-10-24）

規格：[docs/release-announcements.md](docs/release-announcements.md)。開發於 `feature/whats-new-release-announcements`，從 `main` 建立。僅對已正式發布的新版本公告已確認的玩家體驗，不展示開發技術詞彙。

- [x] **TDD 狀態契約：**可發布公告判斷、每版本已讀、Local Storage 受阻與相容既有更新重載機制，先 RED 後 GREEN。
- [x] **玩家公告資料：**已建立版本、日期、English／繁中玩家導向文字及可選圖片（無圖完整顯示）；Node 測試與正式建置已在 [Actions #40097497428](https://github.com/weskao/skyline-rush/actions/runs/40097497428) 對應提交成功，仍待最新 UI browser 驗收。
- [ ] **桌面／手機公告 UI：**原生 dialog、版本與更新卡、圖片缺失降級、44px 控制、手機安全區、無障礙與減少動畫。
- [ ] **觸發及互動：**僅首頁安全狀態首度顯示、關閉存已讀、Escape 與按鈕、首頁版本號可重新開啟，其他 dialog／教學／賽事不打斷。
- [x] **公告文案英文規則：**`CLAUDE.md` 已規定所有公告從玩家角度描述新體驗，避免工程專業術語，且英／繁中同步更新；已重新讀取確認。
- [x] **雙語與可維護性：**介面及更新內容支援 en / zh-TW、開啟時跟隨全站語言選單即時切換；CLAUDE.md 英文規則要求玩家導向文案；無新套件或後端。
- [ ] **自動化測試與 CI：**改版後重新驗證：`npm test`、`npm run build`、`npm run test:browser`、`npm run test:layout` 全數通過；推送後的 CI 狀態另行確認。（2026-10-25：`npm test` 534/534、build 通過、`test:layout` 29＋42 通過；`test:browser` 修正封鎖儲存空間時自動彈出的問題後仍有 i18n 手機每日挑戰路線文字被截斷（183>160px），`origin/main` 同樣失敗，非本分支造成，待修）
- [x] **真實畫面佐證：**改版後的桌面 1440×900（English）與手機 390×844（繁體中文）公告畫面已擷取、標註並傳送 Telegram（2026-10-25）。
- [x] **移除完整更新紀錄：**公告內不再出現「完整更新紀錄 / All changes」連結，相關文字鍵與樣式一併移除；瀏覽器測試確認對話框內沒有外部連結。
- [x] **最近五版切換：**以版本分頁顯示最新 3–5 個已發布版本（最多 5 個、不顯示尚未發布的版本），可點擊或用 ←/→、Home、End 切換，切換語言保留所選版本，重新開啟回到最新版。
- [x] **自動顯示與已讀紀錄：**localStorage 記錄玩家看過的最新版本；有更新版本時自動顯示，一顯示就更新紀錄並清除提示點；新玩家不顯示舊消息但會記錄目前版本。
- [x] **發版前更新公告：**`CLAUDE.md` 與規格要求每次發版前先寫好該版公告（圖片可選，存於 `public/whats-new/<version>/`，歷史內容與圖片保留在 repo）；`scripts/release-gate.sh` 透過 `scripts/check-release-notes.mjs` 擋下缺少公告的版本。
- [x] **介面美化：**版本分頁、更新類型標籤、主視覺、置底的「繼續遊戲」按鈕與進場動畫（減少動畫時停用），桌面與手機四種尺寸皆不溢出。（2026-10-25：公告瀏覽器測試四種尺寸通過、`test:layout` 29＋42 通過，桌面／手機截圖已人工確認）
- [ ] **實體裝置驗收：**iOS Safari／Android Chrome 觸控、短橫向、字體放大、返回首頁等（無真機則保留未完成）。


## 最高優先：儲存與跨裝置還原（2026-10-23）

原則：需要在清除瀏覽器資料後還原的遊戲成果，以 Google 登入後的 Firestore 帳號資料為主、本機資料為離線副本；裝置操作偏好留在本機。Firestore 單一使用者文件採版本化格式，僅在登入、完成比賽及成果改變時同步，不按影格寫入。勾選只代表該項已實作並完成對應驗證。

執行順序：先針對每個雲端欄位與跨裝置情境寫會失敗的單元／規則／瀏覽器測試，再寫最小實作，最後跑單元、Firestore 模擬器、正式建置與相關瀏覽器測試。共用 `history.js` 既有讀寫與驗證邏輯；合併規則集中一處，不複製每個模式的儲存流程。每項通過對應驗證後才改為 `[x]`。

### 雲端基礎與資料安全

- [x] 建立獨立 Firebase 專案、台灣區 Firestore Standard、Google 登入與 GitHub Pages 授權網域；部署僅本人可讀寫的規則。
- [x] 查詢專案帳務設定，確認 `billingEnabled=false` 且未綁定付費帳戶；資料量與讀寫次數仍須遵守 Spark 免費額度。
- [x] History 提供登入／登出、成功／待同步／失敗狀態；離線或雲端失敗時不阻止遊戲使用本機進度。
- [x] 首頁提供容易發現的雲端儲存入口，開啟時直接帶到 Google 登入與同步狀態；驗證手機與桌面版面。
- [x] `skyline-rush-unlocked` 已解鎖賽道：首次登入合併本機與雲端集合，完成 Classic 解鎖後同步；禁止未知賽道進入儲存資料。
- [ ] 已發布網站實測「解鎖 → 儲存 → 清除 Cookie／Local Storage → 用同一 Google 帳號登入 → 還原」，另測不同裝置與手機 Safari 登入。
- [ ] 在完成本地與模擬器驗證後，依專案發佈規則把新版網站上線；部署後再執行上述真實帳號驗收。
- [x] 帳號切換時隔離不同玩家的本機副本，避免共用裝置將甲的進度自動上傳到乙的帳號；提供可理解的安全切換路徑。（Firebase Auth／Firestore 模擬器驗證）
- [x] 網路恢復後自動重試未同步成果；提供「上次成功同步時間／待同步」狀態，避免把本機成功誤認為雲端成功。（離線回線與跨瀏覽器還原模擬器驗證）
- [x] 提供本人刪除雲端進度與匯出資料的操作；驗證登出、刪除與重新登入的結果。（模擬器通過；正式站需先發布新版規則與程式）
- [x] 限制進度文件大小，並區分額度耗盡、服務不可用與本機寫入失敗；只有確認本機寫入成功才顯示「成果已留在本裝置」。（單元與模擬器瀏覽器測試）
- [ ] 發布後查看 Spark Usage 儀表板的實際儲存量及每日讀／寫量，並在正式站驗收服務故障提示；操作步驟見 `docs/cloud-save.md`。
- [x] 明確區分 Firebase 登入狀態與資料同步狀態；清除 Cookie、Local Storage 或 IndexedDB 後需重新登入，但不能把未同步資料誤標為已備份。（全新瀏覽器資料模擬器驗證）

### 要同步的遊戲成果（同一份版本化帳號進度）

- [x] `skyline-rush-stars`：各賽道最佳星數取較高值；還原後重新計算塗裝解鎖。
- [x] `skyline-rush-best-tracks` 與舊版 `skyline-rush-best`：各賽道最佳時間取較低值，舊版 Coast 成績只用來遷移。
- [x] `skyline-rush-medals`：獎章取聯集，同一獎章保留較早取得日期。
- [x] `skyline-rush-history`：Classic 最近 50 場紀錄；依紀錄內容去重、驗證欄位，合併時保留最新 50 場，並重算生涯統計。
- [x] `skyline-rush-mode-history-v1`：Custom、Time Attack、Cup、Stunt 等模式的最近 50 場紀錄；沿用原模式／規則簽章與最佳成績計算。
- [x] `skyline-rush-daily`：每日挑戰最近 50 筆；依挑戰 ID 保留獨立排行，避免誤併進 Classic 解鎖。
- [x] 替上述欄位新增版本遷移、Firestore 規則、模擬跨裝置合併測試及還原後 UI 更新；雲端舊版地圖資料不可被新版本覆蓋或遺失。
- [x] 對同帳號雙裝置同時完成比賽、重複登入、離線後回線與受損雲端資料做回歸；重試不得重複紀錄或倒退最佳成績。（雙瀏覽器並行交易、離線回線、重複登入與合併單元測試通過）
- [x] 重要合併、復原與帳號隔離問題先以失敗測試重現再修正；共用賽道清單與既有資料驗證，通過完整單元、Firestore 規則模擬器、相關瀏覽器案例與正式建置檢查。

### 維持裝置本機儲存的項目

- [x] 音樂／音效開關與音量：現有 Cookie；不需要隨帳號跨裝置同步。
- [x] 駕駛控制與觸控配置 `skyline-rush-controls`、鍵盤改鍵 `skyline-rush-keymap`、AUTO `skyline-rush-auto`：裝置與輸入方式相關，維持 Local Storage。
- [x] 畫質／特效 `skyline-rush-vfx`、語言 `skyline-rush-locale`：維持 Local Storage，換裝置使用該裝置預設值或自行選擇。
- [x] 已選塗裝 `skyline-rush-paint`、最近 3 組 Custom 設定 `skyline-rush-recent-custom-v1`：屬便利偏好，維持 Local Storage；塗裝的**解鎖資格**由雲端星數還原。
- [x] Classic／Time Attack Ghost `skyline-rush-ghosts`、`skyline-rush-mode-ghosts-v1`：體積較大且可再跑出，保持裝置本機，不塞進 Firestore 進度文件。
- [x] 為 Ghost 設容量上限或遷往本機 IndexedDB，避免 Local Storage 額滿導致重要成果的本機副本無法寫入。（Classic／模式 Ghost 各限 512 Ki 字元，超過時淘汰最舊重播；單元測試驗證）
- [x] 教學已看／已完成、裝置效能提示：維持 Local Storage；瀏覽器資料清除後重新顯示不會損失遊戲成果。
- [x] 上次賽道 `skyline-rush-last-track` 與更新檢查標記：維持 Session Storage，僅供目前分頁使用。
- [x] 評估 Ghost 與偏好的可選匯出／匯入：目前維持裝置本機，理由與日後跨裝置方案見 `docs/cloud-save.md`；尚未提供這些項目的匯入／同步。

進度更新（2026-10-24）：Firebase 雲端儲存功能已由 `feature/firebase-cloud-save` 合併至 `main`（`671416cd`）；本分支整合 main，保留 MODE-00 TDD 與玩法項目。雲端存檔正式站與 Safari 驗收尚未完成；請依 `docs/cloud-save.md` 驗證。詳見 [階段 15](https://app.notion.com/p/4021a2df84a7817da29afa84cf8bb326)。

## 操作教學 v1（2026-10-23）

- [x] Desktop：靜態鍵盤示意與目前自訂按鍵、中英文說明。
- [x] Mobile：Slide／Buttons、加速、FLY、BOOST、NITRO 與暫停圖解。
- [x] Controls 可開啟並切換裝置說明；關閉後視為已看過教學（不再於載入時自動跳出，見下方首次開始流程）。
- [x] TDD 與整合驗證：首次／重開／儲存不可用／暫停、桌面與手機直橫向。
- [x] 搭配遊戲畫面、實際操作與逐步完成判定的互動教學（詳見下方互動操作教學）。
- [ ] 實體 iOS Safari／Android 觸控裝置驗收（目前以 Chrome 手機模擬驗證）。

驗證：379 項單元測試、正式建置通過；297 項瀏覽器案例中 290 項首輪通過、7 項重跑或修正後通過。語言測試的延遲音樂提示改用實際可見狀態處理，4 個使用檔案的 73 項相關回歸全部通過。畫面證據位於 `artifacts/control-guide/`。

## 互動操作教學（2026-10-23）

- [x] 真實 Free Drive 場景：加速、左轉、右轉、煞車、起飛、降落、BOOST、NITRO 八步，依實際輸入與車況判定完成。
- [x] 畫面提示與控制高亮；中英文、目前鍵盤配置、Slide／Buttons／Tilt、手機與平板直橫向。
- [x] 從操作教學與 Controls 開始；暫停、略過、退出、完成與重練流程。
- [x] 首次按「開始比賽」自動進入互動練習：「跳過」或完成後的「開始比賽」直接開始所選比賽；看過說明或練習後不再自動帶入，儲存不可用時每頁一次。
- [x] 教學隔離正式紀錄、解鎖、Ghost 與每日挑戰；退出還原原本選擇或暫停中的比賽。
- [x] TDD 單元、桌面與手機實際操作瀏覽器回歸、正式建置。
- [x] 傳送桌面／手機標註截圖與完成摘要。
- [x] 錄製桌面／手機八步操作影片並傳送 Telegram。
- [ ] 真機 Safari／Android／平板驗收（模擬器與瀏覽器尺寸測試不視為真機）。

驗證：444 項單元、325 項完整瀏覽器回歸及正式建置通過；最新教學檔案另由主代理獨立重跑 11 項全數通過。額外以繁體中文橫向 Slide 完成八步，提示卡與滑動區沒有重疊。截圖、桌面／手機影片與驗證說明位於 `artifacts/interactive-tutorial/`，均已透過 Telegram 傳送。教學採暫時標準按鍵位置；未授權 Tilt 暫用 Slide，旋轉仍可操作，退出即還原偏好。

Original baseline (everything below builds on these initial systems): a single 5 km coastal highway
sprint (`RACE_LENGTH`), 3 rivals, 36 recycled traffic cars, flight and BOOST sharing one `fuel` pool,
near-miss combos that recharge fuel, 7 purely decorative cyan rings in the sky (`world.js` gates),
and a single saved best time (`skyline-rush-best`).

Implementation rules: game rules live in the pure simulation layer `src/game.js`, test-first in
`tests/game.test.js` (TDD). `world.js` only renders, `main.js` owns the HUD and persistence. Pickup
and ring placement comes from a per-track seed so runs are reproducible and testable.

Branch rules: implement every new feature on its own new `feature/<name>` branch and commit to it
directly. Do **not** open a pull request for feature work.

Current scope: all gamepad-related work (input support, mapping UI, and acceptance checks)
is **Lowest priority** and **out of scope for this iteration**. Gamepad references below
describe future work, not current requirements.

Remaining open items are split into logic (Claude, `src/game.js` + `tests/game.test.js`) and UI
(Codex, rendering / HUD / browser specs) in
`docs/superpowers/plans/2026-10-20-remaining-items-split.md`, which holds the frozen UI
contracts, file ownership, the parallel schedule and the prompt for each AI; the sub-checkboxes
below mirror that split.

---

## 0. Desktop + mobile (applies to every item below)

Every item is done only when it works on both platforms. Targets match the viewports the browser
tests already use: desktop 1440×900, phone portrait 390×844 and 320×740, phone landscape 844×390
(touch). Desktop = keyboard (+ optional gamepad — **Lowest priority**, deferred; mouse for menus);
mobile = touch via the existing `(pointer: coarse)` detection and the `.touch-controls` layout.

### Shared rules

- **One input model**: every action is a named control in `input.js` (`fly`, `boost`, `nitro`, `brake`…)
  that keys, touch buttons, and gamepad (gamepad mapping — **Lowest priority**, deferred) all map to.
  Game rules never check the device
- **Same rules, same numbers** on both platforms; mobile only differs in layout, hints, and effect budget
- **Hints match the device**: desktop shows keys (`HOLD SPACE`), mobile shows button names (`HOLD FLY`),
  extending the existing `touchPreference` switch in `main.js`
- **Touch targets** ≥ 44×44 px, buttons never cover the car or the center callout area, respect
  `env(safe-area-inset-*)` for notches and home bars
- **Performance**: mobile gets a lower budget — smaller particle counts for pickups / drift / ring bursts,
  capped pixel ratio, fewer simultaneous HUD animations; measure frame time on a mid-range phone before
  and after each item
- **Orientation**: portrait and landscape both playable; landscape is the recommended racing orientation
- **Tests**: each item's browser test runs at a desktop viewport and at least one touch viewport

- [ ] **Physical-device acceptance** (manual — user on a phone, not Claude / Codex work; steps in
  the split plan §A): measure before/after frame time on a mid-range phone and
  check Android/iOS hardware and Safari. The 2026-10-20 implementation checks below cover desktop
  and touch-browser viewports; this real-device gate remains open (see `docs/verification.md`).
  - [x] iOS Simulator Safari (iPhone 17, iOS 26.5), 2026-10-20: Coast and Neon, portrait and landscape, touch FLY works; it found and fixed two short-landscape layout bugs (HUD overlap, START RACE below the fold)
  - [x] Measurement tool: `?perf` shows racing frame-time p50/p95/fps over the last 20 s; checked in iOS Simulator Safari (p50 17.0 ms, p95 24.0 ms, 59.7 fps on the Mac GPU, so not a phone number)
  - [ ] Real phones: frame time p95 on a mid-range Android (Chrome) and an iPhone (Safari), read from `?perf`; the Android emulator's translated GPU (7.5 fps, black 3D canvas) cannot stand in for hardware

### Mobile control layout (with all new actions)

Two thumbs, so the right side must not need two simultaneous presses. Steering has two modes,
picked in Settings → Controls.

**Mode A — Slide steering (default)**: no precise left / right buttons. The whole steering half of
the screen is a slide pad; put the thumb down anywhere and slide.

```
 ┌────────────────────────────────────────────┐
 │                                            │
 │  ┌ ─ ─ steering pad ─ ─ ┐    [NITRO]       │
 │      ◀ ── (●) ── ▶          [BOOST] [ FLY ]│
 │  │   slide down = brake │                  │
 │  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘                  │
 └────────────────────────────────────────────┘
   steering hand                action hand
```

- [x] Touch-down point becomes the center; horizontal distance from it = steering amount
  (dead zone 6 px, full lock at ~60 px, analog in between — `stepRace` already accepts a fractional `steer`)
- [x] If the thumb slides past full lock, the center follows it, so steering back the other way responds immediately
- [x] Release = straight ahead (with lane assist from 7C if enabled)
- [x] **Slide down past ~40 px = brake**; down + sideways = **drift** (brake + steer), so brake and drift need no button
- [x] A faint floating ring + knob shows where the center and thumb are; it fades after a few seconds of play
- [x] Pad covers the bottom ~45% of its half of the screen, so it never blocks the car or the callouts

**Mode B — Buttons (classic)**: today's `[◀] [▶]` + `[BRAKE]` buttons, for players who prefer tapping.

```
 ┌────────────────────────────────────────────┐
 │                                            │
 │  [◀] [▶]                  [NITRO]          │
 │                       [BOOST]  [ FLY ]     │
 │  [BRAKE]                                   │
 └────────────────────────────────────────────┘
```

Shared by both modes:
- [x] **AUTO accelerator on by default on touch** (the existing assist), so no thumb is spent holding the throttle; the gas button stays available when AUTO is off
- [x] Action hand: FLY (largest), BOOST, NITRO in an arc around it; sliding between FLY and BOOST holds both (AIR DASH)
- [x] **Drift = brake + steer** in both modes, the same rule as the keyboard

### Settings → Controls (control customization)

Mobile:
- [x] **Steering mode**: Slide (default) / Buttons / Tilt (device orientation, asks permission only when chosen); physical-device calibration acceptance remains open above
- [x] **Handedness**: steering on left (default) / steering on right — mirrors the whole layout for left-handed players
- [x] **Slide sensitivity**: distance for full lock (40 / 60 / 80 px)
- [x] **Button size** (S / M / L) and **opacity**
- [x] **Edit layout**: drag each action button (FLY / BOOST / NITRO / and the classic buttons in mode B) to a new spot, with a live preview over a paused race; Reset to default
- [x] **FLY behavior**: hold (default) / toggle

Desktop:
- [x] **Key remapping**: click an action, press the new key; conflicts are flagged and swapped; Reset to default (the `J`/`K`/`L` alternates from 7B are part of the default map)
- [x] **Steering sensitivity** (from 7C)
- [ ] **Gamepad mapping view** — **Lowest priority**; out of scope for this iteration

Both:
- [x] Saved to `localStorage['skyline-rush-controls']` with try/catch like the existing VFX settings; invalid / outdated saves fall back to defaults
- [x] `input.js` reads the saved map; game rules stay device-agnostic
- [x] Acceptance: unit tests for slide → steer mapping (dead zone, full lock, center follow, slide-down brake) and key remap conflicts; browser test at touch viewports: slide steering moves the car, Buttons mode still works, mirrored layout and edited button positions survive reload

### Per-item platform notes

| Item | Desktop | Mobile |
|---|---|---|
| 1. Tracks | Track select with keyboard / mouse, arrow keys + Enter | Swipeable track cards; lighter roadside detail and fewer neon lights / rain particles on Neon Downtown |
| 2–3. Nitro | `E` and `L` | NITRO button in the right-thumb arc; the 3-segment bar sits next to the button so the thumb sees it |
| 4. Rings | Full burst particles | Smaller bursts; ring centers slightly more forgiving (+10% radius) since touch steering is coarser |
| 5. History | Table with columns, hover for details | Stacked cards, tap for details; sparkline fits 320 px width |
| 6. Others | Daily challenge / achievements in the menu | Same, plus share-result via `navigator.share` where available |
| 7. Controls | `J`/`K`/`L` alternate keys, key remapping, steering sensitivity; gamepad (**Lowest priority**, deferred) | Slide steering default, Buttons / Tilt modes, handedness mirror, editable layout, AUTO default, FLY toggle |
| 8. UI / motion | Full motion | Same motion with fewer simultaneous effects; `navigator.vibrate` haptics where supported |

---

## 1. Three new tracks

First make tracks data-driven: a `TRACKS` table (name, length, palette / sky, traffic density, rival
speeds, special sections, seed for pickups and rings), read by `createRace(trackId)`. The current
coast track becomes `coast`.

| Track | Length | Mood | Signature mechanic |
|---|---|---|---|
| **Neon Downtown** | 4 km | Rainy night, neon billboards, wet reflections | **Tunnels**: 4 m ceiling, flying too high hits the roof (barrier contact). Traffic density ×1.5, so more near-miss chances |
| **Canyon Skyway** | 6 km | Desert noon, red rock canyon | **Broken bridge gaps**: 2–3 missing road sections you must fly over; falling = slowdown and respawn past the gap. **Crosswind zones** keep pushing the car sideways |
| **Aurora Pass** | 5.5 km | Snowy night, aurora sky | **Ice patches**: slower steering response. **Uphill sections**: slower ground recharge, so pickups and rings matter more |

- [x] `TRACKS` table + `createRace(trackId)`; `coast` behaves exactly as today (existing tests stay unchanged)
- [x] Special sections described as `{ from, to, type }`; `stepRace` looks them up by current distance
- [x] `world.js` switches palette / sky / roadside decoration per track (procedural geometry only, no downloaded assets)
- [x] Track select in the menu; unlock rule: finish top 3 on the previous track
- [x] Acceptance: every track can be finished; tunnel roof hit, gap fall, crosswind, and ice each have a unit test

## 2. Power-up: NITRO

Separate from the existing BOOST: BOOST still burns fuel (sustained), NITRO is a **one-shot burst**
with its own `nitro` reserve.

Nitro pickups on the road and in the air, in tiers:

| Pickup | Look | Adds | Where |
|---|---|---|---|
| Nitro cell | Small blue canister | **+0.25** | On the road, common, laid out in rows |
| Nitro can | Orange canister | **+0.5** | On the road, between lanes, requires a lane change |
| Nitro tank | Large gold tank | **+1** | In the air (flight only) or inside traffic gaps |
| Overcharge core | Spinning rainbow core | **Fills to the cap** | One per track, placed in a high-risk spot |

Use (press `E` / touch NITRO button):
- [x] Spends **1 full charge** for 2.5 s: speed cap `MAX_SPEED + 30`, much stronger acceleration, wider FOV + the existing lens boost effect
- [x] Cannot fire with less than 1 full charge (HUD shows that charge's fill progress)
- [x] Pressing again during NITRO **extends it by 2 s** instead of stacking speed (keeps it controllable)
- [x] Hitting traffic during NITRO keeps more speed (retention 0.45 → 0.7), rewarding bold driving

- [x] `player.nitro` (float), `player.nitroTime`; `input.nitro` with the `E` key / touch button
- [x] `race.pickups` generated from the track seed as `{ distance, x, altitude, tier }`; pass-through check uses the same previousDistance → distance window as near-misses
- [x] Pickup effects reuse the `effects.js` particle pool; sounds reuse `audio.js`
- [x] Acceptance: tests for each tier's amount, "under 1 charge cannot fire", and "extend does not stack speed"

## 3. Nitro cap: up to 3 charges

- [x] Cap of **3 charges** (`NITRO_MAX = 3`). Once a charge reaches 1.0 the next one starts filling, up to 3.0
- [x] HUD: 3-segment capsule bar; full segments glow, the filling one shows its ratio, the whole bar pulses `NITRO MAX` at 3
- [x] **Overflow conversion**: pickups at the cap convert the excess into fuel (each 0.25 = +8 fuel), nothing is wasted
- [x] Chained bursts: with 3 charges, pressing 3 times gives a 6.5 s burst (2.5 s + 2 s + 2 s via the extend rule)
- [x] Tests: pickup 0.5 at 2.9 → nitro = 3 and 0.4 converted to fuel; using one charge takes 3 → 2

## 4. Special rewards for flying through rings

Turn the existing 7 decorative gates into interactive rings. Only passing through the center
(`hypot(dx, dAltitude) < radius`) counts. Colors mean rewards:

| Ring | Color | Reward |
|---|---|---|
| Charge ring | Cyan (current color) | +20 fuel |
| Nitro ring | Gold | +0.5 nitro |
| Slipstream ring | Purple | 3 s of BOOST that burns no fuel (slipstream tunnel visual) |
| Risk ring | Red, smaller radius, placed high | +1 nitro + large score bonus |
| Mystery ring | Rainbow | One at random: **Shield** (absorbs the next collision), **Magnet** (pulls nearby pickups for 5 s), **Ghost** (pass through traffic for 3 s), **Freeze** (rivals slow down for 2 s) |

**Ring chain bonus**: rings appear in groups of 3–5
- [x] Clearing a whole group = **PERFECT LINE**: extra +1 nitro and a big HUD callout
- [x] Missing one breaks the group bonus (individual ring rewards already earned are kept)

- [x] `race.rings` as `{ distance, x, altitude, radius, type, group }`, generated from the track seed
- [x] `world.js` gates read position / color from `race.rings`; a collected ring bursts once and every crossed ring disappears
- [x] Shield / Magnet / Ghost / Freeze as `player.effects = { shield, magnet, ghost, freeze }` (seconds remaining)
- [x] Acceptance: tests for center hit (grazing the edge does not count), PERFECT LINE, and each mystery effect

## 5. History

- [x] Save one record per finished race to `localStorage['skyline-rush-history']` (keep the latest 50):
      date, track, position, time, collisions, near-misses, rings / PERFECT LINEs, NITRO uses, score
- [x] Best time per track (replaces the single `skyline-rush-best`; migrate the old value to `coast` once)
- [x] History screen: list filtered by track, best-run marker, sparkline of the last 10 times
- [x] Career stats: races, wins, total distance, longest combo, most rings in one run
- [x] **Ghost race**: record the best run's `x / altitude` trace at 10 Hz and replay it as a translucent ghost car next time; can be turned off in settings
  - [x] Controls UI: ghost toggle and per-track replay status; 10 Hz recording, validation and translucent playback connected
- [x] If storage fails (private mode) the game keeps working, using the existing try/catch pattern
- [x] Acceptance: unit tests for write / read / 50-record cap / old-best migration; browser test for the History screen

## 6. Other ideas to make it more fun

Ordered by small effort, big fun:

- [x] **Style score**: near-misses, rings, PERFECT LINEs, airtime, and clean sections score points; 1–3 star rating at the finish, so there's something to chase besides winning
- [x] **Slipstream**: staying right behind a rival / traffic car for 1.5 s → speed cap +6 and +0.25 nitro
- [x] **Air tricks**: quick left-right flick while flying = barrel roll; land it → +0.25 nitro; a hard landing loses the reward (uses `landing.speed`)
  - [x] Logic (Claude): flick detection within 0.3 s of raw `steer` sign change while airborne → `player.trick = { dir, time, done }`; 0.7 s roll; landing with `done` and `landing.speed < 11` pays +0.25 via `addNitro`, ≥ 11 writes `trickPayout = { nitro: 0, hard: true }`; contact / roof hit / gap fall / early landing cancel without payout; 8 unit tests (plan §C)
  - [x] UI (Codex → Claude): `world.js` body roll (`rotation.z`), callouts `BARREL ROLL` / `TRICK +0.25` / `HARD LANDING`, `TRICK` flight-state label, whoosh cue, haptic on payout, browser test at desktop + 390×844
- [x] **Rivals use NITRO too**: give rivals personalities (NOVA steady, ORBIT loves flying, APEX late surge) plus light rubber-banding to keep races tense
- [x] **Daily challenge**: date-seeded track + modifier (no flight, double traffic, gold rings only…), with its own board in History
  - [x] History UI: today's track + modifier, start action and the daily board (fastest five)
- [x] **Achievements / medals**: first win, zero-collision finish, 5 PERFECT LINEs in one race, triple nitro chain…, shown in History
  - [x] History UI: four medal entries with awarded dates; award rules and persistence in `src/history.js`
- [x] **Shortcuts**: one flight-only elevated shortcut per track, with pickups but also risk
  - [x] Logic (Claude): `{ from, to, type: 'shortcut', x: ±7.5, altitude: 6 }` section on all four tracks; `player.inShortcut` (|dx| < 3, |dAltitude| < 2.5); inside: flight burns no fuel and the speed cap gets +12; `shortcutPylons(section)` every 100 m alternating ±2.2 m, hitting one is `barrier` contact; corridor cells + one tank from `createPickups`; 7 unit tests incl. the coast-sections assertion update, plus the `SHORTCUT / FLY HIGH` sign entry in `world.js` (plan §D)
  - [x] UI (Codex → Claude): `world.js` elevated deck + pylons via `shortcutPylons`, `SHORTCUT` label and entry callout, `∞` fuel budget while inside, `trackNotes`, browser test at desktop + 844×390
- [x] **Final sprint**: in the last 500 m the music speeds up (`audio.js` bpm) and rival gaps are shown, for comeback drama
- [x] **Cosmetic unlocks**: stars unlock car paint / tail light colors (visual only, no stat changes)
  - [x] Garage UI: live previews; best stars per track (summed) unlock Coral 3 / Glacier 6 / Aurora 9; equip is saved

## 7. Controls: easier handling, FLY + boost together, drifting

### 7A. Current problems (from `game.js` / `input.js`)

| Problem | Cause |
|---|---|
| Steering is twitchy, easy to hit the barrier | At high speed lateral speed caps at 12 m/s, so one lane (5 m) changes in ~0.4 s; steering responds in ~70 ms and input is digital (0 or ±1) |
| FLY + BOOST barely work together | Both drain the shared `fuel`: flight 19/s + BOOST 10/s = 29/s, empty in ~3.4 s, then `exhausted` forces the flight to end |
| Keyboard can't register the combo | W + A/D + Shift + Space is 4 keys; many keyboards ghost (drop key presses) |
| Touch can't FLY + BOOST at once | Touch has 6 buttons (left / right, FLY / BOOST, brake / gas) for two thumbs; with steering on the left and pedals on the right, FLY and BOOST can't both be held |
| Grazing the barrier is punished hard | Any barrier touch triggers `contact`: 0.75 speed retention and a 1.5 s cooldown, even for a light scrape |

### 7B. FLY and boost at the same time

- [x] **AIR DASH**: holding FLY + BOOST together caps the combined drain at **22/s** (instead of 29/s), keeping the `MAX_SPEED + 14` cap; HUD shows `AIR DASH`
- [x] **NITRO doesn't use fuel** (separate `nitro` reserve from item 2), so FLY + NITRO always works together; NITRO while flying = straight-line air dash
  - [x] Logic (Claude): already true in `game.js`; add the acceptance tests — `{ fly, nitro }` held 2 s → `thrusting`, `nitroTime > 0`, not `exhausted`, fuel down by 19/s only; `{ fly, boost, nitro }` keeps the 22/s AIR DASH drain and the `MAX_SPEED + 30` cap (plan §B; no new physics unless decision 1b is chosen)
  - [x] UI (Codex): flight-state label `AIR DASH · NITRO` when thrusting with NITRO active (`main.js:833`)
  - [x] Browser test: `tests/nitro-fly-browser.spec.js` holds FLY + NITRO at desktop and 844×390 touch
- [x] **Alternate keys**: right hand `J` = FLY, `K` = BOOST, `L` = NITRO, left hand stays on WASD, avoiding the Shift + Space conflict (original keys still work)
- [x] **Touch** (layout in item 0):
  - [x] AUTO accelerator on by default, so the right thumb is free for FLY / BOOST / NITRO
  - [x] FLY button can be set to "toggle" (tap to lift off and hold altitude, tap again to land), freeing the right thumb for BOOST / NITRO
  - [x] FLY and BOOST buttons sit side by side; sliding a finger onto the border between them activates both (uses the existing pointer tracking)
- [x] Acceptance: test `input = { fly: true, boost: true }` held for 2 s → `thrusting` and `boosting` both true, not `exhausted`, speed > `MAX_SPEED`

### 7C. Handling feel

- [x] **Steering curve**: input ramps to full over 0.15 s (like an analog stick); high-speed lateral cap 12 → 9 m/s; "Steering sensitivity" in settings
- [x] **Lane assist** (part of AUTO, can be turned off): releasing steering eases the car to the nearest lane center
- [x] **Barrier scrape**: shallow-angle touches become a "scrape" — 0.92 speed retention, car pushed back onto the road, no collision counted, combo kept; only head-on hits use the existing `contact`
- [x] **Forgiving hitbox**: vehicle collision width 1.9 → 1.7, so more "almost hit" moments become near-misses instead of crashes
- [x] **Takeoff buffer**: holding FLY below 18 m/s is remembered and lifts off automatically once fast enough (no need to press again)
- [x] **Glide**: releasing FLY in the air lowers fall acceleration 11 → 7 for more controllable, softer landings (`landing.speed`)
- [ ] **Gamepad support**: the browser's built-in Gamepad API, analog stick steering, triggers for throttle / brake — **Lowest priority**; out of scope for this iteration
- [x] Move the touch brake to the left thumb, next to steering (see item 0), so brake + steer = drift works on touch

### 7D. DRIFT (builds nitro)

Trigger:
- [x] Keyboard: at ≥ 45 m/s hold **brake + direction** (S + A/D) → drift instead of hard braking
- [x] Touch: the same brake + steer, both under the left thumb (no extra button)
- [x] Ground only (`altitude === 0`); taking off or crashing ends the drift

Physics:
- [x] Car body slides out 20–30° (`world.js` body yaw), arc still controlled by steering
- [x] Drifting only bleeds a little speed (−3 m/s², normal braking is −35)
- [x] Near-miss combo points ×2 while drifting

**Nitro build-up** (longer drift, bigger reward on release, like a mini-turbo):

| Drift time | Spark color | Reward on release |
|---|---|---|
| ≥ 1 s | Blue | +0.15 nitro + 0.5 s mini boost |
| ≥ 2 s | Orange | +0.3 nitro + 0.8 s mini boost |
| ≥ 3 s | Purple | +0.5 nitro + 1.2 s mini boost |

- [x] Rewards count toward the 3-charge cap; overflow converts to fuel per item 3
- [x] Hitting a car / barrier mid-drift → the build-up is lost
- [x] Visuals / audio: tire smoke and sparks share the `effects.js` particle pool; add tire screech to `audio.js`
- [x] `player.drift = { time, dir }`; brake + steer derives drift, and `stepRace` handles enter / hold / release payout
- [x] Acceptance: tests for no drift below 45 m/s, the three time thresholds and rewards, crash cancels, no drift in the air

## 8. UI / UX polish and animation

### 8A. Original gaps (status tracked in 8B)

- Speed, position, and timer numbers just swap text every frame, with no motion
- Leaderboard rows jump when positions change, with no reorder animation
- The results overlay appears instantly; finishing a race has no "moment"
- Fuel bar only has a 0.1 s linear width transition; no feedback when it's low or refilling
- Near-miss, impact, and boost feedback is text-only in small HUD labels and easy to miss mid-race
- Screen changes (intro → countdown → racing → pause → results) are mostly hard cuts

### 8B. Improvements

- [x] **Animated numbers**: speedometer needle / arc that eases with speed; position number flips with a ↑ green / ↓ red pulse when you gain or lose a place
- [x] **Leaderboard reorder**: FLIP animation (measure old/new row positions, animate `transform`) when places swap
- [x] **Event callouts**: center-screen pop-ups that scale in and fade out for `NEAR MISS ×3`, `PERFECT LINE`, `NITRO`, `+0.5`, drift spark tiers; queue them so they don't overlap
- [x] **Gauges**: fuel and the 3-segment nitro bar ease (not linear), flash red under 20%, shimmer while refilling, pulse when a nitro charge completes
- [x] **Finish sequence**: render-only coast over the line (~0.6 s), camera swings to a side view, then the results card slides in; stats count up one by one; stars pop in; "NEW BEST" stamp; official timing/results are frozen before presentation
- [x] **Screen transitions**: intro slides out as the countdown lights drop in; pause blurs and dims the scene; restart wipes instead of cutting
- [x] **Countdown**: start lights turn on one by one with a sound tick; "GO" bursts out with a short camera push
- [x] **Button feel**: press scale (0.96) + release spring on all buttons; touch buttons glow while held; optional haptics via `navigator.vibrate` on mobile for impacts, nitro, and drift payout
- [x] **Menu**: track select cards with a looping preview of the track's sky / palette; History screen slides in from the side
- [x] **Consistency**: one shared set of motion tokens in `style.css` (`--ease-out`, `--ease-spring`, `--dur-fast` 120 ms / `--dur-base` 240 ms / `--dur-slow` 480 ms) used by every new animation
- Rules: animate only `transform` / `opacity` (no layout thrash on the hot render path); every new animation respects the existing `prefers-reduced-motion` and "comfortable" settings by falling back to an instant or fade-only version
- [x] Acceptance: browser tests verify callout lifetime, results after the finish sequence and reduced-motion behavior; short local Chrome samples show no frame-cadence drop (desktop callback p95 increased 1.8 → 2.9–3.0 ms). See `docs/verification.md`; physical-device performance remains unverified.

---

## Suggested order

1. **Control fixes** (7A–7C: AIR DASH drain, alternate keys, steering curve, barrier scrape) — small changes, immediately better feel
2. Track data refactor (pure refactor, `coast` behavior unchanged) — everything else depends on it
3. NITRO + 3-charge cap + pickups (items 2 and 3 together)
4. DRIFT (7D, needs the nitro reserve)
5. Interactive rings and rewards (item 4)
6. UI / UX polish (item 8) — motion tokens and callouts first, since items 2–4 need them to be readable
7. History + per-track best + ghost (item 5)
8. Three new tracks (content part of item 1)
9. Pick from item 6
10. **Gamepad support + mapping view** — **Lowest priority**; deferred beyond this iteration


---

## 9. Game modes and race-session configuration (new roadmap — 2026-10-22)

**Status:** Sections 9–13 are a feature roadmap; checked entries are implemented and have passed
targeted verification on `feature/race-modes-p0`. Larger acceptance gates remain unchecked
until the complete requirement and required browser/device testing pass.
The original 2026-10-22 roadmap had all tasks unchecked.
The preceding sections (0–8) are the existing implementation history; do not reset their
completion state or regress Classic Race. Priority labels: **P0** = first release, **P1** =
second wave, **P2** = larger/long-term work. Keep the existing 10 tracks, official unlock
rules, track showcase parity, NITRO/FLY/BOOST, rivals, daily challenges, Ghost, Garage,
saved history, English/Traditional Chinese UI and production-only access restrictions.

**Design boundary:** All 10 current tracks are **point-to-point sprint courses**, not closed
circuits. A repeat of the same sprint or a multi-stage event is **not** a seamless lap. The
actual closed-circuit/1–3–5 lap feature below needs genuine looped route geometry and
checkpoint validation; merely multiplying `race.length` or resetting distance would be wrong.

### 9A. Common mode/session model (P0; prerequisite)

- [x] **MODE-00 — Versioned `RaceConfig` / session contract.** Define a validated, serializable
  configuration with stable fields such as `mode`, `trackId`, `seed`, `rivalCount`,
  `aiDifficulty`, `trafficDensity`, `itemsEnabled`, `collisionRule`, `ghostEnabled`,
  `durationSeconds` / `stageCount` (only when applicable), `visualPreset` and `rulesVersion`.
  Declare mode-specific allowed options and defaults in a pure module; distinguish
  **simulation rules** from **visual-only** settings.
- [x] Extend/refactor `createRace(trackId, options)` (or add a compatible wrapper) to build
  sessions from `RaceConfig` **without breaking** existing `createRace('coast')` and
  `createRace(trackId, dailyModifier)` callers. Keep the current Daily Challenge seed,
  modifier rules and official Classic Race parameters identical.
- [x] Model explicit objectives and completion conditions per mode: `placement`,
  `finish-time`, `score-target`, `checkpoint-timer`, `stage-points`, `survival` or
  `no-auto-finish`. Do not keep reusing `race.length` completion for every mode.
- [x] Separate `Classic / Campaign` from `Custom / Practice / Challenge` in eligibility:
  only qualifying Classic finishes unlock the next track or award career progression.
  A local test-all-unlocked run must never grant unlocks, stars or achievements.
- [x] Produce deterministic simulation seeds for traffic, checkpoints, obstacles and items
  with **separate named streams**, so adding decoration or an option cannot silently
  reshuffle the original pickups or rings. Validate finite coordinates and bounded counts.
- [x] **Acceptance:** unit tests cover old call signatures, default-rule parity,
  incompatible/unknown options, deterministic replay, mode-specific finishing and
  access rules; all ten existing courses remain raceable.
  - Checked 2026-10-29: unit 1113/0 + typecheck on integration ebc307a (incl. origin/main b623c28); cited browser specs green in integration pre-gate 995b1cc; final full gate + exact-HEAD CI pending. Evidence: race-session-contract, race-modes, race-results tests.

**MODE-00 implementation / verification (2026-10-23):** On
`feature/mode00-objective-contract`, the pure, JSON-serializable `createRaceSessionContract`
now separates fixed gameplay rules, a per-track seed, and presentation-only metadata
(ghost visibility and visual preset). `validateRaceRequest` rejects invalid/unsupported
new user options; tolerant legacy `normalizeRaceConfig` and existing mode best/Ghost
signatures remain unchanged. Existing named RNG streams are centralized without
changing their string values, and all nine shipped modes now have explicit finish
objectives (Cup = stage-points; Stunt = timed-score; Free Drive = no auto-finish).

Targeted unit tests **passed** at `da3d81a` (GitHub Actions
`39865378561`). RED evidence: the Cup objective expectation fails at
`2ce05e5` (run `39864803654`, unit job); implementation GREEN at
`da3d81a`. The previous full CI had failed browser shards even though
unit/smoke/World Tour passed, and main's prior run also contained browser
failures. Do not mark the stage-wide acceptance as done or merge until
**the final SHA** has all required CI checks green.


**MODE-00 deterministic seed / bounds completion (2026-10-23):** RED tests at
`6d5f9ff` ([run #39939858288](https://github.com/weskao/skyline-rush/actions/runs/39939858288)); GREEN at
`b1edafb` ([run #39940097050](https://github.com/weskao/skyline-rush/actions/runs/39940097050)):
focused tests, full `npm test`, and `npm run build` passed. Stable, isolated
32-bit seeds now exist for traffic, checkpoints, authored world obstacles,
active items, original pickups/rings and hazards. Authored traffic/checkpoint
layouts and Classic/Daily replay signatures remain unchanged. Ten track layouts,
finite entity positions, bounded counts and invalid external geometry are covered.
**Stage-wide acceptance remains open** until required browser/physical-device
checks and access/persistence regressions are independently verified.

Still open: stage-wide mode acceptance, browser and physical-device
performance/UX checks. Traffic and checkpoint layouts intentionally remain
authored and deterministic; newly named seeds are available if those layouts
later become procedural, without changing Classic/Daily replay rules.
No operation-guide files, audio or UI were changed by MODE-00; no new sound
cue is warranted for these pure simulation contracts.

---

### 9B. Free Drive / Practice mode (P0)

- [x] **MODE-01 — Free Drive v1:** drive and fly on any **already unlocked** course with
  no finishing position, mandatory countdown, AI race placement or automatic victory.
  Add a visible return/restart control and an optional one-tap reset-to-start.
- [x] Allow selectable **no AI**, traffic density and item availability. Reuse existing
  steering, cameras, drift, FLY, BOOST, NITRO and 3D scenery; do not build a new
  physics engine.
- [x] At the authored end of an open sprint, offer **Restart / Choose Track / End
  Session**, or stop safely in a designated free-drive area. Do **not** claim
  endless roadway, reverse-map continuity or loop back to the start until implemented.
- [x] Optional practice HUD: current speed, air time, travel distance, max speed,
  clean near-miss chain and trick counter; hide rival position and race countdown.
- [x] **Acceptance:** crossing the old finish cannot save an official best, stars,
  campaign unlock or Daily record; exit/restart/pause work for keyboard and touch;
  world buffers do not grow across repeated sessions.
  - Checked 2026-10-29: integration 8c3f7ee final gate green: `make verify` (unit 1112/0, browser 728/0, World Tour 326/0), `npm run test:layout` 37+42, `npm run test:cloud` 15/15 + rules 3/3 (6a); exact-HEAD CI pending. Evidence: race-modes.test.js, mode-acceptance-browser.spec.js (keyboard/touch pause/restart/exit).

### 9C. Custom Race (P0)

- [x] **MODE-02 — Custom Race:** choose an unlocked track, 0–3 rivals, AI
  **Easy / Normal / Hard**, traffic **Off / Light / Normal / Heavy**, power-ups
  **On / Off**, collisions **Normal / Relaxed**, Ghost visibility and weather/time
  **visual preset**. Preserve original defaults in Classic mode.
  - Evidence: `feature/custom-race-presentation` full `make verify` green on 808e5a0 (Node 848, browser 525/2 skip, World Tour 303); CI pending.
- [x] AI difficulty adjusts clearly named parameters (target speed, mistake rate
  or rubber-band bounds) without breaking current rival personalities `NOVA`,
  `ORBIT` and `APEX`. Support 0, 1, 2 and 3 rivals correctly.
- [x] Offer a longer session with **1 / 2 / 3 / 5 sprint stages** (same or selectable
  unlocked courses), but label it **stages / heats**, not circuit laps; show aggregate
  time or points explicitly and reset physical state between stages.
- [x] Support validated presets **Standard / Traffic Rush / No Items / Air Focus /
  Precision** and a custom configuration, all with one-tap Reset to Default.
- [x] **Acceptance:** generated item/traffic counts, HUD placement labels, AI finish
  detection and results all work with 0 rivals; Custom scores never overwrite
  Classic or Daily records.
  - Checked 2026-10-29: integration 8c3f7ee final gate green: `make verify` (unit 1112/0, browser 728/0, World Tour 326/0), `npm run test:layout` 37+42, `npm run test:cloud` 15/15 + rules 3/3 (6a); exact-HEAD CI pending. Evidence: race-modes, race-ghosts, mode-acceptance-browser.spec.js (0-rival HUD and results).

### 9D. Time Attack / Ghost Trial (P0)

- [x] **MODE-03 — Time Attack:** solo fixed-course trial with clean start/finish,
  immediate retry and best time per stable `trackId + mode + ruleset`. No rival
  race position or opponent-driven rubber banding.
- [x] Reuse the existing 10 Hz best-run Ghost when the recorded trace and rules
  are compatible; show `Ahead / Behind` split against the personal record.
  Keep separate Ghost data for mode-specific bests if necessary.
- [x] Optional **Clean Time Trial** variant: collisions invalidate a clean medal or
  apply an explicit time penalty; do not silently change legacy physics.
- [x] **Acceptance:** timed results/ghosts remain isolated from Classic bests;
  blocked localStorage never prevents play; mobile HUD remains readable.
  - Checked 2026-10-29: integration 8c3f7ee final gate green: `make verify` (unit 1112/0, browser 728/0, World Tour 326/0), `npm run test:layout` 37+42, `npm run test:cloud` 15/15 + rules 3/3 (6a); exact-HEAD CI pending. Evidence: race-modes, mode-history-contract, mode-acceptance-browser.spec.js (blocked storage, phone HUD).

### 9E. Stunt & Style Attack (P1)

- [x] **MODE-04 — Stunt Attack:** timed 2 / 3 / 5-minute score run for air tricks,
  sustained drift, near-misses, rings, PERFECT LINE groups and flying shortcuts.
  Reuse existing `player.score`, `trick`, `drift` and ring events.
- [x] Add explicit style-combo multiplier, clean landing bonus and fair combo
  break/decay on crashes; prevent stationary or repeated reset farming.
- [x] Save best score, combo, air time and medal thresholds by exact track/ruleset.
- [x] **Acceptance:** deterministic scoring independent of FPS and input device;
  end-of-timer results work without reaching the sprint finish.
  - Checked 2026-10-29: unit 1113/0 + typecheck on integration ebc307a (incl. origin/main b623c28); cited browser specs green in integration pre-gate 995b1cc; final full gate + exact-HEAD CI pending. Evidence: stunt-acceptance.test.js (30/60/120/144 Hz, keyboard vs touch).
  - Evidence (feature/stunt-acceptance, 2026-10-29): `tests/stunt-acceptance.test.js` plays whole 120 s
    Coast sessions (≥2 heats: route end → next heat with the remaining time → timer end) through the real
    frame-to-step seam `drainSteps` (`src/frame-pacing.ts`, now used by the `main.js` frame loop). Totals
    (score, heats, max combo, air time, elapsed) are identical at 30/60/120/144 Hz and a jittery display,
    and identical for the same maneuvers made with keyboard keys or touch buttons via `createControls`.
    The last heat ends on `timer` short of the route end, elapsed equals the duration, and the session
    best saves. RED: missing `drainSteps`/`createStuntRun` seams; GREEN without scoring changes (no
    product bug found). Session rules `createStuntRun`/`addStuntHeat`/`stuntHeatContinues`/
    `stuntHeatLimit` now live once in `src/stunt-attack.ts` (were copied in `main.js`, `race-results.ts`,
    `result-screen.ts`). Per-frame input sampling still shifts a held key by up to one display frame at
    different rates; equal per-step input gives equal scores. Pending: full `make verify` and exact-HEAD CI.

**Stunt best persistence (2026-10-23):** RED [`b4c4262`](https://github.com/weskao/skyline-rush/commit/b4c4262cc4557d58cf58243f99f078dfcc54f863),
[Actions #39940564407](https://github.com/weskao/skyline-rush/actions/runs/39940564407);
GREEN [`5a7cb28`](https://github.com/weskao/skyline-rush/commit/5a7cb2886613a319a6dcb70ecc5293abfd3b99a2),
[Actions #39940729574](https://github.com/weskao/skyline-rush/actions/runs/39940729574).
Stores a validated, rule-scoped personal best score, longest combo, longest air
time and derived medal; 50-run history rotation cannot lose lifetime bests.
Existing records and Classic unlock rules are unchanged. Focused MODE-00 tests,
full `npm test` and production build passed. Frame-rate/device acceptance remains open.

### 9F. Checkpoint Rush (P1)

- [x] **MODE-05 — Checkpoint Rush:** pass a deterministic sequence of grounded or
  aerial gates before time expires; each clean gate extends the timer.
- [x] Choose checkpoints from the **real track route and reachable flight envelopes**;
  prevent impossible gates inside tunnel roofs, road gaps or conflicting hazards.
- [x] Show next target distance/direction, time left, checkpoint chain and optional
  perfect-gate rewards. Invalid/missed gates cannot secretly count.
- [x] **Acceptance:** gated time-extension and expiry have unit tests; minimap
  uses the official main route and never reveals hidden shortcut geometry.

**MODE-05 gate route/clearance verified (2026-10-23):** RED
[`9be5f04`](https://github.com/weskao/skyline-rush/commit/9be5f04effbc832599dd1488ec4478c5fb7d086b)
([Actions #39943129958](https://github.com/weskao/skyline-rush/actions/runs/39943129958)):
three obstacle avoidance/bounds tests failed as intended. GREEN
[`b4c2d17`](https://github.com/weskao/skyline-rush/commit/b4c2d17071f0e148399d3b83ad75e5e791be7c76);
ten-route real-scenery regression [`88c7aa0`](https://github.com/weskao/skyline-rush/commit/88c7aa0ac4c0ed16e5473c2828ba484580ff24d7).
[Actions #39943573134](https://github.com/weskao/skyline-rush/actions/runs/39943573134):
focused MODE-00, full unit suite, production build and desktop Checkpoint Rush
WebGL browser smoke all GREEN; an actual game screenshot is in the
`checkpoint-rush-gameplay` Actions artifact. Lane selection avoids authored
roadside obstacle bounding boxes; impossible gates are skipped, and existing
70 m tunnel/gap/shortcut safety buffers remain. Full stage acceptance and
physical-device checks are still open.

**MODE-05 navigation and route acceptance (2026-10-23):** The existing
[`checkpoint-navigation.test.js`](https://github.com/weskao/skyline-rush/blob/feature/mode00-objective-contract/tests/checkpoint-navigation.test.js)
and [`checkpoint-expiry.test.js`](https://github.com/weskao/skyline-rush/blob/feature/mode00-objective-contract/tests/checkpoint-expiry.test.js)
cover precise/near/missed-gate scoring and fair timer expiry. The authored
[`route-map.test.js`](https://github.com/weskao/skyline-rush/blob/feature/mode00-objective-contract/tests/route-map.test.js)
covers all ten official main-route polylines; hidden shortcut geometry is
not part of the route samples. Browser assertions
[`391b28f`](https://github.com/weskao/skyline-rush/commit/391b28fd199a3a9fe04fba7b1d1ea41bd31d0d85)
verify gate count, perfect count, distance, directional cue, remaining time.
[Actions #39944609373](https://github.com/weskao/skyline-rush/actions/runs/39944609373)
passed full unit tests, build and real desktop WebGL smoke. Mobile/device
acceptance remains under the shared stage-wide QA, not claimed here.

### 9G. Multi-track Championship Cup (P1)

- [x] **MODE-06 — Championship:** select a curated 3–5-track cup consisting of
  **unlocked** stages; award stage ranking points and a clear final champion.
- [x] Preserve stage standings across transitions with fair AI participation,
  an explicit continue/retry flow, and optional saved in-progress cup recovery.
- [x] Distinguish cup medals/bests from individual Classic times; a cup does
  not grant unearned unlocks for stages skipped or completed in practice mode.
- [x] **Acceptance:** ties, quit/resume, mid-cup restart, 0-rival rejection and
  incomplete data produce deterministic, understandable results.

### 9H. Obstacle Gauntlet (P1)

- [x] **MODE-07 — Obstacle Gauntlet:** fixed-seed hazard challenges with
  escalating moving gates, road barricades, flying hoops, debris and safe/risky
  alternate lines. Keep the ordinary track drivable in Classic mode by default.
  - Checked 2026-10-29: integration 8c3f7ee final gate green: `make verify` (unit 1112/0, browser 728/0, World Tour 326/0), `npm run test:layout` 37+42, `npm run test:cloud` 15/15 + rules 3/3 (6a); exact-HEAD CI pending. Evidence: gauntlet-course, gauntlet-motion tests, obstacle-gauntlet-browser.spec.js.
- [x] Add difficulty tiers based on warning time, obstacle spacing and
  activation frequency **without random unavoidable collisions**.
- [x] Score clean obstacle passes, near-misses and finish time; practice and
  obstacle-mode records stay separate.
- [x] **Acceptance:** each generated hazard arrangement leaves a reasonable
  passable ground/air path and has predictable collision tests.

**MODE-07 scoring TDD (2026-10-23):** RED
[`60a5e99`](https://github.com/weskao/skyline-rush/commit/60a5e99edfabc4c91d164ef6894c5ce52a2a5769)
([CI #39945677012](https://github.com/weskao/skyline-rush/actions/runs/39945677012));
GREEN [`7fbb126`](https://github.com/weskao/skyline-rush/commit/7fbb12667ae0372a7bb16876164df004f05bcd11)
and WebGL smoke [`c2b6c8e`](https://github.com/weskao/skyline-rush/commit/c2b6c8ef68b7b46d893b5d9a7800bd1038884061).
A safe barrier pass earns 150 points, a close clean near-miss earns 300
and increments the once-only nearMisses counter. Challenge records remain
isolated from Classic Career. Focused/unit/build/actual WebGL smoke all passed
[CI #39945865189](https://github.com/weskao/skyline-rush/actions/runs/39945865189).
Full route navigability and hazard arrangement acceptance remain open.

**MODE-07 generated-route acceptance (2026-10-23):** RED
[`25e74f9`](https://github.com/weskao/skyline-rush/commit/25e74f9d3c3a20a6f40c052fc609ab2b9032260d)
([CI #39946490119](https://github.com/weskao/skyline-rush/actions/runs/39946490119))
demonstrated hazards placed over raised shortcut approaches and nonfinite
positions under invalid elapsed time. GREEN
[`8455a70`](https://github.com/weskao/skyline-rush/commit/8455a70b48be24eea0f74f948b576830152174e1)
([CI #39946619729](https://github.com/weskao/skyline-rush/actions/runs/39946619729)):
all ten tracks in standard/extreme tiers remain deterministic; at least two
ground lanes and the air path are open at sampled motion times; spacing,
safe section buffers and once-only collision/scoring tests pass. Full unit
suite, production build and real WebGL smoke all GREEN. Device-specific
manual QA remains tracked separately.

### 9I. Elimination / Last Racer Standing (P2)

- [x] **MODE-08 — Elimination:** after an announced interval/checkpoint, eliminate
  the last active racer until one remains; show a readable knockout countdown.
- [x] Define whether the player loses immediately or gets one short comeback window;
  do not eliminate AI simply because an actor is off-camera.
- [x] **Acceptance:** active AI count/rank changes cleanly; results work after
  early elimination and never award Classic progression.

**MODE-08 elimination finishing/acceptance (2026-10-23):** RED
[`884e057`](https://github.com/weskao/skyline-rush/commit/884e057659c21c711b53b5e7008ffed2801a42b0)
([Actions #39944092143](https://github.com/weskao/skyline-rush/actions/runs/39944092143))
exposed fixed-fourth-place results for second/third-round player eliminations.
GREEN [`da8bd45`](https://github.com/weskao/skyline-rush/commit/da8bd4550226334138d2a29697a28a2646b3e571):
position derives from actual contenders left; knockouts are based on track
progress, not render/camera visibility. Tests
[`912a832`](https://github.com/weskao/skyline-rush/commit/912a83264a23459068d1b37cd0645587fc4846d1)
prove losses never persist results and challenge wins never grant Classic unlocks.
[Actions #39944609373](https://github.com/weskao/skyline-rush/actions/runs/39944609373):
unit suite, production build, Checkpoint Rush and Elimination live WebGL browser
smoke all GREEN. Device-specific QA belongs to shared manual acceptance.

### 9J. Endless Highway / Distance Survival (P2)

- [x] **MODE-09 — Endless Highway:** deterministic extension/streaming **beyond**
  the fixed 4–8 km authored tracks; progressively increase challenge and record
  longest distance/survival score.
- [x] Build extendable road geometry, scene chunks, encounter seeds, objective
  markers, camera/traffic recycling and safe recovery. Respect absolute distance
  to avoid repeated scenery, teleporting objects or floating-point problems.
- [x] Keep memory/GPU resources bounded after lengthy play; verify pause, resume,
  context loss and browser tab backgrounding.
  - Checked 2026-10-29: integration 8c3f7ee final gate green: `make verify` (unit 1112/0, browser 728/0, World Tour 326/0), `npm run test:layout` 37+42, `npm run test:cloud` 15/15 + rules 3/3 (6a); exact-HEAD CI pending. Evidence: endless-highway.test.js, endless-highway-browser + endless-bounds-browser specs (pause, context loss, backgrounding).
- [x] **Acceptance:** play can continue past the former end without hitting
  clamped `trackPoint()`, missing geometry, a fake lap or an unintended finish.

### 9K. Event Lab Lite / course creator (P2)

- [x] **MODE-10 — Event Lab Lite:** begin with **preset course modifiers** and
  validated placement templates (cones, barricades, ramps, gates, pickups,
  checkpoints), not a full free-form level editor.
  - Checked 2026-10-29: unit 1113/0 + typecheck on integration ebc307a (incl. origin/main b623c28); cited browser specs green in integration pre-gate 995b1cc; final full gate + exact-HEAD CI pending. Evidence: event-lab, event-lab-designer tests (relaxed modifier c1092ff), event-lab-browser.spec.js.
- [x] Add a later visual designer for positioning supported objects on unlocked
  courses, with snap-to-lane, collision previews, Undo/Redo and Reset.
  - Checked 2026-10-29: unit 1113/0 + typecheck on integration ebc307a (incl. origin/main b623c28); cited browser specs green in integration pre-gate 995b1cc; final full gate + exact-HEAD CI pending. Evidence: event-lab-designer.test.js, event-lab-browser.spec.js.
- [x] Import/export **versioned, size-limited JSON** that validates track IDs,
  geometry bounds, obstacle count, segment reachability and sanitizes labels;
  no script execution, remote code, or dependency on online accounts.
  - Checked 2026-10-29: unit 1113/0 + typecheck on integration ebc307a (incl. origin/main b623c28); cited browser specs green in integration pre-gate 995b1cc; final full gate + exact-HEAD CI pending. Evidence: event-lab.test.js, event-lab-designer.test.js (2000 mutated imports).
- [x] Community sharing or multiplayer uploads require a separate backend,
  moderation/storage and security design; **not** part of offline-first v1.
  - Checked 2026-10-29: unit 1113/0 + typecheck on integration ebc307a (incl. origin/main b623c28); cited browser specs green in integration pre-gate 995b1cc; final full gate + exact-HEAD CI pending. Evidence: documented out of scope for offline v1 in docs/event-lab-lite.md.
- [x] **Acceptance:** creation and replay produce the same stage with the same
  seed on desktop and mobile; malformed/corrupt creations fail safely.
  - Checked 2026-10-29: unit 1113/0 + typecheck on integration ebc307a (incl. origin/main b623c28); cited browser specs green in integration pre-gate 995b1cc; final full gate + exact-HEAD CI pending. Evidence: event-lab-designer.test.js, ghost-ramps.test.js (c29c579), launch-ramps-browser.spec.js.

## 10. Mode-selection UX, race settings, true laps and saved progress

### 10A. Start-screen setup and player experience (P0)

- [x] **UX-01 — Mode-first flow:** `Choose Mode → Choose Unlocked Track →
  Configure Rules → Start`. Retain the current animated 3D track previews,
  vehicle scale, three-rival showcase, full-route maps and mobile usability.
  - Checked 2026-10-29: unit 1113/0 + typecheck on integration ebc307a (incl. origin/main b623c28); cited browser specs green in integration pre-gate 995b1cc; final full gate + exact-HEAD CI pending. Evidence: mode-first-setup-browser.spec.js, mode-setup.test.js (10A); previews/scale/rivals/route maps: track-preview.test.js, route-map.test.js.
- [x] Use a compact, readable configuration panel rather than filling every
  track card with controls; allow mode descriptions, Restore Defaults and a
  preview/summary of active rules before Start.
  - Checked 2026-10-29: unit 1113/0 + typecheck on integration ebc307a (incl. origin/main b623c28); cited browser specs green in integration pre-gate 995b1cc; final full gate + exact-HEAD CI pending. Evidence: mode-setup.test.js, i18n intro-fit at 900 px (10A).
- [x] Disable or explain unsupported combinations (e.g. lap count on open
  sprint, elimination with 0 AI, no-flight over mandatory bridge gaps,
  checkpoint in unreachable aerial areas).
  - Checked 2026-10-29: unit 1113/0 + typecheck on integration ebc307a (incl. origin/main b623c28); cited browser specs green in integration pre-gate 995b1cc; final full gate + exact-HEAD CI pending. Evidence: mode-setup.test.js ruleConflicts + browser explanations (10A).
- [x] Add appropriate pre-race options for AI 0–3, AI difficulty, traffic
  density, pickups, collision severity, Ghost, stage count, timed duration,
  cosmetic scenery/weather, item rules, and per-mode eligibility.
  - Checked 2026-10-29: unit 1113/0 + typecheck on integration ebc307a (incl. origin/main b623c28); cited browser specs green in integration pre-gate 995b1cc; final full gate + exact-HEAD CI pending. Evidence: race-modes, custom-presentation, item-rules tests; per-mode eligibility (10A).
- [x] Saved user presets must not alter unlocks, reward eligibility or
  existing `skyline-rush-controls` / `skyline-rush-history` formats.
  - Checked 2026-10-29: integration 8c3f7ee final gate green: `make verify` (unit 1112/0, browser 728/0, World Tour 326/0), `npm run test:layout` 37+42, `npm run test:cloud` 15/15 + rules 3/3 (6a); exact-HEAD CI pending. Evidence: preset-isolation-browser.spec.js (b0277c1).
- [x] All labels, option descriptions, countdowns, HUD outcomes, tooltips,
  error messages and results are localized in **English and zh-TW**, live
  switchable without changing stable track/mode IDs.
  - Checked 2026-10-29: unit 1113/0 + typecheck on integration ebc307a (incl. origin/main b623c28); cited browser specs green in integration pre-gate 995b1cc; final full gate + exact-HEAD CI pending. Evidence: i18n.test.js, mode-first-setup-browser.spec.js live switch.
- [x] Preserve keyboard, pointer and mobile touch navigation, visible focus,
  readable contrast, safe-area layout and reduced-motion/Comfort settings.
  - Checked 2026-10-29: unit 1113/0 + typecheck on integration ebc307a (incl. origin/main b623c28); cited browser specs green in integration pre-gate 995b1cc; final full gate + exact-HEAD CI pending. Evidence: mode-first-setup-browser.spec.js (keyboard, touch, focus, contrast, safe area, reduced motion).

### 10B. Honest laps versus repeated sprints (P2)

- [x] **LAP-01 — Separate session types:** support multi-stage/repeated
  **point-to-point** sprints first (P0/P1), and label them “Stage 1/3”,
  not “Lap 1/3”. The original 10 tracks must keep their authored geography.
- [x] **LAP-02 — Genuine closed circuits:** author at least one actual loop
  whose start/finish world position, tangent, road banking and width connect
  continuously; do **not** fake it with instant distance wrap.
- [x] **LAP-03 — Configurable 1 / 3 / 5 laps** only on circuits with a valid
  topology; lap timer, personal best lap, total race time, split sectors,
  lap HUD, AI lap standings and finish sequence.
- [x] **LAP-04 — Anti-shortcut checkpoints:** ordered sector validation
  prevents crossing the finish backwards, flying over the finish repeatedly,
  teleports or respawns from granting false laps.
- [x] **Acceptance:** completion requires the configured number of valid
  laps; player/AI cameras, positions, world props, mini-route map, Ghost,
  checkpoints and collision physics remain continuous across every seam.
  - Gate: `feature/genuine-circuit-laps` full `make verify` green on 0f81af7 (Node 869, browser 527/2 skip, World Tour 326); CI pending.
  - Evidence (2026-10-29, `tests/circuit-seam-acceptance.test.js` with existing `tests/circuit.test.js`):
    across all three seams of a 3-lap race (2000/4000/6000 m, 0.05 m steps) the Harbor beacon (scene
    origin), rivals ahead/behind, chase camera position and heading, Ghost (unwrapped samples, drawn 4 m
    ahead) and mini-route marker move by < 0.2 m per step, and the marker never freezes. Every rival
    finishes only after exactly 1/3/5 valid laps. Already covered: player completes exactly 1/3/5 laps at
    30/60/120 Hz, teleport/backwards/recovery/hover cannot grant laps, per-lap item identities, and
    collisions across the seam. Tests passed on existing code; mutation RED: unwrapped route marker,
    non-periodic scene origin, and rivals finishing a lap early each fail. Pending: full gate + exact-HEAD CI.

### 10C. Result/history isolation and safeguards (P0)

- [x] Store a stable `modeId + trackId + rulesVersion + rulesSignature` on
  each **new-mode** result, plus appropriate time, score, distance,
  stage/lap data and item/hazard statistics. Keep legacy history readable.
- [x] Show per-mode bests, mode-filtered History and applicable Ghosts;
  clearly distinguish personal practice milestones from official medals.
  Verified 2026-10-24: 10C History WebGL browser regression, mode-focused tests,
  full unit suite and production build passed on `cc24bb8c` (CI `40071240211`).
  English/zh-TW notice, filters, PB and Ghost badges have complete translations;
  unrelated full-browser CI shards and hardware QA remain tracked independently.
- [x] Use validated persistence with storage-failure fallbacks, reasonable
  caps and migration tests; prevent a custom “no traffic” best from
  replacing an official Classic best.
- [x] Keep Classic Career unlocks, 1–3 stars, Garage paint unlocking,
  achievements and Daily Challenge board isolated from custom/free-drive
  sessions unless a specific future rule explicitly grants eligibility.
  - Checked 2026-10-29: unit 1113/0 + typecheck on integration ebc307a (incl. origin/main b623c28); cited browser specs green in integration pre-gate 995b1cc; final full gate + exact-HEAD CI pending. Evidence: race-results.test.js (non-Classic finishes leave paints, medals, stars and the Daily board unchanged, fc6dc9c/343bb29), race-modes.test.js.
- [x] Pausing, restarting, exiting, switching modes or closing a dialog
  cannot double-write a result or award the same benefit twice.
  - Checked 2026-10-29: integration 8c3f7ee final gate green: `make verify` (unit 1112/0, browser 728/0, World Tour 326/0), `npm run test:layout` 37+42, `npm run test:cloud` 15/15 + rules 3/3 (6a); exact-HEAD CI pending. Evidence: race-results.test.js, settle-once-browser.spec.js (2434860).

**10C versioned mode records (2026-10-23):** RED
[`e3581a7`](https://github.com/weskao/skyline-rush/commit/e3581a704557506d5dcb669b3ad253d8a10c6281)
([Actions #39945181620](https://github.com/weskao/skyline-rush/actions/runs/39945181620));
GREEN [`d25d025`](https://github.com/weskao/skyline-rush/commit/d25d0252dba9d0aac2ab691a090dbc5fdc6582cc)
([Actions #39945279475](https://github.com/weskao/skyline-rush/actions/runs/39945279475)).
New-mode runs store additive `modeId`, `trackId`, `rulesVersion`,
`rulesSignature`, finite distance, sprint stage count (no fake circuit laps),
bounded item activations and hazard statistics. Legacy records remain readable;
no new storage key or changed best comparison; Classic history and unlocks
remain isolated. Focused and full unit tests, production build, and two
real desktop mode smoke tests passed. Other 10C UI/persistence acceptance
items remain open.

**10C storage safety TDD (2026-10-23):** RED
[`d78e717`](https://github.com/weskao/skyline-rush/commit/d78e7178ef0314dd5f87eb224f12b0d72c59329d)
([CI #39947103275](https://github.com/weskao/skyline-rush/actions/runs/39947103275))
exposed invalid saved mode history, overlong rule strings and impossible
new-mode records. GREEN
[`3d4a5a8`](https://github.com/weskao/skyline-rush/commit/3d4a5a89cce60fab595ac1c1e7b4c9a23d6dda09)
([CI #39947280443](https://github.com/weskao/skyline-rush/actions/runs/39947280443)):
preserve legacy v1 records without newer metadata, filter non-existent
tracks/bad positions/nonfinite or negative scores, cap times and rules,
retain 50 latest valid runs and fail safely when storage is blocked.
New-mode custom/no-traffic results cannot replace official Classic bests
or unlocks. Focused/unit/build/real browser mode smoke all pass.

## 11. Interactive scenery, track hazards and procedural world props

### 11A. Data model and runtime behavior (P1)

- [x] **ENV-01 — Typed object catalog:** separate
  **visual-only scenery** (buildings, crowds, parked trains, signs, lamps,
  spaceships) from **collidable / triggerable gameplay objects**.
  - Checked 2026-10-29: unit 1113/0 + typecheck on integration ebc307a (incl. origin/main b623c28); cited browser specs green in integration pre-gate 995b1cc; final full gate + exact-HEAD CI pending. Evidence: object-catalog.test.js.
- [x] **ENV-02 — Deterministic hazard schema:** define bounded properties
  such as `id`, `trackId`, `distance`, `lateralOffset`, `altitude`,
  `type`, `hitbox`, `triggerWindow`, `warningLeadSeconds`,
  `movementPattern`, `difficulty` and `seed`.
  - Checked 2026-10-29: unit 1113/0 + typecheck on integration ebc307a (incl. origin/main b623c28); cited browser specs green in integration pre-gate 995b1cc; final full gate + exact-HEAD CI pending. Evidence: hazard-schema.test.js.
- [x] **ENV-03 — Logic/render separation:** calculate hits, passes,
  rewards and state changes in the pure simulation (`src/game.js` or
  extracted rules module), not by reading Three.js mesh positions.
  Render exactly the hazard state described by the simulation.
- [x] **ENV-04 — Hazard behaviors:** static cones/barricades, moving
  side-to-side gates, periodic energy barriers, falling debris/rocks,
  wind gusts, hazardous terrain, rotating rings, rail crossing events
  and safe/risky branch markers.
  - Checked 2026-10-29: unit 1113/0 + typecheck on integration ebc307a (incl. origin/main b623c28); cited browser specs green in integration pre-gate 995b1cc; final full gate + exact-HEAD CI pending. Evidence: hazard-behavior, hazard-race tests; branch markers (6a).
- [x] **ENV-05 — Safety/readability:** visible anticipation cues, adequate
  reaction distance at maximum NITRO speed, accessible color+shape
  signals, a reachable escape route, and forgiving hitboxes on touch.
  Hazards must not randomly spawn inside the player.
  - Checked 2026-10-29: unit 1113/0 + typecheck on integration ebc307a (incl. origin/main b623c28); cited browser specs green in integration pre-gate 995b1cc; final full gate + exact-HEAD CI pending. Evidence: hazard-safety, hazard-render tests, hazard-captures-browser.spec.js, per-kind HUD warning (6220602); physical iOS/Android devices pending.
- [x] **ENV-06 — Reusable renderer:** pool or instance shared meshes and
  emitters, load/unload by visible distance with bounded chunk lifetime,
  no new material/geometry allocations every frame, and stable
  Low/Medium/High quality fallbacks.
  - Checked 2026-10-29: unit 1113/0 + typecheck on integration ebc307a (incl. origin/main b623c28); cited browser specs green in integration pre-gate 995b1cc; final full gate + exact-HEAD CI pending. Evidence: hazard-render.test.js (bounded pools, setup-time pose e872f4a), env-acceptance.test.js (hazards left behind stop being drawn).
- [x] **ENV-07 — Play-mode switches:** allow hazards Off / Standard /
  Extreme only where a mode supports that option; Classic uses the
  existing base behavior until intentionally updated.
  - Checked 2026-10-29: unit 1113/0 + typecheck on integration ebc307a (incl. origin/main b623c28); cited browser specs green in integration pre-gate 995b1cc; final full gate + exact-HEAD CI pending. Evidence: practice-hazards.test.js, race-modes-browser.spec.js.
- [x] **Acceptance:** deterministic placement, cross-frame collision
  sweeps, warning timing, out-of-range cleanup, no impossible gates
  and no device-specific simulation differences.
  - Checked 2026-10-29: unit 1113/0 + typecheck on integration ebc307a (incl. origin/main b623c28); cited browser specs green in integration pre-gate 995b1cc; final full gate + exact-HEAD CI pending. Evidence: env-acceptance.test.js, hazard-safety.test.js (warning lead time at NITRO speed, audio cue).

### 11B. Track-specific gameplay identities (P1)

- [x] **Coast:** scattered cargo, gust warnings and temporary shoulder
  closures; combine clean high-speed overtakes with coastal visibility.
  - Checked 2026-10-29: integration 8c3f7ee final gate green: `make verify` (unit 1112/0, browser 728/0, World Tour 326/0), `npm run test:layout` 37+42, `npm run test:cloud` 15/15 + rules 3/3 (6a); exact-HEAD CI pending. Evidence: track-themes, theme-visibility tests, track-themes-browser.spec.js.
  - Progress (feature/track-themes, 2026-10-29): opt-in `themes: true` (Custom, Free Drive, Gauntlet only;
    absent by default so Classic/Daily/Time/other records and rules signatures are unchanged — user decision).
    Shared runtime `src/track-themes.ts` (validated ENV-02 placements → `race.hazards` entries carrying
    `placement`), data in `src/track-themes-classic.ts`. Coast: four cargo spills and two six-cone shoulder
    closures; per-hazard hit reach/height for player, AI avoidance and AI impacts (Gauntlet defaults unchanged).
    `tests/track-themes.test.js`: opt-in boundary, ≤2 of 4 lanes blocked anywhere, off special sections,
    hit knocks / clean pass pays, rivals change lane first. RED: module missing; mutation RED: fixed 1.8 m reach
    and no AI reach both fail. Gust zones (2) now shove every car 1.5 m via 6a's ENV-05 push effect (2026-10-29). Pending: on-screen gust warning cue, desktop + mobile visual check, full gate. Audio: reuses the existing barrier impact/near-miss cues; no new sound needed.
- [x] **Neon Downtown:** animated construction barriers, temporary lane
  closures, traffic diversions and readable neon gate timing.
  - Checked 2026-10-29: integration 8c3f7ee final gate green: `make verify` (unit 1112/0, browser 728/0, World Tour 326/0), `npm run test:layout` 37+42, `npm run test:cloud` 15/15 + rules 3/3 (6a); exact-HEAD CI pending. Evidence: track-themes.test.js (sliding roadworks 1731577; lane closure and diversion cones solid with two lanes open 46d70d5), track-themes-browser.spec.js.
  - Animated roadworks (2026-10-29, feature/audit-78): `neon-works-1..3` slide between two lanes on a 6 s sweep, slower than the 4 s neon gates so the two timings read apart; `tests/track-themes.test.js` (roadworks test + existing hit/gap/≥2-lane/AI-avoid checks).
  - Progress (feature/track-themes): roadwork barriers, a coned-off lane, a diversion and two neon gates between the tunnels (`src/track-themes-classic.ts`), covered by `tests/track-themes.test.js`. Gates now swing between two lanes on a 4 s cycle (ENV-05 sweep), opening one while closing the other; the test proves each blocks at some moment and opens at another. Pending: visual check, full gate.
- [x] **Canyon Skyway:** warned falling rocks, cliff-side debris,
  precision launch ramps and risk/reward routes over broken bridges.
  - Checked 2026-10-29: unit 1113/0 + typecheck on integration ebc307a (incl. origin/main b623c28); cited browser specs green in integration pre-gate 995b1cc; final full gate + exact-HEAD CI pending. Evidence: theme-ramps-hoops, ramp-view tests, hazard-captures canyon-rock-1.
  - Progress (feature/track-themes): six rockfall/cliff-debris spills, some inside the crosswind stretches, all clear of the bridge gaps. Two rocks now drop from 10 m onto the road on an 8 s cycle (ENV-05 fall). Pending: on-screen rockfall warning, launch ramps (needs a launch effect in the race), visual check, full gate.
- [x] **Aurora Pass:** snowbanks, localized low-grip ice bends,
  timed blizzard visibility and safer alternative lines.
  - Checked 2026-10-29: unit 1113/0 + typecheck on integration ebc307a (incl. origin/main b623c28); cited browser specs green in integration pre-gate 995b1cc; final full gate + exact-HEAD CI pending. Evidence: race-visuals.test.js (blizzard), track-themes.test.js.
  - Progress (feature/track-themes): six snowbanks on alternating lanes so a safer line always stays open. Three low-grip ice patches now bleed 15% speed (ENV-05 slow), and AI steers around them. Pending: blizzard visibility, visual check, full gate.
- [x] **Sky Spiral:** rotating light hoops, synchronized aerial gates,
  changing platform barriers and airborne precision scoring.
  - Checked 2026-10-29: unit 1113/0 + typecheck on integration ebc307a (incl. origin/main b623c28); cited browser specs green in integration pre-gate 995b1cc; final full gate + exact-HEAD CI pending. Evidence: theme-ramps-hoops.test.js, effects.test.js hoop swivel (70b5522), track-themes.test.js (opposite-phase barriers and mirrored gates 46d70d5).
  - Progress (feature/track-themes): three energy platform barriers and three gates, including two on the helix, away from launch gaps. Two barriers now switch on and off on a 3 s cycle in opposite phase, and two gates swing in opposite phase (ENV-05 pulse/sweep). Pending: rotating light hoops and airborne precision scoring (rings are collect, not hazards), visual check, full gate.
- [x] **Taipei Heritage:** festival street furniture, temporary
  boulevard closures and scenic props, while preserving landmark
  visibility and the existing curated ready-screen showcase.
  - Checked 2026-10-29: integration 8c3f7ee final gate green: `make verify` (unit 1112/0, browser 728/0, World Tour 326/0), `npm run test:layout` 37+42, `npm run test:cloud` 15/15 + rules 3/3 (6a); exact-HEAD CI pending. Evidence: track-themes-world-tour, theme-visibility, hazard-render (previews draw no hazards) tests, world-tour-showcase-browser.spec.js.
- [x] **Tokyo Afterdark:** traffic-control signals, timed gates,
  neon construction equipment and dynamic but fair crossing events.
  - Checked 2026-10-29: unit 1113/0 + typecheck on integration ebc307a (incl. origin/main b623c28); cited browser specs green in integration pre-gate 995b1cc; final full gate + exact-HEAD CI pending. Evidence: track-themes-world-tour.test.js, hazard-captures tokyo gate.
- [x] **Alpine Rail Pass:** avalanche warnings, snow drift obstacles,
  passing trains as scenery, and rail-crossing interactions **only**
  where real drivable-road geometry and clearance permit them.
  - Checked 2026-10-29: unit 1113/0 + typecheck on integration ebc307a (incl. origin/main b623c28); cited browser specs green in integration pre-gate 995b1cc; final full gate + exact-HEAD CI pending. Evidence: track-themes-world-tour, world-tour-motion tests.
- [x] **Coastal Horizon:** wave-spray warning zones, crosswinds,
  lighthouse-side narrow bridge obstacles and safe shoulder routes.
  - Checked 2026-10-29: unit 1113/0 + typecheck on integration ebc307a (incl. origin/main b623c28); cited browser specs green in integration pre-gate 995b1cc; final full gate + exact-HEAD CI pending. Evidence: track-themes-world-tour.test.js (crosswind clearance).
- [x] **Cosmic Orbit:** floating asteroid fragments, moving energy
  barriers, low-gravity sectors and aerial gate sequences.
  - Checked 2026-10-29: unit 1113/0 + typecheck on integration ebc307a (incl. origin/main b623c28); cited browser specs green in integration pre-gate 995b1cc; final full gate + exact-HEAD CI pending. Evidence: track-themes-world-tour.test.js, low-gravity sectors and aerial gates (b48df2f), cosmic-low-gravity-browser.spec.js.
- [x] **Acceptance:** every themed hazard has at least one collision/
  reward test and an in-game desktop + mobile visual check; never let
  hero landmarks or scenery block the route unexpectedly.
  - Checked 2026-10-29: integration 8c3f7ee final gate green: `make verify` (unit 1112/0, browser 728/0, World Tour 326/0), `npm run test:layout` 37+42, `npm run test:cloud` 15/15 + rules 3/3 (6a); exact-HEAD CI pending. Evidence: track-themes.test.js, track-themes-browser + hazard-captures-browser specs.

### 11C. More visual world richness (P1)

- [x] Add **non-colliding** per-track detail sets: spectators, billboards,
  parked service vehicles, rail platforms, moving background trains,
  signs, drones/ships, coastline spray, atmospheric lights and skyline
  animation. Reuse `world-tour-scenery.js` placement planning, batching
  and chunk lifecycle when applicable.
  - Checked 2026-10-29: unit 1113/0 + typecheck on integration ebc307a (incl. origin/main b623c28); cited browser specs green in integration pre-gate 995b1cc; final full gate + exact-HEAD CI pending. Evidence: world-tour-details, world-tour-motion, classic-track-scenery tests.
  - Coastline spray (Coastal, water side) and skyline beacon masts with blinking aviation lights (Taipei, Tokyo, Cosmic), 2026-10-29 feature/audit-78: two shared glow materials warmed in the shader rack, one colour write each per frame, reduced motion holds them steady, Low draws none; `tests/world-tour-details.test.js`. Scenery draws High +4..+8 per track (alpine 0), Low unchanged.
- [x] **Weather/time-of-day presets:** daylight, dusk, night, rain/fog,
  snowfall or aurora where stylistically appropriate; start with
  visual-only overrides. Treat physical wet-grip/wind changes as
  opt-in, independently tested rules rather than surprise difficulty.
  - Checked 2026-10-29: unit 1113/0 + typecheck on integration ebc307a (incl. origin/main b623c28); cited browser specs green in integration pre-gate 995b1cc; final full gate + exact-HEAD CI pending. Evidence: race-visuals, custom-presentation tests + browser spec.
- [x] Respect `track-showcase.md`: every new or changed course ready
  screen must still show the player, three rivals, visible jets,
  appropriate chase camera and recognizable track world.
  - Checked 2026-10-29: integration 8c3f7ee final gate green: `make verify` (unit 1112/0, browser 728/0, World Tour 326/0), `npm run test:layout` 37+42, `npm run test:cloud` 15/15 + rules 3/3 (6a); exact-HEAD CI pending. Evidence: world-tour-showcase-browser, showcase-camera specs.
- [x] Degrade particle density, transparent overlays and shadow/light
  count on weak hardware without removing essential hazard silhouettes
  or necessary traffic warnings.
  - Checked 2026-10-29: unit 1113/0 + typecheck on integration ebc307a (incl. origin/main b623c28); cited browser specs green in integration pre-gate 995b1cc; final full gate + exact-HEAD CI pending. Evidence: race-visuals (weatherDrops), effects, world-tour-details tests; light/shadow decision recorded under this item.
  - Evidence (2026-10-29, feature/audit-78): weather overlay 180→60 drops on Low/touch via `weatherDrops` (`tests/race-visuals.test.js`), burst/drift particles thin on Low (`tests/effects.test.js`), Low drops decorative details, moving pieces and star tiers (`tests/world-tour-details.test.js`, `tests/world-tour-motion.test.js`); the hazard renderer takes no quality input, so hazard silhouettes never thin. Decision: the light count stays fixed on every tier (it is part of each lit shader's cache key; changing it recompiles mid-race, see `performance-review.md`), and the renderer uses no shadow maps, so there is no shadow cost to shed.

## 12. Items, pickups, active inventory and bonus challenges

### 12A. Turn current ring effects into optional active items (P1)

- [x] **ITEM-01 — Single item slot:** pick up and hold one active item;
  show icon, ready/held state, cooldown and an accessible Activate
  action on keyboard and touch. Keep NITRO and FLY/BOOST as separate
  systems; do not overload existing controls without remapping.
- [x] **ITEM-02 — Shield:** reuse existing “absorb one collision” effect
  as a held/triggerable item, with a clear hit/expiration state.
- [x] **ITEM-03 — Magnet:** reuse current timed pickup attraction,
  with an optional active duration and visible radius indicator.
  - Checked 2026-10-29: integration 8c3f7ee final gate green: `make verify` (unit 1112/0, browser 728/0, World Tour 326/0), `npm run test:layout` 37+42, `npm run test:cloud` 15/15 + rules 3/3 (6a); exact-HEAD CI pending. Evidence: active-items, effects tests, magnet-radius-browser.spec.js.
- [x] **ITEM-04 — Ghost:** reuse short traffic phasing with explicit
  cooldown; it must not let players pass invalid lap checkpoints.
- [x] **ITEM-05 — Freeze:** reuse temporary rival slowdown only in modes
  with AI; provide a harmless conversion/fallback in solo events.
- [x] **Acceptance:** no unintended double-stacks or unbounded
  durations, correct activation order and no change to existing
  mystery-ring payouts in Classic mode.
  - Checked 2026-10-29: unit 1113/0 + typecheck on integration ebc307a (incl. origin/main b623c28); cited browser specs green in integration pre-gate 995b1cc; final full gate + exact-HEAD CI pending. Evidence: active-items.test.js, race-modes.test.js, item-rules tests.

### 12B. Additional pickups and interactive pads (P1/P2)

- [x] **ITEM-06 — Precision speed strips / Energy Gates:** reward
  accurately crossing a boost pad or flight gate; apply capped,
  readable acceleration or thruster recharge.
- [x] **ITEM-07 — Air recharge pads:** restore a bounded share of
  FLY energy mid-flight, making aerial precision lines worthwhile.
- [x] **ITEM-08 — Repair / recovery pad:** temporarily mitigate
  one obstacle's speed loss or restore a limited resource without
  erasing official collision counts.
- [x] **ITEM-09 — Score multiplier token:** temporary style-combo
  bonus in Stunt/Checkpoint modes; cap multipliers and prevent
  overlapping infinite reward loops.
- [x] **ITEM-10 — EMP Pulse (P2):** short-range rival disruption
  exclusive to suitable competitive rule sets; clear fair warning
  and no effect on player control accessibility.
- [x] **ITEM-11 — Mode item rules:** Off / Classic Mystery Rings /
  Active Items / All Items. Resolve item positions from seeded
  streams and never place important rewards inside impossible gaps.
- [x] **New-mode procedural audio (2026-10-22):** original Web Audio music loops
  for Checkpoint Rush, Stunt Attack, Obstacle Run, Championship and Free Drive;
  one-shot gate/challenge/near-hazard/Combo/landing cues, bounded event transitions,
  separate music/SFX volume controls and unit tests (`src/mode-audio.js`,
  `src/audio.js`, `tests/audio.test.js`, `tests/mode-audio.test.js`).
  This does **not** complete ITEM-12's future active-item effects or special pickup visuals.
- [x] **ITEM-12 — Visual/audio feedback:** unique item outlines,
  landing sparks, pickup beams, cooldown audio and special hit FX
  that reuse `src/effects.js`, `src/audio.js` and comfort settings.
  - Checked 2026-10-29: unit 1113/0 + typecheck on integration ebc307a (incl. origin/main b623c28); cited browser specs green in integration pre-gate 995b1cc; final full gate + exact-HEAD CI pending. Evidence: item-ui, effects (reduced motion 5403c25), audio, item-slot-outlines (one distinct outline per item kind, fc6dc9c) tests.
- [x] **Acceptance:** item effects, caps, cooldowns, pickups, misses,
  blocked storage, mode restrictions and touch button layout have
  unit/browser coverage.
  - Checked 2026-10-29: unit 1113/0 + typecheck on integration ebc307a (incl. origin/main b623c28); cited browser specs green in integration pre-gate 995b1cc; final full gate + exact-HEAD CI pending. Evidence: bonus-gates, active-items, item-rules(+browser), item-feedback-browser.spec.js.

### 12C. Extra replayability and optional presentation (P2)

- [x] **PHOTO-01 — Photo / Showcase mode:** in paused Free Drive,
  orbit the camera, hide HUD, adjust compatible time/weather presets
  and export a browser-generated screenshot where supported;
  do not claim cloud storage or full replay video without a backend.
  - Checked 2026-10-29: integration 8c3f7ee final gate green: `make verify` (unit 1112/0, browser 728/0, World Tour 326/0), `npm run test:layout` 37+42, `npm run test:cloud` 15/15 + rules 3/3 (6a); exact-HEAD CI pending. Evidence: photo-studio-browser.spec.js, photo-export.test.js, race-modes-browser.spec.js (#photo-sky, #photo-save), custom-presentation-browser.spec.js; physical iOS/Android devices pending.
- [x] **REPLAY-01 — Expanded challenge medals:** clean checkpoint
  chain, longest flight, zero-collision time trial, best aerial
  combination and themed gauntlet completion; keep separate from
  existing four Career medals.
- [x] **REPLAY-02 — Personalized challenge presets:** remember a
  few recent custom-rule setups and allow duplicate/retry from the
  results screen without modifying the base track.
- [x] **REPLAY-03 — Risk/reward course lines:** alternate ground and
  aerial targets that give more score or item charge at higher
  difficulty, with hazards and scoring that can be disabled for
  straightforward practice.
  - Checked 2026-10-29: integration 8c3f7ee final gate green: `make verify` (unit 1112/0, browser 728/0, World Tour 326/0), `npm run test:layout` 37+42, `npm run test:cloud` 15/15 + rules 3/3 (6a); exact-HEAD CI pending. Evidence: risk-lines.test.js, risk-lines-browser.spec.js.

## 13. Implementation order, test plan and release gates

### 13A. Recommended milestones

1. **P0-A / Foundation:** `RaceConfig`, schema validation, explicit
   objectives, rule signatures, legacy compatibility and progression
   separation (9A, 10C).
2. **P0-B / Player setup:** accessible mode-first selector,
   pre-race options, presets and localization (10A).
3. **P0-C / First playable modes:** Custom Race, Time Attack and
   Free Drive v1; per-mode History and safe results (9B–9D).
4. **P1-A / Built on existing systems:** Stunt Attack, Checkpoint Rush
   and Championship; multi-stage **sprints**, not fake laps (9E–9G).
5. **P1-B / Hazards and world detail:** typed obstacle contract,
   first two obstacle families, art/performance tests, then all
   10 distinct track-specific sets (9H, 11).
6. **P1-C / Items:** one-slot active inventory, reuse Shield/Magnet/
   Ghost/Freeze, then new pads/bonuses (12A–12B).
7. **P2-A / Long-term modes:** Elimination, true closed-circuit laps,
   streamed Endless Highway and Event Lab Lite (9I–9K, 10B).
8. **P2-B / Polish:** photo mode, bonus medals and user presets (12C).

### 13B. File ownership and coding rules

- [x] Keep core deterministic rules in `src/game.js` or focused pure
  imported modules; test in `tests/game.test.js` and new
  mode/hazard/item unit-test files as needed.
  - Checked 2026-10-29: unit 1113/0 + typecheck on integration ebc307a (incl. origin/main b623c28); cited browser specs green in integration pre-gate 995b1cc; final full gate + exact-HEAD CI pending. Evidence: env-acceptance.test.js (no device reads in simulation).
- [x] Keep rendering, moving obstacles, shaders and scenery in
  `src/world.js`, `src/world-tour-scene.js` and appropriate modules
  under `src/`; don't clone the renderer once per new mode.
  - Checked 2026-10-29: unit 1113/0 + typecheck on integration ebc307a (incl. origin/main b623c28); cited browser specs green in integration pre-gate 995b1cc; final full gate + exact-HEAD CI pending. Evidence: single WebGLRenderer in world.js; hazard-render/effects modules.
- [x] Keep mode-selection UI in `src/App.vue` and screen flow in
  `src/main.js`; maintain the project's existing static Vue shell /
  imperative HUD integration unless separately refactored.
  - Checked 2026-10-29: unit 1113/0 + typecheck on integration ebc307a (incl. origin/main b623c28); cited browser specs green in integration pre-gate 995b1cc; final full gate + exact-HEAD CI pending. Evidence: module-size.test.js (main.js ceiling), race-select-ui.test.js (mode buttons only in App.vue, wired only by race-select-ui.ts; 46d70d5).
- [x] Keep per-mode records, migration, eligibility and safe storage
  in `src/history.js` (or small companion modules); route topology
  in `src/track-paths.js`; device inputs in `src/input.js`.
  - Checked 2026-10-29: unit 1113/0 + typecheck on integration ebc307a (incl. origin/main b623c28); cited browser specs green in integration pre-gate 995b1cc; final full gate + exact-HEAD CI pending. Evidence: history, mode-history-contract, race-results tests.
- [x] Do not weaken `.claude/rules/unlock-separation.md` or use
  runtime/dev query toggles for shipped content: unlocked-track
  testing remains local-only through existing Vite alias rules.
  - Checked 2026-10-29: unit 1113/0 + typecheck on integration ebc307a (incl. origin/main b623c28); cited browser specs green in integration pre-gate 995b1cc; final full gate + exact-HEAD CI pending. Evidence: access-build.test.js, production-lock assertion in npm run build (scripts/assert-production-locked.mjs).
- [x] Keep `README.md` and `README.zh-TW.md` consistent if game
  documentation changes. Maintain `CLAUDE.md` and scoped rules
  only when real implementation conventions change.
  - Checked 2026-10-29: unit 1113/0 + typecheck on integration ebc307a (incl. origin/main b623c28); cited browser specs green in integration pre-gate 995b1cc; final full gate + exact-HEAD CI pending. Evidence: readme-zh pre-commit hook; README modes rows (e2d7607).

### 13C. Mandatory acceptance and performance (all new features)

- [x] **Correctness:** tests for 0/1/3 AI, seeded hazard determinism,
  item disabled, Ghost compatibility, checkpoint/lap order, time
  expiry, stage ties, restart/exit, storage failures and score
  eligibility. Include no NaNs, invisible collision objects or
  unreachable objective sequences.
  - Checked 2026-10-29: integration 8c3f7ee final gate green: `make verify` (unit 1112/0, browser 728/0, World Tour 326/0), `npm run test:layout` 37+42, `npm run test:cloud` 15/15 + rules 3/3 (6a); exact-HEAD CI pending. Evidence: championship-cup, race-modes, mode-acceptance-browser (restart/exit all modes).
- [x] **Classic regression:** original 10 tracks, Daily Challenge,
  Garage stars/unlocks, medals, best Ghosts, NITRO/FLY/BOOST,
  air tricks, camera, performance notice and save migration.
  - Checked 2026-10-29: integration 8c3f7ee final gate green: `make verify` (unit 1112/0, browser 728/0, World Tour 326/0), `npm run test:layout` 37+42, `npm run test:cloud` 15/15 + rules 3/3 (6a); exact-HEAD CI pending. Evidence: full existing suite in the gate.
- [x] **Responsive:** Playwright desktop 1440×900 and touch phone
  390×844, 320×740 and landscape 844×390; no HUD/touch control
  overlap, focus traps or offscreen Start/Exit actions.
  - Checked 2026-10-29: integration 8c3f7ee final gate green: `make verify` (unit 1112/0, browser 728/0, World Tour 326/0), `npm run test:layout` 37+42, `npm run test:cloud` 15/15 + rules 3/3 (6a); exact-HEAD CI pending. Evidence: responsive-browser, mode-coverage-browser, hud-progress-offset tests.
- [x] **Motion & accessibility:** comfortable/reduced-motion,
  low/medium/high visuals, color-independent hazard telegraphs,
  touch hit targets, keyboard remapping and screen-reader
  labels on important buttons.
  - Checked 2026-10-29: integration 8c3f7ee final gate green: `make verify` (unit 1112/0, browser 728/0, World Tour 326/0), `npm run test:layout` 37+42, `npm run test:cloud` 15/15 + rules 3/3 (6a); exact-HEAD CI pending. Evidence: hazard-render, keymap-ui, device-quality tests, mode-coverage-browser, item-feedback-browser (USE ≥44×44 on touch), browser.spec.js (44 px per mode).
- [x] **Performance:** bounded spawned/active objects, chunk
  evictions, fixed update/simulation behavior, and before/after
  `?perf` p50/p95/fps comparison on desktop and **real** midrange
  Android Chrome + iPhone Safari when available. Simulator results
  are not substitutes for phone GPU testing.
  - Checked 2026-10-29: unit 1113/0 + typecheck on integration ebc307a (incl. origin/main b623c28); cited browser specs green in integration pre-gate 995b1cc; final full gate + exact-HEAD CI pending. Evidence: endless-highway, hazard-render tests; make perf-modes table and desktop A/B in docs/perf-modes-2026-10-29.md (software WebGL, f998e68).
- [x] **Verification:** `npm test` + `npm run build` for all logic
  or progression changes; also `npm run test:browser` for any
  UI, rendering, controls or unlock visibility changes. Ensure
  production build excludes local-only unlock wiring.
  - Checked 2026-10-29: integration 8c3f7ee final gate green: `make verify` (unit 1112/0, browser 728/0, World Tour 326/0), `npm run test:layout` 37+42, `npm run test:cloud` 15/15 + rules 3/3 (6a); exact-HEAD CI pending. Evidence: make verify.
- [x] **Delivery:** implement on a feature branch unless the user
  explicitly requests direct `main` changes; review and mark
  individual tasks `[x]` only after implementation and tests.
  - Checked 2026-10-29: integration 8c3f7ee final gate green: `make verify` (unit 1112/0, browser 728/0, World Tour 326/0), `npm run test:layout` 37+42, `npm run test:cloud` 15/15 + rules 3/3 (6a); exact-HEAD CI pending. Evidence: feature branches, merged into main locally only after the green integration gate, on explicit user authorization (2026-10-30); no PR, tag or deploy.

### 13D. Inspiration and design references

- **Mario Kart World:** Free Roam and custom VS-style rules — adapt
  settings, not copyrighted tracks/characters.
- **Forza Horizon 5 EventLab:** rule presets, track props and event
  creation — begin with a small, validated object library.
- **Trackmania:** time trials, ghosts, stunt/platform challenges,
  checkpoint precision and eventually authored looped circuits.
- **Hot Wheels Unleashed 2: Turbocharged:** modular hazards, jumps,
  obstacle timing and arcade risk/reward.

Reference entry points:
[Mario Kart World](https://www.nintendo.com/us/gaming-systems/switch-2/featured-games/mario-kart-world/) ·
[Forza](https://forza.net/) ·
[Trackmania](https://www.trackmania.com/) ·
[Hot Wheels Unleashed 2](https://hotwheelsunleashed.com/).

**Scope reminder:** This is a backlog, not a claim that features exist or are
approved for implementation. Preserve the earlier completed work and
never conflate future modes with existing Control “steering mode” options.

## Firebase 資料完整性、Google 帳號與 Cloud Save UI：實作清單（2026-10-25）

### 工作分流：三種 TODO 狀態（2026-10-25）

**適用範圍：** 下方既有 P0／P1 36 項（目前 23 項標示完成、13 項尚未完成），以及 P2 2 項和候選 S1–S3。**狀態分類不等於完成**：只有執行相應 TDD／CI 或正式驗收且留有證據，才可將原項目由 `- [ ]` 改為 `- [x]`。已完成 23 項保留原勾選狀態；不要因重新分類改成未完成，也不要將已存在的功能重做一遍。

#### 狀態一：現在必須完成（Spark 免費方案可執行）

**P0 優先：** `A5` 不同 Google UID 切換及離線／待同步資料保護、`B5` 永久 Stunt score／maxCombo／airTime／medal 跨裝置的模擬器回歸、`D1` Firestore Rules 欄位／型別／範圍／權限負向測試，以及 `H1` 的本地 TDD 與 CI 部分。遵守先 RED、後 GREEN、再重構的流程，測試有失敗須先修復；不可因已有程式碼或單次測試通過就提前勾選。

**P1 接續：** `A1`、`A3`、`D4`、`D5`、`E1`、`E2`、`E6`、`E7`、`E8`。先針對**現有實作**補上或修復名稱／頭像 fallback、備份驗證、六種同步狀態、操作回饋、繁中／英文與 ARIA、桌面和手機直／橫向測試；僅在實際缺功能或測試紅燈時修改程式碼。不得引入付費 Firebase 服務。

- [ ] **H1-Local** — 完整重跑 `npm test`、`npm run build`、Firestore Emulator Rules 與 Cloud Save 瀏覽器測試、全部相關 Playwright／CI 分片，記錄**同一個最新提交 SHA** 的綠燈證據；若有失敗保留 `[ ]` 並修正，特別覆核 A5／B5／D1。
- [ ] **H1-Regressions** — 用模擬器驗證 A→B→A 帳號切換（含離線 pending）、Stunt 永久成績新裝置還原、不同 UID 的禁止讀寫、資料刪除防復活，並保留測試輸出／原因分析。
- **執行準則：** 適合在本機／CI 測試的項目不得因欠缺實機或正式站權限而無限延後；反之本機綠燈不能取代實際上線的授權或資料使用驗收。

#### 狀態二：正式環境具備條件後驗收（不代表現在缺少功能）

僅在**正式網站已部署相應程式碼與 Firestore Rules、可使用授權的真實測試 Google 帳號／裝置**時逐項驗收；未具備條件時保持 `[ ]`，寫下阻礙與可重現步驟。避免為了讓核取方塊變成 `[x]`，重寫已通過模擬器的功能。

- [ ] **H1-Prod-Auth** — 使用正式站測試 Google popup 登入／登出、名稱與 Email 寫入、頭像有／無時顯示；須先有合法測試帳號與可用的正式站。
- [ ] **H1-Prod-Rules** — 已部署與 repo 相符的 Firestore Rules 後，以授權測試帳號實測 `accounts/{uid}`、`saves/{uid}`、`modeBests/{uid}` 的讀寫、跨 UID 拒絕與刪除；未部署不得宣稱已正式驗收。
- [ ] **H1-Prod-Devices** — 有可測裝置時，完成桌面 Chrome、iPhone Safari、手機直橫向／跨裝置同帳號還原與登出後資料隔離；需要真人與真機的檢查不得以 Playwright 模擬結果取代。
- [ ] **H1-Spark-Usage** — 正式站確認 Firestore／Authentication 使用量維持 Spark 限制，不進行方案升級、綁定帳務或開通付費產品。
- **H1 原始總項目**：本地驗證與上述適用的正式環境驗收**全部**取得證據後才可勾選 `H1 (P0)`；如果只有本地測試成功，應保留本段實機／正式驗收待辦，不重複開發。

#### 狀態三：未來符合需求才實作（本次延後）

| 原項目 | 真正的啟動條件 | 現在的處理 |
|---|---|---|
| `G1 (P2)` 公開玩家 Profile | 正式決定推出自訂暱稱、公開個人頁及隱私設計 | 保留 `[ ]`，沿用 Auth 名稱與 Email |
| `G2 (P2)` 排行榜／raceResults | 正式推出多人競技排名、需要可信的成績驗證／反作弊 | 保留 `[ ]`，現有私人存檔已足夠 |
| `S1` Cloud Functions／可信後端 | 有不能用本地或 Spark Rules 解決的可信運算需求，且已經評估可行方案 | 保留 `[ ]`；禁止自行升級 Blaze |
| `S2` PITR／TTL／託管備份還原 | 手動 JSON 備份已不符合可恢復性、保留年限或營運要求 | 保留 `[ ]`；禁止自行啟用收費功能 |
| `S3` 額度監測／容量擴充 | Firestore 使用量接近 Spark 免費限制或使用者量明顯增加 | 先觀察 Usage 並優化讀寫；不自行升級 |

**費用底線：** 此專案本次只允許 Firebase **Spark** 內可執行的功能。任何需要 Blaze、付款資訊、Cloud Functions、PITR／託管備份等方案變更的事項，都不得在本次自動實作；必須等未來有明確需求且使用者**另行明確同意**後再重新評估。

---

**範圍：原先 P0／P1 35 項 + 新增 Google 名稱／Email 入 Firestore 1 項，共 36 項。** 原先 2 項 P2 保留未勾選、不在此次實作。僅項目經對應 TDD／回歸證據驗證通過後才改為 `[x]`。不可因存在程式碼、模擬器通過而把尚未驗收的正式站事項宣稱完成。

**Spark-only／成本限制：** 使用現有 Firebase Authentication Google 登入和**既有免費 Firestore 資料庫**的文件讀寫，禁止啟用 Blaze、設定帳務、建立第二個資料庫、Cloud Functions、Firestore TTL、PITR、代管備份／還原等付費方案功能。Spark 有 1 GiB 儲存、每天 50,000 reads／20,000 writes／20,000 deletes 等限制，實際以官方方案與 Usage 頁為準。不得每影格同步；登入 profile 同值應跳過寫入。若功能需要付費：僅將其維持 `[ ]`，註明原因、免費替代方案與「經使用者明確同意升級／實測足夠配額才開始」條件，絕不自動升級。

**實作流程：** 建立 feature 分支；每階段先寫會失敗的測試、驗證 RED，最小修正後驗證 GREEN、Refactor；每個成功階段就更新本清單與 commit。不得建立 PR，未收到合併指令不得合併 main。正式環境需更新 Rules 並實機驗證，不能把本地測試視為已發布。

### A. Google 登入與帳號管理

- [ ] **A1 (P1)** Cloud Save 顯示 Google displayName，沒有名稱時顯示合理替代值。 **【狀態一：現在必須完成；先補測試／修正，不重做已存在功能】**
- [x] **A2 (P1)** Cloud Save 顯示並辨識目前 Google Email。
- [ ] **A3 (P1)** 顯示 Google photoURL 頭像，讀取失敗有替代圖示。 **【狀態一：現在必須完成；先補測試／修正，不重做已存在功能】**
- [x] **A4 (P1)** 登入、登出及 Auth 初始化時明確顯示使用者身分狀態。
- [ ] **A5 (P0)** 安全切換 Google 帳號，避免不同 UID 的資料混用或遺失未同步進度。 **【狀態一：現在必須完成；先補測試／修正，不重做已存在功能】**
- [x] **A6 (P0)** Firebase Auth／UID 管理身分，禁止遊戲資料儲存 Google 密碼、OAuth Token 與無關個資。
- [x] **A7 (P1)** 【新增需求】於免費 Spark 既有 Firestore 儲存 accounts/{uid}：Google displayName 與 email；登入／變更時更新，Rules 限本人存取，空值不覆蓋有效資料，刪除流程同步清理。

### B. Firestore 儲存內容與資料版本

- [x] **B1 (P0)** 保留 saves/{uid} 既有版本化成果與相容性，不破壞舊帳號存檔。
- [x] **B2 (P0)** modeHistory 雲端保留 rulesVersion、distance、stageCount、itemsUsed、hazardPasses、hazardHits 等完整合法資料。
- [x] **B3 (P0)** 統一 mode rules 的本機與雲端長度上限和驗證契約（現有 4096／2000 不一致）。
- [x] **B4 (P0)** 永久 modeBests 跨裝置同步，避免最近 50 場輪替後永久紀錄消失。
- [ ] **B5 (P0)** 永久 stuntBests（score、maxCombo、airTime、medal）跨裝置同步。 **【狀態一：現在必須完成；先補測試／修正，不重做已存在功能】**
- [x] **B6 (P0)** 最近 50 場 history 與永久 best 分離；合併去重，不讓最佳成績倒退。
- [x] **B7 (P1)** 版本升級、無損遷移與向下相容；需要時保留 updatedAt，拒絕未知未來版本覆寫。

### C. 雲端同步與本機資料可靠性

- [x] **C1 (P1)** 整合登入／完賽／成果改變／重連同步入口，不逐影格寫 Firestore。
- [x] **C2 (P0)** 各 UID 獨立本機快照，帳號切換安全保護未同步資料。
- [x] **C3 (P0)** 離線 pending 狀態按 UID 持久化；網路恢復與重新開啟時重試。
- [x] **C4 (P0)** 同帳號雙裝置並發交易與重複登入不丟最佳成績、不重複紀錄。
- [x] **C5 (P0)** 僅在 Firestore 成功確認後顯示已同步及更新最後成功時間。
- [x] **C6 (P1)** localStorage 多 Key 寫入一致性與失敗回復，禁止把寫入失敗誤報成功。

### D. Rules、備份、刪除與安全

- [ ] **D1 (P0)** Firestore Rules 驗證欄位、型別、範圍、合法賽道／模式、列表及字串長度。 **【狀態一：現在必須完成；先補測試／修正，不重做已存在功能】**
- [x] **D2 (P0)** saves／accounts／永久最佳成績僅由對應登入 UID 私有讀寫，禁止列舉其他玩家。
- [x] **D3 (P0)** 刪除進度後避免舊本機副本／排隊同步使資料復活，帳號基本資訊的刪除範圍明確。
- [ ] **D4 (P1)** 匯出及匯入 JSON：大小／版本／內容驗證與可理解的失敗提示。 **【狀態一：現在必須完成；先補測試／修正，不重做已存在功能】**
- [ ] **D5 (P1)** 清楚區分登出、刪除遊戲資料、未來可能的刪除 Firebase Auth 帳號。 **【狀態一：現在必須完成；先補測試／修正，不重做已存在功能】**

### E. Cloud Save UI／UX

- [ ] **E1 (P1)** Cloud Save 保持遊戲視覺風格，顯示 Google 名稱、Email、頭像。 **【狀態一：現在必須完成；先補測試／修正，不重做已存在功能】**
- [ ] **E2 (P1)** 明確提供未登入／同步中／已同步／等待網路／雲端失敗／本機寫入失敗六種狀態。 **【狀態一：現在必須完成；先補測試／修正，不重做已存在功能】**
- [x] **E3 (P1)** 最後同步時間只顯示實際 Firestore 成功結果。
- [x] **E4 (P1)** 新增手動「立即同步」，避免重複寫入及切換帳號期間觸發。
- [x] **E5 (P0)** 帳號切換確認 UI；清楚警告未同步資料並禁止破壞性切換。
- [ ] **E6 (P1)** 登出／刪除／匯入／匯出提供明確 UX、成功與失敗回饋。 **【狀態一：現在必須完成；先補測試／修正，不重做已存在功能】**
- [ ] **E7 (P1)** 所有文案繁中／英文及無障礙 ARIA、鍵盤操作、焦點與狀態公告。 **【狀態一：現在必須完成；先補測試／修正，不重做已存在功能】**
- [ ] **E8 (P1)** 支援 Desktop／Mobile 直橫向，不遮擋比賽，沿用現有設計。 **【狀態一：現在必須完成；先補測試／修正，不重做已存在功能】**

### F. 裝置設定及本機進度

- [x] **F1 (P1)** Ghost／控制／音效／畫質／語言／塗裝選擇等裝置偏好保持本機，不額外產生雲端費用。
- [x] **F2 (P1)** 重要本機遊戲副本、同步資訊與帳號歸屬依 UID 隔離，既有 Local Storage Keys 相容遷移。

### H. TDD／CI／正式環境驗收

- [ ] **H1 (P0)** 每功能 Red→Green→Refactor，npm test／test:cloud／build／瀏覽器、Rules、安全、真實帳號 Chrome／Safari／跨裝置；正式站與用量驗收未完成前不得勾選。 **【狀態一：本機 TDD／CI；狀態二：正式站／實機待驗收；兩段皆完成才能勾選】**

### G. P2 延後實作／啟動條件（本次不得勾選或實作）

- [ ] **G1 (P2)** 玩家自訂暱稱與公開個人資料 profiles/{uid}。**延後原因與條件：**現在使用 Firebase Auth 的 Google 名稱／Email 即可；只有正式推出玩家自訂名稱、公開個人頁、可見的公開頭像與隱私授權需求時才設計獨立 Profile 與 Rules。 **【狀態三：未來條件式啟動；本次不實作】**

- [ ] **G2 (P2)** 公開排行榜／比賽結果 leaderboards、raceResults。**延後原因與條件：**目前私人賽事成績可透過 saves 還原，瀏覽器提交的分數不能直接作競技可信依據；只有推出對外排名／競賽或防作弊驗證時再評估可信任後端與費用。Spark 不提供 Cloud Functions，若方案要求 Blaze 或其他付費服務，必須由使用者明確同意才做。 **【狀態三：未來條件式啟動；本次不實作】**

### Firebase 模擬器與 CI 通過驗證（2026-10-25）

- **已驗證：** [CI #40122717700](https://github.com/weskao/skyline-rush/actions/runs/40122717700)，提交 `63e6432`：`unit-tests` 成功；`cloud-save` 成功，包含 **9 個 Auth／Firestore Emulator 瀏覽器案例**及 **3 個 Firestore Rules 測試**。
- **勾選原則：** 上述已勾選項目具單元／模擬器驗收或維持既有已回歸行為；`H1` 仍未完成，**不可把 unit/cloud-save 的成功當作全套 Browser CI、正式網站或真機 Safari 驗收成功**。本檔文件提交後將重新觸發 CI，須以最新提交結果為準。
- **尚未勾選：** 頭像失敗回退完整 UI 測試、Stunt 永久最佳成績獨立新裝置回歸、完整 Rules 內層數值約束、JSON 匯入端到端、所有錯誤狀態與無障礙、各個手機／桌面尺寸、完整 browser shards、正式站／真機 Safari。
- **免費限制：** 使用者指定僅 Spark；不能以升級方案或付費 Cloud Functions 代替未完成項目。

### 本輪 TDD 與 CI 驗證記錄（2026-10-25）

- [x] **B2、B3**：cloud modeHistory 的額外統計與本機相同 4096 字元規則上限；回歸測試已納入 `npm test`。
- [x] **C6**：localStorage 多 Key 寫入失敗採最佳努力回復，原本資料可還原時不遺留部分新成果；有單元回歸測試，無法保證已不可寫的瀏覽器儲存仍可回復。
- **實際 CI 證據**：`https://github.com/weskao/skyline-rush/actions/runs/40122441074` 的 `unit-tests` job 已成功（SHA `6e5fffef`）。後續 SHA 對文件與文案有修改，須再檢查 CI。
- **仍在進行或未驗證**：Auth／Firestore Emulator、全部瀏覽器分片、實機 Safari、正式 Google 帳號與 Firestore Rules 部署；A7、B4、B5、C2/C3/D3/D4、E1–E8 等維持 `[ ]`，直到其驗收證據確認。
- **本批已提交的實作**：UID 私人帳號名稱／Email、永續 Mode／Stunt 最佳成績、離線 pending、帳號快照與切換、原子多文件刪除及重上傳防護、Google 帳號 UI、手動同步、JSON 匯入／匯出、雙語字串與專項測試。
- **免費限制**：完全沿用 Firebase Spark，無 Blaze 升級、無 Cloud Functions 或其他付費服務。未實作的 P2 和付費候選項目維持原定條件。

### 本分支實作紀錄（2026-10-25）

- **已提交、待完整 CI／模擬器驗收：** A7 私人帳號資料 accounts/{uid} 的 displayName／email 正規化與登入同步、刪除流程清理；已新增純函式測試與 Firestore Rules 測試。此功能不使用 Blaze 或 Cloud Functions。
- **已提交、待完整 CI／回歸驗收：** B2／B3 cloud modeHistory 保留規則版本、距離、關卡與障礙統計，接受與本機一致的 4096 字元 rules；已加入雲端合併回歸測試。
- **驗證紀錄：** 帳號正規化的精簡 Node 隔離測試先 RED（模組不存在）後 GREEN（3/3）；**尚未在完整專案執行 npm test、npm run test:cloud、npm run build、browser CI，因此相關 checkbox 暫不勾選**。
- **部署限制：** 新 accounts/{uid} Firestore Rules 尚未部署至正式 Firebase；任何正式站登入測試與 Usage 確認仍待完成。禁止把 GitHub commit 當作已上線證據。
- **待執行的下一步：** 執行完整單元與 Firebase Emulator Rules／Browser 測試；若出錯先修正；通過後才將 A7、B2、B3 與相關驗證標記 [x]，再依 P0→P1 清單繼續。

### Spark 免費額度相關候選項目（只有符合條件才實作）

- [ ] **S1 — 後端驗證／Cloud Functions**：Spark 無法使用 Cloud Functions。本次以 Firestore Rules 及本地驗證保護私人資料；若要防作弊或伺服端競技排行，需先有實際需求與**使用者明確同意 Blaze 或其他可用免費替代方案**才重新評估。 **【狀態三：未來條件式啟動；本次不實作】**
- [ ] **S2 — 託管備份／PITR／TTL 刪除／Firestore 還原**：Firestore 免費額度不含這些功能。本次改用玩家手動 JSON 匯出／經驗證匯入；只有資料量、RPO／RTO 要求使本機匯出不夠且**經使用者明確同意付費**，才納入實作。 **【狀態三：未來條件式啟動；本次不實作】**
- [ ] **S3 — 免費額度監控與升級門檻**：發布後先觀測現有 Firestore Usage；若讀寫、存量或使用者數接近 Spark 限制，先降低重複寫入／資料量，未經同意不得啟用任何付費服務。 **【狀態三：未來條件式啟動；本次不實作】**

**官方參考**：https://firebase.google.com/pricing 、https://firebase.google.com/docs/firestore/pricing 、https://firebase.google.com/docs/projects/billing/firebase-pricing-plans
## Home showroom camera parity & discovery (2026-10-25)
- [x] Identify camera precedence bug: curated maps bypass selected VFX view, while older maps require AIRFLOW.
- [x] Create shared camera modes and reusable framing for every current and future track.
- [x] Add homepage prev/next camera dock and synchronize it with VFX and zh-TW/en localization.
- [x] Document reusable showroom camera rules in CLAUDE.md and .claude/rules/track-showcase.md.
- [x] Commit unit and browser regression test cases on fix/home-showcase-camera-parity.
- [ ] Run Node/Vite checks and confirm RED -> GREEN in CI (not verifiable from current tool runtime).
- [ ] Verify real Chromium/Safari desktop and touch screenshots for all tracks; adjust overlapping elements if necessary.
- [ ] Merge only after verified green CI and QA.

## AIRFLOW showroom grounding parity (2026-10-25)
- [x] Identify the root cause: curated `HERO_PREVIEWS` branch in `previewPlayer` ignored `groundedShowcase`, leaving World Tour cars airborne when AIRFLOW was active.
- [x] Add regression unit cases for all current tracks and an unknown future track; normal flying showcase remains available with AIRFLOW off.
- [x] Add live-WebGL checks for the five World Tour roads with AIRFLOW enabled, including grounded actor position, no hovering jets and six selectable camera views; expose test-only VFX options in the existing World Tour fixture.
- [x] Unify preview player altitude and thrusting in one shared function, independent of the curated map list, without duplicating rendering logic.
- [x] Update CLAUDE.md and .claude/rules/track-showcase.md for future track design consistency.
- [ ] Verify tests RED → GREEN by executing Node unit tests and the World Tour WebGL suite at this exact HEAD (CI pending).
- [ ] Confirm real home-screen AIRFLOW, all six camera views, full landscape/portrait screenshots and roadmap landmarks on actual browser/devices.
- [ ] Confirm full GitHub quality-gate green on this exact branch HEAD before merging to main.

## Home showroom vehicle occlusion / AIRFLOW layout (2026-10-25)
- [x] Trace the coverage gap: existing showroom checks only asserted that the car's screen-space center/width were finite; opaque scenery between the camera and the real vehicle was not measured.
- [x] Add real-WebGL five-body-point ray visibility assertions, for all five World Tour maps, all six camera views, AIRFLOW enabled and disabled. Threshold: at least 4/5 body points unobscured and within the viewport.
- [x] Implement cached preview-only camera clearance. Prefer the reference angle; if blocked, try small dolly-back / local-road sideways and vertical offsets while retaining each track's landmark look target. No removal of scenery or change to in-race camera.
- [x] Add desktop 1440×900 and mobile 390×844 home UI regression cases that select each of the five maps, activate AIRFLOW and cycle six camera views via real click/touch targets, capturing screenshots.
- [x] Document camera visibility, visual fidelity, and frame-performance rules in CLAUDE.md and the scoped showroom rule.
- [ ] Run and inspect latest branch HEAD Node/unit/build, all browser shards, World Tour and cloud-save GitHub CI with quality-gate green (still pending).
- [ ] Review actual screenshots of Tokyo, Alpine, Taipei, Coastal and Cosmic with AIRFLOW on/off, verify car wheel/ground contact, body fully unobscured, landmark framing and nonblocking HUD across both orientations; real iOS/Android hardware acceptance pending.
- [ ] Only after exact-HEAD CI success, sync any newer main and obtain CI success again before merging feature branch directly into main.


## Roadmap continuation: inherited regression gates (2026-10-28)

- [x] Reproduce inherited main failures before changing expectations: unscaled Phase 4 timeout, first-frame perf sampling, reviewed CSS baseline drift and stale paused-overlay result checks. Evidence: `artifacts/regression-gates/unit-red.log`, `browser-red.log`, `latest-main-css-red.log`.
- [x] Preserve assertions while repairing their assumptions: use CI timeout helper, prime the presented-frame clock, review accepted main CSS changes without changing recorded DOM, and await finished phase before measuring/clicking Race Again. Focused unit and full unit suites pass (784 passed, 3 skipped); affected browser suite passes (41 passed, 1 desktop-only skip).
- [x] Integrate main `53d4a0a` including its 44px touch targets and narrow VFX selector overflow fix; review the exact CSS delta before updating the golden hash.
- [x] Exact-commit CI exposed three stale minimap assumptions after Phase 4 added two decorative Spiral polylines. Preserve a single main centreline per map, exact permitted total counts, curve bounds and four racer markers; target the existing main-path CSS hook instead of every polyline. Remote RED: `40565776298`, shards 3/4/7; local focused retest recorded separately.
- [ ] Run complete `make verify` on the resulting branch and inspect exact-commit GitHub `quality-gate`; retain real hardware gates separately.

- [x] Integrate current main `2cd52d4` (BOOST/chain landing, spark/audio cue, localized release clips). Resolve only overlapping test assumptions; preserve the new gameplay and media. Shared FPS test now checks the 1000/1016/1032 ms sequence and zero early counter reads. Reviewed main's three release-video CSS rules before synchronizing the style contract. Fresh full Node: 791 passed / 3 skipped; affected minimap/parity/release-video browser suite: 13 passed.


## Barrel-roll wake direction and quality (2026-10-30)

- [x] Source/rules: use the real `player.trick`, existing quaternion history, pooled ribbon and particles; keep BOOST and manual AIRFLOW behavior. Engine hot-path JS stays in the existing rendering exception.
- [x] RED: adapted baseline fails roll-emission, direction/pitch, quality, lifecycle and elevated-origin regressions; see `artifacts/barrel-roll-physics/red.log`.
- [x] GREEN: passive still-air markers, world-space edge streaks, full XYZ origin rebasing; owner/shader/module-size 18/18. Both sides obey dphi/dz = -omega/U in straight constant-speed tests; doubling speed doubles pitch.
- [x] Cross-track unit regression: four Classic tracks, Sky Spiral, five World Tour tracks and Harbor Circuit retain history under origin shifts. Low hides added roll wake; Medium/High sample at existing .5/1 quality. Master, opacity, density, comfort and reduced motion clear roll-owned history immediately.
- [x] Full unit suite: 1133 pass, 3 skips. TS/Vue/legacy JS checks and production build pass (existing chunk-size/import-attribute warnings).
- [x] Real WebGL A/B: desktop 1440x900 / mobile emulation 390x844, identical real simulation inputs, pose and camera; active ribbon vertices 0 -> 180, draw calls 263 -> 263, triangles 72929 -> 72929 on Coast. No FPS/thermal claim.
- [x] Desktop native keyboard recording: actual Low/Medium/High barrel rolls with BOOST and manual AIRFLOW off; max added ribbon vertices 0/126/264, no page errors.
- [x] Mobile multi-touch recording: actual Low/Medium/High rolls, vertices 0/126/252, BOOST/AIRFLOW off, no page errors; 45.2 s MP4 reviewed and delivered. Earlier missed gestures are retained as driver failures, not product evidence.
- [x] Full World Tour gate: 326/326 pass (2.5 min).
- [ ] Full browser gate: 746 pass / 3 skips / 1 timing failure in stalled-frame test (0.15 s vs <0.12 s). Identical isolated reruns 3/3 pass; full-run failure remains recorded. These are make verify components, not an exact `make verify` invocation (direct installed typecheck tools avoid mutating shared dependencies).
- [ ] Physical Safari/iOS/Android, device heat/battery, per-track controlled performance benchmarks and exact-commit remote GitHub quality-gate remain separate acceptance. No commit/push/merge/PR/deploy authorized.

Model boundary: these are unsteady streak/history markers in still air, not instantaneous CFD streamlines or a prediction of pressure, turbulence or induced swirl. No fixed decorative helix, opposite-winding pair, or artificial exhaust velocity is added for roll-only markers.

## Main regression sweep — sibling worktree reload (2026-10-31)

- [x] Reproduce: the flight HUD browser test returned to the ready screen while Vite logged sibling worktree HTML/tsconfig changes; expected `READY TO FLY`, received `BUILD SPEED` after an unsolicited navigation.
- [x] RED → GREEN: `node --test tests/vite-worktree-watch.test.js` failed on the sibling HTML exclusion before the fix; watcher, production-access and feature-server checks now pass 7/7. The exclusion is anchored to this checkout to preserve live reload in worktree servers.
- [x] Original browser regression: `CI=1 npx playwright test tests/browser.spec.js -g 'flight HUD explains'` passed 1/1 (15.3 s), including takeoff, low charge, descent, touchdown and recharging.
- [x] Isolate verification after concurrent edits advanced `main` to `d0b6048`: shared-workspace runs mixed changing source/builds and failed release-media/result-actions checks. The full gate now runs in detached `.claude/worktrees/main-test-verification` with only this repair applied and independent dependencies/build outputs.
- [x] Separate stable-run RED: the desktop video-enlarge check measured its button and icon in different entrance-animation frames (0.506 px apparent offset against the unchanged 0.5 px limit). Measure all three rectangles in one browser evaluation; keep the same centering, touch-target and containment assertions.
- [x] Video measurement GREEN: fresh production build, then `CI=1 npx playwright test tests/release-media-zoom-browser.spec.js -g 'release clip opens whole' --repeat-each=3 --workers=4` — 15/15 pass across desktop, both tablet orientations and both phone orientations.
- [ ] Full `CI=1 make verify` and exact-commit GitHub `quality-gate` after the authorized commit/push. Physical-device acceptance is separate; no gameplay/rendering behavior changed.
