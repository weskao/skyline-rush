import { PAINTS, type PaintPreset } from './appearance.ts';
import { defaultPaint, equippedCar, loadCarPaint, reloadCar, validateEquippedCar } from './car-catalog.ts';
import { setWave3DemoAccount } from '#wave3-demo-race';
import { SKIN_CATEGORIES } from './garage-skin-catalog.ts';
import { currentGarageSkins, selectedGarageSkins, cancelGarageSkinPreview, subscribeGarageSkins, setGarageSkinAccount } from '#garage-skin-runtime';
import type { SkinCategory, SkinId } from './garage-skin-catalog.ts';
import type { GaragePose } from './track-preview.ts';
import { garageStudioView, updateGarageStudioView, updateGarageView } from './garage-view-state.ts';
import { defaultGarageCamera, dragGarageCamera, garagePreset, stepGarageAngle, toggleGarageOrbit, zoomGarageCamera, setGarageMode, toggleGarageWing, garageSectionCamera, GARAGE_SECTION_SHOWCASE } from './garage-camera.ts';
import { setupGarageStudioGestures } from './garage-studio-gestures.ts';
import type { ShowcaseView } from './vfx-settings.ts';
import type { GarageCamera } from './garage-camera.ts';
import type { GarageLighting } from './garage-stage.ts';
import { t } from './i18n.ts';
import { setupGarageCarActions } from './garage-car-actions.ts';

type Paint = PaintPreset;
type PaintCatalog = Record<string, { stars: number }>;
type GarageState = 'equipped' | 'owned' | 'locked';

