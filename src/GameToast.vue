<script setup lang="ts">
// The one shared setting toast (showToast() in toast-view-state.ts).
import { ref, watch, onMounted } from 'vue';
import { toastView } from './toast-view-state.ts';
import { ICON_ATTRS } from './icons.ts';

const region = ref<HTMLElement>();
// A manual popover sits in the top layer, so a toast raised from inside the Settings dialog shows above it.
// Re-showing moves it above any modal opened since; without popover support it stays a fixed element.
function raise(): void {
  const el = region.value;
  if (!el || typeof el.showPopover !== 'function') return;
  if (el.matches(':popover-open')) el.hidePopover();
  el.showPopover();
}
onMounted(raise);
watch(() => toastView.id, raise, { flush: 'post' });
</script>

<template>
  <div ref="region" id="game-toast" popover="manual" role="status" aria-live="polite" aria-atomic="true">
    <p v-if="toastView.text" :key="toastView.id" class="game-toast-pill">
      <svg v-if="toastView.icon" v-bind="ICON_ATTRS" v-html="toastView.icon"></svg>
      <span>{{ toastView.text }}</span>
    </p>
  </div>
</template>

<style scoped>
/* Top centre, under the brand/route row and above the race readouts, #driving-message and #event-callout
   (tests/toggle-feedback-browser.spec.js measures all three, portrait and landscape). */
#game-toast {
  position: fixed; inset: auto; top: calc(env(safe-area-inset-top, 0px) + var(--toast-top, 86px)); left: 50%; translate: -50% 0;
  margin: 0; padding: 0; border: 0; background: none; overflow: visible; z-index: 9; pointer-events: none;
}
.game-toast-pill {
  display: flex; align-items: center; gap: 8px; margin: 0; padding: 7px 16px 7px 12px; border-radius: 999px; white-space: nowrap;
  color: #f4f0e9; background: rgb(6 16 32 / .86); border: 1px solid #6daabe70; box-shadow: 0 8px 24px #0006;
  font: 600 13px/1.2 system-ui, sans-serif; letter-spacing: .3px; animation: game-toast 1.8s ease both;
}
.game-toast-pill svg { width: 18px; height: 18px; flex: none; color: var(--accent, #ffb15c); }
@keyframes game-toast { 0% { opacity: 0; translate: 0 -8px; } 10%, 82% { opacity: 1; translate: 0 0; } 100% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .game-toast-pill { animation: none; } }
:global(body.vfx-comfort) .game-toast-pill { animation: none; }
</style>
