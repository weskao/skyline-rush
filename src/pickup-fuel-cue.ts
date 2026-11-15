// The HUD half of a player pickup: "+N" beside the fuel reading while the fuel bar flashes (style.css, end of file).
// Built once by race-hud.ts; update() runs on the HUD tick and writes the DOM only when the cue changes.
import { setTextIfChanged, setHiddenIfChanged, createAnimationGate } from './hud-dom.ts';
import { PICKUP_FUEL_CUE } from './pickup-feedback.ts';
import type { PickupEvent } from './pickup-take.ts';

const POP: Keyframe[] = [
  { opacity: 0, transform: 'translateY(4px) scale(.8)' }, { opacity: 1, transform: 'translateY(-2px) scale(1.12)', offset: .25 },
  { opacity: 1, transform: 'translateY(-3px)', offset: .75 }, { opacity: 0, transform: 'translateY(-6px)' },
];

/** `reading` holds the fuel value; `moves()` is false under Reduced Motion or comfort VFX (the "+N" then stays still). */
export function createPickupFuelCue(reading: HTMLElement, moves: () => boolean) {
  const gain = document.createElement('span');
  gain.id = 'fuel-gain';
  gain.className = 'fuel-gain';
  gain.hidden = true;
  gain.setAttribute('aria-hidden', 'true'); // the meter's aria-valuenow already speaks the new charge
  reading.append(gain);
  const motion = createAnimationGate(gain);
  let shown: PickupEvent | null = null;
  /** The pickup whose cue is live, or null. Only a racing take that added at least half a point of fuel shows one. */
  function update(racing: boolean, elapsed: number, pickup: PickupEvent | null): PickupEvent | null {
    const live = racing && pickup && pickup.fuel >= 0.5 && elapsed - pickup.time < PICKUP_FUEL_CUE ? pickup : null;
    setHiddenIfChanged(gain, !live);
    if (!live) { motion.cancel(); return null; }
    setTextIfChanged(gain, `+${Math.round(live.fuel)}`);
    if (live !== shown) {
      shown = live;
      motion.cancel();
      if (moves()) motion.animate(POP, { duration: PICKUP_FUEL_CUE * 1000, easing: 'ease-out', fill: 'forwards' });
    }
    return live;
  }
  return { update };
}
