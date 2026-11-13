// Cliff greenery for the `?look=3d` Coast (Medium+): grass blended into the up-facing surfaces of the scan cliffs and
// rocks, and shrub impostor cards (coast-greenery.glb, baked from Poly Haven fynbos scans) instanced on the cliff tops.
// Self-contained: it reads the scan pieces the model layer (coast-scenery-glb.ts) already placed and adds one
// instanced draw per shrub variant. Everything joins the scene with the scans, before GO, so the warmup builds it.
import * as THREE from 'three';
import type { ModelCache, ModelResult } from './asset-model-loader.ts';
import { seededRng } from './rng.ts';

export const GREENERY_ID = 'coast-greenery';
export const GREENERY_SHRUBS = ['shrub_a', 'shrub_b', 'shrub_c'] as const;
const SCENERY_ID = 'coast-scenery';
/** Scan pieces that carry shrubs, and scan materials that grow grass (palms and rails stay as they are). */
const HOSTS = ['cliff_a', 'cliff_b'], GRASSY = ['coast_cliff_a', 'coast_cliff_b', 'coast_arch', 'coast_rock'];
/** Shrubs per cliff; 12 triangles each, so a full High window (16 cliffs) is about 14k triangles in 3 draws. */
const PER_HOST = 72;
/** Piece-space metres above the cliff's ground pivot: the wave-washed ledges stay bare. */
const MIN_HEIGHT = 3;
/** Thicket size (1 = the 2.4-3.3 m scan thickets) on a x1 cliff; it grows with the cliff scale to the power GROWTH,
 *  so a x10 headland carries tree-size clumps, not shrubs ten times taller than the roadside ones look. */
const SIZE = [.55, 1.05] as const, GROWTH = .75, SINK = .06;
/** At card distance leaf and twig average to olive-khaki; a nudge toward the leaf green of the scan. */
const SHRUB_TINT = [.8, 1, .7] as const;

/** `count` points spread by area over the faces that point up (normal y >= minUp) and lie at or above minHeight.
 *  `positions` are xyz triples with y up; empty when no face qualifies. */
export function greeneryAnchors(positions: ArrayLike<number>, index: ArrayLike<number>, count: number, rng: () => number,
  { minUp = .75, minHeight = -Infinity }: { minUp?: number; minHeight?: number } = {}): Float32Array {
  const faces: number[] = [], cumulative: number[] = [];
  let total = 0;
  for (let i = 0; i + 2 < index.length; i += 3) {
    const a = index[i]! * 3, b = index[i + 1]! * 3, c = index[i + 2]! * 3;
    const ux = positions[b]! - positions[a]!, uy = positions[b + 1]! - positions[a + 1]!, uz = positions[b + 2]! - positions[a + 2]!;
    const vx = positions[c]! - positions[a]!, vy = positions[c + 1]! - positions[a + 1]!, vz = positions[c + 2]! - positions[a + 2]!;
    const ny = uz * vx - ux * vz, twiceArea = Math.hypot(uy * vz - uz * vy, ny, ux * vy - uy * vx);
    if (!(twiceArea > 0) || ny / twiceArea < minUp || Math.min(positions[a + 1]!, positions[b + 1]!, positions[c + 1]!) < minHeight) continue;
    total += twiceArea;
    faces.push(i);
    cumulative.push(total);
  }
  const out = new Float32Array(faces.length ? count * 3 : 0);
  for (let k = 0; k < out.length; k += 3) {
    const pick = rng() * total;
    let low = 0, high = faces.length - 1;
    while (low < high) { const mid = (low + high) >> 1; if (cumulative[mid]! < pick) low = mid + 1; else high = mid; }
    const face = faces[low]!, a = index[face]! * 3, b = index[face + 1]! * 3, c = index[face + 2]! * 3;
    let u = rng(), v = rng();
    if (u + v > 1) { u = 1 - u; v = 1 - v; } // fold the unit square onto the triangle
    for (let j = 0; j < 3; j++) out[k + j] = positions[a + j]! + u * (positions[b + j]! - positions[a + j]!) + v * (positions[c + j]! - positions[a + j]!);
  }
  return out;
}

