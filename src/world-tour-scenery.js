import * as THREE from 'three';
import { RACE_TRACKS } from './game.js';
import { trackPoint, trackFrame } from './track-paths.js';

// Absolute distance anchors: reusing a chunk never restarts an animation or
// causes the same roadside block to jump back to the camera.
export const SCENERY_CHUNK_METRES = 120;
export const SCENERY_KINDS = Object.freeze({
  taipei: ['arcade','shop','scooter','traffic-light','banyan','bus-stop'],
  tokyo: ['night-shop','vending','rail-viaduct','tokyo-lamp','sign-stack','train'],
  alpine: ['pine','rock-cut','rail-track','signal','maintenance-hut','stone-wall'],
  coastal: ['palm','beach-hut','sea-wall','pier','dune-grass','buoy'],
  cosmic: ['satellite','asteroid','habitat','antenna','debris','solar-panel'],
});
// Valley openings: the hillside on one side sinks to a meadow so the hero
// peak (WORLD_THEMES alpine mountain, 6180 m left) is not hidden behind the
// valley wall. 0..1 with 90 m ramps; continuous in distance, so no seams.
export const TERRAIN_VISTAS = Object.freeze({ alpine: [{ from: 5600, to: 6260, side: -1 }] });
function vistaOpening(trackId,distance,side) {
  let open=0;
  for(const v of TERRAIN_VISTAS[trackId]||[])if(v.side===side)
    open=Math.max(open,Math.min(1,(distance-v.from)/90,(v.to-distance)/90));
  return Math.max(0,open);
}
// Natural terrain altitude under each prop. The placement function shares
// the exact same deterministic profile as the cliff mesh, so forest plants
// grow ON the hillside instead of being hidden underneath it.
export function terrainHeight(trackId,distance,side,lateral) {
  if(!['alpine','coastal'].includes(trackId))return 0;
  const noise=Math.sin(distance*.023+side*1.71)*.55+
    Math.cos(distance*.049+side*.8)*.24+
    Math.sin(distance*.011+3.1)*.21;
  const xs=trackId==='alpine'?[16,23,39,72]:[15,25,48,92];
  const open=1-.85*vistaOpening(trackId,distance,side);
  const ys=trackId==='alpine'
    ?[-1,(4+noise*2.2)*open,(22+noise*7)*open,(65+noise*16)*open]
    :(side===1?[-3,-7,-18,-22]:[-1,2,8,18])
      .map((h,i)=>h+noise*[.2,.8,2.8,4.5][i]);
  for(let i=0;i<xs.length-1;i++){
    if(lateral<=xs[i+1]){
      const t=Math.max(0,Math.min(1,(lateral-xs[i])/(xs[i+1]-xs[i])));
      return ys[i]*(1-t)+ys[i+1]*t;
    }
  }
  return ys.at(-1);
}

export const ROAD_CHARACTER = Object.freeze({
  taipei: { markings:'urban', shoulder:'#777e7a', lane:'#c6c3b3', edge:'#969c95', pavement:'#373e41' },
  tokyo: { markings:'expressway', shoulder:'#49566c', lane:'#a5abb6', edge:'#727e96', pavement:'#202b3b' },
  alpine: { markings:'mountain', shoulder:'#5e655a', lane:'#bdb99d', edge:'#e1d8a9', pavement:'#414640' },
  coastal: { markings:'coastal', shoulder:'#a3977a', lane:'#bdb0a0', edge:'#bdd1c8', pavement:'#454b49' },
  cosmic: { markings:'orbital', shoulder:'#35415f', lane:'#5b738d', edge:'#68889b', pavement:'#22293c' },
});
const hash = (a, b = 0, c = 0) => {
  let n = (Math.imul(a + 1, 73856093) ^ Math.imul(b + 11, 19349663) ^ Math.imul(c + 7, 83492791)) >>> 0;
  n = Math.imul(n ^ (n >>> 16), 2246822507) >>> 0;
  return ((n ^ (n >>> 13)) >>> 0) / 4294967296;
};
export function sceneryPlan(trackId, chunk, low = false) {
  if (!SCENERY_KINDS[trackId]) throw Error('Unknown World Tour scenery: ' + trackId);
  const kinds = SCENERY_KINDS[trackId], length = RACE_TRACKS[trackId].length;
  const items = [];
  // Specific distance and side are stable across rerenders and detail levels.
  for (const side of [-1, 1]) for (let i = 0; i < (low ? 2 : 4); i++) {
    const seed = chunk * 17 + i + (side === 1 ? 6 : 0);
    const distance = chunk * SCENERY_CHUNK_METRES + 13 + i * 27 + hash(seed, 14) * 13;
    if (distance < 0 || distance > length) continue;
    const type = kinds[Math.floor(hash(seed, trackId.length) * kinds.length)];
    // Keep human-scale street furniture directly behind the sidewalks.
    // Larger facades sit one plot farther away, not hundreds of metres
    // out like the previous city box skyline.
    const furniture=new Set(['scooter','traffic-light','bus-stop','banyan',
      'vending','tokyo-lamp','sign-stack','signal','dune-grass','buoy']);
    const compact = furniture.has(type);
    const offsetBase=trackId==='taipei'||trackId==='tokyo'
      ?(compact?16:24)
      :trackId==='alpine'?(compact?17:28)
      :trackId==='coastal'?(compact?20:32):34;
    const offsetSpan=trackId==='cosmic'?43:compact?9:16;
    items.push({ distance, side, kind:type,
      offset:offsetBase + Math.round(hash(seed,91)*offsetSpan),
      size: .82 + hash(seed,44)*.46 });
  }
  return items;
}

