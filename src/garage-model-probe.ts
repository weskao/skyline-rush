// Garage-only `?model=probe` adapter. Contract: docs/designs/3d-pipeline/phase2-model-contracts.md §2.
// world.js imports this module dynamically only with the query, so production never loads the GLB code.
import { Scene } from 'three';
import type { Camera, Object3D, WebGLRenderer } from 'three';
import { createModelCache } from './asset-model-loader.ts';
import type { ModelHandle } from './asset-model-loader.ts';

const PROBE_ID = 'pipeline-probe';

/** The Garage Studio stage: its scene, and a slot that swaps the procedural car body for a model. */
export interface ProbeStage { scene: Scene; setModel(model: Object3D | null): void }

export function createGarageModelProbe(renderer: WebGLRenderer, camera: Camera, baseUrl: string) {
  const cache = createModelCache({ baseUrl });
  let pending: AbortController | null = null;
  let shown: { stage: ProbeStage; handle: ModelHandle } | null = null;
  // Restored contexts lose every program; build them again before the next Studio frame.
  renderer.domElement.addEventListener('webglcontextrestored', () => {
    if (shown) void renderer.compileAsync(shown.stage.scene, camera);
  });

  async function enter(stage: ProbeStage, quality: string): Promise<void> {
    const controller = pending = new AbortController();
    const result = await cache.load(PROBE_ID, { signal: controller.signal, quality: quality === 'low' ? 'low' : 'high' })
      .catch(() => null); // AbortError: the Studio closed while loading
    if (!result || controller.signal.aborted) return;
    if (result.kind === 'fallback') {
      console.warn(`[model-probe] ${result.id} → ${result.fallback} (${result.reason})`);
      return;
    }
    const model = result.instance();
    // Warm up with the stage's lights, fog and environment before the Studio ever draws the probe.
    await renderer.compileAsync(new Scene().add(model), camera, stage.scene);
    if (controller.signal.aborted) { result.release(); return; }
    stage.setModel(model);
    shown = { stage, handle: result };
  }

  function leave(): void {
    pending?.abort();
    pending = null;
    if (!shown) return;
    shown.stage.setModel(null);
    shown.handle.release();
    shown = null;
  }

  return { enter, leave };
}
