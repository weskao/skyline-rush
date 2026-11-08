import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { Color, Vector2 } from 'three';

/** Final lens pass: chromatic impact, boost blur, nozzle heat shimmer, vignette and the Garage/Studio gain. */
export function createLensPass(): ShaderPass {
  return new ShaderPass({
    uniforms: { tDiffuse: { value: null }, gain: { value: 1 }, boost: { value: 0 }, impact: { value: 0 }, pressure: { value: 0 }, nozzle: { value: new Vector2() }, time: { value: 0 }, saturation: { value: 1 }, contrast: { value: 1 }, tint: { value: new Color(1, 1, 1) } },
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float gain, boost; uniform float impact; uniform float pressure,time; uniform vec2 nozzle; uniform float saturation,contrast; uniform vec3 tint; varying vec2 vUv;
      void main(){ vec2 delta=vUv-.5; vec2 offset=delta*impact*.008;
        vec2 gas=vUv-nozzle;float mask=exp(-dot(gas*vec2(2.,1.),gas*vec2(2.,1.))*550.);
        vec2 uv=vUv+sin(gas.yx*160.+time*25.)*mask*pressure*.0015;
        vec3 col=texture2D(tDiffuse,uv).rgb;
        col.r=texture2D(tDiffuse,uv+offset).r; col.b=texture2D(tDiffuse,uv-offset).b;
        vec3 blur=texture2D(tDiffuse,vUv-delta*.012).rgb+texture2D(tDiffuse,vUv-delta*.025).rgb;
        col=mix(col,blur*.5,boost*dot(delta,delta)*.65);
        col*=1.-smoothstep(.15,.85,length(delta))*.3;
        float luma=dot(col,vec3(.2126,.7152,.0722)); col=mix(vec3(luma),col,saturation); col=(col-.18)*contrast+.18; col*=tint;
        gl_FragColor=vec4(col*gain,1.); }`, // gain: the Garage/Studio sun/moon lighting, applied before tone mapping; grade: per-environment look (identity by default)
  });
}
