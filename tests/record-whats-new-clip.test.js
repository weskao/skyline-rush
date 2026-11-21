import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const recorder = readFileSync(new URL('../scripts/record-whats-new-clip.mjs', import.meta.url), 'utf8');
const code = recorder.replace(/^\s*\/\/.*$/gm, '');

// Playwright recordVideo is a low-bitrate VP8 webm at device scale 1: clips re-encoded from it were blurry on HiDPI
// screens and CRF 20 cannot recover the lost detail. The recorder must capture lossless frames at device scale >= 2.
test('the clip recorder never uses the lossy recordVideo', () => {
  assert.doesNotMatch(code, /recordVideo/);
});

test('the clip recorder captures lossless PNG frames at device scale 2 or more', () => {
  assert.match(code, /scale: \{ type: 'string', default: '(\d+(\.\d+)?)' \}/);
  assert.ok(Number(code.match(/scale: \{ type: 'string', default: '([\d.]+)' \}/)[1]) >= 2, 'default --scale is below 2');
  assert.match(code, /deviceScaleFactor: scale/);
  assert.match(code, /page\.screenshot\(\{ path: .*\.png/);
  assert.match(code, /page\.clock\./, 'frames are stepped on a virtual clock so none are dropped');
});

test('the clip encoder keeps balanced quality, a constant 30 fps and no audio track', () => {
  assert.match(code, /FPS = 30/);
  assert.match(code, /'-crf', '20'/);
  assert.match(code, /'-preset', 'slow'/);
  assert.match(code, /'-pix_fmt', 'yuv420p', '-movflags', '\+faststart'/);
  assert.match(code, /'-an'/);
  assert.match(code, /MAX_BYTES = 4 \* 1024 \* 1024/);
});

// The owner keeps a with-sound recording of each clip, but the game never plays sound from What's New media.
test('--master keeps a vidpress-compressed recording with sound in assets-src, never in public', () => {
  assert.match(code, /master: \{ type: 'boolean', default: false \}/);
  assert.match(code, /\$\{master \? 'assets-src' : 'public'\}\/whats-new\//);
  assert.match(code, /'BlackHole 2ch'/);
  assert.match(code, /execFileSync\('vidpress', \['compress'/);
  assert.doesNotMatch(code, /'--audio', 'none'/);
});

test('the clip recorder accepts scripted input with --press and a fixed layout seed', () => {
  assert.match(code, /press: \{ type: 'string'/);
  assert.match(code, /seed: \{ type: 'string'/);
  assert.match(code, /'bot-until': \{ type: 'string'/);
});

// The Sky Spiral clip once showed no birds: sky life is only drawn on Medium and above, and the recorder left the tier to
// the game's own pick for the machine. --quality pins it the way the VFX settings save it.
test('the clip recorder can pin the graphics tier with --quality', () => {
  assert.match(code, /quality: \{ type: 'string'/);
  assert.match(code, /localStorage\.setItem\('skyline-rush-vfx', JSON\.stringify\(\{ quality, enabled: true \}\)\)/);
});

// A Vite dev server defaults to the Garage `trial` build (wallet chips, store concept card, trial VFX), which is not what
// ships (`coming-soon`). Media shot from it shows UI players never see, so the recorder must pin the shipped mode.
test('the clip recorder serves the shipped coming-soon Garage build, never the dev trial one', () => {
  assert.match(code, /GARAGE_VFX_RELEASE_MODE\s*=\s*'coming-soon'/);
  assert.ok(code.indexOf("GARAGE_VFX_RELEASE_MODE") < code.indexOf('createServer({'), 'mode must be set before the server starts');
});

// A --master run that threw mid-race left ffmpeg recording the screen and system sound with no parent (2026-11-16), and
// the next take hung on the shared capture. The capture must die with the recorder, however it exits.
test('--master never leaves a screen capture running after the recorder exits', () => {
  assert.match(code, /process\.once\('exit', \(\) => ffmpeg\.kill\('SIGKILL'\)\)/);
});

// The macOS screensaver started during a --master run (2026-11-16) and the race-camera takes recorded it instead of
// the race. The recorder keeps the display awake for as long as it runs.
test('--master keeps the display awake while it records', () => {
  assert.match(code, /spawn\('caffeinate', \['-d', '-i', '-w', `\$\{process\.pid\}`\]/);
});

// With the Mac locked, a --master take records the lock screen's wallpaper video instead of the race (2026-11-16).
test('--master refuses to record while the screen is locked', () => {
  assert.match(code, /CGSSessionScreenIsLocked/);
  assert.ok(code.indexOf('CGSSessionScreenIsLocked') < code.indexOf('chromium.launch('), 'checked before anything is recorded');
});

// A debuff clip must go through the game's real hit path (stepRivalAttacks and its center countdown card), so the
// recorder arms a rival's heldAttack and never writes freezeUntil / empUntil itself.
test('--rival-attack arms a rival held attack and never sets the hit timers directly', () => {
  assert.match(code, /'rival-attack': \{ type: 'string'/);
  assert.match(code, /\.heldAttack = item/);
  assert.doesNotMatch(code, /freezeUntil|empUntil/);
});
