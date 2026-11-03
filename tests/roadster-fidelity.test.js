import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CAR_STYLES, makeCar, poseWing, stepWing } from '../src/car-model.js';
import { REAR_PORTS } from '../src/aero-vfx.js';
import { addRoadsterTrim } from '../src/roadster-fidelity.js';

const rawTrim = () => {
  const group = new THREE.Group();
  addRoadsterTrim(group, {
    paint: new THREE.MeshPhysicalMaterial({ color: '#e6e9e7' }),
    black: new THREE.MeshStandardMaterial({ color: '#101923' }),
    white: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
    light: new THREE.MeshBasicMaterial({ color: '#ff1616' }),
  });
  return group;
};

const roadster = () => makeCar(CAR_STYLES.roadster);
const named = (root, name) => {
  const matches = [];
  root.traverse(node => {
    if (node.name === name) matches.push(node);
    for (const label of node.userData.mergedPartNames ?? []) if (label === name) matches.push(node);
  });
  return matches;
};

test('Roadster 2 body has a sculpted multi-section shell and physical pearl finish', () => {
  const car = roadster();
  const body = car.userData.body;
  assert.ok(body.geometry.attributes.position.count >= 200, 'flat four-corner stations cannot reproduce the wedge or shoulders');
  assert.ok(body.material instanceof THREE.MeshPhysicalMaterial);
  assert.ok(body.material.clearcoat >= 0.7);
  assert.ok(body.material.roughness <= 0.28);
  assert.equal(body.material.color.getHexString(), 'e6e9e7');
  const positions = body.geometry.attributes.position;
  for (let i = 0; i < positions.count; i++)
    assert.ok([positions.getX(i), positions.getY(i), positions.getZ(i)].every(Number.isFinite), 'no NaN body vertices');
  const bounds = new THREE.Box3().setFromObject(car);
  assert.ok(bounds.max.x <= 1.3 && bounds.min.x >= -1.3, 'retain existing collision envelope');
  assert.ok(bounds.max.z < 2.8 && bounds.min.z > -2.8);
  assert.ok(bounds.min.y >= 0, 'no body or wheel sinking below the road');
});

test('Roadster has tapered gold-glazed canopy, restrained hood creases and faceted side rockers', () => {
  const car = roadster();
  const canopy = car.children.find(node => node.isMesh && node.geometry === CAR_STYLES.roadster.cabin);
  assert.ok(canopy);
  assert.ok(canopy.material instanceof THREE.MeshPhysicalMaterial, 'not metallic opaque window paint');
  assert.ok(canopy.material.roughness < 0.2);
  assert.ok(canopy.geometry.attributes.position.count >= 16, 'continuous fastback glazing');
  assert.equal(named(car, 'Roadster hood crease').length, 2);
  assert.equal(named(car, 'Roadster sculpted rocker').length, 2);
  assert.equal(named(car, 'Roadster front light blade').length, 1, 'photo 05: one hairline light blade across the nose');
  assert.equal(named(car, 'Roadster front slit lamp').length, 0, 'the blade replaces the two corner slits');
  assert.equal(named(car, 'Roadster triangular headlamp').length, 2, 'both tucked-away triangular corner lights');
});

test('Roadster rear fascia has a moving wide aerofoil, quad recessed thrusters and real diffuser vanes', () => {
  const car = roadster();
  const wing = car.userData.wing;
  assert.equal(named(car, 'Roadster aerofoil').length, 1);
  assert.equal(wing.userData.lift, 0.16, 'short struts: the raised wing sits low over the deck (rear reference photo)');
  assert.ok(wing.position.z >= 2.08, 'wing rests as a deck lip near the photographed tail edge');
  assert.ok(wing.parent === car);
  const ports = named(car, 'Roadster recessed thruster');
  assert.equal(ports.length, REAR_PORTS.length);
  ports.forEach((port, index) => assert.ok(Math.abs(port.position.x - REAR_PORTS[index].position[0]) < 0.001));
  assert.ok(named(car, 'Roadster diffuser vane').length >= 5);
  assert.ok(car.userData.rearLight?.group?.parent === car, 'shared animated brake light remains connected');
});

test('Roadster geometric five-spoke aero rims share meshes and retain 4 animatable wheels', () => {
  const car = roadster();
  const wheels = car.userData.wheels;
  assert.equal(wheels.length, 4);
  assert.ok(wheels.every(w => named(w, 'Roadster aero spoke assembly').length === 1));
  assert.ok(wheels.every(w => named(w, 'Roadster aero inset').length === 1));
  assert.ok(wheels.every(w => w.parent === car));
  assert.equal(car.userData.jets.parent, car, 'flight jets unchanged');
});