const COMMON = '#include <common>', PROJECT = '#include <project_vertex>', NORMAL = '#include <normal_fragment_maps>';
// Layer coordinates (instance matrix applied, the moving layer origin not): the pattern is fixed to the piece.
// shortcut: an Endless origin rebase (every 500 m) shifts the noise pattern by one step; key it on route metres if seen.
const VERTEX = `${PROJECT}
vGreenPos = transformed;
#ifdef USE_INSTANCING
	vGreenPos = ( instanceMatrix * vec4( transformed, 1.0 ) ).xyz;
#endif`;
const NOISE = `${COMMON}
varying vec3 vGreenPos;
float greenHash( vec2 p ) { vec3 q = fract( p.xyx * .1031 ); q += dot( q, q.yzx + 33.33 ); return fract( ( q.x + q.y ) * q.z ); }
float greenNoise( vec2 p ) {
	vec2 i = floor( p ), f = fract( p ), u = f * f * ( 3.0 - 2.0 * f );
	return mix( mix( greenHash( i ), greenHash( i + vec2( 1.0, 0.0 ) ), u.x ), mix( greenHash( i + vec2( 0.0, 1.0 ) ), greenHash( i + vec2( 1.0, 1.0 ) ), u.x ), u.y );
}`;
// World up-ness of the normal-mapped normal, so the scan's own relief shapes the grass edge; the grass keeps the scan's
// light and dark (its luminance) and fades out toward the waterline (the sea is y = -6, coast-scenery-glb.ts SEA).
// shortcut: a tint of the scan albedo, not a grass texture (the cliffs stand 40 m+ from the road at ~11 px/m);
// top-project a CC0 grass albedo here if a camera ever gets close.
const BLEND = `${NORMAL}
{
	float greenPatch = greenNoise( vGreenPos.xz * .09 ) * .65 + greenNoise( vGreenPos.xz * .37 ) * .35;
	float greenUp = inverseTransformDirection( normal, viewMatrix ).y + ( greenPatch - .5 ) * .3;
	float green = smoothstep( .6, .85, greenUp ) * smoothstep( -4.0, -1.0, vGreenPos.y );
	float greenLum = dot( diffuseColor.rgb, vec3( .2126, .7152, .0722 ) );
	vec3 grass = mix( vec3( .035, .07, .015 ), vec3( .11, .13, .04 ), greenPatch ) * clamp( .6 + 4.0 * greenLum, .6, 1.6 );
	diffuseColor.rgb = mix( diffuseColor.rgb, grass, green * .92 );
	roughnessFactor = mix( roughnessFactor, .95, green );
}`;

/** Grass on the up-facing surfaces of a scan material. Idempotent: the model cache shares materials between attaches. */
export function greenTops(material: THREE.Material): void {
  if (material.userData.greenTops) return;
  material.userData.greenTops = true;
  material.customProgramCacheKey = () => 'coast-green-tops';
  material.onBeforeCompile = shader => {
    const vertex = shader.vertexShader, fragment = shader.fragmentShader;
    if (![COMMON, PROJECT].every(chunk => vertex.includes(chunk)) || ![COMMON, NORMAL].every(chunk => fragment.includes(chunk))) throw new Error('coast greenery: three shader chunks moved; update the grass injection');
    shader.vertexShader = vertex.replace(COMMON, `${COMMON}\nvarying vec3 vGreenPos;`).replace(PROJECT, VERTEX);
    shader.fragmentShader = fragment.replace(COMMON, NOISE).replace(NORMAL, BLEND);
  };
}

/** Loads coast-greenery.glb with the scenery GLB and hands back one handle: the shrub nodes ride in the scenery tree,
 *  so they attach (and compile) with it. A failed greenery load keeps the scan coast, with grass but no shrubs. */
export function withGreenery(cache: Pick<ModelCache, 'load'>): Pick<ModelCache, 'load'> {
  const free = (result: ModelResult | null): void => { if (result?.kind === 'model') result.release(); };
  return {
    async load(id, options) {
      if (id !== SCENERY_ID) return cache.load(id, options);
      const extra = cache.load(GREENERY_ID, options).catch(() => null);
      const scenery = await cache.load(id, options).catch((error: unknown) => { void extra.then(free); throw error; });
      const greenery = await extra;
      if (scenery.kind !== 'model') { free(greenery); return scenery; }
      if (greenery?.kind !== 'model') {
        console.warn(`[coast-greenery] ${GREENERY_ID} → no shrubs (${greenery?.reason ?? 'load failed'})`);
        return scenery;
      }
      return {
        ...scenery,
        instance: () => { const root = scenery.instance(); root.add(greenery.instance()); return root; },
        release: () => { scenery.release(); greenery.release(); },
      };
    },
  };
}

interface Host { mesh: THREE.InstancedMesh; localInverse: THREE.Matrix4; anchors: Float32Array; yaw: Float32Array; size: Float32Array }
interface Variant { mesh: THREE.InstancedMesh; local: THREE.Matrix4 }

