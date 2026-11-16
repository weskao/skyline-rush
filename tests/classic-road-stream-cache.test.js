import test from 'node:test';
import assert from 'node:assert/strict';
import { BoxGeometry, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial } from 'three';
import { roadRibbon } from '../src/geometry.ts';
import { classicRoadRoute } from '../src/classic-road-routes.ts';
import { createClassicRoadRender } from '../src/classic-road-render.ts';
import { RACE_TRACKS } from '../src/race-tracks.ts';

const SEGMENTS = 120;
function makeRoad() {
  const geometry = roadRibbon(SEGMENTS), material = new MeshBasicMaterial();
  const pool = () => new InstancedMesh(new BoxGeometry(), material, SEGMENTS * 3);
  const meshes = { road: new Mesh(geometry, material), laneLines: pool(), curbs: pool(), edgeLines: pool(),
    railLights: pool(), tunnelRoofs: pool(), tunnelWalls: pool(), shortcutDeck: pool(), surfaceMarks: pool() };
  const put = (mesh, index, x, y, z, w, h, l, yaw) => {
    const matrix = new Matrix4().makeRotationY(yaw).multiply(new Matrix4().makeScale(w, h, l)).setPosition(x, y, z);
    mesh.setMatrixAt(index, matrix);
  };
  return { meshes, geometry, renderer: createClassicRoadRender(meshes, SEGMENTS, put, 2) };
}

test('the road, lane lines and tunnel boxes retain their GPU buffers within each sector', () => {
  const { meshes, geometry, renderer } = makeRoad(), route = classicRoadRoute('neon');
  const sections = RACE_TRACKS.neon.sections;
  const update = (distance, active = sections) => renderer.update('neon', route, distance, active, false, true);
  const uploads = () => [geometry.attributes.position.version, geometry.attributes.uv.version,
    meshes.laneLines.instanceMatrix.version, meshes.tunnelRoofs.instanceMatrix.version];
  update(610);
  const first = uploads(), x = meshes.road.position.x, z = meshes.road.position.z;
  update(611);
  assert.deepEqual(uploads(), first);
  assert.notDeepEqual([meshes.road.position.x, meshes.road.position.z], [x, z]);
  assert.deepEqual(meshes.road.position.toArray(), meshes.tunnelRoofs.position.toArray());
  update(612);
  assert.ok(uploads().every((version, i) => version === first[i] + 1));
  update(612, []);
  assert.ok(uploads().every((version, i) => version === first[i] + 2));
});

test('curved road mesh edges follow the lane frame, including at 50 km', () => {
  const { meshes, geometry, renderer } = makeRoad();
  const position = geometry.attributes.position;
  for (const id of ['coast', 'neon', 'canyon', 'aurora']) for (const distance of [721, 50251]) {
    const route = classicRoadRoute(id);
    renderer.update(id, route, distance, [], false, true);
    const origin = route.point(distance), tile = Math.floor(distance / 12) * 12;
    for (let row = 0; row <= SEGMENTS; row += 3) {
      for (const side of [-1, 1]) {
        const i = row * 2 + (side + 1) / 2, d = tile + (row - 5) * 12;
        const [x, z] = route.point(d, side * 12);
        assert.ok(Math.abs(position.getX(i) + meshes.road.position.x - (x - origin[0])) < .001, id);
        assert.ok(Math.abs(position.getZ(i) + meshes.road.position.z - (z - origin[1])) < .001, id);
      }
    }
  }
});

test('Canyon gaps cut both the road and its edge cues, while the streamed road is solid', () => {
  const { meshes, geometry, renderer } = makeRoad();
  const route = classicRoadRoute('canyon'), sections = RACE_TRACKS.canyon.sections;
  renderer.update('canyon', route, 1500, sections, false, true);
  const row = 5, index = geometry.index.array;
  assert.deepEqual([...index.slice(row * 6, row * 6 + 6)], Array(6).fill(0));
  const transform = new Matrix4();
  meshes.curbs.getMatrixAt(row * 2, transform);
  assert.ok(transform.elements[13] < -500);
  renderer.update('canyon', route, 1500, [], false, true);
  assert.ok(index[row * 6] > 0);
  meshes.curbs.getMatrixAt(row * 2, transform);
  assert.ok(transform.elements[13] > 0);
});

test('each broken span starts and ends at the exact playable gap boundary', () => {
  const { meshes, geometry, renderer } = makeRoad();
  const route = classicRoadRoute('canyon'), sections = RACE_TRACKS.canyon.sections;
  for (const { from, to } of sections.filter(s => s.type === 'gap')) {
    renderer.update('canyon', route, from, sections, false, true);
    const pos = geometry.attributes.position, indices = geometry.index.array;
    const originZ = route.point(from)[1];
    const edgeZ = row => (pos.getZ(row * 2) + pos.getZ(row * 2 + 1)) / 2 + meshes.road.position.z + originZ;
    const first = Array.from({ length: SEGMENTS }, (_, row) => row).find(row => indices[row * 6 + 1] === 0);
    let last = first;
    while (indices[(last + 1) * 6 + 1] === 0) last++;
    assert.ok(Math.abs(edgeZ(first) - route.point(from)[1]) < .001, 'takeoff at ' + from);
    assert.ok(Math.abs(edgeZ(last + 1) - route.point(to)[1]) < .001, 'landing at ' + to);
  }
});
