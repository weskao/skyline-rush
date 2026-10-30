<script setup lang="ts">
import { nextTick, ref } from 'vue';
import CloseButton from './CloseButton.vue';

export interface ZoomedMedia { kind: 'image' | 'video'; src: string; label: string; poster?: string; source?: string }
defineProps<{ closeLabel: string }>();
const dialog = ref<HTMLDialogElement | null>(null);
const clip = ref<HTMLVideoElement | null>(null);
const media = ref<ZoomedMedia | null>(null);
// Read on each open: under reduced motion an enlarged clip waits, with its controls, until the player starts it.
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const still = ref(false);
// The media stays transparent until it can draw itself, then fades in: no blank box, no mid-clip poster flash.
const ready = ref(false);
let opener: HTMLElement | null = null;
let heldClip: HTMLVideoElement | null = null;
let closing = false;

// The view and its backdrop fade together; reduced motion skips it.
function fade(view: HTMLDialogElement, opacity: number[], duration: number): Promise<unknown> | null {
  if (reducedMotion.matches) return null;
  const timing = { duration, easing: 'ease-out' };
  view.animate({ opacity }, timing);
  return view.animate({ opacity }, { ...timing, pseudoElement: '::backdrop' }).finished;
}
function open(next: ZoomedMedia, from: HTMLElement): void {
  opener = from;
  closing = false;
  still.value = reducedMotion.matches;
  ready.value = false;
  media.value = next;
  // One clip plays at a time: the notes' own clip waits behind and resumes on close.
  const hero = document.querySelector<HTMLVideoElement>('#release-video');
  heldClip = next.kind === 'video' && hero && !hero.paused ? hero : null;
  heldClip?.pause();
  const view = dialog.value;
  if (!view) return;
  view.showModal();
  fade(view, [0, 1], 220);
  // Refused autoplay (iOS Low Power Mode) falls back to the still with controls instead of an empty view.
  if (next.kind === 'video' && !still.value) nextTick(() => clip.value?.play().catch(() => { if (media.value === next) still.value = true; }));
}
function close(): void {
  const view = dialog.value;
  if (!view?.open || closing) return;
  closing = true;
  const faded = fade(view, [1, 0], 180);
  if (!faded) return view.close();
  faded.then(() => view.close(), () => view.close());
}
// A tap anywhere closes, except on a clip's own controls.
function closeOnTap({ target }: MouseEvent): void {
  if (!(target instanceof HTMLVideoElement && target.controls)) close();
}
// Escape fades out too instead of vanishing.
function cancel(event: Event): void {
  event.preventDefault();
  close();
}
function restore(): void {
  closing = false;
  media.value = null;
  heldClip?.play().catch(() => { /* autoplay refused: the poster stays */ });
  heldClip = null;
  opener?.focus({ preventScroll: true });
}
defineExpose({ open });
</script>
<template>
  <dialog ref="dialog" id="release-media-viewer" class="release-media-viewer" :aria-label="media?.label" @click="closeOnTap" @cancel="cancel" @close="restore">
    <CloseButton class="release-viewer-close" :label="closeLabel" />
    <img v-if="media?.kind === 'image'" :src="media.src" :alt="media.label" :class="{ ready }" @load="ready = true" @error="ready = true">
    <!-- The poster is a still from mid-clip, so a playing clip goes without it and shows from its own first frame. -->
    <video v-else-if="media" ref="clip" :src="media.src" :poster="still ? media.poster : undefined" :data-source="media.source" muted loop playsinline disablepictureinpicture
      :autoplay="!still" :controls="still" :class="{ ready: ready || still }" @loadeddata="ready = true"></video>
  </dialog>
</template>
<style scoped>
.release-media-viewer { box-sizing: border-box; width: 100vw; height: 100dvh; max-width: none; max-height: none; margin: 0; border: 0; background: transparent; cursor: zoom-out;
  padding: calc(max(12px, env(safe-area-inset-top)) + 56px) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left)); }
.release-media-viewer[open] { display: grid; grid-template: minmax(0, 1fr) / minmax(0, 1fr); place-items: center; }
.release-media-viewer::backdrop { background: rgb(2 6 14 / .9); }
.release-media-viewer, .release-media-viewer img, .release-media-viewer video { -webkit-tap-highlight-color: transparent; }
.release-media-viewer:focus-visible, .release-media-viewer img:focus-visible, .release-media-viewer video:focus-visible { outline: none; }
/* Never upscaled past the file's own size, never cropped. */
.release-media-viewer img, .release-media-viewer video { display: block; max-width: 100%; max-height: 100%; border-radius: 10px; box-shadow: 0 18px 48px rgb(0 6 16 / .6);
  opacity: 0; transition: opacity .2s ease-out; }
.release-media-viewer .ready { opacity: 1; }
@media (prefers-reduced-motion: reduce) { .release-media-viewer img, .release-media-viewer video { transition: none; } }
.release-viewer-close { position: fixed; top: max(12px, env(safe-area-inset-top)); right: max(12px, env(safe-area-inset-right)); }
</style>
