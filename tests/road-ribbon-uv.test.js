import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { roadRibbon, setRoadRow, ROAD_UV_METRES } from '../src/geometry.ts';

// Mirrors the classic (Coast/Neon/Canyon/Aurora) road writer in src/world.js: 12 m rows, the ribbon starts 5 rows
// before the current 12 m tile, roadCenter() supplies x.
const ROWS = 120, center = d => Math.sin(d / 900) * 40;
function writeRibbon(geometry, tile) {
  for (let i = 0; i <= ROWS; i++) { const d = tile + (i - 5) * 12; setRoadRow(geometry, i, center(d), -d, d, tile); }
}
const frac = v => v - Math.floor(v);

test('road ribbon carries a UV0 attribute for PBR maps', () => {
  const geometry = roadRibbon(ROWS);
  assert.equal(geometry.attributes.uv?.count, (ROWS + 1) * 2);
});

test('road rows keep the physics width, flat surface and centreline (collision/clearance parity)', () => {
  const geometry = roadRibbon(ROWS), position = geometry.attributes.position;
  writeRibbon(geometry, 3600);
  for (let i = 0; i <= ROWS; i++) {
    const d = 3600 + (i - 5) * 12;
    assert.deepEqual([position.getX(i * 2), position.getY(i * 2), position.getZ(i * 2)], [Math.fround(center(d) - 12), 0, -d]);
    assert.deepEqual([position.getX(i * 2 + 1), position.getY(i * 2 + 1)], [Math.fround(center(d) + 12), 0]);
  }
});

test('road UV is continuous along the ribbon and stable while the ribbon moves, even across the wrap period', () => {
  const geometry = roadRibbon(ROWS), uv = geometry.attributes.uv;
  const step = 12 / ROAD_UV_METRES;
  // Tiles chosen so the ribbon (and the tile itself) crosses the float-safety wrap period.
  for (const tile of [0, 1188, 1536 * 4 - 12, 1536 * 4, 90000]) {
    writeRibbon(geometry, tile);
    for (let i = 0; i <= ROWS; i++) {
      assert.equal(uv.getX(i * 2), 0, 'left edge u');
      assert.equal(uv.getX(i * 2 + 1), 1, 'right edge u');
      assert.equal(uv.getY(i * 2), uv.getY(i * 2 + 1), 'row v shared by both edges');
      if (i) assert.ok(Math.abs(uv.getY(i * 2) - uv.getY(i * 2 - 2) - step) < 1e-4, `seam at tile ${tile} row ${i}`);
      assert.ok(Math.abs(uv.getY(i * 2)) < 512, 'v stays small enough for float32 texel precision');
    }
    const next = roadRibbon(ROWS);
    writeRibbon(next, tile + 12);
    // The same road distance samples the same texel after the ribbon advances one tile.
    for (let i = 1; i <= ROWS; i++) {
      const a = frac(uv.getY(i * 2)), b = frac(next.attributes.uv.getY((i - 1) * 2));
      assert.ok(Math.min(Math.abs(a - b), 1 - Math.abs(a - b)) < 1e-4, `texture swims at tile ${tile}`);
    }
  }
});

test('road tangent space is right-handed with the up normal (normal maps not mirrored)', () => {
  const geometry = roadRibbon(ROWS);
  writeRibbon(geometry, 2400);
  const p = geometry.attributes.position, uv = geometry.attributes.uv, index = geometry.index;
  const P = k => new Vector3(p.getX(k), p.getY(k), p.getZ(k));
  for (let t = 0; t < index.count; t += 3) {
    const [a, b, c] = [index.getX(t), index.getX(t + 1), index.getX(t + 2)];
    const e1 = P(b).sub(P(a)), e2 = P(c).sub(P(a));
    const du1 = uv.getX(b) - uv.getX(a), dv1 = uv.getY(b) - uv.getY(a);
    const du2 = uv.getX(c) - uv.getX(a), dv2 = uv.getY(c) - uv.getY(a);
    const r = 1 / (du1 * dv2 - du2 * dv1);
    const tangent = e1.clone().multiplyScalar(dv2).sub(e2.clone().multiplyScalar(dv1)).multiplyScalar(r);
    const bitangent = e2.clone().multiplyScalar(du1).sub(e1.clone().multiplyScalar(du2)).multiplyScalar(r);
    assert.ok(tangent.x > 0, 'u runs left → right across the road');
    assert.ok(bitangent.z < 0, 'v runs forward along the driving direction');
    assert.ok(tangent.cross(bitangent).y > 0, `triangle ${t / 3} mirrors the normal map`);
  }
});

test('the classic road writer in world.js uses setRoadRow and uploads UVs with positions', async () => {
  const { readFileSync } = await import('node:fs');
  const source = readFileSync(new URL('../src/world.js', import.meta.url), 'utf8');
  assert.match(source, /setRoadRow\(roadGeometry, i, x, z, d, tile\)/);
  assert.match(source, /roadGeometry\.attributes\.position\.needsUpdate = roadGeometry\.attributes\.uv\.needsUpdate = true/);
});
