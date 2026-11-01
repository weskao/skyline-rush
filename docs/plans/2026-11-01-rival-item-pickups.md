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

量測時間：2026-11-02。經濟 bot 會像玩家一樣閃車（使用者選擇），7 台對手、無交通車。階段一基準是 `scripts/pickup-economy-stage1.json`。

| AC | 結果 | 鎖住的測試 |
| --- | --- | --- |
| AC1 玩家拿取量 ≥ 階段一 95% | 每個模式 × 賽道 × 難度：NITRO 最低 111%（custom/hard），BOOST 最低 100% | `tests/rival-economy.test.js` |
| AC2 對手 NITRO／場（7 台合計） | Normal +2.4、Hard +4.0、Circuit +2.0；Elimination +1.7（使用者接受例外，測試門檻 1.5） | `tests/rival-economy.test.js` |
| AC3 Easy 上限 | 每台對手每場最多 `EASY_RIVAL_TAKES` = 2 個；對手 NITRO +0.9／場 | `tests/rival-items.test.js` |
| AC4 版本鍵 | coast／neon／canyon／spiral／harbor-circuit → 3，aurora 與五張 World Tour → 2；舊鍵顯示「舊版配置」；rules 接受新鍵（10 stars + 24 bests + 4 medals 在 1000 運算式內） | `tests/record-layout.test.js`、`tests/firestore-rules.test.js` |
| AC5 draw call | 見下方 WebGL 表 | `tests/marker-pool.test.js`、`tests/effects.test.js` |
| 追趕機制 | Hard 的 `RUBBER_BAND_MAX` 維持 0.04：一般玩家在 Hard 的名次 3.7 → 3.7，對手只近約 20 m | — |

### 經濟：每個模式／難度的最低值（十張圖）

| 模式/難度 | 玩家 NITRO 最低（相對階段一） | 玩家 BOOST 最低 | 對手 NITRO/場 平均 前 → 後 |
|---|---|---|---|
| classic/normal | 118% | 100% | 12.0 → 14.4 (+2.4) |
| free/normal | 119% | 100% | — |
| time/normal | 119% | 100% | — |
| gauntlet/normal | 118% | 100% | — |
| checkpoint/normal | 134% | 100% | — |
| cup/normal | 118% | 100% | 12.0 → 14.4 (+2.4) |
| stunt/normal | 119% | 100% | — |
| elimination/normal | 992%（階段一基準近乎 0） | 145% | 11.0 → 12.7 (+1.7) |
| custom/easy | 118% | 100% | 12.0 → 12.9 (+0.9) |
| custom/normal | 118% | 100% | 12.0 → 14.4 (+2.4) |
| custom/hard | 111% | 100% | 12.5 → 16.5 (+4.0) |
| circuit/normal | 169% | 122% | 12.0 → 14.0 (+2.0) |

每條賽道的明細由 `node scripts/pickup-economy.mjs` 重跑；數字由上面兩個測試鎖住。

### WebGL（AC5）

本機 Chrome（Metal WebGL）1440×900，按住油門開 9.5 秒，每 500 ms 取樣 draw call／三角形的平均值（括號是最大值）。develop 對照組是 merge 前的 develop build。這是本機量測，不是實機效能基準。

