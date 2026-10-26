<script setup lang="ts">
import { PAINTS } from './appearance.ts';
import { garageView } from './garage-view-state.ts';
</script>

<template>
  <dialog id="garage-screen" class="history-screen garage-screen" aria-labelledby="garage-title">
    <header class="history-heading"><h2 id="garage-title" data-i18n="nav.garage">Garage</h2><button class="controls-button" id="garage-close" aria-label="Close garage" data-i18n-aria-label="garage.close" data-i18n="common.close">Close</button></header>
    <p class="collection-note" data-i18n="garage.intro">Explore paint and tail light combinations. Appearance never changes performance.</p>
    <div id="garage-preview" class="garage-preview" aria-label="Live car preview" data-i18n-aria-label="garage.preview"></div>
    <div class="paint-options" role="group" aria-label="Preview car finish" data-i18n-aria-label="garage.finishes"><button v-for="(paint, id) in PAINTS" :data-paint="id" :aria-label="`Preview ${id}`" :data-i18n-aria-label="`paint.${id}.preview`" :aria-pressed="id === garageView.selected" :key="id"><i :style="{ backgroundColor: paint.paint }" aria-hidden="true"></i><span :data-i18n="`paint.${id}`">{{ paint.name }}</span></button></div>
    <p id="garage-status" class="collection-note" role="status">{{ garageView.status }}</p>
    <button id="garage-equip" class="controls-reset" :disabled="garageView.equipDisabled" aria-label="Equip finish" data-i18n-aria-label="garage.equip">{{ garageView.equipLabel }}</button>
    <p class="collection-note" data-i18n="garage.previewNote">Additional finishes are previews. Cosmetic unlocks are not available yet.</p>
  </dialog>
</template>
