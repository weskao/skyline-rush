import * as THREE from 'three';
import { DUNE_TEMPEST_COURSE, DUNE_TEMPEST_GRAPH } from './dune-tempest.ts';
import { DUNE_TAKEOFF_PAD_METRES } from './dune-tempest-runtime-adapter.ts';
import { buildDuneRoadChunk, positionDuneHazards,
  duneSurfaceIntervals, duneWeatherBudget } from './dune-tempest-geometry.ts';

type Quality = 'low' | 'medium' | 'high';
type Point = readonly [number, number, number];
type Frame = { readonly point: Point; readonly right: Point; readonly up: Point;
  readonly forward: Point; readonly width: number };
type Sampler = (edgeId: string, localS: number) => Frame;

/** Streamed native Three.js map-owned scenery. Caller owns chunk lifetime and passes the
 * shared CourseGraph frame sampler. No second renderer, physics, race or AI engine.
 */
export function createDuneTempestVisualChunk(parent: THREE.Object3D, edgeId: string,
  startS: number, endS: number, routeLength: (id: string) => number,
  sample: Sampler, initialQuality: Quality = 'medium') {
  const edge = DUNE_TEMPEST_GRAPH.edges.find(e => e.id === edgeId);
  if (!edge) throw new RangeError('Unknown Dune edge: ' + edgeId);
  const authoredEdge = DUNE_TEMPEST_COURSE.edges.find(e => e.id === edgeId)!;
  const length = routeLength(edgeId);
  if (![startS, endS, length].every(Number.isFinite) || startS < 0 || endS <= startS ||
    endS > length || length <= 0) throw new RangeError('Invalid Dune chunk range');

  const group = new THREE.Group();
  group.name = 'Dune chunk ' + edgeId;
  parent.add(group);
  let disposed = false;
  const addMesh = (name: string, positions: number[], indices: number[], color: number) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({ color, roughness: 1, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.receiveShadow = true;
    group.add(mesh);
  };

  // Never cover the canyon air crossing with a fake, continuously solid bridge.
  const parts = edge.mode === 'flight'
    ? duneSurfaceIntervals(startS, endS, length, DUNE_TAKEOFF_PAD_METRES, authoredEdge.landing!.clearLengthMeters)
    : [[startS, endS]];
  for (const [from, to] of parts) {
    const ribbon = buildDuneRoadChunk(sample, edgeId, from, to, edge.width, 1.5);
    addMesh('Dune road', ribbon.positions, ribbon.roadIndices, 0xab7546);
    addMesh('Dune shoulder', ribbon.positions, ribbon.shoulderIndices, 0xb77b49);
  }

  const placed = positionDuneHazards(DUNE_TEMPEST_COURSE.hazards, edgeId, length, sample);
  for (const hazard of placed) {
    if (hazard.atS < startS || (hazard.atS >= endS && endS !== length)) continue;
    const sandPit = hazard.kind === 'sand-pit' || hazard.kind === 'scree';
    const geometry = sandPit
      ? new THREE.CircleGeometry(hazard.visualRadiusMeters, initialQuality === 'low' ? 12 : 24)
      : new THREE.DodecahedronGeometry(hazard.visualRadiusMeters, 0);
    const material = new THREE.MeshStandardMaterial({
      color: hazard.kind === 'sand-pit' ? 0x795136 : hazard.kind === 'scree' ? 0xa77a55 : 0x82523a,
      roughness: 1, side: THREE.DoubleSide, flatShading: true,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'Dune hazard ' + hazard.id;
    mesh.position.set(hazard.position[0], hazard.position[1], hazard.position[2]);
    if (sandPit) {
      const frame = sample(edgeId, hazard.atS);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1), new THREE.Vector3(...frame.up));
      mesh.position.addScaledVector(new THREE.Vector3(...frame.up), .045);
    }
    mesh.castShadow = !sandPit;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  // The arch and massive ring have world-space depth, not JPEG/photo-plane backdrops.
  for (const landmark of DUNE_TEMPEST_COURSE.landmarks.filter(x => x.edgeId === edgeId)) {
    const s = landmark.atFraction * length;
    if (s < startS || (s >= endS && endS !== length)) continue;
    const frame = sample(edgeId, s);
    const stoneRing = landmark.id === 'monumental-stone-ring';
    const radius = stoneRing ? 35 : Math.max(25, edge.width / 2 + 11);
    const arch = new THREE.Group();
    arch.name = 'Dune landmark ' + landmark.id;
    const offset = stoneRing ? 85 : 0;
    arch.position.set(...frame.point);
    arch.position.addScaledVector(new THREE.Vector3(...frame.right), offset);
    arch.position.addScaledVector(new THREE.Vector3(...frame.up), 5);
    arch.rotation.y = Math.atan2(-frame.forward[0], -frame.forward[2]);
    const stone = new THREE.MeshStandardMaterial({color:0x966047, roughness:1, flatShading:true});
    const torus = new THREE.Mesh(new THREE.TorusGeometry(radius, 5, 8, 32, Math.PI), stone);
    torus.name = 'Natural stone arch';
    arch.add(torus);
    for (const side of [-1, 1]) {
      const support = new THREE.Mesh(new THREE.CylinderGeometry(4.3, 6.8, 11, 7), stone);
      support.position.set(side * radius, -1.5, 0);
      arch.add(support);
    }
    group.add(arch);
  }

  // One deterministic dust field per authored weather zone, owned by its midpoint chunk.
  const storms: { geometry: THREE.BufferGeometry; initial: Float32Array;
    budget: (typeof DUNE_TEMPEST_COURSE.weatherZones)[number]['particleBudgets'] }[] = [];
  for (const zone of DUNE_TEMPEST_COURSE.weatherZones.filter(x => x.edgeId === edgeId)) {
    const centre = length * (zone.startFraction + zone.endFraction) / 2;
    if (centre < startS || (centre >= endS && endS !== length)) continue;
    const frame = sample(edgeId, centre), initial = new Float32Array(zone.particleBudgets.high * 3);
    for (let i = 0; i < zone.particleBudgets.high; i++) {
      const t = i / zone.particleBudgets.high, r = 22 + (i * 37 % 70);
      initial[i*3] = frame.point[0] + frame.right[0] * Math.sin(i * 2.4) * r + frame.forward[0] * (t * 120 - 60);
      initial[i*3+1] = frame.point[1] + 1.5 + (i * 13 % 24);
      initial[i*3+2] = frame.point[2] + frame.right[2] * Math.sin(i * 2.4) * r + frame.forward[2] * (t * 120 - 60);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(initial.slice(), 3));
    const dust = new THREE.Points(geometry, new THREE.PointsMaterial({
      color: 0xe5bd83, size: 1.35, transparent: true, opacity: .24,
      depthWrite: false, sizeAttenuation: true,
    }));
    dust.name = 'Dune sandstorm ' + zone.id;
    group.add(dust);
    storms.push({geometry, initial, budget:zone.particleBudgets});
  }

  const update = (time: number, quality: Quality, reducedMotion: boolean) => {
    if (disposed) return;
    for (const storm of storms) {
      const budget = duneWeatherBudget({particleBudgets:storm.budget}, quality, reducedMotion);
      storm.geometry.setDrawRange(0, budget);
      if (!budget || !Number.isFinite(time)) continue;
      const a = storm.geometry.getAttribute('position') as THREE.BufferAttribute;
      const array = a.array as Float32Array;
      for (let i = 0; i < budget; i++) {
        array[i*3] = storm.initial[i*3] + 2.5 * Math.sin(time * .22 + i * .37);
        array[i*3+1] = storm.initial[i*3+1] + .35 * Math.sin(time*.3+i*.22);
        array[i*3+2] = storm.initial[i*3+2] + 2 * Math.cos(time*.17+i*.29);
      }
      a.needsUpdate = true;
    }
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    group.removeFromParent();
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
    group.traverse(object => {
      if (!(object instanceof THREE.Mesh || object instanceof THREE.Points)) return;
      geometries.add(object.geometry);
      for (const m of Array.isArray(object.material) ? object.material : [object.material]) materials.add(m);
    });
    geometries.forEach(g => g.dispose());
    materials.forEach(m => m.dispose());
    group.clear();
  };
  update(0, initialQuality, false);
  return {group, update, dispose};
}
