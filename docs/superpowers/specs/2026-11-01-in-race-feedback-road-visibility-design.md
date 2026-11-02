# In-Race Feedback Visibility — UX Design Spec (2026-11-01)

**Repository:** https://github.com/weskao/skyline-rush  
**Base/integration branch:** `develop`, not `main`.  
**Status:** DESIGN PROPOSAL ONLY — no production code, screenshot approval, or CI results claimed.  
**Priority:** P0 readability and forward-road visibility, P1 polish.  
**Owning feature:** New isolated `feature/in-race-feedback-visibility` on latest `develop` when implementation is authorized. This document alone does not create that branch.  
**Implementation plan:** [2026-11-01-in-race-feedback-road-visibility-plan.md](../plans/2026-11-01-in-race-feedback-road-visibility-plan.md)

## 1. Verified current behavior (read against develop HEAD 88dce759)

- `src/App.vue`: `#event-callout` (three report slots) and `#driving-message` are both displayed during racing; `TutorialCoach.vue` displays the separate interactive `#tutorial-coach`.
- `src/style.css`: `#event-callout` is centered by `left:16px; right:16px; margin:auto`, positioned `top:206px`; mobile portrait `top:272px`, short landscape `top:30%`. `.driving-message` uses `top:30%`, with a warning at `top:324px` in portrait, `top:214px` in short landscape and `168px` on compact landscapes. Their backgrounds/text can cover the forward roadway.
- `src/callouts.ts`: reward/ability events queue for 1.2 **race-elapsed** seconds apiece, deduplicated only by event kind. A sequence of earned actions can repeatedly occupy the same region.
- `src/race-hud.ts`: `updateCallout()` renders 3 report variants and animates scaling; `updateStatus()` controls `#driving-message`. These must retain game semantics and localization.
- Checked the unmerged Wave2 `feature/high-speed-vfx`, `feature/foldable-layout-adaptation`, `feature/garage-vfx-skins`, and other available feature branches: all retain the same `src/callouts.ts` blob and effectively the same central `.event-callout`/`.driving-message` CSS placement; no dedicated unmerged Toast-road-visibility feature branch exists in the current branch list.
- This is a targeted new UX defect rather than the Garage VFX Skins Phase B scope. Do not silently change their active branches.

## 2. Product objective

**The car, road centerline, approaching obstacles and relevant turn/traffic view take priority over reward celebration.** During an active race, ephemeral feedback must be readable at a glance, preserve timely gameplay warnings and status semantics, and not cover the forward driving view. Accessible alternatives must remain available.

Keep the neon-arcade identity and meaningful satisfaction of PERFECT LINE, DRIFT, NITRO READY/BURST, AIR→ROAD CHAIN, BARREL ROLL, shortcut and reward amounts, but stop showing repeated large opaque cards over the road.

## 3. Notification taxonomy and proposed delivery

| Priority | Examples | Default treatment | Lifetime / policy |
| --- | --- | --- | --- |
| Critical gameplay safety | Engine-relevant immediate hazard or depleted required resource | **Compact edge-adjacent warning near a corresponding HUD widget**, high contrast, no central modal; prioritize over reward. | Remains while condition is active; don't swallow or drop critical state. |
| Actionable guidance | Too slow to lift, release to recharge, NITRO availability | **Inline in flight/fuel/NITRO HUD** (prefer existing status) with compact indicator, avoiding a second center banner. | State-driven; update only on change. |
| Event reward / celebration | PERFECT LINE, NEAR MISS, DRIFT tier, BARREL ROLL, AIR→ROAD CHAIN, +NITRO | **One-line compact peripheral chip**, optionally two-line for truly rare first-use milestone. Prefer contextual badge near score / NITRO / flight widget. | Proposed 700–900 ms display; duplicate cooldown ~2 s per kind, queue capped (e.g. 2 pending), merge upgrades and coalesce reward totals. Reassess after actual playtests. |
| First-time skill teaching | Tutorial coach / training critical frame | Current `#tutorial-coach` **only in dedicated practice**, collapsible or movable into a side panel; pause teaching frame only when required by the existing tutorial contract. | Until action achieved / player dismisses; no road-center obstruction while driving; preserve Pause/Exit. |

**No loss of game reward or semantics:** changes are UI-only, not physics, scoring, trial entitlements, event generation, item pickup, or HUD readings.

## 4. Adaptive geometry / protected forward view

