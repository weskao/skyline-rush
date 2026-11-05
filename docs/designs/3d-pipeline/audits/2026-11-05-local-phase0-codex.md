# Phase 0 Environment Audit — local — 2026-11-05

- Device alias: local
- Device model name: UNVERIFIED
- Privacy: LOCAL ONLY / gitignored / never commit or push
- OS / CPU: macOS / arm64
- Local time: 2026-11-05 23:39 CST
- Workspace: Skyline Rush
- Branch: feature/3d-visual-fidelity-pipeline
- HEAD before / after: 649a4b22d7330441fdaab0fe2b2166f08fb71ce0 / 649a4b22d7330441fdaab0fe2b2166f08fb71ce0
- Auditor: Codex

| ID | Result | Redacted evidence and remaining work |
|---|---|---|
| E01 | PASS | Branch, clean status, expected origin and HEAD checked with git. |
| E02 | PASS | node --version: 25.9.0; npm --version: 11.12.1. |
| E03 | FAIL | Blender 5.2.3 LTS version returned; background bpy process crashed in sandbox. Retest outside sandbox. |
| E04 | PASS | uvx 0.12.3; Claude 2.1.318; both commands executed. |
| E05 | NOT VERIFIED | Live addon reports 1.8 but background bpy enabled-preferences check crashed. |
| E06 | FAIL | Claude reports project scope but connection closed; global registrations across agents not fully audited. |
| E07 | NOT VERIFIED | Claude live scene tool call not executed. |
| E08 | NOT VERIFIED | Project skill file exists; fresh Claude session recognition not tested. |
| E09 | FAIL | No threejs-* SKILL.md found in user Claude skills directory; session recognition not tested. |
| E10 | NOT VERIFIED | three 0.180.0 installed and locked; typecheck scripts pin @types/three 0.180.0; installed types not found. |
| E11 | NOT VERIFIED | check-ignore confirms audits ignored; git ls-files returned no audit files; full tracked-content privacy audit not performed. |
| E12 | PASS | Exact HEAD CI completed successfully; quality-gate success. https://github.com/weskao/skyline-rush/actions/runs/42055223587 |
| E13 | NOT VERIFIED | CLI 4.5.1 installed, exact dev dependency and lock; Blender GLB export, inspect and meshopt optimization not performed. |
| E14 | NOT VERIFIED | Project config pins 2.2.7; Codex tool get_scene_info returned 3 objects, but active server provenance and project scope were not established. |
| E15 | NOT VERIFIED | No asset download needed for checks so far; N/A requires approval. |

- Live Codex Blender MCP: get_scene_info, 3 objects. Claude live call outstanding.
- Final verdict: BLOCKED
- No changes to game or Three.js; no commit, push, PR, merge, or deployment.

## Follow-up — 2026-11-05

- E03 PASS: outside sandbox, Blender 5.2.3 LTS background bpy check completed with BYPY_OK.
- E05 PASS: same check returned BLENDER_MCP_ENABLED=True.
- E06 FAIL: outside sandbox `claude mcp get blender` reports project scope and connected. Codex user-global registration is present; Claude user-global registration was initially observed but was absent on recheck. Other agent scopes remain unaudited.
- E07 NOT VERIFIED: a fresh Claude print session searched for Blender tools but returned no matching deferred tools; no scene call was made.
- E08 NOT VERIFIED: project skill exists; fresh-session recognition remains unverified.
- E09 NOT VERIFIED: installed loaders, materials, performance, and asset-pipeline globally for Claude; `skills list` recognizes all four, whose documents target r186. Fresh Claude session recognition remains unverified; do not copy r186 examples blindly into r180.
- E10 PASS: npm ls reports three 0.180.0, @types/three 0.180.0, glTF Transform 4.5.1; lockfile three 0.180.0; typecheck scripts pin types 0.180.0. Installed types with existing no-save/no-lock/ignore-scripts convention; npm changed local node_modules only.
- E11 NOT VERIFIED: ignored/untracked audit boundary verified; full tracked-content privacy scan still required.
- E12 PASS: prior exact-HEAD quality-gate success, unchanged HEAD.
- E13 PASS: Blender factory scene exported GLB; glTF Transform 4.5.1 inspect and optimize --compress meshopt succeeded; optimized GLB inspected; temporary files removed.
- E14 NOT VERIFIED: project config and live Codex scene call exist, but user-global Codex registration could be the source; project-only provenance requires a fresh session after global scope is addressed.
- E15 NOT VERIFIED: no external assets required; optional N/A awaits owner approval.
- `npm install` reported 4 moderate vulnerabilities; not investigated or remediated as part of Phase 0.
- Final verdict: BLOCKED. Device model stays UNVERIFIED.