test('Other vehicle styles preserve their original model material and geometry contracts', () => {
  for (const name of ['nova', 'orbit', 'apex', 'commuter']) {
    const car = makeCar(CAR_STYLES[name]);
    assert.ok(car.userData.body.material instanceof THREE.MeshStandardMaterial, name);
    assert.equal(car.userData.wheels.length, 4, name);
    assert.equal(named(car, 'Roadster recessed thruster').length, 0, name);
  }
});

const box = mesh => { mesh.updateWorldMatrix(true, true); return new THREE.Box3().setFromObject(mesh); };

test('Roadster nose below the carbon band is dark up to the corner intakes, never white paint', () => {
  // Photo 05: between the white fender pillars, everything under the band is dark.
  const car = roadster();
  car.updateMatrixWorld(true);
  const paint = car.userData.body.material;
  const ray = new THREE.Raycaster();
  for (const x of [-.68, -.62, -.4, 0, .4, .62, .68]) for (const y of [.38, .42]) {
    ray.set(new THREE.Vector3(x, y, -4), new THREE.Vector3(0, 0, 1));
    const hit = ray.intersectObject(car, true)[0];
    assert.ok(hit, `nose face at x=${x} y=${y}`);
    assert.notEqual(hit.object.material, paint, `white paint shows under the band at x=${x} y=${y}`);
  }
});

test('Roadster reference front stacks hood lip, hairline blade, carbon band, low intake and splitter', () => {
  const car = roadster();
  const detail = rawTrim();
  const [lip] = named(detail, 'Roadster sculpted front fascia');
  assert.equal(lip.material.color.getHexString(), 'e6e9e7', 'hood leading edge stays body-painted');
  const [blade] = named(detail, 'Roadster front light blade');
  const [band] = named(detail, 'Roadster front carbon band');
  const [intake] = named(detail, 'Roadster black lower intake');
  const [splitter] = named(detail, 'Roadster carbon splitter');
  assert.ok(blade && band && intake && splitter, 'photo 05 front layers all exist');
  assert.ok(blade.material.isMeshBasicMaterial, 'the blade is a lit strip, not painted trim');
  const [b, c, i, s] = [blade, band, intake, splitter].map(box);
  assert.ok(b.max.y - b.min.y <= .02, 'blade is a hairline');
  assert.ok(b.max.x - b.min.x >= 1.15 && b.max.x - b.min.x <= 1.4,
    'photo 05: the blade spans ~70% of the nose, white fender faces flank it');
  assert.ok(i.max.x - i.min.x >= 1.1 && i.max.x - i.min.x <= 1.4 && i.max.y - i.min.y <= .2, 'intake is as wide as the blade and low');
  assert.ok(box(lip).min.y >= b.max.y - .005 && b.min.y >= c.max.y - .005 && c.min.y >= i.max.y - .005,
    'top to bottom: painted lip, blade, carbon band, intake');
  assert.ok(s.max.y <= i.min.y && s.min.z < i.min.z - .08, 'splitter sits lowest and protrudes ahead');
  const noseZ = new THREE.Box3().setFromBufferAttribute(car.userData.body.geometry.getAttribute('position')).min.z;
  for (const layer of [lip, blade, band, intake]) assert.ok(box(layer).max.z < noseZ, `${layer.name} stays in front of the nose cap`);
  const lamps = named(detail, 'Roadster triangular headlamp').map(box);
  assert.ok(lamps.every(l => l.max.x - l.min.x >= .15 && l.min.y > b.max.y), 'readable triangles above the blade');
  assert.ok(lamps.every(l => l.min.x < (l.min.x > 0 ? b.max.x : b.min.x) && (l.min.x > 0 ? b.max.x : b.min.x) < l.max.x),
    'each lamp sits right above a blade end, at the fender tower foot');
  const body = car.userData.body.geometry.attributes.position;
  const frontRings = [];
  for (let n = 0; n < body.count; n++)
    if (body.getZ(n) < -2.42) frontRings.push(Math.abs(body.getX(n)));
  assert.ok(frontRings.length > 0);
  assert.ok(Math.max(...frontRings) < 1.0, 'the nose narrows noticeably ahead of the wheel arches');
});

// Highest hood vertex (|x| below the fender crest) and highest crest of one body station.
const hoodAndFender = (z, hoodHalfWidth) => {
  const body = roadster().userData.body.geometry.attributes.position;
  const ring = [];
  for (let n = 0; n < body.count; n++) if (Math.abs(body.getZ(n) - z) < .01) ring.push([body.getX(n), body.getY(n)]);
  const hoodPoints = ring.filter(([x]) => Math.abs(x) < hoodHalfWidth).map(([, y]) => y);
  assert.ok(hoodPoints.length > 0, `station ${z} has hood vertices to compare against`);
  return { hood: Math.max(...hoodPoints), fender: Math.max(...ring.map(([, y]) => y)) };
};

