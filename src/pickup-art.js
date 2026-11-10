// Four authored, physically lit 3D prop silhouettes. Shared by every race renderer and
// the live collectible-guide preview; one merged mesh per tier stays GPU-instanced.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const PICKUP_SIZES = Object.freeze({ cell: .82, can: .94, tank: 1.08, overcharge: 1.24 });
// Render-only clearance: preserve the simulation's authored altitude and collision volume.
export const PICKUP_GROUND_LIFT = Object.freeze({ cell: .23, can: .28, tank: .82, overcharge: 1.50 });
const ACCENTS = Object.freeze({ cell: 0x2bc9ff, can: 0xff9d35, tank: 0xffcf48, overcharge: 0xe180ff });
const STEEL = 0x6c819d, DARK = 0x162840, WHITE = 0xeaf6ff;
const ROTATE_RIGHT = [0, 0, Math.PI / 2];

function piece(source, tint, at = [0, 0, 0], angles = [0, 0, 0]) {
  const g = source.index ? source.toNonIndexed() : source;
  if (g !== source) source.dispose();
  g.rotateX(angles[0]); g.rotateY(angles[1]); g.rotateZ(angles[2]); g.translate(...at);
  const rgb = new THREE.Color(tint), colors = new Float32Array(g.attributes.position.count * 3);
  for (let i = 0; i < colors.length; i += 3) rgb.toArray(colors, i);
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return g;
}

function merge(parts) {
  const result = mergeGeometries(parts, false);
  for (const g of parts) g.dispose();
  if (!result) throw new Error('Pickup geometry parts cannot be merged');
  result.computeBoundingSphere();
  return result;
}

const box = (x, y, z, color, at = [0, 0, 0]) =>
  piece(new RoundedBoxGeometry(x, y, z, 2, Math.min(.11, x / 6, y / 6, z / 6)), color, at);
const tube = (r, h, color, at = [0, 0, 0], rotation = [0, 0, 0], sides = 16) =>
  piece(new THREE.CylinderGeometry(r, r, h, sides), color, at, rotation);
const ring = (r, w, color, at = [0, 0, 0], rotation = [Math.PI / 2, 0, 0]) =>
  piece(new THREE.TorusGeometry(r, w, 8, 32), color, at, rotation);
const bead = (r, color, at) => piece(new THREE.SphereGeometry(r, 8, 6), color, at);

function energyCell() {
  return merge([
    box(.79, 1.22, .67, STEEL),
    box(.68, 1.10, .72, DARK),
    box(.45, .95, .77, 0x1479ba, [0, 0, .025]),
    box(.34, .79, .8, 0x4de4ff, [0, .03, .035]),
    box(.13, .66, .84, 0xe1fbff, [-.125, 0, .045]),
    box(.18, .68, .84, 0x0d4680, [.13, -.015, .05]),
    ...[-.52, .52].flatMap(y => [
      tube(.41, .17, 0xb0cce3, [0, y, 0], [0, 0, 0], 8),
      box(.54, .13, .73, 0x203853, [0, y * 1.13, 0]),
    ]),
    ...[-.25, 0, .25].map(y => box(.11, .055, .81, 0xbcefff, [.22, y, .03])),
    bead(.12, WHITE, [0, .67, 0]),
    bead(.12, ACCENTS.cell, [0, -.67, 0]),
    ring(.67, .035, ACCENTS.cell, [0, -.78, 0]),
  ]);
}

function energyCan() {
  return merge([
    tube(.43, 1.34, 0x6c758c),
    tube(.36, 1.17, 0xcf6120),
    tube(.29, 1.09, 0xffaa37),
    ...[-.62, .62].flatMap(y => [
      tube(.49, .21, STEEL, [0, y, 0]),
      tube(.34, .04, 0xffedc1, [0, y * 1.17, 0]),
      ring(.46, .04, 0xffd49c, [0, y * .78, 0]),
    ]),
    box(.48, .76, .16, DARK, [0, 0, .39]),
    box(.34, .55, .19, 0xffc44e, [0, .045, .48]),
    ...[-.17, 0, .17].map(y => box(.20, .055, .22, 0xfffbdf, [0, y, .49])),
    ...[-1, 1].map(side => box(.12, .79, .19, 0x8c98a8, [side * .39, 0, 0])),
    tube(.17, .21, 0xe7effc, [0, .81, 0]),
    tube(.24, .15, DARK, [0, .96, 0]),
    bead(.17, ACCENTS.can, [0, 1.04, 0]),
    ring(.68, .035, ACCENTS.can, [0, -.79, 0]),
  ]);
}

