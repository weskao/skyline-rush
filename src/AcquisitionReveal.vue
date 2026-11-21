<script setup lang="ts">
import CollectibleIcon from './CollectibleIcon.vue';
import { acquisitionItemIcon } from './collectible-icons.ts';
import { computed, inject, onMounted, onUnmounted, shallowRef, ref, watchPostEffect } from 'vue';
import { acquisitionReveal, type AcquisitionActionFor, type AcquisitionBatch, type AcquisitionItem } from './acquisition-reveal.ts';
import { getLocale, onLocaleChange } from './i18n.ts';
import { dialogNavigation } from './dialog-navigation.ts';
import { ACQUISITION_SOUNDS } from './feedback-sounds.ts';
import AcquisitionCarStage from './AcquisitionCarStage.vue';
import type { CarRevealShot } from './acquisition-car-camera.ts';
import { carArtwork, isCar } from './car-catalog.ts';
import './acquisition-reveal.css';
import './acquisition-motion.css';

const labels = {
  en: { car: 'Vehicle', track: 'Track', paint: 'Paint finish', equipment: 'Equipment', clothing: 'Apparel',
    item: 'Item', medal: 'Medal', currency: 'Currency', unlocked: 'Unlocked', earned: 'Acquired',
    demo: 'Demo reward', continue: 'Continue', rewards: 'Rewards', title: 'Reward reveal',
    drive: ['Drive this car', 'Car selected'], paintAction: ['Apply paint', 'Paint applied'],
    equip: ['Equip now', 'Equipped'], demoEquip: ['Equip demo item', 'Demo item equipped'],
    wear: ['Wear now', 'Outfit equipped'], use: ['Use now', 'Used'], trackAction: ['Go to track', ''],
    applying: 'Applying…', unavailable: 'Could not apply this reward.' },
  'zh-TW': { car: '車款', track: '賽道', paint: '車漆', equipment: '裝備', clothing: '服裝',
    item: '物品', medal: '勳章', currency: '資源', unlocked: '已解鎖', earned: '已獲得',
    demo: '試玩獎勵', continue: '繼續', rewards: '本次獎勵', title: '獎勵揭曉',
    drive: ['換乘此車', '已選用此車'], paintAction: ['套用車漆', '已套用車漆'],
    equip: ['立即裝備', '已裝備'], demoEquip: ['立即試裝', '已試裝'],
    wear: ['立即穿戴', '已穿戴'], use: ['立即使用', '已使用'], trackAction: ['前往賽道', ''],
    applying: '套用中…', unavailable: '目前無法套用此獎勵。' },
} as const;
const cue = inject<(name: string) => void>('game-audio-cue', () => {});
const garageAction = inject<() => AcquisitionActionFor | undefined>('acquisition-garage', () => undefined);
const dialog = ref<HTMLDialogElement>();
const primary = ref<HTMLButtonElement>();
const active = shallowRef<AcquisitionBatch | null>(null);
const selected = ref(0);
const presenting = ref(false);
const firstLook = ref(true);
const shot = ref<CarRevealShot | ''>('');
const viewed = new Set<number>();
const heardShots = new Set<CarRevealShot>();
const failedArt = ref('');
const locale = ref(getLocale());
const phase = ref('');
const actionState = ref<'idle' | 'pending' | 'applied' | 'failed'>('idle');
const appliedRewards = new Set<number>();
const copy = computed(() => labels[locale.value]);
const item = computed(() => active.value?.items[selected.value]);
const action = computed(() => item.value && (item.value.action ?? garageAction()?.(item.value)));
const applied = computed(() => {
  const next = action.value;
  return actionState.value !== 'pending' && !!next && next.kind !== 'track'
    && (next.isApplied?.() ?? appliedRewards.has(selected.value));
});
const actionLabel = computed(() => {
  const next = action.value;
  if (!next) return '';
  if (actionState.value === 'pending' && next.kind !== 'track') return copy.value.applying;
  const key = next.kind === 'equip' && item.value?.scope === 'demo' ? 'demoEquip'
    : next.kind === 'paint' ? 'paintAction' : next.kind === 'track' ? 'trackAction' : next.kind;
  return copy.value[key][applied.value ? 1 : 0];
});
const car = computed(() => item.value?.kind === 'car' && isCar(item.value.id) ? item.value.id : undefined);
const artwork = computed(() => item.value?.artwork ?? (car.value && { src: carArtwork(car.value), style: 'cutout' }));
const art = computed(() => artwork.value && new URL(artwork.value.src, new URL(import.meta.env.BASE_URL, location.href)).href);
const quantity = computed(() => item.value?.quantity === undefined ? '' : '+' + item.value.quantity.toLocaleString(locale.value));

