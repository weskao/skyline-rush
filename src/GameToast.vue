<script setup lang="ts">
// The one shared setting toast (showToast() in toast-view-state.ts).
import { ref, watch, onMounted } from 'vue';
import { toastView } from './toast-view-state.ts';
import './race-notice-layout.css';
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
    <p v-if="toastView.text" :key="toastView.id" class="game-toast-pill" :data-state="toastView.state || undefined">
      <svg v-if="toastView.icon" v-bind="ICON_ATTRS" v-html="toastView.icon"></svg>
      <span class="game-toast-label">{{ toastView.text }}</span>
      <span v-if="toastView.state" class="game-toast-state">{{ toastView.stateText }}</span>
    </p>
  </div>
</template>

<style scoped>
/* Top centre, under the brand/route row and above the race readouts, #driving-message and #event-callout
   (tests/toggle-feedback-browser.spec.js measures all three, portrait and landscape). */
#game-toast {
  position: fixed; inset: auto; top: calc(env(safe-area-inset-top, 0px) + var(--setting-toast-top)); left: 50%; translate: -50% 0;
  margin: 0; padding: 0; border: 0; background: none; overflow: visible; z-index: 9; pointer-events: none;
}
.game-toast-pill {
  display: flex; align-items: center; gap: 8px; margin: 0; padding: 7px 16px 7px 12px; border-radius: 999px; white-space: nowrap;
  color: #f4f0e9; background: rgb(6 16 32 / .86); border: 1px solid #6daabe70; box-shadow: 0 8px 24px #0006;
  font: 600 14px/1.2 system-ui, sans-serif; letter-spacing: .3px; animation: game-toast 1.8s ease both;
}
.game-toast-pill svg { width: 18px; height: 18px; flex: none; color: var(--accent, #ffb15c); }
/* The state is a badge of its own: ON filled green, OFF outlined coral, so it reads by fill and word, not hue alone. */
.game-toast-pill[data-state="on"] { --toast-state: #3ee08a; }
.game-toast-pill[data-state="off"] { --toast-state: #ff8a7e; }
.game-toast-pill[data-state] { border-color: color-mix(in srgb, var(--toast-state) 55%, transparent); }
.game-toast-pill[data-state] svg { color: var(--toast-state); }
.game-toast-state {
  padding: 3px 10px; border-radius: 999px; border: 1.5px solid var(--toast-state);
  font: 800 13px/1.1 system-ui, sans-serif; letter-spacing: .6px;
}
.game-toast-pill[data-state="on"] .game-toast-state { color: #04210f; background: var(--toast-state); }
.game-toast-pill[data-state="off"] .game-toast-state { color: var(--toast-state); background: transparent; }
/* Portrait phones: the position readout and #driving-message fill the left column, and a name + state pill is
   wider than the gap beside them, so the toast sits right-aligned under the minimap (portrait race HUD breakpoint). */
@media (max-width: 760px) and (orientation: portrait) {
  #game-toast { left: auto; right: max(12px, env(safe-area-inset-right, 0px)); translate: none; }
}
@keyframes game-toast { 0% { opacity: 0; translate: 0 -8px; } 10%, 82% { opacity: 1; translate: 0 0; } 100% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .game-toast-pill { animation: none; } }
body.vfx-comfort .game-toast-pill { animation: none; }
</style>
