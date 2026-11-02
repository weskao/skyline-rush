import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const file = new URL('../src/upcoming-scenes/stormline-megacity.ts', import.meta.url);

test('Stormline supplies its own real Three.js environment module', () => {
  assert.equal(existsSync(file), true, 'missing dedicated Three.js scene (not a JPEG hero)');
  const source = readFileSync(file, 'utf8');
  assert.match(source, /createUpcomingEnvironment\(/);
  assert.doesNotMatch(source, /new THREE\.(WebGLRenderer|PerspectiveCamera|Scene)\s*\(/);
  assert.doesNotMatch(source, /requestAnimationFrame|createRace\(|document\.|window\./);
});

async function environment() {
  const THREE = await import('three');
  const ts = await import('typescript');
  const source = readFileSync(file, 'utf8');
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', js)(createRequire(import.meta.url), mod, mod.exports);
  const scene = new THREE.Scene();
  const env = mod.exports.createUpcomingEnvironment(scene);
  return { THREE, scene, env };
}

function get(group, name) {
  const found = group.getObjectByName(name);
  assert.ok(found, 'missing scene landmark: ' + name);
  return found;
}
function span(mesh, axis) {
  const a = mesh.geometry.getAttribute('position');
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < a.count; i++) {
    const v = a.getComponent(i, axis);
    min = Math.min(min, v); max = Math.max(max, v);
  }
  return { min, max };
}

test('ground road spans the showcase anchor; elevated ramp visibly rises above it', async () => {
  const { scene, env } = await environment();
  assert.equal(env.group.parent, scene);
  assert.equal(env.group.isGroup, true);
  const road = get(env.group, 'stormline:road:ground');
  const ramp = get(env.group, 'stormline:road:ramp');
  const skyway = get(env.group, 'stormline:road:skyway');
  const crossing = get(env.group, 'stormline:road:crossing');
  assert.ok(span(road, 2).min < -170 && span(road, 2).max > 40);
  assert.ok(Math.abs(span(road, 1).min) < 0.2, 'car at origin must be on the road');
  assert.ok(span(ramp, 1).min < 1 && span(ramp, 1).max > 12);
  assert.ok(span(skyway, 1).max > 17 && span(crossing, 1).max > 21);
  assert.ok(span(skyway, 0).max - span(skyway, 0).min > 15);
  env.dispose();
});

test('city has batched buildings, three major anchors and local atmospheric depth', async () => {
  const { THREE, env } = await environment();
  for (const name of ['stormline:skyline', 'stormline:interchange', 'stormline:holograms',
    'stormline:wet-reflections', 'stormline:haze']) get(env.group, name);
  const instanced = [];
  const lights = [];
  const drawables = [];
  env.group.traverse(object => {
    if (object instanceof THREE.InstancedMesh) instanced.push(object);
    if (object.isLight) lights.push(object);
    if (object.isMesh || object.isPoints || object.isLineSegments) drawables.push(object);
  });
  assert.ok(instanced.some(mesh => mesh.count >= 80), 'buildings must be dense');
  assert.ok(instanced.length >= 3, 'repeated façades / windows / traffic should be batched');
  assert.ok(lights.length >= 2);
  assert.ok(drawables.length <= 130, 'avoid excessive WebGL draw calls in the hero');
  env.dispose();
});

test('rain and distant traffic animate with absolute time without reallocating objects', async () => {
  const { env } = await environment();
  const rain = get(env.group, 'stormline:rain');
  const traffic = get(env.group, 'stormline:traffic');
  env.update(0, 'high', false);
  const rainBuffer = rain.geometry.getAttribute('position');
  const firstRain = Array.from(rainBuffer.array.slice(0, 18));
  const firstTraffic = traffic.instanceMatrix.array.slice(0, 32);
  env.update(2.5, 'high', false);
  assert.equal(rain.geometry.getAttribute('position'), rainBuffer);
  assert.notDeepEqual(Array.from(rainBuffer.array.slice(0, 18)), firstRain);
  assert.notDeepEqual(Array.from(traffic.instanceMatrix.array.slice(0, 32)), Array.from(firstTraffic));
  const stableRain = Array.from(rainBuffer.array.slice(0, 18));
  const stableTraffic = Array.from(traffic.instanceMatrix.array.slice(0, 32));
  env.update(2.5, 'high', false);
  assert.deepEqual(Array.from(rainBuffer.array.slice(0, 18)), stableRain);
  assert.deepEqual(Array.from(traffic.instanceMatrix.array.slice(0, 32)), stableTraffic);
  env.dispose();
});

test('low quality cuts weather workload; reduced motion freezes decorative animation', async () => {
  const { env } = await environment();
  const rain = get(env.group, 'stormline:rain');
  const traffic = get(env.group, 'stormline:traffic');
  const signs = get(env.group, 'stormline:sign-glow');
  env.update(3, 'high', false);
  const highCount = rain.geometry.drawRange.count;
  env.update(4, 'low', false);
  assert.ok(rain.geometry.drawRange.count < highCount);
  assert.ok(traffic.count <= 10, 'Low must reduce traffic density');
  env.update(15, 'high', true);
  assert.equal(rain.visible, false);
  const frozen = Array.from(traffic.instanceMatrix.array);
  const glow = signs.material.emissiveIntensity;
  env.update(29, 'high', true);
  assert.deepEqual(Array.from(traffic.instanceMatrix.array), frozen);
  assert.equal(signs.material.emissiveIntensity, glow);
  env.update(29, 'medium', false);
  assert.equal(rain.visible, true);
  env.dispose();
});

test('dispose releases owned geometries/materials and detaches only the environment', async () => {
  const { scene, env } = await environment();
  const geometry = new Set(), material = new Set();
  env.group.traverse(o => {
    if (o.geometry) geometry.add(o.geometry);
    if (o.material) for (const m of [].concat(o.material)) material.add(m);
  });
  const released = new Set();
  for (const resource of [...geometry, ...material]) {
    resource.dispose = () => released.add(resource);
  }
  env.dispose();
  env.dispose();
  assert.equal(env.group.parent, null);
  assert.equal(scene.children.length, 0);
  assert.equal(released.size, geometry.size + material.size, 'every owned GPU resource is released');
});