test('front reference: the nose centre is a full-height painted face, not a notch sunk between the towers', () => {
  const blade = box(named(rawTrim(), 'Roadster front light blade')[0]).max.y;
  const nose = hoodAndFender(-2.50, .55);
  assert.ok((nose.hood - blade) / (nose.fender - blade) >= .6,
    `hood edge ${nose.hood} stands most of the way from the blade ${blade} to the crest ${nose.fender}`);
  assert.ok(nose.fender - nose.hood >= .04 && nose.fender - nose.hood <= .12, 'towers still rise just above the hood');
  const ahead = hoodAndFender(-2.33, .6);
  assert.ok(ahead.fender - ahead.hood <= .20, `hood stays near the crests behind the nose, got ${ahead.fender - ahead.hood}`);
  const [face] = named(rawTrim(), 'Roadster sculpted front fascia');
  assert.ok(box(face).max.y >= nose.hood - .01 && box(face).min.y <= blade + .005, 'painted face fills blade to hood edge');
  assert.ok(box(face).max.x - box(face).min.x >= 1.1, 'the face spans the gap between the towers');
});

test('front reference: a high hood sweeps up from the nose into the windscreen base with no dip or step', () => {
  const blade = box(named(rawTrim(), 'Roadster front light blade')[0]).max.y;
  // Front photo: the hood edge stands ~85% of the way from the blade to the tower crests.
  const nose = hoodAndFender(-2.50, .55);
  assert.ok((nose.hood - blade) / (nose.fender - blade) >= .8,
    `hood edge ${nose.hood} sits nearly level with the tower crest ${nose.fender}, not sunk below it`);
  const stations = [[-2.50, .55], [-2.33, .6], [-1.91, .66], [-1.41, .7]];
  const decks = stations.map(([z, half]) => hoodAndFender(z, half).hood);
  const slopes = decks.slice(1).map((y, i) => (y - decks[i]) / (stations[i + 1][0] - stations[i][0]));
  const mean = (decks.at(-1) - decks[0]) / (stations.at(-1)[0] - stations[0][0]);
  assert.ok(decks.at(-1) - decks[0] >= .04, `side photo: the hood visibly rises toward the cowl, decks ${decks}`);
  for (const s of slopes) assert.ok(s >= 0 && s <= 1.5 * mean, `one smooth sweep, no dip or step, slopes ${slopes}`);
  const car = roadster();
  car.updateMatrixWorld(true);
  const [cowl] = new THREE.Raycaster(new THREE.Vector3(0, 3, -1.32), new THREE.Vector3(0, -1, 0)).intersectObject(car.userData.body);
  const canopy = CAR_STYLES.roadster.cabin.getAttribute('position');
  let base = -Infinity;
  for (let n = 0; n < canopy.count; n++) if (Math.abs(canopy.getZ(n) + 1.32) < .001) base = Math.max(base, canopy.getY(n));
  assert.ok(base - cowl.point.y >= 0 && base - cowl.point.y <= .025,
    `windscreen base ${base} sits just on the hood ${cowl.point.y}, neither buried nor stepped`);
});

test('front reference: triangular headlamps sit inside the fender face behind a hairline bezel', () => {
  const car = roadster();
  car.updateMatrixWorld(true);
  const detail = rawTrim();
  const pockets = named(detail, 'Roadster headlamp pocket').map(box);
  const lenses = named(detail, 'Roadster triangular headlamp');
  assert.equal(lenses.length, 2);
  lenses.forEach((lens, i) => {
    const l = box(lens), p = pockets[i];
    for (const gap of [l.min.x - p.min.x, p.max.x - l.max.x, l.min.y - p.min.y, p.max.y - l.max.y])
      assert.ok(gap <= .012, `bezel is a hairline, not a dark frame, got ${gap.toFixed(3)}`);
    assert.ok(-2.50 - l.min.z <= .012, 'lens sits nearly flush with the nose');
    const points = lens.geometry.getAttribute('position');
    const vertices = Array.from({ length: points.count }, (_, n) => [points.getX(n), points.getY(n)]);
    const [apexX] = vertices.reduce((low, v) => v[1] < low[1] ? v : low);
    const mid = (Math.abs(l.min.x) + Math.abs(l.max.x)) / 2;
    assert.ok(Math.abs(apexX) > mid, 'inverted triangle points down toward the outer edge');
    for (const [x, y] of vertices) {
      const [top] = new THREE.Raycaster(new THREE.Vector3(x, 3, -2.497), new THREE.Vector3(0, -1, 0)).intersectObject(car.userData.body);
      assert.ok(top && y < top.point.y - .01, `lamp vertex ${x},${y} stays below the tower top ${top?.point.y}`);
    }
  });
});

