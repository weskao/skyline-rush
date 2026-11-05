# Phase 0 Environment Audit — mac-primary — 2026-11-05
- Device model name: UNVERIFIED (written only after all Required PASS)
- Privacy: LOCAL ONLY / gitignored / never commit or push
- OS / CPU: macOS (Darwin), arm64
- Branch / HEAD before = after: feature/3d-visual-fidelity-pipeline / 649a4b22 (tree clean before and after; install left package.json + lockfile unchanged)
- Agent clients tested: Claude Code 2.1.318, Codex CLI 0.166.0

| ID | Req | Result | Evidence |
|----|-----|--------|----------|
| E01 | Required | PASS | pwd = checkout, origin = weskao/skyline-rush, branch + HEAD above |
| E02 | Required | PASS | node 25.9.0 (>=22.20), npm 11.12.1 |
| E03 | Required | PASS | Blender 5.2.3 LTS, --background bpy OK |
| E04 | Required | PASS | uvx 0.12.3, claude 2.1.318 |
| E05 | Required | PASS | BLENDER_MCP_ENABLED=True |
| E06 | Required | FAIL | project .mcp.json registered + Connected (uvx mcp-for-blender@2.2.7); BUT `claude mcp list` reports a conflicting USER-scope "blender" (unpinned `uvx mcp-for-blender`); global ~/.codex/config.toml also has [mcp_servers.blender] |
| E07 | Required | NOT VERIFIED | Blender GUI running, port 9876 listening; but no Blender MCP tools were loaded in this session nor in a fresh `claude -p` session (project MCP likely needs interactive approval via /mcp). No live tool call made |
| E08 | Required | PASS | .claude/skills/blender-image-to-3d/SKILL.md present; fresh `claude -p` session listed the skill |
| E09 | Required | FAIL | 13 ~/.claude/skills/threejs-* entries are DANGLING symlinks -> ~/.agents/skills/threejs-* (target missing); fresh session lists no threejs-* skill |
| E10 | Required | PASS | three 0.180.0 installed, ^0.180.0 in package.json; typecheck scripts pin @types/three@0.180.0 (@types/three was extraneous before; no upgrade) |
| E11 | Required | PASS | audits/ ignored (.gitignore:24); git ls-files audits/ = 0; no personal paths in tracked files (lockfile excluded from scan) |
| E12 | Required | PASS (read-only) | gh: CI on exact HEAD 649a4b22 = completed/success (docs CI does not prove Mac tools) |
| E13 | Required | PASS | node scripts/install-gltf-transform.mjs -> "E13 PASS: gltf-transform 4.5.1, smoke 3448 B -> 3364 B"; npm ls @gltf-transform/cli@4.5.1; --version 4.5.1 |
| E14 | Required | FAIL | project .codex/config.toml has [mcp_servers.blender] (pinned 2.2.7); `codex mcp list` shows blender enabled but sourced from/duplicated by global config; no live Codex call |
| E15 | Conditional | N/A (pending owner approval) | no asset download needed in Phase 0 |

- Final verdict: BLOCKED (E06, E09, E14 FAIL; E07 NOT VERIFIED)
- Exact-HEAD CI: success for 649a4b22

## Re-check 2026-11-06
- E06: PASS — user-scope Claude entry gone (conflicts=0, `claude mcp get blender` = Project config, Connected); global Codex entry removed (0 matches); OpenCode global entry removed (restored from Aug-24 backup, valid JSON, mcp keys: codegraph, github, notion, pencil, telegram-mcp).
- E14: still NOT VERIFIED — `codex mcp list` shows blender from project `.codex/config.toml` only; no live Codex scene call yet.
- E07: NOT VERIFIED — read-only Blender tools denied in project settings.local.json (hand-off script provided); needs new session + /mcp approval.
- E09: FAIL — 4 of 13 threejs-* skills resolve; 9 still dangling.
- Verdict: BLOCKED

## E11 scan 2026-11-06 (HEAD f60d8444)
- audits/ ignored (.gitignore:24), 0 tracked report files.
- Tracked files: no personal home paths (only CLAUDE.md placeholder rule text), no key/token prefixes (sk-, ghp_, ghs_, AKIA, private-key blocks). Test fixtures use synthetic player@gmail.com. Generic model labels only ("Mac mini"), no hostname/serial.
- One public Firebase web apiKey in src/cloud-save.ts (owner decision pending: keep/mask/remove).
- E11: PASS pending key decision. E12: no GitHub Actions run exists for f60d8444 (pushed; branch CI may skip docs-only) -> PENDING, not Passed.
- E07 still blocked: blender read-only tools still in permissions.deny.

## E07 2026-11-06
- E07: PASS — after un-denying get_scene_info/get_addon_status in project settings.local.json, a fresh `claude -p --mcp-config .mcp.json` session in the project called mcp__blender__get_scene_info (read-only) and returned Scene with 3 objects: Cube (mesh), Light (light), Camera (camera); Object mode, nothing modified.
- Remaining: E14 live Codex call (owner reports PASS, not independently re-run here), E09 (9 dangling threejs-* skills), E11 key decision, E12 CI for f60d8444 pending.
- Verdict: BLOCKED

## Final 2026-11-06 (HEAD f60d8444)
- E09: PASS — 13/13 threejs-* resolve (0 dangling); fresh claude -p session lists all 13. r186-targeted skill examples must not override r180 production APIs (project rule); react-three-fiber skill installed but unused (Vue project).
- E11: PASS — owner decision: keep the public Firebase web apiKey in src/cloud-save.ts (client-side by design; restrict in Google Cloud console).
- E12: PASS (read-only) — Actions run for exact HEAD f60d8444: completed/success (push). Docs-only runs skip suites; this does not prove Mac tools.
- E14: PASS — fresh `codex exec -s read-only` in project called mcp__blender__get_scene_info: Scene, 3 objects (Cube mesh, Light light, Camera camera); global Codex/OpenCode/Claude-user Blender entries removed.
- E15: moved to Phase 2 by owner (N/A for Phase 0).
- All Required E01–E14 PASS.
- Device model name: MacBook Pro
- Final verdict: READY FOR PHASE 1