- Define a **Protected Driving View** for running race (candidate baseline: center 35% of viewport width and upper-to-mid 20–70% of viewport height). Measure actual camera/projection, player car, UI and road geometry from screenshots before freezing numeric bounds. This is a reviewable target, not a claim that one rectangle fits every track or fold state.
- Rank available **peripheral anchors** by real available space. Avoid measured DOM bounding rectangles of leaderboard, progress, minimap, warning map, flight director, touch buttons, NITRO meter, notch, safe areas and fold/hinge segments. **No fixed `top:272px` or `30%` across all viewports**.
- **Desktop:** default compact reward rail at a measured left/right HUD-adjacent area with no overlap to 8-car leaderboard, map, camera line or car; minimal icon + one line.
- **Phone portrait:** context-specific inline status by fuel/NITRO/score; one small chip in unoccupied peripheral space; suppress decorative detail when there is no safe room. Do not stack reward chip directly above `#driving-message` across the road.
- **Phone landscape / 568×320:** no full-width center toast. Fit into a measured edge strip. If there is no safe strip, show a short HUD badge (with optional nonvisual live-region announcement), not a large overlay.
- **Foldables and dual-screen:** use available viewport segments/hinge-safe geometry; never cover the hinge or rely on UA checks.
- Race phase gates: while `ready`, countdown may remain central (intentional gameplay requirement); while `racing`, hide/relocate noncritical feedback; during `paused`/`finished` existing overlays remain authoritative. Gameplay while tutorial is enabled uses the separate teaching contract.

## 5. Motion / accessibility / language

- Compact scale/fade/pulse only; no large center scale animation. Suggested entry/exit each ≤120 ms, no transform that shifts the touch target or meaningful HUD.
- Reduced Motion must disable scale/translate; avoid high-frequency ARIA announcements. Keep `role=status` / `aria-live=polite` where meaningful; collapse repeated events, and don't mute critical warning.
- Preserve en and zh-TW live text, font fallback/line wrapping; do not render baked-in text images or fake HUD screenshot. At narrow widths abbreviate only via reviewed locale keys; retain full accessible text for screen readers.
- Pointer/touch controls and keyboard remain operable. No `pointer-events` overlay intercepts essential controls.
- Preserve existing NITRO feedback animation inside the real NITRO control, unless that animation occludes other UI.

## 6. BDD acceptance (must be proven with actual running game)

1. **Given** racing 390×844 at a road hazard, **when** PERFECT LINE/DRIFT fires, **then** the protected road view and steering/NITRO buttons remain unobstructed and event text is still perceptible.
2. **Given** 844×390 and 568×320, **when** NITRO/BOOST, near misses and flight warnings overlap, **then** critical warnings and actionable HUD persist, reward chip does not cover the road/camera or the 8-car leaderboard/map, and reward queue stays bounded.
3. **Given** repeat DRIFT/NEAR MISS events, **when** they arrive rapidly, **then** chip spam is coalesced without changing actual rewards or incorrectly hiding essential state.
4. **Given** a practice tutorial, **when** a critical AIR→ROAD/BARREL ROLL frame starts, **then** tutorial actions remain discoverable and the car/road remain visible; Exit/Pause can be pressed on all target viewports.
5. **Given** en/zh-TW, normal/reduced motion and 3 quality tiers, **then** placement, text, ARIA, feedback and interaction remain consistent.
6. **Given** other Wave 2 features (eight AI, High-speed VFX, Foldable, Garage), **when** in-race feedback occurs, **then** no shared `src/style.css` layout regression and no physics/score/persistence change occurs.

## 7. Acceptance and release gate

**Minimum review devices:** 320×740, 390×844, 844×390, 568×320, 768×1024, 1440×900, a simulated fold/hinge layout; iOS Safari + Android Chrome device validation when available. Include en/zh-TW, tutorial/racing/paused, Low/Medium/High, Reduced Motion/VFX Off. For absent physical devices mark UNVERIFIED, never invent screenshot evidence.

Capture **real WebGL + DOM** before/after at the same tracked location, speed, camera and race state, with a series of frequent reward events. Check `getBoundingClientRect()` for each UI widget vs protected view, HUD, touch controls and hinge. Review screenshots manually for road visibility rather than trusting DOM bounding boxes alone. Ensure event IDs/counters, alerts and physics are unchanged and accessibility remains sound. Typecheck, unit, build, browser regression, World Tour, Cloud Save and exact-HEAD GitHub CI must be green **before recommending merge into develop**.

**No production implementation, design approval, or CI success is asserted by this spec.**
