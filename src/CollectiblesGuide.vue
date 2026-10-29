<script setup lang="ts">
import { COLLECTIBLES_GUIDE_COPY } from './collectibles-guide-copy.ts';

const rings = [
  { key: 'charge', color: 'cyan', icon: 'charge' },
  { key: 'nitro', color: 'gold', icon: 'nitro' },
  { key: 'slipstream', color: 'purple', icon: 'boost' },
  { key: 'risk', color: 'red', icon: 'risk' },
  { key: 'mystery', color: 'rainbow', icon: 'mystery' },
  { key: 'perfect', color: 'gold', icon: 'perfect' },
];

const pickups = [
  { key: 'cell', color: 'blue', icon: 'cell' },
  { key: 'can', color: 'orange', icon: 'can' },
  { key: 'tank', color: 'gold', icon: 'tank' },
  { key: 'overcharge', color: 'rainbow', icon: 'overcharge' },
];

const powers = [
  { key: 'shield', color: 'cyan', icon: 'shield' },
  { key: 'magnet', color: 'gold', icon: 'magnet' },
  { key: 'ghost', color: 'purple', icon: 'ghost' },
  { key: 'freeze', color: 'blue', icon: 'freeze' },
];
</script>

<template>
  <div id="guide-items" class="collectibles-guide">
    <p class="collectibles-intro" data-i18n="guide.items.intro">{{ COLLECTIBLES_GUIDE_COPY.en['guide.items.intro'] }}</p>

    <!-- SECTION 1: RINGS -->
    <div class="collectibles-section">
      <div class="section-header">
        <h3 class="section-title" data-i18n="guide.items.ringsTitle">{{ COLLECTIBLES_GUIDE_COPY.en['guide.items.ringsTitle'] }}</h3>
        <p class="section-intro" data-i18n="guide.items.ringsIntro">{{ COLLECTIBLES_GUIDE_COPY.en['guide.items.ringsIntro'] }}</p>
      </div>
      <div class="collectibles-grid">
        <article v-for="ring in rings" :key="ring.key" class="collectible-card" :class="`card-${ring.color}`">
          <div class="card-emblem" aria-hidden="true">
            <svg viewBox="0 0 48 48" class="emblem-svg">
              <circle cx="24" cy="24" r="18" fill="none" class="ring-back" />
              <circle cx="24" cy="24" r="18" fill="none" class="ring-fore" />
              <circle v-if="ring.key === 'risk'" cx="24" cy="24" r="10" fill="none" class="ring-inner" />
              <!-- Center icons -->
              <path v-if="ring.key === 'charge'" d="M22 14v10h-5l7 10v-10h5l-7-10z" class="icon-fill" />
              <path v-else-if="ring.key === 'nitro'" d="M25 13l-7 12h5l-3 10 9-14h-5l4-8z" class="icon-fill" />
              <path v-else-if="ring.key === 'slipstream'" d="M16 24h16m-6-6l6 6-6 6" class="icon-stroke" />
              <path v-else-if="ring.key === 'risk'" d="M24 16v8m0 4v2" class="icon-stroke alert-bar" />
              <text v-else-if="ring.key === 'mystery'" x="24" y="30" text-anchor="middle" class="icon-text">?</text>
              <path v-else-if="ring.key === 'perfect'" d="M24 14l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" class="icon-fill" />
            </svg>
          </div>
          <div class="card-info">
            <header class="card-head">
              <h4 :data-i18n="`guide.items.ring.${ring.key}.title`">{{ COLLECTIBLES_GUIDE_COPY.en[`guide.items.ring.${ring.key}.title`] }}</h4>
              <span class="card-badge" :data-i18n="`guide.items.ring.${ring.key}.badge`">{{ COLLECTIBLES_GUIDE_COPY.en[`guide.items.ring.${ring.key}.badge`] }}</span>
            </header>
            <p :data-i18n="`guide.items.ring.${ring.key}.desc`">{{ COLLECTIBLES_GUIDE_COPY.en[`guide.items.ring.${ring.key}.desc`] }}</p>
          </div>
        </article>
      </div>
    </div>

    <!-- SECTION 2: ROAD PICKUPS -->
    <div class="collectibles-section">
      <div class="section-header">
        <h3 class="section-title" data-i18n="guide.items.pickupsTitle">{{ COLLECTIBLES_GUIDE_COPY.en['guide.items.pickupsTitle'] }}</h3>
        <p class="section-intro" data-i18n="guide.items.pickupsIntro">{{ COLLECTIBLES_GUIDE_COPY.en['guide.items.pickupsIntro'] }}</p>
      </div>
      <div class="collectibles-grid">
        <article v-for="pickup in pickups" :key="pickup.key" class="collectible-card" :class="`card-${pickup.color}`">
          <div class="card-emblem" aria-hidden="true">
            <svg viewBox="0 0 48 48" class="emblem-svg">
              <!-- Diamond / Octahedron Gem -->
              <polygon points="24,8 38,24 24,40 10,24" class="gem-body" />
              <polygon points="24,8 38,24 24,24" class="gem-facet-a" />
              <polygon points="24,24 38,24 24,40" class="gem-facet-b" />
              <polygon points="10,24 24,8 24,24" class="gem-facet-c" />
              <polygon points="10,24 24,24 24,40" class="gem-facet-d" />
            </svg>
          </div>
          <div class="card-info">
            <header class="card-head">
              <h4 :data-i18n="`guide.items.pickup.${pickup.key}.title`">{{ COLLECTIBLES_GUIDE_COPY.en[`guide.items.pickup.${pickup.key}.title`] }}</h4>
              <span class="card-badge" :data-i18n="`guide.items.pickup.${pickup.key}.badge`">{{ COLLECTIBLES_GUIDE_COPY.en[`guide.items.pickup.${pickup.key}.badge`] }}</span>
            </header>
            <p :data-i18n="`guide.items.pickup.${pickup.key}.desc`">{{ COLLECTIBLES_GUIDE_COPY.en[`guide.items.pickup.${pickup.key}.desc`] }}</p>
          </div>
        </article>
      </div>
    </div>

    <!-- SECTION 3: MYSTERY POWERS -->
    <div class="collectibles-section">
      <div class="section-header">
        <h3 class="section-title" data-i18n="guide.items.powersTitle">{{ COLLECTIBLES_GUIDE_COPY.en['guide.items.powersTitle'] }}</h3>
        <p class="section-intro" data-i18n="guide.items.powersIntro">{{ COLLECTIBLES_GUIDE_COPY.en['guide.items.powersIntro'] }}</p>
      </div>
      <div class="collectibles-grid">
        <article v-for="power in powers" :key="power.key" class="collectible-card" :class="`card-${power.color}`">
          <div class="card-emblem" aria-hidden="true">
            <svg viewBox="0 0 48 48" class="emblem-svg">
              <!-- Shield -->
              <path v-if="power.key === 'shield'" d="M24 10l12 5v9c0 8-5 13-12 15-7-2-12-7-12-15v-9l12-5z" class="icon-fill-trans" />
              <!-- Magnet -->
              <path v-else-if="power.key === 'magnet'" d="M15 14v10a9 9 0 0018 0V14h-5v10a4 4 0 01-8 0V14h-5z" class="icon-fill" />
              <!-- Ghost -->
              <path v-else-if="power.key === 'ghost'" d="M14 36c1-2 2-2 3-2s2 2 3 2 2-2 3-2 2 2 3 2 2-2 3-2 2 2 3 2V22a10 10 0 00-20 0v14zm6-14a2 2 0 114 0 2 2 0 01-4 0zm8 0a2 2 0 114 0 2 2 0 01-4 0z" class="icon-fill-trans" />
              <!-- Freeze -->
              <g v-else-if="power.key === 'freeze'" class="icon-stroke">
                <path d="M24 10v28M10 24h28M14 14l20 20M34 14L14 34" stroke-width="2.5" />
                <circle cx="24" cy="24" r="3" class="icon-fill" />
              </g>
            </svg>
          </div>
          <div class="card-info">
            <header class="card-head">
              <h4 :data-i18n="`guide.items.power.${power.key}.title`">{{ COLLECTIBLES_GUIDE_COPY.en[`guide.items.power.${power.key}.title`] }}</h4>
              <span class="card-badge" :data-i18n="`guide.items.power.${power.key}.badge`">{{ COLLECTIBLES_GUIDE_COPY.en[`guide.items.power.${power.key}.badge`] }}</span>
            </header>
            <p :data-i18n="`guide.items.power.${power.key}.desc`">{{ COLLECTIBLES_GUIDE_COPY.en[`guide.items.power.${power.key}.desc`] }}</p>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>

