import { reactive } from 'vue';

export interface Toast {
  text: string;
  /** SVG inner markup from `icons` (src/icons.ts). */
  icon?: string;
}

export const TOAST_MS = 1800;

// One toast at a time, rendered by GameToast.vue; `id` changes per toast so a replacement replays its entry.
export const toastView = reactive({ text: '', icon: '', id: 0 });
let hideTimer: ReturnType<typeof setTimeout> | undefined;

/** A brief, self-dismissing confirmation for a setting that is easy to change by accident. */
export function showToast({ text, icon = '' }: Toast): void {
  clearTimeout(hideTimer);
  Object.assign(toastView, { text, icon, id: toastView.id + 1 });
  hideTimer = setTimeout(() => { toastView.text = ''; }, TOAST_MS);
}
