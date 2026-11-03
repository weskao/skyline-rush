import * as THREE from 'three';
import {
  SKYFALL_COURSE, SKYFALL_GROUND_PATH, SKYFALL_OBSTACLES,
  getSkyfallEdgeLength, hasSkyfallRoadContact, sampleSkyfallRoad,
  type SkyfallFrame,
} from './skyfall-archipelago.ts';

type Tier = 'low' | 'medium' | 'high';
const framePoint = (f: SkyfallFrame, lateral = 0, height = 0) => new THREE.Vector3(
  f.point.x + f.right[0] * lateral + f.up[0] * height,
  f.point.y + f.right[1] * lateral + f.up[1] * height,
  f.point.z + f.right[2] * lateral + f.up[2] * height,
);

/** Real, banked road triangles, with physically matching optional flight gaps. */
function makeRoad(edgeId: string): THREE.BufferGeometry {
  const e = SKYFALL_COURSE.edges.find(item => item.id === edgeId)!;
  const length = getSkyfallEdgeLength(edgeId);
  const marks = [0, length, ...e.gaps.flatMap(g => [g.from,g.to])];
  for (let s = 24; s < length; s += 24) marks.push(s);
  marks.sort((a,b) => a-b);
  const xyz: number[] = [];
  for (let i=1;i<marks.length;i++) {
    const start = marks[i-1], end = marks[i];
    if (end-start < 1e-4 || !hasSkyfallRoadContact(edgeId, (start+end)/2)) continue;
    const a = sampleSkyfallRoad(edgeId,start), b = sampleSkyfallRoad(edgeId,end);
    const l0=framePoint(a,-a.width/2), r0=framePoint(a,a.width/2);
    const l1=framePoint(b,-b.width/2), r1=framePoint(b,b.width/2);
    xyz.push(...l0.toArray(),...r0.toArray(),...l1.toArray(),
      ...r0.toArray(),...r1.toArray(),...l1.toArray());
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(xyz,3));
  geometry.computeVertexNormals();
  return geometry;
}

function addFloatingIslands(group: THREE.Group, quality: Tier): void {
  const samples: THREE.Vector3[] = [];
  const spacing = quality === 'low' ? 930 : quality === 'medium' ? 670 : 490;
  for (const id of SKYFALL_GROUND_PATH) {
    const len=getSkyfallEdgeLength(id);
    for(let s=100;s<len-80;s+=spacing) {
      const f=sampleSkyfallRoad(id,s);
      samples.push(framePoint(f, ((samples.length%3)-1)*95,-22));
    }
  }
  const rock = new THREE.InstancedMesh(new THREE.ConeGeometry(1,1.7,11,3),
    new THREE.MeshStandardMaterial({color:0x73818d,roughness:.96,flatShading:true}),samples.length);
  const grass = new THREE.InstancedMesh(new THREE.CylinderGeometry(1,1.04,.065,13),
    new THREE.MeshStandardMaterial({color:0x70a797,roughness:.98,flatShading:true}),samples.length);
  const m=new THREE.Object3D();
  samples.forEach((point,i)=>{
    const radius=quality==='low'?120:145+(i%5)*25;
    m.position.copy(point); m.position.y-=25+(i%4)*8;
    m.rotation.set(Math.PI,0,0); m.scale.set(radius,80+(i%3)*30,radius);
    m.updateMatrix();rock.setMatrixAt(i,m.matrix);
    m.position.copy(point);m.position.y+=46+(i%3)*15;
    m.rotation.set(0,0,0);m.scale.set(radius*.94,1,radius*.94);
    m.updateMatrix();grass.setMatrixAt(i,m.matrix);
  });
  rock.name='Skyfall playable hanging island meshes';
  grass.name='Skyfall playable island terraces';
  rock.instanceMatrix.needsUpdate=grass.instanceMatrix.needsUpdate=true;
  group.add(rock,grass);
}

