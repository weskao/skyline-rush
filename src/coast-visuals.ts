import * as THREE from 'three';
import type { VfxQuality } from './vfx-settings.ts';

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
  const transform = new THREE.Matrix4();
  const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  function place(index:number,distance:number) {
    const side=index%2===0?-1:1;
    const x=roadCenter(distance)+side*(42+(index*13%39));
    // All scenery stays beyond the driving corridor and its existing railings.
    p.set(x,-2.8,-distance);
    s.set(7+(index%4)*2,6+(index%3)*1.6,9+(index%3)*2);
    q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP,index*.71);
    transform.compose(p,q,s);rock.setMatrixAt(index,transform);
    p.set(x+side*11,6.2,-distance-8);
    s.set(3.9+(index%3)*.55,10+(index%3)*1.5,3.9+(index%3)*.55);
    transform.compose(p,q,s);tree.setMatrixAt(index,transform);
    p.y=1.3;s.set(.9,9,.9);
    transform.compose(p,q,s);trunks.setMatrixAt(index,transform);
  }
  return {
    group,
    update(distance:number,quality:VfxQuality) {
      if (!Number.isFinite(distance)) return;
      const count=DENSITY[quality];
      const first=(Math.floor(distance/STEP)-2)*STEP;
      let moved=false;
      for(let i=0;i<TOTAL;i++) {
        if(!initialized) distances[i]=first+i*STEP;
        // Recycle only expired slots. Mesh matrices stay stable across ordinary frames.
        while(distances[i]<first)distances[i]+=TOTAL*STEP;
        if(!initialized||distances[i]!== (group.userData['distance'+i] as number)) {
          place(i,distances[i]);group.userData['distance'+i]=distances[i];moved=true;
        }
      }
      initialized=true;
      for(const mesh of meshes) {
        mesh.count=count;
        if(moved||previousTier!==quality)mesh.instanceMatrix.needsUpdate=true;
      }
      previousTier=quality;
      group.position.set(-roadCenter(distance),0,distance);
    },
    hide() {group.visible=false;},
    show() {group.visible=true;},
    dispose() {
      scene.remove(group);
      for(const mesh of meshes) {mesh.geometry.dispose();mesh.material.dispose();}
    },
  };
}
