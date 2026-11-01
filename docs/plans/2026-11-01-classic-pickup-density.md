# 經典競速前三圖：光圈／道具密度改善計畫

- 日期：2026-11-01
- 分支：`feature/classic-pickup-density`（從 `develop` `54de8259` 開出）
- worktree：`.claude/worktrees/classic-pickup-density`
- 負責 session：tmux `sky`
- `PLAYWRIGHT_PORT`：5185（5181–5184 已被其他 session 佔用）

## 問題

玩家回報：「經典競速」的前三張地圖 Coast、Neon Downtown、Canyon Skyway 上，光圈和道具太少，爽度不足，常常沒有 BOOST 或 NITRO 可用。

## 現況（`develop` `54de8259`）

| 項目 | 程式位置 | 現況 |
|---|---|---|
| 光圈間距 | `src/ring-layout.ts` `createRings` | Coast 固定每 220 m 一個；其他圖每 200–320 m 隨機一個 |
| 光圈位置 | 同上 | Coast 固定在 x 2.5、離地 8（`fixedRings`），一定要飛才拿得到；其他圖 x 在 ±7 之間、離地 3–9 |
| 光圈種類比例 | 同上 | charge 35%、nitro 25%、slipstream 18%、risk 12%、mystery 10% |
| 光圈獎勵 | `src/game.js` `collectRing` | charge +20 燃料；nitro +0.5 格 NITRO；risk +1 格；slipstream 3 秒 mini-boost |
| BOOST 消耗 | `src/game.js` 約 L403 | 地面每秒 10 燃料，飛行中推進每秒 3；滿油 100 約撐 10 秒 |
| 地面道具 | `src/game.js` `createPickups` | 從 300 m 起，每 120–280 m 一組（cell 60%、can 25%、空中 tank 15%），加上捷徑上的獎勵線 |
| 加速隧道 | `src/game.js` 約 L348 | 每段給 3.5 秒 mini-boost 和 +0.25 NITRO。**前三圖完全沒有**；World Tour 五張圖每張都有一段 |
| NITRO 起始值 | `src/game.js` L187 | 玩家從 0 格開始 |

**依長度粗估光圈數量**：Coast 約 22 個、Neon 約 15 個、Canyon 約 23 個。前三圖之間差距不大，所以「太少」主要不是數量問題，而是**拿得到的比例**和**獎勵節奏**。目前的推測如下，都還沒有量測過：

1. **Coast 的光圈都在離地 8 的高度。** 不飛就一個也拿不到，而飛行本身又吃燃料，兩邊互相抵銷。
2. **Neon 有三段隧道，總長 1600 m，佔整條賽道的 40%。** 隧道裡的光圈會壓低到離地 1.5，但地面道具裡的空中 tank 在隧道內被禁止，所以這一段幾乎沒有補給。
3. **前三圖沒有加速隧道。** World Tour 每張圖都有一個保證觸發的 boost 時刻，前三圖完全沒有。
4. **NITRO 從 0 開始，nitro 光圈每個只給 0.5 格。** 開場要拿到兩個 nitro 光圈才能第一次按 NITRO，第一個爽點來得太晚。

> 修正先前的說法：`collectRing` 只處理 `race.player`，對手不會拿光圈。因此 Eight-Car 把對手增加到 7 台**不會**搶走玩家的光圈。不過賽況變得更擠，玩家能放心飛的空間會變少，這一點仍需要實測。

## 目標（可驗證的驗收標準）

先量測，再調整。以下的「基準」是 World Tour 五張圖目前量測值的中位數。

- **AC1 量測工具**：新增一個 deterministic 的模擬量測。用固定輸入的腳本 bot 跑每張圖，例如「盡量走光圈線，並在有燃料時 BOOST」。輸出每張圖的：
  - 每分鐘可取得的 NITRO 格數
  - BOOST 或 mini-boost 開啟時間的比例（%）
  - 燃料歸零的次數
  - 第一次能按 NITRO 的時間（秒）

  十張圖都要跑，Coast、Neon、Canyon 的現況寫進本文件的「量測結果」一節。
