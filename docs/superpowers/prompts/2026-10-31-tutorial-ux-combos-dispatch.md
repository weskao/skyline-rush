# Copy/Paste Implementation Prompt — Wave 1: tutorial-ux-combos

> This document is an **assignment prompt for a separate GPT chat**, not an authorization to start implementation in the chat that created these plans. Copy the **entire section below** into the assigned GPT chat when its Wave gate is met.

## Prompt to paste

使用已連接的 GitHub（repository **https://github.com/weskao/skyline-rush**），針對**已存在的**分支 `feature/tutorial-ux-combos` 進行 Skyline Rush 的以下工作：

**工作項目：** A: tutorial-only state machine, AIR→ROAD CHAIN, barrel roll, sustained NITRO coaching  
**對應 TODO：** 1, 2, 8, 9  
**Wave：** 1  
**分支的主要檔案所有權：** src/interactive-tutorial.ts; src/tutorial-ui.ts; src/tutorial-coach-state.ts; tests/interactive-tutorial.test.js。

**前置/平行條件：** Immediately eligible for Wave 1 in parallel with mobile-controls-hud and garage-preview-studio; coordinate engine event names, but do NOT modify their files.

### 1. 正確的 Git 分支與規格

1. 先查驗 `feature/tutorial-ux-combos` 是否存在、它的 HEAD，以及最新 `main`。**不要另開 PR，也不要誤改 main**。若前置分支尚未真正完成、CI 未綠或尚未獲准合併，**停在審核/規劃，不准先開始依賴性的實作**。
2. 依序閱讀本分支的下列檔案，並依最新 `main` 實際原始碼進行衝突/差異檢查：
   - `CLAUDE.md` 與適用的 `.claude/rules/`（特別是 `ui-architecture`、`performance-review`、`device-quality`、`touch-input`、`ui-phase-interactions`）
   - `docs/superpowers/specs/2026-10-31-tutorial-ux-combos-design.md`（SDD + BDD）
   - `docs/superpowers/plans/2026-10-31-tutorial-ux-combos-plan.md`（Superpowers 實作計畫）
   - `docs/superpowers/prompts/2026-10-31-tutorial-ux-combos-visual-design.md`（畫面／美術／素材設計 Prompt，按需製作與審核）   - 原始需求 `https://github.com/weskao/skyline-rush/blob/feature/ux-ui-combo-mobile-controls/TODO.md` 中對應項目與全平台 S1–S3 規範。
3. 依照實際差異，在**自己的分支**同步最新 `main`，必要時採非破壞式 rebase/merge 並保留已有的規劃文件與成果。絕不能以舊版 TODO 直接覆寫新的 TODO。

### 2. SDD → BDD → TDD（使用 Superpowers 實際技能）

- **SDD：** 先對照現存原始碼與規格，修訂設計約束、Typed Interfaces、責任檔案與依賴；如果需要使用 `$superpowers` 的 brainstorming / writing-plans 等能力，應實際載入技能。避免重複實作已完成部分。
- **BDD：** 用 spec 所列 Given / When / Then 情境撰寫自動化可驗收的 Scenario；包含正常、錯誤、重複輸入、暫停、重啟、裝置切換、狀態遷移與資料相容性。
- **TDD：** 對每個 Task 按 `RED → GREEN → REFACTOR`：先新增失敗測試並觀察 RED、最少程式碼讓它變 GREEN，重構後確保測試仍通過。每個可驗證的階段獨立 commit；不得宣稱未執行測試已通過。

### 3. 技術／畫面／效能共通要求

- 以 **Vue 3 + strict TypeScript** 為新 UI、控制器與服務的預設架構，Vue SFC 採 `<script setup lang="ts">`；物理／Three.js 即時渲染熱路徑可保留原有 JS，但須有型別邊界，**不可將遊戲 frame loop 改成 Vue 每幀 reactive re-render**。
- 以效能和實際遊戲可視性為主：減少重複 DOM/Layout、資源配置、GPU draw calls、材質／Shader rebuild；維持 10 張賽道、遊戲邏輯、正常操作與畫質。
- 驗收 Android Chrome / iOS Safari & Chrome：**直向＋橫向**，Desktop 常用瀏覽器和必要平板尺寸；`en`/`zh-TW`、Low/Medium/High、Reduced Motion、VFX Off、Mute，且 touch/keyboard/mouse、pause/restart/finish 按鈕都有效。
- **Low/Medium/High** 只對 GPU／高耗能動畫分級，不能改動核心 HUD 資訊、遊戲規則、車輛數或操作。畫面新設計必須以實際 Vue/CSS/Three.js 實作，概念圖片只能做參考，不能替代真正的 UI／動態特效。
- 對影響畫面的改動執行真實 WebGL 截圖／影片與前後效能比較：Draw Calls、Triangles、FPS、Frame Time p50/p95；如無法操作實機需明確列為未驗證。

### 4. 完成、TODO 勾選與合併 Gate

- 實作完畢後執行相關 `npm run typecheck`、`npm test`、`npm run build`、`npm run test:layout`、`npm run test:browser`、`make verify`，以及受影響的 World Tour、Cloud Save 等測試；確認最後 HEAD 的 GitHub Actions `quality-gate` 完整通過。
- **確認本分支所負責的每一項需求真正完成、BDD/TDD 與所有驗收通過後，才到 `TODO.md` 把對應子項目從 `- [ ]` 改為 `- [x]`，附上 commit / 測試／CI 證據。** 若 TODO 尚在原規劃分支，先協調將最新版完整需求非破壞式同步進此分支；不可直接拿舊檔覆蓋，也不可把仍待後續分支完成的整個 #5 提前標記完成。未完成項目必須維持 `- [ ]`。
- 最後回報：實際 root cause／設計變更、修改檔案、commit SHA、BDD/TDD 結果、各裝置與畫質驗收、尚存風險、可否進下一 Wave。
- **禁止自動建立 PR、部署或合併 main；需使用者明確授權。** 下一 Wave 只在它的所有必要前置分支真正完成、已合併進最新 main 且最終 CI 綠燈後啟動。獨立分支可以平行開發，但共享檔案與型別契約須協調以降低 Git conflicts。

請依照以上要求對**此指定分支**逐步完成工作；不得將其它分支的內容偷渡進來，也不得宣稱未完成驗收為成功。

## Handoff checks

- [ ] Wave 1 prerequisite satisfied.
- [ ] Full SDD/BDD/plan read with updated CLAUDE.md.
- [ ] Feature files only on assigned branch.
- [ ] TDD RED and GREEN evidenced, full exact HEAD quality gate green.
- [ ] Canonical TODO subitems are `- [x]` only after real acceptance; remaining tasks stay `- [ ]`.
- [ ] Branch ready for user-reviewed direct merge before downstream Wave.
