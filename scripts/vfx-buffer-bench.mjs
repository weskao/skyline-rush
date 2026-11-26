// Fixed-input VFX particle/buffer probe (Node, no WebGL). Drives the real effects.js + aero-vfx.js update paths
// with seeded Math.random and scripted race state, and emulates three's WebGLAttributes upload rule
// (update ranges, else the whole array) to count buffer-upload bytes. A per-frame digest of what the GPU would
// draw (shadow buffers + draw ranges, contributing primitives only) proves before/after visual equivalence.
// CPU-only, environment "node-cpu-no-webgl": not GPU time, not browser FPS, not device thermals.
// Usage: node scripts/vfx-buffer-bench.mjs [--frames=600] [--runs=5] [--json]
import { Scene, Group, PerspectiveCamera } from 'three';
import { createRace } from '../src/game.js';
import { createEffects } from '../src/effects.js';
import { createAeroVFX } from '../src/aero-vfx.js';
import { makeCar, CAR_STYLES } from '../src/car-model.js';
import { vfxSettings } from '../src/vfx-settings.ts';
import { seededRng } from '../src/rng.ts';

const arg = (name, fallback) => Number(process.argv.find(a => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback);
const FRAMES = arg('frames', 600), RUNS = arg('runs', 5), DT = 1 / 60;

// Scripted inputs: frame index -> race state. Same for every commit.
const SCENARIOS = {
  driving: (race, f) => { race.player.speed = 60; },
  boost: (race, f) => { race.player.speed = 80; race.player.boosting = true; },
  nitro: (race, f) => { race.player.speed = 90; race.player.boosting = true; race.player.nitroTime = 5; race.player.nitroBurst = 1 + (f / 200 | 0) % 3; },
  'drift-chain': (race, f) => { race.player.speed = 55; race.player.drift = { time: (f % 150) * DT * 1.6, nitro: 0, dir: f % 300 < 150 ? 1 : -1 }; },
  'multi-car-flight': (race, f) => {
    race.player.speed = 50; race.player.altitude = 3; race.player.thrusting = true;
    race.rivals.forEach(r => { r.thrusting = true; r.altitude = 3; r.speed = 50; });
  },
  'pickups-impacts': (race, f) => {
    race.player.speed = 60;
    if (f % 40 === 0) race.player.impact = { distance: race.player.distance + 4, x: 0, time: race.elapsed };
    if (f % 40 === 13) race.player.landing = { speed: 6, distance: race.player.distance, x: 0, time: race.elapsed, chain: f % 80 === 13 };
    if (f % 40 === 26) race.player.shieldBlock = { distance: race.player.distance + 2, x: 0, time: race.elapsed };
  },
  'garage-preview': (race, f) => { race.phase = 'ready'; },
  'launch-countdown': (race, f) => { race.phase = f < 180 ? 'countdown' : 'racing'; race.countdown = Math.max(0, 3 - f * DT); race.player.speed = f < 180 ? 0 : 40; },
  'idle-after-burst': (race, f) => { race.player.speed = 40; if (f === 0) race.player.impact = { distance: race.player.distance + 4, x: 0, time: race.elapsed }; },
};

function collectAttributes(scene) {
  const list = [];
  scene.traverse(o => {
    for (const a of Object.values(o.geometry?.attributes ?? {})) if (a.isBufferAttribute) list.push([o, a]);
    if (o.instanceMatrix) list.push([o, o.instanceMatrix]);
    if (o.instanceColor) list.push([o, o.instanceColor]);
  });
  return list;
}

// three r186 WebGLAttributes.update: a changed version uploads its update ranges, or the whole array; ranges are then cleared.
function uploads(entries, versions, shadows) {
  let bytes = 0;
  for (const [, a] of entries) {
    if (versions.get(a) === a.version) continue;
    const first = !versions.has(a); versions.set(a, a.version);
    let shadow = shadows.get(a);
    if (!shadow) shadows.set(a, shadow = a.array.slice());
    if (first || a.updateRanges.length === 0) { bytes += a.array.byteLength; shadow.set(a.array); }
    else for (const { start, count } of a.updateRanges) {
      bytes += count * a.array.BYTES_PER_ELEMENT; shadow.set(a.array.subarray(start, start + count), start);
    }
    a.clearUpdateRanges();
  }
  return bytes;
}

// FNV-1a over float bits of every primitive the GPU would draw with a nonzero alpha (the only ones that change pixels).
const f32 = new Float32Array(1), u32 = new Uint32Array(f32.buffer);
function mix(h, v) { f32[0] = v; return Math.imul(h ^ u32[0], 16777619) >>> 0; }
function digestPoints(h, object, shadows, perVertexNames) {
  if (!object.visible || !object.parent?.visible && object.parent?.type !== 'Scene') return h;
  const g = object.geometry, alpha = shadows.get(g.attributes.alpha) ?? g.attributes.alpha.array;
  const n = g.attributes.position.count, start = g.drawRange.start, end = Math.min(n, start + g.drawRange.count);
  for (let i = start; i < end; i++) {
    if (!(alpha[i] > 0)) continue;
    h = mix(h, i);
    for (const name of perVertexNames) {
      const a = g.attributes[name], s = shadows.get(a) ?? a.array;
      for (let c = 0; c < a.itemSize; c++) h = mix(h, s[i * a.itemSize + c]);
    }
  }
  return h;
}
function digestRibbon(h, mesh, shadows) {
  if (!mesh.visible || !mesh.parent?.visible) return h;
  const g = mesh.geometry, alpha = shadows.get(g.attributes.alpha) ?? g.attributes.alpha.array;
  const n = g.attributes.position.count, start = g.drawRange.start, end = Math.min(n, start + g.drawRange.count);
  for (let tri = start; tri + 2 < end; tri += 3) {
    if (!(alpha[tri] > 0 || alpha[tri + 1] > 0 || alpha[tri + 2] > 0)) continue;
    h = mix(h, tri);
    for (let v = tri; v < tri + 3; v++) for (const name of ['position', 'alpha', 'rollWake']) {
      const a = g.attributes[name], s = shadows.get(a) ?? a.array;
      for (let c = 0; c < a.itemSize; c++) h = mix(h, s[v * a.itemSize + c]);
    }
  }
  return h;
}

function drawables(scene) {
  let count = 0;
  scene.traverseVisible(o => { if (o.isMesh || o.isPoints || o.isLine) count++; });
  return count;
}

function runScenario(name, step) {
  globalThis.devicePixelRatio = 1;
  const realRandom = Math.random;
  Math.random = seededRng(12345, 'vfx-bench-' + name);
  try {
    const scene = new Scene(), camera = new PerspectiveCamera(60, 16 / 9, 0.1, 2000);
    const car = makeCar(CAR_STYLES.roadster); scene.add(car);
    const race = createRace(); race.phase = 'racing';
    const rivals = race.rivals.map(() => { const g = new Group(); g.userData.jets = { visible: true }; scene.add(g); return g; });
    const vehicles = [car, ...rivals];
    const effects = createEffects(scene, () => 0, { camera, player: car });
    const aero = createAeroVFX(scene, car);
    aero.setSkins({ 'launch-flare': 'launch-flare-blue', 'nitro-trail': 'nitro-trail-cyan' });
    const settings = vfxSettings({ airflow: true, quality: 'high' });
    const points = scene.children.find(o => o.isPoints);
    const vapor = scene.getObjectByName('World space gas wake'), ribbon = scene.getObjectByName('Continuous dash ribbon');
    const entries = collectAttributes(scene), versions = new Map(), shadows = new Map();
    uploads(entries, versions, shadows); // initial allocation upload is not a per-frame cost
    let bytes = 0, cpu = 0, live = 0, drawnPoints = 0, deadDrawn = 0, draws = 0, digest = 2166136261;
    const times = [];
    const origin = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; } };
    for (let f = 0; f < FRAMES; f++) {
      step(race, f);
      const preview = race.phase === 'ready';
      if (race.phase === 'racing') { race.elapsed += DT; race.player.distance += race.player.speed * DT; }
      car.position.set(race.player.x, race.player.altitude, -race.player.distance); car.updateMatrixWorld(true);
      rivals.forEach((g, i) => { g.position.set(3 * (i % 2 ? 1 : -1), race.rivals[i].altitude, -race.rivals[i].distance); g.updateMatrixWorld(true); });
      const t0 = performance.now();
      effects.update(race, DT, 0, preview, false, vehicles, { quality: 'high' });
      aero.update(race, DT, origin.set(0, 0, -race.player.distance), settings, false, null, preview);
      const t1 = performance.now();
      times.push(t1 - t0); cpu += t1 - t0;
      bytes += uploads(entries, versions, shadows);
      for (const p of [points, vapor]) {
        const g = p.geometry, alpha = g.attributes.alpha.array, start = g.drawRange.start;
        const end = Math.min(g.attributes.position.count, start + g.drawRange.count);
        for (let i = 0; i < alpha.length; i++) if (alpha[i] > 0) live++;
        if (!p.visible) continue;
        drawnPoints += end - start;
        // A dead point (alpha 0) within the draw range still rasterizes unless its vertex shader culls it.
        const culls = /alpha<=0\./.test(p.material.vertexShader);
        if (!culls) for (let i = start; i < end; i++) if (!(alpha[i] > 0)) deadDrawn++;
      }
      draws += drawables(scene);
      digest = digestPoints(digest, points, shadows, ['position', 'color', 'size', 'alpha', 'kind', 'velocity']);
      digest = digestPoints(digest, vapor, shadows, ['position', 'alpha', 'size', 'sparkSeed']);
      digest = digestRibbon(digest, ribbon, shadows);
    }
    times.sort((a, b) => a - b);
    return { cpuMsPerFrame: cpu / FRAMES, cpuP95: times[Math.floor(FRAMES * 0.95)], uploadBytesPerFrame: bytes / FRAMES,
      liveParticles: live / FRAMES, drawnPoints: drawnPoints / FRAMES, deadPointsRasterized: deadDrawn / FRAMES,
      visibleDrawables: draws / FRAMES, digest: digest.toString(16) };
  } finally { Math.random = realRandom; }
}

