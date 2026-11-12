<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

const props = withDefaults(defineProps<{
  src: string; alt: string; size: number; height?: number; imageId?: string; fallbackSrc?: string;
  animatedSrc?: string; fallbackText?: string; fallbackClass?: string; loading?: 'lazy' | 'eager';
}>(), { fallbackSrc: '', animatedSrc: '', fallbackText: '', fallbackClass: '', loading: 'lazy' });

const usingFallback = ref(false);
const failed = ref(false);
const animationFailed = ref(false);
const visible = ref(false);
const reducedMotion = ref(false);
const vfxAllowed = ref(true);
const image = ref<HTMLImageElement | null>(null);
const displaySrc = computed(() => {
  if (usingFallback.value) return props.fallbackSrc;
  if (props.animatedSrc && visible.value && !reducedMotion.value && vfxAllowed.value && !animationFailed.value) {
    return props.animatedSrc;
  }
  return props.src;
});
watch(() => [props.src, props.animatedSrc, props.fallbackSrc], () => {
  usingFallback.value = false; failed.value = false; animationFailed.value = false;
});

function onError(): void {
  if (props.animatedSrc && displaySrc.value === props.animatedSrc) {
    // Failure of animation must restore the untouched original WebP/SVG.
    animationFailed.value = true;
  } else if (props.fallbackSrc && !usingFallback.value) {
    usingFallback.value = true;
  } else {
    failed.value = true;
  }
}

let observer: IntersectionObserver | undefined;
let vfxObserver: MutationObserver | undefined;
let media: MediaQueryList | undefined;
// Observe only settings attributes, not body classes which may change every racing frame.
const syncVfx = (): void => {
  vfxAllowed.value = document.body.dataset.vfxEnabled !== 'false' &&
    document.body.dataset.vfxQuality !== 'low';
};
const onMotionChange = (event: MediaQueryListEvent): void => { reducedMotion.value = event.matches; };
onMounted(() => {
  media = window.matchMedia('(prefers-reduced-motion: reduce)');
  reducedMotion.value = media.matches;
  media.addEventListener('change', onMotionChange);
  if (props.animatedSrc) {
    syncVfx();
    vfxObserver = new MutationObserver(syncVfx);
    vfxObserver.observe(document.body, { attributes: true,
      attributeFilter: ['data-vfx-enabled', 'data-vfx-quality'] });
  }
  if ('IntersectionObserver' in window && image.value) {
    observer = new IntersectionObserver(([entry]) => { visible.value = entry.isIntersecting; },
      { rootMargin: '96px' });
    observer.observe(image.value);
  } else {
    visible.value = true;
  }
});
onUnmounted(() => {
  observer?.disconnect();
  vfxObserver?.disconnect();
  media?.removeEventListener('change', onMotionChange);
});
</script>
<template>
  <img v-if="!failed" ref="image" class="artwork-img" :src="displaySrc"
    :data-static-src="src" :data-animated-src="animatedSrc || undefined"
    :data-animation-active="String(!!animatedSrc && displaySrc === animatedSrc)"
    :width="size" :height="height ?? size" :data-image="imageId"
    :style="{ width: size + 'px', height: (height ?? size) + 'px' }"
    :alt="alt" :loading="loading" decoding="async" @error="onError" />
  <span v-else class="artwork-fallback" :class="fallbackClass" role="img"
    :aria-label="fallbackText || alt">{{ fallbackText || alt }}</span>
</template>
<style scoped>
.artwork-img { display: block; width: auto; height: auto; max-width: 100%;
  max-height: 100%; object-fit: contain; flex-shrink: 0; }
.artwork-fallback { display: grid; place-items: center; font-size: 11px;
  overflow-wrap: anywhere; text-align: center; color: #dcefff; }
</style>