<style scoped>
.collectibles-guide {
  width: 100%;
  min-width: 0;
  color: #edf5ff;
  text-align: left;
}

.collectibles-intro {
  margin: 0 0 20px;
  color: #b5c9dd;
  font-size: 14px;
  line-height: 1.6;
}

.collectibles-section {
  margin-bottom: 24px;
}

.collectibles-section:last-child {
  margin-bottom: 8px;
}

.section-header {
  margin-bottom: 12px;
  border-bottom: 1px solid #273b4e;
  padding-bottom: 8px;
}

.section-title {
  margin: 0 0 4px;
  font-size: 17px;
  font-weight: 700;
  color: #f4f8fc;
  letter-spacing: 0.02em;
}

.section-intro {
  margin: 0;
  font-size: 13px;
  color: #8da6bd;
  line-height: 1.5;
}

.collectibles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
  gap: 12px;
}

.collectible-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  min-width: 0;
  padding: 14px;
  border: 1px solid #2b4055;
  border-radius: 12px;
  background: #101e2d;
  transition: transform 0.15s ease, border-color 0.15s ease;
}

.collectible-card:hover {
  transform: translateY(-1px);
}

.card-emblem {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: #142537;
  padding: 4px;
}

.emblem-svg {
  width: 100%;
  height: 100%;
  display: block;
}

