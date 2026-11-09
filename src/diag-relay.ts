// Streams the diag panel's data (crashes, lifecycle, inputs, 500 ms beat, console errors, device facts) to the dev
// server, which appends it to diag-logs/*.jsonl on the Mac (scripts/diag-relay-plugin.mjs). Diagnostic builds only.
import { installCrashLog, showCrashLog, type CrashContext, type DiagEmit } from './crash-log.ts';
import { describeDevice, deviceHints, viewportOf } from './diag-device.ts';
import { latestPerf } from './perf-overlay.ts';

export const RELAY_PATH = '/__diag/log';
const MAX_QUEUE = 500;
interface RelayDeps { token: string; session: string; now(): string; send(body: string, final: boolean): void }

/** Queues entries and sends one JSON batch per flush; past MAX_QUEUE the oldest drop, so an unreachable Mac never grows memory. */
export function createRelay({ token, session, now, send }: RelayDeps): { emit: DiagEmit; flush(final?: boolean): void } {
  let queue: Record<string, unknown>[] = [], dropped = 0;
  return {
    emit(entry) { queue.push({ t: now(), ...entry }); if (queue.length > MAX_QUEUE) { queue.shift(); dropped++; } },
    flush(final = false) {
      if (!queue.length) return;
      const entries = dropped ? [...queue, { t: now(), kind: 'dropped', count: dropped }] : queue;
      queue = []; dropped = 0;
      try { send(JSON.stringify({ token, session, entries }), final); } catch { /* A diagnostic never breaks the game. */ }
    },
  };
}

const formatArg = (arg: unknown): string => {
  if (arg instanceof Error) return `${arg.message}\n${arg.stack ?? ''}`;
  if (typeof arg === 'string') return arg;
  try { return JSON.stringify(arg) ?? String(arg); } catch { return String(arg); }
};

/** Relays console.error / console.warn and still prints them. */
export function captureConsole(con: Pick<Console, 'error' | 'warn'>, emit: DiagEmit): void {
  for (const level of ['error', 'warn'] as const) {
    const original = con[level].bind(con);
    con[level] = (...args: unknown[]) => { emit({ kind: 'console', level, message: args.map(formatArg).join(' ').slice(0, 2000) }); original(...args); };
  }
}

const STALE_MS = 2000; // four flushes without a 204 means the Mac is not getting the stream

/** Badge text from real acknowledgements: live only while the dev server answered a batch within STALE_MS. */
export function relayStatus(now: number, lastOk: number | undefined, lastError: string | undefined): { live: boolean; text: string } {
  if (lastOk !== undefined && now - lastOk < STALE_MS) return { live: true, text: 'DIAG ● 連線中' };
  if (lastOk === undefined && lastError === undefined) return { live: false, text: 'DIAG … 連線中' };
  const since = lastOk === undefined ? '' : ` ${Math.round((now - lastOk) / 1000)}s`;
  return { live: false, text: `DIAG ✕ 中斷${since}${lastError ? ` · ${lastError}` : ''}` };
}

/** A small top-centre pill that never takes a tap. A manual popover sits in the top layer, above modal dialogs too. */
function createBadge(doc: Document): { show(status: { live: boolean; text: string }): void } {
  const badge = doc.createElement('div');
  badge.id = 'diag-status';
  badge.setAttribute('role', 'status');
  Object.assign(badge.style, {
    position: 'fixed', inset: 'auto', top: 'calc(env(safe-area-inset-top, 0px) + 2px)', left: '50%', transform: 'translateX(-50%)',
    margin: '0', border: 'none', padding: '1px 8px', borderRadius: '9px', zIndex: '2147483647', pointerEvents: 'none',
    font: '600 11px/1.4 system-ui, sans-serif', color: '#fff', whiteSpace: 'nowrap',
  });
  doc.body.append(badge);
  const popover = typeof badge.showPopover === 'function';
  if (popover) { badge.popover = 'manual'; badge.showPopover(); }
  let text = '', modals = 0;
  return {
    show(status) {
      // A modal opened later stacks above the badge; re-showing moves the badge back to the top.
      // Only popover browsers are asked about :modal, which they all support (an unknown selector would throw).
      const open = popover ? doc.querySelectorAll('dialog:modal').length : 0;
      if (open !== modals) { badge.hidePopover(); badge.showPopover(); modals = open; }
      if (status.text === text) return;
      text = badge.textContent = status.text;
      badge.style.background = status.live ? 'rgba(22, 128, 61, 0.85)' : 'rgba(190, 18, 60, 0.9)';
    },
  };
}

const randomId =(crypto: Crypto): string => Array.from(crypto.getRandomValues(new Uint8Array(6)), byte => byte.toString(16).padStart(2, '0')).join('');

/** Installs the crash log and live panel; with the relay token the dev server injected, also streams everything to the Mac. */
export function startDiag(win: Window & typeof globalThis, storage: Storage, element: HTMLElement, context: () => CrashContext): void {
  const token = win.document.querySelector<HTMLMetaElement>('meta[name="diag-relay-token"]')?.content;
  let lastOk: number | undefined, lastError: string | undefined, inFlight = false;
  const relay = token ? createRelay({
    token, session: randomId(win.crypto), now: () => new Date().toISOString(),
    // sendBeacon survives the page going away; the regular flush uses fetch so its reply drives the status badge.
    send(body, final) {
      if (final) { win.navigator.sendBeacon(RELAY_PATH, body); return; }
      inFlight = true;
      win.fetch(RELAY_PATH, { method: 'POST', body, keepalive: true, signal: AbortSignal.timeout?.(4000) })
        .then(response => { if (response.ok) { lastOk = Date.now(); lastError = undefined; } else lastError = String(response.status); },
          () => { lastError = 'network'; })
        .finally(() => { inFlight = false; });
    },
  }) : undefined;
  if (relay) {
    relay.emit({ kind: 'device', page: win.location.pathname, ...describeDevice(win) });
    void deviceHints(win).then(hints => hints && relay.emit({ kind: 'device-hints', ...hints }));
    captureConsole(win.console, relay.emit);
    let resized: ReturnType<typeof setTimeout> | undefined;
    win.addEventListener('resize', () => { clearTimeout(resized); resized = setTimeout(() => relay.emit({ kind: 'viewport', ...viewportOf(win) }), 300); });
  }
  installCrashLog(win, storage, context, relay?.emit);
  // With the relay the Mac has the full log, so the panel renders off-screen and only the badge covers the game.
  // Beats also carry the racing frame-time window, so `npm run diag:tail` has p50/p95 without a ?perf strip on screen.
  showCrashLog(relay ? win.document.createElement('pre') : element, storage, { win, context: () => ({ ...context(), perf: latestPerf() }), emit: relay?.emit });
  if (!relay) return;
  const badge = createBadge(win.document);
  win.setInterval(() => {
    if (!inFlight) relay.flush(); // one POST at a time: a stalled network queues entries (capped) instead of piling up requests
    badge.show(relayStatus(Date.now(), lastOk, lastError));
  }, 500);
  // Registered after installCrashLog, so its pagehide / hidden entries are already queued when this flushes.
  win.addEventListener('pagehide', () => relay.flush(true));
  win.addEventListener('visibilitychange',() => { if (win.document.visibilityState === 'hidden') relay.flush(true); });
}