- **AC2 前三圖達標**：Coast、Neon、Canyon 的以下指標要達到 World Tour 中位數的 ±15% 以內：每分鐘 NITRO 格數、BOOST 開啟比例，以及第一次能按 NITRO 的時間（不能比基準晚）。
- **AC3 其他圖不動**：Aurora、Sky Spiral 和 World Tour 五張圖的光圈與道具排列 bit-for-bit 不變，由測試鎖住每張圖的 ring/pickup 序列雜湊。
- **AC4 規則不變**：賽道長度、中心線、捷徑、斷崖與檢查點全部不改。這是道具層級的調整，不是賽道結構變更。
- **AC5 遮擋與碰撞**：新增的光圈和道具不能放在斷崖洞口上，也不能卡進隧道頂。至少要留兩條車道可以通過，並遵守 CLAUDE.md 的「Solid obstacles」規則。

## 調整選項（依優先順序，達到 AC2 就停）

全部做成**每張圖的資料設定**（`src/race-tracks.ts` 的 `TrackConfig` 欄位），不要改全域常數，這樣 AC3 才成立。

1. **給前三圖各加一段 `boost-tunnel`**（或不在隧道裡的「加速帶」）。這樣可以直接重用 World Tour 現有的機制、畫面和音效，不需要新程式。位置要避開現有的 tunnel、gap 和 shortcut。
2. **Coast 的光圈高度**：改成高低交替，例如一半維持離地 8，一半降到離地 3，讓不飛的玩家也拿得到。x 維持 2.5，保留原本的經典光圈線。
3. **每圖的光圈密度**：在 `TrackConfig` 加 `ringSpacing` 覆寫值，例如 Neon 改成每 160–240 m 一個。只影響有設定的圖。
4. **每圖的光圈種類比例**：在 `TrackConfig` 加 `ringWeights`，提高 nitro 和 charge 的比例。
5. **開場 NITRO**：只有在前面幾項都不夠時才考慮，例如經典模式開局給 1 格。這會影響所有地圖和最佳成績的比較，**需要另外取得使用者同意**。

不做的事：不改 NITRO 和 BOOST 的消耗與速度上限，不改對手 AI，不新增道具種類。

## 必須先決定的事（開工前問使用者）

- **最佳成績和 Ghost 怎麼處理**：光圈和道具變多，前三圖的成績會變快，跟舊紀錄的比較就不公平了。有兩個做法：
  - (a) 加一個 pickup layout 版本鍵，舊紀錄保留並標示「舊版配置」。
  - (b) 直接沿用舊紀錄。

  CLAUDE.md 要求「保留歷史資料 bit-for-bit」，所以預設採 (a)，並在實作前由使用者確認。Ghost 存的是行車軌跡，可以照常重播，但重播時會穿過新的光圈。

## 實作步驟（TDD：RED → GREEN → REFACTOR）

1. **量測（AC1）**：新增 `scripts/pickup-economy.mjs`，或放在 `tests/` 裡的 deterministic 量測。先跑現況，把數字寫回本文件。
2. **RED**：
   - 對 Coast、Neon、Canyon 斷言 AC2 的門檻，預期會失敗。
   - 對其他七張圖斷言 ring/pickup 序列雜湊，鎖住 AC3。
   - 斷言新物件不落在 gap 或 tunnel 的禁區。
3. **GREEN**：照「調整選項」的順序逐項加，每加一項就重跑量測，達標就停。
4. **畫面與效能**：更多光圈或一段 boost-tunnel 會多出 draw call。
   - 確認光圈有共用 geometry 和 material，或已經用 instancing。
   - 對十張圖比較 1440×900 Medium 的 Draw Calls、Triangles 和 p50/p95，Low、Medium、High 都要看。
   - CI 的 rendering budget gate 已經很緊（Eight-Car 正因為它而失敗），**不能靠調高 budget 過關**。
5. **音效**：重用現有的光圈與 boost-tunnel 提示音（`src/race-audio-events.ts`），不新增素材。要確認光圈變密後不會連續狂響，必要時對連續拾取做節流，並補上 `tests/race-audio-events.test.js`。
6. **畫質分級**：光圈屬於 3D 場景物件，三個畫質等級都要顯示一樣的光圈；物件數量是玩法的一部分，不能依畫質減少。
7. **What's New**：在 `src/release-notes-data.ts` 最上方加一則 `version: UPCOMING`，中英文並寫，從玩家角度描述，例如「前三張經典地圖的加速光圈更多了，衝刺更順暢」。

## 驗證（全部要附證據才算完成）

