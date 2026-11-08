import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installCrashLog, showCrashLog } from '../src/crash-log.ts';
import { captureConsole, createRelay, relayStatus } from '../src/diag-relay.ts';
import { summarizeUserAgent } from '../src/diag-device.ts';
import { batchToJsonl, isTrustedPeer } from '../scripts/diag-relay-plugin.mjs';

const fakeStorage = () => { const map = new Map(); return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) }; };

test('the beat carries extra context (quality tier, perf stats) to the relay; the panel text stays as before', () => {
  const emitted = [];
  const doc = { addEventListener() {}, visibilityState: 'visible', activeElement: { tagName: 'BODY', className: '' }, elementFromPoint: () => null };
  let tick;
  const win = { addEventListener() {}, requestAnimationFrame: () => 1, setInterval: fn => { tick = fn; }, document: doc };
  const perf = { p50: 16.7, p95: 22.1, fps: 58, seconds: 20, drawCalls: 120, triangles: 90000 };
  const element = { hidden: true, textContent: '', style: {} };
  showCrashLog(element, fakeStorage(), { win, context: () => ({ phase: 'racing', track: 'coast', mode: 'classic', quality: 'high', perf }), emit: entry => emitted.push(entry) });
  tick();
  const beat = emitted.find(entry => entry.kind === 'beat');
  assert.equal(beat.quality, 'high');
  assert.deepEqual(beat.perf, perf);
  assert.match(element.textContent, /diag \d\d:\d\d:\d\d frames=0 racing coast classic vis=visible active=body$/);
});

