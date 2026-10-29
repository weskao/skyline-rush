import * as THREE from 'three';
import { RACE_TRACKS, ROAD_LIMIT } from './game.js';
import { trackPoint, trackFrame } from './track-paths.ts';
import { roadRibbon } from './geometry.ts';
import { makeLandmark } from './world-tour-landmarks.js';
import { createSceneryKit, sceneryPlan, SCENERY_KINDS, SCENERY_CHUNK_METRES, ROAD_CHARACTER, terrainHeight, propParts, clearOfRoad, DETAIL_KINDS, detailSetPlan } from './world-tour-scenery.js';
import { createTunnelKit } from './world-tour-tunnels.js';
import { batchStaticChunk, poolStaticChunks, releaseStaticPool } from './world-tour-batching.ts';

// One scenery system for five distinct destinations. Locations are authored as
// race-distance + roadside offsets; meshes follow the *real* 3D driving path.
export const WORLD_THEMES = {
  taipei: {
    top:'#405970',horizon:'#91a4a4',fog:'#74868b',rock:'#657e83',road:'#373e41',ground:'#536374',rail:'#929f9a',sun:'#c3c9c5',warmth:.08,
    buildings:'#ad6e59',accent:'#f3c47b',prop:'city',landmarks:[
      {kind:'office',at:1750,side:1,offset:94,scale:1.7,yaw:.6,plaza:520},
      {kind:'gate',at:2630,side:1,offset:71,scale:1.12},
      {kind:'temple',at:4480,side:-1,offset:75,scale:1.25},
    ],
  },
  tokyo: {
    top:'#121a31',horizon:'#38415e',fog:'#32364d',rock:'#252e44',road:'#202b3b',ground:'#232c40',rail:'#838a98',sun:'#a0a7bc',warmth:0,
    buildings:'#29305c',accent:'#ff49bd',prop:'neon',landmarks:[
      {kind:'crossing',at:1200,side:-1,offset:66,scale:1.2},
      {kind:'tower',at:3300,side:-1,offset:110,scale:1.25,plaza:500},
      {kind:'railway',at:5180,side:-1,offset:78,scale:1.05},
    ],
  },
  alpine: {
    top:'#4c6876',horizon:'#95aca6',fog:'#74877f',rock:'#53665a',road:'#414640',ground:'#547367',rail:'#a7b0a3',sun:'#a1acaa',warmth:0,
    buildings:'#526c65',accent:'#f9dba2',prop:'mountain',landmarks:[
      {kind:'tunnel',at:1760,side:1,offset:80,scale:1.3},
      {kind:'railway',at:3850,side:-1,offset:110,scale:1.25},
      {kind:'mountain',at:6180,side:-1,offset:120,scale:1.4,plaza:560},
    ],
  },
  coastal: {
    top:'#577b90',horizon:'#a6b7b1',fog:'#899ea6',rock:'#697785',road:'#454b49',ground:'#557985',rail:'#9eaca3',sun:'#c2ccc7',warmth:0,
    buildings:'#d6b99b',accent:'#ffeeaa',prop:'coast',landmarks:[
      {kind:'lighthouse',at:1180,side:-1,offset:100,scale:1.35,plaza:400},
      {kind:'bridge',at:3160,side:-1,offset:130,scale:1.2},
      {kind:'arch',at:4870,side:1,offset:125,scale:1.6},
    ],
  },
  cosmic: {
    top:'#10182b',horizon:'#34374e',fog:'#212c47',rock:'#293148',road:'#22293c',ground:'#212941',rail:'#55798c',sun:'#778da1',warmth:0,
    buildings:'#263371',accent:'#ad73ff',prop:'space',landmarks:[
      {kind:'planet',at:1610,side:1,offset:290,scale:2.1},
      {kind:'cosmic-gate',at:4100,side:-1,offset:96,scale:1.5,plaza:420},
      {kind:'planet',at:6740,side:-1,offset:310,scale:1.9},
    ],
  },
};

const ROWS=138, STEP=12, HALF=12;
const cube=new THREE.BoxGeometry(1,1,1);
const cone=new THREE.ConeGeometry(1,1,7);
const rock=new THREE.IcosahedronGeometry(1,0);
const vec=v=>new THREE.Vector3(...v);
const UNIT_Y=new THREE.Vector3(0,1,0),ZER0=new THREE.Vector3();

