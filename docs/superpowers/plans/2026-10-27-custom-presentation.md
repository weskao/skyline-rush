# Custom Presentation Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans with test-driven-development.

**Goal:** Custom/Free cosmetic presets and compatible Custom best-run Ghosts without changing stored race identities.
**Architecture:** Existing session presentation boundary, typed Ghost lifecycle service and Vue selector; reuse the world renderer's sky/fog/exposure and bounded weather mesh.
**Tech Stack:** Vue 3, strict TypeScript, Three.js, Node tests and Playwright; no new dependencies.
**Spec:** `docs/superpowers/specs/2026-10-27-custom-presentation-design.md`

## Global Constraints

- Work only in `feature/custom-race-presentation`; no changes to other worktrees.
- Preserve `race.config`, stable keys, Classic/Daily rules and controls.
- No frame-loop Vue writes, per-frame allocations, new shaders or light-count changes.
- Do not commit, push, merge or deploy; parent owns final gates.

## Review Focus

- Legacy mode Ghost keys remain readable after selecting weather.
- Custom stage replays record heat time, never aggregate time.
- Corrupt/blocked storage does not stop racing.
- Retry keeps the preset, track/Classic selection resets it.
- Photo mode restores the active race theme and original camera afterward.

### Task 1: RED

- [ ] Add constructor regression showing presentation argument is honored without changing config.
- [ ] Add browser regression for visible Custom theme controls and a seeded compatible Custom Ghost.
- [ ] Run unchanged implementation and preserve expected failures.

### Task 2: Shared boundaries

- [ ] Extend `game.js:createRace` with an optional presentation argument, validated by existing race-session service.
- [ ] Test-first `race-ghosts.ts`: existing storage/caches, per-race traces, Classic/Time compatibility, Custom fastest heat traces.
- [ ] Test-first typed visual-style application and reset; no repeated writes when unchanged.

### Task 3: UI and renderer

- [ ] Add typed Vue preset component/controller and bilingual active-setting copy; wire selections through session presentation.
- [ ] Extract main Ghost wiring to the service; preserve retry/next-stage presentation.
- [ ] Apply scene themes only when changed and reuse precipitation; retain photo overrides.
- [ ] Run focused units, full units, typecheck, build, focused browser/renderer regression and screenshots; record pending full gates in TODO.
