import * as THREE from 'three';
import {
  VOLCANIC_CROWN_EDGES, sampleVolcanicRoute, volcanicEdgeLength,
  volcanicWorldPosition, type RouteFrame,
} from './volcanic-crown.ts';
import { VOLCANIC_OBSTACLES, volcanicObstaclePose } from './volcanic-crown-obstacles.ts';

// A map-specific streaming chunk. No renderer/camera/animation loop is created here.
export const VOLCANIC_CHUNK_METERS = 240;
type Quality = 'low' | 'medium' | 'high';
type Chunk = {
  group: THREE.Group;
  update(timeSeconds:number, reducedMotion?:boolean): void;
  dispose(): void;
};
const LAVA_VERTEX = `
varying vec2 vUv;
void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
`;
const LAVA_FRAGMENT = `
uniform float uTime;
varying vec2 vUv;
void main(){
  float flow=sin(vUv.y*19.0-uTime*.78+sin(vUv.x*11.0)*.5);
  float cracks=sin(vUv.x*41.0+vUv.y*13.0+uTime*.2);
  float hot=smoothstep(-.5,.85,flow*.7+cracks*.32);
  vec3 rock=vec3(.10,.016,.011),magma=vec3(1.0,.28,.025);
  gl_FragColor=vec4(mix(rock,magma,.45+.55*hot),1.0);
}
`;
const material=(color:string)=>new THREE.MeshStandardMaterial({color,roughness:.94,side:THREE.DoubleSide,flatShading:true});
const to3=(p:readonly number[])=>new THREE.Vector3(p[0],p[1],p[2]);
function ribbon(edgeId:string, from:number, to:number, halfWidth:number,
  rows:number, center=0, drop=0):THREE.BufferGeometry {
  const vertices:number[]=[],indices:number[]=[];
  for(let i=0;i<=rows;i++){
    const s=from+(to-from)*i/rows;
    const f=sampleVolcanicRoute(edgeId,s);
    for(const sign of [-1,1]){
      const lat=center+sign*halfWidth;
      vertices.push(...f.point.map((v,k)=>v+f.right[k]*lat-f.up[k]*drop));
    }
    if(i<rows){const v=i*2;indices.push(v,v+1,v+2,v+1,v+3,v+2);}
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geo.setIndex(indices);geo.computeVertexNormals();
  return geo;
}
function shoulder(edgeId:string,from:number,to:number,rows:number,side:number,width:number):THREE.BufferGeometry {
  const positions:number[]=[],indices:number[]=[];
  for(let i=0;i<=rows;i++){
    const frame=sampleVolcanicRoute(edgeId,from+(to-from)*i/rows);
    for(const [lateral,drop] of [[width/2+2,1],[width/2+50,19]]){
      positions.push(...frame.point.map((v,k)=>v+frame.right[k]*side*lateral-frame.up[k]*drop));
    }
    if(i<rows){const v=i*2;indices.push(v,v+1,v+2,v+1,v+3,v+2);}
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  g.setIndex(indices);g.computeVertexNormals();
  return g;
}
function addCrater(group:THREE.Group,frame:RouteFrame,rock:THREE.Material,lava:THREE.Material):void {
  const center=to3(frame.point).addScaledVector(to3(frame.right),190).addScaledVector(to3(frame.up),-42);
  const profile=[[210,0],[160,20],[120,70],[78,116],[50,103],[37,62],[25,40]]
    .map(([r,y])=>new THREE.Vector2(r,y));
  const crater=new THREE.Mesh(new THREE.LatheGeometry(profile,56),rock);
  crater.name='volcano-crater';crater.position.copy(center);group.add(crater);
  const molten=new THREE.Mesh(new THREE.CircleGeometry(42,48),lava);
  molten.name='crater-lava';molten.rotation.x=-Math.PI/2;
  molten.position.copy(center).add(new THREE.Vector3(0,43,0));
  group.add(molten);
  const light=new THREE.PointLight('#ff5b24',3.2,310,2);
  light.position.copy(center).add(new THREE.Vector3(0,85,0));light.name='crater-glow';
  group.add(light);
  const plume=new THREE.Group();plume.name='eruption-plume';plume.position.copy(center);
  const hot=new THREE.Mesh(new THREE.ConeGeometry(18,88,10),
    new THREE.MeshBasicMaterial({color:'#ff6926',transparent:true,opacity:.32,depthWrite:false}));
  hot.position.y=145;plume.add(hot);
  group.add(plume);
}
function addArch(group:THREE.Group,frame:RouteFrame,rock:THREE.Material):void {
  const arch=new THREE.Group();arch.name='basalt-arch';
  arch.position.copy(to3(frame.point)).addScaledVector(to3(frame.up),15);
  const forward=to3(frame.forward).negate();
  arch.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(to3(frame.right),to3(frame.up),forward));
  const ring=new THREE.Mesh(new THREE.TorusGeometry(32,6,8,40,Math.PI),rock);
  ring.name='arch-span';ring.position.y=9;arch.add(ring);
  for(const side of [-1,1]){
    const leg=new THREE.Mesh(new THREE.CylinderGeometry(6,9,27,8),rock);
    leg.position.set(side*32,-10,0);arch.add(leg);
  }
  group.add(arch);
}
function addFlightGuide(group:THREE.Group,edgeId:string,from:number,to:number,
  rock:THREE.Material):void {
  const len=volcanicEdgeLength(edgeId);
  const isStart=from===0,isEnd=to===len;
  const points=Array.from({length:12},(_,i)=>to3(sampleVolcanicRoute(edgeId,from+(to-from)*i/11).point));
  const path=new THREE.CatmullRomCurve3(points);
  const guide=new THREE.Mesh(new THREE.TubeGeometry(path,32,.25,5,false),
    new THREE.MeshBasicMaterial({color:'#69cbd4',transparent:true,opacity:.55,depthWrite:false}));
  guide.name='aerial-route-guide';group.add(guide);
  for(const [name,s] of [['launch-pad',0],['landing-pad',len]] as const){
    if((s===0&&!isStart)||(s===len&&!isEnd))continue;
    const f=sampleVolcanicRoute(edgeId,s);
    // Permanent, static landing cues remain legible at Low and Reduced Motion.
    const pad=new THREE.Mesh(new THREE.BoxGeometry(26,.9,32),
      new THREE.MeshStandardMaterial({
        color:'#343d40',roughness:.8,emissive:'#319cb0',emissiveIntensity:.35,
      }));
    pad.position.copy(to3(f.point)).addScaledVector(to3(f.up),-.5);
    pad.quaternion.setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(to3(f.right),to3(f.up),to3(f.forward).negate()));
    pad.name=name;
    for(const side of [-1,1]){
      const marker=new THREE.Mesh(new THREE.BoxGeometry(1.1,.12,28),
        new THREE.MeshBasicMaterial({color:'#8ff4ff',toneMapped:false}));
      marker.name='pad-edge-light';marker.position.set(side*11.6,.48,0);
      pad.add(marker);
    }
    group.add(pad);
  }
}
export function createVolcanicCrownChunk(
  edgeId:string,chunkIndex:number,quality:Quality='medium',reducedMotion=false,
):Chunk {
  const edge=VOLCANIC_CROWN_EDGES.find(item=>item.id===edgeId);
  if(!edge)throw new Error('Unknown Volcanic Crown edge: '+edgeId);
  if(!Number.isInteger(chunkIndex)||chunkIndex<0||chunkIndex*VOLCANIC_CHUNK_METERS>=volcanicEdgeLength(edgeId))
    throw new RangeError('Invalid Volcanic Crown chunk index');
  const from=chunkIndex*VOLCANIC_CHUNK_METERS;
  const to=Math.min(volcanicEdgeLength(edgeId),from+VOLCANIC_CHUNK_METERS);
  const baseRows=quality==='high'?28:quality==='medium'?20:12;
  // Tight crater-rim turns need closer mesh/physics correspondence even at Low.
  // Only these two authored hairpins pay the extra vertices.
  const rows=(edgeId==='ground-2'||edgeId==='ground-6')
    ?Math.max(24,baseRows):baseRows;
  const group=new THREE.Group();group.name=`volcanic-${edgeId}-${chunkIndex}`;
  let disposed=false;
  const roadMat=new THREE.MeshStandardMaterial({
    color:'#29252a',roughness:.54,metalness:.19,side:THREE.DoubleSide,flatShading:true,
  }),rock=material('#1b1b20');
  const lavaMat=new THREE.ShaderMaterial({
    uniforms:{uTime:{value:0}},vertexShader:LAVA_VERTEX,fragmentShader:LAVA_FRAGMENT,
    side:THREE.DoubleSide,
  });
  if(edge.mode!=='flight'){
    const road=new THREE.Mesh(ribbon(edgeId,from,to,edge.width/2,rows),roadMat);
    road.name='physical-road';group.add(road);
    const bed=new THREE.Mesh(ribbon(edgeId,from,to,edge.width/2+9,rows,0,1.7),rock);
    bed.name='basalt-road-foundation';group.add(bed);
    for(const side of [-1,1]){
      const terrain=new THREE.Mesh(shoulder(edgeId,from,to,rows,side,edge.width),rock);
      terrain.name=side===1?'right-terrain':'left-terrain';group.add(terrain);
    }
    const lava=new THREE.Mesh(ribbon(edgeId,from,to,11,rows,edge.width/2+47,18),lavaMat);
    lava.name='lava-river';group.add(lava);
  }else addFlightGuide(group,edgeId,from,to,rock);
  if(edgeId==='ground-4'&&from<=volcanicEdgeLength(edgeId)*.75&&to>volcanicEdgeLength(edgeId)*.75)
    addCrater(group,sampleVolcanicRoute(edgeId,volcanicEdgeLength(edgeId)*.75),rock,lavaMat);
  if(edgeId==='ground-7'&&from<=volcanicEdgeLength(edgeId)*.55&&to>volcanicEdgeLength(edgeId)*.55)
    addArch(group,sampleVolcanicRoute(edgeId,volcanicEdgeLength(edgeId)*.55),rock);
  // Ash/heat are off the road decision corridor. Quality changes their
  // cost only, never whether a collision mesh is drawn.
  const ashCount=quality==='high'?32:quality==='medium'?12:0;
  const ash=ashCount?new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(
      Array.from({length:ashCount},(_,i)=>{
        const f=sampleVolcanicRoute(edgeId,from+(to-from)*(i+.5)/ashCount);
        return [f.point[0]+f.right[0]*(edge.width/2+62),f.point[1]+28+i%9,
          f.point[2]+f.right[2]*(edge.width/2+62)];
      }).flat(),3)),
    new THREE.PointsMaterial({color:'#998a81',size:quality==='high'?12:8,
      transparent:true,opacity:.23,depthWrite:false})):null;
  if(ash){ash.name='volcanic-ash';group.add(ash);}
  const shimmer=quality==='low'?null:new THREE.Mesh(
    new THREE.PlaneGeometry(14,8),new THREE.MeshBasicMaterial({
      color:'#ee7c38',transparent:true,opacity:.08,depthWrite:false,side:THREE.DoubleSide,
    }));
  if(shimmer){
    const f=sampleVolcanicRoute(edgeId,(from+to)/2);
    shimmer.position.copy(to3(f.point)).addScaledVector(to3(f.right),edge.width/2+25)
      .addScaledVector(to3(f.up),5);
    shimmer.name='heat-shimmer';group.add(shimmer);
  }
  const lavaLight=edge.mode==='flight'?null:new THREE.PointLight('#ff743b',quality==='low'?.8:1.5,95,2);
  if(lavaLight){
    const f=sampleVolcanicRoute(edgeId,(from+to)/2);
    lavaLight.position.copy(to3(f.point)).addScaledVector(to3(f.right),edge.width/2+23)
      .addScaledVector(to3(f.up),6);
    lavaLight.name='lava-reflection-light';group.add(lavaLight);
  }
  const obstacleMeshes: {item:typeof VOLCANIC_OBSTACLES[number],mesh:THREE.Mesh}[]=[];
  for(const item of VOLCANIC_OBSTACLES.filter(o=>o.edgeId===edgeId&&o.s>=from&&o.s<to)){
    const geometry=item.kind==='boulder'||item.kind==='rockfall'
      ?new THREE.IcosahedronGeometry(item.radius,2)
      :new THREE.CylinderGeometry(item.radius,item.radius,.24,24);
    const solid=item.kind==='fissure'||item.kind==='vent'?lavaMat:rock;
    const mesh=new THREE.Mesh(geometry,solid);
    const frame=sampleVolcanicRoute(edgeId,item.s);
    if(item.kind==='fissure'||item.kind==='vent')
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),to3(frame.up));
    mesh.name=item.id;group.add(mesh);obstacleMeshes.push({item,mesh});
    if(item.kind==='rockfall'||item.kind==='vent'){
      const warning=new THREE.Mesh(new THREE.RingGeometry(item.radius+1,item.radius+2,28),
        new THREE.MeshBasicMaterial({color:'#ffaa39',side:THREE.DoubleSide}));
      warning.name=`${item.id}-warning`;
      warning.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),to3(frame.up));
      warning.position.copy(to3(volcanicWorldPosition(edgeId,item.s,item.lateral)))
        .addScaledVector(to3(frame.up),.12);
      group.add(warning);
    }
  }
  const sparks=quality==='low'?null:new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(
      Array.from({length:quality==='high'?36:14},(_,i)=>{
        const f=sampleVolcanicRoute(edgeId,from+(to-from)*(i%13)/13);
        return [f.point[0]+f.right[0]*(edge.width/2+20),f.point[1]+1+(i%8),f.point[2]+f.right[2]*(edge.width/2+20)];
      }).flat(),3)),
    new THREE.PointsMaterial({color:'#ff9040',size:2.5,transparent:true,opacity:.65,depthWrite:false}));
  if(sparks){sparks.name='volcanic-embers';group.add(sparks);}
  const warnings=group.children.filter(c=>c.name.endsWith('-warning'));
  function update(timeSeconds:number,reduce=reducedMotion):void {
    if(disposed)return;
    const time=Number.isFinite(timeSeconds)?timeSeconds:0;
    lavaMat.uniforms.uTime.value=reduce?0:time;
    if(sparks)sparks.visible=!reduce;
    if(ash){ash.visible=!reduce;ash.position.y=reduce?0:Math.sin(time*.2)*1.3;}
    if(shimmer){shimmer.visible=!reduce;shimmer.scale.y=reduce?1:1+Math.sin(time*.7)*.09;}
    if(lavaLight)lavaLight.intensity=reduce?1.1:1.1+Math.sin(time*.9)*.22;
    const plume=group.getObjectByName('eruption-plume');
    if(plume)plume.scale.y=reduce?1:1+Math.sin(time*.47)*.12;
    for(const {item,mesh} of obstacleMeshes){
      const pose=volcanicObstaclePose(item,time);
      mesh.position.copy(to3(pose.point));
      mesh.visible=item.kind!=='rockfall'||pose.active;
      const warning=warnings.find(c=>c.name===item.id+'-warning');
      if(warning)warning.visible=pose.warning;
    }
  }
  function dispose():void {
    if(disposed)return;
    disposed=true;group.parent?.remove(group);
    const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();
    group.traverse(o=>{
      if(o instanceof THREE.Mesh||o instanceof THREE.Points){
        geometries.add(o.geometry);
        const list=Array.isArray(o.material)?o.material:[o.material];
        list.forEach(m=>materials.add(m));
      }
    });
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());group.clear();
  }
  update(0);
  return {group,update,dispose};
}
