<!-- source-sha256: b26df1c43dbb74cf80e0b180323cad918092a1cafbd36873d702fee212a5dcda generated from README.md by scripts/readme-zh.mjs; edit README.md, then run the script -->
# Skyline Rush

[English](README.md) · **繁體中文**

[**Play Skyline Rush →**](https://weskao.github.io/skyline-rush/)

這是一款以瀏覽器執行的 3D 街機賽車遊戲，主角是一輛會飛的電動跑車，造型參考 Tesla Roadster 2 及其火箭推進器概念。你可以在多樣化的賽道上對抗 AI 對手、飛越車流、管理推進器電量，並運用駕駛獎勵持續衝刺。操控手感屬於虛構的街機物理；這是非官方的粉絲專案，與 Tesla 或 SpaceX 無任何關聯。

## 遊戲介紹

在經典賽（Classic Race）中，Skyline Rush 是一場可反覆挑戰的街機衝刺：一名玩家對抗多位 AI 對手與路上車流，桌機或手機皆可遊玩，無需安裝任何東西。其他模式提供單人駕駛、自訂規則、圈速賽與多階段挑戰。

- **先開車，再飛行。** 累積速度後按住 FLY 即可升空，飛越車流、穿過光環、跨越斷橋。飛行與 BOOST 共用推進器電量；地面行駛、無動力滑翔與各種獎勵都能幫助回充。
- **靠出色的駕駛賺取 NITRO。** 近距離超車、飄移、連續通過光環組（PERFECT LINE）、氣流跟車、成功落地的桶滾以及拾取道具，都會填滿獨立的 NITRO 儲備；可啟動一次爆發，或連按以延長時間。
- **探索並解鎖賽道。** 駕馭海岸公路、霓虹街道、峽谷、冰雪山路、高架螺旋道路與 World Tour 各地目的地。每條賽道都有獨特的風景與障礙，點對點路線還設有空中捷徑。選擇畫面會區分可遊玩的賽道與 Coming Soon 預覽。
- **有目標可追。** 符合資格的經典賽完賽可獲得風格星星，用來解鎖 Garage 塗裝。最佳成績幽靈車、每日挑戰、獎牌與各模式專屬紀錄，讓你一再回來比賽。

賽事長度依賽道與模式而定。音效於瀏覽器內合成，進度儲存在本機。可選擇使用 Google 登入啟用雲端存檔同步；遊玩並不需要帳號。

<p align="center"><img src="artifacts/readme-startup.zh-TW.jpeg?v=1" width="70%" alt="顯示 Skyline Rush 標題與進入遊戲按鈕的啟動畫面"></p>

### 在桌機上遊玩

任何桌機瀏覽器皆可使用鍵盤操控。錄影時已開啟音樂與音效。

https://github.com/user-attachments/assets/ec0ffa92-5269-494c-bcbc-831759207046

<p align="center"><img src="artifacts/readme-tracks.jpeg?v=3" width="70%" alt="飛行中的部分賽道：Neon Downtown、Aurora Pass、Sky Spiral 與 Tokyo Afterdark"></p>

<p align="center"><img src="artifacts/readme-start.zh-TW.jpeg?v=3" width="49%" alt="顯示遊戲模式、賽道與開始比賽的起始畫面"> <img src="artifacts/race-results.zh-TW.jpeg?v=3" width="49%" alt="創下個人最佳成績的比賽結果畫面"></p>

### 在手機上遊玩

支援直向或橫向，搭配觸控操作；AUTO 會持續按住油門。錄影時已開啟音樂與音效。

https://github.com/user-attachments/assets/1138325a-f4e8-4b7f-a426-0c39d70bebaf

以全新設定檔在 Chrome 行動裝置模擬（390×844）下擷取；並非實體手機的效能量測。

## 遊戲模式與重玩價值

> 本 README 描述的是目前的原始碼版本。已部署的 GitHub Pages 版本依發佈流程而定，可能與開發版不同。Coming Soon 預覽不代表賽道已可遊玩。

選擇一條**你已解鎖的賽道**，在賽道卡片下方選擇 **GAME MODE**，需要時展開規則，然後按下**開始比賽**（或 Enter）。賽事仍使用相同的 Three.js 道路、飛行、FLY / BOOST / NITRO 與響應式觸控操作。可用模式包括：

| 模式 | 有何不同 | 勝利條件／進度 |
| --- | --- | --- |
| **經典賽（Classic Race）** | 與 AI 對手進行點對點競速，包含車流、捷徑、光環與 NITRO。 | 登上頒獎台可解鎖下一條生涯賽道；符合資格的經典賽完賽可獲得生涯星星、獎牌與官方最佳成績。 |
| **自訂賽（Custom Race）** | 設定對手數量（包含單人）、AI 難度、車流、道具與碰撞懲罰，或從預設組合開始。 | 非排名成績有獨立的歷史紀錄。可選的衝刺階段會重跑點對點路線並比較累計時間；它們不是環形賽道的圈數。 |
| **自由駕駛（Free Drive）** | 獨自探索任何已解鎖的賽道，可調整路上車流與道具，沒有名次，也沒有強制勝利。 | 自由駕駛、飄移與飛行，直到道路盡頭；抵達終點後會以結果畫面結束本次行程，不儲存任何紀錄。這**不是**無限世界模式。 |
| **計時賽（Time Attack）** | 單人計時衝刺，提供相容的最佳成績幽靈車與領先／落後分段時間。可選擇開啟 **Clean Time Trial**。 | 依賽道與規則記錄最佳時間；Clean 模式下只要發生任何碰撞，該次成績即作廢，不會取代個人最佳。 |
| **障礙賽（Obstacle Run）** | 以固定種子生成的路邊障礙；密度分為**標準**或**極限**。部分障礙會橫向移動；警示 HUD 會預告即將出現的危險。 | 閃避障礙、以乾淨的通過賺取風格分數，並使用一般路線的終點。障礙配置與碰撞共用確定性邏輯；經典賽不受影響。 |
| **檢查點衝刺（Checkpoint Rush）** | 穿越發光的拱門，補充倒數時間，並以乾淨的通過賺取風格分數。 | 在時間用盡前通過每一道拱門並抵達終點。漏掉拱門或超時都不會儲存有效的最佳成績；HUD 會顯示進度、剩餘時間與下一個目標。 |
| **錦標賽盃（Championship Cup）** | 以已解鎖的路線組成多賽道盃賽，並在各階段與 AI 車隊競賽。 | 名次累積總積分；總時間用於決定同分排名。盃賽成績與生涯解鎖分開計算。 |
| **特技挑戰（Stunt Attack）** | 連續多輪的限時風格賽：飄移、空中特技、近距離擦過與光環累積連擊分數。 | 計時結束即結束該場；本機獎牌與最佳分數依時長分別記錄。 |
| **淘汰賽（Elimination）** | 每隔一段時間，名次墊底的存活車手即被淘汰。 | 撐到成為最後一名存活的車手；若提前被淘汰，本次行程結束且無獎勵。 |

### 盃賽復原

未完成的錦標賽盃會在主畫面提供**繼續**或**捨棄**。繼續會保留已結算的階段積分，只重新開始未完成的階段；重試只會回溯正在重跑的那一階段。完成或捨棄盃賽後，其復原項目會被清除。刪除遊戲進度也會移除檢查點，同時保留裝置偏好設定。復原使用此瀏覽器的儲存空間，無法還原瀏覽器拒絕儲存的資料。

### 自訂呈現與幽靈車

自訂賽可為每個衝刺階段重播最快的相容幽靈車。自訂賽與自由駕駛提供 Track / Day / Dusk / Night / Rain / Fog 呈現預設與即時規則摘要。這些外觀選擇不會改變紀錄資格或規則集識別。重試會保留所選外觀；更換賽道或回到經典賽則會還原賽道原本的外觀。照片工作室關閉時會還原目前比賽的外觀。

### 可選道具與獎勵拱門

自訂賽與自由駕駛提供 **Off / Classic Mystery Rings / Active Items / All Items**。持有的道具佔用單一欄位：按 **Q** 或點按 **USE** 啟動，之後需等待冷卻。NITRO 與 FLY/BOOST 保有各自的操作。All Items 會加入有限的加速、空中電量與一次碰撞復原拱門；EMP 會短暫減慢附近的對手，並在單人遊玩時轉為磁鐵。復原會保留官方的碰撞次數。特技挑戰與檢查點衝刺可另外選擇啟用暫時、不可疊加的分數倍率拱門。經典賽的預設值維持不變。

### Event Lab Lite v1

**Event Lab Lite** 可在已解鎖的路線上，以障礙物、NITRO 光環與補給編輯本機賽道範本。可調整它們的車道與距離、復原／重做／重設編輯，並以文字匯入或匯出經過驗證的賽道。開始時會將賽道編譯為真實的比賽事件；重試會保留賽道與種子。賽道成績與生涯及自訂紀錄分開。路錐、自製坡道、檢查點編輯與社群分享不在此第一版範圍內。

### Endless Highway

**Endless Highway** 會將所選的可遊玩賽道變成超越原設計終點的距離生存賽事。車流難度會升高至上限；達到碰撞上限即結束本次挑戰。最長距離紀錄與生涯及幽靈車分開。暫停與 WebGL 復原會保留該次行程，附近的風景與事件則使用有上限的物件池。

### Circuit Race

**Circuit Race** 使用 Harbor Circuit，一條獨立的封閉環形賽道，圈數可選。依序通過每個區段才能完成一圈；倒退通過、傳送與復原都不能獲得圈數。HUD 與結果畫面會顯示分段時間、上一圈、個人最佳圈速與總時間。最佳圈速不會因歷史紀錄輪替淘汰而消失；總時間與幽靈車則依圈數設定分別記錄。點對點賽道維持其地理配置與生涯進度。

### 賽道主題、障礙與風險路線

- **賽道主題**（可於自訂賽、自由駕駛與障礙賽中選用）讓每條路線都有專屬的危險：Coast 的貨物與陣風、Neon 的道路施工、Canyon 的落石、Aurora 的雪堆、冰面與暴風雪、Sky Spiral 的能量拱門、Taipei 的節慶路障、Tokyo 的號誌拱門、Alpine 的雪崩、Coastal 的浪花，以及 Cosmic 的能量牆。危險會事先警示，始終保留可通行的車道，且絕不改變經典賽。
- **障礙賽**提供**混合障礙**路線：橫掃的拱門、墜落的碎片，以及懸在路障上方的圓環，獎勵飛越或繞行的玩家。
- **風險路線**：高風險光環與近距離擦過在自訂賽困難模式中給予更高報酬，也可關閉以進行輕鬆的練習。
- 道路新增了非實體的路邊生活景象：觀眾、廣告看板、服務車、鐵路月台、行駛中的列車、船隻與無人機。較低的畫質設定會減少繪製這些內容。

### 賽事設定、結果與無障礙

- 模式與賽道的選擇皆可透過鍵盤與觸控操作；情境面板只顯示與所選模式相關的選項。無法使用的盃賽會說明還需要多少條賽道。
- HUD 會依模式調整：單人賽事隱藏容易誤導的對手名次；多階段與盃賽會顯示階段進度；檢查點衝刺顯示即時拱門倒數；障礙賽警示即將出現的路障；Clean Time Trial 會清楚標示已作廢的行程。
- 練習、自訂、計時賽、障礙賽、檢查點與盃賽的結果使用獨立的 `skyline-rush-mode-history-v1` 紀錄鍵。符合資格的練習幽靈車有各自儲存的規則集；經典賽的解鎖、星星、獎牌、每日紀錄與官方時間不受練習行程影響。
- 在 **History → Challenge records** 中，可依模式篩選，查看每個確切賽道／規則集的個人最佳，以及符合資格的計時賽幽靈車。即使較舊的行程已被輪替淘汰，終身最佳仍會保存在 `skyline-rush-mode-bests-v1` 之下。挑戰紀錄明確地不屬於生涯獎牌或星星。
- 模式標籤、結果說明、設定選項與危險警示皆支援英文與繁體中文。低畫質圖形、觸控操作與減少動態效果仍列在驗證計畫中。

### 真實遊戲截圖與驗證

用來檢視這些模式的截圖是**從執行中的瀏覽器遊戲**擷取，並非概念圖。[下載實際的 Playwright 擷取集](https://github.com/weskao/skyline-rush/actions/runs/39742666980/artifacts/12410172411)（自訂單人、自由駕駛、計時賽、障礙賽、極限障礙、檢查點衝刺與行動版模式選單）。GitHub Actions 產出物可能需要登入且會過期；若要在本機重新建立，請執行 `pnpm exec playwright test tests/race-modes-browser.spec.js` 並開啟 `test-results/race-mode-*.png`。CI 截圖採軟體算圖且解析度較低，不能代表最終裝置上的畫質。

**驗證：**每項功能的測試與完整關卡驗證紀錄皆列於 `TODO.md`。實體 iPhone 與 Android 的檢查仍待進行。

## 在本機執行

需要 Node.js 22.12 或更新版本、pnpm 11.28.13，以及支援 WebGL 2 並啟用硬體加速的瀏覽器。請以 `corepack enable` 啟用固定版本的套件管理器（或安裝 `pnpm@11.28.13`），並在開發前執行 `make setup`。

```sh
cd skyline-rush   # From the directory containing your clone
make         # Installs dependencies on first run, then starts the Vite + Vue dev server
```

開啟 Vite 印出的本機網址（通常是 http://127.0.0.1:5173）。資源與字型皆已內建於本機。核心遊戲不需要帳號；可選的雲端存檔登入與同步使用 Firebase 服務。

`make` 與 `make dev-unlocked` 也會啟動本機的 Firebase Auth/Firestore 模擬器（需要 Java 21+），因此雲端存檔的 Google 登入可搭配假的測試帳號運作，且絕不會動到真實存檔。專案擁有者的雲端存檔操作與 Spark 配額檢查請見 `docs/cloud-save.md`。

`make dev-diag` 與 `make phone-diag` 會提供相同的建置版本，並編入螢幕上的診斷橫幅（影格計數器、頁面生命週期、觸控事件及其命中目標，以及跨重新載入保留的最近未捕捉錯誤），用於在真實手機上追查當機或按鈕失靈的問題。正式建置絕不包含它：`pnpm run build` 會拒絕帶有診斷模組的產出。

`make phone` 會開啟終端機選單，用於啟動、檢查或停止可供手機開啟的開發伺服器（透過 Tailscale 或同一個 Wi-Fi），並在伺服器回應後印出手機網址。選單會列出此工作目錄、其他 worktree 與近期分支，也可輸入分支名稱；`make phone <name>` 會直接前往該分支（或 `feature/<name>`），必要時會在 `.claude/worktrees/` 底下建立其 worktree，`make phone off` 會停止它啟動的所有伺服器（等同 `/phone-dev off`），而 `y=1`（例如 `make phone y=1 <name>`）會略過選單：每個問題都採用其建議選項，並印出每項選擇。當某個連接埠已被本專案先前的伺服器（任何 worktree）佔用時，重複使用該連接埠就是建議的答案：舊伺服器會被停止，網址保持不變；`make dev`、`make dev-diag`、`make dev-unlocked`（5173）與 `make dev-feature`（5443）也會不經詢問直接這麼做，並且不會動到其他專案的伺服器。它提供一般的鎖定版建置；`make phone-unlocked [name]` 是相同的選單，但所有賽道與塗裝皆已解鎖，這是手機唯一能連上的全解鎖伺服器（`make dev-unlocked` 與 `make dev-feature` 仍僅限桌機）。除了在 `src/upcoming-tracks.ts` 的 `PLAYABLE_PREVIEW_IDS` 中新增 id 的情況外（僅限其真實比賽執行環境已在 `RACE_TRACKS` 中），Coming Soon 卡片在每個建置中都維持僅供預覽；`make dev-unlocked` 與 `make phone-unlocked` 之後會讓該卡片可以開始，正式版則永遠不會。它需要個人的 `phone-dev` Claude Code skill（`/phone-dev` 會詢問相同的選單），且不使用模擬器執行，因此手機上的雲端存檔登入使用的是真實專案。

## 操作

| 動作 | 鍵盤 |
| --- | --- |
| 加速 | W / ↑ |
| 煞車 | S / ↓ |
| 轉向 | A / D 或 ← / → |
| 飛行 | 速度夠快後按住 Space |
| 降落 | 放開 Space |
| 加速推進 | 按住 Shift；消耗推進器電量 |
| NITRO | E / X（一次完整電量；NITRO 期間再按一次可延長）。WASD 玩家使用 E；方向鍵玩家左手維持在 Shift / X / Space |
| 飄移 | 在高速時按住 S + A / D（僅限地面） |
| 開始 | Enter |
| 暫停／繼續 | Esc / P |
| 重新開始 | Backspace |
| 切換鏡頭 | C |
| 全部音訊靜音／取消靜音 | M |
| 自動加速開／關 | F2 / AUTO 按鈕 |
| AIRFLOW 展示開／關 | V / AIRFLOW 按鈕 |
| 在主畫面切換賽道 | 向左／右滑動或拖曳 3D 預覽，或在觸控板上用雙指滑動 |

行動版版面提供轉向、油門、煞車、加速、飛行與 NITRO 按鈕。觸控操作支援同時按住多個按鈕。AUTO 會持續按住油門，讓你專心轉向與飛行；煞車永遠優先於它。每種裝置預設皆為開啟；一旦你切換過，你的選擇會記在此瀏覽器中（`skyline-rush-auto`）。離開分頁會暫停比賽並清除按住的輸入。在比賽中點擊 SKYLINE RUSH 標誌會暫停並先詢問：**繼續比賽**、**結束比賽**（回到賽道選擇，該次行程不儲存）或**回到首頁**（重新載入）；不論選哪一項，起始畫面都會重新開啟於剛比賽過的賽道，並捲動到賽道列的中央（第一條與最後一條賽道位於其兩端）。Esc 會讓比賽維持暫停。鏡頭與音效快捷鍵會保留按住的駕駛操作。在觸控裝置上，拇指在轉向板上向下滑動即為煞車，向下並向側邊滑動則為飄移；在按鈕模式中，較窄的煞車鍵位於轉向按鈕上方，不在拇指平常停放的那一列，因此只有刻意才會按到；將拇指從 ← 或 → 向上滑入煞車鍵，會同時維持轉向並煞車，因此一根拇指即可飄移，往回向下滑則會放開煞車。觸控按鈕與螢幕角落保持距離，讓拇指更容易觸及，平板則會將它們抬高並放大。

比賽前或暫停時開啟 **Controls**，可調整鍵盤轉向靈敏度或重新對應駕駛動作。選擇一個動作，然後按下一個按鍵；衝突的綁定會互換，固定的快捷鍵保持保留，Escape 取消擷取。重設鍵盤會還原預設值。綁定會立即生效，並儲存在 `localStorage['skyline-rush-keymap']` 之下。手機與平板在按下實體（例如藍牙）按鍵之前會隱藏鍵盤區段；該鍵盤之後會被記在 `localStorage['skyline-rush-keyboard-seen']` 之下。

同一個面板也控制觸控轉向模式、慣用手、滑動靈敏度、大小、不透明度，以及按住／切換式 FLY。**編輯觸控版面**讓你在比賽預覽上拖曳動作按鈕與經典轉向按鈕；**完成編輯**會保留配置，**重設觸控版面**則會還原。位置會跨重新載入保留，隨慣用手鏡像，並在旋轉後維持在可視範圍內。在較短的橫向螢幕上（例如工具列顯示中的 iPhone Safari），起始畫面會省略其標語，讓 START RACE 無需捲動，而比賽 HUD 會隱藏速度表與次要電量列，避免面板互相重疊。

所有音訊皆以 Web Audio 合成；無需下載任何音訊檔。音樂會跟隨目前的畫面、賽道與遊戲模式，並對檢查點、危險、特技與最後衝刺等事件提供提示音。音效涵蓋選單、倒數、駕駛、飛行、加速、碰撞、降落與獎勵。暫停時行駛聲會淡出；音效靜音會停止待播的提示音。

喇叭圖示會開啟音訊設定，包含音樂列與音效列，各有一個靜音開關與音量滑桿。**全部靜音**（或 M）會同時讓兩者靜音。靜音會保留各聲道的音量，因此取消靜音會回到原本的音量；將滑桿拖曳到零，會以同樣方式讓該聲道靜音。兩者預設皆為開啟、音量 100%，每項開／關選擇與音量都會記在 `localStorage` 中（`skyline-rush-music`、`skyline-rush-sound` 存放 `on`/`off`，另有存放百分比的 `-volume` 變體）；若沒有任何儲存值，兩個聲道皆為開啟，並會以 `on` 儲存。在較短的螢幕上，面板可捲動。在瀏覽器允許自動播放的環境中，開場音樂會在頁面載入後立即開始。若不允許（首次造訪時的 Chrome 與大多數其他瀏覽器），則第一次點按、點擊或按鍵就會開始播放。在 iPhone 與 iPad 上，遊戲會請求媒體播放，因此靜音開關不會讓它靜音；這也會在遊戲進行時暫停其他 App 的音訊。

飛行面板會顯示爬升、巡航、下降與觸地、剩餘推進秒數，以及下一個要使用的操作。青色光環標示空中走廊，且屬於遊戲玩法：請見下方的「光環」。行動版也有按住加速的按鈕。橘色的接觸報告會顯示撞擊類型與損失的速度；護欄現在會反彈並讓地面上的車輛減速。飛越護欄上方則可避開護欄。

場景包含泛光照明、夕陽水面、懸索橋、推進器蒸氣、碰撞火花與觸地漣漪。鏡頭運動與非必要的速度線會遵從你系統的減少動態效果偏好。音效為推進、碰撞與降落提供各自獨立的回饋。

**VFX**（右上角）可選擇 Realistic、Cinematic 或 Extreme 風格、Low / Medium / High 畫質（Low 會關閉泛光並減少繪製的風景）、舒適模式（無閃光、震動、殘影或模糊）以及可選的觸覺回饋。其中的 **Race HUD** 區段可選擇 Immersive 或 Competitive（含排行榜、小地圖與次要統計開關）、開啟或關閉 NITRO READY 音效與動畫，而 **Reset HUD to default** 會還原它們。**Fine tuning** 將每個效果以滑桿呈現，**Reset visual settings** 會還原預設值。**AIRFLOW**（或 V）會將場景切換為空氣動力學展示：車身上的流線、遙測面板、Low drag 或 High downforce，以及行駛、前方、後方、側面或環繞的鏡頭。展示期間起始面板會退開，只留下橘色的 **START RACE** 按鈕，固定在車子下方的底部中央；向左或向右滑動場景可切換賽道。第一次開啟 AIRFLOW 時，會有一根動畫指尖示範該手勢。流線只在 AIRFLOW 開啟時出現：關閉時，BOOST 與 NITRO 會顯示推進器噴流（粗大的火焰，帶有明亮的核心與噴嘴閃光，在 Medium 與 High 還有路面上的光暈）、尾跡與速度線，但不含流線。

起跑燈號標示倒數與 GO。玩家駕駛一輛配有後置推進器、主動式尾翼與動畫輪胎的跑車。AI 對手有各自獨特的輪廓與燈光特徵，車流則使用通勤車輛。轉向會緩緩加入，放開加速後車子會逐漸減速。駕駛與工具列的控制項提供符合觸控尺寸的點擊目標。

在地面高速近距離超越車流，會累積獎勵連鎖並回充電量。碰撞會中斷連鎖；在空中、距離太遠或復原中的超越不會獲得獎勵。HUD 提示會報告超越與最後衝刺，結果畫面則會彙總近距離超越與碰撞次數。

動力飛行會消耗推進器電量；歸零時車子會自動下降。放開 FLY 與 BOOST 即可滑翔並回復電量，或降落以更快充電。BOOST 取用同一個儲備。對手與車流遵守共通的碰撞規則：它們會避開較慢的車輛與固態障礙，撞擊會使相關車輛減速並被推開。領先 AI 車隊即可獲勝；在瀏覽器儲存空間可用時，會儲存符合資格的個人最佳成績。

### 操控手感

轉向會平順地累積，高速時橫向移動受到限制。FLY 會暫存提前的按壓，直到達到起飛速度。放開 FLY 會讓下降變得柔和；若 BOOST 也放開，滑翔會回復電量。耗盡的推進器在放開並充分回復後會再度可用。缺口警告有助於判斷跨越所需的電量，專用坡道則能將車子發射出去。輕微的護欄擦撞會保留連擊；較重的撞擊則算作碰撞。放開轉向時，AUTO 也提供車道置中輔助。同時按住 FLY + BOOST 會啟動 AIR DASH，比各自獨立的推進更有效率地共用電量。

### NITRO 與飄移

NITRO 擁有獨立的儲備，在 HUD 中以電量區段顯示。道具、光環與駕駛獎勵會補充它；NITRO 獎勵也能回復推進器電量，溢出的部分會轉為電量。道具配置會隨起跑格數量調整，並於每場比賽重新隨機。完整的電量會啟動限時的速度與加速度提升；再按一次可延長爆發時間，但不會疊加其速度加成。NITRO 也會減少因碰撞車流而損失的速度。

在地面高速時，煞車 + 轉向會開始飄移。持續飄移以累積獎勵等級，然後放開即可獲得 NITRO 與小幅加速。煙霧、彩色火花、音效與 HUD 回饋會呈現累積的過程。起飛、掉入缺口或發生碰撞都會失去已累積的獎勵。

NITRO 不會消耗推進器電量，且可與 FLY 或 BOOST 同時運作；動力飛行與 BOOST 仍會消耗它們共用的儲備。

**空中特技**：飛行時快速朝相反方向轉向即可開始桶滾。完成翻滾並平穩降落即可獲得 NITRO；過早降落、撞上障礙或降落過重都會取消獎勵。HUD、音效與可選的觸覺回饋會報告該特技。減少動態效果與舒適 VFX 會保留回饋，但不含旋轉。

**捷徑**：點對點賽道在邊緣車道上方設有標示的空中走廊。維持在飛行路線內可獲得更高的速度上限與免費飛行，沿途還有道具；BOOST 仍會消耗電量。塔柱仍是固態的危險物。半透明的橋面與 SHORTCUT / FLY HIGH 標誌標示出該路線，HUD 會報告進入。

### 光環

光環配置會隨起跑格與賽道調整，包含成組光環、直線列、全寬排列與風險光環；Endless 會隨距離增加持續生成新的事件。位置會於每場比賽重新隨機，同時尊重賽道的危險物。穿過可見的開口即可收集光環。各類光環會補充電量或 NITRO、給予小幅加速、獎勵風險，或套用暫時的神秘效果。收集過的光環會消失；清除完整的一組會獲得 PERFECT LINE 與額外 NITRO。漏掉一個光環會中斷該組，但保留已收集的獎勵。

### 對手、氣流跟車與最後衝刺

跟在對手或車流車輛後方可獲得暫時的速度上限提升與 NITRO；必須離開氣流之後才能再次獲得。對手會依難度與駕駛狀況管理 BOOST 與 NITRO，有限度的速度調整則讓車隊保持競爭力。當玩家大幅落後時，符合資格的經典賽與盃賽可在前方放置額外的復原補給。最後衝刺期間，音樂與 HUD 回饋會強調附近的對手與距離差距。

### 儲存的資料

進度與偏好設定使用瀏覽器儲存空間，並具備驗證與失敗處理，因此儲存被封鎖或資料格式錯誤都不會妨礙遊玩。歷史紀錄保留近期的比賽，而相容的最佳時間、賽道解鎖、獎牌、星星、塗裝選擇與符合資格的幽靈車則分開儲存。紀錄以賽道配置與規則集為範圍，因此不相容的行程不會取代目前的最佳成績；相容的舊資料在可用時會被遷移。開啟 **History** 可篩選比賽、比較時間並檢視細節。每日與挑戰模式的紀錄與生涯成績保持分開。可選的 Google 登入會透過 Firebase 同步支援的進度；裝置設定則維持在本機。結果畫面會說明完成的比賽是否已同步到雲端，或在你登出時提供登入。同步與儲存的細節請見 `docs/cloud-save.md`。

### 幽靈車、每日挑戰、獎牌與 Garage

- **幽靈車**：每次行程會在整場比賽中取樣車子的距離、車道位置與高度。在某條賽道創下新的個人最佳時會儲存該次行程，之後在該賽道的比賽會以半透明的藍色車輛顯示它。預設為關閉；請在 Controls 中以 **Show best-run ghost** 開啟。
- **每日挑戰**：History 會顯示今天的賽道與修飾條件，依本機日期挑選：禁止飛行、車流增加，或僅有金色光環。Canyon 絕不會出現禁止飛行，因為它的斷橋需要飛行。每日行程只會列入各自的今日最快排行榜；絕不影響歷史紀錄、最佳時間、解鎖、星星或幽靈車。重新開始會保留挑戰，**選擇賽道**則會離開它。
- **獎牌**：First victory（獲勝）、Clean run（無碰撞）、Perfect flight（在單場比賽中取得足夠的 PERFECT LINE）與 Triple burst（足夠多次延長 NITRO 爆發）。只有符合資格的經典賽完賽才能獲得；每枚都會保留首次獲得的日期。
- **Garage**：每條生涯賽道上獲得的最佳風格星星會累加，用於解鎖塗裝。Garage 會顯示每種塗裝的需求，並讓你預覽尚未解鎖的選項。塗裝只改變外觀，不改變車輛數值。

### Sky Spiral

Sky Spiral 在賽博龐克天際線上方加入了一條真正的 3D 上升螺旋道路。繞著發光的中央高塔完整行駛一圈水平旋轉，然後從專用坡道發射，跨越高架缺口。既有的 FLY、BOOST 與 NITRO 都適用於這條新賽道，並提供可選的飛行修正。這條賽道使用獨立的彎曲道路算圖器與自己的 3D 路徑對應器；仍在實體行動裝置上驗證中。

### 賽道與風格

從 Coast 開始，在符合資格的經典賽中登上頒獎台，即可解鎖後續的生涯賽道。選擇畫面會顯示可用狀態與解鎖條件。開始前先選擇賽道，或向左或向右滑動 3D 預覽（以滑鼠拖曳，或在觸控板上用雙指橫向滑動），像輪播一樣翻頁到相鄰的賽道：它會跟隨手指，輕輕一撥即可，第一條與最後一條賽道會有橡皮筋回彈效果，並有一個標示賽道名稱的標籤與頁面圓點；鍵盤使用者可用左／右鍵在賽道按鈕之間移動，並以 Enter 選擇。重新開始會保留所選賽道；結果畫面上的**選擇賽道**會回到選單。若可用，**下一關**會開始下一條已解鎖的生涯賽道。生涯進度完成後，以及在每日挑戰中，它都會隱藏。若瀏覽器中斷了 WebGL 連線（在 iPhone 鎖定螢幕或切換 App 後很常見），圖形恢復時遊戲會清除警告；否則，**開始**或**再賽一次**會重新載入頁面。每條賽道都有自己的天空、色盤與程序化生成的風景：下雨的霓虹街道與低矮隧道、紅色沙漠懸崖與橋梁缺口／側風，或有極光與冰面的雪山。警告標誌會標示特殊路段。Aurora 的上坡路段回復地面燃料的速度較慢。

### World Tour 賽道、路線地圖與賽道名稱

World Tour 各賽道共用同一個彎曲道路算圖器（`src/world-tour-scene.js`），並各有自己的色盤、建築與地標（總統府與北門的輪廓、霓虹十字路口與一座塔、鐵路高架橋與山峰、一座燈塔與跨海大橋、帶環的行星）。在主畫面選擇 World Tour 賽道時，會在盤旋的車輛後方框出其代表性地標：總統府、Tokyo Tower、一座阿爾卑斯山峰、一座燈塔或宇宙之門。朝它競速時，路邊會讓該地標保持在清楚的視野中。每張賽道卡片都會顯示完整的主要路線，比賽中則有即時地圖標示玩家與 AI 對手在其上的位置；空中捷徑絕不會被繪製。在較短的螢幕與窄手機上，即時地圖會退開，排行榜仍會為賽車手排名。賽道名稱會跟隨以 **EN / 繁體中文** 切換開關選擇的語言（請見下方的「語言」）。

風格分數獎勵近距離超車、光環、完整的光環組、移動中的滯空時間與乾淨的行駛距離。飄移與風險機會會提高獎勵，而碰撞與掉入缺口則會中斷乾淨距離的進度。符合資格的經典賽結果會依相對於賽道長度的分數授予風格星星，與完賽名次無關。

燃料與氮氣條會緩緩趨近新的數值、在電量偏低時警告、在回充時閃爍，並在一次氮氣充飽時脈動。舒適模式與系統減少動態效果會停用這些動畫。滑動板在按住時會顯示浮動的圓環／旋鈕，並在比賽開始時顯示簡短的提示；放開會讓轉向回到中立。

HUD 使用共通的動態時序。速度表指針會隨速度緩動；名次變化會翻轉名次數字並帶有綠色上升或紅色下降箭頭，排行榜的各列則會滑入新位置。精簡的半透明事件提示位於視野中央上方，避開 HUD 面板，並將險些擦過、PERFECT LINE、NITRO 爆發、電量增加與飄移火花等級排入佇列而不重疊；同時也補充飛行電量的 NITRO 獎勵，會在其提示中點名。通過有限賽道的一半時，會彈出 HALFWAY 提示，顯示剩餘距離並伴隨上升的鈴聲。右上角的即時路線地圖（橫向的手機上也有）就是進度讀數：已行駛過的道路會變成橘色，其下方的說明文字則顯示距離；Endless 只保留距離說明。暫停、完賽與重新開始會清空佇列。按鈕在按下時會變暗而不改變大小，因此直到邊框之前的任何位置都能觸發；按住的觸控按鈕則維持發亮。取得能量罐、燃料桶或過充時，會讓推進器電量條閃爍並顯示它增加的電量（「+10」）、輕推鏡頭，並在開啟 **Haptic feedback** 時給予一個隨道具大小增強的輕微脈衝。VFX 設定中的可選 **Haptic feedback** 會在支援的觸控裝置上標示碰撞、NITRO、飄移獎勵與道具。舒適模式與系統減少動態效果會保留文字與按下狀態的顏色，同時移除新的動態與震動。

### 語言

整個介面提供英文與繁體中文（繁體中文）：起始畫面、Garage、History、HUD、比賽提示、結果、路線地圖、設定與 3D 路標。起始畫面賽道卡片下方的一個 **EN / 繁體中文** 切換開關可一次改變全部內容，無需重新載入。語言依下列順序選擇：

1. 你按下切換開關所儲存的選擇（`skyline-rush-locale`；它只在點擊時寫入，絕不會因自動偵測而寫入）；
2. 你的系統語言順序（`navigator.languages`）：第一個 `en*` 或 `zh*` 項目決定結果，其他語言會被略過（`['ja-JP', 'zh-TW']` 會選擇繁體中文），任何 `zh*` 標籤（zh-TW、zh-HK、zh-Hant、zh-CN、zh-Hans、單純的 zh）都會選擇繁體中文，而空的或缺少的清單則退回使用 `navigator.language`；
3. 否則使用英文。

品牌與遊戲術語在兩種語言中都保持英文：Skyline Rush、NITRO、FLY、BOOST 與對手名稱。字串位於 `src/locales/`；`src/i18n.ts` 負責偵測、`t()` 與目前的語言。

在地化圖片：`node scripts/capture-og-images.mjs` 會在 Chrome 中驅動真實的 App，並儲存 `public/og-image.jpeg`（1440×900 的英文啟動畫面），以及供英文與繁體中文 README 使用的 `artifacts/{readme-startup,readme-start,readme-hero,mobile-flight,race-results}{,.zh-TW}.jpeg`，皆於玩家版（`coming-soon`）Garage 建置上拍攝（`node scripts/capture-og-images.mjs og` 或 `readme` 只執行其中一半）。README 的賽道蒙太奇與兩支遊玩影片是分開擷取的；影片是開啟音樂與音效的螢幕錄影（`node scripts/record-whats-new-clip.mjs <slug> --master`），以 GitHub 附件上傳。`public/manifest.webmanifest` 與 App 圖示維持不變：圖示不含文字，而 Web App manifest 只有單一的名稱與描述、沒有各語言的變體，因此第二份 manifest 會破壞可安裝性。

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

瀏覽器測試使用已安裝的 Google Chrome，並允許無頭算圖使用 SwiftShader。僅有 CPU 的 CI 使用 0.25 的裝置縮放比，以維持 3D 場景的流暢，同時保留相同的 CSS 視窗尺寸與遊戲斷言；本機測試則以完整解析度算圖。一般遊玩使用瀏覽器可用的 GPU。英文 README 的截圖僅在檔案不存在時，或搭配 `UPDATE_ARTIFACTS=1 pnpm run test:browser` 時，才會以 JPEG（品質 70）寫入 `artifacts/`，因為即時 3D 場景每次執行都不同；測試追蹤／結果則被忽略。完整的衝刺測試在快速的機器上大約需要一分鐘，軟體算圖拖慢模擬時則更久。

```sh
pnpm run preview         # Serve the production build after pnpm run build
```

要在手機上檢查，請在你的網路上提供建置版本（`pnpm exec vite preview --host 0.0.0.0`），並以 `?perf` 開啟（例如 `http://<computer-ip>:4173/?perf`）。頂端會出現一條列，顯示最近 20 秒賽車的影格時間：中位數（p50）、第 95 百分位（p95）、平均 fps 與樣本長度。沒有 `?perf` 時，不會量測或顯示任何內容。

```sh
make perf BASE=main         # A/B in Chrome at 412×915, CPU throttled 6× (RATE=20 for a low-end phone), 3 alternating rounds
make perf BASE=main VIEWPORT=desktop  # The same A/B at 1440×900 desktop size
make perf-phone             # Like make phone: asks base version, Tailscale/Wi-Fi and Telegram; logs phone temperatures
```

`make perf` 會建置此工作目錄，若有 `BASE=<git ref>` 也會建置該 ref（位於 `.claude/worktrees/perf-<sha>`，下次會重複使用），每次執行在 Coast 賽道上競速 24 秒，並印出每次執行的條列，以及各建置的中位數。`make perf-phone` 對於未傳入的項目（`BASE=`、`VIA=tailscale|wifi|auto`、`TG=0`），會以和 `make phone` 相同的方式詢問，為每個建置印出並傳送一個 `?perf` 網址到 Telegram，在以 USB 連接的任何 Android 手機上以 Chrome 開啟第一個網址（`adb reverse`，因此任何網路皆可），在按下 Ctrl+C 時傳送網址已失效的通知，並每 10 秒記錄手機的感測器溫度與降頻等級（`dumpsys thermalservice`），以及 Mac 的熱警告等級，直到按下 Ctrl+C 為止。請只在相同的降頻等級下比較各次執行：發燙的手機無論建置為何都會降頻並掉格。iPhone 不回報溫度。

## 部署

請在 [https://weskao.github.io/skyline-rush/](https://weskao.github.io/skyline-rush/) 遊玩。這個網站是公開的：訪客不需要 GitHub 帳號或 Tailscale，開發者的電腦也可以離線。

```sh
git tag v0.4.0 && git push origin v0.4.0   # Release: deploys once CI confirms the commit already passed on main
make deploy                              # Deploy remote main manually through the same CI flow
# The on-screen version (ready screen, desktop and mobile) is `package.json`'s version; `/release` bumps it
# after scripts/release-gate.sh has seen a green CI run for the commit on main.
```

CI（`.github/workflows/ci.yml`）會在推送到 `main`、`develop`、拉取請求、版本標籤推送（`v*`）與手動執行時，建置並執行單元與 Chrome 瀏覽器測試。瀏覽器與 World Tour 的長時間測試以平行分片執行，依 `tests/ci-durations.json` 中量測的各測試耗時來平衡（`scripts/ci-shards.mjs`），僅在 `main` 與 `develop` 上執行（其他分支只執行單元與雲端存檔檢查，除非提交訊息含有 `[full-regression]` 或手動執行要求完整回歸），且對同一分支的較新推送會取消被它取代的執行。CI 會對失敗的瀏覽器測試重試一次；僅在重試時通過的測試仍會在該次執行中被標註，並視為需要修復的錯誤（`.claude/rules/browser-test-stability.md`）。在任何分支上，若推送或拉取請求只變更 `src/`、`public/`、`tests/`、`scripts/` 與 `.github/` 之外的 Markdown、文字、圖片、影片或 `Makefile`，且其父提交已在該分支通過 CI，則會略過所有測試套件（`scripts/ci-changes.mjs`）。手動執行會在所有檢查通過後發佈；版本標籤推送會重新執行單元測試，確認（`release-verified`）所標記的程式碼已在 `main` 上通過完整測試套件，而不是重新執行瀏覽器測試套件，然後發佈並驗證公開網站。若標記在一個 CI 從未在 `main` 上通過的提交上，則不會部署。一般的分支推送與拉取請求只執行檢查。推送到 `main` 時，若其中某個合併提交合併的不是 `develop` 或 `hotfix/*`，`main-merge-source` 工作（`scripts/check-main-merges.sh`）也會失敗，而該紅燈執行會阻擋發佈。Pages 建置使用 `--base=/skyline-rush/`，讓腳本、樣式與字型從專案網址載入。GitHub Pages 必須以 **GitHub Actions** 作為其發佈來源。手動部署需要已驗證的 GitHub CLI（`gh auth login`）；請先推送你的提交，因為 `make deploy` 使用遠端的 `main`。部署不再依賴本機的 pre-push hook 或 Netlify 登入。當任何檢查或部署在推送、標籤或手動執行時失敗，`notify-telegram` 工作會將失敗執行的連結傳送到 Telegram；它需要儲存庫密鑰 `TELEGRAM_BOT_TOKEN` 與 `TELEGRAM_CHAT_ID`（以 `gh secret set <NAME>` 設定各項，它會提示輸入值），缺少時則靜默略過。

連結預覽圖片是 `public/og-image.jpeg`，即準備就緒時的啟動畫面，由 `node scripts/capture-og-images.mjs og` 在不含按鈕的情況下擷取。爬蟲無法切換語言，因此 `index.html` 只引用這張英文封面（搭配 `og:locale` `en_US` 與 `og:locale:alternate` `zh_TW`）。`public/og-image.en.jpeg` 與 `public/og-image.zh-TW.jpeg` 是封存的 0.21.0 What's New 圖片。變更封面後，請提高 `index.html` 中 `og:image` 的 `?v=`，讓社群網站抓取新的圖片。

## 專案

- `src/game.js`：確定性的街機模擬、對手、車流與完賽順序。
- `src/input.ts`：具備取消與失焦清理的鍵盤與多指標控制；讀取已儲存的按鍵對應。
- `src/key-map.ts`：純粹的按鍵對應，含 E / X NITRO、會互換衝突的重新綁定、驗證與儲存。
- `src/history.ts`：已儲存的遊戲資料：近期比賽歷史、各賽道最佳成績與舊資料遷移、生涯統計、獎牌、星星、已裝備的塗裝、幽靈車與每日排行榜。
- `src/ghost.ts`：取樣式幽靈車錄製、各賽道驗證與內插播放。
- `src/appearance.ts`：塗裝目錄與星星解鎖門檻。
- `src/rng.ts`：有種子的隨機串流；道具與光環來自每場比賽的配置種子（測試與工具中則使用賽道種子）。
- `src/world.js`、`src/geometry.ts`：Three.js 算圖器、程序化車輛、公路、天際線、飛行效果與鏡頭。
- `src/effects.js`：用於蒸氣、火花與落地塵土、有上限的 GPU 粒子池。
- `src/track-paths.ts`、`src/world-tour-scene.js`：每條賽道一個距離到道路的對應，以及共用的 World Tour 道路、風景與地標。
- `src/route-map.ts`、`src/i18n.ts`：SVG 的完整路線與即時賽車手地圖；語言偵測、已儲存的選擇、`t()` 與英文／繁體中文賽道名稱；`src/locales/` 存放目錄。
- `scripts/capture-og-images.mjs`：從真實的 App 擷取英文與 zh-TW 封面圖片，以及 zh-TW README 截圖。
- `scripts/pickup-economy.mjs`：由腳本控制的機器人駕駛每條賽道，並印出每分鐘 NITRO、BOOST 佔比、燃料耗盡次數與第一次取得 NITRO 的時間；`tests/pickup-economy.test.js` 鎖定光環／道具配置。
- `scripts/ring-variety.mjs`：在重新隨機的比賽種子上，印出每條賽道的光環車道分布、地面佔比、每場比賽的光環列與排列，以及機器人的光環收集量與 NITRO 速率；`tests/ring-variety.test.js` 確保每條車道都被使用，同時不讓光環更難收集。
- `scripts/rival-balance.mjs`：一個專家機器人（使用 BOOST、為光環而飛）與一個初學者機器人（兩者皆無）在各賽道與難度上對抗 AI 車隊；印出最快對手的差距與機器人的名次。
- `scripts/ci-shards.mjs`：`plan` 為每個 CI 分片提供其 Playwright `--test-list`，依耗時打包測試，讓每個分片大約同時完成；`refresh <run-id>` 會在測試套件大幅變動後，根據某次 CI 執行的日誌重寫 `tests/ci-durations.json`。
- `src/App.vue`、`src/icons.ts`：Vue 3 的 UI 外殼（起始畫面、HUD、面板、觸控控制）及其共用的 SVG 圖示；共用面板使用 Vue 元件，而賽中 HUD 則由遊戲迴圈直接更新。
- `src/main.js`、`src/style.css`：掛載 `App.vue`、串接各畫面控制器，並執行比賽生命週期（開始、暫停、重新開始、結果）與影格迴圈。
- `src/*-ui.ts`：每個畫面區域一個 TypeScript 控制器（比賽選擇、雲端存檔、觸控控制、按鍵對應、VFX、音訊、歷史對話框、照片模式）。
- `src/race-hud.ts`、`src/race-hud-modes.ts`：賽中 HUD，每次 HUD 更新時以命令式方式寫入。
- `src/pickup-take.ts`、`src/pickup-feedback.ts`、`src/pickup-fuel-cue.ts`：玩家的道具拾取事件，以及各等級的觸覺、鏡頭衝擊與燃料條回饋。
- `src/race-results.ts`、`src/result-screen.ts`、`src/session-progress.ts`：記錄完成的比賽（最佳成績、解鎖、獎牌、幽靈車）並顯示其結果畫面。
- `vite.config.js`：搭配 `@vitejs/plugin-vue` 的 Vite。
- `src/perf.ts`：用於 `?perf` 裝置檢查讀數的影格時間百分位數。
- `src/audio.js`：合成的音效與循環播放的音樂音序器；歌曲位於 `src/music-tracks.ts`，比賽到音效的事件位於 `src/race-audio-events.ts`。
- `src/audio-settings.ts`：從 `localStorage` 讀取已儲存的音樂／音效開關與音量，以及滑桿「靜音保留音量」的規則。
- `tests/`：單元與瀏覽器行為測試。`tests/module-size.test.js` 讓每個原始碼模組維持在 400 行以內（較舊的大型檔案有只降不升的上限）。
- `docs/design.md`、`docs/verification.md`：範圍與驗證證據。
- `README.zh-TW.md`：本檔的繁體中文翻譯，由 `scripts/readme-zh.mjs` 維持最新（`check`、以 `claude -p` 翻譯的 `sync`，以及手動編輯後的 `stamp`）。當提交變更 README.md 時，`.githooks/pre-commit` hook 會重新產生它（以 `SKIP_README_ZH=1` 略過一次）；而 `.githooks/pre-push` 在推送的提交變更 `src/`、`tests/`、`scripts/` 或 `package.json` 時會執行 `pnpm test`，並在它們觸及主畫面（`index.html`、`src/App.vue`、`src/main.js`、`src/style.css`、`src/locales/`；以 `SKIP_LAYOUT_GATE=1` 略過一次）時接著執行 `pnpm run test:layout`，`.githooks/main-merge-guard`（由 `pre-merge-commit` 與 `pre-commit` 執行）則拒絕將 `develop` 或 `hotfix/*` 以外的任何分支合併進 `main`（快轉不會執行任何 hook，因此請使用 `--no-ff`；以 `ALLOW_MAIN_MERGE=1` 略過一次）；`make` 會以 `git config core.hooksPath .githooks` 啟用這些 hook。`.claude/settings.json` 中的 Claude Code Stop hook 會在某一輪編輯了 README.md 卻未同步更新它時，讓 Claude 回頭更新。

所有車輛／風景幾何與效果皆由程式碼產生。Barlow Condensed 依 SIL Open Font License 內建於 `public/fonts/OFL.txt`。Three.js、Vue、Vite 與 Playwright 保留其各自的套件授權。

來源：[weskao/skyline-rush](https://github.com/weskao/skyline-rush)。以街機物理在多條賽道上進行的單人賽車。瀏覽器驗證涵蓋桌機 Chrome 與模擬的行動裝置視窗；iOS Safari 已在 iOS 模擬器中檢查過（直向與橫向，Coast 與 Neon），但實體手機上的影格率尚未量測（請使用 `?perf`，見驗證一節）。
