<!-- source-sha256: b1967b542d9ce6ec64acce9dc0ab3e1e8a79c032778cf1408697663b1cc5848c generated from README.md by scripts/readme-zh.mjs; edit README.md, then run the script -->
# Skyline Rush

[English](README.md) · **繁體中文**

[**Play Skyline Rush →**](https://weskao.github.io/skyline-rush/)

這是一款瀏覽器 3D 街機賽車遊戲，主角是一輛會飛的電動跑車，以 Tesla Roadster 2 及其火箭推進器概念為藍本。你可以在多樣的賽道上與 AI 對手競速、飛越車流、管理推進器電量，並善用駕駛獎勵持續前進。操控手感為虛構的街機物理；本作為非官方粉絲專案，與 Tesla 或 SpaceX 無任何關聯。

## 遊戲介紹

在 Classic Race 中，Skyline Rush 是可反覆挑戰的街機衝刺：一名玩家對上多位 AI 對手與路上車流，桌機或手機皆可遊玩，無需安裝。其他模式提供單人駕駛、自訂規則、圈速競賽與多階段挑戰。

- **先開車，再飛行。** 累積速度後按住 FLY 即可升空，飛越車流、穿過光環、跨越斷橋。飛行與 BOOST 共用推進器電量；地面行駛、無動力滑翔與獎勵都能幫助補充電量。
- **靠好表現賺取 NITRO。** 近距離超車、飄移、光環組（PERFECT LINE）、尾流、成功落地的桶滾與拾取物，會填滿獨立的 NITRO 儲量；啟動一次爆發，或連按以延長時間。
- **探索並解鎖賽道。** 在海岸公路、霓虹街道、峽谷、冰封山路、高架螺旋與 World Tour 目的地競速。各賽道有獨特的景色與障礙，點對點路線還有空中捷徑。選擇畫面會區分可遊玩的賽道與 Coming Soon 預覽。
- **有目標可追。** 符合資格的 Classic 完賽可獲得風格星數，用於解鎖 Garage 塗裝。最佳成績 Ghost、每日挑戰、獎牌與各模式專屬紀錄，都讓你有理由再跑一次。

比賽長度依賽道與模式而定。音效由瀏覽器合成，進度儲存在本機。可選擇使用 Google 登入以啟用雲端存檔同步；遊玩並不需要帳號。

https://github.com/user-attachments/assets/e0ddb94c-794e-49ab-9b66-51cb5150f101

<p align="center"><img src="artifacts/readme-tracks.jpeg?v=2" width="70%" alt="飛行中的賽道選集：Neon Downtown、Aurora Pass、Sky Spiral 與 Tokyo Afterdark"></p>

<p align="center"><img src="artifacts/readme-start.zh-TW.jpeg?v=2" width="49%" alt="含遊戲模式、賽道與 Start race 的開始畫面"> <img src="artifacts/race-results.zh-TW.jpeg?v=2" width="49%" alt="顯示新個人最佳成績的比賽結果"></p>

### 用手機遊玩

直向或橫向皆支援觸控操作；AUTO 會持續按住油門。[觀看 MP4](artifacts/mobile-demo.mp4)

<p align="center"><img src="artifacts/mobile-home.jpeg?v=2" height="300" alt="手機直向開始畫面與賽道選擇"> <img src="artifacts/mobile-landscape-flight.jpeg?v=2" height="300" alt="手機橫向飛行畫面，按住 FLY 並顯示觸控按鈕"></p>

於全新設定檔的 Chrome 行動裝置模擬（390×844 與 844×390）中擷取；並非實體手機的效能量測。

## 遊戲模式與重玩價值

> 本 README 描述的是目前的原始碼版本。已部署的 GitHub Pages 版本遵循發佈流程，可能與開發版本不同。Coming Soon 預覽並不代表賽道已可遊玩。

選擇一條**已解鎖的賽道**，在賽道卡片下方選擇 **GAME MODE**，需要時展開規則說明，然後按下 **Start race**（或 Enter）。比賽仍使用相同的 Three.js 道路、飛行、FLY / BOOST / NITRO 與響應式觸控操作。可用模式包括：

| 模式 | 差異 | 勝利條件／進度 |
| --- | --- | --- |
| **Classic Race** | 與 AI 對手進行點對點競速，含車流、捷徑、光環與 NITRO。 | 登上頒獎台可解鎖下一條 Career 賽道；符合資格的 Classic 完賽可獲得 Career 星數、獎牌與官方最佳成績。 |
| **Custom Race** | 設定對手數量（含單人）、AI 難度、車流、拾取物與碰撞懲罰，或從預設組合開始。 | 非排名成績有獨立的歷史紀錄。可選的衝刺階段會重跑點對點路線並比較總時間；它們不是環形賽道的圈數。 |
| **Free Drive** | 獨自探索任何已解鎖的賽道，可調整路上車流與拾取物，無名次、不強制勝利。 | 自由駕駛、飄移與飛行直到道路盡頭；抵達終點即以結果畫面結束本次行程，不儲存任何紀錄。這**不是**無限世界模式。 |
| **Time Attack** | 單人計時衝刺，附相容的最佳成績 Ghost 與領先／落後分段。可選 **Clean Time Trial** 開關。 | 依賽道與規則分別記錄最佳時間；Clean 行程中只要發生任何碰撞即失效，不會取代個人最佳。 |
| **Obstacle Run** | 以種子產生的路邊路障；密度分 **Standard** 或 **Extreme**。部分障礙會左右橫移；警示 HUD 會預告接近的危險。 | 閃避障礙、以乾淨的通過賺取風格點數，並使用一般路線的終點。障礙物配置與碰撞共用確定性邏輯；Classic 不受影響。 |
| **Checkpoint Rush** | 穿越發光的拱門，補充倒數時間，並以乾淨通過賺取風格點數。 | 在時間用盡前抵達每一道拱門與終點。漏掉拱門或超時不會儲存有效的最佳成績；HUD 會顯示進度、剩餘時間與下一個目標。 |
| **Championship Cup** | 以已解鎖的路線組成多賽道 Cup，並在各階段與 AI 車隊競賽。 | 名次累計積分；總時間用於決定同分排名。Cup 成績與 Career 解鎖各自獨立。 |
| **Stunt Attack** | 連續多場的限時風格賽：飄移、空中特技、擦身而過與光環累積連擊分數。 | 計時結束即結束本場；本機獎牌與最佳分數依時長分別記錄。 |
| **Elimination** | 每隔一段時間，名次墊底的仍在場駕駛會被淘汰。 | 撐到最後一位駕駛即獲勝；提前被淘汰則結束行程，不給獎勵。 |

### Cup 復原

未完成的 Championship Cup 會在首頁提供 **Resume** 或 **Discard**。Resume 會保留已結算的階段積分，只重新開始尚未完成的階段；重試只會回滾正在重跑的階段。完成或放棄 Cup 後，其復原紀錄即被清除。刪除遊戲進度也會移除檢查點，同時保留裝置偏好設定。復原使用此瀏覽器的儲存空間，無法還原瀏覽器拒絕儲存的資料。

### 自訂呈現與 Ghost

Custom Race 可針對每個衝刺賽段重播最快的相容 Ghost。Custom 與 Free Drive 提供 Track / Day / Dusk / Night / Rain / Fog 呈現預設與即時規則摘要。這些外觀選項不會改變紀錄資格或規則集身分。重試會保留所選外觀；更換賽道或回到 Classic 時會還原賽道外觀。Photo Studio 關閉時會還原目前比賽的外觀。

### 可選道具與獎勵拱門

Custom 與 Free Drive 提供 **Off / Classic Mystery Rings / Active Items / All Items**。持有的道具佔用單一欄位：按 **Q** 或點擊 **USE** 啟動，然後等待冷卻。NITRO 與 FLY/BOOST 維持各自的操作。All Items 另加入有上限的速度、空中電量與一次性碰撞復原拱門；EMP 會短暫減慢附近對手，單人遊玩時轉為 Magnet。復原不會影響官方碰撞次數。Stunt Attack 與 Checkpoint Rush 可另外選擇啟用暫時、不可疊加的 ×2 分數拱門。Classic 的預設值維持不變。

### Event Lab Lite v1

**Event Lab Lite** 可在已解鎖路線上，以路障、NITRO 光環與補給編輯本機賽道範本。可變更它們的車道與距離、復原／重做／重設編輯，並以文字匯入或匯出經驗證的賽道。開始時會將賽道編譯為真正的比賽事件；重試會保留賽道與種子。賽道成績與 Career、Custom 紀錄各自獨立。錐桶、自訂坡道、檢查點編輯與社群分享不在此第一版範圍內。

### Endless Highway

**Endless Highway** 將選定的可遊玩賽道變成超越其既定終點的距離生存活動。車流難度會上升至上限；達到碰撞上限即結束本次挑戰。最長距離紀錄與 Career 和 Ghost 分開。暫停與 WebGL 復原會保留行程，附近的景物與事件則使用有上限的物件池。

### Circuit Race

**Circuit Race** 使用 Harbor Circuit，這是一條獨立的封閉環形賽道，可選擇圈數。依序通過每個區段即可完成一圈；倒退通過、傳送與復原都不能獲得圈數。HUD 與結果畫面顯示分段時間、上一圈、個人最佳圈速與總時間。圈速最佳紀錄不會因 History 滾動淘汰而消失；總時間與 Ghost 則專屬於該圈數設定。點對點賽道維持其地理形貌與 Career 進度。

### 賽道主題、障礙與風險路線

- **賽道主題**（在 Custom、Free Drive 與 Obstacle Run 中可選用）讓每條路線都有自己的障礙：Coast 的貨物與陣風、Neon 的道路施工、Canyon 的落石、Aurora 的雪堆、冰面與暴風雪、Sky Spiral 的能量拱門、Taipei 的節慶路障、Tokyo 的號誌拱門、Alpine 的雪崩、Coastal 的浪花，以及 Cosmic 的能量牆。障礙會提前警示、永遠保留兩條車道暢通，且絕不改變 Classic。
- **Obstacle Run** 提供 **Mixed obstacles** 賽道：橫掃的拱門、墜落的碎片，以及路障上方的圓環，獎勵飛越或繞行的玩家。
- **風險路線**：高風險光環與近距離超車在 Custom Hard 中給予更多獎勵，也可關閉以進行輕鬆練習。
- 道路新增了不具實體的路邊生態：觀眾、廣告看板、服務車、鐵路月台、行駛中的列車、船隻與無人機。較低的畫質設定會繪製較少這類內容。

### 比賽設定、結果與無障礙

- 模式與賽道的選擇仍可透過鍵盤與觸控操作；情境面板只顯示與所選模式相關的選項。無法使用的 Cup 會說明尚需多少條賽道。
- HUD 會依模式調整：單人活動會隱藏容易誤導的對手名次；多階段與 Cup 賽事顯示階段進度；Checkpoint Rush 顯示即時拱門倒數；Obstacle Run 警示即將到來的路障；Clean Time Trial 會明確標示行程已失效。
- Practice、Custom、Time Attack、Obstacle、Checkpoint 與 Cup 的結果使用獨立的 `skyline-rush-mode-history-v1` 紀錄鍵。符合資格的練習 Ghost 有各自儲存的規則集；Classic 的解鎖、星數、獎牌、Daily 紀錄與官方時間不受練習行程影響。
- 在 **History → Challenge records** 中，可依模式篩選，查看每個確切賽道／規則集的個人最佳，以及符合資格的 Time Attack Ghost。即使較舊行程被輪替移除淘汰，終身最佳仍會保留，儲存於 `skyline-rush-mode-bests-v1`。Challenge 紀錄明確不屬於 Career 獎牌或星數。
- 模式標籤、結果說明、設定選項與危險警示皆支援英文與繁體中文。低畫質圖形、觸控操作與減少動態效果仍屬驗證計畫的一部分。

### 真實遊戲截圖與驗證

用來檢視這些模式的截圖，都是**從執行中的瀏覽器遊戲**擷取，並非概念圖。[下載實際的 Playwright 擷取圖組](https://github.com/weskao/skyline-rush/actions/runs/39742666980/artifacts/12410172411)（Custom 單人、Free Drive、Time Attack、Obstacle Run、Extreme 障礙、Checkpoint Rush 與手機模式選單）。GitHub Actions 的成品可能需要登入且會過期；若要在本機重新產生，請執行 `npx playwright test tests/race-modes-browser.spec.js`，然後開啟 `test-results/race-mode-*.png`。CI 截圖為軟體算圖且解析度較低，不代表最終裝置的畫質。

**驗證：**每項功能的測試與完整關卡驗收紀錄都列在 `TODO.md`。實體 iPhone 與 Android 的檢查仍待進行。

## 在本機執行

需要 Node.js 22.12 或更新版本，以及支援 WebGL 2 並啟用硬體加速的瀏覽器。

```sh
cd skyline-rush   # From the directory containing your clone
make         # Installs dependencies on first run, then starts the Vite + Vue dev server
```

開啟 Vite 印出的本機網址（通常是 http://127.0.0.1:5173）。資源與字型皆內建於本機。核心遊戲不需要帳號；可選的雲端存檔登入與同步使用 Firebase 服務。

`make` 與 `make dev-unlocked` 也會啟動本機 Firebase Auth/Firestore 模擬器（需要 Java 21+），因此雲端存檔的 Google 登入可搭配假的測試帳號運作，絕不會碰到真實存檔。雲端存檔操作與專案擁有者的 Spark 配額檢查請見 `docs/cloud-save.md`。

`make dev-diag` 與 `make phone-diag` 提供相同的建置，並編入螢幕上的診斷橫幅（影格計數、頁面生命週期與觸控事件及其點擊目標，以及跨重新載入保留的最後幾個未捕獲錯誤），用於在真實手機上追查當機或按鈕失效的問題。正式建置絕不包含它：`npm run build` 會拒絕帶有診斷模組的封裝。

`make phone` 會開啟終端機選單，用於啟動、檢查或停止可供手機開啟的開發伺服器（透過 Tailscale 或同一個 Wi-Fi），並在伺服器回應後印出手機網址。選單列出此工作副本、其他 worktree 與近期分支，也可輸入分支名稱；`make phone <name>` 會直接前往該分支（或 `feature/<name>`），必要時在 `.claude/worktrees/` 下建立其 worktree，`make phone off` 會停止它啟動的所有伺服器（如同 `/phone-dev off`），而 `y=1`（例如 `make phone y=1 <name>`）會略過選單：每個問題都採用其 Recommended 選項，並印出每項選擇。當某個連接埠已被本專案先前的伺服器（任何 worktree）佔用時，重用該連接埠即為 Recommended 的答案：舊伺服器會被停止，網址保持不變；`make dev`、`make dev-diag`、`make dev-unlocked`（5173）與 `make dev-feature`（5443）也會不經詢問地這麼做，並且不會動到其他專案的伺服器。它提供一般鎖定版建置；`make phone-unlocked [name]` 是相同的選單，但所有賽道與塗裝皆已解鎖，也是手機唯一可連線的全解鎖伺服器（`make dev-unlocked` 與 `make dev-feature` 僅限桌機）。除非某個 id 已加入 `src/upcoming-tracks.ts` 的 `PLAYABLE_PREVIEW_IDS`（且僅在其真實比賽執行階段已進入 `RACE_TRACKS` 之後），否則 Coming Soon 卡片在所有建置中都只是預覽；`make dev-unlocked` 與 `make phone-unlocked` 屆時會讓該卡片可開始遊玩，正式版則絕不會。它需要個人的 `phone-dev` Claude Code skill（`/phone-dev` 會詢問相同的選單），且不啟動模擬器，因此手機上的雲端存檔登入使用的是真實專案。

## 操作方式

| 動作 | 鍵盤 |
| --- | --- |
| 加速 | W / ↑ |
| 煞車 | S / ↓ |
| 轉向 | A / D 或 ← / → |
| 飛行 | 速度足夠後按住 Space |
| 降落 | 放開 Space |
| Boost | 按住 Shift；消耗推進器電量 |
| NITRO | E / X（一次滿電；NITRO 期間再按一次可延長）。WASD 玩家使用 E；方向鍵玩家左手維持在 Shift / X / Space |
| 飄移 | 高速時按住 S + A / D（僅限地面） |
| 開始 | Enter |
| 暫停／繼續 | Esc / P |
| 重新開始 | Backspace |
| 切換鏡頭 | C |
| 全部音訊靜音／取消靜音 | M |
| 自動油門開／關 | F2 / AUTO 按鈕 |
| AIRFLOW 展示開／關 | V / AIRFLOW 按鈕 |
| 在首頁切換賽道 | 左右滑動或拖曳 3D 預覽，或在觸控板上用雙指滑動 |

手機版面提供轉向、油門、煞車、boost、飛行與 NITRO 按鈕。觸控操作支援同時按住多個按鈕。AUTO 會持續按住油門，讓你專心轉向與飛行；煞車永遠優先於它。每個裝置預設為開啟；一旦你切換過，你的選擇會記錄在此瀏覽器中（`skyline-rush-auto`）。離開分頁會暫停比賽並清除按住中的輸入。在比賽中點擊 SKYLINE RUSH 標誌會暫停並先詢問：**Keep racing**、**End race**（回到賽道選擇，本次行程不儲存）或 **Back to home**（重新載入）；無論哪種，開始畫面都會重新開啟在剛跑過的賽道上，並捲動到賽道列的中央（第一條與最後一條賽道位於其兩端）。Esc 會讓比賽維持暫停。鏡頭與音效快捷鍵會保留按住中的駕駛操作。在觸控方面，拇指在轉向板上向下滑動會煞車，向下並向側邊滑動則會飄移；在 Buttons 模式下，較窄的煞車鈕位於轉向按鈕上方，避開拇指擱放的那一列，因此只有刻意才會按到；從 ← 或 → 向上滑入煞車鈕會同時保持轉向並煞車，因此單一拇指即可飄移，往回滑下則會放開煞車。觸控按鈕與螢幕角落保持距離，方便拇指操作，平板則會將它們上移並放大。

比賽前或暫停時開啟 **Controls**，可調整鍵盤轉向靈敏度或重新對應駕駛動作。選擇一個動作，然後按下按鍵；衝突的綁定會互換，固定快捷鍵保持保留，按 Escape 可取消擷取。Reset keyboard 會還原預設值。綁定立即生效，並儲存於 `localStorage['skyline-rush-keymap']`。手機與平板在按下實體（例如藍牙）按鍵之前會隱藏鍵盤區段；之後該鍵盤會被記錄在 `localStorage['skyline-rush-keyboard-seen']`。

同一面板也控制觸控轉向模式、慣用手、滑動靈敏度、大小、不透明度與按住／切換式 FLY。**Edit touch layout** 讓你在比賽預覽上拖曳動作與經典轉向按鈕；**Done editing** 會保留配置，**Reset touch layout** 則還原。位置會在重新載入後保留、隨慣用手鏡像，並在旋轉後維持在視窗範圍內。在較短的橫向螢幕上（高度低於 380 px，例如工具列顯示時的 iPhone Safari），開始畫面會省略標語，讓 START RACE 無需捲動，比賽 HUD 也會隱藏速度表與次要電量列，避免面板互相重疊。

所有音訊皆以 Web Audio 合成；無需下載任何音訊。音樂會隨目前的畫面、賽道與遊戲模式而變化，並為檢查點、危險、特技與最後衝刺等事件加入提示音。音效涵蓋選單、倒數、駕駛、飛行、boost、碰撞、降落與獎勵。暫停時駕駛音效會淡出；靜音音效會停止待播的提示音。

喇叭圖示會開啟音訊設定，內含 Music 列與 Sound effects 列，各有一個靜音開關與音量滑桿（如上方開始畫面截圖所示，已展開）。**Mute all**（或 M）會同時讓兩者靜音。靜音會保留各聲道的音量，因此取消靜音時會回到原本的音量；將滑桿拖到零，也會以同樣方式讓該聲道靜音。兩者預設皆為開啟、100%，各自的開／關選擇與音量都會記錄在 `localStorage`（`skyline-rush-music`、`skyline-rush-sound`，值為 `on`/`off`，另有存放百分比的 `-volume` 變體）；若未儲存任何值，兩個聲道皆為開啟，並會以 `on` 儲存。在較短的螢幕上，面板可捲動。在瀏覽器允許自動播放的情況下，頁面一載入就會開始播放片頭音樂。若不允許（首次造訪時的 Chrome 與大多數其他瀏覽器），則由第一次點按、點擊或按鍵啟動。在 iPhone 與 iPad 上，遊戲會要求媒體播放，因此靜音開關不會讓它靜音；這也會在遊戲進行時暫停其他 App 的音訊。

飛行面板顯示爬升、巡航、下降與觸地、剩餘推力秒數，以及下一個該使用的操作。青色光環標示空中走廊，且屬於遊戲機制：請見下方的 Rings。手機版也有按住式 boost 按鈕。橘色的碰撞回報會顯示撞擊類型與損失的速度；護欄現在會讓在地面的車輛反彈並減速。從上方飛越則可越過護欄。

場景包含泛光照明、夕陽水面、懸索橋、推進器蒸氣、碰撞火花與觸地漣漪。鏡頭運動與非必要的速度線會遵循你系統的減少動態效果偏好。音效為推力、碰撞與降落提供各自獨立的回饋。

**VFX**（右上角）可選擇 Realistic、Cinematic 或 Extreme 風格，Low / Medium / High 畫質（Low 會關閉泛光並繪製較少景物）、Comfort mode（無閃光、震動、殘影或模糊）與可選的觸覺回饋。其 **Race HUD** 區段可選擇 Immersive 或 Competitive（附排行榜、小地圖與次要數據開關），開啟或關閉 NITRO READY 音效與動畫，**Reset HUD to default** 則會還原它們。**Fine tuning** 將每個效果以滑桿呈現，**Reset visual settings** 會還原預設值。**AIRFLOW**（或 V）會將場景切換為空氣動力學展示：車身上的流線、遙測面板、Low drag 或 High downforce，以及駕駛、前方、後方、側面或環繞鏡頭。開始面板會讓位給展示畫面，只留下橘色的 **START RACE** 按鈕，固定在車子下方的底部中央；左右滑動場景即可更換賽道。第一次開啟 AIRFLOW 時，會有動畫指尖示範該手勢。流線只在 AIRFLOW 開啟時出現：關閉時，BOOST 與 NITRO 會顯示推進器噴流、尾跡與速度線，但沒有流線。

起跑燈號指示倒數與 GO。玩家駕駛一輛配有後置推進器、主動式尾翼與動態車輪的跑車。AI 對手有各自獨特的輪廓與燈光特徵，路上車流則使用通勤車輛。轉向會漸進加強，放開 boost 時車輛會逐漸減速。駕駛與工具列控制項提供符合觸控尺寸的點擊目標。

在地面高速近距離超越車流會累積獎勵連鎖並補充電量。碰撞會中斷連鎖；在空中、距離過遠或復原中的超車不會獲得獎勵。HUD 提示會回報超車與最後衝刺，結果畫面則摘要近距離超車與碰撞次數。

動力飛行會消耗推進器電量；歸零時，車輛會自動下降。放開 FLY 與 BOOST 即可滑翔並回復電量，或降落以更快充電。BOOST 從同一個儲量中扣除。對手與車流遵守共用的碰撞規則：它們會避開較慢的車輛與固態障礙，撞擊會使相關車輛減速並被推開。領先 AI 車隊即可獲勝；在瀏覽器儲存空間可用時，會儲存符合資格的個人最佳成績。

### 操控手感

轉向會平順建立，高速時橫向移動受到限制。FLY 會暫時緩衝提早的按壓，直到達到起飛速度。放開 FLY 會讓下降更柔和；同時放開 BOOST 時，滑翔會回復電量。耗盡的推進器在放開並經過足夠恢復後會再次可用。間隙警示協助判斷跨越所需的電量，專用坡道則可將車輛彈射起飛。輕微的護欄擦撞會保留連擊；較重的撞擊則計為碰撞。放開轉向時，AUTO 也會提供車道置中輔助。同時按住 FLY + BOOST 會啟動 AIR DASH，比各自獨立的推力更有效率地共用電量。

### NITRO 與飄移

NITRO 有獨立的儲量，在 HUD 中以電量區段顯示。拾取物、光環與駕駛獎勵會補充它；NITRO 獎勵也能恢復推進器電量，溢出的部分會轉換為電量。拾取物的配置會隨起跑格數量調整，且每場比賽都會重新隨機。滿電會啟動限時的速度與加速度增益；再按一次會延長爆發時間，但不會疊加其速度加成。NITRO 也會降低與車流碰撞時的速度損失。

在地面高速行駛時，煞車 + 轉向會開始飄移。持續飄移以累積獎勵階級，放開後即可獲得 NITRO 與小幅加速。煙霧、彩色火花、音效與 HUD 回饋會呈現累積過程。起飛、墜入間隙或碰撞都會失去累積的獎勵。

NITRO 不消耗推進器電量，可與 FLY 或 BOOST 同時運作；動力飛行與 BOOST 仍會消耗它們共用的儲量。

**空中特技**：飛行時快速往相反方向轉向即可開始桶滾。完成翻滾並平穩落地即可獲得 NITRO；過早落地、撞到障礙或落地太重都會取消獎勵。HUD、音效與可選的觸覺回饋會回報該特技。減少動態效果與 Comfortable VFX 會保留回饋，但不做旋轉。

**捷徑**：點對點賽道在邊線車道上方設有標示的空中走廊。維持飛行路線可在走廊內獲得更高的速度上限與免費飛行，沿途並有拾取物；BOOST 仍會消耗電量。塔柱仍是堅硬的障礙。半透明的橋面與 SHORTCUT / FLY HIGH 標誌標示此路線，HUD 會回報進入。

### Rings

光環的配置會隨起跑格數量與賽道調整，包含成組光環、直線列、全寬排列與風險光環；Endless 會隨距離增加持續產生新的事件。位置每場比賽都會重新隨機，同時遵守賽道的危險區域。穿過可見的開口即可收集光環。光環類型可補充電量或 NITRO、給予小幅加速、獎勵冒險，或施加暫時的神祕效果。收集過的光環會消失；完整清除一組會獲得 PERFECT LINE 與額外 NITRO。漏掉光環會中斷該組，但保留已收集的獎勵。

### 對手、尾流與最後衝刺

跟在對手或車流車輛後方可獲得暫時的速度上限提升與 NITRO；離開尾流後才能再次獲得。對手會依難度與駕駛狀況運用 BOOST 與 NITRO，而有上限的節奏調整讓車隊保持競爭力。符合資格的 Classic 與 Cup 比賽，在玩家大幅落後時，可能會在前方放置額外的復原補給。在最後衝刺期間，音樂與 HUD 回饋會強調附近的對手與距離差。

### 儲存的資料

進度與偏好設定儲存在瀏覽器中，並具備資料驗證與失敗處理，因此儲存空間被封鎖或資料格式錯誤時，仍可遊玩。History 保留近期比賽；相容的最佳時間、賽道解鎖、獎牌、星數、塗裝選擇與符合資格的 Ghost 則分開儲存。紀錄依賽道配置版本與規則區分，避免不相容的行程取代目前最佳成績；相容的舊資料會在可用時遷移。開啟 **History** 可篩選比賽、比較時間並查看詳細資料。每日挑戰與挑戰模式紀錄和生涯結果分開保存。可選的 Google 登入會透過 Firebase 同步支援的進度；裝置設定留在本機。同步與儲存細節見 `docs/cloud-save.md`。

### Ghost、每日挑戰、獎牌與 Garage

- **Ghost**：每次行程會以每秒 10 次的頻率取樣車輛的距離、車道位置與高度。在某條賽道上創下新的個人最佳時，會儲存該次行程，之後在該賽道的比賽中會以半透明的藍色車輛顯示。預設為關閉；請在 Controls 中以 **Show best-run ghost** 開啟。
- **每日挑戰**：History 會顯示今日的賽道與修飾條件，依本機日期挑選：禁止飛行、雙倍車流，或僅限金色光環。Canyon 不會出現禁止飛行，因為它的斷橋需要飛行。每日行程只會進入自己的榜單（今日最快的前五名）；絕不會影響歷史紀錄、最佳時間、解鎖、星數或 ghost。Restart 會保留該挑戰，**Choose track** 則會離開它。
- **獎牌**：First victory（獲勝）、Clean run（無碰撞）、Perfect flight（單場 5 次 PERFECT LINE）與 Triple burst（單次爆發中 3 次 NITRO 滿電：一次按壓加兩次延長）。只有符合資格的 Classic Race 完賽才能授予；每枚獎牌都記錄首次獲得的日期。
- **Garage**：每條 Career 賽道上獲得的最佳風格星數會累加以解鎖塗裝。Garage 會顯示每種塗裝的需求，並讓你預覽尚未解鎖的選項。塗裝只改變外觀，不改變車輛數值。

### Sky Spiral

Sky Spiral 在賽博龐克天際線之上，加入了真正的 3D 上升螺旋道路。繞著發光的中央塔樓完整行駛一圈水平迴旋，然後從專用坡道躍過高架間隙。現有的 FLY、BOOST 與 NITRO 在這條新賽道上皆可使用，並附有可選的飛行修正。此賽道使用獨立的彎曲道路渲染器與專屬的 3D 路徑對應器；仍在實體行動硬體上驗證中。

### 賽道與風格

從 Coast 開始，在符合資格的 Classic 比賽中登上頒獎台，即可解鎖後續的 Career 賽道。選擇畫面會顯示可用狀態與解鎖條件。開始前先選擇賽道，或左右滑動 3D 預覽（用滑鼠拖曳，或在觸控板上用雙指橫向滑動），像輪播一樣翻到相鄰的賽道：它會跟隨手指，輕輕一彈即可，第一條與最後一條賽道有橡皮筋回彈效果，並有標籤顯示賽道名稱與分頁圓點；鍵盤使用者可用 Left/Right 在賽道按鈕之間移動，並以 Enter 選定。Restart 會保留所選賽道；結果畫面上的 **Choose track** 會回到選單。在可用時，**Next** 會直接開始下一條已解鎖的 Career 賽道。生涯解鎖已完成或進行每日挑戰時，不會顯示此按鈕。若瀏覽器中斷 WebGL 連線（在 iPhone 鎖定螢幕或切換 App 後很常見），圖形恢復時遊戲會清除警告；否則 **Start** 或 **Race again** 會重新載入頁面。每條賽道都有自己的天空、配色與程序化生成的景物：雨中的霓虹街道與低矮隧道、紅色沙漠峭壁與橋梁間隙／側風，或帶有極光與冰面的雪山。警告標誌會標示特殊路段。Aurora 的上坡路段回復地面燃料較慢。

### World Tour 賽道、路線地圖與賽道名稱

World Tour 的各賽道共用一個彎曲道路渲染器（`src/world-tour-scene.js`），並各有自己的配色、建築與地標（總統府與北門的剪影、霓虹路口與一座塔、鐵路高架橋與山峰、一座燈塔與跨海大橋、帶環行星）。在首頁選擇 World Tour 賽道時，會將其代表性地標框在盤旋的車輛後方：總統府、東京鐵塔、一座阿爾卑斯山峰、一座燈塔或宇宙之門。朝它競速時，路邊會讓該地標保持清晰可見。每張賽道卡片都會顯示完整的主路線，比賽中則有即時地圖在其上標出玩家與 AI 對手；空中捷徑絕不會繪製。在高度低於 500px 的螢幕與高度低於 700px 的窄手機上，即時地圖會讓位，排行榜仍會為車手排名。賽道名稱會跟隨以 **EN / 繁體中文** 開關選擇的語言（見下方 Language）。

風格點數獎勵近距離超車、光環、完整光環組、移動中的滯空時間與乾淨的行駛距離。飄移與冒險機會會提高獎勵，而碰撞與墜入間隙會中斷乾淨距離的進度。符合資格的 Classic 結果會依相對於賽道長度的分數授予風格星數，與完賽名次無關。

燃料與 nitro 條會平順地趨近新值，在電量偏低時發出警告，補充時閃爍，並在 nitro 充滿時脈動。Comfort mode 與系統的減少動態效果會停用這些動畫。滑動板在按住時會顯示浮動的圓環／旋鈕，並在比賽開始時顯示簡短提示；放開後轉向會回到中立。

HUD 使用共用的動態時間。速度表指針會隨速度平順移動；名次變動時，名次數字會翻轉並帶有綠色向上或紅色向下的箭頭，排行榜列則會滑入新的位置。精簡的半透明事件提示位於畫面中央上方，避開 HUD 面板，並將擦身而過、PERFECT LINE、NITRO 爆發、電量增加與飄移火花階級排入佇列而不重疊；同時補充飛行電量的 NITRO 獎勵會標示出來（NITRO · +20% CHARGE）。暫停、完賽與重新開始會清除佇列。按鈕在按下時會變暗但不改變大小，因此在邊框以內任何位置按下都會被接受；按住的觸控按鈕保持亮起。VFX 設定中的可選 **Haptic feedback** 會在支援的觸控裝置上，為碰撞、NITRO 與飄移獎勵發出震動提示。Comfort mode 與系統的減少動態效果會保留文字與按下狀態的顏色，同時移除新增的動態與震動。

### Language

整個介面提供英文與繁體中文（繁體中文）：開始畫面、Garage、History、HUD、比賽提示、結果、路線地圖、設定，以及 3D 路標。開始畫面賽道卡片下方的 **EN / 繁體中文** 開關會一次切換全部內容，無需重新載入。語言依下列順序決定：

1. 你點擊開關所儲存的選擇（`skyline-rush-locale`；只在點擊時寫入，絕不來自自動偵測）；
2. 你的系統語言順序（`navigator.languages`）：第一個 `en*` 或 `zh*` 項目決定結果，其他語言會被跳過（`['ja-JP', 'zh-TW']` 會選擇繁體中文），任何 `zh*` 標籤（zh-TW、zh-HK、zh-Hant、zh-CN、zh-Hans、單純的 zh）都會選擇繁體中文，清單為空或缺漏時則退回 `navigator.language`；
3. 否則使用英文。

品牌與遊戲術語在兩種語言中都維持英文：Skyline Rush、NITRO、FLY、BOOST 與對手名稱。字串位於 `src/locales/`；`src/i18n.ts` 負責偵測、`t()` 與目前的語言。

在地化圖片：`node scripts/capture-og-images.mjs` 會在 Chrome 中驅動真實的 App，並儲存 `public/og-image.en.jpeg` 與 `public/og-image.zh-TW.jpeg`（1440×900 開始畫面），以及供繁體中文 README 使用的 `artifacts/{readme-start,readme-hero,mobile-flight,race-results}.zh-TW.jpeg`（`node scripts/capture-og-images.mjs og` 或 `readme` 只執行其中一半）。英文的 `artifacts/` 截圖絕不會被它更動。`public/manifest.webmanifest` 與 App 圖示維持原樣：圖示不含文字，而 Web App manifest 只有單一名稱與描述，沒有各語言變體，因此第二份 manifest 會破壞可安裝性。

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

瀏覽器測試使用已安裝的 Google Chrome，並允許 SwiftShader 進行無頭算圖。僅有 CPU 的 CI 使用 0.25 的裝置像素比，以維持 3D 場景的流暢，同時保留相同的 CSS 視窗尺寸與遊戲斷言；本機測試則以完整解析度算圖。一般遊玩使用瀏覽器可用的 GPU。英文 README 截圖僅在檔案不存在，或使用 `UPDATE_ARTIFACTS=1 npm run test:browser` 時，才會以 JPEG（品質 70）寫入 `artifacts/`，因為即時 3D 場景每次執行都不同；測試追蹤／結果會被忽略。完整衝刺測試在高速機器上約需一分鐘，軟體算圖拖慢模擬時則更久。

```sh
npm run preview         # Serve the production build after npm run build
```

若要檢查手機，請在你的網路上提供該建置（`npx vite preview --host 0.0.0.0`），並以 `?perf` 開啟（例如 `http://<computer-ip>:4173/?perf`）。畫面頂端會出現一條列，顯示過去 20 秒內比賽的影格時間：中位數（p50）、第 95 百分位（p95）、平均 fps 與取樣長度。沒有 `?perf` 時，不會量測或顯示任何東西。

```sh
make perf BASE=main         # A/B in Chrome at 412×915, CPU throttled 6× (RATE=20 for a low-end phone), 3 alternating rounds
make perf BASE=main VIEWPORT=desktop  # The same A/B at 1440×900 desktop size
make perf-phone             # Like make phone: asks base version, Tailscale/Wi-Fi and Telegram; logs phone temperatures
```

`make perf` 會建置此工作副本，並在給定 `BASE=<git ref>` 時也建置該 ref（位於 `.claude/worktrees/perf-<sha>`，下次會重用），每次執行在 Coast 競速 24 秒，並印出每次執行的列以及各建置的中位數。`make perf-phone` 對於未傳入的項目，會以與 `make phone` 相同的方式詢問（`BASE=`、`VIA=tailscale|wifi|auto`、`TG=0`），為每個建置印出並傳送到 Telegram 一個 `?perf` 網址，在以 USB 連接的任何 Android 手機上以 Chrome 開啟第一個（透過 `adb reverse`，因此任何網路都可行），在按下 Ctrl+C 時傳送網址已失效的通知，並每 10 秒記錄手機的感測器溫度與降頻等級（`dumpsys thermalservice`）以及 Mac 的熱警告等級，直到按下 Ctrl+C。只在相同的降頻等級下比較各次執行：發熱的手機會降頻並掉幀，與建置版本無關。iPhone 不回報溫度。

## 部署

請在 [https://weskao.github.io/skyline-rush/](https://weskao.github.io/skyline-rush/) 遊玩。此網站為公開：訪客不需要 GitHub 帳號或 Tailscale，開發者的電腦也可以離線。

```sh
git tag v0.4.0 && git push origin v0.4.0   # Release: deploys once CI confirms the commit already passed on main
make deploy                              # Deploy remote main manually through the same CI flow
# The on-screen version (ready screen, desktop and mobile) is `package.json`'s version; `/release` bumps it
# after scripts/release-gate.sh has seen a green CI run for the commit on main.
```

CI（`.github/workflows/ci.yml`）會在推送到 `main`、`develop`、pull request、版本標籤推送（`v*`）與手動執行時，建置並執行單元測試與 Chrome 瀏覽器測試。瀏覽器與 World Tour 長時間測試以平行分片執行，依 `tests/ci-durations.json` 中實測的每項測試耗時進行平衡（`scripts/ci-shards.mjs`），僅在 `main` 與 `develop` 上執行（其他分支只執行單元與雲端存檔檢查，除非提交訊息含有 `[full-regression]` 或手動執行要求），且對同一分支的較新推送會取消被其取代的執行。CI 會重試一次失敗的瀏覽器測試；僅在重試時通過的測試仍會在該次執行上加註，並視為待修復的錯誤（`.claude/rules/browser-test-stability.md`）。在任何分支上，若推送或 pull request 只更動 `src/`、`public/`、`tests/`、`scripts/` 與 `.github/` 以外的 Markdown、文字、圖片、影片或 `Makefile`，且其父提交已在該分支上通過 CI，就會略過所有測試套件（`scripts/ci-changes.mjs`）。手動執行在所有檢查通過後才發佈；版本標籤推送會重新執行單元測試，確認（`release-verified`）被標記的程式碼已在 `main` 上通過完整測試套件，而不是重新執行瀏覽器測試套件，然後發佈並驗證公開網站。若標籤所在的提交從未在 `main` 上通過 CI，則不會部署。一般的分支推送與 pull request 只會執行檢查。推送到 `main` 時，若其任一合併提交所合併的來源不是 `develop` 或 `hotfix/*`，`main-merge-source` 工作（`scripts/check-main-merges.sh`）也會失敗，且該紅燈執行會阻擋發佈。Pages 建置使用 `--base=/skyline-rush/`，讓腳本、樣式與字型從專案網址載入。GitHub Pages 必須使用 **GitHub Actions** 作為其發佈來源。手動部署需要已驗證的 GitHub CLI（`gh auth login`）；請先推送你的提交，因為 `make deploy` 使用遠端的 `main`。部署不再依賴本機的 pre-push hook 或 Netlify 登入。當任何檢查或部署在推送、標籤或手動執行中失敗時，`notify-telegram` 工作會將失敗執行的連結傳送到 Telegram；它需要儲存庫密鑰 `TELEGRAM_BOT_TOKEN` 與 `TELEGRAM_CHAT_ID`（以 `gh secret set <NAME>` 設定各項，它會提示輸入值），缺少時會安靜地略過。

連結預覽圖片是 `public/og-image.jpeg`，為 `public/og-image.en.jpeg` 的副本；`node scripts/capture-og-images.mjs og` 會擷取兩種語言的封面並更新該副本。爬蟲無法切換語言，因此 `index.html` 只參照英文封面（搭配 `og:locale` `en_US` 與 `og:locale:alternate` `zh_TW`），而 `public/og-image.zh-TW.jpeg` 是供直接連結使用的中文對應版本。更換封面後，請提高 `index.html` 中 `og:image` 的 `?v=`，讓社群網站抓取新的圖片。

## 專案結構

- `src/game.js`：確定性的街機模擬、對手、車流與完賽順序。
- `src/input.ts`：鍵盤與多指標控制，具備取消與失焦清理；讀取已儲存的按鍵對應。
- `src/key-map.ts`：純函式的按鍵對應，含 E / X NITRO、衝突互換式的重新綁定、驗證與儲存。
- `src/history.ts`：已儲存的遊戲資料：近期比賽歷史、每條賽道的最佳成績與舊版遷移、生涯統計、獎牌、星數、已裝備的塗裝、ghost 與每日榜單。
- `src/ghost.ts`：取樣式 ghost 錄製、每條賽道的驗證與內插播放。
- `src/appearance.ts`：塗裝目錄與星數解鎖門檻。
- `src/rng.ts`：以種子產生的隨機串流；拾取物與光環來自每場比賽的配置種子（測試與工具中則為賽道種子）。
- `src/world.js`、`src/geometry.ts`：Three.js 渲染器、程序化車輛、公路、天際線、飛行效果與鏡頭。
- `src/effects.js`：有上限的 GPU 粒子池，用於蒸氣、火花與降落塵土。
- `src/track-paths.ts`、`src/world-tour-scene.js`：每條賽道一個距離到道路的對應，以及共用的 World Tour 道路、景物與地標。
- `src/route-map.ts`、`src/i18n.ts`：SVG 完整路線與即時車手地圖；語言偵測、已儲存的選擇、`t()` 與英文／繁體中文的賽道名稱；`src/locales/` 存放語言目錄。
- `scripts/capture-og-images.mjs`：從真實的 App 擷取英文與 zh-TW 封面圖片，以及 zh-TW README 的截圖。
- `scripts/pickup-economy.mjs`：由腳本控制的機器人駕駛每條賽道，並印出每分鐘 NITRO、BOOST 佔比、燃料耗盡次數與第一次 NITRO 的時間；`tests/pickup-economy.test.js` 鎖定光環／拾取物的配置。
- `scripts/ring-variety.mjs`：在重新隨機的比賽種子上，印出每條賽道的光環車道分佈、地面佔比、每場的光環列與排列，以及機器人的光環收集率與 NITRO 率；`tests/ring-variety.test.js` 讓每條車道都被使用，同時不讓光環更難收集。
- `scripts/rival-balance.mjs`：一個專家機器人（使用 BOOST、為光環而飛）與一個新手機器人（兩者皆不用）在各賽道與難度上與 AI 車隊競賽；印出最快對手的差距與機器人的名次。
- `scripts/ci-shards.mjs`：`plan` 為每個 CI 分片提供其 Playwright 的 `--test-list`，依耗時打包測試，使每個分片大致同時完成；`refresh <run-id>` 會在測試套件大幅變動後，依某次 CI 執行的日誌重寫 `tests/ci-durations.json`。
- `src/App.vue`、`src/icons.ts`：Vue 3 的 UI 外殼（開始畫面、HUD、面板、觸控控制項）與其共用的 SVG 圖示；共用面板使用 Vue 元件，而遊戲迴圈則直接更新比賽中的 HUD。
- `src/main.js`、`src/style.css`：掛載 `App.vue`、串接各畫面控制器，並執行比賽生命週期（開始、暫停、重新開始、結果）與影格迴圈。
- `src/*-ui.ts`：每個畫面區域一個 TypeScript 控制器（比賽選擇、雲端存檔、觸控控制項、按鍵對應、VFX、音訊、歷史對話框、拍照模式）。
- `src/race-hud.ts`、`src/race-hud-modes.ts`：比賽中的 HUD，每個 HUD tick 以命令式方式寫入。
- `src/race-results.ts`、`src/result-screen.ts`、`src/session-progress.ts`：記錄已完成的比賽（最佳成績、解鎖、獎牌、ghost）並顯示其結果畫面。
- `vite.config.js`：搭配 `@vitejs/plugin-vue` 的 Vite。
- `src/perf.ts`：供 `?perf` 裝置檢查讀數使用的影格時間百分位數。
- `src/audio.js`：合成的音效與循環播放的音樂音序器；歌曲位於 `src/music-tracks.ts`，比賽到音效的事件位於 `src/race-audio-events.ts`。
- `src/audio-settings.ts`：從 `localStorage` 讀取已儲存的音樂／音效開關與音量，以及滑桿的靜音保留音量規則。
- `tests/`：單元與瀏覽器行為測試。`tests/module-size.test.js` 讓每個原始碼模組維持在 400 行以內（較舊的大型檔案有只降不升的上限）。
- `docs/design.md`、`docs/verification.md`：範圍與驗證證據。
- `README.zh-TW.md`：本檔案的繁體中文翻譯，由 `scripts/readme-zh.mjs` 保持最新（`check`、以 `claude -p` 翻譯的 `sync`，以及手動編輯後的 `stamp`）。`.githooks/pre-commit` hook 會在提交變更 README.md 時重新產生它（以 `SKIP_README_ZH=1` 略過一次），`.githooks/pre-push` 會在推送的提交觸及首頁（`index.html`、`src/App.vue`、`src/main.js`、`src/style.css`、`src/locales/`；以 `SKIP_LAYOUT_GATE=1` 略過一次）時執行 `npm run test:layout`，而 `.githooks/main-merge-guard`（由 `pre-merge-commit` 與 `pre-commit` 執行）會拒絕將 `develop` 或 `hotfix/*` 以外的任何分支合併進 `main`（快轉合併不會執行任何 hook，因此請使用 `--no-ff`；以 `ALLOW_MAIN_MERGE=1` 略過一次）；`make` 會以 `git config core.hooksPath .githooks` 啟用這些 hook。`.claude/settings.json` 中的 Claude Code Stop hook，會在某個回合編輯了 README.md 卻沒有同步更新它時，讓 Claude 回頭去更新。

所有車輛／景物的幾何與效果皆以程式碼生成。Barlow Condensed 依 SIL Open Font License 內建於 `public/fonts/OFL.txt`。Three.js、Vue、Vite 與 Playwright 保留各自的套件授權。

來源：[weskao/skyline-rush](https://github.com/weskao/skyline-rush)。跨多條賽道的單人賽車，採街機物理。瀏覽器驗證涵蓋桌機 Chrome 與模擬的行動裝置視窗；iOS Safari 已在 iOS 模擬器中檢查過（直向與橫向、Coast 與 Neon），但實體手機上的影格率尚未量測（請使用 `?perf`，見 Verify）。