function highCapacityTank() {
  return merge([
    box(1.77, 1.45, .74, DARK),
    ...[-.46, .46].flatMap(x => [
      tube(.40, 1.86, 0x8c7841, [x, 0, 0]),
      tube(.32, 1.68, 0xffc22f, [x, 0, 0]),
      tube(.22, 1.64, 0xffec99, [x, 0, .28]),
      ...[-.93, -.42, .42, .93].map(y => tube(.43, .13, 0xbecad4, [x, y, 0])),
      bead(.16, WHITE, [x, 1.06, 0]),
    ]),
    ...[-.65, .65].map(y => box(1.95, .16, .98, STEEL, [0, y, 0])),
    box(.61, .62, .22, STEEL, [0, 0, .49]),
    box(.52, .52, .25, DARK, [0, 0, .58]),
    box(.36, .37, .27, ACCENTS.tank, [0, 0, .65]),
    box(.09, .25, .30, WHITE, [0, 0, .67]),
    ...[-.22, .22].map(y => box(.24, .08, .30, 0xfff3c6, [0, y, .65])),
    tube(.12, 1.3, 0xffe4a4, [0, 1.04, 0], ROTATE_RIGHT),
    ring(1.15, .045, ACCENTS.tank, [0, -1.1, 0]),
  ]);
}

function overchargeCore() {
  const crystal = piece(new THREE.IcosahedronGeometry(.72, 1), WHITE);
  const facets = [0x65eaff, 0xf269ff, 0xffd25f, 0x9e89ff, 0x7cffc1, 0xff8a9d];
  const colors = crystal.attributes.color;
  for (let i = 0; i < colors.count; i += 3) {
    const c = new THREE.Color(facets[Math.floor(i / 3) % facets.length]);
    for (let j = 0; j < 3; j++) colors.setXYZ(i + j, c.r, c.g, c.b);
  }
  return merge([
    crystal,
    piece(new THREE.IcosahedronGeometry(.24, 1), WHITE),
    ring(.95, .075, 0xff69d5, [0, 0, 0], [Math.PI / 2, .22, 0]),
    ring(1.00, .065, 0x7cebff, [0, 0, 0], [.32, Math.PI / 3, .2]),
    ring(1.06, .055, 0xffdf75, [0, 0, 0], [0, -.24, Math.PI / 3]),
    ...Array.from({ length: 6 }, (_, i) => {
      const a = i * Math.PI / 3;
      return bead(.12, facets[i], [Math.cos(a) * 1.04, Math.sin(a) * 1.04, 0]);
    }),
    ...[-1, 1].map(y => tube(.105, .53, 0xd8d4ef, [0, y * .95, 0])),
    bead(.18, WHITE, [0, 1.31, 0]),
    bead(.18, ACCENTS.overcharge, [0, -1.31, 0]),
  ]);
}

const BUILDERS = Object.freeze({ cell: energyCell, can: energyCan, tank: highCapacityTank, overcharge: overchargeCore });
export const createPickupGeometry = tier => BUILDERS[tier]();
export const createPickupGeometries = () => Object.fromEntries(Object.entries(BUILDERS).map(([tier, build]) => [tier, build()]));
export const createPickupMaterial = tier => {
  const accent = ACCENTS[tier];
  if (accent === undefined) throw new RangeError('Unknown pickup material: ' + tier);
  return new THREE.MeshPhysicalMaterial({
    name: 'Pickup ' + tier, color: WHITE, vertexColors: true, roughness: .27,
    metalness: .42, clearcoat: .8, clearcoatRoughness: .14, emissive: accent, emissiveIntensity: .26,
  });
};
export const createPickupMaterials = () => Object.fromEntries(Object.keys(ACCENTS).map(tier =>
  [tier, createPickupMaterial(tier)]));

// Shared uniform-only glow animation; reuses compiled PBR shader and all instancing.
export function pulsePickupMaterial(material, tier, time, reducedMotion) {
  const phase = { cell: 0, can: 1.5, tank: 2.9, overcharge: 4.2 }[tier] ?? 0;
  material.emissiveIntensity = reducedMotion ? .34 : .35 + .14 * Math.sin(time * 2.7 + phase);
}

export function animatePickup(marker, item, time, reducedMotion) {
  const phase = item.distance * .037, spinning = !reducedMotion;
  marker.rotation.set(spinning ? Math.sin(time * .65 + phase) * .065 : 0,
    spinning ? time * (item.tier === 'overcharge' ? 1.15 : .78) + phase : .2,
    spinning ? Math.sin(time * 1.7 + phase) * .08 : 0);
  if (Number.isFinite(item.altitude) && item.altitude < .5) marker.position.y += PICKUP_GROUND_LIFT[item.tier] ?? 0;
  marker.position.y += spinning ? Math.sin(time * 2.1 + phase) * .17 : 0;
  marker.scale.setScalar(PICKUP_SIZES[item.tier] ?? PICKUP_SIZES.cell);
}
