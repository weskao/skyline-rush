import * as THREE from 'three';
import { RACE_TRACKS } from './game.js';
import { trackPoint, trackFrame } from './track-paths.js';
import { roadRibbon } from './geometry.js';
import { makeLandmark } from './world-tour-landmarks.js';

// One scenery system for five distinct destinations. Locations are authored as
// race-distance + roadside offsets; meshes follow the *real* 3D driving path.
export const WORLD_THEMES = {
  taipei: {
    top:'#1b3158',horizon:'#e0a58d',fog:'#776d84',rock:'#657e83',road:'#34343a',ground:'#536374',rail:'#ffc880',sun:'#ffe0a5',warmth:.8,
    buildings:'#ad6e59',accent:'#f3c47b',prop:'city',landmarks:[
      {kind:'office',at:1150,side:-1,offset:94,scale:1.12},
      {kind:'gate',at:2630,side:1,offset:71,scale:1.12},
      {kind:'temple',at:4480,side:-1,offset:75,scale:1.25},
    ],
  },
  tokyo: {
    top:'#0c0a27',horizon:'#53298b',fog:'#48265f',rock:'#25204f',road:'#172035',ground:'#16204a',rail:'#fa50a7',sun:'#eab5ff',warmth:.2,
    buildings:'#29305c',accent:'#ff49bd',prop:'neon',landmarks:[
      {kind:'crossing',at:1200,side:-1,offset:66,scale:1.2},
      {kind:'tower',at:3200,side:1,offset:125,scale:1.25},
      {kind:'railway',at:5180,side:-1,offset:78,scale:1.05},
    ],
  },
  alpine: {
    top:'#254968',horizon:'#aec6c1',fog:'#8c9ca0',rock:'#536d6c',road:'#35444a',ground:'#547e78',rail:'#c6e5a8',sun:'#fff7ce',warmth:.5,
    buildings:'#526c65',accent:'#f9dba2',prop:'mountain',landmarks:[
      {kind:'tunnel',at:1760,side:1,offset:80,scale:1.3},
      {kind:'railway',at:3850,side:-1,offset:110,scale:1.25},
      {kind:'mountain',at:6180,side:1,offset:185,scale:1.8},
    ],
  },
  coastal: {
    top:'#193c68',horizon:'#ffc49a',fog:'#89a9b5',rock:'#697785',road:'#243949',ground:'#1d687d',rail:'#7aebf3',sun:'#ffe2a6',warmth:1,
    buildings:'#d6b99b',accent:'#ffeeaa',prop:'coast',landmarks:[
      {kind:'lighthouse',at:1180,side:1,offset:100,scale:1.35},
      {kind:'bridge',at:3160,side:-1,offset:130,scale:1.2},
      {kind:'arch',at:4870,side:1,offset:125,scale:1.6},
    ],
  },
  cosmic: {
    top:'#030a24',horizon:'#492788',fog:'#202457',rock:'#18204d',road:'#141b32',ground:'#11183e',rail:'#00e5ff',sun:'#c6a9ff',warmth:0,
    buildings:'#263371',accent:'#ad73ff',prop:'space',landmarks:[
      {kind:'planet',at:1610,side:1,offset:290,scale:2.1},
      {kind:'cosmic-gate',at:4100,side:-1,offset:96,scale:1.5},
      {kind:'planet',at:6740,side:-1,offset:310,scale:1.9},
    ],
  },
};

const ROWS=138, STEP=12, HALF=12;
const cube=new THREE.BoxGeometry(1,1,1);
const cone=new THREE.ConeGeometry(1,1,7);
const rock=new THREE.IcosahedronGeometry(1,0);
const vec=v=>new THREE.Vector3(...v);
const UNIT_Y=new THREE.Vector3(0,1,0);
const ZER0=new THREE.Vector3();

function seeded(i){const n=Math.sin(i*127.1+78.233)*43758.5453;return n-Math.floor(n);}
const clamped=(id,s)=>Math.max(0,Math.min(RACE_TRACKS[id].length,s));