## Follow-up — 2026-11-06

- E08 PASS: fresh Claude print session restricted to Skill invoked `blender-image-to-3d`; session reported full instructions loaded and exited successfully.
- E09 PASS: fresh Claude session invoked `threejs-loaders`, `threejs-materials`, `threejs-performance`, and `threejs-asset-pipeline`; four non-error Skill results and successful session. Each installed SKILL.md identifies r186; current game baseline remains r180.
- E11 NOT VERIFIED: limited redacted heuristic scan covered 977 tracked UTF-8 files, skipped 252 binary, large or unreadable files. No matches for selected private-key headers, GitHub tokens, AWS access keys, OpenAI keys or private IPv4 patterns. One home-path-pattern match classified as a literal documentation placeholder. This is not a comprehensive privacy or secret audit.
- E06/E14: Codex user-global Blender entry remains present; Claude user-global entry absent at recheck. Project-only scope and Claude live tool call remain unresolved.
- Exact HEAD and gitignored audit boundary remain unchanged; exact-HEAD CI remains successful.
- Final verdict: BLOCKED; device model UNVERIFIED.

## Follow-up — MCP isolation

- Claude fresh session explicitly loaded `.mcp.json` with `--strict-mcp-config`, but ToolSearch returned no matching Blender tool; no Claude scene call occurred. Project trust is recorded; the enabled project MCP server list is empty. Blender was listening on its local MCP port during investigation.
- A separate read-only MCP initialize/tools-list handshake against pinned `uvx mcp-for-blender@2.2.7` succeeded and advertised `get_scene_info` among its tools. This is server-protocol evidence, not a Claude tool call; E07 remains NOT VERIFIED. Inspect `/mcp` approval in a new Claude project session.
- Codex user-global Blender entry still present. E06/E14 remain open.

## Follow-up — Claude permission diagnosis

- `.claude/settings.json` explicitly enables the project Blender MCP. `.claude/settings.local.json` explicitly denies `mcp__blender__get_scene_info` and the other Blender MCP tools. This explains why a fresh Claude session cannot discover the scene tool despite successful protocol-level enumeration. Settings were not modified.
- Owner action: review Claude Code `/permissions` and remove only the deny rule for `mcp__blender__get_scene_info` if the owner authorizes read-only scene access; keep other denials. Restart the project Claude session and repeat E07. Do not override or bypass the deny rule.
- Codex user-global Blender MCP remains configured; E06/E14 still require the previously delivered scoped handoff and a new session. E15 owner approval and broader privacy review remain outstanding.

## Follow-up — global MCP scope inventory

- Read-only inspection of conventional user-global configuration paths found Blender-named entries in Codex and OpenCode; none in the inspected Claude, Gemini or VS Code configs. Grok, Cursor and Windsurf conventional config files were absent. This does not prove no aliases or other configuration locations exist.
- `agent-toggle disable mcp blender --harness opencode --dry-run --json` reported a planned disable. Owner must decide before changing global agent resources; existing OpenCode use in other projects may be affected.
- Claude project-local deny for `mcp__blender__get_scene_info` remains present. No agent configuration changed by this check.

## Follow-up — dedicated secret scan

