import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createStormlineChunk } from '../src/courses/stormline-scenery.ts';

// Fixture stands in for the SHARED CourseGraph sampler; it never runs independent physics.
const sample = (_edge, s) => ({ point: [0, 24, -s], right: [1, 0, 0], up: [0, 1, 0] });
test('streamed road chunk contains real 3D road, rails and instanced city architecture', () => {
  const high = createStormlineChunk('skyway-cut', 180, 450, sample, 'high');
  const low = createStormlineChunk('skyway-cut', 180, 450, sample, 'low');
  const road = high.group.getObjectByName('stormline:road:skyway-cut');
  const buildings = high.group.getObjectByName('stormline:buildings:skyway-cut');
  assert.ok(road instanceof THREE.Mesh);
  assert.ok(road.geometry.getAttribute('position').count > 40);
  assert.ok(buildings instanceof THREE.InstancedMesh);
  assert.ok(buildings.count > low.group.getObjectByName('stormline:buildings:skyway-cut').count);
  assert.ok(high.group.children.some(child => child instanceof THREE.Mesh && child.geometry instanceof THREE.CylinderGeometry));
  high.dispose(); low.dispose();
});
test('flight gap never gains fake collision road; chunk resources are disposed exactly once', () => {
  const gap = createStormlineChunk('roof-flight', 60, 310, sample, 'medium');
  assert.equal(gap.group.getObjectByName('stormline:road:roof-flight'), undefined);
  gap.dispose();
  const street = createStormlineChunk('night-start', 0, 160, sample, 'low');
  const road = street.group.getObjectByName('stormline:road:night-start');
  let releases = 0;
  road.geometry.addEventListener('dispose', () => { releases++; });
  const scene = new THREE.Scene();
  scene.add(street.group);
  street.dispose(); street.dispose();
  assert.equal(releases, 1);
  assert.equal(street.group.parent, null);
});

test('neon signs retain identical world positions across arbitrary stream chunk boundaries', () => {
  const signs = chunk => chunk.group.children
    .filter(object => object.name === 'stormline:billboard:night-start')
    .map(object => Math.round(-object.position.z));
  const whole = createStormlineChunk('night-start', 0, 700, sample, 'high');
  const first = createStormlineChunk('night-start', 0, 230, sample, 'high');
  const second = createStormlineChunk('night-start', 230, 700, sample, 'high');
  try {
    assert.deepEqual([...signs(first), ...signs(second)], signs(whole));
  } finally {
    whole.dispose(); first.dispose(); second.dispose();
  }
});

test('zero-length stream windows allocate no road meshes or GPU geometry', () => {
  const empty = createStormlineChunk('night-start', 300, 300, sample, 'high');
  const reversed = createStormlineChunk('night-start', 400, 200, sample, 'low');
  try {
    assert.equal(empty.group.children.length, 0);
    assert.equal(reversed.group.children.length, 0);
  } finally {
    empty.dispose(); reversed.dispose();
  }
});

test('tunnel stream contains a real overhead shell and side walls without city towers inside', () => {
  const tunnel = createStormlineChunk('tunnel-cut', 120, 330, sample, 'medium');
  try {
    assert.ok(tunnel.group.getObjectByName('stormline:road:tunnel-cut') instanceof THREE.Mesh);
    assert.equal(tunnel.group.getObjectByName('stormline:buildings:tunnel-cut'), undefined);
    for (const side of ['roof', 'left', 'right']) {
      const shell = tunnel.group.getObjectByName(`stormline:tunnel:${side}:tunnel-cut`);
      assert.ok(shell instanceof THREE.Mesh, `Missing tunnel ${side}`);
      assert.ok(shell.geometry.getAttribute('position').count >= 6);
      if (side === 'roof') {
        const positions = shell.geometry.getAttribute('position');
        for (let i = 0; i < positions.count; i++) assert.ok(positions.getY(i) >= 29);
      }
    }
  } finally {
    tunnel.dispose();
  }
});
