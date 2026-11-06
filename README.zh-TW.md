<!-- source-sha256: bbf83312f7006396470c0c24d56aa222b896d0bafadf756fb144b4c200fc94eb generated from README.md by scripts/readme-zh.mjs; edit README.md, then run the script -->
# Skyline Rush

[English](README.md) · **繁體中文**

[**遊玩 Skyline Rush →**](https://weskao.github.io/skyline-rush/)

這是一款可遊玩的 3D 海岸公路衝刺遊戲，主角是一輛飛行電動跑車，造型參考 Tesla Roadster 2 及其火箭推進器概念。以四具藍色推進器升空，與三名對手競速，飛越車流，管理電量並降落充電。操控屬於虛構的街機物理；這是非官方的粉絲專案，與 Tesla 或 SpaceX 無任何關聯。

## 遊戲介紹

在 Classic Race 中，Skyline Rush 是一場可在瀏覽器中重複遊玩的短程街機衝刺：一名玩家對上三名對手，以及穿梭其間的車流，桌機或手機皆可，無需安裝任何東西。其他模式提供單人駕駛、自訂規則與多階段挑戰。

- **先開車，再飛行。** 時速超過 65 km/h 後，按住 FLY 即可升空，飛越車流、穿過光環、跨越斷橋。飛行與 BOOST 共用同一份推進器電量，而電量只有在路面上才會回充，因此每次爬升都是一次取捨。
- **靠好好駕駛賺取 NITRO。** 近距離超車、飄移、光環組（PERFECT LINE）、尾流、成功落地的桶滾以及拾取道具，都會填滿三格 NITRO 儲備；可一次爆發用完，也可連按延長。
- **十條賽道，依序解鎖。** 黃昏海岸、下雨的 Neon Downtown 與低矮隧道、有斷橋與側風的 Canyon Skyway、有冰面與上坡的 Aurora Pass、擁有跳台與斷裂天橋的 360° 高架螺旋 Sky Spiral，接著是 World Tour：Taipei Heritage、Tokyo Afterdark、Alpine Rail Pass、Coastal Horizon 與 Cosmic Orbit。每條賽道都有一條空中捷徑，留給能在空中穩住路線的玩家。
- **有目標可追。** 每次完賽都會累積風格星數，用來在 Garage 解鎖塗裝。最佳成績幽靈車、擁有專屬排行榜的每日挑戰以及四種獎章，讓你有理由再跑一次。

一場 Classic 衝刺約一分鐘；多階段挑戰則更久。音效由瀏覽器合成，進度儲存在本機儲存空間，因此不需要帳號或後端。

https://github.com/user-attachments/assets/e0ddb94c-794e-49ab-9b66-51cb5150f101

<p align="center"><img src="artifacts/readme-tracks.jpeg?v=20261102a" width="70%" alt="飛行中的十條賽道之中的四條：Neon Downtown、Aurora Pass、Sky Spiral 與 Tokyo Afterdark"></p>

<p align="center"><img src="artifacts/readme-start.zh-TW.jpeg?v=20261102a" width="49%" alt="含遊戲模式、賽道與 Start race 的開始畫面"> <img src="artifacts/race-results.zh-TW.jpeg?v=20261024a" width="49%" alt="創下個人最佳的比賽結果"></p>

### 在手機上遊玩

直向或橫向皆可，搭配觸控操作；AUTO 會持續按住油門。[觀看 MP4](artifacts/mobile-demo.mp4)

<p align="center"><img src="artifacts/mobile-home.jpeg" height="300" alt="含賽道選擇的手機直向開始畫面"> <img src="artifacts/mobile-landscape-flight.jpeg" height="300" alt="按住 FLY 並顯示觸控操作的手機橫向飛行畫面"></p>

截圖取自全新設定檔的 Chrome 行動裝置模擬（390×844 與 844×390）；並非實體手機的效能量測結果。

## 遊戲模式與重玩價值（開發分支）

> **進行中 · 2026 年 10 月 29 日。** 這些模式新增內容合併在 `feature/roadmap-integration` 開發分支上，尚未併入 `main`，也尚未包含在[已部署的 GitHub Pages 版本](https://weskao.github.io/skyline-rush/)中。

選擇一條**你已解鎖的賽道**，在賽道卡片下方選擇 **GAME MODE**，需要時展開規則說明，然後按下 **Start race**（或 Enter）。比賽仍使用相同的 Three.js 道路、飛行、FLY / BOOST / NITRO 與響應式觸控操作。開發分支包含以下模式：

| Mode | What changes | Win condition / progression |
| --- | --- | --- |
| **Classic Race** | 在 10 條賽道之一進行標準的 3 名對手衝刺，含車流、捷徑、光環與 NITRO。 | 登上頒獎台可解鎖下一條賽道；只有 Classic 會授予生涯星數、獎章與官方最佳成績。 |
| **Custom Race** | 選擇 **0–3 名對手**、Easy / Normal / Hard AI、Off / Light / Normal / Heavy 車流、NITRO 道具開／關，以及 Normal / Relaxed 碰撞懲罰。五種預設：Standard、Traffic Rush、No Items、Air Focus 與 Precision。 | 非排名成績有獨立的歷史紀錄。可進行 **1 / 2 / 3 / 5 段衝刺階段**並比較總時間。各階段重播的是點對點路線，**並非環形圈數**。 |
| **Free Drive** | 獨自探索任何已解鎖的賽道，可調整道路車流與道具，沒有名次，也不強制勝利。 | 自由駕駛、飄移與飛行直到道路盡頭；抵達終點即結束本次行駛並顯示結果畫面，不儲存任何紀錄。這**不是**無限世界模式。 |
| **Time Attack** | 單人計時衝刺，附相容的最佳成績 Ghost 與領先／落後分段。可選擇 **Clean Time Trial** 開關。 | 依賽道與規則分別記錄最佳時間；Clean 模式下只要發生任何碰撞，該次成績即失效，且不會取代個人最佳。 |
| **Obstacle Run** | 以種子產生的路邊障礙；**Standard** 或 **Extreme** 密度。部分障礙會橫向擺動；警示 HUD 會預告逼近的危險。 | 閃避危險，以乾淨通過賺取風格分數，並使用一般路線的終點。障礙配置與碰撞共用確定性邏輯；Classic 不受影響。 |
| **Checkpoint Rush** | 穿越發光的 3D 關卡拱門。起始時間 **28 秒**；每通過一道乾淨的關卡可獲得 **+10 秒**（上限 60 秒）與 **250 風格分數**。 | 在時間耗盡前抵達每一道關卡與終點。錯過關卡與超時**不會**儲存有效的最佳成績。HUD 顯示已通過的關卡數、剩餘時間與到下一個目標的距離。 |
| **Championship Cup** | 挑選僅由已解鎖路線組成的 **3 或 5 條賽道** Cup；在每個階段與 NOVA、ORBIT 和 APEX 競速。 | 名次依序給予 **10 / 7 / 5 / 3 分**；以累計積分與總時間決定冠軍，同分時以時間決勝。Cup 成績與生涯解鎖互相獨立。 |
| **Stunt Attack** | 在連續多場 heat 中進行 **120 / 180 / 300 秒**的風格賽程：飄移、空中特技、擦身而過與光環累積連擊分數。 | 由計時器結束賽程，而非終點線；每種時長有本機風格獎章與最佳分數。 |
| **Elimination** | 四人競速的 Last Driver Standing：每十秒淘汰一名最後一名的車手。 | 撐到成為最後存活的車手；提前被淘汰則結束你的比賽且沒有獎勵。 |

### Cup 復原

尚未完成的 Championship Cup 會在主畫面提供 **Resume** 或 **Discard**。Resume 會保留已結算的階段積分，只重新開始未完成的階段；重試只會回溯正在重玩的那個階段。完成或捨棄 Cup 會清除其復原項目。刪除遊戲進度時也會一併移除該檢查點，並保留裝置偏好設定。復原功能使用此瀏覽器的儲存空間，無法還原瀏覽器拒絕儲存的資料。

### 自訂呈現與 Ghost

Custom Race 可為每個衝刺 heat 重播最快的相容 Ghost。Custom 與 Free Drive 提供 Track / Day / Dusk / Night / Rain / Fog 呈現預設以及即時規則摘要。這些外觀選擇不會改變紀錄資格或規則集身分。重試會保留所選外觀；更換賽道或返回 Classic 則會還原該賽道的外觀。Photo Studio 關閉時會還原目前比賽的外觀。

### 可選道具與獎勵關卡

Custom 與 Free Drive 提供 **Off / Classic Mystery Rings / Active Items / All Items**。持有的道具佔用一個欄位：按 **Q** 或點按 **USE** 啟動，然後等待冷卻。NITRO 與 FLY/BOOST 保有各自的操作。All Items 會加入有限度的速度、空中電量與一次碰撞復原關卡；EMP 會短暫減慢附近的對手，在單人遊玩時則轉換為 Magnet。復原會保留正式的碰撞計數。Stunt Attack 與 Checkpoint Rush 可另外選擇啟用暫時、不可疊加的 ×2 分數關卡。Classic 的預設維持不變。

### Event Lab Lite v1

**Event Lab Lite** 可編輯本機的賽道範本，在已解鎖的路線上放置障礙、NITRO 光環與補給。可變更它們的車道與距離、Undo/Redo/Reset 編輯，並以文字匯入或匯出經過驗證的賽道。開始後會將賽道編譯為真正的比賽事件；重試會保留賽道與種子。賽道成績與 Career 及 Custom 紀錄分開。路錐、自製跳台、檢查點編輯與社群分享不在此首個版本範圍內。

### Endless Highway

**Endless Highway** 將 Coast 延伸至原有終點之後，成為以距離為目標的生存活動。車流難度會上升到固定上限；五次碰撞即結束一次完整的嘗試。個人紀錄追蹤最長的絕對距離，與 Career 及 Ghost 分開。暫停與 WebGL 復原都會保留本次行駛。此首個版本僅支援 Coast；其附近的景物與事件使用有限的物件池。

### Circuit Race

**Circuit Race** 新增 Harbor Circuit，這是一條獨立、隨時可進入的 2 公里封閉環道，提供 **1 / 3 / 5 圈**。依序通過每個分段才能算一圈；反向通過、傳送與復原都無法獲得圈數。HUD 與結果畫面會顯示分段時間、上一圈、個人最佳圈速與總時間。圈速最佳紀錄不受滾動式 History 淘汰影響；總時間與 Ghost 則依圈數設定而定。十條原有的點對點賽道保留各自的地理與 Career 進程。

### 賽道主題、障礙與風險路線

- **賽道主題**（在 Custom、Free Drive 與 Obstacle Run 中可選用）為每條路線帶來專屬的危險：Coast 的貨物與陣風、Neon 的道路施工、Canyon 的落石、Aurora 的雪堆、冰面與暴風雪、Sky Spiral 的能量關卡、Taipei 的慶典路障、Tokyo 的號誌關卡、Alpine 的雪崩、Coastal 的浪花與 Cosmic 的能量牆。危險會事先警示，永遠保留兩條車道暢通，且絕不會改動 Classic。
- **Obstacle Run** 提供 **Mixed obstacles** 賽道：擺動的關卡、墜落的碎片，以及架在路障上方的圈環，獎勵飛越或繞行的玩家。
- **風險路線**：高風險光環與近距離超車在 Custom Hard 中給予更多獎勵，也可關閉以進行輕鬆練習。
- 道路新增了非實體的路邊生活景象：觀眾、廣告看板、維修車、鐵路月台、行駛中的列車、船隻與無人機。較低的畫面設定會繪製較少的內容。

### 比賽設定、結果與無障礙

- 模式與賽道選擇仍可透過鍵盤與觸控操作；情境面板只顯示與所選模式相關的選項。無法使用的 Cup 會說明還需要多少條賽道。
- HUD 會依模式調整：單人活動會隱藏容易造成誤解的對手排名；多階段與 Cup 賽程顯示階段進度；Checkpoint Rush 顯示即時的關卡倒數；Obstacle Run 警示逼近的障礙；Clean Time Trial 會明顯標示成績已失效。
- Practice、Custom、Time Attack、Obstacle、Checkpoint 與 Cup 的結果使用獨立的 `skyline-rush-mode-history-v1` 紀錄鍵。符合資格的練習 Ghost 有各自儲存的規則集；Classic 的解鎖、星數、獎章、Daily 紀錄與官方時間不受練習成績影響。
- 在 **History → Challenge records** 中，可依模式篩選，查看每個確切賽道／規則集的個人最佳，以及符合資格的 Time Attack Ghost。即使最近 50 筆成績輪替掉，終身最佳仍會保存在 `skyline-rush-mode-bests-v1` 之下。Challenge 紀錄明確不等同於 Career 獎章或星數。
- 模式標籤、結果說明、設定選項與危險警示皆支援英文與繁體中文。低畫質圖形、觸控操作與減少動態效果仍是驗證計畫的一部分。

### 真實遊戲截圖與驗證

用來檢視這些模式的截圖是**從執行中的瀏覽器遊戲**擷取的，而非概念圖。[下載實際的 Playwright 擷圖集](https://github.com/weskao/skyline-rush/actions/runs/39742666980/artifacts/12410172411)（Custom solo、Free Drive、Time Attack、Obstacle Run、Extreme obstacles、Checkpoint Rush 與手機模式選單）。GitHub Actions 的產出檔案可能需要登入且會過期；若要在本機重新產生，請執行 `npx playwright test tests/race-modes-browser.spec.js` 並開啟 `test-results/race-mode-*.png`。CI 截圖採用軟體算繪且解析度較低，不代表最終裝置上的畫質。

**驗證：** 每項功能的測試與完整關卡驗證紀錄皆列於 `TODO.md`。實體 iPhone 與 Android 的檢查仍待完成。

## 在本機執行

需要 Node.js 22.12 或更新版本，以及支援 WebGL 2 並啟用硬體加速的瀏覽器。

```sh
cd "$HOME/Documents/Workspace/skyline-rush"
make         # Installs dependencies on first run, then starts the Vite + Vue dev server
```

開啟 Vite 印出的本機網址（通常是 http://127.0.0.1:5173）。資源與字型皆已內建於本機；遊戲過程不會發出任何外部請求。不需要後端或帳號。

`make` 與 `make dev-unlocked` 也會啟動本機 Firebase Auth/Firestore 模擬器（需要 Java 21+），因此雲端存檔的 Google 登入可搭配假的測試帳號運作，絕不會碰到真實存檔。雲端存檔的操作與專案擁有者的 Spark 配額檢查請見 `docs/cloud-save.md`。

`make dev-diag` 與 `make phone-diag` 提供相同的建置，並編入螢幕上的診斷橫幅（影格計數、頁面生命週期，以及觸控事件與其點擊目標，外加跨重新載入保留的最後幾個未捕捉錯誤），用來在實體手機上追查畫面凍結或按鈕失靈的問題。正式版建置絕不包含它：`npm run build` 會拒絕含有診斷模組的 bundle。

`make phone` 會開啟終端機選單，用來啟動、檢查或停止可供手機開啟的開發伺服器（透過 Tailscale 或同一個 Wi-Fi），並在伺服器回應後印出手機網址。選單會列出此 checkout、其他 worktree 與最近的分支，也可輸入分支名稱；`make phone <name>` 會直接前往該分支（或 `feature/<name>`），必要時在 `.claude/worktrees/` 底下建立其 worktree；`make phone off` 會停止它啟動的所有伺服器（等同 `/phone-dev off`）；而 `y=1`（例如 `make phone y=1 <name>`）會略過選單：每個問題都採用其 Recommended 選項，並印出每個選擇。當某個連接埠已被本專案先前啟動的伺服器佔用（任何 worktree 皆然）時，重用該連接埠是 Recommended 的答案：舊伺服器會被停止，網址維持不變；`make dev`、`make dev-diag`、`make dev-unlocked`（5173）與 `make dev-feature`（5443）會不經詢問直接這樣處理，並且不會動到其他專案的伺服器。它提供一般上鎖的建置；`make phone-unlocked [name]` 是相同的選單，但所有賽道與塗裝皆已解鎖，是手機唯一能連上的全解鎖伺服器（`make dev-unlocked` 與 `make dev-feature` 仍僅限桌機）。除了已加入 `src/upcoming-tracks.ts` 中 `PLAYABLE_PREVIEW_IDS` 的 id 之外（且只有在其真正的比賽執行階段已進入 `RACE_TRACKS` 後），Coming Soon 卡片在所有建置中都只能預覽；`make dev-unlocked` 與 `make phone-unlocked` 屆時會讓該卡片可以開始，正式版則永遠不會。它需要個人的 `phone-dev` Claude Code skill（`/phone-dev` 會詢問相同的選單），且不啟動模擬器，因此手機上的雲端存檔登入使用的是真實專案。

## 操作方式

| Action | Keyboard |
| --- | --- |
| 加速 | W / ↑ |
| 煞車 | S / ↓ |
| 轉向 | A / D 或 ← / → |
| 飛行 | 時速超過 65 km/h 後按住 Space |
| 降落 | 放開 Space |
| 加速推進 | 按住 Shift；消耗推進器電量 |
| NITRO | E / X（一格滿電；NITRO 期間再按一次可延長）。使用 WASD 的玩家用 E；使用方向鍵的玩家左手維持在 Shift / X / Space |
| 飄移 | 在時速超過 162 km/h 時按住 S + A / D（僅限地面） |
| 開始 | Enter |
| 暫停／繼續 | Esc / P |
| 重新開始 | Backspace |
| 切換鏡頭 | C |
| 全部音訊靜音／取消靜音 | M |
| 自動油門開／關 | F2 / AUTO 按鈕 |
| AIRFLOW 展示開／關 | V / AIRFLOW 按鈕 |
| 在主畫面切換賽道 | 向左／右滑動或拖曳 3D 預覽，或在觸控板上用雙指滑動 |

行動裝置版面提供轉向、油門、煞車、加速推進、飛行與 NITRO 按鈕。觸控操作支援同時按住多個按鈕。AUTO 會持續按住油門，讓你專心轉向與飛行；煞車永遠優先於它。每個裝置預設為開啟；一旦你切換過，你的選擇就會記住在此瀏覽器中（`skyline-rush-auto`）。離開分頁會暫停比賽並清除按住的輸入。在比賽中點擊 SKYLINE RUSH 標誌會先暫停並詢問：**Keep racing**、**End race**（返回賽道選擇，本次成績不儲存）或 **Back to home**（重新載入）；無論選哪一個，開始畫面都會重新開啟在剛跑過的賽道上，並捲動到賽道列的中央（第一條與最後一條賽道位於其兩端）。Esc 會讓比賽維持暫停。鏡頭與音效快捷鍵會保留按住的駕駛操作。在觸控裝置上，將拇指在轉向板上向下滑動會煞車，向下並向側邊滑動則會飄移；在 Buttons 模式中，一個較窄的煞車按鈕位於轉向按鈕上方，避開拇指休息的那一列，因此只有刻意才會按到；將拇指從 ← 或 → 向上滑入煞車會保持轉向並同時煞車，因此一根拇指就能飄移，往下滑回則會放開煞車。觸控按鈕與螢幕角落保持距離，讓拇指更容易觸及，平板則會將它們上移並放大。

比賽前或暫停時開啟 **Controls**，可調整鍵盤轉向靈敏度或重新對應駕駛操作。選擇一個操作，然後按下按鍵；衝突的按鍵設定會互換，固定的快捷鍵保留不可更改，按 Escape 可取消擷取。Reset keyboard 會還原預設值。按鍵設定立即生效，並儲存在 `localStorage['skyline-rush-keymap']` 之下。手機與平板在按下實體（例如藍牙）按鍵之前會隱藏鍵盤區段；該鍵盤之後會被記住在 `localStorage['skyline-rush-keyboard-seen']` 之下。

同一個面板也控制觸控轉向模式、慣用手、滑動靈敏度、大小、不透明度與按住／切換式 FLY。**Edit touch layout** 讓你在比賽預覽上拖曳動作按鈕與經典轉向按鈕；**Done editing** 會保留配置，**Reset touch layout** 則會還原。位置在重新載入後仍會保留，隨慣用手鏡像，並在旋轉後維持在可視範圍內。在較矮的橫向螢幕上（高度低於 380 px，例如工具列顯示中的 iPhone Safari），開始畫面會省略其標語，讓 START RACE 不需捲動，比賽 HUD 也會隱藏速度表與次要電量行，避免面板互相重疊。

所有音訊皆以 Web Audio 合成；不需要下載任何音訊。背景音樂有兩首循環播放的合成器浪潮曲目：開始與結果畫面使用的序曲主題（約 64 秒），以及從倒數開始播放、節奏較快的比賽主題（約 55 秒）。每一首在循環中逐步堆疊，並於暫停時降低音量。音效涵蓋選單確認、三聲倒數滴答與 GO、馬達／風聲、升空與加速、煞車、車輛／護欄碰撞、著陸、低電量警告、近距離超車獎勵與完賽旋律。將音效靜音會停止待播的提示音，暫停則會淡出駕駛聲音。低電量警告只有在電量回升到 30% 以上後才會重新待命。

喇叭圖示會開啟音訊設定，包含 Music 列與 Sound effects 列，各有一個靜音開關加一個音量滑桿（見上方開始畫面截圖中展開的樣子）。**Mute all**（或 M）會同時讓兩者靜音。靜音會保留各聲道的音量，因此取消靜音會回到原來的音量；將滑桿拖到零也會以同樣方式讓該聲道靜音。兩者預設皆為開啟、音量 100%，每個開／關選擇與音量都會記住在 `localStorage` 中（`skyline-rush-music`、`skyline-rush-sound` 儲存 `on`/`off`，另有 `-volume` 變體儲存百分比）；若未儲存任何值，兩個聲道皆為開啟，並會被儲存為 `on`。在較矮的螢幕上，面板可捲動。在瀏覽器允許自動播放的情況下，序曲音樂會在頁面載入後立即開始。若不允許（Chrome 與大多數其他瀏覽器的首次造訪），則由第一次點擊、按下或按鍵來啟動。在 iPhone 與 iPad 上，遊戲會要求媒體播放，因此靜音開關不會讓它靜音；這也會在遊戲播放時暫停其他 App 的音訊。

飛行面板顯示爬升、巡航、下降與著陸、剩餘推進秒數，以及下一個該使用的操作。青色光環標示空中走廊，且屬於遊戲玩法：請見下方的 Rings。行動版也有按住加速推進的按鈕。橘色碰撞回報會顯示撞擊類型與損失的速度；護欄現在會讓地面上的車輛反彈並減速。飛得夠高就能越過護欄。

場景包含泛光燈效、夕陽水面、懸索橋、推進器蒸氣、碰撞火花與著陸漣漪。鏡頭運動與非必要的速度線會遵循你系統的減少動態效果偏好。音效為推進、碰撞與著陸提供各自獨立的回饋。

**VFX**（右上角）可選擇 Realistic、Cinematic 或 Extreme 外觀、Low / Medium / High 畫質（Low 會關閉泛光並繪製較少景物）、Comfort mode（無閃光、震動、殘影或模糊）以及可選的觸覺回饋。其 **Race HUD** 區段可選擇 Immersive 或 Competitive（含排行榜、小地圖與次要數據的開關），開啟或關閉 NITRO READY 音效與動畫，**Reset HUD to default** 則會還原它們。**Fine tuning** 將每個效果以滑桿呈現，**Reset visual settings** 則還原預設值。**AIRFLOW**（或 V）會將場景切換為空氣動力學展示：車身上的流線、遙測面板、Low drag 或 High downforce，以及駕駛、前方、後方、側面或環繞鏡頭。開始面板會讓位給展示，只留下橘色的 **START RACE** 按鈕，停靠在車輛下方的底部中央；向左或向右滑動場景可更換賽道。第一次開啟 AIRFLOW 時，會有一個動畫指尖示範該手勢。流線只在 AIRFLOW 開啟時出現：關閉時，BOOST 與 NITRO 會顯示推進器噴流、尾跡與速度線，但沒有流線。

三盞琥珀色起跑燈會在 GO 時轉為青色。玩家的車是一輛低矮楔形跑車，配有煙燻快背式座艙、全寬紅色尾燈條、四個後推進器噴口、在加速推進、煞車與飛行時升起的青銅色彈出式尾翼、旋轉的五輻輪圈，以及可轉向的前輪。每名對手都有自己的輪廓與燈光特徵：NOVA 是長尾車型，配雙垂直尾翼與分離式洋紅色車燈；ORBIT 是圓潤的 GT，配氣泡座艙與圓形青色車燈；APEX 是賽道車，配前分流器、車頂進氣口、高聳的端板尾翼與琥珀色 C 形車燈。車流使用直立的通勤車造型。轉向會快速緩入，放開加速推進會讓車速逐漸下降，而不是瞬間切斷速度。所有駕駛與工具列按鈕的觸控目標至少為 44px，包含 320px 寬度時。

想要額外的電量獎勵，可在地面上以超過 126 km/h 的速度近距離超越車流。五秒內的乾淨超車可連鎖至 ×5，並回充 8–16% 的電量（上限 100%）。碰撞會中斷連鎖；在空中、距離遠以及復原中的超車不會獲得獎勵。HUD 會播報每次超車與最後 500 公尺；結果畫面顯示近距離超車與碰撞的總數。

飛行電量在全推力下約可持續五秒。電量歸零時車輛會自動下降；放開飛行操作並在地面上行駛即可回充。同一份電量也供加速推進使用。碰撞會讓車輛減速；飛得夠高可避開車流。對手與車流遵守相同的碰撞規則：它們會繞過較慢的車輛與玩家，像你一樣撞上道具、障礙與危險物，而撞擊會讓兩輛車減速並互相推擠（車流隨後會加速回到巡航速度）。在 NOVA、ORBIT 與 APEX 之前完成衝刺（4–8 公里，視賽道而定）。個人最佳時間會在儲存空間可用時儲存在此瀏覽器中。

### 操控

轉向會在 0.15 秒內升到最大，且高速時橫向速度上限為 9 m/s。在低於 65 km/h 時按住 Fly 會被記住 1.5 秒，並在速度夠快時自動升空。在空中放開 Fly 會降低下墜加速度（11 → 7 m/s²）以便更柔和地著陸，並緩慢回充飛行電量（每秒 4，為地面速率的三分之一；電量說明文字顯示 GLIDE RECHARGE ACTIVE）。已耗盡的推進器在放開 Fly 且電量回到 15 之後會再次解鎖，即使在空中也是如此。在斷橋 300 公尺內（Sky Spiral 除外，其跳台會把車拋過去），HUD 中央會警示 GAP AHEAD · NEED n% CHARGE，表示剩餘電量無法以目前速度推進越過。車輛碰撞寬度為 1.7 公尺，因此更多超車會被算作擦身而過。輕微碰到護欄屬於刮擦（保留 0.92 的速度、被推回道路上、不算碰撞、連擊保留）；正面撞擊仍算碰撞。開啟 AUTO 時，放開轉向也會讓車輛緩緩回到最近的車道中央（車道輔助）。同時按住 Fly + Boost 每秒消耗 22 電量而非 29，保持加速推進的速度上限，並顯示 AIR DASH。

### NITRO 與飄移

NITRO 有自己的儲備（`player.nitro`，最多 3 格，每格以浮點數填充）。三段式 HUD 顯示部分電量，滿格的區段會發光，而 NITRO MAX 在滿格時會脈動（在舒適／減少動態效果模式下會抑制動態）。賽道上的道具（藍色電池 +0.25、橘色罐 +0.5、空中金色油箱 +1、一個填滿到上限的彩虹過充）遵循與光環相同的規則：格線上每輛車 5 個欄位，每個欄位為 1 到 4 個一組（該欄位的道具，接著是沿其路線每隔 8 公尺的電池），外加過充與每條捷徑的獎勵路線，每場比賽都會重新抽選；每一項 NITRO 獎勵（道具、飄移、桶滾、光環、尾流）同時也會回充飛行電量（每儲存 0.25 = +5；過充則不給），超出上限的部分會轉為電量（每 0.25 = +8）。一格可提供 2.5 秒，速度上限提高 30 m/s、加速更強，並有排氣與鏡頭回饋；再按一次可延長 2 秒且不疊加速度，因此連按三次會串成 6.5 秒的爆發。NITRO 期間碰到車流會保留 70% 速度，而非 45%。

在地面上超過 162 km/h 時，煞車 + 轉向會飄移而不是緊急煞車：僅損失 3 m/s²，擦身而過的連擊分數加倍，放開時依飄移時間給予 NITRO 與迷你加速（1 秒：+0.15 與 0.5 秒，2 秒：+0.3 與 0.8 秒，3 秒：+0.5 與 1.2 秒）。車身偏擺 25°，煙霧與藍／橘／紫色火花顯示等級，輪胎尖嘯聲逐漸增強，HUD 會標示飄移／迷你加速狀態。起飛、掉進缺口，或撞上車輛或障礙都會失去累積。

NITRO 不消耗電量，因此 Fly + NITRO 永遠可以同時使用（Fly + Boost + NITRO 維持 22/s 的 AIR DASH 消耗）。

**空中特技**：飛行時，快速撥動轉向（0.3 秒內兩次相反方向的按壓）會開始 0.7 秒的桶滾。以低於 11 m/s 的速度完成桶滾著陸可獲得 +0.25 NITRO；較猛的著陸（無動力下墜約 9 公尺或更高）則失去獎勵。提早著陸、撞到任何東西、隧道頂或缺口都會取消桶滾。車輛會旋轉（減少動態效果與 Comfortable VFX 會保留文字但取消旋轉），HUD 顯示 TRICK，而 BARREL ROLL / TRICK +0.25 / HARD LANDING 的提示、一聲呼嘯，以及觸控裝置上一次短促的觸覺震動，標示桶滾與其獎勵。

**捷徑**：每條賽道都有一條位於邊線車道上方 6 公尺的空中走廊，標示為 SHORTCUT / FLY HIGH。在其中飛行不消耗電量，速度上限提高 12 m/s；走廊沿線有 NITRO 電池，中途有一個油箱，但交錯的塔柱會算作撞擊障礙。半透明的賽道代表色平台標示走廊的地板；在裡面，HUD 顯示 SHORTCUT，飛行預算顯示 ∞（BOOST 仍會消耗電量）。

### Rings

每場比賽每輛車在格線上有 5 個光環欄位（單人 5 個，完整八車格線 40 個；Circuit 中為每圈），從起點到終點分佈，每一等分路段一個，以 3 到 5 個為一組。在平坦道路上（遠離隧道、缺口、捷徑與其他區段），大約每五個欄位中有一個會變成沿中間車道（車道 2 或 3，因此直線行駛即可串起每個光環）、間隔 25 公尺的 6 個光環一列，大多在路面上，五分之一在空中，後者本身就是一個 PERFECT LINE；大約每十二個中有一個會變成全寬的一排，任何在路上的車都能通過，每輛車價值一個光環。風險光環與前兩個欄位維持單一個。Endless 每 500 公尺區塊有三個單一光環、一列中間車道光環、每三個區塊一個全寬排，以及五段道具。它們的位置每場比賽都會重新抽選。Coast 保持其關卡線在 x 2.5。光環只有在車輛穿過其可見半徑時才算；擦到邊緣不算。種類：青色電量（+20 電量）、金色 nitro（+0.5）、紫色尾流（3 秒迷你加速）、紅色風險（小光環，+1 NITRO 與 500 分）與彩虹神祕（依種子隨機的一種效果：護盾 10 秒或直到第一次被撞、磁鐵 5 秒、穿透車流的幽靈 3 秒，或讓對手以一半速度凍結 2 秒）。被收集的光環會爆開一次然後消失。清除整組會播報 PERFECT LINE 並給予 +1 NITRO；錯過一個光環會中斷它，但保留已獲得的獎勵。

### 對手、尾流與最後衝刺

緊跟在對手或車流車輛正後方 1.5 秒，可獲得 +6 m/s 的速度上限與 +0.25 NITRO（離開尾流後才會重新待命）。對手也會使用 NITRO，每人兩格，依個性而異：NOVA 從 8 秒起穩定施放，之後每 18 秒一次；ORBIT 在飛行時施放；APEX 從比賽進行到 75% 時爆發。輕度的橡皮筋機制（超過 50 公尺後速度最多 ±4%）讓比賽保持緊張。最後 500 公尺時，比賽音樂加速到 115%，狀態列顯示與前後最近對手的差距（`FINAL 500 M · +N m · −N m`）。

### 儲存的資料

所有存檔都使用 try/catch，因此即使儲存空間被封鎖，遊戲仍可運作。`skyline-rush-history`：每場完賽一筆紀錄，最近 50 筆，包含 `fuelOuts`（飛行電量耗盡的次數）與 `gapFalls`，用於調整飛行平衡。從開始或結果畫面開啟 **History**，可依賽道篩選、查看最佳成績與最近十次時間的圖表，並點按一次成績查看詳細資料。`skyline-rush-best-tracks`：每條賽道的最佳時間；舊的單一 `skyline-rush-best` 會一次性遷移到 `coast`，且仍會為 coast 寫入。`skyline-rush-unlocked`：賽道解鎖，即使較舊的成績已離開 History 仍會保留。`skyline-rush-keymap`：按鍵設定。`skyline-rush-controls` 與 `skyline-rush-vfx`：駕駛與視覺設定（ghost 開關位於 controls）。`skyline-rush-ghosts`：每條賽道一個最佳成績 ghost。`skyline-rush-medals`、`skyline-rush-stars`、`skyline-rush-paint`：附授予日期的獎章、每條賽道的最佳星數、已裝備的塗裝。`skyline-rush-daily`：每日挑戰成績，最近 50 筆。每個儲存的值在載入時都會驗證；任何格式錯誤的內容都會被忽略。

### Ghost、每日挑戰、獎章與 Garage

- **Ghost**：每次行駛每秒取樣 10 次車輛的距離、車道位置與高度。在某條賽道上創下新的個人最佳會儲存該次成績，之後在該賽道上的比賽會將它顯示為半透明的藍色車輛。預設為關閉；在 Controls 中開啟 **Show best-run ghost** 即可。
- **每日挑戰**：History 顯示今天的賽道與修飾條件，依本機日期選出：禁止飛行、雙倍車流，或只有金色光環。Canyon 永遠不會出現禁止飛行，因為它的斷橋需要飛行。每日成績只進入自己的排行榜（今日最快的五名）；絕不會影響歷史、最佳時間、解鎖、星數或 ghost。Restart 會保留挑戰，而 **Choose track** 則會離開它。
- **獎章**：First victory（獲勝）、Clean run（無碰撞）、Perfect flight（單場比賽 5 次 PERFECT LINE）與 Triple burst（一次爆發中使用 3 格 NITRO：一次按壓加兩次延長）。只有符合資格的 Classic Race 完賽才能授予；每一枚都會保留首次獲得的日期。
- **Garage**：你在每條賽道上的最佳風格星數會加總並解鎖塗裝：Aurora 需 3、Glacier 需 6、Coral 需 10、Cobalt 需 16、Obsidian 需 24（最高為 30）。現實世界中最受歡迎的車色，藍色與黑色，是長期目標。尚未解鎖的塗裝仍可預覽。塗裝只改變外觀，絕不影響車輛數值。

### Sky Spiral（實驗性的第五條賽道）

Sky Spiral 在賽博龐克天際線上方加入一條真正的 3D 上升螺旋道路。繞著發光的中央塔樓完整行駛一圈水平迴轉，然後從三座專用跳台飛越高架缺口。現有的 FLY、BOOST 與 NITRO 在新賽道上皆可使用，並提供可選的飛行修正。此賽道使用獨立的彎曲道路渲染器與自己的 3D 路徑對映器；仍在實體行動硬體上驗證中。

### 賽道與風格

從 Coast 開始。進入前三名即可解鎖 Neon Downtown，接著是 Canyon Skyway、Aurora Pass、Sky Spiral、Taipei Heritage、Tokyo Afterdark、Alpine Rail Pass、Coastal Horizon 與 Cosmic Orbit。開始前先選擇賽道，或向左或向右滑動 3D 預覽（用滑鼠拖曳，或在觸控板上用兩指橫向滑動），像輪播一樣翻到相鄰的賽道：它會跟著手指移動，輕輕一撥即可，第一條與最後一條賽道會有橡皮筋回彈效果，並有一個標籤標示賽道名稱與分頁圓點；鍵盤使用者可用 Left/Right 在賽道按鈕之間移動，並以 Enter 選擇。Restart 會保留所選賽道；結果畫面上的 **Choose track** 會返回選單。當仍有賽道處於鎖定狀態時，登上頒獎台後結果畫面會顯示一個脈動的 **Next** 按鈕，立即開始剛解鎖的賽道；當所有賽道原本就已開放，以及在每日挑戰中，它都不會出現。如果瀏覽器中斷 WebGL 連線（在 iPhone 上鎖定或切換 App 後很常見），圖形恢復時遊戲會清除警告；否則 **Start** 或 **Race again** 會重新載入頁面。每條賽道都有自己的天空、色調與程序生成的景物：下雨的霓虹街道與低矮隧道、紅色沙漠峭壁與斷橋缺口／側風，或有極光與冰面的雪山。警告標誌標示特殊路段。Aurora 的上坡路段以一半的正常速率回充地面燃料。

### World Tour 賽道、路線地圖與賽道名稱

五條 World Tour 賽道共用同一個彎曲道路渲染器（`src/world-tour-scene.js`），各有專屬的色調、建築與地標（總統府與北門的剪影、霓虹路口與一座塔、鐵路高架橋與山峰、一座燈塔與跨海大橋、帶環行星）。在主畫面選擇一條 World Tour 賽道，會在盤旋的車輛後方框出其標誌性地標：總統府、東京鐵塔、一座阿爾卑斯山峰、一座燈塔或宇宙之門。朝它競速時，路邊會讓該地標保持在清晰的視野中。每張賽道卡都顯示完整的主要路線，比賽中則有即時地圖在其上標出 YOU、NOVA、ORBIT 與 APEX；空中捷徑絕不會繪製。在高度低於 500px 的螢幕以及高度低於 700px 的窄手機上，即時地圖會讓位，排行榜仍會對賽車手排名。賽道名稱會依用 **EN / 繁體中文** 切換選擇的語言而定（見下方的 Language）。

風格分數獎勵近距離超車（100 × 連擊，飄移的連擊加倍）、光環（150，風險光環另加 500）、PERFECT LINE（500）、移動中的滯空（每秒 10）以及每 500 公尺的乾淨行駛（100）。碰撞與掉入缺口會重設乾淨距離的進度。結果畫面獎勵完賽一顆星，每公里 250 分兩顆星，每公里 500 分三顆星，與完賽名次無關。

燃料與 nitro 條會緩緩趨近新的數值，在容量低於 20% 時發出警告，補充時閃爍微光，並在一格 nitro 完成時脈動。Comfort mode 與系統減少動態效果會停用這些動畫。滑動板在按住時顯示浮動的圓環／旋鈕，並在比賽開始時顯示簡短提示；放開會讓轉向回到中立。

HUD 使用共用的動態時間（120 / 240 / 480 ms）。速度表指針會隨速度緩動；名次改變時，名次數字會翻轉並帶有綠色向上或紅色向下的箭頭，排行榜列則會滑入新的位置。精簡的半透明事件提示位於視野中央上方，避開 HUD 面板，並將擦身而過、PERFECT LINE、NITRO 爆發、電量增加與飄移火花等級排入佇列而不重疊；同時回充飛行電量的 NITRO 獎勵會標示出來（NITRO · +20% CHARGE）。暫停、完賽與重新開始會清空佇列。按鈕在按下時會變暗而不改變大小，因此一路按到邊框都會被接受；按住的觸控按鈕保持發亮。VFX 設定中的選用 **Haptic feedback** 會在支援的觸控裝置上，對碰撞、NITRO 與飄移獎勵發出訊號。Comfort mode 與系統減少動態效果會保留文字與按下狀態的顏色，同時移除新的動態與震動。

### Language

整個介面提供英文與繁體中文（繁體中文）版本：開始畫面、Garage、History、HUD、比賽提示、結果、路線地圖、設定，以及 3D 路標。開始畫面賽道卡片下方的一個 **EN / 繁體中文** 切換鈕會一次更改所有內容，無需重新載入。語言依以下順序選擇：

1. 你點按切換鈕所儲存的選擇（`skyline-rush-locale`；只有在點按時才會寫入，絕不會來自自動偵測）；
2. 你的系統語言順序（`navigator.languages`）：第一個 `en*` 或 `zh*` 項目決定結果，其他語言會被略過（`['ja-JP', 'zh-TW']` 選擇繁體中文），任何 `zh*` 標籤（zh-TW、zh-HK、zh-Hant、zh-CN、zh-Hans、單純的 zh）皆選擇繁體中文，空的或缺少的清單則退回使用 `navigator.language`；
3. 否則使用英文。

品牌與遊戲術語在兩種語言中皆維持英文：Skyline Rush、NITRO、FLY、BOOST 以及對手 NOVA、ORBIT 與 APEX。字串位於 `src/locales/`；`src/i18n.js` 負責偵測、`t()` 與目前語言。

在地化圖片：`node scripts/capture-og-images.mjs` 會在 Chrome 中驅動真實的應用程式，並儲存 `public/og-image.en.jpeg` 與 `public/og-image.zh-TW.jpeg`（1440×900 開始畫面），以及供繁體中文 README 使用的 `artifacts/{readme-start,readme-hero,mobile-flight,race-results}.zh-TW.jpeg`（`node scripts/capture-og-images.mjs og` 或 `readme` 只執行其中一半）。英文的 `artifacts/` 截圖絕不會被它更動。`public/manifest.webmanifest` 與應用程式圖示維持原樣：圖示不含文字，而 web app manifest 只有單一名稱與描述，沒有各語言的變體，因此第二份 manifest 會破壞可安裝性。

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

瀏覽器測試使用已安裝的 Google Chrome，並允許 SwiftShader 進行無頭算繪。僅有 CPU 的 CI 使用 0.25 的裝置像素比，以保持 3D 場景的回應速度，同時維持相同的 CSS 視窗尺寸與遊戲斷言；本機測試則以完整解析度算繪。一般遊玩使用瀏覽器可用的 GPU。英文 README 截圖只有在檔案缺失或執行 `UPDATE_ARTIFACTS=1 npm run test:browser` 時才會以 JPEG（品質 70）寫入 `artifacts/`，因為即時 3D 場景每次執行都不同；測試追蹤／結果會被忽略。完整衝刺測試在快速的機器上大約需要一分鐘，軟體算繪拖慢模擬時則更久。

```sh
npm run preview         # Serve the production build after npm run build
```

要在手機上檢查，請在你的網路上提供建置（`npx vite preview --host 0.0.0.0`），並以 `?perf` 開啟（例如 `http://<computer-ip>:4173/?perf`）。頂部會出現一條帶，顯示過去 20 秒賽車的影格時間：中位數（p50）、第 95 百分位數（p95）、平均 fps 與取樣長度。沒有 `?perf` 時，不會量測或顯示任何東西。

```sh
make perf BASE=main         # A/B in Chrome at 412×915, CPU throttled 6× (RATE=20 for a low-end phone), 3 alternating rounds
make perf BASE=main VIEWPORT=desktop  # The same A/B at 1440×900 desktop size
make perf-phone             # Like make phone: asks base version, Tailscale/Wi-Fi and Telegram; logs phone temperatures
```

`make perf` 會建置此 checkout，若有 `BASE=<git ref>` 則連同該 ref 一起建置（位於 `.claude/worktrees/perf-<sha>`，下次重用），每次執行在 Coast 上競速 24 秒，並印出每次執行的帶以及各建置的中位數。`make perf-phone` 對於任何未傳入的項目，會像 `make phone` 一樣詢問（`BASE=`、`VIA=tailscale|wifi|auto`、`TG=0`），為每個建置印出並傳送一個 `?perf` 網址到 Telegram，在任何以 USB 連接的 Android 手機上於 Chrome 開啟第一個網址（`adb reverse`，因此任何網路皆可），在按下 Ctrl+C 時傳送網址已過期的通知，並每 10 秒記錄手機的感測器溫度與降頻等級（`dumpsys thermalservice`），連同 Mac 的熱警告等級，直到按下 Ctrl+C。只在相同的降頻等級下比較執行結果：溫熱的手機會降頻並掉幀，與建置版本無關。iPhone 不會回報溫度。

## 部署

在 [https://weskao.github.io/skyline-rush/](https://weskao.github.io/skyline-rush/) 遊玩。此網站為公開：訪客不需要 GitHub 帳號或 Tailscale，開發者的電腦也可以離線。

```sh
git tag v0.4.0 && git push origin v0.4.0   # Release: deploys once CI confirms the commit already passed on main
make deploy                              # Deploy remote main manually through the same CI flow
# The on-screen version (ready screen, desktop and mobile) is `package.json`'s version; `/release` bumps it
# after scripts/release-gate.sh has seen a green CI run for the commit on main.
```

CI（`.github/workflows/ci.yml`）會在推送到 `main`、`develop`、pull request、版本標籤推送（`v*`）與手動執行時建置並執行單元與 Chrome 瀏覽器測試。瀏覽器測試分成 13 個平行分片執行，World Tour 長跑分成 5 個，依 `tests/ci-durations.json` 中量測的各測試耗時來平衡（`scripts/ci-shards.mjs`），僅在 `main` 與 `develop` 上執行（其他分支只執行單元與雲端存檔檢查，除非提交訊息含有 `[full-regression]` 或手動執行要求），且對同一分支的較新推送會取消它所取代的執行。CI 會重試一次失敗的瀏覽器測試；只有在重試時才通過的測試仍會在該次執行上被標註，並被視為需要修正的 bug（`.claude/rules/browser-test-stability.md`）。在任何分支上，若推送或 pull request 只更動 `src/`、`public/`、`tests/`、`scripts/` 與 `.github/` 之外的 Markdown、文字、圖片、影片或 `Makefile`，且其父提交已在該分支上通過 CI，則會略過所有測試套件（`scripts/ci-changes.mjs`）。手動執行會在所有檢查通過後發布；版本標籤推送會重新執行單元測試，確認（`release-verified`）被標記的程式碼已在 `main` 上通過完整套件，而不是重新執行瀏覽器套件，然後發布並驗證公開網站。在 CI 從未於 `main` 上通過的提交上打標籤，不會被部署。一般的分支推送與 pull request 只會執行檢查。推送到 `main` 時，若其某個合併提交所合併的不是 `develop` 或 `hotfix/*`，`main-merge-source` 工作（`scripts/check-main-merges.sh`）也會失敗，而該紅燈執行會阻擋發布。Pages 建置使用 `--base=/skyline-rush/`，使腳本、樣式與字型從專案網址載入。GitHub Pages 必須使用 **GitHub Actions** 作為其發布來源。手動部署需要已驗證的 GitHub CLI（`gh auth login`）；請先推送你的提交，因為 `make deploy` 使用遠端 `main`。部署不再依賴本機 pre-push hook 或 Netlify 登入。當任何檢查或部署在推送、標籤或手動執行時失敗，`notify-telegram` 工作會將失敗執行的連結傳送到 Telegram；它需要 repo 密鑰 `TELEGRAM_BOT_TOKEN` 與 `TELEGRAM_CHAT_ID`（以 `gh secret set <NAME>` 設定每一個，它會提示輸入值），缺少時會安靜地略過。

連結預覽圖片是 `public/og-image.jpeg`，為 `public/og-image.en.jpeg` 的副本；`node scripts/capture-og-images.mjs og` 會擷取兩種語言的封面並更新該副本。爬蟲無法切換語言，因此 `index.html` 只參照英文封面（含 `og:locale` `en_US` 與 `og:locale:alternate` `zh_TW`），而 `public/og-image.zh-TW.jpeg` 則是供直接連結使用的中文對應版本。更改封面後，請在 `index.html` 中提高 `og:image` 的 `?v=`，讓社群網站抓取新的圖片。

## 專案

- `src/game.js`：確定性的街機模擬、對手、車流與完賽順序。
- `src/input.js`：鍵盤與多指標控制，含取消與失焦清理；讀取已儲存的按鍵對應。
- `src/key-map.js`：純粹的按鍵對應，含 E / X NITRO、衝突互換式重新綁定、驗證與儲存。
- `src/history.js`：已儲存的遊戲資料：比賽歷史（最近 50 筆）、每條賽道的最佳成績與舊版遷移、生涯統計、獎章、星數、已裝備的塗裝、ghost 與每日排行榜。
- `src/ghost.js`：10 Hz 的 ghost 錄製、每條賽道的驗證與內插播放。
- `src/appearance.js`：塗裝目錄與星數解鎖門檻。
- `src/rng.js`：以種子產生的隨機串流；道具與光環來自每場比賽的佈局種子（測試與工具中則為賽道種子）。
- `src/world.js`、`src/geometry.js`：Three.js 渲染器、程序生成的車輛、公路、天際線、飛行特效與鏡頭。
- `src/effects.js`：固定 480 顆粒子的 GPU 池，用於蒸氣、火花與著陸塵土。
- `src/track-paths.js`、`src/world-tour-scene.js`：每條賽道一份距離到道路的對映，以及共用的 World Tour 道路、景物與地標。
- `src/route-map.js`、`src/i18n.js`：SVG 完整路線與即時賽車手地圖；語系偵測、已儲存的選擇、`t()` 與英文／繁體中文的賽道名稱；`src/locales/` 存放目錄檔。
- `scripts/capture-og-images.mjs`：從真實的應用程式擷取英文與 zh-TW 封面圖片以及 zh-TW README 截圖。
- `scripts/pickup-economy.mjs`：一個腳本化的機器人駕駛每條賽道，並印出每分鐘的 NITRO、BOOST 佔比、燃料耗盡與第一次 NITRO 的時間；`tests/pickup-economy.test.js` 鎖定光環／道具的佈局。
- `scripts/rival-balance.mjs`：一個專家機器人（使用 BOOST、為光環而飛行）與一個新手機器人（兩者皆不）在每條賽道與難度上與七名對手競速；印出最快對手的差距與機器人的名次。
- `scripts/ci-shards.mjs`：`plan` 為每個 CI 分片提供其 Playwright `--test-list`，依耗時打包測試，讓每個分片大約同時完成；`refresh <run-id>` 在測試套件大幅變動後，依某次 CI 執行的記錄重寫 `tests/ci-durations.json`。
- `src/App.vue`、`src/icons.js`：Vue 3 UI 外殼（開始畫面、HUD、面板、觸控操作）及其共用的 SVG 圖示；只渲染一次，沒有反應式狀態。
- `src/main.js`、`src/style.css`：掛載 `App.vue`、連接各畫面控制器，並執行比賽生命週期（開始、暫停、重新開始、結果）與影格迴圈。
- `src/*-ui.ts`：每個畫面區域一個 TypeScript 控制器（比賽選擇、雲端存檔、觸控操作、按鍵對應、VFX、音訊、歷史對話框、拍照模式）。
- `src/race-hud.ts`、`src/race-hud-modes.ts`：比賽中的 HUD，於每次 HUD 更新時以命令式寫入。
- `src/race-results.ts`、`src/result-screen.ts`、`src/session-progress.ts`：記錄完賽成績（最佳成績、解鎖、獎章、ghost）並顯示其結果畫面。
- `vite.config.js`：搭配 `@vitejs/plugin-vue` 的 Vite。
- `src/perf.js`：`?perf` 裝置檢查讀數所用的影格時間百分位數。
- `src/audio.js`：合成音效與循環播放的音樂音序器；歌曲位於 `src/music-tracks.ts`，比賽到音效的事件位於 `src/race-audio-events.ts`。
- `src/audio-settings.js`：從 `localStorage` 讀取已儲存的音樂／音效開關與音量，以及滑桿的靜音保留音量規則。
- `tests/`：單元與瀏覽器行為測試。`tests/module-size.test.js` 讓每個原始碼模組維持在 400 行以內（較舊的大型檔案有只會降低的上限）。
- `docs/design.md`、`docs/verification.md`：範圍與驗證證據。
- `README.zh-TW.md`：本檔案的繁體中文翻譯，由 `scripts/readme-zh.mjs` 維持最新（`check`、以 `claude -p` 翻譯的 `sync`，以及手動編輯後的 `stamp`）。`.githooks/pre-commit` hook 會在提交更動 README.md 時重新產生它（以 `SKIP_README_ZH=1` 略過一次），`.githooks/pre-push` 會在推送的提交涉及主畫面時執行 `npm run test:layout`（`index.html`、`src/App.vue`、`src/main.js`、`src/style.css`、`src/locales/`；以 `SKIP_LAYOUT_GATE=1` 略過一次），而 `.githooks/main-merge-guard`（由 `pre-merge-commit` 與 `pre-commit` 執行）會拒絕將 `develop` 或 `hotfix/*` 以外的任何分支合併到 `main`（快轉合併不會執行任何 hook，因此請使用 `--no-ff`；以 `ALLOW_MAIN_MERGE=1` 略過一次）；`make` 會以 `git config core.hooksPath .githooks` 啟用這些 hook。`.claude/settings.json` 中的 Claude Code Stop hook 會在某個回合編輯了 README.md 卻沒有更新它時，讓 Claude 回頭去更新。

所有載具／景物幾何與特效皆由程式碼產生。Barlow Condensed 以其 SIL Open Font License 內建於 `public/fonts/OFL.txt`。Three.js、Vue、Vite 與 Playwright 保留各自的套件授權。

來源：[weskao/skyline-rush](https://github.com/weskao/skyline-rush)。單人遊玩、十條賽道、街機物理。瀏覽器驗證涵蓋桌機 Chrome 與模擬的行動裝置視窗；iOS Safari 已在 iOS 模擬器中檢查過（直向與橫向、Coast 與 Neon），但實體手機上的畫面更新率尚未量測（請使用 `?perf`，見驗證）。
