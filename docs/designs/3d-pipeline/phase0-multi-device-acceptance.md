# Skyline Rush — Phase 0 跨裝置環境驗收標準（Reusable / Self-contained）

**Status:** 可直接重複使用的檢查規格；**不是已通過驗收的報告**。  
**Applicable:** macOS Apple Silicon / Intel；其他支援 Blender、Claude Code 的 Linux / Windows 工作站可依各平台命令檢查。  
**Repository:** https://github.com/weskao/skyline-rush  
**Working branch:** `feature/3d-visual-fidelity-pipeline`  
**Scope:** 只做環境檢查、必要且經同意的環境修復，以及**留在本機且受 .gitignore 排除的驗收報告**；公開 Repository **不得包含任何裝置專屬報告或敏感資訊**。**不**升級 Three.js、不製作 3D 模型、不修改遊戲、不開 PR、不 merge、不 deploy、不 force push。

> 這份文件包含目的、命令、判定準則、異常處理、紀錄表與 AI 執行 Prompt，可在每台裝置獨立使用；不需要先讀其他文件才能理解驗收條件。但在修改 Repo 時仍須遵守 `AGENTS.md`、`CLAUDE.md` 及 `docs/regression-first-workflow.md`。

## 1. 每台裝置必須獨立驗收

- 在**執行檢查的本機**收集證據，不能用別台 Mac 的結果替代，不能把「使用者說已安裝」等同 PASS。
- 使用 **Device Alias**（如 `mac-mini`、`macbook-pro`、`windows-workstation`），不得將序號、帳號、Token、家目錄私密檔完整內容上傳。
- **Workspace 可自行指定**。macOS 預設為 `~/Documents/Workspace/skyline-rush`，但可設定 `SKYLINE_RUSH_DIR`；不得假設每台裝置相同。
- Global/User-scope 是相對於**該裝置的使用者帳號**，例如 `~/.claude/skills/`。Blender MCP 則只設於本專案 Claude `.mcp.json` 和 Codex `.codex/config.toml`，不設為任何 AI agent 的 global MCP。
- 一台裝置通過，不代表另一台通過。更換 Blender、Node、CLI、Skills、MCP 設定或 Three.js 版本後，受影響的檢查須重新執行。
- 裝置報告寫到 **僅本機保留** 的 `docs/designs/3d-pipeline/audits/YYYY-MM-DD-<device-alias>.md`，由 `.gitignore` 排除；相同裝置重新檢驗可追加 run ID / 日期。**不可 commit/push、不可使用 git add -f，亦不可上傳原始 logs 或憑證。** 不同裝置各自保存報告。
- 實際驗收全部必要項通過後，在**該裝置的本機報告**寫入一般型號名稱，如 `Mac mini`、`MacBook Pro`（不是 macOS「電腦名稱」或 hostname），並更新本機忽略檔 `docs/designs/3d-pipeline/audits/device-status.md` 的通過紀錄。未驗證時只寫 `UNVERIFIED`，不捏造裝置名稱。
- 僅公開可共用的規格、命令、匿名化測試方法；若後續需在 GitHub TODO 記錄進度，只可記錄通用的規劃狀態，**不得記錄實際裝置結果、名稱、版本清單、主機資料或本機路徑**。

## 1A. Public GitHub 安全規則（必要）

