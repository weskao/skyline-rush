<script setup lang="ts">
import { coachView } from './tutorial-coach-state.js';
</script>
<template>
  <aside id="tutorial-coach" class="tutorial-coach" aria-labelledby="tutorial-title" :hidden="!coachView.visible" :data-step="coachView.step">
    <header class="tutorial-heading"><strong id="tutorial-title">{{ coachView.title }}</strong><div class="tutorial-actions"><button id="tutorial-pause" class="controls-reset" :hidden="coachView.pauseHidden" data-i18n="tutorial.pause">{{ coachView.pauseText }}</button><button id="tutorial-exit" class="controls-reset" data-i18n="tutorial.exit">Exit</button></div></header>
    <progress id="tutorial-progress" max="8" value="0" aria-label="Practice progress" data-i18n-aria-label="tutorial.progress"></progress>
    <div class="tutorial-copy"><p id="tutorial-instruction" role="status" aria-live="polite">{{ coachView.instruction }}</p><div id="tutorial-input" :data-keys="coachView.hintKeys || undefined">{{ coachView.hintText }}</div><small id="tutorial-assist" :hidden="coachView.assistHidden" data-i18n="tutorial.assist">Practice only · assisted cruising · no career rewards</small></div>
    <div id="tutorial-complete-actions" class="tutorial-actions" :hidden="coachView.completeActionsHidden"><button id="tutorial-retry" class="controls-reset" data-i18n="tutorial.retry">Practice again</button><button id="tutorial-done" class="controls-reset" data-i18n="tutorial.done">Back to game</button></div>
  </aside>
</template>
