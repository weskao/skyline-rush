import { PAINTS } from './appearance.ts';
import { garageStudioView, updateGarageStudioView, updateGarageView } from './garage-view-state.ts';
import { defaultGarageCamera, dragGarageCamera, garagePreset, toggleGarageOrbit, zoomGarageCamera, releaseGarageOrbit } from './garage-camera.ts';
import type { GarageCamera } from './garage-camera.ts';
import { t } from './i18n.ts';
// Keep progression checks locked to the same implementation used in production.
import { availablePaints } from './access/production.ts';

type Paint = (typeof PAINTS)[keyof typeof PAINTS];
type PaintCatalog = Record<string, { stars: number }>;
type GarageState = 'equipped' | 'owned' | 'locked';

interface GarageWorld {
  previewAppearance(paint: Paint): void;
  resize(): void;
  setGarageCamera(camera: GarageCamera | null): void;
  inspectGarageStudio?(): { minX: number; maxX: number; minY: number; maxY: number; inFrame: boolean } | null;
  inspectRenderLoad?(): { drawCalls: number; triangles: number };
}
interface GarageDependencies {
  getWorld(): GarageWorld | null | undefined;
  canOpen(): boolean;
  clearControls(): void;
  getEquippedPaint(): string;
  setEquippedPaint(id: string): void;
  getStars(): number;
}

export function garagePresentation(
  id: string, equipped: string, _stars: number, paints: PaintCatalog, available: string[],
) {
  const owned = available.includes(id);
  const state: GarageState = id === equipped ? 'equipped' : owned ? 'owned' : 'locked';
  return { state, owned, canEquip: owned && id !== equipped, need: paints[id]?.stars ?? 0 };
}

