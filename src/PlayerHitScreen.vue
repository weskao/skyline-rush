<script setup lang="ts">
import './player-hit-screen.css';
import { playerHitView } from './item-ui.ts';
import FreezeScreen from './debuff/freeze/FreezeScreen.vue';
import EmpScreen from './debuff/emp/EmpScreen.vue';
</script>

<template>
  <!-- item-ui.ts owns `hidden`, `data-hit` (the hit that takes precedence) and `data-calm` on this element.
       Every live hit also gets its own layer, so Freeze and EMP can show together; EMP, the shorter one, on top. -->
  <div id="player-hit-screen" aria-hidden="true" hidden>
    <div v-if="playerHitView.freezePhase" class="hit-layer" data-hit-layer="freeze" :data-phase="playerHitView.freezePhase">
      <FreezeScreen :phase="playerHitView.freezePhase" />
    </div>
    <div v-if="playerHitView.empPhase" class="hit-layer" data-hit-layer="emp" :data-phase="playerHitView.empPhase">
      <EmpScreen :phase="playerHitView.empPhase" />
    </div>
  </div>
</template>