- `uvx --from detect-secrets==1.5.0 detect-secrets scan` completed against tracked files. It reported 27 candidate findings in 11 files: 23 hex entropy, one base64 entropy and three keyword matches. Detector values were not printed or saved.
- A flagged value is assigned to `apiKey` in `src/cloud-save.ts`; its purpose and restrictions were not verified. Other findings include test credentials and apparent hashes, but all findings have not yet been fully classified. Treat the API-key candidate as needing owner review; do not assume it is safe or a leaked credential solely from the detector.
- E11 remains NOT VERIFIED; no values or raw scanner logs are included here. Do not commit this report or publish the matched value.

## Follow-up — owner command results

- Codex global configuration now has no Blender entry; project config still pins the Blender server to uvx 2.2.7. `agent-toggle` reported no global entry when run again. Fresh-session project-scoped live verification remains outstanding.
- OpenCode's global `opencode.json` is now zero bytes and invalid JSON; the cause and timing relative to the owner's operations are unknown. `agent-toggle list` reports parked state and does not prove live config is valid. Three local backups from 2026-08-24 parse as JSON; the newest contains five MCP entries and no Blender entry, but may omit subsequent changes. No backup was restored or modified.

## Follow-up — project Codex live verification

- Owner instructed that OpenCode is outside this Phase 0 follow-up. Its zero-byte configuration was not restored or checked further; no claim is made that it is valid or repaired. Any all-agent-scope acceptance is qualified by this explicit exclusion.
- E14 PASS: user-global Codex config has no Blender server; project `.codex/config.toml` pins `uvx mcp-for-blender@2.2.7`. A fresh ephemeral Codex session called `mcp__blender__get_scene_info` successfully and reported 3 scene objects. The new process exited successfully.
- E06 remains NOT VERIFIED for complete all-agent scope; OpenCode is excluded by owner request and other nonstandard agent paths were not fully inventoried.
- E07 remains NOT VERIFIED because Claude project-local permissions deny the read-only scene tool. E11 API-key candidate awaits owner decision and remaining scanner findings are not fully classified. E15 N/A approval remains outstanding.
- Final verdict remains BLOCKED. Device model remains UNVERIFIED.

## Owner decision — E15

- E15: N/A approved by project owner on 2026-11-06; this Phase 0 does not use external assets. License and provenance checks remain required if external assets are used later.

## Follow-up — scope and key decision

- Owner requested deferring external asset acquisition, licensing and disk checks from Phase 0 to Phase 2 / Task 3. Phase 0 now has E01–E14; no external asset was downloaded.
- Owner requested keeping the Firebase web configuration unchanged after reviewing Firebase's guidance that Firebase API keys identify the project and are public by design. API restrictions, Security Rules and App Check must be assessed independently; current cloud-side API key restrictions were not verified here. No key rotation was performed.
- Documentation commit f60d8444c7490da3ad91d2e2ff97f1c8452a607d pushed to feature branch; exact-HEAD CI run 42069732313 was queued when checked. It is not evidence of a pass.
- E07 remains blocked by the existing Claude read-only tool denial; E11 complete privacy review remains open. Owner supplied E06 claims from another session; verify from live state before marking it passed.

## Follow-up — fresh Claude live call and exact-HEAD CI

- E07 PASS: a fresh Claude session called `mcp__blender__get_scene_info`; the tool returned successfully and reported 3 scene objects. Session exited successfully.
- E12 PASS: exact HEAD f60d8444c7490da3ad91d2e2ff97f1c8452a607d CI run 42069732313 completed with quality-gate success. This docs-only run skipped unit, browser, cloud-save and world-tour suites; it does not verify Mac tools.
- User-global configurations for Claude, Codex, OpenCode and Gemini were readable and had no Blender-named server entry. E06 complete inventory of all installed agents and alternate registrations remains unverified.
- E11 remains NOT VERIFIED: the owner chose to retain the Firebase web key; remaining detector findings were not fully classified.
- Final verdict: BLOCKED. Device model remains UNVERIFIED.
