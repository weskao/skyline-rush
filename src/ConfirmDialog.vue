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
    <p id="confirm-body">{{ confirmView.body }}</p>
    <div class="leave-actions">
      <button type="button" class="primary-button" id="confirm-cancel" autofocus @click="answerConfirm(false)"><span>{{ confirmView.cancel }}</span><svg v-bind="ICON_ATTRS" v-html="icons.arrow"></svg></button>
      <button type="button" class="controls-reset" id="confirm-accept" @click="answerConfirm(true)">{{ confirmView.confirm }}</button>
    </div>
  </dialog>
</template>
