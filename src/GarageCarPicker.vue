<script setup lang="ts">
import { CARS } from './car-catalog.ts';
import { garageStudioView } from './garage-view-state.ts';
import { t } from './i18n.ts';

// garage-ui.ts owns the click (equip, save, world); this component only renders the cars and which one is in use.
const props = defineProps<{ locale: string }>();
const text = (key: string): string => t(key, undefined, props.locale);
</script>

<template>
  <section class="garage-cars">
    <h3 id="garage-cars-title">{{ text('garage.cars') }}</h3>
    <div class="garage-car-options" role="group" :aria-label="text('garage.cars.pick')">
      <button v-for="(_, id) in CARS" :key="id" type="button" :data-car="id" :aria-pressed="id === garageStudioView.car">
        <span class="garage-car-name">{{ text('car.' + id) }}</span>
        <span v-if="id === garageStudioView.car" class="garage-car-badge">{{ text('car.inUse') }}</span>
      </button>
    </div>
  </section>
</template>

<style>
#garage-screen .garage-car-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-bottom: 10px; }
#garage-screen .garage-car-options button {
  display: flex; flex-direction: column; align-items: flex-start; justify-content: center; gap: 4px;
  min-width: 0; min-height: 52px; padding: 7px 10px; border: 1px solid #327eaf; border-radius: 12px 4px 12px 4px;
  background: linear-gradient(180deg, #0c2e49, #071828 83%); color: #edf7ff; text-align: left; cursor: pointer;
}
#garage-screen .garage-car-options button[aria-pressed="true"] {
  border-color: #1af4ff; outline: 1px solid #75efff; box-shadow: 0 0 0 2px #02c9e755, 0 0 16px #06d3f666;
}
#garage-screen .garage-car-name { font-size: 12px; font-weight: 800; line-height: 1.3; overflow-wrap: anywhere; }
#garage-screen .garage-car-badge {
  border: 1px solid #15d5a9; border-radius: 999px; padding: 1px 7px; font-size: 10px; font-weight: 800; color: #65ffe3; background: #023f38bb;
}
</style>
