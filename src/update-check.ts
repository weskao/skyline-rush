// Check the served entry script rather than import.meta.url; dynamic chunks
// must never cause a perpetual app reload.
const ENTRY = /<script[^>]*type="module"[^>]*src="([^"]+)"/;
const RELOADED_KEY = 'skyline-rush-reloaded-for';

export interface ReloadStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function servedEntry(html: string): string | null {
  return html.match(ENTRY)?.[1] ?? null;
}

export function staleBuild(html: string, currentScript?: string | null): boolean {
  const served = servedEntry(html);
  return !!served && !!currentScript && !currentScript.endsWith(served);
}

export async function newBuildAvailable(
  currentScript: string | undefined = document.querySelector<HTMLScriptElement>('script[type="module"][src]')?.src,
): Promise<string | null> {
  try {
    const response = await fetch('./', { cache: 'no-store' });
    const html = await response.text();
    return response.ok && staleBuild(html, currentScript) ? servedEntry(html) : null;
  } catch { return null; } // Offline: the running build remains usable.
}

// Only one reload per served entry, even when a CDN edge responds with stale HTML.
export function reloadOnce(served: string, memory: ReloadStorage): boolean {
  if (memory.getItem(RELOADED_KEY) === served) return false;
  memory.setItem(RELOADED_KEY, served);
  return true;
}

export async function refreshIfStale(
  canReload: () => boolean = () => true,
  memory: ReloadStorage = sessionStorage,
): Promise<void> {
  const served = await newBuildAvailable();
  if (served && canReload() && reloadOnce(served, memory)) location.reload();
}
