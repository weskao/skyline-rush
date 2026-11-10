// Purpose-built, low-poly roadside collectibles. One merged geometry per tier keeps the existing
// four InstancedMesh draw calls even with hundreds of pickups in view.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const PICKUP_SIZES = Object.freeze({ cell: 0.76, can: 0.89, tank: 1.08, overcharge: 1.22 });

function piece(geometry, hex, position = [0, 0, 0], rotation = [0, 0, 0]) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  if (g !== geometry) geometry.dispose();
  g.rotateX(rotation[0]); g.rotateY(rotation[1]); g.rotateZ(rotation[2]);
  g.translate(...position);
  const color = new THREE.Color(hex), colors = new Float32Array(g.attributes.position.count * 3);
  for (let i = 0; i < colors.length; i += 3) color.toArray(colors, i);
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return g;
}

function assembled(parts) {
  const geometry = mergeGeometries(parts, false);
  parts.forEach(g => g.dispose());
  if (!geometry) throw new Error('Could not assemble pickup mesh');
  geometry.computeBoundingSphere();
  return geometry;
}

const box = (x, y, z, color, pos) => piece(new THREE.BoxGeometry(x, y, z), color, pos);
const cylinder = (r1, r2, h, sides, color, pos) => piece(new THREE.CylinderGeometry(r1, r2, h, sides), color, pos);
const torus = (r, tube, color, pos, rot = [Math.PI / 2, 0, 0]) =>
  piece(new THREE.TorusGeometry(r, tube, 6, 24), color, pos, rot);

export function createPickupGeometries() {
  const cell = assembled([
    box(.62, .85, .5, 0x17314b, [0, 0, 0]),
    box(.42, .65, .53, 0x33d9ff, [0, 0, .025]),
    box(.15, .48, .57, 0xd8faff, [-.17, 0, .01]),
    cylinder(.37, .37, .16, 6, 0x8ec9ef, [0, .49, 0]),
    cylinder(.37, .37, .16, 6, 0x8ec9ef, [0, -.49, 0]),
    box(.3, .085, .55, 0x05335d, [.07, 0, .01]),
  ]);
  const can = assembled([
    cylinder(.4, .4, 1.1, 12, 0x74401d, [0, 0, 0]),
    cylinder(.31, .31, .95, 12, 0xffa42e, [0, 0, 0]),
    cylinder(.46, .46, .18, 12, 0xffd184, [0, .6, 0]),
    cylinder(.46, .46, .18, 12, 0xffd184, [0, -.6, 0]),
    torus(.39, .055, 0xffe0a4, [0, .42, 0]),
    torus(.39, .055, 0xffe0a4, [0, -.42, 0]),
    box(.24, .65, .14, 0xffffff, [0, 0, .37]),
  ]);
  const tank = assembled([
    box(1.38, .3, .52, 0x614b22, [0, 0, 0]),
    ...[-.38, .38].flatMap(x => [
      cylinder(.34, .34, 1.5, 12, 0xd09b24, [x, 0, 0]),
      cylinder(.38, .38, .16, 12, 0xffe8a0, [x, .78, 0]),
      cylinder(.38, .38, .16, 12, 0xffe8a0, [x, -.78, 0]),
      torus(.35, .065, 0xfff4c2, [x, .44, 0]),
      torus(.35, .065, 0xfff4c2, [x, -.44, 0]),
    ]),
    box(.56, .42, .26, 0xffd34c, [0, 0, .35]),
    box(.28, .13, .28, 0xffffff, [0, 0, .5]),
  ]);
  const crystal = piece(new THREE.IcosahedronGeometry(.67, 0), 0xffd8ff);
  const crystalColor = crystal.attributes.color;
  const rainbow = [0x49dbff, 0xff59c9, 0xf4cd48, 0x9d7cff, 0x5cffba, 0xff704f];
  for (let i = 0; i < crystalColor.count; i += 3) {
    const color = new THREE.Color(rainbow[Math.floor(i / 3) % rainbow.length]);
    for (let j = 0; j < 3; j++) crystalColor.setXYZ(i + j, color.r, color.g, color.b);
  }
  const overcharge = assembled([
    crystal,
    torus(.93, .075, 0xff69d5, [0, 0, 0], [Math.PI / 2, .3, 0]),
    torus(.92, .06, 0x80efff, [0, 0, 0], [.2, Math.PI / 3, 0]),
    torus(.93, .055, 0xfff393, [0, 0, 0], [0, .1, Math.PI / 3]),
    cylinder(.19, .19, 1.72, 6, 0xe0d5ff, [0, 0, 0]),
  ]);
  return { cell, can, tank, overcharge };
}

export function animatePickup(marker, item, time, reducedMotion) {
  const phase = item.distance * .037;
  marker.rotation.set(0, reducedMotion ? .2 : time * (item.tier === 'overcharge' ? 1.4 : .85) + phase,
    reducedMotion ? 0 : Math.sin(time * 1.7 + phase) * .09);
  marker.position.y += reducedMotion ? 0 : Math.sin(time * 2.4 + phase) * .15;
  marker.scale.setScalar(PICKUP_SIZES[item.tier] ?? PICKUP_SIZES.cell);
}
