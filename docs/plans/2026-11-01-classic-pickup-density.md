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

（待 AC1 完成後填入：各圖的「現況 → 調整後」表格。）
