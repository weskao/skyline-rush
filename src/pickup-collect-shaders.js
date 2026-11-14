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

export const BODY_VERTEX = `uniform vec2 zRange,yRange;uniform float inflate;uniform mat4 vehicleFromBody;
  varying vec3 vNormal,vView;varying vec2 vBody;
  void main(){
    vec4 mv=modelViewMatrix*vec4(position+normal*inflate,1.);
    vec3 local=(vehicleFromBody*vec4(position,1.)).xyz;
    vBody=vec2((local.z-zRange.x)/max(1e-4,zRange.y-zRange.x),
      (local.y-yRange.x)/max(1e-4,yRange.y-yRange.x));
    vNormal=normalMatrix*normal;vView=-mv.xyz;
    gl_Position=projectionMatrix*mv;
  }`;

export const BODY_FRAGMENT = `uniform vec3 primary,secondary;
  uniform float progress,strength,tier;
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
    gl_FragColor=vec4(mix(primary,accent,clamp(echo+.34*band+.23*rim,0.,1.))*(1.+.35*band),min(.69,alpha));
    #include <colorspace_fragment>
  }`;
