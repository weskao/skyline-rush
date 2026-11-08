// Dev-server half of the diag relay (VITE_DIAG=1 only; see src/diag-relay.ts): POST /__diag/log appends JSONL to
// diag-logs/<start time>.jsonl so a Claude Code session on the Mac can `tail -f` what the phone does.
import { appendFileSync, mkdirSync } from 'node:fs';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { join, relative } from 'node:path';

export const RELAY_PATH = '/__diag/log';
const MAX_BODY = 256 * 1024, MAX_ENTRIES = 1000, MAX_LINE = 8192;
const fail = (status, message) => Object.assign(new Error(message), { status });

/** Loopback, or Tailscale (100.64.0.0/10, fd7a:115c:a1e0::/48): WireGuard encrypts and authenticates that path, so nobody in
 *  the middle can read or forge logs. Plain Wi-Fi HTTP can be read and rewritten by anyone on the LAN: opt-in only. */
export function isTrustedPeer(address = '', allowLan = false) {
  const ip = address.replace(/^::ffff:/, '');
  if (allowLan || ip === '127.0.0.1' || ip === '::1') return true;
  const tailnet = /^100\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/.exec(ip);
  return tailnet ? Number(tailnet[1]) >= 64 && Number(tailnet[1]) <= 127 : ip.toLowerCase().startsWith('fd7a:115c:a1e0:');
}

const sameToken = (given, token) => typeof given === 'string' && given.length === token.length && timingSafeEqual(Buffer.from(given), Buffer.from(token));

/** One validated batch as JSONL. Server-owned fields come last so a client cannot spoof them; JSON escapes control codes,
 *  so a hostile message cannot drive the terminal running `tail -f`. */
export function batchToJsonl(body, token, received, peer) {
  let batch;
  try { batch = JSON.parse(body); } catch { throw fail(400, 'not JSON'); }
  if (!sameToken(batch?.token, token)) throw fail(403, 'bad token');
  if (!Array.isArray(batch.entries) || batch.entries.length > MAX_ENTRIES) throw fail(400, 'bad entries');
  const session = String(batch.session).slice(0, 32);
  const lines = batch.entries.filter(entry => entry && typeof entry === 'object' && !Array.isArray(entry)).map(entry => {
    const line = JSON.stringify({ ...entry, session, received, peer });
    return line.length <= MAX_LINE ? line : JSON.stringify({ kind: 'truncated', head: line.slice(0, MAX_LINE), session, received, peer });
  });
  return lines.length ? `${lines.join('\n')}\n` : '';
}

const git = (...args) => { try { return execFileSync('git', args, { encoding: 'utf8' }).trim(); } catch { return undefined; } };

export function diagRelayPlugin({ root = process.cwd(), dir = process.env.DIAG_LOG_DIR || join(root, 'diag-logs'), allowLan = process.env.DIAG_ALLOW_LAN === '1' } = {}) {
  const token = randomBytes(16).toString('hex'); // per server start; also stops other sites' pages on the phone from posting
  return {
    name: 'diag-relay', apply: 'serve',
    transformIndexHtml: () => [{ tag: 'meta', attrs: { name: 'diag-relay-token', content: token }, injectTo: 'head' }],
    configureServer(server) {
      mkdirSync(dir, { recursive: true, mode: 0o700 });
      const file = join(dir, `${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`);
      appendFileSync(file, `${JSON.stringify({ kind: 'server', received: new Date().toISOString(), branch: git('branch', '--show-current'), commit: git('rev-parse', '--short', 'HEAD'), allowLan })}\n`, { mode: 0o600 });
      server.config.logger.info(`  ➜  Diag log: ${relative(root, file) || file}  (live: npm run diag:tail)`);
      server.config.logger.info(allowLan ? '  ⚠  DIAG_ALLOW_LAN=1: logs travel unencrypted over Wi-Fi'
        : '  ➜  Diag log accepts Tailscale and localhost only (Wi-Fi: DIAG_ALLOW_LAN=1, unencrypted)');
      server.middlewares.use(RELAY_PATH, (req, res) => {
        const peer = req.socket.remoteAddress;
        const reply = (status, text = '') => { if (!res.headersSent) { res.statusCode = status; res.end(text); } };
        if (req.method !== 'POST') return reply(405);
        if (!isTrustedPeer(peer, allowLan)) return reply(403, 'diag relay: Tailscale or localhost only');
        const { origin, host } = req.headers;
        if (origin !== undefined && origin !== `http://${host}` && origin !== `https://${host}`) return reply(403, 'cross-origin');
        const chunks = []; let size = 0;
        req.on('data', chunk => { size += chunk.length; if (size > MAX_BODY) { reply(413); req.destroy(); } else chunks.push(chunk); });
        req.on('end', () => {
          if (size > MAX_BODY) return;
          try {
            const text = batchToJsonl(Buffer.concat(chunks).toString('utf8'), token, new Date().toISOString(), peer);
            if (text) appendFileSync(file, text); // sync keeps batches in arrival order; each is a few KB
            reply(204);
          } catch (error) { reply(error.status ?? 500); }
        });
      });
    },
  };
}