.card-info {
  flex: 1;
  min-width: 0;
}

.card-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 6px;
}

.card-head h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #edf5ff;
  line-height: 1.3;
}

.card-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 4px;
  letter-spacing: 0.03em;
  overflow-wrap: anywhere;
}

.card-info p {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  color: #c4d3e2;
  overflow-wrap: anywhere;
}

/* Color theme variants */
.card-cyan {
  border-left: 3px solid #00e5ff;
}
.card-cyan .card-emblem {
  background: rgba(0, 229, 255, 0.08);
  color: #00e5ff;
}
.card-cyan .ring-fore, .card-cyan .icon-fill {
  fill: #00e5ff;
  stroke: #00e5ff;
}
.card-cyan .ring-back {
  stroke: rgba(0, 229, 255, 0.25);
  stroke-width: 3;
}
.card-cyan .ring-fore {
  stroke-width: 3.5;
  stroke-dasharray: 80 40;
}
.card-cyan .card-badge {
  background: rgba(0, 229, 255, 0.15);
  color: #5ceeff;
}
.card-cyan .icon-fill-trans {
  fill: rgba(0, 229, 255, 0.2);
  stroke: #00e5ff;
  stroke-width: 2;
}

.card-gold {
  border-left: 3px solid #ffc400;
}
.card-gold .card-emblem {
  background: rgba(255, 196, 0, 0.08);
  color: #ffc400;
}
.card-gold .ring-fore, .card-gold .icon-fill {
  fill: #ffc400;
  stroke: #ffc400;
}
.card-gold .ring-back {
  stroke: rgba(255, 196, 0, 0.25);
  stroke-width: 3;
}
.card-gold .ring-fore {
  stroke-width: 3.5;
  stroke-dasharray: 90 30;
}
.card-gold .card-badge {
  background: rgba(255, 196, 0, 0.15);
  color: #ffd647;
}

.card-purple {
  border-left: 3px solid #d050ff;
}
.card-purple .card-emblem {
  background: rgba(208, 80, 255, 0.08);
  color: #d050ff;
}
.card-purple .ring-fore, .card-purple .icon-fill {
  fill: #d050ff;
  stroke: #d050ff;
}
.card-purple .ring-back {
  stroke: rgba(208, 80, 255, 0.25);
  stroke-width: 3;
}
.card-purple .ring-fore {
  stroke-width: 3.5;
  stroke-dasharray: 75 35;
}
.card-purple .icon-stroke {
  stroke: #d050ff;
  stroke-width: 3;
  stroke-linecap: round;
}
.card-purple .card-badge {
  background: rgba(208, 80, 255, 0.15);
  color: #e28aff;
}
.card-purple .icon-fill-trans {
  fill: rgba(208, 80, 255, 0.2);
  stroke: #d050ff;
  stroke-width: 2;
}

