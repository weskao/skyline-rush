<!-- source-sha256: 348747ec277a40b240716af11cbfefeae9172ff77b14c8a544242551b58d1606 generated from README.md by scripts/readme-zh.mjs; edit README.md, then run the script -->
# Skyline Rush

[English](README.md) · **繁體中文**

[**開始遊玩 Skyline Rush →**](https://weskao.github.io/skyline-rush/)

一款可遊玩的 3D 海岸公路衝刺遊戲，主角是一輛飛行電動跑車，造型參考 Tesla Roadster 2 及其火箭推進器概念。藉由四具藍色推進器升空，與三名對手競速、飛越車流、管理電量，並降落補充電量。操控手感為虛構的街機物理；這是非官方的粉絲專案，與 Tesla 或 SpaceX 無任何關聯。

## 遊戲簡介

在 Classic Race 中，Skyline Rush 是一款可在瀏覽器中遊玩、短小且耐玩的街機衝刺遊戲：一名玩家對上三名對手與其間的車流，桌機或手機皆可，無需安裝任何東西。其他模式提供單人駕駛、自訂規則與多階段挑戰。

- **先駕駛，再飛行。** 車速超過 65 km/h 後，按住 FLY 即可升空，飛越車流、穿過光環、跨越斷橋。飛行與 BOOST 共用同一份推進器電量，且只有在路面上才會回充，因此每一次爬升都是一種取捨。
- **靠好好駕駛賺取 NITRO。** 驚險超車、飄移、光環組合（PERFECT LINE）、尾流、落地桶滾與拾取物，會填滿三格 NITRO 儲備；可一次爆發用完，或連按延長。
- **十條賽道，依序解鎖。** 黃昏的 Coast、雨夜且有低矮隧道的 Neon Downtown、有斷橋與側風的 Canyon Skyway、有冰面與上坡的 Aurora Pass、擁有跳躍坡道與斷裂天橋的 360° 高架螺旋 Sky Spiral，接著是 World Tour：Taipei Heritage、Tokyo Afterdark、Alpine Rail Pass、Coastal Horizon 與 Cosmic Orbit。每條賽道都有一條空中捷徑，留給能在空中穩住路線的玩家。
- **有目標可追。** 每次完賽都會獲得風格星數，用來解鎖 Garage 中的塗裝。最佳成績幽靈車、擁有專屬排行榜的每日挑戰，以及四枚獎章，讓你有理由再賽一場。

一場 Classic 衝刺約一分鐘；多階段挑戰則需要更久。音效由瀏覽器即時合成，進度儲存在本機儲存空間，因此不需要帳號，也沒有後端。

https://github.com/user-attachments/assets/e0ddb94c-794e-49ab-9b66-51cb5150f101

<p align="center"><img src="artifacts/readme-tracks.jpeg?v=20261102a" width="70%" alt="十條賽道中的四條飛行畫面：Neon Downtown、Aurora Pass、Sky Spiral 與 Tokyo Afterdark"></p>

<p align="center"><img src="artifacts/readme-start.zh-TW.jpeg?v=20261102a" width="49%" alt="含遊戲模式、賽道與 Start race 的開始畫面"> <img src="artifacts/race-results.zh-TW.jpeg?v=20261024a" width="49%" alt="創下個人最佳成績的比賽結果畫面"></p>

### 在手機上遊玩

支援直向或橫向的觸控操作；AUTO 會持續按住加速。[觀看 MP4](artifacts/mobile-demo.mp4)

<p align="center"><img src="artifacts/mobile-home.jpeg" height="300" alt="行動裝置直向開始畫面與賽道選擇"> <img src="artifacts/mobile-landscape-flight.jpeg" height="300" alt="行動裝置橫向飛行畫面，按住 FLY 並顯示觸控按鈕"></p>

以 Chrome 行動裝置模擬（390×844 與 844×390）在全新設定檔下擷取；並非實體手機的效能量測。

## 遊戲模式與重玩價值（開發分支）

> **開發中 · 2026 年 10 月 29 日。** 這些模式新增內容整合於 `feature/roadmap-integration` 開發分支，尚未合併至 `main`，也未包含在[已部署的 GitHub Pages 版本](https://weskao.github.io/skyline-rush/)中。

選擇一條**已解鎖的賽道**，在賽道卡片下方選擇 **GAME MODE**，必要時展開規則說明，然後按下 **Start race**（或 Enter）。比賽仍使用相同的 Three.js 道路、飛行、FLY / BOOST / NITRO 與響應式觸控操作。開發分支包含以下模式：

| 模式 | 變化內容 | 勝利條件／進程 |
| --- | --- | --- |
| **Classic Race** | 標準的 3 名對手衝刺，可在 10 條賽道之一進行，含車流、捷徑、光環與 NITRO。 | 登上頒獎台可解鎖下一條賽道；只有 Classic 會頒發生涯星數、獎章與官方最佳成績。 |
| **Custom Race** | 選擇 **0–3 名對手**、Easy / Normal / Hard 的 AI、Off / Light / Normal / Heavy 的車流量、NITRO 拾取物開關，以及 Normal / Relaxed 的碰撞懲罰。有五組預設：Standard、Traffic Rush、No Items、Air Focus 與 Precision。 | 非排名成績有獨立的歷史紀錄。可進行 **1 / 2 / 3 / 5 段衝刺**並比較總時間。各段重播的是點對點路線，**並非環形賽道的圈數**。 |
| **Free Drive** | 獨自探索任何已解鎖的賽道，可調整路上車流與拾取物，沒有名次，也不強制取勝。 | 自由駕駛、飄移與飛行直到道路盡頭；抵達終點即結束本次行駛並顯示結果畫面，不儲存任何紀錄。這**不是**無限世界模式。 |
| **Time Attack** | 單人計時衝刺，具相容的最佳成績 Ghost 與領先／落後分段時間。可選擇開啟 **Clean Time Trial**。 | 依賽道與規則分別記錄最佳時間；Clean 行駛中只要發生任何碰撞即視為無效，不會取代個人最佳成績。 |
| **Obstacle Run** | 以種子產生的路邊路障；**Standard** 或 **Extreme** 密度。部分障礙物會橫向掃過；警示 HUD 會預告接近的危險。 | 閃避危險、以乾淨通過賺取風格分數，並使用一般路線的終點。障礙物配置與碰撞共用確定性邏輯；Classic 不受影響。 |
| **Checkpoint Rush** | 穿越發光的 3D 拱門。起始 **28 秒**；每通過一道門可獲得 **+10 秒**（上限 60 秒）與 **250 風格分數**。 | 在倒數結束前通過每一道門並抵達終點。漏掉的門與超時都**不會**儲存有效的最佳成績。HUD 顯示已通過的門數、剩餘時間與到下一個目標的距離。 |
| **Championship Cup** | 選擇由已解鎖路線組成的 **3 條或 5 條賽道** Cup；在每一站對上 NOVA、ORBIT 與 APEX。 | 名次可獲得 **10 / 7 / 5 / 3 分**；以累計積分與總時間決定冠軍，同分時以時間決勝。Cup 結果與生涯解鎖分開計算。 |
| **Stunt Attack** | **120 / 180 / 300 秒**的風格賽程，包含連續多場分組賽：飄移、空中特技、驚險擦身而過與光環累積連擊分數。 | 由計時器而非終點線結束賽程；每種時長各有本機風格獎章與最佳分數。 |
| **Elimination** | 四名賽車手的 Last Driver Standing：每十秒淘汰目前最後一名的車手。 | 存活到最後一名車手；若提早被淘汰，本次行駛結束且無獎勵。 |

### Cup 恢復

未完成的 Championship Cup 會在首頁提供 **Resume** 或 **Discard**。Resume 會保留已結算的各站積分，只重新開始未完成的那一站；重試只會回溯正在重玩的那一站。完成或捨棄 Cup 都會清除其恢復項目。刪除遊戲進度也會一併移除檢查點，但會保留裝置偏好設定。恢復功能使用此瀏覽器的儲存空間，無法還原瀏覽器拒絕儲存的資料。

### 自訂呈現與幽靈車

Custom Race 可為每一段衝刺重播最快且相容的幽靈車。Custom 與 Free Drive 提供 Track / Day / Dusk / Night / Rain / Fog 的呈現預設與即時規則摘要。這些外觀選擇不會改變紀錄資格或規則集識別。重試會保留所選外觀；更換賽道或返回 Classic 會還原該賽道的外觀。Photo Studio 關閉時會還原目前比賽的外觀。

### 可選道具與獎勵門

Custom 與 Free Drive 提供 **Off / Classic Mystery Rings / Active Items / All Items**。持有的道具佔用單一欄位：按 **Q** 或點選 **USE** 啟動，然後等待冷卻。NITRO 與 FLY/BOOST 保有各自的操作。All Items 會加入有上限的速度、空中電量與一次碰撞恢復的門；EMP 會短暫減慢附近的對手，在單人遊玩時則轉為 Magnet。恢復不會影響官方碰撞次數。Stunt Attack 與 Checkpoint Rush 可另外選擇啟用暫時、不可疊加的 ×2 分數門。Classic 的預設值維持不變。

### Event Lab Lite v1

**Event Lab Lite** 可編輯本機賽道範本，在已解鎖的路線上放置路障、NITRO 光環與補給。可變更它們的車道與距離、復原／重做／重設編輯，並以文字匯入或匯出經過驗證的賽道。開始時會將賽道編譯為真正的比賽事件；重試會保留賽道與種子。賽道成績與生涯及 Custom 紀錄分開。圓錐、自訂坡道、檢查點編輯與社群分享不在此首版範圍內。

### Endless Highway

**Endless Highway** 將 Coast 延伸到原本的終點之外，成為以距離為目標的生存活動。車流難度會上升至固定上限；發生五次碰撞即結束一次完整嘗試。個人紀錄追蹤最長的絕對距離，與生涯及幽靈車分開。暫停與 WebGL 恢復都會保留行駛進度。此首版僅支援 Coast；其附近的景物與事件使用有上限的物件池。

### Circuit Race

**Circuit Race** 新增 Harbor Circuit，這是一條獨立、隨時可進入的 2 公里封閉環形賽道，提供 **1 / 3 / 5 圈**。依序通過每個區段才算一圈；反向通過、傳送與恢復都不能獲得圈數。HUD 與結果畫面會顯示分段時間、上一圈、個人最佳圈速與總時間。最佳圈速不受滾動式 History 淘汰影響；總時間與幽靈車則依圈數設定分別記錄。十條原有的點對點賽道維持其地理配置與生涯進程。

### 賽道主題、障礙物與風險路線

- **賽道主題**（可於 Custom、Free Drive 與 Obstacle Run 中選擇啟用）讓每條路線擁有專屬的危險：Coast 的貨物與陣風、Neon 的道路施工、Canyon 的落石、Aurora 的雪堤、冰面與暴風雪、Sky Spiral 的能量門、Taipei 的慶典路障、Tokyo 的號誌門、Alpine 的雪崩、Coastal 的浪花，以及 Cosmic 的能量牆。危險會事先預警，永遠保留兩條車道暢通，且絕不改變 Classic。
- **Obstacle Run** 提供 **Mixed obstacles** 賽道：橫掃的閘門、墜落的碎片，以及路障上方的光環，獎勵飛越或繞行的玩家。
- **風險路線**：高風險光環與驚險超車在 Custom Hard 中獎勵更高，也可關閉以進行輕鬆練習。
- 道路新增了非實體的路邊生活景象：觀眾、廣告看板、維修廂型車、鐵路月台、行駛中的列車、船隻與無人機。較低的畫面設定會減少繪製這些內容。

### 比賽設定、結果與無障礙

- 模式與賽道選擇皆可透過鍵盤與觸控操作；情境面板只顯示與所選模式相關的選項。無法使用的 Cup 會說明還需要多少條賽道。
- HUD 會依模式調整：單人活動會隱藏容易誤導的對手名次；多階段與 Cup 賽程會顯示階段進度；Checkpoint Rush 顯示即時的門倒數；Obstacle Run 會警示接近中的路障；Clean Time Trial 會清楚標示已失效的行駛。
- 練習、Custom、Time Attack、Obstacle、Checkpoint 與 Cup 的結果使用獨立的 `skyline-rush-mode-history-v1` 紀錄鍵。符合資格的練習幽靈車有各自儲存的規則集；Classic 的解鎖、星數、獎章、Daily 紀錄與官方時間不會受練習行駛影響。
- 在 **History → Challenge records** 中，可依模式篩選，查看每個確切賽道／規則集的個人最佳成績與符合資格的 Time Attack 幽靈車。即使最近 50 筆行駛輪替掉，終身最佳成績仍會保留，儲存於 `skyline-rush-mode-bests-v1`。Challenge 紀錄明確不屬於生涯獎章或星數。
- 模式標籤、結果說明、設定選項與危險警示支援英文與繁體中文。低畫質、觸控操作與減少動態效果仍列在驗證計畫中。

### 真實遊戲截圖與驗證

用來檢視這些模式的截圖皆**擷取自執行中的瀏覽器遊戲**，並非概念圖。[下載實際的 Playwright 擷取圖集](https://github.com/weskao/skyline-rush/actions/runs/39742666980/artifacts/12410172411)（Custom 單人、Free Drive、Time Attack、Obstacle Run、Extreme 障礙物、Checkpoint Rush 與行動裝置模式選單）。GitHub Actions 的成品可能需要登入，且會過期；若要在本機重新產生，請執行 `npx playwright test tests/race-modes-browser.spec.js` 並開啟 `test-results/race-mode-*.png`。CI 截圖為軟體算圖且解析度較低，無法代表最終裝置上的畫質。

**驗證：** 每項功能的測試與完整關卡收據都列於 `TODO.md`。實體 iPhone 與 Android 的檢查仍待進行。

## 在本機執行

需要 Node.js 22.12 或更新版本，以及支援 WebGL 2 並啟用硬體加速的瀏覽器。

```sh
cd "$HOME/Documents/Workspace/skyline-rush"
make         # Installs dependencies on first run, then starts the Vite + Vue dev server
```

開啟 Vite 印出的本機網址（通常是 http://127.0.0.1:5173）。資源與字型皆在本機打包；遊戲過程不會發出任何外部請求。不需要後端或帳號。

`make` 與 `make dev-unlocked` 也會啟動本機的 Firebase Auth/Firestore 模擬器（需要 Java 21+），因此雲端存檔的 Google 登入可搭配假的測試帳號運作，絕不會碰到真實存檔。專案擁有者的雲端存檔操作與 Spark 配額檢查請見 `docs/cloud-save.md`。

`make dev-diag` 與 `make phone-diag` 提供相同的建置，但編入了畫面上的診斷橫幅（影格計數器、頁面生命週期與觸控事件及其點擊目標，以及跨重新載入保留的最後幾筆未捕捉錯誤），用於在真實手機上追查當機或按鈕無反應的問題。正式版建置絕不包含它：`npm run build` 會拒絕含有診斷模組的 bundle。

`make phone` 會開啟終端機選單，用以啟動、檢查或停止可讓手機開啟的開發伺服器（透過 Tailscale 或同一個 Wi-Fi），並在伺服器回應後印出手機網址。選單會列出此工作目錄、其他 worktree 與最近的分支，也可輸入分支名稱；`make phone <name>` 會直接前往該分支（或 `feature/<name>`），必要時在 `.claude/worktrees/` 下建立其 worktree，`make phone off` 會停止它啟動的所有伺服器（如同 `/phone-dev off`），而 `y=1`（例如 `make phone y=1 <name>`）會略過選單：每個問題都採用其 Recommended 選項，並印出每個選擇。當某個連接埠已被本專案先前啟動的伺服器（任何 worktree）占用時，重用該連接埠即為 Recommended 的答案：舊的伺服器會被停止，網址維持不變；`make dev`、`make dev-diag`、`make dev-unlocked`（5173）與 `make dev-feature`（5443）會不經詢問直接這麼做，並且不會動到其他專案的伺服器。它提供一般的鎖定版建置；`make phone-unlocked [name]` 是同樣的選單，但所有賽道與塗裝皆已解鎖，是唯一手機可連上的全解鎖伺服器（`make dev-unlocked` 與 `make dev-feature` 僅限桌機）。除了加入 `src/upcoming-tracks.ts` 中 `PLAYABLE_PREVIEW_IDS` 的 id 之外（且僅在其真正的比賽執行階段已進入 `RACE_TRACKS` 後），Coming Soon 卡片在所有建置中都只能預覽；此時 `make dev-unlocked` 與 `make phone-unlocked` 會讓該卡片可以開始，正式版則永遠不會。它需要個人的 `phone-dev` Claude Code 技能（`/phone-dev` 會詢問相同的選單），且在沒有模擬器的情況下執行，因此手機上的雲端存檔登入使用的是真實專案。

## 操作方式

| 動作 | 鍵盤 |
| --- | --- |
| 加速 | W / ↑ |
| 煞車 | S / ↓ |
| 轉向 | A / D 或 ← / → |
| 飛行 | 車速超過 65 km/h 後按住 Space |
| 降落 | 放開 Space |
| 推進 | 按住 Shift；消耗推進器電量 |
| NITRO | E / X（一整格電量；NITRO 期間再按一次可延長）。WASD 玩家使用 E；方向鍵玩家則讓左手維持在 Shift / X / Space 上 |
| 飄移 | 在 162 km/h 以上按住 S + A / D（僅限地面） |
| 開始 | Enter |
| 暫停／繼續 | Esc / P |
| 重新開始 | Backspace |
| 切換視角 | C |
| 全部音訊靜音／取消靜音 | M |
| 自動加速 開／關 | F2 / AUTO 按鈕 |
| AIRFLOW 展示 開／關 | V / AIRFLOW 按鈕 |
| 在首頁切換賽道 | 向左／右滑動或拖曳 3D 預覽，或在觸控板上用雙指滑動 |

行動裝置版面提供轉向、加速、煞車、推進、飛行與 NITRO 按鈕。觸控操作支援同時按住多個按鈕。AUTO 會持續按住加速，讓你專心轉向與飛行；煞車永遠優先於它。每種裝置預設皆為開啟；一旦你切換過，你的選擇會記錄在此瀏覽器中（`skyline-rush-auto`）。離開分頁會暫停比賽並清除按住的輸入。比賽中點選 SKYLINE RUSH 標誌會暫停並先詢問：**Keep racing**、**End race**（返回賽道選擇，不儲存本次行駛）或 **Back to home**（重新載入）；無論選哪一個，開始畫面都會重新開啟在剛比賽完的賽道上，並捲動到賽道列的中央（第一條與最後一條賽道位於其兩端）。Esc 會讓比賽維持暫停。視角與音效快捷鍵會保留按住的駕駛操作。在觸控上，在轉向板上將拇指向下滑動會煞車，向下並向側邊滑動則會飄移；在 Buttons 模式下，一個較細的煞車鍵位於轉向按鈕上方，避開拇指休息的那一列，因此只有刻意才會按到；從 ← 或 → 將拇指向上滑入煞車鍵會同時保持轉向並煞車，因此單一拇指即可飄移，而滑回下方則會放開煞車。觸控按鈕與螢幕角落保持距離，讓拇指更容易觸及，平板則會將它們抬高並放大。

比賽前或暫停時開啟 **Controls**，可調整鍵盤轉向靈敏度或重新對應駕駛動作。選取一個動作，然後按下一個按鍵；衝突的按鍵設定會互換，固定的快捷鍵保留不可更動，按 Escape 可取消擷取。Reset keyboard 會還原預設值。按鍵設定會立即生效，並儲存在 `localStorage['skyline-rush-keymap']` 下。手機與平板在按下實體（例如藍牙）按鍵之前會隱藏鍵盤區段；之後該鍵盤會被記錄在 `localStorage['skyline-rush-keyboard-seen']` 下。

同一個面板也控制觸控轉向模式、慣用手、滑動靈敏度、大小、不透明度，以及按住／切換式 FLY。**Edit touch layout** 讓你在比賽預覽上拖曳動作按鈕與經典轉向按鈕；**Done editing** 會保留排列方式，**Reset touch layout** 則會還原。位置在重新載入後仍會保留、會隨慣用手鏡像，並在旋轉後保持於可視範圍內。在較短的橫向螢幕上（高度低於 380 px，例如工具列顯示時的 iPhone Safari），開始畫面會捨棄其標語，讓 START RACE 不需捲動，比賽 HUD 也會隱藏速度表與次要電量列，以免面板互相重疊。

所有音訊皆以 Web Audio 合成；不需要下載任何音訊。背景音樂有兩首循環播放的 synthwave 曲目：開始與結果畫面使用的序曲主題（約 64 秒），以及從倒數開始播放、節奏更快的比賽主題（約 55 秒）。每首都會在其循環中逐步堆疊，並在暫停時降低音量。音效涵蓋選單確認、三聲倒數滴答與 GO、馬達／風聲、升空與推進、煞車、車輛／護欄碰撞、著陸、低電量警示、驚險超車獎勵，以及完賽旋律。將音效靜音會停止待播的提示音，暫停則會淡出駕駛音效。低電量警示只有在電量回充到 30% 以上後才會重新啟用。

喇叭圖示會開啟音訊設定，內含 Music 列與 Sound effects 列，各有一個靜音開關與一個音量滑桿（如上方開始畫面截圖所示的展開狀態）。**Mute all**（或 M）會同時讓兩者靜音。靜音會保留各頻道的音量，因此取消靜音會回到原本的音量；把滑桿拖到零，也會以同樣方式讓該頻道靜音。兩者預設皆為開啟、音量 100%，每個開／關選擇與音量都會記錄在 `localStorage` 中（`skyline-rush-music`、`skyline-rush-sound`，值為 `on`/`off`，另有儲存百分比的 `-volume` 變體）；若未儲存任何值，兩個頻道皆為開啟，並會以 `on` 儲存。在較短的螢幕上，面板可捲動。在瀏覽器允許自動播放的情況下，頁面一載入就會開始播放序曲音樂。若不允許（Chrome 與大多數其他瀏覽器首次造訪時），則由第一次點選、點擊或按鍵來啟動。在 iPhone 與 iPad 上，遊戲會要求媒體播放，因此靜音開關不會使它靜音；這也會在遊戲進行時暫停其他 App 的音訊。

飛行面板會顯示爬升、巡航、下降與觸地、剩餘推進秒數，以及下一個該使用的操作。青色光環標示出空中走廊，並且是遊戲玩法的一部分：請見下方的 Rings。行動裝置也有按住推進的按鈕。橘色的碰撞報告會顯示撞擊類型與損失的速度；護欄現在會反彈並使地面上的車輛減速。飛越護欄上方則可避開它們。

場景包含泛光照明、日落水面、懸索橋、推進器蒸氣、碰撞火花與觸地漣漪。視角運動與非必要的速度線條會遵從系統的減少動態效果偏好設定。音效為推進、碰撞與著陸提供各自獨立的回饋。

**VFX**（右上角）可選擇 Realistic、Cinematic 或 Extreme 的外觀、Low / Medium / High 的畫質（Low 會關閉泛光並減少繪製的景物）、Comfort mode（無閃光、震動、殘影或模糊），以及可選的觸覺回饋。其 **Race HUD** 區段可選擇 Immersive 或 Competitive（含排行榜、小地圖與次要統計的開關）、開啟或關閉 NITRO READY 的音效與動畫，**Reset HUD to default** 則會還原這些設定。**Fine tuning** 將每個效果以滑桿呈現，**Reset visual settings** 會還原預設值。**AIRFLOW**（或 V）會將場景切換為空氣動力學展示：車身上的流線、遙測面板、Low drag 或 High downforce，以及駕駛、前方、後方、側面或環繞的視角。開始面板會讓位給展示畫面，只留下橘色的 **START RACE** 按鈕，固定在車子下方的底部中央；向左或向右滑動場景可切換賽道。第一次開啟 AIRFLOW 時，會有一個動畫指尖示範該手勢。流線只會在 AIRFLOW 開啟時出現：關閉時，BOOST 與 NITRO 會顯示推進器噴流、尾跡與速度線條，但不含流線。

三顆琥珀色起跑燈會在 GO 時轉為青色。玩家的車是一輛低矮的楔形跑車，具有煙燻色的快背式座艙、橫貫整個車寬的紅色尾燈條、四個後推進器噴口、會在推進、煞車與飛行時升起的青銅色彈出式尾翼、轉動的五輻輪圈，以及可轉向的前輪。每位對手都有各自的輪廓與燈光特徵：NOVA 是長尾車款，配有雙垂直尾翼與分離式洋紅色燈光；ORBIT 是圓潤的 GT，具有泡泡型座艙與圓形青色車燈；APEX 是賽道車，配有前分流器、車頂進氣口、高聳的端板尾翼與琥珀色 C 形燈。車流使用直立的通勤車造型。轉向會快速緩入，放開推進時車子會逐漸減速，而不是瞬間切斷速度。所有駕駛與工具列按鈕的觸控目標至少為 44px，包括在 320px 寬度下。

若想獲得額外的電量獎勵，請在地面上以 126 km/h 以上的速度近距離超越車流。五秒內的乾淨超車最多可連鎖到 ×5，並回充 8–16% 的電量（上限 100%）。碰撞會中斷連鎖；在空中、距離遙遠與恢復期間的超車不會獲得獎勵。HUD 會播報每次超車與最後 500 公尺；結果畫面顯示總驚險超車次數與碰撞次數。

滿推力飛行的電量約可持續五秒。電量歸零時，車子會自動下降；放開飛行操作並在地面上駕駛即可回充。同一份電量也供推進使用。碰撞會使車子減速；飛得夠高即可避開車流。對手與車流遵守相同的碰撞規則：它們會繞開較慢的車輛與玩家，像你一樣撞上道具、護欄與危險物，而一次衝撞會讓雙方的車都減速並被推開（車流隨後會加速回到巡航速度）。在 NOVA、ORBIT 與 APEX 之前完成衝刺（依賽道而定為 4–8 公里）。在儲存空間可用時，個人最佳時間會儲存在此瀏覽器中。

### 操控手感

轉向會在 0.15 秒內達到最大，且在高速時側向速度上限為 9 m/s。在 65 km/h 以下按住 Fly 會被記住 1.5 秒，並在速度足夠時自動升空。在空中放開 Fly 會降低下墜加速度（11 → 7 m/s²）以便更柔和地著陸，並緩慢回充飛行電量（每秒 4，為地面速率的三分之一；電量說明文字顯示 GLIDE RECHARGE ACTIVE）。耗盡的推進器在放開 Fly 且電量回到 15 後會再次解鎖，即使在空中也一樣。在斷橋前 300 公尺內（Sky Spiral 除外，其坡道會將車子拋過去），只要剩餘電量以目前速度無法推進越過，HUD 中央就會警示 GAP AHEAD · NEED n% CHARGE。碰撞判定中車輛寬 1.7 公尺，因此更多的超車會算作驚險擦身而過。輕微觸碰護欄屬於擦撞（保留 0.92 的速度，被推回路面，不算碰撞，連擊保留）；正面撞擊仍計為碰撞。開啟 AUTO 時，放開轉向也會讓車子緩緩回到最近的車道中央（車道輔助）。同時按住 Fly + Boost 每秒消耗 22 電量而非 29，維持推進的速度上限，並顯示 AIR DASH。

### NITRO 與飄移

NITRO 擁有自己的儲備（`player.nitro`，最多 3 格，每格以浮點數填充）。三段式 HUD 會顯示部分電量，滿格的區段會發光，NITRO MAX 在滿格時會脈動（在舒適／減少動態效果模式下會抑制動態）。賽道上的拾取物（藍色電池 +0.25、橘色罐子 +0.5、空中金色油箱 +1、一個彩虹過充，可補滿至上限）與光環遵循相同的規則：起跑格上每輛車 5 個欄位，每個欄位為 1 到 4 個一組（該欄位的拾取物，然後沿其路線每隔 8 公尺一個電池），再加上過充與每條捷徑的獎勵路線，每場比賽都會重新隨機；每一次 NITRO 獎勵（拾取物、飄移、桶滾、光環、尾流）也會回充飛行電量（每儲存 0.25 = +5；過充不提供），而超出上限的部分會轉為電量（每 0.25 = +8）。一格 NITRO 可提供 2.5 秒，速度上限提高 30 m/s、加速更強，並有排氣與鏡頭回饋；再按一次會延長 2 秒且不疊加速度，因此連按三次可連成 6.5 秒的爆發。NITRO 期間與車流碰撞會保留 70% 的速度，而非 45%。

在地面上超過 162 km/h 時，煞車 + 轉向會飄移，而非緊急煞車：只損失 3 m/s²，驚險擦身連擊分數加倍，放開時會依飄移時間給予 NITRO 與迷你推進（1 秒：+0.15 與 0.5 秒，2 秒：+0.3 與 0.8 秒，3 秒：+0.5 與 1.2 秒）。車身偏擺 25°，煙霧與藍／橘／紫色火花會顯示等級，輪胎尖嘯聲逐漸增強，HUD 會標示飄移／迷你推進的狀態。起飛、掉入缺口，或撞上車輛或路障都會失去累積的進度。

NITRO 不消耗電量，因此 Fly + NITRO 永遠可以同時使用（Fly + Boost + NITRO 會維持每秒 22 的 AIR DASH 消耗）。

**空中特技**：飛行時，快速甩動轉向（0.3 秒內連按兩次相反方向）會啟動 0.7 秒的桶滾。在低於 11 m/s 的速度下完成桶滾並著陸可獲得 +0.25 NITRO；較猛烈的著陸（從約 9 公尺以上無動力下墜）則會失去獎勵。過早著陸、撞到任何東西、隧道頂或缺口都會取消桶滾。車子會旋轉（減少動態效果與 Comfortable VFX 會保留文字但取消旋轉），HUD 顯示 TRICK，並以 BARREL ROLL / TRICK +0.25 / HARD LANDING 提示、一聲呼嘯與觸控時的短促觸覺震動標示桶滾及其獎勵。

**捷徑**：每條賽道都有一條空中走廊，位於邊緣車道上方 6 公尺，標示為 SHORTCUT / FLY HIGH。在其中飛行不消耗電量，速度上限提高 12 m/s；沿途排列著 NITRO 電池，中途有一個油箱，但交錯的塔柱會算作撞到路障。走廊地板以一片該賽道主題色的半透明平台標示；在其中時，HUD 顯示 SHORTCUT，飛行預算顯示 ∞（BOOST 仍會消耗電量）。

### 光環

每場比賽每輛車在起跑格上有 5 個光環欄位（單人行駛為 5，完整八車起跑格為 40；Circuit 則為每圈），從起點到終點散佈，每段等長的道路一個，以 3 到 5 個為一組。在平坦路面上（避開隧道、缺口、捷徑與其他區段），約每五個欄位中有一個會變成一串 6 個光環、相隔 25 公尺，沿中間車道（車道 2 或 3，因此直線行駛即可連鎖每一個光環）排列，大多位於路面上，五分之一在空中，這本身就是一次 PERFECT LINE；約每十二個欄位中有一個會變成全寬的光環列，路上任何車輛都能通過，每輛車算一個光環。風險光環與前兩個欄位維持單一個。Endless 每 500 公尺的區塊有三個單一光環、一串中間車道光環、每三個區塊中有一個全寬光環列，以及五組拾取物。它們的位置每場比賽都會重新隨機。Coast 的閘門線維持在 x 2.5。只有當車子穿過其可見半徑時光環才算數；擦到邊緣不算。類型：青色電量（+20 電量）、金色 nitro（+0.5）、紫色尾流（3 秒迷你推進）、紅色風險（較小的光環，+1 NITRO 與 500 分）以及彩虹神秘（依種子隨機的一種效果：10 秒或直到第一次碰撞的護盾、5 秒的磁鐵、3 秒穿越車流的幽靈，或讓對手以半速凍結 2 秒）。被收集的光環會爆開一次然後消失。清空整組會播報 PERFECT LINE 並獎勵 +1 NITRO；漏掉一個光環會中斷它，但保留已獲得的獎勵。

### 對手、尾流與最後衝刺

緊貼在對手或車流車輛後方 1.5 秒，可獲得 +6 m/s 的速度上限與 +0.25 NITRO（離開尾流後才會重新啟用）。對手也會使用 NITRO，各兩格，依個性而定：NOVA 從 8 秒起穩定施放，之後每 18 秒一次；ORBIT 在飛行時施放；APEX 從比賽進行到 75% 時爆發。輕度的橡皮筋機制（在超過 50 公尺之外最多 ±4% 速度）讓比賽保持緊張。在最後 500 公尺，比賽音樂會加速到 115%，狀態列會顯示與前方及後方最近對手的差距（`FINAL 500 M · +N m · −N m`）。

### 儲存的資料

所有存檔都使用 try/catch，因此即使儲存空間被封鎖，遊戲仍能執行。`skyline-rush-history`：每場完賽一筆紀錄，保留最近 50 筆，包含 `fuelOuts`（飛行電量耗盡的次數）與 `gapFalls`，用於調整飛行平衡。從開始或結果畫面開啟 **History**，可依賽道篩選、查看最佳行駛與最近十次時間的圖表，並點選某次行駛查看詳細資料。`skyline-rush-best-tracks`：每條賽道的最佳時間；舊有的單一 `skyline-rush-best` 會一次性遷移到 `coast`，並且仍會為 coast 寫入。`skyline-rush-unlocked`：賽道解鎖，即使較舊的行駛已離開 History 也會保留。`skyline-rush-keymap`：按鍵設定。`skyline-rush-controls` 與 `skyline-rush-vfx`：駕駛與視覺設定（幽靈車開關位於 controls）。`skyline-rush-ghosts`：每條賽道一個最佳成績幽靈車。`skyline-rush-medals`、`skyline-rush-stars`、`skyline-rush-paint`：附有獲得日期的獎章、每條賽道的最佳星數、已裝備的塗裝。`skyline-rush-daily`：每日挑戰行駛，保留最近 50 筆。每個儲存的值在載入時都會驗證；任何格式錯誤的內容都會被忽略。

### 幽靈車、每日挑戰、獎章與 Garage

- **幽靈車**：每次行駛會以每秒 10 次的頻率取樣車子的距離、車道位置與高度。在某條賽道上創下新的個人最佳成績會儲存該次行駛，之後在該賽道上的比賽會將它顯示為一輛半透明的藍色車。預設為關閉；請在 Controls 中以 **Show best-run ghost** 開啟。
- **每日挑戰**：History 會顯示今天的賽道與修飾條件，依本機日期挑選：禁止飛行、雙倍車流，或僅限金色光環。Canyon 永遠不會出現禁止飛行，因為它的斷橋需要飛行。每日行駛只會進入各自的排行榜（今日最快的五名）；絕不會影響歷史紀錄、最佳時間、解鎖、星數或幽靈車。重新開始會保留該挑戰，而 **Choose track** 則會離開它。
- **獎章**：First victory（獲勝）、Clean run（無碰撞）、Perfect flight（單場比賽中 5 次 PERFECT LINE）與 Triple burst（一次爆發中使用 3 格 NITRO：一次按下加兩次延長）。只有符合資格的 Classic Race 完賽才能獲得；每枚獎章都會保留其首次獲得的日期。
- **Garage**：你在每條賽道上的最佳風格星數會加總並解鎖塗裝：3 星解鎖 Aurora、6 星 Glacier、10 星 Coral、16 星 Cobalt、24 星 Obsidian（上限為 30）。現實世界中最受歡迎的車色——藍色與黑色——是長期目標。未解鎖的塗裝仍可預覽。塗裝只改變外觀，絕不影響車子的能力數值。

### Sky Spiral（實驗性的第五條賽道）

Sky Spiral 在賽博龐克天際線之上新增了一條真正的 3D 上升螺旋道路。繞著發光的中央高塔完整行駛一圈水平迴旋，然後從三個專用坡道發射，飛越高架缺口。既有的 FLY、BOOST 與 NITRO 都能在新賽道上使用，並提供可選的飛行修正。這條賽道使用獨立的彎曲道路算圖器與自己的 3D 路徑對映器；目前仍在實體行動硬體上進行驗證。

### 賽道與風格

從 Coast 開始。取得前三名即可解鎖 Neon Downtown，接著依序是 Canyon Skyway、Aurora Pass、Sky Spiral、Taipei Heritage、Tokyo Afterdark、Alpine Rail Pass、Coastal Horizon 與 Cosmic Orbit。開始前先選擇賽道，或向左或向右滑動 3D 預覽（用滑鼠拖曳，或在觸控板上用兩指橫向滑動），像輪播一樣翻到相鄰的賽道：它會跟隨手指，輕輕一撥就足夠，第一條與最後一條賽道會有橡皮筋回彈效果，並有一個標籤顯示賽道名稱與分頁圓點；鍵盤使用者可用左／右方向鍵在賽道按鈕之間移動，並以 Enter 選擇。重新開始會保留所選的賽道；結果畫面上的 **Choose track** 會返回選單。當仍有賽道處於鎖定狀態時，登上頒獎台後結果畫面會顯示一個脈動的 **Next** 按鈕，立即開始新解鎖的賽道；一旦所有賽道都已開啟，以及在每日挑戰中，它就會消失。若瀏覽器中斷 WebGL 連線（在 iPhone 鎖定或切換 App 後很常見），遊戲會在圖形恢復時清除警告；否則 **Start** 或 **Race again** 會重新載入頁面。每條賽道都有自己的天空、色盤與程序式生成的景物：雨中的霓虹街道與低矮隧道、紅色沙漠峭壁與斷橋缺口／側風，或有極光與冰面的雪山。警告標誌會標示特殊區段。Aurora 的上坡區段以一半的正常速率回充地面電量。

### World Tour 賽道、路線圖與賽道名稱

五條 World Tour 賽道共用一個彎曲道路算圖器（`src/world-tour-scene.js`），每條賽道有各自的色盤、建築與地標（總統府與北門的剪影、霓虹交叉路口與一座塔、鐵路高架橋與山峰、燈塔與跨海大橋、帶環的行星）。在首頁選擇一條 World Tour 賽道時，會在盤旋的車子後方框出其代表性地標：總統府、東京鐵塔、一座高山、燈塔或宇宙之門。朝它行駛時，路邊會讓該地標保持清楚可見。每張賽道卡片都會顯示完整的主要路線，比賽中則有即時地圖在其上標出 YOU、NOVA、ORBIT 與 APEX；空中捷徑絕不會被畫出。在高度低於 500px 的螢幕與高度低於 700px 的窄手機上，即時地圖會退場，排行榜仍會為賽車手排名。賽道名稱依 **EN / 繁體中文** 切換所選的語言而定（請見下方的語言）。

風格分數獎勵驚險超車（100 × 連擊，飄移的連擊加倍）、光環（150，風險光環另加 500）、PERFECT LINE（500）、移動中的滯空時間（每秒 10）以及每 500 公尺的乾淨行駛（100）。碰撞與掉入缺口會重設乾淨距離的進度。結果會授予：完賽一顆星、每公里 250 分兩顆星、每公里 500 分三顆星，與完賽名次無關。

燃料與 nitro 條會緩動至新的數值，在低於 20% 容量時發出警告，回充時閃爍，並在一格 nitro 完成時脈動。Comfort mode 與系統的減少動態效果會停用這些動畫。滑動板在按住時會顯示一個浮動的環／旋鈕，並在比賽開始時顯示簡短提示；放開會讓轉向回到中立。

HUD 使用共用的動態時序（120 / 240 / 480 ms）。速度表指針會隨速度緩動；名次變動時，名次數字會翻轉並帶有綠色向上或紅色向下的箭頭，排行榜列則會滑動到新的位置。精簡的半透明事件提示位於視野中央上方，避開 HUD 面板，並將驚險擦身而過、PERFECT LINE、NITRO 爆發、電量增加與飄移火花等級排入佇列而不重疊；同時回充飛行電量的 NITRO 獎勵會標明這一點（NITRO · +20% CHARGE）。暫停、完賽與重新開始都會清空佇列。按鈕在按下時會變暗但不改變大小，因此一直到邊框內的任何位置按下都會被接收；按住的觸控按鈕會保持亮起。VFX 設定中的可選 **Haptic feedback** 會在支援的觸控裝置上，針對碰撞、NITRO 與飄移獎勵發出提示。Comfort mode 與系統的減少動態效果會保留文字與按下狀態的顏色，同時移除新增的動態與震動。

### 語言

整個介面提供英文與繁體中文（繁體中文）：開始畫面、Garage、History、HUD、比賽提示、結果、路線圖、設定與 3D 路標。開始畫面賽道卡片下方的一個 **EN / 繁體中文** 開關會一次變更全部內容，無需重新載入。語言依以下順序選擇：

1. 你點選開關所儲存的選擇（`skyline-rush-locale`；只有在點選時才會寫入，絕不會從自動偵測寫入）；
2. 你的系統語言順序（`navigator.languages`）：第一個 `en*` 或 `zh*` 項目決定結果，其他語言會被略過（`['ja-JP', 'zh-TW']` 會選擇繁體中文），任何 `zh*` 標籤（zh-TW、zh-HK、zh-Hant、zh-CN、zh-Hans、單純的 zh）都會選擇繁體中文，而空的或缺少的清單則退回使用 `navigator.language`；
3. 否則使用英文。

品牌與遊戲術語在兩種語言中皆維持英文：Skyline Rush、NITRO、FLY、BOOST，以及對手 NOVA、ORBIT 與 APEX。字串位於 `src/locales/`；`src/i18n.js` 負責偵測、`t()` 與目前的語言。

在地化圖片：`node scripts/capture-og-images.mjs` 會在 Chrome 中驅動真實的應用程式，並儲存 `public/og-image.en.jpeg` 與 `public/og-image.zh-TW.jpeg`（1440×900 的開始畫面），以及供繁體中文 README 使用的 `artifacts/{readme-start,readme-hero,mobile-flight,race-results}.zh-TW.jpeg`（`node scripts/capture-og-images.mjs og` 或 `readme` 只執行其中一半）。英文的 `artifacts/` 截圖絕不會被它動到。`public/manifest.webmanifest` 與 App 圖示維持原樣：圖示不含文字，而 Web App manifest 只有單一的名稱與描述，沒有各語言的變體，因此第二份 manifest 會破壞可安裝性。

## 驗證

```sh
npm test                 # Deterministic simulation, input lifecycle and geometry
npm run build           # Production assets in dist/
npm run test:browser    # Real Chrome: desktop, mobile, graphics errors, full race
npm run test:layout     # Home-screen fit, top bar and touch targets (runs on pre-push)
make run                # All three (test:browser builds first)
make deploy             # Trigger CI checks + GitHub Pages deployment of remote main
make help               # List every make command with its options
```

瀏覽器測試使用已安裝的 Google Chrome，並允許無頭算圖使用 SwiftShader。僅使用 CPU 的 CI 採用 0.25 的裝置像素比，以維持 3D 場景的流暢，同時保留相同的 CSS 視窗大小與遊戲斷言；本機測試則以完整解析度算圖。一般遊玩會使用瀏覽器可用的 GPU。英文 README 的截圖只有在檔案不存在時，或以 `UPDATE_ARTIFACTS=1 npm run test:browser` 執行時，才會以 JPEG（品質 70）寫入 `artifacts/`，因為即時 3D 場景每次執行都不同；測試追蹤與結果會被忽略。完整衝刺測試在快速的機器上約需一分鐘，若軟體算圖拖慢模擬則更久。

```sh
npm run preview         # Serve the production build after npm run build
```

要在手機上檢查，請在你的網路上提供建置結果（`npx vite preview --host 0.0.0.0`），並以 `?perf` 開啟（例如 `http://<computer-ip>:4173/?perf`）。畫面頂端會出現一條列，顯示過去 20 秒比賽的影格時間：中位數（p50）、第 95 百分位數（p95）、平均 fps 與取樣長度。沒有 `?perf` 時，不會量測或顯示任何東西。

```sh
make perf BASE=main         # A/B in Chrome at 412×915, CPU throttled 6× (RATE=20 for a low-end phone), 3 alternating rounds
make perf BASE=main VIEWPORT=desktop  # The same A/B at 1440×900 desktop size
make perf-phone             # Like make phone: asks base version, Tailscale/Wi-Fi and Telegram; logs phone temperatures
```

`make perf` 會建置此工作目錄，若帶有 `BASE=<git ref>` 也會建置該 ref（位於 `.claude/worktrees/perf-<sha>`，下次會重複使用），每次在 Coast 上比賽 24 秒，並印出每次執行的列以及各建置的中位數。`make perf-phone` 對於未傳入的內容（`BASE=`、`VIA=tailscale|wifi|auto`、`TG=0`），會像 `make phone` 一樣詢問，並為每個建置印出並傳送一組 `?perf` 網址到 Telegram，在任何以 USB 連接的 Android 手機上以 Chrome 開啟第一個網址（`adb reverse`，因此任何網路都可用），在按 Ctrl+C 時傳送網址已失效的通知，並每 10 秒記錄一次手機的感測器溫度與降頻等級（`dumpsys thermalservice`），以及 Mac 的熱警告等級，直到按下 Ctrl+C。請只在相同的降頻等級下比較各次執行：發熱的手機無論建置版本為何都會降頻並掉幀。iPhone 不回報溫度。

## 部署

在 [https://weskao.github.io/skyline-rush/](https://weskao.github.io/skyline-rush/) 遊玩。這個網站是公開的：訪客不需要 GitHub 帳號或 Tailscale，開發者的電腦也可以離線。

```sh
git tag v0.4.0 && git push origin v0.4.0   # Release: deploys once CI confirms the commit already passed on main
make deploy                              # Deploy remote main manually through the same CI flow
# The on-screen version (ready screen, desktop and mobile) is `package.json`'s version; `/release` bumps it
# after scripts/release-gate.sh has seen a green CI run for the commit on main.
```

CI（`.github/workflows/ci.yml`）會在推送到 `main`、`develop`、pull request、版本標籤推送（`v*`）與手動執行時，建置並執行單元測試與 Chrome 瀏覽器測試。瀏覽器測試以 13 個平行分片執行，World Tour 長時間執行則為 5 個，依 `tests/ci-durations.json` 中量測的各測試時間平衡（`scripts/ci-shards.mjs`），且只在 `main` 與 `develop` 上執行（其他分支執行單元與雲端存檔檢查，除非提交訊息含有 `[full-regression]` 或手動執行要求），而對同一分支的較新推送會取消被它取代的執行。CI 會讓失敗的瀏覽器測試重試一次；僅在重試時才通過的測試仍會在該次執行中被標註，並視為需要修正的錯誤（`.claude/rules/browser-test-stability.md`）。在任何分支上，若推送或 pull request 只變更 `src/`、`public/`、`tests/`、`scripts/` 與 `.github/` 之外的 Markdown、文字、圖片、影片或 `Makefile`，且其父提交已在該分支上通過 CI，就會略過所有測試套件（`scripts/ci-changes.mjs`）。手動執行會在所有檢查通過後發布；版本標籤推送會重新執行單元測試，確認（`release-verified`）被標記的程式碼已在 `main` 上通過完整測試套件而不再重跑瀏覽器測試套件，然後發布並驗證公開網站。若標籤指向的提交從未在 `main` 上通過 CI，則不會部署。一般分支推送與 pull request 只會執行檢查。推送到 `main` 時，若其某個合併提交所合併的不是 `develop` 或 `hotfix/*`，`main-merge-source` 工作也會失敗（`scripts/check-main-merges.sh`），而該次紅燈執行會阻擋發布。Pages 建置使用 `--base=/skyline-rush/`，讓腳本、樣式與字型從專案網址載入。GitHub Pages 必須使用 **GitHub Actions** 作為發布來源。手動部署需要已驗證的 GitHub CLI（`gh auth login`）；請先推送你的提交，因為 `make deploy` 使用的是遠端 `main`。部署不再依賴本機的 pre-push hook 或 Netlify 登入。當任何檢查或部署在推送、標籤或手動執行時失敗，`notify-telegram` 工作會將失敗執行的連結傳送到 Telegram；它需要儲存庫密鑰 `TELEGRAM_BOT_TOKEN` 與 `TELEGRAM_CHAT_ID`（以 `gh secret set <NAME>` 設定各項，它會提示輸入值），缺少時則靜默略過。

連結預覽圖片是 `public/og-image.jpeg`，為 `public/og-image.en.jpeg` 的複本；`node scripts/capture-og-images.mjs og` 會擷取兩種語言的封面並更新該複本。爬蟲無法切換語言，因此 `index.html` 只參照英文封面（含 `og:locale` `en_US` 與 `og:locale:alternate` `zh_TW`），而 `public/og-image.zh-TW.jpeg` 是其中文版本，供直接連結使用。更換封面後，請提升 `index.html` 中 `og:image` 的 `?v=`，讓社群網站擷取新的圖片。

## 專案結構

- `src/game.js`：確定性的街機模擬、對手、車流與完賽順序。
- `src/input.js`：鍵盤與多指標控制，含取消與失焦清理；讀取已儲存的按鍵對應。
- `src/key-map.js`：純粹的按鍵對應，含 E / X NITRO、衝突互換的重新對應、驗證與儲存。
- `src/history.js`：已儲存的遊戲資料：比賽歷史（最近 50 筆）、每條賽道的最佳成績與舊資料遷移、生涯統計、獎章、星數、已裝備的塗裝、幽靈車與每日排行榜。
- `src/ghost.js`：10 Hz 的幽靈車錄製、依賽道驗證與內插播放。
- `src/appearance.js`：塗裝目錄與星數解鎖門檻。
- `src/rng.js`：以種子產生的隨機串流；拾取物與光環來自每場比賽的配置種子（測試與工具中則使用賽道種子）。
- `src/world.js`、`src/geometry.js`：Three.js 算圖器、程序式生成的車輛、公路、天際線、飛行特效與視角。
- `src/effects.js`：固定 480 顆粒子的 GPU 粒子池，用於蒸氣、火花與著陸塵土。
- `src/track-paths.js`、`src/world-tour-scene.js`：每條賽道一份距離對道路的對映，以及共用的 World Tour 道路、景物與地標。
- `src/route-map.js`、`src/i18n.js`：SVG 完整路線與即時賽車手地圖；語言偵測、已儲存的選擇、`t()` 與英文／繁體中文賽道名稱；`src/locales/` 存放語系目錄。
- `scripts/capture-og-images.mjs`：從真實的應用程式擷取英文與 zh-TW 的封面圖片，以及 zh-TW README 的截圖。
- `scripts/pickup-economy.mjs`：以腳本控制的機器人行駛每條賽道，並印出每分鐘 NITRO、BOOST 占比、電量耗盡次數與第一次 NITRO 的時間；`tests/pickup-economy.test.js` 鎖定光環／拾取物的配置。
- `scripts/ring-variety.mjs`：在重新隨機的比賽種子上，印出每條賽道的光環車道分布、地面占比、每場比賽的光環串與光環列數，以及機器人的光環取得量與 NITRO 速率；`tests/ring-variety.test.js` 確保每條車道都被使用，且不會讓光環更難收集。
- `scripts/ci-shards.mjs`：`plan` 為每個 CI 分片提供其 Playwright 的 `--test-list`，依時間打包測試，讓每個分片大約同時完成；`refresh <run-id>` 會在測試套件大幅變動後，依某次 CI 執行的日誌重寫 `tests/ci-durations.json`。
- `src/App.vue`、`src/icons.js`：Vue 3 的 UI 外殼（開始畫面、HUD、面板、觸控操作）及其共用的 SVG 圖示；只算圖一次，沒有反應式狀態。
- `src/main.js`、`src/style.css`：掛載 `App.vue`、串接各畫面控制器，並執行比賽生命週期（開始、暫停、重新開始、結果）與影格迴圈。
- `src/*-ui.ts`：每個畫面區域一個 TypeScript 控制器（比賽選擇、雲端存檔、觸控操作、按鍵對應、VFX、音訊、歷史對話框、攝影模式）。
- `src/race-hud.ts`、`src/race-hud-modes.ts`：比賽中的 HUD，在每個 HUD 更新週期以命令式寫入。
- `src/race-results.ts`、`src/result-screen.ts`、`src/session-progress.ts`：記錄完成的比賽（最佳成績、解鎖、獎章、幽靈車）並顯示其結果畫面。
- `vite.config.js`：搭配 `@vitejs/plugin-vue` 的 Vite。
- `src/perf.js`：用於 `?perf` 裝置檢查讀數的影格時間百分位數。
- `src/audio.js`：合成音效與循環播放的音樂音序器；曲目位於 `src/music-tracks.ts`，比賽對音效的事件位於 `src/race-audio-events.ts`。
- `src/audio-settings.js`：從 `localStorage` 讀取已儲存的音樂／音效開關與音量，以及滑桿的靜音保留音量規則。
- `tests/`：單元與瀏覽器行為測試。`tests/module-size.test.js` 讓每個原始碼模組維持在 400 行以內（較舊的大型檔案有只降不升的上限）。
- `docs/design.md`、`docs/verification.md`：範圍與驗證證據。
- `README.zh-TW.md`：本檔案的繁體中文翻譯，由 `scripts/readme-zh.mjs` 保持最新（`check`、以 `claude -p` 翻譯的 `sync`，以及手動編輯後的 `stamp`）。當提交變更 README.md 時，`.githooks/pre-commit` hook 會重新產生它（以 `SKIP_README_ZH=1` 略過一次），當被推送的提交觸及首頁（`index.html`、`src/App.vue`、`src/main.js`、`src/style.css`、`src/locales/`；以 `SKIP_LAYOUT_GATE=1` 略過一次）時，`.githooks/pre-push` 會執行 `npm run test:layout`，而 `.githooks/main-merge-guard`（由 `pre-merge-commit` 與 `pre-commit` 執行）會拒絕將 `develop` 或 `hotfix/*` 以外的任何分支合併進 `main`（快轉合併不會執行任何 hook，因此請使用 `--no-ff`；以 `ALLOW_MAIN_MERGE=1` 略過一次）；`make` 會以 `git config core.hooksPath .githooks` 啟用這些 hook。`.claude/settings.json` 中的 Claude Code Stop hook，會在某一輪編輯了 README.md 卻沒有更新它時，讓 Claude 回頭更新。

所有車輛／景物的幾何與特效皆由程式碼生成。Barlow Condensed 以 SIL Open Font License 授權打包於 `public/fonts/OFL.txt`。Three.js、Vue、Vite 與 Playwright 保留各自的套件授權。

來源：[weskao/skyline-rush](https://github.com/weskao/skyline-rush)。單人、十條賽道、街機物理。瀏覽器驗證涵蓋桌面版 Chrome 與模擬的行動裝置視窗；iOS Safari 已在 iOS 模擬器中檢查（直向與橫向，Coast 與 Neon），但實體手機上的影格率尚未量測（使用 `?perf`，請見驗證）。
