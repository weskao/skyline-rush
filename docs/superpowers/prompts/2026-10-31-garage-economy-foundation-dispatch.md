# Copy/Paste Implementation Prompt — Wave 3: garage-economy-foundation

> This document is an **assignment prompt for a separate GPT chat**, not an authorization to start implementation in the chat that created these plans. Copy the **entire section below** into the assigned GPT chat when its Wave gate is met.

## Prompt to paste

使用已連接的 GitHub（repository **https://github.com/weskao/skyline-rush**），針對**已存在的**分支 `feature/garage-economy-foundation` 進行 Skyline Rush 的以下工作：

**工作項目：** H: typed ownership and future economy contracts, migration/security boundary  
**對應 TODO：** 5.5, 5.7, 5.9  
**Wave：** 3  
**分支的主要檔案所有權：** src/appearance.ts; src/garage-ui.ts; src/cloud-progress.ts; src/history-storage.ts。

**前置/平行條件：** WAIT until garage-vfx-skins is verified and merged to main. No real payments or active soft/premium ledger unless separately authorized.

### 1. 正確的 Git 分支與規格

1. 先查驗 `feature/garage-economy-foundation` 是否存在、它的 HEAD，以及最新 `main`。**不要另開 PR，也不要誤改 main**。若前置分支尚未真正完成、CI 未綠或尚未獲准合併，**停在審核/規劃，不准先開始依賴性的實作**。
2. 依序閱讀本分支的下列檔案，並依最新 `main` 實際原始碼進行衝突/差異檢查：
   - `CLAUDE.md` 與適用的 `.claude/rules/`（特別是 `ui-architecture`、`performance-review`、`device-quality`、`touch-input`、`ui-phase-interactions`）
   - `docs/superpowers/specs/2026-10-31-garage-economy-foundation-design.md`（SDD + BDD）
   - `docs/superpowers/plans/2026-10-31-garage-economy-foundation-plan.md`（Superpowers 實作計畫）
   - 原始需求 `https://github.com/weskao/skyline-rush/blob/feature/ux-ui-combo-mobile-controls/TODO.md` 中對應項目與全平台 S1–S3 規範。
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

### 3A. GPT 圖片生成／透明背景／實際素材整合（Wave 2／3 新增）

**本分支的素材策略：不需要圖片。** 本分支負責 entitlement、ownership、trial 與資料／安全邊界，**禁止為了交付需求而任意生成圖片**。必要的貨幣圖示／商店背景應由後續 Rewards、Store 分支另行製作，且當前不實作正式付費圖示或可兌換的實際餘額。

1. **先讀既有資源：** 檢視 `src/icons.ts`、`public/icons/`、現有 Vue/CSS 與 Three.js 材質／特效；有可複用的 SVG、程序化幾何或 CSS 就不要重複生成圖片。將素材分成「概念稿」、「可直接使用的原創靜態資產」、「須由真實 Three.js 即時繪製的動態特效」。
2. **必要時實際產圖：** 在被分派的 GPT 對話內，若圖片生成能力可用，使用該功能產出可審核的原創設計稿／素材；**不可以只說會生成或把圖片工具參數貼成文字**。若沒有圖片生成工具，寫明限制與待補素材，不可杜撰完成的 PNG、SVG、預覽 URL。
3. **透明背景判斷：** 徽章、類別 icon、粒子 sprite、可獨立疊加的 VFX 縮圖預設 **transparent background / true alpha channel / no white or checkerboard baked into pixels**；需要場景燈光、展示間或故事背景時才做不透明版本。要求乾淨 Alpha 邊緣、無裁切主體、無內建多餘文字、無浮水印、無商用競品 Logo。
4. **格式與整合：** UI 小圖示優先既有 24×24 SVG／Vue icon；若使用產生的點陣圖，原稿優先高解析透明 PNG，測試 Alpha、裁切與不同背景可讀性後轉成壓縮透明 WebP。背景使用經壓縮 WebP/JPEG（不得依賴 JPEG 透明）；依設計需要加入適當 1×/2× 版本與檔案尺寸預算。圖片生成輸出**不等於可編輯向量圖**，不可把 PNG 假稱 SVG。正式採用才放進所屬 `public/` 素材資料夾，設計稿放 `docs/designs/<feature>/`，並附來源／用途／壓縮與格式記錄。
5. **真實畫面與可操作性：** UI 的文字、名次、分數、狀態與觸控按鈕由 Vue 3 + TS + CSS／SVG 真正控制，3D 車輛和速度 VFX 由共用 Three.js renderer 驅動；**不得**用產生的概念圖或截圖遮蓋實際 WebGL 作為完工畫面。
6. **SDD → BDD → TDD 與品質：** 先定義資產契約／場景／Alpha 條件，再定義 Given／When／Then，對不存在／載入失敗／低畫質／Reduced Motion／深淺背景與小螢幕寫 RED 測試，製作／整合後執行 GREEN。驗收 Android/iOS 直橫向、桌面、Low／Medium／High、VFX Off，使用實際遊戲截圖對比設計，量測下載大小、FPS／p95 frame time、Draw Calls／Triangles 或 shader/cache 影響，無資產時有正常 Fallback。
7. **執行與放行：** 本次是規劃文件更新，**不代表已有 PNG/WebP/SVG 或已實作**。後續各分支只在自己的 Wave 依賴完成後開始，完成實作與完整驗證才在正確整合的 `TODO.md` 改成 `- [x]`，不得自行合併 main 或跨分支搶改共用 renderer。

