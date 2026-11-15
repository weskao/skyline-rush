// A shared pickup-point shader and a shared car-surface shader. The palette and motion are set per tier.
export const CONTACT_VERTEX = `varying vec2 vPoint;
  void main(){vPoint=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;

export const CONTACT_FRAGMENT = `varying vec2 vPoint;
  uniform vec3 primary,secondary;
  uniform float progress,strength,tier;
  const float TAU=6.2831853;
  void main(){
    float r=length(vPoint),a=atan(vPoint.y,vPoint.x+1e-6);
    float ease=1.-pow(max(0.,1.-progress),2.);
    float front=.12+ease*.69;
    float arc=exp(-abs(r-front)*75.);
    float echo=exp(-abs(r-front+.07)*42.);
    float tail=exp(-abs(r-front+.13)*13.)*.22;
    float ticks=pow(max(0.,.5+.5*cos(a*24.+progress*4.)),6.);
    float mark=0.;
    vec3 accent=secondary;
    if(tier<.5){
      float split=abs(sin(a*3.+r*13.+sin(r*36.)*.42));
      mark=pow(max(0.,1.-split),7.)*exp(-abs(r-front+.10)*12.);
      arc*=.52+.48*abs(sin(a*7.+progress*7.));
    }else if(tier<1.5){
      float vent=.5+.5*cos(a*2.);
      float heat=r+(sin(a*13.+progress*13.)+sin(a*7.-r*32.))*.026;
      mark=vent*exp(-abs(heat-front+.12)*12.);
      arc*=.52+.48*vent;
    }else if(tier<2.5){
      float hex=r*cos(mod(a+TAU/12.,TAU/6.)-TAU/12.);
      arc=exp(-abs(hex-front*.87)*63.);
      mark=exp(-abs(hex-front*.74)*63.)*(.25+.75*ticks);
    }else{
      float facets=r*cos(mod(a+TAU/8.,TAU/4.)-TAU/8.);
      mark=exp(-abs(facets-front*.61)*59.);
      accent=.57+.38*cos(a+progress*3.+vec3(0.,2.1,4.2));
      echo*=.5+.5*sin(a*12.-progress*9.);
    }
    float envelope=smoothstep(0.,.14,progress)*pow(max(0.,1.-progress),1.12)*(1.-smoothstep(.84,.99,r));
    float opacity=(arc*.66+echo*.24+tail+mark*.42+ticks*echo*.25)*envelope*strength;
    gl_FragColor=vec4(mix(primary,accent,clamp(mark+echo*.42,0.,1.))*(1.+.38*arc),min(.67,opacity));
    #include <colorspace_fragment>
  }`;

export const BODY_VERTEX = `uniform vec2 zRange,yRange;uniform float inflate;uniform mat4 vehicleInverse;
  varying vec3 vNormal,vView;varying vec2 vBody;
  void main(){
    vec4 mv=modelViewMatrix*vec4(position+normal*inflate,1.);
    vec3 local=(vehicleInverse*modelMatrix*vec4(position,1.)).xyz; // per mesh: body and every painted part
    vBody=vec2((local.z-zRange.x)/max(1e-4,zRange.y-zRange.x),
      (local.y-yRange.x)/max(1e-4,yRange.y-yRange.x));
    vNormal=normalMatrix*normal;vView=-mv.xyz;
    gl_Position=projectionMatrix*mv;
  }`;

export const BODY_FRAGMENT = `uniform vec3 primary,secondary;
  uniform float progress,strength,tier,paintLight;
  varying vec3 vNormal,vView;varying vec2 vBody;
  void main(){
    vec2 p=clamp(vBody,0.,1.);
    float facing=abs(dot(normalize(vNormal+vec3(0.,0.,1e-5)),normalize(vView+vec3(0.,0.,1e-5))));
    float rim=pow(max(0.,1.-facing),2.);
    float front=mix(-.08,1.13,progress),band,echo=0.;
    vec3 accent=secondary;
    if(tier<.5){
      float u=p.x+.038*sin(p.y*27.+p.x*14.)+.016*sin(p.y*55.);
      band=exp(-abs(u-front)*15.);
      echo=exp(-abs(u-front+.14)*13.)*.55;
    }else if(tier<1.5){
      float hot=smoothstep(.44,.93,p.x);
      band=hot*exp(-abs(p.x-mix(.5,1.12,progress))*9.)*(.72+.28*sin(p.y*21.-progress*15.));
      echo=hot*(1.-p.y)*.32;
    }else if(tier<2.5){
      band=exp(-abs(p.y-front)*12.);
      echo=exp(-abs(p.y-front+.22)*12.)*.72;
    }else{
      band=exp(-abs(p.x-front)*13.)+exp(-abs(p.x-(1.-front))*14.);
      echo=exp(-abs(p.y-front+.14)*12.)*.52;
      accent=.55+.42*cos(p.x*5.+p.y*4.-progress*4.+vec3(0.,2.1,4.2));
    }
    float life=smoothstep(0.,.09,progress)*pow(max(0.,1.-progress),.95)*strength;
    float alpha=(band*(.66+.29*rim)+echo*.55+rim*.25)*life;
    vec3 tint=mix(primary,accent,clamp(echo+.34*band+.23*rim,0.,1.))*(1.+.35*band);
    // Light paint: a pale tint barely differs from the body, so deepen it (cube = saturate) and lay it on thicker.
    vec3 deep=min(tint,vec3(1.));
    tint=mix(tint,deep*deep*deep,paintLight);
    // Same visible change as on a dark paint: a light body needs roughly 2.6x the cover to read as tinted.
    gl_FragColor=vec4(tint,min(.69+.13*paintLight,alpha*(1.+1.6*paintLight)));
    #include <colorspace_fragment>
  }`;

export const STREAK_VERTEX = `varying vec2 vUv;
  void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;

