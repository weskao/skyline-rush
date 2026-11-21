<script setup lang="ts">
import ItemSlot from './ItemSlot.vue';

// In-race progress HUD; race-hud.ts fills it by id every frame, so no Vue reactivity here.
const BASE_URL = import.meta.env.BASE_URL;
</script>

<template>
  <section class="race-info" id="race-info" aria-label="Race progress" data-i18n-aria-label="race.progress" hidden>
    <div class="position-stat">
      <span class="stat-label" data-i18n="race.position">POSITION</span>
      <div><strong id="position">08</strong><span id="position-field-size">/ 08</span><span id="position-change" hidden></span></div>
      <div class="race-clock" id="race-clock" data-state="ready" role="group" aria-label="Race time" data-i18n-aria-label="race.elapsed">
        <img class="race-clock-icon" :src="`${BASE_URL}feature-assets/race-hud/race-stopwatch.svg`" width="42" height="42" alt="" draggable="false" decoding="async">
        <div class="race-clock-content"><span class="race-clock-state" id="race-clock-state" data-i18n="race.clock.ready">ON THE GRID</span><output id="timer" class="race-clock-readout" role="timer" aria-live="off">00:00.000</output></div>
      </div>
      <span id="style-score" class="style-score">STYLE 0</span>
    </div>
    <div class="race-progress"><div id="ghost-split" class="ghost-split" role="status" hidden></div><output id="circuit-hud" class="sprint-stage" role="status" hidden></output><output id="sprint-stage" class="sprint-stage" hidden></output><output id="practice-hud" class="practice-hud" aria-label="Practice statistics" data-i18n-aria-label="mode.practiceStats" hidden></output><output id="stunt-hud" class="stunt-hud" aria-label="Stunt score and countdown" data-i18n-aria-label="mode.stuntHudLabel" hidden></output><ItemSlot /><output id="elimination-hud" class="elimination-hud" hidden></output><output id="checkpoint-hud" class="checkpoint-hud" hidden></output><output id="hazard-warning" class="hazard-warning" hidden></output><output id="clean-trial-hud" class="clean-trial-hud" hidden></output></div>
    <div class="leaderboard" id="leaderboard" aria-label="Race leaderboard" data-i18n-aria-label="race.leaderboard"></div><div id="race-route-map" class="race-route-map" role="region" aria-label="Full course map with live racer positions" data-i18n-aria-label="race.map"><div class="progress-bar"><div class="progress-labels"><span id="race-status">READY</span><span><span id="distance">0.00</span> / <span id="race-length">5.00</span><span class="unit"> KM</span></span></div></div></div>
  </section>
</template>
