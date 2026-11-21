import { emp } from '../../effects-palette.ts';

// EMP on the status shell (rival-status-tint.ts composes this chunk into its one fragment program):
// lightning arcs re-strike over the body after a white hit flash.

export const EMP_SHELL = {
  color: emp,
  /** May use the shell's `rim` (0 on Low) and `time` uniforms and its `hash()` / `noise()`. `p` is the point on the
   *  hull in shell units (x right, y up, z along the car; the body ends near +-0.85). `seed` < 0 is the player. */
  glsl: `vec3 empShell(vec3 p,vec3 tint,float body,float edge,float age,float seed,float level){
    bool player=seed<0.;float flash=player?0.:1.-smoothstep(0.,.18,age),arcs=0.,core=0.;
    if(rim>0.||player){float strike=floor(time*(player?4.:15.)+seed*7.); // the arcs jump to a new path each strike
      core=1.-smoothstep(0.,.05,abs(noise(p*2.6+vec3(seed,strike*1.7,0.))-.5));
      arcs=core;
      if(rim>0.)arcs=max(core,.8*(1.-smoothstep(0.,.035,abs(noise(p*4.3-vec3(strike*.9,seed,0.))-.5))));}
    return tint*(body+(player ? 0.28 : 0.)*edge+rim*edge*.9+arcs*2.2+flash*1.4)+vec3(1.)*level*(core*core*1.3+flash*.8);}`,
  /** Brightness factor per frame on a rival (the player and reduced motion stay steady): a hard electric flicker. */
  flicker: (time: number, i: number): number => Math.sin(time * 53 + i * 2.1) * Math.sin(time * 29) < 0 ? 0.35 : 1,
  /** Shell scale since the hit: the hit bursts the shell out. */
  pop: (age: number): number => 1 + 0.3 * Math.max(0, 1 - age / 0.15),
};
