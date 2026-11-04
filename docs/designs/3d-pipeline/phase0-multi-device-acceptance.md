# Skyline Rush — Phase 0 跨裝置環境驗收標準（Reusable / Self-contained）

**Status:** 可直接重複使用的檢查規格；**不是已通過驗收的報告**。  
**Applicable:** macOS Apple Silicon / Intel；其他支援 Blender、Claude Code 的 Linux / Windows 工作站可依各平台命令檢查。  
**Repository:** https://github.com/weskao/skyline-rush  
**Working branch:** `feature/3d-visual-fidelity-pipeline`  
**Scope:** 只做環境檢查、必要且經同意的環境修復，以及證據文件提交。**不**升級 Three.js、不製作 3D 模型、不修改遊戲、不開 PR、不 merge、不 deploy、不 force push。

> 這份文件包含目的、命令、判定準則、異常處理、紀錄表與 AI 執行 Prompt，可在每台裝置獨立使用；不需要先讀其他文件才能理解驗收條件。但在修改 Repo 時仍須遵守 `AGENTS.md`、`CLAUDE.md` 及 `docs/regression-first-workflow.md`。

## 1. 每台裝置必須獨立驗收

- 在**執行檢查的本機**收集證據，不能用別台 Mac 的結果替代，不能把「使用者說已安裝」等同 PASS。
- 使用 **Device Alias**（如 `mac-mini`、`macbook-pro`、`windows-workstation`），不得將序號、帳號、Token、家目錄私密檔完整內容上傳。
- **Workspace 可自行指定**。macOS 預設為 `~/Documents/Workspace/skyline-rush`，但可設定 `SKYLINE_RUSH_DIR`；不得假設每台裝置相同。
- Global/User-scope 是相對於**該裝置的使用者帳號**，例如 `~/.claude/skills/` 和 Claude MCP user scope；**不是**把 Skills/MCP 存入 `skyline-rush/.claude/skills/`。
- 一台裝置通過，不代表另一台通過。更換 Blender、Node、CLI、Skills、MCP 設定或 Three.js 版本後，受影響的檢查須重新執行。
- 報告命名建議：`docs/designs/3d-pipeline/audits/YYYY-MM-DD-<device-alias>.md`；同一天重新驗證可在該裝置報告追加新的 run ID / 時間，而不是覆蓋其他裝置的報告。必要時先把臨時輸出存本機非追蹤目錄，僅提交去敏感化摘要。

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
| E06 | Required | Blender MCP user scope | `claude mcp get blender` 顯示有效的 user-scoped 註冊，而非僅 repo-local 設定；確認 server executable 可執行 |
| E07 | Required | Blender MCP **live read-only call** | 開啟 GUI Blender，透過 Claude **實際呼叫 Blender MCP tool** 列出當前 Scene 的物件名稱/類型；工具回傳而非虛構的示例文字 |
| E08 | Required | 全域 blender-image-to-3d Skill | `~/.claude/skills/blender-image-to-3d/SKILL.md` 存在、列在 global Skill 清單，並在新 CLI session 可被調用/辨識 |
| E09 | Required | 全域 Three.js Skills | `~/.claude/skills/threejs-*/SKILL.md` 具備合適的 loaders/materials/performance/asset-pipeline Skill，global 可見；明確指出 r186 Skill 範例不能直接覆蓋 r180 production API |
| E10 | Required | Three.js baseline / Types | 在指定 branch 的 `package.json`、lockfile及實際 npm 安裝版本可核對（若未 npm ci，標示依賴未安裝），不提前升級到 r186；檢查 typecheck scripts 是否仍引用 r180 |
| E11 | Required | GitHub 版本控制與文件 | 僅在指定分支新增去敏感化裝置報告、更新 Phase 0 TODO；記錄 commit SHA/URL，沒有改動 develop/main/其他分支 |
| E12 | Required | CI 狀態 | 讀取本分支**最新 exact-HEAD** Actions run，記錄 Passed/Failed/Pending/Cancelled/Skipped-required 與 URL；不得引用舊 SHA 當作最新通過 |
| E13 | Conditional | glTF Transform CLI | 若 Phase 0 已要求資產操作：`npm ls @gltf-transform/cli` 與 CLI help/inspect 成功；否則記錄「Phase 2 才需 install」和 N/A approved，不可謊稱已安裝 |
| E14 | Conditional | Codex user-scope MCP/Skill | 只有此裝置需 Codex 時才必查；能從 `codex mcp list` 看見配置且實際連線，或核准 N/A |
| E15 | Conditional | Blender 資產取得與授權 | 若需要下載/使用現成測試素材：驗證來源、license 和磁碟空間；否則 N/A approved |

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
test -f "$HOME/.claude/skills/blender-image-to-3d/SKILL.md" && echo "BLENDER_SKILL_FILE=present" || echo "BLENDER_SKILL_FILE=missing"
if [ -d "$HOME/.claude/skills" ]; then
  find "$HOME/.claude/skills" -maxdepth 2 -name SKILL.md -print | grep -E 'blender-image-to-3d|threejs-' || true
