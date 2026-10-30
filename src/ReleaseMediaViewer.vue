<script setup lang="ts">
import { ref } from 'vue';

export interface ZoomedMedia { kind: 'image' | 'video'; src: string; label: string; poster?: string; source?: string }
defineProps<{ closeLabel: string }>();
const dialog = ref<HTMLDialogElement | null>(null);
const media = ref<ZoomedMedia | null>(null);
// Read on each open: under reduced motion an enlarged clip waits, with its controls, until the player starts it.
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const still = ref(false);
let opener: HTMLElement | null = null;
let heldClip: HTMLVideoElement | null = null;

function open(next: ZoomedMedia, from: HTMLElement): void {
  opener = from;
  still.value = reducedMotion.matches;
  media.value = next;
  // One clip plays at a time: the notes' own clip waits behind and resumes on close.
  const hero = document.querySelector<HTMLVideoElement>('#release-video');
  heldClip = next.kind === 'video' && hero && !hero.paused ? hero : null;
  heldClip?.pause();
  dialog.value?.showModal();
}
// A tap anywhere closes, except on a clip's own controls.
function closeOnTap({ target }: MouseEvent): void {
  if (!(target instanceof HTMLVideoElement && target.controls)) dialog.value?.close();
}
function restore(): void {
  media.value = null;
  heldClip?.play().catch(() => { /* autoplay refused: the poster stays */ });
  heldClip = null;
  opener?.focus({ preventScroll: true });
}
defineExpose({ open });
</script>
<template>
  <dialog ref="dialog" id="release-media-viewer" class="release-media-viewer" :aria-label="media?.label" @click="closeOnTap" @close="restore">
    <button type="button" class="release-viewer-close" :aria-label="closeLabel">×</button>
    <img v-if="media?.kind === 'image'" :src="media.src" :alt="media.label">
    <video v-else-if="media" :src="media.src" :poster="media.poster" :data-source="media.source" muted loop playsinline disablepictureinpicture
      :autoplay="!still" :controls="still"></video>
  </dialog>
</template>
<style scoped>
.release-media-viewer { box-sizing: border-box; width: 100vw; height: 100dvh; max-width: none; max-height: none; margin: 0; border: 0; background: transparent; cursor: zoom-out;
  padding: calc(max(12px, env(safe-area-inset-top)) + 56px) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left)); }
.release-media-viewer[open] { display: grid; grid-template: minmax(0, 1fr) / minmax(0, 1fr); place-items: center; }
.release-media-viewer::backdrop { background: rgb(2 6 14 / .9); }
/* Never upscaled past the file's own size, never cropped. */
.release-media-viewer img, .release-media-viewer video { display: block; max-width: 100%; max-height: 100%; border-radius: 10px; box-shadow: 0 18px 48px rgb(0 6 16 / .6); }
.release-viewer-close { position: fixed; top: max(12px, env(safe-area-inset-top)); right: max(12px, env(safe-area-inset-right)); width: 44px; height: 44px; padding: 0;
  border: 1px solid rgb(150 227 255 / .35); border-radius: 50%; background: rgb(8 16 28 / .85); font-size: 26px; line-height: 1; color: #eefbff; }
</style>
