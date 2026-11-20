<script setup lang="ts">
import { computed, onUnmounted, shallowRef } from 'vue';
import { formatNumber, getLocale, onLocaleChange, t } from './i18n.ts';
import { raceHalfwayView } from './race-halfway-view.ts';
import PlayerHitCenter from './PlayerHitCenter.vue';

const locale = shallowRef(getLocale());
onUnmounted(onLocaleChange(next => { locale.value = next; }));
const title = computed(() => t('callout.halfway', undefined, locale.value));
const detail = computed(() => {
  if (!raceHalfwayView.cue) return '';
  const km = formatNumber(raceHalfwayView.cue.remainingMetres / 1000, {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }, locale.value);
  return t('callout.halfway.detail', { km }, locale.value);
});
</script>

<template>
  <div class="race-halfway">
    <span class="lobby-visually-hidden" role="status">{{ raceHalfwayView.cue ? `${title} ${detail}` : '' }}</span>
    <div v-if="raceHalfwayView.cue" id="race-halfway-card" class="race-halfway-card" aria-hidden="true" :class="{ 'is-leaving': raceHalfwayView.leaving }">
      <b class="race-halfway-mark" aria-hidden="true">50%</b>
      <strong>{{ title }}</strong>
      <span>{{ detail }}</span>
    </div>
    <PlayerHitCenter />
  </div>
</template>

<style scoped>
.race-halfway {
  position: fixed;
  z-index: 4;
  inset: var(--fold-scene-top, 0px) auto auto var(--fold-scene-left, 0px);
  width: var(--fold-scene-width, 100vw);
  height: var(--fold-scene-height, 100dvh);
  display: grid;
  grid-template: 1fr auto 1fr / minmax(0, 1fr);
  place-items: center;
  pointer-events: none;
}
/* One slim see-through strip: it names the milestone without hiding the road ahead. */
.race-halfway-card {
  grid-row: 2;
  width: max-content;
  max-width: min(92%, 26rem);
  padding: clamp(4px, 0.9dvh, 6px) clamp(12px, 2.2vw, 18px) clamp(4px, 0.9dvh, 6px) clamp(4px, 0.9dvh, 6px);
  display: flex;
  align-items: center;
  gap: clamp(7px, 1.3vw, 11px);
  color: #edfcff;
  white-space: nowrap;
  background-color: rgb(6 22 37 / .46);
  border: 1px solid rgb(151 237 255 / .36);
  border-radius: 999px;
  text-shadow: 0 1px 8px rgb(3 12 22 / .75);
  animation: race-halfway-in 300ms var(--ease-out) both;
}
.race-halfway:has(.player-hit-center) .race-halfway-card {
  grid-row: 1;
  align-self: end;
  margin-bottom: 8px;
}
.race-halfway-card strong {
  font: 700 clamp(18px, min(3vw, 5dvh), 28px)/1 'Barlow Condensed', var(--cjk-fonts), sans-serif;
  letter-spacing: .06em;
}
.race-halfway-card span {
  color: #b9ebf7;
  font-size: clamp(11px, 2dvh, 13px);
  font-weight: 700;
  letter-spacing: .06em;
  font-variant-numeric: tabular-nums;
}
.race-halfway-mark {
  padding: 4px 7px;
  border-radius: 999px;
  color: #052230;
  background: #8ce8ff;
  font: 800 clamp(10px, 1.7dvh, 12px)/1 'Barlow Condensed', sans-serif;
  letter-spacing: .04em;
  text-shadow: none;
}
.race-halfway-card.is-leaving { animation: race-halfway-out 260ms ease-in both; }
@keyframes race-halfway-in {
  from { opacity: 0; transform: translateY(5px) scale(.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes race-halfway-out { to { opacity: 0; } }
:global(.vfx-comfort .race-halfway-card),
:global(body[data-vfx-enabled="false"] .race-halfway-card) { animation: none !important; }
@media (prefers-reduced-motion: reduce) {
  .race-halfway-card { animation: none !important; }
}
</style>
