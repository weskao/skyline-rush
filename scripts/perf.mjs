// Frame-time checks of production builds, read from the in-game `?perf` strip (see README "Verify").
//   node scripts/perf.mjs desktop [--base <ref>] [--rate 6] [--rounds 3] [--seconds 24] [--viewport phone|desktop]
//     Races each build in Chrome at 412x915 (or 1440x900 with --viewport desktop) with the CPU throttled `rate` times, alternating builds per round.
//   node scripts/perf.mjs phone [--base <ref>] [--via auto|tailscale|wifi] [--tg 1|0]
//     Like `make phone`: serves each build over Tailscale and/or Wi-Fi, sends the URLs to Telegram,
//     opens the first on a USB Android phone and logs temperatures until Ctrl+C. A terminal asks what is not given.
// `dist/` is the current build (the Makefile builds it first); --base builds that git ref in .claude/worktrees/perf-<sha>.
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline/promises';
import { preview } from 'vite';

const repoRoot = path.resolve(import.meta.dirname, '..');
const [mode, ...rest] = process.argv.slice(2);
const opts = { rate: '6', rounds: '3', seconds: '24', viewport: 'phone' };
for (let i = 0; i < rest.length; i += 2) opts[rest[i].replace(/^--/, '')] = rest[i + 1];
if (!['desktop', 'phone'].includes(mode)) {
  console.error('Usage: node scripts/perf.mjs desktop|phone [--base <git ref>] [--rate 6] [--rounds 3] [--seconds 24]');
  process.exit(1);
}

// Same menu shape as `make phone`: numbered options, Enter takes option 1, typed text answers an "other".
async function ask(question, options, other) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log(`\n? ${question}`);
  options.forEach(([label, , hint], i) => console.log(`  ${i + 1}) ${label}  ${hint ?? ''}`));
  for (;;) {
    const answer = (await rl.question(other ? `選擇 [1]，或${other}：` : '選擇 [1]：')).trim() || '1';
    if (options[+answer - 1]) { rl.close(); return options[+answer - 1][1]; }
    if (other) { rl.close(); return answer; }
  }
}
if (mode === 'phone' && process.stdin.isTTY) {
  opts.base ??= await ask('要和哪個版本比較？', [['main (Recommended)', 'main'], ['不比較，只測目前版本', '']], '輸入 branch / commit');
  opts.via ??= await ask('連線方式？', [['只用 Tailscale (Recommended)', 'tailscale', '不需同一個 Wi-Fi，手機要開 Tailscale App'],
    ['Tailscale + Wi-Fi 備用', 'auto', '兩個網址都給'], ['只用同一個 Wi-Fi', 'wifi', '手機和 Mac 連同一個 Wi-Fi']]);
  opts.tg ??= await ask('用 Telegram 傳網址？', [['傳送 (Recommended)', '1', '停止時也會通知網址已失效'], ['不傳', '0', '只印在終端機']]);
}

