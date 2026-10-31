<!-- source-sha256: 62ed052c977ab9f703af4508bedd31b4b3e7c947a6279a0480ee1fccf7dc2542 generated from README.md by scripts/readme-zh.mjs; edit README.md, then run the script -->
# Skyline Rush

[English](README.md) · **繁體中文**

[**Play Skyline Rush →**](https://weskao.github.io/skyline-rush/)

這是一款可遊玩的 3D 海岸公路衝刺遊戲，主角是一輛會飛的電動跑車，造型以 Tesla Roadster 2 及其火箭推進器概念為藍本。駕駛者可憑藉四具藍色推進器升空，與三名對手競速，飛越車流，管理電量並降落補充能量。操控手感屬於虛構的街機物理；本專案為非官方的粉絲作品，與 Tesla 或 SpaceX 無任何關聯。

## 遊戲介紹

在經典賽（Classic Race）中，Skyline Rush 是一場可在瀏覽器中反覆挑戰的短程街機衝刺：一名玩家對上三名對手，以及穿梭其間的車流，桌機或手機皆可，無需安裝任何軟體。其他模式提供單人駕駛、自訂規則與多階段挑戰。

- **先開車，再飛行。** 時速超過 65 km/h 後，按住 FLY 即可升空，飛越車流、穿過光環、跨越斷橋。飛行與 BOOST 共用同一份推進器電量，而且只有在路面上才會回充，因此每一次爬升都是一次抉擇。
- **靠好的駕駛賺取 NITRO。** 近距離超車、飄移、連續光環（PERFECT LINE）、尾流、落地桶滾以及拾取道具，都會填滿三格 NITRO 儲備；可一次爆發用完，也可連續按壓延長持續時間。
- **十條賽道，依序解鎖。** 黃昏的 Coast、下著雨且有低矮隧道的 Neon Downtown、有斷橋缺口與側風的 Canyon Skyway、有冰面與上坡爬升的 Aurora Pass、擁有跳躍坡道與斷裂天橋的 360° 高架螺旋 Sky Spiral，接著是世界巡迴賽：Taipei Heritage、Tokyo Afterdark、Alpine Rail Pass、Coastal Horizon 與 Cosmic Orbit。每條賽道都有一條空中捷徑，留給能在空中穩住路線的玩家。
- **值得追逐的目標。** 每次完賽都會獲得風格星星，用來解鎖車庫（Garage）中的塗裝。最佳成績幽靈、擁有專屬排行榜的每日挑戰，以及四枚獎章，讓你有理由一再挑戰。

一場經典衝刺約一分鐘；多階段挑戰則需要更久。音效在瀏覽器中即時合成，進度則儲存在本機儲存空間，因此不需要帳號或後端伺服器。

**首頁畫面** — 選擇賽道與鏡頭角度，然後開始比賽。

https://github.com/user-attachments/assets/059aba91-65b2-4b0b-9abd-15461fcb1623

**比賽中** — 在其中一條賽道上完整跑完一場。

https://github.com/user-attachments/assets/e0ddb94c-794e-49ab-9b66-51cb5150f101

![Gameplay demo: countdown, lift-off over traffic and touchdown on Coast](artifacts/readme-demo.gif)

![Start screen with the audio settings open](artifacts/readme-start.zh-TW.jpeg?v=20261024a)

![Skyline Rush in flight](artifacts/readme-hero.zh-TW.jpeg?v=20261024a)

![Mobile portrait layout while ascending](artifacts/mobile-flight.zh-TW.jpeg?v=20261024a)

![Race results with a new personal best](artifacts/race-results.zh-TW.jpeg?v=20261024a)

### 手機截圖與示範

可用直向或橫向搭配觸控操作遊玩。影片從開始畫面出發，跟隨一場 Coast 賽事，經過倒數、FLY 升空到降落；AUTO 會持續按住油門。

**直向 — 準備開賽**

![Mobile portrait start screen with track selection and touch-friendly race buttons](artifacts/mobile-home.jpeg)

**橫向 — 以觸控操作飛行**

![Mobile landscape flight with FLY held and the touch controls visible](artifacts/mobile-landscape-flight.jpeg)

**觸控遊玩示範** · [Watch the MP4](artifacts/mobile-demo.mp4)

![Mobile touch gameplay: Coast countdown, FLY lift-off and landing](artifacts/mobile-demo.gif)

擷取自執行中的遊戲，使用 Chrome 行動裝置模擬，解析度為 390×844（直向）與 844×390（橫向），並使用全新的示範用設定檔。這些擷取畫面並不代表實體手機的效能表現。

## 遊戲模式與重玩性（開發分支）

> **進行中 · 2026 年 10 月 29 日。** 這些模式新增內容整合在 `feature/roadmap-integration` 開發分支上，尚未合併至 `main`，也未包含在[已部署的 GitHub Pages 版本](https://weskao.github.io/skyline-rush/)中。

選擇一條**已解鎖的賽道**，在賽道卡片下方選擇 **GAME MODE**，需要時展開規則說明，然後按下 **Start race**（或 Enter）。比賽仍使用相同的 Three.js 道路、飛行、FLY / BOOST / NITRO 與響應式觸控操作。開發分支包含以下模式：

| Mode | What changes | Win condition / progression |
| --- | --- | --- |
| **Classic Race** | 在 10 條賽道之一進行標準的 3 名對手衝刺，包含車流、捷徑、光環與 NITRO。 | 登上頒獎台可解鎖下一條賽道；只有經典賽會授予生涯星星、獎章與正式最佳成績。 |
| **Custom Race** | 可選擇 **0–3 名對手**、Easy / Normal / Hard 的 AI、Off / Light / Normal / Heavy 的車流、NITRO 道具開／關，以及 Normal / Relaxed 的碰撞懲罰。有五種預設：Standard、Traffic Rush、No Items、Air Focus 與 Precision。 | 非排名成績有獨立的歷史紀錄。可進行 **1 / 2 / 3 / 5 個衝刺階段**並比較總時間。各階段重複同一段點對點路線；它們**不是環形賽道的圈數**。 |
| **Free Drive** | 獨自探索任何已解鎖的賽道，可調整道路車流與道具，沒有名次，也沒有強制的勝利條件。 | 自由駕駛、飄移與飛行，直到道路盡頭；抵達終點後會以結果畫面結束本次行程，不儲存任何紀錄。這**不是**無限世界模式。 |
| **Time Attack** | 單人計時衝刺，提供相容的最佳成績幽靈與領先／落後分段時間。可選擇開啟 **Clean Time Trial**。 | 依賽道與規則分別記錄最佳時間；若 Clean 跑法發生任何碰撞，成績即作廢，不會取代個人最佳。 |
| **Obstacle Run** | 以種子產生的路邊障礙物；密度分為 **Standard** 或 **Extreme**。部分障礙物會橫向移動；警示 HUD 會預告即將出現的危險。 | 閃避障礙、以乾淨通過賺取風格分數，並沿用一般路線的終點。障礙物的配置與碰撞共用確定性邏輯；Classic 不受影響。 |
| **Checkpoint Rush** | 穿越發光的 3D 關卡拱門。開局擁有 **28 秒**；每通過一道乾淨的關卡可獲得 **+10 秒**（上限 60 秒）與 **250 風格分數**。 | 在時間耗盡前通過所有關卡並抵達終點。漏掉關卡與超時**不會**儲存有效的最佳成績。HUD 會顯示已通過的關卡數、剩餘時間，以及到下一個目標的距離。 |
| **Championship Cup** | 選擇由已解鎖路線組成的 **3 或 5 條賽道**盃賽；在每個分站與 NOVA、ORBIT 和 APEX 競速。 | 名次依序獲得 **10 / 7 / 5 / 3 分**；累計積分與總時間決定冠軍，同分時以時間較短者勝。盃賽結果與生涯解鎖各自獨立。 |
| **Stunt Attack** | 為期 **120 / 180 / 300 秒**的風格賽程，包含連續多場分組賽：飄移、空中特技、險些擦撞與光環可累積連擊分數。 | 由計時器結束整個賽程，而不是終點線；每種時長各有一枚本機風格獎章與最佳分數。 |
| **Elimination** | 四人的最後駕駛生存賽：每十秒淘汰目前排名最後的駕駛。 | 存活到成為最後一名駕駛；若被提前淘汰，本次行程即結束且沒有獎勵。 |

### 盃賽復原

未完成的 Championship Cup 會在首頁提供 **Resume** 或 **Discard**。Resume 會保留已結算的分站積分，只重新開始尚未完成的分站；重試僅會回溯正在重玩的那一分站。完成或放棄盃賽後，會清除其復原項目。刪除遊戲進度時也會一併移除檢查點，同時保留裝置偏好設定。復原功能使用此瀏覽器的儲存空間，無法還原瀏覽器拒絕儲存的資料。

### 自訂呈現與幽靈

Custom Race 可以重播每一場衝刺分組中最快的相容幽靈。Custom 與 Free Drive 提供 Track / Day / Dusk / Night / Rain / Fog 呈現預設，以及即時的規則摘要。這些外觀選擇不會改變紀錄資格或規則集識別。重試會保留所選的外觀；更換賽道或回到 Classic 則會還原賽道原本的外觀。Photo Studio 關閉時會還原目前比賽的外觀。

### 可選道具與獎勵關卡

Custom 與 Free Drive 提供 **Off / Classic Mystery Rings / Active Items / All Items**。持有的道具只佔一個欄位：按下 **Q** 或點擊 **USE** 啟用，然後等待冷卻。NITRO 與 FLY/BOOST 仍保有各自的操作。All Items 會加入有上限的速度、空中電量與一次碰撞復原關卡；EMP 會短暫減慢附近的對手，在單人遊玩時則轉為 Magnet。復原會保留正式的碰撞次數。Stunt Attack 與 Checkpoint Rush 可另外選擇啟用暫時、不可疊加的 ×2 分數關卡。Classic 的預設維持不變。

### Event Lab Lite v1

**Event Lab Lite** 可在已解鎖的路線上編輯本機的賽道範本，內含障礙物、NITRO 光環與補給。可變更它們的車道與距離、復原／重做／重設編輯，並以文字匯入或匯出經過驗證的賽道。開始時會將賽道編譯為真正的比賽事件；重試會保留賽道與種子。賽道成績與生涯及 Custom 紀錄各自獨立。錐形路障、自製坡道、檢查點編輯與社群分享仍不在這個初版範圍內。

### Endless Highway

**Endless Highway** 讓 Coast 延伸超出原本設計的終點，成為一場以距離為目標的生存賽事。車流難度會上升至固定上限；五次碰撞會結束一次完成的挑戰。個人紀錄追蹤最長的絕對距離，與生涯及幽靈分開記錄。暫停與 WebGL 復原都會保留本次行程。此初版僅支援 Coast；其周邊景物與事件使用有上限的物件池。

### Circuit Race

**Circuit Race** 新增 Harbor Circuit，這是一條獨立、隨時可進入的 2 公里封閉環形賽道，圈數可選 **1 / 3 / 5 圈**。依序通過每個區段才能計為一圈；倒退通過、傳送與復原都無法取得圈數。HUD 與結果畫面會顯示分段時間、上一圈、個人最佳單圈與總時間。單圈最佳成績不會因滾動式的歷史紀錄淘汰而消失；總時間與幽靈則依圈數設定分別記錄。原有的十條點對點路線維持其地理配置與生涯進度。

### 賽道主題、障礙物與風險路線

- **賽道主題**（在 Custom、Free Drive 與 Obstacle Run 中可選擇啟用）為每條路線帶來專屬的危險：Coast 的貨物與陣風、Neon 的道路施工、Canyon 的落石、Aurora 的雪堆、冰面與暴風雪、Sky Spiral 的能量關卡、Taipei 的慶典路障、Tokyo 的號誌關卡、Alpine 的雪崩、Coastal 的浪花飛沫，以及 Cosmic 的能量牆。危險會提前預警，永遠保持兩條車道暢通，也絕不會改變 Classic。
- **Obstacle Run** 提供 **Mixed obstacles** 賽程：橫向掃過的關卡、墜落的碎片，以及路障上方的圓環，獎勵飛越或繞行的玩家。
- **風險路線**：高風險光環與近距離超車在 Custom Hard 中給予更多回報，也可關閉以進行輕鬆練習。
- 道路新增了非實體的路邊生活景象：觀眾、廣告看板、服務廂型車、鐵路月台、行駛中的列車、船隻與無人機。較低的畫質設定會減少繪製這些內容。

### 賽事設定、結果與無障礙

- 模式與賽道選擇仍可透過鍵盤與觸控操作；情境面板只會顯示與所選模式相關的選項。無法使用的盃賽會說明仍需要多少條賽道。
- HUD 會依模式調整：單人賽事會隱藏容易誤導的對手名次；多階段與盃賽會顯示分站進度；Checkpoint Rush 會顯示即時的關卡倒數；Obstacle Run 會警告逼近的障礙物；Clean Time Trial 會明確標示成績已作廢。
- 練習、Custom、Time Attack、Obstacle、Checkpoint 與盃賽的結果使用獨立的 `skyline-rush-mode-history-v1` 紀錄鍵。符合資格的練習幽靈有各自儲存的規則集；Classic 的解鎖、星星、獎章、每日紀錄與正式時間不會受到練習成績影響。
- 在 **History → Challenge records** 中，可依模式篩選，查看每個確切賽道／規則集的個人最佳與符合資格的 Time Attack 幽靈。即使最近 50 場紀錄輪替掉，終身最佳仍會儲存在 `skyline-rush-mode-bests-v1` 之下。挑戰紀錄明確地不屬於生涯獎章或星星。
- 模式標籤、結果說明、設定選項與危險警告支援英文與繁體中文。低畫質、觸控操作與減少動態效果仍屬於驗證計畫的一部分。

### 真實遊戲截圖與驗證

用來檢視這些模式的截圖是**從執行中的瀏覽器遊戲**擷取，而非概念圖。[下載實際的 Playwright 擷取畫面集](https://github.com/weskao/skyline-rush/actions/runs/39742666980/artifacts/12410172411)（Custom 單人、Free Drive、Time Attack、Obstacle Run、Extreme 障礙物、Checkpoint Rush 與手機版模式選單）。GitHub Actions 的產出檔可能需要登入且會過期；若要在本機重新產生，請執行 `npx playwright test tests/race-modes-browser.spec.js` 並開啟 `test-results/race-mode-*.png`。CI 截圖為軟體算圖且解析度較低，不代表最終裝置上的畫質。

**驗證：** 每項功能的測試與完整閘門紀錄都列在 `TODO.md` 中。實體 iPhone 與 Android 的檢查仍待進行。

## 在本機執行

需要 Node.js 22.12 或更新版本，以及支援 WebGL 2 並啟用硬體加速的瀏覽器。

```sh
cd "$HOME/Documents/Workspace/skyline-rush"
make         # Installs dependencies on first run, then starts the Vite + Vue dev server
```

開啟 Vite 印出的本機網址（通常是 http://127.0.0.1:5173）。資源與字型皆於本機打包；遊戲過程不會發出任何外部請求。不需要後端或帳號。

`make` 與 `make dev-unlocked` 也會啟動本機的 Firebase Auth/Firestore 模擬器（需要 Java 21+），因此雲端存檔的 Google 登入可搭配假的測試帳號運作，絕不會動到真實存檔。專案擁有者的雲端存檔操作與 Spark 額度檢查，請見 `docs/cloud-save.md`。

`make dev-diag` 與 `make phone-diag` 提供相同的建置版本，但內建螢幕上的診斷橫幅（影格計數器、頁面生命週期與觸控事件及其命中目標，以及跨重新載入保留的最近幾筆未捕捉錯誤），用於在實體手機上追查凍結或按鈕失效的問題。正式建置絕不含此功能：`npm run build` 會拒絕帶有診斷模組的封裝。

`make phone` 會開啟一個終端機選單，用來啟動、檢查或停止可讓手機開啟的開發伺服器（透過 Tailscale 或同一個 Wi-Fi），並在伺服器回應後印出手機網址。選單會列出此工作目錄、其他 worktree 與最近的分支，也可輸入分支名稱；`make phone <name>` 則直接前往該分支（或 `feature/<name>`），必要時會在 `.claude/worktrees/` 下建立其 worktree，而 `make phone off` 會停止它啟動的所有伺服器（等同 `/phone-dev off`）。它提供一般鎖定進度的建置版本；`make phone-unlocked [name]` 是相同的選單，但解鎖所有賽道與塗裝，是手機唯一可連上的全解鎖伺服器（`make dev-unlocked` 與 `make dev-feature` 仍僅限桌機）。它需要個人的 `phone-dev` Claude Code skill（`/phone-dev` 會問相同的選單），且不使用模擬器，因此手機上的雲端存檔登入使用的是真實專案。

## 操控

| Action | Keyboard |
| --- | --- |
| 加速 | W / ↑ |
| 煞車 | S / ↓ |
| 轉向 | A / D 或 ← / → |
| 飛行 | 時速超過 65 km/h 後按住 Space |
| 降落 | 放開 Space |
| 加速推進 | 按住 Shift；消耗推進器電量 |
| NITRO | E / X（一整格電量；NITRO 期間再按一次可延長）。使用 WASD 的玩家用 E；使用方向鍵的玩家則讓左手維持在 Shift / X / Space |
| 飄移 | 時速超過 162 km/h 時按住 S + A / D（僅限地面） |
| 開始 | Enter |
| 暫停／繼續 | Esc / P |
| 重新開始 | Backspace |
| 切換鏡頭 | C |
| 全部音訊靜音／取消靜音 | M |
| 自動油門開／關 | F2 / AUTO 按鈕 |
| AIRFLOW 展示開／關 | V / AIRFLOW 按鈕 |
| 在首頁切換賽道 | 左右滑動或拖曳 3D 預覽，或在觸控板上以兩指滑動 |

手機版面提供轉向、油門、煞車、加速推進、飛行與 NITRO 按鈕。觸控操作支援同時按住多個按鈕。AUTO 會持續按住油門，讓你專心轉向與飛行；煞車永遠優先於它。每個裝置預設皆為開啟；一旦你切換過，你的選擇就會記在此瀏覽器中（`skyline-rush-auto`）。離開分頁會暫停比賽並清除按住中的輸入。比賽中點擊 SKYLINE RUSH 標誌會暫停並先詢問：**Keep racing**、**End race**（回到賽道選擇，本次成績不儲存）或 **Back to home**（重新載入）；無論選哪一個，開始畫面都會重新開啟並停在剛跑過的賽道，且捲動至賽道列的中央（第一條與最後一條賽道位於列的兩端）。按 Esc 會讓比賽停在暫停狀態。鏡頭與音效快捷鍵會保留按住中的駕駛操作。在觸控上，將拇指在轉向板上往下滑會煞車，往下並向側邊滑則會飄移；在 Buttons 模式中，一個較窄的煞車鍵位於轉向按鈕上方，不在拇指平常擺放的那一排，因此只有刻意才會按到；將拇指從 ← 或 → 往上滑入煞車鍵會維持轉向並同時煞車，所以一根拇指就能飄移，再往下滑回即可放開煞車。觸控按鈕會與螢幕角落保持距離，方便拇指觸及，平板則會將它們抬高並放大。

比賽前或暫停時開啟 **Controls**，可調整鍵盤轉向靈敏度或重新對應駕駛操作。選擇一個操作，然後按下一個按鍵；衝突的綁定會互換，固定的快捷鍵保留不可改，按 Escape 可取消擷取。Reset keyboard 會還原預設值。綁定立即生效，並儲存在 `localStorage['skyline-rush-keymap']` 之下。

同一個面板也控制觸控轉向模式、慣用手、滑動靈敏度、尺寸、不透明度，以及按住／切換式的 FLY。**Edit touch layout** 讓你在比賽預覽上拖曳動作按鈕與經典轉向按鈕；**Done editing** 會保留配置，**Reset touch layout** 則會還原。位置會在重新載入後保留、隨慣用手鏡像，並在旋轉後仍位於視窗範圍內。在較矮的橫向螢幕上（高度低於 380 px，例如顯示工具列的 iPhone Safari），開始畫面會省略標語，讓 START RACE 不必捲動即可看到，比賽 HUD 也會隱藏速度表與次要電量列，避免面板互相重疊。

所有音訊皆以 Web Audio 合成；不需要下載任何音訊檔案。背景音樂有兩首循環播放的合成器浪潮曲目：在開始與結果畫面播放的序曲主題（約 64 秒），以及從倒數開始播放、節奏較快的比賽主題（約 55 秒）。每首都會在循環中逐步堆疊，暫停時則會壓低音量。音效涵蓋選單確認、三次倒數滴答與 GO、馬達／風聲、升空與加速推進、煞車、車輛／護欄碰撞、著陸、低電量警告、近距離超車獎勵，以及終點旋律。將音效靜音會停止待播的提示音，暫停則會淡出駕駛音效。低電量警告只有在電量回充到 30% 以上後才會重新啟用。

喇叭圖示會開啟音訊設定，內含 Music 與 Sound effects 兩列，各有一個靜音開關與一個音量滑桿（見上方開始畫面截圖中展開的樣子）。**Mute all**（或 M）會同時讓兩者靜音。靜音會保留各聲道的音量，因此取消靜音後會回到原本的音量；將滑桿拖到零，會以相同方式讓該聲道靜音。兩者預設皆為開啟、音量 100%，每項開／關選擇與音量都會記在 `localStorage` 中（`skyline-rush-music`、`skyline-rush-sound` 儲存 `on`/`off`，另有 `-volume` 變體儲存百分比）；若沒有任何儲存值，兩個聲道皆為開啟，並以 `on` 儲存。在較矮的螢幕上，面板可以捲動。在瀏覽器允許自動播放的情況下，序曲會在頁面載入後立即開始播放。若不允許（首次造訪時的 Chrome 與大多數其他瀏覽器），則由第一次點擊、按下或按鍵來啟動。在 iPhone 與 iPad 上，遊戲會要求媒體播放，因此靜音開關不會讓它無聲；這也會在遊戲進行時暫停其他 App 的音訊。

飛行面板會顯示爬升、巡航、下降與著陸、剩餘推力秒數，以及下一個該使用的操作。青色光環標示出空中走廊，而且屬於遊戲玩法的一部分：請見下方的光環（Rings）。手機版也有一個按住加速推進的按鈕。橘色的碰撞回報會顯示撞擊類型與損失的速度；護欄現在會讓地面上的車輛反彈並減速。飛得高於護欄就能越過。

場景包含泛光照明、日落海面、懸索橋、推進器蒸氣、碰撞火花與著陸漣漪。鏡頭動態與非必要的速度線條會遵循你系統的減少動態效果偏好。音效為推力、碰撞與著陸提供各自獨立的回饋。

**VFX**（右上角）可選擇 Realistic、Cinematic 或 Extreme 的視覺風格、Low / Medium / High 畫質（Low 會關閉泛光並繪製較少的景物）、Comfort 模式（無閃光、晃動、殘影或模糊）以及選用的觸覺回饋；**Fine tuning** 會將每個效果以滑桿呈現，**Reset visual settings** 則還原預設值。**AIRFLOW**（或 V）會將場景切換為空氣動力學展示：車身上的流線、遙測面板、Low drag 或 High downforce，以及駕駛、前方、後方、側面或環繞的鏡頭。開始面板會讓位給展示畫面，只留下橘色的 **START RACE** 按鈕，停靠在車子下方的底部中央；左右滑動場景即可切換賽道。首次開啟 AIRFLOW 時，會有一個動畫指尖示範該手勢。

三盞琥珀色起跑燈會在 GO 時轉為青色。玩家的車是一輛低矮楔形跑車，配有煙燻色的快背式座艙、橫貫整個車寬的紅色尾燈條、四個後推進器噴口、會在加速推進、煞車與飛行時升起的青銅色彈出式尾翼、旋轉的五輻輪圈，以及可轉向的前輪。每名對手都有各自的輪廓與燈光特徵：NOVA 是長尾車，配有雙垂直尾翼與分離式洋紅色車燈；ORBIT 是圓潤的 GT 跑車，有泡泡座艙與圓形青色車燈；APEX 是賽道車，配有前分流器、車頂進氣罩、高大的端板尾翼與琥珀色 C 形車燈。車流則採用直立的通勤車造型。轉向會快速緩入，放開加速推進後車速會逐漸下降，而不是瞬間斷掉。所有駕駛與工具列按鈕都至少有 44px 的觸控目標，包括在 320px 寬度下。

想要額外的電量獎勵，可在時速超過 126 km/h 時於地面貼近超越車流。五秒內連續的乾淨超車最多可連鎖至 ×5，並回充 8–16% 的電量（上限 100%）。碰撞會中斷連鎖；在空中、距離過遠以及復原中的超車不會獲得獎勵。HUD 會播報每次超車與最後 500 公尺；結果畫面會顯示近距離超車與碰撞的總次數。

全推力時，飛行電量約可維持五秒。電量歸零時，車輛會自動下降；放開飛行操作並在地面行駛即可回充。同一份電量也供給加速推進。碰撞會讓車輛減速；飛得夠高就能避開車流。對手與車流遵守相同的碰撞規則：它們會繞過較慢的車輛與玩家，像你一樣撞上道具、護欄與障礙，而撞擊會讓兩輛車都減速並被推開（車流隨後會加速回到巡航速度）。在 NOVA、ORBIT 與 APEX 之前完成衝刺（依賽道不同為 4–8 公里）。個人最佳時間會在儲存空間可用時儲存在此瀏覽器中。

### 操控手感

轉向會在 0.15 秒內升至全幅，且高速時橫向速度上限為 9 m/s。在低於 65 km/h 時按住 Fly 會被記住 1.5 秒，並在速度足夠時自動升空。在空中放開 Fly 會降低下墜加速度（11 → 7 m/s²），讓降落更柔和，並緩慢回充飛行電量（每秒 4，為地面速率的三分之一；電量說明文字顯示 GLIDE RECHARGE ACTIVE）。已耗盡的推進器在放開 Fly 且電量回到 15 後即會重新解鎖，即使在空中也一樣。在距離斷橋 300 公尺以內（Sky Spiral 除外，因為它的坡道會把車直接拋過去），只要剩餘電量以目前速度無法推進越過，HUD 中央就會警告 GAP AHEAD · NEED n% CHARGE。車輛的碰撞寬度為 1.7 公尺，因此更多超車會被算作險些擦撞。護欄的輕微擦碰屬於擦撞（保留 0.92 的速度、被推回路面、不算碰撞、連擊保留）；正面撞擊仍算作碰撞。開啟 AUTO 時，放開轉向也會讓車輛緩緩回到最近的車道中心（車道輔助）。同時按住 Fly + Boost 每秒消耗 22 電量而非 29，維持加速推進的速度上限，並顯示 AIR DASH。

### NITRO 與飄移

NITRO 有自己的儲備（`player.nitro`，最多 3 格，每格以浮點數填充）。三段式 HUD 會顯示部分電量，滿格的區段會發光，充滿時 NITRO MAX 會閃動（在 Comfort／減少動態效果模式下會抑制動態）。賽道上的拾取道具（藍色電池 +0.25、橘色罐子 +0.5、空中金色油槽 +1、一個會填到上限的彩虹過充）依賽道種子擺放；每一次 NITRO 獎勵（拾取道具、飄移、桶滾、光環、尾流）也會回充飛行電量（每儲存 0.25 = +5；過充不提供），超過上限的部分會轉為電量（每 0.25 = +8）。一格提供 2.5 秒，速度上限提高 30 m/s，並有更強的加速、排氣與鏡頭回饋；再按一次可延長 2 秒且不疊加速度，因此連按三次會串成 6.5 秒的爆發。NITRO 期間碰到車流會保留 70% 的速度，而非 45%。

在地面時速超過 162 km/h 時，煞車 + 轉向會變成飄移而非緊急煞車：只損失 3 m/s²，險些擦撞的連擊分數加倍，放開時會依飄移時間給予 NITRO 與小幅加速（1 秒：+0.15 與 0.5 秒，2 秒：+0.3 與 0.8 秒，3 秒：+0.5 與 1.2 秒）。車身偏航 25°，煙霧與藍／橘／紫色火花顯示等級，輪胎尖嘯聲會逐漸增強，HUD 會標示飄移／小幅加速狀態。起飛、掉進缺口，或撞上車輛或護欄都會失去累積。

NITRO 不消耗電量，因此 Fly + NITRO 永遠可以一起使用（Fly + Boost + NITRO 則維持每秒 22 的 AIR DASH 消耗）。

**空中特技**：飛行時，快速的轉向甩動（0.3 秒內連按兩次相反方向）會啟動 0.7 秒的桶滾。以低於 11 m/s 的速度完成並著陸的桶滾可獲得 +0.25 NITRO；較重的著陸（從約 9 公尺以上無動力墜落）會失去獎勵。過早著陸、撞到任何東西、隧道頂或缺口，都會取消桶滾。車輛會旋轉（減少動態效果與 Comfortable VFX 會保留文字但省略旋轉），HUD 顯示 TRICK，而 BARREL ROLL / TRICK +0.25 / HARD LANDING 提示、一聲呼嘯，以及觸控上的短促觸覺震動，會標示桶滾及其獎勵。

**捷徑**：每條賽道都有一條位於邊緣車道上方 6 公尺的空中走廊，標示為 SHORTCUT / FLY HIGH。在走廊內飛行不消耗電量，速度上限提高 12 m/s；走廊兩側排列著 NITRO 電池，中途有一個油槽，但交錯的橋塔會算作撞擊障礙。一片半透明、帶有該賽道主題色的平台標示走廊底面；在其中，HUD 會顯示 SHORTCUT，飛行預算顯示 ∞（BOOST 仍會消耗電量）。

### 光環

5 公里的海岸有 22 個光環，每隔 220 公尺，以 3 到 5 個為一組（依賽道種子擺放）。只有當車輛穿過其可見半徑時才算數；擦到邊緣不算。類型：青色電量（+20 電量）、金色 nitro（+0.5）、紫色尾流（3 秒小幅加速）、紅色風險（較小的光環，+1 NITRO 與 500 分）以及彩虹神祕（依種子隨機的單一效果：護盾 10 秒或直到第一次被撞、磁鐵 5 秒、穿越車流的幽靈 3 秒，或讓對手以半速凍結 2 秒）。收集過的光環會爆開一次後消失。清空整組會播報 PERFECT LINE 並獲得 +1 NITRO；漏掉一個光環會中斷，但會保留已獲得的獎勵。

### 對手、尾流與最後衝刺

緊跟在對手或車流車輛後方 1.5 秒，可獲得 +6 m/s 的速度上限與 +0.25 NITRO（離開尾流後才會重新啟用）。對手也會使用 NITRO，每人兩格，依個性而異：NOVA 從 8 秒開始穩定施放，之後每 18 秒一次，ORBIT 在飛行時施放，APEX 則從比賽 75% 處開始爆發。輕度的橡皮筋機制（超過 50 公尺後最多 ±4% 的速度）讓比賽保持緊張。在最後 500 公尺，比賽音樂會加速到 115%，狀態列會顯示與前後最近對手的差距（`FINAL 500 M · +N m · −N m`）。

### 儲存的資料

所有存檔都使用 try/catch，因此即使儲存空間被封鎖，遊戲仍可執行。`skyline-rush-history`：每場完賽一筆紀錄，保留最近 50 筆，包含 `fuelOuts`（飛行電量耗盡的次數）與 `gapFalls`，用於調整飛行平衡。從開始或結果畫面開啟 **History**，可依賽道篩選、查看最佳成績與最近十次時間的圖表，並點選一場成績查看詳情。`skyline-rush-best-tracks`：每條賽道的最佳時間；舊的單一 `skyline-rush-best` 會一次性遷移到 `coast`，且仍會為 coast 持續寫入。`skyline-rush-unlocked`：賽道解鎖，即使較舊的成績已離開 History 也會保留。`skyline-rush-keymap`：按鍵綁定。`skyline-rush-controls` 與 `skyline-rush-vfx`：駕駛與視覺設定（幽靈開關位於 controls）。`skyline-rush-ghosts`：每條賽道一個最佳成績幽靈。`skyline-rush-medals`、`skyline-rush-stars`、`skyline-rush-paint`：附有獲得日期的獎章、每條賽道的最佳星星，以及已裝備的塗裝。`skyline-rush-daily`：每日挑戰成績，保留最近 50 筆。每個儲存的值在載入時都會驗證；任何格式錯誤的內容都會被忽略。

### 幽靈、每日挑戰、獎章與車庫

- **幽靈**：每場比賽每秒取樣 10 次車輛的距離、車道位置與高度。在某條賽道上創下新的個人最佳，就會儲存該場成績，之後在該賽道上比賽時會以半透明的藍色車輛顯示。預設為關閉；在 Controls 中開啟 **Show best-run ghost** 即可。
- **每日挑戰**：History 會顯示今日的賽道與條件，依本機日期挑選：禁止飛行、雙倍車流，或僅限金色光環。Canyon 永遠不會抽到禁止飛行，因為它的斷橋需要飛行。每日挑戰的成績只會進入專屬的排行榜（今日最快的五名）；絕不會影響歷史紀錄、最佳時間、解鎖、星星或幽靈。重新開始會保留挑戰，而 **Choose track** 則會離開挑戰。
- **獎章**：First victory（獲勝）、Clean run（無碰撞）、Perfect flight（單場比賽 5 次 PERFECT LINE）與 Triple burst（一次爆發用上 3 格 NITRO：按一次加兩次延長）。只有符合資格的經典賽完賽才能獲得；每枚獎章都會記錄首次獲得的日期。
- **車庫**：你在每條賽道上的最佳風格星星會累加，並解鎖塗裝：3 顆解鎖 Aurora、6 顆解鎖 Glacier、10 顆解鎖 Coral、16 顆解鎖 Cobalt、24 顆解鎖 Obsidian（上限為 30）。現實世界中最受歡迎的車色，藍色與黑色，是長期目標。尚未解鎖的塗裝仍可預覽。塗裝只改變外觀，絕不影響車輛的能力數值。

### Sky Spiral（實驗性的第五條賽道）

Sky Spiral 在賽博龐克天際線之上加入了真正的 3D 上升螺旋道路。繞著發光的中央塔樓完整行駛一圈水平迴轉，然後從三座專用坡道起飛，越過高架缺口。現有的 FLY、BOOST 與 NITRO 都可在這條新賽道上使用，並提供選用的飛行修正。這條賽道使用獨立的彎曲道路渲染器與自己的 3D 路徑對應器；目前仍在實體行動裝置上驗證。

### 賽道與風格

從 Coast 開始。名列前三即可解鎖 Neon Downtown，接著依序是 Canyon Skyway、Aurora Pass、Sky Spiral、Taipei Heritage、Tokyo Afterdark、Alpine Rail Pass、Coastal Horizon 與 Cosmic Orbit。開賽前先選擇賽道，或左右滑動 3D 預覽（用滑鼠拖曳，或在觸控板上以兩指橫向滑動），像輪播一樣翻到相鄰的賽道：它會跟著手指移動，輕輕一撥就夠了，第一條與最後一條賽道會有橡皮筋般的回彈，並有一個標籤顯示賽道名稱與分頁圓點；鍵盤使用者可用左／右方向鍵在賽道按鈕間移動，並按 Enter 選擇。當仍有賽道處於鎖定狀態時，登上頒獎台會在結果畫面顯示一個閃動的 **Next** 按鈕，可直接開始剛解鎖的賽道；當所有賽道本來就已開啟，以及在每日挑戰中，它都不會出現。如果瀏覽器中斷了 WebGL 連線（在 iPhone 鎖定或切換 App 後很常見），圖形恢復時遊戲會清除警告；否則 **Start** 或 **Race again** 會重新載入頁面。每條賽道都有自己的天空、色盤與程序化生成的景物：下雨的霓虹街道與低矮隧道、紅色沙漠峭壁與斷橋缺口／側風，或有極光與冰面的雪山。警告標誌會標出特殊路段。Aurora 的上坡路段會以一半的正常速率回充地面燃料。

### 世界巡迴賽賽道、路線地圖與賽道名稱

五條世界巡迴賽的路線共用同一個彎曲道路渲染器（`src/world-tour-scene.js`），並各有專屬的色盤、建築與地標（總統府與北門的剪影、霓虹路口與一座高塔、鐵路高架橋與山峰、一座燈塔與跨海大橋、帶環行星）。在首頁選擇一條世界巡迴賽路線時，畫面會將它的代表性地標框在盤旋的車輛後方：總統府、東京鐵塔、一座高山峰、一座燈塔或宇宙之門。朝它前進時，路邊景物會讓該地標保持清楚可見。每張賽道卡片都會顯示完整的主要路線，比賽中則有一張即時地圖，在其上標出 YOU、NOVA、ORBIT 與 APEX；空中捷徑則從不會被畫出。在高度低於 500px 的螢幕，以及高度低於 700px 的窄版手機上，即時地圖會讓位，而排行榜仍會為賽車手排名。賽道名稱會跟隨以 **EN / 繁體中文** 切換器選擇的語言（見下方語言）。

風格分數獎勵近距離超車（100 × 連擊，飄移會使連擊加倍）、光環（150，風險光環另加 500）、PERFECT LINE（500）、移動中的滯空時間（每秒 10）以及每 500 公尺的乾淨行駛（100）。碰撞與掉入缺口會重設乾淨行駛的進度。結果畫面中，完賽可得一顆星，每公里 250 分得兩顆，每公里 500 分得三顆，與完賽名次無關。

燃料與 nitro 的量條會緩緩趨近新的數值，在容量低於 20% 時發出警告，補充時會閃爍，並在一格 nitro 充滿時脈動。Comfort 模式與系統的減少動態效果會停用這些動畫。滑動板在按住時會顯示浮動的圓環／旋鈕，並在比賽開始時顯示簡短提示；放開後轉向會回到中立。

HUD 使用共用的動態時間（120 / 240 / 480 ms）。速度表指針會隨速度緩動；名次變動時，名次數字會翻轉並附上綠色向上或紅色向下的箭頭，排行榜的列會滑入它們的新位置。精簡的半透明事件提示位於畫面中央上方，避開 HUD 面板，並將險些擦撞、PERFECT LINE、NITRO 爆發、電量增加與飄移火花等級排入佇列，不會互相重疊；同時回充飛行電量的 NITRO 獎勵會標明這一點（NITRO · +20% CHARGE）。暫停、完賽與重新開始會清空佇列。按鈕在按下時會變暗但不改變大小，因此在邊框以內任何位置按下都會生效；按住中的觸控按鈕會維持亮起。VFX 設定中的選用 **Haptic feedback** 會在支援的觸控裝置上，為碰撞、NITRO 與飄移獎勵提供觸覺訊號。Comfort 模式與系統的減少動態效果會保留文字與按下狀態的顏色，同時移除新增的動態與震動。

### 語言

整個介面皆提供英文與繁體中文（繁體中文）：開始畫面、車庫、History、HUD、比賽提示、結果、路線地圖、設定，以及 3D 路標。開始畫面賽道卡片下方的一個 **EN / 繁體中文** 切換器會一次更換所有內容，無需重新載入。語言依以下順序決定：

1. 你點擊切換器所儲存的選擇（`skyline-rush-locale`；只有在點擊時才會寫入，絕不會來自自動偵測）；
2. 你的系統語言順序（`navigator.languages`）：第一個 `en*` 或 `zh*` 項目決定結果，其他語言會被略過（`['ja-JP', 'zh-TW']` 會選擇繁體中文），任何 `zh*` 標籤（zh-TW、zh-HK、zh-Hant、zh-CN、zh-Hans、單純的 zh）都會選擇繁體中文，清單為空或缺少時則退回 `navigator.language`；
3. 否則使用英文。

品牌與遊戲術語在兩種語言中皆維持英文：Skyline Rush、NITRO、FLY、BOOST，以及對手 NOVA、ORBIT 與 APEX。字串位於 `src/locales/`；`src/i18n.js` 負責偵測、`t()` 與目前的語言。

在地化圖片：`node scripts/capture-og-images.mjs` 會在 Chrome 中驅動真實的應用程式，並儲存 `public/og-image.en.jpeg` 與 `public/og-image.zh-TW.jpeg`（1440×900 的開始畫面），以及供繁體中文 README 使用的 `artifacts/{readme-start,readme-hero,mobile-flight,race-results}.zh-TW.jpeg`（`node scripts/capture-og-images.mjs og` 或 `readme` 只執行其中一半）。英文的 `artifacts/` 截圖絕不會被它改動。`public/manifest.webmanifest` 與應用程式圖示維持原樣：圖示不含文字，而 Web App Manifest 只有單一名稱與描述，沒有各語系的變體，因此再放一份 manifest 會破壞可安裝性。

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

瀏覽器測試使用已安裝的 Google Chrome，並允許無頭算圖使用 SwiftShader。僅有 CPU 的 CI 使用 0.25 的裝置像素比，以保持 3D 場景的回應速度，同時維持相同的 CSS 視窗尺寸與遊戲斷言；本機測試則以完整解析度算圖。正常遊玩時使用瀏覽器可用的 GPU。英文版 README 截圖僅在檔案不存在時，或以 `UPDATE_ARTIFACTS=1 npm run test:browser` 執行時，才會以 JPEG（品質 70）寫入 `artifacts/`，因為即時 3D 場景每次執行都不同；測試追蹤檔與結果則被忽略。完整衝刺測試在快速的機器上大約需要一分鐘，軟體算圖拖慢模擬時則會更久。

```sh
npm run preview         # Serve the production build after npm run build
```

要在手機上檢查，請在你的網路上提供該建置版本（`npx vite preview --host 0.0.0.0`），並加上 `?perf` 開啟（例如 `http://<computer-ip>:4173/?perf`）。頁面頂端會出現一條列，顯示過去 20 秒的比賽影格時間：中位數（p50）、第 95 百分位數（p95）、平均 fps 與取樣長度。沒有 `?perf` 時，不會進行任何量測或顯示。

```sh
make perf BASE=main         # A/B in Chrome at 412×915, CPU throttled 6× (RATE=20 for a low-end phone), 3 alternating rounds
make perf BASE=main VIEWPORT=desktop  # The same A/B at 1440×900 desktop size
make perf-phone             # Like make phone: asks base version, Tailscale/Wi-Fi and Telegram; logs phone temperatures
```

`make perf` 會建置此工作目錄，若有 `BASE=<git ref>` 也會建置該 ref（位於 `.claude/worktrees/perf-<sha>`，下次會重複使用），每次執行在 Coast 上競速 24 秒，並印出每次執行的列以及各建置版本的中位數。`make perf-phone` 對於未傳入的項目，會以 `make phone` 相同的方式詢問（`BASE=`、`VIA=tailscale|wifi|auto`、`TG=0`），為每個建置版本印出並傳送一個 `?perf` 網址到 Telegram，在任何以 USB 連接的 Android 手機上以 Chrome 開啟第一個網址（使用 `adb reverse`，因此任何網路都可），在按下 Ctrl+C 時傳送網址已過期的通知，並每 10 秒記錄手機的感測器溫度與降頻等級（`dumpsys thermalservice`）以及 Mac 的熱警告等級，直到按下 Ctrl+C。比較結果時只能在相同的降頻等級下進行：發熱的手機會降頻並掉格，與建置版本無關。iPhone 不回報溫度。

## 部署

請至 [https://weskao.github.io/skyline-rush/](https://weskao.github.io/skyline-rush/) 遊玩。此網站為公開：訪客不需要 GitHub 帳號或 Tailscale，開發者的電腦也可以離線。

```sh
git tag v0.4.0 && git push origin v0.4.0   # Release: deploys once CI confirms the commit already passed on main
make deploy                              # Deploy remote main manually through the same CI flow
# The on-screen version (ready screen, desktop and mobile) is `package.json`'s version; `/release` bumps it
# after scripts/release-gate.sh has seen a green CI run for the commit on main.
```

CI（`.github/workflows/ci.yml`）會在推送到 `main`、`develop`、pull request、版本標籤推送（`v*`）與手動執行時，建置並執行單元測試與 Chrome 瀏覽器測試。瀏覽器測試以 13 個平行分片執行，世界巡迴賽的長時間測試則以 5 個分片執行，並依 `tests/ci-durations.json` 中實際量測的每項測試耗時來平衡（`scripts/ci-shards.mjs`），僅在 `main` 與 `develop` 上執行（其他分支只執行單元與雲端存檔檢查，除非提交訊息含有 `[full-regression]` 或手動執行時要求），而且對同一分支的較新推送會取消被它取代的執行。手動執行在所有檢查通過後會發佈；版本標籤推送會重新執行單元測試，確認（`release-verified`）被標記的程式碼已在 `main` 上通過完整測試，而不是重新執行瀏覽器測試套件，接著發佈並驗證公開網站。若標籤所指的提交從未在 `main` 上通過 CI，則不會部署。一般分支推送與 pull request 只會執行檢查。Pages 建置使用 `--base=/skyline-rush/`，讓腳本、樣式與字型從專案網址載入。GitHub Pages 必須使用 **GitHub Actions** 作為發佈來源。手動部署需要已驗證的 GitHub CLI（`gh auth login`）；請先推送你的提交，因為 `make deploy` 使用遠端的 `main`。部署不再依賴本機的 pre-push hook 或 Netlify 登入。當推送、標籤或手動執行中的任何檢查或部署失敗時，`notify-telegram` 工作會將失敗執行的連結傳送到 Telegram；它需要儲存庫密鑰 `TELEGRAM_BOT_TOKEN` 與 `TELEGRAM_CHAT_ID`（以 `gh secret set <NAME>` 設定各項，它會提示輸入值），缺少時會靜默略過。

連結預覽圖片是 `public/og-image.jpeg`，為 `public/og-image.en.jpeg` 的副本；`node scripts/capture-og-images.mjs og` 會擷取兩種語言的封面並更新該副本。爬蟲無法切換語言，因此 `index.html` 只參照英文封面（搭配 `og:locale` `en_US` 與 `og:locale:alternate` `zh_TW`），而 `public/og-image.zh-TW.jpeg` 則是供直接連結使用的中文版本。更換封面後，請提高 `index.html` 中 `og:image` 的 `?v=`，讓社群網站抓取新的圖片。

## 專案

- `src/game.js`：確定性的街機模擬、對手、車流與完賽順序。
- `src/input.js`：鍵盤與多指標操控，含取消與失焦清理；讀取已儲存的按鍵對應。
- `src/key-map.js`：純粹的按鍵對應，含 E / X NITRO、衝突互換的重新綁定、驗證與儲存。
- `src/history.js`：已儲存的遊戲資料：比賽歷史（最近 50 筆）、各賽道最佳成績與舊版遷移、生涯統計、獎章、星星、已裝備的塗裝、幽靈與每日排行榜。
- `src/ghost.js`：10 Hz 的幽靈錄製、各賽道驗證與插值播放。
- `src/appearance.js`：塗裝目錄與星星解鎖門檻。
- `src/rng.js`：以種子產生的亂數串流；賽道拾取道具與光環來自賽道種子。
- `src/world.js`、`src/geometry.js`：Three.js 渲染器、程序化生成的車輛、公路、天際線、飛行特效與鏡頭。
- `src/effects.js`：固定 480 顆粒子的 GPU 池，用於蒸氣、火花與著陸塵土。
- `src/track-paths.js`、`src/world-tour-scene.js`：每條賽道一份距離對應道路的映射，以及共用的世界巡迴賽道路、景物與地標。
- `src/route-map.js`、`src/i18n.js`：SVG 完整路線與即時賽車手地圖；語系偵測、已儲存的選擇、`t()` 與英文／繁體中文的賽道名稱；`src/locales/` 存放語系目錄。
- `scripts/capture-og-images.mjs`：從真實的應用程式擷取英文與 zh-TW 的封面圖片，以及 zh-TW 的 README 截圖。
- `scripts/ci-shards.mjs`：`plan` 為每個 CI 分片提供其 Playwright 的 `--test-list`，依耗時打包測試，讓每個分片大約在同一時間完成；`refresh <run-id>` 會在測試套件大幅變動後，依 CI 執行的日誌重寫 `tests/ci-durations.json`。
- `src/App.vue`、`src/icons.js`：Vue 3 的 UI 外殼（開始畫面、HUD、面板、觸控操作）及其共用的 SVG 圖示；僅渲染一次，沒有響應式狀態。
- `src/main.js`、`src/style.css`：掛載 `App.vue`、串接各畫面控制器，並執行比賽生命週期（開始、暫停、重新開始、結果）與影格迴圈。
- `src/*-ui.ts`：每個畫面區域一個 TypeScript 控制器（賽事選擇、雲端存檔、觸控操作、按鍵對應、VFX、音訊、歷史對話框、拍照模式）。
- `src/race-hud.ts`、`src/race-hud-modes.ts`：比賽中的 HUD，在每次 HUD 更新時以命令式方式寫入。
- `src/race-results.ts`、`src/result-screen.ts`、`src/session-progress.ts`：記錄完成的比賽（最佳成績、解鎖、獎章、幽靈）並顯示其結果畫面。
- `vite.config.js`：搭配 `@vitejs/plugin-vue` 的 Vite。
- `src/perf.js`：用於 `?perf` 裝置檢查讀數的影格時間百分位數。
- `src/audio.js`：合成音效與循環播放的音樂序列器；歌曲位於 `src/music-tracks.ts`，比賽事件轉音效位於 `src/race-audio-events.ts`。
- `src/audio-settings.js`：從 `localStorage` 讀取已儲存的音樂／音效開關與音量，以及滑桿的「靜音保留音量」規則。
- `tests/`：單元與瀏覽器行為測試。`tests/module-size.test.js` 讓每個原始碼模組維持在 400 行以內（較舊的大型檔案有只減不增的上限）。
- `docs/design.md`、`docs/verification.md`：範圍與驗證證據。
- `README.zh-TW.md`：本檔案的繁體中文翻譯，由 `scripts/readme-zh.mjs` 保持最新（`check`、以 `claude -p` 翻譯的 `sync`，以及手動編輯後的 `stamp`）。`.githooks/pre-commit` hook 會在提交變更 README.md 時重新產生它（以 `SKIP_README_ZH=1` 略過一次），而 `.githooks/pre-push` 會在被推送的提交觸及首頁（`index.html`、`src/App.vue`、`src/main.js`、`src/style.css`、`src/locales/`；以 `SKIP_LAYOUT_GATE=1` 略過一次）時執行 `npm run test:layout`；`make` 會以 `git config core.hooksPath .githooks` 啟用這些 hooks。`.claude/settings.json` 中的 Claude Code Stop hook 會在某一輪編輯了 README.md 卻沒有同步更新時，讓 Claude 回頭更新它。

所有車輛／景物的幾何與特效皆以程式碼生成。Barlow Condensed 以 SIL Open Font License 隨附於 `public/fonts/OFL.txt`。Three.js、Vue、Vite 與 Playwright 各自保有其套件授權。

來源：[weskao/skyline-rush](https://github.com/weskao/skyline-rush)。單人遊戲、十條賽道、街機物理。瀏覽器驗證涵蓋桌機 Chrome 與模擬的行動裝置視窗；iOS Safari 已在 iOS 模擬器中檢查過（直向與橫向，Coast 與 Neon），但實體手機上的影格率尚未量測（請使用 `?perf`，見驗證）。