function addLandmarks(group: THREE.Group): void {
  const stone=new THREE.MeshStandardMaterial({color:0x9aadaf,roughness:1,flatShading:true});
  const glow=new THREE.MeshBasicMaterial({color:0xa7ecff,transparent:true,opacity:.48,depthWrite:false});
  for(const [id,ratio,radius] of [
    ['midway-one',.62,105],['midway-two',.48,84],['descent',.26,69],
  ] as const) {
    const f=sampleSkyfallRoad(id,getSkyfallEdgeLength(id)*ratio);
    const ring=new THREE.Group();ring.name='Skyfall giant stone sky ring';
    ring.position.copy(framePoint(f,145,radius+20));
    ring.rotation.y=Math.atan2(f.forward[0],-f.forward[2]);
    ring.add(new THREE.Mesh(new THREE.TorusGeometry(radius,8,9,44),stone));
    const rim=new THREE.Mesh(new THREE.TorusGeometry(radius+.7,1.1,4,44),glow);
    rim.position.z=7;ring.add(rim);
    group.add(ring);
  }
  for(const [id,ratio] of [['approach',.8],['b-ground',.8],['descent',.64]] as const) {
    const f=sampleSkyfallRoad(id,getSkyfallEdgeLength(id)*ratio);
    const waterfall=new THREE.Mesh(new THREE.PlaneGeometry(31,205),
      new THREE.MeshBasicMaterial({color:0x91ddff,transparent:true,opacity:.52,side:THREE.DoubleSide,depthWrite:false}));
    waterfall.name='Skyfall hanging waterfall';
    waterfall.position.copy(framePoint(f,125,-95));
    group.add(waterfall);
  }
  const beamMat=new THREE.MeshBasicMaterial({color:0xe3f6ff,transparent:true,opacity:.10,
    depthWrite:false,side:THREE.DoubleSide});
  for (let i=0;i<6;i++) {
    const f=sampleSkyfallRoad('midway-two',Math.min(getSkyfallEdgeLength('midway-two'),250+i*340));
    const beam=new THREE.Mesh(new THREE.CylinderGeometry(11,78,460,9,1,true),beamMat);
    beam.name='Skyfall volumetric sky beam';
    beam.position.copy(framePoint(f,200+i%2*140,220));group.add(beam);
  }
}

function addRealObstacles(group: THREE.Group): void {
  const stone=new THREE.MeshStandardMaterial({color:0x596f83,roughness:.93,flatShading:true});
  const warning=new THREE.MeshStandardMaterial({color:0xe4b46a,roughness:.7});
  for(const o of SKYFALL_OBSTACLES) {
    const f=sampleSkyfallRoad(o.edgeId,o.distance);
    const geo=o.kind==='column'?new THREE.CylinderGeometry(o.radius*.7,o.radius,12,7):
      new THREE.DodecahedronGeometry(o.radius,0);
    const obstacle=new THREE.Mesh(geo,o.kind==='crumbling-platform'?warning:stone);
    obstacle.name=`Skyfall solid obstacle ${o.id}`;
    obstacle.position.copy(framePoint(f,o.lateral,o.kind==='column'?6:2));
    obstacle.userData.skyfallObstacleId=o.id;
    group.add(obstacle);
  }
}

function addCloudOcean(group: THREE.Group, quality: Tier): THREE.InstancedMesh {
  const count=quality==='low'?28:quality==='medium'?64:96;
  const cloud=new THREE.InstancedMesh(new THREE.SphereGeometry(1,8,6),
    new THREE.MeshBasicMaterial({color:0xf5fbff,transparent:true,opacity:.27,depthWrite:false}),count);
  cloud.name='Skyfall playable cloud ocean';
  const dummy=new THREE.Object3D();
  for(let i=0;i<count;i++){
    const f=sampleSkyfallRoad(SKYFALL_GROUND_PATH[i%SKYFALL_GROUND_PATH.length],
      getSkyfallEdgeLength(SKYFALL_GROUND_PATH[i%SKYFALL_GROUND_PATH.length]) * ((i*47%101)/101));
    dummy.position.copy(framePoint(f, 500*Math.sin(i*21.5),-130-(i%6)*18));
    dummy.scale.set(125+(i%5)*31,29+(i%4)*10,100+(i%8)*17);
    dummy.updateMatrix();cloud.setMatrixAt(i,dummy.matrix);
  }
  cloud.instanceMatrix.needsUpdate=true;
  group.add(cloud);
  return cloud;
}

/** Scene-only assembly. Never creates a renderer, starts a loop, or owns race physics. */
export function createSkyfallWorld(scene: THREE.Scene, quality: Tier = 'medium') {
  const group=new THREE.Group();group.name='Skyfall playable world';scene.add(group);
  const ground=new THREE.MeshStandardMaterial({color:0xc1c7c1,roughness:.96,side:THREE.DoubleSide});
  const air=new THREE.MeshStandardMaterial({color:0x86c4cf,roughness:.87,side:THREE.DoubleSide});
  for(const e of SKYFALL_COURSE.edges){
    const road=new THREE.Mesh(makeRoad(e.id),e.mode==='air'?air:ground);
    road.name=`Skyfall ${e.id} banked playable road`;group.add(road);
  }
  addFloatingIslands(group,quality);
  addLandmarks(group);
  addRealObstacles(group);
  const clouds=addCloudOcean(group,quality);
  let disposed=false;
  return {
    group,
    update(seconds: number, reducedMotion = false) {
      if(disposed)return;
      clouds.position.x=reducedMotion?0:Math.sin((Number.isFinite(seconds)?seconds:0)*.035)*18;
    },
    dispose() {
      if(disposed)return;
      disposed=true;scene.remove(group);
      const geometries=new Set<THREE.BufferGeometry>();
      const materials=new Set<THREE.Material>();
      group.traverse(o=>{
        if(o instanceof THREE.Mesh || o instanceof THREE.InstancedMesh){
          geometries.add(o.geometry);
          for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);
        }
      });
      geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
      group.clear();
    },
  };
}