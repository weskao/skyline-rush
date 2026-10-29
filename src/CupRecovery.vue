<script setup lang="ts">
import { cupRecoveryView, cupRecoveryActions } from './cup-recovery-ui.ts';
import { t } from './i18n.ts';
</script>

<template>
  <div v-if="cupRecoveryView.available" id="cup-recovery" class="cup-recovery">
    <p id="cup-recovery-summary" role="status">{{ cupRecoveryView.summary }}</p>
    <div class="race-presets">
      <button type="button" id="cup-resume" class="controls-reset" aria-describedby="cup-recovery-summary" data-i18n="mode.cupResume" @click="cupRecoveryActions.resume">{{ t('mode.cupResume') }}</button>
      <button type="button" id="cup-discard" class="controls-reset" data-i18n="mode.cupDiscard" @click="cupRecoveryActions.discard">{{ t('mode.cupDiscard') }}</button>
    </div>
  </div>
</template>

<style scoped>
.cup-recovery .controls-reset { min-height: 44px; }
.cup-recovery p { font-size: 12px; line-height: 1.5; }
@media (min-width: 1001px) and (min-height: 900px) {
  /* Expanded Cup settings use the intro slogan's space within the fixed height budget. */
  :global(.intro:has(#cup-rules[open]:not([hidden]) .cup-recovery) .intro-wordmark),
  :global(.intro:has(#cup-rules[open]:not([hidden]) .cup-recovery) h1),
  /* 10A's rules row also lives in the intro, so the key hints (text only) step aside too. */
  :global(.intro:has(#cup-rules[open]:not([hidden]) .cup-recovery) .intro-controls) { display: none; }
}
</style>
