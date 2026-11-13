import * as THREE from 'three';
import type { ClassicRoad } from './classic-road-routes.ts';
import { seededRng } from './rng.ts';
import type { VfxQuality } from './vfx-settings.ts';
import { createCoastBoatLayer, type CoastBoatLayer } from './coast-boats.ts';
import { coastChunkWindow, coastFarWindow, createCoastModelLayer, type CoastModelLayer, type ShoreSink } from './coast-scenery-glb.ts';
import { coastGullWindow, createCoastSeagulls } from './coast-seagulls.ts';
import { createCoastGreenery, type CoastGreenery } from './coast-greenery.ts';

// Shared Coast palette, separate from the five authored World Tour routes.
export const COAST_PALETTE = Object.freeze({
  top:'#1c3f63', horizon:'#d09a8a', fog:'#8a9bac',
  rock:'#516878', road:'#303b43', ground:'#173e53',
  rail:'#a3ccd0', sun:'#ffe0b5', warmth:0.5,
});

// In-race lighting; between the Phase 2 dimming and the original 2.3 / 1.7 / 1.12 / .42.
export const COAST_LIGHTING = Object.freeze({ sun:1.8, ambient:1.45, exposure:1.07, bloom:.3 });

const DENSITY: Record<VfxQuality, number> = {low:12,medium:20,high:32};
const STEP = 60, TOTAL = DENSITY.high;
type ScenicMesh = THREE.InstancedMesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;

