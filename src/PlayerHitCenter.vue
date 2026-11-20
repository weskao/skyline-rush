<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, shallowRef } from 'vue';
import { getLocale, onLocaleChange, t } from './i18n.ts';
import { itemAttackPaths } from './icons.ts';
import { playerHitView } from './item-ui.ts';
import type { ItemAttack } from './item-attacks.ts';

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
    <div v-for="attack in active" :key="attack" class="player-hit-card" :data-debuff="attack">
      <span class="player-hit-icon" aria-hidden="true">
        <img v-if="!unavailable[attack]" :src="iconUrl(attack)" width="40" height="40" alt="" draggable="false" @error="unavailable[attack] = true">
        <svg v-else viewBox="0 0 48 48"><path :d="itemAttackPaths[attack]" /></svg>
      </span>
      <div class="player-hit-label">
        <strong>{{ t(`mode.playerHit.${attack}`, undefined, locale) }}</strong>
        <span>{{ t('mode.playerHit.speed', undefined, locale) }}</span>
      </div>
      <time :datetime="`PT${playerHitView[attack]}S`">{{ t('mode.playerHit.time', { sec: playerHitView[attack] }, locale) }}</time>
    </div>
  </div>
</template>

<style scoped>
.player-hit-center {
  grid-row: 2;
  display: grid;
  gap: 5px;
  width: min(90%, clamp(206px, 29vw, 292px));
}
.player-hit-card {
  --hit-accent: var(--emp-hit-color);
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: clamp(8px, 1.4vw, 13px);
  padding: 4px clamp(10px, 1.4vw, 14px) 4px 4px;
  border: 1px solid color-mix(in srgb, var(--hit-accent) 70%, transparent);
  border-radius: 10px;
  background: linear-gradient(100deg, rgb(8 24 37 / .92), rgb(8 16 28 / .84));
  box-shadow: 0 3px 12px rgb(0 0 0 / .32);
  color: #f4f9ff;
}
.player-hit-card[data-debuff="freeze"] { --hit-accent: var(--freeze-hit-color); }
.player-hit-icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 6px;
  color: var(--hit-accent);
  background: linear-gradient(150deg, color-mix(in srgb, var(--hit-accent) 23%, #10192b), #0a1323 78%);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--hit-accent) 32%, transparent);
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
  font: 800 clamp(18px, min(3vw, 5dvh), 26px)/1.05 'Barlow Condensed', var(--cjk-fonts), sans-serif;
  letter-spacing: .045em;
}
.player-hit-label span {
  color: #d0dce7;
  font-size: clamp(10px, 1.7dvh, 12px);
  font-weight: 700;
  line-height: 1.15;
}
.player-hit-card time {
  padding-left: clamp(8px, 1.4vw, 14px);
  border-left: 1px solid rgb(230 242 255 / .24);
  color: var(--hit-accent);
  font: 800 clamp(15px, 2.8dvh, 20px)/1 'Barlow Condensed', var(--cjk-fonts), sans-serif;
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
