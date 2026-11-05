# Phase 0 — 3D Toolchain and Global Agent Environment Preflight

Date: 2026-11-04 · Status: NOT RUN ON USER MAC · Owner workspace: ~/Documents/Workspace/skyline-rush

> **Reusable, cross-device acceptance:** [phase0-multi-device-acceptance.md](phase0-multi-device-acceptance.md) is the standalone authoritative E01–E15 checklist, with Mac/Linux/Windows commands, a copyable AI execution prompt, and a separate per-device audit report. This document is the Mac-focused companion only. Use SKYLINE_RUSH_DIR to override the default workspace on another device; never transfer PASS evidence between devices.

**Public GitHub privacy:** device results and device model names live **only** in `docs/designs/3d-pipeline/audits/`, which is excluded by `.gitignore`. Keep this file and the reusable acceptance document public, never commit per-device output. After all required checks pass, the agent records a generic model label (`Mac mini`, etc.) in the ignored local audit and local `audits/device-status.md`. Confirm `git check-ignore -v docs/designs/3d-pipeline/audits/example.md` and `git ls-files docs/designs/3d-pipeline/audits/` before writing results.

**This check is mandatory before Blender, model generation, Three.js upgrades or asset processing.** The owner states tools were previously installed; the GitHub-only authoring session cannot verify the Mac's local binaries, project-scoped Blender MCP or user-global Skills. Do not mark installed or connected until exact commands are run there.

## Scope: "global" is not the workspace path

- **Work directory:** ~/Documents/Workspace/skyline-rush (run commands from here).
- **Claude Code Skills:** `blender-image-to-3d` lives in project `.claude/skills/`; Three.js skills remain in `~/.claude/skills/`.
- **Claude Code Blender MCP:** project `.mcp.json`, verified with `claude mcp get blender`; remove global Blender registrations.
- **Codex Blender MCP:** project `.codex/config.toml` under `[mcp_servers.blender]`; trusted-project settings apply. Do not overwrite unrelated settings. Remove global Blender registrations from all installed AI agents. Codex Skills remain separate.
- **Blender addon:** in Blender user scripts/config for the detected Blender version (not workspace folder); addon enabled and addon server running are different conditions.
- **glTF Transform:** a project dev dependency is appropriate for repeatable CI; check package.json/lockfile; a globally installed CLI alone is insufficient for reproducible builds.
- Never print or commit API tokens, ~/.claude.json, ~/.codex/config.toml or other configs wholesale. **Any versions or machine-specific results belong only in ignored local audits, not public TODO.md**. Do not commit hostname, serial, private home paths, full MCP output or even a redacted device-specific report. `git add -f` is prohibited for audit files.

## 0A. Commands to run locally (read-only, from macOS Terminal)

~~~bash
cd ~/Documents/Workspace/skyline-rush || exit 1
pwd
git status --short
git branch --show-current
git rev-parse HEAD
command -v blender || true
test -x /Applications/Blender.app/Contents/MacOS/Blender && /Applications/Blender.app/Contents/MacOS/Blender --version | head -n 2
command -v uvx && uvx --version
command -v claude && claude --version
command -v codex && codex --version
node --version
npm --version
npx skills list -g -a claude-code
ls -ld .claude/skills/blender-image-to-3d ~/.claude/skills/threejs-* 2>/dev/null || true
claude mcp list
claude mcp get blender
codex mcp list
npm ls three @types/three @gltf-transform/cli --depth=0
test -f package-lock.json && echo "lockfile present"
df -h .
~~~

Interpretation: a binary path means CLI presence, **not** a healthy MCP. A Skill folder means files exist, **not** that the agent has loaded it. npm ls may exit nonzero for an absent dev CLI; record it, don't mark the entire project broken. Node must satisfy both project's >=22.12.0 and skills CLI's >=22.20.0 (or a newer compatible runtime).

## 0B. Verify Blender addon enabled and server available

For the complete copyable installation, Blender Python Console server-start,
project-scoped Claude/Codex setup, authorization and live verification sequence,
see the macOS Blender MCP subsection in `phase0-multi-device-acceptance.md` §4.
The add-on is shared by both clients; `setup` and `update` can change existing
user-level state and are not required for a normal verification.

First **close Blender** before changing configuration. For a non-destructive enabled-state check, find the installed executable (app path shown above or command -v blender) and run:

~~~bash
/Applications/Blender.app/Contents/MacOS/Blender --background --python-expr "import bpy; print('BLENDER_MCP_ENABLED=' + str('blender_mcp' in bpy.context.preferences.addons))"
~~~

If Blender.app lives elsewhere, use the detected executable instead. "True" means enabled in Blender preferences. To verify actual **server transport**, open Blender UI, press N in 3D viewport, locate MCP for Blender, ensure the server is running, then in a fresh Claude Code session request a read-only scene object listing via Blender MCP. Record PASS only if the MCP tool actually responds. One enabled addon or registered MCP name does not prove the socket is live.

## 0C. Repair missing components (execute only after failed check)

**If project Blender game skill is missing:** (review source before executing; Node >=22.20)

~~~bash
npx skills add majidmanzarpour/blender-game-skills --skill blender-image-to-3d -a claude-code
~~~

**If global Three.js Skills missing:** review repository r186 source and install only relevant skills, excluding React-specific one; interactive selection:

~~~bash
npx skills add CloudAI-X/threejs-skills -g -a claude-code
~~~

**If project-scoped Claude MCP is missing:** inspect existing entries and preserve unrelated configuration. Register from the project root:

~~~bash
claude mcp add --scope project blender -- uvx mcp-for-blender@2.2.7
~~~

If uv is missing, install with Homebrew after approval: brew install uv. If Blender addon missing: uvx mcp-for-blender@2.2.7 install-addon. For automatic enable/connection setup from trusted upstream: uvx mcp-for-blender@2.2.7 setup; read prompts carefully because setup can modify user-level agent settings. If only addon disabled and Blender is closed, this headless approach writes Blender user preferences (not a safe read-only check):

~~~bash
/Applications/Blender.app/Contents/MacOS/Blender --background --python-expr "import addon_utils,bpy; addon_utils.enable('blender_mcp',default_set=True); bpy.ops.wm.save_userpref()"
~~~

**Codex project MCP:** add `[mcp_servers.blender]` to project `.codex/config.toml` with `command = "uvx"` and `args = ["mcp-for-blender@2.2.7"]`. Check the trusted project and perform a live read-only scene query. Remove existing global Blender MCP registrations for all AI agents, without changing other servers.

**If glTF Transform not in package-lock.json**: add in a later implementation phase as a pinned dev dependency (npm install -D @gltf-transform/cli); test binary and supported CLI flags against installed version. Do NOT mutate package.json during this docs-only planning phase.

## 0D. Preflight record template

| Requirement | Expected evidence | Result | Evidence/time |
|---|---|---|---|
| Correct workspace/repo/branch | pwd, git branch, clean or acknowledged changes | NOT VERIFIED | |
| Node >=22.20 + npm | node --version, npm --version | NOT VERIFIED | |
| Blender app and CLI | executable, version | NOT VERIFIED | |
| Blender addon enabled | BLENDER_MCP_ENABLED=True | NOT VERIFIED | |
| MCP server live in Blender | read-only MCP scene query successful | NOT VERIFIED | |
| Claude Code project-scope MCP | claude mcp get blender + project scope | NOT VERIFIED | |
| Codex project MCP | project config, codex mcp list, live scene call | NOT VERIFIED | |
| Project blender-image-to-3d Skill | .claude/skills, new project session skill loaded | NOT VERIFIED | |
| Global threejs Skills | ~/.claude/skills, skills list -g, r186 compatibility noted | NOT VERIFIED | |
| glTF Transform repeatable CLI | npm ls + CLI help, lockfile recorded | NOT VERIFIED | |
| Three.js baseline | npm ls + lockfile matches r180 source | NOT VERIFIED | |
| License/asset sources/disk | local files, legal data, free space | NOT VERIFIED | |

### Exit criteria / escalation

Only proceed to Three.js migration when every **mandatory** item is PASS or a documented, approved optional exclusion; MCP server must be validated live before AI Blender work. On failure: stop that phase, report the exact failing command and output, give short Mac commands for owner to execute. **Do not claim Telegram/tgsend delivery** unless a configured, authorized tool is available and successfully invoked; provide commands in the GitHub doc/chat instead. Never commit global settings or user secrets.

## References
- https://github.com/ahujasid/mcp-for-blender
- https://github.com/majidmanzarpour/blender-game-skills
- https://github.com/CloudAI-X/threejs-skills
- https://github.com/vercel-labs/skills
- https://github.com/donmccurdy/glTF-Transform