- **永遠不要公開**：序號、UUID、MAC/IP、主機名稱（hostname / Computer Name）、本機帳號、完整個人路徑、SSH key、Token、API key、MCP 設定原文、環境變數、網路端點、授權私有資產與原始 log。只在本機報告記錄驗證摘要；敏感輸出即使是 gitignored 檔案也應先遮蔽。
- **允許只在本機報告內記錄**：一般機型顯示名稱 `Mac mini`、`MacBook Pro`，必要的軟體版本、驗證時間、PASS / FAIL、簡短錯誤原因。
- macOS 取得「產品機型名稱」（不是 hostname）的安全範例：`system_profiler SPHardwareDataType | awk -F ': ' '/Model Name:/ {print $2; exit}'`。只儲存輸出的單行型號，不紀錄完整 `system_profiler` 輸出（其中可能含序號）。如果取得結果不可靠，寫 `MODEL_UNVERIFIED`，不能猜。
- 使用 `git check-ignore -v docs/designs/3d-pipeline/audits/example.md` 確認忽略規則生效；使用 `git ls-files docs/designs/3d-pipeline/audits/` 確認沒有被追蹤的裝置報告。注意：**.gitignore 不保護已被追蹤檔案**。若發現已追蹤或曾公開機密，停止推送並通知所有者先移除追蹤、撤銷可能暴露的憑證；不要以 .gitignore 聲稱機密已安全。
- 只允許針對已審查的公開規格做 GitHub Commit／Push。執行 Phase 0 時**不需為個別裝置新增任何 Git Commit**；禁止強制加入忽略檔（`git add -f`）。可以把匿名化摘要直接回報給本機操作者，但不要推到公開 GitHub。

## 2. 判定與簽核規則

| 狀態 | 定義 | 後續 |
|---|---|---|
| **PASS** | 這台裝置上實際執行檢查，輸出符合明確條件，附指令、版本、時間及觀察證據 | 可進入下一檢查 |
| **FAIL** | 實際檢查失敗、版本不符、Scope 錯誤或 MCP 工具不能工作 | 修復後**重新執行同一檢查**，保留前後結果 |
| **NOT VERIFIED** | 未執行、權限不足、無法存取裝置、缺少可核對輸出，或只有自述 | 不得推定 PASS |
| **N/A (approved)** | 明確非本裝置所需，例如未安裝／不使用 Codex；由負責人確認 | 記錄理由、確認者及日期，不計入必要項失敗 |

**最終狀態：**
- `READY FOR PHASE 1`：表中全部 **Required** 項為 PASS；**Conditional** 項在需要該功能時 PASS，否則有明確核准的 N/A；檢查報告已提交至正確分支，CI 狀態如實記錄。若計畫要用 Blender MCP 建模，必須另有 Live Blender MCP PASS，不能只見到已安裝。
- `BLOCKED`：有任何 Required FAIL / NOT VERIFIED，或需要 Blender MCP 而 live tool call 失敗；未完成的 Phase 0 TODO 不得勾選。
- **CI 不會驗證你的 Mac**：只有該台裝置上的真實命令與 MCP 呼叫可證明本機環境。docs-only CI green/skipped 不等於 Mac PASS。

## 3. 驗收矩陣（每台裝置都重新填寫）

