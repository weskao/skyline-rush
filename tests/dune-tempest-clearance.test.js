import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { routeLength, sampleRoute } from '../src/course-route-frame.ts';
import { DUNE_TEMPEST_RACE } from '../src/courses/dune-tempest-race.ts';
import { createDuneTerrain } from '../src/courses/dune-tempest-terrain.ts';
import { createDuneTempestVisualChunk } from '../src/courses/dune-tempest-chunk.ts';

const { graph, noRoad } = DUNE_TEMPEST_RACE;
const length = id => routeLength(graph, id);
const sample = (id, s) => sampleRoute(graph, id, s);
const down = new THREE.Vector3(0, -1, 0);

for (const quality of ['low', 'medium', 'high']) test(`Dune's 14 race edges stay clear of rendered scenery at ${quality} quality`, () => {
  const scene = new THREE.Group(), chunks = [], surfaces = [];
  for (const { id } of graph.edges) for (let s = 0; s < length(id); s += 400) {
    const chunk = createDuneTempestVisualChunk(scene, id, s, Math.min(length(id), s + 400), length, sample, quality);
    chunks.push(chunk);
    chunk.group.updateMatrixWorld(true);
    chunk.group.traverse(mesh => {
      // Authored gameplay hazards may intentionally touch the drivable lanes.
      if (mesh.isMesh && !mesh.name.startsWith('Dune hazard ')) {
        surfaces.push({ mesh, box: new THREE.Box3().setFromObject(mesh), edge: id });
      }
    });
  }

  const terrain = createDuneTerrain();
  scene.add(terrain.group);
  terrain.group.updateMatrixWorld(true);
  for (const mesh of terrain.group.children) {
    surfaces.push({ mesh, box: new THREE.Box3().setFromObject(mesh), edge: 'terrain' });
  }

  const ray = new THREE.Raycaster(new THREE.Vector3(), down, 0, 185);
  const point = new THREE.Vector3(), right = new THREE.Vector3();
  const failures = [];
  try {
    for (const { id, width } of graph.edges) {
      const edgeLength = length(id);
      for (let s = .5; s < edgeLength; s += 3) {
        const frame = sample(id, s);
        const gap = noRoad[id]?.some(([from, to]) => s >= from && s < to);
        right.fromArray(frame.right);
        for (const fraction of [-.49, -.25, 0, .25, .49]) {
          point.fromArray(frame.point).addScaledVector(right, width * fraction);
          ray.ray.origin.copy(point);
          ray.ray.origin.y += 180;
          const hits = [];
          for (const { mesh, box, edge } of surfaces) {
            if (point.x < box.min.x || point.x > box.max.x || point.z < box.min.z || point.z > box.max.z) continue;
            for (const hit of ray.intersectObject(mesh, false)) {
              hits.push({ height: hit.point.y - point.y, name: mesh.name || mesh.geometry.type, edge });
            }
          }
          const blocker = hits.find(hit => hit.height > .18 && (hit.name !== 'Natural stone arch' || hit.height < 4.5));
          const road = hits.some(hit => hit.edge === id && hit.name === 'Dune road' && Math.abs(hit.height) < .18);
          if (blocker && failures.length < 10) failures.push(`${id} at ${s} m, lane ${fraction}: ${blocker.name} (${blocker.edge}) at +${blocker.height.toFixed(2)} m`);
          if (!gap && !road && failures.length < 10) failures.push(`${id} has no road at ${s} m, lane ${fraction}`);
        }
      }
    }
    assert.deepEqual(failures, []);
  } finally {
    terrain.dispose();
    chunks.forEach(chunk => chunk.dispose());
  }
});
