// Live pickup previews for the guide: ONE WebGL context draws every visible card through the race's own pickup
// renderer (pickup-markers.js) and copies each frame into that card's 2D canvas.
import * as THREE from 'three';
import { createCarEnvironment } from './car-reflections.ts';
import { PICKUP_SIZES } from './pickup-art.js';
import { createPickupMarkers } from './pickup-markers.js';
import type { PickupTier } from './pickup-models.ts';

/** Half the framed height in model units (before PICKUP_SIZES): the model plus its hover travel. */
export const PREVIEW_EXTENT: Readonly<Record<PickupTier, number>> = Object.freeze({ cell: 1.2, can: 1.2, tank: 1.6, overcharge: 1.95 });
const MAX_PIXEL_RATIO = 2;

interface View { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D; tier: PickupTier; visible: boolean; onFrame(animated: boolean): void }
type Stage = ReturnType<typeof createStage>;

function createStage() {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12; // the race renderer's exposure (world.js)
  const envMap = createCarEnvironment(renderer), markers = createPickupMarkers(1, { renderer, envMap });
  const scene = new THREE.Scene(), key = new THREE.DirectionalLight(0xfff3df, 2.2), edge = new THREE.DirectionalLight(0x84d9ff, 1.6);
  key.position.set(-3, 5, 7);
  edge.position.set(4, 1, -4);
  scene.add(...markers.objects, key, edge, new THREE.HemisphereLight(0xd7efff, 0x26314c, 1));
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 50);
  camera.position.set(4, 2.7, 5.5).normalize().multiplyScalar(8);
  camera.lookAt(0, 0, 0);
  const marker = new THREE.Object3D(), item = { tier: 'cell' as PickupTier, distance: 0, altitude: 2 };
  let width = 0, height = 0;
  return {
    ready: markers.ready as Promise<void>,
    draw(view: View, seconds: number, still: boolean): void {
      const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO), { canvas, tier } = view;
      const w = Math.max(1, Math.round(canvas.clientWidth * ratio)), h = Math.max(1, Math.round(canvas.clientHeight * ratio));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      if (width !== w || height !== h) renderer.setSize(width = w, height = h, false);
      const extent = PREVIEW_EXTENT[tier] * PICKUP_SIZES[tier];
      camera.left = -extent * w / h; camera.right = extent * w / h; camera.top = extent; camera.bottom = -extent;
      camera.updateProjectionMatrix();
      item.tier = tier;
      markers.frame(seconds, still, true);
      markers.pool.begin();
      marker.position.set(0, 0, 0);
      markers.place(marker, item, seconds, still, camera.quaternion);
      marker.updateMatrix();
      markers.pool.add(tier, marker.matrix);
      markers.pool.end();
      markers.end();
      renderer.render(scene, camera);
      view.context.clearRect(0, 0, w, h);
      view.context.drawImage(renderer.domElement, 0, 0);
    },
    dispose(): void { markers.dispose(); envMap.dispose(); renderer.dispose(); renderer.forceContextLoss(); },
  };
}

const views = new Set<View>();
let stage: Stage | null = null, motion: MediaQueryList | null = null, frame = 0;

function tick(timestamp: number): void {
  frame = 0;
  if (!stage || !motion) return;
  const still = motion.matches;
  let drawn = false;
  for (const view of views) if (view.visible) { stage.draw(view, timestamp / 1000, still); view.onFrame(!still); drawn = true; }
  if (drawn && !still) frame = requestAnimationFrame(tick); // reduced motion: one still frame per change
}
function schedule(): void { if (!frame) frame = requestAnimationFrame(tick); }

/** Draws `tier` into `canvas` while it is on screen. Throws when WebGL is unavailable: the caller keeps its image.
 *  `onFrame(animated)` runs after every drawn frame. Returns the unmount function. */
export function mountPickupPreview(canvas: HTMLCanvasElement, tier: PickupTier, onFrame: (animated: boolean) => void): () => void {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('2D canvas unavailable');
  if (!stage) {
    const created = stage = createStage();
    motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    motion.addEventListener('change', schedule);
    void created.ready.then(schedule); // the loaded models replace the stand-ins, also on a still frame
  }
  const view: View = { canvas, context, tier, visible: false, onFrame };
  views.add(view);
  const seen = new IntersectionObserver(entries => { view.visible = entries[0]?.isIntersecting === true; schedule(); }, { threshold: .05 });
  const sized = new ResizeObserver(schedule);
  seen.observe(canvas);
  sized.observe(canvas);
  return () => {
    seen.disconnect();
    sized.disconnect();
    views.delete(view);
    if (views.size) return;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    motion?.removeEventListener('change', schedule);
    stage?.dispose();
    stage = motion = null;
  };
}
