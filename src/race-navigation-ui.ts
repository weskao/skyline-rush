import { applyI18n } from './i18n.ts';

/** Home/leave navigation shared by the running race and recovered Cup sessions. */
export function focusRace(): void {
  (document.activeElement as HTMLElement | null)?.blur();
}

export function setupRaceNavigation(deps: {
  phase(): string;
  pause(): void;
  clearControls(): void;
  chooseTrack(): void;
  isPracticing(): boolean;
  requestVehicleReset(): boolean;
}) {
  const resetButton = document.querySelector<HTMLButtonElement>('#vehicle-reset-button')!;
  function resetVehicle(): void {
    if (deps.isPracticing() || deps.phase() !== 'racing' || document.querySelector('dialog[open]')) return;
    if (deps.requestVehicleReset()) resetButton.disabled = true;
  }
  resetButton.addEventListener('click', resetVehicle);
  const leaveScreen = document.querySelector<HTMLDialogElement>('#leave-screen')!;
  const endRace = document.querySelector<HTMLButtonElement>('#leave-end')!;
  const labels = {
    'leave-title': ['leave.title', 'tutorial.leave.title'],
    'leave-copy': ['leave.copy', 'tutorial.leave.copy'],
    'leave-keep-label': ['leave.keep', 'tutorial.leave.keep'],
  } as const;
  leaveScreen.addEventListener('keydown', event => event.stopPropagation());
  const openLeave = (event: Event): void => {
    event.preventDefault();
    if (document.querySelector('dialog[open]')) return;
    if (deps.phase() === 'finished') { deps.chooseTrack(); return; }
    if (!['racing', 'countdown', 'paused'].includes(deps.phase())) return;
    if (deps.phase() !== 'paused') deps.pause();
    const practicing = deps.isPracticing();
    for (const [id, keys] of Object.entries(labels)) {
      document.getElementById(id)!.dataset.i18n = keys[practicing ? 1 : 0];
    }
    endRace.hidden = practicing;
    applyI18n(leaveScreen);
    deps.clearControls();
    // Touch browsers may not focus a clicked button or link. Give showModal a real
    // opener so the native close and Escape paths both restore it.
    (event.currentTarget as HTMLElement).focus({ preventScroll: true });
    leaveScreen.showModal();
  };
  document.querySelector('.brand')!.addEventListener('click', openLeave);
  document.querySelector('.intro-wordmark')!.addEventListener('click', openLeave);
  document.querySelector('#pause-leave')!.addEventListener('click', openLeave);
  document.querySelector('#leave-close')!.addEventListener('click', () => leaveScreen.close());
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
    event.preventDefault();
    returnToSelection();
  });
  return { resetVehicle };
}
