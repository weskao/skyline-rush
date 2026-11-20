import { releaseGarageOrbit, type GarageCamera } from './garage-camera.ts';

interface StudioGestureDependencies {
  preview: HTMLElement;
  isOpen(): boolean;
  isStudio(): boolean;
  camera(): GarageCamera;
  setCamera(camera: GarageCamera): void;
  rotate(dx: number, dy: number): void;
  zoom(multiplier: number): void;
  clearControls(): void;
}

/** Inspect-mode drag / pinch / wheel / arrow-key camera input (ui-architecture.md, Preview Studio camera gestures). */
export function setupGarageStudioGestures({
  preview, isOpen, isStudio, camera, setCamera, rotate, zoom, clearControls,
}: StudioGestureDependencies): { clear(): void } {
  let orbitBeforeGesture = false;
  const contacts = new Map<number, { x: number; y: number }>();
  function releaseContact(id: number): void {
    const hadPointer = contacts.delete(id);
    if (!hadPointer || contacts.size !== 0 || !isOpen()) return;
    if (isStudio() && camera().autoRotate !== orbitBeforeGesture) {
      setCamera(releaseGarageOrbit(camera(), orbitBeforeGesture));
    }
    clearControls();
  }
  preview.addEventListener('pointerdown', event => {
    if (!isStudio() || event.pointerType === 'mouse' && event.button !== 0) return;
    if (contacts.size === 0) orbitBeforeGesture = camera().autoRotate;
    contacts.set(event.pointerId, { x: event.clientX, y: event.clientY });
    preview.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  preview.addEventListener('pointermove', event => {
    const old = contacts.get(event.pointerId);
    if (!old || !isStudio()) return;
    const now = { x: event.clientX, y: event.clientY };
    if (contacts.size === 1) rotate(now.x - old.x, now.y - old.y);
    else {
      const other = [...contacts].find(([id]) => id !== event.pointerId)?.[1];
      if (other) {
        const before = Math.hypot(old.x - other.x, old.y - other.y);
        const after = Math.hypot(now.x - other.x, now.y - other.y);
        if (after > 4) zoom(before / after);
      }
    }
    contacts.set(event.pointerId, now);
    event.preventDefault();
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'] as const)
    preview.addEventListener(name, event => releaseContact((event as PointerEvent).pointerId));
  preview.addEventListener('wheel', event => {
    if (!isStudio()) return;
    event.preventDefault();
    zoom(Math.exp(Math.sign(event.deltaY) * .1));
  }, { passive: false });
  preview.addEventListener('keydown', event => {
    if (!isStudio()) return;
    if (event.key === 'ArrowLeft') rotate(-25, 0);
    else if (event.key === 'ArrowRight') rotate(25, 0);
    else if (event.key === 'ArrowUp') rotate(0, -25);
    else if (event.key === 'ArrowDown') rotate(0, 25);
    else if (event.key === '+' || event.key === '=') zoom(.85);
    else if (event.key === '-') zoom(1.15);
    else return;
    event.preventDefault();
  });
  return { clear: () => contacts.clear() };
}
