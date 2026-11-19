// Task 8c: the birds and the airship round the Sky Spiral (src/spiral-sky-life.ts). They are scenery the car must
// never meet: clear of every road the ribbon draws and of the kit's platforms, stations and peaks, on the lap, on the
// run-out and in Endless. A wing stays on its shoulder at any flap angle, and nothing moves while the clock is stopped.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BoxGeometry, Group, Matrix4, Mesh, MeshStandardMaterial, Scene, Vector3 } from 'three';
import { createSkyScene } from '../src/sky-scene.js';
import { createSpiralSkyLife, BIRD_SHOULDER, SKY_AIRSHIP, SKY_FLOCKS, SKY_LIFE_NODES } from '../src/spiral-sky-life.ts';
import { SPIRAL_NODE_RADIUS, SPIRAL_NODE_SPAN, spiralSceneryPlan } from '../src/spiral-scenery-plan.ts';
import { SKY_LENGTH, skyPoint } from '../src/sky-track.ts';

function fakeGlb({ without } = {}) {
  const root = new Group(), material = new MeshStandardMaterial({ name: 'spiral_kit' }), geometry = new BoxGeometry();
  for (const node of SKY_LIFE_NODES) if (node !== without) root.add(Object.assign(new Mesh(geometry, material), { name: node }));
  return root;
}
const LAP = spiralSceneryPlan();
function rig() {
  const scene = new Scene(), course = createSkyScene(scene), clock = { value: 0 }, source = fakeGlb(), kit = { plan: LAP };
  const life = createSpiralSkyLife(source, { road: course.parts.road, clock, plan: () => kit.plan });
  const [body, left, right, airship] = SKY_LIFE_NODES.map(node => course.parts.road.getObjectByName(node));
  return { course, clock, source, kit, life, body, left, right, airship, root: body.parent };
}
const matrix = new Matrix4();
const at = (mesh, index, x = 0, y = 0, z = 0) => { mesh.getMatrixAt(index, matrix); return new Vector3(x, y, z).applyMatrix4(matrix); };
/** Every road centre the ribbon can draw in this mode, 10 m apart. */
function roadPoints(endless, laps) {
  const points = [];
  for (let s = 0; s <= laps * SKY_LENGTH + 1660; s += 10) points.push(skyPoint(s, endless || s > SKY_LENGTH));
  return points;
}
/** The gap from `p` to the road within 3 km of travel either side of the car: every coil of the helix it is on. */
function nearest(points, p, distance) {
  let least = Infinity;
  for (let i = Math.max(0, distance / 10 - 300); i < Math.min(points.length, distance / 10 + 300); i++) least = Math.min(least, Math.hypot(points[i].x - p.x, points[i].y - p.y, points[i].z - p.z));
  return least;
}
/** True where `p` is inside the upright cylinder of a platform, station or peak, grown by `margin`. */
const inKit = (plan, p, margin) => plan.some(k => /^(platform|station|peak)/.test(k.node)
  && p.y > k.y + SPIRAL_NODE_SPAN[k.node][0] * k.scale - margin && p.y < k.y + SPIRAL_NODE_SPAN[k.node][1] * k.scale + margin
  && Math.hypot(k.x - p.x, k.z - p.z) < SPIRAL_NODE_RADIUS[k.node] * k.scale + margin);

test('the flyers join the road hidden, four pooled draws on the kit\'s material', () => {
  const { course, source, life, body, left, right, airship, root } = rig();
  assert.equal(root.parent, course.parts.road, 'they fly in track space');
  assert.equal(root.visible, false, 'in the scene for the warmup, not drawn yet');
  for (const mesh of [body, left, right, airship]) {
    assert.ok(mesh.isInstancedMesh && !mesh.frustumCulled);
    assert.equal(mesh.material, source.children[0].material, 'no material is added');
    assert.equal(mesh.count, 0);
  }
  assert.ok(body.instanceMatrix.count <= 16 && airship.instanceMatrix.count === 1);
  life.show(true); assert.equal(root.visible, true);
  life.show(false); assert.equal(root.visible, false);
  life.dispose();
  assert.equal(root.parent, null);
  for (const node of SKY_LIFE_NODES) {
    const scene = new Scene(), parts = createSkyScene(scene).parts, before = parts.road.children.length;
    assert.throws(() => createSpiralSkyLife(fakeGlb({ without: node }), { road: parts.road, clock: { value: 0 }, plan: () => LAP }), new RegExp(`node ${node} is missing`));
    assert.equal(parts.road.children.length, before, 'half a flock never joins the scene');
  }
});

