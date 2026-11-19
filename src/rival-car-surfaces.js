import { BufferGeometry, Float32BufferAttribute, MathUtils, Vector3 } from 'three';

// Interpolate between authored sections with central tangents. Monotone values
// stay inside their adjacent stations so styling never overshoots the contact hull.
export function shapeAt(stations, z, column) {
  let i = 0;
  while (i < stations.length - 2 && z > stations[i + 1][0]) i++;
  const p = stations[i], q = stations[i + 1], prev = stations[Math.max(0, i - 1)], next = stations[Math.min(stations.length - 1, i + 2)];
  const width = q[0] - p[0], t = MathUtils.clamp((z - p[0]) / width, 0, 1);
  const t2 = t * t, t3 = t2 * t, a = p[column], b = q[column];
  const m0 = width * (b - prev[column]) / (q[0] - prev[0]);
  const m1 = width * (next[column] - a) / (next[0] - p[0]);
  return MathUtils.clamp((2 * t3 - 3 * t2 + 1) * a + (t3 - 2 * t2 + t) * m0 +
    (-2 * t3 + 3 * t2) * b + (t3 - t2) * m1, Math.min(a, b), Math.max(a, b));
}

export function surface(points, indices) {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(points.flat(), 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function loft(rings, caps = true) {
  const n = rings[0].length, last = (rings.length - 1) * n;
  const faces = [];
  for (let k = 0; k < last; k += n) for (let i = 0; i < n; i++) {
    const a = k + i, b = k + (i + 1) % n;
    faces.push(a, b, a + n, b, b + n, a + n);
  }
  if (caps) {
    // Separate normals give the bumper caps and the longitudinal paint their own reflected highlight.
    const front = last + n, rear = front + n;
    for (let i = 1; i < n - 1; i++) faces.push(front, front + i + 1, front + i, rear, rear + i, rear + i + 1);
    return surface(rings.flat().concat(rings[0], rings.at(-1)), faces);
  }
  return surface(rings.flat(), faces);
}

export const range = (a, b, steps) => Array.from({ length: steps + 1 }, (_, i) => MathUtils.lerp(a, b, i / steps));

function bodySection(profile, z) {
  const width = shapeAt(profile.body, z, 1);
  const deck = shapeAt(profile.body, z, 2);
  const radius = .47;
  const nearest = Math.min(Math.abs(z + 1.35), Math.abs(z - 1.42));
  const arch = .46 + Math.sqrt(Math.max(0, radius ** 2 - nearest ** 2));
  const shoulder = deck - profile.shoulder * .48;
  const lower = nearest < radius ? Math.min(shoulder - .018, Math.max(.385, arch)) : .385;
  return { width, deck, shoulder, lower };
}

function bodyStations(profile, detailed) {
  const z0 = profile.body[0][0], z1 = profile.body.at(-1)[0];
  return [...new Set([...range(z0,z1,detailed ? 38 : 8),
    ...profile.body.map(([z])=>z), -1.82,-1.35,-.88,.95,1.42,1.89])].sort((a,b)=>a-b);
}

function upperDeck(profile, z, u, stations) {
  const end = stations.findIndex((at,i)=>i>0 && at>=z);
  const from = stations[end-1], to = stations[end], t = (z-from)/(to-from);
  const width = MathUtils.lerp(shapeAt(profile.body,from,1),shapeAt(profile.body,to,1),t);
  const deck = MathUtils.lerp(shapeAt(profile.body,from,2),shapeAt(profile.body,to,2),t);
  // The deck uses those same two transverse vertices on each side of the crest.
  const crest = MathUtils.mapLinear(Math.max(.55, Math.abs(u)),.55,.88,deck+.025,deck);
  return [width*u,crest+.008,z];
}

export function bodyGeometry(profile, detailed) {
  const stations = bodyStations(profile,detailed);
  return loft(stations.map(z => {
    const { width: w, deck, shoulder, lower } = bodySection(profile, z);
    const right = [
      [.73*w,.32,z], [.91*w,lower,z], [w,Math.max(lower+.012,shoulder),z],
      [.96*w,deck-.04,z], [.88*w,deck,z], [.55*w,deck+.025,z],
    ];
    return [...right, ...right.slice().reverse().map(([x,y,z]) => [-x,y,z])];
  }));
}

export function canopyGeometry(profile, detailed) {
  const { cabin, roof } = profile;
  return loft(range(cabin[0][0], cabin.at(-1)[0], detailed ? 18 : 6).map(z => {
    const w = shapeAt(cabin, z, 1), y = shapeAt(cabin, z, 2);
    const base = shapeAt(profile.body, z, 2) - .016;
    const rise = Math.max(.012, y - base);
    const right = [[w,base,z],[w*.95,base+rise*.4,z],[w*roof,base+rise*.86,z],[w*roof*.54,base+rise,z]];
    return [...right, ...right.slice().reverse().map(([x,y,z]) => [-x,y,z])];
  }));
}

export function strip(points, width, facing) {
  const vertices = [], faces = [];
  for (let i = 0; i < points.length; i++) {
    const from = points[Math.max(0, i-1)], to = points[Math.min(points.length-1, i+1)];
    const [x,y,z] = points[i];
    const distance = Math.hypot(to[0]-from[0], to[1]-from[1]) || 1;
    const dx = (to[1]-from[1]) * width / (2*distance), dy = (from[0]-to[0]) * width / (2*distance);
    vertices.push([x+dx,y+dy,z],[x-dx,y-dy,z]);
    const j = i * 2;
    if (i > 0) faces.push(j-2,j,j-1,j-1,j,j+1);
  }
  return surface(vertices, facing > 0 ? faces : faces.reverse());
}

export function roofStripe(profile, [left,right,start,end], detailed) {
  const stations = bodyStations(profile,detailed);
  const sections = [start,...stations.filter(z=>z>start && z<end),end];
  const triangles = [];
  for (let j = 0; j < sections.length - 1; j++) {
    const i = j * 2;
    triangles.push(i,i+2,i+1,i+1,i+2,i+3);
  }
  return surface(sections.flatMap(z => [upperDeck(profile,z,left,stations), upperDeck(profile,z,right,stations)]), triangles);
}

// Project sill graphics onto the same polygon strip used by the painted panel.
export function sidePoint(profile, side, z, y, offset = .006) {
  const { width, lower, shoulder, deck } = bodySection(profile, z);
  const peak = Math.max(lower+.012, shoulder);
  const t = MathUtils.clamp((y - lower) / (peak - lower), 0, 1);
  const x = y > peak ? MathUtils.lerp(1, .96, MathUtils.clamp((y-peak)/Math.max(.01,deck-.04-peak),0,1)) : .91 + .09*t;
  return [side * (x * width + offset), y, z];
}

export function sidePanel(profile, side, points, offset) {
  const xyz = points.map(([z,y]) => sidePoint(profile, side,z,y,offset));
  const triangles = [];
  for (let i = 1; i < points.length - 1; i++) triangles.push(0,i,i+1);
  const test = new Vector3().fromArray(xyz[1]).sub(new Vector3().fromArray(xyz[0]))
    .cross(new Vector3().fromArray(xyz[2]).sub(new Vector3().fromArray(xyz[0])));
  return surface(xyz, test.x * side > 0 ? triangles : triangles.reverse());
}

export function fasciaPolygon(points, facing) {
  const faces = [];
  for (let i = 1; i < points.length - 1; i++) faces.push(0,i,i+1);
  const [a,b,c] = points;
  const normal = (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  return surface(points, normal * facing > 0 ? faces : faces.reverse());
}
