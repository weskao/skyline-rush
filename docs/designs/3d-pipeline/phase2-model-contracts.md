# Phase 2 model contracts: manifest, async loader, asset pipeline

Plan Task 3 ([phases/task-3-glb-pipeline-mvp.md](phases/task-3-glb-pipeline-mvp.md)). Approved by the owner on 2026-11-06 with three choices:

- **MVP asset:** `pipeline-probe`, built entirely from a project Python script. No external source, so no download or third-party license.
- **Exposure:** Garage only, behind `?model=probe`. Production keeps the procedural car.
- **Decoders:** Meshopt only (`three/examples/jsm/libs/meshopt_decoder.module.js`, bundled JS). KTX2 and Draco stay out until an asset needs them, and adding one is a contract change.

**Task 4 contract change (owner chose baked textures + KTX2, 2026-11-07):** `DECODERS` is now `['meshopt', 'ktx2']`; Draco stays out. `roadster2` is exposed in the Garage behind `?model=roadster` (`MODEL_PARAMS` in `src/garage-model.ts`: `probe → pipeline-probe`, `roadster → roadster2`). Its nodes follow the rig contract in `src/garage-model-rig.ts`: each `wheel_<fl|fr|rl|rr>` has a `<wheel>_spin` child, plus `wing > wing_blade > wing_tip_l/r`, `wing_rams`; materials ending `_paint` / `_light` follow the procedural car's paint and light colour.

Unchanged by this phase: the single `WebGLRenderer` in `src/world.js`, physics, road frames, VFX ports, tracks, touch controls and NITRO/FLY/BOOST.

## 1. Manifest: `src/model-manifest.ts`

`MODEL_MANIFEST` is a typed constant record keyed by `id`. There is no registry class or factory.

