const CLOCK_STALL_MS = 500;
const REBUILD_COOLDOWN_MS = 1000;
const RETRY_INTERVAL_MS = 1000;
const ignore = () => {};

export function audioSessionInterrupted(): boolean {
  const audioSession = (navigator as Navigator & { audioSession?: { state?: string } }).audioSession;
  return audioSession?.state === 'interrupted';
}

export function createAudioContextHealth() {
  let madeAt = -Infinity, clockTime = 0, clockAdvancedAt = 0;
  let retriedAt = -Infinity, cycling: AudioContext | undefined;

  function isRunning(context: AudioContext | undefined): boolean {
    if (context?.state !== 'running') return false;
    const now = performance.now(), time = context.currentTime;
    // WebKit can leave the audio clock frozen after a system interruption while reporting "running".
    if (time !== clockTime) {
      clockTime = time;
      clockAdvancedAt = now;
    }
    return now - clockAdvancedAt < CLOCK_STALL_MS;
  }

  return {
    isRunning,
    reset(context: AudioContext, inGesture: boolean) {
      const now = performance.now();
      madeAt = inGesture ? now : -Infinity;
      clockTime = context.currentTime;
      clockAdvancedAt = now;
      retriedAt = -Infinity;
    },
    canRebuild(context: AudioContext) {
      return !isRunning(context) && performance.now() - madeAt > REBUILD_COOLDOWN_MS;
    },
    retry(context: AudioContext | undefined, canResume: (context: AudioContext) => boolean) {
      if (!context || context === cycling || context.state === 'closed' || !canResume(context) ||
          navigator.userActivation?.hasBeenActive === false || isRunning(context)) return;
      const now = performance.now();
      if (now - retriedAt < RETRY_INTERVAL_MS) return;
      retriedAt = now;
      if (context.state !== 'running') {
        void context.resume().catch(ignore);
        return;
      }
      // A stale "running" state needs a full suspend/resume cycle before the clock can move.
      cycling = context;
      void context.suspend().then(() => {
        if (canResume(context)) void context.resume().catch(ignore);
      }).catch(ignore).finally(() => {
        if (cycling === context) cycling = undefined;
      });
    },
  };
}
