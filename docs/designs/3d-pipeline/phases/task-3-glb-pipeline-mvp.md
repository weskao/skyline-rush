# Task 3 — GLB pipeline MVP, licensing and asset loader

Part of [../../../superpowers/plans/2026-11-04-3d-visual-fidelity-pipeline-plan.md](../../../superpowers/plans/2026-11-04-3d-visual-fidelity-pipeline-plan.md) · Spec Phase 2 (pipeline) · TODO Phase 2 · Scope tags: [README.md](README.md).

**Files:** scripts/assets/ (planned Blender export / glTF Transform CLI scripts); src/asset-model-loader.ts (planned), src/model-manifest.ts (planned), tests/model-asset-loader.test.js (planned), tests/model-manifest.test.js (planned), public/models/ (validated outputs only), assets-src/ (masters); src/world.js minimally for staged adapter.
**Produces:** manifest-defined, preloaded game model with fallback, predictable decoder/asset lifetime and GitHub Pages subpath support.

## By project (committed once)
- [ ] First write RED tests for missing/slow/invalid GLB, decoder unavailability, exact node names, duplicate request deduplication, cancellation, ownership and disposal.
- [ ] Specify minimal manifest and async loader contracts (avoid speculative factory abstractions). Define: asset ID → URL, source SHA/license, node names, LOD references, fallback type, material set and asset provenance.
- [ ] Implement a single GLTFLoader backend, opt-in KTX2Loader/MeshoptDecoder/DRACOLoader only if encoded assets require them, using import.meta.env.BASE_URL paths. Decoders come from `three/examples/jsm` or exact-pinned npm packages, never a global install.
- [ ] Author reproducible Blender .blend + Python source, glTF Transform inspect/optimize step with triangle, texture and animation/names integrity checks. Keep source material legally auditable. Export scripts read the Blender path from `BLENDER_BIN` with the `/Applications` default (same as `scripts/install-gltf-transform.mjs`), never a hardcoded per-user path.
- [ ] Add camera-switch, quality-change, track-switch and context-loss lifecycle tests; prewarm all material/shader variants before mid-race use.
- [ ] Observe GREEN, test real WebGL Garage load/fallback and browser console, run focused and full checks; report actual packaged asset sizes and metrics.

## By device (repeat per machine; evidence in ignored `../audits/`)
- [ ] If external assets are needed, verify each source, license and **available disk space on this machine** before downloading or using it (deferred from Phase 0 E15).
- [ ] Blender executable present and `BLENDER_BIN` set if not in `/Applications`; `node scripts/install-gltf-transform.mjs` prints `E13 PASS` on this machine.
- [ ] Project `.mcp.json` Blender server approved in this machine's `~/.claude.json` (trust dialog / `enabledMcpjsonServers`) and Codex trusted-project state in `~/.codex/config.toml`; live read-only scene query works (E06/E14). These approvals are never copied into the repo.
- [ ] Only if KTX2 textures are selected: install `toktx` (KTX-Software, Homebrew) on every machine that runs the texture step; not an npm dependency.
