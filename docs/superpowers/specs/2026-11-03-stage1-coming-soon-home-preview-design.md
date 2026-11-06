# Stage 1 Coming-Soon Home Preview — Design and Integration Contract

**Status:** First-pass selectable/disabled UI already exists; **live per-map Three.js showcase scenes are mandatory and still NOT implemented**. This document and the [binding animated 3D showcase design](2026-11-03-stage1-animated-3d-home-showcase-design.md) jointly govern completion.
**Date:** 2026-11-03
**Parent references:** [Stage 1 five-track image gallery](../../designs/new-tracks/README.md), [Concept → WebGL gate](../../designs/new-tracks/visual-acceptance-gate.md).
**Parallel implementation:** [six revised 3D implementation prompts](../prompts/2026-11-03-six-chat-home-preview-implementation.md) · [live-3D scene integration TDD plan](../plans/2026-11-03-six-chat-home-preview-integration.md). Five dedicated **Three.js environment scene** branches + one shared renderer/UI/QA owner. Individual chats must be opened by the user; preparing prompts is not automatic execution.

## Decision / Product behavior

Only **Stage 1** (沙暴裂谷 Dune Tempest, 雨林失落神殿 Monsoon Ruins, 浮空群島 Skyfall Archipelago, 熔火天脊 Volcanic Crown, 霓虹暴雨都市 Stormline Megacity) is displayed as **Coming Soon** on the existing home track carousel. The later Stage 2 five remain in documentation only. All five previews depict **point-to-point** courses (START and FINISH distinct; no laps). These designs are not playable tracks.

The existing ten sprint tracks keep their unchanged `RACE_TRACKS` gameplay and history records. This is intentionally **not** a registration of unfinished map IDs with `createRace`, ghost, unlock, rewards, Daily, Cup or challenge logic. The concept-only selection is a separate `upcomingSelection` in `race-select-ui.ts`. Actual playable race state is untouched while a coming-soon card is focused.

## Three home statuses / CTA copy

| Track status | Home card | Primary CTA (en / zh-TW) | Action |
| --- | --- | --- | --- |
| Unlocked playable | OPEN or SELECTED / 可選擇或已選擇 | Start race / 開始比賽 | Enabled unless the chosen mode forbids starting |
| Locked playable | LOCKED / 未解鎖 | LOCKED / 未解鎖 | Disabled; keep existing unlock hint |
| Stage 1 concept | COMING SOON / 即將推出 | COMING SOON / 即將推出 | Disabled in **all** modes, including keyboard Enter and persisted unlock data |

Primary button width stays fixed at each existing responsive breakpoint (236px desktop, 210px mobile, 190px compact landscape), regardless of selected map or language. Text is kept concise rather than forcing a long English map name into the fixed-width CTA. The selected map name appears elsewhere in the heading, card and accessible label.

## Live Three.js home scene / image layout UX

- One JPEG preview and route SVG per future track are already in `public/track-teasers/`, for **thumbnail and fallback only**; these illustrate the live 3D scene's target and do not satisfy real-time rendering acceptance.
- The selectable card uses the same size/spacing as the playable card and a cool/cyan planned-state treatment. It is not dimmed like a campaign-locked card. Its `aria-pressed` can be true even though `start-button` is disabled.
- On selection, **replace the interim static JPEG overlay** with this map's own **live Three.js world-space environment** in `#world`: the same shared player vehicle, animated jets/hover, 1–3 animated rivals where reasonable, matched ground/air route props, map-specific weather/particle/landmark animation and proper 50° showroom camera. Do not instantiate a playable `Race`; the last playable race remains unchanged in memory. No second canvas/WebGL renderer or independently running animation loop.
- Desktop/mobile and portrait/landscape layouts retain accessible 44px tap targets; Reduced Motion stops or simplifies scene animations, Low/Medium/High scale scene detail, and existing view/rotation controls continue to work. JPEGs in cards remain decorative with empty alt labels; the live scene has an accessible description tied to the selected localized map.
- Switching from an upcoming concept to an existing playable track, changing race mode, or starting a Daily Challenge clears preview-only selection. No preview ID is written to existing best-time/last-raced-track storage or sent to cloud.
- A localized UI refresh re-renders card names, statuses, track note, route length and primary CTA without creating an unfinished Race.

## Architecture and ownership (SOLID / minimal)

- `src/upcoming-tracks.ts`: five static IDs, bilingual map names, target lengths, static image/route paths and a pure precedence function `homeTrackStatus`. In particular, a tampered unlock store **cannot** promote a concept map to playable.
- `src/App.vue`: declarative selectable cards only; remove or keep hidden the interim full-screen JPEG hero overlay when WebGL is operational. No duplicate Vue render state.
- `src/race-select-ui.ts`: authoritative home selection owns `upcomingSelection`, localized rendering and no-start guard, and publishes the selected preview ID to the existing `world` renderer via a narrow interface.
- `src/locales/ui.ts`: both supported languages for statuses, hints and all five map notes.
- `src/style.css`: responsive fixed CTA widths and coherent selectable card styling. No new runtime dependency or `RACE_TRACKS` modification.
- `src/upcoming-showcase.ts` + `src/world.js`: GPT 6 owns dedicated live showcase stage using existing renderer, car models, camera, jet/VFX and scene switching like `garage-stage.ts`; it must dispose GPU resources and pause when hidden.
- **One 3D scene chat per map:** the five independent branches `feature/epic-home-art-<id>` each own `src/upcoming-scenes/<id>.ts`, `tests/upcoming-<id>-scene.test.js`, their map's `docs/designs/new-tracks/home-art/<id>.md`, and optionally their existing one JPEG thumbnail. Shared renderer/vehicle/camera integration belongs solely to GPT 6. Import only the verified scene/test/art blobs; never overwrite shared UI code from an older art branch.

## Verification / acceptance

1. Node test: five exact planned Stage 1 IDs, Stage 2 excluded, no `raceTrack` registration, saved unlock cannot bypass Coming Soon.
2. Browser test: choose each card; `aria-pressed=true`, distinct **actual animated WebGL 3D environment** (not a JPEG overlay), true player/rival car pose, planned length, disabled CTA, fixed phase `ready` even on Enter; select a playable card and verify its original animated race preview returns.
3. Browser i18n: English and Traditional Chinese status, teaser names and CTA. Width must not change on language switch. Keep font legible and touch target size stable.
4. Browser home layout: switching and end-of-race return maintain old-course visibility/focus when new cards follow the last existing course.
5. Capture at least **two real WebGL frames separated in time per map**, proving map-specific motion and Reduced Motion behavior; compare scene landmarks, road/air split, vehicle scale and camera against both source JPEG views. Run `npm test`, `npm run typecheck`, `npm run build`, `npm run test:layout`, `make verify`, exact-HEAD full CI and real browser desktop 1440×900 / mobile 390×844 review. **Do not mark these verified unless actually executed and logged**.
6. **The animated 3D homepage showroom is required NOW as Stage 1 home UI acceptance.** Full playable race geometry/physics/AI remains a later phase with separate [concept-to-WebGL acceptance](../../designs/new-tracks/visual-acceptance-gate.md); a JPEG, a screenshot or a picture-plane does not count as an animated homepage scene.

**Scope restriction:** Do not merge into `develop`, `main`, open a PR, deploy or force push without separate authorization.
