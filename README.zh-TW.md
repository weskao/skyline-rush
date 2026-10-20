<!-- source-sha256: e4eb575063441d51d40c13bbffef97627f7a5f83424be3c5f3aa9d9ccf9a15b6 generated from README.md by scripts/readme-zh.mjs; edit README.md, then run the script -->
# Skyline Rush

[English](README.md) · **繁體中文**

[**Play Skyline Rush →**](https://weskao.github.io/skyline-rush/)

這是一款可遊玩的 3D 海岸公路衝刺遊戲，主角是一輛飛行電動跑車，造型參考 Tesla Roadster 2 及其火箭推進器概念。以四具藍色推進器升空，與三名對手競速，飛越車流，管理電量並降落充電。操控為虛構的街機物理；這是非官方的粉絲專案，與 Tesla 或 SpaceX 無任何關係。

## 遊戲介紹

Skyline Rush 是一款可在瀏覽器中遊玩、短小且值得重複挑戰的街機衝刺遊戲：一名玩家對上三名對手與其間的車流，桌機或手機皆可，無需安裝任何東西。

- **先開車，再飛行。** 時速超過 65 km/h 後，按住 FLY 即可升空，飛越車流、穿過光環、跨越斷橋。飛行與 BOOST 共用同一份推進器電量，而電量只能在路面上回充，因此每一次爬升都是一個抉擇。
- **靠出色的駕駛賺取 NITRO。** 近距離超車、漂移、連續光環組（PERFECT LINE）、氣流牽引、成功落地的桶滾與拾取道具，會填滿三格的 NITRO 儲備；可以一次爆發用完，也可以連按延長持續時間。
- **四條賽道，依序解鎖。** 黃昏海岸、有低矮隧道的雨夜 Neon Downtown、有斷橋與側風的 Canyon Skyway，以及有冰面與上坡的 Aurora Pass。每條賽道都有一條空中捷徑，留給能在空中穩住路線的玩家。
- **值得追逐的目標。** 每次完賽都會獲得風格星數，可在 Garage 解鎖塗裝。最佳成績幽靈車、擁有專屬排行榜的每日挑戰，以及四種獎章，都是再次挑戰的理由。

一場比賽約一分鐘。音效在瀏覽器中合成，進度保存在本機儲存空間，因此不需要帳號，也沒有後端。

![Start screen with the audio settings open](artifacts/readme-start.jpeg?v=20261020b)

![Skyline Rush in flight](artifacts/readme-hero.jpeg?v=20261019b)

![Mobile portrait layout while ascending](artifacts/mobile-flight.jpeg?v=20261019b)

![Race results with a new personal best](artifacts/race-results.jpeg?v=20261019b)

## 在本機執行

需要 Node.js 22.12 或更新版本，以及支援 WebGL 2 與硬體加速的瀏覽器。

```sh
cd "$HOME/Documents/Workspace/skyline-rush"
make         # Installs dependencies on first run, then starts the Vite + Vue dev server
```

開啟 Vite 印出的本機網址（通常是 http://127.0.0.1:5173）。資源與字型均已本機打包；遊戲過程不會發出任何外部請求。不需要後端或帳號。

## 操作方式

| 動作 | 鍵盤 |
| --- | --- |
| 加速 | W / ↑ |
| 煞車 | S / ↓ |
| 轉向 | A / D 或 ← / → |
| 飛行 | 時速超過 65 km/h 後按住 Space |
| 降落 | 放開 Space |
| 加速推進 | 按住 Shift；消耗推進器電量 |
| NITRO | E（一格滿電量；NITRO 期間再按一次可延長） |
| 右手替代鍵 | J = 飛行、K = 加速推進、L = NITRO（原本的按鍵仍然有效） |
| 漂移 | 時速超過 162 km/h 時按住 S + A / D（僅限地面） |
| 開始 | Enter |
| 暫停 / 繼續 | Esc / P |
| 重新開始 | R |
| 切換鏡頭 | C |
| 全部音訊靜音 / 取消靜音 | M |
| 自動加速開 / 關 | T / AUTO 按鈕 |
| AIRFLOW 展示開 / 關 | V / AIRFLOW 按鈕 |

行動裝置版面提供轉向、油門、煞車、加速推進、飛行與 NITRO 按鈕。觸控操作支援同時按住多個按鈕。AUTO 會持續按住油門，讓你專心轉向與飛行；煞車永遠優先於它。觸控裝置預設開啟，鍵盤遊玩時預設關閉，你的選擇會維持到再次切換或重新載入頁面為止。離開分頁會暫停比賽並清除按住的輸入。切換鏡頭與音效的快捷鍵不會影響按住中的駕駛操作。在觸控裝置上，在轉向板上將拇指往下滑會煞車，往下並往旁邊滑則會漂移；在 Buttons 模式下，煞車按鈕位於轉向按鈕下方，因此煞車 + 轉向同樣可以漂移。

比賽前或暫停時開啟 **Controls**，即可調整鍵盤轉向靈敏度，或重新對應駕駛動作。選取一個動作後按下按鍵；衝突的按鍵會互相交換，固定的快捷鍵保留不可更動，按 Escape 可取消擷取。Reset keyboard 會還原預設值。按鍵設定會立即生效，並儲存在 `localStorage['skyline-rush-keymap']`。

同一個面板也能控制觸控轉向模式、慣用手、滑動靈敏度、大小、不透明度，以及 FLY 的按住／切換模式。**Edit touch layout** 讓你在比賽預覽上拖曳動作按鈕與傳統轉向按鈕；**Done editing** 會保留你的配置，**Reset touch layout** 則會還原。位置會在重新載入後保留，隨慣用手左右鏡像，旋轉後也會維持在可視範圍內。在較矮的橫向螢幕上（高度低於 380 px，例如顯示工具列的 iPhone Safari），開始畫面會省略標語，讓 START RACE 不需捲動即可看到；比賽 HUD 則會隱藏速度表與次要電量列，避免面板互相重疊。

所有音訊皆以 Web Audio 合成，不需要下載任何音訊檔案。背景音樂有兩段循環播放的合成器浪潮（synthwave）曲目：在開始與結算畫面播放的序曲主題（約 64 秒），以及從倒數開始播放、節奏更快的比賽主題（約 55 秒）。每段都會在循環中逐步疊加，暫停時則會降低音量。音效涵蓋選單確認、三聲倒數滴答與 GO、馬達／風聲、升空與加速推進、煞車、車輛／護欄碰撞、落地、低電量警告、近距離超車獎勵，以及完賽旋律。關閉音效會停止待播的提示音，暫停則會淡出駕駛音效。低電量警告只有在電量回充至 30% 以上後才會重新啟用。

喇叭圖示會開啟音訊設定，內有獨立的 Music 與 Sound effects 開關（上方開始畫面截圖中為展開狀態）。兩者預設皆為開啟，且各自的選擇會以 cookie（`skyline-rush-music`、`skyline-rush-sound`）記住一年。在瀏覽器允許自動播放的情況下，序曲音樂會在頁面載入後立即開始。若不允許（多數瀏覽器首次造訪時如此），開始畫面會詢問「Play background music?」。**Play music** 會開始播放，任何其他點擊或按鍵也一樣。**Not now** 則會關閉 Music 並記住此選擇。

飛行面板會顯示爬升、巡航、下降與觸地階段、剩餘推力秒數，以及下一個該使用的操作。青色光環標示空中走廊，並且屬於遊戲機制的一部分：請見下方的光環說明。行動裝置另有按住加速推進的按鈕。橘色碰撞回報會顯示撞擊類型與損失的速度；護欄現在會把地面上的車彈回並使其減速。在護欄上方飛行則可越過護欄。

場景包含泛光燈效、日落海水、懸索橋、推進器蒸氣、碰撞火花與觸地漣漪。鏡頭運動與非必要的速度線會遵循你系統的減少動態偏好設定。音效會分別為推進、碰撞與落地提供回饋。

**VFX**（右上角）可選擇 Realistic、Cinematic 或 Extreme 外觀、Low / Medium / High 畫質（Low 會關閉泛光並減少場景繪製）、Comfort mode（無閃光、震動、殘影或模糊）以及選用的觸覺回饋；**Fine tuning** 將每個效果以滑桿呈現，**Reset visual settings** 則還原預設值。**AIRFLOW**（或 V）會將場景切換為空氣動力學展示：車身上的流線、遙測面板、Low drag 或 High downforce，以及駕駛、前方、後方、側面或環繞鏡頭。**Race** 可直接從展示畫面開始比賽。

三盞琥珀色起跑燈會在 GO 時轉為青色。玩家的車是低矮的楔形跑車，配有煙燻快背式座艙、橫跨全寬的紅色尾燈條、四個後推進器噴口、在加速推進、煞車與飛行時升起的青銅色彈出式尾翼、旋轉的五輻輪圈，以及會轉向的前輪。每名對手都有自己的輪廓與燈光特徵：NOVA 是長尾車型，配雙垂直尾翼與分離式洋紅燈；ORBIT 是圓潤的 GT 跑車，配泡泡型座艙與圓形青色車燈；APEX 是賽道車，配前分流器、車頂進氣口、高聳的端板尾翼與琥珀色 C 形燈。車流使用直立的通勤車造型。轉向會快速緩入，放開加速推進後車速會逐漸下降，而非瞬間切斷。所有駕駛與工具列按鈕的觸控目標至少為 44px，包含 320px 寬度時。

想獲得額外的電量獎勵，可在時速超過 126 km/h 的地面上近距離超越車流。五秒內連續的乾淨超車最多可連鎖至 ×5，並回充 8–16% 的電量（上限 100%）。碰撞會中斷連鎖；在空中、距離過遠或恢復期間的超車不會獲得獎勵。HUD 會播報每次超車與最後 500 公尺；結算畫面會顯示近距離超車與碰撞的總次數。

全推力下飛行電量約可維持五秒。電量歸零時，車輛會自動下降；放開飛行操作並在地面行駛即可回充。同一份電量也供加速推進使用。碰撞會讓車輛減速；飛得夠高即可避開車流。在 NOVA、ORBIT 與 APEX 之前完成衝刺（依賽道不同為 4–6 公里）。在儲存空間可用時，個人最佳時間會儲存在此瀏覽器中。

### 操控手感

轉向會在 0.15 秒內升至全幅，高速時橫向速度上限為 9 m/s。在低於 65 km/h 時按住 Fly 會被記住 1.5 秒，並在速度足夠時自動升空。在空中放開 Fly 會降低下墜加速度（11 → 7 m/s²），讓落地更柔和。車輛在碰撞判定中寬 1.7 m，因此更多超車會算作擦身而過。輕微的護欄接觸屬於擦撞（保留 0.92 的速度、被推回路面、不算碰撞、連鎖保留）；正面撞擊仍算作碰撞。開啟 AUTO 時，放開轉向也會讓車輛緩緩回到最近的車道中央（車道輔助）。同時按住 Fly + Boost 每秒消耗 22 電量（而非 29），維持加速推進的速度上限，並顯示 AIR DASH。

### NITRO 與漂移

NITRO 有獨立的儲備（`player.nitro`，最多 3 格，每格以浮點數填充）。三段式 HUD 會顯示部分電量，滿格的區段會發光，滿電時 NITRO MAX 會閃動（在舒適／減少動態模式下會停用動態效果）。賽道上的拾取道具（藍色電池 +0.25、橘色罐 +0.5、空中金色油槽 +1、一個彩虹過充道具可直接補滿到上限）依賽道種子（seed）擺放；超過上限的部分會轉為電量（每 0.25 = +8）。一格可提供 2.5 秒，期間速度上限提高 30 m/s，並有更強的加速、排氣與鏡頭回饋；再按一次可延長 2 秒，且不疊加速度，因此連按三次可串成 6.5 秒的爆發。NITRO 期間與車流接觸只會損失 30% 速度（保留 70%），而非平常的保留 45%。

在地面時速超過 162 km/h 時，煞車 + 轉向會觸發漂移而非緊急煞車：只損失 3 m/s²，擦身而過的連鎖分數加倍，放開時依漂移時間獎勵 NITRO 與迷你加速（1 秒：+0.15 與 0.5 秒，2 秒：+0.3 與 0.8 秒，3 秒：+0.5 與 1.2 秒）。車身偏擺 25°，煙霧與藍／橘／紫色火花顯示階級，輪胎尖嘯聲會逐步增強，HUD 會標示漂移／迷你加速狀態。升空、墜入斷口，或撞上車輛或護欄，都會失去累積的進度。

NITRO 不消耗電量，因此 Fly + NITRO 永遠可以同時使用（Fly + Boost + NITRO 仍維持每秒 22 的 AIR DASH 消耗）。

**空中特技**：飛行時，快速甩動轉向（0.3 秒內兩次相反方向的按壓）會啟動 0.7 秒的桶滾。以低於 11 m/s 的速度完成桶滾落地可獲得 +0.25 NITRO；較重的落地（無動力下落約 9 m 以上）會失去獎勵。提早落地、撞到任何東西、隧道頂或斷口都會取消桶滾。車輛會旋轉（減少動態與 Comfortable VFX 會保留文字但取消旋轉），HUD 顯示 TRICK，並以 BARREL ROLL / TRICK +0.25 / HARD LANDING 提示、一聲呼嘯聲，以及觸控裝置上的短促觸覺震動標示桶滾及其獎勵。

**捷徑**：每條賽道都有一條位於邊緣車道上方 6 m 的空中走廊，標示為 SHORTCUT / FLY HIGH。在走廊內飛行不消耗電量，速度上限提高 12 m/s；走廊沿途布滿 NITRO 電池，中段有一個油槽，但交錯的柱塔會算作撞到護欄。走廊地板以賽道主題色的半透明平台標示；在走廊內，HUD 顯示 SHORTCUT，飛行額度顯示 ∞（BOOST 仍會消耗電量）。

### 光環

5 km 的海岸賽道有 22 個光環，每 220 m 一個，以 3 到 5 個為一組（依賽道種子擺放）。只有車輛穿過其可見半徑時才算數；擦到邊緣不算。種類：青色電量（+20 電量）、金色 nitro（+0.5）、紫色氣流牽引（3 秒迷你加速）、紅色風險（小型光環，+1 NITRO 與 500 分），以及彩虹神祕（依種子隨機的一種效果：護盾 10 秒或直到第一次被撞、磁吸 5 秒、穿越車流的幽靈狀態 3 秒，或讓對手以一半速度凍結 2 秒）。收集過的光環會爆開一次後消失。清空整組會播報 PERFECT LINE 並獎勵 +1 NITRO；錯過一個光環會中斷該組，但已獲得的獎勵會保留。

### 對手、氣流牽引與最終衝刺

緊跟在對手或車流之後 1.5 秒，會獲得 +6 m/s 的速度上限與 +0.25 NITRO（離開氣流後才會重新啟用）。對手也會使用 NITRO，每人兩格，依個性而定：NOVA 從 8 秒起穩定施放，之後每 18 秒一次；ORBIT 在飛行時施放；APEX 從賽程 75% 起發動衝刺。輕度的橡皮筋機制（距離超過 50 m 後最多 ±4% 速度）讓比賽保持緊張。最後 500 m，比賽音樂會加速至 115%，狀態列則顯示與前後最近對手的差距（`FINAL 500 M · +N m · −N m`）。

### 儲存的資料

所有儲存都使用 try/catch，因此即使儲存空間被封鎖，遊戲仍可執行。`skyline-rush-history`：每場完賽一筆紀錄，保留最近 50 筆。從開始或結算畫面開啟 **History**，可依賽道篩選、查看最佳成績與最近十次時間的圖表，並點選任一場查看詳情。`skyline-rush-best-tracks`：每條賽道的最佳時間；舊版單一的 `skyline-rush-best` 會一次性遷移至 `coast`，並且仍會為 coast 寫入。`skyline-rush-unlocked`：賽道解鎖狀態，即使較舊的紀錄已離開 History 也會保留。`skyline-rush-keymap`：按鍵設定。`skyline-rush-controls` 與 `skyline-rush-vfx`：駕駛與視覺設定（幽靈車開關位於 controls 中）。`skyline-rush-ghosts`：每條賽道一個最佳成績幽靈車。`skyline-rush-medals`、`skyline-rush-stars`、`skyline-rush-paint`：附有獲得日期的獎章、每條賽道的最佳星數、已裝備的塗裝。`skyline-rush-daily`：每日挑戰紀錄，保留最近 50 筆。所有儲存的值在載入時都會驗證；格式不正確的內容會被忽略。

### 幽靈車、每日挑戰、獎章與 Garage

- **幽靈車**：每場比賽會以每秒 10 次的頻率取樣車輛的距離、車道位置與高度。在某條賽道上創下新的個人最佳時，會儲存該次紀錄，之後在該賽道的比賽中會以半透明藍色車輛顯示。可在 Controls 中以 **Show best-run ghost** 關閉。
- **每日挑戰**：History 會顯示今天的賽道與修飾條件，依本機日期挑選：禁止飛行、雙倍車流，或僅限金色光環。Canyon 永遠不會出現禁止飛行，因為它的斷橋需要飛行。每日挑戰的成績只會進入專屬排行榜（今日最快的前五名）；絕不會影響歷史紀錄、最佳時間、解鎖、星數或幽靈車。Restart 會保留該挑戰，**Choose track** 則會離開挑戰。
- **獎章**：First victory（獲勝）、Clean run（無碰撞）、Perfect flight（單場 5 次 PERFECT LINE）與 Triple burst（單次爆發使用 3 格 NITRO：一次按壓加兩次延長）。任何完賽的比賽都可能獲得獎章；每枚獎章都會保留首次獲得的日期。
- **Garage**：你在每條賽道上的最佳風格星數會累加，並解鎖塗裝：3 星解鎖 Coral、6 星解鎖 Glacier、9 星解鎖 Aurora。未解鎖的塗裝仍可預覽。塗裝只改變外觀，絕不影響車輛的數值。

### 賽道與風格

從 Coast 開始。名列前三即可解鎖 Neon Downtown，接著是 Canyon Skyway，然後是 Aurora Pass。開始前先選擇賽道；鍵盤使用者可用左／右鍵在賽道按鈕之間移動，並以 Enter 選擇。Restart 會保留所選賽道；結算畫面上的 **Choose track** 則會回到選單。每條賽道都有自己的天空、色調與程序生成的場景：雨中的霓虹街道與低矮隧道、紅色沙漠峭壁與斷橋／側風，或有極光與冰面的雪山。警告標誌會標示特殊路段。Aurora 的上坡路段以正常速率一半的效率回充地面燃料。

風格分數獎勵近距離超車（100 × 連鎖，漂移會使連鎖加倍）、光環（150，風險光環另加 500）、PERFECT LINE（500）、移動中的滯空時間（每秒 10），以及每 500 公尺的乾淨行駛（100）。碰撞與墜入斷口會重置乾淨距離的進度。結算時，完賽可得一顆星，每公里 250 分得兩顆星，每公里 500 分得三顆星，與完賽名次無關。

燃料與 nitro 條會緩緩趨近新的數值，在容量低於 20% 時發出警告，補充時閃爍光澤，並在一格 nitro 充滿時脈動。Comfort mode 與系統的減少動態設定會停用這些動畫。滑動板在按住時會顯示浮動的圓環／旋鈕，並在比賽開始時顯示簡短提示；放開後轉向會回到中立。

HUD 使用共用的動態時序（120 / 240 / 480 ms）。速度表指針會隨速度緩動；名次變動時，名次數字會翻轉並帶有綠色向上或紅色向下的箭頭，排行榜列則滑入新的位置。精簡的半透明事件提示位於畫面中央上方，避開 HUD 面板，並將擦身而過、PERFECT LINE、NITRO 爆發、電量增加與漂移火花階級依序排隊顯示，不會互相重疊。暫停、完賽與重新開始會清空佇列。按鈕在按下時會壓縮，放開後彈回；按住的觸控按鈕會持續亮起。VFX 設定中的選用 **Haptic feedback** 會在支援的觸控裝置上對碰撞、NITRO 與漂移獎勵發出震動回饋。Comfort mode 與系統的減少動態設定會保留文字與按下狀態的顏色，同時移除新增的動態與震動。

### Sky Spiral 天際螺旋（第五條賽道，開發中）

Sky Spiral 新增真正具有高度變化的 360° 上升螺旋公路、霓虹未來城市，以及三組起飛坡道與高架斷橋。沿用現有飛行、BOOST、NITRO、幽靈紀錄及賽道解鎖機制。此功能仍在獨立 Feature Branch 中接受瀏覽器測試及實機效能驗證。

## 驗證

```sh
npm test                 # Deterministic simulation, input lifecycle and geometry
npm run build           # Production assets in dist/
npm run test:browser    # Real Chrome: desktop, mobile, graphics errors, full race
make run                # All three (test:browser builds first)
make deploy             # Trigger CI checks + GitHub Pages deployment of remote main
```

瀏覽器測試使用已安裝的 Google Chrome，並允許 SwiftShader 進行無頭渲染。僅使用 CPU 的 CI 採用 0.25 的裝置像素比，讓 3D 場景維持流暢，同時保有相同的 CSS 視窗大小與遊戲斷言；本機測試則以完整解析度渲染。一般遊玩使用瀏覽器可用的 GPU。截圖會以 JPEG（品質 70）寫入 `artifacts/`；測試追蹤／結果會被忽略。完整的衝刺測試在高速機器上約需一分鐘，若軟體渲染拖慢模擬則會更久。

```sh
npm run preview         # Serve the production build after npm run build
```

## 部署

可在 [https://weskao.github.io/skyline-rush/](https://weskao.github.io/skyline-rush/) 遊玩。網站為公開：訪客不需要 GitHub 帳號或 Tailscale，開發者的電腦也可以離線。

```sh
git tag v0.4.0 && git push origin v0.4.0   # Release: CI checks → GitHub Pages deployment
make deploy                              # Deploy remote main manually through the same CI flow
# The on-screen version (ready screen, desktop and mobile) is `package.json`'s version; `/release` bumps it.
```

CI（`.github/workflows/ci.yml`）會在推送至 `main`、pull request、版本標籤推送（`v*`）與手動執行時，建置並執行單元測試與 Chrome 瀏覽器測試。瀏覽器測試分成四個平行分片（`--shard=N/4`），對同一分支的較新推送會取消被取代的執行。版本標籤推送與手動執行僅在所有檢查通過後才會發布，然後驗證公開網站。一般的分支推送與 pull request 只會執行檢查。Pages 建置使用 `--base=/skyline-rush/`，讓腳本、樣式與字型從專案網址載入。GitHub Pages 必須以 **GitHub Actions** 作為發布來源。手動部署需要已驗證的 GitHub CLI（`gh auth login`）；請先推送你的 commit，因為 `make deploy` 使用遠端的 `main`。部署不再依賴本機的 pre-push hook 或 Netlify 登入。

連結預覽圖片為 `public/og-image.jpeg`，是 `artifacts/readme-start.jpeg` 的副本。更換封面後，請再次複製，並更新 `index.html` 中 `og:image` 的 `?v=`，讓社群網站抓取新圖。

## 專案

- `src/game.js`：確定性的街機模擬、對手、車流與完賽排名。
- `src/input.js`：鍵盤與多指標控制，含取消與失焦清理；讀取已儲存的按鍵對應。
- `src/key-map.js`：純粹的按鍵對應，含 J/K/L 與 E 替代鍵、衝突交換式重新對應、驗證與儲存。
- `src/history.js`：已儲存的遊戲資料：比賽歷史（最近 50 筆）、各賽道最佳成績與舊版遷移、生涯統計、獎章、星數、已裝備塗裝、幽靈車與每日排行榜。
- `src/ghost.js`：10 Hz 幽靈車錄製、各賽道驗證與插值回放。
- `src/appearance.js`：塗裝目錄與星數解鎖門檻。
- `src/rng.js`：以種子產生的隨機串流；賽道拾取道具與光環均來自賽道種子。
- `src/world.js`、`src/geometry.js`：Three.js 渲染器、程序生成的車輛、公路、天際線、飛行特效與鏡頭。
- `src/effects.js`：固定 480 顆粒子的 GPU 粒子池，用於蒸氣、火花與落地塵土。
- `src/App.vue`、`src/icons.js`：Vue 3 的 UI 外殼（開始畫面、HUD、面板、觸控控制）及其共用的 SVG 圖示；僅渲染一次，沒有響應式狀態。
- `src/main.js`、`src/style.css`：掛載 `App.vue`，再於該 DOM 上驅動遙測、暫停／結算、響應式控制與生命週期。
- `vite.config.js`：搭配 `@vitejs/plugin-vue` 的 Vite。
- `src/audio.js`：合成音效與循環播放的序曲／比賽音樂音序器。
- `tests/`：單元與瀏覽器行為測試。
- `docs/design.md`、`docs/verification.md`：範圍與驗證證據。
- `README.zh-TW.md`：本文件的繁體中文翻譯，由 `scripts/readme-zh.mjs` 維持同步（`check`；`sync` 以 `claude -p` 翻譯；手動修改後用 `stamp`）。當提交變更 README.md 時，`.githooks/pre-commit` hook 會重新產生它（單次略過可用 `SKIP_README_ZH=1`）；`make` 會以 `git config core.hooksPath .githooks` 啟用 hooks。`.claude/settings.json` 中的 Claude Code Stop hook 會在某一輪修改了 README.md 卻未更新翻譯時，要求 Claude 回頭補上。

所有車輛／場景幾何與特效皆由程式碼生成。Barlow Condensed 依其 SIL Open Font License 隨附於 `public/fonts/OFL.txt`。Three.js、Vue、Vite 與 Playwright 保留各自的套件授權。

來源：[weskao/skyline-rush](https://github.com/weskao/skyline-rush)。單人、四條賽道、街機物理。瀏覽器驗證涵蓋桌機 Chrome 與模擬的行動裝置視窗；iOS Safari 已在 iOS 模擬器中檢查（直向與橫向，Coast 與 Neon），但尚未在實體手機上量測畫面更新率。