| ID | 必要性 | 檢查項目 | PASS 的客觀條件 |
|---|---|---|---|
| E01 | Required | Workspace / Git / 分支 | `pwd` 指向實際 checkout，repo remote 正確，位於指定 branch；未提交變更獲保留，已記錄 HEAD SHA |
| E02 | Required | Node / npm | `node --version` >= 22.20.0，`npm --version` 正常；不得只依據 package.json 的 >=22.12.0 |
| E03 | Required | Blender GUI / CLI | 能找到 Blender 可執行檔、取得版本；`--background --python-expr` 成功呼叫 bpy |
| E04 | Required | uv / uvx / Claude CLI | `uvx --version`、`claude --version` 均成功；命令路徑可解析 |
| E05 | Required | Blender Add-on installed + enabled | 以 Blender `bpy.context.preferences.addons` 確認 `blender_mcp` 啟用；安裝檔存在但未啟用是 FAIL |
| E06 | Required | Blender MCP project scope | `claude mcp get blender` 顯示 project-scope 註冊；確認 executable 可執行，並核對各已安裝 AI agent 的 global Blender MCP 已移除 |
| E07 | Required | Blender MCP **live read-only call** | 開啟 GUI Blender，透過 Claude **實際呼叫 Blender MCP tool** 列出當前 Scene 的物件名稱/類型；工具回傳而非虛構的示例文字 |
| E08 | Required | 專案 blender-image-to-3d Skill | `.claude/skills/blender-image-to-3d/SKILL.md` 存在，並在此專案的新 Claude CLI session 可被調用／辨識；不安裝至 global |
| E09 | Required | 全域 Three.js Skills | `~/.claude/skills/threejs-*/SKILL.md` 具備合適的 loaders/materials/performance/asset-pipeline Skill，global 可見；明確指出 r186 Skill 範例不能直接覆蓋 r180 production API |
| E10 | Required | Three.js baseline / Types | 在指定 branch 的 `package.json`、lockfile及實際 npm 安裝版本可核對（若未 npm ci，標示依賴未安裝），不提前升級到 r186；檢查 typecheck scripts 是否仍引用 r180 |
| E11 | Required | 公開 Repo 隱私與版控 | `.gitignore` 排除 `docs/designs/3d-pipeline/audits/`；`git check-ignore -v` 顯示正確規則，`git ls-files` 確認裝置報告未被追蹤；檢查目前受追蹤內容與新提交不含機器專屬資訊。歷史中的個人家目錄路徑不列為驗收阻擋，不因而改寫歷史；若發現憑證等機密外洩，仍依第 1A 節處理 |
| E12 | Required | CI 狀態檢視（唯讀） | 若有 GitHub 權限，核對分支最新 exact-HEAD Actions run、SHA、結果；若尚未完成或沒有存取權，記錄 PENDING / NOT VERIFIED，不能說 Passed；不因裝置檢查而自行 Push 觸發 CI |
| E13 | Required | glTF Transform CLI | `npm ls @gltf-transform/cli` 顯示專案 devDependency 精確固定 `4.5.1` 且 lockfile 已記錄；`npx --no-install gltf-transform --version` 輸出 4.5.1；對 Blender 匯出的測試 GLB 成功執行 `inspect` 與 `optimize --compress meshopt`。僅全域安裝不算 PASS |
| E14 | Required | Codex project MCP/Skill | 本專案須確認 `.codex/config.toml` 註冊、`codex mcp list` 可見且實際連線；不能用 global 註冊代替 |
| E15 | Conditional | Blender 資產取得與授權 | 若需要下載/使用現成測試素材：驗證來源、license 和磁碟空間；否則 N/A approved |

Phase 0 要求安裝並驗證 glTF Transform（E13，安裝命令見第 6 節第 5 點與 `toolchain-environment-preflight.md`）；不要求下載素材，若本次不需資產操作，E15 可經負責人核准標為 N/A，留到後續實作有需要時再下載及驗證授權。KTX2 貼圖輸出所需的外部 `toktx` 不屬 Phase 0，Phase 2 選用 KTX2 時才安裝。

**重要：** E07 明確要求 **MCP 工具呼叫本身成功**。不接受只看到 `claude mcp list`、`BLENDER_MCP_ENABLED=True` 或 Blender 視窗就宣告 PASS。E08/E09 亦不能只看目錄，需確認新 session 能辨識。

## 4. macOS / Linux（bash/zsh）只讀檢查指令

在 Terminal 執行以下命令；**不修改任何全域設定，也不升級套件**：

```bash
export SKYLINE_RUSH_DIR="${SKYLINE_RUSH_DIR:-$HOME/Documents/Workspace/skyline-rush}"
cd "$SKYLINE_RUSH_DIR" || exit 1
pwd
git remote -v
git status --short
git branch --show-current
git rev-parse HEAD

uname -s
uname -m
command -v node && node --version
command -v npm && npm --version
command -v uvx && uvx --version
command -v claude && claude --version
command -v codex && codex --version || true

# 若 Blender 不在 PATH，macOS 常見 app 路徑如下；允許自訂 BLENDER_BIN。
BLENDER_BIN="${BLENDER_BIN:-$(command -v blender 2>/dev/null)}"
if [ -z "$BLENDER_BIN" ] && [ -x /Applications/Blender.app/Contents/MacOS/Blender ]; then
  BLENDER_BIN=/Applications/Blender.app/Contents/MacOS/Blender
fi
if [ -n "$BLENDER_BIN" ]; then
  "$BLENDER_BIN" --version | head -n 2
  "$BLENDER_BIN" --background --python-expr "import bpy; print('BYPY_OK=' + bpy.app.version_string); print('BLENDER_MCP_ENABLED=' + str('blender_mcp' in bpy.context.preferences.addons))"
else
  echo "BLENDER_BIN_MISSING"
fi

# 只檢查路徑，不能替代 Skill loaded 測試。
test -f "$SKYLINE_RUSH_DIR/.claude/skills/blender-image-to-3d/SKILL.md" && echo "BLENDER_SKILL_FILE=present" || echo "BLENDER_SKILL_FILE=missing"
if [ -d "$HOME/.claude/skills" ]; then
  find "$HOME/.claude/skills" -maxdepth 2 -name SKILL.md -print | grep -E 'blender-image-to-3d|threejs-' || true
fi
npx skills list -g -a claude-code
claude mcp list
claude mcp get blender
codex mcp list || true
npm ls three @types/three @gltf-transform/cli --depth=0 || true
npx --no-install gltf-transform --version || true
df -h .
```