test('Roadster rear reference layers an inset black lamp recess above a curved painted panel', () => {
  const car = roadster();
  const detail = rawTrim();
  assert.equal(named(detail, 'Roadster black rear light recess').length, 1);
  const fascia = named(detail, 'Roadster curved rear fascia');
  assert.equal(fascia.length, 1);
  assert.equal(fascia[0].material.color.getHexString(), 'e6e9e7', 'lower rear panel must be pearl paint');
  assert.equal(named(detail, 'Roadster curved rear valance').length, 1);
  const quarters = named(detail, 'Roadster rear quarter carbon cut');
  assert.equal(quarters.length, 2, 'rear-quarter reference shows black cutaway on both flanks');
  for (const panel of quarters) {
    const bounds = new THREE.Box3().setFromObject(panel);
    assert.ok(bounds.min.z >= 1.78, 'carbon taper starts behind the rear wheel arch');
    assert.ok(bounds.max.x <= 1.3 && bounds.min.x >= -1.3);
  }
  const led = car.userData.rearLight.group;
  const black = led.getObjectByName('Rear LED black panel');
  const core = led.getObjectByName('Rear LED core');
  assert.ok(black && core);
  assert.ok(black.geometry.parameters.height >= 0.17, 'black light slot is taller than the thin LED');
  assert.ok(core.geometry.parameters.height <= 0.020, 'rear illumination stays a hairline');
  assert.ok(led.position.z >= 2.40, 'LED sits in front of the recessed black rear panel');
});

test('four recessed NITRO ports and diffuser form the lower rear without changing flight anchors', () => {
  const car = roadster();
  const nozzles = named(car, 'Roadster recessed thruster');
  assert.equal(nozzles.length, REAR_PORTS.length);
  nozzles.forEach((port, i) => {
    assert.deepEqual(port.position.toArray().slice(0, 2), REAR_PORTS[i].position.slice(0, 2));
    assert.equal(port.name, 'Roadster recessed thruster');
  });
  assert.equal(named(rawTrim(), 'Roadster deep rear diffuser').length, 1);
  assert.ok(named(car, 'Roadster diffuser vane').length >= 5);
  assert.equal(named(car, 'Roadster aerofoil').length, 1);
  assert.equal(car.userData.wing.userData.lift, 0.16);
});

test('rear diffuser valance has real cutouts so all four recessed nozzle barrels remain visible', () => {
  const detail = rawTrim();
  const valance = named(detail, 'Roadster curved rear valance')[0];
  assert.ok(valance, 'rear lower valance exists');
  detail.updateMatrixWorld(true);
  for (const port of REAR_PORTS) {
    const [x, y] = port.position;
    const ray = new THREE.Raycaster(new THREE.Vector3(x, y, 3), new THREE.Vector3(0, 0, -1));
    assert.equal(ray.intersectObject(valance, false).length, 0,
      `valance must be cut away at x=${x} for the physical thruster recess`);
  }
  const intact = new THREE.Raycaster(new THREE.Vector3(0, .64, 3), new THREE.Vector3(0, 0, -1));
  assert.ok(intact.intersectObject(valance, false).length > 0, 'structural valance remains between ports');
  const tunnel = new THREE.Raycaster(new THREE.Vector3(.21, .45, 3), new THREE.Vector3(0, 0, -1));
  assert.equal(tunnel.intersectObject(valance, false).length, 0, 'photo 06/13: diffuser tunnels open below the port bar');
  const car = roadster();
  car.updateMatrixWorld(true);
  const [behind] = tunnel.intersectObject(car, true);
  assert.ok(behind && behind.object.material !== car.userData.body.material && behind.object.material.color.r < .1,
    'a dark tunnel back closes the opening instead of showing the white body cap');
});

test('looking straight into each rear port shows a dark bore, never the white body behind it', () => {
  const car = roadster();
  car.updateMatrixWorld(true);
  for (const port of REAR_PORTS) {
    const [x, y] = port.position;
    const [first] = new THREE.Raycaster(new THREE.Vector3(x, y, 4), new THREE.Vector3(0, 0, -1)).intersectObject(car, true);
    assert.ok(first, `port ${x} hits something`);
    assert.notEqual(first.object.material, car.userData.body.material, `port ${x} bore must not end on paint`);
    assert.ok(first.object.material.color.r < .2, `port ${x} bore reads dark, got ${first.object.name}`);
  }
});

