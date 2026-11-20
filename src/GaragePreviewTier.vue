<script setup lang="ts">
import { ref } from 'vue';
import { PREVIEW_TIERS, garagePreviewTier, setGaragePreviewTier } from './garage-preview-tier.ts';
import type { SprintTierId } from './sprint-tier.ts';
import { garageStudioView } from './garage-view-state.ts';

defineProps<{ locale: string }>();
// The game's own terms, the same in both locales (as on the HUD). A row added to sprint-tier.ts fails typecheck here until it has a label.
const labels: Record<SprintTierId, string> = { idle: '', boost: 'BOOST', nitro: 'NITRO', 'nitro-boost': 'NITRO + BOOST' };
const tier = ref(garagePreviewTier());
function pick(id: SprintTierId) {
  setGaragePreviewTier(id);
  tier.value = garagePreviewTier();
}
</script>

<template>
  <!-- Which sprint tier the 3D preview burns. Preview only: it never equips or unlocks anything. -->
  <div v-show="garageStudioView.effectsVisible" id="garage-preview-tier" class="garage-tier" role="group"
    :aria-label="locale === 'zh-TW' ? '衝刺預覽' : 'Sprint preview'" :data-preview-tier="tier">
    <button v-for="id in PREVIEW_TIERS" :key="id" type="button" :data-sprint-tier="id"
      :aria-pressed="tier === id" @click="pick(id)">{{ labels[id] }}</button>
  </div>
  <!-- Garage Home's car idles on the home scene, which plays one showroom burn: say where the tier is visible. -->
  <p v-if="garageStudioView.effectsVisible && garageStudioView.page === 'home'" class="garage-tier-hint">{{
    locale === 'zh-TW' ? '進入檢視模式，即可在車上看到所選的衝刺強度。' : 'Open Inspect to see the chosen tier on the car.' }}</p>
</template>

<style scoped>
/* Joined segments in the look of the pose and camera controls (garage-preview-controls.css). No motion to reduce. */
.garage-tier { display: flex; margin: 0 0 6px; }
.garage-tier button {
  flex: 1 1 auto; min-width: 44px; min-height: 44px; padding: 0 8px; position: relative;
  border: 1px solid #43647b; background: #13283a; color: #e7f3fc;
  font-size: 12px; font-weight: 800; letter-spacing: .04em; white-space: nowrap;
  cursor: pointer; touch-action: manipulation;
}
.garage-tier button + button { margin-left: -1px; }
.garage-tier button:first-child { border-radius: 9px 0 0 9px; }
.garage-tier button:last-child { border-radius: 0 9px 9px 0; }
.garage-tier button[aria-pressed="true"] {
  z-index: 1; border-color: #79d9f4; color: #fff;
  background: linear-gradient(#24465d, #102637); box-shadow: inset 0 -3px #79d9f4;
}
.garage-tier button:focus-visible { z-index: 2; outline: 3px solid #74ebff; outline-offset: 2px; }
.garage-tier-hint { margin: 0 0 8px; font-size: 11px; line-height: 1.4; color: #a9c2d4; }
</style>