**輸出安全：** `git remote -v` 及 MCP 清單可能含憑證／私有端點。由 Agent 在本機判讀，**不要提交或貼到公開 repo**；本機報告也只寫已遮蔽的 owner/repo、server 名稱、Scope、成功／失敗等摘要，不附原始設定或 Token。

**Live test（必須另外執行）：** 在 Blender GUI 開啟任意工作場景並確認 MCP Server 已啟動，在 **新的 Claude Code session** 發出「請使用 Blender MCP 工具，以唯讀操作列出目前場景所有物件的名稱、型別、位置，並告訴我你使用的是哪個 MCP 工具；不得新建或修改物件。」核對實際 Tool 回傳內容及場景；只給一般文字答案不算 PASS。

### Blender MCP 安裝、啟動與驗證（macOS）

以下在本專案執行；Blender add-on 由 Claude Code 與 Codex 共用，不須安裝兩次。這些步驟會修改 Blender 使用者外掛或偏好設定；先確認版本及現有安裝，已安裝且正常時不必重新安裝。技能仍依 E08／E09 的各自範圍安裝。

**固定版本：** Blender MCP Server 與 add-on 一律使用 `mcp-for-blender@2.2.7`（`.mcp.json` 與 `.codex/config.toml` 已固定），不使用未固定版本或 `@latest`。

1. 在 Terminal 檢查工具及外掛位置：

   ```sh
   cd "${SKYLINE_RUSH_DIR:-$HOME/Documents/Workspace/skyline-rush}" || exit 1
   command -v uvx
   uvx --version
   uvx mcp-for-blender@2.2.7 addon-paths
   ```

   `addon-paths` 只列出候選位置，不能證明已啟用。需要安裝或重新安裝時才執行：

   ```sh
   uvx mcp-for-blender@2.2.7 install-addon
   ```

   外掛更新後，先儲存 Blender 尚未儲存的工作，再重新啟動 Blender，以確保載入新版本。

2. 在 **Blender GUI** 開啟場景。若需要啟用或重新載入 add-on，按 `Shift+F4` 將目前區域切換成 Python Console，**逐行**執行：

   ```python
   import bpy
   bpy.ops.preferences.addon_disable(module="blender_mcp")
   bpy.ops.preferences.addon_enable(module="blender_mcp")
   bpy.ops.wm.save_userpref()
   ```

   若 add-on 尚未啟用，可略過 `addon_disable`；若操作報錯，先在 Blender Preferences 的 Add-ons 啟用 Blender MCP，再繼續。儲存偏好設定會影響此使用者的 Blender。Server 尚未啟動時，在同一個 Blender Python Console 執行：

   ```python
   bpy.ops.blendermcp.start_server()
   ```

   若 Server 已在運作，不要重複啟動。Terminal 的 `blender --background` 是另一個程序，不能用來啟動現有 GUI 視窗中的 Server。

3. 回到 Terminal 檢查預設連接埠與專案註冊，避免公開原始輸出：

   ```sh
   lsof -nP -iTCP:9876 -sTCP:LISTEN
   claude mcp get blender
   codex mcp list
   ```

   `lsof` 出現監聽程序只表示連接埠有人監聽；需確認是 Blender 使用的預設埠，且不能取代 MCP 工具呼叫。非預設埠需依實際設定檢查。Claude 應顯示 project scope；Codex 應從可信任專案的 `.codex/config.toml` 讀取 blender 設定。

