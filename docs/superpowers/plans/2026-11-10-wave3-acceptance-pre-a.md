# Wave 3 Prompt F — Pre-A browser acceptance handoff

Repository: https://github.com/weskao/skyline-rush

QA branch: `feature/wave3-demo-acceptance`
Pinned develop base: `64bfbf10188722d924ca3460e65b5fbf4620c7c0`
Pinned integration candidate: `85a7c4af4ddc35190c9ac2b23af6a25fdb4e94d8`
QA tests: `tests/wave3-early-access-browser.spec.js`

## Scope and evidence discipline

- **Pre-A only.** The current integration candidate contains F01/F02/F04 data, Store/Collection, result presentation, local snapshot/replay storage and artwork QA. It **does not** contain an interactive `GarageMissionBoard.vue` or Prompt A. The existing board says `Not tracking` and `data-rewards-authority=not-connected`.
- Active tests use the **actual app + trial build**, not the isolated `tests/fixtures/wave3-demo-store.html`. No calls to a synthetic `grantRace()` shortcut.
- `npm run test:browser` invokes `scripts/build-garage-browser.mjs` to build trial assets; default `npm run build` selects `coming-soon` and intentionally strips the demo.
- These are **test scenarios submitted for verification**. A GitHub Actions job with successful browser shards on the exact SHA is required before claiming any pass.
- `test.fixme` explicitly marks the two blocked final cases. Skipped cases **are not accepted**.

## Runnable pre-A scenarios

1. Guest: actual Garage, four mission cards, demo Store entry and separate real Store without sign-in or a Go service.
2. Negative wallet: 20 starter demo points cannot buy 25-point ion thruster; offline navigation into an empty collection, equip button disabled and no inventory grant.
3. Storage: corrupt JSON and unsupported future schema cannot restore forged balance or unlocks after reload.
4. RWD/i18n: 844×390 phone landscape, Traditional Chinese, keyboard Enter and missing ion artwork, screenshot captured; reduced-motion request enabled.
5. Race-mode safety: start an actual Free Drive and verify that merely starting practice does not mint a completion reward.

## Waiting for Prompt A + final activation

Before removing `test.fixme`, integration owner must:
- Merge the **tested Prompt A commit** into `feature/wave3-frontend-demo-integration` first; update QA branch from latest `develop` and then that **new pinned candidate HEAD**, rather than continuing to rely on the pre-A SHA.
- Expose real mission progress, claimable/claimed states and an accessible claim control on `GarageMissionBoard.vue`; keep `data-mission-id` stable.
- Update legacy `tests/garage-rewards-native-art-browser.spec.js` assertions that currently *require* the static unavailable board; preserve visual-art/safety assertions rather than deleting coverage.
- Complete the first fixme E2E using a **genuine playable race**, without `window.gameplay.race` distance forcing, synthetic demo receipts or privileged backend calls: Guest → eligible race → real results → one reward → Garage mission progress → one claim → points update → Store redeem → Collection equip → second race → reload → scoped reset.
- Complete the second fixme for repeated settlement/claim, insufficient points, account A/B isolation, blocked storage, offline use, missing art, supported vs unsupported modes, existing race record/PAINTS/Cloud Save isolation and paid-real-ownership falsehoods.
- Record real screenshots at 390×844, 844×390 and 1440×900, keyboard/screen reader status, VFX off/reduced motion. Real iPhone/Android/Mac Chrome WebGL/performance checks remain a **separate manual** gate.

## Verification commands / final go-no-go

```sh
node --test tests/module-size.test.js
npm test
npm run typecheck
npm run build
npm run test:layout
npm run test:browser
npm run test:cloud  # when emulator/Java requirements are present
make verify
```

Remote: push `[full-regression]` on the **QA branch**, inspect unit, browser shards, World Tour, cloud save and exact-HEAD `quality-gate`. Green `quality-gate` alone does not suffice if browser/World Tour are skipped. Check Playwright test artifacts, broken images, console errors and retries.

Do not update shared `TODO.md`, integrate into `develop`/`main`, open PRs or deploy during pre-A test preparation.
