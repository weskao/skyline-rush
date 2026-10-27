import { t } from './i18n.ts';
import { vfxSettings, VFX_PRESETS, SHOWCASE_VIEWS, type VfxSettings, type ShowcaseView, type VfxPreset } from './vfx-settings.ts';
import { initialDeviceVisuals, QUALITY_STORAGE_KEY } from './device-quality.ts';
import { trackDropdown } from './dropdown.ts';

interface VfxWorld { configureVFX(settings: VfxSettings): void }
interface VfxOptions {
  getWorld(): VfxWorld | null | undefined;
  /** The showcase hides the track picker, so swiping is how to change track. */
  onAirflowShown(): void;
  onPanelOpen(): void;
  reducedMotion: MediaQueryList;
}

export const stepView = (view: ShowcaseView, delta: number): ShowcaseView =>
  SHOWCASE_VIEWS[(SHOWCASE_VIEWS.indexOf(view) + delta + SHOWCASE_VIEWS.length) % SHOWCASE_VIEWS.length]!;

export function setupVfxUI({ getWorld, onAirflowShown, onPanelOpen, reducedMotion }: VfxOptions) {
  const $ = <T extends Element = HTMLElement>(selector: string): T => document.querySelector<T>(selector)!;
  const vfxControls = [...document.querySelectorAll<HTMLInputElement>('[data-vfx]')];
  const airflowHud = $('#airflow-hud');
  // Initial quality selection is performed once; manual/previous settings win.
  let storedVisuals: unknown = null;
  try { const raw = localStorage.getItem(QUALITY_STORAGE_KEY); if (raw) storedVisuals = JSON.parse(raw); }
  catch { /* Storage is optional; use device-aware in-memory defaults. */ }
  const deviceSelection = initialDeviceVisuals({
    storedSettings: storedVisuals,
    device: { cores: navigator.hardwareConcurrency, memoryGiB: (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
      width: innerWidth, height: innerHeight, pixelRatio: devicePixelRatio },
  });
  let visual = deviceSelection.settings;
  const calm = (): boolean => visual.comfortable || reducedMotion.matches;
  function stopMotionIfCalm(): void {
    if (calm()) document.getAnimations().forEach(animation => animation.cancel());
  }
  function showAeroMode(): void { $('#aero-mode').textContent = t(visual.aeroMode === 'downforce' ? 'hud.highDownforce' : 'hud.lowDrag'); }
  function showVFX(): void {
    getWorld()?.configureVFX(visual);
    for (const control of vfxControls) {
      const key = control.dataset.vfx as keyof VfxSettings;
      if (control.type === 'checkbox') control.checked = visual[key] as boolean;
      else control.value = String(visual[key]);
      if (control.type === 'range') (control.previousElementSibling as HTMLOutputElement).value = String(visual[key]);
    }
    const dock = $('#showcase-camera-dock');
    const viewIndex = SHOWCASE_VIEWS.indexOf(visual.view);
    $('#showcase-camera-name').textContent = t('vfx.view.' + visual.view);
    dock.setAttribute('data-view', visual.view);
    $('#showcase-camera-dots').replaceChildren(...SHOWCASE_VIEWS.map((_view, i) => {
      const dot = document.createElement('i');
      dot.classList.toggle('is-active', i === viewIndex);
      return dot;
    }));
    $<HTMLButtonElement>('#airflow-toggle').setAttribute('aria-pressed', String(visual.airflow));
    $<HTMLButtonElement>('#airflow-toggle').disabled = !visual.enabled;
    document.body.classList.toggle('airflow-active', visual.airflow && visual.enabled);
    document.body.classList.toggle('vfx-comfort', visual.comfortable);
    stopMotionIfCalm();
    airflowHud.setAttribute('aria-hidden', String(!visual.airflow || !visual.enabled));
    showAeroMode();
    try { localStorage.setItem('skyline-rush-vfx', JSON.stringify(visual)); } catch { /* Settings remain usable in memory. */ }
  }
  function toggleAirflow(): void {
    if (!visual.enabled) return;
    visual.airflow = !visual.airflow;
    showVFX();
    if (visual.airflow) onAirflowShown();
  }
  for (const control of vfxControls) control.addEventListener('input', () => {
    const key = control.dataset.vfx!;
    const value = control.type === 'checkbox' ? control.checked : control.type === 'range' ? Number(control.value) : control.value;
    visual = vfxSettings({ ...visual, ...(key === 'preset' ? VFX_PRESETS[value as VfxPreset] : {}), [key]: value });
    showVFX();
  });
  function stepShowcaseView(delta: number): void {
    visual = vfxSettings({ ...visual, view: stepView(visual.view, delta) });
    showVFX();
  }
  $('#showcase-camera-prev').addEventListener('click', () => stepShowcaseView(-1));
  $('#showcase-camera-next').addEventListener('click', () => stepShowcaseView(1));
  $('#airflow-toggle').addEventListener('click', toggleAirflow);
  $('#vfx-reset').addEventListener('click', () => { visual = vfxSettings(); showVFX(); });
  // The performance notice floats over the toolbar panels; opening one means the reader is already in the settings it points to.
  $<HTMLDetailsElement>('#vfx-panel').addEventListener('toggle', ({ target }) => {
    const panel = target as HTMLDetailsElement;
    if (panel.open) onPanelOpen();
    trackDropdown(panel, panel.open, () => { panel.open = false; });
  });
  showVFX();
  return {
    settings: (): VfxSettings => visual,
    deviceSelection,
    calm,
    stopMotionIfCalm,
    toggleAirflow,
    /** One-off language switch: the camera name and aero mode label. */
    relabel(): void {
      showAeroMode();
      $('#showcase-camera-name').textContent = t('vfx.view.' + visual.view);
    },
  };
}
