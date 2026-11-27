import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import type { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import type { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { Color, DataTexture, Vector2 } from 'three';

// LENS_FX 0 is the idle variant: with impact, boost and pressure all 0 the chromatic, blur and heat-shimmer taps reduce
// exactly to one fetch at vUv, so it skips them (measured in docs/performance/gpu-pipeline.md). src() is the scene
// plus the bloom composite, the sum the bloom used to blend into the scene target.
const fragmentShader = `uniform sampler2D tDiffuse, tBloom; uniform float gain, boost; uniform float impact; uniform float pressure,time; uniform vec2 nozzle; uniform float saturation,contrast; uniform vec3 tint; varying vec2 vUv;
      vec3 src(vec2 p){ return texture2D(tDiffuse,p).rgb+texture2D(tBloom,p).rgb; }
      void main(){ vec2 delta=vUv-.5;
        #if LENS_FX
        vec2 offset=delta*impact*.008;
        vec2 gas=vUv-nozzle;float mask=exp(-dot(gas*vec2(2.,1.),gas*vec2(2.,1.))*550.);
        vec2 uv=vUv+sin(gas.yx*160.+time*25.)*mask*pressure*.0015;
        vec3 col=src(uv);
        col.r=src(uv+offset).r; col.b=src(uv-offset).b;
        vec3 blur=src(vUv-delta*.012)+src(vUv-delta*.025);
        col=mix(col,blur*.5,boost*dot(delta,delta)*.65);
        #else
        vec3 col=src(vUv);
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
export function createLensPass(bloom?: UnrealBloomPass): ShaderPass {
  const black = new DataTexture(new Uint8Array(4), 1, 1); black.needsUpdate = true;
  const pass = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, tBloom: { value: black }, gain: { value: 1 }, boost: { value: 0 }, impact: { value: 0 }, pressure: { value: 0 }, nozzle: { value: new Vector2() }, time: { value: 0 }, saturation: { value: 1 }, contrast: { value: 1 }, tint: { value: new Color(1, 1, 1) } },
    defines: { LENS_FX: 1 },
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader,
  });
  pass.needsSwap = false; // the last pass: it draws to the screen, so nothing reads its output back
  const effects = pass.material, idle = effects.clone();
  idle.defines = { LENS_FX: 0 }; idle.uniforms = effects.uniforms;
  // The bloom's last step added its composite over the 4x MSAA scene target and resolved that target again; the lens
  // adds the composite at each tap instead, so the bloom stops at its half-resolution composite (gpu-pipeline.md).
  const quad = (bloom as unknown as { _fsQuad?: FullScreenQuad } | undefined)?._fsQuad;
  if (bloom && (!quad || !bloom.blendMaterial)) throw new Error('UnrealBloomPass changed: move the bloom fold');
  if (bloom && quad) { const draw = quad.render.bind(quad); quad.render = renderer => { if (quad.material !== bloom.blendMaterial) draw(renderer); }; }
  const { boost, impact, pressure, tBloom } = effects.uniforms, render = pass.render.bind(pass), dispose = pass.dispose.bind(pass);
  let built = false, canvas: HTMLCanvasElement | undefined;
  const rebuild = () => { built = false; };
  pass.render = (...args: Parameters<ShaderPass['render']>) => {
    tBloom.value = bloom?.enabled ? bloom.renderTargetsHorizontal[0].texture : black; // Low skips the bloom: add nothing
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
    (pass.material === effects ? idle : effects).dispose(); black.dispose();
    dispose();
  };
  return pass;
}