### 3B. 預先完成的獨立美術資產／待前置完成的工作

**本階段沒有新增素材檔案（經必要性評估後刻意保留）：** 此分支只有資料／權限模型，不需要圖片；不要建立素材或付費商店圖。



**強制交接：** 先讀 `docs/superpowers/plans/2026-10-31-garage-economy-foundation-plan.md` 的「Independent artwork pre-production handoff」；不能因為檔案已存在就把任何遊戲功能或 `TODO.md` 主項目標記 `- [x]`。既有素材與 `ASSET-MANIFEST.md` 應保留，後續真正 Vue/Three.js 整合、Fallback、BDD/TDD、Android/iOS 直橫向及完整 CI 仍須完成，且遵循原 Wave 前置依賴。

### 4. 完成、TODO 勾選與合併 Gate

- 實作完畢後執行相關 `npm run typecheck`、`npm test`、`npm run build`、`npm run test:layout`、`npm run test:browser`、`make verify`，以及受影響的 World Tour、Cloud Save 等測試；確認最後 HEAD 的 GitHub Actions `quality-gate` 完整通過。
- **確認本分支所負責的每一項需求真正完成、BDD/TDD 與所有驗收通過後，才到 `TODO.md` 把對應子項目從 `- [ ]` 改為 `- [x]`，附上 commit / 測試／CI 證據。** 若 TODO 尚在原規劃分支，先協調將最新版完整需求非破壞式同步進此分支；不可直接拿舊檔覆蓋，也不可把仍待後續分支完成的整個 #5 提前標記完成。未完成項目必須維持 `- [ ]`。
- 最後回報：實際 root cause／設計變更、修改檔案、commit SHA、BDD/TDD 結果、各裝置與畫質驗收、尚存風險、可否進下一 Wave。
- **禁止自動建立 PR、部署或合併 main；需使用者明確授權。** 下一 Wave 只在它的所有必要前置分支真正完成、已合併進最新 main 且最終 CI 綠燈後啟動。獨立分支可以平行開發，但共享檔案與型別契約須協調以降低 Git conflicts。

請依照以上要求對**此指定分支**逐步完成工作；不得將其它分支的內容偷渡進來，也不得宣稱未完成驗收為成功。

## Handoff checks

- [ ] Wave 3 prerequisite satisfied.
- [ ] Full SDD/BDD/plan read with updated CLAUDE.md.
- [ ] Feature files only on assigned branch.
- [ ] TDD RED and GREEN evidenced, full exact HEAD quality gate green.
- [ ] Canonical TODO subitems are `- [x]` only after real acceptance; remaining tasks stay `- [ ]`.
- [ ] Branch ready for user-reviewed direct merge before downstream Wave.
