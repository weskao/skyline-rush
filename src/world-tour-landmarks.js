import * as THREE from 'three';

// Authored low-poly landmark silhouettes. Geometry is created only when a track
// changes; the five World Tour courses reuse these construction primitives.
// Architectural references: Taipei Presidential Office red brick/white banding
// and 60 m central tower; Qing-era North Gate roof; Tokyo's orange-white lattice.
const box = new THREE.BoxGeometry(1, 1, 1);
const cylinder = new THREE.CylinderGeometry(1, 1, 1, 12);
const sphere = new THREE.SphereGeometry(1, 18, 12);
const cone = new THREE.ConeGeometry(1, 1, 12);
const torus = new THREE.TorusGeometry(1, .1, 8, 48);

export function makeLandmark(kind, palette = {}) {
  const root = new THREE.Group();
  root.name = `World Tour landmark: ${kind}`;
  const mats = Object.fromEntries(Object.entries({
    stone: '#d9d0ba', brick: '#aa503b', trim: '#eee4cf', roof: '#326169',
    dark: '#26314b', gold: '#fbc868', neon: palette.accent || '#6ff5ff',
    red: '#e84933', white: '#f7f0e8', water: '#488ba6', green: '#275e45',
    purple: '#9877ef', windows: '#9fe1f5',
  }).map(([id,color])=>[id,new THREE.MeshStandardMaterial({
    color, roughness:id==='neon'||id==='windows'?.32:.73,
    metalness:id==='neon'||id==='windows'?.35:.05,
    emissive:id==='neon'||id==='windows'?color:'#000000',
    emissiveIntensity:id==='neon'?.65:id==='windows'?.26:0,
  })]));
  const mat=id=>mats[id]||mats.stone;
  function add(geo,material,x,y,z,sx=1,sy=1,sz=1){
    const mesh=new THREE.Mesh(geo,mat(material));
    mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);
    root.add(mesh);return mesh;
  }
  const beam=(a,b,width=1,material='trim')=>{
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b);
    const segment=add(cylinder,material,...start.clone().add(end).multiplyScalar(.5).toArray(),width,start.distanceTo(end),width);
    segment.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.sub(start).normalize());
    return segment;
  };
  const block=(x,y,z,w,h,d,material='stone')=>add(box,material,x,y,z,w,h,d);
  const spire=(x,y,z,r,h,material='roof')=>add(cone,material,x,y,z,r,h,r);
  const orb=(x,y,z,r,material='gold')=>add(sphere,material,x,y,z,r,r,r);
  const column=(x,y,z,r,h,material='stone')=>add(cylinder,material,x,y,z,r,h,r);
  const roof=(y,w,d,material='roof')=>{
    block(0,y,0,w,2,d,material);
    // Raised, swept Chinese roof edges to make the silhouette legible.
    for(const sign of [-1,1]){
      const ridge=beam([sign*w*.49,y+2,-d*.52],[0,y+5,0],.85,material);
      beam([sign*w*.5,y+2,d*.52],[0,y+5,0],.85,material);
      column(sign*w*.49,y+2,0,1,2,'gold');
    }
  };
  if(kind==='office'){
    // Taipei Presidential Office: five-storey symmetrical red-brick wings,
    // continuous off-white horizontal bands, corner pavilions, 60 m tower.
    block(0,15,0,114,30,21,'brick');
    for(const x of [-54,54])block(x,18,0,18,36,24,'brick');
    for(const y of [5,10,16,22,27,30])block(0,y,11.2,116,.9,1.3,'trim');
    for(let x=-50;x<=50;x+=10){
      if(Math.abs(x)<11)continue;
      for(const y of [7,13,19,25]){
        block(x,y,11.7,4,4,.7,'trim');
        block(x,y,12.13,2.9,3.1,.18,'dark');
        block(x,y+2.2,11.8,4.8,.45,.8,'trim');
      }
    }
    for(const x of [-54,54])for(const y of [35,38]){
      block(x,y,0,21,.9,25,'trim');
    }
    block(0,31,0,19,62,21,'brick'); // total 62 m centre tower
    for(const y of [34,43,52,59])block(0,y,11.4,21,.8,2,'trim');
    for(const y of [37,47,56])for(const x of [-5,0,5])block(x,y,11.8,2.5,4,.8,'trim');
    block(0,64,0,15,5,15,'trim');
    block(0,67,0,12,3,12,'roof');
    // Arched entrance represented by layered voussoir pillars and door.
    block(0,6,12,9,12,1,'stone');block(0,5,12.7,6,9,.2,'dark');
    column(-7,7,12.5,1,12,'trim');column(7,7,12.5,1,12,'trim');
    block(0,14,12,18,1.6,4,'trim');
  }else if(kind==='gate'){
    // Taipei Cheng'en Gate: stone lower fortification, central arch,
    // red timber upper guardhouse and multi-tier green tiled roof.
    for(const x of [-15,15])block(x,9,0,16,18,15,'stone');
    block(0,17,0,46,5,18,'stone');
    block(0,8,1.8,11,15,17,'dark');
    for(const x of [-22,22])block(x,17,0,3,8,19,'stone');
    for(const x of [-12,0,12])column(x,25,0,1.1,11,'red');
    block(0,29,0,35,8,14,'brick');
    roof(35,48,24);
    roof(42,35,18);
    orb(0,47,0,1.8);
  }else if(kind==='temple'){
    // A Taiwan temple silhouette: layered glazed eaves, dragon-ridge
    // accents, red entrance posts, painted brackets and lanterns.
    block(0,10,0,38,20,21,'brick');
    for(const x of [-15,-5,5,15])column(x,8,12.2,1.6,16,'red');
    block(0,8,11.8,8,15,2,'dark');
    roof(22,50,32);
    roof(31,32,20);
    for(const x of [-18,18]){orb(x,18,15,2.5,'red');column(x,15,15,.1,3,'gold');}
    for(const x of [-12,12])spire(x,38,0,3,7,'gold');
  }else if(kind==='tower'){
    // Tokyo Tower: distinctly tapered orange/white four-legged
    // open lattice with two observation decks and a long antenna.
    for(const x of [-13,13])for(const z of [-13,13]){
      beam([x,0,z],[x*.22,86,z*.22],2.3,'red');
    }
    for(let y=9;y<=82;y+=10){
      const width=13-(y/86)*10;
      const color=Math.floor(y/10)%2?'white':'red';
      for(const z of [-width,width])beam([-width,y,z],[width,y,z],.75,color);
      for(const x of [-width,width])beam([x,y,-width],[x,y,width],.75,color);
      beam([-width,y,-width],[width,y+6,width],.38,color);
      beam([width,y,-width],[-width,y+6,width],.38,color);
    }
    block(0,54,0,21,7,21,'trim');
    block(0,75,0,13,5,13,'red');
    column(0,102,0,1.5,48,'white');
    spire(0,128,0,2,12,'red');
    for(const y of [90,103,116])block(0,y,0,4,3,4,'red');
  }else if(kind==='crossing'){
    // Shibuya's large commercial facades, animated billboards live
    // in the main road decals so they remain aligned to the drive path.
    for(const x of [-29,29]){
      block(x,27,0,19,54,23,'dark');
      for(let y=11;y<=45;y+=8)block(x,y,12.1,14,4,.4,'neon');
      block(x,40,12.4,13,11,.5,'windows');
    }
    block(0,44,-17,25,22,16,'dark');
    block(0,44,-8.6,18,9,.2,'neon');
  }else if(kind==='railway'){
    // Viaduct and elevated passing train, kept clear of the road.
    for(const x of [-42,-21,0,21,42])column(x,10,0,1.8,20,'stone');
    block(0,21,0,100,2,14,'dark');
    for(const z of [-4,4])block(0,23,z,100,.4,.45,'silver');
    block(0,29,0,83,12,10,'white');
    block(0,36,0,83,2,10,'red');
    for(let x=-37;x<=37;x+=8)block(x,31,5.15,4,4,.28,'windows');
  }else if(kind==='tunnel'){
    // Natural rock opening with a high masonry portal.
    for(const x of [-22,22])block(x,13,0,20,26,20,'stone');
    block(0,26,0,58,12,23,'stone');
    for(let i=0;i<11;i++){
      const a=Math.PI*i/10;
      orb(Math.cos(a)*22,12+Math.sin(a)*19,12,4.7,'dark');
    }
    block(0,32,12,33,2,2,'gold');
  }else if(kind==='mountain'){
    for(const [x,z,r,h] of [[0,0,55,124],[-70,-22,40,102],[65,24,48,118]]){
      spire(x,h/2,z,r,h,'stone');
      spire(x,h-12,z,r*.3,25,'white');
    }
  }else if(kind==='lighthouse'){
    // Coastal beacon: tapered white tower, red bands, balcony and lantern.
    const tapered=new THREE.CylinderGeometry(5,8,54,18);
    add(tapered,'white',0,27,0);
    for(const y of [13,27,40])column(0,y,0,7.1,5,'red');
    column(0,57,0,10,2,'dark');
    column(0,61,0,5,8,'windows');
    spire(0,68,0,10,8,'red');
    orb(0,62,0,3,'gold');
  }else if(kind==='bridge'){
    // Two pylons, catenary-inspired cable segments and side stays.
    for(const x of [-34,34])block(x,39,0,5,78,8,'stone');
    for(let n=-7;n<=7;n++){
      const x=n*8;
      beam([x,4,0],[x,54+0.038*x*x,0],.55,'trim');
    }
    for(let i=-12;i<12;i++){
      const x=i*5;const y=60+0.026*x*x;
      beam([x,y,0],[x+5,60+0.026*(x+5)**2,0],1.1,'red');
    }
    block(0,5,0,130,3,14,'dark');
  }else if(kind==='arch'){
    for(const x of [-28,28])spire(x,28,0,26,56,'stone');
    for(let i=0;i<13;i++){
      const angle=Math.PI*i/12;
      orb(Math.cos(angle)*32,20+Math.sin(angle)*29,0,8,'stone');
    }
  }else if(kind==='planet'){
    orb(0,62,0,43,'purple');
    const rings=add(torus,'gold',0,62,0,56,56,56);
    rings.rotation.set(.65,.38,.23);
    const secondary=add(torus,'neon',0,62,0,52,52,52);secondary.rotation.set(.67,.34,.25);
    orb(-17,77,35,5,'windows');
    orb(62,45,-33,8,'white');
    orb(-74,61,-55,3,'purple');
    orb(42,21,76,5,'windows');
  }else if(kind==='cosmic-gate'){
    const gate=add(torus,'neon',0,23,0,23,23,23);
    gate.rotation.z=.25;
    for(const x of [-17,17])block(x,14,0,5,28,6,'dark');
    for(const x of [-12,12])for(const y of [8,36])orb(x,y,1,2.2,'gold');
    spire(0,48,0,9,11,'purple');
  }
  // Non-copyrighted authored model primitives; no scraped photographs.
  root.userData.landmarkKind=kind;
  return root;
}