function seeded(i){const n=Math.sin(i*127.1+78.233)*43758.5453;return n-Math.floor(n);}
const clamped=(id,s)=>Math.max(0,Math.min(RACE_TRACKS[id].length,s));

// An authored plaza keeps the approach sightline to a hero landmark open: a
// roadside item drops out only if, seen from some road point of the approach,
// it sits nearer than the landmark and inside its angular width (ground plane).
// Everything else on both kerbs stays, so the street does not go empty.
export function blocksLandmark(id,l,item){
  if(!l.plaza||item.distance<l.at-l.plaza||item.distance>l.at+60)return false;
  const at=(s,lateral)=>{const f=trackFrame(id,s);return [f.point.x+f.right[0]*lateral,f.point.z+f.right[2]*lateral];};
  const [lx,lz]=at(l.at,l.side*(l.offset||80)),[ix,iz]=at(item.distance,item.side*item.offset);
  const radius=(l.radius||30)*(l.scale||1);
  for(let s=l.at-l.plaza;s<item.distance;s+=30){
    const p=trackPoint(id,s),ax=lx-p.x,az=lz-p.z,bx=ix-p.x,bz=iz-p.z;
    const toLandmark=Math.hypot(ax,az),toItem=Math.hypot(bx,bz);
    if(toItem>=toLandmark)continue;
    const angle=Math.abs(Math.atan2(ax*bz-az*bx,ax*bx+az*bz));
    if(angle<Math.atan(radius/toLandmark)+Math.atan(14/toItem))return true;
  }
  return false;
}

// Props that would block a landmark move instead of vanishing, so the approach
// keeps its original density: one plot farther out, the other kerb, or further
// out still. Only a prop with no clear slot stays put, shrunk to street scale.
// shortcut: clear slots are checked against unblocked neighbours and this
// chunk's moved props, not props moved in adjacent chunks.
const landmarkBlocker=id=>item=>WORLD_THEMES[id].landmarks.some(l=>blocksLandmark(id,l,item));
export function landmarkSafePlan(id,chunk,low=false){
  const blocks=landmarkBlocker(id);
  const items=sceneryPlan(id,chunk,low);
  if(!items.some(blocks))return items;
  const placed=[chunk-1,chunk,chunk+1].flatMap(c=>sceneryPlan(id,c,low)).filter(i=>!blocks(i));
  const clear=c=>!blocks(c)&&placed.every(p=>p.side!==c.side||
    Math.abs(p.distance-c.distance)>=9||Math.abs(p.offset-c.offset)>=14);
  return items.map(item=>{
    if(!blocks(item))return item;
    const across={...item,side:-item.side},out=o=>({...item,offset:item.offset+o});
    const moved=[out(24),across,out(40),{...across,distance:item.distance+13},out(60)].map(clearOfRoad).find(clear);
    if(moved)placed.push(moved);
    return moved||{...item,size:item.size*.45};
  });
}

// Prop parts within reach of the car (lateral, along-road distance and height
// relative to the road), so scenery that reaches into the road is solid.
const REACH=ROAD_LIMIT+.85;
function solidParts(id,item){
  const rise=terrainHeight(id,item.distance,item.side,item.offset),parts=[];
  for(const b of propParts(item.kind)){
    const left=item.side*item.offset+b.min.x*item.size,right=item.side*item.offset+b.max.x*item.size;
    if(right>-REACH&&left<REACH)parts.push({from:item.distance-b.max.z*item.size,to:item.distance-b.min.z*item.size,
      left,right,bottom:rise+b.min.y*item.size,top:rise+b.max.y*item.size,kind:item.kind});
  }
  return parts;
}
// LOD drops decorative props, never obstacles that are solid in the road.
export function detailPlan(id,chunk,quality=false){
  const items=landmarkSafePlan(id,chunk),slots=quality===true||quality==='low'?2:quality==='medium'?3:4;
  return slots===4?items:items.filter(item=>item.slot<slots||solidParts(id,item).length);
}
// Every solid part on a World Tour road, sorted by distance; static per track, so cached for good.
const obstacleCache=new Map();
export function roadObstacles(id){
  if(!WORLD_THEMES[id])return [];
  if(!obstacleCache.has(id)){
    const parts=[];
    for(let c=0;c*SCENERY_CHUNK_METRES<=RACE_TRACKS[id].length;c++)
      for(const item of landmarkSafePlan(id,c))parts.push(...solidParts(id,item));
    obstacleCache.set(id,parts.sort((a,b)=>a.from-b.from));
  }
  return obstacleCache.get(id);
}

