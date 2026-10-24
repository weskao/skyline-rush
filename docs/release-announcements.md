# UX-Release-01 — 新版本功能公告 / What's New

> Status: **proposed specification, not implemented** (2026-10-24).
> Related: [TODO.md](../TODO.md) · [CHANGELOG.md](../CHANGELOG.md) · [CLAUDE.md](../CLAUDE.md) · [update-check.js](../src/update-check.js).

## 1. Goal / Non-goals

When a version of **Skyline Rush** with curated player-facing news is published, explain its major changes on the **home/ready** screen in a polished, dismissible announcement. Players can reopen the same information from the displayed build-version label. Work identically in **English / zh-TW**, desktop and mobile.

**This is a release-notes surface, not the existing stale-build reload prompt, device-quality notice, control guide, advertisement or remote push service.** No Firebase requirement, new dependency, third-party network call, game-rule change, forced login, fullscreen video or new persistent server state.

## 2. Existing architecture and boundaries

- `package.json` version is already displayed by `src/App.vue` as `v{{ version }}`; `scripts/release.sh` handles version/tag/release.
- `CHANGELOG.md` records developer-facing changes, often including CI, hooks and docs. **Do not display the raw changelog to players** or turn every commit into a card.
- `src/update-check.js` compares the served entry script with the loaded build, and stores a **sessionStorage** reload guard (`skyline-rush-reloaded-for`). Keep this separate from the proposed **localStorage** last-announced-version key.
- `src/App.vue` already uses native `<dialog>` for Guide, History, Garage and other screens; `src/main.js` owns dialog state/ready vs. racing; `src/i18n.js` and `src/locales/ui.js` provide live en/zh-TW translations. Reuse those patterns, existing button styles, motion tokens, and Web Audio cue policy.
- Preserve first-start tutorial and one-time quality notice. A new announcement must never interrupt countdown, racing, pause/results screens or an already-open dialog.
- The home intro has a fixed desktop height budget and must not scroll at ≥900px; **re-purpose the existing version label as the re-open entry** rather than inserting a new row of buttons.

## 3. Proposed UI

### Automatic desktop view (first eligible open)

- Native modal `<dialog id="whats-new-screen">` with a dimmed/soft-blurred **existing live 3D home preview behind it**, not a second Three.js canvas.
- Compact release tag: `SKYLINE RUSH / RELEASE NOTES`, a headline `WHAT'S NEW / 新版本功能`, the actual current version and release date; small `×` close control at top right.
- One **featured hero** with a screenshot or existing promotional image *if the curated entry has one*; otherwise a gradient/pattern using existing CSS. No extra network fetch, autoplay video or decorative WebGL renderer.
- Maximum **three curated highlight cards** (e.g. gameplay, tracks, quality-of-life). Each: category, short title, one-sentence benefit and optional image. Additional notes appear in a simple scrollable list. No carousel or tab framework in v1.
- Footer: **「繼續遊戲 / Continue」** closes only; the normal Start button keeps ownership of tutorial, unlock and game-start rules. A secondary `完整更新紀錄 / Full changelog` link may open the published GitHub CHANGELOG in a new tab. Never invent patch notes or unreleased features.
- Make the existing `vX.Y.Z` label keyboard- and pointer-operable (`查看更新 / What's New` accessible name) with a small dot/badge only when the current version has unread curated content.

### Mobile

- Same content, **single column**. Modal width `min(100vw - 24px, 560px)`, max-height `calc(100dvh - 24px - env(safe-area-inset-top) - env(safe-area-inset-bottom))`, scroll inside the dialog, buttons visible and never behind home bar.
- Hero is compact; text remains primary content and image may be omitted at 320×740 or short landscape.
- Respect 44×44 px minimum touch targets, text wrapping, large font/zoom, keyboard navigation and `prefers-reduced-motion`. Avoid blocking game controls in racing mode (automatic modal is not shown there).
- Portrait 390×844 / 320×740, landscape 844×390 and desktop 1440×900 must be checked.

### Text and audio

- UI copy and announcement summaries have **en / zh-TW variants**, responding to live language changes even when dialog is open.
- Standard CSS transform/opacity only (or instant/fade-only for Comfort/reduced motion). No animation every frame.
- No automatic fanfare or music interruption: release notes are informational and may appear before the browser grants audio playback. Existing muted/quiet `ui` confirmation cue is optional for explicit open/close interactions only; never rely on sound to communicate updates.

## 4. Release data (static, curated, local to the build)

Prefer a small imported manifest (for example, `src/release-notes.js`), not parsing `CHANGELOG.md` at runtime. One entry per **announced release**, with fields:

```js
{
  version: '0.21.0', // example only: must match package.json at publication
  date: '2026-10-24',
  highlights: [{
    id: 'ai-vehicle-collision',
    kind: 'improvement',
    title: { en: 'Fairer traffic collisions', 'zh-TW': '車輛碰撞更公平' },
    description: {
      en: 'AI cars use the same collision physics as your car.',
      'zh-TW': 'AI 車輛與玩家套用相同的碰撞物理。'
    },
    image: null
  }]
}
```

- Example describes a **verified 0.21.0 changelog change**; any future cards must be curated from the **actual shipped release**, not concept-art examples.
- Latest published package version is the single source of truth. Validate the manifest version/required translated fields when adding an announced release; skip automatic announcement if no entry exists for that version.
- Use `textContent`/Vue text bindings, never untrusted `innerHTML` for release descriptions. Relative screenshot paths must refer to files **included in production**; images are optional and failures fall back to text.
- Do not depend on GitHub APIs, Firebase or a content-management backend for release notes. Archive/history and automatic changelog-to-summary generation are deferred unless actual demand arises.

