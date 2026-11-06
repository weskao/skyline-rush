# Task 3 — GLB pipeline MVP, licensing and asset loader

Part of [../../../superpowers/plans/2026-11-04-3d-visual-fidelity-pipeline-plan.md](../../../superpowers/plans/2026-11-04-3d-visual-fidelity-pipeline-plan.md) · Spec Phase 2 (pipeline) · TODO Phase 2 · Scope tags: [README.md](README.md).

**Files:** scripts/assets/ (planned Blender export / glTF Transform CLI scripts); src/asset-model-loader.ts (planned), src/model-manifest.ts (planned), tests/model-asset-loader.test.js (planned), tests/model-manifest.test.js (planned), public/models/ (validated outputs only), assets-src/ (masters); src/world.js minimally for staged adapter.
**Produces:** manifest-defined, preloaded game model with fallback, predictable decoder/asset lifetime and GitHub Pages subpath support.

## By project (committed once)
- [x] First write RED tests for missing/slow/invalid GLB, decoder unavailability, exact node names, duplicate request deduplication, cancellation, ownership and disposal.
  Evidence: `tests/model-manifest.test.js`, `tests/model-asset-loader.test.js` against typed stubs; 33 of 35 new tests failed on assertions, not import errors (contract `../phase2-model-contracts.md`).
- [x] Specify minimal manifest and async loader contracts (avoid speculative factory abstractions). Define: asset ID → URL, source SHA/license, node names, LOD references, fallback type, material set and asset provenance.
  Evidence: `../phase2-model-contracts.md`; `src/model-manifest.ts` validation (`b5c8733d`).
- [x] Implement a single GLTFLoader backend, opt-in KTX2Loader/MeshoptDecoder/DRACOLoader only if encoded assets require them, using import.meta.env.BASE_URL paths. Decoders come from `three/examples/jsm` or exact-pinned npm packages, never a global install.
  Evidence: `src/asset-model-loader.ts` (`b5c8733d`, `69a37d12`): one `GLTFLoader`, Meshopt from `three/examples/jsm` loaded only when the entry asks for it; KTX2/Draco not needed. `/skyline-rush/` base checked in a real browser (`68f8e669`).
- [x] Author reproducible Blender .blend + Python source, glTF Transform inspect/optimize step with triangle, texture and animation/names integrity checks. Keep source material legally auditable. Export scripts read the Blender path from `BLENDER_BIN` with the `/Applications` default (same as `scripts/install-gltf-transform.mjs`), never a hardcoded per-user path.
  Evidence: `assets-src/pipeline-probe/build.py` → `scripts/assets/export-glb.mjs` → `optimize-glb.mjs` → `check-glb.mjs` (`e782a6b6`). Probe is script-built, so no external source or license. Integrity test RED first.
- [x] Add camera-switch, quality-change, track-switch and context-loss lifecycle tests; prewarm all material/shader variants before mid-race use.
  Evidence: `?model=probe` Garage adapter `src/garage-model.ts` with `compileAsync` before first draw (`b66a0e9d`); `tests/garage-model.test.js` (8) and `tests/garage-model-probe-browser.spec.js` (7, CI=1 stress 56/56); `tests/garage-model-lifecycle-browser.spec.js`: no compile or new programs while racing, 404 fallback warns once (`68f8e669`, `fd36761b`). In-Garage quality change has no UI yet, so it is unit-tested only.
- [x] Observe GREEN, test real WebGL Garage load/fallback and browser console, run focused and full checks; report actual packaged asset sizes and metrics.
  Evidence: packaged probe 6536 B, 264 triangles, 5 draws, no textures; sha256 matches the manifest. Real WebGL load, 404 fallback and production captures at 1440×900, 390×844, 844×390 approved by the owner (2026-11-06). `make verify` on merge `ae402e3b`: typecheck OK; unit 1936 pass / 0 fail / 3 skipped; browser 1005 passed / 6 skipped / 9 failed; World Tour 328 passed. The 9 browser failures (item-feedback ×3, motion air tricks, responsive-focus 390×844, garage-home-pose, interactive-tutorial ×2, high-speed-vfx) are outside the 3D code, ran under load average 35–46, and were ruled load failures by the owner (2026-11-07). An isolated `--retries=0` rerun of those 9 on `ae402e3b` at load average ~14 passed 17/17 (all their viewport projects), confirming load flakes. Exact-HEAD CI is tracked in `TODO.md`.

## By device (repeat per machine; evidence in ignored `../audits/`)
- [ ] If external assets are needed, verify each source, license and **available disk space on this machine** before downloading or using it (deferred from Phase 0 E15).
- [ ] Blender executable present and `BLENDER_BIN` set if not in `/Applications`; `node scripts/install-gltf-transform.mjs` prints `E13 PASS` on this machine.
- [ ] Project `.mcp.json` Blender server approved in this machine's `~/.claude.json` (trust dialog / `enabledMcpjsonServers`) and Codex trusted-project state in `~/.codex/config.toml`; live read-only scene query works (E06/E14). These approvals are never copied into the repo.
- [ ] Only if KTX2 textures are selected: install `toktx` (KTX-Software, Homebrew) on every machine that runs the texture step; not an npm dependency.
