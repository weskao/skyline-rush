const CLOCK_STALL_MS = 500;
const REBUILD_COOLDOWN_MS = 1000;

export function createAudioContextHealth() {
  let madeAt = -Infinity, clockTime = 0, clockAdvancedAt = 0;

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
    },
    canRebuild(context: AudioContext) {
      return !isRunning(context) && performance.now() - madeAt > REBUILD_COOLDOWN_MS;
    },
  };
}
