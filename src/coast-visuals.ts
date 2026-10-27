import * as THREE from 'three';
import { seededRng } from './rng.ts';
import type { VfxQuality } from './vfx-settings.ts';

// Shared Coast palette, separate from the five authored World Tour routes.
export const COAST_PALETTE = Object.freeze({
  top:'#214967', horizon:'#c1a18b', fog:'#829cac',
  rock:'#516878', road:'#303b43', ground:'#173e53',
  rail:'#a3ccd0', sun:'#ffe0b5', warmth:0.35,
});

const DENSITY: Record<VfxQuality, number> = {low:12,medium:20,high:32};
const STEP = 60, TOTAL = DENSITY.high;
type ScenicMesh = THREE.InstancedMesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;

export function createCoastScenery(scene: THREE.Scene, roadCenter: (distance:number)=>number) {
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
  const distances = new Float64Array(TOTAL);
  let initialized = false, previousTier:VfxQuality|null=null;
  let origin = 0, previousDistance = 0, previousSeed: number | undefined;
  const transform = new THREE.Matrix4();
  const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  function place(index:number,distance:number,seed?:number) {
    const shape = seed === undefined ? index : Math.floor(seededRng(seed, 'endless-coast-v1:' + distance)() * 100000);
    const localDistance = distance - origin;
    const side=index%2===0?-1:1;
    const x=roadCenter(distance)+side*(42+(shape*13%39));
    // All scenery stays beyond the driving corridor and its existing railings.
    p.set(x,-2.8,-localDistance);
    s.set(7+(shape%4)*2,6+(shape%3)*1.6,9+(shape%3)*2);
    q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP,shape*.71);
    transform.compose(p,q,s);rock.setMatrixAt(index,transform);
    p.set(x+side*11,6.2,-localDistance-8);
    s.set(3.9+(shape%3)*.55,10+(shape%3)*1.5,3.9+(shape%3)*.55);
    transform.compose(p,q,s);tree.setMatrixAt(index,transform);
    p.y=1.3;s.set(.9,9,.9);
    transform.compose(p,q,s);trunks.setMatrixAt(index,transform);
  }
  return {
    group,
    update(distance:number,quality:VfxQuality,seed?:number) {
      if (!Number.isFinite(distance)) return;
      const count=DENSITY[quality];
      const nextOrigin = seed === undefined ? 0 : Math.floor(distance / 500) * 500;
      const rebuild = !initialized || seed !== previousSeed || seed !== undefined && (nextOrigin !== origin || distance < previousDistance || quality !== previousTier);
      origin = nextOrigin;
      const first=(Math.floor(distance/STEP)-2)*STEP;
      let moved=false;
      const capacity = seed === undefined ? TOTAL : count;
      for(let i=0;i<capacity;i++) {
        if(rebuild) distances[i]=first+i*STEP;
        // Recycle only expired slots. Mesh matrices stay stable across ordinary frames.
        if(distances[i]<first) distances[i]+=Math.ceil((first-distances[i])/(capacity*STEP))*capacity*STEP;
        if(rebuild||distances[i]!== (group.userData['distance'+i] as number)) {
          place(i,distances[i],seed);group.userData['distance'+i]=distances[i];moved=true;
        }
      }
      initialized=true;
      for(const mesh of meshes) {
        mesh.count=count;
        if(moved||previousTier!==quality)mesh.instanceMatrix.needsUpdate=true;
      }
      previousTier=quality;
      group.position.set(-roadCenter(distance),0,distance-origin);
      previousDistance=distance;previousSeed=seed;
    },
    hide() {group.visible=false;},
    show() {group.visible=true;},
    dispose() {
      scene.remove(group);
      for(const mesh of meshes) {mesh.geometry.dispose();mesh.material.dispose();}
    },
  };
}
