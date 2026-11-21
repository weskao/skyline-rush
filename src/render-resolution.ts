import type { PerspectiveCamera, WebGLRenderer } from 'three';
import type { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import type { VfxQuality } from './vfx-settings.ts';

export function renderPixelRatioForQuality(quality: VfxQuality, pixelRatio: number, scale: number): number {
  const maxRatio = quality === 'low' ? 1 : quality === 'medium' ? 1.25 : 1.5;
  const adaptiveScale = Number.isFinite(scale) ? Math.max(0.75, Math.min(1, scale)) : 1;
  return Math.min(pixelRatio, maxRatio) * adaptiveScale;
}

/** Keep canvas, postprocessing targets and projection in sync with the saved tier and adaptive scale. */
export function observeRenderSize(canvas: HTMLCanvasElement, renderer: WebGLRenderer, composer: EffectComposer,
  camera: PerspectiveCamera, initialQuality: VfxQuality) {
  let quality = initialQuality, scale = 1, width = 0, height = 0;
  function resize() {
    const box = canvas.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const ratio = renderPixelRatioForQuality(quality, devicePixelRatio, scale);
    const samples = renderSamples(quality);
    const sameSize = width === box.width && height === box.height;
    const sameRatio = Math.abs(ratio - renderer.getPixelRatio()) <= .001;
    if (samples !== composer.renderTarget1.samples) {
      const target = composer.renderTarget1.clone();
      target.samples = samples;
      composer.reset(target);
    }
    if (sameSize && sameRatio) return;
    width = box.width; height = box.height;
    if (!sameRatio) {
      renderer.setPixelRatio(ratio);
      composer.setPixelRatio(ratio);
    }
    if (!sameSize) {
      renderer.setSize(width, height, false);
      composer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
  }
  resize();
  // iOS may dispatch rotation before the new viewport layout has landed.
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  return {
    resize,
    setQuality(next: VfxQuality) { if (quality !== next) { quality = next; resize(); } },
    setScale(next: number) { if (scale !== next) { scale = next; resize(); } },
    dispose() { observer.disconnect(); },
  };
}

/** The composer's scene target needs its own MSAA for the same edges to stay stable in motion. */
export const renderSamples = (quality: VfxQuality): number => quality === 'low' ? 2 : 4;
