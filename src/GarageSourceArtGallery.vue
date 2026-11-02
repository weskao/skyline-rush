<script setup lang="ts">
import { computed } from 'vue';
import GarageArtworkTile from './GarageArtworkTile.vue';

const catalogs = {
  'garage-rewards-and-missions': {
    title: '任務與獎盃素材 · Missions & Trophies',
    hint: '圖示預覽；任務領獎與獎盃授予尚未開放。 / Art preview only; rewards are not granted.',
    size: 96, tone: 'azure',
    names: ['mission-combo','mission-drift','mission-race','mission-time',
      'trophy-bronze','trophy-gold','trophy-platinum','trophy-silver'],
  },
  'garage-store-readiness': {
    title: '商店素材 · Store Concept Art',
    hint: '商店尚未開放；沒有定價、購買或付款功能。 / Coming soon; no pricing or checkout.',
    size: 72, tone: 'gold',
    names: ['store-box','store-bundle','store-cart','store-collection','store-star','store-tag'],
  },
} as const;
type ArtworkCategory = keyof typeof catalogs;
const props = defineProps<{ category: ArtworkCategory }>();
const source = computed(() => catalogs[props.category]);
const image = (id: string) =>
  `${import.meta.env.BASE_URL}feature-assets/${props.category}/raster/${id}@3x.webp`;
</script>

<template>
  <details :id="'garage-art-source-' + category" class="garage-source-art">
    <summary>{{ source.title }}</summary>
    <p>{{ source.hint }}</p>
    <div class="garage-source-grid">
      <GarageArtworkTile v-for="name in source.names" :key="name" :id="name"
        :label="name.replaceAll('-', ' ')" :src="image(name)"
        :size="source.size" :tone="source.tone" />
    </div>
  </details>
</template>

<style scoped>
.garage-source-art {
  box-sizing: border-box; min-width: 0; margin: 16px 0; padding: 12px;
  border: 1px solid #46648d; border-radius: 12px;
  background: #0c192a; color: #d9eaff;
}
.garage-source-art summary { min-height: 44px; cursor: pointer; font-weight: 700; }
.garage-source-art p { font-size: 12px; line-height: 1.45; color: #abc8dd; }
.garage-source-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 128px), 1fr));
  gap: 10px; align-items: stretch;
}
</style>
