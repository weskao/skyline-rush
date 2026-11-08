// Task 5 wet road, lights only: the env map already reflects the sky and lit surfaces in the puddles, but not the
// rail lights, lamps, windows, tail lights or the sun. This pass mirrors only those unlit light sources (one layer)
// at half resolution under the road plane; the Coast road shader adds it on top. Benchmarked on Coast rain High:
// +0.3 ms per frame against +2.2 ms for a full planar Reflector (audits/task5/wet-bench). High and Ultra only.
import * as THREE from 'three';
import { coastWetness } from './coast-road-material.ts';
import type { VfxQuality } from './vfx-settings.ts';

export const REFLECT_LAYER = 5;
/** Reflection strength for the race preset: wet presets on High (Ultra is High plus a flag); 0 means no pass. */
export const wetReflectionStrength = (quality: VfxQuality, preset: string): number =>
  quality === 'high' ? coastWetness(preset) * 0.8 : 0;
/** Opaque unlit meshes are the scene's light sources; transparent ghosts, decals and lit surfaces stay out. */
export const isLightSource = (object: THREE.Object3D): boolean => {
  const { isMesh, material } = object as THREE.Mesh;
  return !!isMesh && !Array.isArray(material) && (material as THREE.MeshBasicMaterial).isMeshBasicMaterial === true && !material.transparent;
};

interface MirrorRenderer {
  getRenderTarget(): unknown; setRenderTarget(target: THREE.WebGLRenderTarget | null): void;
  render(scene: THREE.Scene, camera: THREE.Camera): void; clear(): void; autoClear: boolean;
  getDrawingBufferSize(target: THREE.Vector2): THREE.Vector2;
  xr: { enabled: boolean }; shadowMap: { autoUpdate: boolean }; state: { buffers: { depth: { setMask(mask: boolean): void } } };
}

const BIAS = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);

export function createWetReflection() {
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
  const mirror = new THREE.PerspectiveCamera();
  mirror.layers.set(REFLECT_LAYER);
  const uniforms = { reflectMap: { value: target.texture }, reflectMatrix: { value: new THREE.Matrix4() }, reflectStrength: { value: 0 } };
  const size = new THREE.Vector2(), look = new THREE.Vector3(), plane = new THREE.Plane(), clip = new THREE.Vector4(), q = new THREE.Vector4();
  const up = new THREE.Vector3(0, 1, 0);

  /** Mirror `camera` in the horizontal plane y = height (the classic road is flat: geometry.ts setRoadRow). */
  function place(camera: THREE.PerspectiveCamera, height: number): void {
    mirror.position.setFromMatrixPosition(camera.matrixWorld);
    look.set(0, 0, -1).transformDirection(camera.matrixWorld).add(mirror.position);
    mirror.position.y = 2 * height - mirror.position.y;
    look.y = 2 * height - look.y;
    mirror.up.set(0, 1, 0).transformDirection(camera.matrixWorld); mirror.up.y = -mirror.up.y;
    mirror.lookAt(look);
    mirror.far = camera.far;
    mirror.updateMatrixWorld();
    mirror.projectionMatrix.copy(camera.projectionMatrix);
    uniforms.reflectMatrix.value.copy(BIAS).multiply(mirror.projectionMatrix).multiply(mirror.matrixWorldInverse);
    // Oblique near plane at the road (Lengyel, as three's Reflector): nothing below the road draws into the mirror.
    plane.setFromNormalAndCoplanarPoint(up, look.set(0, height, 0)).applyMatrix4(mirror.matrixWorldInverse);
    clip.set(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant);
    const p = mirror.projectionMatrix.elements;
    q.set((Math.sign(clip.x) + p[8]!) / p[0]!, (Math.sign(clip.y) + p[9]!) / p[5]!, -1, (1 + p[10]!) / p[14]!);
    clip.multiplyScalar(2 / clip.dot(q));
    p[2] = clip.x; p[6] = clip.y; p[10] = clip.z + 1; p[14] = clip.w;
  }

  return {
    target, uniforms,
    setStrength(value: number): void { uniforms.reflectStrength.value = value; },
    /** Put every light source on the mirror layer; call when the scene's cars or props change (race start). */
    tag(scene: THREE.Object3D): void { scene.traverse(o => { if (isLightSource(o)) o.layers.enable(REFLECT_LAYER); }); },
    /** Road onBeforeRender: refresh the mirror for this camera. No work while the strength is 0. */
    render(renderer: MirrorRenderer, scene: THREE.Scene, camera: THREE.Camera, height: number): void {
      if (uniforms.reflectStrength.value <= 0 || !(camera as THREE.PerspectiveCamera).isPerspectiveCamera) return;
      renderer.getDrawingBufferSize(size);
      const w = Math.max(1, Math.round(size.x / 2)), h = Math.max(1, Math.round(size.y / 2));
      if (target.width !== w || target.height !== h) target.setSize(w, h);
      place(camera as THREE.PerspectiveCamera, height);
      const previous = renderer.getRenderTarget(), background = scene.background, xr = renderer.xr.enabled, shadows = renderer.shadowMap.autoUpdate;
      scene.background = null; // cleared to black: the pass only adds light
      renderer.xr.enabled = false; renderer.shadowMap.autoUpdate = false;
      renderer.setRenderTarget(target);
      renderer.state.buffers.depth.setMask(true);
      if (!renderer.autoClear) renderer.clear();
      renderer.render(scene, mirror);
      renderer.setRenderTarget(previous as THREE.WebGLRenderTarget | null);
      renderer.xr.enabled = xr; renderer.shadowMap.autoUpdate = shadows;
      scene.background = background;
    },
    dispose(): void { target.dispose(); },
  };
}
export type WetReflection = ReturnType<typeof createWetReflection>;
