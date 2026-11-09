<script setup lang="ts">
// Pause lives in the top bar (⏸ / Esc) and the shared pause screen, as in every race; once practice is
// complete, the done button already leaves it, so Exit hides instead of duplicating it.
import { coachView } from './tutorial-coach-state.ts';
import { TUTORIAL_STEPS } from './interactive-tutorial.ts';
import { rewardParts } from './tutorial-ui.ts';
</script>
<template>
  <aside id="tutorial-coach" class="tutorial-coach" aria-labelledby="tutorial-title" :hidden="!coachView.visible" :data-step="coachView.step">
    <header class="tutorial-heading"><strong id="tutorial-title">{{ coachView.title }}</strong><div class="tutorial-actions"><button id="tutorial-skip-step" class="controls-reset" :hidden="coachView.skipHidden" data-i18n="tutorial.skipStep">Skip step</button><button id="tutorial-exit" class="controls-reset" :hidden="!coachView.completeActionsHidden" data-i18n="tutorial.exit">Exit</button></div></header>
    <progress id="tutorial-progress" :max="TUTORIAL_STEPS.length" value="0" aria-label="Practice progress" data-i18n-aria-label="tutorial.progress"></progress>
    <div class="tutorial-copy"><p id="tutorial-instruction" role="status" aria-live="polite"><template v-for="(part, i) in rewardParts(coachView.instruction)" :key="i"><mark v-if="part.reward" class="tutorial-reward">{{ part.text }}</mark><template v-else>{{ part.text }}</template></template></p><div id="tutorial-input" :data-keys="coachView.hintKeys || undefined">{{ coachView.hintText }}</div><small id="tutorial-assist" :hidden="coachView.assistHidden" data-i18n="tutorial.assist">Practice only · assisted cruising · no career rewards</small></div>
    <div id="tutorial-complete-actions" class="tutorial-actions" :hidden="coachView.completeActionsHidden"><button id="tutorial-retry" class="controls-reset" data-i18n="tutorial.retry">Practice again</button><button id="tutorial-done" class="controls-reset" data-i18n="tutorial.done">Back to game</button></div>
  </aside>
  <!-- Decorative: the instruction names the gate; the arrow only points the way to it. -->
  <div v-if="coachView.visible && coachView.guide" id="tutorial-guide" class="tutorial-guide" :data-dir="coachView.guide" aria-hidden="true">
    <svg v-for="n in 3" :key="n" viewBox="0 0 24 24" :style="{ '--n': n }"><path d="M9 5l7 7-7 7" /></svg>
  </div>
  <!-- Live cue: the next control and its timing; the countdown digits are decorative. -->
  <div v-if="coachView.visible && coachView.cue" id="tutorial-cue" :key="coachView.cueId" class="tutorial-cue" :data-cue="coachView.cueId" role="status" aria-live="polite">
    <span v-if="coachView.cueKeys.length" class="tutorial-cue-keys"><kbd v-for="key in coachView.cueKeys" :key="key">{{ key }}</kbd></span>
    <strong>{{ coachView.cue }}</strong>
    <b v-if="coachView.cueCount" class="tutorial-cue-count" aria-hidden="true">{{ coachView.cueCount }}</b>
  </div>
  <!-- Pass toast: the lesson just cleared, with its NITRO payout when it paid one. -->
  <div v-if="coachView.visible && coachView.passed" id="tutorial-pass" :key="coachView.passed" class="tutorial-pass" role="status" aria-live="polite">
    <span class="tutorial-pass-badge" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span>
    <strong>{{ coachView.passed }}</strong>
    <mark v-if="coachView.passedReward" class="tutorial-reward">{{ coachView.passedReward }}</mark>
  </div>
  <!-- Decorative: the coach title and role=status copy already announce completion. -->
  <div v-if="coachView.visible && coachView.celebration" class="tutorial-celebration" aria-hidden="true">
    <span class="tutorial-celebration-badge"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span>
    <strong>{{ coachView.title }}</strong>
    <small>{{ coachView.celebration }}</small>
    <i v-for="n in 16" :key="n" :style="{ '--n': n }"></i>
  </div>
</template>
