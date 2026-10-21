# Skyline Rush — Claude Code Project Instructions

## Project context

Skyline Rush is a browser-based 3D arcade racing game built with Vue 3, Vite, Three.js, and native JavaScript modules. Gameplay simulation lives in `src/game.js`; rendering, effects, and camera work live in `src/world.js`, `src/effects.js`, and `src/aero-vfx.js`. UI is in `src/App.vue`, `src/main.js`, and `src/style.css`.

- Require Node.js >= 22.12.
- Preserve existing tracks, touch controls, NITRO/FLY/BOOST, saved race history, Garage paints, and browser support.
- Prefer incremental changes with deterministic unit tests and browser regression coverage.

## Local development vs. all-unlocked testing

Use these project-root commands:

| Command | Purpose |
| --- | --- |
| `make` or `make dev` | Normal localhost Vite development, respecting saved progression |
| `make dev-unlocked` | **Local-only all-unlocked Vite server** for testing tracks and Garage paints |
| `make dev-feature FEATURE=<name>` | Worktree of `origin/feature/<name>`, all-unlocked, HTTPS on localhost. Does not check out that branch here |
| `make test-unlocked` | Alias for `make dev-unlocked`; starts a server, **not** the test runner |
| `npm test` | Deterministic Node unit tests |
| `npm run build` | Production build with a release-bundle safety assertion |
| `npm run test:browser` | Playwright browser suite; its pretest builds production assets |
| `make run` | Unit + browser tests |
| `make deploy` | Trigger the existing CI-based GitHub Pages deployment for remote `main` |

All-unlocked preview exposes every entry currently defined in `RACE_TRACKS` and `PAINTS`. It does **not** award actual achievements, fill scoreboards, grant NITRO, or change saved progress. Do not set or overwrite `localStorage` to simulate paid entitlements or create persistent full unlocks.

### Mandatory build-time separation

The test-only unlock implementation **must not ship to production**:

- `src/main.js` imports a stable `@progression-access` module.
- `vite.config.js` resolves it to `src/access/production.js` for normal development and release builds.
- `make dev-unlocked` uses `vite.unlocked.config.js`, resolving it instead to `src/access/dev-unlocked.js` **only while serving localhost**.
- `vite.unlocked.config.js` must continue to reject `build` commands.
- `npm run build` must continue running `scripts/assert-production-locked.mjs` to check the emitted `dist/` assets.

Do **not** replace this separation with runtime `if (dev)`, URL/query parameters, `import.meta.env` flags, browser console commands, or a publicly shipped toggle. Keep CI, releases, GitHub Pages, and all distributable assets on the production configuration. Do not make the dev-unlocked alias available via a production or publicly accessible preview build.

When changing unlocks, content catalogs, aliases, build scripts, or Vite configuration, verify both the standard and local modes, and inspect the production bundle for leakage. The release check is a guardrail; it is not an authorization system.

**Important commercial security boundary:** Current race progress and cosmetic unlocks are client-side, with `localStorage` persistence. They can be modified by users; removing the developer bypass from the bundle **does not make paid content secure**. Before monetizing maps, cars, cosmetics, or other content, implement authenticated server-side entitlement checks and server-side purchase verification. Do not treat client-side storage, obfuscation, tree-shaking, or build flags as payment enforcement.

See `docs/local-unlocked-testing.md` for operational details.

## Verification and documentation

- Run `npm test` and `npm run build` for gameplay, progression, or build-configuration changes.
- Run `npm run test:browser` when changes affect rendering, navigation, controls, or unlock visibility. Inspect desktop and mobile behavior where relevant.
- Never delete or weaken tests to make CI green. Report any test that could not be run.
- If `README.md` changes, keep `README.zh-TW.md` in sync using `scripts/readme-zh.mjs` (the existing pre-commit and Claude Stop hooks also enforce this).
- Do not claim GitHub Pages has deployed merely because a commit landed on `main`. Follow `.github/workflows/ci.yml` for publication rules.
