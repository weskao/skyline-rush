import { reactive } from 'vue';

export interface ConfirmOptions {
  title: string;
  body: string;
  /** The action's label (secondary button). */
  confirm: string;
  /** The safe choice's label: the primary, focused button. */
  cancel: string;
}

// Rendered by ConfirmDialog.vue, an in-game replacement for the page-blocking native confirm().
export const confirmView = reactive({ open: false, title: '', body: '', confirm: '', cancel: '' });
let settle: ((ok: boolean) => void) | null = null;

/** Resolves true only when the player picks `confirm`; Cancel, Esc and the backdrop resolve false. */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  answerConfirm(false);
  Object.assign(confirmView, options, { open: true });
  return new Promise(resolve => { settle = resolve; });
}

export function answerConfirm(ok: boolean): void {
  const done = settle;
  settle = null;
  confirmView.open = false;
  done?.(ok);
}
