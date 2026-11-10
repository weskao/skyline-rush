# Track Lifecycle SOP

This workflow is for all current and future Coming Soon courses. Production and ordinary `make dev` **must not enter** a course until the course is intentionally released through a reviewed catalog change. Never use a saved unlock or URL as a substitute for stage approval.

## Stages and required gates

| Stage | Meaning | Allowed START | Gate |
| --- | --- | --- | --- |
| `preview` (default) | Art, routes and environment only | Never | P1–P6 + P7 browser view matrix |
| `development` | Runtime being implemented | Never | Preview gates + runtime module |
| `playable` | START → FINISH works locally | Only `make dev-unlocked` / `make dev-feature` | D1–D3 + full regression evidence |
| `ready` | All functional, performance and visual evidence accepted | Local unlocked only | R1–R6 each ticked with real commit SHA |
| released | In `RACE_TRACKS`, not `UPCOMING_TRACKS` | Normal released access | User approval + release command + complete catalog migration |

Run `node scripts/check-track-lifecycle.mjs --stage <id>` to see the declared stage and missing next gates. Run `node scripts/check-track-lifecycle.mjs` for all automatic gates. It is enforced through `tests/track-lifecycle.test.js` as part of `npm test` once the collector, asset dimensions and CI gate are all integrated.

### Preview gates P1–P7

P1: exact 568×205 JPEG; P2: SVG route; P3: registered Three.js environment; P4: English and zh-TW names; P5: production access and stale unlocks are blocked; P6: home status always Coming Soon; P7: browser regression verifies every Coming Soon car view on desktop and phone.

### Development gates D1–D3

D1: race registered for all ordinary modes (Classic, Custom, Free, Time, Gauntlet, Checkpoint, Cup, Stunt, Elimination and Endless) in local-unlocked development, but not Circuit (the separate Harbor course), Daily or the released catalog. D2: `tests/<id>-race.test.js` and `tests/<id>-race-browser.spec.js` exercise START→FINISH. D3: development access accepts the registered playable course; production still does not.

### Ready evidence R1–R6

Every line in `docs/track-lifecycle/<id>.md` must be ticked with a genuine `sha:` (7–40 hex characters). Do not tick based on a plan or another device.

- R1: desktop/phone real WebGL START→FINISH including every branch/flight edge
- R2: collisions, eight rivals, recovery, result and save
- R3: p50/p95 performance on desktop and phone, Low/Medium/High
- R4: `make verify` at recorded SHA
- R5: exact-HEAD full quality-gate CI and run URL
- R6: user's explicit visual sign-off for race and Coming Soon card

### Releasing (manual approval required)

1. The user personally ticks `- [x] RELEASE APPROVED: <id>` under `## Track release approvals` in `TODO.md`. An agent must **never** add or tick that approval.
2. Confirm `ready` and R1–R6, then run `node scripts/check-track-lifecycle.mjs --release <id>` to validate and stamp `released-at: <HEAD SHA>` in the record.
3. In a reviewed release change, remove the id from `UPCOMING_TRACKS` and `UPCOMING_READINESS`; add it to `RACE_TRACKS` and unlock order, Daily, Cup, medals and stars. Migrate topology-keyed results, update the normal home preview and release notes, remove the Coming Soon environment.
4. Run TDD and full desktop/mobile/browser/regression, get exact-HEAD `quality-gate` PASS, request separate authorization before merging `develop` or deploying. No PR, `main` push, or deployment without authorization.

## Evidence record template

```md
# <English name> lifecycle record
stage: preview

- [ ] R1 Desktop and phone complete real WebGL driving — sha:
- [ ] R2 Collision, AI, recovery, results and save — sha:
- [ ] R3 FPS p50/p95 at Low/Medium/High — sha:
- [ ] R4 make verify — sha:
- [ ] R5 Exact-HEAD quality-gate CI — sha:
- [ ] R6 User's manual visual approval — sha:

released-at:
```

Use repo-relative paths only. Fail closed when evidence or approvals are missing. Preserve existing 10 released tracks and all existing controls.