const rows = {};
for (const [name, step] of Object.entries(SCENARIOS)) {
  const runs = Array.from({ length: RUNS }, () => runScenario(name, step));
  const median = key => runs.map(r => r[key]).sort((a, b) => a - b)[RUNS >> 1];
  if (new Set(runs.map(r => r.digest)).size !== 1) throw Error(`${name}: nondeterministic digest`);
  rows[name] = { ...runs[0], cpuMsPerFrame: median('cpuMsPerFrame'), cpuP95: median('cpuP95') };
}
if (process.argv.includes('--json')) console.log(JSON.stringify({ environment: 'node-cpu-no-webgl', frames: FRAMES, runs: RUNS, rows }, null, 2));
else {
  console.log(`environment=node-cpu-no-webgl node=${process.version} frames=${FRAMES} runs=${RUNS} (CPU median of runs)`);
  console.log('scenario'.padEnd(18), 'cpu ms/f', 'p95', 'upload B/f', 'live', 'drawnPts', 'deadRaster', 'drawables', 'digest');
  for (const [name, r] of Object.entries(rows)) console.log(name.padEnd(18), r.cpuMsPerFrame.toFixed(4), r.cpuP95.toFixed(4),
    r.uploadBytesPerFrame.toFixed(0).padStart(10), r.liveParticles.toFixed(1).padStart(6), r.drawnPoints.toFixed(1).padStart(8),
    r.deadPointsRasterized.toFixed(1).padStart(10), r.visibleDrawables.toFixed(1).padStart(9), r.digest);
}
