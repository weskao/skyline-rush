// Streams the diag panel's data (crashes, lifecycle, inputs, 500 ms beat, console errors, device facts) to the dev
// server, which appends it to diag-logs/*.jsonl on the Mac (scripts/diag-relay-plugin.mjs). Diagnostic builds only.
import { installCrashLog, showCrashLog, type CrashContext, type DiagEmit } from './crash-log.ts';
import { describeDevice, deviceHints, viewportOf } from './diag-device.ts';

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

const randomId = (crypto: Crypto): string => Array.from(crypto.getRandomValues(new Uint8Array(6)), byte => byte.toString(16).padStart(2, '0')).join('');

/** Installs the crash log and live panel; with the relay token the dev server injected, also streams everything to the Mac. */
export function startDiag(win: Window & typeof globalThis, storage: Storage, element: HTMLElement, context: () => CrashContext): void {
  const token = win.document.querySelector<HTMLMetaElement>('meta[name="diag-relay-token"]')?.content;
  const relay = token ? createRelay({
    token, session: randomId(win.crypto), now: () => new Date().toISOString(),
    // sendBeacon survives the page going away; the regular flush uses fetch so a failed POST stays silent.
    send: (body, final) => { if (final) win.navigator.sendBeacon(RELAY_PATH, body); else win.fetch(RELAY_PATH, { method: 'POST', body, keepalive: true }).catch(() => {}); },
  }) : undefined;
  if (relay) {
    relay.emit({ kind: 'device', page: win.location.pathname, ...describeDevice(win) });
    void deviceHints(win).then(hints => hints && relay.emit({ kind: 'device-hints', ...hints }));
    captureConsole(win.console, relay.emit);
    let resized: ReturnType<typeof setTimeout> | undefined;
    win.addEventListener('resize', () => { clearTimeout(resized); resized = setTimeout(() => relay.emit({ kind: 'viewport', ...viewportOf(win) }), 300); });
  }
  installCrashLog(win, storage, context, relay?.emit);
  showCrashLog(element, storage, { win, context, emit: relay?.emit });
  if (!relay) return;
  win.setInterval(() => relay.flush(), 500);
  // Registered after installCrashLog, so its pagehide / hidden entries are already queued when this flushes.
  win.addEventListener('pagehide', () => relay.flush(true));
  win.addEventListener('visibilitychange',() => { if (win.document.visibilityState === 'hidden') relay.flush(true); });
}
