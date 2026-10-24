# UX-Release-01 — 新版本功能公告 / What's New

> Status: **implemented on `feature/whats-new-release-announcements`** (2026-10-25).
> Related: [TODO.md](../TODO.md) · [CHANGELOG.md](../CHANGELOG.md) · [CLAUDE.md](../CLAUDE.md) · [update-check.js](../src/update-check.js).

## Player-first copy policy (binding)

Every displayed title, description, category and summary must be natural, **non-technical
player-facing copy**, in both English and Traditional Chinese. Explain what players get to
experience, not what developers changed internally. Never show CI, TDD, Firestore, shader,
database, refactor, schema or file names in an in-game announcement, and never link players
out to the developer CHANGELOG from the dialog. This policy is also recorded in `CLAUDE.md`
for all future releases.

## 1. Goal / Non-goals

When a version of **Skyline Rush** is published, explain what changed for players on the
**home/ready** screen in a polished, dismissible dialog. Players can reopen it from the
build-version label and browse the **newest five releases** without leaving the game. Works
identically in **English / zh-TW**, desktop and mobile.

**This is a release-notes surface, not the stale-build reload prompt, device-quality notice,
control guide, advertisement or remote push service.** No Firebase requirement, new
dependency, third-party network call, game-rule change or backend.

## 2. Existing architecture and boundaries

- `package.json` version is displayed by `src/App.vue` as `v{{ version }}`, which doubles as the
  re-open entry (no new row of home buttons; the intro height budget is fixed).
- `CHANGELOG.md` records developer-facing changes. **Do not display it to players** or turn every
  commit into a card; curate player notes from what actually shipped.
- `src/update-check.js` keeps its own **sessionStorage** reload guard (`skyline-rush-reloaded-for`),
  separate from the **localStorage** seen-version key below.
- Native `<dialog>`, `src/i18n.js` / `src/locales/ui.js` live translation, existing button styles
  and motion tokens are reused. The dialog never interrupts countdown, racing, pause/results,
  the tutorial or another open dialog.

## 3. UI

- Native modal `<dialog id="whats-new-screen">` over the dimmed live 3D home preview.
- Header: `SKYLINE RUSH / RELEASE NOTES`, headline `What's new / 新版本功能`, one intro line and a
  round `×` close button.
- **Version switcher**: a WAI-ARIA `tablist` with one tab per release, newest first, at most
  `RECENT_RELEASE_LIMIT` (5). The newest tab is labelled `Latest / 最新`, older tabs show their
  date. Click, ←/→ (wrapping), Home and End switch versions; the panel fades in (instant under
  reduced motion). On narrow screens the tab rail scrolls sideways with snap; each tab is ≥ 44 px.
- **Panel** per release: optional hero image, version + localized date, and one card per
  highlight with a kind badge (`New / 新功能`, `Improved / 改進`, `Fixed / 修正`, colour-coded).
- Footer: only **「繼續遊戲 / Continue」**, sticky at the bottom of the scrolling dialog so it stays
  reachable on short landscape phones. No changelog link.
- Mobile: single column, `--rp` 16 px padding, compact hero; at ≤ 420 px tall the hero and intro
  hide. Checked at 1440×900, 390×844, 320×740 and 844×390.
- Audio: none. The home menus are silent and the notes are informational; no sound is the only
  carrier of any information.

## 4. Release data — `src/release-notes.js`

One frozen entry per **published** version, never generated from commits:

```js
{
  version: '0.21.0',
  date: '2026-10-24',
  image: { en: 'og-image.en.jpeg', 'zh-TW': 'og-image.zh-TW.jpeg' }, // optional, or null
  highlights: [{
    id: 'traffic',
    kind: 'improvement', // 'new' | 'improvement' | 'fix'
    title: { en: 'More natural racing traffic', 'zh-TW': '競速車流更自然' },
    description: { en: '…', 'zh-TW': '…' },
    image: null // optional per-highlight image
  }]
}
```

- **History is kept**: every published entry and its images stay in the repo. The dialog shows the
  newest five whose version is ≤ the running `package.json` version; older ones remain archived
  (and still validated) but are not displayed. A version written ahead of its release stays hidden
  until that version ships.
- **Images**: optional, only when a picture makes the change easier to understand. Store them in
  `public/whats-new/<version>/` (e.g. `public/whats-new/0.22.0/new-track.en.webp`), reference them
  relative to `public/`, localize per language when they contain text, and never delete an old
  release's images. A missing image falls back to text.
- Text is rendered with `textContent` only.

## 5. State and trigger contract

- Key: `localStorage['skyline-rush-whats-new-seen-v1'] = '<newest version the player has seen>'`,
  a device preference (not a Firestore save). Storage errors never block play; when storage is
  blocked the dialog never opens by itself (it could not remember the visit and would cover Start on
  every load), but the version label still opens it.
- **Auto-show** when the newest released entry is **newer** (numeric `major.minor.patch`) than the
  stored version. A stored version that is equal or newer stays silent; an unreadable value counts
  as older.
- **No stored version**: a returning player (finished guide or saved race history) gets the notes;
  a first-time player is not greeted with old news, and the current version is recorded silently
  so the next release is announced to them.
- The check runs on the ready/home screen once the 3D world is up, and again whenever another
  dialog closes. It defers behind dialogs, the tutorial and a hidden page.
- **Showing the dialog records it**: the stored version moves to the newest release and the unread
  dot clears the moment it opens, automatically or by hand, so a reload or crash never repeats it.
- **Unread marks**: while that visit's dialog is open, every listed release newer than the previous
  stored version shows a **New / 未讀** badge on its tab, so a player who missed several updates
  sees each one. No extra key is stored — the single seen version is the watermark — and the next
  opening shows no badges.
- Manual entry: the version label always reopens the dialog on the newest tab. Close, Escape and
  Continue restore focus to the opener; game hotkeys never leak through the modal.

## 6. Releasing a new version

1. Before publishing, add the new version's entry at the top of `RELEASE_NOTES`, with en + zh-TW copy
   written per the policy above and optional images under `public/whats-new/<version>/`.
2. `/release <version>` runs `scripts/release-gate.sh`, which first runs
   `node scripts/check-release-notes.mjs <version>`: it refuses the release when that version has no
   entry, a highlight lacks either language, or an image is not a file in `public/`.
3. `tests/release-notes.test.js` checks every stored entry (shown or archived) on every `npm test`.
4. The gate then runs `npm test` with `package.json` set to the new version, as the tag's CI will.
   `CURRENT_RELEASE` follows that version, so a test about a specific entry's content pins it with
   `releaseForVersion('<version>')` — v0.22.0's tag run failed on an unpinned `CURRENT_RELEASE.image`.

## 7. Tests

- Unit (`tests/release-notes.test.js`): seen-version contract, first-time vs returning player,
  blocked storage stays silent, numeric version order, newest-five window with future versions hidden, every
  entry complete with bundled images, release gate refuses a missing version.
- Browser (`tests/release-announcements-browser.spec.js`): read/dismiss/reopen, no external link,
  version tabs by click and keyboard (wrap, Home/End, language switch keeps the tab, reopen starts
  newest), localized hero, auto-show once for an older record, silent when up to date, silent first
  visit that records the version, and fit/scroll/44 px checks at the four viewports.
- Shared test helper seeds the seen key (`whatsNewSeen` option) so other suites are not interrupted.
