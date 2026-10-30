---
description: Release Skyline Rush — check and review the What's New notes first, then changelog, commit, tag, push and GitHub Release
argument-hint: "[version] [-y|--yes]   e.g. /release 0.22.0"
---

# Release (Skyline Rush)

This project's `/release` wraps the shared release command: nothing is committed, tagged or
pushed for the release until the version's in-game What's New notes pass every check.

## Phase 0 — Survey

Run Phase 0 of `$HOME/.claude/commands/release.md` (`release-prep.sh`, branch gate) with
`$ARGUMENTS` unchanged. Resolve the version now, because the notes check needs it: the version
token in `$ARGUMENTS`, else ask with `AskUserQuestion`, first option `<SUGGESTED> (Recommended)`
from the survey. Later phases reuse this answer and do not ask again.

## Phase N — What's New notes (before tests, intro or any release write)

版本確定後，在對話中列出預計發佈版本、上一版、公告日期，以及該版本在
`src/release-notes-data.ts` 的完整公告：每項標題與內容都包含 English + 繁體中文。
即使公告已審核通過，也必須展示全文；不能只回報檢查通過、摘要或檔案路徑。
若審核修改公告，在最終核准前再次展示最後版本，避免核准的內容與看到的不同。

1. `node scripts/check-release-notes.mjs <version>` — read-only.
   - **Passes** → go to Phase T.
   - **No entry for the version** → stop. The notes are written first, as the `version: UPCOMING`
     entry (CLAUDE.md "Every release ships its What's New notes"); the check finds it under any
     version newer than every released entry; offer to draft them from `node scripts/check-release-notes.mjs --changes` (player-facing
     commits since the last tag), rewritten as player copy, then review them.
   - **Copy problems, not reviewed, or changed since review** → run
     `.claude/commands/review-release-notes.md` with the version: automatic check, fresh-eyes
     sub-agent review, the user's answers (every `AskUserQuestion` carries a "(Recommended)" first
     option), then `--approve`.
2. After an approval, commit `src/release-notes-data.ts` and `scripts/release-notes-reviews.json`
   together on the release branch (`docs(release): review <version> notes`) and push it: the gate
   only tags a commit that is on `origin/main` with a green CI run, and waits for a running one.
3. Re-run step 1; continue only when it passes.

`-y` / `--yes` skips the intro approval only, never a notes question.

## Phases T, A and B

Follow Phases T, A and B and the final report of `$HOME/.claude/commands/release.md` unchanged.
`RELEASE_SCRIPT` resolves to this project's `scripts/release.sh`, whose `scripts/release-gate.sh`
re-runs the notes check first, then requires `main` = `origin/main`, a green CI run and
`npm test` + `npm run build`, before the shared script writes the changelog, commits, tags,
pushes and creates the GitHub Release.


## 發版簡介與完成通知

- Phase A 的 GitHub Release 簡介也在對話中列出，與版本一起依共享流程確認；
  `-y` 只略過原有確認，不略過公告與簡介的展示。
- 發版後在對話中列出實際版本、發版 commit、GitHub Release 連結、CI 與網站部署結果，
  並再次附上實際發佈的完整中英公告與 GitHub Release 簡介。
- 對話與 Telegram 都採清楚分段：版本資訊 → 更新公告 → Release 簡介 → 驗證結果。
  使用 Markdown 標題、粗體欄位、項目清單與段落留白；每項公告分開呈現繁體中文與
  English，Release／CI／網站使用有名稱的獨立連結，不貼整段原始 log。
  版本資訊包含本版、上一版、公告日期與發版 commit；驗證結果區分成功、失敗、進行中
  及略過。全文過長則依段落分則發送並標示順序，每則仍保留標題與版本；不截斷公告，
  也不使用手機難閱讀的寬表格或整段程式碼框。
- 所有 release 相關 Telegram 訊息（完整公告、進度、成功、失敗及補送）一律使用
  `send-rich`，每次明確呼叫 `sendRichMessage`；`-y` 不略過通知或格式要求。
  本專案此規則優先於 `telegram-send` skill 的一般 `send` 範例，不使用依內容自動路由
  的 `send`，也不直接使用 `sendMessage` 傳送 release 訊息。
- 使用 `telegram-send` skill，把相同的版本資訊、完整公告、簡介、Release／CI／網站連結
  及略過或未完成的驗證送到既有預設 bot chat：

  ```bash
  bash "$HOME/.claude/scripts/tg-send.sh" send-rich "<依上述格式排版的版本資訊、公告全文與驗證結果>"
  ```

  不指定新收件者。只有回傳 `tg-send: sendRichMessage OK message_id=<integer>`，
  才能宣稱 rich 格式已送達，並在對話保留 `message_id: <integer>`。
  共用腳本在 rich 重試失敗後仍可能降級為 `sendMessage`；遇到此回傳，必須明確回報
  「內容已送達，但 rich 格式失敗」，保留該 ID，不得把 exit 0 或純文字送達當成 rich
  成功，也不要盲目重送造成重複通知。沒有實際 ID 時回報未確認送達。
  若尚在部署，清楚標示，完成或失敗後以 `send-rich` 補送最終結果；通知失敗不回滾
  已建立的 release。
