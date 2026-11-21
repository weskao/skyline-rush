import { emp } from '../../effects-palette.ts';

// EMP on the status shell (rival-status-tint.ts composes this chunk into its one fragment program): thin golden
// lightning crawls over a nearly clear body. Arcs are the zero lines of a kinked noise field, about a pixel wide at
// any distance (fwidth), cut into branches by a mask that drifts along the car; seams at the skirt, bumpers and wheel
// arches carry energy pulses. Warm-white cores, gold falloff. They writhe smoothly: nothing re-strikes or strobes.

export const EMP_SHELL = {
  color: emp,
  /** May use the shell's `rim` (0 on Low) and `time` uniforms and its `hash()` / `noise()`. `p` is the point on the
   *  hull in shell units (x right, y up, z along the car; the body ends near +-0.85). `seed` < 0 is the player. */
  glsl: `float empLine(float n,float w){return 1.-smoothstep(w*.5,w*1.7,abs(n-.5));}
  vec3 empShell(vec3 p,vec3 tint,float body,float edge,float age,float seed,float level){
    bool player=seed<0.;float t=time*(player?.45:.7)+seed*3.;
    float impact=1.-smoothstep(0.,.12,age); // 0-0.10 s: one gold pulse
    float reach=clamp((age-.1)/.35,0.,1.)*1.6; // 0.10-0.45 s: the arcs spread out from the middle of the car
    float shown=1.-smoothstep(reach-.3,reach,length(p));
    float core=0.,glow=0.;
    if(rim>0.||player){
      vec3 kink=vec3(noise(p*8.+t),noise(p*8.-t+17.),0.)*.2;
      float n=noise(p*vec3(2.2,2.6,1.5)+kink+vec3(0.,0.,t*.4)+seed),w=max(fwidth(n),.006); // a floor: a close car still shows lines a few pixels wide
      float crawl=smoothstep(.34,.6,noise(p*1.4-vec3(0.,0.,t*.9)+seed*1.7)); // branches, not closed loops
      float fine=1.-.7*smoothstep(.05,.15,w); // far away the field is under-sampled: dim it, never smear it over the body
      core=empLine(n,w)*crawl*fine;glow=exp(-abs(n-.5)/(w*2.5))*crawl*fine;
      if(rim>0.){float f=noise(p*vec3(5.,5.5,3.4)+kink*1.6+vec3(t*.3,0.,0.)+5.),fw=max(fwidth(f),.006);
        core=max(core,.7*empLine(f,fw)*smoothstep(.15,.6,glow));} // forks off the main arcs
      float flow=.5+.5*sin(p.z*9.-time*4.+seed); // energy running along the seams
      float seam=max(1.-smoothstep(0.,.02,abs(p.y+.6+.03*kink.x)),1.-smoothstep(0.,.025,abs(abs(p.z)-.8+.03*kink.y)));
      seam=max(seam,(1.-smoothstep(0.,.025,abs(length(vec2(abs(p.z)-.56,p.y+.83))-.33)))*step(.45,abs(p.x)));
      core=max(core,seam*flow*.8);glow=max(glow,seam*.3);}
    core*=shown;glow*=shown;
    return tint*(body*.15+rim*edge*(player?.18:.35)+glow*.3+core*.9+impact*.9)+vec3(1.,.93,.75)*level*(core*1.7+impact*.35);}`,
  /** Brightness factor per frame on a rival (the player and reduced motion stay steady): a slow surge about twice a
   *  second, under the three-flashes-a-second photosensitivity limit. */
  flicker: (time: number, i: number): number => 0.8 + 0.2 * Math.sin(time * 13.2 + i * 2.1),
  /** Shell scale since the hit: the hit bursts the shell out. */
  pop: (age: number): number => 1 + 0.3 * Math.max(0, 1 - age / 0.15),
};
