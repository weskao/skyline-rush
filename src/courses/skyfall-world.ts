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
function makeRoad(edgeId: string, start: number, end: number): THREE.BufferGeometry {
  const e = SKYFALL_COURSE.edges.find(item => item.id === edgeId)!;
  const marks = [start, end, ...e.gaps.flatMap(g => [g.from,g.to])
    .filter(s => s > start && s < end)];
  for (let s = Math.ceil(start / 3) * 3; s < end; s += 3) {
    if (s > start) marks.push(s);
  }
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

function addFloatingIslands(group: THREE.Group, quality: Tier,
  edgeId: string, start: number, end: number): void {
  if (!SKYFALL_GROUND_PATH.some(id => id === edgeId)) return;
  const samples: { point: THREE.Vector3; index: number }[] = [];
  const spacing = quality === 'low' ? 930 : quality === 'medium' ? 670 : 490;
  const len = getSkyfallEdgeLength(edgeId);
  let index = 0;
  for (let s = 100; s < len - 80; s += spacing) {
    if (s >= start && s < end) {
      const f = sampleSkyfallRoad(edgeId, s);
      samples.push({ point: framePoint(f, ((index % 3) - 1) * 95, -22), index });
    }
    index++;
  }
  if (!samples.length) return;
  const rock = new THREE.InstancedMesh(new THREE.ConeGeometry(1,1.7,11,3),
    new THREE.MeshStandardMaterial({color:0x73818d,roughness:.96,flatShading:true}),samples.length);
  const grass = new THREE.InstancedMesh(new THREE.CylinderGeometry(1,1.04,.065,13),
    new THREE.MeshStandardMaterial({color:0x70a797,roughness:.98,flatShading:true}),samples.length);
  const m=new THREE.Object3D();
  samples.forEach(({point,index},i)=>{
    const radius=quality==='low'?120:145+(index%5)*25;
    const surfaceY = point.y + 12; // road remains ~10 m above the suspended terrace
    const hangingHeight = 80 + (index % 3) * 30;
    m.position.copy(point); m.position.y = surfaceY - hangingHeight * .85;
    m.rotation.set(Math.PI,0,0); m.scale.set(radius,hangingHeight,radius);
    m.updateMatrix();rock.setMatrixAt(i,m.matrix);
    m.position.copy(point);m.position.y=surfaceY;
    m.rotation.set(0,0,0);m.scale.set(radius*.94,1,radius*.94);
    m.updateMatrix();grass.setMatrixAt(i,m.matrix);
  });
  rock.name='Skyfall playable hanging island meshes';
  grass.name='Skyfall playable island terraces';
  rock.instanceMatrix.needsUpdate=grass.instanceMatrix.needsUpdate=true;
  group.add(rock,grass);
}

function addLandmarks(group: THREE.Group): THREE.Mesh[] {
  const waterfalls: THREE.Mesh[] = [];
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
    waterfall.userData.baseY = waterfall.position.y;
    waterfalls.push(waterfall);
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
  // Visual only: the shared CourseGraph engine will own signed gate crossing.
  const checkpointMaterial = new THREE.MeshBasicMaterial({color:0x98f0ff});
  const finishMaterial = new THREE.MeshBasicMaterial({color:0xffdb91});
  for (const nodeId of SKYFALL_COURSE.checkpoints) {
    const arriving = SKYFALL_COURSE.edges.find(edge => edge.to === nodeId && edge.mode === 'ground')!;
    const end = sampleSkyfallRoad(arriving.id, getSkyfallEdgeLength(arriving.id));
    const marker = new THREE.Group();
    marker.name = `Skyfall checkpoint marker ${nodeId}`;
    marker.position.set(end.point.x, end.point.y + 25, end.point.z);
    marker.rotation.y = Math.atan2(end.forward[0], -end.forward[2]);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(22, 1.8, 8, 32),
      nodeId === 'finish' ? finishMaterial : checkpointMaterial);
    ring.name = `Skyfall checkpoint ring ${nodeId}`;
    marker.add(ring);
    group.add(marker);
  }
  return waterfalls;
}

/** Chunk-owned guide strips start on solid landing pavement, never above flight gaps. */
function addLandingGuides(group: THREE.Group, edgeId: string,
  start: number, end: number): void {
  const edge = SKYFALL_COURSE.edges.find(item => item.id === edgeId);
  if (edge?.mode !== 'air') return;
  const vertices: number[] = [];
  const length = getSkyfallEdgeLength(edgeId);
  for (const gap of edge.gaps) for (const offset of [10, 26, 42]) {
    const nearS = gap.to + offset;
    if (nearS < start || nearS >= end) continue;
    const farS = Math.min(nearS + 3, end, length);
    if (farS - nearS < .05 || !hasSkyfallRoadContact(edgeId, nearS)
      || !hasSkyfallRoadContact(edgeId, farS)) continue;
    const a = sampleSkyfallRoad(edgeId, nearS), b = sampleSkyfallRoad(edgeId, farS);
    const l0 = framePoint(a, -a.width * .36, .12);
    const r0 = framePoint(a, a.width * .36, .12);
    const l1 = framePoint(b, -b.width * .36, .12);
    const r1 = framePoint(b, b.width * .36, .12);
    vertices.push(...l0.toArray(), ...r0.toArray(), ...l1.toArray(),
      ...r0.toArray(), ...r1.toArray(), ...l1.toArray());
  }
  if (!vertices.length) return;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  const material = new THREE.MeshBasicMaterial({
    color: 0x9befff, transparent: true, opacity: .84, depthWrite: false,
    side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1,
  });
  const guides = new THREE.Mesh(geometry, material);
  guides.name = `Skyfall ${edgeId} landing approach markings`;
  group.add(guides);
}

