// Last uncaught errors, kept across reloads: a phone session that froze can be read back with ?diag.
export const CRASH_LOG_KEY = 'skyline-rush-crash-log';
export const BEAT_KEY = 'skyline-rush-diag-beat';
const KEEP = 8;
interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void }
interface ErrorTarget { addEventListener(type: string, listener: (event: any) => void, options?: boolean): void } // eslint-disable-line @typescript-eslint/no-explicit-any
export interface CrashContext { phase: string; track: string; mode: string }
interface CrashEntry extends CrashContext { at: string; message: string; stack: string }
/** The window pieces the live panel reads; a test passes fakes. */
export interface DiagWindow extends ErrorTarget {
  requestAnimationFrame(callback: (time: number) => void): number;
  setInterval(callback: () => void, ms: number): unknown;
  document: ErrorTarget & { visibilityState: string; activeElement: unknown; elementFromPoint(x: number, y: number): unknown };
}
const LIFECYCLE = ['pagehide', 'pageshow', 'visibilitychange', 'blur', 'focus', 'freeze', 'resume'];
const INPUT = ['pointerdown', 'pointerup', 'pointercancel', 'click', 'touchstart', 'touchend', 'touchcancel', 'gotpointercapture', 'lostpointercapture'];

export function installCrashLog(target: ErrorTarget, storage: StorageLike, context: () => CrashContext): void {
  const record = (message: unknown, stack: unknown): void => {
    try {
      const log = JSON.parse(storage.getItem(CRASH_LOG_KEY) ?? '[]') as CrashEntry[];
      log.push({ at: new Date().toISOString(), message: String(message), stack: String(stack ?? '').slice(0, 600), ...context() });
      storage.setItem(CRASH_LOG_KEY, JSON.stringify(log.slice(-KEEP)));
    } catch { /* A diagnostic never breaks the game. */ }
  };
  target.addEventListener('error', event => record(event.message ?? event, event.error?.stack));
  target.addEventListener('unhandledrejection', event => record(event.reason?.message ?? event.reason, event.reason?.stack));
  // Lifecycle events are logged like errors: a pagehide without navigation silently stops the game loop.
  for (const type of LIFECYCLE) target.addEventListener(type, event => record(`${type}${event.persisted ? ' persisted' : ''}`, ''));
}

const describe = (node: any): string => // eslint-disable-line @typescript-eslint/no-explicit-any
  node?.tagName ? `${node.tagName.toLowerCase()}${node.id ? `#${node.id}` : ''}${typeof node.className === 'string' && node.className ? `.${node.className.trim().split(/\s+/).join('.')}` : ''}` : String(node);
const clock = (): string => new Date().toISOString().slice(11, 19);

/** Shows the stored crash log in the given element (the error banner stays pointer-transparent) and keeps a live panel over it.
 *  Diagnostic builds only (`VITE_DIAG=1`, `make dev-diag` / `make phone-diag`): production never loads this module. */
export function showCrashLog(element: HTMLElement, storage: StorageLike, live?: { win: DiagWindow; context: () => CrashContext }): void {
  let log: CrashEntry[] = [];
  try { log = JSON.parse(storage.getItem(CRASH_LOG_KEY) ?? '[]'); } catch { /* unreadable storage reads as empty */ }
  const crashes = log.length ? log.map(entry => `${entry.at} [${entry.phase} ${entry.track} ${entry.mode}] ${entry.message}${entry.stack && `\n${entry.stack}`}`).join('\n') : 'crash log: empty';
  element.hidden = false;
  element.textContent = crashes;
  if (live) startLivePanel(live.win, element, storage, live.context, crashes);
}

function startLivePanel(win: DiagWindow, element: HTMLElement, storage: StorageLike, context: () => CrashContext, crashes: string): void {
  let frames = 0, inputs: string[] = [];
  const nativeRaf = win.requestAnimationFrame.bind(win);
  win.requestAnimationFrame = callback => nativeRaf(time => { frames++; callback(time); }); // counts the game loop's frames
  for (const type of INPUT) win.document.addEventListener(type, event => {
    const hit = event.clientX == null ? '' : ` hit=${describe(win.document.elementFromPoint(event.clientX, event.clientY))}`;
    // isPrimary=false on a one-finger tap means WebKit still holds a phantom touch, and a non-primary tap never clicks.
    const touch = event.touches ? ` touches=${event.touches.length}` : event.isPrimary === false && type.startsWith('pointer') ? ' NOT PRIMARY' : '';
    inputs = [...inputs.slice(-5), `${clock()} ${type} ${describe(event.target)}${hit}${touch}`];
  }, true);
  let previous = 'none'; try { previous = storage.getItem(BEAT_KEY) ?? 'none'; } catch { /* no storage, no previous beat */ }
  element.style.whiteSpace = 'pre-wrap'; element.style.textAlign = 'left';
  win.setInterval(() => {
    const { phase, track, mode } = context();
    const beat = `${clock()} frames=${frames} ${phase} ${track} ${mode}`;
    try { storage.setItem(BEAT_KEY, beat); } catch { /* the panel still shows it */ }
    // Newest lines last: the banner grows upward from its fixed bottom, so the top may leave the screen.
    element.textContent = [crashes, `before reload: ${previous}`, ...inputs, `diag ${beat} vis=${win.document.visibilityState} active=${describe(win.document.activeElement)}`].join('\n');
  }, 500);
}
