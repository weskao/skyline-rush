// A home-screen (standalone) app keeps the last loaded page alive across deploys, and GitHub Pages serves
// index.html with a 10-minute cache: comparing the served entry script against the running one tells
// whether a reload would bring a new build.
const ENTRY = /<script[^>]*type="module"[^>]*src="([^"]+)"/;
const RELOADED_KEY = 'skyline-rush-reloaded-for';

export function servedEntry(html) { return html.match(ENTRY)?.[1] ?? null; }

export function staleBuild(html, currentScript) {
  const served = servedEntry(html);
  return !!served && !!currentScript && !currentScript.endsWith(served);
}

// The entry <script> in the DOM, not import.meta.url: a chunk split would make the latter never match and reload forever.
export async function newBuildAvailable(currentScript = document.querySelector('script[type="module"][src]')?.src) {
  try {
    const response = await fetch('./', { cache: 'no-store' });
    const html = await response.text();
    return response.ok && staleBuild(html, currentScript) ? servedEntry(html) : null;
  } catch { return null; } // offline: the current page is all there is
}

// One reload per served entry: a stale edge still answering the old page must not spin the app.
export function reloadOnce(served, memory) {
  if (memory.getItem(RELOADED_KEY) === served) return false;
  memory.setItem(RELOADED_KEY, served);
  return true;
}

export async function refreshIfStale(canReload = () => true, memory = sessionStorage) {
  const served = await newBuildAvailable();
  if (served && canReload() && reloadOnce(served, memory)) location.reload();
}
