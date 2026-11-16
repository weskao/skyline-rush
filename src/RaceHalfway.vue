<script setup lang="ts">
import { computed, onUnmounted, shallowRef } from 'vue';
import { formatNumber, getLocale, onLocaleChange, t } from './i18n.ts';
import { raceHalfwayView } from './race-halfway-view.ts';

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
  <div class="race-halfway" role="status" aria-live="polite" aria-atomic="true">
    <div v-if="raceHalfwayView.cue" id="race-halfway-card" class="race-halfway-card" :class="{ 'is-leaving': raceHalfwayView.leaving }">
      <div class="race-halfway-mark" aria-hidden="true"><i></i><b>50%</b><i></i></div>
      <strong>{{ title }}</strong>
      <span>{{ detail }}</span>
    </div>
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
  place-items: center;
  pointer-events: none;
}
.race-halfway-card {
  width: max-content;
  max-width: min(80%, 20rem);
  padding: clamp(7px, 1.7dvh, 14px) clamp(18px, 4vw, 36px);
  display: grid;
  justify-items: center;
  gap: clamp(3px, 0.8dvh, 7px);
  color: #edfcff;
  text-align: center;
  background: linear-gradient(90deg, rgb(7 27 40 / .89), rgb(6 22 37 / .96) 50%, rgb(7 27 40 / .89));
  border-block: 1px solid rgb(151 237 255 / .74);
  box-shadow: 0 10px 26px rgb(1 11 24 / .38), inset 0 0 24px rgb(75 191 230 / .13);
  border-radius: 5px;
  animation: race-halfway-in 340ms var(--ease-out) both;
}
.race-halfway-card strong {
  font: 700 clamp(30px, min(6.8vw, 10dvh), 54px)/1 'Barlow Condensed', var(--cjk-fonts), sans-serif;
  letter-spacing: .085em;
  text-shadow: 0 0 20px rgb(122 226 255 / .4);
}
.race-halfway-card span {
  color: #b9ebf7;
  font-size: clamp(11px, 2.9dvh, 15px);
  font-weight: 700;
  letter-spacing: .12em;
  font-variant-numeric: tabular-nums;
}
.race-halfway-mark {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 11px;
  color: #b8f5ff;
  letter-spacing: .1em;
}
.race-halfway-mark i {
  flex: 1;
  height: 2px;
  background: rgb(168 222 236 / .28);
}
.race-halfway-mark i:first-child {
  background: #8ce8ff;
  transform-origin: right;
  animation: race-halfway-fill 430ms var(--ease-out) both;
}
.race-halfway-card.is-leaving { animation: race-halfway-out 280ms ease-in both; }
@keyframes race-halfway-in {
  from { opacity: 0; transform: translateY(7px) scale(.94); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes race-halfway-fill { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes race-halfway-out { to { opacity: 0; } }
:global(.vfx-comfort .race-halfway-card),
:global(.vfx-comfort .race-halfway-mark i:first-child),
:global(body[data-vfx-enabled="false"] .race-halfway-card),
:global(body[data-vfx-enabled="false"] .race-halfway-mark i:first-child) { animation: none !important; }
@media (prefers-reduced-motion: reduce) {
  .race-halfway-card, .race-halfway-mark i:first-child { animation: none !important; }
}
</style>
