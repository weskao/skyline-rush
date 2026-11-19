import { createSound } from './audio.js';
import { startOpeningAudio } from './startup-audio.ts';
import { readInitialDeviceVisuals } from './device-quality.ts';
import { resolveInitialLocale } from './locale-preference.ts';
import { refreshFoldableViewport } from './foldable-viewport.ts';
import { prepareHomeArrival } from './home-arrival.ts';

// These are visual ceilings. Only a successful first frame can complete the rail.
const PROGRESS = [[.63, 8500, .23], [.81, 2100, .64], [.94, 2600, .83], [1, 220, 1]] as const;

const COPY = {
  en: {
    tagline: 'Beyond the road',
    steps: ['Loading game', 'Building lobby', 'Preparing 3D scene'],
    complete: 'Ready to race',
    enter: 'Enter game',
    retry: 'Retry',
    music: 'Play opening music',
    module: 'Game files could not be loaded.',
    renderer: 'The 3D scene could not start. Check WebGL and try again.',
  },
  'zh-TW': {
    tagline: '駛出公路，飛向天際',
    steps: ['載入遊戲', '建立大廳', '準備 3D 場景'],
    complete: '準備就緒',
    enter: '進入遊戲',
    retry: '重試',
    music: '播放開場音樂',
    module: '遊戲檔案載入失敗。',
    renderer: '無法啟動 3D 場景。請確認 WebGL 可用後重試。',
  },
} as const;

function setupStartup() {
  const app = document.querySelector<HTMLElement>('#app')!;
  const root = document.querySelector<HTMLElement>('#startup')!;
  const progress = root.querySelector<HTMLElement>('#startup-progress')!;
  const fill = root.querySelector<HTMLElement>('#startup-fill')!;
  const status = root.querySelector<HTMLElement>('#startup-status')!;
  const error = root.querySelector<HTMLElement>('#startup-error')!;
  const enter = root.querySelector<HTMLButtonElement>('#startup-enter')!;
  const retry = root.querySelector<HTMLButtonElement>('#startup-retry')!;
  const music = root.querySelector<HTMLButtonElement>('#startup-music')!;
  const sound = createSound();
  const locale = resolveInitialLocale();
  const copy = COPY[locale];
  const viewport = new AbortController();
  let entered = false;
  let ready = false;
  let failed = false;
  let exit: Animation | undefined;
  let progressAnimation: Animation | undefined;
  const canAnimate = () => root.dataset.motion !== 'off' && !matchMedia('(prefers-reduced-motion: reduce)').matches;

  function advanceProgress(stage: 0 | 1 | 2 | 3) {
    const [ceiling, duration, milestone] = PROGRESS[stage];
    const motion = canAnimate();
    const from = motion ? getComputedStyle(fill).transform : '';
    progressAnimation?.cancel();
    fill.style.transform = `scaleX(${motion ? ceiling : milestone})`;
    progressAnimation = motion ? fill.animate([{ transform: from }, { transform: fill.style.transform }],
      { id: 'startup-progress-fill', duration, easing: stage === 3 ? 'ease-out' : 'cubic-bezier(.24,.65,.45,1)' }) : undefined;
    return progressAnimation;
  }

  // Every page load shows the screen: skipping it revealed the half-built lobby. Only test/perf tooling sets this key.
  try { entered = sessionStorage.getItem('skyline-rush-startup-skip') === '1'; } catch { /* Storage is optional. */ }
  document.documentElement.lang = locale;
  root.querySelector('#startup-tagline')!.textContent = copy.tagline;
  status.textContent = copy.steps[0];
  enter.firstElementChild!.textContent = copy.enter;
  retry.firstElementChild!.textContent = copy.retry;
  music.textContent = copy.music;
  app.inert = !entered;
  root.hidden = entered;

  const finishAudio = entered ? () => {} : startOpeningAudio(sound, music);
  if (!entered) {
    const { settings } = readInitialDeviceVisuals();
    root.dataset.motion = settings.enabled && !settings.comfortable ? settings.quality : 'off';
    advanceProgress(0);
    refreshFoldableViewport();
    window.addEventListener('resize', refreshFoldableViewport, { signal: viewport.signal });
    window.visualViewport?.addEventListener('resize', refreshFoldableViewport, { signal: viewport.signal });
  }

  retry.addEventListener('click', () => location.reload());

  return {
    sound,
    get entered() { return entered; },
    get waitingForFrame() { return !entered && !ready && !failed; },
    step(step: 1 | 2) {
      if (step === 1) viewport.abort(); // The game owns segment changes after it mounts.
      if (entered || failed) return;
      root.dataset.stage = String(step);
      status.textContent = copy.steps[step];
      advanceProgress(step);
    },
    async ready(onEnter: () => void) {
      if (!this.waitingForFrame) return;
      ready = true;
      status.textContent = copy.complete;
      const completion = advanceProgress(3);
      if (completion) await completion.finished.catch(() => {});
      if (failed) return;
      root.dataset.stage = '3';
      progress.hidden = true;
      enter.hidden = false;
      enter.focus({ preventScroll: true });
      enter.addEventListener('click', async () => {
        enter.disabled = true;
        const motion = root.dataset.motion;
        const animated = canAnimate();
        const arrival = animated ? prepareHomeArrival(app, motion === 'low') : [];
        if (animated) {
          const cinematic = motion === 'high' || motion === 'medium';
          if (cinematic) root.dataset.entering = 'true';
          exit = root.animate([{ opacity: 1 }, { opacity: 1, offset: .22 }, { opacity: 0 }],
            { duration: cinematic ? 360 : 240, easing: 'ease-in', fill: 'forwards' });
          await exit.finished.catch(() => {});
        }
        if (failed) { arrival.forEach(animation => animation.cancel()); return; }
        finishAudio(true);
        root.hidden = true;
        delete root.dataset.entering;
        entered = true;
        app.inert = false;
        const playback = canAnimate() ? 'play' : 'cancel';
        arrival.forEach(animation => animation[playback]());
        viewport.abort();
        app.querySelector<HTMLElement>('#start-button')?.focus({ preventScroll: true });
        onEnter();
      }, { once: true });
    },
    fail(reason: 'module' | 'renderer') {
      failed = true;
      delete root.dataset.entering;
      root.dataset.stage = 'failed';
      finishAudio(false);
      progressAnimation?.cancel();
      exit?.cancel();
      entered = false;
      app.inert = true;
      root.hidden = false;
      progress.hidden = true;
      enter.hidden = true;
      error.textContent = copy[reason];
      error.hidden = false;
      retry.hidden = false;
      retry.focus({ preventScroll: true });
    },
  };
}

export const startup = setupStartup();
