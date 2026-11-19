---
paths:
  - "src/**/*.js"
  - "src/**/*.ts"
  - "src/**/*.vue"
  - "index.html"
---
# No native browser dialogs, pickers or search fields

The game draws its own UI. A native popup looks like the browser, not the game, blocks the page
(the frame loop and audio stall under `confirm()`), ignores the locale and theme, and renders
differently on iOS, Android and desktop.

- **Confirm / alert / prompt** → `confirmDialog()` in `src/confirm-dialog.ts` (rendered by
  `src/ConfirmDialog.vue`). The safe choice is the focused primary button; Esc and the backdrop
  cancel. Never `confirm()`, `alert()`, `prompt()`, nor their `window.` forms.
- **Dropdowns** → leave `<select>` to `customSelect()` (`src/custom-select.ts`, mounted for every
  select in `src/main.js`). Never opt one out with `data-native-select`.
- **Search / suggestions** → a styled text input and a page listbox; never `type="search"` or
  `<datalist>`.
- **File pickers** stay a hidden `<input type="file">` opened by a game button
  (`#cloud-import-file`); the OS sheet itself cannot be replaced.
- **Enforced by** `tests/no-native-ui.test.js`. It scans `src/` and `index.html`, and its first case
  shows it catches the native `confirm()` the cloud menu used before the in-game dialog.

## Turning an important setting off asks every time

A setting whose switch-off hides a large part of the game, or whose control sits deep in
Settings, asks through `confirmDialog()` **on every switch-off**, never only the first time.
Turning it back on never asks. Today: Visual effects (`confirmVfxOff` in `src/vfx-ui.ts`).

- One-key toggles undone by the same key (M sound, V airflow, F2 AUTO) do not ask; they show the
  shared toast (`showSettingToast` in `src/toast-view-state.ts`): the setting's name, then a
  filled ON or outlined OFF badge.
- Dialog copy: a question title; `points`, one short fact per line (what is hidden, what stays
  the same, where to turn it back on, naming the real Settings path); buttons that name the
  action (`Turn effects off` / `關閉特效`, `Keep effects on` / `保持開啟`). A bare `關閉` or
  `OK` is ambiguous: it also reads as "close this box".
- Both locales in the same change; check the dialog at desktop, phone portrait and phone
  landscape (`tests/toggle-feedback-browser.spec.js`).
- The dialog is a `.history-screen`: capped at `100dvh - 64px` and scrolling. At 844×390 that hid
  "Turn effects off" below the fold while both buttons still sat inside the viewport. Short
  landscape uses a one-line title and side-by-side buttons (`src/ConfirmDialog.vue`); the spec
  asserts the dialog does not scroll (`scrollHeight <= clientHeight`) at 844×390 and 743×340.
