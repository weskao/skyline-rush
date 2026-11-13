import type { Color, Scene, Texture, Vector3, WebGLRenderer } from 'three';
import { createCoastEnvironments } from './coast-environment.ts';
import { COAST_ENV_VARIANTS, coastEnvPlan, type CoastEnvName } from './coast-lighting.ts';
import { coastSkyYaw, coastSunDirection } from './coast-sky.ts';
import type { VfxQuality } from './vfx-settings.ts';

interface Envs { get(name: CoastEnvName): Texture | undefined; preload(names: readonly CoastEnvName[]): Promise<unknown> }
interface GradeUniforms { uniforms: { saturation: { value: number }; contrast: { value: number }; tint: { value: Color } } }
interface Options {
  scene: Pick<Scene, 'environment' | 'environmentIntensity'> & { environmentRotation?: { y: number } }; renderer: Pick<WebGLRenderer, 'toneMappingExposure'>;
  lens: GradeUniforms; room: Texture | null; roomIntensity: number; envs?: Envs; baseUrl?: string;
  /** world.js sets each track's key light on a track change, just before `update`. With an HDRI the light shines from
   *  that HDRI's sun, turned (as the environment and the sky dome are) to Coast's sun azimuth. */
  sun?: { color: Color; intensity: number; position?: Vector3 };
}

/**
 * Per-time-of-day Coast look: environment map and its rotation, exposure, colour grade, bloom and sun. `update` is called every frame and is a
 * string compare unless the track/preset/tier changed. Everything it touches is a texture or uniform swap, so no
 * lit shader recompiles after GO; Low and every other track keep RoomEnvironment and an identity grade.
 */
export function createCoastLook({ scene, renderer, lens, room, roomIntensity, envs, baseUrl = '/', sun }: Options) {
  const environments: Envs = envs ?? createCoastEnvironments(renderer as WebGLRenderer, baseUrl); // tests inject `envs`; the real renderer is a full WebGLRenderer
  const grade = lens.uniforms;
  let key = '';
  let applied: CoastEnvName | null = null, palette: { color: Color; intensity: number; position?: Vector3 } | null = null; // Coast's own sun
  function applyRoom(onCoast: boolean) {
    scene.environment = room; scene.environmentIntensity = roomIntensity;
    grade.saturation.value = grade.contrast.value = 1; grade.tint.value.setRGB(1, 1, 1);
    if (scene.environmentRotation) scene.environmentRotation.y = 0;
    if (sun && palette && onCoast) { // leaving Coast: the new track's block already set it
      sun.color.copy(palette.color); sun.intensity = palette.intensity;
      if (palette.position) sun.position?.copy(palette.position);
    }
    applied = palette = null;
  }
  function applyVariant(name: CoastEnvName, texture: Texture) {
    const v = COAST_ENV_VARIANTS[name];
    scene.environment = texture; scene.environmentIntensity = v.intensity; renderer.toneMappingExposure = v.exposure;
    grade.saturation.value = v.grade.saturation; grade.contrast.value = v.grade.contrast; grade.tint.value.setRGB(...v.grade.tint);
    if (scene.environmentRotation) scene.environmentRotation.y = coastSkyYaw(name);
    if (sun) {
      palette ??= { color: sun.color.clone(), intensity: sun.intensity, position: sun.position?.clone() };
      sun.color.set(v.sun.color); sun.intensity = v.sun.intensity;
      if (sun.position && palette.position) coastSunDirection(name, sun.position).multiplyScalar(palette.position.length());
    }
    applied = name;
  }
  return {
    update(trackId: string, preset: string, quality: VfxQuality) {
      const plan = coastEnvPlan(trackId, preset, quality);
      const next = plan.kind === 'room' ? 'room' : plan.variant;
      if (next === key) return;
      key = next;
      if (plan.kind === 'room') return applyRoom(trackId === 'coast');
      const ready = environments.get(plan.variant);
      if (ready) return applyVariant(plan.variant, ready);
      void environments.preload([plan.variant]).then(() => {
        const texture = environments.get(plan.variant);
        if (key === next && texture) applyVariant(plan.variant, texture);
      });
    },
    /** Bloom strength before boost feedback: the variant's while its HDRI is on screen, else world.js's own. */
    bloomStrength: (fallback: number): number => applied ? COAST_ENV_VARIANTS[applied].bloom.strength : fallback,
    bloomThreshold: (fallback: number): number => applied ? COAST_ENV_VARIANTS[applied].bloom.threshold : fallback,
    dispose() { (environments as { dispose?: () => void }).dispose?.(); },
  };
}
