// A native modal owns one same-document history entry. Closing an inner modal
// returns to its parent entry. Keep the state fields used by Garage and other callers.
let nextEntry = 0;
const key = 'skylineRushDialog';

export function dialogNavigation(dialog: HTMLDialogElement, beforeClose = () => {}, afterClose = () => {}) {
  let entry = '';
  let pendingBack = false;
  const cleanup = () => window.removeEventListener('popstate', onBack);
  const closeDialog = () => {
    cleanup();
    pendingBack = false;
    beforeClose();
    dialog.close();
    afterClose();
  };
  const onBack = () => {
    if (dialog.open && !history.state?.[key]?.includes(entry)) closeDialog();
  };

  function close(immediate = false) {
    if (!dialog.open || pendingBack) return;
    const ownsEntry = history.state?.[key]?.at(-1) === entry;
    if (ownsEntry) { pendingBack = true; history.back(); }
    if (immediate || !ownsEntry) closeDialog();
  }

  // close() waits for an async history pop, so an exit animation holds its last frame until the dialog really closes:
  // without the fill the dialog repaints at full opacity for those frames (.claude/rules/dialog-exit-animation.md).
  let leaving: Animation[] = [];
  function leave(keyframes: Keyframe[] | PropertyIndexedKeyframes, options: KeyframeAnimationOptions, backdrop = false) {
    if (!dialog.open || leaving.length) return;
    const hold = { ...options, fill: 'forwards' as const };
    leaving = [dialog.animate(keyframes, hold), ...(backdrop ? [dialog.animate(keyframes, { ...hold, pseudoElement: '::backdrop' })] : [])];
    void leaving[0]!.finished.then(() => close(), () => {});
  }
  dialog.addEventListener('close', () => leaving.splice(0).forEach(animation => animation.cancel()));

  dialog.addEventListener('keydown', event => event.stopPropagation());
  return {
    open() {
      if (dialog.open) return;
      dialog.showModal();
      entry = `${performance.timeOrigin}:${++nextEntry}`;
      try {
        history.pushState({ ...history.state, [key]: [...(history.state?.[key] ?? []), entry] }, '');
        window.addEventListener('popstate', onBack);
      } catch {
        // WebKit can throttle session-history writes. The native close action still works.
      }
    },
    close,
    leave,
  };
}

export function dialogTabIndex(index: number, count: number, key: string): number | null {
  if (key === 'ArrowRight' || key === 'ArrowDown') return (index + 1) % count;
  if (key === 'ArrowLeft' || key === 'ArrowUp') return (index - 1 + count) % count;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return null;
}
