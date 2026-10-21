import * as THREE from 'three';
import { SCENERY_CHUNK_METRES } from './world-tour-scenery.js';

export const TUNNEL_CHARACTER=Object.freeze({
  taipei: {type:'civic-arcade',lit:'#a99c81',walls:'#716e66',spacing:54},
  tokyo: {type:'rail-underpass',lit:'#807b9d',walls:'#343c52',spacing:42},
  alpine: {type:'rock-rail-bore',lit:'#968766',walls:'#343832',spacing:36},
  coastal: {type:'sea-pergola',lit:'#b4ad93',walls:'#748c89',spacing:65},
  cosmic: {type:'space-airlock',lit:'#677f9a',walls:'#303852',spacing:78},
});

// True semicylindrical tunnel lining: face pairs follow a catenary-like
// railroad arch instead of drawing repeated neon hoops across the roadway.
const tunnelShell=(()=>{
  const verts=[],indices=[],rings=13;
  for(let i=0;i<=rings;i++){
    const angle=Math.PI*i/rings;
    const x=13.3*Math.cos(angle),y=7+11.4*Math.sin(angle);
    verts.push(x,y,12,x,y,-12);
    if(i<rings){const n=i*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  g.setIndex(indices);g.computeVertexNormals();return g;
})();
const cube=new THREE.BoxGeometry(1,1,1);
export function createTunnelKit(sceneryKit) {
  const shellMaterials=new Map();
  function mat(color){
    if(!shellMaterials.has(color))shellMaterials.set(color,
      new THREE.MeshStandardMaterial({color,roughness:1,metalness:0,side:THREE.DoubleSide,flatShading:true}));
    return shellMaterials.get(color);
  }
  const add=(root,color,x,y,z,w,h,d)=>{
    const m=new THREE.Mesh(cube,sceneryKit.material(color));
    m.position.set(x,y,z);m.scale.set(w,h,d);root.add(m);return m;
  };
  function segment(id, variant, index) {
    const g=new THREE.Group();g.name='tunnel:'+id+':'+variant;
    const style=TUNNEL_CHARACTER[id],dark=mat(style.walls);
    if(id==='alpine'){
      const shell=new THREE.Mesh(tunnelShell,dark);shell.name='dark railway bore';
      g.add(shell);
      for(const side of [-1,1]){
        add(g,variant==='stone'?'#56584e':'#474b49',side*13.5,6,0,2,12.5,24);
        add(g,'#4d4d44',side*12.25,1,0,.5,1.8,23);
        if(index%2===0){
          add(g,'#5f5e51',side*12.2,7,-1,.9,1.7,2.1);
          add(g,'#b2a17f',side*11.9,7,-1,.15,.4,1.2); // sparse amber maintenance lamp
        }
        if(index%4===0){
          add(g,'#727267',side*12.6,3,-8,1.2,3.7,2.1); // rail utility access box
        }
      }
      if(variant==='concrete'){
        for(const z of [-11,11])add(g,'#696962',0,17.1,z,23,.7,1.1);
      }
    }else if(id==='taipei'){
      for(const side of [-1,1]){
        add(g,'#b7ab9a',side*15,6,0,2.4,12,24);
        add(g,'#98887a',side*15,14.5,0,3.2,2,24);
        add(g,'#b2a18a',side*12.6,9,-3,.7,.65,2);
        if(index%2===0)add(g,'#c9bea8',side*12.4,10,-4,.45,.35,.9);
      }
      if(index%3===0)add(g,'#b4a58f',0,17,0,32,1.5,4);
    }else if(id==='tokyo'){
      for(const side of [-1,1]){
        add(g,'#444b5f',side*14.8,7,0,1.8,14.5,24);
        add(g,'#62697a',side*14.7,13.9,0,2,1.1,24);
        for(const z of [-8,8])add(g,'#657687',side*14,6,z,.45,6,.7);
        if(index%2===0)add(g,'#8f8398',side*13.4,10,0,.35,1.2,6);
      }
      add(g,'#59627c',0,16.1,0,30,1.5,24);
    }else if(id==='coastal'){
      for(const side of [-1,1]){
        add(g,'#a3a090',side*15.4,6,0,1.8,12,2);
        add(g,'#8a8e84',side*15.2,3,0,2,6,24);
        if(index%3===0)add(g,'#9a9e92',side*14,9,0,.4,1.3,6);
      }
      if(index%2===0)add(g,'#8e9691',0,14,0,32,1.1,2.4);
    }else if(id==='cosmic'){
      for(const side of [-1,1]){
        add(g,'#48546a',side*14.3,8,0,2.4,16,2);
        add(g,'#5a7181',side*13.5,1,0,.5,1.4,24);
        if(index%3===0)add(g,'#8593a0',side*14.1,13,0,.3,1.6,4);
      }
      if(index%2===0)add(g,'#536277',0,17,0,30,1.1,2.5);
    }
    return g;
  }
  function buildChunk(id,chunk,sections) {
    const root=new THREE.Group();root.name='authored tunnels '+id+' '+chunk;
    const start=chunk*SCENERY_CHUNK_METRES,end=start+SCENERY_CHUNK_METRES;
    const filtered=sections.filter(s=>s.type==='tunnel'||s.type==='boost-tunnel');
    for(const section of filtered){
      const from=Math.max(start,section.from),to=Math.min(end,section.to);
      if(to<=from)continue;
      const phase=filtered.indexOf(section);
      const variant=id==='alpine'?['stone','concrete','rock'][phase%3]:id;
      for(let d=from+12,i=0;d<to;d+=24,i++){
        const piece=segment(id,variant,Math.floor(d/24));
        sceneryKit.place(piece,id,d,0,0);
        root.add(piece);
      }
      // Non-repeating start signage: landmark marker at the true authored
      // entrance, no high-intensity glow directly in the driving sightline.
      if(section.from>=start&&section.from<end){
        const post=new THREE.Group();post.name='tunnel entrance '+variant;
        for(const side of [-1,1]){
          add(post,TUNNEL_CHARACTER[id].walls,side*15,7,0,2.5,14,4);
          if(id==='alpine')add(post,'#b0a38b',side*13.9,9,.8,.35,1.6,1);
        }
        add(post,TUNNEL_CHARACTER[id].walls,0,17.2,0,32,2,4);
        sceneryKit.place(post,id,section.from,0,0);
        root.add(post);
      }
    }
    return root;
  }
  return { buildChunk,dispose(){for(const m of shellMaterials.values())m.dispose();shellMaterials.clear();} };
}
