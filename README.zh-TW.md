<!-- source-sha256: f8a31677cceb8bbd410128f360b9d542b61189ff4b69d56ac305bd6bb93aaba0 generated from README.md by scripts/readme-zh.mjs; edit README.md, then run the script -->
# Skyline Rush

[English](README.md) · **繁體中文**

[**開始遊玩 Skyline Rush →**](https://weskao.github.io/skyline-rush/)

這是一款可直接遊玩的 3D 海岸公路衝刺遊戲，主角是一輛飛行電動跑車，造型以 Tesla Roadster 2 及其火箭推進器概念為藍本。藉由四具藍色推進器升空，與三名對手競速，飛越車流，管理電量並降落補充。操控手感為虛構的街機物理；本專案為非官方粉絲作品，與 Tesla 或 SpaceX 無任何關聯。

## 遊戲介紹

在 Classic Race 中，Skyline Rush 是一場可在瀏覽器中重複遊玩的短程街機衝刺：一名玩家對上三名對手與其間的車流，桌機或手機皆可，無須安裝任何東西。其他模式提供單人駕駛、自訂規則與多階段挑戰。

- **先駕駛，再飛行。** 時速超過 65 km/h 後，按住 FLY 即可升空，飛越車流、穿過光環、跨越斷橋。飛行與 BOOST 共用同一份推進器電量，且只有在地面行駛時才會回充，因此每一次爬升都是一個抉擇。
- **靠好的駕駛賺取 NITRO。** 近距離超車、飄移、連續光環（PERFECT LINE）、氣流跟車、成功落地的桶滾以及拾取道具，都會填滿三格的 NITRO 儲量；可一次爆發用完，或連按以延長時間。
- **十條賽道，依序解鎖。** 黃昏海岸、下雨的 Neon Downtown 與低矮隧道、有斷橋與側風的 Canyon Skyway、有冰面與上坡爬升的 Aurora Pass、具跳躍坡道與斷裂天橋的 360° 高架螺旋 Sky Spiral，接著是 World Tour：Taipei Heritage、Tokyo Afterdark、Alpine Rail Pass、Coastal Horizon 與 Cosmic Orbit。每條賽道都有一條空中捷徑，留給能在空中穩住路線的玩家。
- **值得追逐的目標。** 每次完賽都會獲得風格星數，用來解鎖 Garage 中的塗裝。最佳成績幽靈車、擁有專屬排行榜的每日挑戰以及四種獎章，都讓人想再跑一次。

一場 Classic 衝刺約一分鐘；多階段挑戰則更久。音效由瀏覽器即時合成，進度儲存在本機儲存空間，因此不需要帳號或後端。

https://github.com/user-attachments/assets/e0ddb94c-794e-49ab-9b66-51cb5150f101

<p align="center"><img src="artifacts/readme-tracks.jpeg?v=20261102a" width="70%" alt="十條賽道中的四條飛行畫面：Neon Downtown、Aurora Pass、Sky Spiral 與 Tokyo Afterdark"></p>

<p align="center"><img src="artifacts/readme-start.zh-TW.jpeg?v=20261102a" width="49%" alt="含遊戲模式、賽道與 Start race 的開始畫面"> <img src="artifacts/race-results.zh-TW.jpeg?v=20261024a" width="49%" alt="創下個人最佳成績的比賽結果"></p>

### 在手機上遊玩

支援直向或橫向的觸控操作；AUTO 會持續按住油門。[觀看 MP4](artifacts/mobile-demo.mp4)

<p align="center"><img src="artifacts/mobile-home.jpeg" height="300" alt="手機直向的開始畫面與賽道選擇"> <img src="artifacts/mobile-landscape-flight.jpeg" height="300" alt="手機橫向的飛行畫面，按住 FLY 並顯示觸控按鈕"></p>

截圖於全新設定檔的 Chrome 行動裝置模擬（390×844 與 844×390）下擷取；並非實體手機的效能量測。

## 遊戲模式與重玩性（開發分支）

> **開發中 · 2026 年 10 月 29 日。** 這些模式新增內容整合於 `feature/roadmap-integration` 開發分支，尚未合併至 `main`，也尚未包含在[已部署的 GitHub Pages 版本](https://weskao.github.io/skyline-rush/)中。

選擇一條**已解鎖的賽道**，在賽道卡片下方選擇 **GAME MODE**，必要時展開規則說明，然後按下 **Start race**（或 Enter）。比賽仍使用相同的 Three.js 道路、飛行、FLY / BOOST / NITRO 與響應式觸控操作。開發分支包含以下模式：

| 模式 | 玩法差異 | 勝利條件／進度 |
| --- | --- | --- |
| **Classic Race** | 在 10 條賽道之一進行標準的 3 名對手衝刺，含車流、捷徑、光環與 NITRO。 | 進入前三名可解鎖下一條賽道；只有 Classic 會頒發 Career 星數、獎章與官方最佳成績。 |
| **Custom Race** | 選擇 **0–3 名對手**、Easy / Normal / Hard 的 AI、Off / Light / Normal / Heavy 的車流、NITRO 道具開／關，以及 Normal / Relaxed 的碰撞懲罰。提供五種預設：Standard、Traffic Rush、No Items、Air Focus 與 Precision。 | 非排名結果有獨立的歷史紀錄。可進行 **1 / 2 / 3 / 5 個衝刺階段**並比較總時間。各階段重複跑的是點到點路線，**並非環形圈數**。 |
| **Free Drive** | 獨自探索任何已解鎖的賽道，可調整路上車流與道具，沒有名次，也沒有強制的勝利。 | 自由駕駛、飄移與飛行直到道路盡頭；抵達終點後會以結果畫面結束本次行程，不儲存任何紀錄。這**不是**無限世界模式。 |
| **Time Attack** | 單人計時衝刺，提供相容的最佳成績 Ghost 與領先／落後分段時間。可選擇開啟 **Clean Time Trial**。 | 依賽道與規則分別記錄最佳時間；Clean 行程中只要發生任何碰撞即視為無效，不會取代個人最佳。 |
| **Obstacle Run** | 以種子產生的路邊障礙物；密度分為 **Standard** 或 **Extreme**。部分障礙物會橫向掃過；警示 HUD 會預告接近中的危險。 | 閃避危險、藉由乾淨通過獲得風格分數，並使用一般路線的終點。障礙物配置與碰撞共用確定性邏輯；Classic 不受影響。 |
| **Checkpoint Rush** | 穿越發光的 3D 關卡拱門。起始時間為 **28 秒**；每通過一道乾淨的關卡拱門可獲得 **+10 秒**（上限 60 秒）與 **250 風格分數**。 | 須在時間用完前抵達每道關卡與終點。漏掉關卡或超時**不會**儲存有效的最佳成績。HUD 顯示已通過的關卡數、剩餘時間與到下一個目標的距離。 |
| **Championship Cup** | 挑選僅由已解鎖路線組成的 **3 或 5 條賽道** Cup；每個階段與 NOVA、ORBIT 和 APEX 競賽。 | 名次依序獲得 **10 / 7 / 5 / 3 分**；以累計積分與總時間決定冠軍，同分時以時間決勝。Cup 結果與 Career 解鎖各自獨立。 |
| **Stunt Attack** | 為期 **120 / 180 / 300 秒**、由連續多個賽段組成的風格賽：飄移、空中特技、擦身而過與光環累積連擊分數。 | 由計時器而非終點線結束賽程；每種時長都有本機風格獎章與最佳分數。 |
| **Elimination** | 四名車手的「最後倖存者」賽制：每十秒淘汰目前排名最後的車手。 | 撐到成為最後一名車手；過早被淘汰則本次行程結束且沒有獎勵。 |

### Cup 復原

未完成的 Championship Cup 會在首頁提供 **Resume** 或 **Discard**。Resume 會保留已結算階段的積分，並只重新開始未完成的階段；重試只會回溯正在重跑的那個階段。完成或捨棄 Cup 會清除其復原項目。刪除遊戲進度時也會一併移除檢查點，同時保留裝置偏好設定。復原使用此瀏覽器的儲存空間，無法還原瀏覽器拒絕儲存的資料。

### 自訂外觀與 Ghost

Custom Race 可重播每個衝刺賽段中最快的相容 Ghost。Custom 與 Free Drive 提供 Track / Day / Dusk / Night / Rain / Fog 的外觀預設，以及即時規則摘要。這些外觀選擇純屬視覺，不會影響紀錄資格或規則集身分。重試會保留所選外觀；更換賽道或回到 Classic 則會恢復賽道原本的外觀。Photo Studio 關閉時會還原目前比賽的外觀。

### 可選道具與獎勵關卡

Custom 與 Free Drive 提供 **Off / Classic Mystery Rings / Active Items / All Items**。持有的道具佔用單一欄位：按 **Q** 或點擊 **USE** 啟動，然後等待冷卻。NITRO 與 FLY/BOOST 仍保有各自的操作。All Items 會加入有上限的加速、空中電量與一次性受擊復原關卡；EMP 會短暫減慢附近的對手，單人遊玩時則轉為 Magnet。復原不會影響官方的碰撞次數。Stunt Attack 與 Checkpoint Rush 可另外選擇啟用暫時、不可疊加的 ×2 分數關卡。Classic 的預設行為不變。

### Event Lab Lite v1

**Event Lab Lite** 可在已解鎖路線上，以障礙物、NITRO 光環與補給編輯本機賽道範本。可調整其車道與距離、對編輯進行 Undo/Redo/Reset，並以文字匯入或匯出經驗證的賽道。開始時會把賽道編譯成真正的比賽事件；重試會保留賽道與種子。賽道結果與 Career 和 Custom 紀錄各自獨立。錐形路障、自訂坡道、檢查點編輯與社群分享不在這個初版範圍內。

### Endless Highway

**Endless Highway** 將 Coast 延伸到既定終點之外，成為以距離為目標的生存活動。車流難度逐步上升至固定上限；發生五次碰撞即結束一次完整的嘗試。個人紀錄追蹤的是最長的絕對距離，與 Career 和 Ghost 分開計算。暫停與 WebGL 復原都會保留行程。此初版僅支援 Coast；其附近的景物與事件使用有上限的資源池。

### Circuit Race

**Circuit Race** 新增 Harbor Circuit，這是一條獨立、隨時可進入的 2 km 封閉環形賽道，提供 **1 / 3 / 5 圈**。依序通過每個區段才算完成一圈；反向通過、傳送與復原都無法獲得圈數。HUD 與結果畫面會顯示分段時間、上一圈、個人最佳單圈與總時間。單圈最佳成績不會被滾動式 History 淘汰；總時間與 Ghost 則依圈數設定分別計算。原本十條點到點賽道維持原有的地理環境與 Career 進度。

### 賽道主題、障礙物與風險路線

- **賽道主題**（可在 Custom、Free Drive 與 Obstacle Run 中選擇啟用）為每條路線帶來專屬的危險：Coast 的貨物與陣風、Neon 的道路施工、Canyon 的落石、Aurora 的雪堆、冰面與暴風雪、Sky Spiral 的能量閘門、Taipei 的節慶路障、Tokyo 的號誌閘門、Alpine 的雪崩、Coastal 的浪花，以及 Cosmic 的能量牆。危險會事先警示、始終保留兩條車道暢通，且絕不改動 Classic。
- **Obstacle Run** 提供 **Mixed obstacles** 賽道：擺動的閘門、墜落的碎片，以及設在路障上的圓環，獎勵飛越或繞行的玩家。
- **風險路線**：高風險光環與近距離超車在 Custom Hard 中給予更多分數，也可關閉以進行輕鬆練習。
- 道路新增了不具實體的路邊生活景象：觀眾、廣告看板、維修廂型車、鐵路月台、行駛中的列車、船隻與無人機。較低的畫質設定會減少繪製這些內容。

### 比賽設定、結果與無障礙

- 模式與賽道的選擇仍可透過鍵盤與觸控操作；情境面板只顯示與所選模式相關的選項。無法使用的 Cup 會說明還需要多少條賽道。
- HUD 會依模式調整：單人活動會隱藏容易誤導的對手排名；多階段與 Cup 賽程顯示階段進度；Checkpoint Rush 顯示即時的關卡倒數；Obstacle Run 會警示接近中的障礙；Clean Time Trial 會明確標示已失效的行程。
- Practice、Custom、Time Attack、Obstacle、Checkpoint 與 Cup 的結果使用獨立的 `skyline-rush-mode-history-v1` 紀錄鍵。符合資格的練習 Ghost 有各自儲存的規則集；Classic 的解鎖、星數、獎章、Daily 紀錄與官方時間不受練習行程影響。
- 在 **History → Challenge records** 中，可依模式篩選，查看每個確切賽道／規則集的個人最佳，以及符合資格的 Time Attack Ghost。即使最近 50 筆行程輪替掉，終身最佳仍會保存在 `skyline-rush-mode-bests-v1` 下。挑戰紀錄明確不屬於 Career 獎章或星數。
- 模式標籤、結果說明、設定選項與危險警示皆支援英文與繁體中文。低畫質圖形、觸控操作與減少動態效果仍列在驗證計畫中。

### 真實遊戲截圖與驗證

用來檢視這些模式的截圖皆**擷取自執行中的瀏覽器遊戲**，而非概念圖。[下載實際的 Playwright 擷取圖集](https://github.com/weskao/skyline-rush/actions/runs/39742666980/artifacts/12410172411)（Custom solo、Free Drive、Time Attack、Obstacle Run、Extreme obstacles、Checkpoint Rush 與手機模式選單）。GitHub Actions 的產出物可能需要登入且會過期；若要在本機重新產生，請執行 `npx playwright test tests/race-modes-browser.spec.js` 並開啟 `test-results/race-mode-*.png`。CI 截圖為軟體算圖且解析度較低，不代表最終裝置上的畫質。

**驗證：** 每項功能的測試與完整關卡驗證紀錄都列在 `TODO.md` 中。實體 iPhone 與 Android 的檢查仍待進行。

## 在本機執行

需要 Node.js 22.12 或更新版本，以及支援 WebGL 2 與硬體加速的瀏覽器。

```sh
cd "$HOME/Documents/Workspace/skyline-rush"
make         # Installs dependencies on first run, then starts the Vite + Vue dev server
```

開啟 Vite 印出的本機網址（通常是 http://127.0.0.1:5173）。資源與字型皆在本機打包；遊戲過程不會發出任何外部請求。不需要後端或帳號。

`make` 與 `make dev-unlocked` 也會啟動本機 Firebase Auth/Firestore 模擬器（需要 Java 21+），因此雲端存檔的 Google 登入可搭配假的測試帳號運作，且絕不會動到真實存檔。雲端存檔的操作，以及專案擁有者的 Spark 配額檢查，請見 `docs/cloud-save.md`。

`make dev-diag` 與 `make phone-diag` 提供相同的建置，並編入畫面上的診斷橫幅（影格計數器、頁面生命週期與觸控事件及其點擊目標，另有在重新載入後仍保留的最近幾筆未捕捉錯誤），用於在實體手機上追查畫面凍結或按鈕失效的問題。正式建置絕不含有它：`npm run build` 會拒絕帶有診斷模組的產出。

`make phone` 會開啟終端機選單，用來啟動、檢查或停止可供手機開啟的開發伺服器（透過 Tailscale 或同一個 Wi-Fi），並在伺服器回應後印出手機網址。選單會列出此工作目錄、其他 worktree 與最近的分支，也可輸入分支名稱；`make phone <name>` 會直接前往該分支（或 `feature/<name>`），必要時在 `.claude/worktrees/` 下建立其 worktree，`make phone off` 會停止它啟動的所有伺服器（等同 `/phone-dev off`），而 `y=1`（例如 `make phone y=1 <name>`）則略過選單：每個問題都採用其 Recommended 選項，並印出每個選擇。當某個連接埠已被此專案先前啟動的伺服器佔用（任何 worktree）時，沿用該連接埠即為 Recommended 的答案：舊伺服器會被停止，網址保持不變；`make dev`、`make dev-diag`、`make dev-unlocked`（5173）與 `make dev-feature`（5443）也會不經詢問就這麼做，並且不動其他專案的伺服器。它提供的是一般的鎖定版建置；`make phone-unlocked [name]` 是同一個選單，但所有賽道與塗裝皆已解鎖，也是唯一手機可連上的全解鎖伺服器（`make dev-unlocked` 與 `make dev-feature` 仍僅限桌機）。除非在 `src/upcoming-tracks.ts` 的 `PLAYABLE_PREVIEW_IDS` 中加入某個 id（且僅在其真正的比賽執行環境已列入 `RACE_TRACKS` 之後），否則 Coming Soon 卡片在所有建置中都只能預覽；`make dev-unlocked` 與 `make phone-unlocked` 屆時會讓該卡片可以開始，正式版則永遠不會。它需要個人的 `phone-dev` Claude Code skill（`/phone-dev` 會詢問相同的選單），且執行時不啟動模擬器，因此手機上的雲端存檔登入使用的是真實專案。

## 操作

| 動作 | 鍵盤 |
| --- | --- |
| 加速 | W / ↑ |
| 煞車 | S / ↓ |
| 轉向 | A / D 或 ← / → |
| 飛行 | 時速超過 65 km/h 後按住 Space |
| 降落 | 放開 Space |
| Boost | 按住 Shift；消耗推進器電量 |
| NITRO | E / X（一格滿電量；NITRO 期間再按一次可延長）。使用 WASD 的玩家用 E；使用方向鍵的玩家左手維持在 Shift / X / Space |
| 飄移 | 時速超過 162 km/h 時按住 S + A / D（僅限地面） |
| 開始 | Enter |
| 暫停／繼續 | Esc / P |
| 重新開始 | Backspace |
| 切換鏡頭 | C |
| 全部音訊靜音／取消靜音 | M |
| 自動油門開／關 | F2 / AUTO 按鈕 |
| AIRFLOW 展示開／關 | V / AIRFLOW 按鈕 |
| 在首頁切換賽道 | 向左／右滑動或拖曳 3D 預覽，或在觸控板上用兩指滑動 |

行動版面提供轉向、油門、煞車、boost、飛行與 NITRO 按鈕。觸控操作支援同時按住多個按鈕。AUTO 會持續按住油門，讓你專心轉向與飛行；煞車永遠優先於它。每種裝置預設都是開啟；一旦你切換過，你的選擇會記在此瀏覽器中（`skyline-rush-auto`）。離開分頁會暫停比賽並清除按住中的輸入。比賽中點擊 SKYLINE RUSH 標誌會先暫停並詢問：**Keep racing**、**End race**（回到賽道選擇，本次行程不儲存）或 **Back to home**（重新載入）；無論選哪一項，開始畫面都會重新開啟在剛剛跑過的賽道上，並捲動到賽道列的中央（第一條與最後一條賽道位於列的兩端）。按 Esc 則讓比賽保持暫停。鏡頭與音效快捷鍵會保留按住中的駕駛操作。在觸控上，於轉向板上將拇指向下滑動即煞車，向下並向側邊滑動則飄移；在 Buttons 模式中，一個較細的煞車鍵位於轉向按鈕上方，避開拇指停留的那一列，因此只有刻意才會按到；從 ← 或 → 將拇指向上滑入煞車鍵，會同時保持轉向並煞車，所以單一拇指就能飄移，滑回下方即放開煞車。觸控按鈕與螢幕角落保持距離，讓拇指更容易觸及，平板則會把它們抬高並放大。

在比賽前或暫停時開啟 **Controls**，可調整鍵盤轉向靈敏度或重新對應駕駛動作。選擇一個動作後按下按鍵；衝突的綁定會互換，固定的快捷鍵保留不可改，按 Escape 則取消擷取。Reset keyboard 會還原預設值。綁定立即生效，並儲存在 `localStorage['skyline-rush-keymap']`。手機與平板在按下實體（例如藍牙）按鍵之前會隱藏鍵盤區段；之後該鍵盤會被記在 `localStorage['skyline-rush-keyboard-seen']` 之下。

同一個面板也控制觸控轉向模式、慣用手、滑動靈敏度、大小、不透明度，以及按住／切換式的 FLY。**Edit touch layout** 讓你在比賽預覽上拖曳動作按鈕與經典轉向按鈕；**Done editing** 會保留配置，**Reset touch layout** 則還原。位置會在重新載入後保留、隨慣用手鏡像，並在旋轉後仍留在可視範圍內。在較矮的橫向螢幕上（高度低於 380 px，例如工具列顯示中的 iPhone Safari），開始畫面會捨棄標語，讓 START RACE 不必捲動即可按到，比賽 HUD 也會隱藏速度表與次要電量行，避免面板互相重疊。

所有音訊皆以 Web Audio 合成；不需要下載任何音訊檔案。背景音樂有兩首循環的 synthwave 曲目：開始與結果畫面使用的序曲主題（約 64 秒），以及從倒數開始使用、節奏較快的比賽主題（約 55 秒）。每首都會在循環中逐步堆疊，並在暫停時降低音量。音效涵蓋選單確認、三次倒數嘀聲與 GO、馬達／風聲、升空與加速、煞車、車輛／護欄碰撞、降落、低電量警告、近距離超車獎勵以及完賽旋律。將音效靜音會停止待播的提示音，暫停則會淡出駕駛聲音。低電量警告只有在電量回充至 30% 以上後才會重新啟用。

喇叭圖示會開啟音訊設定，內有 Music 與 Sound effects 兩列，各有一個靜音開關加一個音量滑桿（上方開始畫面截圖中呈開啟狀態）。**Mute all**（或 M）會同時讓兩者靜音。靜音會保留每個聲道的音量，所以取消靜音會回到原來的音量；將滑桿拖到零，也會以同樣方式讓該聲道靜音。兩者預設皆為開啟、音量 100%，且各自的開／關選擇與音量都會記在 `localStorage` 中（`skyline-rush-music`、`skyline-rush-sound` 儲存 `on`/`off`，另有 `-volume` 變體儲存百分比）；若沒有儲存任何值，兩個聲道皆為開啟，並會以 `on` 存入。在較矮的螢幕上，面板可以捲動。在瀏覽器允許自動播放的情況下，序曲會在頁面載入後立即開始。若不允許（首次造訪時的 Chrome 與大多數其他瀏覽器），則由第一次點擊、按下或按鍵啟動。在 iPhone 與 iPad 上，遊戲會要求媒體播放，因此靜音開關不會讓它靜音；這也會在遊戲進行時暫停其他 App 的音訊。

飛行面板會顯示爬升、巡航、下降與觸地、剩餘的推進秒數，以及接下來該使用的操作。青色光環標示出空中通道，且屬於遊戲玩法：請見下方的 Rings。行動版也有按住加速的 boost 按鈕。橘色的碰撞回報會顯示撞擊類型與損失的速度；護欄現在會把著地的車彈開並使其減速。飛在護欄上方則可越過它。

場景包含泛光照明、日落水面、懸索橋、推進器蒸氣、碰撞火花與觸地漣漪。鏡頭運動與非必要的速度線會遵循你系統的減少動態效果偏好。音效為推進、碰撞與降落提供各自獨立的回饋。

**VFX**（右上角）可選擇 Realistic、Cinematic 或 Extreme 的視覺風格、Low / Medium / High 畫質（Low 會關閉泛光並減少繪製的景物）、Comfort mode（無閃光、震動、殘影或模糊）以及選用的觸覺回饋。其 **Race HUD** 區段可選擇 Immersive 或 Competitive（含排行榜、小地圖與次要統計的開關）、開關 NITRO READY 的聲音與動畫，**Reset HUD to default** 則將它們還原。**Fine tuning** 將每個效果以滑桿呈現，**Reset visual settings** 會還原預設值。**AIRFLOW**（或 V）會把場景切換為空氣動力學展示：車身上的流線、遙測面板、Low drag 或 High downforce，以及駕駛、前方、後方、側面或環繞的鏡頭。開始面板會讓位給展示畫面，只留下橘色的 **START RACE** 按鈕，固定在車子下方的底部中央；向左或向右滑動場景即可切換賽道。第一次開啟 AIRFLOW 時，會有一個動畫指尖示範該手勢。流線只在 AIRFLOW 開啟時出現：關閉時，BOOST 與 NITRO 會顯示推進器噴流、尾跡與速度線，但沒有流線。

三盞琥珀色起跑燈會在 GO 時轉為青色。玩家的車是一輛低趴楔形跑車，具有煙燻色快背座艙、貫穿車寬的紅色尾條、四個後方推進器噴口、在 boost、煞車與飛行時升起的青銅色彈出式尾翼、旋轉的五輻輪圈以及可轉向的前輪。每名對手都有各自的輪廓與燈光特徵：NOVA 是帶雙垂直尾翼與分離式洋紅燈光的長尾車，ORBIT 是有水泡狀座艙與圓形青色車燈的圓潤 GT，APEX 則是配有前分流器、車頂進氣口、高大端板尾翼與琥珀色 C 形燈的賽道車。車流使用直立的通勤車造型。轉向會快速緩入，放開 boost 時車子會逐漸減速，而不是瞬間切斷速度。所有駕駛與工具列按鈕的觸控目標至少為 44px，包括 320px 寬度時。

想要額外的電量獎勵，請在時速超過 126 km/h 時於地面近距離超越車流。五秒內連續的乾淨超車最多可連鎖至 ×5，並回充 8–16% 的電量（上限 100%）。碰撞會中斷連鎖；在空中、距離太遠以及復原中的超車不會獲得獎勵。HUD 會播報每次超車與最後 500 公尺；結果畫面會顯示近距離超車與碰撞的總數。

飛行電量在全推力下約可持續五秒。電量歸零時車子會自動下降；放開飛行操作並在地面行駛即可回充。同一份電量也為 boost 供電。碰撞會使車子減速；飛得夠高則可避開車流。對手與車流遵守相同的碰撞規則：它們會繞開較慢的車與玩家，與你一樣會撞上道具、護欄與危險物，而一次撞擊會使兩輛車減速並互相推開（車流之後會再加速回到巡航速度）。在 NOVA、ORBIT 與 APEX 之前完成衝刺（依賽道為 4–8 km）。個人最佳時間在儲存空間可用時會儲存在此瀏覽器中。

### 操控

轉向在 0.15 秒內升至全幅，且高速時橫向速度上限為 9 m/s。在低於 65 km/h 時按住 Fly 會被記住 1.5 秒，並在速度夠快時自動升空。在空中放開 Fly 會降低下落加速度（11 → 7 m/s²）以便更柔和地降落，並緩慢回充飛行電量（每秒 4，為地面速率的三分之一；電量說明文字顯示 GLIDE RECHARGE ACTIVE）。已耗盡的推進器在放開 Fly 且電量回到 15 之後會重新解鎖，即使在空中也一樣。在斷橋 300 公尺內（Sky Spiral 除外，其坡道會直接把車拋過去），只要剩餘電量以目前速度無法推進越過，HUD 中央就會警告 GAP AHEAD · NEED n% CHARGE。車輛的碰撞寬度為 1.7 m，因此更多超車會算作擦身而過。輕微碰觸護欄屬於擦撞（保留 0.92 的速度、被推回道路上、不算碰撞、連擊保留）；正面撞擊仍算作碰撞。開啟 AUTO 時，放開轉向也會讓車子緩緩回到最近的車道中央（車道輔助）。按住 Fly + Boost 每秒消耗 22 電量而非 29，維持 boost 的速度上限，並顯示 AIR DASH。

### NITRO 與飄移

NITRO 有自己的儲量（`player.nitro`，最多 3 格，每格以浮點數填充）。三段式 HUD 會顯示部分電量，滿格的段落發光，儲滿時 NITRO MAX 會閃動（在舒適／減少動態模式下會抑制動態）。賽道上的道具（藍色電池 +0.25、橘色罐子 +0.5、空中金色油槽 +1、一個可填滿到上限的彩虹過充）遵循與光環相同的規則：起跑格上每輛車 5 個欄位，每個欄位為 1 到 4 個一組（該欄位的道具，再加上沿其路線每隔 8 m 的電池），外加過充以及每條捷徑的獎勵路線，每場比賽都會重新抽選；每一項 NITRO 獎勵（道具、飄移、桶滾、光環、氣流跟車）也會回充飛行電量（每儲存 0.25 = +5；過充不給），超過上限的部分會轉為電量（每 0.25 = +8）。一格提供 2.5 秒、速度上限提高 30 m/s、更強的加速、排氣與鏡頭回饋；再按一次可延長 2 秒但不疊加速度，因此連按三次可串成 6.5 秒的爆發。NITRO 期間碰到車流會保留 70% 的速度，而非 45%。

在地面時速超過 162 km/h 時，煞車 + 轉向會觸發飄移而非硬煞車：只損失 3 m/s²，擦身而過的連擊分數加倍，放開時依飄移時間給予 NITRO 與小幅 boost（1 秒：+0.15 與 0.5 秒，2 秒：+0.3 與 0.8 秒，3 秒：+0.5 與 1.2 秒）。車身偏擺 25°，煙霧與藍／橘／紫色火花顯示等級，輪胎尖嘯聲逐漸增強，HUD 會標示飄移／小幅 boost 狀態。升空、掉進缺口，或撞上車輛或護欄都會失去累積。

NITRO 不消耗電量，因此 Fly + NITRO 永遠可以同時使用（Fly + Boost + NITRO 仍維持每秒 22 的 AIR DASH 消耗）。

**空中特技**：飛行時，快速甩動轉向（0.3 秒內兩次相反方向的按壓）會開始 0.7 秒的桶滾。以低於 11 m/s 的速度降落並完成桶滾可獲得 +0.25 NITRO；較重的降落（無動力下墜約 9 m 或更高）則失去獎勵。過早降落、撞到任何東西、隧道頂或缺口都會取消桶滾。車子會旋轉（減少動態與 Comfortable VFX 會保留文字但取消旋轉），HUD 顯示 TRICK，BARREL ROLL / TRICK +0.25 / HARD LANDING 的提示、一聲呼嘯，以及觸控裝置上的短暫觸覺震動，標示出桶滾與其獎勵。

**捷徑**：每條賽道都有一條位於邊緣車道上方 6 m 的空中通道，標示為 SHORTCUT / FLY HIGH。在通道內，飛行不消耗電量，速度上限提高 12 m/s；通道兩側排滿 NITRO 電池，中途放有一個油槽，但交錯的塔柱算作撞擊障礙。以賽道主題色呈現的半透明平台標示出通道地板；在其中，HUD 顯示 SHORTCUT，飛行預算顯示 ∞（BOOST 仍會消耗電量）。

### Rings

每場比賽每輛起跑格上的車有 5 個光環欄位（單人跑 5 個，滿編八車起跑格 40 個；Circuit 則為每圈），從起點到終點分佈，每段等長的道路一個，每組 3 到 5 個。在平坦路面上（遠離隧道、缺口、捷徑與其他路段），約五分之一的欄位會變成一串 6 個、間隔 25 m、沿中間車道（第 2 或第 3 車道，因此直線行駛即可串起每個光環）排列的光環，多數在路面上，五分之一在空中，後者自成一個 PERFECT LINE；約十二分之一的欄位會變成全寬的一排，路面上任何車輛都能通過，每輛車算一個光環。風險光環與前兩個欄位維持單一個。Endless 每 500 m 區塊有三個單一光環、一串中間車道光環、每三個區塊一排全寬光環，以及五組道具。它們的位置每場比賽都會重新抽選。Coast 的閘門線維持在 x 2.5。只有當車子穿過光環可見的半徑時才算數；擦到邊緣不算。種類：青色電量（+20 電量）、金色 nitro（+0.5）、紫色氣流跟車（3 秒小幅 boost）、紅色風險（較小的光環，+1 NITRO 與 500 分）以及彩虹神秘（依種子隨機決定一種效果：護盾 10 秒或直到第一次受擊、磁鐵 5 秒、穿透車流的幽靈 3 秒，或將對手凍結為半速 2 秒）。收集到的光環會爆開一次後消失。清空整組光環會播報 PERFECT LINE 並獲得 +1 NITRO；漏掉一個光環會中斷這個組合，但保留已經獲得的獎勵。

### 對手、氣流跟車與最後衝刺

緊跟在對手或車流車輛後方 1.5 秒，可獲得速度上限 +6 m/s 與 +0.25 NITRO（離開氣流才會重新啟用）。對手也會使用 NITRO，各有兩格，依個性而定：NOVA 從 8 秒起穩定施放，之後每 18 秒一次，ORBIT 在飛行時施放，APEX 則從比賽 75% 處起猛然加速。輕微的橡皮筋機制（超出 50 m 後速度最多 ±4%）讓比賽保持緊張。最後 500 m 時，比賽音樂會加速到 115%，狀態列會顯示與前後最近對手的差距（`FINAL 500 M · +N m · −N m`）。

### 已儲存資料

所有存檔都使用 try/catch，因此即使儲存空間被封鎖，遊戲仍能執行。`skyline-rush-history`：每場完賽一筆紀錄，保留最近 50 筆，包含 `fuelOuts`（飛行電量用盡的次數）與 `gapFalls`，用於調整飛行平衡。從開始或結果畫面開啟 **History**，可依賽道篩選、查看最佳行程與最近十次時間的圖表，並點擊某次行程查看詳情。`skyline-rush-best-tracks`：每條賽道的最佳時間；舊的單一 `skyline-rush-best` 會一次性遷移到 `coast`，並且仍會為 coast 寫入。`skyline-rush-unlocked`：賽道解鎖，即使較舊的行程已離開 History 仍會保留。`skyline-rush-keymap`：按鍵綁定。`skyline-rush-controls` 與 `skyline-rush-vfx`：駕駛與視覺設定（ghost 開關位於 controls 中）。`skyline-rush-ghosts`：每條賽道一個最佳成績 ghost。`skyline-rush-medals`、`skyline-rush-stars`、`skyline-rush-paint`：附帶獲得日期的獎章、每條賽道的最佳星數、已裝備的塗裝。`skyline-rush-daily`：每日挑戰的行程，最近 50 筆。每個儲存的值在載入時都會經過驗證；任何格式不正確的資料都會被忽略。

### Ghost、每日挑戰、獎章與 Garage

- **Ghost**：每次行程會以每秒 10 次取樣車子的距離、車道位置與高度。在某條賽道創下新的個人最佳時會儲存該次行程，之後在該賽道的比賽中會以半透明藍色車輛顯示。預設為關閉；在 Controls 中開啟 **Show best-run ghost** 即可啟用。
- **每日挑戰**：History 會顯示今日的賽道與修飾條件，依本機日期挑選：禁止飛行、雙倍車流，或僅限金色光環。Canyon 絕不會出現禁止飛行，因為它的斷橋需要飛行。每日行程只會進入自己的排行榜（今日最快的五名）；絕不影響歷史紀錄、最佳時間、解鎖、星數或 ghost。Restart 會保留挑戰，**Choose track** 則離開挑戰。
- **獎章**：First victory（獲勝）、Clean run（無碰撞）、Perfect flight（單場比賽 5 個 PERFECT LINE）與 Triple burst（單次爆發 3 格 NITRO：一次按壓加兩次延長）。只有符合資格的 Classic Race 完賽才能頒發；每個獎章都會保留首次獲得的日期。
- **Garage**：你在每條賽道上的最佳風格星數會累加並解鎖塗裝：3 星解鎖 Aurora、6 星 Glacier、10 星 Coral、16 星 Cobalt、24 星 Obsidian（最多 30 星）。現實中最受歡迎的車色，藍與黑，是長期目標。未解鎖的塗裝仍可預覽。塗裝只改變外觀，絕不改變車輛的能力數值。

### Sky Spiral（實驗性的第五條賽道）

Sky Spiral 新增了一條位於賽博龐克天際線上方、真正的 3D 上升螺旋道路。繞著發光的中央高塔完整行駛一圈水平迴旋，然後從三個專用坡道發射，飛越高架缺口。現有的 FLY、BOOST 與 NITRO 都可在這條新賽道上使用，並提供選用的飛行修正。此賽道使用獨立的彎曲道路算圖器與自己的 3D 路徑對應器；仍在實體行動硬體上進行驗證。

### 賽道與風格

從 Coast 開始。進入前三名可解鎖 Neon Downtown，接著依序是 Canyon Skyway、Aurora Pass、Sky Spiral、Taipei Heritage、Tokyo Afterdark、Alpine Rail Pass、Coastal Horizon 與 Cosmic Orbit。開始前先選好賽道，或向左或向右滑動 3D 預覽（用滑鼠拖曳，或在觸控板上以兩指橫向滑動），像輪播一樣翻到相鄰的賽道：它會跟隨手指，輕輕一彈就夠，第一條與最後一條賽道有橡皮筋效果，並有一個標籤列出賽道名稱與分頁圓點；鍵盤使用者可用 Left/Right 在賽道按鈕之間移動，並用 Enter 選擇。當仍有賽道處於鎖定時，登上頒獎台的完賽會在結果畫面顯示一顆閃動的 **Next** 按鈕，直接開始剛解鎖的賽道；當所有賽道本來就已開放，以及在每日挑戰中，它都不會出現。如果瀏覽器中斷 WebGL 連線（在 iPhone 上鎖定螢幕或切換 App 後很常見），遊戲會在圖形恢復時清除警告；否則 **Start** 或 **Race again** 會重新載入頁面。每條賽道都有自己的天空、色調與程序化生成的景物：下雨的霓虹街道與低矮隧道、紅色沙漠峭壁與斷橋缺口／側風，或有極光與冰面的雪山。警示標誌標示出特殊路段。Aurora 的上坡路段以一半的正常速率回充地面燃料。

### World Tour 賽道、路線圖與賽道名稱

五條 World Tour 賽道共用同一個彎曲道路算圖器（`src/world-tour-scene.js`），並各有專屬的色調、建築與地標（總統府與北門的剪影、霓虹路口與一座鐵塔、鐵路高架橋與山峰、一座燈塔與跨海大橋、帶環的行星）。在首頁選擇某條 World Tour 賽道時，會在懸浮的車輛後方框出其標誌性地標：總統府、Tokyo Tower、一座阿爾卑斯山峰、一座燈塔，或宇宙之門。朝著它競速時，路邊會讓該地標保持清楚可見。每張賽道卡片都顯示完整的主要路線，比賽中則有即時地圖在其上標出 YOU、NOVA、ORBIT 與 APEX；空中捷徑永遠不會畫出。在高度低於 500px 的螢幕以及高度低於 700px 的窄版手機上，即時地圖會讓位，排行榜仍會對車手排名。賽道名稱會跟隨以 **EN / 繁體中文** 開關選擇的語言（見下方的 Language）。

風格分數獎勵近距離超車（100 × 連擊，飄移會使連擊加倍）、光環（150，風險光環另加 500）、PERFECT LINE（500）、移動中的滯空時間（每秒 10）以及每 500 公尺的乾淨行駛（100）。碰撞與掉入缺口會重設乾淨行駛距離的進度。結果畫面頒發：完賽一星，每公里 250 分兩星，每公里 500 分三星，與完賽名次無關。

燃料與 nitro 條會平順地趨近新的數值，低於 20% 容量時發出警告，回充時閃爍，並在一格 nitro 完成時脈動。Comfort mode 與系統的減少動態效果會停用這些動畫。滑動板在按住時會顯示浮動的圓環／旋鈕，並在比賽開始時顯示簡短提示；放開則讓轉向回到中立。

HUD 使用共用的動態時序（120 / 240 / 480 ms）。速度表指針會隨速度緩動；名次變動時，名次數字會翻轉並附上綠色向上或紅色向下的箭頭，排行榜列則滑入新的位置。精簡的半透明事件提示位於視野中央上方、避開 HUD 面板，並將擦身而過、PERFECT LINE、NITRO 爆發、電量增加與飄移火花等級排入佇列，不會彼此重疊；同時回充飛行電量的 NITRO 獎勵會標示出來（NITRO · +20% CHARGE）。暫停、完賽與重新開始會清空佇列。按鈕在按下時會變暗但不改變大小，因此在邊框以內的任何位置按下都會被接收；按住中的觸控按鈕保持發亮。在 VFX 設定中的選用 **Haptic feedback** 會在支援的觸控裝置上，為碰撞、NITRO 與飄移獎勵提供回饋。Comfort mode 與系統的減少動態效果會保留文字與按下狀態的顏色，同時移除新增的動態與震動。

### Language

整個介面提供英文與繁體中文（繁體中文）：開始畫面、Garage、History、HUD、比賽提示、結果、路線圖、設定與 3D 路標。開始畫面賽道卡片下方的一個 **EN / 繁體中文** 開關會一次切換全部，不需要重新載入。語言依下列順序決定：

1. 你點擊開關所儲存的選擇（`skyline-rush-locale`；只有在點擊時才會寫入，絕不會由自動偵測寫入）；
2. 你的系統語言順序（`navigator.languages`）：第一個 `en*` 或 `zh*` 項目決定結果，其他語言會被略過（`['ja-JP', 'zh-TW']` 會選擇繁體中文），任何 `zh*` 標籤（zh-TW、zh-HK、zh-Hant、zh-CN、zh-Hans、單純的 zh）都會選擇繁體中文，而清單為空或缺漏時則退回 `navigator.language`；
3. 否則為英文。

品牌與遊戲術語在兩種語言中都維持英文：Skyline Rush、NITRO、FLY、BOOST 以及對手 NOVA、ORBIT 與 APEX。字串位於 `src/locales/`；`src/i18n.js` 負責偵測、`t()` 與目前的語言。

在地化圖片：`node scripts/capture-og-images.mjs` 會在 Chrome 中驅動真實的應用程式，並儲存 `public/og-image.en.jpeg` 與 `public/og-image.zh-TW.jpeg`（1440×900 的開始畫面），以及供繁體中文 README 使用的 `artifacts/{readme-start,readme-hero,mobile-flight,race-results}.zh-TW.jpeg`（`node scripts/capture-og-images.mjs og` 或 `readme` 只執行其中一半）。它絕不會動到英文的 `artifacts/` 截圖。`public/manifest.webmanifest` 與應用程式圖示維持原樣：圖示不含文字，而 web app manifest 只有單一名稱與說明，沒有各語言的變體，因此再加一份 manifest 會破壞可安裝性。

## Verify

```sh
npm test                 # Deterministic simulation, input lifecycle and geometry
npm run build           # Production assets in dist/
npm run test:browser    # Real Chrome: desktop, mobile, graphics errors, full race
npm run test:layout     # Home-screen fit, top bar and touch targets (runs on pre-push)
make run                # All three (test:browser builds first)
make deploy             # Trigger CI checks + GitHub Pages deployment of remote main
make help               # List every make command with its options
```

瀏覽器測試使用已安裝的 Google Chrome，並允許 headless 算圖使用 SwiftShader。僅使用 CPU 的 CI 採用 0.25 的裝置像素比，以維持 3D 場景的流暢度，同時保有相同的 CSS 視埠大小與遊戲斷言；本機測試則以完整解析度算圖。英文 README 截圖僅在檔案缺失時，或以 `UPDATE_ARTIFACTS=1 npm run test:browser` 執行時，才會以 JPEG（品質 70）寫入 `artifacts/`，因為即時 3D 場景每次執行都不同；測試追蹤／結果檔會被忽略。完整衝刺測試在快速的機器上約需一分鐘，軟體算圖拖慢模擬時則更久。

```sh
npm run preview         # Serve the production build after npm run build
```

要在手機上檢查，請在你的網路上提供建置（`npx vite preview --host 0.0.0.0`），並以 `?perf` 開啟（例如 `http://<computer-ip>:4173/?perf`）。頂端隨即出現一條橫帶，顯示過去 20 秒內的比賽影格時間：中位數（p50）、第 95 百分位（p95）、平均 fps 與取樣長度。沒有 `?perf` 就不會量測或顯示任何東西。

```sh
make perf BASE=main         # A/B in Chrome at 412×915, CPU throttled 6× (RATE=20 for a low-end phone), 3 alternating rounds
make perf BASE=main VIEWPORT=desktop  # The same A/B at 1440×900 desktop size
make perf-phone             # Like make phone: asks base version, Tailscale/Wi-Fi and Telegram; logs phone temperatures
```

`make perf` 會建置此工作目錄，並在給定 `BASE=<git ref>` 時也建置該 ref（位於 `.claude/worktrees/perf-<sha>`，下次會重複使用），每次跑 Coast 24 秒，並印出每次執行的橫帶以及每個建置的中位數。`make perf-phone` 對於未傳入的項目，會以與 `make phone` 相同的方式詢問（`BASE=`、`VIA=tailscale|wifi|auto`、`TG=0`），為每個建置印出並傳送到 Telegram 一個 `?perf` 網址，在任何以 USB 連接的 Android 手機上以 Chrome 開啟第一個（透過 `adb reverse`，因此任何網路都可行），在按下 Ctrl+C 時傳送網址已失效的通知，並每 10 秒記錄手機的感測器溫度與降頻等級（`dumpsys thermalservice`），連同 Mac 的熱警告等級，直到按下 Ctrl+C。請只在相同的降頻等級下比較執行結果：發熱的手機會降頻並掉格，與建置無關。iPhone 不回報溫度。

## Deploy

在 [https://weskao.github.io/skyline-rush/](https://weskao.github.io/skyline-rush/) 遊玩。此網站為公開：訪客不需要 GitHub 帳號或 Tailscale，開發者的電腦也可以離線。

```sh
git tag v0.4.0 && git push origin v0.4.0   # Release: deploys once CI confirms the commit already passed on main
make deploy                              # Deploy remote main manually through the same CI flow
# The on-screen version (ready screen, desktop and mobile) is `package.json`'s version; `/release` bumps it
# after scripts/release-gate.sh has seen a green CI run for the commit on main.
```

CI（`.github/workflows/ci.yml`）會在推送到 `main`、`develop`、pull request、版本標籤推送（`v*`）與手動執行時，建置並執行單元與 Chrome 瀏覽器測試。瀏覽器測試分成 13 個平行分片執行，World Tour 長跑測試則分成 5 個，依 `tests/ci-durations.json` 中量測到的單項測試時間來平衡（`scripts/ci-shards.mjs`），且僅在 `main` 與 `develop` 上執行（其他分支只執行單元與雲端存檔檢查，除非 commit 訊息帶有 `[full-regression]` 或手動執行要求），並且對同一分支的較新推送會取消被它取代的執行。在任何分支上，若推送或 pull request 只更動 `src/`、`public/`、`tests/`、`scripts/` 與 `.github/` 之外的 Markdown、文字、圖片、影片或 `Makefile`，且其父 commit 已在該分支通過 CI，就會略過所有測試套件（`scripts/ci-changes.mjs`）。手動執行會在所有檢查通過後發布；版本標籤推送會重新執行單元測試，確認（`release-verified`）被標記的程式碼已在 `main` 上通過完整測試套件，而不是重新執行瀏覽器測試套件，然後發布並驗證公開網站。標記在 CI 從未於 `main` 上通過的 commit 上，不會被部署。一般的分支推送與 pull request 只執行檢查。推送到 `main` 時，若其中一個 merge commit 合併的不是 `develop` 或 `hotfix/*`，`main-merge-source` 工作（`scripts/check-main-merges.sh`）也會失敗，而該紅燈執行會阻擋發布。Pages 建置使用 `--base=/skyline-rush/`，讓腳本、樣式與字型從專案網址載入。GitHub Pages 必須使用 **GitHub Actions** 作為發布來源。手動部署需要已驗證的 GitHub CLI（`gh auth login`）；請先推送你的 commit，因為 `make deploy` 使用的是遠端 `main`。部署不再依賴本機的 pre-push hook 或 Netlify 登入。當推送、標籤或手動執行中的任何檢查或部署失敗時，`notify-telegram` 工作會把失敗執行的連結傳送到 Telegram；它需要儲存庫密鑰 `TELEGRAM_BOT_TOKEN` 與 `TELEGRAM_CHAT_ID`（各以 `gh secret set <NAME>` 設定，會提示輸入值），缺少時則靜默略過。

連結預覽圖片是 `public/og-image.jpeg`，為 `public/og-image.en.jpeg` 的複本；`node scripts/capture-og-images.mjs og` 會擷取兩種語言的封面並更新該複本。爬蟲無法切換語言，因此 `index.html` 只引用英文封面（搭配 `og:locale` `en_US` 與 `og:locale:alternate` `zh_TW`），而 `public/og-image.zh-TW.jpeg` 是它的中文孿生版本，供直接連結使用。更換封面之後，請提高 `index.html` 中 `og:image` 的 `?v=`，讓社群網站抓取新的圖片。

## Project

- `src/game.js`：確定性的街機模擬、對手、車流與完賽順序。
- `src/input.js`：鍵盤與多指標控制，含取消與失焦清理；讀取已儲存的按鍵對應。
- `src/key-map.js`：純粹的按鍵對應，含 E / X NITRO、衝突互換式的重新綁定、驗證與儲存。
- `src/history.js`：已儲存的遊戲資料：比賽歷史（最近 50 筆）、每條賽道的最佳成績與舊資料遷移、Career 統計、獎章、星數、已裝備的塗裝、ghost 與每日排行榜。
- `src/ghost.js`：10 Hz 的 ghost 錄製、依賽道的驗證與內插播放。
- `src/appearance.js`：塗裝目錄與星數解鎖門檻。
- `src/rng.js`：以種子產生的隨機串流；道具與光環來自每場比賽的配置種子（測試與工具中則為賽道種子）。
- `src/world.js`、`src/geometry.js`：Three.js 算圖器、程序化生成的車輛、公路、天際線、飛行效果與鏡頭。
- `src/effects.js`：固定的 480 顆粒子 GPU 池，用於蒸氣、火花與降落塵土。
- `src/track-paths.js`、`src/world-tour-scene.js`：每條賽道一份距離到道路的對應，以及共用的 World Tour 道路、景物與地標。
- `src/route-map.js`、`src/i18n.js`：SVG 的完整路線圖與即時車手地圖；語言偵測、已儲存的選擇、`t()` 與英文／繁體中文的賽道名稱；`src/locales/` 存放語系目錄。
- `scripts/capture-og-images.mjs`：從真實應用程式擷取英文與 zh-TW 的封面圖片，以及 zh-TW 的 README 截圖。
- `scripts/pickup-economy.mjs`：由腳本驅動的機器人跑遍每條賽道，並印出每分鐘的 NITRO、BOOST 佔比、燃料耗盡次數與第一次 NITRO 的時間；`tests/pickup-economy.test.js` 鎖定光環與道具的配置。
- `scripts/ci-shards.mjs`：`plan` 為每個 CI 分片提供其 Playwright 的 `--test-list`，依時長打包測試，讓每個分片大約在同一時間完成；`refresh <run-id>` 會在測試套件大幅變動後，根據某次 CI 執行的日誌重寫 `tests/ci-durations.json`。
- `src/App.vue`、`src/icons.js`：Vue 3 的 UI 外殼（開始畫面、HUD、面板、觸控按鈕）及其共用的 SVG 圖示；只算圖一次，沒有響應式狀態。
- `src/main.js`、`src/style.css`：掛載 `App.vue`、串接各畫面控制器，並執行比賽生命週期（開始、暫停、重新開始、結果）與影格迴圈。
- `src/*-ui.ts`：每個畫面區域一個 TypeScript 控制器（比賽選擇、雲端存檔、觸控操作、按鍵對應、VFX、音訊、歷史對話框、拍照模式）。
- `src/race-hud.ts`、`src/race-hud-modes.ts`：比賽中的 HUD，於每個 HUD tick 以命令式方式寫入。
- `src/race-results.ts`、`src/result-screen.ts`、`src/session-progress.ts`：記錄一場完成的比賽（最佳成績、解鎖、獎章、ghost）並顯示其結果畫面。
- `vite.config.js`：搭配 `@vitejs/plugin-vue` 的 Vite。
- `src/perf.js`：供 `?perf` 裝置檢查讀數使用的影格時間百分位數。
- `src/audio.js`：合成的音效與循環的音樂定序器；歌曲位於 `src/music-tracks.ts`，比賽到音效的事件位於 `src/race-audio-events.ts`。
- `src/audio-settings.js`：從 `localStorage` 讀取已儲存的音樂／音效開關與音量，以及滑桿的「靜音保留音量」規則。
- `tests/`：單元與瀏覽器行為測試。`tests/module-size.test.js` 讓每個原始碼模組維持在 400 行以內（較舊的大型檔案有只會下降的上限）。
- `docs/design.md`、`docs/verification.md`：範圍與驗證證據。
- `README.zh-TW.md`：本檔案的繁體中文翻譯，由 `scripts/readme-zh.mjs` 保持更新（`check`、以 `claude -p` 翻譯的 `sync`，以及手動編輯後的 `stamp`）。`.githooks/pre-commit` hook 會在 commit 更動 README.md 時重新產生它（以 `SKIP_README_ZH=1` 略過一次），`.githooks/pre-push` 會在推送的 commit 更動首頁（`index.html`、`src/App.vue`、`src/main.js`、`src/style.css`、`src/locales/`；以 `SKIP_LAYOUT_GATE=1` 略過一次）時執行 `npm run test:layout`，而 `.githooks/main-merge-guard`（由 `pre-merge-commit` 與 `pre-commit` 執行）會拒絕將 `develop` 或 `hotfix/*` 以外的任何分支合併進 `main`（fast-forward 不會執行任何 hook，因此請使用 `--no-ff`；以 `ALLOW_MAIN_MERGE=1` 略過一次）；`make` 會以 `git config core.hooksPath .githooks` 啟用這些 hook。`.claude/settings.json` 中的 Claude Code Stop hook，會在某一回合編輯了 README.md 卻沒有同步更新它時，讓 Claude 回頭去更新。

所有車輛／景物的幾何與效果都由程式碼產生。Barlow Condensed 依 SIL Open Font License 打包於 `public/fonts/OFL.txt`。Three.js、Vue、Vite 與 Playwright 保留各自的套件授權。

原始碼：[weskao/skyline-rush](https://github.com/weskao/skyline-rush)。單人、十條賽道、街機物理。瀏覽器驗證涵蓋桌機 Chrome 與模擬的行動視埠；iOS Safari 已在 iOS Simulator 中檢查（直向與橫向，Coast 與 Neon），但實體手機上的影格率尚未量測（請使用 `?perf`，見 Verify）。
