<script setup lang="ts">
import { computed, inject, nextTick, ref } from 'vue';
import Wave3DemoStore from './Wave3DemoStore.vue';
import Wave3DemoCollection from './Wave3DemoCollection.vue';
import { wave3DemoExperience } from './wave3-race-events.ts';
import { garageSkinEntry, garageSkinState, selectGarageSkin } from '#garage-skin-runtime';
import type { SkinId } from './garage-skin-catalog.ts';

const cue = inject<(name: string) => void>('game-audio-cue', () => {});
const props = withDefaults(defineProps<{ locale: string; embedded?: boolean; active?: boolean }>(), { active: true });
const emit = defineEmits<{ navigate: [page: 'home' | 'store' | 'collection'] }>();
const screen = ref<HTMLElement>();
const page = ref<'home' | 'store' | 'collection'>('home');
const collectionItem = ref<SkinId>();
const resetting = ref(false);
const resetFailed = ref(false);
const backLabel = computed(() => props.locale === 'zh-TW' ? '返回試玩選單' : 'Back to demo menu');
async function reset() {
  resetting.value = true;
  resetFailed.value = false;
  try {
    await wave3DemoExperience.resetDemo();
    cue('reset-confirmed');
    navigate('home');
  } catch {
    resetFailed.value = true;
  } finally {
    resetting.value = false;
  }
}
function navigate(next: typeof page.value, interactive = true) {
  if (page.value === next) return;
  page.value = next;
  if (next !== 'collection') collectionItem.value = undefined;
  if (!interactive) return;
  emit('navigate', next);
  if (props.embedded && !collectionItem.value) void nextTick(() => {
    const catalog = screen.value?.closest('.garage-catalog-scroll');
    if (catalog) catalog.scrollTop = 0;
    screen.value?.focus({ preventScroll: true });
  });
  cue('ui');
}
function openCollection(itemId?: SkinId) {
  collectionItem.value = itemId;
  navigate('collection');
}
defineExpose({ navigate });
const returnToRace = () => document.querySelector<HTMLButtonElement>('#garage-close')?.click();
</script>

<template>
  <section ref="screen" tabindex="-1" class="wave3-demo-entry" data-wave3-demo-entry
    :class="{ 'wave3-embedded-store': embedded && page === 'store' }"
    :aria-label="locale === 'zh-TW' ? '試玩外觀與收藏' : 'Demo cosmetics and collection'">
    <template v-if="page === 'home'">
      <p>{{ locale === 'zh-TW' ? '完成賽事與挑戰，取得試玩獎勵並兌換暫時外觀。' :
        'Race and complete challenges to earn demo rewards and redeem temporary cosmetics.' }}</p>
      <nav class="wave3-demo-entry-actions">
        <button v-if="!embedded" type="button" data-wave3-open-store @click="navigate('store')">{{ locale === 'zh-TW' ? '開啟試玩商城' : 'Open Demo Store' }}</button>
        <button v-if="!embedded" type="button" data-wave3-open-collection @click="navigate('collection')">{{ locale === 'zh-TW' ? '試玩收藏' : 'Demo Collection' }}</button>
        <button type="button" data-wave3-reset :disabled="resetting" @click="reset">{{ locale === 'zh-TW' ? '重設試玩' : 'Reset demo' }}</button>
      </nav>
      <p v-if="resetFailed" role="status">{{ locale === 'zh-TW' ? '無法重設試玩進度，請再試一次。' : 'Could not reset demo progress. Try again.' }}</p>
    </template>
    <template v-else>
      <button v-if="!embedded || page === 'collection'" type="button" class="wave3-demo-back" @click="navigate('home')">{{ backLabel }}</button>
      <Wave3DemoStore v-if="page === 'store'" :port="wave3DemoExperience" :locale="locale" :active="active"
        :embedded="embedded"
        :trial-access="garageSkinEntry" :skin-revision="garageSkinState.revision"
        @preview="selectGarageSkin" @open-collection="openCollection">
        <template v-if="embedded" #navigation>
          <button type="button" class="wave3-store-back" @click="navigate('home')">{{ backLabel }}</button>
        </template>
      </Wave3DemoStore>
      <Wave3DemoCollection v-else :port="wave3DemoExperience" :locale="locale" :initial-item-id="collectionItem"
        :trial-access="garageSkinEntry" :skin-revision="garageSkinState.revision"
        @preview="selectGarageSkin" @equipped-preview="cue('equip-confirmed')"
        @open-store="navigate('store')" @return-to-race="returnToRace" />
    </template>
  </section>
</template>

<style scoped>
.wave3-demo-entry { margin-block: 10px; border: 1px solid #406d8b; padding: 10px; border-radius: 12px; background: #0b2034; }
.wave3-embedded-store { margin-block: 4px; padding: 0; border: 0; background: none; }
.wave3-demo-entry p { margin: 0 0 8px; font-size: 12px; line-height: 1.5; }
.wave3-demo-entry-actions { display: flex; flex-wrap: wrap; gap: 6px; }
.wave3-demo-entry button { min-height: 44px; color: #dff5ff; background: #17405d; border: 1px solid #538baa; border-radius: 8px; padding: 9px 10px; cursor: pointer; }
.wave3-demo-entry .wave3-store-back { background: #17243a; border-color: #546587;
  font-family: inherit; font-size: 12px; font-weight: 700; line-height: 1.2; }
.wave3-demo-back { margin-bottom: 10px; }
.wave3-demo-entry button:focus-visible { outline: 3px solid #89f5ff; outline-offset: 2px; }
</style>
<style src="./wave3-demo-results.css"></style>
