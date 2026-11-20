import { t } from './i18n.ts';
import { vfxSettings, VFX_PRESETS, SHOWCASE_VIEWS, type VfxSettings, type ShowcaseView, type VfxPreset } from './vfx-settings.ts';
import { readInitialDeviceVisuals, QUALITY_STORAGE_KEY } from './device-quality.ts';

interface VfxWorld { configureVFX(settings: VfxSettings): void }
interface VfxOptions {
  getWorld(): VfxWorld | null | undefined;
  /** The showcase hides the track picker, so swiping is how to change track. */
  onAirflowShown(): void;
  reducedMotion: MediaQueryList;
}

export const stepView = (view: ShowcaseView, delta: number): ShowcaseView =>
  SHOWCASE_VIEWS[(SHOWCASE_VIEWS.indexOf(view) + delta + SHOWCASE_VIEWS.length) % SHOWCASE_VIEWS.length]!;

export function setupVfxUI({ getWorld, onAirflowShown, reducedMotion }: VfxOptions) {
  const $ = <T extends Element = HTMLElement>(selector: string): T => document.querySelector<T>(selector)!;
  const vfxControls = [...document.querySelectorAll<HTMLInputElement>('[data-vfx]')];
  const airflowHud = $('#airflow-hud');
  const airflowToggles = document.querySelectorAll<HTMLButtonElement>('#airflow-toggle, #home-airflow-toggle');
  const deviceSelection = readInitialDeviceVisuals();
  let visual = deviceSelection.settings;
  /** Garage-only camera view; shown and rendered but never saved (garage-ui.ts section camera). */
  let previewView: ShowcaseView | null = null;
  const calm = (): boolean => visual.comfortable || reducedMotion.matches;
  function stopMotionIfCalm(): void {
    if (calm()) document.getAnimations().forEach(animation => animation.cancel());
  }
  function showAeroMode(): void { $('#aero-mode').textContent = t(visual.aeroMode === 'downforce' ? 'hud.highDownforce' : 'hud.lowDrag'); }
  function showVFX(): void {
    const view = previewView ?? visual.view;
    getWorld()?.configureVFX(previewView ? { ...visual, view } : visual);
    for (const control of vfxControls) {
      const key = control.dataset.vfx as keyof VfxSettings;
      if (control.type === 'checkbox') control.checked = visual[key] as boolean;
      else control.value = key === 'quality' && visual.ultra ? 'ultra' : String(visual[key]);
      if (control.type === 'range') (control.previousElementSibling as HTMLOutputElement).value = String(visual[key]);
    }
    const dock = $('#showcase-camera-dock');
    const viewIndex = SHOWCASE_VIEWS.indexOf(view);
    $('#showcase-camera-name').textContent = t('vfx.view.' + view);
    dock.setAttribute('data-view', view);
    $('#showcase-camera-dots').replaceChildren(...SHOWCASE_VIEWS.map((_view, i) => {
      const dot = document.createElement('i');
      dot.classList.toggle('is-active', i === viewIndex);
      return dot;
    }));
    for (const button of airflowToggles) {
      button.setAttribute('aria-pressed', String(visual.airflow));
      button.disabled = !visual.enabled;
    }
    document.body.classList.toggle('airflow-active', visual.airflow && visual.enabled);
    document.body.classList.toggle('vfx-comfort', visual.comfortable);
    document.body.dataset.vfxComfort = String(visual.comfortable);
    document.body.dataset.vfxQuality = visual.ultra ? 'ultra' : visual.quality;
    document.body.dataset.vfxEnabled = String(visual.enabled);
    stopMotionIfCalm();
    airflowHud.setAttribute('aria-hidden', String(!visual.airflow || !visual.enabled));
    showAeroMode();
    try { localStorage.setItem(QUALITY_STORAGE_KEY, JSON.stringify(visual)); } catch { /* Settings remain usable in memory. */ }
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
    visual = vfxSettings({ ...visual, ...(key === 'preset' ? VFX_PRESETS[value as VfxPreset] : {}), ...(key === 'quality' ? { ultra: false } : {}), [key]: value });
    showVFX();
  });
  function stepShowcaseView(delta: number): void {
    // Stepping from a Garage preview view saves the view the player lands on, as stepping always has.
    visual = vfxSettings({ ...visual, view: stepView(previewView ?? visual.view, delta) });
    previewView = null;
    showVFX();
  }
  $('#showcase-camera-prev').addEventListener('click', () => stepShowcaseView(-1));
  $('#showcase-camera-next').addEventListener('click', () => stepShowcaseView(1));
  for (const button of airflowToggles) button.addEventListener('click', toggleAirflow);
  $('#vfx-reset').addEventListener('click', () => { visual = vfxSettings(); showVFX(); });
  showVFX();
  return {
    settings: (): VfxSettings => visual,
    deviceSelection,
    calm,
    stopMotionIfCalm,
    toggleAirflow,
    previewView(view: ShowcaseView | null): void {
      if (view === previewView) return;
      previewView = view;
      showVFX();
    },
    /** One-off language switch: the camera name and aero mode label. */
    relabel(): void {
      showAeroMode();
      $('#showcase-camera-name').textContent = t('vfx.view.' + (previewView ?? visual.view));
    },
  };
}
