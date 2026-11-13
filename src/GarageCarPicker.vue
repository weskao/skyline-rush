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
        <span class="garage-car-badge" aria-hidden="true">{{ text('car.inUse') }}</span>
      </button>
    </div>
  </section>
</template>

<style>
#garage-screen .garage-car-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-bottom: 10px; }
#garage-screen .garage-car-options button {
  --car-light: #5caee34d;
  display: grid; grid-template-rows: auto 1fr auto; justify-items: center; align-items: center; gap: 4px;
  min-width: 0; min-height: 44px; padding: 6px 8px; border: 1px solid #42637d; border-radius: 10px;
  background: linear-gradient(165deg, #142d43, #0a1929 83%); color: #edf7ff; text-align: center; cursor: pointer;
}
#garage-screen .garage-car-options button[data-car="crimson-gt"] { --car-light: #ed606655; }
#garage-screen .garage-car-art {
  display: grid; place-items: center; width: min(100%, 144px); aspect-ratio: 144 / 66;
  background: radial-gradient(ellipse at 50% 66%, var(--car-light), transparent 70%);
}
@media (hover: hover) {
  #garage-screen .garage-car-options button:hover { border-color: #a0cde8; }
}
#garage-screen .garage-car-options button[aria-pressed="true"] {
  border-color: #65e9ff; box-shadow: inset 0 0 0 1px #65e9ff55;
}
#garage-screen .garage-car-name { font-size: 12px; font-weight: 800; line-height: 1.3; overflow-wrap: anywhere; }
#garage-screen .garage-car-badge {
  visibility: hidden; border-radius: 999px; padding: 2px 7px; font-size: 10px; font-weight: 800;
  color: #92f7ed; background: #103b42;
}
#garage-screen .garage-car-options button[aria-pressed="true"] .garage-car-badge { visibility: visible; }
</style>
