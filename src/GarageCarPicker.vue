<script setup lang="ts">
import { CARS } from './car-catalog.ts';
import GarageArtworkImage from './GarageArtworkImage.vue';
import { garageStudioView } from './garage-view-state.ts';
import { t } from './i18n.ts';

// garage-ui.ts owns the click (equip, save, world); this component only renders the cars and which one is in use.
const props = defineProps<{ locale: string }>();
const text = (key: string): string => t(key, undefined, props.locale);
const artworkBase = `${import.meta.env.BASE_URL}feature-assets/garage-vfx-skins/car-picker/`;
</script>

<template>
  <section class="garage-cars">
    <h3 id="garage-cars-title">{{ text('garage.cars') }}</h3>
    <div class="garage-car-options" role="group" :aria-label="text('garage.cars.pick')">
      <button v-for="(_, id) in CARS" :key="id" type="button" :data-car="id"
        :aria-label="text('car.' + id)" :aria-pressed="id === garageStudioView.car">
        <span class="garage-car-art" aria-hidden="true">
          <GarageArtworkImage :src="`${artworkBase}${id}@3x.webp`" :size="144" :height="66" alt="" loading="eager" />
        </span>
        <span class="garage-car-name">{{ text('car.' + id) }}</span>
        <span class="garage-car-badge" aria-hidden="true">{{ id === garageStudioView.car ? `✓ ${text('car.inUse')}` : text('car.select') }}</span>
      </button>
    </div>
  </section>
</template>

<style>
/* Same card language as the paint collection (garage-card-styles.css): cyan frame = selected, teal pill = in use. */
#garage-screen .garage-car-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-bottom: 12px; }
#garage-screen .garage-car-options button {
  --car-light: #5caee34d;
  display: grid; grid-template-rows: auto 1fr auto; justify-items: center; align-items: center; gap: 5px;
  position: relative; overflow: hidden; min-width: 0; min-height: 44px; padding: 8px 8px 9px;
  border: 2px solid #2b5878; border-radius: 15px;
  background: linear-gradient(180deg, #0c2e49, #071828 83%); color: #a9c3d6; text-align: center; cursor: pointer;
  box-shadow: inset 0 1px #5ad9ff2e, 0 4px 14px #0008;
  transition: border-color .18s ease, box-shadow .18s ease, color .18s ease, transform .12s ease;
}
#garage-screen .garage-car-options button[data-car="crimson-gt"] { --car-light: #ed606655; }
#garage-screen .garage-car-options button:active { transform: scale(.98); }
#garage-screen .garage-car-options button:focus-visible { outline: 3px solid #dbffff; outline-offset: 2px; }
/* The car not in use steps back, so the lit one reads as the choice at a glance. */
#garage-screen .garage-car-art {
  display: grid; place-items: center; width: min(100%, 144px); aspect-ratio: 144 / 66;
  background: radial-gradient(ellipse at 50% 70%, var(--car-light), transparent 68%);
  filter: saturate(.8) brightness(.8); transition: filter .18s ease;
}
#garage-screen .garage-car-name { font-size: clamp(12px, 1.5vw, 14px); font-weight: 850; line-height: 1.3; letter-spacing: .02em; overflow-wrap: anywhere; text-shadow: 0 1px 3px #000e; }
#garage-screen .garage-car-badge {
  border: 1px solid #3f6f8f; border-radius: 999px; padding: 2px 10px; font-size: 11px; font-weight: 800; line-height: 1.4;
  color: #9fc4dc; background: #0a2538;
  transition: color .18s ease, border-color .18s ease, box-shadow .18s ease;
}
@media (hover: hover) {
  #garage-screen .garage-car-options button:hover { border-color: #7fc4ea; color: #e6f4ff; }
  #garage-screen .garage-car-options button:hover .garage-car-art { filter: none; }
  #garage-screen .garage-car-options button:hover .garage-car-badge { border-color: #7fc4ea; color: #e6f4ff; }
}
#garage-screen .garage-car-options button[aria-pressed="true"] {
  border-color: #3df2ff; color: #f5fbff;
  background: radial-gradient(ellipse at 50% 0, var(--car-light), transparent 64%), linear-gradient(180deg, #14506f, #0a2438 78%);
  box-shadow: 0 0 0 2px #02c9e755, 0 0 20px #06d3f68c, inset 0 1px #b3ffffa0;
}
#garage-screen .garage-car-options button[aria-pressed="true"] .garage-car-art { filter: none; }
#garage-screen .garage-car-options button[aria-pressed="true"] .garage-car-badge {
  color: #032a24; border-color: #7dffe6; background: linear-gradient(180deg, #5ff5d6, #1fcfae); box-shadow: 0 0 10px #2be6c266;
}
@media (prefers-reduced-motion: reduce) {
  #garage-screen .garage-car-options button, #garage-screen .garage-car-options button * { transition: none; }
}
</style>
