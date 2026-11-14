import { WebGLRenderer } from 'three';

/** three.js reads every program's info log after linking, a synchronous GPU round-trip; only builds people debug keep it. */
export const checksShaderErrors = (env: { PROD: boolean; VITE_DIAG?: string }): boolean => !env.PROD || !!env.VITE_DIAG;

export function createRenderer(canvas: HTMLCanvasElement): WebGLRenderer {
  // No canvas MSAA: the composer's final pass only blits a full-screen quad here; edges are resolved in sceneTarget.
  const renderer = new WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.debug.checkShaderErrors = checksShaderErrors(import.meta.env);
  return renderer;
}
