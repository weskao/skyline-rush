import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeCar, material } from './car-model.js';
import { RIVAL_PROFILES } from './rival-car-profiles.js';
import { bodyGeometry, canopyGeometry, fasciaPolygon, loft, range, roofStripe, shapeAt, sidePanel, strip, surface } from './rival-car-surfaces.js';

function batch(geometries) {
  // Batches only mix untextured panels, so strip UVs from Three's primitives.
  for (const geometry of geometries) geometry.deleteAttribute('uv');
  const combined = mergeGeometries(geometries);
  for (const geometry of geometries) geometry.dispose();
  return combined;
}

function panel(group, name, geometries, finish) {
  const mesh = new THREE.Mesh(batch(geometries), finish);
  mesh.name = name;
  group.add(mesh);
  return mesh;
}

function bodyBeam(width, height, depth, x, y, z) {
  return new THREE.BoxGeometry(width,height,depth).translate(x,y,z);
}

function tailPaths(profile, side) {
  return profile.rear.map(path => Array.isArray(path) ? path : range(0, 2*Math.PI, 14).map(angle => [
    path.center[0] + path.radii[0] * Math.cos(angle),
    path.center[1] + path.radii[1] * Math.sin(angle),
  ])).map(path => path.map(([x,y]) => [x*side,y]));
}

function makeFascia(profile, front) {
  const facing = front ? -1 : 1;
  const [end, width, top] = profile.body[front ? 0 : profile.body.length - 1];
  const z = end + facing*.012;
  const scale = (x,y,offset=0) => [x*width, .35 + (top-.35)*y, z + offset*facing];
  const intake = [[-.91,.30],[-.78,.57],[-.46,.48],[.46,.48],[.78,.57],[.91,.30],[.72,.20],[-.72,.20]];
  const housing = [fasciaPolygon(intake.map(([x,y])=>scale(x,y)), facing)];
  const lamps = [], details = [];
  for (const side of [-1,1]) {
    // The full-width Pulse light is two sealed halves with a very small midpoint.
    const paths = front ? [profile.front.map(([x,y])=>[x*side,y])] : tailPaths(profile, side);
    for (const path of paths) {
      housing.push(strip(path.map(([x,y])=>scale(x,y,.005)),.091,facing));
      lamps.push(strip(path.map(([x,y])=>scale(x,y,.010)),front?.027:.035,facing));
    }
    for (let i = 0; i < 3; i++) {
      const a = .56 + i*.096;
      details.push(strip([scale(a*side,.26,.007),scale((a-.07)*side,.43,.007)],.013,facing));
    }
  }
  return { housing, lamps, details };
}

function aero(profile, carbon) {
  const [rear] = profile.body.at(-1);
  const [height, span, chord, sweep] = profile.wing;
  const center = rear - chord*.60 - sweep*.78 - .03;
  const base = shapeAt(profile.body, center, 2) - .026;
  const wing = new THREE.Group();
  wing.name = 'Rival movable aerofoil';
  wing.position.set(0,base,center);

  const plane = new THREE.BoxGeometry(span*2,.055,chord,8,1,1);
  const verts = plane.attributes.position;
  for (let i = 0; i < verts.count; i++) {
    const curve = (verts.getX(i)/span)**2;
    verts.setY(i, verts.getY(i) + height + curve*.042 - verts.getZ(i)*.11);
    verts.setZ(i, verts.getZ(i) + curve*sweep);
  }
  plane.computeVertexNormals();
  const parts = [plane];
  for (const side of [-1,1]) {
    if (height > .03) parts.push(bodyBeam(.068,height+.075,chord*.35,side*span*.55,height*.44,-.018));
    if (height > .18) parts.push(bodyBeam(.045,.15,chord*.88,side*span*.98,height+.015,sweep*.82));
  }
  panel(wing, 'Carbon airfoil', parts, carbon);
  return wing;
}

function speedsterCowls(profile) {
  const rings = range(-.16,1.30,9).map((z,i) => {
    const arch = Math.sin(i/9*Math.PI) ** .7;
    const deck = shapeAt(profile.body,z,2);
    const mid = .38;
    return [[mid-.23,deck-.02,z],[mid+.23,deck-.02,z],[mid+.23,deck+.04*arch,z],
      [mid+.14,deck+.20*arch,z],[mid-.14,deck+.20*arch,z],[mid-.23,deck+.04*arch,z]];
  });
  return [loft(rings), loft(rings.map(ring=>ring.slice().reverse().map(([x,y,z])=>[-x,y,z])))];
}

