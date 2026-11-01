<script setup lang="ts">
import { ref } from 'vue';
const names = [
  'store-box',
  'store-bundle',
  'store-cart',
  'store-collection',
  'store-star',
  'store-tag',
] as const;
const failed = ref<ReadonlySet<string>>(new Set());
const file = (id: string) => `${import.meta.env.BASE_URL}feature-assets/garage-store-readiness/raster/${id}@3x.webp`;
const onError = (id: string) => { failed.value = new Set([...failed.value, id]); };
</script>

<template>
  <details id="garage-art-source-garage-store-readiness" class="garage-source-art">
    <summary>商店素材 · Store Concept Art</summary>
    <p>商店尚未開放；沒有定價、購買或付款功能。 / Coming soon; no pricing, checkout or purchases.</p>
    <div class="garage-source-grid">
      <figure v-for="name in names" :key="name">
        <img v-if="!failed.has(name)" :src="file(name)" width="72" height="72"
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
.garage-source-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 10px; }
.garage-source-grid figure { margin: 0; padding: 8px 4px; border: 1px solid #2e527e;
  background: radial-gradient(circle at center, #28466f, #101c30 80%); border-radius: 9px; text-align: center; }
.garage-source-grid img { display: block; margin: auto; width: 72px; height: 72px;
  max-width: 100%; object-fit: contain; }
.garage-source-grid figcaption { color: #bddaf1; font-size: 11px; overflow-wrap: anywhere; }
</style>