let nav: ReturnType<typeof dialogNavigation> | undefined;
let stopQueue: (() => void) | undefined;
let stopLocale: (() => void) | undefined;
let phaseObserver: MutationObserver | undefined;
let shown: AcquisitionBatch | null = null;
let openTrack: (() => void) | undefined;
onMounted(() => {
  nav = dialogNavigation(dialog.value!, () => {
    presenting.value = false;
    if (shown) cue('acquisition-stop');
  }, () => {
    const batch = shown, navigate = openTrack;
    shown = null;
    openTrack = undefined;
    if (batch) acquisitionReveal.dismiss(batch.id);
    navigate?.();
  });
  stopQueue = acquisitionReveal.subscribe(batch => {
    selected.value = 0;
    firstLook.value = true;
    shot.value = '';
    viewed.clear();
    heardShots.clear();
    appliedRewards.clear();
    actionState.value = 'idle';
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
  openTrack = undefined;
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
    viewed.add(0);
    cue(rewardCue(first));
    primary.value?.focus({ preventScroll: true });
  }
});

function rewardCue(reward: AcquisitionItem): string {
  return reward.kind === 'equipment' && reward.equipmentCategory
    ? 'acquisition-equipment-' + reward.equipmentCategory
    : ACQUISITION_SOUNDS[reward.kind];
}

function selectReward(index: number): void {
  if (selected.value === index || actionState.value === 'pending') return;
  const reward = active.value?.items[index];
  if (!reward) return;
  cue('acquisition-stop');
  shot.value = '';
  heardShots.clear();
  firstLook.value = !viewed.has(index);
  viewed.add(index);
  selected.value = index;
  actionState.value = 'idle';
  cue(firstLook.value ? rewardCue(reward) : 'acquisition-select');
}

function showShot(angle: CarRevealShot | ''): void {
  if (!presenting.value || !firstLook.value || !car.value) return;
  shot.value = angle;
  if (!angle || heardShots.has(angle)) return;
  heardShots.add(angle);
  cue('acquisition-car-' + angle);
}

async function applyReward(): Promise<void> {
  const next = action.value, batch = shown;
  if (!next || !batch || !presenting.value || applied.value || actionState.value === 'pending') return;
  actionState.value = 'pending';
  if (next.kind === 'track') {
    openTrack = () => { next.open(); cue('ui'); };
    nav?.close();
    return;
  }
  let success = false;
  try { success = await next.apply(); } catch { /* Keep the action available for another attempt. */ }
  if (shown !== batch || !presenting.value) return;
  if (success) appliedRewards.add(selected.value);
  actionState.value = success ? 'applied' : 'failed';
  cue(success ? 'equip-confirmed' : 'action-unavailable');
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
          :data-art-style="artwork?.style" :data-car-showcase="car || undefined" :data-reveal-shot="shot || undefined"
          :data-revisit="firstLook ? undefined : 'true'">
          <div class="acquisition-stage" aria-hidden="true">
            <div class="acquisition-grid"></div>
            <div class="acquisition-orbit"></div>
            <div class="acquisition-beam"></div>
            <AcquisitionCarStage v-if="car && presenting && firstLook" :car="car" @shot="showShot" />
            <div v-if="car && shot" :key="shot" class="acquisition-cut"></div>
            <div v-if="!car" class="acquisition-accents"></div>
            <img v-if="art && failedArt !== art" :src="art" class="acquisition-art" alt="" @error="failedArt = art ?? ''" />
            <div v-else class="acquisition-emblem">
              <CollectibleIcon :name="acquisitionItemIcon(item)" />
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
              :disabled="actionState === 'pending'" @click="selectReward(index)">
              <CollectibleIcon :name="acquisitionItemIcon(reward)" /><span>{{ reward.name[locale] }}</span>
            </button>
          </div>
          <div class="acquisition-controls">
            <div class="acquisition-actions">
              <button ref="primary" class="acquisition-continue" type="button" @click="continueGame">
                {{ copy.continue }} <CollectibleIcon name="continue" />
              </button>
              <button v-if="action" class="acquisition-apply" type="button" :data-action="action.kind"
                :data-applied="applied || undefined" :aria-disabled="applied || actionState === 'pending' || undefined"
                :aria-busy="actionState === 'pending' || undefined" @click="applyReward">
                <CollectibleIcon :name="applied ? 'check' : actionState === 'pending' ? 'pending' : action.kind === 'use' ? 'use' : item.kind" />
                {{ actionLabel }}
              </button>
            </div>
            <span class="acquisition-action-status" role="status" :data-error="actionState === 'failed' || undefined">
              {{ actionState === 'failed' ? copy.unavailable : actionState === 'applied' ? actionLabel : '' }}
            </span>
          </div>
        </footer>
      </template>
    </dialog>
  </Teleport>
</template>
