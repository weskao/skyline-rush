import { t } from './i18n.ts';
import { vfxSettings, VFX_PRESETS, SHOWCASE_VIEWS, type VfxSettings, type ShowcaseView, type VfxPreset } from './vfx-settings.ts';
import { type InitialDeviceVisuals, QUALITY_STORAGE_KEY } from './device-quality.ts';
import { showSettingToast } from './toast-view-state.ts';
import { confirmDialog } from './confirm-dialog.ts';
import { icons } from './icons.ts';

interface VfxWorld { configureVFX(settings: VfxSettings): void }
interface VfxOptions {
  getWorld(): VfxWorld | null | undefined;
  /** The showcase hides the track picker, so swiping is how to change track. */
  onAirflowShown(): void;
  reducedMotion: MediaQueryList;
  deviceSelection: InitialDeviceVisuals;
}

export const stepView = (view: ShowcaseView, delta: number): ShowcaseView =>
  SHOWCASE_VIEWS[(SHOWCASE_VIEWS.indexOf(view) + delta + SHOWCASE_VIEWS.length) % SHOWCASE_VIEWS.length]!;

export function setupVfxUI({ getWorld, onAirflowShown, reducedMotion, deviceSelection }: VfxOptions) {
  const $ = <T extends Element = HTMLElement>(selector: string): T => document.querySelector<T>(selector)!;
  const vfxControls = [...document.querySelectorAll<HTMLInputElement>('[data-vfx]')];
  const airflowHud = $('#airflow-hud');
  const airflowToggles = document.querySelectorAll<HTMLButtonElement>('#airflow-toggle, #home-airflow-toggle');
  let visual = deviceSelection.settings;
  const calm = (): boolean => !visual.enabled || visual.comfortable || reducedMotion.matches;
  function stopMotionIfCalm(): void {
    if (calm()) document.getAnimations().forEach(animation => animation.cancel());
  }
  function showAeroMode(): void { $('#aero-mode').textContent = t(visual.aeroMode === 'downforce' ? 'hud.highDownforce' : 'hud.lowDrag'); }
  function showVFX(): void {
    getWorld()?.configureVFX(visual);
    for (const control of vfxControls) {
      const key = control.dataset.vfx as keyof VfxSettings;
      if (control.type === 'checkbox') control.checked = visual[key] as boolean;
      else control.value = key === 'quality' && visual.ultra ? 'ultra' : String(visual[key]);
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
    showSettingToast('airflow', visual.airflow, icons.airflow);
    if (visual.airflow) onAirflowShown();
  }
  function applyControl(control: HTMLInputElement): void {
    const key = control.dataset.vfx!;
    const value = control.type === 'checkbox' ? control.checked : control.type === 'range' ? Number(control.value) : control.value;
    visual = vfxSettings({ ...visual, ...(key === 'preset' ? VFX_PRESETS[value as VfxPreset] : {}), ...(key === 'quality' ? { ultra: false } : {}), [key]: value });
    showVFX();
    if (key === 'enabled') showSettingToast('vfx', !!value, icons.star);
  }
  // Every switch-off asks in game (.claude/rules/no-native-ui.md); the box stays on until the player confirms, and turning effects on never asks.
  async function confirmVfxOff(control: HTMLInputElement): Promise<void> {
    control.checked = true;
    const ok = await confirmDialog({
      title: t('vfxOff.title'), body: '', points: [t('vfxOff.hidden'), t('vfxOff.same'), t('vfxOff.later')],
      confirm: t('vfxOff.confirm'), cancel: t('vfxOff.keep'),
    });
    if (!ok || !visual.enabled) return;
    control.checked = false;
    applyControl(control);
  }
  for (const control of vfxControls) control.addEventListener('input', () => {
    if (control.dataset.vfx === 'enabled' && !control.checked) void confirmVfxOff(control);
    else applyControl(control);
  });
  function stepShowcaseView(delta: number): void {
    visual = vfxSettings({ ...visual, view: stepView(visual.view, delta) });
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
    /** One-off language switch: the camera name and aero mode label. */
    relabel(): void {
      showAeroMode();
      $('#showcase-camera-name').textContent = t('vfx.view.' + visual.view);
    },
  };
}
