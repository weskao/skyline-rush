import * as THREE from 'three';
import { RACE_TRACKS } from './game.js';
import { trackPoint, trackFrame } from './track-paths.js';

export const WORLD_THEMES = {
  taipei: { top:'#1b3158', horizon:'#e0a58d', fog:'#776d84', rock:'#657e83', road:'#303640', ground:'#536374', rail:'#ffcf88', sun:'#ffe0a5', warmth:.8, buildings:'#c08d75', accent:'#ecb76b', landmarks:[
    {kind:'office',at:1250,side:1},{kind:'gate',at:2850,side:-1},{kind:'temple',at:4380,side:1}] },
  tokyo: { top:'#10092d', horizon:'#5b2484', fog:'#48265f', rock:'#25204f', road:'#172035', ground:'#16204a', rail:'#fa50a7', sun:'#eab5ff', warmth:.2, buildings:'#292c60',accent:'#ff49bd',landmarks:[
    {kind:'crossing',at:1200,side:1},{kind:'tower',at:3100,side:-1},{kind:'railway',at:5150,side:1}] },
  alpine: { top:'#254968', horizon:'#aec6c1', fog:'#8c9ca0', rock:'#536d6c', road:'#35444a', ground:'#547e78', rail:'#c6e5a8', sun:'#fff7ce', warmth:.5, buildings:'#6f7978',accent:'#f9dba2',landmarks:[
    {kind:'tunnel',at:1680,side:1},{kind:'railway',at:3800,side:-1},{kind:'mountain',at:6200,side:1}] },
  coastal: { top:'#193c68', horizon:'#ffc49a', fog:'#89a9b5', rock:'#697785', road:'#243949', ground:'#1d687d', rail:'#7aebf3', sun:'#ffe2a6', warmth:1, buildings:'#d6b99b',accent:'#ffeeaa',landmarks:[
    {kind:'lighthouse',at:1350,side:1},{kind:'bridge',at:3300,side:-1},{kind:'arch',at:4900,side:1}] },
  cosmic: { top:'#030a24', horizon:'#492788', fog:'#202457', rock:'#18204d', road:'#141b32', ground:'#11183e', rail:'#00e5ff', sun:'#c6a9ff', warmth:0, buildings:'#263371',accent:'#ad73ff',landmarks:[
    {kind:'planet',at:1550,side:1},{kind:'gate',at:4200,side:-1},{kind:'planet',at:6650,side:1}] },
};
const NS = 140, STEP = 12, HALF = 12;
const cube = new THREE.BoxGeometry(1,1,1);
const vec = v => new THREE.Vector3(...v);
function landmark(kind,mat,accent){
  const root=new THREE.Group();
  const add=(geometry,material,x,y,z,sx=1,sy=1,sz=1)=>{
    const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);root.add(mesh);return mesh;
  };
  const box=(x,y,z,w,h,d,m=mat)=>add(cube,m,x,y,z,w,h,d);
  if(kind==='office'){
    box(0,11,0,44,22,16);box(0,25,0,12,9,14);box(0,31,0,7,7,7,accent);
    for(const x of [-17,-10,10,17])box(x,10,8.1,3,10,.6,accent);
  }else if(kind==='gate'||kind==='arch'){
    for(const x of [-11,11])box(x,9,0,5,18,7);
    box(0,20,0,31,7,9,accent);box(0,25,0,34,2,10);
  }else if(kind==='temple'){
    box(0,7,0,28,14,18);box(0,17,0,35,4,23,accent);box(0,21,0,30,4,18);
    for(const x of [-10,0,10])box(x,2,9.3,2,8,1,accent);
  }else if(kind==='tower'){
    box(0,45,0,5,90,5,accent);
    for(const y of [22,44,65])box(0,y,0,25-y*.18,2,25-y*.18);
    add(new THREE.ConeGeometry(6,21,8),accent,0,100,0);
  }else if(kind==='railway'){
    for(const x of [-15,0,15])box(x,8,0,3,16,4);
    box(0,17,0,48,2,7,accent);box(0,20,0,28,6,6);
  }else if(kind==='tunnel'){
    for(const x of [-14,14])box(x,9,0,8,18,16);
    box(0,19,0,39,8,17);box(0,24,0,46,7,19,accent);
  }else if(kind==='mountain'){
    add(new THREE.ConeGeometry(70,150,6),mat,0,50,0);add(new THREE.ConeGeometry(23,34,6),accent,0,138,0);
  }else if(kind==='lighthouse'){
    add(new THREE.CylinderGeometry(4,8,48,12),mat,0,24,0);
    box(0,49,0,13,6,13,accent);add(new THREE.ConeGeometry(9,9,8),accent,0,57,0);
  }else if(kind==='bridge'){
    for(const x of [-19,19])box(x,25,0,4,50,4);
    box(0,48,0,44,3,5,accent);
  }else if(kind==='planet'){
    add(new THREE.SphereGeometry(34,24,14),mat,0,54,0);
    const ring=add(new THREE.TorusGeometry(48,1.5,8,60),accent,0,54,0);
    ring.rotation.x=.4;
  }else if(kind==='crossing'){
    for(let i=-3;i<=3;i++)box(i*6,1,0,3,0.1,17,accent);
    for(const x of [-25,25])box(x,20,0,12,40,19);
  }
  return root;
}
export function createWorldTourScene(scene){
 const group=new THREE.Group();scene.add(group);group.visible=false;
 const pos=new Float32Array((NS+1)*6), idx=new Uint16Array(NS*6);
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.BufferAttribute(pos,3).setUsage(THREE.DynamicDrawUsage));
 geometry.setIndex(new THREE.BufferAttribute(idx,1).setUsage(THREE.DynamicDrawUsage));
 const roadMaterial=new THREE.MeshStandardMaterial({color:'#293447',metalness:.22,roughness:.56,side:THREE.DoubleSide});
 const road=new THREE.Mesh(geometry,roadMaterial);road.frustumCulled=false;group.add(road);
 const railMaterial=new THREE.MeshBasicMaterial({color:'#8ceaf6'});
 const buildingMaterial=new THREE.MeshStandardMaterial({color:'#37476a',roughness:.72});
 const roadMarks=new THREE.InstancedMesh(cube,railMaterial,NS*2);
 const buildings=new THREE.InstancedMesh(cube,buildingMaterial,80);
 const matrix=new THREE.Matrix4(),basis=new THREE.Matrix4(),dummy=new THREE.Object3D();
 for(const obj of [roadMarks,buildings]){obj.instanceMatrix.setUsage(THREE.DynamicDrawUsage);obj.frustumCulled=false;group.add(obj);}
 const landmarks=new THREE.Group();group.add(landmarks);
 let current=null;
 const landmarkRoots=new Map();
 const toLocal=(id,s,lateral,rise,origin)=>{
   const point=trackPoint(id,s),home=trackPoint(id,origin),frame=trackFrame(id,s);
   return [point.x-home.x+frame.right[0]*lateral+frame.up[0]*rise,point.y-home.y+frame.right[1]*lateral+frame.up[1]*rise,point.z-home.z+frame.right[2]*lateral+frame.up[2]*rise];
 };
 function pose(mesh,i,id,s,lateral,rise,sizes,origin){
  const frame=trackFrame(id,s);basis.makeBasis(vec(frame.right),vec(frame.up),vec(frame.forward).negate());
  dummy.position.fromArray(toLocal(id,s,lateral,rise,origin));
  dummy.quaternion.setFromRotationMatrix(basis);
  dummy.scale.set(...sizes);dummy.updateMatrix();
  mesh.setMatrixAt(i,dummy.matrix);
 }
 function configure(id){
  if(id===current)return;
  landmarks.clear();current=id;
  const theme=WORLD_THEMES[id];
  roadMaterial.color.set(theme.road);railMaterial.color.set(theme.rail);buildingMaterial.color.set(theme.buildings);
  for(const entry of theme.landmarks){
   const m=new THREE.MeshStandardMaterial({color:theme.buildings,roughness:.6});
   const a=new THREE.MeshBasicMaterial({color:theme.accent});
   const root=landmark(entry.kind,m,a);root.userData.entry=entry;landmarks.add(root);
   landmarkRoots.set(entry.kind+entry.at,root);
  }
 }
 return {
  update(id,distance,quality,sections=[]){
   configure(id);group.visible=true;
   const start=Math.max(0,Math.floor((distance-120)/STEP)*STEP);
   for(let i=0;i<=NS;i++){
    const s=Math.min(RACE_TRACKS[id].length,start+i*STEP),frame=trackFrame(id,s);
    for(let side=0;side<2;side++)pos.set(toLocal(id,s,side?HALF:-HALF,0,distance), (2*i+side)*3);
    if(i===NS)continue;
    const k=6*i,a=2*i,gap=sections.some(v=>v.type==='gap'&&s+STEP/2>=v.from&&s+STEP/2<v.to);
    idx.set(gap?[a,a,a,a,a,a]:[a,a+1,a+2,a+1,a+3,a+2],k);
    for(let side=0;side<2;side++)pose(roadMarks,i*2+side,id,s+STEP/2,side?11.4:-11.4,.08,[.16,.13,STEP],distance);
   }
   geometry.attributes.position.needsUpdate=true;geometry.index.needsUpdate=true;
   roadMarks.instanceMatrix.needsUpdate=true;
   buildings.count=quality==='low'?32:80;
   for(let i=0;i<80;i++){
    const s=Math.max(0,Math.min(RACE_TRACKS[id].length,Math.floor(distance/80)*80+(Math.floor(i/2)-4)*80));
    const side=i%2?1:-1,offset=34+(i*11%40),height=15+(i*17%48);
    pose(buildings,i,id,s,side*offset,height/2-3,[16+i%4*5,height,18+i%3*8],distance);
   }
   buildings.instanceMatrix.needsUpdate=true;
   for(const child of landmarks.children){
    const entry=child.userData.entry;
    const local=toLocal(id,entry.at,entry.side*80,0,distance);
    child.position.set(...local);
    child.visible=Math.abs(entry.at-distance)<1350;
    child.rotation.y=0;
   }
  },
  hide(){group.visible=false;},
  dispose(){group.removeFromParent();geometry.dispose();roadMaterial.dispose();railMaterial.dispose();buildingMaterial.dispose();roadMarks.dispose();buildings.dispose();}
 };
}
