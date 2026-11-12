<script setup lang="ts">
import GarageArtworkImage from './GarageArtworkImage.vue';
import { wave3DemoArtUrl, type Wave3DemoArtId } from './wave3-demo-art.ts';

withDefaults(defineProps<{ id: Wave3DemoArtId; alt?: string }>(), { alt: '' });
</script>

<template>
  <span class="wave3-demo-art" :data-wave3-demo-art="id">
    <GarageArtworkImage :src="wave3DemoArtUrl(id)" :fallback-src="wave3DemoArtUrl(id, 'png')"
      :size="72" :image-id="id" :alt="alt" :fallback-text="alt" />
  </span>
</template>

<style scoped>
.wave3-demo-art { box-sizing: border-box; display: grid; place-items: center;
  width: 88px; height: 88px; min-width: 88px; padding: 8px; flex-shrink: 0; }
.wave3-demo-art :deep(.artwork-img) { max-width: 100%; max-height: 100%; object-fit: contain; }
</style>
