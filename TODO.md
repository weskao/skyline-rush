# TODO — Gameplay depth design

## Audio preference moves from cookies to localStorage; Chrome first-visit autoplay (2026-10-25)

- [x] Repro in real Chrome with its default autoplay policy (Playwright strips `--autoplay-policy=no-user-gesture-required`; scratch script, 4 runs): `AudioContext` stays `suspended` on load as Chrome requires, and the first click or key resumes it (`running`, audible RMS > 0.01). Autoplay without a gesture cannot be fixed client-side; the existing first-gesture unlock (`unlockAudio`, `src/main.js`) is the fix and is kept.
- [x] Preference storage: `src/audio-settings.js` `readAudio(localStorage)` reads `skyline-rush-music` / `skyline-rush-sound` (`on`/`off`) and `-volume` percent; `setAudio` in `src/main.js` writes them. Nothing stored → on at 100%, stored as `on` on the first `unlockAudio`. Cookie writes and the `skyline-rush-audio-v=2` legacy marker are gone.
- [x] RED: `tests/audio-settings.test.js` rewritten against a storage object failed on the old module (`AUDIO_KEYS` missing). GREEN: `npm test` 533 pass; `npm run build` ok; `npx playwright test tests/browser.spec.js -g "music|audio|volume|sound"` 13/13 (off choice + volume survive reload from localStorage, saved off stays silent after the gesture, fresh visit stores both channels `on`).
- [ ] Full `make verify` and CI `quality-gate` on the committing HEAD; a human check in desktop Chrome/Safari/Firefox and on a phone that the first tap starts the intro music.
- [ ] Known loss: a music/sound-off saved in the old cookie is not migrated; those players hear audio once more and have to mute again.

## CI regression: trackpad momentum must select one course per swipe (2026-10-24)

- [x] Inspect failed CI run 40102405872: only browser-tests shard 6 failed; the existing Playwright RED shows expected `neon` but actual `alpine` during one prolonged wheel gesture. The aggregate quality-gate correctly failed because the browser shard was red.
- [x] Trace `src/main.js` wheel gesture lifecycle: under CPU-heavy WebGL event gaps can exceed the 160 ms inactivity timer, rearming the same swipe and advancing several tracks.
- [x] Add a dedicated browser regression simulating momentum event intervals beyond 160 ms in `tests/track-swipe-browser.spec.js`, committed before the fix.
- [x] ~~Apply the minimal shared fix: increase the wheel gesture idle window to 320 ms~~ — replaced. Any CI delivery hiccup over 320 ms still split a swipe, and users would have to pause 320 ms between swipes.
- [x] Root cause, measured: wheel events were stamped 16 ms apart (`event.timeStamp`), but Playwright/CDP delivered some 168–203 ms apart while frame times stayed under 50 ms. The 160 ms wall-clock timer read late delivery as a pause, and also reset unfinished drags. Fix in `src/main.js`: the gesture pause is timed on `event.timeStamp` (`WHEEL_END_MS` back to 160 ms), and the timer only springs an unfinished drag back.
- [x] Deterministic RED/GREEN: both trackpad tests send CDP wheel events stamped 16 ms apart (`trackpadSwipe`): one delivers a single event 300 ms late, the other delivers every event 210 ms apart. On the original timer code: 3/3 RED (expected `neon`, got `canyon`/`aurora`). After the fix: the whole `tests/track-swipe-browser.spec.js` passes 30/30 local runs (6 repeats).
- [x] CI run 40110604502 on `1fd4178` failed only on "a nudge springs back": the Linux runner scaled native CDP wheel deltas, so a 40 px nudge passed the 96 px swipe distance (macOS does not scale). `trackpadSwipe` now dispatches a `WheelEvent` with a pinned CSS-pixel delta and a pinned `timeStamp`. On the original timer code: 6/6 RED (got `canyon`/`coast`). On the fix: 20/20 GREEN locally.
- [x] Obtain GREEN evidence on the final commit, including both trackpad tests and all CI shards, then mark the confirmed tests complete. Done: run 40113913209 on `ab150f3` passed all eight browser shards, unit, cloud-save, World Tour and `quality-gate`. The earlier RED was observed on the original test in the cited CI run; the new focused test was committed test-first but its isolated RED has not been separately observed.
- [ ] Confirm real Mac trackpad gestures, momentum separation and touch/mouse swipes remain natural before calling this a fully device-verified fix.

## Regression-first workflow adoption (2026-10-24)

- [x] Define one reusable six-gate development protocol in `docs/regression-first-workflow.md`: root-cause analysis, observed TDD RED, GREEN, cross-track/input matrix, local and manual WebGL checks, exact-commit CI before user-authorized merge.
- [x] Reference the protocol from `CLAUDE.md` and `AGENTS.md`, alongside the existing file-scoped physics/UI regression rules.
- [x] Provide `make verify` to run unit tests, production build via `pretest:browser`, all standard Playwright tests and the separate World Tour fixture suite.
- [x] Add GitHub CI `quality-gate` that fails unless unit/browser/cloud/World Tour jobs all succeed; block manual feature-branch deployments and make deploy consider World Tour results.
- [x] Run CI on future `feature/**` pushes while keeping the explicitly disabled `feature/mode00-objective-contract` branch excluded.
- [x] Confirm the complete `quality-gate` succeeds at the **final** feature HEAD; test infrastructure changes are not accepted based on an older SHA.
  - Green: run 40113913209 on `ab150f3`, the last code commit. Later commits that only touch `TODO.md` add no code to gate.
  - `ddbeb3a` (run 40102405872) failed: the trackpad-swipe test above failed in shard 6; `main` `d2b35e5` fails CI on the same test. The fix is in the section above, and the gate is re-checked on the commit that carries it.
  - `1fd4178` (run 40110604502, main merged in) failed only on the CDP delta scaling recorded above.
- [ ] Complete real-game visual/interaction evidence for Sky Spiral road clipping and Tokyo finish controls on affected devices (automation alone cannot certify these).
  - Done at `ddbeb3a` (headless Chromium, real WebGL, 1440×900 and 390×844 touch): Sky Spiral approach, helix entry, both quarter turns, left/right rail, helix exit and first ramp at ~305 km/h show the car seated on the banked road with no clipping, and 0 page errors. Tokyo finish after 2 real collisions: camera, language switch to zh-TW, Next and Race Again all respond to real clicks (`tests/tokyo-finish-controls-browser.spec.js`, 4/4).
  - Still open: a human playthrough on a physical iPhone/Android (touch hardware, Safari WebGL) and on desktop Safari/Firefox.
- [ ] Before user-approved merge, integrate latest `main`, resolve any conflicts, repeat exact-commit CI and assess manual evidence; do not claim merge readiness while behind or unchecked.
  - `main` (`d2b35e5`) is fully merged, with 0 commits behind and no conflicts. Still waiting on a green gate at the final HEAD, the physical-device check above and the user's merge approval.
- [x] Consider configuring GitHub branch protection/ruleset to require `quality-gate` on `main` if repository administration permissions become available; documentation/CI do not by themselves prevent direct pushes.
  - Ruleset `main requires quality-gate` (id 25785253, active, 2026-10-24) on the default branch. Repository admins can bypass it so the local-merge and `/release` flow keeps working; every other push or PR to `main` needs a green `quality-gate`.


## Sky Spiral & cross-track cornering stability (2026-10-24)

- [x] Identify shared renderer issue: local road orientation was converted back into Euler angles, overwriting road pitch/banking in curved and elevated sections.
- [x] Compose steering lean, airborne pitch, drift and trick roll as local quaternion offsets, keeping the canonical road frame on Sky Spiral and all five World Tour tracks.
- [x] Prevent repeated rail crashes while steering continuously into the same road edge; re-arm only after pulling away; preserve first-contact collision and existing scrape behavior.
- [x] Add pose-continuity, road-alignment and repeated-rail-contact regression test sources covering all routes.
- [x] Run full `npm test` through GitHub Actions on feature commit `b4134c0` (unit-tests: success). Previous run exposed a braking regression, fixed by preventing drifting while pressed against the contacted rail.
- [ ] Independently capture the initial RED for each newly introduced focused regression test; the full green unit run alone does not prove TDD test-first execution.
- [ ] Run `npm run build`, desktop/mobile Playwright, and full GitHub CI on this feature branch.
- [ ] Manually verify actual driving at Sky Spiral's helix entry, both quarter turns, exit, rails, elevations, ramps, and every other track; capture before/after gameplay screenshots or recordings.
- [ ] Independently verify vehicle-to-road mesh clearance at high speeds and road edges with real WebGL rendering.

## Tokyo finished-race UI controls (2026-10-24)

- [x] Merge latest `main` into `feature/sky-spiral-cornering-stability` using a true two-parent merge commit (`baa46ec`), retaining upstream game mode fixes and the feature changes.
- [x] Fix a concrete click-interception risk: `.aero-tools` (language and VFX) was at the same stacking level as the later `.race-overlay`; lift it above the results overlay without removing either control.
- [x] Add desktop and touch Playwright coverage for Tokyo: multiple actual simulation collisions, finish, camera click, language switch, Next, Race Again and page errors (`tests/tokyo-finish-controls-browser.spec.js`).
- [x] Document UI layer/input invariants for future changes in `CLAUDE.md` and `.claude/rules/ui-phase-interactions.md`; document car pose and rail rules in `.claude/rules/vehicle-road-stability.md`.
- [ ] Confirm actual Playwright results and pointer hit targets (desktop and mobile), plus real device/browser reproduction and before/after images. Script committed does not mean browser behavior passed.
- [ ] Confirm all CI jobs are green at the final tested commit and report exact run URL; separate `playwright.world-tour.config.js` testing must also finish.

## 每日挑戰：禁止飛行 UI / UX 修正（2026-10-25）

- [x] 「禁止飛行」時 FLY 控制停用、清除 Toggle；鍵盤與觸控不得啟動起飛。
- [x] FLY 顯示降彩度及鎖頭，HUD 改為禁止飛行與能源用途提示；中英文與 ARIA 同步。
- [ ] 實機 iOS Safari 與 Android Chrome 手動確認禁用控制及輔助工具朗讀。

## 每日挑戰獎勵規劃（未納入本次實作）

保留目前每日獨立排行榜／最快成績及既有獎章規則。本階段僅記錄需求；獎勵數據結構、雲端同步及解鎖規則尚未設計或實作。

- [ ] 首次完成當日挑戰的獎勵：明確界定完賽、首次領取及每日重玩不重複發放，顯示領取狀態。
- [ ] 三種挑戰（禁止飛行／雙倍車流／僅限金環）的專屬成就：設定條件、進度與中英文敘述。
- [ ] 連續完成天數與獎勵：以本地日界或伺服器日界制定一致規則，處理跨時區、補登及中斷。
- [ ] 每日挑戰限定車漆：設計達成門檻、展示／裝備流程；不影響車輛能力及既有星數解鎖。
- [ ] 獎勵上線前補 TDD：本機防重領、Firestore 免費額度評估、跨裝置合併、離線重試及手機／桌面領獎驗收。

