<script setup lang="ts">
// In-game confirm (confirmDialog() in confirm-dialog.ts). Styled as the leave-race dialog; the safe choice is primary.
import { ref, watch } from 'vue';
import { confirmView, answerConfirm } from './confirm-dialog.ts';
import { icons, ICON_ATTRS } from './icons.ts';

const dialog = ref<HTMLDialogElement>();
watch(() => confirmView.open, open => {
  const el = dialog.value;
  if (open && !el?.open) el?.showModal();
  else if (!open && el?.open) el.close();
}, { flush: 'post' });
function onBackdrop(event: MouseEvent): void {
  const el = dialog.value!;
  if (event.target !== el) return;
  const { left, top, right, bottom } = el.getBoundingClientRect();
  if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) answerConfirm(false);
}
</script>

<template>
  <!-- Keys stay inside the dialog, as on #leave-screen, so M/V/Esc never reach the race controls behind it. -->
  <dialog ref="dialog" id="confirm-dialog" class="history-screen leave-screen" aria-labelledby="confirm-title" aria-describedby="confirm-body"
    @close="answerConfirm(false)" @click="onBackdrop" @keydown.stop>
    <h2 id="confirm-title">{{ confirmView.title }}</h2>
    <div id="confirm-body">
      <p v-if="confirmView.body">{{ confirmView.body }}</p>
      <ul v-if="confirmView.points.length"><li v-for="point in confirmView.points" :key="point">{{ point }}</li></ul>
    </div>
    <div class="leave-actions">
      <button type="button" class="primary-button" id="confirm-cancel" autofocus @click="answerConfirm(false)"><span>{{ confirmView.cancel }}</span><svg v-bind="ICON_ATTRS" v-html="icons.arrow"></svg></button>
      <button type="button" class="controls-reset" id="confirm-accept" @click="answerConfirm(true)">{{ confirmView.confirm }}</button>
    </div>
  </dialog>
</template>

<style scoped>
/* One fact per line, left-aligned so a phone reader scans them; the action button is tinted as the one that changes something. */
#confirm-body ul { display: grid; gap: 8px; margin: 0 0 24px; padding: 0; list-style: none; text-align: left; color: #cad2d8; font-size: 14px; line-height: 1.5; }
#confirm-body li { display: flex; gap: 10px; }
#confirm-body li::before { content: ''; flex: none; width: 6px; height: 6px; margin-top: .55em; border-radius: 50%; background: var(--accent, #ffb15c); }
#confirm-accept { color: #ff8a7e; }
/* Short landscape phones: .history-screen caps the height at 100dvh - 64px and scrolls, which hid the second button.
   A wider box, a one-line title and side-by-side buttons fit 743x340 with slack (tests/toggle-feedback-browser.spec.js). */
@media (max-height: 500px) and (orientation: landscape) {
  #confirm-dialog { width: min(600px, calc(100% - 32px)); padding: 16px 24px; }
  #confirm-dialog h2 { font-size: 30px; margin-bottom: 10px; }
  #confirm-body ul { gap: 4px; margin-bottom: 14px; }
  .leave-actions { grid-template-columns: 1fr 1fr; }
}
</style>