test('rear reads top to bottom as wing lip, light slot, white shelf, white scoop with plate, then black port bar', () => {
  const detail = rawTrim();
  const [shelf] = named(detail, 'Roadster rear shelf');
  const [scoop] = named(detail, 'Roadster curved rear fascia');
  const [plate] = named(detail, 'Roadster blank rear plate');
  const [bank] = named(detail, 'Roadster machined four-port surround');
  assert.ok(shelf && scoop && plate && bank);
  const [sh, sc, pl, bk] = [shelf, scoop, plate, bank].map(box);
  const slot = box(detail.userData.rearLight.group.getObjectByName('Rear LED black panel'));
  assert.ok(slot.min.y >= sh.max.y - .005 && sh.min.y >= sc.max.y - .005, 'shelf sits directly under the slot, scoop under the shelf');
  assert.ok(pl.max.y <= sh.min.y + .005 && pl.min.y >= bk.max.y - .01, 'plate hangs in the scoop above the port bar');
  assert.ok(sh.max.z > sc.max.z, 'the shelf protrudes past the recessed scoop');
  assert.ok(Math.max(...REAR_PORTS.map(p => p.position[1])) < sc.min.y, 'ports sit below the white scoop, in black');
  assert.equal(named(detail, 'Roadster tail blade').length, 2, 'white fins close both slot ends');
  const markers = named(detail, 'Roadster rear corner marker');
  assert.equal(markers.length, 2, 'red markers on top of both carbon corner pods');
  assert.ok(markers.every(m => m.material.color.r > m.material.color.g * 4));
});

// Leading and trailing edge of the aerofoil's top surface, in car space.
const wingEdges = (car, aerofoil) => {
  car.updateMatrixWorld(true);
  const local = new THREE.Box3().setFromBufferAttribute(aerofoil.geometry.getAttribute('position'));
  const [lead, trail] = [local.min.z, local.max.z].map(z => aerofoil.localToWorld(new THREE.Vector3(0, local.max.y, z)));
  return { lead, trail, degrees: THREE.MathUtils.radToDeg(Math.atan2(trail.y - lead.y, trail.z - lead.z)) };
};

const wingParts = car => {
  const { wing } = car.userData;
  return { wing, aerofoil: named(wing, 'Roadster aerofoil')[0], tips: named(wing, 'Roadster wing tip') };
};

test('opening keeps the leading edge on the deck and tilts only the rear up to about 35 degrees (photo 04)', () => {
  const car = roadster();
  const { wing, aerofoil, tips } = wingParts(car);
  assert.equal(tips.length, 2);
  assert.equal(named(wing, 'Roadster wing swan-neck struts').length, 1);
  assert.equal(named(car, 'Roadster wing bay').length, 1, 'black bay is revealed under the raised wing');
  poseWing(wing, 0, 0);
  const stowed = wingEdges(car, aerofoil);
  const floor = box(aerofoil).min.y;
  assert.ok(Math.abs(stowed.degrees) < 2, `stowed wing is the flat deck lid, got ${stowed.degrees}`);
  assert.ok(tips.every(tip => tip.rotation.z === 0), 'stowed tips stay flat as the deck lid');
  poseWing(wing, .5, 0);
  const half = wingEdges(car, aerofoil);
  assert.ok(half.degrees > 10 && half.degrees < 40, `half-way the blade is already tilting, got ${half.degrees}`);
  poseWing(wing, .25, 0);
  assert.ok(tips.every(tip => Math.abs(tip.rotation.z) < .05), 'tips wait until the blade clears the fenders');
  poseWing(wing, 1, 0);
  const open = wingEdges(car, aerofoil);
  assert.ok(open.degrees >= 32 && open.degrees <= 38, `opened airbrake angle ${open.degrees} must be about 35 degrees`);
  assert.ok(Math.abs(open.lead.y - stowed.lead.y) < .03 && Math.abs(open.lead.z - stowed.lead.z) < .05,
    'the leading edge stays almost on the deck');
  assert.ok(open.trail.y - stowed.trail.y > .2 && open.trail.z > open.lead.z, 'only the rear of the blade swings up and back');
  assert.ok(box(aerofoil).min.y >= floor - .005, 'the blade never dips into the deck');
  assert.ok(tips.every(tip => Math.abs(tip.rotation.z) > .9), 'opened tips fold into endplates');
  assert.equal(Math.sign(tips[0].rotation.z), -Math.sign(tips[1].rotation.z), 'tips fold symmetrically');
  // Unmerged trim: in the car the bay shares one batched mesh with the glass surround.
  const bay = box(named(rawTrim(), 'Roadster wing bay')[0]);
  const rams = box(named(wing, 'Roadster wing actuators')[0]);
  assert.ok(rams.min.y < bay.max.y + .03, 'actuator rams rise out of the bay');
  assert.ok(rams.max.y > open.lead.y + .08, 'actuator rams push the tilted blade up, not hang under the hinge');
  poseWing(wing, 0, 0);
  const struts = box(named(wing, 'Roadster wing swan-neck struts')[0]);
  assert.ok(struts.max.y < box(aerofoil).min.y + .05 && struts.min.y < .8, 'stowed struts hide in the body');
});

