export function createSound() {
  let context, oscillator, gain, filter;
  let enabled = false;
  return {
    async toggle() {
      try {
        if (!context) {
          context = new AudioContext();
          oscillator = context.createOscillator();
          filter = context.createBiquadFilter();
          gain = context.createGain();
          oscillator.type = 'sawtooth';
          filter.type = 'lowpass';
          filter.frequency.value = 220;
          gain.gain.value = 0;
          oscillator.connect(filter).connect(gain).connect(context.destination);
          oscillator.start();
        }
        await context.resume();
        enabled = !enabled;
        if (!enabled) gain.gain.setTargetAtTime(0, context.currentTime, 0.1);
      } catch {
        enabled = false;
      }
      return enabled;
    },
    update(car, active) {
      if (!context || !enabled) return;
      oscillator.frequency.setTargetAtTime(35 + car.speed * 1.5 + (car.thrusting ? 50 : 0), context.currentTime, 0.12);
      filter.frequency.setTargetAtTime(car.thrusting ? 850 : 180 + car.speed * 3, context.currentTime, 0.15);
      gain.gain.setTargetAtTime(active ? 0.014 + car.speed * 0.00016 : 0, context.currentTime, 0.1);
    },
    dispose() { context?.close(); },
  };
}