4. Claude 專案註冊缺少時，從專案根目錄執行：

   ```sh
   claude mcp add --scope project blender -- uvx mcp-for-blender@2.2.7
   ```

   Codex 的專案設定是 `.codex/config.toml` 中的 `[mcp_servers.blender]`，其 `command = "uvx"`、`args = ["mcp-for-blender@2.2.7"]`；保留其他設定。不要執行會建立全域註冊的 `codex mcp add blender`。重新開啟 Claude Code 與 Codex session；在 Claude 輸入 `/mcp`，若出現專案信任或授權提示，由使用者確認。

5. 分別在新的 Claude Code 與 Codex session 要求 Blender MCP **唯讀列出場景物件名稱與類型**，核對實際工具呼叫與回傳。Claude 成功才算 E07 PASS；Codex 的專案註冊及成功連線才算 E14 PASS。`claude mcp list`、埠監聽或 add-on 啟用均不能代替 live call。

`uvx mcp-for-blender@2.2.7 setup` 會更動 MCP client 設定；`uvx mcp-for-blender@latest update` 會更新 Server 與 add-on。兩者均不是一般驗證必要步驟，執行前須檢查影響並維持本專案限定的 MCP 範圍；更新後重啟並重跑受影響的驗收。升級版本時，須同步修改 `.mcp.json`、`.codex/config.toml` 與本文件中的 `2.2.7`。

## 5. Windows / PowerShell 7 可重複檢查

在 Windows 上可重複相同的 E01–E15 條件；以下先檢查基本命令和使用者 Scope，然後用已確認的 Blender.exe 路徑執行與第 4 節相同的 `--background --python-expr`。**不要將 macOS 的 /Applications 路徑照抄至 Windows。**

```powershell
$Repo = if ($env:SKYLINE_RUSH_DIR) { $env:SKYLINE_RUSH_DIR } else { Join-Path $HOME "Documents/Workspace/skyline-rush" }
Set-Location $Repo
Get-Location
git remote -v
git status --short
git branch --show-current
git rev-parse HEAD
node --version
npm --version
uvx --version
claude --version
codex --version
Test-Path (Join-Path $Repo ".claude/skills/blender-image-to-3d/SKILL.md")
Get-ChildItem (Join-Path $HOME ".claude/skills") -Filter SKILL.md -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.FullName -match 'blender-image-to-3d|threejs-' } | Select-Object -ExpandProperty FullName
npx skills list -g -a claude-code
claude mcp list
claude mcp get blender
codex mcp list
npm ls three @types/three @gltf-transform/cli --depth=0
```

Set `$env:BLENDER_BIN` to the correct `blender.exe` path and run:

```powershell
& $env:BLENDER_BIN --background --python-expr "import bpy; print('BYPY_OK=' + bpy.app.version_string); print('BLENDER_MCP_ENABLED=' + str('blender_mcp' in bpy.context.preferences.addons))"
```

Windows 亦必須做 **GUI + Claude MCP live scene read**，不能僅憑 PowerShell 輸出跳過 E07。

## 6. FAIL 的修復原則

1. 先記錄錯誤指令、退出碼和清理敏感資料後的 stderr，再修復；所有原本存在的設定先備份。不能把任何 FAIL 改寫成未經驗證的 PASS。
2. **Skills（Blender 專案、Three.js 全域）**：確認 Node >=22.20；缺少時由使用者同意後執行 `npx skills add majidmanzarpour/blender-game-skills --skill blender-image-to-3d -a claude-code` 或 `npx skills add CloudAI-X/threejs-skills -g -a claude-code`。選擇所需 skills，不必安裝 React-specific 部分。
3. **Blender MCP（僅專案）**：以 `claude mcp add --scope project blender -- uvx mcp-for-blender@2.2.7` 設定 Claude；在專案 `.codex/config.toml` 的 `[mcp_servers.blender]` 設定相同命令。盤點並移除各 AI agent 的 global Blender MCP 註冊，保留其他 MCP；重新啟動 session 後驗證兩者的唯讀 live scene call。缺少 uvx 時才考慮安裝 uv。
4. **Blender Add-on**：依第 4 節的安裝、GUI 啟動與驗證流程操作。或在 Blender 完全關閉後，以下受控方式啟用 add-on（**會寫入使用者 Blender preferences**，不會啟動 GUI Server）：
   ```bash
   "$BLENDER_BIN" --background --python-expr "import addon_utils,bpy; addon_utils.enable('blender_mcp',default_set=True); bpy.ops.wm.save_userpref()"
   ```