.card-red {
  border-left: 3px solid #ff3b30;
}
.card-red .card-emblem {
  background: rgba(255, 59, 48, 0.08);
  color: #ff3b30;
}
.card-red .ring-back {
  stroke: rgba(255, 59, 48, 0.25);
  stroke-width: 3;
}
.card-red .ring-fore {
  stroke: #ff3b30;
  stroke-width: 3.5;
}
.card-red .ring-inner {
  stroke: #ff3b30;
  stroke-width: 2;
  stroke-dasharray: 4 4;
}
.card-red .alert-bar {
  stroke: #ff3b30;
  stroke-width: 3;
  stroke-linecap: round;
}
.card-red .card-badge {
  background: rgba(255, 59, 48, 0.15);
  color: #ff736a;
}

.card-rainbow {
  border-left: 3px solid #ec4899;
}
.card-rainbow .card-emblem {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(59, 130, 246, 0.1));
}
.card-rainbow .ring-back {
  stroke: rgba(255, 255, 255, 0.2);
  stroke-width: 3;
}
.card-rainbow .ring-fore {
  stroke: #f43f5e;
  stroke-width: 4;
}
.card-rainbow .icon-text {
  font-family: inherit;
  font-size: 20px;
  font-weight: 800;
  fill: #f43f5e;
}
.card-rainbow .card-badge {
  background: linear-gradient(90deg, rgba(239, 68, 68, 0.2), rgba(168, 85, 247, 0.2));
  color: #fbcfe8;
}

.card-blue {
  border-left: 3px solid #38bdf8;
}
.card-blue .card-emblem {
  background: rgba(56, 189, 248, 0.08);
  color: #38bdf8;
}
.card-blue .gem-body {
  fill: #0284c7;
  stroke: #38bdf8;
  stroke-width: 2;
}
.card-blue .gem-facet-a { fill: #38bdf8; opacity: 0.6; }
.card-blue .gem-facet-b { fill: #0369a1; opacity: 0.6; }
.card-blue .gem-facet-c { fill: #7dd3fc; opacity: 0.7; }
.card-blue .gem-facet-d { fill: #075985; opacity: 0.7; }
.card-blue .card-badge {
  background: rgba(56, 189, 248, 0.15);
  color: #7dd3fc;
}
.card-blue .icon-stroke {
  stroke: #38bdf8;
  stroke-linecap: round;
}
.card-blue .icon-fill {
  fill: #38bdf8;
}

.card-orange {
  border-left: 3px solid #ff9100;
}
.card-orange .card-emblem {
  background: rgba(255, 145, 0, 0.08);
  color: #ff9100;
}
.card-orange .gem-body {
  fill: #d97706;
  stroke: #ff9100;
  stroke-width: 2;
}
.card-orange .gem-facet-a { fill: #fbbf24; opacity: 0.6; }
.card-orange .gem-facet-b { fill: #b45309; opacity: 0.6; }
.card-orange .gem-facet-c { fill: #fde68a; opacity: 0.7; }
.card-orange .gem-facet-d { fill: #78350f; opacity: 0.7; }
.card-orange .card-badge {
  background: rgba(255, 145, 0, 0.15);
  color: #fed7aa;
}

.card-gold .gem-body {
  fill: #ca8a04;
  stroke: #ffc400;
  stroke-width: 2;
}
.card-gold .gem-facet-a { fill: #fde047; opacity: 0.6; }
.card-gold .gem-facet-b { fill: #a16207; opacity: 0.6; }
.card-gold .gem-facet-c { fill: #fef08a; opacity: 0.7; }
.card-gold .gem-facet-d { fill: #713f12; opacity: 0.7; }

.card-rainbow .gem-body {
  fill: #ec4899;
  stroke: #f43f5e;
  stroke-width: 2;
}
.card-rainbow .gem-facet-a { fill: #38bdf8; opacity: 0.6; }
.card-rainbow .gem-facet-b { fill: #a855f7; opacity: 0.6; }
.card-rainbow .gem-facet-c { fill: #facc15; opacity: 0.7; }
.card-rainbow .gem-facet-d { fill: #ef4444; opacity: 0.7; }

@media (max-width: 480px) {
  .collectibles-grid {
    grid-template-columns: 1fr;
  }
  .collectible-card {
    padding: 12px;
    gap: 10px;
  }
  .card-emblem {
    width: 40px;
    height: 40px;
  }
}
</style>