- `npm run typecheck`、`npm test`、`npm run build`
- 前三圖的實機 WebGL 截圖：在 1440×900、390×844、844×390 下，光圈清楚可見，而且沒有擋到地標。
- 用真實鍵盤和觸控各跑一場 Coast、Neon、Canyon，確認 BOOST 和 NITRO 的節奏，並確認暫停／重來後不會殘留音效。
- `npm run test:browser`、`npm run test:layout`
- 推送時 commit message 加 `[full-regression]`，CI `quality-gate` 要對最終 HEAD 全綠，包含 rendering budget。
- 不能合進 `develop`：等使用者明確同意後，由負責合併的 session 處理。

## 量測結果

量測工具：`scripts/pickup-economy.mjs`（`node scripts/pickup-economy.mjs` 印出表格），測試在 `tests/pickup-economy.test.js`。

Bot 規則：經典模式、固定 1/60 s 步長；移除車流與對手，只量測賽道配置本身。追下一個光圈（250 m 內，沒有就追 150 m 內的地面道具）。只有從路面拿不到的目標（光圈高於半徑 −1 m、道具高於 1.2 m）才起飛，而且要在 2.5 秒內會到；起飛用燃料遲滯（≥ 35 才起飛、> 5 才繼續）。隧道前 200 m 不飛；斷崖前飛到 3 m。燃料 ≥ 40 開 BOOST、≤ 20 關；一有整格 NITRO 就按。不煞車，所以沒有甩尾與特技獎勵。數字反映的是這套 bot 規則，不是真人玩家。

> 第一版 bot 對每個高於自身 0.5 m 的目標都起飛，在路面上燃料約 20 時會反覆按 FLY（按著 FLY 不會回充），結果失真（例如 Canyon 只拿到 15/24 個光圈）。改成上面的規則後，十張圖的光圈幾乎都拿得到，基準也一起重量；以下全部是最終 bot 的數字。

### 現況 → 調整後

| 地圖 | 完賽 (s) | NITRO 格/分 | BOOST 比例 | 燃料歸零 | 第一次 NITRO (s) | 光圈 拿到/總數 | 地面道具 |
|---|---|---|---|---|---|---|---|
| Coast | 48.3 → 46.4 | 9.93 → **15.52** | 80.3% → **85.6%** | 0 → 0 | 8.4 → 8.4 | 21/22 → 22/22 | 0 → 4 |
| Neon | 41.7 → 38.0 | 3.60 → **15.02** | 72.8% → **100%** | 0 → 0 | 15.0 → **7.8** | 12/14 → 19/19 | 2 → 0 |
| Canyon | 55.8 → 55.9 | 15.06 → 15.30 | 86.6% → 80.1% | 0 → 0 | 11.2 → **6.4** | 23/24 → 23/24 | 16 → 15 |
| Aurora | 52.5 | 11.99 | 75.5% | 0 | 4.8 | 20/20 | 1 |
| Sky Spiral | 52.7 | 12.82 | 86.0% | 0 | 9.0 | 21/22 | 0 |
| Taipei | 57.2 | 16.26 | 91.0% | 0 | 8.9 | 23/24 | 20 |
| Tokyo | 61.8 | 18.43 | 93.6% | 0 | 9.3 | 26/26 | 10 |
| Alpine | 71.5 | 11.54 | 81.1% | 0 | 8.1 | 28/30 | 0 |
| Coastal | 56.1 | 12.04 | 67.1% | 0 | 4.0 | 20/22 | 5 |
| Cosmic | 73.1 | 15.79 | 87.0% | 0 | 12.2 | 30/30 | 7 |

**World Tour 中位數（基準）**：NITRO 15.79 格/分（±15% = 13.42–18.16）、BOOST 87.0%（±15% = 73.95–100%）、第一次 NITRO 8.9 s。其他七張圖的配置沒變，數字與調整前相同。

| AC2 指標 | Coast | Neon | Canyon（使用者決定只看下限） |
|---|---|---|---|
| NITRO 格/分 | ❌ 9.93 → ✅ 15.52 | ❌ 3.60 → ✅ 15.02 | ✅ 15.06 → ✅ 15.30 |
| BOOST 比例 | ✅ 80.3% → ✅ 85.6% | ❌ 72.8% → ✅ 100% | ✅ 86.6% → ✅ 80.1% |
| 第一次 NITRO | ✅ 8.4 → ✅ 8.4 s | ❌ 15.0 → ✅ 7.8 s | ❌ 11.2 → ✅ 6.4 s |

