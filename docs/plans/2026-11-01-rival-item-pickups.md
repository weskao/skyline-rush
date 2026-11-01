# 階段二：對手也能吃道具

- 日期：2026-11-01 規劃；2026-11-02 使用者回答問題並說「開工」。
- 狀態：**實作中**（`feature/rival-item-pickups`，已 merge `develop` `435e4fb8` → `f18cb226`）。進度記在 `TODO.md`「Rival item pickups — stage 2」。
- 階段一（`feature/classic-pickup-density`）已在 `develop`（`fb86b923`）。

## 目標

讓對手也能拿光圈和地面道具，提高對手的威脅感和比賽的刺激性，**但玩家拿到的不能變少**。同時在每個模式、十張圖上增加光圈和道具，補回被對手吃掉的量。

## 使用者決定（2026-11-02）

1. **重生，不做每台車各一份。** 被任何一台車（含玩家）吃掉的光圈或道具會消失，`ITEM_RESPAWN = 2.5` 秒後重生。
2. **對手 NITRO 次數（AC2）：** 以 7 台對手**合計**每場放 NITRO 的次數計算，Normal 比現況多 2 次以上，Hard 多 4 次以上。Hard 的追趕機制（`RUBBER_BAND_MAX = 0.04`）要不要調低，由量測決定。
3. **Easy：** 對手只吃極少量，不是完全不吃。AC3 改成可量測、可重現的上限。
4. **不新增選項或模式：** 沿用現有的 `difficulty`。Classic、Cup、Elimination、Circuit 固定為 Normal，Easy／Hard 只在 Custom race 出現（`normalizeRaceConfig`）。
5. **範圍：** 十張圖、每個模式都增加光圈和道具；每個有對手的模式，對手都會吃（含 World Tour 賽道）。階段一的 AC3 hash 鎖（World Tour + Aurora）和模式配置鎖刻意解除：換成新 hash，旁邊註明是使用者的決定，不刪除。
6. **新的光圈排法：**
   - **整排光圈：** 同一個距離，每條車道各一個。整排只算一個 gate，吃到任何一個就算通過；PERFECT LINE 仍然要靠操作，不會自動達成。
   - **密集光圈列：** 一小段距離內連續放幾個間距很近的光圈。每一列自成一個 group，每個光圈各算一個 gate；要全部拿到才有 PERFECT LINE。
   - 整排和密集列裡都不放 risk 光圈。它們只是光圈，不做會自動加速的 boost tunnel（使用者在階段一否決過）。
   - 對手也可以吃整排或密集列裡的光圈，同樣 2.5 秒後重生。
7. **不做：** 自帶賽道的模式（Endless、Event Lab）；卡丁車式的攻擊道具。

## 盤點（模式 × 賽道）

| 範圍 | 項目 | 數量 |
| --- | --- | --- |
| 賽道（光圈＋道具配置） | coast, neon, canyon, aurora, spiral, taipei, tokyo, alpine, coastal, cosmic + harbor-circuit | 11 |
| 沿用賽道配置的模式 | classic, custom, free, time, gauntlet, checkpoint, cup, stunt, elimination, circuit, daily（classic + modifier） | 11 |
| 有對手、對手會吃道具的模式 | classic（7、Normal）, cup（7、Normal）, elimination（7、Normal）, circuit（7、Normal）, custom（0–7、Easy／Normal／Hard） | 5 |
| 不動 | endless, eventlab（自帶賽道） | 2 |
| 計時紀錄版本鍵 | 十張圖 + harbor-circuit 的 `layoutVersion` 各升一版（2 → 3 或 1 → 2）；Firestore rules 要接受新的鍵 | 11 |

## 驗收標準

- **AC1（每個模式）：** `scripts/pickup-economy.mjs` 用凍結的階段一數字當基準（`scripts/pickup-economy-stage1.json`，在 `f18cb226` 量測）。每個模式 × 賽道（Custom 再乘上 Easy／Normal／Hard），在有 7 台對手、無交通車的情況下，玩家每分鐘 NITRO 和 BOOST 開啟比例都 **≥ 階段一的 95%**。
- **AC2：** 有對手的模式，7 台對手合計每場放 NITRO 的次數，十張圖平均 Normal ≥ 現況 + 2、Hard（Custom）≥ 現況 + 4。用 deterministic 量測鎖住。
- **AC3：** Easy（Custom）時，每台對手每場最多吃 `EASY_RIVAL_TAKES` 個道具，用 deterministic 測試鎖上限；玩家拿取量仍在 AC1 內。
- **AC4：** 所有受影響模式的計時紀錄升一版（`record-layout.ts`），舊紀錄標示「舊版配置」。`firestore.rules` 和 `tests/record-layout.test.js` 接受新的鍵。**部署 rules 需要使用者在 release 前另外核准。**
- **AC5：** 重生的光圈和道具都用共用的 geometry／material，光圈和道具改用 instancing。十張圖的 draw call 不增加，CI budget 不調高，新的 shader 組合都會 warm up。整排、密集列要量 Low／Medium／High 的三角形數和 p50／p95。

## 分片（每片 RED → GREEN）

| 片 | 內容 |
| --- | --- |
| R1 | 經濟 bot：`measureEconomy(..., { rivals: true })` 保留 7 台對手；量 模式 × 賽道 × 難度；凍結階段一基準 JSON；回報對手 NITRO 次數。沒有行為改變。 |
| R2 | 搬移（move-only）：對手 NITRO 時機邏輯從 `game.js` 搬到 `src/rival-items.ts`。 |
| R3 | 共用重生：光圈和道具加上 `downUntil`；任何車吃掉都消失 2.5 秒；玩家自己的 `hit`／`taken` 不變。 |
| R4 | 對手吃道具：nitro 光圈、risk 光圈、cell／can／tank（不吃 overcharge）→ 對手累積 NITRO（上限 `NITRO_MAX`）；放 NITRO 改用已放次數排程。Easy 上限、Normal 只吃路線上的。 |
| R5 | Hard 主動換車道：`avoidObstacles` 優先用 `seekX`，仍然遵守所有障礙物和車輛的 blocker。 |
| R6 | 新排法：`ringRows`、`ringTrains`，每條賽道的 `pickupGap`；PERFECT LINE 分組測試。 |
| R7 | 平衡：調整十張圖的密度，讓 AC1／AC2 通過；量測後決定 Hard 的追趕機制。更新 AC3 鎖並註明決定。 |
| R8 | AC4 版本鍵 + rules／同步測試。 |
| R9 | 渲染：光圈和道具改用 instancing，對手吃到或放 NITRO 時有視覺提示（節流）；音效用較小音量；量 draw call。 |
| R10 | What's New（UPCOMING，en + zh-TW）→ `/review-release-notes`。 |
| R11 | 測試關卡：`npm test`、typecheck、build、browser specs，用 `[full-regression]` push，最後的 HEAD 要有綠色的 `quality-gate`。 |

## 量測結果

（每片完成後補上：每個模式 × 賽道的前 → 後對照表。）
