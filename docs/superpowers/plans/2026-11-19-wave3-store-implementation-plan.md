# Skyline Rush Wave 3 試玩商城實作計畫

**目標**：完成遊戲內取得試玩貨幣、瀏覽、確認、扣款、解鎖與裝備的完整流程，使桌面與手機在等候、餘額不足及失敗時都有清楚的下一步。

**基準**：`feature/wave3-firestore-e2e` 已核對至 `6f1eb35`。開工時重新取得遠端 HEAD。既有 23 款外觀和三種試玩幣別已能交易，報價驗證、收據、共用卡片與解鎖彈窗可重用。

**架構**：商城透過既有 `Wave3ExperiencePort` 呼叫 `redeemPreview(itemId, quote)`，只依 `ExperienceResult` 和最新快照呈現結果。訪客沿用 localStorage，開啟雲端試玩且登入後沿用 UID 隔離的 Firestore 交易。商品、價格和圖片取自既有目錄，成功演出繼續走 `presentAcquisition()`。

**技術**：Vue 3、TypeScript、Vite、localStorage、Firebase Auth／Firestore、Node Test、Playwright、Firebase Emulator。

**相關規格**：[試玩經濟計畫](https://github.com/weskao/skyline-rush/blob/6f1eb35c5395ec605b6817621658a7a35a205c76/docs/superpowers/plans/2026-11-13-wave3-economy-e2e-plan.md)、[雲端試玩設定](https://github.com/weskao/skyline-rush/blob/6f1eb35c5395ec605b6817621658a7a35a205c76/docs/cloud-save.md#wave-3-firestore-preview)、[共用解鎖介面](https://github.com/weskao/skyline-rush/blob/6f1eb35c5395ec605b6817621658a7a35a205c76/docs/acquisition-reveal.md)。

## 階段範圍與規則

- 這一階段交付完整的試玩商城。Go 伺服器驗證、正式帳本、付款及永久權益留在後續階段。試玩數值、收藏和正式資產維持隔離。
- 保留既有 23 款價格、點數／金幣／鑽石圖示與來源，以及任務、首次完賽和七天試玩存檔期限的現行設計。
- 維持目前儲存路由。訪客使用 localStorage。登入且設 `VITE_WAVE3_FIRESTORE_PREVIEW=1` 時使用 Firestore。登入但試玩雲端關閉時，若該建置仍顯示商城，試玩資料限本次頁面。畫面要說清楚目前採哪個方式；登入和登出時重新載入各自的快照。
- Firestore 暫時失敗、斷線或等待過久時，保留最後確認的數值。重連先核對遠端快照，再由玩家決定是否重試。同一筆兌換已有有效成功回執才可以播報取得成功。
- 交易畫面有兩種可行結構。原有確認區加上等待及錯誤狀態，改動集中、可重用報價與焦點行為。獨立結帳頁可容納更複雜清單，會多一層導航。目前採前者，並讓桌面的預覽與操作並排。

## 實作順序與待辦

### 1. P0｜確認、送出中和失敗重試（明確採 TDD）

涉及 `src/Wave3DemoStore.vue`、`tests/fixtures/wave3-demo-store.html`、`tests/wave3-demo-store-browser.spec.js`。

- [x] **RED**：在瀏覽器測試延遲交易結果。按「確認兌換」後仍看得到商品、報價與「兌換中…」；再按確認或另一商品的「兌換」時，提交次數仍為 1。尚未收到回執時，餘額、收藏和解鎖彈窗維持送出前狀態。釋放成功回執後，核對只扣一次且解鎖彈窗只開一次。
- [x] **RED**：延遲失敗回執，驗證商品確認區仍在原位、跳出可重試提示，帳本與收藏維持原值。再測送出後切換帳號，舊回執不會改寫新帳號 UI 或觸發其彈窗。
- [x] **執行 RED**：跑商城瀏覽器 spec 的新案例，確認失敗點是確認區提前關閉或缺少等待／重試行為。
- [x] **GREEN**：把確認區維持到收到有效回執，以同一份報價透過既有 port 送出。等待期間鎖定會重新送出的入口，顯示可讀的等待提示。收到失敗時保留選擇與報價資訊，下一次操作重新取得有效報價。登入身分或存檔世代改變時依現有 scope 守衛處理晚到回執。
- [x] **REFACTOR**：統一商品卡與詳情的送出路徑，沿用既有回執類型、音效與解鎖佇列。跑同一 spec，確認雙擊、鍵盤連按、重試、取消及焦點行為全綠。

### 2. P0｜補齊 localStorage 與 Firestore 買後存檔驗收

涉及 `src/wave3-browser-experience.ts`、`src/wave3-local-demo.ts`、`src/wave3-preview-firestore.ts`、`tests/wave3-demo-economy.test.js`、`tests/wave3-economy-transactions-browser.spec.js`、`tests/cloud-emulator-browser.spec.js`、`tests/firestore-rules.test.js`。資料層在重現缺口時才修正。

- [x] 驗證訪客完成一場比賽、領任務、兌換、裝備、重整與離線兌換。拒絕本機寫入或容量不足時，UI 要說明本次進度無法持久化。
- [x] 以 Firebase Auth／Firestore 模擬器驗證登入後載入隔離的 UID 快照、商城兌換、第二個瀏覽器讀回與登出回訪客。重設與刪除後的回執另由單元測試覆蓋。
- [x] 沿用現有 Firestore 交易，把扣款與新增收藏一起提交。兩個分頁或裝置同時兌換同一件，期望只有一筆扣款與一件收藏。不同商品競用同一筆餘額時，結果不可產生負數餘額。
- [x] 驗證確認期間跨分頁扣款、報價過期、刪除或重設後的舊世代，以及雲端掉線。重連先讀回最後已提交的快照；同件已存在時顯示已取得，沿用收據去重避免重扣或重播。
- [ ] 驗證 `VITE_WAVE3_FIRESTORE_PREVIEW=0/1`、缺少憑證、上次已確認的餘額，以及裝置／雲端存檔標示。這次先用模擬器和測試建置做端到端驗收。

### 3. P1｜商品卡直接顯示差額與取得方式

涉及 `src/wave3-demo-catalog.ts`、`src/wave3-demo-settlement.ts`、`src/Wave3DemoStore.vue`、`src/Wave3CurrencyAmount.vue`、`tests/wave3-demo-store.test.js`、`tests/wave3-demo-store-browser.spec.js`。

- [x] 從當前快照、商品報價和既有餘額函式計算缺額。價格 150 金幣、目前 95 金幣時，商品卡顯示金幣圖示、150 和「還差 55」，並提示競速／每日競速任務。餘額到 150 後同步成可兌換。
- [x] 三種幣別分別提示合法取得方式。點數提示完賽或領取試玩任務，金幣提示競速或每日競速任務，鑽石提示每週競速任務。維持已取得狀態、三種圖示、英文／繁中和讀屏名稱。
- [x] 競態阻擋時更新原商品區的金額與提示。驗證頂部錢包及商品卡同時更新，移動到不足商品時仍可留在該卡看見原因。

### 4. P1｜桌機並排預覽，手機先看到商品

涉及 `src/Wave3DemoStore.vue`、`src/GaragePanel.vue`、`src/GarageSkinCardFace.vue`、`src/GarageArtworkImage.vue`、`src/GarageDriftPreview.vue`、`tests/wave3-demo-store-browser.spec.js`。

- [x] 桌面把所選商品的動態預覽、名稱、價格與操作並排。手機直向優先可見錢包、分類與第一列商品。手機橫向保持確認與返回操作可及，清單與預覽可以自然捲動。
- [x] 六張商店概念圖移到商品後方的既有概念展示區，合併重複展示。保留分類、商品價錢、前往收藏和卡片的主要「兌換」入口。
- [x] 重用共用 GIF／WebP 與甩尾實景預覽。低畫質、減少動態或動畫載入失敗時沿用靜態圖，離開商城回收按需開啟的實景預覽。
- [x] 實際車庫的 Playwright 已覆蓋 1440×900、390×844、844×390 和 320×720，檢查桌機並排、直向商品列和水平溢位。
- [ ] 實體手機確認觸控、縮放和動畫。

### 5. P1｜解鎖後返回原商品，接續前往收藏

涉及 `src/Wave3DemoStore.vue`、`src/Wave3DemoEntry.vue`、`src/Wave3DemoCollection.vue`、`src/AcquisitionReveal.vue`（核對既有焦點接口）、`tests/acquisition-reveal-browser.spec.js`。

- [x] 成功收到交易回執後透過既有共用彈窗顯示獲得的外觀。玩家按「繼續」、Esc 或返回時，保持原商品、分類和捲動位置。若原兌換按鈕已隨完成狀態消失，焦點落回同張商品卡或其「前往收藏」按鈕。
- [x] 已取得商品提供「前往收藏」，開啟後預選該外觀。訪客與模擬器測試驗證入庫、裝備及重整，取消、失敗或重複回執可回到原商品。
- [x] Playwright 在 Roadster 和 Crimson GT 實際開跑後確認已兌換的 Void Pulse 特效。
- [x] 驗證每次新取得只有一次成功音；靜音、音量、減少動態與既有全域焦點規則沿用共用介面。

### 6. P2｜回歸、驗收紀錄與交付

- [ ] 跑 `node --test tests/module-size.test.js`、`npm test`、`npm run typecheck`、`npm run test:cloud`，以及商城、共用解鎖和 14 步帳本的瀏覽器測試。
- [x] 建置試玩關閉 Firestore 與 release 開啟 Firestore 的組合。用訪客與 release 模擬器測試兩條儲存路徑。
- [ ] 以正式 Google 測試帳號和第二個裝置驗收指定環境。
- [ ] 同時記錄無水平跑版、合理焦點順序、關閉後回原商品、錢包／收藏一致、失敗有下一步提示與較低畫質的靜態回退。
- [ ] 對照精確提交的 GitHub CI，逐項更新商城規劃與 `TODO.md`，把執行且通過的項目改為 `[x]`，另註明尚未完成的實機或測試環境驗收。

## 擋住回歸的五個場景

| 場景 | 驗收條件 | 所屬任務 |
|---|---|---|
| Firestore 回執慢、重複點擊 | 一次送出、餘額在回執後更新 | 1 |
| 等待期間登出或重設 | 舊帳號／舊世代的回執不污染新畫面 | 1、2 |
| 重連時遠端已有該商品 | 重新讀回狀態，維持已取得、零重扣 | 2 |
| 餘額剛好到售價 | 商品卡從顯示差額變為可兌換，幣別正確 | 3 |
| 手機橫向關閉解鎖彈窗 | 回原商品與可操作焦點，接著可前往收藏 | 4、5 |

## 實作與驗證紀錄

- 商城仍透過 `Wave3ExperiencePort` 驗證報價與扣款。確認區保留原商品和報價，送出期間停用其他入口。錯誤後重新取得報價，若同期已被兌換，更新原卡的已取得狀態。帳號或存檔世代切換時忽略先前的回執。
- Firestore 開關開啟的登入使用者遇到瀏覽器重新連線時，會讀取 UID 的最後已提交快照。失敗時保留已確認資料。玩家主動重試時，交易仍在同一份伺服器快照內驗證餘額與收藏。
- 商品卡、預覽和收藏沿用共用動態外觀。從解鎖彈窗回到原商品後，「前往收藏」預選該外觀和已取得篩選，玩家可自行裝備。
- RED 已確認等待時確認區提前消失、商品卡缺額不存在，以及重連讀取仍保留舊餘額。GREEN 驗證等待一次送出、失敗原位重試、跨帳號晚到的成功回執、金額同步和重連後讀取已確認進度。
- 近期驗收涵蓋 14 步試玩帳本、離線訪客、並發儲存鎖、封鎖裝置儲存的降級提示、共用解鎖及焦點回歸。正式 Google 帳號、實體手機及此提交的 CI 結果另列待辦。
- 本機 `npm test` 通過 3,431 項、跳過 4 項。TypeScript 與 Vue 型別檢查、14 項商城瀏覽器測試、Firestore 規則 5 項和 release 模擬器整合案例皆通過。模擬器確認雙分頁同一商品只扣一次、兩項共用餘額沒有負值，以及重連更新到已確認快照。
- 桌機與手機截圖及錄影取自繁中試玩建置的實際商城。錄影使用本機訪客存檔與測試完賽結果，關閉 3D 車輛展示和音訊以利瀏覽器擷取。
- Roadster 與 Crimson GT 的 Void Pulse 實際賽道回歸於定向重跑通過。完整 5 公里計時回歸已完成比賽、領取、兌換和裝備，重整後回到商城時用盡本機的 240 秒測試額度。14 步帳本測試已另驗證重整與重設。