const sh = (cmd, args, cwd = repoRoot) => {
  const result = spawnSync(cmd, args, { cwd, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
};
const read = (cmd, args) => {
  try { return execFileSync(cmd, args, { encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return ''; }
};

// One worktree per commit, kept for the next run; `npm ci` because the ref may pin other dependencies.
function buildRef(ref) {
  const sha = read('git', ['-C', repoRoot, 'rev-parse', '--short', `${ref}^{commit}`]).trim();
  if (!sha) { console.error(`Unknown git ref: ${ref}`); process.exit(1); }
  const dir = path.join(repoRoot, '.claude', 'worktrees', `perf-${sha}`);
  if (!fs.existsSync(path.join(dir, 'dist', 'index.html'))) {
    if (!fs.existsSync(dir)) sh('git', ['worktree', 'add', '--detach', dir, sha]);
    sh('npm', ['ci', '--no-audit', '--no-fund'], dir);
    sh('npm', ['run', 'build'], dir);
  }
  return { name: `${ref}@${sha}`, root: dir };
}

const head = read('git', ['-C', repoRoot, 'rev-parse', '--short', 'HEAD']).trim();
const builds = [{ name: `current@${head}`, root: repoRoot }, ...(opts.base ? [buildRef(opts.base)] : [])];
const host = mode === 'phone' ? '0.0.0.0' : '127.0.0.1';
for (const [i, build] of builds.entries()) {
  build.server = await preview({ configFile: false, root: build.root, logLevel: 'silent', preview: { host, port: 5310 + i } });
  build.port = build.server.httpServer.address().port;
  build.url = `http://127.0.0.1:${build.port}/`;
}

// pmset reports a warning level, not degrees: macOS shows no CPU temperature without sudo.
const macThermal = () => read('pmset', ['-g', 'therm']).match(/thermal warning level.*?(\d+)/i)?.[1] ?? 'none';
const ANDROID_STATUS = ['none', 'light', 'moderate', 'severe', 'critical', 'emergency', 'shutdown'];
const androidDevices = () => read('adb', ['devices']).split('\n').slice(1)
  .map(line => line.split('\t')).filter(([id, state]) => state === 'device' && !id.startsWith('emulator-')).map(([id]) => id);
function androidThermal(id) {
  const dump = read('adb', ['-s', id, 'shell', 'dumpsys', 'thermalservice']);
  const status = ANDROID_STATUS[+dump.match(/Thermal Status: (\d)/)?.[1]] ?? '?';
  const live = dump.split('Current temperatures from HAL:')[1] ?? '';
  const temps = [...live.matchAll(/mValue=([\d.]+), mType=\d+, mName=(\w+)/g)]
    .filter(([, value]) => +value > 0).map(([, value, name]) => `${name} ${(+value).toFixed(1)}°C`);
  if (!temps.length) {
    const battery = +read('adb', ['-s', id, 'shell', 'dumpsys', 'battery']).match(/temperature: (\d+)/)?.[1];
    if (battery) temps.push(`BAT ${(battery / 10).toFixed(1)}°C`);
  }
  return `${id} ${temps.join(' ') || 'no sensors'} · throttling ${status}`;
}

if (mode === 'phone') {
  const via = opts.via ?? 'auto';
  const tailscale = via === 'wifi' ? null
    : ['tailscale', '/Applications/Tailscale.app/Contents/MacOS/Tailscale'].map(cli => read(cli, ['ip', '-4']).trim().split('\n')[0]).find(Boolean);
  const wifi = via === 'tailscale' ? null : ['en0', 'en1'].map(name => os.networkInterfaces()[name]?.find(a => a.family === 'IPv4')?.address).find(Boolean);
  if (!tailscale && !wifi) {
    console.error(via === 'tailscale' ? 'Tailscale 未連線；在 Mac 開啟 Tailscale，或用 VIA=wifi。' : '找不到 Tailscale 或 Wi-Fi 位址；先連上網路。');
    process.exit(1);
  }
  const urls = build => [tailscale && `Tailscale：http://${tailscale}:${build.port}/?perf`, wifi && `同一個 Wi-Fi：http://${wifi}:${build.port}/?perf`].filter(Boolean);
  const tgScript = path.join(os.homedir(), '.claude', 'scripts', 'tg-send.sh');
  const notify = text => {
    if (opts.tg === '0') return;
    if (!fs.existsSync(tgScript)) return console.log(`TG: send skipped — ${tgScript} not found`);
    const sent = spawnSync('bash', [tgScript, 'send', text], { encoding: 'utf8' });
    console.log(`TG: ${sent.stderr.match(/message_id=\d+/)?.[0] ?? `send failed ${sent.stderr.trim()}`}`);
  };
  const listing = builds.map(build => [`${build.name}`, ...urls(build).map(line => `   ${line}`)].join('\n')).join('\n');
  const intro = `📱 skyline-rush 效能測試（正式版建置，?perf）— 用手機開啟：\n${listing}\n`
    + '每個版本比賽約 25 秒、輪流測，讀頂端 FRAME 列；只比較相同降頻等級的結果。\n⏹ 停止：在 Mac 終端機按 Ctrl+C';
  console.log(intro);
  notify(intro);
  // adb reverse makes the phone's own localhost reach the Mac, so USB opening works on any network.
  const devices = androidDevices();
  for (const id of devices) {
    read('adb', ['-s', id, 'reverse', `tcp:${builds[0].port}`, `tcp:${builds[0].port}`]);
    read('adb', ['-s', id, 'shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', `http://127.0.0.1:${builds[0].port}/?perf`]);
  }
  console.log(devices.length ? `Opened ${builds[0].name} on ${devices.join(', ')} over USB.` : 'No USB Android phone found: open a URL by hand (iPhones report no temperature).');
  let last = '';
  const log = () => console.log(last = `${new Date().toTimeString().slice(0, 8)}  Mac thermal warning ${macThermal()}${devices.map(id => `  |  ${androidThermal(id)}`).join('')}`);
  log();
  setInterval(log, 10000);
  const stop = async signal => {
    for (const id of devices) read('adb', ['-s', id, 'reverse', '--remove', `tcp:${builds[0].port}`]);
    await Promise.all(builds.map(build => build.server.close()));
    notify(`🛑 skyline-rush 效能測試伺服器已停止（${signal}），以下網址已失效：\n${listing}\n最後溫度：${last}`);
    process.exit(0);
  };
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(signal, () => stop(signal));
} else {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ channel: 'chrome' });
  const runs = [];
  for (let round = 1; round <= +opts.rounds; round++) for (const build of builds) {
    const context = await browser.newContext(opts.viewport === 'desktop' ? { viewport: { width: 1440, height: 900 } }
      : { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await context.addInitScript(() => {
      for (const [key, value] of [['guide-seen', '1'], ['tutorial-completed', '1'], ['music', 'off'], ['sound', 'off']]) localStorage.setItem(`skyline-rush-${key}`, value);
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${build.url}?perf`);
    await page.waitForTimeout(3000);
    await (await context.newCDPSession(page)).send('Emulation.setCPUThrottlingRate', { rate: +opts.rate });
    for (let i = 0; i < 3 && await page.locator('dialog[open]').count(); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(400); }
    await page.locator('#start-button').click();
    await page.waitForFunction(() => document.body.dataset.phase === 'racing', null, { timeout: 30000 });
    await page.waitForTimeout(+opts.seconds * 1000);
    const text = await page.locator('#perf-overlay').textContent();
    const [p50, p95, fps] = (text.match(/p50 ([\d.]+) ms · p95 ([\d.]+) ms · ([\d.]+) fps/) ?? []).slice(1).map(Number);
    runs.push({ name: build.name, p50, p95, fps });
    console.log(`round ${round}  ${build.name.padEnd(28)} ${text}  ·  Mac thermal warning ${macThermal()}${errors.length ? `  ERRORS: ${errors.join(' | ')}` : ''}`);
    await context.close();
  }
  await browser.close();
  const median = values => values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
  console.log(`\nMedian of ${opts.rounds} rounds, CPU throttled ${opts.rate}x:`);
  for (const build of builds) {
    const own = runs.filter(run => run.name === build.name);
    console.log(`  ${build.name.padEnd(28)} p50 ${median(own.map(r => r.p50))} ms · p95 ${median(own.map(r => r.p95))} ms · ${median(own.map(r => r.fps))} fps`);
  }
  await Promise.all(builds.map(build => build.server.close()));
}
