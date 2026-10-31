# Copy/Paste Implementation Prompt — Wave 1: mobile-controls-hud

> This document is an **assignment prompt for a separate GPT chat**, not an authorization to start implementation in the chat that created these plans. Copy the **entire section below** into the assigned GPT chat when its Wave gate is met.

## Prompt to paste

使用已連接的 GitHub（repository **https://github.com/weskao/skyline-rush**），針對**已存在的**分支 `feature/mobile-controls-hud` 進行 Skyline Rush 的以下工作：

**工作項目：** B: default Hybrid A+B, opt-in Competitive C, touch controls and NITRO READY feedback  
**對應 TODO：** 3, 6, 7  
**Wave：** 1  
**分支的主要檔案所有權：** src/race-hud.ts; src/touch-controls-ui.ts; src/control-settings.ts; src/SettingsPanel.vue。

**前置/平行條件：** Immediately eligible for Wave 1 in parallel with tutorial-ux-combos and garage-preview-studio. Shared NITRO state is a read-only contract; avoid their tutorial/renderer files.

### 1. 正確的 Git 分支與規格

1. 先查驗 `feature/mobile-controls-hud` 是否存在、它的 HEAD，以及最新 `main`。**不要另開 PR，也不要誤改 main**。若前置分支尚未真正完成、CI 未綠或尚未獲准合併，**停在審核/規劃，不准先開始依賴性的實作**。
2. 依序閱讀本分支的下列檔案，並依最新 `main` 實際原始碼進行衝突/差異檢查：
   - `CLAUDE.md` 與適用的 `.claude/rules/`（特別是 `ui-architecture`、`performance-review`、`device-quality`、`touch-input`、`ui-phase-interactions`）
   - `docs/superpowers/specs/2026-10-31-mobile-controls-hud-design.md`（SDD + BDD）
   - `docs/superpowers/plans/2026-10-31-mobile-controls-hud-plan.md`（Superpowers 實作計畫）
   - `docs/superpowers/prompts/2026-10-31-mobile-controls-hud-visual-design.md`（畫面／美術／素材設計 Prompt，按需製作與審核）   - 原始需求 `https://github.com/weskao/skyline-rush/blob/feature/ux-ui-combo-mobile-controls/TODO.md` 中對應項目與全平台 S1–S3 規範。
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

### 3C. 以已核准圖片為基準的 Visual Fidelity Gate

**所屬分支實際參考圖與差異紀錄：** [Visual Fidelity design and original reference map](https://github.com/weskao/skyline-rush/blob/feature/mobile-controls-hud/docs/designs/mobile-controls-hud/VISUAL-FIDELITY.md)

在實作或驗收畫面前，必須先載入原始 AI 高畫質圖片檔（來源與 SHA-256 記於上述文件；會話另外附 `skyline-rush-design-reference-crops.zip`），確認所選畫面及版本已核准。圖檔目前**尚未放入 GitHub**；不能虛構圖檔路徑或把簡化的 SVG/草稿當成原本高擬真參考圖。針對 390×844、844×390、1440×900 建立 UI/3D 元件位置、比例、材質、光照、色彩、按鈕、動作時間的具體規格，且將核准圖真正以原始檔案提交到 `docs/designs/mobile-controls-hud/references/` 並標註 Blob SHA。

使用 **Vue 3 + strict TypeScript + Three.js** 實作真正可操作的 UI/3D；優先保留效果深度（立體車身、真實光影、發光材質與精緻圖示），任何降級均需明列並核准。依 **SDD → BDD → TDD（RED→GREEN→Refactor）** 建立 Layout/State 測試；Playwright 擷取真實執行畫面及互動動畫，逐項與核准圖並排比對：構圖、間距、光影、素材、狀態、動態、操作及 FPS／p95。**原始概念圖不能充當實際 WebGL 證據，CI 綠燈也不能取代美術驗收。** Android/iOS 直橫向、Desktop、Low/Medium/High、Reduced Motion 和 VFX Off 均需記錄結果。未核准/未完成項目保留 `- [ ]`，不得宣稱已符合圖片、不得自動 merge main。

### 3D. 3× 素材尺寸與匯入規格（2026-10-31）

此前 GPT 對話已在本地輸出 `skyline-rush-3x-mobile-controls-hud.zip` 與完整 `skyline-rush-3x-ui-assets.zip`；其中 18 個**獨立候選素材**皆有透明 PNG／WebP 版本，分組為 12 HUD/misc icons and 6 button image references (button text must be rendered with Vue, not baked texture)。

**注意：這些 PNG/WebP 目前只存在於對話 ZIP，尚未上傳到 GitHub，也還沒套用到真實 Vue／Three.js 介面。** 請先實際匯入檔案，並在圖像／透明邊緣驗收後使用。來源是 AI 圖片拼版的精細裁切、去背及 Lanczos 放大，不是原生生成出三倍細節的無瑕高解析素材；不可聲稱原生 3×。

**強制正確顯示尺寸：**

- `288×288 raster px → 96×96 CSS px`（Garage 主要素材、獎勵圖示）。
- `216×216 raster px → 72×72 CSS px`（HUD／Store 小圖示）。
- `432×156 raster px → 144×52 CSS px`（僅按鈕設計參考；文字、狀態與點擊由真正 Vue 控制）。
- Vue `<img>` 或 CSS 必須設定 `width`／`height` 或 `inline-size`／`block-size` 為**1× 預定尺寸**，加 `object-fit: contain`；不能讓 3× 圖片以原始 px 尺寸撐大整個 UI。
- 不要把 CSS 像素當成實機像素；高 DPI 只決定影像細緻度。盡量採用 WebP、lazy loading 和 Low 畫質 fallback，評估 GPU texture memory。
- 用真正暗／亮背景檢查透明 Alpha，不要只看名為 `transparent` 的棋盤格。

整合與驗收時先讀 `docs/superpowers/plans/2026-10-31-mobile-controls-hud-plan.md` 的 **Candidate 3× Raster Asset Delivery**，逐項標記已上傳、已整合、TDD、真實截圖及 CI；功能未達 Wave 依賴與 Visual Fidelity Gate 之前**不可勾選 TODO 主項**。

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