| Field | Rule (`validateManifestEntry(entry, key)` returns one `"<field>: <reason>"` string per violation) |
|---|---|
| `id` | kebab-case `^[a-z0-9]+(-[a-z0-9]+)*$`; equal to its record key |
| `url` | `models/<id>/<id>.glb`; never a leading `/`, `..`, `\`, a scheme (`x:`) or an absolute path |
| `source.master` / `source.script` | `assets-src/<id>/<id>.blend` / `assets-src/<id>/build.py` |
| `source.masterSha256` / `source.scriptSha256` | 64 lowercase hex characters; equal to the sha256 of the committed file |
| `glb.sha256` / `glb.bytes` | 64 hex characters / a positive integer; equal to the committed `public/<url>`; `bytes <= budgets.bytes` |
| `license` | `id`, `creator` non-empty; project-made assets use `id: 'owned'`; optional `sourceUrl` must be `https://` |
| `provenance` | `blender`, `exporter`, `gltfTransform` match `^\d+\.\d+`; `commands` is a non-empty list of strings with no personal path (`/Users/`, `/home/`, `C:\Users\`) |
| `nodes` | non-empty, unique, each `^[a-z][a-z0-9_]*$` so GLTFLoader's name sanitizing (spaces become `_`, `.` `:` `/` `[` `]` are dropped) leaves it unchanged; matched exactly and case-sensitively at load |
| `materials` | non-empty, unique, non-empty strings; every one must be used by a mesh in the GLB |
| `lods` | `[{ quality: 'high' \| 'low', url }]`, each `url` follows the `url` rules, qualities unique; `[]` is allowed (the probe has none) |
| `fallback` | one of `FALLBACK_KEYS` (`'procedural-car'`: the existing procedural player car) |
| `decoders` | unique subset of `DECODERS` (`['meshopt', 'ktx2']`); a GLB requiring `KHR_texture_basisu` without `'ktx2'` is `invalid` |
| `budgets` | `triangles`, `bytes` positive integers; `textureMaxPx` integer `>= 0` (`0` = no textures) |

The coordinate system is Y-up with the nose pointing along -Z, in meters (spec §Asset manifest). Textures: `map` and `emissiveMap` are sRGB and every other texture is linear. The pipeline check enforces this, because GLTFLoader already assigns color spaces.

`modelUrl(path, baseUrl)` returns `baseUrl + path`. `baseUrl` is `import.meta.env.BASE_URL`, which always ends in `/` (`/` locally, `/skyline-rush/` on Pages).

## 2. Async loader: `src/asset-model-loader.ts`

```ts
createModelCache({ baseUrl, manifest?, fetch?, timeoutMs?, loadMeshopt? }): ModelCache
cache.load(id, { signal?, quality? }): Promise<ModelHandle | ModelFallback>
handle.instance(): Object3D   // a new clone every call
handle.release(): void        // idempotent
```

The injectable `fetch`, `manifest` and `loadMeshopt` exist only so the module can be unit-tested in Node. Production passes `baseUrl` and nothing else.

- **One backend.** The module holds exactly one `new GLTFLoader(`. It never constructs a `KTX2Loader` or `DRACOLoader`, and no `WebGLRenderer` is created or received. KTX2 comes from the injected `loadKtx2()` (memoised per cache; rejection → `decoder-unavailable`); the world builds one `KTX2Loader` per renderer (`createKtx2Provider`, transcoder at `BASE_URL + 'basis/'`, `public/basis/` byte-identical to three's copy). Shader warmup belongs to the world adapter, which calls `renderer.compileAsync(scene, camera)` with the instance added before the Garage or race is shown, never mid-race.
- **Decoders are opt-in.** `setMeshoptDecoder` is called only when the entry lists `'meshopt'`. `loadMeshopt()` (default: dynamic import + `await MeshoptDecoder.ready`) runs at most once per cache. If it rejects, the result is fallback `decoder-unavailable`.
- **URLs.** The fetch URL is `modelUrl(lod?.url ?? entry.url, baseUrl)`. `quality: 'low'` picks the low LOD when one exists, otherwise the main URL. The cache key is `id` plus the resolved URL.
- **Dedupe.** Concurrent and later loads of the same key share one fetch and one parse while the entry is alive.
- **Cancellation.** Each caller passes its own `AbortSignal`:
  - Aborting a caller rejects only that caller's promise with an `AbortError` `DOMException`.
  - A signal that is already aborted rejects without fetching.
  - When every waiting caller has aborted, the shared fetch is aborted, the entry is removed, and the next `load` fetches again.
- **Failure resolves to `{ kind: 'fallback', id, fallback: entry.fallback, reason }`.** It never throws into the race loop. Reasons:
  - `missing`: an HTTP error status.
  - `network`: fetch threw.
  - `timeout`: `timeoutMs` elapsed (default 15000). The fetch is aborted, and a late response is ignored.
  - `invalid`: parse error, bad GLB magic, or an extension that is required but not enabled.
  - `decoder-unavailable`.
  - `missing-node:<name>`.
  - `missing-material:<name>`.

  Failures are not cached, so the next `load` retries. An unknown `id` is a programmer error and rejects with `TypeError`.
- **Ownership.**
  - The cache owns the parsed original: its geometries, materials and textures.
  - `instance()` returns a deep clone of the node tree (`SkeletonUtils.clone` when skinned) that shares those resources. Moving a clone never changes the original or other clones.
  - Callers must not dispose shared resources. They remove their clone from the scene, then `release()`.
- **Disposal.**
  - Every resolved `ModelHandle` adds one reference.
  - At zero references, each unique geometry, material and texture is disposed exactly once and the entry is removed. A later `load` re-fetches.
  - A second `release()` on the same handle does nothing.
- **Lifecycle (browser tests, after GREEN):**
  - **Camera switch:** reuses the instance, with no fetch.
  - **Quality change:** loads the other quality (or keeps the fallback), then releases the old one.
  - **Track switch:** `renderer.info.memory.geometries` and `textures` return to their baseline.
  - **Context loss:** entries survive, there is no re-fetch, and warmup runs again after `webglcontextrestored`.
  - **During racing:** `renderer.info.programs.length` does not change.

## 3. Pipeline: Blender → `.blend` → GLB → glTF Transform

The commands run from the repo root. Blender comes from `BLENDER_BIN`, defaulting to `/Applications/Blender.app/Contents/MacOS/Blender`, as in `scripts/install-gltf-transform.mjs`. No other per-user path is used.

1. **Master:** `$BLENDER_BIN --background --factory-startup --python assets-src/<id>/build.py` writes `assets-src/<id>/<id>.blend` deterministically: fixed object names, no random seed, and no file paths written into the model.
2. **Export:** `node scripts/assets/export-glb.mjs <id>` runs Blender on the `.blend` with `scripts/assets/export_glb.py`. It writes a raw GLB to an OS temp directory, never into the repo.
3. **Optimize:** `node scripts/assets/optimize-glb.mjs <id>` runs `npx --no-install gltf-transform optimize <raw> <out> --compress meshopt --texture-compress false --flatten false --join false --palette false --simplify false --instance false --prune false`. Each `false` keeps named nodes, empty pivots and materials intact. The defaults would flatten and join nodes, merge materials into palettes, and prune empty leaves. Entries listing `'ktx2'` first get one KTX2 pass per slot (needs KTX-Software `ktx` on PATH), **before** meshopt so meshes are not decoded and re-quantized: `uastc --slots=<slot> --level=2 --zstd=18` for normal, occlusion (plus `--rdo`) and metallicRoughness; `etc1s --slots=<slot>` for baseColor and emissive. Options use the `--opt=value` form (`--opt value` after `--slots` fails), and one pass per slot (a `{a,b}` glob converted only one slot). check-glb also enforces `textureMaxPx` and KTX2 transfer functions (colour slots sRGB, data slots linear). **Low LOD:** `optimize-glb.mjs <id> --lod low` prepends `simplify --ratio=0.5 --error=0.01 --lock-border` (per mesh; nodes and pivots untouched) and `resize --width=512 --height=512`, then runs the same KTX2 + meshopt chain; `check-glb.mjs <id> --lod low --promote` applies the same checks and copies it to that `lods` entry's `url` (an unlisted LOD is an error).
4. **Integrity:** `node scripts/assets/check-glb.mjs <id>` loads the optimized GLB with three's GLTFLoader and MeshoptDecoder, in Node with no new dependency. It exits nonzero unless all of these hold:
   - triangles `<= budgets.triangles`
   - bytes `<= budgets.bytes`
   - every `nodes` name present exactly
   - every `materials` name used
   - texture size `<= textureMaxPx`
   - animation names equal to the raw export

   It prints the sha256 and bytes values for the manifest. Its pure check function has a unit test.
5. Only validated outputs are committed to `public/models/<id>/`. Masters live in `assets-src/<id>/`.

## 4. RED tests

- `tests/model-manifest.test.js`: every rule in §1, `modelUrl` with `/` and `/skyline-rush/`, the committed probe files and their hashes, and no personal paths.
- `tests/model-asset-loader.test.js`:
  1. missing GLB
  2. slow GLB, then a late response
  3. invalid GLB
  4. decoder unavailable and a required extension that isn't enabled
  5. exact node names and materials
  6. dedupe
  7. cancellation
  8. ownership
  9. disposal
  10. low-LOD URL
  11. static single-backend check

Browser lifecycle specs and the `?model=probe` Garage adapter follow once these are GREEN.
