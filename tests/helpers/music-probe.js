import { expect } from '@playwright/test';
import { ciTimeout } from './ci.js';

// Records, from the page's first script on: every AudioContext made, every music note (a non-sine oscillator started
// at a time; cues are sine tones and the engine hum starts without one), every animation frame and the frames that
// drew WebGL. Works on the minified production build, which has no test hooks.
export async function installMusicProbe(page) {
  await page.addInitScript(() => {
    const m = window.__music = { ctxs: [], notes: [], frames: [], rafs: 0, taps: [] };
    const AC = window.AudioContext;
    window.AudioContext = class extends AC { constructor(...args) { super(...args); m.ctxs.push(this); } };
    const start = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (when) {
      if (typeof when === 'number' && this.type !== 'sine') m.notes.push({ ctx: m.ctxs.indexOf(this.context), when, raf: m.rafs });
      return start.apply(this, arguments);
    };
    let drew = false;
    for (const proto of [WebGL2RenderingContext.prototype, WebGLRenderingContext.prototype])
      for (const name of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
        const draw = proto[name];
        if (draw) proto[name] = function () { drew = true; return draw.apply(this, arguments); };
      }
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = callback => raf(time => {
      m.rafs++;
      const began = performance.now();
      drew = false;
      callback(time);
      if (drew) m.frames.push([began, performance.now()]);
    });
    // Registered before the app's own capture listener, so it sees the tap first.
    window.addEventListener('pointerdown', event => { if (event.isTrusted) m.taps.push({ raf: m.rafs, ctxs: m.ctxs.length }); }, { capture: true });
  });
}

// Navigation-relative times (ms): first audible music note (context time mapped through getOutputTimestamp),
// first drawing frame, and whether the notes queued before that frame already reach past its end.
export const musicTimeline = page => page.evaluate(() => {
  const m = window.__music, first = m.notes[0], frame = m.frames[0];
  if (!first || !frame) return { firstNote: null, firstFrame: frame?.[0] ?? null, queuedPastFirstFrame: false };
  const ts = m.ctxs[first.ctx].getOutputTimestamp();
  const audible = when => ts.performanceTime + (when - ts.contextTime) * 1000;
  const horizon = Math.max(...m.notes.filter(note => note.ctx === first.ctx && note.raf === 0).map(note => audible(note.when)));
  return { firstNote: audible(first.when), firstFrame: frame[0], queuedPastFirstFrame: horizon > frame[1] };
});

const liveClock = page => page.evaluate(() => {
  const ctx = window.__music.ctxs.at(-1);
  return { state: ctx?.state ?? 'none', time: ctx?.currentTime ?? 0 };
});

// Music is playing: the newest context runs, its clock moves, and notes are queued at the moment being heard.
export async function expectMusicPlaying(page) {
  await expect.poll(async () => (await liveClock(page)).state, { timeout: ciTimeout(5000) }).toBe('running');
  const { time } = await liveClock(page);
  await expect.poll(async () => (await liveClock(page)).time, { timeout: ciTimeout(5000) }).toBeGreaterThan(time + 0.3);
  await expect.poll(() => page.evaluate(() => {
    const m = window.__music, index = m.ctxs.length - 1, now = m.ctxs[index].currentTime;
    return m.notes.some(note => note.ctx === index && note.when >= now - 0.5 && note.when <= now + 1);
  }), { timeout: ciTimeout(5000) }).toBe(true);
}
