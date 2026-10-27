# Incremental Vue / JS type-checking refactor — design (2026-10-25)

## Intent
Reduce imperative UI coupling and per-frame DOM work without changing gameplay, Three.js render cadence, scene composition, accessibility, bilingual labels, controls, or Firebase behavior.

## Constraints
- Follow TODO.md "Codebase structure" steps 1–4. Step 0 already established the architecture rules.
- Keep game.js, world.js, simulation, camera loop, WebGL, speedometer and in-race HUD plain JavaScript; no big-bang TypeScript rewrite.
- New UI components must reuse existing selectors/ARIA behavior until browser regressions are green.
- Maintain test-first RED → GREEN → refactor. A step may be checked only after tests and CI prove it.
- Commit each independently verifiable step and preserve locale switching, keyboard, pointer and touch interactions.
- Keep optional ESLint deferred unless tooling earns its cost.

## Approach and tradeoffs
Chosen: incremental seams with move-only splits, a thin tested HUD DOM writer, opt-in checked JS with shared JSDoc contracts, and progressively Vue-managed event-driven panels. This minimizes runtime risk while exposing measurable ownership boundaries.
Rejected: one-shot Vue/TS rewrite (too broad for current regression coverage), and reactive per-frame HUD (unnecessary overhead).

## Verification
Node unit tests, production build, Playwright desktop/mobile, World Tour, Cloud Save, layout tests for home-screen changes, and exact-commit GitHub quality-gate. Hardware Safari/iPhone/Android acceptance is tracked separately, never implied by emulation.
