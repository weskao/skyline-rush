import { readHudFeedback } from './control-settings.ts';
import { createBoostReadiness, createNitroReadiness } from './nitro-readiness.ts';

export type SprintReadyCue = 'nitro-ready' | 'boost-ready';
interface SprintCar { nitro: number; fuel: number; boosting: boolean; braking: boolean }

function readyFlame(button: HTMLButtonElement | undefined) {
  const effect = button?.querySelector('.sprint-ready-effect');
  let animation: Animation | undefined;
  return {
    play() {
      animation?.cancel();
      animation = effect?.animate([
        { opacity: 0, transform: 'scale(.82)', backgroundPosition: '0% 100%' },
        { opacity: 1, transform: 'scale(.97, 1)', backgroundPosition: '28% 48%', offset: .18 },
        { opacity: .78, transform: 'scale(1, .93)', backgroundPosition: '57% 70%', offset: .38 },
        { opacity: .94, transform: 'scale(.96, 1)', backgroundPosition: '82% 33%', offset: .52 },
        { opacity: 0, transform: 'scale(.86, .94)', backgroundPosition: '100% 0%' },
      ], { duration: 930 });
    },
    cancel() { animation?.cancel(); animation = undefined; },
  };
}

export function createSprintReadyFeedback(nitroButton: HTMLButtonElement | undefined, boostButton: HTMLButtonElement | undefined,
  cue: (name: SprintReadyCue, delay?: number) => void) {
  const nitro = createNitroReadiness(), boost = createBoostReadiness();
  const nitroFlame = readyFlame(nitroButton), boostFlame = readyFlame(boostButton);
  return {
    update(phase: string, car: SprintCar, nitroActive: boolean, boostHeld: boolean, motion: boolean) {
      const n = nitro.update({ phase, charge: car.nitro, active: nitroActive });
      const b = boost.update({ phase, fuel: car.fuel, boosting: car.boosting, braking: car.braking, held: boostHeld });
      if (nitroButton && nitroButton.dataset.nitroState !== n.state) nitroButton.dataset.nitroState = n.state;
      if (boostButton && boostButton.dataset.boostState !== b.state) boostButton.dataset.boostState = b.state;
      if (!motion || phase !== 'racing') { nitroFlame.cancel(); boostFlame.cancel(); }
      if (n.cueReady || b.cueReady) {
        const preferences = readHudFeedback();
        if (n.cueReady && preferences.sound) cue('nitro-ready');
        if (b.cueReady && preferences.sound) cue('boost-ready', n.cueReady ? .33 : 0);
        if (n.cueReady && motion && preferences.animation) nitroFlame.play();
        if (b.cueReady && motion && preferences.animation) boostFlame.play();
      }
      return n.state;
    },
    reset() { nitro.reset(); boost.reset(); nitroFlame.cancel(); boostFlame.cancel(); },
  };
}