test('crash, lifecycle, input and beat entries reach the relay emitter', () => {
  const emitted = [], listeners = {};
  const doc = { addEventListener: (type, fn) => { listeners[type] = fn; }, visibilityState: 'visible', activeElement: { tagName: 'BODY', className: '' }, elementFromPoint: () => null };
  let tick;
  const win = { addEventListener: (type, fn) => { listeners[type] = fn; }, requestAnimationFrame: () => 1, setInterval: fn => { tick = fn; }, document: doc };
  const context = () => ({ phase: 'racing', track: 'tokyo', mode: 'classic' });
  const emit = entry => emitted.push(entry);
  installCrashLog(win, fakeStorage(), context, emit);
  listeners.error({ message: 'boom', error: { stack: 'Error: boom' } });
  listeners.pagehide({ persisted: true });
  showCrashLog({ hidden: true, textContent: '', style: {} }, fakeStorage(), { win, context, emit });
  listeners.pointerdown({ target: { tagName: 'BUTTON', id: 'go', className: '' }, clientX: 1, clientY: 1 });
  tick();
  assert.deepEqual(emitted.map(e => e.kind), ['crash', 'lifecycle', 'previous-beat', 'input', 'beat']);
  assert.equal(emitted[0].message, 'boom');
  assert.equal(emitted[1].message, 'pagehide persisted');
  assert.match(emitted[3].line, /pointerdown button#go/);
  assert.deepEqual([emitted[4].phase, emitted[4].vis, emitted[4].frames], ['racing', 'visible', 0]);
});

test('the relay batches entries with token and session, flushes nothing when empty, caps its queue', () => {
  const sent = [];
  const relay = createRelay({ token: 'tok', session: 's1', now: () => 'T', send: (body, final) => sent.push([JSON.parse(body), final]) });
  relay.flush();
  assert.equal(sent.length, 0);
  relay.emit({ kind: 'beat', frames: 3 });
  relay.flush(true);
  assert.deepEqual(sent[0], [{ token: 'tok', session: 's1', entries: [{ t: 'T', kind: 'beat', frames: 3 }] }, true]);
  for (let i = 0; i < 600; i++) relay.emit({ kind: 'input', i });
  relay.flush();
  const { entries } = sent[1][0];
  assert.equal(entries.length, 501);
  assert.deepEqual(entries.at(-1), { t: 'T', kind: 'dropped', count: 100 });
  assert.equal(entries[0].i, 100);
});

test('the status badge is live only while the Mac acknowledged a batch in the last 2 s', () => {
  assert.deepEqual(relayStatus(1000, undefined, undefined), { live: false, text: 'DIAG … 連線中' });
  assert.deepEqual(relayStatus(5000, 4000, undefined), { live: true, text: 'DIAG ● 連線中' });
  assert.deepEqual(relayStatus(9000, 4000, undefined), { live: false, text: 'DIAG ✕ 中斷 5s' });
  assert.deepEqual(relayStatus(9000, 4000, '403'), { live: false, text: 'DIAG ✕ 中斷 5s · 403' });
  assert.deepEqual(relayStatus(9000, undefined, 'network'), { live: false, text: 'DIAG ✕ 中斷 · network' });
});

test('a throwing sender never breaks the game', () => {
  const relay = createRelay({ token: 't', session: 's', now: () => 'T', send() { throw new Error('offline'); } });
  relay.emit({ kind: 'beat' });
  assert.doesNotThrow(() => relay.flush());
});

test('console errors and warnings are relayed and still printed', () => {
  const printed = [], emitted = [];
  const con = { error: (...a) => printed.push(['error', ...a]), warn: (...a) => printed.push(['warn', ...a]) };
  captureConsole(con, entry => emitted.push(entry));
  const circular = {}; circular.self = circular;
  con.error('bad', new Error('kaput'), { a: 1 });
  con.warn(circular);
  assert.equal(printed.length, 2);
  assert.equal(emitted[0].level, 'error');
  assert.match(emitted[0].message, /^bad kaput\n.*\{"a":1\}$/s);
  assert.deepEqual([emitted[1].level, emitted[1].message], ['warn', '[object Object]']);
});

test('user agents summarize into device class, OS version and browser version', () => {
  const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
  assert.deepEqual(summarizeUserAgent(iphone, 5), { device: 'iPhone', os: 'iOS 18.1', browser: 'Safari 18.1' });
  // Safari 26 freezes the UA's OS at 18.x; its own version tracks the real iOS (seen on a real iPhone, 2026-11-09).
  const safari26 = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3 Mobile/15E148 Safari/604.1';
  assert.deepEqual(summarizeUserAgent(safari26, 5), { device: 'iPhone', os: 'iOS 26.3 (UA says 18.7)', browser: 'Safari 26.3' });
  const crios ='Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1';
  assert.deepEqual(summarizeUserAgent(crios, 5), { device: 'iPhone', os: 'iOS 17.4', browser: 'Chrome 130.0.6723.90' });
  const ipadDesktopMode = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
  assert.equal(summarizeUserAgent(ipadDesktopMode, 5).device, 'iPad');
  assert.equal(summarizeUserAgent(ipadDesktopMode, 0).device, 'desktop');
  const pixel = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';
  assert.deepEqual(summarizeUserAgent(pixel, 5), { device: 'Android phone', os: 'Android 14', browser: 'Chrome 131.0.0.0' });
  const samsungTab = 'Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Safari/537.36';
  assert.deepEqual(summarizeUserAgent(samsungTab, 5), { device: 'Android tablet', os: 'Android 13', browser: 'Samsung Internet 25.0' });
  const win = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.2903.70';
  assert.deepEqual(summarizeUserAgent(win, 0), { device: 'desktop', os: 'Windows NT 10.0', browser: 'Edge 131.0.2903.70' });
});

test('only loopback and Tailscale peers may post logs unless LAN is explicitly allowed', () => {
  for (const ip of ['127.0.0.1', '::1', '::ffff:127.0.0.1', '100.64.0.1', '100.101.102.103', '100.127.255.254', 'fd7a:115c:a1e0::1']) assert.equal(isTrustedPeer(ip), true, ip);
  for (const ip of ['192.168.1.20', '10.0.0.5', '100.63.0.1', '100.128.0.1', 'fe80::1', '', undefined]) assert.equal(isTrustedPeer(ip), false, String(ip));
  assert.equal(isTrustedPeer('192.168.1.20', true), true);
});

test('batches become JSONL with server-owned fields; bad tokens and shapes are refused', () => {
  const body = JSON.stringify({ token: 'secret', session: 'abc', entries: [{ t: 'T', kind: 'beat', peer: 'spoofed' }, 'junk', { kind: 'x\u001b[2J' }] });
  const lines = batchToJsonl(body, 'secret', 'R', '100.64.0.2').trim().split('\n');
  assert.equal(lines.length, 2);
  assert.deepEqual(JSON.parse(lines[0]), { t: 'T', kind: 'beat', peer: '100.64.0.2', session: 'abc', received: 'R' });
  assert.doesNotMatch(lines[1], /\u001b/); // JSON escapes terminal control codes for `tail -f`
  assert.throws(() => batchToJsonl(JSON.stringify({ token: 'wrong', session: 'a', entries: [] }), 'secret', 'R', 'p'), { status: 403 });
  assert.throws(() => batchToJsonl(JSON.stringify({ session: 'a', entries: [] }), 'secret', 'R', 'p'), { status: 403 });
  assert.throws(() => batchToJsonl(JSON.stringify({ token: 'secret', entries: 'x' }), 'secret', 'R', 'p'), { status: 400 });
  assert.throws(() => batchToJsonl('not json', 'secret', 'R', 'p'), { status: 400 });
  const huge = JSON.stringify({ token: 'secret', session: 'a', entries: [{ kind: 'console', message: 'x'.repeat(20000) }] });
  assert.equal(JSON.parse(batchToJsonl(huge, 'secret', 'R', 'p')).kind, 'truncated');
});

test('the relay is diag-only: vite gates the plugin on VITE_DIAG and the production audit refuses its markers', () => {
  const vite = readFileSync(new URL('../vite.config.js', import.meta.url), 'utf8');
  assert.match(vite, /process\.env\.VITE_DIAG \? \[diagRelayPlugin\(\)\] : \[\]/);
  const gate = readFileSync(new URL('../scripts/assert-production-locked.mjs', import.meta.url), 'utf8');
  assert.match(gate, /'__diag\/log'/);
  assert.match(gate, /'diag-relay-token'/);
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(main, /if \(import\.meta\.env\.VITE_DIAG\) import\('\.\/diag-relay\.ts'\)/);
});