### 使用者決定（2026-11-01）

- 最佳成績與 Ghost：採 (a) pickup layout 版本鍵。
- 選項 1（加速隧道）：跳過，從選項 2 開始。
- Canyon 的 NITRO 只看下限（−15%），不設上限。而且 Canyon 的量已經夠了，**不再增加道具量**，只改善第一次放 NITRO 的時間。

### 採用的調整（`src/race-tracks.ts`）

依計畫順序，每張圖用最少的選項達標：

- **Coast**：選項 2（`ringAltitudes: [8, 3]`，x 維持 2.5）加選項 4（`ringOdds`）。只做選項 2 時 NITRO 是 11.19，還不夠；單獨加密光圈（固定間距 200／180／160 m）也都沒達標。
- **Neon**：選項 3（`ringGap: [150, 220]`）加選項 4。只用選項 3 要壓到 120–180 m 才勉強過（NITRO 13.85，只比下限高 3%，而且光圈多到 24 個），所以改成較鬆的間距加上比例調整。
- **Canyon**：`openingNitroRings: 2`，前兩個光圈從 charge 改成 nitro。光圈數量、位置和亂數序列都不變。原本前三個都是 charge，第一格 NITRO 要等到 950 m 的 risk 光圈。先試過選項 3（`ringGap: [180, 280]`），雖然達標，但光圈從 24 個變成 27 個、NITRO 從 15.06 增加到 16.91，違反「不再增加道具量」，所以撤掉。縮小 charge 比例的做法則會把 Canyon 的補油光圈大量換掉，也不採用。
- 選項 4 的比例：charge 40%、nitro 30%、slipstream 10%、risk 10%、mystery 10%。原本是 35／25／18／12／10。**mystery 維持 10%**：先試過 8% 的版本，結果 Coast 一個 mystery 光圈都沒有，等於讓 Coast 在 Active 道具規則下拿不到任何道具，所以放棄。現在 Coast 有 2 個 mystery，3080 m 那個 shield 跟原本一樣。
- 選項 5（開場 NITRO）沒有用到。

觀察：

1. 選項 1 的前提要修正：`boost-tunnel` 的畫面只存在 World Tour 的場景（`src/world-tour-scene.js`、`src/world-tour-tunnels.js`），經典三圖的場景（`src/world.js`、`coastScenery`、`classicScenery`）沒有。另外 `checkpoint-rush.ts`、`hazards.ts`、`event-lab.ts` 會避開 `boost-tunnel` 區段。在記憶體裡模擬加一段，量測結果完全沒有增加，因為追光圈的車在那一段是飛著的，而領取條件是離地低於 2.5 m。
2. 畫面：光圈 mesh 池固定 7 個，只畫前方 900 m 內的光圈（`src/effects.js`）。Neon 最小間距 150 m，同時最多約 6 個，所以池的大小和 draw call 上限都不變。
3. 因為版面改變而調整的既有測試（斷言都沒有放寬）：
   - `tests/game.test.js`：Coast 光圈位置測試改成新的高低交替規則。甩尾 mini boost 測試清掉光圈，因為 Coast 的路面高度光圈會自己給 mini boost。
   - Canyon 曾試用 `ringGap` 版面，結果在坡道跳躍中間多出一個 slipstream 光圈，加速讓 10 Hz Ghost 落後約 3 cm（`tests/ghost-ramps.test.js` 的容許值是 2 cm）。改回原本的光圈位置後，這個測試不用修改就通過。

## 版本鍵實作計畫（使用者 2026-11-01 決定：(a)，範圍為所有計時紀錄）

前三圖在所有模式下的光圈都變了（光圈在每個模式都有），所以 Classic、Time Trial、Custom、Cup 和挑戰模式的成績與 Ghost 都要分版本。

**做法：版本化的紀錄 ID。** 版本 1 的 ID 不變，所以舊資料的 key 一個位元都不動。

- `TrackConfig.layoutVersion`：Coast、Neon、Canyon 設成 2，其他圖不設（等於 1）。
- 新模組 `src/record-layout.ts`：
  - `layoutVersion(trackId)`
  - `recordTrackId(trackId)`：版本 2 回傳 `coast@2`，版本 1 回傳原本的 `coast`
  - `raceLayout(trackId, config)`：Cup 取 `cupTracks` 裡最大的版本
  - `runLayout(run)`：紀錄裡沒有 `layout` 欄位就是 1