test('raised on short struts, the wing lifts only a little at a shallow angle (rear reference photo)', () => {
  const car = roadster();
  const { wing, aerofoil, tips } = wingParts(car);
  poseWing(wing, 0, 0);
  const stowed = wingEdges(car, aerofoil);
  poseWing(wing, 0, 1);
  const raised = wingEdges(car, aerofoil);
  const rise = raised.lead.y - stowed.lead.y;
  assert.ok(rise >= .08 && rise <= .2, `struts lift the wing ${rise}, well below the old .34`);
  assert.ok(raised.degrees >= 5 && raised.degrees <= 20, `raised blade keeps a shallow angle, got ${raised.degrees}`);
  assert.ok(tips.every(tip => Math.abs(tip.rotation.z) > .9), 'raised tips fold into endplates');
  const bay = box(named(rawTrim(), 'Roadster wing bay')[0]);
  assert.ok(box(named(wing, 'Roadster wing swan-neck struts')[0]).min.y < bay.min.y, 'raised struts still reach into the bay');
  poseWing(wing, 1, 1);
  const both = wingEdges(car, aerofoil);
  assert.ok(both.degrees >= 32 && both.degrees <= 38 && both.lead.y - stowed.lead.y >= .08, 'boost in flight: raised and opened');
});

// world.js's per-frame wing update at 60 fps; each entry is the blade angle in degrees.
const run = (car, aerofoil, seconds, open, raise = false) => Array.from({ length: Math.round(seconds * 60) }, () => {
  stepWing(car.userData.wing, open, raise, 1 / 60);
  return wingEdges(car, aerofoil).degrees;
});
const steps = angles => angles.slice(1).map((a, i) => Math.abs(a - angles[i]));

test('boost and NITRO open the wing smoothly, hold it between chained boosts and close it smoothly', () => {
  const car = roadster();
  const { aerofoil } = wingParts(car);
  const opening = [wingEdges(car, aerofoil).degrees, ...run(car, aerofoil, .8, true)];
  assert.ok(opening.at(-1) >= 32, `boost opens the wing within .8 s, got ${opening.at(-1)}`);
  assert.ok(Math.max(...steps(opening)) <= 3, 'no frame jumps more than 3 degrees');
  assert.ok(steps(opening)[0] < Math.max(...steps(opening)) / 4, 'eases in instead of snapping open');
  opening.forEach((a, n) => assert.ok(n === 0 || a >= opening[n - 1] - 1e-9, 'opening never stutters back'));
  // Chained boosts (NITRO chain, mini boosts): short gaps between bursts must not flap the wing shut.
  for (let burst = 0; burst < 4; burst++) {
    const gap = run(car, aerofoil, .3, false);
    assert.ok(Math.min(...gap) >= 32, `wing stays open between chained boosts, dipped to ${Math.min(...gap)}`);
    run(car, aerofoil, .4, true);
  }
  const closing = [wingEdges(car, aerofoil).degrees, ...run(car, aerofoil, 1.6, false)];
  assert.ok(closing.at(-1) < .5, `the wing stows again after the boost, got ${closing.at(-1)}`);
  assert.ok(Math.max(...steps(closing)) <= 3, 'closing is smooth');
  closing.forEach((a, n) => assert.ok(n === 0 || a <= closing[n - 1] + 1e-9, 'closing never stutters open'));
  // A new boost while the wing is closing reverses from the current pose instead of snapping.
  run(car, aerofoil, 1, true);
  const mid = run(car, aerofoil, .95, false).at(-1);
  assert.ok(mid > 5 && mid < 32, `caught mid-close at ${mid}`);
  const reopen = [mid, ...run(car, aerofoil, .8, true)];
  assert.ok(Math.max(...steps(reopen)) <= 3 && reopen.at(-1) >= 32, 'reopens smoothly from where it was');
});