function addRealObstacles(group: THREE.Group, edgeId: string,
  start: number, end: number): void {
  const obstacles = SKYFALL_OBSTACLES.filter(o =>
    o.edgeId === edgeId && o.distance >= start && o.distance < end);
  if (!obstacles.length) return;
  const stone=new THREE.MeshStandardMaterial({color:0x596f83,roughness:.93,flatShading:true});
  const warning=new THREE.MeshStandardMaterial({color:0xe4b46a,roughness:.7});
  for(const o of obstacles) {
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
const CHUNK_METERS = 420;
type Focus = { edgeId: string; localS: number };

export function createSkyfallWorld(scene: THREE.Scene, quality: Tier = 'medium') {
  const group = new THREE.Group();
  group.name = 'Skyfall playable world';
  scene.add(group);
  const ground = new THREE.MeshStandardMaterial({
    color: 0xc1c7c1, roughness: .96, side: THREE.DoubleSide,
  });
  const air = new THREE.MeshStandardMaterial({
    color: 0x86c4cf, roughness: .87, side: THREE.DoubleSide,
  });
  const chunks = new Map<string, THREE.Group>();
  const waterfalls = addLandmarks(group);
  const clouds = addCloudOcean(group, quality);
  let disposed = false;

  function unload(key: string): void {
    const chunk = chunks.get(key);
    if (!chunk) return;
    chunk.traverse(obj => {
      if (!(obj instanceof THREE.Mesh)) return;
      obj.geometry.dispose();
      for (const material of Array.isArray(obj.material) ? obj.material : [obj.material]) {
        if (material !== ground && material !== air) material.dispose();
      }
    });
    group.remove(chunk);
    chunk.clear();
    chunks.delete(key);
  }

  /** Pass camera and all rival positions; off-screen edges release their GPU data. */
  function setFocus(foci: readonly Focus[]): void {
    if (disposed) return;
    const wanted = new Set<string>();
    const include = (edgeId: string, index: number): void => {
      const count = Math.ceil(getSkyfallEdgeLength(edgeId) / CHUNK_METERS);
      if (index >= 0 && index < count) wanted.add(`${edgeId}:${index}`);
    };
    for (const focus of foci) {
      const edge = SKYFALL_COURSE.edges.find(e => e.id === focus.edgeId);
      if (!edge || !Number.isFinite(focus.localS)) continue;
      const length = getSkyfallEdgeLength(edge.id);
      const localS = Math.max(0, Math.min(length, focus.localS));
      const index = Math.min(Math.ceil(length / CHUNK_METERS) - 1,
        Math.floor(localS / CHUNK_METERS));
      for (const step of [-1, 0, 1]) include(edge.id, index + step);
      if (localS < CHUNK_METERS) {
        for (const previous of SKYFALL_COURSE.edges.filter(e => e.to === edge.from)) {
          include(previous.id, Math.ceil(getSkyfallEdgeLength(previous.id) / CHUNK_METERS) - 1);
        }
      }
      if (length - localS < CHUNK_METERS) {
        for (const next of SKYFALL_COURSE.edges.filter(e => e.from === edge.to)) {
          include(next.id, 0);
        }
      }
    }
    for (const key of chunks.keys()) if (!wanted.has(key)) unload(key);
    for (const key of wanted) {
      if (chunks.has(key)) continue;
      const separator = key.lastIndexOf(':');
      const edgeId = key.slice(0, separator);
      const index = Number(key.slice(separator + 1));
      const edge = SKYFALL_COURSE.edges.find(e => e.id === edgeId)!;
      const start = index * CHUNK_METERS;
      const end = Math.min(start + CHUNK_METERS, getSkyfallEdgeLength(edgeId));
      const chunk = new THREE.Group();
      chunk.name = `Skyfall streamed chunk ${key}`;
      const road = new THREE.Mesh(makeRoad(edgeId, start, end),
        edge.mode === 'air' ? air : ground);
      road.name = `Skyfall ${edgeId} banked playable road`;
      chunk.add(road);
      addFloatingIslands(chunk, quality, edgeId, start, end);
      addRealObstacles(chunk, edgeId, start, end);
      addLandingGuides(chunk, edgeId, start, end);
      group.add(chunk);
      chunks.set(key, chunk);
    }
  }

  setFocus([{ edgeId: 'approach', localS: 0 }]);
  return {
    group,
    setFocus,
    update(seconds: number, reducedMotion = false) {
      if (disposed) return;
      const time = Number.isFinite(seconds) ? seconds : 0;
      const amplitude = reducedMotion || quality === 'low' ? 0
        : quality === 'medium' ? 3 : 5;
      clouds.position.x = reducedMotion ? 0 : Math.sin(time * .035) * 18;
      waterfalls.forEach((waterfall, i) => {
        waterfall.position.y = Number(waterfall.userData.baseY)
          + Math.sin(time * .7 + i) * amplitude;
      });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const key of Array.from(chunks.keys())) unload(key);
      group.removeFromParent(); // the shared CourseGraph host reparents this world under its single scene root
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      group.traverse(obj => {
        if (obj instanceof THREE.Mesh) {
          geometries.add(obj.geometry);
          for (const material of Array.isArray(obj.material) ? obj.material : [obj.material]) {
            materials.add(material);
          }
        }
      });
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
      ground.dispose();
      air.dispose();
      group.clear();
    },
  };
}
