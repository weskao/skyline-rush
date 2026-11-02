<!-- source-sha256: 0955c2d6c7f731490fb1896a17eebbdee040d554190e9a4a79b68ff05c5254c3 generated from README.md by scripts/readme-zh.mjs; edit README.md, then run the script -->
# Skyline Rush

[English](README.md) · **繁體中文**

[**開始遊玩 Skyline Rush →**](https://weskao.github.io/skyline-rush/)

一款可直接遊玩的 3D 海岸公路衝刺遊戲，主角是一輛會飛的電動跑車，以 Tesla Roadster 2 及其火箭推進器概念為藍本。靠四具藍色推進器升空，與三名對手競速，飛越車流，管理電量並降落補充。操控手感屬於虛構的街機物理；這是非官方的粉絲專案，與 Tesla 或 SpaceX 無任何關聯。

## 遊戲介紹

在經典賽中，Skyline Rush 是一款可在瀏覽器中重複挑戰的短程街機衝刺：一名玩家對上三名對手與其間的車流，電腦或手機皆可遊玩，無需安裝任何東西。其他模式則提供單人駕駛、自訂規則與多階段挑戰。

- **先開車，再飛行。** 時速超過 65 km/h 後，按住 FLY 即可升空，飛越車流、穿過光環、跨越斷橋。飛行與 BOOST 共用同一份推進器電量，且只有在地面行駛時才會回充，因此每一次爬升都是一個抉擇。
- **靠好的駕駛賺取 NITRO。** 近距離超車、漂移、光環組合（PERFECT LINE）、尾流、成功落地的桶滾以及拾取道具，都會填滿三格的 NITRO 儲備；可一次爆發用完，也可連按延長。
- **十條賽道，依序解鎖。** 黃昏的 Coast、下雨的 Neon Downtown（有低矮隧道）、有斷橋缺口與側風的 Canyon Skyway、有冰面與上坡的 Aurora Pass、擁有跳台與斷裂天橋的 360° 高架螺旋 Sky Spiral，接著是世界巡迴賽：Taipei Heritage、Tokyo Afterdark、Alpine Rail Pass、Coastal Horizon 與 Cosmic Orbit。每條賽道都有一條空中捷徑，留給能在空中穩住路線的玩家。
- **有目標可追。** 每次完賽都會累積風格星星，用來解鎖車庫中的塗裝。最佳成績幽靈車、擁有專屬排行榜的每日挑戰以及四種獎牌，都是再賽一場的理由。

一場經典衝刺約一分鐘；多階段挑戰則需要更長時間。音效在瀏覽器中即時合成，進度儲存在本機儲存空間，因此無需帳號或後端。

https://github.com/user-attachments/assets/e0ddb94c-794e-49ab-9b66-51cb5150f101

<p align="center"><img src="artifacts/readme-tracks.jpeg?v=20261102a" width="70%" alt="Four of the ten tracks in flight: Neon Downtown, Aurora Pass, Sky Spiral and Tokyo Afterdark"></p>

<p align="center"><img src="artifacts/readme-start.zh-TW.jpeg?v=20261102a" width="49%" alt="Start screen with game modes, tracks and Start race"> <img src="artifacts/race-results.zh-TW.jpeg?v=20261024a" width="49%" alt="Race results with a new personal best"></p>

### 在手機上遊玩

支援直向或橫向觸控操作；AUTO 會持續按住油門。[觀看 MP4](artifacts/mobile-demo.mp4)

<p align="center"><img src="artifacts/mobile-home.jpeg" height="300" alt="Mobile portrait start screen with track selection"> <img src="artifacts/mobile-landscape-flight.jpeg" height="300" alt="Mobile landscape flight with FLY held and the touch controls visible"></p>

截圖取自全新設定檔下的 Chrome 行動裝置模擬（390×844 與 844×390）；並非實體手機的效能量測。

## 遊戲模式與重玩價值（開發分支）

> **開發中 · 2026 年 10 月 29 日。** 這些模式新增內容合併於 `feature/roadmap-integration` 開發分支，尚未合併至 `main`，也不在[已部署的 GitHub Pages 版本](https://weskao.github.io/skyline-rush/)中。

選擇一條**已解鎖的賽道**，在賽道卡片下方選擇 **GAME MODE**，需要時展開其規則，然後按下 **開始比賽**（或按 Enter）。比賽仍使用相同的 Three.js 道路、飛行、FLY / BOOST / NITRO 與響應式觸控操作。開發分支包含以下模式：

| 模式 | 變化內容 | 勝利條件 / 進度 |
| --- | --- | --- |
| **經典賽** | 在 10 條賽道之一進行標準的 3 名對手衝刺，包含車流、捷徑、光環與 NITRO。 | 登上頒獎台可解鎖下一條賽道；只有經典賽會頒發生涯星星、獎牌與官方最佳成績。 |
| **自訂賽** | 選擇 **0–3 名對手**、簡單 / 普通 / 困難 AI、關閉 / 稀疏 / 普通 / 繁忙車流、NITRO 拾取道具開關，以及普通 / 寬鬆碰撞懲罰。內建五種預設：標準、車流衝刺、無道具、空中專精與精準。 | 非排名成績有自己的歷史紀錄。可進行 **1 / 2 / 3 / 5 個衝刺階段**並比較累計時間。各階段重複使用點對點路線；**並非環形賽道圈數**。 |
| **自由駕駛** | 獨自探索任何已解鎖的賽道，可調整道路車流與拾取道具，沒有名次，也不強制勝利。 | 自由駕駛、漂移與飛行，直到道路盡頭；抵達終點後以結果畫面結束本次行程，不儲存任何紀錄。這**不是**無限世界模式。 |
| **計時賽** | 單人計時衝刺，支援相容的最佳成績幽靈車與領先 / 落後分段時間。可選擇 **Clean Time Trial** 開關。 | 依賽道與規則分別記錄最佳時間；Clean 模式下只要發生任何碰撞，成績即失效，且不會取代個人最佳。 |
| **障礙賽** | 以種子生成的路邊障礙；密度分為 **標準** 或 **極限**。部分障礙會橫向掃過；警示 HUD 會預告即將出現的危險。 | 閃避障礙、靠乾淨通過獲得風格分數，並沿用一般路線的終點。障礙配置與碰撞共用確定性邏輯；經典賽不受影響。 |
| **檢查點衝刺** | 穿越發光的 3D 拱門。起始時間為 **28 秒**；每通過一個乾淨的拱門可獲得 **+10 秒**（上限 60 秒）與 **250 風格分數**。 | 在時間耗盡前通過每一個拱門並抵達終點。錯過拱門與超時**不會**儲存有效的最佳成績。HUD 會顯示已通過的拱門、剩餘時間與到下一個目標的距離。 |
| **錦標賽盃** | 選擇由已解鎖路線組成的 **3 或 5 條賽道** 盃賽；每一站與 NOVA、ORBIT 和 APEX 競速。 | 名次分別獲得 **10 / 7 / 5 / 3 分**；以累計積分與總時間決定冠軍，同分時以時間決勝。盃賽成績與生涯解鎖分開計算。 |
| **特技挑戰** | 一場 **120 / 180 / 300 秒** 的風格賽程，連續進行多個賽段：漂移、空中特技、擦身而過與光環累積連擊分數。 | 由計時器結束賽程，而非終點線；依時長分別記錄本機風格獎牌與最佳分數。 |
| **淘汰賽** | 四名車手的最後一名生存戰：每十秒淘汰一名排名最後的車手。 | 存活到成為最後的車手；過早被淘汰則結束行程，不獲得獎勵。 |

### 盃賽復原

未完成的錦標賽盃會在主畫面提供 **繼續** 或 **放棄** 選項。繼續會保留已結算的階段積分，並只重新開始未完成的階段；重試只會回溯正在重玩的那一個階段。完成或放棄盃賽會清除其復原紀錄。刪除遊戲進度時也會一併移除檢查點，但會保留裝置偏好設定。復原使用此瀏覽器的儲存空間，無法還原瀏覽器拒絕儲存的資料。

### 自訂呈現與幽靈車

自訂賽可為每個衝刺賽段重播最快的相容幽靈車。自訂賽與自由駕駛提供 Track / Day / Dusk / Night / Rain / Fog 呈現預設與即時規則摘要。這些外觀選項不會改變紀錄資格或規則集識別。重試會保留所選外觀；更換賽道或回到經典賽則會恢復賽道原本的外觀。照相模式關閉時會恢復目前比賽的外觀。

### 可選道具與獎勵門

自訂賽與自由駕駛提供 **Off / Classic Mystery Rings / Active Items / All Items**。持有的道具使用單一欄位：按 **Q** 或點按 **USE** 啟動，然後等待冷卻。NITRO 與 FLY/BOOST 保有各自的操作。All Items 會加入有限度的加速、空中電量與一次碰撞復原門；EMP 會短暫減慢附近的對手，在單人遊玩時則轉換為磁鐵。復原會保留官方的碰撞次數。特技挑戰與檢查點衝刺可另外選擇啟用暫時性、不可疊加的 ×2 分數門。經典賽的預設值維持不變。

### Event Lab Lite v1

**Event Lab Lite** 可編輯本機的賽道範本，在已解鎖的路線上放置障礙、NITRO 光環與補給。可變更其車道與距離，對編輯進行 Undo/Redo/Reset，並以文字匯入或匯出經過驗證的賽道。開始後會將賽道編譯成真正的比賽事件；重試會保留賽道與種子。賽道成績與生涯及自訂賽紀錄分開。圓錐、自製跳台、檢查點編輯與社群分享不在第一版範圍內。

### Endless Highway

**Endless Highway** 將 Coast 延伸到原有終點之外，成為一項距離生存活動。車流難度會上升至固定上限；發生五次碰撞則結束一次完整的嘗試。個人紀錄追蹤最長的絕對距離，與生涯及幽靈車分開。暫停與 WebGL 復原都會保留行程。第一版只支援 Coast；其周邊景物與事件使用有界的物件池。

### Circuit Race

**Circuit Race** 新增 Harbor Circuit，這是一條獨立、永遠可進入的 2 公里封閉環形賽道，圈數可選 **1 / 3 / 5 圈**。必須依序通過每一個區段才能計為一圈；倒退通過、傳送與復原都無法獲得圈數。HUD 與結果畫面會顯示分段時間、上一圈、個人最佳單圈與總時間。單圈最佳成績不會因歷史紀錄輪替而消失；總時間與幽靈車則依圈數設定分開計算。原有的十條點對點賽道保留其地理環境與生涯進度。

### 賽道主題、障礙與風險路線

- **賽道主題**（可在自訂賽、自由駕駛與障礙賽中選用）讓每條路線都有專屬的危險：Coast 的貨物與陣風、Neon 的道路施工、Canyon 的落石、Aurora 的雪堆、冰面與暴風雪、Sky Spiral 的能量門、Taipei 的慶典路障、Tokyo 的號誌門、Alpine 的雪崩、Coastal 的浪花飛沫，以及 Cosmic 的能量牆。危險會事先警示、一律保留兩條車道暢通，且絕不改變經典賽。
- **障礙賽** 提供 **Mixed obstacles** 賽道：擺盪的門、落下的碎片，以及設在路障上方、鼓勵飛越或繞行的圓環。
- **風險路線**：高風險光環與近距離超車在自訂賽困難模式下給分更高，也可以關閉以進行輕鬆練習。
- 道路新增了不可碰撞的路邊生態：觀眾、廣告看板、服務廂型車、鐵路月台、經過的列車、船隻與無人機。較低的畫質設定會繪製較少的內容。

### 比賽設定、結果與無障礙

- 模式與賽道的選擇仍可透過鍵盤與觸控操作；情境面板只顯示與所選模式相關的選項。無法使用的盃賽會說明還需要多少條賽道。
- HUD 會依模式調整：單人活動會隱藏容易造成誤解的對手排名；多階段與盃賽顯示階段進度；檢查點衝刺顯示即時的拱門倒數；障礙賽警示接近中的障礙；Clean Time Trial 會明顯標示成績已失效。
- 練習、自訂、計時賽、障礙賽、檢查點與盃賽結果使用另一組紀錄鍵 `skyline-rush-mode-history-v1`。符合資格的練習幽靈車有自己儲存的規則集；經典賽的解鎖、星星、獎牌、每日紀錄與官方時間不會受到練習成績影響。
- 在 **History → Challenge records** 中，可依模式篩選，查看每個確切賽道/規則集的個人最佳與符合資格的計時賽幽靈車。即使最近 50 場紀錄輪替，終身最佳仍會保存在 `skyline-rush-mode-bests-v1`。挑戰紀錄明確不屬於生涯獎牌或星星。
- 模式標籤、結果說明、設定選項與危險警示支援英文與繁體中文。低畫質、觸控操作與減少動態效果仍列在驗證計畫中。

### 真實遊戲截圖與驗證

用來檢視這些模式的截圖是**從執行中的瀏覽器遊戲**擷取，而非概念圖。[下載實際的 Playwright 擷取集](https://github.com/weskao/skyline-rush/actions/runs/39742666980/artifacts/12410172411)（自訂賽單人、自由駕駛、計時賽、障礙賽、極限障礙、檢查點衝刺與行動版模式選單）。GitHub Actions 的產出檔案可能需要登入且會過期；若要在本機重現，請執行 `npx playwright test tests/race-modes-browser.spec.js` 並開啟 `test-results/race-mode-*.png`。CI 截圖由軟體算繪且解析度較低，不代表最終的裝置畫質。

**驗證：** 每項功能的測試與完整關卡收據都列於 `TODO.md`。實體 iPhone 與 Android 的檢查仍待進行。

## 在本機執行

需要 Node.js 22.12 或更新版本，以及支援 WebGL 2 與硬體加速的瀏覽器。

```sh
cd "$HOME/Documents/Workspace/skyline-rush"
make         # Installs dependencies on first run, then starts the Vite + Vue dev server
```

開啟 Vite 印出的本機網址（通常是 http://127.0.0.1:5173）。資源與字型皆已在本機打包；遊戲過程不會發出任何外部請求。不需要後端或帳號。

`make` 與 `make dev-unlocked` 也會啟動本機的 Firebase Auth/Firestore 模擬器（需要 Java 21+），因此雲端存檔的 Google 登入可搭配假的測試帳號運作，絕不會碰到真實存檔。雲端存檔的操作與專案擁有者的 Spark 額度檢查請見 `docs/cloud-save.md`。

`make dev-diag` 與 `make phone-diag` 會提供相同的版本，但編入畫面上的診斷橫幅（影格計數器、頁面生命週期與觸控事件及其命中目標，以及跨重新載入保留的最後幾個未捕捉錯誤），用於在真實手機上追查當機或按鈕失效的問題。正式版建置絕不包含它：`npm run build` 會拒絕帶有診斷模組的封裝。

`make phone` 會開啟一個終端機選單，用來啟動、檢查或停止可供手機開啟的開發伺服器（透過 Tailscale 或同一個 Wi-Fi），並在伺服器回應後印出手機網址。選單會列出此工作目錄、其他 worktree 與近期分支，也可輸入分支名稱；`make phone <name>` 會直接前往該分支（或 `feature/<name>`），需要時會在 `.claude/worktrees/` 下建立其 worktree；`make phone off` 會停止它啟動的所有伺服器（如同 `/phone-dev off`）；`y=1`（例如 `make phone y=1 <name>`）會略過選單：每個問題都採用其推薦選項，並印出每項選擇。當某個連接埠已被本專案先前的伺服器佔用（任何 worktree）時，重用該連接埠是推薦的做法：舊伺服器會被停止，網址維持不變；`make dev`、`make dev-diag`、`make dev-unlocked`（5173）與 `make dev-feature`（5443）會不經詢問直接這樣做，並且不會動到其他專案的伺服器。它提供的是正常上鎖的建置；`make phone-unlocked [name]` 是相同的選單，但解鎖所有賽道與塗裝，是手機唯一能連上的全解鎖伺服器（`make dev-unlocked` 與 `make dev-feature` 仍僅限桌面）。它需要個人的 `phone-dev` Claude Code 技能（`/phone-dev` 會詢問相同的選單），並且不使用模擬器運行，因此手機上的雲端存檔登入使用的是真實專案。

## 操作方式

| 動作 | 鍵盤 |
| --- | --- |
| 加速 | W / ↑ |
| 煞車 | S / ↓ |
| 轉向 | A / D 或 ← / → |
| 飛行 | 時速超過 65 km/h 後按住 Space |
| 降落 | 放開 Space |
| 加速推進 | 按住 Shift；消耗推進器電量 |
| NITRO | E / X（一格完整電量；NITRO 期間再按一次可延長）。WASD 操作者使用 E；方向鍵操作者讓左手留在 Shift / X / Space |
| 漂移 | 時速超過 162 km/h 時按住 S + A / D（僅限地面） |
| 開始 | Enter |
| 暫停 / 繼續 | Esc / P |
| 重新開始 | Backspace |
| 切換鏡頭 | C |
| 全部音訊靜音 / 取消靜音 | M |
| 自動油門 開 / 關 | F2 / AUTO 按鈕 |
| AIRFLOW 展示 開 / 關 | V / AIRFLOW 按鈕 |
| 在主畫面切換賽道 | 左右滑動或拖曳 3D 預覽，或在觸控板上用兩指滑動 |

行動版版面提供轉向、油門、煞車、加速、飛行與 NITRO 按鈕。觸控操作支援同時按住多個按鈕。AUTO 會持續按住油門，讓你專心轉向與飛行；煞車一律優先於它。每種裝置預設皆為開啟；一旦你切換過，你的選擇會記在此瀏覽器中（`skyline-rush-auto`）。離開分頁會暫停比賽並清除按住的輸入。在比賽中點按 SKYLINE RUSH 標誌會暫停並先詢問：**繼續比賽**、**結束比賽**（回到賽道選擇，不儲存本次成績）或 **回到首頁**（重新載入）；無論哪一種，開始畫面都會重新開啟在剛比賽過的賽道上，並捲動到賽道列的中央（第一條與最後一條賽道位於其兩端）。Esc 會讓比賽維持暫停。鏡頭與音效快捷鍵會保留按住中的駕駛操作。在觸控上，拇指在轉向板上向下滑動會煞車，向下並向側邊滑動則會漂移；在 Buttons 模式中，較細的煞車鍵位於轉向按鈕上方、離開拇指擱置的那一排，因此只會在刻意時才被按到；把拇指從 ← 或 → 往上滑入煞車鍵，會同時轉向並煞車，所以單一拇指就能漂移，往下滑回則會放開煞車。觸控按鈕與螢幕角落保持距離，方便拇指觸及，平板則會將它們抬高並放大。

比賽前或暫停時開啟 **Controls**，可調整鍵盤轉向靈敏度或重新對應駕駛動作。選擇一個動作，然後按下按鍵；衝突的按鍵綁定會互換，固定的快捷鍵保持保留，按 Escape 取消擷取。Reset keyboard 會還原預設值。綁定會立即生效，並儲存在 `localStorage['skyline-rush-keymap']`。

同一個面板也控制觸控轉向模式、慣用手、滑動靈敏度、大小、不透明度以及按住/切換式 FLY。**Edit touch layout** 讓你在比賽預覽上拖曳動作按鈕與經典轉向按鈕；**Done editing** 會保留配置，**Reset touch layout** 則還原。位置會在重新載入後保留、隨慣用手鏡像，並在旋轉後維持在視窗範圍內。在矮的橫向螢幕上（高度低於 380 px，例如顯示工具列的 iPhone Safari），開始畫面會省略標語，讓 START RACE 不需捲動，比賽 HUD 也會隱藏速度表與次要電量列，避免面板互相重疊。

所有音訊皆以 Web Audio 合成；不需要下載任何音訊。背景音樂有兩首循環的 synthwave 曲目：開始與結果畫面使用的前奏主題（約 64 秒），以及從倒數開始播放、節奏較快的比賽主題（約 55 秒）。每首都會隨循環逐步堆疊，並在暫停時降低音量。音效涵蓋選單確認、三次倒數滴答與 GO、馬達/風聲、升空與加速、煞車、車輛/護欄碰撞、降落、低電量警告、近距離超車獎勵以及終點旋律。將音效靜音會停止待播的提示音，暫停則會淡出駕駛聲音。低電量警告只有在電量回充至 30% 以上後才會重新啟用。

喇叭圖示會開啟音訊設定，包含 Music 列與 Sound effects 列，各有一個靜音開關與一個音量滑桿（上方開始畫面截圖中呈現展開狀態）。**Mute all**（或 M）會同時讓兩者靜音。靜音會保留各頻道的音量，因此取消靜音會回到原本的音量；將滑桿拖到零，會以相同方式讓該頻道靜音。兩者預設皆為開啟且音量 100%，每項開關選擇與音量都會記在 `localStorage` 中（`skyline-rush-music`、`skyline-rush-sound` 存放 `on`/`off`，另有存放百分比的 `-volume` 變體）；若沒有任何儲存值，兩個頻道皆為開啟，並會以 `on` 儲存。在矮的螢幕上，面板可捲動。在瀏覽器允許自動播放的情況下，前奏音樂會在頁面載入後立即開始。若不允許（Chrome 與多數其他瀏覽器的首次造訪），則第一次點按、點擊或按鍵就會啟動它。在 iPhone 與 iPad 上，遊戲會要求媒體播放，因此靜音開關不會讓它靜音；這也會在遊戲進行時暫停其他應用程式的音訊。

飛行面板會顯示爬升、巡航、下降與觸地、剩餘推進秒數，以及下一個要使用的操作。青色光環標示空中走廊，且屬於遊戲玩法：請見下方的光環。行動版也有按住加速推進的按鈕。橘色的碰撞報告會顯示撞擊類型與損失的速度；護欄現在會彈開並減慢地面上的車輛。在護欄上方飛行則可越過護欄。

場景包含泛光照明、日落海水、懸索橋、推進器蒸氣、碰撞火花與觸地漣漪。鏡頭運動與非必要的速度線會遵循你系統的減少動態效果偏好。音效為推進、碰撞與降落提供各自獨立的回饋。

**VFX**（右上角）可選擇 Realistic、Cinematic 或 Extreme 風格、Low / Medium / High 畫質（Low 會關閉泛光並繪製較少景物）、Comfort mode（無閃光、震動、殘影或模糊）以及可選的觸覺回饋。其 **Race HUD** 區段可選擇 Immersive 或 Competitive（具有排行榜、小地圖與次要統計的開關），可開啟或關閉 NITRO READY 音效與動畫，**Reset HUD to default** 則會還原它們。**Fine tuning** 將每個效果以滑桿呈現，**Reset visual settings** 則還原預設值。**AIRFLOW**（或 V）會將場景切換為空氣動力學展示：車身上的流線、遙測面板、Low drag 或 High downforce，以及駕駛、前、後、側或環繞鏡頭。開始面板會讓位給展示畫面，只留下橘色的 **START RACE** 按鈕，停靠在車子下方的底部中央；左右滑動場景即可切換賽道。第一次開啟 AIRFLOW 時，會有一個動畫指尖示範該手勢。流線只在 AIRFLOW 開啟時出現：關閉時，BOOST 與 NITRO 會顯示推進器噴流、尾跡與速度線，但沒有流線。

三盞琥珀色起跑燈會在 GO 時轉為青色。玩家的車是一輛低矮的楔形敞篷跑車，有煙燻色的快背座艙、全寬的紅色尾燈條、四個後推進器噴口、會在加速、煞車與飛行時升起的青銅色彈出式尾翼、轉動的五輻輪圈，以及可轉向的前輪。每名對手都有自己的輪廓與燈光特徵：NOVA 是長尾車型，配雙垂直尾翼與分離式洋紅色燈光；ORBIT 是圓潤的 GT，配氣泡座艙與圓形青色車燈；APEX 是賽道車，配前分流器、車頂進氣口、高聳的端板尾翼與琥珀色 C 形燈。車流使用直立的通勤車造型。轉向會快速回應，放開加速推進時車速會逐漸降低，而不是瞬間切斷。所有駕駛與工具列按鈕至少都有 44px 的觸控目標，包括在 320px 寬度下。

若想獲得額外的電量獎勵，請在時速超過 126 km/h 時於地面近距離超越車流。五秒內的乾淨超車最多可連鎖到 ×5，並回充 8–16% 的電量（上限 100%）。碰撞會中斷連鎖；在空中、距離過遠與復原中的超車不會獲得獎勵。HUD 會公告每次超車與最後 500 公尺；結果畫面會顯示近距離超車與碰撞的總數。

飛行電量在全推力下約可持續五秒。電量歸零時，車子會自動下降；放開飛行操作並在地面行駛即可回充。同一份電量也供給加速推進使用。碰撞會讓車子減速；飛得夠高則可避開車流。對手與車流遵守相同的碰撞規則：它們會繞過較慢的車與玩家、像你一樣撞上道具、護欄與危險物，而碰撞會使兩輛車減速並互相推擠（車流之後會加速回到巡航速度）。在 NOVA、ORBIT 與 APEX 之前完成衝刺（依賽道不同為 4–8 公里）。個人最佳時間在儲存空間可用時會儲存在此瀏覽器中。

### 操控細節

轉向會在 0.15 秒內增至全幅，高速時橫向速度上限為 9 m/s。在 65 km/h 以下按住 Fly 會被記住 1.5 秒，並在速度足夠時自動升空。在空中放開 Fly 會降低下墜加速度（11 → 7 m/s²）以便更柔和地降落，並緩慢回充飛行電量（每秒 4，為地面回充速率的三分之一；電量說明文字顯示 GLIDE RECHARGE ACTIVE）。耗盡的推進器在放開 Fly 且電量回到 15 後即可再次使用，即使在空中也一樣。在斷橋 300 公尺內（Sky Spiral 除外，其跳台會將車子拋過去），當剩餘電量以目前速度無法推進越過缺口時，HUD 中央會警示 GAP AHEAD · NEED n% CHARGE。車輛的碰撞寬度為 1.7 公尺，因此更多超車會被計為擦身而過。輕微觸碰護欄屬於擦撞（保留 0.92 的速度、被推回道路上、不算碰撞、連擊保留）；正面撞擊仍算作碰撞。開啟 AUTO 時，放開轉向也會讓車子緩緩回到最近的車道中央（車道輔助）。同時按住 Fly + Boost 每秒消耗 22 點電量而非 29，維持加速推進的速度上限，並顯示 AIR DASH。

### NITRO 與漂移

NITRO 有自己的儲備（`player.nitro`，最多 3 格，每格以浮點數填充）。三段式 HUD 會顯示部分電量，滿格區段會發光，滿載時 NITRO MAX 會脈動（舒適/減少動態效果模式下會抑制動態）。賽道上的拾取道具（藍色電池 +0.25、橘色罐子 +0.5、空中金色油箱 +1、一個填滿至上限的彩虹過充）遵循與光環相同的規則：起跑格上每輛車有 5 個欄位，每個欄位是 1 到 4 個一組（該欄位的拾取道具，接著是沿其路線每隔 8 公尺的電池），外加過充與每條捷徑的獎勵線，每場比賽都會重新隨機；每次 NITRO 獎勵（拾取、漂移、桶滾、光環、尾流）也會回充飛行電量（每儲存 0.25 = +5；過充則不提供），而超過上限的部分會轉為電量（每 0.25 = +8）。一格會提供 2.5 秒，速度上限提高 30 m/s，並有更強的加速、排氣與鏡頭回饋；再按一次可延長 2 秒且不疊加速度，因此連按三次會連成 6.5 秒的爆發。NITRO 期間碰到車流會保留 70% 的速度，而非 45%。

在地面時速超過 162 km/h 時，煞車 + 轉向會改為漂移而非硬煞車：只損失 3 m/s²，擦身連擊分數加倍，放開時依漂移時間給予 NITRO 加上迷你加速（1 秒：+0.15 與 0.5 秒，2 秒：+0.3 與 0.8 秒，3 秒：+0.5 與 1.2 秒）。車身偏擺 25°，煙霧與藍/橘/紫色火花顯示等級，輪胎尖嘯聲逐漸增強，HUD 會標示漂移/迷你加速狀態。起飛、掉入缺口，或撞上車輛或障礙都會失去累積。

NITRO 不消耗電量，因此 Fly + NITRO 永遠可以一起使用（Fly + Boost + NITRO 則維持每秒 22 的 AIR DASH 消耗）。

**空中特技**：飛行時，快速甩動轉向（0.3 秒內兩次相反方向的按壓）會開始 0.7 秒的桶滾。以低於 11 m/s 的速度完成桶滾並落地可獲得 +0.25 NITRO；較猛烈的落地（無動力下墜約 9 公尺或更高）會失去獎勵。過早落地、撞到任何東西、隧道頂或缺口都會取消桶滾。車子會旋轉（減少動態效果與 Comfortable VFX 會保留文字但取消旋轉），HUD 顯示 TRICK，並以 BARREL ROLL / TRICK +0.25 / HARD LANDING 提示、呼嘯聲，以及觸控上的短暫觸覺震動來標示桶滾與其獎勵。

**捷徑**：每條賽道都有一條位於邊緣車道上方 6 公尺的空中走廊，標有 SHORTCUT / FLY HIGH。在其中飛行不消耗電量，速度上限提高 12 m/s；走廊兩側排列著 NITRO 電池，並在中途放有一個油箱，但交錯的塔柱會被計為撞上障礙。走廊地板以賽道主題色的半透明甲板標示；在走廊內，HUD 顯示 SHORTCUT，且飛行預算顯示 ∞（BOOST 仍會消耗電量）。

### 光環

每場比賽每輛起跑格上的車有 5 個光環欄位（單人 5 個，八輛車的完整起跑格 40 個；Circuit 則為每圈），由起點到終點散佈，每一段等長的道路一個，分成 3 到 5 個一組。在一般道路上（遠離隧道、缺口、捷徑與其他區段），約每五個欄位中有一個會變成由 6 個光環組成的光環列，間隔 25 公尺，沿著中間車道（車道 2 或 3，因此直線行駛即可連鎖每一個光環）排列，大多在路面上，五分之一在空中，這本身就是一次 PERFECT LINE；約每十二個中有一個會變成全寬的光環排，路上任何車輛都能通過，每輛車算一個光環。風險光環與前兩個欄位維持單一光環。Endless 每 500 公尺的區塊有三個單一光環、一列中間車道光環、每三個區塊一個全寬光環排，以及五組拾取道具。它們的位置每場比賽都會重新隨機。Coast 保持其位於 x 2.5 的門線。只有當車子穿過光環可見的半徑時才會計算；擦過邊緣不算。種類有：青色電量（+20 電量）、金色 nitro（+0.5）、紫色尾流（3 秒迷你加速）、紅色風險（較小的光環，+1 NITRO 與 500 分）以及彩虹神祕（依種子隨機的一種效果：護盾 10 秒或直到第一次被撞、磁鐵 5 秒、穿越車流的幽靈 3 秒，或將對手凍結為半速 2 秒）。收集的光環會爆開一次後消失。清除整組光環會公告 PERFECT LINE 並獲得 +1 NITRO；漏掉一個光環會中斷它，但保留已獲得的獎勵。

### 對手、尾流與最後衝刺

緊跟在對手或車流車輛後方 1.5 秒，可獲得 +6 m/s 的速度上限與 +0.25 NITRO（離開尾流才會重新啟用）。對手也會使用 NITRO，每名兩格，依個性而定：NOVA 從 8 秒起穩定施放，之後每 18 秒一次；ORBIT 在飛行時施放；APEX 從比賽的 75% 起猛然加速。輕度的橡皮筋機制（超過 50 公尺後最多 ±4% 速度）讓比賽保持緊張。在最後 500 公尺，比賽音樂會加快到 115%，狀態列會顯示與前方及後方最近對手的差距（`FINAL 500 M · +N m · −N m`）。

### 儲存資料

所有儲存都使用 try/catch，因此在儲存空間被封鎖時遊戲仍可運作。`skyline-rush-history`：每場完成的比賽一筆紀錄，保留最近 50 筆，包含 `fuelOuts`（飛行電量耗盡的次數）與 `gapFalls`，用於調校飛行平衡。從開始或結果畫面開啟 **History**，可依賽道篩選、查看最佳成績與最近十次時間的圖表，並點按某場比賽查看詳情。`skyline-rush-best-tracks`：每條賽道的最佳時間；舊的單一 `skyline-rush-best` 會一次性遷移到 `coast`，且 coast 仍會寫入它。`skyline-rush-unlocked`：賽道解鎖，即使較舊的比賽離開 History 後仍會保留。`skyline-rush-keymap`：按鍵綁定。`skyline-rush-controls` 與 `skyline-rush-vfx`：駕駛與視覺設定（幽靈車開關位於 controls 中）。`skyline-rush-ghosts`：每條賽道一個最佳成績幽靈車。`skyline-rush-medals`、`skyline-rush-stars`、`skyline-rush-paint`：附帶獲得日期的獎牌、每條賽道的最佳星星、已裝備的塗裝。`skyline-rush-daily`：每日挑戰紀錄，最近 50 筆。每個已儲存的值在載入時都會經過驗證；任何格式錯誤的內容都會被忽略。

### 幽靈車、每日挑戰、獎牌與車庫

- **幽靈車**：每場比賽每秒 10 次取樣車子的距離、車道位置與高度。賽道上新的個人最佳會儲存該場比賽，之後在該賽道的比賽中會顯示為半透明的藍色車子。預設為關閉；可在 Controls 中以 **Show best-run ghost** 開啟。
- **每日挑戰**：History 會顯示今日的賽道與修飾條件，依本機日期選出：禁止飛行、雙倍車流，或只有金色光環。Canyon 絕不會出現禁止飛行，因為其斷橋需要飛行。每日成績只會進入自己的排行榜（今日最快的五名）；絕不會影響歷史紀錄、最佳時間、解鎖、星星或幽靈車。重新開始會保留該挑戰，**Choose track** 則會離開它。
- **獎牌**：First victory（獲勝）、Clean run（無碰撞）、Perfect flight（單場比賽 5 次 PERFECT LINE）與 Triple burst（一次爆發中 3 格 NITRO：一次按壓加兩次延長）。只有符合資格的經典賽完賽才能頒發；每枚獎牌都會保留首次獲得的日期。
- **車庫**：你在每條賽道上的最佳風格星星會累加並解鎖塗裝：3 顆解鎖 Aurora、6 顆解鎖 Glacier、10 顆解鎖 Coral、16 顆解鎖 Cobalt、24 顆解鎖 Obsidian（上限為 30 顆）。現實世界中最受歡迎的車色——藍色與黑色——是長期目標。未解鎖的塗裝仍可預覽。塗裝只改變外觀，絕不影響車子的數值。

### Sky Spiral（實驗性的第五條賽道）

Sky Spiral 加入了一條位於賽博龐克天際線上方、真正的 3D 上升螺旋道路。繞著發光的中央高塔完整行駛一圈水平迴轉，然後從三座專用跳台發射，越過高架缺口。現有的 FLY、BOOST 與 NITRO 都能在新賽道上使用，並可選擇飛行修正。此賽道使用獨立的彎曲道路算繪器與自己的 3D 路徑對應器；仍在實體行動硬體上驗證中。

### 賽道與風格

從 Coast 開始。進入前三名即可解鎖 Neon Downtown，接著依序是 Canyon Skyway、Aurora Pass、Sky Spiral、Taipei Heritage、Tokyo Afterdark、Alpine Rail Pass、Coastal Horizon 與 Cosmic Orbit。開始前先選擇賽道，或左右滑動 3D 預覽（用滑鼠拖曳，或在觸控板上以兩指橫向滑動）像輪播一樣翻到相鄰的賽道：它會跟隨手指，輕輕一撥就夠，第一條與最後一條賽道會有橡皮筋般的回彈，並有一個標籤顯示賽道名稱與分頁圓點；鍵盤使用者可用 Left/Right 在賽道按鈕之間移動，並以 Enter 選擇。當仍有賽道處於鎖定狀態時，登上頒獎台後結果畫面會顯示一個閃動的 **Next** 按鈕，可立即開始剛解鎖的賽道；一旦所有賽道原本就已開啟，以及在每日挑戰中，它就會消失。若瀏覽器中斷了 WebGL 連線（在 iPhone 上鎖定螢幕或切換應用程式後很常見），遊戲會在圖形恢復時清除警告；否則 **Start** 或 **Race again** 會重新載入頁面。每條賽道都有自己的天空、色調與程序生成的景物：下雨的霓虹街道與低矮隧道、紅色沙漠峭壁與斷橋缺口/側風，或有極光與冰面的雪山。警告標誌會標出特殊區段。Aurora 的上坡路段回充地面燃料的速度為正常速率的一半。

### 世界巡迴賽賽道、路線地圖與賽道名稱

五條世界巡迴賽賽道共用一個彎曲道路算繪器（`src/world-tour-scene.js`），每條賽道有各自的色調、建築與地標（總統府與北門剪影、霓虹路口與高塔、鐵路高架橋與山峰、燈塔與跨海大橋、帶環行星）。在主畫面選擇世界巡迴賽賽道時，會在盤旋的車子後方框出其標誌性地標：總統府、東京鐵塔、阿爾卑斯山峰、燈塔或宇宙之門。朝它競速時，路邊會讓該地標保持清楚可見。每張賽道卡片都會顯示完整的主要路線，比賽中則有即時地圖在其上標出 YOU、NOVA、ORBIT 與 APEX；空中捷徑絕不會被繪製。在高度低於 500px 的螢幕以及高度低於 700px 的窄手機上，即時地圖會讓位，排行榜仍會為車手排名。賽道名稱會跟隨以 **EN / 繁體中文** 切換器選擇的語言（見下方的語言）。

風格分數獎勵近距離超車（100 × 連擊，漂移的連擊加倍）、光環（150，風險光環另加 500）、PERFECT LINE（500）、移動中的滯空（每秒 10）以及每 500 公尺的乾淨行駛（100）。碰撞與掉入缺口會重置乾淨距離的進度。結果會授予：完賽一顆星、每公里 250 分兩顆星、每公里 500 分三顆星，與完賽名次無關。

燃料與 nitro 條會平滑地趨近新的數值，低於 20% 容量時發出警告，回充時閃爍，並在一格 nitro 完成時脈動。舒適模式與系統的減少動態效果會停用這些動畫。滑動板在按住時會顯示浮動的圓環/旋鈕，並在比賽開始時顯示簡短提示；放開會讓轉向回到中立。

HUD 使用共用的動態時序（120 / 240 / 480 ms）。速度表指針會隨速度平滑移動；名次變化會以綠色向上或紅色向下的箭頭翻轉名次數字，排行榜的列會滑入新的位置。精簡的半透明事件提示位於視野中央上方，避開 HUD 面板，並將近距離擦身、PERFECT LINE、NITRO 爆發、電量增加與漂移火花等級排入佇列而不重疊；同時回充飛行電量的 NITRO 獎勵會標明這一點（NITRO · +20% CHARGE）。暫停、完賽與重新開始會清空佇列。按鈕被按下時會變暗而不改變大小，因此在邊框以內的任何位置按下都會生效；按住的觸控按鈕保持發亮。VFX 設定中的可選 **Haptic feedback** 會在支援的觸控裝置上標示碰撞、NITRO 與漂移獎勵。舒適模式與系統的減少動態效果會保留文字與按下狀態的顏色，同時移除新增的動態與震動。

### 語言

整個介面提供英文與繁體中文（繁體中文）：開始畫面、車庫、History、HUD、比賽提示、結果、路線地圖、設定與 3D 路標。開始畫面賽道卡片下方的一個 **EN / 繁體中文** 切換器可一次更改全部內容，無需重新載入。語言依以下順序選定：

1. 你點按切換器所儲存的選擇（`skyline-rush-locale`；只有在點按時才會寫入，絕不來自自動偵測）；
2. 你的系統語言順序（`navigator.languages`）：第一個 `en*` 或 `zh*` 項目決定結果，其他語言會被略過（`['ja-JP', 'zh-TW']` 會選擇繁體中文），任何 `zh*` 標籤（zh-TW、zh-HK、zh-Hant、zh-CN、zh-Hans、單純的 zh）都會選擇繁體中文，清單為空或缺漏時則回退到 `navigator.language`；
3. 否則使用英文。

品牌與遊戲術語在兩種語言中都維持英文：Skyline Rush、NITRO、FLY、BOOST，以及對手 NOVA、ORBIT 與 APEX。字串位於 `src/locales/`；`src/i18n.js` 負責偵測、`t()` 與目前的語言。

在地化圖片：`node scripts/capture-og-images.mjs` 會在 Chrome 中驅動真實的應用程式，並儲存 `public/og-image.en.jpeg` 與 `public/og-image.zh-TW.jpeg`（1440×900 的開始畫面），以及供繁體中文 README 使用的 `artifacts/{readme-start,readme-hero,mobile-flight,race-results}.zh-TW.jpeg`（`node scripts/capture-og-images.mjs og` 或 `readme` 只執行其中一半）。英文的 `artifacts/` 截圖絕不會被它更動。`public/manifest.webmanifest` 與應用程式圖示維持原樣：圖示不含文字，而 web app manifest 只有單一名稱與說明、沒有各語言變體，因此再加入第二份 manifest 會破壞可安裝性。

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

瀏覽器測試使用已安裝的 Google Chrome，並允許 SwiftShader 進行無頭算繪。僅有 CPU 的 CI 使用 0.25 的裝置縮放比例，以讓 3D 場景保持流暢，同時維持相同的 CSS 視窗尺寸與遊戲斷言；本機測試則以完整解析度算繪。正常遊玩使用瀏覽器可用的 GPU。英文 README 截圖僅在檔案缺失時，或使用 `UPDATE_ARTIFACTS=1 npm run test:browser` 時，才會以 JPEG（品質 70）寫入 `artifacts/`，因為即時的 3D 場景每次執行都不同；測試追蹤/結果檔案會被忽略。完整的衝刺測試在快速的機器上大約需要一分鐘，軟體算繪拖慢模擬時則更久。

```sh
npm run preview         # Serve the production build after npm run build
```

若要在手機上檢查，請在你的網路上提供該建置（`npx vite preview --host 0.0.0.0`），並以 `?perf` 開啟（例如 `http://<computer-ip>:4173/?perf`）。頂端會出現一條列，顯示過去 20 秒的比賽影格時間：中位數（p50）、第 95 百分位數（p95）、平均 fps 與取樣長度。沒有 `?perf` 時，不會量測也不會顯示任何東西。

```sh
make perf BASE=main         # A/B in Chrome at 412×915, CPU throttled 6× (RATE=20 for a low-end phone), 3 alternating rounds
make perf BASE=main VIEWPORT=desktop  # The same A/B at 1440×900 desktop size
make perf-phone             # Like make phone: asks base version, Tailscale/Wi-Fi and Telegram; logs phone temperatures
```

`make perf` 會建置此工作目錄，若有 `BASE=<git ref>` 則連該 ref 一起建置（位於 `.claude/worktrees/perf-<sha>`，下次會重複使用），每次執行在 Coast 競速 24 秒，並印出每次執行的列表以及各建置的中位數。`make perf-phone` 對於任何未傳入的項目（`BASE=`、`VIA=tailscale|wifi|auto`、`TG=0`），詢問方式與 `make phone` 相同，為每個建置印出並傳送一個 `?perf` 網址到 Telegram，在透過 USB 連接的任何 Android 手機上以 Chrome 開啟第一個（`adb reverse`，因此任何網路皆可），在按 Ctrl+C 時傳送網址已過期的通知，並每 10 秒記錄手機的感測器溫度與降頻等級（`dumpsys thermalservice`）以及 Mac 的熱警告等級，直到按下 Ctrl+C。只在相同降頻等級下比較執行結果：發熱的手機無論建置為何都會降頻並掉格。iPhone 不回報溫度。

## 部署

請至 [https://weskao.github.io/skyline-rush/](https://weskao.github.io/skyline-rush/) 遊玩。此網站為公開：訪客不需要 GitHub 帳號或 Tailscale，開發者的電腦也可以處於離線狀態。

```sh
git tag v0.4.0 && git push origin v0.4.0   # Release: deploys once CI confirms the commit already passed on main
make deploy                              # Deploy remote main manually through the same CI flow
# The on-screen version (ready screen, desktop and mobile) is `package.json`'s version; `/release` bumps it
# after scripts/release-gate.sh has seen a green CI run for the commit on main.
```

CI（`.github/workflows/ci.yml`）會在推送到 `main`、`develop`、pull request、版本標籤推送（`v*`）與手動執行時，建置並執行單元與 Chrome 瀏覽器測試。瀏覽器測試以 13 個平行分片執行，世界巡迴賽長跑測試以 5 個分片執行，依 `tests/ci-durations.json` 中量測的各測試耗時平衡（`scripts/ci-shards.mjs`），僅在 `main` 與 `develop` 上執行（其他分支執行單元與雲端存檔檢查，除非提交訊息含有 `[full-regression]` 或手動執行要求），且對同一分支的較新推送會取消被其取代的執行。在任何分支上，若推送或 pull request 只更動 `src/`、`public/`、`tests/`、`scripts/` 與 `.github/` 之外的 Markdown、文字、圖片、影片或 `Makefile`，且父提交已在該分支上通過 CI，則會略過所有套件（`scripts/ci-changes.mjs`）。手動執行會在所有檢查通過後發佈；版本標籤推送會重新執行單元測試，確認（`release-verified`）已標記的程式碼先前已在 `main` 上通過完整套件，而不是重新執行瀏覽器套件，然後發佈並驗證公開網站。在 `main` 上從未通過 CI 的提交若被打上標籤，則不會被部署。一般的分支推送與 pull request 只執行檢查。推送到 `main` 時，若其某個合併提交所合併的對象不是 `develop` 或 `hotfix/*`，`main-merge-source` 工作也會失敗（`scripts/check-main-merges.sh`），且該紅燈執行會阻擋發佈。Pages 建置使用 `--base=/skyline-rush/`，讓腳本、樣式與字型從專案網址載入。GitHub Pages 必須使用 **GitHub Actions** 作為發佈來源。手動部署需要已驗證的 GitHub CLI（`gh auth login`）；請先推送你的提交，因為 `make deploy` 使用遠端的 `main`。部署不再依賴本機的 pre-push hook 或 Netlify 登入。當任何檢查或部署在推送、標籤或手動執行時失敗，`notify-telegram` 工作會將失敗執行的連結傳送到 Telegram；它需要儲存庫密鑰 `TELEGRAM_BOT_TOKEN` 與 `TELEGRAM_CHAT_ID`（以 `gh secret set <NAME>` 設定各項，它會提示輸入值），缺少時則靜默略過。

連結預覽圖片為 `public/og-image.jpeg`，是 `public/og-image.en.jpeg` 的複本；`node scripts/capture-og-images.mjs og` 會擷取兩種語言的封面並更新該複本。爬蟲無法切換語言，因此 `index.html` 只參照英文封面（搭配 `og:locale` `en_US` 與 `og:locale:alternate` `zh_TW`），而 `public/og-image.zh-TW.jpeg` 是供直接連結使用的中文對應版本。更換封面後，請提高 `index.html` 中 `og:image` 的 `?v=`，讓社群網站抓取新的圖片。

## 專案結構

- `src/game.js`：確定性的街機模擬、對手、車流與完賽順序。
- `src/input.js`：鍵盤與多指標控制，含取消與失焦清理；讀取已儲存的按鍵對應。
- `src/key-map.js`：純粹的按鍵對應，包含 E / X NITRO、衝突互換式重新綁定、驗證與儲存。
- `src/history.js`：已儲存的遊戲資料：比賽歷史（最近 50 筆）、各賽道最佳成績與舊版遷移、生涯統計、獎牌、星星、已裝備的塗裝、幽靈車與每日排行榜。
- `src/ghost.js`：10 Hz 的幽靈車錄製、各賽道驗證與內插播放。
- `src/appearance.js`：塗裝目錄與星星解鎖門檻。
- `src/rng.js`：以種子產生的隨機串流；拾取道具與光環來自每場比賽的佈局種子（測試與工具中則為賽道種子）。
- `src/world.js`、`src/geometry.js`：Three.js 算繪器、程序生成的車輛、公路、天際線、飛行特效與鏡頭。
- `src/effects.js`：固定 480 顆粒子的 GPU 池，用於蒸氣、火花與降落塵土。
- `src/track-paths.js`、`src/world-tour-scene.js`：每條賽道一份距離到道路的對應，以及共用的世界巡迴賽道路、景物與地標。
- `src/route-map.js`、`src/i18n.js`：SVG 完整路線與即時車手地圖；語言偵測、已儲存的選擇、`t()` 與英文/繁體中文賽道名稱；`src/locales/` 存放目錄。
- `scripts/capture-og-images.mjs`：從真實的應用程式擷取英文與 zh-TW 的封面圖片以及 zh-TW README 截圖。
- `scripts/pickup-economy.mjs`：一個腳本化的機器人駕駛每條賽道，並印出每分鐘的 NITRO、BOOST 占比、燃料耗盡次數與第一次 NITRO 的時間；`tests/pickup-economy.test.js` 鎖定光環/拾取道具的佈局。
- `scripts/ci-shards.mjs`：`plan` 為每個 CI 分片提供其 Playwright 的 `--test-list`，依耗時打包測試，讓每個分片大約在同一時間完成；`refresh <run-id>` 在套件大幅變動後，依 CI 執行的日誌重寫 `tests/ci-durations.json`。
- `src/App.vue`、`src/icons.js`：Vue 3 的 UI 外殼（開始畫面、HUD、面板、觸控操作）及其共用的 SVG 圖示；只算繪一次，沒有響應式狀態。
- `src/main.js`、`src/style.css`：掛載 `App.vue`、串接各畫面控制器，並執行比賽生命週期（開始、暫停、重新開始、結果）與影格迴圈。
- `src/*-ui.ts`：每個畫面區域一個 TypeScript 控制器（比賽選擇、雲端存檔、觸控操作、按鍵對應、VFX、音訊、歷史對話框、照相模式）。
- `src/race-hud.ts`、`src/race-hud-modes.ts`：比賽中的 HUD，在每次 HUD 更新時以命令式方式寫入。
- `src/race-results.ts`、`src/result-screen.ts`、`src/session-progress.ts`：記錄已完成的比賽（最佳成績、解鎖、獎牌、幽靈車）並顯示其結果畫面。
- `vite.config.js`：搭配 `@vitejs/plugin-vue` 的 Vite。
- `src/perf.js`：用於 `?perf` 裝置檢查讀數的影格時間百分位數。
- `src/audio.js`：合成的音效與循環的音樂定序器；歌曲位於 `src/music-tracks.ts`，比賽到聲音的事件位於 `src/race-audio-events.ts`。
- `src/audio-settings.js`：從 `localStorage` 讀取已儲存的音樂/音效開關與音量，以及滑桿的「靜音保留音量」規則。
- `tests/`：單元與瀏覽器行為測試。`tests/module-size.test.js` 讓每個原始碼模組維持在 400 行以內（較舊的大型檔案有只降不升的上限）。
- `docs/design.md`、`docs/verification.md`：範圍與驗證證據。
- `README.zh-TW.md`：本檔案的繁體中文翻譯，由 `scripts/readme-zh.mjs` 保持更新（`check`、以 `claude -p` 翻譯的 `sync`，以及手動編輯後的 `stamp`）。`.githooks/pre-commit` hook 會在提交更動 README.md 時重新產生它（以 `SKIP_README_ZH=1` 略過一次），`.githooks/pre-push` 會在被推送的提交觸及主畫面時執行 `npm run test:layout`（`index.html`、`src/App.vue`、`src/main.js`、`src/style.css`、`src/locales/`；以 `SKIP_LAYOUT_GATE=1` 略過一次），而 `.githooks/main-merge-guard`（由 `pre-merge-commit` 與 `pre-commit` 執行）會拒絕將 `develop` 或 `hotfix/*` 以外的任何分支合併到 `main`（快轉合併不會執行 hook，因此請使用 `--no-ff`；以 `ALLOW_MAIN_MERGE=1` 略過一次）；`make` 會以 `git config core.hooksPath .githooks` 啟用這些 hook。`.claude/settings.json` 中的 Claude Code Stop hook，會在某回合編輯了 README.md 卻沒有更新它時，讓 Claude 回頭更新。

所有車輛/景物的幾何與特效皆由程式碼產生。Barlow Condensed 依 SIL Open Font License 打包於 `public/fonts/OFL.txt`。Three.js、Vue、Vite 與 Playwright 保留各自的套件授權。

原始碼：[weskao/skyline-rush](https://github.com/weskao/skyline-rush)。單人遊玩、十條賽道、街機物理。瀏覽器驗證涵蓋桌面版 Chrome 與模擬的行動裝置視窗；iOS Safari 已在 iOS 模擬器中檢查（直向與橫向、Coast 與 Neon），但實體手機上的影格率尚未量測（請使用 `?perf`，見驗證）。
