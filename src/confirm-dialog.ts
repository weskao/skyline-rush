import { reactive } from 'vue';

export interface ConfirmOptions {
  title: string;
  body: string;
  /** Short facts shown one per line under `body`: what changes, what stays, how to undo it. */
  points?: string[];
  /** The action's label (secondary button). */
  confirm: string;
  /** The safe choice's label: the primary, focused button. */
  cancel: string;
}

// Rendered by ConfirmDialog.vue, an in-game replacement for the page-blocking native confirm().
export const confirmView = reactive({ open: false, title: '', body: '', points: [] as string[], confirm: '', cancel: '' });
let settle: ((ok: boolean) => void) | null = null;

/** Resolves true only when the player picks `confirm`; Cancel, Esc and the backdrop resolve false. */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  answerConfirm(false);
  Object.assign(confirmView, { points: [] }, options, { open: true });
  return new Promise(resolve => { settle = resolve; });
}

export function answerConfirm(ok: boolean): void {
  const done = settle;
  settle = null;
  confirmView.open = false;
  done?.(ok);
}
