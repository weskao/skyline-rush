---
paths:
  - "vite*.config.js"
  - "src/main.js"
  - "src/access/**"
  - "scripts/assert-production-locked.mjs"
  - "scripts/dev-feature.mjs"
  - "Makefile"
  - "tests/access-build.test.js"
  - "tests/dev-feature.test.js"
---

# Test-only unlock must never ship

Mechanism (keep every link intact):

- `src/main.js` imports `@progression-access`.
- `vite.config.js` resolves it to `src/access/production.js` (dev and release).
- `vite.unlocked.config.js` resolves it to `src/access/dev-unlocked.js`, serves localhost only,
  and must keep rejecting `build`.
- `npm run build` runs `scripts/assert-production-locked.mjs` against `dist/`.

Forbidden replacements: runtime `if (dev)`, URL/query params, `import.meta.env` flags, console
commands, any shipped toggle, exposing the unlocked config via a public preview build.

All-unlocked preview only exposes `RACE_TRACKS` and `PAINTS` entries; it must not award
achievements, fill scoreboards, grant NITRO or change saved progress. Never set or overwrite
`localStorage` to fake entitlements or persistent unlocks.

After changing unlocks, catalogs, aliases, build scripts or Vite config: verify standard and
unlocked modes, inspect the production bundle for leakage.

Security boundary: progress and cosmetics are client-side `localStorage`; the release check is
a guardrail, not payment enforcement. Monetized content needs server-side entitlement and
purchase verification.

Details: `docs/local-unlocked-testing.md`.
