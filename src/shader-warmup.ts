// WebKit (iPhone Safari/Chrome) builds shaders and Metal pipelines at first draw. An effect that first appears
// mid-race (airflow toggle, boost afterimages, shockwave, top-speed LED flow, a rare pickup tier) therefore stalled
// the frame and flashed black patches. Drawing the whole scene graph once, hidden objects included, into the
// composer's own scene target right before the real frame overwrites it builds every pipeline up front, with no
// per-module "warmup" flags: a material only has to be attached to some object in the scene when this runs.
// Hidden lights stay hidden: three.js bakes the visible-light count into every lit shader's cache key, so unhiding
// them would build the wrong variants (and toggling a light's visibility mid-race recompiles every lit material).
import type { Camera, Object3D, Scene, WebGLRenderer, WebGLRenderTarget } from 'three';

// Shader pipeline warmup must restore every object after the pre-render.
export function warmupShaders(
  renderer: Pick<WebGLRenderer, 'setRenderTarget' | 'render'>,
  scene: Scene,
  camera: Camera,
  target: WebGLRenderTarget | null,
): number {
  const touched: Array<[Object3D, boolean, boolean]> = [];
  scene.traverse(object => {
    if (object.isLight || (object.visible && !object.frustumCulled)) return;
    touched.push([object, object.visible, object.frustumCulled]);
    object.visible = true; object.frustumCulled = false;
  });
  renderer.setRenderTarget(target);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
  for (const [object, visible, frustumCulled] of touched) { object.visible = visible; object.frustumCulled = frustumCulled; }
  return touched.length;
}
