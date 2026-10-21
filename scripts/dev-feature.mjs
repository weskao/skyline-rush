import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = path.resolve(import.meta.dirname, '..');
const worktreesRoot = path.join(repoRoot, '.claude', 'worktrees');

export function featureSlug(raw) {
  const name = String(raw ?? '').trim().replace(/^feature\//, '');
  if (name === '.' || name === '..' || !/^[A-Za-z0-9._-]+$/.test(name)) {
    throw new Error(
      'Usage: make dev-feature FEATURE=<name>\nExample: make dev-feature FEATURE=world-tour-landmark-boost-polish',
    );
  }
  return name;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function capture(args, cwd) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    if (result.stderr) process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }
  return result.stdout;
}

function worktreeExists(worktree) {
  const wanted = path.resolve(worktree);
  return capture(['worktree', 'list', '--porcelain'], repoRoot)
    .split('\n')
    .some((line) => line.startsWith('worktree ') && path.resolve(line.slice('worktree '.length)) === wanted);
}

function localBranchExists(branch) {
  const result = spawnSync('git', ['show-ref', '--verify', '--quiet', `refs/heads/${branch}`], { cwd: repoRoot });
  return result.status === 0;
}

function ensureCerts() {
  const dir = path.join(worktreesRoot, '.certs');
  const key = path.join(dir, 'localhost-key.pem');
  const cert = path.join(dir, 'localhost-cert.pem');
  if (fs.existsSync(key) && fs.existsSync(cert)) return { key, cert };
  fs.mkdirSync(dir, { recursive: true });
  run('openssl', [
    'req', '-x509', '-newkey', 'rsa:2048', '-sha256', '-days', '825', '-nodes',
    '-keyout', key,
    '-out', cert,
    '-subj', '/CN=127.0.0.1',
    '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1',
  ]);
  fs.chmodSync(key, 0o600);
  return { key, cert };
}

async function serve(worktree, tls) {
  // shortcut: this checkout's launcher loads the worktree's Vite. Revisit if a branch cannot import that file.
  const viteUrl = pathToFileURL(path.join(worktree, 'node_modules/vite/dist/node/index.js')).href;
  const { createServer, loadConfigFromFile, mergeConfig } = await import(viteUrl);
  const loaded = await loadConfigFromFile(
    { command: 'serve', mode: 'development' },
    path.join(worktree, 'vite.unlocked.config.js'),
    worktree,
  );
  const alias = loaded?.config?.resolve?.alias?.['@progression-access'] ?? '';
  if (!String(alias).endsWith(`${path.sep}dev-unlocked.js`) && !String(alias).endsWith('/dev-unlocked.js')) {
    throw new Error('Refusing to serve: the worktree did not select the local all-unlocked access module.');
  }
  const server = await createServer(mergeConfig(loaded.config, {
    root: worktree,
    configFile: false,
    server: {
      host: '127.0.0.1',
      port: 5443,
      https: {
        key: fs.readFileSync(tls.key),
        cert: fs.readFileSync(tls.cert),
      },
    },
  }));
  await server.listen();
  const address = server.httpServer?.address();
  if (!address || typeof address === 'string' || address.address !== '127.0.0.1') {
    await server.close();
    throw new Error('Refusing to listen outside 127.0.0.1');
  }
  console.log(`dev-feature: https://127.0.0.1:${address.port}/`);
  server.printUrls();
}

async function main() {
  const slug = featureSlug(process.env.FEATURE);
  const branch = `feature/${slug}`;
  const worktree = path.resolve(worktreesRoot, slug);
  const escaped = path.relative(worktreesRoot, worktree);
  if (escaped.startsWith('..') || path.isAbsolute(escaped)) {
    throw new Error('Feature worktree path escaped .claude/worktrees');
  }

  run('git', ['fetch', 'origin', branch], { cwd: repoRoot });
  if (worktreeExists(worktree)) {
    console.log(`Reusing ${worktree}`);
  } else if (localBranchExists(branch)) {
    run('git', ['worktree', 'add', worktree, branch], { cwd: repoRoot });
  } else {
    run('git', ['worktree', 'add', '--track', '-b', branch, worktree, `origin/${branch}`], { cwd: repoRoot });
  }
  run('git', ['-C', worktree, 'merge', '--ff-only', `origin/${branch}`]);
  run('make', ['-C', worktree, 'node_modules']);
  const rev = capture(['rev-parse', '--short', 'HEAD'], worktree).trim();
  console.log(`dev-feature: ${branch} @ ${rev}`);
  await serve(worktree, ensureCerts());
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}
