import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scene, Group, Mesh, BoxGeometry, Vector3 } from 'three';
import { createRace } from '../src/game.js';
import { createAeroVFX, dashSamples } from '../src/aero-vfx.js';
import { vfxSettings } from '../src/vfx-settings.ts';
import { trackPoint } from '../src/track-paths.ts';

function fixture() {
  const scene = new Scene(), vehicle = new Group();
  vehicle.userData.body = new Mesh(new BoxGeometry(2, 1, 4));
  scene.add(vehicle);
  const vfx = createAeroVFX(scene, vehicle), race = createRace();
  race.phase = 'racing'; race.player.boosting = true; race.player.speed = 80;
  const options = vfxSettings({ airflow: true });
  const update = (dt = 0.05, center = 0, distance = 0, originY = 0) => vfx.update(race, dt, center, distance, options, false, originY);
  const vapor = scene.getObjectByName('World space gas wake');
  return { scene, vehicle, vfx, race, options, update, vapor };
}

test('visual settings clamp untrusted persisted values and preserve explicit zeroes', () => {
  const settings = vfxSettings({ afterimages: 99, fov: -4, vaporDensity: NaN, shake: 0, quality: 'ultra', preset: '__proto__' });
  assert.equal(settings.afterimages, 8);
  assert.equal(settings.fov, 0);
  assert.equal(settings.shake, 0);
  assert.equal(settings.vaporDensity, 0.65);
  assert.equal(settings.quality, 'high');
  assert.equal(settings.preset, 'cinematic');
  assert.equal(vfxSettings(null).enabled, true);
});

test('dash sampling covers a short fast displacement and bounds teleport work', () => {
  const from = new Vector3(), to = new Vector3(0, 0, -18), samples = [];
  dashSamples(from, to, 1, 32, t => samples.push(t * 18));
  assert.equal(samples.at(-1), 18);
  assert.ok(samples.every((s, i) => s - (samples[i - 1] || 0) <= 1.001));
  samples.length = 0;
  dashSamples(from, new Vector3(0, 0, -10000), 1, 32, t => samples.push(t * 10000));
  assert.equal(samples.length, 32);
  assert.ok(samples[0] >= 9940);
  assert.equal(samples.at(-1), 10000);
});

test('VFX is read-only to race state, follows rotated anchors and rebases historical vapor', () => {
  const { vehicle, race, update, vapor } = fixture();
  vehicle.rotation.y = Math.PI / 2;
  const before = structuredClone(race);
  update();
  assert.deepEqual(race, before);
  const { alpha, position } = vapor.geometry.attributes;
  const alive = [...alpha.array].flatMap((a, i) => a > 0 ? [i] : []);
  assert.ok(alive.length >= 4);
  for (const i of alive) assert.ok(position.array[i * 3] > 2.39, 'rearward gas rotates into +X');
  const snapshot = position.array.slice();
  vehicle.position.x -= 10;
  update(0, 10, 20);
  for (const i of alive) {
    assert.ok(Math.abs(position.array[i * 3] - snapshot[i * 3] + 10) < 0.0001);
    assert.ok(Math.abs(position.array[i * 3 + 2] - snapshot[i * 3 + 2] - 20) < 0.0001);
  }
});

test('repeated boost cycles stay bounded, release fades and restart clears every transient', () => {
  const { scene, vfx, race, update, vapor } = fixture();
  const count = scene.children.length;
  const array = vapor.geometry.attributes.position.array;
  for (let i = 0; i < 600; i++) { race.player.boosting = i % 20 < 10; update(); }
  assert.equal(scene.children.length, count);
  assert.equal(vapor.geometry.attributes.position.array, array);
  assert.ok([...array].every(Number.isFinite));
  race.player.boosting = false;
  for (let i = 0; i < 100; i++) update();
  assert.ok(vapor.geometry.attributes.alpha.array.every(a => a === 0));
  race.player.boosting = true; update();
  assert.ok(vapor.geometry.attributes.alpha.array.some(a => a > 0));
  vfx.reset();
  assert.ok(vapor.geometry.attributes.alpha.array.every(a => a === 0));
  assert.ok(scene.children.filter(child => child.isLineSegments).every(child => !child.visible));
});

test('NITRO and drift rewards ignite the existing exhaust without a held BOOST input', () => {
  for (const reserve of ['nitroTime', 'miniBoost']) {
    const { race, update, vapor, vfx } = fixture();
    race.player.boosting = false;
    race.player[reserve] = 1;
    const feedback = update();
    assert.ok(feedback.strength > 0.8, `${reserve} ignites boost feedback`);
    assert.ok(vapor.geometry.attributes.alpha.array.some(alpha => alpha > 0), `${reserve} emits exhaust`);
    race.player[reserve] = 0;
    for (let i = 0; i < 100; i++) update();
    assert.ok(vapor.geometry.attributes.alpha.array.every(alpha => alpha === 0));
    vfx.reset();
    race.phase = 'paused';
    race.player[reserve] = 1;
    assert.equal(update().strength, 0, 'paused rewards cannot ignite exhaust');
  }
});

