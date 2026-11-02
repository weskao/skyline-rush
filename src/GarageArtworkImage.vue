<script setup lang="ts">
import { ref, watch } from 'vue';
const props = withDefaults(defineProps<{
  src: string; alt: string; size: number; height?: number; imageId?: string; fallbackSrc?: string;
  fallbackText?: string; fallbackClass?: string; loading?: 'lazy' | 'eager';
}>(), { fallbackSrc: '', fallbackText: '', fallbackClass: '', loading: 'lazy' });
const usingFallback = ref(false), failed = ref(false);
watch(() => [props.src, props.fallbackSrc], () => { usingFallback.value = false; failed.value = false; });
function onError(): void {
  if (props.fallbackSrc && !usingFallback.value) usingFallback.value = true;
  else failed.value = true;
}
</script>
<template>
  <img v-if="!failed" class="artwork-img" :src="usingFallback ? fallbackSrc : src"
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
