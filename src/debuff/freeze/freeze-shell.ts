import { blue } from '../../effects-palette.ts';

// Freeze on the status shell (rival-status-tint.ts composes this chunk into its one fragment program):
// frost creeps up from the sills into faceted, glinting ice (flash-freeze).

export const FROST_CREEP = 0.3; // s for the frost line to climb from the sills over the roof

export const FREEZE_SHELL = {
  color: blue,
  /** May use the shell's `rim` (0 on Low) and `time` uniforms and its `hash()` / `noise()`. `p` is the point on the
   *  hull in shell units (x right, y up, z along the car; the body ends near +-0.85). */
  glsl: `float facets(vec3 p){vec3 i=floor(p),f=fract(p);float a=8.,b=8.; // distance to the nearest ice-cell border
    for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++)for(int z=-1;z<=1;z++){vec3 g=vec3(x,y,z);
      float d=length(g+vec3(hash(i+g),hash(i+g+17.),hash(i+g+31.))-f);b=d<a?a:min(b,d);a=min(a,d);}
    return b-a;}
  vec3 freezeShell(vec3 p,vec3 tint,float body,float edge,float age,float seed,float level){
    float front=-1.15+2.5*clamp(age/${FROST_CREEP},0.,1.);
    float iced=smoothstep(front+.08,front-.08,p.y),line=(1.-smoothstep(0.,.08,abs(p.y-front)))*step(age,${FROST_CREEP});
    float crack=0.,glint=0.;
    if(rim>0.){crack=1.-smoothstep(0.,.08,facets(p*3.2));glint=crack*step(.86,hash(floor(p*9.)+floor(time*4.+seed)));}
    return tint*iced*(body*1.6+rim*edge*1.2+crack*.8)+vec3(.85,.95,1.)*level*(iced*(crack*.45+glint*1.8)+line*1.6);}`,
  /** Brightness factor per frame on a rival (the player and reduced motion stay steady). */
  flicker: (_time: number, _i: number): number => 1,
  /** Shell scale since the hit: the shell swells as the crust forms. */
  pop: (age: number): number => 1 + 0.08 * Math.sin(Math.min(1, age / FROST_CREEP) * Math.PI),
};
