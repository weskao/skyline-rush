// The HUD NITRO status line: whether a charge can be fired now, is still filling, or is off for this race;
// and one caption per sprint tier (src/sprint-tier.ts), read by src/sprint-tier-hud.ts as `hud.tier.<id>`, or
// `hud.tierChain.<id>` while a press during NITRO extends the burst. A new tier adds its key here.
export const NITRO_HUD_COPY = {
  en: {
    'hud.nitroReady': 'NITRO READY',
    'hud.nitroCharging': 'NITRO CHARGING',
    'hud.nitroUnavailable': 'NITRO UNAVAILABLE',
    'hud.tier.boost': 'BOOST ENGAGED',
    'hud.tier.nitro': 'NITRO ACTIVE',
    'hud.tier.nitro-boost': 'NITRO + BOOST',
    'hud.tierChain.nitro': 'NITRO ×{n}',
    'hud.tierChain.nitro-boost': 'NITRO ×{n} + BOOST',
  },
  'zh-TW': {
    'hud.nitroReady': 'NITRO 就緒',
    'hud.nitroCharging': 'NITRO 充能中',
    'hud.nitroUnavailable': 'NITRO 暫不可用',
    'hud.tier.boost': 'BOOST 啟動',
    'hud.tier.nitro': 'NITRO 啟動中',
    'hud.tier.nitro-boost': 'NITRO + BOOST', // no suffix: a longer line is cut off in the portrait mode panel
    'hud.tierChain.nitro': 'NITRO ×{n}',
    'hud.tierChain.nitro-boost': 'NITRO ×{n} + BOOST',
  },
} as const;
