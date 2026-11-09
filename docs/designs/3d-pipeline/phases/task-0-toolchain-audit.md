# Task 0 — Mandatory user-Mac toolchain audit (execute FIRST; highest priority)

Part of [../../../superpowers/plans/3d-visual-fidelity-pipeline-plan-v2.md](../../../superpowers/plans/3d-visual-fidelity-pipeline-plan-v2.md) · Spec Phase 0 · Scope tags: [README.md](README.md) (Phase 0 split); the checklists live in [../phase0-multi-device-acceptance.md](../phase0-multi-device-acceptance.md) and [../toolchain-environment-preflight.md](../toolchain-environment-preflight.md).


**Files:** Reference the standalone `docs/designs/3d-pipeline/phase0-multi-device-acceptance.md` plus `docs/designs/3d-pipeline/toolchain-environment-preflight.md`; save E01–E14 audit **only locally** to `docs/designs/3d-pipeline/audits/YYYY-MM-DD-<device-alias>.md` (gitignored) and update the ignored `audits/device-status.md` with non-identifying product model **only after PASS**. Public TODO.md can reference the verification procedure but must never contain device-specific outcomes or identifiers.
**Consumes:** Mac workspace ~/Documents/Workspace/skyline-rush, existing Claude/Codex/Blender installations.
**Produces:** toolchain matrix with PASS/FAIL/NOT VERIFIED, version evidence, connection smoke test and explicit blocked steps.

## By project (once)
- [ ] Install `@gltf-transform/cli` as an exact-pinned devDependency if missing (E13, Required); lockfile committed.
- [ ] Three.js Skills install globally under `~/.claude/skills/threejs-*`; `blender-image-to-3d` only in the project (`.claude/skills/`), preserving its source and license (E08, E09).
- [ ] Register Blender MCP in project scope only: `.mcp.json` for Claude and `.codex/config.toml` for Codex (E06, E14 project files).
- [ ] Review third-party Skill/MCP permissions. Verify global skill version/API claims vs current r180; after target migration recheck r186.
- [ ] Confirm `.gitignore` keeps audits out: `git check-ignore -v docs/designs/3d-pipeline/audits/example.md` and `git ls-files docs/designs/3d-pipeline/audits/` (must be empty) (E11). Read exact-HEAD CI status (E12).

## By device (repeat per machine; evidence in ignored `../audits/`)
- [ ] Confirm working directory, git branch/HEAD and clean or acknowledged working state; do not clobber concurrent developer work (E01).
- [ ] Run read-only commands for Blender executable/version, node >=22.20, npm, uvx, Claude/Codex CLI, claude mcp get/list, codex mcp list and, after `npm ci`, npm ls for three/types/glTF Transform; smoke-test gltf-transform inspect/optimize (E02–E04, E10, E13).
- [ ] Confirm Blender addon enabled-state in Blender background preferences; then open Blender and execute **read-only live MCP scene query** from Claude Code. Mark addon/server/agent connection separately (E05, E07).
- [ ] Approve the project `.mcp.json` Blender server in `~/.claude.json`, remove any user-scope Blender MCP from `~/.claude.json` and `~/.codex/config.toml`, and confirm Codex trusts the project; verify live read-only scene queries from Claude and Codex (E06, E14).
- [ ] If any mandatory dependency is missing, stop the dependent subtask, review source and permissions, run only approved minimal repair commands, **rerun the same check** and record observed result. If remote agent cannot reach the Mac, return the exact owner-executable commands and wait for observed output; no fabricated PASS.
- [ ] Document per-item evidence in **local ignored** audit files, not in GitHub. After successful acceptance, record only generic model such as `Mac mini` in that device's local report and local ignored device-status.md. Never commit/push private paths, hostnames, serials, raw command output or secrets. Do not use Telegram/tgsend without a configured authorized sender.

**Exit:** All mandatory items PASS, or explicit documented owner-approved optional exclusion; actual Blender MCP scene retrieval must succeed for Blender tasks. Until then, all later implementation checkboxes remain unchecked.