test('flight raises the wing on its short struts and lowers it smoothly on landing', () => {
  const car = roadster();
  const { wing, aerofoil } = wingParts(car);
  const rest = wing.position.y;
  const heights = [];
  for (let n = 0; n < 60; n++) { stepWing(wing, false, true, 1 / 60); heights.push(wing.position.y); }
  assert.ok(wing.position.y - rest >= .14, `flight raises the wing, got ${wing.position.y - rest}`);
  assert.ok(wingEdges(car, aerofoil).degrees < 20, 'flight alone does not open the airbrake');
  for (let n = 0; n < 60; n++) { stepWing(wing, false, false, 1 / 60); heights.push(wing.position.y); }
  assert.ok(Math.abs(wing.position.y - rest) < 1e-9, 'landing lowers it back onto the deck');
  assert.ok(Math.max(...steps([rest, ...heights])) <= .012, 'no frame jumps the carriage');
});

test('painted trim shares the car body paint so Garage colours reach every painted part', () => {
  const car = makeCar(CAR_STYLES.roadster, '#ff0000');
  const paint = car.userData.body.material;
  const painted = car.children.filter(c => c.isMesh && (c.userData.mergedPartNames ?? []).includes('Roadster curved rear fascia'));
  assert.equal(painted.length, 1);
  assert.equal(painted[0].material, paint, 'rear fascia, shelf, plate and lip follow previewAppearance');
  assert.ok(named(car.userData.wing, 'Roadster wing tip').every(t => t.material === paint));
});

test('four photo-reference rear thrusters are machined rings with dark recessed bores, not flat discs', () => {
  const detail = rawTrim();
  const ports = named(detail, 'Roadster recessed thruster');
  assert.equal(ports.length, 4);
  ports.forEach((port, i) => {
    assert.equal(port.position.x, REAR_PORTS[i].position[0]);
    assert.equal(port.position.y, REAR_PORTS[i].position[1]);
    const collar = port.getObjectByName('Roadster nozzle bevel collar');
    const lip = port.getObjectByName('Roadster nozzle satin lip');
    const throat = port.getObjectByName('Roadster nozzle recessed throat');
    const back = port.getObjectByName('Roadster nozzle shadow back');
    assert.ok(collar && lip && throat && back, `port ${i} must have physical layers`);
    assert.ok(new THREE.Box3().setFromBufferAttribute(lip.geometry.getAttribute('position')).max.x <= .08,
      'photo ports use restrained small rings rather than oversized exhaust openings');
    assert.ok(lip.material.metalness > .65, 'lip should read as muted machined metal');
    assert.ok(lip.position.z > throat.position.z && throat.position.z > back.position.z,
      'front metal lip, deep dark bore, rear shadow form actual depth');
    assert.ok(back.material.color.r < .12 && back.material.color.g < .12,
      'the bore has a dark base rather than a flat silver disc');
  });
  assert.equal(new Set(ports.map(p => p.children.find(c => c.name === 'Roadster nozzle satin lip').geometry)).size, 1,
    'four rims share cached GPU geometry');
});

test('a continuous dark four-port surround stays open at each jet, with curved top and lower lips', () => {
  const detail = rawTrim();
  const frame = named(detail, 'Roadster machined four-port surround');
  assert.equal(frame.length, 1);
  assert.equal(named(detail, 'Roadster port bank upper lip').length, 1);
  assert.equal(named(detail, 'Roadster port bank lower lip').length, 1);
  frame[0].updateMatrixWorld(true);
  for (const port of REAR_PORTS) {
    const [x, y] = port.position;
    const hits = new THREE.Raycaster(new THREE.Vector3(x,y,3),new THREE.Vector3(0,0,-1))
      .intersectObject(frame[0], false);
    assert.equal(hits.length, 0, `port ${x} must not be painted over by a flat panel`);
  }
  const between = new THREE.Raycaster(new THREE.Vector3(0,.64,3),new THREE.Vector3(0,0,-1));
  assert.ok(between.intersectObject(frame[0],false).length > 0,
    'continuous black frame must exist between the two central holes');
});

test('rear diffuser guides are sculpted swept fins, not five rectangular bricks', () => {
  const detail = rawTrim();
  const fins = named(detail, 'Roadster diffuser vane');
  assert.equal(fins.length, 5, 'preserve five evenly spaced aerodynamic channels');
  const sharedGeometry = fins[0].geometry;
  assert.ok(fins.every(fin => fin.geometry === sharedGeometry), 'share immutable vane geometry');
  assert.notEqual(sharedGeometry.type, 'BoxGeometry', 'rear reference fins have a tapered swept profile');
  const box = new THREE.Box3().setFromBufferAttribute(sharedGeometry.getAttribute('position'));
  assert.ok(box.max.z - box.min.z >= .42, 'fins reach toward the diffuser trailing edge');
  assert.ok(box.max.y - box.min.y >= .24, 'fins have visible lower channel depth');
});

