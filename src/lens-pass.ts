import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { Color, Vector2 } from 'three';

// LENS_FX 0 is the idle variant: with impact, boost and pressure all 0 the chromatic, blur and heat-shimmer taps reduce
// exactly to one fetch at vUv, so it skips them (measured in docs/performance/gpu-pipeline.md).
const fragmentShader = `uniform sampler2D tDiffuse; uniform float gain, boost; uniform float impact; uniform float pressure,time; uniform vec2 nozzle; uniform float saturation,contrast; uniform vec3 tint; varying vec2 vUv;
      void main(){ vec2 delta=vUv-.5;
        #if LENS_FX
        vec2 offset=delta*impact*.008;
        vec2 gas=vUv-nozzle;float mask=exp(-dot(gas*vec2(2.,1.),gas*vec2(2.,1.))*550.);
        vec2 uv=vUv+sin(gas.yx*160.+time*25.)*mask*pressure*.0015;
        vec3 col=texture2D(tDiffuse,uv).rgb;
        col.r=texture2D(tDiffuse,uv+offset).r; col.b=texture2D(tDiffuse,uv-offset).b;
        vec3 blur=texture2D(tDiffuse,vUv-delta*.012).rgb+texture2D(tDiffuse,vUv-delta*.025).rgb;
        col=mix(col,blur*.5,boost*dot(delta,delta)*.65);
        #else
        vec3 col=texture2D(tDiffuse,vUv).rgb;
        #endif
        col*=1.-smoothstep(.15,.85,length(delta))*.3;
        float luma=dot(col,vec3(.2126,.7152,.0722)); col=mix(vec3(luma),col,saturation); col=(col-.18)*contrast+.18; col*=tint;
        gl_FragColor=vec4(col*gain,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`; // gain: the Garage/Studio sun/moon lighting, applied before tone mapping; grade: per-environment look (identity by default)

/**
 * Final lens pass: chromatic impact, boost blur, nozzle heat shimmer, vignette and the Garage/Studio gain, then the
 * renderer's tone mapping (ACES, live exposure) and sRGB encoding straight to the screen. Folding the OutputPass in
 * here means no second full-size MSAA HalfFloat target is written and resolved each frame (docs/performance/gpu-pipeline.md).
 */
export function createLensPass(): ShaderPass {
  const pass = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, gain: { value: 1 }, boost: { value: 0 }, impact: { value: 0 }, pressure: { value: 0 }, nozzle: { value: new Vector2() }, time: { value: 0 }, saturation: { value: 1 }, contrast: { value: 1 }, tint: { value: new Color(1, 1, 1) } },
    defines: { LENS_FX: 1 },
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader,
  });
  pass.needsSwap = false; // the last pass: it draws to the screen, so nothing reads its output back
  const effects = pass.material, idle = effects.clone();
  idle.defines = { LENS_FX: 0 }; idle.uniforms = effects.uniforms;
  const { boost, impact, pressure } = effects.uniforms, render = pass.render.bind(pass), dispose = pass.dispose.bind(pass);
  let built = false, canvas: HTMLCanvasElement | undefined;
  const rebuild = () => { built = false; };
  pass.render = (...args: Parameters<ShaderPass['render']>) => {
    const active = boost.value !== 0 || impact.value !== 0 || pressure.value !== 0;
    // WebKit builds a pipeline at its first draw: draw the other variant first (the real frame overwrites it) so the
    // first boost or impact never compiles mid-race; a restored context has lost both.
    if (!built) {
      built = true;
      if (!canvas) { canvas = args[0].domElement; canvas.addEventListener('webglcontextrestored', rebuild); }
      pass.material = active ? idle : effects; render(...args);
    }
    pass.material = active ? effects : idle;
    render(...args);
  };
  pass.dispose = () => {
    canvas?.removeEventListener('webglcontextrestored', rebuild);
    (pass.material === effects ? idle : effects).dispose();
    dispose();
  };
  return pass;
}
