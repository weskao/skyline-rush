<script setup lang="ts">
import { nextTick, ref } from 'vue';
import CloseButton from './CloseButton.vue';
import ReleasePlayBadge from './ReleasePlayBadge.vue';

// `startAt` carries a clip on from the frame the inline hero reached.
export interface ZoomedMedia { kind: 'image' | 'video'; src: string; label: string; poster?: string; source?: string; startAt?: number }
defineProps<{ closeLabel: string; pauseLabel: string; resumeLabel: string }>();
// The clip's last frame (null for a picture), so the inline hero can carry on from it.
const emit = defineEmits<{ closed: [time: number | null] }>();
const dialog = ref<HTMLDialogElement | null>(null);
const clip = ref<HTMLVideoElement | null>(null);
const media = ref<ZoomedMedia | null>(null);
// Read on each open: under reduced motion an enlarged clip waits, with its controls, until the player starts it.
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const still = ref(false);
// Set only by the player's own tap or key, so the paused badge never flashes while a clip is starting.
const userPaused = ref(false);
// The media stays transparent until it can draw itself, then fades in: no blank box, no mid-clip poster flash.
const ready = ref(false);
let opener: HTMLElement | null = null;
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
  userPaused.value = false;
  ready.value = false;
  media.value = next;
  const view = dialog.value;
  if (!view) return;
  view.showModal();
  fade(view, [0, 1], 220);
  // Refused autoplay (iOS Low Power Mode) falls back to the still with controls instead of an empty view.
  if (next.kind === 'video' && !still.value) nextTick(() => {
    clip.value?.focus({ preventScroll: true }); // Space / Enter pause it
    clip.value?.play().catch(() => { if (media.value === next) still.value = true; });
  });
}
// A clip that carries on from the inline hero starts at the hero's frame.
function seek(): void {
  if (clip.value && media.value?.startAt) clip.value.currentTime = media.value.startAt;
}
function togglePause(): void {
  const video = clip.value;
  if (!video) return;
  userPaused.value = !video.paused;
  if (video.paused) video.play().catch(() => { still.value = true; }); else video.pause();
}
function close(): void {
  const view = dialog.value;
  if (!view?.open || closing) return;
  closing = true;
  const faded = fade(view, [1, 0], 180);
  if (!faded) return view.close();
  faded.then(() => view.close(), () => view.close());
}
// Space and Enter pause a focused clip; with native controls (reduced motion) the keys stay the browser's.
function onKey(event: KeyboardEvent): void {
  if (still.value || (event.key !== ' ' && event.key !== 'Enter')) return;
  event.preventDefault();
  togglePause();
}
// A tap on a clip pauses or resumes it (its own controls handle themselves); a tap anywhere else, a picture included, closes.
function onTap({ target }: MouseEvent): void {
  if (!(target instanceof HTMLVideoElement)) return close();
  if (!target.controls) togglePause();
}
// Escape fades out too instead of vanishing.
function cancel(event: Event): void {
  event.preventDefault();
  close();
}
function restore(): void {
  closing = false;
  const time = clip.value?.currentTime;
  emit('closed', media.value?.kind === 'video' && Number.isFinite(time) ? time ?? null : null);
  media.value = null;
  opener?.focus({ preventScroll: true });
}
defineExpose({ open });
</script>
<template>
  <dialog ref="dialog" id="release-media-viewer" class="release-media-viewer" :aria-label="media?.label" @click="onTap" @cancel="cancel" @close="restore">
    <CloseButton class="release-viewer-close" :label="closeLabel" />
    <img v-if="media?.kind === 'image'" :src="media.src" :alt="media.label" :class="{ ready }" @load="ready = true" @error="ready = true">
    <!-- The poster is a still from mid-clip, so a playing clip goes without it and shows from its own first frame. -->
    <video v-else-if="media" ref="clip" :src="media.src" :poster="still ? media.poster : undefined" :data-source="media.source" muted loop playsinline disablepictureinpicture
      :autoplay="!still" :controls="still" :class="{ ready: ready || still }" :tabindex="still ? undefined : 0" :role="still ? undefined : 'button'"
      :aria-label="still ? undefined : userPaused ? resumeLabel : pauseLabel" @loadedmetadata="seek" @loadeddata="ready = true" @error="close"
      @keydown="onKey"></video>
    <ReleasePlayBadge v-if="userPaused && !still" class="release-viewer-paused" />
  </dialog>
</template>
<style scoped>
.release-media-viewer { box-sizing: border-box; width: 100vw; height: 100dvh; max-width: none; max-height: none; margin: 0; border: 0; background: transparent; cursor: zoom-out;
  padding: calc(max(12px, env(safe-area-inset-top)) + 56px) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left)); }
.release-media-viewer[open] { display: grid; grid-template: minmax(0, 1fr) / minmax(0, 1fr); place-items: center; }
.release-media-viewer::backdrop { background: rgb(2 6 14 / .9); }
.release-media-viewer, .release-media-viewer img, .release-media-viewer video { -webkit-tap-highlight-color: transparent; }
.release-media-viewer:focus-visible, .release-media-viewer img:focus-visible, .release-media-viewer video:focus-visible { outline: none; }
/* The paused badge sits in the clip's own grid cell, so it centres on the clip. */
.release-viewer-paused { grid-area: 1 / 1; }
/* Never upscaled past the file's own size, never cropped. */
.release-media-viewer img, .release-media-viewer video { display: block; max-width: 100%; max-height: 100%; border-radius: 10px; box-shadow: 0 18px 48px rgb(0 6 16 / .6);
  opacity: 0; transition: opacity .2s ease-out; }
.release-media-viewer .ready { opacity: 1; }
/* A tap on a clip pauses it (the backdrop and pictures keep zoom-out: a tap closes). */
.release-media-viewer video:not([controls]) { cursor: pointer; }
@media (prefers-reduced-motion: reduce) { .release-media-viewer img, .release-media-viewer video { transition: none; } }
.release-viewer-close { position: fixed; top: max(12px, env(safe-area-inset-top)); right: max(12px, env(safe-area-inset-right)); }
</style>
