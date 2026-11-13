<!-- source-sha256: 0dd8a39a80964ec1db26a222ead3f4b2e02ccfd2a90d0cd6c1a0709515350585 generated from README.md by scripts/readme-zh.mjs; edit README.md, then run the script -->
# Skyline Rush

[English](README.md) · **繁體中文**

[**開始遊玩 Skyline Rush →**](https://weskao.github.io/skyline-rush/)

這是一款以瀏覽器執行的 3D 街機賽車遊戲，主角是一輛飛行電動跑車，造型參考 Tesla Roadster 2 及其火箭推進器概念。你可以在多種賽道上對抗 AI 對手、飛越車流、管理推進器電量，並利用駕駛獎勵持續前進。操控手感屬於虛構的街機物理；本專案為非官方粉絲作品，與 Tesla 或 SpaceX 無任何關係。

## 遊戲介紹

在 Classic Race 中，Skyline Rush 是一款可重複挑戰的街機衝刺遊戲：玩家一人對抗多名 AI 對手與道路車流，桌機或手機皆可遊玩，無須安裝。其他模式提供單人駕駛、自訂規則、繞圈賽與多階段挑戰。

- **先駕駛，再飛行。** 累積速度後按住 FLY 即可起飛，飛越車流、穿過光環、跨越斷橋。飛行與 BOOST 共用推進器電量；地面行駛、無動力滑翔與獎勵都能補充電量。
- **好好開車就能獲得 NITRO。** 近距離超車、漂移、光環群組（PERFECT LINE）、尾流、成功落地的桶滾與拾取物會填滿獨立的 NITRO 儲量；啟動一次爆發，或連續按鍵來延長時間。
- **探索並解鎖賽道。** 在海岸公路、霓虹街道、峽谷、冰封山路、高架螺旋道路與 World Tour 目的地競速。各賽道有獨特的景色與障礙，點對點路線還設有空中捷徑。選擇器會區分可遊玩賽道與 Coming Soon 預覽。
- **永遠有目標可追。** 符合資格的 Classic 完賽可獲得風格星星，用來解鎖 Garage 塗裝。最佳成績 Ghost、每日挑戰、獎牌與各模式專屬紀錄，讓你一再回來比賽。

賽程長度依賽道與模式而定。音效由瀏覽器即時合成，進度儲存在本機。可選用 Google 登入啟用雲端存檔同步；遊玩並不需要帳號。

https://github.com/user-attachments/assets/e0ddb94c-794e-49ab-9b66-51cb5150f101

<p align="center"><img src="artifacts/readme-tracks.jpeg?v=2" width="70%" alt="飛行中的部分賽道：Neon Downtown、Aurora Pass、Sky Spiral 與 Tokyo Afterdark"></p>

<p align="center"><img src="artifacts/readme-start.zh-TW.jpeg?v=2" width="49%" alt="含遊戲模式、賽道與 Start race 的開始畫面"> <img src="artifacts/race-results.zh-TW.jpeg?v=2" width="49%" alt="創下個人最佳的比賽結果"></p>

### 在手機上遊玩

支援直向或橫向的觸控操作；AUTO 會讓油門保持按住。[觀看 MP4](artifacts/mobile-demo.mp4)

<p align="center"><img src="artifacts/mobile-home.jpeg?v=2" height="300" alt="手機直向的開始畫面與賽道選擇"> <img src="artifacts/mobile-landscape-flight.jpeg?v=2" height="300" alt="手機橫向飛行，按住 FLY 並顯示觸控按鈕"></p>

截圖取自全新設定檔下的 Chrome 手機模擬（390×844 與 844×390）；並非實體手機的效能量測。

## 遊戲模式與重玩價值

> 本 README 描述的是目前的 checkout。已部署的 GitHub Pages 版本依發布流程而定，可能與開發版不同。Coming Soon 預覽不代表該賽道可以遊玩。

選擇一條**已解鎖的賽道**，在賽道卡片下方選擇 **GAME MODE**，需要時展開規則說明，然後按下 **Start race**（或 Enter）。賽車仍使用相同的 Three.js 道路、飛行、FLY / BOOST / NITRO 與響應式觸控操作。可用的模式包括：

| 模式 | 變化內容 | 勝利條件／進度 |
| --- | --- | --- |
| **Classic Race** | 與 AI 對手進行點對點競速，包含車流、捷徑、光環與 NITRO。 | 登上頒獎台可解鎖下一條 Career 賽道；符合資格的 Classic 完賽可獲得 Career 星星、獎牌與官方最佳成績。 |
| **Custom Race** | 設定對手數量（含單人）、AI 難度、車流、拾取物與碰撞懲罰，或從預設組合開始。 | 不計排名的成績有獨立的歷史紀錄。可選的衝刺階段會重複點對點路線並比較總時間；它們不是環形賽道的圈數。 |
| **Free Drive** | 獨自探索任何已解鎖的賽道，可調整道路車流與拾取物，沒有名次，也不強制勝利。 | 自由駕駛、漂移與飛行直到道路盡頭；抵達終點會以結果畫面結束本次行程，不儲存任何紀錄。這**不是**無限世界模式。 |
| **Time Attack** | 單人計時衝刺，附相容的最佳成績 Ghost 與領先／落後分段時間。可選擇 **Clean Time Trial** 開關。 | 依賽道與規則記錄最佳時間；Clean 行程只要發生任何碰撞即視為無效，不會取代個人最佳。 |
| **Obstacle Run** | 以種子產生的路邊障礙；密度分為 **Standard** 或 **Extreme**。部分障礙會橫向掃過；警示 HUD 會預告即將出現的危險。 | 閃避危險、以乾淨的通過贏得風格分數，並使用一般路線的終點。障礙配置與碰撞共用確定性邏輯；Classic 不受影響。 |
| **Checkpoint Rush** | 穿越發光的關卡拱門，補充倒數時間，並以乾淨通過贏得風格分數。 | 在時間用完前通過每一道關卡與終點。漏掉關卡或超時不會儲存有效的最佳成績；HUD 會顯示進度、剩餘時間與下一個目標。 |
| **Championship Cup** | 以已解鎖的路線組成多賽道 Cup，並在各階段對抗 AI 車隊。 | 名次累計積分；總時間用來分出同分的排名。Cup 成績與 Career 解鎖分開計算。 |
| **Stunt Attack** | 連續多回合的限時風格賽：漂移、空中特技、險些擦撞與光環累積連擊分數。 | 計時結束即結束本場；本機獎牌與最佳分數依時長分別記錄。 |
| **Elimination** | 每隔一段時間淘汰目前仍在場上的最後一名車手。 | 存活到成為最後的車手；提早被淘汰會結束你的行程且沒有獎勵。 |

### Cup 復原

未完成的 Championship Cup 會在主畫面提供 **Resume** 或 **Discard**。Resume 會保留已結算的階段積分，只重新開始未完成的階段；重試只會回溯正在重玩的那一個階段。完成或捨棄 Cup 會清除其復原紀錄。刪除遊戲進度時也會一併移除檢查點，同時保留裝置偏好設定。復原使用此瀏覽器的儲存空間，無法還原瀏覽器拒絕儲存的資料。

### 自訂呈現與 Ghost

Custom Race 可以為每個衝刺回合重播最快的相容 Ghost。Custom 與 Free Drive 提供 Track / Day / Dusk / Night / Rain / Fog 的呈現預設，以及即時規則摘要。這些外觀選擇不會影響紀錄資格或規則集身分。重試會保留所選外觀；更換賽道或回到 Classic 會恢復該賽道的外觀。Photo Studio 關閉時會恢復目前比賽的外觀。

### 可選道具與獎勵關卡

Custom 與 Free Drive 提供 **Off / Classic Mystery Rings / Active Items / All Items**。持有的道具只佔一個欄位：按 **Q** 或點按 **USE** 啟動，然後等待冷卻。NITRO 與 FLY/BOOST 保有各自的操作。All Items 會加入有限的加速、空中充電與一次碰撞復原關卡；EMP 會短暫減慢附近的對手，並在單人遊玩時轉換為 Magnet。復原會保留官方的碰撞次數。Stunt Attack 與 Checkpoint Rush 也可以另外選用暫時、不可疊加的分數倍率關卡。Classic 的預設值維持不變。

### Event Lab Lite v1

**Event Lab Lite** 可編輯本機的賽道範本，在已解鎖的路線上放置障礙、NITRO 光環與補給品。你可以更改它們的車道與距離、對編輯進行 Undo/Redo/Reset，並以文字匯入或匯出經過驗證的賽道。開始時會把賽道編譯成真正的比賽事件；重試會保留賽道與種子。賽道成績與 Career 及 Custom 紀錄分開。路錐、自製坡道、檢查點編輯與社群分享不在這個初版範圍內。

### Endless Highway

**Endless Highway** 把選定的可遊玩賽道變成超越其既定終點的距離生存賽事。車流難度會上升到上限；達到碰撞上限即結束本次挑戰。最長距離紀錄與 Career 和 Ghost 分開。暫停與 WebGL 復原會保留行程，而附近的景物與事件使用有限的物件池。

### Circuit Race

**Circuit Race** 使用 Harbor Circuit，這是一條獨立的封閉環形賽道，圈數可選。依序通過每個區段才算完成一圈；反向通過、傳送與復原都無法獲得圈數。HUD 與結果畫面會顯示分段、上一圈、個人最佳圈速與總時間。最佳圈速不會因滾動式 History 淘汰而消失；總時間與 Ghost 則專屬於該圈數設定。點對點賽道維持原有的地理與 Career 進度。

### 賽道主題、障礙與風險路線

- **賽道主題**（在 Custom、Free Drive 與 Obstacle Run 中可選用）讓每條路線都有專屬的危險：Coast 的貨物與陣風、Neon 的道路施工、Canyon 的落石、Aurora 的雪堤、冰面與暴風雪、Sky Spiral 的能量門、Taipei 的節慶路障、Tokyo 的號誌門、Alpine 的雪崩、Coastal 的浪花，以及 Cosmic 的能量牆。危險會提前警示、始終保留可通行的車道，也絕不會改變 Classic。
- **Obstacle Run** 提供 **Mixed obstacles** 賽道：包含橫掃的關門、墜落的碎片，以及設在路障上方的圓環，獎勵飛越或繞行的玩家。
- **風險路線**：高風險光環與近距離超車在 Custom Hard 中給予更多獎勵，也可以關閉以便輕鬆練習。
- 道路新增了不可碰撞的路邊風景：觀眾、廣告看板、服務車、鐵路月台、行駛的列車、船隻與無人機。較低的畫質設定會繪製較少的內容。

### 比賽設定、結果與無障礙

- 模式與賽道選擇都能以鍵盤和觸控操作；情境面板只顯示與所選模式相關的選項。無法使用的 Cup 會說明還需要幾條賽道。
- HUD 會配合模式調整：單人賽事隱藏容易誤導的對手名次；多階段與 Cup 賽事顯示階段進度；Checkpoint Rush 顯示即時的關卡倒數；Obstacle Run 警示即將出現的障礙；Clean Time Trial 會清楚標示行程已失效。
- Practice、Custom、Time Attack、Obstacle、Checkpoint 與 Cup 的結果使用獨立的 `skyline-rush-mode-history-v1` 紀錄鍵。符合資格的練習 Ghost 有各自儲存的規則集；Classic 的解鎖、星星、獎牌、Daily 紀錄與官方時間不會受到練習行程影響。
- 在 **History → Challenge records** 中，可依模式篩選，查看每個確切賽道／規則集的個人最佳，以及符合資格的 Time Attack Ghost。即使較舊的行程被輪替掉，終身最佳仍會儲存在 `skyline-rush-mode-bests-v1` 之下。Challenge 紀錄明確不屬於 Career 獎牌或星星。
- 模式標籤、結果說明、設定選項與危險警示皆支援英文與繁體中文。低畫質圖形、觸控操作與減少動態效果仍屬驗證計畫的一部分。

### 真實遊戲截圖與驗證

用來檢視這些模式的截圖是**從執行中的瀏覽器遊戲**擷取的，不是概念圖。[下載實際的 Playwright 擷圖集](https://github.com/weskao/skyline-rush/actions/runs/39742666980/artifacts/12410172411)（Custom 單人、Free Drive、Time Attack、Obstacle Run、Extreme 障礙、Checkpoint Rush 與手機模式選單）。GitHub Actions 的產出物可能需要登入且會過期；若要在本機重現，請執行 `npx playwright test tests/race-modes-browser.spec.js` 並開啟 `test-results/race-mode-*.png`。CI 截圖以軟體算繪且解析度較低，無法代表最終裝置上的畫質。

**驗證：** 每項功能的測試與完整關卡驗證紀錄都列在 `TODO.md`。實體 iPhone 與 Android 的檢查仍待進行。

## 在本機執行

需要 Node.js 22.12 或更新版本，以及支援 WebGL 2 並啟用硬體加速的瀏覽器。

```sh
cd skyline-rush   # From the directory containing your clone
make         # Installs dependencies on first run, then starts the Vite + Vue dev server
```

開啟 Vite 印出的本機網址（通常是 http://127.0.0.1:5173）。資源與字型皆已內建於本機。核心遊戲不需要帳號；選用的雲端存檔登入與同步則使用 Firebase 服務。

`make` 與 `make dev-unlocked` 也會啟動本機的 Firebase Auth/Firestore 模擬器（需要 Java 21+），因此雲端存檔的 Google 登入可搭配假的測試帳號使用，絕不會動到真實存檔。專案擁有者的雲端存檔操作與 Spark 額度檢查請見 `docs/cloud-save.md`。

`make dev-diag` 與 `make phone-diag` 提供相同的建置版本，但編入了螢幕上的診斷橫幅（影格計數、頁面生命週期與觸控事件及其命中目標，以及跨重新載入保留的最近未捕捉錯誤），用於在實體手機上追查卡頓或按鈕失效。正式建置絕不會包含它：`npm run build` 會拒絕帶有診斷模組的 bundle。

`make phone` 會開啟終端機選單，可啟動、檢查或停止讓手機開啟的開發伺服器（透過 Tailscale 或同一個 Wi-Fi），並在伺服器回應後印出手機網址。選單會列出此 checkout、其他 worktree 與最近的分支，也可以輸入分支名稱；`make phone <name>` 會直接前往該分支（或 `feature/<name>`），必要時會在 `.claude/worktrees/` 底下建立其 worktree，`make phone off` 會停止它啟動的所有伺服器（如同 `/phone-dev off`），而 `y=1`（例如 `make phone y=1 <name>`）會略過選單：每個問題都採用其建議選項，並印出每項選擇。當某個連接埠已被此專案先前啟動的伺服器佔用（任何 worktree 皆然）時，沿用該連接埠就是建議的答案：舊伺服器會被停止，網址維持不變；`make dev`、`make dev-diag`、`make dev-unlocked`（5173）與 `make dev-feature`（5443）會不經詢問直接這麼做，並且不會動到其他專案的伺服器。它提供的是一般鎖定的建置版本；`make phone-unlocked [name]` 是相同的選單，但所有賽道與塗裝皆已解鎖，是唯一手機可連線的全解鎖伺服器（`make dev-unlocked` 與 `make dev-feature` 仍僅限桌機）。除了加入 `src/upcoming-tracks.ts` 中 `PLAYABLE_PREVIEW_IDS` 的 id（僅限其真正的比賽執行階段已在 `RACE_TRACKS` 之中）外，Coming Soon 卡片在每個建置版本中都維持僅供預覽；`make dev-unlocked` 與 `make phone-unlocked` 會讓該卡片可以開始比賽，正式環境則絕不會。它需要個人的 `phone-dev` Claude Code skill（`/phone-dev` 會詢問相同的選單），且不使用模擬器執行，因此手機上的雲端存檔登入會使用真實專案。

## 操作方式

| 動作 | 鍵盤 |
| --- | --- |
| 加速 | W / ↑ |
| 煞車 | S / ↓ |
| 轉向 | A / D 或 ← / → |
| 飛行 | 速度足夠後按住 Space |
| 降落 | 放開 Space |
| 加速推進 | 按住 Shift；消耗推進器電量 |
| NITRO | E / X（一次完整儲量；NITRO 期間再按一次可延長）。WASD 慣用者使用 E；方向鍵玩家則讓左手維持在 Shift / X / Space |
| 漂移 | 高速時按住 S + A / D（僅限地面） |
| 開始 | Enter |
| 暫停／繼續 | Esc / P |
| 重新開始 | Backspace |
| 切換鏡頭 | C |
| 全部音訊靜音／取消靜音 | M |
| 自動油門開／關 | F2 / AUTO 按鈕 |
| AIRFLOW 展示開／關 | V / AIRFLOW 按鈕 |
| 在主畫面切換賽道 | 左右滑動或拖曳 3D 預覽，或在觸控板上用兩指滑動 |

手機版面提供轉向、油門、煞車、加速推進、飛行與 NITRO 按鈕。觸控操作支援同時按住多個按鈕。AUTO 會保持按住油門，讓你專心轉向與飛行；煞車一律優先於它。每種裝置預設皆為開啟；一旦你切換過，你的選擇會記在此瀏覽器中（`skyline-rush-auto`）。離開分頁會暫停比賽並清除按住的輸入。比賽中點按 SKYLINE RUSH 標誌會暫停並先詢問：**Keep racing**、**End race**（回到賽道選擇，行程不儲存）或 **Back to home**（重新載入）；無論選哪一個，開始畫面重新開啟時都會停在剛比賽過的賽道，並捲動到賽道列的中央（第一條與最後一條賽道位於其兩端）。Esc 會讓比賽維持暫停。鏡頭與音效快捷鍵會保留按住的駕駛操作。在觸控裝置上，在轉向板上把拇指往下滑動會煞車，往下並向側邊滑動則會漂移；在 Buttons 模式中，較窄的煞車鍵位於轉向按鈕上方，避開拇指擺放的那一排，因此只會在刻意時才被按到；把拇指從 ← 或 → 往上滑入煞車鍵會同時保持轉向與煞車，所以單手拇指就能漂移，往下滑回則會放開煞車。觸控按鈕與螢幕角落保持距離，讓拇指更容易觸及，平板則會把它們抬高並放大。

比賽前或暫停時開啟 **Controls**，即可調整鍵盤轉向靈敏度或重新對應駕駛操作。選擇一個動作後按下按鍵；衝突的按鍵設定會互換，固定的快捷鍵保留不可改，按 Escape 可取消擷取。Reset keyboard 會恢復預設值。按鍵設定會立即生效，並儲存在 `localStorage['skyline-rush-keymap']`。手機與平板會隱藏鍵盤區段，直到按下實體（例如藍牙）按鍵為止；之後該鍵盤會被記錄在 `localStorage['skyline-rush-keyboard-seen']`。

同一個面板也控制觸控轉向模式、慣用手、滑動靈敏度、大小、不透明度，以及按住／切換式 FLY。**Edit touch layout** 讓你在比賽預覽上拖曳動作按鈕與經典轉向按鈕；**Done editing** 會保留配置，**Reset touch layout** 則會恢復。位置在重新載入後仍會保留，會隨慣用手鏡像，並在旋轉後仍保持在可視範圍內。在較短的橫向螢幕上（例如工具列顯示中的 iPhone Safari），開始畫面會省略標語，讓 START RACE 無須捲動，而比賽 HUD 會隱藏速度儀表與次要電量列，避免面板互相重疊。

所有音訊皆以 Web Audio 合成；不需要下載任何音訊。音樂會隨目前的畫面、賽道與遊戲模式變化，並為檢查點、危險、特技與最後衝刺等事件配上提示音。音效涵蓋選單、倒數、駕駛、飛行、加速推進、碰撞、降落與獎勵。暫停時行駛音效會淡出；音效靜音會停止等待中的提示音。

喇叭圖示會開啟音訊設定，內有 Music 列與 Sound effects 列，各有一個靜音開關與音量滑桿（上方的開始畫面截圖中顯示為展開狀態）。**Mute all**（或 M）會一次讓兩者靜音。靜音會保留各聲道的音量，因此取消靜音時會回到原本的音量；把滑桿拖到零同樣會讓該聲道靜音。兩者預設皆為開啟、音量 100%，每個開／關選擇與音量都會記在 `localStorage` 中（`skyline-rush-music`、`skyline-rush-sound` 儲存 `on`/`off`，另有 `-volume` 變體儲存百分比）；沒有儲存任何值時，兩個聲道皆為開啟，並會以 `on` 儲存。在較短的螢幕上，面板可以捲動。在瀏覽器允許自動播放的情況下，片頭音樂會在頁面載入後立即開始。若不允許（Chrome 與大多數其他瀏覽器的首次造訪），則由第一次點按、點擊或按鍵啟動。在 iPhone 與 iPad 上，遊戲會要求媒體播放，因此靜音開關不會讓它靜音；這也會在遊戲進行時暫停其他 App 的音訊。

飛行面板會顯示上升、巡航、下降與觸地、剩餘推力秒數，以及下一個要使用的操作。青色光環標示出空中通道，屬於遊戲玩法：請見下方的 Rings。手機版另有按住加速的按鈕。橘色的接觸報告會顯示撞擊類型與損失的速度；護欄現在會把地面車輛彈回並使其減速。在護欄上方飛行則可越過護欄。

場景包含泛光照明、日落水面、懸索橋、推進器蒸氣、碰撞火花與觸地漣漪。鏡頭運動與非必要的速度線會遵循你系統的減少動態效果偏好設定。音效為推力、碰撞與降落提供各自獨立的回饋。

**VFX**（右上角）可選擇 Realistic、Cinematic 或 Extreme 外觀、Low / Medium / High 畫質（Low 會關閉泛光並繪製較少的景物）、Comfort mode（無閃光、震動、殘影或模糊）以及可選的觸覺回饋。其中的 **Race HUD** 區段可選擇 Immersive 或 Competitive（附有排行榜、小地圖與次要數據的開關），可開啟或關閉 NITRO READY 的音效與動畫，**Reset HUD to default** 則會恢復預設值。**Fine tuning** 把每種效果列為滑桿，**Reset visual settings** 會恢復預設值。**AIRFLOW**（或 V）會把場景切換為空氣動力學展示：車身上的流線、遙測面板、Low drag 或 High downforce，以及駕駛、前方、後方、側面或環繞的鏡頭。開始面板會讓位給展示畫面，只留下橘色的 **START RACE** 按鈕，停靠在車輛下方的底部中央；左右滑動場景即可切換賽道。第一次開啟 AIRFLOW 時，會有一個動畫指尖示範該手勢。流線僅在 AIRFLOW 開啟時出現：關閉時，BOOST 與 NITRO 會顯示推進器噴流、尾跡與速度線，但沒有流線。

起跑燈號會指示倒數與 GO。玩家駕駛一輛配有後推進器、主動式尾翼與動態車輪的跑車。AI 對手有各自獨特的輪廓與燈光特徵，而車流使用通勤車輛。轉向會漸進加入，放開加速推進後車輛會逐步減速。駕駛與工具列控制項提供適合觸控大小的點按目標。

在地面高速近距離超越車流會累積獎勵連鎖並補充電量。碰撞會中斷連鎖；在空中、距離過遠或復原中的超車不會獲得獎勵。HUD 提示會回報超車與最後衝刺，結果畫面則整理近距離超車與接觸次數。

動力飛行會消耗推進器電量；歸零時，車輛會自動下降。放開 FLY 與 BOOST 即可滑翔並恢復電量，或降落以更快充電。BOOST 從同一個儲量中扣除。對手與車流遵守共通的碰撞規則：它們會避開較慢的車輛與固態障礙，撞擊會使相關車輛減速並被推開。領先 AI 車隊即可獲勝；在瀏覽器儲存空間可用時，符合資格的個人最佳會被儲存。

### 操控手感

轉向會平順地建立，高速時橫向移動受到限制。FLY 會暫存提早按下的操作，直到達到起飛速度。放開 FLY 會讓下降變得柔和；若同時放開 BOOST，滑翔會恢復電量。耗盡的推進器在放開並充分恢復後會再次可用。間隙警示有助於判斷跨越所需的電量，專用坡道則能把車輛發射出去。輕微擦過護欄會保留連擊；較猛烈的撞擊則算作碰撞。放開轉向時，AUTO 也會提供車道置中輔助。同時按住 FLY + BOOST 會啟動 AIR DASH，比各自獨立推進更有效率地共用電量。

### NITRO 與漂移

NITRO 有獨立的儲量，在 HUD 中以電量分段顯示。拾取物、光環與駕駛獎勵會補充它；NITRO 獎勵也能恢復推進器電量，溢出的部分會轉換為電量。拾取物的配置隨起跑格數調整，並在每場比賽重新隨機產生。完整儲量會啟動限時的速度與加速度提升；再按一次可延長爆發時間，但不會疊加其速度加成。NITRO 也會減少因碰撞車流而損失的速度。

在地面高速時，煞車加轉向會開始漂移。持續漂移以累積獎勵層級，放開後會獲得 NITRO 與小幅加速。煙霧、彩色火花、音效與 HUD 回饋會顯示累積的進度。起飛、掉進間隙或發生碰撞都會失去已累積的獎勵。

NITRO 不會消耗推進器電量，且能與 FLY 或 BOOST 並用；動力飛行與 BOOST 仍會消耗它們共用的儲量。

**空中特技**：飛行時，快速朝相反方向轉向即可開始桶滾。完成翻滾並平穩降落即可獲得 NITRO；過早降落、撞到障礙或落地過重都會取消獎勵。HUD、音效與可選的觸覺回饋會回報該特技。減少動態效果與 Comfortable VFX 會保留回饋但不含旋轉。

**捷徑**：點對點賽道在邊緣車道上方設有標示的空中通道。維持在飛行路線上，在通道內會獲得更高的速度上限與免費飛行，沿途並有拾取物；BOOST 仍會消耗電量。塔柱仍是堅固的危險物。半透明的橋面與 SHORTCUT / FLY HIGH 標誌標示出路線，HUD 會回報進入。

### Rings

光環的配置隨起跑格數與賽道調整，包含成組光環、直線列隊、全寬排列與風險光環；Endless 會隨著距離增加持續產生新的事件。位置會在每場比賽重新隨機產生，同時避開賽道的危險。穿過可見的開口即可收集光環。光環種類可補充電量或 NITRO、給予小幅加速、獎勵風險，或套用暫時的神秘效果。收集過的光環會消失；完整清除一組光環會獲得 PERFECT LINE 與額外的 NITRO。漏掉一個光環會中斷該組，但保留已收集的獎勵。

### 對手、尾流與最後衝刺

跟在對手或車流車輛後方可獲得暫時的速度上限提升與 NITRO；需離開尾流後才能再次獲得。對手會依難度與駕駛狀況管理 BOOST 與 NITRO，有限度的速度調整讓車隊保持競爭力。當玩家大幅落後時，符合資格的 Classic 與 Cup 比賽會在前方放置額外的復原補給品。最後衝刺期間，音樂與 HUD 回饋會強調附近的對手與距離差距。

### 儲存的資料

進度與偏好設定使用瀏覽器儲存空間，並具備驗證與失敗處理，因此被封鎖或格式錯誤的儲存空間不會妨礙遊玩。History 保留最近的比賽，而相容的最佳時間、賽道解鎖、獎牌、星星、塗裝選擇與符合資格的 Ghost 則分開儲存。紀錄以賽道配置與規則集為範圍，因此不相容的行程不會取代目前的最佳成績；相容的舊版資料在可用時會被遷移。開啟 **History** 可篩選比賽、比較時間並檢視詳細資料。Daily 與挑戰模式的紀錄與 Career 成績分開。選用的 Google 登入會透過 Firebase 同步支援的進度；裝置設定則留在本機。結果畫面會說明完成的比賽是否已上傳到雲端，或在你未登入時提供登入。同步與儲存的細節請見 `docs/cloud-save.md`。

### Ghost、每日挑戰、獎牌與 Garage

- **Ghost**：每次行程都會在整場比賽中取樣車輛的距離、車道位置與高度。在某賽道創下新的個人最佳時會儲存該行程，之後在該賽道的比賽會以半透明藍色車輛顯示它。預設為關閉；請在 Controls 中開啟 **Show best-run ghost**。
- **每日挑戰**：History 會顯示今天的賽道與修飾條件，依本機日期挑選：禁止飛行、車流增加，或僅限金色光環。Canyon 絕不會出現禁止飛行，因為它的斷橋需要飛行。每日行程只會進入各自專屬的今日最快成績榜；絕不會影響歷史、最佳時間、解鎖、星星或 Ghost。Restart 會保留挑戰，而 **Choose track** 則會離開它。
- **獎牌**：First victory（獲勝）、Clean run（無碰撞）、Perfect flight（單場比賽獲得足夠次數的 PERFECT LINE）與 Triple burst（足夠多次延長 NITRO 爆發）。只有符合資格的 Classic Race 完賽才能獲得；每枚獎牌都會保留首次獲得的日期。
- **Garage**：每條 Career 賽道上獲得的最佳風格星星會累加，用於解鎖塗裝。Garage 會顯示每款塗裝的條件，並讓你預覽尚未解鎖的選項。塗裝只改變外觀，不改變車輛數值。

### Sky Spiral

Sky Spiral 在賽博龐克天際線上方加入真正的 3D 上升螺旋道路。沿著發光的中央塔樓繞行完整的一圈水平旋轉，然後從專用坡道跳過高架間隙。現有的 FLY、BOOST 與 NITRO 都能在這條新賽道上使用，並提供可選的飛行修正。這條賽道使用獨立的曲面道路算繪器與專屬的 3D 路徑對應器；目前仍在實體手機硬體上驗證中。

### 賽道與風格

從 Coast 開始，在符合資格的 Classic 比賽中登上頒獎台，即可解鎖後續的 Career 賽道。選擇器會顯示可用狀態與解鎖條件。開始前先選擇賽道，或左右滑動 3D 預覽（用滑鼠拖曳，或在觸控板上用兩指橫向滑動），像輪播一樣翻到相鄰的賽道：它會跟著手指移動，輕輕一撥就夠，第一條與最後一條賽道會有橡皮筋回彈效果，並有一個標籤顯示賽道名稱與分頁圓點；鍵盤使用者可用左／右鍵在賽道按鈕間移動，並以 Enter 選擇。Restart 會保留所選賽道；結果畫面上的 **Choose track** 會回到選單。若有可用的賽道，**Next** 會開始下一條已解鎖的 Career 賽道。Career 進度完成後，以及在每日挑戰中，它會被隱藏。如果瀏覽器中斷了 WebGL 連線（在 iPhone 鎖定螢幕或切換 App 後很常見），圖形恢復時遊戲會清除警告；否則 **Start** 或 **Race again** 會重新載入頁面。每條賽道都有自己的天空、色盤與程序式景物：下雨的霓虹街道與低矮隧道、紅色沙漠懸崖與橋梁間隙／側風，或有極光與冰的雪山。警告標誌會標示特殊路段。Aurora 的上坡路段補充地面燃料的速度較慢。

### World Tour 賽道、路線地圖與賽道名稱

World Tour 的賽道共用一個曲面道路算繪器（`src/world-tour-scene.js`），各賽道有自己的色盤、建築與地標（總統府與北門的輪廓、霓虹路口與塔樓、鐵路高架橋與山峰、燈塔與跨海大橋、環狀行星）。在主畫面選擇 World Tour 賽道時，會在懸浮的車輛後方框出其代表性地標：總統府、東京鐵塔、阿爾卑斯山峰、燈塔或宇宙之門。朝它競速時，路邊會讓該地標保持清晰可見。每張賽道卡片都會顯示完整的主要路線，比賽中則有即時地圖在其上標示玩家與 AI 對手；空中捷徑絕不會被繪出。在較短的螢幕與窄版手機上，即時地圖會讓位，排行榜仍會對賽車手排名。賽道名稱會跟隨以 **EN / 繁體中文** 切換開關所選的語言（請見下方的 Language）。

風格分數獎勵近距離超車、光環、完整光環群組、移動中的滯空時間與乾淨的駕駛距離。漂移與風險機會會提高獎勵，而接觸與掉進間隙會中斷乾淨距離的進度。符合資格的 Classic 結果會依相對於賽道長度的分數授予風格星星，與完賽名次無關。

燃料與 nitro 量條會平順地趨向新數值、在電量偏低時發出警示、在補充時閃爍光澤，並在 nitro 儲量完成時脈動。Comfort mode 與系統的減少動態效果會停用這些動畫。滑動板在按住時會顯示浮動的環與旋鈕，並在比賽開始時顯示一則簡短提示；放開後轉向會回到中立。

HUD 使用共通的動態時序。速度計指針會隨速度緩動；名次變動時，名次數字會翻轉並帶有綠色上升或紅色下降的箭頭，排行榜的列會滑入新的位置。簡潔的半透明事件提示位於視野中央上方，避開 HUD 面板，並將險些擦撞、PERFECT LINE、NITRO 爆發、電量增加與漂移火花階段排入佇列而不重疊；同時補充飛行電量的 NITRO 獎勵會在其提示中點名。越過有限賽道的一半時，會跳出顯示剩餘距離的 HALFWAY 提示與上升的鈴聲。右上角的即時路線地圖（手機橫向時也有）就是進度讀數：已行駛的道路會變成橘色，其下方的說明文字會顯示距離；Endless 只保留距離說明。暫停、完賽與重新開始都會清除佇列。按鈕在按下時會變暗而不改變大小，因此在邊框以內任何位置按下都能生效；按住的觸控按鈕會保持亮起。VFX 設定中選用的 **Haptic feedback** 會在支援的觸控裝置上為接觸、NITRO 與漂移獎勵提供震動回饋。Comfort mode 與系統的減少動態效果會保留文字與按下狀態的顏色，同時移除新增的動態與震動。

### Language

整個介面提供英文與繁體中文（繁體中文）：開始畫面、Garage、History、HUD、比賽提示、結果、路線地圖、設定與 3D 路標。開始畫面賽道卡片下方的一個 **EN / 繁體中文** 開關即可一次切換全部，無須重新載入。語言依下列順序決定：

1. 你點擊開關所儲存的選擇（`skyline-rush-locale`；僅在點擊時寫入，絕不會由自動偵測寫入）；
2. 你的系統語言順序（`navigator.languages`）：第一個 `en*` 或 `zh*` 項目決定結果，其他語言會被略過（`['ja-JP', 'zh-TW']` 會選擇繁體中文），任何 `zh*` 標籤（zh-TW、zh-HK、zh-Hant、zh-CN、zh-Hans、單純的 zh）都會選擇繁體中文，而清單為空或缺失時會退回到 `navigator.language`；
3. 否則為英文。

品牌與遊戲術語在兩種語言中都維持英文：Skyline Rush、NITRO、FLY、BOOST 與對手名稱。字串位於 `src/locales/`；`src/i18n.ts` 負責偵測、`t()` 與目前的語言。

在地化圖片：`node scripts/capture-og-images.mjs` 會在 Chrome 中驅動真實的應用程式，並儲存 `public/og-image.en.jpeg` 與 `public/og-image.zh-TW.jpeg`（1440×900 的開始畫面），以及供繁體中文 README 使用的 `artifacts/{readme-start,readme-hero,mobile-flight,race-results}.zh-TW.jpeg`（`node scripts/capture-og-images.mjs og` 或 `readme` 只執行其中一半）。英文的 `artifacts/` 截圖絕不會被它動到。`public/manifest.webmanifest` 與 App 圖示維持不變：圖示不含文字，而且 web app manifest 只有一個名稱與描述，沒有各語言的變體，因此再加第二個 manifest 會破壞可安裝性。

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

瀏覽器測試使用已安裝的 Google Chrome，並允許 SwiftShader 進行無頭算繪。僅有 CPU 的 CI 使用 0.25 的裝置像素比，以維持 3D 場景的流暢，同時保留相同的 CSS 視窗大小與遊戲斷言；本機測試則以完整解析度算繪。一般遊玩使用瀏覽器可用的 GPU。英文 README 的截圖僅在檔案不存在，或使用 `UPDATE_ARTIFACTS=1 npm run test:browser` 時，才會以 JPEG（品質 70）寫入 `artifacts/`，因為即時的 3D 場景每次執行都不同；測試追蹤／結果會被忽略。完整的衝刺測試在快速的機器上大約需要一分鐘，軟體算繪拖慢模擬時則更久。

```sh
npm run preview         # Serve the production build after npm run build
```

若要在手機上檢查，請在你的網路上提供建置結果（`npx vite preview --host 0.0.0.0`），並以 `?perf` 開啟（例如 `http://<computer-ip>:4173/?perf`）。頂端會出現一條顯示最近 20 秒賽車影格時間的列：中位數（p50）、第 95 百分位（p95）、平均 fps 與取樣長度。沒有 `?perf` 時，不會量測也不會顯示任何東西。

```sh
make perf BASE=main         # A/B in Chrome at 412×915, CPU throttled 6× (RATE=20 for a low-end phone), 3 alternating rounds
make perf BASE=main VIEWPORT=desktop  # The same A/B at 1440×900 desktop size
make perf-phone             # Like make phone: asks base version, Tailscale/Wi-Fi and Telegram; logs phone temperatures
```

`make perf` 會建置此 checkout，若有 `BASE=<git ref>` 則也會建置該 ref（在 `.claude/worktrees/perf-<sha>` 中，下次重複使用），每次執行在 Coast 競速 24 秒，並印出每次執行的列，以及各建置版本的中位數。`make perf-phone` 對於未傳入的項目（`BASE=`、`VIA=tailscale|wifi|auto`、`TG=0`）會像 `make phone` 一樣詢問，為每個建置版本印出並傳送一個 `?perf` 網址到 Telegram，在以 USB 連接的任何 Android 手機上以 Chrome 開啟第一個網址（`adb reverse`，因此任何網路皆可），在按下 Ctrl+C 時傳送網址已失效的通知，並每 10 秒記錄手機的感測器溫度與降頻等級（`dumpsys thermalservice`），以及 Mac 的熱警告等級，直到按下 Ctrl+C。僅在相同的降頻等級下比較各次執行：發熱的手機無論建置版本為何都會降頻並掉格。iPhone 不會回報溫度。

## 部署

請在 [https://weskao.github.io/skyline-rush/](https://weskao.github.io/skyline-rush/) 遊玩。網站為公開：訪客不需要 GitHub 帳號或 Tailscale，開發者的電腦也可以離線。

```sh
git tag v0.4.0 && git push origin v0.4.0   # Release: deploys once CI confirms the commit already passed on main
make deploy                              # Deploy remote main manually through the same CI flow
# The on-screen version (ready screen, desktop and mobile) is `package.json`'s version; `/release` bumps it
# after scripts/release-gate.sh has seen a green CI run for the commit on main.
```

CI（`.github/workflows/ci.yml`）會在推送到 `main`、`develop`、pull request、版本標籤推送（`v*`）與手動執行時，建置並執行單元測試與 Chrome 瀏覽器測試。瀏覽器與 World Tour 長時間執行測試以平行分片方式執行，依 `tests/ci-durations.json` 中量測到的各測試時長來平衡（`scripts/ci-shards.mjs`），且只在 `main` 與 `develop` 上執行（其他分支只執行單元與雲端存檔檢查，除非提交訊息含有 `[full-regression]` 或手動執行要求），而對同一分支的較新推送會取消它所取代的執行。CI 會對失敗的瀏覽器測試重試一次；僅在重試時才通過的測試仍會在該次執行上被標註，並視為需要修正的 bug（`.claude/rules/browser-test-stability.md`）。在任何分支上，若推送或 pull request 只更動 `src/`、`public/`、`tests/`、`scripts/` 與 `.github/` 之外的 Markdown、文字、圖片、影片或 `Makefile`，且其父提交已在該分支通過 CI，則會略過所有測試套件（`scripts/ci-changes.mjs`）。手動執行會在所有檢查通過後發布；版本標籤推送會重新執行單元測試，確認（`release-verified`）被標記的程式碼已在 `main` 通過完整測試套件而非重新執行瀏覽器套件，接著發布並驗證公開網站。若標記的提交在 `main` 上從未通過 CI，則不會部署。一般的分支推送與 pull request 只會執行檢查。推送到 `main` 時，若其任一合併提交所合併的來源不是 `develop` 或 `hotfix/*`，`main-merge-source` 任務也會失敗（`scripts/check-main-merges.sh`），且該紅燈執行會阻擋發布。Pages 的建置使用 `--base=/skyline-rush/`，使腳本、樣式與字型從專案網址載入。GitHub Pages 必須以 **GitHub Actions** 作為發布來源。手動部署需要已驗證的 GitHub CLI（`gh auth login`）；請先推送你的提交，因為 `make deploy` 使用遠端的 `main`。部署不再依賴本機的 pre-push hook 或 Netlify 登入。當推送、標籤或手動執行時任何檢查或部署失敗，`notify-telegram` 任務會把失敗執行的連結傳送到 Telegram；它需要儲存庫密鑰 `TELEGRAM_BOT_TOKEN` 與 `TELEGRAM_CHAT_ID`（各以 `gh secret set <NAME>` 設定，它會提示輸入值），缺少時會安靜地略過。

連結預覽圖片是 `public/og-image.jpeg`，為 `public/og-image.en.jpeg` 的副本；`node scripts/capture-og-images.mjs og` 會擷取兩種語言的封面並更新該副本。爬蟲無法切換語言，因此 `index.html` 只引用英文封面（附 `og:locale` `en_US` 與 `og:locale:alternate` `zh_TW`），而 `public/og-image.zh-TW.jpeg` 是供直接連結使用的中文對應版。更換封面後，請提高 `index.html` 中 `og:image` 的 `?v=`，讓社群網站抓取新的圖片。

## 專案結構

- `src/game.js`：確定性的街機模擬、對手、車流與完賽順序。
- `src/input.ts`：鍵盤與多指標控制，含取消與失焦清理；讀取已儲存的按鍵對應。
- `src/key-map.ts`：純粹的按鍵對應，含 E / X NITRO、衝突互換的重新對應、驗證與儲存。
- `src/history.ts`：已儲存的遊戲資料：近期比賽歷史、各賽道最佳成績與舊版遷移、Career 統計、獎牌、星星、已裝備的塗裝、Ghost 與每日榜。
- `src/ghost.ts`：取樣式 Ghost 錄製、各賽道驗證與內插播放。
- `src/appearance.ts`：塗裝目錄與星星解鎖門檻。
- `src/rng.ts`：以種子產生的隨機串流；拾取物與光環來自每場比賽的配置種子（測試與工具中為賽道種子）。
- `src/world.js`、`src/geometry.ts`：Three.js 算繪器、程序式車輛、公路、天際線、飛行特效與鏡頭。
- `src/effects.js`：有限的 GPU 粒子池，用於蒸氣、火花與降落塵土。
- `src/track-paths.ts`、`src/world-tour-scene.js`：每條賽道一個距離到道路的對應，以及共用的 World Tour 道路、景物與地標。
- `src/route-map.ts`、`src/i18n.ts`：SVG 完整路線與即時賽車手地圖；語言偵測、已儲存的選擇、`t()` 以及英文／繁體中文的賽道名稱；`src/locales/` 存放語言目錄。
- `scripts/capture-og-images.mjs`：從真實應用程式擷取英文與 zh-TW 的封面圖片與 zh-TW README 截圖。
- `scripts/pickup-economy.mjs`：以腳本控制的機器人駕駛每條賽道，並印出每分鐘 NITRO、BOOST 占比、燃料耗盡次數與第一次 NITRO 的時間；`tests/pickup-economy.test.js` 鎖定光環／拾取物的配置。
- `scripts/ring-variety.mjs`：在重新隨機產生的比賽種子上，印出每條賽道的光環車道分布、地面占比、每場比賽的列隊與排列數，以及機器人的光環取得數與 NITRO 率；`tests/ring-variety.test.js` 確保每個車道都被使用，同時不讓光環更難收集。
- `scripts/rival-balance.mjs`：專家機器人（BOOST、為光環而飛行）與初學者機器人（兩者皆無）在各賽道與難度上對抗 AI 車隊；印出最快對手的差距與機器人的名次。
- `scripts/ci-shards.mjs`：`plan` 為每個 CI 分片提供其 Playwright `--test-list`，依時長打包測試，使每個分片大約同時完成；`refresh <run-id>` 在測試套件大幅變動後，依 CI 執行的記錄重寫 `tests/ci-durations.json`。
- `src/App.vue`、`src/icons.ts`：Vue 3 的 UI 外殼（開始畫面、HUD、面板、觸控操作）及其共用的 SVG 圖示；共用面板使用 Vue 元件，而賽中 HUD 由遊戲迴圈直接更新。
- `src/main.js`、`src/style.css`：掛載 `App.vue`、串接各畫面控制器，並執行比賽生命週期（開始、暫停、重新開始、結果）與影格迴圈。
- `src/*-ui.ts`：每個畫面區域各有一個 TypeScript 控制器（賽事選擇、雲端存檔、觸控操作、按鍵對應、VFX、音訊、歷史對話框、拍照模式）。
- `src/race-hud.ts`、`src/race-hud-modes.ts`：賽中 HUD，每次 HUD tick 以命令式方式寫入。
- `src/race-results.ts`、`src/result-screen.ts`、`src/session-progress.ts`：記錄完成的比賽（最佳成績、解鎖、獎牌、Ghost）並顯示其結果畫面。
- `vite.config.js`：搭配 `@vitejs/plugin-vue` 的 Vite。
- `src/perf.ts`：用於 `?perf` 裝置檢查讀數的影格時間百分位數。
- `src/audio.js`：合成的音效與循環播放的音樂定序器；歌曲位於 `src/music-tracks.ts`，比賽到音效的事件位於 `src/race-audio-events.ts`。
- `src/audio-settings.ts`：從 `localStorage` 讀取已儲存的音樂／音效開關與音量，以及滑桿的靜音保留音量規則。
- `tests/`：單元與瀏覽器行為測試。`tests/module-size.test.js` 讓每個原始碼模組維持在 400 行以內（較舊的大型檔案有只會降低的上限）。
- `docs/design.md`、`docs/verification.md`：範圍與驗證證據。
- `README.zh-TW.md`：本檔案的繁體中文翻譯，由 `scripts/readme-zh.mjs` 保持最新（`check`、以 `claude -p` 翻譯的 `sync`，以及手動編輯後的 `stamp`）。`.githooks/pre-commit` hook 會在提交更動 README.md 時重新產生它（以 `SKIP_README_ZH=1` 略過一次），而 `.githooks/pre-push` 會在被推送的提交更動 `src/`、`tests/`、`scripts/` 或 `package.json` 時執行 `npm test`，接著在涉及主畫面（`index.html`、`src/App.vue`、`src/main.js`、`src/style.css`、`src/locales/`）時執行 `npm run test:layout`（以 `SKIP_LAYOUT_GATE=1` 略過一次），而 `.githooks/main-merge-guard`（由 `pre-merge-commit` 與 `pre-commit` 執行）會拒絕把 `develop` 或 `hotfix/*` 以外的任何分支合併進 `main`（fast-forward 不會執行任何 hook，因此請使用 `--no-ff`；以 `ALLOW_MAIN_MERGE=1` 略過一次）；`make` 會以 `git config core.hooksPath .githooks` 啟用這些 hook。`.claude/settings.json` 中的 Claude Code Stop hook 會在某一回合編輯了 README.md 卻沒有更新它時，讓 Claude 回頭更新。

所有車輛／景物的幾何與特效皆以程式碼產生。Barlow Condensed 依 SIL Open Font License 內建於 `public/fonts/OFL.txt`。Three.js、Vue、Vite 與 Playwright 保留各自的套件授權。

來源：[weskao/skyline-rush](https://github.com/weskao/skyline-rush)。跨多條賽道的單人街機物理賽車。瀏覽器驗證涵蓋桌機 Chrome 與模擬的手機視窗；iOS Safari 已在 iOS Simulator 中檢查（直向與橫向，Coast 與 Neon），但實體手機上的影格率尚未量測（請使用 `?perf`，見「驗證」）。
