<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, shallowRef, ref, watchPostEffect } from 'vue';
import { acquisitionReveal, type AcquisitionBatch, type AcquisitionKind } from './acquisition-reveal.ts';
import { getLocale, onLocaleChange } from './i18n.ts';
import { dialogNavigation } from './dialog-navigation.ts';
import { icons, ICON_ATTRS } from './icons.ts';
import { ACQUISITION_SOUNDS } from './feedback-sounds.ts';
import AcquisitionCarStage from './AcquisitionCarStage.vue';
import { carArtwork, isCar } from './car-catalog.ts';
import { GARAGE_POSE_ART } from './lobby-art.ts';
import './acquisition-reveal.css';

const labels = {
  en: { car: 'Vehicle', track: 'Track', paint: 'Paint finish', equipment: 'Equipment', clothing: 'Apparel',
    item: 'Item', medal: 'Medal', currency: 'Currency', unlocked: 'Unlocked', earned: 'Acquired',
    demo: 'Demo reward', continue: 'Continue', rewards: 'Rewards', title: 'Reward reveal' },
  'zh-TW': { car: '車款', track: '賽道', paint: '車漆', equipment: '裝備', clothing: '服裝',
    item: '物品', medal: '勳章', currency: '資源', unlocked: '已解鎖', earned: '已獲得',
    demo: '試玩獎勵', continue: '繼續', rewards: '本次獎勵', title: '獎勵揭曉' },
} as const;
const glyph: Record<AcquisitionKind, string> = {
  car: `<path d="${GARAGE_POSE_ART.car}"/>`, track: icons.flag, paint: icons.nitro,
  equipment: icons.airflow, clothing: icons.star, item: icons.star, medal: icons.star, currency: icons.star,
};
const cue = inject<(name: string) => void>('game-audio-cue', () => {});
const dialog = ref<HTMLDialogElement>();
const primary = ref<HTMLButtonElement>();
const active = shallowRef<AcquisitionBatch | null>(null);
const selected = ref(0);
const presenting = ref(false);
const failedArt = ref('');
const locale = ref(getLocale());
const phase = ref('');
const copy = computed(() => labels[locale.value]);
const item = computed(() => active.value?.items[selected.value]);
const car = computed(() => item.value?.kind === 'car' && isCar(item.value.id) ? item.value.id : undefined);
const artwork = computed(() => item.value?.artwork ?? (car.value && { src: carArtwork(car.value), style: 'cutout' }));
const art = computed(() => artwork.value && new URL(artwork.value.src, new URL(import.meta.env.BASE_URL, location.href)).href);
const quantity = computed(() => item.value?.quantity === undefined ? '' : '+' + item.value.quantity.toLocaleString(locale.value));

let nav: ReturnType<typeof dialogNavigation> | undefined;
let stopQueue: (() => void) | undefined;
let stopLocale: (() => void) | undefined;
let phaseObserver: MutationObserver | undefined;
let shown: AcquisitionBatch | null = null;
onMounted(() => {
  nav = dialogNavigation(dialog.value!, () => {
    presenting.value = false;
    if (shown) acquisitionReveal.dismiss(shown.id);
    shown = null;
  });
  stopQueue = acquisitionReveal.subscribe(batch => {
    selected.value = 0;
    active.value = batch;
  });
  stopLocale = onLocaleChange(next => { locale.value = next; });
  const readPhase = () => { phase.value = document.body.dataset.phase ?? ''; };
  readPhase();
  phaseObserver = new MutationObserver(readPhase);
  phaseObserver.observe(document.body, { attributes: true, attributeFilter: ['data-phase'] });
});
onUnmounted(() => {
  phaseObserver?.disconnect();
  stopQueue?.();
  stopLocale?.();
  if (dialog.value?.open) nav?.close(true);
});

watchPostEffect(() => {
  const batch = active.value;
  const first = batch?.items[0];
  if (!batch || !first || (phase.value && phase.value !== 'ready' && phase.value !== 'finished')) return;
  if (!dialog.value?.open && nav) {
    shown = batch;
    nav.open();
    presenting.value = true;
    cue(ACQUISITION_SOUNDS[first.kind]);
    primary.value?.focus({ preventScroll: true });
  }
});

function selectReward(index: number): void {
  if (selected.value === index) return;
  selected.value = index;
  cue('acquisition-select');
}

function continueGame(): void {
  nav?.close();
}
</script>

<template>
  <Teleport to="body">
    <dialog id="acquisition-reveal" ref="dialog" class="acquisition-reveal" :aria-label="copy.title"
      aria-describedby="acquisition-name" @cancel.prevent="continueGame">
      <template v-if="item && active">
        <section :key="active.id + ':' + selected" class="acquisition-hero" :data-kind="item.kind"
          :data-art-style="artwork?.style" :data-car-showcase="car || undefined">
          <div class="acquisition-stage" aria-hidden="true">
            <div class="acquisition-grid"></div>
            <div class="acquisition-orbit"></div>
            <div class="acquisition-beam"></div>
            <AcquisitionCarStage v-if="car && presenting" :car="car" />
            <img v-if="art && failedArt !== art" :src="art" class="acquisition-art" alt="" @error="failedArt = art ?? ''" />
            <div v-else class="acquisition-emblem">
              <svg v-bind="ICON_ATTRS" v-html="glyph[item.kind]"></svg>
            </div>
            <div class="acquisition-scan"></div>
          </div>
          <div class="acquisition-copy">
            <p class="acquisition-status"><i></i>{{ copy[item.status] }}<span>{{ copy[item.kind] }}</span></p>
            <h2 id="acquisition-name" aria-live="polite"><b v-if="quantity">{{ quantity + ' ' }}</b>{{ item.name[locale] }}</h2>
            <p v-if="item.description" class="acquisition-detail">{{ item.description[locale] }}</p>
            <p v-if="item.scope === 'demo'" class="acquisition-scope">{{ copy.demo }}</p>
          </div>
        </section>
        <footer class="acquisition-footer">
          <div v-if="active.items.length > 1" class="acquisition-rewards" role="group" :aria-label="copy.rewards">
            <button v-for="(reward, index) in active.items" :key="reward.kind + ':' + reward.id" type="button"
              :aria-pressed="index === selected" :aria-label="reward.name[locale]"
              @click="selectReward(index)">
              <svg v-bind="ICON_ATTRS" v-html="glyph[reward.kind]"></svg><span>{{ reward.name[locale] }}</span>
            </button>
          </div>
          <button ref="primary" class="acquisition-continue" type="button" @click="continueGame">
            {{ copy.continue }} <svg v-bind="ICON_ATTRS" v-html="icons.arrow"></svg>
          </button>
        </footer>
      </template>
    </dialog>
  </Teleport>
</template>
