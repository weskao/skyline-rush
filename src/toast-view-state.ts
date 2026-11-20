import { reactive } from 'vue';
import { t } from './i18n.ts';

export interface Toast {
  text: string;
  /** SVG inner markup from `icons` (src/icons.ts). */
  icon?: string;
  /** A toggle's new state, drawn as a badge after `text`: filled for ON, outlined for OFF. */
  state?: { on: boolean; text: string };
}

export const TOAST_MS = 1800;

// One toast at a time, rendered by GameToast.vue; `id` changes per toast so a replacement replays its entry.
export const toastView = reactive({ text: '', icon: '', state: '' as '' | 'on' | 'off', stateText: '', id: 0 });
let hideTimer: ReturnType<typeof setTimeout> | undefined;

/** A brief, self-dismissing confirmation for a setting that is easy to change by accident. */
export function showToast({ text, icon = '', state }: Toast): void {
  clearTimeout(hideTimer);
  Object.assign(toastView, { text, icon, state: state ? (state.on ? 'on' : 'off') : '', stateText: state?.text ?? '', id: toastView.id + 1 });
  hideTimer = setTimeout(() => { toastView.text = ''; }, TOAST_MS);
}

/** A toggle's toast: the setting's name, then its new state as the ON/OFF badge. */
export function showSettingToast(name: 'sound' | 'airflow' | 'assist' | 'vfx', on: boolean, icon: string): void {
  showToast({ text: t(`toast.${name}`), icon, state: { on, text: t(on ? 'toast.on' : 'toast.off') } });
}