export function createCoastScenery(scene: THREE.Scene) {
  const group = new THREE.Group();
  group.name = 'Coast scenic details';
  scene.add(group);
  const rock = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0),
    new THREE.MeshStandardMaterial({color:'#71848a',roughness:.92,metalness:0,flatShading:true}),TOTAL);
  const tree = new THREE.InstancedMesh(new THREE.ConeGeometry(1,1,6),
    new THREE.MeshStandardMaterial({color:'#557566',roughness:.91,metalness:0,flatShading:true}),TOTAL);
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(.12,.2,1,5),
    new THREE.MeshStandardMaterial({color:'#806956',roughness:.94,metalness:0}),TOTAL);
  rock.name='Coast shoreline rocks';
  tree.name='Coast wind-shaped trees';
  trunks.name='Coast tree trunks';
  const meshes:ScenicMesh[]=[rock,tree,trunks];
  for (const mesh of meshes) {
    mesh.frustumCulled=false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(mesh);
  }
  let model: CoastModelLayer | null = null, greenery: CoastGreenery | null = null;
  let gulls: ReturnType<typeof createCoastSeagulls> | null = null; // fly with the scan coast only
  let boats: { layer: CoastBoatLayer; clock: { value: number } } | null = null;
  const dropModel = () => { greenery?.dispose(); greenery = null; gulls?.dispose(); gulls = null; model?.dispose(); model = null; };
  const distances = new Float64Array(TOTAL);
  let previousRoute: ClassicRoad | undefined, previousTier:VfxQuality|null=null;
  let origin = 0, previousDistance = 0, previousSeed: number | undefined;
  const transform = new THREE.Matrix4();
  const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  function place(route:ClassicRoad,index:number,distance:number,seed?:number) {
    const shape = seed === undefined ? index : Math.floor(seededRng(seed, 'endless-coast-v1:' + distance)() * 100000);
    const side=index%2===0?-1:1;
    const offset=side*(42+(shape*13%39));
    const [x,z]=route.point(distance,offset);
    // All scenery stays beyond the driving corridor and its existing railings.
    p.set(x,-2.8,z+origin);
    s.set(7+(shape%4)*2,6+(shape%3)*1.6,9+(shape%3)*2);
    q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP,shape*.71);
    transform.compose(p,q,s);rock.setMatrixAt(index,transform);
    const [treeX,treeZ]=route.point(distance+8,offset+side*11);
    p.set(treeX,6.2,treeZ+origin);
    s.set(3.9+(shape%3)*.55,10+(shape%3)*1.5,3.9+(shape%3)*.55);
    transform.compose(p,q,s);tree.setMatrixAt(index,transform);
    p.y=1.3;s.set(.9,9,.9);
    transform.compose(p,q,s);trunks.setMatrixAt(index,transform);
  }
  return {
    group,
    update(route:ClassicRoad,distance:number,quality:VfxQuality,seed?:number,time=0) {
      if (!Number.isFinite(distance)) return;
      const count=DENSITY[quality];
      const nextOrigin = seed === undefined ? 0 : -route.point(Math.floor(distance / 500) * 500)[1];
      const rebuild = route !== previousRoute || seed !== previousSeed || seed !== undefined && (nextOrigin !== origin || distance < previousDistance || quality !== previousTier);
      origin = nextOrigin;
      const first=(Math.floor(distance/STEP)-2)*STEP;
      let moved=false;
      const capacity = seed === undefined ? TOTAL : count;
      for(let i=0;i<capacity;i++) {
        if(rebuild) distances[i]=first+i*STEP;
        // Recycle only expired slots. Mesh matrices stay stable across ordinary frames.
        if(distances[i]<first) distances[i]+=Math.ceil((first-distances[i])/(capacity*STEP))*capacity*STEP;
        if(rebuild||distances[i]!== (group.userData['distance'+i] as number)) {
          place(route,i,distances[i],seed);group.userData['distance'+i]=distances[i];moved=true;
        }
      }
      previousRoute=route;
      const window = model ? coastChunkWindow(distance, quality) : null;
      if (model && window) model.place(route, window, origin, seed, coastFarWindow(distance, quality));
      if (window) greenery?.sync(); // shrubs follow the cliffs the layer just placed
      for (const mesh of [...model?.meshes ?? [], ...greenery?.meshes ?? []]) mesh.visible = !!window;
      const flocks = gulls ? coastGullWindow(distance, quality) : null;
      if (gulls) gulls.mesh.visible = !!flocks;
      if (gulls && flocks) { gulls.place(route, flocks, origin, seed); gulls.setTime(time); }
      boats?.layer.update(route, distance, quality, origin, seed, boats.clock.value);
      for(const mesh of meshes) {
        mesh.visible = !window; // Medium+ with the GLB: the scans replace the procedural rocks and trees
        mesh.count=count;
        if(moved||previousTier!==quality)mesh.instanceMatrix.needsUpdate=true;
      }
      previousTier=quality;
      const [x,z]=route.point(distance);
      group.position.set(-x,0,-z-origin);
      previousDistance=distance;previousSeed=seed;
    },
    /** Medium+ draws this parsed coast-scenery.glb instead of the procedural rocks/trees; the caller keeps ownership. */
    attachModel(source:THREE.Object3D, shore?:ShoreSink) {
      dropModel();
      model = createCoastModelLayer(source, shore);
      greenery = createCoastGreenery(source, model.meshes);
      for (const mesh of [...model.meshes, ...greenery.meshes]) { mesh.visible = false; group.add(mesh); }
      gulls ??= createCoastSeagulls();
      gulls.mesh.visible = false; group.add(gulls.mesh);
    },
    detachModel() {
      dropModel();
      for (const mesh of meshes) mesh.visible = true;
    },
    /** Medium+ sails this parsed coast-boats.glb on the open water, on `clock` (seconds); the caller keeps ownership. */
    attachBoats(source:THREE.Object3D, clock:{ value: number }) {
      boats?.layer.dispose();
      boats = { layer: createCoastBoatLayer(source), clock };
      for (const mesh of boats.layer.meshes) { mesh.visible = false; group.add(mesh); }
    },
    detachBoats() { boats?.layer.dispose(); boats = null; },
    hide() {group.visible=false;},
    show() {group.visible=true;},
    dispose() {
      dropModel();
      boats?.layer.dispose(); boats = null;
      scene.remove(group);
      for(const mesh of meshes) {mesh.geometry.dispose();mesh.material.dispose();}
    },
  };
}