export function createWorldTourScene(scene){
  const group=new THREE.Group();group.name='World Tour authored scenery';group.visible=false;scene.add(group);
  const geometry=roadRibbon(ROWS);
  const [positions,normals,indices]=[geometry.attributes.position.array,geometry.attributes.normal.array,geometry.index.array];
  const roadMat=new THREE.MeshStandardMaterial({color:'#253446',metalness:.035,roughness:.93,side:THREE.DoubleSide});
  const road=new THREE.Mesh(geometry,roadMat);road.frustumCulled=false;group.add(road);
  const glowMat=new THREE.MeshBasicMaterial({color:'#899a9d',toneMapped:true});
  const architectureMat=new THREE.MeshStandardMaterial({color:'#546582',roughness:.65,metalness:.25});
  const windowMat=new THREE.MeshBasicMaterial({color:'#b4dff9'});
  const terrainMat=new THREE.MeshStandardMaterial({color:'#4b6f77',roughness:.98,flatShading:true});
  const stripeMat=new THREE.MeshBasicMaterial({color:'#d2cbb6',toneMapped:true});
  const shoulderMat=new THREE.MeshStandardMaterial({color:'#727c79',roughness:.97,metalness:0});
  const roadEdges=new THREE.InstancedMesh(cube,glowMat,ROWS*2);
  const shoulders=new THREE.InstancedMesh(cube,shoulderMat,ROWS*2);
  const laneMarks=new THREE.InstancedMesh(cube,stripeMat,ROWS*3);
  const skyline=new THREE.InstancedMesh(cube,architectureMat,94);
  const windows=new THREE.InstancedMesh(cube,windowMat,94*3);
  const terrain=new THREE.InstancedMesh(cone,terrainMat,92);
  const asteroids=new THREE.InstancedMesh(rock,terrainMat,92);
  for(const mesh of [roadEdges,shoulders,laneMarks,skyline,windows,terrain,asteroids]){
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;group.add(mesh);
  }
  const water=new THREE.Mesh(new THREE.PlaneGeometry(4000,4000),new THREE.MeshStandardMaterial({
    color:'#376d7b',transparent:true,opacity:.75,metalness:.04,roughness:.86,depthWrite:false,
    side:THREE.DoubleSide,
  }));
  water.rotation.x=-Math.PI/2;group.add(water);
  const starPos=new Float32Array(1200*3);
  for(let i=0;i<1200;i++){
    starPos[i*3]=((seeded(i*31)-.5)*3000);
    starPos[i*3+1]=seeded(i*97)*1250-80;
    starPos[i*3+2]=-seeded(i*53)*2900;
  }
  const starGeo=new THREE.BufferGeometry();
  starGeo.setAttribute('position',new THREE.BufferAttribute(starPos,3));
  const stars=new THREE.Points(starGeo,new THREE.PointsMaterial({color:'#cbb5ff',size:2.2,sizeAttenuation:true,transparent:true,opacity:.9}));
  stars.frustumCulled=false;group.add(stars);

  const heroGroup=new THREE.Group();group.add(heroGroup);
  const sceneryLayer=new THREE.Group();sceneryLayer.name='Distance-anchored continuous scenery';group.add(sceneryLayer);
  const kit=createSceneryKit(),tunnelKit=createTunnelKit(kit),chunks=new Map();
  let sceneryTrack=null,sceneryDetail=null,rack=null,pooled=null;
  function releaseChunk(node){
    node.traverse(object=>{
      if(object.userData?.ownGeometry)object.geometry.dispose();
      // InstancedMesh owns its GPU instance attributes, not source materials
      // or authored shared geometry. Release those buffers on chunk eviction.
      if(object.isInstancedMesh && object.userData?.batchCount)object.dispose();
    });
    node.removeFromParent();
  }
  function clearChunks(){releaseStaticPool(pooled);pooled=null;for(const node of chunks.values())releaseChunk(node);chunks.clear();}
  function streamScenery(id,distance,quality,sections){
    let changed=false;
    const level=quality==='low'?'low':quality==='medium'?'medium':'high';
    const centerChunk=Math.floor(Math.max(0,distance)/SCENERY_CHUNK_METRES);
    if(sceneryTrack!==id||sceneryDetail!==level){
      clearChunks();sceneryTrack=id;sceneryDetail=level;
    }
    const [behind,ahead]=level==='high'?[3,10]:level==='medium'?[2,9]:[2,7];
    const start=Math.max(0,centerChunk-behind);
    const end=Math.min(Math.ceil(RACE_TRACKS[id].length/SCENERY_CHUNK_METRES),centerChunk+ahead);
    for(const [index,node] of chunks){
      if(index<start||index>end){releaseChunk(node);chunks.delete(index);changed=true;}
    }
    for(let index=start;index<=end;index++){
      if(chunks.has(index))continue;
      changed=true;
      const chunk=new THREE.Group();chunk.name='world-tour-'+id+'-chunk-'+index;chunk.userData.chunkIndex=index;
      for(const item of [...detailPlan(id,index,level),...detailSetPlan(id,index,level,landmarkBlocker(id))]){
        const prop=kit.build(id,item.kind,item.size);
        kit.place(prop,id,item.distance,item.side*item.offset,
          terrainHeight(id,item.distance,item.side,item.offset));
        chunk.add(prop);
      }
      const earth=kit.terrain(id,index,level==='low');
      if(earth)chunk.add(earth);
      chunk.add(tunnelKit.buildChunk(id,index,sections));
      // One-time static batching keeps every model/material, greatly reducing
      // draw calls while the level streams through the camera.
      const stats=batchStaticChunk(chunk);
      chunk.userData.batchStats=stats;
      sceneryLayer.add(chunk);chunks.set(index,chunk);
    }
    if(changed)pooled=poolStaticChunks(sceneryLayer,chunks.values(),pooled,2);
  }
  // Warm every streamed shader/variant before a new chunk appears mid-race.
  function shaderRack(id){
    const sample=new THREE.Group();sample.name='shader rack '+id;sample.visible=false;
    for(const kind of [...SCENERY_KINDS[id],...DETAIL_KINDS[id]])for(let i=0;i<3;i++)sample.add(kit.build(id,kind));
    const earth=kit.terrain(id,0);if(earth)sample.add(earth);
    sample.add(tunnelKit.buildChunk(id,0,['tunnel','tunnel','tunnel','boost-tunnel'].map(type=>({type,from:0,to:SCENERY_CHUNK_METRES}))));
    batchStaticChunk(sample);
    for(const kind of [...SCENERY_KINDS[id],...DETAIL_KINDS[id]])sample.add(kit.build(id,kind)); // plain variant, as in a chunk with under three copies
    return sample;
  }
  const boostGroup=new THREE.Group();boostGroup.name='Playable speed tunnel';group.add(boostGroup);
  const portalGeo=new THREE.TorusGeometry(13,0.36,8,48);
  const portalMat=new THREE.MeshBasicMaterial({color:'#7296a1',toneMapped:true});
  const portalSecondary=new THREE.MeshBasicMaterial({color:'#b1a080',toneMapped:true});
  const glassMat=new THREE.MeshStandardMaterial({color:'#2dddf3',emissive:'#0c5b77',
    metalness:.08,roughness:.7,transparent:true,opacity:.1,depthWrite:false,side:THREE.DoubleSide});
  const sideGlass=new THREE.InstancedMesh(cube,glassMat,32);
  const ceilingGlass=new THREE.InstancedMesh(cube,glassMat,16);
  sideGlass.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  ceilingGlass.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  for(const panel of [sideGlass,ceilingGlass]){panel.frustumCulled=false;boostGroup.add(panel);}
  const portals=Array.from({length:16},(_,i)=>{
    const root=new THREE.Group();root.name='Energy hoop '+i;
    const halo=new THREE.Mesh(portalGeo,i%3===0?portalSecondary:portalMat);
    halo.position.y=3.2;root.add(halo);
    const crown=new THREE.Mesh(cube,i%3===0?portalSecondary:portalMat);
    crown.position.set(0,17.25,0);crown.scale.set(10,.28,.36);root.add(crown);
    boostGroup.add(root);return root;
  });
  const arrowGroup=new THREE.Group();group.add(arrowGroup);
  const boostArrows=Array.from({length:18},()=>{
    const root=new THREE.Group();
    for(const side of [-1,1]){
      const slash=new THREE.Mesh(cube,portalMat);
      slash.position.set(side*2.6,.055,0);
      slash.scale.set(.35,.065,5.6);
      slash.rotation.y=side*.62;root.add(slash);
    }
    arrowGroup.add(root);return root;
  });
  const shibuyaGroup=new THREE.Group();group.add(shibuyaGroup);
  const crosswalk=Array.from({length:13},()=>{
    const mesh=new THREE.Mesh(cube,stripeMat);mesh.scale.set(22,.035,1.85);shibuyaGroup.add(mesh);return mesh;
  });

  const dummy=new THREE.Object3D(),basis=new THREE.Matrix4(),world=new THREE.Vector3();
  let active=null, heroMaterials=[],cachedOrigin=null,cachedQuality=null,homeId=null,homeOrigin=null,homePoint=null;
  // One home sample per rebuild origin; callers pass the frame they already hold (its point is the centreline at s).
  const local=(id,s,x=0,y=0,origin=0,f=trackFrame(id,clamped(id,s)),c=f.point)=>{
    if(homeId!==id||homeOrigin!==origin){homeId=id;homeOrigin=origin;homePoint=trackPoint(id,clamped(id,origin));}
    return [c.x-homePoint.x+f.right[0]*x+f.up[0]*y,c.y-homePoint.y+f.right[1]*x+f.up[1]*y,c.z-homePoint.z+f.right[2]*x+f.up[2]*y];
  };
  const pose=(target,id,s,x,y,origin)=>{
    const f=trackFrame(id,clamped(id,s));
    basis.makeBasis(vec(f.right),vec(f.up),vec(f.forward).negate());
    target.position.fromArray(local(id,s,x,y,origin,f));
    target.quaternion.setFromRotationMatrix(basis);
  };
  const instance=(mesh,index,id,s,x,y,size,origin)=>{
    pose(dummy,id,s,x,y,origin);dummy.scale.set(...size);dummy.updateMatrix();
    mesh.setMatrixAt(index,dummy.matrix);
  };
  const clearHeroes=()=>{
    for(const mat of heroMaterials)mat.dispose();
    heroMaterials=[];
    while(heroGroup.children.length)heroGroup.remove(heroGroup.children[0]);
  };
  function configure(id){
    if(id===active)return;
    clearHeroes();clearChunks();sceneryTrack=null;active=id;
    if(rack)releaseChunk(rack);rack=shaderRack(id);sceneryLayer.add(rack);
    cachedOrigin=null;cachedQuality=null; // theme switch must invalidate world geometry
    const theme=WORLD_THEMES[id];
    roadMat.color.set(ROAD_CHARACTER[id].pavement);
    roadMat.roughness=ROAD_CHARACTER[id].roughness;roadMat.metalness=ROAD_CHARACTER[id].metalness;
    glowMat.color.set(ROAD_CHARACTER[id].edge);
    stripeMat.color.set(ROAD_CHARACTER[id].lane);
    shoulderMat.color.set(ROAD_CHARACTER[id].shoulder);
    portalMat.color.set(id==='cosmic'?'#688b9a':id==='tokyo'?'#9e839c':'#9b9587');
    portalSecondary.color.set(id==='cosmic'?'#8b819f':'#aa9b83');
    glassMat.color.set(ROAD_CHARACTER[id].edge);
    architectureMat.color.set(theme.buildings);
    terrainMat.color.set(theme.rock);
    windowMat.color.set(theme.prop==='neon'?'#ff68be':theme.prop==='city'?'#ffdc9b':'#b7eaff');
    water.visible=theme.prop==='coast';
    stars.visible=theme.prop==='space';
    skyline.visible=windows.visible=false; // Retired looping cube skyline; authored chunks replace it.
    terrain.visible=false; // Retired looping conical mountain placeholders.
    asteroids.visible=false; // Distance-anchored debris now comes from the scenery kit.
    shibuyaGroup.visible=id==='tokyo';
    for(const item of theme.landmarks){
      const hero=makeLandmark(item.kind,theme);
      hero.userData.entry=item;
      heroGroup.add(hero);
      hero.traverse(object=>{if(object.isMesh)heroMaterials.push(object.material);});
    }
  }
  return {
    update(id,distance,quality='high',sections=[],time=0,reducedMotion=false){
      configure(id);group.visible=true;
      const theme=WORLD_THEMES[id],low=quality==='low',landscape=theme.prop;
      // The world is authored in camera-relative coordinates. Moving the
      // *entire group* by the centreline delta is exact; regenerating every
      // static InstancedMesh/road vertex each animation frame is not.
      // Before: >1000 CPU transforms + GPU instance-buffer uploads per frame.
      // Now: only when travelling into the next 12 m road sector.
      const origin=Math.floor(Math.max(0,distance)/STEP)*STEP;
      const home=trackPoint(id,origin),current=trackPoint(id,distance);
      group.position.set(home.x-current.x,home.y-current.y,home.z-current.z);
      sceneryLayer.position.set(-home.x,-home.y,-home.z);
      streamScenery(id,distance,quality,sections);
      const rebuild=cachedOrigin!==origin||cachedQuality!==quality;
      if(rebuild){
        cachedOrigin=origin;cachedQuality=quality;
        const start=Math.max(0,origin-160);
        for(let i=0;i<=ROWS;i++){
        const s=clamped(id,start+i*STEP),f=trackFrame(id,s);
        for(let side=0;side<2;side++){
          const index=(i*2+side)*3;
          positions.set(local(id,s,side?HALF:-HALF,0,origin,f),index);
          normals.set(f.up,index);
        }
        if(i===ROWS)continue;
        const a=i*2,k=i*6;
        const hole=sections.some(entry=>entry.type==='gap'&&s+STEP/2>=entry.from&&s+STEP/2<entry.to);
        indices.set(hole?[a,a,a,a,a,a]:[a,a+1,a+2,a+1,a+3,a+2],k);
        const character=ROAD_CHARACTER[id].markings;
        for(const side of [-1,1]){
          const n=i*2+(side===1?1:0);
          instance(roadEdges,n,id,s+STEP*.5,side*11.8,.24,
            [character==='mountain'?.25:.16,.14,STEP],origin);
          instance(shoulders,n,id,s+STEP*.5,side*13.5,-.22,
            [character==='orbital'?2.5:3.2,.42,STEP],origin);
        }
        const offsets=character==='urban'?[-6,0,6]
          :character==='expressway'?[-5.4,0,5.4]
          :character==='orbital'?[-10.6,10.6]:[-10.5,0,10.5];
        const stripes=offsets.length;
        laneMarks.count=ROWS*stripes;
        for(let line=0;line<stripes;line++){
          const lateral=offsets[line];
          const edge=Math.abs(lateral)>9;
          const width=edge?.19:character==='mountain'?.16:.12;
          const length=edge?STEP:character==='urban'?3.8:5;
          instance(laneMarks,i*stripes+line,id,s+2,lateral,.07,
            [width,.035,length],origin);
        }
      }
      geometry.attributes.position.needsUpdate=geometry.attributes.normal.needsUpdate=geometry.index.needsUpdate=true;
      roadEdges.instanceMatrix.needsUpdate=shoulders.instanceMatrix.needsUpdate=laneMarks.instanceMatrix.needsUpdate=true;
      // Retired generic roadside box/cone instances are not rendered.
      // Authored, persistent 120m chunks are streamed independently above.
      skyline.count=windows.count=terrain.count=asteroids.count=0;
      for(const hero of heroGroup.children){
        const entry=hero.userData.entry;
        pose(hero,id,entry.at,entry.side*(entry.offset||80),0,origin);
        // Optional yaw turns a facade toward the showcase camera's sightline.
        hero.rotateY(-entry.side*Math.PI*.5+(entry.yaw||0));
        hero.scale.setScalar(entry.scale||1);
      }
      if(water.visible)water.position.set(0,-33-home.y,-450); // Fixed sea level in world coordinates.
      }
      // Visibility updates are cheap and still run for every frame.
      for(const hero of heroGroup.children){
        hero.visible=Math.abs(distance-hero.userData.entry.at)<1900;
      }
      water.visible=landscape==='coast';
      if(water.visible)water.material.opacity=low?.7:.85;
      if(stars.visible){
        stars.position.set(0,0,0);
        if(!reducedMotion)stars.rotation.y=Math.sin(time*.015)*.015;
      }
      // Physical driving reward is granted by game.js; portals are only the
      // matching visible markers along the main driving lane.
      const tunnel=sections.find(s=>s.type==='boost-tunnel');
      boostGroup.visible=!!tunnel && Math.abs(distance-(tunnel.from+tunnel.to)/2)<1500;
      arrowGroup.visible=boostGroup.visible && (id==='tokyo'||id==='cosmic');
      sideGlass.visible=ceilingGlass.visible=id==='tokyo'||id==='cosmic';
      if(tunnel){
        if(rebuild){
          const spacing=(tunnel.to-tunnel.from)/(portals.length-1);
          sideGlass.count=low?16:32;ceilingGlass.count=low?8:16;
          for(let i=0;i<portals.length;i++){
            const s=tunnel.from+i*spacing;
            const mid=Math.min(tunnel.to,s+spacing*.45);
            for(const side of [-1,1]){
              instance(sideGlass,i*2+(side===1?1:0),id,mid,side*12.65,6.8,[.35,12.5,spacing],origin);
            }
            instance(ceilingGlass,i,id,mid,0,16.15,[24,.25,spacing],origin);
            pose(portals[i],id,s,0,0,origin);
          }
          sideGlass.instanceMatrix.needsUpdate=ceilingGlass.instanceMatrix.needsUpdate=true;
          for(let i=0;i<boostArrows.length;i++){
            const s=tunnel.from+12+i*(tunnel.to-tunnel.from-24)/boostArrows.length;
            pose(boostArrows[i],id,s,0,0,origin);
          }
        }
        if(boostGroup.visible){
          for(let i=0;i<portals.length;i++){
            const s=tunnel.from+i*(tunnel.to-tunnel.from)/(portals.length-1);
            // Realistic alpine rock bores and coastal/Taipei arcades have no
            // identical high-intensity rings. Distinct tunnel architecture is
            // built from absolute-distance tunnel sections by tunnelKit.
            const enabled=id==='cosmic'||id==='tokyo';
            portals[i].visible=s>=distance-150&&s<=distance+1400&&(i%(id==='cosmic'?4:5)===0||!low&&i===1);
            portals[i].children.forEach(mesh=>{mesh.visible=enabled;});
            const twinkle=reducedMotion?1:1+.045*Math.sin(time*3.5+i*.8);
            portals[i].scale.setScalar(twinkle);
          }
          for(let i=0;i<boostArrows.length;i++){
            const s=tunnel.from+12+i*(tunnel.to-tunnel.from-24)/boostArrows.length;
            boostArrows[i].visible=s>distance-70&&s<distance+1250&&!low;
          }
        }
      }
      if(shibuyaGroup.visible&&rebuild){
        for(let i=0;i<crosswalk.length;i++){
          const d=1200+(i-6)*2.9;
          pose(crosswalk[i],id,d,0,.055,origin);
        }
      }
    },
    landmarks(){return heroGroup.children;},
    hide(){group.visible=false;},
    dispose(){
      clearHeroes();clearChunks();kit.dispose();tunnelKit.dispose();group.removeFromParent();
      geometry.dispose();roadMat.dispose();glowMat.dispose();architectureMat.dispose();windowMat.dispose();terrainMat.dispose();stripeMat.dispose();shoulderMat.dispose();
      roadEdges.dispose();shoulders.dispose();laneMarks.dispose();skyline.dispose();windows.dispose();terrain.dispose();asteroids.dispose();
      water.geometry.dispose();water.material.dispose();starGeo.dispose();stars.material.dispose();portalGeo.dispose();portalMat.dispose();portalSecondary.dispose();glassMat.dispose();sideGlass.dispose();ceilingGlass.dispose();
    },
  };
}
