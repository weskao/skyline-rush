/** The lobby expands the existing mode buttons and track cards in place. */
export function setupLobbyPickers(centerSelectedTrack: () => void): void {
  for (const id of ['lobby-modes-toggle', 'lobby-tracks-toggle']) {
    const toggle = document.getElementById(id)!;
    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      if (!expanded && id === 'lobby-tracks-toggle') centerSelectedTrack();
    });
  }
}

export function focusLobbyTrack(trackId: string): void {
  const card = document.querySelector<HTMLElement>(`[data-track="${trackId}"]`);
  const toggle = document.querySelector<HTMLButtonElement>('#lobby-tracks-toggle')!;
  const target = card?.getClientRects().length ? card :
    toggle.disabled ? document.getElementById('lobby-modes-toggle')! : toggle;
  target.focus({ preventScroll: true });
}
