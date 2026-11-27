---
paths:
  - "assets-src/**"
  - "docs/designs/3d-pipeline/**"
  - "scripts/assets/**"
  - "src/*-scenery*.ts"
  - "src/*-greenery*.ts"
  - "src/*-landmarks*.ts"
  - "src/neon-blossom.ts"
  - "tests/prop-reuse.test.js"
---

# Reusable 3D models: one parametric builder per species, many variants

Applies to every procedurally built model, existing and new: the Neon city kit (`assets-src/neon-city/build/`), the
Coast palm, guard rail and lamp post (`coast-scenery/build/props.py`), the Coast boats, the Sky Spiral pieces and the
generic Neon landmark pieces (piers, rail segments, container stacks, lantern spans). Each is built once per species
and varied by parameters, so a new course is dressed mostly from what exists.
Not covered: scans (cliffs, rocks, shrub thickets: vary them per instance only, item 3.1), one-off hero landmarks
(task-8 reuse table), cars (`garage-equipment.md`, `fitToRoadsterSize`), pickups, sky and road bakes.

1. **Look before modelling.** Check `assets-src/props/` first (`cherry_tree.py`, the first shared species; blossom
   cut-out `src/neon-blossom.ts`), then the kits above. An existing species gets a variant, never a second model of
   the same thing.
2. **A model is a builder function with knobs**, like `cherry_tree(k, lod, height, crown, groups, clusters, sprays)`:
   size and proportion, part counts, material cell, `seed`, `lod`. A new model starts this way. An existing builder
   gains its knobs in place, in its own kit, when a course first needs a variant; the defaults rebuild the shipped
   model unchanged (scale by multiplying with a default of 1.0, slice part tables with a default of their length).
3. **Vary in the cheapest layer that gives the look:**
   1. *Per instance at placement* (no new GLB, no draw call): seeded yaw, a uniform scale range, a small extra height
      stretch, an instance tint, from `seededRng` the way `src/coast-greenery.ts` sizes its shrubs. "Same tree,
      taller or shorter" lives here.
   2. *Build-time variant* (new node in the kit GLB): only when the silhouette must differ (more or fewer puffs,
      another bough layout, bare vs. in bloom). Name it `<species>_<variant>`, on the kit's existing material and
      atlas: no new texture or shader program.
   3. *New species*: only when neither layer gives the silhouette.
4. **A variant is a different silhouette** (3d-asset-pipeline item 24: a second colourway is not a second design).
   A row of one species cycles at least three variants plus per-instance yaw and scale, so neighbours never match.
5. **Second course = shared module.** When a second course uses a species, move its builder out of the first track's
   kit into `assets-src/props/<species>.py` and import it from both kits (as `neon-city/build/props.py` imports
   `cherry_tree`). Never copy the builder into the new track's folder. A kit with another builder API (Coast builds
   with bpy directly) moves the species with an adapter in that kit, not a second copy.
6. **Cost is counted per variant.** Each variant node is one `InstancedMesh` per LOD band in the existing pool
   pattern (`createCoastModelLayer`, `createNeonScenery`), so a variant adds draws; state the count. Scales stay
   above zero (`performance-review.md`), the scale range comes from the shipped GLB's measured size (item 31), and a
   pool recomputes its bounding sphere after writing matrices, or a scaled-up instance is culled at the screen edge.
7. **Catalogue it.** A shared builder's module docstring has `Knobs`, `Variant nodes:` and `Used by:`; the kit's GLB
   test (e.g. `tests/neon-city-glb.test.js`) asserts every variant node name.
8. **Prove unchanged defaults on the GLB.** Any move, refactor or new knob of a builder runs
   `python3 scripts/assets/glb_ab.py <id>` (base `origin/develop`, or `--base <ref>`) and reports `IDENTICAL`.
   Blender writes new `.blend` bytes on every build, so never commit a rebuilt master for a change that leaves the GLB
   identical: the manifest pins the master's sha256. A change meant to alter the model goes through the full pipeline
   (`export-glb`, `optimize-glb`, `check-glb --promote`) instead.

Guard: `tests/prop-reuse.test.js` (part of `pnpm test`, so pre-push and CI): every shared builder is catalogued, and
no kit defines its own copy of a shared builder.
