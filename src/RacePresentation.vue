<script setup lang="ts">
import { computed, onUnmounted, shallowRef, watch } from 'vue';
import { presetsForTrack } from './race-session.ts';
import { racePresentationView } from './race-presentation-ui.ts';
import { getLocale, onLocaleChange, t, trackName } from './i18n.ts';
import { refreshCustomSelects } from './custom-select.ts';

const locale = shallowRef(getLocale());
onUnmounted(onLocaleChange(value => { locale.value = value; }));
const presets = computed(() => presetsForTrack(racePresentationView.setup?.trackId ?? ''));
watch([() => racePresentationView.visualPreset, presets, locale], refreshCustomSelects, { flush: 'post' });
const rulesSummary = computed(() => {
  const setup = racePresentationView.setup;
  if (!setup) return '';
  const { mode, config, trackId } = setup;
  return [t('mode.' + mode), trackName(trackId, locale.value),
    t('mode.setupAI', { n: config.rivals }),
    t('mode.setupTraffic', { value: t('mode.' + config.traffic) }),
    t(config.items ? 'mode.setupSuppliesOn' : 'mode.setupSuppliesOff'),
    t('mode.setupCollision', { value: t('mode.' + (config.collision ?? 'normal')) }),
    t('mode.setupHazards', { value: t('mode.' + (config.hazards ?? 'off')) }),
    ...(config.activeItems ? [t('mode.activeItems')] : []),
    ...(mode === 'custom' ? [t('mode.setupDifficulty', { value: t('mode.' + config.difficulty) }),
      t('mode.setupStages', { n: config.stages ?? 1 })] : []),
  ].join(' · ');
});
</script>

<template>
  <div class="race-presentation" :lang="locale">
    <p class="race-setup-flow" data-i18n="mode.setupFlow">{{ t('mode.setupFlow') }}</p>
    <p id="race-setup-summary" role="status">{{ rulesSummary }}</p>
    <label class="race-presentation-label" for="race-visual-preset">
      <span data-i18n="mode.visualPreset">{{ t('mode.visualPreset') }}</span>
      <select id="race-visual-preset" v-model="racePresentationView.visualPreset" :aria-label="t('mode.visualPreset')" data-i18n-aria-label="mode.visualPreset">
        <option v-for="preset in presets" :key="preset" :value="preset" :data-i18n="`mode.visual.${preset}`">{{ t(`mode.visual.${preset}`) }}</option>
      </select>
    </label>
    <p id="race-presentation-summary" role="status">{{ t('mode.visualSummary', { preset: t(`mode.visual.${racePresentationView.visualPreset}`) }) }}</p>
  </div>
</template>

<style scoped>
.race-presentation { margin-top: 10px; }
.race-presentation-label { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 12px; }
.race-presentation-label select { min-height: 44px; max-width: 60%; }
.race-presentation p { color: #aee7fa; font-size: 11px; line-height: 1.5; margin: 6px 0 0; }
.race-presentation .race-setup-flow { font-weight: 700; margin-bottom: 6px; }
:global(#race-mode-rules[open]) { max-height: 180px; overflow-y: auto; }
</style>