fi
npx skills list -g -a claude-code
claude mcp list
claude mcp get blender
codex mcp list || true
npm ls three @types/three @gltf-transform/cli --depth=0 || true
npx --no-install gltf-transform --help || true
df -h .
```

**輸出安全：** `git remote -v` 如果 remote 使用含憑證的 URL，請在報告中只寫 owner/repo，移除憑證。MCP 清單若含私有 host、環境變數、Token 或設定值，也只能提交「server 名稱、Scope、連線結果」，不要附原始密鑰。必要時由 AI 在本機完成判讀後，只提交摘要。

**Live test（必須另外執行）：** 在 Blender GUI 開啟任意工作場景並確認 MCP Server 已啟動，在 **新的 Claude Code session** 發出「請使用 Blender MCP 工具，以唯讀操作列出目前場景所有物件的名稱、型別、位置，並告訴我你使用的是哪個 MCP 工具；不得新建或修改物件。」核對實際 Tool 回傳內容及場景；只給一般文字答案不算 PASS。

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
Test-Path (Join-Path $HOME ".claude/skills/blender-image-to-3d/SKILL.md")
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
2. **Skills（全域）**：確認 Node >=22.20；缺少時由使用者同意後執行 `npx skills add majidmanzarpour/blender-game-skills --skill blender-image-to-3d -g -a claude-code` 或 `npx skills add CloudAI-X/threejs-skills -g -a claude-code`。選擇所需 skills，不必安裝 React-specific 部分。
3. **Claude MCP（全域）**：先查已有註冊，必要時檢查本機 CLI `claude mcp add --help`，以 user scope 設定 `claude mcp add --scope user blender -- uvx mcp-for-blender`。避免覆蓋其他 MCP。缺少 uvx 時才考慮安裝 uv。
4. **Blender Add-on**：缺少時 `uvx mcp-for-blender install-addon`；若未啟用，先完整關閉 Blender 再用官方 `uvx mcp-for-blender setup` 或下列受控方式啟用（**會寫入使用者 Blender preferences**）：
   ```bash
   "$BLENDER_BIN" --background --python-expr "import addon_utils,bpy; addon_utils.enable('blender_mcp',default_set=True); bpy.ops.wm.save_userpref()"
   ```
5. **glTF Transform**：若未安裝、且 Phase 0 不需要實際資產工作，標記 Conditional/N/A 並於 Phase 2 處理；若本次需 smoke test，先確認是否授權更動 package/lockfile。**不得因 Phase 0 自動升級 Three.js。**
6. **無 Mac 控制權限**：只提供對應本機可複製指令並標示 NOT VERIFIED；不得聲稱已完成，亦不得擅用未授權 Telegram/tgsend 發送。

## 7. 每台裝置的驗收報告範本

複製此範本至 `docs/designs/3d-pipeline/audits/YYYY-MM-DD-<device-alias>.md`，並記錄該裝置每次檢查；不要拿一台設備的結果直接勾選另一台設備。

```markdown
# Phase 0 Environment Audit — <device-alias> — YYYY-MM-DD
- Device alias: <non-sensitive alias>
- Operating system / CPU: <macOS / Linux / Windows, arch>
- Local date/time/time zone: <timestamp with timezone>
- Workspace: <sanitized path>
- Repo branch / HEAD before / after: <branch and SHAs>
- Agent clients tested: Claude Code / Codex / other
- Auditor: <agent or human>
- Scope: user-global Skills and MCP; project code not changed

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
| E13 | Conditional | NOT VERIFIED | | | |
| E14 | Conditional | NOT VERIFIED | | | |
| E15 | Conditional | NOT VERIFIED | | | |

- Live Blender MCP tool name + observed object count: <redacted evidence; no secrets>
- Outstanding blockers and exact owner executable commands: <details>
- Exact-HEAD GitHub CI link and status: <URL/status; never imply docs CI proves Mac tools>
- Final verdict: READY FOR PHASE 1 / BLOCKED
- Reviewer and approval for optional N/A: <name/alias and date>
```

## 8. 可直接給 Claude Code / Codex 的跨裝置 Phase 0 Prompt

> 請在**你實際執行的本機裝置**，從目前 Skyline Rush checkout（預設 ~/Documents/Workspace/skyline-rush，若有 SKYLINE_RUSH_DIR 則優先）執行 GitHub 分支 `feature/3d-visual-fidelity-pipeline` 的 **Phase 0 only**。**先完整閱讀本文件** `docs/designs/3d-pipeline/phase0-multi-device-acceptance.md`，再依 E01–E15 逐項執行實際命令和 live Blender MCP read-only scene query；每項附版本、Scope、命令、觀測輸出及 PASS/FAIL/NOT VERIFIED/N/A。必要修復需先保留原設定、確認權限，修復後重新驗證。不要改 Three.js、模型、遊戲程式或其他分支。為目前**這台裝置**建立獨立、去敏感化的 `docs/designs/3d-pipeline/audits/YYYY-MM-DD-<device-alias>.md` 報告並更新 TODO.md 的**該裝置檢查狀態**，在指定分支 commit/push；對照最新 exact-HEAD CI。只有所有 Required PASS 和 Conditional 合理核准時才回報 READY FOR PHASE 1，否則明確回報 BLOCKED 及可複製的修復指令，不得以別台裝置結果替代。

## 9. 相關規格（進一步詳細設計；非本文件必要依賴）

- `docs/designs/3d-pipeline/toolchain-environment-preflight.md`
- `docs/superpowers/plans/2026-11-04-3d-visual-fidelity-pipeline-plan.md`
- `docs/superpowers/specs/2026-11-04-3d-visual-fidelity-pipeline-design.md`
- `docs/designs/3d-pipeline/threejs-r180-r186-migration.md`
- https://github.com/ahujasid/mcp-for-blender
- https://github.com/majidmanzarpour/blender-game-skills
- https://github.com/CloudAI-X/threejs-skills
- https://github.com/donmccurdy/glTF-Transform