function trim(profile, group, { paint, black, light, white }) {
  const [rear] = profile.body.at(-1);
  const front = makeFascia(profile,true), tail = makeFascia(profile,false);
  const undertray = bodyBeam(1.66,.078,rear*.86,0,.335,rear*.47);
  const splitter = bodyBeam(profile.body[0][1]*1.88,.058,.34,0,.351,profile.body[0][0]+.13);
  const blackParts = [...front.housing,...tail.housing,undertray,splitter];
  const accents = [];
  const [ventStart,ventEnd,ventY] = profile.vent;
  for (const side of [-1,1]) {
    blackParts.push(sidePanel(profile,side,[[ventStart,.49],[ventEnd,.47],[ventEnd-.11,ventY],[ventStart+.14,ventY-.055]],.006));
    accents.push(sidePanel(profile,side,[[-.78,.5],[.92,.54],[.74,.60],[-.61,.55]],.014));
  }
  const details = [...front.details,...tail.details];
  for (const side of [-1,1]) {
    for (const x of [.31,.52,.73]) {
      blackParts.push(bodyBeam(.035,.105,.29,side*x,.36,rear-.15));
    }
    details.push(strip([[.48*side,.41,rear+.016],[.81*side,.41,rear+.016]],.018,1));
  }
  // The prototype's dorsal fin and the speedster's two fairings are part of
  // their silhouette. Thin fascia ribs and the metallic trim are the high tier.
  if (profile.fin) blackParts.push(loft([
    [[-.024,.86,.30],[.024,.86,.30],[.024,.96,.30],[-.024,.96,.30]],
    [[-.024,.87,.70],[.024,.87,.70],[.024,1.27,.70],[-.024,1.27,.70]],
    [[-.024,.85,2.19],[.024,.85,2.19],[.024,1.23,2.19],[-.024,1.23,2.19]],
  ]));
  if (profile.speedster) panel(group,'Twin speedster fairings',speedsterCowls(profile),paint);
  panel(group,'Carbon intakes and diffuser',blackParts,black);
  panel(group,'Rival front light signature',front.lamps,white);
  panel(group,'Rival rear light signature',tail.lamps,light);
  const graphicsMesh = panel(group,'Rival livery graphics',[
    ...profile.stripes.map(part=>roofStripe(profile,part,true)), ...accents.map(part=>part.clone()),
  ],material('#ebc68d',.24,.39));
  const lowGraphics = batch([...profile.stripes.map(part=>roofStripe(profile,part,false)), ...accents]);
  const detailing = new THREE.Group();
  detailing.name = 'Rival fine trim';
  panel(detailing,'Fascia metalwork',details,material('#7d8994',.29,.38));
  group.add(detailing);
  Object.assign(group.userData, { rivalGraphics: graphicsMesh.material, graphicsMesh, lowGraphics, detailing });
  const wing = aero(profile,black);
  group.add(wing);
  return wing;
}

const detailedTire = new THREE.LatheGeometry([
  [0,-.13],[.335,-.139],[.414,-.124],[.44,-.088],[.44,.088],[.414,.124],[.335,.139],[0,.13],
].map(a=>new THREE.Vector2(...a)),22);
const rims = new Map();
function detailedRim(count) {
  let rim = rims.get(count);
  if (rim) return rim;
  const pieces = [new THREE.CylinderGeometry(.082,.082,.29,12)];
  for (const side of [-1,1]) {
    pieces.push(new THREE.RingGeometry(.266,.318,20).rotateX(-side*Math.PI/2).translate(0,side*.143,0));
    for (const angle of range(0,2*Math.PI,count).slice(0,-1)) {
      const y = side*.144;
      const spoke = surface([[-.037,y,.065],[-.021,y,.168],[.009,y,.292],[.044,y,.292],[.019,y,.164],[.026,y,.065]],
        side > 0 ? [0,1,4,0,4,5,1,2,3,1,3,4] : [4,1,0,5,4,0,3,2,1,4,3,1]);
      pieces.push(spoke.rotateY(angle));
    }
  }
  rim = batch(pieces);
  rims.set(count,rim);
  return rim;
}

