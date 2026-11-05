# Task 0 — Mandatory user-Mac toolchain audit (execute FIRST; highest priority)

Part of [../../../superpowers/plans/2026-11-04-3d-visual-fidelity-pipeline-plan.md](../../../superpowers/plans/2026-11-04-3d-visual-fidelity-pipeline-plan.md) · Spec Phase 0 · Scope: **entirely by device** (see [README.md](README.md)); the checklists live in [../phase0-multi-device-acceptance.md](../phase0-multi-device-acceptance.md) and [../toolchain-environment-preflight.md](../toolchain-environment-preflight.md).


**Files:** Reference the standalone `docs/designs/3d-pipeline/phase0-multi-device-acceptance.md` plus `docs/designs/3d-pipeline/toolchain-environment-preflight.md`; save E01–E14 audit **only locally** to `docs/designs/3d-pipeline/audits/YYYY-MM-DD-<device-alias>.md` (gitignored) and update the ignored `audits/device-status.md` with non-identifying product model **only after PASS**. Public TODO.md can reference the verification procedure but must never contain device-specific outcomes or identifiers.
**Consumes:** Mac workspace ~/Documents/Workspace/skyline-rush, existing Claude/Codex/Blender installations.
**Produces:** toolchain matrix with PASS/FAIL/NOT VERIFIED, version evidence, connection smoke test and explicit blocked steps.

- [ ] Confirm working directory, git branch/HEAD and clean or acknowledged working state; do not clobber concurrent developer work.
- [ ] Run read-only commands for Blender executable/version, node >=22.20, npm, uvx, Claude/Codex CLI, npx skills list -g, ~/.claude/skills/, claude mcp get/list, codex mcp list and npm ls for three/types/glTF Transform. Install `@gltf-transform/cli` as an exact-pinned devDependency if missing and smoke-test inspect/optimize (E13, Required).
- [ ] Confirm Blender addon enabled-state in Blender background preferences; then open Blender and execute **read-only live MCP scene query** from Claude Code. Mark addon/server/agent connection separately.
- [ ] If any mandatory dependency is missing, stop the dependent subtask, review source and permissions, run only approved minimal repair commands, **rerun the same check** and record observed result. Three.js Skills use -g; install blender-image-to-3d only in the project; configure Blender MCP in project scope for Claude and Codex, and remove global Blender MCP registrations across AI agents; preserve the project skill source and license. If remote agent cannot reach the Mac, return the exact owner-executable commands and wait for observed output; no fabricated PASS.
- [ ] Verify Claude and Codex project Blender MCP registrations and live read-only scene queries, and confirm no Blender MCP registration remains in global AI agent configurations.
- [ ] Review third-party Skill/MCP permissions. Verify global skill version/API claims vs current r180; after target migration recheck r186.
- [ ] Document per-item evidence in **local ignored** audit files, not in GitHub; check `git check-ignore -v docs/designs/3d-pipeline/audits/example.md` and `git ls-files docs/designs/3d-pipeline/audits/` (must be empty). After successful acceptance, record only generic model such as `Mac mini` in that device's local report and local ignored device-status.md. Never commit/push private paths, hostnames, serials, raw command output or secrets. Do not use Telegram/tgsend without a configured authorized sender.

**Exit:** All mandatory items PASS, or explicit documented owner-approved optional exclusion; actual Blender MCP scene retrieval must succeed for Blender tasks. Until then, all later implementation checkboxes remain unchecked.
