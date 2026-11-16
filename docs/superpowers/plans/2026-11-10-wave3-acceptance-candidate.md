# Wave 3 Prompt F — QA candidate after Prompt A integration

Repo: https://github.com/weskao/skyline-rush
QA: `feature/wave3-demo-acceptance`
Integration source: `feature/wave3-frontend-demo-integration@310744a7b83ae7d63acbb388ea67bb0a592c6652`
Prompt A source: `feature/wave3-demo-missions@0f9023c31f841b19d24d223a3b80aeab589c8f3d`
Frozen contract: `3a5ff9378667a53f23f17134c4d0f2cbaafb83d4`
Develop base: `64bfbf10188722d924ca3460e65b5fbf4620c7c0`

## Scope

- All Prompt A owned files were integrated **by the sole integration owner** before the QA candidate was refreshed.
- F01 port now routes eligible F02 events to both core and UTC daily/weekly missions in the SAME snapshot; checkpoint restoration derives period boundaries from the persisted timestamp and refuses invalid grants. Old F01-only checkpoint is accepted with period counters initialized to zero.
- A live Garage board is build-selected for `trial` only. The prior unchanged static mission UI is retained as `GarageMissionBoardLocked.vue` for `coming-soon` and `released`. Neither public mode imports the trial wallet/Store/claim UI.
- `tests/garage-rewards-native-art-browser.spec.js` and A's browser spec were updated to assert the live demo state without removing native image/fallback assertions.
- Existing test harness `npm run test:browser` builds trial Vite assets. The default production build must remain locked.

## Added E2E tests

`tests/wave3-early-access-browser.spec.js`: 8 active browser scenarios, **no test.fixme** in the submitted candidate:
1. Actual signed-out guest opens Garage, Missions and Demo Store with Firebase API failures simulated.
2. Offline guest insufficient balance and empty Collection, with no permanent inventory.
3. Corrupt JSON/future-schema local demo cache fails closed after reload.
4. 844×390 Traditional Chinese, keyboard activation, optional missing image and reduced motion.
5. Actual Free Drive starts and earns no demo completion reward.
6. **Long, real playable 5 km Time Attack** (no distance/elapsed patching) → actual result/first receipt → reload → live daily mission claim → once-only credit → Store redemption → Collection equip → second race starts → reload retains only disposable state → reset without deleting history.
7. Actual Garage Store/mission UI does not expose paid entitlements or stale claim controls.
8. 390×844 portrait accessibility and Screenshot artifact.

`tests/wave3-acceptance-guards.test.js`: 3 deterministic regression cases for guest/A/B checkpoint dedupe/account separation/reset, storage blocked/future schema, and real Store fail-closed.

`tests/wave3-missions-integration.test.js` lives in integration candidate: 4 unit cases for shared port + daily/weekly progression, UTC rollover and old F01 checkpoint.

## Exact-HEAD verification gates

These are **not marked passed just because source code or tests have been committed**. Only observed output from these commands and GitHub Actions may be counted:

```sh
node --test tests/module-size.test.js
npm test
npm run typecheck
npm run build
npm run test:layout
npm run test:browser
npm run test:cloud
make verify
```

GitHub full-regression uses commit message marker `[full-regression]` and must show all browser and World Tour shards as SUCCESS (not skipped). Compare run `head_sha` with the reported QA SHA and check artifacts for `wave3-real-race-result.png`, `wave3-collection-equipped.png`, portrait and landscape screenshots.

The CI environment may fail or time out on the 5 km real-race scenario; it must be fixed, or documented as an acceptance blocker, **never disabled or silently switched to synthetic race completion**.

Separate manual evidence remains required for physical iPhone, Android and Mac Chrome WebGL / input/performance. A CI viewport alone is not an actual phone. Browser test screenshots are evidence only after the matching run completes.

No PR, deployment, `develop` merge or `main` merge is authorized.
