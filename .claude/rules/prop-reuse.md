---
paths:
  - "assets-src/**"
  - "docs/designs/3d-pipeline/**"
  - "src/*-scenery*.ts"
  - "src/*-greenery*.ts"
  - "src/*-landmarks*.ts"
  - "src/neon-blossom.ts"
---

# Reusable props: one parametric master, many variants

Trees, shrubs, rocks, lamps, railings, signs and filler buildings are built once per species and varied by
parameters, so a new course is dressed mostly from what exists. Hero landmarks stay one-off (task-8 reuse table).

1. **Look before modelling.** Check the existing species first: `cherry_tree` (`assets-src/neon-city/build/props.py`,
   blossom cut-out `src/neon-blossom.ts`), the `coast-greenery` shrubs, the `coast-scenery` cliff/rock scans, the Neon
   street furniture. An existing species gets a variant, never a second model of the same thing.
2. **A prop is a builder function with knobs**, like `cherry_tree(k, lod)`: size and proportion (height, fork height,
   crown radius), cluster counts (bough, blossom/leaf puffs), material cell, `seed`, `lod`. The defaults rebuild the
   shipped piece unchanged; adding a knob never changes an existing GLB.
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
   kit into `assets-src/props/<species>.py` and import it from both kits. Never copy the builder into the new track's
   folder.
6. **Cost is counted per variant.** Each variant node is one `InstancedMesh` per LOD band in the existing pool
   pattern (`createCoastModelLayer`, `createNeonScenery`), so a variant adds draws; state the count. Scales stay
   above zero (`performance-review.md`), the scale range comes from the shipped GLB's measured size (item 31), and a
   pool recomputes its bounding sphere after writing matrices, or a scaled-up instance is culled at the screen edge.
7. **Catalogue it.** The builder's docstring lists its knobs, its variant nodes and the courses that use it; the
   kit's GLB test (e.g. `tests/neon-city-glb.test.js`) asserts every variant node name.
