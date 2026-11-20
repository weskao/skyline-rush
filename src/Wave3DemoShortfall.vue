<script setup lang="ts">
import Wave3CurrencyAmount from './Wave3CurrencyAmount.vue';
import type { DemoCurrency } from './wave3-experience-contract.ts';

const props = defineProps<{ currency: DemoCurrency; amount: number; locale: string }>();
const hints: Record<DemoCurrency, [string, string]> = {
  points: ['Finish a race or claim a demo mission.', '完成比賽或領取試玩任務。'],
  coins: ['Finish races or claim the daily race mission.', '完成競速或領取每日競速任務。'],
  diamonds: ['Claim the weekly race mission.', '領取每週競速任務。'],
};
const tr = (en: string, zh: string) => props.locale === 'zh-TW' ? zh : en;
</script>

<template>
  <div class="demo-shortfall" data-demo-shortfall>
    <strong>{{ tr('Need', '還差') }}
      <Wave3CurrencyAmount :currency="currency" :amount="amount" :locale="locale" />
      {{ tr('more', '') }}
    </strong>
    <span>{{ tr(...hints[currency]) }}</span>
  </div>
</template>

<style scoped>
.demo-shortfall { width: 100%; box-sizing: border-box; padding: 6px; border-radius: 6px;
  color: #ffe1a7; background: #282337; border-inline-start: 2px solid #c5935c; font-size: 11px; line-height: 1.35; }
.demo-shortfall > span { display: block; margin-top: 4px; color: #c8d9e9; }
</style>