export const STREAK_FRAGMENT = `varying vec2 vUv;uniform vec3 tint,core;uniform float age,power;
  void main(){
    float d=abs(vUv.y*2.-1.), center=exp(-d*d*30.), halo=exp(-d*d*5.);
    float ends=smoothstep(0.,.10,vUv.x)*(1.-smoothstep(.76,1.,vUv.x));
    float wave=.55+.45*pow(max(0.,.5+.5*sin(vUv.x*34.-age*29.)),3.);
    gl_FragColor=vec4(mix(tint,core,center*.74),min(.9,(center*.72+halo*.34)*ends*power*wave));
    #include <colorspace_fragment>
  }`;

export const HOOP_VERTEX = `uniform float width,halo;varying vec2 vUv;varying vec3 vNormal,vView;
  void main(){
    vUv=uv;vec3 axis=vec3(normalize(position.xy),0.);
    vec4 at=modelViewMatrix*vec4(axis+(position-axis)*width*mix(1.,2.65,halo),1.);
    vView=-at.xyz;vNormal=normalMatrix*normal;gl_Position=projectionMatrix*at;
  }`;

export const HOOP_FRAGMENT = `uniform vec3 tint,core;uniform float age,power,prism,phase,halo;
  varying vec2 vUv;varying vec3 vNormal,vView;
  void main(){
    float angle=vUv.x*6.2831853;
    float side=clamp(dot(normalize(vView+vec3(0.,0.,1e-5)),normalize(vNormal)),0.,1.);
    float wave=.5+.5*cos(angle*2.-age*9.+phase);
    float head=pow(max(0.,.5+.5*cos(angle-age*7.+phase)),10.);
    vec3 spectrum=.52+.47*cos(angle+vec3(0.,2.0944,4.1888)-age*3.5+phase);
    vec3 color=mix(mix(tint,spectrum,prism),core,(.13+.33*side)*(.86-.21*prism));
    float profile=(.35+.65*pow(max(0.,side),.8))*(.72+.28*wave);
    float alpha=mix(profile, pow(max(0.,side),2.)*.14,halo)*power;
    gl_FragColor=vec4(color*(1.+.35*head),min(.9,alpha));
    #include <colorspace_fragment>
  }`;

// The ellipse follows the fitted vehicle transform. Extrude the gold tube in
// view space so changing the vehicle proportions never flattens its cross-section.
export const TANK_HOOP_VERTEX = `uniform float tubeWidth,lift;
  varying vec2 vUv;varying vec3 vNormal,vView;varying float roadHeight;
  void main(){
    vUv=uv;
    vec2 radial=normalize(position.xy);
    vec3 across=normalize(normalMatrix*vec3(radial,0.));
    vec3 normal=normalize(normalMatrix*vec3(0.,0.,1.));
    float section=vUv.y*6.2831853;
    vNormal=across*cos(section)+normal*sin(section);
    vec4 at=modelViewMatrix*vec4(radial,0.,1.)+vec4(vNormal*tubeWidth,0.);
    vView=-at.xyz;roadHeight=lift+tubeWidth*sin(section);
    gl_Position=projectionMatrix*at;
  }`;

export const TANK_HOOP_FRAGMENT = `uniform vec3 tint,core;uniform float age,power,phase;
  varying vec2 vUv;varying vec3 vNormal,vView;varying float roadHeight;
  void main(){
    float angle=vUv.x*6.2831853;
    float side=clamp(dot(normalize(vView+vec3(0.,0.,1e-5)),normalize(vNormal)),0.,1.);
    float wave=.5+.5*cos(angle*2.-age*9.+phase);
    float head=pow(max(0.,.5+.5*cos(angle-age*7.+phase)),10.);
    vec3 color=mix(tint,core,(.13+.33*side)*.86);
    float profile=(.35+.65*pow(max(0.,side),.8))*(.72+.28*wave);
    float fade=smoothstep(.02,.27,roadHeight);
    gl_FragColor=vec4(color*(1.08+.52*side+.44*head),min(.9,power*profile*fade));
    #include <colorspace_fragment>
  }`;

export const TANK_HALO_VERTEX = `uniform float tubeWidth;varying vec2 vUv;
  void main(){
    vUv=uv;
    float angle=uv.x*6.2831853;
    vec2 radial=vec2(cos(angle),sin(angle));
    vec4 at=modelViewMatrix*vec4(radial,0.,1.);
    vec3 tangent=(modelViewMatrix*vec4(-radial.y,radial.x,0.,0.)).xyz;
    vec3 side=cross(tangent,-at.xyz);
    at.xyz+=side/max(length(side),1e-5)*(uv.y*2.-1.)*tubeWidth*2.65;
    gl_Position=projectionMatrix*at;
  }`;

export const TANK_HALO_FRAGMENT = `uniform vec3 tint,core;uniform float age,power;varying vec2 vUv;
  void main(){
    float d=abs(vUv.y*2.-1.);
    float center=exp(-d*d*30.), halo=exp(-d*d*5.);
    float wave=.55+.45*pow(max(0.,.5+.5*sin(vUv.x*34.-age*29.)),3.);
    float alpha=(center*.7+halo*.31)*power*.27*mix(1.,wave,.08);
    gl_FragColor=vec4(mix(tint,core,center*.74),alpha);
    #include <colorspace_fragment>
  }`;
