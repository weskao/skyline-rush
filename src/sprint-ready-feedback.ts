import { readHudFeedback } from './control-settings.ts';
import { createBoostReadiness, createNitroReadiness } from './nitro-readiness.ts';

export type SprintReadyCue = 'nitro-ready' | 'boost-ready';
interface SprintCar { nitro: number; fuel: number; boosting: boolean; braking: boolean }

function readyFlash(button: HTMLButtonElement | undefined) {
  const effect = button?.querySelector('.sprint-ready-effect');
  let animation: Animation | undefined;
  return {
    play() {
      animation?.cancel();
      animation = effect?.animate([
        { opacity: 0, backgroundPosition: '140% 0', offset: 0 },
        { opacity: .9, offset: .18 },
        { opacity: .55, offset: .57 },
        { opacity: 0, backgroundPosition: '0% 0', offset: 1 },
      ], { duration: 680, easing: 'ease-out' });
    },
    cancel() { animation?.cancel(); animation = undefined; },
  };
}

export function createSprintReadyFeedback(nitroButton: HTMLButtonElement | undefined, boostButton: HTMLButtonElement | undefined,
  cue: (name: SprintReadyCue, delay?: number) => void) {
  const nitro = createNitroReadiness(), boost = createBoostReadiness();
  const nitroFlash = readyFlash(nitroButton), boostFlash = readyFlash(boostButton);
  return {
    update(phase: string, car: SprintCar, nitroActive: boolean, boostHeld: boolean, motion: boolean) {
      const n = nitro.update({ phase, charge: car.nitro, active: nitroActive });
      const b = boost.update({ phase, fuel: car.fuel, boosting: car.boosting, braking: car.braking, held: boostHeld });
      if (nitroButton && nitroButton.dataset.nitroState !== n.state) nitroButton.dataset.nitroState = n.state;
      if (boostButton && boostButton.dataset.boostState !== b.state) boostButton.dataset.boostState = b.state;
      if (!motion || phase !== 'racing') { nitroFlash.cancel(); boostFlash.cancel(); }
      if (n.cueReady || b.cueReady) {
        const preferences = readHudFeedback();
        if (n.cueReady && preferences.sound) cue('nitro-ready');
        if (b.cueReady && preferences.sound) cue('boost-ready', n.cueReady ? .33 : 0);
        if (n.cueReady && motion && preferences.animation) nitroFlash.play();
        if (b.cueReady && motion && preferences.animation) boostFlash.play();
      }
      return n.state;
    },
    reset() { nitro.reset(); boost.reset(); nitroFlash.cancel(); boostFlash.cancel(); },
  };
}
