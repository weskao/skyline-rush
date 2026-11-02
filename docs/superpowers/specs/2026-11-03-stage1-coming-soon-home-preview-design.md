# Stage 1 Coming-Soon Home Preview — Design and Integration Contract

**Status:** Shared home UI implementation on `feature/epic-multiroute-longform-tracks`; browser/CI visual evidence is a separate verification gate.
**Date:** 2026-11-03
**Parent references:** [Stage 1 five-track image gallery](../../designs/new-tracks/README.md), [Concept → WebGL gate](../../designs/new-tracks/visual-acceptance-gate.md).
**Parallel art assignments:** [five isolated GPT chat briefs](../prompts/2026-11-03-stage1-home-teasers-parallel.md).

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

## Image/layout UX

- One JPEG preview and one route SVG per upcoming track are available in `public/track-teasers/<id>.jpg` and `<id>-route.svg`. These currently reuse already committed reference art, without re-encoding; they are illustrative images, **not a live Three.js track or actual WebGL screenshot**.
- The selectable card uses the same size/spacing as the playable card and a cool/cyan planned-state treatment. It is not dimmed like a campaign-locked card. Its `aria-pressed` can be true even though `start-button` is disabled.
- On selection, the hero preview shows a still image over the existing live rendering without recreating `Race`. The user sees a localized planned route length, a clear Coming Soon note and optional route sketch. The main `#world` canvas continues to represent the last playable course underneath, never the unfinished map.
- Desktop/mobile and portrait/landscape layouts retain accessible 44px tap targets; reduced-motion never forces a teaser image animation. Images are not focus targets, and decorative images have empty alt labels because card names and route notes already supply accessible text.
- Switching from an upcoming concept to an existing playable track, changing race mode, or starting a Daily Challenge clears preview-only selection. No preview ID is written to existing best-time/last-raced-track storage or sent to cloud.
- A localized UI refresh re-renders card names, statuses, track note, route length and primary CTA without creating an unfinished Race.

## Architecture and ownership (SOLID / minimal)

- `src/upcoming-tracks.ts`: five static IDs, bilingual map names, target lengths, static image/route paths and a pure precedence function `homeTrackStatus`. In particular, a tampered unlock store **cannot** promote a concept map to playable.
- `src/App.vue`: declarative cards and one still-image overlay, no new custom Vue state or second renderer.
- `src/race-select-ui.ts`: existing authoritative home selection controller owns `upcomingSelection`, localized rendering and no-start guard.
- `src/locales/ui.ts`: both supported languages for statuses, hints and all five map notes.
- `src/style.css`: responsive fixed CTA widths and coherent preview card styling. No extra dependency; no `RACE_TRACKS` modification.
- **One art chat per map:** the five independent branches `feature/epic-home-art-<id>` own only `public/track-teasers/<id>.jpg` and their matching per-track documentation. Do not concurrently modify shared UI/locale code; integrate one verified image at a time.

## Verification / acceptance

1. Node test: five exact planned Stage 1 IDs, Stage 2 excluded, no `raceTrack` registration, saved unlock cannot bypass Coming Soon.
2. Browser test: choose each card; `aria-pressed=true`, correct preview JPEG, planned length, disabled CTA, fixed phase `ready` even on Enter; select an original playable card and verify Start Race restores.
3. Browser i18n: English and Traditional Chinese status, teaser names and CTA. Width must not change on language switch. Keep font legible and touch target size stable.
4. Browser home layout: switching and end-of-race return maintain old-course visibility/focus when new cards follow the last existing course.
5. Run `npm test`, `npm run typecheck`, `npm run build`, `npm run test:layout`, `make verify`, exact-HEAD full CI, real browser desktop 1440×900 and mobile 390×844 screenshot review. **Do not mark these verified unless actually executed and logged**.
6. The later production five-map actual 3D implementation must separately satisfy [the concept-to-WebGL visual acceptance contract](../../designs/new-tracks/visual-acceptance-gate.md) before launch. Static JPG previews do not count as playable World Tour stage completion.

**Scope restriction:** Do not merge into `develop`, `main`, open a PR, deploy or force push without separate authorization.
