<!-- source-sha256: bf7c2675a21d36e4f19b36b41f0a66f8b69dc0b6343f22f8c1c7c0161fe8eb5a generated from README.md by scripts/readme-zh.mjs; edit README.md, then run the script -->
# Skyline Rush

[English](README.md) · **繁體中文**

[**遊玩 Skyline Rush →**](https://weskao.github.io/skyline-rush/)

這是一款以瀏覽器執行的 3D 街機賽車遊戲，主角是一輛會飛的電動跑車，造型參考 Tesla Roadster 2 及其火箭推進器概念。你可以在多種賽道上與 AI 對手競速、飛越車流、管理推進器電量，並靠駕駛獎勵保持前進。操控採用虛構的街機物理；這是非官方的粉絲專案，與 Tesla 或 SpaceX 無任何關係。

## 遊戲介紹

在 Classic Race 中，Skyline Rush 是一場可反覆挑戰的街機衝刺：一名玩家與多名 AI 對手及路上車流競速，桌機或手機皆可，無需安裝。其他模式提供單人駕駛、自訂規則、圈速賽與多階段挑戰。

- **先駕駛，再飛行。** 累積速度後按住 FLY，即可飛越車流、穿過光環、跨過斷橋。飛行與 BOOST 共用推進器電量；地面行駛、無動力滑翔與獎勵都能幫助補充電量。
- **好好開車就能賺取 NITRO。** 近距離超車、飄移、光環群組（PERFECT LINE）、尾流、成功落地的桶滾與拾取物，都會填充獨立的 NITRO 儲量；可啟動一次爆發，或連按以延長。
- **探索並解鎖賽道。** 在海岸公路、霓虹街道、峽谷、冰雪山路、高架螺旋與 World Tour 目的地上競速。各賽道有獨特的景觀與障礙，點對點路線還設有空中捷徑。選擇畫面會區分可遊玩的賽道與 Coming Soon 預覽。
- **有目標可追。** 符合資格的 Classic 完賽會獲得風格星數，用來解鎖 Garage 塗裝。最佳成績 Ghost、每日挑戰、獎牌與各模式專屬紀錄，讓你想再賽一場。

賽事長度依賽道與模式而定。音效於瀏覽器中即時合成，進度儲存在本機。可選擇使用 Google 登入啟用雲端存檔同步；遊玩不需要帳號。

https://github.com/user-attachments/assets/e0ddb94c-794e-49ab-9b66-51cb5150f101

<p align="center"><img src="artifacts/readme-tracks.jpeg?v=2" width="70%" alt="飛行中的部分賽道：Neon Downtown、Aurora Pass、Sky Spiral 與 Tokyo Afterdark"></p>

<p align="center"><img src="artifacts/readme-start.zh-TW.jpeg?v=2" width="49%" alt="顯示遊戲模式、賽道與開始比賽按鈕的開始畫面"> <img src="artifacts/race-results.zh-TW.jpeg?v=2" width="49%" alt="創下個人新紀錄的比賽結果畫面"></p>

### 在手機上遊玩

支援直向或橫向的觸控操作；AUTO 會持續按住油門。[觀看 MP4](artifacts/mobile-demo.mp4)

<p align="center"><img src="artifacts/mobile-home.jpeg?v=2" height="300" alt="行動裝置直向開始畫面與賽道選擇"> <img src="artifacts/mobile-landscape-flight.jpeg?v=2" height="300" alt="行動裝置橫向飛行畫面，按住 FLY 並顯示觸控按鈕"></p>

截圖於 Chrome 行動裝置模擬（390×844 與 844×390）下、使用全新設定檔擷取；並非實體手機的效能量測。

## 遊戲模式與重玩價值

> 本 README 描述的是目前的原始碼版本。已部署的 GitHub Pages 版本遵循發佈流程，可能與開發版不同。Coming Soon 預覽並不代表該賽道可以遊玩。

選擇一條**已解鎖的賽道**，在賽道卡片下方選擇 **GAME MODE**，需要時展開其規則，然後按下 **Start race**（或 Enter）。比賽仍使用同樣的 Three.js 道路、飛行、FLY / BOOST / NITRO 與響應式觸控操作。可用的模式包括：

| 模式 | 差異 | 勝利條件／進度 |
| --- | --- | --- |
| **Classic Race** | 與 AI 對手進行點對點競速，含車流、捷徑、光環與 NITRO。 | 登上頒獎台可解鎖下一條 Career 賽道；符合資格的 Classic 完賽可獲得 Career 星數、獎牌與官方最佳成績。 |
| **Custom Race** | 設定對手數量（含單人）、AI 難度、車流、拾取物與碰撞懲罰，或從預設組合開始。 | 非排名的結果有獨立的歷史紀錄。可選的衝刺階段會重跑點對點路線並比較總時間；它們不是環道圈數。 |
| **Free Drive** | 獨自探索任何已解鎖的賽道，可調整路上車流與拾取物，沒有名次也沒有強制勝利。 | 自由駕駛、飄移與飛行，直到道路盡頭；抵達終點即以結果畫面結束本次行程，不儲存任何紀錄。這**不是**無限世界模式。 |
| **Time Attack** | 單人計時衝刺，附相容的最佳成績 Ghost 與領先／落後分段時間。可選擇開啟 **Clean Time Trial**。 | 依賽道與規則分別記錄最佳時間；Clean 模式下發生任何碰撞的成績無效，不會取代個人最佳。 |
| **Obstacle Run** | 以種子產生的路邊障礙；密度分為 **Standard** 或 **Extreme**。部分障礙會橫向掃過；警示 HUD 會預告逼近的危險。 | 閃避危險、乾淨通過可獲得風格分數，並使用一般路線的終點。障礙的配置與碰撞共用確定性邏輯；Classic 不受影響。 |
| **Checkpoint Rush** | 穿越發光的關卡拱門競速，補充倒數時間，乾淨通過可獲得風格分數。 | 在時間用完前通過每個關卡並抵達終點。漏掉關卡或超時不會儲存有效的最佳成績；HUD 會顯示進度、剩餘時間與下一個目標。 |
| **Championship Cup** | 用已解鎖的路線組成多賽道盃賽，並在各階段與 AI 車隊競速。 | 名次累積積分；積分相同時以總時間決勝。盃賽結果與 Career 解鎖分開計算。 |
| **Stunt Attack** | 連續多回合的限時風格賽：飄移、空中特技、險些擦撞與光環累積連擊分數。 | 計時結束即結束本場；本機獎牌與最佳分數依時長分別記錄。 |
| **Elimination** | 每隔固定時間淘汰一名排名最後的在場車手。 | 存活到最後一名車手；提早被淘汰會結束本次行程且沒有獎勵。 |

### 盃賽恢復（Cup recovery）

未完成的 Championship Cup 會在首頁提供 **Resume** 或 **Discard**。Resume 會保留已結算的階段積分，只重新開始未完成的階段；重試只會回滾正在重賽的那一階段。完成或捨棄盃賽即清除其恢復紀錄。刪除遊戲進度時也會一併移除檢查點，同時保留裝置偏好設定。恢復功能使用本瀏覽器的儲存空間，無法還原瀏覽器拒絕儲存的資料。

### 自訂外觀與 Ghost

Custom Race 可為每個衝刺階段重播最快的相容 Ghost。Custom 與 Free Drive 提供 Track / Day / Dusk / Night / Rain / Fog 外觀預設與即時規則摘要。這些外觀選擇不會改變紀錄資格或規則集識別。重試會保留所選外觀；更換賽道或回到 Classic 則會還原賽道原本的外觀。Photo Studio 關閉時會還原目前比賽的外觀。

### 可選道具與獎勵關卡

Custom 與 Free Drive 提供 **Off / Classic Mystery Rings / Active Items / All Items**。持有的道具只佔一個欄位：按 **Q** 或點按 **USE** 啟動，然後等待冷卻。NITRO 與 FLY/BOOST 仍保有各自的操作。All Items 會加入有上限的速度、空中電量與一次性撞擊恢復關卡；EMP 會短暫減慢附近的對手，單人遊玩時則轉為 Magnet。恢復機制會保留官方的碰撞次數。Stunt Attack 與 Checkpoint Rush 可另外選擇開啟暫時性、不疊加的分數倍率關卡。Classic 的預設值維持不變。

### Event Lab Lite v1

**Event Lab Lite** 可在已解鎖的路線上，以障礙物、NITRO 光環與補給編輯本機的賽道範本。你可以調整它們的車道與距離、復原／重做／重設編輯，並以文字匯入或匯出經過驗證的賽道。開始後會把賽道編譯成真正的比賽事件；重試會保留賽道與種子。賽道結果與 Career 及 Custom 紀錄分開。路錐、自製坡道、檢查點編輯與社群分享不在這第一版的範圍內。

### Endless Highway

**Endless Highway** 會把選定的可遊玩賽道，變成超越其原定終點的距離生存賽。車流難度會提升至上限；達到碰撞上限即結束本次挑戰。最長距離紀錄與 Career 及 Ghost 分開。暫停與 WebGL 恢復都會保留本次行程，附近的景物與事件則使用有上限的物件池。

### Circuit Race

**Circuit Race** 使用 Harbor Circuit，這是一條獨立的封閉環道，圈數可選。依序通過每個區段即可算一圈；倒退通過、傳送與恢復都無法獲得圈數。HUD 與結果畫面會顯示分段、上一圈、個人最佳圈速與總時間。圈速最佳紀錄不會因 History 輪替淘汰而消失；總時間與 Ghost 則專屬於該圈數設定。點對點賽道維持其地理設定與 Career 進度。

### 賽道主題、障礙與風險路線

- **賽道主題**（可在 Custom、Free Drive 與 Obstacle Run 中選用）讓每條路線都有專屬危險：Coast 的貨櫃與陣風、Neon 的道路施工、Canyon 的落石、Aurora 的雪堆、冰面與暴風雪、Sky Spiral 的能量關卡、Taipei 的節慶路障、Tokyo 的號誌關卡、Alpine 的雪崩、Coastal 的浪花，以及 Cosmic 的能量牆。危險會事先警示、一定留有可通行的車道，也絕不會改變 Classic。
- **Obstacle Run** 提供 **Mixed obstacles** 賽道：橫掃的關卡、墜落的碎片，以及路障上方的圓環，獎勵你飛越或繞行通過。
- **風險路線**：高風險光環與近距離超車在 Custom Hard 中給予更多獎勵，也可關閉以便輕鬆練習。
- 道路新增了非實體的路邊生活景象：觀眾、廣告看板、服務車、鐵路月台、行駛中的列車、船隻與無人機。較低的畫質設定會減少繪製這些景物。

### 比賽設定、結果與無障礙

- 模式與賽道選擇仍可用鍵盤與觸控操作；情境面板只顯示與所選模式相關的選項。無法使用的 Cup 會說明還需要解鎖的賽道數量。
- HUD 會依模式調整：單人賽事會隱藏容易誤導的對手名次；多階段與 Cup 賽事顯示階段進度；Checkpoint Rush 顯示即時的關卡倒數；Obstacle Run 警示逼近的障礙；Clean Time Trial 會明顯標示成績已失效。
- Practice、Custom、Time Attack、Obstacle、Checkpoint 與 Cup 的結果使用獨立的 `skyline-rush-mode-history-v1` 紀錄鍵。符合資格的練習 Ghost 有各自儲存的規則集；Classic 的解鎖、星數、獎牌、Daily 紀錄與官方時間不會受練習賽影響。
- 在 **History → Challenge records** 中，可依模式篩選，查看每個確切賽道／規則集的個人最佳與符合資格的 Time Attack Ghost。即使較舊的紀錄被輪替淘汰，終身最佳仍會儲存在 `skyline-rush-mode-bests-v1` 之下。挑戰紀錄明確不等同於 Career 獎牌或星數。
- 模式標籤、結果說明、設定選項與危險警示皆支援英文與繁體中文。低畫質圖形、觸控操作與減少動態效果仍是驗證計畫的一部分。

### 真實遊戲截圖與驗證

用來檢視這些模式的截圖是**從執行中的瀏覽器遊戲**擷取，而非概念圖。[下載實際的 Playwright 擷取圖組](https://github.com/weskao/skyline-rush/actions/runs/39742666980/artifacts/12410172411)（Custom 單人、Free Drive、Time Attack、Obstacle Run、Extreme 障礙、Checkpoint Rush 與行動版模式選單）。GitHub Actions 的成品可能需要登入且會過期；若要在本機重新產生，請執行 `pnpm exec playwright test tests/race-modes-browser.spec.js` 並開啟 `test-results/race-mode-*.png`。CI 截圖以軟體渲染並降低解析度，不代表最終裝置上的畫質。

**驗證：** 每項功能的測試與完整閘門紀錄都列在 `TODO.md` 中。實體 iPhone 與 Android 的檢查仍待進行。

## 在本機執行

需要 Node.js 22.12 或更新版本、pnpm 11.28.13，以及支援 WebGL 2 並啟用硬體加速的瀏覽器。先執行 `corepack enable` 以使用專案鎖定的 pnpm 版本（或安裝 `pnpm@11.28.13`），接著執行 `make setup`。

```sh
cd skyline-rush   # From the directory containing your clone
make         # Installs dependencies on first run, then starts the Vite + Vue dev server
```

開啟 Vite 印出的本機網址（通常是 http://127.0.0.1:5173）。資源與字型皆在本機打包。核心遊戲不需要帳號；可選的雲端存檔登入與同步使用 Firebase 服務。

`make` 與 `make dev-unlocked` 也會啟動本機的 Firebase Auth/Firestore 模擬器（需要 Java 21+），因此雲端存檔的 Google 登入可搭配假的測試帳號運作，且絕不會動到真實存檔。雲端存檔操作，以及專案擁有者的 Spark 額度檢查，請見 `docs/cloud-save.md`。

`make dev-diag` 與 `make phone-diag` 會提供相同的建置，並編入畫面上的診斷橫幅（影格計數、頁面生命週期，以及觸控事件與其命中目標，外加跨重新載入保留的最近未捕捉錯誤），用於在真實手機上追查凍結或按鈕失效的問題。正式建置絕不包含它：`pnpm run build` 會拒絕含有診斷模組的打包檔。

`make phone` 會開啟終端機選單，用來啟動、檢查或停止手機可連線的開發伺服器（透過 Tailscale 或同一個 Wi-Fi），並在伺服器回應後印出手機網址。選單會列出此 checkout、其他 worktree 與最近的分支，也可輸入分支名稱；`make phone <name>` 會直接前往該分支（或 `feature/<name>`），必要時在 `.claude/worktrees/` 下建立其 worktree，`make phone off` 會停止它啟動的所有伺服器（就像 `/phone-dev off`），而 `y=1`（例如 `make phone y=1 <name>`）會略過選單：每個問題都採用其 Recommended 選項，並印出每次的選擇。當某個連接埠已被本專案先前啟動的伺服器佔用（任何 worktree 皆然），重用該連接埠是 Recommended 的答案：舊伺服器會被停止，網址維持不變；`make dev`、`make dev-diag`、`make dev-unlocked`（5173）與 `make dev-feature`（5443）會不經詢問直接這麼做，並且不動其他專案的伺服器。它提供一般的鎖定版建置；`make phone-unlocked [name]` 是相同的選單，但所有賽道與塗裝皆已解鎖，是唯一手機可連線的全解鎖伺服器（`make dev-unlocked` 與 `make dev-feature` 仍僅限桌機）。除了已加入 `src/upcoming-tracks.ts` 中 `PLAYABLE_PREVIEW_IDS` 的 id（只有在其真實比賽執行環境已加入 `RACE_TRACKS` 時才可加入）之外，Coming Soon 卡片在每個建置中都維持僅供預覽；`make dev-unlocked` 與 `make phone-unlocked` 此時會讓該卡片可以開始，正式環境則絕不會。它需要個人的 `phone-dev` Claude Code 技能（`/phone-dev` 會詢問相同的選單），且不啟動模擬器，因此手機上的雲端存檔登入使用的是真實專案。

## 操作

| 動作 | 鍵盤 |
| --- | --- |
| 加速 | W / ↑ |
| 煞車 | S / ↓ |
| 轉向 | A / D 或 ← / → |
| 飛行 | 速度足夠後按住 Space |
| 降落 | 放開 Space |
| 加速推進 | 按住 Shift；會消耗推進器電量 |
| NITRO | E / X（一次完整儲量；NITRO 期間再按一次可延長）。使用 WASD 的玩家用 E；使用方向鍵的玩家左手維持在 Shift / X / Space |
| 飄移 | 高速時按住 S + A / D（僅限地面） |
| 開始 | Enter |
| 暫停／繼續 | Esc / P |
| 重新開始 | Backspace |
| 切換鏡頭 | C |
| 全部音訊靜音／取消靜音 | M |
| 自動油門開／關 | F2 / AUTO 按鈕 |
| AIRFLOW 展示開／關 | V / AIRFLOW 按鈕 |
| 在首頁切換賽道 | 向左／右滑動或拖曳 3D 預覽，或在觸控板上用兩指滑動 |

行動版介面提供轉向、油門、煞車、加速、飛行與 NITRO 按鈕。觸控操作支援同時按住多個按鈕。AUTO 會持續按住油門，讓你專心轉向與飛行；煞車一律優先於它。每種裝置預設皆為開啟；一旦你切換過，你的選擇會記在本瀏覽器中（`skyline-rush-auto`）。離開分頁會暫停比賽並清除按住的輸入。比賽中點按 SKYLINE RUSH 標誌會暫停並先詢問：**Keep racing**、**End race**（回到賽道選擇，不儲存本次比賽）或 **Back to home**（重新載入）；無論哪種，開始畫面都會重新開啟在剛跑過的賽道上，並捲動到賽道列的中央（第一條與最後一條賽道位於兩端）。Esc 會讓比賽維持暫停。鏡頭與音效快捷鍵會保留按住中的駕駛操作。在觸控上，在轉向板上向下滑動拇指會煞車，向下並往側邊滑動則會飄移；在 Buttons 模式中，一個較細的煞車按鈕位於轉向按鈕上方，不在拇指停放的那一排，因此只有刻意才會按到；從 ← 或 → 將拇指往上滑入煞車，會同時維持轉向與煞車，所以單一拇指就能飄移，往下滑回則會放開煞車。觸控按鈕與螢幕角落保持距離，讓拇指更容易觸及，平板則會把它們抬高並放大。

比賽前或暫停時開啟 **Controls**，可調整鍵盤轉向靈敏度或重新對應駕駛動作。選擇一個動作後按下按鍵即可；衝突的按鍵會互相交換，固定的快捷鍵保留不可用，按 Escape 可取消擷取。Reset keyboard 會還原預設值。按鍵設定立即生效，並儲存在 `localStorage['skyline-rush-keymap']` 之下。手機與平板在按下實體（例如藍牙）按鍵之前會隱藏鍵盤區段；該鍵盤之後會被記在 `localStorage['skyline-rush-keyboard-seen']` 之下。

同一面板也控制觸控轉向模式、慣用手、滑動靈敏度、大小、不透明度與按住／切換式 FLY。**Edit touch layout** 讓你在比賽預覽上拖曳動作按鈕與傳統轉向按鈕；**Done editing** 會保留配置，**Reset touch layout** 則還原。位置在重新載入後仍會保留、隨慣用手鏡像，且旋轉後仍留在視窗範圍內。在較短的橫向螢幕上（例如工具列顯示中的 iPhone Safari），開始畫面會省略標語，讓 START RACE 不必捲動，比賽 HUD 也會隱藏速度表與次要電量列，避免面板彼此重疊。

所有音訊都以 Web Audio 合成；不需要下載任何音訊檔。音樂會跟隨目前的畫面、賽道與遊戲模式，並為檢查點、危險、特技與最後衝刺等事件加入提示音。音效涵蓋選單、倒數、駕駛、飛行、加速、碰撞、降落與獎勵。暫停時行駛音效會淡出；將音效靜音會停止待播的提示音。

喇叭圖示會開啟音訊設定，內含 Music 列與 Sound effects 列，各有一個靜音開關與音量滑桿（上方開始畫面截圖中顯示為展開狀態）。**Mute all**（或 M）會同時將兩者靜音。靜音會保留各聲道的音量，因此取消靜音會回到原本的音量；將滑桿拖到零，同樣會讓該聲道靜音。兩者預設皆為開啟、音量 100%，每個開／關選擇與音量都會記在 `localStorage` 中（`skyline-rush-music`、`skyline-rush-sound`，值為 `on`/`off`，另有 `-volume` 變體儲存百分比）；沒有儲存任何值時，兩個聲道皆為開啟，並會以 `on` 儲存。在較短的螢幕上，面板可捲動。在瀏覽器允許自動播放的情況下，頁面一載入就會開始播放片頭音樂。若不允許（首次造訪時的 Chrome 與大多數其他瀏覽器），第一次點按、點擊或按鍵就會啟動它。在 iPhone 與 iPad 上，遊戲會要求媒體播放，因此靜音開關不會將它靜音；這也會在遊戲進行時暫停其他 App 的音訊。

飛行面板會顯示爬升、巡航、下降與著陸、剩餘推力秒數，以及下一個該使用的操作。青色光環標示空中通道，且屬於遊戲機制：請見下方的 Rings。行動版另有按住加速的按鈕。橘色的碰撞回報會顯示撞擊類型與損失的速度；護欄現在會讓地面上的車輛反彈並減速。飛在護欄上方則可越過護欄。

場景包含泛光照明、日落水面、懸索橋、推進器蒸氣、碰撞火花與著陸漣漪。鏡頭運動與非必要的速度線會遵循你系統的減少動態效果偏好。音效為推力、碰撞與著陸提供各自獨立的回饋。

**VFX**（右上角）可選擇 Realistic、Cinematic 或 Extreme 風格、Low / Medium / High 畫質（Low 會關閉泛光並減少繪製景物）、Comfort mode（無閃光、震動、殘影或模糊）以及可選的觸覺回饋。其 **Race HUD** 區段可選擇 Immersive 或 Competitive（含排行榜、小地圖與次要統計的開關）、開啟或關閉 NITRO READY 的音效與動畫，**Reset HUD to default** 則會還原這些設定。**Fine tuning** 將每種效果以滑桿呈現，**Reset visual settings** 則還原預設值。**AIRFLOW**（或 V）會把場景切換成空氣動力學展示：車身上的流線、遙測面板、Low drag 或 High downforce，以及行駛、前方、後方、側面或環繞鏡頭。展示期間開始面板會讓開，只留下橘色的 **START RACE** 按鈕，停靠在車輛下方的底部中央；向左或向右滑動場景即可切換賽道。第一次開啟 AIRFLOW 時，會有一個動畫指尖示範該手勢。流線只在 AIRFLOW 開啟時出現：關閉時，BOOST 與 NITRO 會顯示推進器噴流（粗壯的火焰，帶有明亮的焰芯與噴嘴光暈，Medium 與 High 畫質下還有路面光暈）、尾跡與速度線，但不含流線。

起跑燈會標示倒數與 GO。玩家駕駛一輛配有後置推進器、主動式尾翼與動態車輪的跑車。AI 對手有各自獨特的輪廓與燈光特徵，車流則使用通勤車輛。轉向會逐漸加強，放開加速則會讓車速漸漸下降。駕駛與工具列控制項提供適合觸控的大小。

在地面高速近距離超越車流，會累積獎勵連鎖並補充電量。碰撞會中斷連鎖；在空中、距離較遠與恢復期間的超車不會獲得獎勵。HUD 提示會回報超車與最後衝刺，結果畫面則會摘要近距離超車與碰撞次數。

動力飛行會消耗推進器電量；歸零時，車輛會自動下降。放開 FLY 與 BOOST 即可滑翔並恢復電量，或降落以更快充電。BOOST 取用同一份儲量。對手與車流遵守共通的碰撞規則：它們會避開較慢的車輛與固定障礙，撞擊則會讓相關車輛減速並被推開。領先 AI 車隊即可獲勝；在瀏覽器儲存空間可用時，符合資格的個人最佳會被儲存。

### 操控（Handling）

轉向會平順累積，高速時橫向移動受到限制。FLY 會暫時緩衝提早的按下，直到達到起飛速度。放開 FLY 會減緩下降；若同時放開 BOOST，滑翔會恢復電量。耗盡的推進器在放開並充分恢復後會再度可用。缺口警示可協助判斷跨越所需的電量，專用坡道則能將車輛彈射出去。輕微擦撞護欄會保留連擊；較重的撞擊則算作碰撞。放開轉向時，AUTO 也會提供車道置中輔助。同時按住 FLY + BOOST 會啟動 AIR DASH，比各自獨立的推力更有效率地分配電量。

### NITRO 與飄移

NITRO 有獨立的儲量，在 HUD 中以電量區段顯示。拾取物、光環與駕駛獎勵都能補充它；NITRO 獎勵也能恢復推進器電量，溢出的部分會轉為電量。拾取物的配置會隨起跑格數量調整，並在每場比賽重新隨機產生。完整的儲量會啟動限時的速度與加速度提升；再按一次可延長爆發，但不會疊加其速度加成。NITRO 也會減少碰撞車流時的速度損失。

在地面高速時，煞車 + 轉向會開始飄移。持續飄移以累積獎勵階級，再放開以獲得 NITRO 與小幅加速。煙霧、彩色火花、音效與 HUD 回饋會顯示累積進度。起飛、掉進缺口或發生碰撞都會失去已累積的獎勵。

NITRO 不會消耗推進器電量，並可與 FLY 或 BOOST 同時進行；動力飛行與 BOOST 仍會消耗它們共用的儲量。

**空中特技**：飛行時快速往相反方向轉向即可開始桶滾。完成桶滾並平穩落地即可獲得 NITRO；太早落地、撞到障礙或落地過重都會取消獎勵。HUD、音效與可選的觸覺回饋會回報特技。減少動態效果與 Comfortable VFX 會保留回饋但不含旋轉。

**捷徑**：點對點賽道在邊緣車道上方設有標示的空中通道。維持在飛行路線上會獲得更高的速度上限，並在通道內免費飛行，沿途還有拾取物；BOOST 仍會消耗電量。塔柱仍是固體危險物。半透明的平台與 SHORTCUT / FLY HIGH 標誌標示出這條路線，HUD 則會回報進入。

### 光環（Rings）

光環配置會隨起跑格與賽道調整，包含成組光環、直線列、全寬排與風險光環；Endless 則會隨距離增加持續產生新的事件。位置會在每場比賽重新隨機，同時遵守賽道的危險區域。穿過可見的開口即可收集光環。各種光環可補充電量或 NITRO、給予小幅加速、獎勵風險，或套用暫時的神秘效果。收集過的光環會消失；清除完整一組會獲得 PERFECT LINE 與額外的 NITRO。漏掉一個光環會中斷該組，但保留已收集的獎勵。

### 對手、尾流與最後衝刺

跟在對手或車流車輛後方行駛，可獲得暫時的速度上限提升與 NITRO；離開尾流後才能再次獲得。對手會依難度與駕駛狀況管理 BOOST 與 NITRO，並以有限度的步調調整讓車隊保持競爭。當玩家大幅落後時，符合資格的 Classic 與 Cup 比賽可能在前方放置額外的恢復補給。最後衝刺期間，音樂與 HUD 回饋會強調附近的對手與距離差距。

### 儲存的資料

進度與偏好設定使用瀏覽器儲存空間，並含驗證與失敗處理，因此儲存空間被封鎖或資料毀損都不會妨礙遊玩。History 保留最近的比賽，而相容的最佳時間、賽道解鎖、獎牌、星數、塗裝選擇與符合資格的 Ghost 則分開儲存。紀錄以賽道配置與規則集為範圍，因此不相容的成績不會取代目前的最佳；相容的舊版資料在可用時會被遷移。開啟 **History** 可篩選比賽、比較時間並檢視細節。Daily 與挑戰模式的紀錄與 Career 結果分開。可選的 Google 登入會透過 Firebase 同步支援的進度；裝置設定則只留在本機。結果畫面會說明剛完成的比賽是否已上傳雲端，若你尚未登入則提供登入。同步與儲存的細節請見 `docs/cloud-save.md`。

### Ghost、每日挑戰、獎牌與 Garage

- **Ghost**：每次行程都會在整場比賽中取樣車輛的距離、車道位置與高度。賽道上的個人新紀錄會儲存該次行程，之後在該賽道上的比賽會以半透明的藍色車輛顯示它。預設為關閉；請在 Controls 中開啟 **Show best-run ghost**。
- **每日挑戰**：History 會顯示今天的賽道與修飾條件，依本機日期挑選：禁止飛行、車流增加，或僅限金色光環。Canyon 絕不會出現禁止飛行，因為它的斷橋需要飛行。每日行程只會進入當天最快成績專屬的榜單；絕不影響歷史紀錄、最佳時間、解鎖、星數或 Ghost。Restart 會保留挑戰，**Choose track** 則會離開它。
- **獎牌**：First victory（獲勝）、Clean run（無碰撞）、Perfect flight（單場比賽獲得足夠次數的 PERFECT LINE）與 Triple burst（足夠多次延長 NITRO 爆發）。只有符合資格的 Classic Race 完賽才能授予；每枚獎牌都會保留首次取得的日期。
- **Garage**：每條 Career 賽道上獲得的最佳風格星數會累計用於解鎖塗裝。Garage 會顯示每款塗裝的需求，並讓你預覽尚未解鎖的選項。塗裝只改變外觀，不改變車輛能力。

### Sky Spiral

Sky Spiral 在賽博龐克天際線上方加入了真正的 3D 上升螺旋道路。繞著發光的中央塔樓完整行駛一圈水平迴旋，然後從專用坡道躍過高架缺口。既有的 FLY、BOOST 與 NITRO 都適用於這條新賽道，並提供可選的飛行修正。這條賽道使用獨立的彎曲道路渲染器與專屬的 3D 路徑對應器；目前仍在實體行動硬體上驗證中。

### 賽道與風格

從 Coast 開始，並在符合資格的 Classic 比賽中登上頒獎台，以解鎖後續的 Career 賽道。選擇畫面會顯示可用狀態與解鎖需求。開始前先選擇賽道，或向左或向右滑動 3D 預覽（用滑鼠拖曳，或在觸控板上用兩指橫向滑動），像輪播一樣翻到相鄰的賽道：它會跟隨手指，輕輕一彈就夠，第一條與最後一條賽道會有橡皮筋般的回彈，並有標籤顯示賽道名稱與分頁圓點；鍵盤使用者可用 Left/Right 在賽道按鈕間移動，並以 Enter 選擇。Restart 會保留所選賽道；結果畫面上的 **Choose track** 則回到選單。可用時，**Next** 會開始下一條已解鎖的 Career 賽道。Career 進度完成後，以及在每日挑戰中，它都會隱藏。若瀏覽器中斷了 WebGL 連線（在 iPhone 上鎖定螢幕或切換 App 後很常見），圖形恢復時遊戲會清除警告；否則 **Start** 或 **Race again** 會重新載入頁面。每條賽道都有自己的天空、色調與程序化生成的景物：雨中的霓虹街道與低矮隧道、紅色沙漠峭壁與橋梁缺口／側風，或帶有極光與冰面的雪山。警告標誌會標示特殊路段。Aurora 的上坡路段補充地面燃料的速度較慢。

### World Tour 賽道、路線地圖與賽道名稱

World Tour 的賽道共用一個彎曲道路渲染器（`src/world-tour-scene.js`），並搭配各賽道專屬的色調、建築與地標（總統府與北門的剪影、霓虹路口與一座高塔、鐵路高架橋與山峰、一座燈塔與跨海大橋、帶環的行星）。在首頁選擇 World Tour 賽道時，會在盤旋的車輛後方框出其代表性地標：總統府、東京鐵塔、一座高山峰、一座燈塔或宇宙之門。朝它前進時，路邊會讓該地標始終清楚可見。每張賽道卡片都會顯示完整的主要路線，比賽中則有即時地圖標出玩家與 AI 對手的位置；空中捷徑絕不會被繪出。在較短的螢幕與窄版手機上，即時地圖會讓開，排行榜仍會為賽車手排名。賽道名稱會跟隨以 **EN / 繁體中文** 切換開關選擇的語言（請見下方的語言）。

風格分數會獎勵近距離超車、光環、完整的光環群組、移動中的滯空時間與乾淨的行駛距離。飄移與風險機會會增加獎勵，而碰撞與掉入缺口則會中斷乾淨距離的進度。符合資格的 Classic 結果會依相對於賽道長度的得分頒發風格星數，與完賽名次無關。

燃料與 nitro 條會平順地過渡到新數值、在電量偏低時發出警告、補充時閃爍微光，並在 nitro 儲量集滿時脈動。Comfort mode 與系統的減少動態效果會停用這些動畫。滑動板在按住時會顯示浮動的環／圓鈕，並在比賽開始時顯示簡短提示；放開則讓轉向回到中立。

HUD 使用共通的動態時序。速度表指針會隨速度平順移動；名次變動時，名次數字會翻轉並帶有綠色上升或紅色下降的箭頭，排行榜列則會滑入新的位置。精簡的半透明事件提示位於畫面中央上方，避開 HUD 面板，並將險些擦撞、PERFECT LINE、NITRO 爆發、電量增加與飄移火花階級排入佇列而不重疊；同時補充飛行電量的 NITRO 獎勵，會在提示中標明。跨過有限賽道的一半時，會彈出 HALFWAY 提示，顯示剩餘距離並伴隨上升的鈴聲。右上角的即時路線地圖（橫向手機上也有）就是進度讀數：已行駛的道路會變成橘色，下方的說明文字顯示距離；Endless 只保留距離說明。暫停、完賽與重新開始都會清空佇列。按鈕在按下時會變暗而不改變大小，因此按到邊框之前的任何位置都能被接受；按住的觸控按鈕會保持發亮。拾取能量罐、燃料桶或過充裝置會讓推進器電量條閃爍並顯示它所增加的電量（「+10」），輕推鏡頭，並在開啟 **Haptic feedback** 時給予隨拾取物大小增強的輕微脈衝。VFX 設定中的可選項目 **Haptic feedback** 會在支援的觸控裝置上，為碰撞、NITRO、飄移獎勵與拾取物提供回饋。Comfort mode 與系統的減少動態效果會保留文字與按下狀態的顏色，同時移除新增的動態與震動。

### 語言（Language）

整個介面都提供英文與繁體中文（繁體中文）版本：開始畫面、Garage、History、HUD、比賽提示、結果、路線地圖、設定與 3D 路標。開始畫面賽道卡片下方的一個 **EN / 繁體中文** 切換開關，會一次改變所有內容，無需重新載入。語言依下列順序決定：

1. 你點按切換開關所儲存的選擇（`skyline-rush-locale`；只有在點按時才會寫入，絕不會由自動偵測寫入）；
2. 你的系統語言順序（`navigator.languages`）：第一個 `en*` 或 `zh*` 項目決定結果，其他語言會被略過（`['ja-JP', 'zh-TW']` 選擇繁體中文），任何 `zh*` 標籤（zh-TW、zh-HK、zh-Hant、zh-CN、zh-Hans、純 zh）都選擇繁體中文，清單為空或不存在時則退回 `navigator.language`；
3. 否則使用英文。

品牌與遊戲術語在兩種語言中皆保留英文：Skyline Rush、NITRO、FLY、BOOST 與對手名稱。字串存放於 `src/locales/`；`src/i18n.ts` 負責偵測、`t()` 與目前的語言。

在地化圖片：`node scripts/capture-og-images.mjs` 會在 Chrome 中驅動真實的應用程式，並儲存 `public/og-image.jpeg`（1440×900 的英文啟動畫面），以及供繁體中文 README 使用的 `artifacts/{readme-start,readme-hero,mobile-flight,race-results}.zh-TW.jpeg`（`node scripts/capture-og-images.mjs og` 或 `readme` 只執行其中一半）。英文的 `artifacts/` 截圖絕不會被它動到。`public/manifest.webmanifest` 與應用程式圖示維持原樣：圖示不含文字，而 Web App Manifest 只有單一的名稱與描述、沒有各語言的變體，因此第二份 manifest 會破壞可安裝性。

## 驗證

```sh
pnpm test                 # Deterministic simulation, input lifecycle and geometry
pnpm run build           # Production assets in dist/
pnpm run test:browser    # Real Chrome: desktop, mobile, graphics errors, full race
pnpm run test:layout     # Home-screen fit, top bar and touch targets (runs on pre-push)
make run                # All three (test:browser builds first)
make deploy             # Trigger CI checks + GitHub Pages deployment of remote main
make help               # List every make command with its options
```

瀏覽器測試使用已安裝的 Google Chrome，並允許 SwiftShader 進行無頭渲染。僅有 CPU 的 CI 使用 0.25 的裝置縮放比例，讓 3D 場景保持流暢，同時維持相同的 CSS 視窗尺寸與遊戲斷言；本機測試則以完整解析度渲染。一般遊玩使用瀏覽器可用的 GPU。英文 README 的截圖僅在檔案不存在時，或使用 `UPDATE_ARTIFACTS=1 pnpm run test:browser` 時，才會以 JPEG（品質 70）寫入 `artifacts/`，因為即時 3D 場景每次執行都不同；測試追蹤／結果則會被忽略。完整的衝刺測試在快速的機器上大約需要一分鐘，軟體渲染拖慢模擬時則更久。

```sh
pnpm run preview         # Serve the production build after pnpm run build
```

若要在手機上檢查，請在你的網路上提供該建置（`pnpm exec vite preview --host 0.0.0.0`），並以 `?perf` 開啟（例如 `http://<computer-ip>:4173/?perf`）。頂端會出現一條顯示最近 20 秒比賽影格時間的列：中位數（p50）、第 95 百分位（p95）、平均 fps 與取樣長度。沒有 `?perf` 時，不會量測也不會顯示任何東西。

```sh
make perf BASE=main         # A/B in Chrome at 412×915, CPU throttled 6× (RATE=20 for a low-end phone), 3 alternating rounds
make perf BASE=main VIEWPORT=desktop  # The same A/B at 1440×900 desktop size
make perf-phone             # Like make phone: asks base version, Tailscale/Wi-Fi and Telegram; logs phone temperatures
```

`make perf` 會建置此 checkout，並在指定 `BASE=<git ref>` 時也建置該 ref（位於 `.claude/worktrees/perf-<sha>`，下次會重用），每次執行在 Coast 上比賽 24 秒，並印出每次執行的數據列以及各建置的中位數。`make perf-phone` 對任何未傳入的項目（`BASE=`、`VIA=tailscale|wifi|auto`、`TG=0`）會以和 `make phone` 相同的方式詢問，為每個建置印出並傳送一個 `?perf` 網址到 Telegram，在任何以 USB 連接的 Android 手機的 Chrome 中開啟第一個（透過 `adb reverse`，因此任何網路都行），在按下 Ctrl+C 時傳送網址已失效的通知，並每 10 秒記錄一次手機的感測器溫度與降頻等級（`dumpsys thermalservice`）以及 Mac 的熱警告等級，直到按下 Ctrl+C。只在相同的降頻等級下比較結果：溫熱的手機會降頻並掉幀，與建置版本無關。iPhone 不回報溫度。

## 部署

請在 [https://weskao.github.io/skyline-rush/](https://weskao.github.io/skyline-rush/) 遊玩。這個網站是公開的：訪客不需要 GitHub 帳號或 Tailscale，開發者的電腦也可以離線。

```sh
git tag v0.4.0 && git push origin v0.4.0   # Release: deploys once CI confirms the commit already passed on main
make deploy                              # Deploy remote main manually through the same CI flow
# The on-screen version (ready screen, desktop and mobile) is `package.json`'s version; `/release` bumps it
# after scripts/release-gate.sh has seen a green CI run for the commit on main.
```

CI（`.github/workflows/ci.yml`）會在推送到 `main`、`develop`、pull request、版本標籤推送（`v*`）與手動執行時，建置並執行單元測試與 Chrome 瀏覽器測試。瀏覽器與 World Tour 長時間執行的測試會以平行分片執行，依 `tests/ci-durations.json` 中實測的各測試耗時平衡分配（`scripts/ci-shards.mjs`），且只在 `main` 與 `develop` 上執行（除非提交訊息含有 `[full-regression]` 或手動執行要求，否則其他分支只執行單元測試與雲端存檔檢查），而對同一分支的較新推送會取消被取代的執行。CI 會重試一次失敗的瀏覽器測試；只在重試時才通過的測試仍會在該次執行上被標註，並視為需要修正的錯誤（`.claude/rules/browser-test-stability.md`）。在任何分支上，若推送或 pull request 只變更 `src/`、`public/`、`tests/`、`scripts/` 與 `.github/` 之外的 Markdown、文字、圖片、影片或 `Makefile`，且其父提交已在該分支通過 CI，就會略過所有測試套件（`scripts/ci-changes.mjs`）。手動執行會在所有檢查通過後發佈；版本標籤推送會重新執行單元測試、確認（`release-verified`）所標記的程式碼已在 `main` 上通過完整測試套件而不重跑瀏覽器測試套件，然後發佈並驗證公開網站。標記在 CI 從未在 `main` 上通過的提交上的標籤不會被部署。一般的分支推送與 pull request 只會執行檢查。推送到 `main` 時，若其中一個合併提交所合併的不是 `develop` 或 `hotfix/*`，`main-merge-source` 工作（`scripts/check-main-merges.sh`）也會失敗，而該紅燈執行會阻擋發佈。Pages 建置使用 `--base=/skyline-rush/`，讓腳本、樣式與字型從專案網址載入。GitHub Pages 必須使用 **GitHub Actions** 作為發佈來源。手動部署需要已驗證的 GitHub CLI（`gh auth login`）；請先推送你的提交，因為 `make deploy` 使用遠端的 `main`。部署不再依賴本機的 pre-push hook 或 Netlify 登入。當推送、標籤或手動執行時任何檢查或部署失敗，`notify-telegram` 工作會將失敗執行的連結傳送到 Telegram；它需要儲存庫密鑰 `TELEGRAM_BOT_TOKEN` 與 `TELEGRAM_CHAT_ID`（以 `gh secret set <NAME>` 各自設定，它會提示輸入值），缺少時則靜默略過。

連結預覽圖片是 `public/og-image.jpeg`，由 `node scripts/capture-og-images.mjs og` 在啟動畫面就緒後擷取，不含按鈕。爬蟲無法切換語言，因此 `index.html` 只參照這張英文封面（搭配 `og:locale` `en_US` 與 `og:locale:alternate` `zh_TW`）。`public/og-image.en.jpeg` 與 `public/og-image.zh-TW.jpeg` 是封存的 0.21.0 新功能圖片。更換封面後，請提高 `index.html` 中 `og:image` 的 `?v=`，讓社群網站抓取新圖。

## 專案結構

- `src/game.js`：確定性的街機模擬、對手、車流與完賽順序。
- `src/input.ts`：鍵盤與多指標控制，含取消與失焦清理；讀取已儲存的按鍵對應。
- `src/key-map.ts`：純粹的按鍵對應，含 E / X NITRO、衝突交換式重新綁定、驗證與儲存。
- `src/history.ts`：已儲存的遊戲資料：近期比賽歷史、各賽道最佳成績與舊版遷移、生涯統計、獎牌、星數、已裝備的塗裝、Ghost 與每日榜單。
- `src/ghost.ts`：取樣式 Ghost 錄製、各賽道驗證與插值播放。
- `src/appearance.ts`：塗裝目錄與星數解鎖門檻。
- `src/rng.ts`：以種子產生的隨機串流；拾取物與光環來自每場比賽的配置種子（測試與工具中則為賽道種子）。
- `src/world.js`、`src/geometry.ts`：Three.js 渲染器、程序化生成的車輛、公路、天際線、飛行特效與鏡頭。
- `src/effects.js`：有上限的 GPU 粒子池，用於蒸氣、火花與著陸塵土。
- `src/track-paths.ts`、`src/world-tour-scene.js`：每條賽道一份距離到道路的對應，以及共用的 World Tour 道路、景物與地標。
- `src/route-map.ts`、`src/i18n.ts`：SVG 完整路線與即時賽車手地圖；語言偵測、已儲存的選擇、`t()` 與英文／繁體中文賽道名稱；`src/locales/` 存放各語言目錄。
- `scripts/capture-og-images.mjs`：從真實應用程式擷取英文與 zh-TW 封面圖片以及 zh-TW README 截圖。
- `scripts/pickup-economy.mjs`：以腳本控制的機器人駕駛每條賽道，並印出每分鐘 NITRO、BOOST 占比、燃料耗盡次數與第一次 NITRO 的時間；`tests/pickup-economy.test.js` 鎖定光環／拾取物的配置。
- `scripts/ring-variety.mjs`：在重新隨機的比賽種子上，印出每條賽道的光環車道分布、地面占比、每場比賽的光環列與排數，以及機器人的光環取得量與 NITRO 速率；`tests/ring-variety.test.js` 讓每條車道都被使用，同時不讓光環更難收集。
- `scripts/rival-balance.mjs`：由一個專家機器人（使用 BOOST、為光環而飛行）與一個新手機器人（兩者皆不用）在各賽道與難度上與 AI 車隊競速；印出最快對手的差距與機器人的名次。
- `scripts/ci-shards.mjs`：`plan` 為每個 CI 分片提供其 Playwright `--test-list`，依耗時打包測試，讓每個分片大約同時完成；`refresh <run-id>` 會在測試套件大幅變動後，依某次 CI 執行的記錄重寫 `tests/ci-durations.json`。
- `src/App.vue`、`src/icons.ts`：Vue 3 的介面外殼（開始畫面、HUD、面板、觸控按鈕）及其共用的 SVG 圖示；共用面板使用 Vue 元件，而比賽中的 HUD 則由遊戲迴圈直接更新。
- `src/main.js`、`src/style.css`：掛載 `App.vue`、串接各畫面控制器，並執行比賽生命週期（開始、暫停、重新開始、結果）與影格迴圈。
- `src/*-ui.ts`：每個畫面區域一個 TypeScript 控制器（比賽選擇、雲端存檔、觸控操作、按鍵對應、VFX、音訊、歷史對話框、拍照模式）。
- `src/race-hud.ts`、`src/race-hud-modes.ts`：比賽中的 HUD，於每個 HUD tick 以命令式寫入。
- `src/pickup-take.ts`、`src/pickup-feedback.ts`、`src/pickup-fuel-cue.ts`：玩家的拾取事件，及其各階級的觸覺、鏡頭輕推與燃料條回饋。
- `src/race-results.ts`、`src/result-screen.ts`、`src/session-progress.ts`：記錄完成的比賽（最佳成績、解鎖、獎牌、Ghost）並顯示其結果畫面。
- `vite.config.js`：搭配 `@vitejs/plugin-vue` 的 Vite。
- `src/perf.ts`：用於 `?perf` 裝置檢查讀數的影格時間百分位數。
- `src/audio.js`：合成的音效與循環播放的音樂序列器；歌曲存放於 `src/music-tracks.ts`，比賽到音效的事件則位於 `src/race-audio-events.ts`。
- `src/audio-settings.ts`：從 `localStorage` 讀取已儲存的音樂／音效開關與音量，以及滑桿的靜音保留音量規則。
- `tests/`：單元與瀏覽器行為測試。`tests/module-size.test.js` 讓每個原始碼模組維持在 400 行以內（較舊的大型檔案有上限，且上限只會往下調）。
- `docs/design.md`、`docs/verification.md`：範圍與驗證證據。
- `README.zh-TW.md`：本檔案的繁體中文翻譯，由 `scripts/readme-zh.mjs` 保持最新（`check`、以 `claude -p` 翻譯的 `sync`，以及手動編輯後的 `stamp`）。當某次提交變更 README.md 時，`.githooks/pre-commit` hook 會重新產生它（以 `SKIP_README_ZH=1` 可略過一次），而 `.githooks/pre-push` 會在被推送的提交變更 `src/`、`tests/`、`scripts/` 或 `package.json` 時執行 `pnpm test`，接著在觸及首頁（`index.html`、`src/App.vue`、`src/main.js`、`src/style.css`、`src/locales/`；以 `SKIP_LAYOUT_GATE=1` 可略過一次）時執行 `pnpm run test:layout`，而 `.githooks/main-merge-guard`（由 `pre-merge-commit` 與 `pre-commit` 執行）會拒絕將 `develop` 或 `hotfix/*` 以外的任何分支合併進 `main`（fast-forward 不會執行任何 hook，因此請使用 `--no-ff`；以 `ALLOW_MAIN_MERGE=1` 可略過一次）；`make` 會以 `git config core.hooksPath .githooks` 啟用這些 hook。`.claude/settings.json` 中的 Claude Code Stop hook，會在某一回合編輯了 README.md 卻沒有同步更新它時，讓 Claude 回頭更新。

所有車輛／景物的幾何與特效都由程式碼產生。Barlow Condensed 依其 SIL Open Font License 隨附於 `public/fonts/OFL.txt`。Three.js、Vue、Vite 與 Playwright 保留其各自的套件授權。

來源：[weskao/skyline-rush](https://github.com/weskao/skyline-rush)。以街機物理在多條賽道上進行的單人賽車。瀏覽器驗證涵蓋桌機 Chrome 與模擬的行動裝置視窗；iOS Safari 已在 iOS Simulator 中檢查過（直向與橫向、Coast 與 Neon），但實體手機上的影格率尚未量測（請使用 `?perf`，見「驗證」）。
