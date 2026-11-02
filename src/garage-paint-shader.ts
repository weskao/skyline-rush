import * as THREE from 'three';
import type { VfxQuality } from './vfx-settings.ts';

// Garage-only PBR sweep: standard Three.js lighting, no new draw calls or geometry.
export function createGaragePaintSweep(material: THREE.MeshPhysicalMaterial) {
  const uniforms = { sweep: { value: 0 }, strength: { value: 0 } };
  material.onBeforeCompile = shader => {
    shader.uniforms.garagePaintSweep = uniforms.sweep;
    shader.uniforms.garagePaintStrength = uniforms.strength;
    shader.vertexShader = shader.vertexShader.replace('#include <common>',
      '#include <common>\nvarying vec3 vGaragePaintPosition;');
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nvGaragePaintPosition = position;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>',
      '#include <common>\nvarying vec3 vGaragePaintPosition;\nuniform float garagePaintSweep;\nuniform float garagePaintStrength;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>',
      '#include <color_fragment>\n' +
      'float scan = vGaragePaintPosition.x * 0.66 + vGaragePaintPosition.z * 0.23;\n' +
      'float center = sin(garagePaintSweep * 0.44) * 2.3;\n' +
      'float ribbon = exp(-pow((scan - center) * 5.3, 2.0));\n' +
      'float halo = exp(-pow((scan - center + 0.17) * 1.85, 2.0));\n' +
      'diffuseColor.rgb += (vec3(0.19, 0.61, 0.92) * ribbon + ' +
      'vec3(0.60, 0.80, 1.0) * halo * 0.36) * garagePaintStrength;');
  };
  material.customProgramCacheKey = () => 'garage-paint-sweep-v1';
  return {
    uniforms,
    update(time: number, quality: VfxQuality, enabled: boolean, reducedMotion: boolean) {
      const strength = !enabled || reducedMotion || quality === 'low' ? 0
        : quality === 'medium' ? 0.11 : 0.23;
      uniforms.strength.value = strength;
      uniforms.sweep.value = strength > 0 ? time : 0;
    },
  };
}
