export function watchAudioPage(setHidden: (hidden: boolean) => void, signal?: AbortSignal): void {
  const options = { signal };
  const sync = () => setHidden(document.hidden);
  document.addEventListener('visibilitychange', sync, options);
  document.addEventListener('freeze', () => setHidden(true), options);
  document.addEventListener('resume', sync, options);
  window.addEventListener('focus', sync, options);
  window.addEventListener('pageshow', sync, options);
  window.addEventListener('pagehide', () => setHidden(true), options);
}