## UX-Release-01 — 玩家可讀的新版本公告（What's New，2026-10-24）

規格：[docs/release-announcements.md](docs/release-announcements.md)。開發於 `feature/whats-new-release-announcements`，從 `main` 建立。僅對已正式發布的新版本公告已確認的玩家體驗，不展示開發技術詞彙。

- [x] **TDD 狀態契約：**可發布公告判斷、每版本已讀、Local Storage 受阻與相容既有更新重載機制，先 RED 後 GREEN。
- [x] **玩家公告資料：**已建立版本、日期、English／繁中玩家導向文字及可選圖片（無圖完整顯示）；Node 測試與正式建置已在 [Actions #40097497428](https://github.com/weskao/skyline-rush/actions/runs/40097497428) 對應提交成功，仍待最新 UI browser 驗收。
- [ ] **桌面／手機公告 UI：**原生 dialog、版本與更新卡、圖片缺失降級、44px 控制、手機安全區、無障礙與減少動畫。
- [ ] **觸發及互動：**僅首頁安全狀態首度顯示、關閉存已讀、Escape 與按鈕、首頁版本號可重新開啟，其他 dialog／教學／賽事不打斷。
- [x] **公告文案英文規則：**`CLAUDE.md` 已規定所有公告從玩家角度描述新體驗，避免工程專業術語，且英／繁中同步更新；已重新讀取確認。
- [x] **雙語與可維護性：**介面及更新內容支援 en / zh-TW、開啟時跟隨全站語言選單即時切換；CLAUDE.md 英文規則要求玩家導向文案；無新套件或後端。
- [ ] **自動化測試與 CI：**改版後重新驗證：`npm test`、`npm run build`、`npm run test:browser`、`npm run test:layout` 全數通過；推送後的 CI 狀態另行確認。（2026-10-25：`npm test` 534/534、build 通過、`test:layout` 29＋42 通過；`test:browser` 修正封鎖儲存空間時自動彈出的問題後仍有 i18n 手機每日挑戰路線文字被截斷（183>160px），`origin/main` 同樣失敗，非本分支造成，待修）
- [x] **真實畫面佐證：**改版後的桌面 1440×900（English）與手機 390×844（繁體中文）公告畫面已擷取、標註並傳送 Telegram（2026-10-25）。
- [x] **移除完整更新紀錄：**公告內不再出現「完整更新紀錄 / All changes」連結，相關文字鍵與樣式一併移除；瀏覽器測試確認對話框內沒有外部連結。
- [x] **最近五版切換：**以版本分頁顯示最新 3–5 個已發布版本（最多 5 個、不顯示尚未發布的版本），可點擊或用 ←/→、Home、End 切換，切換語言保留所選版本，重新開啟回到最新版。
- [x] **自動顯示與已讀紀錄：**localStorage 記錄玩家看過的最新版本；有更新版本時自動顯示，一顯示就更新紀錄並清除提示點；新玩家不顯示舊消息但會記錄目前版本。
- [x] **發版前更新公告：**`CLAUDE.md` 與規格要求每次發版前先寫好該版公告（圖片可選，存於 `public/whats-new/<version>/`，歷史內容與圖片保留在 repo）；`scripts/release-gate.sh` 透過 `scripts/check-release-notes.mjs` 擋下缺少公告的版本。
- [x] **介面美化：**版本分頁、更新類型標籤、主視覺、置底的「繼續遊戲」按鈕與進場動畫（減少動畫時停用），桌面與手機四種尺寸皆不溢出。（2026-10-25：公告瀏覽器測試四種尺寸通過、`test:layout` 29＋42 通過，桌面／手機截圖已人工確認）
- [ ] **實體裝置驗收：**iOS Safari／Android Chrome 觸控、短橫向、字體放大、返回首頁等（無真機則保留未完成）。


## 最高優先：儲存與跨裝置還原（2026-10-23）

原則：需要在清除瀏覽器資料後還原的遊戲成果，以 Google 登入後的 Firestore 帳號資料為主、本機資料為離線副本；裝置操作偏好留在本機。Firestore 單一使用者文件採版本化格式，僅在登入、完成比賽及成果改變時同步，不按影格寫入。勾選只代表該項已實作並完成對應驗證。

執行順序：先針對每個雲端欄位與跨裝置情境寫會失敗的單元／規則／瀏覽器測試，再寫最小實作，最後跑單元、Firestore 模擬器、正式建置與相關瀏覽器測試。共用 `history.js` 既有讀寫與驗證邏輯；合併規則集中一處，不複製每個模式的儲存流程。每項通過對應驗證後才改為 `[x]`。

### 雲端基礎與資料安全

- [x] 建立獨立 Firebase 專案、台灣區 Firestore Standard、Google 登入與 GitHub Pages 授權網域；部署僅本人可讀寫的規則。
- [x] 查詢專案帳務設定，確認 `billingEnabled=false` 且未綁定付費帳戶；資料量與讀寫次數仍須遵守 Spark 免費額度。
- [x] History 提供登入／登出、成功／待同步／失敗狀態；離線或雲端失敗時不阻止遊戲使用本機進度。
- [x] 首頁提供容易發現的雲端儲存入口，開啟時直接帶到 Google 登入與同步狀態；驗證手機與桌面版面。
- [x] `skyline-rush-unlocked` 已解鎖賽道：首次登入合併本機與雲端集合，完成 Classic 解鎖後同步；禁止未知賽道進入儲存資料。
- [ ] 已發布網站實測「解鎖 → 儲存 → 清除 Cookie／Local Storage → 用同一 Google 帳號登入 → 還原」，另測不同裝置與手機 Safari 登入。
- [ ] 在完成本地與模擬器驗證後，依專案發佈規則把新版網站上線；部署後再執行上述真實帳號驗收。
- [x] 帳號切換時隔離不同玩家的本機副本，避免共用裝置將甲的進度自動上傳到乙的帳號；提供可理解的安全切換路徑。（Firebase Auth／Firestore 模擬器驗證）
- [x] 網路恢復後自動重試未同步成果；提供「上次成功同步時間／待同步」狀態，避免把本機成功誤認為雲端成功。（離線回線與跨瀏覽器還原模擬器驗證）
- [x] 提供本人刪除雲端進度與匯出資料的操作；驗證登出、刪除與重新登入的結果。（模擬器通過；正式站需先發布新版規則與程式）
- [x] 限制進度文件大小，並區分額度耗盡、服務不可用與本機寫入失敗；只有確認本機寫入成功才顯示「成果已留在本裝置」。（單元與模擬器瀏覽器測試）
- [ ] 發布後查看 Spark Usage 儀表板的實際儲存量及每日讀／寫量，並在正式站驗收服務故障提示；操作步驟見 `docs/cloud-save.md`。
- [x] 明確區分 Firebase 登入狀態與資料同步狀態；清除 Cookie、Local Storage 或 IndexedDB 後需重新登入，但不能把未同步資料誤標為已備份。（全新瀏覽器資料模擬器驗證）

### 要同步的遊戲成果（同一份版本化帳號進度）

- [x] `skyline-rush-stars`：各賽道最佳星數取較高值；還原後重新計算塗裝解鎖。
- [x] `skyline-rush-best-tracks` 與舊版 `skyline-rush-best`：各賽道最佳時間取較低值，舊版 Coast 成績只用來遷移。
- [x] `skyline-rush-medals`：獎章取聯集，同一獎章保留較早取得日期。
- [x] `skyline-rush-history`：Classic 最近 50 場紀錄；依紀錄內容去重、驗證欄位，合併時保留最新 50 場，並重算生涯統計。
- [x] `skyline-rush-mode-history-v1`：Custom、Time Attack、Cup、Stunt 等模式的最近 50 場紀錄；沿用原模式／規則簽章與最佳成績計算。
- [x] `skyline-rush-daily`：每日挑戰最近 50 筆；依挑戰 ID 保留獨立排行，避免誤併進 Classic 解鎖。
- [x] 替上述欄位新增版本遷移、Firestore 規則、模擬跨裝置合併測試及還原後 UI 更新；雲端舊版地圖資料不可被新版本覆蓋或遺失。
- [x] 對同帳號雙裝置同時完成比賽、重複登入、離線後回線與受損雲端資料做回歸；重試不得重複紀錄或倒退最佳成績。（雙瀏覽器並行交易、離線回線、重複登入與合併單元測試通過）
- [x] 重要合併、復原與帳號隔離問題先以失敗測試重現再修正；共用賽道清單與既有資料驗證，通過完整單元、Firestore 規則模擬器、相關瀏覽器案例與正式建置檢查。

### 維持裝置本機儲存的項目

- [x] 音樂／音效開關與音量：現有 Cookie；不需要隨帳號跨裝置同步。
- [x] 駕駛控制與觸控配置 `skyline-rush-controls`、鍵盤改鍵 `skyline-rush-keymap`、AUTO `skyline-rush-auto`：裝置與輸入方式相關，維持 Local Storage。
- [x] 畫質／特效 `skyline-rush-vfx`、語言 `skyline-rush-locale`：維持 Local Storage，換裝置使用該裝置預設值或自行選擇。
- [x] 已選塗裝 `skyline-rush-paint`、最近 3 組 Custom 設定 `skyline-rush-recent-custom-v1`：屬便利偏好，維持 Local Storage；塗裝的**解鎖資格**由雲端星數還原。
- [x] Classic／Time Attack Ghost `skyline-rush-ghosts`、`skyline-rush-mode-ghosts-v1`：體積較大且可再跑出，保持裝置本機，不塞進 Firestore 進度文件。
- [x] 為 Ghost 設容量上限或遷往本機 IndexedDB，避免 Local Storage 額滿導致重要成果的本機副本無法寫入。（Classic／模式 Ghost 各限 512 Ki 字元，超過時淘汰最舊重播；單元測試驗證）
- [x] 教學已看／已完成、裝置效能提示：維持 Local Storage；瀏覽器資料清除後重新顯示不會損失遊戲成果。
- [x] 上次賽道 `skyline-rush-last-track` 與更新檢查標記：維持 Session Storage，僅供目前分頁使用。
- [x] 評估 Ghost 與偏好的可選匯出／匯入：目前維持裝置本機，理由與日後跨裝置方案見 `docs/cloud-save.md`；尚未提供這些項目的匯入／同步。

進度更新（2026-10-24）：Firebase 雲端儲存功能已由 `feature/firebase-cloud-save` 合併至 `main`（`671416cd`）；本分支整合 main，保留 MODE-00 TDD 與玩法項目。雲端存檔正式站與 Safari 驗收尚未完成；請依 `docs/cloud-save.md` 驗證。詳見 [階段 15](https://app.notion.com/p/4021a2df84a7817da29afa84cf8bb326)。

## 操作教學 v1（2026-10-23）

- [x] Desktop：靜態鍵盤示意與目前自訂按鍵、中英文說明。
- [x] Mobile：Slide／Buttons、加速、FLY、BOOST、NITRO 與暫停圖解。
- [x] Controls 可開啟並切換裝置說明；關閉後視為已看過教學（不再於載入時自動跳出，見下方首次開始流程）。
- [x] TDD 與整合驗證：首次／重開／儲存不可用／暫停、桌面與手機直橫向。
- [x] 搭配遊戲畫面、實際操作與逐步完成判定的互動教學（詳見下方互動操作教學）。
- [ ] 實體 iOS Safari／Android 觸控裝置驗收（目前以 Chrome 手機模擬驗證）。

驗證：379 項單元測試、正式建置通過；297 項瀏覽器案例中 290 項首輪通過、7 項重跑或修正後通過。語言測試的延遲音樂提示改用實際可見狀態處理，4 個使用檔案的 73 項相關回歸全部通過。畫面證據位於 `artifacts/control-guide/`。

## 互動操作教學（2026-10-23）

- [x] 真實 Free Drive 場景：加速、左轉、右轉、煞車、起飛、降落、BOOST、NITRO 八步，依實際輸入與車況判定完成。
- [x] 畫面提示與控制高亮；中英文、目前鍵盤配置、Slide／Buttons／Tilt、手機與平板直橫向。
- [x] 從操作教學與 Controls 開始；暫停、略過、退出、完成與重練流程。
- [x] 首次按「開始比賽」自動進入互動練習：「跳過」或完成後的「開始比賽」直接開始所選比賽；看過說明或練習後不再自動帶入，儲存不可用時每頁一次。
- [x] 教學隔離正式紀錄、解鎖、Ghost 與每日挑戰；退出還原原本選擇或暫停中的比賽。
- [x] TDD 單元、桌面與手機實際操作瀏覽器回歸、正式建置。
- [x] 傳送桌面／手機標註截圖與完成摘要。
- [x] 錄製桌面／手機八步操作影片並傳送 Telegram。
- [ ] 真機 Safari／Android／平板驗收（模擬器與瀏覽器尺寸測試不視為真機）。

驗證：444 項單元、325 項完整瀏覽器回歸及正式建置通過；最新教學檔案另由主代理獨立重跑 11 項全數通過。額外以繁體中文橫向 Slide 完成八步，提示卡與滑動區沒有重疊。截圖、桌面／手機影片與驗證說明位於 `artifacts/interactive-tutorial/`，均已透過 Telegram 傳送。教學採暫時標準按鍵位置；未授權 Tilt 暫用 Slide，旋轉仍可操作，退出即還原偏好。

Original baseline (everything below builds on these initial systems): a single 5 km coastal highway
sprint (`RACE_LENGTH`), 3 rivals, 36 recycled traffic cars, flight and BOOST sharing one `fuel` pool,
near-miss combos that recharge fuel, 7 purely decorative cyan rings in the sky (`world.js` gates),
and a single saved best time (`skyline-rush-best`).

Implementation rules: game rules live in the pure simulation layer `src/game.js`, test-first in
`tests/game.test.js` (TDD). `world.js` only renders, `main.js` owns the HUD and persistence. Pickup
and ring placement comes from a per-track seed so runs are reproducible and testable.

Branch rules: implement every new feature on its own new `feature/<name>` branch and commit to it
directly. Do **not** open a pull request for feature work.

Current scope: all gamepad-related work (input support, mapping UI, and acceptance checks)
is **Lowest priority** and **out of scope for this iteration**. Gamepad references below
describe future work, not current requirements.

Remaining open items are split into logic (Claude, `src/game.js` + `tests/game.test.js`) and UI
(Codex, rendering / HUD / browser specs) in
`docs/superpowers/plans/2026-10-20-remaining-items-split.md`, which holds the frozen UI
contracts, file ownership, the parallel schedule and the prompt for each AI; the sub-checkboxes
below mirror that split.

---

## 0. Desktop + mobile (applies to every item below)

Every item is done only when it works on both platforms. Targets match the viewports the browser
tests already use: desktop 1440×900, phone portrait 390×844 and 320×740, phone landscape 844×390
(touch). Desktop = keyboard (+ optional gamepad — **Lowest priority**, deferred; mouse for menus);
mobile = touch via the existing `(pointer: coarse)` detection and the `.touch-controls` layout.

### Shared rules

- **One input model**: every action is a named control in `input.js` (`fly`, `boost`, `nitro`, `brake`…)
  that keys, touch buttons, and gamepad (gamepad mapping — **Lowest priority**, deferred) all map to.
  Game rules never check the device
- **Same rules, same numbers** on both platforms; mobile only differs in layout, hints, and effect budget
- **Hints match the device**: desktop shows keys (`HOLD SPACE`), mobile shows button names (`HOLD FLY`),
  extending the existing `touchPreference` switch in `main.js`
- **Touch targets** ≥ 44×44 px, buttons never cover the car or the center callout area, respect
  `env(safe-area-inset-*)` for notches and home bars
- **Performance**: mobile gets a lower budget — smaller particle counts for pickups / drift / ring bursts,
  capped pixel ratio, fewer simultaneous HUD animations; measure frame time on a mid-range phone before
  and after each item
- **Orientation**: portrait and landscape both playable; landscape is the recommended racing orientation
- **Tests**: each item's browser test runs at a desktop viewport and at least one touch viewport

- [ ] **Physical-device acceptance** (manual — user on a phone, not Claude / Codex work; steps in
  the split plan §A): measure before/after frame time on a mid-range phone and
  check Android/iOS hardware and Safari. The 2026-10-20 implementation checks below cover desktop
  and touch-browser viewports; this real-device gate remains open (see `docs/verification.md`).
  - [x] iOS Simulator Safari (iPhone 17, iOS 26.5), 2026-10-20: Coast and Neon, portrait and landscape, touch FLY works; it found and fixed two short-landscape layout bugs (HUD overlap, START RACE below the fold)
  - [x] Measurement tool: `?perf` shows racing frame-time p50/p95/fps over the last 20 s; checked in iOS Simulator Safari (p50 17.0 ms, p95 24.0 ms, 59.7 fps on the Mac GPU, so not a phone number)
  - [ ] Real phones: frame time p95 on a mid-range Android (Chrome) and an iPhone (Safari), read from `?perf`; the Android emulator's translated GPU (7.5 fps, black 3D canvas) cannot stand in for hardware

### Mobile control layout (with all new actions)

Two thumbs, so the right side must not need two simultaneous presses. Steering has two modes,
picked in Settings → Controls.

**Mode A — Slide steering (default)**: no precise left / right buttons. The whole steering half of
the screen is a slide pad; put the thumb down anywhere and slide.

```
 ┌────────────────────────────────────────────┐
 │                                            │
 │  ┌ ─ ─ steering pad ─ ─ ┐    [NITRO]       │
 │      ◀ ── (●) ── ▶          [BOOST] [ FLY ]│
 │  │   slide down = brake │                  │
 │  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘                  │
 └────────────────────────────────────────────┘
   steering hand                action hand
```

- [x] Touch-down point becomes the center; horizontal distance from it = steering amount
  (dead zone 6 px, full lock at ~60 px, analog in between — `stepRace` already accepts a fractional `steer`)
- [x] If the thumb slides past full lock, the center follows it, so steering back the other way responds immediately
- [x] Release = straight ahead (with lane assist from 7C if enabled)
- [x] **Slide down past ~40 px = brake**; down + sideways = **drift** (brake + steer), so brake and drift need no button
- [x] A faint floating ring + knob shows where the center and thumb are; it fades after a few seconds of play
- [x] Pad covers the bottom ~45% of its half of the screen, so it never blocks the car or the callouts

**Mode B — Buttons (classic)**: today's `[◀] [▶]` + `[BRAKE]` buttons, for players who prefer tapping.

```
 ┌────────────────────────────────────────────┐
 │                                            │
 │  [◀] [▶]                  [NITRO]          │
 │                       [BOOST]  [ FLY ]     │
 │  [BRAKE]                                   │
 └────────────────────────────────────────────┘
```

Shared by both modes:
- [x] **AUTO accelerator on by default on touch** (the existing assist), so no thumb is spent holding the throttle; the gas button stays available when AUTO is off
- [x] Action hand: FLY (largest), BOOST, NITRO in an arc around it; sliding between FLY and BOOST holds both (AIR DASH)
- [x] **Drift = brake + steer** in both modes, the same rule as the keyboard

### Settings → Controls (control customization)

Mobile:
- [x] **Steering mode**: Slide (default) / Buttons / Tilt (device orientation, asks permission only when chosen); physical-device calibration acceptance remains open above
- [x] **Handedness**: steering on left (default) / steering on right — mirrors the whole layout for left-handed players
- [x] **Slide sensitivity**: distance for full lock (40 / 60 / 80 px)
- [x] **Button size** (S / M / L) and **opacity**
- [x] **Edit layout**: drag each action button (FLY / BOOST / NITRO / and the classic buttons in mode B) to a new spot, with a live preview over a paused race; Reset to default
- [x] **FLY behavior**: hold (default) / toggle

Desktop:
- [x] **Key remapping**: click an action, press the new key; conflicts are flagged and swapped; Reset to default (the `J`/`K`/`L` alternates from 7B are part of the default map)
- [x] **Steering sensitivity** (from 7C)
- [ ] **Gamepad mapping view** — **Lowest priority**; out of scope for this iteration

Both:
- [x] Saved to `localStorage['skyline-rush-controls']` with try/catch like the existing VFX settings; invalid / outdated saves fall back to defaults
- [x] `input.js` reads the saved map; game rules stay device-agnostic
- [x] Acceptance: unit tests for slide → steer mapping (dead zone, full lock, center follow, slide-down brake) and key remap conflicts; browser test at touch viewports: slide steering moves the car, Buttons mode still works, mirrored layout and edited button positions survive reload

### Per-item platform notes

| Item | Desktop | Mobile |
|---|---|---|
| 1. Tracks | Track select with keyboard / mouse, arrow keys + Enter | Swipeable track cards; lighter roadside detail and fewer neon lights / rain particles on Neon Downtown |
| 2–3. Nitro | `E` and `L` | NITRO button in the right-thumb arc; the 3-segment bar sits next to the button so the thumb sees it |
| 4. Rings | Full burst particles | Smaller bursts; ring centers slightly more forgiving (+10% radius) since touch steering is coarser |
| 5. History | Table with columns, hover for details | Stacked cards, tap for details; sparkline fits 320 px width |
| 6. Others | Daily challenge / achievements in the menu | Same, plus share-result via `navigator.share` where available |
| 7. Controls | `J`/`K`/`L` alternate keys, key remapping, steering sensitivity; gamepad (**Lowest priority**, deferred) | Slide steering default, Buttons / Tilt modes, handedness mirror, editable layout, AUTO default, FLY toggle |
| 8. UI / motion | Full motion | Same motion with fewer simultaneous effects; `navigator.vibrate` haptics where supported |

---

## 1. Three new tracks

First make tracks data-driven: a `TRACKS` table (name, length, palette / sky, traffic density, rival
speeds, special sections, seed for pickups and rings), read by `createRace(trackId)`. The current
coast track becomes `coast`.

| Track | Length | Mood | Signature mechanic |
|---|---|---|---|
| **Neon Downtown** | 4 km | Rainy night, neon billboards, wet reflections | **Tunnels**: 4 m ceiling, flying too high hits the roof (barrier contact). Traffic density ×1.5, so more near-miss chances |
| **Canyon Skyway** | 6 km | Desert noon, red rock canyon | **Broken bridge gaps**: 2–3 missing road sections you must fly over; falling = slowdown and respawn past the gap. **Crosswind zones** keep pushing the car sideways |
| **Aurora Pass** | 5.5 km | Snowy night, aurora sky | **Ice patches**: slower steering response. **Uphill sections**: slower ground recharge, so pickups and rings matter more |

- [x] `TRACKS` table + `createRace(trackId)`; `coast` behaves exactly as today (existing tests stay unchanged)
- [x] Special sections described as `{ from, to, type }`; `stepRace` looks them up by current distance
- [x] `world.js` switches palette / sky / roadside decoration per track (procedural geometry only, no downloaded assets)
- [x] Track select in the menu; unlock rule: finish top 3 on the previous track
- [x] Acceptance: every track can be finished; tunnel roof hit, gap fall, crosswind, and ice each have a unit test

## 2. Power-up: NITRO

Separate from the existing BOOST: BOOST still burns fuel (sustained), NITRO is a **one-shot burst**
with its own `nitro` reserve.

Nitro pickups on the road and in the air, in tiers:

| Pickup | Look | Adds | Where |
|---|---|---|---|
| Nitro cell | Small blue canister | **+0.25** | On the road, common, laid out in rows |
| Nitro can | Orange canister | **+0.5** | On the road, between lanes, requires a lane change |
| Nitro tank | Large gold tank | **+1** | In the air (flight only) or inside traffic gaps |
| Overcharge core | Spinning rainbow core | **Fills to the cap** | One per track, placed in a high-risk spot |

Use (press `E` / touch NITRO button):
- [x] Spends **1 full charge** for 2.5 s: speed cap `MAX_SPEED + 30`, much stronger acceleration, wider FOV + the existing lens boost effect
- [x] Cannot fire with less than 1 full charge (HUD shows that charge's fill progress)
- [x] Pressing again during NITRO **extends it by 2 s** instead of stacking speed (keeps it controllable)
- [x] Hitting traffic during NITRO keeps more speed (retention 0.45 → 0.7), rewarding bold driving

- [x] `player.nitro` (float), `player.nitroTime`; `input.nitro` with the `E` key / touch button
- [x] `race.pickups` generated from the track seed as `{ distance, x, altitude, tier }`; pass-through check uses the same previousDistance → distance window as near-misses
- [x] Pickup effects reuse the `effects.js` particle pool; sounds reuse `audio.js`
- [x] Acceptance: tests for each tier's amount, "under 1 charge cannot fire", and "extend does not stack speed"

## 3. Nitro cap: up to 3 charges

- [x] Cap of **3 charges** (`NITRO_MAX = 3`). Once a charge reaches 1.0 the next one starts filling, up to 3.0
- [x] HUD: 3-segment capsule bar; full segments glow, the filling one shows its ratio, the whole bar pulses `NITRO MAX` at 3
- [x] **Overflow conversion**: pickups at the cap convert the excess into fuel (each 0.25 = +8 fuel), nothing is wasted
- [x] Chained bursts: with 3 charges, pressing 3 times gives a 6.5 s burst (2.5 s + 2 s + 2 s via the extend rule)
- [x] Tests: pickup 0.5 at 2.9 → nitro = 3 and 0.4 converted to fuel; using one charge takes 3 → 2

## 4. Special rewards for flying through rings

Turn the existing 7 decorative gates into interactive rings. Only passing through the center
(`hypot(dx, dAltitude) < radius`) counts. Colors mean rewards:

| Ring | Color | Reward |
|---|---|---|
| Charge ring | Cyan (current color) | +20 fuel |
| Nitro ring | Gold | +0.5 nitro |
| Slipstream ring | Purple | 3 s of BOOST that burns no fuel (slipstream tunnel visual) |
| Risk ring | Red, smaller radius, placed high | +1 nitro + large score bonus |
| Mystery ring | Rainbow | One at random: **Shield** (absorbs the next collision), **Magnet** (pulls nearby pickups for 5 s), **Ghost** (pass through traffic for 3 s), **Freeze** (rivals slow down for 2 s) |

**Ring chain bonus**: rings appear in groups of 3–5
- [x] Clearing a whole group = **PERFECT LINE**: extra +1 nitro and a big HUD callout
- [x] Missing one breaks the group bonus (individual ring rewards already earned are kept)

- [x] `race.rings` as `{ distance, x, altitude, radius, type, group }`, generated from the track seed
- [x] `world.js` gates read position / color from `race.rings`; a collected ring bursts once and every crossed ring disappears
- [x] Shield / Magnet / Ghost / Freeze as `player.effects = { shield, magnet, ghost, freeze }` (seconds remaining)
- [x] Acceptance: tests for center hit (grazing the edge does not count), PERFECT LINE, and each mystery effect

## 5. History

- [x] Save one record per finished race to `localStorage['skyline-rush-history']` (keep the latest 50):
      date, track, position, time, collisions, near-misses, rings / PERFECT LINEs, NITRO uses, score
- [x] Best time per track (replaces the single `skyline-rush-best`; migrate the old value to `coast` once)
- [x] History screen: list filtered by track, best-run marker, sparkline of the last 10 times
- [x] Career stats: races, wins, total distance, longest combo, most rings in one run
- [x] **Ghost race**: record the best run's `x / altitude` trace at 10 Hz and replay it as a translucent ghost car next time; can be turned off in settings
  - [x] Controls UI: ghost toggle and per-track replay status; 10 Hz recording, validation and translucent playback connected
- [x] If storage fails (private mode) the game keeps working, using the existing try/catch pattern
- [x] Acceptance: unit tests for write / read / 50-record cap / old-best migration; browser test for the History screen

## 6. Other ideas to make it more fun

Ordered by small effort, big fun:

- [x] **Style score**: near-misses, rings, PERFECT LINEs, airtime, and clean sections score points; 1–3 star rating at the finish, so there's something to chase besides winning
- [x] **Slipstream**: staying right behind a rival / traffic car for 1.5 s → speed cap +6 and +0.25 nitro
- [x] **Air tricks**: quick left-right flick while flying = barrel roll; land it → +0.25 nitro; a hard landing loses the reward (uses `landing.speed`)
  - [x] Logic (Claude): flick detection within 0.3 s of raw `steer` sign change while airborne → `player.trick = { dir, time, done }`; 0.7 s roll; landing with `done` and `landing.speed < 11` pays +0.25 via `addNitro`, ≥ 11 writes `trickPayout = { nitro: 0, hard: true }`; contact / roof hit / gap fall / early landing cancel without payout; 8 unit tests (plan §C)
  - [x] UI (Codex → Claude): `world.js` body roll (`rotation.z`), callouts `BARREL ROLL` / `TRICK +0.25` / `HARD LANDING`, `TRICK` flight-state label, whoosh cue, haptic on payout, browser test at desktop + 390×844
- [x] **Rivals use NITRO too**: give rivals personalities (NOVA steady, ORBIT loves flying, APEX late surge) plus light rubber-banding to keep races tense
- [x] **Daily challenge**: date-seeded track + modifier (no flight, double traffic, gold rings only…), with its own board in History
  - [x] History UI: today's track + modifier, start action and the daily board (fastest five)
- [x] **Achievements / medals**: first win, zero-collision finish, 5 PERFECT LINEs in one race, triple nitro chain…, shown in History
  - [x] History UI: four medal entries with awarded dates; award rules and persistence in `src/history.js`
- [x] **Shortcuts**: one flight-only elevated shortcut per track, with pickups but also risk
  - [x] Logic (Claude): `{ from, to, type: 'shortcut', x: ±7.5, altitude: 6 }` section on all four tracks; `player.inShortcut` (|dx| < 3, |dAltitude| < 2.5); inside: flight burns no fuel and the speed cap gets +12; `shortcutPylons(section)` every 100 m alternating ±2.2 m, hitting one is `barrier` contact; corridor cells + one tank from `createPickups`; 7 unit tests incl. the coast-sections assertion update, plus the `SHORTCUT / FLY HIGH` sign entry in `world.js` (plan §D)
  - [x] UI (Codex → Claude): `world.js` elevated deck + pylons via `shortcutPylons`, `SHORTCUT` label and entry callout, `∞` fuel budget while inside, `trackNotes`, browser test at desktop + 844×390
- [x] **Final sprint**: in the last 500 m the music speeds up (`audio.js` bpm) and rival gaps are shown, for comeback drama
- [x] **Cosmetic unlocks**: stars unlock car paint / tail light colors (visual only, no stat changes)
  - [x] Garage UI: live previews; best stars per track (summed) unlock Coral 3 / Glacier 6 / Aurora 9; equip is saved

## 7. Controls: easier handling, FLY + boost together, drifting

### 7A. Current problems (from `game.js` / `input.js`)

| Problem | Cause |
|---|---|
| Steering is twitchy, easy to hit the barrier | At high speed lateral speed caps at 12 m/s, so one lane (5 m) changes in ~0.4 s; steering responds in ~70 ms and input is digital (0 or ±1) |
| FLY + BOOST barely work together | Both drain the shared `fuel`: flight 19/s + BOOST 10/s = 29/s, empty in ~3.4 s, then `exhausted` forces the flight to end |
| Keyboard can't register the combo | W + A/D + Shift + Space is 4 keys; many keyboards ghost (drop key presses) |
| Touch can't FLY + BOOST at once | Touch has 6 buttons (left / right, FLY / BOOST, brake / gas) for two thumbs; with steering on the left and pedals on the right, FLY and BOOST can't both be held |
| Grazing the barrier is punished hard | Any barrier touch triggers `contact`: 0.75 speed retention and a 1.5 s cooldown, even for a light scrape |

### 7B. FLY and boost at the same time

- [x] **AIR DASH**: holding FLY + BOOST together caps the combined drain at **22/s** (instead of 29/s), keeping the `MAX_SPEED + 14` cap; HUD shows `AIR DASH`
- [x] **NITRO doesn't use fuel** (separate `nitro` reserve from item 2), so FLY + NITRO always works together; NITRO while flying = straight-line air dash
  - [x] Logic (Claude): already true in `game.js`; add the acceptance tests — `{ fly, nitro }` held 2 s → `thrusting`, `nitroTime > 0`, not `exhausted`, fuel down by 19/s only; `{ fly, boost, nitro }` keeps the 22/s AIR DASH drain and the `MAX_SPEED + 30` cap (plan §B; no new physics unless decision 1b is chosen)
  - [x] UI (Codex): flight-state label `AIR DASH · NITRO` when thrusting with NITRO active (`main.js:833`)
  - [x] Browser test: `tests/nitro-fly-browser.spec.js` holds FLY + NITRO at desktop and 844×390 touch
- [x] **Alternate keys**: right hand `J` = FLY, `K` = BOOST, `L` = NITRO, left hand stays on WASD, avoiding the Shift + Space conflict (original keys still work)
- [x] **Touch** (layout in item 0):
  - [x] AUTO accelerator on by default, so the right thumb is free for FLY / BOOST / NITRO
  - [x] FLY button can be set to "toggle" (tap to lift off and hold altitude, tap again to land), freeing the right thumb for BOOST / NITRO
  - [x] FLY and BOOST buttons sit side by side; sliding a finger onto the border between them activates both (uses the existing pointer tracking)
- [x] Acceptance: test `input = { fly: true, boost: true }` held for 2 s → `thrusting` and `boosting` both true, not `exhausted`, speed > `MAX_SPEED`

### 7C. Handling feel

- [x] **Steering curve**: input ramps to full over 0.15 s (like an analog stick); high-speed lateral cap 12 → 9 m/s; "Steering sensitivity" in settings
- [x] **Lane assist** (part of AUTO, can be turned off): releasing steering eases the car to the nearest lane center
- [x] **Barrier scrape**: shallow-angle touches become a "scrape" — 0.92 speed retention, car pushed back onto the road, no collision counted, combo kept; only head-on hits use the existing `contact`
- [x] **Forgiving hitbox**: vehicle collision width 1.9 → 1.7, so more "almost hit" moments become near-misses instead of crashes
- [x] **Takeoff buffer**: holding FLY below 18 m/s is remembered and lifts off automatically once fast enough (no need to press again)
- [x] **Glide**: releasing FLY in the air lowers fall acceleration 11 → 7 for more controllable, softer landings (`landing.speed`)
- [ ] **Gamepad support**: the browser's built-in Gamepad API, analog stick steering, triggers for throttle / brake — **Lowest priority**; out of scope for this iteration
- [x] Move the touch brake to the left thumb, next to steering (see item 0), so brake + steer = drift works on touch

### 7D. DRIFT (builds nitro)

Trigger:
- [x] Keyboard: at ≥ 45 m/s hold **brake + direction** (S + A/D) → drift instead of hard braking
- [x] Touch: the same brake + steer, both under the left thumb (no extra button)
- [x] Ground only (`altitude === 0`); taking off or crashing ends the drift

Physics:
- [x] Car body slides out 20–30° (`world.js` body yaw), arc still controlled by steering
- [x] Drifting only bleeds a little speed (−3 m/s², normal braking is −35)
- [x] Near-miss combo points ×2 while drifting

**Nitro build-up** (longer drift, bigger reward on release, like a mini-turbo):

| Drift time | Spark color | Reward on release |
|---|---|---|
| ≥ 1 s | Blue | +0.15 nitro + 0.5 s mini boost |
| ≥ 2 s | Orange | +0.3 nitro + 0.8 s mini boost |
| ≥ 3 s | Purple | +0.5 nitro + 1.2 s mini boost |

- [x] Rewards count toward the 3-charge cap; overflow converts to fuel per item 3
- [x] Hitting a car / barrier mid-drift → the build-up is lost
- [x] Visuals / audio: tire smoke and sparks share the `effects.js` particle pool; add tire screech to `audio.js`
- [x] `player.drift = { time, dir }`; brake + steer derives drift, and `stepRace` handles enter / hold / release payout
- [x] Acceptance: tests for no drift below 45 m/s, the three time thresholds and rewards, crash cancels, no drift in the air

## 8. UI / UX polish and animation

### 8A. Original gaps (status tracked in 8B)

- Speed, position, and timer numbers just swap text every frame, with no motion
- Leaderboard rows jump when positions change, with no reorder animation
- The results overlay appears instantly; finishing a race has no "moment"
- Fuel bar only has a 0.1 s linear width transition; no feedback when it's low or refilling
- Near-miss, impact, and boost feedback is text-only in small HUD labels and easy to miss mid-race
- Screen changes (intro → countdown → racing → pause → results) are mostly hard cuts

### 8B. Improvements

- [x] **Animated numbers**: speedometer needle / arc that eases with speed; position number flips with a ↑ green / ↓ red pulse when you gain or lose a place
- [x] **Leaderboard reorder**: FLIP animation (measure old/new row positions, animate `transform`) when places swap
- [x] **Event callouts**: center-screen pop-ups that scale in and fade out for `NEAR MISS ×3`, `PERFECT LINE`, `NITRO`, `+0.5`, drift spark tiers; queue them so they don't overlap
- [x] **Gauges**: fuel and the 3-segment nitro bar ease (not linear), flash red under 20%, shimmer while refilling, pulse when a nitro charge completes
- [x] **Finish sequence**: render-only coast over the line (~0.6 s), camera swings to a side view, then the results card slides in; stats count up one by one; stars pop in; "NEW BEST" stamp; official timing/results are frozen before presentation
- [x] **Screen transitions**: intro slides out as the countdown lights drop in; pause blurs and dims the scene; restart wipes instead of cutting
- [x] **Countdown**: start lights turn on one by one with a sound tick; "GO" bursts out with a short camera push
- [x] **Button feel**: press scale (0.96) + release spring on all buttons; touch buttons glow while held; optional haptics via `navigator.vibrate` on mobile for impacts, nitro, and drift payout
- [x] **Menu**: track select cards with a looping preview of the track's sky / palette; History screen slides in from the side
- [x] **Consistency**: one shared set of motion tokens in `style.css` (`--ease-out`, `--ease-spring`, `--dur-fast` 120 ms / `--dur-base` 240 ms / `--dur-slow` 480 ms) used by every new animation
- Rules: animate only `transform` / `opacity` (no layout thrash on the hot render path); every new animation respects the existing `prefers-reduced-motion` and "comfortable" settings by falling back to an instant or fade-only version
- [x] Acceptance: browser tests verify callout lifetime, results after the finish sequence and reduced-motion behavior; short local Chrome samples show no frame-cadence drop (desktop callback p95 increased 1.8 → 2.9–3.0 ms). See `docs/verification.md`; physical-device performance remains unverified.

---

## Suggested order

1. **Control fixes** (7A–7C: AIR DASH drain, alternate keys, steering curve, barrier scrape) — small changes, immediately better feel
2. Track data refactor (pure refactor, `coast` behavior unchanged) — everything else depends on it
3. NITRO + 3-charge cap + pickups (items 2 and 3 together)
4. DRIFT (7D, needs the nitro reserve)
5. Interactive rings and rewards (item 4)
6. UI / UX polish (item 8) — motion tokens and callouts first, since items 2–4 need them to be readable
7. History + per-track best + ghost (item 5)
8. Three new tracks (content part of item 1)
9. Pick from item 6
10. **Gamepad support + mapping view** — **Lowest priority**; deferred beyond this iteration


---

## 9. Game modes and race-session configuration (new roadmap — 2026-10-22)

**Status:** Sections 9–13 are a feature roadmap; checked entries are implemented and have passed
targeted verification on `feature/race-modes-p0`. Larger acceptance gates remain unchecked
until the complete requirement and required browser/device testing pass.
The original 2026-10-22 roadmap had all tasks unchecked.
The preceding sections (0–8) are the existing implementation history; do not reset their
completion state or regress Classic Race. Priority labels: **P0** = first release, **P1** =
second wave, **P2** = larger/long-term work. Keep the existing 10 tracks, official unlock
rules, track showcase parity, NITRO/FLY/BOOST, rivals, daily challenges, Ghost, Garage,
saved history, English/Traditional Chinese UI and production-only access restrictions.

**Design boundary:** All 10 current tracks are **point-to-point sprint courses**, not closed
circuits. A repeat of the same sprint or a multi-stage event is **not** a seamless lap. The
actual closed-circuit/1–3–5 lap feature below needs genuine looped route geometry and
checkpoint validation; merely multiplying `race.length` or resetting distance would be wrong.

### 9A. Common mode/session model (P0; prerequisite)

- [x] **MODE-00 — Versioned `RaceConfig` / session contract.** Define a validated, serializable
  configuration with stable fields such as `mode`, `trackId`, `seed`, `rivalCount`,
  `aiDifficulty`, `trafficDensity`, `itemsEnabled`, `collisionRule`, `ghostEnabled`,
  `durationSeconds` / `stageCount` (only when applicable), `visualPreset` and `rulesVersion`.
  Declare mode-specific allowed options and defaults in a pure module; distinguish
  **simulation rules** from **visual-only** settings.
- [x] Extend/refactor `createRace(trackId, options)` (or add a compatible wrapper) to build
  sessions from `RaceConfig` **without breaking** existing `createRace('coast')` and
  `createRace(trackId, dailyModifier)` callers. Keep the current Daily Challenge seed,
  modifier rules and official Classic Race parameters identical.
- [x] Model explicit objectives and completion conditions per mode: `placement`,
  `finish-time`, `score-target`, `checkpoint-timer`, `stage-points`, `survival` or
  `no-auto-finish`. Do not keep reusing `race.length` completion for every mode.
- [x] Separate `Classic / Campaign` from `Custom / Practice / Challenge` in eligibility:
  only qualifying Classic finishes unlock the next track or award career progression.
  A local test-all-unlocked run must never grant unlocks, stars or achievements.
- [x] Produce deterministic simulation seeds for traffic, checkpoints, obstacles and items
  with **separate named streams**, so adding decoration or an option cannot silently
  reshuffle the original pickups or rings. Validate finite coordinates and bounded counts.
- [ ] **Acceptance:** unit tests cover old call signatures, default-rule parity,
  incompatible/unknown options, deterministic replay, mode-specific finishing and
  access rules; all ten existing courses remain raceable.

**MODE-00 implementation / verification (2026-10-23):** On
`feature/mode00-objective-contract`, the pure, JSON-serializable `createRaceSessionContract`
now separates fixed gameplay rules, a per-track seed, and presentation-only metadata
(ghost visibility and visual preset). `validateRaceRequest` rejects invalid/unsupported
new user options; tolerant legacy `normalizeRaceConfig` and existing mode best/Ghost
signatures remain unchanged. Existing named RNG streams are centralized without
changing their string values, and all nine shipped modes now have explicit finish
objectives (Cup = stage-points; Stunt = timed-score; Free Drive = no auto-finish).

Targeted unit tests **passed** at `da3d81a` (GitHub Actions
`39865378561`). RED evidence: the Cup objective expectation fails at
`2ce05e5` (run `39864803654`, unit job); implementation GREEN at
`da3d81a`. The previous full CI had failed browser shards even though
unit/smoke/World Tour passed, and main's prior run also contained browser
failures. Do not mark the stage-wide acceptance as done or merge until
**the final SHA** has all required CI checks green.


**MODE-00 deterministic seed / bounds completion (2026-10-23):** RED tests at
`6d5f9ff` ([run #39939858288](https://github.com/weskao/skyline-rush/actions/runs/39939858288)); GREEN at
`b1edafb` ([run #39940097050](https://github.com/weskao/skyline-rush/actions/runs/39940097050)):
focused tests, full `npm test`, and `npm run build` passed. Stable, isolated
32-bit seeds now exist for traffic, checkpoints, authored world obstacles,
active items, original pickups/rings and hazards. Authored traffic/checkpoint
layouts and Classic/Daily replay signatures remain unchanged. Ten track layouts,
finite entity positions, bounded counts and invalid external geometry are covered.
**Stage-wide acceptance remains open** until required browser/physical-device
checks and access/persistence regressions are independently verified.

Still open: stage-wide mode acceptance, browser and physical-device
performance/UX checks. Traffic and checkpoint layouts intentionally remain
authored and deterministic; newly named seeds are available if those layouts
later become procedural, without changing Classic/Daily replay rules.
No operation-guide files, audio or UI were changed by MODE-00; no new sound
cue is warranted for these pure simulation contracts.

---

### 9B. Free Drive / Practice mode (P0)

- [x] **MODE-01 — Free Drive v1:** drive and fly on any **already unlocked** course with
  no finishing position, mandatory countdown, AI race placement or automatic victory.
  Add a visible return/restart control and an optional one-tap reset-to-start.
- [x] Allow selectable **no AI**, traffic density and item availability. Reuse existing
  steering, cameras, drift, FLY, BOOST, NITRO and 3D scenery; do not build a new
  physics engine.
- [x] At the authored end of an open sprint, offer **Restart / Choose Track / End
  Session**, or stop safely in a designated free-drive area. Do **not** claim
  endless roadway, reverse-map continuity or loop back to the start until implemented.
- [x] Optional practice HUD: current speed, air time, travel distance, max speed,
  clean near-miss chain and trick counter; hide rival position and race countdown.
- [ ] **Acceptance:** crossing the old finish cannot save an official best, stars,
  campaign unlock or Daily record; exit/restart/pause work for keyboard and touch;
  world buffers do not grow across repeated sessions.

### 9C. Custom Race (P0)

- [ ] **MODE-02 — Custom Race:** choose an unlocked track, 0–3 rivals, AI
  **Easy / Normal / Hard**, traffic **Off / Light / Normal / Heavy**, power-ups
  **On / Off**, collisions **Normal / Relaxed**, Ghost visibility and weather/time
  **visual preset**. Preserve original defaults in Classic mode.
- [x] AI difficulty adjusts clearly named parameters (target speed, mistake rate
  or rubber-band bounds) without breaking current rival personalities `NOVA`,
  `ORBIT` and `APEX`. Support 0, 1, 2 and 3 rivals correctly.
- [x] Offer a longer session with **1 / 2 / 3 / 5 sprint stages** (same or selectable
  unlocked courses), but label it **stages / heats**, not circuit laps; show aggregate
  time or points explicitly and reset physical state between stages.
- [x] Support validated presets **Standard / Traffic Rush / No Items / Air Focus /
  Precision** and a custom configuration, all with one-tap Reset to Default.
- [ ] **Acceptance:** generated item/traffic counts, HUD placement labels, AI finish
  detection and results all work with 0 rivals; Custom scores never overwrite
  Classic or Daily records.

### 9D. Time Attack / Ghost Trial (P0)

- [x] **MODE-03 — Time Attack:** solo fixed-course trial with clean start/finish,
  immediate retry and best time per stable `trackId + mode + ruleset`. No rival
  race position or opponent-driven rubber banding.
- [x] Reuse the existing 10 Hz best-run Ghost when the recorded trace and rules
  are compatible; show `Ahead / Behind` split against the personal record.
  Keep separate Ghost data for mode-specific bests if necessary.
- [x] Optional **Clean Time Trial** variant: collisions invalidate a clean medal or
  apply an explicit time penalty; do not silently change legacy physics.
- [ ] **Acceptance:** timed results/ghosts remain isolated from Classic bests;
  blocked localStorage never prevents play; mobile HUD remains readable.

### 9E. Stunt & Style Attack (P1)

- [x] **MODE-04 — Stunt Attack:** timed 2 / 3 / 5-minute score run for air tricks,
  sustained drift, near-misses, rings, PERFECT LINE groups and flying shortcuts.
  Reuse existing `player.score`, `trick`, `drift` and ring events.
- [x] Add explicit style-combo multiplier, clean landing bonus and fair combo
  break/decay on crashes; prevent stationary or repeated reset farming.
- [x] Save best score, combo, air time and medal thresholds by exact track/ruleset.
- [ ] **Acceptance:** deterministic scoring independent of FPS and input device;
  end-of-timer results work without reaching the sprint finish.

**Stunt best persistence (2026-10-23):** RED [`b4c4262`](https://github.com/weskao/skyline-rush/commit/b4c4262cc4557d58cf58243f99f078dfcc54f863),
[Actions #39940564407](https://github.com/weskao/skyline-rush/actions/runs/39940564407);
GREEN [`5a7cb28`](https://github.com/weskao/skyline-rush/commit/5a7cb2886613a319a6dcb70ecc5293abfd3b99a2),
[Actions #39940729574](https://github.com/weskao/skyline-rush/actions/runs/39940729574).
Stores a validated, rule-scoped personal best score, longest combo, longest air
time and derived medal; 50-run history rotation cannot lose lifetime bests.
Existing records and Classic unlock rules are unchanged. Focused MODE-00 tests,
full `npm test` and production build passed. Frame-rate/device acceptance remains open.

### 9F. Checkpoint Rush (P1)

- [x] **MODE-05 — Checkpoint Rush:** pass a deterministic sequence of grounded or
  aerial gates before time expires; each clean gate extends the timer.
- [x] Choose checkpoints from the **real track route and reachable flight envelopes**;
  prevent impossible gates inside tunnel roofs, road gaps or conflicting hazards.
- [x] Show next target distance/direction, time left, checkpoint chain and optional
  perfect-gate rewards. Invalid/missed gates cannot secretly count.
- [x] **Acceptance:** gated time-extension and expiry have unit tests; minimap
  uses the official main route and never reveals hidden shortcut geometry.

**MODE-05 gate route/clearance verified (2026-10-23):** RED
[`9be5f04`](https://github.com/weskao/skyline-rush/commit/9be5f04effbc832599dd1488ec4478c5fb7d086b)
([Actions #39943129958](https://github.com/weskao/skyline-rush/actions/runs/39943129958)):
three obstacle avoidance/bounds tests failed as intended. GREEN
[`b4c2d17`](https://github.com/weskao/skyline-rush/commit/b4c2d17071f0e148399d3b83ad75e5e791be7c76);
ten-route real-scenery regression [`88c7aa0`](https://github.com/weskao/skyline-rush/commit/88c7aa0ac4c0ed16e5473c2828ba484580ff24d7).
[Actions #39943573134](https://github.com/weskao/skyline-rush/actions/runs/39943573134):
focused MODE-00, full unit suite, production build and desktop Checkpoint Rush
WebGL browser smoke all GREEN; an actual game screenshot is in the
`checkpoint-rush-gameplay` Actions artifact. Lane selection avoids authored
roadside obstacle bounding boxes; impossible gates are skipped, and existing
70 m tunnel/gap/shortcut safety buffers remain. Full stage acceptance and
physical-device checks are still open.

**MODE-05 navigation and route acceptance (2026-10-23):** The existing
[`checkpoint-navigation.test.js`](https://github.com/weskao/skyline-rush/blob/feature/mode00-objective-contract/tests/checkpoint-navigation.test.js)
and [`checkpoint-expiry.test.js`](https://github.com/weskao/skyline-rush/blob/feature/mode00-objective-contract/tests/checkpoint-expiry.test.js)
cover precise/near/missed-gate scoring and fair timer expiry. The authored
[`route-map.test.js`](https://github.com/weskao/skyline-rush/blob/feature/mode00-objective-contract/tests/route-map.test.js)
covers all ten official main-route polylines; hidden shortcut geometry is
not part of the route samples. Browser assertions
[`391b28f`](https://github.com/weskao/skyline-rush/commit/391b28fd199a3a9fe04fba7b1d1ea41bd31d0d85)
verify gate count, perfect count, distance, directional cue, remaining time.
[Actions #39944609373](https://github.com/weskao/skyline-rush/actions/runs/39944609373)
passed full unit tests, build and real desktop WebGL smoke. Mobile/device
acceptance remains under the shared stage-wide QA, not claimed here.

### 9G. Multi-track Championship Cup (P1)

- [x] **MODE-06 — Championship:** select a curated 3–5-track cup consisting of
  **unlocked** stages; award stage ranking points and a clear final champion.
- [ ] Preserve stage standings across transitions with fair AI participation,
  an explicit continue/retry flow, and optional saved in-progress cup recovery.
- [x] Distinguish cup medals/bests from individual Classic times; a cup does
  not grant unearned unlocks for stages skipped or completed in practice mode.
- [ ] **Acceptance:** ties, quit/resume, mid-cup restart, 0-rival rejection and
  incomplete data produce deterministic, understandable results.

### 9H. Obstacle Gauntlet (P1)

- [ ] **MODE-07 — Obstacle Gauntlet:** fixed-seed hazard challenges with
  escalating moving gates, road barricades, flying hoops, debris and safe/risky
  alternate lines. Keep the ordinary track drivable in Classic mode by default.
- [x] Add difficulty tiers based on warning time, obstacle spacing and
  activation frequency **without random unavoidable collisions**.
- [x] Score clean obstacle passes, near-misses and finish time; practice and
  obstacle-mode records stay separate.
- [x] **Acceptance:** each generated hazard arrangement leaves a reasonable
  passable ground/air path and has predictable collision tests.

**MODE-07 scoring TDD (2026-10-23):** RED
[`60a5e99`](https://github.com/weskao/skyline-rush/commit/60a5e99edfabc4c91d164ef6894c5ce52a2a5769)
([CI #39945677012](https://github.com/weskao/skyline-rush/actions/runs/39945677012));
GREEN [`7fbb126`](https://github.com/weskao/skyline-rush/commit/7fbb12667ae0372a7bb16876164df004f05bcd11)
and WebGL smoke [`c2b6c8e`](https://github.com/weskao/skyline-rush/commit/c2b6c8ef68b7b46d893b5d9a7800bd1038884061).
A safe barrier pass earns 150 points, a close clean near-miss earns 300
and increments the once-only nearMisses counter. Challenge records remain
isolated from Classic Career. Focused/unit/build/actual WebGL smoke all passed
[CI #39945865189](https://github.com/weskao/skyline-rush/actions/runs/39945865189).
Full route navigability and hazard arrangement acceptance remain open.

**MODE-07 generated-route acceptance (2026-10-23):** RED
[`25e74f9`](https://github.com/weskao/skyline-rush/commit/25e74f9d3c3a20a6f40c052fc609ab2b9032260d)
([CI #39946490119](https://github.com/weskao/skyline-rush/actions/runs/39946490119))
demonstrated hazards placed over raised shortcut approaches and nonfinite
positions under invalid elapsed time. GREEN
[`8455a70`](https://github.com/weskao/skyline-rush/commit/8455a70b48be24eea0f74f948b576830152174e1)
([CI #39946619729](https://github.com/weskao/skyline-rush/actions/runs/39946619729)):
all ten tracks in standard/extreme tiers remain deterministic; at least two
ground lanes and the air path are open at sampled motion times; spacing,
safe section buffers and once-only collision/scoring tests pass. Full unit
suite, production build and real WebGL smoke all GREEN. Device-specific
manual QA remains tracked separately.

### 9I. Elimination / Last Racer Standing (P2)

- [x] **MODE-08 — Elimination:** after an announced interval/checkpoint, eliminate
  the last active racer until one remains; show a readable knockout countdown.
- [x] Define whether the player loses immediately or gets one short comeback window;
  do not eliminate AI simply because an actor is off-camera.
- [x] **Acceptance:** active AI count/rank changes cleanly; results work after
  early elimination and never award Classic progression.

**MODE-08 elimination finishing/acceptance (2026-10-23):** RED
[`884e057`](https://github.com/weskao/skyline-rush/commit/884e057659c21c711b53b5e7008ffed2801a42b0)
([Actions #39944092143](https://github.com/weskao/skyline-rush/actions/runs/39944092143))
exposed fixed-fourth-place results for second/third-round player eliminations.
GREEN [`da8bd45`](https://github.com/weskao/skyline-rush/commit/da8bd4550226334138d2a29697a28a2646b3e571):
position derives from actual contenders left; knockouts are based on track
progress, not render/camera visibility. Tests
[`912a832`](https://github.com/weskao/skyline-rush/commit/912a83264a23459068d1b37cd0645587fc4846d1)
prove losses never persist results and challenge wins never grant Classic unlocks.
[Actions #39944609373](https://github.com/weskao/skyline-rush/actions/runs/39944609373):
unit suite, production build, Checkpoint Rush and Elimination live WebGL browser
smoke all GREEN. Device-specific QA belongs to shared manual acceptance.

### 9J. Endless Highway / Distance Survival (P2)

- [ ] **MODE-09 — Endless Highway:** deterministic extension/streaming **beyond**
  the fixed 4–8 km authored tracks; progressively increase challenge and record
  longest distance/survival score.
- [ ] Build extendable road geometry, scene chunks, encounter seeds, objective
  markers, camera/traffic recycling and safe recovery. Respect absolute distance
  to avoid repeated scenery, teleporting objects or floating-point problems.
- [ ] Keep memory/GPU resources bounded after lengthy play; verify pause, resume,
  context loss and browser tab backgrounding.
- [ ] **Acceptance:** play can continue past the former end without hitting
  clamped `trackPoint()`, missing geometry, a fake lap or an unintended finish.

### 9K. Event Lab Lite / course creator (P2)

- [ ] **MODE-10 — Event Lab Lite:** begin with **preset course modifiers** and
  validated placement templates (cones, barricades, ramps, gates, pickups,
  checkpoints), not a full free-form level editor.
- [ ] Add a later visual designer for positioning supported objects on unlocked
  courses, with snap-to-lane, collision previews, Undo/Redo and Reset.
- [ ] Import/export **versioned, size-limited JSON** that validates track IDs,
  geometry bounds, obstacle count, segment reachability and sanitizes labels;
  no script execution, remote code, or dependency on online accounts.
- [ ] Community sharing or multiplayer uploads require a separate backend,
  moderation/storage and security design; **not** part of offline-first v1.
- [ ] **Acceptance:** creation and replay produce the same stage with the same
  seed on desktop and mobile; malformed/corrupt creations fail safely.

## 10. Mode-selection UX, race settings, true laps and saved progress

### 10A. Start-screen setup and player experience (P0)

- [ ] **UX-01 — Mode-first flow:** `Choose Mode → Choose Unlocked Track →
  Configure Rules → Start`. Retain the current animated 3D track previews,
  vehicle scale, three-rival showcase, full-route maps and mobile usability.
- [ ] Use a compact, readable configuration panel rather than filling every
  track card with controls; allow mode descriptions, Restore Defaults and a
  preview/summary of active rules before Start.
- [ ] Disable or explain unsupported combinations (e.g. lap count on open
  sprint, elimination with 0 AI, no-flight over mandatory bridge gaps,
  checkpoint in unreachable aerial areas).
- [ ] Add appropriate pre-race options for AI 0–3, AI difficulty, traffic
  density, pickups, collision severity, Ghost, stage count, timed duration,
  cosmetic scenery/weather, item rules, and per-mode eligibility.
- [ ] Saved user presets must not alter unlocks, reward eligibility or
  existing `skyline-rush-controls` / `skyline-rush-history` formats.
- [ ] All labels, option descriptions, countdowns, HUD outcomes, tooltips,
  error messages and results are localized in **English and zh-TW**, live
  switchable without changing stable track/mode IDs.
- [ ] Preserve keyboard, pointer and mobile touch navigation, visible focus,
  readable contrast, safe-area layout and reduced-motion/Comfort settings.

### 10B. Honest laps versus repeated sprints (P2)

- [x] **LAP-01 — Separate session types:** support multi-stage/repeated
  **point-to-point** sprints first (P0/P1), and label them “Stage 1/3”,
  not “Lap 1/3”. The original 10 tracks must keep their authored geography.
- [ ] **LAP-02 — Genuine closed circuits:** author at least one actual loop
  whose start/finish world position, tangent, road banking and width connect
  continuously; do **not** fake it with instant distance wrap.
- [ ] **LAP-03 — Configurable 1 / 3 / 5 laps** only on circuits with a valid
  topology; lap timer, personal best lap, total race time, split sectors,
  lap HUD, AI lap standings and finish sequence.
- [ ] **LAP-04 — Anti-shortcut checkpoints:** ordered sector validation
  prevents crossing the finish backwards, flying over the finish repeatedly,
  teleports or respawns from granting false laps.
- [ ] **Acceptance:** completion requires the configured number of valid
  laps; player/AI cameras, positions, world props, mini-route map, Ghost,
  checkpoints and collision physics remain continuous across every seam.

### 10C. Result/history isolation and safeguards (P0)

- [x] Store a stable `modeId + trackId + rulesVersion + rulesSignature` on
  each **new-mode** result, plus appropriate time, score, distance,
  stage/lap data and item/hazard statistics. Keep legacy history readable.
- [x] Show per-mode bests, mode-filtered History and applicable Ghosts;
  clearly distinguish personal practice milestones from official medals.
  Verified 2026-10-24: 10C History WebGL browser regression, mode-focused tests,
  full unit suite and production build passed on `cc24bb8c` (CI `40071240211`).
  English/zh-TW notice, filters, PB and Ghost badges have complete translations;
  unrelated full-browser CI shards and hardware QA remain tracked independently.
- [x] Use validated persistence with storage-failure fallbacks, reasonable
  caps and migration tests; prevent a custom “no traffic” best from
  replacing an official Classic best.
- [ ] Keep Classic Career unlocks, 1–3 stars, Garage paint unlocking,
  achievements and Daily Challenge board isolated from custom/free-drive
  sessions unless a specific future rule explicitly grants eligibility.
- [ ] Pausing, restarting, exiting, switching modes or closing a dialog
  cannot double-write a result or award the same benefit twice.

**10C versioned mode records (2026-10-23):** RED
[`e3581a7`](https://github.com/weskao/skyline-rush/commit/e3581a704557506d5dcb669b3ad253d8a10c6281)
([Actions #39945181620](https://github.com/weskao/skyline-rush/actions/runs/39945181620));
GREEN [`d25d025`](https://github.com/weskao/skyline-rush/commit/d25d0252dba9d0aac2ab691a090dbc5fdc6582cc)
([Actions #39945279475](https://github.com/weskao/skyline-rush/actions/runs/39945279475)).
New-mode runs store additive `modeId`, `trackId`, `rulesVersion`,
`rulesSignature`, finite distance, sprint stage count (no fake circuit laps),
bounded item activations and hazard statistics. Legacy records remain readable;
no new storage key or changed best comparison; Classic history and unlocks
remain isolated. Focused and full unit tests, production build, and two
real desktop mode smoke tests passed. Other 10C UI/persistence acceptance
items remain open.

**10C storage safety TDD (2026-10-23):** RED
[`d78e717`](https://github.com/weskao/skyline-rush/commit/d78e7178ef0314dd5f87eb224f12b0d72c59329d)
([CI #39947103275](https://github.com/weskao/skyline-rush/actions/runs/39947103275))
exposed invalid saved mode history, overlong rule strings and impossible
new-mode records. GREEN
[`3d4a5a8`](https://github.com/weskao/skyline-rush/commit/3d4a5a89cce60fab595ac1c1e7b4c9a23d6dda09)
([CI #39947280443](https://github.com/weskao/skyline-rush/actions/runs/39947280443)):
preserve legacy v1 records without newer metadata, filter non-existent
tracks/bad positions/nonfinite or negative scores, cap times and rules,
retain 50 latest valid runs and fail safely when storage is blocked.
New-mode custom/no-traffic results cannot replace official Classic bests
or unlocks. Focused/unit/build/real browser mode smoke all pass.

## 11. Interactive scenery, track hazards and procedural world props

### 11A. Data model and runtime behavior (P1)

- [ ] **ENV-01 — Typed object catalog:** separate
  **visual-only scenery** (buildings, crowds, parked trains, signs, lamps,
  spaceships) from **collidable / triggerable gameplay objects**.
- [ ] **ENV-02 — Deterministic hazard schema:** define bounded properties
  such as `id`, `trackId`, `distance`, `lateralOffset`, `altitude`,
  `type`, `hitbox`, `triggerWindow`, `warningLeadSeconds`,
  `movementPattern`, `difficulty` and `seed`.
- [x] **ENV-03 — Logic/render separation:** calculate hits, passes,
  rewards and state changes in the pure simulation (`src/game.js` or
  extracted rules module), not by reading Three.js mesh positions.
  Render exactly the hazard state described by the simulation.
- [ ] **ENV-04 — Hazard behaviors:** static cones/barricades, moving
  side-to-side gates, periodic energy barriers, falling debris/rocks,
  wind gusts, hazardous terrain, rotating rings, rail crossing events
  and safe/risky branch markers.
- [ ] **ENV-05 — Safety/readability:** visible anticipation cues, adequate
  reaction distance at maximum NITRO speed, accessible color+shape
  signals, a reachable escape route, and forgiving hitboxes on touch.
  Hazards must not randomly spawn inside the player.
- [ ] **ENV-06 — Reusable renderer:** pool or instance shared meshes and
  emitters, load/unload by visible distance with bounded chunk lifetime,
  no new material/geometry allocations every frame, and stable
  Low/Medium/High quality fallbacks.
- [ ] **ENV-07 — Play-mode switches:** allow hazards Off / Standard /
  Extreme only where a mode supports that option; Classic uses the
  existing base behavior until intentionally updated.
- [ ] **Acceptance:** deterministic placement, cross-frame collision
  sweeps, warning timing, out-of-range cleanup, no impossible gates
  and no device-specific simulation differences.

### 11B. Track-specific gameplay identities (P1)

- [ ] **Coast:** scattered cargo, gust warnings and temporary shoulder
  closures; combine clean high-speed overtakes with coastal visibility.
- [ ] **Neon Downtown:** animated construction barriers, temporary lane
  closures, traffic diversions and readable neon gate timing.
- [ ] **Canyon Skyway:** warned falling rocks, cliff-side debris,
  precision launch ramps and risk/reward routes over broken bridges.
- [ ] **Aurora Pass:** snowbanks, localized low-grip ice bends,
  timed blizzard visibility and safer alternative lines.
- [ ] **Sky Spiral:** rotating light hoops, synchronized aerial gates,
  changing platform barriers and airborne precision scoring.
- [ ] **Taipei Heritage:** festival street furniture, temporary
  boulevard closures and scenic props, while preserving landmark
  visibility and the existing curated ready-screen showcase.
- [ ] **Tokyo Afterdark:** traffic-control signals, timed gates,
  neon construction equipment and dynamic but fair crossing events.
- [ ] **Alpine Rail Pass:** avalanche warnings, snow drift obstacles,
  passing trains as scenery, and rail-crossing interactions **only**
  where real drivable-road geometry and clearance permit them.
- [ ] **Coastal Horizon:** wave-spray warning zones, crosswinds,
  lighthouse-side narrow bridge obstacles and safe shoulder routes.
- [ ] **Cosmic Orbit:** floating asteroid fragments, moving energy
  barriers, low-gravity sectors and aerial gate sequences.
- [ ] **Acceptance:** every themed hazard has at least one collision/
  reward test and an in-game desktop + mobile visual check; never let
  hero landmarks or scenery block the route unexpectedly.

### 11C. More visual world richness (P1)

- [ ] Add **non-colliding** per-track detail sets: spectators, billboards,
  parked service vehicles, rail platforms, moving background trains,
  signs, drones/ships, coastline spray, atmospheric lights and skyline
  animation. Reuse `world-tour-scenery.js` placement planning, batching
  and chunk lifecycle when applicable.
- [ ] **Weather/time-of-day presets:** daylight, dusk, night, rain/fog,
  snowfall or aurora where stylistically appropriate; start with
  visual-only overrides. Treat physical wet-grip/wind changes as
  opt-in, independently tested rules rather than surprise difficulty.
- [ ] Respect `track-showcase.md`: every new or changed course ready
  screen must still show the player, three rivals, visible jets,
  appropriate chase camera and recognizable track world.
- [ ] Degrade particle density, transparent overlays and shadow/light
  count on weak hardware without removing essential hazard silhouettes
  or necessary traffic warnings.

## 12. Items, pickups, active inventory and bonus challenges

### 12A. Turn current ring effects into optional active items (P1)

- [ ] **ITEM-01 — Single item slot:** pick up and hold one active item;
  show icon, ready/held state, cooldown and an accessible Activate
  action on keyboard and touch. Keep NITRO and FLY/BOOST as separate
  systems; do not overload existing controls without remapping.
- [ ] **ITEM-02 — Shield:** reuse existing “absorb one collision” effect
  as a held/triggerable item, with a clear hit/expiration state.
- [ ] **ITEM-03 — Magnet:** reuse current timed pickup attraction,
  with an optional active duration and visible radius indicator.
- [ ] **ITEM-04 — Ghost:** reuse short traffic phasing with explicit
  cooldown; it must not let players pass invalid lap checkpoints.
- [ ] **ITEM-05 — Freeze:** reuse temporary rival slowdown only in modes
  with AI; provide a harmless conversion/fallback in solo events.
- [ ] **Acceptance:** no unintended double-stacks or unbounded
  durations, correct activation order and no change to existing
  mystery-ring payouts in Classic mode.

### 12B. Additional pickups and interactive pads (P1/P2)

- [ ] **ITEM-06 — Precision speed strips / Energy Gates:** reward
  accurately crossing a boost pad or flight gate; apply capped,
  readable acceleration or thruster recharge.
- [ ] **ITEM-07 — Air recharge pads:** restore a bounded share of
  FLY energy mid-flight, making aerial precision lines worthwhile.
- [ ] **ITEM-08 — Repair / recovery pad:** temporarily mitigate
  one obstacle's speed loss or restore a limited resource without
  erasing official collision counts.
- [ ] **ITEM-09 — Score multiplier token:** temporary style-combo
  bonus in Stunt/Checkpoint modes; cap multipliers and prevent
  overlapping infinite reward loops.
- [ ] **ITEM-10 — EMP Pulse (P2):** short-range rival disruption
  exclusive to suitable competitive rule sets; clear fair warning
  and no effect on player control accessibility.
- [ ] **ITEM-11 — Mode item rules:** Off / Classic Mystery Rings /
  Active Items / All Items. Resolve item positions from seeded
  streams and never place important rewards inside impossible gaps.
- [x] **New-mode procedural audio (2026-10-22):** original Web Audio music loops
  for Checkpoint Rush, Stunt Attack, Obstacle Run, Championship and Free Drive;
  one-shot gate/challenge/near-hazard/Combo/landing cues, bounded event transitions,
  separate music/SFX volume controls and unit tests (`src/mode-audio.js`,
  `src/audio.js`, `tests/audio.test.js`, `tests/mode-audio.test.js`).
  This does **not** complete ITEM-12's future active-item effects or special pickup visuals.
- [ ] **ITEM-12 — Visual/audio feedback:** unique item outlines,
  landing sparks, pickup beams, cooldown audio and special hit FX
  that reuse `src/effects.js`, `src/audio.js` and comfort settings.
- [ ] **Acceptance:** item effects, caps, cooldowns, pickups, misses,
  blocked storage, mode restrictions and touch button layout have
  unit/browser coverage.

### 12C. Extra replayability and optional presentation (P2)

- [ ] **PHOTO-01 — Photo / Showcase mode:** in paused Free Drive,
  orbit the camera, hide HUD, adjust compatible time/weather presets
  and export a browser-generated screenshot where supported;
  do not claim cloud storage or full replay video without a backend.
- [ ] **REPLAY-01 — Expanded challenge medals:** clean checkpoint
  chain, longest flight, zero-collision time trial, best aerial
  combination and themed gauntlet completion; keep separate from
  existing four Career medals.
- [ ] **REPLAY-02 — Personalized challenge presets:** remember a
  few recent custom-rule setups and allow duplicate/retry from the
  results screen without modifying the base track.
- [ ] **REPLAY-03 — Risk/reward course lines:** alternate ground and
  aerial targets that give more score or item charge at higher
  difficulty, with hazards and scoring that can be disabled for
  straightforward practice.

## 13. Implementation order, test plan and release gates

### 13A. Recommended milestones

1. **P0-A / Foundation:** `RaceConfig`, schema validation, explicit
   objectives, rule signatures, legacy compatibility and progression
   separation (9A, 10C).
2. **P0-B / Player setup:** accessible mode-first selector,
   pre-race options, presets and localization (10A).
3. **P0-C / First playable modes:** Custom Race, Time Attack and
   Free Drive v1; per-mode History and safe results (9B–9D).
4. **P1-A / Built on existing systems:** Stunt Attack, Checkpoint Rush
   and Championship; multi-stage **sprints**, not fake laps (9E–9G).
5. **P1-B / Hazards and world detail:** typed obstacle contract,
   first two obstacle families, art/performance tests, then all
   10 distinct track-specific sets (9H, 11).
6. **P1-C / Items:** one-slot active inventory, reuse Shield/Magnet/
   Ghost/Freeze, then new pads/bonuses (12A–12B).
7. **P2-A / Long-term modes:** Elimination, true closed-circuit laps,
   streamed Endless Highway and Event Lab Lite (9I–9K, 10B).
8. **P2-B / Polish:** photo mode, bonus medals and user presets (12C).

### 13B. File ownership and coding rules

- [ ] Keep core deterministic rules in `src/game.js` or focused pure
  imported modules; test in `tests/game.test.js` and new
  mode/hazard/item unit-test files as needed.
- [ ] Keep rendering, moving obstacles, shaders and scenery in
  `src/world.js`, `src/world-tour-scene.js` and appropriate modules
  under `src/`; don't clone the renderer once per new mode.
- [ ] Keep mode-selection UI in `src/App.vue` and screen flow in
  `src/main.js`; maintain the project's existing static Vue shell /
  imperative HUD integration unless separately refactored.
- [ ] Keep per-mode records, migration, eligibility and safe storage
  in `src/history.js` (or small companion modules); route topology
  in `src/track-paths.js`; device inputs in `src/input.js`.
- [ ] Do not weaken `.claude/rules/unlock-separation.md` or use
  runtime/dev query toggles for shipped content: unlocked-track
  testing remains local-only through existing Vite alias rules.
- [ ] Keep `README.md` and `README.zh-TW.md` consistent if game
  documentation changes. Maintain `CLAUDE.md` and scoped rules
  only when real implementation conventions change.

### 13C. Mandatory acceptance and performance (all new features)

- [ ] **Correctness:** tests for 0/1/3 AI, seeded hazard determinism,
  item disabled, Ghost compatibility, checkpoint/lap order, time
  expiry, stage ties, restart/exit, storage failures and score
  eligibility. Include no NaNs, invisible collision objects or
  unreachable objective sequences.
- [ ] **Classic regression:** original 10 tracks, Daily Challenge,
  Garage stars/unlocks, medals, best Ghosts, NITRO/FLY/BOOST,
  air tricks, camera, performance notice and save migration.
- [ ] **Responsive:** Playwright desktop 1440×900 and touch phone
  390×844, 320×740 and landscape 844×390; no HUD/touch control
  overlap, focus traps or offscreen Start/Exit actions.
- [ ] **Motion & accessibility:** comfortable/reduced-motion,
  low/medium/high visuals, color-independent hazard telegraphs,
  touch hit targets, keyboard remapping and screen-reader
  labels on important buttons.
- [ ] **Performance:** bounded spawned/active objects, chunk
  evictions, fixed update/simulation behavior, and before/after
  `?perf` p50/p95/fps comparison on desktop and **real** midrange
  Android Chrome + iPhone Safari when available. Simulator results
  are not substitutes for phone GPU testing.
- [ ] **Verification:** `npm test` + `npm run build` for all logic
  or progression changes; also `npm run test:browser` for any
  UI, rendering, controls or unlock visibility changes. Ensure
  production build excludes local-only unlock wiring.
- [ ] **Delivery:** implement on a feature branch unless the user
  explicitly requests direct `main` changes; review and mark
  individual tasks `[x]` only after implementation and tests.

### 13D. Inspiration and design references

- **Mario Kart World:** Free Roam and custom VS-style rules — adapt
  settings, not copyrighted tracks/characters.
- **Forza Horizon 5 EventLab:** rule presets, track props and event
  creation — begin with a small, validated object library.
- **Trackmania:** time trials, ghosts, stunt/platform challenges,
  checkpoint precision and eventually authored looped circuits.
- **Hot Wheels Unleashed 2: Turbocharged:** modular hazards, jumps,
  obstacle timing and arcade risk/reward.

Reference entry points:
[Mario Kart World](https://www.nintendo.com/us/gaming-systems/switch-2/featured-games/mario-kart-world/) ·
[Forza](https://forza.net/) ·
[Trackmania](https://www.trackmania.com/) ·
[Hot Wheels Unleashed 2](https://hotwheelsunleashed.com/).

**Scope reminder:** This is a backlog, not a claim that features exist or are
approved for implementation. Preserve the earlier completed work and
never conflate future modes with existing Control “steering mode” options.