/** `source` is the attached GLB tree, `layer` the model layer's instanced scan pieces (createCoastModelLayer). */
export function createCoastGreenery(source: THREE.Object3D, layer: readonly THREE.InstancedMesh[]) {
  for (const mesh of layer) for (const material of [mesh.material].flat()) if (GRASSY.includes(material.name)) greenTops(material);
  source.updateMatrixWorld(true);
  const rootInverse = source.matrixWorld.clone().invert();
  const meshOf = (name: string): THREE.Mesh | undefined => {
    let found: THREE.Mesh | undefined;
    source.getObjectByName(name)?.traverse(object => { if (!found && (object as THREE.Mesh).isMesh) found = object as THREE.Mesh; });
    return found;
  };
  const shrubs = GREENERY_SHRUBS.map(meshOf).filter(mesh => !!mesh);
  for (const shrub of shrubs) for (const material of [shrub.material].flat()) (material as THREE.MeshStandardMaterial).color?.setRGB(...SHRUB_TINT);
  const hosts: Host[] = [];
  const point = new THREE.Vector3();
  if (shrubs.length) for (const mesh of layer) {
    const scan = HOSTS.includes(mesh.name) ? meshOf(mesh.name) : undefined;
    if (!scan) continue;
    const local = rootInverse.clone().multiply(scan.matrixWorld), position = scan.geometry.getAttribute('position');
    const positions = new Float32Array(position.count * 3); // piece space: the dequantization and node transform applied
    for (let i = 0; i < position.count; i++) point.fromBufferAttribute(position, i).applyMatrix4(local).toArray(positions, i * 3);
    const index = scan.geometry.index?.array ?? Array.from({ length: position.count }, (_, i) => i);
    const rng = seededRng(0, 'coast-greenery-v1:' + mesh.name), anchors = greeneryAnchors(positions, index, PER_HOST, rng, { minHeight: MIN_HEIGHT });
    const yaw = Float32Array.from({ length: anchors.length / 3 }, () => rng() * Math.PI * 2);
    const size = Float32Array.from(yaw, () => SIZE[0] + rng() * (SIZE[1] - SIZE[0]));
    hosts.push({ mesh, localInverse: local.invert(), anchors, yaw, size });
  }
  const capacity = hosts.reduce((sum, host) => sum + host.mesh.instanceMatrix.count * Math.ceil(host.size.length / shrubs.length), 0);
  const variants: Variant[] = shrubs.map((shrub, k) => {
    const mesh = new THREE.InstancedMesh(shrub.geometry, shrub.material, capacity);
    mesh.name = GREENERY_SHRUBS.find(name => source.getObjectByName(name) === shrub || source.getObjectByName(name)?.getObjectById(shrub.id)) ?? `shrub:${k}`;
    mesh.frustumCulled = false; // instances span the whole window, like the scan pools
    mesh.count = 0;
    return { mesh, local: rootInverse.clone().multiply(shrub.matrixWorld) };
  });
  const meshes = variants.map(variant => variant.mesh);
  const cliff = new THREE.Matrix4(), transform = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), up = THREE.Object3D.DEFAULT_UP;
  let seen = -1;
  return {
    meshes,
    /** Re-roots the shrubs on the cliffs' current instances; a no-op until the model layer rewrites them. */
    sync(): void {
      const version = hosts.reduce((sum, host) => sum + host.mesh.instanceMatrix.version, 0);
      if (version === seen) return;
      seen = version;
      const used = variants.map(() => 0);
      for (const host of hosts) for (let i = 0; i < host.mesh.count; i++) {
        host.mesh.getMatrixAt(i, cliff);
        cliff.multiply(host.localInverse); // the piece's placement: translation, yaw, uniform scale
        const scale = cliff.getMaxScaleOnAxis();
        for (let j = 0; j < host.size.length; j++) {
          const k = j % variants.length, variant = variants[k]!, size = scale ** GROWTH * host.size[j]!;
          point.fromArray(host.anchors, j * 3).applyMatrix4(cliff);
          point.y -= SINK * size; // rooted a little into the slope, never floating
          transform.compose(point, q.setFromAxisAngle(up, host.yaw[j]!), s.setScalar(size)).multiply(variant.local);
          variant.mesh.setMatrixAt(used[k]!++, transform);
        }
      }
      variants.forEach(({ mesh }, k) => { mesh.count = used[k]!; mesh.instanceMatrix.needsUpdate = true; });
    },
    /** Frees the instance buffers only; geometry and materials belong to the model cache handle. */
    dispose(): void { for (const mesh of meshes) { mesh.removeFromParent(); mesh.dispose(); } },
  };
}
export type CoastGreenery = ReturnType<typeof createCoastGreenery>;