// Preserve the existing WebGL canvas, paint entitlement source and race state.
export function setupGarageUI({
  getWorld, canOpen, clearControls, getEquippedPaint, setEquippedPaint, getStars,
}: GarageDependencies) {
  const $ = <T extends HTMLElement = HTMLElement>(selector: string): T => document.querySelector<T>(selector)!;
  const garageScreen = $<HTMLDialogElement>('#garage-screen');
  const preview = $('#garage-preview');
  const historyKey = '__skylineGaragePage';
  let previewing = getEquippedPaint();
  let camera = defaultGarageCamera();
  let autoPaused = false;
  const contacts = new Map<number, { x: number; y: number }>();
  let pendingStudioInspection = false;
  function inspectStudioAfterFrame() {
    if (pendingStudioInspection || garageStudioView.page !== 'studio') return;
    pendingStudioInspection = true;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      pendingStudioInspection = false;
      if (!garageScreen.open || garageStudioView.page !== 'studio') return;
      const bounds = getWorld()?.inspectGarageStudio?.();
      if (bounds) {
        preview.dataset.carInFrame = String(bounds.inFrame);
        preview.dataset.carBounds = JSON.stringify(bounds);
      }
      const load = getWorld()?.inspectRenderLoad?.();
      if (load) {
        preview.dataset.drawCalls = String(load.drawCalls);
        preview.dataset.triangles = String(load.triangles);
      }
    }));
  }

  function showGarage(id: string = previewing): void {
    const stars = getStars();
    const { state, canEquip, need } = garagePresentation(
      id, getEquippedPaint(), stars, PAINTS, availablePaints(stars),
    );
    const name = t('paint.' + id);
    updateGarageStudioView({ ownedPaints: availablePaints(stars), equippedPaint: getEquippedPaint() });
    updateGarageView({
      status: t('garage.status.' + state, { name, stars: need, have: stars }),
      equipDisabled: !canEquip,
      equipLabel: t('garage.btn.' + (state === 'owned' ? 'equip' : state), { name, stars: need }),
    });
  }
  function previewPaint(id: string): void {
    if (!Object.hasOwn(PAINTS, id)) return;
    previewing = id;
    getWorld()?.previewAppearance(PAINTS[id]);
    updateGarageView({ selected: id });
    showGarage();
  }
  function setCamera(next: GarageCamera, angle = ''): void {
    camera = next;
    preview.dataset.cameraZoom = camera.zoom.toFixed(3);
    preview.dataset.cameraYaw = camera.yaw.toFixed(3);
    updateGarageStudioView({ angle, autoRotate: camera.autoRotate });
    getWorld()?.setGarageCamera(garageStudioView.page === 'studio' ? camera : null);
    inspectStudioAfterFrame();
  }
  function showPage(page: 'home' | 'studio'): void {
    if (page === 'home') contacts.clear();
    updateGarageStudioView({ page });
    getWorld()?.setGarageCamera(page === 'studio' ? camera : null);
    getWorld()?.resize();
    inspectStudioAfterFrame();
    queueMicrotask(() => (page === 'studio' ? preview : $('#garage-studio-open')).focus({ preventScroll: true }));
  }
  function pushPage(page: 'home' | 'studio'): void {
    history.pushState({ ...(history.state ?? {}), [historyKey]: page }, '');
    showPage(page);
  }
  function leaveGarage(): void {
    if (!garageScreen.open) return;
    // Home and Studio are same-document history entries: Back returns to the correct prior screen.
    const page = history.state?.[historyKey];
    if (page === 'home' || page === 'studio') history.go(page === 'studio' ? -2 : -1);
    else garageScreen.close();
  }
  function releaseContact(id: number): void {
    const hadPointer = contacts.delete(id);
    if (!hadPointer || contacts.size !== 0 || !garageScreen.open) return;
    if (garageStudioView.page === 'studio') setCamera(releaseGarageOrbit(camera, autoPaused));
    clearControls();
  }

  $('#garage-restore-default').addEventListener('click', () => {
    // Restore is a saved equip action, not a temporary preview; pearl is always owned.
    if (!availablePaints(getStars()).includes('pearl')) return;
    setEquippedPaint('pearl');
    previewPaint('pearl');
  });
  $('#garage-equip').addEventListener('click', () => {
    // Guard the data boundary, not only the disabled UI: a locked paint is never persisted.
    if (!garagePresentation(previewing, getEquippedPaint(), getStars(), PAINTS, availablePaints(getStars())).canEquip) return;
    setEquippedPaint(previewing);
    previewPaint(getEquippedPaint());
  });
  document.querySelectorAll<HTMLButtonElement>('[data-paint]').forEach(button =>
    button.addEventListener('click', () => { if (button.dataset.paint) previewPaint(button.dataset.paint); }));
  $('#garage-button').addEventListener('click', () => {
    const world = getWorld();
    if (!world || !canOpen() || garageScreen.open) return;
    clearControls();
    garageScreen.showModal();
    preview.append($('#world'));
    world.resize();
    previewPaint(getEquippedPaint());
    autoPaused = false;
    setCamera(defaultGarageCamera());
    pushPage('home');
  });
  $('#garage-studio-open').addEventListener('click', () => pushPage('studio'));
  $('#garage-studio-back').addEventListener('click', () => {
    if (history.state?.[historyKey] === 'studio') history.back();
    else showPage('home');
  });
  $('#garage-close').addEventListener('click', leaveGarage);
  garageScreen.addEventListener('cancel', event => { event.preventDefault(); leaveGarage(); });
  window.addEventListener('popstate', () => {
    if (!garageScreen.open) return;
    const page = history.state?.[historyKey];
    if (page === 'home' || page === 'studio') showPage(page);
    else garageScreen.close();
  });
  garageScreen.addEventListener('close', () => {
    contacts.clear();
    $('#app').prepend($('#world'));
    getWorld()?.setGarageCamera(null);
    getWorld()?.resize();
    previewPaint(getEquippedPaint());
    updateGarageStudioView({ page: 'home' });
    clearControls();
    $('#garage-button').focus({ preventScroll: true });
  });
  garageScreen.addEventListener('keydown', event => event.stopPropagation());
  document.querySelectorAll<HTMLButtonElement>('[data-garage-angle]').forEach(button =>
    button.addEventListener('click', () => setCamera(garagePreset(button.dataset.garageAngle!), button.dataset.garageAngle ?? '')));
  $('#garage-rotate-left').addEventListener('click', () => setCamera(dragGarageCamera(camera, -40, 0)));
  $('#garage-rotate-right').addEventListener('click', () => setCamera(dragGarageCamera(camera, 40, 0)));
  $('#garage-zoom-in').addEventListener('click', () => setCamera(zoomGarageCamera(camera, .85)));
  $('#garage-zoom-out').addEventListener('click', () => setCamera(zoomGarageCamera(camera, 1.15)));
  $('#garage-reset').addEventListener('click', () => setCamera(defaultGarageCamera()));
  $('#garage-auto-rotate').addEventListener('click', () => {
    autoPaused = camera.autoRotate;
    setCamera(toggleGarageOrbit(camera));
  });
  preview.addEventListener('pointerdown', event => {
    if (garageStudioView.page !== 'studio' || event.pointerType === 'mouse' && event.button !== 0) return;
    contacts.set(event.pointerId, { x: event.clientX, y: event.clientY });
    preview.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  preview.addEventListener('pointermove', event => {
    const old = contacts.get(event.pointerId);
    if (!old || garageStudioView.page !== 'studio') return;
    const now = { x: event.clientX, y: event.clientY };
    if (contacts.size === 1) setCamera(dragGarageCamera(camera, now.x - old.x, now.y - old.y));
    else {
      const other = [...contacts].find(([id]) => id !== event.pointerId)?.[1];
      if (other) {
        const before = Math.hypot(old.x - other.x, old.y - other.y);
        const after = Math.hypot(now.x - other.x, now.y - other.y);
        if (after > 4) setCamera(zoomGarageCamera(camera, before / after));
      }
    }
    contacts.set(event.pointerId, now);
    event.preventDefault();
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'] as const)
    preview.addEventListener(name, event => releaseContact((event as PointerEvent).pointerId));
  preview.addEventListener('wheel', event => {
    if (garageStudioView.page !== 'studio') return;
    event.preventDefault();
    setCamera(zoomGarageCamera(camera, Math.exp(Math.sign(event.deltaY) * .1)));
  }, { passive: false });
  preview.addEventListener('keydown', event => {
    if (garageStudioView.page !== 'studio') return;
    if (event.key === 'ArrowLeft') setCamera(dragGarageCamera(camera, -25, 0));
    else if (event.key === 'ArrowRight') setCamera(dragGarageCamera(camera, 25, 0));
    else if (event.key === 'ArrowUp') setCamera(dragGarageCamera(camera, 0, -25));
    else if (event.key === 'ArrowDown') setCamera(dragGarageCamera(camera, 0, 25));
    else if (event.key === '+' || event.key === '=') setCamera(zoomGarageCamera(camera, .85));
    else if (event.key === '-') setCamera(zoomGarageCamera(camera, 1.15));
    else return;
    event.preventDefault();
  });
  showGarage();
  return { showGarage };
}
