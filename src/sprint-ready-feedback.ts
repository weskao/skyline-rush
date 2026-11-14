import { readHudFeedback } from './control-settings.ts';
import { createBoostReadiness, createNitroReadiness } from './nitro-readiness.ts';

export type SprintReadyCue = 'nitro-ready' | 'boost-ready';
interface SprintCar { nitro: number; fuel: number; boosting: boolean; braking: boolean }

// Neither list has a keyframe at offset 1: each settles on the resting CSS of its state.
const BURST: Keyframe[] = [
  { opacity: 0, transform: 'scale(.9, .2)', offset: 0 },
  { opacity: 1, transform: 'scale(1.1, 1.25)', offset: .22 },
  { opacity: 1, transform: 'scale(1, .95)', offset: .5 },
];
const RING: Keyframe[] = [
  { opacity: .9, transform: 'scale(1)', offset: 0 },
  { opacity: 0, transform: 'scale(1.5)', offset: .99 },
];

function readyFlame(button: HTMLButtonElement | undefined) {
  const effect = button?.querySelector('.sprint-ready-effect');
  let animations: Animation[] = [];
  const cancel = () => { for (const animation of animations) animation.cancel(); animations = []; };
  return {
    play() {
      cancel();
      if (effect) animations = [
        effect.animate(BURST, { duration: 900, easing: 'ease-out', pseudoElement: '::before' }),
        effect.animate(RING, { duration: 560, easing: 'ease-out', pseudoElement: '::after' }),
      ];
    },
    cancel,
  };
}

export function createSprintReadyFeedback(nitroButton: HTMLButtonElement | undefined, boostButton: HTMLButtonElement | undefined,
  cue: (name: SprintReadyCue, delay?: number) => void) {
  const nitro = createNitroReadiness(), boost = createBoostReadiness();
  const nitroFlame = readyFlame(nitroButton), boostFlame = readyFlame(boostButton);
  let lastNitro = '', lastBoost = '', lastLit: boolean | undefined;
  return {
    update(phase: string, car: SprintCar, nitroActive: boolean, boostHeld: boolean, motion: boolean) {
      const n = nitro.update({ phase, charge: car.nitro, active: nitroActive });
      const b = boost.update({ phase, fuel: car.fuel, boosting: car.boosting, braking: car.braking, held: boostHeld });
      if (nitroButton && nitroButton.dataset.nitroState !== n.state) nitroButton.dataset.nitroState = n.state;
      if (boostButton && boostButton.dataset.boostState !== b.state) boostButton.dataset.boostState = b.state;
      const lit = motion && phase === 'racing';
      if (!lit) { nitroFlame.cancel(); boostFlame.cancel(); }
      // The CSS flame follows data-flame. Storage is read on a state change, never per frame.
      if (n.state !== lastNitro || b.state !== lastBoost || lit !== lastLit) {
        lastNitro = n.state; lastBoost = b.state; lastLit = lit;
        const flame = lit && readHudFeedback().animation ? 'on' : 'off';
        if (nitroButton && nitroButton.dataset.flame !== flame) nitroButton.dataset.flame = flame;
        if (boostButton && boostButton.dataset.flame !== flame) boostButton.dataset.flame = flame;
      }
      if (n.cueReady || b.cueReady) {
        const preferences = readHudFeedback();
        if (n.cueReady && preferences.sound) cue('nitro-ready');
        if (b.cueReady && preferences.sound) cue('boost-ready', n.cueReady ? .33 : 0);
        if (n.cueReady && motion && preferences.animation) nitroFlame.play();
        if (b.cueReady && motion && preferences.animation) boostFlame.play();
      }
      return n.state;
    },
    reset() { nitro.reset(); boost.reset(); nitroFlame.cancel(); boostFlame.cancel(); lastLit = undefined; },
  };
}