test('a low fastback canopy starts at the hood cowl, so the nose shows no gap under the windscreen', () => {
  const glass = new THREE.Box3().setFromBufferAttribute(CAR_STYLES.roadster.cabin.getAttribute('position'));
  assert.ok(glass.max.y <= 1.36, `photo 14: roof stays low and sleek, got ${glass.max.y}`);
  const canopy = CAR_STYLES.roadster.cabin.getAttribute('position');
  const front = [];
  for (let n = 0; n < canopy.count; n++) if (canopy.getZ(n) <= glass.min.z + .001) front.push(canopy.getY(n));
  assert.ok(Math.max(...front) <= .85, `windscreen base meets the hood at the cowl, got ${Math.max(...front)}`);
  const car = roadster();
  car.updateMatrixWorld(true);
  const [hit] = new THREE.Raycaster(new THREE.Vector3(0, .9, -4), new THREE.Vector3(0, 0, 1)).intersectObject(car, true);
  assert.ok(hit && hit.object.material.roughness < .2 && hit.point.z < -.9, `looking at the cowl from ahead hits the windscreen, got ${hit?.object.name}`);
});

test('photo 02/03/15 wheels: pale aero disc behind five dark pointed star blades', () => {
  const [wheel] = roadster().userData.wheels;
  const [inset] = named(wheel, 'Roadster aero inset');
  const [spokes] = named(wheel, 'Roadster aero spoke assembly');
  const luminance = ({ r, g, b }) => .2126 * r + .7152 * g + .0722 * b;
  assert.ok(luminance(inset.material.color) > .55, 'the disc face reads white/silver');
  assert.ok(luminance(spokes.material.color) < .15, 'the blades read dark graphite');
  const points = spokes.geometry.getAttribute('position');
  let tips = 0;
  for (let n = 0; n < points.count; n++) if (Math.hypot(points.getY(n), points.getZ(n)) > .3) tips++;
  assert.equal(tips, 5, 'each blade ends in one sharp tip at the rim');
});

test('star spokes, pale disc and hub all spin with car speed via the wheel spin node', () => {
  const car = roadster();
  for (const wheel of car.userData.wheels) {
    const [spokes] = named(wheel, 'Roadster aero spoke assembly');
    const [inset] = named(wheel, 'Roadster aero inset');
    const tip = () => { spokes.updateWorldMatrix(true, false); return new THREE.Vector3(0, .318, .06).applyMatrix4(spokes.matrixWorld); };
    const before = tip();
    const insetBefore = inset.getWorldQuaternion(new THREE.Quaternion());
    wheel.children[2].rotation.x -= 30 * (1 / 60) / 0.44; // world.js spin step, 30 m/s for one frame
    assert.ok(tip().distanceTo(before) > .05, 'the star blades rotate, not just the disc behind them');
    assert.ok(inset.getWorldQuaternion(new THREE.Quaternion()).angleTo(insetBefore) > .5, 'the disc keeps spinning');
    assert.ok(Math.abs(tip().x - before.x) < 1e-9, 'spin stays about the axle');
  }
});

test('four arched diffuser tunnels open under the port bar, separated by the vane webs', () => {
  const detail = rawTrim();
  const [valance] = named(detail, 'Roadster curved rear valance');
  detail.updateMatrixWorld(true);
  const hits = (x, y) => new THREE.Raycaster(new THREE.Vector3(x, y, 3), new THREE.Vector3(0, 0, -1)).intersectObject(valance, false).length;
  for (const x of [-.61, -.21, .21, .61]) {
    assert.equal(hits(x, .42), 0, `tunnel at ${x} is open`);
    assert.equal(hits(x, .535), 0, `tunnel at ${x} keeps its rounded crown`);
    assert.ok(hits(x + Math.sign(x) * .165, .535) > 0, `tunnel at ${x} has rounded shoulders, not a square cut`);
  }
  for (const x of [-.42, 0, .42]) assert.ok(hits(x, .42) > 0, `a web stands behind the vane at ${x}`);
});

test('each bronze port sits in a dark recessed socket wider than its rim', () => {
  for (const port of named(rawTrim(), 'Roadster recessed thruster')) {
    const socket = port.getObjectByName('Roadster nozzle socket');
    const lip = port.getObjectByName('Roadster nozzle satin lip');
    assert.ok(socket, 'photo 01: a dark ring frames every port');
    const radius = geometry => new THREE.Box3().setFromBufferAttribute(geometry.getAttribute('position')).max.x;
    assert.ok(radius(socket.geometry) > radius(lip.geometry) + .012);
    assert.ok(socket.material.color.r < .1 && socket.position.z < lip.position.z);
  }
});