export function createWorldTourScene(scene){
  const group=new THREE.Group();group.name='World Tour authored scenery';group.visible=false;scene.add(group);
  const geometry=roadRibbon(ROWS);
  const [positions,normals,indices]=[geometry.attributes.position.array,geometry.attributes.normal.array,geometry.index.array];
  const roadMat=new THREE.MeshStandardMaterial({color:'#253446',metalness:.26,roughness:.52,side:THREE.DoubleSide});
  const road=new THREE.Mesh(geometry,roadMat);road.frustumCulled=false;group.add(road);
  const glowMat=new THREE.MeshBasicMaterial({color:'#91ecff',toneMapped:false});
  const architectureMat=new THREE.MeshStandardMaterial({color:'#546582',roughness:.65,metalness:.25});
  const windowMat=new THREE.MeshBasicMaterial({color:'#b4dff9'});
  const terrainMat=new THREE.MeshStandardMaterial({color:'#4b6f77',roughness:.98,flatShading:true});
  const stripeMat=new THREE.MeshBasicMaterial({color:'#f7eaca'});
  const roadEdges=new THREE.InstancedMesh(cube,glowMat,ROWS*2);
  const laneMarks=new THREE.InstancedMesh(cube,stripeMat,ROWS*3);
  const skyline=new THREE.InstancedMesh(cube,architectureMat,94);
  const windows=new THREE.InstancedMesh(cube,windowMat,94*3);
  const terrain=new THREE.InstancedMesh(cone,terrainMat,92);
  const asteroids=new THREE.InstancedMesh(rock,terrainMat,92);
  for(const mesh of [roadEdges,laneMarks,skyline,windows,terrain,asteroids]){
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;group.add(mesh);
  }
  const water=new THREE.Mesh(new THREE.PlaneGeometry(4000,4000),new THREE.MeshStandardMaterial({
    color:'#1c789e',transparent:true,opacity:.83,metalness:.37,roughness:.22,depthWrite:false,
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
  const boostGroup=new THREE.Group();boostGroup.name='Playable speed tunnel';group.add(boostGroup);
  const portalGeo=new THREE.TorusGeometry(13,0.36,8,48);
  const portalMat=new THREE.MeshBasicMaterial({color:'#00f2ff',toneMapped:false});
  const portalSecondary=new THREE.MeshBasicMaterial({color:'#fdbb5b',toneMapped:false});
  const glassMat=new THREE.MeshStandardMaterial({color:'#2dddf3',emissive:'#0c5b77',
    metalness:.25,roughness:.25,transparent:true,opacity:.23,depthWrite:false,side:THREE.DoubleSide});
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
  let active=null, heroMaterials=[],cachedOrigin=null,cachedQuality=null;
  const local=(id,s,x=0,y=0,origin=0)=>{
    const center=trackPoint(id,clamped(id,s)),home=trackPoint(id,clamped(id,origin)),f=trackFrame(id,clamped(id,s));
    return [center.x-home.x+f.right[0]*x+f.up[0]*y,
      center.y-home.y+f.right[1]*x+f.up[1]*y,
      center.z-home.z+f.right[2]*x+f.up[2]*y];
  };
  const pose=(target,id,s,x,y,origin)=>{
    const f=trackFrame(id,clamped(id,s));
    basis.makeBasis(vec(f.right),vec(f.up),vec(f.forward).negate());
    target.position.fromArray(local(id,s,x,y,origin));
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
    clearHeroes();active=id;
    cachedOrigin=null;cachedQuality=null; // theme switch must invalidate world geometry
    const theme=WORLD_THEMES[id];
    roadMat.color.set(theme.road);
    glowMat.color.set(theme.rail);
    portalMat.color.set(theme.rail);
    portalSecondary.color.set(theme.accent);
    glassMat.color.set(theme.rail);
    architectureMat.color.set(theme.buildings);
    terrainMat.color.set(theme.rock);
    windowMat.color.set(theme.prop==='neon'?'#ff68be':theme.prop==='city'?'#ffdc9b':'#b7eaff');
    water.visible=theme.prop==='coast';
    stars.visible=theme.prop==='space';
    skyline.visible=windows.visible=theme.prop==='city'||theme.prop==='neon';
    terrain.visible=theme.prop==='mountain'||theme.prop==='coast';
    asteroids.visible=theme.prop==='space';
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
      const theme=WORLD_THEMES[id],low=quality==='low';
      // The world is authored in camera-relative coordinates. Moving the
      // *entire group* by the centreline delta is exact; regenerating every
      // static InstancedMesh/road vertex each animation frame is not.
      // Before: >1000 CPU transforms + GPU instance-buffer uploads per frame.
      // Now: only when travelling into the next 12 m road sector.
      const origin=Math.floor(Math.max(0,distance)/STEP)*STEP;
      const home=trackPoint(id,origin),current=trackPoint(id,distance);
      group.position.set(home.x-current.x,home.y-current.y,home.z-current.z);
      const rebuild=cachedOrigin!==origin||cachedQuality!==quality;
      if(rebuild){
        cachedOrigin=origin;cachedQuality=quality;
        const start=Math.max(0,origin-160);
        for(let i=0;i<=ROWS;i++){
        const s=clamped(id,start+i*STEP),f=trackFrame(id,s);
        for(let side=0;side<2;side++){
          const index=(i*2+side)*3;
          positions.set(local(id,s,side?HALF:-HALF,0,origin),index);
          normals.set(f.up,index);
        }
        if(i===ROWS)continue;
        const a=i*2,k=i*6;
        const hole=sections.some(entry=>entry.type==='gap'&&s+STEP/2>=entry.from&&s+STEP/2<entry.to);
        indices.set(hole?[a,a,a,a,a,a]:[a,a+1,a+2,a+1,a+3,a+2],k);
        for(const side of [-1,1]){
          instance(roadEdges,i*2+(side===1?1:0),id,s+STEP*.5,side*11.8,.22,[.2,.15,STEP],origin);
        }
        for(let line=0;line<3;line++){
          instance(laneMarks,i*3+line,id,s+3,(line-1)*5,.055,[.13,.025,5.4],origin);
        }
      }
      geometry.attributes.position.needsUpdate=geometry.attributes.normal.needsUpdate=geometry.index.needsUpdate=true;
      roadEdges.instanceMatrix.needsUpdate=laneMarks.instanceMatrix.needsUpdate=true;
      const landscape=theme.prop;
      skyline.count=low?38:94;windows.count=low?114:94*3;
      terrain.count=asteroids.count=low?32:92;
      for(let i=0;i<94;i++){
        const s=clamped(id,Math.floor(origin/88)*88+(Math.floor(i/2)-4)*88);
        const side=i%2?1:-1,offset=33+(i*23%45);
        const height=12+(i*19%63);
        if(landscape==='city'||landscape==='neon'){
          instance(skyline,i,id,s,side*offset,height/2-4,[12+i%4*7,height,18+i%3*7],origin);
          for(let k=0;k<3;k++)instance(windows,i*3+k,id,s,side*(offset-1.5),10+k*(height/5),[9,.85,13],origin);
        }else{
          const h=landscape==='space'?11+(i*13%37):25+(i*17%82);
          const size=landscape==='space'?[h,h*.77,h]:[16+(i%4)*9,h,16+(i%4)*9];
          instance(landscape==='space'?asteroids:terrain,i,id,s,side*(offset+25),h*.43,size,origin);
        }
      }
      if(skyline.visible){skyline.instanceMatrix.needsUpdate=true;windows.instanceMatrix.needsUpdate=true;}
      if(terrain.visible)terrain.instanceMatrix.needsUpdate=true;
      if(asteroids.visible)asteroids.instanceMatrix.needsUpdate=true;
      for(const hero of heroGroup.children){
        const entry=hero.userData.entry;
        pose(hero,id,entry.at,entry.side*(entry.offset||80),0,origin);
        hero.rotateY(-entry.side*Math.PI*.5);
        hero.scale.setScalar(entry.scale||1);
      }
      if(water.visible)water.position.set(0,-33,-450);
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
      boostGroup.visible=arrowGroup.visible=!!tunnel && Math.abs(distance-(tunnel.from+tunnel.to)/2)<1500;
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
            portals[i].visible=s>=distance-150&&s<=distance+1400&&(i%2===0||!low);
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
    hide(){group.visible=false;},
    dispose(){
      clearHeroes();group.removeFromParent();
      geometry.dispose();roadMat.dispose();glowMat.dispose();architectureMat.dispose();windowMat.dispose();terrainMat.dispose();stripeMat.dispose();
      roadEdges.dispose();laneMarks.dispose();skyline.dispose();windows.dispose();terrain.dispose();asteroids.dispose();
      water.geometry.dispose();water.material.dispose();starGeo.dispose();stars.material.dispose();portalGeo.dispose();portalMat.dispose();portalSecondary.dispose();glassMat.dispose();sideGlass.dispose();ceilingGlass.dispose();
    },
  };
}
