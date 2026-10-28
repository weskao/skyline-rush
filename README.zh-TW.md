<!-- source-sha256: 1bf94d3d0dd5fab2bbd728116a8114202c316a4f03abd963964e5d6eb70362b4 generated from README.md by scripts/readme-zh.mjs; edit README.md, then run the script -->
# Skyline Rush

[English](README.md) · **繁體中文**

[**開始遊玩 Skyline Rush →**](https://weskao.github.io/skyline-rush/)

這是一款可直接遊玩的 3D 海岸公路衝刺遊戲,主角是一輛會飛的電動跑車,造型參考 Tesla Roadster 2 及其火箭推進器概念。透過四具藍色推進器升空,與三名對手競速,飛越車流,管理電量,並降落地面充電。操控手感屬於虛構的街機物理;這是一個非官方的粉絲專案,與 Tesla 或 SpaceX 無任何關聯。

## 遊戲介紹

在 Classic Race 中,Skyline Rush 是一場可在瀏覽器中重複挑戰的短程街機衝刺:一名玩家對上三名對手與其間的車流,桌機或手機皆可遊玩,無須安裝任何軟體。其他模式提供單人駕駛、自訂規則與多階段挑戰。

- **先駕駛,再飛行。** 時速超過 65 km/h 後,按住 FLY 即可升空,飛越車流、穿過光環,並跨越斷裂的橋樑。飛行與 BOOST 共用同一組推進器電量,且只有在路面上才會回充,因此每一次爬升都是一次抉擇。
- **靠好的駕駛賺取 NITRO。** 近距離超車、飄移、連續光環(PERFECT LINE)、尾流、成功落地的桶滾以及拾取道具,都會填滿三格的 NITRO 儲備;可以一次爆發用完,也可以連按以延長時間。
- **十條賽道,依序解鎖。** 黃昏海岸、有低矮隧道的雨夜 Neon Downtown、有斷橋與側風的 Canyon Skyway、有冰面與上坡的 Aurora Pass、擁有跳躍坡道與斷裂天橋的 Sky Spiral 360° 高架螺旋道路,接著是 World Tour:Taipei Heritage、Tokyo Afterdark、Alpine Rail Pass、Coastal Horizon 與 Cosmic Orbit。每條賽道都有一條空中捷徑,留給能在空中穩住路線的玩家。
- **值得追逐的目標。** 每次完賽都會獲得造型星星,可在 Garage 解鎖塗裝。最佳成績幽靈車、附有專屬排行榜的每日挑戰,以及四枚獎章,都是再次挑戰的理由。

一場 Classic 衝刺約一分鐘;多階段挑戰則需要更久。音效由瀏覽器即時合成,進度則保存在本機儲存空間,因此不需要帳號或後端。

**首頁畫面** — 選擇賽道與鏡頭角度,然後開始比賽。

https://github.com/user-attachments/assets/059aba91-65b2-4b0b-9abd-15461fcb1623

**比賽中** — 在其中一條賽道上完整跑完一場。

https://github.com/user-attachments/assets/e0ddb94c-794e-49ab-9b66-51cb5150f101

![Gameplay demo: countdown, lift-off over traffic and touchdown on Coast](artifacts/readme-demo.gif)

![Start screen with the audio settings open](artifacts/readme-start.zh-TW.jpeg?v=20261024a)

![Skyline Rush in flight](artifacts/readme-hero.zh-TW.jpeg?v=20261024a)

![Mobile portrait layout while ascending](artifacts/mobile-flight.zh-TW.jpeg?v=20261024a)

![Race results with a new personal best](artifacts/race-results.zh-TW.jpeg?v=20261024a)

### 手機截圖與示範

可用直向或橫向搭配觸控操作遊玩。影片從開始畫面出發,依序經過倒數、FLY 升空與降落,跑完一場 Coast;AUTO 會持續按住油門。

**直向 — 準備出賽**

![Mobile portrait start screen with track selection and touch-friendly race buttons](artifacts/mobile-home.jpeg)

**橫向 — 以觸控操作飛行**

![Mobile landscape flight with FLY held and the touch controls visible](artifacts/mobile-landscape-flight.jpeg)

**觸控遊玩示範** · [觀看 MP4](artifacts/mobile-demo.mp4)

![Mobile touch gameplay: Coast countdown, FLY lift-off and landing](artifacts/mobile-demo.gif)

截取自在 Chrome 行動裝置模擬下執行的實際遊戲,解析度為 390×844(直向)與 844×390(橫向),使用全新的示範設定檔。這些截圖並不代表實體手機上的效能表現。

## 遊戲模式與重玩性(開發分支)

> **開發中 · 2026 年 10 月 22 日。** 這些模式的新增內容位於 [`feature/race-modes-p0`](https://github.com/weskao/skyline-rush/tree/feature/race-modes-p0),不一定已經包含在[已部署的 GitHub Pages 版本](https://weskao.github.io/skyline-rush/)中。上方現有截圖呈現的是較早期的遊戲畫面;目前各模式的截圖連結在下方。[路線圖](TODO.md)中還有其他尚未完成的功能。

選擇一條**已解鎖的賽道**,在賽道卡片下方選擇 **GAME MODE**,需要時展開其規則,然後按下 **Start race**(或按 Enter)。比賽仍然使用相同的 Three.js 道路、飛行、FLY / BOOST / NITRO 以及響應式觸控操作。開發分支提供下列模式:

| Mode | What changes | Win condition / progression |
| --- | --- | --- |
| **Classic Race** | 標準的三名對手衝刺,可在 10 條賽道中任選一條,包含車流、捷徑、光環與 NITRO。 | 登上頒獎台即可解鎖下一條賽道;只有 Classic 會頒發生涯星星、獎章與正式最佳成績。 |
| **Custom Race** | 可選擇 **0–3 名對手**、Easy / Normal / Hard 的 AI、Off / Light / Normal / Heavy 的車流量、NITRO 道具開關,以及 Normal / Relaxed 的碰撞懲罰。內建五種預設:Standard、Traffic Rush、No Items、Air Focus 與 Precision。 | 非排名成績有獨立的歷史紀錄。可進行 **1 / 2 / 3 / 5 個衝刺階段**,並比較累計時間。各階段重複點對點路線;**並非環形賽道的圈數**。 |
| **Free Drive** | 獨自探索任何已解鎖的賽道,可調整道路車流與道具,沒有名次,也不強制設定勝利條件。 | 自由駕駛、飄移與飛行,之後可重新開始或選擇其他賽道。這些道路有設定好的終點;這**不是**無限世界模式。 |
| **Time Attack** | 單人計時衝刺,提供相容的最佳成績幽靈車,以及領先/落後的分段時間。可選擇啟用 **Clean Time Trial**。 | 依賽道與規則分別記錄最佳時間;Clean 成績若發生任何碰撞即視為無效,不會取代個人最佳。 |
| **Obstacle Run** | 以種子產生的路邊障礙;密度分為 **Standard** 或 **Extreme**。部分障礙會橫向移動;警告 HUD 會預告即將到來的危險。 | 閃避障礙,乾淨通過可獲得造型分數,並使用一般路線的終點。障礙物的擺放與碰撞共用確定性邏輯;Classic 維持不變。 |
| **Checkpoint Rush** | 穿越發光的 3D 閘門拱門。起始時間為 **28 秒**;每通過一個閘門且無碰撞,可獲得 **+10 秒**(上限 60 秒)與 **250 造型分**。 | 須在時間用完前通過每一個閘門並抵達終點。錯過閘門或超時,**不會**儲存有效的最佳成績。HUD 會顯示已通過的閘門數、剩餘時間與到下一個目標的距離。 |
| **Championship Cup** | 選擇由已解鎖路線組成的 **3 條或 5 條賽道** Cup;在每個賽段與 NOVA、ORBIT 和 APEX 競速。 | 名次分別獲得 **10 / 7 / 5 / 3 分**;由累計積分與總時間決定冠軍,同分時以時間決勝。Cup 成績與生涯解鎖各自獨立。 |

### Event Lab Lite 第一版

**Event Lab Lite** 可在已解鎖路線上編輯本機賽道樣板中的障礙、NITRO 環與補給。可調整車道與距離,復原/重做/重設編輯,並以文字匯入或匯出經驗證的賽道。開始後會將賽道轉為實際比賽物件;重試會保留賽道與種子。賽道成績與 Career、Custom 紀錄分開。交通錐、自訂坡道、檢查點編輯及社群分享尚未包含在第一版。

### 賽前設定、結果與無障礙功能

- 模式與賽道的選擇仍可透過鍵盤與觸控操作;情境面板只會顯示與所選模式相關的選項。無法使用的 Cup 會說明還需要多少條賽道。
- HUD 會依模式調整:單人賽事會隱藏容易誤導的對手名次;多階段與 Cup 賽事會顯示階段進度;Checkpoint Rush 顯示即時的閘門倒數;Obstacle Run 會警告即將出現的障礙;Clean Time Trial 會清楚標示成績已失效。
- Practice、Custom、Time Attack、Obstacle、Checkpoint 與 Cup 的結果使用獨立的 `skyline-rush-mode-history-v1` 紀錄鍵。符合資格的練習幽靈車有各自儲存的規則集;Classic 的解鎖、星星、獎章、Daily 紀錄與正式成績不會受到練習賽影響。
- 在 **History → Challenge records** 中,可依模式篩選,查看每個確切賽道/規則集的個人最佳,以及符合資格的 Time Attack 幽靈車。即使最近 50 場紀錄輪替掉,終身最佳仍會保存在 `skyline-rush-mode-bests-v1` 之下。挑戰紀錄明確不屬於生涯獎章或星星。
- 模式名稱、結果說明、設定選項與危險警告皆支援英文與繁體中文。低畫質圖形、觸控操作與減少動態效果,仍屬於驗證計畫的一部分。

### 實際遊戲截圖與驗證

用來檢視這些模式的截圖,都是**從執行中的瀏覽器遊戲**擷取,而非概念圖。[下載實際的 Playwright 擷圖集](https://github.com/weskao/skyline-rush/actions/runs/39742666980/artifacts/12410172411)(Custom solo、Free Drive、Time Attack、Obstacle Run、Extreme obstacles、Checkpoint Rush 與手機模式選單)。GitHub Actions 的產出檔案可能需要登入,且會過期;若要在本機重新產生,請執行 `npx playwright test tests/race-modes-browser.spec.js` 並開啟 `test-results/race-mode-*.png`。CI 的截圖是以軟體算圖並降低解析度,無法代表最終裝置上的畫質。

**驗證快照,commit `beab3e2`:** `npm test`、正式版建置與 World Tour 賽中測試皆已通過;針對性的賽事模式瀏覽器工作回報 **11 項通過 / 1 項失敗**(Clean Time Trial 瀏覽器測試逾時)。此分支**尚未完全驗證,也尚未部署**。未來的路線圖項目——包括 Stunt Attack、無限程序化道路、真正的封閉賽道圈數、可主動使用的道具欄與賽道編輯器——除非在 [TODO.md](TODO.md) 中標記為 `[x]`,否則仍屬待辦。

## 在本機執行

需要 Node.js 22.12 或更新版本,以及支援 WebGL 2 並已啟用硬體加速的瀏覽器。

```sh
cd "$HOME/Documents/Workspace/skyline-rush"
make         # Installs dependencies on first run, then starts the Vite + Vue dev server
```

開啟 Vite 印出的本機網址(通常是 http://127.0.0.1:5173)。資源與字型皆在本機打包;遊戲過程不會發出任何對外請求。不需要後端或帳號。

`make` 與 `make dev-unlocked` 也會啟動本機的 Firebase Auth/Firestore 模擬器(需要 Java 21+),因此雲端存檔的 Google 登入會使用假的測試帳號,絕不會碰到真實存檔。專案擁有者的雲端存檔操作與 Spark 配額檢查,請見 `docs/cloud-save.md`。

`make phone` 會開啟一個終端機選單,用來啟動、檢查或停止可供手機開啟的開發伺服器(透過 Tailscale 或同一個 Wi-Fi),並在伺服器回應後印出手機用的網址。選單會列出此 checkout、其他 worktree 與最近的分支,也可以輸入分支名稱;`make phone <name>` 會直接前往該分支(或 `feature/<name>`),必要時會在 `.claude/worktrees/` 底下建立其 worktree。它一律提供正常的鎖定版建置:全部解鎖的伺服器(`make dev-unlocked`、`make dev-feature`)仍僅限桌機使用。它需要個人的 `phone-dev` Claude Code skill(`/phone-dev` 會詢問同一個選單),且不啟動模擬器,因此手機上的雲端存檔登入會使用真實的專案。

## 操作方式

| Action | Keyboard |
| --- | --- |
| 加速 | W / ↑ |
| 煞車 | S / ↓ |
| 轉向 | A / D 或 ← / → |
| 飛行 | 時速超過 65 km/h 後按住 Space |
| 降落 | 放開 Space |
| 加速推進 | 按住 Shift;消耗推進器電量 |
| NITRO | E / X(一格完整電量;NITRO 期間再按一次可延長)。使用 WASD 的玩家用 E;使用方向鍵的玩家讓左手維持在 Shift / X / Space |
| 飄移 | 在時速超過 162 km/h 時按住 S + A / D(僅限地面) |
| 開始 | Enter |
| 暫停 / 繼續 | Esc / P |
| 重新開始 | Backspace |
| 切換鏡頭 | C |
| 全部音訊靜音 / 取消靜音 | M |
| 自動加速開 / 關 | F2 / AUTO 按鈕 |
| AIRFLOW 展示開 / 關 | V / AIRFLOW 按鈕 |
| 在首頁切換賽道 | 向左 / 右滑動或拖曳 3D 預覽,或在觸控板上用兩指滑動 |

手機版面提供轉向、油門、煞車、加速推進、飛行與 NITRO 按鈕。觸控操作支援同時按住多個按鈕。AUTO 會持續按住油門,讓你專心轉向與飛行;煞車一律優先於它。每種裝置預設皆為開啟;一旦你切換過,選擇就會記在此瀏覽器中(`skyline-rush-auto`)。離開分頁會暫停比賽並清除按住的輸入。比賽中點擊 SKYLINE RUSH 標誌會暫停並先詢問:**Keep racing**、**End race**(回到賽道選擇,此次成績不儲存)或 **Back to home**(重新載入);無論選哪一項,開始畫面都會重新開啟於剛跑過的賽道,並捲動到賽道列的中央(第一條與最後一條賽道位於列的兩端)。Esc 會讓比賽維持暫停。鏡頭與音效快捷鍵會保留按住的駕駛操作。在觸控上,把拇指在轉向板上往下滑會煞車,往下並往旁邊滑則會飄移;在 Buttons 模式中,較窄的煞車鍵位於轉向按鈕上方,避開拇指平常擺放的那一列,因此只有刻意才會按到;從 ← 或 → 把拇指往上滑進煞車鍵,會同時維持轉向並煞車,所以單一拇指就能飄移,往下滑回去則會放開煞車。觸控按鈕與螢幕角落保持距離,拇指更容易搆到,平板則會將它們上移並放大。

在比賽前或暫停時開啟 **Controls**,可調整鍵盤轉向靈敏度,或重新對應駕駛操作。選擇一個操作後按下按鍵;衝突的綁定會互換,固定的快捷鍵保持保留,按 Escape 可取消擷取。Reset keyboard 會還原預設值。綁定會立即生效,並儲存於 `localStorage['skyline-rush-keymap']`。

同一個面板也控制觸控轉向模式、慣用手、滑動靈敏度、大小、不透明度,以及按住/切換式的 FLY。**Edit touch layout** 讓你把動作按鈕與經典轉向按鈕拖曳到比賽預覽上;**Done editing** 會保留你的配置,**Reset touch layout** 則還原。位置在重新載入後仍會保留,會隨慣用手鏡像,旋轉後仍保持在可視範圍內。在較矮的橫向螢幕上(高度低於 380 px,例如顯示工具列的 iPhone Safari),開始畫面會省略標語,讓 START RACE 不需要捲動,比賽 HUD 也會隱藏速度表與次要電量列,避免面板互相重疊。

所有音訊皆以 Web Audio 合成;不需要下載任何音訊檔案。背景音樂有兩首循環播放的 synthwave 曲目:開始與結果畫面使用的片頭主題曲(約 64 秒),以及從倒數起播放的較快速比賽主題曲(約 55 秒)。兩者都會在循環中逐步堆疊,並在暫停時降低音量。音效涵蓋選單確認、三次倒數滴答聲與 GO、馬達/風聲、升空與加速、煞車、車輛/護欄碰撞、落地、低電量警告、近距離超車獎勵以及完賽旋律。將音效靜音會停止待播的提示音,暫停則會淡出駕駛音效。低電量警告只有在電量回充到 30% 以上後才會重新啟用。

喇叭圖示會開啟音訊設定,內有 Music 與 Sound effects 兩列,各有一個靜音開關與一個音量滑桿(上方的開始畫面截圖中已展開)。**Mute all**(或 M)會同時將兩者靜音。靜音會保留各聲道的音量,所以取消靜音後會回到原本的音量;把滑桿拖到零,也會以同樣方式將該聲道靜音。兩者預設皆為開啟、音量 100%,每個開/關選擇與音量都會記在 `localStorage` 中(`skyline-rush-music`、`skyline-rush-sound` 儲存 `on`/`off`,另有 `-volume` 變體儲存百分比);沒有儲存任何值時,兩個聲道皆為開啟,並會以 `on` 儲存。在較矮的螢幕上,面板可捲動。在瀏覽器允許自動播放的情況下,片頭音樂會在頁面載入後立即開始。若不允許(首次造訪時的 Chrome 與大多數其他瀏覽器),則由第一次點按、點擊或按鍵來啟動。在 iPhone 與 iPad 上,遊戲會要求媒體播放權限,因此靜音開關不會讓它靜音;這也會在遊戲進行期間暫停其他 App 的音訊。

飛行面板會顯示爬升、巡航、下降與觸地、剩餘推力秒數,以及下一個要使用的操作。青色光環標示出空中通道,屬於遊戲玩法的一部分:請見下方的 Rings。手機版另有按住加速的 boost 按鈕。橘色的碰撞報告會顯示撞擊類型與損失的速度;護欄現在會將地面上的車輛彈回並使其減速。飛得夠高即可越過護欄。

場景包含泛光燈效、夕陽水面、懸索橋、推進器蒸氣、碰撞火花與觸地漣漪。鏡頭運動與非必要的速度線會遵循你系統的「減少動態效果」偏好設定。音效為推力、碰撞與落地提供各自獨立的回饋。

**VFX**(右上角)可選擇 Realistic、Cinematic 或 Extreme 風格、Low / Medium / High 畫質(Low 會關閉泛光並繪製較少的場景)、Comfort 模式(無閃光、震動、殘影或模糊)以及選用的觸覺回饋;**Fine tuning** 將每個特效以滑桿呈現,**Reset visual settings** 則還原預設值。**AIRFLOW**(或 V)會把場景切換成空氣動力學展示:車身上的流線、遙測面板、Low drag 或 High downforce,以及駕駛、前方、後方、側面或環繞鏡頭。開始面板會讓位給展示畫面,只留下橘色的 **START RACE** 按鈕,固定在車子下方的底部中央;向左或向右滑動場景可切換賽道。第一次開啟 AIRFLOW 時,會有動畫指尖示範該手勢。

三盞琥珀色起跑燈會在 GO 時轉為青色。玩家的車是一輛低矮楔形的敞篷跑車,配有煙燻色快背式座艙、全寬紅色尾燈條、四個後推進器噴口、會在加速推進、煞車與飛行時升起的青銅色彈出式尾翼、旋轉的五輻輪圈以及可轉向的前輪。每一名對手都有自己的輪廓與燈光特徵:NOVA 是長尾車,配有雙尾鰭與分離式洋紅色燈光;ORBIT 是圓潤的 GT,配有泡泡型座艙與圓形青色車燈;APEX 是賽道車,配有前分流器、車頂進氣口、高聳的端板尾翼與琥珀色 C 形燈。車流則採用直立的通勤車造型。轉向會迅速緩入,放開加速推進時車速會逐漸下降,而不是瞬間切斷速度。所有駕駛與工具列按鈕的觸控目標至少為 44px,包括在 320px 寬度下。

想獲得額外的電量獎勵,可在地面上以超過 126 km/h 的時速近距離超越車流。五秒內的乾淨超車可連鎖至 ×5,並回充 8–16% 的電量(上限 100%)。碰撞會中斷連鎖;空中、距離過遠以及恢復中的超車都不會獲得獎勵。HUD 會宣告每次超車與最後 500 公尺;結果畫面會顯示總近距離超車次數與碰撞次數。

飛行電量在全推力下可持續約五秒。電量歸零時,車子會自動下降;放開飛行操作並在地面上行駛即可回充。同一份電量也供應 boost。碰撞會使車子減速;飛得夠高就能避開車流。對手與車流遵守相同的碰撞規則:它們會繞開較慢的車輛與玩家,與你一樣會撞上道具、護欄與障礙物,而撞擊會讓雙方的車都減速並被推開(車流隨後會加速回到巡航速度)。要在 NOVA、ORBIT 與 APEX 之前完成衝刺(依賽道而定,4–8 公里)。個人最佳時間會在儲存空間可用時儲存在此瀏覽器中。

### 操控

轉向會在 0.15 秒內達到滿幅,且高速時橫向速度上限為 9 m/s。在 65 km/h 以下按住 Fly 會被記住 1.5 秒,並在速度夠快時自動升空。在空中放開 Fly 會降低下墜加速度(11 → 7 m/s²),讓落地更柔和,並緩慢回充飛行電量(每秒 4,為地面速率的三分之一;電量說明文字顯示 GLIDE RECHARGE ACTIVE)。已耗盡的推進器在放開 Fly 且電量回到 15 後會重新解鎖,即使在空中也一樣。在距離斷橋 300 公尺內(Sky Spiral 除外,其坡道會把車子拋過去),當剩餘電量無法以目前速度推進越過缺口時,HUD 中央會警告 GAP AHEAD · NEED n% CHARGE。車輛的碰撞寬度為 1.7 公尺,因此更多的超車會被算作驚險閃過。輕微擦到護欄屬於擦撞(保留 0.92 的速度,被推回道路上,不算碰撞,連擊保留);正面撞擊仍算作碰撞。開啟 AUTO 時,放開轉向還會讓車子緩緩回到最近的車道中央(車道輔助)。同時按住 Fly + Boost 每秒消耗 22 電量,而非 29,維持 boost 的速度上限,並顯示 AIR DASH。

### NITRO 與飄移

NITRO 有自己的儲備(`player.nitro`,最多 3 格,每格以浮點數填充)。三段式 HUD 顯示部分電量,滿格的區段會發光,滿載時 NITRO MAX 會閃動(在 comfort/減少動態效果模式下會抑制動態)。賽道上的道具(藍色電池 +0.25、橘色罐子 +0.5、空中金色油箱 +1、一個彩虹過充,會直接補滿到上限)依賽道種子擺放;每一次 NITRO 獎勵(道具、飄移、桶滾、光環、尾流)也會回充飛行電量(每存入 0.25 = +5;過充則不提供),超過上限的部分會轉為電量(每 0.25 = +8)。一格可提供 2.5 秒,速度上限提高 30 m/s,並有更強的加速、排氣與鏡頭回饋;再按一次可延長 2 秒且不疊加速度,因此連按三次可串成 6.5 秒的爆發。NITRO 期間碰撞車流時保留 70% 的速度,而非 45%。

在地面上超過 162 km/h 時,煞車 + 轉向會觸發飄移,而不是強力煞車:只損失 3 m/s²,近距離閃過的連擊分數加倍,放開時依飄移時間獎勵 NITRO 與迷你加速(1 秒:+0.15 與 0.5 秒;2 秒:+0.3 與 0.8 秒;3 秒:+0.5 與 1.2 秒)。車身會偏擺 25°,煙霧與藍/橘/紫色火花顯示等級,輪胎尖嘯聲逐漸增強,HUD 則會標示飄移/迷你加速的狀態。起飛、掉進缺口,或撞上車輛或護欄都會失去累積的進度。

NITRO 不消耗電量,所以 Fly + NITRO 一律能同時使用(Fly + Boost + NITRO 維持每秒 22 的 AIR DASH 消耗)。

**空中特技**:飛行時,快速甩動轉向(0.3 秒內兩次反向按壓)會啟動 0.7 秒的桶滾。以低於 11 m/s 的速度落地完成的桶滾可獲得 +0.25 NITRO;較重的落地(從約 9 公尺以上的無動力下墜)則會失去獎勵。提早落地、撞到任何東西、隧道頂或缺口都會取消桶滾。車子會旋轉(減少動態效果與 Comfortable VFX 會保留文字但取消旋轉),HUD 顯示 TRICK,並以 BARREL ROLL / TRICK +0.25 / HARD LANDING 提示、一聲呼嘯,以及觸控上的短暫觸覺震動來標示桶滾與其獎勵。

**捷徑**:每條賽道都有一條空中通道,位於邊緣車道上方 6 公尺處,標示為 SHORTCUT / FLY HIGH。在通道內飛行不消耗電量,速度上限提高 12 m/s;通道兩側排列著 NITRO 電池,中途還有一個油箱,但交錯的立柱會算作撞到護欄。以該賽道主題色半透明的甲板標示通道的地面;在通道內,HUD 顯示 SHORTCUT,飛行預算顯示 ∞(BOOST 仍會消耗電量)。

### 光環

5 公里的海岸賽道共有 22 個光環,每 220 公尺一個,以 3 到 5 個為一組(依賽道種子擺放)。只有當車子穿過其可見半徑時才算數;擦到邊緣不算。種類:青色充電(+20 電量)、金色 nitro(+0.5)、紫色尾流(3 秒迷你加速)、紅色風險(小型光環,+1 NITRO 與 500 分)以及彩虹神秘(依種子隨機的一種效果:護盾 10 秒或直到第一次被撞、磁吸 5 秒、穿越車流的幽靈 3 秒,或讓對手以半速凍結 2 秒)。收集過的光環會爆開一次後消失。清除整組光環會宣告 PERFECT LINE 並獲得 +1 NITRO;錯過一個光環會中斷該組,但已獲得的獎勵會保留。

### 對手、尾流與最後衝刺

緊跟在對手或車流車輛後方 1.5 秒,可獲得 +6 m/s 的速度上限與 +0.25 NITRO(離開尾流後才會重新啟用)。對手也會使用 NITRO,各有兩格,依個性而定:NOVA 從 8 秒起穩定施放,之後每 18 秒一次;ORBIT 在飛行時施放;APEX 在比賽進行到 75% 後爆發。輕度的橡皮筋機制(超過 50 公尺後最多 ±4% 速度)讓比賽保持緊張。在最後 500 公尺,比賽音樂會加速到 115%,狀態列會顯示與前後最近對手的差距(`FINAL 500 M · +N m · −N m`)。

### 儲存的資料

所有存檔都使用 try/catch,因此即使儲存空間被封鎖,遊戲仍可執行。`skyline-rush-history`:每場完賽一筆紀錄,保留最近 50 筆,包含 `fuelOuts`(飛行電量耗盡的次數)與 `gapFalls`,用於調整飛行平衡。從開始或結果畫面開啟 **History**,可依賽道篩選、查看最佳成績與最近十次時間的圖表,並點選一場比賽查看詳情。`skyline-rush-best-tracks`:每條賽道的最佳時間;舊的單一 `skyline-rush-best` 會一次性遷移到 `coast`,並仍會為 coast 寫入。`skyline-rush-unlocked`:賽道解鎖狀態,即使較舊的成績已離開 History 也會保留。`skyline-rush-keymap`:按鍵綁定。`skyline-rush-controls` 與 `skyline-rush-vfx`:駕駛與視覺設定(幽靈車開關位於 controls)。`skyline-rush-ghosts`:每條賽道一台最佳成績幽靈車。`skyline-rush-medals`、`skyline-rush-stars`、`skyline-rush-paint`:附授予日期的獎章、每條賽道的最佳星星、已裝備的塗裝。`skyline-rush-daily`:每日挑戰成績,保留最近 50 筆。每個儲存的值在載入時都會經過驗證;格式不正確的內容會被忽略。

### 幽靈車、每日挑戰、獎章與 Garage

- **幽靈車**:每次比賽以每秒 10 次的頻率取樣車子的距離、車道位置與高度。在某條賽道上創下新個人最佳時,會儲存該次成績,之後在該賽道的比賽中會以半透明藍色車輛顯示。預設為關閉;可在 Controls 中以 **Show best-run ghost** 開啟。
- **每日挑戰**:History 顯示今天的賽道與修飾條件,依本機日期挑選:禁止飛行、雙倍車流,或僅限金色光環。Canyon 絕不會出現禁止飛行,因為它的斷橋需要飛行。每日成績只會記入各自的排行榜(今天最快的前五名);絕不影響歷史紀錄、最佳時間、解鎖、星星或幽靈車。Restart 會保留挑戰,而 **Choose track** 則會離開挑戰。
- **獎章**:First victory(獲勝)、Clean run(無碰撞)、Perfect flight(單場比賽 5 次 PERFECT LINE)與 Triple burst(一次爆發 3 格 NITRO:一次按壓加兩次延長)。只有符合資格的 Classic Race 完賽才能獲得;每枚獎章都保留首次獲得的日期。
- **Garage**:你在每條賽道上的最佳造型星星會累加並解鎖塗裝:3 顆解鎖 Aurora、6 顆 Glacier、10 顆 Coral、16 顆 Cobalt、24 顆 Obsidian(上限為 30)。現實世界最受歡迎的車色——藍色與黑色——是長期目標。未解鎖的塗裝仍可預覽。塗裝只改變外觀,絕不影響車輛數值。

### Sky Spiral(實驗性第五條賽道)

Sky Spiral 在賽博龐克天際線上方新增了真正的 3D 上升螺旋道路。繞著發光的中央塔樓完整行駛一圈水平迴轉,然後從三個專用坡道躍過高架缺口。現有的 FLY、BOOST 與 NITRO 都能在新賽道上使用,並提供可選的飛行修正。此賽道使用獨立的彎曲道路算圖器與專屬的 3D 路徑對應器;目前仍在實體手機硬體上驗證中。

### 賽道與風格

從 Coast 開始。名列前三即可解鎖 Neon Downtown,接著依序是 Canyon Skyway、Aurora Pass、Sky Spiral、Taipei Heritage、Tokyo Afterdark、Alpine Rail Pass、Coastal Horizon 與 Cosmic Orbit。開始前先選擇賽道,或向左或向右滑動 3D 預覽(用滑鼠拖曳,或在觸控板上用兩指橫向滑動),像輪播一樣翻到相鄰的賽道:預覽會跟隨手指,輕輕一撥就夠了,第一條與最後一條賽道會有橡皮筋回彈效果,並有一個標籤標示賽道名稱與分頁圓點;鍵盤使用者可用 Left/Right 在賽道按鈕之間移動,並以 Enter 選擇。Restart 會保留所選賽道;結果畫面上的 **Choose track** 會回到選單。當仍有賽道未解鎖時,登上頒獎台後,結果畫面會顯示一個閃動的 **Next** 按鈕,可直接開始新解鎖的賽道;一旦所有賽道原本就已開放,以及在每日挑戰中,該按鈕都會消失。如果瀏覽器中斷 WebGL 連線(iPhone 在鎖定螢幕或切換 App 後很常見),圖形恢復時遊戲會清除警告;否則 **Start** 或 **Race again** 會重新載入頁面。每條賽道都有自己的天空、色調與程序化場景:有雨的霓虹街道與低矮隧道、紅色沙漠峭壁與斷橋缺口/側風,或有極光與冰面的雪山。警告標誌會標示特殊路段。Aurora 的上坡路段回充地面燃料的速率只有正常的一半。

### World Tour 賽道、路線圖與賽道名稱

五條 World Tour 路線共用同一個彎曲道路算圖器(`src/world-tour-scene.js`),各有專屬的色調、建築與地標(總統府與北門的剪影、霓虹路口與一座塔、鐵路高架橋與山峰、燈塔與跨海大橋、帶環的行星)。在首頁選擇 World Tour 路線時,會在盤旋的車輛後方框住其代表性地標:總統府、東京鐵塔、阿爾卑斯山峰、燈塔或宇宙之門。朝它行駛時,路邊會讓該地標保持清晰可見。每張賽道卡片都顯示完整的主要路線,比賽中則有即時地圖在其上標出 YOU、NOVA、ORBIT 與 APEX;空中捷徑絕不會畫出。在高度低於 500px 的螢幕,以及高度低於 700px 的窄版手機上,即時地圖會讓位,排行榜仍會為車手排名。賽道名稱會依你以 **EN / 繁體中文** 切換器選擇的語言顯示(請見下方的 Language)。

造型分數獎勵近距離超車(100 × 連擊,飄移的連擊加倍)、光環(150,風險光環另加 500)、PERFECT LINE(500)、移動中的滯空(每秒 10)以及每 500 公尺的乾淨行駛(100)。碰撞與掉進缺口會重置乾淨距離的進度。結果會授予:完賽一顆星,每公里 250 分兩顆星,每公里 500 分三顆星,與完賽名次無關。

燃料與 nitro 條會平順地趨近新的數值,低於 20% 容量時發出警告,回充時閃爍,並在一格 nitro 充滿時閃動。Comfort 模式與系統的減少動態效果會停用這些動畫。滑動板在按住時會顯示浮動的圓環/圓鈕,並在比賽開始時顯示簡短提示;放開則讓轉向回到中立。

HUD 使用共用的動態時序(120 / 240 / 480 ms)。速度表指針會隨速度緩動;名次變動時,名次數字會翻轉並帶有綠色上升或紅色下降箭頭,排行榜各列則會滑動到新位置。精簡的半透明事件提示位於視野中央上方,避開 HUD 面板,並將驚險閃過、PERFECT LINE、NITRO 爆發、電量增加與飄移火花等級排入佇列,不會互相重疊;同時回充飛行電量的 NITRO 獎勵會標明這一點(NITRO · +20% CHARGE)。按鈕在按下時會變暗但不改變尺寸,因此在邊框以內的任何位置按下都會被接受;按住的觸控按鈕會保持亮起。VFX 設定中選用的 **Haptic feedback** 會在支援的觸控裝置上為碰撞、NITRO 與飄移獎勵提供震動提示。Comfort 模式與系統的減少動態效果會保留文字與按下狀態的顏色,同時移除新增的動態與震動。

### 語言

整個介面提供英文與繁體中文(繁體中文):開始畫面、Garage、History、HUD、比賽提示、結果、路線圖、設定,以及 3D 道路標誌。開始畫面賽道卡片下方的 **EN / 繁體中文** 切換器,會一次改變全部內容,無須重新載入。語言依下列順序決定:

1. 你點擊切換器所儲存的選擇(`skyline-rush-locale`;只有在點擊時才會寫入,絕不會來自自動偵測);
2. 你的系統語言順序(`navigator.languages`):第一個 `en*` 或 `zh*` 的項目決定結果,其他語言會被略過(`['ja-JP', 'zh-TW']` 會選擇繁體中文),任何 `zh*` 標籤(zh-TW、zh-HK、zh-Hant、zh-CN、zh-Hans、單純的 zh)都會選擇繁體中文,若清單為空或不存在,則退回使用 `navigator.language`;
3. 否則使用英文。

品牌與遊戲用語在兩種語言中皆維持英文:Skyline Rush、NITRO、FLY、BOOST,以及對手 NOVA、ORBIT 與 APEX。字串存放在 `src/locales/`;`src/i18n.js` 負責偵測、`t()` 與目前的語言。

在地化圖片:`node scripts/capture-og-images.mjs` 會在 Chrome 中驅動真實的應用程式,並儲存 `public/og-image.en.jpeg` 與 `public/og-image.zh-TW.jpeg`(1440×900 的開始畫面),以及供繁體中文 README 使用的 `artifacts/{readme-start,readme-hero,mobile-flight,race-results}.zh-TW.jpeg`(`node scripts/capture-og-images.mjs og` 或 `readme` 會只執行其中一半)。它絕不會動到英文的 `artifacts/` 截圖。`public/manifest.webmanifest` 與應用程式圖示維持原樣:圖示不含文字,而 Web App Manifest 只有單一名稱與說明,沒有各語系的變體,所以另外加一份 manifest 會破壞可安裝性。

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

瀏覽器測試使用已安裝的 Google Chrome,並允許 SwiftShader 進行無頭算圖。僅用 CPU 的 CI 會採用 0.25 的裝置像素比,讓 3D 場景維持流暢,同時保留相同的 CSS 視窗大小與遊戲斷言;本機測試則以完整解析度算圖。英文 README 的截圖僅在檔案不存在時,或使用 `UPDATE_ARTIFACTS=1 npm run test:browser` 時,才會以 JPEG(品質 70)寫入 `artifacts/`,因為即時 3D 場景每次執行都不同;測試的追蹤檔與結果則被忽略。完整的衝刺測試在快速的機器上約需一分鐘,軟體算圖拖慢模擬時則更久。

```sh
npm run preview         # Serve the production build after npm run build
```

若要檢查手機,請在你的網路上提供該建置(`npx vite preview --host 0.0.0.0`),並加上 `?perf` 開啟(例如 `http://<computer-ip>:4173/?perf`)。畫面頂端會出現一條列,顯示過去 20 秒的比賽影格時間:中位數(p50)、第 95 百分位(p95)、平均 fps 與取樣長度。沒有 `?perf` 時,不會量測也不會顯示任何內容。

```sh
make perf BASE=main         # A/B in Chrome at 412×915, CPU throttled 6× (RATE=20 for a low-end phone), 3 alternating rounds
make perf-phone             # Like make phone: asks base version, Tailscale/Wi-Fi and Telegram; logs phone temperatures
```

`make perf` 會建置此 checkout,若帶有 `BASE=<git ref>` 也會建置該 ref(在 `.claude/worktrees/perf-<sha>` 中,下次會重複使用),每次在 Coast 上競速 24 秒,並印出每次執行的狀態列以及各建置的中位數。`make perf-phone` 對於未傳入的項目(`BASE=`、`VIA=tailscale|wifi|auto`、`TG=0`),會以和 `make phone` 相同的方式詢問,並為每個建置印出並傳送一個 `?perf` 網址到 Telegram,在任何以 USB 連接的 Android 手機上的 Chrome 開啟第一個(`adb reverse`,因此任何網路皆可),按下 Ctrl+C 時會傳送網址失效通知,並每 10 秒記錄手機的感測器溫度與降頻等級(`dumpsys thermalservice`),以及 Mac 的散熱警告等級,直到按下 Ctrl+C。只在相同降頻等級下比較執行結果:溫度較高的手機會降頻並掉格,與建置版本無關。iPhone 不會回報溫度。

## 部署

請至 [https://weskao.github.io/skyline-rush/](https://weskao.github.io/skyline-rush/) 遊玩。網站為公開:訪客不需要 GitHub 帳號或 Tailscale,開發者的電腦也可以離線。

```sh
git tag v0.4.0 && git push origin v0.4.0   # Release: deploys once CI confirms the commit already passed on main
make deploy                              # Deploy remote main manually through the same CI flow
# The on-screen version (ready screen, desktop and mobile) is `package.json`'s version; `/release` bumps it
# after scripts/release-gate.sh has seen a green CI run for the commit on main.
```

CI(`.github/workflows/ci.yml`)會在推送到 `main`、pull request、版本標籤推送(`v*`)與手動執行時,建置並執行單元測試與 Chrome 瀏覽器測試。瀏覽器測試分成八個平行分片(`--shard=N/8`),對同一分支的較新推送會取消被它取代的執行。手動執行在所有檢查通過後才會發佈;版本標籤推送會重新執行單元測試,確認(`release-verified`)被標記的程式碼已在 `main` 上通過完整測試套件,而不是重新執行瀏覽器測試套件,然後發佈並驗證公開網站。若標記所在的 commit 從未在 `main` 上通過 CI,則不會部署。一般的分支推送與 pull request 只會執行檢查。Pages 的建置使用 `--base=/skyline-rush/`,讓腳本、樣式與字型從專案網址載入。GitHub Pages 必須使用 **GitHub Actions** 作為發佈來源。手動部署需要已驗證的 GitHub CLI(`gh auth login`);請先推送你的 commit,因為 `make deploy` 使用遠端的 `main`。部署不再依賴本機的 pre-push hook 或 Netlify 登入。當推送、標籤或手動執行中的任何檢查或部署失敗時,`notify-telegram` 工作會將失敗執行的連結傳送到 Telegram;它需要 repo 的機密 `TELEGRAM_BOT_TOKEN` 與 `TELEGRAM_CHAT_ID`(以 `gh secret set <NAME>` 分別設定,它會提示輸入值),缺少時則會靜默略過。

連結預覽圖片是 `public/og-image.jpeg`,為 `public/og-image.en.jpeg` 的副本;`node scripts/capture-og-images.mjs og` 會擷取兩種語言的封面並更新該副本。爬蟲無法切換語言,因此 `index.html` 只引用英文封面(搭配 `og:locale` `en_US` 與 `og:locale:alternate` `zh_TW`),而 `public/og-image.zh-TW.jpeg` 是它的中文版本,供直接連結使用。更改封面後,請在 `index.html` 中調升 `og:image` 的 `?v=`,讓社群網站抓取新的圖片。

## 專案

- `src/game.js`:確定性的街機模擬、對手、車流與完賽順序。
- `src/input.js`:鍵盤與多指標控制,含取消與失焦清理;讀取已儲存的按鍵對應。
- `src/key-map.js`:純粹的按鍵對應,含 E / X 的 NITRO、衝突互換的重新綁定、驗證與儲存。
- `src/history.js`:儲存的遊戲資料:比賽歷史(最近 50 筆)、每條賽道的最佳成績與舊版遷移、生涯統計、獎章、星星、已裝備的塗裝、幽靈車與每日排行榜。
- `src/ghost.js`:10 Hz 的幽靈車錄製、每條賽道的驗證與內插播放。
- `src/appearance.js`:塗裝目錄與星星解鎖門檻。
- `src/rng.js`:帶種子的隨機串流;賽道道具與光環來自賽道種子。
- `src/world.js`、`src/geometry.js`:Three.js 算圖器、程序化車輛、公路、天際線、飛行特效與鏡頭。
- `src/effects.js`:固定 480 顆粒子的 GPU 粒子池,用於蒸氣、火花與落地塵土。
- `src/track-paths.js`、`src/world-tour-scene.js`:每條賽道一份「距離到道路」的對應,以及共用的 World Tour 道路、場景與地標。
- `src/route-map.js`、`src/i18n.js`:SVG 完整路線與即時車手地圖;語系偵測、儲存的選擇、`t()` 與英文/繁體中文的賽道名稱;`src/locales/` 存放語言目錄。
- `scripts/capture-og-images.mjs`:從真實應用程式擷取英文與 zh-TW 的封面圖片,以及 zh-TW 的 README 截圖。
- `src/App.vue`、`src/icons.js`:Vue 3 的 UI 外殼(開始畫面、HUD、面板、觸控操作)及其共用的 SVG 圖示;只算圖一次,沒有響應式狀態。
- `src/main.js`、`src/style.css`:掛載 `App.vue`、串接各畫面控制器,並執行比賽生命週期(開始、暫停、重新開始、結果)與影格迴圈。
- `src/*-ui.ts`:每個畫面區域一個 TypeScript 控制器(賽事選擇、雲端存檔、觸控操作、按鍵對應、VFX、音訊、歷史對話框、攝影模式)。
- `src/race-hud.ts`、`src/race-hud-modes.ts`:比賽中的 HUD,每次 HUD 更新時以命令式方式寫入。
- `src/race-results.ts`、`src/result-screen.ts`、`src/session-progress.ts`:記錄一場完賽的成績(最佳成績、解鎖、獎章、幽靈車)並顯示其結果畫面。
- `vite.config.js`:搭配 `@vitejs/plugin-vue` 的 Vite。
- `src/perf.js`:供 `?perf` 裝置檢查讀數使用的影格時間百分位數。
- `src/audio.js`:合成音效與循環的音樂定序器;歌曲位於 `src/music-tracks.ts`,比賽到聲音的事件位於 `src/race-audio-events.ts`。
- `src/audio-settings.js`:從 `localStorage` 讀取已儲存的音樂/音效開關與音量,以及滑桿的「靜音保留音量」規則。
- `tests/`:單元與瀏覽器行為測試。`tests/module-size.test.js` 讓每個原始碼模組維持在 400 行以內(較舊的大型檔案有只會降低的上限)。
- `docs/design.md`、`docs/verification.md`:範圍與驗證證據。
- `README.zh-TW.md`:此檔案的繁體中文翻譯,由 `scripts/readme-zh.mjs` 保持最新(`check`、以 `claude -p` 翻譯的 `sync`,以及手動編輯後使用的 `stamp`)。`.githooks/pre-commit` hook 會在 commit 變更 README.md 時重新產生它(以 `SKIP_README_ZH=1` 略過一次),而 `.githooks/pre-push` 會在推送的 commit 觸及首頁(`index.html`、`src/App.vue`、`src/main.js`、`src/style.css`、`src/locales/`;以 `SKIP_LAYOUT_GATE=1` 略過一次)時執行 `npm run test:layout`;`make` 會以 `git config core.hooksPath .githooks` 啟用這些 hook。`.claude/settings.json` 中的 Claude Code Stop hook 會在某一輪編輯了 README.md 卻沒有更新它時,讓 Claude 回頭去更新。

所有載具/場景幾何與特效皆以程式碼產生。Barlow Condensed 以 SIL Open Font License 打包於 `public/fonts/OFL.txt`。Three.js、Vue、Vite 與 Playwright 保留各自的套件授權。

來源:[weskao/skyline-rush](https://github.com/weskao/skyline-rush)。單人、十條賽道、街機物理。瀏覽器驗證涵蓋桌機 Chrome 與模擬的行動裝置視窗;iOS Safari 已在 iOS 模擬器中檢查過(直向與橫向、Coast 與 Neon),但實體手機上的影格率尚未量測(請使用 `?perf`,見驗證章節)。