- **Classic 最佳成績**：`BEST_KEY` 與雲端 `bests` 用 `recordTrackId` 當 key。`mergeProgress` 除了原本的 ID，也接受版本化 ID。舊的 `bests.coast` 保留不動。`LEGACY_BEST_KEY` 只在 ID 是 `coast` 時寫入，避免新版成績混進舊 key。
- **Classic Ghost**：`skyline-rush-ghosts` 用 `recordTrackId` 當 key。舊的 Ghost 留在原本的 key，不會被拿來比賽。
- **Classic 歷史**：新的紀錄加 `layout: 2`。雲端 `raceRun` 保留這個欄位，紀錄的識別方式（identity）不變。
- **模式最佳成績與 Ghost**：key 用 `[recordTrackId, config]`。`validModeKey` 接受版本化 ID。模式歷史紀錄加 `layout`；`loadModeBest` 與 `recordModeRace` 只比較同版本的紀錄。
- **History 面板**：舊版紀錄照常列出，加上「Old layout／舊版配置」標籤，但不參與最佳成績和趨勢圖。
- 不改的部分：星數、獎章、解鎖（不是比時間）、每日挑戰（以日期分組）。

**驗收標準：**

1. 新版跑出的成績，不會跟舊版的 `bests.coast`、舊 Ghost 或舊模式紀錄比較。舊版成績再快，新版成績照樣算 NEW RECORD。
2. 舊資料的 localStorage 與雲端內容 bit-for-bit 保留，匯出／匯入、切換帳號和雲端合併都不會刪掉或改寫舊資料。
3. 其他七張圖的紀錄 key 與行為完全不變（有測試鎖住）。
4. History 對舊版紀錄顯示標籤，中英文都有。
5. 每一項都先 RED 再 GREEN，然後跑 `npm test`、`npm run typecheck` 和 `npm run test:browser` 的 history／results 相關 spec。

## 其他地圖與模式（計畫，2026-11-01；尚未實作）

量測用的是最終 bot 的同一套規則（車流、對手移除），一律從 `feature/classic-pickup-density` `146828d7` 用暫存腳本量，**沒有改 repo 裡的程式**。基準一樣是 World Tour 中位數：NITRO 15.79 格/分（下限 13.42）、BOOST 87.0%（73.95–100%）、第一次 NITRO 8.9 s。

### 1. Aurora、Sky Spiral：建議併入第一階段（等使用者同意）

| 地圖 | 現況 NITRO／BOOST／第一次 NITRO | 最小可達標調整 | 調整後 | 光圈數 |
|---|---|---|---|---|
| Aurora | ❌ 11.99／✅ 75.5%／✅ 4.8 s | `ringGap: [180, 280]` + `openingNitroRings: 1` | 16.50／89.5%／6.8 s | 20 → 23 |
| Sky Spiral | ❌ 12.82／✅ 86.0%／❌ 9.0 s | `openingNitroRings: 2` | 14.22／85.8%／6.6 s | 22 → 22（位置不變） |

- Aurora 只靠光圈比例（`ringOdds`）沒有任何組合能過。只改間距也不行，因為光圈重新排列後，第一次 NITRO 會變晚，所以要再加 1 個開場 nitro 光圈。
- Sky Spiral 跟 Canyon 一樣，總量只差一點，主要問題是第一次 NITRO 太晚，所以只轉換開場兩個光圈，不增加數量。
- **為什麼現在做**：版本鍵還沒寫，五張經典圖可以在**同一次遷移**一起升到 `layoutVersion: 2`，玩家只會看到一次「舊版配置」。如果之後再改這兩張，就要做第二次遷移。
- 如果同意：AC3 的雜湊鎖會改成只鎖 World Tour 五張圖，AC2 測試會擴大到五張經典圖，What's New 也一併提到。**實作前要使用者明確同意，恢復工作時再問。**

### 2. 用賽道設定的模式：不另外調整

這九個模式在 Coast、Neon、Canyon、Aurora、Sky Spiral 上產生的光圈和道具，跟同一張圖的 Classic **完全相同**（逐一比對位置與種類）：classic、custom、free、time、gauntlet、checkpoint、cup、stunt、elimination。它們都直接用 `createRings(track)` 和 `createPickups(track)`，所以調整會自動帶進去，不需要另外調。

會改動光圈的是模式選項，不是模式本身。這些是刻意的玩法設計，不列入 AC2：

