# Garage VFX release strategies and production safety

## Purpose

The Garage contains two distinct state machines. **Release mode** decides which feature code may be shipped. **Skin entitlement state** decides whether a specific item is Locked, Trial, Owned or Equipped. Changing the former must never create, change or destroy the latter; PAINTS star progression is independent.

| Build mode | Studio section | Trial/equip | Distributable |
| --- | --- | --- | --- |
| `coming-soon` | Localized “即將推出 / Coming soon” placeholder | Disabled; preserves PAINTS | Only locked component and neutral palette; no trial controller, selected artwork or private assets |
| `trial` | Live VFX catalog and safe Preview/Try actions | Session-only, account-scoped; no permanent ownership grants | **Approved for a public free-trial milestone**, after release gates pass |
| `released` | Live VFX catalog | Only already-owned or default cosmetics can equip; no free trial | Intended only after genuine backend entitlement checking and separate release approval |

## Architecture (Strategy, Adapter, SOLID)

- **Strategy pattern:** `scripts/garage-release-build.mjs` selects one of three build modes. `vite.config.js` resolves `#garage-skin-ui`, `#garage-skin-runtime`, `#garage-skin-palette` and `#garage-release-config` to distinct implementations. A production Coming Soon build does not load the trial catalog or runtime even as an unreferenced dynamic chunk.
- **Dependency inversion:** `GaragePanel.vue`, `garage-ui.ts` and `aero-vfx.js` consume only the alias contracts rather than importing a particular trial implementation. `package.json#imports` lets native Node tests use the live implementation while Vite resolves the reviewed target.
- **Single responsibility:** the UI displays availability, the trial/session controller manages temporary selections, the palette supplies shader-only presentation, and the build selector decides what is distributed.
- **Open/closed:** new release phases can be added by a new strategy module and explicit allowlist entry, rather than rewriting race physics. No factory hierarchy or new dependency.
- **Interface segregation:** the disabled strategy provides only no-op account/selection callbacks and neutral skin IDs. It has no purchasing, grants or storage writes.

## Quick local checks

```bash
npm run dev                              # development default = trial
npm run build                            # local/CI production default = coming-soon (fail-closed)
GARAGE_VFX_RELEASE_MODE=coming-soon npm run build
GARAGE_VFX_RELEASE_MODE=trial npm run build
GARAGE_VFX_RELEASE_MODE=released npm run build
npm test                                 # Node contract and release-mode tests
npm run test:browser                     # builds a separate trial artifact for browser tests
```

Unknown/empty mode strings fail Vite configuration. **Do not use query strings, localStorage, cookies or remote-config flags to unlock unpublished code.** `npm run build` checks compiled JS/CSS and removes the unpublished `public/feature-assets/garage-vfx-skins` directory for the locked build. `scripts/assert-production-locked.mjs` fails if a locked artifact leaks known trial code markers or the asset directory. Unit CI executes the production build audit; browser CI builds and checks the trial variant separately.

## Public trial rollout — approved 2026-11-02

The approved release direction is **free cosmetic try-on**, not purchase, checkout, permanent unlock or a payment trial. `.github/workflows/ci.yml` now explicitly pins `deploy.env.GARAGE_VFX_RELEASE_MODE: trial` **on this feature branch**, ready to be merged only after verification. Default `npm run build` stays `coming-soon` for fail-closed unit/locked-artifact testing; an explicit `GARAGE_VFX_RELEASE_MODE=trial npm run build` builds the release candidate and the artifact audit checks that the catalog and trial artwork exist. This is a reviewed *build-time* deployment strategy, not a query-string or localStorage unlock.

**User-facing terms:** All 22 cosmetic selections may be previewed; non-default unowned effects can be temporarily equipped with **Try free / 免費試用**. A trial remains active in this **current app page session** (not a 24-hour or seven-day offer), then temporary equipment resets on reload/new session or account switch. It never writes an owned grant, wallet amount, purchase, payment, trial entitlement or automatic persistent upgrade to Cloud Save. Regular star-unlocked PAINTS remain unchanged. A user may open the Garage and try again during a new visit; no pricing, deadline or scarcity is implied.

**Release gates still required:** Full exact-HEAD CI on the feature branch, true 3D WebGL and phone UI sign-off, nontransactional session/account/reload tests, approval of the final feature integration into `develop`, full `develop` and `main` CI, then a separate explicit public release/deploy action. Editing the mode here does **not** publish the live website. No purchase/checkout/payment SDK is enabled. Do not publish the current test/staging bundle. Returning `deploy.env.GARAGE_VFX_RELEASE_MODE` to `coming-soon` is a rollback for a **future newly built** artifact; it cannot erase files that were already downloaded or cached.

 Returning to `coming-soon` removes the trial modules from the *newly built* public bundle; it is not a mechanism for erasing assets already cached/downloaded from an earlier deployment. Never ship confidential materials as client assets.

## Security boundaries and limitations

1. Vite aliases plus the output audit reduce accidental code exposure, **not an access-control guarantee** for functionality already released to a browser.
2. No client flag, token in JS, disabled button, local clock, or obfuscated WASM can prove real-money ownership. A released entitlement is authoritative only after authenticated server-side validation with Firebase Security Rules/Cloud Functions and account-bound purchases/inventory. This project does **not yet integrate such a permanent skin entitlement backend**. Until that exists, `released` leaves non-default skins Locked rather than granting them.
3. Temporary trials are cosmetic-only and cannot change race speed, progression, PAINTS ownership, Cloud Save grants or purchases. Account switching and expiry revoke the temporary visual choice. Revalidate on every privileged server operation.
4. Production-distributed shaders shared with the base race are still public because the racing game itself needs them. The guarantee is **no unreleased catalog/trial/skin IDs/approved art in the locked build**, not that public gameplay implementation can be made secret.
5. Run `npm run build` with a clean `dist` for the intended mode before deploying; inspect artifacts, do not trust stale files or a previously green SHA.

## Tests

- `tests/garage-release-build.test.js`: fail-closed local default, opt-in Pages trial pin, mode selection, no diagnostic leaks, trial artifact completeness.
- `tests/garage-skin-session.test.js` and `tests/garage-skin-runtime.test.js`: trial expiration, account separation and owned-vs-temporary distinction.
- `tests/garage-vfx-catalog-browser.spec.js` and `tests/garage-skin-trial-browser.spec.js`: actual trial-build UI.
- Existing original PAINTS, Garage Studio, shader warmup, performance and World Tour regressions must stay green.

**Status:** Work is committed on the feature branch. Passing the branch's latest CI and reviewing real device/WebGL results remain required before calling Phase B complete. Do not check off TODO items or merge/deploy without acceptance.

## Garage VFX build-time release contract

Garage cosmetic **release mode** is independent of owned/trial/equipped inventory and PAINTS progression. Keep `coming-soon`, `trial` and `released` strategies documented in `docs/garage-release-policy.md`. Use Vite `#garage-*` aliases from `scripts/garage-release-build.mjs` and stable port contracts: do not use direct live-module imports from public entrypoints or query/localStorage runtime unlocks. Production `npm run build` defaults to the locked coming-soon UI and must pass the compiled JS/CSS and artwork leakage audit; the Pages deploy job must pin an explicitly reviewed `GARAGE_VFX_RELEASE_MODE`. `npm run test:browser` deliberately builds trial mode, so never deploy its `dist`. A client cannot be an entitlement authority: require server-side account-bound validation and Firestore Security Rules/Cloud Functions before shipping permanent ownership. Keep account-switch, trial-expiry, shader resource and release-mode tests green; do not weaken the release gate to make CI pass.