const styles = RIVAL_PROFILES.map(profile => ({
  color: profile.paint, glass: profile.glass, light: [2.15,.049,.08], motorsport: true,
  body: bodyGeometry(profile,true), lowBody: bodyGeometry(profile,false),
  cabin: canopyGeometry(profile,true), lowCabin: canopyGeometry(profile,false),
  trim: (group, materials) => trim(profile,group,materials),
}));

export function makeMotorsportRival(chassis) {
  const style = styles[chassis];
  const profile = RIVAL_PROFILES[chassis];
  const car = makeCar(style);
  car.name = profile.name;
  const { wheels } = car.userData;
  const [tireMesh, rimMesh] = wheels[0].children;
  car.userData.rivalDetail = {
    style, canopy: car.children.find(part=>part.geometry===style.cabin),
    rim: detailedRim(profile.wheels), lowTire: tireMesh.geometry, lowRim: rimMesh.geometry,
    highGraphics: car.userData.graphicsMesh.geometry,
  };
  return car;
}

export function setRivalQuality(car, quality) {
  const { rivalDetail, body, graphicsMesh, detailing, wheels, lowGraphics } = car.userData;
  const { style, canopy, rim, lowTire, lowRim, highGraphics } = rivalDetail;
  const high = quality === 'high', low = quality === 'low';
  body.geometry = high ? style.body : style.lowBody;
  canopy.geometry = high ? style.cabin : style.lowCabin;
  graphicsMesh.geometry = high ? highGraphics : lowGraphics;
  detailing.visible = !low;
  for (const wheel of wheels) {
    wheel.children[0].geometry = high ? detailedTire : lowTire;
    wheel.children[1].geometry = low ? lowRim : rim;
  }
  car.userData.wheelDraws?.forEach((draw, k) => { draw.geometry = wheels[0].children[k].geometry; draw.boundingSphere = null; });
}

// Each rival's four tyres and four rims draw as two instanced meshes (48 -> 12 draws for six rivals). They keep the
// car's own materials, so three's opaque sort (by material.id) is unchanged. The wheel meshes stay in the graph as
// the pose and the measured shape (hull, airflow profile) but sit on no layer, so no camera draws them.
// Call after every rival exists: a rival's Object3D id is its flame flicker phase (rival-drive-vfx.ts).
export function instanceRivalWheels(car) {
  const { wheels } = car.userData;
  car.userData.wheelDraws = [0, 1].map(k => {
    const source = wheels[0].children[k];
    const draw = new THREE.InstancedMesh(source.geometry, source.material, wheels.length);
    draw.name = k ? 'Rival rims' : 'Rival tyres';
    draw.userData.drawProxy = true; // shape measurements read the wheel meshes, not this
    for (const wheel of wheels) wheel.children[k].layers.disableAll();
    car.add(draw);
    return draw;
  });
  syncRivalWheels(car);
}

const local = new THREE.Matrix4();
/** Copies the posed wheels (steer, fold-out, rim spin) into the instances; world.js calls it after posing them. */
export function syncRivalWheels(car) {
  const { wheels, wheelDraws } = car.userData;
  wheels.forEach((wheel, i) => {
    wheel.updateMatrix();
    wheelDraws.forEach((draw, k) => {
      const part = wheel.children[k];
      part.updateMatrix();
      draw.setMatrixAt(i, local.multiplyMatrices(wheel.matrix, part.matrix));
    });
  });
  for (const draw of wheelDraws) draw.instanceMatrix.needsUpdate = true;
}

export function disposeRivalLods(car) {
  const { rivalDetail, lowGraphics } = car.userData;
  const { style, rim, lowTire, lowRim, highGraphics } = rivalDetail;
  const geometries = new Set([style.lowBody, style.body, style.lowCabin, style.cabin,
    lowGraphics, highGraphics, lowTire, detailedTire, lowRim, rim]);
  car.traverse(part => geometries.delete(part.geometry));
  for (const geometry of geometries) geometry.dispose();
  car.userData.wheelDraws?.forEach(draw => draw.dispose());
}