- `layout: 'mixed'`（gauntlet）：加圈並移除附近光圈。量到 14.22／89.5%／8.4 s，有達標。
- `themes`：加主題圈。
- `bonusGates`（stunt、checkpoint）：除了 mystery，其他光圈都改成獎勵門，所以 NITRO 很少（Coast checkpoint 加 bonusGates 只有 2.68），這是獎勵門本來的設計。
- `itemRules: 'active'`：只留 mystery 光圈，NITRO 是 0，同樣是刻意的。
- `items: false`：沒有地面道具。
- `riskLines: 'off'`：risk 光圈改成 nitro，位置不變。

bot 的限制：Checkpoint 模式的 bot 不會追檢查點，28 s 就超時結束；Elimination 移除對手後不會淘汰，車停在終點直到時間到。所以這兩個模式的每分鐘數字不能拿來比，但光圈和道具配置跟 Classic 相同。

### 3. 有自己產生器的模式：只量測

| 模式 | 產生方式 | NITRO 格/分 | BOOST | 第一次 NITRO | 結論 |
|---|---|---|---|---|---|
| Circuit（`harbor-circuit`，3 圈） | `lapItems(createRings(CIRCUIT_TRACK))` | 13.16（−2%，略低於下限） | 86.9% | **11.7 s（晚 2.8 s）** | 唯一明顯偏低的是第一次 NITRO。可以考慮在 `CIRCUIT_TRACK` 加 `openingNitroRings`，但要先確認 `lapItems` 每圈重複的行為，而且 Circuit 有自己的 `topologyVersion` 與單圈紀錄。**只提案，不調整，要使用者同意。** |
| Endless（Coast／Neon 量 120 s） | `endless-highway.ts` 每個 chunk 固定 3 個光圈 | 20.5／21.25 | 100% | 6.0 s | 高於基準，不調整。 |
| Daily `gold-rings` | 把全部光圈改成 nitro | 22.32（Coast）／24.33（Neon） | 68.4%／90% | 6.2／5.8 s | 這是刻意加碼的每日變化。Coast 的 BOOST 68.4% 偏低，原因是 charge 光圈都被換掉了，屬於這個變化本來的取捨。不調整。 |
| Event Lab | 玩家自己編的關卡（`compileCourse`），光圈固定是 nitro | — | — | — | 配置由玩家決定，沒辦法一般化量測。不調整。 |

建議下一步（也要使用者同意）：把 `measureEconomy` 加上 `options` 與時間上限參數（暫存腳本已經驗證可行，大約只要改三行），讓以上數字由測試記錄，而不是只寫在文件裡。

### 4. World Tour：不調整（明確的非目標）

Alpine 的 NITRO（11.54）和 Coastal 的 BOOST（67.1%）都低於中位數。但 World Tour 五張圖本身就是基準：中位數的定義就是一半在上、一半在下。調整它們會讓基準跟著動，而且 AC3 要求這五張圖 bit-for-bit 不變，所以不調整。

### 使用者決定（2026-11-01，第二輪）

1. **Aurora、Sky Spiral 併入第一階段**：Aurora 用 `ringGap: [180, 280]` + `openingNitroRings: 1`，Sky Spiral 用 `openingNitroRings: 2`。五張經典圖一起升到 `layoutVersion: 2`，做同一次遷移。AC2 測試擴大到五張圖，AC3 的雜湊鎖改成只鎖 World Tour 五張圖。
2. **Circuit 一起改**：`CIRCUIT_TRACK` 加開場 nitro 光圈，目標是第一次 NITRO ≤ 8.9 s，NITRO 不低於下限。實作前要先確認：
   - `lapItems` 是每圈重複，還是只有第一圈有開場光圈？
   - Circuit 的總時間最佳成績、Ghost 和單圈最佳（`loadCircuitLapBest`）也要納入版本鍵。
   - 現有的 `topologyVersion: 1` 是賽道結構版本，不能拿來當光圈版本。
3. **擴充量測 bot**：`measureEconomy(trackId, options, cap)`，並由測試記錄各模式的數字。

實作順序（恢復工作後）：

1. 合併 `develop`。
2. bot 擴充（RED → GREEN）。
3. Aurora／Sky Spiral／Circuit 調整（RED → GREEN）。
4. 版本鍵，涵蓋五張經典圖與 Circuit。
5. 音效、What's New、畫面與實機驗證、完整 CI。