test('collision discontinuity never interpolates exhaust through the rejected path', () => {
  const { vehicle, race, update, vapor, vfx } = fixture();
  update(); vfx.reset(); update(0);
  vehicle.position.z = -40;
  race.player.impact = { time: 1 };
  update();
  const { alpha, position } = vapor.geometry.attributes;
  assert.ok(alpha.array.some(a => a > 0));
  for (let i = 0; i < alpha.array.length; i++) if (alpha.array[i] > 0) assert.ok(position.array[i * 3 + 2] < -30);
});

function rollingTrace(speed = 80, omega = 5, quality = 'high') {
  const f = fixture();
  f.race.player.boosting = false; f.race.player.speed = speed;
  f.race.player.altitude = f.vehicle.position.y = 6;
  f.race.player.trick = { dir: Math.sign(omega), time: 0.3, done: false };
  f.options.airflow = false; f.options.quality = quality;
  f.update(0);
  f.vehicle.position.z = -speed * 0.1; f.vehicle.rotation.z = omega * 0.1;
  f.update(0.1);
  f.ribbon = f.scene.getObjectByName('Continuous dash ribbon');
  return f;
}

test('roll tracers stay in ambient world space and move rearward relative to the translating, rotating car', () => {
  for (const dir of [-1, 1]) {
    const { vehicle, options, update, vapor } = rollingTrace(80, dir * 5);
    const { alpha, position } = vapor.geometry.attributes;
    const alive = [...alpha.array].flatMap((a,i) => a > 0 ? [i] : []);
    assert.ok(alive.length > 4);
    const old = position.array.slice();
    const point = new Vector3().fromArray(old, alive[0] * 3);
    const q0 = point.clone().sub(vehicle.position).applyQuaternion(vehicle.quaternion.clone().invert());
    vehicle.position.z -= 4; vehicle.rotation.z += dir * 0.2;
    options.vaporDensity = 0; update(0.05);
    for (const i of alive) for (let axis = 0; axis < 3; axis++) assert.equal(position.array[i*3+axis], old[i*3+axis], 'ambient markers must not gain exhaust velocity or follow later body rotation');
    const q1 = point.clone().sub(vehicle.position).applyQuaternion(vehicle.quaternion.clone().invert());
    assert.ok(Math.abs(q1.z - q0.z - 4) < 0.0001, 'still air convects toward local +z rear as the car advances');
    const angle = Math.atan2(Math.sin(Math.atan2(q1.y,q1.x)-Math.atan2(q0.y,q0.x)), Math.cos(Math.atan2(q1.y,q1.x)-Math.atan2(q0.y,q0.x)));
    assert.ok(Math.abs(angle + dir*0.2) < 0.0001, 'rotating-frame angular transport has the opposite sign');
  }
});

test('both sides share physical wake handedness dphi/dz=-omega/U; reversing roll reverses winding and doubling speed doubles pitch', () => {
  const pitches = [];
  for (const speed of [40,80]) for (const omega of [-5,5]) {
    const { vehicle, vapor } = rollingTrace(speed, omega);
    const { alpha, position } = vapor.geometry.attributes;
    for (const port of [0,3]) {
      const points = [...alpha.array].flatMap((a,i) => a > 0 && i%4 === port ? [new Vector3().fromArray(position.array,i*3).sub(vehicle.position)] : []);
      assert.ok(points.length >= 3);
      const a=points[0], b=points.at(-1);
      const dphi=Math.atan2(Math.sin(Math.atan2(b.y,b.x)-Math.atan2(a.y,a.x)),Math.cos(Math.atan2(b.y,b.x)-Math.atan2(a.y,a.x)));
      const slope=dphi/(b.z-a.z);
      assert.ok(Math.abs(slope + omega/speed) < 0.0001, 'winding must follow motion history, not mirrored preset helices');
      if(omega===5 && port===0)pitches.push(Math.abs(2*Math.PI/slope));
    }
  }
  assert.ok(Math.abs(pitches[1]/pitches[0]-2) < 0.0001);
});

