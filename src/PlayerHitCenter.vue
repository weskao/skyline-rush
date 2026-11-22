<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, shallowRef } from 'vue';
import { getLocale, onLocaleChange, t } from './i18n.ts';
import { itemAttackPaths } from './icons.ts';
import { playerHitView } from './item-ui.ts';
import type { ItemAttack } from './item-attacks.ts';
import FreezePanelDecor from './debuff/freeze/FreezePanelDecor.vue';
import EmpPanelDecor from './debuff/emp/EmpPanelDecor.vue';

// Each effect dresses its own card (src/debuff/<effect>/); this file keeps the layout and the copy they share.
const decor = { emp: EmpPanelDecor, freeze: FreezePanelDecor };
const attacks = ['emp', 'freeze'] as const satisfies readonly ItemAttack[];
const iconUrl = (attack: ItemAttack) => `${import.meta.env.BASE_URL}feature-assets/player-debuff/${attack}@3x.webp`;
const unavailable = reactive({ emp: false, freeze: false });
onMounted(() => {
  for (const attack of attacks) new Image().src = iconUrl(attack);
});
const active = computed(() => attacks.filter(attack => playerHitView[attack] > 0));
const locale = shallowRef(getLocale());
onUnmounted(onLocaleChange(next => { locale.value = next; }));
</script>

<template>
  <div v-if="active.length" id="race-player-hit-center" class="player-hit-center" :data-calm="playerHitView.calm">
    <div v-for="attack in active" :key="attack" class="player-hit-card" :data-debuff="attack" :data-phase="playerHitView[`${attack}Phase`]">
      <span v-if="playerHitView[`${attack}Phase`]" class="player-hit-decor" aria-hidden="true">
        <component :is="decor[attack]" :phase="playerHitView[`${attack}Phase`] || 'impact'" />
      </span>
      <span class="player-hit-icon" aria-hidden="true">
        <img v-if="!unavailable[attack]" :src="iconUrl(attack)" width="40" height="40" alt="" draggable="false" @error="unavailable[attack] = true">
        <svg v-else viewBox="0 0 48 48"><path :d="itemAttackPaths[attack]" /></svg>
      </span>
      <div class="player-hit-label">
        <strong>{{ t(`mode.playerHit.${attack}`, undefined, locale) }}</strong>
        <span>{{ t(`mode.playerHit.${attack}Detail`, undefined, locale) }}</span>
      </div>
      <time :datetime="`PT${playerHitView[attack]}S`">{{ t('mode.playerHit.time', { sec: playerHitView[attack].toFixed(1) }, locale) }}</time>
    </div>
  </div>
</template>

<style scoped>
.player-hit-center {
  display: grid;
  gap: 5px;
  width: min(92%, clamp(190px, 24vw, 236px));
}
.player-hit-card {
  --hit-accent: var(--emp-hit-color);
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: clamp(6px, 1.15vw, 10px);
  padding: 2px clamp(8px, 1.25vw, 12px) 2px 2px;
  border: 1px solid color-mix(in srgb, var(--hit-accent) 42%, transparent);
  border-radius: 10px;
  background: linear-gradient(100deg, rgb(8 18 29 / .76), rgb(8 18 29 / .70) 68%, rgb(8 18 29 / .53));
  box-shadow: 0 2px 8px rgb(0 0 0 / .2);
  text-shadow: 0 1px 3px #0a1323;
}
.player-hit-decor { position: absolute; inset: 0; pointer-events: none; } /* out of the grid: never moves the copy */
.player-hit-icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 6px;
  color: var(--hit-accent);
  background: color-mix(in srgb, var(--hit-accent) 10%, transparent);
}
.player-hit-icon img { display: block; object-fit: contain; }
.player-hit-icon svg {
  width: 66%;
  fill: none;
  stroke: currentColor;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.player-hit-label { display: grid; gap: 2px; }
.player-hit-label strong {
  color: var(--hit-accent);
  font: 800 clamp(14px, min(4vw, 5dvh), 23px)/1.05 'Barlow Condensed', var(--cjk-fonts), sans-serif; /* 4vw: the zh-TW title stays on one line in the 190px portrait card */
  letter-spacing: .045em;
}
.player-hit-label span {
  color: #d3dce6;
  font-size: clamp(10px, min(1.7dvh, 2.6vw), 12px);
  font-weight: 700;
  line-height: 1.15;
}
.player-hit-card time {
  padding-left: clamp(6px, 1vw, 10px);
  border-left: 1px solid rgb(230 242 255 / .24);
  color: var(--hit-accent);
  font: 800 clamp(14px, min(2.6dvh, 4vw), 19px)/1 'Barlow Condensed', var(--cjk-fonts), sans-serif;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
@media (prefers-reduced-motion: no-preference) {
  .player-hit-center[data-calm="false"] .player-hit-card {
    animation: player-hit-in 180ms var(--ease-out) both;
  }
}
:global(body[data-vfx-enabled="false"] .player-hit-card) { animation: none !important; }
@keyframes player-hit-in {
  from { opacity: .55; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