5. **glTF Transform（E13，Required）**：`npm ls @gltf-transform/cli` 未顯示專案依賴時，於專案根目錄執行 `npm install -D --save-exact @gltf-transform/cli@4.5.1`（會更動 `package.json` 與 `package-lock.json`，須取得同意；不用全域安裝或 `latest`），再以 `npx --no-install gltf-transform --version` 與 Blender 匯出測試 GLB 的 `inspect`／`optimize --compress meshopt` 驗證。完整指令見 `toolchain-environment-preflight.md`。已在同一專案安裝過的裝置只需 `npm ci` 後重跑驗證。**不得因此升級 Three.js。**
6. **無 Mac 控制權限**：只提供對應本機可複製指令並標示 NOT VERIFIED；不得聲稱已完成，亦不得擅用未授權 Telegram/tgsend 發送。

## 7. 每台裝置的驗收報告範本

複製此範本至 **已加入 .gitignore 的本機目錄** `docs/designs/3d-pipeline/audits/YYYY-MM-DD-<device-alias>.md`。這份報告 **只存在目前裝置，不可 Commit/Push**，並且不要拿另一台設備的結果直接勾選。使用 `git check-ignore -v` 驗證路徑後才寫入。

```markdown
# Phase 0 Environment Audit — <device-alias> — YYYY-MM-DD
- Device alias: <non-sensitive local alias; do not use hostname>
- Device model name: UNVERIFIED (fill with e.g. Mac mini / MacBook Pro **only after** acceptance passes)
- Privacy: LOCAL ONLY / gitignored / never commit or push
- Operating system / CPU: <macOS / Linux / Windows, arch>
- Local date/time/time zone: <timestamp with timezone>
- Workspace: <generic workspace label, never absolute private home path>
- Repo branch / HEAD before / after: <branch and SHAs>
- Agent clients tested: Claude Code / Codex / other
- Auditor: <agent or human>
- Scope: project-scoped Blender Skill and MCP, user-global Three.js Skills; project game code not changed

| ID | Required / Conditional | Result PASS/FAIL/NOT VERIFIED/N/A | Version/scope | Actual command/evidence (redacted) | Repair + retest |
|----|------------------------|-----------------------------------|---------------|-----------------------------------|----------------|
| E01 | Required | NOT VERIFIED | | | |
| E02 | Required | NOT VERIFIED | | | |
| E03 | Required | NOT VERIFIED | | | |
| E04 | Required | NOT VERIFIED | | | |
| E05 | Required | NOT VERIFIED | | | |
| E06 | Required | NOT VERIFIED | | | |
| E07 | Required | NOT VERIFIED | | | |
| E08 | Required | NOT VERIFIED | | | |
| E09 | Required | NOT VERIFIED | | | |
| E10 | Required | NOT VERIFIED | | | |
| E11 | Required | NOT VERIFIED | | | |
| E12 | Required | NOT VERIFIED | | | |
| E13 | Required | NOT VERIFIED | | | |
| E14 | Required | NOT VERIFIED | | | |
| E15 | Conditional | NOT VERIFIED | | | |

- Live Blender MCP tool name + observed object count: <redacted evidence; no secrets>
- Outstanding blockers and exact owner executable commands: <details>
- Exact-HEAD GitHub CI link and status: <URL/status; never imply docs CI proves Mac tools>
- Device name written AFTER PASS: <actual non-identifying model name, or UNVERIFIED>
- Local-only inventory: docs/designs/3d-pipeline/audits/device-status.md (ignored)
- Final verdict: READY FOR PHASE 1 / BLOCKED
- Reviewer and approval for optional N/A: <name/alias and date>
```

