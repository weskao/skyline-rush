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
}): void {
  const leaveScreen = document.querySelector<HTMLDialogElement>('#leave-screen')!;
  leaveScreen.addEventListener('keydown', event => event.stopPropagation());
  const openLeave = (event: Event): void => {
    if (!['racing', 'countdown', 'paused'].includes(deps.phase()) || document.querySelector('dialog[open]')) return;
    event.preventDefault();
    if (deps.phase() !== 'paused') deps.pause();
    deps.clearControls();
    // Touch browsers may not focus a clicked button or link. Give showModal a real
    // opener so the native close and Escape paths both restore it.
    (event.currentTarget as HTMLElement).focus({ preventScroll: true });
    leaveScreen.showModal();
  };
  document.querySelector('.brand')!.addEventListener('click', openLeave);
  document.querySelector('#pause-leave')!.addEventListener('click', openLeave);
  document.querySelector('#leave-close')!.addEventListener('click', () => leaveScreen.close());
  document.querySelector('#leave-keep')!.addEventListener('click', () => {
    leaveScreen.close();
    if (deps.phase() === 'paused') deps.pause();
  });
  document.querySelector('#leave-end')!.addEventListener('click', () => {
    leaveScreen.close(); deps.chooseTrack();
  });
}
