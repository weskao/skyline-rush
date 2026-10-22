<!-- source-sha256: 875ad5622ab51863db1c250cdd6f37448edbea8fa9e4fb1c373145b023cc3b89 generated from README.md by scripts/readme-zh.mjs; edit README.md, then run the script -->
# Skyline Rush

[English](README.md) · **繁體中文**

[**遊玩 Skyline Rush →**](https://weskao.github.io/skyline-rush/)

這是一款可直接遊玩的 3D 海岸公路衝刺遊戲，主角是一輛會飛的電動跑車，造型參考 Tesla Roadster 2 及其火箭推進器概念。你可以靠四具藍色推進器升空，與三名對手競速，飛越車流，管理電量，並降落補充電力。操控手感是虛構的街機物理；本作為非官方粉絲專案，與 Tesla 或 SpaceX 無任何關聯。

## 遊戲介紹

Skyline Rush 的經典競速是一款可在瀏覽器中遊玩的短篇街機衝刺遊戲：一名玩家對上三名對手及道路車流，桌機或手機皆可，無需安裝。其他模式則包含單人練習、自訂規則及多賽段挑戰。

- **先開車，再飛行。** 時速超過 65 km/h 後，按住 FLY 即可升空，飛越車流、穿過光環、跨越斷橋。飛行與 BOOST 共用同一份推進器電量，而且只有在路面上才會回充，因此每一次爬升都是一次取捨。
- **靠好的駕駛賺取 NITRO。** 近距離超車、飄移、光環組合（PERFECT LINE）、尾流、落地的桶滾以及拾取道具，都會填滿三格的 NITRO 儲備；你可以一次爆發用完，也可以連按來延長效果。
- **十條賽道，依序解鎖。** 黃昏的海岸、有低矮隧道的雨夜 Neon Downtown、有斷橋與側風的 Canyon Skyway、有冰面與上坡的 Aurora Pass、擁有跳台與斷裂天橋的 360° 高架螺旋 Sky Spiral，接著是世界巡迴賽：Taipei Heritage、Tokyo Afterdark、Alpine Rail Pass、Coastal Horizon 與 Cosmic Orbit。每條賽道都有一條空中捷徑，留給能在空中穩住路線的玩家。
- **有目標可追。** 每次完賽都會獲得風格星數，可在 Garage 解鎖塗裝。最佳成績幽靈車、擁有專屬排行榜的每日挑戰，以及四枚獎章，都是再戰一場的理由。

一場經典衝刺賽約一分鐘；多賽段挑戰會更久。音效由瀏覽器即時合成，進度儲存在本機儲存空間，因此不需要帳號，也沒有後端。

![開啟音訊設定的起始畫面](artifacts/readme-start.zh-TW.jpeg?v=20261022a)

![Skyline Rush 飛行畫面](artifacts/readme-hero.zh-TW.jpeg?v=20261022a)

![爬升時的手機直向版面](artifacts/mobile-flight.zh-TW.jpeg?v=20261022a)

![創下個人最佳成績的賽後結果](artifacts/race-results.zh-TW.jpeg?v=20261022a)

## 遊戲模式與重玩挑戰（開發分支）

> **持續開發中 · 2026 年 10 月 22 日。** 新模式位於 [`feature/race-modes-p0`](https://github.com/weskao/skyline-rush/tree/feature/race-modes-p0)，不代表已更新至[公開 GitHub Pages 遊戲](https://weskao.github.io/skyline-rush/)。上方原有圖片是較早版本的實際畫面；目前模式的實機瀏覽器截圖請見下方。其他尚未完成的功能列於 [TODO.md](TODO.md)。

先選擇**已解鎖的賽道**，在賽道卡片下方選擇 **遊戲模式**，需要時展開專屬設定，接著按下 **Start race** 或 Enter。新模式共用原本的 Three.js 賽道、飛行、FLY／BOOST／NITRO 及觸控系統。開發分支目前有七種模式：

| 模式 | 玩法及設定 | 成績與解鎖規則 |
| --- | --- | --- |
| **Classic Race／經典競速** | 10 條賽道、3 名 AI 對手、一般車流、空中捷徑、能量光環及 NITRO。 | 前三名解鎖下一條賽道；只有經典生涯賽能取得正式星數、獎章與解鎖進度。 |
| **Custom Race／自訂競速** | **0～3 名對手**、簡單／普通／困難、關閉／低／普通／高車流、NITRO 道具開關、一般／寬鬆碰撞。內建標準、車流衝刺、無道具、飛行練習與精準挑戰五種預設。 | 成績獨立儲存。可跑 **1／2／3／5 段連續衝刺**並累計總時間，這些是單程賽段，**並不是真正的環形賽道圈數**。 |
| **Free Drive／自由駕駛** | 在已解鎖的路線練習駕駛、甩尾與飛行，可調車流與補給，不強制排名或獲勝。 | 到路線終點可重玩或換賽道；目前不是無限延伸的開放世界。 |
| **Time Attack／計時挑戰** | 單人計時、最佳紀錄 Ghost、超前／落後距離。另可開啟 **零碰撞計時**。 | 依賽道及規則分開計算最佳成績。零碰撞挑戰如發生碰撞，該次成績無效，不覆蓋個人最佳。 |
| **Obstacle Run／障礙挑戰** | 固定種子的道路障礙；可選 **Standard／Extreme**。部分障礙左右掃動，HUD 預告前方風險。 | 乾淨閃避可得風格分數；沿原路線完賽。碰撞與視覺位置使用同一套決定性邏輯，不更動 Classic 的標準路況。 |
| **Checkpoint Rush／限時關卡** | 穿越發光的 3D 門框。起始 **28 秒**，每次成功通過關卡加 **10 秒**（最多 60 秒）及 **250 風格分數**。 | 限時通過所有關卡並抵達終點；漏門或超時不記為有效最佳成績。HUD 顯示關卡進度、剩餘時間與下一關距離。 |
| **Championship Cup／錦標賽** | 只使用已解鎖的賽道，選擇 **3 或 5 站**，每站與 NOVA、ORBIT、APEX 競速。 | 每站依名次給予 **10／7／5／3 分**，比較總積分及同分時的累積時間；錦標賽不會另外解鎖生涯賽道。 |

### 設定介面、HUD 與可用性

- 模式及賽道選擇支援鍵盤和手機觸控；設定面板只顯示該模式適用的選項。未解鎖足夠賽道時，錦標賽會顯示需要的數量。
- HUD 依模式切換：單人賽不顯示無意義的多人名次；連續衝刺與錦標賽顯示段數；限時關卡顯示即時倒數；障礙挑戰預警；零碰撞計時清楚提示是否失去有效資格。
- 練習及自訂模式成績與獨立 Ghost 規則，不會覆寫 Classic、生涯解鎖、星數、獎章或每日挑戰資料。模式專屬成績儲存在 `skyline-rush-mode-history-v1`。
- 模式選項、完成／失敗訊息及障礙警告提供英文與繁體中文；低畫質、觸控配置和減少動態仍列入後續驗收。

### 實際遊戲截圖與測試狀態

[下載 GitHub Actions／Playwright 實際遊戲截圖](https://github.com/weskao/skyline-rush/actions/runs/39742666980/artifacts/12410172411)：含自訂單人、自由駕駛、計時挑戰、障礙挑戰、Extreme 障礙、限時關卡及手機模式選單。這些都由**實際執行中的遊戲**擷取，不是設計示意圖。GitHub Artifact 可能需要登入且會過期；也可在本機執行 `npx playwright test tests/race-modes-browser.spec.js` 後查看 `test-results/race-mode-*.png`。CI 軟體渲染截圖會降解析度，無法直接代表手機實際畫質。

**驗證快照（commit `beab3e2`）**：`npm test`、正式建置及 World Tour 中途測試已通過；競速模式瀏覽器測試為 **11 項通過、1 項失敗**（零碰撞計時的 UI 測試逾時）。此分支**尚未完成全部驗收，也尚未部署**。特技挑戰、無盡道路、真正環形賽道圈數、主動道具欄與關卡編輯器等項目仍待實作，請以 [TODO.md](TODO.md) 的 `[x]` 為準。

## 在本機執行

需要 Node.js 22.12 或更新版本，以及支援 WebGL 2 並啟用硬體加速的瀏覽器。

```sh
cd "$HOME/Documents/Workspace/skyline-rush"
make         # Installs dependencies on first run, then starts the Vite + Vue dev server
```

開啟 Vite 印出的本機網址（通常是 http://127.0.0.1:5173）。資源與字型都已內建於本機；遊戲過程不會發出任何外部請求，也不需要後端或帳號。

## 操作方式

| 動作 | 鍵盤 |
| --- | --- |
| 加速 | W / ↑ |
| 煞車 | S / ↓ |
| 轉向 | A / D 或 ← / → |
| 飛行 | 時速超過 65 km/h 後按住 Space |
| 降落 | 放開 Space |
| 加速推進 | 按住 Shift；會消耗推進器電量 |
| NITRO | E / X（消耗一格完整電量；NITRO 期間再按一次可延長）。WASD 握法用 E；方向鍵玩家左手停在 Shift / X / Space |
| 飄移 | 時速超過 162 km/h 時按住 S + A / D（僅限地面） |
| 開始 | Enter |
| 暫停 / 繼續 | Esc / P |
| 重新開始 | Backspace |
| 切換鏡頭 | C |
| 全部音訊靜音 / 取消靜音 | M |
| 自動加速開 / 關 | F2 / AUTO 按鈕 |
| AIRFLOW 展示開 / 關 | V / AIRFLOW 按鈕 |

行動裝置版面提供轉向、加速、煞車、加速推進、飛行與 NITRO 按鈕，觸控操作支援同時按住多個按鈕。AUTO 會持續按住加速器，讓你專心轉向與飛行；煞車永遠優先於它。觸控裝置預設為開啟，鍵盤遊玩預設為關閉，你的選擇會一直保留，直到再次切換或重新載入頁面。離開分頁會暫停比賽並清除按住中的輸入。比賽途中點擊 SKYLINE RUSH 標誌會先暫停並詢問：**Keep racing**、**End race**（回到賽道選擇，不儲存該次成績）或 **Back to home**（重新載入）；按 Esc 則維持暫停狀態。切換鏡頭與音效的快速鍵不會影響按住中的駕駛操作。在觸控裝置上，於轉向板上向下滑動會煞車，向下並往側邊滑動則會飄移；在 Buttons 模式下，煞車鍵位於轉向按鈕下方，因此煞車 + 轉向同樣可以飄移。

比賽前或暫停時開啟 **Controls**，可調整鍵盤轉向靈敏度，或重新對應駕駛動作。選取一個動作後按下按鍵即可；衝突的按鍵設定會互換，固定的快速鍵保留不可更改，按 Escape 可取消擷取。Reset keyboard 會還原預設值。按鍵設定即時生效，並儲存於 `localStorage['skyline-rush-keymap']`。

同一個面板也能控制觸控轉向模式、慣用手、滑動靈敏度、大小、透明度，以及 FLY 採按住或切換模式。**Edit touch layout** 讓你在比賽預覽上拖曳動作按鈕與經典轉向按鈕；**Done editing** 會保留你的配置，**Reset touch layout** 則會還原。位置在重新載入後仍會保留，會隨慣用手鏡像翻轉，並在螢幕旋轉後仍維持在可視範圍內。在較矮的橫向螢幕上（高度低於 380 px，例如顯示工具列的 iPhone Safari），起始畫面會隱藏標語，讓 START RACE 不需捲動即可按到，比賽 HUD 也會隱藏速度表與次要電量列，避免面板互相重疊。

所有音訊都以 Web Audio 合成，不需要下載任何音訊檔。背景音樂有兩首循環播放的 synthwave 曲目：起始與結果畫面播放的前奏主題（約 64 秒），以及從倒數開始播放、節奏更快的比賽主題（約 55 秒）。兩者都會在每次循環中逐步堆疊，暫停時則會壓低音量。音效涵蓋選單確認、三聲倒數滴答與 GO、馬達 / 風聲、升空與加速推進、煞車、車輛 / 護欄碰撞、落地、低電量警告、近距離超車獎勵，以及完賽旋律。靜音音效會停止待播放的提示音，暫停則會淡出駕駛音效。低電量警告只有在電量回充超過 30% 後才會重新啟用。

喇叭圖示會開啟音訊設定，內有 Music 與 Sound effects 兩列，各自包含靜音開關與音量滑桿（上方起始畫面截圖中即為開啟狀態）。**Mute all**（或按 M）可一次將兩者靜音。靜音會保留各聲道的音量，取消靜音時即恢復原本音量；將滑桿拖到零也會以相同方式將該聲道靜音。兩者預設皆為開啟、音量 100%，每項開關與音量都會以 cookie（`skyline-rush-music`、`skyline-rush-sound`，以及記錄百分比的 `-volume` 版本）記住一年。在較矮的螢幕上，面板可以捲動。在瀏覽器允許自動播放的情況下，頁面一載入就會開始播放前奏音樂。若不允許（多數瀏覽器在初次造訪時都不允許），起始畫面會詢問「Play background music?」。**Play music** 會開始播放，任何其他點擊或按鍵也一樣。**Not now** 會將 Music 關閉並記住這個選擇。

飛行面板會顯示爬升、巡航、下降與觸地階段、剩餘推力秒數，以及下一個該使用的操作。青色光環標示出空中通道，並且屬於遊戲機制：請見下方的 Rings。行動裝置另有按住加速推進的按鈕。橘色碰撞回報會顯示撞擊類型與損失的速度；護欄現在會彈開並使地面上的車輛減速，從上方飛越則可越過護欄。

場景包含泛光照明、日落水面、懸索橋、推進器蒸氣、碰撞火花與觸地漣漪。鏡頭運動與非必要的速度線會遵循你系統的減少動態偏好設定。音效則為推力、碰撞與落地提供各自獨立的回饋。

**VFX**（右上角）可選擇 Realistic、Cinematic 或 Extreme 視覺風格、Low / Medium / High 畫質（Low 會關閉泛光並減少場景繪製）、Comfort 模式（無閃光、晃動、殘影或模糊）以及選用的觸覺回饋；**Fine tuning** 會將每個效果以滑桿呈現，**Reset visual settings** 則還原預設值。**AIRFLOW**（或 V）會將場景切換為空氣動力學展示：車身上的流線、遙測面板、Low drag 或 High downforce，以及駕駛、前方、後方、側面或環繞鏡頭。**Race** 可直接從展示畫面開始一場比賽。

三盞琥珀色起跑燈會在 GO 時轉為青色。玩家的車是低趴楔形跑車，配有煙燻快背式座艙、橫貫車尾的紅色燈條、四個後推進器噴口、會在加速推進、煞車與飛行時升起的青銅色彈出式尾翼、旋轉的五輻輪圈，以及可轉向的前輪。每名對手都有各自的輪廓與燈光特徵：NOVA 是長尾車身，配雙尾鰭與分段式洋紅燈光；ORBIT 是圓潤的 GT，配泡泡座艙與圓形青色車燈；APEX 是賽道車，配前分流器、車頂進氣口、高聳的端板尾翼與琥珀色 C 形燈。車流使用直立的通勤車造型。轉向會快速緩入，放開加速推進時車速會逐漸下降，而不是瞬間斷掉。所有駕駛與工具列按鈕的觸控目標至少為 44px，包括 320px 寬度時。

想獲得額外的電量獎勵，可在時速超過 126 km/h 時於地面近距離超越車流。五秒內連續的乾淨超車可連鎖至 ×5，並回充 8–16% 的電量（上限 100%）。碰撞會中斷連鎖；在空中、距離過遠以及恢復中的超車都不會獲得獎勵。HUD 會播報每次超車與最後 500 公尺；結果畫面會顯示近距離超車與碰撞的總數。

滿電時，全推力飛行約可持續五秒。電量歸零時，車輛會自動下降；放開飛行操作並在地面行駛即可回充。加速推進使用同一份電量。碰撞會使車輛減速；飛得夠高則可避開車流。在 NOVA、ORBIT 與 APEX 之前完成衝刺（依賽道不同為 4–8 公里）。在儲存空間可用時，個人最佳時間會儲存在此瀏覽器中。

### 操控手感

轉向會在 0.15 秒內推到全幅，而高速時橫向速度上限為 9 m/s。在低於 65 km/h 時按住 Fly 會被記住 1.5 秒，並在速度夠快時自動升空。在空中放開 Fly 會降低下墜加速度（11 → 7 m/s²），讓落地更柔和，並緩慢回充飛行電量（每秒 4 點，為地面速率的三分之一；電量說明顯示「滑翔充能中」）。推進器耗盡後，只要放開 Fly 且電量回到 15，即使在空中也會重新解鎖。距離斷橋 300 m 內（Sky Spiral 除外，其跳台會把車拋過去），若剩餘電量不足以用目前速度推進飛越，HUD 中央會警示「前方斷橋 · 需要 n% 電量」。碰撞判定的車寬為 1.7 m，因此更多超車會算作擦身而過。輕微觸碰護欄屬於擦撞（保留 0.92 的速度，被推回路面，不算碰撞，連鎖保留）；正面撞擊仍算碰撞。在 AUTO 開啟時，放開轉向也會讓車輛緩緩回到最近的車道中央（車道輔助）。同時按住 Fly + Boost 時，每秒消耗 22 點電量而非 29 點，保留加速推進的速度上限，並顯示 AIR DASH。

### NITRO 與飄移

NITRO 有自己的儲備（`player.nitro`，最多 3 格，每格以浮點數填充）。三段式 HUD 會顯示部分電量，填滿的段落會發光，儲滿時 NITRO MAX 會閃動（在舒適 / 減少動態模式下不會有動態效果）。賽道上的道具（藍色電池 +0.25、橘色罐子 +0.5、空中金色油罐 +1、一個填滿至上限的彩虹過充）依賽道種子放置；每一筆 NITRO 獎勵（道具、甩尾、桶滾、光環、尾流）也會補充飛行電量（每存入 0.25 = +5；過充不給），超出上限的部分會轉為電量（每 0.25 = +8）。一格 NITRO 提供 2.5 秒，速度上限提高 30 m/s，並帶來更強的加速、排氣與鏡頭回饋；再按一次可延長 2 秒且不疊加速度，因此連按三次可串成 6.5 秒的爆發。NITRO 期間碰到車流時保留 70% 的速度，而不是 45%。

在地面時速超過 162 km/h 時，煞車 + 轉向會飄移而非緊急煞車：只損失 3 m/s²，擦身而過的連鎖分數加倍，放開時依飄移時間給予 NITRO 與小幅加速（1 秒：+0.15 與 0.5 秒，2 秒：+0.3 與 0.8 秒，3 秒：+0.5 與 1.2 秒）。車身會偏轉 25°，煙霧與藍 / 橘 / 紫火花會顯示等級，輪胎尖嘯聲逐漸增強，HUD 也會標示飄移 / 小幅加速的狀態。升空、墜入缺口，或撞上車輛或護欄都會失去累積。

NITRO 不消耗電量，因此 Fly + NITRO 永遠可以同時使用（Fly + Boost + NITRO 仍維持每秒 22 點的 AIR DASH 消耗）。

**空中特技**：飛行時，快速甩動轉向（0.3 秒內兩次相反方向的按壓）會啟動 0.7 秒的桶滾。以低於 11 m/s 的速度完成桶滾落地可獲得 +0.25 NITRO；較猛烈的落地（無動力下墜約 9 m 或更高）則會失去獎勵。提早落地、撞到任何東西、隧道頂或缺口都會取消桶滾。車輛會旋轉（減少動態與 Comfortable VFX 會保留文字但取消旋轉），HUD 顯示 TRICK，並以 BARREL ROLL / TRICK +0.25 / HARD LANDING 提示、呼嘯聲，以及觸控裝置上的短暫觸覺震動來標示桶滾與其獎勵。

**捷徑**：每條賽道都有一條位於邊線車道上方 6 m 的空中通道，標示為 SHORTCUT / FLY HIGH。在通道內飛行不消耗電量，速度上限提高 12 m/s；通道兩側排列著 NITRO 電池，中段有一個油罐，但交錯的立柱會算作撞到護欄。以賽道主題色呈現的半透明平台標示出通道底面；在通道內，HUD 顯示 SHORTCUT，飛行預算顯示為 ∞（BOOST 仍會消耗電量）。

### Rings

5 公里的海岸賽道有 22 個光環，每 220 m 一組，每組 3 到 5 個（依賽道種子放置）。光環只有在車輛穿過其可見半徑時才算數；擦到邊緣不算。種類：青色電量（+20 電量）、金色 nitro（+0.5）、紫色尾流（3 秒小幅加速）、紅色風險（較小的光環，+1 NITRO 與 500 分）以及彩虹神秘（依種子隨機的單一效果：10 秒護盾或直到第一次受擊、5 秒磁吸、3 秒穿越車流的幽靈狀態，或讓對手以半速凍結 2 秒）。收集過的光環會爆開一次後消失。清除整組光環會播報 PERFECT LINE 並獲得 +1 NITRO；漏掉一個光環會中斷該組，但已獲得的獎勵會保留。

### 對手、尾流與最終衝刺

緊跟在對手或車流之後 1.5 秒，可獲得 +6 m/s 的速度上限與 +0.25 NITRO（離開尾流後才會重新觸發）。對手也會使用 NITRO，每人兩格，依個性而定：NOVA 從 8 秒起穩定施放，之後每 18 秒一次；ORBIT 在飛行時施放；APEX 從比賽進行到 75% 時爆發。輕度的橡皮筋機制（超過 50 m 後速度最多 ±4%）讓比賽保持緊張。在最後 500 m，比賽音樂會加速到 115%，狀態列則會顯示與前後最近對手的差距（`FINAL 500 M · +N m · −N m`）。

### 儲存的資料

所有儲存都使用 try/catch，因此在儲存空間被封鎖時遊戲仍可執行。`skyline-rush-history`：每場完賽一筆紀錄，保留最新 50 筆，並記錄 `fuelOuts`（飛行電量耗盡次數）與 `gapFalls`（掉入斷橋次數），用於調整飛行平衡。從起始或結果畫面開啟 **History**，可依賽道篩選、查看最佳成績與最近十次時間的圖表，並點選某場比賽查看詳情。`skyline-rush-best-tracks`：各賽道的最佳時間；舊的單一 `skyline-rush-best` 會一次性遷移至 `coast`，且仍會為 coast 寫入。`skyline-rush-unlocked`：賽道解鎖狀態，即使較舊的紀錄已移出 History 也會保留。`skyline-rush-keymap`：按鍵對應。`skyline-rush-controls` 與 `skyline-rush-vfx`：駕駛與視覺設定（幽靈車開關位於 controls 中）。`skyline-rush-ghosts`：每條賽道一個最佳成績幽靈車。`skyline-rush-medals`、`skyline-rush-stars`、`skyline-rush-paint`：附有獲得日期的獎章、每條賽道的最佳星數，以及已裝備的塗裝。`skyline-rush-daily`：每日挑戰的成績，保留最新 50 筆。每個儲存的值在載入時都會經過驗證；格式不正確的內容會被忽略。

### 幽靈車、每日挑戰、獎章與 Garage

- **幽靈車**：每場比賽會以每秒 10 次的頻率取樣車輛的距離、車道位置與高度。在某條賽道創下新的個人最佳成績時會儲存該場比賽，之後在該賽道比賽時會以半透明藍色車輛顯示。可在 Controls 中以 **Show best-run ghost** 關閉。
- **每日挑戰**：History 會顯示今天的賽道與修飾條件，依本機日期挑選：禁止飛行、雙倍車流，或僅限金色光環。Canyon 永遠不會抽到禁止飛行，因為它的斷橋需要飛行。每日挑戰成績只會記入專屬排行榜（今日最快的五名）；絕不會影響歷史紀錄、最佳時間、解鎖、星數或幽靈車。Restart 會保留挑戰，**Choose track** 則會離開挑戰。
- **獎章**：First victory（獲勝）、Clean run（無碰撞）、Perfect flight（單場比賽中 5 次 PERFECT LINE）以及 Triple burst（單次爆發中使用 3 格 NITRO：一次按壓加兩次延長）。僅符合資格的經典競速完賽可取得獎章；每枚獎章會記錄首次獲得的日期。
- **Garage**：你在每條賽道上的最佳風格星數會累加並解鎖塗裝：3 星解鎖 Aurora、6 星解鎖 Glacier、10 星解鎖 Coral、16 星解鎖 Cobalt、24 星解鎖 Obsidian（滿星 30）。現實中最受歡迎的車色——藍與黑——是長期目標。未解鎖的塗裝仍可預覽。塗裝只會改變外觀，絕不影響車輛的能力數值。

### Sky Spiral（實驗性的第五條賽道）

Sky Spiral 新增了一條真正的 3D 上升螺旋道路，位於賽博龐克天際線之上。繞著發光的中央塔樓完整行駛一圈水平迴轉，然後從三座專用跳台飛越高架缺口。既有的 FLY、BOOST 與 NITRO 都能在新賽道上使用，並附帶可選的飛行修正。這條賽道使用獨立的彎曲道路渲染器與專屬的 3D 路徑對應器；目前仍在實體行動裝置上進行驗證。

### 賽道與風格

從 Coast 開始。名列前三名即可解鎖 Neon Downtown，接著依序是 Canyon Skyway、Aurora Pass、Sky Spiral、Taipei Heritage、Tokyo Afterdark、Alpine Rail Pass、Coastal Horizon 與 Cosmic Orbit。開始前先選擇賽道；鍵盤使用者可用左 / 右方向鍵在賽道按鈕間移動，並以 Enter 選擇。Restart 會保留所選賽道；結果畫面上的 **Choose track** 會回到選單。當仍有賽道未解鎖時，登上頒獎台的完賽會在結果畫面顯示閃動的 **Next** 按鈕，可直接開始剛解鎖的賽道；一旦所有賽道原本就已開啟，以及在每日挑戰中，這個按鈕就不會出現。如果瀏覽器中斷了 WebGL 連線（在 iPhone 鎖定螢幕或切換 App 後很常見），圖形恢復時遊戲會清除警告；否則 **Start** 或 **Race again** 會重新載入頁面。每條賽道都有自己的天空、配色與程序化生成的場景：雨中的霓虹街道與低矮隧道、紅色沙漠峭壁與斷橋缺口 / 側風，或有極光與冰面的雪山。警告標誌會標示特殊路段。Aurora 的上坡路段回充地面燃料的速率只有正常的一半。

### 世界巡迴賽賽道、路線圖與賽道名稱

五條世界巡迴賽賽道共用同一個彎曲道路渲染器（`src/world-tour-scene.js`），各自擁有專屬的配色、建築與地標（總統府與北門的剪影、霓虹十字路口與一座塔、鐵道高架橋與山峰、燈塔與跨海大橋、環狀行星）。在首頁選擇 Taipei Heritage 或 Tokyo Afterdark 時，畫面會在懸浮賽車後方呈現該賽道的代表地標：總統府或東京鐵塔。每張賽道卡片都會顯示完整的主要路線，比賽期間則有即時地圖在其上標示 YOU、NOVA、ORBIT 與 APEX；空中捷徑則永遠不會被繪出。在高度低於 500px 的螢幕以及高度低於 700px 的窄手機上，即時地圖會讓出空間，排行榜仍會顯示賽車手的名次。賽道名稱會跟隨 **EN / 繁體中文** 開關所選的語言（見下方「語言」）。

風格分數獎勵近距離超車（100 × 連鎖，飄移的連鎖加倍）、光環（150，風險光環另加 500）、PERFECT LINE（500）、移動中的滯空時間（每秒 10 分），以及每 500 公尺的乾淨行駛（100 分）。碰撞與墜入缺口會重置乾淨行駛的進度。結果會給予一顆星表示完賽、每公里 250 分給兩顆星、每公里 500 分給三顆星，與完賽名次無關。

燃料與 nitro 條會平順地趨近新的數值，在容量低於 20% 時發出警告，補充時會閃爍光澤，並在一格 nitro 完成時閃動。Comfort 模式與系統的減少動態會停用這些動畫。滑動板在按住時會顯示浮動的圓環 / 圓鈕，並在比賽開始時顯示簡短提示；放開後轉向會回到中立。

HUD 使用共用的動態時間（120 / 240 / 480 ms）。速度表指針會隨速度平順移動；名次變化時，名次數字會翻轉並附上綠色向上或紅色向下的箭頭，排行榜的列則會滑入新的位置。精簡的半透明事件提示位於畫面中央上方，避開 HUD 面板，並將擦身而過、PERFECT LINE、NITRO 爆發、電量增加與飄移火花等級排入佇列，不會互相重疊；同時補充飛行電量的 NITRO 獎勵會標示補了多少（NITRO · 集氣 +20%）。暫停、完賽與重新開始會清空佇列。按鈕在按下時會壓縮，放開時彈回；按住的觸控按鈕會保持發亮。VFX 設定中的選用 **Haptic feedback** 會在支援的觸控裝置上對碰撞、NITRO 與飄移獎勵給予回饋。Comfort 模式與系統的減少動態會保留文字與按下狀態的顏色，同時移除新增的動態與震動。

### 語言

整個介面都提供英文與繁體中文（繁體中文）：起始畫面、Garage、History、HUD、比賽提示、結果、路線圖、設定，以及 3D 路標。起始畫面賽道卡片下方的 **EN / 繁體中文** 開關會一次切換全部內容，無須重新載入。語言依下列順序決定：

1. 你點擊開關所儲存的選擇（`skyline-rush-locale`；只會在點擊時寫入，絕不會寫入自動偵測的結果）；
2. 你的系統語言順序（`navigator.languages`）：由第一個 `en*` 或 `zh*` 項目決定，其他語言會被略過（`['ja-JP', 'zh-TW']` 會選用繁體中文），任何 `zh*` 標籤（zh-TW、zh-HK、zh-Hant、zh-CN、zh-Hans、單純的 zh）都會選用繁體中文，清單為空或不存在時改用 `navigator.language`；
3. 其他情況使用英文。

品牌與遊戲用語在兩種語言中都保持英文：Skyline Rush、NITRO、FLY、BOOST，以及對手 NOVA、ORBIT 與 APEX。字串位於 `src/locales/`；`src/i18n.js` 負責偵測、`t()` 與目前的語系。

在地化圖片：`node scripts/capture-og-images.mjs` 會在 Chrome 中操作真實的應用程式，儲存 `public/og-image.en.jpeg` 與 `public/og-image.zh-TW.jpeg`（1440×900 的起始畫面），以及供繁體中文 README 使用的 `artifacts/{readme-start,readme-hero,mobile-flight,race-results}.zh-TW.jpeg`（`node scripts/capture-og-images.mjs og` 或 `readme` 只執行其中一半）。它不會動到 `artifacts/` 中的英文截圖。`public/manifest.webmanifest` 與應用程式圖示維持原樣：圖示不含文字，而且網頁應用程式資訊清單只有單一名稱與說明、沒有各語系的版本，再加一份資訊清單反而會破壞可安裝性。

## 驗證

```sh
npm test                 # Deterministic simulation, input lifecycle and geometry
npm run build           # Production assets in dist/
npm run test:browser    # Real Chrome: desktop, mobile, graphics errors, full race
make run                # All three (test:browser builds first)
make deploy             # Trigger CI checks + GitHub Pages deployment of remote main
```

瀏覽器測試使用已安裝的 Google Chrome，並允許 SwiftShader 進行無頭渲染。僅使用 CPU 的 CI 採用 0.25 的裝置像素比，以維持 3D 場景的流暢度，同時保有相同的 CSS 視窗尺寸與遊戲斷言；本機測試則以完整解析度渲染。正常遊玩時會使用瀏覽器可用的 GPU。英文 README 截圖會以 JPEG（品質 70）寫入 `artifacts/`，僅在檔案不存在時，或使用 `UPDATE_ARTIFACTS=1 npm run test:browser` 時才會寫入，因為即時 3D 場景每次執行都不同；測試追蹤 / 結果會被忽略。完整衝刺測試在快速的機器上約需一分鐘，軟體渲染拖慢模擬時則會更久。

```sh
npm run preview         # Serve the production build after npm run build
```

若要在手機上檢查，請在你的網路上提供建置結果（`npx vite preview --host 0.0.0.0`），並以 `?perf` 開啟（例如 `http://<computer-ip>:4173/?perf`）。頂部會出現一條資訊列，顯示過去 20 秒賽車期間的影格時間：中位數（p50）、第 95 百分位數（p95）、平均 fps 以及取樣長度。沒有 `?perf` 時，不會進行任何測量或顯示。

## 部署

請至 [https://weskao.github.io/skyline-rush/](https://weskao.github.io/skyline-rush/) 遊玩。此網站為公開：訪客不需要 GitHub 帳號，也不需要 Tailscale，開發者的電腦也可以處於離線狀態。

```sh
git tag v0.4.0 && git push origin v0.4.0   # Release: CI checks → GitHub Pages deployment
make deploy                              # Deploy remote main manually through the same CI flow
# The on-screen version (ready screen, desktop and mobile) is `package.json`'s version; `/release` bumps it.
```

CI（`.github/workflows/ci.yml`）會在推送到 `main`、拉取請求、版本標籤推送（`v*`）以及手動執行時，建置並執行單元測試與 Chrome 瀏覽器測試。瀏覽器測試分為四個平行分片執行（`--shard=N/4`），對同一分支的較新推送會取消被取代的執行。版本標籤推送與手動執行只有在所有檢查通過後才會發佈，之後再驗證公開網站。一般的分支推送與拉取請求只會執行檢查。Pages 建置使用 `--base=/skyline-rush/`，使腳本、樣式與字型能從專案網址載入。GitHub Pages 必須使用 **GitHub Actions** 作為發佈來源。手動部署需要已驗證的 GitHub CLI（`gh auth login`）；請先推送你的提交，因為 `make deploy` 使用的是遠端 `main`。部署不再依賴本機的 pre-push 掛鉤或 Netlify 登入。當推送、標籤或手動執行中的任一檢查或部署失敗時，`notify-telegram` 工作會將失敗執行的連結傳送到 Telegram；它需要儲存庫密鑰 `TELEGRAM_BOT_TOKEN` 與 `TELEGRAM_CHAT_ID`（以 `gh secret set <NAME>` 逐一設定，指令會提示輸入值），缺少時會安靜略過。

連結預覽圖片為 `public/og-image.jpeg`，是 `public/og-image.en.jpeg` 的副本；`node scripts/capture-og-images.mjs og` 會擷取兩種語言的封面並更新該副本。爬蟲無法切換語言，因此 `index.html` 只引用英文封面（搭配 `og:locale` `en_US` 與 `og:locale:alternate` `zh_TW`），`public/og-image.zh-TW.jpeg` 則是它的中文版，供直接連結使用。更換封面後，請調高 `index.html` 中 `og:image` 的 `?v=`，讓社群網站抓取新圖。

## 專案結構

- `src/game.js`：確定性的街機模擬、對手、車流與完賽順序。
- `src/input.js`：鍵盤與多指標控制，含取消與失焦清理；會讀取已儲存的按鍵對應。
- `src/key-map.js`：純粹的按鍵對應，含 E / X NITRO、衝突互換的重新綁定、驗證與儲存。
- `src/history.js`：已儲存的遊戲資料：比賽歷史（最新 50 筆）、各賽道最佳成績與舊資料遷移、生涯統計、獎章、星數、已裝備塗裝、幽靈車與每日排行榜。
- `src/ghost.js`：10 Hz 幽靈車錄製、各賽道驗證與內插播放。
- `src/appearance.js`：塗裝目錄與星數解鎖門檻。
- `src/rng.js`：種子隨機串流；賽道道具與光環皆來自賽道種子。
- `src/world.js`、`src/geometry.js`：Three.js 渲染器、程序化車輛、公路、天際線、飛行特效與鏡頭。
- `src/effects.js`：固定 480 顆粒子的 GPU 粒子池，用於蒸氣、火花與落地塵土。
- `src/track-paths.js`、`src/world-tour-scene.js`：每條賽道一份距離到道路的對應，以及共用的世界巡迴賽道路、場景與地標。
- `src/route-map.js`、`src/i18n.js`：SVG 完整路線圖與即時賽車手地圖；語系偵測、已儲存的選擇、`t()`，以及 English/繁體中文 的賽道名稱；`src/locales/` 存放字串目錄。
- `scripts/capture-og-images.mjs`：從真實的應用程式擷取英文與繁體中文的封面圖片，以及繁體中文 README 的截圖。
- `src/App.vue`、`src/icons.js`：Vue 3 的 UI 外殼（起始畫面、HUD、面板、觸控控制）及其共用的 SVG 圖示；僅渲染一次，沒有響應式狀態。
- `src/main.js`、`src/style.css`：掛載 `App.vue`，接著在該 DOM 上驅動遙測、暫停 / 結果、響應式控制與生命週期。
- `vite.config.js`：搭配 `@vitejs/plugin-vue` 的 Vite。
- `src/perf.js`：用於 `?perf` 裝置檢查讀數的影格時間百分位數。
- `src/audio.js`：合成音效與循環播放的前奏 / 比賽音樂定序器。
- `src/audio-settings.js`：讀取已儲存的音樂／音效開關與音量 cookie，以及滑桿「靜音保留音量」的規則。
- `tests/`：單元與瀏覽器行為測試。
- `docs/design.md`、`docs/verification.md`：範圍與驗證佐證。
- `README.zh-TW.md`：本檔案的繁體中文翻譯，由 `scripts/readme-zh.mjs` 保持最新（`check`、以 `claude -p` 翻譯的 `sync`，以及手動編輯後使用的 `stamp`）。`.githooks/pre-commit` 掛鉤會在提交變更 README.md 時重新產生它（可用 `SKIP_README_ZH=1` 略過一次）；`make` 會以 `git config core.hooksPath .githooks` 啟用掛鉤。`.claude/settings.json` 中的 Claude Code Stop 掛鉤會在某一輪編輯了 README.md 卻沒有更新它時，讓 Claude 回頭更新。

所有車輛 / 場景幾何與特效皆由程式碼生成。Barlow Condensed 依 SIL Open Font License 內建於 `public/fonts/OFL.txt`。Three.js、Vue、Vite 與 Playwright 保留其各自的套件授權。

原始碼：[weskao/skyline-rush](https://github.com/weskao/skyline-rush)。單人、十條賽道、街機物理。瀏覽器驗證涵蓋桌機 Chrome 與模擬的行動裝置視窗；iOS Safari 已在 iOS 模擬器中檢查過（直向與橫向，Coast 與 Neon），但實體手機上的影格率尚未測量（請使用 `?perf`，見「驗證」）。
