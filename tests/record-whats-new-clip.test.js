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

test('the clip recorder accepts scripted input with --press and a fixed layout seed', () => {
  assert.match(code, /press: \{ type: 'string'/);
  assert.match(code, /seed: \{ type: 'string'/);
  assert.match(code, /'bot-until': \{ type: 'string'/);
});

// A Vite dev server defaults to the Garage `trial` build (wallet chips, store concept card, trial VFX), which is not what
// ships (`coming-soon`). Media shot from it shows UI players never see, so the recorder must pin the shipped mode.
test('the clip recorder serves the shipped coming-soon Garage build, never the dev trial one', () => {
  assert.match(code, /GARAGE_VFX_RELEASE_MODE\s*=\s*'coming-soon'/);
  assert.ok(code.indexOf("GARAGE_VFX_RELEASE_MODE") < code.indexOf('createServer({'), 'mode must be set before the server starts');
});
