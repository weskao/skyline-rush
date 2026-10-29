<script setup lang="ts">
import { historyView } from './history-view-state.ts';
import { icons, ICON_ATTRS } from './icons.ts';
</script>

<template>
  <section id="challenge-medals" class="history-extra" aria-labelledby="challenge-medals-title">
    <h3 id="challenge-medals-title" data-i18n="challengeMedal.title">Personal challenge medals</h3>
    <p data-i18n="challengeMedal.local">Collected on this device, separate from Career medals. Include them in a race-progress backup to keep a copy.</p>
    <p id="challenge-medal-count">{{ historyView.challengeMedalCount }}</p>
    <p>{{ historyView.challengeMedalPeaks }}</p>
    <ul class="achievement-list">
      <li v-for="medal in historyView.challengeMedals" :key="medal.id" :data-challenge-medal="medal.id" :class="{ 'is-awarded': medal.awarded }">
        <svg v-bind="ICON_ATTRS" v-html="icons.star"></svg>
        <div><strong>{{ medal.name }}</strong><span>{{ medal.detail }}</span></div>
        <small>{{ medal.status }}</small>
      </li>
    </ul>
  </section>
</template>