## 5. State and trigger contract

Storage:
- Suggested key: `localStorage['skyline-rush-whats-new-seen-v1'] = '<current package version>'`.
- This is a **device preference**, not a Firestore account save; clearing site data resets it. Storage exceptions must not block play.
- When storage is unavailable, keep an **in-memory once-per-page** marker; no repeated modal loop during the same page lifetime.

First load:
1. Determine current `package.json` version and curated release entry.
2. If the entry is absent, or seen-version exactly equals current version, **do not auto-show**. The existing version label may still open available notes manually.
3. If unread, queue the announcement for the **ready/home** state only. Defer behind any active `<dialog>`, interactive tutorial, and higher-priority first-run guidance. The existing quality-tier notice must not overlay this dialog; resume its eligible one-time notice afterwards if needed.
4. Show at most once per page automatically. **Record the current version as seen when the player dismisses using close, Escape, backdrop (if supported), or Continue**, not on a hidden/failed render. Manual reopen does not change eligibility or trigger more popups.
5. Do not open during countdown, race, pause, result or a WebGL-failure dialog. When returning to home, show pending content only if it is still unread and no other dialog is open. Never force a reload or discard an in-progress race.
6. If another tab updated the seen version, re-read it before opening automatically. If a stored value is malformed, treat it as unread without throwing. Equality (not lexicographic version comparison) is sufficient for the currently bundled release.

Manual entry:
- The current-version label on home can open the modal **even after dismissal** (provided notes exist).
- Close restores focus to the opener where possible; Escape closes the modal without starting/pausing a race. While open, game hotkeys/touch input must not leak through the modal.
- Opening notes manually during a paused race or from results is **not required** in v1; entry remains on the home screen.

Release/refresh interaction:
- `refreshIfStale` and its **sessionStorage reload-once** logic are unchanged. The release modal is evaluated after the refreshed app is usable, not while a stale JS bundle is running.
- Deployments without a new package version/curated manifest **do not auto-announce**. New version + translated announcement → auto-show once.

## 6. Acceptance criteria — implement with TDD later

The bullets below are **unchecked** until implemented and verified. Write a failing test before each code change, use existing native UI and tools, then run RED → GREEN → regression.

- [ ] **Pure state tests:** unseen current version → pending; same version → silent; different stored version → pending; missing notes → silent; corrupt/unavailable storage → safe fallback; no duplicate in one page.
- [ ] **Dialog lifecycle:** queued during game/dialog/tutorial → deferred; home-ready opens; close/X/Escape/Continue marks seen; manual re-open always works; no modal on subsequent reload for that version.
- [ ] **Storage isolation:** changing Firebase account never changes this local preference; do not confuse it with `skyline-rush-reloaded-for`; two tabs with current seen-version do not reopen automatically.
- [ ] **Release source validation:** current version ↔ manifest parity; both locales present; no missing assets or XSS via release copy; empty notes do not produce a blank popup.
- [ ] **Keyboard accessibility:** native modal traps focus, restores focus on close, does not leak driving keys, has labelled heading/close action and sensible reading order.
- [ ] **Browser tests:** 1440×900, 390×844, 320×740 and 844×390; real click/keyboard and live language switch; no covered CTA, unwanted intro scroll, overlapping native dialogs or race interruption.
- [ ] **Regression:** tutorial/guide, device-quality notice, stale-build reload, race controls, save/unlock/history, reduced motion and audio mute behavior remain unchanged.
- [ ] **Verification before marking done:** `npm test`, `npm run build`, `npm run test:layout`, `npm run test:browser`; actual iOS Safari / Android Chrome check when devices are available, and screenshots from the **real running game** (not concept art) for final approval.
- [ ] **Release gate:** update curated notes only when new features/benefits are verified and the new version is ready to publish; do not attach future/mock features to an actual release.

## 7. Implementation sketch and effort estimate

1. **0.5 day:** write state/manifest failing tests and the tiny pure gate; reuse `package.json` + native storage.
2. **0.5–1 day:** implement native modal in `src/App.vue`, minimal CSS in `src/style.css`, hook ready/home in `src/main.js`; reuse existing footer version link.
3. **0.5–1 day:** add en/zh-TW release copy and accessible/mobile browser tests; verify tutorial, active race and release reload interaction.
4. **0.5 day:** run regression suites, inspect real screenshots, adjust layout and document outcomes.

**Planning estimate: roughly 2–3 development days**, excluding release deployment and physical-device availability. Do not introduce a backend, new library, custom modal system, background polling or auto-generated unsupervised release copy.

## 8. Visual wireframe (concept, not implemented)

```text
  Desktop home / 1440×900 — preview continues behind a dim layer
  ╔════════════════════════════════════════════════════════════════╗
  ║ SKYLINE RUSH                                      [× close]     ║
  ║ RELEASE NOTES     vX.Y.Z · YYYY-MM-DD                          ║
  ║ WHAT'S NEW / 新版本功能                                        ║
  ║ ┌────────────────────────────────────────────────────────────┐ ║
  ║ │   Optional track / vehicle image from the released build  │ ║
  ║ └────────────────────────────────────────────────────────────┘ ║
  ║ [TRACKS]    Released feature + clear 1-line benefit            ║
  ║ [GAMEPLAY]  Released feature + clear 1-line benefit            ║
  ║ [IMPROVED]  Actual change + short explanation                   ║
  ║                                    [Continue / 繼續遊戲]        ║
  ╚════════════════════════════════════════════════════════════════╝
  Home footer: [vX.Y.Z · 查看更新]  ← manually reopen notes
```

The concept visualization should not be treated as an actual browser screenshot or as proof that mocked features are shipped.
