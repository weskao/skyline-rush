import { applyI18n } from './i18n.ts';

/** Home/leave navigation shared by the running race and recovered Cup sessions. */
export function focusRace(): void {
  document.querySelector<HTMLDetailsElement>('#vfx-panel')!.open = false;
  (document.activeElement as HTMLElement | null)?.blur();
}

export function setupRaceNavigation(deps: {
  phase(): string;
  pause(): void;
  clearControls(): void;
  chooseTrack(): void;
  isPracticing(): boolean;
}): void {
  const leaveScreen = document.querySelector<HTMLDialogElement>('#leave-screen')!;
  const endRace = document.querySelector<HTMLButtonElement>('#leave-end')!;
  const labels = {
    'leave-title': ['leave.title', 'tutorial.leave.title'],
    'leave-copy': ['leave.copy', 'tutorial.leave.copy'],
    'leave-keep-label': ['leave.keep', 'tutorial.leave.keep'],
  } as const;
  leaveScreen.addEventListener('keydown', event => event.stopPropagation());
  document.querySelector('.brand')!.addEventListener('click', event => {
    if (!['racing', 'countdown', 'paused'].includes(deps.phase()) || document.querySelector('dialog[open]')) return;
    event.preventDefault();
    if (deps.phase() !== 'paused') deps.pause();
    const practicing = deps.isPracticing();
    for (const [id, keys] of Object.entries(labels)) {
      document.getElementById(id)!.dataset.i18n = keys[practicing ? 1 : 0];
    }
    endRace.hidden = practicing;
    applyI18n(leaveScreen);
    deps.clearControls(); leaveScreen.showModal();
  });
  document.querySelector('#leave-keep')!.addEventListener('click', () => {
    leaveScreen.close();
    if (deps.phase() === 'paused') deps.pause();
  });
  function returnToSelection(): void {
    leaveScreen.close();
    deps.chooseTrack();
  }
  endRace.addEventListener('click', returnToSelection);
  document.querySelector('#leave-home')!.addEventListener('click', event => {
    if (!deps.isPracticing()) return;
    event.preventDefault();
    returnToSelection();
  });
}
