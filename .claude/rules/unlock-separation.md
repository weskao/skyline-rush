---
paths:
  - "vite*.config.js"
  - "src/main.js"
  - "src/access/**"
  - "src/car-catalog.ts"
  - "src/garage-car-actions.ts"
  - "src/garage-skin-runtime.ts"
  - "src/Wave3DemoStore.vue"
  - "scripts/assert-production-locked.mjs"
  - "scripts/*garage*.mjs"
  - "src/garage-release-*.ts"
  - ".github/workflows/ci.yml"
  - "scripts/dev-feature.mjs"
  - "Makefile"
  - "tests/access-build.test.js"
  - "tests/dev-feature.test.js"
---

# Test-only unlock must never ship

Mechanism (keep every link intact):

- `src/main.js` imports `@progression-access`.
- `vite.config.js` resolves it to `src/access/production.ts` (dev and release).
- `vite.unlocked.config.js` resolves it to `src/access/dev-unlocked.ts`, binds localhost by default,
  and must keep rejecting `build` and `preview`.
- The unlocked config selects the full local Garage catalog, the in-memory selection store
  and the Store equip button through Vite. Standard and production builds resolve the normal
  package imports, even when the public trial is enabled.
- `pnpm run build` runs `scripts/assert-production-locked.mjs` against `dist/`.

Forbidden replacements: runtime `if (dev)`, URL/query params, `import.meta.env` flags, console
commands, any shipped toggle, exposing the unlocked config via a public preview build.

Keep eligibility catalog-driven. New entries in `CARS`, `PAINTS` and `GARAGE_SKINS` must
equip through the shared paths in the unlocked server, including at race start. The Store's
playtest action uses the same equipment path and leaves balances, demo inventory and ownership
alone. Test vehicle, paint and VFX picks live in memory. Never write test unlocks, fake
achievements, scores or entitlement grants to saved progress.

After changing unlocks, catalogs, aliases, build scripts or Vite config: verify standard and
unlocked modes and inspect both the locked and public trial production bundles for leakage.

Security boundary: progress and cosmetics are client-side `localStorage`; the release check is
a guardrail, not payment enforcement. Monetized content needs server-side entitlement and
purchase verification.

Details: `docs/local-unlocked-testing.md`.

Garage cosmetics release mode, `GARAGE_VFX_RELEASE_MODE` or the Pages deploy pin
→ Read `docs/garage-release-policy.md`.
