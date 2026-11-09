import { PAINTS } from './appearance.ts';
import { wave3DemoExperience } from './wave3-race-events.ts';
import { SKIN_CATEGORIES } from './garage-skin-catalog.ts';
import { currentGarageSkins, selectedGarageSkins, cancelGarageSkinPreview, subscribeGarageSkins, setGarageSkinAccount } from '#garage-skin-runtime';
import type { SkinCategory, SkinId } from './garage-skin-catalog.ts';
import type { GaragePose } from './track-preview.ts';
import { garageStudioView, updateGarageStudioView, updateGarageView } from './garage-view-state.ts';
import { defaultGarageCamera, dragGarageCamera, garagePreset, toggleGarageOrbit, zoomGarageCamera, releaseGarageOrbit, setGarageMode, toggleGarageWing } from './garage-camera.ts';
import type { GarageCamera } from './garage-camera.ts';
import type { GarageLighting } from './garage-stage.ts';
import { t } from './i18n.ts';

type Paint = (typeof PAINTS)[keyof typeof PAINTS];
type PaintCatalog = Record<string, { stars: number }>;
type GarageState = 'equipped' | 'owned' | 'locked';

interface GarageWorld {
  previewAppearance(paint: Paint): void;
  resize(): void;
  setGarageCamera(camera: GarageCamera | null): void;
  /** Home page only: poses the track-showcase car like the Studio's ground / flight / wing buttons. */
  setGaragePose?(pose: GaragePose | null): void;
  /** Sun (bright) / moon (dim) lighting for Garage Home and the Studio; racing is unaffected. */
  setGarageLighting?(level: GarageLighting): void;
  setCosmeticSkins?(ids: Record<SkinCategory, SkinId>): void;
  setGarageSkinPreview?(ids: Record<SkinCategory, SkinId>, home?: boolean): void;
  inspectCosmeticPreview?(): {
    voidBeams: boolean; launchPattern: number; launchPreviewActive: boolean;
    thrusterPattern: number; airflowPattern: number; trailPattern: number;
  };
  inspectGarageStudio?(): { minX: number; maxX: number; minY: number; maxY: number; inFrame: boolean } | null;
  inspectRenderLoad?(): { drawCalls: number; triangles: number };
  inspectPrograms?(): number;
}
interface GarageDependencies {
  getWorld(): GarageWorld | null | undefined;
  canOpen(): boolean;
  clearControls(): void;
  getEquippedPaint(): string;
  setEquippedPaint(id: string): void;
  getStars(): number;
  /** Entitlement from the build-selected `@progression-access` module (main.js), so unlocked dev servers see every paint. */
  availablePaints(stars: number): string[];
  subscribeAccount(listener: (uid: string | null) => void): void;
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
  getWorld, canOpen, clearControls, getEquippedPaint, setEquippedPaint, getStars, availablePaints, subscribeAccount,
}: GarageDependencies) {
  const $ = <T extends HTMLElement = HTMLElement>(selector: string): T => document.querySelector<T>(selector)!;
  const garageScreen = $<HTMLDialogElement>('#garage-screen');
  const preview = $('#garage-preview');
  // One dock (unique id), borrowed from the home screen while the Garage is open, like #world.
  const dock = $('#showcase-camera-dock');
  const dockParent = dock.parentElement!, dockNext = dock.nextSibling;
  const historyKey = '__skylineGaragePage';
  let previewing = getEquippedPaint();
  let camera = defaultGarageCamera();
  let autoPaused = false;
  const contacts = new Map<number, { x: number; y: number }>();
  let pendingStudioInspection = false;
  function syncSkins(): void {
    const equipped = currentGarageSkins();
    const inGarage = garageScreen.open;
    const selected = inGarage ? selectedGarageSkins() : equipped;
    getWorld()?.setCosmeticSkins?.(equipped);
    getWorld()?.setGarageSkinPreview?.(selected, inGarage && garageStudioView.page === 'home');
    for (const category of SKIN_CATEGORIES) {
      preview.setAttribute(`data-skin-preview-${category}`, selected[category]);
      preview.setAttribute(`data-skin-equipped-${category}`, equipped[category]);
    }
    inspectStudioAfterFrame();
  }
  subscribeGarageSkins(syncSkins);
  subscribeAccount(accountId => { setGarageSkinAccount(accountId); wave3DemoExperience.setAccount(accountId); });
  function inspectStudioAfterFrame() {
    if (pendingStudioInspection || !garageScreen.open) return;
    pendingStudioInspection = true;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      pendingStudioInspection = false;
      if (!garageScreen.open) return;
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
      const cosmetics = getWorld()?.inspectCosmeticPreview?.();
      if (cosmetics) {
        preview.dataset.gpuVoidBeams = String(cosmetics.voidBeams);
        preview.dataset.gpuLaunchPattern = String(cosmetics.launchPattern);
        preview.dataset.launchPreviewActive = String(cosmetics.launchPreviewActive);
        preview.dataset.gpuThrusterPattern = String(cosmetics.thrusterPattern);
        preview.dataset.gpuAirflowPattern = String(cosmetics.airflowPattern);
        preview.dataset.gpuTrailPattern = String(cosmetics.trailPattern);
      }
      const programs = getWorld()?.inspectPrograms?.();
      if (programs !== undefined) preview.dataset.shaderPrograms = String(programs);
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
  function syncWorldCamera(): void {
    const studio = garageStudioView.page === 'studio';
    getWorld()?.setGarageCamera(studio ? camera : null);
    getWorld()?.setGaragePose?.(studio ? null : { mode: camera.mode, wing: camera.wing });
  }
  function setCamera(next: GarageCamera, angle = ''): void {
    camera = next;
    preview.dataset.garageMode = camera.mode;
    preview.dataset.garageWing = String(camera.wing);
    preview.dataset.cameraZoom = camera.zoom.toFixed(3);
    preview.dataset.cameraYaw = camera.yaw.toFixed(3);
    // Never let QA or assistive evidence claim the previous camera's bounds.
    delete preview.dataset.carInFrame;
    updateGarageStudioView({ angle, autoRotate: camera.autoRotate, mode: camera.mode, wing: camera.wing });
    syncWorldCamera();
    inspectStudioAfterFrame();
  }
  function showPage(page: 'home' | 'studio'): void {
    if (page === 'home') contacts.clear();
    updateGarageStudioView({ page });
    delete preview.dataset.carInFrame;
    syncWorldCamera();
    getWorld()?.resize();
    syncSkins();
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
    preview.after(dock);
    world.resize();
    previewPaint(getEquippedPaint());
    world.setGarageLighting?.(garageStudioView.lighting);
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
    dockParent.insertBefore(dock, dockNext);
    getWorld()?.setGarageCamera(null);
    getWorld()?.setGaragePose?.(null);
    getWorld()?.resize();
    cancelGarageSkinPreview();
    previewPaint(getEquippedPaint());
    updateGarageStudioView({ page: 'home' });
    clearControls();
    $('#garage-button').focus({ preventScroll: true });
  });
  garageScreen.addEventListener('keydown', event => event.stopPropagation());
  document.querySelectorAll<HTMLButtonElement>('[data-garage-angle]').forEach(button =>
    button.addEventListener('click', () => setCamera(
      { ...garagePreset(button.dataset.garageAngle!), mode: camera.mode, wing: camera.wing }, button.dataset.garageAngle ?? '',
    )));
  document.querySelectorAll<HTMLButtonElement>('[data-garage-mode]').forEach(button =>
    button.addEventListener('click', () => setCamera(
      setGarageMode(camera, button.dataset.garageMode as GarageCamera['mode']), garageStudioView.angle,
    )));
  $('#garage-wing').addEventListener('click', () => setCamera(toggleGarageWing(camera), garageStudioView.angle));
  $('#garage-lighting').addEventListener('click', () => {
    const lighting: GarageLighting = garageStudioView.lighting === 'bright' ? 'dim' : 'bright';
    updateGarageStudioView({ lighting });
    getWorld()?.setGarageLighting?.(lighting);
  });
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
  return { showGarage, syncSkins };
}