## 8. 可直接給 Claude Code / Codex 的跨裝置 Phase 0 Prompt

> 在此裝置上執行 Skyline Rush 的 **Phase 0 only**。先從本機 `SKYLINE_RUSH_DIR`（預設 `~/Documents/Workspace/skyline-rush`）進入 Repo 的既有 `feature/3d-visual-fidelity-pipeline`，先讀取本獨立文件 `docs/designs/3d-pipeline/phase0-multi-device-acceptance.md`、`AGENTS.md` 與 `CLAUDE.md`。保留未提交的變更，不得 reset、force push、PR、merge、deploy 或改動遊戲／Three.js。
>
> **先做隱私保護：** 這是 PUBLIC GitHub repo。先用 `git check-ignore -v docs/designs/3d-pipeline/audits/example.md` 確認整個 `audits/` 目錄已被 `.gitignore` 排除，並用 `git ls-files docs/designs/3d-pipeline/audits/` 確認未追蹤任何報告。若不成立，先修正忽略規則，且不要繼續寫含裝置資訊的報告。嚴禁 Commit/Push 裝置報告、原始 log、環境變數、憑證、序號、hostname、macOS「電腦名稱」、私有路徑或 MCP 設定。
>
> 依 E01–E15 在**這台本機**逐項執行檢查並保留已遮蔽證據：Blender CLI/Background Python/Add-on 是否啟用；透過 Claude Code **實際 MCP 唯讀工具呼叫**列出 Blender 場景物件；Claude Code 與 Codex 的 project-scoped Blender MCP，以及各 AI agent 無 global Blender MCP；專案的 `blender-image-to-3d` 與 `~/.claude/skills/` 中的全球 `threejs-skills` 是否真正被 Agent 辨識；Node/npm/uvx；現行 Three.js/@types；glTF Transform；Codex 在此專案為必查。確認所有 PASS 都有實際命令、版本和輸出支持，不得用其他裝置結果替代。
>
> 缺少工具時先檢查版本、來源及現有設定，取得必要權限後只做最小修復並**重跑驗證**；無權限或無法連線時以 FAIL／NOT VERIFIED 記錄並給本機使用者可複製的指令，不虛構成功。
>
> 針對本機用非識別性 `device-alias` 建立**本機忽略的** `docs/designs/3d-pipeline/audits/YYYY-MM-DD-<device-alias>.md`，使用本文件表格記錄 E01–E15。驗收通過後，才使用例如 `system_profiler SPHardwareDataType | awk -F ': ' '/Model Name:/ {print $2; exit}'` 取得**產品型號名稱**（如 `Mac mini`、`MacBook Pro`，**不是 hostname／Computer Name**），填入這台裝置的本機報告，並更新同為 `.gitignore` 排除的 `docs/designs/3d-pipeline/audits/device-status.md`。若任一必要驗收失敗，裝置名稱保持 `UNVERIFIED`，最後標示 BLOCKED；當全部 Required 為 PASS，Conditional 為 PASS 或核准 N/A 時才標示 READY FOR PHASE 1。
>
> 最後在此裝置顯示驗收表、通過項目與失敗修復建議；檢查 GitHub Actions 最新 exact-HEAD 狀態（唯讀），不要把未執行或尚在排隊的 CI 說成通過。**不要為這台裝置 Push 任何含裝置資訊的內容**。本次不得升級 Three.js、建立模型或修改遊戲。

## 9. 相關規格（進一步詳細設計；非本文件必要依賴）

- `docs/designs/3d-pipeline/toolchain-environment-preflight.md`
- `docs/superpowers/plans/2026-11-04-3d-visual-fidelity-pipeline-plan.md`
- `docs/superpowers/specs/2026-11-04-3d-visual-fidelity-pipeline-design.md`
- `docs/designs/3d-pipeline/threejs-r180-r186-migration.md`
- https://github.com/ahujasid/mcp-for-blender
- https://github.com/majidmanzarpour/blender-game-skills
- https://github.com/CloudAI-X/threejs-skills
- https://github.com/donmccurdy/glTF-Transform
