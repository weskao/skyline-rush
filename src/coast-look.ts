import type { Color, Scene, Texture, WebGLRenderer } from 'three';
import { createCoastEnvironments } from './coast-environment.ts';
import { COAST_ENV_VARIANTS, coastEnvPlan, type CoastEnvName } from './coast-lighting.ts';
import type { VfxQuality } from './vfx-settings.ts';

interface Envs { get(name: CoastEnvName): Texture | undefined; preload(names: readonly CoastEnvName[]): Promise<unknown> }
interface GradeUniforms { uniforms: { saturation: { value: number }; contrast: { value: number }; tint: { value: Color } } }
interface Options {
  scene: Pick<Scene, 'environment' | 'environmentIntensity'>; renderer: Pick<WebGLRenderer, 'toneMappingExposure'>;
  lens: GradeUniforms; room: Texture | null; roomIntensity: number; envs?: Envs; baseUrl?: string;
}

/**
 * Per-time-of-day Coast look: environment map, exposure and colour grade. `update` is called every frame and is a
 * string compare unless the track/preset/tier changed. Everything it touches is a texture or uniform swap, so no
 * lit shader recompiles after GO; Low and every other track keep RoomEnvironment and an identity grade.
 */
export function createCoastLook({ scene, renderer, lens, room, roomIntensity, envs, baseUrl = '/' }: Options) {
  const environments: Envs = envs ?? createCoastEnvironments(renderer as WebGLRenderer, baseUrl); // tests inject `envs`; the real renderer is a full WebGLRenderer
  const grade = lens.uniforms;
  let key = '';
  function applyRoom() {
    scene.environment = room; scene.environmentIntensity = roomIntensity;
    grade.saturation.value = grade.contrast.value = 1; grade.tint.value.setRGB(1, 1, 1);
  }
  function applyVariant(name: CoastEnvName, texture: Texture) {
    const v = COAST_ENV_VARIANTS[name];
    scene.environment = texture; scene.environmentIntensity = v.intensity; renderer.toneMappingExposure = v.exposure;
    grade.saturation.value = v.grade.saturation; grade.contrast.value = v.grade.contrast; grade.tint.value.setRGB(...v.grade.tint);
  }
  return {
    update(trackId: string, preset: string, quality: VfxQuality) {
      const plan = coastEnvPlan(trackId, preset, quality);
      const next = plan.kind === 'room' ? 'room' : plan.variant;
      if (next === key) return;
      key = next;
      if (plan.kind === 'room') return applyRoom();
      const ready = environments.get(plan.variant);
      if (ready) return applyVariant(plan.variant, ready);
      void environments.preload([plan.variant]).then(() => {
        const texture = environments.get(plan.variant);
        if (key === next && texture) applyVariant(plan.variant, texture);
      });
    },
    dispose() { (environments as { dispose?: () => void }).dispose?.(); },
  };
}
