import type { PerspectiveCamera } from 'three';
import { viewportFoldableLayout, type FoldableLayout, type FoldableRect } from './foldable-layout.ts';

let layout: FoldableLayout | null = null;
export const currentFoldableLayout = (): FoldableLayout | null => layout;

// Home uses the other pane for configuration. Critical HUD and dialogs use this pane.
export const foldScenePane = (fold: FoldableLayout): FoldableRect => fold.segments[fold.axis === 'vertical' ? 1 : 0];

// Shift the optical centre away from the hinge with the full frustum and aspect intact.
export function updateFoldableProjection(camera: PerspectiveCamera, fold: FoldableLayout | null, showcase: boolean, portraitLobby = false): void {
  const left = fold?.axis === 'vertical' && !showcase ? -0.18 * camera.aspect : 0;
  // The classic portrait showcase lifts the car above the setup dock. Framed showcases keep their own compositions.
  const top = fold?.axis === 'horizontal' ? 0.20 : !fold && portraitLobby && camera.aspect < .75 ? 0.18 : 0;
  if (left || top) {
    if (camera.view?.offsetX !== left || camera.view.offsetY !== top || !camera.view.enabled)
      camera.setViewOffset(camera.aspect, 1, left, top, camera.aspect, 1);
  } else if (camera.view?.enabled) camera.clearViewOffset();
}

export function refreshFoldableViewport(): boolean {
  const next = viewportFoldableLayout(window);
  if (JSON.stringify(next) === JSON.stringify(layout)) return false;
  layout = next;
  const body = document.body;
  const axis = next?.axis;
  if (axis) body.dataset.foldAxis = axis;
  else delete body.dataset.foldAxis;
  const first = next?.segments[0];
  const second = next?.segments[1];
  const scene = next && foldScenePane(next);
  const home = next?.segments[axis === 'vertical' ? 0 : 1];
  const vars = {
    '--fold-pane-left-end': axis === 'vertical' && first ? first.left + first.width : null,
    '--fold-pane-right-start': axis === 'vertical' ? second?.left : null,
    '--fold-pane-top-end': axis === 'horizontal' && first ? first.top + first.height : null,
    '--fold-pane-bottom-start': axis === 'horizontal' ? second?.top : null,
    '--fold-scene-left': scene?.left, '--fold-scene-top': scene?.top,
    '--fold-scene-width': scene?.width, '--fold-scene-height': scene?.height,
    '--fold-home-left': home?.left, '--fold-home-top': home?.top,
    '--fold-home-width': home?.width, '--fold-home-height': home?.height,
  };
  for (const [name, value] of Object.entries(vars)) {
    if (value == null) body.style.removeProperty(name);
    else body.style.setProperty(name, `${value}px`);
  }
  return true;
}