| 賽道 | 畫質 | Draw calls 前 → 後 | 三角形 前 → 後 | p50 ms | p95 ms | FPS | 錯誤 |
|---|---|---|---|---|---|---|---|
| coast | low | 445.8 (463) → 439.9 (456) **-5.9** | 87751 → 91888 (+5%) | 16.7 → 16.7 | 16.7 → 16.7 | 60 → 59.9 | 0/0 |
| neon | low | 508.4 (537) → 495.2 (523) **-13.2** | 84230 → 96137 (+14%) | 16.7 → 16.7 | 16.7 → 16.8 | 60 → 60 | 0/0 |
| canyon | low | 452.2 (472) → 442.2 (458) **-10** | 45691 → 50411 (+10%) | 16.7 → 16.7 | 16.7 → 16.7 | 59.9 → 60 | 0/0 |
| aurora | low | 450.7 (466) → 443.4 (460) **-7.3** | 45987 → 53990 (+17%) | 16.7 → 16.7 | 16.8 → 16.8 | 59.9 → 60 | 0/0 |
| spiral | low | 253.5 (273) → 249.6 (267) **-3.9** | 44079 → 47015 (+7%) | 16.7 → 16.7 | 16.7 → 16.7 | 60 → 60 | 0/0 |
| taipei | low | 525.9 (548) → 513.7 (537) **-12.2** | 46288 → 51710 (+12%) | 16.7 → 16.7 | 16.7 → 16.7 | 59.9 → 59.9 | 0/0 |
| tokyo | low | 439.2 (474) → 441.5 (476) **+2.3** | 39905 → 50208 (+26%) | 16.7 → 16.7 | 16.7 → 16.8 | 60 → 60 | 0/0 |
| alpine | low | 300 (348) → 291.7 (341) **-8.3** | 38963 → 44058 (+13%) | 16.7 → 16.7 | 16.8 → 16.7 | 59.9 → 59.9 | 0/0 |
| coastal | low | 353.1 (367) → 345.9 (358) **-7.2** | 38223 → 45502 (+19%) | 16.7 → 16.7 | 16.8 → 16.7 | 59.9 → 59.9 | 0/0 |
| cosmic | low | 294.6 (315) → 287 (304) **-7.6** | 37398 → 42982 (+15%) | 16.7 → 16.7 | 16.8 → 16.7 | 60 → 59.9 | 0/0 |
| coast | medium | 458.7 (476) → 452.9 (469) **-5.8** | 88429 → 92501 (+5%) | 16.7 → 16.7 | 16.7 → 16.8 | 60 → 59.9 | 0/0 |
| neon | medium | 521.5 (550) → 508 (536) **-13.5** | 84652 → 96501 (+14%) | 16.7 → 16.7 | 16.7 → 16.8 | 60 → 59.9 | 0/0 |
| canyon | medium | 465.4 (485) → 455.1 (471) **-10.3** | 46500 → 51195 (+10%) | 16.7 → 16.7 | 16.7 → 16.7 | 59.9 → 60 | 0/0 |
| aurora | medium | 463.7 (479) → 456.4 (473) **-7.3** | 46671 → 54705 (+17%) | 16.7 → 16.7 | 16.7 → 16.8 | 60 → 59.9 | 0/0 |
| spiral | medium | 268.7 (287) → 264.7 (282) **-4** | 46114 → 49106 (+6%) | 16.7 → 16.7 | 16.7 → 16.7 | 59.9 → 59.9 | 0/0 |
| taipei | medium | 620.3 (647) → 607.9 (633) **-12.4** | 58240 → 63665 (+9%) | 16.7 → 16.7 | 16.8 → 16.8 | 60 → 60 | 0/0 |
| tokyo | medium | 514.1 (551) → 515.6 (552) **+1.5** | 46122 → 56400 (+22%) | 16.7 → 16.7 | 16.7 → 16.7 | 60 → 59.9 | 0/0 |
| alpine | medium | 353.4 (424) → 345.1 (421) **-8.3** | 44472 → 49510 (+11%) | 16.7 → 16.7 | 16.8 → 16.8 | 60 → 60 | 0/0 |
| coastal | medium | 425.6 (446) → 418.4 (435) **-7.2** | 45026 → 52278 (+16%) | 16.7 → 16.7 | 16.7 → 16.7 | 59.9 → 60 | 0/0 |
| cosmic | medium | 360.6 (373) → 352.4 (362) **-8.2** | 44067 → 49625 (+13%) | 16.7 → 16.7 | 16.7 → 16.7 | 59.9 → 60 | 0/0 |
| coast | high | 458.9 (476) → 452.9 (469) **-6** | 89152 → 93303 (+5%) | 16.7 → 16.7 | 16.7 → 16.8 | 60 → 59.9 | 0/0 |
| neon | high | 521.6 (550) → 508.2 (536) **-13.4** | 85052 → 96914 (+14%) | 16.7 → 16.7 | 16.8 → 16.7 | 59.9 → 59.9 | 0/0 |
| canyon | high | 465.3 (485) → 455.2 (471) **-10.1** | 47034 → 51775 (+10%) | 16.7 → 16.7 | 16.7 → 16.7 | 59.9 → 59.9 | 0/0 |
| aurora | high | 463.7 (479) → 456 (473) **-7.7** | 47160 → 55089 (+17%) | 16.7 → 16.7 | 16.7 → 16.8 | 59.9 → 59.9 | 0/0 |
| spiral | high | 292.3 (310) → 288.4 (306) **-3.9** | 48525 → 51470 (+6%) | 16.7 → 16.7 | 16.7 → 16.7 | 60 → 59.9 | 0/0 |
| taipei | high | 650.2 (679) → 638.1 (665) **-12.1** | 73312 → 78802 (+7%) | 16.7 → 16.7 | 16.7 → 16.7 | 59.9 → 59.9 | 0/0 |
| tokyo | high | 536.7 (570) → 539.9 (571) **+3.2** | 51724 → 61992 (+20%) | 16.7 → 16.7 | 16.8 → 16.7 | 60 → 60 | 0/0 |
| alpine | high | 364.8 (463) → 357.2 (452) **-7.6** | 49764 → 54928 (+10%) | 16.7 → 16.7 | 16.7 → 16.8 | 60 → 60 | 0/0 |
| coastal | high | 447.6 (468) → 440.7 (461) **-6.9** | 52107 → 59384 (+14%) | 16.7 → 16.7 | 16.7 → 16.8 | 60 → 60 | 0/0 |
| cosmic | high | 381.3 (405) → 374.1 (394) **-7.2** | 51083 → 56615 (+11%) | 16.7 → 16.7 | 16.7 → 16.8 | 59.9 → 59.9 | 0/0 |

Draw call 平均值上升的組合：3 / 30。

上升的 3 組都是 Tokyo（+1.5～+3.2）。逐一計算 WebGL draw（Tokyo Low，9.5 秒）：光圈和道具每格 9.09 → 6.59 次，反而減少；增加的是對手車身（每格 index 120／192 的 draw 各 +1.8），因為對手會吃道具、放 NITRO，更常出現在玩家畫面裡。這是對手跑得更近造成的，不是光圈和道具的渲染成本。三角形增加同理（對手車、加倍的光圈）。p50／p95 在 60 Hz 下沒有變化。
