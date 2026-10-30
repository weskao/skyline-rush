<!-- source-sha256: d54b490ac6c6e2f0d30e50b01d0bd3dbeea0fd4cb16e6e551ea96af1961b3993 generated from README.md by scripts/readme-zh.mjs; edit README.md, then run the script -->
# Skyline Rush

[English](README.md) · **繁體中文**

[**Play Skyline Rush →**](https://weskao.github.io/skyline-rush/)

這是一款可直接遊玩的 3D 海岸公路衝刺遊戲，主角是一輛飛行電動跑車，造型參考 Tesla Roadster 2 及其火箭推進器概念。藉由四具藍色推進器升空，與三名對手競速，飛越車流，管理電量並降落補充電力。操控手感為虛構的街機物理；這是非官方的粉絲專案，與 Tesla 或 SpaceX 無任何關聯。

## 遊戲介紹

在 Classic Race 中，Skyline Rush 是一場短促、可重複挑戰的瀏覽器街機衝刺：一名玩家對上三名對手與夾雜其間的車流，桌機或手機皆可遊玩，無需安裝任何東西。其他模式則提供單人駕駛、自訂規則與多階段挑戰。

- **先駕駛，再飛行。** 時速超過 65 km/h 後，按住 FLY 即可升空，飛越車流、穿過光環、跨越斷橋。飛行與 BOOST 共用同一份推進器電量，且只有在路面上才會回充，因此每一次爬升都是一個抉擇。
- **靠good駕駛賺取 NITRO。** 驚險擦身而過、飄移、連續光環（PERFECT LINE）、尾流、落地桶滾與拾取道具，都會填滿三格 NITRO 儲備；可一次爆發用完，也可連按延長時間。
- **十條賽道，依序解鎖。** 黃昏的 Coast、下著雨且有低矮隧道的 Neon Downtown、有斷橋缺口與側風的 Canyon Skyway、有冰面與上坡路段的 Aurora Pass、擁有跳台與斷裂天橋的 360° 高架螺旋 Sky Spiral，接著是 World Tour：Taipei Heritage、Tokyo Afterdark、Alpine Rail Pass、Coastal Horizon 與 Cosmic Orbit。每條賽道都有一條空中捷徑，留給能在空中穩住路線的玩家。
- **值得追逐的目標。** 每次完賽都會獲得風格星星，可在 Garage 解鎖塗裝。最佳成績幽靈車、擁有獨立排行榜的每日挑戰，以及四枚獎章，都是再次出發的理由。

一場 Classic 衝刺約持續一分鐘；多階段挑戰則更久。音效由瀏覽器即時合成，進度儲存在本機儲存空間，因此無需帳號，也沒有後端。

**主畫面** — 選擇賽道與鏡頭角度，然後開始比賽。

https://github.com/user-attachments/assets/059aba91-65b2-4b0b-9abd-15461fcb1623

**競速中** — 在其中一條賽道上完整跑一場。

https://github.com/user-attachments/assets/e0ddb94c-794e-49ab-9b66-51cb5150f101

![Gameplay demo: countdown, lift-off over traffic and touchdown on Coast](artifacts/readme-demo.gif)

![Start screen with the audio settings open](artifacts/readme-start.zh-TW.jpeg?v=20261024a)

![Skyline Rush in flight](artifacts/readme-hero.zh-TW.jpeg?v=20261024a)

![Mobile portrait layout while ascending](artifacts/mobile-flight.zh-TW.jpeg?v=20261024a)

![Race results with a new personal best](artifacts/race-results.zh-TW.jpeg?v=20261024a)

### 手機截圖與示範

可用直式或橫式搭配觸控操作遊玩。影片追蹤一場 Coast 賽事，從開始畫面、倒數、FLY 升空到降落；AUTO 會持續按住油門。

**直式 — 準備比賽**

![Mobile portrait start screen with track selection and touch-friendly race buttons](artifacts/mobile-home.jpeg)

**橫式 — 以觸控操作飛行**

![Mobile landscape flight with FLY held and the touch controls visible](artifacts/mobile-landscape-flight.jpeg)

**觸控遊玩示範** · [觀看 MP4](artifacts/mobile-demo.mp4)

![Mobile touch gameplay: Coast countdown, FLY lift-off and landing](artifacts/mobile-demo.gif)

以全新的示範用設定檔，在 Chrome 行動裝置模擬下擷取，解析度為 390×844（直式）與 844×390（橫式）。這些擷取畫面並不代表實體手機的效能表現。

## 遊戲模式與重玩性（開發分支）

> **開發中 · 2026 年 10 月 29 日。** 這些模式新增內容合併於 `feature/roadmap-integration` 開發分支，尚未併入 `main`，也不在[已部署的 GitHub Pages 版本](https://weskao.github.io/skyline-rush/)中。

選擇一條**已解鎖的賽道**，在賽道卡片下方選擇 **GAME MODE**，需要時展開其規則，然後按下 **Start race**（或按 Enter）。比賽仍使用相同的 Three.js 道路、飛行、FLY / BOOST / NITRO 以及響應式觸控操作。開發分支包含以下模式：

| 模式 | 變化內容 | 勝利條件 / 進度 |
| --- | --- | --- |
| **Classic Race** | 標準的 3 名對手衝刺，可在 10 條賽道之一進行，包含車流、捷徑、光環與 NITRO。 | 登上頒獎台可解鎖下一條賽道；只有 Classic 會給予生涯星星、獎章與正式最佳成績。 |
| **Custom Race** | 可選擇 **0–3 名對手**、Easy / Normal / Hard 的 AI、Off / Light / Normal / Heavy 的車流、NITRO 道具開／關，以及 Normal / Relaxed 的碰撞懲罰。五種預設：Standard、Traffic Rush、No Items、Air Focus 與 Precision。 | 非排名成績有獨立的歷史紀錄。可進行 **1 / 2 / 3 / 5 個衝刺階段**並比較累計時間。各階段重複跑點對點路線；它們**不是環形賽道的圈數**。 |
| **Free Drive** | 獨自探索任何已解鎖的賽道，可調整路上車流與道具，沒有名次，也沒有強制勝利。 | 自由駕駛、飄移與飛行，直到道路盡頭；抵達終點會以結果畫面結束這次駕駛，且不儲存任何紀錄。這**不是**無限世界模式。 |
| **Time Attack** | 單人計時衝刺，提供相容的最佳成績幽靈車與領先／落後分段。可選擇 **Clean Time Trial** 開關。 | 依賽道與規則分別記錄最佳時間；Clean 跑法中只要發生任何碰撞即視為無效，且不會取代個人最佳。 |
| **Obstacle Run** | 以種子產生的路邊障礙；密度為 **Standard** 或 **Extreme**。部分障礙會橫向掃過；警示 HUD 會預告即將到來的危險。 | 閃避危險、以乾淨通過賺取風格分數，並使用一般路線的終點。障礙的位置與碰撞共用確定性邏輯；Classic 不受影響。 |
| **Checkpoint Rush** | 穿越發光的 3D 關卡拱門。起始時間為 **28 秒**；每通過一個乾淨的關卡可獲得 **+10 秒**（上限 60 秒）與 **250 風格分數**。 | 在時間用完之前通過每一個關卡並抵達終點。錯過關卡與超時**不會**儲存有效的最佳成績。HUD 會顯示已通過的關卡數、剩餘時間與距離下一個目標的距離。 |
| **Championship Cup** | 挑選僅由已解鎖路線組成的 **3 或 5 條賽道**盃賽；在每個階段與 NOVA、ORBIT 和 APEX 競速。 | 名次分別獲得 **10 / 7 / 5 / 3 分**；以累計積分與總時間決定冠軍，同分時以時間決勝。盃賽成績與生涯解鎖分開計算。 |
| **Stunt Attack** | 一場 **120 / 180 / 300 秒**的風格賽，包含連續的賽段：飄移、空中特技、驚險擦身與光環累積連擊分數。 | 由計時器而非終點線結束賽事；每種時長都有本機風格獎章與最佳分數。 |
| **Elimination** | 四名車手的「最後一位車手」淘汰賽：每十秒就會淘汰最後一名的車手。 | 存活到成為最後一位車手；提早被淘汰會結束你的這次行程，且沒有獎勵。 |

### 盃賽復原

尚未完成的 Championship Cup 會在主畫面提供 **Resume** 或 **Discard**。Resume 會保留已結算的階段分數，並僅重新開始未完成的階段；重試只會回溯正在重玩的那個階段。完成或捨棄盃賽會清除其復原紀錄。刪除遊戲進度時也會一併移除檢查點，同時保留裝置偏好設定。復原使用此瀏覽器的儲存空間，無法還原瀏覽器拒絕儲存的資料。

### 自訂呈現與幽靈車

Custom Race 可為每個衝刺賽段重播相容的最快幽靈車。Custom 與 Free Drive 提供 Track / Day / Dusk / Night / Rain / Fog 的呈現預設，以及即時的規則摘要。這些外觀選擇不會改變紀錄資格或規則集身分。重試會保留所選外觀；更換賽道或回到 Classic 則會還原該賽道的外觀。Photo Studio 關閉時會還原目前比賽的外觀。

### 可選道具與獎勵關卡

Custom 與 Free Drive 提供 **Off / Classic Mystery Rings / Active Items / All Items**。持有的道具佔用單一欄位：按 **Q** 或點按 **USE** 啟用，之後等待冷卻。NITRO 與 FLY/BOOST 保有各自的操作。All Items 會加入有上限的加速、空中電量與一次性復原關卡；EMP 會使附近的對手短暫減速，在單人遊玩時則轉為 Magnet。復原會保留正式的碰撞次數。Stunt Attack 與 Checkpoint Rush 可另外選擇啟用暫時、不可疊加的 ×2 分數關卡。Classic 的預設維持不變。

### Event Lab Lite v1

**Event Lab Lite** 可編輯本機的賽道範本，在已解鎖的路線上加入障礙、NITRO 光環與補給。可更改它們的車道與距離、對編輯進行 Undo/Redo/Reset，並以文字匯入或匯出經過驗證的賽道。開始時會將賽道編譯為真實的比賽事件；重試會保留賽道與種子。賽道成績與 Career 及 Custom 紀錄分開。錐形路障、自製跳台、檢查點編輯與社群分享不在此第一版範圍內。

### Endless Highway

**Endless Highway** 將 Coast 延伸到既定終點之外，成為一個距離生存活動。車流難度會上升到固定上限；發生五次碰撞即結束一次完成的挑戰。個人紀錄記錄最長的絕對距離，並與 Career 及幽靈車分開。暫停與 WebGL 復原都會保留這次行程。此第一版僅支援 Coast；其附近的景物與事件使用有上限的物件池。

### Circuit Race

**Circuit Race** 新增 Harbor Circuit，這是一條獨立、隨時可進入的 2 公里封閉環形賽道，有 **1 / 3 / 5 圈**。依序通過每一個區段才能算一圈；倒退穿越、瞬間移動與復原都不能獲得圈數。HUD 與結果畫面會顯示分段、上一圈、個人最佳單圈與總時間。單圈最佳成績在 History 滾動淘汰後仍會保留；總時間與幽靈車則依圈數設定而定。原有的十條點對點路線維持其地理配置與 Career 進度。

### 賽道主題、障礙與風險路線

- **賽道主題**（可在 Custom、Free Drive 與 Obstacle Run 中選擇啟用）為每條路線帶來專屬的危險：Coast 的貨物與陣風、Neon 的道路施工、Canyon 的落石、Aurora 的雪堆、冰面與暴風雪、Sky Spiral 的能量閘門、Taipei 的節慶路障、Tokyo 的號誌閘門、Alpine 的雪崩、Coastal 的海浪水花，以及 Cosmic 的能量牆。危險會事先警示，始終保留兩條車道暢通，且絕不會改變 Classic。
- **Obstacle Run** 提供 **Mixed obstacles** 賽道：橫掃的閘門、墜落的碎石，以及路障上方的圓環，獎勵飛越或繞行的玩家。
- **風險路線**：高風險光環與驚險擦身在 Custom Hard 中給分更高，也可關閉以進行輕鬆練習。
- 道路新增了非實體的路邊景象：觀眾、廣告看板、維修廂型車、鐵路月台、行駛中的列車、船隻與無人機。較低的畫質設定會繪製較少的內容。

### 比賽設定、結果與無障礙

- 模式與賽道選擇仍可透過鍵盤與觸控操作；情境面板只顯示與所選模式相關的選項。無法使用的盃賽會說明還需要多少條賽道。
- HUD 會依模式調整：單人活動會隱藏容易誤導的對手名次；多階段與盃賽會顯示階段進度；Checkpoint Rush 顯示即時的關卡倒數；Obstacle Run 警告即將出現的障礙；Clean Time Trial 會明顯標示已失效的跑法。
- 練習、Custom、Time Attack、Obstacle、Checkpoint 與 Cup 的結果使用獨立的 `skyline-rush-mode-history-v1` 紀錄鍵。符合資格的練習幽靈車有自己儲存的規則集；Classic 的解鎖、星星、獎章、Daily 紀錄與正式時間不受練習跑法影響。
- 在 **History → Challenge records** 中，可依模式篩選，查看每個確切賽道／規則集的個人最佳成績，以及符合資格的 Time Attack 幽靈車。即使最近 50 次行程被輪替掉，終身最佳仍會保存在 `skyline-rush-mode-bests-v1` 之下。Challenge records 明確不是 Career 獎章或星星。
- 模式標籤、結果說明、設定選項與危險警告支援英文與繁體中文。低畫質、觸控操作與減少動態效果仍是驗證計畫的一部分。

### 真實遊戲截圖與驗證

用來檢視這些模式的截圖，是**從執行中的瀏覽器遊戲**擷取的，而非概念圖。[下載實際的 Playwright 擷取畫面組](https://github.com/weskao/skyline-rush/actions/runs/39742666980/artifacts/12410172411)（Custom 單人、Free Drive、Time Attack、Obstacle Run、Extreme 障礙、Checkpoint Rush 與手機模式選單）。GitHub Actions 的成品可能需要登入且會過期；若要在本機重現，請執行 `npx playwright test tests/race-modes-browser.spec.js`，並開啟 `test-results/race-mode-*.png`。CI 截圖為軟體渲染且解析度較低，不代表最終裝置的畫質。

**驗證：** 每項功能的測試與完整閘門紀錄皆列於 `TODO.md`。實體 iPhone 與 Android 的檢查仍待進行。

## 在本機執行

需要 Node.js 22.12 或更新版本，以及支援 WebGL 2 並啟用硬體加速的瀏覽器。

```sh
cd "$HOME/Documents/Workspace/skyline-rush"
make         # Installs dependencies on first run, then starts the Vite + Vue dev server
```

開啟 Vite 印出的本機網址（通常是 http://127.0.0.1:5173）。素材與字型皆在本機打包；遊戲過程不會發出任何外部請求。無需後端或帳號。

`make` 與 `make dev-unlocked` 也會啟動本機的 Firebase Auth/Firestore 模擬器（需要 Java 21+），因此雲端存檔的 Google 登入可搭配假的測試帳號運作，絕不會動到真實存檔。專案擁有者的雲端存檔操作與 Spark 配額檢查，請見 `docs/cloud-save.md`。

`make dev-diag` 與 `make phone-diag` 提供相同的建置，並內建螢幕上的診斷橫幅（影格計數器、頁面生命週期與觸控事件及其點擊目標，另有跨重新載入保留的最後幾個未捕捉錯誤），用於在真實手機上追查當機或按鈕失效的問題。正式建置絕不包含它：`npm run build` 會拒絕帶有診斷模組的打包檔。

`make phone` 會開啟終端機選單，用來啟動、檢查或停止手機可連線的開發伺服器（透過 Tailscale 或同一個 Wi-Fi），並在伺服器回應後印出手機網址。選單會列出此工作目錄、其他 worktree 與最近的分支，也可輸入分支名稱；`make phone <name>` 會直接前往該分支（或 `feature/<name>`），必要時在 `.claude/worktrees/` 底下建立其 worktree；`make phone off` 會停止它啟動的所有伺服器（等同 `/phone-dev off`）。它提供正常的鎖定版建置；`make phone-unlocked [name]` 是同一個選單，但所有賽道與塗裝都已解鎖，是唯一手機連得到的全解鎖伺服器（`make dev-unlocked` 與 `make dev-feature` 仍僅限桌機使用）。它需要個人的 `phone-dev` Claude Code skill（`/phone-dev` 會詢問相同的選單），且執行時不啟用模擬器，因此手機上的雲端存檔登入使用的是真實專案。

## 操控

| 動作 | 鍵盤 |
| --- | --- |
| 加速 | W / ↑ |
| 煞車 | S / ↓ |
| 轉向 | A / D 或 ← / → |
| 飛行 | 時速超過 65 km/h 後按住 Space |
| 降落 | 放開 Space |
| Boost | 按住 Shift；消耗推進器電量 |
| NITRO | E / X（一格滿電；在 NITRO 期間再按一次可延長）。WASD 操作者使用 E；方向鍵玩家則讓左手保持在 Shift / X / Space 上 |
| 飄移 | 在 162 km/h 以上按住 S + A / D（僅限地面） |
| 開始 | Enter |
| 暫停／繼續 | Esc / P |
| 重新開始 | Backspace |
| 切換鏡頭 | C |
| 全部音訊靜音／取消靜音 | M |
| 自動油門開／關 | F2 / AUTO 按鈕 |
| AIRFLOW 展示開／關 | V / AIRFLOW 按鈕 |
| 在主畫面切換賽道 | 向左／向右滑動或拖曳 3D 預覽，或在觸控板上用兩指滑動 |

行動版版面提供轉向、油門、煞車、boost、飛行與 NITRO 按鈕。觸控操作支援同時按住多個按鈕。AUTO 會持續按住油門，讓你專心轉向與飛行；煞車一律優先於它。每種裝置預設皆為開啟；一旦你切換過，你的選擇會記錄在此瀏覽器中（`skyline-rush-auto`）。離開分頁會暫停比賽並清除按住的輸入。在比賽中點擊 SKYLINE RUSH 標誌會暫停並先詢問：**Keep racing**、**End race**（回到賽道選擇，不儲存這次行程）或 **Back to home**（重新載入）；無論哪一種，開始畫面都會重新開啟在剛跑過的賽道上，並捲動到賽道列的中央（第一條與最後一條賽道位於其兩端）。Esc 會讓比賽維持暫停。鏡頭與音效快捷鍵會保留按住的駕駛操作。在觸控上，拇指在轉向板上向下滑動會煞車，向下並向側邊滑動則會飄移；在 Buttons 模式中，一個較細的煞車鍵位於轉向按鈕上方、拇指休息的那一列之外，因此只有刻意才會按到；從 ← 或 → 將拇指向上滑進煞車鍵會同時保持轉向並煞車，因此單一拇指即可飄移，再向下滑回則會放開煞車。觸控按鈕與螢幕角落保持距離，讓拇指更容易觸及，平板則會將它們上移並放大。

在比賽前或暫停時開啟 **Controls**，可調整鍵盤轉向靈敏度或重新對應駕駛動作。選擇一個動作，然後按下一個按鍵；衝突的按鍵綁定會互換，固定的快捷鍵保留不可使用，按 Escape 可取消擷取。Reset keyboard 會還原預設值。綁定會立即生效，並儲存在 `localStorage['skyline-rush-keymap']` 之下。

同一個面板也控制觸控轉向模式、慣用手、滑動靈敏度、大小、不透明度，以及按住／切換式的 FLY。**Edit touch layout** 讓你把動作按鈕與經典轉向按鈕拖曳到比賽預覽上；**Done editing** 會保留這個配置，**Reset touch layout** 則還原。位置會在重新載入後保留，隨慣用手鏡像，並在旋轉後維持在可視範圍內。在較短的橫式螢幕上（高度低於 380 px，例如顯示工具列的 iPhone Safari），開始畫面會省略其標語，讓 START RACE 不需捲動，而比賽 HUD 會隱藏速度表與次要電量列，避免面板互相重疊。

所有音訊皆以 Web Audio 合成；無需下載任何音訊。背景音樂有兩首循環的合成器浪潮曲目：在開始與結果畫面播放的前奏主題（約 64 秒），以及從倒數開始播放、節奏較快的比賽主題（約 55 秒）。每首都會在其循環中逐步堆疊，並在暫停時降低音量。音效涵蓋選單確認、三聲倒數滴答與 GO、馬達／風聲、升空與 boost、煞車、車輛／護欄碰撞、降落、低電量警示、驚險擦身獎勵，以及完賽旋律。將音效靜音會停止待播的提示音，而暫停則會淡出駕駛音效。低電量警示只有在電量回充到 30% 以上後才會重新啟動。

喇叭圖示會開啟音訊設定，內含 Music 列與 Sound effects 列，各有一個靜音開關與一個音量滑桿（見上方開始畫面截圖中展開的樣子）。**Mute all**（或 M）可一次讓兩者靜音。靜音會保留各聲道的音量，因此取消靜音後會回到原本的音量；將滑桿拖到零，會以同樣方式讓該聲道靜音。兩者預設皆為開啟且音量 100%，每個開／關選擇與音量都會記錄在 `localStorage`（`skyline-rush-music`、`skyline-rush-sound` 儲存 `on`/`off`，另有儲存百分比的 `-volume` 變體）；若沒有儲存任何值，兩個聲道皆為開啟，並會被儲存為 `on`。在較短的螢幕上，面板可以捲動。在瀏覽器允許自動播放的情況下，頁面一載入就會開始播放前奏音樂。在不允許的情況下（Chrome 與大多數其他瀏覽器首次造訪時），第一次點按、點擊或按鍵便會開始播放。在 iPhone 與 iPad 上，遊戲會要求媒體播放，因此靜音開關不會讓它靜音；遊戲進行期間，這也會暫停其他 App 的音訊。

飛行面板會顯示爬升、巡航、下降與觸地、剩餘推進秒數，以及下一個該使用的操作。青色光環標示出空中走廊，並屬於遊戲內容：請見下方的 Rings。行動版另有按住以 boost 的按鈕。橘色的碰撞回報會顯示碰撞類型與損失的速度；護欄現在會讓地面上的車輛反彈並減速。飛到護欄之上則可越過它們。

場景包含泛光照明、日落水面、懸索橋、推進器蒸氣、碰撞火花與觸地漣漪。鏡頭運動與非必要的速度線會遵守你系統的減少動態效果偏好設定。音效為推進、碰撞與降落提供各自獨立的回饋。

**VFX**（右上角）可選擇 Realistic、Cinematic 或 Extreme 的外觀，Low / Medium / High 的畫質（Low 會關閉泛光並繪製較少的景物）、Comfort 模式（無閃光、晃動、殘影或模糊）以及選用的觸覺回饋；**Fine tuning** 會把每個效果都列為滑桿，**Reset visual settings** 則還原預設值。**AIRFLOW**（或 V）會將場景切換為空氣動力學展示：車身上的流線、遙測面板、Low drag 或 High downforce，以及駕駛、前方、後方、側面或環繞的鏡頭。開始面板會為展示退讓，只留下橘色的 **START RACE** 按鈕，停靠在車子下方的底部中央；向左或向右滑動場景可更換賽道。第一次開啟 AIRFLOW 時，會有一個動畫指尖示範該手勢。

三盞琥珀色起跑燈會在 GO 時轉為青色。玩家的車是一輛低趴的楔形跑車，配有燻黑的快背式座艙、橫跨全寬的紅色尾燈條、四個後推進器噴口、會在 boost、煞車與飛行時升起的青銅色彈出式尾翼、旋轉的五輻輪圈，以及可轉向的前輪。每名對手都有自己的輪廓與燈光特徵：NOVA 是長尾車，配有雙尾鰭與分割的洋紅色燈光，ORBIT 是圓潤的 GT，配有泡泡座艙與圓形青色車燈，APEX 則是賽道車，配有前分流器、車頂進氣口、高聳的端板尾翼與琥珀色 C 形燈。車流使用直立的通勤車造型。轉向會快速緩入，放開 boost 會讓車子逐漸減速，而不是瞬間切斷速度。所有駕駛與工具列按鈕都至少有 44px 的觸控目標，包括在 320px 寬度下。

若想獲得額外的電量獎勵，請在地面上以 126 km/h 以上的速度近距離超越車流。五秒內連續的乾淨超車最多可連鎖到 ×5，並回充 8–16% 的電量（上限 100%）。碰撞會中斷連鎖；在空中、距離過遠與復原中的超車不會獲得獎勵。HUD 會播報每一次超車與最後 500 公尺；結果會顯示總驚險擦身次數與碰撞次數。

全推力下，飛行電量可維持約五秒。電量歸零時，車子會自動下降；放開飛行操作並在地面上駕駛即可回充。同一份電量也供 boost 使用。碰撞會讓車子減速；飛得夠高可避開車流。對手與車流遵守相同的碰撞規則：它們會繞開較慢的車輛與玩家，像你一樣撞上道具、護欄與危險物，而撞擊會讓兩輛車都減速並被推開（車流之後會加速回到巡航速度）。在領先 NOVA、ORBIT 與 APEX 的情況下完成衝刺（依賽道不同為 4–8 公里）。在儲存空間可用時，個人最佳時間會儲存在此瀏覽器中。

### 操控手感

轉向會在 0.15 秒內達到全幅，且高速時橫向速度上限為 9 m/s。在 65 km/h 以下按住 Fly 會被記住 1.5 秒，並在速度足夠時自動升空。在空中放開 Fly 會降低下墜加速度（11 → 7 m/s²）以便更柔和地降落，並緩慢回充飛行電量（每秒 4，為地面速率的三分之一；電量說明文字顯示 GLIDE RECHARGE ACTIVE）。用盡的推進器在放開 Fly 且電量回到 15 後會重新解鎖，即使在空中也一樣。在斷橋 300 公尺以內（Sky Spiral 除外，其跳台會把車子拋過去），只要剩餘電量以目前速度無法推進越過，HUD 中央就會警告 GAP AHEAD · NEED n% CHARGE。車輛在碰撞判定上寬度為 1.7 公尺，因此更多次通過會算作驚險擦身。輕微擦到護欄算作擦撞（保留 0.92 的速度，被推回路面，不算碰撞，連擊維持）；正面撞擊仍算作接觸。開啟 AUTO 時，放開轉向也會讓車子緩緩回到最近的車道中央（車道輔助）。同時按住 Fly + Boost 每秒消耗 22 電量而非 29，維持 boost 的速度上限，並顯示 AIR DASH。

### NITRO 與飄移

NITRO 有自己的儲備（`player.nitro`，最多 3 格，每格以浮點數填充）。三段式 HUD 會顯示部分電量，滿格的區段會發光，充滿時 NITRO MAX 會閃動（在 comfort／減少動態效果模式下會抑制動態）。賽道上的拾取物（藍色電池 +0.25、橘色罐子 +0.5、空中金色油箱 +1、一個彩虹過充，會補滿到上限）依賽道種子放置；每一種 NITRO 獎勵（拾取物、飄移、桶滾、光環、尾流）也會回充飛行電量（每存入 0.25 = +5；過充不給），超過上限的部分會轉為電量（每 0.25 = +8）。一格 NITRO 提供 2.5 秒，速度上限提高 30 m/s，加速更強，並帶有排氣與鏡頭回饋；再按一次會延長 2 秒而不疊加速度，因此連按三次可連成 6.5 秒的爆發。NITRO 期間碰到車流會保留 70% 的速度，而非 45%。

在地面 162 km/h 以上時，煞車 + 轉向會進行飄移而非緊急煞車：只損失 3 m/s²，驚險擦身的連擊分數加倍，放開時依飄移時間給予 NITRO 與迷你 boost（1 秒：+0.15 與 0.5 秒，2 秒：+0.3 與 0.8 秒，3 秒：+0.5 與 1.2 秒）。車身偏航 25°，煙霧與藍／橘／紫色火花顯示等級，輪胎尖嘯聲逐漸增強，HUD 會標示飄移／迷你 boost 的狀態。起飛、墜入缺口，或撞上車輛或護欄都會失去累積。

NITRO 不消耗電量，因此 Fly + NITRO 一律可同時使用（Fly + Boost + NITRO 維持每秒 22 的 AIR DASH 消耗）。

**空中特技**：在飛行時，快速甩動轉向（0.3 秒內兩次相反方向的按壓）會開始一次 0.7 秒的桶滾。以低於 11 m/s 的速度降落並完成的桶滾可獲得 +0.25 NITRO；較猛烈的降落（從約 9 公尺或更高處無動力墜落）會失去獎勵。提早降落、撞到任何東西、隧道頂部或缺口都會取消桶滾。車子會旋轉（減少動態效果與 Comfortable VFX 會保留文字但省略旋轉），HUD 顯示 TRICK，並以 BARREL ROLL / TRICK +0.25 / HARD LANDING 的提示、一聲呼嘯聲，以及觸控上短暫的觸覺震動標示桶滾與其獎勵。

**捷徑**：每條賽道都有一條位於邊緣車道上方 6 公尺的空中走廊，標示為 SHORTCUT / FLY HIGH。在其中，飛行不耗電量，速度上限提高 12 m/s；走廊兩側有 NITRO 電池，中途有一個油箱，但交錯的塔柱會算作撞擊護欄。走廊地板以一塊該賽道主題色的半透明甲板標示；在其中，HUD 顯示 SHORTCUT，飛行預算顯示 ∞（BOOST 仍會消耗電量）。

### Rings

5 公里的海岸有 22 個光環，每 220 公尺一個，每組 3 到 5 個（依賽道種子放置）。只有當車子穿過其可見半徑時，光環才算數；擦到邊緣不算。類型：青色電量（+20 電量）、金色 nitro（+0.5）、紫色尾流（3 秒迷你 boost）、紅色風險（小光環，+1 NITRO 與 500 分）以及彩虹神祕（依種子隨機的一種效果：護盾 10 秒或直到第一次碰撞、磁鐵 5 秒、穿越車流的幽靈 3 秒，或將對手以一半速度凍結 2 秒）。被收集的光環會爆開一次然後消失。清除整組光環會播報 PERFECT LINE 並給予 +1 NITRO；漏掉一個光環會中斷它，但保留已獲得的獎勵。

### 對手、尾流與最後衝刺

緊跟在對手或車流車輛正後方 1.5 秒，可獲得 +6 m/s 的速度上限與 +0.25 NITRO（離開尾流後才會重新啟動）。對手也會使用 NITRO，每人兩格，依個性而定：NOVA 從 8 秒起穩定施放，之後每 18 秒一次，ORBIT 在飛行時施放，APEX 則從比賽 75% 處開始猛衝。輕微的橡皮筋機制（超過 50 公尺後最多 ±4% 的速度）讓比賽保持緊張。在最後 500 公尺，比賽音樂會加速到 115%，狀態列會顯示與前方及後方最近對手的差距（`FINAL 500 M · +N m · −N m`）。

### 儲存的資料

所有儲存都使用 try/catch，因此即使儲存空間被封鎖，遊戲仍可執行。`skyline-rush-history`：每場完賽各一筆紀錄，最近 50 筆，包含 `fuelOuts`（飛行電量耗盡的次數）與 `gapFalls`，用於調整飛行平衡。從開始或結果畫面開啟 **History**，可依賽道篩選、查看最佳成績與最近十次時間的圖表，並點按一次行程查看詳情。`skyline-rush-best-tracks`：每條賽道的最佳時間；舊的單一 `skyline-rush-best` 會一次性遷移到 `coast`，並且仍會為 coast 寫入。`skyline-rush-unlocked`：賽道解鎖，即使較舊的行程已離開 History 也會保留。`skyline-rush-keymap`：按鍵綁定。`skyline-rush-controls` 與 `skyline-rush-vfx`：駕駛與視覺設定（幽靈車開關在 controls 中）。`skyline-rush-ghosts`：每條賽道一個最佳成績幽靈車。`skyline-rush-medals`、`skyline-rush-stars`、`skyline-rush-paint`：附有獲頒日期的獎章、每條賽道的最佳星星、已裝備的塗裝。`skyline-rush-daily`：每日挑戰的跑法，最近 50 筆。每個儲存的值在載入時都會經過驗證；任何格式錯誤的內容都會被忽略。

### 幽靈車、每日挑戰、獎章與 Garage

- **幽靈車**：每次行程每秒 10 次取樣車子的距離、車道位置與高度。在某條賽道上創下新的個人最佳時，會儲存該次行程，之後在該賽道上的比賽會以半透明藍色車輛顯示它。預設為關閉；請在 Controls 中以 **Show best-run ghost** 開啟。
- **每日挑戰**：History 會顯示今天的賽道與修飾條件，依本機日期挑選：禁止飛行、雙倍車流，或僅限金色光環。Canyon 永遠不會出現禁止飛行，因為它的斷橋需要飛行。每日跑法只會進入自己的排行榜（今天最快的五名）；絕不會影響歷史、最佳時間、解鎖、星星或幽靈車。Restart 會保留挑戰，而 **Choose track** 則會離開它。
- **獎章**：First victory（獲勝）、Clean run（無碰撞）、Perfect flight（一場比賽中 5 次 PERFECT LINE）與 Triple burst（一次爆發中 3 格 NITRO：一次按壓加兩次延長）。只有符合資格的 Classic Race 完賽才能獲頒；每一枚都會保留首次獲得的日期。
- **Garage**：你在每條賽道上的最佳風格星星會累加並解鎖塗裝：3 顆解鎖 Aurora、6 顆解鎖 Glacier、10 顆解鎖 Coral、16 顆解鎖 Cobalt、24 顆解鎖 Obsidian（上限為 30）。現實世界最受歡迎的車色——藍色與黑色——是長期目標。未解鎖的塗裝仍可預覽。塗裝只改變外觀，絕不改變車輛的數值。

### Sky Spiral（實驗性的第五條賽道）

Sky Spiral 加入了一條真正的 3D 上升螺旋道路，位於賽博龐克天際線之上。環繞發光的中央塔樓完整繞行一圈水平迴旋，然後從三個專用跳台躍過高架缺口。既有的 FLY、BOOST 與 NITRO 在這條新賽道上同樣適用，並提供選用的飛行修正。此賽道使用獨立的彎曲道路渲染器與自己的 3D 路徑對應器；仍在實體行動硬體上驗證中。

### 賽道與風格

從 Coast 開始。進入前三名即可解鎖 Neon Downtown，接著是 Canyon Skyway、Aurora Pass、Sky Spiral、Taipei Heritage、Tokyo Afterdark、Alpine Rail Pass、Coastal Horizon 與 Cosmic Orbit。開始前先選擇賽道，也可以向左或向右滑動 3D 預覽（用滑鼠拖曳，或在觸控板上用兩指橫向滑動），像旋轉木馬一樣翻到相鄰的賽道：它會跟著手指移動，輕輕一撥就夠了，第一條與最後一條賽道有橡皮筋般的回彈，並有一個晶片標示賽道名稱與頁面圓點；鍵盤使用者可用左／右在賽道按鈕之間移動，並以 Enter 選擇。Restart 會保留所選賽道；結果畫面上的 **Choose track** 會回到選單。在仍有賽道未解鎖時，登上頒獎台會在結果畫面顯示閃動的 **Next** 按鈕，立即開始剛解鎖的賽道；當所有賽道都已開放、以及在每日挑戰中，它都不會出現。如果瀏覽器中斷 WebGL 連線（在 iPhone 上鎖定螢幕或切換 App 後很常見），當圖形恢復時遊戲會清除警告；否則 **Start** 或 **Race again** 會重新載入頁面。每條賽道都有自己的天空、色盤與程序式生成的景物：下著雨的霓虹街道與低矮隧道、紅色沙漠峭壁與斷橋缺口／側風，或有極光與冰面的雪山。警示牌會標示特殊路段。Aurora 的上坡路段以一半的正常速率回充地面燃料。

### World Tour 賽道、路線地圖與賽道名稱

五條 World Tour 路線共用一個彎曲道路渲染器（`src/world-tour-scene.js`），每條路線有各自的色盤、建築與地標（總統府與北門的剪影、霓虹路口與一座塔、鐵路高架橋與山峰、一座燈塔與跨海大橋、帶環行星）。在主畫面選擇一條 World Tour 路線時，會在盤旋的車輛後方框出其標誌性地標：總統府、東京鐵塔、一座阿爾卑斯山峰、一座燈塔或宇宙之門。朝它競速時，路邊會讓該地標保持清晰可見。每張賽道卡片都會顯示完整的主要路線，而比賽中，即時地圖會在其上標出 YOU、NOVA、ORBIT 與 APEX；空中捷徑則絕不繪製。在高度低於 500px 的螢幕，以及高度低於 700px 的窄手機上，即時地圖會退讓，而排行榜仍會為車手排名。賽道名稱會依你以 **EN / 繁體中文** 切換器選擇的語言而變（見下方 Language）。

風格分數獎勵驚險擦身（100 × 連擊，飄移會使連擊加倍）、光環（150，風險光環另加 500）、PERFECT LINE（500）、移動中的滯空時間（每秒 10）以及每 500 公尺的乾淨行駛（100）。碰撞與墜入缺口會重設乾淨距離的進度。結果會給予完賽一顆星、每公里 250 分兩顆星、每公里 500 分三顆星，與完賽名次無關。

燃料與 nitro 的條會緩緩趨向新的數值，在低於 20% 容量時警示，在回充時閃爍，並在一格 nitro 完成時脈動。Comfort 模式與系統的減少動態效果會停用這些動畫。滑動板在按住時會顯示一個浮動的環與旋鈕，並在比賽開始時顯示一則簡短提示；放開會讓轉向回到中立。

HUD 使用共用的動態時間（120 / 240 / 480 毫秒）。速度表指針會隨速度緩動；名次變化會翻轉名次數字並帶有綠色向上或紅色向下的箭頭，排行榜的列會滑入它們的新位置。精簡的半透明事件提示位於視野中央上方，避開 HUD 面板，並將驚險擦身、PERFECT LINE、NITRO 爆發、電量增加與飄移火花等級排成佇列而不重疊；同時回充飛行電量的 NITRO 獎勵會標明這一點（NITRO · +20% CHARGE）。按鈕在被按下時會變暗而不改變大小，因此在邊框以內的任何地方按下都會生效；按住的觸控按鈕會保持發亮。VFX 設定中的選用 **Haptic feedback** 會在支援的觸控裝置上，為碰撞、NITRO 與飄移獎勵提供觸覺訊號。Comfort 模式與系統的減少動態效果會保留文字與按下狀態的顏色，同時移除新的動態與震動。

### Language

整個介面提供英文與繁體中文（繁體中文）：開始畫面、Garage、History、HUD、比賽提示、結果、路線地圖、設定，以及 3D 道路標誌。開始畫面賽道卡片下方的一個 **EN / 繁體中文** 切換器，會一次更改所有這些內容，且無需重新載入。語言依以下順序決定：

1. 你點擊切換器所儲存的選擇（`skyline-rush-locale`；它只會在點擊時寫入，絕不會來自自動偵測）；
2. 你的系統語言順序（`navigator.languages`）：第一個 `en*` 或 `zh*` 項目決定結果，其他語言會被略過（`['ja-JP', 'zh-TW']` 會選擇繁體中文），任何 `zh*` 標籤（zh-TW、zh-HK、zh-Hant、zh-CN、zh-Hans、單純的 zh）都會選擇繁體中文，而空白或缺少的清單則退回 `navigator.language`；
3. 否則為英文。

品牌與遊戲術語在兩種語言中都維持英文：Skyline Rush、NITRO、FLY、BOOST，以及對手 NOVA、ORBIT 與 APEX。字串位於 `src/locales/`；`src/i18n.js` 負責偵測、`t()` 與目前的語言。

在地化圖片：`node scripts/capture-og-images.mjs` 會在 Chrome 中驅動真實的 App，並儲存 `public/og-image.en.jpeg` 與 `public/og-image.zh-TW.jpeg`（1440×900 的開始畫面），以及供繁體中文 README 使用的 `artifacts/{readme-start,readme-hero,mobile-flight,race-results}.zh-TW.jpeg`（`node scripts/capture-og-images.mjs og` 或 `readme` 只執行其中一半）。英文的 `artifacts/` 截圖絕不會被它更動。`public/manifest.webmanifest` 與 App 圖示維持不變：圖示不含文字，而且 web app manifest 只有單一名稱與描述，沒有各語言的變體，因此第二份 manifest 會破壞可安裝性。

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

瀏覽器測試使用已安裝的 Google Chrome，並允許 SwiftShader 進行無頭渲染。僅 CPU 的 CI 使用 0.25 的裝置像素比，以維持 3D 場景的流暢，同時保留相同的 CSS 視窗尺寸與遊戲玩法斷言；本機測試則以完整解析度渲染。一般遊玩使用瀏覽器可用的 GPU。英文 README 的截圖僅在檔案缺失時，或使用 `UPDATE_ARTIFACTS=1 npm run test:browser` 時，才會以 JPEG（品質 70）寫入 `artifacts/`，因為即時 3D 場景每次執行都不同；測試的 trace／結果會被忽略。完整的衝刺測試在快速的機器上大約需要一分鐘，軟體渲染拖慢模擬時則更久。

```sh
npm run preview         # Serve the production build after npm run build
```

要在手機上檢查，請在你的網路上提供建置結果（`npx vite preview --host 0.0.0.0`），並以 `?perf` 開啟（例如 `http://<computer-ip>:4173/?perf`）。畫面頂端會出現一條列，顯示過去 20 秒比賽中的影格時間：中位數（p50）、第 95 百分位數（p95）、平均 fps 與取樣長度。沒有 `?perf` 時，不會量測也不會顯示任何東西。

```sh
make perf BASE=main         # A/B in Chrome at 412×915, CPU throttled 6× (RATE=20 for a low-end phone), 3 alternating rounds
make perf BASE=main VIEWPORT=desktop  # The same A/B at 1440×900 desktop size
make perf-phone             # Like make phone: asks base version, Tailscale/Wi-Fi and Telegram; logs phone temperatures
```

`make perf` 會建置此工作目錄，若有 `BASE=<git ref>` 也會建置該 ref（在 `.claude/worktrees/perf-<sha>` 中，下次會重複使用），每次執行在 Coast 上競速 24 秒，並印出每次執行的列以及各建置的中位數。`make perf-phone` 對於未傳入的項目會以和 `make phone` 相同的方式詢問（`BASE=`、`VIA=tailscale|wifi|auto`、`TG=0`），為每個建置印出並傳送一個 `?perf` 網址到 Telegram，在 USB 上的任何 Android 手機的 Chrome 中開啟第一個網址（`adb reverse`，因此任何網路都可行），在按下 Ctrl+C 時傳送網址已失效的通知，並每 10 秒記錄手機的感測器溫度與降頻等級（`dumpsys thermalservice`），以及 Mac 的熱警告等級，直到按下 Ctrl+C。只在相同的降頻等級下比較執行結果：發熱的手機無論是哪個建置都會降頻並掉幀。iPhone 不回報溫度。

## 部署

請在 [https://weskao.github.io/skyline-rush/](https://weskao.github.io/skyline-rush/) 遊玩。此網站為公開：訪客不需要 GitHub 帳號或 Tailscale，開發者的電腦也可以離線。

```sh
git tag v0.4.0 && git push origin v0.4.0   # Release: deploys once CI confirms the commit already passed on main
make deploy                              # Deploy remote main manually through the same CI flow
# The on-screen version (ready screen, desktop and mobile) is `package.json`'s version; `/release` bumps it
# after scripts/release-gate.sh has seen a green CI run for the commit on main.
```

CI（`.github/workflows/ci.yml`）會在推送到 `main`、pull request、版本標籤推送（`v*`）與手動執行時，建置並執行單元測試與 Chrome 瀏覽器測試。瀏覽器測試以八個平行分片執行（`--shard=N/8`），而對同一分支的較新推送會取消它所取代的那次執行。手動執行會在所有檢查通過後發佈；版本標籤推送會重新執行單元測試，確認（`release-verified`）被標記的程式碼已在 `main` 上通過完整測試套件，而不是重新執行瀏覽器測試，然後發佈並驗證公開網站。若標籤所在的提交從未在 `main` 上通過 CI，就不會部署。一般的分支推送與 pull request 只會執行檢查。Pages 的建置使用 `--base=/skyline-rush/`，讓腳本、樣式與字型從專案網址載入。GitHub Pages 必須使用 **GitHub Actions** 作為發佈來源。手動部署需要已驗證的 GitHub CLI（`gh auth login`）；請先推送你的提交，因為 `make deploy` 使用的是遠端 `main`。部署不再依賴本機的 pre-push hook 或 Netlify 登入。當任何檢查或部署在推送、標籤或手動執行時失敗，`notify-telegram` 工作會將失敗執行的連結傳送到 Telegram；它需要儲存庫的 secrets `TELEGRAM_BOT_TOKEN` 與 `TELEGRAM_CHAT_ID`（以 `gh secret set <NAME>` 設定各項，它會提示輸入值），缺少時會安靜地略過。

連結預覽圖片是 `public/og-image.jpeg`，為 `public/og-image.en.jpeg` 的副本；`node scripts/capture-og-images.mjs og` 會擷取兩種語言的封面並更新該副本。爬蟲無法切換語言，因此 `index.html` 只參照英文封面（搭配 `og:locale` `en_US` 與 `og:locale:alternate` `zh_TW`），而 `public/og-image.zh-TW.jpeg` 是供直接連結使用的中文版本。更改封面後，請提高 `index.html` 中 `og:image` 的 `?v=`，讓社群網站抓取新的圖片。

## 專案

- `src/game.js`：確定性的街機模擬、對手、車流與完賽順序。
- `src/input.js`：鍵盤與多指標控制，含取消與失焦清理；讀取已儲存的按鍵對應。
- `src/key-map.js`：純粹的按鍵對應，含 E / X NITRO、衝突互換的重新綁定、驗證與儲存。
- `src/history.js`：已儲存的遊戲資料：比賽歷史（最近 50 筆）、每條賽道的最佳成績與舊版遷移、生涯統計、獎章、星星、已裝備的塗裝、幽靈車與每日排行榜。
- `src/ghost.js`：10 Hz 的幽靈車錄製、每條賽道的驗證與內插播放。
- `src/appearance.js`：塗裝目錄與星星解鎖門檻。
- `src/rng.js`：以種子產生的隨機串流；賽道的拾取物與光環來自賽道種子。
- `src/world.js`、`src/geometry.js`：Three.js 渲染器、程序式生成的車輛、公路、天際線、飛行特效與鏡頭。
- `src/effects.js`：固定 480 顆粒子的 GPU 池，用於蒸氣、火花與降落塵土。
- `src/track-paths.js`、`src/world-tour-scene.js`：每條賽道一份距離到道路的對應，以及共用的 World Tour 道路、景物與地標。
- `src/route-map.js`、`src/i18n.js`：SVG 完整路線與即時車手地圖；語言偵測、已儲存的選擇、`t()` 與英文／繁體中文的賽道名稱；`src/locales/` 存放目錄檔。
- `scripts/capture-og-images.mjs`：從真實的 App 擷取英文與 zh-TW 的封面圖片，以及 zh-TW 的 README 截圖。
- `src/App.vue`、`src/icons.js`：Vue 3 的 UI 外殼（開始畫面、HUD、面板、觸控操作）及其共用的 SVG 圖示；渲染一次，無響應式狀態。
- `src/main.js`、`src/style.css`：掛載 `App.vue`、串接各畫面控制器，並執行比賽生命週期（開始、暫停、重新開始、結果）與影格迴圈。
- `src/*-ui.ts`：每個畫面區域一個 TypeScript 控制器（比賽選擇、雲端存檔、觸控操作、按鍵對應、VFX、音訊、歷史對話框、攝影模式）。
- `src/race-hud.ts`、`src/race-hud-modes.ts`：比賽中的 HUD，於每次 HUD tick 以命令式方式寫入。
- `src/race-results.ts`、`src/result-screen.ts`、`src/session-progress.ts`：記錄完賽的比賽（最佳成績、解鎖、獎章、幽靈車）並顯示其結果畫面。
- `vite.config.js`：搭配 `@vitejs/plugin-vue` 的 Vite。
- `src/perf.js`：供 `?perf` 裝置檢查讀數使用的影格時間百分位數。
- `src/audio.js`：合成的音效與循環的音樂定序器；歌曲位於 `src/music-tracks.ts`，比賽到音效的事件位於 `src/race-audio-events.ts`。
- `src/audio-settings.js`：從 `localStorage` 讀取已儲存的音樂／音效開關與音量，以及滑桿的「靜音保留音量」規則。
- `tests/`：單元與瀏覽器行為測試。`tests/module-size.test.js` 讓每個原始碼模組維持在 400 行以內（較舊的大型檔案有只會下降的上限）。
- `docs/design.md`、`docs/verification.md`：範圍與驗證證據。
- `README.zh-TW.md`：此檔案的繁體中文翻譯，由 `scripts/readme-zh.mjs` 保持更新（`check`，`sync` 以 `claude -p` 翻譯，`stamp` 用於手動編輯之後）。`.githooks/pre-commit` hook 會在提交更動 README.md 時重新產生它（以 `SKIP_README_ZH=1` 略過一次），而 `.githooks/pre-push` 會在推送的提交觸及主畫面（`index.html`、`src/App.vue`、`src/main.js`、`src/style.css`、`src/locales/`；以 `SKIP_LAYOUT_GATE=1` 略過一次）時執行 `npm run test:layout`；`make` 會以 `git config core.hooksPath .githooks` 啟用這些 hook。`.claude/settings.json` 中的 Claude Code Stop hook，會在某一輪編輯了 README.md 卻沒有更新它時，讓 Claude 回頭更新。

所有車輛／景物的幾何與特效皆由程式碼產生。Barlow Condensed 依其 SIL Open Font License 隨附於 `public/fonts/OFL.txt`。Three.js、Vue、Vite 與 Playwright 保留各自的套件授權。

來源：[weskao/skyline-rush](https://github.com/weskao/skyline-rush)。單人、十條賽道、街機物理。瀏覽器驗證涵蓋桌面版 Chrome 與模擬的行動裝置視窗；iOS Safari 已在 iOS 模擬器中檢查（直式與橫式、Coast 與 Neon），但實體手機上的影格率尚未量測（請使用 `?perf`，見 Verify）。
