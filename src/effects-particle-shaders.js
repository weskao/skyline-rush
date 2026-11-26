// The pooled race particles (effects.js): soft round points, stretched along their motion for the kind 1
// downwash stream and the kind 2 wall jet.
export const PARTICLE_VERTEX = `attribute vec3 color; attribute float size; attribute float alpha;
      attribute float kind; attribute vec3 velocity;
      varying vec3 vColor; varying float vAlpha; varying float vKind; varying vec2 vDirection;
      uniform float pixelRatio;
      void main(){ if(alpha<=0.){gl_Position=vec4(2.,2.,2.,1.);gl_PointSize=0.;return;} // dead slot: outside the clip volume
        vColor=color; vAlpha=alpha; vKind=kind;
        vec4 p=modelViewMatrix*vec4(position,1.);
        vec4 clip=projectionMatrix*p;
        vec4 tip=projectionMatrix*(p+modelViewMatrix*vec4(velocity*.03,0.));
        vec2 direction=tip.xy/max(.01,tip.w)-clip.xy/max(.01,clip.w);
        vDirection=length(direction)>.00001 ? normalize(direction) : vec2(0.,1.);
        gl_PointSize=clamp(size*220.*pixelRatio/max(1.,-p.z),0.,85.); gl_Position=clip; }`;

export const PARTICLE_FRAGMENT = `varying vec3 vColor; varying float vAlpha; varying float vKind; varying vec2 vDirection;
      void main(){ vec2 uv=(gl_PointCoord-.5)*2.; uv.y=-uv.y;
        float d=length(uv);
        if(vKind>.5 && vKind<1.5) {
          vec2 flow=vec2(dot(uv,vec2(vDirection.y,-vDirection.x)),dot(uv,vDirection));
          d=length(flow*vec2(4.5,1.));
        } else if(vKind>1.5) {
          vec2 flow=vec2(dot(uv,vec2(vDirection.y,-vDirection.x)),dot(uv,vDirection));
          d=length(flow*vec2(2.8,1.));
        }
        if(d>1.) discard;
        float soft=exp(-d*d*4.)*(1.-smoothstep(.65,1.,d));
        gl_FragColor=vec4(vColor,soft*vAlpha); }`;
