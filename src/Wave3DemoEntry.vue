<script setup lang="ts">
import { ref } from 'vue';
import Wave3DemoStore from './Wave3DemoStore.vue';
import Wave3DemoCollection from './Wave3DemoCollection.vue';
import { wave3DemoExperience } from './wave3-race-events.ts';
import { garageSkinEntry, garageSkinState, selectGarageSkin, equipWave3DemoSkin, resetWave3DemoSkin } from '#garage-skin-runtime';
import type { SkinId } from './garage-skin-catalog.ts';

defineProps<{ locale: string }>();
const page = ref<'home' | 'store' | 'collection'>('home');
function equip(id: SkinId) {
  const snapshot = wave3DemoExperience.getSnapshot();
  if (snapshot.mode !== 'local-demo' || snapshot.authority !== 'local' ||
      !snapshot.demoInventory.includes(id) || snapshot.equippedPreview !== id) return;
  equipWave3DemoSkin(id, snapshot.accountId);
}
function reset() {
  wave3DemoExperience.resetDemo();
  resetWave3DemoSkin();
  page.value = 'home';
}
const returnToRace = () => document.querySelector<HTMLButtonElement>('#garage-close')?.click();
</script>

<template>
  <section class="wave3-demo-entry" data-wave3-demo-entry :aria-label="locale === 'zh-TW' ? '試玩外觀與收藏' : 'Demo cosmetics and collection'">
    <template v-if="page === 'home'">
      <p>{{ locale === 'zh-TW' ? '完成賽事與挑戰，取得本機試玩獎勵並兌換暫時外觀。' :
        'Race and complete challenges to earn local demo rewards and redeem temporary cosmetics.' }}</p>
      <nav class="wave3-demo-entry-actions">
        <button type="button" data-wave3-open-store @click="page = 'store'">{{ locale === 'zh-TW' ? '開啟試玩商城' : 'Open Demo Store' }}</button>
        <button type="button" data-wave3-open-collection @click="page = 'collection'">{{ locale === 'zh-TW' ? '試玩收藏' : 'Demo Collection' }}</button>
        <button type="button" data-wave3-reset @click="reset">{{ locale === 'zh-TW' ? '重設本機試玩' : 'Reset local demo' }}</button>
      </nav>
    </template>
    <template v-else>
      <button type="button" class="wave3-demo-back" @click="page = 'home'">{{ locale === 'zh-TW' ? '返回試玩選單' : 'Back to demo menu' }}</button>
      <Wave3DemoStore v-if="page === 'store'" :port="wave3DemoExperience" :locale="locale"
        :trial-access="garageSkinEntry" :skin-revision="garageSkinState.revision"
        @preview="selectGarageSkin" @open-collection="page = 'collection'" />
      <Wave3DemoCollection v-else :port="wave3DemoExperience" :locale="locale"
        :trial-access="garageSkinEntry" :skin-revision="garageSkinState.revision"
        @preview="selectGarageSkin" @equipped-preview="equip"
        @open-store="page = 'store'" @return-to-race="returnToRace" />
    </template>
  </section>
</template>

<style scoped>
.wave3-demo-entry { margin-block: 10px; border: 1px solid #406d8b; padding: 10px; border-radius: 12px; background: #0b2034; }
.wave3-demo-entry p { margin: 0 0 8px; font-size: 12px; line-height: 1.5; }
.wave3-demo-entry-actions { display: flex; flex-wrap: wrap; gap: 6px; }
.wave3-demo-entry button { min-height: 44px; color: #dff5ff; background: #17405d; border: 1px solid #538baa; border-radius: 8px; padding: 9px 10px; cursor: pointer; }
.wave3-demo-back { margin-bottom: 10px; }
.wave3-demo-entry button:focus-visible { outline: 3px solid #89f5ff; outline-offset: 2px; }
</style>
<style src="./wave3-demo-results.css"></style>
