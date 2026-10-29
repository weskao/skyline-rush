<!-- source-sha256: 92f7568744768c4b70bf6b84e48235ec506df213804c379e8bd2c0c017f370ae generated from README.md by scripts/readme-zh.mjs; edit README.md, then run the script -->
# Skyline Rush

[English](README.md) · **繁體中文**

[**開始遊玩 Skyline Rush →**](https://weskao.github.io/skyline-rush/)

這是一款可在瀏覽器遊玩的 3D 海岸公路衝刺遊戲，主角是一輛飛行電動跑車，以 Tesla Roadster 2 及其火箭推進器概念為藍本。透過四具藍色推進器升空，與三名對手競速，飛越車流，管理電量並降落充電。操控手感為虛構的街機物理；本作為非官方粉絲專案，與 Tesla 或 SpaceX 無任何關聯。

## 遊戲介紹

在 Classic Race 中，Skyline Rush 是一場短暫、可反覆挑戰的瀏覽器街機衝刺：一名玩家對上三名對手與夾雜其間的車流，桌機或手機皆可遊玩，無需安裝任何東西。其他模式提供單人駕駛、自訂規則與多階段挑戰。

- **先開車，再飛行。** 時速超過 65 km/h 後，按住 FLY 即可升空，飛越車流、穿過光環、跨越斷橋。飛行與 BOOST 共用同一份推進器電量，且只有在路面上才會回充，因此每次爬升都是一次取捨。
- **靠好好開車賺取 NITRO。** 近距離超車、飄移、連續光環（PERFECT LINE）、氣流跟車、落地桶滾與拾取道具，都會填滿三格 NITRO 儲備；可一次爆發使用，也可連按延長。
- **十條賽道，依序解鎖。** 黃昏的 Coast、下著雨且有低矮隧道的 Neon Downtown、有斷橋缺口與側風的 Canyon Skyway、有冰面與上坡爬升的 Aurora Pass、擁有跳躍坡道與斷裂天橋的 360° 高架螺旋 Sky Spiral，接著是世界巡迴賽：Taipei Heritage、Tokyo Afterdark、Alpine Rail Pass、Coastal Horizon 與 Cosmic Orbit。每條賽道都有一條空中捷徑，留給能在空中穩住路線的玩家。
- **值得追逐的目標。** 每次完賽都會獲得風格星星，用來在 Garage 解鎖塗裝。最佳紀錄幽靈、擁有專屬排行榜的每日挑戰與四枚獎牌，都是再跑一次的理由。

一場 Classic 衝刺約一分鐘；多階段挑戰則更久。音效由瀏覽器即時合成，進度儲存在本機儲存空間，因此不需要帳號或後端。

**主畫面** — 選擇賽道與鏡頭角度，然後開始比賽。

https://github.com/user-attachments/assets/059aba91-65b2-4b0b-9abd-15461fcb1623

**競速中** — 在其中一條賽道上完整跑完一場。

https://github.com/user-attachments/assets/e0ddb94c-794e-49ab-9b66-51cb5150f101

![遊戲示範：倒數、飛越車流升空，以及在 Coast 降落](artifacts/readme-demo.gif)

![開啟音訊設定的開始畫面](artifacts/readme-start.zh-TW.jpeg?v=20261024a)

![飛行中的 Skyline Rush](artifacts/readme-hero.zh-TW.jpeg?v=20261024a)

![上升時的手機直式版面](artifacts/mobile-flight.zh-TW.jpeg?v=20261024a)

![創下個人最佳的比賽結果](artifacts/race-results.zh-TW.jpeg?v=20261024a)

### 手機截圖與示範

可使用觸控操作，以直向或橫向遊玩。影片跟隨一場 Coast 賽事，從開始畫面經過倒數、FLY 升空到降落；AUTO 會持續按住油門。

**直向 — 準備開賽**

![手機直式開始畫面，含賽道選擇與觸控友善的比賽按鈕](artifacts/mobile-home.jpeg)

**橫向 — 以觸控操作飛行**

![手機橫向飛行，按住 FLY 並顯示觸控按鈕](artifacts/mobile-landscape-flight.jpeg)

**觸控遊玩示範** · [觀看 MP4](artifacts/mobile-demo.mp4)

![手機觸控遊玩：Coast 倒數、FLY 升空與降落](artifacts/mobile-demo.gif)

以 Chrome 行動裝置模擬器擷取自執行中的遊戲，解析度為 390×844（直向）與 844×390（橫向），使用全新的示範用檔案。這些擷取畫面並不代表實體手機的效能。

## 遊戲模式與重玩性（開發分支）

> **進行中 · 2026 年 10 月 29 日。** 這些模式新增內容合併於 `feature/roadmap-integration` 開發分支，尚未合併至 `main`，也尚未包含在[已部署的 GitHub Pages 版本](https://weskao.github.io/skyline-rush/)中。

選擇一條**已解鎖的賽道**，在賽道卡片下方選擇 **GAME MODE**，必要時展開其規則，然後按下 **Start race**（或 Enter）。比賽仍使用相同的 Three.js 道路、飛行、FLY / BOOST / NITRO 與響應式觸控操作。開發分支包含以下模式：

| 模式 | 變更內容 | 勝利條件／進度 |
| --- | --- | --- |
| **Classic Race** | 標準的 3 名對手衝刺，可在 10 條賽道之一進行，含車流、捷徑、光環與 NITRO。 | 登上頒獎台可解鎖下一條賽道；只有 Classic 會授予生涯星星、獎牌與正式最佳紀錄。 |
| **Custom Race** | 選擇 **0–3 名對手**、Easy / Normal / Hard AI、Off / Light / Normal / Heavy 車流、NITRO 道具開／關，以及 Normal / Relaxed 碰撞懲罰。有五種預設：Standard、Traffic Rush、No Items、Air Focus 與 Precision。 | 非排名結果有各自的歷史紀錄。可進行 **1 / 2 / 3 / 5 個衝刺階段**並比較累計時間。各階段重複跑點對點路線；它們**不是環圈賽**。 |
| **Free Drive** | 獨自探索任何已解鎖的賽道，可調整道路車流與道具，沒有名次，也沒有強制勝利。 | 自由駕駛、飄移與飛行，然後重新開始或選擇其他賽道。這條設計好的道路有終點；這**不是**無限世界模式。 |
| **Time Attack** | 單人計時衝刺，提供相容的最佳紀錄 Ghost 與領先／落後分段。可選用 **Clean Time Trial** 開關。 | 依賽道與規則記錄最佳時間；Clean 跑法只要有任何碰撞即視為無效，且不會取代個人最佳。 |
| **Obstacle Run** | 以種子生成的路邊障礙；密度分為 **Standard** 或 **Extreme**。部分障礙會橫向掃過；警告 HUD 會預告逼近的危險。 | 閃避危險、乾淨通過可獲得風格分數，並使用一般路線的終點。障礙物配置與碰撞共用確定性邏輯；Classic 不受影響。 |
| **Checkpoint Rush** | 穿越發光的 3D 拱門。起始時間為 **28 秒**；每通過一道乾淨的拱門獲得 **+10 秒**（上限 60）與 **250 風格分數**。 | 在時間用盡前通過每道拱門並抵達終點。漏掉拱門與超時**不會**儲存有效的最佳紀錄。HUD 顯示已通過的拱門、剩餘時間與到下一個目標的距離。 |
| **Championship Cup** | 選擇由已解鎖路線組成的 **3 或 5 條賽道**盃賽；在每個階段與 NOVA、ORBIT 和 APEX 競速。 | 名次可獲得 **10 / 7 / 5 / 3 分**；累計積分與總時間決定冠軍，同分則以時間決勝。盃賽結果與生涯解鎖分開計算。 |
| **Stunt Attack** | 一場 **120 / 180 / 300 秒**的風格賽，包含連續的多個賽段：飄移、空中特技、險些擦撞與光環可累積連擊分數。 | 由計時器結束賽事，而非終點線；每種時長皆有本機風格獎牌與最佳分數。 |
| **Elimination** | 四名車手的 Last Driver Standing：每十秒淘汰一名排名最後的車手。 | 存活到成為最後一名車手；提早被淘汰則結束本次跑局，且沒有獎勵。 |

### Cup 恢復

未完成的 Championship Cup 會在主畫面提供 **Resume** 或 **Discard**。Resume 會保留已結算的階段積分，只重新開始未完成的階段；重試只會回溯正在重玩的那個階段。完成或捨棄 Cup 都會清除其恢復紀錄。刪除遊戲進度時，也會一併移除該檢查點，但保留裝置偏好設定。恢復功能使用此瀏覽器的儲存空間，無法還原瀏覽器拒絕儲存的資料。

### 自訂呈現與 Ghost

Custom Race 可為每個衝刺賽段重播最快的相容 Ghost。Custom 與 Free Drive 提供 Track / Day / Dusk / Night / Rain / Fog 呈現預設與即時規則摘要。這些外觀選擇不會改變紀錄資格或規則集識別。重試會保留所選外觀；更換賽道或回到 Classic 則會還原賽道外觀。關閉 Photo Studio 時會還原目前比賽的外觀。

### 選用道具與獎勵拱門

Custom 與 Free Drive 提供 **Off / Classic Mystery Rings / Active Items / All Items**。持有的道具佔用單一欄位：按 **Q** 或點擊 **USE** 啟動，然後等待冷卻。NITRO 與 FLY/BOOST 保留各自的操作。All Items 會加入有上限的加速、空中電量與單次撞擊恢復拱門；EMP 會短暫減慢附近的對手，在單人遊玩時則轉為 Magnet。恢復機制會保留正式的碰撞次數。Stunt Attack 與 Checkpoint Rush 可另外選擇啟用暫時、不可疊加的 ×2 分數拱門。Classic 預設維持不變。

### Event Lab Lite v1

**Event Lab Lite** 可在已解鎖路線上，以障礙、NITRO 光環與補給編輯本機賽道範本。可變更它們的車道與距離、Undo/Redo/Reset 編輯，並以文字匯入或匯出經過驗證的賽道。開始時會將賽道編譯為真實的比賽事件；重試會保留賽道與種子。賽道結果與 Career 及 Custom 紀錄分開。圓錐、自訂坡道、檢查點編輯與社群分享不在這個初版範圍內。

### Endless Highway

**Endless Highway** 將 Coast 延伸到設計好的終點之外，成為一個距離生存活動。車流難度會上升至固定上限；五次碰撞會結束一次已完成的挑戰。個人紀錄追蹤最長的絕對距離，與 Career 及 Ghost 分開。暫停與 WebGL 恢復都會保留這場跑局。此初版僅支援 Coast；其附近的景物與事件使用有上限的物件池。

### Circuit Race

**Circuit Race** 新增 Harbor Circuit，這是一條獨立、隨時可進入的 2 公里封閉環道，提供 **1 / 3 / 5 圈**。依序通過每個區段才算一圈；倒退通過、瞬間移動與恢復都無法取得圈數。HUD 與結果畫面顯示分段時間、上一圈、個人最佳圈與總時間。單圈最佳紀錄在 History 滾動淘汰後仍會保留；總時間與 Ghost 則依圈數設定各自獨立。原本的十條點對點路線保持其地理位置與 Career 進度。

### 賽道主題、障礙與風險路線

- **賽道主題**（可在 Custom、Free Drive 與 Obstacle Run 中選用）讓每條路線都有專屬危險：Coast 的貨物與陣風、Neon 的道路施工、Canyon 的落石、Aurora 的雪堆、冰面與暴風雪、Sky Spiral 的能量拱門、Taipei 的節慶路障、Tokyo 的號誌閘門、Alpine 的雪崩、Coastal 的浪花，以及 Cosmic 的能量牆。危險會提前警告，永遠保留兩條車道暢通，且絕不改變 Classic。
- **Obstacle Run** 提供 **Mixed obstacles** 賽道：橫掃的閘門、落下的碎片，以及路障上的圈環，獎勵飛越或繞行的玩家。
- **風險路線**：高風險光環與近距離超車在 Custom Hard 下獎勵更高，也可關閉以便輕鬆練習。
- 道路新增了非實體的路邊生活景象：觀眾、廣告看板、維修廂型車、鐵路月台、行駛的列車、船隻與無人機。較低的畫質設定會繪製較少的這類景物。

### 比賽設定、結果與無障礙

- 模式與賽道選擇仍可透過鍵盤與觸控操作；情境面板只會顯示與所選模式相關的選項。無法使用的 Cup 會說明還需要多少條賽道。
- HUD 會依模式調整：單人活動會隱藏容易誤導的對手名次；多階段與 Cup 賽事顯示階段進度；Checkpoint Rush 顯示即時拱門倒數；Obstacle Run 警告逼近的障礙；Clean Time Trial 會明顯標示跑局已失效。
- Practice、Custom、Time Attack、Obstacle、Checkpoint 與 Cup 的結果使用獨立的 `skyline-rush-mode-history-v1` 紀錄鍵。符合資格的練習 Ghost 有各自儲存的規則集；Classic 的解鎖、星星、獎牌、Daily 紀錄與正式時間不會受練習跑局影響。
- 在 **History → Challenge records** 中，可依模式篩選，查看每個確切賽道／規則集的個人最佳，以及符合資格的 Time Attack Ghost。即使最新 50 筆跑局輪替，終身最佳仍會保存在 `skyline-rush-mode-bests-v1`。Challenge records 明確不是 Career 獎牌或星星。
- 模式名稱、結果說明、設定選項與危險警告支援英文與繁體中文。低畫質、觸控操作與減少動態效果仍屬驗證計畫的一部分。

### 真實遊戲截圖與驗證

用來檢視這些模式的截圖，是**取自執行中的瀏覽器遊戲**，而非概念圖。[下載實際的 Playwright 擷取集](https://github.com/weskao/skyline-rush/actions/runs/39742666980/artifacts/12410172411)（Custom 單人、Free Drive、Time Attack、Obstacle Run、Extreme 障礙、Checkpoint Rush 與手機模式選單）。GitHub Actions 的產出檔可能需要登入且會過期；若要在本機重現，請執行 `npx playwright test tests/race-modes-browser.spec.js` 並開啟 `test-results/race-mode-*.png`。CI 截圖以軟體繪製且解析度較低，不代表最終裝置的畫質。

**驗證：**每項功能的測試與完整檢查紀錄列於 `TODO.md`。實體 iPhone 與 Android 的檢查仍待進行。

## 在本機執行

需要 Node.js 22.12 或更新版本，以及支援 WebGL 2 且啟用硬體加速的瀏覽器。

```sh
cd "$HOME/Documents/Workspace/skyline-rush"
make         # Installs dependencies on first run, then starts the Vite + Vue dev server
```

開啟 Vite 印出的本機網址（通常為 http://127.0.0.1:5173）。資源與字型皆在本機打包；遊戲過程不會發出外部請求。不需要後端或帳號。

`make` 與 `make dev-unlocked` 也會啟動本機的 Firebase Auth/Firestore 模擬器（需要 Java 21+），因此雲端存檔的 Google 登入可搭配假的測試帳號運作，絕不會動到真實存檔。專案擁有者的雲端存檔操作與 Spark 配額檢查，請見 `docs/cloud-save.md`。

`make phone` 會開啟終端機選單，用來啟動、檢查或停止可供手機開啟的開發伺服器（透過 Tailscale 或同一個 Wi-Fi），並在伺服器回應後印出手機網址。選單會列出此工作目錄、其他 worktree 與近期分支，也可輸入分支名稱；`make phone <name>` 會直接前往該分支（或 `feature/<name>`），必要時在 `.claude/worktrees/` 底下建立其 worktree。它一律提供正常鎖定的建置版本：全部解鎖的伺服器（`make dev-unlocked`、`make dev-feature`）僅限桌機使用。它需要個人的 `phone-dev` Claude Code skill（`/phone-dev` 會顯示同一份選單），且不啟動模擬器，因此手機上的雲端存檔登入使用的是真實專案。

## 操控

| 動作 | 鍵盤 |
| --- | --- |
| 加速 | W / ↑ |
| 煞車 | S / ↓ |
| 轉向 | A / D 或 ← / → |
| 飛行 | 時速超過 65 km/h 後按住 Space |
| 降落 | 放開 Space |
| 加力 | 按住 Shift；消耗推進器電量 |
| NITRO | E / X（一格完整電量；NITRO 期間再按一次可延長）。使用 WASD 的玩家用 E；使用方向鍵的玩家左手維持在 Shift / X / Space |
| 飄移 | 時速超過 162 km/h 時按住 S + A / D（僅限地面） |
| 開始 | Enter |
| 暫停／繼續 | Esc / P |
| 重新開始 | Backspace |
| 切換鏡頭 | C |
| 全部音訊靜音／取消靜音 | M |
| 自動油門 開／關 | F2 / AUTO 按鈕 |
| AIRFLOW 展示 開／關 | V / AIRFLOW 按鈕 |
| 在主畫面切換賽道 | 向左／右滑動或拖曳 3D 預覽，或在觸控板上用兩指滑動 |

手機版面提供轉向、油門、煞車、加力、飛行與 NITRO 按鈕。觸控操作支援同時按住多個按鈕。AUTO 會持續按住油門，讓你專心轉向與飛行；煞車永遠優先於它。每種裝置預設皆為開啟；一旦你切換過，你的選擇就會記在此瀏覽器中（`skyline-rush-auto`）。離開分頁會暫停比賽並清除按住的輸入。比賽中點擊 SKYLINE RUSH 標誌會暫停並先詢問：**Keep racing**、**End race**（回到賽道選擇，不儲存這場跑局）或 **Back to home**（重新載入）；不論選哪一個，開始畫面重新開啟時都會停在剛跑過的賽道，並捲動到賽道列的中央（第一條與最後一條賽道位於兩端）。Esc 會讓比賽維持暫停。鏡頭與音效快捷鍵會保留按住的駕駛操作。在觸控上，拇指在轉向區往下滑會煞車，往下並偏向一側滑則會飄移；在 Buttons 模式下，較細的煞車鍵位於轉向按鈕上方、不在拇指放置的那一排，因此只有刻意才會按到；將拇指從 ← 或 → 往上滑入煞車鍵會同時保持轉向並煞車，因此一根拇指就能飄移，滑回下方則放開煞車。觸控按鈕與螢幕角落保持距離，讓拇指更容易觸及，平板則會將它們上移並放大。

在比賽前或暫停時開啟 **Controls**，可調整鍵盤轉向靈敏度或重新對應駕駛動作。選取一個動作，然後按下一個按鍵；衝突的按鍵綁定會互換，固定的快捷鍵保持保留，按 Escape 則取消擷取。Reset keyboard 會還原預設值。按鍵綁定立即生效，並儲存在 `localStorage['skyline-rush-keymap']` 底下。

同一個面板也控制觸控轉向模式、慣用手、滑動靈敏度、大小、不透明度，以及按住／切換式 FLY。**Edit touch layout** 讓你在比賽預覽上拖曳動作按鈕與經典轉向按鈕；**Done editing** 會保留配置，**Reset touch layout** 則還原。位置會在重新載入後保留、隨慣用手鏡射，並在旋轉後仍留在可視範圍內。在較短的橫向螢幕（高度低於 380 px，例如顯示工具列的 iPhone Safari）上，開始畫面會省略標語，讓 START RACE 不需捲動即可按到，比賽 HUD 也會隱藏速度表與次要電量列，使各面板互不重疊。

所有音訊皆以 Web Audio 合成；不需要下載任何音訊。背景音樂有兩首循環的合成波音樂：在開始與結果畫面播放的序曲主題（約 64 秒），以及從倒數開始播放、節奏更快的比賽主題（約 55 秒）。每首都會在循環中逐步堆疊，並在暫停時降低音量。音效涵蓋選單確認、三聲倒數滴答與 GO、馬達／風聲、升空與加力、煞車、車輛／護欄碰撞、降落、低電量警告、近距離超車獎勵，以及完賽旋律。將音效靜音會停止待播的提示音，暫停則會淡出駕駛聲音。低電量警告只有在電量回充至 30% 以上後才會重新啟用。

喇叭圖示會開啟音訊設定，包含 Music 列與 Sound effects 列，各有一個靜音開關與一個音量滑桿（上方的開始畫面截圖中已展開）。**Mute all**（或 M）會同時讓兩者靜音。靜音會保留每個頻道的音量，因此取消靜音後會回到原本的音量；將滑桿拖到零，同樣會讓該頻道靜音。兩者預設皆為開啟、音量 100%，每個開／關選擇與音量都會記在 `localStorage`（`skyline-rush-music`、`skyline-rush-sound` 儲存 `on`/`off`，另有儲存百分比的 `-volume` 變體）；若沒有任何儲存值，兩個頻道皆為開啟，並會以 `on` 儲存。在較短的螢幕上，面板可捲動。在瀏覽器允許自動播放的情況下，序曲音樂會在頁面載入後立即開始。若不允許（Chrome 與大多數其他瀏覽器在首次造訪時），則第一次點擊、點按或按鍵就會開始播放。在 iPhone 與 iPad 上，遊戲會請求媒體播放，因此靜音開關不會讓它靜音；這也會在遊玩期間暫停其他 App 的音訊。

飛行面板顯示上升、巡航、下降與觸地、剩餘推進秒數，以及下一個要使用的操作。青色光環標示空中走廊，且屬於遊戲玩法：請見下方的 Rings。手機也有按住加力的按鈕。橘色的碰撞回報會顯示撞擊類型與損失的速度；護欄現在會讓地面上的車輛反彈並減速。飛得夠高則可越過護欄。

場景包含泛光燈效、夕陽水面、懸索橋、推進器蒸氣、碰撞火花與觸地漣漪。鏡頭運動與非必要的速度線會遵守你系統的減少動態效果偏好。音效為推進、碰撞與降落提供各自獨立的回饋。

**VFX**（右上角）可選擇 Realistic、Cinematic 或 Extreme 風格、Low / Medium / High 畫質（Low 會關閉泛光並繪製較少景物）、Comfort mode（無閃光、震動、殘影或模糊）與選用的觸覺回饋；**Fine tuning** 將每項效果以滑桿呈現，**Reset visual settings** 則還原預設值。**AIRFLOW**（或 V）會將場景切換為空氣動力學展示：車身上的流線、遙測面板、Low drag 或 High downforce，以及駕駛、前方、後方、側面或環繞鏡頭。開始面板會讓位給展示，只留下橘色的 **START RACE** 按鈕，固定在車子下方的底部中央；左右滑動場景即可切換賽道。第一次開啟 AIRFLOW 時，會有一根動畫指尖示範該手勢。

三盞琥珀色起跑燈在 GO 時轉為青色。玩家的車是一輛低矮的楔形敞篷跑車，有煙燻色的快背車艙、橫貫全寬的紅色尾燈條、四個後推進器噴口、會在加力、煞車與飛行時升起的青銅色彈出式尾翼、旋轉的五輻輪圈，以及可轉向的前輪。每名對手都有自己的輪廓與燈光特徵：NOVA 是長尾車，帶雙尾鰭與分離式洋紅色燈光；ORBIT 是圓潤的 GT，有泡泡車艙與圓形青色車燈；APEX 是賽道車，有前分流器、車頂進氣口、高聳的端板尾翼與琥珀色 C 形燈。車流則使用直立的通勤車造型。轉向會迅速緩入，放開加力則是逐步減速，而非瞬間切斷速度。所有駕駛與工具列按鈕的觸控目標至少為 44px，即使在 320px 寬度下也是如此。

想要額外的電量獎勵，可在地面時速超過 126 km/h 時近距離超越車流。五秒內的乾淨超車可連鎖至 ×5，並回充 8–16% 電量（上限 100%）。碰撞會中斷連鎖；空中、距離較遠與恢復中的超車不會獲得獎勵。HUD 會宣告每次超車與最後 500 公尺；結果畫面顯示近距離超車與碰撞的總數。

飛行電量在全力推進下約可持續五秒。電量歸零時，車輛會自動下降；放開飛行操作並在地面行駛即可充電。同一份電量也供加力使用。碰撞會讓車輛減速；飛得夠高可避開車流。對手與車流遵守相同的碰撞規則：它們會繞開較慢的車輛與玩家，像你一樣撞上道具、護欄與危險物，而撞擊會讓兩輛車都減速並被推開（車流之後會再加速回到巡航速度）。在 NOVA、ORBIT 與 APEX 之前完成衝刺（依賽道不同為 4–8 公里）。個人最佳時間在儲存空間可用時會儲存於此瀏覽器。

### 操控細節

轉向在 0.15 秒內達到滿幅，高速時橫向速度上限為 9 m/s。在 65 km/h 以下按住 Fly 會被記住 1.5 秒，並在速度足夠時自動升空。在空中放開 Fly 會降低下墜加速度（11 → 7 m/s²）以獲得較柔和的降落，並緩慢回充飛行電量（每秒 4，為地面速率的三分之一；電量說明文字顯示 GLIDE RECHARGE ACTIVE）。耗盡的推進器在放開 Fly 且電量回到 15 後會再次解鎖，即使在空中亦然。在斷橋 300 公尺內（Sky Spiral 除外，因為它的坡道會將車輛拋過去），當剩餘電量以目前速度無法推進越過時，HUD 中央會警告 GAP AHEAD · NEED n% CHARGE。車輛在碰撞判定中寬 1.7 公尺，因此更多超車會算作險些擦撞。護欄輕微觸碰算作擦撞（保留 0.92 的速度、被推回道路上、不算碰撞、連擊保留）；正面撞擊仍算作碰撞。開啟 AUTO 時，放開轉向也會讓車輛緩緩回到最近的車道中央（車道輔助）。同時按住 Fly + Boost 每秒消耗 22 電量而非 29，維持加力速度上限，並顯示 AIR DASH。

### NITRO 與飄移

NITRO 有自己的儲備（`player.nitro`，最多 3 格，每格以浮點數填充）。三段式 HUD 顯示部分電量，滿格區段會發光，滿時 NITRO MAX 會跳動（在 comfort／減少動態效果模式下會抑制動態）。賽道沿途的道具（藍色電池 +0.25、橘色罐子 +0.5、空中金色油箱 +1、一個彩虹過充，可填滿至上限）依賽道種子放置；每個 NITRO 獎勵（道具、飄移、桶滾、光環、氣流跟車）也會回充飛行電量（每儲存 0.25 = +5；過充不給），超過上限的部分會轉為電量（每 0.25 = +8）。一格可提供 2.5 秒，速度上限提高 30 m/s，並有更強的加速、排氣與鏡頭回饋；再按一次可延長 2 秒且不疊加速度，因此連按三次可連成 6.5 秒的爆發。NITRO 期間碰到車流會保留 70% 的速度，而非 45%。

在地面時速超過 162 km/h 時，煞車 + 轉向會觸發飄移而非緊急煞車：只損失 3 m/s²，險些擦撞的連擊分數加倍，放開時依飄移時間給予 NITRO 與迷你加速（1 秒：+0.15 與 0.5 秒，2 秒：+0.3 與 0.8 秒，3 秒：+0.5 與 1.2 秒）。車身偏轉 25°，煙霧與藍／橘／紫色火花顯示等級，輪胎尖嘯聲逐步增強，HUD 會顯示飄移／迷你加速的狀態名稱。升空、掉進缺口，或撞上車輛或護欄都會失去累積。

NITRO 不消耗電量，因此 Fly + NITRO 永遠可以同時使用（Fly + Boost + NITRO 維持每秒 22 的 AIR DASH 消耗）。

**空中特技**：飛行時，快速的轉向輕點（0.3 秒內兩次相反方向的按壓）會開始 0.7 秒的桶滾。以低於 11 m/s 的速度降落完成的桶滾可獲得 +0.25 NITRO；較重的降落（約 9 公尺以上的無動力墜落）會失去獎勵。提早降落、撞到任何東西、隧道頂部或缺口都會取消桶滾。車輛會旋轉（減少動態效果與 Comfortable VFX 會保留文字但取消旋轉），HUD 顯示 TRICK，並以 BARREL ROLL / TRICK +0.25 / HARD LANDING 提示、一聲呼嘯聲，以及觸控上的短促觸覺震動來標示桶滾與其獎勵。

**捷徑**：每條賽道都有一條空中走廊，位於邊緣車道上方 6 公尺，標示為 SHORTCUT / FLY HIGH。在其中飛行不消耗電量，速度上限提高 12 m/s；走廊沿途排列著 NITRO 電池，中段有一個油箱，但交錯的塔柱會算作撞擊護欄。以賽道主色調呈現的半透明平台標示走廊地面；在其中時，HUD 顯示 SHORTCUT，飛行預算顯示 ∞（BOOST 仍會消耗電量）。

### Rings

5 公里的海岸有 22 個光環，每 220 公尺一個，以 3 到 5 個為一組（依賽道種子放置）。只有當車輛穿過其可見半徑時才算數；擦到邊緣不算。類型：青色電量（+20 電量）、金色 nitro（+0.5）、紫色氣流（3 秒迷你加速）、紅色風險（小型光環，+1 NITRO 與 500 分）與彩虹神秘（依種子隨機的一種效果：護盾 10 秒或直到第一次撞擊、磁鐵 5 秒、穿過車流的幽靈 3 秒，或讓對手以一半速度凍結 2 秒）。收集的光環會爆開一次後消失。清空整組會宣告 PERFECT LINE 並獲得 +1 NITRO；漏掉一個光環會中斷，但保留已獲得的獎勵。

### 對手、氣流跟車與最後衝刺

緊跟在對手或車流車輛後方 1.5 秒，可獲得 +6 m/s 的速度上限與 +0.25 NITRO（離開氣流後才會重新啟用）。對手也會使用 NITRO，各兩格，依個性而定：NOVA 從 8 秒起穩定施放，之後每 18 秒一次；ORBIT 在飛行時施放；APEX 從比賽 75% 起爆發。輕度的橡皮筋機制（超過 50 公尺時速度最多 ±4%）讓比賽保持緊張。在最後 500 公尺，比賽音樂加速至 115%，狀態列顯示與前後最近對手的差距（`FINAL 500 M · +N m · −N m`）。

### 儲存的資料

所有儲存都使用 try/catch，因此即使儲存空間被封鎖，遊戲仍可執行。`skyline-rush-history`：每場完成的比賽一筆紀錄，最新 50 筆，包含 `fuelOuts`（飛行電量用盡的次數）與 `gapFalls`，用於調整飛行平衡。從開始或結果畫面開啟 **History**，可依賽道篩選、查看最佳跑局與最近十次時間的圖表，並點選一場跑局查看詳情。`skyline-rush-best-tracks`：每條賽道的最佳時間；舊的單一 `skyline-rush-best` 會一次性遷移到 `coast`，並仍會為 coast 寫入。`skyline-rush-unlocked`：賽道解鎖，即使較舊的跑局已離開 History 仍會保留。`skyline-rush-keymap`：按鍵綁定。`skyline-rush-controls` 與 `skyline-rush-vfx`：駕駛與視覺設定（幽靈開關位於 controls）。`skyline-rush-ghosts`：每條賽道一個最佳跑局幽靈。`skyline-rush-medals`、`skyline-rush-stars`、`skyline-rush-paint`：附授予日期的獎牌、每條賽道的最佳星星、已裝備的塗裝。`skyline-rush-daily`：每日挑戰跑局，最新 50 筆。每個儲存的值在載入時都會驗證；任何格式錯誤的內容都會被忽略。

### Ghost、每日挑戰、獎牌與 Garage

- **Ghost**：每場跑局每秒 10 次取樣車輛的距離、車道位置與高度。賽道上的新個人最佳會儲存該跑局，之後在該賽道的比賽中會以半透明的藍色車輛顯示。預設為關閉；請在 Controls 中以 **Show best-run ghost** 開啟。
- **每日挑戰**：History 顯示今日的賽道與修飾條件，依本機日期挑選：禁止飛行、雙倍車流，或僅限金色光環。Canyon 永遠不會出現禁止飛行，因為它的斷橋需要飛行。每日跑局只會進入自己的排行榜（今日最快的五名）；絕不影響歷史紀錄、最佳時間、解鎖、星星或幽靈。重新開始會保留挑戰，**Choose track** 則會離開它。
- **獎牌**：First victory（獲勝）、Clean run（無碰撞）、Perfect flight（單場比賽 5 次 PERFECT LINE）與 Triple burst（一次爆發中 3 格 NITRO：一次按壓加兩次延長）。只有符合資格的 Classic Race 完賽才能獲得；每枚都會記錄首次獲得的日期。
- **Garage**：你在每條賽道上的最佳風格星星會累加並解鎖塗裝：Aurora 需 3、Glacier 需 6、Coral 需 10、Cobalt 需 16、Obsidian 需 24（上限為 30）。現實世界中最受歡迎的車色——藍色與黑色——是長期目標。未解鎖的塗裝仍可預覽。塗裝只改變外觀，絕不影響車輛的數值。

### Sky Spiral（實驗性的第五條賽道）

Sky Spiral 在賽博龐克天際線之上加入真正的 3D 上升螺旋道路。繞著發光的中央塔完整行駛一圈水平迴旋，然後從三個專用坡道發射，越過高架缺口。現有的 FLY、BOOST 與 NITRO 都可在新賽道上使用，並提供選用的飛行修正。這條賽道使用獨立的曲面道路繪製器與專屬的 3D 路徑對應器；仍在實體行動硬體上驗證中。

### 賽道與風格

從 Coast 開始。名列前三即可解鎖 Neon Downtown，接著是 Canyon Skyway、Aurora Pass、Sky Spiral、Taipei Heritage、Tokyo Afterdark、Alpine Rail Pass、Coastal Horizon 與 Cosmic Orbit。開始前先選擇賽道，或向左或向右滑動 3D 預覽（以滑鼠拖曳，或在觸控板上用兩指橫向滑動），像輪播一樣翻到相鄰的賽道：它會跟隨手指，輕輕一撥就夠，第一條與最後一條賽道會有橡皮筋回彈，並有一個標籤顯示賽道名稱與分頁圓點；鍵盤使用者可用 Left/Right 在賽道按鈕之間移動，並以 Enter 選擇。重新開始會保留所選賽道；結果畫面上的 **Choose track** 則回到選單。當仍有賽道處於鎖定狀態時，登上頒獎台會在結果畫面顯示一個跳動的 **Next** 按鈕，可直接開始新解鎖的賽道；一旦所有賽道原本就已開啟，以及在每日挑戰中，它都不會出現。若瀏覽器中斷 WebGL 連線（在 iPhone 上鎖定螢幕或切換 App 後很常見），圖形恢復時遊戲會清除警告；否則 **Start** 或 **Race again** 會重新載入頁面。每條賽道都有自己的天空、色盤與程序生成的景物：下雨的霓虹街道與低矮隧道、紅色沙漠峭壁與斷橋缺口／側風，或有極光與冰面的雪山。警告標誌標示特殊路段。Aurora 的上坡路段回充地面燃料的速率為正常的一半。

### 世界巡迴賽賽道、路線圖與賽道名稱

五條世界巡迴賽賽道共用同一個曲面道路繪製器（`src/world-tour-scene.js`），並有各賽道專屬的色盤、建築與地標（總統府與北門的輪廓、霓虹路口與一座塔、鐵路高架橋與山峰、一座燈塔與跨海大橋、環狀行星）。在主畫面選擇世界巡迴賽賽道時，會在懸浮的車輛後方框出其代表性地標：總統府、東京鐵塔、一座高山峰、燈塔或宇宙之門。朝它競速時，路邊會讓該地標保持清楚可見。每張賽道卡片都顯示完整的主要路線，比賽中則有即時地圖在其上標示 YOU、NOVA、ORBIT 與 APEX；空中捷徑絕不會被畫出。在高度低於 500px 的螢幕與高度低於 700px 的窄版手機上，即時地圖會讓位，排行榜仍會為車手排名。賽道名稱會跟隨以 **EN / 繁體中文** 切換器選擇的語言（請見下方 Language）。

風格分數獎勵近距離超車（100 × 連擊，飄移的連擊加倍）、光環（150，風險光環另加 500）、PERFECT LINE（500）、移動中的滯空時間（每秒 10）以及每 500 公尺的乾淨行駛（100）。碰撞與掉入缺口會重設乾淨距離的進度。結果會授予完賽一顆星、每公里 250 分兩顆星、每公里 500 分三顆星，與完賽名次無關。

燃料與 nitro 條會緩緩趨近新的數值，在低於 20% 容量時警告，回充時閃爍，並在 nitro 一格完成時跳動。Comfort mode 與系統的減少動態效果會停用這些動畫。滑動區在按住時顯示浮動的圓環／旋鈕，並在比賽開始時顯示簡短提示；放開會讓轉向回到中立。

HUD 使用共用的動態時序（120 / 240 / 480 ms）。速度表指針會隨速度緩動；名次變化時，名次數字會翻轉並帶有綠色向上或紅色向下的箭頭，排行榜的列會滑入新的位置。精簡的半透明事件提示位於畫面中央上方，避開 HUD 面板，並將險些擦撞、PERFECT LINE、NITRO 爆發、電量增加與飄移火花等級排入佇列而不互相重疊；同時回充飛行電量的 NITRO 獎勵會標明這點（NITRO · +20% CHARGE）。暫停、完賽與重新開始會清空佇列。按鈕在按下時會變暗但不改變大小，因此在邊框以內的任何位置按下都能被辨識；按住的觸控按鈕會保持亮起。VFX 設定中的選用 **Haptic feedback** 會在支援的觸控裝置上為碰撞、NITRO 與飄移獎勵發出提示。Comfort mode 與系統的減少動態效果會保留文字與按下狀態的顏色，同時移除新的動態與震動。

### 語言

整個介面提供英文與繁體中文（繁體中文）：開始畫面、Garage、History、HUD、比賽提示、結果、路線圖、設定與 3D 道路標誌。開始畫面賽道卡片下方的一個 **EN / 繁體中文** 切換器會一次更換全部內容，不需重新載入。語言依以下順序決定：

1. 你點擊切換器所儲存的選擇（`skyline-rush-locale`；只有在點擊時才會寫入，絕不會來自自動偵測）；
2. 你的系統語言順序（`navigator.languages`）：第一個 `en*` 或 `zh*` 項目決定結果，其他語言會被略過（`['ja-JP', 'zh-TW']` 會選擇繁體中文），任何 `zh*` 標籤（zh-TW、zh-HK、zh-Hant、zh-CN、zh-Hans、單純的 zh）都會選擇繁體中文，空的或缺少的清單則回退到 `navigator.language`；
3. 否則為英文。

品牌與遊戲術語在兩種語言中皆維持英文：Skyline Rush、NITRO、FLY、BOOST，以及對手 NOVA、ORBIT 與 APEX。字串位於 `src/locales/`；`src/i18n.js` 負責偵測、`t()` 與目前的語言。

在地化圖片：`node scripts/capture-og-images.mjs` 會在 Chrome 中驅動真實的應用程式，並儲存 `public/og-image.en.jpeg` 與 `public/og-image.zh-TW.jpeg`（1440×900 的開始畫面），以及供繁體中文 README 使用的 `artifacts/{readme-start,readme-hero,mobile-flight,race-results}.zh-TW.jpeg`（`node scripts/capture-og-images.mjs og` 或 `readme` 只執行其中一半）。英文的 `artifacts/` 截圖絕不會被它動到。`public/manifest.webmanifest` 與應用程式圖示維持原樣：圖示不含文字，且 web app manifest 只有單一名稱與描述，沒有各語言的變體，因此第二份 manifest 會破壞可安裝性。

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

瀏覽器測試使用已安裝的 Google Chrome，並允許 SwiftShader 進行無頭繪製。僅使用 CPU 的 CI 採用 0.25 的裝置縮放比例，使 3D 場景保持流暢，同時保留相同的 CSS 視窗尺寸與遊戲斷言；本機測試則以完整解析度繪製。一般遊戲過程使用瀏覽器可用的 GPU。英文 README 截圖僅在檔案不存在，或使用 `UPDATE_ARTIFACTS=1 npm run test:browser` 時，才以 JPEG（品質 70）寫入 `artifacts/`，因為即時 3D 場景每次執行都不同；測試軌跡／結果會被忽略。完整衝刺測試在快速的機器上約需一分鐘，軟體繪製拖慢模擬時則更久。

```sh
npm run preview         # Serve the production build after npm run build
```

若要在手機上檢查，請在你的網路上提供建置版本（`npx vite preview --host 0.0.0.0`），並加上 `?perf` 開啟（例如 `http://<computer-ip>:4173/?perf`）。頂端會出現一條列，顯示過去 20 秒的比賽影格時間：中位數（p50）、第 95 百分位（p95）、平均 fps 與取樣長度。沒有 `?perf` 時，不會測量或顯示任何東西。

```sh
make perf BASE=main         # A/B in Chrome at 412×915, CPU throttled 6× (RATE=20 for a low-end phone), 3 alternating rounds
make perf-phone             # Like make phone: asks base version, Tailscale/Wi-Fi and Telegram; logs phone temperatures
```

`make perf` 會建置此工作目錄，若有 `BASE=<git ref>` 也會建置該 ref（位於 `.claude/worktrees/perf-<sha>`，下次重複使用），每次執行在 Coast 競速 24 秒，並印出每次執行的列以及各建置版本的中位數。`make perf-phone` 對於未傳入的項目，會以和 `make phone` 相同的方式詢問（`BASE=`、`VIA=tailscale|wifi|auto`、`TG=0`），為每個建置版本印出並傳送一個 `?perf` 網址到 Telegram，在任何以 USB 連接的 Android 手機上以 Chrome 開啟第一個網址（`adb reverse`，因此任何網路皆可），在按下 Ctrl+C 時傳送網址已過期的通知，並每 10 秒記錄手機的感測器溫度與降頻等級（`dumpsys thermalservice`），以及 Mac 的熱警告等級，直到按下 Ctrl+C。只能在相同的降頻等級下比較執行結果：發熱的手機無論建置版本為何都會降頻並掉幀。iPhone 不回報溫度。

## 部署

請至 [https://weskao.github.io/skyline-rush/](https://weskao.github.io/skyline-rush/) 遊玩。此網站為公開：訪客不需要 GitHub 帳號或 Tailscale，開發者的電腦也可以離線。

```sh
git tag v0.4.0 && git push origin v0.4.0   # Release: deploys once CI confirms the commit already passed on main
make deploy                              # Deploy remote main manually through the same CI flow
# The on-screen version (ready screen, desktop and mobile) is `package.json`'s version; `/release` bumps it
# after scripts/release-gate.sh has seen a green CI run for the commit on main.
```

CI（`.github/workflows/ci.yml`）會在推送到 `main`、pull request、版本標籤推送（`v*`）與手動執行時，建置並執行單元與 Chrome 瀏覽器測試。瀏覽器測試分為八個平行分片（`--shard=N/8`），對同一分支的較新推送會取消它所取代的執行。手動執行在所有檢查通過後發佈；版本標籤推送則重新執行單元測試，確認（`release-verified`）被標記的程式碼已在 `main` 上通過完整測試套件，而不是重新執行瀏覽器測試，然後發佈並驗證公開網站。若標籤打在 CI 從未在 `main` 上通過的 commit 上，則不會部署。一般的分支推送與 pull request 只會執行檢查。Pages 建置使用 `--base=/skyline-rush/`，讓腳本、樣式與字型從專案網址載入。GitHub Pages 必須以 **GitHub Actions** 作為發佈來源。手動部署需要已驗證的 GitHub CLI（`gh auth login`）；請先推送你的 commit，因為 `make deploy` 使用遠端的 `main`。部署不再依賴本機 pre-push hook 或 Netlify 登入。當任何檢查或部署在推送、標籤或手動執行時失敗，`notify-telegram` 工作會將失敗執行的連結傳送到 Telegram；它需要 repo secrets `TELEGRAM_BOT_TOKEN` 與 `TELEGRAM_CHAT_ID`（以 `gh secret set <NAME>` 設定，它會提示輸入值），缺少時則靜默略過。

連結預覽圖片是 `public/og-image.jpeg`，為 `public/og-image.en.jpeg` 的複本；`node scripts/capture-og-images.mjs og` 會擷取兩種語言的封面並更新該複本。爬蟲無法切換語言，因此 `index.html` 只引用英文封面（含 `og:locale` `en_US` 與 `og:locale:alternate` `zh_TW`），而 `public/og-image.zh-TW.jpeg` 是供直接連結使用的中文版本。更換封面後，請提高 `index.html` 中 `og:image` 的 `?v=`，讓社群網站抓取新的圖片。

## 專案

- `src/game.js`：確定性的街機模擬、對手、車流與完賽排名。
- `src/input.js`：鍵盤與多指標控制，含取消與失焦清理；讀取已儲存的按鍵對應。
- `src/key-map.js`：純粹的按鍵對應，含 E / X NITRO、衝突互換的重新綁定、驗證與儲存。
- `src/history.js`：已儲存的遊戲資料：比賽歷史（最新 50 筆）、每條賽道的最佳與舊版遷移、生涯統計、獎牌、星星、已裝備塗裝、幽靈與每日排行榜。
- `src/ghost.js`：10 Hz 幽靈錄製、每條賽道的驗證與插值播放。
- `src/appearance.js`：塗裝目錄與星星解鎖門檻。
- `src/rng.js`：種子隨機串流；賽道道具與光環來自賽道種子。
- `src/world.js`、`src/geometry.js`：Three.js 繪製器、程序生成的車輛、公路、天際線、飛行效果與鏡頭。
- `src/effects.js`：固定 480 顆粒子的 GPU 池，用於蒸氣、火花與降落塵土。
- `src/track-paths.js`、`src/world-tour-scene.js`：每條賽道一份距離對應道路的映射，以及共用的世界巡迴賽道路、景物與地標。
- `src/route-map.js`、`src/i18n.js`：SVG 完整路線圖與即時車手地圖；語言偵測、已儲存的選擇、`t()` 以及英文／繁體中文的賽道名稱；`src/locales/` 存放各語言目錄。
- `scripts/capture-og-images.mjs`：從真實應用程式擷取英文與 zh-TW 的封面圖片，以及 zh-TW README 截圖。
- `src/App.vue`、`src/icons.js`：Vue 3 UI 外殼（開始畫面、HUD、面板、觸控操作）及其共用的 SVG 圖示；只繪製一次，沒有響應式狀態。
- `src/main.js`、`src/style.css`：掛載 `App.vue`、串接各畫面控制器，並執行比賽生命週期（開始、暫停、重新開始、結果）與影格迴圈。
- `src/*-ui.ts`：每個畫面區域一個 TypeScript 控制器（比賽選擇、雲端存檔、觸控操作、按鍵對應、VFX、音訊、歷史對話框、拍照模式）。
- `src/race-hud.ts`、`src/race-hud-modes.ts`：比賽中的 HUD，在每次 HUD 更新時以命令式方式寫入。
- `src/race-results.ts`、`src/result-screen.ts`、`src/session-progress.ts`：記錄完成的比賽（最佳、解鎖、獎牌、幽靈）並顯示其結果畫面。
- `vite.config.js`：搭配 `@vitejs/plugin-vue` 的 Vite。
- `src/perf.js`：供 `?perf` 裝置檢查讀數使用的影格時間百分位數。
- `src/audio.js`：合成音效與循環音樂音序器；歌曲位於 `src/music-tracks.ts`，比賽到聲音的事件位於 `src/race-audio-events.ts`。
- `src/audio-settings.js`：從 `localStorage` 讀取已儲存的音樂／音效開關與音量，以及滑桿的靜音保留音量規則。
- `tests/`：單元與瀏覽器行為測試。`tests/module-size.test.js` 讓每個原始碼模組維持在 400 行以內（較舊的大型檔案有只降不升的上限）。
- `docs/design.md`、`docs/verification.md`：範圍與驗證證據。
- `README.zh-TW.md`：此檔案的繁體中文翻譯，由 `scripts/readme-zh.mjs` 保持更新（`check`、以 `claude -p` 翻譯的 `sync`，以及手動編輯後的 `stamp`）。當 commit 變更 README.md 時，`.githooks/pre-commit` hook 會重新產生它（以 `SKIP_README_ZH=1` 略過一次），而當推送的 commit 涉及主畫面（`index.html`、`src/App.vue`、`src/main.js`、`src/style.css`、`src/locales/`；以 `SKIP_LAYOUT_GATE=1` 略過一次）時，`.githooks/pre-push` 會執行 `npm run test:layout`；`make` 會以 `git config core.hooksPath .githooks` 啟用這些 hook。若某一回合編輯了 README.md 卻沒有更新它，`.claude/settings.json` 中的 Claude Code Stop hook 會讓 Claude 回頭更新。

所有車輛／景物幾何與效果皆由程式碼生成。Barlow Condensed 依 SIL Open Font License 打包於 `public/fonts/OFL.txt`。Three.js、Vue、Vite 與 Playwright 保留各自的套件授權。

原始碼：[weskao/skyline-rush](https://github.com/weskao/skyline-rush)。單人、十條賽道、街機物理。瀏覽器驗證涵蓋桌機 Chrome 與模擬的行動裝置視窗；iOS Safari 已在 iOS 模擬器中檢查（直向與橫向、Coast 與 Neon），但實體手機上的影格率尚未測量（請使用 `?perf`，見「驗證」）。
