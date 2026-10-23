import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scene, Group, Mesh, BoxGeometry, Matrix4, BackSide } from 'three';
import { createSkyScene } from '../src/sky-scene.js';
import { createWorldTourScene, WORLD_THEMES } from '../src/world-tour-scene.js';
import { RACE_TRACKS } from '../src/game.js';
import { createEffects } from '../src/effects.js';
import { createAeroVFX } from '../src/aero-vfx.js';

// GLSL pow(x, y) is undefined for x < 0; interpolated varyings overshoot [0,1] by an ulp at triangle edges,
// and the resulting NaN pixel is spread by the bloom blur into a full black frame.
test('every VFX shader clamps pow() bases so edge pixels cannot produce NaN black frames', t => {
  globalThis.devicePixelRatio = 1;
  t.after(() => { delete globalThis.devicePixelRatio; });
  const scene = new Scene(), vehicle = new Group();
  vehicle.userData.body = new Mesh(new BoxGeometry(2, 1, 4));
  scene.add(vehicle);
  createEffects(scene, () => 0);
  createAeroVFX(scene, vehicle);
  const skyCourse = new Scene();
  createSkyScene(skyCourse).update(400, 'high');
  const shaders = new Set();
  for (const root of [scene, skyCourse]) root.traverse(object => { if (object.material?.isShaderMaterial) shaders.add(object.material.fragmentShader); });
  assert.ok(shaders.size >= 5);
  const unguarded = [...shaders].flatMap(source => source.split(/\bpow\(/).slice(1)).filter(arg => !/^(max\(0\.,|clamp\()/.test(arg));
  assert.deepEqual(unguarded.map(arg => `pow(${arg.slice(0, 30)}`), []);
  // exp() overflows to Inf once its argument passes ~88, and a varying is extrapolated far past its range where MSAA
  // covers a sliver triangle whose pixel centre lies outside it; Inf times a zero fade is the NaN that blacked out
  // nitro. Every exp() argument must be a negated non-negative term: abs(), dot(), length(), a square, or a scalar
  // the shader defined through clamp().
  const unbounded = [...shaders].flatMap(source => source.split(/\bexp\(/).slice(1).map(arg => arg.replace(/\s/g, '')).filter(arg => {
    const term = arg.match(/^-(abs\(|dot\(|length\(|clamp\(|(\w+)\*\2\b|(\w+)\b)/);
    return !term || (term[3] && !source.includes(`float ${term[3]}=clamp(`));
  }));
  assert.deepEqual(unbounded.map(arg => `exp(${arg.slice(0, 30)}`), []);
});

// Lit materials divide by the interpolated normal: a missing normal attribute or a zero-scale instance matrix
// gives NaN in the lighting, and bloom spreads that pixel into a black frame (the World Tour road shipped this way).
const unlit = material => material.isMeshBasicMaterial || material.isShaderMaterial || material.isPointsMaterial || material.isLineBasicMaterial || material.isSpriteMaterial;
function litFaults(scene) {
  const faults = [], matrix = new Matrix4();
  scene.traverse(object => {
    if (!object.isMesh || [object.material].flat().every(unlit)) return;
    const name = `${object.parent?.name || 'scene'}/${object.name || object.geometry.type}`;
    const normal = object.geometry.attributes.normal;
    if (!normal) return faults.push(`${name}: no normal attribute`);
    for (let i = 0; i < normal.count; i++) {
      const length = Math.hypot(normal.getX(i), normal.getY(i), normal.getZ(i));
      if (!(Math.abs(length - 1) < 1e-3)) return faults.push(`${name}: normal ${i} has length ${length}`);
    }
    if (object.isInstancedMesh) for (let i = 0; i < object.count; i++) {
      const det = (object.getMatrixAt(i, matrix), matrix.determinant());
      if (!Number.isFinite(det) || det === 0) return faults.push(`${name}: instance ${i} is collapsed`);
    }
  });
  return faults;
}

test('every lit mesh in the 3D courses has unit normals and non-degenerate instances', () => {
  const sky = new Scene(), tour = new Scene();
  createSkyScene(sky).update(800, 'high');
  const tourScene = createWorldTourScene(tour);
  const ids = Object.keys(WORLD_THEMES);
  assert.ok(ids.length >= 5);
  for (const id of ids) {
    tourScene.update(id, 500, 'high', RACE_TRACKS[id].sections);
    assert.deepEqual(litFaults(tour), [], id);
  }
  assert.deepEqual(litFaults(sky), [], 'spiral');
});

test('Sky Spiral owns a sky backdrop that appears with the course and hides with it', () => {
  const scene = new Scene();
  const course = createSkyScene(scene);
  course.update(400, 'high');
  const backdrop = scene.getObjectByName('Sky Spiral backdrop');
  assert.ok(backdrop?.isMesh, 'spiral course has its own sky backdrop');
  assert.equal(backdrop.parent?.name, 'Sky Spiral 3D course');
  assert.equal(backdrop.material.side, BackSide);
  assert.equal(backdrop.parent.visible, true);
  course.hide();
  assert.equal(backdrop.parent.visible, false);
});