const GEO = {
  box:new THREE.BoxGeometry(1,1,1),
  rod:new THREE.CylinderGeometry(1,1,1,8),
  rock:new THREE.IcosahedronGeometry(1,1),
  orb:new THREE.SphereGeometry(1,10,8),
  roof:new THREE.ConeGeometry(1,1,5),
  torus:new THREE.TorusGeometry(1,.13,5,24),
};
export function createSceneryKit() {
  const materials = new Map(), tempMatrix = new THREE.Matrix4();
  function material(hex, glow = false) {
    const key = hex + (glow ? '-edge' : '');
    if (!materials.has(key)) materials.set(key, glow
      ? new THREE.MeshBasicMaterial({color:hex,toneMapped:true})
      : new THREE.MeshStandardMaterial({color:hex,roughness:.89,metalness:.035,flatShading:true}));
    return materials.get(key);
  }
  const add=(g,geo,color,x,y,z,w,h,d,glow=false)=>{
    const mesh=new THREE.Mesh(GEO[geo],material(color,glow));
    mesh.position.set(x,y,z);mesh.scale.set(w,h,d);g.add(mesh);return mesh;
  };
  const B=(g,c,x,y,z,w,h,d)=>add(g,'box',c,x,y,z,w,h,d);
  const R=(g,c,x,y,z,r,h)=>add(g,'rod',c,x,y,z,r,h,r);
  const S=(g,c,x,y,z,r)=>add(g,'orb',c,x,y,z,r,r,r);
  const P=(g,c,x,y,z,r,h)=>add(g,'roof',c,x,y,z,r,h,r);
  const STONE='#66695f', CREAM='#c6c0ad', DARK='#303a41', WOOD='#806a52', LIGHT='#b8b0a1';
  const roof=(g,c,w,h,z=0)=>{B(g,c,0,h,z,w,1.6,w*.56);P(g,c,0,h+2,z,w*.58,4);};
  const foliage=(g,x=0,z=0,r=4)=>{
    R(g,'#635944',x,3,z,.62,6);
    for(const a of [-1,0,1])S(g,a? '#507055':'#416650',x+a*r*.52,7+(a%2)*1.2,z,r*.77);
  };
  const lamp=(g,night=false)=>{
    R(g,'#434c4f',0,6,0,.36,12);B(g,'#5a6365',1.2,12,0,2.4,.35,.35);
    B(g,night?'#a9a39a':'#d9cfb2',2.5,11.7,0,2,.25,1.05);
    B(g,'#4e5554',0,.45,0,1.1,.9,1.2);
  };
  const wheels=(g,z)=>{for(const x of [-1.1,1.1]){S(g,'#20282e',x,1,z,.75);S(g,'#a8a9a5',x,1,z,.31);}};
  const props={
    arcade(g){ // Taiwanese arcade façade with roofline, recessed arcade, shop awnings and signs
      B(g,'#b69c80',0,13,3,17,26,13);B(g,'#8c675e',0,25.8,3,19,2,15);
      for(const x of [-6,0,6]){
        B(g,'#efe4cd',x,5,11.2,1.4,10,1.2);B(g,'#354845',x,5,11.7,3.6,8,.4);
        B(g,'#c1ab8b',x,15,10.1,4,1,.5);
        for(const y of [16,21])B(g,'#557477',x,y,9.9,3,2.3,.4);
      }
      B(g,'#a45d47',0,10.5,12.5,16,1.3,4);B(g,'#d7c3a0',0,11.1,15,12,.4,1);
      B(g,'#586b59',9,9,12,1.1,5,3);
    },
    shop(g){B(g,'#b2a090',0,11,2,15,22,12);B(g,'#6d625c',0,1,9,15,2,3);
      for(let y=7;y<=19;y+=6)for(let x=-4;x<=4;x+=4)B(g,'#6d8c91',x,y,8.2,2.6,3,.28);
      B(g,'#ad6d50',0,5,9.2,12,1.1,3);B(g,'#d0be93',0,24,2,17,2,14);
      B(g,'#6e967c',8,9,10,1.3,6,4);
    },
    scooter(g){wheels(g,0);B(g,'#647f87',0,1.9,-.3,3.3,1.5,1.6);
      B(g,'#9c4d43',.55,3.1,0,1.3,1.8,1.4);B(g,'#242e32',-1.1,3.4,0,1.9,.7,1.4);
      B(g,'#dbccad',1.4,4.4,0,.85,.35,2.5);
    },
    'traffic-light'(g){lamp(g);B(g,'#2c3130',2.6,11,0,1.3,3.2,1);
      for(const [i,c] of ['#a64f49','#8a7c44','#4f8b65'].entries())S(g,c,2.6,12.1-i*1.05,.6,.34);
    },
    banyan(g){foliage(g,0,0,4);foliage(g,2,1,3.5);},
    'bus-stop'(g){R(g,'#48575d',-4,4,0,.24,8);R(g,'#48575d',4,4,0,.24,8);
      B(g,'#5d787b',0,8.3,0,12,.6,6);B(g,'#526a76',0,3,-2.6,10,6,.5);
      B(g,'#a8bec0',0,2,0,7,.8,2);B(g,'#d1c5a2',-2.1,4.8,-2.95,3.5,1.2,.1);
    },
    'night-shop'(g){B(g,'#38405d',0,16,1,16,32,16);
      for(let y=5;y<=28;y+=6)for(let x=-5;x<=5;x+=5)B(g,'#687a86',x,y,9.3,3.4,2.6,.35);
      B(g,'#a36988',0,6.8,10.8,14,2.2,2);B(g,'#445d77',0,3.3,10.1,11,5,.5);
      B(g,'#6a7a9b',8.1,16,11,1,12,1);
    },
    vending(g){B(g,'#e2e0d3',0,3,0,4.2,6,2.8);B(g,'#a45f59',0,5.5,1.5,4.3,.8,.5);
      for(let y=2;y<=4;y++)for(let x=-1;x<=1;x++)B(g,'#7d9aa0',x, y,1.5,.62,.6,.15);
      B(g,'#363f46',1.4,2.8,1.65,.35,1.1,.25);
    },
    'rail-viaduct'(g){for(const x of [-9,0,9])R(g,'#747a81',x,8,0,.9,16);
      B(g,'#626c78',0,16,0,26,2,7);B(g,'#c7b7ad',0,20,0,24,5,4);
      for(let x=-9;x<=9;x+=3)B(g,'#657e90',x,21,2.15,2,2,.2);
    },
    'tokyo-lamp'(g){lamp(g,true);B(g,'#8e7880',0,7.8,1,1.1,2,.3);},
    'sign-stack'(g){R(g,'#525a69',0,10,0,.6,20);
      for(const [i,c] of ['#63749d','#a16a92','#6f9593'].entries()){
        B(g,c,(i%2?2:-2),16-i*5,0,8,3,1);
        for(let j=0;j<3;j++)B(g,'#c1b9a8',-3.5+j*2+(i%2?2:-2),16-i*5,.6,1.2,.35,.2);
      }
    },
    train(g){B(g,'#b2bcc1',0,6,0,38,12,7);B(g,'#737f94',0,10,3.65,37,2,.4);
      for(let x=-15;x<=15;x+=6)B(g,'#465977',x,7,3.7,4,3,.2);
      B(g,'#af6154',0,2,3.6,38,.7,.3);
    },
    pine(g){R(g,'#554b3c',0,5,0,1.4,10);
      for(const [y,r,h] of [[9,5,11],[14,4,10],[18,3.1,9]])P(g,'#35574b',0,y,0,r,h);
    },
    'rock-cut'(g){for(const [x,r,h] of [[-6,8,18],[0,10,24],[6,7,14]])S(g,'#6d7168',x,h*.5,0,r);
      B(g,'#51574e',0,1,4,23,2,4);
    },
    'rail-track'(g){for(const x of [-3,3])B(g,'#767a76',x,.6,0,.28,.3,38);
      for(let z=-16;z<=16;z+=4)B(g,'#62574b',0,.3,z,8,.5,1.5);
      R(g,'#666967',-7,3,-11,.4,6);S(g,'#b5a17e',-7,6,-11,.8);
    },
    signal(g){R(g,'#4d5150',0,5,0,.45,10);B(g,'#393f3c',0,10,0,2,4,1.5);
      S(g,'#ad554b',0,10.9,1,.6);S(g,'#6e996d',0,9,1,.6);
      B(g,'#85857b',0,.6,0,2.2,1.2,2);
    },
    'maintenance-hut'(g){B(g,'#8b8374',0,4,0,13,8,10);roof(g,'#4f605a',15,9);
      B(g,'#515955',0,3,5.3,3.4,5,.5);B(g,'#7a8c83',-3.8,5,5.3,2,2,.5);
      R(g,'#7e7869',7,5,0,.35,10);
    },
    'stone-wall'(g){B(g,'#6e746e',0,5,0,18,10,4);for(let y=1;y<=9;y+=2)for(let x=-7;x<=7;x+=4)
      B(g,'#969b8e',x+(y%3),y,2.2,3.4,.28,.3);
    },
    palm(g){R(g,'#81705a',0,6,0,.7,12);for(let i=0;i<5;i++){
      const angle=i*2*Math.PI/5;
      const leaf= B(g,'#507b63',Math.cos(angle)*3,12,Math.sin(angle)*3,7,.35,1.9);
      leaf.rotation.y=-angle;
    }},
    'beach-hut'(g){B(g,'#ac9471',0,4,0,14,8,13);B(g,'#c8b49a',0,9,0,17,1.3,15);
      for(const x of [-4,4])B(g,'#5e827e',x,4,7,3.5,4,.25);
      for(let i=-2;i<=2;i++)B(g,i%2?'#a15f55':'#ead5ac',i*3,8.5,8.5,3,.4,4);
    },
    'sea-wall'(g){B(g,'#9d9885',0,2,0,25,4,4);
      for(let x=-9;x<=9;x+=6)B(g,'#c4c0ad',x,4.5,0,3,1.6,4.2);
      B(g,'#7f8d89',0,4.9,0,25,.5,1.3);
    },
    pier(g){for(const x of [-8,0,8])for(const z of [-8,8])R(g,'#877860',x,4,z,.6,8);
      B(g,'#a49779',0,8,0,23,1.2,23);
      for(const z of [-12,12])B(g,'#88745c',0,10,z,23,3,.45);
      B(g,'#c2b397',0,12,0,13,1,8);
    },
    'dune-grass'(g){for(let i=-4;i<=4;i++){const m=R(g,'#687b5a',i*.7,1.5,Math.sin(i)*1.5,.14,3);
      m.rotation.z=i*.09;}S(g,'#ac9c80',1,0,0,3);
    },
    buoy(g){R(g,'#8c5e54',0,2,0,.35,4);S(g,'#c37e61',0,5,0,2);B(g,'#d0bc9e',0,5.7,0,3,.7,3);
      B(g,'#655f54',0,.5,0,5,1,5);
    },
    satellite(g){B(g,'#7a849f',0,5,0,5,6,5);for(const x of [-9,9]){
      B(g,'#45577e',x,5,0,10,.35,6);
      for(const z of [-1.4,1.4])B(g,'#7088a3',x,5.22,z,9,.15,.25);
    }R(g,'#858c9b',0,11,0,.25,7);S(g,'#acb7c9',0,15,0,1.3);
    },
    asteroid(g){for(const [x,y,z,r] of [[0,4,0,5],[-5,3,-2,2.5],[3.3,6,4,2.1]]){
      const m=add(g,'rock','#555a72',x,y,z,r,r*.9,r*1.2);
      m.rotation.set(.2,.5,.1);
    }},
    habitat(g){B(g,'#475575',0,9,0,23,18,16);B(g,'#7786a1',0,19,0,24,2,17);
      for(let i=-8;i<=8;i+=4)B(g,'#7d9db1',i,10,8.2,2.8,6,.28);
      R(g,'#65799a',-8,24,0,.6,10);S(g,'#9296b6',-8,30,0,2);
    },
    antenna(g){R(g,'#74849f',0,9,0,.6,18);
      for(let y=5;y<18;y+=4){B(g,'#64708c',0,y,0,8,.35,.3);B(g,'#64708c',0,y,0,.3,.35,8);}
      S(g,'#8288a1',0,20,0,1.4);
    },
    debris(g){for(let i=0;i<4;i++){const m=B(g,'#565f7c',i*4-6,3+i*1.4,(i%2)*5,4+i%3,1.2,5);
      m.rotation.z=i*.2;}S(g,'#8993b3',0,8,0,2);
    },
    'solar-panel'(g){R(g,'#64728a',0,6,0,.4,12);
      for(const x of [-6,6])B(g,'#50668a',x,12,0,11,.5,8);
      B(g,'#99a7b4',0,10,0,4,4,4);
    },
  };
  const basis=new THREE.Matrix4(),right=new THREE.Vector3(),up=new THREE.Vector3(),forward=new THREE.Vector3();
  function place(group, trackId, distance, lateral, rise = 0) {
    const f=trackFrame(trackId,distance),p=trackPoint(trackId,distance);
    right.fromArray(f.right);up.fromArray(f.up);forward.fromArray(f.forward).negate();
    basis.makeBasis(right,up,forward);
    group.position.set(p.x+f.right[0]*lateral+f.up[0]*rise,
      p.y+f.right[1]*lateral+f.up[1]*rise,
      p.z+f.right[2]*lateral+f.up[2]*rise);
    group.quaternion.setFromRotationMatrix(basis);
    return group;
  }
  function build(trackId,kind,size=1) {
    const g=new THREE.Group();g.name=kind;
    if(!props[kind])throw Error('Unknown scenery asset: '+kind);
    props[kind](g);g.scale.setScalar(size);
    return g;
  }
  // Continuous sculpted rock / coast ribbons with *absolute* distance-based
  // noise. Adjacent 120m sections share the same endpoint and do not pop.
  function terrain(trackId,chunk,low=false){
    if(!['alpine','coastal'].includes(trackId))return null;
    const length=RACE_TRACKS[trackId].length, root=new THREE.Group();
    root.name='terrain:'+trackId+':'+chunk;
    const strips=low?6:10,rings=4;
    const start=chunk*SCENERY_CHUNK_METRES;
    const end=Math.min(start+SCENERY_CHUNK_METRES,length);
    if(start>=end)return root;
    for(const side of [-1,1]){
      const vertices=[],index=[];
      for(let j=0;j<=strips;j++){
        const distance=start+(end-start)*j/strips;
        const p=trackPoint(trackId,distance),frame=trackFrame(trackId,distance);
        // Use terrainHeight for props and ground; never derive them independently.
        for(let i=0;i<rings;i++){
          const lateral=trackId==='alpine'?[16,23,39,72][i]:[15,25,48,92][i];
          const altitude=terrainHeight(trackId,distance,side,lateral);
          vertices.push(
            p.x+frame.right[0]*lateral*side+frame.up[0]*altitude,
            p.y+frame.right[1]*lateral*side+frame.up[1]*altitude,
            p.z+frame.right[2]*lateral*side+frame.up[2]*altitude,
          );
          if(i<rings-1&&j<strips){
            const n=j*rings+i;
            index.push(n,n+1,n+rings,n+1,n+rings+1,n+rings);
          }
        }
      }
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
      geometry.setIndex(index);
      geometry.computeVertexNormals();
      const surface=new THREE.Mesh(geometry,material(trackId==='alpine'
        ? (side===1?'#4c5b50':'#5c685c')
        : (side===1?'#72818a':'#82937e')));
      surface.name=trackId+' sculpted '+(side===1?'right':'left')+' terrain';
      surface.material.side=THREE.DoubleSide;
      surface.userData.ownGeometry=true;
      root.add(surface);
    }
    return root;
  }
  return { build,place,terrain,material,dispose() {for(const mat of materials.values())mat.dispose();materials.clear();} };
}
