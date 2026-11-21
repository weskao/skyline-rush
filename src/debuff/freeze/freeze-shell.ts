import { blue } from '../../effects-palette.ts';
import { DEBUFF_TIMELINE } from '../timeline.ts';

// Freeze on the status shell (rival-status-tint.ts composes this chunk into its one fragment program): a cold-white
// pulse on the hit, then frost climbs from the sills over the roof with a bright front (the spread), leaving feathered
// frost ferns, thin cracks and glints with a frosty rim; as the shell fades the frost dissolves in patches.
// Low (rim 0) keeps the plain tint. Reduced motion holds `time` at 0, so the glints stop.

const { impact, spread } = DEBUFF_TIMELINE.freeze;

export const FREEZE_SHELL = {
  color: blue,
  /** May use the shell's `rim` (0 on Low) and `time` uniforms and its `hash()` / `noise()`. `p` is the point on the
   *  hull in shell units (x right, y up, z along the car; the body ends near +-0.85). */
  glsl: `float ridge(vec3 q){return 1.-abs(noise(q)*2.-1.);}
  float frostFern(vec3 p){vec3 q=p*vec3(5.,6.5,2.6)+.7*vec3(noise(p*2.3),noise(p*2.3+7.1),noise(p*2.3+3.7)); // warped veins
    return pow(max(0.,ridge(q)),7.)*.85+pow(max(0.,ridge(q*2.4+5.)),10.)*.6;}
  vec3 freezeShell(vec3 p,vec3 tint,float body,float edge,float age,float seed,float level){
    float n=noise(p*3.7+seed);
    float front=-1.15+2.6*smoothstep(${impact * 0.6},${spread},age)+.24*(n-.5); // frost climbs from the sills
    float iced=smoothstep(front+.06,front-.06,p.y);
    float melt=smoothstep(level*1.5-.12,level*1.5+.12,noise(p*5.3+1.7)); // fading: the frost dissolves in patches
    iced*=1.-melt;
    float line=(1.-smoothstep(0.,.07,abs(p.y-front)))*(1.-step(${spread},age))*(1.-melt);
    float pulse=1.-smoothstep(0.,${impact},age);
    float fern=0.,crack=0.,glint=0.;
    if(rim>0.){fern=frostFern(p);crack=pow(max(0.,ridge(p*10.5+2.)),16.);
      vec3 cell=floor(p*15.);glint=step(.94,hash(cell))*(.55+.45*sin(time*3.+hash(cell+5.)*40.));}
    vec3 ice=vec3(.82,.94,1.);
    return tint*iced*(body*1.2+rim*edge*1.5+fern*.45)
      +ice*level*(iced*(fern*.85+crack*.35+glint*1.3+rim*edge*.7)+line*1.4+pulse*(body*3.+edge)*1.3);}`,
  /** Brightness factor per frame on a rival (the player and reduced motion stay steady). */
  flicker: (_time: number, _i: number): number => 1,
  /** Shell scale since the hit: the shell swells as the crust forms. */
  pop: (age: number): number => 1 + 0.06 * Math.sin(Math.min(1, Math.max(0, age - impact) / (spread - impact)) * Math.PI),
};