test('ambient history retains absolute XYZ while elevated and spiral render origins advance', () => {
  for (const [track, from] of [['alpine',2008],['spiral',1300],['harbor-circuit',200]]) {
    const { vehicle, update, vapor, options } = rollingTrace();
    const a=trackPoint(track,from), b=trackPoint(track,from+8);
    options.vaporDensity=0;
    update(0.05,a.x,-a.z,a.y);
    const {alpha,position}=vapor.geometry.attributes;
    const alive=[...alpha.array].flatMap((v,i)=>v>0?[i]:[]);
    assert.ok(alive.length>0);
    const absolute=alive.map(i=>new Vector3().fromArray(position.array,i*3).add(a));
    vehicle.position.x+=a.x-b.x;vehicle.position.y+=a.y-b.y;vehicle.position.z+=a.z-b.z;
    update(0,b.x,-b.z,b.y);
    for(let j=0;j<alive.length;j++) {
      const actual=new Vector3().fromArray(position.array,alive[j]*3).add(b);
      assert.ok(actual.distanceTo(absolute[j])<0.0002,track+' history must subtract the entire moving render origin');
    }
  }
});

test('barrel roll creates world-space streaks without pretending to solve attached airflow or ignite BOOST', () => {
  const { vfx, scene, race, ribbon, vapor } = rollingTrace();
  const flow = vfx.group.children.find(child => child.geometry?.getAttribute('flowType'));
  assert.equal(flow.visible, false, 'the unvalidated showcase airflow is not used as a roll flow field');
  assert.ok(vapor.geometry.attributes.alpha.array.some(a => a > 0));
  assert.ok(ribbon.geometry.attributes.alpha.array.some(a => a > 0));
  assert.ok(ribbon.geometry.attributes.rollWake.array.some(a => a === 1));
  assert.equal(ribbon.parent, scene, 'shed history stays outside the rotating vehicle hierarchy');
  assert.ok(vfx.group.children.filter(child => child.name.startsWith('Cold gas nozzle')).every(child => !child.visible));
  assert.equal(race.player.boosting, false);
});

test('quality changes sample detail rather than prescribing a different winding; ordinary driving has no roll streaks', () => {
  const counts=[];
  for(const quality of ['low','medium','high']) {
    const f=rollingTrace(80,5,quality);
    counts.push([...f.ribbon.geometry.attributes.alpha.array].filter(a=>a>0).length);
    f.vfx.reset(); f.race.player.trick=null; f.update();
    assert.ok(f.vapor.geometry.attributes.alpha.array.every(a=>a===0));
    assert.ok(f.ribbon.geometry.attributes.alpha.array.every(a=>a===0));
  }
  assert.equal(counts[0],0); assert.ok(counts[1]>0 && counts[2]>counts[1]);
});

test('completed/cancelled roll traces fade, pause freezes them, and restart clears their history', () => {
  for(const done of [true,false]) {
    const {vfx,race,update,vapor,ribbon}=rollingTrace();
    const before=structuredClone(race);
    race.phase='paused'; const alpha=vapor.geometry.attributes.alpha.array.slice();update(0);
    assert.deepEqual(vapor.geometry.attributes.alpha.array,alpha);
    race.phase='racing'; assert.deepEqual(race,before);
    race.player.trick=done?{dir:1,time:0.8,done:true}:null;
    update();assert.ok(vapor.geometry.attributes.alpha.array.some(a=>a>0));
    for(let i=0;i<60;i++)update();
    assert.ok(vapor.geometry.attributes.alpha.array.every(a=>a===0));
    assert.ok(ribbon.geometry.attributes.alpha.array.every(a=>a===0));
    vfx.reset();assert.ok(vapor.geometry.attributes.alpha.array.every(a=>a===0));
  }
});

test('switching off roll visuals clears already emitted roll vapor and ribbon', () => {
  for (const [key, value] of [['enabled', false], ['quality', 'low'], ['airflowDensity', 0], ['airflowOpacity', 0], ['comfortable', true], ['reducedMotion', true]]) {
    const { scene, vehicle, race, options, update, vapor, vfx } = fixture();
    race.player.boosting = false; options.airflow = false;
    race.player.altitude = vehicle.position.y = 6;
    race.player.trick = { dir: 1, time: 0.3, done: false };
    update(); vehicle.position.z = -5; update();
    const ribbon = scene.getObjectByName('Continuous dash ribbon');
    assert.ok(vapor.geometry.attributes.alpha.array.some(a => a > 0));
    assert.ok(ribbon.geometry.attributes.alpha.array.some(a => a > 0));
    if (key !== 'reducedMotion') options[key] = value;
    vfx.update(race, 0.05, 0, 0, options, key === 'reducedMotion');
    assert.ok(vapor.geometry.attributes.alpha.array.every(a => a === 0), key + ' clears existing roll vapor');
    assert.ok(ribbon.geometry.attributes.alpha.array.every(a => a === 0), key + ' clears existing roll ribbon');
  }
});