test('birds and the airship keep clear of every drawn road and of the kit, on the lap, the run-out and in Endless', () => {
  for (const endless of [false, true]) {
    const { clock, kit, life, body, airship } = rig(), laps = endless ? 3 : 1, road = roadPoints(endless, laps);
    let flown = 0, steps = 0, shipped = 0, lap = -1;
    for (let distance = 0; distance <= laps * SKY_LENGTH; distance += 100, steps++) {
      clock.value = distance * .37; // any moment of the circle
      const now = endless ? Math.floor(distance / SKY_LENGTH) : 0;
      if (now !== lap) kit.plan = spiralSceneryPlan(lap = now, endless); // as the kit does at a lap change
      life.stream(distance, endless);
      const plan = kit.plan, where = `${distance} m${endless ? ' endless' : ''}`;
      assert.ok(body.count % SKY_FLOCKS.birds === 0 && body.count <= body.instanceMatrix.count, `${where}: whole flocks, inside the pool`);
      if (body.count) flown++;
      for (let i = 0; i < body.count; i++) {
        const p = at(body, i), gap = nearest(road, p, distance);
        assert.ok(gap >= 40, `${where}: bird ${i} is ${gap.toFixed(0)} m from the road`);
        assert.ok(gap <= SKY_FLOCKS.aside + SKY_FLOCKS.radius + 60 || distance + SKY_FLOCKS.ahead > laps * SKY_LENGTH, `${where}: bird ${i} is near enough to see`);
        assert.ok(!inKit(plan, p, 5), `${where}: bird ${i} is inside a kit piece`);
      }
      if (airship.count) {
        shipped++;
        const p = at(airship, 0), gap = nearest(road, p, distance);
        assert.ok(gap >= 250, `${where}: the airship is ${gap.toFixed(0)} m from the road`);
        assert.ok(!inKit(plan, p, 35), `${where}: the airship is inside a kit piece`);
      }
    }
    assert.ok(flown >= steps * .8, `${endless ? 'endless' : 'lap'}: birds on ${flown} of ${steps} stretches`);
    assert.ok(shipped >= steps * .3, `${endless ? 'endless' : 'lap'}: the airship on ${shipped} of ${steps} stretches`);
  }
});

test('a wing stays on its shoulder at any flap, and the wings beat together', () => {
  const { clock, life, body, left, right } = rig(), { x, y } = BIRD_SHOULDER;
  let lifted = 0, dropped = 0;
  for (const time of [0, .21, .4, 1.3, 7.7, 31]) {
    clock.value = time;
    life.stream(700, false);
    assert.ok(body.count >= SKY_FLOCKS.birds);
    assert.deepEqual([left.count, right.count], [body.count, body.count]);
    for (let i = 0; i < body.count; i++) {
      // Instance matrices are float32: this far from the origin they resolve about half a millimetre.
      assert.ok(at(left, i, -x, y).distanceTo(at(body, i, -x, y)) < 2e-3, 'left shoulder');
      assert.ok(at(right, i, x, y).distanceTo(at(body, i, x, y)) < 2e-3, 'right shoulder');
      // The tips, 1.2 m out, measured along the bird's own up axis: both rise or both fall.
      const up = at(body, i, 0, 1).sub(at(body, i)).normalize(), origin = at(body, i, 0, y);
      const l = at(left, i, -1.2, y).sub(origin).dot(up), r = at(right, i, 1.2, y).sub(origin).dot(up);
      assert.ok(Math.abs(l - r) < 4e-3, `the wings mirror each other (${l} / ${r})`);
      if (l > .1) lifted++; else if (l < -.1) dropped++;
    }
  }
  assert.ok(lifted > 5 && dropped > 5, 'the wings beat up and down');
});

test('a bird heads the way it flies, banked into its turn; a stopped clock holds everything still', () => {
  const { clock, life, body, left, airship } = rig(), dt = .5, track = t => { clock.value = t; life.stream(5200, false); };
  track(12); const before = Array.from({ length: body.count }, (_, i) => at(body, i));
  track(12 + 2 * dt); const after = before.map((_, i) => at(body, i));
  track(12 + dt);
  assert.ok(body.count >= SKY_FLOCKS.birds && airship.count === 1);
  for (let i = 0; i < body.count; i++) {
    const here = at(body, i), velocity = after[i].clone().sub(before[i]), turn = after[i].clone().add(before[i]).addScaledVector(here, -2);
    velocity.y = turn.y = 0; // the bob is not the heading
    const nose = at(body, i, 0, 0, -1).sub(here), wing = at(body, i, 1, 0, 0).sub(here);
    assert.ok(nose.normalize().dot(velocity.normalize()) > .99, `bird ${i} flies nose first`);
    assert.ok(Math.sign(wing.y) === -Math.sign(wing.dot(turn)) && Math.abs(wing.y) > .2, `bird ${i}: the wing inside the turn is the low one`);
  }
  const ship = at(airship, 0), bow = at(airship, 0, 0, 0, -1).sub(ship);
  track(12 + dt + 5);
  assert.ok(bow.normalize().dot(at(airship, 0).sub(ship).normalize()) > .99, 'the airship flies bow first');
  // Reduced Motion: world.js stops the clock, and a parked car re-streams the same frame.
  const still = [...body.instanceMatrix.array, ...left.instanceMatrix.array, ...airship.instanceMatrix.array];
  for (let frame = 0; frame < 5; frame++) life.stream(5200, false);
  assert.deepEqual([...body.instanceMatrix.array, ...left.instanceMatrix.array, ...airship.instanceMatrix.array], still);
});

test('the airship waits beside the middle of the lap and the run-out, not over the start', () => {
  const { life, airship } = rig();
  life.stream(0, false);
  assert.equal(airship.count, 0, 'out of sight from the grid');
  life.stream(SKY_AIRSHIP.first, false);
  assert.equal(airship.count, 1);
  life.stream(SKY_LENGTH, false);
  assert.equal(airship.count, 1, 'one hangs beyond the finish, over the run-out');
});

test('the wings pivot on the asset contract\'s shoulders, and both flyers face the way the contract says', () => {
  const { bird, airship } = JSON.parse(readFileSync(new URL('../assets-src/spiral-landmarks/contract.json', import.meta.url), 'utf8'));
  assert.deepEqual(bird.shoulders, { bird_wing_l: [-BIRD_SHOULDER.x, BIRD_SHOULDER.y, 0], bird_wing_r: [BIRD_SHOULDER.x, BIRD_SHOULDER.y, 0] });
  assert.deepEqual([bird.forward, bird.flap_axis, airship.forward], ['-Z', 'Z', '-Z']);
});