interface GarageWorld {
  previewAppearance(paint: Paint): void;
  resize(): void;
  setGarageCamera(camera: GarageCamera | null): void;
  getGarageCameraYaw?(): number | undefined;
  /** Home page only: poses the track-showcase car like the Studio's ground / flight / wing buttons. */
  setGaragePose?(pose: GaragePose | null): void;
  /** Sun (bright) / moon (dim) lighting for Garage Home and the Studio; racing is unaffected. */
  setGarageLighting?(level: GarageLighting): void;
  setCosmeticSkins?(ids: Record<SkinCategory, SkinId>): void;
  setGarageSkinPreview?(ids: Record<SkinCategory, SkinId>, home?: boolean, visible?: boolean): void;
  inspectCosmeticPreview?(): {
    effectsVisible: boolean; voidBeams: boolean; launchPattern: number; launchPreviewActive: boolean;
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
  cue?(name: string): void;
  getEquippedPaint(): string;
  setEquippedPaint(id: string): void;
  getStars(): number;
  /** Entitlement from the build-selected `@progression-access` module (main.js), so unlocked dev servers see every paint. */
  availablePaints(stars: number): string[];
  startSimulation: typeof import('./frame-pacing.ts').startRace;
  syncProgress(): Promise<unknown>;
  subscribeAccount(listener: (uid: string | null) => void): void;
  /** Temporary home-showcase view while the Garage is open; null restores the saved one (vfx-ui.ts). */
  previewShowcaseView?(view: ShowcaseView | null): void;
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
  getWorld, canOpen, clearControls, cue, getEquippedPaint, setEquippedPaint, getStars, availablePaints, subscribeAccount, startSimulation, syncProgress, previewShowcaseView,
}: GarageDependencies) {
  const $ = <T extends HTMLElement = HTMLElement>(selector: string): T => document.querySelector<T>(selector)!;
  const garageScreen = $<HTMLDialogElement>('#garage-screen');
  const preview = $('#garage-preview');
  const previewControls = $('#garage-screen .garage-preview-controls');
  // One dock (unique id), borrowed from the home screen while the Garage is open, like #world.
  const dock = $('#showcase-camera-dock');
  const dockParent = dock.parentElement!, dockNext = dock.nextSibling;
  const historyKey = '__skylineGaragePage';
  let leavingGarage = false;
  let previewing = getEquippedPaint();
  let previousPaint: string | null = null;
  const owned = (): string[] => availablePaints(getStars());
  let camera = defaultGarageCamera();
  let section = 'cars';
  let pendingStudioInspection = false;
  function syncSkins(): void {
    const equipped = currentGarageSkins();
    const inGarage = garageScreen.open;
    const selected = inGarage ? selectedGarageSkins() : equipped;
    getWorld()?.setCosmeticSkins?.(equipped);
    getWorld()?.setGarageSkinPreview?.(
      selected, inGarage && garageStudioView.page === 'home', !inGarage || garageStudioView.effectsVisible,
    );
    for (const category of SKIN_CATEGORIES) {
      preview.setAttribute(`data-skin-preview-${category}`, selected[category]);
      preview.setAttribute(`data-skin-equipped-${category}`, equipped[category]);
    }
    inspectStudioAfterFrame();
  }
  subscribeGarageSkins(equipped => {
    syncSkins();
    if (equipped && garageScreen.open && !garageStudioView.effectsVisible) garageStudioView.effectsReminder++;
  });
  subscribeAccount(accountId => { setGarageSkinAccount(accountId); setWave3DemoAccount(accountId); });
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
        preview.dataset.gpuEffectsVisible = String(cosmetics.effectsVisible);
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
    carActions.refresh();
    const { state, canEquip, need } = garagePresentation(id, getEquippedPaint(), stars, PAINTS, owned());
    const name = t('paint.' + id);
    updateGarageStudioView({ ownedPaints: owned(), equippedPaint: getEquippedPaint(), car: equippedCar() });
    updateGarageView({
      status: t('garage.status.' + state, { name, stars: need, have: stars }),
      canUndo: previousPaint !== null && owned().includes(previousPaint) && previousPaint !== getEquippedPaint(),
      equipDisabled: !canEquip,
      equipLabel: t('garage.btn.' + (state === 'owned' ? 'equip' : state), { name, stars: need }),
    });
  }
  function previewPaint(id: string): void {
    const paint = Object.hasOwn(PAINTS, id) ? PAINTS[id] : undefined;
    if (!paint) return;
    carActions.clearPreview();
    previewing = id;
    getWorld()?.previewAppearance(paint);
    updateGarageView({ selected: id });
    showGarage();
  }
  function applyCar(resolve: () => ReturnType<typeof equippedCar>): void {
    const before = equippedCar(), after = resolve();
    if (after === before) return;
    previousPaint = null;
    setEquippedPaint(loadCarPaint(after, owned()));
    previewPaint(getEquippedPaint());
    inspectStudioAfterFrame();
  }
  let pendingCarRestore = false;
  function adoptCar(): void {
    pendingCarRestore = !canOpen();
    if (pendingCarRestore) return;
    applyCar(() => reloadCar(undefined, getStars()));
    showGarage();
  }
  const startRace: typeof startSimulation = (race, waitingForScenery) => {
    if (pendingCarRestore) {
      pendingCarRestore = false;
      applyCar(() => reloadCar(undefined, getStars()));
    }
    applyCar(() => validateEquippedCar(getStars()));
    startSimulation(race, waitingForScenery);
  };
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
  const currentCameraYaw = () => camera.autoRotate ? getWorld()?.getGarageCameraYaw?.() ?? camera.yaw : camera.yaw;
  function rotateCamera(dx: number, dy: number): void {
    setCamera(dragGarageCamera({ ...camera, yaw: currentCameraYaw() }, dx, dy));
  }
  function zoomCamera(multiplier: number): void {
    setCamera(zoomGarageCamera(camera, multiplier), garageStudioView.angle);
  }
  function showPage(page: 'home' | 'studio'): void {
    if (page === 'home') gestures.clear();
    updateGarageStudioView({ page });
    delete preview.dataset.carInFrame;
    syncWorldCamera();
    getWorld()?.resize();
    syncSkins();
    followSection();
    inspectStudioAfterFrame();
    queueMicrotask(() => (page === 'studio' ? preview : $('#garage-studio-open')).focus({ preventScroll: true }));
  }
  function pushPage(page: 'home' | 'studio'): void {
    history.pushState({ ...(history.state ?? {}), [historyKey]: page }, '');
    showPage(page);
  }
  function leaveGarage(): void {
    if (!garageScreen.open || leavingGarage) return;
    // Walk our same-document entries one at a time; some browsers collapse a multi-entry jump.
    leavingGarage = true;
    continueGarageExit();
  }
  function continueGarageExit(): void {
    const page = history.state?.[historyKey];
    if (page === 'home' || page === 'studio') history.back();
    else { leavingGarage = false; garageScreen.close(); }
  }
  /** Turn the camera to the part the open section changes: the Studio camera inspecting, the showcase on Home. */
  function followSection(): void {
    if (garageStudioView.page === 'home') {
      if (Object.hasOwn(GARAGE_SECTION_SHOWCASE, section)) previewShowcaseView?.(GARAGE_SECTION_SHOWCASE[section]!);
      return;
    }
    const next = garageSectionCamera(section, camera);
    if (next) setCamera(next.camera, next.angle);
  }
  garageScreen.querySelector('.garage-section-nav')!.addEventListener('click', event => {
    const next = (event.target as Element).closest<HTMLElement>('[data-garage-section]')?.dataset.garageSection;
    if (next) { section = next; followSection(); }
  });

  function equipPaint(id: string): void {
    previousPaint = getEquippedPaint() === id ? previousPaint : getEquippedPaint();
    setEquippedPaint(id);
    previewPaint(id);
  }
  $('#garage-paint-undo').addEventListener('click', () => {
    const restore = previousPaint;
    if (!restore || !owned().includes(restore)) return;
    previousPaint = null;
    setEquippedPaint(restore);
    previewPaint(restore);
    $(`[data-paint="${restore}"]`).focus({ preventScroll: true });
    cue?.('equip-confirmed');
  });
  $('#garage-restore-default').addEventListener('click', () => {
    // Restore is a saved equip action, not a temporary preview; each car's default finish is always owned.
    const standard = defaultPaint(equippedCar());
    if (!owned().includes(standard)) return;
    const changed = getEquippedPaint() !== standard;
    equipPaint(standard);
    if (changed) cue?.('equip-confirmed');
  });
  $('#garage-equip').addEventListener('click', () => {
    // Guard the data boundary, not only the disabled UI: a locked paint is never persisted.
    if (!garagePresentation(previewing, getEquippedPaint(), getStars(), PAINTS, owned()).canEquip) return;
    equipPaint(previewing);
    cue?.('equip-confirmed');
  });
  $('#garage-screen .paint-options').addEventListener('click', event => {
    const id = (event.target as Element).closest<HTMLElement>('[data-paint]')?.dataset.paint;
    if (id) previewPaint(id);
  });
  const carActions = setupGarageCarActions(garageScreen, {
    getStars, syncProgress,
    preview: id => { getWorld()?.previewAppearance(PAINTS[loadCarPaint(id, owned())]!); inspectStudioAfterFrame(); },
    selected: (changed, wasPreview) => {
      if (changed) setEquippedPaint(getEquippedPaint()); // carry the equipped finish into the new car
      if (wasPreview) previewPaint(previewing);
      showGarage();
      inspectStudioAfterFrame();
      cue?.(changed ? 'equip-confirmed' : 'ui');
    },
    onTrialExpired: () => { if (garageScreen.open) { applyCar(() => validateEquippedCar(getStars())); showGarage(); } },
  });
  $('#garage-button').addEventListener('click', () => {
    const world = getWorld();
    if (!world || !canOpen() || garageScreen.open) return;
    if (pendingCarRestore) adoptCar();
    applyCar(() => validateEquippedCar(getStars()));
    clearControls();
    garageScreen.showModal();
    cue?.('ui');
    preview.append($('#world'));
    previewControls.append(dock);
    world.resize();
    previewPaint(getEquippedPaint());
    world.setGarageLighting?.(garageStudioView.lighting);
    setCamera(defaultGarageCamera());
    pushPage('home');
  });
  $('#garage-studio-open').addEventListener('click', () => { pushPage('studio'); cue?.('ui'); });
  $('#garage-studio-back').addEventListener('click', () => {
    if (history.state?.[historyKey] === 'studio') history.back();
    else showPage('home');
  });
  $('#garage-close').addEventListener('click', leaveGarage);
  garageScreen.addEventListener('cancel', event => { event.preventDefault(); leaveGarage(); });
  window.addEventListener('popstate', () => {
    if (!garageScreen.open) return;
    if (leavingGarage) { continueGarageExit(); return; }
    const page = history.state?.[historyKey];
    if (page === 'home' || page === 'studio') {
      // A nested reward dialog owns its own history entry inside the same Garage page.
      if (page !== garageStudioView.page) showPage(page);
    } else garageScreen.close();
  });
  garageScreen.addEventListener('close', () => {
    gestures.clear();
    section = 'cars';
    previewShowcaseView?.(null);
    $('#app').prepend($('#world'));
    dockParent.insertBefore(dock, dockNext);
    getWorld()?.setGarageCamera(null);
    getWorld()?.setGaragePose?.(null);
    getWorld()?.resize();
    cancelGarageSkinPreview();
    previousPaint = null;
    previewPaint(getEquippedPaint());
    updateGarageStudioView({ page: 'home', effectsReminder: 0 });
    syncSkins(); // The locked build has no preview session to publish a reset.
    clearControls();
    $('#garage-button').focus({ preventScroll: true });
  });
  garageScreen.addEventListener('keydown', event => event.stopPropagation());
  for (const [id, delta] of [['#garage-angle-prev', -1], ['#garage-angle-next', 1]] as const) $(id).addEventListener('click', () => {
    const angle = stepGarageAngle(garageStudioView.angle, delta);
    setCamera({ ...garagePreset(angle), zoom: camera.zoom, mode: camera.mode, wing: camera.wing }, angle);
  });
  $('#garage-pose-action').addEventListener('click', () => setCamera(
    setGarageMode(camera, camera.mode === 'flight' ? 'ground' : 'flight'), garageStudioView.angle,
  ));
  $('#garage-wing').addEventListener('click', () => setCamera(toggleGarageWing(camera), garageStudioView.angle));
  $('#garage-lighting').addEventListener('click', () => {
    const lighting: GarageLighting = garageStudioView.lighting === 'bright' ? 'dim' : 'bright';
    updateGarageStudioView({ lighting });
    getWorld()?.setGarageLighting?.(lighting);
  });
  $('#garage-effects-toggle').addEventListener('click', () => {
    updateGarageStudioView({ effectsVisible: !garageStudioView.effectsVisible, effectsReminder: 0 });
    syncSkins();
    cue?.('ui');
  });
  $('#garage-rotate-left').addEventListener('click', () => rotateCamera(-40, 0));
  $('#garage-rotate-right').addEventListener('click', () => rotateCamera(40, 0));
  $('#garage-zoom-in').addEventListener('click', () => zoomCamera(.85));
  $('#garage-zoom-out').addEventListener('click', () => zoomCamera(1.15));
  $('#garage-reset').addEventListener('click', () => setCamera(
    { ...garagePreset('cinematic'), mode: camera.mode, wing: camera.wing }, 'cinematic',
  ));
  $('#garage-auto-rotate').addEventListener('click', () => setCamera(toggleGarageOrbit({ ...camera, yaw: currentCameraYaw() })));
  const gestures = setupGarageStudioGestures({
    preview, isOpen: () => garageScreen.open, isStudio: () => garageStudioView.page === 'studio',
    camera: () => camera, setCamera, rotate: rotateCamera, zoom: zoomCamera, clearControls,
  });
  showGarage();
  return { showGarage, adoptCar, syncSkins, previewPaint, startRace };
}
