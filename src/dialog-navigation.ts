// A native modal owns one same-document history entry. Closing an inner modal
// returns to its parent entry. Keep the state fields used by Garage and other callers.
let nextEntry = 0;
const key = 'skylineRushDialog';

export function dialogNavigation(dialog: HTMLDialogElement, beforeClose = () => {}) {
  let entry = '';
  let pendingBack = false;
  const cleanup = () => window.removeEventListener('popstate', onBack);
  const closeDialog = () => {
    cleanup();
    pendingBack = false;
    beforeClose();
    dialog.close();
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
  };
}

export function dialogTabIndex(index: number, count: number, key: string): number | null {
  if (key === 'ArrowRight' || key === 'ArrowDown') return (index + 1) % count;
  if (key === 'ArrowLeft' || key === 'ArrowUp') return (index - 1 + count) % count;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return null;
}
