# 首頁滑動切圖改善計畫

目標是從 A 滑向 B 時，第一次露出的區域就屬於 B。放手後，同一個 B 畫面自然接上可動的 3D 場景。沿用現有 Three.js renderer、滑動手勢與資源預載。

基準為 develop 的 `02d3348c`。依據為使用者回報、`docs/regression-first-workflow.md` 與以下程式路徑。實作可使用 superpowers:executing-plans 逐項驗證。

## 1. 先重現兩種畫面錯誤

- [ ] 擴充 `tests/track-swipe-ui.test.js`。模擬 A 已畫出、B 連續數幀回傳 false、之後才成功。確認舊程式在 B 未繪製時仍擷取 canvas，並在 B 首幀前撤掉快照。
- [ ] 擴充 `tests/track-swipe-browser.spec.js`。挑兩張特徵明顯不同的地圖，先測中畫質、冷快取，延遲該地圖實際等待的模型或貼圖。記錄拖曳露邊、放手、滑動動畫結束、目標首幀四個時點。將露出區域與同機台、同畫質的目標地圖參考畫面比對，並逐幀檢查載入圖的實際可見性。既有兩張 canvas 的位置及中央像素 alpha 檢查只能證明沒有縫隙。

## 2. 滑動時只顯示可辨識的目標頁

- [ ] 在 `src/track-swipe-ui.ts` 將渲染介面對齊 `src/world.js` 的布林回傳。當且僅當指定地圖實際畫出才擷取。預覽專用地圖另驗證舞台建立成功，並依實際可進入狀態選擇與正式選取相同的展示路徑。檢查模式會改寫 race.trackId 的情況。
- [ ] 有效快照沿用現有雙頁並排。冷載入尚無有效快照時，B 頁用 B 的既有縮圖與名稱清楚辨識地圖，縮圖維持卡片比例；等 B 就緒，再於同一頁接手。使用現有本地化名稱，保留取消及反向拖曳。於 `src/style.css` 對齊現有頁寬與圖層。指標移動只更新位置，避免每次移動都嘗試載入或重建場景。
- [ ] 優先利用已有預載與快照。用真機比較第一段拖曳的最長幀時間。只有冷載入頻繁出現辨識卡且影響體感時，才評估閒置時準備相鄰頁；保留單一 WebGL context。

## 3. 放手後，由目標首幀接手

- [ ] 在 `src/track-swipe-ui.ts` 以「滑動結束」且「本次正式選取的 B 已繪製」取代固定等待兩次 requestAnimationFrame。先訂閱再選取，記住提早到達的首幀。於同一次畫面更新撤除頂層並露出底下的 B。已經是相同構圖的 3D 快照時可直接接手；若仍是辨識卡，才做短淡出，減少動態模式直接切換。
- [ ] 沿用 `src/world.js` 的 drawFrame 與既有 showcase-frame 訊號。區分暫時試繪和正式選取，同時涵蓋 preview-only 舞台（activeTrack 可能不同於 race.trackId，且沿用同一 race）。驗證 `src/track-load-telemetry.ts` 只記正式目標。取消、反向、離開首頁或更新選取時，使舊回呼失效並清理監聽。
- [ ] 在 `src/race-loading.css` 與滑動層協調可見性。滑動層擁有畫面期間，整頁 `#race-frame-still` 不得蓋過任何一頁；維持開始比賽時既有載入保護。若 3D 永久失敗或等待逾時，留下目標辨識卡並恢復切圖操作，允許晚到的有效畫面在仍選取該圖時接手。預覽專用地圖沿用現有 unavailable 提示。

## 4. 驗收與證據

- [ ] 優先中、高畫質，低畫質作對照；涵蓋冷／熱快取、左右方向、折返、連滑、取消、失敗、Reduced Motion、可玩與預覽專用地圖。桌面測滑鼠與觸控板，實機測手機橫直向。確認每次手勢只選一次，進入比賽與返回首頁仍正常。
- [ ] 同機、同圖、同方向保存改前／改後錄影。驗收要求是露出 B 的第一格即能辨認 B，之後直到 B 動起來，回閃 A、空白或全螢幕宣傳圖的幀數都是零。比較手勢幀時間與選取到首幀耗時；遮住等待不等於加快載入。
- [ ] 跑 `node --test tests/track-swipe-ui.test.js tests/module-size.test.js`、`pnpm run build`、`pnpm exec playwright test tests/track-swipe-browser.spec.js` 及 `make verify`。把 RED/GREEN、兩段錄影、實機結果寫入 `TODO.md`；授權推送後核對相同 commit 的 GitHub quality-gate。
