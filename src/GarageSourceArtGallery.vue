<script setup lang="ts">
import { ref } from 'vue';
const names = [
  'mission-combo',
  'mission-drift',
  'mission-race',
  'mission-time',
  'trophy-bronze',
  'trophy-gold',
  'trophy-platinum',
  'trophy-silver',
] as const;
const failed = ref<ReadonlySet<string>>(new Set());
const file = (id: string) => `${import.meta.env.BASE_URL}feature-assets/garage-rewards-and-missions/raster/${id}@3x.webp`;
const onError = (id: string) => { failed.value = new Set([...failed.value, id]); };
</script>

<template>
  <details id="garage-art-source-garage-rewards-and-missions" class="garage-source-art">
    <summary>任務與獎盃素材 · Missions & Trophies</summary>
    <p>圖示預覽；任務領獎與獎盃授予尚未開放。 / Art preview only; rewards are not granted.</p>
    <div class="garage-source-grid">
      <figure v-for="name in names" :key="name">
        <img v-if="!failed.has(name)" :src="file(name)" width="96" height="96"
          :alt="name.replaceAll('-', ' ')" loading="lazy" decoding="async" @error="onError(name)" />
        <span v-else role="img" :aria-label="name.replaceAll('-', ' ')">{{ name }}</span>
        <figcaption>{{ name.replaceAll('-', ' ') }}</figcaption>
      </figure>
    </div>
  </details>
</template>

<style scoped>
.garage-source-art { margin: 16px 0; padding: 12px; background: #0c192a;
  border: 1px solid #46648d; border-radius: 12px; color: #d9eaff; }
.garage-source-art summary { min-height: 44px; cursor: pointer; font-weight: 700; }
.garage-source-art p { font-size: 12px; color: #abc8dd; }
.garage-source-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(114px, 1fr)); gap: 10px; }
.garage-source-grid figure { margin: 0; padding: 8px 4px; border: 1px solid #2e527e;
  background: radial-gradient(circle at center, #28466f, #101c30 80%); border-radius: 9px; text-align: center; }
.garage-source-grid img { display: block; margin: auto; width: 96px; height: 96px;
  max-width: 100%; object-fit: contain; }
.garage-source-grid figcaption { color: #bddaf1; font-size: 11px; overflow-wrap: anywhere; }
</style>
