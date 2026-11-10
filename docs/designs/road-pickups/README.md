# Road pickups: 3D props + guide product art

This work replaces **the four generic octahedrons**, not the ring hoops or the pickup economy.

| Pickup | Authored 3D silhouette | Guide illustration | Visual size strategy |
| --- | --- | --- | --- |
| `cell` / blue | Small armored battery with a luminous core and six-sided terminals | `cell.svg` | compact, road lane rows |
| `can` / orange | Cylindrical canister with reinforced caps, bands and a meter | `can.svg` | taller cylindrical form between traffic |
| `tank` / gold | Twin pressure tanks with steel clamps and a central charge badge | `tank.svg` | broad, legible airborne reward |
| `overcharge` / rainbow | Multi-hued reactor crystal, three gimbal rings and a bright axis | `overcharge.svg` | oversized high-altitude prize |

## Runtime and UI contracts

- The four source illustrations are independent **384 × 384 transparent SVGs** in `public/feature-assets/road-pickups/`. They are authored vector masters, not upscaled AI raster images; each renders uncropped using `object-fit: contain` at 110 × 110 CSS px (90 × 90 on narrow screens).
- `src/CollectiblesGuide.vue` uses `import.meta.env.BASE_URL` so the images work both at `/` and the GitHub Pages project subpath. Product art floats, slightly yaws, and has a glowing rotating projected floor marker; `prefers-reduced-motion` freezes the animations.
- `src/pickup-art.js` defines distinct vertex-colored low-poly, merged BufferGeometries and motion. The existing `createMarkerPool` supports per-type geometries without adding any draw calls or independent meshes per collectible. **Maximum remains four pickup InstancedMeshes**, one per tier.
- Spins and bobbing are applied to the rendering marker only, using a stable distance-based phase; pause / reduced motion stay quiet. Collisions, respawns, gameplay rewards, lane position, route projection, NITRO logic and spawn distribution do not change.
- No Blender/GLB, external texture downloads or new NPM dependency. Art remains auditable and lightweight.

## Review checklist

- [x] All four guide images have complete different silhouettes and distinct color identities
- [x] All four scene pickups use tier-specific geometries, scales and continuous animation
- [x] CSS motion reduction, desktop/mobile bounds and base-URL rules are authored
- [x] Added geometry/instancing/motion tests, asset tests and responsive Playwright assertions
- [ ] Run `node --test tests/module-size.test.js`, `npm test`, `npm run typecheck`, `npm run build`, `npm run test:browser`, `make verify` on a working checkout
- [ ] Inspect desktop/mobile portrait and landscape WebGL captures on real devices, color/brightness and collision visibility
- [ ] Confirm exact-HEAD GitHub Actions CI; then merge only with explicit owner authorization
